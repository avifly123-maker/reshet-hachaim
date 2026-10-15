// Grove (חורש ארץ-ישראלי) plant models — procedural, cached per species & variant (seed % 3).
// Exports PLANTS = { oak, terebinth, carob, pine, mastic, buckthorn, sage, rockrose, cyclamen, anemone, mushroom }.
//
// Technique: every part is a merged BufferGeometry with per-vertex colour plus two extra attributes:
//   aCenter (vec3) – the point a leaf blob / flower / fruit collapses into when hidden
//   aRank   (float) – per-element random rank; elements with rank > uKeep are scaled to 0 (leaf drop, thinning,
//                     partial bloom/fruit), and rank also staggers colour changes (autumn leaves turn blob by blob).
// A small onBeforeCompile patch (shared by all materials → one shader program per material type) adds wind sway,
// collapse/grow, drooping and seasonal / drought colour mixing, and is mirrored in the shadow depth material.
// Geometry is shared between instances; each instance owns light-weight material clones holding its uniforms.
import * as THREE from 'three';
import { makeRng, makeNoise2D, hashString, clamp, lerp, smoothstep, disposeDeep } from '../core/util.js';

const V3 = THREE.Vector3;
const Col = THREE.Color;
const UP = new V3(0, 1, 0);
const TAU = Math.PI * 2;
const SEASON_INDEX = { winter: 0, spring: 1, summer: 2, autumn: 3 };

// ---------------------------------------------------------------------------------------------------------------
// Shader patch
const VERT_PRE = /* glsl */`
uniform float uTime; uniform float uWind; uniform float uPhase; uniform float uH; uniform float uR;
uniform float uSway; uniform float uFlutter; uniform float uSquash;
uniform float uKeep; uniform float uGrow; uniform float uDroop;
attribute vec3 aCenter; attribute float aRank;
varying float vRank;
`;
const VERT_BEGIN = /* glsl */`
vec3 transformed = vec3( position );
vRank = aRank;
{
  float vis = clamp( ( uKeep - aRank ) * 14.0 + 0.5, 0.0, 1.0 );
  transformed = aCenter + ( transformed - aCenter ) * ( vis * uGrow );
  float rr = length( transformed.xz );
  float rn = rr / max( uR, 0.05 );
  transformed.y = transformed.y * ( 1.0 - uDroop * uSquash ) - uDroop * uH * 0.08 * rn * rn;
  float hh = max( transformed.y, 0.0 ) / uH;
  float sw = sin( uTime * 1.13 + uPhase ) * 0.55 + sin( uTime * 2.31 + uPhase * 1.7 ) * 0.25 + sin( uTime * 0.41 + uPhase * 0.3 ) * 0.35;
  vec2 dir = vec2( 0.94, 0.34 );
  transformed.xz += dir * ( sw * ( 0.25 + uWind ) + uWind * 0.6 ) * uSway * hh * hh * uH;
  float fl = sin( uTime * 6.3 + aCenter.x * 2.1 + aCenter.z * 1.7 + aCenter.y * 1.3 ) * uFlutter * ( 0.25 + uWind ) * step( 0.001, aRank );
  transformed += vec3( 0.6, 1.0, 0.45 ) * fl;
}
`;
const FRAG_PRE = /* glsl */`
uniform vec3 uTarget; uniform vec3 uTarget2; uniform float uTargetAmt;
uniform vec3 uDry; uniform float uDryAmt; uniform float uBaseL; uniform vec3 uTint;
varying float vRank;
`;
const FRAG_COLOR = /* glsl */`
#if defined( USE_COLOR )
{
  vec3 c = vColor.rgb;
  float l = clamp( dot( c, vec3( 0.299, 0.587, 0.114 ) ) / max( uBaseL, 0.001 ), 0.45, 1.6 );
  float r2 = fract( vRank * 7.137 + 0.31 );
  float r3 = fract( vRank * 13.71 + 0.77 );
  float ta = clamp( uTargetAmt * 1.6 - r2 * 0.6, 0.0, 1.0 );
  c = mix( c, mix( uTarget, uTarget2, r3 ) * l, ta );
  float da = clamp( uDryAmt * 1.6 - r3 * 0.6, 0.0, 1.0 );
  c = mix( c, mix( uDry, uDry * vec3( 0.8, 0.68, 0.56 ), r2 ) * l, da );
  diffuseColor.rgb *= c * uTint;
}
#endif
`;
// foliage cards are double sided; keep our hand-made (crown-spherical) normals on back faces too
const FRAG_NORMAL = /* glsl */`
#include <normal_fragment_begin>
#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
  normal *= faceDirection;
  nonPerturbedNormal = normal;
#endif
`;
function patchShader(shader) {
  const U = this.userData.U;
  for (const k in U) shader.uniforms[k] = U[k];
  shader.vertexShader = VERT_PRE + shader.vertexShader.replace('#include <begin_vertex>', VERT_BEGIN);
  shader.fragmentShader = FRAG_PRE + shader.fragmentShader
    .replace('#include <color_fragment>', FRAG_COLOR)
    .replace('#include <normal_fragment_begin>', FRAG_NORMAL);
}

function makeUniforms(shared, baseL) {
  return Object.assign({
    uKeep: { value: 1 }, uGrow: { value: 1 }, uDroop: { value: 0 },
    uTarget: { value: new Col(1, 1, 1) }, uTarget2: { value: new Col(1, 1, 1) }, uTargetAmt: { value: 0 },
    uDry: { value: new Col('#9c8f5c') }, uDryAmt: { value: 0 }, uBaseL: { value: baseL || 0.1 },
    uTint: { value: new Col(1, 1, 1) },
  }, shared);
}

// ---------------------------------------------------------------------------------------------------------------
// Geometry helpers
class Geo {
  constructor() { this.P = []; this.N = []; this.C = []; this.Ce = []; this.R = []; }
  get tris() { return this.P.length / 9; }
  vert(p, n, c, ce, r) {
    this.P.push(p.x, p.y, p.z); this.N.push(n.x, n.y, n.z); this.C.push(c.r, c.g, c.b);
    const e = ce || p; this.Ce.push(e.x, e.y, e.z); this.R.push(r || 0);
  }
  tri(a, b, c, na, nb, nc, ca, cb, cc, ce, r) { this.vert(a, na, ca, ce, r); this.vert(b, nb, cb, ce, r); this.vert(c, nc, cc, ce, r); }
  build() {
    if (!this.P.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.N, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.C, 3));
    g.setAttribute('aCenter', new THREE.Float32BufferAttribute(this.Ce, 3));
    g.setAttribute('aRank', new THREE.Float32BufferAttribute(this.R, 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    // generous bounds so wind/droop never culls a visible plant
    g.boundingSphere.radius *= 1.15;
    return g;
  }
}

function rndUnit(rng) {
  const u = rng() * 2 - 1, a = rng() * TAU, s = Math.sqrt(1 - u * u);
  return new V3(Math.cos(a) * s, u, Math.sin(a) * s);
}
function jit(c, rng, dl = 0.08, dh = 0.012, ds = 0.05) {
  const hsl = {}; new Col(c).getHSL(hsl);
  return new Col().setHSL((hsl.h + rng.range(-dh, dh) + 1) % 1, clamp(hsl.s + rng.range(-ds, ds)), clamp(hsl.l * (1 + rng.range(-dl, dl))));
}
function lum(c) { c = new Col(c); return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b; }
function hash3(x, y, z) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
function perp(n, rng) { const t = rndUnit(rng); t.addScaledVector(n, -t.dot(n)); if (t.lengthSq() < 1e-4) t.set(1, 0, 0); return t.normalize(); }
// periodic smooth keyframes over the year position y ∈ [0,1) (winter 0, spring .25, summer .5, autumn .75)
function kf(keys, y) {
  const n = keys.length; if (!n) return 0; if (n === 1) return keys[0][1];
  for (let i = 0; i < n; i++) {
    const a = keys[i], b = keys[(i + 1) % n];
    const ya = a[0], yb = i === n - 1 ? b[0] + 1 : b[0];
    let yy = y; if (yy < ya) yy += 1;
    if (yy >= ya && yy <= yb) { const t = (yy - ya) / Math.max(1e-6, yb - ya); return a[1] + (b[1] - a[1]) * t * t * (3 - 2 * t); }
  }
  return keys[0][1];
}

// tapered tube along a polyline (parallel transport frames)
function tube(geo, pts, rads, k, colorFn, o = {}) {
  const n = pts.length; const rings = []; let N = null;
  for (let i = 0; i < n; i++) {
    const T = (i === 0 ? pts[1].clone().sub(pts[0]) : i === n - 1 ? pts[i].clone().sub(pts[i - 1]) : pts[i + 1].clone().sub(pts[i - 1])).normalize();
    if (!N) N = (Math.abs(T.y) < 0.9 ? new V3(0, 1, 0) : new V3(1, 0, 0)).cross(T).normalize();
    else { N = N.clone().addScaledVector(T, -N.dot(T)); if (N.lengthSq() < 1e-6) N = (Math.abs(T.y) < 0.9 ? new V3(0, 1, 0) : new V3(1, 0, 0)).cross(T); N.normalize(); }
    const B = new V3().crossVectors(T, N);
    const ring = [];
    for (let j = 0; j < k; j++) {
      const a = j / k * TAU + (o.twist || 0) * i;
      const dir = N.clone().multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a));
      let r = rads[i];
      if (o.lobes && i < o.lobes.rings) r *= 1 + o.lobes.amp * (1 - i / o.lobes.rings) * (0.5 + 0.5 * Math.sin(a * o.lobes.n + o.lobes.ph));
      if (o.jit && o.rng) r *= 1 + (o.rng() - 0.5) * o.jit;
      ring.push({ p: pts[i].clone().addScaledVector(dir, r), n: dir, c: colorFn(i / (n - 1), j / k, pts[i]) });
    }
    rings.push(ring);
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < k; j++) {
    const a = rings[i][j], b = rings[i][(j + 1) % k], c = rings[i + 1][(j + 1) % k], d = rings[i + 1][j];
    geo.tri(a.p, b.p, c.p, a.n, b.n, c.n, a.c, b.c, c.c, o.ce, o.rank);
    geo.tri(a.p, c.p, d.p, a.n, c.n, d.n, a.c, c.c, d.c, o.ce, o.rank);
  }
  if (o.capEnd) {
    const last = rings[n - 1], tip = pts[n - 1].clone().add(pts[n - 1].clone().sub(pts[n - 2]).normalize().multiplyScalar(rads[n - 1]));
    const tn = pts[n - 1].clone().sub(pts[n - 2]).normalize();
    for (let j = 0; j < k; j++) { const a = last[j], b = last[(j + 1) % k]; geo.tri(a.p, b.p, tip, a.n, b.n, tn, a.c, b.c, a.c, o.ce, o.rank); }
  }
}

function walk(start, dir, len, n, rng, gnarl, upBias = 0) {
  const pts = [start.clone()]; const d = dir.clone().normalize(); let p = start.clone(); const step = len / n;
  for (let i = 1; i <= n; i++) { d.add(rndUnit(rng).multiplyScalar(gnarl)).addScaledVector(UP, upBias).normalize(); p = p.clone().addScaledVector(d, step); pts.push(p); }
  return { pts, dir: d };
}
function curve(A, B, n, rng, bendUp, gnarl) {
  const L = A.distanceTo(B);
  const C = A.clone().lerp(B, 0.5).addScaledVector(UP, L * bendUp).add(rndUnit(rng).multiplyScalar(L * 0.1));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    const p = A.clone().multiplyScalar(u * u).addScaledVector(C, 2 * u * t).addScaledVector(B, t * t);
    if (i > 0 && i < n) p.add(rndUnit(rng).multiplyScalar(L * gnarl * 0.05));
    pts.push(p);
  }
  return pts;
}
function taper(n, r0, r1, pow = 1) { const r = []; for (let i = 0; i < n; i++) r.push(lerp(r0, r1, Math.pow(i / Math.max(1, n - 1), pow))); return r; }

