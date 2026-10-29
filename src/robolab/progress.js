// מעבדת הרובוטים – what each player solved (per player, src/core/storage.js K.robolab).
// { done: { <levelId>: { stars, blocks, t } }, seen: { intro: 1, ... }, fun: n (funny blocks pressed, for a badge),
//   look: { robot|drone|sub: { parts: { socket: partId }, paint: { body, trim, accent } } } (the garage) }
// Writes fire 'wol-progress' { kind: 'robolab' } so מסע החוקר and the badges can count.
import { K, readPlayer, writePlayer } from '../core/storage.js';

const EMPTY = () => ({ done: {}, seen: {}, fun: 0, look: {}, isl: 0 });
export function roboProgress() {
  const o = readPlayer(K.robolab, null);
  if (!o || typeof o !== 'object') return EMPTY();
  return { done: o.done && typeof o.done === 'object' ? o.done : {}, seen: o.seen && typeof o.seen === 'object' ? o.seen : {}, fun: o.fun | 0, look: o.look && typeof o.look === 'object' ? o.look : {}, isl: o.isl | 0 };
}
function save(o, detail, quiet = false) {
  writePlayer(K.robolab, o);
  if (quiet) return;   // what was seen, the funny-block count: nothing for the journey or the badges to count
  try { window.dispatchEvent(new CustomEvent('wol-progress', { detail: { kind: 'robolab', ...(detail || {}) } })); } catch (e) { }
}
// a solved level: keeps the best stars and the fewest blocks; returns { first, better }
export function markSolved(id, stars, blocks) {
  const o = roboProgress(); const was = o.done[id];
  const first = !was, better = !!was && (stars > was.stars || (stars === was.stars && blocks < was.blocks));
  if (first || better) o.done[id] = { stars: Math.max(stars, was ? was.stars : 0), blocks: was ? Math.min(blocks, was.blocks) : blocks, t: Date.now() };
  save(o, { id, first }); return { first, better };
}
export function markSeen(key) { const o = roboProgress(); if (!o.seen[key]) { o.seen[key] = 1; save(o, null, true); } }
export function addFun(n = 1) { const o = roboProgress(); o.fun += n; save(o, null, true); return o.fun; }
export const solvedCount = (pred) => { const d = roboProgress().done; return Object.keys(d).filter((id) => !pred || pred(id)).length; };

// the player's design of one tool (the garage, src/robolab/garage.js)
export const toolLook = (tool) => { const L = roboProgress().look[tool]; return L && typeof L === 'object' ? { parts: { ...(L.parts || {}) }, paint: { ...(L.paint || {}) } } : { parts: {}, paint: {} }; };
export function setToolLook(tool, look) { const o = roboProgress(); o.look[tool] = { parts: { ...(look.parts || {}) }, paint: { ...(look.paint || {}) } }; save(o, { look: tool }); }
// a mission done on the player's own island (they are made anew each time, so only the count is kept)
export function addIsland() { const o = roboProgress(); o.isl += 1; save(o, { island: true }); return o.isl; }

// the program a child is building in a lesson, kept as it changes (Avi, 29.10: coming back to the menu or closing the
// game must not lose it). Its own key, so writing it does not wake the journey and the badges. Kept for the last 60
// lessons touched; a solved lesson keeps its draft too (the child may want to improve it).
const DRAFT_MAX = 60;
export function draftOf(id) {
  const o = readPlayer(K.robolabDraft, null);
  const d = o && typeof o === 'object' ? o[id] : null;
  return d && d.p && typeof d.p === 'object' ? d.p : null;
}
export function saveDraft(id, program) {
  let o = readPlayer(K.robolabDraft, null); if (!o || typeof o !== 'object') o = {};
  const empty = !program || !['robot', 'drone', 'sub'].some((k) => (program[k] || []).length) && !(program.on || []).length && !Object.values(program.defs || {}).some((l) => (l || []).length);
  if (empty) delete o[id]; else o[id] = { p: program, t: Date.now() };
  const ids = Object.keys(o).sort((a, b) => o[b].t - o[a].t);
  for (const k of ids.slice(DRAFT_MAX)) delete o[k];
  writePlayer(K.robolabDraft, o);
}
