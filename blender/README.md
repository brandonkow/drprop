# Blender scripts (pipeline B)

The store's digital twin (3D-3), the apothecary wall (3D-4) and an animated
layout plan of the service, all generated from a config file. The design
follows brief §6: travertine, walnut, linen, brushed bronze, limewash, 2700 K
light. No marble-and-gold, no white tile.

## Two settings, one plan

| Config | Setting |
|---|---|
| `store.config.json` | **shophouse**: a corner unit on a five-foot way. Plaster columns, pavers, kerb, the road, a row of pastel shophouses across it. The private entrance is on the side lane. |
| `store.mall.json` | **mall**: the same unit on a mall concourse. Polished floor, a deep bulkhead for the sign, neighbouring tenants, a tall ceiling with light slots. The private entrance opens off a back-of-house service corridor. |

Inside, both are the same store, and the floor plan comes from `plan()` in
`build_store.py`:
- **Front-left:** entrance, reception slab, fluted walnut wall and bench.
- **Front-right:** Lounge with the apothecary wall.
- **Middle:** the market-brief table.
- **Back-left:** pantry and urgent booth.
- **Back-right:** two consult rooms behind arched openings; the private door opens straight into room B.

Editing the config moves furniture and walking routes together.

## What is in the model

| Zone | Design |
|---|---|
| Storefront | Travertine portal and fascia, bronze-framed glazing, a glass pivot door standing open. Halo-lit bronze letters: an emissive copy of the letters sits behind them, so the light falls on the stone in their outline. The brass fee plate is on the pier beside the door. The window holds one table, one lamp and a section of the apothecary (§6.1). |
| Reception | A walnut slab on two travertine pedestals, not a counter. Cold towels on a bronze tray, a long bronze bar pendant. |
| Walls | Limewash with a shadow-gap skirting. Fluted walnut along the left wall, grazed by a concealed LED. A floating ceiling panel with an LED cove. |
| Brief table | Walnut table, booklets with charts, a bronze stand, a bench, two dome pendants. |
| Lounge | Curved bouclé sofa, two linen lounge chairs on walnut sleds, a travertine drum table, a wool rug, a washi floor lantern, plants. The apothecary wall has drawers with bronze label frames and brass knobs, and LED-lit shelves of glass jars. A Pulse Roof relief hangs on linen. |
| Pantry | Walnut and veined travertine, espresso machine, brass kopi kettle, cups, a lit towel chiller. |
| Consult rooms | Arched openings with reeded-glass doors in bronze frames. Round walnut tables on tulip bases, linen chairs, the analysis screen showing the Pulse Roof line, an opal globe pendant, credenza, acoustic panel. |
| Booth | 1 m², fluted walnut outside, felt inside, a reeded door, a screen for the video call. |
| Light | 3300 K downlights, 2700–3000 K practicals. Daylight comes from a physical sky (Nishita) with a matched sun, and through light portals in the glazing. |

Materials come from CC0 scans: Poly Haven walnut veneer, linen, bouclé, stucco, terry cloth and pavers; ambientCG travertine. They are box-projected, so the procedural meshes need no UVs. The props are Poly Haven plants, ceramics and a bowl. Fetch them once:

    python blender/fetch_assets.py          # ~55 MB into blender/assets/ (git-ignored)

Without them every material falls back to a procedural version, and props are
replaced by simple turned shapes.

## The layout plan (`build_layout_plan.py`)

The people are jointed like an architect's model: hips, knees and shoulders. They walk with a gait driven by the distance covered and sit with bent knees on the actual seats. The service runs on the timeline at 30 fps, about 97 s:

| When | Who | What |
|---|---|---|
| 0 s | walk-in customer | walks along the five-foot way (or the concourse) to the door |
| ~10 s | walk-in customer, front desk | welcome at the reception slab, cold towel |
| ~20 s | walk-in customer | seated in the Lounge, towel on the drum table |
| ~22 s | VIP customer | in by the private entrance, straight to consult room B |
| ~26 s | consultant A | leaves room A, makes kopi at the pantry |
| ~40 s | consultant A | serves the kopi in the Lounge, greets |
| ~45 s | both | walk to consult room A |
| ~57 s | both | consult at the round table (30 minutes, compressed) |
| ~72 s | both | farewell; the consultant sees the customer to the door |
| all along | advisor | urgent video call in the booth |

