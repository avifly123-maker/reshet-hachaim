// מחזיקים את היער – the fixed numbers and small helpers: the three places and their rows (the reef has rows of its own),
// which row a species grows in (layerRow), bird / insect / fish sets (tools that double their threads), the devices of
// each place (toolOk), the vitality needed for stars (STAR_T), deck sizes; rnd, shuffle, dn (definite name), mid (מים
// on land, מחסה at the reef), and every real relation between two species of a place (linksFor, cached per place).
// Exports: BIOMES, BNAME, ROWS, ROW_SHORT, ROWS_REEF, ROW_SHORT_REEF, ROW_SUB, layerRow, BIRDS, INSECTS, FISH,
//   toolOk, STAR_T, MIN_DECK, TOPUP, HAND, HAND_MAX, DECK_MAX, LAYER_NEED, rnd, shuffle, dn, mid, linksFor, late, moreLife.
// Needs: data/common.js (verbs and names).
import { defName, dietVerb, joinObj, relVerb } from '../../../data/common.js';

// vitality gained, said in words (no plus sign anywhere: it reads as a cross): "עוד נקודת חִיּוּת" / "עוד 3 נקודות חִיּוּת"
export const moreLife = (n) => (n === 1 ? 'עוד נקודת חִיּוּת' : `עוד ${n} נקודות חִיּוּת`);

export const BIOMES = ['amazon', 'grove', 'reef', 'desert'];
export const BNAME = { amazon: 'אמזונס', grove: 'חורש', reef: 'שונית', desert: 'מדבר' };
export const ROWS = ['חופה', 'קומת ביניים', 'קרקע'];
export const ROW_SHORT = ['חופה', 'ביניים', 'קרקע'];
// the reef has its own three rows: shallow water (corals that love light), the slope, the sea floor
export const ROWS_REEF = ['מים רדודים', 'מדרון השונית', 'קרקעית'];
export const ROW_SHORT_REEF = ['רדודים', 'מדרון', 'קרקעית'];
export const ROW_SUB = { amazon: ['עצים גבוהים ומטפסים', 'דקלים ושיחים', 'שרכים, פטריות ומים'], grove: ['עצי החורש', 'שיחים', 'פרחים ופטריות'], reef: ['אלמוגים שאוהבים הרבה אור', 'אלמוגים רכים ומניפות ים', 'עשב ים, אצות וספוגים'], desert: ['עצים וקקטוסים גבוהים', 'שיחים', 'צמחים קטנים וקרום האדמה'] };
// the desert keeps an oasis alive: its rows are the tall trees, the shrubs and the ground
export const ROWS_DESERT = ['עצים גבוהים', 'קומת השיחים', 'קרקע'];
export const ROW_SHORT_DESERT = ['עצים', 'שיחים', 'קרקע'];
// the forest's words said for the desert's oasis (both masculine): היער → נווה המדבר, ביער → בנווה המדבר, יער → נווה מדבר
const OASIS = [[/עצי החופה/g, 'העצים הגבוהים'], [/בקומת הביניים/g, 'בקומת השיחים'], [/קומת הביניים/g, 'קומת השיחים'], [/בביניים/g, 'בשיחים'],
  [/(?<![א-ת])ביניים(?![א-ת])/g, 'שיחים'], [/בחופה/g, 'בקומת העצים'], [/(?<![א-ת])חופה(?![א-ת])/g, 'עצים'], [/שומר היער/g, 'שומר הנווה'],
  [/(?<![א-ת])(ו?(?:כש|ש|מ)?)היער(?![א-ת])/g, '$1נווה המדבר'], [/(?<![א-ת])(ו?[בל])יער(?![א-ת])/g, '$1נווה המדבר'], [/(?<![א-ת])יער(?![א-ת])/g, 'נווה מדבר']];
