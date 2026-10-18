# Community action manager

## Evidence and scope

Research checked October 18, 2026. This extension targets the work between understanding a notice and completing its next step, rather than adding more eligibility calculators.

- [Urban Institute, September 2025](https://www.urban.org/research/publication/paperwork-burdens-cost-one-eight-working-age-snap-recipients-their-benefits): 13% of working-age adults in SNAP families surveyed reported interruptions caused by recertification problems. This is evidence of a problem, not a measured outcome for Abridge.
- [Code for America, November 2024](https://codeforamerica.org/news/our-top-three-tips-for-improving-online-benefits-applications/): confusing questions, verification documents, and repeated work create barriers. Keep the interface focused and accessible.
- [United Way 211](https://211.org/) and [LSC](https://www.lsc.gov/about-lsc/what-legal-aid/i-need-legal-help): established routes to human help. Link to their directories without sending private inputs, inventing providers, or promising availability.

Build two connected capabilities inside the existing paperwork tool: (1) local AI identifies requested actions with original evidence and a session checklist, and (2) local AI prepares questions tailored to a person's practical barriers. Keep document rewriting, support checks, and budgeting working. Calendar and text exports happen only on the user's explicit action. No background notifications, cloud inference, accounts, or automatic messages.

## Checklist

- [x] Read AGENTS.md, inspect current main and preserve existing implementations and untracked user files.
- [x] Research administrative burden and verified human referral routes; select a bounded feature set.
- [x] Implement evidence-grounded action extraction, conservative dates, conversation preparation, and fail-closed API boundaries.
- [x] Integrate a focused paperwork workspace, session task management, and user-controlled exports without adding top-level navigation.
- [x] Verify adversarial/ambiguous notices, offline behavior, real local model outputs, accessibility, mobile layout, and existing flows.
- [x] Update concise setup/feature documentation, record limitations, and commit implementation milestones.
- [ ] Push feature branch, open a reviewable PR, and leave localhost ready.

## Impact and limits

Intended beneficiaries include low-income households, underrepresented communities, caregivers, and community navigators helping people with paperwork. This release does not establish measured community impact. A future consent-based pilot should measure completion time, next-step understanding, and task follow-through without collecting notice contents. Local desktop inference and English text remain limits to reach; multilingual quality, PDF/OCR, and community deployment need separate validation.

## Implementation boundaries

- The local model selects sentence IDs and task categories. The server resolves those IDs to original text, rejects unsupported/negated requests, and checks explicit dates. It does not accept AI-authored quotations or compute relative deadlines from an assumed receipt date. These checks cannot prove complete or semantically correct extraction; review of the entire original remains required. Up to 8 suggestions per notice and 24 managed steps per session.
- Conversation prep receives only the selected excerpts and optional barriers. It drafts editable questions for the sender or a navigator, rather than deciding eligibility or contacting anyone. Unsupported numbers, links, some outcome assumptions, and invented personal-condition clauses are rejected. This is a bounded guard, not a guarantee against every possible AI error. Refused or unavailable responses remain honest fallbacks.
- A downloaded text plan includes selected excerpts and optional notes. It is a personal handoff copy, not a submitted application or a restorable account. Refresh clears the in-app checklist. The optional RFC 5545 calendar file contains a generic title, a chosen all-day date, and a requested 9 a.m. alert; it requires import, and the calendar's settings may override alerts or sync it.
- No new analytics, persistence, cloud AI, provider API keys, third-party embeds, or automatic outreach were introduced. Existing eligibility calculations and document-rewrite validation remain separate from generated suggestions.

## Verified October 18, 2026

- Backend: 110 default tests passed; Ruff lint/format and strict mypy passed. Six optional real Gemma checks passed (four action/conversation cases and two existing document-rewrite checks).
- Frontend: 12 tests, ESLint, TypeScript, and production build passed. Eight Playwright flows passed using a real separate FastAPI instance and synthetic inference; the two new action flows were rerun after the final calendar/export changes.
- An additional unmocked browser run through the installed Gemma runtime extracted income-document and interview tasks with exact source evidence, retained receipt wording and appointment dates, omitted a balance-only payment task, and prepared separate questions for missing pay stubs and work hours. Desktop and mobile axe checks found zero violations; 320px layout had no horizontal scroll, no page errors, and no non-loopback requests. localStorage and sessionStorage remained empty. This is a synthetic evaluation, not a community trial.
- Covered failure cases include invalid evidence IDs, unrelated dates, negative instructions, canceled appointments, unknown receipt dates, unsupported question facts, unavailable inference, duplicate/stale additions, completion during pending generation, session clearing, and calendar-date injection. Date exports and text-plan contents were checked in browser downloads. Alerts in individual calendar applications have not been exercised.
