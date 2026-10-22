// Grove EXTRA animals: the shared helpers (1.3.2: moved here from src/models/grove-animals-extra.js unchanged).
// Colours, materials, geometry helpers, spec cache and makeAnimal, lookAround, pulser, quadAnim, birdAnim.
// It is the extra file's own copy of the helpers (kept as they were in the 1.3.2 pure-move split: merging it with
// ../kit.js would share caches and change small details, see the 1.3.2 report); keep the two in step by hand.
// Exports the helpers the species need and TAU, SPECS (cleared by releaseCaches in index.js).
import * as THREE from 'three';
import { makeRng, hashString, clamp, lerp, damp, cachedMaterial, mergeGeometries } from '../../../core/util.js';

export const TAU = Math.PI * 2;
const V3 = THREE.Vector3;

// ---------------------------------------------------------------- colours & materials
const _cc = new Map();
export const K = (hex) => { let c = _cc.get(hex); if (!c) { c = new THREE.Color(hex); _cc.set(hex, c); } return c; };
const _mix = new THREE.Color();
const mix = (a, b, t) => _mix.copy(K(a)).lerp(K(b), clamp(t));

const MAT = {
  std: () => cachedMaterial('grove-animals:std', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0, flatShading: false })),
  clearWing: () => cachedMaterial('grove-animals:clearwing', () => new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.25, metalness: 0, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false })),
};

// ---------------------------------------------------------------- geometry helpers
export function h3(x, y, z, s) {
  let h = Math.imul(x | 0, 73856093) ^ Math.imul(y | 0, 19349663) ^ Math.imul(z | 0, 83492791) ^ Math.imul(s | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return h >>> 0;
}
// Jitter vertices by a hash of their (quantised) position, so coincident vertices move together (no cracks).
export function wobble(g, amt, seed = 1) {
  if (!amt) return g;
  amt *= 0.55; // soft, not lumpy
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const h = h3(Math.round(x * 4000), Math.round(y * 4000), Math.round(z * 4000), seed);
    p.setXYZ(i, x + ((h & 255) / 255 - 0.5) * 2 * amt, y + (((h >>> 8) & 255) / 255 - 0.5) * 2 * amt, z + (((h >>> 16) & 255) / 255 - 0.5) * 2 * amt);
  }
  p.needsUpdate = true; return g;
}

