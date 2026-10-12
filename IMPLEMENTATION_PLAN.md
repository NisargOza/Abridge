# Abridge implementation checklist

- [x] Read AGENTS.md and inspect repository (specification only; no existing implementation or Git checkout).
- [x] Verify and record model/runtime, PolicyEngine capabilities, authoritative 2026 rules, privacy, and dependency licenses.
- [x] Build loopback-only FastAPI: validated inputs, versioned poverty guidelines, bounded prescreen adapters, budget/debt simulation.
- [x] Build public-source SQLite FTS5 memory, safe allowlisted crawler, and constrained local LLM/document assistance.
- [x] Build polished accessible React PWA: onboarding, benefit results, budget/debt tools, document simplification, privacy controls.
- [x] Validate backend/frontend, real API integration, browser flows/accessibility, and available local LLM.
- [x] Complete setup/security/rule documentation, commit milestones, and push to configured GitHub repository.

## Decisions and verification

The supplied directory has no .git metadata. Inspect the existing GitHub repository before initializing or connecting local work. Services and financial/document requests remain on 127.0.0.1. No sensitive session persistence. Public policy source updates run separately from screening.

The user authorized routine engineering decisions, including the free dependencies required by the specified stack. Record their licenses instead of interrupting implementation for each package.

## Limitations

Native PDF parsing/OCR and mobile inference are outside the implemented desktop scope. WIC, SNAP, and Medicaid remain information-only because required program facts are unavailable. Some government sites block automated fetches; the updater skips them, retains existing knowledge, and deterministic rules cite verified Federal Register alternatives. AI semantic equivalence cannot be proven by token checks; originals remain visible and unsafe outputs fail closed.

## Progress

Backend: 64 tests pass; 1 optional real Gemma smoke evaluation passes. Frontend: 3 unit tests and 4 real-FastAPI Playwright flows pass. Strict mypy / TypeScript, Ruff / ESLint, formatting, and production build pass. Axe finds no WCAG 2.2 AA violations on covered page states. Keyboard skip/focus behavior, mobile 320/390 px reflow, and 200% zoom were checked. Production shell loads offline; cache inventory contains only shell/assets, never API or financial data. Actual local document rewriting and public-source explanations with mapped citations have been verified. Setup script was run successfully; shell scripts pass syntax checks.

Fixed discovered failures: React development preamble CSP, text contrast, mobile clear-button label, initial keyboard focus, duplicate source chunks, numeric substring validation, non-amortizing decimal overflow, unresolved source domains, and outdated government links. The crawler fetched HHS/Lifeline, safely skipped restricted pages, and continued. CI now reproduces lint, typechecks, unit, build, and browser checks on Linux. See docs/VERIFIED_ASSUMPTIONS.md for capability boundaries and primary sources.

## Delivery

Three implementation milestones and a final validation record are committed on `feat/abridge-local-first`, pushed to the existing configured remote without changing main or force-pushing. Draft PR: https://github.com/NisargOza/Abridge/pull/1. GitHub push and pull-request CI both passed their Linux engine and browser jobs. The one-command `./scripts/dev.sh --ai` launcher was verified with a ready local AI, healthy API, and serving frontend. The working tree contains no tracked models, databases, secrets, request logs, or personal financial data.

## Regular-terminal startup fix

The first launch check used Codex's bundled pnpm PATH; the user's regular terminal exposed a missing `pnpm` command. Setup and dev now share a portable pnpm/Corepack resolver, preflight tool availability before spawning services, and print the ready URL only after the API, web, and requested AI are healthy. Verified with a PATH excluding Codex's tools: pinned pnpm 11.25.0, serving UI, healthy API, and ready AI. Three regression tests cover installed-pnpm preference, Corepack fallback in the correct project directory, and failure before any service starts. No shell-profile changes or new dependencies were needed.
