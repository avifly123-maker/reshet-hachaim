// Grove (Israeli Mediterranean woodland / חורש ארץ-ישראלי) animal models.
// Procedural, softly shaded (smooth normals, per-vertex colour gradients) models with procedural animation.
// export ANIMALS = { id: (opts) => AnimalVisual | ColonyVisual | SwarmVisual }
// Models face +Z. Ground animals: origin at ground under body. Flyers: origin at body centre
// (birds also expose `perchOffset` = distance from origin down to the feet when perched).
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
// Ear: ellipsoid leaf, optionally pinched to a point; built at origin (base), then oriented.
function earGeom({ w, h, d, pinch = 0, out = 0.4, back = 0.2, outer, inner, tip = null, tipFrom = 0.75, side = 1, rng }) {
  const g = new THREE.SphereGeometry(1, 10, 7); g.scale(w, h, d); g.translate(0, h * 0.9, 0);
  if (pinch) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const q = clamp(p.getY(i) / (h * 1.9)); p.setX(i, p.getX(i) * (1 - pinch * q * q)); p.setZ(i, p.getZ(i) * (1 - pinch * 0.5 * q * q)); } }
  const cg = colorize(g, (c, n) => (tip && c.y > h * 1.9 * tipFrom) ? tip : (n.z > 0.2 ? inner : outer), rng, 0.04);
  cg.rotateX(-back); cg.rotateZ(-side * out);
  return cg;
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

// Lizard animator: sprawling diagonal gait with lateral body undulation, head bob displays, basking, tongue.
function lizardAnim(cfg) {
  return (n, spec, rng, inst, ownMat) => {
    const st = { ph: rng() * TAU, t: rng() * 100, wMove: 0, wSleep: 0, wEat: 0, wClimb: 0, tint: new THREE.Color(1, 1, 1), tintT: new THREE.Color(1, 1, 1), tintTimer: 0, eyeL: [0, 0], eyeR: [0, 0], eyeTL: [0, 0], eyeTR: [0, 0] };
    const legs = ['legFL', 'legFR', 'legHL', 'legHR'].map(k => n[k]);
    const sides = [1, -1, 1, -1]; const off = [0, Math.PI, Math.PI, 0];
    const B = n.body.userData.base;
    return (dt, s) => {
      const a = s.action || 'idle'; st.t += dt; const t = st.t;
      const moving = a === 'walk' || a === 'run' || a === 'climb' || a === 'swim';
      let spd = s.speed || 0; if (moving && spd < 0.02) spd = a === 'run' ? cfg.runSpeed : cfg.walkSpeed;
      st.wMove = damp(st.wMove, moving ? 1 : 0, 6, dt);
      st.wSleep = damp(st.wSleep, a === 'sleep' ? 1 : 0, 2, dt);
      st.wEat = damp(st.wEat, a === 'eat' ? 1 : 0, 5, dt);
      st.wClimb = damp(st.wClimb, a === 'climb' ? 1 : 0, 3, dt);
      const wm = st.wMove, ws = st.wSleep, we = st.wEat;
      // chameleon: hesitant stop-go; others continuous
      let gate = 1; if (cfg.hesitant) gate = 0.25 + 0.75 * smoothstep(-0.2, 0.6, Math.sin(t * 0.9));
      if (moving) st.ph += dt * Math.min(spd, cfg.runSpeed * 1.4) / cfg.stride * TAU * gate;
      const und = cfg.undulate * wm;
      n.body.rotation.y = und * Math.sin(st.ph);
      for (let i = 0; i < 4; i++) {
        const L = legs[i]; const ph = st.ph + off[i];
        const sw = Math.sin(ph), lift = Math.max(0, Math.cos(ph));
        if (cfg.legAxis === 'x') { L.rotation.x = -cfg.swing * wm * sw; L.rotation.z = sides[i] * lift * wm * 0.25; }
        else { L.rotation.y = sides[i] * cfg.swing * wm * sw; L.rotation.z = -sides[i] * lift * wm * 0.35; }
        L.rotation.z += -sides[i] * ws * 0.3;
      }
      // head bob display (agama) – push-ups while idle
      const idleW = (1 - wm) * (1 - ws) * (1 - we);
      let bob = 0;
      if (cfg.headBob) {
        const p = pulser(st, 'bob', rng, dt, 2.5, 6, 1.6);
        bob = p > 0 ? Math.max(0, Math.sin((1.6 - (st.bobT || 0)) / 1.6 * Math.PI * 3)) * idleW : 0;
      }
      lookAround(st, rng, dt, cfg.lookYaw ?? 0.4, 0.12, 1.5, 4);
      n.body.position.y = B.y + bob * 0.025 - ws * cfg.sleepDrop + (cfg.bask ? Math.sin(t * 0.7) * 0.002 : 0);
      n.body.position.z = B.z + (cfg.rock ? Math.sin(t * 5.5) * cfg.rock * (0.4 + wm) : 0);
      n.rig.rotation.x = -bob * 0.22 - st.wClimb * 0.15;
      n.head.rotation.y = -und * 0.8 * Math.sin(st.ph) + st.yaw * idleW;
      // eating: lunge (agama) / tongue shot (chameleon)
      let shot = 0;
      if (n.tongue) {
        const p = pulser(st, 'tg', rng, dt, 1.5, 3.5, 0.45) * we;
        shot = p; n.tongue.scale.set(1, 1, Math.max(0.001, p));
        n.tongue.visible = p > 0.01;
      }
      const lunge = !n.tongue ? we * Math.max(0, Math.sin(t * 4)) ** 4 : 0;
      n.head.rotation.x = st.pitch * idleW - bob * 0.35 + ws * 0.15 + lunge * 0.4 - shot * 0.1;
      n.body.position.z += lunge * 0.02;
      if (n.tail) {
        n.tail.rotation.y = -cfg.undulate * 1.4 * wm * Math.sin(st.ph - 0.9) + Math.sin(t * 0.6) * 0.05 * idleW;
        n.tail.rotation.x = cfg.tailCurl ? Math.sin(t * 0.5) * 0.08 + wm * 0.1 * Math.sin(st.ph) : 0;
      }
      // turret eyes, each moving independently
      if (n.eyeL) {
        for (const [k, cur, tgt, key] of [['eyeL', st.eyeL, st.eyeTL, 'eL'], ['eyeR', st.eyeR, st.eyeTR, 'eR']]) {
          st[key] = (st[key] ?? 0) - dt;
          if (st[key] <= 0) { st[key] = 0.4 + rng() * 2; tgt[0] = (rng() * 2 - 1) * 0.9; tgt[1] = (rng() * 2 - 1) * 0.5; }
          if (we > 0.5) { tgt[0] = k === 'eyeL' ? 0.9 : -0.9; tgt[1] = 0.1; }
          cur[0] = damp(cur[0], tgt[0], 12, dt); cur[1] = damp(cur[1], tgt[1], 12, dt);
          n[k].rotation.set(0, cur[0], cur[1]); const sc = 1 - ws * 0.4; n[k].scale.set(sc, sc, sc);
        }
      }
      // colour shift (chameleon) via per-instance material tint
      if (ownMat && cfg.colorShift) {
        st.tintTimer -= dt;
        if (st.tintTimer <= 0) { st.tintTimer = 5 + rng() * 6; st.tintT.copy(rng.pick(cfg.colorShift)); }
        const night = s.night || 0;
        const tgt = _col.copy(st.tintT).lerp(K('#e8f0c8').clone().multiplyScalar(1.5), night * 0.6 + ws * 0.3);
        st.tint.r = damp(st.tint.r, tgt.r, 0.6, dt); st.tint.g = damp(st.tint.g, tgt.g, 0.6, dt); st.tint.b = damp(st.tint.b, tgt.b, 0.6, dt);
        ownMat.color.copy(st.tint);
      }
    };
  };
}

// ---------------------------------------------------------------- QUADRUPEDS
// Leg loft: points in model coordinates (from hip/shoulder down to hoof/paw)
function legLoft(pts, sides = 6) { return loft(pts.map(([x, y, z, r]) => ({ p: [x, y, z], r })), sides, { up: [0, 0, 1], tipEnd: 0.004 }); }

function buildGazelle(rng) {
  const back = '#9a683b', backD = '#865a31', stripe = '#3b2416', belly = '#f3ede3', fawnL = '#b98d62';
  const bodyRings = [
    { p: [0, 0.9, -0.6], r: [0.07, 0.08] }, { p: [0, 0.9, -0.52], r: [0.13, 0.15] }, { p: [0, 0.9, -0.36], r: [0.155, 0.175] },
    { p: [0, 0.885, -0.15], r: [0.15, 0.165] }, { p: [0, 0.885, 0.07], r: [0.148, 0.172] }, { p: [0, 0.9, 0.25], r: [0.15, 0.195] },
    { p: [0, 0.94, 0.38], r: [0.12, 0.17] }, { p: [0, 0.99, 0.45], r: [0.085, 0.12] }];
  const body = colorize(wobble(loft(bodyRings, 10), 0.008, 1), (c, n) => {
    if (n.y < -0.72) return belly;
    if (c.z < -0.5 && n.y < 0.6 && Math.abs(n.x) < 0.75) return '#f0e8db';      // white rump
    if (n.y < 0.12 && n.y > -0.72) return (c.z > -0.42 && c.z < 0.3) ? stripe : belly; // dark flank stripe
    if (c.z > 0.33 && n.y < 0.25 && n.z > 0.1) return '#e8ddcc';
    return n.y > 0.85 ? backD : back;
  }, rng, 0.05);
  const neck = colorize(wobble(loft([
    { p: [0, 0.94, 0.37], r: [0.085, 0.12] }, { p: [0, 1.08, 0.46], r: [0.068, 0.092] }, { p: [0, 1.24, 0.54], r: [0.058, 0.074] },
    { p: [0, 1.38, 0.6], r: [0.055, 0.062] }], 8, { capStart: false }), 0.005, 2),
  (c, n) => (n.z > 0.45 && n.y < 0.2) ? '#efe6d8' : (n.y > 0.5 && n.z < 0 ? backD : back), rng, 0.05);
  // head: skull→muzzle
  const headLoft = colorize(wobble(loft([
    { p: [0, 1.4, 0.56], r: [0.06, 0.066] }, { p: [0, 1.415, 0.615], r: [0.07, 0.074] }, { p: [0, 1.38, 0.71], r: [0.054, 0.058] },
    { p: [0, 1.33, 0.8], r: [0.038, 0.042] }, { p: [0, 1.305, 0.855], r: [0.029, 0.03] }], 8, { tipEnd: 0.018 }), 0.004, 3),
  (c, n) => {
    if (c.z > 0.865) return '#241a14';
    if (n.y < -0.55) return '#efe7da';
    if (n.y > 0.6 && c.z > 0.62) return '#4f3322';           // dark nose bridge
    if (Math.abs(n.x) > 0.35 && c.z > 0.6) return n.y > -0.05 ? '#f2ebe0' : '#5d3d28'; // white face stripe over dark cheek stripe
    return back;
  }, rng, 0.04);
  // ringed, backward-curving horns
  const horns = [];
  for (const sd of [1, -1]) {
    horns.push(colorize(tube([[sd * 0.03, 1.44, 0.6], [sd * 0.045, 1.56, 0.575], [sd * 0.058, 1.67, 0.52], [sd * 0.062, 1.75, 0.45], [sd * 0.058, 1.8, 0.42]], 10,
      u => 0.022 * (1 - u * 0.85), 5, { tipEnd: 0.012 }), (c, n, k, ud) => {
      const seg = Math.floor(k / (2 * ud.sides)); if (seg >= ud.segs || seg > 7) return '#1d1611';
      return seg % 2 ? '#2c2219' : '#5a4835';
    }, rng, 0.03));
  }
  const head = merge([headLoft, ...horns, ...eyes(0.064, 1.418, 0.655, 0.02, '#0e0906', rng)]);
  const ears = {};
  for (const [k, sd] of [['earL', 1], ['earR', -1]]) {
    ears[k] = earGeom({ w: 0.04, h: 0.075, d: 0.012, pinch: 0.55, out: 0.85, back: 0.35, outer: back, inner: '#eadccb', tip: '#3a281c', tipFrom: 0.85, side: sd, rng })
      .translate(sd * 0.05, 1.45, 0.58);
  }
  const legCol = (c) => c.y < 0.035 ? '#17110d' : (c.y < 0.5 ? fawnL : back);
  const legs = {};
  for (const [k, sd, fr] of [['legFL', 1, 1], ['legFR', -1, 1], ['legHL', 1, 0], ['legHR', -1, 0]]) {
    const x = sd * 0.085;
    const pts = fr ? [[x, 0.94, 0.28, [0.06, 0.08]], [x, 0.72, 0.29, [0.045, 0.06]], [x, 0.46, 0.3, [0.026, 0.03]], [x, 0.4, 0.3, [0.03, 0.032]], [x, 0.06, 0.31, [0.018, 0.02]], [x, 0.025, 0.325, [0.022, 0.026]]]
      : [[x, 0.96, -0.38, [0.075, 0.11]], [x, 0.72, -0.44, [0.055, 0.085]], [x, 0.47, -0.5, [0.026, 0.04]], [x, 0.4, -0.47, [0.022, 0.028]], [x, 0.06, -0.42, [0.018, 0.02]], [x, 0.025, -0.405, [0.022, 0.026]]];
    legs[k] = { geom: colorize(wobble(legLoft(pts, 6), 0.003, 4 + sd), legCol, rng, 0.05), pivot: [x, fr ? 0.88 : 0.9, fr ? 0.28 : -0.38] };
  }
  const tail = colorize(loft([{ p: [0, 0.94, -0.6], r: 0.028 }, { p: [0, 0.87, -0.68], r: 0.026 }, { p: [0, 0.8, -0.71], r: 0.02 }], 5, { tipEnd: 0.03 }),
    (c) => c.y < 0.85 ? '#1b1410' : '#6a4a30', rng, 0.04);
  return {
    height: 1.8, length: 1.5,
    parts: [
      { name: 'body', geom: body, pivot: [0, 0.9, 0] },
      { name: 'neck', geom: neck, pivot: [0, 0.97, 0.4], parent: 'body' },
      { name: 'head', geom: head, pivot: [0, 1.38, 0.6], parent: 'neck' },
      { name: 'earL', geom: ears.earL, pivot: [0.05, 1.45, 0.58], parent: 'head' },
      { name: 'earR', geom: ears.earR, pivot: [-0.05, 1.45, 0.58], parent: 'head' },
      ...['legFL', 'legFR', 'legHL', 'legHR'].map(k => ({ name: k, geom: legs[k].geom, pivot: legs[k].pivot, parent: 'body' })),
      { name: 'tail', geom: tail, pivot: [0, 0.94, -0.6], parent: 'body' },
    ],
  };
}

