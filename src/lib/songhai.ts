/**
 * Songhai: AYE's fictional home country, and the single source of truth for
 * its states, cities and the names shown for them.
 *
 * Stable IDs vs names. Saved games refer to places by ID: the district a
 * player is in (`lagos.marina`), their home (`marina-court-room`), the places
 * they have visited and the residents they know. Those IDs were made when the
 * country used real Nigerian names, and they never change. Everything the
 * player *sees* is mapped here instead:
 *   - every city has a Songhai name and belongs to one of the 12 states;
 *   - districts named after real streets get original area names;
 *   - leftover real place names in shop, home and food text are rewritten
 *     (`songhaiText`) wherever Songhai districts and menus are displayed.
 * The country keeps the internal code 'NG' for the same reason (characters
 * save it as their home country); `countryName('NG')` shows "Songhai".
 *
 * Coordinates of the cities are only used for travel distances and the
 * travel desk's map, which is not a political map of any real country.
 */

export const SONGHAI_CODE = 'NG';

export const SONGHAI = {
  /** Internal, never shown: the country code saved on characters. */
  code: SONGHAI_CODE,
  name: 'Songhai',
  demonym: 'Songhaian',
  motto: 'Unity · Craft · Tomorrow',
  /** Colours of the flag: deep indigo, gold and emerald (not the AYE logo colours). */
  flag: { top: '#1b2a55', middle: '#d4af5a', bottom: '#1f5a47', emblem: '#f3d48f' },
  capitalStateId: 'aderan',
  capitalCityId: 'lagos',
} as const;

export interface SonghaiState {
  /** Stable ID: never change it once released. */
  id: string;
  name: string;
  /** City ID of the state capital (one of `cityIds`). */
  capitalCityId: string;
  /** Playable cities: each is a walkable district in the game (lib/geography.ts). */
  cityIds: readonly string[];
  /** Towns on the map that aren't built yet: shown as coming later, never bookable. */
  planned: readonly string[];
  identity: string;
}

export const STATES: readonly SonghaiState[] = [
  { id: 'aderan', name: 'Aderan', capitalCityId: 'lagos', cityIds: ['lagos', 'abeokuta', 'ibadan'], planned: ['Lagoon Point'],
    identity: 'The coastal heart of Songhai and home of the national capital: lagoon towers, markets and the busiest nightlife in the country.' },
  { id: 'zunara', name: 'Zunara', capitalCityId: 'ilorin', cityIds: ['ilorin', 'minna', 'lokoja'], planned: ['Riverbend'],
    identity: 'River country where two great rivers meet; trading towns, ferries and old craft quarters.' },
  { id: 'kembala', name: 'Kembala', capitalCityId: 'abuja', cityIds: ['abuja', 'lafia', 'makurdi'], planned: ['Kembala Hills'],
    identity: 'Wide boulevards and government offices in the centre of the country, with farmland and yam markets around them.' },
  { id: 'oruma', name: 'Oruma', capitalCityId: 'akure', cityIds: ['akure', 'osogbo', 'ado-ekiti'], planned: ['Cocoa Ridge'],
    identity: 'Green hills, cocoa farms and art: weavers, dyers and sculptors in every town.' },
  { id: 'velora', name: 'Velora', capitalCityId: 'jos', cityIds: ['jos', 'bauchi', 'gombe'], planned: ['Highrock'],
    identity: 'A cool high plateau of rock hills and reservoirs, with fonio dishes and the mildest weather in Songhai.' },
  { id: 'nambara', name: 'Nambara', capitalCityId: 'kano', cityIds: ['kano', 'dutse', 'katsina'], planned: ['Dye Pits'],
    identity: 'Ancient walled trading cities of the north: dye pits, leatherwork, grain markets and tuwo houses.' },
  { id: 'talenga', name: 'Talenga', capitalCityId: 'kaduna', cityIds: ['kaduna', 'sokoto', 'birnin-kebbi', 'gusau'], planned: ['Northgate'],
    identity: 'Savannah and textile towns in the north-west, with suya smoke on every corner after sunset.' },
  { id: 'maruva', name: 'Maruva', capitalCityId: 'maiduguri', cityIds: ['maiduguri', 'damaturu', 'yola', 'jalingo'], planned: ['Lakeside'],
    identity: 'The far north-east, from the lake shore to the mountains: camel markets, dates and spiced dambu.' },
  { id: 'darsuna', name: 'Darsuna', capitalCityId: 'enugu', cityIds: ['enugu', 'awka', 'abakaliki'], planned: ['Coal Valley'],
    identity: 'Hilly south-east country of traders and makers: busy markets, okpa at breakfast and big family weekends.' },
  { id: 'elumba', name: 'Elumba', capitalCityId: 'owerri', cityIds: ['owerri', 'umuahia'], planned: ['Palm Grove'],
    identity: 'Easy-going garden towns with the best pepper soup spots and late-night lounges in the south-east.' },
  { id: 'korava', name: 'Korava', capitalCityId: 'port-harcourt', cityIds: ['port-harcourt', 'yenagoa', 'calabar', 'uyo'], planned: ['Mangrove Bay'],
    identity: 'The creeks and the coast: oil-city money, carnival, soup kitchens and seafood on the waterfront.' },
  { id: 'yandora', name: 'Yandora', capitalCityId: 'benin-city', cityIds: ['benin-city', 'asaba'], planned: ['Bronze Gate'],
    identity: 'An old royal city famous for bronze casting, and its sister city across the river.' },
];

