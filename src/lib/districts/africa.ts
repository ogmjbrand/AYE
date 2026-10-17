/**
 * Africa: a district in the capital of every African Union and UN member
 * state on the continent, beyond the hand-built Accra and the Nigerian cities
 * (nigeria.ts). Countries share the food, music and clothes of their region;
 * island states have their own landmass, so they're reached by air only.
 * Where a country has more than one capital, the official one is used.
 */
import type { CitySeed, RegionStyle, VendorStyle } from './generate';

const HOMES: RegionStyle['homes'] = {
  marina: [
    { kind: 'Room in a shared flat', description: 'A single room with a fan. Shared kitchen and bathroom with three flatmates.' },
    { kind: 'Studio flat', description: 'Your own room with a kitchenette and shower, a short walk from the main road.' },
    { kind: 'Two-bedroom apartment', description: 'Two bedrooms and a balcony. Room for a flatmate or a home office.' },
    { kind: 'Penthouse', description: 'Top floor of the tower with a view over the city and a concierge.' },
  ],
  osu: [
    { kind: 'Studio flat', description: 'One room with its own kitchenette and bathroom.' },
    { kind: 'One-bedroom apartment', description: 'Bright one-bedroom flat with a view of the main road.' },
    { kind: 'Penthouse', description: 'Top-floor apartment with a terrace and 24-hour security.' },
  ],
};

const PAN_AFRICAN: VendorStyle = {
  names: ['Taste of Africa'],
  kind: 'Pan-African kitchen',
  menu: ['misir-shiro', 'red-red', 'sukuma-ugali', 'githeri', 'mafe-vegan', 'thieboudienne', 'koshari', 'vegetable-tagine', 'chakalaka-pap', 'bean-bunny-chow', 'bobotie', 'shakshuka', 'doro-wat'],
};

const WARM = ['#e3d2b4', '#d8c4a2', '#e8dcc6', '#c9b08c', '#efe3c8', '#d9cbb0'];
const OCHRE = ['#c99a6b', '#b98a5f', '#d4b08a', '#a87a52', '#dcc2a0', '#c4a07c'];
const SAND = ['#e8e0d0', '#d9cdb8', '#cfc2a8', '#e2d6c2', '#c8b89a', '#ddd2bf'];
const PASTEL = ['#e7d2b0', '#d9b9a0', '#c9d3c2', '#e3c7a8', '#d5c8b8', '#cdd6dc'];
const BUSES = ['#e6e4dc', '#d7dde3', '#c9d3d8'];
const TREES = { names: ['Gardens', 'Park', 'Green', 'Garden Square'] };

const base = (walls: readonly string[], park: string): Pick<RegionStyle, 'second' | 'walls' | 'buses' | 'busStripes' | 'homes' | 'park'> => ({
  second: PAN_AFRICAN, walls, buses: BUSES, busStripes: false, homes: HOMES, park: { ...TREES, description: park },
});
const SHADE = 'Shade trees and benches. A good spot to sit out the heat of the afternoon.';
const NEEM = 'Neem trees and benches. Busy in the cool of the evening, after the heat of the day.';
const PALMS = 'Palms and flowering trees over the benches, with a breeze in the evening.';

export const SAHEL: RegionStyle = {
  ...base(OCHRE, NEEM),
  kitchen: { names: ['Le Baobab', 'Chez Fatou', 'Dibiterie du Centre'], kind: 'Senegalese and Sahel kitchen', menu: ['thieboudienne', 'yassa-chicken', 'mafe-vegan', 'ndambe', 'to-gombo', 'fonio-vegetables', 'dibi'] },
  snacks: { names: ['Tangana corner', 'Accara stand'], kind: 'Breakfast and street snacks', menu: ['accara', 'fataya', 'puff-puff', 'fruit', 'bissap', 'ndambe'] },
  lounge: { names: ['{city} Live', 'Sahel Lounge'], description: 'Mbalax, Mande guitar and Afrobeats from a house band, open late.' },
  fashion: { name: 'Boubou House', kind: 'Grand boubous, wax prints & salon' },
  names: {
    male: ['Moussa', 'Mamadou', 'Ousmane', 'Ibrahima', 'Abdoulaye', 'Cheikh', 'Seydou'],
    female: ['Aminata', 'Fatou', 'Awa', 'Mariama', 'Aïssatou', 'Kadiatou', 'Ndeye'],
    family: ['Diallo', 'Ndiaye', 'Traoré', 'Diop', 'Coulibaly', 'Camara', 'Sow'],
  },
};

