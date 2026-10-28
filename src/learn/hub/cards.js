// מרכז הלמידה – the cards: every species of the three zones (SP) with its numbers, the device cards, and the album
// sets ("סדרות"). Built once when the hub pack loads.
// Exports: SP, SPK, spOf, animalsIn, TOOL_SHORT, CARDS, CARD, the sets (SETS, SET_BY, SET_WHERE, activeSets, setsOf)
// and IC_SCROLL (the scroll icon of the torah edition).
// Needs: the zone data, thumbnails and card paintings, the devices (game/tool-defs.js), the torah sets (data/torah.js).
import { TORAH, sourcesOn } from '../../core/edition.js';
import { CARD_ART } from '../../data/card-art.js';
import { KINDS } from '../../data/common.js';
import { THUMBS } from '../../data/thumbs.js';
import { SHIRA_SET, SOURCE_CARDS, SOURCE_SETS, TZVI_SET } from '../../data/torah.js';
import { REEF_TOOL_CARDS, TOOL_DEFS, TOOL_ICONS } from '../../game/tool-defs.js';
import { BIOMES, IC, KEYS_LAND, KEYS_REEF, clamp, firstSentence, sv } from './base.js';
import { ZONE_IDS } from '../../data/zones.js';

/* ───────────────────────────────────────────── data → species + cards */
const isAnimalKind = (k) => k === 'animal' || k === 'colony' || k === 'swarm';
export const SP = [];
for (const bid of ZONE_IDS) {
  for (const s of BIOMES[bid].species) {
    // the reef has no rendered thumbnails yet: its card painting stands in for them
    SP.push({ ...s, biome: bid, key: bid + ':' + s.id, animal: isAnimalKind(s.kind) || s.showAs === 'animal', img: (THUMBS[bid] || {})[s.id] || (!THUMBS[bid] ? CARD_ART[s.id] || '' : '') });
  }
}
export const SPK = new Map(SP.map((s) => [s.key, s]));
export const spOf = (biome, id) => SPK.get(biome + ':' + id);
export const animalsIn = (b) => SP.filter((s) => s.biome === b && s.animal);

// connection count: own relations + diet + incoming relations + being eaten
const LINKS = new Map(SP.map((s) => [s.key, 0]));
for (const s of SP) {
  const add = (id) => { const t = spOf(s.biome, id); if (t) LINKS.set(t.key, LINKS.get(t.key) + 1); };
  const own = (s.relations || []).filter((r) => spOf(s.biome, r.target)).length + (s.diet || []).filter((d) => spOf(s.biome, d.id)).length;
  LINKS.set(s.key, LINKS.get(s.key) + own);
  for (const r of s.relations || []) add(r.target);
  for (const d of s.diet || []) add(d.id);
}

const KEYSTONE = new Set(['amazon:kapok', 'amazon:fig', 'amazon:brazilnut', 'amazon:glowfungus', 'grove:oak', 'grove:honeybee', 'grove:firefly',
  'reef:branching', 'reef:parrotfish', 'reef:seaanemone', 'reef:cleaner']);
const LAYER_LIGHT = { emergent: 5, canopy: 4, water: 4, understory: 3, floor: 2, shallow: 5, slope: 3, sand: 4, open: 4 };
const WATER_OVR = { 'amazon:dartfrog': 5, 'amazon:capybara': 5, 'amazon:waterlily': 5, 'amazon:bromeliad': 5, 'amazon:tapir': 5,
  'grove:hyrax': 1, 'grove:agama': 1, 'grove:sage': 1, 'grove:rockrose': 1, 'grove:gazelle': 1, 'grove:carob': 1, 'grove:pine': 1, 'grove:cyclamen': 3, 'grove:firefly': 3, 'grove:mushroom': 4 };
// מחסה for the reef: how much home a species gives others (anemone for the clownfish, table and brain corals for the fish that hide
// under them, a seagrass meadow for young fish, the shrimp's burrow for the goby, fish that hide among urchin spines); 1 when it gives none
const SHELTER = { branching: 5, table: 5, seaanemone: 5, brain: 4, seagrass: 4, shrimp: 4, softcoral: 3, firecoral: 3, sponge: 3,
  seafan: 2, algae: 2, urchin: 2, jellyfish: 2, reefball: 5, nursery: 4, buoy: 2 };
