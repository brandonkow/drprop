# Backend (`supabase/`)

Phase two of the app (brief §8.1): phone sign-in by SMS, profiles, adviser
availability, bookings, membership and the Lounge board, on Supabase. The app
still runs on local mock data unless it is built in supabase mode.

Nothing here has been applied to a hosted project, and no SMS has been sent.

## What the database enforces

`migrations/202610070001_core.sql` is additive: one private schema and `dp_`-prefixed tables.

- **Row-level security on every table.** A client reads only their own profile,
  bookings and membership. An adviser reads only their own slots and the bookings
  assigned to them, plus urgent call-backs nobody has taken. Nobody writes to a
  table directly: every change is a database function that derives the caller from
  `auth.uid()` and requires a verified phone.
- **Fees come from the server** (brief §3.2). `dp_quote` uses the confirmed price
  for the band: urgent +50%, pre-signing review half price, whole ringgit rounded up,
  the same rule as `brand/pricing.ts`. A booking states the fee the client saw. If it
  differs from the server's, the booking is refused and the client is asked to check the new fee.
- **No double booking.** A slot holds one active booking (unique index). A client
  holds at most three upcoming bookings and never two at once. Publishing and
  booking lock the adviser, so availability can't change mid-booking.
- **Retries are safe.** The app sends a request ID. Repeating it returns the same
  booking; reusing it with different details is refused.
- **Urgent consults are call-backs** (brief §8.3: "an advisor calls within two
  hours"). They have no slot, are taken only on open days within the urgent hours in
  `dp_settings`, and any active adviser can take one (`dp_take_urgent`).
- **A pre-signing review** follows the client's own finished consult, in the same band.
- **Advisers write the note and questions** the client sees in Records
  (`dp_adviser_note`). Brief §2 still applies: a diagnosis, never a valuation or a unit recommendation.
- **The front desk sees the client's drink** with each booking (brief §4.1).
- **Fresh installs take no bookings.** `bookings_enabled` is false and no price is
  confirmed until the operator says so.
- **No payment yet.** Every booking is `unpaid`. Payment (FPX, Touch 'n Go, GrabPay,
  cards via a local gateway) is the next step; until then the app says so.

## Setting up a project

1. Apply the migration with your migration workflow (`supabase db push`, or the SQL
   editor on a new project). Don't reset a shared database. Then reload the API schema
   cache: `notify pgrst, 'reload schema';`.
2. Turn on phone sign-in and an SMS provider in Supabase Auth. Set code expiry, rate
   limits and a spending cap. Decide on CAPTCHA before a public launch: the app has a
   60-second resend wait, not bot protection.
3. Add advisers from their verified Auth user IDs, through an operator connection:

   ```sql
   insert into public.dp_staff (user_id, display_name, enabled)
   values ('REPLACE_WITH_ADVISER_AUTH_UUID'::uuid, 'Adviser name', true);
   ```

   Disable one with `update public.dp_staff set enabled = false where user_id = ...`.
   They then lose availability, bookings and client contacts. Their bookings stay in the history.
4. Confirm the fees and hours with the founder (brief §11), then open bookings:

   ```sql
   select band, standard_minor from public.dp_prices order by standard_minor; -- sen
   update public.dp_prices set confirmed = true;
   update public.dp_settings set bookings_enabled = true, urgent_from = '10:00', urgent_until = '18:00', closed_isodow = 1;
   ```
5. Members are added by the operator (the cap is a business rule, brief §3.3):

   ```sql
   insert into public.dp_memberships (user_id, member_no, status, renews_at)
   values ('CLIENT_AUTH_UUID'::uuid, 'PJ-0001', 'active', '2027-10-31');
   ```
6. Build the app against the project: copy `app/.env.example` to `app/.env`, set
   `EXPO_PUBLIC_APP_MODE=supabase`, the project URL and the **publishable** key, and
   rebuild with `--clear`. Never put a secret or service-role key in the app. A build
   with a missing or unsafe setting shows "Setup required" and never falls back to the preview.

## In the app

| Screen | Supabase mode |
|---|---|
| Sign-in | A real SMS code, with a 60-second wait before resending. A returning client skips the name question. |
| Home | The Lounge board as the front desk last set it. |
| Booking | Published adviser times, the server's fee, "Request this time". Urgent: "Request the call", only when call-backs are open. No payment is taken. |
| Records | Requested → confirmed → done, the adviser's note and questions, cancel before the start. |
| Me | Name, drink and language saved to the profile; membership from the operator; "Adviser schedule" for advisers. |
| Adviser schedule | Take call-backs, confirm and finish consults, write notes and questions, open 30-minute times (Malaysia time), set the Lounge board. |

Sessions: on phones the session sits in the keychain (this device only), split into
small chunks so it fits the keychain's limits. A failed write keeps the old session.
On the web it is kept in this tab's sessionStorage. No client records are cached on the device.

## Tests

`npx vitest run supabase app/test`:

- `supabase/test/core.test.ts` runs the migration in PGlite (Postgres in-process)
  with a stand-in for Supabase Auth. It checks reading and writing rights, staff
  isolation, the opening gates, fees, tampering, slot conflicts, retries, overlaps,
  the three-booking cap, cancellation, urgent call-backs, reviews, the booking
  lifecycle, notes, membership and the Lounge board.
- `app/test/backend.test.ts` checks the config gate, session chunking, Malaysia
  time, the row mapping, phone numbers and error messages.

PGlite is a single connection: the tests don't prove locking under concurrent
connections. Before launch, on the real project:

- Check grants, the functions and row security through the real API.
- Check real SMS delivery: wrong and expired codes, resend, sign-out, provider limits.
- Race two clients for one slot (one wins), one client for two overlapping times,
  and two advisers taking the same call-back.
- Test the keychain session on real Android and iOS phones, including resuming the app.

The schema follows Codex's earlier design (the `feat/brand-static-landing` branch),
adapted to the brief: call-back urgent consults, whole-ringgit fees, languages,
drinks, membership, notes and the Lounge board.
