import json
import re
from collections.abc import Awaitable, Callable
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from abridge.budget.planner import plan
from abridge.eligibility.rules import screen
from abridge.llm.client import LocalAIError, available, generate, validate_rewrite
from abridge.memory.store import Memory
from abridge.models import (
    BudgetInput,
    BudgetResult,
    DocumentInput,
    DocumentResult,
    ExplainedSource,
    Explanation,
    ExplanationInput,
    ExplanationResult,
    Household,
    Rewrite,
    Screening,
)

app = FastAPI(title="Abridge local engine", docs_url=None, redoc_url=None)
ORIGINS = {
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:4173",
    "http://localhost:4173",
    "http://127.0.0.1:8000",
}
app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(ORIGINS),
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.middleware("http")
async def privacy_boundary(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    if request.headers.get("host", "").split(":")[0] not in {"127.0.0.1", "localhost"}:
        return JSONResponse({"detail": "Only local hosts are allowed."}, status_code=403)
    origin = request.headers.get("origin")
    if origin and origin not in ORIGINS:
        return JSONResponse({"detail": "This origin is not allowed."}, status_code=403)
    if (
        request.method == "POST"
        and not origin
        and request.headers.get("sec-fetch-site") == "cross-site"
    ):
        return JSONResponse({"detail": "Cross-site requests are not allowed."}, status_code=403)
    if request.method == "POST":
        if "application/json" not in request.headers.get("content-type", ""):
            return JSONResponse({"detail": "Use JSON for this request."}, status_code=415)
        # Read bounded chunks instead of trusting Content-Length. Never log body content.
        body = bytearray()
        async for chunk in request.stream():
            body.extend(chunk)
            if len(body) > 100000:
                return JSONResponse({"detail": "This request is too large."}, status_code=413)
        request._body = bytes(body)
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    # FastAPI's default includes the input. Return field names and errors without
    # financial/document values.
    errors = [
        {"field": ".".join(str(x) for x in e["loc"][1:]), "message": e["msg"]} for e in exc.errors()
    ]
    return JSONResponse(
        {"detail": "Check the highlighted fields.", "errors": errors}, status_code=422
    )


@app.get("/api/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "local_ai": await available(),
        "privacy": "loopback-only",
        "rule_year": 2026,
    }


@app.post("/api/screen", response_model=Screening)
def screening(data: Household) -> Screening:
    return screen(data)


@app.post("/api/budget", response_model=BudgetResult)
def budget(data: BudgetInput) -> BudgetResult:
    return plan(data)


@app.post("/api/document", response_model=DocumentResult)
async def document(data: DocumentInput) -> DocumentResult:
    try:
        rewrite = await generate("document", data.text, Rewrite)
        validate_rewrite(data.text, rewrite)
        return DocumentResult(
            mode="local_ai",
            rewrite=rewrite,
            original=data.text,
            message=(
                "A local AI rewrite. Compare with the original before acting; meaning "
                "can still be wrong."
            ),
        )
    except LocalAIError as exc:
        return DocumentResult(
            mode="original_only",
            rewrite=None,
            original=data.text,
            message=str(exc) + " No document was stored.",
        )


@app.post("/api/explain", response_model=ExplanationResult)
async def explain(data: ExplanationInput) -> ExplanationResult:
    # Retrieval terms are curated program names. No private data goes into crawler requests.
    result = screen(data.household)
    names = [p.name for p in result.programs if p.status == "likely_eligible"]
    hits = Memory().search(" ".join(names)) if names else []
    if not hits:
        raise HTTPException(
            503, "No public source excerpts are available. Run the separate source updater."
        )
    source_map = {h.id: h for h in hits}
    payload = json.dumps([{"source_id": h.id, "text": h.text} for h in hits])
    try:
        output = await generate("explain", payload, Explanation)
        for item in output.items:
            hit = source_map.get(item.source_id)
            if (
                hit is None
                or item.excerpt not in hit.text
                or re.search(r"https?://|www\.", item.explanation)
            ):
                raise LocalAIError("An explanation had an invalid citation.")
            if any(n not in hit.text for n in re.findall(r"\d[\d,./:%-]*", item.explanation)):
                raise LocalAIError("An explanation added an unsupported number.")
        return ExplanationResult(
            items=[
                ExplainedSource(
                    **item.model_dump(),
                    source_url=source_map[item.source_id].source_url,
                    source_title=source_map[item.source_id].source_title,
                )
                for item in output.items
            ]
        )
    except LocalAIError as exc:
        raise HTTPException(503, str(exc)) from exc
