// Amazon plant models for "רשת החיים" — procedural, cached per species+variant, one shader-driven material per instance.
// Every PlantVisual: growth / health / bloom / fruit / night-glow / sway are driven by uniforms of a single per-instance
// material (geometry is shared by all instances of a species variant). Flowers & fruit live in the same merged geometry
// but are revealed (scaled in from their own centres) by uBloom / uFruit, so they toggle without extra draw calls.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeRng, hashString, clamp, lerp, smoothstep, jitterColor, disposeDeep } from '../core/util.js';

const V3 = THREE.Vector3;
const TAU = Math.PI * 2;

// ───────────────────────────── shader-driven plant material ─────────────────────────────
// Custom attributes on every plant geometry:
//   aC  vec4  xyz = centre of the part (leaf base / flower centre) ; w = rank 0..1 (drop / reveal order)
//   aF  vec4  x = leaf flag (1 = leaf card: droops, 2 = foliage clump: no droop) ; y = reveal channel (1 bloom, 2 fruit, 3 glow)
//             z = late-growth rank (-1 = always) ; w = flutter weight
//   aP  vec3  pivot for late-growth scaling (e.g. buttress roots grow out of the trunk base)
const PLANT_DECL = `
attribute vec4 aC; attribute vec4 aF; attribute vec3 aP; attribute float aS;
uniform float uHealth, uLeafShow, uBloom, uFruit, uLate, uTime, uFlutter, uDroop, uStretch, uH; uniform vec2 uBend;
varying float vLeaf; varying float vRank; varying float vGlow; varying float vY;
`;
const PLANT_VERT = `
#include <begin_vertex>
{
  vec3 cc = aC.xyz; float rk = aC.w; float s = 1.0;
  vLeaf = aF.x; vRank = rk; vGlow = step(2.5, aF.y);
  if (aF.x > 0.5) s *= step(rk, uLeafShow);
  if (aF.y > 0.5 && aF.y < 1.5) s *= smoothstep(rk * 0.75, rk * 0.75 + 0.25, uBloom);
  if (aF.y > 1.5 && aF.y < 2.5) s *= smoothstep(rk * 0.75, rk * 0.75 + 0.25, uFruit);
  transformed = cc + (transformed - cc) * s;
  if (aF.x > 0.5) {
    vec3 d = transformed - cc;
    if (aF.x < 1.5 || aF.x > 2.5) transformed.y -= uDroop * length(d.xz) * 0.55;
    float ph = uTime * 2.1 + cc.x * 0.73 + cc.z * 0.91 + rk * 6.0;
    transformed += vec3(sin(ph), 0.6 * sin(ph * 1.37), cos(ph * 0.83)) * (uFlutter * aF.w * min(length(d), 2.5) * 0.05);
  }
  if (aF.z >= 0.0) { float ls = clamp((uLate - aF.z) / 0.3, 0.0, 1.0); transformed = aP + (transformed - aP) * ls; }
  transformed.y += (uStretch - 1.0) * aS;
  vY = transformed.y;
  float hy = max(transformed.y, 0.0) / uH; transformed.xz += uBend * hy * hy * uH;
}
`;
const PLANT_FRAG_DECL = `
uniform float uHealth, uUnder, uGlow; uniform vec3 uUnderCol, uGlowCol;
varying float vLeaf; varying float vRank; varying float vGlow;
`;
const CLIP_DECL = `
uniform float uClip; varying float vY;
`;
const CLIP_FRAG = `
if (vY > uClip) discard;
#include <clipping_planes_fragment>
`;
const PLANT_FRAG = `
#include <color_fragment>
if (vLeaf > 0.5) {
  float sk = 1.0 - uHealth;
  float r2 = fract(vRank * 7.31 + 0.13);
  float amt = clamp((sk * 1.75 - r2 * 0.9) * 1.6, 0.0, 1.0);
  float l = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
  vec3 yel = vec3(l * 2.3, l * 1.75, l * 0.15);
  vec3 brn = vec3(l * 1.6, l * 0.75, l * 0.25);
  vec3 sick = mix(yel, brn, smoothstep(0.5, 1.0, sk + fract(r2 * 3.7) * 0.4));
  diffuseColor.rgb = mix(diffuseColor.rgb, sick, amt);
  if (!gl_FrontFacing && vLeaf < 1.5 && vLeaf > 0.5) diffuseColor.rgb = mix(diffuseColor.rgb, uUnderCol * (0.6 + l), uUnder);
}
`;
const NORMAL_FIX = `
#include <normal_fragment_begin>
#if defined( DOUBLE_SIDED ) && !defined( FLAT_SHADED )
if (vLeaf > 0.5 && vLeaf < 2.5) normal *= faceDirection;
#endif
`;
const PLANT_EMIT = `
#include <emissivemap_fragment>
{ float gl = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11)); totalEmissiveRadiance += uGlowCol * uGlow * vGlow * (0.08 + 1.1 * gl * gl); }
`;
function plantOBC(shader) {
  Object.assign(shader.uniforms, this.userData.u);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\n' + PLANT_DECL)
    .replace('#include <begin_vertex>', PLANT_VERT);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\n' + PLANT_FRAG_DECL + CLIP_DECL)
    .replace('#include <clipping_planes_fragment>', CLIP_FRAG)
    .replace('#include <color_fragment>', PLANT_FRAG)
    .replace('#include <normal_fragment_begin>', NORMAL_FIX)
    .replace('#include <emissivemap_fragment>', PLANT_EMIT);
}
function depthOBC(shader) {
  Object.assign(shader.uniforms, this.userData.u);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\n' + PLANT_DECL)
    .replace('#include <begin_vertex>', PLANT_VERT);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\n' + CLIP_DECL)
    .replace('#include <clipping_planes_fragment>', CLIP_FRAG);
}

function makeUniforms(look = {}) {
  return {
    uHealth: { value: 1 }, uLeafShow: { value: 1 }, uBloom: { value: 0 }, uFruit: { value: 0 }, uLate: { value: 1 },
    uTime: { value: 0 }, uFlutter: { value: 0.3 }, uDroop: { value: 0 }, uStretch: { value: 1 },
    uH: { value: look.H ?? 10 }, uBend: { value: new THREE.Vector2() }, uClip: { value: 1e6 },
    uUnder: { value: look.under ?? 0.35 }, uUnderCol: { value: new THREE.Color(look.underCol ?? '#9fb98a') },
    uGlow: { value: 0 }, uGlowCol: { value: new THREE.Color(look.glowCol ?? '#55ff9a') },
  };
}
function makePlantMaterials(look = {}) {
  const u = makeUniforms(look);
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: look.roughness ?? 0.82, metalness: 0, side: THREE.DoubleSide,
    flatShading: !!look.flat,
  });
  mat.userData.u = u; mat.onBeforeCompile = plantOBC;
  const depth = new THREE.MeshDepthMaterial({ side: THREE.DoubleSide });
  depth.userData.u = u; depth.onBeforeCompile = depthOBC;
  return { mat, depth, u };
}

// ───────────────────────────── geometry builder ─────────────────────────────
const _c = new THREE.Color(), _v = new V3(), _n = new V3(), _l = new V3();
class GB {
  constructor(rng) { this.rng = rng; this.P = []; this.N = []; this.C = []; this.AC = []; this.AF = []; this.AP = []; this.AS = []; }
  // add any BufferGeometry. o: { m, col, cj:[dh,ds,dl], vj, colFn(color,pos,normal,uv), leaf, rank, centre, reveal, late, pivot,
  //                              flat, outC (Vector3), outK (0..1 outward-normal blend), flutter }
  add(geo, o = {}) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    const loc = o.colLocal ? g.attributes.position.clone() : null;
    if (o.m) g.applyMatrix4(o.m);
    if (o.flat || !g.attributes.normal) { g.deleteAttribute('normal'); g.computeVertexNormals(); }
    const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
    const base = o.col !== undefined ? (o.cj ? jitterColor(o.col, this.rng, ...o.cj) : new THREE.Color(o.col)) : new THREE.Color(1, 1, 1);
    const centre = o.centre || (o.m ? new V3().setFromMatrixPosition(o.m) : new V3());
    const pivot = o.pivot || centre;
    const rank = o.rank ?? this.rng();
    const leaf = o.leaf || 0, reveal = o.reveal || 0, late = o.late ?? -1, flut = o.flutter ?? (leaf ? 1 : 0);
    const uvv = new THREE.Vector2();
    for (let i = 0; i < pos.count; i++) {
      _v.fromBufferAttribute(pos, i); _n.fromBufferAttribute(nor, i);
      if (o.outC) { const k = o.outK ?? 0.6; const out = _v.clone().sub(o.outC).normalize(); _n.lerp(out, k).normalize(); }
      if (o.nRef) { if (_n.dot(_l.copy(_v).sub(o.nRef)) < 0) _n.negate(); }
      else if (leaf === 1 && o.upN !== false && _n.y < 0) _n.negate();
      _c.copy(base);
      if (o.vj) { const j = 1 + (this.rng() - 0.5) * o.vj; _c.multiplyScalar(j); }
      if (o.colFn) { if (uv) uvv.fromBufferAttribute(uv, i); o.colFn(_c, loc ? _l.fromBufferAttribute(loc, i) : _v, _n, uvv, i); }
      this.P.push(_v.x, _v.y, _v.z); this.N.push(_n.x, _n.y, _n.z); this.C.push(_c.r, _c.g, _c.b);
      this.AC.push(centre.x, centre.y, centre.z, rank); this.AF.push(leaf, reveal, late, flut); this.AP.push(pivot.x, pivot.y, pivot.z);
      const anc = o.anchorY ?? (this.cb != null ? 'self' : 0);
      this.AS.push(anc === 'self' ? Math.min(_v.y, this.cb ?? 1e9) : anc);
    }
    g.dispose();
    return this;
  }
  get tris() { return this.P.length / 9; }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.N, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.C, 3));
    g.setAttribute('aC', new THREE.Float32BufferAttribute(this.AC, 4));
    g.setAttribute('aF', new THREE.Float32BufferAttribute(this.AF, 4));
    g.setAttribute('aP', new THREE.Float32BufferAttribute(this.AP, 3));
    g.setAttribute('aS', new THREE.Float32BufferAttribute(this.AS, 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    // shader-side stretch / sway can push vertices beyond the static bounds → pad to avoid culling pops
    g.boundingSphere.radius *= 1.35;
    return g;
  }
}

// ───────────────────────────── primitives ─────────────────────────────
const M = () => new THREE.Matrix4();
// matrix: translate p, rotate so +Y → dir (and twist), scale s
function orient(p, dir, twist = 0, s = 1) {
  const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), _v.copy(dir).normalize());
  const qt = new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), twist);
  q.multiply(qt);
  const sc = typeof s === 'number' ? new V3(s, s, s) : s;
  return M().compose(p.clone(), q, sc);
}
// Euler-based placement (yaw around Y, pitch around X) for leaves pointing along +Z
function place(p, yaw = 0, pitch = 0, roll = 0, s = 1) {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, roll, 'YXZ'));
  const sc = typeof s === 'number' ? new V3(s, s, s) : s;
  return M().compose(p.clone(), q, sc);
}

