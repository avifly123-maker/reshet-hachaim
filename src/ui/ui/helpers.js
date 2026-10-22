// Small helpers of the overlay UI: esc (HTML escaping, exported by ui.js to many files), clamp01, h (make an element),
// hashStr / rngOf (seeded randomness for the drawings), hexRgb / mix (colours), fmt (Hebrew number format), the
// relation and layer colours, the season icons, the loading tips, and thumbHTML (a card's picture or a tinted disc).
// Exports: esc, clamp01, h, hashStr, rngOf, hexRgb, mix, fmt, ANIMAL_KINDS, TYPE_COLORS, typeColor, SEASON_ICON,
// LAYER_TINT, DEFAULT_TIPS, thumbHTML.
import { icon } from './icons.js';

/* ------------------------------------------------------------------ helpers */
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const clamp01 = (x) => Math.max(0, Math.min(1, +x || 0));
export function h(tag, cls, html, parent) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}
export function hashStr(s) { let x = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
export function rngOf(seed) {
  let a = seed >>> 0 || 1;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function hexRgb(c) {
  c = String(c || '#888').trim();
  if (c[0] === '#') { c = c.slice(1); if (c.length === 3) c = c.split('').map((x) => x + x).join(''); const n = parseInt(c.slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const m = c.match(/\d+(\.\d+)?/g); return m ? m.slice(0, 3).map(Number) : [136, 136, 136];
}
export function mix(a, b, t) { const A = hexRgb(a), B = hexRgb(b); return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',') + ')'; }
export const fmt = (n) => Math.round(n).toLocaleString('he-IL');

export const ANIMAL_KINDS = new Set(['animal', 'colony', 'swarm']);
export const TYPE_COLORS = {
  pollinates: '#ec8cc4', disperses: '#f2a541', home: '#d29a5c', shelter: '#5cc2b2',
  decomposes: '#ab90dc', partner: '#f0d055', climbs: '#8fd067', eats: '#ec6a58',
};
export const typeColor = (t) => TYPE_COLORS[t] || '#9fc7a0';
export const SEASON_ICON = { winter: 'drop', spring: 'flower', summer: 'sun', autumn: 'autumn' };
export const LAYER_TINT = {
  all: '#5d8f52', emergent: '#a8cf7a', canopy: '#6aa84f', understory: '#46803f', shrubs: '#5f8a3e',
  floor: '#7a5636', ground: '#7a5636', water: '#3f86a8', air: '#9ccbe6', sky: '#9ccbe6', nursery: '#e889a8',
};
export const DEFAULT_TIPS = [
  'כל צמח וכל בעל חיים בטבע קשורים זה לזה – זאת רשת החיים.',
  'עצים גבוהים מסתירים את האור. צמחים קטנים צריכים פתח של שמש.',
  'דבורים ופרפרים עוברים מפרח לפרח, וכך הפרחים יכולים להפוך לפירות.',
  'ציפורים שאוכלות פירות מפזרות את הזרעים למקומות חדשים.',
  'פטריות מפרקות עלים ועצים שנפלו ומחזירות את המזון לאדמה.',
  'יער עם הרבה מינים שונים חזק יותר ומתאושש מהר יותר.',
];

/* placeholder thumb when no dataURL is given: a tinted disc with a glyph */
export function thumbHTML(thumb, color, kind, cls = 'thumb') {
  if (thumb) return `<span class="${cls}" style="--c:${esc(color || '#6a9')}"><img src="${esc(thumb)}" alt="" draggable="false"></span>`;
  const g = ANIMAL_KINDS.has(kind) ? 'paw' : kind === 'fungus' ? 'sprout' : 'leaf';
  return `<span class="${cls} ph" style="--c:${esc(color || '#6a9')}">${icon(g)}</span>`;
}
