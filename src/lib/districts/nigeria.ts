/**
 * Nigeria: a district in every state capital and Abuja, on top of the
 * hand-built Lagos district. Cities share the food, music and clothes of
 * their part of the country (the six geopolitical zones); coordinates are
 * the city centres, used for travel distances.
 */
import type { CitySeed, RegionStyle, VendorStyle } from './generate';

const NG_HOMES: RegionStyle['homes'] = {
  marina: [
    { kind: 'Room in a shared flat', description: 'A single room with a fan. Shared kitchen and bathroom with three flatmates.' },
    { kind: 'Mini flat', description: 'Your own bedroom, kitchenette and bathroom, a short walk from the main road.' },
    { kind: 'Two-bedroom apartment', description: 'Two bedrooms, a balcony and a backup generator. Room for a flatmate or a home office.' },
    { kind: 'Penthouse', description: 'Top floor of the tower with a view over the city, a concierge and a backup generator.' },
  ],
  osu: [
    { kind: 'Self-contain', description: 'One room with its own kitchenette and bathroom, in a quiet compound.' },
    { kind: 'One-bedroom apartment', description: 'Bright one-bedroom flat with air conditioning and a view of the main road.' },
    { kind: 'Penthouse', description: 'Top-floor apartment with a terrace, a gym and 24-hour security.' },
  ],
};

const NIGERIAN_KITCHEN: VendorStyle = {
  names: ['{city} Kitchen', 'Jollof & Grill'],
  kind: 'Nigerian kitchen',
  menu: ['jollof-dodo', 'jollof-chicken', 'fried-rice-prawns', 'moi-moi', 'pounded-yam-egusi', 'egusi-vegan', 'roast-yam-pepper'],
};

/** For the biggest cities: food from across the continent. */
const PAN_AFRICAN: VendorStyle = {
  names: ['Taste of Africa'],
  kind: 'Pan-African kitchen',
  menu: ['misir-shiro', 'red-red', 'sukuma-ugali', 'githeri', 'mafe-vegan', 'thieboudienne', 'koshari', 'vegetable-tagine', 'chakalaka-pap', 'bean-bunny-chow', 'bobotie', 'shakshuka', 'doro-wat'],
};

const SOUTH_WALLS = ['#e3d2b4', '#d8c4a2', '#e8dcc6', '#c9b08c', '#efe3c8', '#d9cbb0'];
const NORTH_WALLS = ['#c99a6b', '#b98a5f', '#d4b08a', '#a87a52', '#dcc2a0', '#c4a07c'];
const BUSES = ['#e6e4dc', '#d7dde3', '#c9d3d8'];
const SOUTH_PARK = { names: ['Recreation Park', 'Gardens', 'Green', 'Garden Square'], description: 'Mango and almond trees over the benches. A shady spot to sit out the afternoon.' };
const NORTH_PARK = { names: ['Recreation Park', 'Gardens', 'Green', 'Garden Square'], description: 'Neem trees and benches. Busy in the cool of the evening, after the heat of the day.' };

// Common given and family names, for the computer-controlled residents
const HAUSA = { male: ['Musa', 'Ibrahim', 'Abubakar', 'Sani', 'Usman', 'Aliyu', 'Bashir'], female: ['Aisha', 'Fatima', 'Hauwa', 'Zainab', 'Amina', 'Hadiza', 'Maryam'], family: ['Bello', 'Abdullahi', 'Garba', 'Danjuma', 'Yusuf', 'Lawal', 'Sule'] };
const KANURI = { male: ['Modu', 'Bukar', 'Kachalla', 'Ibrahim', 'Musa', 'Umar', 'Goni'], female: ['Falmata', 'Yagana', 'Hauwa', 'Aisha', 'Kaltum', 'Zara', 'Amina'], family: ['Bukar', 'Modu', 'Kyari', 'Shettima', 'Lawan', 'Mustapha', 'Garba'] };
const MIDDLE = { male: ['Terver', 'Aondona', 'Dauda', 'Yakubu', 'Samuel', 'Emmanuel', 'Daniel'], female: ['Doosuur', 'Ladi', 'Hannatu', 'Comfort', 'Mary', 'Ene', 'Rahila'], family: ['Gyang', 'Pam', 'Akaa', 'Ameh', 'Okpe', 'Agbo', 'Iorliam'] };
const YORUBA = { male: ['Segun', 'Femi', 'Kunle', 'Dayo', 'Wale', 'Tayo', 'Gbenga'], female: ['Bisi', 'Funke', 'Yetunde', 'Kemi', 'Ronke', 'Titi', 'Bukola'], family: ['Adeyemi', 'Ogunleye', 'Balogun', 'Oladipo', 'Akinola', 'Adebayo', 'Ojo'] };
const IGBO = { male: ['Chinedu', 'Emeka', 'Obinna', 'Ikenna', 'Chukwudi', 'Uche', 'Kelechi'], female: ['Ngozi', 'Chioma', 'Amaka', 'Ifeoma', 'Nkechi', 'Adaora', 'Ebere'], family: ['Okafor', 'Eze', 'Nwosu', 'Okeke', 'Obi', 'Nnaji', 'Onyeka'] };
const SOUTH_SOUTH_NAMES = { male: ['Efe', 'Osas', 'Tamuno', 'Ekpo', 'Ebi', 'Ovie', 'Etim'], female: ['Ese', 'Osaro', 'Imaobong', 'Ebiere', 'Mfon', 'Tari', 'Uduak'], family: ['Edet', 'Bassey', 'Omoregie', 'Briggs', 'Okon', 'Igbinedion', 'Ikiriko'] };

