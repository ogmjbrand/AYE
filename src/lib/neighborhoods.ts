import { Vector3 } from 'three';

export interface Neighborhood {
  id: string;
  name: string;
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  description: string;
  atmosphere: 'urban' | 'commercial' | 'residential' | 'industrial';
}

export function detectNeighborhood(neighborhoods: readonly Neighborhood[], position: Vector3): Neighborhood | null {
  for (const neighborhood of neighborhoods) {
    const { minX, maxX, minZ, maxZ } = neighborhood.bounds;
    if (
      position.x >= minX &&
      position.x <= maxX &&
      position.z >= minZ &&
      position.z <= maxZ
    ) {
      return neighborhood;
    }
  }
  return null;
}
