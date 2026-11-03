// A small planner for the ground robot (1.4.3, set 4: missions made from the child's own island). It writes a plain
// program (moves, turns, waits and actions, no loops) that does a level's jobs with a given robot, or says it cannot;
// the engine then runs the program to make sure. Used to check a mission before a child sees it (is it solvable, and
// by which robots) and by the tests. Pure, no DOM.
//   planLevel(level, build) → { prog, run, ticks } | null      level as engine/level.js gives it (map, items, tools, goal)
// The jobs come from the items: seed (plant, here), fruit and thirsty (pick, water: here, or ahead with a long reach),
// fire (spray, here or ahead), flower (pollen: here or ahead; the flower that gives pollen first, then its kind),
// feeder (drop a picked fruit, here or ahead), animal (photo: here or up to two ahead; and add, when the goal wants a
// report), net and trash (collect), log (lift). An item that appears later (it.appear) is waited for.
import { makeWorld, DIRS } from './world.js';
import { runLevel } from './run.js';

const JOB = {
  seed: { b: 'plant', far: 0 }, coral: { b: 'coral', far: 0 }, fruit: { b: 'pick', far: 'reach' }, thirsty: { b: 'water', far: 'reach' },
  fire: { b: 'spray', far: 1 }, flower: { b: 'pollen', far: 1 }, feeder: { b: 'drop', far: 1 }, animal: { b: 'photo', far: 2 },
  net: { b: 'collect', far: 'reach' }, trash: { b: 'collect', far: 'reach' }, log: { b: 'lift', far: 'reach' },
};
const goalsOf = (level) => (level.goal ? level.goal.all || [level.goal] : []);

export function planLevel(level, build) {
  const L = build ? { ...level, build: { robot: build } } : level;
  const W = makeWorld(L), R = W.tools.robot;
  if (!R) return null;
  const st = R.st, slow = st ? st.stepsPerMove : 1;
  const farOf = (j) => (j.far === 'reach' ? (st && st.reach ? 1 : 0) : j.far);
  const counting = goalsOf(level).some((c) => c.t === 'report');
  const items = W.items.filter((it) => JOB[it.t]).map((it) => ({ ...it }));
  const prog = [];
  let x = R.x, y = R.y, d = R.dir, carry = null, load = 0, ticks = 0;
  // shortest way (in steps) from here to a place where the job can be done: states are (x, y, dir)
  function route(target, far) {
    const key = (a, b, c) => a + ',' + b + ',' + c;
    const best = new Map([[key(x, y, d), 0]]);
    const open = [{ x, y, d, cost: 0, path: [] }];
    const ok = (s) => { for (let k = 0; k <= far; k++) if (s.x + DIRS[s.d][0] * k === target.x && s.y + DIRS[s.d][1] * k === target.y) return true; return false; };
    for (let guard = 0; open.length && guard < 30000; guard++) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (open[i].cost < open[bi].cost) bi = i;
      const s = open.splice(bi, 1)[0];
      if (ok(s)) return s;
      const ax = s.x + DIRS[s.d][0], ay = s.y + DIRS[s.d][1];
      const next = [{ x: s.x, y: s.y, d: (s.d + 1) % 4, cost: s.cost + 1, b: 'right' }, { x: s.x, y: s.y, d: (s.d + 3) % 4, cost: s.cost + 1, b: 'left' }];
      if (W.canGo('robot', ax, ay)) next.push({ x: ax, y: ay, d: s.d, cost: s.cost + slow, b: 'fwd' });
      for (const n of next) { const k = key(n.x, n.y, n.d); if (best.has(k) && best.get(k) <= n.cost) continue; best.set(k, n.cost); open.push({ ...n, path: [...s.path, n.b] }); }
    }
    return null;
  }
  const left = items.slice();
  while (left.length) {
    // the jobs that can be done now: a flower that takes pollen waits for its kind's pollen, a feeder for a fruit in hand
    const can = left.filter((it) => (it.t !== 'flower' || it.src || carry === it.kind) && (it.t !== 'feeder' || load > 0));
    let pick = null;
    for (const it of can) {
      const r = route(it, farOf(JOB[it.t])); if (!r) continue;
      const at = ticks + r.cost, cost = Math.max(at, it.appear || 0) + (it.appear ? 0.5 : 0);   // a later item is done last of all that wait
      if (!pick || cost < pick.cost) pick = { it, r, cost };
    }
    if (!pick) return null;
    prog.push(...pick.r.path.map((b) => ({ b })));
    ticks += pick.r.cost;
    while (pick.it.appear && ticks < pick.it.appear) { prog.push({ b: 'wait' }); ticks++; }   // it comes a little later: wait for it
    prog.push({ b: JOB[pick.it.t].b }); ticks++;
    if (counting && pick.it.t === 'animal') { prog.push({ b: 'add' }); ticks++; }
    x = pick.r.x; y = pick.r.y; d = pick.r.d;
    if (pick.it.t === 'flower' && pick.it.src) carry = pick.it.kind;
    if (pick.it.t === 'fruit') load++;
    if (pick.it.t === 'feeder') load--;
    left.splice(left.indexOf(pick.it), 1);
  }
  if (counting) { prog.push({ b: 'report' }); ticks++; }
  // a goal that also wants the robot back home
  if (goalsOf(level).some((c) => c.t === 'home') && level.home) { const r = route(level.home, 0); if (!r) return null; prog.push(...r.path.map((b) => ({ b }))); ticks += r.cost; }
  const program = { robot: prog };
  const run = runLevel([L], program);
  return run.ok ? { prog: program, run, ticks: run.steps } : null;
}
