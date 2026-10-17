/**
 * The rest of the world: a district in the capital of every other country
 * and territory the game knows (lib/places.ts COUNTRY_CODES), grouped into
 * regional styles for food, music, clothes and names. Cold and high cities
 * have no palms; countries that drive on the left get left-hand traffic.
 * Continents and islands are separate landmasses, so coaches only run within
 * one (the Darién Gap means none between Central and South America).
 *
 * Choices of capital: the official capital, except where its status is
 * disputed internationally or it isn't where most of the country lives and
 * works; there the main city is used and noted below. Vatican City is left
 * out: it has no housing or ordinary jobs to simulate.
 */
import type { CitySeed, RegionStyle, VendorStyle } from './generate';
import { BUSES, HOMES, PAN_AFRICAN, PASTEL, SAND, WARM } from './africa';

const STONE = ['#d8cfc4', '#c9bba8', '#b8a99a', '#e1d8cc', '#a89888', '#cfc6bb'];
const CONCRETE = ['#cfcac2', '#bfbab3', '#d9d4cc', '#b5b0a8', '#e0dbd2', '#c4bfb6'];

const n = (male: string, female: string, family: string) => ({ male: male.split(', '), female: female.split(', '), family: family.split(', ') });
const v = (names: string, kind: string, menu: string): VendorStyle => ({ names: names.split(', '), kind, menu: menu.split(' ') });
const PARK_NAMES = ['Park', 'Gardens', 'Green', 'Square'];

interface StyleSpec {
  kitchen: VendorStyle;
  snacks: VendorStyle;
  lounge: string;
  lounges?: string;
  fashion: [string, string];
  walls: readonly string[];
  park: string;
  names: RegionStyle['names'];
  palms?: boolean;
  busRole?: string;
}

/** Every city abroad also has an African kitchen: the diaspora is everywhere. */
function style(s: StyleSpec): RegionStyle {
  return {
    kitchen: s.kitchen,
    snacks: s.snacks,
    second: PAN_AFRICAN,
    lounge: { names: (s.lounges ?? '{city} Live, Blue Note').split(', '), description: s.lounge },
    fashion: { name: s.fashion[0], kind: s.fashion[1] },
    park: { names: PARK_NAMES, description: s.park },
    walls: s.walls,
    buses: BUSES,
    busStripes: false,
    homes: HOMES,
    names: s.names,
    ...(s.palms === false ? { palms: false } : {}),
    busRole: s.busRole ?? 'Bus driver',
  };
}
/** The same style with other names, music or menu for one country. */
const tweak = (base: RegionStyle, t: Partial<RegionStyle> & { loungeText?: string }): RegionStyle => {
  const { loungeText, ...rest } = t;
  return { ...base, ...rest, ...(loungeText ? { lounge: { ...base.lounge, description: loungeText } } : {}) };
};
const cold = (s: RegionStyle): RegionStyle => ({ ...s, palms: false });
const DRY = ' No alcohol served.';

const TEMPERATE = 'Lime trees and benches along the paths. Busy at lunchtime and on sunny evenings.';
const MED_PARK = 'Plane trees and benches, with a fountain. Busy in the cool of the evening.';
const TROPICAL = 'Flowering trees and palms over the benches. A shady spot in the heat of the day.';
const DRY_PARK = 'Date palms and benches by a fountain. Busy after sunset.';

// ---------------------------------------------------------------- Europe

const BRITISH = style({
  kitchen: v('The Corner Caff, Rosie’s Kitchen', 'Café and curry house', 'fish-and-chips jacket-potato-beans full-breakfast veg-pasty chana-masala dal-rice'),
  snacks: v('Bakery, Market stall', 'Bakery and snacks', 'veg-pasty fruit bagel cinnamon-bun'),
  lounge: 'Grime, Afroswing and live soul on a small stage, open late.',
  fashion: ['Tailors', 'Tailoring, streetwear & salon'],
  walls: STONE, park: TEMPERATE, palms: false,
  names: n('James, Daniel, Kwame, Liam, Ravi, Tom, Callum', 'Sophie, Chloe, Amara, Priya, Emily, Grace, Niamh', 'Smith, Jones, Okafor, Patel, Murphy, Taylor, Campbell'),
});
const IRISH = tweak(BRITISH, {
  kitchen: v('The Corner Caff, Molly’s Kitchen', 'Café and pub kitchen', 'irish-stew fish-and-chips jacket-potato-beans veg-pasty full-breakfast lentil-stew'),
  loungeText: 'Trad sessions early, then a DJ, open late.',
  names: n('Seán, Conor, Darragh, Cian, Oisín, Patrick, Eoin', 'Aoife, Siobhán, Niamh, Ciara, Saoirse, Róisín, Orla', 'Murphy, Kelly, Byrne, Ryan, Walsh, O’Brien, Doyle'),
});
const NORDIC = style({
  kitchen: v('Kafé Norden, Lunch Kitchen', 'Nordic kitchen', 'smorrebrod-herring pea-soup-vegan salmon-potatoes rye-beetroot lentil-stew karelian-pie'),
  snacks: v('Bakery, Kiosk', 'Bakery and kiosk', 'cinnamon-bun karelian-pie rye-beetroot fruit pretzel'),
  lounge: 'Jazz and indie bands on a small stage, open late.',
  fashion: ['Design Store', 'Knitwear, outdoor wear & salon'],
  walls: STONE, park: TEMPERATE, palms: false,
  names: n('Lars, Erik, Mikkel, Oskar, Jonas, Aksel, Elias', 'Ingrid, Astrid, Freja, Emma, Sofie, Maja, Saga', 'Hansen, Johansson, Nielsen, Andersson, Larsen, Berg, Lund'),
});
const FINNISH = tweak(NORDIC, { names: n('Mikko, Juha, Antti, Ville, Eero, Lauri, Joonas', 'Aino, Emilia, Sanna, Laura, Helmi, Venla, Elina', 'Virtanen, Korhonen, Mäkinen, Nieminen, Laine, Heikkinen, Koskinen') });
const BALTIC = tweak(NORDIC, { names: n('Mārtiņš, Jānis, Tomas, Mantas, Andres, Kristjan, Rasmus', 'Laura, Anna, Ieva, Kristiina, Liis, Agnė, Elīna', 'Ozols, Kazlauskas, Tamm, Bērziņš, Saar, Petrauskas, Kask') });
const ICELANDIC = tweak(NORDIC, { names: n('Jón, Sigurður, Gunnar, Ólafur, Einar, Kristján, Bjarni', 'Guðrún, Anna, Sigríður, Kristín, Helga, Katrín, Sara', 'Jónsson, Sigurðardóttir, Gunnarsson, Ólafsdóttir, Einarsson, Kristjánsdóttir, Bjarnason') });

const CENTRAL_EU = style({
  kitchen: v('Stadtküche, Bistro am Eck', 'Central European kitchen', 'currywurst schnitzel goulash pierogi-ruskie lentil-stew stamppot frites'),
  snacks: v('Bakery, Imbiss', 'Bakery and snack stand', 'pretzel frites fruit currywurst croissant'),
  lounge: 'Live jazz early, techno from the DJ booth later.',
  fashion: ['Boutique', 'Workwear, streetwear & salon'],
  walls: STONE, park: TEMPERATE, palms: false,
  names: n('Lukas, Jonas, Felix, Maximilian, Daan, Thomas, Elias', 'Anna, Lena, Sophie, Lea, Julia, Emma, Sanne', 'Müller, Schmidt, Weber, de Jong, Peeters, Huber, Meier'),
});
const CENTRAL_SLAVIC = tweak(CENTRAL_EU, {
  kitchen: v('Bistro, Mleczny Bar', 'Central European kitchen', 'pierogi-ruskie goulash schnitzel lentil-stew borscht-vegan rye-beetroot frites'),
  names: n('Jakub, Piotr, Tomáš, Martin, Bence, Luka, Michał', 'Anna, Katarzyna, Tereza, Zuzana, Eszter, Nika, Agnieszka', 'Nowak, Kowalski, Novák, Horváth, Kovač, Svoboda, Nagy'),
});