const NORTH_SNACKS: VendorStyle = {
  names: ['Mai Suya', 'Suya spot'],
  kind: 'Suya and street snacks',
  menu: ['suya', 'kilishi', 'awara', 'masa', 'fura-da-nono', 'fruit', 'puff-puff'],
};

export const NORTH_WEST: RegionStyle = {
  vehicles: ['tricycle', 'minibus'],
  kitchen: {
    names: ['Mai Tuwo', 'Gidan Abinci', 'Hajiya Kitchen'],
    kind: 'Tuwo house',
    menu: ['tuwo-miyan-kuka', 'tuwo-miyan-taushe', 'dan-wake', 'masa', 'kosai-koko', 'jollof-dodo', 'moi-moi'],
  },
  snacks: NORTH_SNACKS,
  second: NIGERIAN_KITCHEN,
  lounge: { names: ['Arewa Lounge', 'Sahel Lounge'], description: 'Hausa music and Afrobeats from a house band, with suya, zobo and soft drinks. No alcohol served.' },
  fashion: { name: 'Kaftan House', kind: 'Kaftans, babban riga & salon' },
  park: NORTH_PARK,
  walls: NORTH_WALLS,
  buses: BUSES,
  busStripes: false,
  homes: NG_HOMES,
  names: HAUSA,
};

export const NORTH_EAST: RegionStyle = {
  ...NORTH_WEST,
  kitchen: {
    names: ['Mai Tuwo', 'Gidan Abinci', 'Hajiya Kitchen'],
    kind: 'Tuwo house',
    menu: ['tuwo-miyan-kuka', 'tuwo-miyan-taushe', 'dambu-nama', 'dan-wake', 'masa', 'kosai-koko', 'moi-moi'],
  },
  lounge: { names: ['Sahel Lounge', 'Arewa Lounge'], description: 'Northern music and Afrobeats from a house band, with suya and soft drinks. No alcohol served.' },
};

/** Borno and Yobe: Kanuri country. */
const KANEM: RegionStyle = { ...NORTH_EAST, names: KANURI };

export const NORTH_CENTRAL: RegionStyle = {
  vehicles: ['minibus', 'tricycle'],
  kitchen: {
    names: ['Food Basket', 'Yam House', 'Mama Put'],
    kind: 'Middle Belt kitchen',
    menu: ['pounded-yam-egusi', 'egusi-vegan', 'roast-yam-pepper', 'acha-jollof', 'tuwo-miyan-kuka', 'jollof-dodo', 'moi-moi'],
  },
  snacks: {
    names: ['Suya spot', 'Roadside market'],
    kind: 'Street food and snacks',
    menu: ['suya', 'kosai-koko', 'puff-puff', 'fruit', 'boli-epa', 'chin-chin', 'roast-fish'],
  },
  second: NIGERIAN_KITCHEN,
  lounge: { names: ['{city} Live', 'Middle Belt Lounge'], description: 'Afrobeats, highlife and local bands on a small stage, pepper soup from the kitchen, open late.' },
  fashion: { name: 'Fashion House', kind: 'Boutique & salon' },
  park: SOUTH_PARK,
  walls: SOUTH_WALLS,
  buses: BUSES,
  busStripes: false,
  homes: NG_HOMES,
  names: MIDDLE,
};