/** Songhai's name for each city (by its stable ID). */
export const CITY_NAMES: Readonly<Record<string, string>> = {
  lagos: 'Ayemara', abeokuta: 'Kelubo', ibadan: 'Odenra',
  ilorin: 'Ilovia', minna: 'Minaku', lokoja: 'Kogaru',
  abuja: 'Wusara', lafia: 'Lafemi', makurdi: 'Benaru',
  akure: 'Akevo', osogbo: 'Sopelu', 'ado-ekiti': 'Idanro',
  jos: 'Rokani', bauchi: 'Bauvi', gombe: 'Gomaro',
  kano: 'Kanuva', dutse: 'Dutasi', katsina: 'Katiru',
  kaduna: 'Kadoru', sokoto: 'Sakoti', 'birnin-kebbi': 'Kebiran', gusau: 'Gusova',
  maiduguri: 'Maidura', damaturu: 'Damaro', yola: 'Yolani', jalingo: 'Jalvi',
  enugu: 'Enuvia', awka: 'Awkari', abakaliki: 'Ebokali',
  owerri: 'Owera', umuahia: 'Umuvia',
  'port-harcourt': 'Kalaport', yenagoa: 'Yenari', calabar: 'Calvera', uyo: 'Uyembe',
  'benin-city': 'Edova', asaba: 'Asavo',
};

/** Districts named after real streets or quarters: their Songhai area names (by district ID). */
export const AREA_NAMES: Readonly<Record<string, string>> = {
  'lagos.marina': 'Lagoon Boulevard',
  'abuja.wuse-2': 'Crescent Ward',
  'jos.terminus': 'Terminal Square',
  'ilorin.taiwo-road': 'Emirs Road',
  'kano.sabon-gari': 'New Town',
  'kaduna.ahmadu-bello-way': 'Unity Way',
  'maiduguri.monday-market': 'Market Square',
  'ibadan.dugbe': 'Clocktower Hill',
  'abeokuta.oke-ilewo': 'Rock View',
  'enugu.ogui-road': 'Hilltop Road',
  'owerri.wetheral-road': 'Garden Road',
  'benin-city.ring-road': 'Bronze Ring',
  'calabar.marian-road': 'Carnival Road',
};

/**
 * The former real state names, so characters saved with a real state as
 * their home region show (and migrate to) the matching Songhai state.
 */
export const LEGACY_STATE: Readonly<Record<string, string>> = {
  Lagos: 'aderan', Ogun: 'aderan', Oyo: 'aderan',
  Kwara: 'zunara', Niger: 'zunara', Kogi: 'zunara',
  'Federal Capital Territory': 'kembala', Nasarawa: 'kembala', Benue: 'kembala',
  Ondo: 'oruma', Osun: 'oruma', Ekiti: 'oruma',
  Plateau: 'velora', Bauchi: 'velora', Gombe: 'velora',
  Kano: 'nambara', Jigawa: 'nambara', Katsina: 'nambara',
  Kaduna: 'talenga', Sokoto: 'talenga', Kebbi: 'talenga', Zamfara: 'talenga',
  Borno: 'maruva', Yobe: 'maruva', Adamawa: 'maruva', Taraba: 'maruva',
  Enugu: 'darsuna', Anambra: 'darsuna', Ebonyi: 'darsuna',
  Imo: 'elumba', Abia: 'elumba',
  Rivers: 'korava', Bayelsa: 'korava', 'Cross River': 'korava', 'Akwa Ibom': 'korava',
  Edo: 'yandora', Delta: 'yandora',
};

/** Whether a district (by its stable ID, `<city>.<area>`) is in Songhai. */
export const isSonghaiDistrict = (districtId: string) => !!CITY_NAMES[districtId.split('.')[0]];