export const oasisWords = (t) => OASIS.reduce((s, [a, b]) => s.replace(a, b), t);
const LAYER_ROW = { emergent: 0, canopy: 0, understory: 1, floor: 2, water: 2, shallow: 0, open: 0, slope: 1, sand: 2 };
// a few reef species get a row of their own in this game, so every row has a few fixed cards (all of these do live there)
const KF_ROW = { 'reef:brain': 1, 'reef:seaanemone': 1, 'reef:sponge': 2, 'reef:algae': 2 };
export const layerRow = (sp) => KF_ROW[sp.key] ?? LAYER_ROW[sp.layer];
export const BIRDS = new Set(['toucan', 'macaw', 'hummingbird', 'harpy', 'jay', 'blackbird', 'owl', 'hoopoe', 'chukar']);
export const INSECTS = new Set(['leafcutter', 'orchidbee', 'morpho', 'honeybee', 'butterfly', 'harvesterant', 'firefly']);
export const DESERT_DEV = new Set(['drip', 'fognet', 'sandfence']);
export const FISH = new Set(['clownfish', 'parrotfish', 'surgeonfish', 'cleaner', 'butterflyfish', 'lionfish', 'moray', 'grouper', 'goby', 'stingray', 'reefshark']);
// the shared devices have a reef look of their own (רובוט צולל, מצלמה תת־ימית, מצוף חיישנים), so the dry-land ones stay out of the reef
const LAND_TWIN = new Set(['drone', 'camera', 'weather']);
export const toolOk = (c, b) => (c.tool.zones ? c.tool.zones.includes(b) : !(b === 'reef' && LAND_TWIN.has(c.tool.id)));
// the desert's own devices in the hand (drip, fog net, sand fence) and its starter devices
export const STARTER_TOOLS = { reef: ['tool:buoy', 'tool:nursery', 'tool:rov'], desert: ['tool:drip', 'tool:sandfence', 'tool:seeddrone'] };
export const starterTools = (b) => STARTER_TOOLS[b] || ['tool:watergen', 'tool:listener', 'tool:seeddrone'];
// vitality needed at the end: [1 star (= the forest held on), 2 stars, 3 stars]. Below the first one the run is lost.
export const STAR_T = { full: [10, 15, 21], kids: [6, 10, 15] }; // raised with the rarity powers (keystones + rare bonus), see sim()
export const MIN_DECK = 12, TOPUP = 14, HAND = 4, HAND_MAX = 6;
export const DECK_MAX = 20; // a big album is trimmed to a well-connected deck for one run
export const LAYER_NEED = [2, 2, 2]; // plants per forest layer a deck should hold (missing ones are borrowed)

/* ───────────────────────────── helpers */
export const rnd = (n) => Math.floor(Math.random() * n);
export function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export const dn = (c) => defName(c.sp ? c.sp.id : c.id, c.name); // definite name of a card / species: "הקפוק"
const pk = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
// the middle number of a card: מים on land, מחסה at the reef (in the sea there is always water)
export const mid = (c) => c.stats.water ?? c.stats.shelter ?? 0;

// every real relation between two species of a biome (both directions), one sentence per pair
const LINKS = new Map();
export function linksFor(ctx, biome) {
  if (LINKS.has(biome)) return LINKS.get(biome);
  const sp = ctx.SP.filter((s) => s.biome === biome);
  const by = new Map(sp.map((s) => [s.id, s]));
  const pairs = new Map(); const deg = new Map(sp.map((s) => [s.id, 0]));
  const add = (a, b, text, type) => {
    if (a === b || !by.has(a) || !by.has(b) || !text) return;
    const k = pk(a, b); const cur = pairs.get(k);
    if (!cur) { deg.set(a, deg.get(a) + 1); deg.set(b, deg.get(b) + 1); }
    if (!cur || (cur.type === 'eats' && type !== 'eats')) pairs.set(k, { a, b, text, type });
  };
  for (const s of sp) for (const r of s.relations || []) {
    const t = by.get(r.target); if (!t) continue;
    const verb = relVerb(r.type, s.id);
    add(s.id, r.target, r.text || `${defName(s.id, s.name)} ${joinObj(verb, t.id, t.name)}.`, r.type);
  }
  for (const s of sp) for (const d of s.diet || []) {
    const t = by.get(d.id); if (!t) continue;
    add(s.id, d.id, d.text || `${defName(s.id, s.name)} ${joinObj(dietVerb(d.part, s.id), t.id, t.name)}.`, 'eats');
  }
  const res = { by, get: (a, b) => pairs.get(pk(a, b)) || null, deg: (id) => deg.get(id) || 0 };
  LINKS.set(biome, res);
  return res;
}

// a function of a later part of the game, looked up in K when it is called (all parts exist before anything runs)
export const late = (K, name) => (...args) => K[name](...args);
