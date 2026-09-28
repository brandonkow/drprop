# Website acceptance — steps 1–5

Historical phase report. Later app/media/store work and the latest measurements are documented in [the full delivery ledger](acceptance-full.md). The original phase's Lighthouse summary is preserved as [lighthouse-steps-1-5-summary.json](qa/lighthouse-steps-1-5-summary.json); the other primary QA report paths now track the latest build.

Updated: 2026-09-29 (Asia/Kuala_Lumpur). Branch: `feat/brand-static-landing`, repository `brandonkow/drprop`.

The user explicitly approved steps 3–5 after the initial steps 1–2 delivery. All copy and documentation remain English-only. This work does not modify, merge into or deploy `main`; deployment belongs to the other session. The [original steps 1–2 report](acceptance-steps-1-2.md) is retained as a historical record.

## Delivered in this phase

- **Step 3:** three.js Line2/LineMaterial pulse, 512-vertex shader morphing from flat to heartbeat to roof to generic skyline; GSAP/ScrollTrigger + Lenis coordination; small calculator amplitude feedback.
- **Step 4:** the adapted Pavel Dobryakov fluid solver, limited to muted brand pigments, pointer movement, 64 simulation resolution and 512/256 desktop/mobile dye resolution; a 4% static grain postprocessing pass. No bloom, sunrays or random startup splats.
- **Step 5:** asynchronous initialization, parallel shader warm-up where supported, heading-font preload, DPR cap, reduced-motion/data-saving/low-memory/WebGL/context-loss fallbacks, hidden-page pausing, idle fluid cleanup, budget enforcement and mobile Lighthouse checks.

Full technical details, upstream revision, license locations and reproduction commands are in [effects.md](effects.md). The complete page and calculator remain available without decorative rendering. Missing real-world business details remain explicitly unconfirmed.

## Section 5.6 — item-by-item review

| Brief requirement | Result | Evidence in this delivery |
| --- | --- | --- |
| No generic hero + subtitle + two buttons + three feature cards | Pass | One header booking action; asymmetric serif hero; numbered consultation rows without cards. |
| No glassmorphism card grid | Pass | Opaque paper/stone styling and rules; no glass cards or backdrop filters. |
| No purple-blue gradients, glowing borders or gradient text | Pass | Brand-only pigment palette with capped ink absorption; no bloom, sunrays, luminous edges or gradient text. Fluid tonal variation is the expressly requested ink effect. |
| No emoji or Lucide/Heroicons stacks | Pass | Plain service numerals; no icon library. Small link-direction arrows are not feature-list icon stacks. |
| No site-wide Inter | Pass | Instrument Serif, Geist and Geist Mono; self-hosted and licensed. |
| No rounded-2xl + shadow-lg cards | Pass | Square/2px corners, no card shadows or component-library theme. |
| No fabricated trust data | Pass | No customer counts, testimonials or fabricated availability; proposed fees and 300 memberships are labelled as proposals. |
| No testimonial carousel, FAQ accordion or newsletter box | Pass | None present. |
| No floating chatbot | Pass | None present; normal header booking action only. |
| Use typography, whitespace and a breathing line | Pass | Existing editorial hierarchy and spacing retained; quiet pulse morphing in dedicated blank tracks, with a static SVG alternative for reduced motion or GPU failure. |

Motion is limited to the brand signature and calculator feedback. There are no per-section fade-ups, bounce effects, spinning entrances or recognizable real buildings. The static grain does not flicker. The empty store-photo area remains honestly labelled.

## Verification

The TypeScript/production build and all-JavaScript gzip budget passed. **All 5 unit tests and all 15 browser tests passed** on the final regression run. Automated axe WCAG 2 A/AA and WCAG 2.1 AA scans reported no violations in the tested states; this is not a complete accessibility certification.

Browser coverage includes actual ink-pixel changes, three-second ink cleanup, full skyline progress, rendered calculator feedback, unavailable WebGL, a 2GB/DPR-3 phone profile, a 4GB/DPR-2 phone profile with fourfold CPU throttling and native touch scrolling, live reduced-motion toggling, hidden-page handling, context loss and skipping the entire scene download under reduced motion. Existing checks cover pricing, keyboard entry, page semantics, automated WCAG A/AA scans, no-JavaScript content and overflow at 1440/768/390/320px.

The visibility test explicitly simulates the document visibility event and verifies that GPU frame counts stop; it does not claim an operating-system background-tab measurement. The 4GB profile is browser emulation, not a physical Android phone.

## Mobile Lighthouse results

Final audited production build, localhost, Lighthouse 13.5.0 through headless Edge/Chromium. Default mobile screen/network settings and simulated CPU throttling; no audit-specific visual-feature bypass was used. The report's Android user-agent string is emulation, not evidence of a connected Android device.

| Metric | Result |
| --- | --- |
| Performance | **72 / 100** |
| Accessibility | **100 / 100** |
| Best practices | **100 / 100** |
| SEO | **92 / 100** |
| First Contentful Paint | **1.19 s** |
| Largest Contentful Paint | **1.55 s** — meets the brief's <2.5 s target in this run |
| Total Blocking Time | **1.70 s** — remaining limitation |
| Cumulative Layout Shift | **0.00023** |
| Speed Index | **3.48 s** |
| All JS chunks, gzipped | **194,587 bytes** — below the 250,000-byte budget |

The initial audit recorded LCP 2.44 s and TBT 4.68 s; an intermediate audit recorded LCP 2.53 s and TBT 3.23 s. Heading-font preload and correctly targeted asynchronous shader warm-up improved the final results. These are separate local runs with normal measurement variability, not a controlled laboratory claim.

**Performance is not fully optimized.** Despite meeting LCP and transfer-budget targets, shader/setup work and other main-thread activity still produce substantial simulated blocking time. No physical midrange Android smoothness, real-world INP or deployed-host performance is certified. The deployment owner should repeat the audit on the actual host and a target Android device before treating it as launch-ready.

Evidence:

- [Full HTML Lighthouse report](qa/lighthouse-mobile.html)
- [Full JSON report](qa/lighthouse-mobile.json)
- [Final summary with environment/settings](qa/lighthouse-summary.json)
- [Initial summary](qa/lighthouse-initial-summary.json) and [intermediate summary](qa/lighthouse-intermediate-summary.json)
- [Build budget by chunk](qa/bundle-size.json)

On Windows, chrome-launcher encountered a locked temporary browser-profile directory during cleanup. The browser audit had already completed and its reports were saved. The script reports that cleanup warning without treating the valid audit as a measurement failure; it does not delete unrelated temporary directories.

## Visual evidence

- [Animated hero](qa/effects-hero-desktop.png)
- [Pointer ink](qa/effects-ink-desktop.png) and [ink detail](qa/effects-ink-detail.png)
- [Fee-area roof and calculator](qa/effects-fees-desktop.png)
- [Visit-area skyline](qa/effects-skyline-desktop.png)
- [Low-memory phone](qa/effects-low-memory-phone.png)
- [4GB phone emulation](qa/effects-4gb-phone.png)
- [Reduced-motion desktop](qa/landing-1440.png), [tablet](qa/landing-768.png), [phone](qa/landing-390.png) and [narrow phone](qa/landing-320.png)

The effects, text clearance, typography and phone layouts were visually reviewed. Screenshot calculator values are test inputs, not customer or transaction data.

## Remaining inputs and boundaries

The real WhatsApp number, store address/hours/photo, SSM registration and final privacy notice are still missing. Pricing and membership terms remain proposals. No live booking or outbound message was sent. No backend, payment flow, mobile app, reels, 3D asset pipeline, website deployment or main-branch work was performed.
