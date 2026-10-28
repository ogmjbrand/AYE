# Divine Evolution

AYE's supernatural system is built in stages, as the brief asks. It starts with
the foundation, and every interaction has to work and save.

## Stage 1: built

`src/lib/supernatural.ts`, `src/components/DivinePanel.tsx`, `src/world/TransformAura.tsx`

**The unlock**

- It opens at a balance of 1,000,000,000 GHAI. Nothing is deducted, and access
  stays after you spend.
- The panel shows the requirement and your balance.
- The balance is checked on the device for now. It moves to the server when
  AYE's backend is live, and the panel says so.

**Forms**

- Once unlocked, you can transform or return to human form at any time, with
  no battle required either way.
- Your appearance, clothes and hair are never changed.
- After transforming, the panel offers the brief's choices:
  - Remain transformed
  - Return to human form
  - Return home
  - Rest and recover
  - Continue exploring

**Energy**

- Transforming costs 10 energy.
- Staying transformed drains 0.5 energy a minute and builds exhaustion. At 0
  energy you return to human form by yourself.
- In human form, energy recovers 0.1 a minute and exhaustion fades.

**Recovery**

- Recovery never costs money.
- A night at home restores everything. Sleeping elsewhere recovers half.
- The Spiritual Healing Chamber in your home restores everything in 30 minutes.

**Look and saves**

- While you're transformed, a violet-and-gold aura (rings and rising motes)
  surrounds your character. It uses no lights, so nothing recompiles.
- The state is saved with the game, and loading a save keeps the values
  within their limits.

## Next stages

1. **Powers and progression trees.** Supernatural experience from missions and
   victories, energy capacity, offensive and defensive abilities, transformation
   stages with stronger effects, and challenging enemies and bosses.
2. **Paths drawn from Nigerian traditions** (Yoruba, Igbo, Edo and others).
   These need careful research and, ideally, cultural advisers:
   - each tradition stays distinct;
   - invented gameplay abilities are never presented as real religious belief;
   - sacred names and practices are not used as game mechanics.
3. **The sanctuary's other rooms:**
   - the mystical garden;
   - energy crystals;
   - the meditation and mastery room;
   - the power altar, which never grants unearned powers;
   - the purification pool;
   - protective barriers, under the anti-griefing rules;
   - the knowledge library.

   Each one is upgraded through play, never through essential purchases.
4. **Server validation** of levels, abilities, energy and unlocks, and
   multiplayer synchronisation once AYE has a backend.
