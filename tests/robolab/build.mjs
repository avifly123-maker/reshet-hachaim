// 1.4.3 set 2: the robot workshop's engine without the screen: node tests/robolab/build.mjs (part of tools/check-all.sh).
// The catalogue, the building rules, the numbers of a build, and what they change in a real run of the engine.
import { CHASSIS, PARTS, PRESETS, FAMILIES } from '../../src/data/robolab/workshop.js';
import { PARTS as LOOK_PARTS } from '../../src/data/robolab/parts.js';
import { SHAPES, ZONE_STYLES, LEVELS, SLOTS } from '../../src/data/robolab/mission-kinds.js';
import { checkBuild, statsOf, partsFor } from '../../src/robolab/engine/build.js';
import { runProgram } from '../../src/robolab/engine/run.js';
import { BLOCKS } from '../../src/robolab/engine/blocks.js';
import { FAIL_LINES, OOPS_LINES, GOAL_LINES } from '../../src/data/robolab/lines.js';

const fails = [];
const ok = (c, msg) => { if (!c) fails.push(msg); };
const NIKUD = /[ְ-ׇ]/;
const EARN = /^(start|lesson:l\d-\d+|chapter:\d+|stars:\d+|puzzles:\d+|mission:[\w-]+|badge:[\w:-]+)$/;

// ── the catalogue
const ids = Object.keys(PARTS);
ok(ids.length >= 40, `about 40 parts (${ids.length})`);
for (const fam of Object.keys(FAMILIES)) ok(ids.filter((id) => PARTS[id].fam === fam).length >= 2 || fam === 'chassis', `family ${fam} has parts`);
for (const [id, p] of [...Object.entries(PARTS), ...Object.entries(CHASSIS)]) {
  ok(FAMILIES[p.fam], `${id}: a family`);
  ok(p.f && p.k && NIKUD.test(p.k), `${id}: a name and a vocalised name`);
  ok(p.mass > 0, `${id}: a weight`);
  ok(EARN.test(p.earn), `${id}: how it is earned (${p.earn})`);
  if (p.mesh) ok(LOOK_PARTS[p.mesh], `${id}: its Blender part ${p.mesh} exists`);
  for (const b of p.gives || []) ok(BLOCKS[b], `${id}: gives a real block ${b}`);
}
for (const [k, pr] of Object.entries(PRESETS)) ok(checkBuild(pr.build).ok, `the ready robot ${k} keeps the rules (${JSON.stringify(checkBuild(pr.build).problems)})`);

// ── the building rules
const base = () => JSON.parse(JSON.stringify(PRESETS.picker.build));
const codes = (b) => checkBuild(b).problems.map((p) => p.code);
{ const b = base(); b.motors = ['motor_med', 'motor_med', 'motor_big']; ok(codes(b).includes('motors'), 'five motors break the rule of four'); }
{ const b = base(); b.tools = ['claw', 'scoop', 'net']; ok(codes(b).includes('toolpoints'), 'three tools do not fit two tool points'); }
{ const b = base(); b.wheels = null; ok(codes(b).includes('wheels'), 'a robot needs wheels'); }
{ const b = base(); b.motors = []; ok(codes(b).includes('toolmotor'), 'a claw needs a motor of its own'); }
{ const b = base(); b.chassis = 'ch_s'; b.tools = ['claw', 'sprayer']; b.sensors = ['color', 'distance', 'camera', 'touch']; b.extras = ['solar']; ok(codes(b).includes('room'), 'too many parts do not fit a small chassis'); }

// ── the numbers
const S = (b) => statsOf(b);
{ const a = base(), b = base(); b.extras = ['ballast']; ok(S(b).speed < S(a).speed && S(b).mass > S(a).mass, 'a heavier robot is slower'); }
{ const a = base(), b = base(); b.drive = 'motor_big'; b.gear = 'gear_strong'; ok(S(b).force > S(a).force && S(b).speed < S(a).speed, 'a big motor and strong gears: more force, less speed'); }
{ const a = base(), b = base(); b.wheels = 'wheel_wide'; ok(S(b).grip.sand > 0.5 && S(a).grip.sand < 0.5, 'wide wheels hold in sand, medium wheels do not'); }
ok(partsFor('pick').includes('claw') && partsFor('animal').includes('camera'), 'partsFor knows which parts give a block or a sensor');