const MEDITERRANEAN = style({
  kitchen: v('Trattoria, Taverna', 'Mediterranean kitchen', 'pizza-margherita pasta-pomodoro paella-verduras ratatouille gemista souvlaki bacalhau risotto-funghi'),
  snacks: v('Bakery, Kiosk', 'Bakery and snacks', 'croissant pastel-de-nata patatas-bravas fruit tortilla-espanola falafel'),
  lounge: 'Live jazz on a small stage, open late.',
  fashion: ['Boutique', 'Fashion, leather & salon'],
  walls: WARM, park: MED_PARK,
  names: n('Marco, Luca, Giovanni, Matteo, Lorenzo, Andrea, Davide', 'Giulia, Chiara, Francesca, Sofia, Martina, Sara, Aurora', 'Rossi, Russo, Ferrari, Esposito, Bianchi, Romano, Colombo'),
});
const FRENCH = tweak(MEDITERRANEAN, {
  kitchen: v('Le Bistrot, Chez Nous', 'French bistro', 'ratatouille croissant pasta-pomodoro lentil-stew frites risotto-funghi'),
  loungeText: 'Jazz, rap français and Afro sets from a DJ, open late.',
  fashion: { name: 'Boutique', kind: 'Prêt-à-porter & salon' },
  names: n('Lucas, Hugo, Mamadou, Louis, Karim, Théo, Jules', 'Léa, Camille, Chloé, Inès, Manon, Aïcha, Jade', 'Martin, Bernard, Dubois, Diallo, Moreau, Petit, Laurent'),
});
const SPANISH = tweak(MEDITERRANEAN, {
  kitchen: v('Casa Pepe, La Taberna', 'Spanish kitchen', 'paella-verduras tortilla-espanola patatas-bravas gemista pasta-pomodoro bacalhau'),
  loungeText: 'Flamenco and Latin sets, open very late.',
  names: n('Pablo, Javier, Hugo, Daniel, Alejandro, Mario, Álvaro', 'Lucía, María, Carmen, Paula, Sara, Martina, Elena', 'García, Fernández, López, Martínez, Sánchez, Pérez, Romero'),
});
const PORTUGUESE = tweak(MEDITERRANEAN, {
  kitchen: v('Tasca do Bairro, Casa da Avó', 'Portuguese tasca', 'bacalhau paella-verduras pasta-pomodoro gemista caril-camarao cachupa funge-feijao'),
  loungeText: 'Fado early, Afro-Lusophone kizomba and kuduro later.',
  names: n('João, Tiago, Rodrigo, Miguel, Duarte, Afonso, Rúben', 'Inês, Beatriz, Mariana, Leonor, Matilde, Carolina, Joana', 'Silva, Santos, Ferreira, Pereira, Oliveira, Costa, Rodrigues'),
});
const GREEK = tweak(MEDITERRANEAN, {
  kitchen: v('Taverna, Mezedopoleio', 'Greek taverna', 'souvlaki gemista greek-salad hummus pasta-pomodoro fattoush'),
  loungeText: 'Rebetiko and Greek pop on a small stage, open late.',
  names: n('Giorgos, Nikos, Dimitris, Kostas, Yannis, Christos, Andreas', 'Maria, Eleni, Katerina, Sofia, Despina, Anna, Georgia', 'Papadopoulos, Nikolaidis, Georgiou, Ioannou, Konstantinou, Vlachos, Christodoulou'),
});
const MALTESE = tweak(MEDITERRANEAN, {
  snacks: v('Pastizzeria, Kiosk', 'Pastizzi and snacks', 'pastizzi fruit patatas-bravas falafel'),
  names: n('Luke, Matthew, Jake, Daniel, Kurt, Neil, Gabriel', 'Maria, Elena, Martina, Julia, Nicole, Christine, Sarah', 'Borg, Camilleri, Vella, Farrugia, Zammit, Galea, Micallef'),
});

const BALKAN = style({
  kitchen: v('Kafana, Ćevabdžinica', 'Balkan kitchen', 'cevapi sarma burek-potato ajvar-bread banitsa gemista greek-salad'),
  snacks: v('Pekara, Kiosk', 'Bakery and snacks', 'burek-potato ajvar-bread fruit banitsa simit'),
  lounge: 'Live brass and Balkan pop, open late.',
  fashion: ['Boutique', 'Fashion & salon'],
  walls: STONE, park: TEMPERATE, palms: false,
  names: n('Marko, Nikola, Stefan, Luka, Emir, Aleksandar, Dino', 'Ana, Milica, Jelena, Elena, Ajla, Sara, Ivana', 'Petrović, Jovanović, Kovačević, Hodžić, Popovski, Marković, Babić'),
});
const ALBANIAN = tweak(BALKAN, { names: n('Arben, Endrit, Besnik, Dritan, Erion, Ardit, Valon', 'Elira, Arta, Besa, Drita, Mirela, Era, Fjolla', 'Hoxha, Krasniqi, Berisha, Shehu, Gashi, Leka, Hasani') });
const ROMANIAN = tweak(BALKAN, {
  kitchen: v('Bistro, La Mama', 'Romanian kitchen', 'mamaliga sarma borscht-vegan ajvar-bread lentil-stew gemista'),
  names: n('Andrei, Mihai, Ion, Alexandru, Ștefan, Vlad, Radu', 'Maria, Ioana, Elena, Ana, Andreea, Cristina, Alina', 'Popescu, Ionescu, Popa, Rusu, Munteanu, Ciobanu, Stan'),
});
const BULGARIAN = tweak(BALKAN, { names: n('Georgi, Ivan, Dimitar, Nikolay, Petar, Hristo, Stoyan', 'Maria, Ivana, Elena, Desislava, Gergana, Teodora, Yana', 'Ivanov, Petrov, Georgiev, Dimitrov, Nikolov, Stoyanov, Todorov') });

const EASTERN = style({
  kitchen: v('Stolovaya, Café Domashnya', 'Home-style kitchen', 'borscht-vegan varenyky pelmeni blini lentil-stew rye-beetroot mamaliga'),
  snacks: v('Bakery, Kiosk', 'Bakery and kiosk', 'rye-beetroot fruit blini pretzel'),
  lounge: 'Live bands and DJ sets, open late.',
  fashion: ['Boutique', 'Fashion & salon'],
  walls: STONE, park: TEMPERATE, palms: false,
  names: n('Dmitri, Ivan, Sergei, Maksim, Artyom, Alexei, Nikolai', 'Anastasia, Natalia, Yulia, Daria, Ekaterina, Olga, Svetlana', 'Ivanov, Smirnov, Kuznetsov, Popov, Sokolov, Volkov, Morozov'),
});
const UKRAINIAN = tweak(EASTERN, { names: n('Oleksandr, Andriy, Taras, Bohdan, Dmytro, Mykola, Yurii', 'Olena, Iryna, Kateryna, Oksana, Natalia, Yulia, Solomiia', 'Shevchenko, Kovalenko, Bondarenko, Melnyk, Tkachenko, Kravchenko, Boyko') });

// ---------------------------------------------------------------- West and Central Asia

const CAUCASUS = style({
  kitchen: v('Supra House, Old Town Kitchen', 'Caucasian kitchen', 'khachapuri lobio khinkali yalanchi plov non-bread'),
  snacks: v('Bakery, Market stall', 'Bakery and market', 'yalanchi non-bread fruit khachapuri'),
  lounge: 'Folk polyphony and jazz on a small stage, open late.',
  fashion: ['Boutique', 'Fashion & salon'],
  walls: STONE, park: TEMPERATE, palms: false,
  names: n('Giorgi, Davit, Levan, Nika, Luka, Irakli, Zurab', 'Nino, Mariam, Tamar, Ana, Salome, Ketevan, Natia', 'Beridze, Kapanadze, Gelashvili, Maisuradze, Giorgadze, Lomidze, Tsiklauri'),
});
const ARMENIAN = tweak(CAUCASUS, { names: n('Aram, Davit, Narek, Tigran, Armen, Hayk, Gor', 'Ani, Mariam, Anahit, Lilit, Nare, Siranush, Arpi', 'Petrosyan, Harutyunyan, Grigoryan, Sargsyan, Hovhannisyan, Khachatryan, Vardanyan') });
const AZERI = tweak(CAUCASUS, { names: n('Elvin, Rashad, Farid, Kamran, Orkhan, Tural, Ali', 'Leyla, Aysel, Gunel, Nigar, Sevinj, Aynur, Narmin', 'Mammadov, Aliyev, Hasanov, Huseynov, Guliyev, Ismayilov, Abbasov') });

const CENTRAL_ASIA = style({
  kitchen: v('Choyxona, Plov Centre', 'Central Asian kitchen', 'plov lagman samsa buuz non-bread mercimek mashkichiri'),
  snacks: v('Tandoor stall, Bazaar corner', 'Bazaar snacks', 'samsa non-bread fruit bolani'),
  lounge: 'Live folk and pop on a small stage, with green tea.',
  fashion: ['Ikat House', 'Ikat silk, chapans & salon'],
  walls: SAND, park: TEMPERATE, palms: false,
  names: n('Aibek, Timur, Rustam, Azamat, Bekzod, Daniyar, Farrukh', 'Aigerim, Madina, Dilnoza, Aizhan, Gulnara, Zarina, Nilufar', 'Nurlanov, Karimov, Abdullaev, Saparov, Rahimov, Toktogulov, Usmonov'),
});
const MONGOLIAN = tweak(CENTRAL_ASIA, {
  fashion: { name: 'Deel House', kind: 'Deels, cashmere & salon' },
  names: n('Bat-Erdene, Ganbold, Temuujin, Bilguun, Enkhbayar, Batbayar, Tuguldur', 'Oyuunchimeg, Enkhjargal, Sarangerel, Anu, Solongo, Nomin, Altantsetseg', 'Bat, Dorj, Ganbaatar, Erdene, Tseren, Batsaikhan, Purev'),
});
const AFGHAN = tweak(CENTRAL_ASIA, {
  kitchen: v('Kabul Kitchen, Chaikhana', 'Afghan kitchen', 'kabuli-pulao bolani dal-rice non-bread mashkichiri'),
  lounge: { names: ['Chaikhana'], description: 'A tea house with chess and conversation. No music or alcohol.' },
  fashion: { name: 'Tailor', kind: 'Perahan tunban, shawls & barber' },
  names: n('Ahmad, Mohammad, Farid, Rahim, Hamid, Karim, Javid', 'Fatima, Zahra, Maryam, Laila, Shabnam, Parwana, Nadia', 'Ahmadi, Rahimi, Karimi, Hakimi, Sultani, Noori, Amiri'),
});

