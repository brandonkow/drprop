# Blender scripts (pipeline B)

Base models for the store's digital twin (3D-3) and the apothecary wall (3D-4),
generated from `store.config.json`. A 3D artist refines materials and light in
the saved `.blend`; the scripts only guarantee correct proportions and layout.

Blender 4.2 LTS or newer. Either run inside Blender:

    blender -b -P blender/build_store.py -- --render brand/renders/store-doorway.jpg
    blender -b -P blender/build_apothecary.py -- --glb

or with the `bpy` module (`pip install bpy==4.2.0`, Python 3.11):

    python blender/build_store.py --render brand/renders/store-doorway.jpg --samples 96

Outputs

| File | Used by |
|---|---|
| `brand/3d/store.glb` | Reel R7 (StoreReveal), and any web view of the store |
| `blender/out/store.blend` | the 3D artist (git-ignored) |
| `blender/out/apothecary.blend` / `.glb` | the 3D artist; R6 uses the procedural `brand/3d/apothecary.glb` |
| `brand/renders/store-doorway.jpg` | reference still from the doorway (Cycles) |

When the real floor plan arrives, edit `store.config.json` (metres; the street
is along y = 0) and run the script again. Lights are 2700 K inside, with daylight
through the storefront for the still. Area lights do not export to glTF; point
lights do (`KHR_lights_punctual`).

To show a render or photo on the website's §4 instead of the line drawing, copy
it to `web/public/` and set `store.image` in `web/src/config/site.ts`.
