# Remaining delivery plan

Scope authorized: complete Chapter 10 through step 14, in English, exclusively on `feat/brand-static-landing`. The separate deployment session owns `main`. The app is the brief's phase-one mock frontend; live authentication, payments and a backend remain phase two. Business facts are never invented.

## Implementation sequence

1. Build the Expo app foundation, shared tokens, three tabs, launch/onboarding, and a four-screen booking journey with explicit simulated payment and local demo persistence.
2. Add records/report viewing, profile/preferences, membership renewal simulation, and a Skia card with permission-aware gyroscope and reduced-motion fallbacks. Verify the exported web app and native bundles; record physical-device gaps separately.
3. Produce shared procedural 3D assets and Blender scripts for the pulse sculpture, anonymous houses, apothecary, member card and parameterized concept store. An unconfirmed store plan must be labelled a concept, never a surveyed digital twin.
4. Build all eight Remotion compositions, data-driven cases/market series, safe-zone overlays, three aspect ratios and English batch rendering. Use deterministic frames, font loading, model fallbacks and silent output until rights-cleared sound is supplied.
5. Refine website initialization where evidence supports an improvement, verify production exports, render media, inspect representative frames and app states, and update the requirement-by-requirement acceptance report.
6. Commit and push source, generated brand assets, review artifacts and reproducible tooling to the feature branch. Do not deploy or merge.

## Directory structure

```text
app/                         Expo Router project, package/lock, mock frontend
  src/app/                   launch, onboarding, three tabs, booking, record, membership
  src/components/            editorial UI, pulse and Skia membership surface
  src/domain/                typed models and booking rules
  src/state/                 local demo repository and session state
brand/3d/                    shared GLBs and provenance manifest
brand/three/                 reusable procedural scene constructors
blender/                     configurable store/apothecary generation
reels/                       Remotion project and package/lock
  src/components/            safe zones, captions, pulse and 3D scenes
  src/compositions/          eight named compositions
  src/data/                  explicitly labelled demo cases and market series
  scripts/                   asset preparation and batch render
out/                         reproducible rendered media and render manifest
docs/qa/                     browser evidence, media frames and audit reports
docs/acceptance-full.md       final requirements and verification ledger
```

## Inputs that affect launch, not implementation

Confirmed contact/store details, approved prices/membership terms, registration and privacy notice; real store plan; production market data/case consent; rights-cleared audio; Remotion operating-team size/license eligibility; physical Android/iOS devices for native validation. Keep every unresolved item visible in the final report.

## Progress

- Steps 1–5: delivered in commits `0341f16` and `102db1b`; final local website LCP 1.30 s, TBT 365 ms and 218,084-byte gzip bundle budget pass. Final Lighthouse performance score is 87; physical-device verification remains open.
- Steps 6–12: implemented and locally checked. Native runtime and a measured store plan remain external acceptance gaps.
- Step 13: all 28 review stills and 28 English MP4s complete. Hashes, H.264/AAC, limited-range BT.709/yuv420p, dimensions, 30 fps, frame counts, durations and full decode checks passed. All 28 contact sheets were visually reviewed at three sampled moments each.
- Step 14: README and app/reel/3D/provenance guides written. The full acceptance ledger separates verified evidence from launch inputs.