const TOOL_STATS = {
  drone: [4, 2, 5], camera: [2, 2, 4], rescue: [3, 3, 3], watergen: [3, 5, 2], seeddrone: [4, 3, 4],
  listener: [5, 2, 3], nestbox: [3, 1, 4], insecthotel: [4, 1, 5], weather: [4, 4, 3],
  nursery: [4, 4, 4], reefball: [3, 5, 5], buoy: [3, 2, 3], rov: [3, 1, 5], uwcam: [2, 1, 4], sensor: [4, 1, 3],
};
export const TOOL_SHORT = {
  drone: 'טס מעל היער וסופר צמחים ובעלי חיים', camera: 'מצלמת בעלי חיים שעוברים לידה, גם בלילה',
  rescue: 'מטפל בבעל חיים פגוע ומחזיר אותו לטבע', watergen: 'אוסף טיפות מים מתוך האוויר',
  seeddrone: 'מפזר כדורי זרעים על אדמה חשופה', listener: 'שומע מסור חשמלי ושולח התרעה',
  nestbox: 'בית מעץ שבו ציפורים מקננות', insecthotel: 'מחסה לדבורי בר ולפרפרים', weather: 'מודדת רוח, חום ולחות ומזהירה מראש',
  nursery: 'מגדלת שברי אלמוג ושותלת אותם בשונית', reefball: 'כיפת בטון עם חורים, בית לדגים ולאלמוגים', buoy: 'הסירות נקשרות אליו ולא מטילות עוגן',
  rov: 'צולל לאורך השונית וסופר דגים ואלמוגים', uwcam: 'מצלמת דגים מתוך קופסה אטומה למים', sensor: 'מודד את חום המים ומזהיר מראש',
};

function speciesStats(s) {
  let light;
  if (!s.animal) light = s.kind === 'fungus' ? 1 : clamp(Math.round((s.lightNeed || 0) * 5), 1, 5);
  else light = clamp((LAYER_LIGHT[s.layer] || 3) - (s.active === 'night' ? 2 : 0) + (s.locomotion === 'flying' && s.active !== 'night' ? 1 : 0), 1, 5);
  let water = WATER_OVR[s.key];
  if (water == null) {
    water = s.biome === 'reef' ? 5 : s.biome === 'amazon' ? 4 : 2;
    if (s.kind === 'water-plant' || s.layer === 'water' || (s.needs && s.needs.water)) water = 5;
    if (s.kind === 'fungus' || s.kind === 'epiphyte') water += 1;
    if (s.needs && s.needs.rocks) water -= 1;
    if (s.biome === 'grove' && s.kind === 'herb') water += 1;
    water = clamp(water, 1, 5);
  }
  const n = LINKS.get(s.key) || 0;
  const links = clamp(1 + Math.floor(n / 2), 1, 5);
  if (s.biome === 'reef') return { light, shelter: SHELTER[s.id] || 1, links, n };
  return { light, water, links, n };
}
function rarityOf(s, st) {
  if (KEYSTONE.has(s.key) || (s.diet || []).some((d) => d.part === 'animals')) return 'epic';
  if (s.kind === 'tree' || s.kind === 'palm' || st.n >= 5 || s.active === 'night') return 'rare';
  return 'common';
}
export const CARDS = [];
for (const s of SP) {
  const st = speciesStats(s);
  CARDS.push({ id: s.key, type: 'species', sp: s, biome: s.biome, name: s.name, img: s.img, art: CARD_ART[s.id] || '', color: s.color || '#7fae4f',
    kind: KINDS[s.kind] || '', rarity: rarityOf(s, st), stats: s.biome === 'reef' ? { light: st.light, shelter: st.shelter, links: st.links } : { light: st.light, water: st.water, links: st.links }, sk: s.biome === 'reef' ? KEYS_REEF : KEYS_LAND,
    short: firstSentence(s.fact), fact: s.fact });
}
// a device that lives only in the reef gets מחסה too
function toolStats(t, st) {
  const reef = t.zones && t.zones.length === 1 && t.zones[0] === 'reef';
  return reef ? { stats: { light: st[0], shelter: st[1], links: st[2] }, sk: KEYS_REEF } : { stats: { light: st[0], water: st[1], links: st[2] }, sk: KEYS_LAND };
}
for (const t of TOOL_DEFS) {
  const st = TOOL_STATS[t.id] || [3, 3, 3];
  CARDS.push({ id: 'tool:' + t.id, type: 'tool', tool: t, biome: null, name: t.name, img: TOOL_ICONS[t.id] || '', art: CARD_ART[t.id] || '', color: t.color || '#4aa3d6',
    kind: 'כלי טכנולוגי', rarity: 'tech', ...toolStats(t, st), short: firstSentence(t.fact), fact: t.fact });
}
// the reef's own versions of the shared devices get cards of their own
for (const t of REEF_TOOL_CARDS) {
  const st = TOOL_STATS[t.id] || [3, 3, 3];
  CARDS.push({ id: 'tool:' + t.id, type: 'tool', tool: t, biome: null, name: t.name, img: TOOL_ICONS[t.id] || '', art: CARD_ART[t.id] || '', color: t.color || '#2a8ac0',
    kind: 'כלי טכנולוגי', rarity: 'tech', ...toolStats(t, st), short: firstSentence(t.fact), fact: t.fact });
}
export const CARD = new Map(CARDS.map((c) => [c.id, c]));