const ICO = [new THREE.IcosahedronGeometry(1, 0), new THREE.IcosahedronGeometry(1, 1)];
// irregular leaf-mass blob; normals blended toward crown-spherical for a soft canopy shading
function blob(geo, c, r, sy, rng, o) {
  const src = ICO[o.detail || 0].attributes.position;
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rng() * TAU, rng() * TAU, rng() * TAU));
  const sp = o.spiky ?? 0.18; const P = [];
  for (let i = 0; i < src.count; i++) {
    const u = new V3().fromBufferAttribute(src, i);
    const h = hash3(Math.round(u.x * 1000), Math.round(u.y * 1000), Math.round(u.z * 1000));
    const p = u.multiplyScalar(r * (1 + (h - 0.5) * 2 * sp)).applyQuaternion(q); p.y *= sy; p.add(c); P.push(p);
  }
  const ce = o.center || c;
  for (let i = 0; i < P.length; i += 3) {
    const a = P[i], b = P[i + 1], cc = P[i + 2];
    const fn = new V3().subVectors(b, a).cross(new V3().subVectors(cc, a)).normalize();
    const fc = jit(o.base, rng, o.cj ?? 0.05, 0.008, 0.03);
    geo.tri(a, b, cc, fNormal(a, fn, o), fNormal(b, fn, o), fNormal(cc, fn, o), shade(fc, a, o), shade(fc, b, o), shade(fc, cc, o), ce, o.rank);
  }
}
function fNormal(p, fn, o) {
  const s = new V3((p.x - o.crownC.x) / o.rx, (p.y - o.crownC.y) / o.ry, (p.z - o.crownC.z) / o.rx).normalize();
  const f = o.faceN ?? 0.35;
  return fn.clone().multiplyScalar(f).addScaledVector(s, 1 - f).addScaledVector(UP, 0.15).normalize();
}
function shade(c, p, o) {
  const dx = (p.x - o.crownC.x) / o.rx, dy = (p.y - o.crownC.y) / o.ry, dz = (p.z - o.crownC.z) / o.rx;
  const rad = clamp(Math.sqrt(dx * dx + dy * dy + dz * dz));
  const top = clamp(dy * 0.5 + 0.5);
  const lo = o.aoLo ?? 0.5;
  return c.clone().multiplyScalar((lo + (1 - lo) * rad) * (0.78 + 0.34 * top));
}
// leaf card (2 tris, slight V fold); n = facing normal used for lighting
function card(geo, p, nOut, len, wid, rng, c, ce, rank, o = {}) {
  const t = o.t ? o.t.clone().normalize() : perp(nOut, rng);
  const b = new V3().crossVectors(nOut, t).normalize();
  const base = p.clone().addScaledVector(t, -len * 0.5), tip = p.clone().addScaledVector(t, len * 0.5);
  const fold = (o.fold ?? 0.15) * wid;
  const l = p.clone().addScaledVector(b, wid * 0.5).addScaledVector(nOut, -fold).addScaledVector(t, -len * 0.08);
  const r = p.clone().addScaledVector(b, -wid * 0.5).addScaledVector(nOut, -fold).addScaledVector(t, -len * 0.08);
  const n = o.n || nOut.clone().addScaledVector(UP, 0.4).normalize();
  const cb = c.clone().multiplyScalar(o.baseDark ?? 0.8), ct = c.clone().multiplyScalar(o.tipLight ?? 1.1);
  geo.tri(base, l, tip, n, n, n, cb, c, ct, ce, rank);
  geo.tri(base, tip, r, n, n, n, cb, ct, c, ce, rank);
}
// bipyramid gem (berries, acorns, cones, buds)
function gem(geo, c, axis, len, rad, sides, colA, colB, ce, rank, o = {}) {
  const q = new THREE.Quaternion().setFromUnitVectors(UP, axis.clone().normalize());
  const top = c.clone().addScaledVector(axis, len * (o.top ?? 0.5)), bot = c.clone().addScaledVector(axis, -len * (1 - (o.top ?? 0.5)));
  const ring = [];
  for (let j = 0; j < sides; j++) { const a = j / sides * TAU + (o.rot || 0); ring.push(new V3(Math.cos(a) * rad, 0, Math.sin(a) * rad).applyQuaternion(q).add(c)); }
  const nt = axis.clone(), nb = axis.clone().negate();
  for (let j = 0; j < sides; j++) {
    const a = ring[j], b = ring[(j + 1) % sides];
    const na = a.clone().sub(c).normalize(), nbb = b.clone().sub(c).normalize();
    geo.tri(top, b, a, nt, nbb, na, colA, colA.clone().lerp(colB, 0.5), colA.clone().lerp(colB, 0.5), ce, rank);
    geo.tri(bot, a, b, nb, na, nbb, colB, colA.clone().lerp(colB, 0.5), colA.clone().lerp(colB, 0.5), ce, rank);
  }
}
// lathe with per-profile-point colour; prof = [{r, y, c}] bottom→top
function lathe(geo, prof, segs, origin, q, ce, rank) {
  const rings = []; const m = prof.length;
  for (let i = 0; i < m; i++) {
    const a = prof[Math.max(0, i - 1)], b = prof[Math.min(m - 1, i + 1)];
    const dr = b.r - a.r, dy = b.y - a.y; const nl = new THREE.Vector2(dy, -dr).normalize();
    const ring = [];
    for (let j = 0; j < segs; j++) {
      const ang = j / segs * TAU; const cs = Math.cos(ang), sn = Math.sin(ang);
      ring.push({ p: new V3(cs * prof[i].r, prof[i].y, sn * prof[i].r).applyQuaternion(q).add(origin), n: new V3(cs * nl.x, nl.y, sn * nl.x).applyQuaternion(q).normalize(), c: prof[i].c });
    }
    rings.push(ring);
  }
  for (let i = 0; i < m - 1; i++) for (let j = 0; j < segs; j++) {
    const a = rings[i][j], b = rings[i][(j + 1) % segs], c = rings[i + 1][(j + 1) % segs], d = rings[i + 1][j];
    if (prof[i + 1].r > 1e-4) geo.tri(a.p, c.p, b.p, a.n, c.n, b.n, a.c, c.c, b.c, ce, rank);
    geo.tri(a.p, d.p, c.p, a.n, d.n, c.n, a.c, d.c, c.c, ce, rank);
  }
}
function barkFn(base, alt, rng, noise, o = {}) {
  const A = new Col(base), B = new Col(alt);
  return (t, a, p) => {
    const n = noise(a * (o.fiss || 3) * 1.7 + p.y * 0.15, p.y * (o.vert || 0.9) + a * 0.7);
    const c = A.clone().lerp(B, clamp(0.5 + n * 1.2));
    c.multiplyScalar((0.62 + 0.38 * smoothstep(0, 1.3, p.y)) * (0.9 + rng() * 0.18) * (o.light || 1));
    if (o.upper) c.lerp(new Col(o.upper), smoothstep(o.upperY || 4, (o.upperY || 4) * 1.6, p.y) * 0.6);
    return c;
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Woody plants (trees & shrubs) — trunk(s) → limbs → leaf clusters of blobs + cards
const WOODY = {
  oak: {
    H: 10, stems: [2, 4], stemSpread: 0.42, bole: 0.9, trunkH: 2.4, trunkR: 0.36, lean: 0.1, gnarl: 0.3,
    crown: { cy: 6.3, rx: 4.3, ry: 3.0 }, clusters: [13, 14], clusterR: [1.2, 1.65], uRange: [-0.6, 0.95], shell: [0.48, 0.8],
    blobs: [4, 5], blobR: [0.68, 0.95], blobSy: 0.78, spiky: 0.26, limbs: [4, 5], bendUp: 0.16, limbGnarl: 1.0,
    leaf: '#3f5f2b', leaf2: '#324f24', cards: 7, cardLen: 0.4, cardWid: 0.26, twigs: 0, faceN: 0.12,
    bark: '#6a5c4e', bark2: '#463b33', fiss: 3, kTrunk: 7, seedling: 'broad', seedCol: '#4a6a30',
  },
  terebinth: {
    H: 9, stems: [1, 2], stemSpread: 0.5, bole: 0.5, trunkH: 2.2, trunkR: 0.3, lean: 0.12, gnarl: 0.22,
    crown: { cy: 5.9, rx: 5.0, ry: 2.4 }, clusters: [13, 14], clusterR: [1.2, 1.6], uRange: [-0.4, 0.95], shell: [0.55, 0.88],
    blobs: [4, 4], blobR: [0.58, 0.82], blobSy: 0.68, spiky: 0.3, limbs: [4, 5], bendUp: 0.1, limbGnarl: 0.8, limbOut: 0.62,
    leaf: '#55752f', leaf2: '#4a6a2a', cards: 7, cardLen: 0.46, cardWid: 0.17, twigs: 3, twigLen: 0.7, faceN: 0.12,
    bark: '#8a857c', bark2: '#5e5a54', fiss: 2, kTrunk: 7, seedling: 'pinnate', seedCol: '#6a7a34',
  },
  carob: {
    H: 9, stems: [1, 1], stemSpread: 0, bole: 0, trunkH: 2.0, trunkR: 0.46, lean: 0.06, gnarl: 0.18,
    crown: { cy: 5.5, rx: 4.5, ry: 3.0 }, clusters: [13, 14], clusterR: [1.25, 1.75], uRange: [-0.7, 0.95], shell: [0.48, 0.8],
    blobs: [4, 5], blobR: [0.72, 1.0], blobSy: 0.76, spiky: 0.16, limbs: [4, 5], bendUp: 0.2, limbGnarl: 0.6,
    leaf: '#2e4f25', leaf2: '#3c5f2c', cards: 6, cardLen: 0.46, cardWid: 0.3, twigs: 0, faceN: 0.15,
    bark: '#6a5a4c', bark2: '#4a3d33', fiss: 4, kTrunk: 8, seedling: 'pinnate', seedCol: '#3e6a2c', lobes: 0.22,
  },
  pine: {
    H: 16, stems: [1, 1], stemSpread: 0, bole: 0, trunkH: 13.2, trunkR: 0.42, lean: 0.16, gnarl: 0.06, forkMode: 'along',
    crown: { cy: 12.0, rx: 4.2, ry: 4.0 }, clusters: [11, 12], clusterR: [1.3, 1.8], blobs: [4, 5], blobR: [0.6, 0.9],
    blobSy: 0.5, spiky: 0.42, limbs: [0, 0], bendUp: 0.25, limbGnarl: 0.8,
    leaf: '#5d8466', leaf2: '#4e7560', cards: 4, cardLen: 0.62, cardWid: 0.07, needle: true, twigs: 0, faceN: 0.2,
    bark: '#7a7068', bark2: '#8a5844', fiss: 5, vert: 1.6, kTrunk: 7, upper: '#9a6a4a', upperY: 9, seedling: 'needle', seedCol: '#5d8466',
  },
  mastic: {
    H: 3, shrub: true, stems: [5, 7], stemSpread: 0.9, bole: 0, trunkH: 0.55, trunkR: 0.07, lean: 0, gnarl: 0.3,
    crown: { cy: 1.4, rx: 1.75, ry: 1.25 }, clusters: [10, 10], clusterR: [0.5, 0.7], uRange: [-0.85, 0.95], shell: [0.5, 0.78],
    blobs: [3, 3], blobR: [0.36, 0.5], blobSy: 0.85, spiky: 0.28, limbs: [0, 0], bendUp: 0.25, limbGnarl: 0.8,
    leaf: '#3a552d', leaf2: '#2d4626', cards: 3, cardLen: 0.2, cardWid: 0.11, twigs: 0, faceN: 0.2,
    bark: '#5e4c3c', bark2: '#4a3b30', fiss: 2, kTrunk: 3, kLimb: 3, stemSeg: 3,
  },
  buckthorn: {
    H: 3, shrub: true, stems: [4, 5], stemSpread: 0.6, bole: 0, trunkH: 0.5, trunkR: 0.06, lean: 0, gnarl: 0.35,
    crown: { cy: 1.45, rx: 1.3, ry: 1.2 }, clusters: [12, 12], clusterR: [0.35, 0.5], uRange: [-0.9, 0.95], shell: [0.45, 0.8],
    blobs: [2, 2], blobR: [0.28, 0.38], blobSy: 0.9, spiky: 0.4, limbs: [0, 0], bendUp: 0.2, limbGnarl: 1.2,
    leaf: '#4a6a2e', leaf2: '#3e5c28', cards: 5, cardLen: 0.13, cardWid: 0.06, twigs: 1, twigLen: 0.9, spines: true, faceN: 0.15,
    bark: '#5a4a40', bark2: '#3e332c', fiss: 2, kTrunk: 3, kLimb: 3, stemSeg: 3,
  },
};

function buildWoody(id, variant) {
  const sp = WOODY[id];
  const rng = makeRng(hashString(id) + variant * 7919 + 13);
  const noise = makeNoise2D(hashString(id) + variant * 31);
  const wood = new Geo(), leaves = new Geo(), fruit = new Geo(), flowers = new Geo(), seed = new Geo();
  const k = rng.range(0.93, 1.06); const H = sp.H * k;
  const crownC = new V3(rng.range(-0.25, 0.25) * k, sp.crown.cy * k, rng.range(-0.25, 0.25) * k);
  const rx = sp.crown.rx * k * rng.range(0.92, 1.08), ry = sp.crown.ry * k;
  const bark = barkFn(sp.bark, sp.bark2, rng, noise, { fiss: sp.fiss, vert: sp.vert, upper: sp.upper, upperY: sp.upperY });
  const kL = sp.kLimb || 5;
  const perch = [], attach = [];

  // ---- stems / trunk
  const nStems = rng.int(sp.stems[0], sp.stems[1]);
  const leanA = rng() * TAU; const lean = new V3(Math.cos(leanA), 0, Math.sin(leanA)).multiplyScalar(sp.lean);
  const stems = [];
  const r0All = sp.trunkR * k;
  if (sp.bole > 0 && nStems > 1) { // shared gnarled bole
    const bp = [new V3(0, -0.15, 0), new V3(0, sp.bole * 0.5, 0), new V3(0, sp.bole, 0)];
    tube(wood, bp, [r0All * 1.5, r0All * 1.25, r0All * 1.05], sp.kTrunk + 1, bark, { lobes: { rings: 2, amp: 0.35, n: 5, ph: rng() * 6 }, rng, jit: 0.12 });
  }
  for (let s = 0; s < nStems; s++) {
    const ang = (s / nStems) * TAU + rng.range(-0.5, 0.5);
    const out = new V3(Math.cos(ang), 0, Math.sin(ang));
    const multi = nStems > 1;
    const start = multi ? out.clone().multiplyScalar(r0All * (sp.shrub ? 0.6 : 0.35)).setY(sp.bole > 0 ? sp.bole * 0.55 : -0.05) : new V3(0, -0.1, 0);
    const dir = new V3(0, 1, 0).addScaledVector(out, multi ? sp.stemSpread * rng.range(0.7, 1.2) : 0).add(lean);
    const len = sp.trunkH * k * (multi ? rng.range(0.75, 1.15) : 1) * (sp.shrub ? rng.range(0.8, 1.3) : 1);
    const nseg = sp.forkMode === 'along' ? 9 : (sp.stemSeg || 5);
    const w = walk(start, dir, len, nseg, rng, sp.gnarl, sp.shrub ? 0.05 : 0.08);
    const rr0 = multi ? r0All / Math.sqrt(nStems) * 1.2 : r0All;
    const rads = taper(w.pts.length, rr0, rr0 * (sp.forkMode === 'along' ? 0.35 : 0.72), 0.8);
    if (!multi && !sp.shrub) { rads[0] *= 1.35; }
    tube(wood, w.pts, rads, sp.kTrunk, bark, { lobes: !multi && !sp.shrub ? { rings: 2, amp: sp.lobes ?? 0.3, n: 4, ph: rng() * 6 } : null, rng, jit: 0.1 });
    stems.push({ pts: w.pts, rads, top: w.pts[w.pts.length - 1], r: rads[rads.length - 1] });
  }

  // ---- leaf clusters
  const nC = rng.int(sp.clusters[0], sp.clusters[1]);
  const clusters = [];
  if (sp.forkMode === 'along') { // pine: irregular tiers, wide below, narrow top, flattened clumps
    const T = stems[0];
    for (let i = 0; i < nC; i++) {
      const f = (i + rng.range(0.1, 0.9)) / nC; // 0 low … 1 top
      const y = lerp(0.52, 0.97, f) * H;
      const hd = lerp(4.3, 0.9, Math.pow(f, 1.2)) * k * rng.range(0.6, 1.1);
      const az = i * 2.39996 + rng.range(-0.5, 0.5);
      const tp = trunkAt(T.pts, y);
      clusters.push({ pos: new V3(tp.x + Math.cos(az) * hd, y + rng.range(-0.3, 0.3), tp.z + Math.sin(az) * hd), r: rng.range(sp.clusterR[0], sp.clusterR[1]) * k * lerp(1.05, 0.8, f), az });
    }
    clusters.push({ pos: T.top.clone().add(new V3(0, 0.35, 0)), r: sp.clusterR[0] * k, az: 0, apex: true });
  } else {
    for (let i = 0; i < nC; i++) {
      const u = lerp(sp.uRange[0], sp.uRange[1], (i + rng.range(0.15, 0.85)) / nC);
      const az = i * 2.39996 + rng.range(-0.3, 0.3);
      const s = rng.range(sp.shell[0], sp.shell[1]);
      const rr = Math.sqrt(Math.max(0, 1 - u * u)) * s;
      clusters.push({ pos: new V3(crownC.x + Math.cos(az) * rr * rx, crownC.y + u * s * ry, crownC.z + Math.sin(az) * rr * rx), r: rng.range(sp.clusterR[0], sp.clusterR[1]) * k, az });
    }
    clusters.push({ pos: crownC.clone().add(new V3(rng.range(-0.3, 0.3), ry * 0.62, rng.range(-0.3, 0.3))), r: sp.clusterR[1] * k, az: rng() * TAU });
  }

  // ---- limbs
  const limbList = [];
  const addLimb = (pts, r0, r1, kk) => { tube(wood, pts, taper(pts.length, r0, r1, 0.9), kk, bark, { rng, jit: 0.08 }); limbList.push({ pts, r0, r1 }); };
  if (sp.forkMode === 'along') {
    const T = stems[0];
    for (const c of clusters) {
      if (c.apex) continue;
      const hd = Math.hypot(c.pos.x - T.top.x, c.pos.z - T.top.z);
      const oy = clamp(c.pos.y - 0.6 - hd * 0.35, H * 0.45, T.top.y - 0.4);
      const A = trunkAt(T.pts, oy);
      const tr = lerp(T.rads[0], T.rads[T.rads.length - 1], clamp(oy / T.top.y));
      const pts = curve(A, c.pos.clone().addScaledVector(UP, -0.15), 4, rng, sp.bendUp, sp.limbGnarl);
      addLimb(pts, tr * 0.55, 0.05 * k, 5);
      c.limb = pts;
      // forked secondary toward a sub-clump
      const sub = c.pos.clone().add(new V3(rng.range(-1, 1), rng.range(-0.2, 0.4), rng.range(-1, 1)).multiplyScalar(c.r * 0.9));
      const sp2 = curve(pts[2], sub, 2, rng, 0.2, 0.5); addLimb(sp2, tr * 0.25, 0.035 * k, 4);
      perch.push(pts[3].clone().add(new V3(0, tr * 0.4, 0)));
      attach.push({ pos: pts[2].clone(), normal: UP.clone() });
    }
    // a few dead stubs on the lower trunk
    for (let i = 0; i < 4; i++) {
      const y = rng.range(H * 0.2, H * 0.48); const A = trunkAt(T.pts, y); const az = rng() * TAU;
      const B = A.clone().add(new V3(Math.cos(az), rng.range(-0.15, 0.25), Math.sin(az)).multiplyScalar(rng.range(0.5, 1.1)));
      addLimb([A, A.clone().lerp(B, 0.5), B], 0.07 * k, 0.025 * k, 3);
    }
  } else if (sp.shrub) {
    // each cluster gets a branch from a stem point
    for (const c of clusters) {
      const st = stems[Math.floor(rng() * stems.length)];
      const A = st.pts[Math.min(st.pts.length - 1, rng.int(1, st.pts.length - 1))];
      const pts = curve(A, c.pos.clone().lerp(crownC, 0.15), 3, rng, sp.bendUp, sp.limbGnarl);
      addLimb(pts, st.r * 0.9, 0.018, kL);
      perch.push(c.pos.clone().add(new V3(0, c.r * 0.55, 0)));
      c.limb = pts;
    }
  } else {
    // group clusters by azimuth into main limbs, then secondaries to each cluster
    const order = clusters.slice().sort((a, b) => Math.atan2(a.pos.z - crownC.z, a.pos.x - crownC.x) - Math.atan2(b.pos.z - crownC.z, b.pos.x - crownC.x));
    const nL = rng.int(sp.limbs[0], sp.limbs[1]);
    const per = Math.ceil(order.length / nL);
    for (let g = 0; g < nL; g++) {
      const grp = order.slice(g * per, (g + 1) * per); if (!grp.length) continue;
      const st = stems[g % stems.length];
      const F = st.top;
      const M = new V3(); grp.forEach(c => M.add(c.pos)); M.multiplyScalar(1 / grp.length);
      const Q = F.clone().lerp(M, sp.limbOut ?? 0.5).addScaledVector(UP, 0.25 * k).add(rndUnit(rng).multiplyScalar(0.25 * k));
      const mp = curve(F, Q, 4, rng, sp.bendUp, sp.limbGnarl);
      const mr = st.r * 0.82;
      addLimb(mp, mr, mr * 0.6, 6);
      attach.push({ pos: Q.clone(), normal: UP.clone() });
      for (const c of grp) {
        const sp2 = curve(Q, c.pos.clone().lerp(crownC, 0.12), 3, rng, sp.bendUp * 0.6, sp.limbGnarl);
        addLimb(sp2, mr * 0.5, 0.04 * k, 4);
        c.limb = sp2;
        perch.push(sp2[2].clone().add(new V3(0, mr * 0.35, 0)));
      }
    }
  }
  // twigs (fine branch tips – they make a bare deciduous tree read as a tree; on buckthorn they carry spines)
  const tips = [];
  for (const c of clusters) {
    for (let i = 0; i < (sp.twigs || 0); i++) {
      const out = c.pos.clone().sub(crownC); out.y *= 0.6; out.normalize().add(rndUnit(rng).multiplyScalar(0.7)).addScaledVector(UP, 0.25).normalize();
      const len = c.r * (sp.twigLen || 1) * rng.range(0.7, 1.15);
      const A = c.pos.clone().add(rndUnit(rng).multiplyScalar(c.r * 0.2));
      const w = walk(A, out, len, 2, rng, 0.25, 0.05);
      const tr = sp.shrub ? 0.014 : 0.026 * k;
      tube(wood, w.pts, taper(3, tr, tr * 0.35), 3, bark, {});
      tips.push({ p: w.pts[2], dir: w.dir.clone(), c });
      if (sp.spines) for (let s = 1; s <= 2; s++) { // thorny tips
        const sp0 = w.pts[s]; const sd = perp(w.dir, rng).addScaledVector(w.dir, 0.3).normalize();
        const st = sp0.clone().addScaledVector(sd, 0.09); const sn = sd.clone();
        const sc = new Col('#6a5a48'); const side = perp(sd, rng).multiplyScalar(0.008);
        wood.tri(sp0.clone().add(side), sp0.clone().sub(side), st, sn, sn, sn, sc, sc, sc.clone().multiplyScalar(1.3), null, 0);
      }
    }
  }

  // ---- foliage
  const blobs = [];
  const leafBase = new Col(sp.leaf), leafAlt = new Col(sp.leaf2);
  const fo = { crownC, rx, ry: sp.forkMode === 'along' ? ry * 1.2 : ry, spiky: sp.spiky, faceN: sp.faceN };
  for (const c of clusters) {
    const nb = rng.int(sp.blobs[0], sp.blobs[1]);
    const cBase = leafBase.clone().lerp(leafAlt, rng());
    for (let i = 0; i < nb; i++) {
      const off = rndUnit(rng).multiplyScalar(c.r * (i === 0 ? 0.1 : rng.range(0.35, 0.7)));
      off.y *= sp.forkMode === 'along' ? 0.35 : 0.6;
      const bc = c.pos.clone().add(off);
      const br = rng.range(sp.blobR[0], sp.blobR[1]) * k * (i === 0 ? 1.1 : 1);
      const rank = rng.range(0.04, 0.96);
      blob(leaves, bc, br, sp.blobSy, rng, { ...fo, base: jit(cBase, rng, 0.08), rank, center: bc });
      blobs.push({ c: bc, r: br, sy: sp.blobSy, rank, cl: c });
      // leaf cards on the blob surface
      for (let j = 0; j < sp.cards; j++) {
        const d = rndUnit(rng); if (d.y < -0.5) d.y *= -0.5; d.normalize();
        const p = bc.clone().add(new V3(d.x * br, d.y * br * sp.blobSy, d.z * br).multiplyScalar(rng.range(0.85, 1.08)));
        const nOut = p.clone().sub(crownC); nOut.y /= (fo.ry / rx); nOut.normalize().lerp(d, 0.5).normalize();
        const cc = shade(jit(cBase, rng, 0.14).multiplyScalar(1.08), p, { ...fo, aoLo: 0.6 });
        if (sp.needle) { // needle tufts: a little starburst
          for (let q = 0; q < 2; q++) card(leaves, p.clone().addScaledVector(d, sp.cardLen * 0.35), nOut, sp.cardLen * k, sp.cardWid * k, rng, cc, bc, rank, { t: d.clone().add(rndUnit(rng).multiplyScalar(0.8)).normalize(), fold: 0.6, baseDark: 0.7, tipLight: 1.25 });
        } else card(leaves, p, nOut, sp.cardLen * k, sp.cardWid * k, rng, cc, bc, rank, { t: d.clone().add(rndUnit(rng).multiplyScalar(0.9)).normalize() });
      }
    }
  }

  // ---- species extras
  const ctx = { rng, k, H, crownC, rx, ry, blobs, clusters, tips, limbs: limbList, stems, fruit, flowers, wood, leaves };
  const extra = EXTRAS[id];
  if (extra) extra(ctx);
  if (!sp.shrub) buildSeedling(seed, rng, sp.seedling, sp.seedCol, sp.bark);

  // ---- info
  const bb = new THREE.Box3();
  for (const b of blobs) { bb.expandByPoint(b.c.clone().add(new V3(b.r, b.r * b.sy, b.r))); bb.expandByPoint(b.c.clone().sub(new V3(b.r, b.r * b.sy, b.r))); }
  let crownR = 0; for (const b of blobs) crownR = Math.max(crownR, Math.hypot(b.c.x, b.c.z) + b.r * 0.85);
  const info = {
    H: bb.max.y, crownTop: bb.max.y, crownBottom: Math.max(0.05, bb.min.y), crownR, trunkR: sp.shrub ? sp.trunkR * k * 2.5 : r0All,
    perch: perch.filter(p => p.y > (sp.shrub ? 0.8 : H * 0.35)).slice(0, 10), attach,
    leafL: lum(sp.leaf), fruitL: ctx.fruitL || 0.1, flowerL: ctx.flowerL || 0.1, seedH: 0.55,
  };
  return { geoms: { wood: wood.build(), leaves: leaves.build(), fruit: fruit.build(), flowers: flowers.build(), seed: seed.build() }, info };
}
function trunkAt(pts, y) {
  for (let i = 1; i < pts.length; i++) if (pts[i].y >= y) { const a = pts[i - 1], b = pts[i]; return a.clone().lerp(b, clamp((y - a.y) / Math.max(1e-4, b.y - a.y))); }
  return pts[pts.length - 1].clone();
}
// random point on a blob's lower/outer surface
function onBlob(b, rng, crownC, down = 0.4) {
  const out = b.c.clone().sub(crownC); out.y = 0; out.normalize();
  const d = rndUnit(rng).add(out.multiplyScalar(0.8)).add(new V3(0, -down, 0)).normalize();
  return { p: b.c.clone().add(new V3(d.x * b.r, d.y * b.r * b.sy, d.z * b.r).multiplyScalar(rng.range(0.85, 1.0))), d };
}
function pickBlobs(ctx, n, filter) {
  const list = ctx.blobs.filter(filter || (() => true)); const out = [];
  for (let i = 0; i < n && list.length; i++) out.push(list[Math.floor(ctx.rng() * list.length)]);
  return out;
}

function buildSeedling(geo, rng, type, leafHex, barkHex) {
  const stemC = new Col(barkHex).lerp(new Col('#6a8a3a'), 0.7);
  const h = type === 'needle' ? 0.42 : 0.5;
  const w = walk(new V3(0, -0.02, 0), new V3(rng.range(-0.1, 0.1), 1, rng.range(-0.1, 0.1)), h, 3, rng, 0.08, 0.05);
  tube(geo, w.pts, taper(4, 0.02, 0.01), 3, (t) => stemC.clone().multiplyScalar(0.8 + 0.4 * t), {});
  const top = w.pts[3]; const lc = new Col(leafHex);
  if (type === 'needle') {
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU, d = new V3(Math.cos(a), i % 2 ? 0.9 : 0.35, Math.sin(a)).normalize();
      card(geo, top.clone().addScaledVector(d, 0.13), d.clone().cross(UP).normalize().cross(d).normalize(), 0.28, 0.035, rng, jit(lc, rng), top, 0.02 + i / 13, { t: d, fold: 0.3 });
    }
    return;
  }
  const nLeaves = type === 'pinnate' ? 3 : 6;
  for (let i = 0; i < nLeaves; i++) {
    const t = 0.4 + 0.6 * i / nLeaves; const p = w.pts[1].clone().lerp(top, t);
    const a = i * 2.4; const d = new V3(Math.cos(a), 0.5, Math.sin(a)).normalize();
    if (type === 'pinnate') {
      const axisEnd = p.clone().addScaledVector(d, 0.3);
      for (let j = 0; j < 4; j++) {
        const q = p.clone().lerp(axisEnd, 0.3 + j * 0.23); const side = new V3().crossVectors(d, UP).normalize().multiplyScalar(j % 2 ? 1 : -1);
        card(geo, q.clone().addScaledVector(side, 0.06), UP, 0.14, 0.075, rng, jit(lc, rng), top, 0.03 + (i * 4 + j) / 14, { t: side.clone().addScaledVector(d, 0.4).normalize() });
      }
    } else card(geo, p.clone().addScaledVector(d, 0.11), new V3(0, 1, 0).lerp(d, 0.3).normalize(), 0.22, 0.14, rng, jit(lc, rng), top, 0.03 + i / 7, { t: d });
  }
}

// species-specific fruit & flowers on woody plants
const EXTRAS = {
  oak(ctx) { // acorns (fruit) + golden catkins (flowers, spring)
    const { rng, crownC } = ctx; ctx.fruitL = lum('#8a6234'); ctx.flowerL = lum('#c8b450');
    for (const b of pickBlobs(ctx, 20, b => b.c.y < crownC.y + ctx.ry * 0.5)) {
      const { p, d } = onBlob(b, rng, crownC, 0.5);
      const ax = d.clone().lerp(new V3(0, -1, 0), 0.6).normalize();
      const rank = rng.range(0.04, 0.96);
      gem(ctx.fruit, p.clone().addScaledVector(ax, 0.13), ax, 0.32, 0.105, 5, jit('#9a6c38', rng), new Col('#7a5228'), p, rank, { top: 0.4 });
      gem(ctx.fruit, p.clone().addScaledVector(ax, 0.02), ax, 0.13, 0.125, 5, new Col('#5c4a34'), new Col('#4a3a28'), p, rank, { top: 0.6 });
    }
    for (const b of pickBlobs(ctx, 26)) {
      const { p } = onBlob(b, rng, crownC, 0.9); const rank = rng.range(0.04, 0.96);
      const ax = new V3(rng.range(-0.3, 0.3), -1, rng.range(-0.3, 0.3)).normalize();
      gem(ctx.flowers, p.clone().addScaledVector(ax, 0.16), ax, 0.34, 0.035, 3, jit('#d8c460', rng), new Col('#b8a040'), p, rank);
    }
  },
  terebinth(ctx) { // reddish fruit clusters at twig tips; reddish-purple flower panicles in early spring
    const { rng } = ctx; ctx.fruitL = lum('#b8402c'); ctx.flowerL = lum('#9a3a40');
    const tips = ctx.tips.slice().sort(() => rng() - 0.5);
    for (const t of tips.slice(0, 10)) {
      const rank = rng.range(0.04, 0.96); const base = t.p.clone();
      for (let i = 0; i < 5; i++) {
        const c = base.clone().add(new V3(rng.range(-0.1, 0.1), -0.06 - i * 0.035, rng.range(-0.1, 0.1)));
        gem(ctx.fruit, c, rndUnit(rng), 0.11, 0.055, 4, jit('#c2442e', rng, 0.15), new Col('#8a2a24'), base, rank);
      }
    }
    for (const t of tips.slice(10, 22)) {
      const rank = rng.range(0.04, 0.96);
      for (let q = 0; q < 3; q++) gem(ctx.flowers, t.p.clone().add(new V3(rng.range(-0.09, 0.09), -0.04 - q * 0.07, rng.range(-0.09, 0.09))), rndUnit(rng), 0.09, 0.05, 3, jit('#a8404a', rng, 0.15), new Col('#7a2a34'), t.p, rank);
    }
  },
  carob(ctx) { // long hanging pods; small reddish flower clusters on old wood (autumn)
    const { rng, crownC } = ctx; ctx.fruitL = lum('#4a2c1c'); ctx.flowerL = lum('#a83a30');
    for (const b of pickBlobs(ctx, 24, b => b.c.y < crownC.y - ctx.ry * 0.05)) {
      const { p } = onBlob(b, rng, crownC, 1.6);
      const rank = rng.range(0.04, 0.96); const L = rng.range(0.55, 0.8);
      const sw = new V3(rng.range(-0.25, 0.25), 0, rng.range(-0.25, 0.25));
      const pts = [p.clone(), p.clone().add(new V3(0, -L * 0.35, 0)).add(sw), p.clone().add(new V3(0, -L * 0.7, 0)).addScaledVector(sw, 1.6), p.clone().add(new V3(0, -L, 0)).addScaledVector(sw, 1.3).add(new V3(0.05, 0.06, 0))];
      const pc = jit('#4e2e1c', rng, 0.15);
      tube(ctx.fruit, pts, [0.025, 0.06, 0.055, 0.025], 3, (t) => pc.clone().multiplyScalar(0.85 + 0.3 * Math.sin(t * 3)), { ce: p, rank, capEnd: true });
    }
    for (let i = 0; i < 12; i++) {
      const l = ctx.limbs[Math.floor(rng() * ctx.limbs.length)]; const p = l.pts[Math.min(l.pts.length - 1, rng.int(1, 2))].clone();
      const rank = rng.range(0.04, 0.96);
      blob(ctx.flowers, p.add(new V3(0, 0.06, 0)), 0.12, 1.0, rng, { crownC: p, rx: 1, ry: 1, spiky: 0.5, base: jit('#b04434', rng, 0.15), rank, center: p, faceN: 0.6 });
    }
  },
  pine(ctx) { // cones near clump bases; yellow pollen cones (spring)
    const { rng } = ctx; ctx.fruitL = lum('#7a5232'); ctx.flowerL = lum('#e2c450');
    for (const c of ctx.clusters) {
      if (!c.limb) continue;
      const n = rng.int(1, 3);
      for (let i = 0; i < n; i++) {
        const p = c.limb[c.limb.length - 2].clone().add(new V3(rng.range(-0.2, 0.2), -0.12, rng.range(-0.2, 0.2)));
        const ax = new V3(rng.range(-0.5, 0.5), -1, rng.range(-0.5, 0.5)).normalize();
        gem(ctx.fruit, p.clone().addScaledVector(ax, 0.15), ax, 0.36, 0.1, 6, jit('#8a5c36', rng, 0.12), new Col('#5e4030'), p, rng.range(0.04, 0.96), { top: 0.35 });
      }
    }
    for (const b of pickBlobs(ctx, 28)) {
      const { p, d } = onBlob(b, rng, ctx.crownC, -0.6);
      gem(ctx.flowers, p, d.clone().lerp(UP, 0.5).normalize(), 0.16, 0.06, 4, jit('#ecd060', rng), new Col('#c8a040'), p, rng.range(0.04, 0.96));
    }
  },
  mastic(ctx) { // berry bunches (red → black), tiny reddish flowers
    const { rng, crownC } = ctx; ctx.fruitL = lum('#c4342a'); ctx.flowerL = lum('#8a2a2a');
    for (const b of pickBlobs(ctx, 8)) {
      const { p } = onBlob(b, rng, crownC, 0.1); const rank = rng.range(0.04, 0.96);
      for (let i = 0; i < 5; i++) gem(ctx.fruit, p.clone().add(rndUnit(rng).multiplyScalar(0.06)), rndUnit(rng), 0.085, 0.045, 3, jit('#cc3a2c', rng, 0.15), new Col('#9a2a22'), p, rank);
    }
    for (const b of pickBlobs(ctx, 10)) {
      const { p, d } = onBlob(b, rng, crownC, -0.3);
      gem(ctx.flowers, p, d, 0.09, 0.05, 3, jit('#9a2c30', rng), new Col('#6a2a20'), p, rng.range(0.04, 0.96));
    }
  },
  buckthorn(ctx) { // small dark berries along twigs, tiny yellow-green flowers
    const { rng } = ctx; ctx.fruitL = lum('#2a1c2c'); ctx.flowerL = lum('#d0d070');
    for (const b of pickBlobs(ctx, 24)) {
      const { p } = onBlob(b, rng, ctx.crownC, 0.2);
      gem(ctx.fruit, p, rndUnit(rng), 0.08, 0.045, 3, jit('#2e2030', rng, 0.15), new Col('#1a1420'), p, rng.range(0.04, 0.96));
    }
    for (const b of pickBlobs(ctx, 10)) {
      const { p, d } = onBlob(b, rng, ctx.crownC, -0.2);
      gem(ctx.flowers, p, d, 0.06, 0.04, 3, jit('#d6d478', rng), new Col('#a8a850'), p, rng.range(0.04, 0.96));
    }
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Low shrubs & herbs
function buildSage(variant) {
  const rng = makeRng(hashString('sage') + variant * 7919);
  const wood = new Geo(), leaves = new Geo(), flowers = new Geo();
  const crownC = new V3(0, 0.5, 0), rx = 0.62, ry = 0.5;
  const leafC = new Col('#8f9e80'), leafC2 = new Col('#a3ae92');
  // inner volume
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU * 2 + rng(), rr = i >= 10 ? rng.range(0, 0.1) : rng.range(0.18, 0.36), c = new V3(Math.cos(a) * rr, (i >= 10 ? 0.5 : 0.2 + rng() * 0.25), Math.sin(a) * rr);
    const rank = rng.range(0.04, 0.96);
    blob(leaves, c, rng.range(0.11, 0.15), 0.85, rng, { crownC, rx, ry, base: jit('#95a487', rng), rank, center: c, spiky: 0.3, faceN: 0.1, aoLo: 0.7 });
  }
  const nS = rng.int(10, 11); const perch = [];
  for (let s = 0; s < nS; s++) {
    const az = s / nS * TAU + rng.range(-0.3, 0.3); const tilt = rng.range(0.25, 0.75);
    const dir = new V3(Math.cos(az) * Math.sin(tilt), Math.cos(tilt), Math.sin(az) * Math.sin(tilt));
    const len = rng.range(0.55, 0.8) * (1.15 - tilt * 0.35);
    const w = walk(new V3(Math.cos(az) * 0.04, 0, Math.sin(az) * 0.04), dir, len, 3, rng, 0.12, 0.12);
    const sc = new Col('#6a6050');
    tube(wood, w.pts, [0.02, 0.014, 0.01, 0.007], 3, (t) => sc.clone().lerp(new Col('#8a9a78'), t), {});
    const rank = rng.range(0.04, 0.96); const ce = w.pts[1];
    // opposite leaf pairs, each lanceolate blade with two small basal lobes (the "three-lobed" sage leaf)
    for (let i = 0; i < 6; i++) {
      const t = 0.3 + i * 0.13; if (t > 1) break;
      const seg = Math.min(2, Math.floor(t * 3)); const p = w.pts[seg].clone().lerp(w.pts[seg + 1], t * 3 - seg);
      const tg = w.pts[seg + 1].clone().sub(w.pts[seg]).normalize();
      for (const sgn of [1, -1]) {
        const side = new V3().crossVectors(tg, UP).normalize().multiplyScalar(sgn).applyAxisAngle(tg, i * 1.57);
        const ld = side.clone().addScaledVector(tg, 0.9).addScaledVector(UP, 0.2).normalize();
        const L = 0.14 * (1 - Math.abs(t - 0.6) * 0.6);
        const c = jit(leafC.clone().lerp(leafC2, rng()), rng, 0.1);
        const n = UP.clone().lerp(side, 0.4).normalize();
        card(leaves, p.clone().addScaledVector(ld, L * 0.55), n, L, L * 0.38, rng, c, ce, rank, { t: ld, fold: 0.3, tipLight: 1.18 });
        if (i < 3) { const lb = p.clone().addScaledVector(ld, 0.025); const lt = lb.clone().addScaledVector(side.clone().addScaledVector(tg, -0.4).normalize(), 0.05);
          leaves.tri(lb, lt, lb.clone().addScaledVector(ld, 0.03), n, n, n, c, c, c, ce, rank); }
      }
    }
    perch.push(w.pts[3].clone());
    // flower spike (whorls of small lilac 2-lipped flowers)
    if (s % 2 === 0) {
      const base = w.pts[3]; const sd = w.dir.clone().lerp(UP, 0.6).normalize();
      const spk = [base, base.clone().addScaledVector(sd, 0.14), base.clone().addScaledVector(sd, 0.3)];
      const frank = rng.range(0.04, 0.96);
      tube(flowers, spk, [0.008, 0.006, 0.004], 3, () => new Col('#7a7a5a'), { ce: base, rank: frank });
      for (let wh = 0; wh < 4; wh++) {
        const c = base.clone().addScaledVector(sd, 0.06 + wh * 0.065);
        for (let f = 0; f < 3; f++) {
          const a = f / 3 * TAU + wh; const d = new V3(Math.cos(a), 0.35, Math.sin(a)).normalize();
          const fc = jit(wh === 3 ? '#d4b4ea' : '#b892dc', rng, 0.08);
          gem(flowers, c.clone().addScaledVector(d, 0.03), d, 0.065, 0.024, 3, fc, new Col('#8a5aa8'), base, frank, { rot: a });
        }
      }
    }
  }
  return { geoms: { wood: wood.build(), leaves: leaves.build(), flowers: flowers.build() }, info: { H: 1.0, crownTop: 1.0, crownBottom: 0.08, crownR: 0.75, trunkR: 0.06, perch: perch.filter(p => p.y > 0.5).slice(0, 4), attach: [], leafL: lum('#8f9e80'), flowerL: lum('#b083d6'), fruitL: 0.1 } };
}

function buildRockrose(variant) {
  const rng = makeRng(hashString('rockrose') + variant * 7919);
  const wood = new Geo(), leaves = new Geo(), flowers = new Geo();
  const crownC = new V3(0, 0.62, 0), rx = 0.8, ry = 0.55;
  const leafC = new Col('#6c8650'), leafC2 = new Col('#80945c');
  const nSt = 7; const blobsL = [];
  for (let s = 0; s < nSt; s++) {
    const az = s / nSt * TAU + rng.range(-0.3, 0.3);
    const dir = new V3(Math.cos(az) * 0.6, 1, Math.sin(az) * 0.6);
    const w = walk(new V3(0, 0, 0), dir, rng.range(0.6, 0.85), 3, rng, 0.2, 0.05);
    tube(wood, w.pts, [0.025, 0.018, 0.012, 0.008], 3, () => jit('#6a4e3c', rng), {});
  }
  const nB = rng.int(19, 20);
  for (let i = 0; i < nB; i++) {
    const u = lerp(-0.55, 0.95, (i + rng()) / nB), az = i * 2.39996, s = rng.range(0.5, 0.82), rr = Math.sqrt(1 - u * u) * s;
    const c = new V3(Math.cos(az) * rr * rx, crownC.y + u * s * ry, Math.sin(az) * rr * rx);
    const r = rng.range(0.17, 0.22); const rank = rng.range(0.04, 0.96);
    const base = jit(leafC.clone().lerp(leafC2, rng()), rng, 0.1);
    blob(leaves, c, r, 0.85, rng, { crownC, rx, ry, base, rank, center: c, spiky: 0.32, faceN: 0.15, aoLo: 0.6 });
    blobsL.push({ c, r, sy: 0.85, rank });
    for (let j = 0; j < 7; j++) { // wrinkled ovate leaves
      const d = rndUnit(rng); if (d.y < 0) d.y *= -0.4; d.normalize();
      const p = c.clone().add(d.clone().multiplyScalar(r * 0.98));
      card(leaves, p, d.clone().lerp(UP, 0.3).normalize(), 0.13, 0.08, rng, jit(base, rng, 0.15).multiplyScalar(1.1), c, rank, { fold: 0.35 });
    }
  }
  // flowers: 5 broad crinkled pink petals (rounded tips) with a yellow eye and golden stamens
  const nF = rng.int(12, 14); const fl = [];
  for (let i = 0; i < nF; i++) {
    const b = blobsL[Math.floor(rng() * blobsL.length)];
    const d = b.c.clone().sub(crownC); d.y = Math.max(d.y, 0) + 0.7; d.normalize().add(rndUnit(rng).multiplyScalar(0.2)).normalize();
    const p = b.c.clone().addScaledVector(d, b.r * 1.08);
    const rank = rng.range(0.04, 0.96); const R = rng.range(0.11, 0.13);
    const t1 = perp(d, rng), t2 = new V3().crossVectors(d, t1);
    const pink = jit(variant === 2 && i % 3 === 0 ? '#ec7cc0' : '#e0509a', rng, 0.08, 0.015, 0.05);
    const eye = new Col('#f4d24a'), n = d.clone();
    for (let pe = 0; pe < 5; pe++) {
      const a0 = pe / 5 * TAU + rng.range(-0.08, 0.08), am = a0 + TAU / 10;
      const at = (a, r, lift) => p.clone().addScaledVector(t1, Math.cos(a) * r).addScaledVector(t2, Math.sin(a) * r).addScaledVector(d, lift);
      const v0 = at(am, 0.01, 0.012);
      const l1 = at(am - 0.42, R * 0.62, R * 0.12), r1 = at(am + 0.42, R * 0.62, R * 0.12);
      const l2 = at(am - 0.36, R * 1.0, R * 0.2 + (rng() - 0.5) * 0.02), r2 = at(am + 0.36, R * 1.0, R * 0.2 + (rng() - 0.5) * 0.02);
      const tip = at(am, R * 1.08, R * 0.1);
      const mid = pink.clone().lerp(new Col('#f7c8e0'), 0.15), edge = pink.clone().multiplyScalar(rng.range(0.95, 1.05)), crease = pink.clone().multiplyScalar(0.82);
      flowers.tri(v0, l1, r1, n, n, n, eye, mid, mid, p, rank);
      flowers.tri(l1, l2, tip, n, n, n, mid, edge, crease, p, rank);
      flowers.tri(l1, tip, r1, n, n, n, mid, crease, mid, p, rank);
      flowers.tri(r1, tip, r2, n, n, n, mid, crease, edge, p, rank);
    }
    gem(flowers, p.clone().addScaledVector(d, 0.02), d, 0.05, 0.03, 4, new Col('#f0c030'), new Col('#d09a20'), p, rank);
    fl.push(p);
  }
  return { geoms: { wood: wood.build(), leaves: leaves.build(), flowers: flowers.build() }, info: { H: 1.2, crownTop: 1.2, crownBottom: 0.1, crownR: 0.95, trunkR: 0.07, perch: [new V3(0, 1.15, 0)], attach: [], leafL: lum('#6c8650'), flowerL: lum('#d8609e'), fruitL: 0.1 } };
}

// A soft, curved petal: a small grid (length × width) with a rounded outline, cupped across and curled along its
// length, smooth normals and a colour running base → middle → tip (edges a little deeper). base: Vector3; dir: along
// the petal; side: across it; o = { cup, curl, twist } in petal widths / lengths.
function petal(geo, base, dir, side, L, W, cols, ce, rank, o = {}) {
  const NU = o.nu ?? 6, NV = 4, cup = o.cup ?? 0.35, curl = o.curl ?? 0.15, twist = o.twist ?? 0;
  const d = dir.clone().normalize(), s0 = side.clone().addScaledVector(d, -side.dot(d)).normalize(), n0 = new V3().crossVectors(d, s0);
  const [cb, cm, ct] = cols; const G = [];
  for (let i = 0; i <= NU; i++) {
    const u = i / NU, w = W * Math.pow(Math.sin(Math.PI * (0.06 + 0.94 * u)), 0.7) * (1 - 0.12 * u) + W * 0.04;
    const sa = s0.clone().applyAxisAngle(d, twist * u), na = new V3().crossVectors(d, sa);
    const row = [];
    for (let j = 0; j <= NV; j++) {
      const v = j / NV * 2 - 1;
      const p = base.clone().addScaledVector(d, L * u).addScaledVector(sa, w * v).addScaledVector(na, cup * W * v * v + curl * L * u * u);
      const c = (u < 0.5 ? cb.clone().lerp(cm, u * 2) : cm.clone().lerp(ct, (u - 0.5) * 2)).multiplyScalar(1 - 0.12 * Math.abs(v));
      row.push({ p, c });
    }
    G.push(row);
  }
  const nrm = (i, j) => {
    const a = G[Math.min(NU, i + 1)][j].p.clone().sub(G[Math.max(0, i - 1)][j].p);
    const b = G[i][Math.min(NV, j + 1)].p.clone().sub(G[i][Math.max(0, j - 1)].p);
    return new V3().crossVectors(a, b).normalize();
  };
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) {
    const A = G[i][j], B = G[i + 1][j], C = G[i + 1][j + 1], D = G[i][j + 1];
    const nA = nrm(i, j), nB = nrm(i + 1, j), nC = nrm(i + 1, j + 1), nD = nrm(i, j + 1);
    geo.tri(A.p, B.p, C.p, nA, nB, nC, A.c, B.c, C.c, ce, rank);
    geo.tri(A.p, C.p, D.p, nA, nC, nD, A.c, C.c, D.c, ce, rank);
  }
}

function buildCyclamen(variant) {
  const rng = makeRng(hashString('cyclamen') + variant * 7919);
  const noise = makeNoise2D(hashString('cyc') + variant);
  const base = new Geo(), leaves = new Geo(), flowers = new Geo();
  // limestone rocks it grows between (static base)
  const rockC = new Col('#bdb5a4');
  const rockAt = (c, s, det) => {
    const src = ICO[det].attributes.position; const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rng() * 3, rng() * 3, rng() * 3));
    const P = []; for (let i = 0; i < src.count; i++) { const u = new V3().fromBufferAttribute(src, i); const h = hash3(Math.round(u.x * 999), Math.round(u.y * 999), Math.round(u.z * 999)); const p = u.multiplyScalar(1 + (h - 0.5) * 0.35).applyQuaternion(q); p.multiply(s); if (p.y < -s.y * 0.3) p.y = -s.y * 0.3; p.add(c); P.push(p); }
    for (let i = 0; i < P.length; i += 3) { const fn = new V3().subVectors(P[i + 1], P[i]).cross(new V3().subVectors(P[i + 2], P[i])).normalize();
      const cc = jit(rockC, rng, 0.08).multiplyScalar(0.8 + 0.3 * clamp(fn.y) + 0.12 * noise(P[i].x * 9, P[i].z * 9));
      base.tri(P[i], P[i + 1], P[i + 2], fn, fn, fn, cc, cc, cc.clone().multiplyScalar(0.95), null, 0); }
  };
  const ra = rng() * TAU;
  rockAt(new V3(Math.cos(ra) * 0.4, 0.05, Math.sin(ra) * 0.4), new V3(0.2, 0.14, 0.16), 1);
  rockAt(new V3(Math.cos(ra + 2.4) * 0.38, 0.03, Math.sin(ra + 2.4) * 0.38), new V3(0.1, 0.07, 0.08), 0);
  // corm just showing at the soil
  gem(base, new V3(0, 0.0, 0), UP, 0.06, 0.06, 5, new Col('#6a4a32'), new Col('#4a3424'), null, 0);
  // heart-shaped leaves with a silvery marbled band
  const nL = 6; const C0 = new V3(0, 0.02, 0);
  const heart = []; for (let i = 0; i < 10; i++) { const t = i / 10 * TAU; heart.push(new THREE.Vector2(16 * Math.pow(Math.sin(t), 3), 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) + 3).multiplyScalar(1 / 17)); }
  for (let i = 0; i < nL; i++) {
    const az = i / nL * TAU + rng.range(-0.25, 0.25) + ra + 1;
    const out = new V3(Math.cos(az), 0, Math.sin(az));
    const dist = rng.range(0.12, 0.2), lift = rng.range(0.07, 0.13);
    const lc = new V3(0, lift, 0).addScaledVector(out, dist);
    const rank = rng.range(0.04, 0.96); const S = rng.range(0.11, 0.14);
    const tilt = rng.range(0.15, 0.4);
    const fwd = out.clone().multiplyScalar(-1); // heart "y" axis points back toward the stem (notch at stem)
    const right = new V3().crossVectors(UP, out).normalize();
    const nrm = UP.clone().addScaledVector(out, -tilt).normalize();
    const map = (v2, s) => lc.clone().addScaledVector(right, v2.x * S * s).addScaledVector(fwd, v2.y * S * s).addScaledVector(UP, (-v2.y * tilt * 0.5) * S * s);
    tube(leaves, [C0, C0.clone().lerp(lc, 0.5).add(new V3(0, lift * 0.6, 0)), map(heart[0], 1)], [0.007, 0.006, 0.005], 3, () => new Col('#6a3a3a'), { ce: C0, rank });
    const dark = jit('#2a4a2a', rng, 0.1), silver = jit('#a9b8a4', rng, 0.08), edge = jit('#33573a', rng, 0.1);
    const ctr = map(new THREE.Vector2(0, -0.1), 1);
    const midR = heart.map(h => map(h, rng.range(0.5, 0.62))), outR = heart.map(h => map(h, 1));
    for (let j = 0; j < 10; j++) {
      const j1 = (j + 1) % 10; const sv = (j % 3 === 0) ? silver.clone().multiplyScalar(0.85) : silver;
      leaves.tri(ctr, midR[j1], midR[j], nrm, nrm, nrm, dark, sv, sv, C0, rank);
      leaves.tri(midR[j], midR[j1], outR[j1], nrm, nrm, nrm, sv, sv, edge, C0, rank);
      leaves.tri(midR[j], outR[j1], outR[j], nrm, nrm, nrm, sv, edge, edge, C0, rank);
    }
  }
  // flowers: nodding, with 5 petals swept upward
  const nF = 7 + variant % 3;
  const white = variant === 1;
  for (let i = 0; i < nF; i++) {
    const az = i / nF * TAU + rng.range(-0.4, 0.4) + ra + 0.5; const out = new V3(Math.cos(az), 0, Math.sin(az));
    const h = rng.range(0.3, 0.42); const rank = rng.range(0.04, 0.96);
    const top = new V3(0, h, 0).addScaledVector(out, rng.range(0.1, 0.16));
    const nose = top.clone().addScaledVector(out, 0.035).add(new V3(0, -0.05, 0));
    tube(flowers, [new V3(0, 0.01, 0), new V3(0, h * 0.5, 0).addScaledVector(out, 0.03), top, nose], [0.006, 0.005, 0.0045, 0.004], 3, () => new Col('#7a4a4a'), { ce: C0, rank });
    const pc = white && i % 2 ? jit('#f6eef2', rng, 0.04) : jit('#e690bc', rng, 0.08, 0.02, 0.06);
    const eye = new Col('#8a1e4e');
    gem(flowers, nose, new V3(0, -1, 0).addScaledVector(out, 0.4).normalize(), 0.04, 0.018, 5, eye, eye, C0, rank);
    const pTip = pc.clone().lerp(new Col('#fff0f6'), 0.25), pMid = pc.clone();
    for (let p = 0; p < 5; p++) {
      const a = p / 5 * TAU + az; const side = new V3(Math.cos(a), 0, Math.sin(a));
      const pb = nose.clone().addScaledVector(side, 0.01);
      // reflexed: the petals sweep back and up from the nodding nose, each with a slight twist
      const tipD = side.clone().multiplyScalar(0.4).add(new V3(0, 1, 0)).addScaledVector(out, -0.3).normalize();
      const across = new V3().crossVectors(tipD, side).normalize();
      petal(flowers, pb, tipD, across, rng.range(0.13, 0.155), 0.026, [eye, pMid, pTip], C0, rank, { cup: 0.06, curl: 0.05, twist: 0.35 });
    }
  }
  return { geoms: { base: base.build(), leaves: leaves.build(), flowers: flowers.build() }, info: { H: 0.5, crownTop: 0.5, crownBottom: 0.02, crownR: 0.3, trunkR: 0.04, perch: [], attach: [], leafL: lum('#a9b8a4') * 0.6 + lum('#2a4a2a') * 0.4, flowerL: lum('#e690bc'), fruitL: 0.1 } };
}

