// 7.11 (Avi): hints in the robot lab's lessons and the first-time concept cards: node tests/robolab/hints.mjs (part of
// tools/check-all.sh). Every lesson, puzzle and hand-made workshop mission has three hints in both kinds of words; the
// way they show is the shortest working one; every concept used by a level has its card; nothing prints "undefined".
import { ALL_LEVELS } from '../../src/data/robolab/index.js';
import { MISSIONS } from '../../src/data/robolab/missions.js';
import { hintsFor, conceptHTML, CONCEPT_CARD, waysOf } from '../../src/robolab/hints.js';
import { BLOCKS } from '../../src/robolab/engine/blocks.js';

const errs = [];
const nik = /[ְ-ּ]/;
const walk = (xs, f) => (xs || []).forEach((nd) => { f(nd); walk(nd.body, f); walk(nd.then, f); walk(nd.else, f); });
let n = 0;
for (const L of [...ALL_LEVELS, ...MISSIONS.map((M) => ({ ...M, mission: true }))]) {
  for (const kids of [false, true]) {
    const H = hintsFor(L, kids);
    if (H.length !== 3) errs.push(`${L.id}: ${H.length} hints`);
    for (const h of H) {
      if (!h.title || !h.html || /undefined|NaN|\[object/.test(h.title + h.html)) errs.push(`${L.id}${kids ? ' (kids)' : ''}: bad hint "${h.title}"`);
      if (kids && !nik.test(h.title)) errs.push(`${L.id}: kids hint title without nikud`);
    }
    if (H[1] && !/rh-b/.test(H[1].html)) errs.push(`${L.id}: hint 2 shows no block`);
    n++;
  }
  // every block the way uses is a known block (so it can be drawn)
  const w = waysOf(L)[0];
  if (w) for (const k of ['robot', 'drone', 'sub']) walk(w[k], (nd) => { if (!BLOCKS[nd.b]) errs.push(`${L.id}: unknown block ${nd.b}`); });
  if (L.concept && !CONCEPT_CARD[L.concept]) errs.push(`${L.id}: no concept card for "${L.concept}"`);
}
for (const [c, C] of Object.entries(CONCEPT_CARD)) {
  for (const kids of [false, true]) { const h = conceptHTML(c, kids); if (!h || /undefined|NaN/.test(h.title + h.html)) errs.push(`concept ${c}: bad card`); }
  if (!nik.test(C.k) || !nik.test(C.t.k)) errs.push(`concept ${c}: kids words without nikud`);
  for (const nd of C.ex || []) walk([nd], (x) => { if (!BLOCKS[x.b]) errs.push(`concept ${c}: unknown block ${x.b}`); });
}
if (hintsFor({ sandbox: true, concept: 'loop' }, false).length) errs.push('the sandbox should have no hints');
if (errs.length) { console.log(errs.join('\n')); process.exit(1); }
console.log(`robot lab hints: ${n / 2} levels with three hints each, ${Object.keys(CONCEPT_CARD).length} concept cards`);
