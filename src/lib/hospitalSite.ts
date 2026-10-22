import type { Furniture, Interior } from './interiors';
import { USE_RADIUS } from './interiors';

export const HOSPITAL = {
  districtId: 'lagos.marina',
  name: 'General Hospital',
  // The entrance on the pavement west of the hospital building
  position: [5.5, 0, -6] as const,
  radius: 3,
};

const furniture = (
  kind: Furniture['kind'],
  x: number,
  z: number,
  width: number,
  height: number,
  depth: number,
  color: string,
  elevation = 0,
  rotation = 0,
): Furniture => ({ kind, at: [x, z], size: [width, height, depth], color, elevation, rotation });

const BED = '#e9eef0';
const SEAT = '#4a7f8c';

const wardBeds: Furniture[] = [];
for (const x of [-13, -10, -7]) {
  wardBeds.push(furniture('bed', x, 7.6, 1.1, 0.6, 2.1, BED));
  wardBeds.push(furniture('cabinet', x + 0.95, 9.4, 0.5, 0.8, 0.5, '#9fb1b8'));
}

export const HOSPITAL_INTERIOR: Interior = {
  tier: 'flat',
  architecture: 'office',
  width: 32,
  depth: 20,
  wallColor: '#eef2f1',
  floorColor: '#c6d0cf',
  window: 'wide',
  partitions: [
    // Ward (back left), open at the corner nearest the atrium
    { position: [-11.5, 1.35, 1], size: [7, 2.7, 0.14], material: 'glass' },
    { position: [-5, 1.35, 6.5], size: [0.14, 2.7, 7], material: 'glass' },
    // Supervisor office (back right)
    { position: [11.5, 1.35, 1], size: [9, 2.7, 0.14], material: 'glass' },
    { position: [5, 1.35, 6.5], size: [0.14, 2.7, 7], material: 'glass' },
  ],
  furniture: [
    // Reception and waiting area
    furniture('reception', 0, -6, 3.6, 1.05, 0.9, '#4f7480'),
    furniture('plant', -3.6, -6.5, 0.7, 1.4, 0.7, '#52784b'),
    furniture('plant', 3.6, -6.5, 0.7, 1.4, 0.7, '#52784b'),
    furniture('sofa', -11, -6.5, 2.6, 0.82, 0.95, SEAT),
    furniture('sofa', -8, -6.5, 2.6, 0.82, 0.95, SEAT),
    furniture('sofa', -14.2, -4, 0.95, 0.82, 2.6, SEAT, 0, Math.PI / 2),
    furniture('table', -10.5, -3.6, 1.2, 0.42, 0.7, '#cfd6d6'),
    furniture('wall-art', 0, -9.85, 3.6, 1.2, 0.08, '#c0392b', 1.2),
    // Pharmacy counter
    furniture('counter', 11, -6.8, 4.4, 0.95, 0.9, '#d8dfe0'),
    furniture('fridge', 14.4, -6.8, 0.9, 1.9, 0.8, '#d5d9dc'),
    furniture('cabinet', 8.6, -9.4, 2.2, 1.9, 0.5, '#9fb1b8'),
    // Ward
    ...wardBeds,
    furniture('sink', -14.4, 3.2, 0.7, 0.9, 0.55, '#dfe6e8'),
    // Supervisor office
    furniture('desk', 11, 7.4, 2.6, 0.76, 1.1, '#7a5c43'),
    furniture('computer', 11, 7.4, 0.9, 0.65, 0.65, '#343b3e', 0.76),
    furniture('chair', 11, 6.4, 0.6, 0.9, 0.6, '#3f4f66', 0, 0),
    furniture('file-cabinet', 14.4, 8.6, 0.9, 1.4, 0.7, '#778087'),
    furniture('whiteboard', 8.5, 9.85, 3, 1.3, 0.1, '#eeeee6'),
    // Nurse station in the corridor between the ward and the office
    furniture('counter', 0, 9.2, 5.4, 0.95, 0.9, '#d8dfe0'),
    furniture('computer', 0.8, 9.2, 0.9, 0.65, 0.65, '#343b3e', 0.95),
    furniture('bed', -1.4, 3.4, 1.1, 0.6, 2.1, BED, 0, Math.PI / 2),
  ],
};

export type HospitalInteraction = 'door' | 'reception' | 'patient' | 'supervisor' | 'pharmacy';

const POINTS: readonly { action: HospitalInteraction; at: readonly [number, number]; radius: number }[] = [
  { action: 'reception', at: [0, -4.7], radius: 1.9 },
  { action: 'pharmacy', at: [11, -5.0], radius: 1.6 },
  { action: 'supervisor', at: [11, 5.0], radius: 2.3 },
  { action: 'patient', at: [-9.5, 5.0], radius: 3.4 },
];

export function hospitalInteractionAt(interior: Interior, x: number, z: number): HospitalInteraction | null {
  if (Math.hypot(x, z - (-interior.depth / 2 + 0.7)) <= USE_RADIUS) return 'door';
  for (const point of POINTS) {
    if (Math.hypot(x - point.at[0], z - point.at[1]) <= point.radius) return point.action;
  }
  return null;
}

export function isInWard(x: number, z: number): boolean {
  return x < -5 && z > 1;
}

export function isInSupervisorOffice(x: number, z: number): boolean {
  return x > 5 && z > 1;
}
