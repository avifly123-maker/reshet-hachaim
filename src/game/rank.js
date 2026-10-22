// אחרי המשימות (1.3.2, area H): the island's rank, and the small stores of the "after the missions" parts.
// No three.js here: the start screen (src/ui/ui.js) reads the rank of each island without opening a zone.
//
// Storage (per player, core/profiles.js key()):
//   'web-of-life-photos'   [{ id, sp, sps: [speciesId], zone, t, img (JPEG data URL ≤ 12 kB), pair?: [a, b], visitor?: 1 }]
//                          newest last, at most 40 (the oldest drops out). Read by src/lab/cabinet.js (img, sp, zone, t,
//                          id) and src/core/threads.js (sp, zone).
//   'web-of-life-visitors' [{ id: speciesId, zone, t, img? }]  one per species, the last photo of it (cabinet: "מבקרים נדירים")
//   'web-of-life-after'    { v: 1, z: { <zone>: { ch: [{ id, lv, t }], pm: { <photoMissionId>: t }, pairs: { 'a>b': t },
//                            snap: { full|kids: { kinds, links, days, t } } } } }
//                          challenges done, photo missions done, linked pairs photographed, and a snapshot of the island
//                          taken when the child leaves it (kinds alive, active links, days lived)
// Rank (per zone): points from kinds alive, active links, days (the grove: seasons) lived, challenges, rare visitors and
// photos → one of four ranks (RANKS). rankOf(zone, kids) → { i, name, pts, next, progress, parts }.
import { key as profileKey } from '../core/profiles.js';

export const PHOTOS_KEY = 'web-of-life-photos';
export const VISITORS_KEY = 'web-of-life-visitors';
export const AFTER_KEY = 'web-of-life-after';
export const MAX_PHOTOS = 40;

const ls = () => { try { return window.localStorage || null; } catch (e) { return null; } };
export function readJSON(base, fb) { try { const s = ls(); const t = s && s.getItem(profileKey(base)); return t ? JSON.parse(t) : fb; } catch (e) { return fb; } }
export function writeJSON(base, v) { try { const s = ls(); if (s) { s.setItem(profileKey(base), JSON.stringify(v)); return true; } } catch (e) { /* storage full or blocked */ } return false; }
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

// ─────────────────────────────── photos
export function readPhotos() { const p = readJSON(PHOTOS_KEY, []); return Array.isArray(p) ? p.filter((x) => x && typeof x === 'object') : []; }
export function addPhoto(rec) {
  const list = readPhotos(); list.push(rec);
  while (list.length > MAX_PHOTOS) list.shift();
  // storage nearly full: drop more of the oldest until it fits (the photos must never break the saves)
  while (!writeJSON(PHOTOS_KEY, list) && list.length > 1) list.shift();
  try { window.dispatchEvent(new CustomEvent('wol-progress', { detail: { kind: 'photo', id: rec.sp, zone: rec.zone } })); } catch (e) { }
  return list;
}

// ─────────────────────────────── rare visitors (one entry per species: the last time it was photographed)
export function readVisitors() {
  const v = readJSON(VISITORS_KEY, []);
  if (Array.isArray(v)) return v.filter((x) => x && x.id);
  return Object.entries(obj(v)).map(([id, x]) => ({ id, ...obj(x) }));   // a map by id (never written so, but read kindly)
}
export function addVisitor(rec) {
  const list = readVisitors().filter((x) => x.id !== rec.id); list.push(rec);
  if (!writeJSON(VISITORS_KEY, list)) { const lean = list.map((x) => (x === rec ? x : { id: x.id, zone: x.zone, t: x.t })); writeJSON(VISITORS_KEY, lean); }
  try { window.dispatchEvent(new CustomEvent('wol-progress', { detail: { kind: 'visitor', id: rec.id, zone: rec.zone } })); } catch (e) { }
}
export const visitorsOf = (zone) => readVisitors().filter((v) => v.zone === zone);

// ─────────────────────────────── challenges, photo missions, linked pairs, island snapshots
export function afterStore() {
  const s = obj(readJSON(AFTER_KEY, null));
  return { v: 1, z: obj(s.z) };
}
export function zoneAfter(zone, S = afterStore()) {
  const z = obj(S.z[zone]);
  return { ch: Array.isArray(z.ch) ? z.ch.filter((c) => c && c.id) : [], pm: obj(z.pm), pairs: obj(z.pairs), snap: obj(z.snap) };
}
export function updateZone(zone, fn) {
  const S = afterStore(); const z = zoneAfter(zone, S);
  fn(z); S.z[zone] = z; writeJSON(AFTER_KEY, S);
  return z;
}
export function snapshot(zone, kids, snap) { updateZone(zone, (z) => { z.snap[kids ? 'kids' : 'full'] = { ...snap, t: Date.now() }; }); }

