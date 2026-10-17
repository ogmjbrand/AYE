/**
 * "Avenue": a third street plan for generated cities (generate.ts), not a
 * playable district of its own. A wider road than Marina or Osu, the cross
 * street to the north, a lounge with a terrace south of it, and the park
 * tucked behind the offices on the west side, reached from the cross street.
 * Names here are placeholders; every city renames what it uses.
 */
import { building as b } from '../world';
import type { DistrictSpec } from '../geography';

export const AVENUE: DistrictSpec = {
  id: 'plan.avenue',
  city: { id: 'plan', name: 'Plan', region: 'Plan', country: 'NG', timeZone: 'Africa/Lagos', currency: 'NGN', lat: 0, lon: 0 },
  name: 'Avenue',
  spawn: [2, 0, -6],
  layout: {
    id: 'plan.avenue',
    roadHalfWidth: 5,
    pavementWidth: 3,
    crossStreet: { minZ: 14, maxZ: 21 },
    buildings: [
      // East side, north of the cross street
      b(12, 30, 6, 10, 8, 'shop', '#d9c7a3', 'Kitchen'),
      b(12, 40, 6, 8, 7, 'shop', '#d7c4e0', 'Fashion'),
      b(25, 34, 12, 14, 30, 'tower', '#4f6f82'),
      // West side, north of the cross street
      b(-12, 30, 8, 10, 14, 'residential', '#e8d9b5', 'Home A'),
      b(-11, 40.5, 6, 7, 6, 'shop', '#c7d3c0', 'Gadgets'),
      b(-26, 34, 12, 12, 20, 'office', '#c9ccc8', 'Tech'),
      // East side, south of the cross street
      b(12, 6, 6, 3.6, 7, 'shop', '#5b4a5e', 'Lounge'),
      b(12, -2, 6, 10, 9, 'office', '#eceae4', 'Hospital'),
      b(12, -14, 6, 10, 7, 'shop', '#e9d3b0', 'Second'),
      b(14, -32, 10, 14, 40, 'tower', '#3f5f73', 'Home D'),
      b(28, -30, 10, 10, 14, 'residential', '#efe3c8', 'Home C'),
      // West side, south of the cross street
      b(-12, 4, 6, 10, 16, 'office', '#d6cdbd', 'Business'),
      b(-12, -8, 6, 8, 7, 'shop', '#e0b98f', 'Arts'),
      b(-13, -24, 8, 12, 18, 'office', '#d3c6b0', 'College'),
      b(-12, -38, 6, 8, 12, 'residential', '#dcc2a2', 'Home B'),
    ],
    palms: { x: 7.6, spacing: 12, offset: 8 },
    lamps: { x: 5.6, spacing: 12, offset: 2 },
    powerPoles: [],
    vehicles: [
      { position: [4, 0, 32], heading: 0, color: '#e6e4dc' },
      { position: [4, 0, -38], heading: 0, color: '#e6e4dc' },
      { position: [-4, 0, -28], heading: Math.PI, color: '#e6e4dc' },
    ],
    traffic: [
      { x: -1.2, dir: 1, count: 2, colors: ['#e6e4dc'], stripes: false },
      { x: 1.2, dir: -1, count: 2, colors: ['#e6e4dc'], stripes: false },
    ],
    stalls: [[-7.2, 0, -16], [-7.2, 0, -19.5]],
    billboard: [-22, 0, 25.5],
    // Two chairs either side of the lounge door, facing the street
    terraceChairs: [{ x: 8.6, z: 4.75, facing: -Math.PI / 2 }, { x: 8.6, z: 7.25, facing: -Math.PI / 2 }],
    // Behind the offices on the west side: in from the cross street down the lane past them
    park: {
      area: { minX: -34, maxX: -19, minZ: -12, maxZ: 8 },
      trees: [[-33, -11], [-20, -11], [-33, 7], [-20, 7], [-31.5, -7], [-21, -8], [-31.5, 4], [-21.5, 4.5]],
      benches: [
        { x: -29.1, z: -4.5, facing: Math.PI / 2 }, { x: -23.9, z: -4.5, facing: -Math.PI / 2 },
        { x: -29.1, z: 1.5, facing: Math.PI / 2 }, { x: -23.9, z: 1.5, facing: -Math.PI / 2 },
      ],
      paths: [{ x0: -27.5, x1: -25.5, z0: -12, z1: 8 }, { x0: -19, x1: -15, z0: 8, z1: 11 }, { x0: -34, x1: -19, z0: -2.5, z1: -0.5 }],
    },
    skyline: {
      seed: 523,
      warm: ['#e3d2b4', '#d8c4a2', '#e8dcc6'],
      glass: ['#4f6f82', '#5d7d8c', '#3f5f73'],
      towerChance: 0.45,
    },
  },
  neighborhoods: [
    { id: 'avenue', name: 'Avenue', bounds: { minX: -15, maxX: 15, minZ: -45, maxZ: 45 }, description: 'Shops, kitchens and offices', atmosphere: 'commercial' },
    { id: 'east', name: 'East', bounds: { minX: 15, maxX: 45, minZ: -45, maxZ: 45 }, description: 'Towers and apartments', atmosphere: 'residential' },
    { id: 'west', name: 'West', bounds: { minX: -45, maxX: -15, minZ: -45, maxZ: 45 }, description: 'Offices, colleges and the park', atmosphere: 'urban' },
  ],
  vendors: [
    { id: 'kitchen', name: 'Kitchen', kind: 'Kitchen', position: [6.5, 0, 30], menu: [] },
    { id: 'snacks', name: 'Snacks', kind: 'Snacks', position: [-5.8, 0, -17.75], menu: [] },
    { id: 'second', name: 'Second', kind: 'Kitchen', position: [6.5, 0, -14], menu: [] },
  ],
  fashionHouse: { name: 'Fashion', kind: 'Boutique', position: [6.5, 0, 40] },
  gadgetHub: { name: 'Gadgets', kind: 'Gadgets', position: [-6.5, 0, 40.5] },
  travelDesk: { name: 'Travel', kind: 'Flights & coaches', position: [6.5, 0, -24] },
  park: { id: 'park', name: 'Park', kind: 'Public park', position: [-26.5, 0, -1.5], description: '' },
  nightlife: { id: 'lounge', name: 'Lounge', kind: 'Live music lounge', position: [6.5, 0, 6], cover: 250, description: '' },
  homes: [
    { id: 'a', district: 'plan.avenue', name: 'Home A', kind: 'Room', building: 'Home A', door: [-6.5, 0, 30], rentPerNight: 80, description: '' },
    { id: 'b', district: 'plan.avenue', name: 'Home B', kind: 'Flat', building: 'Home B', door: [-6.5, 0, -38], rentPerNight: 180, description: '' },
    { id: 'c', district: 'plan.avenue', name: 'Home C', kind: 'Apartment', building: 'Home C', door: [22.3, 0, -30], rentPerNight: 400, description: '' },
    { id: 'd', district: 'plan.avenue', name: 'Home D', kind: 'Penthouse', building: 'Home D', door: [6.5, 0, -32], rentPerNight: 1200, description: '' },
  ],
  workplaces: {
    student: { name: 'College', description: '', position: [-6.5, 0, -24], neighborhood: 'avenue' },
    artist: { name: 'Arts', description: '', position: [-6.5, 0, -8], neighborhood: 'avenue' },
    entrepreneur: { name: 'Business', description: '', position: [-6.5, 0, 4], neighborhood: 'avenue' },
    athlete: { name: 'Sports', description: '', position: [22, 0, -12], neighborhood: 'east' },
    engineer: { name: 'Tech', description: '', position: [-18.6, 0, 34], neighborhood: 'west' },
    doctor: { name: 'Hospital', description: '', position: [6.5, 0, -2], neighborhood: 'avenue' },
    pilot: { name: 'Crew', description: '', position: [-24, 0, -40], neighborhood: 'west' },
  },
};