// Swept tube along a curve with radius function r(t, angle). Includes uv (t, a).
function sweep(curve, segs, radial, rFn, cap = false) {
  const fr = curve.computeFrenetFrames(segs, false);
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs; const P = curve.getPointAt(t); const N = fr.normals[i], B = fr.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * TAU; const r = rFn(t, a);
      const cx = Math.cos(a), sx = Math.sin(a);
      pos.push(P.x + r * (cx * N.x + sx * B.x), P.y + r * (cx * N.y + sx * B.y), P.z + r * (cx * N.z + sx * B.z));
      uv.push(t, j / radial);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  if (cap) { // close the end with a fan
    const P = curve.getPointAt(1); const c = pos.length / 3; pos.push(P.x, P.y, P.z); uv.push(1, 0);
    const s = segs * (radial + 1);
    for (let j = 0; j < radial; j++) idx.push(s + j, c, s + j + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const curveOf = (pts) => new THREE.CatmullRomCurve3(pts, false, 'centripetal');

// Leaf blade along +Z, face up (+Y). w(t) width profile; bend = tip drop (fraction of len); fold = V-fold of the halves.
function leafBlade(len, wid, { segs = 3, bend = 0.25, fold = 0.25, shape = 'ellipse', curl = 0 } = {}) {
  const pos = [], idx = [];
  const wf = shape === 'lance' ? (t) => Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), 1.2) * (1 - 0.3 * t)
    : shape === 'strap' ? (t) => (t < 0.85 ? 0.85 + 0.15 * Math.sin(t * 3) : (1 - t) / 0.15)
    : shape === 'paddle' ? (t) => Math.pow(Math.sin(Math.PI * t), 0.6)
    : (t) => Math.pow(Math.sin(Math.PI * t), 0.75);
  for (let i = 0; i <= segs; i++) {
    const t = i / segs; const w = wid * 0.5 * Math.max(0, wf(t));
    const z = len * t; const y = -bend * len * t * t;
    const ez = curl * w;
    pos.push(0, y, z, w, y - fold * w, z - ez * 0.2, -w, y - fold * w, z - ez * 0.2);
  }
  for (let i = 0; i < segs; i++) {
    const m0 = i * 3, r0 = m0 + 1, l0 = m0 + 2, m1 = m0 + 3, r1 = m1 + 1, l1 = m1 + 2;
    idx.push(m0, m1, r0, r0, m1, r1, m0, l0, m1, l0, l1, m1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// Lumpy foliage clump (noise displaced icosahedron)
function hash3(x, y, z) { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return s - Math.floor(s); }
function blob(r, detail, amt = 0.25, sy = 1, seed = 0) {
  let g = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    _v.fromBufferAttribute(p, i);
    const d = 1 + amt * (hash3(_v.x * 3.1 + seed, _v.y * 2.7, _v.z * 3.3) - 0.5) * 2;
    p.setXYZ(i, _v.x * r * d, _v.y * r * d * sy, _v.z * r * d);
  }
  g.computeVertexNormals();
  return g;
}
// small ellipsoid / bead
function bead(r, sy = 1, detail = 0) { const g = new THREE.IcosahedronGeometry(r, detail); g.scale(1, sy, 1); return g; }
function octa(r, sy = 1) { const g = new THREE.OctahedronGeometry(r, 0); g.scale(1, sy, 1); return g; }
// star flower: n petals as flat diamonds around +Y
function starFlower(r, n = 5, cup = 0.3) {
  const pos = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, a1 = a - Math.PI / n * 0.8, a2 = a + Math.PI / n * 0.8;
    pos.push(0, 0, 0,
      Math.cos(a2) * r * 0.45, cup * r * 0.3, Math.sin(a2) * r * 0.45,
      Math.cos(a) * r, cup * r, Math.sin(a) * r);
    pos.push(0, 0, 0, Math.cos(a) * r, cup * r, Math.sin(a) * r,
      Math.cos(a1) * r * 0.45, cup * r * 0.3, Math.sin(a1) * r * 0.45);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals(); return g;
}


// ───────────────────────────── shared tree parts ─────────────────────────────
// Organic trunk: tapered tube along a bent curve, bark noise, base flare. cols: [base, top] colours.
function trunkGeo(curve, { r0, r1, segs = 10, radial = 9, flare = 0.6, flareH = 0.08, noise = 0.08, ridges = 0, ridgeAmt = 0.06, cap = true }) {
  return sweep(curve, segs, radial, (t, a) => {
    let r = lerp(r0, r1, Math.pow(t, 0.8));
    r *= 1 + flare * Math.exp(-t / flareH);
    r *= 1 + noise * (hash3(t * 6.1, a * 1.7, r0) - 0.5);
    if (ridges) r *= 1 + ridgeAmt * Math.cos(a * ridges + t * 3);
    return r;
  }, cap);
}
// branch: tapered tube from p0 along dir with an upward/outward arc
function branchCurve(p0, p1, sag = 0.15, rng = Math.random) {
  const mid = p0.clone().lerp(p1, 0.5);
  mid.y += p0.distanceTo(p1) * sag;
  mid.x += (rng() - 0.5) * 0.4; mid.z += (rng() - 0.5) * 0.4;
  return curveOf([p0, mid, p1]);
}
function barkCol(base, dark, rng, streak = 0.18) {
  const b = new THREE.Color(base), d = new THREE.Color(dark);
  return (c, p, n, uv) => {
    const k = hash3(Math.floor(uv.x * 14), Math.floor(uv.y * 9), 1.3) * streak + (1 - uv.x) * 0.25 * streak;
    c.copy(b).lerp(d, clamp(k + 0.15 * Math.max(0, -n.y)));
  };
}
// foliage clump colour: sunlit tops warm/light, undersides deep & cool
function clumpCol(top, bottom, rng, spread = 0.08) {
  const tc = new THREE.Color(top), bc = new THREE.Color(bottom);
  return (c, p, n) => {
    const k = clamp(0.5 + 0.55 * n.y + (hash3(p.x * 1.3, p.y * 1.7, p.z * 1.1) - 0.5) * spread * 4);
    c.copy(bc).lerp(tc, k);
  };
}
// leaf card colour: midrib lighter, base darker
function leafCol(base, rng, { dh = 0.025, ds = 0.08, dl = 0.07, tip = null } = {}) {
  const b = jitterColor(base, rng, dh, ds, dl); const tc = tip ? new THREE.Color(tip) : null;
  return (c, p, n, uv, i) => { c.copy(b); if (tc && (i % 3) !== 0) c.lerp(tc, 0.35); };
}

// Generic young plant: a slender stem with a few leaves (used as the seedling/sapling form of trees).
function seedlingGeo(rng, { h = 1.6, leaves = 5, leafLen = 0.45, leafWid = 0.22, stemCol = '#6d5a3a', leafColor = '#4f8a2e', shape = 'ellipse', palmate = 0 }) {
  const gb = new GB(rng);
  const top = new V3(rng.range(-0.08, 0.08), h, rng.range(-0.08, 0.08));
  const curve = curveOf([new V3(0, 0, 0), new V3(0.03, h * 0.5, -0.02), top]);
  gb.add(trunkGeo(curve, { r0: 0.035 * h, r1: 0.012 * h, segs: 4, radial: 5, flare: 0.3, noise: 0.05 }), { col: stemCol, cj: [0.02, 0.05, 0.05] });
  for (let i = 0; i < leaves; i++) {
    const t = 0.35 + 0.65 * (i / Math.max(1, leaves - 1));
    const p = curve.getPointAt(Math.min(0.98, t));
    const yaw = i * 2.4 + rng.range(-0.3, 0.3);
    const L = leafLen * (0.7 + 0.5 * t);
    if (palmate) {
      for (let k = 0; k < palmate; k++) {
        const a = yaw + (k - (palmate - 1) / 2) * 0.55;
        gb.add(leafBlade(L, leafWid * 0.6, { bend: 0.15, fold: 0.2, shape: 'lance' }), { m: place(p, a, -0.25, 0), col: leafColor, colFn: leafCol(leafColor, rng), leaf: 1, rank: i / leaves * 0.6, centre: p });
      }
    } else {
      gb.add(leafBlade(L, leafWid, { bend: 0.25, fold: 0.22, shape }), { m: place(p, yaw, -0.35 + 0.3 * t, 0), colFn: leafCol(leafColor, rng), leaf: 1, rank: i / leaves * 0.6, centre: p });
    }
  }
  return gb.build();
}

// ───────────────────────────── visual factory ─────────────────────────────
const CACHE = new Map();
function cached(key, build) { if (!CACHE.has(key)) CACHE.set(key, build()); return CACHE.get(key); }

// spec: { geo, seedGeo?, look, H, cb (trunk stretch limit), crown:{top,bottom,radius,density}, attach, perch, trunkR,
//         grow(g) → { s, sxz?, stretch?, late?, seed? (0..1 seedling scale or null) , leaf? },
//         sway (top displacement factor), onUpdate?, onGrowth? }
function makeVisual(spec, opts) {
  const rng = opts.rng || makeRng(opts.seed || 1);
  const { mat, depth, u } = makePlantMaterials({ ...spec.look, H: spec.H });
  const object = new THREE.Group(); object.name = spec.name || 'plant';
  const body = new THREE.Group(); object.add(body);
  const yaw = rng() * TAU, jit = spec.noJitter ? 1 : 0.92 + rng() * 0.16;
  body.rotation.y = yaw;
  const main = new THREE.Mesh(spec.geo, mat); main.customDepthMaterial = depth;
  main.castShadow = main.receiveShadow = true; body.add(main);
  let seed = null;
  if (spec.seedGeo) { seed = new THREE.Mesh(spec.seedGeo, mat); seed.customDepthMaterial = depth; seed.castShadow = seed.receiveShadow = true; seed.visible = false; object.add(seed); seed.rotation.y = yaw; }
  if (spec.extra) for (const m of spec.extra(mat, depth, u, body)) { m.castShadow = m.receiveShadow = true; }
  const st = { g: 1, h: 1, gs: { s: 1, sxz: 1, stretch: 1, late: 1, seed: null, leaf: 1 }, phase: rng() * 10 };
  const cb = spec.cb ?? 0;
  const mapPt = (p) => {
    const q = p.clone();
    q.y = q.y < cb ? q.y * st.gs.stretch : q.y + (st.gs.stretch - 1) * cb;
    body.updateMatrix(); return q.applyMatrix4(body.matrix);
  };
  function applyGrowth() {
    const gs = { s: 1, sxz: null, stretch: 1, late: 1, seed: null, leaf: 1, ...(spec.grow ? spec.grow(st.g) : {}) };
    st.gs = gs;
    const sxz = (gs.sxz ?? gs.s) * jit, sy = gs.s * jit;
    body.scale.set(sxz, sy, sxz);
    u.uStretch.value = gs.stretch; u.uLate.value = gs.late;
    main.visible = gs.seed == null || gs.both === true;
    if (seed) { seed.visible = gs.seed != null; if (seed.visible) seed.scale.setScalar(gs.seed * jit); }
    applyHealth();
    spec.onGrowth && spec.onGrowth(st.g, gs, u);
  }
  function applyHealth() {
    const h = st.h;
    u.uHealth.value = h;
    u.uLeafShow.value = Math.min(st.gs.leaf ?? 1, lerp(0.3, 1.0001, smoothstep(0, 0.85, h)));
    u.uDroop.value = (1 - h) * (spec.droop ?? 0.5);
  }
  const visual = {
    object,
    trunkRadius: (spec.trunkR || 0.05) * jit,
    setGrowth(g) { st.g = clamp(g); applyGrowth(); },
    setHealth(h) { st.h = clamp(h); applyHealth(); },
    setSeason() {},
    setBloom(b) { u.uBloom.value = clamp(b); },
    setFruit(f) { u.uFruit.value = clamp(f); },
    setNightGlow(n) { if (spec.glow) u.uGlow.value = clamp(n) * spec.glow; spec.onGlow && spec.onGlow(n); },
    update(dt, t, wind = 0) {
      u.uTime.value = t;
      const sw = spec.sway ?? 0.01; const w = clamp(wind);
      const a = (0.25 + w) * sw;
      const ph = t * (0.55 + 0.6 * w) + st.phase;
      // wind blows roughly along world +X; express in body-local frame
      const bx = a * (0.6 + 0.4 * Math.sin(ph)) * (0.3 + w) + a * 0.35 * Math.sin(ph * 2.3);
      const bz = a * 0.45 * Math.sin(ph * 1.7 + 1.3);
      const c = Math.cos(-yaw), s = Math.sin(-yaw);
      u.uBend.value.set(bx * c - bz * s, bx * s + bz * c);
      u.uFlutter.value = 0.15 + 0.85 * w;
      spec.onUpdate && spec.onUpdate(dt, t, w, u, body, st);
    },
    crown() {
      if (spec.crownFn) return spec.crownFn(st, u);
      if (st.gs.seed != null && !(st.gs.both)) {
        const c = spec.seedCrown || { top: 1.6, bottom: 0.6, radius: 0.5, density: 0.3 };
        const k = st.gs.seed * jit;
        return { top: c.top * k, bottom: c.bottom * k, radius: c.radius * k, density: c.density };
      }
      const c = spec.crown;
      const top = mapPt(new V3(0, c.top, 0)).y, bottom = mapPt(new V3(0, c.bottom, 0)).y;
      const leafFrac = clamp(u.uLeafShow.value);
      return { top, bottom, radius: c.radius * (st.gs.sxz ?? st.gs.s) * jit, density: c.density * (0.35 + 0.65 * leafFrac) * (spec.crownDensityG ? spec.crownDensityG(st.g) : 1) };
    },
    attachPoints() {
      if (!spec.attach || (st.gs.seed != null && !st.gs.both)) return [];
      const rot = new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), yaw);
      return spec.attach.filter(a => (a.minG ?? 0) <= st.g).map(a => ({ pos: mapPt(a.pos), normal: a.normal.clone().applyQuaternion(rot) }));
    },
    perchPoints() {
      if (!spec.perch || (st.gs.seed != null && !st.gs.both)) return [];
      return spec.perch.filter(p => (p.minG ?? 0) <= st.g).map(p => mapPt(p.pos || p));
    },
    fall(p) { u.uDroop.value = Math.max(u.uDroop.value, p * 0.4); },
    dispose() {
      mat.dispose(); depth.dispose(); // geometry is shared per species variant – kept in cache
      spec.onDispose && spec.onDispose();
      object.removeFromParent();
    },
    _u: u, _mat: mat,
  };
  applyGrowth();
  return visual;
}
const variantOf = (opts) => ((opts.seed >>> 0) || 0) % 3;
const vrng = (name, v) => makeRng(hashString(name) + v * 7919 + 13);

// Plank buttress fin along +X from the trunk: concave top edge, thin, slightly sinuous.
function finGeo(len, h, thick, r0, rng) {
  const n = 6, pos = [];
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n; const x = lerp(r0 * 0.6, len, t);
    const y = h * Math.pow(1 - t, 1.9) + 0.05;
    const z = Math.sin(t * 3.2 + rng() * 0.5) * 0.18 * len * 0.15;
    const th = thick * (1 - 0.75 * t);
    pts.push({ x, y, z, th });
  }
  const quad = (a, b, c, d) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  for (let i = 0; i < n; i++) {
    const A = pts[i], B = pts[i + 1];
    for (const sd of [-1, 1]) {
      const a = [A.x, -0.15, A.z + sd * A.th], b = [B.x, -0.15, B.z + sd * B.th], c = [B.x, B.y, B.z + sd * B.th * 0.5], d = [A.x, A.y, A.z + sd * A.th * 0.5];
      if (sd > 0) quad(a, b, c, d); else quad(a, d, c, b);
    }
    quad([A.x, A.y, A.z + A.th * 0.5], [B.x, B.y, B.z + B.th * 0.5], [B.x, B.y, B.z - B.th * 0.5], [A.x, A.y, A.z - A.th * 0.5]);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return g;
}

// Foliage clump set: list of {p, r, sy} → each clump = a cluster of small lumpy sub-blobs + a fringe of leaf
// triangles, all with normals pointing out from the clump centre (soft, puffy stylised shading) and a
// sun-lit colour gradient (bright warm tops, deep cool undersides).
const _subBlob = [];
function subBlob(i) { if (!_subBlob[i]) _subBlob[i] = blob(1, 0, 0.35, 1, i * 7.3); return _subBlob[i]; }
function addClumps(gb, rng, clumps, { top, bottom, subs = 5, fringe = 8, spread = 0.1, fringeCol = null }) {
  const tc0 = new THREE.Color(top), bc = new THREE.Color(bottom);
  clumps.forEach((c) => {
    const tc = jitterColor(tc0, rng, 0.02, 0.06, 0.05);
    const sy = c.sy ?? 0.6, rank = c.rank ?? (0.05 + rng() * 0.95);
    const colFn = (col, p, n) => {
      const ry = (p.y - c.p.y) / (c.r * sy);
      const k = clamp(0.45 + 0.4 * n.y + 0.25 * ry + (hash3(p.x * 0.9, p.y * 1.3, p.z * 0.7) - 0.5) * spread * 4);
      col.copy(bc).lerp(tc, k);
    };
    const n = c.subs ?? subs;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rng() * 0.8;
      const rr = i === 0 ? 0 : c.r * rng.range(0.38, 0.55);
      const q = c.p.clone().add(new V3(Math.cos(a) * rr, (i === 0 ? 0.15 : rng.range(-0.25, 0.3)) * c.r * sy, Math.sin(a) * rr));
      const br = c.r * (i === 0 ? 0.62 : rng.range(0.45, 0.58));
      const m = M().compose(q, new THREE.Quaternion().setFromEuler(new THREE.Euler(rng() * 0.5, rng() * TAU, 0)), new V3(br, br * Math.min(1, sy * 1.25), br));
      gb.add(subBlob(i % 4), { m, colFn, leaf: 2, rank: Math.min(0.99, rank + i * 0.01), centre: q, outC: c.p, outK: 0.7, flutter: 0.3 });
    }
    // leaf fringe: little triangles poking out of the surface, breaking the silhouette
    const fpos = [];
    const nf = c.fringe ?? fringe;
    for (let i = 0; i < nf; i++) {
      const d = new V3(rng.range(-1, 1), rng.range(-0.55, 1), rng.range(-1, 1)).normalize();
      const base = c.p.clone().add(new V3(d.x * c.r * 0.82, d.y * c.r * sy * 0.82, d.z * c.r * 0.82));
      const t = new V3().crossVectors(d, new V3(0, 1, 0)); if (t.lengthSq() < 0.01) t.set(1, 0, 0); t.normalize();
      const L = c.r * rng.range(0.22, 0.3), W = L * 0.5;
      const dd = d.clone().add(new V3(0, -0.35, 0)).normalize();
      const tip = base.clone().addScaledVector(dd, L), mid = base.clone().addScaledVector(dd, L * 0.45);
      const l = mid.clone().addScaledVector(t, W), r = mid.clone().addScaledVector(t, -W);
      fpos.push(...base.toArray(), ...l.toArray(), ...tip.toArray(), ...base.toArray(), ...tip.toArray(), ...r.toArray());
    }
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fpos, 3)); fg.computeVertexNormals();
    gb.add(fg, { colFn: fringeCol ? (col, p, nn) => { colFn(col, p, nn); col.lerp(new THREE.Color(fringeCol), 0.25); } : colFn, leaf: 2, rank, centre: c.p, outC: c.p, outK: 0.85, flutter: 1 });
  });
}

