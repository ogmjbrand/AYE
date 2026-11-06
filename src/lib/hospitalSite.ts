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

/** A piece of hospital equipment (world/HospitalEquipment.tsx draws it by its design): solid, and used at its department's point. */
const kit = (design: string, x: number, z: number, width: number, height: number, depth: number, color = '#dfe6e8', rotation = 0): Furniture =>
  ({ kind: 'cabinet', at: [x, z], size: [width, height, depth], color, elevation: 0, rotation, design: `hosp-${design}` });
const glass = (x: number, z: number, sx: number, sz: number) => ({ position: [x, 1.35, z] as const, size: [sx, 2.7, sz] as const, material: 'glass' as const });

/**
 * General Hospital, Lagoon: the original floor (reception and waiting, pharmacy, ward,
 * supervisor's office, nurse station) with a modern wing to the west and the Herbal Medicine
 * Centre to the east (lib/healthcare.ts). Each wing has a corridor along the main floor and its
 * rooms open off it.
 */
export const HOSPITAL_INTERIOR: Interior = {
  tier: 'flat',
  architecture: 'office',
  width: 48,
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
    // The modern wing (west): its wall to the main floor, open at the waiting area, and the rooms off its corridor
    glass(-16, -6.75, 0.14, 6.5), glass(-16, 4.25, 0.14, 11.5),
    glass(-21.15, -5.5, 5.7, 0.14), glass(-21.15, -1.5, 5.7, 0.14), glass(-21.15, 3, 5.7, 0.14), glass(-21.15, 7, 5.7, 0.14),
    // The Herbal Medicine Centre (east): open to the main floor by the pharmacy and by the office
    glass(16, -6.75, 0.14, 6.5), glass(16, 6.5, 0.14, 7),
    glass(20.9, -5, 6.2, 0.14), glass(20.9, -0.5, 6.2, 0.14), glass(20.9, 4.3, 6.2, 0.14),
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
    // Monitors beside the ward beds (the recovery ward)
    ...[-13, -10, -7].map((x) => kit('ward-monitor', x - 0.85, 9.3, 0.4, 1.6, 0.4)),
    // Rehabilitation, in the atrium by the nurse station
    kit('parallel-bars', 2.8, 5.6, 2.6, 0.95, 0.8),
    kit('treadmill', 2.8, 2.9, 0.8, 1.3, 1.8),

    // ——— The modern wing ———
    // Emergency bay
    kit('trolley-bed', -21.6, -8.0, 0.9, 0.8, 2.0, '#e9eef0'),
    kit('vitals-monitor', -23.5, -8.6, 0.45, 1.6, 0.45),
    kit('crash-cart', -19.4, -9.3, 0.7, 1.0, 0.5, '#c0392b'),
    kit('oxygen', -23.6, -6.4, 0.3, 1.4, 0.3, '#2f8f5b'),
    // Examination room
    kit('exam-couch', -21.8, -3.5, 0.75, 0.75, 1.9, '#5a8ea0'),
    kit('bp-monitor', -23.5, -2.4, 0.45, 1.5, 0.45),
    kit('vitals-monitor', -23.5, -4.5, 0.45, 1.6, 0.45),
    // Imaging
    kit('ct-scanner', -21.7, 0.8, 1.9, 2.0, 3.2),
    kit('xray-console', -18.9, 2.5, 1.0, 1.0, 0.6, '#3a4248'),
    // Surgical theatre
    kit('or-table', -21.5, 5.0, 0.7, 0.95, 2.0, '#4a6a78'),
    kit('anaesthesia', -23.4, 5.9, 0.6, 1.5, 0.55),
    kit('instrument-trolley', -19.9, 3.9, 0.8, 0.95, 0.5),
    // Laboratory
    kit('lab-bench', -21.0, 9.45, 5.0, 0.95, 0.75, '#e8ecec'),
    kit('sample-fridge', -23.55, 7.9, 0.7, 1.9, 0.7),

    // ——— The Herbal Medicine Centre ———
    // Dispensary: shelves of labelled remedies behind the counter
    kit('herb-shelves', 20.9, -9.7, 6.0, 2.4, 0.5, '#7a5232'),
    kit('herb-counter', 20.9, -7.6, 4.2, 1.0, 0.8, '#8a5f38'),
    // Preparation room
    kit('herb-prep-table', 19.6, -2.8, 2.0, 0.9, 0.9, '#9a6b40'),
    kit('herb-prep-table', 22.4, -2.8, 2.0, 0.9, 0.9, '#9a6b40'),
    kit('herb-drying-rack', 23.6, -1.2, 0.5, 2.0, 1.4, '#7a5232'),
    kit('herb-stove', 23.4, -4.4, 0.9, 0.9, 0.7, '#3a3a3a'),
    // Treatment room
    kit('herb-bath', 22.6, 2.4, 1.7, 0.65, 0.9, '#9a6b40'),
    kit('herb-consult-table', 19.6, 1.6, 1.2, 0.75, 0.8, '#8a5f38'),
    kit('herb-steam-chair', 23.4, 0.4, 0.8, 1.2, 0.8, '#c8b89a'),
    // Medicinal garden (raised beds) and the research bench
    kit('herb-bed-a', 18.7, 7.6, 1.0, 0.55, 3.6),
    kit('herb-bed-b', 20.9, 7.6, 1.0, 0.55, 3.6),
    kit('herb-bed-c', 23.1, 7.6, 1.0, 0.55, 3.6),
    kit('herb-research', 22.9, 5.0, 1.6, 0.9, 0.7, '#e3ddd2'),
  ],
};

