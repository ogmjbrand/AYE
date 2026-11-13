# Weather

Updated 13 November 2026.

AYE's weather is the real weather of each city. Special gameplay events can override it within their own zone and time, and AYE's own simulation stands in when there's no real data. It all extends the weather system that already existed (`lib/weather.ts`); there's no second weather controller.

## Where each city's weather comes from

| Priority | Source | `source` field |
|---|---|---|
| 1 | Development override: `?weather=clear\|cloudy\|rain\|storm\|fog\|wind` (dev server only) | `simulated`, with `event.label` "Test weather: …" |
| 2 | A special event in this city now: severe thunderstorm, extreme rainfall with flooding, dense fog, strong wind | `event`, with the event's name |
| 3 | The real weather for this city and hour | `live`, or `cached` when the reading is over an hour old |
| 4 | AYE's simulated weather (offline, no data yet, service down): the original deterministic model | `simulated` |

**Real-world data**
- **Provider:** Open-Meteo (open-meteo.com), data licensed CC BY 4.0. It needs no API key, so there's nothing secret in the game.
- **How it's fetched:** by each city's own coordinates, in its own time zone, hourly for yesterday, today and tomorrow. Readings: temperature, humidity, precipitation, cloud cover, visibility, wind speed and direction, and WMO weather code (thunderstorm, fog, drizzle).
- **Path:** the game asks AYE's Supabase Edge Function `weather` first (`supabase/functions/weather`). It fetches once per city per 30 minutes and serves the same answer to every player in that city. If it doesn't answer, the game asks Open-Meteo directly.
- **Caching:** results are kept in memory and in the browser for 12 hours. After a failure the game waits 5 minutes before trying again.
- **Game time and real time:** the game clock runs 20× faster than real time (a game day is 72 real minutes). So each city shows its real weather for today's hour that matches the game clock: 14:00 game time in Tokyo shows Tokyo's real 14:00. When the game clock and the real clock line up, it's exactly what's outside. Hours in between blend smoothly.
- **Wetness:** comes from the last six real hours of rain, so streets stay wet after a shower and dry over about two hours.
- **Cities:** each city in the game has its own weather, including London, Paris, Tokyo and Abu Dhabi, and every generated city (all have coordinates). New York and Dubai aren't in the game yet; they'll get their own weather when added.

**Special events** (`lib/weatherEvents.ts`)
- Rare: at most one a day per city.
- Chosen from the city and the game day alone, so every player in that city sees the same event at the same moment. They build up over 30 game minutes and clear over 30, handing back to the real weather smoothly.
- Always labelled as an event, never presented as real weather. The HUD shows the event's name.

## What the weather does in the world

| | Built |
|---|---|
| **Sun** | Each city's real sun position for its latitude and today's date (`lib/sun.ts`). It sets direction, height, strength and sunrise/sunset: London is dark by about 16:30 in November, Lagos at about 18:00. Clouds take up to three-quarters of its strength. It never shines at night. Night uses the existing moonlight, stars, street lamps and window glow. |
| **Rain** | Streaks at a raindrop's real speed (about 9 m/s), slanted by the actual wind speed and direction, as heavy as the rain. Drops stop on the roof of whatever is overhead (buildings, buses, shelters), so it never rains through a roof. Up to 2,000 streaks on high quality, 700 on low; nothing is drawn when dry. |
| **Wet streets** | Roads and pavements darken and shine gradually as the rain goes on. Puddles gather in the gutters and ripple under the drops. Both dry out over about two hours after it stops: the existing wet-street system, now fed real rain. |
| **Wind** | Palm fronds and park tree crowns sway downwind with gusts, further and faster as the wind rises (a shader on the GPU, no CPU cost per tree). The rain slants with it. |
| **Fog and visibility** | The real visibility (fog, haze, a downpour) brings the fog in, down to about 22 m in dense fog. |
| **Thunderstorms** | Lightning in 2–3 return-stroke pulses lights the whole scene (buildings, streets, people) from the strike's direction, plus a sky flash. It strikes more often the stronger the storm. Thunder follows after the time sound takes to travel the distance (3 s per km), sharp when close and a rumble when far. |
| **Sound** | Rain hiss that swells with the rain, and thunder. Indoors both are muffled through walls. Generated in the browser (no audio files), and starts after the player's first tap or key, as browsers require. |
| **People** | Passers-by go indoors in the rain: a shower keeps about half the street, a thunderstorm only a few. No penalties to the player. |
| **HUD** | What it's doing and the temperature ("Rain 24°C"), or the event's name. |

## Not done yet
- **Clouds** are a sky tint by cover, not 3D cloud shapes. No moving clouds and no cloud shadows on the ground.
- **No snow:** snow is shown as rain.
- **Missing details:** no umbrellas, raindrops on windows, windscreen wipers, splash particles, or water flowing to drains.
- **Clothing and temperature:** temperature is shown, but doesn't yet affect characters' comfort or clothing.
- **Indoors:** the rain sound is muffled, but windows don't show rain.
- **Edge Function deployment:** it's written, but your Supabase project is paused, so it couldn't be deployed. Until it is, the game asks Open-Meteo directly from the browser.
- **Testing:** this cloud session can't reach Open-Meteo, so live data was tested with recorded responses and the fallback in the game. The scenes were checked in the browser through the development override.

## Files
- **Libraries:** `src/lib/liveWeather.ts`, `src/lib/weatherEvents.ts`, `src/lib/sun.ts`, `src/lib/lightning.ts`, `src/lib/weatherAudio.ts`, `src/lib/rainCover.ts`; `src/lib/weather.ts` (extended).
- **World:** `src/world/useCityWeather.ts`, `src/world/Lightning.tsx`, `src/world/wind.ts`, `src/world/WindDriver.tsx`; `src/world/Rain.tsx`, `SceneLighting.tsx` and `timeOfDay.ts` (extended).
- **Edge Function:** `supabase/functions/weather/index.ts`. Deploy with `supabase functions deploy weather --no-verify-jwt`. It serves public weather only, and the game's publishable key isn't a JWT.
- **Tests:** `src/lib/liveWeather.test.ts` (25 tests).