function buildFox(rng) {
  const red = '#b0673a', redD = '#9a5530', grey = '#9c7a64', pale = '#e6ddd0', white = '#f2ede5', black = '#211915';
  const body = colorize(wobble(loft([
    { p: [0, 0.41, -0.35], r: [0.06, 0.07] }, { p: [0, 0.42, -0.29], r: [0.11, 0.12] }, { p: [0, 0.42, -0.12], r: [0.12, 0.128] },
    { p: [0, 0.41, 0.06], r: [0.112, 0.122] }, { p: [0, 0.43, 0.22], r: [0.118, 0.138] }, { p: [0, 0.47, 0.31], r: [0.09, 0.11] }], 10), 0.006, 1),
  (c, n) => {
    if (c.z > 0.2 && n.z > 0.15 && n.y < 0.35) return white;
    if (n.y < -0.5) return pale;
    if (n.y < -0.1) return grey;
    return n.y > 0.85 ? redD : red;
  }, rng, 0.06);
  const headL = colorize(wobble(loft([
    { p: [0, 0.46, 0.27], r: [0.085, 0.1] }, { p: [0, 0.53, 0.37], r: [0.088, 0.088] }, { p: [0, 0.565, 0.43], r: [0.1, 0.085] },
    { p: [0, 0.555, 0.49], r: [0.088, 0.075] }, { p: [0, 0.525, 0.565], r: [0.046, 0.042] }, { p: [0, 0.505, 0.635], r: [0.024, 0.024] }], 9, { tipEnd: 0.022, capStart: false }), 0.005, 2),
  (c, n) => {
    if (c.z > 0.645) return '#151010';
    if (c.z > 0.36 && n.y < -0.15) return white;                       // white jaw / cheeks
    if (c.z > 0.5 && Math.abs(n.x) > 0.5 && n.y < 0.15) return white;
    if (c.z < 0.36 && n.z > 0.2 && n.y < 0.2) return white;
    return n.y > 0.7 ? redD : red;
  }, rng, 0.05);
  const head = merge([headL, ...eyes(0.056, 0.578, 0.505, 0.016, '#3a2208', rng)]);
  const ears = {};
  for (const [k, sd] of [['earL', 1], ['earR', -1]]) ears[k] = earGeom({ w: 0.045, h: 0.07, d: 0.016, pinch: 0.85, out: 0.32, back: 0.15, outer: black, inner: '#efe2d2', side: sd, rng }).translate(sd * 0.058, 0.615, 0.425);
  const legs = {};
  for (const [k, sd, fr] of [['legFL', 1, 1], ['legFR', -1, 1], ['legHL', 1, 0], ['legHR', -1, 0]]) {
    const x = sd * 0.07;
    const pts = fr ? [[x, 0.44, 0.22, [0.05, 0.06]], [x, 0.3, 0.225, [0.036, 0.04]], [x, 0.16, 0.23, [0.026, 0.03]], [x, 0.03, 0.235, [0.024, 0.026]], [x, 0.012, 0.26, [0.026, 0.03]]]
      : [[x, 0.45, -0.23, [0.065, 0.085]], [x, 0.3, -0.27, [0.045, 0.06]], [x, 0.17, -0.3, [0.025, 0.03]], [x, 0.03, -0.27, [0.024, 0.026]], [x, 0.012, -0.245, [0.026, 0.03]]];
    legs[k] = { geom: colorize(wobble(legLoft(pts, 6), 0.003, 5), (c) => c.y < 0.25 ? black : (c.y < 0.33 ? '#5a3524' : redD), rng, 0.05), pivot: [x, fr ? 0.4 : 0.42, fr ? 0.22 : -0.23] };
  }
  const tail = colorize(wobble(loft([
    { p: [0, 0.43, -0.33], r: 0.035 }, { p: [0, 0.4, -0.43], r: [0.07, 0.075] }, { p: [0, 0.35, -0.57], r: [0.092, 0.095] },
    { p: [0, 0.3, -0.71], r: [0.085, 0.088] }, { p: [0, 0.27, -0.8], r: [0.055, 0.058] }], 8, { tipEnd: 0.05 }), 0.008, 6),
  (c, n) => c.z < -0.765 ? white : (n.y > 0.6 ? '#7a4f36' : (n.y < -0.4 ? '#b89a80' : '#a2694a')), rng, 0.06);
  return {
    height: 0.68, length: 1.15,
    parts: [
      { name: 'body', geom: body, pivot: [0, 0.42, 0] },
      { name: 'head', geom: head, pivot: [0, 0.47, 0.3], parent: 'body' },
      { name: 'earL', geom: ears.earL, pivot: [0.058, 0.615, 0.425], parent: 'head' },
      { name: 'earR', geom: ears.earR, pivot: [-0.058, 0.615, 0.425], parent: 'head' },
      ...['legFL', 'legFR', 'legHL', 'legHR'].map(k => ({ name: k, geom: legs[k].geom, pivot: legs[k].pivot, parent: 'body' })),
      { name: 'tail', geom: tail, pivot: [0, 0.43, -0.33], parent: 'body' },
    ],
  };
}

function buildPorcupine(rng) {
  const dark = '#2a2421', darker = '#1d1916';
  const prof = [[-0.36, 0.22, 0.1, 0.08], [-0.28, 0.25, 0.2, 0.18], [-0.1, 0.26, 0.22, 0.2], [0.1, 0.25, 0.2, 0.18], [0.22, 0.24, 0.15, 0.14], [0.3, 0.24, 0.1, 0.1]];
  const body = colorize(wobble(loft(prof.map(([z, y, rx, ry]) => ({ p: [0, y, z], r: [rx, ry] })), 9), 0.01, 1), (c, n) => n.y < -0.4 ? '#3a302a' : dark, rng, 0.08);
  const headL = colorize(wobble(loft([
    { p: [0, 0.245, 0.26], r: [0.09, 0.095] }, { p: [0, 0.24, 0.36], r: [0.085, 0.08] }, { p: [0, 0.22, 0.44], r: [0.058, 0.055] },
    { p: [0, 0.205, 0.49], r: [0.034, 0.034] }], 8, { tipEnd: 0.015, capStart: false }), 0.006, 2),
  (c) => c.z > 0.485 ? '#4a3632' : darker, rng, 0.06);
  const earsG = [1, -1].map(sd => paintG(ell(0.022, 0.018, 0.01, sd * 0.06, 0.3, 0.36), '#3a2e29', rng));
  const head = merge([headL, ...earsG, ...eyes(0.05, 0.265, 0.42, 0.012, '#050403', rng)]);
  // quills: lowered + raised (morph target)
  const low = [], high = [];
  const profAt = (z) => { for (let i = 0; i < prof.length - 1; i++) { const A = prof[i], B = prof[i + 1]; if (z >= A[0] && z <= B[0]) { const f = (z - A[0]) / (B[0] - A[0]); return [lerp(A[1], B[1], f), lerp(A[2], B[2], f), lerp(A[3], B[3], f)]; } } return [0.24, 0.1, 0.1]; };
  const segCols = ['#1a1614', '#f2ede4', '#191513', '#f4efe6'];
  const quill = (base, dir, len, r) => loft([0, 0.35, 0.6, 0.86].map((f, i) => ({ p: add3(base, dir, len * f), r: r * (1 - f * 0.75) })), 3, { capStart: false, tipEnd: len * 0.14 });
  const qcol = (c, n, k) => segCols[Math.min(3, Math.floor(k / 6))];
  const NQ = 50;
  for (let i = 0; i < NQ; i++) {
    const z = lerp(-0.34, 0.24, (i + rng()) / NQ) ;
    const ang = (rng() * 2 - 1) * (z > 0.15 ? 0.5 : 1.25);
    const [yc, rx, ry] = profAt(z);
    const base = [Math.sin(ang) * rx * 0.92, yc + Math.cos(ang) * ry * 0.9, z];
    const nrm = new V3(Math.sin(ang), Math.cos(ang), 0);
    const rear = smoothstep(0.25, -0.2, z);
    const len = (0.13 + 0.26 * rear) * (1 - 0.3 * Math.abs(ang)) * (0.85 + rng() * 0.3);
    const dl = nrm.clone().multiplyScalar(0.38).add(new V3(0, 0.12, -1)).normalize();
    const dh = nrm.clone().multiplyScalar(1.0).add(new V3(0, 0.35, -0.35 + (z > 0.1 ? 0.25 : 0))).normalize();
    const r = 0.011 + 0.004 * rear;
    low.push(colorize(quill(base, dl.toArray(), len, r), qcol, rng, 0.04));
    high.push(colorize(quill(base, dh.toArray(), len * 1.12, r), qcol, null, 0));
  }
  // short white rattle quills at the tail
  for (let i = 0; i < 6; i++) {
    const a = (i / 6 - 0.5) * 1.6; const base = [Math.sin(a) * 0.05, 0.24 + Math.cos(a) * 0.04, -0.35];
    const dl = new V3(Math.sin(a) * 0.4, 0.2, -1).normalize(), dh = new V3(Math.sin(a) * 0.6, 0.9, -0.5).normalize();
    const qc = () => '#efe9df';
    low.push(colorize(quill(base, dl.toArray(), 0.1, 0.02), qc, rng, 0.03)); high.push(colorize(quill(base, dh.toArray(), 0.11, 0.02), qc, null, 0));
  }
  const quills = merge(low); const quillsHi = merge(high);
  quills.morphAttributes.position = [new THREE.Float32BufferAttribute(quillsHi.attributes.position.array, 3)];
  const legs = {};
  for (const [k, sd, fr] of [['legFL', 1, 1], ['legFR', -1, 1], ['legHL', 1, 0], ['legHR', -1, 0]]) {
    const x = sd * 0.1, z = fr ? 0.18 : -0.2;
    legs[k] = { geom: colorize(legLoft([[x, 0.2, z, [0.045, 0.05]], [x, 0.08, z + 0.005, [0.035, 0.035]], [x, 0.015, z + 0.02, [0.03, 0.04]]], 5), () => '#241e1b', rng, 0.06), pivot: [x, 0.17, z] };
  }
  return {
    height: 0.6, length: 0.9,
    parts: [
      { name: 'body', geom: body, pivot: [0, 0.25, 0] },
      { name: 'head', geom: head, pivot: [0, 0.245, 0.27], parent: 'body' },
      { name: 'quills', geom: quills, pivot: [0, 0.3, -0.05], parent: 'body' },
      ...['legFL', 'legFR', 'legHL', 'legHR'].map(k => ({ name: k, geom: legs[k].geom, pivot: legs[k].pivot, parent: 'body' })),
    ],
  };
}

