// The world of one robot-lab level: a grid map of an island seen from above, the items on it (seed spots, fruit,
// thirsty plants, fires, nets, animals to photograph or count) and the tools (ground robot, drone, diving robot).
// Pure data and rules; run.js drives it, goals.js judges it, the screen draws it from W.summary() and the trace.
//
// level.map  = { rows: ['..T..', ...] }  one character per cell:
//   '.' ground   'T' tree (the robot cannot pass, the drone flies over)   'R' rock (blocks the robot and the diver)
//   '~' water (the diver's only ground; the robot cannot enter; the drone flies over)   's' sand (ground, slower look only)
//   '#' wall of the island's edge (blocks everyone)
// level.items = [{ t: 'seed'|'fruit'|'thirsty'|'fire'|'net'|'trash'|'coral'|'animal', x, y, kind? }]
// level.home  = { x, y }   the robot's base (for "go home" goals and the drone landing)
// level.tools = { robot: { x, y, dir }, drone: { x, y, dir, battery, parked }, sub: { x, y, dir } }
//   dir: 0 north (up), 1 east (right on the screen), 2 south, 3 west. "ימינה" turns clockwise, as seen from above.
export const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

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
  return c === '.' || c === 's';
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
  const W = {
    rows, items, tools, home: level.home || null, ticks: 0, done: false, error: null, trace: [], counter: 0, reports: [],
    events: level.events || {}, seen: new Set(), oops: 0, fun: 0,
  };
  const log = (tool, a, extra) => { const T = tools[tool] || {}; W.trace.push({ t: W.ticks, tool, a, x: T.x, y: T.y, dir: T.dir, ...extra }); };
  W.fail = (code, tool, extra) => { if (W.done) return; W.error = { code, tool, ...(tool && tools[tool] ? { x: tools[tool].x, y: tools[tool].y } : {}), ...extra }; W.done = true; log(tool, 'fail', { code }); };
  W.itemAt = (x, y, t) => items.find((it) => !it.done && it.x === x && it.y === y && (!t || it.t === t));
  W.tick = () => { W.ticks++; };
  W.eventNow = (ev, tool) => {
    const T = tools[tool]; if (!T) return false;
    if (ev === 'sunset') return W.events.sunset != null && W.ticks >= W.events.sunset;
    if (ev === 'battery_low') return T.battery > 0 && T.battery <= 3;
    if (ev === 'see_animal') {
      for (let k = 1; k <= 2; k++) { const [x, y] = ahead(W, T, k); const a = W.itemAt(x, y, 'animal'); if (a && !W.seen.has(a.i)) { W.seen.add(a.i); return true; } }
    }
    return false;
  };
  const useBattery = (tool) => {
    const T = tools[tool];
    if (tool !== 'drone' || !T.battery) return true;
    T.battery--; if (T.battery <= 0 && T.flying) { W.fail('battery', tool); return false; }
    return true;
  };
  // one action of one tool; soft mistakes (planting where there is no spot) are 'oops' and cost a step, bumping into a
  // tree or leaving the island ends the run with a funny message
  W.act = (tool, nd) => {
    const T = tools[tool];
    if (!T) { W.fail('notool', tool); return; }
    if (tool === 'drone' && !T.flying && nd.b !== 'launch') { W.fail('parked', tool); return; }
    const b = nd.b;
    if (b === 'fwd' || b === 'back') {
      const s = b === 'fwd' ? 1 : -1, d = DIRS[T.dir], nx = T.x + d[0] * s, ny = T.y + d[1] * s;
      if (!canEnter(W, tool, nx, ny)) { W.fail(cellAt(W, nx, ny) === '#' ? 'edge' : 'bump', tool, { cell: cellAt(W, nx, ny) }); return; }
      if (tool !== 'drone') for (const k in tools) if (k !== tool && k !== 'drone' && tools[k].x === nx && tools[k].y === ny) { W.fail('crash', tool); return; }
      T.x = nx; T.y = ny; T.landed = false;
      if (!useBattery(tool)) return;
      log(tool, b);
    } else if (b === 'right' || b === 'left') {
      T.dir = (T.dir + (b === 'right' ? 1 : 3)) % 4; useBattery(tool); log(tool, b);
    } else if (b === 'wait') { useBattery(tool); log(tool, 'wait'); }
    else if (b === 'plant' || b === 'pick' || b === 'water' || b === 'collect' || b === 'coral') {
      const need = { plant: 'seed', pick: 'fruit', water: 'thirsty', collect: null, coral: 'coral' }[b];
      let it = W.itemAt(T.x, T.y, need);
      if (b === 'collect') it = W.itemAt(T.x, T.y, 'net') || W.itemAt(T.x, T.y, 'trash');
      if (it) { it.done = true; log(tool, b, { item: it.i }); } else { W.oops++; log(tool, 'oops', { want: b }); }
      useBattery(tool);
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
    } else if (b === 'fireworks' || b === 'dance' || b === 'beep' || b === 'lights' || b === 'sneeze') { W.fun++; log(tool, b); }
    else W.fail('unknown', tool, { b });
  };
  W.summary = () => ({
    tools: Object.fromEntries(Object.entries(tools).map(([k, T]) => [k, { x: T.x, y: T.y, dir: T.dir, flying: T.flying, landed: T.landed, battery: T.battery }])),
    items: items.map((it) => ({ t: it.t, x: it.x, y: it.y, done: it.done, kind: it.kind })),
    counter: W.counter, reports: W.reports.slice(), oops: W.oops, fun: W.fun,
  });
  return W;
}
