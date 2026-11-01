# New feature build

Authorized by the user on 2026-10-29: start the new features build. Work stays on
`main`, in English. This supersedes the feature hold in the October handoff.
Production deployment, spending and production data changes are not implied.

## Sequence and completion evidence

1. Private case and diagnosis delivery: case-linked uploads, bounded formats and
   sizes, assigned-adviser access, draft/review/publish, immutable published
   versions, PDF provenance, expiring downloads, access audit, retention/erasure.
   Prove an entire client/adviser journey, wrong-user denial, expiry, retries,
   failed publication recovery and removal of retained files.
2. Payments/commercial lifecycle: Stripe selected by the user on 2026-10-29.
   The provider checkpoint implements server-owned test orders, authenticated
   checkout and verified/idempotent callbacks. Live charging, refunds,
   reconciliation tooling and rescheduling await approved commercial rules.
3. Controlled pilot: hosted Supabase/SMS/provider verification, concurrent
   connections, backup/restore, physical phones and approved business details.

## Implementation map

```text
supabase/migrations/202610290001_private_cases.sql  cases, files, reports, access
supabase/functions/                              authenticated file/PDF gateway
supabase/test/                                   ownership and lifecycle tests
app/src/data/                                    typed case/document/report API
app/src/components/                              case documents and diagnosis editor
app/src/app/record/                              client case detail
app/src/app/                                     assigned-adviser case detail
e2e/                                            upload-to-publication workflow
docs/                                           evidence and hosted setup
```

## Security and product contract

- A case is linked to one existing booking; owner and assigned adviser come from
  that booking, never from client-supplied identity fields. Disabled or reassigned
  advisers lose access. Unassigned urgent requests do not expose documents to all staff.
- PDFs, JPEGs and PNGs only, at most 6 MiB each and 20 client documents per case.
  Byte signature, length and hash must be validated at the privileged upload
  boundary. File names are display data, never paths. No overwrite of ready files.
- Private storage denies direct anonymous/authenticated access, even if another
  bucket has a broad permissive policy. A gateway performs authorized operations.
- Drafts remain private to the assigned adviser. Review freezes content; changing
  content returns it to draft. Published content and source hashes are immutable;
  corrections create a new version. Publication requires a generated PDF matching
  the reviewed revision. Failed work is retryable using stable request IDs.
- Download grants expire after 60 seconds. The gateway rechecks current case,
  account and document access when serving each grant, and records successful
  access. No permanent public or long-lived storage URL is persisted in the app.
  Grants travel in POST bodies, avoiding query-string logs and referrers.
- Retention is operator-configured, with no invented statutory duration. Erasure
  first revokes access, then deletes objects, then scrubs content; a failure is
  retryable. Retain only minimal audit identifiers/events after erasure.
- Report generation includes the independent-information disclaimer. File type
  checks are not antivirus certification. Hosted scanning/operational acceptance
  must be explicit before a real-client pilot.

## Progress

- Started from `51dd8b0` on main. All work remains on main.
- Private case migration, authenticated file gateway, client/adviser screens,
  reviewed PDF publication, provenance, downloads and operator retention/cleanup
  are implemented. Setup and operational boundaries: [case delivery](../supabase/CASE-DELIVERY.md).
- Stripe test-mode provider checkpoint implemented; see [Stripe setup](../supabase/STRIPE.md).
- The user requested a pause after this provider checkpoint. No further feature
  build or live rollout should proceed until they resume.
- Final verification results and exact remaining work are recorded in
  [the pause checkpoint](pause-2026-11-01.md).

## Brief 5.6 self-check

| Checklist item | Result for the new screens and PDF |
|---|---|
| Generic hero, two buttons and three feature cards | Absent; case content follows the document/review workflow. |
| Glassmorphism card grid | Absent; plain sections and hairlines. |
| Purple-blue gradients, glowing borders, gradient text | Absent; existing neutral palette. |
| Emoji or icon stacks before lists | Absent. |
| Site-wide Inter | Absent; Geist, Geist Mono and Instrument Serif retained. |
| Rounded/shadowed cards | Absent; square controls, hairlines, no shadows. |
| Invented customer/trust claims | Absent; example PDF and test payments explicitly labelled. |
| Testimonial carousel, FAQ accordion, newsletter box | Absent. |
| Floating chatbot | Absent. |
| Typography, negative space and restrained line motif | Preserved; no new decorative motion. PDF pages rendered and visually reviewed. |

## API references checked

- [Supabase private storage policies](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase standard upload limits](https://supabase.com/docs/guides/storage/uploads/standard-uploads)
- [Supabase Edge authentication](https://supabase.com/docs/guides/functions/auth)
- [Expo SDK 57 document picker](https://docs.expo.dev/versions/v57.0.0/sdk/document-picker/)
