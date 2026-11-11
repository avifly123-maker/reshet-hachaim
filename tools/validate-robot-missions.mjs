// סדנת הרובוט (1.4.3, set 4): every workshop mission is solvable in several ways and fair (part of tools/check-all.sh).
//   - at least three ways pass (every variant), with at least two different robots among them
//   - an empty program fails with each way's robot, and every `wrong` fails
//   - each way's robot is a legal build and uses only parts open at the mission's step (earn 'wk:<n>', n ≤ step)
//   - one way is a robot a beginner can build (a ready robot, other wheels, tools and sensors only), unless kids: false
//   - the ways use only the mission's palette; ids unique; zone and slot match mission-kinds.js; texts have f and k
//   - the first missions of the workshop (step ≤ 3) are enough to reach step 4 (WK_STEPS: missions 3)
// node tools/validate-robot-missions.mjs [--verbose]
import { runLevel } from '../src/robolab/engine/run.js';
import { levelsOf, usedBlocks } from '../src/robolab/engine/level.js';
import { checkBuild } from '../src/robolab/engine/build.js';
import { BLOCKS } from '../src/robolab/engine/blocks.js';
import { MISSIONS, TEMPLATE_MISSIONS } from '../src/data/robolab/missions.js';
import { makeMission, practiceView, templateStep, TEMPLATE_IDS } from '../src/robolab/island-missions.js';
import { ZONE_IDS } from '../src/data/zones.js';
import { SLOTS } from '../src/data/robolab/mission-kinds.js';
import { CHASSIS, PARTS, WK_STEPS } from '../src/data/robolab/workshop.js';
import { missionBuild, beginnerBuild, missionLevel } from '../src/robolab/missions.js';