function buildHedgehog(rng) {
  const prof = [[-0.2, 0.1, 0.06, 0.05], [-0.16, 0.13, 0.13, 0.11], [-0.05, 0.15, 0.155, 0.13], [0.07, 0.14, 0.14, 0.12], [0.14, 0.12, 0.1, 0.09], [0.18, 0.11, 0.05, 0.05]];
  const bodyL = colorize(wobble(loft(prof.map(([z, y, rx, ry]) => ({ p: [0, y, z], r: [rx, ry] })), 10), 0.006, 1), (c, n) => n.y < -0.05 ? '#b49a7a' : '#5e4834', rng, 0.06);
  const profAt = (z) => { for (let i = 0; i < prof.length - 1; i++) { const A = prof[i], B = prof[i + 1]; if (z >= A[0] && z <= B[0]) { const f = (z - A[0]) / (B[0] - A[0]); return [lerp(A[1], B[1], f), lerp(A[2], B[2], f), lerp(A[3], B[3], f)]; } } return [0.12, 0.05, 0.05]; };
  const spines = [];
  const NS = 84;
  for (let i = 0; i < NS; i++) {
    const z = lerp(-0.19, 0.14, (i + rng()) / NS);
    const ang = (rng() * 2 - 1) * 1.45;
    const [yc, rx, ry] = profAt(z);
    const base = [Math.sin(ang) * rx * 0.9, yc + Math.cos(ang) * ry * 0.9, z];
    const d = new V3(Math.sin(ang), Math.cos(ang), 0).multiplyScalar(0.8).add(new V3(0, 0.1, -0.55)).normalize();
    const len = 0.05 + rng() * 0.025;
    const tipC = rng() < 0.75 ? '#efe4cf' : '#3d2c20';
    spines.push(colorize(loft([{ p: base, r: 0.011 }, { p: add3(base, d.toArray(), len * 0.55), r: 0.008 }], 3, { capStart: false, tipEnd: len * 0.45 }),
      (c, n, k) => k < 6 ? '#4a3626' : tipC, rng, 0.06));
  }
  const body = merge([bodyL, ...spines]);
  const headL = colorize(wobble(loft([
    { p: [0, 0.12, 0.12], r: [0.075, 0.075] }, { p: [0, 0.105, 0.2], r: [0.056, 0.052] }, { p: [0, 0.088, 0.26], r: [0.027, 0.024] }], 8, { tipEnd: 0.02, capStart: false }), 0.004, 2),
  (c, n) => c.z > 0.272 ? '#120c0a' : (n.y > 0.55 ? '#9c7d5c' : '#d4bf9f'), rng, 0.05);
  const earsG = [1, -1].map(sd => paintG(ell(0.018, 0.02, 0.008, sd * 0.05, 0.165, 0.15), '#c8ab88', rng));
  const head = merge([headL, ...earsG, ...eyes(0.032, 0.13, 0.205, 0.011, '#050403', rng)]);
  const legs = {};
  for (const [k, sd, fr] of [['legFL', 1, 1], ['legFR', -1, 1], ['legHL', 1, 0], ['legHR', -1, 0]]) {
    const x = sd * 0.065, z = fr ? 0.1 : -0.1;
    legs[k] = { geom: colorize(legLoft([[x, 0.08, z, 0.025], [x, 0.01, z + 0.012, 0.02]], 5), () => '#6a5240', rng, 0.05), pivot: [x, 0.075, z] };
  }
  return {
    height: 0.3, length: 0.45,
    parts: [
      { name: 'body', geom: body, pivot: [0, 0.12, 0] },
      { name: 'head', geom: head, pivot: [0, 0.12, 0.14], parent: 'body' },
      ...['legFL', 'legFR', 'legHL', 'legHR'].map(k => ({ name: k, geom: legs[k].geom, pivot: legs[k].pivot, parent: 'body' })),
    ],
  };
}

function buildHyrax(rng) {
  const brown = '#7d644a', grizzle = '#8d765c', bellyC = '#b9a283';
  const body = colorize(wobble(loft([
    { p: [0, 0.19, -0.29], r: [0.08, 0.07] }, { p: [0, 0.21, -0.25], r: [0.16, 0.14] }, { p: [0, 0.225, -0.09], r: [0.18, 0.162] },
    { p: [0, 0.225, 0.07], r: [0.165, 0.152] }, { p: [0, 0.23, 0.17], r: [0.13, 0.13] }, { p: [0, 0.25, 0.23], r: [0.09, 0.1] }], 10), 0.008, 1),
  (c, n) => {
    if (n.y < -0.45) return bellyC;
    if (n.y > 0.9 && Math.abs(c.z + 0.06) < 0.05) return '#2a1e14'; // dorsal gland spot
    return (h3(c.x * 900, c.y * 900, c.z * 900, 3) & 3) === 0 ? grizzle : brown;
  }, rng, 0.07);
  const headL = colorize(wobble(loft([
    { p: [0, 0.255, 0.19], r: [0.095, 0.095] }, { p: [0, 0.27, 0.27], r: [0.098, 0.09] }, { p: [0, 0.255, 0.335], r: [0.07, 0.066] },
    { p: [0, 0.238, 0.38], r: [0.042, 0.04] }], 9, { tipEnd: 0.018, capStart: false }), 0.006, 2),
  (c, n) => c.z > 0.385 ? '#14100c' : (c.z > 0.34 ? '#4c3a2b' : (n.y < -0.4 ? bellyC : (n.y > 0.4 && Math.abs(n.x) > 0.3 && c.z > 0.27 && c.z < 0.32 ? '#c9b08a' : brown))), rng, 0.05);
  const head = merge([headL, ...eyes(0.062, 0.29, 0.31, 0.015, '#0a0705', rng)]);
  const ears = {};
  for (const [k, sd] of [['earL', 1], ['earR', -1]]) ears[k] = earGeom({ w: 0.03, h: 0.022, d: 0.012, out: 0.6, back: 0.4, outer: '#6a543e', inner: '#4a3a2c', side: sd, rng }).translate(sd * 0.07, 0.33, 0.24);
  const legs = {};
  for (const [k, sd, fr] of [['legFL', 1, 1], ['legFR', -1, 1], ['legHL', 1, 0], ['legHR', -1, 0]]) {
    const x = sd * 0.09, z = fr ? 0.13 : -0.15;
    legs[k] = { geom: colorize(legLoft([[x, 0.15, z, [0.045, 0.05]], [x, 0.06, z + 0.01, [0.034, 0.036]], [x, 0.012, z + 0.03, [0.034, 0.042]]], 6), (c) => c.y < 0.03 ? '#2a2018' : brown, rng, 0.06), pivot: [x, 0.13, z] };
  }
  return {
    height: 0.38, length: 0.62,
    parts: [
      { name: 'body', geom: body, pivot: [0, 0.22, 0] },
      { name: 'head', geom: head, pivot: [0, 0.25, 0.21], parent: 'body' },
      { name: 'earL', geom: ears.earL, pivot: [0.07, 0.33, 0.24], parent: 'head' },
      { name: 'earR', geom: ears.earR, pivot: [-0.07, 0.33, 0.24], parent: 'head' },
      ...['legFL', 'legFR', 'legHL', 'legHR'].map(k => ({ name: k, geom: legs[k].geom, pivot: legs[k].pivot, parent: 'body' })),
    ],
  };
}

function buildSpinyMouse(rng) {
  const fur = '#8f7460', spiny = '#7a6250', white = '#ece6dc';
  const bodyL = colorize(wobble(loft([
    { p: [0, 0.052, -0.085], r: [0.028, 0.026] }, { p: [0, 0.06, -0.065], r: [0.045, 0.043] }, { p: [0, 0.066, -0.01], r: [0.05, 0.05] },
    { p: [0, 0.062, 0.045], r: [0.042, 0.043] }, { p: [0, 0.066, 0.08], r: [0.03, 0.032] }], 9), 0.003, 1),
  (c, n) => n.y < -0.35 ? white : (n.y > 0.6 && c.z < 0.02 ? spiny : fur), rng, 0.06);
  const spikes = [];
  for (let i = 0; i < 16; i++) {
    const z = lerp(-0.07, 0.02, rng()), a = (rng() * 2 - 1) * 0.9;
    const base = [Math.sin(a) * 0.044, 0.064 + Math.cos(a) * 0.044, z];
    const d = new V3(Math.sin(a) * 0.5, 0.6, -1).normalize();
    spikes.push(colorize(loft([{ p: base, r: 0.0065 }, { p: add3(base, d.toArray(), 0.008), r: 0.004 }], 3, { capStart: false, tipEnd: 0.012 }), () => '#6e5848', rng, 0.05));
  }
  const body = merge([bodyL, ...spikes]);
  const headL = colorize(wobble(loft([
    { p: [0, 0.075, 0.065], r: [0.034, 0.033] }, { p: [0, 0.074, 0.1], r: [0.03, 0.027] }, { p: [0, 0.064, 0.13], r: [0.016, 0.014] }], 8, { tipEnd: 0.012, capStart: false }), 0.002, 2),
  (c, n) => c.z > 0.138 ? '#d89a98' : (n.y < -0.3 ? white : fur), rng, 0.05);
  const head = merge([headL, ...eyes(0.022, 0.087, 0.104, 0.009, '#050302', rng)]);
  const ears = {};
  for (const [k, sd] of [['earL', 1], ['earR', -1]]) ears[k] = earGeom({ w: 0.022, h: 0.024, d: 0.006, out: 0.55, back: 0.25, outer: '#a08a7a', inner: '#d2b0a8', side: sd, rng }).translate(sd * 0.022, 0.097, 0.08);
  const legs = {};
  for (const [k, sd, fr] of [['legFL', 1, 1], ['legFR', -1, 1], ['legHL', 1, 0], ['legHR', -1, 0]]) {
    const x = sd * (fr ? 0.026 : 0.032), z = fr ? 0.045 : -0.05;
    legs[k] = { geom: colorize(legLoft(fr ? [[x, 0.045, z, 0.012], [x, 0.004, z + 0.008, 0.008]] : [[x, 0.05, z, [0.018, 0.022]], [x, 0.02, z - 0.008, 0.01], [x, 0.004, z + 0.012, 0.008]], 5), (c) => c.y < 0.02 ? '#d8b4aa' : fur, rng, 0.05), pivot: [x, fr ? 0.045 : 0.05, z] };
  }
  const tail = colorize(tube([[0, 0.052, -0.08], [0, 0.04, -0.13], [0.006, 0.022, -0.19], [0.016, 0.012, -0.24], [0.026, 0.008, -0.28]], 7, u => 0.008 * (1 - u * 0.6), 4, { tipEnd: 0.008 }), () => '#9c8474', rng, 0.05);
  return {
    height: 0.13, length: 0.3,
    parts: [
      { name: 'body', geom: body, pivot: [0, 0.06, 0] },
      { name: 'head', geom: head, pivot: [0, 0.07, 0.065], parent: 'body' },
      { name: 'earL', geom: ears.earL, pivot: [0.022, 0.097, 0.08], parent: 'head' },
      { name: 'earR', geom: ears.earR, pivot: [-0.022, 0.097, 0.08], parent: 'head' },
      ...['legFL', 'legFR', 'legHL', 'legHR'].map(k => ({ name: k, geom: legs[k].geom, pivot: legs[k].pivot, parent: 'body' })),
      { name: 'tail', geom: tail, pivot: [0, 0.052, -0.08], parent: 'body' },
    ],
  };
}

