// מעבדת הרובוטים in 3D – a lesson's training field laid on a real island (Avi, 29.10: the lessons happen in the
// environments themselves, in controlled fields; challenges, puzzles and the sandbox later on the player's own islands).
// The level's grid (engine/world.js) becomes a mat of tiles on the ground; trees, rocks and the field's edge are real
// objects (the zone's own procedural trees and corals), the items are small models, and the tools drive over the
// terrain. A run's trace (engine/run.js) is played here frame by frame, and what the tools do changes the place: a
// planted seed becomes a real seedling, a watered plant stands up, a fire goes out.
//   const C = createCourse(ctx, L)      ctx: { W, env, scene, reg, markers, spawnPlant, spawnAnimal, zone }
//   C.reset()  C.play(trace, { speed, onStep, onEnd })  C.stop()  C.isPlaying()  C.update(rdt)  C.view()  C.dispose()
import * as THREE from 'three';
import { makeWorld } from '../engine/world.js';
import { SIGNALS } from '../engine/blocks.js';
import { levelOf } from '../engine/level.js';
import { lookFor } from '../../data/robolab/parts.js';
import { toolLook } from '../progress.js';
import { makeTool, makeHome, makeSpot, makeFruit, makeNet, makeTrash, makeRock, makeEdge, makeFireBase } from './models.js';

// the zone's living things used on a field: trees on 'T' cells, what grows from a planted seed, the thirsty plant
const LIFE = {
  grove:  { tree: ['oak', 'carob', 'terebinth'], sapling: 'oak', thirsty: 'sage', treeG: 0.6 },
  amazon: { tree: ['acai', 'cecropia'], sapling: 'brazilnut', thirsty: 'heliconia', treeG: 0.3 },
  desert: { tree: ['acacia', 'barrelcactus'], sapling: 'acacia', thirsty: 'saltbush', treeG: 0.9 },
  reef:   { tree: ['brain', 'table', 'branching'], sapling: 'branching', thirsty: 'seagrass', treeG: 0.55 },
};
const TILE = { '.': '#f3ecd2', s: '#f0d9a0', '~': '#4fb4d8', T: '#d8e8c0', R: '#d8d2c4' };
const DUR = { slow: 0.85, normal: 0.42, fast: 0.12 };   // seconds per step of the trace
const FLY = 3.4;          // the drone's height over the ground while flying
const ON_ROBOT = 1.75;    // ... while parked on the robot's back
const SWIM = 1.4;         // the diving robot over the sea floor
const ease = (k) => k * k * (3 - 2 * k);
const _v = new THREE.Vector3();