const _a = new V3(), _b = new V3(), _c = new V3(), _n = new V3(), _cen = new V3(), _e1 = new V3(), _e2 = new V3();
export const _col = new THREE.Color();
const pkey = (x, y, z) => Math.round(x * 20000) + '|' + Math.round(y * 20000) + '|' + Math.round(z * 20000);
// Smooth (area-weighted) normals for a NON-indexed geometry: vertices sharing a position share a normal.
function smoothNormals(g) {
  const p = g.attributes.position; const n = p.count; const acc = new Map(); const keys = new Array(n);
  for (let i = 0; i < n; i += 3) {
    _a.fromBufferAttribute(p, i); _b.fromBufferAttribute(p, i + 1); _c.fromBufferAttribute(p, i + 2);
    _e1.subVectors(_b, _a); _e2.subVectors(_c, _a); _n.crossVectors(_e1, _e2);
    for (let j = 0; j < 3; j++) {
      const k = keys[i + j] = pkey(p.getX(i + j), p.getY(i + j), p.getZ(i + j));
      let v = acc.get(k); if (!v) { v = [0, 0, 0]; acc.set(k, v); }
      v[0] += _n.x; v[1] += _n.y; v[2] += _n.z;
    }
  }
  const nor = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = acc.get(keys[i]); const l = Math.hypot(v[0], v[1], v[2]) || 1;
    nor[i * 3] = v[0] / l; nor[i * 3 + 1] = v[1] / l; nor[i * 3 + 2] = v[2] / l;
  }
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.userData.keys = keys; return g;
}
// Colouring: fn(point, normal, triIndex, userData) → hex | Color.
// fn with ≤2 params is evaluated PER VERTEX (smooth normal) → soft colour regions & gradients.
// fn that reads triIndex (≥3 params: bands, rings, quill segments) is evaluated per face → crisp bands.
// Both get gentle counter-shading (slightly darker back, lighter belly) and position-hashed mottling.
export function colorize(g, fn, rng, jit = 0.05, shade = 0.09) {
  const ud = g.userData; if (g.index) g = g.toNonIndexed(); g.userData = { ...ud };
  smoothNormals(g);
  const p = g.attributes.position, nr = g.attributes.normal; const n = p.count; const col = new Float32Array(n * 3);
  const perFace = fn.length >= 3; const keys = g.userData.keys; const cache = new Map();
  for (let i = 0, k = 0; i < n; i += 3, k++) {
    let faceCol = null;
    if (perFace) {
      _a.fromBufferAttribute(p, i); _b.fromBufferAttribute(p, i + 1); _c.fromBufferAttribute(p, i + 2);
      _cen.copy(_a).add(_b).add(_c).multiplyScalar(1 / 3);
      _e1.subVectors(_b, _a); _e2.subVectors(_c, _a); _n.crossVectors(_e1, _e2).normalize();
      const r = fn(_cen, _n, k, g.userData); faceCol = (r && r.isColor ? r : K(r)).clone();
    }
    for (let j = 0; j < 3; j++) {
      const vi = i + j; const key = keys[vi];
      let c = perFace ? null : cache.get(key);
      if (!c) {
        _n.fromBufferAttribute(nr, vi);
        if (perFace) c = faceCol.clone();
        else { _cen.fromBufferAttribute(p, vi); const r = fn(_cen, _n, k, g.userData); c = (r && r.isColor ? r : K(r)).clone(); }
        if (jit && rng) { const h = h3(...key.split('|').map(Number), 11); c.multiplyScalar(1 + ((h & 1023) / 1023 * 2 - 1) * jit * 0.6); }
        if (shade) c.multiplyScalar(1 - shade * _n.y);
        if (!perFace) cache.set(key, c);
      }
      col[vi * 3] = c.r; col[vi * 3 + 1] = c.g; col[vi * 3 + 2] = c.b;
    }
  }
  delete g.userData.keys;
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}
export const paintG = (g, hex, rng, jit = 0.04) => colorize(g, () => hex, rng, jit);

