# Backend increment acceptance

Scope: connected authentication and adviser scheduling, English only, on `feat/brand-static-landing`. The earlier phase-one/media ledger remains historical evidence. This report does not certify a hosted release.

## Delivered behavior

- Explicit Supabase mode with phone OTP and no local preview-code fallback; missing configuration stops at a setup screen.
- Private profiles and Home/Records/Me, with secure native session storage and tab-scoped web sessions.
- Four-screen booking from actual published slots; server pricing, price-change checks, request retry identity, slot conflict prevention, overlap checks and cancellation.
- Operator-assigned advisers can publish/close availability and confirm/cancel/complete their own assigned appointments. Customer details are restricted to the assigned adviser.
- Fresh databases disable bookings and leave fees unconfirmed. Connected mode never represents payments, documents or memberships as completed transactions.

## Local checks

Verified locally on 2026-09-30 with Node 24.15.0 on Windows:

| Check | Result |
| --- | --- |
| Actual migration / authorization / scheduling tests | 17 passed in PGlite 0.5.8 |
| App domain, configuration and secure-session tests | 14 passed |
| Connected HTTP-fixture browser journeys | 6 passed on the final fresh export |
| Existing preview browser regressions | 3 passed |
| App TypeScript | Passed |
| Fresh connected web export | Passed; JavaScript bundle 2,436,008 bytes |
| Fresh Android Hermes export | Passed; bundle 5,758,360 bytes |
| Fresh iOS Hermes export | Passed; bundle 5,560,756 bytes |
| Production dependency audit | Zero known vulnerabilities in the recorded result |
| Visual inspection | Requested-booking and 320px adviser-screen screenshots reviewed |

The 40 tests include a full connected login/profile/booking/reload/cancellation/logout journey, server OTP rejection, empty availability, occupied-slot rejection, retrying a lost booking response with the same key, server fee tampering and staff/customer isolation. Connected Home passed the selected automated WCAG accessibility rules; the adviser layout did not overflow at 320px.

A final rerun caught Metro reusing preview-mode transforms after switching build configurations. Export commands now clear the cache. A fresh all-platform build and the six connected journeys then passed. Composite-returning RPC calls explicitly request a single record, and the HTTP tests assert that response-format header.

[Verification manifest](qa/backend/verification.json), [dependency audit](qa/backend/dependency-audit.json), [requested-booking screenshot](qa/backend/requested-booking.png), [adviser screenshot](qa/backend/adviser-schedule-320.png).

The PostgreSQL tests execute the migration through PGlite with explicit roles. The connected browser journeys use HTTP fixtures, not a live Supabase project. Neither proves real SMS delivery or multi-connection hosted locking. See [setup and hosted acceptance](backend.md).

## Section 5.6 self-audit

| Requirement | Result | Evidence |
| --- | --- | --- |
| No generic hero/two-button/three-card template | Pass | Connected screens use direct tasks and editorial lists. |
| No glassmorphism grid | Pass | Opaque paper surfaces and fine rules. |
| No purple-blue gradients, glow or gradient text | Pass | Existing bone/ink/bronze tokens retained. |
| No emoji or decorative icon stacks | Pass | Text labels, numbered booking steps and three text tabs. |
| No site-wide Inter | Pass | Instrument Serif, Geist and Geist Mono retained. |
| No large rounded/shadow cards | Pass | Shared square/2px controls; no shadow cards added. |
| No fabricated trust or customer claims | Pass | Empty availability stays empty; failures cannot create simulated bookings. Test identities appear only in QA fixtures. |
| No testimonial carousel, FAQ accordion or newsletter box | Pass | None added. |
| No floating chatbot | Pass | None added. |
| Typography, space and breathing line | Pass | Existing shared type and spacing retained; new forms add no decorative animation. The original Pulse Roof surfaces remain intact. |

## Release boundaries

No main change, hosted migration, real OTP message, real booking, payment or deployment occurred. The deployment owner must supply the Supabase project, SMS configuration, approved fees, staff identities and service readiness. Hosted race/authorization tests and physical Android/iOS acceptance remain required. Payments, private attachments/reports and membership/check-in are subsequent increments.
