/**
 * Accra, Oxford Street in Osu: the second district. A wider, busier street
 * than Marina, with the cross street to the north, chop bars, a waakye joint,
 * kelewele sellers, tro-tro stops and a kente boutique.
 */
import { building as b } from '../world';
import type { DistrictSpec } from '../geography';

export const ACCRA_OSU: DistrictSpec = {
  id: 'accra.osu',
  city: { id: 'accra', name: 'Accra', country: 'GH', timeZone: 'Africa/Accra', currency: 'GHS' },
  name: 'Oxford Street, Osu',
  spawn: [2, 0, -10],
  layout: {
    id: 'accra.osu',
    roadHalfWidth: 5,
    pavementWidth: 3.5,
    crossStreet: { minZ: 6, maxZ: 13 },
    buildings: [
      // West side
      b(-12.5, 34, 7, 12, 8, 'shop', '#e6c9a0', 'Osu Chop Bar'),
      b(-13, 22, 8, 8, 16, 'residential', '#efd9b8', 'Labone Court'),
      b(-26, 26, 12, 14, 30, 'office', '#c8ccc9', 'Accra Tech Hub'),
      b(-12, -4, 6, 10, 7, 'shop', '#d8cbe6', 'Kente Loft'),
      b(-12, -16, 6, 8, 6, 'shop', '#c9d6c4', 'Osu Gadgets'),
      b(-12, -23, 6, 4.6, 7, 'shop', '#4f5568', 'Osu Nights'),
      b(-14, -32, 10, 12, 14, 'office', '#d9cfbf', 'Accra Business School'),
      // East side
      b(13, 30, 8, 10, 12, 'office', '#e9e4da', 'Osu Clinic'),
      b(26, 32, 10, 10, 20, 'residential', '#e4d3b5', 'Osu Heights'),
      b(12, 22, 6, 6, 6, 'shop', '#ecd2a8', "Auntie Muni's Waakye"),
      b(13, -4, 8, 10, 9, 'shop', '#d7b98f', 'Labadi Arts Centre'),
      b(14, -18, 10, 10, 18, 'office', '#cfd5d6', 'Osu Coworking'),
      b(13, -34, 8, 12, 10, 'office', '#d3c6b0', 'Airline Crew Centre'),
      b(28, -30, 12, 16, 42, 'tower', '#3e5e70', 'Cantonments Towers'),
      b(28, -6, 14, 14, 12, 'office', '#bfc8c2', 'Accra Sports Arena'),
    ],
    palms: { x: 8, spacing: 16, offset: 6 },
    lamps: { x: 5.6, spacing: 14, offset: 3 },
    powerPoles: [-40, -26, -12, 22, 36].map((z) => [8.2, 0, z] as const),
    // Tro-tros (minibuses) waiting at the stops
    vehicles: [
      { position: [3.4, 0, 36], heading: 0, color: '#e6e4dc', stripes: false },
      { position: [3.4, 0, 28.5], heading: 0, color: '#d7dde3', stripes: false },
      { position: [-3.4, 0, -26], heading: Math.PI, color: '#e6e4dc', stripes: false },
    ],
    traffic: [
      { x: -1.2, dir: 1, count: 2, colors: ['#e6e4dc', '#8a1f24'], stripes: false },
      { x: 1.2, dir: -1, count: 2, colors: ['#d7dde3', '#e6e4dc'], stripes: false },
    ],
    // Kelewele and kebab stalls on the west pavement
    stalls: [[-7.8, 0, 40], [-7.8, 0, 43]],
    billboard: [-20, 0, 2],
    // Osu Green, behind Kente Loft: in from the cross street, or along the lane beside Osu Gadgets
    park: {
      area: { minX: -34, maxX: -19, minZ: -19, maxZ: 0 },
      trees: [[-32.5, -1.5], [-21, -2], [-32, -6], [-20.5, -6.5], [-31.5, -15], [-21, -15.5], [-32.5, -18], [-24, -18], [-29.5, -3], [-22.5, -12.5]],
      benches: [
        { x: -27.6, z: -6, facing: Math.PI / 2 }, { x: -24.4, z: -6, facing: -Math.PI / 2 },
        { x: -27.6, z: -14.5, facing: Math.PI / 2 }, { x: -24.4, z: -14.5, facing: -Math.PI / 2 },
      ],
      paths: [{ x0: -27, x1: -25, z0: -19, z1: 2.5 }, { x0: -34, x1: -8.5, z0: -11.5, z1: -9.5 }],
    },
    skyline: {
      seed: 977,
      warm: ['#e6d3b3', '#d9c09a', '#efe1c7', '#cdb48f', '#e2c7a4', '#c7beb0'],
      glass: ['#5a7a88', '#46677a', '#6d8b98'],
      towerChance: 0.35,
    },
  },
  neighborhoods: [
    { id: 'oxford-street', name: 'Oxford Street', bounds: { minX: -10, maxX: 10, minZ: -45, maxZ: 45 }, description: 'Shops, chop bars and nightlife', atmosphere: 'commercial' },
    { id: 'labone', name: 'Labone', bounds: { minX: -45, maxX: -10, minZ: 6, maxZ: 45 }, description: 'Leafy streets and apartments', atmosphere: 'residential' },
    { id: 'osu-west', name: 'Osu', bounds: { minX: -45, maxX: -10, minZ: -45, maxZ: 6 }, description: 'Old Osu: crafts, colleges and markets', atmosphere: 'urban' },
    { id: 'cantonments', name: 'Cantonments', bounds: { minX: 10, maxX: 45, minZ: -45, maxZ: 45 }, description: 'Offices, towers and the arena', atmosphere: 'urban' },
  ],
  vendors: [
    {
      id: 'osu-chop-bar', name: 'Osu Chop Bar', kind: 'Ghanaian chop bar', position: [-7, 0, 33],
      menu: ['fufu-light-soup', 'banku-tilapia', 'kenkey-fish', 'groundnut-soup', 'kontomire', 'jollof-ghana', 'red-red'],
    },
    {
      id: 'auntie-muni', name: "Auntie Muni's Waakye", kind: 'Waakye joint', position: [7, 0, 22],
      menu: ['waakye-special', 'waakye-plain', 'jollof-ghana', 'red-red', 'kelewele'],
    },
    {
      id: 'kelewele-corner', name: 'Kelewele corner', kind: 'Street food', position: [-6.3, 0, 41.5],
      menu: ['kelewele', 'chichinga', 'puff-puff', 'fruit'],
    },
  ],
  fashionHouse: { name: 'Kente Loft', kind: 'Kente, prints & salon', position: [-7, 0, -4] },
  gadgetHub: { name: 'Osu Gadgets', kind: 'Phones, laptops & work kit', position: [-7, 0, -16] },
  travelDesk: { name: 'Osu Travel', kind: 'Flights & coaches', position: [7, 0, 40] },
  park: {
    id: 'osu-green', name: 'Osu Green', kind: 'Public park', position: [-26, 0, -10.5],
    description: 'A patch of green behind Oxford Street with neem trees and benches. Quiet in the day, busy with chatter in the evening.',
  },
  nightlife: {
    id: 'osu-nights', name: 'Osu Nights', kind: 'Live music lounge', position: [-7, 0, -23], cover: 220,
    description: 'Highlife and hiplife on a small stage, kelewele from the kitchen, open late.',
  },
  homes: [
    {
      id: 'labone-court-chamber', district: 'accra.osu', name: 'Labone Court, chamber and hall', kind: 'Chamber and hall', building: 'Labone Court',
      door: [-7, 0, 22], rentPerNight: 90, description: 'A bedroom and a small sitting room, with a shared compound kitchen.',
    },
    {
      id: 'osu-heights-flat', district: 'accra.osu', name: 'Osu Heights, flat 5', kind: 'One-bedroom apartment', building: 'Osu Heights',
      door: [26, 0, 25.5], rentPerNight: 240, description: 'Bright one-bedroom flat with air conditioning and a view of Oxford Street.',
    },
    {
      id: 'cantonments-penthouse', district: 'accra.osu', name: 'Cantonments Towers penthouse', kind: 'Penthouse', building: 'Cantonments Towers',
      door: [28, 0, -21], rentPerNight: 1100, description: 'Top-floor apartment with a terrace, gym, pool and 24-hour security.',
    },
  ],
  workplaces: {
    student: { name: 'Accra Business School', description: 'Lectures and study groups', position: [-7, 0, -32], neighborhood: 'osu-west' },
    artist: { name: 'Labadi Arts Centre', description: 'Studios and gallery space', position: [7, 0, -4], neighborhood: 'oxford-street' },
    entrepreneur: { name: 'Osu Coworking', description: 'Desks, meeting rooms and investors', position: [7, 0, -18], neighborhood: 'oxford-street' },
    athlete: { name: 'Accra Sports Arena', description: 'Training ground and gym', position: [19, 0, -6], neighborhood: 'cantonments' },
    engineer: { name: 'Accra Tech Hub', description: 'Start-ups and software studios', position: [-18.5, 0, 26], neighborhood: 'labone' },
    doctor: { name: 'Osu Clinic', description: 'Outpatients and emergency care', position: [7, 0, 30], neighborhood: 'oxford-street' },
    pilot: { name: 'Airline Crew Centre', description: 'Briefings before every flight', position: [7, 0, -34], neighborhood: 'oxford-street' },
  },
};
