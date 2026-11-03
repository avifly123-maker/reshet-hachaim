// סדנת הרובוט (1.4.3, set 4): the workshop's missions as levels the lab runs (src/data/robolab/missions.js).
// Pure: no DOM. Read by the workshop's missions tab, by the lab (index.js openMission), by the validator and the tests.
//   missionBuild(spec)        a way's robot (a ready robot key, or { from, ...overrides }) as a full build
//   missionLevel(M, build)    the mission as a lab level that runs with this robot (L.build = { robot })
//   missionOpen(M, P)         can this player start it: the workshop reached its step, and the one before it in the zone is done
//   beginnerBuild(spec)       true when a beginner can build it (a ready robot with other wheels, tools, sensors)
import { MISSIONS } from '../data/robolab/missions.js';
import { PRESETS, PARTS } from '../data/robolab/workshop.js';
import { wkStepOf } from './earn.js';

const clone = (o) => JSON.parse(JSON.stringify(o));
// the motors a beginner's tools get by themselves (workshop-ui.js toggle does the same): one medium motor for each
// tool that moves, two at most
const autoMotors = (tools) => Array.from({ length: Math.min(2, (tools || []).filter((t) => PARTS[t] && PARTS[t].motor).length) }, () => 'motor_med');

export function missionBuild(spec) {
  if (!spec) return null;
  if (typeof spec === 'string') return PRESETS[spec] ? clone(PRESETS[spec].build) : null;
  const base = PRESETS[spec.from || 'gardener']; if (!base) return null;
  const { from, ...over } = spec;
  const b = { ...clone(base.build), ...clone(over) };
  if (!over.motors && over.tools) b.motors = autoMotors(b.tools);
  return b;
}
export function beginnerBuild(spec) {
  if (typeof spec === 'string') return true;
  return !!spec && Object.keys(spec).every((k) => ['from', 'wheels', 'tools', 'sensors'].includes(k));
}

export function missionLevel(M, build) {
  return { ...M, build: { robot: build } };
}

export const MISSION_BY = Object.fromEntries(MISSIONS.map((M) => [M.id, M]));
export const missionsOf = (zone) => MISSIONS.filter((M) => M.zone === zone).sort((a, b) => a.step - b.step || a.slot - b.slot);

// P = roboProgress(): P.wk.done holds the missions done ({ <id>: { stars, t } })
export function missionOpen(M, P) {
  const done = (P.wk && P.wk.done) || {};
  if (wkStepOf(P.wk) < M.step) return false;
  const list = missionsOf(M.zone), i = list.indexOf(M);
  return i <= 0 || !!done[list[i - 1].id];
}
