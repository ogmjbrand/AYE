import type { Career } from '../components/CharacterCreation';
import { Vector3 } from 'three';

export interface CareerLocation {
  name: string;
  description: string;
  position: [number, number, number];
  neighborhood: string;
}

const CAREER_LOCATIONS: Record<Career, CareerLocation> = {
  'none': {
    name: 'Nowhere',
    description: 'You have no job',
    position: [0, 0, 0],
    neighborhood: 'downtown',
  },
  'student': {
    name: 'University',
    description: 'Continue your education',
    position: [-12, 0, -12],
    neighborhood: 'downtown',
  },
  'artist': {
    name: 'Studio',
    description: 'Create and express yourself',
    position: [15, 0, 8],
    neighborhood: 'uptown',
  },
  'entrepreneur': {
    name: 'Office',
    description: 'Run your business operations',
    position: [-5, 0, 5],
    neighborhood: 'harbor',
  },
  'athlete': {
    name: 'Sports Complex',
    description: 'Train and compete',
    position: [8, 0, 28],
    neighborhood: 'parks',
  },
  'engineer': {
    name: 'Tech Campus',
    description: 'Build and innovate',
    position: [-25, 0, 20],
    neighborhood: 'industrial',
  },
  'doctor': {
    name: 'Hospital',
    description: 'Heal and help others',
    position: [5, 0, -15],
    neighborhood: 'downtown',
  },
  'pilot': {
    name: 'Airport',
    description: 'Fly across the world',
    position: [25, 0, 18],
    neighborhood: 'parks',
  },
};

export function getCareerLocation(career: Career): CareerLocation {
  return CAREER_LOCATIONS[career];
}

export function isAtWorkplace(playerPosition: Vector3, career: Career): boolean {
  const workplace = getCareerLocation(career);
  const workplacePos = new Vector3(...workplace.position);
  const distance = playerPosition.distanceTo(workplacePos);
  return distance < 5;
}

export function getDistanceToWorkplace(playerPosition: Vector3, career: Career): number {
  const workplace = getCareerLocation(career);
  const workplacePos = new Vector3(...workplace.position);
  return Math.round(playerPosition.distanceTo(workplacePos) * 10) / 10;
}
