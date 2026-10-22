// Amazon plants: the shared toolkit (1.3.2: moved here from src/models/amazon-plants.js unchanged).
// The shader-driven plant material (makeUniforms, makePlantMaterials; the custom attributes are described below),
// the geometry builder GB, primitives (orient, place, sweep, leafBlade, blob, bead, octa, starFlower) and shared
// tree parts (trunkGeo, branchCurve, barkCol, leafCol, seedlingGeo). Exports these and V3, TAU.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { clamp, lerp, jitterColor } from '../../core/util.js';

export const V3 = THREE.Vector3;
export const TAU = Math.PI * 2;

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
export function makePlantMaterials(look = {}) {
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
export class GB {
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
export const M = () => new THREE.Matrix4();
// matrix: translate p, rotate so +Y → dir (and twist), scale s
export function orient(p, dir, twist = 0, s = 1) {
  const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), _v.copy(dir).normalize());
  const qt = new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), twist);
  q.multiply(qt);
  const sc = typeof s === 'number' ? new V3(s, s, s) : s;
  return M().compose(p.clone(), q, sc);
}
// Euler-based placement (yaw around Y, pitch around X) for leaves pointing along +Z
export function place(p, yaw = 0, pitch = 0, roll = 0, s = 1) {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, roll, 'YXZ'));
  const sc = typeof s === 'number' ? new V3(s, s, s) : s;
  return M().compose(p.clone(), q, sc);
}

// Swept tube along a curve with radius function r(t, angle). Includes uv (t, a).
export function sweep(curve, segs, radial, rFn, cap = false) {
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
export const curveOf = (pts) => new THREE.CatmullRomCurve3(pts, false, 'centripetal');

// Leaf blade along +Z, face up (+Y). w(t) width profile; bend = tip drop (fraction of len); fold = V-fold of the halves.
export function leafBlade(len, wid, { segs = 3, bend = 0.25, fold = 0.25, shape = 'ellipse', curl = 0 } = {}) {
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
export function hash3(x, y, z) { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return s - Math.floor(s); }
export function blob(r, detail, amt = 0.25, sy = 1, seed = 0) {
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
export function bead(r, sy = 1, detail = 0) { const g = new THREE.IcosahedronGeometry(r, detail); g.scale(1, sy, 1); return g; }
export function octa(r, sy = 1) { const g = new THREE.OctahedronGeometry(r, 0); g.scale(1, sy, 1); return g; }
// star flower: n petals as flat diamonds around +Y
export function starFlower(r, n = 5, cup = 0.3) {
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
export function trunkGeo(curve, { r0, r1, segs = 10, radial = 9, flare = 0.6, flareH = 0.08, noise = 0.08, ridges = 0, ridgeAmt = 0.06, cap = true }) {
  return sweep(curve, segs, radial, (t, a) => {
    let r = lerp(r0, r1, Math.pow(t, 0.8));
    r *= 1 + flare * Math.exp(-t / flareH);
    r *= 1 + noise * (hash3(t * 6.1, a * 1.7, r0) - 0.5);
    if (ridges) r *= 1 + ridgeAmt * Math.cos(a * ridges + t * 3);
    return r;
  }, cap);
}
// branch: tapered tube from p0 along dir with an upward/outward arc
export function branchCurve(p0, p1, sag = 0.15, rng = Math.random) {
  const mid = p0.clone().lerp(p1, 0.5);
  mid.y += p0.distanceTo(p1) * sag;
  mid.x += (rng() - 0.5) * 0.4; mid.z += (rng() - 0.5) * 0.4;
  return curveOf([p0, mid, p1]);
}
export function barkCol(base, dark, rng, streak = 0.18) {
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
export function leafCol(base, rng, { dh = 0.025, ds = 0.08, dl = 0.07, tip = null } = {}) {
  const b = jitterColor(base, rng, dh, ds, dl); const tc = tip ? new THREE.Color(tip) : null;
  return (c, p, n, uv, i) => { c.copy(b); if (tc && (i % 3) !== 0) c.lerp(tc, 0.35); };
}

// Generic young plant: a slender stem with a few leaves (used as the seedling/sapling form of trees).
export function seedlingGeo(rng, { h = 1.6, leaves = 5, leafLen = 0.45, leafWid = 0.22, stemCol = '#6d5a3a', leafColor = '#4f8a2e', shape = 'ellipse', palmate = 0 }) {
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
