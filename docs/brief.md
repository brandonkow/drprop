# Dr Prop — Brand, Store and Digital Product Brief (v0.1)

English working translation of the founder-supplied `dr-prop-brief.md`. The original attachment remains in its original location and has not been modified. This document preserves the brief's scope and proposals; factual, legal, licensing and market claims are supplied background, not independently verified findings.

## Current implementation instructions

The user's explicit instructions control this delivery: initially implement Chapter 10, steps 1–2, followed by explicit approval to continue with steps 3–5; make every deliverable English-only; place all work on `feat/brand-static-landing` in `brandonkow/drprop`; do not change or deploy `main`. References to three languages below describe the original roadmap and are superseded for this delivery. Sections 0–4 are background and decision rationale, not authorization to provide legal advice or settle business decisions. Sections 5–8 describe product specifications. Do not use default UI themes or design templates. Follow §5.6.

## 0. One-sentence positioning

Dr Prop is an independent residential property clinic: no property sales, no commissions, just a consultation fee to help homebuyers and investors understand their decision before signing.

Tagline candidates: “We don't sell. We tell.” and “Before you sign, see the doctor.” The central value is independence. Free advice from agents or developers may carry commission incentives; a transparent fee and zero commissions are the basis of the brand.

## 1. Name assessment

### 1.1 Strengths

Dr Prop is memorable, short and consistent with the property-doctor metaphor. The supplied SSM guidance lists `DR. JOHN TRADE SDN. BHD.` as an acceptable example; the brief says “Dr.” itself is not prohibited. The metaphor extends to consultations, urgent consultations, follow-ups, diagnostic reports, prescriptions and case histories.

### 1.2 Risks

“Prop” can suggest a stage prop or something artificial. Add `PROPERTY CLINIC` under the wordmark to make the property meaning clearer. The informal associations of “Dr” should be balanced by restrained uppercase lettering, generous tracking and a fine serif, without a cartoon doctor. Check MyIPO trademarks, .my/.com domains and similar SSM names before finalizing.

### 1.3 Recommendation

Retain `DR. PROP`. The original Chinese-name candidates mean “property doctor,” “home diagnosis” and “property clinic”; no Chinese name has been approved. English alternatives: `Second Opinion`, `The Property Clinic`, `Prop Clinic`.

### 1.4 Prohibited symbols

Do not use crosses or red-cross/red-crescent symbols. Use the clinical metaphor in language and process, not medical insignia.

## 2. Compliance reminders

Background only; seek advice from a Malaysian lawyer and/or BOVAEP before opening.

1. Act 242 regulates aspects of advice concerning property transactions. The proposed service boundary is due diligence, market information and feasibility analysis; the distinction from regulated estate agency requires confirmation.
2. Avoid protected professional descriptions such as “Valuer” and “Valuation.” Use analysis, diagnosis and risk assessment.
3. Introducing specific available units may constitute agency. Prefer public market information, or work with a licensed REA with full disclosure.
4. Put the zero-commission promise in service terms. Disclose any future lawyer/bank referral fees.
5. Every diagnostic report should state that it provides information and analysis, not legal, tax or financial advice; the client makes the final decision.
6. Consider a registered REA or valuer as a partner/adviser to support compliance and trust.

## 3. Pricing model

### 3.1 Original proposal

A 30-minute consultation priced at 0.1% of property value. The supplied reference figures are a 2025 Malaysian average house price of approximately RM 502,922 and over half of residential transactions below RM 300,000; these are not independently verified here.

| Property price | 0.1% fee | Concern |
| --- | --- | --- |
| RM 250,000 | RM 250 | Expensive for some first-home buyers, but potentially justified by avoided mistakes |
| RM 500,000 | RM 500 | Equivalent to RM 1,000/hour; needs a tangible report |
| RM 1,500,000 | RM 1,500 | Potentially acceptable to higher-budget clients |
| RM 5,000,000 | RM 5,000 | May seem unreasonable for 30 minutes |

### 3.2 Proposed bands, minimum and cap

Exact-price disclosure can be uncomfortable and a pure percentage creates extremes. Use bands:

