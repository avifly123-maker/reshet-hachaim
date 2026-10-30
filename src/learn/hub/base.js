// מרכז הלמידה – the hub's constants, small helpers, name masking for the quiz, and its inline SVG icons.
// Exports: the store key and pack rules (STORE_KEY, ROUND, PACK_CHANCE, QUIZ_PACKS_MAX, DUEL_PACKS_PER_DAY, START_PACKS,
// OPEN_PER_DAY, todayKey), the places (BIOMES, BIOME_SHORT, BIOME_IN), card words (STAT_*, KEYS_*, RARITY_*), helpers
// (esc, rnd, pick, shuffle, sample, uniq, clamp, firstSentence, rgba, stemOf, maskName, leaksName), icons (sv, IC,
// PART_ICON, STAT_ICON, IC_CURTAIN) and the quiz's diet words (EASY_PARTS, EASY_PART_LABEL).
// Needs: the zone data (src/data/*.js) and the name aliases of src/data/common.js. No DOM.
import { K } from '../../core/storage.js';
import { BIOME as AMAZON } from '../../data/amazon.js';
import { ALIASES } from '../../data/common.js';
import { BIOME as GROVE } from '../../data/grove.js';
import { BIOME as REEF } from '../../data/reef.js';
import { BIOME as DESERT } from '../../data/desert.js';
import { ZONE_IDS, ZONE_LOOK } from '../../data/zones.js';

export const STORE_KEY = K.cards;   // per player (core/storage.js)
export const ROUND = 10;
// card packs are a treat, not a flood: a right answer brings one only now and then (at most 2 a round)
export const PACK_CHANCE = 0.22;
export const QUIZ_PACKS_MAX = 2;
export const DUEL_PACKS_PER_DAY = 2;
export const START_PACKS = 3;   // a new player starts with 3 packs as a welcome gift
// packs can be earned without limit, but only OPEN_PER_DAY are opened a day: the album should last more than a day
export const OPEN_PER_DAY = 6;
export const todayKey = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
export const BIOMES = { amazon: AMAZON, grove: GROVE, reef: REEF, desert: DESERT };
export const BIOME_SHORT = Object.fromEntries(ZONE_IDS.map((z) => [z, ZONE_LOOK[z].short]));
export const BIOME_IN = Object.fromEntries(ZONE_IDS.map((z) => [z, ZONE_LOOK[z].inside]));
// reef cards show מחסה instead of מים: in the sea there is always water (Avi, 18.10), but a reef is a city of homes
export const STAT_NAMES = { light: 'אור', water: 'מים', shelter: 'מחסה', links: 'קשרים' };
export const STAT_HELP = { light: 'כמה אור צריך', water: 'כמה מים ולחות', shelter: 'כמה בית ומחסה נותן לאחרים', links: 'עם כמה יצורים יש קשר' };
export const KEYS_LAND = ['light', 'water', 'links'], KEYS_REEF = ['light', 'shelter', 'links'];
export const RARITY_NAMES = { common: 'נפוץ', rare: 'נדיר', epic: 'נדיר מאוד', tech: 'טכנולוגיה' };
export const RARITY_GEMS = { common: 1, rare: 2, epic: 3 };
// what the rarity means, in a child's words (tooltips, zoom, the "מה רואים על הקלף?" legend)
export const RARITY_TIP = {
  common: 'קלף נפוץ – יהלום נדירות 1 מתוך 3',
  rare: 'קלף נדיר – 2 יהלומי נדירות מתוך 3. במשחק "מחזיקים את היער" – בונוס קטן',
  epic: 'קלף נדיר מאוד – מין מפתח! 3 יהלומי נדירות מתוך 3. כוח מיוחד במשחק "מחזיקים את היער"',
  tech: 'כלי טכנולוגי (גלגל שיניים) – לא יצור חי',
};
export const RARITY_MORE = {
  common: 'קל למצוא אותו בחבילות.',
  rare: 'קשה יותר למצוא אותו בחבילות.',
  epic: 'מוצאים אותו רק לפעמים בחבילות – שמרו עליו!',
  tech: 'כלים עוזרים לאנשים לשמור על הטבע.',
};
// what the rarity does in "מחזיקים את היער" (keep-forest.js): a keystone guards the forest once, a rare card gives +1
export const RARITY_POWER = {
  rare: 'במשחק "מחזיקים את היער": אם הוא מתחבר בחוט זהב כשמניחים אותו – עוד נקודת חִיּוּת אחת.',
  epic: 'מין מפתח – הרבה יצורים צריכים אותו. במשחק "מחזיקים את היער" הוא שומר על היער פעם אחת, כשהיער לא מוכן לאירוע.',
};

/* ───────────────────────────────────────────── helpers */
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const rnd = (n) => Math.floor(Math.random() * n);
export const pick = (a) => a[rnd(a.length)];
export function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export const sample = (a, n) => shuffle(a).slice(0, n);
export const uniq = (a) => [...new Set(a)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function firstSentence(t) { const m = String(t || '').match(/^.*?[.!?](?=\s|$)/); return m ? m[0] : String(t || ''); }
export function rgba(hex, a) {
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
export const stemOf = (w) => (w.length >= 6 ? w.slice(0, -2) : w.length >= 4 ? w.slice(0, -1) : w);
export function maskName(text, name, id) {
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
export function leaksName(text, name, id) {
  return maskWords(name, ALIASES[id] || []).some((w) => new RegExp(MB + reEsc(stemOf(w))).test(text));
}

/* ───────────────────────────────────────────── icons (inline SVG, no emoji-only meaning) */
export const sv = (body, vb = '0 0 24 24') => `<svg class="wl-ic" viewBox="${vb}" aria-hidden="true">${body}</svg>`;
export const IC = {
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
export const PART_ICON = { leaves: IC.leaf, fruit: IC.fruit, nectar: IC.flower, seeds: IC.seed, insects: IC.bug, animals: IC.paw, roots: IC.root, fungus: IC.mush, dead: IC.leaf };
export const EASY_PARTS = ['leaves', 'fruit', 'nectar', 'seeds', 'insects', 'animals'];
export const EASY_PART_LABEL = { leaves: 'עלים', fruit: 'פירות', nectar: 'צוף מפרחים', seeds: 'זרעים', insects: 'חרקים', animals: 'בעלי חיים', roots: 'פקעות', fungus: 'פטריות', dead: 'חומר מת' };
export const STAT_ICON = { light: IC.sun, water: IC.drop, links: IC.web,
  shelter: sv('<path d="M3.2 11.6L12 4l8.8 7.6" stroke="currentColor" stroke-width="2.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.6 10.4V20h12.8v-9.6" fill="currentColor"/><path d="M10 20v-5.2a2 2 0 0 1 4 0V20" fill="#fff" fill-opacity=".75"/>') };

// the curtain of a part that is still closed (two drapes on a rod: nothing that reads as a cross or a padlock)
export const IC_CURTAIN = sv('<path d="M3 3.5h18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M4.5 4.5h6c-.3 5.6-2.2 11.3-6 15.5zM19.5 4.5h-6c.3 5.6 2.2 11.3 6 15.5z" fill="currentColor"/>');