Every walk draws itself on the floor as it happens. The cutaway shots show:
- **Section:** the walls cut at 2.4 m, with dark section caps.
- **Plan graphics:** zone labels, dimensions and a legend.

Open `blender/out/store_layout.blend` (or `store_layout-mall.blend`) in Blender 4.2+ and press **Space**. Markers name each beat and switch cameras with the edit:
- street or concourse
- entrance
- pantry
- Lounge
- consult room
- the axonometric cutaway

    # stills at story moments, into brand/renders/
    python blender/build_layout_plan.py --stills brand/renders
    python blender/build_layout_plan.py --config blender/store.mall.json --stills brand/renders \
        --only mall-concourse mall-entrance mall-lounge mall-axo mall-plan
    # the edit as a video (resumable; frames already rendered are kept)
    python blender/build_layout_plan.py --video blender/out/layout-flow.mp4
    python blender/build_layout_plan.py --config blender/store.mall.json \
        --video blender/out/layout-flow-mall.mp4 --video-end 24

The video renders every third frame at 960×540 and is motion-interpolated back to 30 fps (`--video-step 1` for every frame).
- **Shophouse:** about 4 hours on a 4-core CPU.
- **Mall:** the arrival sequence only (`--video-end 24`), about 1 hour.

A GPU is far quicker. Inside Blender, the same flags go after `--`: `blender -b -P blender/build_layout_plan.py -- --stills …`.

## The store alone (`build_store.py`)

    python blender/build_store.py                       # store.blend + brand/3d/store.glb
    python blender/build_store.py --render out.jpg --view lounge --light golden

Views:
- `street` (the concourse in the mall setting)
- `entrance`, `lounge`, `reception`, `consult`, `pantry`
- `axo`, `plan`

Lighting:
- `day`, `golden`, `dusk`
- `overcast`, for the diagrams
- `mall`

The cameras are level, with lens shift, so verticals stay vertical. Renders use AgX, OIDN denoising and a light glow on the lamps.

## Outputs

| File | Used by |
|---|---|
| `brand/renders/shophouse-*.jpg` | street at dusk, entrance, Lounge (kopi served), pantry, consult, reception at golden hour, axonometric, plan |
| `brand/renders/mall-*.jpg` | concourse, entrance, Lounge, axonometric, plan |
| `brand/renders/layout-flow.mp4`, `layout-flow-mall.mp4` | the service flow as a film |
| `brand/3d/store.glb` | Reel R7 (StoreReveal): a light version with flat colours, no scanned props, shophouse setting |
| `blender/out/*.blend` | the 3D artist (git-ignored) |

Modules:

| File | What it does |
|---|---|
| `materials.py` | scanned and procedural materials |
| `kit.py` | geometry and light helpers, the section cut |
| `look.py` | sky, sun, render settings, cameras |
| `common.py` | shared basics |

When the real floor plan arrives, edit the config (metres; the street or concourse is along y = 0) and run the scripts again.

To show a render on the website's §4 instead of the line drawing, copy it to `web/public/` and set `store.image` in `web/src/config/site.ts`.

## References

- [Poly Haven](https://polyhaven.com) and [ambientCG](https://ambientcg.com): CC0 textures and models.
- Aesop's stores, for the apothecary-as-retail language: travertine, timber, restraint ([Wallpaper\*](https://www.wallpaper.com/gallery/lifestyle/a-visual-history-of-aesops-best-designer-stores), [ArchDaily](https://www.archdaily.com/775470/9-aesop-stores-that-revitalize-architectural-simplicity)).
- The isometric cutaway "room diorama" that Blender artists post on Behance and Dribbble: an orthographic camera, soft key light, the section shown in dark caps ([Behance: isometric rooms](https://www.behance.net/search/projects/isometric%20room)).
- Interior archviz practice in Cycles: light portals in openings, AgX, area lights for practicals ([Blender manual: light settings](https://docs.blender.org/manual/en/latest/render/cycles/light_settings.html), [Blender Artists](https://blenderartists.org/t/realistic-archviz-from-cycles-to-eevee-with-tips/1154138)).
- Procedural architecture in bpy, rebuilt from dimensions with headless Cycles: [openhouse-3d](https://github.com/yunfanye/openhouse-3d), [parametric-house-generator](https://github.com/lupuDragos/parametric-house-generator).
