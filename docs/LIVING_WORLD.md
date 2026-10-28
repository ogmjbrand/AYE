# The living world

What AYE's "Living World" plan asks for, what is built, and what comes next.
The full brief covers careers that play like their own games, unexpected
events, real multiplayer, crime and law, the GHAI economy, reputation, a
1-billion-GHAI hero mode and a developer control centre. It is being built in
phases. Each phase has to work in the game, persist in saves and pass the
tests, not just show an interface.

## Phase 1: built

**Unexpected events** (`src/lib/liveEvents.ts`, `src/world/LiveEventScene.tsx`, `src/components/LiveEventUI.tsx`)

- An event director starts one event at a time, then rests before the next.
  The player chooses the pace in Life OS → Settings → The living world:
  Off, Calm, Normal or Lively. With Off nothing happens, so peaceful play is
  always possible.
- There are five events, each with roles and objectives:
  - a road accident on the cross street;
  - someone collapsing on the pavement;
  - a missing elderly man who must be found and walked home;
  - a broken-down car;
  - a restaurant rush, where a business owner can run the floor.
- Some objectives need a career, so first aid needs a doctor and making cars
  safe needs an engineer. Calling it in needs a phone. Steps unlock in order.
- Rewards are paid only for objectives completed at the scene, once each, and
  each takes game time. Standing nearby earns nothing. Missing an event costs
  nothing, because the computer-controlled services deal with whatever is left.
- Leaving before finishing something you started costs a little
  professional standing, for example starting first aid and not handing over.
  It is proportionate and can be won back.
- Everyone at an event is labelled computer-controlled, including the police
  and paramedics, who arrive after a few minutes.
- Saves keep the event, the history and reputation. Earnings are recomputed
  from the completed objectives on load, so an edited save can't claim more.

**Reputation** (`src/lib/reputation.ts`)

- There are five categories: community trust, professional standing, business
  reputation, social popularity and fashion influence.
- The tiers are Unknown, Known locally, Respected, Renowned and Legendary.
- Reputation is shown in Life OS → Profile. It is built by actions, never
  bought. It never goes below 0, and nothing basic needs it.

**Achievements**

- First responder, Pillar of the community and Respected.

## Next phases

| Brief section | Plan |
|---|---|
| Professions as full games (fashion competitions, dance, martial arts, military) | One career mode at a time, each with its own controls, scoring and progression, starting with themed fashion competitions on top of the existing showcase. |
| More events and multi-profession missions (fires, floods, festivals, a citywide storm) | New templates for the director. Large multi-stage missions need more professions in the game, such as police, firefighters and mechanics. |
| Hero mode (1,000,000,000 GHAI unlock) | The unlock is checked against the balance, kept after spending and never deducted. It needs server verification before it means anything, so it waits for the backend. |
| Crime, law and consequences | Investigations, wanted status, fines and courts, with protection against griefing. This needs real players and a server first. |
| Economy monitoring | Earnings per hour, prices, inflation and suspicious transfers, from a server-side GHAI ledger. |
| Developer control centre | An operator-only console with audit logs to start events and missions. It requires server roles and authentication. |

## What needs a server

Real multiplayer needs a backend that isn't running yet:
- other players in the world, chat and voice;
- leaderboards;
- server-verified GHAI balances, purchases and unlocks;
- moderation and reporting;
- the developer console.

The Supabase schema and account functions are in `supabase/` and
`src/backend/auth.ts`. They still need to be applied to the project, with its
keys set in the deployment.

Until then, everything runs on the player's device and is labelled that way.
AYE never shows computer-controlled people as online players.
