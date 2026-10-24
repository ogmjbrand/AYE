import { describe, expect, it } from 'vitest';
import { cityDirectory } from './cityDirectory';
import { DISTRICTS } from './geography';
import { locationsFor } from './locations';
import { findPath, walkGridFor } from './pathfinding';

describe('car dealership location integration', () => {
  it('lists every city’s car dealer in both routeable directories, at its door on the map', () => {
    for (const district of DISTRICTS.filter((d) => d.dealership)) {
      const dealer = district.dealership!;
      const destination = cityDirectory(district, 'student', null).find((item) => item.id === `${district.id}.car-dealership`);
      const location = locationsFor(district, 'student', null).find((item) => item.id === `${district.id}.car-dealership`);
      const mapPlace = district.places.find((item) => item.name === dealer.name);
      expect(destination, district.id).toMatchObject({ name: dealer.name, status: 'open', categories: ['vehicles', 'shopping'] });
      expect(location, district.id).toMatchObject({ name: dealer.name, category: 'vehicles', built: true, use: 'dealership' });
      expect(destination?.position).toEqual({ x: dealer.door[0], z: dealer.door[2] });
      expect(location?.position).toEqual(dealer.door);
      expect(mapPlace?.position).toEqual(dealer.door);
    }
  });

  it('can walk from the Lagos Marina arrival point to its car dealer', () => {
    const district = DISTRICTS.find((item) => item.id === 'lagos.marina')!;
    const destination = cityDirectory(district, 'student', null).find((item) => item.id === 'lagos.marina.car-dealership');
    expect(destination?.name).toBe(district.dealership!.name);
    expect(findPath(
      walkGridFor(district.layout.obstacles),
      { x: district.spawn[0], z: district.spawn[2] },
      destination!.position!,
    )).not.toBeNull();
  });
});
