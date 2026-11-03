// The world of one robot-lab level: a grid map of an island seen from above, the items on it (seed spots, fruit,
// thirsty plants, fires, nets, animals to photograph or count) and the tools (ground robot, drone, diving robot).
// Pure data and rules; run.js drives it, goals.js judges it, the screen draws it from W.summary() and the trace.
//
// level.map  = { rows: ['..T..', ...] }  one character per cell:
//   '.' ground   'T' tree (the robot cannot pass, the drone flies over)   'R' rock (blocks the robot and the diver)
//   '~' water (the diver's only ground; the robot cannot enter; the drone flies over)   's' sand (ground, slower look only)
//   '#' wall of the island's edge (blocks everyone)
//   1.4.3 (the robot workshop, set 2): 'm' mud, 'h' a slope, 'n' a narrow log or bridge, 'w' shallow water. Without a
//   build they are plain ground for the robot ('w' blocks it, like water); a built robot needs the grip, the force and
//   the precision for them (engine/build.js), and a float to cross shallow water ('~' too, with a propeller).
// level.items = [{ t: 'seed'|'fruit'|'thirsty'|'fire'|'net'|'trash'|'coral'|'animal'|'rock'|'log'|'flower', x, y, kind?, w?, src? }]
//   (set 4: a flower with src gives pollen, the others of its kind take it: "העבר אבקה"; a feeder takes a picked fruit:
//   "הנח"; appear: the step an item shows up)
//   (1.4.3: a rock is pushed one cell with "דחוף" when the robot's push is at least w; a log is lifted with "הרם")
// level.home  = { x, y }   the robot's base (for "go home" goals and the drone landing)
// level.tools = { robot: { x, y, dir }, drone: { x, y, dir, battery, parked }, sub: { x, y, dir } }
// level.build = { robot: <build> }  (1.4.3) the robot is the child's own, built from parts: its numbers come from
//   statsOf(build), and only then do parts, sensors, ground, battery and speed matter (lessons without it run as before)
//   dir: 0 north (up), 1 east (right on the screen), 2 south, 3 west. "ימינה" turns clockwise, as seen from above.
import { statsOf, partsFor, partsForGround, FORCE_PARTS, PRECISION_PARTS } from './build.js';

export const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const GROUND = { '.': 'ground', s: 'sand', m: 'mud', h: 'slope', n: 'narrow' };   // the cells a robot drives on

export function cellAt(W, x, y) {
  const r = W.rows[y];
  if (!r || x < 0 || x >= r.length) return '#';
  return r[x];
}

export function canEnter(W, tool, x, y) {
  const c = cellAt(W, x, y);
  if (c === '#') return false;
  if (tool === 'drone') return true;
  if (tool === 'sub') return c === '~';
  if (c === 'w' || c === '~') { const st = W.tools[tool] && W.tools[tool].st; return !!st && (c === 'w' ? st.floats : st.swims); }
  return !!GROUND[c] && !(W.itemAt && W.itemAt(x, y, 'rock'));   // a rock on a cell blocks it until it is pushed away
}

export function ahead(W, T, k = 1) { const d = DIRS[T.dir]; return [T.x + d[0] * k, T.y + d[1] * k]; }