// ── a run with a build (level.build.robot); the same run without a build is a lesson as before
const lvl = (rows, extra = {}) => ({ map: { rows }, tools: { robot: { x: 0, y: 0, dir: 1 } }, goal: { t: 'reach', tool: 'robot', x: rows[0].length - 1, y: 0 }, ...extra });
const go = (n) => ({ robot: [{ b: 'repeat', n: Math.min(50, n), body: [{ b: 'fwd' }] }, ...(n > 50 ? [{ b: 'repeat', n: n - 50, body: [{ b: 'fwd' }] }] : [])] });   // a repeat block counts to 50 at most
const run = (rows, build, prog, extra) => runProgram({ ...lvl(rows, extra), ...(build ? { build: { robot: build } } : {}) }, prog);
{ const r0 = run(['.ss.'], null, go(3)), r1 = run(['.ss.'], base(), go(3)); const w = base(); w.wheels = 'wheel_wide'; const r2 = run(['.ss.'], w, go(3));
  ok(r0.ok, 'without a build the sand is plain ground (the 1.4.1 lessons)');
  ok(!r1.ok && r1.error.code === 'stuck' && r1.error.need.includes('wheel_wide'), 'medium wheels get stuck in sand, and the hint names wide wheels');
  ok(r2.ok, 'wide wheels cross the sand'); }
{ const r = run(['..'], base(), { robot: [{ b: 'plant' }] }); ok(r.error && r.error.code === 'nopart' && r.error.need.includes('seedbox'), 'no seed box: "no part for planting", and which part would do it'); }
{ const b = base(); b.sensors = ['distance']; const r = run(['...'], b, { robot: [{ b: 'if', c: 'fruit', then: [{ b: 'pick' }] }] }); ok(r.error && r.error.code === 'nosensor' && r.error.need.includes('color'), 'no colour sensor: it cannot test for fruit'); }
{ const d = PRESETS.digger.build; const rd = run(['....'], d, go(3)), rp = run(['....'], base(), go(3)); ok(rd.ok && rp.ok && rd.steps >= rp.steps * 2, `a slow heavy robot takes longer (${rd.steps} steps against ${rp.steps})`); }
{ const long = '.'.repeat(40); const rd = run([long], PRESETS.digger.build, go(39)), rl = run([long], base(), go(39)); ok(!rd.ok && rd.error.code === 'flat' && rl.ok, 'a heavy robot on tracks runs out of battery on a long way, a light one gets there'); }
{ const rw = run(['.h.'], base(), go(2)), rd = run(['.h.'], PRESETS.digger.build, go(2)); ok(rw.error && rw.error.code === 'weak' && rd.ok, 'a slope needs force: the picker fails, the strong one climbs'); }
{ const rp = run(['.n.'], base(), go(2)), rg = run(['.n.'], PRESETS.gardener.build, go(2)); ok(rp.error && rp.error.code === 'slip' && rg.ok, 'a narrow log needs precision: a caster ball (or a gyro) makes it'); }
{ const f = base(); f.extras = ['float']; const r0 = run(['.w.'], base(), go(2)), r1 = run(['.w.'], f, go(2)); ok(r0.error && r0.error.code === 'sink' && r1.ok, 'shallow water: it sinks without a float and crosses with one'); }
{ const d = PRESETS.digger.build;
  const lv = { map: { rows: ['....'] }, tools: { robot: { x: 0, y: 0, dir: 1 } }, items: [{ t: 'rock', x: 1, y: 0, w: 2 }], goal: { t: 'cleared' } };
  const r1 = runProgram({ ...lv, build: { robot: d } }, { robot: [{ b: 'push' }] }), r2 = runProgram({ ...lv, build: { robot: base() } }, { robot: [{ b: 'push' }] });
  ok(r1.ok, 'the pusher moves a rock away'); ok(r2.error && r2.error.code === 'nopart' && r2.error.need.includes('pusher'), 'no pusher: no pushing'); }
{ const g = PRESETS.gardener.build; const items = Array.from({ length: 7 }, (_, i) => ({ t: 'seed', x: i + 1, y: 0 }));
  const prog = { robot: [{ b: 'repeat', n: 7, body: [{ b: 'fwd' }, { b: 'plant' }] }] };
  const r = runProgram({ map: { rows: ['........'] }, tools: { robot: { x: 0, y: 0, dir: 1 } }, items, goal: { t: 'done', item: 'seeds' }, build: { robot: g } }, prog);
  ok(!r.ok && r.trace.some((e) => e.a === 'oops' && e.want === 'noseeds'), 'the seed box holds six seeds: the seventh plant finds it empty'); }
{ const light = { chassis: 'ch_s', wheels: 'wheel_s', drive: 'motor_med', motors: [], tools: ['seedbox'], mechs: [], sensors: ['color'], extras: [] };
  const sun = { ...light, extras: ['solar'] }, long = '.'.repeat(70);
  const rs = run([long], sun, go(69)), rn = run([long], light, go(69));
  ok(rs.ok && !rn.ok && rn.error.code === 'flat', 'on a light robot a solar panel keeps it going in daylight (without it the battery runs out)');
  const heavy = base(), heavySun = { ...base(), extras: ['solar'] };
  ok(statsOf(heavySun).moveDrain > statsOf(heavy).moveDrain, 'on a robot near the weight line the panel\'s weight costs more than it gives'); }

// ── every new failure and mistake has its words ("מה קרה?")
for (const c of ['nopart', 'nosensor', 'stuck', 'weak', 'slip', 'sink', 'heavy', 'flat']) ok(FAIL_LINES[c] && NIKUD.test(FAIL_LINES[c][0].k), `words for ${c}`);
for (const c of ['push', 'lift', 'noseeds', 'nowater']) ok(OOPS_LINES[c], `oops words for ${c}`);
for (const c of ['cleared', 'done:logs', 'battery']) ok(GOAL_LINES[c], `goal words for ${c}`);

// ── the mission table (set 4 builds on it)
for (const z of Object.keys(ZONE_STYLES)) {
  const s = SLOTS[z] || [];
  ok(s.length === 6, `${z}: six mission slots`);
  ok(new Set(s.map((x) => x.shape)).size >= 4, `${z}: at least four different forms`);
  for (const x of s) ok(SHAPES[x.shape] && x.t && x.tests.length, `${z}: ${x.t} has a form and what it tests`);
}
for (const k of Object.keys(SHAPES)) ok(Object.values(SLOTS).some((s) => s.some((x) => x.shape === k)), `the form ${k} is used`);
ok(Object.keys(LEVELS).length === 3, 'three levels');

if (fails.length) { console.log('robot workshop engine:\n  ' + fails.join('\n  ')); process.exit(1); }
console.log(`robot workshop engine: ${ids.length} parts, ${Object.keys(PRESETS).length} ready robots, all rules hold`);
