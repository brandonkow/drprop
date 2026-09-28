# Steps 1–2 acceptance report

Date: 2026-09-28. Delivery branch: `feat/brand-static-landing` in `brandonkow/drprop`.

## Scope and instruction precedence

Implemented only Chapter 10, steps 1–2: shared brand assets and the static landing page. The user's later English-only instruction supersedes the original trilingual requirement. The user also requires branch-only output and reserves `main` deployment for another session. No main-branch mutation, merge, deployment or publishing is part of this delivery.

The original attachment was read in full. `docs/brief.md` is an English working translation retaining the background, proposals and future roadmap, with an explicit current-scope note. Background legal and market assertions have not been independently validated. They are not treated as implementation commands or verified launch claims.

## Section 5.6 — item-by-item review

| Requirement | Result | Evidence |
| --- | --- | --- |
| No generic hero + subtitle + two buttons + three feature cards | Pass | One booking action in the header. Asymmetric serif hero and static roof rule; consultation services are numbered text rows with dividers, not cards. |
| No glassmorphism card grid | Pass | Opaque bone/paper/travertine surfaces. No backdrop filters, translucent cards or glass styling. |
| No purple-blue gradients, glowing borders or gradient text | Pass | Specified flat colors only; no gradient, glow or shadow rules. |
| No emoji or Lucide/Heroicons stacks in feature lists | Pass | Plain 01/02/03 labels. No icon library. The small outbound arrow on links is not a feature-list icon. |
| No site-wide Inter | Pass | Instrument Serif headings; Geist body; Geist Mono monetary values. Self-hosted Latin font files through Fontsource. |
| No rounded-2xl + shadow-lg cards | Pass | Corners are square or 2px. Fine rules replace shadows; no card grid or UI component library. |
| No fabricated trust data | Pass | No testimonials, customer counts or fabricated remaining capacity. The 300 memberships and prices are expressly proposals. Address, hours and SSM remain unconfirmed. |
| No testimonial carousel, FAQ accordion or newsletter box | Pass | None present in the five sections or footer. |
| No floating chatbot | Pass | No chatbot or floating widget. The only booking action is the ordinary header CTA. |
| Establish quality through typography, space and a breathing line | Pass for steps 1–2 | Editorial serif hierarchy, 160px desktop / 96px phone section separation and shared Pulse Roof artwork. The line is intentionally static; breathing/scroll animation is deferred to step 3. |

No §5.6 prohibited pattern was found in the delivered source or inspected screenshots. This is a scoped design review, not an assertion that all future roadmap acceptance criteria are complete.

## Verification performed

- `npm run build`: TypeScript check and production build passed.
- `npm test`: 3 test groups passed, covering every price threshold and next cent, formatted amounts, empty/malformed input, unavailable contact data and encoded WhatsApp messages.
- `npm run test:browser`: 7 tests passed in headless Microsoft Edge via Playwright against the production build.
- Automated axe checks for WCAG 2 A/AA and WCAG 2.1 AA: no reported violations in the tested desktop/tablet/phone states. This is not a complete accessibility certification.
- Actual UI price entry, all five bands, invalid-input feedback and clearing/reset were verified. No fake fee is shown while empty or invalid.
- Header booking has no destination and is unavailable without the actual number. Google Maps remains hidden without confirmed address/destination data.
- Five semantic content sections, English document language, skip-link keyboard focus and no page JavaScript errors verified.
- Horizontal overflow checks passed at 1440, 768, 390 and 320 CSS pixels.
- Production content and static price bands remain readable with JavaScript disabled. The calculator is disabled with a visible explanation until enhancement initializes.
- Reduced-motion check found no animations and no canvas. No WebGL is required.
- Screenshots were generated and desktop/phone views visually inspected; tablet and narrow-phone full-page screenshots were also reviewed.
- English-only source scan found no remaining Chinese characters in authored project files.

The first browser pass found the supplied bronze color had insufficient contrast for small text against bone (4.37:1). That label now uses ink, with bronze retained only as a decorative rule. The no-JavaScript explanation was changed from `noscript` to visible static fallback content hidden only after enhancement starts. All affected checks then passed.

## Build footprint

Vite reported approximately 3.06 KB JavaScript / **1.39 KB gzipped**, and 9.95 KB CSS / **2.90 KB gzipped**. Latin WOFF2 assets total approximately 43.84 KB; WOFF fallbacks are also emitted. These are build artifact sizes, not measured network performance or LCP.

## Visual evidence

- [Desktop, 1440px full page](qa/landing-1440.png)
- [Desktop first viewport](qa/hero-1440.png)
- [Tablet, 768px full page](qa/landing-768.png)
- [Phone, 390px full page](qa/landing-390.png)
- [Phone first viewport](qa/hero-390.png)
- [Narrow phone, 320px full page](qa/landing-320.png)

Screenshots show RM 500,000 entered and the corresponding RM 399 proposed standard fee. This is an example calculator input, not a transaction or customer record.

## Remaining business inputs and limits

The WhatsApp Business number, actual store photograph, address, hours, SSM number and business privacy notice are missing. Fees, urgent surcharge and membership terms need confirmation. The interface labels this as a pre-opening preview; booking is not available. `src/config/site.ts` is the handoff point for confirmed business data.

No message was sent to WhatsApp, no live booking was made and no map destination was fabricated. Valid URL formatting is unit-tested; contact-account existence and a live booking flow are unverified.

No real Android device, iOS Safari, other browser engine, network-throttled LCP or Lighthouse measurement was performed. These remain future validation work. No app, WebGL, animation, backend, payments, reels or 3D work was executed.

The repository was empty when this local branch was initialized, so this delivery starts with its own root commit. A separate Claude branch appeared remotely while work was underway. This task does not modify that branch. The deployment owner should inspect history before deciding how to integrate this branch into their own work.
