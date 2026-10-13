# Existing-workflow repair report

Date: 2026-10-13, Asia/Kuala_Lumpur. Base: `6c03a0f` on `main`.
The user authorized fixes to existing issues and build gaps. All amendments remain
on `main`. New feature builds, deployment and hosted migrations are not part of this pass.
Claude's continuation note informed the review; its embedded action items were not authorization.

## Repairs

- **Membership and check-in:** an additive third migration enforces renewal-date
  validity at issuance and redemption, with membership-before-code locking in both
  paths. Expiry is the start of the renewal date in Malaysia, with no implicit grace
  period. The UI hides expired QR codes even while offline. Business grace/term policy
  still needs confirmation. Expired codes for other members are not cleaned up while
  holding this member's lock; an operator maintenance policy can be added separately.
- **Availability:** publication, discovery and booking share configured opening days,
  hours and a maximum 90-day horizon. Staff pickers use `dp_calendar`; client date
  choices come from server slots, fetched in pages of 200. Display/grouping uses MYT
  irrespective of device timezone. Stale chosen dates reset after availability changes.
- **Urgent queue:** overdue requests require a separate recovery acknowledgment;
  timestamp and audit event preserve that the original response window was missed.
- **Session/profile:** generation and request ordering prevent stale loads restoring
  signed-out state. Auth changes clear account data; native auto-refresh follows app
  foreground/background state. Profile writes serialize, reject invalid data, and show
  a retryable failure instead of silently discarding it.
- **Member-card motion:** explicit permission gesture, radians-to-degrees conversion,
  reduced-motion and app-background cleanup, with a usable static fallback. The Expo
  web implementation does not expose the same rotation data; no native sensor claim
  is based on browser emulation.
- **English release:** website and app language selectors removed, restored profiles
  normalized to English, legacy website paths redirect to English. Only the English
  sample PDF is bundled. Translated public PDF/share-card copies moved to
  `brand/legacy-public`; historical source dictionaries remain. Print defaults and the
  fee plate are English. Historical multilingual print files are not release outputs.
- **Build/launch:** portable Node export wrapper works on Windows; explicit production
  command rejects missing origin/contact/legal/location settings. Preview pages show
  their status, disable booking without JavaScript too, and carry `noindex`.
- **Dependencies:** adapted upstream decoder 0.5.0 to a callable CommonJS export for
  Expo Router's existing query parser; retained MIT licence and tarball integrity.
  Actual parser resolution and malformed-input termination are tested. npm resolution
  needed direct parser/decoder entries; an override declaration alone was insufficient.
  Two unresolved advisories remain under dated exceptions; this is not a clean audit.
- **Media:** all 45 delivered/sample/film files have explicit dimensions, timing and
  hashes. Checks require codecs/colour/audio, full decoding and loudness. Three fictional
  market videos moved to `reels/samples` and cannot be publication candidates. Silent
  layout films are explicitly internal. Two hero promos had silent tracks: their
  existing sound logo was restored at the end-card start (46 seconds), video packet SHA256 verified
  unchanged against the original commit, and audio normalized. No new imagery or commissioned music was invented.
- **CI:** Linux includes audit/launch/media gates; Windows covers types, tests, lint
  and both Expo web export modes. No hosted deployment step was added.

## Verification

The first pushed CI run passed Windows but exposed device-local preview slot generation
on Linux (UTC): the preview offered 21:30–23:30 MYT. Preview generation now uses explicit
Malaysia instants and closed days, with a regression test and UTC browser coverage.

Local environment: Windows, Node 24.15.0 / npm 11.17.0. CI targets Node 22.

| Check | Result |
|---|---|
| Unit/database suite | 147 tests passed in 14 files, including 28 database tests |
| TypeScript and app ESLint | Passed; no remaining lint warnings |
| Preview website build | Passed; 195.5 KB total gzipped JS against 250 KB limit |
| Production placeholder guard | Passed: explicit production command rejected incomplete config |
| Preview and connected-fixture Expo exports | Both passed on Windows with cleared Metro caches |
| Lockfile install validation | `npm ci --dry-run --ignore-scripts` passed; not a fresh clean installation |
| Dependency audit gate | Passed with two root advisory exceptions; 21 high affected package entries remain |
| Browser workflows | 20 passed, including connected profile retry, delayed-refresh sign-out and QR expiry |
| Full media verification | All 45 files passed after corrections, including all 40 publication candidates |
| English fee-plate PDF | Passed: one-page PDF rendered to PNG and visually inspected; English, no clipping or overlap |

Earlier browser attempts failed because the required Chromium binary was absent;
that infrastructure failure is not counted as an application pass. Full media
checking first exposed silent hero audio, then an unsupported default null-output
encoder in bundled FFmpeg; the checker now explicitly uses rawvideo/PCM for decoding.

## Section 5.6 anti-template checklist

This is a source/rendered-page review of the repair scope, not a fresh frame-by-frame
review of every historical video or a physical-device performance claim.

| Requirement | Finding |
|---|---|
| No generic headline/subtitle/two-buttons/three-cards hero | Pass: existing editorial five-section page and one booking CTA remain |
| No glassmorphism card grid | Pass: typography, rules and plain surfaces; none introduced |
| No purple-blue gradients/glowing borders/gradient text | Pass: bone/ink/bronze palette; no such treatment |
| No emoji or piled feature icons | Pass: text and Pulse Roof, without decorative feature icon lists |
| No site-wide Inter | Pass: Instrument Serif, Geist and Geist Mono |
| No rounded-2xl/shadow-lg cards | Pass: hairline rules and restrained existing card geometry |
| No invented customer-trust claims | Pass: no fabricated testimonials/customer counts; 300 is a proposed capacity, not an achieved member count |
| No testimonial carousel, FAQ accordion or newsletter box | Pass: none in the release page |
| No floating chatbot | Pass: none |
| Refinement through typography, space and breathing line | Pass: Pulse Roof retained with static reduced-motion/no-WebGL fallback |

## Remaining boundaries

No hosted migration, real SMS, real payments, cross-connection concurrency proof,
native sensor/camera/haptic acceptance or mid-range Android scroll measurement was
performed. The store remains a labelled concept. Contact, SSM, address, fees/hours,
legal review and content/music rights need owner input before launch. Production
remains blocked by the configuration guard. Local fixture Auth is deliberately a
stand-in, not evidence of hosted token revocation or provider delivery.

Private uploads/report delivery, payment ledger/provider integration, notifications,
audited membership renewal/cap/waitlist workflows and further store modelling remain
held until the user releases a new build order. Do not infer approval from this report.