// Loft: rings [{p:[x,y,z], r:number|[rx,ry]}] → tube with elliptic sections (organic tapered bodies, legs, tails).
// opts: up (reference for the "vertical" ring axis), tipStart/tipEnd (pointed caps), capStart/capEnd.
export function loft(rings, sides = 8, o = {}) {
  if (sides >= 8 && !o.raw) { // bodies / heads: rounder sections, Catmull-Rom subdivided rings → soft silhouettes
    sides = sides + 4;
    if (rings.length >= 3 && rings.length <= 9) rings = subdivRings(rings);
  }
  const up0 = new V3(...(o.up || [0, 1, 0]));
  const N = rings.length; const P = rings.map(r => new V3(...r.p));
  const pos = []; const idx = []; const T = [];
  for (let i = 0; i < N; i++) {
    const t = new V3();
    if (i === 0) t.subVectors(P[1], P[0]); else if (i === N - 1) t.subVectors(P[N - 1], P[N - 2]); else t.subVectors(P[i + 1], P[i - 1]);
    t.normalize(); T.push(t);
    const side = new V3().crossVectors(up0, t);
    if (side.lengthSq() < 1e-6) side.crossVectors(new V3(0, 0, 1), t);
    side.normalize();
    const nup = new V3().crossVectors(t, side).normalize();
    const r = rings[i].r; const rx = Array.isArray(r) ? r[0] : r, ry = Array.isArray(r) ? r[1] : r;
    for (let j = 0; j < sides; j++) {
      const a = (j / sides) * TAU + (o.phase || 0);
      const ca = Math.cos(a) * rx, sa = Math.sin(a) * ry;
      pos.push(P[i].x + side.x * ca + nup.x * sa, P[i].y + side.y * ca + nup.y * sa, P[i].z + side.z * ca + nup.z * sa);
    }
  }
  for (let i = 0; i < N - 1; i++) for (let j = 0; j < sides; j++) {
    const a = i * sides + j, b = i * sides + (j + 1) % sides, c = a + sides, d = b + sides;
    idx.push(a, b, c, b, d, c);
  }
  if (o.capStart !== false) {
    const ci = pos.length / 3; const cp = P[0].clone().addScaledVector(T[0], -(o.tipStart || 0));
    pos.push(cp.x, cp.y, cp.z);
    for (let j = 0; j < sides; j++) idx.push(ci, (j + 1) % sides, j);
  }
  if (o.capEnd !== false) {
    const ci = pos.length / 3; const cp = P[N - 1].clone().addScaledVector(T[N - 1], o.tipEnd || 0);
    pos.push(cp.x, cp.y, cp.z); const b0 = (N - 1) * sides;
    for (let j = 0; j < sides; j++) idx.push(ci, b0 + j, b0 + (j + 1) % sides);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  g.userData = { sides, segs: N - 1 };
  return g;
}
function subdivRings(rings) {
  const out = []; const N = rings.length;
  const R = (r) => Array.isArray(r) ? r : [r, r];
  for (let i = 0; i < N; i++) {
    out.push(rings[i]); if (i === N - 1) break;
    const p0 = rings[Math.max(0, i - 1)].p, p1 = rings[i].p, p2 = rings[i + 1].p, p3 = rings[Math.min(N - 1, i + 2)].p;
    const r0 = R(rings[Math.max(0, i - 1)].r), r1 = R(rings[i].r), r2 = R(rings[i + 1].r), r3 = R(rings[Math.min(N - 1, i + 2)].r);
    const cr = (a, b, c, d) => (-a + 9 * b + 9 * c - d) / 16;
    out.push({ p: [0, 1, 2].map(j => cr(p0[j], p1[j], p2[j], p3[j])), r: [Math.max(0.6 * Math.min(r1[0], r2[0]), cr(r0[0], r1[0], r2[0], r3[0])), Math.max(0.6 * Math.min(r1[1], r2[1]), cr(r0[1], r1[1], r2[1], r3[1]))] });
  }
  return out;
}
// Tube along a smooth curve through points; rFn(t∈[0,1]) → radius|[rx,ry]
export function tube(points, n, rFn, sides = 6, o = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new V3(...p)));
  const pts = curve.getPoints(n);
  return loft(pts.map((p, i) => ({ p: [p.x, p.y, p.z], r: rFn(i / n) })), sides, { ...o, raw: true });
}
export const ell = (rx, ry, rz, x = 0, y = 0, z = 0, w = 12, h = 9) => new THREE.SphereGeometry(1, w, h).scale(rx, ry, rz).translate(x, y, z);
// Thin stick between two points (toes, antennae, whiskers)
export const stick = (a, b, r0, r1 = r0 * 0.5, sides = 4) => loft([{ p: a, r: r0 }, { p: b, r: r1 }], sides, { up: Math.abs(b[1] - a[1]) > 0.9 * Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) ? [0, 0, 1] : [0, 1, 0] });