/** Mauritania and Chad: Sahel food and names, no alcohol. */
const SAHEL_DRY: RegionStyle = { ...SAHEL, lounge: { names: ['Sahel Lounge', '{city} Live'], description: 'Local bands and Afrobeats on a small stage, with mint tea and juice. No alcohol served.' } };

export const GULF_OF_GUINEA: RegionStyle = {
  ...base(WARM, SHADE),
  kitchen: { names: ['Maquis du Coin', 'Maquis Le Palmier'], kind: 'Maquis', menu: ['attieke-fish', 'garba', 'kedjenou', 'foutou-graine', 'pate-gombo', 'alloco', 'mafe-vegan'] },
  snacks: { names: ['Alloco corner', 'Street snacks'], kind: 'Street food', menu: ['alloco', 'accara', 'puff-puff', 'fruit', 'bissap', 'brochettes'] },
  lounge: { names: ['{city} Live', 'Maquis Lounge'], description: 'Coupé-décalé, zouglou and Afrobeats from a house band, alloco from the kitchen, open late.' },
  fashion: { name: 'Pagne House', kind: 'Wax prints, pagnes & salon' },
  names: {
    male: ['Kouassi', 'Koffi', 'Yao', 'Kodjo', 'Sénam', 'Firmin', 'Rodrigue'],
    female: ['Akissi', 'Adjoua', 'Afi', 'Ama', 'Nadège', 'Edwige', 'Mawuena'],
    family: ['Kouamé', 'Agbodjan', 'Mensah', 'Houngbédji', 'Koné', 'Adjovi', 'Amouzou'],
  },
};

export const UPPER_GUINEA: RegionStyle = {
  ...base(WARM, PALMS),
  kitchen: { names: ['Mama’s Cookery', 'Cookery Corner'], kind: 'Cookery', menu: ['cassava-leaf', 'cassava-leaf-vegan', 'potato-leaf', 'groundnut-soup', 'jollof-dodo', 'catfish-pepper-soup'] },
  snacks: { names: ['Street snacks', 'Market corner'], kind: 'Street food', menu: ['accara', 'puff-puff', 'plantain-chips', 'fruit', 'roast-fish', 'bissap'] },
  lounge: { names: ['{city} Live', 'Palm Wine Lounge'], description: 'Afropop, palm-wine guitar and Afrobeats on a small stage, open late.' },
  fashion: { name: 'Gara House', kind: 'Gara tie-dye, lappas & salon' },
  names: {
    male: ['Mohamed', 'Abu', 'Joseph', 'Samuel', 'Alhaji', 'Musa', 'Emmanuel'],
    female: ['Fatmata', 'Isatu', 'Mariama', 'Comfort', 'Hawa', 'Kadiatu', 'Esther'],
    family: ['Kamara', 'Sesay', 'Conteh', 'Koroma', 'Johnson', 'Bangura', 'Jallow'],
  },
};

