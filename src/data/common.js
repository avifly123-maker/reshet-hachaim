// Shared Hebrew labels for the content of "רשת החיים".
// Owned by the CONTENT agent. Plain data – no logic the core depends on except lookups.

export const START_POINTS = 120; // "נקודות חיים" the player starts with

// Relation direction convention (used in src/data/<biome>.js):
// a relation is written on the species that ACTS or BENEFITS ("from"), pointing at "target" ("to").
//   pollinates : from (animal) מאביק את to (plant)
//   disperses  : from (animal) מפיץ את הזרעים של to (plant)
//   home       : from (animal) מוצא בית / מגדל צאצאים ב-to
//   shelter    : from (animal) מוצא מחסה וצל ב-to
//   decomposes : from (fungus) מפרק חומר מת של to
//   partner    : from ו-to עוזרים זה לזה (שותפות, שני הכיוונים)
//   climbs     : from (epiphyte / vine) נתמך ב-to ויושב עליו
//   eats       : from אוכל את to (food links normally come from `diet`; this is only for extra highlights)
//
// Optional per-animal fields used only by the learning-hub quiz:
//   alsoEats : DIET_PARTS keys the animal really eats besides its modelled `diet` (from its card / real life),
//              so the quiz never offers a real food as a "wrong" answer.
//   quizDiet : DIET_PARTS keys that are the true quiz answer when the game diet is a simplification
//              (leafcutter ants cut leaves in the game, but what they eat is the fungus).
export const RELATION_TYPES = {
  pollinates: { name: 'מאביק', verb: 'מאביק את', icon: '🌸', color: '#f2c14e' },
  disperses: { name: 'מפיץ זרעים', verb: 'מפיץ את הזרעים של', icon: '🌱', color: '#7cc46a' },
  home: { name: 'בית', verb: 'גר ב', icon: '🏠', color: '#c99a6b' },
  shelter: { name: 'מחסה וצל', verb: 'מוצא מחסה ב', icon: '🌳', color: '#5aa58a' },
  decomposes: { name: 'מפרק', verb: 'מפרק את', icon: '🍂', color: '#a7835a' },
  partner: { name: 'שותפות', verb: 'עובד יחד עם', icon: '🤝', color: '#5fb3d9' },
  climbs: { name: 'נתמך', verb: 'נתמך ב', icon: '🌿', color: '#8fbf5a' },
  eats: { name: 'אוכל', verb: 'אוכל את', icon: '🍃', color: '#e07a5f' },
};

// Parts of a food item (Species.diet[].part)
export const DIET_PARTS = {
  leaves: 'עלים',
  fruit: 'פירות',
  nectar: 'צוף ואבקה',
  seeds: 'זרעים',
  insects: 'חרקים',
  animals: 'בעלי חיים',
  fungus: 'פטרייה',
  dead: 'חומר מת',
  roots: 'שורשים ופקעות',
  // the reef
  algae: 'אצות',
  plankton: 'פלנקטון',
  polyps: 'פוליפים של אלמוגים',
};

// Short verb phrases for food links: "<eater> <verb> <food>"
export const DIET_VERBS = {
  leaves: 'אוכל עלים של',
  fruit: 'אוכל פירות של',
  nectar: 'שותה צוף מ',
  seeds: 'אוכל זרעים של',
  insects: 'צד',
  animals: 'צד',
  fungus: 'אוכל',
  dead: 'מפרק',
  roots: 'חופר ואוכל פקעות של',
  algae: 'מגרד אצות מ',
  plankton: 'מסנן',
  polyps: 'אוכל פוליפים של',
};

export const KINDS = {
  tree: 'עץ',
  palm: 'דקל',
  shrub: 'שיח',
  herb: 'צמח עשבוני',
  epiphyte: 'צמח שגדל על עצים',
  vine: 'צמח מטפס',
  fungus: 'פטרייה',
  'water-plant': 'צמח מים',
  animal: 'בעל חיים',
  colony: 'מושבה',
  swarm: 'חרק', // the firefly; the reef's plankton has its own kindLabel
  // the reef: corals, sponges, anemones and giant clams are animals that stay in place – in the game they are placed and
  // grow like plants (src/sim/species.js PLANT_KINDS); a species' kindLabel says what it really is on its card
  cactus: 'קקטוס',
  coral: 'אלמוג',
  sessile: 'בעל חיים שלא זז',
  seaplant: 'צמח ים',
};

export const SEASON_NAMES = {
  winter: 'חורף',
  spring: 'אביב',
  summer: 'קיץ',
  autumn: 'סתיו',
  // 1.4.2, the savanna's two seasons (the HUD shows "עונת ה…" style names as they are)
  wet: 'גשמים',
  dry: 'יובש',
};