// ─────────────────────────────── the ranks
export const RANKS = {
  amazon: [['יער נובט', 'יַעַר נוֹבֵט'], ['יער ירוק', 'יַעַר יָרֹק'], ['יער סבוך', 'יַעַר סָבוּךְ'], ['יער ענקים', 'יַעַר עֲנָקִים']],
  grove: [['חורש צעיר', 'חֹרֶשׁ צָעִיר'], ['חורש פורח', 'חֹרֶשׁ פּוֹרֵחַ'], ['חורש עבות', 'חֹרֶשׁ עָבוֹת'], ['חורש עתיק', 'חֹרֶשׁ עַתִּיק']],
  reef: [['שונית צעירה', 'שׁוּנִית צְעִירָה'], ['שונית צומחת', 'שׁוּנִית צוֹמַחַת'], ['שונית צבעונית', 'שׁוּנִית צִבְעוֹנִית'], ['שונית עתיקה', 'שׁוּנִית עַתִּיקָה']],
};
const STEPS = { full: [0, 35, 80, 140], kids: [0, 20, 45, 80] };
export const CH_POINTS = [0, 5, 10, 15];   // a challenge of level 1 / 2 / 3

// the numbers of an island: the snapshot taken when the child left it, or (older saves) what the save itself tells
function islandNumbers(zone, kids) {
  const z = zoneAfter(zone);
  const snap = z.snap[kids ? 'kids' : 'full'];
  const save = obj(readJSON('web-of-life-save-' + zone + (kids ? '-kids' : ''), null));
  const ids = new Set();
  for (const p of Array.isArray(save.plants) ? save.plants : []) if (p && p.id) ids.add(p.id);
  for (const a of Array.isArray(save.animals) ? save.animals : []) if (a && a.id) ids.add(a.id);
  const disc = Array.isArray(save.discovered) ? save.discovered.length : 0;
  const days = Math.max(0, (save.day || 1) - 1);
  if (snap && snap.t && (!save.savedAt || snap.t >= save.savedAt - 60000)) return { kinds: snap.kinds || 0, links: snap.links || 0, days: Math.max(days, snap.days || 0), z };
  return { kinds: ids.size, links: Math.min(disc, Math.round(ids.size * 1.3)), days, z };
}
export function rankPoints(zone, kids, live = null) {
  const n = live ? { ...islandNumbers(zone, kids), ...live } : islandNumbers(zone, kids);
  const z = n.z;
  const ph = readPhotos().filter((p) => p.zone === zone);
  const vis = visitorsOf(zone).length;
  const parts = {
    kinds: Math.min(kids ? 32 : 50, n.kinds * (kids ? 4 : 2)),
    links: Math.min(40, n.links),
    days: Math.min(30, n.days),
    challenges: z.ch.reduce((t, c) => t + (CH_POINTS[c.lv] || 5), 0),
    visitors: Math.min(24, vis * 8),
    photos: Math.min(15, new Set(ph.map((p) => p.sp)).size) + Object.keys(z.pm).length * 5 + Math.min(10, Object.keys(z.pairs).length * 2),
  };
  return { pts: Object.values(parts).reduce((a, b) => a + b, 0), parts };
}
export function rankOf(zone, kids, live = null) {
  const names = RANKS[zone] || RANKS.grove;
  const { pts, parts } = rankPoints(zone, kids, live);
  const st = kids ? STEPS.kids : STEPS.full;
  let i = 0; for (let k = 0; k < st.length; k++) if (pts >= st[k]) i = k;
  const next = i < st.length - 1 ? st[i + 1] : null;
  const progress = next == null ? 1 : Math.max(0, Math.min(1, (pts - st[i]) / (next - st[i])));
  return { i, name: names[i][kids ? 1 : 0], fname: names[i][0], kname: names[i][1], nextName: next == null ? null : names[i + 1][kids ? 1 : 0], pts, next, progress, parts };
}

// the small emblem of a rank: one to four leaves (amazon, grove) or coral branches (reef) on a round plate. No crossing lines.
export function rankEmblem(zone, i) {
  const n = i + 1, reef = zone === 'reef';
  const c = reef ? '#ff9a7a' : zone === 'grove' ? '#b8d26a' : '#6fd08a';
  const spread = [[0], [-22, 22], [-34, 0, 34], [-48, -16, 16, 48]][i] || [0];
  const shape = reef
    ? (a) => `<path transform="rotate(${a} 24 40)" d="M22.4 40V22q0-3 1.6-4.4q1.6 1.4 1.6 4.4V40z" fill="${c}"/><circle transform="rotate(${a} 24 40)" cx="24" cy="17" r="3.2" fill="${c}"/>`
    : (a) => `<path transform="rotate(${a} 24 40)" d="M24 40Q15 30 24 13Q33 30 24 40z" fill="${c}"/>`;
  return `<svg class="af-emb" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="rgba(17,36,26,.85)" stroke="${c}" stroke-opacity=".7" stroke-width="2"/>${spread.slice(0, n).map(shape).join('')}</svg>`;
}