/** Where you are in the hospital: the doctor's shift points, and every department you can use (lib/healthcare.ts). */
export type HospitalInteraction = 'door' | 'reception' | 'patient' | 'supervisor' | 'pharmacy' | CareDepartmentPoint;
export type CareDepartmentPoint = 'emergency' | 'examination' | 'imaging' | 'laboratory' | 'surgery' | 'rehabilitation'
  | 'herbal-dispensary' | 'herbal-preparation' | 'herbal-garden' | 'herbal-treatment' | 'herbal-research';

/** What each point is called (prompts and "Things to do here"). */
export const HOSPITAL_POINT_LABEL: Record<Exclude<HospitalInteraction, 'door'>, string> = {
  reception: 'Reception', pharmacy: 'The pharmacy', supervisor: 'The supervisor', patient: 'The ward',
  emergency: 'The emergency bay', examination: 'The examination room', imaging: 'Medical imaging', laboratory: 'The laboratory', surgery: 'The surgical theatre', rehabilitation: 'Rehabilitation',
  'herbal-dispensary': 'The herbal dispensary', 'herbal-preparation': 'The herbal preparation room', 'herbal-garden': 'The medicinal garden', 'herbal-treatment': 'The herbal treatment room', 'herbal-research': 'The plant research bench',
};

export const HOSPITAL_POINTS: readonly { action: HospitalInteraction; at: readonly [number, number]; radius: number }[] = [
  { action: 'reception', at: [0, -4.7], radius: 1.9 },
  { action: 'pharmacy', at: [11, -5.0], radius: 1.6 },
  { action: 'supervisor', at: [11, 5.0], radius: 2.3 },
  { action: 'patient', at: [-9.5, 5.0], radius: 3.4 },
  { action: 'rehabilitation', at: [1.3, 4.2], radius: 1.1 },
  { action: 'emergency', at: [-19.3, -7.2], radius: 1.4 },
  { action: 'examination', at: [-19.6, -3.4], radius: 1.4 },
  { action: 'imaging', at: [-19.2, 0.6], radius: 1.2 },
  { action: 'surgery', at: [-19.3, 5.6], radius: 1.2 },
  { action: 'laboratory', at: [-20.6, 8.2], radius: 1.2 },
  { action: 'herbal-dispensary', at: [20.9, -6.2], radius: 1.4 },
  { action: 'herbal-preparation', at: [21.0, -1.4], radius: 1.1 },
  { action: 'herbal-treatment', at: [20.4, 3.2], radius: 1.1 },
  { action: 'herbal-garden', at: [19.8, 5.0], radius: 1.0 },
  { action: 'herbal-research', at: [22.6, 5.85], radius: 0.6 },
];

export function hospitalInteractionAt(interior: Interior, x: number, z: number): HospitalInteraction | null {
  if (Math.hypot(x, z - (-interior.depth / 2 + 0.7)) <= USE_RADIUS) return 'door';
  for (const point of HOSPITAL_POINTS) {
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
