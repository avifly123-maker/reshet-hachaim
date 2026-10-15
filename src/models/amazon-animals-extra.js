// Amazon animals — EXTRA species (anteater, kinkajou, coati).
// Same contract & conventions as src/models/amazon-animals.js (CONTRACT.md §4): AnimalVisual with
// actions / speeds / gripY extras. amazon-animals.js exports only ANIMALS, so the geometry toolkit,
// rig assembly and quadruped animator below are copied verbatim from it (keep in sync if the style changes).
//   anteater : ground quadruped – idle, walk, run, eat (snout down, tongue-flick bob), sleep (curled under its tail)
//   kinkajou : arboreal – idle, walk, run, eat, sleep, perch (on a branch, feet at gripY.perch), climb, hang (by the tail,
//              grip = tail top at gripY.hang, branch along Z)
//   coati    : ground + trees – idle, walk, run, eat (rooting with the snout), sleep, climb
import * as THREE from 'three';
import { makeRng, clamp, lerp, damp, smoothstep, mergeGeometries, cachedMaterial, disposeDeep, releaseMaterials } from '../core/util.js';

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
    // (extra-file change) forget the calibration pose: fresh damped params + animator-specific reset
    st.P = poser();
    if (st.reset) st.reset();
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
const legRings = (top, pts, radii, opts = {}) => pts.map((p, i) => ({ p: [top[0] + p[0], top[1] + p[1], top[2] + p[2]], rx: radii[i][0], ry: radii[i][1] }));

// ═══════════════════════════════════════════════════════════════════════════════════
// Species geometry
// ═══════════════════════════════════════════════════════════════════════════════════

