# Validation · October 12, 2026

Verified locally on macOS Apple Silicon, Node 24.16, Python 3.12.13, and llama.cpp 0.6.0.

| Check | Result |
| --- | --- |
| pytest unit/integration | 64 passed; real LLM test deselected |
| optional real Gemma evaluation | 1 passed |
| PolicyEngine regional HHS audit | 12 goldens match |
| Ruff lint and format | pass |
| strict mypy | pass |
| Vitest | 3 passed |
| ESLint and strict TypeScript | pass |
| Vite production build | pass |
| Playwright against real FastAPI + synthetic local LLM boundary | 4 passed |
| axe WCAG 2.2 AA on browser-covered pages/states | no violations |
| desktop and mobile visual inspection | checked |
| mobile 320 px / 390 px reflow | no horizontal overflow |
| keyboard skip link and route focus | checked |
| production 200% zoom/reflow | checked |
| production PWA offline reload | shell loaded |
| service worker cache inventory | only shell/manifest/icon/build assets; no API |
| real document route | local AI result, protected values preserved |
| real source explanation route | validated citations mapped to stored official URLs |
| public source updater | HHS / USAC updated; restricted sources skipped safely |
| reproducible setup script | pass |
| shell script syntax | pass |
| one-command desktop launcher | healthy engine, serving web, ready local AI |
| GitHub Linux CI (push and PR) | engine and browser jobs pass |

Tests include geographic poverty values, school/Lifeline threshold boundaries, missing facts, expired rules, unsupported territories, exact zero-interest payoff, known monthly interest, minimum-payment recycling, funding gaps, zero gross income, excessive requested extras, and the maximum supported non-amortizing balance. AI tests mock the HTTP boundary, enforce schemas and source IDs, reject unsupported numbers and changed months/currency/modality, and preserve safe fallback behavior. Crawler fixtures cover robots, rate limits, redirect escapes, allowlists, response-size limits, metadata, FTS queries, re-ingestion, and retired-source cleanup.

Browser tests cover the overview, two-step support check, unknown/completed/filter results, budget empty/payoff/shortfall states, document empty/rewrite/original/cleared states, privacy, session clearing, and engine failure. Network inspection sees only loopback requests; localStorage and sessionStorage remain empty.

Automated scans and targeted keyboard/label/reflow inspection do not establish exhaustive WCAG conformance. AI anchor validation is a guardrail, not a proof of semantic equivalence. Phone inference and native PDF/OCR were not claimed or tested.