// ---------------------------------------------------------------- BIRDS
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
function buildBird(rng, P) {
  const tilt = P.tilt;
  const d = [0, -Math.cos(tilt), -Math.sin(tilt)], fwd = [0, -Math.sin(tilt), Math.cos(tilt)];
  const bodyParts = [colorize(wobble(loft(P.bodyRings, 10), P.wob || 0.003, 1), P.bodyCol, rng, 0.05)];
  for (const sd of [1, -1]) {
    const hip = [sd * P.hipX, P.hipY, P.hipZ]; const foot = add3(hip, d, P.legLen);
    if (P.thigh) bodyParts.push(paintG(ell(P.thigh[0], P.thigh[1], P.thigh[0], ...add3(hip, d, P.legLen * 0.3), 6, 4), P.thighCol, rng));
    bodyParts.push(colorize(loft([{ p: hip, r: P.legR * 1.4 }, { p: add3(hip, d, P.legLen * 0.5), r: P.legR }, { p: foot, r: P.legR * 0.9 }], 5, { up: [1, 0, 0] }), () => P.legCol, rng, 0.03));
    const toe = (dir, len) => colorize(stick(foot, add3(foot, dir, len), P.legR * 0.8, P.legR * 0.4), () => P.clawCol || P.legCol, rng, 0.03);
    const T = P.toe;
    bodyParts.push(toe([fwd[0] + 0.0, fwd[1], fwd[2]], T), toe([sd * 0.55, fwd[1] * 0.8, fwd[2] * 0.8], T * 0.85), toe([-sd * 0.4, fwd[1] * 0.8, fwd[2] * 0.85], T * 0.85), toe([0, -fwd[1], -fwd[2]], T * 0.6));
  }
  const body = merge(bodyParts);
  const hipWorldY = P.hipY * Math.cos(tilt) + P.hipZ * Math.sin(tilt);
  const perchOffset = -hipWorldY + P.legLen + P.legR;
  const wl = birdWing(P.wing, rng, 1), wr = birdWing(P.wing, rng, -1);
  const tail = plate((u, v) => [(v - 0.5) * lerp(P.tail.w0, P.tail.w1, u), 0, -u * P.tail.len], 3, 4, 0.006, P.tail.col, rng, 0.04)
    .translate(...P.tail.pivot);
  return {
    height: P.height, length: P.length, tilt, perchOffset,
    parts: [
      { name: 'body', geom: body, pivot: [0, 0, 0] },
      { name: 'head', geom: P.head(rng), pivot: P.headPivot, parent: 'body' },
      { name: 'wingL', geom: wl, pivot: [P.wing.pivot[0], P.wing.pivot[1], P.wing.pivot[2]], parent: 'body' },
      { name: 'wingR', geom: wr, pivot: [-P.wing.pivot[0], P.wing.pivot[1], P.wing.pivot[2]], parent: 'body' },
      { name: 'tail', geom: tail, pivot: P.tail.pivot, parent: 'body' },
    ],
  };
}

function buildJay(rng) {
  const pink = '#b88f7c', pinkL = '#caa292', white = '#f2eee8';
  return buildBird(rng, {
    tilt: 0.42, height: 0.32, length: 0.5,
    bodyRings: [{ p: [0, 0.0, -0.13], r: [0.04, 0.04] }, { p: [0, 0, -0.09], r: [0.072, 0.075] }, { p: [0, 0, -0.01], r: [0.083, 0.088] },
      { p: [0, 0.008, 0.06], r: [0.074, 0.08] }, { p: [0, 0.025, 0.105], r: [0.048, 0.052] }],
    bodyCol: (c, n) => (c.z < -0.075 && n.y > 0.2) ? white : (c.z < -0.08 && n.y < -0.2 ? white : (n.y < -0.3 ? pinkL : pink)),
    hipX: 0.026, hipY: -0.06, hipZ: -0.01, legLen: 0.075, legR: 0.0065, toe: 0.03, legCol: '#8c6e5e',
    headPivot: [0, 0.035, 0.1],
    head: (rng) => {
      const h = colorize(wobble(loft([{ p: [0, 0.035, 0.07], r: [0.046, 0.05] }, { p: [0, 0.05, 0.115], r: [0.05, 0.05] }, { p: [0, 0.045, 0.15], r: [0.035, 0.035] }], 8, { tipEnd: 0.01 }), 0.003, 2),
        (c, n) => {
          if (n.y > 0.55 && c.z < 0.15) return '#151312';                          // black crown (Middle-East jay)
          if (Math.abs(n.x) > 0.45 && c.y < 0.04 && c.z > 0.115) return '#0f0e0e';   // black moustache
          if (c.z > 0.115 && n.y > -0.2) return white;                                // pale face/forehead
          if (n.y < -0.4) return '#ece4dc';                                           // pale throat
          return pinkL;
        }, rng, 0.04);
      const crest = [];
      for (let i = 0; i < 4; i++) { const x = (i - 1.5) * 0.012; crest.push(paintG(stick([x, 0.085, 0.11], [x * 1.4, 0.112, 0.07 - i % 2 * 0.01], 0.014, 0.004, 4), '#1a1817', rng)); }
      const beak = colorize(loft([{ p: [0, 0.04, 0.148], r: [0.016, 0.017] }, { p: [0, 0.036, 0.18], r: [0.008, 0.008] }], 5, { tipEnd: 0.012 }), () => '#2b2a2a', rng, 0.03);
      return merge([h, ...crest, beak, ...eyes(0.034, 0.06, 0.125, 0.0105, '#7fb2d6', rng), ...eyes(0.0425, 0.061, 0.129, 0.0045, '#050505', rng, false)]);
    },
    wing: {
      pivot: [0.06, -0.012, 0.06], span: 0.24, chord: 0.12, tipStart: 0.6, sweep: 0.3, scallop: 0.25, feathers: 5, camber: 0.1,
      col: (u, v, top) => {
        if (!top) return u < 0.55 ? '#c4a49a' : '#3a3636';
        if (u > 0.55) return v < 0.2 ? '#2a2828' : '#141313';                     // black primaries
        if (u > 0.18 && v < 0.5) {                                                 // barred blue patch
          const b = Math.floor(u * 22 + v * 3) % 3; return b === 0 ? '#2563c9' : (b === 1 ? '#0e1630' : '#6fa6ea');
        }
        if (u > 0.18 && v >= 0.5) return v < 0.85 ? white : '#1b1a1a';         // white speculum
        return v > 0.6 ? '#151414' : pink;
      },
    },
    tail: { pivot: [0, 0.01, -0.12], len: 0.17, w0: 0.045, w1: 0.075, col: (u, v, top) => top ? (u < 0.15 ? white : '#121111') : '#2a2828' },
  });
}

function buildBlackbird(rng) {
  const blk = '#161412', blkL = '#24201d';
  return buildBird(rng, {
    tilt: 0.45, height: 0.26, length: 0.42,
    bodyRings: [{ p: [0, 0, -0.11], r: [0.034, 0.034] }, { p: [0, 0, -0.075], r: [0.06, 0.062] }, { p: [0, 0, -0.01], r: [0.068, 0.072] },
      { p: [0, 0.008, 0.05], r: [0.06, 0.065] }, { p: [0, 0.022, 0.09], r: [0.04, 0.043] }],
    bodyCol: (c, n) => n.y > 0.5 ? blkL : blk,
    hipX: 0.022, hipY: -0.05, hipZ: -0.01, legLen: 0.07, legR: 0.0055, toe: 0.026, legCol: '#2e2219',
    headPivot: [0, 0.03, 0.085],
    head: (rng) => {
      const h = colorize(wobble(loft([{ p: [0, 0.03, 0.06], r: [0.038, 0.042] }, { p: [0, 0.042, 0.097], r: [0.04, 0.041] }, { p: [0, 0.038, 0.126], r: [0.026, 0.026] }], 8, { tipEnd: 0.008 }), 0.0025, 2),
        (c, n) => n.y > 0.5 ? blkL : blk, rng, 0.05);
      const beak = colorize(loft([{ p: [0, 0.035, 0.125], r: [0.012, 0.013] }, { p: [0, 0.031, 0.155], r: [0.006, 0.006] }], 5, { tipEnd: 0.01 }), () => '#f4a118', rng, 0.03);
      return merge([h, beak, ...eyes(0.029, 0.05, 0.106, 0.0105, '#f2b02c', rng, false), ...eyes(0.0355, 0.0505, 0.108, 0.0065, '#050403', rng)]);
    },
    wing: { pivot: [0.05, -0.01, 0.05], span: 0.2, chord: 0.1, tipStart: 0.6, sweep: 0.3, scallop: 0.2, feathers: 5, col: (u, v, top) => top ? (v > 0.6 ? '#0f0e0d' : blkL) : '#2a2623' },
    tail: { pivot: [0, 0.01, -0.105], len: 0.15, w0: 0.04, w1: 0.06, col: (u, v, top) => top ? '#100f0e' : '#1d1a18' },
  });
}