// ─── GIANT ANTEATER ─────────────────────────────────────────────────────────────────
// Long tubular snout, huge bushy flag of a tail, grey coat with the black, white-edged diagonal shoulder stripe,
// pale forelegs with a black wrist band (walks on its knuckles).
function anteaterSpec(v) {
  const rng = makeRng(1101 + v);
  const grey = col(['#857b6e', '#7e7468', '#8a8073'][v]), pale = col('#a89e90'), rear = col('#4e463f'), black = col('#1c1916'), white = col('#ece6da');
  // diagonal stripe: centre line runs from the chest (low, front) up and back over the shoulder, narrowing to a point
  const stripe = (i) => {
    const zc = 0.33 - (i.y - 0.36) * 0.95;
    const u = i.z - zc;
    const w = 0.025 + 0.065 * smoothstep(0.9, 0.45, i.y);
    const a = Math.abs(u);
    return a < w ? 2 : a < w + 0.035 ? 1 : 0;
  };
  const coat = (i) => {
    let c = mixc(pale, grey, smoothstep(0.35, 0.0, i.z));
    c.lerp(rear, smoothstep(-0.05, -0.45, i.z) * 0.75);
    c.lerp(rear, clamp(i.ny) * 0.2);
    const s = stripe(i);
    if (s === 2) c = black.clone(); else if (s === 1) c = white.clone();
    return jl(c, rng, 0.06);
  };
  const bodyR = [
    { p: [0, 0.53, -0.5], rx: 0.06, ry: 0.07 },
    { p: [0, 0.55, -0.43], rx: 0.15, ry: 0.19 },
    { p: [0, 0.56, -0.25], rx: 0.185, ry: 0.24, fb: 0.9 },
    { p: [0, 0.56, -0.02], rx: 0.175, ry: 0.245, fb: 0.85 },
    { p: [0, 0.58, 0.2], rx: 0.17, ry: 0.255 },
    { p: [0, 0.61, 0.33], rx: 0.14, ry: 0.21 },
    { p: [0, 0.64, 0.43], rx: 0.095, ry: 0.13 },
  ];
  // shaggy dorsal crest
  const body = paintVerts(L(bodyR, { seg: 12, sub: 3, jit: 0.025, rng }), coat);
  const crest = paintVerts(L([[0, 0.79, 0.3], [0, 0.82, 0.1], [0, 0.82, -0.12], [0, 0.8, -0.32], [0, 0.73, -0.46]].map((p, i) => ({ p, rx: 0.03, ry: [0.02, 0.04, 0.045, 0.04, 0.02][i] })), { seg: 5, sub: 2, jit: 0.4, rng }), (i) => jl(mixc(grey, rear, smoothstep(0.1, -0.4, i.z)), rng, 0.08));
  // head + neck + long tube snout (slightly down-curved)
  const hp = [0, 0.63, 0.42];
  const headR = [
    { p: [0, 0.65, 0.38], rx: 0.1, ry: 0.13 },
    { p: [0, 0.63, 0.5], rx: 0.085, ry: 0.1 },
    { p: [0, 0.61, 0.62], rx: 0.072, ry: 0.082 },
    { p: [0, 0.58, 0.76], rx: 0.05, ry: 0.054 },
    { p: [0, 0.54, 0.9], rx: 0.036, ry: 0.039 },
    { p: [0, 0.5, 1.02], rx: 0.027, ry: 0.029 },
    { p: [0, 0.475, 1.1], rx: 0.021, ry: 0.021 },
  ];
  const headG = paintVerts(L(headR, { seg: 9, sub: 2, cap1: 0.7 }), (i) => {
    if (i.z > 1.07) return black;
    if (i.z < 0.55 && i.ny < -0.25) return black;     // black throat patch (continues the stripe)
    return jl(mixc(pale, mixc(grey, rear, 0.5), smoothstep(0.6, 1.05, i.z)), rng, 0.04);
  });
  const ear = (s) => paintFaces(xf(ball(0.032, 0.03, 0.014, 6, 4), [s * 0.06, 0.69, 0.56], [0, s * 0.5, s * -0.3]), (i) => (i.nz > 0.2 ? col('#6a6058') : grey));
  const head = mergeGeometries([headG, ear(1), ear(-1), ...eyes(0.017, [0.058, 0.645, 0.655], '#120e0c', null, 0.5)]);
  // legs: pale forelegs with black wrist band + dark curled hand (knuckle walking); dark hind legs
  const legF = (s) => paintVerts(L(legRings([s * 0.12, 0.5, 0.28], [[0, 0, 0], [0, -0.18, 0.02], [0, -0.36, 0.03], [0, -0.46, 0.05], [0, -0.5, 0.1]],
    [[0.085, 0.1], [0.068, 0.072], [0.056, 0.056], [0.062, 0.05], [0.055, 0.032]]), { seg: 7, up: [0, 0, 1], sub: 2, cap1: 0.9 }), (i) => {
    if (i.y < 0.07) return col('#2a2420');
    if (i.y < 0.17) return black;
    return jl(mixc(white, pale, smoothstep(0.2, 0.45, i.y)), rng, 0.05);
  });
  const legH = (s) => paintVerts(L(legRings([s * 0.12, 0.5, -0.32], [[0, 0, 0], [0, -0.18, -0.04], [0, -0.36, -0.05], [0, -0.47, 0.0], [0, -0.5, 0.06]],
    [[0.1, 0.13], [0.075, 0.085], [0.055, 0.058], [0.055, 0.05], [0.06, 0.03]]), { seg: 7, up: [0, 0, 1], sub: 2, cap1: 0.9 }), (i) => jl(mixc(rear, black, smoothstep(0.35, 0.05, i.y)), rng, 0.06));
  // tail: tall, laterally flat, shaggy flag (long hair hangs below)
  const tailR = [
    { p: [0, 0.62, -0.42], rx: 0.06, ry: 0.09 },
    { p: [0, 0.63, -0.55], rx: 0.065, ry: 0.15, fb: 1.1 },
    { p: [0, 0.6, -0.75], rx: 0.062, ry: 0.22, fb: 1.25 },
    { p: [0, 0.54, -0.95], rx: 0.055, ry: 0.235, fb: 1.3 },
    { p: [0, 0.47, -1.13], rx: 0.045, ry: 0.19, fb: 1.25 },
    { p: [0, 0.42, -1.27], rx: 0.03, ry: 0.11 },
    { p: [0, 0.4, -1.33], rx: 0.014, ry: 0.035 },
  ];
  const tail = paintVerts(L(tailR, { seg: 10, sub: 2, jit: 0.25, rng, cap1: 0.6 }), (i) => {
    const under = smoothstep(-0.1, -0.7, i.ny);
    return jl(mixc(mixc(grey, rear, 0.55), col('#3e3832'), under * 0.8 + smoothstep(-0.8, -1.3, i.z) * 0.3), rng, 0.1);
  });
  return {
    parts: [
      { name: 'body', geo: mergeGeometries([body, crest]), pivot: [0, 0.56, -0.05], mat: 'fur' },
      { name: 'head', geo: head, pivot: hp, parent: 'body', mat: 'fur' },
      { name: 'fl', geo: legF(1), pivot: [0.12, 0.5, 0.28], parent: 'body', mat: 'fur' },
      { name: 'fr', geo: legF(-1), pivot: [-0.12, 0.5, 0.28], parent: 'body', mat: 'fur' },
      { name: 'hl', geo: legH(1), pivot: [0.12, 0.5, -0.32], parent: 'body', mat: 'fur' },
      { name: 'hr', geo: legH(-1), pivot: [-0.12, 0.5, -0.32], parent: 'body', mat: 'fur' },
      { name: 'tail', geo: tail, pivot: [0, 0.62, -0.44], parent: 'body', mat: 'fur' },
    ],
  };
}

