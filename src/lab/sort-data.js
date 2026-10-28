// "ממיינים כמו חוקרים" (1.3.1): a big pool of things to sort, and the ways to sort them. Pure data (validate-lab reads it).
// The pool: every creature of the cards (their paintings: CARD_ART), and thirteen things from the shelf (paintings in
// art/lab-items/). Each round takes 8 to 10 of them. An attribute that is not clear for an item is left out (null), and
// a rule is used only for items it fits, so nothing is sorted by a guess. Facts: docs/sources.md ("ממיינים כמו חוקרים").
import { NAMES_K } from '../data/inventions-kids.js';
const L = (f, k) => ({ f, k });

// ───────────────────────────────────────── the creatures
// [id, zone, the card's name, kingdom p|a|f, home w|l|a, diet p|a|b, time d|n, backbone 1|0, moves 1|0,
//  cover fur|fea|sca|oth, size s|b]   (null: not clear for this one; diet and time are for animals only)
const _ = null;
const C = [
  // אמזונס
  ['kapok', 'amazon', 'קפוק', 'p', 'l', _, _, _, 0, _, 'b'],
  ['brazilnut', 'amazon', 'אגוז ברזיל', 'p', 'l', _, _, _, 0, _, 'b'],
  ['fig', 'amazon', 'פיקוס חונק', 'p', 'l', _, _, _, 0, _, 'b'],
  ['cecropia', 'amazon', 'צקרופיה', 'p', 'l', _, _, _, 0, _, 'b'],
  ['acai', 'amazon', 'דקל אסאי', 'p', 'l', _, _, _, 0, _, 'b'],
  ['heliconia', 'amazon', 'הליקוניה', 'p', 'l', _, _, _, 0, _, 'b'],
  ['bromeliad', 'amazon', 'ברומליה', 'p', 'l', _, _, _, 0, _, _],
  ['orchid', 'amazon', 'סחלב', 'p', 'l', _, _, _, 0, _, _],
  ['liana', 'amazon', 'ליאנה', 'p', 'l', _, _, _, 0, _, 'b'],
  ['fern', 'amazon', 'שרך', 'p', 'l', _, _, _, 0, _, _],
  ['glowfungus', 'amazon', 'פטרייה זוהרת', 'f', 'l', _, _, _, 0, _, _],
  ['waterlily', 'amazon', 'ויקטוריה אמזונית', 'p', 'w', _, _, _, 0, _, 'b'],
  ['leafcutter', 'amazon', 'נמלים גוזרות עלים', 'a', 'l', _, _, 0, 1, 'oth', 's'],
  ['orchidbee', 'amazon', 'דבורת סחלבים', 'a', 'a', 'p', 'd', 0, 1, 'oth', 's'],
  ['morpho', 'amazon', 'פרפר מורפו', 'a', 'a', 'p', 'd', 0, 1, 'oth', _],
  ['hummingbird', 'amazon', 'יונק דבש', 'a', 'a', 'b', 'd', 1, 1, 'fea', _],
  ['dartfrog', 'amazon', 'צפרדע חץ', 'a', 'l', 'a', 'd', 1, 1, 'oth', 's'],
  ['toucan', 'amazon', 'טוקן', 'a', 'a', 'b', 'd', 1, 1, 'fea', 'b'],
  ['macaw', 'amazon', 'תוכי ארה', 'a', 'a', 'p', 'd', 1, 1, 'fea', 'b'],
  ['sloth', 'amazon', 'עצלן', 'a', 'l', 'p', _, 1, 1, 'fur', 'b'],
  ['agouti', 'amazon', 'אגוטי', 'a', 'l', 'p', 'd', 1, 1, 'fur', 'b'],
  ['howler', 'amazon', 'קוף יללן', 'a', 'l', 'p', 'd', 1, 1, 'fur', 'b'],
  ['jaguar', 'amazon', 'יגואר', 'a', 'l', 'a', _, 1, 1, 'fur', 'b'],
  ['harpy', 'amazon', 'עיט הרפיה', 'a', 'a', 'a', 'd', 1, 1, 'fea', 'b'],
  ['capybara', 'amazon', 'קפיברה', 'a', _, 'p', 'd', 1, 1, 'fur', 'b'],
  ['tapir', 'amazon', 'טפיר', 'a', 'l', 'p', 'n', 1, 1, 'fur', 'b'],
  ['fruitbat', 'amazon', 'עטלף פירות', 'a', 'a', 'p', 'n', 1, 1, 'fur', _],
  ['anteater', 'amazon', 'נמלן ענק', 'a', 'l', 'a', _, 1, 1, 'fur', 'b'],
  ['kinkajou', 'amazon', 'קינקג׳ו', 'a', 'l', 'p', 'n', 1, 1, 'fur', 'b'],
  ['coati', 'amazon', 'קואטי', 'a', 'l', 'b', 'd', 1, 1, 'fur', 'b'],
  // חורש
  ['oak', 'grove', 'אלון מצוי', 'p', 'l', _, _, _, 0, _, 'b'],
  ['terebinth', 'grove', 'אלה ארץ-ישראלית', 'p', 'l', _, _, _, 0, _, 'b'],
  ['carob', 'grove', 'חרוב מצוי', 'p', 'l', _, _, _, 0, _, 'b'],
  ['pine', 'grove', 'אורן ירושלים', 'p', 'l', _, _, _, 0, _, 'b'],
  ['mastic', 'grove', 'אלת המסטיק', 'p', 'l', _, _, _, 0, _, 'b'],
  ['buckthorn', 'grove', 'אשחר ארץ-ישראלי', 'p', 'l', _, _, _, 0, _, 'b'],
  ['sage', 'grove', 'מרווה משולשת', 'p', 'l', _, _, _, 0, _, _],
  ['rockrose', 'grove', 'לוטם', 'p', 'l', _, _, _, 0, _, _],
  ['cyclamen', 'grove', 'רקפת מצויה', 'p', 'l', _, _, _, 0, _, _],
  ['anemone', 'grove', 'כלנית מצויה', 'p', 'l', _, _, _, 0, _, _],
  ['mushroom', 'grove', 'פטריות', 'f', 'l', _, _, _, 0, _, _],
  ['honeybee', 'grove', 'דבורת דבש', 'a', 'a', 'p', 'd', 0, 1, 'oth', 's'],
  ['butterfly', 'grove', 'פרפר', 'a', 'a', 'p', 'd', 0, 1, 'oth', _],
  ['harvesterant', 'grove', 'נמלת קציר', 'a', 'l', 'p', 'd', 0, 1, 'oth', 's'],
  ['firefly', 'grove', 'גחלילית', 'a', 'a', _, 'n', 0, 1, 'oth', 's'],
  ['jay', 'grove', 'עורבני', 'a', 'a', 'b', 'd', 1, 1, 'fea', _],
  ['blackbird', 'grove', 'שחרור', 'a', 'a', 'b', 'd', 1, 1, 'fea', _],
  ['chameleon', 'grove', 'זיקית מצויה', 'a', 'l', 'a', 'd', 1, 1, 'sca', _],
  ['agama', 'grove', 'חרדון מצוי', 'a', 'l', _, 'd', 1, 1, 'sca', _],
  ['spinymouse', 'grove', 'קוצן מצוי', 'a', 'l', _, 'n', 1, 1, _, _],
  ['porcupine', 'grove', 'דורבן', 'a', 'l', 'p', 'n', 1, 1, _, 'b'],
  ['hedgehog', 'grove', 'קיפוד', 'a', 'l', 'a', 'n', 1, 1, _, _],
  ['hyrax', 'grove', 'שפן סלע', 'a', 'l', 'p', 'd', 1, 1, 'fur', 'b'],
  ['gazelle', 'grove', 'צבי ארץ-ישראלי', 'a', 'l', 'p', _, 1, 1, 'fur', 'b'],
  ['fox', 'grove', 'שועל מצוי', 'a', 'l', 'b', 'n', 1, 1, 'fur', 'b'],
  ['owl', 'grove', 'תנשמת', 'a', 'a', 'a', 'n', 1, 1, 'fea', 'b'],
  ['hoopoe', 'grove', 'דוכיפת', 'a', 'a', 'a', 'd', 1, 1, 'fea', _],
  ['tortoise', 'grove', 'צב יבשה מצוי', 'a', 'l', 'p', 'd', 1, 1, _, _],
  ['chukar', 'grove', 'חוגלת סלעים', 'a', _, 'b', 'd', 1, 1, 'fea', _],
  // שונית
  ['branching', 'reef', 'אלמוג שיח', 'a', 'w', _, _, 0, 0, 'oth', _],
  ['brain', 'reef', 'אלמוג מוח', 'a', 'w', _, _, 0, 0, 'oth', 'b'],
  ['table', 'reef', 'אלמוג שולחן', 'a', 'w', _, _, 0, 0, 'oth', 'b'],
  ['firecoral', 'reef', 'אלמוג אש', 'a', 'w', _, _, 0, 0, 'oth', _],
  ['softcoral', 'reef', 'אלמוג רך', 'a', 'w', _, _, 0, 0, 'oth', _],
  ['seafan', 'reef', 'מניפת ים', 'a', 'w', _, _, 0, 0, 'oth', 'b'],
  ['sponge', 'reef', 'ספוג', 'a', 'w', _, _, 0, 0, 'oth', _],
  ['seaanemone', 'reef', 'שושנת ים', 'a', 'w', _, _, 0, _, 'oth', _],
  ['clam', 'reef', 'צדפת ענק', 'a', 'w', _, _, 0, 0, 'oth', 'b'],
  ['seagrass', 'reef', 'עשב ים', 'p', 'w', _, _, _, 0, _, _],
  ['clownfish', 'reef', 'שושנון ים סוף', 'a', 'w', 'b', 'd', 1, 1, 'sca', _],
  ['parrotfish', 'reef', 'תוכינון', 'a', 'w', 'p', 'd', 1, 1, 'sca', 'b'],
  ['surgeonfish', 'reef', 'מנתחן', 'a', 'w', 'p', 'd', 1, 1, 'sca', _],
  ['cleaner', 'reef', 'נקאי אילתי', 'a', 'w', 'a', 'd', 1, 1, 'sca', 's'],
  ['butterflyfish', 'reef', 'פרפרון', 'a', 'w', 'a', 'd', 1, 1, 'sca', _],
  ['lionfish', 'reef', 'זהרון', 'a', 'w', 'a', _, 1, 1, 'sca', _],
  ['moray', 'reef', 'מורנה', 'a', 'w', 'a', 'n', 1, 1, 'oth', 'b'],
  ['grouper', 'reef', 'דקר', 'a', 'w', 'a', _, 1, 1, 'sca', 'b'],
  ['goby', 'reef', 'גובי', 'a', 'w', _, _, 1, 1, 'sca', 's'],
  ['shrimp', 'reef', 'חסילון', 'a', 'w', _, _, 0, 1, 'oth', 's'],
  ['turtle', 'reef', 'צב ים ירוק', 'a', 'w', _, _, 1, 1, _, 'b'],
  ['octopus', 'reef', 'תמנון', 'a', 'w', 'a', _, 0, 1, 'oth', _],
  ['urchin', 'reef', 'קיפוד ים', 'a', 'w', 'p', 'n', 0, 1, 'oth', _],
  ['starfish', 'reef', 'קוצנון', 'a', 'w', 'a', _, 0, 1, 'oth', _],
  ['stingray', 'reef', 'חתול ים', 'a', 'w', 'a', _, 1, 1, _, 'b'],
  ['hermit', 'reef', 'סרטן נזיר', 'a', 'w', _, _, 0, 1, 'oth', 's'],
  ['jellyfish', 'reef', 'מדוזה', 'a', 'w', 'a', _, 0, 1, 'oth', _],
  ['reefshark', 'reef', 'כריש שונית', 'a', 'w', 'a', _, 1, 1, 'sca', 'b'],
];
const KEYS = ['kingdom', 'home', 'diet', 'time', 'spine', 'moves', 'cover', 'size'];
export const CREATURES = C.map(([id, zone, name, ...v]) => {
  const it = { id, zone, pic: 'card:' + id, name: L(name, NAMES_K[name] || name), set: v[0] === 'a' ? 'animal' : 'living' };
  KEYS.forEach((k, i) => { it[k] = v[i]; });
  it.zone2 = zone;
  it.food = v[0] === 'p' ? 1 : v[0] === 'f' ? 0 : (it.cover === 'oth' && it.moves === 0 ? null : 0);   // corals and their kin: their algae make food for them, so not clear
  return it;
});
// the card's name of a species (for the patents and the clues)
export const speciesName = (id) => (CREATURES.find((c) => c.id === id) || {}).name || null;