const TURKISH = style({
  kitchen: v('Lokanta, Ocakbaşı', 'Turkish kitchen', 'adana-kebab mercimek hummus mujaddara gemista baklava'),
  snacks: v('Simit cart, Büfe', 'Simit and snacks', 'simit baklava fruit falafel'),
  lounge: 'Turkish folk and pop on a small stage, open late.',
  fashion: ['Boutique', 'Fashion, leather & salon'],
  walls: SAND, park: MED_PARK, palms: false,
  names: n('Mehmet, Mustafa, Emre, Burak, Can, Ahmet, Kerem', 'Ayşe, Zeynep, Elif, Fatma, Merve, Esra, Defne', 'Yılmaz, Kaya, Demir, Şahin, Çelik, Yıldız, Aydın'),
});
const LEVANT = style({
  kitchen: v('Beit Teta, Al Sufra', 'Levantine kitchen', 'hummus falafel shawarma fattoush mujaddara mansaf manakish'),
  snacks: v('Falafel stand, Furn', 'Falafel and bakery', 'falafel manakish fruit baklava'),
  lounge: 'Oud, tarab and Arabic pop on a small stage, open late.',
  fashion: ['Boutique', 'Fashion, embroidery & salon'],
  walls: SAND, park: DRY_PARK,
  names: n('Karim, Omar, Rami, Ziad, Hadi, Tariq, Khalil', 'Layla, Rana, Nour, Lina, Maya, Dina, Hala', 'Haddad, Khoury, Nasser, Saleh, Hamdan, Darwish, Mansour'),
});
const IRAQI = tweak(LEVANT, {
  kitchen: v('Baghdad Kitchen, Al Sufra', 'Iraqi kitchen', 'masgouf hummus falafel mujaddara shawarma fattoush'),
  loungeText: 'Maqam and Arabic pop on a small stage, with tea.' + DRY,
});
const ISRAELI = tweak(LEVANT, {
  loungeText: 'Mizrahi pop and live jazz on a small stage, open late.',
  names: n('Noam, David, Yonatan, Itai, Amir, Daniel, Ariel', 'Noa, Tamar, Maya, Shira, Yael, Michal, Talia', 'Cohen, Levi, Mizrahi, Peretz, Biton, Friedman, Azoulay'),
});
const PERSIAN = style({
  kitchen: v('Sofreh Khaneh, Chelo Kababi', 'Persian kitchen', 'ghormeh-sabzi kashk-bademjan adas-polo mercimek salad-shirazi'),
  snacks: v('Bakery, Juice bar', 'Bread and snacks', 'barbari salad-shirazi fruit baklava'),
  lounge: 'A tea house with live traditional music.' + DRY,
  lounges: 'Chaykhaneh',
  fashion: ['Boutique', 'Manteaus, scarves & salon'],
  walls: SAND, park: MED_PARK, palms: false,
  names: n('Ali, Reza, Amir, Hossein, Mehdi, Arash, Kian', 'Sara, Maryam, Zahra, Fatemeh, Niloofar, Parisa, Shirin', 'Hosseini, Ahmadi, Mohammadi, Rezaei, Karimi, Moradi, Jafari'),
});
const GULF = style({
  kitchen: v('Al Bait Kitchen, Majlis Kitchen', 'Gulf kitchen', 'kabsa machboos-veg saltah hummus falafel shawarma mujaddara'),
  snacks: v('Gahwa corner, Shawarma stand', 'Coffee and snacks', 'dates-gahwa falafel manakish fruit baklava'),
  lounge: 'Oud and khaleeji music on a small stage, with coffee and mocktails.' + DRY,
  lounges: 'Majlis Lounge, {city} Live',
  fashion: ['Abaya House', 'Abayas, kanduras & salon'],
  walls: SAND, park: DRY_PARK,
  names: n('Abdullah, Mohammed, Faisal, Khalid, Sultan, Saud, Hamad', 'Noura, Sara, Maha, Hessa, Reem, Latifa, Mariam', 'Al-Harbi, Al-Mutairi, Al-Qahtani, Al-Shehri, Al-Mansoori, Al-Kuwari, Al-Balushi'),
});
const YEMENI = tweak(GULF, { names: n('Ahmed, Saleh, Abdulrahman, Ali, Nabil, Fuad, Mohammed', 'Amal, Huda, Arwa, Bushra, Fatima, Samira, Rania', 'Al-Hakimi, Saleh, Nasser, Al-Shami, Ghaleb, Al-Aghbari, Qasem') });

// ---------------------------------------------------------------- South Asia

const INDIAN = style({
  kitchen: v('Annapurna Bhojanalaya, Spice Route', 'Indian kitchen', 'chana-masala dal-rice masala-dosa biryani butter-chicken paneer-tikka vada-pav'),
  snacks: v('Chaat corner, Chai stall', 'Chai and street food', 'vada-pav samosa-veg masala-chai fruit'),
  lounge: 'Bollywood, bhangra and indie bands, open late.',
  fashion: ['Sari House', 'Saris, kurtas & salon'],
  walls: WARM, park: TROPICAL, busRole: 'Bus conductor',
  names: n('Arjun, Rahul, Aditya, Vikram, Rohan, Karan, Amit', 'Priya, Ananya, Pooja, Divya, Kavya, Neha, Aishwarya', 'Sharma, Patel, Singh, Reddy, Iyer, Gupta, Nair'),
});
const PAKISTANI = tweak(INDIAN, {
  kitchen: v('Lahori Kitchen, Karahi House', 'Pakistani kitchen', 'biryani nihari chana-masala dal-rice samosa-veg kabuli-pulao'),
  snacks: v('Chai dhaba, Samosa stand', 'Chai and snacks', 'samosa-veg masala-chai fruit bolani'),
  lounge: { names: ['Qawwali House', '{city} Live'], description: 'Qawwali and Pakistani pop on a small stage, with chai.' + DRY },
  fashion: { name: 'Shalwar House', kind: 'Shalwar kameez & salon' },
  names: n('Ali, Hamza, Usman, Bilal, Faisal, Imran, Saad', 'Ayesha, Fatima, Sana, Hira, Mahnoor, Zainab, Amna', 'Khan, Ahmed, Malik, Butt, Qureshi, Chaudhry, Siddiqui'),
});
const BANGLADESHI = tweak(PAKISTANI, {
  kitchen: v('Bhaat Ghor, Dhaka Kitchen', 'Bangladeshi kitchen', 'shorshe-ilish biryani dal-rice chana-masala samosa-veg'),
  lounge: { names: ['{city} Live'], description: 'Baul songs and Bangla bands, with tea.' + DRY },
  fashion: { name: 'Sari House', kind: 'Saris, panjabis & salon' },
  names: n('Rahim, Karim, Tanvir, Arif, Sabbir, Rafiq, Imran', 'Nusrat, Fatema, Sharmin, Tasnim, Ruma, Shirin, Farhana', 'Rahman, Hossain, Islam, Uddin, Akter, Chowdhury, Ahmed'),
});
const HIMALAYAN = tweak(INDIAN, {
  kitchen: v('Momo House, Thakali Kitchen', 'Himalayan kitchen', 'momo-veg dal-bhat ema-datshi chana-masala biryani'),
  snacks: v('Momo stall, Tea shop', 'Momo and tea', 'momo-veg masala-chai fruit samosa-veg'),
  loungeText: 'Nepali folk and rock on a small stage, open late.',
  fashion: { name: 'Dhaka House', kind: 'Dhaka cloth, kurtas & salon' },
  palms: false,
  names: n('Bikash, Suman, Prakash, Rajesh, Anil, Sanjay, Dipesh', 'Sita, Gita, Sunita, Anjali, Pooja, Srijana, Kabita', 'Shrestha, Gurung, Tamang, Thapa, Rai, Magar, Adhikari'),
});
const BHUTANESE = tweak(HIMALAYAN, {
  fashion: { name: 'Gho House', kind: 'Gho, kira & salon' },
  loungeText: 'Rigsar and folk songs on a small stage, open late.',
  names: n('Tshering, Dorji, Sonam, Karma, Kinley, Pema, Ugyen', 'Pema, Dechen, Tshering, Sonam, Kinley, Yangchen, Chimi', 'Dorji, Tshering, Namgyel, Penjor, Tenzin, Wangmo, Choden'),
});
const SRI_LANKAN = tweak(INDIAN, {
  kitchen: v('Rice and Curry House, Hopper Shop', 'Sri Lankan kitchen', 'hoppers kottu mas-huni dal-rice pol-sambol'),
  snacks: v('Short eats, Tea kade', 'Short eats and tea', 'pol-sambol samosa-veg fruit masala-chai'),
  loungeText: 'Baila and live bands, open late.',
  fashion: { name: 'Batik House', kind: 'Batik, saris & salon' },
  names: n('Kasun, Nuwan, Dinesh, Pradeep, Chaminda, Tharindu, Ishan', 'Dilini, Nadeesha, Sanduni, Kaveesha, Tharushi, Nimali, Ishara', 'Perera, Fernando, Silva, Jayasinghe, Bandara, Wijesinghe, Herath'),
});
const MALDIVIAN = tweak(SRI_LANKAN, {
  lounge: { names: ['{city} Live'], description: 'Bodu beru drumming and island pop, with mocktails.' + DRY },
  fashion: { name: 'Island Boutique', kind: 'Prints, linen & salon' },
  names: n('Ahmed, Mohamed, Ibrahim, Hussain, Ali, Hassan, Moosa', 'Aishath, Fathimath, Mariyam, Hawwa, Aminath, Shifa, Zeena', 'Didi, Manik, Rasheed, Saeed, Waheed, Naseem, Shareef'),
});

// ---------------------------------------------------------------- East Asia

