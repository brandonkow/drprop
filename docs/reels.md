# Reel production

The eight named series live in `reels/src/compositions/Reel.tsx`; `Root.tsx` registers 28 English outputs. Animation uses deterministic frame numbers and local fonts/assets.

| Series | Duration | Content |
| --- | --- | --- |
| BrandPulse / BrandPulseShort | 15 / 7 s | Brand statement, morphing line and bronze sculpture |
| CaseOfWeek | 36 s | Fictional case, clay house and questions |
| BeforeYouSign | 25 s | Five preparation prompts |
| FeeReveal | 15 s | Five proposed fee bands |
| MarketPulse | 25 s | Dated, sourced annual transaction values |
| LoungeMoment | 12 s | Pre-opening apothecary concept |
| StoreReveal | 20 s | Camera through the concept store |
| MemberCardReveal | 9 s | Demo card; terms unconfirmed |
| StoreLoop | 40 s | BrandPulse followed by MarketPulse |

Each regular series and the short brand variant uses 1080×1920, 1080×1350 and 1920×1080 at 30fps. StoreLoop is landscape only. Layouts recompose instead of cropping one master.

## Commands

```sh
npm --prefix reels ci
npm --prefix reels run studio
npm --prefix reels run stills
npm --prefix reels run render
npm --prefix reels run render -- --only=FeeReveal --ratio=16x9
npm --prefix reels run stills -- --only=StoreReveal --frame=540 --safe-zones
npm --prefix reels run stills -- --only=StoreReveal --fallback
```

`prepare:assets` copies shared GLBs/local WOFF2 files into ignored runtime folders. Re-run it after regenerating models. `--only` takes a name without language/ratio suffix. `--frame` is zero-based. Safe-zone/fallback variants have separate filename suffixes. A missing GLB uses procedural geometry; failed fonts stop the render instead of silently substituting typography.

Chrome Headless Shell and ANGLE are the supported rendering defaults. First use downloads the browser. Default concurrency is one for an 8 GB machine; `RENDER_CONCURRENCY` can increase it where memory permits. A manifest is saved after each completed output. An unfinished batch is not a full delivery.

## Episodes and sources

`--case=src/data/cases/example.json` and `--market=src/data/market/example.json` resolve relative to `reels/`. Cases accept a hook, 1–6 concise lines, terrace/condo/bungalow and none/roof/title/facade highlight. Sample cases are fictional. Use anonymized status only after actual clearance; do not include identifiable clients/projects.

Each selected composition reuses its standard output filename. Commit or archive the previous edition before rendering a different episode into that filename.

Review stills default to frame 90, except FeeReveal uses frame 45 so the first price is visible between transitions. `--frame` overrides that choice, and the still manifest records the actual frame.

Market data requires geography, metric, unit, frequency, source/date, retrieval date and 2–6 comparable nonnegative values. Observed data requires a direct HTTPS source URL. The default is Selangor annual residential transaction value, 2021–2025, from NAPIC. It is not a price index, median price, asking price or monthly series. [Provenance](market-provenance.md) records the chart and transcription.

Run browser checks and inspect safe-zone stills for every new episode. Tests cover shipped samples, not arbitrary copy. Vertical text reserves 14% top, 35% bottom, 65px left and 230px right. Other ratios reserve 7% left, 10% right/top and 13% bottom. These are conservative project defaults, not universal platform guarantees. `showSafeZone` is also a Studio prop.

Educational reels retain “General information, not personal advice.” Browser QA checks text bounds at five moments across all ratios. `scripts/verify-media.mjs` validates encoded codecs, dimensions, durations, hashes, limited-range BT.709/yuv420p and decode integrity and extracts contact sheets. `--partial` checks only completed manifest entries and writes a separately labelled incomplete report. The final command requires all 28 files.

Rendering explicitly selects BT.709. The first batch began before this setting was corrected; `scripts/normalize-media.mjs` provides a one-time FFmpeg conversion for a completed full-range legacy batch, updating hashes and preserving AAC. It must run only after rendering finishes. New correctly tagged renders need no conversion.

## Audio and licensing

The 27 social/video variants include an original synthesized audio draft: a soft double heartbeat, a damped wood-like tap and a sparse sustained tone bed. `scripts/audio-master.mjs` generates every sample from equations; it uses no third-party recordings, music samples or voice. This is a proposed brand sound, not a claim of a commissioned or approved sound identity. The 40-second store-screen loop is silent as required by §9.3.

The batch renderer runs two-pass FFmpeg loudness normalization after rendering. It measures the final AAC encode, requires −14 LUFS ±0.5 and true peak at or below −1 dBTP, and verifies that video packet hashes are unchanged. FFmpeg/FFprobe must be installed and on PATH. A mastering failure stops delivery rather than silently passing through an unmastered file.

[Audition the 15-second draft](../out/pulse-roof-audio-preview.m4a). This AAC excerpt is copied directly from the mastered BrandPulse export.

To apply the same process to an existing complete batch without re-rendering visuals, run `node scripts/master-media.mjs` from the repository root, then `node scripts/verify-media.mjs`. It resumes by retaining files whose hash and recorded audio version already match; use `--force` to remaster them. Increment `audioVersion` after changing the sound design. Canonical and matching filtered manifests are updated. Intermediate WAVs stay in the ignored `reels/.cache/audio` directory and are removed after each file. Studio playback remains silent unless `audioSrc` is supplied: mastering happens after export, not inside the preview. Listen to the exported draft before approving it for publication; objective loudness tests do not establish subjective sound approval.

For a commissioned replacement, retain the written license/provenance, replace the synthesis source in `masterVideo`, and repeat final AAC loudness checks. Merely setting Studio's `audioSrc` does not replace the batch master's source. Avoid publishing a different audio edition under an old manifest.

Remotion is source-available under its own license, not MIT. Its [official FAQ](https://www.remotion.dev/docs/license/faq), checked 2026-09-29, permits individuals, teams up to three people, qualifying nonprofits and noncommercial evaluation under the Free License. Other users need the applicable Company License. Operating-team eligibility is unconfirmed; these outputs are for evaluation. No paid service or publication was initiated.

Original meshes use no stock/purchased assets. Fonts retain license notices; installed libraries retain their package notices. Remotion licensing is separate from those permissive dependencies.
