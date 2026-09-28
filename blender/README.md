# Blender scripts (pipeline B)

Base models for the store's digital twin (3D-3) and the apothecary wall (3D-4),
generated from `store.config.json`, and an animated layout plan of the store.
A 3D artist refines materials and light in the saved `.blend`; the scripts
guarantee proportions, layout and the service flow.

## The layout plan (`build_layout_plan.py`)

`blender/out/store_layout.blend` is the store with the ceiling off, zone labels
and dimensions on the floor, and a scripted service flow on the timeline:

| When | Who | What |
|---|---|---|
| 0 s | walk-in customer | arrives from the street, welcomed at the reception table with a cold towel |
| ~15 s | walk-in customer | sits in the Lounge |
| ~17 s | VIP customer | arrives by the private entrance, straight into consult room B, consultant B greets |
| ~22 s | consultant A | leaves room A, makes kopi in the pantry |
| ~36 s | consultant A | serves the kopi in the Lounge, greets, walks the customer to room A |
| ~51 s | both | consult at the round table (30 minutes, compressed) |
| ~70 s | both | farewell: consultant walks the customer to the door |
| all along | advisor | urgent video call in the booth |

Each beat is a timeline marker. Walks are coloured trails on the floor
(bronze: customer, ink: consultants, stone: front desk and VIP).

Open it in Blender 4.2+, press **Space** to play. Cameras: *Plan (top)*,
*Axonometric* (active), *Customer POV* (rides with the customer), *Consult
room A*. Select one and press **Ctrl + Numpad 0** to look through it. Toggle
the *Paths* and *Plan annotations* collections to show or hide overlays.

    python blender/build_layout_plan.py \
        --plan brand/renders/layout-plan.jpg --axo brand/renders/layout-axo.jpg \
        --video blender/out/layout-flow.mp4 --video-step 6

`--at 0.5` picks the moment for the stills; `--video-step 6` renders every
sixth frame and plays it back in real time (use 1 for full motion). All
positions come from `plan()` in `build_store.py`, so editing
`store.config.json` moves furniture and walking routes together.

The plan (brief §6.2): entrance and reception front-left, Lounge with the
apothecary wall front-right, consult rooms back-right with the private
entrance opening straight into room B, pantry and urgent booth back-left.

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
| `blender/out/store_layout.blend` | the animated layout plan (git-ignored) |
| `brand/renders/layout-plan.jpg`, `layout-axo.jpg` | plan and axonometric stills of the flow |
| `blender/out/layout-flow.mp4` | the flow as a video (git-ignored; a copy, 840×560 at 5 fps, is kept in `brand/renders/layout-flow.mp4`) |

When the real floor plan arrives, edit `store.config.json` (metres; the street
is along y = 0) and run the script again. Lights are 2700 K inside, with daylight
through the storefront for the still. Area lights do not export to glTF; point
lights do (`KHR_lights_punctual`).

To show a render or photo on the website's §4 instead of the line drawing, copy
it to `web/public/` and set `store.image` in `web/src/config/site.ts`.
