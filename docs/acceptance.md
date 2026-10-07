# Acceptance record

The acceptance lists in the brief (§9.8 for the reels, §10 for the whole delivery),
each with its result and how it was checked. Re-run the checks after any change
they cover.

## Reels (brief §9.8)

| Criterion | Result | How it was checked |
|---|---|---|
| `npm run render:all` outputs every reel in three languages and three formats | RENDER_RESULT | Eight series → 108 MP4s in `reels/out/`. Each goes through `reels/scripts/deliver.ts`, and `deliver.ts --check` checks H.264, BT.709 limited range and −14 LUFS ±1 at ≤ −1 dBTP. |
| A new case episode is one new JSON file | Pass | `reels/src/data/index.ts` loads every file in `data/cases/`. `reels/test/data.test.ts` checks each case in three languages and its `basis` (general, or anonymised with a consent reference). |
| All text inside the safe zone (`showSafeZone`) | Pass | `--safe-zone` stills of every series at two moments in Malay (the longest language), 9:16. Then R3's closing frame in all three languages and all three formats. Two fixes came out of it: 9:16 captions now stop at the like/share column (`TEXT_MAX_9x16`), and R3's closing call-to-action now fits the 9:16 safe area. |
| A missing 3D model falls back to a placeholder; the render doesn't stop | Pass | StoreReveal rendered with `brand/3d/store.glb` removed: the procedural store appeared. Fix: the stand-in cabinet had sat inside the wall. |
| No template violations (§5.6, §9.6) | Pass | No gradients, glass, emoji, icon lists, Inter, large radii, fake counts, carousels, chatbots, whooshes or flashes. Captions are static fades. Every educational reel ends with "General information, not personal advice." |

Also checked (§9.5–§9.7):
- Sound: a placeholder sound logo is on every reel, and loudness is −14 LUFS.
- Market data: the market figures name their source and date (NAPIC 2025, verified against the report).
- Samples: sample data carries a "not for publication" watermark.

## Delivery (brief §10)

| Criterion | Result | How it was checked |
|---|---|---|
| Zero §5.6 violations | Pass | Audit of the website, app, reels and print pieces (last pass: terms page, report template, share cards, adviser screen). |
| Landing page scrolls smoothly on a mid-range Android (4 GB) | Not yet checked: needs a phone | Supports it: JavaScript is 195 KB gzipped of a 250 KB budget (build fails above); the fluid layer is off below 4 GB; the data saver and reduced motion skip WebGL; pixel ratio is capped at 1.5. |
| Without WebGL the page is complete and still looks right | Pass | `e2e/web.spec.ts`: no JavaScript (text, fee table, booking link), reduced motion and the data saver (static Pulse Roof, no WebGL script). |
| App: open to a finished booking in four screens or fewer | Pass | Home → type → property → time and confirm. Covered by `e2e/app.spec.ts` (preview) and `e2e/connected.spec.ts` (real database schema). |

Steps 1–14 of §10 are all delivered: brand, landing page, line, fluid and grain, fallbacks, app skeleton, S0–S6, the 3D models, reels, Blender, render-all and the README. Beyond them:
- the store twin;
- the product film;
- the Supabase backend;
- the diagnosis report, letterpress card and door fee plate;
- terms and licence notices;
- the browser tests.

## Not covered here

Physical phones, the hosted backend, payments, legal review and founder decisions:
see `docs/launch-checklist.md`.