// ═════════════════════════════ KAPOK (Ceiba pentandra) ═════════════════════════════
function buildKapok(v) {
  const rng = vrng('kapok', v);
  const gb = new GB(rng); const cb = 22 + v; gb.cb = cb;
  const H = 36 + v;
  const lean = new V3(rng.range(-0.6, 0.6), 0, rng.range(-0.6, 0.6));
  const tTop = new V3(lean.x, cb + 7.5, lean.z);
  const trunk = curveOf([new V3(0, -0.3, 0), new V3(lean.x * 0.2, cb * 0.35, lean.z * 0.1), new V3(lean.x * 0.6, cb * 0.75, lean.z * 0.7), tTop]);
  gb.add(trunkGeo(trunk, { r0: 1.0, r1: 0.42, segs: 12, radial: 10, flare: 0.55, flareH: 0.05, noise: 0.07, ridges: 5, ridgeAmt: 0.05 }),
    { colFn: barkCol('#bdb7a8', '#7f7a6c', rng, 0.35) });
  // buttress fins — appear late in life
  const nf = 6;
  for (let i = 0; i < nf; i++) {
    const a = (i / nf) * TAU + rng.range(-0.25, 0.25);
    const g = finGeo(rng.range(3.4, 4.8), rng.range(4.2, 6.2), 0.3, 1.0, rng);
    gb.add(g, { m: M().makeRotationY(a), colFn: barkCol('#b3ad9e', '#7a7466', rng, 0.3), late: 0.55 + i * 0.05, pivot: new V3(0, 0, 0), anchorY: 0 });
  }
  // umbrella crown: main limbs radiating near the top
  const clumps = [], attach = [], perch = [], flowers = [], pods = [];
  const nb = 7;
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * TAU + rng.range(-0.2, 0.2);
    const t0 = 0.9 + rng() * 0.08; const p0 = trunk.getPointAt(t0);
    const R = rng.range(7.5, 9.0); const dir = new V3(Math.cos(a), 0, Math.sin(a));
    const p1 = p0.clone().addScaledVector(dir, R); p1.y = p0.y + rng.range(1.2, 2.6);
    const c = branchCurve(p0, p1, 0.12, rng);
    gb.add(trunkGeo(c, { r0: 0.34, r1: 0.1, segs: 5, radial: 6, flare: 0.25, flareH: 0.1, noise: 0.08 }), { colFn: barkCol('#b2ac9d', '#7d7769', rng, 0.3) });
    attach.push({ pos: c.getPointAt(0.35).add(new V3(0, 0.3, 0)), normal: new V3(0, 1, 0), minG: 0.3 });
    perch.push({ pos: c.getPointAt(0.55).add(new V3(0, 0.25, 0)) });
    // two forks
    for (const sd of [-1, 1]) {
      const q0 = c.getPointAt(rng.range(0.45, 0.65));
      const a2 = a + sd * rng.range(0.35, 0.6); const d2 = new V3(Math.cos(a2), 0, Math.sin(a2));
      const q1 = q0.clone().addScaledVector(d2, rng.range(3.0, 4.2)); q1.y += rng.range(0.6, 1.4);
      const c2 = branchCurve(q0, q1, 0.1, rng);
      gb.add(trunkGeo(c2, { r0: 0.14, r1: 0.05, segs: 3, radial: 4, flare: 0, noise: 0.05, cap: false }), { col: '#9e9888' });
      clumps.push({ p: q1.clone().add(new V3(0, 0.6, 0)), r: rng.range(2.2, 2.8), sy: 0.36 });
      if (sd > 0) attach.push({ pos: c2.getPointAt(0.3).add(new V3(0, 0.15, 0)), normal: new V3(0, 1, 0), minG: 0.5 });
    }
    clumps.push({ p: p1.clone().add(new V3(0, 0.7, 0)), r: rng.range(2.5, 3.1), sy: 0.36 });
    clumps.push({ p: c.getPointAt(0.45).add(new V3(0, 1.3, 0)), r: rng.range(2.2, 2.6), sy: 0.4, rank: 0.1, subs: 2 });
    perch.push({ pos: p1.clone().add(new V3(0, 1.6, 0)), minG: 0.4 });
  }
  clumps.push({ p: tTop.clone().add(new V3(0, 1.4, 0)), r: 2.8, sy: 0.5, rank: 0.02 });
  addClumps(gb, rng, clumps, { top: '#8cbf4a', bottom: '#2e5d26', subs: 4, fringe: 5 });
  // flowers (pale pink-white) on crown tops, pods + cotton below
  for (let i = 0; i < 24; i++) {
    const c = clumps[Math.floor(rng() * clumps.length)]; const a = rng() * TAU, rr = c.r * rng.range(0.4, 1.0);
    const p = c.p.clone().add(new V3(Math.cos(a) * rr, c.r * c.sy * rng.range(0.45, 0.95), Math.sin(a) * rr));
    gb.add(starFlower(0.5, 5, 0.6), { m: orient(p, new V3(rng.range(-0.3, 0.3), 1, rng.range(-0.3, 0.3)), rng() * 3), col: rng() < 0.5 ? '#f0d2cc' : '#e6a3b0', cj: [0.01, 0.05, 0.04], reveal: 1, centre: p });
  }
  for (let i = 0; i < 20; i++) {
    const c = clumps[Math.floor(rng() * clumps.length)]; const a = rng() * TAU, rr = c.r * rng.range(0.3, 0.9);
    const p = c.p.clone().add(new V3(Math.cos(a) * rr, -c.r * c.sy * rng.range(0.6, 0.9), Math.sin(a) * rr));
    const burst = i % 3 === 0;
    gb.add(burst ? octa(0.42, 0.8) : octa(0.22, 2.6), { m: M().setPosition(p), col: burst ? '#f4f1ea' : '#6b5a33', cj: [0.02, 0.05, 0.05], reveal: 2, centre: p });
  }
  return { geo: gb.build(), tris: gb.tris, cb, H, attach: attach.slice(0, 12), perch: perch.slice(0, 14) };
}


function kapok(opts) {
  const v = variantOf(opts);
  const d = cached('kapok' + v, () => buildKapok(v));
  const sd = cached('kapok-seed', () => seedlingGeo(vrng('kapok-s', 0), { h: 1.5, leaves: 4, palmate: 5, leafLen: 0.5, leafWid: 0.22, stemCol: '#7a8a52', leafColor: '#5d9a35' }));
  return makeVisual({
    name: 'kapok', geo: d.geo, seedGeo: sd, H: d.H, cb: d.cb, trunkR: 1.0, sway: 0.006, droop: 0,
    crown: { top: d.H - 0.3, bottom: d.cb + 5.5, radius: 11, density: 0.75 }, attach: d.attach, perch: d.perch, seedCrown: { top: 1.6, bottom: 0.7, radius: 0.5, density: 0.25 },
    grow(g) {
      if (g < 0.1) return { seed: lerp(0.45, 1.2, g / 0.1) };
      const Ht = 2 + 34 * Math.pow(g, 1.1), s = 0.15 + 0.85 * g;
      const stretch = (Ht / s - (d.H - d.cb)) / d.cb;
      return { s, sxz: s * lerp(0.75, 1, g), stretch, late: smoothstep(0.35, 1, g) * 1.15, leaf: lerp(0.5, 1.001, smoothstep(0.1, 0.6, g)) };
    },
  }, opts);
}