export const ACTIVE_NAMES = {
  day: 'פעיל ביום',
  night: 'פעיל בלילה',
  both: 'פעיל ביום ובלילה',
};

export const LOCOMOTION_NAMES = {
  ground: 'הולך על הקרקע',
  arboreal: 'חי על העצים',
  flying: 'עף',
  water: 'שוחה',
  swim: 'שוחה',
};

export const GROWTH_NAMES = {
  fast: 'גדל מהר',
  medium: 'גדל בקצב בינוני',
  slow: 'גדל לאט',
};

export const LEAF_NAMES = {
  evergreen: 'ירוק כל השנה',
  deciduous: 'משיר עלים',
};

// Generic labels for mission goals (the UI may fill in names/numbers)
export const GOAL_LABELS = {
  place: 'שתלו / הביאו',
  speciesAlive: 'מינים חיים',
  link: 'צרו קשר',
  chain: 'שרשרת מזון',
  health: 'בריאות היער',
  grow: 'גדלו עד בגרות',
  floorLight: 'אור בקרקעית',
  pollinate: 'האבקות',
  disperse: 'זרעים שהופצו',
  discover: 'מינים שגיליתם',
  observeNight: 'צפו בלילה',
  survive: 'שרדו את האירוע',
  bloom: 'פריחה',
  experiment: 'ניסוי',
  tool: 'השתמשו בכלי',
  photos: 'צילומים',
  rescue: 'הצלות',
  seeded: 'שתילים מרחפן',
  all: 'משימת מומחים',
};

export const UI_WORDS = {
  points: 'נקודות חיים',
  fact: 'הידעת?',
  more: 'ברשת החיים',
  question: 'שאלה למחשבה',
  diet: 'אוכל',
  eatenBy: 'נאכל על ידי',
  relations: 'קשרים',
  layer: 'קומה',
  light: 'צריך אור',
  shade: 'מסתדר בצל',
};

// ── Hebrew grammatical gender/number of each species name, for generated sentences.
// m = זכר יחיד, f = נקבה יחידה, mp = זכר רבים, fp = נקבה רבות (default m)
export const GENDER = {
  // amazon
  cecropia: 'f', heliconia: 'f', bromeliad: 'f', liana: 'f', glowfungus: 'f', waterlily: 'f',
  leafcutter: 'fp', orchidbee: 'f', dartfrog: 'f', capybara: 'f',
  // grove
  terebinth: 'f', mastic: 'f', sage: 'f', cyclamen: 'f', anemone: 'f', mushroom: 'fp',
  honeybee: 'f', harvesterant: 'f', firefly: 'f', chameleon: 'f', owl: 'f', hoopoe: 'f', chukar: 'f',
  // reef
  seaanemone: 'f', clam: 'f', algae: 'fp', seafan: 'f', moray: 'f', jellyfish: 'f',
  // savanna (1.4.2)
  umbrella: 'f', whistling: 'f', sycamore: 'f', marula: 'f', zebra: 'f', giraffe: 'f', impala: 'f', termites: 'fp',
};
export const genderOf = (id) => GENDER[id] || 'm';

