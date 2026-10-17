import { describe, expect, it } from 'vitest';
import { DISTRICTS, districtById } from './geography';
import { areaAt, compass, distanceTo, locationsFor, matchesQuery, type LocationEntry } from './locations';

const marina = districtById('lagos.marina');

describe('locationsFor', () => {
  const entries = locationsFor(marina, 'student', marina.homes[0].id);

  it('lists every built place from the district data', () => {
    const built = entries.filter((e) => e.built);
    expect(built.length).toBe(
      marina.vendors.length + 3 /* fashion, gadgets, travel */ + marina.homes.length + Object.keys(marina.workplaces).length + 1 /* park */,
    );
    for (const v of marina.vendors) expect(entries.find((e) => e.id === `${marina.id}.${v.id}`)?.position).toEqual(v.position);
  });

  it('places shops, the travel desk and workplaces where the district puts them', () => {
    expect(entries.find((e) => e.id === `${marina.id}.fashion`)?.position).toEqual(marina.fashionHouse.position);
    expect(entries.find((e) => e.id === `${marina.id}.gadgets`)?.position).toEqual(marina.gadgetHub.position);
    expect(entries.find((e) => e.id === `${marina.id}.travel`)?.position).toEqual(marina.travelDesk.position);
    expect(entries.find((e) => e.id === `${marina.id}.work.doctor`)?.position).toEqual(marina.workplaces.doctor.position);
  });

  it('marks only your career workplace as yours', () => {
    expect(entries.filter((e) => e.yours && e.id.includes('.work.')).map((e) => e.id)).toEqual([`${marina.id}.work.student`]);
    const workplace = entries.find((e) => e.id === `${marina.id}.work.doctor`)!;
    expect(workplace.activities).toEqual(['Work here if your career is doctor']);
  });

  it('marks only the rented home as yours and carries its real rent', () => {
    const home = marina.homes[0];
    const mine = locationsFor(marina, 'none', home.id).filter((e) => e.yours && e.id.includes('.home.'));
    expect(mine.map((e) => e.id)).toEqual([`${marina.id}.home.${home.id}`]);
    const rent = entries.find((e) => e.id === `${marina.id}.home.${marina.homes[1].id}`);
    expect(rent?.rentPerNight).toBe(marina.homes[1].rentPerNight);
  });

  it('lists prototype location types with no position and nothing to do', () => {
    const protos = entries.filter((e) => !e.built);
    expect(protos.map((e) => e.name)).toEqual(expect.arrayContaining(['Shopping mall', 'Bank', 'Gym', 'Clinic', 'Public library', 'Beach', 'Nightclub', 'Hotel']));
    for (const p of protos) {
      expect(p.position).toBeNull();
      expect(p.activities).toEqual([]);
      expect(p.use).toBeNull();
    }
  });

  it('only gives a panel action to places that have one in the game', () => {
    for (const e of entries.filter((x) => x.use)) expect(e.built && e.position).toBeTruthy();
    expect(entries.find((e) => e.id === `${marina.id}.park`)?.use).toBeNull();
  });

  it('places the park at the centre of its neighbourhood bounds', () => {
    expect(entries.find((e) => e.id === `${marina.id}.park`)?.position).toEqual([10, 0, 27.5]);
  });

  it('builds for every district', () => {
    for (const d of DISTRICTS) expect(locationsFor(d, 'none', null).length).toBeGreaterThan(0);
  });
});

describe('areaAt', () => {
  it('names the neighbourhood a point is in', () => {
    expect(areaAt(marina, -5.2, -4.5)).toBe('Downtown');
    expect(areaAt(marina, 999, 999)).toBeNull();
  });
});

describe('matchesQuery', () => {
  const entry = locationsFor(marina, 'none', null).find((e) => e.id === `${marina.id}.fashion`) as LocationEntry;
  it('matches name, description, area, category and activities, ignoring case', () => {
    expect(matchesQuery(entry, 'fashion')).toBe(true);
    expect(matchesQuery(entry, 'SALON')).toBe(true);
    expect(matchesQuery(entry, 'boutiques')).toBe(true);
    expect(matchesQuery(entry, 'try on')).toBe(true);
    expect(matchesQuery(entry, 'bank')).toBe(false);
  });
  it('matches everything for an empty or blank query', () => {
    expect(matchesQuery(entry, '')).toBe(true);
    expect(matchesQuery(entry, '   ')).toBe(true);
  });
});

describe('distance and direction', () => {
  it('has no distance for a prototype', () => {
    const proto = locationsFor(marina, 'none', null).find((e) => !e.built)!;
    expect(distanceTo(proto, 0, 0)).toBeNull();
  });
  it('measures straight-line metres to a spot', () => {
    const shop = locationsFor(marina, 'none', null).find((e) => e.id === `${marina.id}.fashion`)!;
    const [sx, , sz] = shop.position!;
    expect(distanceTo(shop, sx + 3, sz + 4)).toBeCloseTo(5);
  });
  it('gives compass points with east on the -x side', () => {
    expect(compass(0, 10)).toBe('N');
    expect(compass(-10, 0)).toBe('E');
    expect(compass(0, -10)).toBe('S');
    expect(compass(10, 0)).toBe('W');
    expect(compass(-10, 10)).toBe('NE');
  });
});
