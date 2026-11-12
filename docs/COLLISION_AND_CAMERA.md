# Collision, character avoidance and the camera

Updated 12 November 2026.

## What was wrong

| Problem | Root cause |
|---|---|
| Players ended up inside walls, buildings, buses and palms | `resolveCollisions` pushed the player out of each box once, in turn. Being pushed out of one box could leave you inside its neighbour, and the clamp to the world's edge, applied last, could push you back into a building built against the edge. Measured on the real city layouts: 1,059 of 34,848 walks in Lagos Marina, 922 in Abuja Wuse 2 and 213 in Accra Osu ended inside something. |
| Players walked through people | Characters were never obstacles. Only buildings, vehicles, stalls and furniture were. |
| NPCs walked through each other | Each NPC follows its own path, with no knowledge of anyone else. |
| The camera entered buildings and buses | Outdoors, the camera had no obstruction check at all. Indoors it was only clamped to the room's walls and ceiling. |

There was one movement system, not two competing ones. Every solid already had a box (`lib/world.ts`, `Obstacle`), and the box sizes match what's drawn.

## What AYE does now

### Characters against the world: `src/lib/collision.ts`
- Every character is an upright circle on the ground. Every solid is a box: buildings, interior walls, partitions, doorway jambs, parked and moving vehicles, stalls, carts, palms, lamps, poles, benches, terrace chairs and furniture.
- **`moveCircle`** splits each move into steps no longer than half a body radius, so nothing tunnels through a thin lamp, pole or wall, even at 10 fps.
- **`solveCircle`** resolves each step iteratively, up to 8 passes:
  - out of every box, along the contact normal, so you slide along walls;
  - out of every other character;
  - inside the world's edge.
- A building against the world's edge is exited on the side that's in the world.
- A step that can't be made clear (a gap narrower than a body) isn't taken: the character stays where it last stood clear.
- **Broad phase:** only boxes the move could touch are tested (`nearObstacles`).
- **Pathfinding** is unchanged: A* over a 0.5 m walkability grid (`lib/pathfinding.ts`) plans around buildings and furniture. Collision and navigation stay separate. The grid finds the route, and the solver keeps the body out of things on the way.

### Characters against each other: `src/lib/bodies.ts`, `src/world/useNpcBody.ts`
- Every character publishes its body each frame:
  - the player;
  - residents;
  - passers-by;
  - venue staff and customers;
  - hospital, office and event characters.
- Bodies are removed when the character leaves (`useNpcBody`'s cleanup). A resident steps out of the registry during a hug, so the hug can happen.
- **The player** collides with every nearby body and slides round people.
- **NPCs** keep personal space (`personalSpaceNudge`, `avoidStep`):
  - They look 2.2 m ahead along their way.
  - They step aside for anyone in their path, always to their own right, so two people walking at each other pass rather than mirror each other into a stand-off.
  - They move apart from anyone too close.
  - They drift back onto their own path once clear.
- An NPC steps aside only where that's clear of walls and furniture: the step shrinks, then is dropped, before it would push anyone into a solid. Seated, serving and lying characters stay put, and others go round them.
- **Traffic:** pedestrians already stop for traffic (`pedestrianInTrafficPath`), and moving vehicles are obstacles each frame.

### Camera: `src/lib/cameraCollision.ts`, `CameraFollow` in `src/App.tsx`
- The camera looks at your upper body (1.35 m) and follows you every frame, never a fixed point.
- Each frame, a sphere (radius 0.3 m) is swept from your upper body to where the camera wants to be. It's tested against every solid at least 1.5 m tall: buildings, walls, buses, cars, tall furniture. Benches, bins and chairs are looked over.
- If something is in the way, the camera comes in **at once**, in front of it, so it never passes through. Once the way is clear, it **eases back out** (about 2.5× the gap per second).
- With no room even at 1.1 m (you're against the wall it's behind), the camera **rises over your shoulder** until it fits, rather than entering the wall. It settles back down gently.
- Your chosen view (angle and zoom) is kept separately from where the camera is drawn. Your dragging and zooming are carried over to it as changes. So a wall never changes your view, and you can always turn the camera away from one.
- Indoors, the room's ceiling and wall limits still apply on top.

## Why not Rapier

Every collider in AYE is a box or an upright circle on flat ground, and the solver above is exact for that world. Rapier would add:
- about 2 MB of WebAssembly to download;
- a second copy of every collider to keep in step with the game's layouts;
- a physics step every frame.

None of that buys anything here, and it would mean rewriting movement code that the rest of the game depends on: seats, beds, click-to-move, cars and events. If AYE later needs real physics (thrown objects, ragdolls, doors pushed open), add Rapier for that scene only, loaded lazily.

## Cost
- **Player:** each frame is one move, normally 1–3 sub-steps, each tested against only the few nearby boxes and bodies.
- **NPCs:** one neighbour scan (within 2.5 m) plus one clearance test per moving NPC.
- **Camera:** one sweep per frame against the district's boxes (about 60–100 plus traffic). It costs a little more when it needs to rise: up to 12 more sweeps, only while you're pressed against something.
- No raycasts against meshes, and no new dependencies.

## Tests (`src/lib/collision.test.ts`)
1. Walking into a wall.
2. Sliding along a wall.
3. A bus from 16 directions.
4. Another person, and sliding round them.
5. Two NPCs passing each other.
6. NPCs:
   - an NPC stepping aside never enters a wall;
   - NPC paths go round buildings.
7. The camera next to a building:
   - (7) it comes in in front of the wall;
   - (7b) pressed against the wall, it rises over your shoulder.
8. The camera beside a bus, and looking over a bench.
9. The camera indoors with a wardrobe, and in a doorway.
10. The camera coming in at once and returning smoothly.
11. Walking round furniture in a flat.
12. Doorways that fit a body and gaps that don't.

Further tests:
- No tunnelling at 10 fps.
- Corners.
- The world's edge.
- Wedged with no room.
- Every walk in every city ending clear of everything (the case players hit).

## Known limits
- The camera's closest distance is 1.1 m. In the rare spot where there's no room even above you (an overhang), it stops there.
- People and NPCs are circles, so an arm can briefly overlap a doorframe or another person's shoulder.
- NPC routes are authored or planned, and avoidance only steps aside from them. A crowd can't be redirected into a different route.
- NPCs don't yet keep out of doorways when standing still.