// Thin double-sided plate (wings, tails, butterfly wings): pos(u,v) → [x,y,z], col(u,v,top) → colour.
export function plate(pos, U, Vn, thick, col, rng, jit = 0.04) {
  const P = []; const C = [];
  const grid = [];
  for (let i = 0; i <= U; i++) { grid[i] = []; for (let j = 0; j <= Vn; j++) grid[i][j] = new V3(...pos(i / U, j / Vn)); }
  const tri = (a, b, c, top, cc) => {
    _e1.subVectors(b, a); _e2.subVectors(c, a); _n.crossVectors(_e1, _e2);
    const flip = top ? _n.y < 0 : _n.y > 0;
    const off = top ? thick / 2 : -thick / 2;
    const vs = flip ? [a, c, b] : [a, b, c];
    for (const v of vs) { P.push(v.x, v.y + off, v.z); C.push(cc.r, cc.g, cc.b); }
  };
  for (let i = 0; i < U; i++) for (let j = 0; j < Vn; j++) {
    const A = grid[i][j], B = grid[i + 1][j], Cc = grid[i][j + 1], D = grid[i + 1][j + 1];
    for (const top of [true, false]) {
      const r = col((i + 0.5) / U, (j + 0.5) / Vn, top);
      const cc = (r && r.isColor ? r : K(r)).clone();
      if (jit && rng) cc.multiplyScalar(1 + (rng() * 2 - 1) * jit);
      tri(A, B, Cc, top, cc); tri(B, D, Cc, top, cc);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  smoothNormals(g); delete g.userData.keys; return g;
}
// Mirror a non-indexed geometry across X (fix winding)
export function mirrorX(g) {
  const m = g.index ? g.toNonIndexed() : g.clone();
  const p = m.attributes.position; for (let i = 0; i < p.count; i++) p.setX(i, -p.getX(i));
  for (const key of Object.keys(m.attributes)) {
    const at = m.attributes[key]; const s = at.itemSize; const arr = at.array;
    for (let i = 0; i < at.count; i += 3) for (let c = 0; c < s; c++) {
      const i1 = (i + 1) * s + c, i2 = (i + 2) * s + c; const tmp = arr[i1]; arr[i1] = arr[i2]; arr[i2] = tmp;
    }
  }
  smoothNormals(m); delete m.userData.keys; return m;
}
export const merge = (list) => mergeGeometries(list.filter(Boolean));
export const add3 = (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];

// Eyes: round glossy bead + a bright catch-light, slightly larger than life for a friendly read.
export function eyes(x, y, z, r, color = '#120c08', rng, hl = true) {
  const out = []; r *= 1.12;
  for (const s of [1, -1]) {
    out.push(colorize(ell(r, r, r, s * x, y, z, 10, 8), () => color, null, 0, 0));
    if (hl) out.push(colorize(ell(r * 0.36, r * 0.36, r * 0.2, s * (x + r * 0.42), y + r * 0.48, z + r * 0.72, 6, 4), () => '#ffffff', null, 0, 0));
  }
  return out;
}
// ---------------------------------------------------------------- spec cache & assembly
export const SPECS = new Map();
function getSpec(id, seed, builder) {
  const v = (((seed | 0) % 3) + 3) % 3; const key = id + ':' + v;
  let s = SPECS.get(key);
  if (!s) { s = builder(makeRng(hashString(id) + v * 7919 + 13), v); finalize(s); SPECS.set(key, s); }
  return s;
}
function finalize(spec) {
  const by = {}; spec.tris = 0;
  for (const p of spec.parts) {
    by[p.name] = p; p.pivot = p.pivot || [0, 0, 0];
    const g = p.geom; const [px, py, pz] = p.pivot;
    g.translate(-px, -py, -pz);
    const ma = g.morphAttributes.position;
    if (ma) for (const m of ma) { for (let i = 0; i < m.count; i++) m.setXYZ(i, m.getX(i) - px, m.getY(i) - py, m.getZ(i) - pz); }
    g.computeBoundingSphere(); g.computeBoundingBox();
    const pp = p.parent ? by[p.parent].pivot : [0, 0, 0];
    p.local = [px - pp[0], py - pp[1], pz - pp[2]];
    spec.tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
  }
}
function instantiate(spec, matOverride) {
  const object = new THREE.Group(); const rig = new THREE.Group(); rig.name = 'rig'; object.add(rig);
  const n = { rig }; const meshes = [];
  for (const p of spec.parts) {
    const grp = new THREE.Group(); grp.name = p.name; grp.position.fromArray(p.local);
    const mat = p.mat ? p.mat() : (matOverride || MAT.std());
    const mesh = new THREE.Mesh(p.geom, mat);
    mesh.castShadow = !p.noShadow; mesh.receiveShadow = !p.noShadow; grp.add(mesh);
    (p.parent ? n[p.parent] : rig).add(grp); n[p.name] = grp; n[p.name + 'Mesh'] = mesh; meshes.push(mesh);
  }
  for (const k in n) n[k].userData.base = n[k].position.clone();
  return { object, n, meshes };
}
export function makeAnimal(id, opts, builder, animFactory, { perInstanceMaterial = false } = {}) {
  opts = opts || {};
  const seed = opts.seed ?? (opts.rng ? Math.floor(opts.rng() * 1e6) : 1);
  const spec = getSpec(id, seed, builder);
  const ownMat = perInstanceMaterial ? MAT.std().clone() : null;
  const inst = instantiate(spec, ownMat);
  inst.object.name = id;
  const rng = makeRng(((seed * 2654435761) ^ hashString(id + 'inst')) >>> 0);
  const sc = 0.94 + rng() * 0.12; inst.object.scale.setScalar(sc);
  const step = animFactory(inst.n, spec, rng, inst, ownMat);
  step(0.016, { action: 'idle', speed: 0, t: 0, night: 0 });
  return {
    type: 'animal', object: inst.object,
    height: spec.height * sc, length: spec.length * sc,
    perchOffset: (spec.perchOffset || 0) * sc,
    tris: spec.tris, meshCount: inst.meshes.length,
    update(dt, s) { step(clamp(dt || 0, 0, 0.1), s || {}); },
    dispose() { inst.object.removeFromParent(); if (ownMat) ownMat.dispose(); },
  };
}

// ---------------------------------------------------------------- shared animation helpers
function lookAround(st, rng, dt, yawMax, pitchMax, minT = 1.4, maxT = 4.5, snap = 4) {
  st.lookT = (st.lookT ?? 0) - dt;
  if (st.lookT <= 0) {
    st.lookT = minT + rng() * (maxT - minT);
    st.tYaw = rng() < 0.3 ? 0 : (rng() * 2 - 1) * yawMax;
    st.tPitch = (rng() * 2 - 1) * pitchMax;
  }
  st.yaw = damp(st.yaw ?? 0, st.tYaw ?? 0, snap, dt);
  st.pitch = damp(st.pitch ?? 0, st.tPitch ?? 0, snap, dt);
}
// burst envelope helper: occasionally triggers a short pulse; returns 0..1
export function pulser(st, key, rng, dt, minGap, maxGap, dur) {
  const k = key + 'T', g = key + 'G';
  if (st[g] === undefined) st[g] = minGap + rng() * (maxGap - minGap);
  st[g] -= dt;
  if (st[g] <= 0) { st[k] = dur; st[g] = minGap + rng() * (maxGap - minGap) + dur; st[key + 'S'] = rng() < 0.5 ? 1 : -1; }
  if (st[k] > 0) { st[k] -= dt; return Math.sin(clamp(1 - st[k] / dur) * Math.PI); }
  return 0;
}

// Quadruped animator: gait (walk = lateral sequence, run = gallop/bound), bob, tail, head look, ears, eat, sleep.
export function quadAnim(cfg) {
  return (n, spec, rng, inst) => {
    const st = { ph: rng() * TAU, t: rng() * 100, wMove: 0, wRun: 0, wSleep: 0, wEat: 0, eatLift: 0 };
    const legs = ['legFL', 'legFR', 'legHL', 'legHR'].map(k => n[k]);
    const walkOff = [Math.PI * 0.5, Math.PI * 1.5, 0, Math.PI];
    const runOff = cfg.runOff || [0, 0.4, Math.PI, Math.PI + 0.4];
    const B = n.body.userData.base;
    return (dt, s) => {
      const a = s.action || 'idle'; st.t += dt; const t = st.t;
      const moving = a === 'walk' || a === 'run' || a === 'climb' || a === 'swim';
      const run = a === 'run';
      let spd = s.speed || 0; if (moving && spd < 0.05) spd = run ? cfg.runSpeed : cfg.walkSpeed;
      st.wMove = damp(st.wMove, moving ? 1 : 0, 6, dt);
      st.wRun = damp(st.wRun, run ? 1 : 0, 4, dt);
      st.wSleep = damp(st.wSleep, a === 'sleep' ? 1 : 0, 2.2, dt);
      st.wEat = damp(st.wEat, a === 'eat' ? 1 : 0, 3.5, dt);
      const wm = st.wMove, wr = st.wRun, ws = st.wSleep, we = st.wEat * (1 - ws);
      const stride = lerp(cfg.walkStride, cfg.runStride, wr);
      if (moving) st.ph += dt * Math.min(spd, cfg.runSpeed * 1.5) / stride * TAU;
      const amp = lerp(cfg.walkAmp, cfg.runAmp, wr) * wm;
      for (let i = 0; i < 4; i++) {
        const L = legs[i]; const front = i < 2;
        const ph = st.ph + lerp(walkOff[i], runOff[i], wr);
        const sw = Math.sin(ph), lift = Math.max(0, Math.cos(ph));
        L.rotation.x = -amp * sw * (front ? 1 : cfg.hindAmp || 1) + ws * (front ? -cfg.foldF : cfg.foldH) + we * (front ? cfg.eatSplay || 0 : 0);
        L.rotation.z = 0;
        L.scale.y = 1 - cfg.lift * lift * wm - ws * (cfg.sleepShrink || 0);
      }
      // body motion
      const idleW = (1 - wm) * (1 - ws) * (1 - we);
      const breathe = Math.sin(t * (ws > 0.5 ? 1.4 : 2.4)) * (0.012 + 0.02 * ws);
      const walkBob = cfg.walkBob * (0.5 + 0.5 * Math.cos(2 * st.ph)) * (1 - wr);
      const air = Math.pow(Math.max(0, Math.sin(st.ph - (cfg.airPhase || 0))), 1.5);
      n.rig.position.y = wm * (walkBob + wr * cfg.runLift * air);
      n.rig.rotation.x = wr * wm * cfg.runPitch * Math.cos(st.ph) + we * (cfg.eatPitch || 0);
      n.body.position.y = B.y - ws * cfg.sleepDrop - we * (cfg.eatDrop || 0);
      n.body.rotation.z = wm * (1 - wr) * (cfg.roll || 0.02) * Math.sin(st.ph) + ws * (cfg.sleepRoll || 0);
      n.body.rotation.y = wm * (cfg.yawSway || 0) * Math.sin(st.ph);
      n.body.scale.set(1 + breathe * 0.6, 1 + breathe, 1);
      // head
      lookAround(st, rng, dt, cfg.lookYaw ?? 0.7, cfg.lookPitch ?? 0.2);
      // vigilance while eating: lift head periodically
      const lift = pulser(st, 'eatL', rng, dt, 3.5, 7, 1.6) * we;
      st.eatLift = damp(st.eatLift, lift, 6, dt);
      const eatW = we * (1 - st.eatLift);
      const chew = Math.sin(t * 9) * 0.04 * eatW;
      const nodWalk = wm * (cfg.nod || 0.05) * Math.sin(2 * st.ph + 0.5);
      const head = n.head;
      if (n.neck) {
        n.neck.rotation.x = eatW * cfg.eatNeck + ws * (cfg.sleepNeck || 0) + nodWalk + idleW * st.pitch * 0.4 - wr * 0.15;
        n.neck.rotation.y = st.yaw * idleW * 0.5 + ws * (cfg.sleepYaw || 0) * 0.5;
        head.rotation.x = eatW * cfg.eatHead + ws * (cfg.sleepHead || 0) + idleW * st.pitch * 0.6 + chew;
        head.rotation.y = st.yaw * idleW * 0.6 + ws * (cfg.sleepYaw || 0) * 0.5 + st.eatLift * st.yaw * 0.8;
      } else {
        head.rotation.x = eatW * cfg.eatHead + ws * (cfg.sleepHead || 0) + idleW * st.pitch + nodWalk + chew - wr * (cfg.runHeadUp || 0);
        head.rotation.y = st.yaw * (idleW + st.eatLift * 0.6) + ws * (cfg.sleepYaw || 0);
      }
      if (cfg.sniff) { head.rotation.x += Math.sin(t * 17) * 0.05 * (1 - ws) * (idleW + we); }
      // ears: twitch + back when running
      const tw = pulser(st, 'ear', rng, dt, 1.2, 4.5, 0.28);
      for (const [k, side] of [['earL', 1], ['earR', -1]]) {
        const e = n[k]; if (!e) continue;
        const mine = (st.earS === side) ? tw : 0;
        e.rotation.z = -side * mine * 0.45; e.rotation.x = -wr * 0.6 - ws * 0.5 + mine * 0.2;
      }
      // tail
      if (n.tail) {
        const flick = cfg.tailFlick ? pulser(st, 'flick', rng, dt, 0.6, 2.5, 0.5) : 0;
        n.tail.rotation.y = idleW * (cfg.tailIdle || 0.1) * Math.sin(t * (cfg.tailHz || 1.3)) + wm * (cfg.tailWalk || 0.15) * Math.sin(st.ph)
          + flick * Math.sin(t * 30) * 0.5 + ws * (cfg.sleepTail || 0);
        n.tail.rotation.x = -wr * (cfg.tailRunLift || 0) + wm * (1 - wr) * (cfg.tailWalkLift || 0) - flick * 0.4 + ws * (cfg.sleepTailX || 0);
      }
      if (cfg.extra) cfg.extra(n, st, s, dt, { wm, wr, ws, we, idleW, t, rng });
    };
  };
}

// Bird animator: perched (tilted, wings folded, head turns, tail flicks, hops, pecks, sleep tuck) ↔ flight
// (flap / glide / hover, banking from yaw rate).
export function birdAnim(cfg) {
  return (n, spec, rng, inst) => {
    const st = { ph: rng() * TAU, hop: 0, t: rng() * 100, wFly: 0, wGlide: 0, wHover: 0, wSleep: 0, wEat: 0, fold: 1, prevYaw: null, bank: 0, burst: 0 };
    const tilt = spec.tilt;
    // folded wing: span → backward along the flank, upper surface facing outward, slight droop & tuck
    const fq = (sd) => {
      const m = new THREE.Matrix4().makeBasis(new V3(0, 0, -sd), new V3(sd, 0, 0), new V3(0, -1, 0));
      const q = new THREE.Quaternion().setFromRotationMatrix(m);
      const adj = new THREE.Quaternion().setFromEuler(new THREE.Euler(-(cfg.foldDroop ?? 0.12), sd * (cfg.foldTuck ?? 0.1), 0, 'XYZ'));
      return adj.multiply(q);
    };
    const qFoldL = fq(1), qFoldR = fq(-1);
    const qa = new THREE.Quaternion(), e = new THREE.Euler();
    return (dt, s) => {
      const a = s.action || 'perch'; st.t += dt; const t = st.t;
      const flying = a === 'fly' || a === 'glide' || a === 'hover';
      st.wFly = damp(st.wFly, flying ? 1 : 0, 5, dt);
      st.wHover = damp(st.wHover, a === 'hover' ? 1 : 0, 4, dt);
      st.wSleep = damp(st.wSleep, a === 'sleep' ? 1 : 0, 2.5, dt);
      st.wEat = damp(st.wEat, a === 'eat' ? 1 : 0, 5, dt);
      const wf = st.wFly;
      // flight: bursts of flapping and glides (owl: long glides; songbirds: undulating)
      let flapAmt = 0, freq = cfg.flapHz;
      if (a === 'fly') {
        st.burst += dt;
        const cyc = cfg.burstCycle || 0; let flapping = true;
        if (cyc) flapping = (st.burst % cyc) < cyc * (cfg.burstFrac || 0.65);
        flapAmt = flapping ? 1 : 0;
      } else if (a === 'hover') { flapAmt = 1; freq *= 1.6; }
      st.wGlide = damp(st.wGlide, flying ? 1 - flapAmt : 0, 4, dt);
      st.flapW = damp(st.flapW ?? 0, flapAmt * wf, 6, dt);
      st.ph += dt * freq * TAU;
      const flap = cfg.flapAmp * Math.sin(st.ph) * st.flapW + cfg.flapBias * st.flapW + st.wGlide * (cfg.dihedral || 0.08) + Math.sin(t * 1.3) * 0.03 * st.wGlide;
      const upFold = st.flapW * cfg.upFold * Math.max(0, Math.cos(st.ph + 0.6));
      // perched fold amount (wings tucked) -> slight droop/flick while perched
      const droop = (1 - wf) * 0.06 * pulser(st, 'wflick', rng, dt, 3, 8, 0.4);
      const fold = clamp((1 - wf) * (1 - droop) + upFold);
      for (const [k, side, qF] of [['wingL', 1, qFoldL], ['wingR', -1, qFoldR]]) {
        const w = n[k];
        e.set(0, side * (cfg.sweep || 0) * st.wGlide, side * flap, 'XYZ'); qa.setFromEuler(e);
        w.quaternion.copy(qa).slerp(qF, fold);
        w.scale.setScalar(lerp(1, cfg.foldScale ?? 1, fold));
      }
      // bank from yaw rate
      const yaw = n.rig.parent.rotation.y;
      if (st.prevYaw === null) st.prevYaw = yaw;
      let dy = yaw - st.prevYaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); st.prevYaw = yaw;
      const yawRate = dt > 0 ? dy / dt : 0;
      st.bank = damp(st.bank, clamp(-yawRate * 0.35, -0.6, 0.6) * wf, 4, dt);
      // posture
      const hoverPitch = -0.7 * st.wHover;
      n.rig.rotation.x = lerp(-tilt, 0.04 + hoverPitch, wf);
      n.rig.rotation.z = st.bank;
      n.rig.position.y = wf * (-cfg.bodyBob * Math.sin(st.ph) * st.flapW);
      // hop (walk on ground / branch)
      const walking = a === 'walk' || a === 'run';
      if (walking) st.hop += dt * (cfg.hopHz || 2.4) * TAU;
      const hopY = walking ? Math.max(0, Math.sin(st.hop)) * (cfg.hopH || 0.04) : 0;
      st.hopY = damp(st.hopY ?? 0, hopY, 20, dt);
      n.rig.position.y += st.hopY;
      // head: quick saccades when perched; peck when eating; tuck when sleeping
      lookAround(st, rng, dt, cfg.lookYaw ?? 1.1, 0.2, 0.5, 2.2, 14);
      const perchW = (1 - wf) * (1 - st.wSleep);
      const peck = st.wEat * Math.max(0, Math.sin(t * 7)) ** 3 * 0.9;
      n.head.rotation.x = lerp(tilt, 0, wf) + st.pitch * perchW * (1 - st.wEat) + peck + st.wEat * 0.35 + st.wSleep * (cfg.sleepHeadX ?? 0.4) + wf * 0.1 * st.wHover;
      n.head.rotation.y = st.yaw * perchW * (1 - st.wEat * 0.7) + st.wSleep * (cfg.sleepHeadY ?? 2.4);
      n.head.position.z = n.head.userData.base.z - st.wSleep * (cfg.sleepTuck || 0);
      const puff = 1 + st.wSleep * 0.08 + Math.sin(t * 2.2) * 0.012 * (1 - wf);
      n.body.scale.set(puff, puff, 1);
      // tail flicks (blackbird/jay cock tails)
      const flick = pulser(st, 'tflick', rng, dt, cfg.flickGap?.[0] ?? 1.5, cfg.flickGap?.[1] ?? 4, 0.3) * (1 - wf);
      if (n.tail) {
        n.tail.rotation.x = flick * (cfg.flick || 0.5) + wf * (0.15 * st.wHover - 0.05) + st.hopY * 4;
        const spread = 1 + wf * 0.35 * (st.wGlide + st.wHover);
        n.tail.scale.set(spread, 1, 1);
      }
    };
  };
}
