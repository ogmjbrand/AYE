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

export const NEIGHBORHOODS: Neighborhood[] = [
  {
    id: 'downtown',
    name: 'Downtown',
    bounds: { minX: -15, maxX: 15, minZ: -20, maxZ: 0 },
    description: 'The heart of the city',
    atmosphere: 'urban',
  },
  {
    id: 'harbor',
    name: 'Harbor District',
    bounds: { minX: -20, maxX: 0, minZ: 0, maxZ: 25 },
    description: 'Waterfront commerce and trade',
    atmosphere: 'commercial',
  },
  {
    id: 'uptown',
    name: 'Uptown',
    bounds: { minX: 10, maxX: 30, minZ: -15, maxZ: 15 },
    description: 'Luxury residences and boutiques',
    atmosphere: 'residential',
  },
  {
    id: 'industrial',
    name: 'Industrial District',
    bounds: { minX: -35, maxX: -15, minZ: 10, maxZ: 35 },
    description: 'Manufacturing and logistics',
    atmosphere: 'industrial',
  },
  {
    id: 'parks',
    name: 'Central Park',
    bounds: { minX: 0, maxX: 20, minZ: 20, maxZ: 35 },
    description: 'Green spaces and recreation',
    atmosphere: 'residential',
  },
];

export function detectNeighborhood(position: Vector3): Neighborhood | null {
  for (const neighborhood of NEIGHBORHOODS) {
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
