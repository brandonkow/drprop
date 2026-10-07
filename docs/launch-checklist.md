# Before launch

What the code can't settle on its own. Each item names who decides and where it goes.

## Founder decisions (brief §11)

- [ ] Fees: confirm the five bands, urgent +50% and review half price (`brand/pricing.ts`; in the database, `dp_prices`).
- [ ] Opening hours and urgent call-back hours (`web/src/config/site.ts`; `dp_settings`).
- [ ] Lounge membership price and the cap per store (brief §3.3). The terms page avoids a price until then.
- [ ] Refund rule: the terms page proposes free moves up to 24 hours before and full refunds for cancellations more than 24 hours before. Confirm or change it.

## Legal review (brief §2)

- [ ] A Malaysian lawyer reads the terms (`/terms/`), privacy (`/privacy/`) and the diagnosis disclaimer, in all three languages. Pay most attention to the liability clause.
- [ ] Confirm the service boundary under Act 242: information and analysis for buyers, no agency, no valuation, no unit recommendations.
- [ ] Register the business; put the SSM number in `site.ts`.

## Real details (`web/src/config/site.ts`)

- [ ] WhatsApp Business number, street address, Google Maps link, SSM number.
- [ ] Set `origin` last. The build refuses to ship with any placeholder left.
- [ ] Photograph the store and replace the concept render (`store.image`, `kind: 'photo'`).

## Language

- [ ] A native speaker reviews the English and Malay copy: website, app, reels, terms.

## Phones (the app has only been checked in browsers and bundlers)

On a mid-range Android phone (4 GB) and a recent iPhone:

- [ ] Member card: the Skia sheen follows the tilt; it still works if motion permission is denied or the sensor is missing; nothing runs in the background.
- [ ] Haptics on booking; the document picker; the keyboard over every input.
- [ ] Supabase mode: SMS sign-in, wrong and expired codes, resend, leaving and resuming the app (the session sits in the keychain), sign-out.
- [ ] Website scrolling and the ink effect on the Android phone.

## Backend (see `supabase/README.md`)

- [ ] Apply the migration to the real project; check grants and row security through the API.
- [ ] SMS provider limits, spending cap, CAPTCHA decision.
- [ ] Race tests on the real database: two clients for one slot; two advisers for one call-back.
- [ ] Add advisers and members; confirm prices; open bookings.
- [ ] Next phase: payments (FPX, Touch 'n Go, GrabPay, cards), private report PDFs, check-in.

## Print (`npm run print -w @drprop/brand`)

- [ ] The diagnosis report template (`brand/print/`): an adviser and the lawyer read the sample, in all three languages, before it becomes the house format.
- [ ] Letterpress card: choose the printer and the stock (thick cotton, one ink); they add bleed to `diagnosis-card-*.pdf`.
- [ ] Door fee plate: etch `fee-plate.pdf` into brushed bronze at 300 × 400 mm, after the fees and hours are final.

## Media

- [ ] Commission the sound logo with full rights; replace `brand/audio/sound-logo.wav` (same name, 2.5 s).
- [ ] Licensed or commissioned music for the product film (`brand/audio/promo-score.m4a` is a synthesised placeholder).
- [ ] Remotion company licence once the team has four or more people (brief §9.4).
- [ ] Before publishing a reel, run `npm run verify:media -w @drprop/reels` on it and watch it through once.
