# Handoff: where the work stands

Repository `brandonkow/drprop`. `main` and `claude/modest-ritchie-e7pjr3` are the same commit. Work on a branch from `main`.

Read first:
- `docs/brief.md`: the brief, in Chinese. Every rule below comes from it.
- `README.md`: the repo map and commands, in Chinese.
- `docs/launch-checklist.md`: what only people can settle.
- `supabase/README.md`: the backend.

## Repo in one minute

| Folder | What it is |
|---|---|
| `brand/` | The single source for tokens, fonts, logo, Pulse Roof, fees (`pricing.ts`), 3D models and renders, and the print pieces (`print/`) |
| `web/` | Website: Vite + TS, no framework. Three languages, five sections; terms and privacy pages; fee calculator; WebGL background |
| `app/` | Expo SDK 57 app, three languages. Preview mode (mock, the default) or supabase mode (`app/.env`) |
| `supabase/` | Database migration (row-level security everywhere) and PGlite tests |
| `reels/` | Remotion reels R1–R8, hero promo and product film; `scripts/deliver.ts` sets BT.709 colour and −14 LUFS sound |
| `blender/` | bpy scripts for the store (shophouse and mall), layout films, film plates, twin export |
| `twin/` | Interactive 3D store and operations dashboard (three.js) |
| `e2e/` | Playwright tests for the website, the preview app, and the connected app against `e2e/fake-supabase.mjs` |

## Checks (all green at handoff)

```bash
npm install
npm run typecheck            # every package
npm test                     # 156 unit tests (vitest), incl. 25 database tests on PGlite
npm run lint -w @drprop/app
npm run build                # website; fails if JS > 250 KB gzip or a launch build has placeholders
npm run export:web -w @drprop/app                  # app/dist (preview), always --clear
npm run export:connected-fixture -w @drprop/app    # app/dist-connected (fixture backend); never deploy
npm run test:e2e             # 20 browser tests: web 14, app 2, connected 4
```

Other commands:
- `npm run print -w @drprop/brand` writes the report, card and plate PDFs and copies the sample report to `web/public/samples/`.
- `npm run og -w @drprop/web` writes the share cards.
- `npm run verify:media -w @drprop/reels` checks the delivered films.

Without a GPU, Remotion needs `REMOTION_GL=swangle`. ffmpeg comes bundled with Remotion; `reels/scripts/deliver.ts` finds it.

## Rules that must not break (brief §1.4, §2, §5.6, §9)

- **Words:** never "valuer", "valuation", 估价 or 估值. No recommendations of units for sale (笋盘), no price or negotiation advice. Zero commission.
- **Disclaimer:** every diagnosis carries 本诊断为资讯与分析，不构成法律、税务或财务意见，最终决定由客户自行作出。 (tested)
- **Visual rules:**
  - no component-library theme, gradients, glass, Inter or emoji;
  - radius 0–2 px; bronze at most 3 times per page;
  - one CTA, "Book a consult"; no cross symbol;
  - no whoosh or flash in motion.