export const CENTRAL: RegionStyle = {
  ...base(WARM, SHADE),
  kitchen: { names: ['Chez Maman', 'Le Bon Coin'], kind: 'Central African kitchen', menu: ['ndole', 'ndole-vegan', 'poulet-dg', 'koki', 'pondu', 'liboke-fish', 'beignets-haricots'] },
  snacks: { names: ['Beignets corner', 'Grill corner'], kind: 'Grill and snacks', menu: ['beignets-haricots', 'plantain-braise', 'brochettes', 'puff-puff', 'fruit', 'koki'] },
  lounge: { names: ['{city} Live', 'Rumba Lounge'], description: 'Rumba, makossa and ndombolo from a house band, brochettes from the grill, open late.' },
  fashion: { name: 'Pagne House', kind: 'Wax prints, sapeur suits & salon' },
  names: {
    male: ['Jean', 'Patrice', 'Serge', 'Christian', 'Didier', 'Arsène', 'Junior'],
    female: ['Grâce', 'Mireille', 'Chantal', 'Nadège', 'Josiane', 'Clarisse', 'Sandrine'],
    family: ['Mbarga', 'Ngoma', 'Mavinga', 'Essomba', 'Lukusa', 'Tshibanda', 'Mouele'],
  },
};

export const EAST: RegionStyle = {
  ...base(WARM, SHADE),
  kitchen: { names: ['Hoteli ya Mama', '{city} Hoteli'], kind: 'Hoteli', menu: ['sukuma-ugali', 'githeri', 'pilau', 'nyama-choma', 'chapati-beans', 'matoke', 'isombe'] },
  snacks: { names: ['Kibanda', 'Mandazi stand'], kind: 'Street snacks', menu: ['mandazi', 'samosa-veg', 'mishkaki', 'rolex', 'fruit', 'mahindi-choma'] },
  lounge: { names: ['{city} Live', 'Bongo Lounge'], description: 'Bongo flava, benga and Afrobeats from a house band, nyama choma from the grill, open late.' },
  fashion: { name: 'Kitenge House', kind: 'Kitenge, kikoy & salon' },
  names: {
    male: ['Juma', 'Baraka', 'Otieno', 'Kamau', 'Mugisha', 'Hakizimana', 'Kiprono'],
    female: ['Wanjiru', 'Achieng', 'Neema', 'Zawadi', 'Uwase', 'Nakato', 'Amani'],
    family: ['Mwangi', 'Odhiambo', 'Kiprop', 'Mushi', 'Okello', 'Niyonzima', 'Ssempijja'],
  },
};

const SOUTH_SUDAN: RegionStyle = {
  ...EAST,
  names: {
    male: ['Deng', 'Garang', 'Majok', 'Lado', 'Peter', 'Kuol', 'James'],
    female: ['Nyibol', 'Achol', 'Abuk', 'Nyandeng', 'Mary', 'Ayen', 'Grace'],
    family: ['Deng', 'Akol', 'Lado', 'Wani', 'Majok', 'Malual', 'Ladu'],
  },
};

export const HORN: RegionStyle = {
  ...base(SAND, SHADE),
  kitchen: { names: ['Habesha Restaurant', 'Injera House'], kind: 'Ethiopian and Eritrean kitchen', menu: ['misir-shiro', 'beyaynetu', 'ful', 'doro-wat', 'tibs', 'kitfo'] },
  snacks: { names: ['Buna corner', 'Sambusa stand'], kind: 'Coffee and snacks', menu: ['buna', 'sambusa', 'kolo', 'fruit', 'ful'] },
  lounge: { names: ['Azmari Bet', '{city} Live'], description: 'Ethio-jazz and azmari singers on a small stage, open late.' },
  fashion: { name: 'Habesha House', kind: 'Habesha kemis, netela & salon' },
  names: {
    male: ['Abebe', 'Dawit', 'Yonas', 'Tesfaye', 'Henok', 'Bereket', 'Samuel'],
    female: ['Hanna', 'Selam', 'Meron', 'Tigist', 'Liya', 'Bethlehem', 'Saba'],
    family: ['Tesfaye', 'Bekele', 'Haile', 'Gebre', 'Alemu', 'Tadesse', 'Kidane'],
  },
};

