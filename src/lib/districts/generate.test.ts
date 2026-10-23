import { describe, expect, it } from 'vitest';
import { DISTRICTS } from '../geography';
import { COUNTRY_CODES, SUBDIVISIONS } from '../places';
import { generateDistrict, TEMPLATES } from './generate';
import { NIGERIA, SOUTH_WEST } from './nigeria';
import { districtById } from '../geography';
import { travelOptions } from '../travel';

describe('generated districts', () => {
  it('cover every Nigerian state, the Federal Capital Territory included', () => {
    const regions = new Set(DISTRICTS.filter((d) => d.city.country === 'NG').map((d) => d.city.region));
    for (const state of SUBDIVISIONS.NG.names) expect(regions.has(state), state).toBe(true);
  });

  it('have unique ids, cities and homes', () => {
    const ids = DISTRICTS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(DISTRICTS.map((d) => d.city.id)).size).toBe(DISTRICTS.length);
    const homes = DISTRICTS.flatMap((d) => d.homes.map((h) => h.id));
    expect(new Set(homes).size).toBe(homes.length);
    for (const d of DISTRICTS) for (const h of d.homes) expect(h.district).toBe(d.id);
  });

  it('use all three street plans, laid every way', () => {
    const generated = DISTRICTS.slice(2);
    const plan = (d: (typeof generated)[number]) => d.layout.roadHalfWidth === 5 && d.layout.pavementWidth === 3 ? 'avenue' : d.layout.buildings.length === 19 ? 'marina' : 'osu';
    const seen = new Set(generated.map((d) => `${plan(d)}:${Math.sign(d.layout.crossStreet.minZ)}:${Math.sign(d.travelDesk.position[0])}`));
    expect(seen.size).toBe(12);
    expect(generated.filter((d) => plan(d) === 'avenue').length).toBeGreaterThan(40);
  });

  it('are the same every time', () => {
    expect(generateDistrict(NIGERIA[0])).toEqual(generateDistrict(NIGERIA[0]));
  });

  it('turning a plan round keeps buildings, counters and benches in step', () => {
    const seed = { ...NIGERIA[0], style: SOUTH_WEST };
    const asBuilt = generateDistrict({ ...seed, template: 'marina', variant: 'as-built' });
    const turned = generateDistrict({ ...seed, template: 'marina', variant: 'turned' });
    const L = TEMPLATES.marina.spec;
    expect(asBuilt.travelDesk.position).toEqual(L.travelDesk.position);
    expect(turned.travelDesk.position).toEqual([-L.travelDesk.position[0], 0, -L.travelDesk.position[2]]);
    const b = turned.layout.park!.benches[0], o = L.layout.park!.benches[0];
    expect(b.x).toBeCloseTo(-o.x);
    expect(Math.cos(b.facing - o.facing)).toBeCloseTo(-1);
    // Parked buses stay on the right-hand kerb, facing the way the traffic goes
    for (const v of turned.layout.vehicles) expect(Math.cos(v.heading)).toBeCloseTo(Math.sign(v.position[0]));
  });

  it('name the shops and homes after the city, and price them for it', () => {
    const abuja = DISTRICTS.find((d) => d.city.id === 'abuja')!;
    const yenagoa = DISTRICTS.find((d) => d.city.id === 'yenagoa')!;
    // Built from the city's ID-stable plan, shown with its Songhai name
    expect(abuja.travelDesk.name).toBe('Wusara Travel');
    expect(abuja.layout.buildings.some((b) => b.name === abuja.nightlife.name)).toBe(true);
    expect(Math.max(...abuja.homes.map((h) => h.rentPerNight))).toBeGreaterThan(Math.max(...yenagoa.homes.map((h) => h.rentPerNight)));
  });

  it('reach every African country, and island capitals by air only', () => {
    const AFRICA = ['DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CV', 'CM', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'SZ', 'ET', 'GA', 'GM', 'GH',
      'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RW', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'TZ', 'TG', 'TN', 'UG', 'ZM', 'ZW'];
    expect(AFRICA).toHaveLength(54);
    const countries = new Set(DISTRICTS.map((d) => d.city.country));
    for (const c of AFRICA) expect(countries.has(c), c).toBe(true);
    const lagos = districtById('lagos.marina').city;
    const city = (id: string) => DISTRICTS.find((d) => d.city.id === id)!.city;
    expect(travelOptions(lagos, city('porto-novo')).map((o) => o.mode)).toEqual(['coach']);
    expect(travelOptions(lagos, city('lome')).map((o) => o.mode)).toEqual(['coach', 'flight']);
    expect(travelOptions(lagos, city('nairobi')).map((o) => o.mode)).toEqual(['flight']);
    expect(travelOptions(city('maputo'), city('antananarivo')).map((o) => o.mode)).toEqual(['flight']);
    expect(travelOptions(city('yaounde'), city('malabo')).map((o) => o.mode)).toEqual(['flight']);
  });

  it('reach every country and territory in the game, Vatican City aside', () => {
    const countries = new Set(DISTRICTS.map((d) => d.city.country));
    for (const c of COUNTRY_CODES) if (c !== 'VA') expect(countries.has(c), c).toBe(true);
  });

  it('drive on the left where the country does, and grow palms only where it is warm', () => {
    const tokyo = DISTRICTS.find((d) => d.city.id === 'tokyo')!;
    const paris = DISTRICTS.find((d) => d.city.id === 'paris')!;
    // Lagos (right-hand): the lane at negative x heads north; in Tokyo it heads south
    const north = (d: typeof tokyo) => d.layout.traffic.find((l) => l.dir === 1)!.x;
    expect(north(districtById('lagos.marina'))).toBeLessThan(0);
    expect(north(tokyo)).toBeGreaterThan(0);
    expect(north(paris)).toBeLessThan(0);
    expect(tokyo.layout.palms).toBeNull();
    expect(DISTRICTS.find((d) => d.city.id === 'bangkok')!.layout.palms).not.toBeNull();
  });

  it('only run coaches over land', () => {
    const city = (id: string) => DISTRICTS.find((d) => d.city.id === id)!.city;
    expect(travelOptions(city('paris'), city('brussels')).map((o) => o.mode)).toEqual(['coach', 'flight']);
    expect(travelOptions(city('london'), city('paris')).map((o) => o.mode)).toEqual(['flight']);
    expect(travelOptions(city('panama-city'), city('bogota')).map((o) => o.mode)).toEqual(['flight']);
    expect(travelOptions(city('cairo'), city('tel-aviv')).map((o) => o.mode)).toEqual(['flight']);
    expect(travelOptions(city('kuala-lumpur'), city('singapore')).map((o) => o.mode)).toEqual(['coach', 'flight']);
  });

  it('put cars on plain streets in Europe, minibuses and kekes on painted ones in Nigeria, jeepneys in Manila, and a mix in Mexico', () => {
    const find = (id: string) => DISTRICTS.find((d) => d.city.id === id)!.layout;
    const kinds = (id: string) => new Set([...find(id).vehicles.map((v) => v.kind ?? 'minibus'), ...find(id).traffic.map((l) => l.kind ?? 'minibus')]);
    expect([...kinds('london')]).toEqual(['car']);
    expect(find('london').streetStyle).toBe('plain');
    expect(kinds('kano')).toEqual(new Set(['tricycle', 'minibus']));
    expect(kinds('manila')).toEqual(new Set(['jeepney', 'tricycle']));
    expect(kinds('bangkok').has('tricycle')).toBe(true);
    expect(find('kano').streetStyle).toBe('painted');
    expect(kinds('mexico-city')).toEqual(new Set(['minibus', 'car']));
    expect(districtById('lagos.marina').layout.streetStyle ?? 'painted').toBe('painted');
  });
});

import { DISTRICTS as ALL } from '../geography';
import { resolveCollisions as resolve } from '../world';
describe('car dealers in generated cities', () => {
  it('each dealer is named for its city, with a clear door in front of its own showroom', () => {
    let n = 0;
    for (const d of ALL) {
      const id = d.id;
      if (!d.dealership) continue;
      n++;
      const b = d.layout.buildings.find((x) => x.name === d.dealership!.name);
      expect(b, `${id} showroom`).toBeTruthy();
      const [x, , z] = d.dealership.door;
      const r = resolve(x, z, undefined, d.layout.obstacles);
      expect(Math.hypot(r.x - x, r.z - z), `${id} door clear`).toBeLessThan(0.3);
      expect(Math.abs(z - b!.position[2])).toBeGreaterThan(b!.size[2] / 2);
    }
    expect(n).toBeGreaterThan(10);
  });
});