// ─── KINKAJOU ───────────────────────────────────────────────────────────────────────
// Golden-brown, round face with big night eyes and small low ears, short legs, long prehensile tail (hook at the tip).
function kinkajouSpec(v) {
  const rng = makeRng(1201 + v);
  const fur = col(['#c48a3c', '#bb8236', '#cc9444'][v]), back = col('#a06a2a'), belly = col('#e2b878'), dark = col('#5a3818');
  const furF = (i) => jl(i.ny < -0.5 ? mixc(fur, belly, 0.7) : mixc(fur, back, clamp(i.ny * 0.9)), rng, 0.07);
  const bodyR = [
    { p: [0, 0.3, -0.27], rx: 0.06, ry: 0.06 },
    { p: [0, 0.31, -0.22], rx: 0.11, ry: 0.11 },
    { p: [0, 0.32, -0.08], rx: 0.125, ry: 0.125 },
    { p: [0, 0.33, 0.06], rx: 0.118, ry: 0.12 },
    { p: [0, 0.35, 0.15], rx: 0.095, ry: 0.095 },
    { p: [0, 0.37, 0.21], rx: 0.065, ry: 0.07 },
  ];
  const body = paintVerts(L(bodyR, { seg: 10, sub: 2, jit: 0.08, rng }), furF);
  const hp = [0, 0.38, 0.2];
  const skull = paintVerts(ball(0.098, 0.09, 0.09, 10, 7, [0, 0.41, 0.27]), (i) => (i.ny < -0.5 ? jl(belly, rng, 0.04) : furF(i)));
  const muzzle = paintVerts(ball(0.05, 0.042, 0.055, 8, 5, [0, 0.385, 0.34]), (i) => jl(mixc(fur, dark, 0.35), rng, 0.04));
  const nose = solid(ball(0.02, 0.016, 0.014, 6, 4, [0, 0.392, 0.392]), '#2a1a10');
  const ear = (s) => paintFaces(xf(ball(0.03, 0.028, 0.012, 6, 4), [s * 0.082, 0.465, 0.245], [-0.2, s * 0.4, s * -0.5]), (i) => (i.nz > 0.2 ? col('#7a4a20') : fur));
  const head = mergeGeometries([skull, muzzle, nose, ear(1), ear(-1), ...eyes(0.021, [0.044, 0.428, 0.335], '#1a0e06', '#050302', 0.9)]);
  const limb = (x, y, z, len, r) => paintVerts(L(legRings([x, y, z], [[0, 0, 0], [0, -len * 0.5, 0.01], [0, -len * 0.92, 0.0], [0, -len, 0.025]],
    [[r, r], [r * 0.75, r * 0.75], [r * 0.6, r * 0.6], [r * 0.7, r * 0.45]]), { seg: 6, up: [0, 0, 1], sub: 2, cap1: 0.8 }), (i) => (i.y < y - len * 0.8 ? jl(dark, rng, 0.05) : furF(i)));
  // tail along -Z with a slight droop and a hooked tip (prehensile)
  const tailR = [[0, 0.31, -0.23], [0, 0.3, -0.36], [0, 0.285, -0.5], [0, 0.27, -0.64], [0, 0.265, -0.76], [0, 0.28, -0.85], [0, 0.315, -0.88], [0, 0.34, -0.86]]
    .map((p, i, a) => ({ p, rx: lerp(0.048, 0.017, i / (a.length - 1)), ry: lerp(0.048, 0.017, i / (a.length - 1)) }));
  const tail = paintVerts(L(tailR, { seg: 7, sub: 2, cap1: 0.8 }), (i) => jl(mixc(mixc(fur, back, 0.4), dark, smoothstep(-0.6, -0.88, i.z) * 0.6), rng, 0.06));
  return {
    parts: [
      { name: 'body', geo: body, pivot: [0, 0.32, -0.05], mat: 'fur' },
      { name: 'head', geo: head, pivot: hp, parent: 'body', mat: 'fur' },
      { name: 'fl', geo: limb(0.075, 0.3, 0.12, 0.3, 0.042), pivot: [0.075, 0.3, 0.12], parent: 'body', mat: 'fur' },
      { name: 'fr', geo: limb(-0.075, 0.3, 0.12, 0.3, 0.042), pivot: [-0.075, 0.3, 0.12], parent: 'body', mat: 'fur' },
      { name: 'hl', geo: limb(0.08, 0.3, -0.16, 0.3, 0.05), pivot: [0.08, 0.3, -0.16], parent: 'body', mat: 'fur' },
      { name: 'hr', geo: limb(-0.08, 0.3, -0.16, 0.3, 0.05), pivot: [-0.08, 0.3, -0.16], parent: 'body', mat: 'fur' },
      { name: 'tail', geo: tail, pivot: [0, 0.31, -0.23], parent: 'body', mat: 'fur' },
    ],
  };
}

