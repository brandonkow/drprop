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
npm test                     # 138 unit tests (vitest), incl. 22 database tests on PGlite
npm run lint -w @drprop/app
npm run build                # website; fails if JS > 250 KB gzip or a launch build has placeholders
cd app && npx expo export -p web && cd ..                    # app/dist, for the app e2e tests
cd app && EXPO_PUBLIC_APP_MODE=supabase EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_local_fixture_only \
  npx expo export -p web --clear --output-dir dist-connected && cd ..   # never deploy this build
npm run test:e2e             # 19 browser tests: web 14, app 2, connected 3
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
- **Three languages everywhere,** with the same keys (tested). English is the source language.
- **App style:** single quotes and wide lines. There is no Prettier config, so don't run Prettier with its defaults.

## Left to do (in order)

### 1. App screens against brief §8 (mostly done)
Already done:
- member card: hidden for non-members, check-in only when the membership is active;
- honest PDF line in supabase mode;
- accessibility labels.

Still to do: one pass over S0–S6 in both modes, especially:
- [ ] Dark mode on every screen, including the adviser screen `app/src/app/staff.tsx` (new).
- [ ] 44 pt touch targets on the adviser screen's chips and links.
- [ ] Every new string in all three languages (`app/src/i18n/strings.ts`; tsc enforces the shape).
- [ ] Optional: in preview mode, the sample record's "Diagnosis (PDF)" could open the sample report (`web/public/samples/diagnosis-{lang}.pdf`).

### 2. Visual rules (§5) on what was added last
Check these new pieces:
- `web/src/render/page.ts` (terms page, sample link) and `web/src/styles/sections.css`;
- `brand/print/render.ts` (report, card, plate);
- `web/scripts/og-image.ts` (share cards);
- `app/src/app/staff.tsx`.

What to check:
- [ ] Radius 0–2 px, tokens only (`brand/tokens/tokens.ts`), no gradients or shadows on UI.
- [ ] Bronze at most 3 times per page. The report uses it only for "Resolve before signing".
- [ ] One solid button per app screen.

### 3. Reels and acceptance (§9–§11)
- [ ] Render the full set with `REMOTION_GL=swangle npm run render:all` (about 108 files and 1.5–2.5 h; output goes to `reels/out/`, which git ignores). Then run `npx tsx reels/scripts/deliver.ts --check reels/out/*.mp4` and look at the stills (`npm run still -w @drprop/reels`). Check:
  - the sound logo at the end of every reel;
  - the NAPIC market reel (`2025-selangor-residential-value`) in all three languages;
  - safe zones (`--safe-zone`).
- [ ] Walk through the acceptance list in brief §10 and the open items in §11; update `docs/launch-checklist.md`.
- [ ] Decide whether delivered reel MP4s should live in the repo (about 30 MB for the 9:16 set) or elsewhere.

### 4. Only the owner can do these (GitHub)
- [ ] Delete the old Codex branch `feat/brand-static-landing` (its useful parts are already ported). It's at https://github.com/brandonkow/drprop/branches; the last commit is `b9f3913`, if it's ever needed.
- [ ] Optional: make `main` the default branch (Settings → General).

### 5. Before launch: `docs/launch-checklist.md`
Founder decisions, lawyer review, real details in `web/src/config/site.ts` (set `origin` last), native-speaker review, real-phone tests, the hosted backend, payments (next phase), media rights and print.

## What changed in the last session (newest first)

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
- The member card QR (`drprop:checkin:<memberNo>`) is not a secure credential yet.
- The sound logo, film score and store imagery are placeholders or concepts, all labelled.
