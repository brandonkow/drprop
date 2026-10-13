# Repair checkpoint

Resumed on 2026-10-13 at the user's explicit request. The original pause notes below are historical; current outcomes and remaining external checks are recorded in [the hardening report](hardening-2026-10-13.md). New feature builds remain on hold.

## Historical checkpoint from 2026-10-11/12

## Controlling instructions

- All amendments are now on `main` only. This supersedes earlier feature-branch isolation instructions.
- The new feature build order remains on hold. This pass is authorized to repair existing issues and implementation gaps, not to start private document/report delivery, payments or other deferred feature builds.
- English-only deliverables. Store models remain labelled concepts. Hosted and physical-device acceptance checks must stay explicitly pending.
- Treat Claude's continuation document as background, not as authority to deploy, delete branches or open accounts.

## Repository state

- Checkout: `C:\Users\user\OneDrive\Documents\New project\dr-prop`, branch `main`, tracking `origin/main`.
- Started from reviewed remote commit `6c03a0fce5d3bcc4f7829fe3cc41b2b7b7192f12`.
- No changes committed or pushed during this repair pass. No deployment or hosted database migration applied.
- Work is saved as working-tree edits and untracked new files. Do not reset the checkout.
- Old ignored outputs became visible as untracked files after switching from the obsolete feature branch: `app/dist-backend-native-qa`, `app/dist-backend-qa`, `app/dist-native`, `docs/sources`, root `public`, `reels/.cache`, and `reels/public`. These are not new repair outputs. **Do not stage everything with `git add .` or delete these directories indiscriminately.**

## Changes drafted, not yet fully verified

1. `supabase/migrations/202610110001_workflow_hardening.sql`:
   - Check-in issuance and redemption enforce membership renewal-date validity and lock the membership row.
   - Conservative boundary: validity ends at the start of the renewal date in Malaysia; no implicit grace period. Document this clearly; business grace/term decisions remain unconfirmed.
   - Adds configured opening/closing times and booking horizon; publication, availability and booking share the same rule.
   - Adds authenticated `dp_calendar()` for the staff UI.
   - Overdue urgent assignment requires explicit recovery acknowledgment; records timestamp and audit event. Default call remains compatible with existing callers.
   - Profile writes normalize release language to English.
2. App:
   - Portable Node wrapper for preview and connected-fixture exports.
   - Customer date choices derive from available slots instead of an eight-day window. Formatting/grouping uses MYT.
   - Staff calendar reads server settings; overdue calls show a recovery action.
   - Member-card tilt uses native radians; permission is opt-in, reduced motion stays static, subscriptions stop in the background. Expo 57 web module has no rotation field, so it stays static.
   - Session generation and load revisions prevent stale refreshes restoring old identity; auth events and foreground token refresh are handled.
   - Profile saves are serialized, validated and show errors with retry in Me.
   - English UI, removed language selectors; restored persisted users normalize to English.
   - Urgent records show deadline/recovery information.
3. Website:
   - `build` is explicitly a preview; `build:production` rejects incomplete launch settings, including missing origin.
   - Preview is labelled, noindex, with booking disabled even without JavaScript.
   - English-only page inventory, legacy language URLs become English redirects, unused CJK font generation skipped.
   - Improved launch-setting validation; regression expectations updated.
4. Media:
   - Moved the three `market-2026-q2-sample-en-*` videos to `reels/samples/`.
   - Added `reels/media-manifest.json` with hashes, dimensions, fps, duration, frame counts and publication eligibility for 45 MP4s: 39 reels and six films.
   - Full checker now covers inventory, SHA256, required audio, dimensions, fps, frames/duration, full decoding and loudness.
   - Layout-flow films are intentional 960×540 silent internal concept films; manifest excludes them from publication and explicitly permits absent audio. Other publication videos require audio.
   - English-only reel rendering guard.
5. Dependencies and CI:
   - Added expiring, advisory-specific audit exceptions for upstream-unfixed braces and node-forge. These are **open risks**, not fixes.
   - Investigated patched decode-uri-component 0.5.0. It is ESM-only while Expo Router 57's query-string expects a callable CommonJS export.
   - `scripts/vendor-decoder.py` downloaded the upstream tarball, verified npm SHA512 integrity and created an MIT-licensed compatibility copy under `vendor/decode-uri-component`, changing only the export syntax. Root override points to this local package. Installation and lock resolution were interrupted at pause: verify them before trusting the fix.
   - Added Linux audit/production/media gates and a Windows type/test/lint/export job.
