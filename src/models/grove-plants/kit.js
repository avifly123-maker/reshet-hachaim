// Grove plants: the shared toolkit (1.3.2: moved here from src/models/grove-plants.js unchanged).
// The shader patch (patchShader, makeUniforms: wind sway, collapse / grow, droop, seasonal colour) and the geometry
// helpers (Geo builder, tube, walk, curve, taper, blob, card, gem, lathe, barkFn, colour helpers).
// Exports these and V3, Col, UP, TAU, SEASON_INDEX.
import * as THREE from 'three';
import { clamp, lerp, smoothstep } from '../../core/util.js';

export const V3 = THREE.Vector3;
export const Col = THREE.Color;
export const UP = new V3(0, 1, 0);
export const TAU = Math.PI * 2;
export const SEASON_INDEX = { winter: 0, spring: 1, summer: 2, autumn: 3 };

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
export function patchShader(shader) {
  const U = this.userData.U;
  for (const k in U) shader.uniforms[k] = U[k];
  shader.vertexShader = VERT_PRE + shader.vertexShader.replace('#include <begin_vertex>', VERT_BEGIN);
  shader.fragmentShader = FRAG_PRE + shader.fragmentShader
    .replace('#include <color_fragment>', FRAG_COLOR)
    .replace('#include <normal_fragment_begin>', FRAG_NORMAL);
}

export function makeUniforms(shared, baseL) {
  return Object.assign({
    uKeep: { value: 1 }, uGrow: { value: 1 }, uDroop: { value: 0 },
    uTarget: { value: new Col(1, 1, 1) }, uTarget2: { value: new Col(1, 1, 1) }, uTargetAmt: { value: 0 },
    uDry: { value: new Col('#9c8f5c') }, uDryAmt: { value: 0 }, uBaseL: { value: baseL || 0.1 },
    uTint: { value: new Col(1, 1, 1) },
  }, shared);
}

// ---------------------------------------------------------------------------------------------------------------
// Geometry helpers
export class Geo {
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

export function rndUnit(rng) {
  const u = rng() * 2 - 1, a = rng() * TAU, s = Math.sqrt(1 - u * u);
  return new V3(Math.cos(a) * s, u, Math.sin(a) * s);
}
export function jit(c, rng, dl = 0.08, dh = 0.012, ds = 0.05) {
  const hsl = {}; new Col(c).getHSL(hsl);
  return new Col().setHSL((hsl.h + rng.range(-dh, dh) + 1) % 1, clamp(hsl.s + rng.range(-ds, ds)), clamp(hsl.l * (1 + rng.range(-dl, dl))));
}
export function lum(c) { c = new Col(c); return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b; }
export function hash3(x, y, z) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
export function perp(n, rng) { const t = rndUnit(rng); t.addScaledVector(n, -t.dot(n)); if (t.lengthSq() < 1e-4) t.set(1, 0, 0); return t.normalize(); }
// periodic smooth keyframes over the year position y ∈ [0,1) (winter 0, spring .25, summer .5, autumn .75)
export function kf(keys, y) {
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
export function tube(geo, pts, rads, k, colorFn, o = {}) {
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

export function walk(start, dir, len, n, rng, gnarl, upBias = 0) {
  const pts = [start.clone()]; const d = dir.clone().normalize(); let p = start.clone(); const step = len / n;
  for (let i = 1; i <= n; i++) { d.add(rndUnit(rng).multiplyScalar(gnarl)).addScaledVector(UP, upBias).normalize(); p = p.clone().addScaledVector(d, step); pts.push(p); }
  return { pts, dir: d };
}
export function curve(A, B, n, rng, bendUp, gnarl) {
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
export function taper(n, r0, r1, pow = 1) { const r = []; for (let i = 0; i < n; i++) r.push(lerp(r0, r1, Math.pow(i / Math.max(1, n - 1), pow))); return r; }

export const ICO = [new THREE.IcosahedronGeometry(1, 0), new THREE.IcosahedronGeometry(1, 1)];
// irregular leaf-mass blob; normals blended toward crown-spherical for a soft canopy shading
export function blob(geo, c, r, sy, rng, o) {
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
export function shade(c, p, o) {
  const dx = (p.x - o.crownC.x) / o.rx, dy = (p.y - o.crownC.y) / o.ry, dz = (p.z - o.crownC.z) / o.rx;
  const rad = clamp(Math.sqrt(dx * dx + dy * dy + dz * dz));
  const top = clamp(dy * 0.5 + 0.5);
  const lo = o.aoLo ?? 0.5;
  return c.clone().multiplyScalar((lo + (1 - lo) * rad) * (0.78 + 0.34 * top));
}
// leaf card (2 tris, slight V fold); n = facing normal used for lighting
export function card(geo, p, nOut, len, wid, rng, c, ce, rank, o = {}) {
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
export function gem(geo, c, axis, len, rad, sides, colA, colB, ce, rank, o = {}) {
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
export function lathe(geo, prof, segs, origin, q, ce, rank) {
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
export function barkFn(base, alt, rng, noise, o = {}) {
  const A = new Col(base), B = new Col(alt);
  return (t, a, p) => {
    const n = noise(a * (o.fiss || 3) * 1.7 + p.y * 0.15, p.y * (o.vert || 0.9) + a * 0.7);
    const c = A.clone().lerp(B, clamp(0.5 + n * 1.2));
    c.multiplyScalar((0.62 + 0.38 * smoothstep(0, 1.3, p.y)) * (0.9 + rng() * 0.18) * (o.light || 1));
    if (o.upper) c.lerp(new Col(o.upper), smoothstep(o.upperY || 4, (o.upperY || 4) * 1.6, p.y) * 0.6);
    return c;
  };
}
