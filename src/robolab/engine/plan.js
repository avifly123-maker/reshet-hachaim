// A small planner for the ground robot (1.4.3, set 4: missions made from the child's own island). It writes a plain
// program (moves, turns and actions, no loops) that does a level's jobs with a given robot, or says it cannot; the
// engine then runs the program to make sure. Used to check a mission before a child sees it: is it solvable, and by
// which robots. Pure, no DOM.
//   planLevel(level, build) → { prog, run } | null      level as engine/level.js gives it (map, items, tools, goal)
// The jobs come from the items: seed (plant, here), fruit and thirsty (pick, water: here, or ahead with a long reach),
// fire (spray, here or ahead), flower (pollen: here or ahead; the flower that gives pollen first, then its kind),
// animal (photo: here or up to two ahead), net and trash (collect, here or with reach), log (lift, here or with reach).
import { makeWorld, DIRS, cellAt } from './world.js';
import { runLevel } from './run.js';

const JOB = {
  seed: { b: 'plant', far: 0 }, coral: { b: 'coral', far: 0 }, fruit: { b: 'pick', far: 'reach' }, thirsty: { b: 'water', far: 'reach' },
  fire: { b: 'spray', far: 1 }, flower: { b: 'pollen', far: 1 }, animal: { b: 'photo', far: 2 }, net: { b: 'collect', far: 'reach' },
  trash: { b: 'collect', far: 'reach' }, log: { b: 'lift', far: 'reach' },
};

export function planLevel(level, build) {
  const L = build ? { ...level, build: { robot: build } } : level;
  const W = makeWorld(L), R = W.tools.robot;
  if (!R) return null;
  const st = R.st, slow = st ? st.stepsPerMove : 1;
  const farOf = (j) => (j.far === 'reach' ? (st && st.reach ? 1 : 0) : j.far);
  // the jobs, in an order that works: a flower that gives pollen before the flowers of its kind
  const items = W.items.filter((it) => JOB[it.t]).map((it) => ({ ...it }));
  const prog = [];
  let x = R.x, y = R.y, d = R.dir, carry = null;
  // shortest way (in steps) from here to a place where the job can be done: states are (x, y, dir)
  function route(target, far) {
    const key = (a, b, c) => a + ',' + b + ',' + c;
    const start = { x, y, d, cost: 0, path: [] };
    const best = new Map([[key(x, y, d), 0]]);
    let open = [start];
    const ok = (s) => { for (let k = 0; k <= far; k++) { const tx = s.x + DIRS[s.d][0] * k, ty = s.y + DIRS[s.d][1] * k; if (tx === target.x && ty === target.y) return true; } return false; };
    for (let guard = 0; open.length && guard < 20000; guard++) {
      open.sort((a, b) => a.cost - b.cost);
      const s = open.shift();
      if (ok(s)) return s;
      const next = [];
      const [ax, ay] = [s.x + DIRS[s.d][0], s.y + DIRS[s.d][1]];
      if (W.canGo('robot', ax, ay)) next.push({ x: ax, y: ay, d: s.d, cost: s.cost + slow, b: 'fwd' });
      next.push({ x: s.x, y: s.y, d: (s.d + 1) % 4, cost: s.cost + 1, b: 'right' }, { x: s.x, y: s.y, d: (s.d + 3) % 4, cost: s.cost + 1, b: 'left' });
      for (const n of next) { const k = key(n.x, n.y, n.d); if (best.has(k) && best.get(k) <= n.cost) continue; best.set(k, n.cost); open.push({ ...n, path: [...s.path, n.b] }); }
    }
    return null;
  }
  const left = items.slice();
  while (left.length) {
    // the jobs that can be done now (a flower that takes pollen waits for its kind's pollen)
    const can = left.filter((it) => it.t !== 'flower' || it.src || carry === it.kind);
    let pick = null;
    for (const it of can) { const r = route(it, farOf(JOB[it.t])); if (r && (!pick || r.cost < pick.r.cost)) pick = { it, r }; }
    if (!pick) return null;
    prog.push(...pick.r.path.map((b) => ({ b })), { b: JOB[pick.it.t].b });
    x = pick.r.x; y = pick.r.y; d = pick.r.d;
    if (pick.it.t === 'flower' && pick.it.src) carry = pick.it.kind;
    left.splice(left.indexOf(pick.it), 1);
  }
  // a goal that also wants the robot back home
  const wantHome = level.goal && (level.goal.all || [level.goal]).some((c) => c.t === 'home');
  if (wantHome && level.home) { const r = route(level.home, 0); if (!r) return null; prog.push(...r.path.map((b) => ({ b }))); }
  const program = { robot: prog };
  const run = runLevel([L], program);
  return run.ok ? { prog: program, run } : null;
}
export { cellAt };
