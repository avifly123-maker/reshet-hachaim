// Extra grove (חורש) animals: hoopoe (דוכיפת), spur-thighed tortoise (צב יבשה מצוי), chukar (חוגלת סלעים).
// Same API & look as src/models/grove-animals.js (smooth-shaded lofted bodies, per-vertex colour gradients, cute eyes,
// procedural animation). The shared helpers below are copied verbatim from grove-animals.js (which does not export them).
// export ANIMALS_EXTRA = { hoopoe, tortoise, chukar }  — each (opts) => AnimalVisual
// Models face +Z. hoopoe (flying): origin at body centre + perchOffset. tortoise / chukar (ground): origin on the ground.
import * as THREE from 'three';
import { makeRng, hashString, clamp, lerp, damp, smoothstep, cachedMaterial, mergeGeometries, disposeDeep, releaseMaterials } from '../core/util.js';

const TAU = Math.PI * 2;
const V3 = THREE.Vector3;

// ---------------------------------------------------------------- colours & materials
const _cc = new Map();
const K = (hex) => { let c = _cc.get(hex); if (!c) { c = new THREE.Color(hex); _cc.set(hex, c); } return c; };
const _mix = new THREE.Color();
const mix = (a, b, t) => _mix.copy(K(a)).lerp(K(b), clamp(t));

const MAT = {
  std: () => cachedMaterial('grove-animals:std', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0, flatShading: false })),
  clearWing: () => cachedMaterial('grove-animals:clearwing', () => new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.25, metalness: 0, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false })),
};

