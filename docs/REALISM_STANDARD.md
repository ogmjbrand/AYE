# AYE — the realism and living-world standard

This is the master vision for AYE, as set by the project owner. Every feature
is measured against it. It sits alongside the engineering rule in
`docs/AUDIT.md`: build the foundation correctly, make one street and one home
genuinely impressive, then expand.

> **The principle:** AYE must not only look like real life; it must behave like
> real life, within the possibilities of a game. A beautiful screenshot is not
> a believable game. A character must stay believable when watched
> continuously, not just in one frame.

The owner's text ended part-way through section 6.4 (traffic). The rest of
section 6, and anything after it, still needs to be added.

## 1. The vision

AYE is a global, open-world life simulation. Players create their own
identities, live in realistic cities, build careers, form relationships, buy
property, start businesses, socialise, travel, and live with the consequences
of their decisions. The world carries on beyond the player's view.

A player should be able to:
- wake up in their apartment, dress, eat breakfast and leave home;
- walk a neighbourhood where people are living their own days;
- enter a shop, browse, talk to the shopkeeper and buy something;
- meet another player, greet them, talk, and build a relationship;
- drive across the city, park, and go into work;
- work as a doctor, pilot, police officer, fashion designer, entrepreneur,
  content creator and more;
- come home, relax, invite friends, cook, watch TV, sleep;
- build wealth, move cities, and face unexpected events whose outcomes the
  world remembers.

All of this must be backed by real game systems, not decoration.

## 2. Human realism

- **Faces:**
  - natural proportions and asymmetry;
  - skin detail and pores;
  - eyes with reflections;
  - blinking eyelids, brows, lips and teeth;
  - expressions that change with the situation.

  No plastic, over-smooth or over-shiny faces, and no identical faces.
- **Skin:** the full range of the world's skin tones and facial structures.
  Skin responds to light (sun outdoors, dim rooms) and never looks like flat
  paint.
- **Hair:**
  - short and long styles;
  - curls, coils, braids, locs and afros;
  - straight and wavy hair, fades, ponytails and buns;
  - beards and moustaches, accessories and colours;
  - styles from many fashion and cultural traditions.

  Use strands for close-ups and hair cards further away. Not every character
  needs the same rendering cost.
- **Bodies:** different heights, builds, shoulder widths, proportions and ages
  (within the approved range). Proportions should affect clothing fit,
  animation and silhouette. Changing height must not just scale one model
  until it looks wrong.
- **Clothing:** everyday to luxury, traditional, uniforms and formalwear.
  - Categories: tops, bottoms, dresses, outerwear, suits, shoes, bags,
    jewellery, headwear, sportswear, sleepwear, swimwear where appropriate,
    career uniforms, and traditional dress.
  - Every garment must:
    - fit the body and follow its movement;
    - avoid clipping;
    - behave when the wearer sits or bends;
    - have convincing materials, seams and folds;
    - stay fast enough for mobile.

  Use cloth simulation selectively. Authored meshes, skinning and light
  secondary motion should carry most of it.
- **Identity:** each character has a distinct mix of:
  - appearance and clothing;
  - voice, where voice acting is supported;
  - personality, interests and preferences;
  - career, relationships and daily routine;
  - reputation.

  All of it is data-driven, so new content doesn't mean rebuilding the game.

## 3. Movement realism (no robotic walking)

- **Walking:**
  - alternating steps, with feet properly placed on the ground;
  - weight transfer, with natural arm, torso and head motion;
  - several speeds, smooth acceleration and deceleration, natural turns;
  - feet that adapt to slopes;
  - no sliding.
- **Running:** clearly different from walking. Faster legs, different arms,
  a forward lean and stronger weight transfer. Smooth starts, stops and
  direction changes, and variants for tiredness, carrying and rough ground.
  Never jump from standing straight to full speed.
- **Starting, stopping and turning:**
  - natural stops;
  - the body turns rather than the whole character spinning rigidly;
  - turns while standing, walking and running;
  - small adjustment steps, backing up and side-stepping;
  - avoiding obstacles and stopping at a destination.
- **Sitting and standing:** approach, align with the seat, sit, settle, do
  something while seated, stand, and leave without clipping. Chairs, sofas,
  office chairs and beds each need their own poses.
- **Stairs and uneven ground:** stairs, kerbs, ramps and different surfaces,
  with feet adapting to slopes and no floating.
- **Blending:** standing → walking → jogging → running → slowing → stopping,
  coordinated by a state machine or blend tree, with no snapping between
  poses.
- **Secondary motion (subtle):** hair, clothing, arms settling, hands on held
  objects, head attention, weight shifts, breathing.
- **Animation QA:** check every important animation for:
  - foot sliding or feet through the floor;
  - body clipping or floating;
  - snapping between poses;
  - bad joint bends;
  - wrong speed;
  - poor alignment with objects;
  - a mismatch with the character's height;
  - mechanical transitions.

