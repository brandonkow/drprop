# Full delivery ledger

Updated 2026-09-29 (Asia/Kuala_Lumpur). Repository: `brandonkow/drprop`. Branch: **feat/brand-static-landing**. All authored product copy and documentation are English. The user authorized completing Chapter 10 after the earlier website phases. `main`, deployment and real outbound messaging remain untouched.

**Status: Chapter 10 implementation, local checks and all 28 English media exports are complete.** This is not a launch-readiness certificate. The historical [steps 1–5 report](acceptance.md) remains available.

The subsequent authentication/scheduling increment has its own [backend acceptance report](backend-acceptance.md); the phase-one measurements below are preserved as historical evidence.

## Chapter 10 coverage

| Step | Delivery | Evidence/status |
| --- | --- | --- |
| 1 | Shared colors, fonts and Pulse Roof | `brand/`, font notices and generated CSS |
| 2 | English semantic landing page/calculator | Responsive and no-JavaScript browser checks |
| 3 | Pulse shader, ScrollTrigger and Lenis | Morphing/scroll/feedback checks |
| 4 | Muted fluid and static grain | Actual ink-pixel/idle-cleanup checks; MIT notice retained |
| 5 | Performance/fallbacks | Build budget, Lighthouse, reduced-motion/WebGL/memory/context-loss tests |
| 6 | Expo Router skeleton and shared tokens | Exactly Home, Records, Me; TypeScript and platform exports |
| 7 | S0/S1/S2/S3 mock journey | Preview OTP; four-screen booking; local persistence; three browser journeys |
| 8 | S5 membership | Native Skia/optional gyro and web SVG fallback; physical-device verification pending |
| 9 | S4 records and S6 profile | Fictional PDF, linked final check, cancellation, preferences, renewal simulation and sign out |
| 10 | Shared 3D-1/2/4/5 | Original procedural constructors and seven exported GLBs |
| 11 | All eight reel templates | 28 registered English compositions; typography/safe-zone/model-fallback checks |
| 12 | Blender store and GLB integration | Executed Cycles scripts, editable `.blend`, GLBs, PNG/WebP; actual measured plan absent |
| 13 | Batch command and media verification | 28 stills and 28 MP4s; hashes, format/frame/decode checks and sampled visual review passed |
| 14 | Handoff | README, app/reel/3D/effects guides, provenance and this ledger |

## Section 5.6 — item-by-item self-audit

| Requirement | Result | Evidence across delivered surfaces |
| --- | --- | --- |
| No generic hero + subtitle + two buttons + three feature cards | Pass | Asymmetric site hero and numbered rows; app has one booking CTA; reels use typography/model scenes. |
| No glassmorphism card grid | Pass | Opaque paper/night surfaces and rules. The explicitly requested membership card is a single credential preview, not a glass grid. |
| No purple-blue gradients, glowing borders or gradient text | Pass | Bone/ink/travertine/bronze palette; no glow, bloom or gradient type. The requested metal sheen and ink use restrained tonal variation. |
| No emoji or Lucide/Heroicons stacks | Pass | Plain numbers, text tabs and labels; no decorative feature-icon library. Framework navigation assets are not feature-list ornaments. |
| No site-wide Inter | Pass | Instrument Serif, Geist and Geist Mono loaded locally. |
| No rounded-2xl + shadow-lg cards | Pass | Square/2px UI corners and fine rules. Physical shadows belong to 3D objects, not UI cards. |
| No fabricated trust/customer claims | Pass | No testimonial/customer-count claims. Sample availability, OTP, membership, case and store are explicitly demo/concept; fee/capacity proposals remain labelled. Observed market data has provenance. |
| No testimonial carousel, FAQ accordion or newsletter box | Pass | None present in site or app. |
| No floating chatbot | Pass | None present. |
| Typography, negative space and breathing line | Pass | Shared serif/sans/mono hierarchy, open layouts and one Pulse Roof motif; static alternatives preserve content. |

No default theme, noisy transitions, bounce/overshoot, emoji stickers, stock property-sales imagery or recognizable development was introduced. Educational reels retain their disclaimer. The store study is clearly unconfirmed. Checks apply to shipped content; new episodes must be visually reviewed again.

## Verified local results

