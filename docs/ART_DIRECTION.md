# AYE — Visual Target (non-negotiable)

> **"Reality in game form."** AYE's visual target is photorealistic, cinematic,
> AAA-quality 3D. This is a fixed product requirement set by the owner. It is
> not a stretch goal and must not be quietly lowered.

The owner has supplied reference images that define the bar. They are kept
**outside this public repository** (many are third-party photos and renders we
do not have the rights to redistribute). This document records what they show,
so every contributor and every AI session works to the same target.

## What the references show

### Cities and environments
- **Coastal megacity at golden hour.** Aerial view of a dense modern business
  district on reclaimed land: glass towers, construction cranes, a rock-armoured
  ocean shoreline with surf, a lagoon with boats, low sun behind haze.
- **Busy African city streets.** Yellow minibuses (danfo-style), crowds on
  pavements, motorbikes, overhead power lines, market umbrellas, palm-lined
  boulevards, pedestrian bridges, glass-clad landmark buildings at sunset.
- **Night city.** Towers with lit windows and coloured architectural lighting,
  sodium street lamps, headlights and tail lights, crowds walking under palms.
- **Blue hour boulevard.** Illuminated landmark tower, long road of car light
  trails, warm shopfronts, palm trees, deep blue sky with cloud texture.
- **Rain and atmosphere.** Wet asphalt with reflections and puddles, overcast
  dusk skies, volumetric fog and haze around towers, lit interiors seen through
  windows, a supercar with headlights on a wet street.
- **Stylised-real game city.** Sun shafts through tropical trees, wet tiles,
  neon signage, palm trees and high-rises.

### People
- Photoreal human characters: believable skin (pores, sheen, subsurface
  scattering), detailed eyes, realistic hair (braids, locs, curls, updos),
  natural proportions and posture.
- Diverse characters across skin tones, styles and genders.
- Clothing with real fabric detail: denim, knit, pleats, leather, printed
  graphics, accessories (hoops, bandanas, bracelets).
- Fashion: a model walking a runway in a white halter dress; streetwear
  portraits with studio rim lighting.

### Careers and interiors
- **Content creator studio:** cinema camera on a tripod, boom mic, acoustic
  panels, RGB practical lighting, editing monitors.
- **Pilot:** airliner cockpit at sunrise above clouds, detailed instruments.
- **Doctor:** hospital room with patient monitor, bed, staff in white coats.
- **Luxury retail:** boutique with checkerboard marble floor, wood panelling,
  warm cove lighting, glass display cases, mirrored ceiling.

### Lighting and mood
Golden hour, blue hour, night with practical lights, overcast rain. Physically
based materials, global illumination, soft shadows, reflections, atmospheric
fog, cinematic colour grading and camera composition.

## What it takes to reach this

This look requires a high-end real-time engine and production art. The
recommended path, consistent with the master specification:

| Need | Approach |
|---|---|
| Real-time global illumination, reflections | Unreal Engine 5 — Lumen, virtual shadow maps |
| Dense, detailed city geometry | UE5 Nanite, World Partition, photoscanned assets |
| Photoreal humans | MetaHuman, MetaHuman Animator for facial performance |
| Hair | UE5 Groom (strand-based hair) |
| Clothing movement | Chaos Cloth / garment simulation |
| Natural movement | Motion capture + animation blending (motion matching) |
| Weather, time of day | Dynamic sky, volumetric clouds and fog, wet-surface materials |
| Assets | Original or properly licensed (e.g. Fab/Quixel); never copied game assets |

Platforms: PC and consoles natively. Phones and low-end devices reach this
quality only through cloud/pixel streaming, not by rendering it locally.

## Role of the current browser build

The `aye-web` Three.js prototype is for **gameplay systems** (movement, time,
economy, careers, saves) and fast iteration. Its graphics are **placeholders**
and must never be presented as meeting this target. Game rules built there
should live in engine-independent code (and later an authoritative backend) so
the Unreal client can reuse them.

## How visual work is judged

- Every visual milestone is compared **side by side** with the references.
- A milestone is "on target" only when a neutral viewer would accept it
  alongside them — not "good for a browser game".
- Screens, trailers and store pages must show real in-engine captures; mock-ups
  are labelled as concept art.
