/**
 * Food, diets and places to eat. A player's diet is part of who they are:
 * menus show the dishes that suit it, and dishes that don't can't be bought.
 * Several traditional dishes often include meat, fish or crayfish; where a
 * dish here is marked vegan it is the plant-based version, as its note says.
 */

export type Diet = 'everything' | 'pescatarian' | 'vegetarian' | 'vegan';

export const DIETS: readonly { id: Diet; label: string; hint: string }[] = [
  { id: 'everything', label: 'Eats everything', hint: 'Meat, fish, dairy, eggs and plants.' },
  { id: 'pescatarian', label: 'Pescatarian', hint: 'No meat; fish, dairy and eggs are fine.' },
  { id: 'vegetarian', label: 'Vegetarian', hint: 'No meat or fish.' },
  { id: 'vegan', label: 'Vegan', hint: 'No animal products at all.' },
];

export type AnimalProduct = 'meat' | 'fish' | 'dairy' | 'egg';

export interface Dish {
  id: string;
  name: string;
  origin: string;
  description: string;
  /** Price in ⓒ. */
  price: number;
  /** How much the fullness meter rises (0–100 scale). */
  fullness: number;
  contains: readonly AnimalProduct[];
  note?: string;
}

const d = (
  id: string, name: string, origin: string, price: number, fullness: number,
  contains: AnimalProduct[], description: string, note?: string,
): Dish => ({ id, name, origin, price, fullness, contains, description, note });

export const DISHES: readonly Dish[] = [
  // Mama Put: Nigerian buka food
  d('jollof-dodo', 'Jollof rice and dodo', 'Nigeria', 25, 45, [], 'Smoky party jollof cooked in a tomato and pepper base with vegetable stock, with fried ripe plantain.'),
  d('jollof-chicken', 'Jollof rice and chicken', 'Nigeria', 35, 55, ['meat'], 'Smoky party jollof with peppered fried chicken.'),
  d('ewa-agoyin', 'Ewa agoyin and agege bread', 'Nigeria', 20, 50, [], 'Soft mashed beans under a dark, smoky pepper sauce, with soft agege bread.', 'Plant-based version, no crayfish.'),
  d('efo-riro-vegan', 'Efo riro and pounded yam', 'Nigeria', 30, 55, [], 'Rich spinach and pepper stew with mushrooms and tofu, served with pounded yam.', 'Plant-based version of a stew usually cooked with meat and fish.'),
  d('efo-riro-assorted', 'Efo riro with assorted meat', 'Nigeria', 40, 60, ['meat', 'fish'], 'Spinach stew with assorted meat and stockfish, served with pounded yam.'),
  d('amala-gbegiri', 'Amala, gbegiri and ewedu', 'Nigeria', 25, 55, [], 'Yam flour swallow with bean soup and jute-leaf soup.', 'Plant-based version, no crayfish or meat.'),
  d('moi-moi', 'Moi moi', 'Nigeria', 15, 30, [], 'Steamed bean pudding with peppers and onions.', 'Made without egg or fish.'),
  d('fried-rice-prawns', 'Fried rice with prawns', 'Nigeria', 35, 50, ['fish'], 'Nigerian fried rice with vegetables and prawns.'),
  // Roadside market snacks
  d('boli-epa', 'Boli and epa', 'Nigeria', 10, 25, [], 'Roasted plantain with roasted groundnuts.'),
  d('akara-pap', 'Akara and pap', 'Nigeria', 12, 30, [], 'Crisp bean fritters with warm fermented corn porridge.'),
  d('puff-puff', 'Puff-puff', 'West Africa', 6, 15, [], 'Fried sweet dough balls.', 'Made with flour, sugar, yeast and water.'),
  d('fruit', 'Pineapple, mango and watermelon', 'Lagos market', 8, 15, [], 'Fresh cut fruit in a bag.'),
  d('suya', 'Suya', 'Nigeria', 20, 30, ['meat'], 'Spiced grilled beef skewers with onions and yaji.'),
  d('chin-chin', 'Chin chin', 'Nigeria', 6, 12, ['egg', 'dairy'], 'Crunchy fried dough snack.'),
  d('roast-fish', 'Roasted catfish', 'Nigeria', 30, 45, ['fish'], 'Whole peppered catfish roasted over charcoal.'),
  // Taste of Africa: pan-African kitchen
  d('misir-shiro', 'Misir wot and shiro with injera', 'Ethiopia', 35, 55, [], 'Spiced red lentil stew and chickpea stew on sour injera flatbread.', 'Ethiopian fasting food, plant-based by tradition.'),
  d('red-red', 'Red red with kelewele', 'Ghana', 25, 50, [], 'Black-eyed bean stew in red palm oil, with spiced fried plantain.'),
  d('sukuma-ugali', 'Sukuma wiki and ugali', 'Kenya', 20, 45, [], 'Braised collard greens with tomato and onion, with maize ugali.'),
  d('githeri', 'Githeri', 'Kenya', 18, 45, [], 'Maize and beans simmered with onion and tomato.'),
  d('mafe-vegan', 'Mafé with sweet potato', 'Senegal', 30, 55, [], 'Peanut and tomato stew with sweet potato and greens, over rice.', 'Plant-based version of a stew often made with meat.'),
  d('thieboudienne', 'Thiéboudienne', 'Senegal', 40, 60, ['fish'], 'Broken rice cooked in tomato with fish and vegetables.'),
  d('koshari', 'Koshari', 'Egypt', 22, 55, [], 'Rice, lentils and pasta with spiced tomato sauce and crispy onions.'),
  d('vegetable-tagine', 'Vegetable tagine and couscous', 'Morocco', 30, 50, [], 'Slow-cooked vegetables with chickpeas, apricots and spices.'),
  d('chakalaka-pap', 'Chakalaka and pap', 'South Africa', 20, 45, [], 'Spicy vegetable and bean relish with maize pap.'),
  d('bean-bunny-chow', 'Bean bunny chow', 'South Africa', 25, 55, [], 'Hollowed bread loaf filled with bean curry.'),
  d('bobotie', 'Bobotie', 'South Africa', 40, 55, ['meat', 'egg', 'dairy'], 'Spiced minced meat baked under an egg custard.'),
  d('shakshuka', 'Shakshuka', 'North Africa', 25, 40, ['egg'], 'Eggs poached in spiced tomato and pepper sauce.'),
  d('doro-wat', 'Doro wat', 'Ethiopia', 40, 60, ['meat', 'egg'], 'Chicken stewed in berbere spice with boiled eggs, on injera.'),
];