// ---------------------------------------------------------------- geometry helpers
function h3(x, y, z, s) {
  let h = Math.imul(x | 0, 73856093) ^ Math.imul(y | 0, 19349663) ^ Math.imul(z | 0, 83492791) ^ Math.imul(s | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return h >>> 0;
}
// Jitter vertices by a hash of their (quantised) position, so coincident vertices move together (no cracks).
function wobble(g, amt, seed = 1) {
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
const _col = new THREE.Color();
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
function colorize(g, fn, rng, jit = 0.05, shade = 0.09) {
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
const paintG = (g, hex, rng, jit = 0.04) => colorize(g, () => hex, rng, jit);

// Loft: rings [{p:[x,y,z], r:number|[rx,ry]}] → tube with elliptic sections (organic tapered bodies, legs, tails).
// opts: up (reference for the "vertical" ring axis), tipStart/tipEnd (pointed caps), capStart/capEnd.
function loft(rings, sides = 8, o = {}) {
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
function tube(points, n, rFn, sides = 6, o = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new V3(...p)));
  const pts = curve.getPoints(n);
  return loft(pts.map((p, i) => ({ p: [p.x, p.y, p.z], r: rFn(i / n) })), sides, { ...o, raw: true });
}
const ell = (rx, ry, rz, x = 0, y = 0, z = 0, w = 12, h = 9) => new THREE.SphereGeometry(1, w, h).scale(rx, ry, rz).translate(x, y, z);
// Thin stick between two points (toes, antennae, whiskers)
const stick = (a, b, r0, r1 = r0 * 0.5, sides = 4) => loft([{ p: a, r: r0 }, { p: b, r: r1 }], sides, { up: Math.abs(b[1] - a[1]) > 0.9 * Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) ? [0, 0, 1] : [0, 1, 0] });

// Thin double-sided plate (wings, tails, butterfly wings): pos(u,v) → [x,y,z], col(u,v,top) → colour.
function plate(pos, U, Vn, thick, col, rng, jit = 0.04) {
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
function mirrorX(g) {
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
const merge = (list) => mergeGeometries(list.filter(Boolean));
const add3 = (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];

// Eyes: round glossy bead + a bright catch-light, slightly larger than life for a friendly read.
function eyes(x, y, z, r, color = '#120c08', rng, hl = true) {
  const out = []; r *= 1.12;
  for (const s of [1, -1]) {
    out.push(colorize(ell(r, r, r, s * x, y, z, 10, 8), () => color, null, 0, 0));
    if (hl) out.push(colorize(ell(r * 0.36, r * 0.36, r * 0.2, s * (x + r * 0.42), y + r * 0.48, z + r * 0.72, 6, 4), () => '#ffffff', null, 0, 0));
  }
  return out;
}
// ---------------------------------------------------------------- spec cache & assembly
const SPECS = new Map();
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
function makeAnimal(id, opts, builder, animFactory, { perInstanceMaterial = false } = {}) {
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
function pulser(st, key, rng, dt, minGap, maxGap, dur) {
  const k = key + 'T', g = key + 'G';
  if (st[g] === undefined) st[g] = minGap + rng() * (maxGap - minGap);
  st[g] -= dt;
  if (st[g] <= 0) { st[k] = dur; st[g] = minGap + rng() * (maxGap - minGap) + dur; st[key + 'S'] = rng() < 0.5 ? 1 : -1; }
  if (st[k] > 0) { st[k] -= dt; return Math.sin(clamp(1 - st[k] / dur) * Math.PI); }
  return 0;
}

// Quadruped animator: gait (walk = lateral sequence, run = gallop/bound), bob, tail, head look, ears, eat, sleep.
function quadAnim(cfg) {
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
function birdAnim(cfg) {
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

function legLoft(pts, sides = 6) { return loft(pts.map(([x, y, z, r]) => ({ p: [x, y, z], r })), sides, { up: [0, 0, 1], tipEnd: 0.004 }); }

function birdWing(P, rng, side) {
  const span = P.span, c0 = P.chord;
  const pos = (u, v) => {
    let ch = c0 * (1 - 0.2 * u);
    if (u > P.tipStart) { const q = (u - P.tipStart) / (1 - P.tipStart); ch *= Math.sqrt(Math.max(0.05, 1 - q * q * 0.92)); }
    const zl = 0.14 * c0 * Math.sin(u * Math.PI * 0.85) - (P.sweep || 0.25) * c0 * u * u;
    let z = zl - v * ch;
    z -= Math.pow(v, 4) * (P.scallop || 0) * c0 * Math.abs(Math.sin(u * Math.PI * (P.feathers || 4))) * smoothstep(0.35, 0.65, u);
    const y = (P.camber || 0.08) * c0 * Math.sin(Math.PI * v) * (1 - 0.6 * u);
    return [u * span, y, z];
  };
  const g = plate(pos, P.U || 9, P.V || 3, P.thick || 0.008, P.col, rng, 0.05);
  const gg = side < 0 ? mirrorX(g) : g;
  return gg.translate(side * P.pivot[0], P.pivot[1], P.pivot[2]);
}

// ================================================================ EXTRA SPECIES
// Bird builder variant: like grove-animals' buildBird, plus optional separate legs (animated stride), merged tail,
// and extra parts (e.g. an erectile crest).
function buildBirdX(rng, P) {
  const tilt = P.tilt;
  const d = [0, -Math.cos(tilt), -Math.sin(tilt)], fwd = [0, -Math.sin(tilt), Math.cos(tilt)];
  const bodyParts = [colorize(wobble(loft(P.bodyRings, 10), P.wob || 0.003, 1), P.bodyCol, rng, 0.05), ...(P.bodyExtra ? P.bodyExtra(rng) : [])];
  const legGeo = {};
  for (const sd of [1, -1]) {
    const hip = [sd * P.hipX, P.hipY, P.hipZ]; const foot = add3(hip, d, P.legLen);
    const lp = [];
    if (P.thigh) lp.push(paintG(ell(P.thigh[0], P.thigh[1], P.thigh[0], ...add3(hip, d, P.legLen * 0.3), 6, 4), P.thighCol, rng));
    lp.push(colorize(loft([{ p: hip, r: P.legR * 1.4 }, { p: add3(hip, d, P.legLen * 0.5), r: P.legR }, { p: foot, r: P.legR * 0.9 }], 5, { up: [1, 0, 0] }), () => P.legCol, rng, 0.03));
    const toe = (dir, len) => colorize(stick(foot, add3(foot, dir, len), P.legR * 0.8, P.legR * 0.4), () => P.clawCol || P.legCol, rng, 0.03);
    const T = P.toe;
    lp.push(toe([fwd[0], fwd[1], fwd[2]], T), toe([sd * 0.55, fwd[1] * 0.8, fwd[2] * 0.8], T * 0.85), toe([-sd * 0.4, fwd[1] * 0.8, fwd[2] * 0.85], T * 0.85), toe([0, -fwd[1], -fwd[2]], T * 0.6));
    if (P.legsSeparate) legGeo[sd] = { geom: merge(lp), pivot: hip }; else bodyParts.push(...lp);
  }
  const tail = plate((u, v) => [(v - 0.5) * lerp(P.tail.w0, P.tail.w1, u), 0, -u * P.tail.len], 3, 4, 0.006, P.tail.col, rng, 0.04)
    .translate(...P.tail.pivot);
  if (P.tailMerged) bodyParts.push(P.tail.rot ? tail.translate(...P.tail.pivot.map(x => -x)).rotateX(P.tail.rot).translate(...P.tail.pivot) : tail);
  const body = merge(bodyParts);
  const hipWorldY = P.hipY * Math.cos(tilt) + P.hipZ * Math.sin(tilt);
  const perchOffset = -hipWorldY + P.legLen + P.legR;
  const wl = birdWing(P.wing, rng, 1), wr = birdWing(P.wing, rng, -1);
  const parts = [
    { name: 'body', geom: body, pivot: [0, 0, 0] },
    { name: 'head', geom: P.head(rng), pivot: P.headPivot, parent: 'body' },
    { name: 'wingL', geom: wl, pivot: [P.wing.pivot[0], P.wing.pivot[1], P.wing.pivot[2]], parent: 'body' },
    { name: 'wingR', geom: wr, pivot: [-P.wing.pivot[0], P.wing.pivot[1], P.wing.pivot[2]], parent: 'body' },
  ];
  if (!P.tailMerged) parts.push({ name: 'tail', geom: tail, pivot: P.tail.pivot, parent: 'body' });
  if (P.legsSeparate) parts.push({ name: 'legL', geom: legGeo[1].geom, pivot: legGeo[1].pivot, parent: 'body' }, { name: 'legR', geom: legGeo[-1].geom, pivot: legGeo[-1].pivot, parent: 'body' });
  for (const x of P.extraParts ? P.extraParts(rng) : []) parts.push(x);
  return { height: P.height, length: P.length, tilt, perchOffset, parts };
}

// ---------------------------------------------------------------- HOOPOE (דוכיפת)
// Pinkish-cinnamon body, zebra-barred black & white wings and back, white rump, black tail with a white band,
// long thin down-curved bill, erectile fan crest with black tips (separate part, fan spread via morph target).
function buildHoopoe(rng) {
  const cin = '#d08a5c', cinL = '#e0a578', belly = '#efd6b8', blk = '#171313', wht = '#f4efe6';
  const crestFeathers = (rng) => {
    // feathers authored in a local frame (+Y = feather length), coloured, then laid along the crown midline.
    const N = 9, low = [], high = [];
    for (let i = 0; i < N; i++) {
      const f = i / (N - 1);
      const L = 0.05 + 0.022 * Math.sin(f * Math.PI) + (rng() - 0.5) * 0.004;
      const g = new THREE.SphereGeometry(1, 6, 5).scale(0.0115, L / 2, 0.0035).translate(0, L / 2, 0);
      const cg = colorize(g, (c) => c.y > L * 0.84 ? blk : (c.y > L * 0.7 ? wht : (c.y > L * 0.25 ? cinL : cin)), rng, 0.04, 0);
      const root = [0, 0.074 + 0.008 * Math.sin(f * Math.PI), 0.128 - f * 0.06];
      const aLow = -1.38 - f * 0.12, aHigh = lerp(0.55, -1.45, f);
      low.push(cg.clone().rotateX(aLow).translate(...root));
      high.push(cg.clone().rotateX(aHigh).translate(...root));
    }
    const geom = merge(low); const hi = merge(high);
    geom.morphAttributes.position = [new THREE.Float32BufferAttribute(hi.attributes.position.array, 3)];
    return [{ name: 'crest', geom, pivot: [0, 0.075, 0.1], parent: 'head' }];
  };
  return buildBirdX(rng, {
    tilt: 0.3, height: 0.36, length: 0.5, wob: 0.0025,
    bodyRings: [{ p: [0, 0, -0.12], r: [0.034, 0.034] }, { p: [0, 0, -0.08], r: [0.06, 0.058] }, { p: [0, 0, -0.01], r: [0.068, 0.07] },
      { p: [0, 0.008, 0.05], r: [0.06, 0.064] }, { p: [0, 0.026, 0.095], r: [0.038, 0.042] }],
    bodyCol: (c, n, k) => {
      if (c.z < -0.085 && n.y > -0.1) return wht;                                       // white rump
      if (c.z < -0.025 && n.y > 0.35) return (Math.floor((c.z + 0.3) * 70) % 2) ? blk : wht; // barred lower back
      if (n.y < -0.35) return belly;
      return n.y > 0.6 ? cin : cinL;
    },
    hipX: 0.024, hipY: -0.05, hipZ: 0.0, legLen: 0.06, legR: 0.0055, toe: 0.026, legCol: '#4b4446',
    headPivot: [0, 0.035, 0.09],
    head: (rng) => {
      const h = colorize(wobble(loft([{ p: [0, 0.03, 0.07], r: [0.039, 0.043] }, { p: [0, 0.047, 0.105], r: [0.04, 0.041] }, { p: [0, 0.043, 0.134], r: [0.025, 0.025] }], 8, { tipEnd: 0.008 }), 0.0025, 2),
        (c, n) => n.y < -0.4 ? belly : (n.y > 0.5 ? cin : cinL), rng, 0.04);
      const bill = colorize(tube([[0, 0.042, 0.13], [0, 0.038, 0.17], [0, 0.026, 0.21], [0, 0.006, 0.245]], 6, (t) => lerp(0.0085, 0.0017, t), 5, { tipEnd: 0.004 }),
        (c) => c.z < 0.15 ? '#5a4a46' : '#1d1a1a', rng, 0.03);
      return merge([h, bill, ...eyes(0.031, 0.054, 0.114, 0.0095, '#120c08', rng)]);
    },
    extraParts: crestFeathers,
    wing: {
      pivot: [0.06, -0.035, 0.05], span: 0.25, chord: 0.13, tipStart: 0.72, sweep: 0.12, scallop: 0.12, feathers: 5, camber: 0.1,
      col: (u, v, top) => {
        if (u < 0.1) return top ? cin : belly;
        if (u > 0.88) return blk;
        if (u > 0.68) return (u > 0.75 && u < 0.82) ? wht : blk;                       // white band across the primaries
        return (Math.floor(u * 11) % 2) ? wht : blk;                          // zebra bars
      },
    },
    tail: { pivot: [0, 0.008, -0.11], len: 0.15, w0: 0.04, w1: 0.068, col: (u, v, top) => (u > 0.45 && u < 0.62) ? wht : blk },
  });
}

// ---------------------------------------------------------------- TORTOISE (צב יבשה מצוי)
// High-domed shell with scutes painted by vertex colour (vertebral / costal / marginal rows: dark rims, golden areolae),
// pale plastron, scaly stumpy legs, small head on a neck that withdraws under the shell when sleeping.
function buildTortoise(rng) {
  const RX = 0.17, RY = 0.16, RZ = 0.225, Y0 = 0.075;
  const gold = '#c7a453', goldL = '#d8bb6c', dark = '#4b3820', mid = '#8a6a33';
  // dome: upper part of an ellipsoid, slightly flared rim and gently pinched waist
  const g = new THREE.SphereGeometry(1, 36, 16, 0, TAU, 0, Math.PI * 0.56);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const rim = smoothstep(0.35, -0.05, y);                       // flare outward near the rim
    const s = 1 + rim * 0.07 + (z < 0 ? 0.04 * rim : 0);          // rear marginals flare a touch more
    x *= s; z *= s;
    y = y * (1 - 0.08 * (1 - Math.abs(z)));                        // slightly flattened top
    p.setXYZ(i, x * RX, Y0 + y * RY, z * RZ);
  }
  const scute = (c) => {
    const qx = c.x / (RX * 1.07), qy = (c.y - Y0) / RY, qz = c.z / (RZ * 1.07);
    const el = Math.asin(clamp(qy, -1, 1));                      // 0 at rim … π/2 at top
    const az = Math.atan2(qx, qz);                                 // around the vertical axis
    let cellU, cellV, id;
    if (el < 0.3) {                                                // marginals (24 around the rim)
      const a = (az / TAU + 1) * 24; cellU = a - Math.floor(a); cellV = clamp(el / 0.3); id = Math.floor(a);
    } else if (Math.abs(qx) < 0.3 * Math.cos(el * 0.3) && el > 0.55) { // vertebrals (5 along the midline)
      const w = (qz * 0.5 + 0.5) * 5; cellU = w - Math.floor(w); cellV = (qx / 0.3) * 0.5 + 0.5; id = 100 + Math.floor(w);
    } else {                                                       // costals (4 per side)
      const w = (qz * 0.5 + 0.5) * 4; cellU = w - Math.floor(w); cellV = clamp((el - 0.3) / 0.9); id = (qx > 0 ? 200 : 300) + Math.floor(w);
    }
    const edge = Math.max(Math.abs(cellU - 0.5), Math.abs(cellV - 0.5)) * 2; // 0 centre … 1 border
    const h = (h3(id, 7, 3, 5) & 255) / 255;
    const base = _col.copy(K(gold)).lerp(K(goldL), h * 0.7);
    if (edge > 0.74) return base.lerp(K(dark), 0.9).clone();
    if (edge > 0.5) return base.lerp(K(mid), (edge - 0.5) / 0.24).clone();
    if (edge < 0.22) return base.lerp(K(mid), 0.55).clone();       // darker areola blotch
    return base.clone();
  };
  const shell = colorize(g, scute, rng, 0.04, 0.06);
  const plastron = colorize(ell(RX * 0.93, 0.03, RZ * 0.95, 0, Y0 - 0.002, 0.004, 14, 6), (c, n) => n.y > 0.3 ? '#6b5a3c' : '#d2be86', rng, 0.05);
  const skin = '#8b7a5c', skinD = '#6c5d44', skinL = '#a59273';
  const tail = colorize(loft([{ p: [0, 0.07, -0.2], r: 0.02 }, { p: [0, 0.055, -0.25], r: 0.008 }], 5, { tipEnd: 0.012 }), () => skinD, rng, 0.04);
  const body = merge([shell, plastron, tail]);
  // head + neck (one part, pivot deep under the shell so it can slide back)
  const headL = colorize(wobble(loft([
    { p: [0, 0.088, 0.13], r: [0.034, 0.032] }, { p: [0, 0.098, 0.2], r: [0.032, 0.03] }, { p: [0, 0.112, 0.25], r: [0.04, 0.037] },
    { p: [0, 0.115, 0.285], r: [0.036, 0.032] }, { p: [0, 0.108, 0.31], r: [0.022, 0.02] }], 8, { tipEnd: 0.008, capStart: false }), 0.002, 2),
  (c, n) => {
    if (c.z > 0.303 && n.y < 0.2) return '#3a3026';                 // horny beak edge
    if (c.z > 0.23 && n.y > 0.45) return skinD;                     // head scutes
    if (n.y < -0.3) return skinL;
    return skin;
  }, rng, 0.05);
  const head = merge([headL, ...eyes(0.028, 0.124, 0.285, 0.0075, '#120c08', rng)]);
  // legs: stumpy columns, front legs wider and covered in big pale scales
  const legs = {};
  for (const [k, sd, fr] of [['legFL', 1, 1], ['legFR', -1, 1], ['legHL', 1, 0], ['legHR', -1, 0]]) {
    const x = sd * 0.115, z = fr ? 0.13 : -0.13;
    const pts = fr ? [[x, 0.1, z, [0.04, 0.034]], [x + sd * 0.025, 0.05, z + 0.02, [0.034, 0.028]], [x + sd * 0.035, 0.012, z + 0.03, [0.034, 0.03]]]
      : [[x, 0.1, z, [0.045, 0.04]], [x + sd * 0.025, 0.05, z - 0.01, [0.038, 0.034]], [x + sd * 0.03, 0.012, z - 0.012, [0.036, 0.034]]];
    const geom = colorize(wobble(legLoft(pts, 7), 0.003, 5 + sd), (c, n, i) => (h3(i, 3, sd, 9) & 3) === 0 ? skinL : (c.y < 0.02 ? '#4d4232' : skin), rng, 0.05);
    legs[k] = { geom, pivot: [x, 0.1, z] };
  }
  return {
    height: 0.27, length: 0.55,
    parts: [
      { name: 'body', geom: body, pivot: [0, 0.1, 0] },
      { name: 'head', geom: head, pivot: [0, 0.09, 0.13], parent: 'body' },
      ...['legFL', 'legFR', 'legHL', 'legHR'].map(k => ({ name: k, geom: legs[k].geom, pivot: legs[k].pivot, parent: 'body' })),
    ],
  };
}

// ---------------------------------------------------------------- CHUKAR (חוגלת סלעים)
// Plump grey-sand partridge: blue-grey breast, buff belly, black-white-chestnut barred flanks, cream throat framed by a
// black band through the eye that forms a necklace, coral-red bill, red eye-ring and red legs. Legs animated separately.
function buildChukar(rng) {
  const back = '#b09d82', backD = '#9c8a70', breast = '#a2a5ab', buff = '#d9bf98', cream = '#f1e7d3', blk = '#1b1817', red = '#d23f30';
  return buildBirdX(rng, {
    tilt: 0.12, height: 0.36, length: 0.5, wob: 0.003, legsSeparate: true, tailMerged: true,
    bodyRings: [{ p: [0, 0.0, -0.15], r: [0.04, 0.036] }, { p: [0, 0, -0.105], r: [0.085, 0.08] }, { p: [0, 0, -0.025], r: [0.102, 0.1] },
      { p: [0, 0.012, 0.055], r: [0.09, 0.094] }, { p: [0, 0.035, 0.105], r: [0.05, 0.055] }],
    bodyCol: (c, n) => {
      if (Math.abs(n.x) > 0.6 && n.y < 0.3 && n.y > -0.5 && c.z > -0.1 && c.z < 0.05) return '#c9b8a0';   // flank ground (bars added below)
      if (n.y < -0.4) return buff;
      if (c.z > 0.03 && n.y < 0.55) return breast;
      return n.y > 0.75 ? backD : back;
    },
    bodyExtra: (rng) => {                                          // bold black / chestnut bars on the flanks
      const out = [];
      for (const sd of [1, -1]) for (let j = 0; j < 7; j++) {
        const z = -0.085 + j * 0.02, x = sd * (0.094 - Math.abs(z + 0.02) * 0.12);
        const g = ell(0.006, 0.038, 0.0095, 0, 0, 0, 6, 5).rotateX(-0.25).rotateZ(sd * 0.32).translate(x, -0.012, z);
        out.push(colorize(g, () => (j % 2 ? '#a5603a' : blk), rng, 0.03, 0));
      }
      return out;
    },
    hipX: 0.035, hipY: -0.06, hipZ: -0.005, legLen: 0.085, legR: 0.0075, toe: 0.032, legCol: red, clawCol: '#b5372b',
    headPivot: [0, 0.04, 0.1],
    head: (rng) => {
      const h = colorize(wobble(loft([{ p: [0, 0.035, 0.085], r: [0.042, 0.046] }, { p: [0, 0.058, 0.125], r: [0.042, 0.042] }, { p: [0, 0.058, 0.155], r: [0.027, 0.027] }], 8, { tipEnd: 0.008 }), 0.0025, 2),
        (c, n) => (n.y < -0.15 && c.z > 0.1) ? cream : (n.y > 0.55 ? '#9d9590' : (c.z > 0.14 && n.y < 0.3 ? cream : '#b3aca5')), rng, 0.04);
      const bands = [];
      for (const sd of [1, -1]) {                                   // black stripe: bill base → through the eye → down the neck
        bands.push(colorize(tube([[sd * 0.014, 0.066, 0.153], [sd * 0.029, 0.068, 0.138], [sd * 0.04, 0.058, 0.118], [sd * 0.044, 0.036, 0.1], [sd * 0.036, 0.015, 0.108]], 8, (t) => 0.0062 - t * 0.0012, 4), () => blk, null, 0, 0));
      }
      const neck = [];                                              // necklace across the throat
      for (let i = 0; i <= 8; i++) { const a = (i / 8 - 0.5) * 2.0; neck.push([Math.sin(a) * 0.036, 0.012 - 0.004 * Math.cos(a), 0.112 + Math.cos(a) * 0.025]); }
      bands.push(colorize(tube(neck, 10, () => 0.0058, 4), () => blk, null, 0, 0));
      const bill = colorize(loft([{ p: [0, 0.058, 0.155], r: [0.0115, 0.0125] }, { p: [0, 0.051, 0.178], r: [0.005, 0.005] }], 5, { tipEnd: 0.006 }), () => red, rng, 0.03);
      return merge([h, ...bands, bill, ...eyes(0.031, 0.067, 0.136, 0.0105, '#d6513a', rng, false), ...eyes(0.0365, 0.0675, 0.139, 0.0068, '#1a0c06', rng)]);
    },
    wing: {
      pivot: [0.097, -0.035, 0.045], span: 0.2, chord: 0.125, tipStart: 0.62, sweep: 0.14, scallop: 0.12, feathers: 5, camber: 0.12,
      col: (u, v, top) => top ? (u > 0.62 ? (v > 0.55 ? '#958670' : '#a3937c') : (v > 0.75 ? '#a08f78' : back)) : (u > 0.6 ? '#c6b9a6' : '#ddd2c2'),
    },
    tail: { pivot: [0, 0.012, -0.135], len: 0.085, w0: 0.045, w1: 0.075, rot: -0.12, col: (u, v, top) => (Math.abs(v - 0.5) > 0.25 ? '#b0653c' : back) },
  });
}

// ---------------------------------------------------------------- animators
const HOOPOE_BASE = birdAnim({ flapHz: 3.2, flapAmp: 1.0, flapBias: 0.12, upFold: 0.35, bodyBob: 0.025, burstCycle: 1.1, burstFrac: 0.55, hopH: 0.012, hopHz: 3.4, flick: 0.35, flickGap: [2, 5], sweep: 0.1, lookYaw: 0.9, sleepHeadY: 2.5, sleepTuck: 0.02, foldScale: 0.85 });
function HOOPOE_ANIM(n, spec, rng, inst) {
  const base = HOOPOE_BASE(n, spec, rng, inst);
  const st = { raise: 0, t: 0 };
  return (dt, s) => {
    base(dt, s);
    const a = s.action || 'perch'; st.t += dt;
    // crest: lies flat most of the time; fans open now and then while idle, on landing/take-off and while probing
    const idle = a === 'idle' || a === 'perch';
    const p = pulser(st, 'cr', rng, dt, 2.5, 6, 1.8);
    if (st.prevA !== a) { st.flash = 1.1; st.prevA = a; }
    st.flash = Math.max(0, (st.flash || 0) - dt);
    let tgt = idle ? p : 0;
    if (a === 'eat') tgt = 0.35 * Math.max(0, Math.sin(st.t * 1.3));
    if (a !== 'sleep' && st.flash > 0) tgt = Math.max(tgt, Math.min(1, st.flash * 2));
    if (a === 'fly' || a === 'glide') tgt = Math.max(tgt, 0.15);
    st.raise = damp(st.raise, tgt, tgt > st.raise ? 9 : 3, dt);
    n.crestMesh.morphTargetInfluences[0] = st.raise;
    n.crest.rotation.x = -0.06 * st.raise * Math.sin(st.t * 9) * (idle ? 1 : 0);
    // probing: deeper, slower jabs of the long bill into the soil
    if (a === 'eat') n.head.rotation.x += 0.25 * Math.max(0, Math.sin(st.t * 3.2)) ** 2;
  };
}

const TORTOISE_ANIM = quadAnim({
  walkSpeed: 0.1, runSpeed: 0.22, walkStride: 0.16, runStride: 0.2, walkAmp: 0.45, runAmp: 0.55, lift: 0.12, hindAmp: 0.9,
  runOff: [Math.PI * 0.5, Math.PI * 1.5, 0, Math.PI], walkBob: 0.006, runLift: 0.0, runPitch: 0.0, roll: 0.035, yawSway: 0.02,
  foldF: 0.0, foldH: 0.0, sleepDrop: 0.038, sleepShrink: 0.55, sleepHead: 0.0, sleepYaw: 0,
  eatHead: 0.55, eatPitch: 0.04, eatDrop: 0.005, lookYaw: 0.55, lookPitch: 0.15, nod: 0.06,
  extra(n, st, s, dt, w) {
    // withdraw head under the shell when sleeping (and briefly flinch when starting to run)
    const B = n.head.userData.base;
    const pull = Math.max(w.ws, 0);
    n.head.position.z = B.z - pull * 0.115 + w.we * 0.012 + w.wm * 0.01 * Math.sin(st.ph * 2);
    n.head.position.y = B.y - pull * 0.012;
    const sc = 1 - pull * 0.25; n.head.scale.set(sc, sc, sc);
    n.head.rotation.x *= 1 - pull; n.head.rotation.y *= 1 - pull;
    for (const k of ['legFL', 'legFR', 'legHL', 'legHR']) n[k].rotation.z = (k[4] === 'L' ? -1 : 1) * pull * 0.35;
    // slow chewing bites when eating
    if (w.we > 0.1) n.head.rotation.x += Math.max(0, Math.sin(w.t * 2.2)) * 0.12 * w.we;
  },
});

const CHUKAR_BASE = birdAnim({ flapHz: 9, flapAmp: 0.9, flapBias: 0.12, upFold: 0.25, bodyBob: 0.02, burstCycle: 1.2, burstFrac: 0.55, hopH: 0.0, hopHz: 3, flick: 0.2, flickGap: [3, 7], sweep: 0.15, lookYaw: 0.8, sleepHeadY: 2.6, sleepTuck: 0.03 });
function CHUKAR_ANIM(n, spec, rng, inst) {
  const base = CHUKAR_BASE(n, spec, rng, inst);
  const st = { ph: rng() * TAU, w: 0, run: 0, tuck: 0 };
  return (dt, s) => {
    base(dt, s);
    const a = s.action || 'idle';
    const moving = a === 'walk' || a === 'run';
    const flying = a === 'fly' || a === 'glide' || a === 'hover';
    let spd = s.speed || 0; if (moving && spd < 0.05) spd = a === 'run' ? 2.2 : 0.45;
    st.w = damp(st.w, moving ? 1 : 0, 8, dt);
    st.run = damp(st.run, a === 'run' ? 1 : 0, 5, dt);
    st.tuck = damp(st.tuck, flying ? 1 : (a === 'sleep' ? 0.6 : 0), 5, dt);
    const stride = lerp(0.12, 0.3, st.run);
    if (moving) st.ph += dt * Math.min(spd, 3) / stride * TAU;
    const amp = lerp(0.55, 0.9, st.run) * st.w;
    const sw = Math.sin(st.ph);
    n.legL.rotation.x = -amp * sw + st.tuck * 1.1;
    n.legR.rotation.x = amp * sw + st.tuck * 1.1;
    n.legL.scale.y = 1 - 0.18 * Math.max(0, Math.cos(st.ph)) * st.w - st.tuck * 0.35;
    n.legR.scale.y = 1 - 0.18 * Math.max(0, -Math.cos(st.ph)) * st.w - st.tuck * 0.35;
    // body bob & forward lean while running; sitting low when sleeping
    n.rig.position.y += st.w * Math.abs(Math.sin(st.ph)) * lerp(0.01, 0.025, st.run) - (a === 'sleep' ? 0.05 : 0) * (1 - st.tuck * 0.3);
    n.rig.rotation.x += st.run * 0.18 * st.w;
    n.head.rotation.x += st.w * (1 - st.run) * 0.12 * Math.sin(st.ph * 2);   // pigeon-like nod while walking
  };
}

// chukar is a 'ground' species: the core puts the origin on the ground, so lift the bird (built body-centred) onto its feet.
function groundOrigin(v) {
  const outer = new THREE.Group(); outer.name = v.object.name;
  v.object.position.y = v.perchOffset; outer.add(v.object);
  return { ...v, object: outer, perchOffset: 0, dispose() { outer.removeFromParent(); v.dispose(); } };
}

// ---------------------------------------------------------------- export
export const ANIMALS_EXTRA = {
  hoopoe: (o) => makeAnimal('hoopoe', o, buildHoopoe, HOOPOE_ANIM),
  tortoise: (o) => makeAnimal('tortoise', o, buildTortoise, TORTOISE_ANIM),
  chukar: (o) => groundOrigin(makeAnimal('chukar', o, buildChukar, CHUKAR_ANIM)),
};
export default ANIMALS_EXTRA;

// Called by the zone pack when its zone closes: frees the cached geometry / materials (rebuilt on the next visit).
export function releaseCaches() { disposeDeep(SPECS); SPECS.clear(); releaseMaterials('grove-animals:'); }
