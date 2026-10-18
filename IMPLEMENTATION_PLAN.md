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
- [ ] Verify adversarial/ambiguous notices, offline behavior, real local model outputs, accessibility, mobile layout, and existing flows.
- [ ] Update concise setup/feature documentation, record limitations, commit milestones, push feature branch, and leave localhost ready.

## Impact and limits

Intended beneficiaries include low-income households, underrepresented communities, caregivers, and community navigators helping people with paperwork. This release does not establish measured community impact. A future consent-based pilot should measure completion time, next-step understanding, and task follow-through without collecting notice contents. Local desktop inference and English text remain limits to reach; multilingual quality, PDF/OCR, and community deployment need separate validation.
