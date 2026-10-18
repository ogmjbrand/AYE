import { describe, expect, it } from 'vitest';
import { CATEGORIES, categoryCounts, cityDirectory, filterDirectory } from './cityDirectory';
import { DISTRICTS, counterAt } from './geography';
import { nearestVendor } from './food';
import { homeAtDoor } from './homes';
import { venueAt } from './nightlife';
import { parkAt } from './parks';
import { isAtWorkplace } from './careers';
import { findPath, walkGridFor } from './pathfinding';
import type { Career } from '../components/CharacterCreation';

const lagos = DISTRICTS[0];

describe('city directory', () => {
  it('lists the real vendors, shops, desk, homes and workplaces at their game coordinates', () => {
    const list = cityDirectory(lagos, 'doctor', null);
    const mamaPut = list.find((d) => d.name === 'Mama Put')!;
    expect(mamaPut.status).toBe('open');
    expect(mamaPut.position).toEqual({ x: -5.2, z: -4.5 });
    expect(list.filter((d) => d.categories.includes('residential')).length).toBe(lagos.homes.length);
    expect(list.filter((d) => d.categories.includes('restaurants')).length).toBe(lagos.vendors.length);
  });

  it('only your own workplace is open; the rest are honest "visit" entries', () => {
    const list = cityDirectory(lagos, 'doctor', null);
    expect(list.find((d) => d.id.endsWith('work.doctor'))!.status).toBe('open');
    expect(list.find((d) => d.id.endsWith('work.student'))!.status).toBe('visit');
    expect(list.find((d) => d.id.endsWith('work.student'))!.categories).toContain('universities');
    expect(list.find((d) => d.id.endsWith('work.athlete'))!.categories).toContain('gyms');
  });

  it('marks the mall as planned, with nowhere to walk to; nightlife and parks are real', () => {
    const list = cityDirectory(lagos, 'doctor', null);
    const planned = list.filter((d) => d.status === 'planned');
    expect(planned.map((d) => d.categories[0]).sort()).toEqual(['shopping']);
    expect(list.find((d) => d.categories.includes('parks'))).toMatchObject({ name: lagos.park.name, status: 'open' });
    expect(list.find((d) => d.categories.includes('nightlife'))).toMatchObject({ name: lagos.nightlife.name, status: 'open' });
    for (const p of planned) expect(p.position).toBeUndefined();
  });

  it('every category has at least one entry', () => {
    const counts = categoryCounts(cityDirectory(lagos, 'pilot', null));
    for (const c of CATEGORIES) expect(counts[c.id], c.id).toBeGreaterThan(0);
  });

  it('searches names, kinds and category labels, nearest first and planned last', () => {
    const list = cityDirectory(lagos, 'doctor', null);
    expect(filterDirectory(list, 'all', 'buka', { x: 0, z: 0 }).map((d) => d.name)).toEqual(['Mama Put']);
    expect(filterDirectory(list, 'all', 'HOSPITAL', { x: 0, z: 0 }).length).toBeGreaterThan(0);
    const shops = filterDirectory(list, 'shopping', '', { x: 0, z: 40 });
    expect(shops[0].distance!).toBeLessThanOrEqual(shops[1].distance!);
    expect(shops[shops.length - 1].status).toBe('planned');
  });

  it('every walkable destination can be reached, and arriving there triggers its real interaction', () => {
    for (const d of DISTRICTS) {
      const grid = walkGridFor(d.layout.obstacles);
      const from = { x: d.spawn[0], z: d.spawn[2] };
      // The same destination comes up for every career: find its route once
      const routes = new Map<string, ReturnType<typeof findPath>>();
      for (const career of ['doctor', 'student', 'athlete', 'pilot', 'artist', 'engineer', 'entrepreneur'] as Career[]) {
        for (const dest of cityDirectory(d, career, null).filter((x) => x.position)) {
          if (!routes.has(dest.id)) routes.set(dest.id, findPath(grid, from, dest.position!));
          const path = routes.get(dest.id)!;
          expect(path, `${dest.id}`).not.toBeNull();
          const end = path![path!.length - 1];
          // Within 0.35 m of the route's end is where the walk stops
          const at = { x: end.x, z: end.z };
          const key = dest.id.slice(d.id.length + 1);
          if (dest.categories.includes('restaurants')) expect(nearestVendor(d.vendors, at.x, at.z)?.id, dest.id).toBe(key);
          else if (key === 'fashion' || key === 'gadgets' || key === 'travel') expect(counterAt(d, at.x, at.z), dest.id).toBe(key);
          else if (key.startsWith('park.')) expect(parkAt(d.park, at.x, at.z)?.id, dest.id).toBe(d.park.id);
          else if (key.startsWith('night.')) expect(venueAt(d.nightlife, at.x, at.z)?.id, dest.id).toBe(d.nightlife.id);
          else if (key.startsWith('home.')) expect(homeAtDoor(d.id, at.x, at.z)?.id, dest.id).toBe(key.slice(5));
          else if (key.startsWith('work.') && dest.status === 'open') expect(isAtWorkplace(d, career, at.x, at.z), dest.id).toBe(true);
        }
      }
    }
  }, 120_000);
});