function buildAnemone(variant) {
  const rng = makeRng(hashString('anemone') + variant * 7919);
  const leaves = new Geo(), flowers = new Geo();
  const nF = [6, 7, 9][variant] + (rng() < 0.4 ? 1 : 0);
  const ros = []; const nR = 3;
  for (let r = 0; r < nR; r++) { const a = r / nR * TAU + rng(); ros.push(new V3(Math.cos(a) * 0.14, 0, Math.sin(a) * 0.14)); }
  const lcol = new Col('#4e7c34');
  // frilly, finely divided leaf rosettes
  for (const rc of ros) {
    for (let l = 0; l < 5; l++) {
      const az = l / 5 * TAU + rng.range(-0.3, 0.3); const out = new V3(Math.cos(az), 0, Math.sin(az));
      const rank = rng.range(0.04, 0.96); const L = rng.range(0.2, 0.26);
      const stemEnd = rc.clone().addScaledVector(out, L * 0.45).add(new V3(0, 0.05, 0));
      const n = UP.clone().addScaledVector(out, 0.2).normalize();
      const c = jit(lcol, rng, 0.1);
      leaves.tri(rc.clone().add(new V3(0, 0.005, 0)).addScaledVector(new V3().crossVectors(out, UP), 0.008), stemEnd, rc.clone().add(new V3(0, 0.005, 0)).addScaledVector(new V3().crossVectors(out, UP), -0.008), n, n, n, c.clone().multiplyScalar(0.7), c, c.clone().multiplyScalar(0.7), rc, rank);
      for (let s = -1; s <= 1; s++) {
        const sd = out.clone().applyAxisAngle(UP, s * 0.7);
        for (let q = -1; q <= 1; q++) {
          const ld = sd.clone().applyAxisAngle(UP, q * 0.35).addScaledVector(UP, 0.15 + rng() * 0.2).normalize();
          const len = L * (0.55 - Math.abs(q) * 0.12) * (s === 0 ? 1.1 : 0.9);
          const side = new V3().crossVectors(ld, UP).normalize().multiplyScalar(0.02);
          const st = stemEnd.clone().addScaledVector(sd, 0.02);
          const cc = jit(c, rng, 0.12);
          leaves.tri(st.clone().add(side), st.clone().addScaledVector(ld, len), st.clone().sub(side), n, n, n, cc.clone().multiplyScalar(0.85), cc.clone().multiplyScalar(1.15), cc.clone().multiplyScalar(0.85), rc, rank);
        }
      }
    }
  }
  // flowers: tall stalk, frilly involucre, cup of 6 red tepals with a white ring and dark centre
  for (let i = 0; i < nF; i++) {
    const rc = ros[i % nR].clone().add(new V3(rng.range(-0.04, 0.04), 0, rng.range(-0.04, 0.04)));
    const h = rng.range(0.3, 0.46); const rank = rng.range(0.04, 0.96);
    const bend = new V3(rng.range(-0.07, 0.07), 0, rng.range(-0.07, 0.07));
    const top = rc.clone().add(new V3(0, h, 0)).add(bend);
    const pts = [rc.clone(), rc.clone().add(new V3(0, h * 0.35, 0)).addScaledVector(bend, 0.2), rc.clone().add(new V3(0, h * 0.7, 0)).addScaledVector(bend, 0.6), top];
    tube(flowers, pts, [0.011, 0.01, 0.009, 0.009], 3, () => jit('#4a6e30', rng, 0.08), { ce: rc, rank });
    const inv = pts[2].clone().lerp(top, 0.3);
    const ic = new Col('#4e7a30');
    for (let b = 0; b < 3; b++) { // involucre frill
      const a = b / 3 * TAU + rng(); const d = new V3(Math.cos(a), -0.15, Math.sin(a)).normalize(); const s = new V3().crossVectors(d, UP).normalize().multiplyScalar(0.012);
      for (let q = -1; q <= 1; q += 2) { const dd = d.clone().applyAxisAngle(UP, q * 0.3); flowers.tri(inv.clone().add(s), inv.clone().addScaledVector(dd, 0.07), inv.clone().sub(s), UP, UP, UP, ic, ic.clone().multiplyScalar(1.15), ic, rc, rank); }
    }
    const fd = top.clone().sub(pts[2]).normalize().lerp(UP, 0.5).normalize();
    const t1 = perp(fd, rng), t2 = new V3().crossVectors(fd, t1);
    const red = variant === 2 && i === nF - 1 ? jit('#b0244a', rng, 0.05) : jit('#e01e1a', rng, 0.06, 0.012, 0.03);
    const white = new Col('#f2ece6');
    const R = rng.range(0.1, 0.12);
    for (let p = 0; p < 6; p++) {
      const a = p / 6 * TAU + rng.range(-0.08, 0.08); const out = t1.clone().multiplyScalar(Math.cos(a)).addScaledVector(t2, Math.sin(a));
      const side = new V3().crossVectors(fd, out).normalize();
      const cup = p % 2 ? 0.62 : 0.78; // inner/outer whorl: open cup
      const dir = out.clone().addScaledVector(fd, cup * 0.75).normalize();
      const ring = white.clone().lerp(red, 0.12);
      petal(flowers, top.clone().addScaledVector(out, 0.008), dir, side, R * 1.02, R * 0.36, [ring, red, red.clone().multiplyScalar(0.94)], rc, rank, { cup: 0.16, curl: 0.06 });
    }
    gem(flowers, top.clone().addScaledVector(fd, 0.015), fd, 0.06, 0.034, 6, new Col('#1a1428'), new Col('#2a1e38'), rc, rank, { top: 0.6 });
  }
  return { geoms: { leaves: leaves.build(), flowers: flowers.build() }, info: { H: 0.6, crownTop: 0.6, crownBottom: 0.02, crownR: 0.35, trunkR: 0.03, perch: [], attach: [], leafL: lum('#4e7c34'), flowerL: lum('#e01e1a'), fruitL: 0.1 } };
}

