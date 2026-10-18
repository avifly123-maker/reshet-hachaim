// Runs a case with a script of ideas through the same rules the game uses (src/research/runner.js) and reports
// when (if ever) the mystery was solved.
//   node tests/research/sim.mjs [scenario]   → prints the scenarios of the first case (with a table for one)
// Seasons: in the game a season lasts a game day, and nights pass faster, so the length varies; the solvability test
// runs every script with several season lengths.
import { createRunner } from '../../src/research/runner.js';
import { CASES } from '../../src/research/cases/index.js';

const SEASONS = ['winter', 'spring', 'summer', 'autumn'];
export function simulate(C, script = [], { until = 900, every = 30, quiet = true, seasonLen = 270, ffAfter = true } = {}) {
  const r = createRunner(C);
  const m = r.model;
  const rows = [];
  let solvedAt = null, rate = 1, ffLeft = 0;
  const surp = [];
  const acts = script.slice().sort((a, b) => a.t - b.t);
  const start = C.scene?.season || 0;
  for (let t = 0; t <= until; t += 0.25) {
    while (acts.length && acts[0].t <= t) {
      const a = acts.shift(); const idea = r.ideaOf(a.idea);
      r.apply(a.idea, a.n ?? idea.amounts[0]);
      if (ffAfter) ffLeft = 90;   // the child presses "see what happens": the model runs 3x for 90 model seconds
    }
    rate = ffLeft > 0 ? 3 : 1;
    const dt = 0.25 * rate; ffLeft -= dt;
    r.step(dt, C.zone === 'grove' ? SEASONS[(Math.floor(m.state.t / seasonLen) + start) % 4] : null);
    if (r.solved && solvedAt == null) solvedAt = +m.state.t.toFixed(1);
    if (Math.abs((t * 4) % 4) < 0.01) for (const S of r.surprises()) surp.push(S.id + '@' + Math.round(m.state.t));
    if (!quiet && Math.abs(t % every) < 0.01) rows.push([t, ...Object.keys(m.state.v).map((k) => k + '=' + m.get(k).toFixed(1))].join('  '));
  }
  if (!quiet) rows.forEach((x) => console.log(x));
  return { solvedAt, spent: r.spent, final: { ...m.state.v }, surprises: surp, other: r.otherWay() };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // node tests/research/sim.mjs [case id] [scenario]
  const C = CASES.find((c) => c.id === process.argv[2]) || CASES[0], only = CASES.some((c) => c.id === process.argv[2]) ? process.argv[3] : process.argv[2];
  const all = { nothing: [], ...C.tests.traps, ...C.tests.fixes };
  for (const [k, s] of Object.entries(all)) {
    if (only && k !== only) continue;
    const r = simulate(C, s, { quiet: !only });
    console.log(k.padEnd(34), 'solved', String(r.solvedAt).padEnd(6), 'spent', String(r.spent).padEnd(3), r.other ? 'OTHER' : '     ', r.surprises.join(' '));
  }
}
