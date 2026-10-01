# Pending physical-device acceptance

Status: **not run**. On 2026-10-01 the user requested that the store remain an explicitly labelled concept and that device checks be documented as pending. This accepts the current delivery scope; it does not turn unperformed checks into passes.

Use the feature-branch build or the deployment owner's approved test URL. Record commit, device model, RAM, OS/browser versions, build mode and results. Use sample identities/files. Preview and connected mode are separate test runs; hosted SMS/backend acceptance also requires configured services.

| Target | Check | Required observation | Result |
| --- | --- | --- | --- |
| Physical 4 GB Android, browser | Scroll all five site sections; use the fee calculator and concept preview | Smooth interaction, readable text, correct fee; no reload/crash or stuck input | Pending |
| Android browser | Reduced motion and WebGL unavailable | Complete usable content and static Pulse Roof; no decorative motion under reduced motion | Pending |
| Android/iOS native app | Launch and three tabs | Home, Records and Me render with the bundled fonts; no startup/runtime errors | Pending |
| Android/iOS native app | Booking and keyboard | At most four booking screens; readable fee; no keyboard obstruction; payment clearly simulated in preview | Pending |
| Android/iOS native app | Membership Skia and optional gyro | Legible card, subtle motion when allowed; usable static card when denied/unavailable or reduced motion is enabled | Pending |
| Android/iOS native app | Background and resume | Motion/sensor work pauses; no duplicate subscriptions or broken navigation on resume | Pending |
| Android/iOS native app | Haptics and file picker | Supported success haptic; cancellation safe; type/count/size validation; preview stores metadata only | Pending |
| Android/iOS native app | Sample PDF and sharing | Fictional report opens; share cancellation returns safely; no unintended real recipient | Pending |
| Android/iOS native app | Preferences and sign out | Appearance/preferences behave correctly; preview local data clears; connected session cannot reopen private screens after sign out | Pending |

Attach observations, screenshots or recordings to the result for each device. Record a failure with reproduction steps and retest after fixing it. Browser emulation, Hermes export, Lighthouse simulation and automated HTTP fixtures are supporting evidence, not substitutes for these checks.

The deployment owner retains responsibility for host configuration and deployment. No change to `main` or live release is authorized by this checklist.