| Property price | Proposed fee |
| --- | --- |
| Up to RM 300,000 | RM 199 |
| Over RM 300,000 up to RM 600,000 | RM 399 |
| Over RM 600,000 up to RM 1 million | RM 699 |
| Over RM 1 million up to RM 2 million | RM 1,199 |
| Over RM 2 million | RM 1,999 cap |

Urgent same-day/video consultation within two hours: proposed 50% surcharge. A 15-minute pre-signing follow-up for existing clients: half price. Each consultation includes a PDF and printed diagnostic card with risks, questions and next steps. Display fees clearly at the entrance and on the website. All amounts remain proposals until founder confirmation.

### 3.3 Lounge membership

Suggested RM 49–69/month or RM 490–690/year, undecided. Benefits: refreshments, informal adviser conversations, monthly market briefings and consultation discounts. The cost assumption is four visits at RM 8 each per month, or RM 32. Membership should feel exclusive through limited capacity, such as 300 members per store with a waiting list, rather than unequal service. The lounge is primarily an acquisition cost, with conversion to paid consultations as the objective.

## 4. Experience principles

1. Remember the visitor's preferred name and drink; the future app should support this.
2. Offer a chilled towel in the Malaysian heat.
3. Use a timber apothecary-style snack wall, with prescription-style labels such as `Rx · Kopi Tarik` and `Rx · Kuih Seri Muka`. Choose good local coffee and traditional cakes.
4. Produce diagnostic reports on thick letterpress card, with a handwritten adviser note.
5. Promise no sales pressure; a visitor can simply have coffee.
6. Consider a private entrance and consultation rooms for privacy.
7. Offer the same courtesy and tableware to clients across all property budgets.

## 5. Visual identity

### 5.1 Character

Quiet luxury; architectural; paper and stone; restrained; warm rather than cold; the clarity of a clinic with the warmth of a private lounge.

### 5.2 Colors

| Token | Hex | Use |
| --- | --- | --- |
| `--bone` | `#F4F1EA` | Main background |
| `--paper` | `#FBFAF7` | Secondary surfaces |
| `--ink` | `#1C1B19` | Primary text |
| `--stone` | `#8A857C` | Secondary text and fine rules |
| `--travertine` | `#D9CFBF` | Supporting surfaces |
| `--bronze` | `#8C6A43` | Sole accent; at most three placements per page |
| `--night` | `#141412` | Dark background |
| `--night-text` | `#EDE9E1` | Dark-mode text |

No purple/blue-purple gradients, neon, large pure-black/pure-white areas or glittering gold.

### 5.3 Type

Headings: Instrument Serif; original Chinese support: Noto Serif SC Light/Regular. Body: Geist Sans or Satoshi; original Chinese support: Noto Sans SC Regular. Numbers: Geist Mono. Use one heading scale and at most two body scales per screen. Heading range: 48–120px; primary body: 15–17px. Establish hierarchy with scale, not color.

### 5.4 Shapes and spacing

Corners: 0 or 2px, never 12–24px. Use 1px stone rules instead of card shadows. Follow an 8-point spacing grid, with at least 160px between desktop sections and 96px on mobile. Buttons are underlined text or outlined rectangles; only the primary booking CTA may be solid.

### 5.5 Motion

Ease: `cubic-bezier(0.22, 1, 0.36, 1)`; duration 600–1200ms. No bounce, spring overshoot, rotating entrances or universal fade-up. Motion serves only the brand signature and state feedback.

### 5.6 Anti-template checklist

Any prohibited item fails acceptance:

- No generic hero headline + subtitle + two buttons + three feature cards.
- No glassmorphism card grid.
- No purple-blue gradients, glowing borders or gradient text.
- No emoji or Lucide/Heroicons piled in front of feature lists.
- No site-wide Inter.
- No `rounded-2xl` + `shadow-lg` cards.
- No invented “Trusted by 10,000+ customers” claims.
- No testimonial carousel, FAQ accordion or newsletter box.
- No floating chatbot button.
- Use typography, negative space and a breathing line to establish refinement. For steps 1–2, the line remains static; animation belongs to step 3 onward.

