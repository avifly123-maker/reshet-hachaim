// מעבדת הרובוטים – the block engine (1.4.1). Pure logic, no DOM and no three.js: the lessons, the puzzles, the test
// tool (tools/validate-robolab.mjs) and later the robot workshop all run programs through it. Deterministic: the same
// program on the same map always gives the same trace.
//
//   const r = runProgram(level, program, { maxTicks })
//     level   = { map, tools: { robot?: {x, y, dir}, drone?: {...}, sub?: {...} }, events?, goal, par? }  (data/robolab/)
//     program = { robot?: [nodes], drone?: [nodes], sub?: [nodes], defs?: { name: [nodes] }, on?: [{ ev, tool, body }] }
//   → { ok, stars, steps, blocks, trace: [{ t, tool, a, x, y, dir, ... }], error: { code, tool, x, y } | null, state }
//
// A node is { b: '<block id>', ...params }; control blocks hold bodies: { b: 'repeat', n: 4, body: [...] },
// { b: 'if', c: '<sensor>', then: [...], else: [...] }, { b: 'until', c: '<sensor>', body: [...] }, { b: 'call', f: 'name' }.
// Tools take turns one action each (robot, drone, sub), so two tools can work together; a launched drone starts its
// own program at the robot's cell and must land back on it.
import { BLOCKS, SENSORS } from './blocks.js';
import { makeWorld, cellAt, canEnter, ahead, DIRS } from './world.js';
import { checkGoal } from './goals.js';

const MAX_TICKS = 600, MAX_DEPTH = 40;

export function countBlocks(program) {
  let n = 0;
  const walk = (list) => { for (const nd of list || []) { n++; walk(nd.body); walk(nd.then); walk(nd.else); } };
  for (const k of ['robot', 'drone', 'sub']) walk(program[k]);
  for (const k in (program.defs || {})) { n++; walk(program.defs[k]); }
  for (const h of program.on || []) { n++; walk(h.body); }
  return n;
}

// the program of one tool as a generator of single actions: control blocks cost nothing, every action yields once
function* agent(prog, list, tool, W, depth = 0) {
  if (depth > MAX_DEPTH) { W.fail('deep', tool); return; }
  for (const nd of list || []) {
    if (W.done) return;
    const B = BLOCKS[nd.b];
    if (!B) { W.fail('unknown', tool, { b: nd.b }); return; }
    if (B.kind === 'repeat') {
      const n = Math.max(0, Math.min(50, nd.n | 0));
      for (let i = 0; i < n && !W.done; i++) yield* agent(prog, nd.body, tool, W, depth + 1);
    } else if (B.kind === 'until') {
      let guard = 0;
      while (!W.done && !sense(W, tool, nd.c)) {
        if (++guard > 80) { W.fail('forever', tool); return; }
        const before = W.ticks; yield* agent(prog, nd.body, tool, W, depth + 1);
        if (W.ticks === before) { W.fail('forever', tool); return; }   // a body that does nothing would spin forever
      }
    } else if (B.kind === 'if') {
      yield* agent(prog, sense(W, tool, nd.c) ? nd.then : nd.else, tool, W, depth + 1);
    } else if (B.kind === 'waitmsg') {   // wait (one step at a time) until the signal comes from another tool
      const m = nd.m || 'a', since = W.ticks; let guard = 0;
      while (!W.done && !W.msgs.some((q) => q.m === m && q.from !== tool && q.t >= since - 1)) {
        if (++guard > 200) { W.fail('nomsg', tool, { m }); return; }
        W.cur = nd.id || null; W.act(tool, { b: 'wait', id: nd.id }); yield 1;
      }
    } else if (B.kind === 'stop') {   // "עצור": this tool's program ends here (a handler can end the whole program)
      W.stopped[tool] = true; W.trace.push({ t: W.ticks, tool, a: 'stop', nid: nd.id || null }); return;
    } else if (B.kind === 'call') {
      const body = prog.defs && prog.defs[nd.f];
      if (!body) { W.fail('nodef', tool, { f: nd.f }); return; }
      yield* agent(prog, body, tool, W, depth + 1);
    } else {
      W.cur = nd.id || null;   // the screen lights the block that runs (trace entries carry nid)
      W.act(tool, nd);
      yield 1;
    }
  }
}

