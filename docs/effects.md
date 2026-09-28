# Website effects — steps 3–5

This document describes the implementation on `feat/brand-static-landing`. The user approved Chapter 10, steps 3–5 after completing steps 1–2. English-only output and branch-only delivery remain in force. Nothing in this phase authorizes deployment, a main-branch change, the mobile app or the reels pipeline.

## Rendering structure

`src/effects/index.ts` is the small bootstrap. It checks reduced motion and data-saving preferences before requesting the lazy scene chunk. Fonts and two browser paint opportunities precede initialization; idle scheduling gives the text priority. If WebGL2 is unavailable, the existing SVG and CSS background remain visible. No decorative code controls access to content, booking configuration or the calculator.

`scene.ts` owns one fixed, non-interactive canvas and one three.js renderer/context. It sits behind content. The paper section background is reproduced in the canvas while effects are active; the static CSS background returns when effects are removed. This lets the line appear in the fee section's empty track without crossing text or controls. Shader programs are warmed using `compileAsync` with their actual render targets, allowing parallel driver compilation when supported; resize reuses those programs and only resizes targets. The heading font is preloaded to shorten the initial text-rendering path.

- Layer A: a low-resolution half-float fluid solver, rendered through ping-pong targets and a full-screen background pass.
- Layer B: three.js Line2 / LineMaterial with 512 sampled vertices and a 1.5 CSS-pixel stroke. Both segment endpoints morph in the vertex shader before screen-space expansion.
- Layer C: a final full-screen pass with 4% static grain. Noise does not move or flicker.

The line is drawn only in dedicated hero, fee and visit tracks. An initial 900ms transition moves the flat line into the heartbeat. ScrollTrigger supplies scroll progress: heartbeat to roof, a roof plateau across the fee area, then a generic skyline at the visit section. The heartbeat repeats every 1.2 seconds. Valid price input creates a small logarithmically scaled amplitude response that settles over 800ms. There are no identifiable buildings.

Lenis advances on the GSAP ticker and notifies ScrollTrigger. Touch scrolling remains native (`syncTouch: false`); anchors and keyboard navigation remain available. No bounce, rotating entrances, section fade-ups or camera effects are used.

## Fluid provenance and changes

The shader and solver source is [PavelDoGreat/WebGL-Fluid-Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation), pinned to [revision a2d2929](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation/tree/a2d292931f19d9b3b9f564e23e6c32729d2121c3). The complete MIT license is retained at `brand/licenses/fluid-MIT.txt`.

`scripts/import-fluid.mjs` reproducibly extracts seven shaders from that revision: splat, advection, divergence, curl, vorticity, pressure and gradient subtraction. They are stored in `src/effects/vendor/pavel-shaders.ts`. The upstream vertex setup and raw WebGL orchestration are replaced by a typed three.js render-target adapter. The ordered vorticity/pressure/advection solver follows the upstream pipeline. No GUI, promotional popup, analytics, random startup splats, bloom or sunrays is imported.

Dr Prop adaptations:

- Simulation resolution: 64 on the shorter side, aspect-aware with a 3:1 allocation limit.
- Dye resolution: 512 desktop / 256 coarse-pointer or phone viewport, on the shorter side.
- Density dissipation: 4.5, higher than the upstream default of 1.
- Smaller splat radius: 0.0006 in the normalized shader coordinate system.
- Sixteen pressure iterations and restrained vorticity.
- Pigments derive only from travertine, stone and bronze. They subtract a capped amount of light from the bone/paper surface, creating a quiet ink stain rather than neon color.
- Pigment is injected only by pointer movement; pointer release/cancellation resets tracking. No idle splats.
- After three idle seconds, dye and velocity targets clear and the solver stops updating until another movement.

## Fallback and lifecycle policy

| Condition | Behavior |
| --- | --- |
| Reduced motion at startup | No scene download, no canvas; static SVG roof |
| Reduced motion enabled while open | Dispose renderer, targets, listeners, scroll integration; restore SVG/CSS |
| Reduced motion disabled again | Initialize one fresh scene |
| Data-saving preference | Same static fallback; no scene download |
| Device memory below 4GB | Line and grain remain; fluid targets are not allocated |
| Device memory unavailable | Normal policy; do not guess the device's memory |
| WebGL2 unavailable | Static SVG/CSS, fully functioning page |
| Half-float rendering unavailable | Line and grain without fluid |
| Shader/init failure | Remove the attempted canvas and retain static content |
| GPU context lost | Dispose the scene and return to static SVG/CSS for the page visit |
| Hidden document | Stop the render callback and GSAP ticker; no hidden GPU frames |
| Visible again | Resume with fresh timing and no stale pointer injection |
| Resize | Reallocate size-dependent targets, recalculate tracks and cap DPR |
| Sustained slow frames during fluid activity | Release fluid targets while retaining line/grain |
| Page exit / back-forward cache | Dispose on pagehide; reinitialize on persisted pageshow |

Pixel ratio is capped at `min(devicePixelRatio, 1.5)`. The renderer draws at most approximately 60 frames per second. Grain is static, so unchanged frames with no visible heartbeat, no changing line and no ink do not need another GPU draw. The fluid simulation stops when idle even if the hero heartbeat remains visible.

Diagnostic data attributes on the decorative canvas expose render count, progress, input response, resolution and fallback state for testing; they are not visible product UI.

## Performance verification

`npm run build` runs `scripts/check-budget.mjs` after TypeScript and Vite. It sums gzipped sizes of **all** emitted JavaScript chunks, including lazy effects, and fails at 250,000 bytes. Results are written to `docs/qa/bundle-size.json`. The large uncompressed rendering chunk may trigger Vite's 500KB advisory; the acceptance budget is the total gzip size, and the scene is already deferred.

Run `npm run preview -- --port 4173`, then `npm run audit:mobile` for the local mobile Lighthouse audit. Set `CHROME_PATH` when Edge is unavailable, and `AUDIT_URL` to audit a later deployed address. HTML, full JSON and a compact summary are saved under `docs/qa/`. Lighthouse uses simulated mobile network/CPU throttling; it is not a real Android test. The deployment owner should repeat the audit against their host.

The browser suite covers shader startup, pointer activity/idle cleanup, skyline progress, calculator use with effects, disabled WebGL, low memory/high DPR, live reduced-motion changes, visibility handling and real WebGL context loss. Existing layout/accessibility screenshots use reduced motion for deterministic comparison. Effects screenshots cover the animated version.

## Library references

- [LineMaterial documentation](https://threejs.org/docs/pages/LineMaterial.html): screen-space line rendering.
- [Lenis integration documentation](https://github.com/darkroomengineering/lenis): GSAP ticker and ScrollTrigger synchronization.
- [ScrollTrigger documentation](https://gsap.com/docs/v3/Plugins/ScrollTrigger/).
- [GSAP license](https://gsap.com/standard-license/): GSAP is not MIT; its copyright notices remain in the bundle. Three.js and Lenis MIT notices are copied to `brand/licenses/`.

None of this work verifies the business's legal readiness or fills missing business data. The unconfirmed booking number, store details, image and commercial terms remain explicitly unconfirmed.