export const SOMALI: RegionStyle = {
  ...base(SAND, NEEM),
  kitchen: { names: ['Maqaayad', 'Somali Kitchen'], kind: 'Somali kitchen', menu: ['bariis-iskukaris', 'suqaar', 'canjeero', 'ambulo', 'sambusa', 'ful'] },
  snacks: { names: ['Sambusa stand', 'Tea corner'], kind: 'Tea and snacks', menu: ['sambusa', 'canjeero', 'fruit', 'ambulo'] },
  lounge: { names: ['{city} Live', 'Oud Lounge'], description: 'Somali songs and oud on a small stage, with tea and sweets. No alcohol served.' },
  fashion: { name: 'Dirac House', kind: 'Dirac, macawis & salon' },
  names: {
    male: ['Abdi', 'Mohamed', 'Hassan', 'Ahmed', 'Omar', 'Yusuf', 'Ali'],
    female: ['Hodan', 'Faduma', 'Amina', 'Sahra', 'Hawa', 'Ifrah', 'Nasra'],
    family: ['Warsame', 'Abdi', 'Hassan', 'Farah', 'Jama', 'Osman', 'Aden'],
  },
};

export const NILE: RegionStyle = {
  ...base(SAND, NEEM),
  kitchen: { names: ['Nile Kitchen', 'Ful House'], kind: 'Sudanese kitchen', menu: ['ful', 'kisra-mullah', 'taamiya', 'shaiyah', 'koshari'] },
  snacks: { names: ["Ta'ameya stand", 'Juice corner'], kind: 'Snacks and juice', menu: ['taamiya', 'aradaib', 'fruit', 'sambusa'] },
  lounge: { names: ['{city} Live', 'Nile Lounge'], description: 'Sudanese songs and oud on a small stage, with tea and juice. No alcohol served.' },
  fashion: { name: 'Toob House', kind: 'Tobes, jalabiyas & salon' },
  names: {
    male: ['Ahmed', 'Mohamed', 'Osman', 'Khalid', 'Tarig', 'Hamid', 'Mustafa'],
    female: ['Amna', 'Fatima', 'Sara', 'Hiba', 'Nafisa', 'Reem', 'Tasneem'],
    family: ['Osman', 'Ibrahim', 'Abdalla', 'Hassan', 'Elamin', 'Babiker', 'Ali'],
  },
};

export const MAGHREB: RegionStyle = {
  ...base(SAND, 'Palms and orange trees over the benches, busy in the evening.'),
  kitchen: { names: ['Medina Kitchen', 'Al Nour Kitchen'], kind: 'North African kitchen', menu: ['koshari', 'vegetable-tagine', 'harira-vegan', 'lablabi', 'couscous-lamb', 'shakshuka', 'brik'] },
  snacks: { names: ['Falafel stand', 'Bakery corner'], kind: 'Bakery and street food', menu: ['taamiya', 'ful', 'msemen', 'makroud', 'fruit'] },
  lounge: { names: ['{city} Live', 'Casbah Lounge'], description: 'Chaabi, raï and Arabic pop on a small stage, with mint tea at the bar.' },
  fashion: { name: 'Kaftan House', kind: 'Kaftans, djellabas & salon' },
  names: {
    male: ['Youssef', 'Karim', 'Omar', 'Amine', 'Mehdi', 'Hamza', 'Ahmed'],
    female: ['Yasmine', 'Salma', 'Nour', 'Imane', 'Sara', 'Leila', 'Meriem'],
    family: ['Benali', 'El Amrani', 'Haddad', 'Mansour', 'Saidi', 'Trabelsi', 'Hassan'],
  },
};

/** Libya: Maghreb food and names, no alcohol. */
const MAGHREB_DRY: RegionStyle = { ...MAGHREB, lounge: { names: ['{city} Live'], description: 'Arabic pop and malouf on a small stage, with mint tea and juice. No alcohol served.' } };

