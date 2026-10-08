# Delivered reels

The finished English reels, ready to post: `{name}-en-{ratio}.mp4`, H.264 + AAC,
30 fps, BT.709 limited range, −14 LUFS, true peak ≤ −1 dBTP (brief §9.5).

| Ratio | Where it goes |
|---|---|
| `9x16` | Reels, TikTok, Shorts, Xiaohongshu |
| `4x5` | Instagram and Facebook feed |
| `16x9` | YouTube, the website, presentations |

Before posting one, run `npx tsx scripts/deliver.ts --check delivered/<file>` from
`reels/` and watch it through once. Educational reels end with "General information,
not personal advice."; keep that frame. Market figures carry their source and date.

## Updating

`npm run render:all` writes to `reels/out/` (not tracked). Copy a reel here only when it
is final, so this folder holds what was actually published. The store reveal's 3D takes
about 2½ hours without a GPU; everything else renders in a minute or two.