function buildOwl(rng) {
  const buff = '#cd9a55', grey = '#b3a594', white = '#f5f1e8', rim = '#b9844b';
  const mottle = (c) => { const h = h3(c.x * 700, c.y * 700, c.z * 700, 7); return (h & 7) === 0 ? '#5a4632' : ((h & 3) === 1 ? grey : buff); };
  return buildBird(rng, {
    tilt: 1.15, height: 0.62, length: 0.42,
    bodyRings: [{ p: [0, 0, -0.2], r: [0.06, 0.055] }, { p: [0, 0, -0.14], r: [0.12, 0.112] }, { p: [0, 0, -0.02], r: [0.145, 0.14] },
      { p: [0, 0, 0.08], r: [0.13, 0.125] }, { p: [0, 0.01, 0.15], r: [0.085, 0.085] }],
    bodyCol: (c, n) => n.y < -0.15 ? ((h3(c.x * 900, c.y * 900, c.z * 900, 5) & 15) === 0 ? '#9c8060' : white) : mottle(c),
    wob: 0.006,
    hipX: 0.05, hipY: -0.08, hipZ: -0.06, legLen: 0.17, legR: 0.012, toe: 0.04, legCol: '#e9e1d2', clawCol: '#2a2420',
    thigh: [0.035, 0.07], thighCol: white,
    headPivot: [0, 0.03, 0.16],
    head: (rng) => {
      // authored relative to the neck pivot in a level frame, then moved onto the pivot
      const skull = colorize(wobble(ell(0.118, 0.108, 0.1, 0, 0.1, -0.015, 10, 7), 0.004, 3), (c, n) => n.z > 0.25 ? rim : mottle(c), rng, 0.05);
      const disc = [];
      for (const sd of [1, -1]) {
        const g = ell(0.064, 0.1, 0.03, 0, 0, 0, 12, 8); g.rotateZ(sd * 0.36); g.translate(sd * 0.04, 0.083, 0.072);
        disc.push(colorize(g, (c, n) => (n.z < 0.45) ? '#a8733e' : white, rng, 0.02, 0)); // heart-shaped facial disc with a tawny rim
      }
      const beak = colorize(loft([{ p: [0, 0.085, 0.095], r: [0.011, 0.015] }, { p: [0, 0.06, 0.108], r: [0.005, 0.006] }], 4, { tipEnd: 0.008 }), () => '#e8d6c0', rng, 0.02);
      return merge([skull, ...disc, beak, ...eyes(0.034, 0.1, 0.096, 0.016, '#0a0605', rng)]).translate(0, 0.03, 0.16);
    },
    wing: {
      pivot: [0.11, -0.01, 0.07], span: 0.5, chord: 0.21, tipStart: 0.55, sweep: 0.25, scallop: 0.2, feathers: 6, camber: 0.08,
      col: (u, v, top) => {
        if (!top) return u > 0.75 && v > 0.6 ? '#d9cbb4' : white;
        if (u > 0.55) return (Math.floor(u * 14) % 2) ? '#a87a44' : '#d3a663';   // barred flight feathers
        return (Math.floor(u * 30 + v * 7) % 5 === 0) ? grey : (v > 0.7 ? '#c08a4a' : buff);
      },
    },
    tail: { pivot: [0, 0.0, -0.19], len: 0.12, w0: 0.08, w1: 0.11, col: (u, v, top) => top ? (Math.floor(u * 6) % 2 ? '#a67a46' : buff) : white },
  });
}

// ---------------------------------------------------------------- LIZARDS
function buildChameleon(rng) {
  const g1 = '#5d9a3a', g2 = '#3f7c2c', spot = '#cfe08a', bellyC = '#e2e9b8';
  const body = colorize(wobble(loft([
    { p: [0, 0.13, -0.11], r: [0.022, 0.035] }, { p: [0, 0.15, -0.07], r: [0.038, 0.062] }, { p: [0, 0.162, -0.005], r: [0.044, 0.075] },
    { p: [0, 0.157, 0.05], r: [0.04, 0.065] }, { p: [0, 0.152, 0.09], r: [0.03, 0.045] }], 10, { capStart: false }), 0.003, 1),
  (c, n) => {
    if (n.y < -0.75) return bellyC;
    if (n.y > 0.85) return '#4e8a33';
    if (Math.abs(n.x) > 0.5 && Math.abs(c.y - 0.16) < 0.018 && (Math.floor((c.z + 1) * 38) % 2 === 0)) return spot; // lateral spot row
    return (Math.floor((c.z + 1) * 26) % 2) ? g1 : g2;
  }, rng, 0.06);
  // dorsal crest serrations
  const crest = [];
  for (let i = 0; i < 7; i++) { const z = lerp(-0.08, 0.07, i / 6); crest.push(paintG((stick([0, 0.215 - Math.abs(z) * 0.35, z], [0, 0.235 - Math.abs(z) * 0.35, z - 0.006], 0.006, 0.001, 3)), '#4a8530', rng)); }
  const bodyG = merge([body, ...crest]);
  const headL = colorize(wobble(loft([
    { p: [0, 0.155, 0.085], r: [0.03, 0.045] }, { p: [0, 0.16, 0.12], r: [0.028, 0.038] }, { p: [0, 0.148, 0.148], r: [0.02, 0.024] },
    { p: [0, 0.143, 0.165], r: [0.011, 0.012] }], 8, { tipEnd: 0.005, capStart: false }), 0.002, 2),
  (c, n) => (n.y < -0.3 && c.z > 0.11) ? '#d8dc90' : (n.y > 0.5 ? '#4b8a30' : g1), rng, 0.05);
  const casque = colorize(ell(0.014, 0.04, 0.038, 0, 0, 0, 7, 5).rotateX(-0.6).translate(0, 0.198, 0.088), (c, n) => n.z < -0.3 ? '#4a8a30' : '#62a03e', rng, 0.05);
  const head = merge([headL, casque]);
  const eyeG = {};
  for (const [k, sd] of [['eyeL', 1], ['eyeR', -1]]) {
    const turret = colorize(ell(0.017, 0.016, 0.016, sd * 0.004, 0, 0, 8, 6), (c, n) => '#6aaa42', rng, 0.05);
    const pupil = paintG(ell(0.005, 0.005, 0.005, sd * 0.019, 0, 0, 5, 4), '#050505', rng, 0);
    const ring = paintG(ell(0.007, 0.007, 0.007, sd * 0.0165, 0, 0, 6, 4), '#d6c040', rng, 0);
    eyeG[k] = merge([turret, ring, pupil]).translate(sd * 0.026, 0.168, 0.122);
  }
  const legs = {};
  for (const [k, sd, fr] of [['legFL', 1, 1], ['legFR', -1, 1], ['legHL', 1, 0], ['legHR', -1, 0]]) {
    const x = sd * 0.03, z = fr ? 0.06 : -0.065;
    const elbow = [sd * 0.062, 0.085, z + (fr ? -0.012 : 0.012)], foot = [sd * 0.05, 0.01, z + (fr ? 0.012 : -0.008)];
    const leg = loft([{ p: [x, 0.14, z], r: 0.013 }, { p: elbow, r: 0.01 }, { p: foot, r: 0.007 }], 5, { up: [0, 0, 1] });
    const t1 = stick(foot, add3(foot, [sd * 0.015, -0.006, 0.016]), 0.006, 0.003, 4), t2 = stick(foot, add3(foot, [-sd * 0.01, -0.006, -0.016]), 0.006, 0.003, 4);
    legs[k] = { geom: merge([colorize(leg, () => g1, rng, 0.06), paintG(t1, '#4e8a33', rng), paintG(t2, '#4e8a33', rng)]), pivot: [x, 0.14, z] };
  }
  // spiral tail
  const tpts = [[0, 0.13, -0.1], [0, 0.128, -0.15]];
  const C = [0, 0.075, -0.15];
  for (let i = 1; i <= 14; i++) { const th = i / 14 * 2.25 * Math.PI; const R = 0.053 * Math.exp(-0.26 * th); tpts.push([0, C[1] + R * Math.cos(th), C[2] - R * Math.sin(th)]); }
  const tail = colorize(tube(tpts, 22, u => [0.02 * (1 - u * 0.82), 0.024 * (1 - u * 0.8)], 6, { tipEnd: 0.004 }),
    (c, n, k, ud) => (Math.floor(k / (2 * ud.sides)) % 3 === 0) ? g2 : g1, rng, 0.05);
  const tongue = merge([colorize(loft([{ p: [0, 0.145, 0.16], r: 0.004 }, { p: [0, 0.145, 0.38], r: 0.004 }], 4, { capStart: false }), () => '#e48a98', rng, 0),
    paintG(ell(0.01, 0.01, 0.012, 0, 0.145, 0.386, 6, 4), '#d86c80', rng, 0)]);
  return {
    height: 0.24, length: 0.42,
    parts: [
      { name: 'body', geom: bodyG, pivot: [0, 0.15, 0] },
      { name: 'head', geom: head, pivot: [0, 0.155, 0.085], parent: 'body' },
      { name: 'eyeL', geom: eyeG.eyeL, pivot: [0.026, 0.168, 0.122], parent: 'head' },
      { name: 'eyeR', geom: eyeG.eyeR, pivot: [-0.026, 0.168, 0.122], parent: 'head' },
      { name: 'tongue', geom: tongue, pivot: [0, 0.145, 0.16], parent: 'head', noShadow: true },
      ...['legFL', 'legFR', 'legHL', 'legHR'].map(k => ({ name: k, geom: legs[k].geom, pivot: legs[k].pivot, parent: 'body' })),
      { name: 'tail', geom: tail, pivot: [0, 0.13, -0.1], parent: 'body' },
    ],
  };
}

function buildAgama(rng) {
  const gb = '#7b6c5a', gbD = '#4d4134', yel = '#cdb35e', bellyC = '#b9ab92';
  const bodyL = colorize(wobble(loft([
    { p: [0, 0.052, -0.11], r: [0.034, 0.024] }, { p: [0, 0.058, -0.075], r: [0.062, 0.034] }, { p: [0, 0.062, -0.005], r: [0.072, 0.037] },
    { p: [0, 0.062, 0.055], r: [0.058, 0.034] }, { p: [0, 0.066, 0.1], r: [0.036, 0.03] }], 10), 0.0045, 1),
  (c, n) => {
    if (n.y < -0.5) return bellyC;
    if (n.y > 0.5) { const band = Math.floor((c.z + 1) * 32) % 3; if (band === 0 && Math.abs(c.x) < 0.035) return yel; if (band === 1) return gbD; }
    if (Math.abs(n.x) > 0.6 && (h3(c.x * 800, c.y * 800, c.z * 800, 2) & 3) === 0) return '#b8a06a';
    return gb;
  }, rng, 0.08);
  const spikes = [];
  for (let i = 0; i < 18; i++) {
    const z = lerp(-0.09, 0.08, rng()), sd = rng.sign();
    const base = [sd * 0.058 * (1 - Math.abs(z) * 3), 0.07, z];
    spikes.push(paintG(stick(base, add3(base, [sd * 0.008, 0.009, -0.004]), 0.005, 0.0008, 3), '#8a7a62', rng, 0.08));
  }
  const body = merge([bodyL, ...spikes]);
  const headL = colorize(wobble(loft([
    { p: [0, 0.064, 0.09], r: [0.036, 0.029] }, { p: [0, 0.07, 0.125], r: [0.035, 0.027] }, { p: [0, 0.062, 0.158], r: [0.022, 0.018] },
    { p: [0, 0.056, 0.178], r: [0.011, 0.01] }], 8, { tipEnd: 0.005, capStart: false }), 0.0025, 2),
  (c, n) => n.y < -0.4 ? '#c9b98a' : (n.y > 0.5 ? '#6a5c4b' : gb), rng, 0.06);
  const tufts = [1, -1].flatMap(sd => [0, 1].map(j => paintG(stick([sd * 0.034, 0.072, 0.1 - j * 0.012], [sd * 0.046, 0.08, 0.097 - j * 0.012], 0.006, 0.001, 3), '#5c4f40', rng)));
  const head = merge([headL, ...tufts, ...eyes(0.03, 0.08, 0.135, 0.007, '#1a1208', rng)]);
  const legs = {};
  for (const [k, sd, fr] of [['legFL', 1, 1], ['legFR', -1, 1], ['legHL', 1, 0], ['legHR', -1, 0]]) {
    const x = sd * 0.05, z = fr ? 0.065 : -0.065;
    const pts = fr ? [[x, 0.055, z, 0.014], [sd * 0.09, 0.05, z + 0.01, 0.011], [sd * 0.1, 0.006, z + 0.025, 0.008]]
      : [[x, 0.055, z, 0.017], [sd * 0.1, 0.05, z - 0.015, 0.012], [sd * 0.115, 0.006, z - 0.035, 0.008]];
    const leg = loft(pts.map(([a, b, c, r]) => ({ p: [a, b, c], r })), 5, { up: [0, 1, 0] });
    const foot = pts[2].slice(0, 3);
    const toes = [-0.5, 0, 0.5].map(o => paintG(stick(foot, add3(foot, [sd * 0.012 + o * 0.01, -0.004, fr ? 0.02 : -0.02]), 0.004, 0.0015, 3), gbD, rng));
    legs[k] = { geom: merge([colorize(leg, () => gb, rng, 0.08), ...toes]), pivot: [x, 0.055, z] };
  }
  const tail = colorize(wobble(tube([[0, 0.052, -0.1], [0, 0.045, -0.18], [0.008, 0.03, -0.27], [0.02, 0.016, -0.33]], 12, u => [0.026 * (1 - u * 0.85), 0.02 * (1 - u * 0.8)], 6, { tipEnd: 0.01 }), 0.002, 3),
    (c, n, k, ud) => (Math.floor(k / (2 * ud.sides)) % 2) ? gbD : gb, rng, 0.07);
  return {
    height: 0.12, length: 0.5,
    parts: [
      { name: 'body', geom: body, pivot: [0, 0.06, 0] },
      { name: 'head', geom: head, pivot: [0, 0.066, 0.095], parent: 'body' },
      ...['legFL', 'legFR', 'legHL', 'legHR'].map(k => ({ name: k, geom: legs[k].geom, pivot: legs[k].pivot, parent: 'body' })),
      { name: 'tail', geom: tail, pivot: [0, 0.052, -0.1], parent: 'body' },
    ],
  };
}

