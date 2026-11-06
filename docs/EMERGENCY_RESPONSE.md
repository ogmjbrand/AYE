# Emergency response: accept, travel, act, hand over

Updated 6 November 2026, branch `claude/wonderful-franklin-gixkta`.

This document covers the first complete loop of the dynamic emergency-response spec: the
**road accident**, from the alert to the reward, as the spec's stage order asks. It is built on
the living-world system that already existed (`src/lib/liveEvents.ts`,
`src/world/LiveEventScene.tsx`, `src/components/LiveEventUI.tsx`).

## 1. What already existed (audit)

- **Event director.** One event at a time, at the frequency you choose in settings (off, calm, normal or lively). It is seeded from the clock and the district, so the same save always sees the same events.
- **Six event kinds:** road accident, collapse, missing person, broken-down car, restaurant rush and building fire. Each has its own 3D scene:
  - wrecked cars, cones and an injured driver and passenger;
  - a police officer and car after 8 minutes, a paramedic and ambulance after 14;
  - fire with smoke, fire engines, hoses and firefighters.
- **Objectives with rules:**
  - career requirements (first aid needs a doctor, making cars safe an engineer);
  - a phone for calling it in;
  - an order (hand over only after first aid);
  - a pay and reputation reward, paid once;
  - harm that goes through the survival rules, never below the floor;
  - a reputation penalty for starting something and walking away.
- **What was missing:**
  - Responding only tracked the event on the map. You had to walk there yourself.
  - At the scene, every objective was a button in a panel, done from anywhere within 6 m.

## 2. What was built (stages 1 to 5 for the road accident)

| Stage | What happens now |
|---|---|
| 1. Alert and accept | The alert shows what happened, how far away, the time left and **your part** for your career (a doctor sees "Give the driver first aid"). **Accept mission** or **Decline**; declining costs nothing. |
| 2. Travel | Accept registers you as responding, takes you out of any building, and walks you through the streets to the scene, round whatever is in the way, with the route on the map. |
| 3. Arrival | You arrive beside the crash. The objectives tracker appears on the right with **Reach the scene** ticked. |
| 4. Doing it | Each objective has a real place, set by `objectiveSpot`. **Go** walks you there and you do it there. |
| 5. Career | The tracker lists only what your career and kit allow. A doctor's part is first aid and the handover; an engineer's is making the cars safe. Anyone can call it in, comfort the passenger and warn traffic. |
| Finish | When nothing is left for you, **Hand over and carry on** ends the response. You see the result card with your pay and reputation, it's saved in your history, and normal life resumes. |

Where each objective in stage 4 is done:
- **First aid:** you walk to the injured driver and kneel at his side.
- **Making the cars safe:** at the silver car's door.
- **Comforting the passenger:** in front of her.
- **Warning traffic:** up the road, facing the oncoming cars.

The game itself refuses an objective done away from its spot (more than 1.6 m), so opening a panel can never complete one.

## 3. Acceptance test (spec section 15)

Tested in the real game in a browser, and in unit tests (`src/lib/liveEvents.test.ts`). The browser
renders at about 1 frame a second here, so the walks are slow and the game clock runs on while
they happen. Because the event lasts a fixed 60 game minutes, the full sequence was run in three
parts, each resuming from a save of the one before:
1. Accept, travel, arrive, call it in and first aid.
2. Comfort the passenger and warn traffic.
3. The handover, **Hand over and carry on**, and the save.

In the third part the saved world held the event in history: outcome "helped", all five objectives,
220 GHAI (15 + 120 + 40 + 25 + 20, exactly the objectives' rewards) and not abandoned.

| # | Step | Result |
|---|---|---|
| 1 | An incident at an existing Songhai location | ✓ A crash on the cross street off Lagoon Boulevard (13, −20), placed by the existing `siteFor`. |
| 2 | An appropriate player gets the alert | ✓ The doctor's alert names first aid as their part. |
| 3 | Accept | ✓ The **Accept mission** button. |
| 4 | Registered | ✓ `responding: true` in the saved world. |
| 5 | Travel starts automatically | ✓ The walk starts at once. |
| 6 | Journey visible in 3D | ✓ Walking down the boulevard with traffic and passers-by (screenshot). |
| 7 | Arrives at the right place | ✓ Stopped 4.6 m from the crash, and the tracker ticked "Reach the scene". |
| 8 | Detailed 3D scene | ✓ Two wrecked cars, cones, the driver and passenger, the police officer and car, the paramedic and ambulance. |
| 9 | Performs the activity | ✓ First aid while kneeling beside the driver. |
| 10 | Objective updates | ✓ Ticked in the tracker, +120 GHAI. |
| 11 | Mission completes | ✓ **Hand over and carry on** ended it in the browser. The event's own end also completes it. |
| 12 | Correct reward | ✓ Paid once per objective. A test checks the total equals the objectives' rewards and that repeating one pays nothing. |
| 13 | Saved | ✓ In the browser, local storage holds the result in history. A test also saves and reloads it. |
| 14 | Back to normal life | ✓ The tracker closes and the result card says "Carry on". |

## 4. Not done yet (said plainly)

- **Travel is on foot only.** There is no ambulance, police car or own-car drive to the scene yet. There are also no paramedic, firefighter, police, military or mechanic careers in AYE yet, so their transport and duties (spec section 3 and the section 5 table) wait for those careers. Doctors and engineers have their own duties today.
- **The arrival shot is minimal.** There is no establishing camera move or siren audio yet: arrival is marked by the tracker and a message.
- **The other five event kinds still use the panel.** Missing person, collapse, breakdown, restaurant rush and fire still work through the panel at the scene. They need their own objective spots, which is the next step now that the accident loop is proven.
- **No multiplayer.** There is no shared server session yet, so cooperation, shared objectives and claiming a task (spec section 6) can't be built until accounts and realtime exist.
- **Rewards are validated in the browser, not on a server.** The server rules exist for purchases, but event rewards aren't sent to a server yet (spec section 10).
- **No arrival time limit beyond the event's own.** If you take longer than the event lasts, the services finish without you. That matches the original design but can feel harsh on slow devices.