### 5.7 The Pulse Roof

The sole graphic motif is an ECG-like line whose peak becomes a roof. The logo combines a 1.5px unfilled single line to the left of the `DR. PROP` wordmark. Use the same line across signage, business cards, reports, the website and app launch screen. The future website animation moves from flat line to heartbeat to roof to skyline with scrolling.

## 6. Store and signage

### 6.1 Signage

Halo-lit brushed-bronze letters against travertine or limewash, not a lightbox. Letter height stays below roughly a quarter of the frontage width. A small bronze plate shows fees and opening hours. Avoid poster-covered windows: show a table, a lamp and part of the apothecary wall in a quiet occupied space.

### 6.2 Space plan, approximately 80–120 square metres

- Reception: a long solid-wood table instead of a high counter; welcome guests alongside it and offer a towel.
- Lounge: low sofa and chairs, 2700K lighting, refreshments cabinet and a table with current market briefings.
- Two or three consultation rooms: frosted doors, round tables and a wall-mounted analysis screen.
- Urgent-call booth: approximately one square metre, soundproofed for video calls.
- Optional private entrance directly to consultation rooms.

### 6.3 Materials

Travertine, walnut, linen, brushed bronze and limewash. Avoid showy marble-and-gold styling or clinical white tiles and fluorescent lighting.

### 6.4 Inclusive comfort

Visible prices and an open view inside reduce hesitation. Local coffee and cakes feel familiar. Quiet materials and private rooms support dignity; capacity-limited membership creates exclusivity without unequal treatment.

## 7. Landing page

### 7.1 Stack

Vite + TypeScript + vanilla three.js; no React. Later: GSAP + ScrollTrigger and Lenis synchronized through the GSAP ticker. The original multilingual requirement was EN / Chinese / BM with JSON dictionaries; the user has replaced it with English-only for this delivery. Static hosting may later use Vercel, Netlify or Cloudflare Pages.

### 7.2 Five sections

Header: wordmark and booking CTA. Original language controls are superseded.

1. Hero: pre-signing reassurance, independence, no sales or commissions; future fluid and pulse background.
2. Three consultations: standard, urgent and final check, with large 01/02/03 numerals and plain text, no cards.
3. Fee calculator: property-price input to consultation fee; the page's only substantive interactive tool.
4. Lounge: one store photograph, membership explanation and capacity. Do not treat the brief's example “42 remaining” as verified availability.
5. Visit: address, hours and an external Google Maps link, not an embed.

Footer: disclaimer, SSM registration and privacy. One primary action: book a consultation through WhatsApp using a confirmed Malaysian number. No navigation menu, FAQ, blog or login.

### 7.3 Future WebGL scene

A fixed full-screen canvas has three layers:

**A — Ink fluid.** Adapt PavelDoGreat/WebGL-Fluid-Simulation and retain its MIT license. Use muted travertine, stone and bronze on bone; evoke ink on paper or coffee in milk. Increase density dissipation, decrease splat radius, disable bloom and sunrays. Inject only on pointer/touch movement and return to a clean frame after three seconds idle. Simulation resolution 64; dye resolution 512 desktop / 256 mobile.

**B — Pulse Roof.** Use three.js `Line2` and `LineMaterial`, 1.5px ink, approximately 512 vertices. A vertex shader interpolates shapes using ScrollTrigger-driven `uProgress`: 0.00 flat; 0.25 regular heartbeat at 1.2-second intervals; 0.50 single roof; 1.00 abstract skyline of terraces, apartments and detached houses. Do not draw identifiable buildings. Calculator input gently increases amplitude, which settles when typing stops.

**C — Grain.** A full-screen postprocessing pass with 3–5% film grain.

### 7.4 Performance and fallbacks

Cap pixel ratio at 1.5. Pause rendering while `document.hidden`. With reduced motion, do not load fluid and show a static roof. Without WebGL, retain bone background and an SVG pulse. Disable fluid for reported device memory below 4GB. Target mobile LCP below 2.5 seconds; render text before asynchronously initialized canvas. Import only necessary three.js modules; target total gzipped JavaScript below 250KB.

