// Grove animals: the shared toolkit (1.3.2: moved here from src/models/grove-animals.js unchanged).
// Colours and materials (K, MAT), geometry helpers (smooth normals, colorize, loft, tube, ell, stick, plate, mirrorX,
// eyes, earGeom), and the spec cache and assembly: getSpec (geometry per species + seed variant), finalize,
// instantiate, makeAnimal (the AnimalVisual of CONTRACT.md §4 around an animator).
// Exports the helpers above and TAU, V3, SPECS (cleared by releaseCaches in insects.js).
import * as THREE from 'three';
import { makeRng, hashString, clamp, cachedMaterial, mergeGeometries } from '../../core/util.js';

export const TAU = Math.PI * 2;
export const V3 = THREE.Vector3;

// ---------------------------------------------------------------- colours & materials
const _cc = new Map();
export const K = (hex) => { let c = _cc.get(hex); if (!c) { c = new THREE.Color(hex); _cc.set(hex, c); } return c; };
const _mix = new THREE.Color();
const mix = (a, b, t) => _mix.copy(K(a)).lerp(K(b), clamp(t));

export const MAT = {
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
// Ear: ellipsoid leaf, optionally pinched to a point; built at origin (base), then oriented.
export function earGeom({ w, h, d, pinch = 0, out = 0.4, back = 0.2, outer, inner, tip = null, tipFrom = 0.75, side = 1, rng }) {
  const g = new THREE.SphereGeometry(1, 10, 7); g.scale(w, h, d); g.translate(0, h * 0.9, 0);
  if (pinch) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const q = clamp(p.getY(i) / (h * 1.9)); p.setX(i, p.getX(i) * (1 - pinch * q * q)); p.setZ(i, p.getZ(i) * (1 - pinch * 0.5 * q * q)); } }
  const cg = colorize(g, (c, n) => (tip && c.y > h * 1.9 * tipFrom) ? tip : (n.z > 0.2 ? inner : outer), rng, 0.04);
  cg.rotateX(-back); cg.rotateZ(-side * out);
  return cg;
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
