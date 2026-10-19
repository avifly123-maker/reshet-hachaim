// רשת החיים – מרכז הלמידה (learning hub): trivia quiz + TCG-style card album + "מי חזק ברשת?" duel.
// Self-contained DOM overlay (no WebGL, no network). CSS injected once, scoped under #wol-learn.wol-learn.
//
// export function createLearningHub(rootEl, { onClose, audio }) → { open(), close(), isOpen(), grantPack(n) }
// Also exposes window.__wolLearn = { open, close, isOpen, grantPack(n), _go(screen, opts), _state() }.
// Persistence: localStorage 'web-of-life-cards::<player>' (optional – everything works without it). Each player
// (core/profiles.js) has their own album; the state is re-read from the current player's key every time the hub opens.
import { BIOME as AMAZON } from '../data/amazon.js';
import { BIOME as GROVE } from '../data/grove.js';
import { BIOME as REEF } from '../data/reef.js';
import { DIET_PARTS, ACTIVE_NAMES, KINDS } from '../data/common.js';
import { THUMBS } from '../data/thumbs.js';
import { TOOL_DEFS, TOOL_ICONS, REEF_TOOL_CARDS } from '../game/tools.js';
import { BABA_DA_LOGO } from '../data/logo.js';
import { CARD_ART } from '../data/card-art.js';
import { artPos } from '../data/art-focus.js';
import { PACK_ART } from '../data/pack-art.js';
import { SOURCE_ART } from '../data/source-art.js';
import { TORAH, sourcesOn, setSourcesOn } from '../core/edition.js';
import { SHIRA, SHIRA_SET, TZVI_SET, SOURCE_CARDS, EARN_TEXT } from '../data/torah.js';
import { TQUIZ_ALL } from '../data/torah-quiz.js';   // torah.js TQUIZ + the larger bank of "מן המקורות" questions
import { QBANK } from '../data/quiz-bank.js';        // hand-written quiz questions, mixed into every round
import { ownedSources, grantSource } from '../core/sources-store.js';
import { grant as grantBadge, tally as badgeTally, hasBadge, ownedBadges, openFrames, chosenFrame, chooseFrame, groupCount } from '../core/badges-store.js';
import { BADGES, BADGE_GROUPS, FRAMES } from '../data/badges.js';
import { badgeHTML, BADGE_CSS } from '../ui/badge-art.js';
import { mountWebPuzzle } from './games/web-puzzle.js';
import { mountKeepForest } from './games/keep-forest.js';
import { mountInventors } from './games/inventors.js';
import { mountExpedition } from './games/expedition.js';
import { RELATION_TYPES, DIET_VERBS, gw, activeNameFor, ALIASES, defName } from '../data/common.js';
import { key as profileKey, current as currentPlayer } from '../core/profiles.js';
import { avatarHTML } from '../ui/avatars.js';

const STORE_KEY = 'web-of-life-cards';
const ROUND = 10;
// card packs are a treat, not a flood: a right answer brings one only now and then (at most 2 a round)
const PACK_CHANCE = 0.22;
const QUIZ_PACKS_MAX = 2;
const DUEL_PACKS_PER_DAY = 2;
const START_PACKS = 3;   // a new player starts with 3 packs as a welcome gift
// packs can be earned without limit, but only OPEN_PER_DAY are opened a day: the album should last more than a day
const OPEN_PER_DAY = 6;
const todayKey = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
const BIOMES = { amazon: AMAZON, grove: GROVE, reef: REEF };
const BIOME_SHORT = { amazon: 'אמזונס', grove: 'חורש', reef: 'שונית' };
const BIOME_IN = { amazon: 'ביער הגשם של האמזונס', grove: 'בחורש הארץ-ישראלי', reef: 'בשונית האלמוגים של אילת' };
// reef cards show מחסה instead of מים: in the sea there is always water (Avi, 18.10), but a reef is a city of homes
const STAT_NAMES = { light: 'אור', water: 'מים', shelter: 'מחסה', links: 'קשרים' };
const STAT_HELP = { light: 'כמה אור צריך', water: 'כמה מים ולחות', shelter: 'כמה בית ומחסה נותן לאחרים', links: 'עם כמה יצורים יש קשר' };
const KEYS_LAND = ['light', 'water', 'links'], KEYS_REEF = ['light', 'shelter', 'links'];
const RARITY_NAMES = { common: 'נפוץ', rare: 'נדיר', epic: 'נדיר מאוד', tech: 'טכנולוגיה' };
const RARITY_GEMS = { common: 1, rare: 2, epic: 3 };
// what the rarity means, in a child's words (tooltips, zoom, the "מה רואים על הקלף?" legend)
const RARITY_TIP = {
  common: 'קלף נפוץ – יהלום נדירות 1 מתוך 3',
  rare: 'קלף נדיר – 2 יהלומי נדירות מתוך 3. במשחק "מחזיקים את היער" – בונוס קטן',
  epic: 'קלף נדיר מאוד – מין מפתח! 3 יהלומי נדירות מתוך 3. כוח מיוחד במשחק "מחזיקים את היער"',
  tech: 'כלי טכנולוגי (גלגל שיניים) – לא יצור חי',
};
const RARITY_MORE = {
  common: 'קל למצוא אותו בחבילות.',
  rare: 'קשה יותר למצוא אותו בחבילות.',
  epic: 'מוצאים אותו רק לפעמים בחבילות – שמרו עליו!',
  tech: 'כלים עוזרים לאנשים לשמור על הטבע.',
};
// what the rarity does in "מחזיקים את היער" (keep-forest.js): a keystone guards the forest once, a rare card gives +1
const RARITY_POWER = {
  rare: 'במשחק "מחזיקים את היער": אם הוא מתחבר בחוט זהב כשמניחים אותו – עוד \u2066+1\u2069 חִיּוּת.',
  epic: 'מין מפתח – הרבה יצורים צריכים אותו. במשחק "מחזיקים את היער" הוא שומר על היער פעם אחת, כשהיער לא מוכן לאירוע.',
};

