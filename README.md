# DR. PROP

English brand system, website, Expo app with preview and connected modes, shared 3D assets and Remotion studio. Chapter 10 through step 14 is delivered; the subsequent authentication/scheduling increment is documented separately. See [the delivery ledger](docs/acceptance-full.md) and [backend acceptance](docs/backend-acceptance.md) for verification and remaining gates.

**All work belongs to `feat/brand-static-landing`.** Another session owns `main` and deployment. This branch has not been merged or deployed.

## Website

Node.js 22.19+ is required; validation used Node 24 on Windows. Each project has its own lockfile.

```sh
npm ci
npm run dev
npm run build
npm run preview
```

The website uses Vite, TypeScript and vanilla three.js. Five semantic sections, fee calculator and WhatsApp booking action remain readable without JavaScript/WebGL. Deferred ink, grain and Pulse Roof effects have reduced-motion, memory, data-saving and GPU-failure fallbacks. The lounge has a labelled Blender concept poster and an on-demand shared GLB that renders once, then releases GPU resources.

The deployment owner can run `npm ci && npm run build` and serve `dist/` from a static host. Dependencies/build output are ignored and reproducible. No deployment workflow was installed.

Edit `src/config/site.ts` with the confirmed WhatsApp number (digits beginning with 60), address, hours, HTTPS Google Maps URL, SSM number, actual lounge photograph and capacity proposal. Absent information stays unconfirmed; booking remains unavailable without a number. Format validation does not verify ownership. No live messages were sent.

Edit `src/config/pricing.ts` and the static fee table in `index.html` together. Proposed standard fees are RM 199 / 399 / 699 / 1,199 / 1,999. Exact thresholds use the lower band. Update app rules and reel fee copy if the proposal changes. Confirm commercial terms and replace the provisional privacy notice before operations.

Set `loungeImage` for approved photography. Otherwise `loungeModel` uses the shared store concept; failure retains its WebP poster. See [effects architecture](docs/effects.md).

## App preview

```sh
npm --prefix app ci
npm --prefix app start
npm --prefix app run export:web
npm --prefix app run export:native
```

Exactly three tabs: Home, Records and Me. Includes launch, preview OTP, four-screen booking, metadata-only attachments, simulated payment, records/sample PDF, profile and Skia membership card with optional gyroscope. Use preview code **246810** and sample details only. Local AsyncStorage is cleared on sign out. No SMS, backend, real payment or valid check-in credential is present.

Web output is `app/dist`; native JavaScript/assets output is `app/dist-native`. Neither is a signed native release. See [app guide](docs/app.md) for flows and phase-two boundaries.

## Connected authentication and scheduling

The app also supports explicit Supabase mode with SMS authentication, private profiles, published adviser availability, server-priced booking requests and cancellation. Preview mode remains the default. Database migrations, authorization tests and setup instructions are in [the backend guide](docs/backend.md). Hosted setup and SMS delivery have not been performed; bookings are disabled in a fresh database until the operator confirms readiness and fees. Payments, private uploads and membership/check-in remain subsequent work.

## 3D and reels

```sh
npm run models
npm --prefix reels ci
npm --prefix reels run studio
npm --prefix reels run stills
npm --prefix reels run render
```

Eight series in three ratios, three short brand variants and one store loop produce **28 English compositions**. Review media and SHA-256 manifests go in `out/`. MP4 uses H.264, 30fps and yuv420p. The batch renderer adds an original synthesized audio draft and verifies the final AAC track at −14 LUFS ±0.5 with true peak at or below −1 dBTP. The store-screen loop stays silent. FFmpeg and FFprobe must be on PATH for video rendering and mastering.

To add an episode, copy a JSON under `reels/src/data`, retain evidence status/provenance and pass it to the batch script:

```sh
npm --prefix reels run render -- --only=CaseOfWeek --case=src/data/cases/sample.json
npm --prefix reels run stills -- --only=StoreReveal --ratio=9x16 --safe-zones
```

See [reel production](docs/reels.md) for schemas, safe zones, audio and licensing. Default market data is historical annual NAPIC transaction value, not monthly/current prices; [source evidence](docs/market-provenance.md) records the distinction.

Original procedural geometry lives in `brand/three`; shared exports in `brand/3d`. Blender generates editable scenes, GLBs and Cycles stills. The store is an **unconfirmed 8 × 12 m concept**, not a measured twin or construction plan. The user accepted retaining this concept for the current delivery on 2026-10-01. See [3D production](docs/3d.md).

## Verification

```sh
npm test
npm run build
npm run test:browser
npm --prefix app test
npm --prefix app run typecheck
npm run test:app
npm --prefix reels test
npm --prefix reels run typecheck
npm run test:reels
```

Browser tests use installed Microsoft Edge through Playwright. App tests require `export:web` first. Remotion uses supported Chrome Headless Shell, downloaded on first use; `CHROME_PATH` optionally overrides it. Run `npm run audit:mobile` against production preview port 4173 with heavy work stopped. Run `node scripts/verify-media.mjs` after the full batch, with FFmpeg/FFprobe on PATH.

Then run `node scripts/verify-delivery-artifacts.mjs` to check model, still and video manifests against the actual files and confirm that the media report matches the delivered batch. It also detects changes to the backend sources covered by the recorded verification; if those change, rerun and update their acceptance evidence.

The website enforces a combined JavaScript gzip budget below 250,000 bytes, including lazy chunks. This budget does not apply to the separate app or video-authoring environment. Local simulation does not certify physical-device or deployed-host performance. Current results and the item-by-item §5.6 review belong in [acceptance-full.md](docs/acceptance-full.md). Physical Android/iOS checks remain explicitly pending in [the device acceptance record](device-acceptance.md), as requested by the user.

## Repository map

```text
app/             Expo mock frontend, local state, sample PDF, unit tests
brand/           tokens, fonts, notices, Pulse Roof, shared models
blender/         original store/cabinet generation and configuration
reels/           compositions, JSON episodes, safe zones, batch renderer
out/             review stills/videos and render manifests
src/             vanilla website, effects and business configuration
public/images/   labelled concepts and future approved photographs
scripts/         asset generation, budgets, audits and media checks
tests/           website/app/reel browser verification
docs/            brief, guides, provenance and acceptance evidence
```

No default UI theme was used. Instrument Serif, Geist and Geist Mono, fine rules, square corners and Pulse Roof are shared across surfaces. Font and integrated website-library notices are retained under `brand/licenses`. Remotion has its own license; operating-team eligibility for commercial use is unconfirmed.