// ═════════════════════════════ BRAZIL NUT (Bertholletia excelsa) ═════════════════════════════
function buildBrazil(v) {
  const rng = vrng('brazil', v);
  const gb = new GB(rng); const cb = 21 + v; gb.cb = cb; const H = 32 + v;
  const lean = new V3(rng.range(-0.5, 0.5), 0, rng.range(-0.5, 0.5));
  const tTop = new V3(lean.x, cb + 4.5, lean.z);
  const trunk = curveOf([new V3(0, -0.3, 0), new V3(lean.x * 0.15, cb * 0.4, 0), new V3(lean.x * 0.55, cb * 0.8, lean.z * 0.6), tTop]);
  gb.add(trunkGeo(trunk, { r0: 0.78, r1: 0.4, segs: 12, radial: 10, flare: 0.28, flareH: 0.04, noise: 0.06, ridges: 13, ridgeAmt: 0.045 }),
    { colFn: barkCol('#6f5a45', '#3e3127', rng, 0.45) });
  const clumps = [], attach = [], perch = [];
  const nb = 6;
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * TAU + rng.range(-0.3, 0.3);
    const p0 = trunk.getPointAt(0.8 + rng() * 0.18);
    const R = rng.range(3.0, 4.6); const dir = new V3(Math.cos(a), 0, Math.sin(a));
    const p1 = p0.clone().addScaledVector(dir, R); p1.y += rng.range(3.0, 4.5);
    const c = branchCurve(p0, p1, 0.05, rng);
    gb.add(trunkGeo(c, { r0: 0.26, r1: 0.08, segs: 5, radial: 6, flare: 0.2, flareH: 0.1 }), { colFn: barkCol('#6a5644', '#3c3026', rng, 0.3) });
    attach.push({ pos: c.getPointAt(0.3).add(new V3(0, 0.25, 0)), normal: new V3(0, 1, 0), minG: 0.3 });
    perch.push({ pos: c.getPointAt(0.6).add(new V3(0, 0.2, 0)) });
    clumps.push({ p: p1.clone().add(new V3(0, 0.6, 0)), r: rng.range(2.3, 2.8), sy: 0.72 });
    clumps.push({ p: c.getPointAt(0.55).addScaledVector(dir, 0.6).add(new V3(0, 0.4, 0)), r: rng.range(1.7, 2.1), sy: 0.7 });
    perch.push({ pos: p1.clone().add(new V3(0, 2.0, 0)), minG: 0.4 });
  }
  // cauliflower dome: extra clumps stacked on top
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.4; const p = tTop.clone().add(new V3(Math.cos(a) * 2.2, 3.4 + rng() * 0.8, Math.sin(a) * 2.2));
    clumps.push({ p, r: rng.range(1.9, 2.3), sy: 0.75, rank: 0.1 + rng() * 0.3 });
  }
  clumps.push({ p: tTop.clone().add(new V3(0, 4.6, 0)), r: 2.4, sy: 0.7, rank: 0.03 });
  addClumps(gb, rng, clumps, { top: '#6fa63a', bottom: '#1f4a22', detail: 1, amt: 0.38 });
  // bloom: cream-yellow flower spikes on the crown surface
  for (let i = 0; i < 30; i++) {
    const c = clumps[Math.floor(rng() * clumps.length)];
    const d = new V3(rng.range(-1, 1), rng.range(0.2, 1), rng.range(-1, 1)).normalize();
    const p = c.p.clone().add(new V3(d.x * c.r * 0.95, d.y * c.r * c.sy * 0.95, d.z * c.r * 0.95));
    gb.add(starFlower(0.38, 5, 0.9), { m: orient(p, d, rng() * 3), col: '#e6c43c', cj: [0.02, 0.06, 0.05], reveal: 1, centre: p });
  }
  // fruit: round hard woody pods hanging under the crown
  for (let i = 0; i < 18; i++) {
    const c = clumps[i % 12];
    const a = rng() * TAU; const p = c.p.clone().add(new V3(Math.cos(a) * c.r * 0.6, -c.r * c.sy * 0.85, Math.sin(a) * c.r * 0.6));
    gb.add(bead(0.4, 0.95, 0), { m: M().setPosition(p), col: '#6b4423', cj: [0.02, 0.08, 0.06], vj: 0.15, reveal: 2, centre: p });
    gb.add(new THREE.CylinderGeometry(0.03, 0.04, 0.4, 3, 1, true), { m: M().setPosition(p.clone().add(new V3(0, 0.45, 0))), col: '#4a3a24', reveal: 2, centre: p });
  }
  return { geo: gb.build(), tris: gb.tris, cb, H, attach, perch };
}
function brazilnut(opts) {
  const v = variantOf(opts);
  const d = cached('brazil' + v, () => buildBrazil(v));
  const sd = cached('brazil-seed', () => seedlingGeo(vrng('brazil-s', 0), { h: 1.6, leaves: 7, leafLen: 0.42, leafWid: 0.17, stemCol: '#5b4632', leafColor: '#3f7a2c', shape: 'lance' }));
  return makeVisual({
    name: 'brazilnut', geo: d.geo, seedGeo: sd, H: d.H, cb: d.cb, trunkR: 0.78, sway: 0.007, droop: 0,
    crown: { top: d.H - 0.4, bottom: d.cb + 3.5, radius: 7, density: 0.85 }, attach: d.attach, perch: d.perch,
    grow(g) {
      if (g < 0.1) return { seed: lerp(0.45, 1.2, g / 0.1) };
      const Ht = 2 + 30 * Math.pow(g, 1.15), s = 0.18 + 0.82 * g;
      return { s, sxz: s * lerp(0.8, 1, g), stretch: (Ht / s - (d.H - d.cb)) / d.cb, leaf: lerp(0.5, 1.001, smoothstep(0.1, 0.6, g)) };
    },
  }, opts);
}

// ═════════════════════════════ STRANGLER FIG (Ficus) ═════════════════════════════
function buildFig(v) {
  const rng = vrng('fig', v);
  const gb = new GB(rng); const cb = 14 + v; gb.cb = cb; const H = 24 + v;
  // braided lattice of aerial roots around a hollow core (the vanished host)
  const nr = 9, R0 = 0.95;
  for (let i = 0; i < nr; i++) {
    const a0 = (i / nr) * TAU + rng.range(-0.15, 0.15);
    const turns = rng.sign() * rng.range(0.25, 0.55);
    const pts = [];
    for (let k = 0; k <= 7; k++) {
      const t = k / 7; const y = lerp(-0.2, cb + 1.5, t);
      const a = a0 + turns * TAU * t + Math.sin(t * 9 + i) * 0.12;
      const r = R0 * (1 + 0.9 * Math.pow(1 - t, 4)) * (1 - 0.25 * t) + (k === 0 ? 0.6 : 0);
      pts.push(new V3(Math.cos(a) * r, y, Math.sin(a) * r));
    }
    gb.add(trunkGeo(curveOf(pts), { r0: rng.range(0.2, 0.3), r1: 0.16, segs: 9, radial: 5, flare: 0.5, flareH: 0.05, noise: 0.15 }), { colFn: barkCol('#8d8676', '#5c574b', rng, 0.35) });
  }
  // a few cross-connecting root bridges (fused lattice)
  for (let i = 0; i < 6; i++) {
    const y = rng.range(2, cb - 1); const a = rng() * TAU, b = a + rng.range(0.6, 1.1);
    const r = R0 * 1.02;
    const p0 = new V3(Math.cos(a) * r, y, Math.sin(a) * r), p1 = new V3(Math.cos(b) * r, y + rng.range(-1.2, 1.2), Math.sin(b) * r);
    const mid = p0.clone().lerp(p1, 0.5).multiplyScalar(1.15);
    gb.add(trunkGeo(curveOf([p0, mid, p1]), { r0: 0.11, r1: 0.09, segs: 4, radial: 4, flare: 0, noise: 0.1 }), { col: '#7f786a' });
  }
  // a few dangling aerial roots from the crown
  const clumps = [], attach = [], perch = [], figs = [];
  const nb = 7;
  const top = new V3(0, cb + 1.5, 0);
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * TAU + rng.range(-0.25, 0.25); const dir = new V3(Math.cos(a), 0, Math.sin(a));
    const p0 = top.clone().addScaledVector(dir, 0.6).add(new V3(0, rng.range(-1.5, 0.5), 0));
    const p1 = p0.clone().addScaledVector(dir, rng.range(5.5, 7.5)); p1.y += rng.range(3, 5.5);
    const c = branchCurve(p0, p1, 0.15, rng);
    gb.add(trunkGeo(c, { r0: 0.3, r1: 0.1, segs: 5, radial: 6, flare: 0.25, flareH: 0.1 }), { colFn: barkCol('#8a8373', '#5b564a', rng, 0.3) });
    attach.push({ pos: c.getPointAt(0.3).add(new V3(0, 0.28, 0)), normal: new V3(0, 1, 0), minG: 0.3 });
    perch.push({ pos: c.getPointAt(0.5).add(new V3(0, 0.25, 0)) });
    clumps.push({ p: p1.clone().add(new V3(0, 0.5, 0)), r: rng.range(2.5, 3.1), sy: 0.55 });
    clumps.push({ p: c.getPointAt(0.5).add(new V3(0, 1.5, 0)), r: rng.range(2.1, 2.6), sy: 0.55 });
    perch.push({ pos: p1.clone().add(new V3(0, 1.8, 0)), minG: 0.4 });
    if (i % 2 === 0) { // hanging aerial root
      const q = c.getPointAt(0.65); const L = rng.range(4, 8);
      gb.add(trunkGeo(curveOf([q, q.clone().add(new V3(0.2, -L * 0.5, 0.1)), q.clone().add(new V3(0.1, -L, -0.1))]), { r0: 0.05, r1: 0.025, segs: 4, radial: 3, flare: 0, noise: 0.1, cap: false }), { col: '#9b8f78', anchorY: cb });
    }
    // figs along the branch
    for (let k = 0; k < 6; k++) {
      const q = c.getPointAt(rng.range(0.35, 0.95)).add(new V3(rng.range(-0.35, 0.35), -0.22, rng.range(-0.35, 0.35)));
      figs.push(q);
    }
  }
  clumps.push({ p: top.clone().add(new V3(0, 4.4, 0)), r: 3.0, sy: 0.55, rank: 0.03 });
  addClumps(gb, rng, clumps, { top: '#5d8f34', bottom: '#14361a', amt: 0.34 });
  // figs also peeking from clump bottoms
  for (let i = 0; i < 20; i++) { const c = clumps[i % clumps.length]; const a = rng() * TAU; figs.push(c.p.clone().add(new V3(Math.cos(a) * c.r * 0.7, -c.r * c.sy * 0.75, Math.sin(a) * c.r * 0.7))); }
  figs.forEach((q, i) => gb.add(octa(0.2, 1.15), { m: M().setPosition(q), col: i % 3 ? '#b8342e' : '#e07a2a', cj: [0.03, 0.08, 0.08], reveal: 2, centre: q }));
  return { geo: gb.build(), tris: gb.tris, cb, H, attach, perch };
}
function fig(opts) {
  const v = variantOf(opts);
  const d = cached('fig' + v, () => buildFig(v));
  const sd = cached('fig-seed', () => seedlingGeo(vrng('fig-s', 0), { h: 1.3, leaves: 6, leafLen: 0.38, leafWid: 0.24, stemCol: '#7a6a4c', leafColor: '#3f7432' }));
  return makeVisual({
    name: 'fig', geo: d.geo, seedGeo: sd, H: d.H, cb: d.cb, trunkR: 1.25, sway: 0.008, droop: 0,
    crown: { top: d.H - 0.3, bottom: d.cb + 0.5, radius: 9.5, density: 0.92 }, attach: d.attach, perch: d.perch,
    grow(g) {
      if (g < 0.1) return { seed: lerp(0.45, 1.2, g / 0.1) };
      const Ht = 2 + 22 * Math.pow(g, 1.05), s = 0.17 + 0.83 * g;
      return { s, sxz: s * lerp(0.7, 1, g), stretch: (Ht / s - (d.H - d.cb)) / d.cb, leaf: lerp(0.5, 1.001, smoothstep(0.1, 0.6, g)) };
    },
  }, opts);
}