export const SOUTH_WEST: RegionStyle = {
  vehicles: ['minibus', 'tricycle'],
  kitchen: {
    names: ['Mama Put', 'Amala Spot', 'Iya Bose Buka'],
    kind: 'Yoruba buka',
    menu: ['amala-gbegiri', 'ewa-agoyin', 'efo-riro-vegan', 'efo-riro-assorted', 'ofada-ayamase', 'ikokore', 'moi-moi', 'jollof-dodo'],
  },
  snacks: {
    names: ['Roadside market', 'Boli corner'],
    kind: 'Street food and snacks',
    menu: ['boli-epa', 'akara-pap', 'puff-puff', 'fruit', 'suya', 'chin-chin', 'plantain-chips'],
  },
  second: NIGERIAN_KITCHEN,
  lounge: { names: ['Fuji House', 'Juju Garden', '{city} Live'], description: 'Fuji, juju and Afrobeats from a house band, small chops at the bar, open late.' },
  fashion: { name: 'Aso-oke House', kind: 'Aso-oke, adire & salon' },
  park: SOUTH_PARK,
  walls: SOUTH_WALLS,
  buses: BUSES,
  busStripes: false,
  homes: NG_HOMES,
  names: YORUBA,
};

export const SOUTH_EAST: RegionStyle = {
  vehicles: ['minibus', 'tricycle'],
  kitchen: {
    names: ['Mama Chi Kitchen', 'Nne Kitchen', 'Ofe House'],
    kind: 'Igbo kitchen',
    menu: ['ofe-onugbu', 'okpa', 'ukwa', 'abacha', 'nkwobi', 'egusi-vegan', 'jollof-dodo', 'moi-moi'],
  },
  snacks: {
    names: ['Roadside market', 'Corn and ube corner'],
    kind: 'Street food and snacks',
    menu: ['corn-ube', 'okpa', 'akara-pap', 'puff-puff', 'fruit', 'suya', 'plantain-chips'],
  },
  second: NIGERIAN_KITCHEN,
  lounge: { names: ['Highlife Lounge', 'Ogene Lounge', '{city} Live'], description: 'Highlife and Afrobeats from a house band, nkwobi from the kitchen, open late.' },
  fashion: { name: 'Isiagu House', kind: 'Isiagu shirts, wrappers & salon' },
  park: SOUTH_PARK,
  walls: SOUTH_WALLS,
  buses: BUSES,
  busStripes: false,
  homes: NG_HOMES,
  names: IGBO,
};

export const SOUTH_SOUTH: RegionStyle = {
  vehicles: ['minibus', 'tricycle'],
  kitchen: {
    names: ['Creek Kitchen', 'Mama Calabar Kitchen', 'Soup Pot'],
    kind: 'Soup kitchen',
    menu: ['banga-starch', 'edikang-ikong', 'afang', 'ekpang-nkukwo', 'catfish-pepper-soup', 'egusi-vegan', 'jollof-dodo', 'moi-moi'],
  },
  snacks: {
    names: ['Bole spot', 'Roadside market'],
    kind: 'Bole and street snacks',
    menu: ['bole-fish', 'plantain-chips', 'roast-fish', 'corn-ube', 'puff-puff', 'fruit', 'boli-epa'],
  },
  second: NIGERIAN_KITCHEN,
  lounge: { names: ['Creek Lounge', 'Delta Groove', '{city} Live'], description: 'Afrobeats and highlife on a small stage, pepper soup from the kitchen, open late.' },
  fashion: { name: 'Wrapper House', kind: 'George wrappers, prints & salon' },
  park: SOUTH_PARK,
  walls: SOUTH_WALLS,
  buses: BUSES,
  busStripes: false,
  homes: NG_HOMES,
  names: SOUTH_SOUTH_NAMES,
};

const ng = (id: string, name: string, region: string, lat: number, lon: number, style: RegionStyle, cost: number, area?: string): CitySeed => ({
  id, name, region, country: 'NG', timeZone: 'Africa/Lagos', currency: 'NGN', lat, lon, style, cost, ...(area ? { area } : {}),
});