export const stateById = (id: string | undefined) => STATES.find((s) => s.id === id);
export const stateOfCity = (cityId: string) => STATES.find((s) => s.cityIds.includes(cityId));
export const stateNames = (): string[] => STATES.map((s) => s.name);

/** A saved home region shown for Songhai: a Songhai state name as is, a former real state as its Songhai state. */
export function songhaiRegion(region: string): string {
  if (STATES.some((s) => s.name === region)) return region;
  const id = LEGACY_STATE[region];
  return id ? stateById(id)!.name : region;
}

/** Real names that may still appear in shop, home, area and food text, and what Songhai calls them. Longest first. */
const TEXT_ALIASES: readonly (readonly [string, string])[] = [
  ['Federal Capital Territory', 'Kembala'],
  ['Victoria Island', 'Crescent Island'],
  ['Lagos Island', 'Old Island'],
  ['Marina Boulevard', 'Lagoon Boulevard'],
  ['Port Harcourt', 'Kalaport'],
  ['Benin City', 'Edova'],
  ['Birnin Kebbi', 'Kebiran'],
  ['Ado-Ekiti', 'Idanro'],
  // Real streets and quarters some districts were named after (home and building names repeat them)
  ['Ahmadu Bello Way', 'Unity Way'],
  ['Wetheral Road', 'Garden Road'],
  ['Marian Road', 'Carnival Road'],
  ['Taiwo Road', 'Emirs Road'],
  ['Ogui Road', 'Hilltop Road'],
  ['Sabon Gari', 'New Town'],
  ['Oke-Ilewo', 'Rock View'],
  ['Wuse 2', 'Crescent Ward'],
  ['Dugbe', 'Clocktower Hill'],
  ['Nigerian', 'Songhaian'],
  ['Nigeria', 'Songhai'],
  ['Ikoyi', 'Coral Hill'],
  ['Apapa', 'Harbourside'],
  ['Onikan', 'Arts Quarter'],
  ['Eko', 'Ayemara'],
  ['Borno', 'Maruva'],
  ...Object.entries(CITY_NAMES)
    .map(([id, name]) => [id.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' '), name] as const)
    .filter(([real]) => !['Port Harcourt', 'Benin City', 'Birnin Kebbi', 'Ado Ekiti'].includes(real)),
];
const ALIAS_RE = TEXT_ALIASES.map(([real, ours]) => [new RegExp(`\\b${real.replace(/[-]/g, '\\-')}\\b`, 'g'), ours] as const);

/** Display text with any remaining real Songhai-region place names replaced by their Songhai names. */
export function songhaiText(text: string): string {
  let out = text;
  for (const [re, ours] of ALIAS_RE) out = out.replace(re, ours);
  return out;
}

/** Checks the data for duplicate IDs, missing parents and dangling references. Returns the problems found. */
export function validateSonghai(knownCityIds: readonly string[]): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  const names = new Set<string>();
  const cityOwner = new Map<string, string>();
  for (const s of STATES) {
    if (ids.has(s.id)) problems.push(`duplicate state id ${s.id}`);
    if (names.has(s.name)) problems.push(`duplicate state name ${s.name}`);
    ids.add(s.id);
    names.add(s.name);
    if (!s.cityIds.includes(s.capitalCityId)) problems.push(`${s.id}: capital ${s.capitalCityId} is not one of its cities`);
    for (const c of s.cityIds) {
      if (cityOwner.has(c)) problems.push(`city ${c} is in both ${cityOwner.get(c)} and ${s.id}`);
      cityOwner.set(c, s.id);
      if (!CITY_NAMES[c]) problems.push(`city ${c} has no Songhai name`);
      if (!knownCityIds.includes(c)) problems.push(`city ${c} (${s.id}) is not a playable district`);
    }
  }
  for (const c of knownCityIds) if (!cityOwner.has(c)) problems.push(`playable city ${c} belongs to no state`);
  for (const c of Object.keys(CITY_NAMES)) if (!cityOwner.has(c)) problems.push(`named city ${c} belongs to no state`);
  const cityNames = Object.values(CITY_NAMES);
  for (const n of cityNames) if (cityNames.indexOf(n) !== cityNames.lastIndexOf(n)) problems.push(`duplicate city name ${n}`);
  if (!stateById(SONGHAI.capitalStateId)?.cityIds.includes(SONGHAI.capitalCityId)) problems.push('the national capital is not in its state');
  for (const [real, id] of Object.entries(LEGACY_STATE)) if (!stateById(id)) problems.push(`former state ${real} points to unknown ${id}`);
  return problems;
}