// ---------------------------------------------------------------- INSECTS
function buildBee(rng) {
  const amber = '#dc9a28', black = '#1c140e';
  const abd = colorize(loft([0, 1, 2, 3, 4, 5, 6, 7].map(i => { const z = lerp(-0.095, 0.015, i / 7); const r = 0.044 * Math.sin(lerp(0.35, 2.6, i / 7)); return { p: [0, -0.005 - i * 0.001, z], r: [r, r * 0.92] }; }), 10, { tipEnd: 0.012, raw: true }),
    (c, n, k, ud) => { const seg = Math.floor(k / (2 * ud.sides)); if (seg >= ud.segs) return black; return (seg === 1 || seg === 3 || seg === 5) ? black : amber; }, rng, 0.04);
  const thorax = colorize(wobble(ell(0.034, 0.032, 0.036, 0, 0.004, 0.042, 8, 6), 0.002, 1), (c, n) => n.y > 0.3 ? '#8f6a38' : '#b48a50', rng, 0.06);
  const head = colorize(ell(0.026, 0.026, 0.02, 0, 0, 0.088, 7, 5), (c, n) => Math.abs(n.x) > 0.55 ? '#120d0a' : '#3a2a1c', rng, 0.04);
  const ant = [1, -1].map(sd => paintG(stick([sd * 0.01, 0.018, 0.1], [sd * 0.028, 0.045, 0.13], 0.003, 0.002, 3), black, rng));
  const legs = [];
  for (const sd of [1, -1]) for (let i = 0; i < 3; i++) { const z = 0.03 + i * 0.016; legs.push(paintG(stick([sd * 0.02, -0.015, z], [sd * 0.05, -0.05, z - 0.02 + i * 0.01], 0.004, 0.002, 3), i === 2 ? '#3a2a10' : black, rng)); }
  const body = merge([abd, thorax, head, ...ant, ...legs]);
  const wing = (sd) => {
    const g = colorize(new THREE.CircleGeometry(1, 10).rotateX(-Math.PI / 2).scale(0.045, 1, 0.02).translate(0.045, 0, -0.008).rotateY(-0.35), (c, n) => '#e4f0ff', rng, 0.03);
    const g2 = colorize(new THREE.CircleGeometry(1, 8).rotateX(-Math.PI / 2).scale(0.028, 1, 0.013).translate(0.03, -0.001, -0.03).rotateY(-0.5), () => '#d6e6f8', rng, 0.02);
    const m = merge([g, g2]); return (sd < 0 ? mirrorX(m) : m).translate(sd * 0.018, 0.034, 0.05);
  };
  return {
    height: 0.1, length: 0.2,
    parts: [
      { name: 'body', geom: body, pivot: [0, 0, 0] },
      { name: 'wingL', geom: wing(1), pivot: [0.018, 0.034, 0.05], parent: 'body', mat: MAT.clearWing, noShadow: true },
      { name: 'wingR', geom: wing(-1), pivot: [-0.018, 0.034, 0.05], parent: 'body', mat: MAT.clearWing, noShadow: true },
    ],
  };
}

function polyAt(pts, v) { // interpolate along open polyline by fraction of length
  const L = []; let tot = 0; for (let i = 0; i < pts.length - 1; i++) { const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); L.push(d); tot += d; }
  let s = v * tot; for (let i = 0; i < L.length; i++) { if (s <= L[i] || i === L.length - 1) { const f = clamp(s / L[i]); return [lerp(pts[i][0], pts[i + 1][0], f), lerp(pts[i][1], pts[i + 1][1], f)]; } s -= L[i]; }
  return pts[pts.length - 1];
}
function buildButterfly(rng) {
  const yel = '#f3d34a', blk = '#15110e', blue = '#3f7fe0', org = '#e8571e';
  const fore = [[0.004, 0.012], [0.05, 0.05], [0.11, 0.074], [0.165, 0.066], [0.16, 0.03], [0.13, 0.0], [0.07, -0.014], [0.004, -0.004]];
  const hind = [[0.004, -0.004], [0.075, -0.014], [0.118, -0.04], [0.118, -0.08], [0.096, -0.104], [0.084, -0.158], [0.07, -0.114], [0.045, -0.1], [0.004, -0.032]];
  const fan = (outline, colFn) => plate((u, v) => { const o = polyAt(outline, v); const r = Math.pow(u, 0.9); return [0.004 + (o[0] - 0.004) * r, 0.004 * Math.sin(u * Math.PI), 0.004 + (o[1] - 0.004) * r]; }, 6, 14, 0.002, colFn, rng, 0.03);
  const foreG = fan(fore, (u, v, top) => {
    if (u > 0.78) return (Math.floor(v * 14) % 2 && top) ? '#f6dc6a' : blk;          // black margin with yellow lunules
    if (u < 0.3) return top ? blk : '#3a3020';                                         // dark base
    if (v < 0.42 && u > 0.35 && Math.floor(v * 10) % 2 === 0) return blk;              // costal bars
    return top ? yel : '#f0dc80';
  });
  const hindG = fan(hind, (u, v, top) => {
    if (v > 0.6 && v < 0.74 && u > 0.55) return blk;                                   // swallow tail
    if (v > 0.8 && u > 0.6 && u < 0.95) return u > 0.75 ? org : blue;                  // eyespot (orange, blue-ringed)
    if (u > 0.9) return blk;                                                           // outer margin
    if (u > 0.7) return (Math.floor(v * 9) % 2 === 0 && v < 0.6) ? blue : blk;        // blue lunules on a black band
    if (u < 0.3) return top ? blk : '#3a3020';
    if (u > 0.4 && u < 0.5 && v > 0.15 && v < 0.85) return blk;                       // vein band
    return top ? yel : '#f0dc80';
  });
  const wingL = merge([foreG, hindG]);
  const wingR = mirrorX(wingL.clone());
  const body = merge([
    colorize(loft([{ p: [0, 0, -0.06], r: 0.006 }, { p: [0, 0, -0.02], r: 0.01 }, { p: [0, 0.002, 0.02], r: 0.011 }, { p: [0, 0.002, 0.035], r: 0.008 }], 6, { tipStart: 0.006 }), (c, n) => n.y < -0.3 && c.z < -0.02 ? '#d8b840' : blk, rng, 0.04),
    paintG(ell(0.009, 0.009, 0.009, 0, 0.004, 0.042, 6, 4), blk, rng),
    ...[1, -1].map(sd => paintG(stick([sd * 0.004, 0.008, 0.046], [sd * 0.02, 0.04, 0.085], 0.0018, 0.0014, 3), blk, rng)),
    ...[1, -1].map(sd => paintG(ell(0.0035, 0.0035, 0.006, sd * 0.02, 0.04, 0.087, 4, 3), blk, rng)),
  ]);
  return {
    height: 0.08, length: 0.35,
    parts: [
      { name: 'body', geom: body, pivot: [0, 0, 0] },
      { name: 'wingL', geom: wingL.translate(0.006, 0.004, 0.0), pivot: [0.006, 0.004, 0], parent: 'body' },
      { name: 'wingR', geom: wingR.translate(-0.006, 0.004, 0.0), pivot: [-0.006, 0.004, 0], parent: 'body' },
    ],
  };
}

function insectAnim(kind) {
  return (n, spec, rng) => {
    const st = { ph: rng() * TAU, t: rng() * 100, open: 0 };
    return (dt, s) => {
      const a = s.action || 'idle'; st.t += dt; const t = st.t;
      const air = a === 'fly' || a === 'hover' || a === 'glide';
      if (kind === 'bee') {
        const flapping = air || a === 'walk';
        st.ph += dt * (flapping ? 26 : 0) * TAU;
        const flap = flapping ? 0.25 + 0.75 * Math.sin(st.ph) : -0.05;
        const fold = flapping ? 0 : 1;
        n.wingL.rotation.set(0, fold * 0.55, flap * 0.9); n.wingR.rotation.set(0, -fold * 0.55, -flap * 0.9);
        n.rig.position.y = air ? Math.sin(t * 5.5) * 0.012 + Math.sin(t * 1.7) * 0.01 : 0;
        n.rig.rotation.x = air ? (a === 'hover' ? -0.15 : 0.15) + Math.sin(t * 3) * 0.04 : (a === 'eat' ? 0.35 : 0);
        n.rig.rotation.z = air ? Math.sin(t * 2.3) * 0.08 : 0;
        n.body.position.z = (a === 'eat') ? Math.sin(t * 6) * 0.004 : 0;
      } else { // butterfly
        let target;
        if (air) { st.ph += dt * (a === 'glide' ? 1.2 : 6.5) * TAU; target = a === 'glide' ? 0.15 + Math.sin(st.ph) * 0.1 : 0.45 + 0.85 * Math.sin(st.ph); }
        else if (a === 'eat' || a === 'sleep') { st.ph += dt * 0.35 * TAU; target = 1.38 - (a === 'eat' ? Math.max(0, Math.sin(st.ph)) * 0.4 : 0); }
        else { st.ph += dt * 0.25 * TAU; target = 0.15 + Math.max(0, Math.sin(st.ph)) ** 2 * 1.1; } // basking: open, slow close
        st.open = air ? target : damp(st.open, target, 5, dt);
        n.wingL.rotation.set(0, 0, st.open); n.wingR.rotation.set(0, 0, -st.open);
        n.rig.position.y = air ? -Math.sin(st.ph) * 0.025 + Math.sin(t * 1.3) * 0.02 : 0;
        n.rig.rotation.x = air ? -0.25 : -0.05;
        n.rig.rotation.z = air ? Math.sin(t * 1.1) * 0.12 : 0;
      }
    };
  };
}