const CHINESE = style({
  kitchen: v('Jiachang Cai, Noodle House', 'Chinese kitchen', 'mapo-tofu-vegan jiaozi scallion-pancake stir-fried-greens beef-noodle-soup char-siu-bao'),
  snacks: v('Bao stall, Night market stall', 'Street snacks', 'vegetable-bao scallion-pancake egg-tart bubble-tea fruit'),
  lounge: 'Mandopop, karaoke rooms and a live band, open late.',
  fashion: ['Qipao House', 'Qipao, streetwear & salon'],
  walls: CONCRETE, park: TEMPERATE, palms: false,
  names: n('Wei, Hao, Jun, Lei, Ming, Jie, Yang', 'Na, Mei, Xin, Yan, Jing, Fang, Yu', 'Wang, Li, Zhang, Liu, Chen, Yang, Zhao'),
});
const CANTONESE = tweak(CHINESE, {
  loungeText: 'Cantopop, karaoke rooms and a live band, open late.',
  palms: undefined,
  names: n('Ka-ho, Chun-wai, Wing-hong, Ho-yin, Tsz-kin, Man-lok, Pak-hei', 'Wing-yan, Ka-yan, Hoi-ching, Mei-ling, Sze-wing, Yan-ting, Pui-yee', 'Chan, Wong, Lee, Cheung, Lau, Ho, Leung'),
});
const TAIWANESE = tweak(CHINESE, {
  loungeText: 'Mandopop and indie bands, open late.',
  palms: undefined,
  names: n('Chih-hao, Jia-hao, Cheng-en, Yu-hsiang, Wei-ting, Chun-hung, Kuan-yu', 'Yu-ting, Shu-fen, Hsin-yi, Ya-ting, Pei-shan, Yi-chen, Hui-ling', 'Chen, Lin, Huang, Chang, Lee, Wang, Wu'),
});
const JAPANESE = style({
  kitchen: v('Shokudō, Curry House', 'Japanese kitchen', 'ramen onigiri-ume inari-sushi yasai-curry edamame'),
  snacks: v('Konbini, Onigiri stand', 'Convenience store', 'onigiri-ume edamame fruit inari-sushi'),
  lounge: 'City pop, jazz and karaoke, open late.',
  fashion: ['Kimono & Streetwear', 'Kimono, streetwear & salon'],
  walls: CONCRETE, park: TEMPERATE, palms: false,
  names: n('Haruto, Ren, Sota, Yuto, Kenji, Takumi, Daiki', 'Yui, Hina, Sakura, Aoi, Yuna, Mei, Rin', 'Sato, Suzuki, Takahashi, Tanaka, Watanabe, Ito, Yamamoto'),
});
const KOREAN = style({
  kitchen: v('Bunsikjip, Hansik Kitchen', 'Korean kitchen', 'bibimbap japchae tteokbokki dubu-jorim kongguksu naengmyeon'),
  snacks: v('Pojangmacha, Street cart', 'Street food', 'hotteok tteokbokki goguma fruit'),
  lounge: 'K-pop, indie bands and karaoke rooms, open late.',
  fashion: ['Hanbok & Streetwear', 'Hanbok, streetwear & salon'],
  walls: CONCRETE, park: TEMPERATE, palms: false,
  names: n('Min-jun, Seo-jun, Ji-ho, Do-yoon, Hyun-woo, Joon-young, Sung-min', 'Seo-yeon, Ji-woo, Ha-eun, Min-seo, Soo-ah, Ye-jin, Ji-min', 'Kim, Lee, Park, Choi, Jung, Kang, Cho'),
});
const NORTH_KOREAN = tweak(KOREAN, {
  loungeText: 'Live orchestral pop and karaoke.',
  fashion: { name: 'Tailor', kind: 'Chosŏn-ot, suits & salon' },
  names: n('Chol-min, Myong-il, Song-ho, Kwang-chol, Jin-hyok, Yong-nam, Hyok-chol', 'Kum-hui, Un-jong, Ok-sun, Hye-gyong, Song-mi, Myong-hui, Chun-hwa', 'Kim, Ri, Pak, Choe, Jong, Kang, Han'),
});

// ---------------------------------------------------------------- Southeast Asia

const MAINLAND_SEA = style({
  kitchen: v('Raan Ahaan, Khao Gaeng', 'Thai and Lao kitchen', 'green-curry-veg pad-thai tom-yum laap amok lahpet mango-sticky-rice'),
  snacks: v('Street cart, Night market stall', 'Street food', 'mango-sticky-rice fruit goi-cuon-chay moo-ping'),
  lounge: 'Luk thung, mor lam and live bands, open late.',
  fashion: ['Silk House', 'Silk, sarongs & salon'],
  walls: PASTEL, park: TROPICAL, busRole: 'Bus conductor',
  names: n('Somchai, Anan, Kittisak, Nattapong, Somsak, Wichai, Arthit', 'Siriporn, Nattaya, Kanokwan, Pimchanok, Malee, Ploy, Achara', 'Saetang, Wongsakul, Srisuk, Chaiyaporn, Rattanakul, Boonmee, Thongchai'),
});
const LAO = tweak(MAINLAND_SEA, { names: n('Khamphone, Souksavanh, Bounmy, Phonesavanh, Somphone, Vilay, Khamla', 'Keo, Noy, Phonevilay, Souphaphone, Malaythong, Viengkham, Dalaphone', 'Phommachanh, Sengsouvanh, Vongsa, Keomany, Inthavong, Sisouk, Chanthavong') });
const KHMER = tweak(MAINLAND_SEA, {
  loungeText: 'Khmer pop and live bands, open late.',
  names: n('Sokha, Dara, Vuthy, Sophal, Rithy, Visal, Piseth', 'Sreymom, Chenda, Sophea, Bopha, Channary, Leakhena, Sokunthea', 'Sok, Chea, Kim, Heng, Chan, Phan, Meas'),
});
const BURMESE = tweak(MAINLAND_SEA, {
  kitchen: v('Tea shop, Shan Kitchen', 'Burmese kitchen', 'mohinga lahpet green-curry-veg goi-cuon-chay laap'),
  loungeText: 'Burmese pop and live bands, open late.',
  fashion: { name: 'Longyi House', kind: 'Longyis & salon' },
  names: n('Aung, Min, Kyaw, Zaw, Htet, Thura, Ko', 'Thida, Su, Nandar, Hnin, May, Ei, Phyu', 'Win, Oo, Naing, Lwin, Htun, Myint, Aye'),
});
const VIETNAMESE = tweak(MAINLAND_SEA, {
  kitchen: v('Quán Cơm, Phở Corner', 'Vietnamese kitchen', 'pho-bo banh-mi-chay com-chay goi-cuon-chay'),
  snacks: v('Bánh mì cart, Street stall', 'Street food', 'banh-mi-chay goi-cuon-chay fruit moo-ping'),
  loungeText: 'V-pop and acoustic sets, open late.',
  fashion: { name: 'Áo Dài House', kind: 'Áo dài & salon' },
  names: n('Minh, Huy, Tuấn, Đức, Nam, Khoa, Long', 'Linh, Hương, Mai, Trang, Ngọc, Thảo, Anh', 'Nguyễn, Trần, Lê, Phạm, Hoàng, Võ, Đặng'),
});
const MALAY = style({
  kitchen: v('Kedai Makan, Warung', 'Malay and Indonesian kitchen', 'nasi-lemak roti-canai-dhal laksa chicken-rice nasi-goreng gado-gado tempeh-goreng'),
  snacks: v('Satay stall, Hawker stall', 'Hawker snacks', 'roti-canai-dhal tempeh-goreng fruit satay'),
  lounge: 'Dangdut, Malay pop and live bands, open late.',
  fashion: ['Batik House', 'Batik, baju kurung & salon'],
  walls: PASTEL, park: TROPICAL, busRole: 'Bus conductor',
  names: n('Ahmad, Muhammad, Hafiz, Arif, Wei Jie, Kumar, Rizal', 'Nur, Aisyah, Siti, Farah, Mei Ling, Priya, Hui Min', 'Abdullah, Tan, Lim, Rahman, Ismail, Lee, Raj'),
});
const INDONESIAN = tweak(MALAY, { names: n('Budi, Agus, Dimas, Rizky, Andi, Fajar, Yusuf', 'Siti, Dewi, Putri, Ayu, Rina, Sri, Indah', 'Santoso, Wijaya, Saputra, Hidayat, Kurniawan, Pratama, Setiawan') });
const BRUNEIAN = tweak(MALAY, { lounge: { names: ['{city} Live'], description: 'Malay pop on a small stage, with teh tarik.' + DRY } });
const FILIPINO = style({
  kitchen: v('Carinderia, Lutong Bahay', 'Filipino kitchen', 'adobo pancit ginataang-gulay monggo turon'),
  snacks: v('Sari-sari store, Taho vendor', 'Street snacks', 'turon taho fruit banh-mi-chay'),
  lounge: 'Live OPM bands and karaoke, open late.',
  fashion: ['Barong House', 'Barong tagalog, prints & salon'],
  walls: PASTEL, park: TROPICAL, busRole: 'Jeepney barker',
  names: n('Jose, Mark, Juan, Paolo, Miguel, Carlo, Jericho', 'Maria, Angelica, Kristine, Joy, Jasmine, Patricia, Camille', 'Santos, Reyes, Cruz, Bautista, Garcia, Mendoza, Ramos'),
});
const TIMORESE = tweak(MALAY, {
  loungeText: 'Live bands and Tetum pop, open late.',
  fashion: { name: 'Tais House', kind: 'Tais weaving & salon' },
  names: n('João, José, Mateus, Francisco, Domingos, Agostinho, Luís', 'Maria, Ana, Joana, Rosa, Teresa, Isabel, Ermelinda', 'da Costa, Soares, Ximenes, Guterres, Pereira, dos Santos, Belo'),
});

// ---------------------------------------------------------------- Oceania