// ───────────────────────────────────────── the things from the shelf (paintings: art/lab-items/<id>.webp)
// from p|a|n (a plant / an animal / never alive), shape long|round, place sea|land, seed 1|0, color brown|other
export const THINGS = [
  { id: 'seashell', name: L('צדף מהחוף', 'צֶדֶף מֵהַחוֹף'), from: 'a', shape: _, place: 'sea', seed: 0, color: 'other' },
  { id: 'feather', name: L('נוצה אפורה', 'נוֹצָה אֲפֹרָה'), from: 'a', shape: 'long', place: 'land', seed: 0, color: 'other' },
  { id: 'pine-cone', name: L('אצטרובל', 'אִצְטְרֻבָּל'), from: 'p', shape: _, place: 'land', seed: 1, color: 'brown' },
  { id: 'acorn', name: L('בלוט', 'בַּלּוּט'), from: 'p', shape: 'round', place: 'land', seed: 1, color: 'brown' },
  { id: 'pebble', name: L('חלוק אבן', 'חַלּוּק אֶבֶן'), from: 'n', shape: 'round', place: 'land', seed: 0, color: 'other' },
  { id: 'coral-piece', name: L('שלד של אלמוג', 'שֶׁלֶד שֶׁל אַלְמוֹג'), from: 'a', shape: _, place: 'sea', seed: 0, color: 'other' },
  { id: 'snail-shell', name: L('קונכייה של חילזון', 'קוֹנְכִיָּה שֶׁל חִלָּזוֹן'), from: 'a', shape: 'round', place: 'land', seed: 0, color: _ },
  { id: 'carob-pod', name: L('תרמיל של חרוב', 'תַּרְמִיל שֶׁל חָרוּב'), from: 'p', shape: 'long', place: 'land', seed: 1, color: 'brown' },
  { id: 'bird-nest', name: L('קן ריק', 'קֵן רֵיק'), from: _, shape: 'round', place: 'land', seed: 0, color: 'brown' },
  { id: 'bird-egg', name: L('ביצה של ציפור', 'בֵּיצָה שֶׁל צִפּוֹר'), from: 'a', shape: 'round', place: 'land', seed: 0, color: 'other' },
  { id: 'honeycomb', name: L('חלת דבש', 'חַלַּת דְּבַשׁ'), from: 'a', shape: _, place: 'land', seed: 0, color: 'other' },
  { id: 'sea-sand', name: L('חול מהים', 'חוֹל מֵהַיָּם'), from: _, shape: _, place: 'sea', seed: 0, color: 'other' },
  { id: 'pine-seed', name: L('זרע עם כנף', 'זֶרַע עִם כָּנָף'), from: 'p', shape: _, place: 'land', seed: 1, color: 'brown' },
].map((t) => ({ ...t, pic: t.id, set: 'thing' }));

