// חוקרי הטבע – what each player solved (per player, like everything a child keeps; see core/profiles.js).
// { cases: { <caseId>: { stars: [healed, guess, thrift], at, spent, tries } } }
import { K as KEY, readPlayer, writePlayer } from '../core/storage.js';

const K = KEY.research;
export function researchProgress() {
  const o = readPlayer(K, {}); return o && typeof o === 'object' && o.cases ? o : { cases: {} };
}
// keeps the best stars of every try; true when this was the first time the case was solved
export function saveCaseResult(id, stars, info = {}) {
  const o = researchProgress();
  const was = o.cases[id];
  const best = was && Array.isArray(was.stars) ? was.stars.map((s, i) => s || !!stars[i]) : stars.slice();
  o.cases[id] = { stars: best, at: Date.now(), spent: info.spent, tries: ((was && was.tries) || 0) + 1 };
  writePlayer(K, o);   // a full or blocked storage only loses the stars
  try { window.dispatchEvent(new CustomEvent('wol-progress', { detail: { kind: 'case', id } })); } catch (e) { }
  return !was;
}
export const starsOf = (id) => { const c = researchProgress().cases[id]; return c && Array.isArray(c.stars) ? c.stars.filter(Boolean).length : 0; };
