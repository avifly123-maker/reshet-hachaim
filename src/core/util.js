// Shared helpers. Every module may import from here.
import * as THREE from 'three';

// Deterministic PRNG. rng() -> [0,1)
export function makeRng(seed = 1) {
  let a = (seed >>> 0) || 1;
  const rng = () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.range = (lo, hi) => lo + (hi - lo) * rng();
  rng.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * rng());
  rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
  rng.sign = () => (rng() < 0.5 ? -1 : 1);
  return rng;
}

export function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Current render quality tier ('min' | 'low' | 'medium' | 'high'), written by the pipeline (createPipeline / setQuality)
// so model code can scale purely cosmetic detail without plumbing an option through every builder.
let _renderQuality = 'medium';
export const setRenderQuality = (q) => { _renderQuality = q; };
export const renderQuality = () => _renderQuality;
export const isLowQuality = () => _renderQuality === 'min' || _renderQuality === 'low';

export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const damp = (current, target, lambda, dt) => lerp(current, target, 1 - Math.exp(-lambda * dt));

// 2D value noise (cheap, deterministic) – useful for terrain, wind, colour variation.
export function makeNoise2D(seed = 1) {
  const rng = makeRng(seed);
  const P = new Uint8Array(512); const G = new Float32Array(256);
  for (let i = 0; i < 256; i++) { P[i] = i; G[i] = rng() * 2 - 1; }
  for (let i = 255; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = P[i]; P[i] = P[j]; P[j] = t; }
  for (let i = 0; i < 256; i++) P[i + 256] = P[i];
  const v = (x, y) => G[P[(P[x & 255] + y) & 255]];
  const noise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y); const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
    const a = v(xi, yi), b = v(xi + 1, yi), c = v(xi, yi + 1), d = v(xi + 1, yi + 1);
    return lerp(lerp(a, b, u), lerp(c, d, u), w); // ~[-1,1]
  };
  noise.fbm = (x, y, oct = 4) => { let s = 0, amp = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += amp * noise(x * f, y * f); f *= 2; amp *= 0.5; } return s; };
  return noise;
}

// Tiny event bus used between core and UI/audio.
export function makeBus() {
  const map = new Map();
  return {
    on(name, fn) { if (!map.has(name)) map.set(name, new Set()); map.get(name).add(fn); return () => map.get(name).delete(fn); },
    emit(name, payload) { const s = map.get(name); if (s) for (const fn of [...s]) { try { fn(payload); } catch (e) { console.error('bus handler error', name, e); } } },
  };
}

// Material cache so many instances share one material (important for performance).
const _matCache = new Map();
export function cachedMaterial(key, factory) {
  if (!_matCache.has(key)) _matCache.set(key, factory());
  return _matCache.get(key);
}

// Drop (and free) the cached materials whose key starts with prefix – a zone pack calls this when its zone closes.
export function releaseMaterials(prefix) {
  for (const [k, m] of [..._matCache]) if (k.startsWith(prefix)) { disposeDeep(m); _matCache.delete(k); }
}
// Free the GPU memory of everything a module-level cache holds: geometries, materials (+ their own texture slots),
// textures and Object3D trees, found inside plain objects, arrays, Maps and Sets. The caller then clears the cache so
// the JS side can be garbage-collected too. Other class instances (colours, vectors…) are left alone.
export function disposeDeep(v, seen = new Set()) {
  if (!v || typeof v !== 'object' || seen.has(v)) return;
  seen.add(v);
  if (v.isBufferGeometry || v.isTexture) { v.dispose(); return; }
  if (v.isMaterial) { for (const x of Object.values(v)) if (x && x.isTexture) x.dispose(); v.dispose(); return; }
  if (v.isObject3D) { v.traverse((o) => { if (o.geometry) disposeDeep(o.geometry, seen); const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) if (m) disposeDeep(m, seen); }); return; }
  if (v instanceof Map) { for (const x of v.values()) disposeDeep(x, seen); return; }
  if (v instanceof Set || Array.isArray(v)) { for (const x of v) disposeDeep(x, seen); return; }
  const proto = Object.getPrototypeOf(v);
  if (proto === Object.prototype || proto === null) for (const x of Object.values(v)) disposeDeep(x, seen);
}

// Colour helper: jitter a base colour deterministically (hue/sat/light shifts)
export function jitterColor(hex, rng, dh = 0.02, ds = 0.06, dl = 0.06) {
  const c = new THREE.Color(hex); const hsl = {}; c.getHSL(hsl);
  c.setHSL((hsl.h + rng.range(-dh, dh) + 1) % 1, clamp(hsl.s + rng.range(-ds, ds)), clamp(hsl.l + rng.range(-dl, dl)));
  return c;
}

// Merge an array of BufferGeometries that may have different attribute sets → one geometry
// (normal+position required; color filled with white if missing). Keeps draw calls low.
export function mergeGeometries(geoms) {
  const parts = geoms.map(g => (g.index ? g.toNonIndexed() : g));
  let n = 0; for (const g of parts) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  for (const g of parts) {
    if (!g.attributes.normal) g.computeVertexNormals();
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.color) col.set(g.attributes.color.array.subarray(0, c * 3), o * 3); else col.fill(1, o * 3, (o + c) * 3);
    o += c;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}

// Paint a whole geometry with one vertex colour (so it can be merged with differently coloured parts).
export function paint(geom, color) {
  const g = geom.index ? geom.toNonIndexed() : geom;
  const c = new THREE.Color(color); const n = g.attributes.position.count; const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}

export const SEASONS = ['winter', 'spring', 'summer', 'autumn'];