/* ───────────────────────────────────────────── album sets ("סדרות") */
// Each set is derived from the species data where possible (relations / diet / kind / active / needs).
// Collecting a whole set gives one free card pack, once per player (S.sets[id] = true).
const hasRel = (s, type) => (s.relations || []).some((r) => r.type === type);
const linkedTo = (s, id) => s.id === id || (s.relations || []).some((r) => r.target === id) || (s.diet || []).some((d) => d.id === id)
  || ((SP.find((o) => o.biome === s.biome && o.id === id) || {}).relations || []).some((r) => r.target === s.id);
const SET_IC = {
  wing: sv('<path d="M2.8 15.5C6 8.3 11.6 4.4 21.2 4c-.8 6.6-5.2 11.4-11.6 12.3-2.6.4-4.9.1-6.8-.8z" fill="currentColor"/><path d="M7.5 13.6c3.2-2.2 6.6-4.3 10.6-6.2M9.6 15.8l3-3.6" stroke="#fff" stroke-opacity=".5" stroke-width="1.4" fill="none" stroke-linecap="round"/>'),
  rock: sv('<path d="M2.5 19.5l3.8-7.4 4.3-2.8 3.2 2.1 3.6-1.6 4.1 9.7z" fill="currentColor"/><path d="M10.6 9.3l1.4 4.4M16.9 9.8l-1.1 3.6" stroke="#fff" stroke-opacity=".45" stroke-width="1.4" fill="none" stroke-linecap="round"/>'),
  eye: sv('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" fill="currentColor"/><circle cx="12" cy="12" r="3.2" fill="#fff"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>'),
  heart: sv('<path d="M12 20.5S3.2 15 3.2 8.9A4.6 4.6 0 0 1 12 6.6a4.6 4.6 0 0 1 8.8 2.3C20.8 15 12 20.5 12 20.5z" fill="currentColor"/>'),
};
const SET_DEFS = [
  { id: 'pollinators', name: 'מאביקים', where: 'both', col: '#d98e26', ic: IC.flower, sub: 'מעבירים אבקה מפרח לפרח',
    sp: (s) => s.animal && (hasRel(s, 'pollinates') || (s.diet || []).some((d) => d.part === 'nectar')) },
  { id: 'seeds', name: 'מפיצי זרעים', where: 'amazon', col: '#5f9a3e', ic: IC.seed, sub: 'מפזרים זרעים – וכך גדלים עצים חדשים',
    sp: (s) => s.biome === 'amazon' && hasRel(s, 'disperses') },
  { id: 'giants', name: 'ענקי היער', where: 'both', col: '#2f7a5a', ic: IC.tree, sub: 'העצים הגדולים של שני היערות',
    sp: (s) => s.kind === 'tree' },
  { id: 'wings', name: 'בעלי כנף', where: 'amazon', col: '#3b8fb8', ic: SET_IC.wing, sub: 'עפים בין העצים של יער הגשם',
    sp: (s) => s.biome === 'amazon' && s.animal && s.locomotion === 'flying' },
  { id: 'night', name: 'פעילים בלילה', where: 'grove', col: '#5b4a8f', ic: IC.moon, sub: 'יוצאים לדרך כשהחורש נרדם',
    sp: (s) => s.biome === 'grove' && s.active === 'night' },
  { id: 'rocks', name: 'בין הסלעים', where: 'grove', col: '#9a7a2e', ic: SET_IC.rock, sub: 'גרים וגדלים בין סלעי החורש',
    sp: (s) => s.biome === 'grove' && !!(s.needs && s.needs.rocks) },
  { id: 'oak', name: 'סביב האלון', where: 'grove', col: '#7a5530', ic: IC.leaf, sub: 'האלון הוא מין מפתח – כל אלה קשורים אליו',
    sp: (s) => s.biome === 'grove' && linkedTo(s, 'oak') },
  { id: 'reefbuilders', name: 'בוני השונית', where: 'reef', col: '#c85a8a', ic: IC.leaf, sub: 'האלמוגים בונים את השונית, פוליפ אחרי פוליפ',
    sp: (s) => s.biome === 'reef' && s.kind === 'coral' },
  { id: 'reefpartners', name: 'שותפים בשונית', where: 'reef', col: '#2a9ab8', ic: SET_IC.heart, sub: 'חיים יחד ועוזרים זה לזה',
    sp: (s) => s.biome === 'reef' && ['clownfish', 'seaanemone', 'goby', 'shrimp', 'cleaner', 'grouper', 'moray'].includes(s.id) },
  { id: 'reefguards', name: 'שומרי השונית', where: 'tech', col: '#1f6f9a', ic: SET_IC.eye, sub: 'טכנולוגיה מתחת למים',
    tools: ['rov', 'uwcam', 'sensor', 'nursery', 'reefball', 'buoy'] },
  { id: 'watchers', name: 'שומרי היער', where: 'tech', col: '#2c5f8f', ic: SET_IC.eye, sub: 'רואים, שומעים ומזהירים בזמן',
    tools: ['drone', 'camera', 'listener', 'weather'] },
  { id: 'helpers', name: 'עוזרים לטבע', where: 'tech', col: '#c8473a', ic: SET_IC.heart, sub: 'מחזירים לטבע חיים, מים ובית',
    tools: ['rescue', 'seeddrone', 'watergen', 'nestbox', 'insecthotel'] },
];
export const SETS = SET_DEFS.map((d) => ({ ...d,
  cards: d.tools ? d.tools.map((t) => CARD.get('tool:' + t)).filter(Boolean) : CARDS.filter((c) => c.type === 'species' && d.sp(c.sp)) }));
