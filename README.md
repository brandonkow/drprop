# Dr Prop

Brand, website, membership app, consultation workflow and concept media for an independent property clinic. The [English working brief](docs/brief.md) records the design and proposed business rules. The user's current direction is **English-only delivery, amendments on main, and new feature builds on hold**.

## Repository

| Folder | Purpose |
| --- | --- |
| `brand/` | Shared tokens, fonts, Pulse Roof, logo, fees, 3D assets and print sources |
| `web/` | Vite/TypeScript website, five sections, fee calculator, privacy and terms |
| `app/` | Expo SDK 57 / Expo Router app: consultation, records, membership and staff flows |
| `supabase/` | Additive migrations, ownership/role checks, booking and check-in rules, database tests |
| `reels/` | Remotion sources, English exports, release manifest and media verification |
| `blender/` | Shophouse/mall concept models, layout films and export scripts |
| `twin/` | Interactive concept store and simulated operating day; no live client data |
| `e2e/` | Browser checks, including a local Supabase fixture backed by the real SQL migrations |
| `vendor/` | Documented upstream decoder compatibility copy for Expo SDK 57 |
| `docs/` | Decisions, launch requirements, reviews and verification evidence |

## Run and verify

Use Node 22 (see `.nvmrc`) and npm. Install with `npm ci`.

| Command | Result |
| --- | --- |
| `npm run dev` | Website development server |
| `npm run build` | Brand assets and explicitly labelled website preview in `web/dist` |
| `npm run build:production` | Production website; rejects incomplete launch configuration |
| `npm run preview` | Serve the website export |
| `npm run app` | Expo development server, preview data by default |
| `npm run export:web -w @drprop/app` | Portable preview web export into `app/dist` |
| `npm run export:connected-fixture -w @drprop/app` | Local-test backend export into `app/dist-connected`; never deploy this fixture |
| `npm run typecheck` | All workspaces and tests |
| `npm test` | Unit, data and real-migration PGlite tests |
| `npm run lint -w @drprop/app` | App lint |
| `npm run test:e2e` | Browser journeys after website and both app exports are built |
| `npm run audit:dependencies` | Current dependency audit, with explicit expiring exceptions |
| `npm run verify:launch-guard` | Check that incomplete production settings are rejected |
| `npm run verify:media -w @drprop/reels` | All manifest assets: hashes, format, complete decode and loudness |
| `npm run verify:publication -w @drprop/reels` | Publication-eligible media only; never includes sample/internal films |
| `npm run twin` / `npm run twin:build` | Store simulation development/build |
| `npm run reels` | Remotion Studio |
| `npm run render:all` | English reels in 9:16, 4:5 and 16:9 |
| `npm run brand:3d` | Export procedural GLBs |
| `npm run print -w @drprop/brand` | English sample reports/cards and concept fee plate |

Run the two app exports sequentially: each clears the shared Metro cache to prevent backend settings leaking between builds. Install Playwright Chromium with `npx playwright install chromium` for browser checks. Native app behavior still needs physical Android/iOS testing.

## Preview and production

The website preview labels its status, disables booking and requests no indexing while launch details are incomplete. Public deployment must use `npm run build:production`, output `web/dist`, Node 22. Supply the confirmed origin, WhatsApp number, registration, street address and Maps URL in `web/src/config/site.ts`. Do not invent them. Old `/zh/` and `/ms/` URLs redirect to English.

The app defaults to local sample data. For a real Supabase connection, use `app/.env.example` and [the backend setup instructions](supabase/README.md). Never ship service-role keys. Connected mode takes booking requests and does not collect payment. Apply migrations in order after backup and hosted validation; local tests do not apply them to a hosted project.

Membership check-in validates both active status and the renewal date. The current conservative implementation expires at the start of that date in Malaysia, without an implied grace period. Confirm commercial terms before activation. Appointment opening days/hours and horizon come from `dp_settings`; fees and bookings remain disabled until explicitly confirmed by the operator. Overdue urgent requests require an adviser to acknowledge recovery, rather than silently preserving the original deadline promise.

## Media and concepts

`reels/delivered/` holds 36 English release-candidate reels. Three illustrative market videos are segregated in `reels/samples/` and excluded from publication. Four brand/product films are also publication candidates; two silent layout films are internal concept assets. Technical verification is not approval of business claims, legal copy or music rights.

`reels/media-manifest.json` records the exact inventory and checksums. Review every rerender before changing its hash, expected dimensions, frame count or duration. Run full media verification after updating a reviewed manifest. Rendering permits English only. Case JSON must record general-information or anonymised-case basis; real market data requires provenance. See [media delivery notes](reels/delivered/README.md).

Store imagery and generated people are concepts, not photographs of an operating clinic. Keep those labels. The twin runs a simulated day and must not receive private client records. Measured store plans, real-device checks, hosted SMS/database testing, legal/business sign-off and media rights remain external acceptance items.

## Design and licensing

Follow brief §5.6: no generic component-library landing pattern, glass cards, gradient branding, emoji/icon feature lists, Inter, oversized rounded/shadow cards, invented social proof, testimonial carousel, FAQ accordion, newsletter box or floating chatbot. Use typography, space and the Pulse Roof. Radius 0–2 px, restrained bronze, one website booking CTA, reduced-motion and static fallbacks.

Font and software licences remain with their sources. The website includes `third-party-notices.txt`. The fluid source is derived from PavelDoGreat/WebGL-Fluid-Simulation under MIT. The patched decoder's upstream MIT licence and provenance are in `vendor/decode-uri-component`. Review Remotion's current licensing requirements before commercial release rather than relying on a historical team-size note.

See [handoff](docs/handoff.md), [decisions](docs/decisions.md), [launch checklist](docs/launch-checklist.md) and [repair verification](docs/hardening-2026-10-13.md).