### 7.5 Copy direction

Hero: “Before you sign, see the doctor.” Independent property diagnosis; no sales, no commissions, on the client's side. Standard consultation: 30 minutes with the client's questions. Urgent: proposed video consultation within two hours. Final check: a 15-minute review before signing. Fees are transparent and capped; a written report is included. Lounge: coffee, local cakes and current market information; proposed 300 memberships per store. The brief suggests Petaling Jaya and Tuesday–Sunday 10:00–20:00, but neither is confirmed for publication.

Footer disclaimer: Dr Prop provides property information and analysis, not property sales, agency or valuation, and receives no transaction commissions. Diagnostic content is not legal, tax or financial advice.

### 7.6 Reference projects

| Project | Purpose | License stated in supplied brief |
| --- | --- | --- |
| PavelDoGreat/WebGL-Fluid-Simulation | Fluid core | MIT |
| mrdoob/three.js | Rendering and Line2 | MIT |
| darkroomengineering/lenis | Smooth scroll synchronization | MIT |
| ruucm/shadergradient | Noise algorithm reference only, not React component | Check repository |
| JosephASG/codrops-cinematic-scroll-animations | Scroll-driven camera structure | MIT |
| aqro/gooey-hover-codrops | Lounge photograph noise reveal reference | Codrops terms; no unchanged resale |
| codrops/LiquidDistortion | Liquid-transition reference | Codrops terms |
| oframe/ogl | Possible lighter rendering alternative | Unlicense |

Verify relevant licenses when actually integrating these projects. None of these rendering libraries is part of steps 1–2.

## 8. Mobile app — future scope

### 8.1 Stack

Expo + React Native + Expo Router + TypeScript. Skia for pulse and membership-card shader; Reanimated for gestures/transitions; expo-haptics for feedback; expo-sensors gyroscope for card reflections. Phase one is frontend with mock data; Supabase is suggested for phase two. Future payments: FPX, Touch 'n Go, GrabPay and cards through a local gateway such as Billplz, iPay88 or Stripe MY.

### 8.2 Information architecture

Exactly three tabs: Home, Records, Me.

### 8.3 Screens

- S0 launch: bone background, line draws left to right over 800ms, peak becomes a roof, wordmark fades in.
- S1 first login: phone + OTP only; then ask how the client prefers to be addressed. No password, social login or long form.
- S2 home: time-based personal greeting, one solid “Start a consultation” button, lounge quietness/free seats, today's coffee and a link to the membership card. No banners, recommendation lists or notification clutter.
- S3 booking, at most four screens: type; property price band and optional SPA/brochure/screenshot attachment; date/time or urgent callback information; fee confirmation and payment. Success triggers a success haptic and one pulse.
- S4 records: chronological date, property shorthand, consultation type and status. Detail includes report PDF, adviser notes, questions and follow-up booking. Empty state: “No records yet. A clean bill of health.”
- S5 membership: full-screen portrait card on night background with pulse roof, monospaced member number and name. Very subtle brushed-metal sheen responds to gyroscope tilt. Check-in QR below.
- S6 Me: preferred name/drink, membership/renewal, language and logout. Reception should be able to see drink preferences.

### 8.4 Mock data models

`User`: id, phone, displayName, optional drinkPreference, language. Original language values: en, zh, ms.

`Membership`: userId, storeId, memberNo, status (active/waitlist/expired), renewsAt.

`Consultation`: id, userId, type (clinic/urgent/review), priceBand (lt300k/300k-600k/600k-1m/1m-2m/gt2m), fee, optional scheduledAt, status (booked/done/cancelled), optional reportUrl and advisorNote, attachments array.

`Store`: id, name, address, hours, memberCap, memberCount, loungeSeatsFree, todaysCoffee.

### 8.5 App design

Reuse all brand tokens, 0–2px corners and fine rules. Support night/night-text dark mode. Original roadmap includes three languages. Touch targets at least 44×44pt. No bottom-sheet advertisements, rating prompts or marketing push messages.

