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
