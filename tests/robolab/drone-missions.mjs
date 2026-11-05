// משימות רחפן (1.4.4 set 8): the three new things of the field, in the engine. A herd that is approached runs off
// ('scared'), the heat camera does not see a cold animal at night, and a camera trap's signal starts a "when a signal
// comes" handler at its own moment.
import { LESSONS } from '../../src/data/robolab/index.js';
import { levelsOf } from '../../src/robolab/engine/level.js';
import { runProgram } from '../../src/robolab/engine/run.js';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FAIL ' + m); } };
const L = (id) => LESSONS.find((q) => q.id === id);
const fw = (n) => Array.from({ length: n }, () => ({ b: 'fwd' }));
// the herd: flying straight at it scares it
{ const lv = levelsOf(L('l9-5'))[0]; const r = runProgram(lv, { drone: fw(6) }); ok(!r.ok && r.error && r.error.code === 'scared', 'a drone that flies at the herd scares it (' + (r.error && r.error.code) + ')'); }
// the herd keeps walking: its cell changes in the trace
{ const lv = levelsOf(L('l9-5'))[0]; const r = runProgram(lv, { drone: [{ b: 'repeat', n: 6, body: [{ b: 'wait' }] }] }); ok(r.trace.some((e) => e.a === 'move'), 'the herd walks'); }
// night: a cold animal is not seen, a warm one is
{ const lv = levelsOf(L('l9-3'))[0]; const r = runProgram(lv, { drone: [...fw(2), { b: 'photo' }] }); ok(r.state.items.find((it) => it.x === 3).done, 'a warm animal is photographed at night');
  const r2 = runProgram(lv, { drone: [...fw(4), { b: 'if', c: 'here_animal', then: [{ b: 'add' }], else: [] }, { b: 'report' }] }); ok(r2.state.reports[0] === 0, 'a cold animal is not seen at night');
  const r3 = runProgram({ ...lv, night: false }, { drone: [...fw(4), { b: 'if', c: 'here_animal', then: [{ b: 'add' }], else: [] }, { b: 'report' }] }); ok(r3.state.reports[0] === 1, 'by day the same animal is seen'); }
// the trap sends its signal at its moment, from the field
{ const lv = levelsOf(L('l9-1'))[1]; const r = runProgram(lv, { drone: [{ b: 'repeat', n: 12, body: [{ b: 'wait' }] }] }); const b = r.trace.find((e) => e.a === 'beep'); ok(b && b.t === 9 && r.state.msgs.some((q) => q.from === 'sensor'), 'the trap beeps at step 9'); }
console.log(bad ? 'drone missions: ' + bad + ' problems' : 'drone missions: herd, night and traps ok');
process.exit(bad ? 1 : 0);
