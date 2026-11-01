# Stripe provider checkpoint

The user selected Stripe on 2026-10-29 and asked to pause the build after the
provider integration. This checkpoint implements **test-mode integration**. It
does not enable live charging, automatic refunds, subscriptions or production fulfilment.

## Implemented

- A persisted test order per booking, with the fee read from the server's booking
  record, fixed MYR currency and owner-only RLS. Client amounts and redirect URLs
  are ignored. Disabled/banned identities and cancelled bookings cannot start checkout.
- Stripe SDK 23.0.1, hosted Checkout, English locale, card-only test filtering,
  fixed expiry and stable order-derived idempotency keys. Return URLs come from a
  trusted operator-configured app origin. Only `sk_test_` keys are accepted.
- The authenticated `stripe-checkout` function is disabled unless
  `DP_STRIPE_TEST_ENABLED=true`. No payment SDK or secret key enters the app bundle.
- `stripe-webhook` verifies the exact raw body with Stripe's SDK and a five-minute
  signature tolerance. It retrieves the current session from Stripe, requires
  paid status, checks amount/currency/order/session/mode, and commits an idempotent
  event record. Invalid signatures and failed settlement are not acknowledged as success.
- A return from Checkout cannot settle an order. Duplicate callbacks do not create
  duplicate payments. A payment arriving after cancellation becomes
  `review_required`. No refund rule is invented.
- Sandbox settlement does not mark actual bookings or memberships paid.
- A connected-app test panel exists behind `EXPO_PUBLIC_STRIPE_TEST_ENABLED=true`.
  It labels sandbox actions explicitly and refreshes the verified order status.
  Normal preview/connected builds leave this opt-in unset and collect no money.

## Staging setup after resumption and authorization

Apply all migrations in order in an authorized staging project. Configure the
Edge environment with Supabase platform credentials and:

```text
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
DP_APP_ORIGIN=https://your-authorized-staging-app-origin
DP_STRIPE_TEST_ENABLED=true
```

These are server secrets. `DP_APP_ORIGIN` must be an origin without a path, user
info or query. HTTPS is required except localhost/127.0.0.1. The app only needs the
existing Supabase publishable configuration and, for explicit staging builds,
the `EXPO_PUBLIC_STRIPE_TEST_ENABLED` opt-in. Do not put a secret in public variables.

Both functions use `verify_jwt=false` in Supabase configuration: checkout verifies
the account with Auth; the webhook verifies Stripe signatures. Subscribe only to
`checkout.session.completed` and `checkout.session.async_payment_succeeded` for
this checkpoint. Other event types are acknowledged as ignored and are not a
refund, dispute or subscription lifecycle implementation.

## Retry and reconciliation boundaries

Retries within the creation window reuse the same stored order and Stripe
idempotency key. A session already attached to the order is retrieved instead of
recreated. A webhook can settle an order even if its checkout-attachment response
was lost, provided the verified session matches the stored order.

The fixed checkout expiry is one hour after order creation. When fewer than
30 minutes remain, an unattached order requires operator reconciliation rather
than blindly creating another checkout. Closed/expired sessions also require
reconciliation. This prevents a new charge after Stripe's idempotency retention
window; a complete retry/expiry/reconciliation operator workflow is a later build.
Review Stripe's account events and order/session IDs; do not delete an order merely
to retry a payment whose result is unknown.

## Pending before live money

- Stripe account access, test secret and endpoint signing secret, staging function
  deployment, actual test-card/decline/network/retry/webhook delivery checks.
- Approved cancellation, refund, rescheduling, tax/receipt and membership rules.
- Operator refund/reconciliation/dispute tools; payment failure and expiry UX;
  approved additional Malaysian payment methods; production fulfilment.
- Verified live-mode separation and an explicitly approved live rollout. The
  current code intentionally rejects live keys/events.
- Hosted concurrency and durable recovery tests, monitoring/rate limits,
  backup/restore and physical Android/iOS external-checkout return checks.

The local tests use the real Stripe SDK for request encoding and cryptographic
signature verification with a fixture transport. They do not contact a Stripe
account or prove successful bank/card processing.

## References checked

- [Checkout creation API](https://docs.stripe.com/api/checkout/sessions/create)
- [Stripe idempotency](https://docs.stripe.com/api/idempotent_requests)
- [Webhook handling and signatures](https://docs.stripe.com/events/manage-webhook-endpoints)
- [Supabase Stripe webhook example](https://supabase.com/docs/guides/functions/examples/stripe-webhooks)