/** Abuja and the 36 state capitals except Lagos (built by hand in lagos.ts), north to south by zone. */
export const NIGERIA: readonly CitySeed[] = [
  // North Central and the capital
  ng('abuja', 'Abuja', 'Federal Capital Territory', 9.06, 7.49, { ...NORTH_CENTRAL, second: PAN_AFRICAN }, 1.1, 'Wuse 2'),
  ng('jos', 'Jos', 'Plateau', 9.9, 8.86, NORTH_CENTRAL, 0.6, 'Terminus'),
  ng('makurdi', 'Makurdi', 'Benue', 7.73, 8.54, NORTH_CENTRAL, 0.55),
  ng('lafia', 'Lafia', 'Nasarawa', 8.49, 8.52, NORTH_CENTRAL, 0.5),
  ng('lokoja', 'Lokoja', 'Kogi', 7.8, 6.74, NORTH_CENTRAL, 0.5),
  ng('minna', 'Minna', 'Niger', 9.61, 6.55, NORTH_CENTRAL, 0.55),
  ng('ilorin', 'Ilorin', 'Kwara', 8.5, 4.55, NORTH_CENTRAL, 0.6, 'Taiwo Road'),
  // North West
  ng('kano', 'Kano', 'Kano', 12.0, 8.52, NORTH_WEST, 0.7, 'Sabon Gari'),
  ng('kaduna', 'Kaduna', 'Kaduna', 10.52, 7.44, NORTH_WEST, 0.65, 'Ahmadu Bello Way'),
  ng('katsina', 'Katsina', 'Katsina', 12.99, 7.6, NORTH_WEST, 0.5),
  ng('sokoto', 'Sokoto', 'Sokoto', 13.06, 5.24, NORTH_WEST, 0.5),
  ng('birnin-kebbi', 'Birnin Kebbi', 'Kebbi', 12.45, 4.2, NORTH_WEST, 0.45),
  ng('gusau', 'Gusau', 'Zamfara', 12.16, 6.66, NORTH_WEST, 0.45),
  ng('dutse', 'Dutse', 'Jigawa', 11.76, 9.34, NORTH_WEST, 0.45),
  // North East
  ng('maiduguri', 'Maiduguri', 'Borno', 11.83, 13.15, KANEM, 0.55, 'Monday Market'),
  ng('yola', 'Yola', 'Adamawa', 9.2, 12.48, NORTH_EAST, 0.5),
  ng('bauchi', 'Bauchi', 'Bauchi', 10.31, 9.84, NORTH_EAST, 0.5),
  ng('gombe', 'Gombe', 'Gombe', 10.29, 11.17, NORTH_EAST, 0.5),
  ng('jalingo', 'Jalingo', 'Taraba', 8.89, 11.36, NORTH_EAST, 0.45),
  ng('damaturu', 'Damaturu', 'Yobe', 11.75, 11.96, KANEM, 0.45),
  // South West
  ng('ibadan', 'Ibadan', 'Oyo', 7.38, 3.95, SOUTH_WEST, 0.7, 'Dugbe'),
  ng('abeokuta', 'Abeokuta', 'Ogun', 7.15, 3.35, SOUTH_WEST, 0.6, 'Oke-Ilewo'),
  ng('akure', 'Akure', 'Ondo', 7.25, 5.2, SOUTH_WEST, 0.55),
  ng('osogbo', 'Osogbo', 'Osun', 7.77, 4.56, SOUTH_WEST, 0.55),
  ng('ado-ekiti', 'Ado-Ekiti', 'Ekiti', 7.62, 5.22, SOUTH_WEST, 0.5),
  // South East
  ng('enugu', 'Enugu', 'Enugu', 6.45, 7.51, SOUTH_EAST, 0.75, 'Ogui Road'),
  ng('owerri', 'Owerri', 'Imo', 5.48, 7.03, SOUTH_EAST, 0.65, 'Wetheral Road'),
  ng('awka', 'Awka', 'Anambra', 6.21, 7.07, SOUTH_EAST, 0.6),
  ng('umuahia', 'Umuahia', 'Abia', 5.53, 7.49, SOUTH_EAST, 0.55),
  ng('abakaliki', 'Abakaliki', 'Ebonyi', 6.32, 8.11, SOUTH_EAST, 0.5),
  // South South
  ng('port-harcourt', 'Port Harcourt', 'Rivers', 4.82, 7.03, { ...SOUTH_SOUTH, second: PAN_AFRICAN }, 0.9),
  ng('benin-city', 'Benin City', 'Edo', 6.34, 5.62, SOUTH_SOUTH, 0.7, 'Ring Road'),
  ng('calabar', 'Calabar', 'Cross River', 4.95, 8.32, SOUTH_SOUTH, 0.65, 'Marian Road'),
  ng('uyo', 'Uyo', 'Akwa Ibom', 5.04, 7.93, SOUTH_SOUTH, 0.65),
  ng('asaba', 'Asaba', 'Delta', 6.2, 6.73, SOUTH_SOUTH, 0.6),
  ng('yenagoa', 'Yenagoa', 'Bayelsa', 4.93, 6.27, SOUTH_SOUTH, 0.55),
];
