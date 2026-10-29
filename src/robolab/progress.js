// מעבדת הרובוטים – what each player solved (per player, src/core/storage.js K.robolab).
// { done: { <levelId>: { stars, blocks, t } }, seen: { intro: 1, ... }, fun: n (funny blocks pressed, for a badge) }
// Writes fire 'wol-progress' { kind: 'robolab' } so מסע החוקר and the badges can count.
import { K, readPlayer, writePlayer } from '../core/storage.js';

const EMPTY = () => ({ done: {}, seen: {}, fun: 0 });
export function roboProgress() {
  const o = readPlayer(K.robolab, null);
  if (!o || typeof o !== 'object') return EMPTY();
  return { done: o.done && typeof o.done === 'object' ? o.done : {}, seen: o.seen && typeof o.seen === 'object' ? o.seen : {}, fun: o.fun | 0 };
}
function save(o, detail) {
  writePlayer(K.robolab, o);
  try { window.dispatchEvent(new CustomEvent('wol-progress', { detail: { kind: 'robolab', ...(detail || {}) } })); } catch (e) { }
}
// a solved level: keeps the best stars and the fewest blocks; returns { first, better }
export function markSolved(id, stars, blocks) {
  const o = roboProgress(); const was = o.done[id];
  const first = !was, better = !!was && (stars > was.stars || (stars === was.stars && blocks < was.blocks));
  if (first || better) o.done[id] = { stars: Math.max(stars, was ? was.stars : 0), blocks: was ? Math.min(blocks, was.blocks) : blocks, t: Date.now() };
  save(o, { id, first }); return { first, better };
}
export function markSeen(key) { const o = roboProgress(); if (!o.seen[key]) { o.seen[key] = 1; save(o); } }
export function addFun(n = 1) { const o = roboProgress(); o.fun += n; save(o); return o.fun; }
export const solvedCount = (pred) => { const d = roboProgress().done; return Object.keys(d).filter((id) => !pred || pred(id)).length; };