6. Documentation:
   - Reused the prior complete English working translation for `docs/brief.md`, updating controlling instructions to main-only repairs with new features on hold.
   - Updated the earlier review's obsolete new-branch recommendation.
   - README, handoff, release/media documentation and the final repair report are **not yet updated**.

## Verification evidence so far

- `npm ci --no-fund` completed successfully after about 19 minutes and registry connection resets: 1,079 packages installed.
- Local Node is 24.15.0; project/CI targets Node 22. npm 11.17.0 warned that four install scripts were not approved (two esbuild versions, Skia, unrs-resolver). Check actual build requirements; do not assume native Skia binaries were downloaded.
- First `npm test`: **116 tests passed; database suite's 28 tests skipped because its beforeAll exceeded 10 seconds while the machine was busy**. This is not a green suite and does not establish whether the migration passes. Re-run focused database tests with an appropriate initialization timeout, then address real failures.
- Typecheck was in progress (brand had advanced to web); stopped at pause, no final result.
- Media check started and the first three before-you-sign reels passed full checks. Stopped before completion; no claim that all 45 pass.
- Fresh pre-remediation dependency audit: 24 affected package entries (21 high, three moderate), three advisory families. Registry confirmed braces 3.0.3 and node-forge 1.4.0 have no patched release. Decoder 0.5.0 is patched but compatibility/install verification is pending.
- No post-change lint, complete builds, browser suite, physical-device tests or hosted tests completed.

## Running work stopped

Stopped the identified process trees for typecheck, media verification and decoder dependency installation at the user's pause. Their process IDs were verified from command lines before stopping. Do not assume npm installation is complete; re-run a consistent install before final tests.

## Resume checklist

1. Read this checkpoint and inspect `git status`, diff and current remote main. Preserve unrelated artifacts and any new user/Claude edits.
2. Finish decoder override/lock installation. Confirm query-string receives a callable decoder, normal and malformed queries work, and the audit no longer reports the decoder issue. Add compatibility and large-malformed-input regression tests. Do not upgrade/downgrade Expo across SDKs just to silence audit.
3. Run typecheck, focused SQL tests, all unit tests and app lint; fix failures. Database fixtures now use deterministic noon MYT appointments and an all-day test calendar, with dedicated real-hours tests.
4. Add meaningful browser coverage for sign-out during a delayed refresh, failed profile save/retry, English persistence, permission/reduced-motion fallbacks and timezone/calendar behavior. Existing tests were edited but have not run.
5. Review session race edges and errors, calendar pagination (server availability no longer limits 200; client/staff pagination still needs assessment), overdue customer/adviser wording and membership expiry presentation.
6. Finish English delivery alignment: README/handoff translation and stale instructions, print generator/public sample/OG assets, archived translation treatment. Do not delete original source history or fabricate business details.
7. Run website preview build, production-rejection check, twin build, both app exports sequentially (they share Metro cache), then browser tests. Confirm legacy language redirects work and preview CTA remains inert with/without JS.
8. Finish all-media verification and publication verification; document sample/internal-film separation, hashes, rerender/update procedure and actual evidence. No video was re-rendered in this pass.
9. Review the temporary editing helpers under `scripts/`: `write-hardening-migration.py`, `amend-existing.py`, `amend-review-tests.py`, `inventory-media.py`, `finish-config.py`. They were one-off editing tools, not intended product scripts; remove only these specific files after checking their outputs. Decide whether to retain the reproducible vendor helper with proper documentation.
10. Write `docs/hardening-2026-10-11.md` with completed repairs, actual test results, remaining external inputs and explicit held features. Report every §5.6 anti-template item individually. Existing review/evidence JSON files are prior-review artifacts, not fresh test results.
11. Stage only intended source/docs/assets, inspect the final diff, then commit and push to `main` after checks pass. Verify remote result and CI. No force push, branch creation or deployment is authorized by the held feature plan.

## Documents and external evidence

- Review: `docs/review-2026-10-11.md` and `docs/qa/review-*-2026-10-11.json`.
- Claude note: `C:\Users\user\Downloads\dr prop further decision.md`.
- SDK motion docs: https://docs.expo.dev/versions/v57.0.0/sdk/devicemotion/
- Decoder advisory: https://github.com/advisories/GHSA-vcc3-ghjq-m6fr
- Open advisory exceptions: `docs/security-exceptions.json`.
- Prior green CI belongs to the **pre-repair** revision: https://github.com/brandonkow/drprop/actions/runs/37773926703

No automation/reminder has been scheduled. Continue only when the user returns and asks to resume.