export function makeWorld(level) {
  const rows = (level.map && level.map.rows || []).slice();
  const items = (level.items || []).map((it, i) => ({ ...it, i, done: false }));
  const tools = {};
  for (const k of ['robot', 'drone', 'sub']) {
    const t = level.tools && level.tools[k];
    if (t) tools[k] = { x: t.x, y: t.y, dir: t.dir || 0, battery: t.battery || 0, parked: !!t.parked, flying: k === 'drone' && !t.parked, landed: false, photos: 0, carry: 0 };
  }
  // a built robot (1.4.3): its numbers, its battery and the uses its tanks hold
  const B = level.build && level.build.robot;
  if (B && tools.robot) {
    const st = statsOf(B);
    if (st) Object.assign(tools.robot, { st, battery: st.battery, seeds: st.seeds, water: st.water });
  }
  const W = {
    rows, items, tools, home: level.home || null, ticks: 0, done: false, error: null, trace: [], counter: 0, reports: [],
    events: level.events || {}, seen: new Set(), oops: 0, fun: 0,
    stopped: {},     // tools whose program ended with "עצור"
    msgs: [],        // every signal sent: { m, from, t } (the tools talk to each other, engine/blocks.js 'send')
    listeners: [],   // other bodies on the field that hear signals: { id, on(m, from, W) } (stations, gates, sensors: later)
  };
  const log = (tool, a, extra) => { const T = tools[tool] || {}; W.trace.push({ t: W.ticks, tool, a, x: T.x, y: T.y, dir: T.dir, nid: W.cur || null, ...extra }); };
  W.fail = (code, tool, extra) => { if (W.done) return; W.error = { code, tool, ...(tool && tools[tool] ? { x: tools[tool].x, y: tools[tool].y } : {}), ...extra }; W.done = true; log(tool, 'fail', { code }); };
  W.itemAt = (x, y, t) => items.find((it) => !it.done && !(it.appear > W.ticks) && it.x === x && it.y === y && (!t || it.t === t));
  // 1.4.3 set 4: an item may come in the middle of a run (it.appear = the step it shows up: a fire starts, a fruit falls)
  W.tick = () => { W.ticks++; for (const it of items) if (it.appear === W.ticks) W.trace.push({ t: W.ticks, tool: null, a: 'appear', item: it.i }); };
  W.eventNow = (ev, tool) => {
    const T = tools[tool]; if (!T) return false;
    if (ev === 'sunset') return W.events.sunset != null && W.ticks >= W.events.sunset;
    if (ev === 'battery_low') return T.battery > 0 && T.battery <= 3;
    if (ev === 'see_animal') {
      for (let k = 1; k <= 2; k++) { const [x, y] = ahead(W, T, k); const a = W.itemAt(x, y, 'animal'); if (a && !W.seen.has(a.i)) { W.seen.add(a.i); return true; } }
    }
    return false;
  };
  const useBattery = (tool, n = 1) => {
    const T = tools[tool];
    if (T.st) { T.battery -= n; if (T.battery <= 0) { T.battery = 0; W.fail('flat', tool); return false; } return true; }   // a built robot
    if (tool !== 'drone' || !T.battery) return true;
    T.battery--; if (T.battery <= 0 && T.flying) { W.fail('battery', tool); return false; }
    return true;
  };
  // the sun charges a robot with a solar panel a little every few steps (not after sunset)
  W.recharge = () => {
    for (const k in tools) { const T = tools[k]; if (!T.st || !T.st.recharge || W.ticks % 5) continue; if (W.events.sunset != null && W.ticks >= W.events.sunset) continue; T.battery = Math.min(T.st.battery, T.battery + T.st.recharge); }
  };
  // a built robot on the ground it is about to enter: is it strong, steady and exact enough? (null = it can go)
  const groundProblem = (T, c) => {
    const g = GROUND[c]; if (!g || !T.st) return null;
    if (T.st.grip[g] < 0.5) return { code: g === 'narrow' ? 'slip' : 'stuck', cell: c, need: partsForGround(g) };
    if (g === 'slope' && T.st.force < 1) return { code: 'weak', cell: c, need: FORCE_PARTS };
    if (g === 'narrow' && T.st.precision < 0.7) return { code: 'slip', cell: c, need: PRECISION_PARTS };
    return null;
  };
  // can this tool drive into that cell now (for the planner, engine/plan.js): the same rules a move checks
  W.canGo = (tool, x, y) => { const T = tools[tool]; if (!T || !canEnter(W, tool, x, y)) return false; return tool !== 'robot' || !groundProblem(T, cellAt(W, x, y)); };
  // the item a tool can reach: here, or one cell ahead for a long arm or a crane (reach)
  const reachItem = (T, t) => { const it = W.itemAt(T.x, T.y, t); if (it || !T.st || !T.st.reach) return it; const [ax, ay] = ahead(W, T); return W.itemAt(ax, ay, t); };
  // one action of one tool; soft mistakes (planting where there is no spot) are 'oops' and cost a step, bumping into a
  // tree or leaving the island ends the run with a funny message
  W.act = (tool, nd) => {
    const T = tools[tool];
    if (!T) { W.fail('notool', tool); return; }
    if (tool === 'drone' && !T.flying && nd.b !== 'launch') { W.fail('parked', tool); return; }
    const b = nd.b;
    if (T.st && !T.st.blocks.has(b)) { W.fail('nopart', tool, { b, need: partsFor(b) }); return; }   // a built robot has no part for it
    if (b === 'fwd' || b === 'back') {
      const s = b === 'fwd' ? 1 : -1, d = DIRS[T.dir], nx = T.x + d[0] * s, ny = T.y + d[1] * s;
      const nc = cellAt(W, nx, ny);
      if ((nc === 'w' || nc === '~') && tool === 'robot' && T.st) { if (!canEnter(W, tool, nx, ny)) { W.fail('sink', tool, { cell: nc, need: nc === 'w' ? ['float'] : ['float', 'propeller'] }); return; } }
      else if (!canEnter(W, tool, nx, ny)) { W.fail(nc === '#' ? 'edge' : 'bump', tool, { cell: nc }); return; }
      const gp = tool === 'robot' ? groundProblem(T, nc) : null;
      if (gp) { W.fail(gp.code, tool, gp); return; }
      if (tool !== 'drone') for (const k in tools) if (k !== tool && k !== 'drone' && tools[k].x === nx && tools[k].y === ny) { W.fail('crash', tool); return; }
      T.x = nx; T.y = ny; T.landed = false;
      if (!useBattery(tool, T.st ? T.st.moveDrain : 1)) return;
      log(tool, b);
    } else if (b === 'right' || b === 'left') {
      T.dir = (T.dir + (b === 'right' ? 1 : 3)) % 4; useBattery(tool); log(tool, b);
    } else if (b === 'wait') { useBattery(tool); log(tool, 'wait'); }
    else if (b === 'plant' || b === 'pick' || b === 'water' || b === 'collect' || b === 'coral') {
      const need = { plant: 'seed', pick: 'fruit', water: 'thirsty', collect: null, coral: 'coral' }[b];
      let it = reachItem(T, need);
      if (b === 'collect') it = reachItem(T, 'net') || reachItem(T, 'trash');
      const tank = T.st && (b === 'plant' ? 'seeds' : b === 'water' ? 'water' : null);   // a built robot's seed box and water tank run out
      if (it && tank && T[tank] <= 0) { W.oops++; log(tool, 'oops', { want: tank === 'seeds' ? 'noseeds' : 'nowater' }); }
      else if (it) { it.done = true; if (tank) T[tank]--; if (b === 'pick') T.load = (T.load || 0) + 1; log(tool, b, { item: it.i }); } else { W.oops++; log(tool, 'oops', { want: b }); }
      useBattery(tool, T.st ? T.st.actDrain : 1);
    } else if (b === 'spray') {   // water on a fire here or one step ahead
      const [ax, ay] = ahead(W, T);
      const it = W.itemAt(T.x, T.y, 'fire') || W.itemAt(ax, ay, 'fire');
      if (it) { it.done = true; log(tool, 'spray', { item: it.i }); } else { W.oops++; log(tool, 'oops', { want: b }); }
      useBattery(tool);
    } else if (b === 'photo') {   // an animal here or up to two steps ahead (the drone sees from above: here too)
      let it = W.itemAt(T.x, T.y, 'animal');
      for (let k = 1; !it && k <= 2; k++) { const [x, y] = ahead(W, T, k); it = W.itemAt(x, y, 'animal'); }
      if (it) { it.done = true; T.photos++; log(tool, 'photo', { item: it.i }); } else { W.oops++; log(tool, 'oops', { want: b }); }
      useBattery(tool);
    } else if (b === 'push') {   // 1.4.3: the pusher moves a rock one cell on, if the robot is strong enough and the cell behind is free
      const [ax, ay] = ahead(W, T), it = W.itemAt(ax, ay, 'rock');
      if (!it) { W.oops++; log(tool, 'oops', { want: b }); }
      else if (T.st && T.st.push < (it.w || 1)) { W.fail('heavy', tool, { item: it.i, need: FORCE_PARTS }); return; }
      else { const d = DIRS[T.dir], bx = ax + d[0], by = ay + d[1]; if (!GROUND[cellAt(W, bx, by)] || W.itemAt(bx, by, 'rock')) { W.oops++; log(tool, 'oops', { want: b }); } else { it.x = bx; it.y = by; it.pushed = true; log(tool, 'push', { item: it.i, to: [bx, by] }); } }
      useBattery(tool, T.st ? T.st.actDrain + 1 : 1);
    } else if (b === 'lift') {   // 1.4.3: the fork (with a rack, a worm or a crane) lifts a log here or within reach
      const it = reachItem(T, 'log');
      if (!it) { W.oops++; log(tool, 'oops', { want: b }); }
      else if (T.st && T.st.lift < (it.w || 1)) { W.fail('heavy', tool, { item: it.i, need: partsFor('lift').concat(['crane', 'rack', 'worm']) }); return; }
      else { it.done = true; log(tool, 'lift', { item: it.i }); }
      useBattery(tool, T.st ? T.st.actDrain + 1 : 1);
    } else if (b === 'drop') {   // 1.4.3: a picked fruit is put on a feeder (here or one step ahead), for the animal that eats it
      const [ax, ay] = ahead(W, T), it = W.itemAt(T.x, T.y, 'feeder') || W.itemAt(ax, ay, 'feeder');
      if (it && (T.load || 0) > 0) { it.done = true; T.load--; log(tool, 'drop', { item: it.i }); }
      else { W.oops++; log(tool, 'oops', { want: it ? 'empty' : 'drop' }); }
      useBattery(tool);
    } else if (b === 'pollen') {   // 1.4.3: take pollen at a flower that gives it, leave it at another of the same kind
      const [ax, ay] = ahead(W, T), fl = (f) => W.itemAt(T.x, T.y, 'flower') && f(W.itemAt(T.x, T.y, 'flower')) ? W.itemAt(T.x, T.y, 'flower') : (W.itemAt(ax, ay, 'flower') && f(W.itemAt(ax, ay, 'flower')) ? W.itemAt(ax, ay, 'flower') : null);
      const give = T.pollen ? fl((it) => !it.src && it.kind === T.pollen) : null, take = fl((it) => it.src);
      if (give) { give.done = true; log(tool, 'pollinate', { item: give.i }); }
      else if (take) { take.done = true; T.pollen = take.kind; log(tool, 'pollen', { item: take.i }); }
      else { W.oops++; log(tool, 'oops', { want: T.pollen ? 'pollen_give' : 'pollen' }); }
      useBattery(tool);
    } else if (b === 'add') { W.counter += nd.n || 1; log(tool, 'add', { counter: W.counter }); }
    else if (b === 'report') { W.reports.push(W.counter); log(tool, 'report', { counter: W.counter }); }
    else if (b === 'reset') { W.counter = 0; log(tool, 'reset'); }
    else if (b === 'launch') {   // the robot sends the drone up from its own cell
      const D = tools.drone;
      if (tool !== 'robot' || !D) { W.fail('nodrone', tool); return; }
      if (D.flying) { W.oops++; log(tool, 'oops', { want: b }); return; }
      D.x = T.x; D.y = T.y; D.dir = T.dir; D.flying = true; D.parked = false; D.landed = false;
      log(tool, 'launch'); if (W.startAgent) W.startAgent('drone');
    } else if (b === 'land') {   // the drone lands on the robot (or on the base when there is no robot)
      const R = tools.robot, H = W.home;
      const ok = (R && R.x === T.x && R.y === T.y) || (!R && H && H.x === T.x && H.y === T.y);
      if (ok) { T.flying = false; T.landed = true; log(tool, 'land'); } else { W.fail('noland', tool); }
    } else if (b === 'send') {
      const m = nd.m || 'a';
      W.msgs.push({ m, from: tool, t: W.ticks }); log(tool, 'send', { m });
      for (const L of W.listeners) { try { L.on(m, tool, W); } catch (e) { } }
    } else if (b === 'fireworks' || b === 'dance' || b === 'beep' || b === 'lights' || b === 'sneeze') { W.fun++; log(tool, b); }
    else W.fail('unknown', tool, { b });
  };
  W.summary = () => ({
    tools: Object.fromEntries(Object.entries(tools).map(([k, T]) => [k, { x: T.x, y: T.y, dir: T.dir, flying: T.flying, landed: T.landed, battery: T.battery, ...(T.st ? { seeds: T.seeds, water: T.water } : {}) }])),
    items: items.map((it) => ({ t: it.t, x: it.x, y: it.y, done: it.done, kind: it.kind })),
    counter: W.counter, reports: W.reports.slice(), oops: W.oops, fun: W.fun, msgs: W.msgs.map((q) => ({ ...q })),
  });
  return W;
}
