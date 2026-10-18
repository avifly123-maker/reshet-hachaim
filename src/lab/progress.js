// מעבדת רובו־דע – what each player found and invented (per player, like everything a child keeps; see core/profiles.js).
// { found: { <sampleId>: [targetIndex, ...] }, seen: { <sampleId>: true } (discovery complete), inventions: { <id>: time },
//   tries: { <inventionId>: [{ choice, result }] } }
// The game reads hasInvention() to upgrade a device (the underwater robot with a shark-skin coat swims faster).
import { key as profileKey } from '../core/profiles.js';

const K = 'web-of-life-lab';
export function labProgress() {
  try {
    const o = JSON.parse(localStorage.getItem(profileKey(K)) || '{}');
    if (!o || typeof o !== 'object') throw 0;
    return { found: o.found || {}, seen: o.seen || {}, inventions: o.inventions || {}, tries: o.tries || {} };
  } catch (e) { return { found: {}, seen: {}, inventions: {}, tries: {} }; }
}
function save(o) { try { localStorage.setItem(profileKey(K), JSON.stringify(o)); } catch (e) { /* storage full or blocked: the lab still works */ } }
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
