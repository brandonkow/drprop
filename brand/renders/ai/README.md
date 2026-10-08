# AI-finished store visuals (concept imagery)

Each image starts from one of our own Blender renders (`../shophouse-*.jpg`). The layout,
furniture and materials come from `blender/build_store.py`. Higgsfield then made a
photoreal version of each render, and five of them were animated into short clips.

These are **concepts for a store that is not built yet**. They are not photographs of
a real store, and the people in them are generated: there are no real customers or
staff. Label them as concept or illustrative wherever they are used.

| File | Source render | Model |
|---|---|---|
| `shophouse-street-photoreal.jpg` | `shophouse-street.jpg` (blue hour) | Nano Banana Pro, 2K |
| `shophouse-entrance-photoreal.jpg` | `shophouse-entrance.jpg` | Nano Banana Pro, 2K |
| `shophouse-lounge-photoreal.jpg` | `shophouse-lounge.jpg` | Nano Banana Pro, 2K |
| `shophouse-consult-photoreal.jpg` | `shophouse-consult.jpg` | Nano Banana Pro, 2K |
| `shophouse-reception-photoreal.jpg` | `shophouse-reception.jpg` (golden hour) | Nano Banana Pro, 2K |
| `clip-street.mp4` | the street image: a push-in to the shopfront | Kling 3.0 Pro, 5 s, silent |
| `clip-welcome.mp4` | the entrance image: a cold towel handed over | Kling 3.0 Pro, 5 s, silent |
| `clip-lounge.mp4` | the Lounge image: a drawer of the apothecary opened | Kling 3.0 Pro, 5 s, silent |
| `clip-consult.mp4` | the consult image: the diagnosis explained | Kling 3.0 Pro, 5 s, silent |
| `clip-golden.mp4` | the reception image: golden hour | Kling 3.0 Pro, 5 s, silent |

### Second batch (2026-10-08): the mall store, the pantry, and social formats

| File | Source | Model |
|---|---|---|
| `mall-concourse-photoreal.jpg` | `mall-concourse.jpg`: the mall shopfront | Nano Banana Pro, 2K |
| `mall-entrance-photoreal.jpg` | `mall-entrance.jpg`: the mall store's reception | Nano Banana Pro, 2K |
| `mall-lounge-photoreal.jpg` | `mall-lounge.jpg`: the mall Lounge | Nano Banana Pro, 2K |
| `shophouse-pantry-photoreal.jpg` | `shophouse-pantry.jpg`: kopi being made | Nano Banana Pro, 2K |
| `shophouse-street-vertical-photoreal.jpg` | `shophouse-street-photoreal.jpg`, recomposed 9:16 for stories and reel covers | Nano Banana Pro, 2K |
| `clip-mall-walk-in.mp4` | the mall shopfront: a visitor walks in, the host greets him | Kling 3.0 Pro, 5 s, silent |
| `clip-kopi.mp4` | the pantry: kopi poured and set on the tray | Kling 3.0 Pro, 5 s, silent |
| `clip-mall-lounge.mp4` | the mall Lounge: a member sips his kopi | Kling 3.0 Pro, 5 s, silent |
| `clip-street-vertical.mp4` | the vertical street: a visitor walks in at blue hour (9:16) | Kling 3.0 Pro, 5 s, silent |
| `social/kopi-4x5.jpg` | close-up from the pantry image | GPT Image 2.5, medium |
| `social/documents-4x5.jpg` | close-up from the mall reception image | GPT Image 2.5, medium |
| `social/material-board-4x5.jpg` | travertine, walnut and brushed bronze on limewash (text only) | GPT Image 2.5, low |
| `social/*-4x5.jpg` (the rest) | plain 4:5 crops of the images above, for the Instagram feed | none |

The mall fascia came out in a serif face with a wide gap after the dot; the real
signage follows the brand wordmark (`brand/logo/`). This batch used the last of
the free Higgsfield credits (46.25).

The prompts asked the models to keep the camera, layout, furniture and materials
exactly as rendered, to replace the mannequins with people, and to add no text. The
fascia still reads "DR. PROP", and the consult screen still shows the Pulse Roof line.
Check every image against the real fit-out before using it in print.

The stills were saved as JPEG (quality 90). The clips are 1920×1080 at 24 fps, cropped
to 16:9 from the 3:2 output. The film uses them in `reels/src/compositions/ProductFilm.tsx`.