// verb forms [m, f, mp, fp] for relation types and diet parts
const VF = {
  pollinates: ['מאביק את', 'מאביקה את', 'מאביקים את', 'מאביקות את'],
  disperses: ['מפיץ את הזרעים של', 'מפיצה את הזרעים של', 'מפיצים את הזרעים של', 'מפיצות את הזרעים של'],
  home: ['גר ב', 'גרה ב', 'גרים ב', 'גרות ב'],
  shelter: ['מוצא מחסה ב', 'מוצאת מחסה ב', 'מוצאים מחסה ב', 'מוצאות מחסה ב'],
  decomposes: ['מפרק את', 'מפרקת את', 'מפרקים את', 'מפרקות את'],
  partner: ['עובד יחד עם', 'עובדת יחד עם', 'עובדים יחד עם', 'עובדות יחד עם'],
  climbs: ['נתמך ב', 'נתמכת ב', 'נתמכים ב', 'נתמכות ב'],
  eats: ['אוכל את', 'אוכלת את', 'אוכלים את', 'אוכלות את'],
};
const DF = {
  leaves: ['אוכל עלים של', 'אוכלת עלים של', 'אוכלים עלים של', 'אוכלות עלים של'],
  fruit: ['אוכל פירות של', 'אוכלת פירות של', 'אוכלים פירות של', 'אוכלות פירות של'],
  nectar: ['שותה צוף מ', 'שותה צוף מ', 'שותים צוף מ', 'שותות צוף מ'],
  seeds: ['אוכל זרעים של', 'אוכלת זרעים של', 'אוכלים זרעים של', 'אוכלות זרעים של'],
  insects: ['צד', 'צדה', 'צדים', 'צדות'],
  animals: ['צד', 'צדה', 'צדים', 'צדות'],
  fungus: ['אוכל', 'אוכלת', 'אוכלים', 'אוכלות'],
  dead: ['מפרק', 'מפרקת', 'מפרקים', 'מפרקות'],
  roots: ['חופר ואוכל פקעות של', 'חופרת ואוכלת פקעות של', 'חופרים ואוכלים פקעות של', 'חופרות ואוכלות פקעות של'],
  algae: ['מגרד אצות מ', 'מגרדת אצות מ', 'מגרדים אצות מ', 'מגרדות אצות מ'],
  plankton: ['מסנן', 'מסננת', 'מסננים', 'מסננות'],
  polyps: ['אוכל פוליפים של', 'אוכלת פוליפים של', 'אוכלים פוליפים של', 'אוכלות פוליפים של'],
};
const GI = { m: 0, f: 1, mp: 2, fp: 3 };
/** relation verb agreeing with the acting species (by species id) */
export const relVerb = (type, id) => (VF[type] || VF.eats)[GI[genderOf(id)]];
/** diet verb agreeing with the eater (by species id) */
export const dietVerb = (part, id) => (DF[part] || VF.eats)[GI[genderOf(id)]];
/** "do not work together" for a pair */
export const notTogether = (a, b) => (genderOf(a)[0] === 'f' && genderOf(b)[0] === 'f' ? 'לא עובדות יחד' : 'לא עובדים יחד');
/** pick the word form that agrees with a species: gw(id, masc, fem, mascPlural, femPlural) */
export const gw = (id, m, f, mp = m, fp = f) => ({ m, f, mp, fp })[genderOf(id)];
/** "פעיל ביום / פעילה בלילה ..." agreeing with the species */
export const activeNameFor = (id, active) => {
  const when = { day: 'ביום', night: 'בלילה', both: 'ביום ובלילה' }[active] || 'ביום';
  return gw(id, 'פעיל', 'פעילה', 'פעילים', 'פעילות') + ' ' + when;
};

// ── Definite form of every species name ("the X"), for generated sentences: "את הקפוק", "דבורת הדבש", "האלון המצוי".
// Construct names put ה on the second word (דבורת הדבש); names with an adjective put ה on both words (הפיקוס החונק).
export const DEF = {
  // amazon
  kapok: 'הקפוק', brazilnut: 'אגוז הברזיל', fig: 'הפיקוס החונק', cecropia: 'הצקרופיה', acai: 'דקל האסאי',
  heliconia: 'ההליקוניה', bromeliad: 'הברומליה', orchid: 'הסחלב', liana: 'הליאנה', fern: 'השרך',
  glowfungus: 'הפטרייה הזוהרת', waterlily: 'הוויקטוריה האמזונית', leafcutter: 'הנמלים הגוזרות עלים',
  orchidbee: 'דבורת הסחלבים', morpho: 'פרפר המורפו', hummingbird: 'יונק הדבש', dartfrog: 'צפרדע החץ',
  toucan: 'הטוקן', macaw: 'תוכי הארה', sloth: 'העצלן', agouti: 'האגוטי', howler: 'הקוף היללן', jaguar: 'היגואר',
  harpy: 'עיט ההרפיה', capybara: 'הקפיברה', tapir: 'הטפיר', fruitbat: 'עטלף הפירות', anteater: 'הנמלן הענק',
  kinkajou: "הקינקג'ו", coati: 'הקואטי',
  // grove
  oak: 'האלון המצוי', terebinth: 'האלה הארץ-ישראלית', carob: 'החרוב המצוי', pine: 'אורן ירושלים', mastic: 'אלת המסטיק',
  buckthorn: 'האשחר הארץ-ישראלי', sage: 'המרווה המשולשת', rockrose: 'הלוטם', cyclamen: 'הרקפת המצויה',
  anemone: 'הכלנית המצויה', mushroom: 'הפטריות', honeybee: 'דבורת הדבש', butterfly: 'הפרפר', harvesterant: 'נמלת הקציר',
  firefly: 'הגחלילית', jay: 'העורבני', blackbird: 'השחרור', chameleon: 'הזיקית המצויה', agama: 'החרדון המצוי',
  spinymouse: 'הקוצן המצוי', porcupine: 'הדורבן', hedgehog: 'הקיפוד', hyrax: 'שפן הסלע', gazelle: 'הצבי הארץ-ישראלי',
  fox: 'השועל המצוי', owl: 'התנשמת', hoopoe: 'הדוכיפת', tortoise: 'צב היבשה המצוי', chukar: 'חוגלת הסלעים',
  // reef
  branching: 'אלמוג השיח', brain: 'אלמוג המוח', table: 'אלמוג השולחן', firecoral: 'אלמוג האש', softcoral: 'האלמוג הרך',
  seafan: 'מניפת הים', sponge: 'הספוג', seaanemone: 'שושנת הים', clam: 'צדפת הענק', seagrass: 'עשב הים', algae: 'האצות',
  plankton: 'הפלנקטון', clownfish: 'השושנון', parrotfish: 'התוכינון', surgeonfish: 'המנתחן', cleaner: 'הנקאי',
  butterflyfish: 'הפרפרון', lionfish: 'הזהרון', moray: 'המורנה', grouper: 'הדקר', goby: 'הגובי', shrimp: 'החסילון',
  turtle: 'צב הים הירוק', octopus: 'התמנון', urchin: 'קיפוד הים', starfish: 'הקוצנון', stingray: 'חתול הים', hermit: 'סרטן הנזיר',
  jellyfish: 'המדוזה', reefshark: 'כריש השונית',
};
/** definite name of a species ("הקפוק"); falls back to ה + name */
export const defName = (id, name) => DEF[id] || (name ? 'ה' + name : String(id || ''));
/** definite name after a one-letter prefix: ב/ל/כ swallow the ה ("בקפוק", "לדבורת הדבש"), מ/ש/ו keep it ("מהלוטם") */
export const prefName = (prefix, id, name) => {
  const d = defName(id, name);
  return prefix + (/^[בלכ]$/.test(prefix) && d[0] === 'ה' ? d.slice(1) : d);
};
/** verb phrase + object species: "מאביק את" → "מאביק את הלוטם", "גר ב" → "גר בקפוק", "צד" → "צד קוצן מצוי" */
export const joinObj = (verb, id, name) => {
  const last = verb.split(' ').pop();
  if (last.length === 1) return verb.slice(0, -1) + prefName(last, id, name);
  if (last === 'את' || last === 'של' || last === 'עם') return verb + ' ' + defName(id, name);
  return verb + ' ' + (name || defName(id));
};