## 4. Interaction realism (characters actually use the world)

- **Doors:** approach, the right interaction target, position, reach for the
  handle, open, pass through, close. Doors have collision and state, and are
  never opened from implausibly far away.
- **Beds:** approach, get in with an animation, lie down, sleep, wake, get
  out. Sleep affects needs and routine. A bed can be occupied or blocked.
- **Sofas and chairs:** sit, relax, use the phone, watch TV, talk, read, wait,
  get up. Designated interaction points keep the body aligned.
- **Wardrobes:** open, browse, choose an outfit, change through a transition,
  close, and see the appearance updated. An elaborate animation per outfit is
  not needed at first; a coherent, working system is.
- **Cooking and eating:** choose a meal, get ingredients, prepare and cook,
  plate, serve, eat, clean up. Real effects on hunger, time, inventory, money
  and relationships.
- **Phone:** held naturally, with head and hands posed. Calls, messages,
  calendar, jobs, money, transport, fashion, social media, photos, missions.
  It always shows the real game state.
- **Carrying:** bags, food, boxes, tools and household objects, held in
  properly aligned hands. Nothing floats.
- **Interaction data:** every interactive object declares:
  - its id and type;
  - its interactions;
  - the player state it requires;
  - its interaction distance and position;
  - its animation and duration;
  - its effects;
  - its completion and failure conditions;
  - ownership and access.

## 5. Social realism

- **Greetings:** wave, nod, smile, hello, handshake, hug where appropriate,
  or decline. The greeting depends on the relationship: friend, stranger,
  colleague or rival.
- **Conversations:** characters face and look at each other, gesture, show
  expressions, take turns, respond, and end naturally. Authored dialogue and
  animation combinations come first.
- **Attention:** selective. Characters look at whoever approaches or speaks,
  at passing vehicles and loud sounds, at friends arriving, and at objects in
  use. Never everyone at once.
- **Personal space:** no overlapping. Crowds keep sensible gaps, and people
  step back when someone comes too close.
- **Emotions and relationships:**
  - States: friendly, happy, sad, angry, embarrassed, nervous, excited,
    tired, interested, uncomfortable.
  - Relationships: acquaintance, friend, close friend, partner, family,
    colleague, rival.
  - Actions change these over time.
- **Groups:** friends at a café, family meals, work meetings, customers and
  staff, parties, public events. The game manages who stands or sits where,
  who is speaking, and which animations play.
- **Multiplayer:** players can:
  - see and approach each other;
  - communicate;
  - perform synchronised paired actions, coordinated by the server;
  - do group activities;
  - visit homes with permission;
  - join events;
  - keep lasting relationships.

  Multiplayer is a substantial system of its own, not a button added to the
  current game.

## 6. A living world

- **Residential neighbourhoods:**
  - homes and flats, roads and pavements, streetlights;
  - gardens and trees, parking, shops;
  - people, vehicles and public spaces, with ambient sound.

  Each district has its own identity: luxury, busy commercial and quiet
  suburban areas must not look alike.
- **Commercial districts:** supermarkets, restaurants, cafés, clothing shops,
  salons and barbers, gyms, banks, hotels, offices and entertainment venues.
  Each has opening hours, stock or services, prices, staff and a gameplay
  function. These can start simple, but must work rather than be empty
  shells.
- **Pedestrians:** follow routines, not random wandering. Walking to work,
  shopping, waiting for transport, meeting friends, going to cafés, returning
  home, exercising, sitting in the park. Routines depend on time, place,
  occupation and events.
- **Traffic:** vehicles follow road conditions and local traffic rules,
  including lane following… *(the owner's text ends here)*

## Building order

Build the realism in layers, without breaking the game that works:

1. **Human foundation:** characters, faces, clothing, proportions,
   expressions.
2. **Animation foundation:** walking, turning, stopping, sitting, standing,
   gestures and transitions.
3. **Interaction foundation:** physical use of objects and of each other.
4. **World foundation:** environments, materials, lighting, vehicles,
   everyday activity.
5. **Life-simulation foundation:** careers, relationships, needs, missions,
   multiplayer.

Start with one exceptionally polished street (Lagoon Boulevard), one home
(the Palm View flat) and a small group of believable characters. Expand only
once those work.

The owner's reference videos are the quality benchmark, not just inspiration.

## Honest constraint

The browser build (React Three Fiber) can improve a lot. The very highest
levels of human realism (strand hair, facial rigs, cloth simulation, motion
matching) may need a dedicated engine pipeline for some systems.

That choice must be evaluated with measurements before any migration. It is
not to be made by assumption. Current limits are recorded in
`docs/CHARACTERS.md`:
- 20 base faces;
- no face morphs;
- no LOD for crowd models;
- missing uniforms.
