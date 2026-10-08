# Decisions still open

Everything that could be built without you is built and tested. These are the
items left, each waiting on a decision, an account, or a person outside the
code. For each: what the code assumes today, the options, my recommendation,
and what follows once you decide. Tick them off as you go.

## 1. Business decisions (brief §11)

| | Decision | Assumed today | Options | Recommendation | After you decide |
|---|---|---|---|---|---|
| [ ] | **Consult fees** | By property price: below RM 300k RM 199; RM 300k–600k RM 399; RM 600k–1m RM 699; RM 1m–2m RM 1,199; above RM 2m RM 1,999. Urgent +50%, pre-signing review half price. | Keep, or change any band or rule | Keep for launch: simple, and it's already on the website, app, reels, door plate and sample report | Change `brand/pricing.ts` and `dp_prices` in the database; re-run `npm run print -w @drprop/brand` (door plate) and re-render the fee reel |
| [ ] | **Opening hours** | Tue–Sun 10:00–20:00, closed Monday; urgent call-backs 10:00–18:00 | Any hours | Confirm against the lease and staffing | `web/src/config/site.ts`, `dp_settings`, the adviser screen's time grid, the door plate |
| [ ] | **Lounge membership** | 300 places per store, one price for everyone; no price shown anywhere yet | Price per month or per year; cap per store | Annual price, cap 300 (the reels already say "300 members per clinic") | Add the price to the terms page and the app; membership payments come with payments (§3) |
| [ ] | **Refund rule** | Free moves up to 24 hours before; full refund for cancelling more than 24 hours before; your choice of new time or refund if you move it | Keep, or stricter (e.g. 48 hours) | Keep: clear and fair | Terms page text, three languages |
| [ ] | **Brand name** | "Dr Prop" / DR. PROP everywhere | Keep, or change after the checks | Search MyIPO (trademark), SSM and the domain before printing anything | A name change touches the logo, website, app, reels and print: one pass |
| [ ] | **REA or registered valuer as partner/adviser** (brief §2.6) | None; the service is information and analysis only | Bring one in, or not | Ask the lawyer (§4) first; it changes what you may say | Copy changes on the website and terms if you do |
| [ ] | **First store: shophouse or mall** | Website and most imagery show the Petaling Jaya shophouse; mall concept imagery exists too | Shophouse, mall, or both later | Decide with the lease; then send me the measured floor plan | Floor plan into `blender/store.config.json`; re-render the store model, twin, and store reveal reel |
| [ ] | **Social platform priority** | Reels exist in 9:16, 4:5 and 16:9 | Instagram, TikTok, Xiaohongshu, Facebook | Instagram + TikTok first (9:16), feed posts 4:5 | None: post from `reels/delivered/` and `brand/renders/ai/social/` |
| [ ] | **Reel languages** | English only (your call, 2026-10-08); Chinese and Malay copy kept in the code | Stay English, or add Chinese/Malay later | Add Chinese if Xiaohongshu becomes a priority | `npm run render:all -- --lang zh,ms`; the store reveal takes about 2½ hours more per language set |

## 2. Accounts to open (each unlocks code work)

| | Account | Unlocks | Cost (approx.) | What I'll do with it |
|---|---|---|---|---|
| [ ] | **Supabase project** + an SMS provider (e.g. Twilio, Vonage) | Real sign-in by SMS, bookings, advisers, check-in | Supabase free tier to start; SMS per message | Apply the two migrations, set grants, run the live tests (race tests, SMS codes), switch the app to supabase mode |
| [ ] | **Payment gateway** (e.g. Billplz, iPay88, Stripe Malaysia) | FPX, Touch 'n Go, GrabPay, cards; paid bookings and memberships | Per-transaction fees | Payment flow in the app, payment status in the database, receipts |
| [ ] | **Domain + website hosting** (e.g. Cloudflare Pages, Netlify, Vercel) | Going live | Domain ~RM 50–100/year; hosting free tier | Set `origin` and the real details in `site.ts`; the build refuses to ship with placeholders |
| [ ] | **Expo account + Apple Developer + Google Play** | App Store and Play Store builds | Apple USD 99/year, Google USD 25 once | EAS builds, store listings, push to TestFlight / internal testing |
| [ ] | **Front desk device** | Check-in | A tablet, or a phone; optional USB/Bluetooth QR scanner | Nothing more to code: the adviser screen scans with the camera, a scanner, or typed digits |

## 3. Details I need from you

| | Detail | Where it goes |
|---|---|---|
| [ ] | WhatsApp Business number | `web/src/config/site.ts` |
| [ ] | Street address and Google Maps link | `site.ts`, the app's store details, the door plate |
| [ ] | SSM registration number | `site.ts` (website footer, terms) |
| [ ] | A photo of the real store | Replaces the concept render on the website (`store.image`, `kind: 'photo'`) |
| [ ] | Adviser names and phone numbers | Added to the database as staff once the Supabase project exists |

## 4. People to review

| | Who | What | Why |
|---|---|---|---|
| [ ] | **Malaysian lawyer** | Terms, privacy page, the diagnosis disclaimer (all three languages); the Act 242 service boundary | The liability clause and "information, not advice" must hold up |
| [ ] | **Native speakers** (English and Malay) | Website, app, reels, terms | Written by me; needs a local ear |
| [ ] | **An adviser + the lawyer** | The sample diagnosis report (`brand/print/`) | Before it becomes the house format |

## 5. Media and print

| | Item | Today | Next step |
|---|---|---|---|
| [ ] | Sound logo | Placeholder (`brand/audio/sound-logo.wav`) | Commission one with full rights; same name, 2.5 s |
| [ ] | Product film music | Synthesised placeholder | License or commission a track |
| [ ] | Remotion licence | Free while the team is under four people | Company licence once you reach four (brief §9.4) |
| [ ] | Letterpress diagnosis card | Artwork ready (`brand/print/out/diagnosis-card-*.pdf`) | Choose printer and cotton stock; they add bleed |
| [ ] | Door fee plate | Artwork ready (`brand/print/out/fee-plate.pdf`, 300 × 400 mm) | Etch in brushed bronze after fees and hours are final |
| [ ] | AI concept imagery | Labelled as concepts (`brand/renders/ai/`) | Replace with real photos once the store is built |

## 6. Testing that needs real phones

| | Test |
|---|---|
| [ ] | Website scrolling on a mid-range Android (4 GB): the one acceptance item still open (`docs/acceptance.md`) |
| [ ] | Member card: tilt sheen, motion permission denied, no sensor |
| [ ] | Booking haptics, document picker, keyboard over inputs |
| [ ] | Camera check-in at the desk from a member's phone screen (low and high brightness) |
| [ ] | With the Supabase project: SMS sign-in, wrong and expired codes, resend, leaving and resuming the app, sign-out |

## 7. Housekeeping

| | Item |
|---|---|
| [ ] | Delete the `claude/modest-ritchie-e7pjr3` branch on GitHub once this session ends (`main` has everything) |
| [ ] | Watch the first CI runs (GitHub → Actions → Checks); every push to `main` now runs all checks |
| [ ] | Known dependency advisories in Expo's build tooling (braces, node-forge, decode-uri-component): no fix released yet; update Expo when one ships |
