/**
 * Where each career works. Every district lists its own workplaces
 * (lib/districts), so a career can be worked in any city.
 */
import type { Career } from '../components/CharacterCreation';
import type { District } from './geography';

export const WORKPLACE_RADIUS = 5;

export interface CareerLocation {
  name: string;
  description: string;
  position: [number, number, number];
  neighborhood: string;
}

export function getCareerLocation(district: District, career: Career): CareerLocation | null {
  return career === 'none' ? null : district.workplaces[career];
}

export function getDistanceToWorkplace(district: District, career: Career, x: number, z: number): number {
  const w = getCareerLocation(district, career);
  return w ? Math.round(Math.hypot(w.position[0] - x, w.position[2] - z) * 10) / 10 : Infinity;
}

export function isAtWorkplace(district: District, career: Career, x: number, z: number): boolean {
  return getDistanceToWorkplace(district, career, x, z) < WORKPLACE_RADIUS;
}