export const dishById = (id: string) => DISHES.find((x) => x.id === id);

const FORBIDDEN: Record<Diet, readonly AnimalProduct[]> = {
  everything: [],
  pescatarian: ['meat'],
  vegetarian: ['meat', 'fish'],
  vegan: ['meat', 'fish', 'dairy', 'egg'],
};

export function suitsDiet(dish: Dish, diet: Diet): boolean {
  return !dish.contains.some((p) => FORBIDDEN[diet].includes(p));
}

/** The strictest diet label a dish qualifies for, for menu badges. */
export function dietBadge(dish: Dish): 'Vegan' | 'Vegetarian' | 'Pescatarian' | null {
  if (suitsDiet(dish, 'vegan')) return 'Vegan';
  if (suitsDiet(dish, 'vegetarian')) return 'Vegetarian';
  if (suitsDiet(dish, 'pescatarian')) return 'Pescatarian';
  return null;
}

/** Short reason a dish can't be eaten on a diet, e.g. "Not vegan: contains egg". */
export function whyNot(dish: Dish, diet: Diet): string | null {
  const bad = dish.contains.filter((p) => FORBIDDEN[diet].includes(p));
  if (bad.length === 0) return null;
  const label = DIETS.find((x) => x.id === diet)!.label.toLowerCase();
  return `Not ${label}: contains ${bad.join(' and ')}`;
}

export interface FoodVendor {
  id: string;
  name: string;
  kind: string;
  /** Where the player stands to order (on the pavement in front). */
  position: readonly [number, number, number];
  menu: readonly string[];
}

export const FOOD_VENDORS: readonly FoodVendor[] = [
  {
    id: 'mama-put',
    name: 'Mama Put',
    kind: 'Nigerian buka',
    position: [-5.2, 0, -4.5],
    menu: ['jollof-dodo', 'jollof-chicken', 'ewa-agoyin', 'efo-riro-vegan', 'efo-riro-assorted', 'amala-gbegiri', 'moi-moi', 'fried-rice-prawns'],
  },
  {
    id: 'roadside-market',
    name: 'Roadside market',
    kind: 'Street food and snacks',
    position: [-5.0, 0, -9],
    menu: ['boli-epa', 'akara-pap', 'puff-puff', 'fruit', 'suya', 'chin-chin', 'roast-fish'],
  },
  {
    id: 'taste-of-africa',
    name: 'Taste of Africa',
    kind: 'Pan-African kitchen',
    position: [5.5, 0, 3],
    menu: ['misir-shiro', 'red-red', 'sukuma-ugali', 'githeri', 'mafe-vegan', 'thieboudienne', 'koshari', 'vegetable-tagine', 'chakalaka-pap', 'bean-bunny-chow', 'bobotie', 'shakshuka', 'doro-wat'],
  },
];

export const VENDOR_RADIUS = 3;

export function nearestVendor(x: number, z: number): FoodVendor | null {
  let best: FoodVendor | null = null;
  let bestD = VENDOR_RADIUS;
  for (const v of FOOD_VENDORS) {
    const dist = Math.hypot(v.position[0] - x, v.position[2] - z);
    if (dist <= bestD) {
      best = v;
      bestD = dist;
    }
  }
  return best;
}