export const SOUTHERN: RegionStyle = {
  ...base(WARM, 'Jacarandas and benches. Quiet in the day, busy at the weekend.'),
  kitchen: { names: ['Shisa Nyama', 'Kasi Kitchen'], kind: 'Shisa nyama and kitchen', menu: ['shisa-nyama', 'chakalaka-pap', 'umngqusho', 'nshima-greens', 'bean-bunny-chow', 'bobotie'] },
  snacks: { names: ['Spaza corner', 'Vetkoek stand'], kind: 'Street food', menu: ['vetkoek', 'mielies', 'biltong', 'fruit', 'samosa-veg'] },
  lounge: { names: ['{city} Live', 'Groove Lounge'], description: 'Amapiano, kwaito and Afrobeats from the DJ booth, open late.' },
  fashion: { name: 'Shweshwe House', kind: 'Shweshwe, prints & salon' },
  names: {
    male: ['Thabo', 'Sipho', 'Tendai', 'Mpho', 'Kagiso', 'Chanda', 'Tawanda'],
    female: ['Nomsa', 'Thandiwe', 'Lerato', 'Chipo', 'Naledi', 'Mutinta', 'Palesa'],
    family: ['Dlamini', 'Nkosi', 'Moyo', 'Banda', 'Mokoena', 'Phiri', 'Ndlovu'],
  },
};

export const LUSOPHONE: RegionStyle = {
  ...base(PASTEL, PALMS),
  kitchen: { names: ['Tasca do Bairro', 'Casa da Avó'], kind: 'Lusophone kitchen', menu: ['muamba', 'funge-feijao', 'matapa', 'peri-peri-chicken', 'cachupa', 'caril-camarao'] },
  snacks: { names: ['Quiosque', 'Banca do mercado'], kind: 'Street snacks', menu: ['mandioca-frita', 'badjias', 'fruit', 'samosa-veg', 'brochettes'] },
  lounge: { names: ['{city} Live', 'Kizomba Lounge'], description: 'Kizomba, semba and marrabenta from a house band, open late.' },
  fashion: { name: 'Capulana House', kind: 'Capulanas, panos & salon' },
  names: {
    male: ['João', 'António', 'Manuel', 'Domingos', 'Carlos', 'Edson', 'Nelson'],
    female: ['Maria', 'Ana', 'Esperança', 'Luísa', 'Graça', 'Celeste', 'Joana'],
    family: ['dos Santos', 'Fernandes', 'da Silva', 'Nhantumbo', 'Gomes', 'Lopes', 'Tavares'],
  },
};

export const MADAGASCAR: RegionStyle = {
  ...base(PASTEL, 'Jacarandas and benches over the lake. A quiet spot to sit.'),
  kitchen: { names: ['Hotely Gasy', 'Hotely Tsara'], kind: 'Hotely', menu: ['romazava', 'ravitoto', 'vary-amin-anana', 'lasary', 'zebu-brochettes'] },
  snacks: { names: ['Mofo gasy stand', 'Market corner'], kind: 'Street snacks', menu: ['mofo-gasy', 'koba', 'samosa-veg', 'fruit', 'zebu-brochettes'] },
  lounge: { names: ['{city} Live', 'Salegy Lounge'], description: 'Salegy and Malagasy pop from a house band, open late.' },
  fashion: { name: 'Lamba House', kind: 'Lambas, prints & salon' },
  names: {
    male: ['Rivo', 'Hery', 'Tiana', 'Andry', 'Mamy', 'Haja', 'Faly'],
    female: ['Fara', 'Voahangy', 'Lalao', 'Hanta', 'Miora', 'Nirina', 'Tahina'],
    family: ['Rakoto', 'Rasoa', 'Rabe', 'Rajaonarison', 'Andrianina', 'Randria', 'Razafy'],
  },
};