## 9. Motion reels and 3D — future scope

### 9.1 Principles

Reuse Pulse Roof, tokens and 3D models across the site, app, reels and store screens; shared models belong in `/brand/3d/*.glb`. Content teaches and explains rather than sells. Use calm openings, slow camera movement, space and a good question instead of noisy hooks.

### 9.2 Reel series

| ID | Series | Duration | Format and purpose |
| --- | --- | --- | --- |
| R1 | The Pulse | 7 / 15 sec | Bronze pulse on travertine becomes roof and wordmark; brand identifier/outro |
| R2 | Case of the Week | 30–45 sec | Clay house + typography; anonymous SPA, leasehold and sinking-fund topics |
| R3 | Five Things Before You Sign | 15–30 sec | Typography and pulse reveal checklist; final-check awareness |
| R4 | What Is the Fee? | 15 sec | Property-price and fee numbers; transparent pricing |
| R5 | Monthly Market Pulse | 20–30 sec | Public data such as NAPIC as heartbeat; show source/date |
| R6 | A Lounge Moment | 10–15 sec | Pre-opening 3D, later real footage of towel, cabinet and coffee |
| R7 | Store Reveal | 20 sec | Digital-twin camera move from entrance through lounge to room |
| R8 | Membership Card | 7–10 sec | Slow metal-card turn with engraved number |

### 9.3 Scenes

3D-1: extruded brushed-bronze Pulse Roof sculpture on travertine, soft side light/shallow depth of field, for R1/OG/app still.

3D-2: generic terrace/apartment/detached clay houses, bronze highlights on problem areas, for R2/R3. Never recognizable developments.

3D-3: store digital twin based on an actual plan, travertine/walnut/linen/2700K lighting, for R7, pre-photo lounge imagery and design coordination.

3D-4: walnut apothecary drawers with brass handles and paper labels, for R6.

3D-5: dark brushed-metal membership card with engraved number and restrained moving light, for R8/app reference.

3D-6: silent store-screen loop of 3D-1 and monthly market pulse.

### 9.4 Production pipelines

A: Remotion + @remotion/three, React Three Fiber inside ThreeCanvas, frame-driven animation to MP4. Suitable for R1–R5 and R8, with data-driven language variants. The supplied brief describes Remotion as source-available, free for individuals and companies of up to three people, paid for larger teams; verify current terms before use. Motion Canvas (MIT) is a possible 2D-only alternative for R3/R4.

B: Blender + Cycles for refined light and store scenes, particularly R6/R7 and 3D-3. Python bpy scripts can build basic walls, furniture and cabinets, then a designer refines materials/light. Export GLB to `/brand/3d/` for reuse.

### 9.5 Outputs

- Vertical reels: 1080×1920, 9:16, 30fps or 60fps for slow 3D.
- Feed: 1080×1350, 4:5, recompose rather than crop.
- Store screens/YouTube: 1920×1080, 16:9, 30fps.
- H.264 MP4, AAC audio, approximately -14 LUFS master.
- Supplied conservative safe-zone guidance: no text in top 14% (~270px) or bottom 35% (~670px); reserve around 230px at lower right and 65px at each side. The stated usable centre is approximately 950×980px. Check platform requirements at production time.
- Add a `showSafeZone` debugging overlay. Render each language separately rather than stacking subtitles. English-only supersedes multilingual delivery for the current work.

### 9.6 Visuals and sound

Instrument Serif / Noto Serif SC captions; static/fading appearances. No word-by-word bounce, yellow outlined type or emoji stickers. Only fades and camera movement, without whoosh transitions, flashes or glitches. Reuse bone/night palettes. Commission a rights-cleared sound logo: soft heartbeat and wood tap or single piano note. Use commercially licensed or original music. Calm adviser narration is preferable to excited synthetic sales voices. No stock handshakes, key handovers or smiling-suit footage.

### 9.7 Content safeguards

Anonymize cases; comply with PDPA 2010 and get written consent for real clients on camera. Avoid naming developers/projects in criticism and recommending specific units. State market-data source and date. End educational reels with “General information, not personal advice.”