// ═════════════════════════════ CECROPIA ═════════════════════════════
function ringCol(base, ring, n) {
  const b = new THREE.Color(base), r = new THREE.Color(ring);
  return (c, p, nn, uv) => { const k = Math.pow(Math.abs(Math.sin(uv.x * n * Math.PI)), 14); c.copy(b).lerp(r, k * 0.8 + 0.08 * hash3(uv.x * 40, uv.y * 7, 2)); };
}
// palmate umbrella leaf: lobes radiating from centre, drooping at the tips (built around origin, facing up)
function addPalmate(gb, rng, centre, size, tilt, yaw, rank, col = '#4f8f3a') {
  const nl = 8;
  const m0 = place(centre, yaw, tilt, 0);
  for (let k = 0; k < nl; k++) {
    const a = (k / nl) * TAU;
    const L = size * (0.75 + 0.25 * Math.cos(a * 2) * 0.5 + 0.1 * rng());
    const g = leafBlade(L, size * 0.36, { segs: 3, bend: 0.38, fold: 0.15, shape: 'lance' });
    g.applyMatrix4(M().makeRotationY(a));
    gb.add(g, { m: m0, colFn: leafCol(col, rng, { dl: 0.05 }), leaf: 1, rank, centre });
  }
}
function buildCecropia(v) {
  const rng = vrng('cecropia', v);
  const gb = new GB(rng); const cb = 9 + v; gb.cb = cb; const H = 16 + v * 0.8;
  const lean = new V3(rng.range(-0.6, 0.6), 0, rng.range(-0.6, 0.6));
  const tTop = new V3(lean.x, cb + 2.5, lean.z);
  const trunk = curveOf([new V3(0, -0.2, 0), new V3(lean.x * 0.1, cb * 0.45, lean.z * 0.2), new V3(lean.x * 0.6, cb * 0.85, lean.z * 0.6), tTop]);
  gb.add(trunkGeo(trunk, { r0: 0.3, r1: 0.16, segs: 12, radial: 8, flare: 0.25, flareH: 0.03, noise: 0.03 }), { colFn: ringCol('#d4d1c3', '#8c8a7c', 26) });
  // stilt roots
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + rng() * 0.5; const p0 = new V3(Math.cos(a) * 0.1, 1.1 + rng() * 0.4, Math.sin(a) * 0.1);
    const p1 = new V3(Math.cos(a) * 0.8, -0.1, Math.sin(a) * 0.8);
    gb.add(trunkGeo(curveOf([p0, p0.clone().lerp(p1, 0.5).add(new V3(Math.cos(a) * 0.15, 0.1, Math.sin(a) * 0.15)), p1]), { r0: 0.08, r1: 0.06, segs: 3, radial: 4, flare: 0, noise: 0.05 }), { col: '#a8a594', late: 0.4 + i * 0.1, pivot: p0, anchorY: 0 });
  }
  const attach = [], perch = [], tips = [];
  // candelabra: 3-4 branches curving up
  const nb = 3 + (v % 2);
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * TAU + rng.range(-0.3, 0.3); const dir = new V3(Math.cos(a), 0, Math.sin(a));
    const p0 = trunk.getPointAt(rng.range(0.72, 0.88));
    const p1 = p0.clone().addScaledVector(dir, rng.range(2.6, 3.6)).add(new V3(0, rng.range(3.0, 4.2), 0));
    const mid = p0.clone().addScaledVector(dir, 2.0).add(new V3(0, 0.6, 0));
    const c = curveOf([p0, mid, p1]);
    gb.add(trunkGeo(c, { r0: 0.13, r1: 0.08, segs: 6, radial: 6, flare: 0.1, flareH: 0.1 }), { colFn: ringCol('#cfccbd', '#8c8a7c', 10) });
    tips.push({ p: p1, dir });
    attach.push({ pos: c.getPointAt(0.25).add(new V3(0, 0.13, 0)), normal: new V3(0, 1, 0), minG: 0.4 });
    attach.push({ pos: c.getPointAt(0.55).add(new V3(0, 0.1, 0)), normal: dir.clone().add(new V3(0, 1, 0)).normalize(), minG: 0.5 });
    perch.push({ pos: c.getPointAt(0.35).add(new V3(0, 0.1, 0)) });
    perch.push({ pos: c.getPointAt(0.7), minG: 0.5 });
  }
  tips.push({ p: tTop, dir: new V3(0, 1, 0) });
  attach.push({ pos: trunk.getPointAt(0.6).add(new V3(0.2, 0, 0)), normal: new V3(1, 0.4, 0).normalize(), minG: 0.5 });
  // leaf clusters at tips: long petioles holding big palmate leaves spreading outward/down
  let rk = 0;
  tips.forEach((tp, ti) => {
    const nl = ti === tips.length - 1 ? 6 : 5;
    for (let k = 0; k < nl; k++) {
      const a = (k / nl) * TAU + rng() * 0.6; const d = new V3(Math.cos(a), 0, Math.sin(a));
      const L = rng.range(1.1, 1.5);
      const end = tp.p.clone().addScaledVector(d, L).add(new V3(0, rng.range(-0.1, 0.5), 0));
      gb.add(new THREE.CylinderGeometry(0.02, 0.03, 1, 3).translate(0, 0.5, 0), { m: orient(tp.p, end.clone().sub(tp.p), 0, new V3(1, tp.p.distanceTo(end), 1)), col: '#9c8760', leaf: 1, flutter: 0, rank: rk, centre: tp.p });
      addPalmate(gb, rng, end, rng.range(1.35, 1.75), rng.range(-0.15, 0.25), a, rk, '#4c8a38');
      rk = Math.min(0.98, rk + 0.04 + rng() * 0.04);
    }
    // finger-like catkin fruit spikes hanging under the cluster
    for (let k = 0; k < 4; k++) {
      const a = rng() * TAU; const q = tp.p.clone().add(new V3(Math.cos(a) * 0.2, -0.1, Math.sin(a) * 0.2));
      const g = new THREE.CylinderGeometry(0.05, 0.035, 0.9, 4).translate(0, -0.45, 0);
      gb.add(g, { m: orient(q, new V3(Math.cos(a) * 0.4, 1, Math.sin(a) * 0.4), 0), col: '#93a35a', cj: [0.03, 0.08, 0.06], reveal: 2, centre: q });
      gb.add(new THREE.CylinderGeometry(0.03, 0.025, 0.55, 3).translate(0, -0.28, 0), { m: orient(q, new V3(Math.cos(a) * -0.3, 1, Math.sin(a) * -0.3), 0), col: '#e8e0b8', reveal: 1, centre: q });
    }
    perch.push({ pos: tp.p.clone().add(new V3(0, 0.1, 0)), minG: 0.6 });
  });
  return { geo: gb.build(), tris: gb.tris, cb, H, attach, perch };
}
function cecropia(opts) {
  const v = variantOf(opts);
  const d = cached('cecropia' + v, () => buildCecropia(v));
  const sd = cached('cecropia-seed', () => { const rng = vrng('cec-s', 0); const gb = new GB(rng);
    gb.add(trunkGeo(curveOf([new V3(0, 0, 0), new V3(0.02, 0.6, 0), new V3(0, 1.2, 0.02)]), { r0: 0.05, r1: 0.03, segs: 4, radial: 5, flare: 0.2 }), { colFn: ringCol('#c9c6b5', '#8c8a7c', 6) });
    for (let k = 0; k < 3; k++) { const a = k * 2.2; const p = new V3(Math.cos(a) * 0.35, 1.1 + k * 0.08, Math.sin(a) * 0.35); addPalmate(gb, rng, p, 0.45, 0.2, a, k * 0.2, '#5a9a40'); }
    return gb.build(); });
  return makeVisual({
    name: 'cecropia', geo: d.geo, seedGeo: sd, H: d.H, cb: d.cb, trunkR: 0.3, sway: 0.018, droop: 0.6,
    look: { under: 0.7, underCol: '#b9c7ae' },
    crown: { top: d.H, bottom: d.cb, radius: 5.2, density: 0.55 }, attach: d.attach, perch: d.perch,
    grow(g) {
      if (g < 0.08) return { seed: lerp(0.5, 1.2, g / 0.08) };
      const Ht = 2 + 14 * Math.pow(g, 0.85), s = 0.22 + 0.78 * g;
      return { s, sxz: s * lerp(0.65, 1, g), stretch: (Ht / s - (d.H - d.cb)) / d.cb, late: g, leaf: lerp(0.5, 1.001, smoothstep(0.1, 0.6, g)) };
    },
  }, opts);
}

