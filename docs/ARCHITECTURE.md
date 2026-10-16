# AYE: Milestone 0 audit and architecture

Written October 2026 against branch `claude/wonderful-franklin-gixkta`
(commit after `b2f0b1f`). Everything marked **verified** was run or tested
in a browser; everything else is a recommendation.

## 1. Audit: what exists

### Where the code lives

| Location | What it is | Status |
|---|---|---|
| GitHub `ogmjbrand/AYE`, branch `claude/wonderful-franklin-gixkta` | The game: React 19 + Vite 8 + TypeScript + Three.js / React Three Fiber | **Verified working.** Type check, lint, 92 tests and production build pass. |
| GitHub `ogmjbrand/AYE`, branch `main` | An older state of the same game | 22 commits behind the working branch. Not yet merged (needs your approval). |
| Laptop `C:\Users\kolak\AYE\aye-web` | Your local copy of the game (earlier sessions) | Tracks the GitHub repo. |
| Laptop `C:\Users\kolak\AYE\aye` | An interrupted Next.js scaffold | **Not visible to Claude** (the cloud environment can't reach your laptop). It doesn't exist in the GitHub repository. See section 5 for commands to inspect it. |

Environment: Node 22.22, npm 10.9 in the cloud environment. Your laptop
uses Windows PowerShell, so the commands there are `npm.cmd`.

### What the game already does (verified in a browser)

| Spec milestone | State |
|---|---|
| 1. Entry experience | **Working:** title screen with the AYE mark, Continue / Start a new life (with a warning before replacing a saved life), How to play, and a remembered graphics-quality setting. The in-game Menu button returns here without losing anything. Sign-in arrives with Milestone 4. |
| 2. Character creation | **Working:** body shape (5 presets plus build, muscle, hips and belly sliders), name, gender (incl. non-binary, prefer not to say), self-identified race/heritage and ethnic group, country (200) and state/region, 12 distinct realistic people (Microsoft Rocketbox, MIT), height, live 3D preview. Gaps: no face/body sliders, no hairstyles, no Black woman in the free library. |
| 3. First playable district | **Working:** one Lagos-inspired street, third-person movement (keyboard plus touch stick), collision, motion-captured idle/walk/run, day/night lighting, skyline, interaction with 3 food vendors, a boutique and career workplaces. |
| 4. Persistent player life | **Partly:** clock, balance, wages, living costs, hunger, sleep, daily ledger, wardrobe. Saved **only in the browser (localStorage)** and decided **in the client**, so any player can edit their money. Not acceptable once there are accounts, trading or real money. **Server side written and tested, not switched on:** a Supabase migration with row-level security, an append-only wallet ledger and the only functions that move money, tested against real Postgres in the test suite (see `BACKEND.md`). Switching on needs your approval. |
| 5. Lifestyle loop | **Partly:** work → paid per minute at the workplace → spend on food and clothes → sleep → daily summary. |
| 6. Careers, homes, fashion | Careers: a workplace and a five-level ladder per career (e.g. House officer → Consultant), promoted by hours worked, each level raising pay. Equipment from the Gadget Hub: a smartphone (district map) and a work kit per career (+10% pay). Homes: four flats to rent at their front doors (room to penthouse), with a move-in fee, nightly rent, eviction if you can't pay, and rough sleeping otherwise; no interiors yet. Fashion: boutique, salon, wardrobe (fabrics/prints/hair colour on the existing garments; no new cuts or hairstyles yet). |
| 7. Global expansion | **Working:** a second city, Accra (Oxford Street, Osu, Ghana), with its own street layout (wider road, junction to the north, tro-tros), neighbourhoods, Ghanaian food (chop bar, waakye joint, kelewele stall), a kente boutique, gadget shop, three homes and a workplace for every career. Travel desks in both cities sell flights (2,500 ⓒ, 3 h) and coaches (800 ⓒ, 12 h); the clock, rent and hunger keep running on the way. Each district is one data file in `src/lib/districts/`; every layout and placement test runs against each district. |
| 8. Social and multiplayer | **Social, offline:** three residents per city (computer-controlled and labelled so, never shown as players) with friendship levels, daily chats, treats and hang-outs, and a couch to sleep on once you're close. **Multiplayer:** not started; it needs the backend from Milestone 4. |
| 9–10 | Not started (the creator economy needs the backend, legal review and safety tooling first). |

### Code layout

```
src/lib/         game rules and data (pure, tested): gameState, save, food, fashion,
                 looks, identity, places, careers, world, geography (new)
src/components/  React UI and 3D character (HUD, creation, shop, avatar, shaders)
src/world/       3D city rendering (buildings, streets, props, lighting, quality tiers)
src/hooks/       player controller, game clock
scripts/         asset tooling (asset check, GLB optimise, Rocketbox build, garment maps)
public/assets/   models (17 MB, loaded on demand), HDRIs, brand logo, CREDITS.md
docs/            this file, asset checklist, character pipeline proposal, art direction
```

About 6,000 lines of TypeScript, 92 tests. Main bundle 393 KB gzipped;
post-processing (160 KB) loads only on the High quality tier.

### Licences in use (verified)

Microsoft Rocketbox characters and animations: MIT (credited). Poly Haven
HDRIs: CC0. Google Fonts: OFL. The earlier Mixamo-derived avatar, which could
not be redistributed, has been removed. No paid or unlicensed assets.

## 2. Recommended architecture

AYE splits into four parts with clear boundaries.

| Part | Job | Technology | When |
|---|---|---|---|
| **Game client** | Everything the player sees and controls in 3D: districts, characters, HUD, shops, wardrobe | **This repository** (Vite + React + R3F), running in the browser on desktop and mobile | Now |
| **Game backend** | Accounts and the **authoritative** player state: wallet ledger, inventory, career progress, saves. The client asks; the server decides. | **Supabase** (Postgres, Auth, Row Level Security). Money-changing actions are Postgres functions the client calls, never direct table writes. | Milestone 4 |
| **Web platform** | Public site, sign-up, profiles, social feed, creator pages, later payments | Next.js is a reasonable choice **when these pages exist**. Until then the game client can host a simple entry screen. | Milestones 8–9 |
| **Realtime / multiplayer** | Shared spaces, presence, chat | A dedicated authoritative game server (e.g. Colyseus on Node), with Supabase Realtime only for non-authoritative presence | Milestone 8, after the single-player loop is stable |

Rules that keep this scalable:

- **Game rules stay out of the UI.** They live in `src/lib` as pure, tested
  functions. The same rules can run on the server later, so client and
  server agree.
- **The world is data.** `src/lib/geography.ts` models City → District →
  Places, and each district is one file in `src/lib/districts/` (street
  layout, neighbourhoods, vendors, shops, homes, workplaces, travel desk).
  Lagos and Accra both run on the same engine; a third city is a new file.
- **Assets load per district and per character**, never all at once.
- **One virtual currency (ⓒ)**, separate from any future real-money
  balance. They must never be mixed (section 7).

### Unreal Engine 5 (future option, not now)

UE5 gives far higher fidelity (MetaHuman, Nanite, Lumen). However:

- it no longer exports to the web;
- browser play would need Pixel Streaming, which means paying for cloud GPUs per player;
- the editor wants a dedicated GPU, and your laptop has Intel integrated graphics.

Re-evaluate at Milestone 10, ideally with a dedicated-GPU machine and a
native PC/mobile build in mind. The data model and backend above carry over
to any client.

## 3. The next milestone: Milestone 4, "persistent, trustworthy player life"

Milestones 2 and 3 already work. The biggest risk is that money and
progress live only in the browser and can be edited. Fixing this comes before
more content.

**Goal:** a player signs in, and their character, wallet, wardrobe and
progress are stored on the server. Every change to money goes through
server-side rules.

**Scope (small):** email sign-in; tables for profiles, characters,
wallet_transactions (append-only ledger) and inventory; server functions for
`work_shift_payout`, `buy_item` and `buy_food`; the client loads and saves
through them; offline play still works as a guest with a clear "not saved
online" note.

**Acceptance criteria:**
1. A new account can create a character, close the browser, sign in on
   another device and continue with the same balance, outfit and day.
2. Editing localStorage or calling the database directly cannot add money:
   balance is the sum of the ledger, and only server functions write to it.
3. Buying an item you can't afford is refused by the server, not just the
   button.
4. Wages are only credited for time the server accepts (bounded per real
   minute, so a modified client can't claim a year's pay).
5. Type check, lint, tests (including database-function tests) and build
   pass; the flow is demonstrated in a browser.

The entry experience (Milestone 1) can be built alongside it, because sign-in
needs an entry screen anyway.

## 4. Decisions needed from you before Milestone 4

1. **Supabase project:** create one on the free tier under your account
   (no cost; free-tier limits apply and can change). I can then connect and
   build the schema.
2. **The Next.js scaffold at `C:\Users\kolak\AYE\aye`:** keep it untouched
   for later (recommended), or delete it. I won't touch it without your say.
3. **Merge to `main`:** make the working branch the main version, so your
   laptop and GitHub default show the current game.

## 5. Commands for your laptop (PowerShell), to finish the audit

| Command | What it does |
|---|---|
| `cd C:\Users\kolak\AYE` | Go to the outer AYE folder. |
| `dir` | List what's inside, to confirm which folders exist (`aye`, `aye-web`). |
| `type aye\package.json` | Show the scaffold's name, scripts and dependencies, to see how far it got. |
| `git -C aye status` | Say whether the scaffold is a git repository and has uncommitted work. |
| `node -v` and `npm.cmd -v` | Show your Node and npm versions (Node 20+ is needed). |

Paste the output back. Nothing here changes any files.

## 6. Risks to decide on

| Risk | Detail | Suggested handling |
|---|---|---|
| **Performance on your laptop** | Real frame rate on Intel integrated graphics is still unmeasured; the cloud test renderer can't measure it. | Please report the FPS shown in the top bar on High and on Low. |
| **Character realism ceiling** | Free MIT characters are 2010s quality and limited (no Black woman, no hairstyle changes). | MPFB2 (free, CC0) for a parametric system; Reallusion (paid) for premium. See `CHARACTER_PIPELINE.md`. Needs the MakeHuman asset pack from you. |
| **Hosting** | Vercel's free Hobby plan is for non-commercial use; a monetised AYE would need a paid plan or another host. | Decide at public launch, not now. |
| **Creator economy / real money** | Payouts need legal review, identity and age checks, payment-provider approval, tax handling and fraud controls per country. | Keep virtual currency only; no cash-out until those are in place (Milestone 9+). |
| **User data and safety** | Accounts mean personal data; social features need moderation and reporting. | Minimal data in Milestone 4 (email, character); moderation tools before any social/multiplayer launch. |
| **Supabase free tier** | Projects can pause after inactivity and have size limits. | Fine for development; revisit before launch. |
