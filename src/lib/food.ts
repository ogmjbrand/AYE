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
  /** Price in GHAI. */
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
  // Accra: Ghanaian chop bar, waakye joint and street food
  d('waakye-special', 'Waakye special', 'Ghana', 30, 60, ['fish', 'egg'], 'Rice and beans cooked with sorghum leaves, with shito, gari, spaghetti, boiled egg and fried fish.'),
  d('waakye-plain', 'Waakye with stew and plantain', 'Ghana', 20, 50, [], 'Rice and beans with tomato stew, gari and fried ripe plantain.', 'Plant-based: served without shito, egg or fish.'),
  d('jollof-ghana', 'Ghana jollof and grilled chicken', 'Ghana', 35, 55, ['meat'], 'Fragrant jollof rice with grilled chicken and shito on the side.'),
  d('fufu-light-soup', 'Fufu and light soup with goat', 'Ghana', 40, 60, ['meat'], 'Pounded cassava and plantain in a peppery tomato soup with goat meat.'),
  d('banku-tilapia', 'Banku and grilled tilapia', 'Ghana', 40, 55, ['fish'], 'Fermented corn and cassava dough with a whole grilled tilapia and fresh pepper.'),
  d('kenkey-fish', 'Kenkey with fried fish', 'Ghana', 25, 50, ['fish'], 'Steamed fermented corn dough with fried fish, pepper sauce and onions.'),
  d('groundnut-soup', 'Groundnut soup with omo tuo', 'Ghana', 30, 55, [], 'Rich peanut soup with mushrooms and garden eggs, served with rice balls.', 'Plant-based version of a soup usually made with meat.'),
  d('kontomire', 'Kontomire stew and boiled yam', 'Ghana', 25, 50, [], 'Cocoyam-leaf stew with palm oil and agushi, with boiled yam.', 'Plant-based: made without egg or fish.'),
  d('kelewele', 'Kelewele and groundnuts', 'Ghana', 10, 20, [], 'Ripe plantain cubes fried with ginger and pepper, with roasted groundnuts.'),
  d('chichinga', 'Chichinga', 'Ghana', 20, 30, ['meat'], 'Spiced beef kebabs grilled over charcoal with suya pepper.'),
  // Northern Nigeria: tuwo houses and street snacks
  d('tuwo-miyan-kuka', 'Tuwo shinkafa and miyan kuka', 'Nigeria', 25, 55, [], 'Soft rice swallow with baobab-leaf soup and dawadawa.', 'Plant-based version of a soup often cooked with dried fish or meat.'),
  d('tuwo-miyan-taushe', 'Tuwo masara and miyan taushe', 'Nigeria', 35, 60, ['meat'], 'Maize swallow with a pumpkin, spinach and groundnut soup cooked with beef.'),
  d('masa', 'Masa with yaji', 'Nigeria', 12, 30, [], 'Fermented rice cakes fried in a cast-iron pan, with spiced pepper powder.'),
  d('dan-wake', 'Dan wake', 'Nigeria', 15, 40, [], 'Bean-flour dumplings with groundnut oil, yaji, tomato and onion.', 'Served without egg.'),
  d('kosai-koko', 'Kosai and koko', 'Nigeria', 12, 30, [], 'Bean fritters with a warm, spiced millet porridge.'),
  d('awara', 'Awara', 'Nigeria', 10, 25, [], 'Fried soya-bean curd (tofu) with yaji and sliced onion.'),
  d('kilishi', 'Kilishi', 'Nigeria', 25, 25, ['meat'], 'Thin sheets of beef dried with a groundnut and pepper spice paste.'),
  d('fura-da-nono', 'Fura da nono', 'Nigeria', 12, 30, ['dairy'], 'Spiced millet balls crumbled into cool fermented milk.'),
  d('dambu-nama', 'Dambu nama', 'Nigeria', 30, 35, ['meat'], 'Shredded, spiced and fried beef, a Borno speciality.'),
  // North Central Nigeria
  d('acha-jollof', 'Acha jollof', 'Nigeria', 25, 45, [], 'Fonio grains cooked jollof-style with tomato, pepper and vegetables, from the Plateau.'),
  d('pounded-yam-egusi', 'Pounded yam and egusi', 'Nigeria', 40, 60, ['meat', 'fish'], 'Melon-seed and spinach soup with beef and stockfish, served with pounded yam.'),
  d('egusi-vegan', 'Pounded yam and egusi (plant-based)', 'Nigeria', 30, 55, [], 'Melon-seed and spinach soup with mushrooms, served with pounded yam.', 'Plant-based version, no meat, fish or crayfish.'),
  d('roast-yam-pepper', 'Roasted yam and pepper sauce', 'Nigeria', 15, 40, [], 'Yam roasted over charcoal with a fresh pepper and palm-oil sauce.'),
  // South East Nigeria
  d('okpa', 'Okpa', 'Nigeria', 15, 45, [], 'Steamed Bambara-nut pudding with palm oil and pepper, an Enugu breakfast.'),
  d('abacha', 'Abacha with fish', 'Nigeria', 30, 45, ['fish'], 'Shredded cassava salad with ugba, garden egg, palm-oil dressing and dried fish.'),
  d('ofe-onugbu', 'Ofe onugbu and fufu', 'Nigeria', 40, 60, ['meat', 'fish'], 'Bitterleaf soup thickened with cocoyam, with assorted meat and stockfish.'),
  d('nkwobi', 'Nkwobi', 'Nigeria', 40, 40, ['meat'], 'Cow foot in a spiced palm-oil and utazi sauce, served in a wooden bowl.'),
  d('ukwa', 'Ukwa', 'Nigeria', 25, 50, [], 'African breadfruit porridge cooked with palm oil and pepper.', 'Plant-based version, no dried fish.'),
  d('corn-ube', 'Roast corn and ube', 'Nigeria', 8, 20, [], 'Charcoal-roasted maize with softened African pear.'),
  // South South Nigeria
  d('banga-starch', 'Banga soup and starch', 'Nigeria', 40, 60, ['fish'], 'Palm-nut soup with fresh fish and beletete spice, served with cassava starch.'),
  d('bole-fish', 'Bole and fish', 'Nigeria', 35, 50, ['fish'], 'Roasted plantain and yam with grilled fish and a hot pepper sauce, Port Harcourt style.'),
  d('catfish-pepper-soup', 'Catfish pepper soup', 'Nigeria', 35, 40, ['fish'], 'Fresh catfish in a hot broth spiced with uziza and calabash nutmeg.'),
  d('edikang-ikong', 'Edikang ikong and fufu', 'Nigeria', 45, 60, ['meat', 'fish'], 'Fluted pumpkin and waterleaf soup with beef and periwinkle, from Calabar and Uyo.'),
  d('afang', 'Afang soup and garri', 'Nigeria', 40, 60, ['meat', 'fish'], 'Afang and waterleaf soup with meat and dried fish.'),
  d('ekpang-nkukwo', 'Ekpang nkukwo', 'Nigeria', 30, 50, [], 'Grated cocoyam wrapped in leaves and simmered in a palm-oil sauce.', 'Plant-based version of a dish often cooked with periwinkle and fish.'),
  d('plantain-chips', 'Plantain chips', 'Nigeria', 6, 15, [], 'Thin, crisp slices of fried unripe plantain.'),
  // South West Nigeria
  d('ofada-ayamase', 'Ofada rice and ayamase', 'Nigeria', 40, 60, ['meat', 'egg'], 'Local ofada rice with green-pepper stew, assorted meat and boiled egg.'),
  d('ikokore', 'Ikokore', 'Nigeria', 30, 50, ['fish'], 'Ijebu water-yam pottage with smoked fish.'),
  // Sahel and Senegambia
  d('yassa-chicken', 'Yassa chicken', 'Senegal', 40, 55, ['meat'], 'Chicken marinated in lemon and onion, grilled and simmered, over rice.'),
  d('ndambe', 'Ndambé', 'Senegal', 15, 45, [], 'Black-eyed beans stewed in tomato and pepper, in a baguette.'),
  d('to-gombo', 'Tô with okra sauce', 'Burkina Faso', 20, 50, [], 'Millet tô with a slippery okra and baobab-leaf sauce.', 'Plant-based version of a sauce often cooked with meat or fish.'),
  d('fonio-vegetables', 'Fonio with vegetables', 'Mali', 25, 45, [], 'Fonio grain steamed with onion, tomato and greens.'),
  d('accara', 'Accara', 'Senegal', 8, 25, [], 'Black-eyed bean fritters with an onion and tomato sauce.'),
  d('fataya', 'Fataya', 'Senegal', 10, 25, ['fish'], 'Fried pastries filled with spiced fish.'),
  d('dibi', 'Dibi', 'Senegal', 35, 45, ['meat'], 'Grilled lamb with onions and mustard, from the dibiterie.'),
  d('bissap', 'Bissap juice', 'Senegal', 5, 5, [], 'Chilled hibiscus juice with mint.'),
  // Côte d'Ivoire, Togo and Benin
  d('attieke-fish', 'Attiéké and grilled fish', "Côte d'Ivoire", 35, 55, ['fish'], 'Fermented cassava couscous with grilled fish, tomato and onion.'),
  d('garba', 'Garba', "Côte d'Ivoire", 20, 50, ['fish'], 'Attiéké with fried tuna, chilli and onion, a street favourite.'),
  d('alloco', 'Alloco', "Côte d'Ivoire", 10, 25, [], 'Fried ripe plantain with chilli and onion.'),
  d('kedjenou', 'Kedjenou', "Côte d'Ivoire", 40, 55, ['meat'], 'Chicken slow-cooked in a sealed pot with vegetables.'),
  d('foutou-graine', 'Foutou with palm-nut sauce', "Côte d'Ivoire", 30, 55, [], 'Pounded plantain and yam with a rich palm-nut sauce and aubergine.', 'Plant-based version of a sauce usually made with meat or fish.'),
  d('pate-gombo', 'Pâte with okra sauce', 'Togo', 20, 50, [], 'Maize pâte with a tomato and okra sauce.', 'Plant-based version, no smoked fish.'),
  // Sierra Leone, Liberia and the Gambia
  d('cassava-leaf', 'Cassava leaf stew and rice', 'Sierra Leone', 35, 60, ['meat', 'fish'], 'Pounded cassava leaves cooked in palm oil with meat and smoked fish.'),
  d('cassava-leaf-vegan', 'Cassava leaf stew (plant-based) and rice', 'Sierra Leone', 25, 55, [], 'Pounded cassava leaves in palm oil with groundnut paste.', 'Plant-based version, no meat or fish.'),
  d('potato-leaf', 'Potato leaf stew and rice', 'Sierra Leone', 25, 55, [], 'Sweet-potato leaves in palm oil with pepper.', 'Plant-based version of a stew often made with fish.'),
  // Central Africa
  d('ndole', 'Ndolé', 'Cameroon', 40, 60, ['meat', 'fish'], 'Bitterleaf and peanut stew with beef and prawns, with plantain.'),
  d('ndole-vegan', 'Ndolé (plant-based)', 'Cameroon', 30, 55, [], 'Bitterleaf and peanut stew with mushrooms, with plantain.', 'Plant-based version, no meat or prawns.'),
  d('poulet-dg', 'Poulet DG', 'Cameroon', 45, 60, ['meat'], 'Chicken sautéed with fried plantain, carrots and peppers.'),
  d('koki', 'Koki', 'Cameroon', 20, 45, [], 'Steamed black-eyed pea pudding with palm oil, wrapped in leaves.'),
  d('pondu', 'Pondu and chikwangue', 'DR Congo', 25, 55, [], 'Cassava leaves stewed with onion and palm oil, with fermented cassava bread.', 'Plant-based version, no dried fish.'),
  d('liboke-fish', 'Liboke of fish', 'Republic of the Congo', 40, 50, ['fish'], 'Fish steamed in banana leaves with tomato, onion and chilli.'),
  d('beignets-haricots', 'Beignets-haricots', 'Cameroon', 12, 40, [], 'Puff-puff with stewed beans, the classic breakfast.'),
  d('plantain-braise', 'Plantain braisé', 'Cameroon', 10, 30, [], 'Ripe plantain roasted on the grill.'),
  d('brochettes', 'Brochettes', 'Central Africa', 25, 30, ['meat'], 'Spiced beef skewers off the grill.'),
  // East Africa
  d('pilau', 'Pilau', 'Tanzania', 35, 55, ['meat'], 'Rice cooked with whole spices and beef.'),
  d('nyama-choma', 'Nyama choma and kachumbari', 'Kenya', 45, 55, ['meat'], 'Goat roasted over charcoal, with tomato and onion salad.'),
  d('chapati-beans', 'Chapati and beans', 'Kenya', 18, 50, [], 'Soft layered flatbread with stewed beans.', 'Chapati made with oil, no ghee.'),
  d('matoke', 'Matoke', 'Uganda', 22, 50, [], 'Green bananas stewed with tomato and onion.'),
  d('isombe', 'Isombe and rice', 'Rwanda', 22, 50, [], 'Pounded cassava leaves with aubergine, spinach and peanut.', 'Plant-based version, no dried fish.'),
  d('mandazi', 'Mandazi', 'East Africa', 6, 15, [], 'Lightly sweet fried dough with cardamom and coconut.', 'Made with coconut milk, no dairy or egg.'),
  d('samosa-veg', 'Vegetable samosas', 'East Africa', 10, 20, [], 'Crisp pastry triangles of spiced potato and peas.'),
  d('mishkaki', 'Mishkaki', 'Tanzania', 25, 30, ['meat'], 'Marinated beef skewers grilled at the roadside.'),
  d('rolex', 'Rolex', 'Uganda', 12, 35, ['egg'], 'An omelette with cabbage and tomato rolled in a chapati.'),
  d('mahindi-choma', 'Mahindi choma', 'Kenya', 6, 20, [], 'Roast maize rubbed with chilli and lime.'),
  // Ethiopia and Eritrea
  d('beyaynetu', 'Beyaynetu', 'Ethiopia', 35, 60, [], 'A fasting platter of lentils, split peas, greens and cabbage on injera.'),
  d('tibs', 'Tibs', 'Ethiopia', 40, 50, ['meat'], 'Sautéed beef with onion, rosemary and chilli, with injera.'),
  d('kitfo', 'Kitfo', 'Ethiopia', 45, 50, ['meat', 'dairy'], 'Minced beef with spiced butter and fresh cheese.'),
  d('sambusa', 'Lentil sambusa', 'Ethiopia', 8, 20, [], 'Fried pastries filled with spiced lentils.'),
  d('kolo', 'Kolo', 'Ethiopia', 5, 15, [], 'Roasted barley and peanuts, eaten by the handful.'),
  d('buna', 'Buna (Ethiopian coffee)', 'Ethiopia', 6, 2, [], 'Fresh-roasted coffee brewed in a jebena, black.'),
  // Somalia, Djibouti and Sudan
  d('bariis-iskukaris', 'Bariis iskukaris', 'Somalia', 40, 60, ['meat'], 'Spiced rice with goat, raisins and a banana on the side.'),
  d('suqaar', 'Suqaar', 'Somalia', 35, 45, ['meat'], 'Small cubes of beef fried with onion, pepper and spices.'),
  d('canjeero', 'Canjeero', 'Somalia', 10, 30, [], 'Spongy fermented pancake bread, with oil and sugar.', 'Served without ghee.'),
  d('ambulo', 'Ambulo', 'Somalia', 15, 45, [], 'Adzuki beans with sugar and sesame oil.', 'Plant-based: made with oil instead of ghee.'),
  d('ful', 'Ful medames', 'Sudan', 15, 45, [], 'Slow-cooked fava beans with cumin, oil and lemon, with bread.'),
  d('kisra-mullah', 'Kisra and okra mullah', 'Sudan', 25, 50, [], 'Thin sorghum flatbread with an okra stew.', 'Plant-based version of a stew often made with dried meat.'),
  d('taamiya', "Ta'ameya", 'Egypt', 8, 25, [], 'Herby fava-bean falafel in flatbread with tahini.'),
  d('shaiyah', 'Shaiyah', 'Sudan', 40, 45, ['meat'], 'Lamb fried with onion and chilli.'),
  d('aradaib', 'Aradaib juice', 'Sudan', 5, 5, [], 'Chilled tamarind juice.'),
  // North Africa
  d('couscous-lamb', 'Couscous with lamb', 'Morocco', 45, 60, ['meat'], 'Steamed couscous with lamb and seven vegetables.'),
  d('harira-vegan', 'Harira', 'Morocco', 18, 45, [], 'Tomato soup with chickpeas, lentils and herbs.', 'Plant-based version of a soup often made with lamb.'),
  d('lablabi', 'Lablabi', 'Tunisia', 15, 45, [], 'Chickpea soup with cumin, harissa and bread.', 'Served without the usual egg.'),
  d('brik', 'Brik', 'Tunisia', 15, 30, ['egg', 'fish'], 'Crisp pastry around a runny egg, tuna and parsley.'),
  d('msemen', 'Msemen', 'Morocco', 8, 25, ['dairy'], 'Flaky square flatbread cooked with butter, with honey.'),
  d('makroud', 'Makroud', 'Tunisia', 8, 15, [], 'Semolina pastries filled with dates and dipped in syrup.'),
  // Southern Africa
  d('nshima-greens', 'Nshima with greens and beans', 'Zambia', 18, 50, [], 'Stiff maize porridge with rape greens and stewed beans.'),
  d('umngqusho', 'Umngqusho', 'South Africa', 18, 50, [], 'Samp and beans slow-cooked with onion and chilli.'),
  d('shisa-nyama', 'Shisa nyama plate', 'South Africa', 45, 60, ['meat'], 'Flame-grilled boerewors and chops with pap and chakalaka.'),
  d('vetkoek', 'Vetkoek', 'South Africa', 8, 25, [], 'Golden fried dough bread, with apricot jam.'),
  d('biltong', 'Biltong', 'South Africa', 25, 20, ['meat'], 'Air-dried spiced beef.'),
  d('mielies', 'Roast mielies', 'South Africa', 6, 20, [], 'Maize cobs roasted over coals, with salt.'),
  // Angola, Mozambique, Cabo Verde, Guinea-Bissau, São Tomé
  d('muamba', 'Muamba de galinha', 'Angola', 45, 60, ['meat'], 'Chicken in palm-oil sauce with okra, with funge.'),
  d('funge-feijao', 'Funge and palm-oil beans', 'Angola', 25, 55, [], 'Cassava funge with beans stewed in palm oil.'),
  d('matapa', 'Matapa', 'Mozambique', 25, 55, [], 'Cassava leaves cooked with ground peanuts and coconut milk, over rice.', 'Plant-based version, no prawns or crab.'),
  d('peri-peri-chicken', 'Peri-peri chicken', 'Mozambique', 45, 55, ['meat'], 'Grilled chicken basted with a hot lemon and chilli sauce.'),
  d('caril-camarao', 'Prawn curry', 'Mozambique', 45, 55, ['fish'], 'Prawns in a coconut and tomato curry, with rice.'),
  d('cachupa', 'Cachupa', 'Cabo Verde', 25, 60, [], 'Slow-cooked maize and beans with sweet potato and cabbage.', 'Plant-based version of a stew often made with pork or fish.'),
  d('mandioca-frita', 'Fried cassava', 'Angola', 6, 25, [], 'Crisp fried cassava with chilli salt.'),
  d('badjias', 'Badjias', 'Mozambique', 6, 20, [], 'Spiced black-eyed pea fritters.'),
  // Madagascar and the Indian Ocean
  d('romazava', 'Romazava', 'Madagascar', 25, 55, [], 'Greens and brèdes simmered with ginger and tomato, over rice.', 'Plant-based version of a stew usually made with zebu beef.'),
  d('ravitoto', 'Ravitoto', 'Madagascar', 35, 60, ['meat'], 'Pounded cassava leaves with pork and coconut, over rice.'),
  d('vary-amin-anana', 'Vary amin’anana', 'Madagascar', 15, 45, [], 'Rice porridge cooked with leafy greens and ginger.'),
  d('lasary', 'Lasary and rice', 'Madagascar', 15, 40, [], 'Rice with a sharp pickle of green mango and carrot.'),
  d('zebu-brochettes', 'Zebu brochettes', 'Madagascar', 25, 30, ['meat'], 'Zebu beef skewers from the grill.'),
  d('mofo-gasy', 'Mofo gasy', 'Madagascar', 5, 15, [], 'Little fried rice-flour cakes, the morning snack.'),
  d('koba', 'Koba', 'Madagascar', 8, 20, [], 'Ground peanut, banana and rice paste steamed in leaves.'),
  d('dholl-puri', 'Dholl puri', 'Mauritius', 12, 45, [], 'Soft split-pea flatbreads with bean curry and rougaille.'),
  d('rougaille-vegan', 'Rougaille and rice', 'Mauritius', 20, 45, [], 'Tomato, thyme and chilli sauce with lentils and rice.', 'Plant-based version, often made with sausage or fish.'),
  d('octopus-curry', 'Octopus curry', 'Seychelles', 45, 55, ['fish'], 'Octopus in a coconut curry with rice.'),
  d('gateaux-piments', 'Gâteaux piments', 'Mauritius', 6, 15, [], 'Crisp split-pea and chilli fritters.'),
  d('alouda', 'Alouda', 'Mauritius', 8, 10, ['dairy'], 'A cold milk drink with basil seeds and agar jelly.'),
  // Britain and Ireland
  d('fish-and-chips', 'Fish and chips', 'United Kingdom', 40, 60, ['fish'], 'Battered haddock with thick chips and mushy peas.'),
  d('jacket-potato-beans', 'Jacket potato and beans', 'United Kingdom', 18, 50, [], 'Baked potato with baked beans.', 'Served with oil instead of butter.'),
  d('full-breakfast', 'Full breakfast', 'United Kingdom', 35, 60, ['meat', 'egg'], 'Bacon, sausage, eggs, beans, mushrooms and toast.'),
  d('irish-stew', 'Irish stew', 'Ireland', 40, 60, ['meat'], 'Lamb, potato, carrot and onion, slow-cooked.'),
  d('veg-pasty', 'Vegetable pasty', 'United Kingdom', 15, 40, [], 'Shortcrust pastry filled with potato, swede and onion.', 'Made with vegetable fat.'),
  // The Nordics and the Baltics
  d('smorrebrod-herring', 'Smørrebrød with herring', 'Denmark', 30, 35, ['fish'], 'Rye bread topped with pickled herring and onion.'),
  d('pea-soup-vegan', 'Yellow pea soup', 'Sweden', 18, 45, [], 'Thick yellow split-pea soup with mustard.', 'Plant-based version of a soup usually made with pork.'),
  d('cinnamon-bun', 'Cinnamon bun', 'Sweden', 10, 20, ['dairy', 'egg'], 'Cardamom dough rolled with cinnamon and butter.'),
  d('karelian-pie', 'Karelian pie', 'Finland', 10, 25, ['dairy', 'egg'], 'Rye crust filled with rice porridge, with egg butter.'),
  d('salmon-potatoes', 'Salmon and potatoes', 'Norway', 50, 55, ['fish'], 'Baked salmon with boiled potatoes and dill.'),
  d('rye-beetroot', 'Rye bread with beetroot and dill', 'Lithuania', 12, 30, [], 'Dark rye bread with a beetroot spread, cucumber and dill.'),
  // Central Europe
  d('currywurst', 'Currywurst', 'Germany', 20, 40, ['meat'], 'Sliced pork sausage under curry ketchup, with fries.'),
  d('pretzel', 'Soft pretzel', 'Germany', 6, 20, [], 'A lye-baked pretzel with coarse salt.'),
  d('schnitzel', 'Wiener schnitzel', 'Austria', 45, 55, ['meat', 'egg'], 'Breaded veal escalope with potato salad.'),
  d('goulash', 'Goulash', 'Hungary', 35, 55, ['meat'], 'Beef and paprika stew with bread.'),
  d('pierogi-ruskie', 'Pierogi ruskie', 'Poland', 25, 50, ['dairy', 'egg'], 'Dumplings filled with potato and curd cheese, with fried onion.'),
  d('lentil-stew', 'Lentil stew', 'Germany', 18, 50, [], 'Lentils with carrot, potato and a splash of vinegar.', 'Plant-based version of a stew usually made with sausage.'),
  d('frites', 'Frites', 'Belgium', 12, 35, [], 'Double-fried chips in a paper cone, with ketchup.', 'Fried in vegetable oil.'),
  d('stamppot', 'Stamppot', 'Netherlands', 22, 50, [], 'Potato mashed with kale, with gravy.', 'Plant-based version, no sausage or butter.'),
  // Southern Europe
  d('pizza-margherita', 'Pizza margherita', 'Italy', 30, 55, ['dairy'], 'Tomato, mozzarella and basil on a wood-fired base.'),
  d('pasta-pomodoro', 'Pasta al pomodoro', 'Italy', 22, 50, [], 'Spaghetti in a tomato, garlic and basil sauce.', 'Dried pasta, no egg; no cheese on top.'),
  d('risotto-funghi', 'Mushroom risotto', 'Italy', 35, 50, ['dairy'], 'Arborio rice with porcini, butter and parmesan.'),
  d('paella-verduras', 'Vegetable paella', 'Spain', 35, 55, [], 'Saffron rice with peppers, beans and artichoke.'),
  d('tortilla-espanola', 'Tortilla española', 'Spain', 15, 40, ['egg'], 'Thick potato and onion omelette.'),
  d('patatas-bravas', 'Patatas bravas', 'Spain', 12, 30, [], 'Fried potatoes with a spicy tomato sauce.'),
  d('ratatouille', 'Ratatouille', 'France', 28, 45, [], 'Courgette, aubergine, pepper and tomato, slowly stewed.'),
  d('croissant', 'Croissant', 'France', 8, 20, ['dairy', 'egg'], 'Flaky butter pastry, warm from the bakery.'),
  d('greek-salad', 'Greek salad', 'Greece', 20, 30, ['dairy'], 'Tomato, cucumber, olives and feta.'),
  d('souvlaki', 'Souvlaki', 'Greece', 20, 45, ['meat'], 'Grilled pork in pitta with tomato and onion.'),
  d('gemista', 'Gemista', 'Greece', 25, 50, [], 'Tomatoes and peppers stuffed with herby rice.'),
  d('bacalhau', 'Bacalhau à Brás', 'Portugal', 35, 50, ['fish', 'egg'], 'Salt cod with matchstick potatoes and egg.'),
  d('pastel-de-nata', 'Pastel de nata', 'Portugal', 6, 15, ['dairy', 'egg'], 'Custard tart in crisp pastry.'),
  d('pastizzi', 'Pastizzi', 'Malta', 4, 20, ['dairy'], 'Flaky pastries filled with ricotta.'),
  // Eastern Europe and the Balkans
  d('borscht-vegan', 'Borscht', 'Ukraine', 18, 45, [], 'Beetroot and cabbage soup with dill and rye bread.', 'Plant-based version, no beef or sour cream.'),
  d('varenyky', 'Varenyky', 'Ukraine', 22, 50, ['egg'], 'Potato dumplings with fried onion.'),
  d('cevapi', 'Ćevapi', 'Bosnia and Herzegovina', 30, 55, ['meat'], 'Grilled minced-meat rolls in somun bread with onion.'),
  d('burek-potato', 'Krompiruša', 'Bosnia and Herzegovina', 12, 40, [], 'Spiral pastry filled with potato and onion.', 'Potato filling, no meat or cheese.'),
  d('sarma', 'Sarma', 'Serbia', 35, 55, ['meat'], 'Cabbage leaves rolled around rice and minced meat.'),
  d('ajvar-bread', 'Ajvar and bread', 'Serbia', 10, 25, [], 'Smoky roasted pepper relish with fresh bread.'),
  d('pelmeni', 'Pelmeni', 'Russia', 30, 55, ['meat'], 'Small meat dumplings in broth.'),
  d('blini', 'Blini', 'Russia', 15, 35, ['dairy', 'egg'], 'Thin pancakes with sour cream.'),
  d('mamaliga', 'Mămăligă with cheese', 'Moldova', 20, 50, ['dairy'], 'Cornmeal porridge with brânză cheese.'),
  d('banitsa', 'Banitsa', 'Bulgaria', 10, 35, ['dairy', 'egg'], 'Filo pastry baked with egg and white cheese.'),
  // The Caucasus, Central Asia and Mongolia
  d('khachapuri', 'Khachapuri', 'Georgia', 25, 55, ['dairy', 'egg'], 'Boat-shaped bread filled with cheese and an egg.'),
  d('lobio', 'Lobio', 'Georgia', 18, 45, [], 'Red kidney beans stewed with herbs and walnut, with cornbread.'),
  d('khinkali', 'Khinkali', 'Georgia', 25, 50, ['meat'], 'Twisted dumplings full of spiced meat and broth.'),
  d('yalanchi', 'Yalanchi', 'Armenia', 15, 30, [], 'Vine leaves rolled around rice, herbs and onion.'),
  d('plov', 'Plov', 'Uzbekistan', 30, 60, ['meat'], 'Rice with lamb, yellow carrot and chickpeas, cooked in a kazan.'),
  d('lagman', 'Lagman', 'Kyrgyzstan', 30, 55, ['meat'], 'Hand-pulled noodles with beef and vegetables.'),
  d('samsa', 'Samsa', 'Uzbekistan', 8, 30, ['meat'], 'Tandoor-baked pastry with lamb and onion.'),
  d('non-bread', 'Non bread and salad', 'Uzbekistan', 8, 30, [], 'Round tandoor bread with tomato and cucumber salad.'),
  d('buuz', 'Buuz', 'Mongolia', 25, 50, ['meat'], 'Steamed mutton dumplings.'),
  // Turkey, the Levant, Iraq and Iran
  d('hummus', 'Hummus and bread', 'Lebanon', 15, 40, [], 'Chickpeas blended with tahini, lemon and olive oil.'),
  d('falafel', 'Falafel wrap', 'Levant', 12, 40, [], 'Chickpea falafel in flatbread with salad and tahini.'),
  d('shawarma', 'Shawarma', 'Levant', 20, 45, ['meat'], 'Spit-roasted chicken in flatbread with garlic sauce.'),
  d('fattoush', 'Fattoush', 'Lebanon', 15, 30, [], 'Salad of tomato, cucumber and herbs with toasted bread and sumac.'),
  d('mujaddara', 'Mujaddara', 'Levant', 18, 50, [], 'Lentils and rice with deeply fried onions.'),
  d('manakish', "Manakish za'atar", 'Lebanon', 8, 30, [], "Flatbread baked with za'atar and olive oil."),
  d('adana-kebab', 'Adana kebab', 'Turkey', 35, 55, ['meat'], 'Spiced minced lamb grilled on a skewer, with bulgur.'),
  d('mercimek', 'Lentil soup', 'Turkey', 12, 35, [], 'Red lentil soup with lemon.', 'Made with oil instead of butter.'),
  d('simit', 'Simit', 'Turkey', 4, 20, [], 'A sesame-crusted bread ring.'),
  d('mansaf', 'Mansaf', 'Jordan', 50, 65, ['meat', 'dairy'], 'Lamb cooked in jameed yoghurt, over rice.'),
  d('masgouf', 'Masgouf', 'Iraq', 45, 55, ['fish'], 'Butterflied carp slow-grilled by the fire.'),
  d('ghormeh-sabzi', 'Ghormeh sabzi', 'Iran', 40, 60, ['meat'], 'Herb stew with lamb, kidney beans and dried lime, over rice.'),
  d('kashk-bademjan', 'Kashk-e bademjan', 'Iran', 20, 35, ['dairy'], 'Smoky aubergine dip with whey and mint.'),
  d('baklava', 'Baklava', 'Turkey', 10, 15, ['dairy'], 'Filo layers with pistachio, butter and syrup.'),
  // The Arabian Peninsula
  d('kabsa', 'Kabsa', 'Saudi Arabia', 45, 60, ['meat'], 'Spiced rice with chicken, raisins and almonds.'),
  d('machboos-veg', 'Vegetable machboos', 'Kuwait', 30, 55, [], 'Spiced rice with chickpeas, dried lime and vegetables.'),
  d('saltah', 'Saltah', 'Yemen', 25, 50, ['meat'], 'Bubbling meat stew topped with fenugreek froth, with bread.'),
  d('dates-gahwa', 'Dates and gahwa', 'Saudi Arabia', 8, 15, [], 'Dates with cardamom Arabic coffee.'),
  // South Asia
  d('chana-masala', 'Chana masala and rice', 'India', 18, 50, [], 'Chickpeas in a spiced tomato and onion gravy.'),
  d('dal-rice', 'Dal and rice', 'India', 12, 50, [], 'Yellow lentils tempered with cumin and garlic, with rice.', 'Tempered with oil, no ghee.'),
  d('masala-dosa', 'Masala dosa', 'India', 15, 45, [], 'Crisp fermented rice crêpe with spiced potato, sambar and chutney.'),
  d('biryani', 'Chicken biryani', 'South Asia', 35, 60, ['meat'], 'Layered spiced rice with chicken and fried onion.'),
  d('butter-chicken', 'Butter chicken', 'India', 40, 55, ['meat', 'dairy'], 'Chicken in a creamy tomato sauce, with naan.'),
  d('paneer-tikka', 'Paneer tikka', 'India', 30, 45, ['dairy'], 'Grilled paneer cheese with peppers and mint chutney.'),
  d('vada-pav', 'Vada pav', 'India', 6, 30, [], 'A spiced potato fritter in a soft bun with chutneys.'),
  d('masala-chai', 'Masala chai', 'India', 3, 5, ['dairy'], 'Spiced milky tea.'),
  d('nihari', 'Nihari', 'Pakistan', 40, 60, ['meat'], 'Slow-cooked beef stew with naan, eaten in the morning.'),
  d('bolani', 'Bolani', 'Afghanistan', 10, 35, [], 'Thin flatbread stuffed with potato and leek.'),
  d('kabuli-pulao', 'Kabuli pulao', 'Afghanistan', 40, 60, ['meat'], 'Rice with lamb, carrots and raisins.'),
  d('shorshe-ilish', 'Shorshe ilish', 'Bangladesh', 45, 55, ['fish'], 'Hilsa fish in mustard sauce, with rice.'),
  d('momo-veg', 'Vegetable momo', 'Nepal', 12, 35, [], 'Steamed dumplings of cabbage and spices, with tomato achar.'),
  d('dal-bhat', 'Dal bhat', 'Nepal', 18, 60, [], 'Lentil soup, rice, vegetable curry and pickle.', 'Made without ghee.'),
  d('ema-datshi', 'Ema datshi', 'Bhutan', 25, 45, ['dairy'], 'Chillies in cheese sauce, with red rice.'),
  d('hoppers', 'Hoppers and curry', 'Sri Lanka', 15, 40, [], 'Bowl-shaped rice and coconut pancakes with dhal curry.'),
  d('kottu', 'Kottu', 'Sri Lanka', 25, 55, ['meat', 'egg'], 'Chopped roti stir-fried with egg, chicken and vegetables.'),
  d('mas-huni', 'Mas huni', 'Maldives', 20, 35, ['fish'], 'Shredded tuna with coconut, onion and chilli, with roshi bread.'),
  // East Asia
  d('mapo-tofu-vegan', 'Mapo tofu and rice', 'China', 22, 50, [], 'Tofu in a numbing Sichuan chilli and bean sauce.', 'Plant-based version, no minced pork.'),
  d('jiaozi', 'Pork jiaozi', 'China', 20, 45, ['meat'], 'Boiled pork and cabbage dumplings with black vinegar.'),
  d('scallion-pancake', 'Scallion pancake', 'China', 8, 25, [], 'Flaky pan-fried flatbread with spring onion.'),
  d('char-siu-bao', 'Char siu bao', 'Hong Kong', 10, 25, ['meat'], 'Steamed buns filled with barbecue pork.'),
  d('egg-tart', 'Egg tart', 'Macau', 6, 15, ['dairy', 'egg'], 'Custard tart with a crisp shell.'),
  d('beef-noodle-soup', 'Beef noodle soup', 'Taiwan', 30, 55, ['meat'], 'Braised beef in a rich broth with wheat noodles.'),
  d('bubble-tea', 'Bubble tea', 'Taiwan', 8, 10, ['dairy'], 'Milk tea with chewy tapioca pearls.'),
  d('ramen', 'Ramen', 'Japan', 30, 55, ['meat', 'egg'], 'Wheat noodles in pork broth with chashu and a soft egg.'),
  d('onigiri-ume', 'Umeboshi onigiri', 'Japan', 5, 20, [], 'Rice ball with pickled plum, wrapped in nori.'),
  d('inari-sushi', 'Inari sushi', 'Japan', 10, 25, [], 'Sushi rice in sweet fried tofu pouches.'),
  d('bibimbap', 'Bibimbap', 'South Korea', 30, 55, ['meat', 'egg'], 'Rice with vegetables, beef, chilli paste and a fried egg.'),
  d('japchae', 'Japchae', 'South Korea', 20, 40, [], 'Sweet potato glass noodles with vegetables and sesame.', 'Plant-based version, no beef or egg.'),
  d('tteokbokki', 'Tteokbokki', 'South Korea', 12, 40, ['fish'], 'Rice cakes and fish cakes in sweet chilli sauce.'),
  d('naengmyeon', 'Pyongyang naengmyeon', 'North Korea', 30, 45, ['meat', 'egg'], 'Cold buckwheat noodles in beef broth with egg and pear.'),
  // Southeast Asia
  d('pad-thai', 'Pad thai', 'Thailand', 20, 50, ['egg', 'fish'], 'Stir-fried rice noodles with egg, tamarind, peanuts and dried shrimp.'),
  d('green-curry-veg', 'Green curry with tofu', 'Thailand', 22, 50, [], 'Coconut green curry with tofu, aubergine and basil, with rice.', 'Made without fish sauce or shrimp paste.'),
  d('mango-sticky-rice', 'Mango sticky rice', 'Thailand', 10, 30, [], 'Sweet sticky rice with coconut cream and ripe mango.'),
  d('tom-yum', 'Tom yum goong', 'Thailand', 25, 35, ['fish'], 'Hot and sour prawn soup with lemongrass and lime leaf.'),
  d('pho-bo', 'Phở bò', 'Vietnam', 20, 50, ['meat'], 'Rice noodles in a clear beef broth with herbs.'),
  d('goi-cuon-chay', 'Fresh spring rolls', 'Vietnam', 10, 25, [], 'Rice-paper rolls of tofu, herbs and noodles with peanut sauce.'),
  d('amok', 'Fish amok', 'Cambodia', 30, 45, ['fish'], 'Fish steamed in coconut curry in a banana-leaf cup.'),
  d('laap', 'Laap', 'Laos', 25, 40, ['meat'], 'Minced meat salad with lime, herbs and toasted rice, with sticky rice.'),
  d('mohinga', 'Mohinga', 'Myanmar', 15, 45, ['fish'], 'Rice noodles in a fish and lemongrass broth.'),
  d('lahpet', 'Tea leaf salad', 'Myanmar', 15, 30, [], 'Fermented tea leaves with crunchy beans, tomato and cabbage.', 'Made without dried shrimp.'),
  d('nasi-lemak', 'Nasi lemak', 'Malaysia', 15, 50, ['fish', 'egg'], 'Coconut rice with sambal, anchovies, peanuts and egg.'),
  d('roti-canai-dhal', 'Roti canai and dhal', 'Malaysia', 8, 35, [], 'Flaky flatbread with lentil curry.', 'Made with vegetable oil.'),
  d('laksa', 'Laksa', 'Singapore', 25, 55, ['fish'], 'Rice noodles in a spicy coconut broth with prawns.'),
  d('chicken-rice', 'Hainanese chicken rice', 'Singapore', 20, 50, ['meat'], 'Poached chicken with rice cooked in its stock, and chilli sauce.'),
  d('nasi-goreng', 'Nasi goreng', 'Indonesia', 18, 50, ['egg'], 'Sweet soy fried rice with a fried egg.'),
  d('gado-gado', 'Gado-gado', 'Indonesia', 15, 45, [], 'Vegetables, tofu and tempeh in peanut sauce.', 'Served without egg or prawn crackers.'),
  d('tempeh-goreng', 'Tempeh goreng', 'Indonesia', 8, 25, [], 'Fried tempeh with chilli sambal.'),
  d('adobo', 'Chicken adobo', 'Philippines', 25, 55, ['meat'], 'Chicken braised in vinegar, soy and garlic, with rice.'),
  d('ginataang-gulay', 'Ginataang gulay', 'Philippines', 18, 45, [], 'Squash and long beans in coconut milk, with rice.', 'Made without shrimp paste.'),
  d('pancit', 'Pancit canton', 'Philippines', 18, 45, ['meat'], 'Stir-fried noodles with pork and vegetables.'),
  // Oceania
  d('meat-pie', 'Meat pie', 'Australia', 12, 40, ['meat'], 'Minced beef and gravy in pastry, with tomato sauce.'),
  d('avocado-toast', 'Avocado toast', 'Australia', 18, 30, [], 'Smashed avocado on sourdough with chilli and lemon.'),
  d('pavlova', 'Pavlova', 'New Zealand', 12, 20, ['egg', 'dairy'], 'Meringue with cream and fresh fruit.'),
  d('hangi', 'Hāngī', 'New Zealand', 45, 60, ['meat'], 'Meat and vegetables cooked in an earth oven.'),
  d('kokoda', 'Kokoda', 'Fiji', 30, 35, ['fish'], 'Raw fish cured in lime with coconut cream and chilli.'),
  d('palusami', 'Palusami', 'Samoa', 20, 45, [], 'Taro leaves baked in coconut cream, with taro.', 'Plant-based version, no corned beef.'),
  d('lu-sipi', 'Lu sipi', 'Tonga', 40, 55, ['meat'], 'Lamb wrapped in taro leaves with coconut cream, baked.'),
  // North America
  d('burger', 'Cheeseburger', 'United States', 30, 55, ['meat', 'dairy'], 'Beef patty, cheese, pickles and onion in a bun, with fries.'),
  d('veggie-burger', 'Bean burger', 'United States', 25, 50, [], 'Black-bean patty with lettuce and tomato, with fries.'),
  d('bagel', 'Bagel with avocado', 'United States', 10, 30, [], 'Toasted sesame bagel with avocado and tomato.'),
  d('mac-cheese', 'Mac and cheese', 'United States', 18, 50, ['dairy'], 'Macaroni baked in cheese sauce.'),
  d('bbq-brisket', 'Barbecue brisket', 'United States', 45, 60, ['meat'], 'Smoked beef brisket with slaw and pickles.'),
  d('red-beans-rice', 'Red beans and rice', 'United States', 18, 50, [], 'Louisiana red beans with peppers, celery and spice, over rice.', 'Plant-based version, no sausage.'),
  d('poutine', 'Poutine', 'Canada', 20, 55, ['dairy', 'meat'], 'Fries with cheese curds and beef gravy.'),
  d('maple-pancakes', 'Pancakes with maple syrup', 'Canada', 15, 40, ['dairy', 'egg'], 'Fluffy pancakes with maple syrup.'),
  // Mexico and Central America
  d('tacos-al-pastor', 'Tacos al pastor', 'Mexico', 18, 45, ['meat'], 'Spit-roasted pork with pineapple on corn tortillas.'),
  d('frijoles-tortillas', 'Frijoles and tortillas', 'Mexico', 10, 45, [], 'Refried black beans with corn tortillas and salsa.', 'Refried in oil, not lard.'),
  d('guacamole', 'Guacamole and totopos', 'Mexico', 12, 30, [], 'Avocado, lime and chilli with corn chips.'),
  d('elote', 'Elote', 'Mexico', 6, 20, ['dairy', 'egg'], 'Grilled corn with mayonnaise, cheese and chilli.'),
  d('pupusas', 'Pupusas', 'El Salvador', 10, 45, ['dairy'], 'Thick corn tortillas stuffed with beans and cheese, with curtido.'),
  d('gallo-pinto', 'Gallo pinto', 'Costa Rica', 12, 50, [], 'Rice and black beans fried with onion and pepper, with plantain.'),
  d('baleadas', 'Baleadas', 'Honduras', 10, 45, ['dairy'], 'Flour tortillas with beans, cheese and cream.'),
  d('tamales', 'Tamales', 'Guatemala', 15, 45, ['meat'], 'Corn dough with pork in red sauce, steamed in leaves.'),
  d('sancocho', 'Sancocho', 'Panama', 30, 55, ['meat'], 'Chicken soup with yam, corn and culantro.'),
  // The Caribbean
  d('jerk-chicken', 'Jerk chicken', 'Jamaica', 35, 55, ['meat'], 'Chicken marinated in scotch bonnet and allspice, smoked over pimento wood.'),
  d('rice-and-peas', 'Rice and peas', 'Jamaica', 15, 50, [], 'Rice and kidney beans cooked in coconut milk with thyme.'),
  d('ackee-saltfish', 'Ackee and saltfish', 'Jamaica', 35, 50, ['fish'], 'Ackee fruit sautéed with salt cod, peppers and onion.'),
  d('doubles', 'Doubles', 'Trinidad and Tobago', 6, 30, [], 'Two soft fried breads with curried chickpeas and chutney.'),
  d('roti-channa', 'Dhalpuri roti with channa', 'Trinidad and Tobago', 15, 50, [], 'Split-pea flatbread wrapped around curried chickpeas and potato.'),
  d('congri', 'Congrí', 'Cuba', 15, 50, [], 'Rice and black beans with sofrito, with fried plantain.', 'Plant-based version, no pork.'),
  d('mangu', 'Mangú', 'Dominican Republic', 12, 45, [], 'Mashed green plantain with pickled red onions.', 'Made with oil instead of butter.'),
  d('griot', 'Griot', 'Haiti', 35, 55, ['meat'], 'Fried marinated pork with pikliz and plantain.'),
  d('conch-fritters', 'Conch fritters', 'Bahamas', 20, 35, ['fish', 'egg'], 'Fried batter balls with conch and peppers.'),
  d('cou-cou', 'Cou-cou and flying fish', 'Barbados', 35, 55, ['fish'], 'Cornmeal and okra with steamed flying fish.'),
  d('mofongo', 'Mofongo', 'Puerto Rico', 25, 55, ['meat'], 'Mashed fried plantain with garlic and pork crackling.'),
  // South America
  d('arepa', 'Arepa with beans and avocado', 'Venezuela', 10, 40, [], 'Grilled corn cake filled with black beans and avocado.'),
  d('bandeja-paisa', 'Bandeja paisa', 'Colombia', 45, 65, ['meat', 'egg'], 'Beans, rice, ground beef, chicharrón, plantain and a fried egg.'),
  d('ceviche', 'Ceviche', 'Peru', 35, 35, ['fish'], 'Raw fish cured in lime with chilli, onion and sweet potato.'),
  d('lomo-saltado', 'Lomo saltado', 'Peru', 40, 55, ['meat'], 'Beef stir-fried with tomato and onion, with chips and rice.'),
  d('quinoa-soup', 'Quinoa soup', 'Bolivia', 15, 40, [], 'Quinoa with potato, carrot and herbs.', 'Plant-based version of a soup often made with beef.'),
  d('saltena', 'Salteña', 'Bolivia', 8, 30, ['meat', 'egg'], 'Baked pastry with a juicy beef and egg filling.'),
  d('feijoada', 'Feijoada', 'Brazil', 40, 65, ['meat'], 'Black beans with pork, rice, greens and orange.'),
  d('feijao-arroz', 'Rice, beans and farofa', 'Brazil', 15, 55, [], 'Rice and beans with toasted cassava flour and greens.'),
  d('pao-de-queijo', 'Pão de queijo', 'Brazil', 6, 15, ['dairy', 'egg'], 'Chewy cheese bread rolls.'),
  d('acai-bowl', 'Açaí bowl', 'Brazil', 15, 30, [], 'Frozen açaí blended with banana, topped with granola.'),
  d('empanada', 'Beef empanada', 'Argentina', 8, 30, ['meat'], 'Baked pastry with spiced beef, olive and onion.'),
  d('asado', 'Asado', 'Argentina', 50, 60, ['meat'], 'Beef grilled over wood embers, with chimichurri.'),
  d('chivito', 'Chivito', 'Uruguay', 35, 60, ['meat', 'egg', 'dairy'], 'Steak sandwich with ham, cheese and a fried egg.'),
  d('chipa', 'Chipa', 'Paraguay', 5, 15, ['dairy', 'egg'], 'Cassava and cheese bread rings.'),
  d('porotos-granados', 'Porotos granados', 'Chile', 18, 50, [], 'Fresh beans with corn and squash, and basil.'),
  d('pepperpot', 'Pepperpot', 'Guyana', 40, 55, ['meat'], 'Beef stewed with cassareep and cinnamon, with bread.'),
  d('encebollado', 'Encebollado', 'Ecuador', 20, 45, ['fish'], 'Tuna and cassava soup with pickled onion.'),
  // More plant-based staples from across the world
  d('mashkichiri', 'Mashkichiri', 'Uzbekistan', 15, 50, [], 'Mung beans and rice cooked with onion and carrot.', 'Plant-based version of a dish often made with lamb.'),
  d('adas-polo', 'Adas polo', 'Iran', 25, 50, [], 'Rice with lentils, raisins and dates.', 'Made with oil instead of butter.'),
  d('salad-shirazi', 'Salad shirazi', 'Iran', 10, 20, [], 'Chopped cucumber, tomato and onion with lime and mint.'),
  d('barbari', 'Barbari bread', 'Iran', 4, 20, [], 'Long, chewy flatbread with sesame.'),
  d('pol-sambol', 'Pol sambol and roti', 'Sri Lanka', 8, 30, [], 'Grated coconut with chilli and lime, with coconut roti.'),
  d('stir-fried-greens', 'Garlic greens and rice', 'China', 12, 35, [], 'Choi sum flash-fried with garlic, with rice.'),
  d('vegetable-bao', 'Vegetable baozi', 'China', 6, 20, [], 'Steamed buns filled with cabbage, mushroom and glass noodles.'),
  d('yasai-curry', 'Vegetable curry rice', 'Japan', 20, 50, [], 'Japanese curry with potato, carrot and onion over rice.', 'Made with a plant-based roux.'),
  d('edamame', 'Edamame', 'Japan', 5, 10, [], 'Salted steamed soybeans.'),
  d('dubu-jorim', 'Dubu jorim and rice', 'South Korea', 15, 40, [], 'Pan-fried tofu braised in soy, garlic and chilli.'),
  d('hotteok', 'Hotteok', 'South Korea', 4, 15, [], 'Sweet pancakes filled with brown sugar and nuts.', 'Made without milk or egg.'),
  d('kongguksu', 'Kongguksu', 'South Korea', 18, 45, [], 'Cold wheat noodles in a creamy soybean broth with cucumber.'),
  d('goguma', 'Roasted sweet potato', 'South Korea', 4, 20, [], 'Sweet potato roasted in a street-side drum.'),
  d('moo-ping', 'Moo ping', 'Thailand', 8, 25, ['meat'], 'Grilled pork skewers with sticky rice.'),
  d('banh-mi-chay', 'Bánh mì chay', 'Vietnam', 8, 35, [], 'Baguette with lemongrass tofu, pickles and herbs.', 'Made without pâté or mayonnaise.'),
  d('com-chay', 'Cơm chay', 'Vietnam', 12, 45, [], 'Buddhist vegetarian rice plate of tofu and greens.'),
  d('satay', 'Chicken satay', 'Malaysia', 15, 30, ['meat'], 'Grilled skewers with peanut sauce and rice cakes.'),
  d('monggo', 'Ginisang monggo', 'Philippines', 12, 45, [], 'Mung bean stew with greens and garlic, with rice.', 'Plant-based version, no pork.'),
  d('turon', 'Turon', 'Philippines', 5, 15, [], 'Banana and jackfruit fried in a spring-roll wrapper with caramel.'),
  d('taho', 'Taho', 'Philippines', 4, 10, [], 'Warm silken tofu with brown-sugar syrup and sago pearls.'),
  d('pumpkin-soup', 'Pumpkin soup', 'Australia', 15, 35, [], 'Roast pumpkin soup with crusty bread.', 'Made with coconut milk instead of cream.'),
  d('taro-coconut', 'Taro in coconut cream', 'Pacific Islands', 15, 45, [], 'Boiled taro with lolo coconut cream.'),
  d('breadfruit', 'Roast breadfruit', 'Pacific Islands', 8, 35, [], 'Breadfruit roasted in the fire, with coconut.'),
  d('tostones', 'Tostones', 'Caribbean', 6, 25, [], 'Twice-fried green plantain with garlic mojo.'),
  d('moqueca', 'Moqueca', 'Brazil', 45, 55, ['fish'], 'Fish stew with coconut milk, dendê oil and peppers.'),
  d('tapioca-crepe', 'Tapioca with banana', 'Brazil', 6, 20, [], 'Cassava-starch crêpe filled with banana and cinnamon.'),
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

export const VENDOR_RADIUS = 3;

export function nearestVendor(vendors: readonly FoodVendor[], x: number, z: number): FoodVendor | null {
  let best: FoodVendor | null = null;
  let bestD = VENDOR_RADIUS;
  for (const v of vendors) {
    const dist = Math.hypot(v.position[0] - x, v.position[2] - z);
    if (dist <= bestD) {
      best = v;
      bestD = dist;
    }
  }
  return best;
}
