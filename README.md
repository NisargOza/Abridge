# Abridge

A little breathing room. A clearer next step.

Abridge is a complete local-first U.S. benefits prescreener, budget and debt planner, and private document reader. It runs on your desktop with a React PWA, a loopback FastAPI engine, and an optional local Gemma 4 model. No accounts, API keys, paid services, or cloud inference.

## Start

Requirements: Node.js 22.12+ (tested on 24.16), pnpm 11.25 or an installed Corepack, uv, and Python 3.12 (uv installs it as needed). For AI, install **llama.cpp 0.6.0** (`brew install llama.cpp` on supported macOS; see [upstream builds](https://github.com/ggml-org/llama.cpp/releases/tag/v0.6.0) elsewhere). Model smoke-tested on Apple Silicon with 16 GB RAM.

```sh
git clone https://github.com/NisargOza/Abridge.git
cd Abridge
git checkout feat/abridge-local-first
./scripts/setup.sh
./scripts/dev.sh
```

Open **http://127.0.0.1:5173**. A quiet welcome screen offers a support check or “Explore a sample.” The sample opens clearly labeled results and includes a calculated money plan. All tools remain available in the welcome menu and workspace navigation. “Use my information” clears the fictional profile and budget before starting a fresh check. You can use benefits and budgets without AI.

The setup and dev launchers work in regular terminals too: they use an installed `pnpm`, or fall back to `corepack pnpm` with the version pinned in `web/package.json`. They check the tools before starting any service. For standalone frontend commands below, use `corepack pnpm` instead of `pnpm` if needed, or run `./scripts/pnpm.sh <command>` from the repository root. No shell-profile changes are required.

For private AI, stop the dev session, then:

```sh
./scripts/download-model.sh   # one-time 2.84 GB public model download, SHA-256 verified
./scripts/dev.sh --ai         # inference is offline; loopback binding; no prompt logs
```

Alternatively, run the services in separate terminals:

```sh
./scripts/run-llm.sh
cd engine
uv run uvicorn abridge.api.main:app --host 127.0.0.1 --port 8000 --no-access-log
# In another terminal, from repository root:
cd web
pnpm dev
```

The tested Gemma identity is `ggml-org/gemma-4-E2B-it-GGUF:Q4_0`. Downloads are pinned to an exact revision and checksum. `.env` is optional and gitignored; copy `.env.example` for documented settings. To use a different local GGUF, set `LLM_MODEL_PATH` to its absolute path and rerun the LLM smoke test. Do not use a cloud `LLM_BASE_URL`; the engine rejects it.

## What works

- Guided household check with optional program facts; unknown facts are never guessed.
- Calculated federal **Lifeline income route** and **school meal income routes**, with 2026 authoritative rules, precise rounding, geographic guidelines, explicit route limits, source dates, and official destinations.
- WIC, SNAP, and Medicaid cards explain what remains unknown and how to contact the program. They are **information only**, without claimed benefit amounts or official eligibility.
- Budget based on take-home income, expenses, and debt minimums. Clearly labeled debt-to-gross-income ratio; no division by zero.
- Avalanche and snowball repayment simulations in integer cents, monthly interest, reused minimum payments, funded-extra caps, payoff charts, and shortfall/non-amortization handling.
- Local document rewriting from pasted text or `.txt` files. JSON-schema output, Pydantic validation, protected number/date/condition checks, original-text comparison, and honest fallback when AI is unavailable or fails validation. PDF users can paste extracted text; native PDF parsing/OCR is not included.
- Optional local AI source explanations with validated internal citations mapped to stored authoritative URLs. LLM output never replaces calculated statuses or math.
- Responsive design, keyboard navigation, visible focus, labeled controls, reduced-motion support, WCAG 2.2 AA axe scans, privacy controls, and an offline PWA shell.

This is an estimate, not legal, tax, or financial advice. The agency makes the final decision. No applications are automatically submitted.

## Public knowledge and rule updates

Setup installs two reviewed public source excerpts into gitignored `data/abridge.db`. Update public source knowledge separately, without any user session:

```sh
cd engine
uv run python -m abridge.crawler --seeds abridge/crawler/seeds.yaml
uv run python -m abridge.eligibility.policyengine
```

The crawler uses exact curated domains, public DNS checks, robots.txt, an honest User-Agent, a one-request-per-second per-host rate limit, explicit redirect validation, timeouts, and a 2 MB response limit. It stores text, stable source IDs, hashes, jurisdiction, timestamps, and rule dates when known. FTS5 chunks support local retrieval. Unreachable or restricted sites are skipped and existing knowledge is retained. Crawled prose never changes eligibility rules. Review code/data snapshots and rerun golden tests when a policy changes.

PolicyEngine **2.40.1** is pinned and used for an offline 2026 poverty-guideline audit. Twelve regional goldens match HHS. General benefit simulations are intentionally disabled because rough household inputs would invite misleading defaults. See [verified assumptions](docs/VERIFIED_ASSUMPTIONS.md) for evidence and exact capability boundaries.

## Privacy

Financial entries and documents stay in browser/service memory. They are not saved in SQLite, localStorage, sessionStorage, URLs, logs, or a cloud service. API calls use only `127.0.0.1:8000`; AI calls use only `127.0.0.1`, with proxy trust and redirects disabled. Services bind to loopback. The API checks origins and hosts, requires JSON POSTs, limits bodies, and returns no-store responses.

Refresh or **Clear session** removes the app’s current entries; clearing also aborts pending browser requests and resets every page. Only public program knowledge, downloaded model weights, and static app-shell files persist. There are no trackers or external fonts/scripts. Official links open external sites without referrers or submitted financial data. AI can still misunderstand a document; protected-token checks do not prove semantic equivalence. The original is always available.

The PWA is a desktop local app, not a cloud service. Phone on-device inference is not implemented. `pnpm build && pnpm preview` serves the production shell at `127.0.0.1:4173`; the local engine remains required for calculations. Production CSP permits only local assets and the local API. Offline caching excludes POST, API, and cross-origin traffic.

## Verify

```sh
cd engine
uv run pytest
uv run ruff check .
uv run ruff format --check .
uv run mypy .
uv run pytest -m llm     # optional: requires the real local llama-server

cd ../web
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Browser tests launch a **real FastAPI engine** and a synthetic loopback LLM boundary. The suite uses a separate real engine at port 8001 and forwards its browser API calls to that instance, so your app can stay running at port 8000. The suite never kills another process. The web dev server may be reused at 5173. Tests exercise benefits, missing facts, money/debt math, document rewriting, clearing, network boundaries, mobile reflow, keyboard focus, and axe scans on covered states. Unit crawler tests use saved HTML and mocked HTTP, without live public requests. The real Gemma evaluation is separate.

Project layout: `web/src/pages`, reusable primitives in `web/src/components/ui`, single browser API boundary at `web/src/lib/api.ts`, backend domain modules under `engine/abridge`, public data under gitignored `data/`, and local scripts under `scripts/`.

Abridge is AGPL-3.0. [Third-party notices](docs/THIRD_PARTY_NOTICES.md) record dependency licenses; lockfiles reproduce the tested installation. See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for completion and verification status.