const ANTIPODEAN = style({
  kitchen: v('Corner Café, Milk Bar', 'Café kitchen', 'meat-pie avocado-toast fish-and-chips veggie-burger pumpkin-soup hangi'),
  snacks: v('Bakery, Kiosk', 'Bakery and snacks', 'avocado-toast meat-pie fruit bagel pavlova'),
  lounge: 'Indie bands and pub rock, open late.',
  fashion: ['Surf & Street', 'Surfwear, streetwear & salon'],
  walls: STONE, park: TEMPERATE, palms: false,
  names: n('Jack, Oliver, Liam, Noah, Tama, Ethan, Lachlan', 'Charlotte, Olivia, Mia, Isla, Aroha, Ruby, Chloe', 'Smith, Williams, Brown, Wilson, Taylor, Ngata, Nguyen'),
});
const PACIFIC = style({
  kitchen: v('Island Kitchen, Mama’s Kai', 'Island kitchen', 'kokoda palusami lu-sipi taro-coconut breadfruit'),
  snacks: v('Market stall, Roadside stall', 'Market snacks', 'breadfruit fruit taro-coconut kokoda'),
  lounge: 'Island reggae and string bands, open late.',
  fashion: ['Island Wear', 'Sulu, prints & salon'],
  walls: PASTEL, park: TROPICAL,
  names: n('Sione, Tevita, Viliami, Semisi, Josefa, Iosefa, Tomasi', 'Mele, Losana, Ana, Litia, Salote, Seini, Ofa', 'Tuilagi, Fifita, Vunipola, Taufa, Leota, Tuivasa, Koroi'),
});
const MELANESIAN = tweak(PACIFIC, { names: n('Kila, Tau, Peter, John, Moses, Joseph, Kevin', 'Mary, Grace, Esther, Ruth, Lucy, Agnes, Rose', 'Morea, Kaupa, Wari, Iamo, Oa, Tau, Kila') });

// ---------------------------------------------------------------- The Americas

const NORTH_AMERICAN = style({
  kitchen: v('Diner, Soul Kitchen', 'Diner', 'burger veggie-burger mac-cheese bbq-brisket red-beans-rice bagel'),
  snacks: v('Food truck, Deli', 'Food truck', 'bagel fruit pretzel maple-pancakes'),
  lounge: 'Jazz, hip-hop and R&B, open late.',
  fashion: ['Streetwear', 'Streetwear, denim & salon'],
  walls: STONE, park: TEMPERATE, palms: false,
  names: n('James, Michael, DeShawn, Carlos, Ethan, Tyler, Marcus', 'Emily, Jasmine, Madison, Aaliyah, Sofia, Ashley, Keisha', 'Johnson, Williams, Brown, Garcia, Jackson, Davis, Washington'),
});
const CANADIAN = tweak(NORTH_AMERICAN, {
  kitchen: v('Diner, Casse-croûte', 'Diner', 'poutine veggie-burger maple-pancakes red-beans-rice bagel lentil-stew'),
  loungeText: 'Indie, jazz and hip-hop, open late.',
  names: n('Liam, Noah, Étienne, Mathieu, Ethan, Lucas, Jayden', 'Olivia, Emma, Chloé, Charlotte, Amelia, Léa, Ava', 'Tremblay, Smith, Roy, Gagnon, Brown, Wilson, Martin'),
});
const MESOAMERICAN = style({
  kitchen: v('Fonda, Comedor', 'Fonda', 'tacos-al-pastor frijoles-tortillas guacamole pupusas gallo-pinto tamales sancocho'),
  snacks: v('Taquería, Puesto', 'Street food', 'guacamole elote fruit frijoles-tortillas'),
  lounge: 'Cumbia, marimba and live bands, open late.',
  fashion: ['Huipil House', 'Huipiles, guayaberas & salon'],
  walls: WARM, park: TROPICAL, busRole: 'Bus conductor',
  names: n('José, Luis, Juan, Carlos, Miguel, Jorge, Alejandro', 'María, Guadalupe, Ana, Sofía, Fernanda, Daniela, Valeria', 'Hernández, García, Martínez, López, González, Pérez, Rodríguez'),
});
const MEXICAN = tweak(MESOAMERICAN, { loungeText: 'Mariachi, cumbia and son jarocho, open late.' });
const CARIBBEAN = style({
  kitchen: v('Cookshop, Mama’s Kitchen', 'Caribbean kitchen', 'jerk-chicken rice-and-peas ackee-saltfish doubles roti-channa conch-fritters cou-cou'),
  snacks: v('Doubles stand, Roadside stall', 'Street food', 'doubles fruit plantain-chips conch-fritters'),
  lounge: 'Reggae, dancehall and soca, open late.',
  fashion: ['Island Wear', 'Prints, linen & salon'],
  walls: PASTEL, park: TROPICAL, busRole: 'Bus conductor',
  names: n('Andre, Kemar, Shane, Marlon, Rohan, Dwayne, Jerome', 'Shanice, Tamara, Kimberly, Simone, Keisha, Nadia, Renee', 'Brown, Campbell, Williams, Thompson, Clarke, Joseph, Charles'),
});
const GUIANAS = tweak(CARIBBEAN, {
  kitchen: v('Cookshop, Roti Shop', 'Guyanese kitchen', 'pepperpot roti-channa rice-and-peas doubles dal-rice'),
  names: n('Ravi, Andre, Shamir, Kevin, Devon, Mark, Rishi', 'Shivani, Natasha, Kerry-Ann, Anjali, Simone, Melissa, Ria', 'Singh, Persaud, Williams, Ramdin, Khan, Ramsaroop, Kartosen'),
});
const HISPANIC_CARIBBEAN = style({
  kitchen: v('Paladar, Fonda Criolla', 'Creole kitchen', 'congri mangu griot mofongo rice-and-peas sancocho'),
  snacks: v('Fritura, Kiosk', 'Fried snacks', 'tostones fruit plantain-chips'),
  lounge: 'Salsa, son and merengue, open late.',
  fashion: ['Guayabera House', 'Guayaberas, linen & salon'],
  walls: PASTEL, park: TROPICAL, busRole: 'Bus conductor',
  names: n('Yoel, Luis, Raúl, Ángel, Yasiel, Rafael, Manuel', 'Yanet, Mariela, Yamilé, Rosa, Ana, Daniela, Yaritza', 'Rodríguez, Pérez, Díaz, Rivera, Santos, Martínez, Torres'),
});
const HAITIAN = tweak(HISPANIC_CARIBBEAN, {
  loungeText: 'Kompa and rara, open late.',
  names: n('Jean, Pierre, Wilson, Jacques, Stanley, Ricardo, Emmanuel', 'Marie, Rose, Nadège, Fabienne, Guerline, Wideline, Sandra', 'Joseph, Jean-Baptiste, Pierre, Louis, Charles, Desir, Augustin'),
});
const SOUTH_AMERICAN = style({
  kitchen: v('Picantería, El Rincón', 'South American kitchen', 'arepa bandeja-paisa ceviche lomo-saltado quinoa-soup empanada asado porotos-granados'),
  snacks: v('Empanadas stand, Kiosco', 'Street food', 'arepa empanada fruit tostones chipa'),
  lounge: 'Salsa, cumbia and tango, open late.',
  fashion: ['Boutique', 'Fashion, alpaca & salon'],
  walls: WARM, park: TROPICAL, busRole: 'Bus conductor',
  names: n('Santiago, Mateo, Sebastián, Diego, Juan, Andrés, Nicolás', 'Valentina, Camila, Isabella, Sofía, Lucía, Daniela, Martina', 'González, Rodríguez, Gómez, Fernández, López, Díaz, Torres'),
});
const BRAZILIAN = style({
  kitchen: v('Boteco, Comida Caseira', 'Brazilian kitchen', 'feijoada feijao-arroz moqueca acai-bowl tapioca-crepe'),
  snacks: v('Padaria, Barraca', 'Bakery and snacks', 'pao-de-queijo acai-bowl tapioca-crepe fruit'),
  lounge: 'Samba, forró and funk carioca, open late.',
  fashion: ['Moda', 'Beachwear, fashion & salon'],
  walls: PASTEL, park: TROPICAL, busRole: 'Bus conductor',
  names: n('João Pedro, Lucas, Gabriel, Rafael, Mateus, Thiago, Felipe', 'Ana Júlia, Beatriz, Larissa, Camila, Fernanda, Mariana, Juliana', 'Silva, Santos, Oliveira, Souza, Pereira, Lima, Costa'),
});

// ---------------------------------------------------------------- the capitals

interface Opts { area?: string; landmass?: string; driveLeft?: boolean }
const c = (
  country: string, id: string, name: string, region: string, lat: number, lon: number,
  timeZone: string, currency: string, s: RegionStyle, cost: number, o: Opts = {},
): CitySeed => ({ id, name, region, country, timeZone, currency, lat, lon, style: s, cost, landmass: o.landmass ?? 'eurasia', ...(o.area ? { area: o.area } : {}), ...(o.driveLeft ? { driveLeft: true } : {}) });
const L = { driveLeft: true };
const isle = (landmass: string, more: Opts = {}): Opts => ({ landmass, ...more });
const NA = (more: Opts = {}): Opts => ({ landmass: 'north-america', ...more });
const SA = (more: Opts = {}): Opts => ({ landmass: 'south-america', ...more });