export const INDIAN_OCEAN: RegionStyle = {
  ...base(PASTEL, PALMS),
  kitchen: { names: ['Creole Kitchen', 'La Case Créole'], kind: 'Creole kitchen', menu: ['dholl-puri', 'rougaille-vegan', 'octopus-curry', 'gateaux-piments', 'caril-camarao'] },
  snacks: { names: ['Gâteaux piments stand', 'Beach kiosk'], kind: 'Street snacks', menu: ['gateaux-piments', 'samosa-veg', 'fruit', 'alouda'] },
  lounge: { names: ['{city} Live', 'Séga Lounge'], description: 'Séga and island pop from a house band, open late.' },
  fashion: { name: 'Island Boutique', kind: 'Prints, linen & salon' },
  names: {
    male: ['Ravi', 'Jean-Marc', 'Kevin', 'Arvind', 'Steeve', 'Nadeem', 'Didier'],
    female: ['Priya', 'Anjali', 'Marie', 'Shabnam', 'Natacha', 'Vanessa', 'Leena'],
    family: ['Ramdin', 'Lagesse', 'Baptiste', 'Jhurry', 'Payet', 'Hoareau', 'Ramsamy'],
  },
};

const COMOROS: RegionStyle = {
  ...INDIAN_OCEAN,
  lounge: { names: ['{city} Live'], description: 'Twarab music on a small stage, with tea and juice. No alcohol served.' },
  names: {
    male: ['Said', 'Ahmed', 'Abdou', 'Ali', 'Mohamed', 'Soilihi', 'Ibrahim'],
    female: ['Fatima', 'Mariama', 'Faïza', 'Anfiat', 'Echata', 'Zainaba', 'Nourou'],
    family: ['Said', 'Abdallah', 'Mohamed', 'Soilihi', 'Mze', 'Ahamada', 'Youssouf'],
  },
};

const city = (
  country: string, id: string, name: string, region: string, lat: number, lon: number, timeZone: string, currency: string,
  style: RegionStyle, cost: number, opts: { area?: string; landmass?: string } = {},
): CitySeed => ({ id, name, region, country, timeZone, currency, lat, lon, style, cost, ...opts });

// Default district names in the local language
const FR = { area: 'Centre-ville' };
const PT = { area: 'Baixa' };
const island = (landmass: string, area?: string) => ({ landmass, ...(area ? { area } : {}) });

