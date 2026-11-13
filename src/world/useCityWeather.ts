import { useEffect, useMemo, useState } from 'react';
import type { District } from '../lib/geography';
import { cachedCityWeather, cityWeatherAt, refreshCityWeather, REFRESH_MS, type CityWeatherData } from '../lib/liveWeather';
import { weatherAt, type Weather } from '../lib/weather';
import { devWeatherOverride, resolveWeather } from '../lib/weatherEvents';

/**
 * The weather in this city at this game time, by AYE's priority (lib/weatherEvents.ts): a dev test
 * override, a special event in this city, the real weather for this city and hour, or AYE's own
 * simulation when there's no real data (offline, the service down, or before the first reply).
 * Each city is fetched separately and kept refreshed while you're in it.
 */
export function useCityWeather(district: District, totalMinutes: number): Weather {
  const city = district.city;
  // The latest reply, for whichever city it was for; arriving somewhere new reads what we already know of it
  const [fetched, setFetched] = useState<{ id: string; data: CityWeatherData | null } | null>(null);
  const data = fetched?.id === city.id ? fetched.data : cachedCityWeather(city.id);
  useEffect(() => {
    let live = true;
    const place = { id: city.id, lat: city.lat, lon: city.lon, timeZone: city.timeZone };
    const pull = () => refreshCityWeather(place).then((d) => { if (live) setFetched({ id: place.id, data: d }); });
    pull();
    const timer = window.setInterval(pull, REFRESH_MS / 3);
    return () => { live = false; window.clearInterval(timer); };
  }, [city.id, city.lat, city.lon, city.timeZone]);
  const dev = useMemo(() => devWeatherOverride(window.location.search, import.meta.env.DEV), []);
  // Recomputed each game minute: the real hours blend smoothly, so a minute is plenty
  const minute = Math.floor(totalMinutes);
  return useMemo(() => {
    const localHour = (minute % 1440) / 60;
    const live = cityWeatherAt(data, city.timeZone, localHour);
    return resolveWeather(district.id, minute, live, weatherAt(district.id, minute), dev);
  }, [data, city.timeZone, district.id, minute, dev]);
}