// torah edition: two more sets from the sources (shown only while "מקורות ופסוקים" is on)
export const IC_SCROLL = sv('<path d="M6 4h10.5A2.5 2.5 0 0 1 19 6.5V18a2 2 0 0 1-2 2H7.5A2.5 2.5 0 0 1 5 17.5V5a1 1 0 0 1 1-1z" fill="currentColor"/><path d="M8.5 8.5h7M8.5 11.5h7M8.5 14.5h4.5" stroke="#fff" stroke-opacity=".6" stroke-width="1.5" stroke-linecap="round"/>');
if (TORAH) for (const d of [SHIRA_SET, TZVI_SET]) SETS.push({ ...d, torah: true, ic: d.id === 'shira' ? IC_SCROLL : IC.paw, cards: d.cards.map((id) => CARD.get(id)).filter(Boolean) });
// and the source cards themselves in five sets (SOURCE_SETS): their cards are SOURCE_CARDS, owned in core/sources-store.js
const SRC_BY = new Map(SOURCE_CARDS.map((c) => [c.id, c]));
if (TORAH) for (const d of SOURCE_SETS) SETS.push({ ...d, where: 'src', torah: true, src: true, ic: IC_SCROLL, cards: d.cards.map((id) => SRC_BY.get(id)).filter(Boolean) });
export const activeSets = () => SETS.filter((st) => !st.torah || sourcesOn());
export const SET_BY = new Map(SETS.map((st) => [st.id, st]));
export const setsOf = (id) => activeSets().filter((st) => st.cards.some((c) => c.id === id));
export const SET_WHERE = { amazon: 'אמזונס', grove: 'חורש', reef: 'שונית', both: 'שני היערות', tech: 'טכנולוגיה', src: 'מן המקורות' };
// sanity check (dev console): 4–8 cards, and a rare or very rare card in every species set
for (const st of SETS) {
  if (st.torah) continue;
  if (st.cards.length < 4 || st.cards.length > 8) console.warn('album set size', st.id, st.cards.length);
  if (!st.tools && !st.cards.some((c) => c.rarity === 'rare' || c.rarity === 'epic')) console.warn('album set without a rare card', st.id);
}