- Website: five unit tests; original 15 browser regressions plus three store integration/fallback checks passed. TypeScript/production build passed. An additional approved-photo smoke check confirmed the detached preload replaces the concept poster and caption. No-JavaScript/WebGL, reduced motion, memory/DPR, pointer ink, hidden-page/context-loss behavior, keyboard, responsive overflow and automated accessibility checks are covered.
- App: nine unit tests, TypeScript, web export and Android/iOS Hermes exports passed. Three end-to-end browser journeys passed after the dependency overrides. Production dependency audit: zero known vulnerabilities on the recorded date. Export success is not physical native acceptance.
- Reels: type checking and five data/layout unit tests passed, including rejection of malformed episode metadata before rendering. Four browser checks sample five moments in each of eight series across three ratios, with missing-GLB fallback coverage. Final encoded media evidence is recorded below.
- Blender: store and apothecary scripts executed successfully. Both Cycles stills were visually inspected. Shared assets have hashes in `brand/3d/artifact-manifest.json`.
- PDF: the fictional sample report was generated, rendered and visually inspected; it contains no assessed property facts.

### Latest website measurement

Local production preview, Lighthouse 13.5.0 through Edge with simulated mobile network/CPU settings, without an audit-specific feature bypass:

| Metric | Result |
| --- | --- |
| Performance / Accessibility / Best practices / SEO | 87 / 100 / 100 / 92 |
| First Contentful Paint | 1.08 s |
| Largest Contentful Paint | 1.30 s — below 2.5 s target |
| Total Blocking Time | 365 ms |
| Cumulative Layout Shift | 0 |
| Speed Index | 5.35 s |
| All JavaScript chunks, gzipped | 218,084 bytes — below 250,000-byte budget |

This final-build audit ran after rendering and media verification stopped. The earlier local run scored 97 with 1.29 s LCP and 183 ms blocking time; the final run scored 87 with slower Speed Index and more blocking. These separate runs are not a controlled comparison, and the variation has not been isolated to a specific cause. The latest result is reported here rather than selecting the best score. Both the stated LCP and gzip targets pass; physical-device smoothness and deployed-host performance remain unverified. A Windows temporary-profile cleanup warning occurred after the completed audit; its saved results remain valid.

[Latest Lighthouse summary](qa/lighthouse-summary.json), [earlier local summary](qa/lighthouse-pre-delivery-summary.json), [full report](qa/lighthouse-mobile.html), [bundle breakdown](qa/bundle-size.json), [app audit](qa/app-dependency-audit.json), [app screenshots](qa/app/), [reel screenshots](qa/reels/) and [website model screenshot](qa/store-model-website.png).

### Final media evidence

All 28 MP4s passed FFprobe checks for H.264 video, AAC audio, limited-range BT.709/yuv420p, expected dimensions, 30 fps, exact frame counts and duration. SHA-256 hashes match the manifest, and full FFmpeg decoding passed without errors. The final files total **39,823,198 bytes** and **532 seconds** across all variants; the largest file is 3,104,841 bytes. The canonical 28 stills and two additional store-camera stills also match their manifests.

All 28 contact sheets were visually reviewed at three sampled moments per file (84 frames). Captions, fees, historical market provenance, concept labels, model visibility and scene progression passed this sampled review. This is not a claim of frame-by-frame playback review. Audio remains silent AAC evaluation audio.

Early encoded-file inspection found Remotion's default JPEG color path produced full-range BT.601/yuvj420p despite the pixel-format option. Rendering now requests BT.709 explicitly; FeeReveal 4:5 was re-rendered to verify that setting. The other 27 files were converted with `scripts/normalize-media.mjs`, preserving AAC and recording source/output hashes. A representative RGB comparison measured SSIM 0.999535, with acceptable tonal preservation on visual review. Acceptance is based on final file checks, not encoder option names.

[Video manifest](../out/manifest-video.json), [encoded-file checks](qa/media-verification.json), [visual-review record](qa/media-visual-review.json), [contact sheets](qa/media/) and [color-conversion comparison](qa/media-color-validation.json).

## Remaining inputs and acceptance boundaries

1. Confirm WhatsApp, address/hours, registration/privacy details, prices and membership terms. Until then, website booking stays unavailable and app services stay simulated.
2. Supply an approved measured store plan to replace the explicitly unconfirmed 96 m² concept. A construction-grade digital twin has not been delivered.
3. Supply rights-cleared sound and confirm Remotion operating-team license eligibility. Current evaluation exports are silent; no -14 LUFS audio master is claimed.
4. Test on physical target Android/iOS devices: native Skia, gyro permission/denial, background cleanup, haptics, files, keyboard and 4 GB Android scrolling. Browser emulation/native bundling do not certify these.
5. Deployment owner must verify the actual host. No main-branch change, deployment, live booking, real payment or production database was performed.

Backend OTP, staff access, secure attachments/reports, real payments/webhooks and check-in credentials are the brief's phase-two work, not concealed unfinished mock functionality. They require their own production implementation and verification.