// ---------------------------------------------------------------- COLONY: harvester ants (Messor)
function antGeometry(rng) {
  return cachedGeom('ant', () => {
    const c1 = '#1d130e', c2 = '#2c1710';
    const parts = [
      paintG(ell(0.02, 0.017, 0.028, 0, 0.026, -0.035, 6, 4), c1, rng, 0.03),
      paintG(ell(0.007, 0.007, 0.008, 0, 0.022, -0.008, 4, 3), c1, rng, 0.03),
      paintG(ell(0.011, 0.011, 0.02, 0, 0.026, 0.008, 5, 3), c2, rng, 0.03),
      paintG(ell(0.019, 0.016, 0.018, 0, 0.028, 0.038, 6, 4), c2, rng, 0.03),
    ];
    for (const dz of [-0.008, 0.006, 0.02]) parts.push(paintG(new THREE.BoxGeometry(0.07, 0.004, 0.005).translate(0, 0.012, dz), c1, rng, 0.03));
    parts.push(...[1, -1].map(sd => paintG(stick([sd * 0.008, 0.035, 0.052], [sd * 0.02, 0.042, 0.075], 0.0025, 0.0015, 3), c1, rng, 0)));
    return merge(parts);
  });
}
const GEOMS = new Map();
function cachedGeom(key, fn) { if (!GEOMS.has(key)) GEOMS.set(key, fn()); return GEOMS.get(key); }

function buildNest(rng) {
  return cachedGeom('ant-nest', () => {
    const prof = [[0.0, -0.03], [0.07, -0.02], [0.13, 0.05], [0.24, 0.1], [0.42, 0.07], [0.65, 0.03], [0.9, 0.0]].map(([r, y]) => new THREE.Vector2(r, y));
    const crater = colorize(wobble(new THREE.LatheGeometry(prof, 16), 0.012, 4), (c, n) => {
      const r = Math.hypot(c.x, c.z); if (r < 0.1) return '#140c07'; if (r < 0.2) return '#5a3e2a';
      if (r > 0.7) return '#9a7a58';
      return (h3(c.x * 300, 0, c.z * 300, 9) & 3) === 0 ? '#c8a878' : '#b8966a';
    }, rng, 0.06);
    const husks = [];
    for (let i = 0; i < 150; i++) {
      const a = rng() * TAU, r = 0.25 + Math.pow(rng(), 1.3) * 0.75;
      const g = new THREE.TetrahedronGeometry(1, 0).scale(0.03 + rng() * 0.015, 0.008, 0.012 + rng() * 0.008).rotateY(rng() * TAU);
      const y = r < 0.65 ? lerp(0.08, 0.02, (r - 0.3) / 0.35) : 0.01;
      g.translate(Math.cos(a) * r, y, Math.sin(a) * r);
      husks.push(paintG(g, rng.pick(['#ecd9a0', '#e2c784', '#d4b46e', '#f2e6bd']), rng, 0.06));
    }
    // a few dropped seeds near entrance
    for (let i = 0; i < 10; i++) { const a = rng() * TAU, r = 0.12 + rng() * 0.25; husks.push(paintG(ell(0.016, 0.012, 0.022, Math.cos(a) * r, 0.06, Math.sin(a) * r, 5, 3), '#e8d9a8', rng, 0.05)); }
    return merge([crater, ...husks]);
  });
}