// ═════════════════════════════ AÇAÍ PALM (Euterpe oleracea) ═════════════════════════════
// Pinnate frond: rachis arching out & down, leaflets hanging (pendulous) on both sides.
function addFrond(gb, rng, base, dir, len, { rank = 0, pairs = 14, leafLen = 0.9, col = '#3f7d34', droop = 0.9, rachisCol = '#6f7a3c', late, pivot } = {}) {
  const d = dir.clone().normalize();
  const side0 = new V3(-d.z, 0, d.x).normalize();
  const p1 = base.clone().addScaledVector(d, len * 0.45).add(new V3(0, len * 0.32, 0));
  const p2 = base.clone().addScaledVector(d, len * 0.85).add(new V3(0, len * 0.1, 0));
  const p3 = base.clone().addScaledVector(d, len * 1.05).add(new V3(0, -len * 0.25 * droop, 0));
  const rc = curveOf([base, p1, p2, p3]);
  const extra = { leaf: 1, rank, centre: base, late, pivot };
  gb.add(trunkGeo(rc, { r0: 0.045, r1: 0.012, segs: 5, radial: 3, flare: 0, noise: 0, cap: false }), { col: rachisCol, ...extra, flutter: 0.6 });
  const lc = jitterColor(col, rng, 0.02, 0.06, 0.06), tip = lc.clone().offsetHSL(0.02, 0, 0.08);
  const pos = [], cols = [];
  for (let i = 0; i < pairs; i++) {
    const t = 0.12 + 0.86 * (i / (pairs - 1));
    const P = rc.getPointAt(t), T = rc.getTangentAt(t);
    const L = leafLen * Math.sin(Math.PI * (0.15 + 0.8 * t)) * (0.85 + 0.3 * rng());
    for (const sd of [-1, 1]) {
      const side = new V3().crossVectors(T, new V3(0, 1, 0)).normalize().multiplyScalar(sd);
      const hang = side.clone().multiplyScalar(0.45).add(new V3(0, -0.85, 0)).addScaledVector(T, 0.25).normalize();
      const tipP = P.clone().addScaledVector(hang, L);
      const mid = P.clone().addScaledVector(hang, L * 0.45).addScaledVector(side, 0.07);
      const b2 = P.clone().addScaledVector(T, 0.06);
      // two triangles: base(P,b2)->mid, mid->tip
      pos.push(...P.toArray(), ...mid.toArray(), ...b2.toArray(), ...b2.toArray(), ...mid.toArray(), ...tipP.toArray());
      for (let k = 0; k < 6; k++) { const c = k === 5 ? tip : lc; cols.push(c.r, c.g, c.b); }
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  const cArr = cols;
  gb.add(g, { colFn: (c, p, n, uv, i) => c.setRGB(cArr[i * 3], cArr[i * 3 + 1], cArr[i * 3 + 2]), ...extra, flutter: 1.2 });
  return rc;
}
function buildAcai(v) {
  const rng = vrng('acai', v);
  const gb = new GB(rng); const H = 10.8 + v * 0.5;
  const ns = 4 + (v === 2 ? 1 : 0) - (v === 1 ? 1 : 0); // 4,3,5 stems
  const perch = [], tops = [];
  for (let si = 0; si < ns; si++) {
    const main = si === 0;
    const a = (si / ns) * TAU + rng.range(-0.3, 0.3);
    const h = main ? H - 1.6 : rng.range(H * 0.55, H * 0.9) - 1.6;
    const off = main ? 0 : rng.range(0.35, 0.6);
    const b0 = new V3(Math.cos(a) * off, -0.1, Math.sin(a) * off);
    const lean = main ? 0.25 : rng.range(0.8, 1.6);
    const top = new V3(Math.cos(a) * (off + lean), h, Math.sin(a) * (off + lean));
    const mid = b0.clone().lerp(top, 0.5); mid.x += Math.cos(a) * lean * -0.25; mid.z += Math.sin(a) * lean * -0.25;
    const sc = curveOf([b0, mid, top]);
    const late = main ? -1 : 0.25 + si * 0.15; const pivot = b0.clone();
    gb.add(trunkGeo(sc, { r0: 0.13, r1: 0.1, segs: 8, radial: 6, flare: 0.25, flareH: 0.04, noise: 0.03 }), { colFn: ringCol('#8e8b78', '#5d5a4c', 30), late, pivot });
    // crownshaft (smooth, olive-purple)
    const csTop = top.clone().add(new V3(0, 1.3, 0));
    gb.add(trunkGeo(curveOf([top, top.clone().lerp(csTop, 0.5), csTop]), { r0: 0.15, r1: 0.11, segs: 2, radial: 6, flare: 0, noise: 0 }), { col: '#6c7a3e', cj: [0.03, 0.08, 0.06], late, pivot });
    // stilt roots at base
    if (main || rng() < 0.5) for (let k = 0; k < 3; k++) { const ra = rng() * TAU; gb.add(new THREE.ConeGeometry(0.07, 0.6, 4).translate(0, 0.3, 0), { m: orient(b0.clone().add(new V3(Math.cos(ra) * 0.12, 0, Math.sin(ra) * 0.12)), new V3(-Math.cos(ra), 2.5, -Math.sin(ra)), 0), col: '#7a6a4a', late, pivot }); }
    // fronds
    const nf = main ? 9 : (ns >= 5 ? 5 : 6);
    for (let k = 0; k < nf; k++) {
      const fa = (k / nf) * TAU + rng() * 0.4;
      const up = k < 2 ? 1.6 : rng.range(0.15, 0.6);
      const dir = new V3(Math.cos(fa), up, Math.sin(fa));
      addFrond(gb, rng, csTop.clone(), dir, rng.range(2.4, 3.1) * (main ? 1 : 0.85), { rank: k < 2 ? 0.05 * k : 0.15 + rng() * 0.85, pairs: main ? 12 : 9, late, pivot, droop: k < 2 ? 0.2 : 1 });
    }
    tops.push({ top, csTop, late, pivot });
    perch.push({ pos: csTop.clone().add(new V3(0, 0.1, 0)), minG: main ? 0.4 : 0.8 });
  }
  // berry bunches below the crownshaft: rachillae (bloom: cream) + dark purple berries (fruit)
  tops.forEach(({ top, late, pivot }, si) => {
    for (let b = 0; b < (si === 0 ? 3 : 1); b++) {
      const a = rng() * TAU; const d = new V3(Math.cos(a), 0, Math.sin(a));
      const q = top.clone().addScaledVector(d, 0.14).add(new V3(0, 0.15, 0));
      for (let r = 0; r < 5; r++) {
        const rd = d.clone().multiplyScalar(0.8).add(new V3(rng.range(-0.4, 0.4), rng.range(-1.2, -0.3), rng.range(-0.4, 0.4))).normalize();
        const L = rng.range(0.55, 0.8);
        gb.add(new THREE.CylinderGeometry(0.035, 0.03, L * 0.95, 3, 1, true).translate(0, L / 2, 0), { m: orient(q, rd, 0), col: '#efe7c2', late, pivot, reveal: 1, centre: q });
        for (let k = 0; k < 3; k++) {
          const bp = q.clone().addScaledVector(rd, L * (0.4 + k * 0.22)).add(new V3(rng.range(-0.04, 0.04), 0, rng.range(-0.04, 0.04)));
          gb.add(octa(0.075), { m: M().setPosition(bp), col: '#3a1640', cj: [0.02, 0.1, 0.05], late, pivot, reveal: 2, centre: bp });
        }
      }
    }
  });
  return { geo: gb.build(), tris: gb.tris, H, perch };
}
function acai(opts) {
  const v = variantOf(opts);
  const d = cached('acai' + v, () => buildAcai(v));
  const sd = cached('acai-seed', () => { const rng = vrng('acai-s', 0); const gb = new GB(rng);
    for (let k = 0; k < 5; k++) { const a = k * 2.4; addFrond(gb, rng, new V3(0, 0.05, 0), new V3(Math.cos(a), 1.6 - k * 0.2, Math.sin(a)), 0.9, { rank: k * 0.15, pairs: 7, leafLen: 0.35, droop: 0.6 }); }
    return gb.build(); });
  return makeVisual({
    name: 'acai', geo: d.geo, seedGeo: sd, H: d.H, trunkR: 0.14, sway: 0.03, droop: 0.4,
    crown: { top: d.H + 1.4, bottom: d.H - 3.0, radius: 3.3, density: 0.4 }, perch: d.perch,
    seedCrown: { top: 1.0, bottom: 0.2, radius: 0.8, density: 0.25 },
    grow(g) {
      if (g < 0.08) return { seed: lerp(0.6, 1.3, g / 0.08) };
      return { s: 0.18 + 0.82 * g, sxz: (0.18 + 0.82 * g) * lerp(1.6, 1, g), late: g };
    },
  }, opts);
}

// ═════════════════════════════ HELICONIA (lobster-claw) ═════════════════════════════
function addHeliInflo(gb, rng, base, dir, { hanging, n = 7, size = 0.24, red = '#e0262f', tip = '#ffd23a', rank = 0 }) {
  // zig-zag rachis with alternating boat-shaped bracts
  let p = base.clone(); const d = dir.clone().normalize();
  const side = new V3().crossVectors(d, new V3(0, 1, 0)); if (side.lengthSq() < 0.01) side.set(1, 0, 0); side.normalize();
  const r = new THREE.Color(red), y = new THREE.Color(tip), g = new THREE.Color('#5c9a3a');
  for (let i = 0; i < n; i++) {
    const s = size * (1 - i * 0.07); const sd = i % 2 ? 1 : -1;
    const next = p.clone().addScaledVector(d, s * 0.62).addScaledVector(side, sd * s * 0.12);
    gb.add(new THREE.CylinderGeometry(0.018, 0.02, 1, 3).translate(0, 0.5, 0), { m: orient(p, next.clone().sub(p), 0, new V3(1, p.distanceTo(next), 1)), col: hanging ? '#b0281c' : '#9a2418', reveal: 1, centre: base, rank: rank + i * 0.06 });
    // bract: a flattened cone opening upward (hanging) / outward
    const bd = side.clone().multiplyScalar(sd).addScaledVector(d, hanging ? -0.15 : 0.35).add(new V3(0, hanging ? 0.75 : 0.15, 0)).normalize();
    const cone = new THREE.ConeGeometry(s * 0.34, s * 1.7, 5, 3, true).rotateX(Math.PI).translate(0, s * 0.8, 0).scale(1, 1, 0.45);
    gb.add(cone, { m: orient(next, bd, Math.atan2(d.x, d.z)), colLocal: true, colFn: (c, lp) => { const k = clamp(lp.y / (s * 1.6)); c.copy(r).lerp(y, smoothstep(0.85, 1.0, k) * 0.85); }, reveal: 1, centre: next, rank: rank + i * 0.06 });
    p = next;
  }
}
function buildHeliconia(v) {
  const rng = vrng('heliconia', v);
  const gb = new GB(rng); const H = 2.6;
  const ns = 6;
  const tops = [];
  for (let i = 0; i < ns; i++) {
    const a = (i / ns) * TAU + rng.range(-0.3, 0.3); const off = rng.range(0.1, 0.35);
    const b = new V3(Math.cos(a) * off, 0, Math.sin(a) * off);
    const h = rng.range(0.8, 1.35);
    const top = b.clone().add(new V3(Math.cos(a) * 0.3, h, Math.sin(a) * 0.3));
    // pseudostem / petiole
    gb.add(trunkGeo(curveOf([b, b.clone().lerp(top, 0.5), top]), { r0: 0.04, r1: 0.022, segs: 3, radial: 4, flare: 0.3, noise: 0 }), { col: '#4f7d2f', cj: [0.02, 0.05, 0.05], leaf: 1, flutter: 0.2, rank: i / ns, centre: b });
    // paddle leaf, slightly torn & tilted outward
    const L = rng.range(1.15, 1.5);
    gb.add(leafBlade(L, L * 0.38, { segs: 5, bend: 0.22, fold: 0.1, shape: 'paddle' }), { m: place(top, Math.atan2(Math.cos(a), Math.sin(a)) + rng.range(-0.3, 0.3), -rng.range(0.35, 0.7), rng.range(-0.25, 0.25)), colFn: leafCol('#3f8a32', rng, { tip: '#77b04a' }), leaf: 1, rank: i / ns, centre: top });
    tops.push({ b, a });
  }
  // inflorescences
  const hanging = v !== 1;
  for (let k = 0; k < 4; k++) {
    const t = tops[(k * 2 + (k > 2 ? 1 : 0)) % ns]; const a = t.a + 0.6;
    const base = t.b.clone().add(new V3(Math.cos(a) * 0.12, hanging ? rng.range(1.5, 1.9) : rng.range(0.8, 1.1), Math.sin(a) * 0.12));
    gb.add(new THREE.CylinderGeometry(0.02, 0.025, 1, 4).translate(0, 0.5, 0), { m: orient(t.b, base.clone().sub(t.b), 0, new V3(1, t.b.distanceTo(base), 1)), col: '#5a8a34', reveal: 1, centre: t.b, rank: k * 0.15 });
    const dir = hanging ? new V3(Math.cos(a) * 0.15, -1, Math.sin(a) * 0.15) : new V3(Math.cos(a) * 0.2, 1, Math.sin(a) * 0.2);
    addHeliInflo(gb, rng, base, dir, { hanging, n: hanging ? 8 : 7, size: hanging ? 0.2 : 0.22, red: v === 2 ? '#c4180f' : '#b80a1c', tip: v === 1 ? '#e8b010' : '#f0c020', rank: k * 0.15 });
  }
  return { geo: gb.build(), tris: gb.tris, H };
}
function heliconia(opts) {
  const v = variantOf(opts);
  const d = cached('heliconia' + v, () => buildHeliconia(v));
  return makeVisual({
    name: 'heliconia', geo: d.geo, H: d.H, trunkR: 0.2, sway: 0.03, droop: 0.7,
    crown: { top: 2.5, bottom: 0.6, radius: 1.3, density: 0.4 },
    grow(g) { const s = lerp(0.25, 1, Math.pow(g, 0.8)); return { s, sxz: s * lerp(1.15, 1, g) }; },
  }, opts);
}

// ═════════════════════════════ BROMELIAD (tank bromeliad) ═════════════════════════════
function buildBromeliad(v) {
  const rng = vrng('bromeliad', v);
  const gb = new GB(rng); const H = 0.9;
  const leafColors = ['#3d7530', '#577a26', '#2f6a3c'];
  const blushC = new THREE.Color(['#c2384f', '#d0473a', '#b3346a'][v]);
  const rings = [{ n: 7, len: 0.62, tilt: 0.95, y: 0.06 }, { n: 6, len: 0.55, tilt: 0.55, y: 0.1 }, { n: 5, len: 0.42, tilt: 0.28, y: 0.14 }];
  let rk = 0;
  rings.forEach((r, ri) => {
    for (let i = 0; i < r.n; i++) {
      const a = (i / r.n) * TAU + ri * 0.45 + rng.range(-0.1, 0.1);
      const g = leafBlade(r.len * rng.range(0.9, 1.1), 0.16, { segs: 4, bend: ri === 0 ? 0.55 : 0.28, fold: 0.45, shape: 'strap' });
      const base = new V3(Math.cos(a) * 0.05, r.y, Math.sin(a) * 0.05);
      const lc = jitterColor(leafColors[v], rng, 0.02, 0.06, 0.05);
      gb.add(g, { m: place(base, Math.atan2(Math.cos(a), Math.sin(a)), -(Math.PI / 2 - r.tilt), 0), colLocal: true,
        colFn: (c, lp) => { const k = clamp(lp.z / r.len); c.copy(lc); if (ri === 2) c.lerp(blushC, (1 - k) * 0.8); else c.lerp(new THREE.Color('#d7d29a'), (1 - k) * 0.25); },
        leaf: 1, rank: rk, centre: base, flutter: 0.3 });
      rk += 0.05;
    }
  });
  // central red bracts (bloom) + water tank disc
  const tank = new THREE.CircleGeometry(0.075, 7).rotateX(-Math.PI / 2).translate(0, 0.2, 0);
  gb.add(tank, { col: '#7fb3c9' });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + 0.2; const base = new V3(Math.cos(a) * 0.04, 0.14, Math.sin(a) * 0.04);
    gb.add(leafBlade(0.42, 0.14, { segs: 5, bend: 0.25, fold: 0.4, shape: 'lance' }), { m: place(base, Math.atan2(Math.cos(a), Math.sin(a)), -0.9, 0), col: '#f0304a', cj: [0.02, 0.05, 0.06], reveal: 1, centre: new V3(0, 0.2, 0), rank: i / 7 });
  }
  for (let i = 0; i < 5; i++) { const a = rng() * TAU; const q = new V3(Math.cos(a) * 0.035, 0.25 + rng() * 0.08, Math.sin(a) * 0.035); gb.add(octa(0.03, 1.8), { m: M().setPosition(q), col: '#7a3db8', reveal: 1, centre: new V3(0, 0.2, 0), rank: 0.5 + i * 0.1 }); }
  // tiny holdfast roots
  for (let i = 0; i < 4; i++) { const a = i * 1.6; gb.add(new THREE.CylinderGeometry(0.008, 0.012, 0.18, 3).translate(0, -0.09, 0), { m: orient(new V3(0, 0.03, 0), new V3(Math.cos(a), -1.2, Math.sin(a)), 0), col: '#7a6a4a' }); }
  return { geo: gb.build(), tris: gb.tris, H };
}
function bromeliad(opts) {
  const v = variantOf(opts);
  const d = cached('bromeliad' + v, () => buildBromeliad(v));
  return makeVisual({
    name: 'bromeliad', geo: d.geo, H: 0.9, trunkR: 0.06, sway: 0.01, droop: 0.4, noJitter: false,
    crown: { top: 0.75, bottom: 0.05, radius: 0.5, density: 0.2 },
    grow(g) { const s = lerp(0.35, 1.25, Math.pow(g, 0.9)); return { s }; },
  }, opts);
}

// ═════════════════════════════ ORCHID (epiphytic) ═════════════════════════════
function orchidFlower(r) {
  // 5 soft tepals + a ruffled lip (labellum), each a small curved grid with smooth normals — built facing +Z
  const P = [], I = [];
  const sheet = (ang, L, W, cup, curl, lip = false) => {
    const NU = 5, NV = 4, o = P.length / 3, ca = Math.cos(ang), sa = Math.sin(ang);
    for (let i = 0; i <= NU; i++) {
      const u = i / NU, w = W * Math.pow(Math.sin(Math.PI * (0.08 + 0.92 * u)), lip ? 0.5 : 0.75) + W * 0.05;
      for (let j = 0; j <= NV; j++) {
        const v = j / NV * 2 - 1;
        const along = L * u, across = w * v;
        const z = cup * W * v * v + curl * L * u * u + (lip ? 0.06 * r * Math.sin(v * 9 + u * 5) * u : 0) + 0.015 * r;
        P.push(ca * along - sa * across, sa * along + ca * across, z);
      }
    }
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) {
      const a = o + i * (NV + 1) + j, b = a + NV + 1; I.push(a, b, b + 1, a, b + 1, a + 1);
    }
  };
  for (let i = 0; i < 5; i++) {
    const wide = i % 2 === 1;
    sheet(Math.PI / 2 + (i - 2) * 1.05, r * (wide ? 1 : 0.9), r * (wide ? 0.46 : 0.24), 0.25, 0.12);
  }
  sheet(-Math.PI / 2, r * 0.85, r * 0.42, 0.55, 0.35, true);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I);
  g.computeVertexNormals();
  return g.toNonIndexed();
}
function buildOrchid(v) {
  const rng = vrng('orchid', v);
  const gb = new GB(rng); const H = 0.6;
  // pseudobulbs + thick strap leaves
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1 + rng() * 0.4; const b = new V3(Math.cos(a) * 0.05, 0, Math.sin(a) * 0.05);
    gb.add(bead(0.045, 1.6, 0), { m: M().setPosition(b.clone().add(new V3(0, 0.06, 0))), col: '#7a9a45', cj: [0.02, 0.05, 0.05] });
    for (let k = 0; k < 2; k++) {
      const la = a + (k - 0.5) * 0.7; const base = b.clone().add(new V3(0, 0.12, 0));
      gb.add(leafBlade(rng.range(0.3, 0.38), 0.09, { segs: 3, bend: 0.35, fold: 0.3, shape: 'strap' }), { m: place(base, Math.atan2(Math.cos(la), Math.sin(la)), -rng.range(0.5, 0.9), 0), colFn: leafCol('#3f7d34', rng), leaf: 1, rank: (i * 2 + k) / 6, centre: base, flutter: 0.4 });
    }
  }
  // aerial roots (silvery velamen)
  for (let i = 0; i < 6; i++) {
    const a = rng() * TAU; const p0 = new V3(0, 0.03, 0);
    const p1 = new V3(Math.cos(a) * 0.12, -0.03, Math.sin(a) * 0.12), p2 = new V3(Math.cos(a) * 0.2, -rng.range(0.06, 0.18), Math.sin(a) * 0.2);
    gb.add(trunkGeo(curveOf([p0, p1, p2]), { r0: 0.009, r1: 0.006, segs: 3, radial: 3, flare: 0, noise: 0, cap: false }), { col: '#cfd3c2' });
  }
  // arching flower spray
  const fc = [['#f7f2f7', '#d4387f'], ['#d23a9a', '#f6d34a'], ['#f2f0ea', '#c9459b']][v];
  const a = rng() * TAU; const d = new V3(Math.cos(a), 0, Math.sin(a));
  const sp = curveOf([new V3(0, 0.1, 0), d.clone().multiplyScalar(0.15).add(new V3(0, 0.42, 0)), d.clone().multiplyScalar(0.38).add(new V3(0, 0.52, 0)), d.clone().multiplyScalar(0.55).add(new V3(0, 0.38, 0))]);
  gb.add(trunkGeo(sp, { r0: 0.007, r1: 0.005, segs: 5, radial: 3, flare: 0, noise: 0, cap: false }), { col: '#5d6b34' });
  for (let i = 0; i < 8; i++) {
    const t = 0.3 + i * 0.095; const q = sp.getPointAt(Math.min(1, t)).add(new V3(0, -0.03, 0));
    const fr = 0.095 * (1 - i * 0.045);
    const yaw = Math.atan2(d.x, d.z) + (i % 2 ? 0.9 : -0.9);
    gb.add(orchidFlower(fr), { m: place(q, yaw, 0.15, 0), colLocal: true, colFn: (c, lp) => { const rr = Math.hypot(lp.x, lp.y) / fr; if (lp.y < -fr * 0.2) c.set(fc[1]).multiplyScalar(0.85 + 0.25 * rr); else c.set(fc[0]).lerp(new THREE.Color(fc[1]), 0.35 * Math.max(0, 1 - rr * 1.6)); }, reveal: 1, centre: q, rank: i / 8 });
  }
  return { geo: gb.build(), tris: gb.tris, H };
}
function orchid(opts) {
  const v = variantOf(opts);
  const d = cached('orchid' + v, () => buildOrchid(v));
  return makeVisual({
    name: 'orchid', geo: d.geo, H: 0.6, trunkR: 0.05, sway: 0.02, droop: 0.4,
    crown: { top: 0.5, bottom: 0.0, radius: 0.35, density: 0.1 },
    grow(g) { return { s: lerp(0.35, 1.2, Math.pow(g, 0.9)) }; },
  }, opts);
}