/* ───────────────────────────────────────────── helpers */
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rnd(a.length)];
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const sample = (a, n) => shuffle(a).slice(0, n);
const uniq = (a) => [...new Set(a)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function firstSentence(t) { const m = String(t || '').match(/^.*?[.!?](?=\s|$)/); return m ? m[0] : String(t || ''); }
function rgba(hex, a) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return `rgba(127,174,79,${a})`;
  const n = parseInt(m[1], 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const MASK_STOP = new Set(['מצוי', 'מצויה', 'ענק', 'ענקית', 'של', 'ארץ-ישראלי', 'ארץ-ישראלית', 'אמזונית']);
// everyday words that are part of some names – never hidden on their own (they are not a clue to the name)
const MASK_GENERIC = new Set(['מים', 'עלים', 'עלה', 'פירות', 'פרי', 'זרעים', 'זרע', 'דבש', 'עץ', 'עצים', 'פרח', 'פרחים', 'סלע', 'סלעים',
  'יבשה', 'אוויר', 'מהאוויר', 'יער', 'שטח', 'חרקים', 'קציר', 'ירושלים', 'קינון', 'מזג', 'תחנת', 'זריעה', 'ניטור', 'הצלה']);
const MB = '(^|[\\s("\'״־–-])([והשלבמכ]{0,3})', ME = '(?=$|[\\s.,!?:;)"\'״־–-])';
// keep the prefix letters ("ל___", "ש___"), only the definite ה goes with the name ("ה___" → "___")
const keepPrefix = (pre, b) => b + pre.replace(/ה$/, '');
const nameRe = (form) => new RegExp(MB + form.split(/\s+/).map(reEsc).join('\\s+ה?') + ME, 'g');
const maskWords = (name, aliases) => uniq([name, ...aliases].flatMap((f) => f.split(/\s+/)))
  .filter((w) => w.length >= 3 && !MASK_STOP.has(w) && !MASK_GENERIC.has(w));
const stemOf = (w) => (w.length >= 6 ? w.slice(0, -2) : w.length >= 4 ? w.slice(0, -1) : w);
function maskName(text, name, id) {
  const aliases = ALIASES[id] || [];
  let out = String(text || '');
  // 1) the full name and its other forms, longest first (each later word may carry its own ה: "האלון המצוי")
  const forms = uniq([name, ...aliases]).sort((x, y) => y.length - x.length);
  for (const f of forms) out = out.replace(nameRe(f), (m, b, pre) => keepPrefix(pre, b) + '___');
  // 2) if nothing was hidden, hide the distinctive words of the name (never everyday words like מים / עלים)
  if (!out.includes('___')) {
    for (const w of maskWords(name, []).sort((x, y) => y.length - x.length)) out = out.replace(nameRe(w), (m, b, pre) => keepPrefix(pre, b) + '___');
  }
  return out.replace(/___(\s+___)+/g, '___');
}
/** does the (masked) text still show the name – a word that starts with the stem of a distinctive name word? */
function leaksName(text, name, id) {
  return maskWords(name, ALIASES[id] || []).some((w) => new RegExp(MB + reEsc(stemOf(w))).test(text));
}

/* ───────────────────────────────────────────── icons (inline SVG, no emoji-only meaning) */
const sv = (body, vb = '0 0 24 24') => `<svg class="wl-ic" viewBox="${vb}" aria-hidden="true">${body}</svg>`;
const IC = {
  sun: sv('<circle cx="12" cy="12" r="4.6" fill="currentColor"/><path d="M12 2.2v2.6M12 19.2v2.6M2.2 12h2.6M19.2 12h2.6M5 5l1.8 1.8M17.2 17.2L19 19M5 19l1.8-1.8M17.2 6.8L19 5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" fill="none"/>'),
  moon: sv('<path d="M19.8 14.6A8.3 8.3 0 1 1 9.4 4.2a6.6 6.6 0 0 0 10.4 10.4z" fill="currentColor"/><circle cx="17" cy="5" r="1.2" fill="currentColor"/>'),
  drop: sv('<path d="M12 2.6C8.2 8 5.6 11.4 5.6 14.7a6.4 6.4 0 0 0 12.8 0C18.4 11.4 15.8 8 12 2.6z" fill="currentColor"/><path d="M9.2 14.6a3 3 0 0 0 2.6 3" stroke="#fff" stroke-opacity=".55" stroke-width="1.6" fill="none" stroke-linecap="round"/>'),
  web: sv('<path d="M12 5L5 17.5M12 5l7 12.5M5 17.5h14M12 5v7M5 17.5L12 12l7 5.5" stroke="currentColor" stroke-width="1.7" fill="none"/><g fill="currentColor"><circle cx="12" cy="5" r="2.7"/><circle cx="5" cy="17.5" r="2.7"/><circle cx="19" cy="17.5" r="2.7"/><circle cx="12" cy="12" r="2.1"/></g>'),
  leaf: sv('<path d="M4.5 19.5C3.6 11 9 4 20.5 3.6 20.8 14.8 13.6 20.4 4.5 19.5z" fill="currentColor"/><path d="M4.5 19.5L14.5 9.5" stroke="#000" stroke-opacity=".22" stroke-width="1.5" fill="none" stroke-linecap="round"/>'),
  star: sv('<path d="M12 2.6l2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.2l-5.8 3.2 1.2-6.5-4.8-4.5 6.5-.8z" fill="currentColor"/>'),
  pack: sv('<rect x="4.5" y="2.8" width="15" height="18.4" rx="2.6" fill="currentColor"/><path d="M4.5 7.6l7.5 3.6 7.5-3.6" stroke="#fff" stroke-opacity=".6" stroke-width="1.5" fill="none"/><circle cx="12" cy="11.4" r="2.3" fill="#fff" fill-opacity=".75"/>'),
  back: sv('<path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  next: sv('<path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  check: sv('<path d="M4.5 12.5l4.8 4.8L19.5 7" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  cross: sv('<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2.4" fill="none"/><path d="M8 12h8" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>'),   // "wrong": no X anywhere
  quest: sv('<circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M9 9.2a3 3 0 1 1 4.4 2.7c-1 .5-1.4 1.1-1.4 2.2v.6" stroke="#fff" stroke-width="2.3" fill="none" stroke-linecap="round"/><circle cx="12" cy="18" r="1.4" fill="#fff"/>'),
  cards: sv('<rect x="3" y="5.5" width="11" height="15" rx="2" fill="currentColor" opacity=".55" transform="rotate(-8 8.5 13)"/><rect x="9.5" y="3.5" width="11" height="15" rx="2" fill="currentColor" transform="rotate(7 15 11)"/>'),
  versus: sv('<rect x="2.5" y="5" width="8.5" height="12" rx="1.8" fill="currentColor" opacity=".6"/><rect x="13" y="7" width="8.5" height="12" rx="1.8" fill="currentColor"/><path d="M12.6 2.5l-2 5h2.4l-1.8 5" stroke="#f0b44c" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  seedling: sv('<path d="M12 21v-8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M12 13C12 8.5 9 6 4 6c0 4.5 3 7 8 7zM12 11.5c0-4 2.6-6.6 7.5-6.6 0 4-2.6 6.6-7.5 6.6z" fill="currentColor"/>'),
  tree: sv('<path d="M12 22v-6" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="9" r="6" fill="currentColor"/><circle cx="7" cy="12.5" r="4" fill="currentColor"/><circle cx="17" cy="12.5" r="4" fill="currentColor"/>'),
  globe: sv('<circle cx="8" cy="12" r="6.5" fill="currentColor" opacity=".55"/><circle cx="16" cy="12" r="6.5" fill="currentColor"/>'),
  rain: sv('<path d="M6.5 13.5a4 4 0 0 1 .6-8 5.2 5.2 0 0 1 9.9 1.3 3.4 3.4 0 0 1 .4 6.7z" fill="currentColor"/><path d="M8 16.5l-1 3M12 16.5l-1 3M16 16.5l-1 3" stroke="#3aa8e8" stroke-width="2" stroke-linecap="round"/>'),
  // diet parts
  fruit: sv('<path d="M12 7c0-2 1-3.6 3-4.4" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/><circle cx="8.6" cy="14" r="5" fill="currentColor"/><circle cx="15.6" cy="13.2" r="5" fill="currentColor" opacity=".75"/>'),
  flower: sv('<g fill="currentColor"><circle cx="12" cy="6.3" r="3.6"/><circle cx="17.4" cy="10.2" r="3.6"/><circle cx="15.4" cy="16.6" r="3.6"/><circle cx="8.6" cy="16.6" r="3.6"/><circle cx="6.6" cy="10.2" r="3.6"/></g><circle cx="12" cy="11.6" r="2.8" fill="#f0b44c"/>'),
  seed: sv('<path d="M12 3c4 3.5 5.5 7 5.5 10.2A5.5 5.5 0 0 1 6.5 13.2C6.5 10 8 6.5 12 3z" fill="currentColor"/><path d="M12 8v9" stroke="#fff" stroke-opacity=".5" stroke-width="1.5"/>'),
  bug: sv('<ellipse cx="12" cy="13.5" rx="4.6" ry="6.2" fill="currentColor"/><circle cx="12" cy="5.8" r="2.6" fill="currentColor"/><path d="M7.5 10L3.5 8M7.5 14H3M7.5 17.5l-3.5 2.5M16.5 10l4-2M16.5 14H21M16.5 17.5l3.5 2.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>'),
  paw: sv('<g fill="currentColor"><ellipse cx="12" cy="16" rx="5" ry="4.2"/><circle cx="6" cy="10.5" r="2.2"/><circle cx="9.6" cy="6.6" r="2.3"/><circle cx="14.4" cy="6.6" r="2.3"/><circle cx="18" cy="10.5" r="2.2"/></g>'),
  root: sv('<path d="M12 3v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 7.5c4 0 6 3 6 6.2 0 3.6-3 6.3-6 7.3-3-1-6-3.7-6-7.3 0-3.2 2-6.2 6-6.2z" fill="currentColor"/>'),
  mush: sv('<path d="M3.5 12a8.5 6.5 0 0 1 17 0z" fill="currentColor"/><path d="M9.5 12h5v6.5a2.5 2.5 0 0 1-5 0z" fill="currentColor" opacity=".6"/>'),
};
const PART_ICON = { leaves: IC.leaf, fruit: IC.fruit, nectar: IC.flower, seeds: IC.seed, insects: IC.bug, animals: IC.paw, roots: IC.root, fungus: IC.mush, dead: IC.leaf };
const EASY_PARTS = ['leaves', 'fruit', 'nectar', 'seeds', 'insects', 'animals'];
const EASY_PART_LABEL = { leaves: 'עלים', fruit: 'פירות', nectar: 'צוף מפרחים', seeds: 'זרעים', insects: 'חרקים', animals: 'בעלי חיים', roots: 'פקעות', fungus: 'פטריות', dead: 'חומר מת' };
const STAT_ICON = { light: IC.sun, water: IC.drop, links: IC.web,
  shelter: sv('<path d="M3.2 11.6L12 4l8.8 7.6" stroke="currentColor" stroke-width="2.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.6 10.4V20h12.8v-9.6" fill="currentColor"/><path d="M10 20v-5.2a2 2 0 0 1 4 0V20" fill="#fff" fill-opacity=".75"/>') };

/* ───────────────────────────────────────────── data → species + cards */
const isAnimalKind = (k) => k === 'animal' || k === 'colony' || k === 'swarm';
const SP = [];
for (const bid of ['amazon', 'grove', 'reef']) {
  for (const s of BIOMES[bid].species) {
    // the reef has no rendered thumbnails yet: its card painting stands in for them
    SP.push({ ...s, biome: bid, key: bid + ':' + s.id, animal: isAnimalKind(s.kind), img: (THUMBS[bid] || {})[s.id] || (bid === 'reef' ? CARD_ART[s.id] || '' : '') });
  }
}
const SPK = new Map(SP.map((s) => [s.key, s]));
const spOf = (biome, id) => SPK.get(biome + ':' + id);
const animalsIn = (b) => SP.filter((s) => s.biome === b && s.animal);

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
const TOOL_SHORT = {
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
const CARDS = [];
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
const CARD = new Map(CARDS.map((c) => [c.id, c]));

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
const SETS = SET_DEFS.map((d) => ({ ...d,
  cards: d.tools ? d.tools.map((t) => CARD.get('tool:' + t)).filter(Boolean) : CARDS.filter((c) => c.type === 'species' && d.sp(c.sp)) }));
// torah edition: two more sets from the sources (shown only while "מקורות ופסוקים" is on)
const IC_SCROLL = sv('<path d="M6 4h10.5A2.5 2.5 0 0 1 19 6.5V18a2 2 0 0 1-2 2H7.5A2.5 2.5 0 0 1 5 17.5V5a1 1 0 0 1 1-1z" fill="currentColor"/><path d="M8.5 8.5h7M8.5 11.5h7M8.5 14.5h4.5" stroke="#fff" stroke-opacity=".6" stroke-width="1.5" stroke-linecap="round"/>');
if (TORAH) for (const d of [SHIRA_SET, TZVI_SET]) SETS.push({ ...d, torah: true, ic: d.id === 'shira' ? IC_SCROLL : IC.paw, cards: d.cards.map((id) => CARD.get(id)).filter(Boolean) });
const activeSets = () => SETS.filter((st) => !st.torah || sourcesOn());
const SET_BY = new Map(SETS.map((st) => [st.id, st]));
const setsOf = (id) => activeSets().filter((st) => st.cards.some((c) => c.id === id));
const SET_WHERE = { amazon: 'אמזונס', grove: 'חורש', reef: 'שונית', both: 'שני היערות', tech: 'טכנולוגיה' };
// sanity check (dev console): 4–8 cards, and a rare or very rare card in every species set
for (const st of SETS) {
  if (st.torah) continue;
  if (st.cards.length < 4 || st.cards.length > 8) console.warn('album set size', st.id, st.cards.length);
  if (!st.tools && !st.cards.some((c) => c.rarity === 'rare' || c.rarity === 'epic')) console.warn('album set without a rare card', st.id);
}

/* ───────────────────────────────────────────── persistence */
function loadState() {
  const fresh = { owned: {}, packs: START_PACKS, quizzes: 0, best: 0, duelsWon: 0, sets: {}, v: 1 };
  try {
    const raw = window.localStorage.getItem(profileKey(STORE_KEY));
    if (!raw) return fresh;
    const s = JSON.parse(raw);
    if (!s || typeof s !== 'object') return fresh;
    const owned = {};
    for (const k in s.owned || {}) if (CARD.has(k) && s.owned[k] > 0) owned[k] = Math.floor(s.owned[k]);
    const sets = {}; // completed album sets (reward given); older saves have none
    if (s.sets && typeof s.sets === 'object') for (const k in s.sets) if (SET_BY.has(k) && s.sets[k]) sets[k] = true;
    return { ...fresh, ...s, owned, sets, packs: Math.max(0, Math.floor(+s.packs || 0)) };
  } catch (e) { return fresh; }
}

/* ───────────────────────────────────────────── variety across visits
   Each player keeps a list of the questions asked lately (S.seen in the hub's own store, oldest first; old saves have
   none). A round prefers questions that are not on it; when a bank is used up, it starts again from the oldest ones. */
const SEEN_MAX = 700;
let SEEN = new Map();   // question id → its place in S.seen (bigger = asked more recently); set when a round is built
const seenRank = (id) => (SEEN.has(id) ? SEEN.get(id) : -1);
function seenMap(list) { const m = new Map(); (Array.isArray(list) ? list : []).forEach((id, i) => { if (typeof id === 'string') m.set(id, i); }); return m; }
// n items of list: the unseen ones first (in random order), then the ones asked longest ago.
// `forget` lists the whole bank when it ran out, so the next rounds go through it again.
function freshest(list, n, idOf) {
  const un = shuffle(list.filter((x) => !SEEN.has(idOf(x))));
  if (un.length >= n) return { pick: un.slice(0, n), forget: null };
  const old = list.filter((x) => SEEN.has(idOf(x))).sort((a, b) => seenRank(idOf(a)) - seenRank(idOf(b)));
  const k = n - un.length;
  return { pick: [...un, ...shuffle(old.slice(0, Math.max(k, Math.ceil(old.length / 3)))).slice(0, k)], forget: list.map(idOf) };
}
function hashId(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }

/* ───────────────────────────────────────────── torah edition: the "מן המקורות" corner of the quiz */
const tqId = (t) => t.id || 'tq-' + hashId(t.q);
// a round: 6 easier questions first, then 4 harder ones (lvl 2)
function buildTorahRound() {
  const easy = TQUIZ_ALL.filter((t) => (t.lvl || 1) === 1), hard = TQUIZ_ALL.filter((t) => (t.lvl || 1) !== 1);
  const nh = Math.min(hard.length, 4), ne = Math.min(easy.length, ROUND - nh);
  const a = freshest(easy, ne, tqId), b = freshest(hard, nh, tqId);
  const qs = [...a.pick, ...b.pick].map((t) => {
    const sp = t.art ? SPK.get(t.art) : null;
    return { tag: 'מן המקורות', q: t.q, art: sp || null, options: shuffle(t.o.map((label, i) => opt(label, i === 0))), fact: t.e, src: t.src, ref: t.ref, qid: tqId(t) };
  });
  qs.forget = [...(a.forget || []), ...(b.forget || [])];
  return qs;
}

/* ───────────────────────────────────────────── the hand-written bank (src/data/quiz-bank.js) */
const BANK_TAG = { amazon: 'יער הגשם', grove: 'החורש', reef: 'השונית', all: 'הידעת?' };
function bankQ(b) {
  let art = null;
  if (b.art && b.art.startsWith('tool:')) { const c = CARD.get(b.art); if (c) art = { id: c.id.slice(5), img: c.img, color: c.color, name: c.name, tool: true }; }
  else if (b.art) art = SPK.get(b.art) || null;
  const tf = typeof b.tf === 'boolean';
  const options = tf ? [opt('נכון', b.tf, { icon: IC.check, tone: 'yes' }), opt('לא נכון', !b.tf, { icon: IC.cross, tone: 'no' })]
    : b.o.map((label, i) => opt(label, i === 0));
  return { tag: b.tag || BANK_TAG[b.z] || 'הידעת?', q: b.q, art, hideName: !!b.hideName, options, fact: b.e, keepOrder: tf, qid: 'qb-' + b.id };
}

/* ───────────────────────────────────────────── quiz generators */
function opt(label, ok, extra = {}) { return { label, ok: !!ok, ...extra }; }
// GKEY: the generator now running; GPICK: the id of the question it built (generator + species), for S.seen
let GKEY = '', GPICK = '';
function freshFrom(list, used) {
  const c = list.filter((x) => !used.has(x.key || x.id)); if (!c.length) return null;
  // prefer a species this player was not asked about lately with this kind of question
  const id = (x) => GKEY + ':' + (x.key || x.id);
  const un = c.filter((x) => !SEEN.has(id(x)));
  let s;
  if (un.length) s = pick(un);
  else { const o = c.slice().sort((a, b) => seenRank(id(a)) - seenRank(id(b))); s = pick(o.slice(0, Math.max(1, Math.ceil(o.length / 3)))); }
  GPICK = id(s); return s;
}
// quiz pictures: the painted card art when there is one, else the model thumbnail
const nameOpt = (s, ok, withImg) => opt(s.name, ok, withImg ? (CARD_ART[s.id] ? { img: CARD_ART[s.id], paint: true } : { img: s.img }) : {});
const toolImg = (id) => (CARD_ART[id] ? { img: CARD_ART[id], paint: true } : { img: TOOL_ICONS[id] });

/* what an animal really eats – the modelled diet plus `alsoEats` from its card (data), so a real food is never a "wrong" answer */
const PLANT_PARTS = ['leaves', 'fruit', 'nectar', 'seeds', 'roots'];
function partsEaten(s) {
  const p = new Set([...(s.diet || []).map((d) => d.part), ...(s.alsoEats || []), ...(s.quizDiet || [])]);
  if (p.has('insects') || p.has('animals')) { p.add('insects'); p.add('animals'); } // insects are animals too – never contrast them
  return p;
}
const eatAnswers = (s) => uniq(s.quizDiet || (s.diet || []).map((d) => d.part)).filter((p) => EASY_PART_LABEL[p] && (s.quizDiet || EASY_PARTS.includes(p)));
const eatDistractors = (s) => { const p = partsEaten(s); return EASY_PARTS.filter((x) => !p.has(x)); };
// prey group of every animal (for the "menu" question)
const PREY_GROUP = {
  leafcutter: 'insect', orchidbee: 'insect', morpho: 'insect', honeybee: 'insect', butterfly: 'insect', harvesterant: 'insect', firefly: 'insect',
  hummingbird: 'bird', toucan: 'bird', macaw: 'bird', harpy: 'bird', jay: 'bird', blackbird: 'bird', owl: 'bird', hoopoe: 'bird', chukar: 'bird',
  dartfrog: 'frog', chameleon: 'reptile', agama: 'reptile', tortoise: 'reptile',
};
// which groups each eater may eat (wider than the game diet, from the cards and real life). 'plant' = any plant part.
const EATS_GROUPS = {
  orchidbee: ['plant'], hummingbird: ['plant', 'insect'], toucan: ['plant', 'insect', 'bird', 'reptile', 'frog'], macaw: ['plant'],
  sloth: ['plant', 'insect'], agouti: ['plant', 'insect'], howler: ['plant'], jaguar: ['mammal', 'reptile', 'bird', 'frog'],
  harpy: ['mammal', 'bird', 'reptile'], tapir: ['plant'], fruitbat: ['plant', 'insect'], anteater: ['insect'], kinkajou: ['plant', 'insect'],
  honeybee: ['plant'], butterfly: ['plant'], harvesterant: ['plant', 'insect'], jay: ['plant', 'insect', 'bird', 'mammal', 'reptile'],
  blackbird: ['plant', 'insect', 'reptile'], chameleon: ['plant', 'insect', 'reptile'], agama: ['plant', 'insect', 'reptile'],
  spinymouse: ['plant', 'insect'], porcupine: ['plant'], hedgehog: ['plant', 'insect', 'reptile', 'bird', 'frog', 'mammal'],
  hyrax: ['plant'], gazelle: ['plant'], fox: ['plant', 'insect', 'mammal', 'bird', 'reptile'], owl: ['mammal', 'bird', 'insect', 'reptile'],
  hoopoe: ['insect', 'reptile'], tortoise: ['plant'], chukar: ['plant', 'insect'],
};
const CARD_WORD = { howler: /קופים|קוף /, fruitbat: /עטלף|עטלפים/, firefly: /חיפושי/, leafcutter: /נמל/, harvesterant: /נמל/, honeybee: /דבור/, orchidbee: /דבור/,
  butterfly: /פרפר/, morpho: /פרפר/ };
const HUNTERS = new Set(['jaguar', 'harpy', 'fox', 'owl']);
const BIG = new Set(['jaguar', 'tapir', 'capybara', 'harpy', 'howler', 'sloth', 'anteater', 'coati', 'agouti', 'kinkajou',
  'gazelle', 'porcupine', 'fox', 'hyrax', 'owl', 'tortoise']);
const groupOf = (o) => (o.animal ? PREY_GROUP[o.id] || 'mammal' : 'plant');
function notFoodOf(s, o) {
  if ((s.diet || []).some((d) => d.id === o.id)) return false;
  const g = EATS_GROUPS[s.id]; if (!g) return false; // unknown eater – offer nothing as wrong
  if (!g.includes(groupOf(o))) return true;
  return o.animal && !HUNTERS.has(s.id) && BIG.has(o.id) && !BIG.has(s.id); // a small animal cannot eat a big one
}

const GEN = {
  // ── beginners
  who(pool, used) {
    const s = freshFrom(pool.filter((x) => x.img), used); if (!s) return null;
    const w0 = s.name.split(' ')[0];
    const others = sample(pool.filter((o) => o !== s && o.animal === s.animal && o.name.split(' ')[0] !== w0), 2);
    if (others.length < 2) return null; used.add(s.key);
    return { tag: '', q: 'מי זה?', art: s, hideName: true, options: [nameOpt(s, true), ...others.map((o) => nameOpt(o, false))], fact: firstSentence(s.fact) };
  },
  eat(pool, used) {
    const s = freshFrom(pool.filter((x) => x.animal && eatAnswers(x).length && eatDistractors(x).length >= 2), used); if (!s) return null;
    const ok = pick(eatAnswers(s));
    const wrong = sample(eatDistractors(s), 2);
    used.add(s.key);
    return { tag: s.name, q: gw(s.id, 'מה הוא אוכל?', 'מה היא אוכלת?', 'מה הם אוכלים?', 'מה הן אוכלות?'), art: s, options: [ok, ...wrong].map((p, i) => opt(EASY_PART_LABEL[p], i === 0, { icon: PART_ICON[p] })),
      fact: s.quizDiet ? firstSentence(s.fact) : dietSentence(s) };
  },
  when(pool, used) {
    const s = freshFrom(pool.filter((x) => x.animal && (x.active === 'day' || x.active === 'night')), used); if (!s) return null;
    used.add(s.key);
    return { tag: s.name, q: gw(s.id, 'מתי הוא פעיל?', 'מתי היא פעילה?', 'מתי הם פעילים?', 'מתי הן פעילות?'), art: s, options: [opt('ביום', s.active === 'day', { icon: IC.sun, tone: 'day' }), opt('בלילה', s.active === 'night', { icon: IC.moon, tone: 'night' })],
      fact: `${s.name} – ${activeNameFor(s.id, s.active)}.`, keepOrder: true };
  },
  where(pool, used) {
    const s = freshFrom(pool.filter((x) => x.img), used); if (!s) return null;
    used.add(s.key);
    return { tag: s.name, q: s.animal ? gw(s.id, 'איפה הוא גר?', 'איפה היא גרה?', 'איפה הם גרים?', 'איפה הן גרות?') : gw(s.id, 'איפה הוא גדל?', 'איפה היא גדלה?', 'איפה הם גדלים?', 'איפה הן גדלות?'), art: s,
      options: [opt('באמזונס', s.biome === 'amazon', { icon: IC.rain, tone: 'amazon' }), opt('בחורש', s.biome === 'grove', { icon: IC.tree, tone: 'grove' }),
        ...(s.biome === 'reef' || Math.random() < 0.5 ? [opt('בשונית', s.biome === 'reef', { icon: IC.drop, tone: 'reef' })] : [])],
      fact: `את ${defName(s.id, s.name)} פוגשים ${BIOME_IN[s.biome]}.` };
  },
  // ── advanced
  rel(pool, used) {
    const pairs = [];
    for (const s of pool) for (const r of s.relations || []) {
      if (r.type !== 'pollinates' && r.type !== 'disperses') continue;
      const t = spOf(s.biome, r.target); if (t && !used.has(t.key)) pairs.push({ s, r, t });
    }
    if (!pairs.length) return null;
    const freshPairs = pairs.filter((p) => !SEEN.has('rel:' + p.t.key + ':' + p.s.key));
    const { s, r, t } = pick(freshPairs.length ? freshPairs : pairs);
    GPICK = 'rel:' + t.key + ':' + s.key;
    const doers = new Set(SP.filter((o) => o.biome === s.biome && (o.relations || []).some((x) => x.type === r.type && x.target === t.id)).map((o) => o.key));
    // never offer as "wrong" an animal that may really do it: flower visitors for pollination, fruit/seed eaters for seed spreading
    const maybe = (o) => r.type === 'pollinates'
      ? partsEaten(o).has('nectar')
      : (o.diet || []).some((d) => d.id === t.id) || partsEaten(o).has('fruit') || partsEaten(o).has('seeds');
    // …or a group the plant's own card names as helpers ("ציפורים", "קופים", "חיפושיות" …)
    const tText = (t.fact || '') + ' ' + (t.more || '');
    const named = (o) => { const w = CARD_WORD[o.id] || (groupOf(o) === 'bird' ? /ציפור/ : null); return !!w && w.test(tText); };
    const wrong = sample(animalsIn(s.biome).filter((o) => !doers.has(o.key) && !maybe(o) && !named(o)), 2); if (wrong.length < 2) return null;
    used.add(t.key); used.add(s.key);
    return { tag: 'קשרים ברשת', q: r.type === 'pollinates' ? `מי מאביק את ${defName(t.id, t.name)}?` : `מי מפיץ את הזרעים של ${defName(t.id, t.name)}?`, art: t,
      options: [nameOpt(s, true, true), ...wrong.map((o) => nameOpt(o, false, true))], fact: r.text };
  },
  menu(pool, used) {
    const s = freshFrom(pool.filter((x) => !x.quizDiet && (x.diet || []).some((d) => spOf(x.biome, d.id))), used); if (!s) return null;
    const ok = spOf(s.biome, pick(s.diet.filter((d) => spOf(s.biome, d.id))).id);
    // wrong answers only from a group this animal surely does not eat (plants for a pure hunter, big animals for a small eater ...)
    const safe = SP.filter((o) => o.biome === s.biome && o !== s && notFoodOf(s, o));
    const same = safe.filter((o) => o.animal === ok.animal);
    const wrong = same.length >= 2 ? sample(same, 2) : sample(safe, 2);
    if (wrong.length < 2) return null; used.add(s.key);
    return { tag: 'שרשרת המזון', q: `מה מופיע בתפריט של ${defName(s.id, s.name)}?`, art: s, options: [nameOpt(ok, true, true), ...wrong.map((o) => nameOpt(o, false, true))], fact: dietSentence(s) };
  },
  layer(pool, used) {
    // only what stays in one place (plants, corals, sponges): animals move between layers, so a "wrong" layer may be right
    const s = freshFrom(pool.filter((x) => !x.animal && x.layer && BIOMES[x.biome].layers.some((l) => l.id === x.layer)), used); if (!s) return null;
    const layers = BIOMES[s.biome].layers; const L = layers.find((l) => l.id === s.layer);
    // a plant that sits on a tree (bromeliad on the kapok) or an animal that lives in one can be met there too – never a "wrong" layer
    const near = new Set((s.relations || []).filter((r) => r.type === 'climbs' || r.type === 'home')
      .map((r) => (spOf(s.biome, r.target) || {}).layer).filter(Boolean));
    // reef life that grows in two zones (as "מחזיקים את היער" places it): brain coral and anemones also on the slope, sponges and algae also on the sand
    const ALSO = { 'reef:brain': 'slope', 'reef:seaanemone': 'slope', 'reef:sponge': 'sand', 'reef:algae': 'sand' };
    if (ALSO[s.key]) near.add(ALSO[s.key]);
    const wrong = sample(layers.filter((l) => l !== L && !near.has(l.id)), 2); if (!wrong.length) return null;
    used.add(s.key);
    const reef = s.biome === 'reef';
    return { tag: reef ? 'אזורי השונית' : 'קומות היער', q: reef ? `באיזה אזור בשונית אפשר למצוא את ${defName(s.id, s.name)}?` : `באיזו קומה ביער אפשר למצוא את ${defName(s.id, s.name)}?`,
      art: s, options: [opt(L.name, true), ...wrong.map((l) => opt(l.name, false))], fact: L.desc };
  },
  fact(pool, used) {
    const s = freshFrom(pool.filter((x) => x.fact && x.img), used); if (!s) return null;
    const masked = maskName(firstSentence(s.fact), s.name, s.id);
    if (leaksName(masked, s.name, s.id)) return null; // the name still shows (another form of it) – skip
    // no look-alike names as wrong answers ("פטריות" / "פטרייה זוהרת", "פרפר" / "פרפר מורפו") – the sentence may fit both
    const st0 = stemOf(s.name.split(' ')[0]);
    const wrong = sample(pool.filter((o) => o !== s && o.animal === s.animal && o.img && stemOf(o.name.split(' ')[0]) !== st0), 2); if (wrong.length < 2) return null;
    used.add(s.key);
    return { tag: 'הידעת?', q: 'על מי מדובר?', sub: masked, art: null, options: [nameOpt(s, true, true), ...wrong.map((o) => nameOpt(o, false, true))], fact: s.fact };
  },
  tf(pool, used) {
    const s = freshFrom(pool.filter((x) => x.img), used); if (!s) return null;
    used.add(s.key);
    let stmt, truth, fact;
    if (s.animal && (s.active === 'day' || s.active === 'night') && Math.random() < 0.6) {
      const says = Math.random() < 0.5 ? 'day' : 'night';
      stmt = `את ${defName(s.id, s.name)} פוגשים בעיקר ${says === 'day' ? 'ביום' : 'בלילה'}.`; truth = says === s.active; fact = `${s.name} – ${activeNameFor(s.id, s.active)}.`;
    } else {
      const says = ['amazon', 'grove', 'reef'][(Math.random() * 3) | 0];
      stmt = `את ${defName(s.id, s.name)} פוגשים ${BIOME_IN[says]}.`; truth = says === s.biome; fact = `את ${defName(s.id, s.name)} פוגשים ${BIOME_IN[s.biome]}. ${firstSentence(s.fact)}`;
    }
    return { tag: 'נכון או לא נכון?', q: stmt, art: s, options: [opt('נכון', truth, { icon: IC.check, tone: 'yes' }), opt('לא נכון', !truth, { icon: IC.cross, tone: 'no' })], fact, keepOrder: true };
  },
  own(pool, used) {
    const s = freshFrom(pool.filter((x) => x.question && Array.isArray(x.question.options) && x.question.options[x.question.answer] != null), used); if (!s) return null;
    used.add(s.key);
    return { tag: 'שאלה למחשבה', q: s.question.q, art: s, options: s.question.options.map((o, i) => opt(o, i === s.question.answer)), fact: s.fact };
  },
  tool(pool, used) {
    const t = freshFrom(TOOL_DEFS.map((d) => ({ ...d, key: 'tool:' + d.id })), used); if (!t) return null;
    used.add(t.key);
    const others = sample(TOOL_DEFS.filter((d) => d.id !== t.id), 2);
    const art = { id: t.id, img: TOOL_ICONS[t.id], color: t.color, name: t.name, tool: true };
    if (Math.random() < 0.5) {
      return { tag: 'טכנולוגיה ששומרת על הטבע', q: `מה עושה ${t.name}?`, art, options: [opt(TOOL_SHORT[t.id], true), ...others.map((d) => opt(TOOL_SHORT[d.id], false))], fact: t.fact };
    }
    const masked = maskName(firstSentence(t.fact), t.name, t.id);
    if (leaksName(masked, t.name, t.id)) return { tag: 'טכנולוגיה ששומרת על הטבע', q: `מה עושה ${t.name}?`, art, options: [opt(TOOL_SHORT[t.id], true), ...others.map((d) => opt(TOOL_SHORT[d.id], false))], fact: t.fact };
    return { tag: 'טכנולוגיה ששומרת על הטבע', q: 'איזה כלי עושה את זה?', sub: masked, art: null,
      options: [opt(t.name, true, toolImg(t.id)), ...others.map((d) => opt(d.name, false, toolImg(d.id)))], fact: t.fact };
  },
};
function dietSentence(s) {
  const names = (s.diet || []).map((d) => { const t = spOf(s.biome, d.id); return t ? t.name : null; }).filter(Boolean);
  if (names.length) return `האוכל של ${defName(s.id, s.name)}: ${names.join(', ')}.`;
  return `האוכל של ${defName(s.id, s.name)}: ${uniq((s.diet || []).map((d) => DIET_PARTS[d.part])).join(', ')}.`;
}
function buildRound(level, biomeSel) {
  const pool = SP.filter((s) => biomeSel === 'both' || s.biome === biomeSel);
  // about half a round comes from the generators, the rest from the hand-written bank (4 for beginners, 5 for advanced)
  const bank = QBANK.filter((b) => b.lvl === level && (biomeSel === 'both' || b.z === biomeSel || b.z === 'all'));
  const plan = level === 'easy'
    ? (biomeSel === 'both' ? ['who', 'who', 'eat', 'when', 'where', 'where'] : ['who', 'who', 'who', 'eat', 'eat', 'when'])
    : shuffle(['rel', 'menu', 'layer', 'fact', 'tf', 'own', 'own', 'tool']).slice(0, 5);
  const fallback = level === 'easy' ? ['who', 'eat', 'when'] : ['own', 'fact', 'layer', 'tf'];
  const used = new Set(); const out = [];
  for (const k of plan) {
    let q = null;
    GKEY = k; for (let t = 0; t < 12 && !q; t++) { GPICK = ''; q = GEN[k](pool, used); }
    for (const f of fallback) { if (q) break; GKEY = f; for (let t = 0; t < 8 && !q; t++) { GPICK = ''; q = GEN[f](pool, used); } }
    if (q) { q.qid = q.qid || GPICK; out.push(q); }
  }
  // fill the round from the bank (more of it when a generator found nothing, e.g. in a small pool)
  const nb = Math.min(bank.length, Math.max(0, ROUND - out.length));
  const fromBank = freshest(bank, nb, (b) => 'qb-' + b.id);
  for (const b of fromBank.pick) out.push(bankQ(b));
  for (const k of fallback) { while (out.length < ROUND) { GKEY = k; GPICK = ''; const q = GEN[k](pool, used); if (!q) break; q.qid = q.qid || GPICK; out.push(q); } }
  // shuffle question order, then answer positions (balanced so the right answer is not biased to any slot)
  const qs = shuffle(out).slice(0, ROUND);
  let bag = [];
  for (const q of qs) {
    if (q.keepOrder) continue;
    const n = q.options.length;
    if (!bag.length || bag.n !== n) { bag = shuffle([...Array(n).keys(), ...Array(n).keys()]); bag.n = n; }
    const pos = bag.pop();
    const right = q.options.find((o) => o.ok); const rest = shuffle(q.options.filter((o) => !o.ok));
    rest.splice(pos, 0, right); q.options = rest;
  }
  qs.forget = fromBank.forget || [];
  return qs;
}

/* ───────────────────────────────────────────── card rendering */
// rarity is shown as faceted gems (not stars – stars are the score of a game): 1–3 lit out of 3, a gear for tools
const IC_GEM = sv('<path d="M7 3.6h10l4.4 5.6L12 20.8 2.6 9.2z" fill="currentColor"/><path d="M2.6 9.2h18.8M9.2 3.6L7.6 9.2 12 20.8l4.4-11.6-1.6-5.6" stroke="#fff" stroke-opacity=".55" stroke-width="1.1" fill="none" stroke-linejoin="round"/>');
const IC_KEY = sv('<circle cx="8.2" cy="8.2" r="5" fill="none" stroke="currentColor" stroke-width="2.7"/><path d="M11.8 11.8l8.6 8.6M16.4 16.4l2.7-2.7M18.9 18.9l2.3-2.3" stroke="currentColor" stroke-width="2.7" stroke-linecap="round"/>');
const IC_GEAR = sv('<circle cx="12" cy="12" r="3.4" fill="currentColor"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>');
function gems(r) {
  if (r === 'tech') return `<span class="wl-gem t">${IC_GEAR}</span>`;
  const n = RARITY_GEMS[r] || 1;
  return [0, 1, 2].map((k) => `<span class="wl-gem${k < n ? ' on' : ''}">${IC_GEM}</span>`).join('');
}
const badgeTip = (c) => (c.type === 'tool' ? 'כלי טכנולוגי שעוזר לשמור על הטבע' : `${defName(c.sp.id, c.name)} ${gw(c.sp.id, 'גר', 'גרה', 'גרים', 'גרות')} ${BIOME_IN[c.biome]}`);
function artStyle(color) { return `background:radial-gradient(circle at 50% 38%, ${rgba(color, 0.55)}, ${rgba(color, 0.12)} 62%, transparent 72%), linear-gradient(180deg, #fbf6e5, #e9dfc2)`; }
function cardHTML(c, o = {}) {
  if (o.locked) {
    return `<div class="wl-card is-locked ${o.cls || ''}" data-cid="${esc(c.id)}" style="${o.style || ''}" aria-label="קלף שעוד לא נאסף">
      <div class="wl-cin"><div class="wl-sil">${c.img ? `<img src="${c.img}" alt="" draggable="false">` : ''}</div><b class="wl-qm">?</b>
      <span class="wl-lockb">${c.type === 'tool' ? 'טכנולוגיה' : BIOME_SHORT[c.biome]}</span></div></div>`;
  }
  const badge = c.type === 'tool' ? `<span class="wl-badge b-tech" title="${esc(badgeTip(c))}">טכנולוגיה</span>` : `<span class="wl-badge b-${c.biome}" title="${esc(badgeTip(c))}">${BIOME_SHORT[c.biome]}</span>`;
  const stats = (c.sk || KEYS_LAND).map((k) => `<span class="wl-st s-${k}${o.hl === k ? ' hl' : ''}" title="${STAT_NAMES[k]} – ${STAT_HELP[k]}"><i>${STAT_ICON[k]}</i><b>${c.stats[k]}</b><small>${STAT_NAMES[k]}</small></span>`).join('');
  return `<div class="wl-card r-${c.rarity} ${o.cls || ''}" data-cid="${esc(c.id)}" style="${o.style || ''}">
    <div class="wl-cin">
      <div class="wl-ctop"><span class="wl-cname${c.name.length > 12 ? ' xl' : c.name.length > 9 ? ' l' : ''}">${esc(c.name)}</span>${badge}</div>
      ${c.art ? `<div class="wl-cart paint"><img src="${c.art}" alt="${esc(c.name)}" draggable="false" style="${artPos(c.type === 'tool' ? c.tool.id : c.sp.id)}"></div>` : `<div class="wl-cart${c.type === 'tool' ? ' tool' : ''}" style="${artStyle(c.color)}">${c.img ? `<img src="${c.img}" alt="${esc(c.name)}" draggable="false">` : `<b>${esc(c.name[0])}</b>`}</div>`}
      <div class="wl-ctype"><span>${esc(c.kind)}</span><span class="wl-gems" title="${RARITY_TIP[c.rarity]}">${gems(c.rarity)}</span></div>
      <div class="wl-stats">${stats}</div>
      <p class="wl-cfact">${esc(c.short)}</p>
      <div class="wl-crar" title="${RARITY_TIP[c.rarity]}. ${RARITY_POWER[c.rarity] || RARITY_MORE[c.rarity]}">${c.type === 'tool' ? 'קלף טכנולוגיה' : c.rarity === 'epic' ? 'נדיר מאוד · מין מפתח' : 'נדירות: ' + RARITY_NAMES[c.rarity]}</div>
    </div>${o.isNew ? '<span class="wl-new">חדש!</span>' : ''}${o.count > 1 ? `<span class="wl-cnt" title="${o.count} עותקים">${o.count}</span>` : ''}</div>`;
}
const backHTML = () => `<div class="wl-card wl-cback"><div class="wl-cin"><div class="wl-emb">${IC.web}</div><span>רשת החיים</span></div></div>`;
function flipHTML(c, o = {}) {
  return `<div class="wl-flip${o.up ? ' is-up' : ''} ${o.cls || ''}" style="${o.style || ''}" data-cid="${esc(c ? c.id : '')}">
    <div class="wl-fin"><div class="wl-face wl-fback">${backHTML()}</div><div class="wl-face wl-ffront">${c ? cardHTML(c, o) : ''}</div></div></div>`;
}

/* ───────────────────────────────────────────── CSS */
const LEAF_BG = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220"><g fill="#cfe8b0" fill-opacity=".05"><path d="M30 70C26 40 46 18 84 16c2 38-22 58-54 54z"/><path d="M150 40c-4-22 10-38 38-40 2 28-16 42-38 40z"/><path d="M120 170c-6-34 18-58 60-60 2 42-24 64-60 60z"/><path d="M20 190c-2-18 10-30 30-32 2 22-12 34-30 32z"/></g><g stroke="#cfe8b0" stroke-opacity=".05" stroke-width="2" fill="none"><path d="M30 70L70 30M150 40l26-26M120 170l46-46"/></g></svg>');
const CSS = `
.wol-learn{--ink:#1e2a1c;--ink2:#4a5640;--paper:#e2dfc4;--paper2:#d3cfac;--edge:#a59c74;--cream:#e9e6cc;--leaf:#a9cf6a;--leaf2:#5f9a3e;--moss:#2c4f26;--amber:#e6a93c;--amber2:#a86e17;--berry:#c8473a;--sky:#86c6ee;
  --sans:"wol-text","Segoe UI","Arial Hebrew","Noto Sans Hebrew",Arial,"Liberation Sans",sans-serif;
  --serif:"wol-display","wol-text","Segoe UI",Arial,serif;
  --shadow:0 10px 30px rgba(6,18,10,.35),0 2px 6px rgba(6,18,10,.25);
  position:fixed;inset:0;z-index:80;pointer-events:auto;direction:rtl;display:flex;flex-direction:column;overflow:hidden;
  font-family:var(--sans);color:var(--cream);font-size:clamp(13px,min(1.18vw,2.3vh),19px);line-height:1.4;
  -webkit-font-smoothing:antialiased;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;
  background:radial-gradient(110% 85% at 85% -15%,#4b8a3f 0%,transparent 55%),radial-gradient(80% 70% at -5% 115%,#6b5323 0%,transparent 60%),linear-gradient(180deg,#1e3d28 0%,#12271b 100%);
  animation:wl-in .35s ease-out both}
.wol-learn[hidden]{display:none!important}
.wol-learn *{box-sizing:border-box}
.wol-learn h1,.wol-learn h2,.wol-learn h3,.wol-learn p{margin:0}
.wol-learn::before{content:"";position:absolute;inset:0;background:url("${LEAF_BG}");background-size:22em;pointer-events:none}
.wol-learn button{font:inherit;color:inherit;cursor:pointer;border:0;background:none;padding:0;-webkit-tap-highlight-color:transparent}
.wol-learn button:focus-visible{outline:3px solid var(--amber);outline-offset:3px}
.wol-learn button:disabled{cursor:default}
.wol-learn .wl-ic{width:1.25em;height:1.25em;display:inline-block;vertical-align:middle;flex:none}
.wol-learn .paper{color:var(--ink);background:radial-gradient(120% 80% at 100% 0%,rgba(255,255,255,.45),transparent 55%),radial-gradient(90% 70% at 0% 100%,rgba(186,160,100,.22),transparent 60%),repeating-linear-gradient(0deg,rgba(120,100,60,.035) 0 1px,transparent 1px 3px),var(--paper);
  border:1px solid var(--edge);box-shadow:var(--shadow),inset 0 0 0 4px rgba(255,255,255,.22),inset 0 0 40px rgba(160,130,70,.18)}
/* top bar */
.wol-learn .wl-top{position:relative;display:flex;align-items:center;gap:.9em;padding:.8em 1.4em;min-height:4.4em;flex:none}
.wol-learn .wl-back{display:flex;align-items:center;gap:.4em;padding:.55em 1.1em .55em 1.25em;border-radius:99px;background:rgba(246,240,220,.12);border:1px solid rgba(246,240,220,.22);font-weight:700;font-size:1.05em;min-height:2.9em;transition:background .2s}
.wol-learn .wl-back:hover{background:rgba(246,240,220,.22)}
.wol-learn .wl-crumb{font-family:var(--serif);font-size:1.5em;font-weight:700;color:#f3ecd2;text-shadow:0 2px 10px rgba(0,0,0,.35)}
.wol-learn .wl-sp{flex:1}
.wol-learn .wl-chip{display:flex;align-items:center;gap:.45em;padding:.45em 1em;border-radius:99px;background:linear-gradient(180deg,#f6cf72,#e09a2c);color:#3a2608;font-weight:800;box-shadow:0 3px 0 #a86c18,0 6px 14px rgba(0,0,0,.25);min-height:2.6em}
.wol-learn .wl-chip.bump{animation:wl-bump .6s}
.wol-learn .wl-who{display:flex;align-items:center;gap:.5em;padding:.25em .3em .25em 1em;border-radius:99px;background:rgba(246,240,220,.1);border:1px solid rgba(246,240,220,.18);color:#f3ecd2;font-weight:700;min-height:2.6em;max-width:13em;pointer-events:none}
.wol-learn .wl-who:empty{display:none}
.wol-learn .wl-who>span:last-child{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wol-learn .wl-who .av{position:relative;flex:none;display:block;width:2.1em;height:2.1em;border-radius:50%;overflow:hidden;box-shadow:0 0 0 2px #e9e6cc,0 2px 6px rgba(0,0,0,.3)}
.wol-learn .wl-logo{height:2.7em;width:auto;background:rgba(255,255,255,.94);border-radius:.7em;padding:.3em .7em;box-shadow:0 3px 10px rgba(0,0,0,.25)}
.wol-learn .wl-main{position:relative;flex:1;min-height:0;display:flex;flex-direction:column}
.wol-learn .wl-screen{flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;animation:wl-rise .35s ease-out both}
/* buttons */
.wol-learn .wl-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5em;min-height:3.1em;padding:.5em 1.4em;border-radius:99px;font-weight:800;font-size:1.08em;
  background:#fbf6e5;color:var(--ink);border:2px solid var(--edge);box-shadow:0 3px 0 var(--edge),0 8px 18px rgba(0,0,0,.2);transition:transform .12s,filter .2s}
.wol-learn .wl-btn:hover:not(:disabled){transform:translateY(-2px)}
.wol-learn .wl-btn:active:not(:disabled){transform:translateY(1px)}
.wol-learn .wl-btn.go{background:linear-gradient(180deg,#a2dc78,#5fae4a);border-color:#3f8a33;color:#10260b;box-shadow:0 4px 0 #2f6a26,0 10px 22px rgba(0,0,0,.28)}
.wol-learn .wl-btn.gold{background:linear-gradient(180deg,#f8d98a,#e8a43a);border-color:#b97a1e;color:#3a2608;box-shadow:0 4px 0 #9c6512,0 10px 22px rgba(0,0,0,.28)}
.wol-learn .wl-btn:disabled{filter:grayscale(.8) opacity(.55)}
.wol-learn .wl-btn .wl-badgeN{min-width:1.6em;height:1.6em;border-radius:99px;background:var(--berry);color:#fff;font-size:.85em;display:inline-grid;place-items:center;padding:0 .35em}
/* home */
.wol-learn .wl-home{justify-content:flex-start;gap:1.8em;padding:0 2em 2em;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin}
.wol-learn .wl-home>:first-child{margin-top:auto}.wol-learn .wl-home>:last-child{margin-bottom:auto}   /* centred when it fits, scrolls (from the top) when it does not */
@media (max-height:640px){.wol-learn .wl-home{gap:1em;padding-bottom:1em}.wol-learn .wl-hero h1{font-size:2.4em}.wol-learn .wl-hero p{display:none}}
.wol-learn .wl-hero{text-align:center}
.wol-learn .wl-hero h1{font-family:var(--serif);font-size:3.4em;line-height:1;color:#f6eed0;text-shadow:0 3px 22px rgba(0,0,0,.45)}
.wol-learn .wl-hero p{margin-top:.5em;font-family:var(--serif);font-size:1.25em;color:#e2dcbd}
.wol-learn .wl-tiles{display:flex;gap:2em;justify-content:center;width:100%}
.wol-learn .wl-tile{position:relative;width:min(25em,42vw);border-radius:24px;padding:0;overflow:hidden;text-align:right;display:flex;flex-direction:column;transition:transform .2s,box-shadow .2s}
.wol-learn .wl-tile:hover{transform:translateY(-5px) rotate(-.4deg);box-shadow:0 20px 44px rgba(0,0,0,.45)}
.wol-learn .wl-tart{position:relative;height:13em;display:grid;place-items:center;overflow:hidden}
.wol-learn .wl-tile.quiz .wl-tart{background:radial-gradient(circle at 50% 60%,rgba(143,208,103,.55),transparent 60%),linear-gradient(180deg,#d8ecc2,#b8d79c)}
.wol-learn .wl-tile.album .wl-tart{background:radial-gradient(circle at 50% 60%,rgba(240,180,76,.55),transparent 60%),linear-gradient(180deg,#f2deb0,#e2c68a)}
.wol-learn .wl-tbody{padding:1em 1.4em 1.3em;display:flex;flex-direction:column;gap:.3em}
.wol-learn .wl-tbody h2{font-family:var(--serif);font-size:2.3em;line-height:1;color:#1f2c1a;display:flex;align-items:center;gap:.3em}
.wol-learn .wl-tbody p{font-size:1.08em;color:var(--ink2)}
.wol-learn .wl-qbubble{position:relative;width:8.5em;height:8.5em;border-radius:50%;background:#fbf6e5;box-shadow:0 0 0 .4em rgba(255,255,255,.6),0 12px 26px rgba(40,60,20,.35);display:grid;place-items:center;overflow:hidden}
.wol-learn .wl-qbubble img{width:92%;height:92%;object-fit:contain}
.wol-learn .wl-qbubble img.paint{width:100%;height:100%;object-fit:cover;transform:scale(1.55)}
.wol-learn .wl-cic img.paint{width:100%;height:100%;object-fit:cover;border-radius:50%;transform:scale(1.5)}
.wol-learn .wl-qbadge{position:absolute;top:1.6em;left:calc(50% - 6.6em);width:3.4em;height:3.4em;color:var(--amber2);filter:drop-shadow(0 4px 6px rgba(0,0,0,.25));animation:wl-bob 2.6s ease-in-out infinite}
.wol-learn .wl-qbadge .wl-ic{width:100%;height:100%}
.wol-learn .wl-mchip{position:absolute;padding:.35em .9em;border-radius:99px;background:#fbf6e5;color:var(--ink);font-weight:800;font-size:.9em;box-shadow:0 3px 0 var(--edge),0 6px 12px rgba(0,0,0,.18)}
.wol-learn .wl-mchip.ok{background:#e3f5d3;box-shadow:0 3px 0 #8cc46b,0 0 0 3px rgba(143,208,103,.6)}
.wol-learn .wl-fan{position:relative;width:18em;height:11.5em}
.wol-learn .wl-fan .wl-card{position:absolute;top:.6em;left:50%;margin-left:-5em;--cw:7.2em}
.wol-learn .wl-fan .wl-card:nth-child(1){transform:translateX(-4.4em) rotate(-12deg)}
.wol-learn .wl-fan .wl-card:nth-child(2){transform:translateY(-.5em);z-index:2}
.wol-learn .wl-fan .wl-card:nth-child(3){transform:translateX(4.4em) rotate(12deg)}
.wol-learn .wl-tile:hover .wl-fan .wl-card:nth-child(1){transform:translateX(-5.2em) rotate(-16deg)}
.wol-learn .wl-tile:hover .wl-fan .wl-card:nth-child(3){transform:translateX(5.2em) rotate(16deg)}
.wol-learn .wl-meter{height:.7em;border-radius:99px;background:rgba(80,70,40,.15);overflow:hidden;margin-top:.35em}
.wol-learn .wl-meter i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--leaf2),var(--leaf))}
.wol-learn .wl-tnote{position:absolute;top:.9em;right:.9em;z-index:3}
/* setup */
.wol-learn .wl-setup{width:min(54em,94%);margin:auto;border-radius:24px;padding:1.6em 2em 1.8em;display:flex;flex-direction:column;gap:1.1em}
.wol-learn .wl-setup h2{font-family:var(--serif);font-size:2.2em;line-height:1;color:#1f2c1a}
.wol-learn .wl-step h3{font-size:1.1em;color:var(--ink2);margin-bottom:.5em}
.wol-learn .wl-choices{display:grid;grid-template-columns:repeat(var(--n,2),1fr);gap:.9em}
.wol-learn .wl-choice{display:flex;align-items:center;gap:.8em;padding:.8em 1.1em;border-radius:18px;background:#fbf6e5;border:2.5px solid var(--edge);box-shadow:0 3px 0 var(--edge);text-align:right;min-height:4.6em;transition:transform .12s,border-color .2s,background .2s}
.wol-learn .wl-choice:hover{transform:translateY(-2px)}
.wol-learn .wl-choice.sel{background:#e6f4d6;border-color:var(--leaf2);box-shadow:0 3px 0 #3f8a33,0 0 0 4px rgba(143,208,103,.45)}
.wol-learn .wl-choice .wl-cic{width:3em;height:3em;border-radius:50%;display:grid;place-items:center;flex:none;background:rgba(95,174,74,.18);color:var(--moss);overflow:hidden}
.wol-learn .wl-choice .wl-cic .wl-ic{width:1.8em;height:1.8em}
.wol-learn .wl-choice .wl-cic img{width:115%;height:115%;object-fit:contain}
.wol-learn .wl-choice b{display:block;font-size:1.3em;color:#1f2c1a}
.wol-learn .wl-choice small{display:block;color:var(--ink2);font-size:.92em}
.wol-learn .wl-setup .wl-btn.go{align-self:center;font-size:1.3em;padding:.5em 2.4em}
/* quiz */
.wol-learn .wl-quiz{gap:.9em;padding:0 1.6em 1.4em}
.wol-learn .wl-prog{display:flex;align-items:center;gap:.25em;padding:.3em .9em;border-radius:99px;background:rgba(0,0,0,.18)}
.wol-learn .wl-pl{width:1.9em;height:1.9em;color:rgba(246,240,220,.2);transition:color .3s,transform .3s;display:grid;place-items:center}
.wol-learn .wl-pl .wl-ic{width:100%;height:100%}
.wol-learn .wl-pl.ok{color:var(--leaf);transform:scale(1.08)}
.wol-learn .wl-pl.no{color:#b98a55}
.wol-learn .wl-pl.cur{color:var(--amber);animation:wl-pulse 1.4s ease-in-out infinite}
.wol-learn .wl-pnum{margin-inline-start:.6em;font-weight:700;color:#e2dcbd;white-space:nowrap}
.wol-learn .wl-qwrap{flex:0 1 31em;min-height:0;width:min(64em,100%);perspective:1600px;display:flex;margin-bottom:auto}
.wol-learn .wl-qcard{flex:1;min-height:0;border-radius:24px;padding:1.5em 1.8em;display:grid;grid-template-columns:17em 1fr;gap:1.8em;align-items:stretch;transform-origin:50% 50%;animation:wl-flipin .55s cubic-bezier(.2,.8,.3,1.1) both}
.wol-learn .wl-qcard.noart{grid-template-columns:1fr}
.wol-learn .wl-qart{position:relative;border-radius:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;box-shadow:inset 0 0 0 2px rgba(201,184,141,.6);min-height:0}
.wol-learn .wl-qart img{width:100%;flex:1;min-height:0;object-fit:contain;filter:drop-shadow(0 8px 10px rgba(40,30,10,.25));animation:wl-pop .6s .15s cubic-bezier(.2,.9,.3,1.3) both}
.wol-learn .wl-qart.tool img{width:72%}
.wol-learn .wl-qart .wl-anm{margin:.2em 0 .7em;padding:.2em .9em;border-radius:99px;background:rgba(255,255,255,.75);font-family:var(--serif);font-weight:700;font-size:1.25em;color:#1f2c1a}
.wol-learn .wl-qbody{display:flex;flex-direction:column;justify-content:center;gap:.9em;min-height:0;overflow:auto;padding:.2em}
.wol-learn .wl-qtag{align-self:flex-start;font-size:.9em;font-weight:800;color:var(--moss);background:rgba(95,174,74,.16);padding:.2em .8em;border-radius:99px}
.wol-learn .wl-q{font-family:var(--serif);font-size:2em;line-height:1.15;color:#1f2c1a}
.wol-learn .wl-quiz.easy .wl-q{font-size:2.9em}
.wol-learn .wl-sub{font-family:var(--serif);font-size:1.3em;line-height:1.5;color:#2c3524;padding:.6em .9em;border-right:4px solid var(--amber);border-radius:4px 12px 12px 4px;background:rgba(240,180,76,.14)}
.wol-learn .wl-blank{display:inline-block;min-width:3.2em;border-bottom:3px dashed var(--amber2);text-align:center;color:var(--amber2);font-weight:800}
.wol-learn .wl-opts{display:grid;grid-template-columns:repeat(var(--n),1fr);gap:.8em}
.wol-learn .wl-opts.stack{grid-template-columns:1fr}
.wol-learn .wl-opt{position:relative;display:flex;align-items:center;justify-content:center;gap:.55em;min-height:4.2em;padding:.5em .9em;border-radius:18px;background:#fbf6e5;border:2.5px solid var(--edge);box-shadow:0 4px 0 var(--edge);
  font-size:1.22em;font-weight:800;color:var(--ink);text-align:center;line-height:1.2;transition:transform .12s,background .25s,border-color .25s,opacity .3s}
.wol-learn .wl-opts.stack .wl-opt{justify-content:flex-start;text-align:right;min-height:3.3em;font-size:1.12em}
.wol-learn .wl-quiz.easy .wl-opt{min-height:5.6em;font-size:1.6em}
.wol-learn .wl-opt:hover:not(:disabled){transform:translateY(-3px);border-color:#a99863}
.wol-learn .wl-opt:active:not(:disabled){transform:translateY(1px)}
.wol-learn .wl-opt img{width:2.4em;height:2.4em;object-fit:contain;flex:none;border-radius:50%;background:radial-gradient(circle,#fff 30%,rgba(255,255,255,0) 72%)}
.wol-learn .wl-quiz.easy .wl-opt img{width:2.1em;height:2.1em}
.wol-learn .wl-opt img.pt{width:2.7em;height:2.7em;object-fit:cover;border-radius:.6em;background:none;box-shadow:0 0 0 2px rgba(255,255,255,.7),0 2px 5px rgba(40,30,10,.25)}
.wol-learn .wl-quiz.easy .wl-opt img.pt{width:2.5em;height:2.5em}
.wol-learn .wl-qart.paint{background:#2a3a24;justify-content:flex-end}
.wol-learn .wl-qart.paint img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 45%;filter:none}
.wol-learn .wl-qart.paint .wl-anm{position:relative;z-index:1;box-shadow:0 2px 8px rgba(0,0,0,.3)}
.wol-learn .wl-opt i{display:grid;place-items:center;width:1.7em;height:1.7em;flex:none;color:var(--moss)}
.wol-learn .wl-opt i .wl-ic{width:100%;height:100%}
.wol-learn .wl-opt.t-day i{color:#e09a2c}.wol-learn .wl-opt.t-night i{color:#3c4f8a}.wol-learn .wl-opt.t-amazon i{color:#2f6a8a}.wol-learn .wl-opt.t-grove i{color:#4d7a2e}.wol-learn .wl-opt.t-reef i{color:#1f8ab0}
.wol-learn .wl-opt.t-yes i{color:#3f8a33}.wol-learn .wl-opt.t-no i{color:#b8463a}
.wol-learn .wl-opt.ok{background:#e3f5d3;border-color:var(--leaf2);box-shadow:0 4px 0 #3f8a33;animation:wl-glow 1.2s ease-out both}
.wol-learn .wl-opt.no{background:#f7e0d6;border-color:#d39380;box-shadow:0 4px 0 #b9705c;animation:wl-shake .5s both}
.wol-learn .wl-opt.dim{opacity:.45}
.wol-learn .wl-opt .wl-mark{position:absolute;top:-.55em;left:-.55em;width:1.7em;height:1.7em;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:.8em;box-shadow:0 2px 6px rgba(0,0,0,.25);animation:wl-pop .4s both}
.wol-learn .wl-opt.ok .wl-mark{background:var(--leaf2)}.wol-learn .wl-opt.no .wl-mark{background:#c45a45}
.wol-learn .wl-fb{display:flex;align-items:center;gap:1em;padding:.75em 1em;border-radius:16px;animation:wl-rise .35s both}
.wol-learn .wl-fb.ok{background:rgba(95,174,74,.15);box-shadow:inset 0 0 0 2px rgba(95,174,74,.35)}
.wol-learn .wl-fb.no{background:rgba(240,180,76,.16);box-shadow:inset 0 0 0 2px rgba(217,142,38,.35)}
.wol-learn .wl-fbt{flex:1;min-width:0}
.wol-learn .wl-fbt b{display:block;font-size:1.2em;color:#1f2c1a}
.wol-learn .wl-fbt p{font-family:var(--serif);font-size:1.08em;line-height:1.45;color:#2c3524}
.wol-learn .wl-quiz.easy .wl-fbt p{font-size:1.15em}
.wol-learn .wl-gotpack{display:inline-flex;align-items:center;gap:.35em;margin-top:.35em;padding:.2em .8em;border-radius:99px;background:linear-gradient(180deg,#f8d98a,#e8a43a);color:#3a2608;font-weight:800;font-size:.95em;animation:wl-bump .7s both}
/* end */
.wol-learn .wl-end{width:min(40em,92%);margin:auto;border-radius:26px;padding:1.8em 2em 2em;text-align:center;display:flex;flex-direction:column;align-items:center;gap:.9em}
.wol-learn .wl-stars{display:flex;gap:.5em;align-items:flex-end}
.wol-learn .wl-stars span{width:4.6em;height:4.6em;color:#d7cba6;display:grid;place-items:center}
.wol-learn .wl-stars span:nth-child(2){width:5.8em;height:5.8em}
.wol-learn .wl-stars span .wl-ic{width:100%;height:100%}
.wol-learn .wl-stars span.on{color:var(--amber);filter:drop-shadow(0 4px 10px rgba(217,142,38,.55));animation:wl-star .6s cubic-bezier(.2,.9,.3,1.4) both}
.wol-learn .wl-end h2{font-family:var(--serif);font-size:2.4em;line-height:1.05;color:#1f2c1a}
.wol-learn .wl-end p{font-size:1.2em;color:var(--ink2)}
.wol-learn .wl-row{display:flex;gap:.8em;flex-wrap:wrap;justify-content:center}
/* album */
.wol-learn .wl-album{align-items:stretch;padding:0 1.6em 0;gap:.8em;animation:none}
.wol-learn .wl-abar{display:flex;align-items:center;gap:1em;flex-wrap:wrap;padding:.7em 1.1em;border-radius:20px}
.wol-learn .wl-count{display:flex;flex-direction:column;min-width:13em}
.wol-learn .wl-count b{font-size:1.25em;color:#1f2c1a}
.wol-learn .wl-tabs{display:flex;gap:.35em;background:rgba(80,70,40,.1);padding:.25em;border-radius:99px}
.wol-learn .wl-tab{padding:.45em 1em;border-radius:99px;font-weight:700;color:var(--ink2);min-height:2.4em}
.wol-learn .wl-tab.sel{background:#fbf6e5;color:#1f2c1a;box-shadow:0 2px 6px rgba(0,0,0,.15)}
.wol-learn .wl-grid{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;display:grid;grid-template-columns:repeat(auto-fill,minmax(10.2em,1fr));gap:1.1em;padding:.6em .4em 1.6em;align-content:start;justify-items:center;scrollbar-width:thin;scrollbar-color:rgba(246,240,220,.35) transparent}
.wol-learn .wl-grid .wl-card{--cw:10em;cursor:pointer}
.wol-learn .wl-grid .wl-card.anim{animation:wl-rise .4s both;animation-delay:calc(var(--d,0) * 22ms)}
.wol-learn .wl-grid .wl-card:not(.is-locked):hover{transform:translateY(-4px) scale(1.03);z-index:2}
/* card */
.wol-learn .wl-card{--cw:12em;position:relative;width:10em;height:14.2em;font-size:calc(var(--cw) / 10);border-radius:.8em;padding:.32em;flex:none;
  background:linear-gradient(150deg,#9fd57a,#4f9a3e 45%,#2f5a2a);box-shadow:0 .5em 1.2em rgba(0,0,0,.35),inset 0 0 0 .08em rgba(255,255,255,.35);transition:transform .2s;text-align:right;color:var(--ink)}
.wol-learn .wl-card .wl-ic{width:1em;height:1em}
.wol-learn .wl-card.r-rare{background:linear-gradient(150deg,#ffe9a8,#e8a43a 45%,#9c6512)}
.wol-learn .wl-card.r-epic{background:linear-gradient(150deg,#ffd27a,#d0503a 35%,#7a2148 70%,#f0b44c)}
.wol-learn .wl-card.r-tech{background:linear-gradient(150deg,#bfe6ff,#4aa3d6 45%,#24476e)}
.wol-learn .wl-card.r-epic::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.55) 45%,transparent 60%);background-size:250% 100%;mix-blend-mode:soft-light;animation:wl-sheen 3.2s linear infinite}
.wol-learn .wl-cin{position:relative;height:100%;border-radius:.55em;overflow:hidden;display:flex;flex-direction:column;
  background:radial-gradient(120% 70% at 100% 0%,rgba(255,255,255,.5),transparent 55%),repeating-linear-gradient(0deg,rgba(120,100,60,.04) 0 1px,transparent 1px 3px),#f3ecd6}
.wol-learn .r-tech .wl-cin{background:radial-gradient(120% 70% at 100% 0%,rgba(255,255,255,.6),transparent 55%),repeating-linear-gradient(90deg,rgba(40,90,140,.06) 0 1px,transparent 1px 8px),repeating-linear-gradient(0deg,rgba(40,90,140,.06) 0 1px,transparent 1px 8px),#e8f1f6}
.wol-learn .wl-ctop{display:flex;align-items:center;gap:.3em;padding:.32em .5em .16em}
.wol-learn .wl-cname{flex:1;min-width:0;font-family:var(--serif);font-weight:700;font-size:1.12em;line-height:1.05;color:#1f2c1a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wol-learn .wl-cname.l{font-size:.95em}.wol-learn .wl-cname.xl{font-size:.74em}
.wol-learn .wl-badge{flex:none;font-size:.58em;font-weight:800;padding:.2em .65em;border-radius:99px;color:#fff}
.wol-learn .b-amazon{background:#2f7a5a}.wol-learn .b-grove{background:#9a7a2e}.wol-learn .b-reef{background:#1f8ab0}.wol-learn .b-tech{background:#2c5f8f}
.wol-learn .wl-cart{position:relative;margin:0 .4em;height:4.6em;flex:none;border-radius:.45em;display:grid;place-items:center;overflow:hidden;box-shadow:inset 0 0 0 .08em rgba(150,130,80,.45)}
.wol-learn .wl-cart img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 .25em .3em rgba(40,30,10,.25))}
.wol-learn .wl-cart.tool img{width:74%;height:74%}
.wol-learn .wl-cart.paint{height:4.75em;background:#2a3a24;box-shadow:inset 0 0 0 .08em rgba(150,130,80,.55),0 .1em .25em rgba(40,30,10,.25)}
.wol-learn .wl-cart.paint img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 45%;filter:none}
.wol-learn .wl-cart b{font-family:var(--serif);font-size:3em;color:rgba(40,50,30,.5)}
.wol-learn .wl-ctype{display:flex;align-items:center;justify-content:space-between;gap:.3em;padding:.28em .55em .1em;font-size:.6em;font-weight:700;color:var(--ink2)}
.wol-learn .wl-gems{display:flex;gap:.04em;color:#3f8a33;cursor:help}
.wol-learn .r-rare .wl-gems{color:#d98e26}.wol-learn .r-epic .wl-gems{color:#b3306a}.wol-learn .r-tech .wl-gems{color:#2c5f8f}
.wol-learn .wl-gem{display:flex;color:rgba(80,70,40,.2)}
.wol-learn .wl-gem.on,.wol-learn .wl-gem.t{color:inherit;filter:drop-shadow(0 .05em .08em rgba(40,30,10,.3))}
.wol-learn .wl-gem .wl-ic{width:1.15em;height:1.15em}
.wol-learn .wl-badge{cursor:help}
.wol-learn .wl-stats{display:flex;gap:.22em;padding:.22em .4em}
.wol-learn .wl-st{flex:1;display:flex;flex-direction:column;align-items:center;padding:.18em 0 .12em;border-radius:.4em;background:rgba(80,70,40,.08);transition:background .3s,box-shadow .3s,transform .3s}
.wol-learn .wl-st i{display:flex;align-items:center;gap:.15em;font-size:.75em;line-height:1}
.wol-learn .wl-st b{font-size:.9em;line-height:1;color:#1f2c1a;margin-top:.08em}
.wol-learn .wl-st small{font-size:.46em;line-height:1.3;font-weight:700;color:var(--ink2)}
.wol-learn .s-light i{color:#e09a2c}.wol-learn .s-water i{color:#2d8fd0}.wol-learn .s-shelter i{color:#c0703a}.wol-learn .s-links i{color:#4d8a3a}
.wol-learn .wl-st.hl{background:rgba(240,180,76,.4);box-shadow:0 0 0 .1em #e09a2c;transform:scale(1.08)}
.wol-learn .wl-cfact{flex:1 1 auto;min-height:0;margin:.1em .5em 0;font-family:var(--serif);font-size:.48em;line-height:1.24;color:#2c3524;overflow:hidden}
.wol-learn .wl-crar{margin-top:auto;font-size:.5em;font-weight:800;letter-spacing:.04em;text-align:center;padding:0 0 .4em;color:var(--ink2);cursor:help}
.wol-learn .r-rare .wl-crar{color:#9c6512}.wol-learn .r-epic .wl-crar{color:#8a2452}.wol-learn .r-tech .wl-crar{color:#24476e}
.wol-learn .wl-new{position:absolute;top:-.55em;left:-.5em;z-index:3;font-size:.85em;font-weight:900;color:#fff;background:var(--berry);padding:.2em .7em;border-radius:99px;transform:rotate(-10deg);box-shadow:0 .2em .5em rgba(0,0,0,.3);animation:wl-pop .5s .2s both}
.wol-learn .wl-cnt{position:absolute;bottom:-.4em;left:-.4em;font-size:.75em;font-weight:900;background:#1f2c1a;color:var(--cream);padding:.1em .55em;border-radius:99px}
.wol-learn .wl-card.is-locked{background:linear-gradient(150deg,#3c5a3a,#1e3324);cursor:default}
.wol-learn .is-locked .wl-cin{background:repeating-linear-gradient(45deg,rgba(255,255,255,.03) 0 .5em,transparent .5em 1em),#203a2a;display:grid;place-items:center}
.wol-learn .wl-sil{position:absolute;inset:1.2em .8em 2.6em;display:grid;place-items:center}
.wol-learn .wl-sil img{width:100%;height:100%;object-fit:contain;filter:brightness(0);opacity:.42}
.wol-learn .wl-qm{position:relative;font-family:var(--serif);font-size:4em;color:rgba(246,240,220,.55);text-shadow:0 .05em .2em rgba(0,0,0,.4)}
.wol-learn .wl-lockb{position:absolute;bottom:.7em;left:0;right:0;text-align:center;font-size:.62em;font-weight:800;color:rgba(246,240,220,.6)}
.wol-learn .wl-cback{background:linear-gradient(150deg,#c8e6a8,#5fae4a 40%,#1f4a28)}
.wol-learn .wl-cback .wl-cin{display:flex;align-items:center;justify-content:center;gap:.5em;background:radial-gradient(circle at 50% 42%,rgba(240,180,76,.35),transparent 45%),repeating-radial-gradient(circle at 50% 42%,rgba(255,255,255,.06) 0 .3em,transparent .3em .9em),#1f4a2c;color:var(--cream)}
.wol-learn .wl-emb{width:5em;height:5em;border-radius:50%;display:grid;place-items:center;background:rgba(246,240,220,.12);box-shadow:0 0 0 .2em rgba(240,180,76,.6),0 0 1.5em rgba(240,180,76,.4);color:#f6cf72}
.wol-learn .wl-emb .wl-ic{width:3.2em;height:3.2em}
.wol-learn .wl-cback span{font-family:var(--serif);font-weight:700;font-size:1.25em}
/* flip */
.wol-learn .wl-flip{--cw:12em;position:relative;width:10em;height:14.2em;perspective:1200px;font-size:calc(var(--cw) / 10)}
.wol-learn .wl-fin{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .7s cubic-bezier(.3,.8,.3,1.15)}
.wol-learn .wl-flip.is-up .wl-fin{transform:rotateY(180deg)}
.wol-learn .wl-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.wol-learn .wl-ffront{transform:rotateY(180deg)}
.wol-learn .wl-face>.wl-card{font-size:1em;width:100%;height:100%}
/* pack */
.wol-learn .wl-packs{justify-content:center;gap:1.2em;padding:0 2em 2em}
.wol-learn .wl-ptitle{text-align:center;font-family:var(--serif);font-size:2em;color:#f6eed0;text-shadow:0 2px 14px rgba(0,0,0,.4)}
.wol-learn .wl-psub{text-align:center;color:#e2dcbd;font-size:1.1em;margin-top:.2em;min-height:1.4em}
.wol-learn .wl-stage{position:relative;width:100%;height:25em;display:flex;align-items:center;justify-content:center}
.wol-learn .wl-rays{position:absolute;left:50%;top:50%;width:46em;height:46em;margin:-23em;border-radius:50%;pointer-events:none;opacity:0;transition:opacity 1s;
  background:repeating-conic-gradient(from 0deg,rgba(255,236,170,.32) 0 7deg,transparent 7deg 22deg);
  -webkit-mask:radial-gradient(circle,#000 8%,transparent 66%);mask:radial-gradient(circle,#000 8%,transparent 66%)}
.wol-learn .wl-stage:not(.lit) .wl-rays{display:none}
.wol-learn .wl-stage.lit .wl-rays{animation:wl-fadein .8s ease-out both,wl-spin 26s linear infinite}
.wol-learn .wl-pack{--glow:0;position:relative;z-index:1;width:13em;height:18em;border-radius:1.3em;cursor:pointer;perspective:700px;
  background:linear-gradient(160deg,rgba(255,255,255,.3),transparent 40%),radial-gradient(90% 60% at 50% 100%,rgba(240,180,76,.25),transparent 70%),linear-gradient(180deg,#4f9a3e,#2f5a2a 70%,#1e3d28);
  box-shadow:0 1.4em 2.6em rgba(0,0,0,.45),inset 0 0 0 .35em rgba(246,240,220,.28),0 0 calc(var(--glow) * 3.2em) calc(var(--glow) * .9em) rgba(255,214,120,calc(var(--glow) * .75));
  display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:1.5em;color:var(--cream);animation:wl-float 3s ease-in-out infinite;
  transition:transform .6s cubic-bezier(.5,0,.7,.4),opacity .6s,box-shadow .3s}
.wol-learn .wl-pack:disabled{cursor:default}
.wol-learn .wl-pin{position:absolute;left:1.2em;right:1.2em;top:.25em;height:2.4em;border-radius:50%;background:radial-gradient(closest-side,#fff6d0,rgba(255,214,120,.7) 45%,transparent);opacity:0;transition:opacity .4s .15s}
.wol-learn .wl-pflap{position:absolute;left:0;right:0;top:0;height:7.4em;border-radius:1.3em 1.3em 0 0;transform-origin:50% 0;transition:transform .55s cubic-bezier(.3,.6,.3,1.2);
  background:linear-gradient(180deg,#78bd5a,#4a8a3a);clip-path:polygon(0 0,100% 0,100% 22%,50% 100%,0 22%)}
.wol-learn .wl-ptw{position:absolute;left:50%;width:.55em;margin-left:-.275em;border-radius:.3em;transition:transform .5s cubic-bezier(.3,.7,.4,1),opacity .5s;
  background:repeating-linear-gradient(135deg,#e8d6a6 0 .3em,#b89660 .3em .55em);box-shadow:0 .1em .2em rgba(0,0,0,.25)}
.wol-learn .wl-ptw.a{top:0;height:7.4em}.wol-learn .wl-ptw.b{top:7.4em;bottom:4.9em}
.wol-learn .wl-pseal{position:absolute;top:5em;left:50%;width:4.8em;height:4.8em;margin-left:-2.4em;border-radius:50%;display:grid;place-items:center;color:#6b3f0c;z-index:2;
  background:radial-gradient(circle at 38% 32%,#ffe39a,#f0b44c 45%,#c4801e 80%,#9a5d12);box-shadow:0 .25em .5em rgba(0,0,0,.35),inset 0 0 0 .28em rgba(154,93,18,.55),inset 0 0 0 .42em rgba(255,227,154,.5);
  transition:transform .55s cubic-bezier(.3,.6,.4,1),opacity .55s}
.wol-learn .wl-pseal>.wl-ic{width:2.7em;height:2.7em}
.wol-learn .wl-pcrk{position:absolute;inset:0;width:100%;height:100%;fill:none;stroke:#fff8d6;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 .25em #ffe9a0)}
.wol-learn .wl-pcrk path{stroke-dasharray:40;stroke-dashoffset:40;transition:stroke-dashoffset .3s ease-out}
.wol-learn .crk1 .wl-pcrk .c1,.wol-learn .crk2 .wl-pcrk .c1,.wol-learn .crk2 .wl-pcrk .c2,.wol-learn .crk3 .wl-pcrk path{stroke-dashoffset:0}
.wol-learn .wl-pack b{font-family:var(--serif);font-size:1.9em;line-height:1}
.wol-learn .wl-pack small{font-weight:700;opacity:.85}
.wol-learn .wl-pack.hit{animation:wl-phit .38s cubic-bezier(.3,.7,.4,1.4)}
.wol-learn .wl-pack.crk2.hit{animation:wl-phit2 .45s cubic-bezier(.3,.7,.4,1.4)}
.wol-learn .wl-pack.open{animation:none}
.wol-learn .wl-pack.open .wl-pflap{transform:rotateX(-165deg)}
.wol-learn .wl-pack.open .wl-pin{opacity:1}
.wol-learn .wl-pack.open .wl-pseal{transform:translate(4em,-5em) rotate(160deg) scale(.6);opacity:0}
.wol-learn .wl-pack.open .wl-ptw.a{transform:translateY(-3em) rotate(-25deg);opacity:0}
.wol-learn .wl-pack.open .wl-ptw.b{transform:translateY(3em) rotate(18deg);opacity:0}
.wol-learn .wl-pack.gone{transform:translateY(9em) scale(.85);opacity:0}
.wol-learn .wl-flash{position:absolute;left:50%;top:50%;z-index:1;width:30em;height:30em;margin:-15em;border-radius:50%;background:radial-gradient(circle,rgba(255,240,190,.95),rgba(240,180,76,.35) 40%,transparent 70%);pointer-events:none;animation:wl-flash .8s ease-out both}
/* pack v2: a foil bag rendered in Blender (src/data/pack-art.js: body + the strip above the tear line) */
.wol-learn .wl-pack.v2{width:14em;height:21em;border-radius:0;background:none;box-shadow:none;padding:0;color:inherit;z-index:3;
  --rx:0deg;--ry:0deg;--rc:255,214,120;transform-style:preserve-3d;animation:wl-pkidle 4.2s ease-in-out infinite;
  filter:drop-shadow(0 1.3em 1.4em rgba(0,0,0,.45)) drop-shadow(0 0 calc(var(--glow) * 2.6em) rgba(var(--rc),calc(var(--glow) * .9)))}
.wol-learn .wl-pack.v2 .wl-pk3{position:absolute;inset:0;transform:rotateX(var(--rx)) rotateY(var(--ry));transition:transform .25s ease-out;transform-style:preserve-3d}
.wol-learn .wl-pk-body,.wol-learn .wl-pk-strip{position:absolute;inset:0;background-size:100% 100%;background-repeat:no-repeat;overflow:hidden;
  -webkit-mask-size:100% 100%;mask-size:100% 100%;transition:transform .7s cubic-bezier(.25,.8,.3,1),opacity .7s}
.wol-learn .wl-pk-sheen{position:absolute;inset:-20% -60%;background:linear-gradient(105deg,transparent 38%,rgba(255,255,255,.55) 47%,rgba(255,240,200,.25) 52%,transparent 60%);
  mix-blend-mode:overlay;transform:translateX(-60%);animation:wl-pksheen 4.2s ease-in-out infinite}
.wol-learn .wl-pk-tear{position:absolute;left:4%;right:4%;height:.5em;margin-top:-.25em;border-radius:.3em;pointer-events:none;
  background:linear-gradient(90deg,rgba(var(--rc),.0),rgba(255,255,255,.95) 50%,rgba(var(--rc),.0));box-shadow:0 0 .8em .25em rgba(var(--rc),.9);
  clip-path:inset(0 0 0 100%);transition:clip-path .45s ease-out}
.wol-learn .wl-pack.v2.crk1 .wl-pk-tear{clip-path:inset(0 0 0 62%)}
.wol-learn .wl-pack.v2.crk2 .wl-pk-tear{clip-path:inset(0 0 0 28%)}
.wol-learn .wl-pack.v2.crk3 .wl-pk-tear{clip-path:inset(0 0 0 0)}
.wol-learn .wl-pk-beam{position:absolute;left:8%;right:8%;bottom:calc(100% - var(--tear));height:26em;transform-origin:50% 100%;transform:scaleY(0);opacity:0;pointer-events:none;
  background:linear-gradient(0deg,rgba(255,255,255,.95),rgba(var(--rc),.55) 30%,transparent 85%);clip-path:polygon(8% 100%,92% 100%,100% 0,0 0);filter:blur(2px);
  transition:transform .5s cubic-bezier(.2,.8,.3,1),opacity .5s}
.wol-learn .wl-pack.v2.hit{animation:wl-pkshake .36s ease-in-out}
.wol-learn .wl-pack.v2.crk2.hit{animation:wl-pkshake2 .42s ease-in-out}
.wol-learn .wl-pack.v2.crk3.hit{animation:wl-pkshake2 .3s ease-in-out infinite}
.wol-learn .wl-pack.v2.open{animation:none}
.wol-learn .wl-pack.v2.open .wl-pk-strip{transform:translate(-4.5em,-7em) rotate(-24deg);opacity:0}
.wol-learn .wl-pack.v2.open .wl-pk-tear{opacity:0;transition:opacity .2s}
.wol-learn .wl-pack.v2.open .wl-pk-beam{transform:scaleY(1);opacity:1}
.wol-learn .wl-pack.v2.open .wl-pk-sheen{animation:none;opacity:0}
.wol-learn .wl-pack.v2.gone{transform:translateY(12em) scale(.92);opacity:0;transition:transform .8s cubic-bezier(.5,0,.7,.4),opacity .8s}
.wol-learn .wl-pack.v2.gone .wl-pk-beam{opacity:0}
.wol-learn .wl-stage.v2 .wl-flip{z-index:2}
.wol-learn .wl-stage.v2 .wl-flip.rise:not(.out){transform:translateY(-8.4em) scale(.72)}
.wol-learn .wl-stage.v2 .wl-flip.rise.k0:not(.out){transform:translateY(-8em) translateX(.9em) scale(.72) rotate(5deg)}
.wol-learn .wl-stage.v2 .wl-flip.rise.k2:not(.out){transform:translateY(-8em) translateX(-.9em) scale(.72) rotate(-5deg)}
.wol-learn .wl-stage.v2 .wl-flip.out{z-index:4}
@keyframes wl-pkidle{0%,100%{transform:translateY(0) rotateZ(-1.2deg)}50%{transform:translateY(-.55em) rotateZ(1.2deg)}}
@keyframes wl-pksheen{0%,45%{transform:translateX(-60%)}75%,100%{transform:translateX(60%)}}
@keyframes wl-pkshake{0%,100%{transform:none}25%{transform:translateX(-.25em) rotate(-2deg) scale(1.02)}55%{transform:translateX(.25em) rotate(2deg)}80%{transform:translateX(-.1em)}}
@keyframes wl-pkshake2{0%,100%{transform:scale(1.03)}25%{transform:translateX(-.35em) rotate(-3deg) scale(1.05)}55%{transform:translateX(.35em) rotate(3deg) scale(1.04)}80%{transform:translateX(-.15em) scale(1.05)}}
@media (prefers-reduced-motion: reduce){.wol-learn .wl-pack.v2,.wol-learn .wl-pk-sheen{animation:none}}
/* torah edition: sources in the quiz, the album page of source cards, the switch on the hub home */
.wol-learn .wl-src{margin:.6em 0 .2em;padding:.55em .9em;border-radius:.8em;background:linear-gradient(180deg,#fbf3dc,#f2e5c0);border:1px solid rgba(160,120,50,.35);text-align:center;color:#3a2e18}
.wol-learn .wl-src .t{margin:0;font-family:var(--serif);font-size:1.15em;line-height:1.95}
.wol-learn .wl-src small{display:block;color:#8a6a3a;font-size:.85em}
.wol-learn .wl-src .n{margin:.3em 0 0;font-size:.9em;color:#5a4a2a}
.wol-learn .wl-src.shira{margin:.8em 0}
.wol-learn .wl-gotpack.src{background:linear-gradient(180deg,#fbf0d0,#efd9a0);color:#5a3a10}
.wol-learn .wl-gotpack.src .wl-ic{width:1.2em;height:1.2em}
.wol-learn .wl-srcpage{display:flex;flex-direction:column;gap:1em;padding:0 0 1.5em;flex:1;min-height:0;overflow-y:auto;scrollbar-width:thin}
.wol-learn .wl-grid>.wl-srcall{grid-column:1/-1;justify-self:stretch}
.wol-learn .wl-grid>.wl-srcall .wl-srcpage{overflow:visible}
.wol-learn .wl-pk-wait{display:grid;place-items:center;width:9em;height:12em;border-radius:1em;background:rgba(246,240,220,.08);box-shadow:inset 0 0 0 3px rgba(246,240,220,.2)}
.wol-learn .wl-pk-wait .wl-ic{width:4.5em;height:4.5em;color:#f6cf72;opacity:.8}
.wol-learn .wl-srcall{margin-top:1.4em;padding-top:1.2em;border-top:2px dashed rgba(246,240,220,.25)}
.wol-learn .wl-srchead{display:flex;gap:.8em;align-items:center;padding:.8em 1.1em;border-radius:1em}
.wol-learn .wl-srchead>.wl-ic{width:2.2em;height:2.2em;color:#b8892e;flex:none}
.wol-learn .wl-srchead p{margin:.15em 0 0;opacity:.85}
.wol-learn .wl-sgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(10.5em,1fr));gap:1em}
.wol-learn .wl-scard{--sc:#b8892e;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.4em;min-height:13.5em;padding:1.2em .9em;border-radius:1em;cursor:pointer;
  color:#3a2a10;text-align:center;font:inherit;border:0;
  background:radial-gradient(120% 80% at 50% 0%,rgba(255,255,255,.65),transparent 60%),linear-gradient(180deg,#fbf3dc,#ecdcb0);
  box-shadow:0 0 0 .3em #fff8e6,0 0 0 .45em var(--sc),0 .6em 1.2em rgba(0,0,0,.3);animation:wl-fadein .5s ease-out both;animation-delay:calc(var(--d,0) * 60ms)}
.wol-learn .wl-scard .wl-sci{display:grid;place-items:center;width:3.6em;height:3.6em;border-radius:50%;background:var(--sc);color:#fff8e6;box-shadow:inset 0 0 0 .25em rgba(255,255,255,.35)}
.wol-learn .wl-scard .wl-sci .wl-ic{width:2em;height:2em}
.wol-learn .wl-scard b{font-family:var(--serif);font-size:1.25em;line-height:1.5}
.wol-learn .wl-scard small{font-size:.85em;opacity:.8;line-height:1.35}
.wol-learn .wl-scard.locked{filter:saturate(.2);opacity:.75}
.wol-learn .wl-scard.locked b{opacity:.7}
.wol-learn .wl-scard:not(.locked):hover{transform:translateY(-.2em)}
.wol-learn .wl-scard.big{width:13em;min-height:18em;cursor:default;animation:none}
.wol-learn .wl-scard.art{justify-content:flex-start;padding:.55em .55em .9em;gap:.25em}
.wol-learn .wl-sart{position:relative;display:block;width:100%;aspect-ratio:1.45;border-radius:.65em;overflow:hidden;flex:none;box-shadow:inset 0 0 0 .12em rgba(80,50,10,.35)}
.wol-learn .wl-sart img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.wol-learn .wl-sart.none{display:grid;place-items:center;background:radial-gradient(circle at 28% 22%,rgba(255,248,230,.5),rgba(255,248,230,0) 58%),radial-gradient(circle at 80% 90%,rgba(40,25,5,.25),rgba(40,25,5,0) 55%),var(--sc)}
.wol-learn .wl-sart.none i{display:grid;place-items:center;width:42%;aspect-ratio:1;border-radius:50%;background:rgba(255,248,230,.16);box-shadow:0 0 0 .35em rgba(255,248,230,.1)}
.wol-learn .wl-sart.none .wl-ic{width:62%;height:62%;color:rgba(255,248,230,.85)}
.wol-learn .wl-scard.art .wl-sci{width:2.8em;height:2.8em;margin-top:-1.6em;position:relative;box-shadow:inset 0 0 0 .2em rgba(255,255,255,.35),0 0 0 .2em #fbf3dc}
.wol-learn .wl-scard.art .wl-sci .wl-ic{width:1.5em;height:1.5em}
.wol-learn .wl-scard.art b{font-size:1.15em;line-height:1.35}
.wol-learn .wl-scard.locked .wl-sart img{filter:blur(.35em) grayscale(.6);transform:scale(1.15)}
.wol-learn .wl-scard.big.art{width:min(17em,44vh);min-height:0}
.wol-learn .wl-scard.big .wl-sart{aspect-ratio:1}
.wol-learn .wl-smtext{max-width:34em}
.wol-learn .wl-sstory p{margin:.4em 0;font-family:var(--serif);font-size:1.1em;line-height:2}
.wol-learn .wl-slesson{margin:.6em 0;font-weight:700}
.wol-learn .wl-srcsw{display:flex;align-items:center;gap:.8em;margin:0 auto 1em;padding:.6em 1em;border-radius:1em;border:0;font:inherit;color:#3a2a10;cursor:pointer;max-width:34em;width:100%;text-align:right}
.wol-learn .wl-srcsw>.wl-ic{width:1.8em;height:1.8em;color:#b8892e;flex:none}
.wol-learn .wl-srcsw span{flex:1;display:flex;flex-direction:column}
.wol-learn .wl-srcsw small{opacity:.8}
.wol-learn .wl-srcsw .sw{position:relative;width:2.6em;height:1.5em;border-radius:1em;background:#b6b294;flex:none;transition:background .2s}
.wol-learn .wl-srcsw .sw::after{content:"";position:absolute;top:.2em;right:.2em;width:1.1em;height:1.1em;border-radius:50%;background:#fbfaf0;transition:right .2s}
.wol-learn .wl-srcsw.on .sw{background:#5fae4a}
.wol-learn .wl-srcsw.on .sw::after{right:1.3em}
.wol-learn .wl-quiz.torah .wl-qtag{background:#b8892e;color:#fff8e6}
.wol-learn .wl-quiz.torah .wl-opt.dim{display:none}
.wol-learn .wl-quiz.torah .wl-qwrap{flex-basis:36em}
.wol-learn .wl-quiz.torah .wl-qbody{justify-content:flex-start}
/* cards out of the pack: inside → rise → spread (right to left) */
.wol-learn .wl-stage .wl-flip{--cw:13em;position:absolute;z-index:2;left:50%;top:50%;margin:-7.1em 0 0 -5em;opacity:0;outline:none;
  transition:transform .75s cubic-bezier(.2,.9,.3,1.15),opacity .35s;transform:translateY(4em) scale(.5)}
.wol-learn .wl-stage .wl-flip.rise{opacity:1;transform:translateY(-3.2em) scale(.72)}
.wol-learn .wl-stage .wl-flip.rise.k0{transform:translateY(-3.2em) translateX(.5em) scale(.72) rotate(4deg)}
.wol-learn .wl-stage .wl-flip.rise.k2{transform:translateY(-3.2em) translateX(-.5em) scale(.72) rotate(-4deg)}
.wol-learn .wl-stage .wl-flip.out.k0{transform:translateX(11.5em) translateY(.8em) rotate(5deg)}
.wol-learn .wl-stage .wl-flip.out.k1{transform:translateY(-.4em)}
.wol-learn .wl-stage .wl-flip.out.k2{transform:translateX(-11.5em) translateY(.8em) rotate(-5deg)}
.wol-learn .wl-stage .wl-flip.out:not(.is-up){cursor:pointer}
.wol-learn .wl-stage .wl-flip.out:not(.is-up):not(.tease):hover .wl-fin,.wol-learn .wl-stage .wl-flip.out:not(.is-up):focus-visible .wl-fin{transform:translateY(-.5em) scale(1.04);transition-duration:.25s}
.wol-learn .wl-stage .wl-flip:focus-visible .wl-fback .wl-card{outline:.18em solid var(--amber);outline-offset:.2em}
/* rarity hint glowing through the back of the card */
.wol-learn .wl-flip .wl-fback{border-radius:.8em;transition:box-shadow .4s}
.wol-learn .wl-stage .wl-flip.out:not(.is-up).h-common .wl-fback{box-shadow:0 0 1.2em .1em rgba(183,224,142,.45)}
.wol-learn .wl-stage .wl-flip.out:not(.is-up).h-tech .wl-fback{box-shadow:0 0 1.6em .3em rgba(140,195,220,.7);animation:wl-hint 1.8s ease-in-out infinite}
.wol-learn .wl-stage .wl-flip.out:not(.is-up).h-rare .wl-fback{box-shadow:0 0 1.8em .4em rgba(246,207,114,.8);animation:wl-hint 1.4s ease-in-out infinite}
.wol-learn .wl-stage .wl-flip.out:not(.is-up).h-epic .wl-fback{box-shadow:0 0 2em .5em rgba(231,154,171,.8),0 0 3.4em .9em rgba(185,168,224,.55);animation:wl-hint 1s ease-in-out infinite}
.wol-learn .wl-stage .wl-flip.tease .wl-fin{animation:wl-tease .3s ease-in-out infinite}
.wol-learn .wl-stage .wl-flip.tease.h-epic .wl-fin{animation-duration:.2s}
.wol-learn .wl-flip:not(.is-up) .wl-new{animation:none;opacity:0}
.wol-learn .wl-flip.is-up .wl-new{animation:wl-stamp .5s .5s cubic-bezier(.3,1.6,.5,1) both}
/* reveal burst behind the card */
.wol-learn .wl-burst{position:absolute;left:50%;top:50%;width:26em;height:26em;margin:-13em;border-radius:50%;z-index:-1;pointer-events:none;
  -webkit-mask:radial-gradient(circle,#000 18%,transparent 64%);mask:radial-gradient(circle,#000 18%,transparent 64%);animation:wl-burst 1.4s ease-out both}
.wol-learn .wl-burst.b-common{background:repeating-conic-gradient(rgba(183,224,142,.55) 0 8deg,transparent 8deg 30deg)}
.wol-learn .wl-burst.b-tech{background:repeating-conic-gradient(rgba(140,195,220,.65) 0 8deg,transparent 8deg 24deg)}
.wol-learn .wl-burst.b-rare,.wol-learn .wl-burst.b-epic{animation:wl-burst2 2.2s ease-out both,wl-spin 12s linear infinite}
.wol-learn .wl-burst.b-rare{background:repeating-conic-gradient(rgba(246,207,114,.75) 0 7deg,transparent 7deg 18deg)}
.wol-learn .wl-burst.b-epic{width:32em;height:32em;margin:-16em;background:repeating-conic-gradient(rgba(246,207,114,.8) 0 6deg,transparent 6deg 12deg,rgba(231,154,171,.75) 12deg 18deg,transparent 18deg 24deg,rgba(185,168,224,.75) 24deg 30deg,transparent 30deg 36deg)}
.wol-learn .wl-rsay{position:absolute;left:50%;top:-2.35em;z-index:4;white-space:nowrap;font-family:var(--serif);font-weight:700;font-size:1.05em;padding:.2em .9em;border-radius:99px;transform:translateX(-50%);pointer-events:none;animation:wl-say .6s .35s cubic-bezier(.3,1.6,.5,1) both;box-shadow:0 .3em .8em rgba(0,0,0,.3)}
.wol-learn .wl-rsay.s-rare{background:linear-gradient(180deg,#ffe9a8,#e8a43a);color:#4a2c06}
.wol-learn .wl-rsay.s-epic{background:linear-gradient(90deg,#f6cf72,#e79aab,#b9a8e0);color:#3a1630}
.wol-learn .wl-rsay.s-tech{background:linear-gradient(180deg,#dbeaf0,#8cc3dc);color:#1f3f58}
.wol-learn .wl-games{margin-top:0}
.wol-learn .wl-home{gap:1.1em}
.wol-learn .wl-home .wl-hero h1{font-size:2.8em}
.wol-learn .wl-home .wl-tart{height:9.6em}
.wol-learn .wl-home .wl-fan{transform:scale(.8)}
.wol-learn .wl-home .wl-tbody{padding:.7em 1.3em 1em}
.wol-learn .wl-home .wl-tbody h2{font-size:1.9em}
.wol-learn .wl-tile.game .wl-tart{background:radial-gradient(circle at 50% 60%,rgba(120,190,220,.45),transparent 60%),linear-gradient(180deg,#dcebd8,#bcd6b8)}
.wol-learn .wl-gart{display:flex;align-items:center;justify-content:center;gap:.4em}
.wol-learn .wl-gart .wl-card{--cw:6.4em;transform:rotate(-4deg)}
.wol-learn .wl-gart .wl-card:nth-child(odd){transform:rotate(4deg)}
.wol-learn .wl-gthread{width:2.2em;height:.25em;border-radius:9px;background:linear-gradient(90deg,#f6cf72,#8fd067);box-shadow:0 0 .8em #f6cf72}
/* badges (תגים) */
${BADGE_CSS}
.wol-learn .wl-badgetile{display:flex;align-items:center;gap:1.2em;width:min(60em,100%);margin:0 auto;padding:.8em 1.4em;border-radius:1.2em;text-align:right;cursor:pointer;transition:transform .2s}
.wol-learn .wl-badgetile:hover{transform:translateY(-.2em)}
.wol-learn .wl-bt-row{display:flex;gap:.2em}.wol-learn .wl-bt-row .bdg{--bs:4.2em}
.wol-learn .wl-bt-text b{display:block;font-family:var(--serif);font-size:1.4em;color:#3a2a10}.wol-learn .wl-bt-text small{color:#5a4a30}
.wol-learn .wl-badges{gap:1em;padding:0 1.6em 1.6em;overflow-y:auto;overflow-x:hidden;min-height:0;scrollbar-width:thin}
.wol-learn .wl-bhead{display:flex;align-items:center;justify-content:space-between;padding:.7em 1.2em;border-radius:1em;width:min(60em,100%);margin:0 auto}
.wol-learn .wl-bhead b{font-family:var(--serif);font-size:1.5em}
.wol-learn .wl-bgroup{width:min(60em,100%);margin:0 auto;padding:.8em 1em 1em;border-radius:1em;background:linear-gradient(180deg,color-mix(in srgb,var(--bg1) 35%,transparent),rgba(0,0,0,.18));box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}
.wol-learn .wl-bgroup h3{display:flex;align-items:center;justify-content:space-between;margin:0 0 .6em;color:#f6edcf;font-family:var(--serif)}
.wol-learn .wl-bgroup h3 small{color:var(--bg2);font-family:inherit;font-weight:800}
.wol-learn .wl-bgrid{display:flex;flex-wrap:wrap;gap:1em .6em}
.wol-learn .wl-frames{width:min(60em,100%);margin:0 auto;padding:1em 1.2em;border-radius:1em}
.wol-learn .wl-frames h3{margin:0;font-family:var(--serif)}.wol-learn .wl-frames p{margin:.2em 0 .8em;color:#5a4a30}
.wol-learn .wl-frow{display:flex;flex-wrap:wrap;gap:.7em}
.wol-learn .wl-frame{display:flex;flex-direction:column;align-items:center;gap:.25em;width:8.4em;padding:.6em;border-radius:.8em;background:rgba(0,0,0,.06);color:#3a2a10;text-align:center}
.wol-learn .wl-frame:disabled{opacity:.45;cursor:default}
.wol-learn .wl-frame.sel{background:#fff4cf;box-shadow:0 0 0 .2em #e2b247}
.wol-learn .wl-frame small{color:#6a5a40;font-size:.78em}
.wol-learn .wl-fsw{width:3.4em;height:4.4em;border-radius:.4em;background:#f3ead0}
/* the frames on the album cards (and their swatches) */
.wol-learn .fr-leaf.wl-card,.wol-learn .wl-frame.fr-leaf .wl-fsw{box-shadow:0 0 0 .22em #3f8a4a,0 0 0 .42em #a8d878,0 .5em 1em rgba(0,0,0,.35)}
.wol-learn .fr-oak.wl-card,.wol-learn .wl-frame.fr-oak .wl-fsw{box-shadow:0 0 0 .22em #7a5530,0 0 0 .42em #d6b07a,0 .5em 1em rgba(0,0,0,.35)}
.wol-learn .fr-coral.wl-card,.wol-learn .wl-frame.fr-coral .wl-fsw{box-shadow:0 0 0 .22em #e0705a,0 0 0 .42em #6fd0d8,0 .5em 1em rgba(0,0,0,.35)}
.wol-learn .fr-brass.wl-card,.wol-learn .wl-frame.fr-brass .wl-fsw{box-shadow:0 0 0 .22em #b88a2a,0 0 0 .3em #6b4a12,0 0 0 .48em #e8c870,0 .5em 1em rgba(0,0,0,.35)}
.wol-learn .fr-deep.wl-card,.wol-learn .wl-frame.fr-deep .wl-fsw{box-shadow:0 0 0 .22em #163a5a,0 0 0 .42em #6fd0ff,0 0 1.1em rgba(111,208,255,.55)}
.wol-learn .fr-gold.wl-card,.wol-learn .wl-frame.fr-gold .wl-fsw{box-shadow:0 0 0 .2em #fff2b0,0 0 0 .44em #d8a640,0 0 0 .52em #8a6214,0 0 1.4em rgba(246,207,114,.6)}
/* duel */
.wol-learn .wl-duel{padding:0 1.6em 1em;gap:.7em}
.wol-learn .wl-dhead{display:flex;align-items:center;gap:1.2em;padding:.55em 1.3em;border-radius:20px;width:min(60em,100%)}
.wol-learn .wl-score{display:flex;align-items:center;gap:.6em;font-weight:800;font-size:1.15em;color:#1f2c1a}
.wol-learn .wl-score b{font-size:1.6em;min-width:1em;text-align:center}
.wol-learn .wl-rounds{display:flex;gap:.3em}
.wol-learn .wl-rounds i{width:.9em;height:.9em;border-radius:50%;background:rgba(80,70,40,.2)}
.wol-learn .wl-rounds i.w{background:var(--leaf2)}.wol-learn .wl-rounds i.l{background:#c45a45}.wol-learn .wl-rounds i.t{background:#b9a774}.wol-learn .wl-rounds i.c{box-shadow:0 0 0 .18em var(--amber)}
.wol-learn .wl-dstat{margin-inline-start:auto;display:flex;align-items:center;gap:.5em;padding:.35em 1em;border-radius:99px;background:linear-gradient(180deg,#f8d98a,#e8a43a);color:#3a2608;font-weight:800;font-size:1.15em;animation:wl-bump .6s both}
.wol-learn .wl-dstat .wl-ic{width:1.4em;height:1.4em}
.wol-learn .wl-arena{position:relative;display:flex;align-items:center;justify-content:center;gap:3.4em;flex:1;min-height:0}
.wol-learn .wl-duel{gap:.45em}
.wol-learn .wl-slot{display:flex;flex-direction:column;align-items:center;gap:.4em}
.wol-learn .wl-slot>small{font-weight:800;color:#e2dcbd;font-size:1.05em}
.wol-learn .wl-slot .wl-flip,.wol-learn .wl-slot .wl-empty{--cw:min(14.5em,22.5vh)}
.wol-learn .wl-empty{font-size:calc(var(--cw) / 10);width:10em;height:14.2em;border-radius:.8em;border:3px dashed rgba(246,240,220,.3);display:grid;place-items:center;color:rgba(246,240,220,.5);font-weight:700;text-align:center;padding:1em;line-height:1.3}
.wol-learn .wl-vs{font-family:var(--serif);font-size:2.6em;font-weight:700;color:var(--amber);text-shadow:0 3px 14px rgba(0,0,0,.4)}
.wol-learn .wl-slot.win .wl-flip{filter:drop-shadow(0 0 1.2em rgba(143,208,103,.9))}
.wol-learn .wl-slot.win>small{color:var(--leaf)}
.wol-learn .wl-dbar{min-height:3.2em;display:flex;align-items:center;justify-content:center}
.wol-learn .wl-dmsg{white-space:nowrap;display:flex;align-items:center;gap:.8em;padding:.35em .45em .35em 1.3em;border-radius:99px;font-weight:800;font-size:1.15em;animation:wl-rise .35s both}
.wol-learn .wl-dhint{color:#e2dcbd;font-weight:700;font-size:1.1em;display:flex;align-items:center;gap:.4em}
.wol-learn .wl-hand{display:flex;gap:.9em;justify-content:center;flex-wrap:nowrap;padding:.3em .6em .5em;min-height:calc(min(10.5em,18vh) * 1.42 + .8em)}
.wol-learn .wl-hand .wl-card{--cw:min(10.5em,18vh,15.5vw);cursor:pointer}
@media (max-height:660px){.wol-learn .wl-dhelp{display:none}}
.wol-learn .wl-hand .wl-card:hover:not(.used){transform:translateY(-.6em) scale(1.08);z-index:2}
.wol-learn .wl-hand .wl-card.used{opacity:.3;filter:grayscale(1);cursor:default}
.wol-learn .wl-hand.locked .wl-card{pointer-events:none}
.wol-learn .wl-dhelp{color:#e2dcbd;font-size:.95em;text-align:center}
.wol-learn .wl-dhelp .wl-ic{width:1.1em;height:1.1em}
/* modal */
.wol-learn .wl-modal{position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;gap:2.4em;padding:2em;background:rgba(8,20,12,.72);backdrop-filter:blur(4px);animation:wl-in .25s both}
.wol-learn .wl-modal[hidden]{display:none}
.wol-learn .wl-modal .wl-card{--cw:min(19em,46vh);animation:wl-pop .45s cubic-bezier(.2,.9,.3,1.25) both}
.wol-learn .wl-mtext{width:min(26em,40vw);border-radius:20px;padding:1.3em 1.5em;display:flex;flex-direction:column;gap:.7em}
.wol-learn .wl-mtext h3{font-family:var(--serif);font-size:2em;line-height:1.05;color:#1f2c1a}
.wol-learn .wl-mtext p{font-family:var(--serif);font-size:1.12em;line-height:1.55;color:#2c3524}
.wol-learn .wl-mstats{display:flex;flex-direction:column;gap:.35em;font-size:.98em;color:var(--ink2)}
.wol-learn .wl-mstats span{display:flex;align-items:center;gap:.5em}
.wol-learn .wl-mrar{display:flex;align-items:center;gap:.6em;padding:.45em .8em;border-radius:12px;background:rgba(80,70,40,.08);font-size:1em;line-height:1.35;color:#2c3524}
.wol-learn .wl-mrar .wl-gems{flex:none;font-size:1.3em;cursor:default}
.wol-learn .wl-mrar.r-rare{background:rgba(240,180,76,.2)}.wol-learn .wl-mrar.r-epic{background:rgba(179,48,106,.12)}.wol-learn .wl-mrar.r-tech{background:rgba(44,95,143,.12)}
.wol-learn .wl-legbtn{min-height:2.6em;padding:.3em 1em}
.wol-learn .wl-legbtn .wl-ic{width:1.3em;height:1.3em;color:#2f6a26}
.wol-learn .wl-lgcard{position:relative;flex:none}
.wol-learn .wl-lgpin{position:absolute;z-index:3;width:1.9em;height:1.9em;margin:-.95em 0 0 -.95em;border-radius:50%;display:grid;place-items:center;background:linear-gradient(180deg,#fff2c4,#f0b44c);color:#3a2608;font-weight:900;font-size:1em;box-shadow:0 0 0 .18em #1f2c1a,0 .2em .5em rgba(0,0,0,.4);animation:wl-pop .4s .35s both}
.wol-learn .wl-legend{width:min(31em,50vw);max-height:100%;overflow:auto;padding:1em 1.3em;gap:.5em}
.wol-learn .wl-legend h3{font-size:1.7em}
.wol-learn .wl-legend ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.4em}
.wol-learn .wl-legend li{display:flex;gap:.55em;align-items:flex-start}
.wol-learn .wl-lgn{flex:none;width:1.6em;height:1.6em;border-radius:50%;display:grid;place-items:center;background:#f0b44c;color:#3a2608;font-weight:900;font-size:.9em;margin-top:.1em}
.wol-learn .wl-legend li b{color:#1f2c1a}
.wol-learn .wl-legend li p{font-family:var(--sans);font-size:.92em;line-height:1.4;color:#2c3524;margin:0}
.wol-learn .wl-legend li p .wl-ic{width:1.1em;height:1.1em;vertical-align:-.15em}
.wol-learn .wl-legend li p .s-light,.wol-learn .wl-legend li p svg{color:inherit}
.wol-learn .wl-legend .wl-badge{display:inline-block;font-size:.8em;vertical-align:.1em}
.wol-learn .wl-lr{display:inline-flex;align-items:center;gap:.25em;margin-inline-end:.7em;white-space:nowrap;font-weight:700}
.wol-learn .wl-lgems{display:inline-flex}
.wol-learn .wl-lr .wl-gem .wl-ic{width:1em;height:1em}
.wol-learn .wl-lr.c .wl-gem.on{color:#3f8a33}.wol-learn .wl-lr.r .wl-gem.on{color:#d98e26}.wol-learn .wl-lr.e .wl-gem.on{color:#b3306a}.wol-learn .wl-lr.t .wl-gems{color:#2c5f8f;cursor:default}
.wol-learn .wl-legend>.wl-btn{align-self:center;margin-top:.2em}
.wol-learn .wl-pips{display:inline-flex;gap:.18em;margin-inline-start:auto}
.wol-learn .wl-pips i{width:.75em;height:.75em;border-radius:50%;background:rgba(80,70,40,.18)}
.wol-learn .wl-pips i.on{background:var(--amber2)}
/* fx */
.wol-learn .wl-fx{position:absolute;inset:0;pointer-events:none;z-index:30;overflow:hidden}
.wol-learn .wl-conf{position:absolute;width:.95em;height:.6em;border-radius:80% 0 80% 0;background:var(--c);transform:translate(-50%,-50%);animation:wl-conf 1.25s cubic-bezier(.15,.7,.4,1) both}
.wol-learn .wl-toast{position:absolute;top:5em;left:50%;z-index:40;transform:translate(-50%,-1em);opacity:0;display:flex;align-items:center;gap:.5em;padding:.6em 1.3em;border-radius:99px;background:linear-gradient(180deg,#f8d98a,#e8a43a);color:#3a2608;font-weight:800;box-shadow:0 8px 24px rgba(0,0,0,.35);transition:opacity .3s,transform .3s;pointer-events:none}
.wol-learn .wl-toast.on{opacity:1;transform:translate(-50%,0)}
/* keyframes */
@keyframes wl-in{from{opacity:0}to{opacity:1}}
@keyframes wl-rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes wl-pop{0%{opacity:0;transform:scale(.6)}100%{opacity:1;transform:scale(1)}}
@keyframes wl-flipin{0%{opacity:0;transform:rotateY(-80deg) scale(.92)}60%{opacity:1}100%{opacity:1;transform:none}}
@keyframes wl-glow{0%{box-shadow:0 4px 0 #3f8a33,0 0 0 0 rgba(143,208,103,.9)}40%{box-shadow:0 4px 0 #3f8a33,0 0 0 .5em rgba(143,208,103,.55),0 0 2.2em rgba(143,208,103,.9)}100%{box-shadow:0 4px 0 #3f8a33,0 0 0 .3em rgba(143,208,103,.5),0 0 1.2em rgba(143,208,103,.5)}}
@keyframes wl-shake{0%,100%{transform:none}20%{transform:translateX(-7px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(2px)}}
@keyframes wl-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.15);opacity:.8}}
@keyframes wl-bump{0%{transform:scale(1)}35%{transform:scale(1.22)}100%{transform:scale(1)}}
@keyframes wl-bob{0%,100%{transform:translateY(0) rotate(-8deg)}50%{transform:translateY(-.4em) rotate(6deg)}}
@keyframes wl-float{0%,100%{transform:translateY(0) rotate(-1.5deg)}50%{transform:translateY(-.6em) rotate(1.5deg)}}
@keyframes wl-pshake{0%,100%{transform:none}10%{transform:rotate(-5deg) scale(1.02)}20%{transform:rotate(5deg)}30%{transform:rotate(-7deg) scale(1.04)}40%{transform:rotate(7deg)}50%{transform:rotate(-9deg) scale(1.06)}60%{transform:rotate(9deg)}70%{transform:rotate(-10deg) scale(1.08)}80%{transform:rotate(10deg) scale(1.1)}90%{transform:rotate(-4deg) scale(1.12)}}
@keyframes wl-pburst{to{transform:scale(1.5);opacity:0}}
@keyframes wl-phit{0%{transform:none}30%{transform:scale(.94,1.05) rotate(-3deg)}65%{transform:scale(1.04,.97) rotate(2deg)}100%{transform:none}}
@keyframes wl-phit2{0%{transform:none}20%{transform:scale(.92,1.07) rotate(4deg)}45%{transform:scale(1.06,.95) rotate(-4deg)}70%{transform:rotate(2deg)}100%{transform:none}}
@keyframes wl-spin{to{rotate:360deg}}
@keyframes wl-fadein{from{opacity:0}to{opacity:1}}
@keyframes wl-hint{0%,100%{filter:brightness(1)}50%{filter:brightness(1.18)}}
@keyframes wl-tease{0%,100%{transform:rotate(0) scale(1.03)}25%{transform:rotate(-2.5deg) scale(1.06)}75%{transform:rotate(2.5deg) scale(1.06)}}
@keyframes wl-burst{0%{opacity:0;transform:scale(.3)}25%{opacity:1}100%{opacity:0;transform:scale(1.25)}}
@keyframes wl-burst2{0%{opacity:0;transform:scale(.3)}20%{opacity:1}70%{opacity:.85}100%{opacity:.35;transform:scale(1.1)}}
@keyframes wl-stamp{0%{opacity:0;transform:rotate(-10deg) scale(2.2)}100%{opacity:1;transform:rotate(-10deg) scale(1)}}
@keyframes wl-say{0%{opacity:0;transform:translateX(-50%) translateY(.6em) scale(.5)}100%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
@keyframes wl-flash{0%{opacity:0;transform:scale(.3)}30%{opacity:1}100%{opacity:0;transform:scale(1.4)}}
@keyframes wl-star{0%{opacity:0;transform:scale(.2) rotate(-40deg)}100%{opacity:1;transform:none}}
@keyframes wl-sheen{0%{background-position:150% 0}100%{background-position:-100% 0}}
@keyframes wl-conf{0%{opacity:0;transform:translate(-50%,-50%) scale(.4) rotate(0)}15%{opacity:1}100%{opacity:0;transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) rotate(var(--r)) scale(1)}}
@media (max-width:1100px){.wol-learn .wl-count{min-width:8.5em}.wol-learn .wl-abar{gap:.55em;padding:.6em .8em}.wol-learn .wl-tab{padding:.45em .7em}.wol-learn .wl-abar .wl-btn{padding-left:.8em;padding-right:.8em}}
@media (max-height:620px){.wol-learn .wl-tart{height:10em}.wol-learn .wl-hero h1{font-size:2.6em}}
@media (prefers-reduced-motion:reduce){.wol-learn,.wol-learn *,.wol-learn *::before,.wol-learn *::after{animation-duration:.01ms!important;animation-delay:0s!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
/* round 2: gentle colour – each corner of the learning centre has its own soft nature hue */
.wol-learn{--sky2:#8cc3dc;--rose:#e79aab;--lav:#b9a8e0;--sun:#f2cf5b;--clay:#e0a070;--teal:#4fa39a}
.wol-learn .wl-tile{border-radius:22px}
.wol-learn .wl-tile.quiz{--paper:#dfe8e8}
.wol-learn .wl-tile.quiz .wl-tart{background:radial-gradient(circle at 50% 60%,rgba(140,195,220,.55),transparent 62%),linear-gradient(180deg,#d9eaf1,#b9d7e6)}
.wol-learn .wl-tile.quiz .wl-tbody h2{color:#1f5670}
.wol-learn .wl-tile.album{--paper:#ece4c6}
.wol-learn .wl-tile.album .wl-tart{background:radial-gradient(circle at 50% 60%,rgba(242,207,91,.55),transparent 62%),linear-gradient(180deg,#f4e6b8,#e9d08f)}
.wol-learn .wl-tile.album .wl-tbody h2{color:#6b4e0c}
.wol-learn .wl-tile[data-g="webpuzzle"]{--paper:#ece0e0}
.wol-learn .wl-tile[data-g="webpuzzle"] .wl-tart{background:radial-gradient(circle at 50% 60%,rgba(231,154,171,.5),transparent 62%),linear-gradient(180deg,#f3e0e3,#e6c6cd)}
.wol-learn .wl-tile[data-g="webpuzzle"] .wl-tbody h2{color:#8a3a50}
.wol-learn .wl-tile[data-g="keepforest"]{--paper:#dfe6d2}
.wol-learn .wl-tile[data-g="keepforest"] .wl-tart{background:radial-gradient(circle at 50% 60%,rgba(79,163,154,.42),transparent 62%),linear-gradient(180deg,#d7e9dc,#b6d6c2)}
.wol-learn .wl-tile[data-g="keepforest"] .wl-tbody h2{color:#1f5f58}
.wol-learn .wl-tile .wl-tbody{border-top:3px solid rgba(0,0,0,.06)}
.wol-learn .wl-tile.quiz .wl-tbody{border-top-color:var(--sky2)}.wol-learn .wl-tile.album .wl-tbody{border-top-color:var(--sun)}
.wol-learn .wl-tile[data-g="webpuzzle"] .wl-tbody{border-top-color:var(--rose)}.wol-learn .wl-tile[data-g="keepforest"] .wl-tbody{border-top-color:var(--teal)}
.wol-learn .wl-meter i{background:linear-gradient(90deg,#c8941a,var(--sun))}
/* quiz: answers take turns through four pale tints (the right / wrong colours still win) */
.wol-learn .wl-opt:not(.ok):not(.no):nth-child(4n+1){background:#e6f0f4;border-color:#9cc2d4;box-shadow:0 4px 0 #9cc2d4}
.wol-learn .wl-opt:not(.ok):not(.no):nth-child(4n+2){background:#f6efd4;border-color:#d8c17a;box-shadow:0 4px 0 #d8c17a}
.wol-learn .wl-opt:not(.ok):not(.no):nth-child(4n+3){background:#f4e5e8;border-color:#d8a9b4;box-shadow:0 4px 0 #d8a9b4}
.wol-learn .wl-opt:not(.ok):not(.no):nth-child(4n+4){background:#ebe6f3;border-color:#b7aad6;box-shadow:0 4px 0 #b7aad6}
.wol-learn .wl-qtag{color:#5b4a8f;background:rgba(185,168,224,.25)}
.wol-learn .wl-qart{box-shadow:inset 0 0 0 2px rgba(140,195,220,.45)}
/* quiz setup: the round icons cycle through the hues */
.wol-learn .wl-choices .wl-choice:nth-child(4n+1) .wl-cic{background:rgba(140,195,220,.3);color:#1f5670}
.wol-learn .wl-choices .wl-choice:nth-child(4n+2) .wl-cic{background:rgba(242,207,91,.32);color:#6b4e0c}
.wol-learn .wl-choices .wl-choice:nth-child(4n+3) .wl-cic{background:rgba(231,154,171,.3);color:#8a3a50}
.wol-learn .wl-choices .wl-choice:nth-child(4n+4) .wl-cic{background:rgba(185,168,224,.32);color:#5b4a8f}
/* album filter tabs: amazon teal, grove ochre, technology sky */
.wol-learn .wl-tabs .wl-tab:nth-child(2).sel{background:#d7ebe4;color:#1f5f58}
.wol-learn .wl-tabs .wl-tab:nth-child(3).sel{background:#f1e2c2;color:#7a4f12}
.wol-learn .wl-tabs .wl-tab:nth-child(4).sel{background:#dbeaf0;color:#1f5670}
.wol-learn .wl-sub{border-right-color:var(--sun);background:rgba(242,207,91,.16)}
/* album sets ("סדרות") */
.wol-learn .wl-sets{display:flex;flex-direction:column;gap:.15em;flex:none;min-width:0;margin-top:-.25em}
.wol-learn .wl-setsh{display:flex;align-items:baseline;gap:.7em;padding:0 .3em;line-height:1.15;color:#f3ecd2}
.wol-learn .wl-setsh b{font-family:var(--serif);font-size:1.2em}
.wol-learn .wl-setsh small{display:flex;align-items:center;gap:.3em;font-size:.86em;font-weight:700;color:#e2dcbd;white-space:nowrap}
.wol-learn .wl-setsh small .wl-ic{width:1.15em;height:1.15em;color:var(--amber)}
.wol-learn .wl-setrow{min-width:0;display:flex;flex-wrap:wrap;gap:.4em;padding:.15em .2em .35em}
.wol-learn .wl-set{--sc:#5f9a3e;flex:1 0 auto;display:flex;align-items:center;gap:.4em;padding:.24em .35em .24em .6em;border-radius:16px;background:#f3ecd6;color:var(--ink);text-align:right;
  box-shadow:0 3px 0 rgba(60,50,25,.35),0 6px 14px rgba(0,0,0,.2);transition:transform .15s,box-shadow .2s}
.wol-learn .wl-set:hover{transform:translateY(-2px)}
.wol-learn .wl-set.sel{box-shadow:0 0 0 .2em var(--sc),0 3px 0 rgba(60,50,25,.35),0 8px 18px rgba(0,0,0,.3);transform:translateY(-2px)}
.wol-learn .wl-seti{flex:none;width:1.85em;height:1.85em;border-radius:50%;display:grid;place-items:center;background:var(--sc);color:#fff;box-shadow:inset 0 -.15em 0 rgba(0,0,0,.18)}
.wol-learn .wl-seti .wl-ic{width:1.2em;height:1.2em}
.wol-learn .wl-setb{display:flex;flex-direction:column;gap:.2em;align-items:flex-start}
.wol-learn .wl-setb b{font-size:.9em;line-height:1.05;white-space:nowrap;color:#1f2c1a}
.wol-learn .wl-setd{display:flex;align-items:center;gap:.15em}
.wol-learn .wl-setd i{width:.5em;height:.5em;border-radius:.16em;background:rgba(80,70,40,.17)}
.wol-learn .wl-setd i.r{transform:rotate(45deg) scale(.88)}
.wol-learn .wl-setd i.on{background:var(--sc)}
.wol-learn .wl-setn{flex:none;margin-inline-start:.3em;font-weight:900;font-size:.74em;line-height:1;color:#4a5640;direction:ltr}
.wol-learn .wl-set.done{background:linear-gradient(180deg,#fff6d6,#f3d88e)}
.wol-learn .wl-set.done .wl-setn{width:1.45em;height:1.45em;border-radius:50%;display:grid;place-items:center;background:var(--sc);color:#fff}
.wol-learn .wl-set.done .wl-setn .wl-ic{width:1em;height:1em}
.wol-learn .wl-set.justdone{animation:wl-bump .7s 3}
.wol-learn .wl-set{max-width:13em}
@media (max-width:1100px){.wol-learn .wl-set{gap:.3em;padding:.2em .25em .2em .45em;border-radius:14px}.wol-learn .wl-set .wl-seti{width:1.6em;height:1.6em}.wol-learn .wl-set .wl-seti .wl-ic{width:1.05em;height:1.05em}.wol-learn .wl-setb b{font-size:.84em}.wol-learn .wl-setrow{gap:.3em}}
.wol-learn .wl-setinfo{--sc:#5f9a3e;flex:none;display:flex;align-items:center;gap:.8em;padding:.45em .8em .45em 1em;border-radius:18px;border-right:.45em solid var(--sc);animation:wl-rise .3s both}
.wol-learn .wl-setinfo .wl-seti{width:2.7em;height:2.7em}
.wol-learn .wl-setinfo .wl-seti .wl-ic{width:1.5em;height:1.5em}
.wol-learn .wl-sett{flex:1;min-width:0}
.wol-learn .wl-sett b{font-family:var(--serif);font-size:1.4em;line-height:1.05;color:#1f2c1a}
.wol-learn .wl-setw{display:inline-block;margin-inline-start:.5em;padding:.05em .6em;border-radius:99px;background:rgba(80,70,40,.1);font-size:.8em;font-weight:800;color:var(--ink2);vertical-align:.2em}
.wol-learn .wl-sett p{font-size:.95em;color:var(--ink2)}
.wol-learn .wl-setp{flex:none;font-weight:700;color:var(--ink2);white-space:nowrap}
.wol-learn .wl-setp b{font-size:1.35em;color:#1f2c1a}
.wol-learn .wl-setr{flex:none;display:flex;align-items:center;gap:.35em;padding:.3em .85em;border-radius:99px;background:rgba(240,180,76,.24);font-weight:800;color:#5a3b10;white-space:nowrap}
.wol-learn .wl-setr .wl-ic{color:#b96f12}
.wol-learn .wl-setinfo.done .wl-setr{background:linear-gradient(180deg,#fff2c4,#f8d98a);box-shadow:0 0 .8em rgba(240,180,76,.5)}
.wol-learn .wl-setinfo .wl-btn{min-height:2.4em;padding:.25em 1em;font-size:.95em}
@media (max-height:660px){.wol-learn .wl-sets{flex-direction:row;align-items:center;gap:.5em;margin-top:0}.wol-learn .wl-setsh small{display:none}
.wol-learn .wl-setrow{flex:1;flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;scrollbar-width:thin;scrollbar-color:rgba(246,240,220,.45) transparent;padding:.3em .2em .45em;-webkit-mask-image:linear-gradient(270deg,#000 92%,transparent);mask-image:linear-gradient(270deg,#000 92%,transparent)}
.wol-learn .wl-set{flex:none}.wol-learn .wl-setinfo{padding:.3em .7em .3em .8em;gap:.6em}.wol-learn .wl-setinfo .wl-seti{width:2.1em;height:2.1em}.wol-learn .wl-sett b{font-size:1.15em}.wol-learn .wl-sett p{display:none}.wol-learn .wl-album{gap:.55em}.wol-learn .wl-abar{padding:.45em .8em}}
@media (max-height:520px){.wol-learn .wl-packs{gap:.5em;padding-bottom:.5em}.wol-learn .wl-ptitle{font-size:1.7em}.wol-learn .wl-packs .wl-stage{font-size:.78em;margin-top:.9em}}
@media (max-height:660px) and (max-width:900px){.wol-learn .wl-abar .wl-dlab{display:none}.wol-learn .wl-abar .wl-btn.go{padding-left:.6em;padding-right:.6em}.wol-learn .wl-count b{max-width:5.6em;line-height:1.1}.wol-learn .wl-tab{padding:.4em .55em}.wol-learn .wl-abar{gap:.4em}}
@media (max-height:660px) and (max-width:1100px){.wol-learn .wl-legbtn span{display:none}.wol-learn .wl-legbtn{padding:.3em .55em}.wol-learn .wl-count{min-width:0}.wol-learn .wl-count b{font-size:1.05em}.wol-learn .wl-setr{padding:.25em .6em;font-size:.9em}}
.wol-learn .wl-toast.set{gap:.7em;padding:.55em 1.6em .55em 1.1em;font-size:1.12em;line-height:1.25;box-shadow:0 0 0 .2em #fff6dc,0 0 2em rgba(246,207,114,.8),0 8px 24px rgba(0,0,0,.35)}
.wol-learn .wl-toast.set .wl-seti{width:2.4em;height:2.4em}.wol-learn .wl-toast.set .wl-seti .wl-ic{width:1.4em;height:1.4em}
.wol-learn .wl-toast.set b{display:block;font-family:var(--serif);font-size:1.15em}
.wol-learn .wl-toast.set small{display:flex;align-items:center;gap:.3em;font-size:.88em}
/* zoom: game power + sets of the card */
.wol-learn .wl-mtext{max-height:100%;overflow:auto}
.wol-learn .wl-mpow{display:flex;align-items:center;gap:.6em;padding:.45em .8em;border-radius:12px;font-size:.98em;line-height:1.38;color:#2c3524}
.wol-learn .wl-mpow.r-epic{background:linear-gradient(90deg,rgba(246,207,114,.38),rgba(231,154,171,.26))}
.wol-learn .wl-mpow.r-rare{background:rgba(240,180,76,.18)}
.wol-learn .wl-mpow b{color:#1f2c1a}
.wol-learn .wl-powi{flex:none;width:2.1em;height:2.1em;border-radius:50%;display:grid;place-items:center;font-weight:900;color:#5a1838;
  background:radial-gradient(circle at 38% 32%,#fff3c4,#f6cf72 45%,#e79aab 85%);box-shadow:0 0 0 .12em #fff6dc,0 0 .7em rgba(246,207,114,.8)}
.wol-learn .wl-mpow.r-rare .wl-powi{background:linear-gradient(180deg,#ffe9a8,#e8a43a);color:#4a2c06;direction:ltr;box-shadow:0 0 0 .12em #fff6dc}
.wol-learn .wl-powi .wl-ic{width:1.25em;height:1.25em}
.wol-learn .wl-msets{display:flex;flex-wrap:wrap;align-items:center;gap:.35em}
.wol-learn .wl-msets small{font-weight:800;color:var(--ink2);font-size:.92em}
.wol-learn .wl-mset{--sc:#5f9a3e;display:inline-flex;align-items:center;gap:.3em;padding:.15em .6em .15em .35em;border-radius:99px;background:#f8f2de;box-shadow:inset 0 0 0 2px var(--sc);font-weight:800;font-size:.9em;color:#1f2c1a}
.wol-learn .wl-mset .wl-ic{width:1.15em;height:1.15em;color:var(--sc)}
.wol-learn .wl-mset b{color:var(--ink2);font-size:.92em}
.wol-learn .wl-mset.done{background:linear-gradient(180deg,#fff6d6,#f3d88e)}
/* legend: the rarity-in-the-game note */
.wol-learn .wl-legend li.wl-lgx .wl-lgn{color:#5a1838;background:radial-gradient(circle at 38% 32%,#fff3c4,#f6cf72 45%,#e79aab 85%)}
.wol-learn .wl-legend li.wl-lgx .wl-lgn .wl-ic{width:1em;height:1em}
.wol-learn .wl-lp{display:block}
.wol-learn .wl-lp.e b{color:#8a2452}.wol-learn .wl-lp.r b{color:#9c6512}
`;
let cssInjected = false;
function injectCss() {
  if (cssInjected || typeof document === 'undefined') return;
  cssInjected = true;
  const st = document.createElement('style');
  st.id = 'wol-learn-css';
  // raise specificity above the game's "#ui.wol button" resets
  st.textContent = CSS.replace(/\.wol-learn/g, '#wol-learn.wol-learn');
  document.head.appendChild(st);
}

/* ───────────────────────────────────────────── the hub */
export function createLearningHub(rootEl, { onClose, audio } = {}) {
  injectCss();
  const reduced = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const sfx = (n) => { try { audio && audio.play && audio.play(n); } catch (e) { /* ignore */ } };
  const S = loadState();
  let SKEY = profileKey(STORE_KEY);   // the player whose album S holds – saves always go back to that player
  const save = () => { try { window.localStorage.setItem(SKEY, JSON.stringify(S)); } catch (e) { /* storage unavailable – keep in memory */ } };
  // the start screen may have switched player since the hub was created: load that player's album (same object, so every closure sees it)
  function reloadState() {
    const k = profileKey(STORE_KEY); if (k === SKEY) return;
    const fresh = loadState(); SKEY = k;
    for (const p of Object.keys(S)) delete S[p];
    Object.assign(S, fresh);
  }

  const el = document.createElement('div');
  el.id = 'wol-learn'; el.className = 'wol-learn'; el.dir = 'rtl'; el.lang = 'he'; el.hidden = true;
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'מרכז הלמידה');
  el.innerHTML = `
    <header class="wl-top">
      <button class="wl-back" data-wl="back">${IC.back}<span>חזרה</span></button>
      <h2 class="wl-crumb"></h2><span class="wl-sp"></span>
      <span class="wl-who"></span>
      <button class="wl-chip" data-wl="packs" title="חבילות קלפים">${IC.pack}<span class="wl-chipn"></span></button>
      <img class="wl-logo" src="${BABA_DA_LOGO}" alt="בבא דע">
    </header>
    <main class="wl-main"></main>
    <div class="wl-modal" hidden></div>
    <div class="wl-fx"></div>
    <div class="wl-toast" role="status"></div>`;
  rootEl.appendChild(el);
  const $ = (s) => el.querySelector(s);
  const main = $('.wl-main'), modal = $('.wl-modal'), fx = $('.wl-fx'), toastEl = $('.wl-toast');
  let screen = 'home', open_ = false, timers = [];
  const later = (fn, ms) => { const t = setTimeout(fn, reduced() ? Math.min(ms, 60) : ms); timers.push(t); return t; };
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  const ownedCount = () => Object.keys(S.owned).length;
  function updateChip(bump) {
    $('.wl-chipn').textContent = `חבילות: ${S.packs}`;
    const c = $('.wl-chip'); if (bump) { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
  }
  let toastT;
  function toast(html, ms = 2400, cls = '') {
    toastEl.innerHTML = html; toastEl.className = 'wl-toast on' + (cls ? ' ' + cls : '');
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), ms);
  }
  /* ── album sets: a whole set → one free pack, once per player. Checked after every card gain and when the album opens. */
  const setProg = (st) => { const have = st.cards.filter((c) => S.owned[c.id]).length; return { have, n: st.cards.length, done: have === st.cards.length }; };
  let setQueue = 0;
  function checkSets() {
    if (!open_) return [];
    S.sets = S.sets && typeof S.sets === 'object' ? S.sets : {};
    const got = activeSets().filter((st) => !S.sets[st.id] && setProg(st).done);
    if (!got.length) return got;
    got.forEach((st) => { S.sets[st.id] = true; S.packs += 1; if (st.source) grantSource(st.source); });
    save(); updateChip(true);
    // one celebration after the other (plain timers: they survive moving between screens)
    got.forEach((st) => {
      const at = Math.max(0, setQueue - Date.now()) + 250; setQueue = Date.now() + at + 3000;
      setTimeout(() => {
        if (!open_) return;
        toast(`<span class="wl-seti" style="--sc:${st.col}">${st.ic}</span><span><b>השלמתם את הסדרה "${esc(st.name)}"!</b><small>${IC.pack} קיבלתם חבילת קלפים במתנה${st.source ? ' – וגם קלף מקור חדש!' : ''}</small></span>`, 3600, 'set');
        sfx('mission'); confetti(toastEl, 34, ['#f6cf72', st.col, '#fff1c4', '#8fd067', '#e79aab']);
        const chip = main.querySelector(`.wl-set[data-v="${st.id}"]`);
        if (chip) { chip.classList.add('justdone'); confetti(chip, 18, ['#f6cf72', st.col, '#fff1c4']); }
        updateChip(true);
      }, at);
    });
    return got;
  }
  function confetti(target, n = 18, palette) {
    if (reduced() || !target) return;
    const r = target.getBoundingClientRect(), R = el.getBoundingClientRect();
    const x = r.left + r.width / 2 - R.left, y = r.top + r.height / 2 - R.top;
    const cols = ['#8fd067', '#5fae4a', '#b7e08e', '#f0b44c', '#7cc46a', '#3f8a33'];
    for (let i = 0; i < n; i++) {
      const c = document.createElement('i'); c.className = 'wl-conf';
      const a = Math.random() * Math.PI * 2, d = 70 + Math.random() * 130;
      c.style.cssText = `left:${x}px;top:${y}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d * 0.8 + 50}px;--r:${Math.random() * 720 - 360}deg;--c:${pick(palette || cols)};animation-delay:${rnd(90)}ms`;
      fx.appendChild(c); setTimeout(() => c.remove(), 1500);
    }
  }
  function grantPack(n = 1) {
    if (!open_) reloadState();   // a pack won in the forest goes to whoever is playing now
    n = Math.max(0, Math.floor(+n || 0)); if (!n) return S.packs;
    S.packs += n; save(); updateChip(true);
    if (open_) toast(`${IC.pack}<span>קיבלתם ${n === 1 ? 'חבילת קלפים' : n + ' חבילות קלפים'}!</span>`);
    if (open_ && screen === 'album') renderAlbum();
    return S.packs;
  }

  /* ── navigation */
  const PARENT = { home: null, setup: 'home', quiz: 'setup', end: 'home', album: 'home', pack: 'album', duel: 'album', webpuzzle: 'home', keepforest: 'home', inventors: 'home', expedition: 'home', badges: 'home' };
  const TITLES = { home: '', setup: 'חידון', quiz: 'חידון', end: 'חידון', album: 'אלבום הקלפים', pack: 'פתיחת חבילה', duel: 'מי חזק ברשת?', webpuzzle: 'חוט הקשר', keepforest: 'מחזיקים את היער', inventors: 'הממציאים', expedition: 'משלחת לעומק', badges: 'התגים שלי' };
  /* ── card mini-games (each lives in ./games/*.js and gets this context) */
  let MODE = 'full';
  const readMode = () => { try { MODE = window.localStorage.getItem(profileKey('web-of-life-mode')) || 'full'; } catch (e) { MODE = MODE || 'full'; } };
  // who is playing: a small, non-interactive label in the top bar
  function paintWho() {
    const p = currentPlayer(), w = $('.wl-who'); if (!w || !p) return;
    w.innerHTML = `${avatarHTML(p.animal, 'wl-av')}<span>${esc(p.name)}</span>`;
    w.setAttribute('aria-label', 'משחק עכשיו: ' + p.name); w.title = 'משחק עכשיו: ' + p.name;
  }
  readMode();
  const GAME_CTX = {
    CARDS, CARD, SP, spOf, RELATION_TYPES, DIET_VERBS, IC, STAT_ICON, STAT_NAMES,
    cardHTML, backHTML, flipHTML, esc,
    kids: () => MODE === 'kids',
    owned: () => S.owned,
    store: (key, val) => { if (val === undefined) return (S.games || {})[key]; S.games = S.games || {}; S.games[key] = val; save(); return val; },
    addCards: (ids) => { const fresh = []; for (const id of ids) { if (!CARD.get(id)) continue; if (!S.owned[id]) fresh.push(id); S.owned[id] = (S.owned[id] || 0) + 1; } save(); if (fresh.length) setTimeout(checkSets, 900); return fresh; },
    grantPack: (n) => grantPack(n), sfx: (n) => sfx(n), toast: (h) => toast(h), confetti: (t, n, p) => confetti(t, n, p),
    later: (fn, ms) => later(fn, ms), reduced, setTitle: (t) => { $('.wl-crumb').textContent = t; },
    exit: () => go('home'), toAlbum: () => go('album'), root: () => el,
    badge: (earn) => grantBadge(earn), tally: (key, add) => badgeTally(key, add), hasBadge: (id) => hasBadge(id),
  };
  const GAMES = { webpuzzle: mountWebPuzzle, keepforest: mountKeepForest, inventors: mountInventors, expedition: mountExpedition };
  let gameInst = null;
  function go(name, opts = {}) {
    clearTimers(); closeModal();
    if (name === 'home') returnTo = null;
    if (gameInst) { try { gameInst.destroy && gameInst.destroy(); } catch (e) { console.warn(e); } gameInst = null; }
    if (GAMES[name]) {
      screen = name; $('.wl-crumb').textContent = TITLES[name]; $('.wl-back span').textContent = returnTo === name ? (MODE === 'kids' ? 'חֲזָרָה לַמַּעְבָּדָה' : 'חזרה למעבדה') : 'חזרה'; updateChip(false);
      main.innerHTML = '';
      try { gameInst = GAMES[name](main, GAME_CTX, opts) || null; } catch (e) { console.error(e); main.innerHTML = '<p style="padding:2em">אירעה תקלה במשחק.</p>'; }
      main.scrollTop = 0; return;
    }
    screen = name;
    $('.wl-crumb').textContent = TITLES[name] || '';
    $('.wl-back span').textContent = name === 'home' ? 'חזרה למשחק' : 'חזרה';
    updateChip(false);
    ({ home: renderHome, setup: renderSetup, quiz: () => startQuiz(opts), end: renderEnd, album: renderAlbum, pack: renderPack, duel: () => startDuel(), badges: renderBadges })[name]();
    main.scrollTop = 0;
  }
  // opened from the lab (the inventors table): "חזרה" on that screen goes straight back to the lab
  let returnTo = null;
  function back() {
    if (!modal.hidden) return closeModal();
    if (returnTo && screen === returnTo) { sfx('click'); returnTo = null; return close(); }
    const p = PARENT[screen];
    if (p) { sfx('click'); go(p); } else close();
  }

  // the whole collection: the game's cards and, in the torah edition, the source cards ("מן המקורות")
  const srcOn = () => TORAH && sourcesOn();
  function collection() {
    let total = CARDS.length, have = ownedCount();
    if (srcOn()) { const own = ownedSources(); total += SOURCE_CARDS.length; have += SOURCE_CARDS.filter((c) => own[c.id]).length; }
    return { total, have };
  }
  /* ── home */
  function renderHome() {
    const { total, have } = collection();
    const fan = ['amazon:jaguar', 'grove:owl', 'amazon:toucan'].map((id) => CARD.get(id)).filter(Boolean);
    const toucan = spOf('amazon', 'toucan');
    main.innerHTML = `<section class="wl-screen wl-home">
      <div class="wl-hero"><h1>מרכז הלמידה</h1><p>משחקים, לומדים ואוספים את כל היצורים של רשת החיים</p></div>
      <div class="wl-tiles">
        <button class="wl-tile quiz paper" data-wl="setup">
          <div class="wl-tart">
            <div class="wl-qbubble">${CARD_ART.toucan ? `<img class="paint" src="${CARD_ART.toucan}" alt="" style="transform-origin:58% 36%">` : toucan && toucan.img ? `<img src="${toucan.img}" alt="">` : ''}</div>
            <span class="wl-qbadge">${IC.quest}</span>
            <span class="wl-mchip" style="top:2.2em;right:1.6em">פרפר?</span>
            <span class="wl-mchip ok" style="bottom:2.2em;right:2.4em">טוקן!</span>
            <span class="wl-mchip" style="bottom:3em;left:1.8em">תנשמת?</span>
          </div>
          <div class="wl-tbody"><h2>חידון</h2><p>10 שאלות על בעלי החיים והצמחים. תשובה נכונה יכולה להביא חבילת קלפים!</p></div>
        </button>
        <button class="wl-tile album paper" data-wl="album">
          ${S.packs ? `<span class="wl-tnote wl-chip">${IC.pack}<span>${S.packs} לפתיחה</span></span>` : ''}
          <div class="wl-tart"><div class="wl-fan">${fan.map((c) => cardHTML(c)).join('')}</div></div>
          <div class="wl-tbody"><h2>אלבום הקלפים</h2><p>אספתם <b>${have}</b> מתוך <b>${total}</b> קלפים</p>
            <div class="wl-meter"><i style="width:${Math.round((have / total) * 100)}%"></i></div></div>
        </button>
      </div>
      ${TORAH ? `<button class="wl-srcsw paper${sourcesOn() ? ' on' : ''}" data-wl="srctoggle" role="switch" aria-checked="${sourcesOn()}">${IC_SCROLL}<span><b>מקורות ופסוקים</b><small>${sourcesOn() ? 'פועל – חידון "מן המקורות", קלפי מקור ושירת הבריאה' : 'כבוי – המשחק בלי תוכן מן המקורות'}</small></span><i class="sw"></i></button>` : ''}
      <div class="wl-tiles wl-games">
        <button class="wl-tile game paper" data-wl="game" data-g="webpuzzle">
          <div class="wl-tart wl-gart">${['amazon:brazilnut', 'amazon:agouti'].map((id) => CARD.get(id)).filter(Boolean).map((c) => cardHTML(c)).join('<span class="wl-gthread"></span>')}</div>
          <div class="wl-tbody"><h2>חוט הקשר</h2><p>חידות רשת: מי מאביק, מי מפיץ זרעים, מי אוכל את מי? השלימו את הרשת וקבלו קלפים.</p></div>
        </button>
        <button class="wl-tile game paper" data-wl="game" data-g="keepforest">
          <div class="wl-tart wl-gart">${['grove:oak', 'grove:jay', 'tool:watergen'].map((id) => CARD.get(id)).filter(Boolean).map((c) => cardHTML(c)).join('')}</div>
          <div class="wl-tbody"><h2>מחזיקים את היער</h2><p>בונים יער מהקלפים שלכם ושומרים עליו מבצורת, משריפה ומכריתה.</p></div>
        </button>
        <button class="wl-tile game paper" data-wl="game" data-g="inventors">
          <div class="wl-tart wl-gart">${['reef:reefshark', 'grove:owl', 'amazon:hummingbird'].map((id) => CARD.get(id)).filter(Boolean).map((c) => cardHTML(c)).join('')}</div>
          <div class="wl-tbody"><h2>הממציאים</h2><p>פותרים בעיות אמיתיות בעזרת היצורים שלכם, ובונים רובוטים מצחיקים. מותר לטעות!</p></div>
        </button>
        <button class="wl-tile game paper" data-wl="game" data-g="expedition">
          <div class="wl-tart wl-gart">${['reef:octopus', 'reef:turtle', 'tool:rov'].map((id) => CARD.get(id)).filter(Boolean).map((c) => cardHTML(c)).join('')}</div>
          <div class="wl-tbody"><h2>משלחת לעומק</h2><p>צוות של ארבעה קלפים צולל לשונית. בכל אתגר בוחרים מי מתמודד, ומחליטים: לרדת עוד או לחזור עם הדגימות.</p></div>
        </button>
      </div>
      <button class="wl-badgetile paper" data-wl="badges"><span class="wl-bt-row">${BADGES.filter((b) => ownedBadges()[b.id]).slice(-4).map((b) => badgeHTML(b)).join('') || BADGES.slice(0, 3).map((b) => badgeHTML(b, { own: false })).join('')}</span>
        <span class="wl-bt-text"><b>התגים שלי</b><small>אספתם ${Object.keys(ownedBadges()).filter((id) => BADGES.some((b) => b.id === id)).length} מתוך ${BADGES.length} תגים. תגים מקבלים במשימות מומחים, במשחקים ובמעבדה.</small></span></button>
      </section>`;
  }

  /* ── the badges (תגים) and the album frames they open */
  function renderBadges() {
    const own = ownedBadges(), cur = chosenFrame(), open = new Set(openFrames().map((f) => f.id));
    main.innerHTML = `<section class="wl-screen wl-badges">
      <div class="wl-bhead paper"><b>התגים שלי</b><span>אספתם ${BADGES.filter((b) => own[b.id]).length} מתוך ${BADGES.length}</span></div>
      ${BADGE_GROUPS.map((g) => { const list = BADGES.filter((b) => b.group === g.id); const have = list.filter((b) => own[b.id]).length;
        return `<section class="wl-bgroup" style="--bg1:${g.col};--bg2:${g.col2}"><h3><span>${esc(g.name)}</span><small>${have} מתוך ${list.length}</small></h3>
          <div class="wl-bgrid">${list.map((b) => badgeHTML(b, { own: !!own[b.id], how: true })).join('')}</div></section>`; }).join('')}
      <section class="wl-frames paper"><h3>מסגרות לקלפים באלבום</h3><p>כל קבוצת תגים פותחת מסגרת. בחרו מסגרת, והיא תופיע על כל הקלפים שלכם באלבום.</p>
        <div class="wl-frow">${FRAMES.map((f) => { const g = BADGE_GROUPS.find((x) => x.id === f.group);
          return `<button class="wl-frame fr-${f.id}${cur === f.id ? ' sel' : ''}" data-wl="frame" data-f="${f.id}" ${open.has(f.id) ? '' : 'disabled'}><span class="wl-fsw"></span><b>${esc(f.name)}</b><small>${open.has(f.id) ? (cur === f.id ? 'נבחרה' : 'אפשר לבחור') : f.group === 'all' ? `נפתחת עם ${f.need} תגים` : `נפתחת עם ${f.need} תגים של ${esc(g ? g.short : '')}`}</small></button>`; }).join('')}</div></section>
    </section>`;
  }

  /* ── quiz setup */
  const QS = { level: 'easy', biome: 'both' };
  function renderSetup() {
    const torahQuiz = TORAH && sourcesOn();
    if (!torahQuiz && QS.level === 'torah') QS.level = 'easy';
    const th = (b, id) => (THUMBS[b] || {})[id] || '';
    const ch = (grp, v, icon, title, sub) => `<button class="wl-choice${QS[grp] === v ? ' sel' : ''}" data-wl="pick" data-g="${grp}" data-v="${v}" aria-pressed="${QS[grp] === v}">
      <span class="wl-cic">${icon}</span><span><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span></button>`;
    main.innerHTML = `<section class="wl-screen"><div class="wl-setup paper">
      <h2>חידון רשת החיים</h2>
      <div class="wl-step"><h3>1. בחרו רמה</h3><div class="wl-choices" style="--n:${torahQuiz ? 3 : 2}">
        ${ch('level', 'easy', IC.seedling, 'מתחילים', 'גילאי 6–8 · שאלות עם תמונות')}
        ${ch('level', 'hard', IC.tree, 'מתקדמים', 'קשרים ברשת, קומות היער וטכנולוגיה')}
        ${torahQuiz ? ch('level', 'torah', IC_SCROLL, 'מן המקורות', 'פסוקים, מדרשים ופרק שירה') : ''}
      </div></div>
      ${QS.level === 'torah' ? '' : `<div class="wl-step"><h3>2. בחרו מקום</h3><div class="wl-choices wl-places" style="--n:4">
        ${ch('biome', 'amazon', CARD_ART.toucan ? `<img class="paint" src="${CARD_ART.toucan}" alt="" style="transform-origin:58% 36%">` : `<img src="${th('amazon', 'toucan')}" alt="">`, 'אמזונס', 'יער הגשם')}
        ${ch('biome', 'grove', CARD_ART.gazelle ? `<img class="paint" src="${CARD_ART.gazelle}" alt="" style="transform-origin:52% 32%">` : `<img src="${th('grove', 'jay')}" alt="">`, 'חורש', 'החורש הארץ-ישראלי')}
        ${ch('biome', 'reef', CARD_ART.clownfish ? `<img class="paint" src="${CARD_ART.clownfish}" alt="" style="transform-origin:50% 45%">` : IC.drop, 'שונית', 'שונית האלמוגים')}
        ${ch('biome', 'both', IC.globe, 'הכול', 'כל המקומות')}
      </div></div>`}
      <button class="wl-btn go" data-wl="start">יוצאים לדרך! ${IC.next}</button>
    </div></section>`;
  }

  /* ── quiz */
  let Q = null;
  function startQuiz(opts = {}) {
    let level = opts.level || QS.level; const biome = opts.biome || QS.biome;
    if (level === 'torah' && !(TORAH && sourcesOn())) level = 'easy';
    SEEN = seenMap(S.seen);
    const qs = level === 'torah' ? buildTorahRound() : buildRound(level, biome);
    if (qs.forget && qs.forget.length) { const f = new Set(qs.forget); S.seen = (Array.isArray(S.seen) ? S.seen : []).filter((id) => !f.has(id)); save(); }
    Q = { level, biome, qs, i: 0, res: [], packs: 0, answered: false };
    renderQuestion();
  }
  // a question counts as asked once it is on the screen (a round left in the middle does not use up the rest)
  function markSeen(id) {
    if (!id) return;
    const l = (Array.isArray(S.seen) ? S.seen : []).filter((x) => x !== id); l.push(id);
    S.seen = l.length > SEEN_MAX ? l.slice(l.length - SEEN_MAX) : l;
    save();
  }
  function progHTML() {
    return `<div class="wl-prog" aria-label="התקדמות">${Q.qs.map((_, k) => `<span class="wl-pl ${k < Q.res.length ? (Q.res[k] ? 'ok' : 'no') : k === Q.i ? 'cur' : ''}">${IC.leaf}</span>`).join('')}
      <span class="wl-pnum">שאלה ${Math.min(Q.i + 1, Q.qs.length)} מתוך ${Q.qs.length}</span></div>`;
  }
  function renderQuestion() {
    const q = Q.qs[Q.i]; Q.answered = false;
    markSeen(q.qid);
    const longOpts = q.options.some((o) => o.label.length > (Q.level === 'easy' ? 14 : 18)) || (q.options.length > 3);
    let art = '';
    if (q.art) {
      const a = q.art;
      const paint = CARD_ART[a.id] || '';
      const alt = q.hideName ? 'מי זה?' : esc(a.name);
      const pic = paint ? `<img src="${paint}" alt="${alt}" draggable="false">` : (a.img ? `<img src="${a.img}" alt="${alt}" draggable="false">` : '');
      art = `<div class="wl-qart${paint ? ' paint' : a.tool ? ' tool' : ''}"${paint ? '' : ` style="${artStyle(a.color || '#7fae4f')}"`}>
        ${pic}${q.hideName ? '' : `<span class="wl-anm">${esc(a.name)}</span>`}</div>`;
    }
    const sub = q.sub ? `<p class="wl-sub">${esc(q.sub).replace(/___/g, '<span class="wl-blank">?</span>')}</p>` : '';
    main.innerHTML = `<section class="wl-screen wl-quiz ${Q.level}">
      ${progHTML()}
      <div class="wl-qwrap"><div class="wl-qcard paper${q.art ? '' : ' noart'}">
        ${art}
        <div class="wl-qbody">
          ${q.tag && Q.level !== 'easy' ? `<span class="wl-qtag">${esc(q.tag)}</span>` : ''}
          <h2 class="wl-q">${esc(q.q)}</h2>${sub}
          <div class="wl-opts${longOpts ? ' stack' : ''}" style="--n:${q.options.length}">
            ${q.options.map((o, k) => `<button class="wl-opt${o.tone ? ' t-' + o.tone : ''}" data-wl="ans" data-k="${k}">
              ${o.img ? `<img${o.paint ? ' class="pt"' : ''} src="${o.img}" alt="" draggable="false">` : ''}${o.icon ? `<i>${o.icon}</i>` : ''}<span>${esc(o.label)}</span></button>`).join('')}
          </div>
          <div class="wl-fbslot"></div>
        </div></div></div></section>`;
  }
  function answer(k) {
    if (!Q || Q.answered) return;
    const q = Q.qs[Q.i], o = q.options[k]; if (!o) return;
    Q.answered = true;
    const ok = o.ok; Q.res.push(ok);
    const btns = [...main.querySelectorAll('.wl-opt')];
    btns.forEach((b, j) => {
      b.disabled = true;
      const oj = q.options[j];
      if (oj.ok) { b.classList.add('ok'); b.insertAdjacentHTML('beforeend', `<span class="wl-mark">${IC.check}</span>`); }
      else if (j === k) { b.classList.add('no'); b.insertAdjacentHTML('beforeend', `<span class="wl-mark">${IC.cross}</span>`); }
      else b.classList.add('dim');
    });
    const pl = main.querySelectorAll('.wl-pl')[Q.i]; if (pl) { pl.classList.remove('cur'); pl.classList.add(ok ? 'ok' : 'no'); }
    let gotPack = false;
    if (ok) {
      sfx('quizRight'); confetti(btns[k]);
      if (Q.packs < QUIZ_PACKS_MAX && Math.random() < PACK_CHANCE) { Q.packs++; gotPack = true; S.packs++; save(); updateChip(true); later(() => sfx('discover'), 350); }
    } else sfx('quizWrong');
    const right = q.options.find((x) => x.ok);
    const fact = Q.level === 'easy' ? firstSentence(q.fact) : q.fact;
    const last = Q.i >= Q.qs.length - 1;
    $('.wl-fbslot').innerHTML = `<div class="wl-fb ${ok ? 'ok' : 'no'}">
      <div class="wl-fbt"><b>${ok ? pick(['נכון! כל הכבוד!', 'מצוין!', 'יפה מאוד!', 'בדיוק!']) : `כמעט! התשובה הנכונה: ${esc(right.label)}`}</b>
        <p>${esc(fact)}</p>${q.src ? `<div class="wl-src"><p class="t">${esc(q.src)}</p><small>${esc(q.ref)}</small></div>` : ''}${gotPack ? `<span class="wl-gotpack">${IC.pack} קיבלתם חבילת קלפים!</span>` : ''}</div>
      <button class="wl-btn ${last ? 'gold' : 'go'}" data-wl="next">${last ? 'לתוצאות' : 'הבא'} ${IC.next}</button></div>`;
    const nb = $('.wl-fb [data-wl="next"]'); if (nb) setTimeout(() => { try { nb.focus({ preventScroll: true }); if (q.src) $('.wl-fb').scrollIntoView({ block: 'nearest' }); } catch (e) { /* */ } }, 50);
  }
  function nextQ() {
    if (!Q || !Q.answered) return;
    sfx('click');
    Q.i++;
    if (Q.i >= Q.qs.length) { go('end'); return; }
    renderQuestion();
  }
  function renderEnd() {
    if (!Q) return go('setup');
    const right = Q.res.filter(Boolean).length, n = Q.qs.length;
    const stars = right >= n - 1 ? 3 : right >= Math.ceil(n * 0.6) ? 2 : 1;
    if (Q.packs === 0 && right >= 7) { Q.packs = 1; S.packs++; }   // a very good round never ends empty-handed
    S.quizzes = (S.quizzes || 0) + 1; S.best = Math.max(S.best || 0, right); save(); updateChip(true);
    // torah corner: 7 right answers or more – the next source card the quiz gives, once
    let gotSrc = null;
    if (Q.level === 'torah' && right >= 7 && !Q.srcDone) {
      Q.srcDone = true; const own = ownedSources();
      gotSrc = SOURCE_CARDS.find((c) => c.earn === 'quiz' && !own[c.id]) || null;
      if (gotSrc) grantSource(gotSrc.id);
    }
    const title = stars === 3 ? 'אלופי רשת החיים!' : stars === 2 ? 'כל הכבוד!' : 'יופי של התחלה!';
    main.innerHTML = `<section class="wl-screen"><div class="wl-end paper">
      <div class="wl-stars">${[0, 1, 2].map((k) => `<span class="${k < stars ? 'on' : ''}" style="animation-delay:${0.15 + k * 0.22}s">${IC.star}</span>`).join('')}</div>
      <h2>${title}</h2>
      <p>עניתם נכון על <b>${right}</b> מתוך <b>${n}</b> שאלות</p>
      ${gotSrc ? `<span class="wl-gotpack src">${IC_SCROLL} קלף מקור חדש באלבום: ${esc(gotSrc.title)}</span>` : ''}
      ${Q.packs ? `<span class="wl-gotpack">${IC.pack} הרווחתם ${Q.packs === 1 ? 'חבילת קלפים אחת' : Q.packs + ' חבילות קלפים'}</span>` : '<p>בפעם הבאה אולי תרוויחו חבילת קלפים!</p>'}
      <div class="wl-row">
        <button class="wl-btn go" data-wl="again">שחקו שוב</button>
        ${S.packs ? `<button class="wl-btn gold" data-wl="pack">${IC.pack} פתחו חבילה</button>` : `<button class="wl-btn" data-wl="album">${IC.cards} לאלבום</button>`}
        <button class="wl-btn" data-wl="home">למרכז הלמידה</button>
      </div></div></section>`;
    sfx(stars === 3 ? 'mission' : 'discover');
    if (stars === 3) later(() => confetti($('.wl-stars'), 30), 600);
  }

  /* ── album */
  let filter = 'all';
  const setDots = (st) => st.cards.map((c) => `<i class="${S.owned[c.id] ? 'on' : ''}${c.rarity === 'epic' || c.rarity === 'rare' ? ' r' : ''}"></i>`).join('');
  function setsHTML() {
    const chips = activeSets().map((st) => {
      const p = setProg(st), sel = filter === 'set:' + st.id;
      return `<button class="wl-set${p.done ? ' done' : ''}${sel ? ' sel' : ''}" data-wl="set" data-v="${st.id}" style="--sc:${st.col}" aria-pressed="${sel}" title="${esc(st.sub)} · ${SET_WHERE[st.where]}">
        <span class="wl-seti">${st.ic}</span><span class="wl-setb"><b>${esc(st.name)}</b><span class="wl-setd">${setDots(st)}<span class="wl-setn">${p.done ? IC.check : `${p.have}/${p.n}`}</span></span></span></button>`;
    }).join('');
    return `<div class="wl-sets"><div class="wl-setsh"><b>סדרות</b><small>${IC.pack}<span>אספו סדרה שלמה – וקבלו חבילת קלפים במתנה</span></small></div><div class="wl-setrow">${chips}</div></div>`;
  }
  function setInfoHTML(st) {
    const p = setProg(st), miss = p.n - p.have;
    return `<div class="wl-setinfo paper${p.done ? ' done' : ''}" style="--sc:${st.col}">
      <span class="wl-seti">${st.ic}</span>
      <div class="wl-sett"><b>${esc(st.name)}</b><span class="wl-setw">${SET_WHERE[st.where]}</span><p>${esc(st.sub)}</p></div>
      <span class="wl-setp"><b>${p.have}</b> מתוך <b>${p.n}</b></span>
      <span class="wl-setr">${IC.pack}<span>${p.done ? 'הסדרה שלמה – קיבלתם חבילה!' : `עוד ${miss === 1 ? 'קלף אחד' : miss + ' קלפים'} – וחבילה במתנה`}</span></span>
      <button class="wl-btn" data-wl="filter" data-v="all">כל הקלפים</button></div>`;
  }
  function renderAlbum() {
    checkSets(); // also grants sets an older save already had complete (with the celebration)
    const { total, have } = collection();
    const frameCls = chosenFrame() !== 'none' ? 'fr-' + chosenFrame() : '';   // the frame the player chose with their badges
    if (filter === 'src' && !(TORAH && sourcesOn())) filter = 'all';
    const curSet0 = filter.startsWith('set:') ? SET_BY.get(filter.slice(4)) : null;
    const curSet = curSet0 && (!curSet0.torah || sourcesOn()) ? curSet0 : null;
    if (filter.startsWith('set:') && !curSet) filter = 'all';
    const list = curSet ? curSet.cards : CARDS.filter((c) => filter === 'all' || (filter === 'tech' ? c.type === 'tool' : c.biome === filter));
    const tab = (v, t) => `<button class="wl-tab${filter === v ? ' sel' : ''}" data-wl="filter" data-v="${v}">${t}</button>`;
    main.innerHTML = `<section class="wl-screen wl-album">
      <div class="wl-abar paper">
        <div class="wl-count"><b>אספתם ${have} מתוך ${total}</b><div class="wl-meter"><i style="width:${Math.round((have / total) * 100)}%"></i></div></div>
        <div class="wl-tabs">${tab('all', 'הכול')}${tab('amazon', 'אמזונס')}${tab('grove', 'חורש')}${tab('reef', 'שונית')}${tab('tech', 'טכנולוגיה')}${TORAH && sourcesOn() ? tab('src', 'מן המקורות') : ''}</div>
        <button class="wl-btn wl-legbtn" data-wl="legend">${IC.quest}<span>מה רואים על הקלף?</span></button>
        <span class="wl-sp"></span>
        <button class="wl-btn gold" data-wl="pack" ${S.packs ? '' : 'disabled'} title="${S.packs && !opensLeft() ? 'היום כבר פתחתם ' + OPEN_PER_DAY + ' חבילות. מחר אפשר לפתוח עוד' : 'אפשר לפתוח עד ' + OPEN_PER_DAY + ' חבילות ביום'}">${IC.pack} ${S.packs && !opensLeft() ? 'עוד חבילות מחר' : 'פתחו חבילה'} ${S.packs ? `<span class="wl-badgeN">${S.packs}</span>` : ''}</button>
        <button class="wl-btn go" data-wl="duel" ${have >= 3 ? '' : 'disabled'} title="${have >= 3 ? 'מי חזק ברשת?' : 'צריך לפחות 3 קלפים'}" aria-label="מי חזק ברשת?">${IC.versus} <span class="wl-dlab">מי חזק ברשת?</span></button>
      </div>
      ${setsHTML()}
      ${curSet ? setInfoHTML(curSet) : ''}
      ${filter === 'src' ? sourcePageHTML() : `<div class="wl-grid${curSet ? ' inset' : ''}">${list.map((c, i) => { const o = { style: `--d:${i}`, cls: (i < 24 ? 'anim' : '') + (frameCls ? ' ' + frameCls : '') }; return S.owned[c.id] ? cardHTML(c, { ...o, count: S.owned[c.id] }) : cardHTML(c, { ...o, cls: i < 24 ? 'anim' : '', locked: true }); }).join('')}${filter === 'all' && srcOn() ? `<div class="wl-srcall">${sourcePageHTML()}</div>` : ''}</div>`}
    </section>`;
    const selSet = main.querySelector('.wl-set.sel'), setRow = selSet && selSet.parentElement;   // a scrolling row of chips: keep the chosen one in view
    if (setRow && setRow.scrollWidth > setRow.clientWidth) { const r = selSet.getBoundingClientRect(), rr = setRow.getBoundingClientRect(); if (r.left < rr.left || r.right > rr.right) setRow.scrollLeft += (r.left + r.width / 2) - (rr.left + rr.width / 2); }
    if (!S.packs && have < 3) toast(`${IC.quest}<span>שחקו בחידון כדי להרוויח חבילות קלפים</span>`);
  }
  // torah edition: the album page of source cards ("מן המקורות")
  // where the subject of each painting sits (0 = top, 1 = bottom): the album card shows a wide strip of it
  const SRC_FOCUS = { lion: 0.42, tzvi: 0.42, small4: 0.55, ant: 0.6, rashbi: 0.45, choni: 0.42, spider: 0.5, lashevet: 0.45, tikva: 0.62, shnayim: 0.72, kfirim: 0.6, efes: 0.62, tzvaim: 0.64 };
  // a card that has no painting yet: a strip in the card's colour with its sign, so it sits well among the painted ones
  const srcNoArt = (c, own) => `<span class="wl-sart none"><i>${own ? (IC[c.icon] || IC_SCROLL) : IC_SCROLL}</i></span>`;
  function sourceCardHTML(c, own, i) {
    const art = TORAH ? SOURCE_ART[c.id] : '';
    return `<button class="wl-scard${own ? '' : ' locked'}${art || TORAH ? ' art' : ''}" data-wl="szoom" data-s="${c.id}" style="--sc:${c.col};--d:${i}">
      ${art ? `<span class="wl-sart"><img src="${art}" alt="" draggable="false" style="object-position:50% ${((SRC_FOCUS[c.id] ?? 0.5) * 100).toFixed(0)}%"></span>` : TORAH ? srcNoArt(c, own) : ''}
      <span class="wl-sci">${own ? (IC[c.icon] || IC_SCROLL) : IC_SCROLL}</span>
      <b>${own ? esc(c.title) : 'קלף מקור'}</b><small>${own ? esc(c.ref) : esc(EARN_TEXT[c.earn] || '')}</small></button>`;
  }
  function sourcePageHTML() {
    const own = ownedSources(), have = SOURCE_CARDS.filter((c) => own[c.id]).length;
    return `<div class="wl-srcpage"><div class="wl-srchead paper">${IC_SCROLL}<div><b>קלפי מקור</b><p>סיפורים ופסוקים על הבריאה. אספתם ${have} מתוך ${SOURCE_CARDS.length}.</p></div></div>
      <div class="wl-sgrid">${SOURCE_CARDS.map((c, i) => sourceCardHTML(c, !!own[c.id], i)).join('')}</div></div>`;
  }
  function szoom(id) {
    const c = SOURCE_CARDS.find((x) => x.id === id); if (!c) return;
    if (!ownedSources()[id]) { toast(`${IC.quest}<span>${esc(EARN_TEXT[c.earn] || 'את הקלף הזה עוד לא קיבלתם')}</span>`, 3200); return; }
    sfx('select');
    const paras = (t) => String(t || '').split('\n').map((x) => `<p>${esc(x)}</p>`).join('');
    const art = TORAH ? SOURCE_ART[c.id] : '';
    modal.innerHTML = `<div class="wl-scard big${art || TORAH ? ' art' : ''}" style="--sc:${c.col}">${art ? `<span class="wl-sart"><img src="${art}" alt="" draggable="false"></span>` : TORAH ? srcNoArt(c, true) : ''}<span class="wl-sci">${IC[c.icon] || IC_SCROLL}</span><b>${esc(c.title)}</b><small>${esc(c.ref)}</small></div>
      <div class="wl-mtext paper wl-smtext"><h3>${esc(c.title)}</h3>
        ${c.story ? `<div class="wl-sstory">${paras(c.story)}</div>` : ''}
        ${c.quote ? `<div class="wl-src"><p class="t">${esc(c.quote)}</p><small>${esc(c.ref)}</small></div>` : `<div class="wl-src"><small>${esc(c.ref)}</small></div>`}
        ${c.lesson ? `<p class="wl-slesson">${esc(c.lesson)}</p>` : ''}
        <button class="wl-btn" data-wl="close">סגירה</button></div>`;
    modal.hidden = false;
  }
  function zoom(id) {
    const c = CARD.get(id); if (!c) return;
    if (!S.owned[id]) { toast(`${IC.quest}<span>את הקלף הזה עוד לא מצאתם. פתחו חבילות!</span>`); return; }
    sfx('select');
    const pips = (v) => `<span class="wl-pips">${[1, 2, 3, 4, 5].map((k) => `<i class="${k <= v ? 'on' : ''}"></i>`).join('')}</span>`;
    modal.innerHTML = `${cardHTML(c)}
      <div class="wl-mtext paper"><h3>${esc(c.name)}</h3><p>${esc(c.fact)}</p>
        <div class="wl-mrar r-${c.rarity}"><span class="wl-gems">${gems(c.rarity)}</span><span><b>${c.type === 'tool' ? 'כלי טכנולוגי' : RARITY_NAMES[c.rarity]}</b> – ${c.type === 'tool' ? RARITY_MORE.tech : `${c.rarity === 'common' ? 'יהלום נדירות אחד מתוך 3' : RARITY_GEMS[c.rarity] + ' מתוך 3 יהלומי נדירות'}. ${RARITY_MORE[c.rarity]}`}</span></div>
        ${powerHTML(c)}
        ${TORAH && sourcesOn() && SHIRA[id] ? `<div class="wl-src shira"><small>בפרק שירה</small><p class="t"><b>${esc(SHIRA[id].who)}:</b> ${esc(SHIRA[id].text)}</p><small>${esc(SHIRA[id].ref)}</small>${SHIRA[id].note ? `<p class="n">${esc(SHIRA[id].note)}</p>` : ''}</div>` : ''}
        <div class="wl-mstats">${(c.sk || KEYS_LAND).map((k) => `<span class="s-${k}">${STAT_ICON[k]} <b>${STAT_NAMES[k]}</b> – ${STAT_HELP[k]} ${pips(c.stats[k])}</span>`).join('')}</div>
        ${setsOf(id).length ? `<div class="wl-msets"><small>בסדרה:</small>${setsOf(id).map((st) => { const p = setProg(st); return `<button class="wl-mset${p.done ? ' done' : ''}" data-wl="set" data-v="${st.id}" style="--sc:${st.col}">${st.ic}<span>${esc(st.name)}</span><b>${p.done ? IC.check : p.have + '/' + p.n}</b></button>`; }).join('')}</div>` : ''}
        <button class="wl-btn" data-wl="close">סגירה</button></div>`;
    modal.hidden = false;
  }
  // what a rare / very rare card can do in "מחזיקים את היער" (agreeing with the species)
  function powerHTML(c) {
    if (c.type !== 'species' || (c.rarity !== 'epic' && c.rarity !== 'rare')) return '';
    const id = c.sp.id, it = gw(id, 'אותו', 'אותה', 'אותם', 'אותן');
    const txt = c.rarity === 'epic'
      ? `<b>מין מפתח:</b> הרבה יצורים צריכים ${it}. במשחק "מחזיקים את היער" ${gw(id, 'הוא שומר', 'היא שומרת', 'הם שומרים', 'הן שומרות')} על היער פעם אחת, כשהיער לא מוכן לאירוע.`
      : `<b>בונוס קטן:</b> במשחק "מחזיקים את היער", אם ${gw(id, 'הוא מתחבר', 'היא מתחברת', 'הם מתחברים', 'הן מתחברות')} בחוט זהב כשמניחים ${it} – עוד <bdi dir="ltr">+1</bdi> חִיּוּת.`;
    return `<div class="wl-mpow r-${c.rarity}"><span class="wl-powi">${c.rarity === 'epic' ? IC_KEY : '+1'}</span><span>${txt}</span></div>`;
  }
  // "מה רואים על הקלף?" – one big example card with numbered markers + a numbered legend
  function cardLegend() {
    const c = CARDS.find((x) => x.rarity === 'rare' && x.art && x.type === 'species' && x.name.length <= 9) || CARDS[0];
    sfx('select');
    const dia = (n) => `<span class="wl-lgems">${[0, 1, 2].map((k) => `<span class="wl-gem${k < n ? ' on' : ''}">${IC_GEM}</span>`).join('')}</span>`;
    const items = [
      ['name', 'השם', 'איזה יצור זה.'],
      ['badge', 'איפה הוא גר', '<b class="wl-badge b-amazon">אמזונס</b> <b class="wl-badge b-grove">חורש</b> <b class="wl-badge b-reef">שונית</b> – יער הגשם, החורש שלנו או שונית האלמוגים של אילת. <b class="wl-badge b-tech">טכנולוגיה</b> – כלי שעוזר לשמור על הטבע.'],
      ['kind', 'מה הוא', 'עץ, שיח, פרח, בעל חיים, פטרייה...'],
      ['gems', 'יהלומי נדירות', `כמה קשה למצוא את הקלף בחבילות: <span class="wl-lr c">${dia(1)} נפוץ</span><span class="wl-lr r">${dia(2)} נדיר</span><span class="wl-lr e">${dia(3)} נדיר מאוד</span><span class="wl-lr t"><span class="wl-gems">${gems('tech')}</span> כלי טכנולוגי</span>`],
      ['x-power', 'נדירות במשחק', `<span class="wl-lp e"><b>נדיר מאוד = מין מפתח.</b> כוח מיוחד במשחק "מחזיקים את היער": שומר על היער פעם אחת.</span><span class="wl-lp r"><b>נדיר:</b> בונוס קטן – עוד <bdi dir="ltr">+1</bdi> חִיּוּת.</span>`],
      ['stats', 'שלושה מספרים', `${STAT_ICON.light} <b>אור</b> – כמה אור הוא צריך. ${STAT_ICON.water} <b>מים</b> – כמה מים ולחות (בקלפי השונית במקומם ${STAT_ICON.shelter} <b>מחסה</b> – כמה בית הוא נותן לאחרים). ${STAT_ICON.links} <b>קשרים</b> – עם כמה יצורים יש לו קשר ברשת. מ-1 עד 5.`],
      ['fact', 'הידעת?', 'משפט קצר ומעניין על היצור.'],
      ['rar', 'נדירות במילים', 'גם צבע המסגרת מספר: ירוק – נפוץ, זהב – נדיר, אדום-סגול – נדיר מאוד, כחול – טכנולוגיה.'],
    ];
    // numbered items point at a part of the card; "x-" items are extra notes (an icon, no number)
    let num = 0; const nums = items.map(([k]) => (k.startsWith('x-') ? 0 : ++num));
    modal.innerHTML = `<div class="wl-lgcard">${cardHTML(c)}${items.map(([k], i) => (nums[i] ? `<span class="wl-lgpin" data-k="${k}">${nums[i]}</span>` : '')).join('')}</div>
      <div class="wl-mtext wl-legend paper"><h3>מה רואים על הקלף?</h3>
        <ol>${items.map(([k, t, x], i) => `<li data-k="${k}"${nums[i] ? '' : ' class="wl-lgx"'}><span class="wl-lgn">${nums[i] || IC_KEY}</span><div><b>${t}</b><p>${x}</p></div></li>`).join('')}</ol>
        <button class="wl-btn go" data-wl="close">הבנתי</button></div>`;
    modal.hidden = false;
    // pin each number next to its part of the card (offsets ignore the pop-in scale animation)
    const box = modal.querySelector('.wl-lgcard'), card = box.querySelector('.wl-card');
    const SEL = { name: '.wl-cname', badge: '.wl-badge', kind: '.wl-ctype > span', gems: '.wl-gems', stats: '.wl-stats', fact: '.wl-cfact', rar: '.wl-crar' };
    const place = () => {
      const W = card.offsetWidth;
      box.querySelectorAll('.wl-lgpin').forEach((pin) => {
        const t = card.querySelector(SEL[pin.dataset.k]); if (!t) return;
        let y = 0, e = t; while (e && e !== card) { y += e.offsetTop; e = e.offsetParent; }
        const right = ['name', 'kind', 'fact'].includes(pin.dataset.k); // RTL: these start at the right edge
        pin.style.top = (card.offsetTop + y + t.offsetHeight / 2) + 'px';
        pin.style.left = (card.offsetLeft + (right ? W + 2 : -2)) + 'px'; // on the frame, next to the part it names
      });
    };
    place(); requestAnimationFrame(place);
  }
  function closeModal() { modal.hidden = true; modal.innerHTML = ''; }

  /* ── pack opening */
  let P = null;
  function rollPack() {
    const W = { common: 6, rare: 3.2, tech: 3, epic: 1.5 };
    const res = [];
    for (let i = 0; i < 3; i++) {
      const missing = CARDS.filter((c) => !S.owned[c.id] && !res.includes(c));
      const pool = (missing.length && Math.random() < 0.75 ? missing : CARDS).filter((c) => !res.includes(c));
      let sum = pool.reduce((s, c) => s + W[c.rarity], 0), r = Math.random() * sum, got = pool[pool.length - 1];
      for (const c of pool) { r -= W[c.rarity]; if (r <= 0) { got = c; break; } }
      res.push(got);
    }
    return res;
  }
  const RAR_ORDER = { common: 0, tech: 1, rare: 2, epic: 3 };
  const RAR_CONF = { common: ['#8fd067', '#5fae4a', '#b7e08e', '#e9e6cc'], tech: ['#8cc3dc', '#4aa3d6', '#dbeaf0', '#b9e0f5'],
    rare: ['#f6cf72', '#e09a2c', '#fff1c4', '#f2cf5b'], epic: ['#f6cf72', '#e79aab', '#b9a8e0', '#8cc3dc', '#fff1c4'] };
  const RAR_SAY = { rare: 'קלף נדיר!', epic: 'נדיר מאוד!', tech: 'טכנולוגיה!' };
  const SEAL_CRACKS = '<svg class="wl-pcrk" viewBox="0 0 40 40" aria-hidden="true"><path class="c1" d="M20 3l-2 8 4 5-3 7"/><path class="c2" d="M5 23l7-2 4 4 8-2 6 5"/><path class="c3" d="M34 9l-6 6 2 6-6 9 2 7"/></svg>';
  const openedToday = () => (S.opened && S.opened.d === todayKey() ? S.opened.n : 0);
  const opensLeft = () => Math.max(0, OPEN_PER_DAY - openedToday());
  function renderPack() {
    P = { stage: 'closed', taps: 0, cards: null, fresh: null, up: 0 };
    if (!S.packs) { go('album'); return; }
    if (!opensLeft()) {
      main.innerHTML = `<section class="wl-screen wl-packs"><div><h2 class="wl-ptitle">החבילות מחכות למחר</h2>
        <p class="wl-psub">היום כבר פתחתם ${OPEN_PER_DAY} חבילות. ${S.packs === 1 ? 'החבילה שלכם שמורה' : `${S.packs} החבילות שלכם שמורות`}, ומחר תוכלו לפתוח עוד ${OPEN_PER_DAY}.</p></div>
        <div class="wl-stage v2"><div class="wl-rays"></div><span class="wl-pk-wait">${IC.pack}</span></div>
        <div class="wl-row"><button class="wl-btn go" data-wl="album">${IC.cards} לאלבום</button><button class="wl-btn" data-wl="duel">${IC.versus} מי חזק ברשת?</button></div></section>`;
      return;
    }
    main.innerHTML = `<section class="wl-screen wl-packs">
      <div><h2 class="wl-ptitle">חבילת קלפים</h2><p class="wl-psub">לחצו על החבילה כדי לפתוח אותה</p></div>
      <div class="wl-stage v2"><div class="wl-rays"></div>
        <button class="wl-pack v2" data-wl="tear" aria-label="פתיחת החבילה" style="--tear:${PACK_ART.tear * 100}%">
          <span class="wl-pk3"><span class="wl-pk-beam"></span>
            <span class="wl-pk-body" style="background-image:url('${PACK_ART.body}');-webkit-mask-image:url('${PACK_ART.body}');mask-image:url('${PACK_ART.body}')"><span class="wl-pk-sheen"></span></span>
            <span class="wl-pk-strip" style="background-image:url('${PACK_ART.strip}');-webkit-mask-image:url('${PACK_ART.strip}');mask-image:url('${PACK_ART.strip}')"><span class="wl-pk-sheen"></span></span>
            <span class="wl-pk-tear" style="top:${PACK_ART.tear * 100}%"></span></span></button></div>
      <div class="wl-row wl-pafter" style="visibility:hidden"></div></section>`;
    // the foil bag leans toward the pointer
    const pk = $('.wl-pack.v2'), p3 = pk && pk.querySelector('.wl-pk3'), st = $('.wl-stage');
    if (p3 && !reduced()) {
      st.addEventListener('pointermove', (e) => {
        if (!P || P.stage !== 'closed') return;
        const r = pk.getBoundingClientRect();
        const x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / r.width)), y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / r.height));
        p3.style.setProperty('--ry', (x * 16).toFixed(1) + 'deg'); p3.style.setProperty('--rx', (-y * 12).toFixed(1) + 'deg');
      });
      st.addEventListener('pointerleave', () => { p3.style.setProperty('--ry', '0deg'); p3.style.setProperty('--rx', '0deg'); });
    }
  }
  // one tap starts the whole sequence: crack, crack again, then the pack opens
  function tearPack() {
    if (!P || P.stage !== 'closed' || !S.packs || !opensLeft()) return;
    P.stage = 'cracking';
    const pack = $('.wl-pack'); pack.disabled = true;
    // the cards are drawn now, so the light leaking from the seam already tells how special the best one is
    P.pre = rollPack();
    const best = P.pre.reduce((b, c) => (RAR_ORDER[c.rarity] > RAR_ORDER[b] ? c.rarity : b), 'common');
    pack.style.setProperty('--rc', { common: '170,224,130', tech: '140,200,236', rare: '255,214,110', epic: '240,150,200' }[best]);
    const p3 = pack.querySelector('.wl-pk3'); if (p3) { p3.style.setProperty('--ry', '0deg'); p3.style.setProperty('--rx', '0deg'); }
    $('.wl-psub').textContent = 'פותחים...';
    const crack = (n) => {
      pack.classList.remove('hit'); void pack.offsetWidth; pack.classList.add('hit', 'crk' + n);
      pack.style.setProperty('--glow', String(n / 3)); sfx('pickup');
    };
    if (reduced()) { crack(3); openPack(); return; }
    crack(1); later(() => crack(2), 520); later(() => crack(3), 1000); later(openPack, 1300);
  }
  function openPack() {
    P.stage = 'opening'; S.packs--; S.opened = { d: todayKey(), n: openedToday() + 1 };
    // weakest first, so the most special card waits at the end of the row
    const cards = (P.pre || rollPack()).sort((a, b) => RAR_ORDER[a.rarity] - RAR_ORDER[b.rarity]);
    const fresh = cards.map((c) => !S.owned[c.id]);
    cards.forEach((c) => { S.owned[c.id] = (S.owned[c.id] || 0) + 1; });
    save(); updateChip(true);
    P.cards = cards; P.fresh = fresh;
    const pack = $('.wl-pack'), stage = $('.wl-stage');
    pack.classList.add('open'); sfx('pop');
    $('.wl-psub').textContent = 'נפתח...';
    later(() => {
      stage.classList.add('lit'); sfx('discover');
      stage.insertAdjacentHTML('beforeend', '<div class="wl-flash"></div>');
      stage.insertAdjacentHTML('beforeend', cards.map((c, i) => flipHTML(c, { cls: `k${i} h-${c.rarity}`, isNew: fresh[i] })
        .replace('<div class="wl-flip', `<div data-wl="reveal" data-k="${i}" role="button" tabindex="0" aria-label="הפיכת קלף" class="wl-flip`)).join(''));
      const flips = [...stage.querySelectorAll('.wl-flip')];
      requestAnimationFrame(() => requestAnimationFrame(() => flips.forEach((f, i) => later(() => f.classList.add('rise'), i * 110))));
      later(() => pack.classList.add('gone'), 500);
      later(() => {
        flips.forEach((f) => f.classList.add('out')); sfx('select');
        P.stage = 'reveal';
        $('.wl-ptitle').textContent = 'מה יצא לכם?';
        $('.wl-psub').textContent = 'הקישו על כל קלף כדי להפוך אותו';
        const after = $('.wl-pafter'); after.style.visibility = 'visible';
        after.innerHTML = `<button class="wl-btn" data-wl="revealall">${IC.cards} הפכו את כולם</button>`;
      }, 1250);
    }, 520);
  }
  function revealCard(t, quick) {
    if (!P || P.stage !== 'reveal' || !t) return;
    const f = t.closest('.wl-flip'); if (!f || f.classList.contains('is-up') || f.classList.contains('tease')) return;
    const k = +f.dataset.k, c = P.cards[k];
    const flip = () => {
      f.classList.remove('tease'); f.classList.add('is-up');
      sfx(c.rarity === 'epic' ? 'mission' : c.rarity === 'rare' ? 'event' : c.rarity === 'tech' ? 'discover' : 'select');
      f.insertAdjacentHTML('afterbegin', `<span class="wl-burst b-${c.rarity}"></span>${RAR_SAY[c.rarity] ? `<span class="wl-rsay s-${c.rarity}">${RAR_SAY[c.rarity]}</span>` : ''}`);
      const n = { common: 10, tech: 14, rare: 20, epic: 34 }[c.rarity];
      later(() => confetti(f, P.fresh[k] ? n : Math.ceil(n / 2), RAR_CONF[c.rarity]), 330);
      if (++P.up === 3) later(finishPack, 900);
    };
    if (!quick && !reduced() && (c.rarity === 'rare' || c.rarity === 'epic')) {
      f.classList.add('tease'); sfx('pickup'); later(flip, c.rarity === 'epic' ? 950 : 600);
    } else flip();
  }
  function revealAll() {
    if (!P || P.stage !== 'reveal') return;
    const after = $('.wl-pafter'); if (after) after.style.visibility = 'hidden';
    [...main.querySelectorAll('.wl-stage .wl-flip:not(.is-up):not(.tease)')].forEach((f, i) => later(() => revealCard(f, true), i * 380));
  }
  function finishPack() {
    if (!P || P.stage === 'done') return;
    P.stage = 'done';
    const sets = checkSets();
    const nNew = P.fresh.filter(Boolean).length;
    $('.wl-ptitle').textContent = nNew ? (nNew === 1 ? 'קלף חדש באלבום!' : `${nNew} קלפים חדשים באלבום!`) : 'הקלפים כבר באלבום – עכשיו יש לכם עוד עותק';
    $('.wl-psub').textContent = `אספתם ${collection().have} מתוך ${collection().total}` + (sets.length ? ` · השלמתם סדרה: ${sets.map((st) => st.name).join(', ')} – חבילה במתנה!` : '');
    const after = $('.wl-pafter'); after.style.visibility = 'visible';
    after.innerHTML = `${S.packs && opensLeft() ? `<button class="wl-btn gold" data-wl="pack">${IC.pack} עוד חבילה <span class="wl-badgeN">${S.packs}</span></button>` : S.packs ? `<span class="wl-dhint">${IC.pack} עוד חבילות מחכות למחר</span>` : ''}
      <button class="wl-btn go" data-wl="album">${IC.cards} לאלבום</button>`;
  }

  /* ── duel: מי חזק ברשת? */
  let D = null;
  const STATS = ['light', 'water', 'shelter', 'links'];
  const hasStat = (c, k) => c.stats[k] != null;
  // a round asks about a number both sides can play: מים only for land cards, מחסה only for reef cards
  function pickStat(avoid) {
    const ok = (k) => D.hand.some((h) => !h.used && hasStat(h.c, k)) && D.cpu.some((h) => !h.used && hasStat(h.c, k));
    let list = STATS.filter(ok);
    if (!list.length) { D.hand.forEach((h) => { h.used = false; }); list = STATS.filter(ok); }
    if (!list.length) list = ['light', 'links'];   // every card has these two
    if (avoid && list.length > 1 && Math.random() < 0.6) list = list.filter((k) => k !== avoid);
    // מים and מחסה share one turn of the wheel, so אור and קשרים come up as often as before
    const w = list.map((k) => (k === 'water' || k === 'shelter' ? 0.5 : 1));
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < list.length; i++) { r -= w[i]; if (r <= 0) return list[i]; }
    return list[list.length - 1];
  }
  function startDuel() {
    const owned = CARDS.filter((c) => S.owned[c.id]);
    if (owned.length < 3) { go('album'); return; }
    D = { hand: sample(owned, Math.min(5, owned.length)).map((c) => ({ c, used: false })), cpu: sample(CARDS, 5).map((c) => ({ c, used: false })),
      round: 0, me: 0, him: 0, res: [], stat: 'light', phase: 'pick', mine: null, his: null };
    D.stat = pickStat();
    renderDuel();
  }
  function renderDuel() {
    const statLine = `${STAT_ICON[D.stat]} הסבב הזה: ${STAT_NAMES[D.stat]}`;
    const slot = (who, card, up) => card ? flipHTML(card, { up, hl: D.phase === 'show' ? D.stat : null }) : `<div class="wl-empty">${who === 'me' ? 'בחרו קלף מלמטה' : 'המחשב מחכה'}</div>`;
    const winMe = D.phase === 'show' && D.last === 'w', winHim = D.phase === 'show' && D.last === 'l';
    main.innerHTML = `<section class="wl-screen wl-duel">
      <div class="wl-dhead paper">
        <div class="wl-score"><span>אתם</span><b>${D.me}</b><span>:</span><b>${D.him}</b><span>המחשב</span></div>
        <div class="wl-rounds">${[0, 1, 2, 3, 4].map((k) => `<i class="${D.res[k] || (k === D.round && !D.done ? 'c' : '')}"></i>`).join('')}</div>
        <span class="wl-dstat">${statLine}</span>
      </div>
      <p class="wl-dhelp">${IC.sun} אור – כמה אור צריך · ${IC.drop} מים – כמה מים ולחות · ${STAT_ICON.shelter} מחסה – כמה בית נותן (בשונית) · ${IC.web} קשרים. המספר הגבוה מנצח!</p>
      <div class="wl-arena">
        <div class="wl-slot me${winMe ? ' win' : ''}"><small>הקלף שלכם</small>${slot('me', D.mine, true)}</div>
        <span class="wl-vs">מול</span>
        <div class="wl-slot cpu${winHim ? ' win' : ''}"><small>הקלף של המחשב</small>${slot('cpu', D.his, D.phase === 'show')}</div>
      </div>
      <div class="wl-dbar">${D.msg ? `<div class="wl-dmsg paper">${D.msg}</div>` : D.phase === 'pick' ? `<span class="wl-dhint">${IC.cards} בחרו קלף מהיד שלכם – מי חזק יותר ב${STAT_NAMES[D.stat]}?</span>` : ''}</div>
      <div class="wl-hand${D.phase !== 'pick' ? ' locked' : ''}">${D.hand.map((h, i) => cardHTML(h.c, { cls: h.used ? 'used' : !hasStat(h.c, D.stat) ? 'used off' : '', style: `--d:${i}` }).replace('class="wl-card', `data-wl="play" data-k="${i}" class="wl-card`)).join('')}</div>
    </section>`;
  }
  function playCard(k) {
    if (!D || D.phase !== 'pick') return;
    const h = D.hand[k]; if (!h || h.used || !hasStat(h.c, D.stat)) return;
    sfx('place');
    h.used = true; D.mine = h.c; D.phase = 'wait';
    let left = D.cpu.filter((x) => !x.used && hasStat(x.c, D.stat));
    if (!left.length) left = D.cpu.filter((x) => hasStat(x.c, D.stat));
    const choice = Math.random() < 0.5 ? left.slice().sort((a, b) => b.c.stats[D.stat] - a.c.stats[D.stat])[0] : pick(left);
    choice.used = true; D.his = choice.c; D.msg = '';
    renderDuel();
    later(() => {
      D.phase = 'show';
      const a = D.mine.stats[D.stat], b = D.his.stats[D.stat];
      D.last = a > b ? 'w' : a < b ? 'l' : 't';
      if (D.last === 'w') D.me++; else if (D.last === 'l') D.him++;
      D.res[D.round] = D.last;
      D.done = D.me >= 3 || D.him >= 3 || D.round >= 4;
      const txt = D.last === 'w' ? `ניצחתם בסבב! ${a} מול ${b}` : D.last === 'l' ? `המחשב לקח את הסבב: ${b} מול ${a}` : `תיקו! ${a} מול ${b}`;
      D.msg = `<span>${txt}</span><button class="wl-btn ${D.done ? 'gold' : 'go'}" data-wl="dnext">${D.done ? 'לתוצאה' : 'לסבב הבא'} ${IC.next}</button>`;
      renderDuel();
      // the cpu card was rendered face-down → flip it up on the next frame
      const f = main.querySelector('.wl-slot.cpu .wl-flip'); if (f) { f.classList.remove('is-up'); requestAnimationFrame(() => requestAnimationFrame(() => f.classList.add('is-up'))); }
      sfx(D.last === 'w' ? 'quizRight' : D.last === 'l' ? 'quizWrong' : 'click');
      if (D.last === 'w') later(() => confetti(main.querySelector('.wl-slot.me')), 300);
    }, 650);
  }
  function duelNext() {
    if (!D || D.phase !== 'show') return;
    sfx('click');
    if (D.done) return duelEnd();
    D.round++; D.phase = 'pick'; D.mine = D.his = null; D.msg = '';
    if (D.hand.every((h) => h.used)) D.hand.forEach((h) => { h.used = false; });
    D.stat = pickStat(D.stat);
    renderDuel();
  }
  function duelEnd() {
    const win = D.me > D.him, tie = D.me === D.him;
    // at most DUEL_PACKS_PER_DAY packs a day from duels (tracked by local date in the saved state)
    let gotPack = false;
    if (win) {
      S.duelsWon = (S.duelsWon || 0) + 1;
      const today = todayKey();
      if (!S.duelPacks || S.duelPacks.d !== today) S.duelPacks = { d: today, n: 0 };
      if (S.duelPacks.n < DUEL_PACKS_PER_DAY) { S.duelPacks.n++; S.packs++; gotPack = true; }
      save(); updateChip(gotPack);
    }
    main.innerHTML = `<section class="wl-screen"><div class="wl-end paper">
      <div class="wl-stars">${[0, 1, 2].map((k) => `<span class="${k < (win ? 3 : tie ? 2 : 1) ? 'on' : ''}" style="animation-delay:${0.15 + k * 0.22}s">${IC.star}</span>`).join('')}</div>
      <h2>${win ? 'ניצחתם!' : tie ? 'תיקו!' : 'הפעם המחשב ניצח'}</h2>
      <p>אתם <b>${D.me}</b> · המחשב <b>${D.him}</b></p>
      ${win ? (gotPack ? `<span class="wl-gotpack">${IC.pack} קיבלתם חבילת קלפים!</span>` : '<p>היום כבר קיבלתם את כל חבילות הקלפים מהמשחק הזה. מחר יהיו עוד!<br>אפשר להמשיך לשחק בשביל הכיף, או להרוויח חבילות בחידון.</p>') : '<p>נסו שוב – כל קלף חזק במשהו אחר.</p>'}
      <div class="wl-row"><button class="wl-btn go" data-wl="duel">שחקו שוב</button><button class="wl-btn" data-wl="album">${IC.cards} לאלבום</button></div>
    </div></section>`;
    sfx(win ? 'mission' : 'click');
    if (win) later(() => confetti($('.wl-stars'), 30), 500);
  }

  /* ── events */
  const ACT = {
    back, close: closeModal, home: () => { sfx('click'); go('home'); }, setup: () => { sfx('click'); go('setup'); },
    album: () => { sfx('click'); go('album'); }, packs: () => { sfx('click'); go(S.packs ? 'pack' : 'album'); },
    pick: (t) => { QS[t.dataset.g] = t.dataset.v; sfx('select'); renderSetup(); },
    start: () => { sfx('click'); go('quiz'); }, again: () => { sfx('click'); go('quiz', { level: Q && Q.level, biome: Q && Q.biome }); },
    ans: (t) => answer(+t.dataset.k), next: nextQ,
    filter: (t) => { filter = t.dataset.v; sfx('click'); renderAlbum(); },
    set: (t) => { const v = 'set:' + t.dataset.v; const fromZoom = !modal.hidden; closeModal(); filter = filter === v && !fromZoom ? 'all' : v; sfx('select'); if (screen === 'album') renderAlbum(); else go('album'); },
    pack: () => { sfx('click'); go('pack'); }, tear: tearPack, reveal: (t) => revealCard(t), revealall: revealAll, legend: () => cardLegend(),
    game: (t) => { sfx('click'); go(t.dataset.g); },
    szoom: (t) => szoom(t.dataset.s),
    srctoggle: () => { setSourcesOn(!sourcesOn()); sfx('click'); if (!sourcesOn() && (filter === 'src' || (filter.startsWith('set:') && SET_BY.get(filter.slice(4))?.torah))) filter = 'all'; go(screen === 'home' ? 'home' : screen); },
    duel: () => { sfx('click'); go('duel'); }, play: (t) => playCard(+t.dataset.k), dnext: duelNext,
    badges: () => { sfx('click'); go('badges'); }, frame: (t) => { if (chooseFrame(t.dataset.f)) { sfx('select'); renderBadges(); } },
  };
  // low screens: the set chips are one scrolling row; the mouse wheel moves it sideways
  el.addEventListener('wheel', (e) => {
    const row = e.target.closest && e.target.closest('.wl-setrow');
    if (!row || row.scrollWidth <= row.clientWidth + 2 || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    e.preventDefault(); row.scrollLeft -= e.deltaY;
  }, { passive: false });
  el.addEventListener('click', (e) => {
    const t = e.target.closest('[data-wl]');
    if (t && el.contains(t) && !t.disabled) { ACT[t.dataset.wl] && ACT[t.dataset.wl](t, e); return; }
    if (e.target === modal) { closeModal(); return; }
    const c = e.target.closest('.wl-grid .wl-card'); if (c) zoom(c.dataset.cid);
  });
  // keep the game underneath from reacting to input while the hub is open
  for (const ev of ['pointerdown', 'pointerup', 'pointermove', 'wheel', 'contextmenu', 'mousedown', 'touchstart']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: ev !== 'contextmenu' });
  const onKey = (e) => {
    if (!open_) return;
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); back(); }
    else if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.matches && e.target.matches('[data-wl][role=button]')) { e.preventDefault(); e.target.click(); }
  };

  function open() {
    if (open_) return;
    reloadState(); readMode(); paintWho(); // the start screen may have switched player or מתחילים / מתקדמים since the hub was created
    open_ = true; el.hidden = false;
    window.addEventListener('keydown', onKey, true);
    go('home');
    try { $('.wl-back').focus({ preventScroll: true }); } catch (e) { /* */ }
  }
  function close() {
    if (!open_) return;
    open_ = false; clearTimers(); closeModal(); el.hidden = true;
    window.removeEventListener('keydown', onKey, true);
    sfx('click');
    try { onClose && onClose(); } catch (e) { console.warn(e); }
  }
  const api = { open, close, isOpen: () => open_, grantPack, go: (name, opts) => { if (!open_) open(); returnTo = opts && opts.from === 'lab' ? name : null; go(name, opts); } };
  try {
    window.__wolLearn = {
      ...api,
      _go: (name, opts) => { if (!open_) open(); go(name, opts); return screen; },
      _answer: (right = true) => { if (!Q) return; const k = Q.qs[Q.i].options.findIndex((o) => !!o.ok === !!right); answer(k < 0 ? 0 : k); },
      _tear: tearPack, _play: (k = 0) => playCard(k), _zoom: zoom,
      _collect: (n = CARDS.length) => { if (!open_) reloadState(); sample(CARDS, n).forEach((c) => { S.owned[c.id] = (S.owned[c.id] || 0) + 1; }); save(); if (open_ && screen === 'album') renderAlbum(); else checkSets(); return ownedCount(); },
      _give: (ids) => { if (!open_) reloadState(); ids.forEach((id) => { if (CARD.has(id)) S.owned[id] = (S.owned[id] || 0) + 1; }); save(); if (open_ && screen === 'album') renderAlbum(); else checkSets(); return ownedCount(); },
      _sets: () => SETS.map((st) => ({ id: st.id, name: st.name, cards: st.cards.map((c) => c.id + ':' + c.rarity), have: setProg(st).have, done: !!(S.sets || {})[st.id] })),
      _reset: () => { if (!open_) reloadState(); S.owned = {}; S.packs = START_PACKS; S.duelPacks = null; S.sets = {}; save(); },
      _state: () => { if (!open_) reloadState(); return JSON.parse(JSON.stringify(S)); },
      _round: (level = 'easy', biome = 'both') => buildRound(level, biome).map((q) => ({ q: q.q, sub: q.sub, tag: q.tag, art: q.art && q.art.id, opts: q.options.map((o) => (o.ok ? '*' : '') + o.label) })),
      cards: CARDS.length,
    };
  } catch (e) { /* no window */ }
  updateChip(false);
  return api;
}
