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

The prompts asked the models to keep the camera, layout, furniture and materials
exactly as rendered, to replace the mannequins with people, and to add no text. The
fascia still reads "DR. PROP", and the consult screen still shows the Pulse Roof line.
Check every image against the real fit-out before using it in print.

The stills were saved as JPEG (quality 90). The clips are 1920×1080 at 24 fps, cropped
to 16:9 from the 3:2 output. The film uses them in `reels/src/compositions/ProductFilm.tsx`.
