// רשת החיים – DOM overlay UI (RTL Hebrew). Plain DOM + CSS, no frameworks, no network.
// export function createUI(root, bus) → ui   (core → UI: methods;  UI → core: bus.emit)
import { artPos } from '../data/art-focus.js';
import { TORAH, sourcesOn, setSourcesOn, EDITION_NAME } from '../core/edition.js';
import { ISLAND_ART } from '../data/island-art.js';
import { CARD_ART } from '../data/card-art.js';
import { badgesFor } from '../data/badges.js';
import { badgeHTML } from './badge-art.js';
import { avatarHTML, avatarName, AVATAR_IDS } from './avatars.js';
import { zoneWord } from '../core/place.js';
import { HUB_ICONS, tileIcon } from './icons-hub.js';   // the learning hub's icons: icon() draws them too
// 1.3.2 start screen (מסע החוקר): veils, the journey bar, the map and the settings sheet
import * as JR from '../core/journey.js';
import { openJourneyMap, stageEmblem, mapIcon, STAGE_COLOR, lockWords, lockTip } from './journey-map.js';
import { openSettings } from './settings.js';

/* ------------------------------------------------------------------ helpers */
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp01 = (x) => Math.max(0, Math.min(1, +x || 0));
function h(tag, cls, html, parent) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}
function hashStr(s) { let x = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
function rngOf(seed) {
  let a = seed >>> 0 || 1;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function hexRgb(c) {
  c = String(c || '#888').trim();
  if (c[0] === '#') { c = c.slice(1); if (c.length === 3) c = c.split('').map((x) => x + x).join(''); const n = parseInt(c.slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const m = c.match(/\d+(\.\d+)?/g); return m ? m.slice(0, 3).map(Number) : [136, 136, 136];
}
function mix(a, b, t) { const A = hexRgb(a), B = hexRgb(b); return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',') + ')'; }
const fmt = (n) => Math.round(n).toLocaleString('he-IL');

/* ------------------------------------------------------------------ icons (hand-drawn inline SVG) */
const I = {
  // two-tone "ink stamp" icons: a soft fill (class f) under a hand-weight outline
  leaf: '<path class="f" d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15z"/><path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15z"/><path d="M5 19c3-5 6-8 10-10"/>',
  sprout: '<path class="f" d="M12 12C12 8 9 6 5 6c0 4 3 6 7 6zM12 10c0-4 3-6 7-6 0 4-3 6-7 6z"/><path d="M12 21v-9"/><path d="M12 12C12 8 9 6 5 6c0 4 3 6 7 6z"/><path d="M12 10c0-4 3-6 7-6 0 4-3 6-7 6z"/><path d="M8 21h8"/>',
  paw: '<circle cx="6.5" cy="10" r="1.9"/><circle cx="10" cy="6" r="1.9"/><circle cx="14.5" cy="6" r="1.9"/><circle cx="18" cy="10" r="1.9"/><path class="f" d="M12.2 11.5c-2.8 0-5.2 3.1-5.2 5.4 0 1.5 1.2 2.3 2.5 2.3 1 0 1.7-.6 2.7-.6s1.7.6 2.7.6c1.3 0 2.5-.8 2.5-2.3 0-2.3-2.4-5.4-5.2-5.4z"/><path d="M12.2 11.5c-2.8 0-5.2 3.1-5.2 5.4 0 1.5 1.2 2.3 2.5 2.3 1 0 1.7-.6 2.7-.6s1.7.6 2.7.6c1.3 0 2.5-.8 2.5-2.3 0-2.3-2.4-5.4-5.2-5.4z"/>',
  web: '<circle class="f" cx="12" cy="13" r="4.6"/><circle cx="12" cy="13" r="2"/><circle cx="12" cy="3.8" r="1.6"/><circle cx="4" cy="18.6" r="1.6"/><circle cx="20" cy="18.6" r="1.6"/><path d="M12 5.4V11M5.4 17.8l4.9-3.4M18.6 17.8l-4.9-3.4M10.6 4.6L4.8 17.2M13.4 4.6l5.8 12.6M5.6 18.8h12.8"/>',
  lock: '<rect class="f" x="5" y="11" width="14" height="9.5" rx="2.2"/><rect x="5" y="11" width="14" height="9.5" rx="2.2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  pause: '<path d="M9 6v12M15 6v12" stroke-width="2.8"/>',
  play: '<path d="M8 5.5l11 6.5-11 6.5z" fill="currentColor"/>',
  fast: '<path d="M3.5 6l8 6-8 6zM12 6l8 6-8 6z" fill="currentColor"/>',
  sun: '<circle class="f" cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
  moon: '<path class="f" d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.3 6.3 0 0 0 10 10z"/><path d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.3 6.3 0 0 0 10 10z"/>',
  // field notebook with an elastic band
  book: '<path class="f" d="M6 3.5h11a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H6z"/><path d="M6 3.5h11a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H6z"/><path d="M6 3.5v17M4.5 7.5H7.5M4.5 12H7.5M4.5 16.5H7.5"/><path d="M15 3.5v17" stroke-width="2.4"/>',
  help: '<circle class="f" cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="9"/><path d="M9.5 9.6a2.6 2.6 0 1 1 3.7 2.3c-.8.4-1.2 1-1.2 1.8v.4"/><circle cx="12" cy="17.2" r=".7" fill="currentColor"/>',
  // a little forest hut instead of a generic house
  home: '<path class="f" d="M6 10.5l6-6 6 6V20H6z"/><path d="M3 12.5L12 4l9 8.5"/><path d="M6 10.5V20h12v-9.5"/><path d="M10 20v-5h4v5"/><path d="M15.5 6.5V4h2v4.3"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/>',
  sound: '<path class="f" d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9.2a4 4 0 0 1 0 5.6M18 6.8a7.4 7.4 0 0 1 0 10.4"/>',
  mute: '<path class="f" d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 12h5"/>',
  // background music: two beamed notes; off = one note and a bar (like mute: no slash across a stem)
  music: '<ellipse class="f" cx="7" cy="17.5" rx="2.8" ry="2.2"/><ellipse class="f" cx="17" cy="15.5" rx="2.8" ry="2.2"/><ellipse cx="7" cy="17.5" rx="2.8" ry="2.2"/><ellipse cx="17" cy="15.5" rx="2.8" ry="2.2"/><path d="M9.8 17.3V6.2l10-2.2v11.3"/>',
  musicOff: '<ellipse class="f" cx="7" cy="17.5" rx="2.8" ry="2.2"/><ellipse cx="7" cy="17.5" rx="2.8" ry="2.2"/><path d="M9.8 17.3V5c1.2 2.4 4.5 3 4.5 6"/><path d="M16 14.5h5"/>',
  lightmap: '<circle class="f" cx="12" cy="7" r="2.6"/><circle cx="12" cy="7" r="2.6"/><path d="M12 1.8v1.3M7.4 3.4l.9.9M16.6 3.4l-.9.9M6 7h1.2M16.8 7H18"/><path class="f" d="M2.5 15.5L12 12l9.5 3.5L12 19z"/><path d="M2.5 15.5L12 12l9.5 3.5L12 19z"/><path d="M5.5 15.5h13"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/>',
  close: '<circle cx="12" cy="12" r="8"/><path d="M8.2 12h7.6"/>',   // no X anywhere: a circle with a bar
  binoc: '<circle class="f" cx="6.5" cy="15.5" r="3.8"/><circle class="f" cx="17.5" cy="15.5" r="3.8"/><circle cx="6.5" cy="15.5" r="3.8"/><circle cx="17.5" cy="15.5" r="3.8"/><path d="M4 12.5L6.2 5h3l.8 7M20 12.5L17.8 5h-3l-.8 7M10.3 15h3.4"/>',
  flask: '<path class="f" d="M7.2 15h9.6l2.6 3.4A1.8 1.8 0 0 1 17.8 21H6.2a1.8 1.8 0 0 1-1.6-2.6z"/><path d="M9 3h6M10 3v6.2L4.6 18.4A1.8 1.8 0 0 0 6.2 21h11.6a1.8 1.8 0 0 0 1.6-2.6L14 9.2V3"/><path d="M7.2 15h9.6"/>',
  sparkle: '<path d="M12.0 3.1 L14.4 9.3 L21.0 9.7 L15.9 13.9 L17.6 20.3 L12.0 16.7 L6.4 20.3 L8.1 13.9 L3.0 9.7 L9.6 9.3z" fill="currentColor" stroke="none" stroke-linejoin="round"/>',   // a five-point star (a four-point sparkle looks like a cross)
  drop: '<path class="f" d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
  flower: '<circle cx="12" cy="12" r="2.3" fill="currentColor"/><circle class="f" cx="12" cy="6.3" r="2.6"/><circle class="f" cx="17.4" cy="10.2" r="2.6"/><circle class="f" cx="15.3" cy="16.6" r="2.6"/><circle class="f" cx="8.7" cy="16.6" r="2.6"/><circle class="f" cx="6.6" cy="10.2" r="2.6"/><circle cx="12" cy="6.3" r="2.6"/><circle cx="17.4" cy="10.2" r="2.6"/><circle cx="15.3" cy="16.6" r="2.6"/><circle cx="8.7" cy="16.6" r="2.6"/><circle cx="6.6" cy="10.2" r="2.6"/>',
  autumn: '<path class="f" d="M12 16l-6-2 1.5-2-3-3 3.5-.5L7 5l3.5 1.5L12 3l1.5 3.5L17 5l-1 3.5 3.5.5-3 3 1.5 2z"/><path d="M12 21v-5"/><path d="M12 16l-6-2 1.5-2-3-3 3.5-.5L7 5l3.5 1.5L12 3l1.5 3.5L17 5l-1 3.5 3.5.5-3 3 1.5 2z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5" stroke-width="2.6"/>',
  // a seed packet being sealed: "save the forest"
  save: '<path class="f" d="M6 3.5h12V20.5H6z"/><path d="M6 3.5h12v17H6z"/><path d="M6 7.5h12"/><path d="M12 11c-2.2 1.2-2.6 3.8-1 5.6 2.4-.4 3.4-2.6 2.6-5 .2 1.6-.4 3-1.6 3.8"/>',
  tree: '<path class="f" d="M12 3C8 3 5 5.8 5 9.3S8 15 12 15s7-2.2 7-5.7S16 3 12 3z"/><path d="M12 21.5V15"/><path d="M12 3C8 3 5 5.8 5 9.3S8 15 12 15s7-2.2 7-5.7S16 3 12 3z"/><path d="M9 21.5h6"/>',
  chevron: '<path d="M8 10l4 4 4-4"/>',
  bulb: '<path class="f" d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
  arrowL: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  search: '<circle class="f" cx="10.5" cy="10.5" r="6"/><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/>',
  cards: '<rect class="f" x="8" y="4" width="11" height="15" rx="2"/><rect x="8" y="4" width="11" height="15" rx="2"/><path d="M5.5 7.5v11a2 2 0 0 0 2 2h8"/>',
  versus: '<rect class="f" x="3" y="5" width="8" height="12" rx="1.6" transform="rotate(-8 7 11)"/><rect x="3" y="5" width="8" height="12" rx="1.6" transform="rotate(-8 7 11)"/><rect x="13" y="7" width="8" height="12" rx="1.6" transform="rotate(8 17 13)"/>',
  undo: '<path d="M9 7L4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 0 12h-2" transform="translate(0 -6)"/>',
  bang: '<path d="M12 6v8" stroke-width="2.6"/><circle cx="12" cy="18" r="1.3" fill="currentColor" stroke="none"/>',
  hourglass: '<circle cx="12" cy="13" r="8"/><path d="M12 8.5V13l3 2M9.5 2.5h5"/>',
  pencil: '<path class="f" d="M5 16.5L15.8 5.7l2.5 2.5L7.5 19H5z"/><path d="M5 16.5L15.8 5.7l2.5 2.5L7.5 19H5z"/><path d="M13.8 7.7l2.5 2.5"/>',
  plus: '<path d="M12 5v7.5M5 12.5h14" stroke-width="2.4"/>',   // the plus of the children's schools: the stem stops at the bar
  trash: '<path d="M5 7h14"/><path d="M9.5 7V5h5v2"/><path class="f" d="M6.5 7l1 12.5h9l1-12.5"/><path d="M6.5 7l1 12.5h9l1-12.5"/><path d="M10.3 10.5v6M13.7 10.5v6"/>',
  // the naturalist's satchel: the game menu
  satchel: '<path class="f" d="M4 9h16v10.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5z"/><path d="M4 9h16v10.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5z"/><path d="M4 9l2-4h12l2 4"/><path d="M9.5 9v4.2a2.5 2.5 0 0 0 5 0V9"/><circle cx="12" cy="13.3" r=".8" fill="currentColor"/>',
  info: '<circle class="f" cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r=".9" fill="currentColor"/>',
  quality: '<path class="f" d="M3 18l5.5-8 4 5.5 2.5-3.5L21 18z"/><path d="M3 18l5.5-8 4 5.5 2.5-3.5L21 18z"/><circle cx="16.5" cy="6.5" r="2"/>',
};
export const icon = (n, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${I[n] || HUB_ICONS[n] || ''}</svg>`;

const ANIMAL_KINDS = new Set(['animal', 'colony', 'swarm']);
const TYPE_COLORS = {
  pollinates: '#ec8cc4', disperses: '#f2a541', home: '#d29a5c', shelter: '#5cc2b2',
  decomposes: '#ab90dc', partner: '#f0d055', climbs: '#8fd067', eats: '#ec6a58',
};
const typeColor = (t) => TYPE_COLORS[t] || '#9fc7a0';
const SEASON_ICON = { winter: 'drop', spring: 'flower', summer: 'sun', autumn: 'autumn' };
const LAYER_TINT = {
  all: '#5d8f52', emergent: '#a8cf7a', canopy: '#6aa84f', understory: '#46803f', shrubs: '#5f8a3e',
  floor: '#7a5636', ground: '#7a5636', water: '#3f86a8', air: '#9ccbe6', sky: '#9ccbe6', nursery: '#e889a8',
};
const DEFAULT_TIPS = [
  'כל צמח וכל בעל חיים בטבע קשורים זה לזה – זאת רשת החיים.',
  'עצים גבוהים מסתירים את האור. צמחים קטנים צריכים פתח של שמש.',
  'דבורים ופרפרים עוברים מפרח לפרח, וכך הפרחים יכולים להפוך לפירות.',
  'ציפורים שאוכלות פירות מפזרות את הזרעים למקומות חדשים.',
  'פטריות מפרקות עלים ועצים שנפלו ומחזירות את המזון לאדמה.',
  'יער עם הרבה מינים שונים חזק יותר ומתאושש מהר יותר.',
];

/* placeholder thumb when no dataURL is given: a tinted disc with a glyph */
function thumbHTML(thumb, color, kind, cls = 'thumb') {
  if (thumb) return `<span class="${cls}" style="--c:${esc(color || '#6a9')}"><img src="${esc(thumb)}" alt="" draggable="false"></span>`;
  const g = ANIMAL_KINDS.has(kind) ? 'paw' : kind === 'fungus' ? 'sprout' : 'leaf';
  return `<span class="${cls} ph" style="--c:${esc(color || '#6a9')}">${icon(g)}</span>`;
}

/* web-of-life emblem: seven nodes woven together around a leaf */
function emblem(size = 120, cls = 'emblem') {
  const n = 7, R = 42, pts = [];
  for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; pts.push([60 + R * Math.cos(a), 60 + R * Math.sin(a)]); }
  let lines = '';
  for (let i = 0; i < n; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 3) % n], [x3, y3] = pts[(i + 1) % n];
    lines += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} Q60 60 ${x2.toFixed(1)} ${y2.toFixed(1)}" class="em-w"/>`;
    lines += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} Q${(60 + (x1 + x3 - 120) * 0.62).toFixed(1)} ${(60 + (y1 + y3 - 120) * 0.62).toFixed(1)} ${x3.toFixed(1)} ${y3.toFixed(1)}" class="em-r"/>`;
  }
  const cols = ['#9fd36f', '#f0b44c', '#7cc4b4', '#e98bc4', '#9fd36f', '#f0d055', '#d29a5c'];
  const nodes = pts.map(([x, y], i) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.2" fill="${cols[i]}" class="em-n"/>`).join('');
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true">
    <circle cx="60" cy="60" r="54" class="em-ring"/>${lines}
    <path d="M60 76c-9-4-12-12-9-22 4-9 11-12 18-13-1 9-2 17-6 24-1 4-2 7-3 11z" fill="#8fd067"/>
    <path d="M60 76c1-9 3-17 8-25" stroke="#2f5a2a" stroke-width="1.6" fill="none" stroke-linecap="round"/>${nodes}</svg>`;
}

/* painted biome illustration (layered silhouettes from palette) */
function biomeArt(b) {
  const pal = b.palette && b.palette.length ? b.palette : ['#1d4a2c', '#4f8f3e', '#f2c14e'];
  const [c1, c2, c3] = [pal[0], pal[1] || pal[0], pal[2] || '#f2c14e'];
  const rnd = rngOf(hashStr(b.id || 'x'));
  const W = 400, H = 230;
  const sky1 = mix(c3, '#fff8e6', 0.45), sky2 = mix(c2, '#dff0e0', 0.62);
  const ridge = (y0, amp, step, col, op = 1) => {
    let d = `M0 ${H} L0 ${y0}`; let x = 0;
    while (x < W) { const nx = Math.min(W, x + step * (0.7 + rnd() * 0.6)); const cy = y0 - amp * (0.4 + rnd()); d += ` Q${((x + nx) / 2).toFixed(1)} ${cy.toFixed(1)} ${nx.toFixed(1)} ${(y0 + (rnd() - 0.5) * amp * 0.3).toFixed(1)}`; x = nx; }
    return `<path d="${d} L${W} ${H} Z" fill="${col}" opacity="${op}"/>`;
  };
  const crown = (x, y, r, col, k = 5) => { let s = ''; for (let i = 0; i < k; i++) s += `<circle cx="${(x + (rnd() - 0.5) * r * 1.6).toFixed(1)}" cy="${(y + (rnd() - 0.5) * r * 0.7).toFixed(1)}" r="${(r * (0.55 + rnd() * 0.4)).toFixed(1)}" fill="${col}"/>`; return s; };
  const umbrella = (x, base, top, w, col) => `<path d="M${x} ${base} L${x - 1.5} ${top + 4} L${x + 1.5} ${top + 4} Z" fill="${col}"/><path d="M${x - 2} ${top + 10} q-8 -6 -14 -8 M${x + 2} ${top + 12} q8 -6 14 -9" stroke="${col}" stroke-width="2" fill="none"/>` +
    `<ellipse cx="${x}" cy="${top}" rx="${w}" ry="${w * 0.28}" fill="${col}"/>` + crown(x, top - 4, w * 0.45, col, 4);
  const palm = (x, base, hgt, col) => {
    let s = `<path d="M${x} ${base} Q${x + 6} ${base - hgt / 2} ${x + 2} ${base - hgt}" stroke="${col}" stroke-width="3.2" fill="none"/>`;
    const tx = x + 2, ty = base - hgt;
    for (let i = 0; i < 7; i++) { const a = Math.PI + (i / 6) * Math.PI; const L = 20 + rnd() * 8; const ex = tx + Math.cos(a) * L, ey = ty + Math.sin(a) * L * 0.5 + 8; s += `<path d="M${tx} ${ty} Q${((tx + ex) / 2).toFixed(1)} ${(ty - 8).toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" stroke="${col}" stroke-width="3" fill="none"/>`; }
    return s;
  };
  let art = `<defs><linearGradient id="sk-${esc(b.id)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky1}"/><stop offset="1" stop-color="${sky2}"/></linearGradient>
    <radialGradient id="sg-${esc(b.id)}"><stop offset="0" stop-color="${c3}" stop-opacity=".85"/><stop offset="1" stop-color="${c3}" stop-opacity="0"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#sk-${esc(b.id)})"/>
    <circle cx="300" cy="62" r="70" fill="url(#sg-${esc(b.id)})"/><circle cx="300" cy="62" r="22" fill="${mix(c3, '#fff', 0.35)}"/>`;
  const far = mix(c2, sky2, 0.55), mid = mix(c2, sky2, 0.22), near = c1;
  const birds = () => { let s = ''; for (let i = 0; i < 3; i++) { const x = 60 + rnd() * 160, y = 40 + rnd() * 40, w = 5 + rnd() * 3; s += `<path d="M${x - w} ${y} q${w / 2} -${w / 2} ${w} 0 q${w / 2} -${w / 2} ${w} 0" stroke="${mix(c1, sky1, 0.3)}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`; } return s; };
  if (/grove|חורש|med/i.test(b.id)) {
    art += `<g class="ba-far">${ridge(150, 40, 110, far)}</g>`;
    let trees = '';
    for (let i = 0; i < 9; i++) { const x = 15 + i * 46 + rnd() * 20; trees += crown(x, 150 + rnd() * 10, 13 + rnd() * 6, mid, 6); }
    trees += `<path d="M320 175 L321 110" stroke="${mid}" stroke-width="3"/>` + crown(318, 104, 16, mid, 5) + crown(334, 96, 12, mid, 4);
    art += `<g class="ba-mid">${ridge(168, 22, 90, mid)}${trees}</g>`;
    let rocks = '';
    for (let i = 0; i < 4; i++) { const x = 40 + rnd() * 320, y = 196 + rnd() * 14; rocks += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${(10 + rnd() * 12).toFixed(0)}" ry="${(5 + rnd() * 4).toFixed(0)}" fill="${mix('#e9dfc6', c2, 0.25)}"/>`; }
    let flowers = '';
    for (let i = 0; i < 26; i++) flowers += `<circle cx="${(rnd() * W).toFixed(0)}" cy="${(204 + rnd() * 24).toFixed(0)}" r="${(1.6 + rnd() * 1.6).toFixed(1)}" fill="${i % 3 ? '#e4473b' : '#f6e9f0'}"/>`;
    art += `<g class="ba-near">${ridge(198, 14, 70, near)}${rocks}${crown(40, 196, 20, near, 7)}${crown(372, 190, 24, near, 7)}${flowers}</g>` + birds();
  } else if (/reef/.test(b.id)) {
    // the reef: a band of sea surface, the blue water below with light rays, coral heads and a few fish
    art += `<rect y="96" width="${W}" height="${H - 96}" fill="${mix('#1f86b0', c1, 0.25)}"/><rect y="96" width="${W}" height="10" fill="#bfeaf5" opacity=".7"/>`;
    for (let i = 0; i < 5; i++) { const x = 30 + i * 85 + rnd() * 20; art += `<path d="M${x} 106 L${x + 26} 106 L${x + 60} ${H} L${x + 10} ${H} Z" fill="#e8fbff" opacity=".12"/>`; }
    let reef = '';
    for (let i = 0; i < 7; i++) { const x = 20 + i * 60 + rnd() * 20, y = 200 + rnd() * 16, r = 16 + rnd() * 14; reef += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${r.toFixed(0)}" ry="${(r * 0.7).toFixed(0)}" fill="${['#e8a0b4', '#c9b46a', '#9fc27a', '#c7a3d9'][i % 4]}"/>`; }
    for (let i = 0; i < 4; i++) { const x = 50 + rnd() * 300; reef += `<path d="M${x} 214 l0 -28 m0 10 l-10 -14 m10 6 l12 -16" stroke="#d9603a" stroke-width="3" fill="none" stroke-linecap="round"/>`; }
    let fish = '';
    for (let i = 0; i < 6; i++) { const x = 40 + rnd() * 320, y = 130 + rnd() * 60, sz = 6 + rnd() * 5; fish += `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)})"><ellipse rx="${sz.toFixed(1)}" ry="${(sz * 0.55).toFixed(1)}" fill="${i % 2 ? '#f08a24' : '#f2d04a'}"/><path d="M${sz.toFixed(1)} 0 l${(sz * 0.7).toFixed(1)} -${(sz * 0.5).toFixed(1)} l0 ${sz.toFixed(1)} z" fill="${i % 2 ? '#f08a24' : '#f2d04a'}"/></g>`; }
    art += `<path d="M0 ${H} L0 212 C80 204 160 214 240 208 S360 204 400 210 L400 ${H} Z" fill="#efe2bf"/>` + `<g class="ba-near">${reef}</g>` + `<g class="ba-mid">${fish}</g>`;
  } else {
    art += `<g class="ba-far">${ridge(140, 26, 60, far)}${umbrella(90, 150, 64, 34, far)}${umbrella(250, 150, 52, 40, far)}</g>`;
    let canopy = ''; for (let i = 0; i < 12; i++) canopy += crown(i * 36 + rnd() * 10, 150 + rnd() * 14, 18 + rnd() * 6, mid, 5);
    art += `<g class="ba-mid">${ridge(160, 18, 50, mid)}${canopy}${umbrella(175, 170, 82, 36, mid)}</g>`;
    art += `<path d="M150 ${H} C190 214 230 212 270 200 S360 192 400 196 L400 206 C350 204 300 214 260 222 S200 ${H} 190 ${H} Z" fill="${mix('#cfeaf2', c2, 0.25)}" opacity=".85"/>`;
    art += `<g class="ba-near">${ridge(206, 10, 50, near)}${palm(28, 220, 92, near)}${palm(368, 226, 104, near)}${crown(70, 214, 18, near, 6)}${crown(330, 214, 16, near, 6)}</g>` + birds();
  }
  return `<svg class="biome-art" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${art}</svg>`;
}

/* day-dial colours */
function skyColor(f) {
  const e = -Math.cos(f * Math.PI * 2); // 1 noon, -1 midnight
  const dawn = f < 0.5 ? '#f49a5e' : '#e9796b';
  if (e > 0.25) return mix(dawn, '#86c6ee', Math.min(1, (e - 0.25) / 0.35));
  if (e > -0.15) return mix('#1c2b58', dawn, (e + 0.15) / 0.4);
  return mix('#0c1530', '#1c2b58', Math.max(0, (e + 1) / 0.85));
}
function partOfDay(f) {
  if (f < 0.2 || f >= 0.83) return 'לילה';
  if (f < 0.3) return 'זריחה';
  if (f < 0.44) return 'בוקר';
  if (f < 0.58) return 'צהריים';
  if (f < 0.7) return 'אחר הצהריים';
  return 'שקיעה';
}

/* layered canopy silhouettes for the start screen (top: hanging leaves and vines, bottom: ferns) */
function leafPath(x, y, L, w, rot) {
  return `<path transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)})" d="M0 0C${w} ${(-L * 0.3).toFixed(1)} ${(w * 0.6).toFixed(1)} ${(-L * 0.8).toFixed(1)} 0 ${-L}C${(-w * 0.6).toFixed(1)} ${(-L * 0.8).toFixed(1)} ${-w} ${(-L * 0.3).toFixed(1)} 0 0Z"/>`;
}
function canopySVG(where) {
  const r = rngOf(where === 'top' ? 77 : 1234), W = 1600;
  if (where === 'top') {
    const H = 260; let far = `M0 0H${W}V60`;
    for (let x = W; x > 0; x -= 70 + r() * 60) far += ` Q${(x - 40).toFixed(0)} ${(120 + r() * 90).toFixed(0)} ${(x - 90).toFixed(0)} ${(60 + r() * 40).toFixed(0)}`;
    far += ' V0Z';
    let mid = '', near = '', vines = '';
    for (let i = 0; i < 70; i++) { const x = r() * W, y = r() * 70; mid += leafPath(x, y, 60 + r() * 50, 16 + r() * 12, 150 + r() * 60); }
    for (let i = 0; i < 46; i++) { const x = r() * W, y = r() * 34; near += leafPath(x, y, 40 + r() * 46, 12 + r() * 10, 140 + r() * 80); }
    for (let i = 0; i < 9; i++) {
      const x = 60 + r() * (W - 120), len = 120 + r() * 110, sway = (r() - 0.5) * 40;
      vines += `<path d="M${x.toFixed(0)} 0Q${(x + sway).toFixed(0)} ${(len / 2).toFixed(0)} ${(x - sway / 2).toFixed(0)} ${len.toFixed(0)}" fill="none" stroke="currentColor" stroke-width="2.4"/>`;
      for (let k = 1; k < 6; k++) { const t = k / 6, vx = x + sway * Math.sin(t * Math.PI) * 0.6, vy = len * t; vines += leafPath(vx, vy, 12 + r() * 8, 5, k % 2 ? 230 : 130); }
    }
    return `<svg class="st-canopy top" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
      <path class="cf" d="${far}"/><g class="cm">${mid}</g><g class="cn">${near}</g><g class="cv">${vines}</g></svg>`;
  }
  const H = 220; let mound = `M0 ${H}V150`;
  for (let x = 0; x < W; x += 90 + r() * 80) mound += ` Q${(x + 50).toFixed(0)} ${(110 + r() * 40).toFixed(0)} ${(x + 110).toFixed(0)} ${(145 + r() * 20).toFixed(0)}`;
  mound += ` V${H}Z`;
  let ferns = '';
  for (let i = 0; i < 26; i++) {
    const x = r() * W, h = 70 + r() * 110, lean = (r() - 0.5) * 90;
    const ex = x + lean, ey = H - h;
    ferns += `<path d="M${x.toFixed(0)} ${H}Q${(x + lean * 0.2).toFixed(0)} ${(H - h * 0.6).toFixed(0)} ${ex.toFixed(0)} ${ey.toFixed(0)}" fill="none" stroke="currentColor" stroke-width="2.2"/>`;
    for (let k = 1; k < 9; k++) {
      const t = k / 9, px = x + lean * (0.2 * 2 * t * (1 - t) + t * t), py = H - h * (2 * t * (1 - t) * 0.6 + t * t), L = (1 - t * 0.8) * (14 + h * 0.08);
      ferns += leafPath(px, py, L, L * 0.28, -70 + lean * 0.1) + leafPath(px, py, L, L * 0.28, 70 + lean * 0.1);
    }
  }
  // a few small flowers in the undergrowth – soft rose, sun and lavender, never bright
  const FL = ['#d98fa0', '#e8c65e', '#a99ad2', '#e8a37a'];
  let flowers = '';
  for (let i = 0; i < 22; i++) {
    const x = r() * W, y = H - 6 - r() * 46, s = 3 + r() * 2.4, c = FL[i % FL.length];
    let petals = ''; for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + i; petals += `<circle cx="${(x + Math.cos(a) * s).toFixed(1)}" cy="${(y + Math.sin(a) * s).toFixed(1)}" r="${(s * 0.62).toFixed(1)}" fill="${c}"/>`; }
    flowers += `<path d="M${x.toFixed(1)} ${(y + s).toFixed(1)}V${H}" stroke="#08140d" stroke-width="1.6"/>${petals}<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(s * 0.45).toFixed(1)}" fill="#f4e7b0"/>`;
  }
  return `<svg class="st-canopy bottom" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><path class="cf" d="${mound}"/><g class="cn">${ferns}</g><g class="fl">${flowers}</g></svg>`;
}
/* honey-wax seal pressed with the web of life */
function waxSeal(size = 120) {
  const n = 18, R = 54; let d = '';
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2, a2 = ((i + 0.5) / n) * Math.PI * 2; const p = [60 + R * Math.cos(a), 60 + R * Math.sin(a)], q = [60 + (R + 5) * Math.cos(a2), 60 + (R + 5) * Math.sin(a2)]; d += (i ? ` Q${q[0].toFixed(1)} ${q[1].toFixed(1)} ` : `M`) + `${p[0].toFixed(1)} ${p[1].toFixed(1)}`; }
  const k = 7, pts = []; for (let i = 0; i < k; i++) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / k; pts.push([60 + 30 * Math.cos(a), 60 + 30 * Math.sin(a)]); }
  let lines = ''; for (let i = 0; i < k; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 3) % k], [x3, y3] = pts[(i + 1) % k]; lines += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)}Q60 60 ${x2.toFixed(1)} ${y2.toFixed(1)}M${x1.toFixed(1)} ${y1.toFixed(1)}L${x3.toFixed(1)} ${y3.toFixed(1)}"/>`; }
  return `<svg class="wax" width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true">
    <path d="${d}Z" class="wx-out"/><circle cx="60" cy="60" r="41" class="wx-in"/><circle cx="60" cy="60" r="36" class="wx-ring"/>
    <g class="wx-web">${lines}</g>${pts.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.6" class="wx-n"/>`).join('')}
    <path d="M60 72c-7-3-9-9-7-17 3-7 9-9 14-10-1 7-2 13-5 19l-2 8z" class="wx-leaf"/></svg>`;
}
/* hand-drawn vine flourish under the title */
const VINE = (() => { const r = rngOf(9); let leaves = ''; for (let i = 1; i < 12; i++) { const x = i * 30, y = 14 + Math.sin(i * 1.1) * 6; leaves += leafPath(x, y, 9 + r() * 5, 3.5, i % 2 ? -50 : 230); } return `<svg class="st-vine" viewBox="0 0 360 28" aria-hidden="true"><path d="M2 14C40 4 70 24 110 14S180 4 220 14 300 24 358 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><g fill="currentColor">${leaves}</g></svg>`; })();