// ─── SOUTH AMERICAN COATI ───────────────────────────────────────────────────────────
// Reddish-brown, long mobile up-turned snout, pale eye marks, dark legs, long ringed tail held upright.
function coatiSpec(v) {
  const rng = makeRng(1301 + v);
  const fur = col(['#a8582c', '#9e5228', '#b0602f'][v]), back = col('#7a3c1c'), belly = col('#d9a876'), dark = col('#33221a'), face = col('#4a3224'), white = col('#efe4d2');
  const ringL = col('#c9965e'), ringD = col('#3e2414');
  const furF = (i) => jl(i.ny < -0.55 ? belly : mixc(fur, back, clamp(i.ny * 0.9)), rng, 0.08);
  const bodyR = [
    { p: [0, 0.3, -0.25], rx: 0.05, ry: 0.05 },
    { p: [0, 0.31, -0.21], rx: 0.1, ry: 0.11 },
    { p: [0, 0.315, -0.08], rx: 0.115, ry: 0.12 },
    { p: [0, 0.305, 0.06], rx: 0.1, ry: 0.11 },
    { p: [0, 0.315, 0.15], rx: 0.08, ry: 0.09 },
    { p: [0, 0.34, 0.21], rx: 0.055, ry: 0.06 },
  ];
  const body = paintVerts(L(bodyR, { seg: 10, sub: 2, jit: 0.07, rng }), furF);
  const hp = [0, 0.34, 0.2];
  const headR = [
    { p: [0, 0.35, 0.19], rx: 0.058, ry: 0.06 },
    { p: [0, 0.372, 0.25], rx: 0.066, ry: 0.062 },
    { p: [0, 0.355, 0.31], rx: 0.048, ry: 0.044 },
    { p: [0, 0.335, 0.37], rx: 0.03, ry: 0.028 },
    { p: [0, 0.322, 0.42], rx: 0.02, ry: 0.019 },
    { p: [0, 0.326, 0.455], rx: 0.015, ry: 0.014 },
  ];
  const ex = 0.04, ey = 0.388, ez = 0.29;
  const headG = paintVerts(L(headR, { seg: 9, sub: 2, cap1: 0.6 }), (i) => {
    if (i.z > 0.445) return col('#1a120c');
    const de = Math.hypot(Math.abs(i.x) - ex, i.y - ey, i.z - ez);
    if (de < 0.03 && i.ny > -0.3) return white;                         // pale eye marks
    if (i.ny < -0.5 && i.z > 0.25) return mixc(white, face, 0.35);      // pale muzzle underside
    return jl(i.z > 0.3 ? face : mixc(fur, face, 0.5), rng, 0.05);
  });
  const nose = solid(ball(0.017, 0.014, 0.012, 6, 4, [0, 0.33, 0.458]), '#120c08');
  const ear = (s) => paintFaces(xf(ball(0.022, 0.024, 0.01, 6, 4), [s * 0.04, 0.428, 0.215], [-0.2, s * 0.3, s * -0.3]), (i) => (Math.hypot(i.x - s * 0.04, i.y - 0.428) > 0.017 ? white : face));
  const head = mergeGeometries([headG, nose, ear(1), ear(-1), ...eyes(0.013, [ex, ey, ez + 0.012], '#120a06', null, 0.8)]);
  const limb = (x, y, z, len, r, hind) => paintVerts(L(legRings([x, y, z], hind
    ? [[0, 0, 0], [0, -len * 0.45, -0.03], [0, -len * 0.85, -0.02], [0, -len, 0.03]]
    : [[0, 0, 0], [0, -len * 0.5, 0.01], [0, -len * 0.9, 0.0], [0, -len, 0.03]],
  [[r, r * 1.2], [r * 0.7, r * 0.75], [r * 0.55, r * 0.55], [r * 0.65, r * 0.4]]), { seg: 6, up: [0, 0, 1], sub: 2, cap1: 0.8 }), (i) => jl(mixc(dark, back, smoothstep(y - len * 0.4, y, i.y) * 0.7), rng, 0.06));
  // tail: rises from the rump, held upright with a slight forward curl; crisp rings
  const tailPts = [[0, 0.33, -0.22], [0, 0.4, -0.3], [0, 0.52, -0.335], [0, 0.66, -0.33], [0, 0.78, -0.3], [0, 0.87, -0.255], [0, 0.91, -0.21]];
  const tailR = tailPts.map((p, i, a) => ({ p, rx: lerp(0.042, 0.016, i / (a.length - 1)), ry: lerp(0.042, 0.016, i / (a.length - 1)) }));
  const tail = paintFaces(L(tailR, { seg: 7, sub: 4, cap1: 0.8 }), (i) => {
    const k = clamp((i.y - 0.36) / 0.55);
    if (i.y > 0.88) return ringD;
    return jl(Math.sin(k * PI * 13) > -0.1 ? ringL : ringD, rng, 0.05);
  }, false);
  return {
    parts: [
      { name: 'body', geo: body, pivot: [0, 0.31, -0.04], mat: 'fur' },
      { name: 'head', geo: head, pivot: hp, parent: 'body', mat: 'fur' },
      { name: 'fl', geo: limb(0.06, 0.27, 0.1, 0.27, 0.036), pivot: [0.06, 0.27, 0.1], parent: 'body', mat: 'fur' },
      { name: 'fr', geo: limb(-0.06, 0.27, 0.1, 0.27, 0.036), pivot: [-0.06, 0.27, 0.1], parent: 'body', mat: 'fur' },
      { name: 'hl', geo: limb(0.065, 0.28, -0.16, 0.28, 0.048, true), pivot: [0.065, 0.28, -0.16], parent: 'body', mat: 'fur' },
      { name: 'hr', geo: limb(-0.065, 0.28, -0.16, 0.28, 0.048, true), pivot: [-0.065, 0.28, -0.16], parent: 'body', mat: 'fur' },
      { name: 'tail', geo: tail, pivot: [0, 0.33, -0.22], parent: 'body', mat: 'fur' },
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════════
// Species definitions (geometry + animation)
// ═══════════════════════════════════════════════════════════════════════════════════
const QUAD_ACTIONS = ['idle', 'walk', 'run', 'eat', 'sleep'];
function quadSpec(id, specFn, opts) {
  const v = ((opts && opts.seed) || 0) % 3;
  return getSpec('x-' + id + v, () => specFn(v));
}

// anteater: plain quadruped; eat = snout to the ground with quick tongue-flick bobs; sleeps curled under its tail
function anteater(opts) {
  const spec = quadSpec('anteater', anteaterSpec, opts);
  const size = new V3(); spec.box.getSize(size);
  const cfg = {
    legLen: 0.5, walkAmp: 0.3, runAmp: 0.62, walkSpeed: 0.6, runSpeed: 2.8, maxFreq: 3, lift: 0.16,
    sleepLeg: [-1.35, -1.35, -1.2, -1.2], sleepFold: [0.4, 0.4, 0.45, 0.45], sleepDrop: 0.26, sleepRoll: 0.18, sleepHeadPitch: 0.55, sleepHeadYaw: 1.0,
    sleepTailYaw: 1.25, sleepTailPitch: 0.35, eatPitch: 0.7, tailRate: 0.7, tailLift: 0.15,
    map: { perch: 'idle', climb: 'walk', hang: 'idle', fly: 'run', glide: 'run', hover: 'idle', swim: 'walk', sit: 'idle' },
    extra: (N, p) => {
      // tongue-flicking bob while feeding; slow snout sniff-sway otherwise
      N.head.rotation.x += p.et * 0.07 * Math.sin(p.t * 14) - (1 - p.et) * (1 - p.sl) * 0.04 * Math.sin(p.t * 0.9);
      N.head.rotation.y += (1 - p.sl) * (1 - p.gw) * 0.05 * Math.sin(p.t * 3.1);
      // sleeping: the big tail drapes over the body like a blanket
      N.tail.rotation.z = p.sl * 0.9;
    },
  };
  return makeVisual('anteater', spec, opts, { scale: 2.0 / size.z, actions: QUAD_ACTIONS, speeds: { walk: cfg.walkSpeed, run: cfg.runSpeed } }, quadAnimator(cfg));
}

// kinkajou: walks along branches / ground, climbs trunks, hangs by its tail (often feeding), sleeps curled up
function kinkajou(opts) {
  const spec = quadSpec('kinkajou', kinkajouSpec, opts);
  const size = new V3(); spec.box.getSize(size);
  return makeVisual('kinkajou', spec, opts, {
    scale: 0.95 / size.z, actions: ['idle', 'walk', 'run', 'eat', 'sleep', 'perch', 'climb', 'hang'], speeds: { walk: 0.6, run: 2.0 },
    gripY: { perch: 0 }, calib: [['hang', ['tail'], 'max']], calibOffset: { hang: 0.02 },
  }, (N, inner, st) => {
    const { body, head, tail } = N, limbs = LEGS.map((k) => N[k]);
    const base = body.userData.base.clone();
    let support = 'ground';
    st.reset = () => { support = 'ground'; };
    return (dt, action, speed) => {
      const P = st.P;
      let a = action;
      if (a === 'fly' || a === 'glide' || a === 'hover') a = 'hang';
      if (a === 'swim') a = 'walk';
      if (a === 'walk' || a === 'run' || a === 'perch') support = 'ground';
      else if (a === 'hang' || a === 'climb') support = a;
      const sup = a === 'sleep' ? 'ground' : support;
      const moving = a === 'walk' || a === 'run' || a === 'climb';
      const sp = speed == null || speed <= 0.01 ? (a === 'run' ? 2.0 : a === 'climb' ? 0.4 : 0.6) : speed;
      const hang = P('hang', sup === 'hang' ? 1 : 0, dt, 3);
      const climb = P('climb', sup === 'climb' ? 1 : 0, dt, 3);
      const gw = P('gw', moving ? 1 : 0, dt, 5);
      const run = P('run', a === 'run' ? 1 : 0, dt, 4);
      const sl = P('sl', a === 'sleep' ? 1 : 0, dt, 2);
      const et = P('et', a === 'eat' ? 1 : 0, dt, 4);
      const si = et * (1 - hang) * (1 - climb);          // eating on a branch/ground: sits up holding fruit
      const amp = lerp(0.5, 0.85, run);
      if (gw > 0.01) st.ph += dt * TAU * clamp(sp / (4 * 0.3 * Math.sin(amp)), 0.6, 4.5);
      const t = st.t, ph = st.ph;
      const bob = gw * (1 - climb) * 0.012 * Math.cos(2 * ph);
      body.position.set(0,
        base.y + bob - sl * 0.15 - si * 0.04 + hang * (-0.78 - base.y + Math.sin(t * 0.9) * 0.01) + climb * 0.25,
        base.z + climb * -0.3);
      body.rotation.set(hang * PI / 2 + climb * -PI / 2 - si * 0.85 + gw * run * 0.08 * Math.sin(ph), 0, sl * 0.15 + hang * Math.sin(t * 0.8) * 0.06);
      for (let i = 0; i < 4; i++) {
        const front = i < 2, s = i % 2 ? -1 : 1;
        const off = (front ? [0.25, 0.75] : [0, 0.5])[i % 2] * TAU + (run > 0.5 ? (front ? 0 : PI) : 0);
        let rx = gw * amp * Math.sin(ph + off), rz = 0;
        let sy = 1 - gw * 0.15 * Math.max(0, -Math.cos(ph + off)) - sl * 0.35;
        if (front) {
          rx += hang * -1.35 + climb * -0.55 + sl * -1.2 + si * -0.35;
          rz = s * (hang * 0.25 + si * 0.35);
          if (et > 0.01) rx += Math.sin(t * 4 + i) * 0.12 * et;   // hands to the mouth
          sy -= si * 0.3;
        } else {
          rx += hang * 1.3 + climb * 0.25 + sl * 1.2 + si * 0.85;
          rz = s * (hang * 0.2 + si * 0.25);
        }
        limbs[i].rotation.set(rx, 0, rz);
        limbs[i].scale.y = sy;
      }
      head.rotation.set(hang * -1.0 + climb * 0.5 + si * 0.75 + sl * 0.55 + et * 0.08 * Math.sin(t * 7) + gw * 0.05 * Math.sin(2 * ph),
        (1 - sl) * (1 - gw * 0.6) * 0.45 * wave(t + st.seed * 10, 0.33, 0.8, 1.7) + sl * 0.7, 0);
      tail.rotation.set(-0.06 * (1 - hang) * (1 - climb) + gw * (1 - climb) * 0.05 * Math.sin(ph) + sl * -0.1 + si * 0.75,
        (1 - hang) * (1 - climb) * ((1 - sl) * 0.3 * Math.sin(t * 0.7 + 1) + sl * 1.5), hang * 0.08 * Math.sin(t * 0.8));
      body.scale.setScalar(1 + Math.sin(t * (sl > 0.5 ? 1.3 : 2.2)) * 0.01);
    };
  });
}

// coati: quadruped with upright ringed tail; eat = rooting with the snout; climb = vertical on a trunk
function coati(opts) {
  const spec = quadSpec('coati', coatiSpec, opts);
  const size = new V3(); spec.box.getSize(size);
  const cfg = {
    legLen: 0.27, walkAmp: 0.42, runAmp: 0.78, walkSpeed: 0.7, runSpeed: 3.2, maxFreq: 4.5, lift: 0.22,
    sleepLeg: [-1.4, -1.4, -1.3, -1.3], sleepFold: [0.4, 0.4, 0.45, 0.45], sleepDrop: 0.15, sleepRoll: 0.1, sleepHeadPitch: 0.55, sleepHeadYaw: 0.9,
    sleepTailYaw: 1.2, sleepTailPitch: -1.35, eatPitch: 0.75, tailRate: 1.1, tailLift: -0.35,
    map: { perch: 'idle', hang: 'idle', fly: 'run', glide: 'run', hover: 'idle', swim: 'walk', sit: 'idle' },
    extra: (N, p) => {
      // busy snout: rooting wiggle while eating, sniffing while idle
      N.head.rotation.z = p.et * 0.12 * Math.sin(p.t * 11) + (1 - p.gw) * (1 - p.sl) * 0.04 * Math.sin(p.t * 6.3);
      N.head.rotation.x += p.et * 0.05 * Math.sin(p.t * 8);
    },
  };
  const animator = quadAnimator(cfg);
  return makeVisual('coati', spec, opts, { scale: 1.0 / size.z, actions: [...QUAD_ACTIONS, 'climb'], speeds: { walk: cfg.walkSpeed, run: cfg.runSpeed } }, (N, inner, st) => {
    const upd = animator(N, inner, st);
    const { body, tail, head } = N, base = body.userData.base.clone();
    return (dt, action, speed, night) => {
      const climbing = action === 'climb';
      upd(dt, climbing ? 'walk' : action, climbing ? (speed || 0.35) : speed, night);
      const cl = st.P('cl', climbing ? 1 : 0, dt, 4);
      body.rotation.x += cl * -PI / 2;
      body.position.y += cl * 0.22;
      body.position.z = base.z + cl * -0.28;
      tail.rotation.x = lerp(tail.rotation.x, -1.25, cl);
      head.rotation.x -= cl * 0.35;
    };
  });
}

export const ANIMALS_EXTRA = { anteater, kinkajou, coati };

// Called by the zone pack when its zone closes: frees the cached geometry / materials (rebuilt on the next visit).
export function releaseCaches() { disposeDeep(_specCache); _specCache.clear(); releaseMaterials('amzA:'); }
