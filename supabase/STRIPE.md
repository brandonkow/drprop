# Stripe provider checkpoint

Stripe was selected on 2026-10-29. The user resumed the five build areas on
2026-11-01. The implemented provider and operator flows remain **test-mode only**.
Live charging, automatic refunds, subscriptions and production fulfilment are not enabled.

## Implemented

- Persisted test order attempts per booking, with the fee read from the server's booking
  record, fixed MYR currency and owner-only RLS. Client amounts and redirect URLs
  are ignored. Disabled/banned identities and cancelled bookings cannot start checkout.
- Stripe SDK 23.1.0 pinned in Node and Deno, hosted Checkout, English locale, card-only test filtering,
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
  Normal preview builds leave this opt-in unset. The local connected test export
  enables it against a fictional provider fixture; never deploy that export.

## Operator recovery and commercial controls

The `payment-operations` function supports authenticated operator listing,
Stripe session reconciliation, reviewed partial/full test refunds, refund-status
recovery and dispute-status refresh. Provision a verified account explicitly in
`dp_private.payment_operators`; being staff does not confer financial access.
No operator is seeded by production migrations. The app exposes the test operator
screen from Me for staff when the test flag is enabled; all operations still
check the separate server role, including account bans.

Refund requests reserve their amount transactionally before provider calls.
The immutable request ID, amount, review reason and actor survive retries. Pending
and uncertain amounts count against the refundable balance. Only a retrieved
matching Stripe result can mark a refund succeeded; terminal results cannot be
downgraded by stale callbacks. Payment/refund transitions have a private audit trail.
After an unattached refund is 23 hours old, create is blocked: find the refund
in Stripe by `refund_request_id` metadata and reconcile its ID. Never create a
replacement merely because the response was lost. Failed/canceled refunds free
their reservation for a separately reviewed new request.

Reconciliation checks session order metadata, amount, currency and mode. Only a
retrieved expired, unpaid session unlocks an explicit customer restart with a new
order and idempotency key; old attempts remain in history. Unknown/unattached
sessions require the operator to find the session ID in Stripe first.

Subscribe additionally to `refund.created`, `refund.updated`, `refund.failed`
and relevant `charge.dispute.*` events. Verified callbacks retrieve current provider
objects before recording results. Disputes put the order in review and surface the
response deadline; approved evidence must still be submitted manually in Stripe.
Unmatched provider objects fail for investigation rather than silently settling.

Clients can view a clearly labelled test payment record and submit cancellation
or rescheduling requests. Operators review requests; a requested slot is not held.
Approval atomically rechecks slot availability/overlap and records a policy snapshot.
Cancellation marks existing paid test orders for review; refund suggestions do not
move money. Ordinary cancellation also puts already-paid test orders into review.

`dp_private.commercial_policy` starts unapproved with no prices, cutoff, refund
percentages or membership period/grace values. An operator must record the user's
approved rules and an approval reference before approving booking changes.
Membership policy fields are prepared, but membership charging and live booking
fulfilment are **not implemented/enabled** pending the requested commercial inputs.
Tax invoices require approved seller/tax rules; the current payment record is not
a tax invoice. No policy values in tests are business approvals.

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
checkout settlement. Also subscribe to the refund/dispute events listed above.
Unsupported events are acknowledged as ignored; subscriptions are not implemented.

## Retry and reconciliation boundaries

Retries within the creation window reuse the same stored order and Stripe
idempotency key. A session already attached to the order is retrieved instead of
recreated. A webhook can settle an order even if its checkout-attachment response
was lost, provided the verified session matches the stored order.

The fixed checkout expiry is one hour after order creation. When fewer than
30 minutes remain, an unattached order requires operator reconciliation rather
than blindly creating another checkout. Closed/expired sessions also require
reconciliation. This prevents a new charge after Stripe's idempotency retention
window. The operator workflow above now handles verified expiry and explicit restart;
unattached sessions still require an operator to find the matching provider ID.
Review Stripe's account events and order/session IDs; do not delete an order merely
to retry a payment whose result is unknown.

## Pending before live money

- Stripe account access, test secret and endpoint signing secret, staging function
  deployment, actual test-card/decline/network/retry/webhook delivery checks.
- Approved cancellation, refund, rescheduling, tax/receipt and membership rules.
- Hosted acceptance of the implemented operator refund/reconciliation/dispute
  tools and expiry/retry UX; approved additional Malaysian payment methods;
  membership charging and production fulfilment.
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
