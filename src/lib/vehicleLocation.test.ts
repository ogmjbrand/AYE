import { describe, expect, it } from 'vitest';
import { cityDirectory } from './cityDirectory';
import { DISTRICTS } from './geography';
import { locationsFor } from './locations';
import { findPath, walkGridFor } from './pathfinding';

describe('car dealership location integration', () => {
  it('registers Marina Motors in both routeable city directories and the city map places', () => {
    const district = DISTRICTS.find((item) => item.id === 'lagos.marina')!;
    const destination = cityDirectory(district, 'student', null).find((item) => item.id === 'lagos.marina.car-dealership');
    const location = locationsFor(district, 'student', null).find((item) => item.id === 'lagos.marina.car-dealership');
    const mapPlace = district.places.find((item) => item.id === 'lagos.marina.car-dealership');
    expect(destination).toMatchObject({ name: 'Marina Motors', status: 'open', categories: ['vehicles', 'shopping'] });
    expect(location).toMatchObject({ name: 'Marina Motors', category: 'vehicles', built: true, use: 'dealership' });
    expect(destination?.position).toEqual({ x: 20.5, z: 12 });
    expect(location?.position).toEqual([20.5, 0, 12]);
    expect(mapPlace?.position).toEqual([20.5, 0, 12]);
    expect(findPath(
      walkGridFor(district.layout.obstacles),
      { x: district.spawn[0], z: district.spawn[2] },
      destination!.position!,
    )).not.toBeNull();
  });
});