/* ================================================================== createUI */
export function createUI(root, bus) {
  root.classList.add('wol');
  root.setAttribute('dir', 'rtl');
  root.setAttribute('lang', 'he');
  const emit = (n, p) => { try { bus && bus.emit(n, p); } catch (e) { console.error(e); } };

  const S = {
    tab: 'plants', layerFilter: 'all', cards: [], cardEls: new Map(), cardSig: new Map(),
    biome: null, speed: 1, lastSpeed: 1, hud: {}, shownPts: 0, ptsRaf: 0,
    press: null, drag: null, species: null, speciesSig: '', quiz: null, moreOpen: false,
    missionsSig: '', openMission: null, toggles: {}, tips: DEFAULT_TIPS.slice(), tipI: 0,
    coach: null, layers: [], activeLayer: 'all', trayCollapsed: false,
  };

  /* ---------------- regions */
  const hud = h('div', 'hud glass ui-in', null, root);
  const toolbar = h('div', 'toolbar ui-in', null, root);
  const rightCol = h('div', 'rightcol ui-in', null, root);
  const missions = h('section', 'missions glass', null, rightCol);
  h('div', 'rc-spacer', null, rightCol);
  const layersEl = h('nav', 'layers', null, rightCol);
  const tray = h('section', 'tray glass ui-in', null, root);
  const panel = h('aside', 'species paper', null, root);
  const toastsEl = h('div', 'toasts', null, root);
  const expEl = h('div', 'experiment', null, root);
  const hoverEl = h('div', 'hover', null, root);
  const ghost = h('div', 'ghost', null, root);
  const hintEl = h('div', 'drag-hint', null, root);
  const fxEl = h('div', 'fx', null, root);
  const coachRing = h('div', 'coach-ring', null, root);
  const coachEl = h('div', 'coach paper', null, root);
  const modalEl = h('div', 'modal-layer', null, root);
  const startEl = h('div', 'start', null, root);
  const loadEl = h('div', 'loading', null, root);

  /* ================================================================ LOADING */
  loadEl.innerHTML = `<div class="ld-inner">${emblem(150, 'emblem spin')}
    <h1 class="ld-title">רשת החיים</h1>
    <div class="ld-bar"><div class="ld-fill"><span class="ld-tip-leaf">${icon('leaf')}</span></div></div>
    <div class="ld-status"></div><p class="ld-tip"></p></div>`;
  const ldFill = loadEl.querySelector('.ld-fill'), ldStatus = loadEl.querySelector('.ld-status'), ldTip = loadEl.querySelector('.ld-tip');
  let tipTimer = 0;
  function rotateTip() {
    if (!S.tips.length) return;
    ldTip.classList.remove('show');
    setTimeout(() => { ldTip.textContent = S.tips[S.tipI++ % S.tips.length]; ldTip.classList.add('show'); }, 260);
  }

  /* ================================================================ START */
  // the start screen (1.3): three tabs – the game's environments (a carousel of the three islands, with the level),
  // the science centre (חוקרי הטבע and the lab of רובו־דע) and the learning hub
  function renderStart(biomes) {
    biomes = biomes || [];
    S.stTab = S.stTab || 'env';
    if (S.stCur == null || S.stCur >= biomes.length) S.stCur = 0;
    const isl = (id) => ISLAND_ART['c_' + id] || ISLAND_ART[id] || '';
    const fan = ['amazon:jaguar', 'grove:owl', 'reef:clownfish', 'amazon:toucan', 'reef:turtle'].map((k) => CARD_ART[k.split(':')[1]]).filter(Boolean).slice(0, 4);
    startEl.innerHTML = `<div class="st-bg">${canopySVG('top')}${canopySVG('bottom')}<i class="st-shaft s1"></i><i class="st-shaft s2"></i><i class="st-tint"></i></div>
      ${S.logo ? `<div class="st-logo"><img src="${S.logo}" alt="בבא דע"></div>` : ''}
      <div class="st-corner"><div class="st-corner-row"><button class="st-who" aria-haspopup="dialog" aria-expanded="false" hidden></button>
        <button class="st-gear" aria-haspopup="dialog" aria-label="הגדרות" title="הגדרות">${icon('sliders')}</button></div>
        <button class="st-jbar" data-part="journey" aria-haspopup="dialog"></button></div>
      <div class="st-pp-layer" hidden><div class="st-pp-scrim"></div><div class="st-pp paper" role="dialog" aria-modal="true" aria-label="מי משחק?"></div></div>
      <div class="st-inner v13">
      <header class="st-head"><div class="st-seal">${waxSeal(124)}</div>
        <div class="st-titles"><h1 class="st-title">רשת החיים</h1>${EDITION_NAME ? `<span class="st-edition">${EDITION_NAME}</span>` : ''}${VINE}<p class="st-sub">בונים יער חי, מגלים מי צריך את מי</p></div></header>
      <nav class="st-tabs" role="tablist">
        <button role="tab" data-tab="env">${icon('leaf')}<span><b>סביבות משחק</b><small>אמזונס, חורש ושונית</small></span></button>
        <button role="tab" data-tab="sci" data-research-tab="1" data-part="science">${icon('flask')}<span><b>המרכז המדעי</b><small>חוקרי הטבע ומעבדת רובו־דע</small><small class="jv-note"></small></span></button>
        <button role="tab" data-tab="learn" data-part="learn">${icon('book')}<span><b>מרכז הלמידה</b><small>חידון, אלבום ומשחקי קלפים</small><small class="jv-note"></small></span></button>
      </nav>
      <section class="st-pane" data-pane="env">
        <div class="st-modes" role="radiogroup" aria-label="רמת משחק">
          <button data-mode="kids" role="radio">${icon('sprout')}<span><b>מתחילים</b><small>מעט מינים, משימות קצרות</small></span></button>
          <button data-mode="full" role="radio">${icon('web')}<span><b>מתקדמים</b><small>כל המינים, אירועים וטכנולוגיה</small></span></button>
        </div>
        <div class="st-car" aria-roledescription="קרוסלה">
          <button class="st-arrow prev" data-car="-1" aria-label="הסביבה הקודמת">${icon('arrowR')}</button>
          <div class="st-ring">${biomes.map((b, i) => `<button class="st-isl" data-i="${i}" data-id="${esc(b.id)}" data-part="zone:${esc(b.id)}" style="--zc:${(b.palette && b.palette[1]) || '#6a9'};--zc2:${(b.palette && b.palette[2]) || '#f0b44c'}" aria-label="${esc(b.name)}">
            <i class="st-glow"></i><img src="${isl(b.id)}" alt="" draggable="false"><i class="jv-curtain" aria-hidden="true"></i><span class="jv-note"></span></button>`).join('')}</div>
          <button class="st-arrow next" data-car="1" aria-label="הסביבה הבאה">${icon('arrowL')}</button>
        </div>
        <div class="st-info"></div>
        <div class="st-dots">${biomes.map((b, i) => `<button data-dot="${i}" aria-label="${esc(b.name)}"></button>`).join('')}</div>
      </section>
      <section class="st-pane" data-pane="sci">
        <div class="st-big2">
          <button class="st-panel" data-research="1" data-part="research"><span class="st-pimg rs">${biomes.slice(0, 3).map((b) => `<img src="${isl(b.id)}" alt="" draggable="false">`).join('')}<i class="st-lens">${icon('search')}</i><i class="jv-curtain" aria-hidden="true"></i></span>
            <span class="st-ptext"><b>חוקרי הטבע</b><small>תעלומות בטבע: מודדים, משערים, מנסים ומאזנים. שלוש רמות, משלוש הסביבות.</small><em>${icon('arrowL')}לתעלומות</em><em class="jv-note"></em></span></button>
          <button class="st-panel" data-lab="1" data-part="lab"><span class="st-pimg lab">${ISLAND_ART.lab ? `<img src="${ISLAND_ART.lab}" alt="" draggable="false">` : ''}<i class="jv-curtain" aria-hidden="true"></i></span>
            <span class="st-ptext"><b>המעבדה של רובו־דע</b><small>מיקרוסקופ, שולחן ממציאים ואטלס. ממציאים בעזרת הטבע ומשדרגים את הכלים.</small><em>${icon('arrowL')}למעבדה</em><em class="jv-note"></em></span></button>
        </div>
      </section>
      <section class="st-pane" data-pane="learn">
        <div class="st-learnwrap">
          <div class="st-fan">${fan.map((src, i) => `<img src="${src}" alt="" draggable="false" style="--k:${i - (fan.length - 1) / 2}">`).join('')}</div>
          <div class="st-lgrid">
            <button data-learn="home" data-part="learn">${tileIcon('learn', 'st-lic')}<span><b>מרכז הלמידה</b><small>כל המשחקים במקום אחד</small><small class="jv-note"></small></span></button>
            <button data-learn="setup" data-part="quiz">${tileIcon('quiz', 'st-lic')}<span><b>חידון</b><small>שאלות על היער והשונית</small><small class="jv-note"></small></span></button>
            <button data-learn="album" data-part="album">${tileIcon('album', 'st-lic')}<span><b>אלבום הקלפים</b><small>חבילות, סדרות ואוסף</small><small class="jv-note"></small></span></button>
            <button data-learn="duel" data-part="duel">${tileIcon('strong', 'st-lic')}<span><b>מי חזק ברשת?</b><small>קלף מול קלף</small><small class="jv-note"></small></span></button>
            <button data-learn="keepforest" data-part="keepforest">${tileIcon('keep', 'st-lic')}<span><b>מחזיקים את היער</b><small>משחק קלפים ואירועים</small><small class="jv-note"></small></span></button>
            <button data-learn="webpuzzle" data-part="webpuzzle">${tileIcon('thread', 'st-lic')}<span><b>חוט הקשר</b><small>מחברים את הרשת</small><small class="jv-note"></small></span></button>
            <button data-learn="inventors" data-part="inventors">${tileIcon('invent', 'st-lic')}<span><b>הממציאים</b><small>פותרים בעיות בעזרת הטבע</small><small class="jv-note"></small></span></button>
            <button data-learn="expedition" data-part="expedition">${tileIcon('dive', 'st-lic')}<span><b>משלחת לעומק</b><small>צוללים עם הקלפים לשונית</small><small class="jv-note"></small></span></button>
            <button data-learn="badges" data-part="badges">${tileIcon('medal', 'st-lic')}<span><b>התגים שלי</b><small>תגים ומסגרות לקלפים</small><small class="jv-note"></small></span></button>
          </div>
        </div>
      </section>
      </div>`;
    const paintModes = () => startEl.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.mode === S.mode)));
    S.mode = S.mode || 'full';
    startEl.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { S.mode = b.dataset.mode; paintModes(); emit('start:mode', { mode: S.mode }); paintJourney(); paintInfo(); }));
    // 1.3.2: a veiled part (core/journey.js isOpen) stays in place, dimmed; a click lets רובו־דע say what opens it
    const veiled = (el) => !!(el && el.dataset.part && !JR.isOpen(el.dataset.part));
    const gate = (el, fn) => () => { if (veiled(el)) lockTip(el.dataset.part, { emit }); else fn(); };
    startEl.querySelectorAll('[data-learn]').forEach((b) => b.addEventListener('click', gate(b, () => emit('ui:learn', { screen: b.dataset.learn }))));
    const rsBtn = startEl.querySelector('[data-research]'), labBtn = startEl.querySelector('[data-lab]');
    rsBtn.addEventListener('click', gate(rsBtn, () => emit('ui:research')));
    labBtn.addEventListener('click', gate(labBtn, () => emit('ui:lab')));
    // tabs
    const paintTab = () => {
      startEl.querySelectorAll('[data-tab]').forEach((b) => { const on = b.dataset.tab === S.stTab; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
      startEl.querySelectorAll('[data-pane]').forEach((p) => p.classList.toggle('on', p.dataset.pane === S.stTab));
      startEl.dataset.tab = S.stTab;
    };
    // a veiled tab still opens (the child sees what waits there, veiled), and רובו־דע says when it opens
    startEl.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { if (S.stTab !== b.dataset.tab) { S.stTab = b.dataset.tab; paintTab(); emit('ui:click'); } if (veiled(b)) lockTip(b.dataset.part); }));
    // the carousel: the chosen island in front, the other two behind it on a slow ring
    const isls = [...startEl.querySelectorAll('.st-isl')], n = isls.length, info = startEl.querySelector('.st-info');
    // the carousel starts on an open island
    if (isls[S.stCur] && veiled(isls[S.stCur])) { const k = isls.findIndex((el) => !veiled(el)); if (k >= 0) S.stCur = k; }
    const paintInfo = () => {
      const b = biomes[S.stCur]; if (!b) return;
      const shut = veiled(isls[S.stCur]);
      info.style.setProperty('--zc', (b.palette && b.palette[0]) || '#2d5a35'); info.style.setProperty('--zc2', (b.palette && b.palette[2]) || '#f0b44c');
      info.innerHTML = `<div class="st-info-in" key="${S.stCur}"><h2>${esc(b.name)}</h2><p class="bc-sub">${esc(b.subtitle)}</p>
        <p class="bc-intro">${esc((S.mode === 'kids' && b.kidsIntro) ? b.kidsIntro : b.intro)}</p>
        ${shut ? `<button class="st-go jv" data-id="${esc(b.id)}">${icon('sprout')}<span>${esc(lockWords('zone:' + b.id))}</span></button>`
          : `<button class="st-go" data-id="${esc(b.id)}">${S.mode === 'kids' ? 'יוצאים לדרך · מתחילים' : 'יוצאים לדרך'}${icon('arrowL')}</button>`}</div>`;
      info.querySelector('.st-go').addEventListener('click', () => { if (veiled(isls[S.stCur])) lockTip('zone:' + b.id, { emit }); else emit('start:biome', { id: b.id }); });
      startEl.style.setProperty('--zc', (b.palette && b.palette[1]) || '#2d5a35');
      startEl.dataset.zone = b.id;   // the background takes the chosen environment's light and colours (style.css)
    };
    const paintCar = () => {
      isls.forEach((el, i) => {
        let k = ((i - S.stCur) % n + n) % n; if (k > n / 2) k -= n;   // -1 left, 0 front, 1 right
        el.dataset.k = String(k); el.tabIndex = k === 0 ? 0 : -1;
      });
      startEl.querySelectorAll('[data-dot]').forEach((d, i) => d.classList.toggle('on', i === S.stCur));
      paintInfo();
    };
    const turn = (d) => { S.stCur = ((S.stCur + d) % n + n) % n; paintCar(); emit('ui:click'); };
    startEl.querySelectorAll('[data-car]').forEach((b) => b.addEventListener('click', () => turn(+b.dataset.car)));
    startEl.querySelectorAll('[data-dot]').forEach((b) => b.addEventListener('click', () => { S.stCur = +b.dataset.dot; paintCar(); }));
    isls.forEach((el) => el.addEventListener('click', () => { const i = +el.dataset.i; if (i === S.stCur) { if (veiled(el)) lockTip(el.dataset.part, { emit }); else emit('start:biome', { id: biomes[i].id }); } else { S.stCur = i; paintCar(); emit('ui:click'); } }));
    // swipe / drag the ring
    const car = startEl.querySelector('.st-car'); let sx = null;
    car.addEventListener('pointerdown', (e) => { sx = e.clientX; });
    car.addEventListener('pointerup', (e) => { if (sx == null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 50) turn(dx > 0 ? 1 : -1); });
    // the start screen is drawn again after every visit: one listener at a time, or the arrows would jump several islands
    if (startEl._kd) startEl.removeEventListener('keydown', startEl._kd);
    startEl._kd = (e) => { if (S.stTab !== 'env' || e.target.closest('input,textarea')) return; if (e.key === 'ArrowLeft') turn(1); else if (e.key === 'ArrowRight') turn(-1); };
    startEl.addEventListener('keydown', startEl._kd);
    // ── מסע החוקר (1.3.2): veils on every part, the journey bar (opens the map), the settings gear
    const jbar = startEl.querySelector('.st-jbar');
    const jbarHTML = () => {
      const st = JR.state(), kids = st.kids, nx = st.next, c = STAGE_COLOR[st.stage];
      let need = '';
      if (nx) {   // the closest way to the next stage (the map lists all of them)
        const ways = (kids ? JR.STAGES[nx.stage - 1].kneed : JR.STAGES[nx.stage - 1].need) || [];
        let bi = 0, bp = -1; ways.forEach((w, i) => { const p = Math.min(...Object.keys(w).map((k) => Math.min(1, (st.metrics[k] || 0) / w[k]))); if (p > bp) { bp = p; bi = i; } });
        need = nx.need[bi] || nx.need[0] || '';
      } else need = kids ? 'הִגַּעְתֶּם לַשָּׁלָב הָאַחֲרוֹן!' : 'הגעתם לשלב האחרון!';
      jbar.style.setProperty('--c', c);
      jbar.setAttribute('aria-label', `${kids ? 'מַפַּת הַמַּסָּע' : 'מפת המסע'}: ${st.name}. ${need}`);
      return `<span class="jb-med">${stageEmblem(st.stage)}<i>${st.stage}</i></span>
        <span class="jb-txt"><small>${kids ? `שָׁלָב ${st.stage} מִתּוֹךְ 6` : `שלב ${st.stage} מתוך 6`}</small><b>${esc(st.name)}</b></span>
        <span class="jb-prog"><i style="width:${Math.round((nx ? nx.progress : 1) * 100)}%"></i></span>
        <small class="jb-need">${esc(need)}</small>${mapIcon('jb-map')}`;
    };
    const paintJourney = (moveOff) => {
      if (!startEl.contains(jbar)) return;
      // another player: the carousel turns to an island that is open for them
      if (moveOff === true && veiled(isls[S.stCur])) { const k = isls.findIndex((el) => !veiled(el)); if (k >= 0) { S.stCur = k; paintCar(); } }
      startEl.querySelectorAll('[data-part]').forEach((el) => {
        if (el === jbar) return;
        const shut = veiled(el); el.classList.toggle('jv', shut);
        const note = el.querySelector('.jv-note'); if (note) note.textContent = shut ? lockWords(el.dataset.part) : '';
        if (shut) el.setAttribute('aria-description', lockWords(el.dataset.part)); else el.removeAttribute('aria-description');
      });
      jbar.innerHTML = jbarHTML();
      paintInfo();
    };
    S.paintJourney = paintJourney;
    let map = null;
    const goPart = (part) => {   // an open tile on the map: go there
      const showTab = (tab) => { S.stTab = tab; paintTab(); };
      if (part.startsWith('zone:')) { const i = isls.findIndex((el) => el.dataset.part === part); showTab('env'); if (i >= 0) { S.stCur = i; paintCar(); } return true; }
      const LEARN = { learn: 'home', quiz: 'setup', album: 'album', webpuzzle: 'webpuzzle', keepforest: 'keepforest', badges: 'badges', frames: 'badges', inventors: 'inventors', expedition: 'expedition', duel: 'duel', versematch: 'versematch' };
      if (LEARN[part]) { emit('ui:learn', { screen: LEARN[part] }); return true; }
      if (part === 'science') { showTab('sci'); return true; }
      if (part === 'research') { emit('ui:research'); return true; }
      if (part === 'lab' || part === 'robots' || part.startsWith('lab:')) { emit('ui:lab'); return true; }
      return false;
    };
    const openMap = () => { emit('ui:click'); map = openJourneyMap(root, { emit, onPart: goPart, onClose: () => { map = null; try { jbar.focus({ preventScroll: true }); } catch (e) { } } }); };
    jbar.addEventListener('click', openMap);
    S.openJourneyMap = openMap;
    const gear = startEl.querySelector('.st-gear');
    gear.addEventListener('click', () => {
      emit('ui:click'); gear.setAttribute('aria-expanded', 'true');
      openSettings(startEl, { emit, getMusic: () => S.toggles.music !== false, onClose: () => { gear.setAttribute('aria-expanded', 'false'); try { gear.focus({ preventScroll: true }); } catch (e) { } } });
      // the first time: רובו־דע presents the rows that are on screen (beginners have no play mode row)
      setTimeout(() => { const g = window.__guide; if (g && startEl.querySelector('.set-layer')) g.say(g.lines('start:settings').filter((l) => !l.at || startEl.querySelector(l.at)), { key: 'g:start:settings' }); }, 300);
    });
    // listen once (the start screen is drawn again after every visit)
    if (!S.jListen) {
      S.jListen = true;
      const onStart = () => startEl.classList.contains('on') && !root.classList.contains('ingame') && !root.querySelector('.rs-hub.on') && !(window.__wolLearn && window.__wolLearn.isOpen && window.__wolLearn.isOpen());
      // the first visit of a player: רובו־דע presents the journey bar (after his hello, which main.js queues first)
      S.journeyIntro = () => { clearTimeout(S.jIntroT); S.jIntroT = setTimeout(() => { if (onStart() && window.__guide) window.__guide.intro('journey', { modal: true }); }, 1500); };
      addEventListener('wol-journey', () => { if (S.paintJourney) S.paintJourney(); S.journeyIntro(); });
      // a stage moment closed: offer to go to what opened ("בואו נלך!" / "אחר כך"), switch the tab and ring the new button
      const GO = { 2: { tab: 'learn' }, 3: { tab: 'learn' }, 4: { tab: 'sci' }, 5: { tab: 'sci' }, 6: { tab: 'learn' } };
      addEventListener('wol-stage-done', (e) => {
        if (S.paintJourney) S.paintJourney();
        const n = e.detail && e.detail.stage, g = window.__guide; const go = GO[n];
        if (!go || !g || !onStart() || !e.detail || !['done', 'skip'].includes(e.detail.result)) return;
        if (JR.state().stage > n) return;   // several stages at once: only the last one offers the way (its moment comes next)
        const kids = JR.playMode() === 'kids', ask = (g.lines('start:go') || []).find((l) => l.id === 'start.go.ask');
        const ring = (g.lines('start:go') || []).find((l) => l.id === 'start.go.' + n);
        if (!ask || !ring) return;
        g.say([ask], { actions: [{ id: 'go', label: kids ? 'בּוֹאוּ נֵלֵךְ!' : 'בואו נלך!', kind: 'primary' }, { id: 'later', label: kids ? 'אַחַר כָּךְ' : 'אחר כך' }] }).then((r) => {
          if (r !== 'go' || !onStart()) return;
          if (S.stTab !== go.tab) startEl.querySelector(`[data-tab="${go.tab}"]`)?.click();
          setTimeout(() => { if (onStart()) g.tip(ring, { ms: 9000 }); }, 520);   // after the pane's opening animation, so the ring sits right
        });
      });
    }
    paintModes(); paintTab(); paintCar(); paintJourney();
    S.journeyIntro();
    const renderStartIntros = () => paintInfo();
    S.repaintStartMode = () => { paintModes(); paintJourney(true); renderStartIntros(); };   // another player was chosen: show their level
    PP.open = false;
    startEl.querySelector('.st-who').addEventListener('click', () => (PP.open ? ppClose() : ppOpen()));
    const layer = startEl.querySelector('.st-pp-layer');
    layer.querySelector('.st-pp-scrim').addEventListener('click', () => ppClose());
    layer.querySelector('.st-pp').addEventListener('click', ppClick);
    layer.querySelector('.st-pp').addEventListener('input', (e) => { if (e.target.matches('.pp-input') && PP.draft) PP.draft.name = e.target.value; });
    layer.querySelector('.st-pp').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.matches('.pp-input')) { e.preventDefault(); ppSave(); return; }
      if (e.key !== 'Tab') return;
      // keep Tab inside the open sheet
      const f = [...ppBox().querySelectorAll('button, input')]; if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    });
    paintWho();
  }

  /* ================================================================ PLAYERS ("מי משחק?") */
  // A chip on the start screen shows who is playing; tapping it opens a small sheet: pick a player, add one, edit or delete.
  // The UI only emits profile:* events – main.js changes the profiles and answers with ui.setProfiles(state).
  const PP = { open: false, view: 'list', id: null, draft: null, after: null };
  const ppBox = () => startEl.querySelector('.st-pp');
  const ppPlayer = (id) => ((S.profiles && S.profiles.list) || []).find((p) => p.id === id) || null;
  function paintWho() {
    const p = S.profiles && S.profiles.current;
    const chip = startEl.querySelector('.st-who');
    if (chip) {
      chip.hidden = !p;
      if (p) {
        chip.innerHTML = `${avatarHTML(p.animal, 'who-av')}<span class="who-txt"><small>מי משחק?</small><b>${esc(p.name)}</b></span>${icon('chevron', 'who-chev')}`;
        chip.setAttribute('aria-label', `מי משחק? ${p.name}. אפשר ללחוץ ולהחליף שחקן`);
      }
    }
    const km = toolbar.querySelector('.km-who');
    if (km) { km.hidden = !p; km.innerHTML = p ? `${avatarHTML(p.animal, 'km-av')}<b>${esc(p.name)}</b>` : ''; if (p) km.title = 'מי משחק: ' + p.name; }
  }
  function ppOpen() {
    const layer = startEl.querySelector('.st-pp-layer'); if (!layer) return;
    PP.open = true; PP.view = 'list'; PP.after = null; layer.hidden = false;
    startEl.querySelector('.st-who').setAttribute('aria-expanded', 'true');
    ppRender(); ppFocus();
  }
  function ppClose(keepFocus) {
    const layer = startEl.querySelector('.st-pp-layer'); if (!layer || !PP.open) return;
    PP.open = false; PP.after = null; layer.hidden = true;
    const chip = startEl.querySelector('.st-who'); chip.setAttribute('aria-expanded', 'false');
    if (!keepFocus) try { chip.focus({ preventScroll: true }); } catch (e) { }
  }
  function ppFocus() {
    requestAnimationFrame(() => {
      const box = ppBox(); if (!box) return;
      const t = box.querySelector(PP.view === 'form' ? '.pp-input' : PP.view === 'confirm' ? '[data-a="del-no"]' : '.pp-row.cur .pp-pick') || box.querySelector('button');
      try { t && t.focus({ preventScroll: true }); } catch (e) { }
    });
  }
  function ppGo(view, id) {
    PP.view = view; PP.id = id || null;
    if (view === 'form') { const p = ppPlayer(id); const used = new Set(((S.profiles && S.profiles.list) || []).map((q) => q.animal)); PP.draft = p ? { name: p.name, animal: p.animal } : { name: '', animal: AVATAR_IDS.find((a) => !used.has(a)) || AVATAR_IDS[0] }; }
    ppRender(); ppFocus();
  }
  function ppRender() {
    const box = ppBox(); if (!box) return;
    const st = S.profiles || { list: [], current: null, max: 4, nameMax: 14 };
    const cur = st.current && st.current.id;
    const x = `<button class="pp-x" data-a="close" aria-label="סגירה" title="סגירה">${icon('close')}</button>`;
    box.dataset.view = PP.view;
    if (PP.view === 'form') {
      const editing = ppPlayer(PP.id), d = PP.draft || { name: '', animal: AVATAR_IDS[0] };
      box.innerHTML = `${x}<h3 class="pp-h">${editing ? 'עריכת שחקן' : 'שחקן חדש'}</h3>
        <label class="pp-lab" for="pp-name">השם</label>
        <input id="pp-name" class="pp-input" type="text" maxlength="${st.nameMax || 14}" autocomplete="off" spellcheck="false" dir="rtl" lang="he" placeholder="כתבו כאן את השם" value="${esc(d.name)}">
        <div class="pp-lab" id="pp-anl">בחרו חיה</div>
        <div class="pp-animals" role="radiogroup" aria-labelledby="pp-anl">${AVATAR_IDS.map((a) => `<button role="radio" data-animal="${a}" aria-checked="${a === d.animal}" aria-label="${esc(avatarName(a))}">${avatarHTML(a)}<small>${esc(avatarName(a))}</small></button>`).join('')}</div>
        <div class="pp-actions"><button class="btn primary" data-a="save">${icon('check')}${editing ? 'שמירה' : 'הוספה'}</button><button class="btn soft" data-a="cancel">ביטול</button></div>
        ${editing ? `<div class="pp-danger"><button class="pp-del" data-a="pp-reset">${icon('undo')}<span>איפוס השחקן</span></button>${st.list.length > 1 ? `<button class="pp-del" data-a="del">${icon('trash')}<span>מחיקת השחקן</span></button>` : ''}</div>` : ''}`;
      return;
    }
    if (PP.view === 'confirm') {
      const p = ppPlayer(PP.id); if (!p) { PP.view = 'list'; return ppRender(); }
      box.innerHTML = PP.kind === 'reset'
        ? `${x}<div class="pp-confirm">${avatarHTML(p.animal, 'pp-bigav')}<h3 class="pp-h">לאפס את ${esc(p.name)}?</h3>
        <p>כל ההישגים של ${esc(p.name)} יימחקו: היערות השמורים, הקלפים, האלבום והחבילות.<br>השם והחיה יישארו, והמשחק יתחיל מההתחלה.<br><b>אי אפשר יהיה להחזיר אותם.</b></p></div>
        <div class="pp-actions"><button class="btn danger" data-a="pp-reset-yes">${icon('undo')}כן, לאפס</button><button class="btn soft" data-a="del-no">לא, חזרה</button></div>`
        : `${x}<div class="pp-confirm">${avatarHTML(p.animal, 'pp-bigav')}<h3 class="pp-h">למחוק את ${esc(p.name)}?</h3>
        <p>היערות, הקלפים והחבילות של ${esc(p.name)} יימחקו.<br>אי אפשר יהיה להחזיר אותם.</p></div>
        <div class="pp-actions"><button class="btn danger" data-a="del-yes">${icon('trash')}כן, למחוק</button><button class="btn soft" data-a="del-no">לא, חזרה</button></div>`;
      return;
    }
    box.innerHTML = `${x}<h3 class="pp-h">מי משחק?</h3><p class="pp-sub">בחרו את השם שלכם</p>
      <ul class="pp-list">${st.list.map((p) => `<li class="pp-row${p.id === cur ? ' cur' : ''}">
        <button class="pp-pick" data-pick="${esc(p.id)}" aria-pressed="${p.id === cur}">${avatarHTML(p.animal)}<span class="pp-name">${esc(p.name)}</span>${p.id === cur ? `<span class="pp-tick" title="זה השחקן שבחרתם">${icon('check')}</span>` : ''}</button>
        <button class="pp-edit" data-edit="${esc(p.id)}" aria-label="עריכה: ${esc(p.name)}" title="עריכה">${icon('pencil')}</button></li>`).join('')}</ul>
      ${st.list.length < (st.max || 4) ? `<button class="pp-add" data-a="add">${icon('plus')}<span>שחקן חדש</span></button>` : `<p class="pp-note">אפשר עד ${st.max || 4} שחקנים</p>`}`;
  }
  function ppSave() {
    const d = PP.draft; if (!d) return;
    const name = String(d.name || '').replace(/\s+/g, ' ').trim();
    const editing = ppPlayer(PP.id);
    if (editing) { PP.after = 'list'; emit('profile:edit', { id: editing.id, name: name || null, animal: d.animal }); }
    else { PP.after = 'close'; emit('profile:add', { name, animal: d.animal }); }
  }
  function ppClick(e) {
    const pick = e.target.closest('[data-pick]');
    if (pick) { const id = pick.dataset.pick; if (S.profiles && S.profiles.current && S.profiles.current.id === id) { ppClose(); return; } PP.after = 'close'; emit('profile:switch', { id }); return; }
    const ed = e.target.closest('[data-edit]'); if (ed) { ppGo('form', ed.dataset.edit); return; }
    const an = e.target.closest('[data-animal]');
    if (an && PP.draft) { PP.draft.animal = an.dataset.animal; ppBox().querySelectorAll('.pp-animals [data-animal]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.animal === PP.draft.animal))); return; }
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = b.dataset.a;
    if (a === 'close') ppClose();
    else if (a === 'add') ppGo('form', null);
    else if (a === 'save') ppSave();
    else if (a === 'cancel') ppGo('list');
    else if (a === 'del') { PP.kind = 'del'; ppGo('confirm', PP.id); }
    else if (a === 'pp-reset') { PP.kind = 'reset'; ppGo('confirm', PP.id); }
    else if (a === 'pp-reset-yes') { PP.after = 'list'; emit('profile:reset', { id: PP.id }); }
    else if (a === 'del-no') ppGo('form', PP.id);
    else if (a === 'del-yes') { PP.after = 'list'; emit('profile:remove', { id: PP.id }); }
  }
  // Escape walks back: confirm → form → list → closed
  function ppEscape() {
    if (!PP.open) return false;
    if (PP.view === 'confirm') ppGo('form', PP.id); else if (PP.view === 'form') ppGo('list'); else ppClose();
    return true;
  }

  /* ================================================================ HUD */
  hud.innerHTML = `
    <div class="h-item h-pts" title="נקודות חיים"><span class="coin">${icon('leaf')}</span><b class="pts-num">0</b><small>נקודות</small></div>
    <div class="h-item h-vit" title="חיוניות"><span class="vit-ic">${icon('sprout')}</span><div class="vit-bar"><i></i></div><small class="vit-pc"></small></div>
    <div class="h-item h-bio" title="מינים חיים ${zoneWord('in')}"><span>${icon('web')}</span><b class="bio-num">0</b><small class="bio-lab"></small></div>
    <div class="h-item h-day" title="שעה ביום"><svg class="dial" viewBox="0 0 48 48" aria-hidden="true">
      <defs><clipPath id="dialclip"><circle cx="24" cy="24" r="21"/></clipPath></defs>
      <circle class="d-sky" cx="24" cy="24" r="21" fill="#86c6ee"/>
      <g clip-path="url(#dialclip)"><g class="d-stars"><circle cx="15" cy="14" r=".8"/><circle cx="31" cy="11" r=".7"/><circle cx="35" cy="19" r=".6"/><circle cx="11" cy="21" r=".6"/><circle cx="23" cy="8" r=".7"/></g>
      <g class="d-rot"><circle class="d-sun" cx="24" cy="9" r="5"/><g class="d-moon" transform="translate(24 39)"><circle r="4.2" fill="#f2efe0"/><circle cx="2" cy="-1.4" r="3.6" class="d-moon-cut" fill="#86c6ee"/></g></g>
      <path class="d-ground" fill="#3f7a3a" d="M0 26 Q12 23.5 24 25.5 T48 25 V48 H0z"/></g>
      <circle cx="24" cy="24" r="21" class="d-rim"/></svg><div class="day-txt"><b class="day-part">בוקר</b><small class="day-n">יום 1</small></div></div>
    <div class="h-item h-season" title="עונה"><span class="season-ic"></span><b class="season-name"></b></div>
    <div class="speed" role="group" aria-label="מהירות">
      <button data-s="0" title="עצירה (רווח)" aria-label="עצירה">${icon('pause')}</button>
      <button data-s="1" title="מהירות רגילה" aria-label="מהירות רגילה">${icon('play')}</button>
      <button data-s="3" title="מהר" aria-label="מהר">${icon('fast')}</button></div>`;
  const ptsNum = hud.querySelector('.pts-num'), ptsBox = hud.querySelector('.h-pts');
  const vitBar = hud.querySelector('.vit-bar i'), vitPc = hud.querySelector('.vit-pc'), vitIc = hud.querySelector('.vit-ic');
  const bioNum = hud.querySelector('.bio-num'), bioLab = hud.querySelector('.bio-lab');
  const dSky = hud.querySelector('.d-sky'), dRot = hud.querySelector('.d-rot'), dStars = hud.querySelector('.d-stars'), dGround = hud.querySelector('.d-ground'), dCut = hud.querySelector('.d-moon-cut');
  const dayPart = hud.querySelector('.day-part'), dayN = hud.querySelector('.day-n');
  const seasonBox = hud.querySelector('.h-season'), seasonIc = hud.querySelector('.season-ic'), seasonName = hud.querySelector('.season-name');
  const speedBtns = [...hud.querySelectorAll('.speed button')];
  speedBtns.forEach((b) => b.addEventListener('click', () => setSpeed(+b.dataset.s)));
  function setSpeed(s) { if (s > 0) S.lastSpeed = s; S.speed = s; paintSpeed(); emit('time:speed', { speed: s }); }
  function paintSpeed() { speedBtns.forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.s === S.speed))); root.classList.toggle('paused', S.speed === 0); }
  paintSpeed();
  function animatePts(target) {
    const from = S.shownPts, t0 = performance.now();
    cancelAnimationFrame(S.ptsRaf);
    ptsBox.classList.remove('up', 'down'); void ptsBox.offsetWidth;
    ptsBox.classList.add(target >= from ? 'up' : 'down');
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 650), e = 1 - Math.pow(1 - k, 3);
      S.shownPts = from + (target - from) * e; ptsNum.textContent = fmt(S.shownPts);
      if (k < 1) S.ptsRaf = requestAnimationFrame(step);
    };
    S.ptsRaf = requestAnimationFrame(step);
  }

  /* ================================================================ TOOLBAR */
  // A slim rail: the satchel menu (home, help, save + settings: sound and picture quality), the field journal,
  // and the two map views. Everything that used to be its own button now lives in the satchel.
  toolbar.innerHTML = `
    <button class="tb tb-home" data-a="home" data-tip="חזרה למסך הבית">${icon('home')}<span>מסך הבית</span></button>
    <span class="tb-sep"></span>
    <div class="kit">
      <button class="tb kit-btn" data-a="menu" data-tip="תפריט" aria-haspopup="true" aria-expanded="false">${icon('satchel')}</button>
      <div class="kit-menu" role="menu" aria-label="תפריט">
        <div class="km-who" hidden></div>
        <div class="km-group">
          <button class="km-row" data-a="home" role="menuitem">${icon('home')}<span>מסך הפתיחה</span></button>
          <button class="km-row" data-a="help" role="menuitem">${icon('help')}<span>איך משחקים</span></button>
          <button class="km-row" data-a="coach" role="menuitem">${icon('sprout')}<span>הדרכה צעד אחר צעד</span></button>
          <button class="km-row" data-a="save" role="menuitem">${icon('save')}<span>שמירת היער</span></button>
          <button class="km-row" data-a="report" role="menuitem">${icon('pencil')}<span>דוח יומי</span></button>
          <button class="km-row" data-a="reset" role="menuitem">${icon('target')}<span>מבט על ${zoneWord('all')}</span></button>
        </div>
        <div class="km-set"><h4>הגדרות</h4>
          <button class="km-row km-switch" data-a="sound" role="menuitemcheckbox">${icon('sound')}<span>צלילים</span><i class="sw"></i></button>
          <button class="km-row km-switch" data-a="music" role="menuitemcheckbox" title="מוזיקה רכה במסך הפתיחה ובמעבדה">${icon('music')}<span>מוזיקה</span><i class="sw"></i></button>
          ${TORAH ? `<button class="km-row km-switch" data-a="sources" role="menuitemcheckbox">${icon('book')}<span>מקורות ופסוקים</span><i class="sw"></i></button>` : ''}
          <div class="km-q">${icon('quality')}<span>איכות תמונה</span></div>
          <div class="km-seg" role="radiogroup" aria-label="איכות תמונה">
            <button data-q="low" role="radio" title="למחשב איטי">פשוטה</button>
            <button data-q="medium" role="radio">רגילה</button>
            <button data-q="high" role="radio" title="למחשב חזק">עשירה</button></div>
        </div>
      </div>
    </div>
    <button class="tb" data-a="journal" data-tip="יומן השדה">${icon('book')}</button>
    <span class="tb-gap"></span>
    <button class="tb tg" data-a="lightmap" data-tip="מפת אור">${icon('lightmap')}<span class="tb-lab">מפת אור</span></button>
    <button class="tb tg" data-a="web" data-tip="הצג את כל הקשרים">${icon('web')}<span class="tb-lab">רשת החיים</span></button>`;
  toolbar.querySelectorAll('[data-tip]').forEach((b) => b.setAttribute('aria-label', b.dataset.tip));
  const tbBtn = (a) => toolbar.querySelector(`[data-a="${a}"]`);
  const qWrap = toolbar.querySelector('.kit'), kitBtn = tbBtn('menu');
  const setKit = (on) => { qWrap.classList.toggle('open', on); kitBtn.setAttribute('aria-expanded', String(on)); };
  toolbar.addEventListener('click', (e) => {
    const qb = e.target.closest('[data-q]');
    if (qb) { const q = qb.dataset.q; S.toggles.quality = q; paintToggles(); emit('quality', { q }); return; }
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = b.dataset.a;
    if (a === 'menu') { setKit(!qWrap.classList.contains('open')); return; }
    if (a === 'home' || a === 'help' || a === 'coach' || a === 'save' || a === 'reset' || a === 'report') setKit(false);
    if (a === 'home') emit('ui:home');
    else if (a === 'help') emit('ui:help');
    else if (a === 'coach') emit('ui:coach');
    else if (a === 'journal') emit('ui:journal');
    else if (a === 'save') emit('ui:save');
    else if (a === 'report') emit('ui:report');
    else if (a === 'reset') emit('view:reset');
    else if (a === 'lightmap') { S.toggles.lightmap = !S.toggles.lightmap; paintToggles(); emit('toggle:lightmap', { on: S.toggles.lightmap }); }
    else if (a === 'web') { S.toggles.web = !S.toggles.web; paintToggles(); emit('toggle:web', { on: S.toggles.web }); }
    else if (a === 'sources') { setSourcesOn(!sourcesOn()); paintToggles(); emit('sources:toggle', { on: sourcesOn() }); }
    else if (a === 'sound') { S.toggles.sound = !(S.toggles.sound !== false); paintToggles(); emit('audio:mute', { muted: !S.toggles.sound }); }
    else if (a === 'music') { S.toggles.music = !(S.toggles.music !== false); paintToggles(); emit('music:toggle', { on: S.toggles.music }); }
  });
  document.addEventListener('pointerdown', (e) => { if (!qWrap.contains(e.target)) setKit(false); }, true);
  function paintToggles() {
    const t = S.toggles;
    tbBtn('lightmap').setAttribute('aria-pressed', String(!!t.lightmap));
    tbBtn('web').setAttribute('aria-pressed', String(!!t.web));
    const snd = tbBtn('sound'), on = t.sound !== false;
    snd.setAttribute('aria-checked', String(on)); snd.querySelector('.ic').outerHTML = icon(on ? 'sound' : 'mute'); snd.classList.toggle('off', !on);
    toolbar.querySelectorAll('[data-q]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.q === (t.quality || 'medium'))));
    const srcB = tbBtn('sources'); if (srcB) { const on = sourcesOn(); srcB.setAttribute('aria-checked', String(on)); srcB.classList.toggle('off', !on); }
    root.classList.toggle('q-low', t.quality === 'low');
    const mOn = t.music !== false;
    for (const b of [tbBtn('music'), musicBtn]) { b.setAttribute('aria-checked', String(mOn)); b.querySelector('.ic').outerHTML = icon(mOn ? 'music' : 'musicOff'); b.classList.toggle('off', !mOn); }
    musicBtn.setAttribute('aria-label', mOn ? 'מוזיקה: פועלת' : 'מוזיקה: כבויה'); musicBtn.title = mOn ? 'לכבות את המוזיקה' : 'להדליק את המוזיקה';
  }
  // the music switch where music plays (the start screen, the lab): a small round button, shown only there
  const musicBtn = h('button', 'mus-btn', icon('music'), root);
  musicBtn.setAttribute('role', 'switch'); musicBtn.hidden = true;
  musicBtn.addEventListener('click', () => { S.toggles.music = !(S.toggles.music !== false); paintToggles(); emit('music:toggle', { on: S.toggles.music }); });
  paintToggles();

  /* ================================================================ MISSIONS */
  missions.innerHTML = `<header class="m-head"><span class="m-ic">${icon('flower')}</span><h3>משימות</h3><span class="m-count"></span><button class="m-hist" title="משימות שבוצעו" aria-label="משימות שבוצעו">${icon('check')}<span>בוצעו</span></button>
    <button class="m-fold" title="קפל/פתח" aria-label="קפל או פתח את המשימות" aria-expanded="true">${icon('chevron')}</button></header><ul class="m-list"></ul>`;
  const mList = missions.querySelector('.m-list'), mCount = missions.querySelector('.m-count');
  missions.querySelector('.m-hist').addEventListener('click', (e) => { e.stopPropagation(); emit('missions:history'); });
  missions.querySelector('.m-head').addEventListener('click', () => { const f = missions.classList.toggle('folded'); missions.querySelector('.m-fold').setAttribute('aria-expanded', String(!f)); });
  mList.addEventListener('click', (e) => {
    const hintB = e.target.closest('.m-hint-btn');
    const li = e.target.closest('li'); if (!li) return;
    if (hintB) { li.classList.add('hint-open'); e.stopPropagation(); return; }
    const id = li.dataset.id;
    S.openMission = S.openMission === id ? null : id;
    mList.querySelectorAll('li').forEach((x) => x.classList.toggle('open', x.dataset.id === S.openMission));
  });

  /* ================================================================ LAYERS */
  layersEl.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-id]'); if (!b) return;
    S.activeLayer = b.dataset.id; paintLayers(); emit('view:layer', { id: b.dataset.id });
  });
  function paintLayers() { layersEl.querySelectorAll('button[data-id]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === S.activeLayer))); }

  /* ================================================================ TRAY */
  tray.innerHTML = `<div class="tr-top">
      <div class="tr-tabs" role="tablist">
        <button data-tab="plants" role="tab">${icon('sprout')}צמחים<span class="tc"></span></button>
        <button data-tab="animals" role="tab">${icon('paw')}בעלי חיים<span class="tc"></span></button>
        <button data-tab="tech" role="tab">${icon('bulb')}טכנולוגיה<span class="tc"></span></button></div>
      <div class="tr-filter"></div>
      <button class="tr-info" title="מה רואים בקלף?" aria-label="מה רואים בקלף?" aria-expanded="false">${icon('info')}</button>
      <button class="tr-fold" title="הסתר/הצג" aria-label="הסתר או הצג את הקלפים">${icon('chevron')}</button></div>
    <div class="tr-help" role="note"><p><span class="lg-dot">3</span>כמה יש ${zoneWord('in')} עכשיו</p><p><span class="lg-cost">${icon('leaf')}20</span>המחיר בנקודות חיים</p><p><span class="lg-drag">${icon('arrowL')}</span>גוררים את הקלף ${zoneWord('to')}</p></div>
    <div class="tr-scroll"><div class="tr-cards"></div></div>
    <div class="tr-cancel">${icon('close')}שחררו כאן כדי לבטל</div>`;
  const trTabs = [...tray.querySelectorAll('[data-tab]')], trFilter = tray.querySelector('.tr-filter');
  const trScroll = tray.querySelector('.tr-scroll'), trCards = tray.querySelector('.tr-cards');
  trTabs.forEach((b) => b.addEventListener('click', () => { S.tab = b.dataset.tab; S.layerFilter = 'all'; renderTray(true); }));
  trFilter.addEventListener('click', (e) => { const b = e.target.closest('[data-l]'); if (!b) return; S.layerFilter = b.dataset.l; renderTray(true); });
  tray.querySelector('.tr-info').addEventListener('click', (e) => { const on = tray.classList.toggle('help-open'); e.currentTarget.setAttribute('aria-expanded', String(on)); });
  tray.querySelector('.tr-fold').addEventListener('click', () => { S.trayCollapsed = !S.trayCollapsed; tray.classList.toggle('collapsed', S.trayCollapsed); syncTrayH(); });
  trScroll.addEventListener('wheel', (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { trScroll.scrollBy({ left: -e.deltaY }); e.preventDefault(); } }, { passive: false });
  const isAnimal = (c) => c.tab === 'animals' || ANIMAL_KINDS.has(c.kind);   // tab: a species that stays in place but is an animal (the giant clam)
  function cardSig(c) { return [c.name, c.cost, c.locked, c.lockText, c.canAfford, c.alive, c.isNew, c.color, c.layerName, c.thumb ? c.thumb.length + c.thumb.slice(-24) : 0].join('|'); }
  const lockMsg = (c) => { const t = c.lockText || ''; return /^משימה:\s*/.test(t) ? 'נפתח במשימה: ' + t.replace(/^משימה:\s*/, '') : (t || 'עוד נעול'); };
  const lockShort = (c) => (c.lockText || 'נעול').replace(/^משימה:\s*/, '');
  function fillCard(el, c) {
    el.className = 'card k-' + (isAnimal(c) ? 'animal' : c.kind === 'tool' ? 'tech' : 'plant') + (c.locked ? ' locked' : '') + (!c.locked && !c.canAfford ? ' poor' : '') + (c.isNew ? ' new' : '') + (c.alive ? ' has-alive' : '') + (c.nursery ? ' nursery' : '');
    el.style.setProperty('--c', c.color || '#6a9');
    el.innerHTML = `${thumbHTML(c.thumb, c.color, c.kind)}
      <span class="c-name">${esc(c.name)}</span>
      <span class="c-meta">${c.nursery ? '<span class="c-nur">מהמשתלה</span>' : c.locked ? `<span class="c-lock">${icon('lock')}<span>${esc(lockShort(c))}</span></span>` :
        `<span class="c-cost" title="מחיר: ${fmt(c.cost || 0)} נקודות חיים">${icon('leaf')}${fmt(c.cost || 0)}</span>${c.layerName ? `<span class="c-layer" title="${esc(c.layerName)}" style="--lt:${LAYER_TINT[c.layer] || '#7a9a5a'}"></span>` : ''}`}</span>
      ${c.alive ? `<span class="c-alive" title="${c.nursery ? `${fmt(c.alive)} מחכים במשתלה` : `יש ${fmt(c.alive)} כאלה ${zoneWord('in')} עכשיו`}">${fmt(c.alive)}</span>` : ''}
      ${c.isNew ? `<span class="c-new">${icon('sparkle')}חדש</span>` : ''}
      ${c.locked ? `<span class="c-lockbig">${icon('lock')}</span>` : ''}`;
    el.title = c.locked ? lockMsg(c) : '';
    el.setAttribute('aria-label', c.name + (c.nursery ? `. מהמשתלה, ${fmt(c.alive || 0)} מחכים. גררו אל השונית` : c.locked ? '. ' + lockMsg(c) : `. מחיר ${fmt(c.cost || 0)} נקודות חיים` + (c.alive ? `. יש ${fmt(c.alive)} ${zoneWord('in')}` : '')));
  }
  function renderTray(force) {
    const isTech = (c) => c.kind === 'tool';
    const plants = S.cards.filter((c) => !isAnimal(c) && !isTech(c)), animals = S.cards.filter(isAnimal), tech = S.cards.filter(isTech);
    trTabs[0].querySelector('.tc').textContent = plants.length; trTabs[1].querySelector('.tc').textContent = animals.length;
    if (trTabs[2]) { trTabs[2].querySelector('.tc').textContent = tech.length; trTabs[2].hidden = !tech.length; }
    trTabs.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === S.tab))); tray.dataset.tab = S.tab;
    const list = S.tab === 'plants' ? plants : S.tab === 'tech' ? tech : animals;
    // layer chips (only layers present in this tab)
    const seen = new Map(); list.forEach((c) => { if (c.layer && !seen.has(c.layer)) seen.set(c.layer, c.layerName || c.layer); });
    if (S.layerFilter !== 'all' && !seen.has(S.layerFilter)) S.layerFilter = 'all';
    const chips = seen.size > 1 ? `<button data-l="all">הכל</button>` + [...seen].map(([id, n]) => `<button data-l="${esc(id)}" style="--lt:${LAYER_TINT[id] || '#6a9'}">${esc(n)}</button>`).join('') : '';
    if (trFilter.dataset.sig !== chips + S.layerFilter) { trFilter.innerHTML = chips; trFilter.dataset.sig = chips + S.layerFilter; trFilter.querySelectorAll('[data-l]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.l === S.layerFilter))); }
    const shown = list.filter((c) => S.layerFilter === 'all' || c.layer === S.layerFilter);
    const keep = new Set(shown.map((c) => c.id));
    for (const [id, el] of S.cardEls) if (!keep.has(id) && !(S.press && S.press.id === id)) { el.remove(); S.cardEls.delete(id); S.cardSig.delete(id); }
    shown.forEach((c, i) => {
      let el = S.cardEls.get(c.id);
      if (!el) { el = h('div', 'card'); el.dataset.id = c.id; el.tabIndex = 0; el.setAttribute('role', 'button'); bindCard(el); S.cardEls.set(c.id, el); }
      const sig = cardSig(c);
      if (force || S.cardSig.get(c.id) !== sig) { fillCard(el, c); S.cardSig.set(c.id, sig); }
      if (trCards.children[i] !== el) trCards.insertBefore(el, trCards.children[i] || null);
    });
    tray.classList.toggle('empty', !shown.length);
  }
  const cardById = (id) => S.cards.find((c) => c.id === id);

  /* ---- drag & drop (pointer events; mouse + touch) */
  function bindCard(el) {
    el.addEventListener('pointerdown', (e) => {
      if (e.button > 0 || S.press) return;
      S.press = { id: el.dataset.id, el, pid: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, dragging: false, denied: false };
      el.classList.add('pressed');
    });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    // keyboard: Enter / Space opens the species card (placing still needs the mouse or a finger)
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault(); e.stopPropagation(); if (S.press) return;
      const c = cardById(el.dataset.id); if (!c) return;
      if (c.locked) ui.toast(lockMsg(c), 'info');
      emit('card:click', { id: c.id });
    });
  }
  const overTray = (x, y) => { const r = tray.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; };
  function placeFloating(x, y) {
    ghost.style.transform = `translate(${x}px, ${y}px)`;
    hintEl.style.transform = `translate(${x}px, ${y + 46}px)`;
  }
  window.addEventListener('pointermove', (e) => {
    const p = S.press; if (!p || e.pointerId !== p.pid) return;
    p.x = e.clientX; p.y = e.clientY;
    if (!p.dragging) {
      if (p.denied || Math.hypot(p.x - p.x0, p.y - p.y0) < 6) return;
      const c = cardById(p.id);
      if (!c || c.locked || !c.canAfford) {
        p.denied = true; p.el.classList.remove('shake'); void p.el.offsetWidth; p.el.classList.add('shake');
        emit('drag:denied', { id: p.id, reason: !c ? 'missing' : c.locked ? 'locked' : 'cost' });
        if (c && c.locked) ui.toast(lockMsg(c), 'info');
        return;
      }
      p.dragging = true;
      ghost.innerHTML = `${thumbHTML(c.thumb, c.color, c.kind, 'g-thumb')}<span>${esc(c.name)}</span>`;
      ghost.style.setProperty('--c', c.color || '#6a9');
      root.classList.add('dragging'); p.el.classList.add('lifted');
      placeFloating(p.x, p.y); ghost.classList.add('on');
      emit('drag:start', { id: p.id, x: p.x, y: p.y });
    }
    placeFloating(p.x, p.y);
    tray.classList.toggle('drop-cancel', overTray(p.x, p.y));
    emit('drag:move', { id: p.id, x: p.x, y: p.y });
  });
  function endPress(cancelled, viaEsc) {
    const p = S.press; if (!p) return;
    S.press = null;
    p.el.classList.remove('pressed', 'lifted');
    if (p.dragging) {
      const c = !!cancelled || overTray(p.x, p.y);
      ghost.classList.remove('on'); hintEl.classList.remove('on'); tray.classList.remove('drop-cancel'); root.classList.remove('dragging');
      if (!c) { ghost.classList.add('drop'); setTimeout(() => ghost.classList.remove('drop'), 300); }
      emit('drag:end', { id: p.id, x: p.x, y: p.y, cancelled: c });
    } else if (!p.denied && !viaEsc && !cancelled) {
      const c = cardById(p.id); if (c && c.locked) ui.toast(lockMsg(c), 'info');
      emit('card:click', { id: p.id });
    }
  }
  window.addEventListener('pointerup', (e) => { if (S.press && e.pointerId === S.press.pid) { S.press.x = e.clientX; S.press.y = e.clientY; endPress(false); } });
  window.addEventListener('pointercancel', (e) => { if (S.press && e.pointerId === S.press.pid) endPress(true); });
  window.addEventListener('blur', () => { if (S.press) endPress(true); });

  /* ================================================================ SPECIES PANEL */
  panel.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act]'); if (!t || !S.species) return;
    const act = t.dataset.act, id = S.species.id;
    if (act === 'close') { emit('species:close'); ui.hideSpecies(); }
    else if (act === 'follow') { emit('species:follow', { id }); t.classList.add('on'); }
    else if (act === 'locate') emit('species:locate', { id });
    else if (act === 'exp') { if (!t.disabled) emit('species:experiment', { id }); }
    else if (act === 'tour') emit('species:tour', { id });
    else if (act === 'uproot') {   // two steps: the first click asks, the second takes it out
      if (!(S.sureUntil > performance.now())) {
        S.sureUntil = performance.now() + 3500; t.classList.add('sure'); t.querySelector('span').textContent = 'בטוח? לחצו שוב';
        setTimeout(() => { const b = panel.querySelector('.sp-uproot'); if (b && !(S.sureUntil > performance.now())) { b.classList.remove('sure'); b.querySelector('span').textContent = b.dataset.label; } }, 3600);
        return;
      }
      S.sureUntil = 0; emit('species:uproot', { id });
    }
    else if (act === 'move') emit('species:move', { id });
    else if (act === 'select') emit('species:select', { id: t.dataset.id });
    else if (act === 'reveal') { t.classList.add('busy'); emit('relation:reveal', { from: id, to: t.dataset.to, type: t.dataset.type }); }
    else if (act === 'more') { S.moreOpen = !S.moreOpen; panel.classList.toggle('more-open', S.moreOpen); }
    else if (act === 'quiz') {
      const q = S.species.question; if (!q || S.species.questionDone) return;
      const index = +t.dataset.i, correct = index === q.answer;
      S.quiz = S.quiz && S.quiz.id === id ? S.quiz : { id, wrong: [], right: false };
      if (correct) S.quiz.right = true; else if (!S.quiz.wrong.includes(index)) S.quiz.wrong.push(index);
      emit('quiz:answer', { id, index, correct });
      renderSpecies(true);
    }
  });
  function relRow(r) {
    const col = typeColor(r.type);
    if (!r.discovered) {
      return `<li class="rel hidden" style="--rc:${col}"><span class="rel-type">${esc(r.typeName || '')}</span>
        <div class="rel-main"><button class="rel-target" data-act="select" data-id="${esc(r.targetId)}">${esc(r.targetName)}</button>
        <p class="rel-q">יש כאן קשר שעוד לא גילית…</p></div>
        <button class="rel-reveal" data-act="reveal" data-to="${esc(r.targetId)}" data-type="${esc(r.type)}">${icon('bulb')}גלה את הקשר</button></li>`;
    }
    return `<li class="rel${r.present ? ' present' : ' absent'}" style="--rc:${col}"><span class="rel-type">${esc(r.typeName || '')}</span>
      <div class="rel-main"><button class="rel-target" data-act="select" data-id="${esc(r.targetId)}">${esc(r.targetName)}</button>
      ${r.present ? '' : `<span class="rel-away">לא נמצא ${zoneWord('in')}</span>`}<p>${esc(r.text)}</p></div></li>`;
  }
  function renderSpecies(force) {
    const s = S.species; if (!s) return;
    const sig = JSON.stringify([s, S.quiz && S.quiz.id === s.id ? S.quiz : 0]);
    if (!force && sig === S.speciesSig) return;
    S.speciesSig = sig;
    const scroller = panel.querySelector('.sp-scroll'); const top = scroller ? scroller.scrollTop : 0;
    const health = s.health == null ? null : clamp01(s.health);
    const rels = s.relations || [];
    const found = rels.filter((r) => r.discovered).length;
    let quiz = '';
    if (s.question) {
      const q = s.question, qs = S.quiz && S.quiz.id === s.id ? S.quiz : { wrong: [], right: false };
      const done = s.questionDone || qs.right;
      quiz = `<section class="sp-quiz${done ? ' done' : ''}"><h4>${icon('help')}שאלה לחוקר</h4><p class="q">${esc(q.q)}</p><div class="opts">` +
        (q.options || []).map((o, i) => {
          const cls = done && i === q.answer ? 'right' : qs.wrong.includes(i) ? 'wrong' : '';
          return `<button data-act="quiz" data-i="${i}" class="${cls}" ${done || qs.wrong.includes(i) ? 'disabled' : ''}>${esc(o)}</button>`;
        }).join('') + `</div>` +
        (done ? `<p class="q-fb good">${icon('check')}נכון מאוד!</p>` : qs.wrong.length ? `<p class="q-fb bad">כמעט… נסו תשובה אחרת.</p>` : '') + `</section>`;
    }
    panel.style.setProperty('--c', s.color || '#6a9');
    panel.innerHTML = `<button class="sp-close" data-act="close" title="סגור" aria-label="סגור">${icon('close')}</button>
      <div class="sp-scroll">${s.art ? `<figure class="sp-art"><img src="${esc(s.art)}" alt="" draggable="false" style="${artPos(s.id, 2)}"></figure>` : ''}
      <header class="sp-head${s.art ? ' has-art' : ''}">${thumbHTML(s.thumb, s.color, s.kindName === 'בעל חיים' ? 'animal' : s.kind || '', 'sp-thumb')}
        <div><h2>${esc(s.name)}</h2>${s.nameEn ? `<p class="en" dir="ltr">${esc(s.nameEn)}</p>` : ''}
        <div class="chips">${s.kindName ? `<span>${esc(s.kindName)}</span>` : ''}${s.layerName ? `<span>${esc(s.layerName)}</span>` : ''}${s.activeName ? `<span>${icon(/לילה/.test(s.activeName) ? 'moon' : 'sun')}${esc(s.activeName)}</span>` : ''}</div></div></header>
      <div class="sp-status">
        <div class="st-alive"><b>${fmt(s.count || 0)}</b><small>${zoneWord('in')} עכשיו</small></div>
        ${health != null ? `<div class="st-health"><div class="hb"><i style="width:${(health * 100).toFixed(0)}%;background:hsl(${(health * 110).toFixed(0)} 60% 45%)"></i></div><small>${esc(s.status || 'בריאות')}</small></div>` : (s.status ? `<div class="st-health"><small>${esc(s.status)}</small></div>` : '')}
      </div>
      ${s.fact ? `<blockquote class="sp-fact">${esc(s.fact)}</blockquote>` : ''}
      ${s.shira ? `<section class="sp-shira src-box"><h4>${icon('book')}<span>בפרק שירה</span></h4><p class="src-text"><b>${esc(s.shira.who)}:</b> ${esc(s.shira.text)}</p><small class="src-ref">${esc(s.shira.ref)}</small>${s.shira.note ? `<p class="src-note">${esc(s.shira.note)}</p>` : ''}</section>` : ''}
      ${s.more ? `<div class="sp-more"><p>${esc(s.more)}</p></div><button class="sp-more-btn" data-act="more"><span class="m1">עוד עליו</span><span class="m2">פחות</span></button>` : ''}
      ${rels.length ? `<section class="sp-rels"><h4>${icon('web')}קשרים ברשת <small>${found}/${rels.length}</small></h4><ul>${rels.map(relRow).join('')}</ul></section>` : ''}
      ${quiz}
      ${s.one ? oneHTML(s) : ''}
      </div>
      <footer class="sp-actions">
        ${s.tour ? `<button class="btn sp-tour" data-act="tour">${icon('binoc')}${esc(s.tour)}</button>` : ''}
        <button class="btn ghosty sp-locate" data-act="locate" title="סמנו את כולם ${zoneWord('in')}">${icon('target')}איפה?</button>
        <button class="btn ghosty" data-act="follow">${icon('binoc')}עקוב</button>
        <button class="btn amber" data-act="exp" ${s.canRemove === false ? 'disabled title="אין עכשיו מה לבדוק"' : ''}>${icon('flask')}מה יקרה אם ייעלם?</button>
      </footer>`;
    panel.classList.toggle('more-open', S.moreOpen);
    const sc = panel.querySelector('.sp-scroll'); if (sc) sc.scrollTop = top;
  }

  // the one plant or animal that was clicked: take it out, move it, let it go
  function oneHTML(s) {
    const o = s.one, back = o.refund ? ` <small>+${o.refund}</small>` : '';
    if (o.kind === 'plant' && /בעל חיים/.test(s.kindName || '')) {   // a coral, a sponge, an anemone: an animal that stays in place
      const lb = 'להוציא אותו מהשונית';
      return `<section class="sp-one"><h4>${icon('sprout')}מה שבחרתם</h4>${o.strong ? '<p class="sp-strong">זה אלמוג חזק מהמשתלה. הוא גדל משבר של אלמוג שעמד בחום, ולכן בגל חום הוא מלבין פחות.</p>' : ''}<p>יותר מדי ממנו, או שהוא במקום לא טוב? גררו אותו למקום אחר (לוחצים עליו וגוררים, או גוררים את הידית שמתחתיו), או הוציאו אותו ופנו מקום.</p>
        <div class="sp-one-btns">${o.canMove ? `<button class="btn ghosty" data-act="move">${icon('target')}<span>להעביר למקום אחר</span></button>` : ''}
        ${upBtn(lb, 'leaf', back)}</div></section>`;
    }
    if (o.kind === 'plant') {
      const lb = 'לעקור את הצמח הזה';
      return `<section class="sp-one"><h4>${icon('sprout')}הצמח שבחרתם</h4><p>מוצל מדי, או שיש יותר מדי ממנו? גררו אותו למקום אחר (לוחצים עליו וגוררים, או גוררים את הידית שמתחתיו), או עקרו אותו ופנו מקום.</p>
        <div class="sp-one-btns">${o.canMove ? `<button class="btn ghosty" data-act="move">${icon('target')}<span>להעביר למקום אחר</span></button>` : ''}
        ${upBtn(lb, 'leaf', back)}</div></section>`;
    }
    const lb = 'להוציא אותו מהמקום';
    return `<section class="sp-one"><h4>${icon('paw')}בעל החיים שבחרתם</h4><p>יותר מדי מהם? אפשר לתת לו לצאת ולחפש בית אחר.</p>
      <div class="sp-one-btns">${upBtn(lb, 'arrowL', back)}</div></section>`;
  }
  function upBtn(lb, ic, back) {
    const sure = S.sureUntil > performance.now();
    return `<button class="btn ghosty sp-uproot${sure ? ' sure' : ''}" data-act="uproot" data-label="${lb}">${icon(ic)}<span>${sure ? 'בטוח? לחצו שוב' : lb}</span>${back}</button>`;
  }

  /* ================================================================ MODALS */
  const open = { event: null, outcome: null, dialog: null, journal: null, history: null };
  function makeModal(kind, inner, cls = '') {
    closeModal(kind);
    const wrap = h('div', `modal m-${kind}`, `<div class="backdrop"></div><div class="mbox paper ${cls}">${inner}</div>`, modalEl);
    open[kind] = wrap;
    void wrap.offsetWidth; wrap.classList.add('on');   // start the fade-in now (a slow computer may not give us a frame for a while)
    root.classList.add('has-modal');
    return wrap;
  }
  function dismissDialog() {
    const w = open.dialog; if (!w || !w._dismiss) return false;
    const id = w._dismiss; closeModal('dialog'); emit('dialog:button', { id }); return true;
  }
  function closeModal(kind) {
    const w = open[kind]; if (!w) return;
    open[kind] = null; w.classList.remove('on'); w.classList.add('off');
    setTimeout(() => w.remove(), 260);
    if (!Object.values(open).some(Boolean)) root.classList.remove('has-modal');
  }

  /* ================================================================ JOURNAL */
  function journalCard(sp, i) {
    if (!sp.discovered) return `<li class="jc unknown" style="--r:${((i * 37) % 7) - 3}deg"><span class="j-thumb">?</span><b>עוד לא התגלה</b><small>הוסיפו אותו ליער כדי להכיר</small></li>`;
    const tot = sp.relationsTotal || 0, f = sp.relationsFound || 0;
    let dots = ''; for (let k = 0; k < tot; k++) dots += `<i class="${k < f ? 'f' : ''}"></i>`;
    return `<li class="jc" style="--r:${((i * 37) % 7) - 3}deg;--c:${esc(sp.color || '#6a9')}"><button data-id="${esc(sp.id)}">
      <span class="tape"></span>${sp.art ? `<span class="j-thumb j-art"><img src="${esc(sp.art)}" alt="" draggable="false"></span>` : thumbHTML(sp.thumb, sp.color, sp.kind, 'j-thumb')}<b>${esc(sp.name)}</b>
      ${sp.fact ? `<small class="j-fact">${esc(sp.fact)}</small>` : ''}
      <span class="j-rel" title="קשרים שגילית">${dots}<em>${f}/${tot}</em></span></button></li>`;
  }

  /* ================================================================ COACH */
  coachEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-c]'); if (!b) return;
    emit(b.dataset.c === 'next' ? 'coach:next' : 'coach:skip');
  });
  function coachTargetEl(t) {
    return { tray, hud, layers: layersEl, toolbar, missions, species: root.classList.contains('sp-open') ? panel : null }[t] || null;
  }
  function layoutCoach() {
    if (!S.coach) return;
    const el = coachTargetEl(S.coach.target);
    const W = innerWidth, H = innerHeight, bw = coachEl.offsetWidth, bh = coachEl.offsetHeight;
    if (!el || !el.offsetParent) {
      coachRing.classList.remove('on');
      coachEl.style.left = (W - bw) / 2 + 'px'; coachEl.style.top = (H - bh) / 2 + 'px'; coachEl.dataset.arrow = 'none'; return;
    }
    const r = el.getBoundingClientRect(), pad = 8;
    Object.assign(coachRing.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
    coachRing.classList.add('on');
    let x, y, arrow;
    const spaceL = r.left, spaceR = W - r.right;
    if (r.height > H * 0.45 && Math.max(spaceL, spaceR) > bw + 40) { // tall region → beside it
      arrow = spaceR > spaceL ? 'left' : 'right';
      x = arrow === 'left' ? r.right + 22 : r.left - bw - 22; y = r.top + Math.min(r.height, H) / 2 - bh / 2;
    } else if (r.top + r.height / 2 > H / 2) { arrow = 'down'; y = r.top - bh - 22; x = r.left + r.width / 2 - bw / 2; }
    else { arrow = 'up'; y = r.bottom + 22; x = r.left + r.width / 2 - bw / 2; }
    x = Math.max(12, Math.min(W - bw - 12, x)); y = Math.max(12, Math.min(H - bh - 12, y));
    coachEl.style.left = x + 'px'; coachEl.style.top = y + 'px'; coachEl.dataset.arrow = arrow;
    const ax = Math.max(24, Math.min(bw - 24, r.left + r.width / 2 - x)), ay = Math.max(24, Math.min(bh - 24, r.top + r.height / 2 - y));
    coachEl.style.setProperty('--ax', ax + 'px'); coachEl.style.setProperty('--ay', ay + 'px');
  }

  /* ================================================================ FX helpers */
  function confetti(n = 38) {
    const cols = ['#8fd067', '#5fae4a', '#f0b44c', '#f6d36a', '#c8e68a', '#e98bc4'];
    for (let i = 0; i < n; i++) {
      const l = h('span', 'leafbit', icon('leaf'), fxEl);
      l.style.left = Math.random() * 100 + '%';
      l.style.color = cols[i % cols.length];
      l.style.setProperty('--dx', (Math.random() - 0.5) * 220 + 'px');
      l.style.setProperty('--rot', (Math.random() - 0.5) * 900 + 'deg');
      l.style.setProperty('--s', 0.7 + Math.random() * 0.9);
      l.style.animationDuration = 2.4 + Math.random() * 1.8 + 's';
      l.style.animationDelay = Math.random() * 0.6 + 's';
      setTimeout(() => l.remove(), 5200);
    }
  }
  function pushToast(node, ms) {
    toastsEl.appendChild(node);
    requestAnimationFrame(() => node.classList.add('on'));
    const kill = () => { if (!node.isConnected) return; node.classList.remove('on'); node.classList.add('off'); setTimeout(() => node.remove(), 320); };
    node.addEventListener('click', kill);
    setTimeout(kill, ms);
    while (toastsEl.children.length > 4) toastsEl.firstChild.remove();
  }
  const bannerQ = []; let bannerBusy = false;
  function nextBanner() {
    if (bannerBusy || !bannerQ.length) return;
    bannerBusy = true;
    const m = bannerQ.shift();
    const b = h('div', 'mission-banner', `<div class="mb-ribbon">${icon('check')}</div><small>משימה הושלמה!</small><h3>${esc(m.title)}</h3>${m.note ? `<p class="mb-note">בוצע: ${esc(m.note)}</p>` : ''}${m.rewardText ? `<p>${esc(m.rewardText)}</p>` : ''}`, root);
    requestAnimationFrame(() => b.classList.add('on'));
    confetti();
    setTimeout(() => { b.classList.remove('on'); b.classList.add('off'); }, 3800);
    setTimeout(() => { b.remove(); bannerBusy = false; nextBanner(); }, 4200);
  }

  /* ================================================================ KEYBOARD */
  window.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
    if (e.key === 'Escape') {
      if (S.press) { endPress(true, true); e.preventDefault(); return; }
      if (startEl.classList.contains('on') && !open.dialog && ppEscape()) { e.preventDefault(); return; }
      if (qWrap.classList.contains('open')) { setKit(false); kitBtn.focus(); return; }
      if (tray.classList.contains('help-open')) { tray.classList.remove('help-open'); return; }
      if (open.dialog) { if (dismissDialog()) e.preventDefault(); return; }
      if (open.history) { closeModal('history'); return; }
      if (open.journal) { emit('journal:close'); ui.hideJournal(); return; }
      if (open.outcome) { emit('outcome:close'); closeModal('outcome'); return; }
      if (S.species) { emit('species:close'); ui.hideSpecies(); return; }
    } else if ((e.code === 'Space' || e.key === ' ') && root.classList.contains('ingame') && !ui.isModalOpen()) {
      e.preventDefault();
      setSpeed(S.speed === 0 ? S.lastSpeed || 1 : 0);
    }
  });

  /* tray height → CSS var so side panels end above it */
  function syncTrayH() {
    // a mystery (חוקרי הטבע) has its research desk where the tray was: the island frames itself above it
    const desk = root.classList.contains('research') && root.querySelector('.rs-desk');
    if (desk) { root.style.setProperty('--trayH', Math.round(innerHeight - desk.getBoundingClientRect().top) + 'px'); layoutCoach(); return; }
    const r = tray.getBoundingClientRect(), t = tray.querySelector('.tr-top').getBoundingClientRect(); root.style.setProperty('--trayH', (tray.offsetParent ? Math.round(innerHeight - Math.min(r.top, t.top || r.top)) : 0) + 'px'); layoutCoach(); }
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(syncTrayH).observe(tray);
  window.addEventListener('resize', () => { syncTrayH(); layoutCoach(); });

  /* ================================================================ PUBLIC API */
  const ui = {
    setLoading(p, text) {
      loadEl.classList.add('on'); loadEl.classList.remove('off');
      ldFill.style.width = (clamp01(p) * 100).toFixed(1) + '%';
      if (text != null) ldStatus.textContent = text;
      if (!tipTimer) { rotateTip(); tipTimer = setInterval(rotateTip, 5200); }
    },
    // buttons under the loading message (e.g. after a failed load): [{ label, onClick, primary }]
    setLoadingActions(list) {
      let box = loadEl.querySelector('.ld-actions');
      loadEl.classList.toggle('has-actions', !!(list && list.length));
      if (!list || !list.length) { if (box) box.remove(); return; }
      clearInterval(tipTimer); tipTimer = 0; ldTip.classList.remove('show');   // the message and the buttons are what matter now
      if (!box) box = h('div', 'ld-actions', null, loadEl.querySelector('.ld-inner'));
      box.innerHTML = '';
      list.forEach((a, i) => { const b = h('button', `btn ${a.primary || (i === 0 && a.primary !== false) ? 'primary' : 'soft'}`, esc(a.label), box); b.addEventListener('click', () => { ui.setLoadingActions(null); a.onClick && a.onClick(); }); });
    },
    hideLoading() {
      ui.setLoadingActions(null);
      loadEl.classList.add('off'); loadEl.classList.remove('on');
      clearInterval(tipTimer); tipTimer = 0;
    },
    setLogo(src) { S.logo = src; const l = loadEl.querySelector('.ld-logo'); if (l) l.src = src; else if (src) { const im = h('img', 'ld-logo', null, loadEl); im.src = src; im.alt = 'בבא דע'; } const hl = root.querySelector('.hud-logo'); if (!hl && src) { const im = h('img', 'hud-logo', null, root); im.src = src; im.alt = 'בבא דע'; } },
    setTips(tips) { if (Array.isArray(tips) && tips.length) { S.tips = tips.slice(); S.tipI = Math.floor(Math.random() * tips.length); } },

    setMode(m) { S.mode = m; if (startEl.classList.contains('on') && S.repaintStartMode) S.repaintStartMode(); },
    // players: { list: [{ id, name, animal }], current: { id, name, animal }, max, nameMax }
    setProfiles(st) {
      const prev = S.profiles && S.profiles.current && S.profiles.current.id;
      S.profiles = st || null; paintWho();
      const chip = startEl.querySelector('.st-who');
      if (chip && st && st.current && prev && prev !== st.current.id) { chip.classList.remove('bump'); void chip.offsetWidth; chip.classList.add('bump'); }
      if (!PP.open) return;
      if (PP.after === 'close') ppClose(); else { PP.view = 'list'; ppRender(); ppFocus(); }
      PP.after = null;
    },
    showStart(biomes) {
      // nothing from the last forest should linger over the start screen
      toastsEl.innerHTML = ''; bannerQ.length = 0; root.querySelectorAll('.mission-banner').forEach((b) => b.remove()); bannerBusy = false; fxEl.innerHTML = '';
      for (const k of Object.keys(open)) closeModal(k);   // a journal or list left open must not cover the start screen
      renderStart(biomes); root.classList.remove('ingame');
      startEl.classList.remove('off'); S.startTok = (S.startTok || 0) + 1; const tok = S.startTok; requestAnimationFrame(() => { if (S.startTok === tok) startEl.classList.add('on'); });
    },
    hideStart() { S.startTok = (S.startTok || 0) + 1; startEl.classList.remove('on'); startEl.classList.add('off'); },

    setBiome(b) {
      S.biome = b || {};
      root.dataset.biome = S.biome.id || '';
      root.classList.add('ingame');
      seasonBox.hidden = !S.biome.hasSeasons;
      // words that depend on the zone (the menu and the tray help were written once, before the zone was known)
      const reef = S.biome.id === 'reef';
      const pt = tray.querySelector('[data-tab="plants"]');
      if (pt) for (const n of pt.childNodes) if (n.nodeType === 3 && n.textContent.trim()) n.textContent = reef ? 'אלמוגים וצמחים' : 'צמחים';   // corals are animals
      const kr = root.querySelector('.km-row[data-a="reset"] span'); if (kr) kr.textContent = `מבט על ${zoneWord('all')}`;
      const th = tray.querySelector('.tr-help'); if (th) th.innerHTML = `<p><span class="lg-dot">3</span>כמה יש ${zoneWord('in')} עכשיו</p><p><span class="lg-cost">${icon('leaf')}20</span>המחיר בנקודות חיים</p><p><span class="lg-drag">${icon('arrowL')}</span>גוררים את הקלף ${zoneWord('to')}</p>`;
      S.layerFilter = 'all';
      syncTrayH();
    },

    setTray(cards) { S.cards = Array.isArray(cards) ? cards : []; renderTray(false); },

    setDragHint(hint) {
      if (!hint || !S.press || !S.press.dragging) { hintEl.classList.remove('on'); ghost.classList.remove('valid', 'invalid'); return; }
      const sig = !!hint.valid + '|' + (hint.text || '');
      if (hintEl.dataset.sig !== sig) {
        hintEl.dataset.sig = sig;
        hintEl.className = 'drag-hint on ' + (hint.valid ? 'valid' : 'invalid');
        hintEl.innerHTML = `${icon(hint.valid ? 'check' : 'close')}<span>${esc(hint.text || (hint.valid ? 'אפשר לשתול כאן' : 'לא כאן'))}</span>`;
      } else hintEl.classList.add('on');
      ghost.classList.toggle('valid', !!hint.valid); ghost.classList.toggle('invalid', !hint.valid);
    },

    setHUD(d) {
      if (!d) return;
      const o = S.hud;
      if (d.points != null && d.points !== o.points) { if (o.points == null) { S.shownPts = d.points; ptsNum.textContent = fmt(d.points); } else animatePts(d.points); o.points = d.points; }
      if (d.vitality != null) {
        const v = clamp01(d.vitality);
        if (o.vitality == null || Math.abs(v - o.vitality) > 0.004) {
          o.vitality = v;
          const col = `hsl(${(v * 112).toFixed(0)} 62% 48%)`;
          vitBar.style.width = (v * 100).toFixed(1) + '%'; vitBar.style.background = col; vitIc.style.color = `hsl(${(v * 112).toFixed(0)} 65% 62%)`;
          vitPc.textContent = Math.round(v * 100) + '%'; vitPc.parentElement.title = `החיוניות של ${zoneWord('the')}: ${Math.round(v * 100)}%`;
          hud.classList.toggle('vit-low', v < 0.3);
        }
      }
      if (d.speciesAlive != null && (d.speciesAlive !== o.speciesAlive || d.speciesTotal !== o.speciesTotal)) {
        if (o.speciesAlive != null && d.speciesAlive > o.speciesAlive) { const bx = bioNum.parentElement.parentElement; bx.classList.remove('up'); void bx.offsetWidth; bx.classList.add('up'); }
        o.speciesAlive = d.speciesAlive; o.speciesTotal = d.speciesTotal;
        bioNum.textContent = fmt(d.speciesAlive); bioLab.textContent = d.speciesTotal ? `מתוך ${fmt(d.speciesTotal)}` : ''; bioLab.parentElement.title = d.speciesTotal ? `${fmt(d.speciesAlive)} מינים חיים ${zoneWord('in')}, מתוך ${fmt(d.speciesTotal)}` : `מינים חיים ${zoneWord('in')}`;
      }
      if (d.dayFrac != null && (o.dayFrac == null || Math.abs(d.dayFrac - o.dayFrac) > 0.0015)) {
        if (o.dayFrac != null && d.dayFrac + 0.5 < o.dayFrac) o.day = (o.day || 1) + 1;
        o.dayFrac = d.dayFrac;
        const f = ((d.dayFrac % 1) + 1) % 1;
        dRot.setAttribute('transform', `rotate(${(f * 360 + 180).toFixed(1)} 24 24)`);
        const sky = skyColor(f); dSky.setAttribute('fill', sky); dCut.setAttribute('fill', sky);
        const night = -Math.cos(f * Math.PI * 2) < -0.1;
        dStars.style.opacity = night ? 1 : 0;
        dGround.setAttribute('fill', night ? '#1d3524' : '#3f7a3a');
        const part = partOfDay(f); if (dayPart.textContent !== part) dayPart.textContent = part;
        const dn = d.day != null ? d.day : o.day || 1; const dt = 'יום ' + dn; if (dayN.textContent !== dt) dayN.textContent = dt;
      }
      if (d.isNight != null && d.isNight !== o.isNight) { o.isNight = d.isNight; root.classList.toggle('night', !!d.isNight); }
      if ('season' in d && (d.season !== o.season || d.seasonId !== o.seasonId)) {
        o.season = d.season; o.seasonId = d.seasonId;
        seasonBox.hidden = !d.season;
        seasonBox.dataset.season = d.seasonId || '';
        seasonIc.innerHTML = icon(SEASON_ICON[d.seasonId] || 'leaf'); seasonName.textContent = d.season || '';
      }
      if (d.speed != null && d.speed !== S.speed) { S.speed = d.speed; if (d.speed > 0) S.lastSpeed = d.speed; paintSpeed(); }
    },

    setMissions(list) {
      list = Array.isArray(list) ? list : [];
      const sig = JSON.stringify(list.map((m) => [m.id, m.title, m.text, m.hint, m.how, m.note, Math.round(clamp01(m.progress) * 100), !!m.done, m.checks]));
      if (sig === S.missionsSig) return;
      S.missionsSig = sig;
      const hintsOpen = new Set([...mList.querySelectorAll('li.hint-open')].map((x) => x.dataset.id));
      mList.innerHTML = list.map((m) => {
        const p = m.done ? 1 : clamp01(m.progress);
        // an expert mission (משימת מומחים): a gold tag, its badge, and a checklist of its parts
        const bd = m.expert ? badgesFor('mission:' + m.id)[0] : null;
        const xp = m.expert ? `<div class="m-expert">${bd ? badgeHTML(bd, { cls: 'mini' }) : ''}<span><b>משימת מומחים</b><small>${bd ? 'הפרס: התג "' + esc(bd.name) + '"' : 'משימה קשה במיוחד'}</small></span></div>` : '';
        const ck = m.checks && !m.done ? `<ul class="m-checks">${m.checks.map((c) => `<li class="${c.ok ? 'ok' : ''}"><i>${c.ok ? icon('check') : ''}</i><span>${esc(c.label)}${c.hold != null && !c.ok && c.hold > 0 ? ` <em>${c.hold}%</em>` : ''}</span></li>`).join('')}</ul>` : '';
        return `<li data-id="${esc(m.id)}" class="${m.done ? 'done' : ''}${m.expert ? ' expert' : ''}${S.openMission === m.id ? ' open' : ''}${hintsOpen.has(m.id) ? ' hint-open' : ''}">
          <div class="m-row"><span class="m-check" style="--p:${(p * 100).toFixed(1)}%">${m.done ? icon('check') : ''}</span><b>${esc(m.title)}</b><span class="m-pc">${m.done ? '' : Math.round(p * 100) + '%'}</span></div>
          <div class="m-detail">${xp}<p>${esc(m.text || '')}</p>${ck}${m.done && m.note ? `<p class="m-note">${icon('check')}בוצע: ${esc(m.note)}</p>` : ''}${(m.hint || m.how) && !m.done ? `<button class="m-hint-btn">${icon('bulb')}רמז</button><div class="m-hint">${m.hint ? `<p>${esc(m.hint)}</p>` : ''}${m.how ? `<p class="m-how">${esc(m.how)}</p>` : ''}</div>` : ''}</div></li>`;
      }).join('');
      const d = list.filter((m) => m.done).length;
      // the current mission is always in view (on a low screen the list shows only a line or two)
      const cur = mList.querySelector('li:not(.done)'); if (cur && (cur.offsetTop < mList.scrollTop || cur.offsetTop + 24 > mList.scrollTop + mList.clientHeight)) mList.scrollTop = Math.max(0, cur.offsetTop - mList.offsetTop - 2);
      mCount.textContent = list.length ? `${d}/${list.length}` : '';
      missions.hidden = !list.length;
    },
    missionDone(m) { bannerQ.push(m || {}); nextBanner(); },

    showSpecies(info) {
      if (!info) return;
      if (!S.species || S.species.id !== info.id) { S.moreOpen = false; if (!S.quiz || S.quiz.id !== info.id) S.quiz = null; const sc = panel.querySelector('.sp-scroll'); if (sc) sc.scrollTop = 0; S.speciesSig = ''; }
      S.sureUntil = 0; S.species = info; renderSpecies(true);
      const sc = panel.querySelector('.sp-scroll'); if (sc && S.speciesSig && panel.dataset.id !== info.id) sc.scrollTop = 0;
      panel.dataset.id = info.id;
      root.classList.add('sp-open'); panel.classList.add('on'); setKit(false);
      layoutCoach();
    },
    updateSpecies(info) {
      if (!info || !S.species || info.id !== S.species.id) return;
      S.species = info; renderSpecies(false);
    },
    hideSpecies() { S.species = null; S.speciesSig = ''; panel.classList.remove('on'); root.classList.remove('sp-open'); layoutCoach(); },

    showEvent(ev) {
      if (!ev) return;
      const w = makeModal('event', `<div class="ev-badge">${icon('bang')}</div><small class="ev-kicker">קורה ${zoneWord('in')}</small><h2>${esc(ev.title)}</h2><p class="ev-text">${esc(ev.text)}</p>
        <div class="ev-choices">${(ev.choices || []).map((c, i) => `<button class="btn ${i === 0 ? 'primary' : 'soft'}" data-id="${esc(c.id)}">${esc(c.label)}</button>`).join('')}</div>`, 'ev');
      w.querySelector('.ev-choices').addEventListener('click', (e) => {
        const b = e.target.closest('button[data-id]'); if (!b) return;
        closeModal('event'); emit('event:choice', { eventId: ev.id, choiceId: b.dataset.id });
      });
    },
    hideEvent() { closeModal('event'); },
    hideOutcome() { closeModal('outcome'); },
    cancelDrag() { if (S.press) endPress(true, true); },
    showOutcome(o) {
      if (!o) return;
      const w = makeModal('outcome', `<div class="ev-badge good">${icon('sprout')}</div><h2>${esc(o.title)}</h2><p class="ev-text">${esc(o.text)}</p>
        <div class="ev-choices"><button class="btn primary" data-close>המשך</button></div>`, 'ev');
      w.querySelector('[data-close]').addEventListener('click', () => { closeModal('outcome'); emit('outcome:close'); });
    },

    discovery(d) {
      if (!d) return;
      const col = d.color || '#f0b44c';
      const t = h('div', 'toast discovery paper', `<header>${icon('sparkle')}<b>גילית קשר חדש!</b></header>
        <div class="dc-link" style="--rc:${esc(col)}"><span class="dc-a">${esc(d.fromName)}</span><span class="dc-line"><em>${esc(d.typeName || '')}</em></span><span class="dc-b">${esc(d.toName)}</span></div>
        ${d.text ? `<p>${esc(d.text)}</p>` : ''}`);
      pushToast(t, 6500);
    },
    toast(text, kind = 'info', ms = 0) {
      const ic = { info: 'leaf', good: 'check', warn: 'bang', bad: 'bang' }[kind] || 'leaf';
      const t = h('div', `toast small glass k-${kind}`, `<span class="t-ic">${icon(ic)}</span><span>${esc(text)}</span>`);
      pushToast(t, ms || (kind === 'bad' || kind === 'warn' ? 4600 : 3400));
    },
    floatText(x, y, text, color) {
      const f = h('div', 'float', esc(text), fxEl);
      f.style.left = x + 'px'; f.style.top = y + 'px'; if (color) f.style.color = color;
      setTimeout(() => f.remove(), 1700);
    },

    showHover(p) {
      if (!p) return;
      const sig = (p.name || '') + '|' + (p.sub || '');
      if (hoverEl.dataset.sig !== sig) { hoverEl.dataset.sig = sig; hoverEl.innerHTML = `<b>${esc(p.name)}</b>${p.sub ? `<small>${esc(p.sub)}</small>` : ''}`; }
      const w = hoverEl.offsetWidth || 120;
      const x = Math.max(8, Math.min(innerWidth - w - 8, p.x - w / 2)), y = Math.max(8, p.y - 56);
      hoverEl.style.transform = `translate(${x}px, ${y}px)`; hoverEl.classList.add('on');
    },
    hideHover() { hoverEl.classList.remove('on'); },

    setLayers(layers, activeId) {
      S.layers = Array.isArray(layers) ? layers.filter((l) => l.id !== 'all') : [];
      S.activeLayer = activeId || 'all';
      const n = S.layers.length;
      layersEl.innerHTML = `<button class="ly-all" data-id="all" title="${zoneWord('all')}" aria-label="${zoneWord('all')}">${icon('tree')}<span>${zoneWord('all')}</span></button><div class="strata">` +
        S.layers.map((l, i) => `<button data-id="${esc(l.id)}" aria-label="${esc(l.name)}" style="--lt:${LAYER_TINT[l.id] || mix('#a8cf7a', '#7a5636', n > 1 ? i / (n - 1) : 0)}"><span>${esc(l.name)}</span></button>`).join('') + `</div>`;
      layersEl.setAttribute('aria-label', 'קומות היער');
      layersEl.hidden = !n;
      paintLayers();
    },

    setToggles(t) { Object.assign(S.toggles, t || {}); paintToggles(); },
    // where music could play now ('start' | 'lab' | null): shows the music switch there (main.js calls it every frame)
    setMusicPlace(p) { p = p || ''; if (musicBtn.dataset.place === p) return; musicBtn.dataset.place = p; musicBtn.hidden = !p; },
    isStartShown() { return startEl.classList.contains('on') && !loadEl.classList.contains('on'); },

    showDoneMissions(list) {
      list = Array.isArray(list) ? list : [];
      const w = makeModal('history', `<button class="j-close" title="סגור" aria-label="סגור">${icon('close')}</button>
        <h2>משימות שבוצעו</h2><p class="mh-sub">${list.length ? (list.length === 1 ? 'השלמתם משימה אחת.' : `השלמתם ${fmt(list.length)} משימות.`) : 'עוד לא השלמתם משימות. המשימה הנוכחית מחכה לכם בצד.'}</p>
        <ol class="mh-list">${list.map((m) => `<li><span class="mh-ic">${icon('check')}</span><div><b>${esc(m.title)}</b><p>${esc(m.text || '')}</p>${m.note ? `<p class="mh-note">בוצע: ${esc(m.note)}</p>` : ''}</div></li>`).join('')}</ol>`, 'history');
      const close = () => closeModal('history');
      w.querySelector('.j-close').addEventListener('click', close); w.querySelector('.backdrop').addEventListener('click', close);
    },
    showJournal(j) {
      if (!j) return;
      const st = j.stats || {};
      const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
      const w = makeModal('journal', `<div class="spine"></div><button class="j-close" title="סגור" aria-label="סגור">${icon('close')}</button>
        <header class="j-head"><div><h2>יומן השדה</h2><p>כל מין שפגשת וכל קשר שגילית נרשמים כאן.</p></div>
          <div class="j-stats"><div><b>${fmt(st.discovered || 0)}<small>מתוך ${fmt(st.total || 0)}</small></b><span>מינים שהכרת</span><i style="--p:${pct(st.discovered, st.total)}%"></i></div>
          <div><b>${fmt(st.relationsFound || 0)}<small>מתוך ${fmt(st.relationsTotal || 0)}</small></b><span>קשרים שגילית</span><i style="--p:${pct(st.relationsFound, st.relationsTotal)}%"></i></div></div></header>
        <ul class="j-grid">${(j.species || []).map(journalCard).join('')}</ul>`, 'journal');
      w.querySelector('.j-close').addEventListener('click', () => { emit('journal:close'); ui.hideJournal(); });
      w.querySelector('.backdrop').addEventListener('click', () => { emit('journal:close'); ui.hideJournal(); });
      w.querySelector('.j-grid').addEventListener('click', (e) => { const b = e.target.closest('button[data-id]'); if (b) emit('journal:select', { id: b.dataset.id }); });
    },
    hideJournal() { closeModal('journal'); },

    coach(c) {
      if (!c) return ui.hideCoach();
      S.coach = c;
      let dots = ''; for (let i = 1; i <= (c.total || 0); i++) dots += `<i class="${i === c.step ? 'on' : i < c.step ? 'past' : ''}"></i>`;
      const last = c.total && c.step >= c.total;
      coachEl.innerHTML = `<div class="c-arrow"></div><div class="c-body"><span class="c-ic">${icon('sprout')}</span><p>${esc(c.text)}</p></div>
        <footer><span class="c-dots">${dots}</span><button class="btn link" data-c="skip">דלג</button><button class="btn primary sm" data-c="next">${last ? 'סיימתי' : 'הבא'}</button></footer>`;
      coachEl.classList.add('on');
      requestAnimationFrame(() => { layoutCoach(); requestAnimationFrame(layoutCoach); });
    },
    hideCoach() { S.coach = null; coachEl.classList.remove('on'); coachRing.classList.remove('on'); },

    // d.dismiss: the button id that Escape / a click outside the box stands for.
    // A dialog with a single button (an "OK" note) can always be dismissed that way.
    showDialog(d) {
      if (!d) return;
      const buttons = d.buttons || [{ id: 'ok', label: 'אישור' }];
      const w = makeModal('dialog', `<h2>${esc(d.title)}</h2><div class="dl-text">${esc(d.text).replace(/\n/g, '<br>')}</div>
        <div class="ev-choices row">${buttons.map((b, i) => `<button class="btn ${b.kind === 'back' ? 'link' : i === 0 ? 'primary' : 'soft'}" data-id="${esc(b.id)}">${esc(b.label)}</button>`).join('')}</div>`, 'dialog');
      w._dismiss = d.dismiss || (buttons.length === 1 ? buttons[0].id : null);
      w.querySelector('.ev-choices').addEventListener('click', (e) => {
        const b = e.target.closest('button[data-id]'); if (!b) return;
        closeModal('dialog'); emit('dialog:button', { id: b.dataset.id });
      });
      w.querySelector('.backdrop').addEventListener('click', () => { if (open.dialog === w) dismissDialog(); });
      const first = w.querySelector('.ev-choices button'); if (first) requestAnimationFrame(() => { try { first.focus({ preventScroll: true }); } catch (e) { } });
    },
    hideDialog() { closeModal('dialog'); },

    setExperiment(x) {
      if (!x || !x.active) { expEl.classList.remove('on'); expEl.dataset.name = ''; root.classList.remove('has-experiment'); return; }
      root.classList.add('has-experiment');
      if (expEl.dataset.name !== x.name) {
        expEl.dataset.name = x.name;
        expEl.innerHTML = `<span class="ex-ic">${icon('flask')}</span><div><small>ניסוי</small><b>מה קורה ליער בלי ${esc(x.name)}?</b></div>
          <span class="ex-time">${icon('hourglass')}<em></em></span><button class="btn amber sm">${icon('undo')}החזר</button>`;
        expEl.querySelector('button').addEventListener('click', () => emit('experiment:end'));
      }
      const em = expEl.querySelector('.ex-time em');
      const sec = Math.max(0, Math.ceil(x.secondsLeft || 0));
      em.textContent = x.secondsLeft == null ? '' : `עוד ${sec} שניות`;
      expEl.classList.add('on');
    },

    isModalOpen() {
      return !!(open.event || open.outcome || open.dialog || open.journal) || !!root.querySelector('.rep-layer.on') || startEl.classList.contains('on') || loadEl.classList.contains('on');
    },
  };

  return ui;
}
