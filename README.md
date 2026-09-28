# DR. PROP

English-only brand foundation and static landing page for the independent property clinic. Implements **Chapter 10, steps 1–2 only** of [the supplied brief](docs/brief.md).

All delivery work belongs to **`feat/brand-static-landing`**. Do not merge, push or deploy `main` as part of this task. Another session owns deployment.

## Run locally

Use Node.js 22.18+ (Node 24 was used for validation).

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. For the production version:

```sh
npm run build
npm run preview
```

Build output is `dist/`. It is reproducible and excluded from Git, together with dependencies and temporary test files. Source, brand assets, documentation, lockfile and acceptance screenshots are included in the branch. No deployment workflow is installed. The eventual deployment owner can use `npm ci && npm run build` and serve `dist/` from a static host.

## Included

- Shared TypeScript tokens and generated CSS variables, licensed/self-hosted Instrument Serif, Geist and Geist Mono, and the static Pulse Roof SVG.
- Five semantic HTML sections: hero, consultations, fees, lounge and visit.
- Responsive editorial typography, fine rules, bone/paper/travertine surfaces and restrained bronze.
- Price-band calculator with boundary and malformed-input handling. The page's copy and published fee bands also work without JavaScript in the production build.
- Configurable WhatsApp booking and external Google Maps directions. Missing data never creates a fabricated live link.
- English copy only. The user's later instruction supersedes the original three-language plan; no language selector or locale dictionaries are shipped.
- Keyboard focus, skip link, input labels, live fee/error feedback and no motion to suppress.

## Configure confirmed business details

Edit [`src/config/site.ts`](src/config/site.ts):

| Field | What to supply |
| --- | --- |
| `whatsappNumber` | Confirmed Malaysian WhatsApp number, digits only, beginning with `60` |
| `address` / `hours` | Confirmed public English details |
| `mapsUrl` | HTTPS Google Maps destination; directions appear only with an address |
| `ssmNumber` | Actual business registration number |
| `loungeImage` | Local image path and descriptive English alternative text |
| `memberCapProposal` | Proposed capacity; copy continues to identify it as a proposal |

Place approved store imagery in `public/images/`. An unavailable/broken photograph retains the clearly labelled placeholder. No stock image or invented store photograph is supplied.

Booking is currently unavailable because no verified number was provided. Setting a valid number enables the existing header CTA; it opens WhatsApp with an encoded English message. Merely passing the number-format check does not verify that an account exists. No live message was sent during verification.

Edit [`src/config/pricing.ts`](src/config/pricing.ts) for fee bands. The current proposal is RM 199 / 399 / 699 / 1,199 / 1,999. Exact threshold values fall into the lower band. The calculator is for standard consultations; urgent/follow-up terms are informational proposals. If pricing changes, update the visible static price table in `index.html` as well. The boundary test intentionally documents the current business rule.

Before opening real bookings, confirm the commercial terms and replace the pre-opening copy, unconfirmed hours/address/SSM details and provisional business privacy notice. This handoff does not claim launch readiness.

## Brand changes

Edit `brand/tokens.ts`, then run `npm run tokens`. Development and production builds regenerate `brand/tokens.css` automatically. `brand/fonts.css` imports only Latin subsets; Fontsource provides `font-display: swap`. Font license notices are preserved under `brand/licenses/`. The single `brand/pulse-roof.svg` is reused by the wordmark, hero and lounge placeholder.

The semantic page lives in `index.html`, with progressive enhancement in `src/main.ts`. This keeps content present before JavaScript runs. The original proposed section modules were unnecessary for this single static page. Styles are split into shared base and responsive layout rules.

## Verify

```sh
npm test
npm run build
npm run test:browser
```

Browser tests use installed Microsoft Edge through Playwright. On a machine without Edge, install it or set `channel` in `playwright.config.ts` to the browser available to that environment. Tests cover the calculator in the actual page, unavailable booking/directions, page semantics, keyboard entry, automated WCAG A/AA checks, no-JavaScript content, reduced motion, and horizontal overflow at 1440 / 768 / 390 / 320px widths. They generate full-page PNGs in `docs/qa/`.

See [`docs/acceptance.md`](docs/acceptance.md) for the item-by-item §5.6 assessment, evidence and limitations.

## Out of scope

No three.js, GSAP, Lenis, WebGL fluid/grain, Pulse Roof animation, mobile application, backend, payment integration, 3D assets, reels or publishing. Physical Android performance testing and Lighthouse belong to later work and have not been claimed.

## Repository map

```text
brand/              tokens, fonts, Pulse Roof, font license notices
docs/brief.md       English working translation and current scope overrides
docs/acceptance.md  verification and anti-template checklist
docs/qa/            desktop, tablet and phone screenshots
public/images/      approved future store images
scripts/            token generation
src/config/         business details and pricing
src/features/       calculator and WhatsApp URL handling
src/styles/         shared and responsive CSS
src/main.ts         progressive enhancement
tests/              business rules and browser verification
index.html          full semantic page
```

The project was manually assembled using [Vite's documented setup](https://vite.dev/guide/), without a UI theme or template generator.
