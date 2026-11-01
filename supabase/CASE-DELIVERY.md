# Private case delivery

Implementation is on `main`. These instructions are for an authorized staging
operator; they do not authorize production migration or deployment.

## Components

- `202610290001_private_cases.sql` backfills one case per booking and creates future
  cases automatically. RLS exposes files to the verified client and assigned,
  enabled adviser. Account bans, reassignment, retention expiry and erasure revoke access.
- `functions/case-files` verifies JWTs with Supabase Auth for all account actions.
  Download requests instead carry a random 256-bit grant in a POST body. The
  database stores only its hash and rechecks access before bytes are served.
- `dp-case-files` is private. A restrictive policy prevents direct app Storage
  access even alongside an unrelated permissive policy. Service credentials stay
  exclusively on the server or in an operator process.
- The gateway validates bounded byte length, PDF/JPEG/PNG signatures and SHA-256.
  Byte checks alone do **not** certify uploaded content as safe. The gateway now
  requires the configured scanning adapter before uploads and downloads; an approved
  scanner service and hosted detection checks are still required. See [operations](OPERATIONS.md).
  Downloads use attachment disposition, no-store, nosniff and a sandbox policy.
- PDF generation uses the reviewed content and source hashes, with bundled
  licensed Geist/Instrument Serif fonts and no external requests or supplied HTML.
  Unsupported glyphs fail publication visibly rather than silently changing text.
- The connected app exposes a private case from a client record or assigned
  adviser booking. Preview mode retains sample data and has no simulated private
  upload or publication success.

## Staging configuration

1. Back up the project and apply **all** migrations in filename order in staging.
   Do not apply the test-only `test/storage-fixture.sql` to Supabase.
2. Configure the Edge function with the platform's `SUPABASE_URL`,
   `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. Never copy the service key
   to an `EXPO_PUBLIC_*` variable. The app continues to use its publishable key.
3. Deploy `case-files` only after deployment is authorized. `config.toml` disables
   the platform's legacy JWT gate because the handler validates user tokens with
   Auth and supports opaque download grants. This does not make account actions anonymous.
4. Verify direct anon/authenticated Storage access is denied. Confirm Auth token
   validation, phone verification, bans, RLS and service-role permissions on the
   actual project. The local fixture cannot prove these hosted integrations.
5. Configure monitoring, rate limiting, upload scanning/review and a regular
   trusted cleanup process before admitting client documents. Do not log request
   bodies, JWTs, grant tokens, document contents or service keys.

## Retention and erasure

No statutory or commercial retention period is invented. An authorized operator
sets an explicit date using environment credentials in their process:

```text
node scripts/case-retention.ts retain CASE_UUID ISO_DATE
node scripts/case-retention.ts erase CASE_UUID
node scripts/case-retention.ts sweep
```

Expiry immediately prevents new app reads and downloads. It does not automatically
erase bytes. The operator must run erasure under an approved retention process.

Erasure first revokes access, then deletes every registered source/report object,
then scrubs diagnosis content, provenance and file names/hashes. Outstanding writes
carry a 15-minute lease, longer than the hosted Edge request limit. If the operator
gets the outstanding-operations message, access stays revoked: wait until the lease
expires and rerun **the entire erase command**, including object deletion. The
database also refuses completion while matching Storage catalog objects remain.
Keep the gateway's maximum request duration below this lease if hosting changes.

Every generated artifact is registered before Storage writes. `sweep` reclaims
expired failed attempts and discarded uploads, but excludes published PDFs. It
should run regularly in an approved operator/scheduler environment. A lost
publication response must never trigger eager deletion: the transaction may have
committed. A retry reads the existing published version.

Erasure is scoped to case content. Original bookings, account records and minimal
audit identifiers remain; account-wide erasure, backup expiry and legal retention
need a separate approved process. Copies a recipient saves outside the app cannot
be revoked. Web download Blob URLs are revoked after use; native sharing uses a
temporary cache file removed when the share sheet returns. Abrupt process death
can leave OS cache copies, so device acceptance must include cache behaviour.

## Acceptance required before real clients

- Real SMS, invalid/expired JWTs, banned users and account deletion behaviour.
- Separate clients/assigned/reassigned/disabled advisers and no public bucket access.
- Concurrent upload retries, review/publication, reassignment, cancellation and
  erasure from separate connections; local PGlite tests use one connection.
- Storage failures, lost commit responses, orphan sweep and erasure retry; confirm
  object removal independently in Storage and test backup restoration/expiry.
- Edge bundle startup, memory/CPU/timeout behaviour with maximum permitted report
  and file sizes. Node tests do not establish hosted Deno performance.
- Physical Android/iOS pick, retry, share, background, sign-out, keyboard, cache and
  screen reader checks. Browser emulation does not prove native behaviour.
- An approved upload scanning/review process, retention policy, responsible
  operator, incident handling and business/legal review of the report language.

## API references

- [Supabase function dependencies](https://supabase.com/docs/guides/functions/dependencies)
- [Supabase storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Expo SDK 57 file handling](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/)
- [PDF font APIs](https://pdf-lib.js.org/docs/api/classes/pdffont)