function buildMushroom(variant) {
  const rng = makeRng(hashString('mushroom') + variant * 7919);
  const base = new Geo(), caps = new Geo();
  // leaf litter (oak & terebinth leaves, a twig)
  const lit = ['#a8692c', '#c4843a', '#8a5226', '#b89448', '#7a5634'];
  for (let i = 0; i < 30; i++) {
    const a = rng() * TAU, r = Math.sqrt(rng()) * 0.38; const p = new V3(Math.cos(a) * r, 0.022 + rng() * 0.014, Math.sin(a) * r);
    const n = new V3(rng.range(-0.25, 0.25), 1, rng.range(-0.25, 0.25)).normalize();
    card(base, p, n, rng.range(0.11, 0.15), rng.range(0.06, 0.085), rng, jit(lit[i % lit.length], rng, 0.12), null, 0, { t: new V3(Math.cos(a * 3), 0, Math.sin(a * 3)), fold: 0.2, n });
  }
  for (let i = 0; i < 2; i++) { const a = rng() * TAU; const A = new V3(Math.cos(a) * 0.3, 0.012, Math.sin(a) * 0.3); const B = new V3(Math.cos(a + 2.2) * 0.25, 0.018, Math.sin(a + 2.2) * 0.25);
    tube(base, [A, A.clone().lerp(B, 0.5).add(new V3(0, 0.01, 0)), B], [0.012, 0.01, 0.008], 3, () => jit('#5a4a3a', rng), {}); }
  const n = [5, 6, 6][variant];
  for (let i = 0; i < n; i++) {
    const big = i === 0; const a = i * 2.3 + rng(); const r = big ? 0.02 : rng.range(0.06, 0.17);
    const o = new V3(Math.cos(a) * r, 0, Math.sin(a) * r);
    const h = big ? rng.range(0.2, 0.25) : rng.range(0.07, 0.16); const R = big ? 0.16 : rng.range(0.07, 0.12);
    const capH = R * rng.range(0.7, 0.95);
    const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(rng.range(-0.18, 0.18), rng() * TAU, rng.range(-0.18, 0.18)));
    const cream = (variant + i) % 3 === 0;
    const top = jit(cream ? '#e2cfa6' : '#8e5a32', rng, 0.08), rim = jit(cream ? '#efe2c2' : '#c4955e', rng, 0.06), gill = new Col(cream ? '#c8b494' : '#b89a78');
    const stem = jit('#ece0c6', rng, 0.05); const rank = rng.range(0.04, 0.96);
    const button = !big && i === n - 1;
    lathe(caps, [{ r: R * 0.36, y: 0, c: stem.clone().multiplyScalar(0.7) }, { r: R * 0.3, y: h * 0.5, c: stem }, { r: R * 0.25, y: h * 0.88, c: stem }], 6, o, tilt, o, rank);
    const prof = button
      ? [{ r: R * 0.17, y: h * 0.86, c: gill }, { r: R * 0.85, y: h * 0.86, c: rim }, { r: R * 0.75, y: h + capH * 0.7, c: top }, { r: R * 0.3, y: h + capH * 1.05, c: top }, { r: 0, y: h + capH * 1.12, c: top.clone().multiplyScalar(0.9) }]
      : [{ r: R * 0.17, y: h * 0.9, c: gill.clone().multiplyScalar(0.8) }, { r: R, y: h * 0.86, c: gill }, { r: R * 0.85, y: h + capH * 0.5, c: rim }, { r: R * 0.42, y: h + capH * 0.92, c: top }, { r: 0, y: h + capH, c: top.clone().multiplyScalar(0.88) }];
    lathe(caps, prof, 7, o, tilt, o, rank);
  }
  return { geoms: { base: base.build(), fruit: caps.build() }, info: { H: 0.45, crownTop: 0.45, crownBottom: 0.0, crownR: 0.25, trunkR: 0.04, perch: [], attach: [], leafL: 0.1, fruitL: lum('#8e5a32'), flowerL: 0.1 } };
}