export const WORLD: readonly CitySeed[] = [
  // Britain and Ireland
  c('GB', 'london', 'London', 'England', 51.51, -0.13, 'Europe/London', 'GBP', BRITISH, 2.0, isle('great-britain', { area: 'Brixton', driveLeft: true })),
  c('IE', 'dublin', 'Dublin', 'Leinster', 53.35, -6.26, 'Europe/Dublin', 'EUR', IRISH, 1.8, isle('ireland', L)),
  // The Nordics and the Baltics
  c('IS', 'reykjavik', 'Reykjavík', 'Capital Region', 64.15, -21.94, 'Atlantic/Reykjavik', 'ISK', ICELANDIC, 2.0, isle('iceland')),
  c('NO', 'oslo', 'Oslo', 'Oslo', 59.91, 10.75, 'Europe/Oslo', 'NOK', NORDIC, 2.0, { area: 'Grønland' }),
  c('SE', 'stockholm', 'Stockholm', 'Stockholm', 59.33, 18.07, 'Europe/Stockholm', 'SEK', NORDIC, 1.8, { area: 'Södermalm' }),
  c('DK', 'copenhagen', 'Copenhagen', 'Capital Region', 55.68, 12.57, 'Europe/Copenhagen', 'DKK', NORDIC, 1.9, { area: 'Nørrebro' }),
  c('FI', 'helsinki', 'Helsinki', 'Uusimaa', 60.17, 24.94, 'Europe/Helsinki', 'EUR', FINNISH, 1.6, { area: 'Kallio' }),
  c('EE', 'tallinn', 'Tallinn', 'Harju', 59.44, 24.75, 'Europe/Tallinn', 'EUR', BALTIC, 1.2, { area: 'Kalamaja' }),
  c('LV', 'riga', 'Riga', 'Riga', 56.95, 24.11, 'Europe/Riga', 'EUR', BALTIC, 1.0),
  c('LT', 'vilnius', 'Vilnius', 'Vilnius', 54.69, 25.28, 'Europe/Vilnius', 'EUR', BALTIC, 1.0, { area: 'Užupis' }),
  // Western and Central Europe
  c('DE', 'berlin', 'Berlin', 'Berlin', 52.52, 13.4, 'Europe/Berlin', 'EUR', CENTRAL_EU, 1.6, { area: 'Kreuzberg' }),
  c('NL', 'amsterdam', 'Amsterdam', 'North Holland', 52.37, 4.9, 'Europe/Amsterdam', 'EUR', CENTRAL_EU, 1.8, { area: 'De Pijp' }),
  c('BE', 'brussels', 'Brussels', 'Brussels-Capital', 50.85, 4.35, 'Europe/Brussels', 'EUR', CENTRAL_EU, 1.6, { area: 'Matongé' }),
  c('LU', 'luxembourg', 'Luxembourg', 'Luxembourg', 49.61, 6.13, 'Europe/Luxembourg', 'EUR', CENTRAL_EU, 2.0),
  c('CH', 'bern', 'Bern', 'Bern', 46.95, 7.45, 'Europe/Zurich', 'CHF', CENTRAL_EU, 2.2, { area: 'Altstadt' }),
  c('LI', 'vaduz', 'Vaduz', 'Oberland', 47.14, 9.52, 'Europe/Vaduz', 'CHF', CENTRAL_EU, 2.0),
  c('AT', 'vienna', 'Vienna', 'Vienna', 48.21, 16.37, 'Europe/Vienna', 'EUR', CENTRAL_EU, 1.6, { area: 'Neubau' }),
  c('PL', 'warsaw', 'Warsaw', 'Masovia', 52.23, 21.01, 'Europe/Warsaw', 'PLN', CENTRAL_SLAVIC, 1.1, { area: 'Śródmieście' }),
  c('CZ', 'prague', 'Prague', 'Prague', 50.08, 14.44, 'Europe/Prague', 'CZK', CENTRAL_SLAVIC, 1.2, { area: 'Staré Město' }),
  c('SK', 'bratislava', 'Bratislava', 'Bratislava', 48.15, 17.11, 'Europe/Bratislava', 'EUR', CENTRAL_SLAVIC, 1.0, { area: 'Staré Mesto' }),
  c('HU', 'budapest', 'Budapest', 'Budapest', 47.5, 19.04, 'Europe/Budapest', 'HUF', CENTRAL_SLAVIC, 1.0, { area: 'Erzsébetváros' }),
  c('SI', 'ljubljana', 'Ljubljana', 'Central Slovenia', 46.06, 14.51, 'Europe/Ljubljana', 'EUR', CENTRAL_SLAVIC, 1.2),
  c('FR', 'paris', 'Paris', 'Île-de-France', 48.86, 2.35, 'Europe/Paris', 'EUR', cold(FRENCH), 1.8, { area: 'Château Rouge' }),
  c('MC', 'monaco', 'Monaco', 'Monaco', 43.74, 7.42, 'Europe/Monaco', 'EUR', FRENCH, 3.0, { area: 'Monte-Carlo' }),
  c('AD', 'andorra-la-vella', 'Andorra la Vella', 'Andorra la Vella', 42.51, 1.52, 'Europe/Andorra', 'EUR', cold(SPANISH), 1.4),
  // Southern Europe
  c('ES', 'madrid', 'Madrid', 'Community of Madrid', 40.42, -3.7, 'Europe/Madrid', 'EUR', SPANISH, 1.4, { area: 'Lavapiés' }),
  c('PT', 'lisbon', 'Lisbon', 'Lisbon', 38.72, -9.14, 'Europe/Lisbon', 'EUR', PORTUGUESE, 1.3, { area: 'Mouraria' }),
  c('IT', 'rome', 'Rome', 'Lazio', 41.9, 12.5, 'Europe/Rome', 'EUR', MEDITERRANEAN, 1.5, { area: 'Trastevere' }),
  c('SM', 'san-marino', 'San Marino', 'San Marino', 43.94, 12.45, 'Europe/San_Marino', 'EUR', cold(MEDITERRANEAN), 1.3),
  c('MT', 'valletta', 'Valletta', 'Valletta', 35.9, 14.51, 'Europe/Malta', 'EUR', MALTESE, 1.3, isle('malta', L)),
  c('GR', 'athens', 'Athens', 'Attica', 37.98, 23.73, 'Europe/Athens', 'EUR', GREEK, 1.2, { area: 'Exarchia' }),
  c('CY', 'nicosia', 'Nicosia', 'Nicosia', 35.17, 33.36, 'Asia/Nicosia', 'EUR', GREEK, 1.2, isle('cyprus', L)),
  // The Balkans
  c('HR', 'zagreb', 'Zagreb', 'City of Zagreb', 45.81, 15.98, 'Europe/Zagreb', 'EUR', BALKAN, 1.0, { area: 'Donji grad' }),
  c('BA', 'sarajevo', 'Sarajevo', 'Sarajevo Canton', 43.86, 18.41, 'Europe/Sarajevo', 'BAM', BALKAN, 0.7, { area: 'Baščaršija' }),
  c('RS', 'belgrade', 'Belgrade', 'Belgrade', 44.79, 20.45, 'Europe/Belgrade', 'RSD', BALKAN, 0.8, { area: 'Dorćol' }),
  c('ME', 'podgorica', 'Podgorica', 'Podgorica', 42.44, 19.26, 'Europe/Podgorica', 'EUR', BALKAN, 0.8),
  c('MK', 'skopje', 'Skopje', 'Skopje', 42.0, 21.43, 'Europe/Skopje', 'MKD', BALKAN, 0.6, { area: 'Old Bazaar' }),
  c('AL', 'tirana', 'Tirana', 'Tirana', 41.33, 19.82, 'Europe/Tirane', 'ALL', ALBANIAN, 0.7, { area: 'Blloku' }),
  c('XK', 'pristina', 'Pristina', 'Pristina', 42.66, 21.17, 'Europe/Belgrade', 'EUR', ALBANIAN, 0.6),
  c('RO', 'bucharest', 'Bucharest', 'Bucharest', 44.43, 26.1, 'Europe/Bucharest', 'RON', ROMANIAN, 0.9, { area: 'Lipscani' }),
  c('MD', 'chisinau', 'Chișinău', 'Chișinău', 47.01, 28.86, 'Europe/Chisinau', 'MDL', ROMANIAN, 0.6),
  c('BG', 'sofia', 'Sofia', 'Sofia City', 42.7, 23.32, 'Europe/Sofia', 'EUR', BULGARIAN, 0.8),
  // Eastern Europe
  c('UA', 'kyiv', 'Kyiv', 'Kyiv', 50.45, 30.52, 'Europe/Kyiv', 'UAH', UKRAINIAN, 0.8, { area: 'Podil' }),
  c('BY', 'minsk', 'Minsk', 'Minsk', 53.9, 27.57, 'Europe/Minsk', 'BYN', EASTERN, 0.7),
  c('RU', 'moscow', 'Moscow', 'Moscow', 55.76, 37.62, 'Europe/Moscow', 'RUB', EASTERN, 1.3, { area: 'Arbat' }),
  // The Caucasus and Central Asia
  c('GE', 'tbilisi', 'Tbilisi', 'Tbilisi', 41.72, 44.79, 'Asia/Tbilisi', 'GEL', CAUCASUS, 0.7, { area: 'Old Tbilisi' }),
  c('AM', 'yerevan', 'Yerevan', 'Yerevan', 40.18, 44.51, 'Asia/Yerevan', 'AMD', ARMENIAN, 0.7, { area: 'Kentron' }),
  c('AZ', 'baku', 'Baku', 'Baku', 40.41, 49.87, 'Asia/Baku', 'AZN', AZERI, 0.8, { area: 'Icherisheher' }),
  c('KZ', 'astana', 'Astana', 'Astana', 51.17, 71.45, 'Asia/Almaty', 'KZT', CENTRAL_ASIA, 0.9),
  c('UZ', 'tashkent', 'Tashkent', 'Tashkent', 41.3, 69.24, 'Asia/Tashkent', 'UZS', CENTRAL_ASIA, 0.6, { area: 'Chorsu' }),
  c('TM', 'ashgabat', 'Ashgabat', 'Ashgabat', 37.96, 58.33, 'Asia/Ashgabat', 'TMT', CENTRAL_ASIA, 0.7),
  c('TJ', 'dushanbe', 'Dushanbe', 'Dushanbe', 38.56, 68.79, 'Asia/Dushanbe', 'TJS', CENTRAL_ASIA, 0.5),
  c('KG', 'bishkek', 'Bishkek', 'Bishkek', 42.87, 74.59, 'Asia/Bishkek', 'KGS', CENTRAL_ASIA, 0.5),
  c('MN', 'ulaanbaatar', 'Ulaanbaatar', 'Ulaanbaatar', 47.89, 106.91, 'Asia/Ulaanbaatar', 'MNT', MONGOLIAN, 0.6),
  c('AF', 'kabul', 'Kabul', 'Kabul', 34.53, 69.17, 'Asia/Kabul', 'AFN', AFGHAN, 0.4),
  // Turkey and the Middle East
  c('TR', 'ankara', 'Ankara', 'Ankara', 39.93, 32.86, 'Europe/Istanbul', 'TRY', TURKISH, 0.9, { area: 'Kızılay' }),
  c('SY', 'damascus', 'Damascus', 'Damascus', 33.51, 36.29, 'Asia/Damascus', 'SYP', LEVANT, 0.5, { area: 'Old City' }),
  c('LB', 'beirut', 'Beirut', 'Beirut', 33.89, 35.5, 'Asia/Beirut', 'LBP', LEVANT, 1.0, { area: 'Mar Mikhael' }),
  c('JO', 'amman', 'Amman', 'Amman', 31.95, 35.93, 'Asia/Amman', 'JOD', LEVANT, 1.0, { area: 'Jabal al-Weibdeh' }),
  // Disputed capital: the main city is used
  c('IL', 'tel-aviv', 'Tel Aviv', 'Tel Aviv', 32.09, 34.78, 'Asia/Jerusalem', 'ILS', ISRAELI, 1.8),
  // The seat of the Palestinian government
  c('PS', 'ramallah', 'Ramallah', 'West Bank', 31.9, 35.2, 'Asia/Hebron', 'ILS', LEVANT, 0.6),
  c('IQ', 'baghdad', 'Baghdad', 'Baghdad', 33.31, 44.37, 'Asia/Baghdad', 'IQD', IRAQI, 0.7, { area: 'Karrada' }),
  c('IR', 'tehran', 'Tehran', 'Tehran', 35.69, 51.39, 'Asia/Tehran', 'IRR', PERSIAN, 0.7),
  c('SA', 'riyadh', 'Riyadh', 'Riyadh', 24.71, 46.68, 'Asia/Riyadh', 'SAR', GULF, 1.6, { area: 'Olaya' }),
  c('KW', 'kuwait-city', 'Kuwait City', 'Al Asimah', 29.38, 47.99, 'Asia/Kuwait', 'KWD', GULF, 1.6),
  c('BH', 'manama', 'Manama', 'Capital', 26.23, 50.59, 'Asia/Bahrain', 'BHD', GULF, 1.5),
  c('QA', 'doha', 'Doha', 'Doha', 25.29, 51.53, 'Asia/Qatar', 'QAR', GULF, 1.8),
  c('AE', 'abu-dhabi', 'Abu Dhabi', 'Abu Dhabi', 24.45, 54.38, 'Asia/Dubai', 'AED', GULF, 1.9),
  c('OM', 'muscat', 'Muscat', 'Muscat', 23.59, 58.41, 'Asia/Muscat', 'OMR', GULF, 1.2),
  c('YE', 'sanaa', "Sana'a", "Amanat al-Asimah", 15.37, 44.19, 'Asia/Aden', 'YER', YEMENI, 0.4),
  // South Asia
  c('IN', 'new-delhi', 'New Delhi', 'Delhi', 28.61, 77.21, 'Asia/Kolkata', 'INR', INDIAN, 0.6, { area: 'Connaught Place', driveLeft: true }),
  c('PK', 'islamabad', 'Islamabad', 'Islamabad Capital Territory', 33.68, 73.05, 'Asia/Karachi', 'PKR', PAKISTANI, 0.5, L),
  c('BD', 'dhaka', 'Dhaka', 'Dhaka', 23.81, 90.41, 'Asia/Dhaka', 'BDT', BANGLADESHI, 0.5, L),
  c('NP', 'kathmandu', 'Kathmandu', 'Bagmati', 27.72, 85.32, 'Asia/Kathmandu', 'NPR', HIMALAYAN, 0.5, { area: 'Thamel', driveLeft: true }),
  c('BT', 'thimphu', 'Thimphu', 'Thimphu', 27.47, 89.64, 'Asia/Thimphu', 'BTN', BHUTANESE, 0.6, L),
  c('LK', 'colombo', 'Colombo', 'Western', 6.93, 79.85, 'Asia/Colombo', 'LKR', SRI_LANKAN, 0.6, isle('sri-lanka', { area: 'Pettah', driveLeft: true })),
  c('MV', 'male', 'Malé', 'Kaafu', 4.18, 73.51, 'Indian/Maldives', 'MVR', MALDIVIAN, 1.2, isle('male', L)),
  // East Asia
  c('CN', 'beijing', 'Beijing', 'Beijing', 39.9, 116.4, 'Asia/Shanghai', 'CNY', CHINESE, 1.1, { area: 'Wangfujing' }),
  c('HK', 'hong-kong', 'Hong Kong', 'Kowloon', 22.32, 114.17, 'Asia/Hong_Kong', 'HKD', CANTONESE, 2.0, { area: 'Mong Kok', driveLeft: true }),
  c('MO', 'macau', 'Macau', 'Macau Peninsula', 22.2, 113.54, 'Asia/Macau', 'MOP', CANTONESE, 1.5, L),
  c('TW', 'taipei', 'Taipei', 'Taipei', 25.03, 121.56, 'Asia/Taipei', 'TWD', TAIWANESE, 1.2, isle('taiwan', { area: 'Ximending' })),
  c('JP', 'tokyo', 'Tokyo', 'Tokyo', 35.68, 139.69, 'Asia/Tokyo', 'JPY', JAPANESE, 1.7, isle('honshu', { area: 'Shibuya', driveLeft: true })),
  // No road crosses the border between the two Koreas
  c('KR', 'seoul', 'Seoul', 'Seoul', 37.57, 126.98, 'Asia/Seoul', 'KRW', KOREAN, 1.5, isle('south-korea', { area: 'Myeong-dong' })),
  c('KP', 'pyongyang', 'Pyongyang', 'Pyongyang', 39.04, 125.76, 'Asia/Pyongyang', 'KPW', NORTH_KOREAN, 0.5),
  // Southeast Asia
  c('TH', 'bangkok', 'Bangkok', 'Bangkok', 13.76, 100.5, 'Asia/Bangkok', 'THB', MAINLAND_SEA, 0.9, { area: 'Silom', driveLeft: true }),
  c('LA', 'vientiane', 'Vientiane', 'Vientiane Prefecture', 17.97, 102.63, 'Asia/Vientiane', 'LAK', LAO, 0.5),
  c('KH', 'phnom-penh', 'Phnom Penh', 'Phnom Penh', 11.56, 104.92, 'Asia/Phnom_Penh', 'KHR', KHMER, 0.6),
  c('MM', 'naypyidaw', 'Naypyidaw', 'Naypyidaw Union Territory', 19.76, 96.08, 'Asia/Yangon', 'MMK', BURMESE, 0.4),
  c('VN', 'hanoi', 'Hanoi', 'Hanoi', 21.03, 105.85, 'Asia/Ho_Chi_Minh', 'VND', VIETNAMESE, 0.6, { area: 'Old Quarter' }),
  c('MY', 'kuala-lumpur', 'Kuala Lumpur', 'Federal Territory', 3.14, 101.69, 'Asia/Kuala_Lumpur', 'MYR', MALAY, 0.9, { area: 'Bukit Bintang', driveLeft: true }),
  c('SG', 'singapore', 'Singapore', 'Central Region', 1.29, 103.85, 'Asia/Singapore', 'SGD', MALAY, 2.0, { area: 'Little India', driveLeft: true }),
  c('BN', 'bandar-seri-begawan', 'Bandar Seri Begawan', 'Brunei-Muara', 4.94, 114.95, 'Asia/Brunei', 'BND', BRUNEIAN, 1.2, isle('borneo', L)),
  c('ID', 'jakarta', 'Jakarta', 'Jakarta', -6.21, 106.85, 'Asia/Jakarta', 'IDR', INDONESIAN, 0.7, isle('java', { area: 'Menteng', driveLeft: true })),
  c('PH', 'manila', 'Manila', 'Metro Manila', 14.6, 120.98, 'Asia/Manila', 'PHP', FILIPINO, 0.7, isle('luzon', { area: 'Ermita' })),
  c('TL', 'dili', 'Dili', 'Dili', -8.56, 125.57, 'Asia/Dili', 'USD', TIMORESE, 0.5, isle('timor', L)),
  // Oceania
  c('AU', 'canberra', 'Canberra', 'Australian Capital Territory', -35.28, 149.13, 'Australia/Sydney', 'AUD', ANTIPODEAN, 1.8, isle('australia', { area: 'Civic', driveLeft: true })),
  c('NZ', 'wellington', 'Wellington', 'Wellington', -41.29, 174.78, 'Pacific/Auckland', 'NZD', ANTIPODEAN, 1.7, isle('north-island', { area: 'Cuba Street', driveLeft: true })),
  c('FJ', 'suva', 'Suva', 'Central', -18.14, 178.44, 'Pacific/Fiji', 'FJD', PACIFIC, 0.8, isle('viti-levu', L)),
  c('PG', 'port-moresby', 'Port Moresby', 'National Capital District', -9.44, 147.18, 'Pacific/Port_Moresby', 'PGK', MELANESIAN, 0.9, isle('new-guinea', L)),
  c('SB', 'honiara', 'Honiara', 'Guadalcanal', -9.43, 159.95, 'Pacific/Guadalcanal', 'SBD', MELANESIAN, 0.7, isle('guadalcanal', L)),
  c('VU', 'port-vila', 'Port Vila', 'Shefa', -17.73, 168.32, 'Pacific/Efate', 'VUV', MELANESIAN, 0.9, isle('efate')),
  c('WS', 'apia', 'Apia', 'Tuamasaga', -13.83, -171.76, 'Pacific/Apia', 'WST', PACIFIC, 0.8, isle('upolu', L)),
  c('TO', 'nukualofa', 'Nukuʻalofa', 'Tongatapu', -21.14, -175.2, 'Pacific/Tongatapu', 'TOP', PACIFIC, 0.8, isle('tongatapu', L)),
  c('KI', 'south-tarawa', 'South Tarawa', 'Gilbert Islands', 1.33, 172.98, 'Pacific/Tarawa', 'AUD', PACIFIC, 0.8, isle('tarawa', L)),
  c('TV', 'funafuti', 'Funafuti', 'Funafuti', -8.52, 179.2, 'Pacific/Funafuti', 'AUD', PACIFIC, 0.9, isle('funafuti', L)),
  c('NR', 'yaren', 'Yaren', 'Yaren', -0.55, 166.92, 'Pacific/Nauru', 'AUD', PACIFIC, 1.0, isle('nauru', L)),
  c('PW', 'ngerulmud', 'Ngerulmud', 'Melekeok', 7.5, 134.62, 'Pacific/Palau', 'USD', PACIFIC, 1.0, isle('babeldaob')),
  c('FM', 'palikir', 'Palikir', 'Pohnpei', 6.92, 158.16, 'Pacific/Pohnpei', 'USD', PACIFIC, 0.9, isle('pohnpei')),
  c('MH', 'majuro', 'Majuro', 'Majuro Atoll', 7.09, 171.38, 'Pacific/Majuro', 'USD', PACIFIC, 0.9, isle('majuro')),
  // North America
  c('US', 'washington', 'Washington', 'District of Columbia', 38.91, -77.04, 'America/New_York', 'USD', NORTH_AMERICAN, 2.0, NA({ area: 'U Street' })),
  c('CA', 'ottawa', 'Ottawa', 'Ontario', 45.42, -75.7, 'America/Toronto', 'CAD', CANADIAN, 1.7, NA({ area: 'ByWard Market' })),
  c('MX', 'mexico-city', 'Mexico City', 'Mexico City', 19.43, -99.13, 'America/Mexico_City', 'MXN', MEXICAN, 0.9, NA({ area: 'Centro Histórico' })),
  // Central America
  c('GT', 'guatemala-city', 'Guatemala City', 'Guatemala', 14.63, -90.51, 'America/Guatemala', 'GTQ', MESOAMERICAN, 0.7, NA()),
  c('BZ', 'belmopan', 'Belmopan', 'Cayo', 17.25, -88.77, 'America/Belize', 'BZD', tweak(CARIBBEAN, { kitchen: MESOAMERICAN.kitchen }), 0.8, NA()),
  c('SV', 'san-salvador', 'San Salvador', 'San Salvador', 13.69, -89.22, 'America/El_Salvador', 'USD', MESOAMERICAN, 0.7, NA()),
  c('HN', 'tegucigalpa', 'Tegucigalpa', 'Francisco Morazán', 14.07, -87.19, 'America/Tegucigalpa', 'HNL', MESOAMERICAN, 0.6, NA()),
  c('NI', 'managua', 'Managua', 'Managua', 12.11, -86.24, 'America/Managua', 'NIO', MESOAMERICAN, 0.5, NA()),
  c('CR', 'san-jose', 'San José', 'San José', 9.93, -84.08, 'America/Costa_Rica', 'CRC', MESOAMERICAN, 1.0, NA()),
  c('PA', 'panama-city', 'Panama City', 'Panamá', 8.98, -79.52, 'America/Panama', 'USD', MESOAMERICAN, 1.1, NA({ area: 'Casco Viejo' })),
  // The Caribbean
  c('CU', 'havana', 'Havana', 'La Habana', 23.11, -82.37, 'America/Havana', 'CUP', HISPANIC_CARIBBEAN, 0.6, isle('cuba', { area: 'Habana Vieja' })),
  c('JM', 'kingston', 'Kingston', 'Kingston', 17.97, -76.79, 'America/Jamaica', 'JMD', CARIBBEAN, 0.9, isle('jamaica', { area: 'Downtown', driveLeft: true })),
  c('HT', 'port-au-prince', 'Port-au-Prince', 'Ouest', 18.54, -72.34, 'America/Port-au-Prince', 'HTG', HAITIAN, 0.5, isle('hispaniola')),
  c('DO', 'santo-domingo', 'Santo Domingo', 'Distrito Nacional', 18.49, -69.93, 'America/Santo_Domingo', 'DOP', HISPANIC_CARIBBEAN, 0.8, isle('hispaniola', { area: 'Zona Colonial' })),
  c('PR', 'san-juan', 'San Juan', 'San Juan', 18.47, -66.11, 'America/Puerto_Rico', 'USD', tweak(HISPANIC_CARIBBEAN, { loungeText: 'Reggaetón, salsa and bomba, open late.' }), 1.4, isle('puerto-rico', { area: 'Viejo San Juan' })),
  c('BS', 'nassau', 'Nassau', 'New Providence', 25.05, -77.35, 'America/Nassau', 'BSD', CARIBBEAN, 1.6, isle('new-providence', L)),
  c('BB', 'bridgetown', 'Bridgetown', 'Saint Michael', 13.1, -59.61, 'America/Barbados', 'BBD', CARIBBEAN, 1.4, isle('barbados', L)),
  c('TT', 'port-of-spain', 'Port of Spain', 'Port of Spain', 10.65, -61.51, 'America/Port_of_Spain', 'TTD', CARIBBEAN, 1.0, isle('trinidad', L)),
  c('LC', 'castries', 'Castries', 'Castries', 14.01, -60.99, 'America/St_Lucia', 'XCD', CARIBBEAN, 1.1, isle('saint-lucia', L)),
  c('VC', 'kingstown', 'Kingstown', 'Saint George', 13.16, -61.22, 'America/St_Vincent', 'XCD', CARIBBEAN, 1.0, isle('saint-vincent', L)),
  c('GD', 'st-georges', "St. George's", 'Saint George', 12.06, -61.75, 'America/Grenada', 'XCD', CARIBBEAN, 1.0, isle('grenada', L)),
  c('AG', 'st-johns', "St. John's", 'Saint John', 17.12, -61.85, 'America/Antigua', 'XCD', CARIBBEAN, 1.2, isle('antigua', L)),
  c('KN', 'basseterre', 'Basseterre', 'Saint George Basseterre', 17.3, -62.72, 'America/St_Kitts', 'XCD', CARIBBEAN, 1.2, isle('saint-kitts', L)),
  c('DM', 'roseau', 'Roseau', 'Saint George', 15.3, -61.39, 'America/Dominica', 'XCD', CARIBBEAN, 1.0, isle('dominica', L)),
  // South America
  c('CO', 'bogota', 'Bogotá', 'Bogotá D.C.', 4.71, -74.07, 'America/Bogota', 'COP', cold(tweak(SOUTH_AMERICAN, { loungeText: 'Salsa, vallenato and cumbia, open late.' })), 0.8, SA({ area: 'La Candelaria' })),
  c('VE', 'caracas', 'Caracas', 'Capital District', 10.49, -66.88, 'America/Caracas', 'VES', SOUTH_AMERICAN, 0.6, SA()),
  c('EC', 'quito', 'Quito', 'Pichincha', -0.18, -78.47, 'America/Guayaquil', 'USD', cold(SOUTH_AMERICAN), 0.8, SA()),
  c('PE', 'lima', 'Lima', 'Lima', -12.05, -77.04, 'America/Lima', 'PEN', tweak(SOUTH_AMERICAN, { loungeText: 'Música criolla, cumbia and salsa, open late.' }), 0.9, SA({ area: 'Barranco' })),
  // Bolivia's constitutional capital (the government sits in La Paz)
  c('BO', 'sucre', 'Sucre', 'Chuquisaca', -19.05, -65.26, 'America/La_Paz', 'BOB', cold(SOUTH_AMERICAN), 0.5, SA()),
  c('BR', 'brasilia', 'Brasília', 'Federal District', -15.79, -47.88, 'America/Sao_Paulo', 'BRL', BRAZILIAN, 1.0, SA({ area: 'Asa Sul' })),
  c('PY', 'asuncion', 'Asunción', 'Asunción', -25.26, -57.58, 'America/Asuncion', 'PYG', SOUTH_AMERICAN, 0.6, SA()),
  c('UY', 'montevideo', 'Montevideo', 'Montevideo', -34.9, -56.16, 'America/Montevideo', 'UYU', tweak(SOUTH_AMERICAN, { loungeText: 'Tango, candombe and cumbia, open late.' }), 1.1, SA({ area: 'Ciudad Vieja' })),
  c('AR', 'buenos-aires', 'Buenos Aires', 'Buenos Aires', -34.6, -58.38, 'America/Argentina/Buenos_Aires', 'ARS', tweak(SOUTH_AMERICAN, { loungeText: 'Tango and cumbia, open late.' }), 1.0, SA({ area: 'San Telmo' })),
  c('CL', 'santiago', 'Santiago', 'Santiago Metropolitan', -33.45, -70.67, 'America/Santiago', 'CLP', SOUTH_AMERICAN, 1.1, SA({ area: 'Bellavista' })),
  c('GY', 'georgetown', 'Georgetown', 'Demerara-Mahaica', 6.8, -58.16, 'America/Guyana', 'GYD', GUIANAS, 0.8, SA(L)),
  c('SR', 'paramaribo', 'Paramaribo', 'Paramaribo', 5.85, -55.2, 'America/Paramaribo', 'SRD', GUIANAS, 0.7, SA(L)),
];
