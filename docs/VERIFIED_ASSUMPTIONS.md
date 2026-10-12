# Verified assumptions · October 12, 2026

## Model and inference

The requested repository `ggml-org/gemma-4-E2B-it-GGUF` contains `gemma-4-E2B-it-Q4_0.gguf` (2,841,481,184 bytes). Revision: `b4243c156154b6dca9324415f8c7ccc098b4aed1`. SHA-256: `8e30dff3ac4c8434c49a7036fa15564bdbb6044e42bf04550bf1a096ad7e6a52`. Its model card declares Apache-2.0.

Verified on Apple Silicon with 16 GB RAM, llama.cpp **0.6.0**, build 11429, commit `d81235049`. The server accepts OpenAI-compatible `/v1/chat/completions` with JSON-schema output, `--jinja`, and Gemma 4's template. A real document rewrite passed Pydantic validation and preserved protected numbers, month names, currency symbols, and condition words.

Sources: [GGUF model](https://huggingface.co/ggml-org/gemma-4-E2B-it-GGUF), [Google model](https://huggingface.co/google/gemma-4-E2B-it), [llama.cpp server](https://github.com/ggml-org/llama.cpp/blob/d81235049384534c167caea52b85a694f6103d14/tools/server/README.md).

The specification's `-hf` runtime invocation can make download/check requests. Abridge deliberately separates the checksum-verified model download from inference and uses `-m ... --offline` during private sessions. Prompt logging and prompt caching are disabled. `LLM_HF_REPO` documents the verified model identity; changing models requires editing the pinned downloader and rerunning the smoke eval, or providing an explicitly chosen local file via `LLM_MODEL_PATH`.

## PolicyEngine

Pinned `policyengine-us==2.40.1`. Locally inspected `spm_unit_fpg`, `snap`, and `snap_gross_income`. A sparse household simulation can produce a SNAP amount from default values; that is **not** evidence of user eligibility. Abridge therefore never runs general benefit calculations from the rough form.

The bounded offline adapter audits **only `spm_unit_fpg` for 2026**, using representative NY/AK/HI households of 1, 4, 8, and 9 people. All twelve results match HHS authoritative goldens. Run `uv run python -m abridge.eligibility.policyengine` from `engine/`. This audit uses synthetic inputs, not financial session information. Interactive prescreens use the reviewed local rule snapshot. No PolicyEngine SNAP, WIC, Medicaid, SSI, housing, or tax capability is claimed by Abridge.

Source: [PolicyEngine US source](https://github.com/PolicyEngine/policyengine-us), [documentation](https://policyengine.github.io/policyengine-us/). PolicyEngine is AGPL-3.0; Abridge includes that license and distributes its source under AGPL-3.0.

## HHS and program rules

HHS 2026 guidelines: contiguous states + DC: $15,960 plus $5,680 per additional person; Alaska: $19,950 plus $7,100; Hawaii: $18,360 plus $6,530. Territories receive no substituted guideline. The JSON snapshot is versioned with a verification date and primary-source URL. Updates do not happen in an interactive request.

- **Lifeline:** federal income route at 135% of the 2026 guideline. Annual limits round up to whole dollars, matching USAC's Alaska and Hawaii table. Require the economic-household confirmation and whether a discount is already received. A higher income fails only this route; other program-participation/survivor paths and state application rules remain possible. Source: [USAC](https://www.lifelinesupport.org/how-to-qualify/).
- **School meals:** federal income route only for a child in a participating school with the economic household confirmed. Free: 130%; reduced price: 185%. Follow USDA rounding: round annual amounts up, divide by 12, and round monthly amounts up. Rule period July 1, 2026–June 30, 2027. Direct certification, universal state meals, and community eligibility are not modeled. Source: [USDA guidelines](https://www.fna.usda.gov/schoolmeals/income-eligibility-guidelines).
- **WIC:** information only. Category, clinic nutrition-risk assessment, state standards, household definition (including pregnancy), and adjunctive income eligibility prevent a reliable calculation from these rough inputs. Source: [USDA 2026–2027 notice](https://www.fna.usda.gov/wic/fr-042926).
- **SNAP and Medicaid:** information only; state and household-specific facts remain unknown. Sources: [USDA SNAP](https://www.fns.usda.gov/snap/recipient/eligibility), [CMS Medicaid](https://www.medicaid.gov/medicaid/eligibility/index.html).

Source: [HHS/ASPE](https://aspe.hhs.gov/poverty-guidelines), [HHS API documentation](https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines/poverty-guidelines-api). Official policy values, rather than the LLM or crawler, drive deterministic rules. Expired rule periods return more-information-needed.

USDA pages may redirect from fns.usda.gov to fna.usda.gov; both exact domains are curated. Some official pages return 403 to automated fetches. The updater skips inaccessible/robots-disallowed pages and keeps existing public knowledge; it never weakens restrictions or revises eligibility rules automatically.

## Privacy

Browser financial/document state is memory-only. All API requests use JSON bodies at `127.0.0.1:8000`, no credentials, no sensitive URL parameters, and no-store cache behavior. The API requires expected Host/Origin values, rejects simple non-JSON cross-site requests, limits request size, and omits submitted values from validation errors. HTTP clients disable proxy environment trust. The AI client rejects every non-127.0.0.1 endpoint and redirects are not followed.

No analytics, account service, remote fonts, CDN assets, auto-application, or cloud AI. Source updates are a separate process with curated public URLs, no session input, robots checks, rate limits, bounded responses, and redirect allowlisting. Only the public SQLite database, model, and static PWA shell persist. The service worker ignores API, POST, and cross-origin requests. Clear-session aborts in-flight calls and remounts the entire session.

Automated anchor checks are a guardrail, not a proof that AI preserved meaning. Original text remains available and uncertain/invalid responses fall back to it. Abridge does not promise secure memory erasure, mobile inference, malware protection, or official eligibility decisions.
