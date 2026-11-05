// מירוץ הרובוטים (1.4.4 set 7): every course can be won. The planner (engine/plan.js) must find a way for at least one
// ready robot, the engine must agree, and a wrong program must fail with a reason the screen has words for.
import { RACE_VERSIONS, RACE_BOTS, RACE_UI, SEGMENTS } from '../../src/data/weekly/race.js';
import { raceLevel, runRace } from '../../src/weekly/race-model.js';
import { planLevel } from '../../src/robolab/engine/plan.js';
import { PRESETS } from '../../src/data/robolab/workshop.js';

let bad = 0;
const fail = (m) => { bad++; console.log('FAIL ' + m); };
for (const [id, S] of Object.entries(SEGMENTS)) {
  if (S.rows.length !== 3 || S.rows.some((r) => r.length !== 6)) fail(id + ': a stretch is three rows of six cells');
  if (S.rows[1][0] === '#' || 'TRw#'.includes(S.rows[1][0]) || 'TRw#'.includes(S.rows[1][5])) fail(id + ': the middle row must be open at both ends');
}
for (const V of RACE_VERSIONS) {
  if (V.segs.length !== 5 || new Set(V.segs.map((s) => SEGMENTS[s].zone)).size !== 5) fail(V.id + ': five stretches, one from each island');
  const L = raceLevel(V), out = [];
  let any = 0;
  for (const b of RACE_BOTS) {
    const p = planLevel(L, PRESETS[b].build);
    if (!p) { out.push(b + ' -'); continue; }
    const r = runRace(V, PRESETS[b].build, p.prog);
    if (!r.ok) { fail(V.id + ': ' + b + ' plan does not pass in the engine (' + r.why + ')'); continue; }
    any++; out.push(b + ' ' + r.steps + '/' + r.blocks);
  }
  if (!any) fail(V.id + ': no ready robot can finish');
  // a program that is too short, and one that drives into the first wall
  const s = runRace(V, PRESETS.gardener.build, { robot: [{ b: 'fwd' }] });
  if (s.ok || !RACE_UI.why[s.why]) fail(V.id + ': a short program should fail with words (' + s.why + ')');
  const w = runRace(V, PRESETS.gardener.build, { robot: [{ b: 'left' }, { b: 'fwd' }, { b: 'fwd' }] });
  if (w.ok || !RACE_UI.why[w.why]) fail(V.id + ': a crash should fail with words (' + w.why + ')');
  console.log(V.id + ' ' + out.join(', '));
}
console.log(bad ? 'race: ' + bad + ' problems' : 'race: ' + RACE_VERSIONS.length + ' courses ok');
process.exit(bad ? 1 : 0);