// ---------------------------------------------------------------------------------------------------------------
// Per-species behaviour (year position y: winter 0 · spring .25 · summer .5 · autumn .75)
const L = (c1, c2, keys) => ({ c1: new Col(c1), c2: new Col(c2), keys });
const SPECIES = {
  oak: { kind: 'tree', sway: 0.012, flutter: 0.025, squash: 0.02, density: 0.88, woodDensity: 0.12, rough: 0.85,
    layers: [L('#7f9a3a', '#93a644', [[0.22, 0], [0.31, 0.5], [0.45, 0]]), L('#66704a', '#77774e', [[0.5, 0], [0.64, 0.5], [0.8, 0.45], [0.92, 0]])],
    bloom: [[0.22, 0], [0.27, 1], [0.35, 1], [0.41, 0]],
    fruit: [[0.58, 0], [0.72, 0.6], [0.8, 1], [0.97, 0.6], [0.1, 0]],
    fruitLayers: [L('#7a8a3a', '#8a9440', [[0.58, 1], [0.7, 0.9], [0.8, 0], [0.1, 0]])] },
  terebinth: { kind: 'tree', sway: 0.013, flutter: 0.035, squash: 0.02, density: 0.72, woodDensity: 0.1, rough: 0.85,
    keep: [[0.0, 0], [0.245, 0], [0.3, 0.6], [0.36, 1], [0.84, 1], [0.91, 0.6], [0.97, 0.08]],
    grow: [[0.0, 0.3], [0.245, 0.3], [0.38, 1], [0.92, 1], [0.98, 0.7]],
    layers: [L('#a8442c', '#b86a3c', [[0.2, 0.9], [0.29, 0.8], [0.39, 0], [0.97, 0]]), L('#c8381c', '#e47a26', [[0.1, 0.6], [0.18, 0], [0.72, 0], [0.8, 0.55], [0.87, 1], [0.98, 1]])],
    bloom: [[0.24, 0], [0.275, 1], [0.34, 1], [0.39, 0]],
    fruit: [[0.55, 0], [0.64, 0.7], [0.72, 1], [0.95, 1], [0.05, 0.3], [0.12, 0]],
    fruitLayers: [L('#7a9a4a', '#8aa050', [[0.4, 0], [0.52, 1], [0.6, 1], [0.69, 0]]), L('#5a2e3e', '#6a3044', [[0.82, 0], [0.97, 0.8], [0.12, 0.8], [0.2, 0]])] },
  carob: { kind: 'tree', sway: 0.01, flutter: 0.02, squash: 0.02, density: 0.92, woodDensity: 0.12, rough: 0.6,
    layers: [L('#5f8a34', '#6e9440', [[0.24, 0], [0.32, 0.35], [0.45, 0]]), L('#4a5a34', '#55603c', [[0.52, 0], [0.66, 0.3], [0.84, 0]])],
    bloom: [[0.74, 0], [0.79, 1], [0.92, 1], [0.98, 0]],
    fruit: [[0.0, 0.35], [0.18, 0.2], [0.27, 0.4], [0.45, 1], [0.92, 1], [0.97, 0.55]],
    fruitLayers: [L('#6a8a3a', '#7a9442', [[0.12, 0], [0.22, 1], [0.48, 1], [0.63, 0]])] },
  pine: { kind: 'tree', sway: 0.016, flutter: 0.02, squash: 0.02, density: 0.6, woodDensity: 0.1, rough: 0.9,
    layers: [L('#8fb07a', '#a0bc84', [[0.25, 0], [0.33, 0.35], [0.46, 0]]), L('#7a8a74', '#828e78', [[0.52, 0], [0.65, 0.3], [0.86, 0]])],
    bloom: [[0.22, 0], [0.26, 1], [0.33, 1], [0.38, 0]],
    fruit: [[0, 1]],
    fruitLayers: [L('#6a8040', '#728444', [[0.26, 0], [0.36, 0.45], [0.55, 0.3], [0.66, 0]])] },
  mastic: { kind: 'shrub', sway: 0.025, flutter: 0.02, squash: 0.08, density: 0.85, woodDensity: 0.15, rough: 0.75,
    layers: [L('#5c7a38', '#6a8a40', [[0.24, 0], [0.32, 0.3], [0.45, 0]]), L('#56603c', '#5e6640', [[0.52, 0], [0.66, 0.3], [0.85, 0]])],
    bloom: [[0.21, 0], [0.26, 1], [0.34, 1], [0.38, 0]],
    fruit: [[0.55, 0], [0.65, 0.6], [0.78, 1], [0.08, 1], [0.17, 0.35], [0.23, 0]],
    fruitLayers: [L('#d8b890', '#e0c4a0', [[0.4, 0], [0.55, 1], [0.64, 1], [0.72, 0]]), L('#1c1418', '#24181c', [[0.84, 0], [0.95, 1], [0.15, 1], [0.24, 0]])] },
  buckthorn: { kind: 'shrub', sway: 0.025, flutter: 0.02, squash: 0.08, density: 0.62, woodDensity: 0.18, rough: 0.85,
    layers: [L('#6a8a3c', '#78963e', [[0.2, 0], [0.3, 0.35], [0.44, 0]]), L('#606a40', '#6a7044', [[0.52, 0], [0.66, 0.35], [0.85, 0]])],
    bloom: [[0.08, 0], [0.14, 1], [0.28, 1], [0.33, 0]],
    fruit: [[0.4, 0], [0.5, 0.8], [0.58, 1], [0.76, 1], [0.86, 0.2], [0.92, 0]],
    fruitLayers: [L('#9aa040', '#a8a848', [[0.38, 1], [0.47, 0.8], [0.55, 0], [0.9, 0]]), L('#a0302a', '#b03a2c', [[0.47, 0], [0.52, 0.7], [0.58, 0]])] },
  sage: { kind: 'shrub', sway: 0.03, flutter: 0.012, squash: 0.25, density: 0.5, woodDensity: 0.1, rough: 1.0,
    keep: [[0.48, 1], [0.6, 0.78], [0.82, 0.78], [0.92, 1]],
    layers: [L('#a6aa92', '#b0b29c', [[0.46, 0], [0.6, 0.55], [0.82, 0.5], [0.93, 0]])],
    bloom: [[0.2, 0], [0.26, 1], [0.42, 1], [0.49, 0]] },
  rockrose: { kind: 'shrub', sway: 0.03, flutter: 0.012, squash: 0.2, density: 0.55, woodDensity: 0.1, rough: 0.95,
    keep: [[0.48, 1], [0.6, 0.72], [0.82, 0.72], [0.92, 1]],
    layers: [L('#8c8e66', '#969670', [[0.46, 0], [0.6, 0.55], [0.82, 0.5], [0.93, 0]])],
    bloom: [[0.21, 0], [0.27, 1], [0.42, 1], [0.48, 0]] },
  cyclamen: { kind: 'herb', sway: 0.04, flutter: 0.006, squash: 0.35, density: 0.25, woodDensity: 0.0, rough: 0.8,
    keep: [[0.46, 1], [0.53, 0.25], [0.565, 0], [0.78, 0], [0.86, 0.5], [0.93, 1]],
    grow: [[0.5, 1], [0.78, 0.5], [0.92, 1]],
    layers: [L('#8a7040', '#9a7a48', [[0.4, 0], [0.5, 0.85], [0.6, 0.85], [0.7, 0]])],
    bloom: [[0.87, 0], [0.94, 0.7], [0.02, 1], [0.3, 1], [0.37, 0]] },
  anemone: { kind: 'herb', sway: 0.06, flutter: 0.006, squash: 0.35, density: 0.2, woodDensity: 0.0, rough: 0.8,
    keep: [[0.42, 1], [0.5, 0.25], [0.6, 0.14], [0.82, 0.14], [0.9, 0.7], [0.96, 1]],
    grow: [[0.5, 1], [0.82, 0.6], [0.96, 1]],
    layers: [L('#9a8250', '#a88a58', [[0.38, 0], [0.48, 1], [0.84, 1], [0.92, 0]])],
    bloom: [[0.05, 0], [0.12, 1], [0.32, 1], [0.39, 0]] },
  mushroom: { kind: 'fungus', sway: 0.0, flutter: 0.0, squash: 0.2, density: 0.05, woodDensity: 0.0, rough: 0.8,
    fruit: [[0.0, 1], [0.27, 0.85], [0.4, 0.45], [0.5, 0.2], [0.76, 0.2], [0.84, 0.7], [0.92, 1]],
    fruitLayers: [L('#6a5040', '#5a4436', [[0.42, 0], [0.55, 0.65], [0.76, 0.65], [0.86, 0]])] },
};
// rotate keyframe arrays so they are sorted (kf expects ascending y)
for (const s of Object.values(SPECIES)) for (const key of ['keep', 'grow', 'bloom', 'fruit']) if (s[key]) s[key].sort((a, b) => a[0] - b[0]);
for (const s of Object.values(SPECIES)) for (const l of [...(s.layers || []), ...(s.fruitLayers || [])]) l.keys.sort((a, b) => a[0] - b[0]);

