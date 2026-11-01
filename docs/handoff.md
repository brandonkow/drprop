# Current handoff

**The user resumed all five build areas on 2026-11-01.** Read
[the continuation record](build-2026-11-01.md). Stripe is selected;
cancellation/refund and membership rules remain unapproved.

Work only on `main`. This supersedes older feature-branch restrictions. The user authorized the new feature build on 2026-10-29, superseding the earlier hold. The current implementation and verification status is in [the build record](feature-build.md). All released UI and documentation are English-only. Historical translation source data is retained but is not an enabled product language.

Read [README](../README.md), [brief](brief.md), [repair verification](hardening-2026-10-13.md), [decisions](decisions.md), [launch checklist](launch-checklist.md) and [backend setup](../supabase/README.md).

## Existing implementation

- Shared brand, fee calculator, static website and effects/fallbacks.
- Expo preview/connected app, SMS auth integration, customer appointments, urgent requests, adviser notes and Lounge board.
- Server-controlled fees, ownership checks, single-use check-in codes, membership renewal-date validation and shared operating calendar.
- Explicit acknowledgment and audit evidence when an adviser takes an overdue urgent request.
- Store concepts/simulation, English reels and print samples.

## Repair verification

Use the current commands in README. The repair report records the exact tests actually completed. Earlier CI counts and statements in Git history refer to earlier revisions, not the current working tree.

Database tests run the migrations against PGlite on one connection. Connected browser tests use a local Auth/REST stand-in. Neither proves real SMS, hosted PostgREST permissions, multi-connection concurrency, hosted persistence or physical camera/sensor performance.

The media manifest verifies all 45 tracked MP4 assets. Publication candidates exclude three sample-data reels and two silent internal layout films. Full technical validation is separate from business/legal/music approval.

## Current scope

Private document uploads, diagnosis publication and the Stripe test-provider checkpoint are implemented locally. The five remaining build areas are authorized. Commercial rules and hosted acceptance remain pending. Store concepts and outstanding device checks remain unchanged. Do not deploy, spend money or apply production migrations merely because implementation tests pass.

## External inputs still needed

Confirmed fees/rounding, operating hours and staffing; membership term/grace/cap policy; cancellation/refund/report commitments; registration, contact and address details; responsible adviser/operator; hosted Supabase/SMS access; physical Android/iOS checks; business/legal review; approved sound/music and measured plans when moving beyond the store concept.

No missing business data should be fabricated. Production website builds fail on placeholders. Fresh databases keep bookings disabled and prices unconfirmed.

## Design and service boundaries

- Preserve the independent, zero-commission service positioning and diagnosis disclaimer.
- Do not claim a regulated valuation or recommend units for sale.
- Every diagnosis states that it is information and analysis, not legal, tax or financial advice, with the final decision left to the client.
- Follow every item in brief §5.6, including restrained colours, 0–2 px corners, the existing fonts, one website CTA and static/reduced-motion fallbacks.
- Clearly label sample data, anonymised examples and store concepts. Keep market provenance.

Historical implementation details remain in Git history at `6c03a0f`; this current handoff supersedes its stale branch, language, dependency and completion instructions.