function makeHarvesterAnts(opts = {}) {
  const seed = opts.seed ?? 1; const rng = makeRng(hashString('harvesterant') + seed);
  const object = new THREE.Group(); object.name = 'harvesterant';
  const nest = new THREE.Mesh(buildNest(makeRng(77)), MAT.std()); nest.receiveShadow = true; nest.castShadow = false; object.add(nest);
  const N = 90;
  const ants = new THREE.InstancedMesh(antGeometry(makeRng(5)), MAT.std(), N); ants.castShadow = false; ants.receiveShadow = true;
  ants.instanceMatrix.setUsage(THREE.DynamicDrawUsage); ants.frustumCulled = false;
  const seeds = new THREE.InstancedMesh(cachedGeom('ant-seed', () => paintG(ell(0.016, 0.011, 0.022, 0, 0, 0, 5, 3), '#ecdcae', makeRng(3), 0)), MAT.std(), N);
  seeds.instanceMatrix.setUsage(THREE.DynamicDrawUsage); seeds.frustumCulled = false;
  object.add(ants, seeds);
  const ant = Array.from({ length: N }, (_, i) => ({ off: i / N + rng() * 0.004, lane: 0.04 + rng() * 0.05, spd: 0.85 + rng() * 0.3, wig: rng() * TAU, mill: i < 10 }));
  let trail = null, cum = [], total = 1;
  const setLocal = (pts) => {
    trail = pts; cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    total = Math.max(0.01, cum[cum.length - 1]);
  };
  setLocal([new V3(0, 0.02, 0), new V3(0.8, 0, 1.2), new V3(0.6, 0, 2.6), new V3(1.4, 0, 3.8), new V3(1.2, 0, 5)]);
  const P = new V3(), T = new V3(), S = new V3(), up = new V3(0, 1, 0), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new V3(1, 1, 1), zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const sample = (d) => {
    d = clamp(d, 0, total);
    let i = 1; while (i < cum.length - 1 && cum[i] < d) i++;
    const f = (d - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
    P.lerpVectors(trail[i - 1], trail[i], f); T.subVectors(trail[i], trail[i - 1]).normalize();
  };
  let time = 0;
  return {
    type: 'colony', object, height: 0.25, length: 2,
    setTrail(pointsWorld) {
      if (!pointsWorld || pointsWorld.length < 2) return;
      object.updateWorldMatrix(true, false);
      const inv = object.matrixWorld.clone().invert();
      let pts = pointsWorld.map(p => new V3(p.x, p.y, p.z).applyMatrix4(inv));
      if (pts[pts.length - 1].length() < pts[0].length()) pts.reverse();
      if (pts[0].length() > 0.3) pts.unshift(new V3(0, pts[0].y, 0));
      pts[0].y = Math.max(pts[0].y, 0.02);
      setLocal(pts);
    },
    update(dt, s = {}) {
      dt = clamp(dt || 0, 0, 0.1); time += dt;
      const act = clamp(s.activity ?? 1); const night = s.night || 0;
      const speed = 0.32 * (0.55 + 0.45 * act) * (1 - 0.4 * night);
      const visible = Math.max(6, Math.round(N * (0.15 + 0.85 * act)));
      for (let i = 0; i < N; i++) {
        const A = ant[i];
        if (i >= visible) { ants.setMatrixAt(i, zero); seeds.setMatrixAt(i, zero); continue; }
        let carry = false;
        if (A.mill) { // ants milling around the entrance
          const a = time * 0.6 * A.spd + A.off * TAU * 3, r = 0.16 + 0.12 * Math.sin(time * 0.4 + i);
          P.set(Math.cos(a) * r, 0.07, Math.sin(a) * r); T.set(-Math.sin(a), 0, Math.cos(a));
        } else {
          const u = ((A.off + time * speed * A.spd / (2 * total)) % 1 + 1) % 1;
          let d; let lane;
          if (u < 0.5) { d = u * 2 * total; lane = A.lane; } else { d = (1 - (u - 0.5) * 2) * total; lane = -A.lane; carry = true; }
          sample(d); if (carry) T.negate();
          S.crossVectors(up, T).normalize();
          const near = smoothstep(0.5, 0.0, d);
          P.addScaledVector(S, lane * (1 - near * 0.8) + Math.sin(time * 7 + A.wig) * 0.01);
          if (d < 0.6) P.y = Math.max(P.y, lerp(0.09, 0.0, d / 0.6)); // climb the crater rim
        }
        e.set(0, Math.atan2(T.x, T.z) + Math.sin(time * 14 + A.wig) * 0.15, 0); q.setFromEuler(e);
        P.y += Math.abs(Math.sin(time * 22 + A.wig)) * 0.004;
        m.compose(P, q, sc); ants.setMatrixAt(i, m);
        if (carry) { S.set(0, 0.04, 0.075).applyQuaternion(q).add(P); m.compose(S, q, sc); seeds.setMatrixAt(i, m); } else seeds.setMatrixAt(i, zero);
      }
      ants.instanceMatrix.needsUpdate = true; seeds.instanceMatrix.needsUpdate = true;
    },
    dispose() { object.removeFromParent(); ants.dispose(); seeds.dispose(); },
  };
}

// ---------------------------------------------------------------- SWARM: fireflies
let _glowTex = null;
function glowTexture() {
  if (_glowTex) return _glowTex;
  const S = 64; const d = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const r = Math.hypot(x - S / 2 + 0.5, y - S / 2 + 0.5) / (S / 2);
    const a = clamp(Math.exp(-r * r * 5) * 0.6 + Math.exp(-r * r * 60) * 1.0);
    const i = (y * S + x) * 4; d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.round(a * 255);
  }
  _glowTex = new THREE.DataTexture(d, S, S, THREE.RGBAFormat); _glowTex.needsUpdate = true; _glowTex.magFilter = THREE.LinearFilter; _glowTex.minFilter = THREE.LinearFilter;
  return _glowTex;
}
function makeFireflies(opts = {}) {
  const seed = opts.seed ?? 1; const rng = makeRng(hashString('firefly') + seed);
  const N = 12;
  const object = new THREE.Group(); object.name = 'firefly';
  const bodyGeom = cachedGeom('firefly-body', () => {
    const r = makeRng(9);
    return merge([paintG(ell(0.014, 0.011, 0.03, 0, 0, 0.0, 5, 4), '#2a2018', r, 0), paintG(ell(0.012, 0.01, 0.014, 0, -0.002, -0.03, 5, 3), '#d8e070', r, 0),
      paintG(ell(0.01, 0.009, 0.01, 0, 0.002, 0.03, 4, 3), '#c8603a', r, 0)]);
  });
  const bodies = new THREE.InstancedMesh(bodyGeom, MAT.std(), N); bodies.frustumCulled = false; bodies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  pg.boundingSphere = new THREE.Sphere(new V3(0, 1.3, 0), 3);
  const glowMat = cachedMaterial('grove-animals:fireflyglow', () => new THREE.PointsMaterial({ size: 1.1, map: glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  const glow = new THREE.Points(pg, glowMat); glow.frustumCulled = false; glow.renderOrder = 2;
  object.add(bodies, glow);
  const F = Array.from({ length: N }, () => ({
    cx: (rng() * 2 - 1) * 1.1, cz: (rng() * 2 - 1) * 1.1, cy: 0.5 + rng() * 1.4, ax: 0.3 + rng() * 0.5, az: 0.3 + rng() * 0.5, ay: 0.15 + rng() * 0.25,
    fx: 0.1 + rng() * 0.15, fz: 0.1 + rng() * 0.15, fy: 0.15 + rng() * 0.2, p: rng() * TAU, period: 1.6 + rng() * 2.4, bp: rng() * 10,
  }));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), P = new V3(), sc = new V3(), Pn = new V3();
  let time = rng() * 50; let nightW = 0;
  const update = (dt, s = {}) => {
    dt = clamp(dt || 0, 0, 0.1); time += dt;
    const night = s.night || 0; const act = clamp(s.activity ?? 1);
    nightW = damp(nightW, smoothstep(0.5, 0.75, night), 2, dt);
    const visible = Math.max(3, Math.round(N * (0.3 + 0.7 * act)));
    for (let i = 0; i < N; i++) {
      const f = F[i]; const t = time + f.p * 10;
      P.set(f.cx + Math.sin(t * f.fx * TAU * 0.3 + f.p) * f.ax, f.cy + Math.sin(t * f.fy * TAU * 0.3 + f.p * 2) * f.ay, f.cz + Math.cos(t * f.fz * TAU * 0.3 + f.p * 3) * f.az);
      Pn.set(f.cx + Math.sin((t + 0.1) * f.fx * TAU * 0.3 + f.p) * f.ax, P.y, f.cz + Math.cos((t + 0.1) * f.fz * TAU * 0.3 + f.p * 3) * f.az);
      e.set(0, Math.atan2(Pn.x - P.x, Pn.z - P.z), 0); q.setFromEuler(e);
      const on = i < visible ? 1 : 0;
      sc.setScalar(on * 1.0); m.compose(P, q, sc); bodies.setMatrixAt(i, m);
      // blink: short bright flash every period, with a faint ember between flashes
      const ph = ((time + f.bp) % f.period) / f.period;
      const flash = Math.pow(Math.max(0, Math.sin(clamp(ph / 0.22) * Math.PI)), 2);
      const b = on * nightW * (0.12 + 3.2 * flash);
      pos[i * 3] = P.x; pos[i * 3 + 1] = P.y - 0.02; pos[i * 3 + 2] = P.z;
      col[i * 3] = 0.8 * b; col[i * 3 + 1] = 1.0 * b; col[i * 3 + 2] = 0.3 * b;
    }
    bodies.instanceMatrix.needsUpdate = true; pg.attributes.position.needsUpdate = true; pg.attributes.color.needsUpdate = true;
    glow.visible = nightW > 0.01;
  };
  update(0, {});
  return { type: 'swarm', object, height: 2.2, length: 3, update, dispose() { object.removeFromParent(); bodies.dispose(); pg.dispose(); } };
}

// ---------------------------------------------------------------- per-species animation configs
const GAZELLE_ANIM = quadAnim({
  walkSpeed: 0.9, runSpeed: 6, walkStride: 1.0, runStride: 3.2, walkAmp: 0.42, runAmp: 0.85, lift: 0.14, hindAmp: 1.1,
  runOff: [0, 0.25, Math.PI * 0.95, Math.PI * 1.15], walkBob: 0.025, runLift: 0.32, runPitch: 0.16, airPhase: 0.6,
  foldF: -1.5, foldH: -1.45, sleepDrop: 0.6, sleepShrink: 0.42, sleepNeck: 0.6, sleepHead: 0.5, sleepYaw: 1.1, sleepRoll: 0.06,
  eatNeck: 2.05, eatHead: -0.85, eatPitch: 0.12, eatDrop: 0.03, eatSplay: -0.1, lookYaw: 0.8, lookPitch: 0.15,
  tailIdle: 0.05, tailHz: 1, tailWalk: 0.1, tailFlick: true, tailRunLift: 0.8, nod: 0.08,
});
const FOX_ANIM = quadAnim({
  walkSpeed: 0.8, runSpeed: 4.5, walkStride: 0.6, runStride: 1.6, walkAmp: 0.48, runAmp: 0.9, lift: 0.15,
  walkBob: 0.012, runLift: 0.12, runPitch: 0.12, airPhase: 0.4,
  foldF: -1.45, foldH: -1.4, sleepDrop: 0.27, sleepShrink: 0.35, sleepHead: 0.35, sleepYaw: 1.25, sleepRoll: 0.15, sleepTail: 1.1, sleepTailX: -0.45,
  eatHead: 0.95, eatPitch: 0.18, eatDrop: 0.03, lookYaw: 0.8, lookPitch: 0.2,
  tailIdle: 0.15, tailHz: 1.1, tailWalk: 0.12, tailRunLift: -0.35, tailWalkLift: -0.1, nod: 0.05, sniff: true,
});
const PORCUPINE_ANIM = quadAnim({
  walkSpeed: 0.35, runSpeed: 1.6, walkStride: 0.32, runStride: 0.5, walkAmp: 0.45, runAmp: 0.6, lift: 0.18,
  walkBob: 0.008, runLift: 0.02, runPitch: 0.05, roll: 0.07, yawSway: 0.04,
  foldF: 1.2, foldH: 1.2, sleepDrop: 0.1, sleepShrink: 0.4, sleepHead: 0.4, sleepYaw: 0.5,
  eatHead: 0.55, eatPitch: 0.06, lookYaw: 0.5, lookPitch: 0.1, nod: 0.06, sniff: true,
  extra(n, st, s, dt, w) {
    const alarm = s.alarm || s.action === 'run' ? 1 : 0;
    const shimmer = pulser(st, 'qr', w.rng, dt, 5, 12, 1.2) * w.idleW * 0.35;
    st.raise = damp(st.raise ?? 0, Math.max(alarm, shimmer), alarm ? 6 : 2.5, dt);
    n.quillsMesh.morphTargetInfluences[0] = st.raise;
    n.quills.rotation.z = Math.sin(w.t * 34) * 0.025 * st.raise + Math.sin(w.t * 3) * 0.01 * w.wm;
  },
});
const HEDGEHOG_ANIM = quadAnim({
  walkSpeed: 0.3, runSpeed: 1.2, walkStride: 0.14, runStride: 0.22, walkAmp: 0.6, runAmp: 0.7, lift: 0.2,
  walkBob: 0.006, runLift: 0.01, runPitch: 0.03, roll: 0.05,
  foldF: 0.6, foldH: 0.6, sleepDrop: 0.03, sleepShrink: 0.7, sleepHead: 1.5, sleepYaw: 0,
  eatHead: 0.6, eatPitch: 0.08, lookYaw: 0.5, lookPitch: 0.12, nod: 0.05, sniff: true,
  extra(n, st, s, dt, w) { // curl into a ball when sleeping
    n.body.rotation.x = w.ws * 0.45; n.head.position.z = n.head.userData.base.z - w.ws * 0.05; n.head.position.y = n.head.userData.base.y - w.ws * 0.02;
    const sc = 1 - w.ws * 0.6; n.head.scale.set(sc, sc, sc);
  },
});
const HYRAX_ANIM = quadAnim({
  walkSpeed: 0.5, runSpeed: 2.4, walkStride: 0.3, runStride: 0.7, walkAmp: 0.5, runAmp: 0.75, lift: 0.18,
  walkBob: 0.01, runLift: 0.05, runPitch: 0.1, roll: 0.04,
  foldF: 1.2, foldH: 1.2, sleepDrop: 0.09, sleepShrink: 0.3, sleepHead: 0.35, sleepYaw: 0.3,
  eatHead: 0.7, eatPitch: 0.08, lookYaw: 0.7, lookPitch: 0.15, nod: 0.05,
  extra(n, st, s, dt, w) { // basking: in idle, alternate between alert sitting and lying flat sprawled on the warm rock
    st.baskT = (st.baskT ?? (w.rng() * 6)) - dt;
    if (st.baskT <= 0) { st.basking = !st.basking; st.baskT = st.basking ? 6 + w.rng() * 6 : 4 + w.rng() * 4; }
    st.wBask = damp(st.wBask ?? 0, st.basking ? w.idleW : 0, 1.5, dt);
    const b = Math.max(st.wBask, w.ws * 0.6);
    n.body.position.y -= b * 0.08;
    for (const [k, sd] of [['legFL', 1], ['legFR', -1], ['legHL', 1], ['legHR', -1]]) { n[k].rotation.z = -sd * b * 1.1; n[k].rotation.x += (k[3] === 'F' ? -0.5 : 0.6) * b * 0.6; }
    n.head.rotation.x += b * 0.12; n.head.rotation.y *= 1 - b * 0.7;
  },
});
const MOUSE_ANIM = quadAnim({
  walkSpeed: 0.4, runSpeed: 2.0, walkStride: 0.09, runStride: 0.2, walkAmp: 0.65, runAmp: 0.8, lift: 0.2,
  runOff: [0, 0.2, Math.PI, Math.PI + 0.2], walkBob: 0.004, runLift: 0.02, runPitch: 0.15,
  foldF: 0.8, foldH: 0.8, sleepDrop: 0.02, sleepShrink: 0.5, sleepHead: 0.6, sleepYaw: 0.6, sleepTail: 1.4,
  eatHead: 0.35, eatPitch: -0.25, lookYaw: 0.9, lookPitch: 0.25, nod: 0.06, sniff: true,
  tailIdle: 0.15, tailHz: 0.8, tailWalk: 0.25,
  extra(n, st, s, dt, w) { // sits up to nibble seeds
    n.legFL.rotation.x += w.we * -0.9;
  },
});
const JAY_ANIM = birdAnim({ flapHz: 4.2, flapAmp: 0.95, flapBias: 0.15, upFold: 0.25, bodyBob: 0.02, burstCycle: 1.8, burstFrac: 0.7, hopH: 0.05, hopHz: 2.6, flick: 0.5, sweep: 0.15, sleepHeadY: 2.6, sleepTuck: 0.03 });
const BLACKBIRD_ANIM = birdAnim({ flapHz: 5, flapAmp: 0.95, flapBias: 0.15, upFold: 0.3, bodyBob: 0.018, burstCycle: 1.4, burstFrac: 0.7, hopH: 0.045, hopHz: 3.2, flick: 0.7, flickGap: [1, 3], sweep: 0.1, sleepHeadY: 2.6, sleepTuck: 0.03 });
const OWL_ANIM = birdAnim({ flapHz: 2.0, flapAmp: 0.75, flapBias: 0.08, upFold: 0.15, bodyBob: 0.04, burstCycle: 3.2, burstFrac: 0.5, dihedral: 0.05, hopH: 0.03, hopHz: 2, flick: 0.15, lookYaw: 1.2, sweep: 0.1, sleepHeadY: 0.0, sleepHeadX: 0.25, foldDroop: 0.05, foldTuck: 0.06, foldScale: 0.62 });
const CHAMELEON_ANIM = lizardAnim({
  walkSpeed: 0.05, runSpeed: 0.12, stride: 0.09, undulate: 0.04, swing: 0.5, legAxis: 'x', hesitant: true, rock: 0.006, tailCurl: true, sleepDrop: 0.01, lookYaw: 0.25,
  colorShift: [new THREE.Color(1, 1, 1), new THREE.Color(1.25, 1.12, 0.55), new THREE.Color(0.78, 0.82, 0.62), new THREE.Color(1.1, 1.05, 0.8), new THREE.Color(0.95, 1.05, 0.95)],
});
const AGAMA_ANIM = lizardAnim({ walkSpeed: 0.35, runSpeed: 2.2, stride: 0.12, undulate: 0.22, swing: 0.7, headBob: true, bask: true, sleepDrop: 0.012, lookYaw: 0.5 });

// ---------------------------------------------------------------- export
export const ANIMALS = {
  honeybee: (o) => makeAnimal('honeybee', o, buildBee, insectAnim('bee')),
  butterfly: (o) => makeAnimal('butterfly', o, buildButterfly, insectAnim('butterfly')),
  harvesterant: (o) => makeHarvesterAnts(o),
  firefly: (o) => makeFireflies(o),
  jay: (o) => makeAnimal('jay', o, buildJay, JAY_ANIM),
  blackbird: (o) => makeAnimal('blackbird', o, buildBlackbird, BLACKBIRD_ANIM),
  chameleon: (o) => makeAnimal('chameleon', o, buildChameleon, CHAMELEON_ANIM, { perInstanceMaterial: true }),
  agama: (o) => makeAnimal('agama', o, buildAgama, AGAMA_ANIM),
  spinymouse: (o) => makeAnimal('spinymouse', o, buildSpinyMouse, MOUSE_ANIM),
  porcupine: (o) => makeAnimal('porcupine', o, buildPorcupine, PORCUPINE_ANIM),
  hedgehog: (o) => makeAnimal('hedgehog', o, buildHedgehog, HEDGEHOG_ANIM),
  hyrax: (o) => makeAnimal('hyrax', o, buildHyrax, HYRAX_ANIM),
  gazelle: (o) => makeAnimal('gazelle', o, buildGazelle, GAZELLE_ANIM),
  fox: (o) => makeAnimal('fox', o, buildFox, FOX_ANIM),
  owl: (o) => makeAnimal('owl', o, buildOwl, OWL_ANIM),
};
export default ANIMALS;

// Called by the zone pack when its zone closes: frees the cached geometry / materials (rebuilt on the next visit).
export function releaseCaches() {
  disposeDeep([SPECS, GEOMS, _glowTex]); SPECS.clear(); GEOMS.clear(); _glowTex = null;
  releaseMaterials('grove-animals:');
}
