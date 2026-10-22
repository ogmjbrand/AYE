/**
 * Lagos, Marina Boulevard: the first district. A palm-lined boulevard with a
 * buka, a roadside market, danfo bus stops and power lines down the west side.
 */
import { building as b } from '../world';
import type { DistrictSpec } from '../geography';

export const LAGOS_MARINA: DistrictSpec = {
  id: 'lagos.marina',
  city: { id: 'lagos', name: 'Lagos', region: 'Lagos', country: 'NG', timeZone: 'Africa/Lagos', currency: 'NGN', lat: 6.45, lon: 3.39 },
  name: 'Marina Boulevard',
  spawn: [1.5, 0, 2],
  layout: {
    id: 'lagos.marina',
    roadHalfWidth: 4,
    pavementWidth: 3,
    crossStreet: { minZ: -24, maxZ: -16 },
    buildings: [
      // West side, north of the cross street
      b(-11, -6, 6, 12, 7, 'shop', '#d9c7a3', 'Mama Put'),
      b(-11, 9, 6, 12, 14, 'residential', '#e8d9b5', 'Marina Court'),
      b(-22, 0, 12, 14, 42, 'tower', '#5f7f8f'),
      b(-11, 24, 6, 12, 17, 'residential', '#d8a47f', 'Palm View'),
      b(-23, 24, 10, 12, 22, 'office', '#c9ccc8', 'Tech Campus'),
      b(-11, 38, 6, 10, 7, 'shop', '#c7d3c0', 'Gadget Hub'),
      // The Palms restaurant, fronting the cross street behind Mama Put
      b(-21, -10.25, 12, 5.5, 7, 'shop', '#1f2c27'),
      // West side, south of the cross street
      b(-13, -36, 10, 12, 18, 'office', '#d6cdbd', 'University'),
      // Eko Motors car showroom, its glass front on the cross street side
      b(-26, -36, 10, 10, 13, 'shop', '#2a2c30', 'Eko Motors'),
      // East side, north of the cross street
      b(13, -6, 10, 12, 16, 'office', '#eceae4', 'General Hospital'),
      b(14, 12, 12, 12, 38, 'tower', '#486a7e'),
      b(11, 20, 6, 3.6, 7, 'shop', '#5b4a5e', 'Lagoon Live'),
      b(11, 27, 6, 10, 7, 'shop', '#e0b98f', 'Art Studio'),
      b(24, 27, 10, 10, 15, 'residential', '#efe3c8', 'Eko Gardens'),
      b(11, 3, 6, 5, 6, 'shop', '#e9d3b0', 'Taste of Africa'),
      b(11, 39, 6, 8, 6, 'shop', '#d7c4e0', 'Fashion House'),
      // East side, south of the cross street
      b(14, -36, 12, 12, 46, 'tower', '#3f5f73', 'Marina Heights'),
      b(28, -36, 8, 10, 12, 'residential', '#dcc2a2'),
    ],
    palms: { x: 6.3, spacing: 12, offset: 2 },
    lamps: { x: 4.5, spacing: 12, offset: 8 },
    // Wooden power poles run down the west pavement only, as is common in Lagos
    powerPoles: [-40, -30, -8, 4, 16, 28, 40].map((z) => [-6.7, 0, z] as const),
    // Parked danfo minibuses at the kerbside bus stops
    vehicles: [
      { position: [3, 0, 30], heading: 0, color: '#f2b705' },
      { position: [3, 0, 36.5], heading: 0, color: '#f2b705' },
      { position: [-3, 0, -36], heading: Math.PI, color: '#f2b705' },
      { position: [-3, 0, 10], heading: Math.PI, color: '#e9a800' },
    ],
    // Danfos and the odd private car, driving on the right
    traffic: [
      { x: -0.9, dir: 1, count: 2, colors: ['#f2b705', '#e9a800'], stripes: true },
      { x: 0.9, dir: -1, count: 2, colors: ['#f2b705', '#2f3a44'], stripes: true },
    ],
    // Market stalls with umbrellas on the pavement outside the shop row
    stalls: [[-6.2, 0, -10.5], [-6.2, 0, -7.5], [-6.2, 0, -1.5]],
    billboard: [-14, 0, -28.6],
    // Two chairs either side of Lagoon Live's door, facing the street
    terraceChairs: [{ x: 7.6, z: 18.75, facing: -Math.PI / 2 }, { x: 7.6, z: 21.25, facing: -Math.PI / 2 }],
    // Uptown Gardens, behind the hospital: in from the cross street, paths crossing at the middle
    park: {
      area: { minX: 20, maxX: 33, minZ: -13, maxZ: 4 },
      trees: [[21.5, -11.5], [31.5, -11.5], [22, -7], [30.5, -7.5], [21.5, -1.5], [31, -1], [22.5, 2.5], [30, 2.5], [29.5, -10.5], [23, -10]],
      benches: [
        { x: 24.6, z: -7, facing: Math.PI / 2 }, { x: 27.4, z: -7, facing: -Math.PI / 2 },
        { x: 24.6, z: 0, facing: Math.PI / 2 }, { x: 27.4, z: 0, facing: -Math.PI / 2 },
      ],
      paths: [{ x0: 25, x1: 27, z0: -13, z1: 4 }, { x0: 20, x1: 33, z0: -4.5, z1: -2.5 }],
    },
    skyline: {
      seed: 311,
      warm: ['#d8c4a2', '#e3d2b4', '#c9b08c', '#d9a982', '#e8dcc6', '#bfb6a6'],
      glass: ['#4f6f82', '#5d7d8c', '#3f5f73', '#6a8796'],
      towerChance: 0.55,
    },
  },
  // Real Lagos areas, laid over the district: the boulevard runs along the Marina, Victoria Island lies south over the bridge
  neighborhoods: [
    { id: 'downtown', name: 'Lagos Island', bounds: { minX: -30, maxX: 15, minZ: -20, maxZ: 0 }, description: 'Markets, offices and the old city', atmosphere: 'urban' },
    { id: 'harbor', name: 'Marina', bounds: { minX: -20, maxX: 0, minZ: 0, maxZ: 25 }, description: 'The waterfront and the boulevard', atmosphere: 'commercial' },
    { id: 'uptown', name: 'Ikoyi', bounds: { minX: 10, maxX: 30, minZ: -15, maxZ: 15 }, description: 'Leafy streets, smart homes and boutiques', atmosphere: 'residential' },
    { id: 'industrial', name: 'Apapa', bounds: { minX: -35, maxX: -15, minZ: 10, maxZ: 35 }, description: 'The port, warehouses and logistics', atmosphere: 'industrial' },
    { id: 'parks', name: 'Onikan', bounds: { minX: 0, maxX: 20, minZ: 20, maxZ: 45 }, description: 'Green spaces, culture and recreation', atmosphere: 'residential' },
    { id: 'vi', name: 'Victoria Island', bounds: { minX: -35, maxX: 35, minZ: -45, maxZ: -24 }, description: 'Towers, fine dining and the lagoon', atmosphere: 'residential' },
  ],
  vendors: [
    {
      id: 'mama-put', name: 'Mama Put', kind: 'Nigerian buka', position: [-5.2, 0, -4.5],
      menu: ['jollof-dodo', 'jollof-chicken', 'ewa-agoyin', 'efo-riro-vegan', 'efo-riro-assorted', 'amala-gbegiri', 'moi-moi', 'fried-rice-prawns'],
    },
    {
      id: 'roadside-market', name: 'Roadside market', kind: 'Street food and snacks', position: [-5.0, 0, -9],
      menu: ['boli-epa', 'akara-pap', 'puff-puff', 'fruit', 'suya', 'chin-chin', 'roast-fish'],
    },
    {
      id: 'taste-of-africa', name: 'Taste of Africa', kind: 'Pan-African kitchen', position: [5.5, 0, 3],
      menu: ['misir-shiro', 'red-red', 'sukuma-ugali', 'githeri', 'mafe-vegan', 'thieboudienne', 'koshari', 'vegetable-tagine', 'chakalaka-pap', 'bean-bunny-chow', 'bobotie', 'shakshuka', 'doro-wat'],
    },
  ],
  fashionHouse: { name: 'Fashion House', kind: 'Boutique & salon', position: [5.5, 0, 39] },
  gadgetHub: { name: 'Gadget Hub', kind: 'Phones, laptops & work kit', position: [-5.5, 0, 38] },
  travelDesk: { name: 'Marina Travel', kind: 'Flights & coaches', position: [5.5, 0, -12] },
  park: {
    id: 'uptown-gardens', name: 'Uptown Gardens', kind: 'Public park', position: [26, 0, -3.5],
    description: 'Shade trees, benches and a breeze off the lagoon. Locals come here to sit out the heat of the afternoon.',
  },
  nightlife: {
    id: 'lagoon-live', name: 'Lagoon Live', kind: 'Live music lounge', position: [5.5, 0, 20], cover: 250,
    description: 'Afrobeats and highlife from a house band, small chops at the bar, open late.',
  },
  dealership: { id: 'eko-motors', name: 'Eko Motors', kind: 'Car dealership', door: [-26, 0, -29.6], facing: 0 },
  restaurant: { id: 'the-palms', name: 'The Palms Restaurant', kind: 'Fine dining & lounge', door: [-21, 0, -14.3], facing: Math.PI },
  homes: [
    {
      id: 'marina-court-room', district: 'lagos.marina', name: 'Marina Court, room 4B', kind: 'Room in a shared flat', building: 'Marina Court',
      door: [-5.5, 0, 9], rentPerNight: 80, description: 'A single room with a fan. Shared kitchen and bathroom with three flatmates.',
    },
    {
      id: 'palm-view-mini', district: 'lagos.marina', name: 'Palm View, mini flat', kind: 'Mini flat', building: 'Palm View',
      door: [-5.5, 0, 24], rentPerNight: 180, description: 'Your own bedroom, kitchenette and bathroom, two minutes from the boulevard.',
    },
    {
      id: 'eko-gardens-2bed', district: 'lagos.marina', name: 'Eko Gardens, flat 12', kind: 'Two-bedroom apartment', building: 'Eko Gardens',
      door: [24, 0, 20.5], rentPerNight: 400, description: 'Two bedrooms, a balcony and a backup generator. Room for a flatmate or a home office.',
    },
    {
      id: 'marina-heights-penthouse', district: 'lagos.marina', name: 'Marina Heights penthouse', kind: 'Penthouse', building: 'Marina Heights',
      door: [5.5, 0, -36], rentPerNight: 1200, description: 'Top floor of the tower with views over the lagoon, a concierge and a pool.',
    },
  ],
  // Marker positions sit on the pavement or plaza in front of the matching building
  workplaces: {
    student: { name: 'University', description: 'Continue your education', position: [-5.5, 0, -36], neighborhood: 'downtown' },
    artist: { name: 'Studio', description: 'Create and express yourself', position: [5.5, 0, 27], neighborhood: 'uptown' },
    entrepreneur: { name: 'Office', description: 'Run your business operations', position: [5.5, 0, 12], neighborhood: 'harbor' },
    athlete: { name: 'Sports Complex', description: 'Train and compete', position: [24, 0, 40], neighborhood: 'parks' },
    engineer: { name: 'Tech Campus', description: 'Build and innovate', position: [-16, 0, 24], neighborhood: 'industrial' },
    doctor: { name: 'Hospital', description: 'Heal and help others', position: [5.5, 0, -6], neighborhood: 'downtown' },
    pilot: { name: 'Airport', description: 'Fly across the world', position: [29, 0, 12], neighborhood: 'parks' },
  },
};
