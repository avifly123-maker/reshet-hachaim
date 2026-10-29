// מעבדת הרובוטים: every lesson and puzzle is solvable and fair (part of tools/check-all.sh).
//   - every listed solution passes, and at least two different solutions are listed (one way is never the only way)
//   - an empty program fails (the level asks for something), and every listed `wrong` program fails
//   - a level with variants must pass all of them (the same program on a few versions of the map)
//   - solutions use only the lesson's palette (plus the blocks the lesson gives ready-made)
//   - texts have a full form (f) and a vocalised beginners' form (k); ids are unique
// node tools/validate-robolab.mjs [--verbose]
import { runLevel } from '../src/robolab/engine/run.js';
import { levelsOf, usedBlocks } from '../src/robolab/engine/level.js';
import { BLOCKS, SENSORS } from '../src/robolab/engine/blocks.js';
import { ALL_LEVELS } from '../src/data/robolab/index.js';

const verbose = process.argv.includes('--verbose');
const errs = [];
const NIKUD = /[ְ-ׇּׁׂ]/;
const ids = new Set();
const txt = (o, where) => {
  if (!o || !o.f || !o.k) { errs.push(where + ': text needs f and k'); return; }
  if (!NIKUD.test(o.k)) errs.push(where + ': k has no nikud');
};
for (const L of ALL_LEVELS) {
  const w = L.id;
  if (ids.has(w)) errs.push(w + ': id twice'); ids.add(w);
  txt(L.title, w + ' title'); (L.say || []).forEach((s, i) => txt(s, w + ' say' + i));
  for (const b of L.blocks || []) if (!BLOCKS[b]) errs.push(w + ': unknown block ' + b);
  for (const v of L.variants || []) if (v.map) errs.push(w + ': a variant changes the map (only items, tools0, home may change)');
  const lev = levelsOf(L);
  const empty = runLevel(lev, {});
  if (empty.ok) errs.push(w + ': an empty program already passes');
  const sols = L.solutions || [];
  if (sols.length < 2) errs.push(w + ': needs at least two solutions (has ' + sols.length + ')');
  let best = 99;
  sols.forEach((p, i) => {
    const prog = { ...p, defs: { ...(L.defs0 || {}), ...(p.defs || {}) } };
    const r = runLevel(lev, prog);
    if (!r.ok) errs.push(`${w}: solution ${i + 1} fails (${r.why}${r.error ? ' at ' + r.error.x + ',' + r.error.y : ''})`);
    const allowed = new Set([...(L.blocks || []), 'call']);
    for (const b of usedBlocks(p)) if (!allowed.has(b)) errs.push(`${w}: solution ${i + 1} uses ${b}, not in the palette`);
    if (r.ok) best = Math.min(best, r.blocks);
    if (verbose) console.log(w, 'sol', i + 1, r.ok ? 'ok' : 'FAIL ' + r.why, 'blocks', r.blocks, 'steps', r.steps);
  });
  if (L.start0 && runLevel(lev, { ...L.start0, defs: { ...(L.defs0 || {}), ...(L.start0.defs || {}) } }).ok) errs.push(w + ': the program to fix (start0) already works');
  if (L.puzzle && !L.after) errs.push(w + ': a puzzle needs `after` (the lesson that opens it)');
  // programs that must NOT pass (a fixed path where the lesson wants an "if", one tool where it wants teamwork)
  (L.wrong || []).forEach((p, i) => { const r = runLevel(lev, { ...p, defs: { ...(L.defs0 || {}), ...(p.defs || {}) } }); if (r.ok) errs.push(`${w}: wrong program ${i + 1} passes, the lesson does not teach what it should`); });
  if (L.par && best < 99 && best > L.par + 4) errs.push(`${w}: par ${L.par} is far below the best listed solution (${best})`);
}
if (errs.length) { console.error('validate-robolab: ' + errs.length + ' problem(s)\n  ' + errs.join('\n  ')); process.exit(1); }
console.log('validate-robolab: ' + ALL_LEVELS.length + ' levels, every one solvable in at least two ways');