// ── Other forms of a name (plural / short / inflected) that appear in the cards – the "על מי מדובר?" quiz hides them too.
export const ALIASES = {
  glowfungus: ['פטריות שזוהרות', 'פטריות זוהרות', 'פטרייה זוהרת'],
  leafcutter: ['נמלים גוזרות', 'הנמלים הגוזרות', 'נמלה גוזרת', 'נמלים'],
  orchidbee: ['דבורות סחלבים', 'דבורות הסחלבים'],
  morpho: ['מורפו'],
  dartfrog: ['צפרדעי חץ', 'צפרדעי החץ'],
  toucan: ['טוקנים'],
  macaw: ['תוכי הארה', 'תוכי ארה', 'תוכים'],
  sloth: ['עצלנים'],
  howler: ['קופים יללנים', 'הקופים היללנים', 'קוף', 'קופים'],
  harpy: ['עיט ההרפיה', 'עיטים'],
  fruitbat: ['עטלפי הפירות', 'עטלפי פירות', 'עטלף הפירות', 'עטלפים', 'עטלף'],
  anteater: ['נמלן'],
  acai: ['אסאי'],
  waterlily: ['הוויקטוריה', 'וויקטוריה', 'ויקטוריה'],
  fig: ['פיקוס'],
  brazilnut: ['אגוז הברזיל', 'אגוזי ברזיל'],
  oak: ['אלון', 'אלונים'],
  carob: ['חרוב', 'חרובים'],
  pine: ['אורנים'],
  buckthorn: ['אשחר'],
  sage: ['מרווה'],
  cyclamen: ['רקפת', 'רקפות'],
  anemone: ['כלנית', 'כלניות'],
  mushroom: ['פטרייה', 'פטריות'],
  honeybee: ['דבורי הדבש', 'דבורי דבש', 'דבורת הדבש', 'דבורים', 'דבורה'],
  butterfly: ['פרפרים'],
  harvesterant: ['נמלי הקציר', 'נמלי קציר', 'נמלת הקציר', 'נמלים', 'נמלה'],
  firefly: ['גחליליות'],
  jay: ['עורבנים'],
  chameleon: ['זיקית', 'זיקיות'],
  agama: ['חרדון', 'חרדונים'],
  spinymouse: ['קוצן', 'קוצנים'],
  hedgehog: ['קיפודים'],
  hyrax: ['שפן הסלע', 'שפני סלע', 'שפני הסלע', 'שפן'],
  gazelle: ['צבי', 'צבאים'],
  fox: ['שועל', 'שועלים'],
  owl: ['תנשמות'],
  hoopoe: ['דוכיפות'],
  tortoise: ['צב היבשה', 'צב יבשה', 'צבי יבשה', 'צבים', 'צב'],
  chukar: ['חוגלה', 'חוגלות', 'חוגלת'],
  // tools
  nestbox: ['תיבות קינון'], drone: ['רחפן'], seeddrone: ['רחפן'], listener: ['מאזין היער'],
};