- **No fake data:** samples are labelled as samples. Market data needs provenance (`reels/src/data/validate.ts` enforces it).
- **Three languages everywhere,** with the same keys (tested). English is the source language. Exception: reels render in English only (the owner's call, 2026-10-08); their Chinese and Malay copy is kept.
- **App style:** single quotes and wide lines. There is no Prettier config, so don't run Prettier with its defaults.

## Left to do (in order)

Steps 1–3 of the earlier list (app screens §8, visual rules §5, reels and acceptance §9–§11) are done; see `docs/acceptance.md`.

### 1. Reels
- [x] All 36 English reels rendered and passed the delivery check (H.264, BT.709 limited range, −14 LUFS, true peak ≤ −1 dBTP). Reels are English only (the owner's call, 2026-10-08). Re-render any with `cd reels && REMOTION_GL=swangle npx tsx scripts/render-all.ts --only <Id>`; without a GPU the store reveal takes about 2½ hours (its 3D is about 5 s a frame), the rest a minute or two each.
- [ ] Decide where delivered reels live. `reels/out/` is gitignored; the English set is 64 MB. The alternative is a shared drive.
- [ ] Optional polish: in the store reveal, the small line "Join the member waitlist." crosses a door handle and a chair back in 9:16 and 4:5. It's legible; a fix (move it, or give it a backing) means re-rendering the store's 3D.

### 2. Only the owner can do these (GitHub)
- [ ] Delete the old Codex branch `feat/brand-static-landing` (its useful parts are already ported). It's at https://github.com/brandonkow/drprop/branches; the last commit is `b9f3913`, if it's ever needed.
- [ ] Optional: make `main` the default branch (Settings → General).

### 3. Before launch: `docs/launch-checklist.md`
- Founder decisions (now including name and trademark, an REA or valuer partner, the floor plan, social platforms).
- Lawyer review, real details in `web/src/config/site.ts` (set `origin` last), native-speaker review.
- Real-phone tests (Android 4 GB smooth scrolling is the one §10 criterion still open).
- The hosted backend, payments (next phase), media rights and print.

### Nice to have (not required by the brief)
- In preview mode, the sample record's "Diagnosis (PDF)" could open `web/public/samples/diagnosis-{lang}.pdf`. It needs the website's address (set at launch), or expo-sharing to open a bundled PDF on phones.
- A camera scanner in the adviser screen. Until then the desk uses a QR scanner that types (keyboard mode), or types the six digits.
- Payments (FPX, Touch 'n Go, GrabPay, cards) and private report storage in supabase mode.

## What changed in the last session (newest first)

- **Brand imagery, second batch** (`brand/renders/ai/`, see its README): photoreal stills of the mall store (shopfront, reception, Lounge) and the shophouse pantry, a 9:16 shophouse street, four 5-second clips (mall walk-in, kopi poured, a member in the mall Lounge, a 9:16 blue-hour walk-in), and 4:5 images for the Instagram feed in `social/`. All concepts with generated people, labelled as such. This used the last of the free Higgsfield credits; the balance is 0.

- **Lounge check-in codes** (`supabase/migrations/202610080001_checkin.sql`). The member card's QR now holds six digits from the server, new every minute, good for two minutes and one check-in, instead of the member number. The adviser screen has a "Check in a member" field: a desk scanner types the QR and presses Enter, or someone types the digits; it shows the member's name, number and drink. Covered by 3 database tests and a browser test (scan, then the same code refused).

- **Reels: all 36 English reels rendered and passing.**
- **Reels: English only** (the owner's call, 2026-10-08). `render-all` renders English by default; `--lang en,zh,ms` still renders all three, because the Chinese and Malay copy stays in the reels. The Chinese and Malay files in `reels/out/` were deleted.

- **Reels:** the store reveal's 3D renders once per format and the three languages share it (`reels/plates/`, see the top of `reels/scripts/render-all.ts`). Checked against a live render: the 3D pixels match exactly, and caption edges differ by at most 1 level in 255. A `--frames` test render now writes `…-fA-B.mp4`, so `--skip-existing` can't mistake it for a finished file. The member card reels are rendered and pass.

- **Reels:** `render-all --skip-existing` resumes a stopped batch. Renders go to `.part.mp4` and are renamed only when finished and delivered, so a stopped render never leaves a half file that looks done.

- **Reels:**
  - 9:16 captions stop at the like/share column;
  - R3's closing call-to-action fits the safe area (it had spilled out in English and Malay);
  - the stand-in store cabinet no longer sits inside the wall.
- **Docs:**
  - `docs/acceptance.md` records the brief's acceptance lists;
  - the launch checklist gains the §11 founder items.
- **Web:** terms headings in the label style.
- **App:**
  - 44-point touch targets on links and the coffee field;
  - no past times offered on the adviser screen;
  - `npm run export:web` / `export:connected-fixture` (`-w @drprop/app`) always build with `--clear`, because a cached build from the other mode leaks backend settings.

- **Connected-app browser test:** `e2e/connected.spec.ts` with `e2e/fake-supabase.mjs`, which runs the real migration on PGlite. Client books, cancels and requests an urgent call-back; the adviser takes it and writes a note; the client sees the note.
- **App fixes:**
  - member card for non-members and inactive members;
  - honest PDF line in supabase mode;
  - splash and row labels fixed for accessibility (WCAG 2.5.3).
- **Print:**
  - `brand/print/` holds the diagnosis report (A4, three languages, sample), the A6 letterpress card and the 300 × 400 mm door fee plate;
  - the sample report is linked from the website's fee section.
- **Website:**
  - share cards;
  - terms page (zero commission and referral-fee promise, §2.4);
  - Lounge concept image;
  - JS budget check, data-saver path, launch guard, licence notices (`/third-party-notices.txt`);
  - fee-calculator fix: "500000.00" had read as RM 50 million.
- **Backend:**
  - `supabase/migrations/202610070001_core.sql`, adapted from Codex's design: urgent consults as call-backs, whole-ringgit fees, language, drink, membership, notes, Lounge board;
  - the app's data source switch (`app/src/data/source.ts`; mock or Supabase);
  - adviser screen and cancellation.
- **Reels:**
  - BT.709 colour and −14 LUFS delivery for all films;
  - placeholder sound logo (`reels/scripts/sound-logo.ts`);
  - verified NAPIC data with provenance;
  - `basis` (general or anonymised) on case files.
- **Dependencies:** overrides for shell-quote, source-map-js and Xcode's uuid. Still open: braces and node-forge (no fix released) and decode-uri-component 0.2 in expo-router (the fix is ESM-only).
- **App:** diagnosis disclaimer on every record.

## Known limits

- The backend has never touched a hosted Supabase project, and no SMS has been sent. PGlite tests are single-connection.
- Supabase mode takes no payment: bookings are requests the adviser confirms.
- Check-in is checked by the database (single use, two minutes, active members only), but there's no camera scanner in the app yet: see "Nice to have".
- The sound logo, film score and store imagery are placeholders or concepts, all labelled.
