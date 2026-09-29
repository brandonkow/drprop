# Authentication and scheduling backend

This increment adds connected phone authentication and adviser scheduling to the English app. It stays on `feat/brand-static-landing`; no hosted migration, SMS delivery, main change or deployment has been performed.

## App modes

The default remains the independent preview. To configure a connected build, copy `app/.env.example` to `app/.env` and set:

```dotenv
EXPO_PUBLIC_APP_MODE=supabase
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_PUBLIC_KEY
```

Rebuild with `npm --prefix app run export:web` or `export:native`. These commands clear Metro's transform cache so a prior export cannot retain a different app mode. Expo public environment variables are bundled into the app. For custom export commands, always use `--clear` after changing mode or backend configuration. Use only a publishable key; never include a service-role key, database password or SMS provider secret. HTTPS is required except for localhost development. Invalid configuration displays a setup error and cannot enter the preview as a fallback.

Connected mode provides verified SMS sign-in, a private profile, Home/Records/Me, four-screen booking, customer cancellation and an adviser schedule. A booking begins as **requested / unpaid**, reserves a published slot and needs the assigned adviser's confirmation. There is no payment collection in this increment. Real uploads, reports, membership renewal and check-in are not presented as operational features. Preview data is never imported into the connected account.

## Deployment-owner setup

1. Choose or confirm the Supabase project. Inspect the target catalog before applying the additive `supabase/migrations/202609300001_auth_scheduling.sql` through the existing migration workflow. The `dp_` prefix avoids common table names, but it is not proof the target has no conflicts. Do not reset a shared database. Refresh the PostgREST schema cache after applying new functions (for example, `notify pgrst, 'reload schema';` through the operator connection).
2. Enable phone authentication and configure the SMS provider in Supabase. Set appropriate expiry, rate limits and spending limits; verify sign-in and resend behavior against the provider. CAPTCHA and native challenge handling need a deployment-specific decision before a public SMS launch. The current client has a resend cooldown, not a bot-protection guarantee.
3. Provision advisers from verified Auth user IDs through a privileged operator connection. Client metadata cannot create staff access. Staff can publish and close their own 30-minute slots, review assigned customer contact details, confirm/cancel appointments and complete confirmed consultations after they end.
4. Confirm business readiness and the fees. Fresh installations have `bookings_enabled=false` and all price rows unconfirmed. Enable them only after the operator approves the real service terms and amounts.
5. Build with the public URL/key and run hosted acceptance below. The account keys and provider credentials were not supplied or guessed during implementation.

Operator examples, deliberately containing a placeholder UUID:

```sql
-- Replace with an actual phone-verified adviser auth.users.id.
insert into public.dp_staff(user_id, display_name, enabled)
values ('REPLACE_WITH_VERIFIED_ADVISER_UUID'::uuid, 'APPROVED_ADVISER_NAME', true);

-- Review all amounts in minor units (sen) before enabling bookings.
select band, standard_minor, confirmed from public.dp_prices order by standard_minor;
-- After the operator approves the amounts and service readiness:
update public.dp_prices set confirmed = true;
update public.dp_settings set bookings_enabled = true where id = true;
```

Disable a staff member with `update public.dp_staff set enabled=false where user_id=...`; customer data and scheduling RPC access are then denied to that staff account. Existing bookings remain in the audit trail for operational follow-up. Closing one published slot requires cancelling its active booking first.

## Data and authorization

Every new public table enables row-level security and revokes default anonymous/client write access. Profiles are readable by their owner. Bookings are readable only by the customer or active assigned adviser. Unassigned advisers cannot see customer bookings or contact details. Staff assignments, service readiness, pricing and audit events are operator-controlled.

Mutations use explicitly granted PostgreSQL functions with a fixed empty search path. Functions verify the caller's Auth phone confirmation and derive identity from `auth.uid()`. They do not accept a client-selected customer or adviser identity. Fees are calculated on the server from confirmed prices, including urgent and eligible final-check multipliers, in integer sen. A changed fee requires a fresh reviewed quote.

Publishing serializes against an adviser row and rejects overlapping intervals. Booking locks the customer profile, adviser and slot, checks a three-upcoming-booking limit and customer overlaps, and uses a unique active-slot index. A caller-provided UUID makes an identical retry return the existing record; reusing it with different details fails. Cancelled bookings remain historical records, while their slot becomes available again. Final checks require the caller's own completed non-review consultation in the same price band.

Appointments are real published slots; there are no generated fallback times. Urgent appointments must start within two hours. Slots are 30 minutes, including a reserved slot for a shorter final-check conversation. The adviser publishes explicit Malaysia times; device timezone does not alter them. Customer lists show the latest 100 records; staff lists show the latest 200 assigned records and up to 200 future slots. Pagination is a later operational enhancement.

## Session handling

Native sessions use Expo SecureStore with device-only keychain accessibility. Chunking avoids native value-size limits, preserves Unicode and switches the saved index only after every chunk is written. A failed write retains the prior complete value. Web sessions use tab-scoped sessionStorage and clear on sign-out; they remain readable by JavaScript, so deployed web CSP and dependency controls matter. No customer record cache is persisted by backend mode.

Auth refresh runs while the native app is active, and subscriptions are removed on unmount. The app checks `getUser()` before loading its workspace; database policies and RPC checks remain the authorization boundary. Logout clears the current device session while retaining server records. New sign-ins receive an independent workspace instance.

## Local verification

```sh
npm --prefix backend ci
npm --prefix backend test
npm --prefix app ci
npm --prefix app test
npm --prefix app run typecheck
```

Database tests execute the actual migration in PGlite, with a minimal local Auth schema and explicit `anon`/`authenticated` roles. They check ownership, staff isolation, readiness gates, fee tampering, slot conflicts, retries, overlapping customer bookings, cancellations and lifecycle transitions. PGlite is a single-connection PostgreSQL runtime: these tests do not prove multi-connection lock behavior on a hosted Supabase instance.

Connected browser tests use an HTTP fixture and deliberately invalid test tokens. They make no real SMS calls and are not evidence of hosted authentication. To reproduce, export a test-only build with these variables in that command's environment:

```dotenv
EXPO_PUBLIC_APP_MODE=supabase
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_local_fixture_only
```

From `app/`, run `npx expo export --platform web --clear --max-workers 1 --output-dir dist-backend-qa`. From the repository root run `npx playwright test --config playwright.backend.config.ts`. Never deploy this fixture build. Preview regression tests use a separate normal preview export.

## Hosted acceptance still required

- Run the migration against the intended project and verify grants, RPC execution and RLS through its actual Data API.
- Verify actual OTP delivery, invalid/expired codes, refresh, account separation, logout, provider limits and the public SMS abuse controls.
- Race two authenticated connections for one slot: exactly one distinct customer succeeds. Race overlapping appointments for one customer and overlapping slot publication for one adviser.
- Verify the actual confirmed fees, published staff availability and operational cancellation/confirmation procedures.
- Test native SecureStore, app resume, background refresh and UI navigation on target Android/iOS devices. Native JavaScript export is not a signed build or device test.
- Add payment collection/webhooks, private documents/reports and membership/check-in as subsequent increments. Unpaid records must never be interpreted as settled payments.

Implementation references: [Supabase phone authentication](https://supabase.com/docs/guides/auth/phone-login), [React Native authentication](https://supabase.com/docs/guides/auth/quickstarts/react-native), [database functions](https://supabase.com/docs/guides/database/functions), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/) and [PGlite](https://pglite.dev/docs/), consulted 2026-09-30.
