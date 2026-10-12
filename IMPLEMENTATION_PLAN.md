# Abridge implementation checklist

- [x] Read AGENTS.md and inspect repository (specification only; no existing implementation or Git checkout).
- [x] Verify and record model/runtime, PolicyEngine capabilities, authoritative 2026 rules, privacy, and dependency licenses.
- [x] Build loopback-only FastAPI: validated inputs, versioned poverty guidelines, bounded prescreen adapters, budget/debt simulation.
- [x] Build public-source SQLite FTS5 memory, safe allowlisted crawler, and constrained local LLM/document assistance.
- [x] Build polished accessible React PWA: onboarding, benefit results, budget/debt tools, document simplification, privacy controls.
- [ ] Validate backend/frontend, real API integration, browser flows/accessibility, and available local LLM.
- [ ] Complete setup/security/rule documentation, commit milestones, and push to configured GitHub repository.

## Decisions and verification

The supplied directory has no .git metadata. Inspect the existing GitHub repository before initializing or connecting local work. Services and financial/document requests remain on 127.0.0.1. No sensitive session persistence. Public policy source updates run separately from screening.

The user authorized routine engineering decisions, including the free dependencies required by the specified stack. Record their licenses instead of interrupting implementation for each package.

## Limitations

None confirmed yet. Mark optional AI as unavailable when the local runtime is absent; never return fabricated AI responses.

## Progress

Backend: 52 tests pass. Frontend: 3 tests pass. Strict typechecks, lint, and production build pass. The actual pinned Gemma runtime and structured document rewrite are verified. Browser integration and accessibility are in progress; a development CSP mismatch was found and fixed. See docs/VERIFIED_ASSUMPTIONS.md for capability boundaries and primary sources.
