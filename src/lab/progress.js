// מעבדת רובו־דע – what each player found and invented (per player, like everything a child keeps; see core/profiles.js).
// { found: { <sampleId>: [targetIndex, ...] }, seen: { <sampleId>: true } (discovery complete), inventions: { <id>: time },
//   tries: { <inventionId>: [{ choice, result }] }, think: { <activityId>: {...} } (the thinking corner, src/lab/thinking.js),
//   solved: { <problemId>: time }   (problems of "הממציאים" solved, mirrored from the hub's store for the research questions),
//   qs: { <questionId>: { g: guessIndex, watched?: time, done?: time } }   (שאלות חקר),
//   st: { <activityId>: {...} }   (the station worlds of the aquarium, the greenhouse and the cabinet: src/lab/aquarium.js, greenhouse.js, cabinet.js) }
// Older saves have no solved / qs / st: they default to empty. The storage key never changes.
// The game reads hasInvention() to upgrade a device (the underwater robot with a shark-skin coat swims faster).
import { key as profileKey } from '../core/profiles.js';

const K = 'web-of-life-lab';
const EMPTY = () => ({ found: {}, seen: {}, inventions: {}, tries: {}, solved: {}, qs: {}, think: {}, st: {} });
export function labProgress() {
  try {
    const o = JSON.parse(localStorage.getItem(profileKey(K)) || '{}');
    if (!o || typeof o !== 'object') throw 0;
    const obj = (v) => (v && typeof v === 'object' ? v : {});
    return { found: obj(o.found), seen: obj(o.seen), inventions: obj(o.inventions), tries: obj(o.tries), solved: obj(o.solved), qs: obj(o.qs), think: obj(o.think), st: obj(o.st) };
  } catch (e) { return EMPTY(); }
}
function save(o) {
  try { localStorage.setItem(profileKey(K), JSON.stringify(o)); } catch (e) { /* storage full or blocked: the lab still works */ }
  try { window.dispatchEvent(new CustomEvent('wol-progress', { detail: { kind: 'lab' } })); } catch (e) { }   // מסע החוקר counts lab activities
}
export function markFound(sample, idx, total) {
  const o = labProgress(); const f = new Set(o.found[sample] || []); f.add(idx); o.found[sample] = [...f];
  if (f.size >= total) o.seen[sample] = true;
  save(o); return o;
}
export function addTry(inv, choice, result) {
  const o = labProgress(); (o.tries[inv] = o.tries[inv] || []).push({ choice, result }); o.tries[inv] = o.tries[inv].slice(-8); save(o); return o;
}
export function invent(id) { const o = labProgress(); const first = !o.inventions[id]; if (first) o.inventions[id] = Date.now(); save(o); return first; }
export const hasInvention = (id) => !!labProgress().inventions[id];
export const sampleSeen = (id) => !!labProgress().seen[id];
// the thinking corner: one small record per activity; fn changes it in place
export function thinkUpdate(id, fn) { const o = labProgress(); const r = o.think[id] = o.think[id] || {}; try { fn(r); } catch (e) { /* */ } save(o); return r; }
export const thinkOf = (id) => labProgress().think[id] || {};
// problems solved in "הממציאים" (ids from src/data/inventions.js); several at once when syncing an old save
export function markSolved(ids) {
  const o = labProgress(); let changed = false;
  for (const id of [].concat(ids)) if (id && !o.solved[id]) { o.solved[id] = Date.now(); changed = true; }
  if (changed) save(o); return o;
}
export const problemSolved = (id) => !!labProgress().solved[id];
// research questions: the guess first, then (for watch questions) the observation, then the answer
export function setQuestion(id, patch) {
  const o = labProgress(); o.qs[id] = Object.assign({}, o.qs[id] || {}, patch); save(o); return o.qs[id];
}
// the station worlds (19.10): one small record per activity, like the thinking corner
export function stUpdate(id, fn) { const o = labProgress(); const r = o.st[id] = o.st[id] || {}; try { fn(r); } catch (e) { /* */ } save(o); return r; }
export const stOf = (id) => labProgress().st[id] || {};
