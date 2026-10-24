# The AYE phone

Everyone in AYE carries a phone. Press **P** (or the **Phone** button on the
bottom bar) to take it out. **Esc** goes back, and **P** puts it away again.
**L** still opens Life OS directly. You can't walk while the phone is open.

## How it works

| Part | Where |
| --- | --- |
| App list, phone data, saving, battery, message replies, notifications | `src/lib/phone.ts` (tests in `src/lib/phone.test.ts`) |
| Always-on hook: battery, notifications, saving | `src/hooks/usePhone.ts` |
| Phone frame, status bar, home pages, App Library, search, dock, notification centre, recent apps, back/home buttons | `src/components/phone/Phone.tsx` |
| App screens | `src/components/phone/apps.tsx` |
| Shared types and helpers, wallpapers, header titles | `src/components/phone/ui.ts` |
| Icons | `src/components/phone/icons.ts`, `glyphs.tsx` |
| Camera (reads a frame of the 3D world) | `src/components/phone/camera.ts`, `photoCapture.tsx` |
| Key ticks, chime and shutter sounds (Web Audio, no files) | `src/components/phone/sound.ts` |

There's one source of truth for your life. Money, home, job, cars and friends
all live in the game state (`lib/gameState.ts`, wrapped by `lib/life.ts`). The
apps only read that state and change it through game actions. The Bank's
statement is the game's own ledger (`life.ledger`).

The phone saves only its own things, on this device (localStorage key
`aye_phone_<characterId>`):

- wallpaper
- notification and sound settings
- dock and app order
- message threads
- photos (up to 24 small JPEGs)
- notifications (up to 40)
- battery level

Saved data is checked when it loads. Anything invalid is dropped, and new apps
are added to the home screen.

## Game actions the phone added

- `phoneFriend { residentId, kind: 'text' | 'call' }`: you can text or call someone you've met, wherever they are.
  - Once a day per person (`Relationship.lastPhone`).
  - A text gives +2 friendship and +6 social.
  - A call takes 10 minutes and gives +4 friendship and +12 social.
  - It doesn't use up meeting them in person that day.
- `ride { metres }`: a taxi.
  - Fare: 20 GHAI plus 0.3 GHAI per metre.
  - Takes 3 minutes plus 1 minute per 250 m. Living costs tick over during the ride.
  - Rides are capped at 3 km and refused if you can't pay.
  - The fare shows as "Taxi ride" in the statement.
  - The game moves you to the drop-off point after it is charged.

## The apps

| App | What it does |
| --- | --- |
| Bank | Balance, today's money in and out, every transaction grouped by day. Says plainly that GHAI isn't real money. |
| Wallet | Balance and your savings goal: set, track, clear (`setSavingsGoal`). |
| Jobs | Your career level, pay, hours to promotion and directions to work. Apply to Alafia Spa (`spaHire`). |
| Messages | Threads with people you've met. Preset texts; they reply in their own words at your friendship level. |
| Phone | Call a contact. While it rings you can hang up for free; a connected call takes 10 minutes. |
| Contacts | Everyone you've met, with friendship level and progress, and buttons to message, call or find them in town. |
| Cars | Your garage (where each car is, its resale value) and selling. The showroom lists prices; you buy and pick the colour at the dealer. |
| Houses | Your home, homes you own (move in), OGM Homes listings (buy, with a confirmation step) and flats to let. You rent in person at the door. |
| Shops | Shops and food places in this city, with distance. Walk, or take a taxi. |
| Ride | Search a destination, see the fare and journey time, then book. Only from the street, not while driving or sitting. |
| Health | Mood, hunger and needs, plus what to do next (the game's own suggestions) with directions. |
| Alafia Spa | Opening hours, treatments and prices, and directions. |
| Events | What's on today and the next three days. Directions to today's event. |
| Courses | Your skills, progress and how to grow each one. |
| Songhai Gist | Stories built from your game: today's event, your achievements, promotions, OGM Homes listings, the dealer and the spa. |
| Travel, Maps, Life OS | Open the game's own panels. Maps needs the Smartphone upgrade from the gadget shop, as before, and says so. |
| Calculator | A working calculator. |
| Camera, Photos | Takes a real picture of the 3D view, kept on the device. View it or delete it. |
| Help & Guide | Controls and the basics. |
| Settings | Wallpaper; notifications and sounds on or off; arrange the dock and home screen; battery; clear notifications; game settings (Life OS). |

### Battery and notifications

The battery drains about 2.5% per game hour. It charges at 40% an hour while
you're at your own home. A flat phone shows a "charge at home" screen; Life OS
still opens with L.

Notifications come from real changes in your game:

- money in or out (except the running wages and living-costs lines and fuel)
- the morning statement
- promotions
- eviction
- achievements
- today's event

They show as a banner when the phone is away, as a badge on the Phone button,
and in the notification centre (tap the status bar).

## What's simulated, and what isn't

- **Residents** are computer-controlled and labelled as such. There are no other players, and nothing is sent anywhere.
- **Taxi drivers** are computer-controlled.
- **GHAI** is in-game money only. Nothing on the phone takes real payments, and there's no gambling or betting.
- There's no server behind the phone. Messages, photos and settings stay in this browser.
- Ideas for later that need a backend, with consent and moderation designed first:
  - real multiplayer chat
  - shared marketplaces
  - cloud backup of photos
