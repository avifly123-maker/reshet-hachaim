// Amazon animals — procedural stylised low-poly models + procedural animation.
// Contract: CONTRACT.md §4.  export const ANIMALS = { id: (opts) => AnimalVisual | ColonyVisual }
//
// Extra (non-contract, optional) fields on every AnimalVisual:
//   actions : string[]            actions this species really animates (others fall back gracefully)
//   speeds  : { walk, run, fly }  natural speeds in m/s (gait frequency is derived from s.speed when given)
//   gripY   : { perch?, hang?, climb? } local y of the grip point (feet / hooks) for that pose – core can place
//             the object at branchY - gripY. Ground animals' hang/climb poses already have the grip at the origin.
// Pose conventions:
//   ground animals: origin = contact point. 'hang' → hanging upside-down under a branch running along Z at y=0.
//                   'climb' → body vertical, head up (+Y), belly toward +Z (the trunk surface is at the origin, +Z side).
//   flyers: origin = body centre (as contract).  perch → feet at gripY.perch.
import * as THREE from 'three';
import { makeRng, clamp, lerp, damp, smoothstep, mergeGeometries, cachedMaterial, isLowQuality, disposeDeep, releaseMaterials } from '../core/util.js';

const V3 = THREE.Vector3;
const TAU = Math.PI * 2;
const PI = Math.PI;

// ═══════════════════════════════════════════════════════════════════════════════════
// Geometry toolkit
// ═══════════════════════════════════════════════════════════════════════════════════
const _c = (x) => (x instanceof THREE.Color ? x : new THREE.Color(x));
const col = (hex) => new THREE.Color(hex);
const mixc = (a, b, t) => _c(a).clone().lerp(_c(b), clamp(t));

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}
// Densify ring list with Catmull-Rom interpolation of every numeric field (and p).
function smoothRings(rings, sub = 2) {
  if (sub <= 1) return rings;
  const n = rings.length, out = [];
  const g = (i) => rings[Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < n - 1; i++) {
    for (let k = 0; k < sub; k++) {
      const t = k / sub, a = g(i - 1), b = g(i), c = g(i + 1), d = g(i + 2);
      const r = {};
      for (const key of Object.keys(b)) {
        if (key === 'p') r.p = [0, 1, 2].map((j) => catmull(a.p[j], b.p[j], c.p[j], d.p[j], t));
        else if (typeof b[key] === 'number') {
          const v = catmull(a[key] ?? b[key], b[key], c[key] ?? b[key], d[key] ?? b[key], t);
          r[key] = key === 'rx' || key === 'ry' ? Math.max(0.0008, v) : v;
        }
      }
      out.push(r);
    }
  }
  out.push(rings[n - 1]);
  return out;
}

// Loft: tube through rings [{p:[x,y,z], rx, ry, sq?(superellipse n, 2=ellipse), fb?(bottom flatten), ft?(top flatten)}]
// opts: seg, up (frame reference), cap0/cap1 (bulge factor, false = open), jit (radial jitter), rng, flat
function loft(rings, o = {}) {
  // soft look: a bit rounder cross-sections on mid/large tubes
  const seg = (o.seg || 8) + ((o.seg || 8) >= 8 ? 2 : (o.seg || 8) >= 6 ? 1 : 0), up = new V3(...(o.up || [0, 1, 0]));
  const n = rings.length, P = rings.map((r) => new V3(...r.p));
  const pos = [], idx = [];
  const frames = [];
  for (let i = 0; i < n; i++) {
    const t = new V3().subVectors(P[Math.min(n - 1, i + 1)], P[Math.max(0, i - 1)]).normalize();
    let side = new V3().crossVectors(up, t);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize();
    const u = new V3().crossVectors(t, side).normalize();
    frames.push({ t, side, u });
  }
  const rng = o.rng, jit = (o.jit || 0) * 0.5;
  for (let i = 0; i < n; i++) {
    const r = rings[i], f = frames[i], ne = 2 / (r.sq || 2);
    for (let j = 0; j < seg; j++) {
      const a = (j / seg) * TAU + (o.rot || 0);
      let c = Math.cos(a), s = Math.sin(a);
      c = Math.sign(c) * Math.pow(Math.abs(c), ne); s = Math.sign(s) * Math.pow(Math.abs(s), ne);
      let ry = r.ry; if (s < 0 && r.fb) ry *= r.fb; if (s > 0 && r.ft) ry *= r.ft;
      const jr = jit && rng && i > 0 && i < n - 1 ? 1 + (rng() - 0.5) * jit : 1;
      const v = P[i].clone().addScaledVector(f.side, c * r.rx * jr).addScaledVector(f.u, s * ry * jr);
      pos.push(v.x, v.y, v.z);
    }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) {
    const a = i * seg + j, b = (i + 1) * seg + j, c = i * seg + ((j + 1) % seg), d = (i + 1) * seg + ((j + 1) % seg);
    idx.push(a, c, b, c, d, b);
  }
  if (o.cap0 !== false) {
    const k = pos.length / 3, r = rings[0], b = (o.cap0 ?? 0.5) * Math.min(r.rx, r.ry);
    const v = P[0].clone().addScaledVector(frames[0].t, -b); pos.push(v.x, v.y, v.z);
    for (let j = 0; j < seg; j++) idx.push(k, (j + 1) % seg, j);
  }
  if (o.cap1 !== false) {
    const k = pos.length / 3, r = rings[n - 1], b = (o.cap1 ?? 0.5) * Math.min(r.rx, r.ry), base = (n - 1) * seg;
    const v = P[n - 1].clone().addScaledVector(frames[n - 1].t, b); pos.push(v.x, v.y, v.z);
    for (let j = 0; j < seg; j++) idx.push(k, base + j, base + ((j + 1) % seg));
  }
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals(); g = g.toNonIndexed();   // always smooth-shaded (o.flat ignored – soft look)
  return g;
}
const L = (rings, o = {}) => loft(smoothRings(rings, o.sub ?? 2), o);

function ball(rx, ry, rz, w = 8, h = 6, p = [0, 0, 0]) {
  if (Math.max(rx, ry, rz) > 0.012) { w += 2; h += 1; }
  const g = new THREE.SphereGeometry(1, w, h).toNonIndexed();
  g.deleteAttribute('uv');
  g.scale(rx, ry, rz); g.translate(...p);
  // ellipsoid normals (scale() keeps the unit-sphere normals): n' ∝ n / r
  const n = g.attributes.normal;
  for (let i = 0; i < n.count; i++) {
    const x = n.getX(i) / rx, y = n.getY(i) / ry, z = n.getZ(i) / rz, l = Math.hypot(x, y, z) || 1;
    n.setXYZ(i, x / l, y / l, z / l);
  }
  return g;
}

function xf(g, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
  const m = new THREE.Matrix4().compose(new V3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new V3(...(Array.isArray(s) ? s : [s, s, s])));
  g.applyMatrix4(m);
  return g;
}

// Per-face colouring. fn(info) → Color. info = {x,y,z,nx,ny,nz,u,v,f}
const _info = { x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 0, u: 0, v: 0, f: 0 };
function paintFaces(g, fn, smooth = true) {
  if (smooth) return paintSmooth(g, fn);
  const p = g.attributes.position.array, nm = g.attributes.normal.array, uv = g.attributes.uv ? g.attributes.uv.array : null;
  const nf = p.length / 9, out = new Float32Array(p.length);
  for (let f = 0; f < nf; f++) {
    const o = f * 9;
    _info.x = (p[o] + p[o + 3] + p[o + 6]) / 3; _info.y = (p[o + 1] + p[o + 4] + p[o + 7]) / 3; _info.z = (p[o + 2] + p[o + 5] + p[o + 8]) / 3;
    let nx = nm[o] + nm[o + 3] + nm[o + 6], ny = nm[o + 1] + nm[o + 4] + nm[o + 7], nz = nm[o + 2] + nm[o + 5] + nm[o + 8];
    const l = Math.hypot(nx, ny, nz) || 1; _info.nx = nx / l; _info.ny = ny / l; _info.nz = nz / l;
    if (uv) { const q = f * 6; _info.u = (uv[q] + uv[q + 2] + uv[q + 4]) / 3; _info.v = (uv[q + 1] + uv[q + 3] + uv[q + 5]) / 3; }
    _info.f = f;
    const c = _c(fn(_info));
    for (let k = 0; k < 3; k++) { out[o + k * 3] = c.r; out[o + k * 3 + 1] = c.g; out[o + k * 3 + 2] = c.b; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(out, 3));
  return g;
}
const solid = (g, c) => paintFaces(g, () => c, false);
function paintSmooth(g, fn) {
  const p = g.attributes.position.array, nm = g.attributes.normal.array, uv = g.attributes.uv ? g.attributes.uv.array : null;
  const out = new Float32Array(p.length), cache = new Map();
  for (let k = 0; k < p.length; k += 3) {
    const key = Math.round(p[k] * 2e4) + ',' + Math.round(p[k + 1] * 2e4) + ',' + Math.round(p[k + 2] * 2e4);
    let c = cache.get(key);
    if (!c) {
      _info.x = p[k]; _info.y = p[k + 1]; _info.z = p[k + 2]; _info.nx = nm[k]; _info.ny = nm[k + 1]; _info.nz = nm[k + 2]; _info.f = k / 9 | 0;
      if (uv) { const q = (k / 3) * 2; _info.u = uv[q]; _info.v = uv[q + 1]; }
      c = _c(fn(_info)).clone(); cache.set(key, c);
    }
    out[k] = c.r; out[k + 1] = c.g; out[k + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(out, 3));
  return g;
}
// Per-vertex colouring (smooth blends → soft-edged spots instead of triangle-shaped ones)
function paintVerts(g, fn) {
  const p = g.attributes.position.array, nm = g.attributes.normal.array, out = new Float32Array(p.length);
  for (let k = 0; k < p.length; k += 3) {
    _info.x = p[k]; _info.y = p[k + 1]; _info.z = p[k + 2]; _info.nx = nm[k]; _info.ny = nm[k + 1]; _info.nz = nm[k + 2]; _info.f = k / 9 | 0;
    const c = _c(fn(_info)); out[k] = c.r; out[k + 1] = c.g; out[k + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(out, 3));
  return g;
}

// Plate (wings, tails, leaves): stations [{s, l, t, h?}] along span; chord from l (lead) to t (trail).
// map(s, c, h) → [x,y,z].  top(u,v)/bot(u,v) → Color (u = span frac 0..1, v = chord frac 0 lead..1 trail).
function plate(st, o) {
  const cs = o.cs || 2, th = o.thick ?? 0.01, n = st.length, camber = o.camber || 0;
  const smax = st[n - 1].s, smin = st[0].s;
  const build = (dh, flip) => {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i < n; i++) for (let j = 0; j <= cs; j++) {
      const v = j / cs, c = lerp(st[i].l, st[i].t, v), h = (st[i].h || 0) + camber * Math.sin(PI * v) * (1 - 0.5 * (st[i].s - smin) / (smax - smin || 1)) + dh;
      pos.push(...o.map(st[i].s, c, h)); uv.push((st[i].s - smin) / (smax - smin || 1), v);
    }
    const W = cs + 1;
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < cs; j++) {
      const a = i * W + j, b = (i + 1) * W + j, c = i * W + j + 1, d = (i + 1) * W + j + 1;
      idx.push(a, b, c, c, b, d);
    }
    let g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    // orientation: make normal point along +h (top) or -h (bottom)
    const P = (k) => new V3(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]);
    const nrm = new V3().subVectors(P(idx[1]), P(idx[0])).cross(new V3().subVectors(P(idx[2]), P(idx[0])));
    const hd = new V3(...o.map(st[0].s, st[0].l, 1)).sub(new V3(...o.map(st[0].s, st[0].l, 0)));
    const wrong = (nrm.dot(hd) < 0) !== flip;
    if (wrong) { for (let k = 0; k < idx.length; k += 3) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; } g.setIndex(idx); }
    g.computeVertexNormals();
    return g.toNonIndexed();
  };
  const top = paintFaces(build(0, false), (i) => o.top(i.u, i.v, i), !!o.smooth);
  if (o.single) return top;
  const bot = paintFaces(build(-th, true), (i) => (o.bot || o.top)(i.u, i.v, i), !!o.smooth);
  return mergeGeometries([top, bot]);
}
const mapWingR = (s, c, h) => [s, h, c];           // span +X, chord +Z (lead forward), h = up
const mapTail = (s, c, h) => [c, h, -s];           // span backward -Z, chord across X

function mirrorX(g) {
  const h = g.clone();
  for (const name of Object.keys(h.attributes)) {
    const a = h.attributes[name], arr = a.array, is = a.itemSize, cnt = a.count;
    if (name === 'position' || name === 'normal') for (let i = 0; i < cnt; i++) arr[i * is] *= -1;
    for (let t = 0; t < cnt; t += 3) for (let k = 0; k < is; k++) { const x = arr[(t + 1) * is + k]; arr[(t + 1) * is + k] = arr[(t + 2) * is + k]; arr[(t + 2) * is + k] = x; }
  }
  return h;
}

// Eye with iris, pupil and catch-light. out = outward direction.
function eye(r, p, out, iris = '#111', pupil = null) {
  const d = new V3(...out).normalize();
  r *= 1.18;
  const parts = [solid(ball(r, r, r, 8, 6, p), iris)];
  if (pupil) parts.push(solid(ball(r * 0.6, r * 0.6, r * 0.6, 7, 5, [p[0] + d.x * r * 0.5, p[1] + d.y * r * 0.5, p[2] + d.z * r * 0.5]), pupil));
  const hp = [p[0] + d.x * r * 0.78, p[1] + d.y * r * 0.78 + r * 0.36, p[2] + d.z * r * 0.78 + r * 0.25];
  parts.push(solid(ball(r * 0.3, r * 0.3, r * 0.3, 5, 3, hp), '#ffffff'));
  return mergeGeometries(parts);
}
const eyes = (r, p, iris, pupil, outz = 0.6) => [eye(r, p, [1, 0.15, outz], iris, pupil), eye(r, [-p[0], p[1], p[2]], [-1, 0.15, outz], iris, pupil)];