const BUILDERS = { sage: buildSage, rockrose: buildRockrose, cyclamen: buildCyclamen, anemone: buildAnemone, mushroom: buildMushroom };
const _variants = new Map();
function getVariant(id, v) {
  const key = id + ':' + v;
  if (!_variants.has(key)) _variants.set(key, WOODY[id] ? buildWoody(id, v) : BUILDERS[id](v));
  return _variants.get(key);
}

// ---------------------------------------------------------------------------------------------------------------
// PlantVisual
const PART_ORDER = ['base', 'wood', 'leaves', 'fruit', 'flowers', 'seed'];
const PART_MAT = {
  base: { side: THREE.FrontSide, rough: 0.95 }, wood: { side: THREE.FrontSide, rough: 0.95 }, leaves: { side: THREE.DoubleSide },
  fruit: { side: THREE.FrontSide, rough: 0.6 }, flowers: { side: THREE.DoubleSide, rough: 0.7 }, seed: { side: THREE.DoubleSide, rough: 0.85 },
};
const _tmpC = new Col();

function makePlant(id, opts = {}) {
  const S = SPECIES[id];
  const seed = (opts.seed ?? 1) | 0;
  const variant = ((seed % 3) + 3) % 3;
  const G = getVariant(id, variant);
  const info = G.info;
  const irng = makeRng(((seed * 2654435761) ^ 0x5bd1e995) >>> 0);
  const object = new THREE.Group(); object.name = 'grove-' + id;
  const root = new THREE.Group(); object.add(root);
  const rotY = irng() * TAU; root.rotation.y = rotY;
  const sizeJ = irng.range(0.93, 1.07);
  const tint = new Col(1, 1, 1).multiplyScalar(irng.range(0.94, 1.06)); tint.g *= irng.range(0.97, 1.03);
  const shared = {
    uTime: { value: 0 }, uWind: { value: 0.3 }, uPhase: { value: irng() * 100 }, uH: { value: Math.max(0.3, info.H) }, uR: { value: Math.max(0.2, info.crownR) },
    uSway: { value: S.sway }, uFlutter: { value: S.flutter * Math.max(0.3, info.H) * 0.06 }, uSquash: { value: S.squash },
  };
  const parts = {}; const mats = [];
  for (const name of PART_ORDER) {
    const g = G.geoms[name]; if (!g) continue;
    const baseL = name === 'leaves' || name === 'seed' ? info.leafL : name === 'fruit' ? info.fruitL : name === 'flowers' ? info.flowerL : 0.1;
    const U = makeUniforms(shared, baseL);
    if (name === 'leaves' || name === 'seed' || name === 'fruit' || name === 'flowers') U.uTint.value.copy(tint);
    const pm = PART_MAT[name];
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0, roughness: pm.rough ?? S.rough, side: pm.side });
    mat.userData.U = U; mat.onBeforeCompile = patchShader;
    const depth = new THREE.MeshDepthMaterial(); depth.userData.U = U; depth.onBeforeCompile = patchShader;
    const mesh = new THREE.Mesh(g, mat); mesh.name = id + '-' + name;
    mesh.customDepthMaterial = depth; mesh.castShadow = true; mesh.receiveShadow = true;
    (name === 'seed' ? object : root).add(mesh);
    if (name === 'seed') mesh.rotation.y = rotY;
    parts[name] = { mesh, U }; mats.push(mat, depth);
  }

  const st = { g: 1, h: 1, y: 0.33, bloom: null, fruit: null, fall: 0, night: 0, sxz: 1, sy: 1, leafVis: 1 };
  const isTree = S.kind === 'tree';

  function growthScale(g) {
    if (isTree) { const t = clamp((g - 0.15) / 0.85); const sy = 0.07 + 0.93 * Math.pow(t, 0.85); return [Math.pow(sy, 1.22), sy]; }
    if (S.kind === 'shrub') { const s = lerp(0.18, 1, Math.pow(g, 0.8)); return [s * lerp(0.75, 1, g), s]; }
    const s = lerp(0.45, 1, g); return [s, s];
  }
  function layerMix(layers, y, U) {
    let w = 0, amt = 0; const c1 = new Col(0, 0, 0), c2 = new Col(0, 0, 0);
    for (const l of layers || []) { const a = kf(l.keys, y); if (a > 0.001) { c1.add(_tmpC.copy(l.c1).multiplyScalar(a)); c2.add(_tmpC.copy(l.c2).multiplyScalar(a)); w += a; amt = Math.max(amt, a); } }
    if (w > 0) { U.uTarget.value.copy(c1.multiplyScalar(1 / w)); U.uTarget2.value.copy(c2.multiplyScalar(1 / w)); }
    U.uTargetAmt.value = amt;
  }
  function refresh() {
    const { g, h, y } = st;
    const [sxz, sy] = growthScale(g); st.sxz = sxz * sizeJ; st.sy = sy * sizeJ;
    root.scale.set(st.sxz, st.sy, st.sxz);
    const seedling = isTree && g < 0.18;
    root.visible = !seedling;
    const mature = isTree ? smoothstep(0.45, 0.75, g) : S.kind === 'shrub' ? smoothstep(0.2, 0.5, g) : smoothstep(0.05, 0.3, g);
    const dry = Math.pow(1 - h, 1.15) * 0.9;
    const hk = lerp(isTree ? 0.42 : 0.5, 1, h);
    const fallK = 1 - st.fall * 0.85;
    // leaves
    let keep = S.keep ? kf(S.keep, y) : 1;
    const grow = S.grow ? kf(S.grow, y) : 1;
    if (!isTree && S.kind !== 'fungus') keep *= lerp(0.55, 1, smoothstep(0, 0.7, g));
    keep *= hk * fallK;
    const lv = parts.leaves;
    if (lv) {
      lv.U.uKeep.value = keep; lv.U.uGrow.value = grow; layerMix(S.layers, y, lv.U);
      lv.U.uDryAmt.value = dry; lv.U.uDroop.value = 1 - h;
    }
    st.leafVis = keep * grow * grow;
    for (const p of ['wood', 'base']) if (parts[p]) { parts[p].U.uDroop.value = (1 - h) * 0.6; parts[p].U.uTint.value.setRGB(1, 1, 1).lerp(_tmpC.setRGB(0.92, 0.9, 0.86), 1 - h); }
    // flowers
    if (parts.flowers) {
      const b = (st.bloom ?? (S.bloom ? kf(S.bloom, y) : 0)) * mature * lerp(0.25, 1, h) * fallK;
      const U = parts.flowers.U; U.uKeep.value = b; U.uGrow.value = lerp(0.55, 1, clamp(b * 1.5)); U.uDryAmt.value = dry * 0.6; U.uDroop.value = 1 - h;
    }
    // fruit
    if (parts.fruit) {
      const f = (st.fruit ?? (S.fruit ? kf(S.fruit, y) : 0)) * (S.kind === 'fungus' ? 1 : mature) * lerp(0.4, 1, h) * fallK;
      const U = parts.fruit.U; U.uKeep.value = f; U.uGrow.value = S.kind === 'fungus' ? lerp(0.35, 1, g) * lerp(0.5, 1, clamp(f * 1.6)) : lerp(0.6, 1, clamp(f * 1.5));
      layerMix(S.fruitLayers, y, U); U.uDryAmt.value = dry * 0.5; U.uDroop.value = (1 - h) * 0.5;
    }
    // a part folded away completely by the shader (no flowers / fruit / leaves this season) is skipped by the renderer
    // too: identical picture, fewer draw calls in both the colour and the shadow pass
    for (const k of ['leaves', 'flowers', 'fruit']) {
      const P = parts[k]; if (!P) continue;
      if (P.minRank === undefined) { const a = P.mesh.geometry.attributes.aRank; let m = 1e9; if (a) for (let i = 0; i < a.count; i++) m = Math.min(m, a.getX(i)); P.minRank = a ? m : -1e9; }
      P.mesh.visible = (P.U.uKeep.value - P.minRank) * 14 + 0.5 > 0;
    }
    // seedling
    if (parts.seed) {
      parts.seed.mesh.visible = seedling;
      const s = lerp(0.8, 1.5, clamp(g / 0.18)) * sizeJ; parts.seed.mesh.scale.setScalar(s);
      const U = parts.seed.U; U.uDryAmt.value = dry; U.uKeep.value = lerp(0.4, 1, h) * (S.keep ? Math.max(0.15, kf(S.keep, y)) : 1); U.uDroop.value = 1 - h;
      layerMix(S.layers, y, U); U.uTargetAmt.value *= 0.5;
    }
  }

  function localPt(p) { // root-local → object-local
    return new V3(p.x * st.sxz, p.y * st.sy, p.z * st.sxz).applyAxisAngle(UP, rotY);
  }

  const vis = {
    object,
    setGrowth(g) { st.g = clamp(g ?? 1); refresh(); },
    setHealth(h) { st.h = clamp(h ?? 1); refresh(); },
    setSeason(season, frac = 0) {
      const i = SEASON_INDEX[season];
      if (i === undefined) return; // amazon / null season: keep current look
      st.y = ((i + clamp(frac ?? 0, 0, 0.999)) / 4) % 1; refresh();
    },
    setBloom(b) { st.bloom = b == null ? null : clamp(b); refresh(); },
    setFruit(f) { st.fruit = f == null ? null : clamp(f); refresh(); },
    setNightGlow(n) { st.night = n; },
    update(dt, t, wind) {
      shared.uTime.value = t || 0;
      const w = wind == null ? 0.3 : clamp(wind);
      shared.uWind.value += (w - shared.uWind.value) * (1 - Math.exp(-2 * (dt || 0.016)));
    },
    crown() {
      if (isTree && st.g < 0.18) { const s = lerp(0.8, 1.5, clamp(st.g / 0.18)) * sizeJ; return { top: info.seedH * s, bottom: 0, radius: 0.15 * s, density: 0.04 }; }
      const lv = clamp(st.leafVis);
      return { top: info.crownTop * st.sy, bottom: info.crownBottom * st.sy, radius: info.crownR * st.sxz, density: clamp(S.woodDensity + (S.density - S.woodDensity) * lv) };
    },
    attachPoints() {
      if (!isTree || st.g < 0.5) return [];
      return info.attach.map(a => ({ pos: localPt(a.pos), normal: a.normal.clone() }));
    },
    perchPoints() {
      if ((isTree && st.g < 0.35) || S.kind === 'herb' || S.kind === 'fungus') return [];
      return info.perch.map(localPt);
    },
    get trunkRadius() { return isTree && st.g < 0.18 ? 0.02 : info.trunkR * st.sxz; },
    fall(p) { st.fall = clamp(p); refresh(); },
    dispose() { for (const m of mats) m.dispose(); object.removeFromParent(); },
  };
  refresh();
  return vis;
}

export const PLANTS = {
  oak: (o) => makePlant('oak', o),
  terebinth: (o) => makePlant('terebinth', o),
  carob: (o) => makePlant('carob', o),
  pine: (o) => makePlant('pine', o),
  mastic: (o) => makePlant('mastic', o),
  buckthorn: (o) => makePlant('buckthorn', o),
  sage: (o) => makePlant('sage', o),
  rockrose: (o) => makePlant('rockrose', o),
  cyclamen: (o) => makePlant('cyclamen', o),
  anemone: (o) => makePlant('anemone', o),
  mushroom: (o) => makePlant('mushroom', o),
};

// Called by the zone pack when its zone closes: frees the cached geometry / materials (rebuilt on the next visit).
export function releaseCaches() { disposeDeep(_variants); _variants.clear(); }
