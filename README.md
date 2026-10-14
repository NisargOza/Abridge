# Abridge

**A little breathing room. A clearer next step.**

Abridge helps U.S. households find financial support, plan their money, and understand paperwork. Built for a community-impact hackathon, it aims to reduce barriers for low-income and underrepresented communities.

## What it does

- **Find support:** Lifeline and school-meal income checks with official sources and next steps.
- **Make a money plan:** Monthly budgets and avalanche/snowball debt comparisons.
- **Understand paperwork:** Local AI assistance for pasted text and `.txt` files. For PDFs, paste the document text.

Financial entries and document text stay in local session memory. No accounts, trackers, paid API keys, or cloud AI. Refresh or **Clear session** removes the current entries.

## Run locally

Install Node.js **22.12+**, **pnpm 11.25** (or Corepack), and **uv**. Setup manages Python 3.12. For AI, install [llama.cpp 0.6.0](https://github.com/ggml-org/llama.cpp/releases/tag/v0.6.0); the model was tested on Apple Silicon with 16 GB RAM.

```sh
git clone https://github.com/NisargOza/Abridge.git
cd Abridge
./scripts/setup.sh
./scripts/download-model.sh  # One-time, checksum-verified 2.84 GB download
./scripts/dev.sh --ai
```

Open **[127.0.0.1:5173](http://127.0.0.1:5173/)** and choose **Explore a sample** to try fictional household data. Leave the terminal open; **Ctrl+C** stops the session.

For benefits and budgeting without AI, skip the model download and run `./scripts/dev.sh`.

## Tech stack

**Frontend:** React, TypeScript, Vite, Tailwind CSS. **Backend:** Python, FastAPI, Pydantic. **Public knowledge:** SQLite FTS5. **Local AI:** Gemma 4 E2B through llama.cpp.

## Scope

Lifeline and school-meal income routes use stored 2026 rules. WIC, SNAP, and Medicaid are information only. Local AI requires a desktop setup.

This is an estimate, not legal, tax, or financial advice. The agency makes the final decision.

**AGPL-3.0** · [Architecture](docs/ARCHITECTURE.md) · [Validation](docs/VALIDATION.md) · [Verified rules and runtime](docs/VERIFIED_ASSUMPTIONS.md) · [Third-party notices](docs/THIRD_PARTY_NOTICES.md)