export const POOL = [...CREATURES, ...THINGS];

// ───────────────────────────────────────── the ways to sort (groups: value → the box's name)
// sets: which kind of round uses the rule: 'living' (plants, fungi and animals), 'animal' (animals only), 'thing'
export const RULES = {
  kingdom: { sets: ['living'], name: L('צמח, בעל חיים או פטרייה', 'צֶמַח, בַּעַל חַיִּים אוֹ פִּטְרִיָּה'),
    g: { p: L('צמחים', 'צְמָחִים'), a: L('בעלי חיים', 'בַּעֲלֵי חַיִּים'), f: L('פטריות', 'פִּטְרִיּוֹת') } },
  home: { sets: ['living', 'animal'], name: L('במים, על היבשה או באוויר', 'בַּמַּיִם, עַל הַיַּבָּשָׁה אוֹ בָּאֲוִיר'),
    g: { w: L('חיים במים', 'חַיִּים בַּמַּיִם'), l: L('חיים על היבשה', 'חַיִּים עַל הַיַּבָּשָׁה'), a: L('עפים באוויר', 'עָפִים בָּאֲוִיר') } },
  moves: { sets: ['living', 'animal'], name: L('זזים ממקום למקום, או נשארים במקום', 'זָזִים, אוֹ נִשְׁאָרִים בַּמָּקוֹם'),
    g: { 1: L('זזים ממקום למקום', 'זָזִים מִמָּקוֹם לְמָקוֹם'), 0: L('נשארים במקום אחד', 'נִשְׁאָרִים בְּמָקוֹם אֶחָד') } },
  food: { sets: ['living'], name: L('מכינים מזון מאור השמש, או אוכלים', 'מְכִינִים מָזוֹן מֵהַשֶּׁמֶשׁ, אוֹ אוֹכְלִים'),
    g: { 1: L('מכינים מזון מאור השמש', 'מְכִינִים מָזוֹן מֵאוֹר הַשֶּׁמֶשׁ'), 0: L('אוכלים מזון', 'אוֹכְלִים מָזוֹן') } },
  size: { sets: ['living', 'animal'], name: L('קטנים מכף יד, או גדולים ממנה', 'קְטַנִּים מִכַּף יָד, אוֹ גְּדוֹלִים'),
    g: { s: L('קטנים מכף יד', 'קְטַנִּים מִכַּף יָד'), b: L('גדולים מכף יד', 'גְּדוֹלִים מִכַּף יָד') } },
  zone: { sets: ['living', 'animal'], name: L('מאיזה מקום בעולם', 'מֵאֵיזֶה מָקוֹם בָּעוֹלָם'),
    g: { amazon: L('מיער הגשם באמזונס', 'מִיַּעַר הַגֶּשֶׁם'), grove: L('מהחורש בארץ', 'מֵהַחֹרֶשׁ בָּאָרֶץ'), reef: L('מהשונית באילת', 'מֵהַשּׁוּנִית בְּאֵילַת'), desert: L('מהמדבר', 'מֵהַמִּדְבָּר') } },
  diet: { sets: ['animal'], name: L('מה הם אוכלים', 'מָה הֵם אוֹכְלִים'),
    g: { p: L('אוכלים צמחים או אצות', 'אוֹכְלִים צְמָחִים אוֹ אַצּוֹת'), a: L('אוכלים בעלי חיים', 'אוֹכְלִים בַּעֲלֵי חַיִּים'), b: L('אוכלים גם וגם', 'אוֹכְלִים גַּם וְגַם') } },
  time: { sets: ['animal'], name: L('ערים ביום או בלילה', 'עֵרִים בַּיּוֹם אוֹ בַּלַּיְלָה'),
    g: { d: L('ערים ביום', 'עֵרִים בַּיּוֹם'), n: L('ערים בלילה', 'עֵרִים בַּלַּיְלָה') } },
  spine: { sets: ['animal'], name: L('יש להם עמוד שדרה, או אין', 'יֵשׁ לָהֶם עַמּוּד שִׁדְרָה, אוֹ אֵין'),
    g: { 1: L('יש עמוד שדרה', 'יֵשׁ עַמּוּד שִׁדְרָה'), 0: L('אין עמוד שדרה', 'אֵין עַמּוּד שִׁדְרָה') } },
  cover: { sets: ['animal'], name: L('פרווה, נוצות, קשקשים או משהו אחר', 'פַּרְוָה, נוֹצוֹת, קַשְׂקַשִּׂים אוֹ אַחֵר'),
    g: { fur: L('פרווה', 'פַּרְוָה'), fea: L('נוצות', 'נוֹצוֹת'), sca: L('קשקשים', 'קַשְׂקַשִּׂים'), oth: L('משהו אחר', 'מַשֶּׁהוּ אַחֵר') } },
  from: { sets: ['thing'], name: L('מצמח, מבעל חיים, או שלא היה חי', 'מִצֶּמַח, מִבַּעַל חַיִּים, אוֹ לֹא חַי'),
    g: { p: L('בא מצמח', 'בָּא מִצֶּמַח'), a: L('בא מבעל חיים', 'בָּא מִבַּעַל חַיִּים'), n: L('אף פעם לא היה חי', 'אַף פַּעַם לֹא הָיָה חַי') } },
  shape: { sets: ['thing'], name: L('ארוך או עגול', 'אָרֹךְ אוֹ עָגֹל'), g: { long: L('ארוך', 'אָרֹךְ'), round: L('עגול', 'עָגֹל') } },
  place: { sets: ['thing'], name: L('מהים או מהיבשה', 'מֵהַיָּם אוֹ מֵהַיַּבָּשָׁה'), g: { sea: L('מהים', 'מֵהַיָּם'), land: L('מהיבשה', 'מֵהַיַּבָּשָׁה') } },
  seed: { sets: ['thing'], name: L('יש בו זרע, או אין', 'יֵשׁ בּוֹ זֶרַע, אוֹ אֵין'), g: { 1: L('יש בו זרע', 'יֵשׁ בּוֹ זֶרַע'), 0: L('אין בו זרע', 'אֵין בּוֹ זֶרַע') } },
  color: { sets: ['thing'], name: L('חום או בצבע אחר', 'חוּם אוֹ בְּצֶבַע אַחֵר'), g: { brown: L('חום', 'חוּם'), other: L('בצבע אחר', 'בְּצֶבַע אַחֵר') } },
};
// the attribute a rule reads (zone is read from zone2 so 'zone' stays a plain field)
export const attrOf = (it, r) => { const v = it[r === 'zone' ? 'zone2' : r]; return v == null ? null : String(v); };
export const SETS = {
  living: (it) => it.set === 'living' || it.set === 'animal',
  animal: (it) => it.set === 'animal',
  thing: (it) => it.set === 'thing',
};
export const rulesOfSet = (set) => Object.keys(RULES).filter((r) => RULES[r].sets.includes(set));

