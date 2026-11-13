// AYE's weather service: one real-world reading per city, shared by every player in it.
//
// GET /functions/v1/weather?city=lagos.marina&lat=6.45&lon=3.39&tz=Africa/Lagos
//
// Fetches the city's hourly weather (yesterday, today and tomorrow, in its own time zone) from
// Open-Meteo (open-meteo.com, data CC BY 4.0; no API key) and keeps it for 30 minutes, so the
// upstream service sees one request per city per half hour however many people play, and players
// in the same city get the same, authoritative weather. If a provider that needs a key is added
// later, the key lives here as a Supabase secret (Deno.env), never in the game's code.
//
// Deploy: supabase functions deploy weather --no-verify-jwt   (it serves public weather only)

const TTL_MS = 30 * 60_000;
const FIELDS = 'temperature_2m,relative_humidity_2m,precipitation,cloud_cover,visibility,wind_speed_10m,wind_direction_10m,weather_code';
const cache = new Map<string, { at: number; body: string }>();

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};
const reply = (status: number, body: string, extra: Record<string, string> = {}) =>
  new Response(body, { status, headers: { ...cors, 'Content-Type': 'application/json', ...extra } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'GET') return reply(405, JSON.stringify({ error: 'GET only' }));
  const q = new URL(req.url).searchParams;
  const lat = Number(q.get('lat')), lon = Number(q.get('lon'));
  const tz = q.get('tz') ?? 'UTC';
  const city = (q.get('city') ?? '').slice(0, 64);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180 || !/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$|^UTC$/.test(tz)) {
    return reply(400, JSON.stringify({ error: 'lat, lon and tz are required' }));
  }
  // Rounded so nearby requests for the same city share one entry
  const key = `${city}|${lat.toFixed(2)}|${lon.toFixed(2)}|${tz}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < TTL_MS) return reply(200, hit.body, { 'X-AYE-Cache': 'hit', 'Cache-Control': 'public, max-age=600' });
  const url = `https://api.open-meteo.com/v1/forecast?${new URLSearchParams({
    latitude: lat.toFixed(3), longitude: lon.toFixed(3), hourly: FIELDS, timezone: tz,
    wind_speed_unit: 'ms', past_days: '1', forecast_days: '2',
  })}`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    const body = await r.text();
    cache.set(key, { at: now, body });
    return reply(200, body, { 'X-AYE-Cache': 'miss', 'Cache-Control': 'public, max-age=600' });
  } catch (e) {
    // Upstream down: an older reading is better than none (the game labels it 'cached')
    if (hit) return reply(200, hit.body, { 'X-AYE-Cache': 'stale' });
    return reply(502, JSON.stringify({ error: String(e) }));
  }
});