const verbose = process.argv.includes('--verbose');
const errs = [];
const NIKUD = /[ְ-ׇּׁׂ]/;
const ALL = { ...CHASSIS, ...PARTS };
const txt = (o, where) => {
  if (!o || !o.f || !o.k) { errs.push(where + ': text needs f and k'); return; }
  if (!NIKUD.test(o.k)) errs.push(where + ': k has no nikud');
};
const partsOf = (b) => [b.chassis, b.wheels, b.drive, b.gear, ...(b.motors || []), ...(b.tools || []), ...(b.mechs || []), ...(b.sensors || []), ...(b.extras || [])].filter(Boolean);
const stepOfPart = (id) => +(String((ALL[id] || {}).earn || 'wk:99').split(':')[1]);
const ids = new Set(), slots = new Set();
for (const M of MISSIONS) {
  const w = M.id;
  if (ids.has(w)) errs.push(w + ': id twice'); ids.add(w);
  if (!M.mission) errs.push(w + ': mission: true is missing');
  const S = SLOTS[M.zone] && SLOTS[M.zone][M.slot];
  if (!S) errs.push(w + ': no slot ' + M.slot + ' in ' + M.zone);
  if (slots.has(M.zone + M.slot)) errs.push(w + ': slot used twice'); slots.add(M.zone + M.slot);
  if (!(M.step >= 1 && M.step < WK_STEPS.length)) errs.push(w + ': step must be 1..' + (WK_STEPS.length - 1));
  txt(M.title, w + ' title'); (M.say || []).forEach((s, i) => txt(s, w + ' say' + i)); txt(M.need, w + ' need'); txt(M.end, w + ' end');
  if (!M.say || !M.say.length) errs.push(w + ': say is missing');
  for (const b of M.blocks || []) if (!BLOCKS[b]) errs.push(w + ': unknown block ' + b);
  const ways = M.ways || [];
  if (ways.length < 3) errs.push(w + ': needs at least three ways (has ' + ways.length + ')');
  const robots = new Set();
  let best = 99, kidsOk = false;
  ways.forEach((way, i) => {
    const b = missionBuild(way.robot), at = `${w} way ${i + 1}`;
    if (!b) { errs.push(at + ': unknown robot'); return; }
    const chk = checkBuild(b);
    if (!chk.ok) { errs.push(at + ': robot breaks a rule (' + chk.problems.map((q) => q.code + (q.part ? ' ' + q.part : '')).join(', ') + ')'); return; }
    for (const p of partsOf(b)) if (stepOfPart(p) > M.step) errs.push(`${at}: ${p} opens at step ${stepOfPart(p)}, the mission at ${M.step}`);
    robots.add(JSON.stringify(b));
    if (beginnerBuild(way.robot)) kidsOk = true;
    const lev = levelsOf(missionLevel(M, b));
    if (runLevel(lev, {}).ok) errs.push(at + ': an empty program already passes');
    const r = runLevel(lev, way.prog);
    if (!r.ok) errs.push(`${at}: fails (${r.error ? r.error.code : r.why}${r.error && r.error.x != null ? ' at ' + r.error.x + ',' + r.error.y : ''}${r.variants > 1 ? ', variant ' + (r.variant + 1) : ''})`);
    const allowed = new Set([...(M.blocks || []), 'call']);
    for (const x of usedBlocks(way.prog)) if (!allowed.has(x)) errs.push(`${at}: uses ${x}, not in the palette`);
    if (r.ok) best = Math.min(best, r.blocks);
    if (verbose) console.log(w, 'way', i + 1, r.ok ? 'ok' : 'FAIL ' + (r.error ? r.error.code : r.why), 'blocks', r.blocks, 'steps', r.steps);
  });
  if (robots.size < 2) errs.push(w + ': the ways need at least two different robots');
  if (!kidsOk && M.kids !== false) errs.push(w + ': no way a beginner can build (or kids: false)');
  if (M.par && best < 99 && best > M.par) errs.push(`${w}: par ${M.par} but the best way takes ${best}`);
  (M.wrong || []).forEach((x, i) => {
    const b = missionBuild(x.robot || (ways[0] && ways[0].robot));
    if (!b || !checkBuild(b).ok) { errs.push(`${w} wrong ${i + 1}: robot is not a legal build`); return; }
    const r = runLevel(levelsOf(missionLevel(M, b)), x.prog);
    if (r.ok) errs.push(`${w}: wrong ${i + 1} passes`);
    if (verbose) console.log(w, 'wrong', i + 1, r.ok ? 'PASSES' : 'fails ' + (r.error ? r.error.code : r.why));
  });
}
// the template missions: each is made on its zone's practice island at every step from its own to the last (that is
// where it opens when the child's own island cannot give it); the same checks as above on what comes out
const species = {}; for (const z of ZONE_IDS) species[z] = (await import('../src/data/' + z + '.js')).BIOME.species;
let tplMade = 0;
for (const T of TEMPLATE_MISSIONS) {
  const w = T.id;
  if (ids.has(w)) errs.push(w + ': id twice'); ids.add(w);
  if (!TEMPLATE_IDS.includes(T.tpl)) { errs.push(w + ': unknown template ' + T.tpl); continue; }
  if (T.step < templateStep(T.tpl)) errs.push(`${w}: step ${T.step} is before its template's tools (${templateStep(T.tpl)})`);
  if (!SLOTS[T.zone] || !SLOTS[T.zone][T.slot]) errs.push(w + ': no slot ' + T.slot);
  if (slots.has(T.zone + T.slot)) errs.push(w + ': slot used twice'); slots.add(T.zone + T.slot);
  const view = practiceView(T.zone, species[T.zone]);
  for (let st = T.step; st < WK_STEPS.length; st++) {
    const M = makeMission(view, { zone: T.zone, species: species[T.zone], step: st, seed: 1, tpl: T.tpl, shape: T.shape, id: T.id });
    if (!M) { errs.push(`${w}: the practice island gives no mission at step ${st}`); continue; }
    tplMade++;
    for (const k of ['title', 'need', 'end']) txt(M[k], `${w} ${k}`); M.say.forEach((q, i) => txt(q, `${w} say${i}`));
    const robots = new Set(M.ways.map((q) => JSON.stringify(missionBuild(q.robot))));
    if (M.ways.length < 3 || robots.size < 2) errs.push(`${w}: step ${st}: ${M.ways.length} ways, ${robots.size} robots`);
    for (const q of M.ways) {
      const b = missionBuild(q.robot);
      for (const p of partsOf(b)) if (stepOfPart(p) > st) errs.push(`${w}: step ${st}: ${p} is not open yet`);
      const r = runLevel(levelsOf(missionLevel(M, b)), q.prog); if (!r.ok) errs.push(`${w}: step ${st}: a way fails (${r.error ? r.error.code : r.why})`);
      if (runLevel(levelsOf(missionLevel(M, b)), {}).ok) errs.push(`${w}: an empty program passes`);
      if (!beginnerBuild(q.robot)) errs.push(`${w}: a way a beginner cannot build`);
    }
    if (M.start0 && runLevel(levelsOf(missionLevel(M, missionBuild(M.ways[0].robot))), M.start0).ok) errs.push(`${w}: the program to fix already works`);
    if (T.shape === 'reverse' && !M.start0) errs.push(`${w}: a reverse mission without a program to fix`);
    if (T.shape === 'change' && !M.items.some((it) => it.appear)) errs.push(`${w}: a change mission where nothing appears`);
    if (T.shape === 'rescue' && !M.goal.all.some((c) => c.t === 'steps')) errs.push(`${w}: a rescue without a step limit`);
  }
}
// every zone has six missions in all
for (const z of ZONE_IDS) { const n = MISSIONS.filter((M) => M.zone === z).length + TEMPLATE_MISSIONS.filter((M) => M.zone === z).length; if (n !== 6) errs.push(`${z}: ${n} missions (six in each zone)`); }

// the workshop's step 4 needs three missions done: there must be at least three that open before it
const early = MISSIONS.filter((M) => M.step <= 3).length + TEMPLATE_MISSIONS.filter((M) => M.step <= 3).length, need4 = WK_STEPS[4] && WK_STEPS[4].need.missions;
if (need4 && early < need4) errs.push(`only ${early} missions open before step 4, which needs ${need4}`);

if (errs.length) { console.error('validate-robot-missions: ' + errs.length + ' problem(s)\n  ' + errs.join('\n  ')); process.exit(1); }
console.log(`validate-robot-missions: ${MISSIONS.length} hand-made and ${TEMPLATE_MISSIONS.length} template missions ok (${tplMade} made on the practice islands)`);
