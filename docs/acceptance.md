# Acceptance record

Current evidence and item-by-item anti-template review are in
[the 2026-10-13 hardening report](hardening-2026-10-13.md). Earlier claims that all
acceptance was complete are superseded by the boundaries below.

| Area | Current scope and evidence boundary |
|---|---|
| Language | English release only; historical dictionaries/print assets are source archives. Old website language URLs redirect to English. |
| Website | Preview is explicit and booking is disabled until launch configuration is complete. Production build rejects placeholders. JavaScript budget remains 250 KB gzipped. |
| Fallbacks | Browser tests cover no JavaScript, reduced motion, data saver, and interactive calculator. Physical Android scrolling remains pending. |
| Booking | Four screens from home through request. Connected mode takes no payment and states that confirmation is pending. |
| Database | Serial PGlite tests use the real migrations. Hosted Auth, PostgREST, concurrency across connections and deployment remain pending. |
| Member card | Explicit motion permission, radians conversion, reduced-motion/background cleanup, expiry-aware check-in. Native sensor/camera/permission behavior requires real phones. |
| Media | Manifest covers 45 files: 36 release-candidate reels, 3 internal market samples, 4 promotional films, 2 silent internal layout films. Forty publication candidates still require content/rights approval. |
| Media tests | Hashes, dimensions, fps, duration, frame count, full decode, colour and loudness. Historical safe-zone/model-fallback visual reviews were not repeated frame by frame in this repair pass. |
| Print | English-only fee plate regenerated and checked. Historical multilingual outputs are not current release deliverables. |
| Store | Accepted concept only; no approved measured plan or construction acceptance. |
| Dependencies | Patched decoder with compatibility regression tests; braces and node-forge remain open under dated exceptions, not resolved. |

Private reports/uploads, payments, notifications, audited membership renewal/cap
workflows and further store modelling are held feature scope. Nothing in this ledger
authorizes those builds or deployment. See `launch-checklist.md` for external inputs.