export function createCourse(ctx, L) {
  const { W, env, scene, reg, markers, spawnPlant, spawnAnimal } = ctx;
  const zone = ctx.zone || L.zone || 'grove';
  const life = LIFE[zone] || LIFE.grove;
  const rows = L.map.rows, H = rows.length, Wd = Math.max(...rows.map((r) => r.length));
  const root = new THREE.Group(); root.name = 'robolab-course'; scene.add(root);
  const sea = !!env.underwater;
  const cell = (r, c) => (rows[r] || '')[c] || '#';
  const ground = (x, z) => env.heightAt(x, z);
  // where the field lies: a dry, flat, open part of the island (the Amazon's river, the grove's rocks and pools stay out);
  // cells shrink a little when no such place is big enough
  const { CS, OX, OZ } = (() => {
    const R = (env.radius || 38) - 1.5, base = Math.min(4, 30 / Math.max(Wd, H));
    let best = null;
    for (const cs of [base, base * 0.85, base * 0.72]) {
      const hw = Wd * cs / 2, hh = H * cs / 2, lim = R - Math.hypot(hw, hh);
      if (lim < 0) continue;
      for (let oz = -lim; oz <= lim + 0.01; oz += 2) for (let ox = -lim; ox <= lim + 0.01; ox += 2) {
        if (Math.hypot(ox, oz) > lim) continue;
        let bad = 0, lo = 1e9, hi = -1e9;
        for (let j = 0; j <= H * 2; j++) for (let i = 0; i <= Wd * 2; i++) {
          const x = ox - hw + (i / (Wd * 2)) * hw * 2, z = oz - hh + (j / (H * 2)) * hh * 2;
          if (env.isPlaceable && !env.isPlaceable(x, z)) bad++;
          else if (!sea && env.isWater && env.isWater(x, z)) bad++;
          const h = ground(x, z); if (h < lo) lo = h; if (h > hi) hi = h;
        }
        const score = bad * 10 + (hi - lo) * 2 + Math.hypot(ox, oz) * 0.05 + (base - cs) * 4;
        if (!best || score < best.score) best = { score, CS: cs, OX: ox, OZ: oz, bad };
      }
      if (best && best.bad === 0) break;
    }
    return best || { CS: base, OX: 0, OZ: 0 };
  })();
  const wx = (x) => OX + (x - (Wd - 1) / 2) * CS, wz = (y) => OZ + (y - (H - 1) / 2) * CS;
  const rng = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  const spOf = (id) => (reg && reg.byId ? reg.byId.get(id) : null);
  const keep = [];   // entities that belong to the field (removed on dispose)

  // ── the mat: one tinted tile per cell, following the ground, and a white grid over it
  {
    const pos = [], col = [], idx = [], lines = [], N = 4, lift = 0.07;
    const c3 = new THREE.Color();
    for (let y = 0; y < H; y++) for (let x = 0; x < Wd; x++) {
      const ch = cell(y, x); if (ch === '#') continue;
      c3.set(TILE[ch] || TILE['.']);
      const x0 = wx(x) - CS / 2, z0 = wz(y) - CS / 2, base = pos.length / 3;
      for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
        const px = x0 + (i / N) * CS, pz = z0 + (j / N) * CS;
        pos.push(px, ground(px, pz) + lift, pz); col.push(c3.r, c3.g, c3.b);
      }
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = base + j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
      // the cell's outline, inset a little so neighbours show a double line (reads as tiles)
      const ins = CS * 0.03, seg = (ax, az, bx, bz) => { for (let k = 0; k < N; k++) { const t0 = k / N, t1 = (k + 1) / N; const p0x = ax + (bx - ax) * t0, p0z = az + (bz - az) * t0, p1x = ax + (bx - ax) * t1, p1z = az + (bz - az) * t1; lines.push(p0x, ground(p0x, p0z) + lift + 0.02, p0z, p1x, ground(p1x, p1z) + lift + 0.02, p1z); } };
      const ax = x0 + ins, az = z0 + ins, bx = x0 + CS - ins, bz = z0 + CS - ins;
      seg(ax, az, bx, az); seg(bx, az, bx, bz); seg(bx, bz, ax, bz); seg(ax, bz, ax, az);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: sea ? 0.22 : 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, fog: false });
    const tiles = new THREE.Mesh(g, mat); tiles.renderOrder = 2; root.add(tiles);
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
    const grid = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, depthWrite: false, fog: false }));
    grid.renderOrder = 3; root.add(grid);
  }

  // ── fixed things: the edge, rocks, trees (real ones), the base
  for (let y = 0; y < H; y++) for (let x = 0; x < Wd; x++) {
    const ch = cell(y, x), X = wx(x), Z = wz(y);
    if (ch === '#') {   // the field's edge: a low curb along each side of an open cell that meets it (an inner '#' is a boulder)
      const inner = [[0, -1], [1, 0], [0, 1], [-1, 0]].filter(([dx, dy]) => cell(y + dy, x + dx) !== '#' && y + dy >= 0 && y + dy < H && x + dx >= 0 && x + dx < Wd);
      for (const [dx, dy] of inner) {
        const e = makeEdge(sea), along = dx === 0;
        e.scale.set(along ? CS * 1.02 : 0.32, 1, along ? 0.32 : CS * 1.02);
        const ex = X + dx * CS * 0.5, ez = Z + dy * CS * 0.5;
        e.position.set(ex, ground(ex, ez) - 0.05, ez); root.add(e);
      }
      const open = inner.length;
      if (open >= 3) { const r = makeRock(rng); r.scale.setScalar(CS / 2.8); r.position.set(X, ground(X, Z), Z); root.add(r); }
    }
    else if (ch === 'R') { const r = makeRock(rng); r.scale.setScalar(CS / 2.6); r.position.set(X, ground(X, Z), Z); root.add(r); }
    else if (ch === 'T') {
      const id = life.tree[(x * 7 + y * 3) % life.tree.length], sp = spOf(id);
      const p = sp && spawnPlant(sp, X, Z, { growth: life.treeG, seed: x * 131 + y * 17 + 5 });
      if (p) keep.push(p);
      else { const r = makeRock(rng); r.scale.setScalar(CS / 3); r.position.set(X, ground(X, Z), Z); root.add(r); }
    }
  }
  if (L.home) { const h = makeHome(); h.scale.setScalar(CS / 3.2); const X = wx(L.home.x), Z = wz(L.home.y); h.position.set(X, ground(X, Z) + 0.02, Z); root.add(h); }
  // animals to photograph: the zone's real animal, kept near its cell
  const animals = new Map();
  for (const it of L.items || []) if (it.t === 'animal') {
    const sp = spOf(it.kind), X = wx(it.x), Z = wz(it.y);
    const a = sp && spawnAnimal(sp, new THREE.Vector3(X, ground(X, Z), Z));
    if (a) { a.home.set(X, a.home.y, Z); a.range = Math.max(1, CS * 0.3); a.grow = 1; keep.push(a); animals.set(it.x + ',' + it.y, a); }
  }

  // ── the items and the tools (made again on every reset)
  let items = [], tools = {}, spawned = [], fires = [], fireT = 0;
  const itemRoot = new THREE.Group(); root.add(itemRoot);
  const at = (o, x, y, up = 0) => { const X = wx(x), Z = wz(y); o.position.set(X, ground(X, Z) + up, Z); return o; };
  function clearItems() {
    for (const o of [...itemRoot.children]) itemRoot.remove(o);
    for (const p of spawned) { try { W.removeEntity(p); } catch (e) { } }
    spawned = []; fires = [];
  }
  function buildItems() {
    clearItems();
    const w0 = makeWorld(levelOf(L));
    items = w0.items.map((it) => {
      const S = { ...it, obj: null, plant: null };
      const sc = CS / 3;
      if (it.t === 'seed') S.obj = at(makeSpot(sea ? '#c9b48a' : '#7a5434'), it.x, it.y);
      else if (it.t === 'coral') S.obj = at(makeSpot('#d9c79a'), it.x, it.y);
      else if (it.t === 'fruit') S.obj = at(makeFruit(), it.x, it.y);
      else if (it.t === 'net') S.obj = at(makeNet(), it.x, it.y);
      else if (it.t === 'trash') S.obj = at(makeTrash(), it.x, it.y);
      else if (it.t === 'fire') { S.obj = at(makeFireBase(), it.x, it.y); fires.push(S); }
      else if (it.t === 'thirsty') {
        const sp = spOf(life.thirsty), X = wx(it.x), Z = wz(it.y);
        const p = sp && spawnPlant(sp, X, Z, { growth: 0.55, seed: it.x * 31 + it.y });
        if (p) { p.vis.setHealth(0.2); S.plant = p; spawned.push(p); }
      }
      if (S.obj) { S.obj.scale.multiplyScalar(sc * 1.3); itemRoot.add(S.obj); }
      return S;
    });
    tools = {};
    for (const [k, T] of Object.entries(w0.tools)) {
      let o = toolObjs[k]; if (!o) { o = toolObjs[k] = makeTool(k, toolLook(k).paint, lookFor(k, L.blocks || [], toolLook(k).parts)); o.scale.multiplyScalar(CS / 3.4); root.add(o); }
      tools[k] = { x: T.x, y: T.y, a: T.dir * Math.PI / 2, lift: k === 'drone' ? (T.parked ? 0 : 1) : 0, show: k !== 'drone' || !T.parked, obj: o, wob: 0, spin: 0, dance: 0 };
      o.visible = tools[k].show;
    }
    for (const k of Object.keys(toolObjs)) if (!tools[k]) toolObjs[k].visible = false;
    placeTools();
  }
  const toolObjs = {};
  function toolY(k, T) {
    const X = wx(T.x), Z = wz(T.y), g = ground(X, Z);
    if (k === 'sub') return Math.min(g + SWIM, env.surfaceY != null ? env.surfaceY - 1 : g + SWIM);
    if (k === 'drone') return g + ON_ROBOT * (tools.robot ? 1 : 0.3) + (FLY - ON_ROBOT * (tools.robot ? 1 : 0.3)) * T.lift;
    return g + 0.02;
  }
  function placeTools() {
    for (const [k, T] of Object.entries(tools)) {
      const o = T.obj; o.visible = T.show;
      o.position.set(wx(T.x), toolY(k, T), wz(T.y));
      o.rotation.set(T.wob * 0.25 * Math.sin(T.spin * 30), Math.PI - T.a + Math.sin(T.dance * Math.PI * 4) * 0.5, 0);
    }
  }

  // ── what a step does to the place
  function itemDone(S, how) {
    if (S.done) return; S.done = true;
    const X = wx(S.x), Z = wz(S.y); _v.set(X, ground(X, Z) + 0.6, Z);
    if (S.t === 'seed' || S.t === 'coral') {
      if (S.obj) S.obj.visible = false;
      const sp = spOf(life.sapling), p = sp && spawnPlant(sp, X, Z, { growth: S.t === 'coral' ? 0.3 : 0.1, seed: S.x * 7 + S.y * 13 });
      if (p) spawned.push(p);
      markers.burst(_v, '#8fe36a', 18, { speed: 1.4, size: 0.4, life: 1, up: 1.4 });
    } else if (S.t === 'fruit') { if (S.obj && S.obj.userData.fruit) S.obj.userData.fruit.visible = false; markers.burst(_v, '#f5a623', 14, { speed: 1.6, size: 0.4, life: 0.9, up: 1.6 }); }
    else if (S.t === 'thirsty') { if (S.plant) { S.plant.vis.setHealth(1); } markers.burst(_v, '#6fc3e8', 24, { speed: 1.2, size: 0.35, life: 1, up: 0.6 }); }
    else if (S.t === 'fire') { if (S.obj) S.obj.children.slice(1).forEach((c) => { c.visible = false; }); markers.burst(_v.setY(_v.y + 0.6), '#c9c9c9', 30, { speed: 1, size: 0.8, life: 1.6, up: 2.2 }); markers.burst(_v, '#6fc3e8', 20, { speed: 1.4, size: 0.35, life: 0.8, up: 0.8 }); }
    else if (S.t === 'net' || S.t === 'trash') { if (S.obj) S.obj.visible = false; markers.burst(_v, '#ffffff', 16, { speed: 1.2, size: 0.4, life: 0.8, up: 1.2 }); }
    else if (S.t === 'animal') { const a = animals.get(S.x + ',' + S.y); if (a) a.focusPoint(_v); markers.burst(_v, '#ffffff', 26, { speed: 3, size: 0.6, life: 0.5, up: 0.4 }); }
    if (how) { /* a sound is played by the screen (onStep) */ }
  }
  const COL = ['#ff5a5a', '#ffd25a', '#5ad1ff', '#8fe36a', '#d66aa8', '#ff9a3a'];
  function fun(k, T, a) {
    const o = T.obj; o.getWorldPosition(_v); _v.y += 1.2;
    if (a === 'fireworks') { for (let i = 0; i < 4; i++) setTimeout(() => { const p = _v.clone(); p.y += 2 + i * 0.6; markers.burst(p, COL[(i * 2) % COL.length], 34, { speed: 4.5, size: 0.5, life: 1.3, up: 2.5 }); }, i * 160); }
    else if (a === 'lights') { for (let i = 0; i < 6; i++) markers.burst(_v, COL[i], 8, { speed: 2, size: 0.4, life: 0.9, up: 0.8 }); }
    else if (a === 'beep') markers.burst(_v, '#ffe066', 10, { speed: 1, size: 0.35, life: 0.8, up: 1.6 });
    else if (a === 'sneeze') { const d = _v.clone().add(new THREE.Vector3(Math.sin(Math.PI - T.a), 0, Math.cos(Math.PI - T.a)).multiplyScalar(1.2)); markers.burst(d, '#ffffff', 28, { speed: 2.5, size: 0.6, life: 0.9, up: 0.3 }); }
  }

  // ── playing a trace
  let play = null;
  function start(trace, { speed = 'normal', onStep, onEnd } = {}) {
    stop(); buildItems();
    play = { evs: trace.slice(), i: 0, t: 0, dur: DUR[speed] || DUR.normal, from: null, onStep, onEnd };
  }
  function begin(e) {
    const T = tools[e.tool];
    play.from = T ? { x: T.x, y: T.y, a: T.a, lift: T.lift } : {};
    if (e.a === 'launch' && tools.drone) { const D = tools.drone; D.show = true; D.x = e.x; D.y = e.y; D.a = (e.dir || 0) * Math.PI / 2; D.lift = 0; }
    if (e.item != null) { const S = items.find((q) => q.i === e.item); if (S) itemDone(S, e.a); }
    if (T && /^(fireworks|lights|beep|sneeze)$/.test(e.a)) fun(e.tool, T, e.a);
    if (T && e.a === 'send') { const S = SIGNALS[e.m] || SIGNALS.a; T.obj.getWorldPosition(_v); _v.y += 1.6; markers.burst(_v, S.color, 26, { speed: 3.2, size: 0.45, life: 0.9, up: 0.6 }); }
    if (e.a === 'event' && e.ev === 'msg' && tools[e.tool]) { const S = SIGNALS[e.m] || SIGNALS.a; tools[e.tool].obj.getWorldPosition(_v); _v.y += 1.4; markers.burst(_v, S.color, 14, { speed: 1, size: 0.5, life: 0.8, up: 1.2 }); }
    if (T && e.a === 'oops') markers.burst(_v.copy(T.obj.position).setY(T.obj.position.y + 1.5), '#d66aa8', 10, { speed: 1, size: 0.35, life: 0.7, up: 1 });
    if (T && e.a === 'fail') { T.wob = 1; markers.burst(_v.copy(T.obj.position).setY(T.obj.position.y + 1.2), '#e8562a', 22, { speed: 2, size: 0.45, life: 0.9, up: 1.2 }); }
    if (play.onStep) play.onStep(e, play.i);
  }
  function tick(rdt) {
    if (!play) return;
    const e = play.evs[play.i];
    if (!e) { const cb = play.onEnd; play = null; if (cb) cb(); return; }
    if (!play.from) begin(e);
    if (!play) return;   // onStep may have stopped the run
    play.t += rdt; const k = Math.min(1, play.t / play.dur), q = ease(k), T = tools[e.tool], F = play.from;
    if (T && F.x != null) {
      if (e.a === 'fwd' || e.a === 'back') { T.x = F.x + (e.x - F.x) * q; T.y = F.y + (e.y - F.y) * q; }
      if (e.a === 'right' || e.a === 'left') T.a = F.a + (e.a === 'right' ? 1 : -1) * Math.PI / 2 * q;
      if (e.a === 'dance') T.dance = k;
      if (e.a === 'launch') T.lift = q;
      if (e.a === 'land') T.lift = 1 - q;
      if (e.a === 'fail' && e.code === 'battery') T.lift = F.lift * (1 - q);
    }
    if (e.a === 'launch' && tools.drone) tools.drone.lift = q;
    if (k >= 1) {
      if (T && F.x != null) { if (e.a !== 'fail') { T.x = e.x; T.y = e.y; } if (e.a === 'right' || e.a === 'left') T.a = F.a + (e.a === 'right' ? 1 : -1) * Math.PI / 2; T.dance = 0; }
      play.i++; play.t = 0; play.from = null;
    }
  }
  function stop() { play = null; for (const T of Object.values(tools)) { T.wob = 0; T.dance = 0; } }

  function update(rdt) {
    tick(rdt);
    for (const T of Object.values(tools)) { if (T.wob > 0) { T.wob = Math.max(0, T.wob - rdt * 1.2); T.spin += rdt; } }
    placeTools();
    // spinning rotors and propeller, a bob for the flying drone
    const D = tools.drone; if (D && D.show) { for (const r of D.obj.userData.rotors) r.rotation.y += rdt * (D.lift > 0.05 ? 40 : 2); D.obj.position.y += Math.sin(performance.now() / 300) * 0.08 * D.lift; }
    const S = tools.sub; if (S && S.obj.userData.prop) S.obj.userData.prop.rotation.y += rdt * (play ? 18 : 3);
    // flames on the fires that still burn
    fireT -= rdt;
    if (fireT <= 0) { fireT = 0.22; for (const F of fires) if (!F.done) { const X = wx(F.x), Z = wz(F.y); _v.set(X, ground(X, Z) + 0.3, Z); markers.burst(_v, Math.random() < 0.5 ? '#ff8a3a' : '#ffd25a', 6, { speed: 0.5, size: 0.55, life: 0.9, up: 2.2 }); } }
  }
  // the camera's view of the field: target and distance
  function view() {
    const span = Math.max(Wd + 1.2, H * 1.3) * CS;   // the field and קוּבִּי beside it on the left
    const t = new THREE.Vector3(OX - CS * 0.3, ground(OX, OZ) + (sea ? 1 : 0.5), OZ + CS * 0.1);
    const d = span * 0.72 + 5;
    return { target: t, pos: new THREE.Vector3(0, t.y + d * 0.78, t.z + d * 0.72) };
  }
  // where קוּבִּי stands: beyond the field's far left corner (the panel covers the right side), facing the camera
  function kubiSpot() {
    const x = wx(0) - CS * 0.2, z = wz(0) - CS * 0.95;   // behind the far left corner, like a teacher at the board
    return { pos: new THREE.Vector3(x, ground(x, z), z), yaw: 0.3 };
  }
  buildItems();
  return {
    kubiSpot,
    reset: () => { stop(); buildItems(); }, play: start, stop, isPlaying: () => !!play, update, view, redraw: () => { },
    cellPos: (x, y) => new THREE.Vector3(wx(x), ground(wx(x), wz(y)), wz(y)), CS,
    dispose: () => { stop(); clearItems(); for (const e of keep) { try { W.removeEntity(e); } catch (err) { } } scene.remove(root); root.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); },
  };
}