// the words of the game itself
export const SORT2_T = {
  set: { living: L('יצורים חיים', 'יְצוּרִים חַיִּים'), animal: L('בעלי חיים', 'בַּעֲלֵי חַיִּים'), thing: L('דברים מהמדף', 'דְּבָרִים מֵהַמַּדָּף') },
  newRound: L('סיבוב חדש', 'סִבּוּב חָדָשׁ'), third: L('קופסה שלישית', 'קֻפְסָה שְׁלִישִׁית'), lessBox: L('רק שתי קופסאות', 'רַק שְׁתֵּי קֻפְסָאוֹת'),
  boxC: L('קופסה ג', 'קֻפְסָה ג'), drawn: L('{n} דברים מתוך {all}', '{n} דְּבָרִים מִתּוֹךְ {all}'),
  youIntro: L('הפעם {set}: {n} דברים מתוך אוסף גדול. מיינו אותם לקופסאות לפי כלל שאתם בוחרים, ואל תגלו לי! אני אנסה לנחש.',
    ['הַפַּעַם {set}: {n} דְּבָרִים.', 'מַיְּנוּ לְפִי כְּלָל שֶׁלָּכֶם, וְאַל תְּגַלּוּ לִי!']),
  roboIntro: L('עכשיו תורי. מיינתי {n} דברים ל{boxes} קופסאות, לפי כלל סודי. מה הכלל שלי?', ['עַכְשָׁו תּוֹרִי!', 'מִיַּנְתִּי {n} דְּבָרִים. יֵשׁ {boxes} קֻפְסָאוֹת.', 'מָה הַכְּלָל שֶׁלִּי?']),
  merged: L('כמעט! לפי הכלל הזה, {item} צריך קופסה משלו.', 'כִּמְעַט! {item} צָרִיךְ קֻפְסָה מִשֶּׁלּוֹ.'),
  rulesSeen: L('כללים שגיליתם: {n}', 'כְּלָלִים שֶׁגִּלִּיתֶם: {n}'),
  manyRules: L('כבר מיינתם לפי שישה כללים שונים! אותם דברים, הרבה דרכים למיין.', 'שִׁשָּׁה כְּלָלִים שׁוֹנִים! הַרְבֵּה דְּרָכִים לְמַיֵּן.'),
  // surprises the robot tells once, when one of these lands in a box
  facts: {
    sponge: L('הפתעה קטנה: ספוג הוא בעל חיים, לא צמח!', 'הַפְתָּעָה: סְפוֹג הוּא בַּעַל חַיִּים!'),
    mushroom: L('פטרייה היא לא צמח ולא בעל חיים. הפטריות הן קבוצה משלהן!', 'פִּטְרִיָּה הִיא לֹא צֶמַח וְלֹא בַּעַל חַיִּים!'),
    brain: L('גם אלמוג הוא בעל חיים, למרות שהוא לא זז ממקומו.', 'גַּם אַלְמוֹג הוּא בַּעַל חַיִּים!'),
    moray: L('למורנה אין קשקשים. העור שלה חלק ומכוסה ריר.', 'לַמּוֹרֶנָה אֵין קַשְׂקַשִּׂים!'),
    fruitbat: L('העטלף עף, אבל הוא לא ציפור: יש לו פרווה.', 'הָעֲטַלֵּף עָף, אֲבָל יֵשׁ לוֹ פַּרְוָה!'),
    'sea-sand': L('חלק מהחול הלבן בשונית יוצא מהתוכינון, שנוגס בסלע!', 'חֵלֶק מֵהַחוֹל בַּשּׁוּנִית בָּא מֵהַתּוּכִינוֹן!'),
  },
};
