// Every mystery must be a real puzzle: doing nothing fails, each trap fails on its own, and the intended fix (and at
// least one other route) reaches balance in reasonable time.   node tests/research/solvable.mjs
import { simulate } from './sim.mjs';
import { CASES } from '../../src/research/cases/index.js';

let bad = 0;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) bad++; };
for (const C of CASES) {
  const T = C.tests; if (!T) { check(false, `${C.id}: no tests`); continue; }
  // every check with short, normal and long seasons (in the game a season's length depends on how fast nights pass)
  for (const seasonLen of [150, 270, 400]) {
    const o = { seasonLen };
    const r0 = simulate(C, [], o);
    check(r0.solvedAt == null, `${C.id} [season ${seasonLen}s]: doing nothing does not heal it`);
    for (const [name, script] of Object.entries(T.traps)) { const r = simulate(C, script, o); check(r.solvedAt == null, `${C.id} [season ${seasonLen}s]: trap "${name}" alone fails`); }
    let others = 0;
    for (const [name, script] of Object.entries(T.fixes)) { const r = simulate(C, script, o); if (r.other) others++; check(r.solvedAt != null && r.solvedAt <= T.within, `${C.id} [season ${seasonLen}s]: fix "${name}" heals it (${r.solvedAt ?? 'never'} s, limit ${T.within})${r.other ? ' – another way' : ''}`); }
    // middle and advanced are a sandbox: besides the usual route there must be at least one other way that heals it
    if (C.level !== 'kids') check(others >= 1, `${C.id} [season ${seasonLen}s]: ${others} fix(es) heal it without the usual route (mainFix)`);
  }
}
if (bad) { console.log(`\n${bad} check(s) failed`); process.exit(1); }
console.log('\nall mysteries solvable');