### 9.8 Future implementation structure

`/reels/remotion.config.ts`: ANGLE Chromium OpenGL renderer.

`/reels/src/tokens.ts`: import shared brand tokens.

Components: PulseLine (SVG flat/beat/roof/skyline interpolation), PulseRoof3D, ClayHouse (terrace/condo/bungalow and highlighted roof/title/facade), Apothecary, MemberCard3D, SafeZoneOverlay, Caption.

Compositions: BrandPulse, CaseOfWeek, BeforeYouSign, FeeReveal, MarketPulse, LoungeMoment, StoreReveal, MemberCardReveal. CaseOfWeek receives language, hook, lines, house type and highlight. MarketPulse receives language, labeled series, source and date. StoreReveal loads store.glb with a procedural fallback.

Data: `/reels/src/data/cases/*.json` and `/reels/src/data/market/*.json`. Render script: `/reels/scripts/render-all.ts`, output `/out/{composition}-{lang}-{ratio}.mp4`. Blender scripts: `/blender/build_store.py` and `build_apothecary.py`.

Future acceptance: render all compositions/languages/ratios with one command; new cases require only JSON; all text stays inside safe zones; missing models do not interrupt rendering; follow §5.6 and §9.6.

## 10. Execution order

1. Establish `/brand`: CSS/TS tokens, font loading, Pulse Roof SVG paths.
2. Static landing page without WebGL: typography, language support, responsive layout, WhatsApp CTA, fee calculator. Current delivery is English-only.
3. Add Layer B, ScrollTrigger and Lenis.
4. Add recolored Layer A and Layer C.
5. Performance fallbacks and mobile Lighthouse testing.
6. Expo skeleton: three tabs, routes and tokens.
7. S0/S2/S3 with mock data.
8. S5 with Skia and gyroscope.
9. S4 and S6.
10. Shared 3D-1/2/4/5 GLBs or R3F components.
11. Remotion R1 and SafeZoneOverlay, then R2/R4/R5.
12. Blender store generation and GLB integration into R7/site.
13. Batch rendering by language and aspect ratio.
14. README for local development/deployment, replacing contact/store details and adding reel episodes.

General acceptance: no §5.6 violations; smooth landing-page scrolling on a midrange Android such as a 4GB device; complete usable site without WebGL; app booking within four screens. This delivery does not claim physical Android performance or app acceptance. A minimal README is included for handoff of steps 1–2, not execution of later implementation phases.

## 11. Founder decisions still required

- Final English/Chinese names after trademark, SSM and domain checks.
- Legal service boundaries and possible registered REA/valuer participation.
- Final fees and urgent surcharge.
- Membership price and per-store cap.
- First-store address and opening hours.
- WhatsApp Business number.
- Store photographs or approved pre-opening render.
- Store plan and dimensions for the digital twin.
- Team size for Remotion licensing.
- Commissioned sound logo and music.
- Priority social platforms.

## Original reference list

These links were supplied with the original brief, not independently validated for this delivery:

- [SSM company-name guidance](https://www.ssm.com.my/Pages/Legal_Framework/Document/GARIS%20PANDUAN%20NAMA%20SYARIKAT%20(BI)_140726.pdf)
- [Act 242 and buyer-consultancy discussion](https://emerhub.com/malaysia/real-estate-agency-setup-malaysia/)
- [BOVAEP fees](https://lpeph.gov.my/fees)
- [2025 house-price reference](https://www.vyrox.com/analysis/ai_impacted_residences_property_market)
- [H1 2025 transaction reference](https://www.myrumahbaru.com/blog/napic-1h-2025-report-malaysia-s-property-market-at-a-crossroads)
- [Remotion licensing](https://www.remotion.dev/docs/license-pricing-compliance/faq)
- [Remotion Three](https://remotion.dev/docs/three)
- [Motion Canvas](https://github.com/motion-canvas/motion-canvas)
- [Reels safe-zone reference](https://www.hopperhq.com/blog/instagram-reel-size/)