// deterministic 3D cell noise (Worley) – used for rosettes / spots
function hash3(i, j, k, s) {
  let h = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(k, 2147483647) + Math.imul(s, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function worley(x, y, z, sp, seed) {
  const X = x / sp, Y = y / sp, Z = z / sp, xi = Math.floor(X), yi = Math.floor(Y), zi = Math.floor(Z);
  let f1 = 9, f2 = 9, id = 0, cx = 0, cy = 0, cz = 0;
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
    const i = xi + a, j = yi + b, k = zi + c;
    const px = i + hash3(i, j, k, seed), py = j + hash3(i, j, k, seed + 17), pz = k + hash3(i, j, k, seed + 31);
    const d = Math.hypot(px - X, py - Y, pz - Z);
    if (d < f1) { f2 = f1; f1 = d; id = hash3(i, j, k, seed + 5); cx = px - X; cy = py - Y; cz = pz - Z; } else if (d < f2) f2 = d;
  }
  return { f1, f2, id, cx, cy, cz };
}
const jl = (c, rng, a = 0.05) => _c(c).clone().offsetHSL(0, 0, (rng() - 0.5) * a);

const tris = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;

// ═══════════════════════════════════════════════════════════════════════════════════
// Materials
// ═══════════════════════════════════════════════════════════════════════════════════
function mat(kind) {
  return cachedMaterial('amzA:' + kind, () => {
    const base = { vertexColors: true, metalness: 0 };
    switch (kind) {
      case 'matte': return new THREE.MeshStandardMaterial({ ...base, roughness: 0.85 });
      case 'fur': return new THREE.MeshStandardMaterial({ ...base, roughness: 0.95 });
      case 'satin': return new THREE.MeshStandardMaterial({ ...base, roughness: 0.55 });
      case 'gloss': return new THREE.MeshStandardMaterial({ ...base, roughness: 0.22 });
      case 'irid': return iridescent(new THREE.MeshStandardMaterial({ ...base, roughness: 0.35, metalness: 0.15 }), 'irid', false);
      case 'morpho': return iridescent(new THREE.MeshStandardMaterial({ ...base, roughness: 0.6 }), 'morpho', true);
      case 'blur': return new THREE.MeshStandardMaterial({ ...base, roughness: 0.3, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
      case 'membrane': return new THREE.MeshStandardMaterial({ ...base, roughness: 0.75, side: THREE.DoubleSide });
    }
    throw new Error('mat ' + kind);
  });
}
// View-dependent shimmer: saturated vertex colours glow toward a shifted hue at grazing angles.
// morpho: back faces become brown (underside of the wing), shimmer only on the top face.
function iridescent(m, key, morpho) {
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      {
        float fres = 1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0);
        vec3 bc = vColor.rgb;
        float sat = max(bc.r, max(bc.g, bc.b)) - min(bc.r, min(bc.g, bc.b));
        ${morpho
          ? `vec3 shiftc = mix(vec3(0.0, 0.12, 0.9), vec3(0.1, 0.7, 1.0), fres);
             totalEmissiveRadiance += clamp((bc.b - bc.r) * 1.5, 0.0, 1.0) * shiftc * (0.12 + 0.7 * fres * fres);`
          : `vec3 shiftc = mix(bc * 0.6, bc.gbr * 0.9 + vec3(0.0, 0.15, 0.1), fres);
             totalEmissiveRadiance += sat * shiftc * (0.15 + 0.9 * fres * fres);`}
      }`);
  };
  m.customProgramCacheKey = () => 'amzA-' + key;
  return m;
}

// ═══════════════════════════════════════════════════════════════════════════════════
// Rig assembly (parts cached per species+variant, meshes per instance)
// part = { name, geo (model space), pivot [x,y,z] (model space), parent?, mat, shadow? }
// ═══════════════════════════════════════════════════════════════════════════════════
// Soft countershading: slightly deeper back, lighter belly (skips near-black / white details like eyes).
function countershade(g) {
  const c = g.attributes.color, n = g.attributes.normal; if (!c || !n) return;
  for (let i = 0; i < c.count; i++) {
    let r = c.getX(i), gg = c.getY(i), b = c.getZ(i);
    const lum = 0.3 * r + 0.59 * gg + 0.11 * b;
    if (lum < 0.035 || lum > 0.9) continue;
    const ny = n.getY(i), k = smoothstep(0.035, 0.12, lum);
    if (ny > 0) { const f = 1 - 0.1 * ny * k; r *= f; gg *= f; b *= f; }
    else { const f = 0.16 * -ny * k; r += (1 - r) * f; gg += (1 - gg) * f; b += (0.92 - b) * f * 0.8; }
    c.setXYZ(i, r, gg, b);
  }
}
const _specCache = new Map();
function getSpec(key, build) {
  if (_specCache.has(key)) return _specCache.get(key);
  const spec = build();
  const byName = {};
  const box = new THREE.Box3(), tmp = new THREE.Box3();
  let tri = 0;
  for (const p of spec.parts) {
    byName[p.name] = p;
    if (!p.noShade && ['fur', 'matte', 'satin', 'gloss'].includes(p.mat || 'matte')) countershade(p.geo);
    p.geo.computeBoundingBox();
    tmp.copy(p.geo.boundingBox); box.union(tmp);
    p.geo.translate(-p.pivot[0], -p.pivot[1], -p.pivot[2]);
    p.geo.computeBoundingSphere();
    tri += tris(p.geo);
  }
  spec.byName = byName; spec.box = box; spec.tris = tri;
  _specCache.set(key, spec);
  return spec;
}
function assemble(spec, scale) {
  const object = new THREE.Group(), inner = new THREE.Group();
  inner.scale.setScalar(scale);
  object.add(inner);
  const nodes = {};
  for (const p of spec.parts) {
    const m = new THREE.Mesh(p.geo, mat(p.mat || 'matte'));
    m.castShadow = p.shadow !== false; m.receiveShadow = p.shadow !== false;
    const pp = p.parent ? spec.byName[p.parent].pivot : [0, 0, 0];
    m.position.set(p.pivot[0] - pp[0], p.pivot[1] - pp[1], p.pivot[2] - pp[2]);
    m.userData.base = m.position.clone();
    if (p.order) m.rotation.order = p.order;
    (p.parent ? nodes[p.parent] : inner).add(m);
    nodes[p.name] = m;
  }
  return { object, inner, nodes };
}

// pose state helper: damped scalar params
function poser() {
  const v = {};
  return (key, target, dt, lambda = 6) => (v[key] = v[key] === undefined ? target : damp(v[key], target, lambda, dt));
}
const wave = (t, a, b, c) => Math.sin(t * a) * 0.6 + Math.sin(t * b + 1.3) * 0.3 + Math.sin(t * c + 2.1) * 0.1;

function makeVisual(id, spec, opts, cfg, animate) {
  const seed = (opts && opts.seed) || 1;
  const rng = makeRng(seed * 7 + 3);
  const jitter = 1 + (rng() - 0.5) * 0.1;
  const s = cfg.scale * jitter;
  const { object, inner, nodes } = assemble(spec, s);
  object.name = 'amazon-' + id;
  const size = new V3(); spec.box.getSize(size);
  const st = { t: rng() * 100, ph: rng() * TAU, P: poser(), seed: rng() };
  const upd = animate(nodes, inner, st, s);
  // grip calibration (once per species/variant, in unscaled model units): pose, then measure feet / hooks
  if (cfg.calib && !spec.grip) {
    spec.grip = {};
    for (const [pose, names, side] of cfg.calib) {
      const t0 = st.t, ph0 = st.ph;
      for (let i = 0; i < 80; i++) { st.t += 0.05; upd(0.05, pose, 0, 0, {}); }
      object.updateMatrixWorld(true);
      if (side === 'point') {
        // names = [nodeName, modelSpacePoint]
        const n = spec.byName[names[0]], pt = new V3(...names[1]).sub(new V3(...n.pivot));
        nodes[names[0]].localToWorld(pt); object.worldToLocal(pt);
        spec.grip[pose] = pt.y / s;
      } else {
        // own geometry only (not children), exact vertices
        let ext = side === 'max' ? -1e9 : 1e9;
        const vtx = new V3(), inv = new THREE.Matrix4().copy(object.matrixWorld).invert();
        for (const n of names) {
          const m = nodes[n], pa = m.geometry.attributes.position, mm = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld);
          for (let i = 0; i < pa.count; i++) { vtx.fromBufferAttribute(pa, i).applyMatrix4(mm); ext = side === 'max' ? Math.max(ext, vtx.y) : Math.min(ext, vtx.y); }
        }
        spec.grip[pose] = ext / s - (cfg.calibOffset?.[pose] || 0);
      }
      st.t = t0; st.ph = ph0;
    }
  }
  const grip = {};
  for (const [k, v] of Object.entries(spec.grip || {})) grip[k] = +(v * s).toFixed(3);
  for (const [k, v] of Object.entries(cfg.gripY || {})) grip[k] = +(v * s).toFixed(3);
  return {
    type: 'animal', id, object,
    height: +(spec.box.max.y * s - Math.min(0, cfg.flyer ? spec.box.min.y * s : 0)).toFixed(3),
    length: +((cfg.lengthAxis === 'x' ? size.x : size.z) * s).toFixed(3),
    actions: cfg.actions, speeds: cfg.speeds, gripY: grip,
    triangles: spec.tris,
    update(dt, state = {}) {
      dt = Math.min(dt || 0, 0.1);
      st.t += dt;
      upd(dt, state.action || 'idle', state.speed ?? null, state.night || 0, state);
    },
    dispose() { if (object.parent) object.parent.remove(object); },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════════
// Quadruped animator (jaguar, tapir, capybara, agouti)
// ═══════════════════════════════════════════════════════════════════════════════════
const LEGS = ['fl', 'fr', 'hl', 'hr'];
const QUAD_DEF = { sleepDrop: 0, swimDrop: 0, sitDrop: 0, sleepRoll: 0, sleepLeg: [0, 0, 0, 0], walkAmp: 0.35, runAmp: 0.7, lift: 0.18, legLen: 0.5 };
function quadAnimator(cfg) {
  cfg = { ...QUAD_DEF, ...cfg };
  return (N, inner, st) => {
    const P = st.P;
    const body = N.body, head = N.head, tail = N.tail;
    const legs = LEGS.map((k) => N[k]);
    const map = cfg.map || {};
    return (dt, action, speed, night) => {
      let a = map[action] || action;
      if (!['idle', 'walk', 'run', 'eat', 'sleep', 'swim', 'sit'].includes(a)) a = 'idle';
      const moving = a === 'walk' || a === 'run' || a === 'swim';
      let sp = speed == null || speed <= 0.01 ? (a === 'run' ? cfg.runSpeed : a === 'swim' ? cfg.walkSpeed * 0.7 : cfg.walkSpeed) : speed;
      const runW = P('run', a === 'run' ? 1 : 0, dt, 4);
      const gw = P('gw', moving ? 1 : 0, dt, 5);
      const sl = P('sl', a === 'sleep' ? 1 : 0, dt, 2.2);
      const et = P('et', a === 'eat' ? 1 : 0, dt, 4);
      const sw = P('sw', a === 'swim' ? 1 : 0, dt, 3);
      const si = P('si', a === 'sit' ? 1 : 0, dt, 4);
      const amp = lerp(cfg.walkAmp, cfg.runAmp, runW) * (1 - sw * 0.2);
      let freq = sp / (4 * cfg.legLen * Math.sin(amp));
      freq = clamp(freq, 0.5, cfg.maxFreq || 4.5);
      if (sw > 0.5) freq = clamp(freq * 1.4, 1.2, 3);
      if (gw > 0.01) st.ph += dt * TAU * freq * clamp(gw * 1.5);
      const ph = st.ph, t = st.t;
      // legs
      const walkOff = cfg.walkOff || [0.25, 0.75, 0, 0.5];
      const runOff = cfg.runOff || [0, 0.12, 0.55, 0.67];
      for (let i = 0; i < 4; i++) {
        const leg = legs[i]; if (!leg) continue;
        const off = lerp(walkOff[i], runOff[i], runW) * TAU;
        const q = ph + off;
        const front = i < 2;
        let ang = gw * amp * Math.sin(q) * (front ? 1 : 1.05);
        const lift = gw * (cfg.lift || 0.18) * Math.max(0, -Math.cos(q));
        ang += sl * cfg.sleepLeg[i] + si * (cfg.sitLeg ? cfg.sitLeg[i] : 0);
        if (sw > 0.01) ang = lerp(ang, 0.5 + 0.7 * Math.sin(q), sw);
        leg.rotation.x = ang;
        leg.rotation.z = (i % 2 ? -1 : 1) * sl * (cfg.sleepSplay || 0);
        leg.scale.y = 1 - lift - sl * (cfg.sleepFold?.[i] ?? 0.3) - si * (cfg.sitFold?.[i] ?? 0) - sw * 0.1;
      }
      // body
      const bob = gw * (lerp(0.012, 0.035, runW) * Math.cos(2 * ph)) * cfg.legLen * 2;
      const breathe = Math.sin(t * (sl > 0.5 ? 1.4 : 2.2)) * 0.008;
      body.position.y = body.userData.base.y + bob - sl * cfg.sleepDrop - sw * cfg.swimDrop - si * (cfg.sitDrop || 0);
      body.rotation.x = runW * gw * 0.07 * Math.sin(ph + 0.6) - si * (cfg.sitPitch || 0) - sw * 0.06 - sl * (cfg.sleepPitch || 0);
      body.rotation.z = sl * (cfg.sleepRoll || 0) + gw * (1 - runW) * 0.025 * Math.sin(ph);
      body.scale.set(1 + breathe, 1 + breathe, 1);
      // head
      if (head) {
        const look = (1 - gw * 0.7) * (1 - sl) * (1 - et * 0.6);
        head.rotation.y = look * 0.55 * wave(t + st.seed * 10, 0.37, 0.71, 1.9) + sl * (cfg.sleepHeadYaw || 0);
        head.rotation.x = et * (cfg.eatPitch || 0.8) + Math.sin(t * 7) * 0.04 * et + sl * (cfg.sleepHeadPitch || 0.4) - sw * (cfg.swimHeadUp || 0.25) + si * (cfg.sitHeadPitch || 0)
          + gw * 0.04 * Math.sin(2 * ph) - look * 0.12 * Math.max(0, wave(t * 0.7, 0.23, 0.53, 1.1));
        head.rotation.z = look * 0.08 * Math.sin(t * 0.3 + 2);
      }
      if (tail) {
        tail.rotation.y = (1 - sl) * (0.22 * Math.sin(t * (cfg.tailRate || 1.3)) + gw * 0.15 * Math.sin(ph)) + sl * (cfg.sleepTailYaw || 0);
        tail.rotation.x = (cfg.tailLift || 0) * gw * runW + sl * (cfg.sleepTailPitch || 0) + 0.05 * Math.sin(t * 0.9) - sw * 0.3;
      }
      if (cfg.extra) cfg.extra(N, { t, ph, gw, sl, et, sw, si, runW, dt });
    };
  };
}

// ═══════════════════════════════════════════════════════════════════════════════════
// Bird animator (toucan, macaw, harpy, hummingbird)
// ═══════════════════════════════════════════════════════════════════════════════════
const BIRD_DEF = { hoverFreq: 20, hoverAmp: 0.3, hoverPitch: 0, hoverSweep: 0, flapBias: 0, glideDihedral: 0.08, foldSweep: 1.4, foldDroop: 0, foldRoll: 1.2, perchPitch: 0.4, foldOut: 0, flySpeed: 5 };
function birdAnimator(cfg) {
  cfg = { ...BIRD_DEF, ...cfg };
  return (N, inner, st) => {
    const P = st.P;
    const { body, head, wl, wr, tail, legs } = N;
    for (const w of [wl, wr]) w.rotation.order = 'YZX';
    let hopPh = 0;
    return (dt, action, speed, night) => {
      let a = action;
      if (a === 'run') a = 'fly';
      if (a === 'hover' && !cfg.hover) a = 'fly';
      if (a === 'hang' || a === 'climb') a = cfg.climb ? 'climb' : 'perch';
      if (a === 'swim') a = 'perch';
      if (!['idle', 'walk', 'fly', 'glide', 'hover', 'perch', 'climb', 'eat', 'sleep'].includes(a)) a = 'perch';
      if (a === 'idle') a = 'perch';
      const airborne = a === 'fly' || a === 'glide' || a === 'hover';
      const t = st.t;
      const fold = P('fold', airborne ? 0 : 1, dt, airborne ? 9 : 5);
      const fl = P('fl', a === 'fly' ? 1 : 0, dt, 5);
      const gl = P('gl', a === 'glide' ? 1 : 0, dt, 4);
      const hv = P('hv', a === 'hover' ? 1 : 0, dt, 6);
      const sl = P('sl', a === 'sleep' ? 1 : 0, dt, 2);
      const et = P('et', a === 'eat' ? 1 : 0, dt, 5);
      const wk = P('wk', a === 'walk' ? 1 : 0, dt, 5);
      const cl = P('cl', a === 'climb' ? 1 : 0, dt, 4);
      const freq = a === 'hover' ? cfg.hoverFreq : cfg.flapFreq * (speed ? clamp(0.8 + speed / (cfg.flySpeed * 4), 0.8, 1.4) : 1);
      st.ph += dt * TAU * (airborne ? freq : 1);
      const ph = st.ph;
      // flap: down-stroke faster (skewed sine)
      const sk = Math.sin(ph - 0.35 * Math.sin(ph));
      const flap = fl * (cfg.flapAmp * sk + cfg.flapBias) + gl * (cfg.glideDihedral + 0.04 * Math.sin(t * 1.3)) + hv * (cfg.hoverAmp * Math.sin(ph));
      const gr = 1 - fold;
      // wings: right (+X) and mirrored left
      const sweep = fold * cfg.foldSweep + hv * (cfg.hoverSweep || 0) * Math.sin(ph + 1.2);
      const droop = fold * cfg.foldDroop;
      const roll = fold * cfg.foldRoll + gr * (fl * 0.25 * Math.cos(ph) + hv * 0.5 * Math.cos(ph));
      wr.rotation.set(roll, sweep, flap + droop);
      wl.rotation.set(roll, -sweep, -(flap + droop));
      wr.position.x = wr.userData.base.x + fold * cfg.foldOut; wl.position.x = wl.userData.base.x - fold * cfg.foldOut;
      wr.position.y = wl.position.y = wr.userData.base.y + fold * (cfg.foldUp || 0);
      { const sx = (1 - fl * (cfg.wingStretch || 0) * Math.max(0, -sk)) * lerp(1, cfg.foldScale || 1, fold); wr.scale.x = wl.scale.x = sx; }
      // body attitude
      const bank = (fl + gl) * (cfg.bank ?? 0.22) * wave(t * 0.6 + st.seed * 5, 0.5, 1.1, 2.3);
      const pitch = fold * (-cfg.perchPitch) + fl * (cfg.flyPitch || 0) + hv * (-cfg.hoverPitch || 0) + sl * 0.15 + cl * -1.25;
      body.rotation.x = pitch + fl * 0.05 * Math.sin(ph + 1.5) + et * 0.25;
      body.rotation.z = bank;
      // hop on walk
      if (wk > 0.01) { hopPh += dt * TAU * 2.2; }
      const hop = wk * Math.abs(Math.sin(hopPh)) * 0.06 * cfg.size;
      body.position.y = body.userData.base.y + hop + fl * 0.04 * cfg.size * -sk + hv * 0.01 * Math.sin(t * 9);
      body.scale.setScalar(1 + sl * 0.06 + Math.sin(t * 2.6) * 0.008);
      // head
      if (head) {
        const look = fold * (1 - sl);
        const jerk = Math.floor(t * 1.3 + st.seed * 7);
        const ty = (hash3(jerk, 3, 1, 9) - 0.5) * 1.5 * look * (1 - et);
        const yawS = P('hy', ty, dt, 14);
        head.rotation.y = yawS + sl * 2.4;
        head.rotation.x = -pitch * 0.85 * (1 - sl) + et * (0.6 + 0.25 * Math.sin(t * 6)) + sl * 0.5 + gr * 0.1 - cl * 0.2;
        head.rotation.z = (fl + gl) * -bank * 0.6;
      }
      if (tail) {
        const flick = fold * (Math.max(0, Math.sin(t * 1.7 + st.seed * 3)) ** 12) * 0.35;
        tail.rotation.x = -flick + gr * (cfg.tailFly || 0) + fl * 0.06 * Math.sin(ph) + cl * 0.35 + fold * (cfg.tailPerch || 0);
        tail.scale.x = 1 + (gl + fl * 0.5) * 0.35 + hv * 0.4;
        tail.rotation.y = (fl + gl) * -bank * 0.5;
      }
      if (legs) legs.rotation.x = gr * 1.3;
      if (cfg.extra) cfg.extra(N, { t, ph, fold, fl, gl, hv, sl, et, wk, cl });
    };
  };
}

// ═══════════════════════════════════════════════════════════════════════════════════
// Species geometry
// ═══════════════════════════════════════════════════════════════════════════════════
const legRings = (top, pts, radii, opts = {}) => pts.map((p, i) => ({ p: [top[0] + p[0], top[1] + p[1], top[2] + p[2]], rx: radii[i][0], ry: radii[i][1] }));

// ─── JAGUAR ─────────────────────────────────────────────────────────────────────────
function jaguarSpec(v) {
  const rng = makeRng(101 + v);
  const gold = col(['#d9962e', '#cf8a28', '#dc9f3c'][v]), deep = col('#b8701c'), cream = col('#f3e4c2'), dark = col('#2a1a10'), inner = col('#a8641a');
  const seed = 11 + v * 7;
  // rosettes: soft dark ring (broken into 3–4 blotches) around a slightly darker centre; solid spots on legs/head
  const coat = (i, spot = 0.17, belly = 0.45, ringOnly = true) => {
    let c = gold.clone();
    c.lerp(deep, clamp((i.ny - 0.1) * 0.9) * 0.45);
    const bk = smoothstep(-belly + 0.05, -belly - 0.2, i.ny);
    c.lerp(cream, bk);
    const w = worley(i.x, i.y, i.z * 0.85, spot, seed);
    let ink = 0;
    if (ringOnly) {
      const ang = Math.atan2(w.cy, w.cx) + w.id * 6;
      const gap = smoothstep(0.35, 0.75, Math.sin(ang * 3 + w.id * 3));
      ink = smoothstep(0.1, 0.22, w.f1) * (1 - smoothstep(0.42, 0.52, w.f1)) * (1 - gap * 0.6);
      c.lerp(inner, smoothstep(0.22, 0.08, w.f1) * 0.7);
    } else ink = smoothstep(0.42, 0.28, w.f1);
    c.lerp(dark, ink * (1 - bk * 0.5));
    return c;
  };
  const bodyR = [
    { p: [0, 0.62, -0.8], rx: 0.07, ry: 0.08 },
    { p: [0, 0.62, -0.72], rx: 0.16, ry: 0.18 },
    { p: [0, 0.61, -0.55], rx: 0.2, ry: 0.22, fb: 0.9 },
    { p: [0, 0.59, -0.3], rx: 0.18, ry: 0.19, fb: 0.8 },
    { p: [0, 0.6, -0.05], rx: 0.19, ry: 0.21, fb: 0.9 },
    { p: [0, 0.62, 0.2], rx: 0.2, ry: 0.25 },
    { p: [0, 0.66, 0.42], rx: 0.18, ry: 0.23 },
    { p: [0, 0.73, 0.56], rx: 0.13, ry: 0.15 },
    { p: [0, 0.79, 0.64], rx: 0.1, ry: 0.11 },
  ];
  const body = paintVerts(L(bodyR, { seg: 13, sub: 3 }), (i) => coat(i, 0.21));
  // head
  const hp = [0, 0.82, 0.62];
  const headR = [
    { p: [0, 0.83, 0.6], rx: 0.1, ry: 0.11 },
    { p: [0, 0.85, 0.68], rx: 0.15, ry: 0.14 },
    { p: [0, 0.85, 0.78], rx: 0.14, ry: 0.13 },
    { p: [0, 0.82, 0.86], rx: 0.1, ry: 0.1, fb: 0.9 },
    { p: [0, 0.8, 0.92], rx: 0.075, ry: 0.075 },
    { p: [0, 0.79, 0.95], rx: 0.05, ry: 0.05 },
  ];
  const headG = paintVerts(L(headR, { seg: 11, sub: 2, cap1: 0.7 }), (i) => {
    if (i.ny < -0.45 || (i.z > 0.87 && i.ny < 0.05)) return cream;
    const w = worley(i.x, i.y, i.z, 0.06, seed + 3);
    return mixc(gold, dark, smoothstep(0.4, 0.26, w.f1) * smoothstep(0.92, 0.84, i.z));
  });
  const ear = (s) => paintFaces(xf(ball(0.055, 0.05, 0.025, 6, 4), [s * 0.1, 0.96, 0.66], [0.2, 0, s * -0.4]), (i) => (i.nz > 0.3 ? cream : dark));
  const nose = solid(ball(0.03, 0.022, 0.02, 6, 4, [0, 0.83, 0.96]), '#5a3530');
  const head = mergeGeometries([headG, ear(1), ear(-1), nose, ...eyes(0.022, [0.075, 0.875, 0.85], '#d9a520', '#0c0c0c', 0.9)]);
  head.translate(-hp[0], -hp[1], -hp[2]); head.scale(1.15, 1.15, 1.15); head.translate(hp[0], hp[1] + 0.02, hp[2]);
  // legs
  const legF = (s) => paintVerts(L(legRings([s * 0.13, 0.66, 0.4], [[0, 0, 0], [0, -0.18, 0.01], [0, -0.38, 0.02], [0, -0.56, 0.03], [0, -0.63, 0.07]],
    [[0.1, 0.12], [0.085, 0.09], [0.06, 0.062], [0.052, 0.055], [0.064, 0.04]]), { seg: 7, up: [0, 0, 1], sub: 2, cap1: 0.9 }), (i) => coat(i, 0.075, 0.9, false));
  const legH = (s) => paintVerts(L(legRings([s * 0.13, 0.64, -0.55], [[0, 0, 0], [0, -0.18, -0.05], [0, -0.38, -0.1], [0, -0.5, -0.03], [0, -0.6, 0.0], [0, -0.62, 0.05]],
    [[0.115, 0.15], [0.095, 0.11], [0.052, 0.065], [0.046, 0.05], [0.05, 0.05], [0.062, 0.04]]), { seg: 7, up: [0, 0, 1], sub: 2, cap1: 0.9 }), (i) => coat(i, 0.075, 0.9, false));
  // tail
  const tailR = [[0, 0.66, -0.72], [0, 0.6, -0.85], [0, 0.46, -1.0], [0, 0.34, -1.16], [0, 0.31, -1.32], [0, 0.36, -1.45], [0, 0.42, -1.5]]
    .map((p, i, a) => ({ p, rx: lerp(0.06, 0.035, i / (a.length - 1)), ry: lerp(0.06, 0.035, i / (a.length - 1)) }));
  const tail = paintFaces(L(tailR, { seg: 6, sub: 2, cap1: 0.8 }), (i) => {
    const k = (-i.z - 0.72) / 0.78;
    if (k > 0.9) return dark;
    if (k > 0.5) return Math.sin(k * 34) > 0.3 ? dark : (i.ny < -0.4 ? cream : gold);
    return coat(i, 0.08, 0.6, false);
  });
  return {
    parts: [
      { name: 'body', geo: body, pivot: [0, 0.62, -0.5] },
      { name: 'head', geo: head, pivot: hp, parent: 'body' },
      { name: 'fl', geo: legF(1), pivot: [0.13, 0.66, 0.4], parent: 'body' },
      { name: 'fr', geo: legF(-1), pivot: [-0.13, 0.66, 0.4], parent: 'body' },
      { name: 'hl', geo: legH(1), pivot: [0.13, 0.64, -0.55], parent: 'body' },
      { name: 'hr', geo: legH(-1), pivot: [-0.13, 0.64, -0.55], parent: 'body' },
      { name: 'tail', geo: tail, pivot: [0, 0.66, -0.74], parent: 'body' },
    ],
  };
}

// ─── TAPIR ──────────────────────────────────────────────────────────────────────────
function tapirSpec(v) {
  const rng = makeRng(201 + v);
  const fur = col(['#3a302c', '#33292a', '#41352f'][v]), belly = col('#4a3e38'), dark = col('#1e1a1a'), white = col('#e8e2d8');
  const furF = (i) => jl(i.ny < -0.55 ? belly : mixc(fur, dark, clamp(i.ny * 0.6)), rng, 0.05);
  const bodyR = [
    { p: [0, 0.84, -0.92], rx: 0.1, ry: 0.1 },
    { p: [0, 0.86, -0.85], rx: 0.27, ry: 0.3 },
    { p: [0, 0.85, -0.6], rx: 0.36, ry: 0.4, fb: 0.95 },
    { p: [0, 0.8, -0.25], rx: 0.37, ry: 0.39 },
    { p: [0, 0.76, 0.1], rx: 0.34, ry: 0.36 },
    { p: [0, 0.76, 0.38], rx: 0.27, ry: 0.32 },
    { p: [0, 0.82, 0.55], rx: 0.18, ry: 0.23 },
    { p: [0, 0.88, 0.62], rx: 0.15, ry: 0.18 },
  ];
  const tailStub = solid(xf(ball(0.05, 0.08, 0.04, 5, 4), [0, 0.86, -0.95], [0.4, 0, 0]), dark);
  const body = mergeGeometries([paintFaces(L(bodyR, { seg: 14, sub: 2 }), furF), tailStub]);
  const hp = [0, 0.9, 0.6];
  const headR = [
    { p: [0, 0.93, 0.56], rx: 0.15, ry: 0.19 },
    { p: [0, 0.94, 0.68], rx: 0.15, ry: 0.18 },
    { p: [0, 0.9, 0.82], rx: 0.12, ry: 0.15 },
    { p: [0, 0.84, 0.96], rx: 0.085, ry: 0.11 },
    { p: [0, 0.79, 1.06], rx: 0.06, ry: 0.07 },
    { p: [0, 0.74, 1.13], rx: 0.045, ry: 0.048 },
    { p: [0, 0.67, 1.17], rx: 0.04, ry: 0.04 },
  ];
  const headG = paintFaces(L(headR, { seg: 10, sub: 2, cap1: 0.6 }), (i) => (i.z > 1.12 ? col('#141010') : furF(i)));
  // mane ridge along the nape
  const mane = paintFaces(L([[0, 1.1, 0.55], [0, 1.12, 0.62], [0, 1.07, 0.72]].map((p, i) => ({ p, rx: 0.025, ry: [0.03, 0.05, 0.02][i] })), { seg: 5, sub: 2 }), () => dark);
  const ear = (s) => paintFaces(xf(ball(0.06, 0.075, 0.025, 7, 4), [s * 0.12, 1.1, 0.62], [0.3, s * 0.4, s * -0.5]), (i) => {
    const d = Math.hypot(i.x - s * 0.12, i.y - 1.1); return d > 0.055 ? white : (i.nz > 0.2 ? col('#5a4a44') : fur);
  });
  const lip = solid(ball(0.06, 0.035, 0.05, 6, 4, [0, 0.72, 1.06]), '#2a2222');
  const head = mergeGeometries([headG, mane, ear(1), ear(-1), lip, ...eyes(0.02, [0.11, 0.98, 0.78], '#1a1210', null, 0.5)]);
  const hoof = col('#5c524a');
  const leg = (x, y, z, back) => paintFaces(L(legRings([x, y, z], [[0, 0, 0], [0, -0.2, back ? -0.04 : 0.02], [0, -0.42, back ? -0.02 : 0.03], [0, -0.58, 0.02], [0, -0.66, 0.04]],
    [[0.13, 0.15], [0.1, 0.11], [0.075, 0.08], [0.07, 0.07], [0.075, 0.06]]), { seg: 8, up: [0, 0, 1], sub: 2, cap1: 0.6 }), (i) => (i.y < 0.06 ? hoof : jl(dark, rng, 0.05)));
  return {
    parts: [
      { name: 'body', geo: body, pivot: [0, 0.82, -0.55] },
      { name: 'head', geo: head, pivot: hp, parent: 'body' },
      { name: 'fl', geo: leg(0.2, 0.66, 0.35), pivot: [0.2, 0.66, 0.35], parent: 'body' },
      { name: 'fr', geo: leg(-0.2, 0.66, 0.35), pivot: [-0.2, 0.66, 0.35], parent: 'body' },
      { name: 'hl', geo: leg(0.21, 0.66, -0.6, true), pivot: [0.21, 0.66, -0.6], parent: 'body' },
      { name: 'hr', geo: leg(-0.21, 0.66, -0.6, true), pivot: [-0.21, 0.66, -0.6], parent: 'body' },
    ],
  };
}

// ─── CAPYBARA ───────────────────────────────────────────────────────────────────────
function capybaraSpec(v) {
  const rng = makeRng(301 + v);
  const fur = col(['#8a5c38', '#946540', '#7d5232'][v]), back = col('#6e4628'), belly = col('#b08458'), face = col('#5a3a24');
  const furF = (i) => jl(i.ny < -0.5 ? belly : mixc(fur, back, clamp(i.ny)), rng, 0.08);
  const bodyR = [
    { p: [0, 0.48, -0.6], rx: 0.08, ry: 0.08 },
    { p: [0, 0.5, -0.55], rx: 0.22, ry: 0.25 },
    { p: [0, 0.5, -0.38], rx: 0.3, ry: 0.32, fb: 0.85 },
    { p: [0, 0.47, -0.1], rx: 0.31, ry: 0.31, fb: 0.85 },
    { p: [0, 0.46, 0.16], rx: 0.27, ry: 0.28 },
    { p: [0, 0.5, 0.33], rx: 0.19, ry: 0.22 },
    { p: [0, 0.55, 0.42], rx: 0.15, ry: 0.17 },
  ];
  const body = paintFaces(L(bodyR, { seg: 12, sub: 2, flat: true, jit: 0.06, rng }), furF);
  const hp = [0, 0.58, 0.4];
  const headR = [
    { p: [0, 0.6, 0.36], rx: 0.13, ry: 0.15, sq: 2.6 },
    { p: [0, 0.64, 0.46], rx: 0.14, ry: 0.16, sq: 3 },
    { p: [0, 0.62, 0.6], rx: 0.13, ry: 0.15, sq: 3.2 },
    { p: [0, 0.58, 0.72], rx: 0.115, ry: 0.13, sq: 3.2, fb: 0.9 },
    { p: [0, 0.56, 0.79], rx: 0.1, ry: 0.11, sq: 3 },
  ];
  const headG = paintFaces(L(headR, { seg: 10, sub: 2, cap1: 0.35, flat: true }), (i) => (i.z > 0.78 && i.nz > 0.6 ? col('#2b1c12') : jl(i.z > 0.6 ? face : fur, rng, 0.06)));
  const ear = (s) => solid(xf(ball(0.035, 0.04, 0.02, 6, 4), [s * 0.09, 0.79, 0.44], [0, 0, s * -0.3]), '#4a2e1c');
  const head = mergeGeometries([headG, ear(1), ear(-1), ...eyes(0.022, [0.105, 0.72, 0.55], '#100a06', null, 0.4)]);
  const leg = (x, y, z, rad) => paintFaces(L(legRings([x, y, z], [[0, 0, 0], [0, -0.16, 0.0], [0, -0.32, 0.02], [0, -0.38, 0.06]],
    [[rad, rad * 1.2], [rad * 0.7, rad * 0.75], [rad * 0.5, rad * 0.5], [rad * 0.55, rad * 0.35]]), { seg: 7, up: [0, 0, 1], sub: 2, cap1: 0.6 }), (i) => jl(i.y < 0.05 ? col('#3b2a1e') : back, rng, 0.06));
  return {
    parts: [
      { name: 'body', geo: body, pivot: [0, 0.48, -0.35], mat: 'fur' },
      { name: 'head', geo: head, pivot: hp, parent: 'body', mat: 'fur' },
      { name: 'fl', geo: leg(0.15, 0.36, 0.26, 0.08), pivot: [0.15, 0.36, 0.26], parent: 'body', mat: 'fur' },
      { name: 'fr', geo: leg(-0.15, 0.36, 0.26, 0.08), pivot: [-0.15, 0.36, 0.26], parent: 'body', mat: 'fur' },
      { name: 'hl', geo: leg(0.19, 0.36, -0.38, 0.1), pivot: [0.19, 0.36, -0.38], parent: 'body', mat: 'fur' },
      { name: 'hr', geo: leg(-0.19, 0.36, -0.38, 0.1), pivot: [-0.19, 0.36, -0.38], parent: 'body', mat: 'fur' },
    ],
  };
}

// ─── AGOUTI ─────────────────────────────────────────────────────────────────────────
function agoutiSpec(v) {
  const rng = makeRng(401 + v);
  const fur = col(['#c0702a', '#c97a30', '#b46628'][v]), rump = col('#e09a40'), back = col('#6e3c1a'), belly = col('#e0bc88');
  const furF = (i) => {
    let c = mixc(fur, back, clamp(i.ny * 0.8));
    if (i.z < -0.1 && i.ny > -0.3) c.lerp(rump, 0.55);
    if (i.ny < -0.55) c = belly.clone();
    return jl(c, rng, 0.1);
  };
  const bodyR = [
    { p: [0, 0.34, -0.31], rx: 0.05, ry: 0.05 },
    { p: [0, 0.36, -0.27], rx: 0.11, ry: 0.12 },
    { p: [0, 0.37, -0.16], rx: 0.125, ry: 0.135, fb: 0.9 },
    { p: [0, 0.34, -0.03], rx: 0.095, ry: 0.105, fb: 0.85 },
    { p: [0, 0.31, 0.07], rx: 0.07, ry: 0.08 },
    { p: [0, 0.31, 0.13], rx: 0.05, ry: 0.058 },
  ];
  const body = paintFaces(L(bodyR, { seg: 10, sub: 2, flat: true, jit: 0.06, rng }), furF);
  const hp = [0, 0.32, 0.13];
  const headR = [
    { p: [0, 0.33, 0.11], rx: 0.048, ry: 0.052 },
    { p: [0, 0.345, 0.17], rx: 0.056, ry: 0.058 },
    { p: [0, 0.33, 0.235], rx: 0.04, ry: 0.042 },
    { p: [0, 0.31, 0.285], rx: 0.022, ry: 0.025 },
  ];
  const headG = paintFaces(L(headR, { seg: 9, sub: 2, cap1: 0.8, flat: true }), (i) => (i.z > 0.285 ? col('#2a1a12') : jl(mixc(fur, back, 0.35), rng, 0.06)));
  const ear = (s) => solid(xf(ball(0.022, 0.03, 0.009, 6, 4), [s * 0.035, 0.395, 0.15], [-0.2, s * 0.3, s * -0.3]), '#4a2a14');
  const head = mergeGeometries([headG, ear(1), ear(-1), ...eyes(0.013, [0.043, 0.355, 0.2], '#0a0606', null, 0.6)]);
  const leg = (x, y, z, hind) => paintFaces(L(legRings([x, y, z], hind
    ? [[0, 0, 0], [0, -0.12, -0.05], [0, -0.24, -0.06], [0, -0.33, -0.01], [0, -0.35, 0.04]]
    : [[0, 0, 0], [0, -0.1, 0.0], [0, -0.2, 0.0], [0, -0.28, 0.01], [0, -0.29, 0.035]],
  hind ? [[0.055, 0.075], [0.04, 0.045], [0.016, 0.018], [0.013, 0.013], [0.016, 0.01]] : [[0.03, 0.035], [0.02, 0.02], [0.013, 0.013], [0.012, 0.012], [0.014, 0.009]]),
  { seg: 6, up: [0, 0, 1], sub: 2, cap1: 0.6 }), (i) => jl(i.y < 0.2 ? col('#3a2212') : fur, rng, 0.08));
  return {
    parts: [
      { name: 'body', geo: body, pivot: [0, 0.34, -0.17], mat: 'fur' },
      { name: 'head', geo: head, pivot: hp, parent: 'body', mat: 'fur' },
      { name: 'fl', geo: leg(0.045, 0.29, 0.06), pivot: [0.045, 0.29, 0.06], parent: 'body', mat: 'fur' },
      { name: 'fr', geo: leg(-0.045, 0.29, 0.06), pivot: [-0.045, 0.29, 0.06], parent: 'body', mat: 'fur' },
      { name: 'hl', geo: leg(0.08, 0.35, -0.18, true), pivot: [0.08, 0.35, -0.18], parent: 'body', mat: 'fur' },
      { name: 'hr', geo: leg(-0.08, 0.35, -0.18, true), pivot: [-0.08, 0.35, -0.18], parent: 'body', mat: 'fur' },
    ],
  };
}

// ─── SLOTH (brown-throated three-toed) ──────────────────────────────────────────────
function slothSpec(v) {
  const rng = makeRng(501 + v);
  const fur = col(['#8a7a62', '#7d6f5a', '#8f8068'][v]), dark = col('#5a4c3c'), algae = col('#7d8a5e'), face = col('#e2d6bc'), mask = col('#2a1d14'), claw = col('#d8c8a2');
  const furF = (i) => { let c = mixc(fur, dark, clamp(-i.ny * 0.5)); if (i.ny > 0.5 && worley(i.x, i.y, i.z, 0.08, 7).f1 < 0.4) c.lerp(algae, 0.45); return jl(c, rng, 0.14); };
  const bodyR = [
    { p: [0, 0.42, -0.32], rx: 0.07, ry: 0.07 },
    { p: [0, 0.43, -0.27], rx: 0.15, ry: 0.15 },
    { p: [0, 0.44, -0.12], rx: 0.18, ry: 0.18 },
    { p: [0, 0.45, 0.05], rx: 0.17, ry: 0.17 },
    { p: [0, 0.46, 0.17], rx: 0.13, ry: 0.13 },
    { p: [0, 0.47, 0.24], rx: 0.09, ry: 0.09 },
  ];
  const body = paintFaces(L(bodyR, { seg: 11, sub: 2, flat: true, jit: 0.3, rng }), furF);
  const hp = [0, 0.48, 0.24];
  const skull = paintFaces(L([
    { p: [0, 0.49, 0.2], rx: 0.08, ry: 0.08 },
    { p: [0, 0.5, 0.26], rx: 0.105, ry: 0.1 },
    { p: [0, 0.49, 0.33], rx: 0.095, ry: 0.09 },
    { p: [0, 0.48, 0.37], rx: 0.07, ry: 0.065 },
  ], { seg: 11, sub: 2, cap1: 0.5, flat: true, jit: 0.12, rng }), (i) => {
    if (i.nz > 0.35) {
      const dx = Math.abs(i.x), stripe = Math.abs((i.y - 0.495) + (dx - 0.04) * 0.25) < 0.017 && dx > 0.02;
      return stripe ? mask : jl(face, rng, 0.04);
    }
    return furF(i);
  });
  const nose = solid(ball(0.022, 0.016, 0.014, 6, 4, [0, 0.475, 0.385]), '#1e1510');
  const smile = solid(xf(new THREE.TorusGeometry(0.022, 0.004, 3, 8, PI).toNonIndexed(), [0, 0.462, 0.378], [0, 0, PI]), '#3a2a20');
  smile.deleteAttribute('uv');
  const head = mergeGeometries([skull, nose, smile, ...eyes(0.013, [0.042, 0.5, 0.36], '#0a0604', null, 1.2)]);
  const limb = (x, y, z, len, r) => {
    const arm = paintFaces(L(legRings([x, y, z], [[0, 0, 0], [0, -len * 0.45, 0.01], [0, -len * 0.85, 0.0], [0, -len, 0.0]],
      [[r, r], [r * 0.85, r * 0.8], [r * 0.7, r * 0.65], [r * 0.6, r * 0.55]]), { seg: 7, up: [0, 0, 1], sub: 2, flat: true, jit: 0.3, rng }), furF);
    const claws = [];
    for (let k = -1; k <= 1; k++) {
      const cx = x + k * r * 0.45;
      claws.push(solid(L([[0, 0, 0], [0, -0.05, 0.015], [0, -0.085, 0.045], [0, -0.095, 0.08]].map((p, i) => ({ p: [cx + p[0], y - len + p[1] + 0.02, z + p[2]], rx: [0.012, 0.01, 0.007, 0.002][i], ry: [0.012, 0.01, 0.007, 0.002][i] })), { seg: 4, up: [0, 0, 1], sub: 1 }), claw));
    }
    return mergeGeometries([arm, ...claws]);
  };
  return {
    parts: [
      { name: 'body', geo: body, pivot: [0, 0.44, -0.05], mat: 'fur' },
      { name: 'head', geo: head, pivot: hp, parent: 'body', mat: 'fur' },
      { name: 'fl', geo: limb(0.14, 0.49, 0.14, 0.44, 0.055), pivot: [0.14, 0.49, 0.14], parent: 'body', mat: 'fur' },
      { name: 'fr', geo: limb(-0.14, 0.49, 0.14, 0.44, 0.055), pivot: [-0.14, 0.49, 0.14], parent: 'body', mat: 'fur' },
      { name: 'hl', geo: limb(0.13, 0.45, -0.22, 0.36, 0.06), pivot: [0.13, 0.45, -0.22], parent: 'body', mat: 'fur' },
      { name: 'hr', geo: limb(-0.13, 0.45, -0.22, 0.36, 0.06), pivot: [-0.13, 0.45, -0.22], parent: 'body', mat: 'fur' },
    ],
  };
}

// ─── HOWLER MONKEY (red howler; black variant) ──────────────────────────────────────
function howlerSpec(v) {
  const rng = makeRng(601 + v);
  const black = v === 2;
  const fur = col(black ? '#1d1714' : '#9a3e1a'), back = col(black ? '#2a1e18' : '#c06024'), limbC = col(black ? '#16110e' : '#6a2812'),
    face = col('#1a1210'), beard = col(black ? '#120d0b' : '#5a2210'), hand = col(black ? '#8a3a18' : '#3a1a10');
  const furF = (i) => jl(mixc(fur, back, clamp(i.ny * 1.2)), rng, 0.1);
  const bodyR = [
    { p: [0, 0.42, -0.24], rx: 0.07, ry: 0.07 },
    { p: [0, 0.43, -0.2], rx: 0.12, ry: 0.12 },
    { p: [0, 0.44, -0.06], rx: 0.13, ry: 0.13 },
    { p: [0, 0.46, 0.08], rx: 0.14, ry: 0.15 },
    { p: [0, 0.49, 0.18], rx: 0.12, ry: 0.12 },
    { p: [0, 0.52, 0.23], rx: 0.07, ry: 0.08 },
  ];
  const body = paintFaces(L(bodyR, { seg: 10, sub: 2, flat: true, jit: 0.15, rng }), furF);
  const hp = [0, 0.54, 0.23];
  const skull = paintFaces(L([
    { p: [0, 0.56, 0.2], rx: 0.07, ry: 0.07 },
    { p: [0, 0.58, 0.26], rx: 0.085, ry: 0.085 },
    { p: [0, 0.56, 0.31], rx: 0.075, ry: 0.08 },
    { p: [0, 0.53, 0.35], rx: 0.05, ry: 0.06 },
  ], { seg: 10, sub: 2, cap1: 0.6, flat: true, jit: 0.1, rng }), (i) => (i.nz > 0.45 && i.y < 0.6 ? jl(face, rng, 0.04) : furF(i)));
  const jaw = paintFaces(L([{ p: [0, 0.5, 0.24], rx: 0.06, ry: 0.05 }, { p: [0, 0.47, 0.29], rx: 0.065, ry: 0.065 }, { p: [0, 0.48, 0.33], rx: 0.045, ry: 0.04 }], { seg: 8, sub: 2, flat: true, jit: 0.2, rng }), () => jl(beard, rng, 0.08));
  const head = mergeGeometries([skull, jaw, ...eyes(0.014, [0.032, 0.575, 0.335], '#3a1a08', '#050302', 1.4)]);
  const limb = (x, y, z, len, r) => paintFaces(L(legRings([x, y, z], [[0, 0, 0], [0, -len * 0.5, 0.02], [0, -len * 0.92, 0.0], [0, -len, 0.025]],
    [[r, r], [r * 0.75, r * 0.75], [r * 0.6, r * 0.6], [r * 0.65, r * 0.4]]), { seg: 6, up: [0, 0, 1], sub: 2, flat: true, jit: 0.15, rng, cap1: 0.8 }), (i) => (i.y < y - len * 0.85 ? hand : jl(limbC, rng, 0.08)));
  const tailR = [[0, 0.44, -0.22], [0, 0.4, -0.36], [0, 0.32, -0.5], [0, 0.22, -0.6], [0, 0.12, -0.62], [0, 0.07, -0.56], [0, 0.1, -0.5]]
    .map((p, i, a) => ({ p, rx: lerp(0.04, 0.018, i / (a.length - 1)), ry: lerp(0.04, 0.018, i / (a.length - 1)) }));
  const tail = paintFaces(L(tailR, { seg: 6, sub: 2, flat: true }), (i) => jl(limbC, rng, 0.08));
  return {
    parts: [
      { name: 'body', geo: body, pivot: [0, 0.43, -0.16], mat: 'fur' },
      { name: 'head', geo: head, pivot: hp, parent: 'body', mat: 'fur' },
      { name: 'fl', geo: limb(0.11, 0.5, 0.15, 0.48, 0.04), pivot: [0.11, 0.5, 0.15], parent: 'body', mat: 'fur' },
      { name: 'fr', geo: limb(-0.11, 0.5, 0.15, 0.48, 0.04), pivot: [-0.11, 0.5, 0.15], parent: 'body', mat: 'fur' },
      { name: 'hl', geo: limb(0.1, 0.45, -0.17, 0.44, 0.05), pivot: [0.1, 0.45, -0.17], parent: 'body', mat: 'fur' },
      { name: 'hr', geo: limb(-0.1, 0.45, -0.17, 0.44, 0.05), pivot: [-0.1, 0.45, -0.17], parent: 'body', mat: 'fur' },
      { name: 'tail', geo: tail, pivot: [0, 0.44, -0.22], parent: 'body', mat: 'fur' },
    ],
  };
}

// ─── Bird helpers ───────────────────────────────────────────────────────────────────
function birdLegs(x, top, len, zf, colr, toe = 0.04, r = 0.012, talon = null) {
  const parts = [];
  for (const s of [1, -1]) {
    parts.push(solid(L([{ p: [s * x, top, zf], rx: r, ry: r }, { p: [s * x, top - len, zf + 0.005], rx: r * 0.8, ry: r * 0.8 }], { seg: 5, up: [0, 0, 1], sub: 1 }), colr));
    for (const [dx, dz] of [[0.3, 1], [-0.3, 1], [0.15, -1], [-0.15, -1]]) {
      const ex = s * x + dx * toe, ez = zf + dz * toe;
      parts.push(solid(L([{ p: [s * x, top - len, zf], rx: r * 0.6, ry: r * 0.6 }, { p: [ex, top - len - r * 0.3, ez], rx: r * 0.45, ry: r * 0.45 }], { seg: 4, sub: 1, cap0: false }), colr));
      if (talon) parts.push(solid(L([{ p: [ex, top - len - r * 0.3, ez], rx: r * 0.4, ry: r * 0.4 }, { p: [ex + dx * toe * 0.2, top - len - r * 1.6, ez + dz * toe * 0.3], rx: r * 0.05, ry: r * 0.05 }], { seg: 4, sub: 1, cap0: false, cap1: false }), talon));
    }
  }
  return mergeGeometries(parts);
}

// ─── TOUCAN (toco-style) ────────────────────────────────────────────────────────────
function toucanSpec(v) {
  const rng = makeRng(701 + v);
  const black = col('#121214'), throat = col(['#fff4c8', '#fff0b0', '#ffffff'][v]), red = col('#e0242a'), blue = col('#2f9ee8');
  const bodyR = [
    { p: [0, -0.02, -0.17], rx: 0.04, ry: 0.04 },
    { p: [0, -0.01, -0.13], rx: 0.085, ry: 0.09 },
    { p: [0, 0.0, -0.03], rx: 0.1, ry: 0.115 },
    { p: [0, 0.02, 0.06], rx: 0.095, ry: 0.11 },
    { p: [0, 0.06, 0.12], rx: 0.07, ry: 0.08 },
    { p: [0, 0.09, 0.15], rx: 0.055, ry: 0.06 },
  ];
  const bodyG = paintFaces(L(bodyR, { seg: 10, sub: 2 }), (i) => {
    if (i.z > 0.03 && i.ny < 0.35 && i.nz > 0.1) return i.y < -0.02 && i.z < 0.08 ? red : jl(throat, rng, 0.02);
    if (i.z < -0.1 && i.ny < -0.3) return red;
    return jl(black, rng, 0.03);
  });
  const legs = birdLegs(0.04, -0.09, 0.05, 0.0, '#5a78a8', 0.025, 0.009);
  const body = mergeGeometries([bodyG, legs]);
  const hp = [0, 0.1, 0.14];
  const skull = paintFaces(ball(0.065, 0.07, 0.072, 9, 7, [0, 0.12, 0.17]), (i) => (i.z > 0.17 && i.ny < -0.1 ? throat : black));
  const beakR = [
    { p: [0, 0.12, 0.21], rx: 0.04, ry: 0.065 },
    { p: [0, 0.115, 0.28], rx: 0.036, ry: 0.06 },
    { p: [0, 0.105, 0.36], rx: 0.028, ry: 0.047 },
    { p: [0, 0.085, 0.43], rx: 0.018, ry: 0.03 },
    { p: [0, 0.06, 0.475], rx: 0.006, ry: 0.012 },
  ];
  const beak = paintFaces(L(beakR, { seg: 10, sub: 3, cap1: 0.4 }), (i) => {
    const k = (i.z - 0.21) / 0.27;
    if (k > 0.82) return col('#141414');
    let c = mixc('#ffcf2a', '#ff7a14', smoothstep(0.1, 0.7, k));
    if (i.ny > 0.75 && k < 0.8) c = mixc(c, '#ffe066', 0.4);
    if (Math.abs(i.y - (0.115 - k * 0.03)) < 0.006 && Math.abs(i.nx) > 0.6) c = col('#b03010');
    return c;
  });
  const eyeRing = paintFaces(ball(0.022, 0.022, 0.012, 8, 5), () => blue);
  const ringL = xf(eyeRing.clone(), [0.06, 0.135, 0.19], [0, 0.5, 0]), ringR = xf(eyeRing.clone(), [-0.06, 0.135, 0.19], [0, -0.5, 0]);
  const head = mergeGeometries([skull, beak, ringL, ringR, ...eyes(0.012, [0.066, 0.137, 0.195], '#0a0a0a', null, 0.3)]);
  const wingR = plate([
    { s: 0, l: 0.07, t: -0.08 }, { s: 0.08, l: 0.08, t: -0.12 }, { s: 0.16, l: 0.07, t: -0.13 }, { s: 0.23, l: 0.04, t: -0.1 }, { s: 0.27, l: 0.0, t: -0.05 },
  ], { map: mapWingR, cs: 2, thick: 0.012, camber: 0.012, top: (u, v) => jl(mixc('#16161a', '#24201c', v), rng, 0.04), bot: () => col('#1a1a1a') });
  const tail = plate([{ s: 0, l: 0.035, t: -0.035 }, { s: 0.15, l: 0.05, t: -0.05 }, { s: 0.26, l: 0.045, t: -0.045, h: -0.01 }],
    { map: mapTail, cs: 2, thick: 0.012, top: () => jl(black, rng, 0.03), bot: () => black });
  return {
    parts: [
      { name: 'body', geo: body, pivot: [0, 0, 0] },
      { name: 'head', geo: head, pivot: hp, parent: 'body', mat: 'satin' },
      { name: 'wr', geo: xf(wingR, [0.07, 0.04, 0.04]), pivot: [0.07, 0.04, 0.04], parent: 'body' },
      { name: 'wl', geo: xf(mirrorX(wingR), [-0.07, 0.04, 0.04]), pivot: [-0.07, 0.04, 0.04], parent: 'body' },
      { name: 'tail', geo: xf(tail, [0, 0.0, -0.14]), pivot: [0, 0.0, -0.14], parent: 'body' },
    ],
    foot: [0, -0.143, 0],
  };
}

// ─── SCARLET MACAW ──────────────────────────────────────────────────────────────────
function macawSpec(v) {
  const rng = makeRng(801 + v);
  const red = col(['#d81e1e', '#e0261c', '#cf1a22'][v]), yellow = col('#ffcc1a'), green = col('#3aa040'), blue = col('#1f5fd0'), dblue = col('#183f9a'), face = col('#f6f1ea');
  const bodyR = [
    { p: [0, -0.04, -0.17], rx: 0.04, ry: 0.04 },
    { p: [0, -0.03, -0.13], rx: 0.08, ry: 0.085 },
    { p: [0, 0.0, -0.03], rx: 0.095, ry: 0.11 },
    { p: [0, 0.03, 0.06], rx: 0.09, ry: 0.105 },
    { p: [0, 0.07, 0.12], rx: 0.07, ry: 0.075 },
    { p: [0, 0.1, 0.15], rx: 0.06, ry: 0.06 },
  ];
  const bodyG = paintFaces(L(bodyR, { seg: 10, sub: 2 }), (i) => (i.z < -0.08 && i.ny > 0.3 ? mixc(red, blue, 0.6) : jl(red, rng, 0.05)));
  const body = mergeGeometries([bodyG, birdLegs(0.035, -0.09, 0.04, 0.0, '#4a4a50', 0.025, 0.009)]);
  const hp = [0, 0.11, 0.14];
  const skull = paintFaces(ball(0.075, 0.075, 0.08, 9, 7, [0, 0.14, 0.18]), (i) => (i.z > 0.19 && Math.abs(i.nx) > 0.35 && i.y < 0.165 && i.y > 0.09 ? face : jl(red, rng, 0.04)));
  const upper = solid(L([
    { p: [0, 0.155, 0.235], rx: 0.03, ry: 0.035 }, { p: [0, 0.15, 0.275], rx: 0.026, ry: 0.032 }, { p: [0, 0.12, 0.3], rx: 0.018, ry: 0.025 },
    { p: [0, 0.085, 0.3], rx: 0.009, ry: 0.012 }, { p: [0, 0.07, 0.285], rx: 0.003, ry: 0.004 },
  ], { seg: 8, sub: 2, up: [0, 0, 1] }), '#ece2cf');
  const lower = solid(ball(0.024, 0.022, 0.025, 7, 5, [0, 0.095, 0.25]), '#1a1a1a');
  const head = mergeGeometries([skull, upper, lower, ...eyes(0.011, [0.06, 0.15, 0.215], '#e8d070', '#0a0a0a', 0.6)]);
  const wingTop = (u, v) => {
    let c;
    if (v > 0.5 || u > 0.72) c = mixc(blue, dblue, (v - 0.5) * 1.5 + (u > 0.72 ? 0.3 : 0));
    else if (v > 0.25) c = v > 0.42 ? green : yellow;
    else c = red;
    return jl(c, rng, 0.04);
  };
  const wingR = plate([
    { s: 0, l: 0.06, t: -0.1 }, { s: 0.1, l: 0.07, t: -0.15 }, { s: 0.2, l: 0.06, t: -0.15 }, { s: 0.28, l: 0.035, t: -0.12 }, { s: 0.34, l: 0.0, t: -0.07 }, { s: 0.36, l: -0.03, t: -0.04 },
  ], { map: mapWingR, cs: 4, thick: 0.012, camber: 0.012, top: wingTop, bot: (u, v) => (v > 0.45 ? col('#b8902a') : col('#a8261e')) });
  const tail = plate([{ s: 0, l: 0.04, t: -0.04 }, { s: 0.15, l: 0.04, t: -0.04 }, { s: 0.35, l: 0.025, t: -0.025, h: -0.01 }, { s: 0.5, l: 0.008, t: -0.008, h: -0.02 }],
    { map: mapTail, cs: 2, thick: 0.01, top: (u, v) => (u > 0.62 ? jl(blue, rng, 0.04) : jl(red, rng, 0.04)), bot: () => col('#a83a20') });
  return {
    parts: [
      { name: 'body', geo: body, pivot: [0, 0, 0] },
      { name: 'head', geo: head, pivot: hp, parent: 'body', mat: 'satin' },
      { name: 'wr', geo: xf(wingR, [0.065, 0.05, 0.04]), pivot: [0.065, 0.05, 0.04], parent: 'body' },
      { name: 'wl', geo: xf(mirrorX(wingR), [-0.065, 0.05, 0.04]), pivot: [-0.065, 0.05, 0.04], parent: 'body' },
      { name: 'tail', geo: xf(tail, [0, -0.02, -0.15]), pivot: [0, -0.02, -0.15], parent: 'body' },
    ],
    foot: [0, -0.133, 0],
  };
}

// ─── HARPY EAGLE ────────────────────────────────────────────────────────────────────
function harpySpec(v) {
  const rng = makeRng(901 + v);
  const slate = col('#34383c'), grey = col(['#a9adb0', '#b4b7b9', '#9ea3a7'][v]), white = col('#f2efe8'), black = col('#141416'), yellow = col('#f0c030');
  const bodyR = [
    { p: [0, -0.04, -0.34], rx: 0.07, ry: 0.06 },
    { p: [0, -0.03, -0.28], rx: 0.15, ry: 0.15 },
    { p: [0, 0.0, -0.12], rx: 0.19, ry: 0.21 },
    { p: [0, 0.03, 0.05], rx: 0.19, ry: 0.22 },
    { p: [0, 0.08, 0.17], rx: 0.15, ry: 0.17 },
    { p: [0, 0.14, 0.24], rx: 0.11, ry: 0.11 },
  ];
  const body = paintFaces(L(bodyR, { seg: 12, sub: 2 }), (i) => {
    if (i.ny > 0.25) return jl(slate, rng, 0.05);
    if (i.z > 0.07 && i.nz > -0.1 && i.ny > -0.75) return i.z > 0.19 ? grey : jl(black, rng, 0.03);   // chest band
    return jl(white, rng, 0.03);
  });
  // legs: feathered white thighs + thick yellow tarsus + huge talons (separate part: tucks in flight)
  const thighs = [1, -1].map((s) => paintFaces(L([{ p: [s * 0.08, -0.08, 0.02], rx: 0.07, ry: 0.07 }, { p: [s * 0.085, -0.17, 0.04], rx: 0.06, ry: 0.06 }, { p: [s * 0.09, -0.22, 0.05], rx: 0.04, ry: 0.04 }], { seg: 7, up: [0, 0, 1], sub: 2 }),
    (i) => (Math.sin(i.y * 120) > 0.5 ? col('#4a4a4a') : white)));
  const feet = birdLegs(0.09, -0.21, 0.09, 0.05, yellow, 0.07, 0.026, black);
  const legs = mergeGeometries([...thighs, feet]);
  const hp = [0, 0.18, 0.26];
  const skull = paintFaces(ball(0.11, 0.11, 0.12, 10, 7, [0, 0.24, 0.33]), (i) => (i.nz > 0.6 && i.ny > -0.2 && i.ny < 0.35 && Math.abs(i.nx) < 0.5 ? jl(col('#c4c7c9'), rng, 0.03) : jl(grey, rng, 0.04)));
  const beak = solid(L([
    { p: [0, 0.24, 0.42], rx: 0.04, ry: 0.045 }, { p: [0, 0.235, 0.47], rx: 0.032, ry: 0.04 }, { p: [0, 0.21, 0.505], rx: 0.022, ry: 0.03 },
    { p: [0, 0.175, 0.51], rx: 0.012, ry: 0.015 }, { p: [0, 0.155, 0.495], rx: 0.003, ry: 0.004 },
  ], { seg: 8, sub: 2, up: [0, 0, 1] }), '#1c1c1e');
  const crest = [];
  for (const s of [1, -1]) for (const [dx, len, up] of [[0.02, 0.13, 0.1], [0.045, 0.15, 0.07], [0.07, 0.11, 0.04]]) {
    crest.push(paintFaces(L([{ p: [s * dx, 0.32, 0.31], rx: 0.022, ry: 0.01 }, { p: [s * (dx + 0.025), 0.32 + up * 0.7, 0.31 - len * 0.6], rx: 0.024, ry: 0.008 }, { p: [s * (dx + 0.04), 0.32 + up, 0.31 - len], rx: 0.006, ry: 0.003 }],
      { seg: 5, sub: 1, up: [0, 0, 1] }), () => col('#26282a')));
  }
  const head = mergeGeometries([skull, beak, ...crest, ...eyes(0.02, [0.06, 0.27, 0.41], '#2a1a0c', '#050505', 1.2)]);
  const finger = (u, v) => (v > 0.9 ? 1 : 0);
  const wingTop = (u, v) => jl(mixc(slate, col('#2a2d30'), v + (Math.sin(u * 30) > 0.6 ? 0.25 : 0)), rng, 0.04);
  const wingBot = (u, v) => (v > 0.82 || u > 0.85 ? col('#202224') : (Math.sin(v * 22 + u * 3) > 0.55 ? col('#555a5e') : white));
  const wingR = plate([
    { s: 0, l: 0.14, t: -0.22 }, { s: 0.25, l: 0.17, t: -0.3 }, { s: 0.5, l: 0.15, t: -0.3 }, { s: 0.7, l: 0.12, t: -0.26 },
    { s: 0.78, l: 0.1, t: -0.12 }, { s: 0.84, l: 0.08, t: -0.22 }, { s: 0.9, l: 0.05, t: -0.08 }, { s: 0.96, l: 0.02, t: -0.16 }, { s: 1.02, l: -0.02, t: -0.06 },
  ], { map: mapWingR, cs: 3, thick: 0.025, camber: 0.04, top: wingTop, bot: wingBot });
  const tail = plate([{ s: 0, l: 0.09, t: -0.09 }, { s: 0.2, l: 0.13, t: -0.13 }, { s: 0.42, l: 0.14, t: -0.14, h: -0.01 }],
    { map: mapTail, cs: 2, thick: 0.02, top: (u) => (Math.sin(u * 19) > 0.3 ? black : jl(col('#8a8f92'), rng, 0.04)), bot: (u) => (Math.sin(u * 19) > 0.3 ? col('#2a2a2a') : col('#c8c8c8')) });
  return {
    parts: [
      { name: 'body', geo: body, pivot: [0, 0, 0] },
      { name: 'head', geo: head, pivot: hp, parent: 'body', mat: 'satin' },
      { name: 'legs', geo: legs, pivot: [0, -0.08, 0.03], parent: 'body' },
      { name: 'wr', geo: xf(wingR, [0.13, 0.08, 0.06]), pivot: [0.13, 0.08, 0.06], parent: 'body' },
      { name: 'wl', geo: xf(mirrorX(wingR), [-0.13, 0.08, 0.06]), pivot: [-0.13, 0.08, 0.06], parent: 'body' },
      { name: 'tail', geo: xf(tail, [0, -0.02, -0.3]), pivot: [0, -0.02, -0.3], parent: 'body' },
    ],
    foot: [0, -0.307, 0.05],
  };
}

// ─── HUMMINGBIRD ────────────────────────────────────────────────────────────────────
function hummingbirdSpec(v) {
  const rng = makeRng(1001 + v);
  const green = col(['#1fbf4a', '#20b860', '#2ac040'][v]), throat = col(['#14d070', '#ff2a5a', '#14d070'][v]), belly = col('#e6eee4');
  const bodyR = [
    { p: [0, -0.005, -0.075], rx: 0.015, ry: 0.015 },
    { p: [0, 0.0, -0.055], rx: 0.03, ry: 0.032 },
    { p: [0, 0.0, -0.01], rx: 0.04, ry: 0.044 },
    { p: [0, 0.01, 0.03], rx: 0.036, ry: 0.04 },
    { p: [0, 0.025, 0.06], rx: 0.024, ry: 0.026 },
  ];
  const body = mergeGeometries([paintFaces(L(bodyR, { seg: 9, sub: 2 }), (i) => (i.ny < -0.35 ? belly : jl(green, rng, 0.05))), birdLegs(0.01, -0.035, 0.012, 0, '#222', 0.008, 0.003)]);
  const hp = [0, 0.03, 0.06];
  const skull = paintFaces(ball(0.03, 0.03, 0.032, 8, 6, [0, 0.04, 0.075]), (i) => (i.ny < -0.25 && i.nz > 0 ? jl(throat, rng, 0.04) : jl(green, rng, 0.05)));
  const beak = solid(L([{ p: [0, 0.038, 0.1], rx: 0.006, ry: 0.006 }, { p: [0, 0.033, 0.16], rx: 0.003, ry: 0.003 }, { p: [0, 0.027, 0.2], rx: 0.0015, ry: 0.0015 }], { seg: 5, sub: 1 }), '#141414');
  const head = mergeGeometries([skull, beak, ...eyes(0.007, [0.022, 0.048, 0.093], '#050505', null, 0.5)]);
  const wingR = plate([{ s: 0, l: 0.012, t: -0.014 }, { s: 0.05, l: 0.016, t: -0.02 }, { s: 0.11, l: 0.01, t: -0.016 }, { s: 0.14, l: -0.002, t: -0.008 }],
    { map: mapWingR, cs: 1, single: true, top: () => col('#b8c8c8') });
  const tail = plate([{ s: 0, l: 0.012, t: -0.012 }, { s: 0.04, l: 0.022, t: -0.022 }, { s: 0.055, l: 0.03, t: 0.015 }, { s: 0.056, l: 0.03, t: 0.015 }].slice(0, 3),
    { map: mapTail, cs: 2, thick: 0.004, top: (u, v) => (v > 0.4 && v < 0.6 && u > 0.6 ? col('#0e3a1e') : jl(col('#126a32'), rng, 0.05)) });
  return {
    parts: [
      { name: 'body', geo: body, pivot: [0, 0, 0], mat: 'irid' },
      { name: 'head', geo: head, pivot: hp, parent: 'body', mat: 'irid' },
      { name: 'wr', geo: xf(wingR, [0.02, 0.02, 0.02]), pivot: [0.02, 0.02, 0.02], parent: 'body', mat: 'blur', shadow: false },
      { name: 'wl', geo: xf(mirrorX(wingR), [-0.02, 0.02, 0.02]), pivot: [-0.02, 0.02, 0.02], parent: 'body', mat: 'blur', shadow: false },
      { name: 'tail', geo: xf(tail, [0, 0.0, -0.065]), pivot: [0, 0.0, -0.065], parent: 'body', mat: 'irid' },
    ],
    foot: [0, -0.048, 0],
  };
}

// ─── MORPHO BUTTERFLY ───────────────────────────────────────────────────────────────
function morphoSpec(v) {
  const rng = makeRng(1101 + v);
  const blue = col(['#0640c8', '#0848d0', '#053ab8'][v]), edge = col('#050a14'), spot = col('#e8eef8');
  const body = mergeGeometries([
    solid(L([{ p: [0, 0, -0.07], rx: 0.007, ry: 0.007 }, { p: [0, 0, -0.03], rx: 0.012, ry: 0.012 }, { p: [0, 0, 0.02], rx: 0.014, ry: 0.014 }, { p: [0, 0.002, 0.045], rx: 0.011, ry: 0.011 }], { seg: 6, sub: 2 }), '#2a2018'),
    solid(ball(0.011, 0.011, 0.011, 6, 4, [0, 0.004, 0.056]), '#1a140e'),
    ...[1, -1].map((s) => solid(L([{ p: [s * 0.004, 0.008, 0.062], rx: 0.0015, ry: 0.0015 }, { p: [s * 0.03, 0.03, 0.12], rx: 0.0015, ry: 0.0015 }, { p: [s * 0.034, 0.032, 0.128], rx: 0.004, ry: 0.004 }], { seg: 3, sub: 1 }), '#1a140e')),
  ]);
  const wingCol = (u, v, i) => {
    const r = Math.hypot(i.x, i.z * 1.1);
    const rim = v > 0.82 || v < 0.06 || u > 0.86;
    if (rim) {
      if (u > 0.55 && v > 0.15 && v < 0.75 && ((i.f * 7) % 5) < 1) return spot;
      return edge;
    }
    return jl(mixc(blue, col('#1a8cff'), clamp(1 - r * 6) * 0.6), rng, 0.03);
  };
  // underside: brown with eyespots (seen when the wings close – the morpho 'vanishes' when it folds them)
  const under = (cx, cz) => (u, v, i) => {
    const d = Math.hypot(i.x - cx, i.z - cz);
    if (d < 0.012) return '#f0e8d0'; if (d < 0.022) return '#1a1008'; if (d < 0.032) return '#e0a830';
    return jl(mixc('#6a4424', '#9a6a3a', Math.sin(u * 9 + v * 4) * 0.5 + 0.5), rng, 0.04);
  };
  const fore = plate([
    { s: 0.0, l: 0.025, t: -0.005 }, { s: 0.06, l: 0.05, t: -0.04 }, { s: 0.13, l: 0.075, t: -0.06 }, { s: 0.2, l: 0.095, t: -0.06 }, { s: 0.245, l: 0.1, t: -0.035 }, { s: 0.26, l: 0.09, t: 0.0 },
  ], { map: mapWingR, cs: 4, thick: 0.002, top: wingCol, bot: under(0.17, 0.02) });
  const hind = plate([
    { s: 0.0, l: 0.0, t: -0.07 }, { s: 0.05, l: -0.005, t: -0.13 }, { s: 0.11, l: -0.02, t: -0.165 }, { s: 0.16, l: -0.035, t: -0.16 }, { s: 0.19, l: -0.055, t: -0.13 }, { s: 0.2, l: -0.075, t: -0.1 },
  ], { map: (s, c, h) => [s, h - 0.003, c], cs: 4, thick: 0.002, top: wingCol, bot: under(0.1, -0.1) });
  const wingR = mergeGeometries([fore, hind]);
  return {
    parts: [
      { name: 'body', geo: body, pivot: [0, 0, 0] },
      { name: 'wr', geo: xf(wingR, [0.008, 0.004, 0.0]), pivot: [0.008, 0.004, 0], parent: 'body', mat: 'morpho' },
      { name: 'wl', geo: xf(mirrorX(wingR), [-0.008, 0.004, 0.0]), pivot: [-0.008, 0.004, 0], parent: 'body', mat: 'morpho' },
    ],
  };
}

// ─── ORCHID BEE (Euglossa) ──────────────────────────────────────────────────────────
function orchidbeeSpec(v) {
  const rng = makeRng(1201 + v);
  const green = col(['#1ec060', '#22b84a', '#18b878'][v]), bronze = col('#7ac030');
  const thorax = paintFaces(ball(0.05, 0.048, 0.055, 9, 7, [0, 0.01, 0.02]), () => jl(green, rng, 0.06));
  const abdomen = paintFaces(L([{ p: [0, 0.0, -0.025], rx: 0.045, ry: 0.042 }, { p: [0, -0.005, -0.07], rx: 0.05, ry: 0.045 }, { p: [0, -0.012, -0.115], rx: 0.035, ry: 0.032 }, { p: [0, -0.02, -0.14], rx: 0.012, ry: 0.012 }], { seg: 9, sub: 2 }),
    (i) => jl(mixc(green, bronze, Math.sin(i.z * 90) * 0.5 + 0.3), rng, 0.05));
  const headG = paintFaces(ball(0.035, 0.035, 0.03, 8, 6, [0, 0.012, 0.085]), (i) => (Math.abs(i.nx) > 0.6 ? col('#1a2a20') : jl(green, rng, 0.05)));
  const eyesG = [1, -1].map((s) => solid(ball(0.016, 0.026, 0.016, 6, 5, [s * 0.026, 0.016, 0.085]), '#141c18'));
  const tongue = solid(L([{ p: [0, -0.008, 0.11], rx: 0.004, ry: 0.004 }, { p: [0, -0.03, 0.06], rx: 0.003, ry: 0.003 }, { p: [0, -0.05, -0.08], rx: 0.0025, ry: 0.0025 }, { p: [0, -0.045, -0.16], rx: 0.0015, ry: 0.0015 }], { seg: 4, sub: 2 }), '#2a2018');
  const legs = [];
  for (const s of [1, -1]) for (const [z, len, r] of [[0.035, 0.05, 0.004], [0.015, 0.06, 0.004], [-0.005, 0.08, 0.01]]) {
    legs.push(solid(L([{ p: [s * 0.03, -0.015, z], rx: r * 0.6, ry: r * 0.6 }, { p: [s * 0.055, -0.04, z - 0.01], rx: r, ry: r }, { p: [s * 0.06, -0.015 - len, z - 0.035], rx: r * 0.5, ry: r * 0.5 }], { seg: 4, sub: 1 }), r > 0.008 ? '#2a6040' : '#1a1a1a'));
  }
  const ant = [1, -1].map((s) => solid(L([{ p: [s * 0.01, 0.03, 0.1], rx: 0.002, ry: 0.002 }, { p: [s * 0.02, 0.07, 0.12], rx: 0.002, ry: 0.002 }, { p: [s * 0.035, 0.07, 0.15], rx: 0.0018, ry: 0.0018 }], { seg: 3, sub: 1 }), '#1a1a1a'));
  const body = mergeGeometries([thorax, abdomen, headG, ...eyesG, tongue, ...legs, ...ant]);
  const wingR = plate([{ s: 0, l: 0.015, t: -0.01 }, { s: 0.05, l: 0.025, t: -0.03 }, { s: 0.11, l: 0.015, t: -0.035 }, { s: 0.14, l: -0.005, t: -0.02 }],
    { map: mapWingR, cs: 1, single: true, top: () => col('#c8d8e0') });
  return {
    parts: [
      { name: 'body', geo: body, pivot: [0, 0, 0], mat: 'irid' },
      { name: 'wr', geo: xf(wingR, [0.025, 0.045, 0.03], [0, 0.2, 0]), pivot: [0.025, 0.045, 0.03], parent: 'body', mat: 'blur', shadow: false },
      { name: 'wl', geo: xf(mirrorX(wingR), [-0.025, 0.045, 0.03], [0, -0.2, 0]), pivot: [-0.025, 0.045, 0.03], parent: 'body', mat: 'blur', shadow: false },
    ],
  };
}

// ─── POISON DART FROG ───────────────────────────────────────────────────────────────
function dartfrogSpec(v) {
  const rng = makeRng(1301 + v);
  const yellow = v === 2;
  const base = col(yellow ? '#ffd21a' : '#1e6ae0'), leg = col(yellow ? '#141414' : '#123c9e'), belly = col(yellow ? '#141414' : '#3a86f0'), black = col('#0a0a12');
  const skin = (i, isLeg) => {
    // soft-edged (vertex-blended) markings
    if (yellow) { const w = worley(i.x, i.y, i.z * 0.6, 0.07, 41 + v); return mixc(black, jl(base, rng, 0.04), smoothstep(0.1, 0.3, w.f2 - w.f1)); }
    const w = worley(i.x, i.y, i.z, isLeg ? 0.045 : 0.075, 41 + v);
    const c = jl(isLeg ? leg : i.ny < -0.5 ? belly : base, rng, 0.05);
    return i.ny > -0.4 ? mixc(c, black, smoothstep(0.58, 0.36, w.f1)) : c;
  };
  const bodyR = [
    { p: [0, 0.07, -0.11], rx: 0.04, ry: 0.035 },
    { p: [0, 0.075, -0.08], rx: 0.07, ry: 0.055, fb: 0.6 },
    { p: [0, 0.08, -0.02], rx: 0.08, ry: 0.06, fb: 0.6 },
    { p: [0, 0.075, 0.04], rx: 0.075, ry: 0.052, fb: 0.6 },
    { p: [0, 0.065, 0.09], rx: 0.06, ry: 0.04, fb: 0.6 },
    { p: [0, 0.055, 0.12], rx: 0.04, ry: 0.028, fb: 0.6 },
  ];
  const bodyG = paintFaces(L(bodyR, { seg: 12, sub: 2, cap1: 0.8 }), (i) => skin(i, false));
  const eyeG = eyes(0.019, [0.045, 0.103, 0.075], '#08080a', null, 0.2);
  const front = [1, -1].map((s) => paintFaces(L([{ p: [s * 0.055, 0.055, 0.06], rx: 0.016, ry: 0.016 }, { p: [s * 0.085, 0.025, 0.085], rx: 0.012, ry: 0.012 }, { p: [s * 0.09, 0.006, 0.1], rx: 0.009, ry: 0.009 }], { seg: 5, sub: 2, up: [0, 0, 1] }), (i) => skin(i, true)));
  const pads = [1, -1].flatMap((s) => [-0.4, 0, 0.4].map((a) => solid(ball(0.008, 0.004, 0.008, 5, 3, [s * 0.09 + Math.sin(a) * 0.02, 0.004, 0.1 + Math.cos(a) * 0.02]), yellow ? '#141414' : '#0c2c70')));
  const body = mergeGeometries([bodyG, ...eyeG, ...front, ...pads]);
  const hind = (s) => {
    const g = paintFaces(L([
      { p: [s * 0.055, 0.06, -0.08], rx: 0.022, ry: 0.022 }, { p: [s * 0.11, 0.045, -0.03], rx: 0.02, ry: 0.018 },
      { p: [s * 0.12, 0.03, -0.035], rx: 0.016, ry: 0.014 }, { p: [s * 0.09, 0.02, -0.12], rx: 0.012, ry: 0.011 }, { p: [s * 0.1, 0.008, -0.06], rx: 0.01, ry: 0.007 },
      { p: [s * 0.11, 0.005, -0.02], rx: 0.007, ry: 0.004 },
    ], { seg: 6, sub: 2 }), (i) => skin(i, true));
    const tp = [-0.5, 0, 0.5].map((a) => solid(ball(0.008, 0.004, 0.008, 5, 3, [s * 0.11 + Math.sin(a) * 0.02, 0.004, -0.015 + Math.cos(a) * 0.02]), yellow ? '#141414' : '#0c2c70'));
    return mergeGeometries([g, ...tp]);
  };
  return {
    parts: [
      { name: 'body', geo: body, pivot: [0, 0.06, -0.06], mat: 'gloss' },
      { name: 'hl', geo: hind(1), pivot: [0.055, 0.06, -0.08], parent: 'body', mat: 'gloss' },
      { name: 'hr', geo: hind(-1), pivot: [-0.055, 0.06, -0.08], parent: 'body', mat: 'gloss' },
    ],
  };
}

// ─── FRUIT BAT ──────────────────────────────────────────────────────────────────────
function fruitbatSpec(v) {
  const rng = makeRng(1401 + v);
  const fur = col(['#5a3e2a', '#634430', '#523826'][v]), mantle = col('#a87038'), memb = col('#3a2a22'), bone = col('#5a4232');
  const bodyR = [
    { p: [0, -0.005, -0.1], rx: 0.03, ry: 0.03 },
    { p: [0, 0, -0.07], rx: 0.05, ry: 0.045 },
    { p: [0, 0, -0.01], rx: 0.06, ry: 0.055 },
    { p: [0, 0.005, 0.04], rx: 0.055, ry: 0.05 },
    { p: [0, 0.01, 0.075], rx: 0.04, ry: 0.038 },
  ];
  const bodyG = paintFaces(L(bodyR, { seg: 9, sub: 2, flat: true, jit: 0.15, rng }), (i) => jl(i.z > 0.03 && i.ny > -0.3 ? mantle : fur, rng, 0.1));
  const feet = [1, -1].map((s) => solid(L([{ p: [s * 0.025, -0.01, -0.08], rx: 0.007, ry: 0.007 }, { p: [s * 0.03, -0.0, -0.13], rx: 0.006, ry: 0.006 }, { p: [s * 0.03, 0.012, -0.145], rx: 0.004, ry: 0.004 }], { seg: 4, sub: 1 }), '#2a1e18'));
  const body = mergeGeometries([bodyG, ...feet]);
  const hp = [0, 0.015, 0.075];
  const skull = paintFaces(ball(0.038, 0.036, 0.04, 8, 6, [0, 0.02, 0.1]), (i) => jl(mixc(fur, mantle, 0.4), rng, 0.08));
  const snout = solid(L([{ p: [0, 0.015, 0.12], rx: 0.024, ry: 0.022 }, { p: [0, 0.01, 0.15], rx: 0.014, ry: 0.013 }, { p: [0, 0.006, 0.165], rx: 0.008, ry: 0.008 }], { seg: 7, sub: 2 }), '#4a3224');
  const ears = [1, -1].map((s) => solid(xf(ball(0.014, 0.024, 0.007, 6, 4), [s * 0.024, 0.058, 0.095], [0, 0, s * -0.35]), '#2a1c16'));
  const head = mergeGeometries([skull, snout, ...ears, solid(ball(0.004, 0.004, 0.004, 4, 3, [0, 0.008, 0.168]), '#111'), ...eyes(0.009, [0.022, 0.03, 0.128], '#140c08', null, 0.9)]);
  // membrane wing with fingers and scalloped trailing edge
  const st = [
    { s: 0, l: 0.03, t: -0.09 }, { s: 0.05, l: 0.045, t: -0.085 }, { s: 0.1, l: 0.055, t: -0.15 }, { s: 0.15, l: 0.06, t: -0.19 },
    { s: 0.2, l: 0.05, t: -0.11 }, { s: 0.26, l: 0.035, t: -0.17 }, { s: 0.3, l: 0.02, t: -0.08 }, { s: 0.34, l: 0.005, t: -0.11 }, { s: 0.38, l: -0.02, t: -0.04 },
  ];
  const wingR = plate(st, {
    map: mapWingR, cs: 3, thick: 0.006, camber: 0.012,
    top: (u, v) => (v < 0.2 && u < 0.5 ? bone : jl(memb, rng, 0.05)), bot: (u, v) => (v < 0.2 && u < 0.5 ? bone : jl(col('#4a3428'), rng, 0.05)),
  });
  return {
    parts: [
      { name: 'body', geo: body, pivot: [0, 0, 0], mat: 'fur' },
      { name: 'head', geo: head, pivot: hp, parent: 'body', mat: 'fur' },
      { name: 'wr', geo: xf(wingR, [0.04, 0.015, 0.035]), pivot: [0.04, 0.015, 0.035], parent: 'body', mat: 'membrane' },
      { name: 'wl', geo: xf(mirrorX(wingR), [-0.04, 0.015, 0.035]), pivot: [-0.04, 0.015, 0.035], parent: 'body', mat: 'membrane' },
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════════
// Species definitions (geometry + animation config)
// ═══════════════════════════════════════════════════════════════════════════════════
const QUAD_ACTIONS = ['idle', 'walk', 'run', 'eat', 'sleep'];

function makeQuad(id, specFn, target, cfg, opts) {
  const v = ((opts && opts.seed) || 0) % 3;
  const spec = getSpec(id + v, () => specFn(v));
  const size = new V3(); spec.box.getSize(size);
  const scale = target / size.z;
  return makeVisual(id, spec, opts, { scale, actions: cfg.actions || QUAD_ACTIONS, speeds: { walk: cfg.walkSpeed, run: cfg.runSpeed }, gripY: cfg.gripY }, quadAnimator(cfg));
}

const ANIM = {};

ANIM.jaguar = (opts) => makeQuad('jaguar', jaguarSpec, 2.2, {
  actions: ['idle', 'walk', 'run', 'eat', 'sleep', 'swim', 'sit'],
  legLen: 0.62, walkAmp: 0.38, runAmp: 0.75, walkSpeed: 1.3, runSpeed: 6, maxFreq: 3.2, lift: 0.22,
  sleepLeg: [-1.45, -1.45, -1.35, -1.35], sleepFold: [0.3, 0.3, 0.45, 0.45], sleepDrop: 0.34, sleepRoll: 0.12, sleepHeadPitch: 0.35, sleepHeadYaw: 0.35,
  sleepTailYaw: 1.0, sleepTailPitch: 0.5, eatPitch: 0.9, swimDrop: 0.5, swimHeadUp: 0.35, tailLift: 0.3,
  sitLeg: [0.1, 0.1, -1.4, -1.4], sitFold: [0, 0, 0.45, 0.45], sitDrop: 0.2, sitPitch: 0.42, sitHeadPitch: 0.25,
  map: { perch: 'sleep', climb: 'walk', hang: 'idle', fly: 'run', glide: 'run', hover: 'idle' },
}, opts);

ANIM.tapir = (opts) => makeQuad('tapir', tapirSpec, 2.4, {
  actions: ['idle', 'walk', 'run', 'eat', 'sleep', 'swim'],
  legLen: 0.66, walkAmp: 0.32, runAmp: 0.55, walkSpeed: 1.0, runSpeed: 4, maxFreq: 2.6, lift: 0.15,
  sleepLeg: [-1.4, -1.4, -1.3, -1.3], sleepFold: [0.4, 0.4, 0.5, 0.5], sleepDrop: 0.5, sleepRoll: 0.1, sleepHeadPitch: 0.4,
  eatPitch: 0.75, swimDrop: 0.75, swimHeadUp: 0.35,
  extra: (N, p) => { N.head.rotation.x += Math.sin(p.t * 2.3) * 0.03; },
  map: { perch: 'idle', climb: 'walk', hang: 'idle', fly: 'run', glide: 'run', hover: 'idle' },
}, opts);

ANIM.capybara = (opts) => makeQuad('capybara', capybaraSpec, 1.4, {
  actions: ['idle', 'walk', 'run', 'eat', 'sleep', 'swim', 'sit'],
  legLen: 0.38, walkAmp: 0.4, runAmp: 0.65, walkSpeed: 0.8, runSpeed: 3.5, maxFreq: 3.5, lift: 0.18,
  sleepLeg: [-1.45, -1.45, -1.45, -1.45], sleepFold: [0.45, 0.45, 0.5, 0.5], sleepDrop: 0.2, sleepRoll: 0, sleepHeadPitch: 0.25,
  eatPitch: 0.75, swimDrop: 0.55, swimHeadUp: 0.3,
  sitLeg: [0.05, 0.05, -1.5, -1.5], sitFold: [0, 0, 0.5, 0.5], sitDrop: 0.12, sitPitch: 0.3, sitHeadPitch: 0.15,
  map: { perch: 'sit', climb: 'walk', hang: 'idle', fly: 'run', glide: 'run', hover: 'idle' },
}, opts);

ANIM.agouti = (opts) => makeQuad('agouti', agoutiSpec, 0.8, {
  actions: ['idle', 'walk', 'run', 'eat', 'sleep', 'sit'],
  legLen: 0.32, walkAmp: 0.4, runAmp: 0.8, walkSpeed: 0.7, runSpeed: 4, maxFreq: 5, lift: 0.25,
  walkOff: [0.25, 0.75, 0, 0.5], runOff: [0, 0.08, 0.5, 0.55],
  sleepLeg: [-1.45, -1.45, -1.3, -1.3], sleepFold: [0.45, 0.45, 0.45, 0.45], sleepDrop: 0.17, sleepPitch: 0.12, sleepHeadPitch: 0.1,
  sitLeg: [-0.3, -0.3, -1.3, -1.3], sitFold: [0.1, 0.1, 0.35, 0.35], sitDrop: 0.13, sitPitch: 0.55, sitHeadPitch: 0.4,
  eatPitch: 0.5,
  // agouti eats sitting up, holding a seed in its front paws
  map: { eat: 'sit', perch: 'sit', climb: 'walk', hang: 'idle', fly: 'run', glide: 'run', hover: 'idle', swim: 'walk' },
  extra: (N, p) => { if (p.si > 0.1) { N.fl.rotation.x = lerp(N.fl.rotation.x, -0.5 + Math.sin(p.t * 5) * 0.1, p.si); N.fr.rotation.x = lerp(N.fr.rotation.x, -0.5 + Math.sin(p.t * 5 + 0.4) * 0.1, p.si); N.fl.scale.y = N.fr.scale.y = 1 - 0.4 * p.si; N.head.rotation.x += p.si * Math.sin(p.t * 9) * 0.05; } },
}, opts);

// ─── sloth: custom animator (hang is its home pose) ───
ANIM.sloth = (opts) => {
  const v = ((opts && opts.seed) || 0) % 3;
  const spec = getSpec('sloth' + v, () => slothSpec(v));
  const size = new V3(); spec.box.getSize(size);
  return makeVisual('sloth', spec, opts, { scale: 1.0 / size.z * 0.95, actions: ['hang', 'climb', 'idle', 'walk', 'eat', 'sleep', 'perch'], speeds: { walk: 0.12, run: 0.25 }, calib: [['hang', ['fl', 'fr', 'hl', 'hr'], 'max']], calibOffset: { hang: 0.07 } }, (N, inner, st) => {
    const P = st.P, { body, head } = N, limbs = LEGS.map((k) => N[k]);
    const base = body.userData.base.clone();
    let support = 'hang';   // idle / eat / sleep keep the last support pose (hanging, clinging to a trunk, or on the ground)
    return (dt, action, speed) => {
      let a = action;
      if (a === 'perch' || a === 'fly' || a === 'glide' || a === 'hover') a = 'hang';
      if (a === 'run' || a === 'swim') a = 'walk';   // sloths swim surprisingly well – reuse the slow crawl
      if (a === 'walk' || a === 'hang' || a === 'climb') support = a === 'walk' ? 'ground' : a;
      const sup = a === 'idle' || a === 'eat' || a === 'sleep' ? support : a === 'walk' ? 'ground' : a;
      const sp = speed == null || speed <= 0.001 ? (a === 'walk' || a === 'climb' ? 0.12 : 0) : speed;
      const hang = P('hang', sup === 'hang' ? 1 : 0, dt, 2.5);
      const climb = P('climb', sup === 'climb' ? 1 : 0, dt, 2.5);
      const ground = 1 - hang - climb;
      const sl = P('sl', a === 'sleep' ? 1 : 0, dt, 1.5);
      const et = P('et', a === 'eat' ? 1 : 0, dt, 3);
      const moving = (a === 'walk' || a === 'climb' || (a === 'hang' && speed > 0.01)) ? 1 : 0;
      st.ph += dt * TAU * (moving ? clamp(sp / 0.25, 0.2, 1.2) : 0.0);
      const t = st.t, ph = st.ph;
      // body placement per pose (contact point at origin)
      const hy = -0.08 * (1 + sl * 0.3), hz = 0;
      body.position.set(0, lerp(base.y, 0, 1 - ground) + hang * (-0.36 - base.y * 0 + Math.sin(t * 0.8) * 0.01) + climb * 0.42 + sl * hang * 0.04, hz + climb * -0.2);
      body.rotation.set(climb * -PI / 2, 0, hang * PI);
      body.rotation.z += hang * Math.sin(t * 0.7) * 0.05;
      // limbs: alternate slow reach
      for (let i = 0; i < 4; i++) {
        const off = [0, 0.5, 0.5, 0][i] * TAU;
        const swing = moving * 0.55 * Math.sin(ph + off);
        let rx = swing, rz = 0, sy = 1;
        // hang: hands reach up to the branch at y=0 (they point up after the body roll)
        if (i < 2) { rx += hang * -0.1 + climb * -0.6 + ground * 0.15; rz = (i % 2 ? 1 : -1) * (hang * 0.35 + sl * hang * 0.15); }
        else { rx += hang * 0.15 + climb * 0.1; rz = (i % 2 ? 1 : -1) * hang * 0.3; }
        sy = 1 - moving * 0.15 * Math.max(0, -Math.cos(ph + off)) - ground * (i < 2 ? 0.08 : 0);
        limbs[i].rotation.set(rx, 0, rz);
        limbs[i].scale.y = sy;
      }
      // head: sloths keep their face upright even when hanging upside-down
      head.rotation.set(hang * -0.6 + et * 0.3 * Math.sin(t * 1.5) + sl * 0.6, Math.sin(t * 0.25 + st.seed * 9) * 0.5 * (1 - sl), hang * PI * (1 - sl * 0.3));
      if (climb > 0.5) head.rotation.x += 0.9 * climb;
      body.scale.setScalar(1 + Math.sin(t * 1.2) * 0.01);
    };
  });
};

// ─── howler: sits on branches, walks, climbs, hangs by its tail ───
ANIM.howler = (opts) => {
  const v = ((opts && opts.seed) || 0) % 3;
  const spec = getSpec('howler' + v, () => howlerSpec(v));
  const size = new V3(); spec.box.getSize(size);
  return makeVisual('howler', spec, opts, { scale: 1.0 / size.z, actions: ['idle', 'perch', 'walk', 'run', 'climb', 'hang', 'eat', 'sleep'], speeds: { walk: 0.9, run: 2.5 }, calib: [['hang', ['tail'], 'max'], ['perch', ['body'], 'min']], calibOffset: { hang: 0.03, perch: -0.02 } }, (N, inner, st) => {
    const P = st.P, { body, head, tail } = N, limbs = LEGS.map((k) => N[k]);
    const base = body.userData.base.clone();
    let howl = 0;
    return (dt, action, speed) => {
      let a = action;
      if (a === 'fly' || a === 'glide' || a === 'hover' || a === 'swim') a = 'walk';
      if (a === 'idle') a = 'perch';
      const moving = a === 'walk' || a === 'run' || a === 'climb';
      const sp = speed == null || speed <= 0.01 ? (a === 'run' ? 2.5 : a === 'climb' ? 0.5 : 0.9) : speed;
      const sit = P('sit', a === 'perch' || a === 'eat' || a === 'sleep' ? 1 : 0, dt, 4);
      const hang = P('hang', a === 'hang' ? 1 : 0, dt, 3);
      const climb = P('climb', a === 'climb' ? 1 : 0, dt, 3);
      const gw = P('gw', moving ? 1 : 0, dt, 5);
      const run = P('run', a === 'run' ? 1 : 0, dt, 4);
      const sl = P('sl', a === 'sleep' ? 1 : 0, dt, 2);
      const et = P('et', a === 'eat' ? 1 : 0, dt, 4);
      const amp = lerp(0.45, 0.8, run);
      if (gw > 0.01) st.ph += dt * TAU * clamp(sp / (4 * 0.4 * Math.sin(amp)), 0.5, 4);
      const t = st.t, ph = st.ph;
      // howling bouts while perched (head up, jaw out)
      const hb = sit * (1 - sl) * (1 - et) * smoothstep(0.75, 0.9, Math.sin(t * 0.21 + st.seed * 20));
      howl = damp(howl, hb, 4, dt);
      body.position.set(0, base.y - sit * 0.33 + hang * (-0.98 - base.y + 0.43) + climb * 0.05 + gw * (1 - climb) * 0.015 * Math.cos(2 * ph), climb * -0.15);
      body.rotation.set(-sit * (1.15 - sl * 0.25) + hang * PI / 2 * 1.0 + climb * -PI / 2 + gw * run * 0.08 * Math.sin(ph), 0, sit * sl * 0.1);
      for (let i = 0; i < 4; i++) {
        const front = i < 2, s = i % 2 ? -1 : 1;
        const off = (front ? [0.25, 0.75] : [0, 0.5])[i % 2] * TAU + (run > 0.5 ? (front ? 0 : PI) : 0);
        let rx = gw * amp * Math.sin(ph + off), rz = 0, sy = 1 - gw * 0.18 * Math.max(0, -Math.cos(ph + off));
        if (front) {
          // eat: right hand brings leaves to the mouth, left hand holds the branch
          const feed = i === 1 ? et : 0;
          rx += sit * (0.55 - et * 0.3 * (1 - feed)) + hang * -1.3 + climb * -0.5;
          rz = s * (sit * 0.15 + hang * 0.2);
          rx = lerp(rx, -1.15 + 0.12 * Math.sin(t * 3), feed); rz = lerp(rz, 0.6, feed); sy = lerp(sy, 0.42, feed);
        }
        else { rx += sit * -1.0 + hang * 0.6 + climb * 0.3; rz = s * (sit * 0.45 + hang * 0.3); sy -= sit * 0.15; }
        limbs[i].rotation.set(rx, 0, rz);
        limbs[i].scale.y = sy;
      }
      head.rotation.set(sit * 1.0 - howl * 0.6 + et * 0.35 + sl * 0.5 + hang * -1.0 + climb * 1.0 + gw * 0.05 * Math.sin(2 * ph),
        (1 - sl) * (1 - gw * 0.6) * 0.5 * wave(t + st.seed * 10, 0.33, 0.8, 1.7), 0);
      head.scale.set(1, 1 + howl * 0.08, 1 + howl * 0.12);
      tail.rotation.set(sit * 1.1 + hang * -0.2 + climb * 0.2 + gw * (1 - climb) * -0.35 + 0.08 * Math.sin(t * 0.9), (1 - hang) * 0.25 * Math.sin(t * 0.6 + 1), 0);
    };
  });
};

// ─── birds ───
function makeBird(id, specFn, target, cfg, opts) {
  const v = ((opts && opts.seed) || 0) % 3;
  const spec = getSpec(id + v, () => specFn(v));
  const size = new V3(); spec.box.getSize(size);
  const scale = target / (cfg.lengthAxis === 'x' ? size.x : size.z);
  return makeVisual(id, spec, opts, { scale, flyer: true, lengthAxis: cfg.lengthAxis, actions: cfg.actions, speeds: { walk: 0.3, fly: cfg.flySpeed }, calib: [['perch', [spec.byName.legs ? 'legs' : 'body', spec.foot], 'point']] }, birdAnimator({ size: target, ...cfg }));
}
const BIRD_ACT = ['perch', 'fly', 'glide', 'walk', 'eat', 'sleep', 'idle'];
ANIM.toucan = (opts) => makeBird('toucan', toucanSpec, 0.8, {
  actions: BIRD_ACT, flapFreq: 4.2, flapAmp: 0.9, flapBias: 0.15, glideDihedral: 0.08, flySpeed: 6,
  foldSweep: 1.45, foldDroop: -0.25, foldRoll: 0.5, perchPitch: 0.45, flyPitch: 0.05, tailPerch: 0.35, 
}, opts);
ANIM.macaw = (opts) => makeBird('macaw', macawSpec, 1.0, {
  actions: [...BIRD_ACT, 'climb'], climb: true, flapFreq: 3.6, flapAmp: 0.85, flapBias: 0.12, glideDihedral: 0.06, flySpeed: 8, wingStretch: 0.15,
  foldSweep: 1.45, foldDroop: -0.25, foldRoll: 0.5, perchPitch: 0.55, flyPitch: 0.02, tailPerch: 0.25, tailFly: -0.05, 
}, opts);
ANIM.harpy = (opts) => makeBird('harpy', harpySpec, 1.3, {
  actions: BIRD_ACT, flapFreq: 2.0, flapAmp: 0.6, flapBias: 0.08, glideDihedral: 0.1, flySpeed: 10, bank: 0.3, wingStretch: 0.12,
  foldSweep: 1.5, foldDroop: -0.05, foldRoll: 0.6, foldScale: 0.6, perchPitch: 0.45, flyPitch: 0.0, tailPerch: 0.3, 
}, opts);
ANIM.hummingbird = (opts) => makeBird('hummingbird', hummingbirdSpec, 0.4, {
  actions: ['hover', 'fly', 'perch', 'eat', 'sleep', 'idle'], hover: true, flapFreq: 22, flapAmp: 0.9, flapBias: 0.1, hoverFreq: 24, hoverAmp: 0.25, hoverSweep: 1.1, hoverPitch: 0.95,
  glideDihedral: 0.3, flySpeed: 5, foldSweep: 1.5, foldDroop: -0.1, foldRoll: 0.35, perchPitch: 0.35, flyPitch: 0.15, 
  extra: (N, p) => { if (p.et > 0.01) { N.body.rotation.x = lerp(N.body.rotation.x, -0.95, p.et); /* feeding = hovering at a flower */ } },
}, opts);
// hummingbird 'eat' = hover with bill forward into a flower
{
  const raw = ANIM.hummingbird;
  ANIM.hummingbird = (opts) => {
    const vis = raw(opts); const u = vis.update;
    vis.update = (dt, s = {}) => u(dt, s.action === 'eat' ? { ...s, action: 'hover' } : s);
    return vis;
  };
}

// ─── morpho ───
ANIM.morpho = (opts) => {
  const v = ((opts && opts.seed) || 0) % 3;
  const spec = getSpec('morpho' + v, () => morphoSpec(v));
  const size = new V3(); spec.box.getSize(size);
  return makeVisual('morpho', spec, opts, { scale: 0.55 / size.x, flyer: true, lengthAxis: 'x', actions: ['fly', 'glide', 'perch', 'eat', 'idle', 'sleep'], speeds: { fly: 1.5 }, calib: [['perch', ['body'], 'min']] }, (N, inner, st) => {
    const P = st.P, { body, wl, wr } = N;
    return (dt, action) => {
      const air = action === 'fly' || action === 'glide' || action === 'hover' || action === 'run' || action === 'walk';
      const t = st.t;
      const air1 = P('air', air ? 1 : 0, dt, 5);
      // lazy flap with short glides
      const cyc = (t * 0.35 + st.seed * 3) % 1;
      const gliding = action === 'glide' || (cyc > 0.7);
      const gw = P('g', gliding ? 1 : 0, dt, 3);
      st.ph += dt * TAU * 2.4 * (1 - gw * 0.85);
      const fl = Math.sin(st.ph);
      // perched: wings mostly closed upright (brown underside out), slow opening now and then
      const open = 0.5 + 0.5 * Math.sin(t * 0.6 + st.seed * 4);
      const perchA = lerp(1.45, 0.25, smoothstep(0.75, 1, open));
      const ang = air1 * ((1 - gw) * (0.35 + 0.95 * fl) + gw * 0.12) + (1 - air1) * perchA;
      wr.rotation.z = ang; wl.rotation.z = -ang;
      body.position.y = air1 * -0.03 * fl * (1 - gw);
      body.rotation.x = air1 * (0.1 * Math.sin(st.ph + 1)) - (1 - air1) * 0.1;
      body.rotation.z = air1 * 0.2 * Math.sin(t * 0.7 + st.seed);
    };
  });
};

// ─── orchid bee ───
ANIM.orchidbee = (opts) => {
  const v = ((opts && opts.seed) || 0) % 3;
  const spec = getSpec('orchidbee' + v, () => orchidbeeSpec(v));
  const size = new V3(); spec.box.getSize(size);
  return makeVisual('orchidbee', spec, opts, { scale: 0.3 / size.z, flyer: true, actions: ['fly', 'hover', 'perch', 'eat', 'idle', 'sleep'], speeds: { fly: 3 }, calib: [['perch', ['body'], 'min']] }, (N, inner, st) => {
    const P = st.P, { body, wl, wr } = N;
    for (const w of [wl, wr]) w.rotation.order = 'YZX';
    return (dt, action) => {
      const air = !(action === 'perch' || action === 'sleep' || action === 'idle');
      const a1 = P('air', air ? 1 : 0, dt, 8);
      st.ph += dt * TAU * (air ? 26 : 0);
      const t = st.t;
      const f = Math.sin(st.ph);
      wr.rotation.set(0, (1 - a1) * 1.2, a1 * (0.2 + 0.7 * f));
      wl.rotation.set(0, -(1 - a1) * 1.2, -a1 * (0.2 + 0.7 * f));
      body.position.y = a1 * (0.012 * Math.sin(t * 7) + 0.006 * Math.sin(t * 13));
      body.position.x = a1 * 0.01 * Math.sin(t * 5.3);
      body.rotation.x = a1 * (action === 'eat' ? 0.25 : -0.05) + (1 - a1) * 0.0;
      body.rotation.y = a1 * 0.12 * Math.sin(t * 2.1);
    };
  });
};

// ─── dart frog ───
ANIM.dartfrog = (opts) => {
  const v = ((opts && opts.seed) || 0) % 3;
  const spec = getSpec('dartfrog' + v, () => dartfrogSpec(v));
  const size = new V3(); spec.box.getSize(size);
  return makeVisual('dartfrog', spec, opts, { scale: 0.35 / size.z, actions: ['idle', 'walk', 'run', 'eat', 'sleep', 'swim', 'climb'], speeds: { walk: 0.4, run: 1.0 } }, (N, inner, st) => {
    const P = st.P, { body, hl, hr } = N;
    const base = body.userData.base.clone();
    let tongue = 0;
    return (dt, action, speed) => {
      let a = action;
      if (a === 'fly' || a === 'glide' || a === 'hover' || a === 'perch' || a === 'hang') a = 'idle';
      const hop = a === 'walk' || a === 'run' || a === 'climb';
      const sp = speed == null || speed <= 0.01 ? (a === 'run' ? 1.0 : 0.4) : speed;
      const hopLen = a === 'run' ? 0.35 : 0.2;
      const t = st.t;
      const sw = P('sw', a === 'swim' ? 1 : 0, dt, 4);
      const sl = P('sl', a === 'sleep' ? 1 : 0, dt, 2);
      const cl = P('cl', a === 'climb' ? 1 : 0, dt, 4);
      if (hop || a === 'swim') st.ph += dt * clamp(sp / hopLen, 0.5, 4);
      const c = st.ph % 1;
      const air = hop ? smoothstep(0.0, 0.08, c) * (1 - smoothstep(0.6, 0.7, c)) : 0;
      const arc = hop ? Math.max(0, Math.sin(clamp(c / 0.68) * PI)) : 0;
      const ext = hop ? Math.max(0, Math.sin(clamp(c / 0.4) * PI)) : 0;
      body.position.set(0, base.y + arc * hopLen * 0.45 - sl * 0.012 - sw * 0.04, 0);
      body.rotation.x = hop ? -0.35 * Math.sin(clamp(c / 0.68) * PI * 1.0 - 0.3) * air : 0;
      body.rotation.x += -cl * 1.2;
      // swim: legs kick back
      const kick = sw * Math.max(0, Math.sin(st.ph * TAU));
      for (const [leg, s] of [[hl, 1], [hr, -1]]) { leg.rotation.set(ext * 0.9 + kick * 0.9, s * ext * -0.3, 0); leg.scale.z = 1 + ext * 0.6 + kick * 0.5; }
      // throat / breathing pulse
      const br = (1 - sl * 0.6) * 0.03 * Math.max(0, Math.sin(t * 6));
      body.scale.set(1 + br, 1 - br * 0.5 - sl * 0.08, 1);
      if (a === 'eat') { tongue = damp(tongue, Math.sin(t * 3) > 0.7 ? 1 : 0, 20, dt); body.rotation.x = -0.15 + tongue * -0.1; }
    };
  });
};

// ─── fruit bat ───
ANIM.fruitbat = (opts) => {
  const v = ((opts && opts.seed) || 0) % 3;
  const spec = getSpec('fruitbat' + v, () => fruitbatSpec(v));
  const size = new V3(); spec.box.getSize(size);
  return makeVisual('fruitbat', spec, opts, { scale: 0.8 / size.x, flyer: true, lengthAxis: 'x', actions: ['fly', 'glide', 'hang', 'eat', 'sleep', 'idle'], speeds: { fly: 5 }, calib: [['hang', ['body', [0, 0.012, -0.145]], 'point']] }, (N, inner, st) => {
    const P = st.P, { body, head, wl, wr } = N;
    for (const w of [wl, wr]) w.rotation.order = 'YZX';
    return (dt, action) => {
      let a = action;
      if (a === 'perch' || a === 'idle' || a === 'climb' || a === 'walk') a = 'hang';
      if (a === 'run' || a === 'hover' || a === 'swim') a = 'fly';
      const air = a === 'fly' || a === 'glide';
      const t = st.t;
      const fl = P('fl', a === 'fly' ? 1 : 0, dt, 6), gl = P('gl', a === 'glide' ? 1 : 0, dt, 4);
      const hg = P('hg', air ? 0 : 1, dt, 4);
      const sl = P('sl', a === 'sleep' ? 1 : 0, dt, 2);
      st.ph += dt * TAU * (air ? 3.6 : 0.4);
      const sk = Math.sin(st.ph - 0.4 * Math.sin(st.ph));
      const flap = fl * (0.95 * sk + 0.1) + gl * (0.12 + 0.04 * Math.sin(t * 1.5));
      // hanging: wrapped in wings like a cloak (sleep wraps tighter)
      const wrap = hg * (1.25 + sl * 0.25);
      wr.rotation.set(hg * 1.1, hg * 1.2 + fl * 0.25 * Math.cos(st.ph), flap - wrap * 0.6);
      wl.rotation.set(hg * 1.1, -(hg * 1.2 + fl * 0.25 * Math.cos(st.ph)), -(flap - wrap * 0.6));
      const sx = 1 - fl * 0.25 * Math.max(0, -sk) - hg * 0.35; wr.scale.x = wl.scale.x = sx;
      body.rotation.set(hg * PI / 2 + fl * 0.05 * Math.sin(st.ph), 0, (fl + gl) * 0.25 * wave(t * 0.7 + st.seed * 4, 0.6, 1.3, 2.9) + hg * 0.08 * Math.sin(t * 0.8));
      body.position.y = fl * -0.04 * sk;
      head.rotation.set(hg * (-0.4 + (a === 'eat' ? 0.3 * Math.sin(t * 5) : 0)) + fl * 0.1, (1 - sl) * hg * 0.6 * wave(t + st.seed * 8, 0.4, 0.9, 2.2), 0);
    };
  });
};

// ═══════════════════════════════════════════════════════════════════════════════════
// Leafcutter ant colony (ColonyVisual)
// ═══════════════════════════════════════════════════════════════════════════════════
let _antGeo = null, _leafGeo = null, _moundGeo = new Map();
function antGeometry() {
  if (_antGeo) return _antGeo;
  const c = '#7a2e14', d = '#5a200c';
  const parts = [
    solid(ball(0.018, 0.016, 0.022, 6, 4, [0, 0.025, 0.045]), c),         // head
    solid(ball(0.012, 0.012, 0.028, 5, 4, [0, 0.026, 0.008]), d),         // thorax
    solid(ball(0.022, 0.02, 0.03, 6, 4, [0, 0.028, -0.04]), d),          // abdomen
  ];
  for (const s of [1, -1]) for (const z of [0.022, 0.006, -0.012]) parts.push(solid(L([{ p: [s * 0.006, 0.022, z], rx: 0.0025, ry: 0.0025 }, { p: [s * 0.03, 0.025, z + z * 0.8], rx: 0.0022, ry: 0.0022 }, { p: [s * 0.04, 0.0, z + z * 1.5], rx: 0.002, ry: 0.002 }], { seg: 3, sub: 1 }), d));
  for (const s of [1, -1]) parts.push(solid(L([{ p: [s * 0.008, 0.035, 0.06], rx: 0.002, ry: 0.002 }, { p: [s * 0.02, 0.05, 0.075], rx: 0.002, ry: 0.002 }, { p: [s * 0.028, 0.045, 0.095], rx: 0.0018, ry: 0.0018 }], { seg: 3, sub: 1 }), d));
  _antGeo = mergeGeometries(parts);
  // scale to 0.15 length
  _antGeo.computeBoundingBox(); const len = _antGeo.boundingBox.max.z - _antGeo.boundingBox.min.z;
  _antGeo.scale(0.15 / len, 0.15 / len, 0.15 / len);
  _antGeo.computeBoundingSphere();
  return _antGeo;
}
function leafGeometry() {
  if (_leafGeo) return _leafGeo;
  // irregular leaf fragment (half-moon cut), held upright like a sail over the head
  const st = [{ s: 0, l: 0.0, t: 0.0 }, { s: 0.03, l: 0.045, t: -0.035 }, { s: 0.07, l: 0.055, t: -0.05 }, { s: 0.1, l: 0.03, t: -0.04 }, { s: 0.115, l: 0.0, t: -0.01 }];
  const g = plate(st, { map: (s, c, h) => [h, s, c], cs: 2, single: true, top: (u, v) => mixc('#7fd04a', '#4caa2a', v), bot: () => '#5ab832' });
  _leafGeo = g;
  return g;
}
function moundGeometry(v) {
  if (_moundGeo.has(v)) return _moundGeo.get(v);
  const rng = makeRng(1500 + v);
  const soil = col('#7a4a2a'), pale = col('#a8744a'), dark = col('#1a0e08');
  const R = 1.3, H = 0.42;
  const g = new THREE.CircleGeometry(1, 28, 0, TAU).toNonIndexed();
  // build dome from a lathe profile with noise
  const prof = []; for (let i = 0; i <= 7; i++) { const k = i / 7; prof.push(new THREE.Vector2(Math.max(0.001, R * Math.sin(k * PI / 2) * (1 + 0.15 * (1 - k))), H * Math.cos(k * PI / 2) - (k > 0.95 ? 0.03 : 0))); }
  let dome = new THREE.LatheGeometry(prof.reverse(), 22);
  dome = dome.toNonIndexed(); dome.deleteAttribute('uv');
  const p = dome.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = p.getY(i);
    const n = Math.sin(x * 4.1 + v) * Math.cos(z * 3.7) * 0.06 + Math.sin(x * 9 + z * 7) * 0.02;
    p.setY(i, Math.max(0, y + (y > 0.02 ? n : 0)));
  }
  dome.computeVertexNormals();
  g.dispose();
  const entrances = [];
  const holes = [[0.15, 0.36, 0.05], [0.55, 0.2, 0.8], [-0.4, 0.28, -0.6], [0.0, 0.3, -0.35], [-0.65, 0.16, 0.5]];
  for (const [x, y, z] of holes) {
    const rim = solid(xf(new THREE.TorusGeometry(0.07, 0.035, 4, 8).toNonIndexed(), [x, y + 0.02, z], [-PI / 2, 0, 0]), pale); rim.deleteAttribute('uv');
    entrances.push(rim, solid(xf(ball(0.06, 0.02, 0.06, 6, 3), [x, y + 0.035, z]), dark));
  }
  // excavated soil crumbs around the mound
  const crumbs = [];
  for (let i = 0; i < 26; i++) { const a = rng() * TAU, r = R * (0.9 + rng() * 0.45); crumbs.push(solid(ball(0.05 + rng() * 0.05, 0.03 + rng() * 0.02, 0.05 + rng() * 0.05, 5, 3, [Math.cos(a) * r, 0.01, Math.sin(a) * r]), jl(pale, rng, 0.15))); }
  const domeC = paintFaces(dome, (i) => jl(mixc(soil, pale, clamp(i.y / H * 0.9 + 0.1)), rng, 0.12));
  const out = mergeGeometries([domeC, ...entrances, ...crumbs]);
  _moundGeo.set(v, out);
  return out;
}

ANIM.leafcutter = (opts = {}) => {
  const seed = opts.seed || 1, v = seed % 3, rng = makeRng(seed * 13 + 5);
  const object = new THREE.Group(); object.name = 'amazon-leafcutter';
  const mound = new THREE.Mesh(moundGeometry(v), mat('matte'));
  mound.castShadow = mound.receiveShadow = true;
  object.add(mound);
  const N = 120, N_LOW = 36;   // ants on the trail at full activity (N_LOW on min/low quality)
  const ants = new THREE.InstancedMesh(antGeometry(), mat('satin'), N);
  const leaves = new THREE.InstancedMesh(leafGeometry(), mat('membrane'), N);
  // ants are a few mm on screen: their shadows are invisible but would double the (large) instanced triangle count
  ants.castShadow = false; leaves.castShadow = false; ants.receiveShadow = true;
  ants.frustumCulled = false; leaves.frustumCulled = false;
  ants.instanceMatrix.setUsage(THREE.DynamicDrawUsage); leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const leafCol = new THREE.Color(), leafCols = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { leafCol.setHSL(0.24 + rng() * 0.08, 0.55 + rng() * 0.2, 0.38 + rng() * 0.18); leaves.setColorAt(i, leafCol); leafCol.toArray(leafCols, i * 3); }
  ants.count = 0; leaves.count = 0;   // only the instances written this frame are drawn (see update)
  object.add(ants, leaves);
  const per = []; for (let i = 0; i < N; i++) per.push({ u: i / N + (rng() - 0.5) * 0.4 / N, sp: 0.85 + rng() * 0.3, lane: (rng() - 0.5) * 0.05, wob: rng() * TAU, leaf: 0.7 + rng() * 0.6 });
  // trail in local space (cumulative lengths)
  let pts = [], cum = [], total = 1;
  const worldPts = [];
  const lastMat = new THREE.Matrix4();
  function rebuild() {
    object.updateWorldMatrix(true, false);
    lastMat.copy(object.matrixWorld);
    const inv = new THREE.Matrix4().copy(object.matrixWorld).invert();
    pts = worldPts.length >= 2 ? worldPts.map((p) => p.clone().applyMatrix4(inv)) : defaultTrail();
    cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    total = Math.max(0.01, cum[cum.length - 1]);
  }
  function defaultTrail() {
    const out = []; for (let i = 0; i <= 24; i++) { const a = (i / 24) * PI * 1.2 + 0.4; const r = 1.5 + i * 0.12; out.push(new V3(Math.cos(a) * r, 0.02, Math.sin(a) * r)); }
    out.unshift(new V3(0.55, 0.2, 0.8)); return out;
  }
  rebuild();
  const P = new V3(), D = new V3(), side = new V3(), up = new V3(0, 1, 0), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new V3(), zero = new V3(0, 0, 0), e = new THREE.Euler();
  const lq = new THREE.Quaternion(), le = new THREE.Euler(), hp = new V3();
  function sample(d, out, dir) {
    d = clamp(d, 0, total);
    let i = 1; while (i < cum.length - 1 && cum[i] < d) i++;
    const a = pts[i - 1], b = pts[i], seg = cum[i] - cum[i - 1] || 1, k = (d - cum[i - 1]) / seg;
    out.lerpVectors(a, b, k); dir.subVectors(b, a).normalize();
  }
  let time = 0;
  const speed = 0.35;
  const yAxis = new V3(0, 1, 0);
  return {
    type: 'colony', id: 'leafcutter', object, height: 0.45, length: 2.6,
    setTrail(pointsWorld) { worldPts.length = 0; for (const p of pointsWorld || []) worldPts.push(new V3(p.x, p.y, p.z)); rebuild(); },
    update(dt, s = {}) {
      dt = Math.min(dt || 0, 0.1); time += dt;
      object.updateWorldMatrix(true, false);
      if (worldPts.length >= 2 && !object.matrixWorld.equals(lastMat)) rebuild();
      const act = clamp(s.activity ?? 1);
      const cap = isLowQuality() ? N_LOW : N;
      const visible = Math.round(cap * (0.08 + 0.92 * act));
      const loop = total * 2;
      const lc = leaves.instanceColor.array;
      let nLeaf = 0;
      // instances are packed: slot j = j-th visible ant, leaves packed separately (count = what's actually drawn).
      // With a reduced cap, ants are taken with an even stride so the trail stays evenly filled.
      for (let j = 0; j < visible; j++) {
        const i = cap < N ? Math.floor(j * N / cap) : j;
        const a = per[i];
        const pos = ((a.u * loop + time * speed * a.sp) % loop + loop) % loop;
        const outbound = pos < total;
        const d = outbound ? pos : loop - pos;
        sample(d, P, D);
        if (!outbound) D.negate();
        side.crossVectors(up, D).normalize();
        const laneOff = (outbound ? -0.07 : 0.07) + a.lane;
        P.addScaledVector(side, laneOff);
        // disappear into the nest entrance at the start of the trail
        const fade = smoothstep(0.0, 0.25, d) * (1 - smoothstep(total - 0.05, total, d) * 0.0);
        const wob = Math.sin(time * 14 + a.wob) * 0.12;
        const yaw = Math.atan2(D.x, D.z) + wob;
        const pitch = -Math.asin(clamp(D.y, -1, 1));
        e.set(pitch, yaw, 0, 'YXZ'); q.setFromEuler(e);
        sc.setScalar(fade);
        P.y += Math.abs(Math.sin(time * 18 + a.wob)) * 0.004;
        m4.compose(P, q, sc); ants.setMatrixAt(j, m4);
        if (!outbound) {
          // leaf held in mandibles, raised above the head, swaying slightly
          lq.setFromEuler(le.set(pitch - 0.25 + Math.sin(time * 6 + a.wob) * 0.08, yaw + PI / 2, 0, 'YXZ'));
          hp.set(0, 0.035, 0.05).applyQuaternion(q).add(P);
          sc.setScalar(fade * a.leaf * 1.4);
          m4.compose(hp, lq, sc); leaves.setMatrixAt(nLeaf, m4);
          lc[nLeaf * 3] = leafCols[i * 3]; lc[nLeaf * 3 + 1] = leafCols[i * 3 + 1]; lc[nLeaf * 3 + 2] = leafCols[i * 3 + 2];   // colour follows the ant
          nLeaf++;
        }
      }
      ants.count = visible; leaves.count = nLeaf;
      ants.instanceMatrix.needsUpdate = true; leaves.instanceMatrix.needsUpdate = true; leaves.instanceColor.needsUpdate = true;
    },
    dispose() { if (object.parent) object.parent.remove(object); ants.dispose(); leaves.dispose(); },
  };
};

export const ANIMALS = {
  leafcutter: ANIM.leafcutter,
  orchidbee: ANIM.orchidbee,
  morpho: ANIM.morpho,
  hummingbird: ANIM.hummingbird,
  dartfrog: ANIM.dartfrog,
  toucan: ANIM.toucan,
  macaw: ANIM.macaw,
  sloth: ANIM.sloth,
  agouti: ANIM.agouti,
  howler: ANIM.howler,
  jaguar: ANIM.jaguar,
  harpy: ANIM.harpy,
  capybara: ANIM.capybara,
  tapir: ANIM.tapir,
  fruitbat: ANIM.fruitbat,
};

// Called by the zone pack when its zone closes: frees the cached geometry / materials (rebuilt on the next visit).
export function releaseCaches() {
  disposeDeep([_specCache, _antGeo, _leafGeo, _moundGeo]); _specCache.clear(); _moundGeo.clear(); _antGeo = null; _leafGeo = null;
  releaseMaterials('amzA:');
}