// ═════════════════════════════ LIANA (woody vine on a host) ═════════════════════════════
function buildLiana(v, hh, hr) {
  const rng = vrng('liana', v + hh * 31 + hr * 7);
  const gb = new GB(rng);
  const turns = Math.max(1.5, hh / 7) * (v === 1 ? 0.8 : 1);
  const a0 = rng() * TAU, n = Math.ceil(hh * 1.6);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n; const a = a0 + turns * TAU * t;
    const r = hr * (1 + 0.4 * Math.pow(1 - t, 6)) * lerp(1, 0.6, t) + 0.14 + (i === 0 ? 0.5 : 0) + 0.04 * Math.sin(i * 1.7);
    pts.push(new V3(Math.cos(a) * r, -0.15 + t * (hh - 0.6), Math.sin(a) * r));
  }
  // final leap outward into the light
  const last = pts[pts.length - 1]; const la = a0 + turns * TAU;
  const out = new V3(Math.cos(la), 0, Math.sin(la));
  pts.push(last.clone().addScaledVector(out, 1.4).add(new V3(0, 1.2, 0)));
  const vc = curveOf(pts);
  gb.add(sweep(vc, Math.min(120, n * 2), 5, (t, a) => lerp(0.16, 0.06, t) * (1 + 0.25 * Math.sin(t * 60 + a * 2)), true), { colFn: barkCol('#6a5a3c', '#3e3424', rng, 0.4) });
  // a second, thinner twining stem
  const pts2 = pts.slice(0, Math.floor(pts.length * 0.75)).map((p, i) => { const q = p.clone(); const a = Math.atan2(p.z, p.x) + 0.35; const r = Math.hypot(p.x, p.z) + 0.04; q.x = Math.cos(a) * r; q.z = Math.sin(a) * r; return q; });
  if (pts2.length > 3) gb.add(sweep(curveOf(pts2), Math.min(60, pts2.length), 3, (t) => lerp(0.04, 0.02, t)), { col: '#5b5236' });
  // heart-shaped leaves along the vine (sparser low, denser high)
  const leafN = Math.min(80, Math.floor(hh * 2.4));
  for (let i = 0; i < leafN; i++) {
    const t = Math.pow((i + rng()) / leafN, 0.8) * 0.97;
    const p = vc.getPointAt(t); const rad = new V3(p.x, 0, p.z).normalize();
    const yaw = Math.atan2(rad.x, rad.z) + rng.range(-0.8, 0.8);
    const L = rng.range(0.5, 0.75) * (0.8 + 0.4 * t);
    gb.add(leafBlade(L, L * 0.75, { segs: 2, bend: 0.3, fold: 0.15 }), { m: place(p, yaw, -rng.range(0.1, 0.7), 0), colFn: leafCol(t > 0.7 ? '#4e9a38' : '#3e7d32', rng), leaf: 1, rank: rng() * 0.9 + 0.05, centre: p });
  }
  // the burst at the top: a crowd of leaves + some flowers
  const top = vc.getPointAt(1);
  const burst = [];
  for (let i = 0; i < 30; i++) {
    const d = new V3(rng.range(-1, 1), rng.range(-0.3, 1), rng.range(-1, 1)).normalize();
    const p = top.clone().addScaledVector(d, rng.range(0.3, 1.6)).addScaledVector(out, 0.6);
    burst.push(p);
    const L = rng.range(0.7, 1.0);
    gb.add(leafBlade(L, L * 0.75, { segs: 2, bend: 0.3, fold: 0.15 }), { m: place(p, Math.atan2(d.x, d.z), -rng.range(-0.2, 0.6), 0), colFn: leafCol('#5aa83e', rng, { tip: '#8cc65a' }), leaf: 1, rank: rng(), centre: p });
  }
  for (let i = 0; i < 9; i++) {
    const p = burst[i * 2].clone().add(new V3(0, 0.15, 0));
    gb.add(starFlower(0.26, 5, 0.7), { m: orient(p, new V3(rng.range(-0.5, 0.5), 1, rng.range(-0.5, 0.5)), 0), col: v === 2 ? '#f0e15a' : '#e46aa8', cj: [0.02, 0.06, 0.05], reveal: 1, centre: p });
    const q = burst[i * 2 + 1].clone().add(new V3(0, -0.2, 0));
    gb.add(bead(0.16, 1.3, 0), { m: M().setPosition(q), col: '#7a4a2c', cj: [0.03, 0.08, 0.08], reveal: 2, centre: q });
  }
  return { geo: gb.build(), tris: gb.tris, top, out };
}
function liana(opts) {
  const v = variantOf(opts);
  const hh = Math.max(4, Math.round(opts.hostHeight ?? 20)), hr = Math.round((opts.hostRadius ?? 0.6) * 10) / 10;
  const d = cached(`liana${v}_${hh}_${hr}`, () => buildLiana(v, hh, hr));
  const topY = d.top.y;
  const vis = makeVisual({
    name: 'liana', geo: d.geo, H: topY + 1, trunkR: 0.11, sway: 0.008, droop: 0.5, noJitter: true,
    grow(g) { return { s: 1 }; },
    onGrowth(g, gs, u) { u.uClip.value = g >= 0.999 ? 1e6 : lerp(1.2, topY + 2.5, Math.pow(g, 0.9)); },
    crownFn(st, u) {
      const clip = Math.min(u.uClip.value, topY + 2);
      if (clip < topY) return { top: clip, bottom: Math.max(0, clip - 2), radius: (opts.hostRadius ?? 0.6) + 0.4, density: 0.15 };
      return { top: topY + 1.1, bottom: topY - 1, radius: 1.6, density: 0.45 * u.uLeafShow.value };
    },
  }, opts);
  vis.object.children[0].rotation.y = 0; // spiral stays attached to the host
  return vis;
}

