# Authentication and scheduling implementation

Scope: the next backend increment, authorized by “proceed”, on `feat/brand-static-landing` only. Main and deployment remain owned by the separate session. English only.

1. Add Supabase PostgreSQL migrations for private profiles, operator-assigned staff, adviser availability and customer bookings. Keep bookings disabled until an operator confirms pricing and service readiness.
2. Enforce authorization and server-side pricing in database functions. Serialize slot claims, reject overlaps and repeated/conflicting requests, support customer cancellation and adviser confirmation/completion.
3. Add explicit app backend mode with phone OTP, persisted sessions, Home/Records/Me, four-screen booking and a staff scheduling view. Keep preview mode independent. Missing backend configuration must fail closed.
4. Execute migration and authorization tests in local PostgreSQL through PGlite; test backend app journeys with a controlled HTTP fixture and preserve preview regressions. Hosted OTP delivery and multi-connection concurrency require deployment-owner verification.
5. Record local evidence and configuration instructions, then commit and push this branch.

```text
supabase/migrations/     additive Dr Prop schema and authorized RPC functions
backend/tests/           executable database and row-access tests
app/src/backend/         Supabase client, secure session adapter, connected UI
app/src/state/           shared presentation context, independent demo provider
tests/backend-app/       controlled HTTP integration journeys
docs/backend.md          setup, operator provisioning and acceptance boundaries
```

Supabase is the working provider assumption unless the deployment session already chose another backend. No hosted project, SMS delivery, payment charge or deployment is initiated by this increment. Private files, payment webhooks and membership/check-in are subsequent increments; backend mode must not expose their simulated equivalents as live features.
