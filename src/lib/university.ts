import type { Furniture, Interior } from './interiors';
import { USE_RADIUS } from './interiors';

export const UNIVERSITY = {
  districtId: 'lagos.marina',
  name: 'AYE Global University',
  // The campus entrance on the pavement in front of the university building
  position: [-5.5, 0, -36] as const,
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

const DESK = '#8a6a4a';
const CHAIR = '#3f4f66';
const SHELF = '#6b4f38';

/** Student desks in rows facing the lectern at the back of the lecture hall. */
const lectureDesks: Furniture[] = [];
for (const z of [2.8, 4.6, 6.4]) {
  for (const x of [-12.6, -10.2, -7.8]) {
    lectureDesks.push(furniture('desk', x, z, 1.5, 0.74, 0.6, DESK));
    lectureDesks.push(furniture('chair', x, z - 0.75, 0.55, 0.88, 0.55, CHAIR, 0, 0));
  }
}

const libraryShelves: Furniture[] = [];
for (const x of [6.4, 8.2, 10, 11.8, 13.6]) {
  libraryShelves.push(furniture('display-shelf', x, 9.4, 1.4, 2.1, 0.5, SHELF));
}

const cafeteriaTables: Furniture[] = [];
for (const [x, z] of [[-3, 3.5], [0, 3.5], [3, 3.5], [-3, 6], [3, 6]] as const) {
  cafeteriaTables.push(furniture('dining-table', x, z, 1.2, 0.76, 1.2, '#b98f62'));
  cafeteriaTables.push(furniture('dining-chair', x - 0.95, z, 0.5, 0.9, 0.5, '#d4b48a', 0, Math.PI / 2));
  cafeteriaTables.push(furniture('dining-chair', x + 0.95, z, 0.5, 0.9, 0.5, '#d4b48a', 0, -Math.PI / 2));
}

export const UNIVERSITY_INTERIOR: Interior = {
  tier: 'flat',
  architecture: 'office',
  width: 32,
  depth: 20,
  wallColor: '#e4dfd2',
  floorColor: '#b7ae9c',
  window: 'wide',
  partitions: [
    // Lecture hall (back left) with an opening at the corner nearest the atrium
    { position: [-11.5, 1.35, 1], size: [7, 2.7, 0.14], material: 'glass' },
    { position: [-5, 1.35, 6.5], size: [0.14, 2.7, 7], material: 'glass' },
    // Library (back right)
    { position: [11.5, 1.35, 1], size: [9, 2.7, 0.14], material: 'glass' },
    { position: [5, 1.35, 6.5], size: [0.14, 2.7, 7], material: 'glass' },
  ],
  furniture: [
    // Atrium: information desk
    furniture('reception', 0, -6, 3.2, 1.05, 0.9, '#4d4538'),
    furniture('plant', -3.4, -6.5, 0.7, 1.4, 0.7, '#52784b'),
    furniture('plant', 3.4, -6.5, 0.7, 1.4, 0.7, '#52784b'),
    furniture('wall-art', 0, -9.85, 3.6, 1.2, 0.08, '#2c5a46', 1.2),
    // Student centre: lounge with sofas
    furniture('sofa', 11.5, -6.5, 2.6, 0.82, 0.95, '#4b6a5c'),
    furniture('sofa', 8.4, -4, 0.95, 0.82, 2.4, '#4b6a5c', 0, -Math.PI / 2),
    furniture('table', 11.5, -4.2, 1.2, 0.42, 0.7, '#735b45'),
    furniture('tv', 14.7, -4.5, 0.12, 0.8, 1.4, '#16181b', 1.2, -Math.PI / 2),
    furniture('rug', 11.5, -4.8, 4.2, 0.02, 3.4, '#8aa39a'),
    // Lockers and notice area on the west side
    furniture('cabinet', -14.6, -7.5, 0.6, 1.9, 2.6, '#58708a'),
    furniture('cabinet', -14.6, -4, 0.6, 1.9, 2.6, '#58708a'),
    // Student services desk: timetable, records and support
    furniture('reception', -9.5, -6, 3.2, 1.05, 0.9, '#6b4f38'),
    furniture('wall-art', -9.5, -9.85, 3.2, 1.2, 0.08, '#8a6a4a', 1.2),
    furniture('computer', -9.5, -6, 0.8, 0.6, 0.6, '#343b3e', 1.05),
    // Lecture hall
    furniture('whiteboard', -10.2, 9.85, 5.6, 1.5, 0.1, '#eeeee6'),
    furniture('desk', -10.2, 8.6, 2.2, 0.9, 0.8, '#6e5238'),
    ...lectureDesks,
    // Library: reading tables, shelves and the assignment computers
    ...libraryShelves,
    furniture('desk', 9.2, 5.2, 2.6, 0.76, 1.1, DESK),
    furniture('chair', 9.2, 4.2, 0.6, 0.9, 0.6, CHAIR, 0, 0),
    furniture('chair', 9.2, 6.2, 0.6, 0.9, 0.6, CHAIR, 0, Math.PI),
    furniture('desk', 13, 7.6, 2, 0.76, 0.9, DESK),
    furniture('computer', 13, 7.6, 0.9, 0.65, 0.65, '#343b3e', 0.76),
    furniture('chair', 13, 6.7, 0.6, 0.9, 0.6, CHAIR, 0, 0),
    // Computer lab: a row of workstations along the library's front edge
    ...[7.2, 9.2, 11.2].flatMap((x) => [
      furniture('desk', x, 2.6, 1.6, 0.76, 0.7, DESK),
      furniture('computer', x, 2.6, 0.8, 0.6, 0.6, '#343b3e', 0.76),
      furniture('chair', x, 1.9, 0.55, 0.88, 0.55, CHAIR, 0, 0),
    ]),
    furniture('plant', 14.7, 3.2, 0.65, 1.3, 0.65, '#52784b'),
    // Cafeteria
    furniture('counter', 0, 9.2, 6, 0.95, 0.9, '#c9c3b5'),
    furniture('fridge', -3.8, 9.3, 0.9, 1.9, 0.8, '#d5d9dc'),
    ...cafeteriaTables,
  ],
};

export type UniversityInteraction = 'door' | 'info' | 'lecture' | 'study' | 'assignment' | 'cafeteria' | 'centre' | 'services';

/** Where each campus activity can be started. Ordered so tighter spots win over zones. */
const POINTS: readonly { action: UniversityInteraction; at: readonly [number, number]; radius: number }[] = [
  { action: 'assignment', at: [13, 6.0], radius: 1.5 },
  { action: 'info', at: [0, -4.7], radius: 1.8 },
  { action: 'services', at: [-9.5, -4.7], radius: 1.8 },
  { action: 'cafeteria', at: [0, 7.9], radius: 1.8 },
  { action: 'study', at: [9.4, 5.2], radius: 2.2 },
  { action: 'centre', at: [11.5, -4.8], radius: 3.2 },
  { action: 'lecture', at: [-10.2, 5], radius: 4.6 },
];

export function universityInteractionAt(interior: Interior, x: number, z: number): UniversityInteraction | null {
  if (Math.hypot(x, z - (-interior.depth / 2 + 0.7)) <= USE_RADIUS) return 'door';
  for (const point of POINTS) {
    if (Math.hypot(x - point.at[0], z - point.at[1]) <= point.radius) return point.action;
  }
  return null;
}

/** The player is physically in the lecture hall or the library, wherever they stand in it. */
export function isInLectureHall(x: number, z: number): boolean {
  return x < -5 && z > 1;
}

export function isInLibrary(x: number, z: number): boolean {
  return x > 5 && z > 1;
}
