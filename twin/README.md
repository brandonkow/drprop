# Store twin (`twin/`)

The Dr Prop store as an interactive 3D model, with an operations dashboard around it
in the spirit of a strategy-game map. One simulated day runs through the store with
every kind of customer: walk-ins, Lounge members, booked consults, private clients,
urgent video calls and pre-signing reviews. Each one has its own route, rooms, staff
and fee.

    npm run twin            # dev server on http://localhost:5191
    npm run twin:build      # static build in twin/dist (relative paths: host it anywhere)

## What is on screen

| Area | Shows |
|---|---|
| 3D view | The store from `blender/` as an isometric cutaway. Walls facing the camera drop to a low cut, with dark section caps; the street or concourse is cut to a model base. People walk, sit, carry kopi and towels. Drag to turn, scroll to zoom, right-drag to pan. The buttons turn by 90°, zoom, show the plan from above, reset the view and switch the walls between cutaway, up and down. |
| Pins | Each zone, with how many people are in it now. Click one for the zone. |
| Top bar | Search (booking, member number, case, zone or role), the store (shophouse or mall), play/pause, the clock, speed. |
| Left | Now: people in the store, Lounge seats, both consult rooms, the video line, consults and fees so far. **Customers**: each type with how many are in the store now and today, a click to show or hide that type, and **+ Add** to send one in now. |
| Right | The store (size, hours, team, fees), or whatever you clicked: a visit (case, fee, room, consultant, every step with its time, "Follow in 3D"), a zone (who is there, the fit-out) or a team member (their errands today). |
| Visit tracking | The steps of the selected visit, or of the latest one in the store. Each type has its own steps. |
| Today | Every booking and walk-in so far, with fee, room and live status. Walk-ins appear when they walk in. |
| Timeline | Scrub to any time of day. |

## How it works

- `blender/export_twin.py` writes `src/data/store-<setting>.glb` (the store, light, every
  object tagged with its zone, walls tagged for the cutaway) and `src/data/plan-<setting>.json`:
  - the zones;
  - the walking network (aisle points and the clear links between them);
  - the seats and standing spots.
  
  The network is built from `plan()`, like the furniture, so routes and furniture move together.
- `src/sim/types.ts`: the customer types. Each has its fee rule (`brand/pricing.ts`), consult length, colours and tracker steps.
- `src/sim/planner.ts`: plans the whole day.
  - **Routing.** Every visit becomes walks and stays over the network.
  - **Staff errands.** Every staff member becomes a list of errands: welcomes at the front desk, kopi from the pantry, fetching a guest for a consult, seeing them to the door.
  - **No double booking.** Seats, rooms and people are never booked twice.
  - **Bookings hold their slot.** Walk-ins fit around them. A walk-in who would wait over 45 minutes has kopi and books a later slot.
  - **Adding a visit never rewrites what has happened.** Visits are planned in arrival order, and a new one starts now.
- `src/sim/track.ts` samples any person at any time. That makes scrubbing, replaying and adding visits consistent. The walk cycle is the same one used in the Blender film.
- `src/scene/` (three.js): orthographic camera, soft sun shadows, ambient occlusion (GTAO), and the room environment for reflections. Slow devices drop the post-processing automatically.

`npx vitest run twin/test` checks, in both settings:
- every customer type is served, and every consult gets a room before closing;
- no staff member or seat is used twice at once;
- adding a visit leaves the past unchanged.

## Sample data

The day is illustrative: booking numbers, cases and member numbers are made up, and
the opening hours (Tue–Sun 10:00–20:00) and floor plan are placeholders from the brief.
The top bar says "Sample day · simulated". To show real bookings, replace `sampleDay()`
in `src/sim/day.ts` with a feed of the day's bookings (`Visit[]`).

The simulated clock runs about 30 times faster than real time at 1× (walking is slowed
so you can see it, the way strategy games do).
