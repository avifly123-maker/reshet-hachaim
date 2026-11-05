// מירוץ הרובוטים (1.4.4 set 7): the course as an engine level, a run of one program with one robot, and the run's
// path for the 3D view and the ghost. Pure, no DOM (tests/weekly/race.mjs runs it in node).
//   raceLevel(V) → level      runRace(V, build, program) → engine result + { path, why }
//   pathOf(trace) → [[t, x, y, dir], ...]   the robot's places by tick (a small list: it is saved as the ghost)
//   botBuild(id, mine) → build             a ready robot (PRESETS) or one of the child's own
import { SEGMENTS, RACE_BATTERY } from '../data/weekly/race.js';
import { runProgram } from '../robolab/engine/run.js';
import { PRESETS } from '../data/robolab/workshop.js';

export const SEG_W = 6;
export function raceLevel(V) {
  const rows = [0, 1, 2].map((r) => '.' + V.segs.map((id) => SEGMENTS[id].rows[r]).join('') + '.');
  const W = rows[0].length;
  return { map: { rows }, tools: { robot: { x: 0, y: 1, dir: 1 } }, home: { x: W - 1, y: 1 }, batteryK: RACE_BATTERY, goal: { t: 'home', tool: 'robot' }, maxTicks: 400 };
}
export const segOfX = (x) => Math.max(0, Math.min(4, Math.floor((x - 1) / SEG_W)));
export function pathOf(trace) {
  const out = [];
  for (const e of trace || []) if (e.tool === 'robot' && e.x != null) { const last = out[out.length - 1]; if (!last || last[1] !== e.x || last[2] !== e.y || last[3] !== e.dir || e.a === 'fail') out.push([e.t, e.x, e.y, e.dir]); }
  return out;
}
export function botBuild(id, mine = []) {
  if (PRESETS[id]) return PRESETS[id].build;
  const r = mine.find((q) => q.id === id); return r ? r.build : null;
}
export function runRace(V, build, program) {
  const L = raceLevel(V);
  const r = runProgram({ ...L, build: { robot: build } }, program);
  let why = null;
  if (!r.ok) why = (r.error && r.error.code) || (r.why === 'home' || r.why === 'goal' || !r.error ? 'short' : 'any');
  return { ...r, why, path: pathOf(r.trace), level: L };
}