export function sense(W, tool, c) {
  const S = SENSORS[c];
  if (!S) { W.fail('sensor', tool, { c }); return false; }
  return !!S.test(W, W.tools[tool]);
}

export function runProgram(level, program, opts = {}) {
  const W = makeWorld(level);
  const max = opts.maxTicks || level.maxTicks || MAX_TICKS;
  const prog = program || {};
  const gens = {};
  for (const k of ['robot', 'drone', 'sub']) if (W.tools[k] && prog[k] && prog[k].length && !W.tools[k].parked) gens[k] = agent(prog, prog[k], k, W);
  W.startAgent = (k) => { if (prog[k] && !gens[k]) gens[k] = agent(prog, prog[k], k, W); };   // a drone that the robot launches
  const handlers = (prog.on || []).map((h) => ({ ...h, fired: false }));
  while (!W.done && W.ticks < max) {
    // events: a handler runs when its moment comes, and its tool's main program stops (e.g. "when the sun sets, go home")
    for (const h of handlers) {
      if (h.ev === 'msg') {   // a signal: the handler runs once per signal, then the tool goes on with its program
        const m = h.m || 'a';
        const news = W.msgs.filter((q, i) => q.m === m && q.from !== h.tool && i >= (h.seen || 0));
        h.seen = W.msgs.length;
        if (news.length && W.tools[h.tool]) {
          const rest = gens[h.tool];
          gens[h.tool] = (function* () { yield* agent(prog, h.body, h.tool, W); if (rest && !W.stopped[h.tool]) yield* rest; })();
          W.trace.push({ t: W.ticks, tool: h.tool, a: 'event', ev: 'msg', m });
        }
        continue;
      }
      // the other events interrupt the tool: the handler runs, then the program goes on where it was (unless the
      // handler said "עצור"). The sunset and a weak battery come once; every new animal in sight is a new event.
      const repeatable = h.ev === 'see_animal';
      if ((repeatable || !h.fired) && W.tools[h.tool] && !W.stopped[h.tool] && W.eventNow(h.ev, h.tool)) {
        h.fired = true;
        const rest = gens[h.tool];
        gens[h.tool] = (function* () { yield* agent(prog, h.body, h.tool, W); if (rest && !W.stopped[h.tool]) yield* rest; })();
        W.trace.push({ t: W.ticks, tool: h.tool, a: 'event', ev: h.ev });
      }
    }
    const live = Object.keys(gens);
    if (!live.length) { if (handlers.some((h) => h.ev === 'msg' && W.msgs.slice(h.seen || 0).some((q) => q.m === (h.m || 'a') && q.from !== h.tool))) { W.tick(); continue; } break; }
    let moved = false;
    for (const k of live) {
      const g = gens[k]; if (!g) continue;
      if (W.stopped[k]) { delete gens[k]; continue; }
      const r = g.next();
      if (r.done) delete gens[k]; else moved = true;
      if (W.done) break;
    }
    W.tick();
    const heard = handlers.some((h) => h.ev === 'msg' && W.msgs.slice(h.seen || 0).some((q) => q.m === (h.m || 'a') && q.from !== h.tool));
    if (!moved && !Object.keys(gens).length && !heard) break;
  }
  if (!W.done && W.ticks >= max) W.fail('long', null);
  const goal = W.error ? { ok: false, why: W.error.code } : checkGoal(level.goal, W);
  const blocks = countBlocks(prog);
  let stars = 0;
  if (goal.ok) { stars = 1; if (!level.par || blocks <= level.par) stars = 3; else if (blocks <= level.par + 2) stars = 2; }
  return { ok: goal.ok, why: goal.why || null, stars, steps: W.ticks, blocks, trace: W.trace, error: W.error, state: W.summary() };
}

// a lesson with all its variants: ok only when every variant passes; the run shown is the first that fails (or the last)
export function runLevel(levels, program, opts = {}) {
  const rs = levels.map((lv) => runProgram(lv, program, opts));
  let shown = rs.findIndex((r) => !r.ok); if (shown < 0) shown = rs.length - 1;
  const ok = rs.every((r) => r.ok);
  return { ...rs[shown], ok, stars: ok ? Math.min(...rs.map((r) => r.stars)) : 0, variant: shown, variants: rs.length, passed: rs.filter((r) => r.ok).length };
}

export { makeWorld, cellAt, canEnter, ahead, DIRS };