// ═════════════════════════════ FERN ═════════════════════════════
function addFernFrond(gb, rng, base, dir, len, { rank, pairs = 11, col = '#3d8a35', late = -1, pivot }) {
  const d = dir.clone().normalize();
  const p1 = base.clone().addScaledVector(d, len * 0.4).add(new V3(0, len * 0.42, 0));
  const p2 = base.clone().addScaledVector(d, len * 0.8).add(new V3(0, len * 0.35, 0));
  const p3 = base.clone().addScaledVector(d, len * 1.05).add(new V3(0, len * 0.05, 0));
  const rc = curveOf([base, p1, p2, p3]);
  const ex = { leaf: 1, rank, centre: base, late, pivot };
  gb.add(trunkGeo(rc, { r0: 0.016, r1: 0.006, segs: 4, radial: 3, flare: 0, noise: 0, cap: false }), { col: '#4c6a2a', ...ex, flutter: 0.5 });
  const lc = jitterColor(col, rng, 0.02, 0.08, 0.06), tipc = lc.clone().offsetHSL(0.03, 0.05, 0.1);
  const pos = [], cols = [];
  for (let i = 0; i < pairs; i++) {
    const t = 0.15 + 0.83 * (i / (pairs - 1));
    const P = rc.getPointAt(t), T = rc.getTangentAt(t);
    const L = len * 0.26 * Math.pow(Math.sin(Math.PI * (0.1 + 0.88 * t)), 0.8);
    for (const sd of [-1, 1]) {
      const side = new V3().crossVectors(T, new V3(0, 1, 0)).normalize().multiplyScalar(sd);
      const dirL = side.clone().addScaledVector(T, 0.45).add(new V3(0, -0.15, 0)).normalize();
      const tip = P.clone().addScaledVector(dirL, L);
      const w = L * 0.28; const up = new V3(0, 1, 0);
      const m1 = P.clone().addScaledVector(dirL, L * 0.45).addScaledVector(T, w);
      const m2 = P.clone().addScaledVector(dirL, L * 0.45).addScaledVector(T, -w);
      pos.push(...P.toArray(), ...m1.toArray(), ...tip.toArray(), ...P.toArray(), ...tip.toArray(), ...m2.toArray());
      for (let k = 0; k < 6; k++) { const c = (k === 2 || k === 4) ? tipc : lc; cols.push(c.r, c.g, c.b); }
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  gb.add(g, { colFn: (c, p, n, uv, i) => c.setRGB(cols[i * 3], cols[i * 3 + 1], cols[i * 3 + 2]), ...ex, flutter: 1 });
}
function buildFern(v) {
  const rng = vrng('fern', v);
  const gb = new GB(rng);
  const nf = 9;
  for (let i = 0; i < nf; i++) {
    const a = (i / nf) * TAU + rng.range(-0.2, 0.2);
    const up = rng.range(0.25, 0.9);
    addFernFrond(gb, rng, new V3(Math.cos(a) * 0.06, 0.02, Math.sin(a) * 0.06), new V3(Math.cos(a), up, Math.sin(a)), rng.range(1.0, 1.35),
      { rank: i / nf, pairs: 13, col: ['#2f7a2c', '#3c8434', '#256c30'][v] });
  }
  // fiddleheads (coiled young fronds) in the centre
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1 + 0.4; const pts = [];
    for (let k = 0; k <= 10; k++) { const t = k / 10; if (t < 0.55) pts.push(new V3(Math.cos(a) * 0.05 * t, t * 0.5, Math.sin(a) * 0.05 * t)); else { const ang = (t - 0.55) * 14; const r = 0.07 * (1 - (t - 0.55) * 1.5); pts.push(new V3(Math.cos(a) * (0.03 + Math.sin(ang) * r), 0.28 + 0.07 + Math.cos(ang) * r, Math.sin(a) * (0.03 + Math.sin(ang) * r))); } }
    gb.add(sweep(curveOf(pts), 10, 3, (t) => lerp(0.016, 0.008, t)), { col: '#7aa83a', leaf: 1, rank: 0.2 + i * 0.25, centre: new V3(0, 0, 0), flutter: 0.2 });
  }
  return { geo: gb.build(), tris: gb.tris };
}
function fern(opts) {
  const v = variantOf(opts);
  const d = cached('fern' + v, () => buildFern(v));
  return makeVisual({
    name: 'fern', geo: d.geo, H: 1.3, trunkR: 0.1, sway: 0.03, droop: 0.9,
    crown: { top: 1.25, bottom: 0.3, radius: 1.3, density: 0.35 },
    grow(g) { const s = lerp(0.35, 1.05, Math.pow(g, 0.85)); return { s, leaf: lerp(0.4, 1.001, smoothstep(0, 0.7, g)) }; },
  }, opts);
}

// ═════════════════════════════ GLOW FUNGUS (bioluminescent mushrooms on a rotten log) ═════════════════════════════
function mushroomGeo(gb, rng, base, h, capR, { tilt = new V3(0, 1, 0), rank, capCol, gillCol, stemCol }) {
  const dir = tilt.clone().normalize();
  const top = base.clone().addScaledVector(dir, h);
  gb.add(trunkGeo(curveOf([base, base.clone().lerp(top, 0.5).add(new V3(0.01, 0, 0)), top]), { r0: capR * 0.22, r1: capR * 0.16, segs: 2, radial: 5, flare: 0.4, flareH: 0.2, noise: 0 }),
    { col: stemCol, cj: [0.02, 0.05, 0.05], leaf: 2, rank, centre: base, flutter: 0, reveal: 3 });
  // cap: lathe dome + flat gill underside
  const prof = [new THREE.Vector2(0.001, capR * 0.55), new THREE.Vector2(capR * 0.55, capR * 0.45), new THREE.Vector2(capR * 0.95, capR * 0.12), new THREE.Vector2(capR, -capR * 0.04)];
  const cap = new THREE.LatheGeometry(prof, 8);
  const m = orient(top, dir, rng() * 3);
  gb.add(cap, { m, nRef: top.clone().addScaledVector(dir, -capR), colLocal: true, colFn: (c, lp) => { c.set(capCol).lerp(new THREE.Color('#eef6d0'), (1 - clamp(lp.y / (capR * 0.55))) * 0.55); }, leaf: 2, rank, centre: base, flutter: 0, reveal: 3 });
  const gill = new THREE.CircleGeometry(capR * 0.98, 8).rotateX(Math.PI / 2).translate(0, -capR * 0.03, 0);
  gb.add(gill, { m, nRef: top.clone().addScaledVector(dir, capR), col: gillCol, leaf: 2, rank, centre: base, flutter: 0, reveal: 3 });
}
function buildGlowfungus(v) {
  const rng = vrng('glowfungus', v);
  const gb = new GB(rng);
  // rotten log piece, lying along X, half sunk
  const L = 1.5;
  const lc = curveOf([new V3(-L / 2, 0.12, 0), new V3(0, 0.15, 0.04), new V3(L / 2, 0.11, -0.02)]);
  gb.add(sweep(lc, 4, 7, (t, a) => 0.2 * (1 + 0.12 * Math.sin(a * 3 + t * 5)) * (1 - 0.15 * t), false), { colFn: (c, p, n, uv) => { c.set('#5a4430').lerp(new THREE.Color('#3f6a2a'), clamp(n.y * 0.8 + hash3(uv.x * 9, uv.y * 7, 1) * 0.4 - 0.25)); } });
  for (const e of [0, 1]) { // cut ends with rings
    const P = lc.getPointAt(e), T = lc.getTangentAt(e).multiplyScalar(e ? 1 : -1);
    gb.add(new THREE.CircleGeometry(0.19, 7), { m: orient(P, T, 0), colLocal: true, colFn: (c, lp) => { const r = Math.hypot(lp.x, lp.z); c.set('#8a6a44').lerp(new THREE.Color('#4a3524'), Math.pow(Math.abs(Math.sin(r * 60)), 3) * 0.6); } });
  }
  // moss patches
  for (let i = 0; i < 4; i++) { const q = lc.getPointAt(rng.range(0.1, 0.9)).add(new V3(0, 0.17, rng.range(-0.08, 0.08))); gb.add(blob(rng.range(0.1, 0.16), 0, 0.4, 0.35, i), { m: M().setPosition(q), col: '#4f8a2c', cj: [0.03, 0.08, 0.08] }); }
  // mushrooms on and beside the log
  const capCol = ['#b9b48a', '#a9b486', '#c2b98e'][v], gillCol = '#f0ffd8', stemCol = '#9c977c';
  const spots = [];
  for (let i = 0; i < 6; i++) { const t = rng.range(0.08, 0.92); const P = lc.getPointAt(t); const side = rng.sign(); const ang = rng.range(0.1, 0.9) * side; spots.push({ p: P.clone().add(new V3(0, Math.cos(ang) * 0.19, Math.sin(ang) * 0.19)), tilt: new V3(0, Math.cos(ang), Math.sin(ang) * 1.2), s: rng.range(0.7, 1.15) }); }
  for (let i = 0; i < 4; i++) { const x = rng.range(-0.6, 0.6), z = rng.sign() * rng.range(0.3, 0.55); spots.push({ p: new V3(x, 0, z), tilt: new V3(rng.range(-0.2, 0.2), 1, z * 0.4), s: rng.range(0.9, 1.4) }); }
  spots.forEach((sp, i) => mushroomGeo(gb, rng, sp.p, 0.2 * sp.s, 0.1 * sp.s, { tilt: sp.tilt, rank: i / spots.length, capCol, gillCol, stemCol }));
  return { geo: gb.build(), tris: gb.tris };
}
function glowfungus(opts) {
  const v = variantOf(opts);
  const d = cached('glowfungus' + v, () => buildGlowfungus(v));
  return makeVisual({
    name: 'glowfungus', geo: d.geo, H: 0.5, trunkR: 0.2, sway: 0, droop: 0, glow: 1,
    look: { glowCol: '#6dff9e', roughness: 0.6 },
    crown: { top: 0.45, bottom: 0.0, radius: 0.8, density: 0.05 },
    grow(g) { return { s: lerp(0.75, 1.1, g), leaf: lerp(0.15, 1.001, smoothstep(0, 0.85, g)) }; },
    onUpdate(dt, t, w, u, body, st) { if (u.uGlow.value > 0) u.uGlowCol.value.setRGB(0.36, 1.0, 0.55).multiplyScalar(0.85 + 0.15 * Math.sin(t * 1.3 + st.phase)); },
  }, opts);
}

// ═════════════════════════════ GIANT WATER LILY (Victoria amazonica) ═════════════════════════════
function addPad(gb, rng, c, R, rank, rimH = 0.16) {
  const prof = [new THREE.Vector2(0, 0.02), new THREE.Vector2(R * 0.6, 0.015), new THREE.Vector2(R - 0.05, 0.03), new THREE.Vector2(R, rimH)];
  const top = new THREE.LatheGeometry(prof, 18);
  const tc = jitterColor('#5d9a3a', rng, 0.02, 0.06, 0.05), vein = new THREE.Color('#87b452'), rimIn = new THREE.Color('#9a6b3e');
  gb.add(top, { m: M().makeRotationY(rng() * TAU).setPosition(c), nRef: c.clone().add(new V3(0, -3, 0)), colLocal: true, colFn: (col, lp) => {
      const r = Math.hypot(lp.x, lp.z), a = Math.atan2(lp.z, lp.x);
      col.copy(tc).lerp(vein, Math.pow(Math.abs(Math.cos(a * 9)), 18) * clamp(r / R) * 0.7);
      if (lp.y > 0.05) col.lerp(rimIn, 0.55);
    }, leaf: 2, rank, centre: c, flutter: 0.15 });
  // red outer rim/underside, slightly outside
  const prof2 = [new THREE.Vector2(R * 0.8, -0.005), new THREE.Vector2(R + 0.012, 0.025), new THREE.Vector2(R + 0.015, rimH + 0.005)];
  gb.add(new THREE.LatheGeometry(prof2, 18), { m: M().setPosition(c), nRef: c.clone().add(new V3(0, 0.6, 0)), col: '#b2323a', cj: [0.02, 0.08, 0.06], leaf: 2, rank, centre: c, flutter: 0.15 });
}
function buildWaterlily(v) {
  const rng = vrng('waterlily', v);
  const gb = new GB(rng);
  addPad(gb, rng, new V3(0, 0, 0), 1.15, 0.05);
  const a1 = rng() * TAU;
  addPad(gb, rng, new V3(Math.cos(a1) * 2.0, 0.005, Math.sin(a1) * 2.0), 0.8, 0.4, 0.13);
  const a2 = a1 + rng.range(1.6, 2.4);
  addPad(gb, rng, new V3(Math.cos(a2) * 1.75, 0.01, Math.sin(a2) * 1.75), 0.45, 0.75, 0.08);
  // big flower between pads: white (first night) → pink (second), reveal by bloom
  const fa = a1 + (a2 - a1) * 0.5 + Math.PI;
  const fc = new V3(Math.cos(fa) * 1.45, 0.05, Math.sin(fa) * 1.45);
  const col = ['#f7f3ef', '#f3c3d6', '#f9eef2'][v], inner = v === 1 ? '#d94f86' : '#f2d0dc';
  const layers = [{ n: 9, L: 0.5, up: 0.3, c: col }, { n: 8, L: 0.38, up: 0.85, c: inner }];
  layers.forEach((ly, li) => {
    for (let i = 0; i < ly.n; i++) {
      const a = (i / ly.n) * TAU + li * 0.4;
      gb.add(leafBlade(ly.L, ly.L * 0.42, { segs: 2, bend: -0.12, fold: -0.2, shape: 'ellipse' }), { m: place(fc.clone().add(new V3(0, 0.05 + li * 0.04, 0)), Math.atan2(Math.cos(a), Math.sin(a)), -ly.up, 0), col: ly.c, cj: [0.01, 0.04, 0.03], reveal: 1, centre: fc, rank: li * 0.3 });
    }
  });
  gb.add(bead(0.09, 0.8, 0), { m: M().setPosition(fc.clone().add(new V3(0, 0.15, 0))), col: '#f4d96a', reveal: 1, centre: fc, rank: 0.5 });
  // spiny bud (fruit stage) — a dark prickly pod at the surface
  const bc = new V3(Math.cos(fa + 0.6) * 1.3, 0.02, Math.sin(fa + 0.6) * 1.3);
  gb.add(octa(0.13, 1.4), { m: M().setPosition(bc.clone().add(new V3(0, 0.12, 0))), col: '#6a3a3e', reveal: 2, centre: bc });
  return { geo: gb.build(), tris: gb.tris };
}
function waterlily(opts) {
  const v = variantOf(opts);
  const d = cached('waterlily' + v, () => buildWaterlily(v));
  return makeVisual({
    name: 'waterlily', geo: d.geo, H: 0.3, trunkR: 1.0, sway: 0, droop: 0,
    look: { roughness: 0.55 },
    crown: { top: 0.2, bottom: 0, radius: 2.4, density: 0.9 },
    grow(g) { return { s: lerp(0.3, 1.0, Math.pow(g, 0.8)), leaf: lerp(0.3, 1.001, smoothstep(0.1, 0.8, g)) }; },
    onUpdate(dt, t, w, u, body, st) { body.position.y = 0.012 * Math.sin(t * 0.8 + st.phase); body.rotation.z = 0.006 * Math.sin(t * 0.6 + st.phase); },
  }, opts);
}

// ═════════════════════════════ export ═════════════════════════════
export const PLANTS = { kapok, brazilnut, fig, cecropia, acai, heliconia, bromeliad, orchid, liana, fern, glowfungus, waterlily };
// debug helper: triangle counts per species variant (built lazily)
export function _plantStats() {
  const out = {};
  for (const id of Object.keys(PLANTS)) {
    const vis = PLANTS[id]({ seed: 3, rng: makeRng(3), hostHeight: 20, hostRadius: 0.6 });
    let tris = 0, meshes = 0; vis.object.traverse(o => { if (o.isMesh) { meshes++; tris += o.geometry.attributes.position.count / 3; } });
    out[id] = { tris, meshes }; vis.dispose();
  }
  return out;
}

// Called by the zone pack when its zone closes: frees the cached geometry / materials (rebuilt on the next visit).
export function releaseCaches() { disposeDeep(CACHE); CACHE.clear(); }
