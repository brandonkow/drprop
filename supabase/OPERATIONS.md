# Operational safeguards and recovery

This is an implementation/runbook, not proof of a hosted deployment. Follow it
only in an authorized environment. Keep production credentials out of app builds,
Git, screenshots and command output. Use staging with fictional records first.

## Document scanning

`case-files` requires `DP_SCANNER_URL` (HTTPS, no query credentials) and
`DP_SCANNER_TOKEN` in the Edge secret environment. Choose an approved private
scanner; no vendor, account or service is provisioned by this repository.

The gateway sends at most 6 MiB of raw PDF/PNG/JPEG bytes, the content type,
`x-content-sha256`, and a bearer token. It sends no name or client identity.
The scanner must return JSON below within 20 seconds and 4 KiB:

```json
{"sha256":"the-exact-64-character-content-hash","verdict":"clean","engine":"engine and signature version"}
```

Only `clean` with the matching hash is accepted. `infected` is rejected;
timeouts, redirects, bad/mismatched/unknown responses and missing configuration
fail closed. Uploads are scanned before storage/reservation. Downloads are scanned
again, protecting historical stored files too, then access is rechecked. Do not
disable this guard to work around a scanner outage. The local test fixture
explicitly substitutes a scanner and does not certify malware detection.

Before a pilot: verify clean samples, an approved antivirus test sample,
truncated/unsupported files, scanner downtime, signature freshness, scanner logs
and retention. Ensure the scanner does not retain documents. Verify maximum-size
files within hosted Edge resource limits and the 60-second download-grant window.

## Limits and monitoring

Apply `202611010001_gateway_limits.sql` after earlier migrations. Database-backed
fixed minute windows are shared across Edge instances: 10 uploads per account,
30 case actions per account, 6 downloads per grant, 6 checkouts per account and
12 payment operations per account. A fixed window permits bursts at a boundary.
Counters hold a subject hash, scope and count and expire after two minutes.
Service-only RPCs prevent clients from resetting counters. If the limiter fails,
the gateway fails closed. Configure platform ingress/IP controls separately for
unauthenticated traffic; these limits are not DDoS protection.

The case and payment gateways emit only service, HTTP status and duration. Route these metrics
to an approved monitoring destination and alert on sustained 5xx, scanner failure
and 429 bursts. Never capture bodies, URLs with credentials, headers or filenames.

The operator can run the read-only command with server environment credentials:

```text
node scripts/ops-health.ts
```

Exit 0 means no listed recovery backlog; exit 2 means inspect the aggregate counts.
This is not an availability/SMS/payment/backup-success assertion. Investigate failed
or stale uploads, erasure backlog, pending refunds, disputes needing a response,
and payment review/expired checkout counts using
the authorized operational tools. Do not delete an uncertain payment to retry it.

## Backup and restore drill

Database recovery and document-object recovery are separate requirements.
Before onboarding clients, the operator must record an approved retention period,
recovery-point/recovery-time targets, encrypted backup destination, access owner,
backup schedule and expiry/erasure procedure. No target or legal retention period
is assumed here.

1. Export an authorized staging database, including Auth/application relations,
   policies, functions and private schemas. Preserve the ordered migration list.
2. Back up private objects and a manifest of storage keys, byte sizes and hashes
   to the approved private destination. Do not publish this manifest or real data
   in Git. Record completed timestamps and backup integrity evidence.
3. Restore into an isolated staging project with bookings and payments disabled,
   outward notifications disabled and test credentials only. Never overwrite the
   live database for a drill. Restore object bytes as well as database metadata.
4. Verify owner/adviser isolation, banned/reassigned accounts, private bucket
   denial, source/report byte hashes, published PDF provenance and erasure state.
   Revoke restored download grants and sessions before admitting testers.
5. Reconcile order/session/event IDs against the provider in read-only mode before
   any financial actions. A restored database can predate a successful payment;
   replay/reconciliation must not duplicate charges or refunds.
6. Record measured recovery duration, recovered timestamps, failed checks and
   evidence. Delete drill data according to the approved process. Mark acceptance
   only after a reviewer sees the restore evidence, not merely a backup job log.

## Incident procedure

Disable new checkout and uploads at the gateway configuration/ingress first.
Keep verified payment callbacks operating where safe so successful payments are
not lost. Revoke affected access, preserve minimal incident evidence without
client content, rotate exposed credentials, reconcile provider state, repair and
retest in staging. Resume only after the responsible operator approves recovery.