/** Capitals of the 52 African countries besides Nigeria and Ghana, west to east by region. */
export const AFRICA: readonly CitySeed[] = [
  // Sahel and Senegambia
  city('SN', 'dakar', 'Dakar', 'Dakar', 14.72, -17.47, 'Africa/Dakar', 'XOF', SAHEL, 0.8, { area: 'Plateau' }),
  city('GM', 'banjul', 'Banjul', 'Banjul', 13.45, -16.58, 'Africa/Banjul', 'GMD', UPPER_GUINEA, 0.5),
  city('GW', 'bissau', 'Bissau', 'Bissau', 11.86, -15.6, 'Africa/Bissau', 'XOF', LUSOPHONE, 0.45, PT),
  city('MR', 'nouakchott', 'Nouakchott', 'Nouakchott', 18.08, -15.98, 'Africa/Nouakchott', 'MRU', SAHEL_DRY, 0.55),
  city('ML', 'bamako', 'Bamako', 'Bamako', 12.64, -8.0, 'Africa/Bamako', 'XOF', SAHEL, 0.55, FR),
  city('BF', 'ouagadougou', 'Ouagadougou', 'Centre', 12.37, -1.52, 'Africa/Ouagadougou', 'XOF', SAHEL, 0.5, FR),
  city('NE', 'niamey', 'Niamey', 'Niamey', 13.51, 2.11, 'Africa/Niamey', 'XOF', SAHEL, 0.5, FR),
  city('TD', 'ndjamena', "N'Djamena", "N'Djamena", 12.13, 15.06, 'Africa/Ndjamena', 'XAF', SAHEL_DRY, 0.6, FR),
  city('GN', 'conakry', 'Conakry', 'Conakry', 9.64, -13.58, 'Africa/Conakry', 'GNF', SAHEL, 0.5, FR),
  // Upper Guinea coast
  city('SL', 'freetown', 'Freetown', 'Western Area', 8.48, -13.23, 'Africa/Freetown', 'SLE', UPPER_GUINEA, 0.5),
  city('LR', 'monrovia', 'Monrovia', 'Montserrado', 6.3, -10.8, 'Africa/Monrovia', 'LRD', UPPER_GUINEA, 0.5),
  // Gulf of Guinea
  city('CI', 'yamoussoukro', 'Yamoussoukro', 'Yamoussoukro', 6.82, -5.28, 'Africa/Abidjan', 'XOF', GULF_OF_GUINEA, 0.6, FR),
  city('TG', 'lome', 'Lomé', 'Maritime', 6.13, 1.22, 'Africa/Lome', 'XOF', GULF_OF_GUINEA, 0.55, FR),
  city('BJ', 'porto-novo', 'Porto-Novo', 'Ouémé', 6.5, 2.6, 'Africa/Porto-Novo', 'XOF', GULF_OF_GUINEA, 0.55, FR),
  // Central Africa
  city('CM', 'yaounde', 'Yaoundé', 'Centre', 3.87, 11.52, 'Africa/Douala', 'XAF', CENTRAL, 0.65, FR),
  city('GQ', 'malabo', 'Malabo', 'Bioko Norte', 3.75, 8.78, 'Africa/Malabo', 'XAF', CENTRAL, 0.8, island('bioko')),
  city('GA', 'libreville', 'Libreville', 'Estuaire', 0.42, 9.47, 'Africa/Libreville', 'XAF', CENTRAL, 0.85, FR),
  city('ST', 'sao-tome', 'São Tomé', 'Água Grande', 0.34, 6.73, 'Africa/Sao_Tome', 'STN', LUSOPHONE, 0.55, island('sao-tome', 'Baixa')),
  city('CG', 'brazzaville', 'Brazzaville', 'Brazzaville', -4.27, 15.28, 'Africa/Brazzaville', 'XAF', CENTRAL, 0.7, FR),
  city('CD', 'kinshasa', 'Kinshasa', 'Kinshasa', -4.32, 15.31, 'Africa/Kinshasa', 'CDF', CENTRAL, 0.75, { area: 'Gombe' }),
  city('CF', 'bangui', 'Bangui', 'Bangui', 4.39, 18.56, 'Africa/Bangui', 'XAF', CENTRAL, 0.5, FR),
  // East Africa
  city('SS', 'juba', 'Juba', 'Central Equatoria', 4.85, 31.58, 'Africa/Juba', 'SSP', SOUTH_SUDAN, 0.6),
  city('UG', 'kampala', 'Kampala', 'Central', 0.35, 32.58, 'Africa/Kampala', 'UGX', EAST, 0.65, { area: 'Kampala Road' }),
  city('KE', 'nairobi', 'Nairobi', 'Nairobi', -1.29, 36.82, 'Africa/Nairobi', 'KES', EAST, 0.85, { area: 'Kenyatta Avenue' }),
  city('RW', 'kigali', 'Kigali', 'Kigali', -1.95, 30.06, 'Africa/Kigali', 'RWF', EAST, 0.7),
  city('BI', 'gitega', 'Gitega', 'Gitega', -3.43, 29.92, 'Africa/Bujumbura', 'BIF', EAST, 0.45, FR),
  city('TZ', 'dodoma', 'Dodoma', 'Dodoma', -6.16, 35.75, 'Africa/Dar_es_Salaam', 'TZS', EAST, 0.55),
  // Horn of Africa and the Nile
  city('ET', 'addis-ababa', 'Addis Ababa', 'Addis Ababa', 9.03, 38.74, 'Africa/Addis_Ababa', 'ETB', HORN, 0.7, { area: 'Piazza' }),
  city('ER', 'asmara', 'Asmara', 'Maekel', 15.32, 38.93, 'Africa/Asmara', 'ERN', HORN, 0.5),
  city('DJ', 'djibouti', 'Djibouti', 'Djibouti', 11.59, 43.15, 'Africa/Djibouti', 'DJF', SOMALI, 0.8, FR),
  city('SO', 'mogadishu', 'Mogadishu', 'Banaadir', 2.05, 45.32, 'Africa/Mogadishu', 'SOS', SOMALI, 0.55),
  city('SD', 'khartoum', 'Khartoum', 'Khartoum', 15.5, 32.56, 'Africa/Khartoum', 'SDG', NILE, 0.55),
  // North Africa
  city('EG', 'cairo', 'Cairo', 'Cairo', 30.04, 31.24, 'Africa/Cairo', 'EGP', MAGHREB, 0.65, { area: 'Downtown' }),
  city('LY', 'tripoli', 'Tripoli', 'Tripoli', 32.89, 13.19, 'Africa/Tripoli', 'LYD', MAGHREB_DRY, 0.6),
  city('TN', 'tunis', 'Tunis', 'Tunis', 36.81, 10.18, 'Africa/Tunis', 'TND', MAGHREB, 0.65, { area: 'Avenue Habib Bourguiba' }),
  city('DZ', 'algiers', 'Algiers', 'Algiers', 36.75, 3.06, 'Africa/Algiers', 'DZD', MAGHREB, 0.65, FR),
  city('MA', 'rabat', 'Rabat', 'Rabat-Salé-Kénitra', 34.02, -6.84, 'Africa/Casablanca', 'MAD', MAGHREB, 0.75, FR),
  // Southern Africa
  city('AO', 'luanda', 'Luanda', 'Luanda', -8.84, 13.23, 'Africa/Luanda', 'AOA', LUSOPHONE, 0.9, PT),
  city('ZM', 'lusaka', 'Lusaka', 'Lusaka', -15.42, 28.28, 'Africa/Lusaka', 'ZMW', SOUTHERN, 0.6, { area: 'Cairo Road' }),
  city('MW', 'lilongwe', 'Lilongwe', 'Central', -13.96, 33.79, 'Africa/Blantyre', 'MWK', SOUTHERN, 0.45),
  city('ZW', 'harare', 'Harare', 'Harare', -17.83, 31.05, 'Africa/Harare', 'ZWG', SOUTHERN, 0.6),
  city('MZ', 'maputo', 'Maputo', 'Maputo', -25.97, 32.57, 'Africa/Maputo', 'MZN', LUSOPHONE, 0.65, PT),
  city('NA', 'windhoek', 'Windhoek', 'Khomas', -22.56, 17.08, 'Africa/Windhoek', 'NAD', SOUTHERN, 0.75),
  city('BW', 'gaborone', 'Gaborone', 'South-East', -24.65, 25.91, 'Africa/Gaborone', 'BWP', SOUTHERN, 0.75),
  city('ZA', 'pretoria', 'Pretoria', 'Gauteng', -25.75, 28.19, 'Africa/Johannesburg', 'ZAR', SOUTHERN, 0.85, { area: 'Church Square' }),
  city('SZ', 'mbabane', 'Mbabane', 'Hhohho', -26.31, 31.14, 'Africa/Mbabane', 'SZL', SOUTHERN, 0.6),
  city('LS', 'maseru', 'Maseru', 'Maseru', -29.31, 27.48, 'Africa/Maseru', 'LSL', SOUTHERN, 0.55),
  // Islands
  city('CV', 'praia', 'Praia', 'Santiago', 14.93, -23.51, 'Atlantic/Cape_Verde', 'CVE', LUSOPHONE, 0.7, island('santiago', 'Plateau')),
  city('MG', 'antananarivo', 'Antananarivo', 'Analamanga', -18.88, 47.51, 'Indian/Antananarivo', 'MGA', MADAGASCAR, 0.5, island('madagascar')),
  city('KM', 'moroni', 'Moroni', 'Grande Comore', -11.7, 43.26, 'Indian/Comoro', 'KMF', COMOROS, 0.6, island('grande-comore')),
  city('MU', 'port-louis', 'Port Louis', 'Port Louis', -20.16, 57.5, 'Indian/Mauritius', 'MUR', INDIAN_OCEAN, 0.85, island('mauritius')),
  city('SC', 'victoria', 'Victoria', 'Mahé', -4.62, 55.45, 'Indian/Mahe', 'SCR', INDIAN_OCEAN, 1.0, island('mahe')),
];
