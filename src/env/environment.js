// Environment: floating diorama island, sky, sun/moon, fog, water, weather, light shafts, fire, ground cover.
// See CONTRACT.md §2. Biomes: 'amazon' | 'grove'.
import * as THREE from 'three';
import { makeRng, makeNoise2D, clamp, lerp, smoothstep, damp, mergeGeometries } from '../core/util.js';
import { PANO } from '../data/panorama.js';
import { GROUND_TEX } from '../data/ground-textures.js';
import { TREE_SHADOW } from '../data/tree-shadow.js';
import { bakeImpostors, patchImpostorMaterial, impostorQuad } from './impostors.js';
import { propGeometry } from '../world/props.js';
import { createReefEnvironment } from './reef.js';

const R = 38;
const MAX_SHAFTS = 20;
const MAX_FIRES = 6;
const MAX_SCORCH = 8;
const MAX_GAPS = 8;
const TAU = Math.PI * 2;

const Q = {
  min:    { seg: 96,  rings: 30, scatter: 0.05, motes: 6,  pollen: 24,  rain: 300,  mist: 3,  flames: 4,  shadowScatter: false },
  low:    { seg: 128, rings: 40, scatter: 0.16, motes: 14, pollen: 60,  rain: 800,  mist: 6,  flames: 6,  shadowScatter: false },
  medium: { seg: 176, rings: 52, scatter: 0.4,  motes: 28, pollen: 150, rain: 1800, mist: 12, flames: 10, shadowScatter: false },
  high:   { seg: 288, rings: 80, scatter: 1.0,  motes: 56, pollen: 420, rain: 5200, mist: 26, flames: 14, shadowScatter: true },
};

const C = (h) => new THREE.Color(h);
const tmpC = new THREE.Color(), tmpC2 = new THREE.Color();
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// ───────────────────────────────────────────────────────── procedural textures
function makeTileNoiseTexture(size = 256, seed = 7) {
  const rng = makeRng(seed);
  const data = new Uint8Array(size * size * 4);
  const chans = [[32, 64, 128], [8, 16, 32, 64], [4, 8, 16], [16, 32]];
  for (let c = 0; c < 4; c++) {
    const field = new Float32Array(size * size);
    let amp = 1;
    for (const period of chans[c]) {
      const g = new Float32Array(period * period);
      for (let i = 0; i < g.length; i++) g[i] = rng();
      const cell = size / period;
      for (let y = 0; y < size; y++) {
        const gy = y / cell, y0 = Math.floor(gy), fy = gy - y0, sy = fy * fy * (3 - 2 * fy);
        const ya = (y0 % period) * period, yb = ((y0 + 1) % period) * period;
        for (let x = 0; x < size; x++) {
          const gx = x / cell, x0 = Math.floor(gx), fx = gx - x0, sx = fx * fx * (3 - 2 * fx);
          const xa = x0 % period, xb = (x0 + 1) % period;
          const v = lerp(lerp(g[ya + xa], g[ya + xb], sx), lerp(g[yb + xa], g[yb + xb], sx), sy);
          field[y * size + x] += v * amp;
        }
      }
      amp *= 0.55;
    }
    let mn = Infinity, mx = -Infinity;
    for (const v of field) { if (v < mn) mn = v; if (v > mx) mx = v; }
    for (let i = 0; i < field.length; i++) data[i * 4 + c] = Math.round(255 * (field[i] - mn) / (mx - mn));
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true; tex.needsUpdate = true;
  return tex;
}

function makePuffTexture(size = 128, seed = 3) {
  const noise = makeNoise2D(seed);
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = (x + 0.5) / size * 2 - 1, v = (y + 0.5) / size * 2 - 1;
    const r = Math.sqrt(u * u + v * v);
    const n = noise.fbm(u * 2.5 + 4, v * 2.5 + 9, 4) * 0.5 + 0.5;
    let a = clamp(1 - r) ** 1.6 * (0.45 + 0.9 * n);
    a = clamp(a);
    const i = (y * size + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = 255; data[i + 3] = Math.round(a * 255);
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

// ───────────────────────────────────────────────────────── palettes
const SKY = {
  amazon: [
    // e = sin(sun elevation)
    // night (Avi, 19.10: too dark to play): a deep blue moonlit sky and a faintly luminous haze instead of black
    { e: -1.0, zen: '#071534', hor: '#1f3558', gnd: '#172640', fog: '#223a5c' },
    { e: -0.22, zen: '#0a1a3e', hor: '#253d62', gnd: '#1a2a46', fog: '#28405f' },
    { e: -0.08, zen: '#1a2a52', hor: '#6a5a78', gnd: '#2a2c40', fog: '#3e4058' },
    { e: 0.0, zen: '#33508a', hor: '#e2875a', gnd: '#5a5050', fog: '#b98a74' },
    { e: 0.12, zen: '#4d78b8', hor: '#f0bf8e', gnd: '#8a8a78', fog: '#d5c0a0' },
    { e: 0.35, zen: '#4a84c4', hor: '#c6dcd2', gnd: '#9fb4a8', fog: '#b6cec2' },
    { e: 1.0, zen: '#3e7cc2', hor: '#cadfd6', gnd: '#a4b8ac', fog: '#bad2c6' },
  ],
  grove: [
    { e: -1.0, zen: '#081638', hor: '#22385e', gnd: '#182844', fog: '#263e62' },
    { e: -0.22, zen: '#0b1b42', hor: '#284068', gnd: '#1b2c4a', fog: '#2c4568' },
    { e: -0.08, zen: '#1e2d5a', hor: '#7a5e7a', gnd: '#2e2c42', fog: '#47425c' },
    { e: 0.0, zen: '#3a5a98', hor: '#f08a52', gnd: '#6a5048', fog: '#c88e6c' },
    { e: 0.12, zen: '#4a7cc4', hor: '#f6c48a', gnd: '#9a8e74', fog: '#e0c8a0' },
    { e: 0.35, zen: '#2463d0', hor: '#d2e2ee', gnd: '#c4bca8', fog: '#cddbe6' },
    { e: 1.0, zen: '#1f5ccc', hor: '#d6e6f2', gnd: '#c8c0ae', fog: '#d0dfea' },
  ],
};
const SKY_C = {};
for (const k in SKY) SKY_C[k] = SKY[k].map(s => ({ e: s.e, zen: C(s.zen), hor: C(s.hor), gnd: C(s.gnd), fog: C(s.fog) }));
function samplePalette(pal, e, key, out) {
  if (e <= pal[0].e) return out.copy(pal[0][key]);
  for (let i = 1; i < pal.length; i++) {
    if (e <= pal[i].e) { const t = (e - pal[i - 1].e) / (pal[i].e - pal[i - 1].e); return out.copy(pal[i - 1][key]).lerp(pal[i][key], t); }
  }
  return out.copy(pal[pal.length - 1][key]);
}

// grove season keyframes over year position p ∈ [0,4): 0 winter, 1 spring, 2 summer, 3 autumn
const GROVE_YEAR = [
  { p: 0.0, grass: '#6a9440', dry: '#7d8c46', cover: 0.80, soilWet: 0.55 },
  { p: 0.6, grass: '#558c34', dry: '#66883a', cover: 0.95, soilWet: 0.65 },
  { p: 1.2, grass: '#5f9236', dry: '#80983e', cover: 1.00, soilWet: 0.45 },
  { p: 1.75, grass: '#94a048', dry: '#b4a456', cover: 0.95, soilWet: 0.2 },
  { p: 2.15, grass: '#c8b05a', dry: '#d4b56a', cover: 0.85, soilWet: 0.0 },
  { p: 2.7, grass: '#cfac62', dry: '#c49a58', cover: 0.75, soilWet: 0.0 },
  { p: 3.15, grass: '#b49a5c', dry: '#a88c58', cover: 0.62, soilWet: 0.05 },
  { p: 3.5, grass: '#8e9c4e', dry: '#a69858', cover: 0.68, soilWet: 0.35 },
  { p: 3.8, grass: '#749a44', dry: '#8e9450', cover: 0.75, soilWet: 0.5 },
  { p: 4.0, grass: '#6a9440', dry: '#7d8c46', cover: 0.80, soilWet: 0.55 },
];
const GROVE_YEAR_C = GROVE_YEAR.map(k => ({ ...k, grassC: C(k.grass), dryC: C(k.dry) }));
function sampleYear(p) {
  p = ((p % 4) + 4) % 4;
  for (let i = 1; i < GROVE_YEAR_C.length; i++) {
    const a = GROVE_YEAR_C[i - 1], b = GROVE_YEAR_C[i];
    if (p <= b.p) {
      const t = (p - a.p) / (b.p - a.p);
      return { grass: a.grassC.clone().lerp(b.grassC, t), dry: a.dryC.clone().lerp(b.dryC, t), cover: lerp(a.cover, b.cover, t), soilWet: lerp(a.soilWet, b.soilWet, t) };
    }
  }
  const k = GROVE_YEAR_C[0]; return { grass: k.grassC.clone(), dry: k.dryC.clone(), cover: k.cover, soilWet: k.soilWet };
}
const bump = (p, a, b, c, d) => smoothstep(a, b, p) * (1 - smoothstep(c, d, p));

// ───────────────────────────────────────────────────────── GLSL snippets
const GLSL_COMMON = /* glsl */`
uniform float uTime; uniform float uWind; uniform float uVital; uniform float uWet;
uniform vec4 uScorch[${MAX_SCORCH}];
varying vec3 vWPos;
float scorchAt(vec2 p){ float sc = 0.0; for (int i = 0; i < ${MAX_SCORCH}; i++){ vec4 s = uScorch[i]; if (s.w <= 0.0) continue; float d = length(p - s.xy); sc = max(sc, s.w * (1.0 - smoothstep(s.z * 0.45, s.z * 1.2, d))); } return sc; }
vec3 vitalGrade(vec3 c){ float l = dot(c, vec3(0.299, 0.587, 0.114)); return mix(vec3(l) * vec3(1.04, 0.98, 0.9), c, 0.35 + 0.65 * uVital) * (0.88 + 0.12 * uVital); }
`;

function patchMaterial(mat, key, uniforms, { vertexPre = '', vertexBegin = '', fragPre = '', fragColor = '', fragRough = '', fragEmissive = '', fragNormal = '', colorVertex = null, instanced = false, cards = false } = {}) {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + GLSL_COMMON + vertexPre)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + vertexBegin + `\n{ vec4 _wp = vec4(transformed, 1.0); ${instanced ? '_wp = instanceMatrix * _wp;' : ''} vWPos = (modelMatrix * _wp).xyz; }`);
    if (colorVertex) shader.vertexShader = shader.vertexShader.replace('#include <color_vertex>', colorVertex);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + GLSL_COMMON + fragPre)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + fragColor)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' + fragRough)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + fragEmissive)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + fragNormal);
    if (cards) shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize(vNormal);');
  };
  mat.customProgramCacheKey = () => 'env-' + key;
  return mat;
}

// ═════════════════════════════════════════════════════════ createEnvironment
// impostorTrees (optional): [{ id, role, build: () => PlantVisual }] – a few mature trees of the zone, baked into the far
// forest's tree impostors (roles: amazon 'emergent' | 'canopy' | 'palm', grove 'tree' | 'bush'). Without them (or if the
// bake fails) the far forest uses simple faceted crowns.
export function createEnvironment(pipeline, biomeId = 'amazon', { quality = 'medium', seed = 1, impostorTrees = null } = {}) {
  if (biomeId === 'reef') return createReefEnvironment(pipeline, { quality, seed });   // the reef has its own diorama (src/env/reef.js)
  const isAmazon = biomeId !== 'grove';
  const biome = isAmazon ? 'amazon' : 'grove';
  const scene = pipeline.scene;
  const qual = Q[quality] || Q.medium;
  const rng = makeRng(seed * 7919 + (isAmazon ? 11 : 23));
  const noise = makeNoise2D(seed * 31 + (isAmazon ? 5 : 9));
  const noiseB = makeNoise2D(seed * 57 + 77);
  const root = new THREE.Group(); root.name = 'environment';
  scene.add(root);
  const disposables = [];
  const track = (x) => { disposables.push(x); return x; };

  const noiseTex = track(makeTileNoiseTexture(256, seed + 3));
  const puffTex = track(makePuffTexture(128, seed + 5));

  // Shared uniforms (same objects referenced by many materials)
  const U = {
    uTime: { value: 0 }, uWind: { value: 0.2 }, uVital: { value: 1 }, uWet: { value: 0 },
    uScorch: { value: Array.from({ length: MAX_SCORCH }, () => new THREE.Vector4(0, 0, 0, 0)) },
    uNoise: { value: noiseTex },
    uSunDir: { value: V3(0, 1, 0) }, uSunCol: { value: C('#ffffff') },
    uLightCol: { value: C('#ffffff') },  // overall ambient-ish light level colour for unlit shaders
    uSkyCol: { value: C('#88aacc') }, uHorCol: { value: C('#ccddee') },
    uPx: { value: 600 },
  };

  // ───────────────────────────── island shape & height field
  const edgeNoise = makeNoise2D(seed * 13 + 3);
  function edgeR(theta) {
    const c = Math.cos(theta), s = Math.sin(theta);
    return 44 + 1.7 * edgeNoise(c * 1.4 + 5, s * 1.4 + 5) + 0.7 * edgeNoise(c * 3.5 + 9, s * 3.5 - 2);
  }

  // Water layout
  let WL = null; // water level
  let riverPts = null, riverHW = 2.6, springPool = null, pools = [], riverExit = null;
  const rocks = [];

  if (isAmazon) {
    const ctrl = [[-13, -31], [-8, -22], [-12, -12], [-4, -3], [8, 0], [15, 9], [21, 18], [29, 24], [37, 30], [45, 36], [52, 41]];
    const curve = new THREE.CatmullRomCurve3(ctrl.map(([x, z]) => V3(x, 0, z)), false, 'catmullrom', 0.5);
    const pts = curve.getSpacedPoints(110).map(p => ({ x: p.x, z: p.z }));
    // find exit
    let exitI = pts.length - 1;
    for (let i = 5; i < pts.length; i++) { const p = pts[i]; if (Math.hypot(p.x, p.z) > edgeR(Math.atan2(p.z, p.x)) - 0.2) { exitI = i; break; } }
    riverPts = pts.slice(0, exitI + 1);
    const a = pts[exitI - 1], b = pts[exitI];
    const d = V3(b.x - a.x, 0, b.z - a.z).normalize();
    riverExit = { x: b.x, z: b.z, dir: d };
    WL = -0.35;
    springPool = { x: pts[0].x, z: pts[0].z, r: 3.6 };
    pools = [springPool];
  }

  function distToRiver(x, z) {
    let best = 1e9, bestS = 0, acc = 0;
    for (let i = 0; i < riverPts.length - 1; i++) {
      const a = riverPts[i], b = riverPts[i + 1];
      const dx = b.x - a.x, dz = b.z - a.z; const L2 = dx * dx + dz * dz;
      let t = ((x - a.x) * dx + (z - a.z) * dz) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = a.x + dx * t - x, pz = a.z + dz * t - z; const d2 = px * px + pz * pz;
      const L = Math.sqrt(L2);
      if (d2 < best) { best = d2; bestS = acc + L * t; }
      acc += L;
    }
    return { d: Math.sqrt(best), s: bestS };
  }

  function rawHeight(x, z) {
    const r = Math.hypot(x, z);
    let h = 0.7 + 1.5 * noise.fbm(x * 0.028 + 11, z * 0.028 - 7, 3) + 0.35 * noise(x * 0.1 + 3, z * 0.1 - 1);
    if (!isAmazon) {
      h += 1.6 * Math.exp(-((x + 17) ** 2 + (z + 15) ** 2) / 200);   // rocky knoll (back-left)
      h += 0.8 * Math.exp(-((x - 22) ** 2 + (z + 20) ** 2) / 160);
    }
    const th = Math.atan2(z, x);
    const er = edgeR(th);
    const rim = smoothstep(R - 2.5, R + 4.5, r);
    h += rim * (0.9 + 1.5 * (noiseB(x * 0.13 + 3, z * 0.13) * 0.5 + 0.5));
    const lip = smoothstep(er - 2.6, er, r);
    h -= lip * lip * 1.3;
    if (r > er) h -= (r - er) * 2.5;
    return h;
  }

  function poolShapeR(p, x, z) {
    const a = Math.atan2(z - p.z, x - p.x);
    return p.r * (1 + 0.13 * Math.sin(a * 3 + 1.3) + 0.07 * Math.sin(a * 5 + 0.4));
  }

  // grove pool
  if (!isAmazon) {
    const P = { x: 13, z: -6, r: 4.3 };
    P.h0 = rawHeight(P.x, P.z);
    WL = P.h0 - 0.12;
    pools = [P];
  }

  function heightAt(x, z) {
    let h = rawHeight(x, z);
    if (isAmazon) {
      const { d } = distToRiver(x, z);
      const hw = riverHW;
      if (d < hw + 6) {
        const bankH = WL + 0.28 + Math.max(0, d - hw) * 0.32;
        const t = smoothstep(hw + 6, hw + 0.8, d);
        h = lerp(h, Math.min(h, bankH) * 0.5 + bankH * 0.5, t);
        if (d < hw + 0.8) {
          const q = clamp(d / hw);
          const bed = WL - 0.25 - 0.85 * (1 - q * q);
          h = lerp(bed, h, smoothstep(hw - 0.7, hw + 0.8, d));
        }
      }
      const sp = springPool; const ds = Math.hypot(x - sp.x, z - sp.z);
      if (ds < sp.r + 3) {
        const pr = poolShapeR(sp, x, z);
        const bankH = WL + 0.3 + Math.max(0, ds - pr) * 0.3;
        h = lerp(h, bankH, smoothstep(pr + 3, pr + 0.5, ds));
        if (ds < pr + 0.5) { const q = clamp(ds / pr); h = lerp(WL - 0.3 - 0.9 * (1 - q * q), h, smoothstep(pr - 0.7, pr + 0.5, ds)); }
      }
    } else {
      const P = pools[0]; const d = Math.hypot(x - P.x, z - P.z);
      if (d < P.r + 7) {
        const pr = poolShapeR(P, x, z);
        const bankH = P.h0 + 0.1 + Math.max(0, d - pr) * 0.18;
        h = lerp(h, bankH, smoothstep(pr + 7, pr + 0.6, d));
        if (d < pr + 0.6) { const q = clamp(d / pr); h = lerp(P.h0 - 0.35 - 0.95 * (1 - q * q), h, smoothstep(pr - 0.8, pr + 0.6, d)); }
      }
    }
    return h;
  }

  function isWater(x, z) {
    for (const p of pools) if (Math.hypot(x - p.x, z - p.z) < poolShapeR(p, x, z) - 0.15) return true;
    if (isAmazon && riverPts) {
      if (Math.hypot(x, z) > edgeR(Math.atan2(z, x))) return false;
      return distToRiver(x, z).d < riverHW - 0.15;
    }
    return false;
  }
  // ───────────────────────────── fallen-log crossings over the river (ground animals walk across them)
  const bridges = [];
  if (isAmazon) {
    for (const i of [27, 61]) {
      const a = riverPts[i - 3], b = riverPts[i + 3], c = riverPts[i];
      const L = Math.hypot(b.x - a.x, b.z - a.z), nx = -(b.z - a.z) / L, nz = (b.x - a.x) / L;
      const half = riverHW + 1.7;
      bridges.push({ ax: c.x + nx * half, az: c.z + nz * half, bx: c.x - nx * half, bz: c.z - nz * half, r: 0.42, hw: 0.42 });
    }
  }
  // log top height at both ends (lazy: heightAt needs the whole height field)
  function bridgeTops(b) {
    if (b.ta === undefined) { b.ta = heightAt(b.ax, b.az) + 0.12; b.tb = heightAt(b.bx, b.bz) + 0.12; }
    return b;
  }
  function bridgeProj(b, x, z) {
    const dx = b.bx - b.ax, dz = b.bz - b.az, L2 = dx * dx + dz * dz;
    const t = ((x - b.ax) * dx + (z - b.az) * dz) / L2;
    const tc = t < 0 ? 0 : t > 1 ? 1 : t;
    return { t, d: Math.hypot(b.ax + dx * tc - x, b.az + dz * tc - z) };
  }
  // deck height of a log under (x, z), or null
  function bridgeAt(x, z) {
    for (const b of bridges) {
      const { t, d } = bridgeProj(b, x, z);
      if (t < 0 || t > 1 || d > b.hw) continue;
      bridgeTops(b);
      return lerp(b.ta, b.tb, t) - (d / b.hw) ** 2 * 0.12;
    }
    return null;
  }
  const nearBridge = (x, z, pad = 1) => bridges.some(b => { const { t, d } = bridgeProj(b, x, z); return t > -0.2 && t < 1.2 && d < b.r + pad; });
  // walking route for a non-swimmer from (x0, z0) to (x1, z1): [] if the straight line stays dry, else the log ends to walk over
  // margin: a walking animal drifts a little off the straight line while it turns, so a leg must keep clear of the bank
  function crossesWater(x0, z0, x1, z1, margin = 0) {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(L / 0.5);
    for (let k = 1; k < n; k++) {
      const u = k / n, x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * u;
      if (bridgeAt(x, z) !== null) continue;
      if (margin > 0 ? waterDist(x, z) < margin - 0.15 : isWater(x, z)) return true;
    }
    return false;
  }
  function walkRoute(x0, z0, x1, z1) {
    if (!bridges.length || !crossesWater(x0, z0, x1, z1)) return [];
    let best = null, bestL = 1e9;
    for (const b of bridges) for (const [p, q] of [[[b.ax, b.az], [b.bx, b.bz]], [[b.bx, b.bz], [b.ax, b.az]]]) {
      const L = Math.hypot(p[0] - x0, p[1] - z0) + Math.hypot(q[0] - p[0], q[1] - p[1]) + Math.hypot(x1 - q[0], z1 - q[1]);
      // both legs on dry land with a little clearance (relaxed at the very start / end, which may sit near the bank)
      const ok = !crossesWater(x0, z0, p[0], p[1], 0.4) && !crossesWater(q[0], q[1], x1, z1, 0.4)
        || !crossesWater(x0, z0, p[0], p[1]) && !crossesWater(q[0], q[1], x1, z1);
      if (ok && L < bestL) { bestL = L; best = [{ x: p[0], z: p[1] }, { x: q[0], z: q[1] }]; }
    }
    return best || [];   // no log helps (e.g. the far side of the spring pool): walk straight and slide along the bank
  }
  function waterDist(x, z) {
    let d = 1e9;
    for (const p of pools) d = Math.min(d, Math.hypot(x - p.x, z - p.z) - poolShapeR(p, x, z));
    if (isAmazon) d = Math.min(d, distToRiver(x, z).d - riverHW);
    return d;
  }

  // ───────────────────────────── rocks layout
  function addOutcrop(x, z, r) {
    rocks.push({ x, z, r, top: 0, boulders: [] });
  }
  if (isAmazon) {
    const sp = springPool;
    addOutcrop(sp.x - 3.8, sp.z - 2.6, 2.4);
    addOutcrop(sp.x + 3.6, sp.z - 2.2, 1.8);
    addOutcrop(-24, 14, 2.6);
    addOutcrop(22, -18, 2.0);
  } else {
    const cand = [[-17, -15, 3.8], [-25, 4, 2.8], [-8, 22, 2.6], [17, 22, 3.0], [26, -14, 3.2], [3, -24, 2.4], [-28, -22, 2.6], [17.5, -2.5, 1.8], [8.5, -10.5, 1.5]];
    for (const [x, z, r] of cand) addOutcrop(x, z, r);
  }

  // ───────────────────────────── ground (top surface)
  const SOIL = isAmazon
    ? { a: C('#3b2b1d'), b: C('#4c3624'), mud: C('#2c2219'), bed: C('#5a4a34'), rock: C('#5c5446') }
    : { a: C('#7a4a32'), b: C('#8c5a3a'), mud: C('#5e3a26'), bed: C('#8f826a'), rock: C('#9a6a4c') };   // terra rossa: earthy brown-red, not too saturated

  function rockInfluence(x, z) {
    let m = 0;
    for (const rk of rocks) { const d = Math.hypot(x - rk.x, z - rk.z); m = Math.max(m, 1 - smoothstep(rk.r * 0.8, rk.r * 2.2, d)); }
    return m;
  }

  function wetAt(x, z) { return WL === null ? 0 : smoothstep(isAmazon ? 4.5 : 2.5, 0.0, waterDist(x, z)); }
  function buildGround() {
    const NS = qual.seg, NR = qual.rings;
    const pos = [], col = [], cov = [], idx = [];
    const thetas = []; for (let j = 0; j < NS; j++) thetas.push(j / NS * TAU);
    const ers = thetas.map(edgeR);
    pos.push(0, heightAt(0, 0), 0);
    const c0 = soilColor(0, 0); col.push(c0.r, c0.g, c0.b); cov.push(coverAt(0, 0), noise(0.5, 0.5) * 0.5 + 0.5, wetAt(0, 0));
    for (let i = 1; i <= NR; i++) {
      const s = i / NR; const sr = Math.pow(s, 0.92);
      for (let j = 0; j < NS; j++) {
        const er = ers[j]; const r = sr * er;
        const x = Math.cos(thetas[j]) * r, z = Math.sin(thetas[j]) * r;
        pos.push(x, heightAt(x, z), z);
        const c = soilColor(x, z); col.push(c.r, c.g, c.b);
        cov.push(coverAt(x, z), noise(x * 0.07 + 40, z * 0.07) * 0.5 + 0.5, wetAt(x, z));
      }
    }
    for (let j = 0; j < NS; j++) idx.push(0, 1 + (j + 1) % NS, 1 + j);
    for (let i = 1; i < NR; i++) {
      const a0 = 1 + (i - 1) * NS, b0 = 1 + i * NS;
      for (let j = 0; j < NS; j++) {
        const j1 = (j + 1) % NS;
        idx.push(a0 + j, a0 + j1, b0 + j, a0 + j1, b0 + j1, b0 + j);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('aCover', new THREE.Float32BufferAttribute(cov, 3));
    g.setIndex(idx); g.computeVertexNormals();
    return { geom: g, ers, thetas, NS, NR };
  }

  function soilColor(x, z) {
    const n = noise(x * 0.09 + 7, z * 0.09 - 3) * 0.5 + 0.5;
    const c = tmpC.copy(SOIL.a).lerp(SOIL.b, n).clone();
    const wd = WL !== null ? waterDist(x, z) : 99;
    if (wd < 2.5) c.lerp(SOIL.mud, smoothstep(2.5, 0.2, wd) * 0.8);
    if (wd < 0.3) c.lerp(SOIL.bed, smoothstep(0.3, -1.0, wd));
    const rk = rockInfluence(x, z);
    if (rk > 0) c.lerp(SOIL.rock, rk * (isAmazon ? 0.25 : 0.55));
    return c;
  }
  function coverAt(x, z) {
    let c = 0.72 + 0.35 * noise(x * 0.05 - 9, z * 0.05 + 4);
    const wd = WL !== null ? waterDist(x, z) : 99;
    c *= smoothstep(-0.2, isAmazon ? 2.0 : 1.4, wd);
    c *= 1 - rockInfluence(x, z) * (isAmazon ? 0.3 : 0.75);
    const r = Math.hypot(x, z); c += smoothstep(R, R + 5, r) * 0.25;
    return clamp(c);
  }

  const G = {
    ...U,
    uGrass: { value: C(isAmazon ? '#3f6a24' : '#7da544') },
    uGrass2: { value: C(isAmazon ? '#6e4a2a' : '#8f9a48') },
    uCoverAmt: { value: isAmazon ? 0.85 : 0.85 },
    uSoilWet: { value: 0 },
    uDetail: { value: noiseTex },
    uSpots: { value: Array.from({ length: MAX_SHAFTS }, () => new THREE.Vector4(0, 0, 1, 0)) },
    uSpotCol: { value: C('#ffd9a0') },
    uFires: { value: Array.from({ length: MAX_FIRES }, () => new THREE.Vector4(0, 0, 0, 0)) },
    uGaps: { value: Array.from({ length: MAX_GAPS }, () => new THREE.Vector4(0, 0, 0, 0)) },
    uOverlay: { value: null }, uOverlayOn: { value: 0 }, uR: { value: R },
    uAmazon: { value: isAmazon ? 1 : 0 },
    // real surface textures baked in Blender: A = litter / grass, B = moss / limestone (albedo + normal map each)
    uGTexA: { value: null }, uGNrmA: { value: null }, uGTexB: { value: null }, uGNrmB: { value: null }, uGTexOn: { value: 0 },
    uGAvgA: { value: C('#808080') }, uGAvgB: { value: C('#808080') }, uGTile: { value: new THREE.Vector2(3, 4) }, uGNrmK: { value: 1 },
    // soft crown shadows painted into a top-down island texture (Blender-baked dappled sprite), see setTreeShadows()
    uTreeSh: { value: null }, uTreeShK: { value: 0 },
  };
  {
    const gt = GROUND_TEX && GROUND_TEX[biome];
    if (gt && gt.a && gt.an && gt.b && gt.bn && quality !== 'min') {
      const ld = new THREE.TextureLoader(); let n = 0;
      const done = () => { if (++n === 4) G.uGTexOn.value = 1; };
      const mk = (url, srgb) => { const t = ld.load(url, done); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = quality === 'high' ? 8 : 4; return track(t); };
      G.uGTexA.value = mk(gt.a, true); G.uGNrmA.value = mk(gt.an, false); G.uGTexB.value = mk(gt.b, true); G.uGNrmB.value = mk(gt.bn, false);
      G.uGAvgA.value.setRGB(...gt.avgA); G.uGAvgB.value.setRGB(...gt.avgB); G.uGTile.value.set(gt.tile[0], gt.tile[1]); G.uGNrmK.value = gt.nk ?? 1;
    }
  }
  const groundMat = patchMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }), 'ground-' + biome, G, {
    vertexPre: 'attribute vec3 aCover; varying vec3 vCover;',
    vertexBegin: 'vCover = aCover;',
    fragPre: /* glsl */`
      varying vec3 vCover; uniform sampler2D uDetail; uniform vec3 uGrass, uGrass2, uSpotCol; uniform float uCoverAmt, uSoilWet, uOverlayOn, uR, uAmazon;
      uniform vec4 uSpots[${MAX_SHAFTS}]; uniform vec4 uFires[${MAX_FIRES}]; uniform vec4 uGaps[${MAX_GAPS}]; uniform sampler2D uOverlay;
      uniform sampler2D uGTexA, uGNrmA, uGTexB, uGNrmB; uniform float uGTexOn, uGNrmK; uniform vec3 uGAvgA, uGAvgB; uniform vec2 uGTile;
      uniform sampler2D uTreeSh; uniform float uTreeShK;
      float gDet; vec4 gOv; vec3 gNm;
      // anti-tiling: blend the texture with a rotated, larger copy of itself (normals rotated back)
      const mat2 GROT = mat2(0.8, -0.6, 0.6, 0.8);
      vec4 gSamp(sampler2D t, vec2 p){ return mix(texture2D(t, p), texture2D(t, GROT * p * 0.41 + 0.31), 0.38); }
      vec3 gNrm(sampler2D t, vec2 p){
        vec3 a = texture2D(t, p).xyz * 2.0 - 1.0;
        vec3 b = texture2D(t, GROT * p * 0.41 + 0.31).xyz * 2.0 - 1.0; b.xy = b.xy * GROT;
        return normalize(mix(a, b, 0.38));
      }`,
    fragColor: /* glsl */`
      vec4 dn = texture2D(uDetail, vWPos.xz * 0.13);
      vec4 dm = texture2D(uDetail, vWPos.xz * 0.021 + 0.37);
      gDet = dn.r;
      float cov = vCover.x + (dm.g - 0.5) * 0.9 + (dn.g - 0.5) * 0.35;
      cov = smoothstep(0.22, 0.6, cov) * uCoverAmt;
      float gap = 0.0;
      for (int i = 0; i < ${MAX_GAPS}; i++){ vec4 g = uGaps[i]; if (g.w <= 0.0) continue; gap = max(gap, g.w * (1.0 - smoothstep(g.z * 0.6, g.z * 1.2, length(vWPos.xz - g.xy)))); }
      vec4 df = texture2D(uDetail, vWPos.xz * 0.55 + 0.21);   // fine speckle (litter / pebbles / grass blades)
      vec4 tA = vec4(uGAvgA, 1.0), tB = vec4(uGAvgB, 1.0); vec3 nA = vec3(0.0, 0.0, 1.0), nB = vec3(0.0, 0.0, 1.0);
      if (uGTexOn > 0.5) {
        vec2 pa = vWPos.xz / uGTile.x, pb = vWPos.xz / uGTile.y;
        tA = gSamp(uGTexA, pa); tB = gSamp(uGTexB, pb); nA = gNrm(uGNrmA, pa); nB = gNrm(uGNrmB, pb);
      }
      vec3 dA = tA.rgb / max(uGAvgA, vec3(0.02)), dB = tB.rgb / max(uGAvgB, vec3(0.02));   // relative detail around the palette colour
      vec3 soil = diffuseColor.rgb * (0.78 + 0.42 * dn.r) * mix(1.0, 0.72, uSoilWet);
      soil *= 0.86 + 0.28 * df.r;
      float wetBank = vCover.z;
      vec3 gcol;
      if (uAmazon > 0.5) {
        // leaf litter (ochre/brown, speckled) with deep humid moss patches
        float moss = smoothstep(0.48, 0.62, dm.b + vCover.y * 0.25 + gap * 0.3 + wetBank * 0.25);
        vec3 litter = mix(uGrass2, uGrass2 * vec3(1.3, 0.92, 0.62), smoothstep(0.35, 0.7, df.g)) * (0.7 + 0.55 * dn.a);
        litter = mix(litter, litter * vec3(0.55, 0.5, 0.42), smoothstep(0.62, 0.8, df.b));   // dark wet leaves
        vec3 mossC = mix(uGrass * vec3(0.72, 0.9, 0.62), uGrass * vec3(1.1, 1.15, 0.8), dn.g) * (0.8 + 0.3 * df.a);
        if (uGTexOn > 0.5) {
          litter = mix(litter, uGrass2 * dA * (0.8 + 0.35 * dn.a), 0.85);
          mossC = mix(mossC, uGrass * vec3(0.9, 1.0, 0.75) * dB * (0.85 + 0.25 * df.a), 0.8);
          soil *= mix(vec3(1.0), dA, 0.35);
        }
        gcol = mix(litter, mossC, moss);
        gNm = normalize(mix(mix(vec3(0.0, 0.0, 1.0), nA, 0.5), mix(nA, nB, moss), cov));
        // large soft under-canopy darkness blotches
        gcol *= mix(1.0, 0.72, smoothstep(0.45, 0.75, dm.a) * (1.0 - gap));
        soil = mix(soil, soil * vec3(0.55, 0.5, 0.45), wetBank);   // dark wet mud by the river
      } else {
        gcol = mix(uGrass, uGrass2, smoothstep(0.35, 0.75, dm.b + vCover.y * 0.25)) * (0.82 + 0.36 * dn.g);
        gcol *= 0.88 + 0.24 * df.g;   // blade-scale variation
        gcol = mix(gcol, gcol * vec3(1.05, 1.12, 0.85), gap * 0.6);
        gcol = mix(gcol, gcol * vec3(0.8, 1.02, 0.8), wetBank * 0.7);   // lusher by the spring
        if (uGTexOn > 0.5) { gcol *= mix(vec3(1.0), dA, 0.75); soil *= mix(vec3(1.0), dA, 0.3); }
        gNm = normalize(mix(mix(vec3(0.0, 0.0, 1.0), nA, 0.45), nA, cov));
      }
      vec3 col = mix(soil, gcol, cov);
      if (uAmazon < 0.5) {
        // pale limestone bedrock breaking through the terra rossa, with dark cracks
        float bed = smoothstep(0.7, 0.78, dm.a + dn.b * 0.15 - cov * 0.3 + (1.0 - vCover.x) * 0.2);
        vec3 lime = vec3(0.62, 0.56, 0.45) * (0.8 + 0.3 * df.r);
        if (uGTexOn > 0.5) lime = vec3(0.62, 0.56, 0.45) * dB * (0.9 + 0.2 * df.r);
        lime *= 1.0 - 0.45 * smoothstep(0.03, 0.0, abs(df.b - 0.5)) ;
        col = mix(col, lime, bed * (1.0 - wetBank));
        gNm = normalize(mix(gNm, nB, bed * (1.0 - wetBank)));
      }
      col *= 1.0 + gap * 0.12;
      if (uTreeShK > 0.0) {
        float tsh = texture2D(uTreeSh, clamp((vWPos.xz + uR) / (2.0 * uR), 0.0, 1.0)).a;
        col *= 1.0 - tsh * uTreeShK * (1.0 - gap * 0.5);
      }
      col = vitalGrade(col);
      col *= 1.0 - 0.3 * uWet;
      float sc = scorchAt(vWPos.xz + (dn.rg - 0.5) * 2.0);
      col = mix(col, vec3(0.055, 0.045, 0.04) + 0.05 * dn.r, sc * 0.9);
      gOv = vec4(0.0);
      if (uOverlayOn > 0.5) {
        vec2 ouv = (vWPos.xz + uR) / (2.0 * uR);
        float inside = 1.0 - smoothstep(uR - 1.5, uR + 1.0, length(vWPos.xz));
        vec4 o = texture2D(uOverlay, clamp(ouv, 0.0, 1.0));
        gOv = vec4(o.rgb, o.a * inside * uOverlayOn);
        col = mix(col, o.rgb * 0.9, gOv.a * 0.6);
      }
      diffuseColor.rgb = col;`,
    fragRough: 'roughnessFactor = mix(roughnessFactor, 0.32, max(uWet * 0.85, vCover.z * uAmazon * 0.7));',
    // tilt the shading normal by the baked normal map (ground is near-horizontal: world X/Z are the tangent axes)
    fragNormal: /* glsl */`
      if (uGTexOn > 0.5) {
        vec3 gT = (viewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz, gB = (viewMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz;
        gT = normalize(gT - normal * dot(normal, gT)); gB = normalize(gB - normal * dot(normal, gB));
        normal = normalize(gT * gNm.x * uGNrmK + gB * gNm.y * uGNrmK + normal * gNm.z);
      }`,
    fragEmissive: /* glsl */`
      float spot = 0.0;
      for (int i = 0; i < ${MAX_SHAFTS}; i++){ vec4 s = uSpots[i]; if (s.w <= 0.0) continue; float d = length(vWPos.xz - s.xy) + (gDet - 0.5) * s.z * 0.5; spot += s.w * (1.0 - smoothstep(s.z * 0.3, s.z, d)); }
      totalEmissiveRadiance += diffuseColor.rgb * uSpotCol * min(spot, 1.5);
      for (int i = 0; i < ${MAX_FIRES}; i++){ vec4 f = uFires[i]; if (f.w <= 0.0) continue; float d = length(vWPos.xz - f.xy); float gl = f.w * (1.0 - smoothstep(0.0, f.z * 2.6 + 2.0, d)); float core = f.w * (1.0 - smoothstep(f.z * 0.3, f.z * 0.9, d + (gDet - 0.5) * 1.5));
        totalEmissiveRadiance += vec3(1.0, 0.38, 0.08) * (gl * gl * 0.9) + vec3(1.0, 0.3, 0.05) * core * 1.2 * step(0.55, gDet + 0.2 * sin(uTime * 7.0 + vWPos.x)); }
      totalEmissiveRadiance += gOv.rgb * gOv.a * 0.22;`,
  });
  const ground = buildGround();
  const groundMesh = new THREE.Mesh(ground.geom, groundMat);
  groundMat.userData.G = G;   // debug/inspection handle
  groundMesh.receiveShadow = true; groundMesh.castShadow = true; groundMesh.name = 'ground';
  root.add(groundMesh); track(ground.geom); track(groundMat);

  // ───────────────────────────── island cross-section (skirt)
  function strataColor(depth, theta, out) {
    const n = noiseB(Math.cos(theta) * 3 + depth * 0.05, Math.sin(theta) * 3) * 0.5 + 0.5;
    const d = depth + (noise(theta * 4.0, depth * 0.3) * 1.3);
    if (isAmazon) {
      if (d < 0.8) out.set('#2a1e14');
      else if (d < 2.2) out.set('#4d3420');
      else if (d < 4.6) out.set('#9a4626');
      else if (d < 5.4) out.set('#c8833e');
      else if (d < 7.8) out.set('#a3542c');
      else if (d < 8.6) out.set('#d29a52');
      else if (d < 11.5) out.set('#7a4a30');
      else if (d < 12.2) out.set('#b9875a');
      else { const b = Math.floor((d - 12.2) / 2.4) % 3; out.set(b === 0 ? '#6a5848' : b === 1 ? '#7d6650' : '#5a4c40'); }
    } else {
      if (d < 0.7) out.set('#6a3a24');
      else if (d < 2.2) out.set('#84462c');
      else if (d < 2.6) out.set('#6e3820');
      else {
        const band = Math.floor((d - 2.6) / 1.35);
        const pal = ['#cdbf9f', '#b09c78', '#d8cbb0', '#a08a68', '#c4b190', '#8f7c5e', '#bba783'];
        out.set(pal[band % pal.length]);
        const fr = ((d - 2.6) / 1.35) % 1;
        if (fr < 0.1) out.multiplyScalar(0.62);
        if (Math.floor((d - 2.6) / 4.1) % 3 === 1) out.lerp(tmpC2.set('#c08a5a'), 0.25);
      }
    }
    out.multiplyScalar(0.85 + 0.3 * n);
    return out;
  }

  function skirtProfile(ff, th) {
    const cliff = 0.2 + 0.08 * noiseB(Math.cos(th) * 2.3, Math.sin(th) * 2.3);
    if (ff < cliff) return 1 - 0.06 * ff / cliff;
    const u = (ff - cliff) / (1 - cliff);
    const lobes = 1 + 0.18 * noise(Math.cos(th) * 3 + 2, Math.sin(th) * 3 - 1);
    return 0.94 * Math.pow(Math.max(0, 1 - Math.pow(u, 1.25 * lobes)), 0.75);
  }
  function buildSkirt() {
    const NS = ground.NS, NK = 26;
    const pos = [], col = [], idx = [], dep = [];
    const topY = [];
    const depthTot = [];
    for (let j = 0; j < NS; j++) {
      const th = ground.thetas[j], er = ground.ers[j];
      const x = Math.cos(th) * er, z = Math.sin(th) * er;
      topY.push(heightAt(x, z));
      depthTot.push(27 + 7 * (noiseB(Math.cos(th) * 2 + 1, Math.sin(th) * 2) * 0.5 + 0.5));
    }
    for (let k = 0; k <= NK; k++) {
      const f = k / NK;
      for (let j = 0; j < NS; j++) {
        const th = ground.thetas[j], er = ground.ers[j];
        let y, r;
        if (k === 0) { y = topY[j]; r = er; }
        else if (k === 1) { y = topY[j] - 0.45; r = er + 0.25; }
        else {
          const ff = (k - 1) / (NK - 1);
          const depth = Math.pow(ff, 1.15) * depthTot[j];
          y = topY[j] - 0.45 - depth;
          const prof = skirtProfile(ff, th);
          const jag = noise(th * 7 + 1, ff * 9) * 1.3 + noiseB(th * 19, ff * 20) * 0.5;
          r = er * prof + jag * (0.4 + 2.0 * ff * (1 - ff)) + (k < 5 ? 0.3 : 0);
          y += noiseB(th * 11 + 3, ff * 13) * 0.6 * ff;
          if (k === NK) { r = 0; y = -36 - 2 * noise(1, 1); }
        }
        pos.push(Math.cos(th) * Math.max(r, 0), y, Math.sin(th) * Math.max(r, 0));
        const depth = topY[j] - y;
        dep.push(depth);
        const ao = lerp(1.0, 0.7, smoothstep(4, 32, depth));
        col.push(ao, ao, ao);
      }
    }
    for (let k = 0; k < NK; k++) {
      const a0 = k * NS, b0 = (k + 1) * NS;
      for (let j = 0; j < NS; j++) {
        const j1 = (j + 1) % NS;
        idx.push(a0 + j, a0 + j1, b0 + j, a0 + j1, b0 + j1, b0 + j);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('aDepth', new THREE.Float32BufferAttribute(dep, 1));
    g.setIndex(idx);
    const ng = g.toNonIndexed(); ng.computeVertexNormals(); g.dispose();
    return { geom: ng, topY, depthTot };
  }
  const skirt = buildSkirt();
  // strata gradient texture: depth 0..48 m → colour
  const strataTex = (() => {
    const n = 512; const d = new Uint8Array(n * 4);
    for (let i = 0; i < n; i++) { strataColor(i / n * 48, 0, tmpC); tmpC.convertLinearToSRGB(); d.set([tmpC.r * 255, tmpC.g * 255, tmpC.b * 255, 255], i * 4); }
    const t = new THREE.DataTexture(d, n, 1); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; return track(t);
  })();
  const rootMat = track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, flatShading: true }));
  const skirtMat = track(patchMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, flatShading: true }), 'skirt-' + biome,
    { ...U, uStrata: { value: strataTex }, uAmazon: { value: isAmazon ? 1 : 0 } }, {
      vertexPre: 'attribute float aDepth; varying float vDepth;',
      vertexBegin: 'vDepth = aDepth;',
      fragPre: 'uniform sampler2D uStrata; uniform sampler2D uNoise; uniform float uAmazon; varying float vDepth;',
      fragColor: /* glsl */`
        float ang = atan(vWPos.z, vWPos.x);
        vec4 nz = texture2D(uNoise, vec2(ang * 1.3, vWPos.y * 0.035));
        vec4 nz2 = texture2D(uNoise, vec2(ang * 5.0, vWPos.y * 0.12));
        float dd = vDepth + (nz.r - 0.5) * 1.4 + (nz2.g - 0.5) * 0.35;
        vec3 sc = texture2D(uStrata, vec2(clamp(dd / 48.0, 0.0, 1.0), 0.5)).rgb;
        sc *= 0.88 + 0.24 * nz2.b;
        if (uAmazon > 0.5) { float moss = smoothstep(0.45, 0.6, nz2.a + 0.35 * (1.0 - smoothstep(0.0, 5.0, vDepth))) * (1.0 - smoothstep(2.0, 7.0, vDepth)); sc = mix(sc, vec3(0.13, 0.2, 0.06) * (0.8 + 0.5 * nz.g), moss * 0.85); }
        diffuseColor.rgb *= sc;`,
    }));
  const skirtMesh = new THREE.Mesh(track(skirt.geom), skirtMat);
  skirtMesh.castShadow = true; skirtMesh.receiveShadow = false; skirtMesh.name = 'island-edge';
  root.add(skirtMesh);

  // skirt surface point helper (approx) for roots/rocks
  function skirtPoint(theta, depth) {
    const j = Math.round(theta / TAU * ground.NS) % ground.NS;
    const er = ground.ers[(j + ground.NS) % ground.NS];
    const ff = clamp(depth / skirt.depthTot[(j + ground.NS) % ground.NS]);
    const prof = skirtProfile(ff, theta);
    const r = er * prof;
    return V3(Math.cos(theta) * r, skirt.topY[(j + ground.NS) % ground.NS] - 0.45 - depth, Math.sin(theta) * r);
  }

  // ───────────────────────────── rocks (merged)
  function rockGeom(r, rr, flat, limestone) {
    const g = new THREE.IcosahedronGeometry(1, 1);
    const p = g.attributes.position; const n = p.count;
    const k1 = rr() * 10, k2 = rr() * 10;
    for (let i = 0; i < n; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const d = 1 + 0.22 * noiseB(x * 1.7 + k1, z * 1.7 + y * 1.3 + k2);
      x *= d; z *= d; y *= d;
      if (limestone) { y = Math.round(y * 3.2) / 3.2 * 0.8 + y * 0.2; }  // stepped strata look
      p.setXYZ(i, x * r, y * r * flat, z * r);
    }
    g.computeVertexNormals();
    const cols = new Float32Array(n * 3);
    const nr = g.attributes.normal;
    for (let i = 0; i < n; i++) {
      const ny = nr.getY(i);
      if (limestone) {
        tmpC.set('#d9d0bb').lerp(C('#b3a68c'), rr() * 0.6);
        if (ny < -0.2) tmpC.multiplyScalar(0.7);
        const lich = noiseB(p.getX(i) * 1.3 + k1, p.getZ(i) * 1.3);
        if (lich > 0.45) tmpC.lerp(C('#c9a24a'), 0.45);
        else if (lich < -0.5) tmpC.lerp(C('#7d8466'), 0.5);
      } else {
        tmpC.set('#6b675c').lerp(C('#4f4c44'), rr());
        if (ny > 0.25) tmpC.lerp(C('#4a6e24'), smoothstep(0.25, 0.7, ny) * 0.9);
      }
      cols[i * 3] = tmpC.r; cols[i * 3 + 1] = tmpC.g; cols[i * 3 + 2] = tmpC.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    return g;
  }
  {
    const parts = [];
    const rr = makeRng(seed * 101 + 7);
    for (const rk of rocks) {
      const nb = isAmazon ? 2 + Math.floor(rr() * 2) : 3 + Math.floor(rr() * 4);
      let top = -99;
      for (let b = 0; b < nb; b++) {
        const a = rr() * TAU, dd = b === 0 ? 0 : rk.r * (0.35 + 0.45 * rr());
        const bx = rk.x + Math.cos(a) * dd, bz = rk.z + Math.sin(a) * dd;
        const br = (b === 0 ? rk.r * 0.75 : rk.r * (0.35 + 0.3 * rr()));
        const flat = isAmazon ? 0.7 + rr() * 0.2 : 0.55 + rr() * 0.3;
        const g = rockGeom(br, rr, flat, !isAmazon);
        const m = new THREE.Matrix4().compose(V3(bx, heightAt(bx, bz) - br * flat * 0.3, bz),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(rr() * 0.3 - 0.15, rr() * TAU, rr() * 0.3 - 0.15)), V3(1, 1, 1));
        g.applyMatrix4(m);
        parts.push(g);
        top = Math.max(top, heightAt(bx, bz) - br * flat * 0.3 + br * flat * 1.05);
        rk.boulders.push({ x: bx, z: bz, r: br });
      }
      rk.top = top;
    }
    // edge rocks protruding from the skirt
    const nEdge = isAmazon ? 26 : 40;
    for (let i = 0; i < nEdge; i++) {
      const th = rr() * TAU, depth = 0.8 + rr() * (isAmazon ? 6 : 8);
      const p = skirtPoint(th, depth);
      const br = 0.6 + rr() * (isAmazon ? 1.4 : 1.1);
      const g = rockGeom(br, rr, isAmazon ? 0.8 : 0.45 + rr() * 0.2, !isAmazon);
      g.applyMatrix4(new THREE.Matrix4().compose(p.addScaledVector(V3(Math.cos(th), 0, Math.sin(th)), br * 0.1), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rr() * TAU, 0)), V3(1, 1, 1)));
      parts.push(g);
    }
    // rim boulders on the lip
    const nRim = isAmazon ? 10 : 22;
    for (let i = 0; i < nRim; i++) {
      const th = rr() * TAU; const er = edgeR(th) - 1.2 - rr() * 3;
      const x = Math.cos(th) * er, z = Math.sin(th) * er;
      if (WL !== null && waterDist(x, z) < 3) continue;
      const br = 0.6 + rr() * 1.4;
      const g = rockGeom(br, rr, 0.6, !isAmazon);
      g.applyMatrix4(new THREE.Matrix4().compose(V3(x, heightAt(x, z) - br * 0.2, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rr() * TAU, 0)), V3(1, 1, 1)));
      parts.push(g);
    }
    const merged = mergeGeometries(parts); parts.forEach(p => p.dispose());
    const rockMat = track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0, flatShading: true }));
    var rockMesh = new THREE.Mesh(track(merged), rockMat);
    rockMesh.castShadow = rockMesh.receiveShadow = true; rockMesh.name = 'rocks';
    root.add(rockMesh);
  }

  // ───────────────────────────── roots & hanging vines on the edge
  {
    const rr = makeRng(seed * 211 + 3);
    const parts = [];
    const nRoots = isAmazon ? 46 : 22;
    for (let i = 0; i < nRoots; i++) {
      const th = rr() * TAU, depth = 0.3 + rr() * (isAmazon ? 4 : 2.5);
      const p0 = skirtPoint(th, depth);
      const out = V3(Math.cos(th), 0, Math.sin(th));
      const len = 1.5 + rr() * (isAmazon ? 5 : 2.5);
      const p1 = p0.clone().addScaledVector(out, len * 0.45).add(V3(0, -len * 0.2, 0));
      const p2 = p0.clone().addScaledVector(out, len * 0.3).add(V3((rr() - 0.5) * 1.5, -len, (rr() - 0.5) * 1.5));
      p0.addScaledVector(out, -0.6);
      const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
      const rad = (isAmazon ? 0.1 : 0.06) + rr() * 0.12;
      const tg = new THREE.TubeGeometry(curve, 8, rad, 5, false);
      // taper
      const pa = tg.attributes.position; const n = pa.count;
      for (let v = 0; v < n; v++) {
        const seg = Math.floor(v / 6) / 8; const c = curve.getPoint(Math.min(seg, 1));
        const x = pa.getX(v), y = pa.getY(v), z = pa.getZ(v);
        const k = lerp(1, 0.15, seg);
        pa.setXYZ(v, c.x + (x - c.x) * k, c.y + (y - c.y) * k, c.z + (z - c.z) * k);
      }
      tg.computeVertexNormals();
      const cc = tmpC.set(isAmazon ? '#4b3424' : '#55392a').multiplyScalar(0.8 + rr() * 0.4);
      const ca = new Float32Array(n * 3); for (let v = 0; v < n; v++) { ca[v * 3] = cc.r; ca[v * 3 + 1] = cc.g; ca[v * 3 + 2] = cc.b; }
      tg.setAttribute('color', new THREE.BufferAttribute(ca, 3));
      tg.deleteAttribute('uv');
      parts.push(tg);
    }
    const merged = mergeGeometries(parts); parts.forEach(p => p.dispose());
    const m = new THREE.Mesh(track(merged), rootMat);
    m.castShadow = true; m.name = 'roots';
    root.add(m);
  }

  // hanging vines / moss beards (own geometry with sway attribute)
  let vinesMesh = null;
  {
    const rr = makeRng(seed * 307 + 1);
    const nV = isAmazon ? 150 : 34;
    const pos = [], col = [], hang = [], idx = [];
    for (let i = 0; i < nV; i++) {
      const th = rr() * TAU;
      const j = Math.round(th / TAU * ground.NS) % ground.NS;
      const er = ground.ers[j];
      const y0 = skirt.topY[j] - 0.1 - rr() * 0.6;
      const r0 = er + 0.15;
      const len = isAmazon ? 1.5 + rr() * rr() * 11 : 0.6 + rr() * 1.4;
      const w = isAmazon ? 0.18 + rr() * 0.4 : 0.25 + rr() * 0.3;
      const segs = 7;
      const out = V3(Math.cos(th), 0, Math.sin(th));
      const side = V3(-Math.sin(th), 0, Math.cos(th));
      const base = pos.length / 3;
      const cA = C(isAmazon ? (rr() < 0.3 ? '#6f8a3a' : '#3f5f22') : '#9a8a5a');
      const cB = C(isAmazon ? (rr() < 0.5 ? '#9ab04e' : '#56782c') : '#c2ae78');
      const bend = (rr() - 0.5) * 0.6;
      for (let s = 0; s <= segs; s++) {
        const f = s / segs;
        const y = y0 - f * len;
        const ww = w * (1 - f * 0.7) * (isAmazon && rr() < 0.2 ? 1.6 : 1);
        const curlOut = Math.sin(f * 2.5) * 0.4 + 0.1;
        const c = V3(Math.cos(th) * (r0 + curlOut) + side.x * bend * f, y, Math.sin(th) * (r0 + curlOut) + side.z * bend * f);
        // skirt goes inward with depth – vine hangs straight so it naturally separates
        for (const sgn of [-1, 1]) {
          const p = c.clone().addScaledVector(side, sgn * ww * 0.5).addScaledVector(out, (rr() - 0.5) * 0.1);
          pos.push(p.x, p.y, p.z);
          tmpC.copy(cA).lerp(cB, f).multiplyScalar(0.85 + rr() * 0.3);
          col.push(tmpC.r, tmpC.g, tmpC.b); hang.push(f * len);
        }
      }
      for (let s = 0; s < segs; s++) { const a = base + s * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('aHang', new THREE.Float32BufferAttribute(hang, 1));
    g.setIndex(idx); g.computeVertexNormals();
    const mat = track(patchMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }), 'vines', U, {
      vertexPre: 'attribute float aHang;',
      vertexBegin: 'float _ph = position.x * 0.2 + position.z * 0.17; transformed.x += sin(uTime * 0.9 + _ph) * aHang * (0.03 + 0.06 * uWind); transformed.z += cos(uTime * 0.7 + _ph) * aHang * (0.03 + 0.06 * uWind);',
      fragColor: 'diffuseColor.rgb = vitalGrade(diffuseColor.rgb);',
    }));
    vinesMesh = new THREE.Mesh(track(g), mat); vinesMesh.castShadow = true; vinesMesh.name = 'vines';
    root.add(vinesMesh);
  }

  // ───────────────────────────── sky dome
  const skyU = {
    uZen: { value: C('#3f7fc6') }, uHor: { value: C('#cde') }, uGnd: { value: C('#999') },
    uSunDir: U.uSunDir, uMoonDir: { value: V3(0, -1, 0) }, uSunCol: { value: C('#fff') }, uSunAmt: { value: 1 },
    uNight: { value: 0 }, uTime: U.uTime, uFlash: { value: 0 }, uNoise: U.uNoise, uCloud: { value: 0.3 }, uCloudCol: { value: C('#fff') },
    // distant landscape painted in Blender (equirectangular horizon strip + its haze/mist factor)
    uPano: { value: null }, uPanoMist: { value: null }, uPanoOn: { value: 0 }, uPanoLat: { value: new THREE.Vector2(-0.17, 0.12) },
    uPanoTint: { value: C('#fff') }, uPanoHazeSrc: { value: C('#fff') }, uPanoHazeAdd: { value: 0 }, uPanoRot: { value: 0 },
  };
  // the panorama loads asynchronously from embedded images; the sky simply shows without it until ready
  const pano = PANO && PANO[isAmazon ? 'amazon' : 'grove'];
  const farHills = pano ? 0 : 1;   // with the painted panorama the old low-poly horizon hills are not needed
  if (pano && pano.img && pano.mist) {
    const ld = new THREE.TextureLoader();
    const cfg = (t, srgb) => { t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
      t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 1; return track(t); };
    let n = 0; const done = () => { if (++n === 2) skyU.uPanoOn.value = 1; };
    skyU.uPano.value = cfg(ld.load(pano.img, done), true);
    skyU.uPanoMist.value = cfg(ld.load(pano.mist, done), false);
    skyU.uPanoLat.value.set(pano.lat[0] * Math.PI / 180, pano.lat[1] * Math.PI / 180);
    skyU.uPanoHazeSrc.value.setRGB(pano.haze[0], pano.haze[1], pano.haze[2]);
    skyU.uPanoRot.value = pano.rot || 0;
  }
  const skyMat = track(new THREE.ShaderMaterial({
    uniforms: skyU, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    vertexShader: /* glsl */`varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: /* glsl */`
      uniform vec3 uZen, uHor, uGnd, uSunDir, uMoonDir, uSunCol, uCloudCol; uniform float uSunAmt, uNight, uTime, uFlash, uCloud; uniform sampler2D uNoise;
      uniform sampler2D uPano, uPanoMist; uniform float uPanoOn, uPanoHazeAdd, uPanoRot; uniform vec2 uPanoLat; uniform vec3 uPanoTint, uPanoHazeSrc;
      varying vec3 vDir;
      float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      void main(){
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(uHor, uZen, pow(clamp(h, 0.0, 1.0), 0.55));
        col = mix(col, uGnd, smoothstep(0.0, -0.25, h));
        float s = max(dot(d, uSunDir), 0.0);
        // warm scattering around the sun, stronger near the horizon
        float horiz = pow(1.0 - abs(h), 5.0);
        col += uSunCol * (pow(s, 6.0) * 0.18 + pow(s, 48.0) * 0.45) * uSunAmt;
        col += uSunCol * pow(s, 2.5) * horiz * 0.35 * uSunAmt;
        // sun disc (HDR → bloom)
        float disc = smoothstep(0.99955, 0.99975, s);
        col += uSunCol * disc * 18.0 * smoothstep(-0.03, 0.02, uSunDir.y);
        // clouds (wispy, high)
        if (h > 0.0) {
          vec2 cuv = d.xz / (h + 0.15) * 0.18 + vec2(uTime * 0.0015, uTime * 0.0006);
          float n = texture2D(uNoise, cuv).g * 0.65 + texture2D(uNoise, cuv * 2.7 + 0.3).r * 0.35;
          float c = smoothstep(0.52 - uCloud * 0.25, 0.85, n) * smoothstep(0.0, 0.12, h) * (0.35 + 0.65 * uCloud);
          vec3 cc = uCloudCol * (0.85 + 0.3 * n) + uSunCol * pow(s, 8.0) * 0.6 * uSunAmt;
          col = mix(col, cc, c * 0.85);
        }
        // stars
        if (uNight > 0.01 && h > 0.0) {
          vec3 p = d * 220.0; vec3 cell = floor(p); float r = hash(cell);
          if (r > 0.965) {
            vec3 sp = cell + 0.5 + (vec3(hash(cell + 1.3), hash(cell + 2.7), hash(cell + 5.1)) - 0.5) * 0.6;
            float dd = length(p - sp);
            float tw = 0.65 + 0.35 * sin(uTime * (1.5 + r * 4.0) + r * 50.0);
            float b = smoothstep(0.32, 0.0, dd) * (r - 0.965) / 0.035 * tw;
            col += vec3(0.85, 0.9, 1.0) * b * 2.2 * uNight * smoothstep(0.0, 0.25, h);
          }
          // faint milky band
          float band = exp(-pow(dot(d, normalize(vec3(0.3, 0.2, 1.0))) * 4.0, 2.0));
          col += vec3(0.08, 0.1, 0.16) * band * texture2D(uNoise, d.xy * 1.5 + d.z).g * uNight * smoothstep(0.0, 0.3, h);
        }
        // moon
        float m = dot(d, uMoonDir);
        if (uNight > 0.01) {
          float md = smoothstep(0.99935, 0.99955, m);
          float crater = texture2D(uNoise, (d.xy - uMoonDir.xy) * 30.0).g;
          col += vec3(0.95, 0.96, 1.0) * md * (2.6 + crater * 1.2) * uNight;
          col += vec3(0.35, 0.45, 0.7) * pow(max(m, 0.0), 300.0) * 0.6 * uNight;
          col += vec3(0.2, 0.28, 0.5) * pow(max(m, 0.0), 12.0) * 0.12 * uNight;
        }
        // distant landscape: re-haze the Blender render toward the live horizon colour (time of day, rain)
        if (uPanoOn > 0.5) {
          float lat = asin(clamp(h, -1.0, 1.0));
          float pv = (lat - uPanoLat.x) / (uPanoLat.y - uPanoLat.x);
          if (pv > 0.0 && pv < 1.0) {
            vec2 puv = vec2(fract(atan(d.z, d.x) / 6.2831853 + 0.5 + uPanoRot), pv);
            vec4 pc = texture2D(uPano, puv);
            float m = texture2D(uPanoMist, puv).r * 0.85;
            vec3 land = max(pc.rgb - uPanoHazeSrc * m, 0.0) * uPanoTint + uHor * m;
            land = mix(land, uHor, uPanoHazeAdd);
            col = mix(col, land, pc.a * smoothstep(0.0, 0.1, pv));
          }
        }
        col += vec3(0.75, 0.8, 1.0) * uFlash;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  const skyGeo = track(new THREE.SphereGeometry(450, 48, 24));
  const sky = new THREE.Mesh(skyGeo, skyMat); sky.frustumCulled = false; sky.renderOrder = -1000; sky.name = 'sky';
  root.add(sky);

  // ───────────────────────────── distant land (silhouettes below / around)
  let farMesh, farMat, farCrowns = null;
  const farRs = [];
  const fnRing = makeNoise2D(seed * 43 + 5);
  // amazon: a wall of jungle rising out of the mist around the island
  const jungleRing = (x, z, r) => 40 * bump(r, 62, 105, 170, 270) * (0.7 + 0.45 * fnRing(x * 0.02, z * 0.02));
  function makeHazeMat(key, opts) {
    const m = track(new THREE.MeshLambertMaterial(opts));
    m.userData.haze = { value: 0.35 };
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uHaze = m.userData.haze;
      sh.fragmentShader = sh.fragmentShader.replace('#include <fog_pars_fragment>', '#include <fog_pars_fragment>\nuniform float uHaze;')
        .replace('#include <fog_fragment>', `#ifdef USE_FOG
          float fogF = clamp(smoothstep(fogNear * 0.6, fogFar * 1.1, vFogDepth) + uHaze, 0.0, 1.0);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogF);
        #endif`);
    };
    m.customProgramCacheKey = () => 'env-haze-' + key;
    return m;
  }
  {
    const NS = 200, NRr = 46;
    const r0 = 4, r1 = 520;
    const pos = [], col = [], idx = [];
    const fn = makeNoise2D(seed * 41 + 2);
    // distant river on amazon plain
    const farRiver = (x, z) => { // signed distance to a meandering line
      const zz = z - (-30 + 70 * Math.sin(x * 0.006 + 1.2) + 18 * Math.sin(x * 0.019));
      return Math.abs(zz + 140);
    };
    for (let i = 0; i <= NRr; i++) {
      const f = i / NRr; const r = r0 + (r1 - r0) * Math.pow(f, 1.6);
      farRs.push(r);
      for (let j = 0; j < NS; j++) {
        const th = j / NS * TAU; const x = Math.cos(th) * r, z = Math.sin(th) * r;
        let y, c = tmpC;
        if (isAmazon) {
          const crowns = fn(x * 0.09, z * 0.09) * 1.8 + fn(x * 0.025 + 5, z * 0.025) * 5;
          y = -78 + crowns * 1.4 + jungleRing(x, z, r);
          const hills = (Math.max(0, fn(x * 0.006 + 9, z * 0.006 - 4)) * 70 + 30) * smoothstep(240, 420, r) * farHills;
          y += hills;
          const rd = farRiver(x, z);
          y -= smoothstep(16, 5, rd) * 6;
          c.set('#1a3a16').lerp(C('#3a6624'), fn(x * 0.07 + 3, z * 0.07) * 0.5 + 0.5);
          c.multiplyScalar(0.75 + 0.5 * ((Math.sin(x * 1.7 + z * 0.3) * Math.cos(z * 1.3 - x * 0.2)) * 0.5 + 0.5));
          if (fn(x * 0.15 + 30, z * 0.15) > 0.62) c.lerp(C('#a8a040'), 0.18);
          if (fn(x * 0.13 - 30, z * 0.13 + 9) > 0.66) c.lerp(C('#a45a70'), 0.15);
          if (rd < 9) c.set('#8a8a6a');
        } else {
          let hh = (fn(x * 0.008 + 3, z * 0.008) * 0.5 + 0.5) * 45 + fn(x * 0.03, z * 0.03) * 5;
          hh = hh * 0.6 + (hh * 0.8 + 45) * smoothstep(200, 400, r) * farHills;
          const st = 3.2; const fr = (hh / st) % 1;
          const terr = Math.floor(hh / st) * st + smoothstep(0.72, 1.0, fr) * st;
          y = -82 + terr;
          const riser = fr > 0.72;
          c.set(riser ? '#c4b898' : '#86783e').lerp(C(riser ? '#a89a7a' : '#5e6630'), fn(x * 0.05, z * 0.05 + 7) * 0.5 + 0.5);
          if (!riser && fn(x * 0.2 + 1, z * 0.2) > 0.2) c.lerp(C('#3a5226'), 0.6);  // olive / oak dots
        }
        pos.push(x, y, z); col.push(c.r, c.g, c.b);
      }
    }
    const ci = pos.length / 3; pos.push(0, pos[1], 0); col.push(col[0], col[1], col[2]);
    for (let j = 0; j < NS; j++) idx.push(ci, (j + 1) % NS, j);
    for (let i = 0; i < NRr; i++) {
      const a0 = i * NS, b0 = (i + 1) * NS;
      for (let j = 0; j < NS; j++) { const j1 = (j + 1) % NS; idx.push(a0 + j, a0 + j1, b0 + j, a0 + j1, b0 + j1, b0 + j); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    const ng = g.toNonIndexed(); ng.computeVertexNormals(); g.dispose();
    farMat = makeHazeMat('farland', { vertexColors: true, flatShading: true });
    farMesh = new THREE.Mesh(track(ng), farMat); farMesh.name = 'far-land';
    root.add(farMesh);

    // instanced crowns on the distant land (amazon: layered jungle canopy + emergents; grove: round dark maquis bushes)
    const nCrowns = Math.round((({ min: 0, low: 350, medium: 900, high: 1600 })[quality] ?? 900) * (isAmazon ? 2.2 : 1.4));
    if (nCrowns > 0) {
      const rr = makeRng(seed * 59 + 3);
      // sample the far-land surface by ray-free lookup: rebuild the height the same way as the loop above
      const farH = (x, z, r) => {
        if (isAmazon) {
          const rd = Math.abs(z - (-30 + 70 * Math.sin(x * 0.006 + 1.2) + 18 * Math.sin(x * 0.019)) + 140);
          return { y: -78 + (fn(x * 0.09, z * 0.09) * 1.8 + fn(x * 0.025 + 5, z * 0.025) * 5) * 1.4 + jungleRing(x, z, r) + (Math.max(0, fn(x * 0.006 + 9, z * 0.006 - 4)) * 70 + 30) * smoothstep(240, 420, r) * farHills - smoothstep(16, 5, rd) * 6, ok: rd > 12 };
        }
        let hh = (fn(x * 0.008 + 3, z * 0.008) * 0.5 + 0.5) * 45 + fn(x * 0.03, z * 0.03) * 5;
        hh = hh * 0.6 + (hh * 0.8 + 45) * smoothstep(200, 400, r) * farHills;
        const st = 3.2; const fr = (hh / st) % 1;
        return { y: -82 + Math.floor(hh / st) * st, ok: fr < 0.6 };
      };
      const geo = new THREE.IcosahedronGeometry(1, isAmazon ? 1 : 0);
      const items = [];
      let tries = 0;
      while (items.length < nCrowns && tries++ < nCrowns * 6) {
        const th = rr() * TAU;
        const r = isAmazon ? 72 + Math.pow(rr(), 1.5) * 220 : 85 + Math.pow(rr(), 1.1) * (pano ? 170 : 300);
        const x = Math.cos(th) * r, z = Math.sin(th) * r;
        const h = farH(x, z, r); if (!h.ok) continue;
        if (!isAmazon && fn(x * 0.2 + 1, z * 0.2) < -0.1 && rr() < 0.7) continue;   // clumped maquis
        const emergent = isAmazon && rr() < 0.07;
        const s = isAmazon ? (emergent ? 7 + rr() * 5 : 4 + rr() * 4) * (0.8 + r / 350) : (1.4 + rr() * 2.0) * (0.75 + r / 250);
        const lift = isAmazon ? (emergent ? s * 1.1 + 3 : s * 0.15) : -s * 0.45;
        const c = new THREE.Color();
        if (isAmazon) {
          c.set(rr() < 0.5 ? '#1f4a18' : '#2e5c1e').lerp(C('#163a12'), rr() * 0.7);
          if (emergent) c.lerp(C('#4e6e26'), 0.45);
          const k = rr(); if (k < 0.02) c.set('#a8962e'); else if (k < 0.032) c.set('#9a5a7e');   // a few flowering crowns
        } else {
          c.set(rr() < 0.6 ? '#2e4a22' : '#41582a').lerp(C('#26381c'), rr() * 0.5);
        }
        items.push({ x, y: h.y + lift, z, s, flat: isAmazon ? 0.55 + rr() * 0.2 : 0.7, c, yaw: rr() * TAU, ground: h.y, emergent });
      }
      // real tree impostors (the zone's own trees baked into a small atlas); simple faceted crowns if that is not possible
      if (impostorTrees && impostorTrees.length && pipeline.renderer) {
        let imp = null;
        try {
          imp = bakeImpostors(pipeline.renderer, impostorTrees, { cell: quality === 'high' ? 192 : 128 });
          track(imp.albedo); track(imp.normal);
          const rows = imp.rows, byRole = {};
          rows.forEach((row, i) => { const role = impostorTrees[i].role || 'tree'; (byRole[role] = byRole[role] || []).push(i); });
          const anyRole = (...names) => { for (const n of names) if (byRole[n]) return byRole[n]; return byRole[Object.keys(byRole)[0]]; };
          const ri = makeRng(seed * 61 + 9);   // own stream: the crown positions above stay exactly as they were
          const quad = track(impostorQuad());
          const aImp = new Float32Array(items.length * 3);
          const mesh = new THREE.InstancedMesh(quad, patchImpostorMaterial(makeHazeMat('farimp', {}), imp), items.length);
          const m4 = new THREE.Matrix4(), tint = new THREE.Color();
          // inner ring first: drawn roughly front-to-back from the island, so hidden tree pixels fail the depth test early
          items.slice().sort((a, b) => (a.x * a.x + a.z * a.z) - (b.x * b.x + b.z * b.z)).forEach((it, i) => {
            let role;
            if (isAmazon) role = it.emergent ? 'emergent' : ri() < 0.14 ? 'palm' : 'canopy';
            else role = ri() < 0.6 ? 'bush' : 'tree';
            const list = isAmazon ? (role === 'emergent' ? anyRole('emergent', 'canopy') : role === 'palm' ? anyRole('palm', 'canopy') : anyRole('canopy', 'emergent'))
              : (role === 'bush' ? anyRole('bush', 'tree') : anyRole('tree', 'bush'));
            const row = list[Math.min(list.length - 1, Math.floor(ri() * list.length))], R = rows[row];
            // the old crown radius it.s sets the crown width; the tree is sunk into the far land so the canopy keeps its height
            const width = it.s * 2 * (isAmazon ? (role === 'palm' ? 0.85 : 1.2 + ri() * 0.25) : role === 'tree' ? 1.0 + ri() * 0.25 : 1.05 + ri() * 0.2);
            const sc = width / (2 * R.halfW), tall = R.above * sc;
            let base;
            if (isAmazon) base = (it.emergent ? it.ground + it.s * 1.9 + 3 : it.ground + it.s * (0.85 + ri() * 0.2)) - tall;
            else base = role === 'bush' ? it.ground - tall * 0.18 : it.ground - 0.4 - tall * 0.05;
            m4.makeScale(sc, sc, sc).setPosition(it.x, base, it.z);
            mesh.setMatrixAt(i, m4);
            // keep the far forest's palette (and so its blend with the painted horizon): each tree tinted to its crown's colour
            tint.setRGB(clamp(it.c.r / Math.max(R.mean.r, 1e-3), 0.1, 3), clamp(it.c.g / Math.max(R.mean.g, 1e-3), 0.1, 3), clamp(it.c.b / Math.max(R.mean.b, 1e-3), 0.1, 3));
            mesh.setColorAt(i, tint);
            aImp[i * 3] = it.yaw; aImp[i * 3 + 1] = row; aImp[i * 3 + 2] = Math.min(R.above * 0.6, (it.ground - base) / sc - R.above * 0.12);
          });
          quad.setAttribute('aImp', new THREE.InstancedBufferAttribute(aImp, 3));
          mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
          mesh.frustumCulled = false; mesh.name = 'far-crowns'; mesh.userData.impostors = true;
          farCrowns = mesh;
          if (typeof window !== 'undefined') window.__impBake = { ms: Math.round(imp.ms), parts: Object.fromEntries(Object.entries(imp.parts).map(([k, v]) => [k, Math.round(v)])), size: imp.size, programs: imp.programs, rows: rows.map(r => r.id) };
        } catch (e) {
          console.warn('far forest: tree impostors unavailable, using simple crowns –', e && e.message ? e.message : e);
          if (typeof window !== 'undefined') window.__impBake = { failed: String(e && e.message ? e.message : e) };
          farCrowns = null;
        }
      }
      if (!farCrowns) {
        farCrowns = new THREE.InstancedMesh(track(geo), makeHazeMat('farcrowns', { flatShading: true }), items.length);
        const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
        items.forEach((it, i) => {
          q.setFromAxisAngle(V3(0, 1, 0), it.yaw);
          m4.compose(V3(it.x, it.y, it.z), q, V3(it.s, it.s * it.flat, it.s));
          farCrowns.setMatrixAt(i, m4); farCrowns.setColorAt(i, it.c);
        });
        farCrowns.instanceMatrix.needsUpdate = true; farCrowns.instanceColor.needsUpdate = true;
        farCrowns.frustumCulled = false; farCrowns.name = 'far-crowns';
      } else geo.dispose();
      root.add(farCrowns);
    }
  }

  // ───────────────────────────── sea of mist below
  const mistSeaU = {
    uTime: U.uTime, uNoise: U.uNoise, uLit: { value: C('#fff') }, uShade: { value: C('#99a') }, uDensity: { value: 0.5 },
    uSunDir: U.uSunDir, uSunCol: U.uSunCol, uIsland: { value: V3(0, 0, 44) },
    ...THREE.UniformsLib.fog,
  };
  const makeMistSeaMat = (extra) => track(new THREE.ShaderMaterial({
    uniforms: { ...mistSeaU, ...extra }, transparent: true, depthWrite: false, fog: true,
    vertexShader: /* glsl */`varying vec3 vW; #include <fog_pars_vertex>
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition; #include <fog_vertex> }`.replace(/#include <fog_pars_vertex>/, '\n#include <fog_pars_vertex>\n').replace(/#include <fog_vertex>/, '\n#include <fog_vertex>\n'),
    fragmentShader: /* glsl */`
      uniform float uTime, uDensity; uniform sampler2D uNoise; uniform vec3 uLit, uShade, uSunDir, uSunCol; varying vec3 vW;
      #include <fog_pars_fragment>
      uniform vec3 uIsland; // x,z of island shadow centre, radius
      uniform float uOuter, uDensAdd;
      float field(vec2 p){
        vec2 q = p * 0.0032 + vec2(uTime * 0.0009, uTime * 0.0004);
        return texture2D(uNoise, q).b * 0.75
             + texture2D(uNoise, q * 2.1 + 0.37).a * 0.3
             + texture2D(uNoise, q * 5.3 - vec2(uTime * 0.002, 0.0)).g * 0.12;
      }
      void main(){
        float h = field(vW.xz);
        float e = 4.0;
        float hx = field(vW.xz + vec2(e, 0.0)) - h, hz = field(vW.xz + vec2(0.0, e)) - h;
        vec3 N = normalize(vec3(-hx * 45.0, 1.0, -hz * 45.0));
        float lo = 0.86 - (uDensity + uDensAdd) * 0.5;
        float d = smoothstep(lo, lo + 0.12, h);
        float r = length(vW.xz);
        d *= smoothstep(36.0, 64.0, r) * (1.0 - smoothstep(uOuter * 0.55, uOuter, r));
        float lit = clamp(dot(N, normalize(uSunDir + vec3(0.0, 0.25, 0.0))) * 0.6 + 0.45, 0.0, 1.0);
        float thick = smoothstep(lo, lo + 0.35, h);
        vec3 col = mix(uShade, uLit, lit * (0.4 + 0.6 * thick));
        // island shadow cast on the clouds
        float sh = 1.0 - smoothstep(uIsland.z * 0.55, uIsland.z * 1.15, length(vW.xz - uIsland.xy));
        col *= 1.0 - 0.38 * sh;
        col += uSunCol * pow(max(dot(normalize(vec3(vW.x, 40.0, vW.z)), uSunDir), 0.0), 8.0) * 0.06;
        gl_FragColor = vec4(col, d * (0.75 + 0.25 * thick));
        #include <fog_fragment>
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  const mistSeaGeo = track(new THREE.CircleGeometry(480, 64)); mistSeaGeo.rotateX(-Math.PI / 2);
  const mistSeaMat = makeMistSeaMat({ uOuter: { value: 2000 }, uDensAdd: { value: 0 } });
  const mistSeaMat2 = makeMistSeaMat({ uOuter: { value: 120 }, uDensAdd: { value: 0.12 } });
  const mistSea = new THREE.Mesh(mistSeaGeo, mistSeaMat); mistSea.position.y = isAmazon ? -30 : -29; mistSea.renderOrder = 2; mistSea.name = 'mist-sea';
  root.add(mistSea);
  // second, higher thin layer that wraps the island's base
  const mistSea2 = new THREE.Mesh(mistSeaGeo, mistSeaMat2); mistSea2.position.y = isAmazon ? -24 : -22; mistSea2.scale.setScalar(0.26); mistSea2.renderOrder = 3; mistSea2.name = 'mist-sea2';
  root.add(mistSea2);

  // ───────────────────────────── water
  const waterU = {
    uTime: U.uTime, uNoise: U.uNoise, uSunDir: U.uSunDir, uSunCol: U.uSunCol, uSky: U.uSkyCol, uLight: U.uLightCol, uWet: U.uWet,
    uDeep: { value: C(isAmazon ? '#2a3a1c' : '#174a52') }, uShallow: { value: C(isAmazon ? '#8a7440' : '#4a9a90') },
    uFlow: { value: isAmazon ? 1 : 0 }, uNight: { value: 0 },
    ...THREE.UniformsLib.fog,
  };
  const waterMat = track(new THREE.ShaderMaterial({
    uniforms: waterU, transparent: true, depthWrite: true, fog: true,
    vertexShader: /* glsl */`
      varying vec3 vW; varying vec2 vUv2;
      #include <fog_pars_vertex>
      void main(){ vUv2 = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uFlow, uWet, uNight; uniform sampler2D uNoise; uniform vec3 uSunDir, uSunCol, uSky, uLight, uDeep, uShallow;
      varying vec3 vW; varying vec2 vUv2;
      #include <fog_pars_fragment>
      void main(){
        vec2 fuv = uFlow > 0.5 ? vec2(vUv2.x * 0.35, vUv2.y * 0.05 - uTime * 0.09) : vW.xz * 0.06 + vec2(uTime * 0.004, 0.0);
        vec2 fuv2 = uFlow > 0.5 ? vec2(vUv2.x * 0.6 + 0.3, vUv2.y * 0.09 - uTime * 0.14) : vW.xz * 0.11 - vec2(0.0, uTime * 0.006);
        float n1 = texture2D(uNoise, fuv).r, n2 = texture2D(uNoise, fuv2).g;
        float rip = texture2D(uNoise, vW.xz * 0.9 + uTime * 0.3).r - 0.5;
        vec3 nrm = normalize(vec3((n1 - 0.5) * 0.5 + rip * uWet * 0.6, 1.0, (n2 - 0.5) * 0.5 + rip * uWet * 0.6));
        vec3 V = normalize(cameraPosition - vW);
        float fres = 0.06 + 0.94 * pow(1.0 - max(dot(nrm, V), 0.0), 4.0);
        float edge = uFlow > 0.5 ? abs(vUv2.x) : vUv2.x;
        vec3 base = mix(uDeep, uShallow, smoothstep(0.35, 1.0, edge) * 0.8 + n1 * 0.2);
        base = mix(base, vec3(0.16, 0.24, 0.34), uNight * 0.75) * uLight;
        vec3 col = mix(base, uSky, clamp(fres * 0.8, 0.0, 0.7));
        vec3 Hh = normalize(uSunDir + V);
        float spec = pow(max(dot(nrm, Hh), 0.0), 220.0);
        col += uSunCol * spec * 5.0 * smoothstep(-0.02, 0.1, uSunDir.y);
        // moon glint
        col += vec3(0.6, 0.7, 1.0) * pow(max(dot(nrm, normalize(vec3(-uSunDir.x, abs(uSunDir.y), -uSunDir.z) + V)), 0.0), 160.0) * uNight * 1.5;
        float foam = smoothstep(0.9, 1.05, edge) * smoothstep(0.5, 0.75, n2);
        if (uFlow > 0.5) foam += smoothstep(0.78, 0.95, n1 * n2 * 1.6) * 0.18;
        col = mix(col, uLight * 0.9, clamp(foam, 0.0, 1.0) * 0.55);
        float a = mix(0.82, 0.96, fres) * (1.0 - smoothstep(0.92, 1.05, edge) * 0.6);
        gl_FragColor = vec4(col, a);
        #include <fog_fragment>
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  const waterMeshes = [];
  let waterfall = null, waterfallMat = null;
  if (isAmazon) {
    // river ribbon
    const pts = riverPts; const pos = [], uv = [], idx = [];
    let acc = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const t = V3(b.x - a.x, 0, b.z - a.z).normalize(); const n = V3(-t.z, 0, t.x);
      if (i > 0) acc += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
      const w = riverHW * 1.18;
      pos.push(pts[i].x + n.x * w, WL, pts[i].z + n.z * w, pts[i].x - n.x * w, WL, pts[i].z - n.z * w);
      uv.push(-1.18, acc, 1.18, acc);
      if (i < pts.length - 1) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const river = new THREE.Mesh(track(g), waterMat); river.name = 'river'; river.renderOrder = 1;
    root.add(river); waterMeshes.push(river);
    // spring pool
    const sp = springPool; const pg = new THREE.CircleGeometry(1, 40); pg.rotateX(-Math.PI / 2);
    const pp = pg.attributes.position; const puv = pg.attributes.uv;
    for (let i = 0; i < pp.count; i++) {
      const x = pp.getX(i), z = pp.getZ(i); const rr0 = Math.hypot(x, z);
      const wx = sp.x + x * sp.r * 1.12, wz = sp.z + z * sp.r * 1.12;
      const k = rr0 > 0 ? poolShapeR(sp, wx, wz) * 1.12 / sp.r : 1;
      pp.setXYZ(i, sp.x + x * sp.r * k, WL + 0.005, sp.z + z * sp.r * k);
      puv.setXY(i, rr0 * 0.0, 0);  // centre-ish → treat as calm
    }
    const pool = new THREE.Mesh(track(pg), waterMat); pool.renderOrder = 1; root.add(pool); waterMeshes.push(pool);

    // fallen-log crossings: an old trunk lying bank to bank, roots torn up at one end, mossy on top
    const logParts = [];
    const BARK = C('#86664a'), BARK2 = C('#5e4532'), MOSS = C('#6f9238'), MOSS2 = C('#9cb84c'), WOOD = C('#c49a6a');
    const colorize = (g, fn) => { const p = g.attributes.position, n = g.attributes.normal, c = new Float32Array(p.count * 3), col = new THREE.Color(); for (let i = 0; i < p.count; i++) { fn(col, p.getX(i), p.getY(i), p.getZ(i), n.getY(i), i); c.set([col.r, col.g, col.b], i * 3); } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g; };
    bridges.forEach((b, bi) => {
      bridgeTops(b);
      const rr = makeRng(seed * 7 + bi * 131 + 3), ext = 0.7;
      const A = V3(b.ax, b.ta - b.r, b.az), B = V3(b.bx, b.tb - b.r, b.bz);
      const dir = B.clone().sub(A); const L0 = dir.length(); dir.normalize();
      const p0 = A.clone().addScaledVector(dir, -ext), len = L0 + ext * 2;
      const q = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), dir);
      const side = V3(1, 0, 0).applyQuaternion(q);
      // trunk: a tapering, knobbly cylinder along +y, then laid along the crossing
      const tg = new THREE.CylinderGeometry(1, 1, len, 16, 18, false);
      tg.translate(0, len / 2, 0);
      const tp = tg.attributes.position;
      for (let i = 0; i < tp.count; i++) {
        const x = tp.getX(i), y = tp.getY(i), z = tp.getZ(i), u = y / len, a = Math.atan2(z, x);
        const rad = b.r * (1.12 - 0.3 * u) * (1 + 0.07 * noise(a * 1.6 + bi * 9, y * 1.3) + 0.04 * Math.sin(a * 7 + y * 2.3));
        const k = Math.hypot(x, z) > 1e-6 ? rad : 0;
        tp.setXYZ(i, Math.cos(a) * k, y, Math.sin(a) * k);
      }
      tg.computeVertexNormals();
      tg.applyQuaternion(q); tg.translate(p0.x, p0.y, p0.z);
      colorize(tg, (c, x, y, z, ny) => {
        const n1 = noise(x * 1.7 + 40, z * 1.7 - y * 2), n2 = noise(x * 6 - 11, z * 6 + y * 5);
        c.copy(BARK).lerp(BARK2, clamp(0.35 + 0.45 * n2));
        const moss = smoothstep(0.5, 0.9, ny) * clamp(0.25 + 0.7 * n1);
        c.lerp(n2 > 0.2 ? MOSS2 : MOSS, moss * 0.75);
        c.multiplyScalar(0.8 + 0.35 * clamp(ny * 0.5 + 0.5));   // darker underside
      });
      logParts.push(tg);
      // torn-up root plate at the A end: roots fanning out around the trunk foot
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * TAU + rr() * 0.5, l = 0.9 + rr() * 0.8;
        const rd = side.clone().applyAxisAngle(dir, a).multiplyScalar(0.8).addScaledVector(dir, -0.45 - rr() * 0.4).normalize();
        const cg = new THREE.ConeGeometry(0.11 + rr() * 0.06, l, 6, 2);
        cg.translate(0, l / 2, 0); cg.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), rd));
        const base = A.clone().addScaledVector(dir, -ext * 0.6).addScaledVector(rd, b.r * 0.6);
        cg.translate(base.x, base.y, base.z);
        logParts.push(colorize(cg, (c, x, y, z, ny) => c.copy(BARK2).lerp(BARK, 0.3 + 0.3 * noise(x * 5, z * 5))));
      }
      // broken branch stubs along the trunk, and a pale broken end at B
      for (let k = 0; k < 3; k++) {
        const u = 0.25 + k * 0.25 + (rr() - 0.5) * 0.1, a = (rr() < 0.5 ? -1 : 1) * (0.9 + rr() * 0.6);
        const sd = side.clone().applyAxisAngle(dir, a).addScaledVector(dir, 0.5).normalize(), l = 0.35 + rr() * 0.35;
        const cg = new THREE.CylinderGeometry(0.035, 0.08, l, 6, 1);
        cg.translate(0, l / 2, 0); cg.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), sd));
        const base = p0.clone().addScaledVector(dir, ext + u * L0).addScaledVector(sd, b.r * 0.85);
        cg.translate(base.x, base.y, base.z);
        logParts.push(colorize(cg, (c) => c.copy(BARK)));
      }
      const end = new THREE.CircleGeometry(b.r * 0.8, 12);
      end.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 0, 1), dir));
      const ep = B.clone().addScaledVector(dir, ext + 0.012); end.translate(ep.x, ep.y, ep.z);
      logParts.push(colorize(end, (c, x, y, z) => c.copy(WOOD).lerp(BARK, 0.25 * (1 + Math.sin(Math.hypot(x - ep.x, y - ep.y, z - ep.z) * 60)))));
    });
    if (logParts.length) {
      const lg = mergeGeometries(logParts.map(g => { g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g; }));
      logParts.forEach(g => g.dispose());
      const logs = new THREE.Mesh(track(lg), track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 })));
      logs.name = 'river-logs'; logs.castShadow = true; logs.receiveShadow = true; root.add(logs);
    }

    // waterfall
    const E = riverExit; const D = E.dir; const S = V3(-D.z, 0, D.x);
    const NU = 8, NV = 40, H = 34;
    const wp = [], wuv = [], widx = [];
    for (let v = 0; v <= NV; v++) {
      const f = v / NV; const s = Math.sqrt(f * H / 4.9);
      const outD = 0.3 + s * 1.7; const drop = f * H;
      const width = riverHW * (0.95 + f * 0.55);
      for (let u = 0; u <= NU; u++) {
        const uu = u / NU * 2 - 1;
        const wob = Math.sin(uu * 3 + f * 6) * 0.15 * f;
        const p = V3(E.x, WL + 0.02 - drop, E.z).addScaledVector(D, outD + wob).addScaledVector(S, uu * width);
        wp.push(p.x, p.y, p.z); wuv.push(uu, f);
      }
    }
    for (let v = 0; v < NV; v++) for (let u = 0; u < NU; u++) { const a = v * (NU + 1) + u; widx.push(a, a + NU + 1, a + 1, a + 1, a + NU + 1, a + NU + 2); }
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
    wg.setAttribute('uv', new THREE.Float32BufferAttribute(wuv, 2)); wg.setIndex(widx); wg.computeVertexNormals();
    waterfallMat = track(new THREE.ShaderMaterial({
      uniforms: { uTime: U.uTime, uNoise: U.uNoise, uLight: U.uLightCol, uSunCol: U.uSunCol, ...THREE.UniformsLib.fog },
      transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true,
      vertexShader: /* glsl */`varying vec2 vUv2; varying vec3 vW;
        #include <fog_pars_vertex>
        void main(){ vUv2 = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */`uniform float uTime; uniform sampler2D uNoise; uniform vec3 uLight, uSunCol; varying vec2 vUv2; varying vec3 vW;
        #include <fog_pars_fragment>
        void main(){
          float n = texture2D(uNoise, vec2(vUv2.x * 0.7, vUv2.y * 1.2 - uTime * 0.55)).r;
          float n2 = texture2D(uNoise, vec2(vUv2.x * 1.9 + 0.3, vUv2.y * 2.5 - uTime * 0.9)).g;
          float streak = smoothstep(0.3, 0.8, n * 0.6 + n2 * 0.6);
          vec3 col = mix(vec3(0.55, 0.6, 0.55), vec3(1.0), streak) * uLight * 1.1;
          float a = (0.55 + 0.45 * streak) * (1.0 - smoothstep(0.75, 1.0, abs(vUv2.x))) * (1.0 - smoothstep(0.55, 1.0, vUv2.y));
          a *= smoothstep(0.0, 0.02, vUv2.y) * 0.5 + 0.5;
          gl_FragColor = vec4(col, a * 0.9);
          #include <fog_fragment>
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }));
    waterfall = new THREE.Mesh(track(wg), waterfallMat); waterfall.renderOrder = 4; waterfall.name = 'waterfall';
    root.add(waterfall);
  } else {
    const P = pools[0];
    const pg = new THREE.CircleGeometry(1, 48); pg.rotateX(-Math.PI / 2);
    const pp = pg.attributes.position; const puv = pg.attributes.uv;
    for (let i = 0; i < pp.count; i++) {
      const x = pp.getX(i), z = pp.getZ(i); const rr0 = Math.hypot(x, z);
      const wx = P.x + x * P.r, wz = P.z + z * P.r;
      const k = poolShapeR(P, wx, wz) * 1.1;
      pp.setXYZ(i, P.x + x * k, 0, P.z + z * k);
      puv.setXY(i, rr0, 0);
    }
    const pool = new THREE.Mesh(track(pg), waterMat); pool.position.y = WL; pool.renderOrder = 1; pool.name = 'spring';
    root.add(pool); waterMeshes.push(pool);
  }

  // ───────────────────────────── ground scatter (instanced)
  const scatterMeshes = [];
  const SU = { ...U, uScale: { value: 1 }, uBloom: { value: new THREE.Vector4(0, 0, 0, 0) }, uSwayK: { value: 1 } };

  function scatterMaterial(key, { sway = 1, extra = {}, flat = false, rough = 0.9, side = THREE.FrontSide, kinds = false, cards = false } = {}) {
    const uniforms = { ...U, uSway: { value: sway }, uScale: { value: 1 }, ...extra };
    // cards: thin double-sided foliage whose (up-bent) normals must NOT be flipped on back faces
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: 0, flatShading: flat, side: cards ? THREE.DoubleSide : side });
    patchMaterial(mat, 'scatter-' + key, uniforms, {
      instanced: true,
      vertexPre: 'uniform float uSway; uniform float uScale;' + (kinds ? ' attribute float aKind; uniform vec4 uBloom;' : ''),
      vertexBegin: /* glsl */`
        float _s = uScale ${kinds ? '* (aKind < 0.5 ? uBloom.x : aKind < 1.5 ? uBloom.y : aKind < 2.5 ? uBloom.z : uBloom.w)' : ''};
        transformed *= _s;
        vec3 _ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        float _ph = _ip.x * 0.37 + _ip.z * 0.29;
        float _h = max(transformed.y, 0.0) * uSway;
        float _g = sin(uTime * (1.4 + uWind * 2.2) + _ph) + 0.5 * sin(uTime * 3.1 + _ph * 1.7);
        transformed.x += _g * _h * (0.05 + 0.28 * uWind);
        transformed.z += cos(uTime * (1.1 + uWind * 1.8) + _ph * 1.3) * _h * (0.03 + 0.16 * uWind);`,
      colorVertex: kinds ? /* glsl */`
        vColor = vec4(1.0);
        vColor.rgb *= color.rgb;
        #ifdef USE_INSTANCING_COLOR
          vColor.rgb = mix(vColor.rgb, vColor.rgb * instanceColor.rgb, step(0.985, color.r) * step(0.985, color.b));
        #endif` : null,
      fragColor: /* glsl */`
        diffuseColor.rgb = vitalGrade(diffuseColor.rgb) * (1.0 - 0.25 * uWet);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.05, 0.045, 0.04), scorchAt(vWPos.xz) * 0.92);`,
      fragRough: 'roughnessFactor = mix(roughnessFactor, 0.35, uWet * 0.7);',
      cards,
    });
    mat.userData.uniforms = uniforms;
    return track(mat);
  }

  function slopeQuat(x, z, yaw, follow = 1) {
    const e = 0.5;
    const nx = heightAt(x - e, z) - heightAt(x + e, z), nz = heightAt(x, z - e) - heightAt(x, z + e);
    const n = V3(nx * follow, 2 * e, nz * follow).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), n);
    return q.multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), yaw));
  }

  function samplePoints(n, rmin, rmax, accept, rr) {
    const out = []; let tries = 0;
    while (out.length < n && tries < n * 30) {
      tries++;
      const th = rr() * TAU; const er = edgeR(th);
      const lo = Math.min(rmin, er), hi = Math.min(rmax, er - 0.4);
      if (hi <= lo) continue;
      const r = Math.sqrt(lo * lo + rr() * (hi * hi - lo * lo));
      const x = Math.cos(th) * r, z = Math.sin(th) * r;
      if (accept && !accept(x, z, r, er)) continue;
      out.push({ x, z, r, er });
    }
    return out;
  }
  const onRock = (x, z, pad = 0) => rocks.some(rk => rk.boulders.some(b => Math.hypot(x - b.x, z - b.z) < b.r * 0.95 + pad));
  const dryLand = (pad = 0.3) => (x, z) => (WL === null || waterDist(x, z) > pad) && !onRock(x, z) && !nearBridge(x, z, 0.6);

  function addScatter(name, geom, mat, items, { castShadow = false, colors = null, kinds = null } = {}) {
    if (!items.length) return null;
    const mesh = new THREE.InstancedMesh(geom, mat, items.length);
    const m = new THREE.Matrix4();
    items.forEach((it, i) => {
      m.compose(it.p, it.q, it.s);
      mesh.setMatrixAt(i, m);
      if (it.c) mesh.setColorAt(i, it.c);
    });
    if (kinds) geom.setAttribute('aKind', new THREE.InstancedBufferAttribute(new Float32Array(kinds), 1));
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = castShadow && qual.shadowScatter; mesh.receiveShadow = true;
    mesh.name = 'scatter-' + name; mesh.userData.fullCount = items.length;
    mesh.frustumCulled = false;
    root.add(mesh); scatterMeshes.push(mesh); track(geom);
    return mesh;
  }

  // geometry builders ------------------------------------------------------
  function colorize(g, fn) {
    const p = g.attributes.position; const n = p.count; const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const c = fn(p.getX(i), p.getY(i), p.getZ(i), i); a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return g;
  }
  function geoFromArrays(pos, col, idx) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    if (idx) g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  function twoSided(g) {
    const p = g.attributes.position.array, n = g.attributes.normal.array, c = g.attributes.color.array; const cnt = g.attributes.position.count;
    const P = new Float32Array(cnt * 6), Nn = new Float32Array(cnt * 6), Cc = new Float32Array(cnt * 6);
    P.set(p); Nn.set(n); Cc.set(c);
    for (let t = 0; t < cnt / 3; t++) for (let k = 0; k < 3; k++) {
      const src = t * 3 + (2 - k), dst = cnt + t * 3 + k;
      for (let q = 0; q < 3; q++) { P[dst * 3 + q] = p[src * 3 + q]; Nn[dst * 3 + q] = n[src * 3 + q]; Cc[dst * 3 + q] = c[src * 3 + q]; }
    }
    const o = new THREE.BufferGeometry();
    o.setAttribute('position', new THREE.BufferAttribute(P, 3)); o.setAttribute('normal', new THREE.BufferAttribute(Nn, 3)); o.setAttribute('color', new THREE.BufferAttribute(Cc, 3));
    g.dispose(); return o;
  }
  function upNormals(g, k = 1) {
    const nr = g.attributes.normal; const n = nr.count;
    for (let i = 0; i < n; i++) { const x = nr.getX(i) * (1 - k), y = nr.getY(i) * (1 - k) + k, z = nr.getZ(i) * (1 - k); const l = Math.hypot(x, y, z) || 1; nr.setXYZ(i, x / l, y / l, z / l); }
    return g;
  }
  function grassTuftGeom(blades = 7, rr) {
    const pos = [], col = [];
    for (let b = 0; b < blades; b++) {
      const a = b / blades * TAU + rr() * 0.6; const lean = 0.2 + rr() * 0.4; const h = 0.6 + rr() * 0.4; const w = 0.06 + rr() * 0.03;
      const dx = Math.cos(a), dz = Math.sin(a); const px = -dz, pz = dx;
      const ox = dx * 0.04 * rr(), oz = dz * 0.04 * rr();
      const mid = [ox + dx * lean * 0.35 * h, h * 0.55, oz + dz * lean * 0.35 * h];
      const tip = [ox + dx * lean * h, h, oz + dz * lean * h];
      const v = [[ox - px * w, 0, oz - pz * w], [ox + px * w, 0, oz + pz * w], [mid[0] - px * w * 0.6, mid[1], mid[2] - pz * w * 0.6], [mid[0] + px * w * 0.6, mid[1], mid[2] + pz * w * 0.6], tip];
      const sh = [0.7, 0.7, 0.9, 0.9, 1.12];
      for (const t of [[0, 1, 2], [1, 3, 2], [2, 3, 4]]) for (const k of t) { pos.push(...v[k]); col.push(sh[k], sh[k], sh[k]); }
    }
    return geoFromArrays(pos, col);
  }
  function fernGeom(rr, fronds = 6) {
    const pos = [], col = [];
    for (let f = 0; f < fronds; f++) {
      const a = f / fronds * TAU + rr() * 0.4; const L = 0.8 + rr() * 0.35; const segs = 4; const rise = 0.5 + rr() * 0.25;
      const dx = Math.cos(a), dz = Math.sin(a); const px = -dz, pz = dx;
      let prev = null;
      for (let s = 0; s <= segs; s++) {
        const t = s / segs; const x = dx * L * t, z = dz * L * t; const y = rise * Math.sin(t * Math.PI * 0.85) * (1 - t * 0.3);
        const w = 0.2 * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.08));
        const cur = { c: [x, y, z], l: [x + px * w, y - 0.05, z + pz * w], r: [x - px * w, y - 0.05, z - pz * w] };
        if (prev) {
          const shA = 0.6 + 0.5 * t;
          for (const tri of [[prev.c, prev.l, cur.c], [prev.l, cur.l, cur.c], [prev.c, cur.c, prev.r], [prev.r, cur.c, cur.r]]) for (const v of tri) { pos.push(...v); col.push(shA * 0.9, shA, shA * 0.85); }
        }
        prev = cur;
      }
    }
    return geoFromArrays(pos, col);
  }
  function blobGeom(rr, n = 5, flat = 0.75) {
    const parts = [];
    for (let i = 0; i < n; i++) {
      const g = new THREE.IcosahedronGeometry(0.45 + rr() * 0.3, 0);
      const a = rr() * TAU, d = i === 0 ? 0 : 0.35 + rr() * 0.3;
      g.scale(1, flat, 1); g.translate(Math.cos(a) * d, 0.35 + rr() * 0.35 + (i === 0 ? 0.2 : 0), Math.sin(a) * d);
      parts.push(colorize(g, (x, y) => tmpC.setScalar(0.55 + 0.5 * clamp(y / 1.1))));
    }
    const m = mergeGeometries(parts); parts.forEach(p => p.dispose()); return m;
  }
  function bigLeafGeom(rr, leaves = 6) {
    const pos = [], col = [];
    for (let l = 0; l < leaves; l++) {
      const a = l / leaves * TAU + rr() * 0.5; const dx = Math.cos(a), dz = Math.sin(a); const px = -dz, pz = dx;
      const stemH = 0.5 + rr() * 0.6; const L = 0.9 + rr() * 0.5; const W = L * 0.42;
      // petiole as a thin triangle
      pos.push(-px * 0.03, 0, -pz * 0.03, px * 0.03, 0, pz * 0.03, dx * 0.25, stemH, dz * 0.25); col.push(0.45, 0.55, 0.3, 0.45, 0.55, 0.3, 0.6, 0.7, 0.4);
      const base = [dx * 0.25, stemH, dz * 0.25];
      const segs = 5; let prev = null;
      for (let s = 0; s <= segs; s++) {
        const t = s / segs; const w = W * Math.sin(Math.PI * t) * 0.5;
        const c = [base[0] + dx * L * t, base[1] + Math.sin(t * 1.4) * 0.25 - t * t * 0.45, base[2] + dz * L * t];
        const cur = { c, l: [c[0] + px * w, c[1] - w * 0.25, c[2] + pz * w], r: [c[0] - px * w, c[1] - w * 0.25, c[2] - pz * w] };
        if (prev) for (const tri of [[prev.c, prev.l, cur.c], [prev.l, cur.l, cur.c], [prev.c, cur.c, prev.r], [prev.r, cur.c, cur.r]]) for (const v of tri) { pos.push(...v); const sh = 0.75 + 0.35 * t; col.push(sh, sh, sh); }
        prev = cur;
      }
    }
    return geoFromArrays(pos, col);
  }
  function leafLitterGeom() {
    const pos = [0, 0.01, -0.5, 0.22, 0.03, 0, 0, 0.06, 0.02, 0, 0.01, -0.5, 0, 0.06, 0.02, -0.22, 0.03, 0, 0.22, 0.03, 0, 0, 0.01, 0.5, 0, 0.06, 0.02, -0.22, 0.03, 0, 0, 0.06, 0.02, 0, 0.01, 0.5];
    const col = []; for (let i = 0; i < 12; i++) col.push(1, 1, 1);
    return geoFromArrays(pos, col);
  }
  function pebbleGeom(rr, flat = 0.55, detail = 0) {
    const g = new THREE.IcosahedronGeometry(1, detail);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = 0.85 + 0.3 * rr(); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * flat, p.getZ(i) * k); }
    g.computeVertexNormals();
    return colorize(g, (x, y) => tmpC.setScalar(y < 0 ? 0.75 : 1));
  }
  function flowerGeom() {
    const pos = [], col = [];
    const H = 0.4;
    pos.push(-0.012, 0, 0, 0.012, 0, 0, 0, H, 0); col.push(0.3, 0.5, 0.2, 0.3, 0.5, 0.2, 0.35, 0.55, 0.25);
    pos.push(0, 0, -0.012, 0, 0, 0.012, 0, H, 0); col.push(0.3, 0.5, 0.2, 0.3, 0.5, 0.2, 0.35, 0.55, 0.25);
    const P = 6, rP = 0.16;
    for (let i = 0; i < P; i++) {
      const a0 = i / P * TAU, a1 = (i + 0.5) / P * TAU, a2 = (i + 1) / P * TAU;
      const tip = [Math.cos(a1) * rP, H + 0.035, Math.sin(a1) * rP];
      pos.push(0, H, 0, Math.cos(a0) * rP * 0.55, H + 0.015, Math.sin(a0) * rP * 0.55, ...tip); col.push(1, 1, 1, 1, 1, 1, 1, 1, 1);
      pos.push(0, H, 0, ...tip, Math.cos(a2) * rP * 0.55, H + 0.015, Math.sin(a2) * rP * 0.55); col.push(1, 1, 1, 1, 1, 1, 1, 1, 1);
    }
    for (let i = 0; i < 5; i++) { const a0 = i / 5 * TAU, a1 = (i + 1) / 5 * TAU; pos.push(0, H + 0.03, 0, Math.cos(a1) * 0.03, H + 0.02, Math.sin(a1) * 0.03, Math.cos(a0) * 0.03, H + 0.02, Math.sin(a0) * 0.03); col.push(0.08, 0.06, 0.1, 0.08, 0.06, 0.1, 0.08, 0.06, 0.1); }
    return geoFromArrays(pos, col);
  }
  function thistleGeom(rr) {
    const pos = [], col = [];
    const stems = 3;
    for (let s = 0; s < stems; s++) {
      const a = rr() * TAU, lean = 0.15 * rr(); const H = 0.55 + rr() * 0.35;
      const tx = Math.cos(a) * lean, tz = Math.sin(a) * lean;
      pos.push(-0.015, 0, 0, 0.015, 0, 0, tx, H, tz); col.push(0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.8, 0.8, 0.8);
      pos.push(0, 0, -0.015, 0, 0, 0.015, tx, H, tz); col.push(0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.8, 0.8, 0.8);
      // spiky head
      const hr = 0.06 + rr() * 0.03;
      for (let k = 0; k < 10; k++) {
        const u = rr() * TAU, v = rr() * Math.PI; const d = [Math.cos(u) * Math.sin(v), Math.cos(v), Math.sin(u) * Math.sin(v)];
        const tip = [tx + d[0] * hr * 2.2, H + d[1] * hr * 2.2, tz + d[2] * hr * 2.2];
        pos.push(tx - d[2] * hr * 0.6, H, tz + d[0] * hr * 0.6, tx + d[2] * hr * 0.6, H, tz - d[0] * hr * 0.6, ...tip); col.push(0.85, 0.85, 0.85, 0.85, 0.85, 0.85, 1, 1, 1);
      }
      // a couple of spiny leaves
      for (let k = 0; k < 2; k++) {
        const la = rr() * TAU; const lh = H * (0.2 + rr() * 0.4);
        pos.push(0, lh, 0, Math.cos(la) * 0.22, lh + 0.05, Math.sin(la) * 0.22, Math.cos(la + 0.5) * 0.1, lh - 0.02, Math.sin(la + 0.5) * 0.1); col.push(0.7, 0.7, 0.7, 0.75, 0.75, 0.75, 0.7, 0.7, 0.7);
      }
    }
    return geoFromArrays(pos, col);
  }

  // Build scatter -----------------------------------------------------------
  const sd = qual.scatter; const N = (n) => Math.max(1, Math.round(n * sd));
  const rrS = makeRng(seed * 977 + 13);
  const scatterRefs = {};
  if (isAmazon) {
    // leaf litter
    {
      const pts = samplePoints(N(5000), 0, 46, dryLand(0.2), rrS);
      const pal = ['#7a4a26', '#8d5a2c', '#5e3a20', '#9a6a32', '#6b4a2a', '#a5562a', '#556030'].map(C);
      const items = pts.map(p => ({ p: V3(p.x, heightAt(p.x, p.z) + 0.02, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU), s: V3(1, 1, 1).multiplyScalar(0.25 + rrS() * 0.35), c: pal[Math.floor(rrS() * pal.length)].clone().multiplyScalar(0.8 + rrS() * 0.4) }));
      scatterRefs.litter = addScatter('litter', leafLitterGeom(), scatterMaterial('litter', { sway: 0, cards: true, rough: 0.95 }), items);
    }
    // small ferns (denser at rim and near water)
    {
      const pts = samplePoints(N(900), 0, 46, (x, z, r) => dryLand(0.4)(x, z) && (rrS() < 0.35 + smoothstep(R - 4, R + 3, r) * 0.65 + (waterDist(x, z) < 5 ? 0.4 : 0)), rrS);
      const geo = upNormals(fernGeom(makeRng(5)), 0.6);
      const pal = ['#3d6a24', '#4f7a2a', '#2f5a20', '#5a8a32'].map(C);
      const items = pts.map(p => { const big = smoothstep(R - 2, R + 4, p.r); return { p: V3(p.x, heightAt(p.x, p.z) - 0.05, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU, 0.5), s: V3(1, 1, 1).multiplyScalar((0.7 + rrS() * 0.7) * (1 + big * 0.9)), c: pal[Math.floor(rrS() * pal.length)].clone().multiplyScalar(0.85 + rrS() * 0.3) }; });
      scatterRefs.fern = addScatter('fern', geo, scatterMaterial('fern', { sway: 0.5, cards: true, rough: 0.8 }), items);
    }
    // moss clumps
    {
      const pts = samplePoints(N(420), 0, 46, dryLand(0.1), rrS);
      const items = pts.map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.05, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU), s: V3(0.4 + rrS() * 0.7, 0.35 + rrS() * 0.3, 0.4 + rrS() * 0.7), c: C(rrS() < 0.5 ? '#3f6420' : '#58782a').multiplyScalar(0.8 + rrS() * 0.3) }));
      scatterRefs.moss = addScatter('moss', pebbleGeom(makeRng(9), 0.5, 1), scatterMaterial('moss', { sway: 0, flat: true }), items);
    }
    // big leafy plants at the rim & river banks
    {
      const pts = samplePoints(N(260), 25, 46, (x, z, r) => dryLand(0.6)(x, z) && (r > R + 1 || waterDist(x, z) < 3.5), rrS);
      const items = pts.map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.05, p.z), q: new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), rrS() * TAU), s: V3(1, 1, 1).multiplyScalar(1.1 + rrS() * 1.3), c: C(rrS() < 0.5 ? '#3e7a2a' : '#2f6424').multiplyScalar(0.85 + rrS() * 0.3) }));
      scatterRefs.bigleaf = addScatter('bigleaf', upNormals(bigLeafGeom(makeRng(17)), 0.55), scatterMaterial('bigleaf', { sway: 0.35, cards: true, rough: 0.7 }), items, { castShadow: true });
    }
    // rim bushes (frame the diorama)
    {
      const pts = samplePoints(N(220), R + 1.5, 46, dryLand(0.8), rrS);
      const pal = ['#2c5a20', '#3a6a24', '#24501c', '#4a7a2a'].map(C);
      const items = pts.map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.2, p.z), q: new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), rrS() * TAU), s: V3(1, 0.8 + rrS() * 0.5, 1).multiplyScalar(1.4 + rrS() * 1.8), c: pal[Math.floor(rrS() * pal.length)].clone().multiplyScalar(0.85 + rrS() * 0.3) }));
      scatterRefs.bush = addScatter('bush', blobGeom(makeRng(21), 6, 0.7), scatterMaterial('bush', { sway: 0.08, flat: true, rough: 0.85 }), items, { castShadow: true });
    }
    // river pebbles
    {
      const pts = samplePoints(N(260), 0, 46, (x, z) => { const d = waterDist(x, z); return d > -0.8 && d < 1.2; }, rrS);
      const items = pts.map(p => ({ p: V3(p.x, heightAt(p.x, p.z), p.z), q: slopeQuat(p.x, p.z, rrS() * TAU), s: V3(1, 1, 1).multiplyScalar(0.1 + rrS() * 0.25), c: C(rrS() < 0.5 ? '#7a7062' : '#5a5448').multiplyScalar(0.8 + rrS() * 0.4) }));
      scatterRefs.pebble = addScatter('pebble', pebbleGeom(makeRng(3)), scatterMaterial('pebble', { sway: 0, flat: true }), items);
    }
  } else {
    // grass tufts
    {
      const pts = samplePoints(N(8000), 0, 46, (x, z, r) => dryLand(0.25)(x, z) && rrS() < 0.25 + coverAt(x, z) * 0.85, rrS);
      const geo = grassTuftGeom(6, makeRng(31));
      const items = pts.map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.03, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU, 0.4), s: V3(1, 0.7 + rrS() * 0.7, 1).multiplyScalar(0.35 + rrS() * 0.35), c: tmpC.setHSL(0, 0, 0.82 + rrS() * 0.3).clone() }));
      upNormals(geo, 1);
      scatterRefs.grass = addScatter('grass', geo, scatterMaterial('grass', { sway: 1, cards: true, rough: 0.9 }), items);
    }
    // flowers by season
    {
      const pts = samplePoints(N(2200), 0, 45, (x, z) => dryLand(0.3)(x, z) && rocks.every(rk => Math.hypot(x - rk.x, z - rk.z) > rk.r * 0.9), rrS);
      const kinds = []; const cols = { 0: C('#e8202a'), 1: C('#f2c41e'), 2: C('#f4f0ea'), 3: C('#f0eadc') };
      const fn = makeNoise2D(seed + 99);
      const items = pts.map(p => {
        // clustered patches: kind chosen by noise so colours form drifts
        const v = fn(p.x * 0.08, p.z * 0.08);
        const k = v > 0.0 ? (rrS() < 0.85 ? 0 : 2) : v > -0.25 ? (rrS() < 0.5 ? 1 : 2) : (rrS() < 0.6 ? 1 : 3);
        kinds.push(k);
        const c = cols[k].clone(); if (k === 0 && rrS() < 0.12) c.set('#d8e0f8'); if (k === 0 && rrS() < 0.1) c.set('#a83a8a');
        return { p: V3(p.x, heightAt(p.x, p.z) - 0.02, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU, 0.3), s: V3(1, 1, 1).multiplyScalar((k === 3 ? 1.6 : 0.9) + rrS() * 0.6), c };
      });
      scatterRefs.flower = addScatter('flower', upNormals(flowerGeom(), 0.8), scatterMaterial('flower', { sway: 1, cards: true, kinds: true, rough: 0.6, extra: { uBloom: { value: new THREE.Vector4(1, 1, 1, 1) } } }), items, { kinds });
    }
    // thistles (summer/autumn)
    {
      const pts = samplePoints(N(420), 0, 46, (x, z) => dryLand(0.6)(x, z) && rrS() < 0.6, rrS);
      const items = pts.map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.02, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU, 0.3), s: V3(1, 1, 1).multiplyScalar(0.7 + rrS() * 0.7), c: tmpC.setHSL(0, 0, 0.85 + rrS() * 0.25).clone() }));
      scatterRefs.thistle = addScatter('thistle', upNormals(thistleGeom(makeRng(41)), 0.7), scatterMaterial('thistle', { sway: 0.6, cards: true }), items);
    }
    // pebbles (terra rossa / limestone)
    {
      const pts = samplePoints(N(900), 0, 46, (x, z) => (WL === null || waterDist(x, z) > -0.6) && !onRock(x, z) && rrS() < 0.25 + rockInfluence(x, z), rrS);
      const items = pts.map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.02, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU), s: V3(1, 1, 1).multiplyScalar(0.06 + rrS() * 0.16), c: C(rrS() < 0.65 ? '#d6cbb2' : '#9a5a3a').multiplyScalar(0.8 + rrS() * 0.35) }));
      scatterRefs.pebble = addScatter('pebble', pebbleGeom(makeRng(3)), scatterMaterial('pebble', { sway: 0, flat: true }), items);
    }
    // limestone chunks
    {
      const pts = samplePoints(N(300), 0, 46, (x, z) => dryLand(0.6)(x, z) && rrS() < 0.3 + rockInfluence(x, z) * 1.5, rrS);
      const items = pts.map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.08, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU), s: V3(1, 0.6 + rrS() * 0.5, 1).multiplyScalar(0.25 + rrS() * 0.5), c: C('#ddd3bc').multiplyScalar(0.8 + rrS() * 0.3) }));
      scatterRefs.chunk = addScatter('chunk', pebbleGeom(makeRng(8), 0.6, 0), scatterMaterial('chunk', { sway: 0, flat: true }), items, { castShadow: true });
    }
    // garrigue shrubs at the rim
    {
      const pts = samplePoints(N(200), R + 1.2, 46, dryLand(0.8), rrS);
      const pal = ['#4a5e2a', '#5a6a32', '#3e5426', '#6a7038'].map(C);
      const items = pts.map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.15, p.z), q: new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), rrS() * TAU), s: V3(1, 0.7 + rrS() * 0.4, 1).multiplyScalar(0.9 + rrS() * 1.3), c: pal[Math.floor(rrS() * pal.length)].clone().multiplyScalar(0.85 + rrS() * 0.3) }));
      scatterRefs.bush = addScatter('bush', blobGeom(makeRng(21), 5, 0.65), scatterMaterial('bush', { sway: 0.06, flat: true, rough: 0.85 }), items, { castShadow: true });
    }
  }

  // ───────────────────────────── ground details modelled in Blender (src/world/props.js)
  // A few of each – they are details, not cover: fallen logs, rocks, river stones, mushrooms. Their counts depend on
  // the quality only at creation (unlike the dense scatter they are never thinned later).
  const propMeshes = [];
  const PQ = ({ min: 0.35, low: 0.6, medium: 1, high: 1.3 })[quality] ?? 1;
  const NP = (n) => Math.max(1, Math.round(n * PQ));
  let propMat = null;
  function addProp(name, items, { castShadow = false } = {}) {
    if (!items.length) return null;
    const geom = propGeometry(name); if (!geom) return null;
    propMat = propMat || scatterMaterial('props', { sway: 0, rough: 0.85 });
    const mesh = new THREE.InstancedMesh(geom, propMat, items.length);
    const m = new THREE.Matrix4();
    items.forEach((it, i) => { m.compose(it.p, it.q, it.s); mesh.setMatrixAt(i, m); mesh.setColorAt(i, it.c || tmpC.setScalar(1)); });
    mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = castShadow; mesh.receiveShadow = true; mesh.frustumCulled = false;
    mesh.name = 'prop-' + name; root.add(mesh); propMeshes.push(mesh); track(geom);
    return mesh;
  }
  const grey = (lo, hi) => tmpC.setScalar(lo + rrS() * (hi - lo)).clone();
  const lying = (x, z) => slopeQuat(x, z, rrS() * TAU, 1);
  const awayFromRocks = (pad) => (x, z) => rocks.every(rk => Math.hypot(x - rk.x, z - rk.z) > rk.r * 0.9 + pad);
  try {
    if (isAmazon) {
      // fallen trunks: mossy, with shelf fungi – they rot slowly back into the soil
      addProp('log_amazon', samplePoints(NP(9), 10, 40, (x, z) => dryLand(1.5)(x, z) && awayFromRocks(1)(x, z), rrS)
        .map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.12, p.z), q: lying(p.x, p.z), s: V3(1, 1, 1).multiplyScalar(0.85 + rrS() * 0.5), c: grey(0.85, 1.05) })), { castShadow: true });
      addProp('rock_moss', samplePoints(NP(16), 6, 44, (x, z) => dryLand(0.8)(x, z) && rrS() < 0.4 + rockInfluence(x, z), rrS)
        .map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.15, p.z), q: lying(p.x, p.z), s: V3(1, 0.8 + rrS() * 0.5, 1).multiplyScalar(0.5 + rrS() * 0.8), c: grey(0.8, 1.05) })), { castShadow: true });
      addProp('mush_amazon', samplePoints(NP(34), 0, 44, (x, z) => dryLand(0.5)(x, z), rrS)
        .map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.02, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU, 0.4), s: V3(1, 1, 1).multiplyScalar(1.8 + rrS() * 1.2), c: grey(0.85, 1.1) })));
      if (WL !== null) addProp('river_stones', samplePoints(NP(40), 0, 46, (x, z) => { const d = waterDist(x, z); return d > -0.5 && d < 1.0; }, rrS)
        .map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.03, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU, 0.25), s: V3(1, 1, 1).multiplyScalar(0.9 + rrS() * 0.9), c: grey(0.85, 1.1) })));
    } else {
      // a fallen pine or oak branch; limestone rocks with lichen; mushrooms after the rains
      addProp('log_grove', samplePoints(NP(7), 12, 40, (x, z) => dryLand(1.5)(x, z) && awayFromRocks(1)(x, z), rrS)
        .map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.08, p.z), q: lying(p.x, p.z), s: V3(1, 1, 1).multiplyScalar(0.8 + rrS() * 0.45), c: grey(0.9, 1.05) })), { castShadow: true });
      addProp('rock_lime', samplePoints(NP(14), 6, 44, (x, z) => dryLand(0.8)(x, z) && rrS() < 0.3 + rockInfluence(x, z) * 1.5, rrS)
        .map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.18, p.z), q: lying(p.x, p.z), s: V3(1, 0.8 + rrS() * 0.4, 1).multiplyScalar(0.45 + rrS() * 0.7), c: grey(0.85, 1.0) })), { castShadow: true });
      addProp('rock_lime2', samplePoints(NP(18), 4, 44, (x, z) => dryLand(0.6)(x, z) && rrS() < 0.35 + rockInfluence(x, z) * 1.5, rrS)
        .map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.12, p.z), q: lying(p.x, p.z), s: V3(1, 1, 1).multiplyScalar(0.4 + rrS() * 0.6), c: grey(0.85, 1.0) })), { castShadow: true });
      addProp('mush_grove', samplePoints(NP(24), 0, 44, (x, z) => dryLand(0.5)(x, z), rrS)
        .map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.02, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU, 0.4), s: V3(1, 1, 1).multiplyScalar(1.8 + rrS() * 1.1), c: grey(0.9, 1.1) })));
      if (WL !== null) addProp('river_stones', samplePoints(NP(12), 0, 46, (x, z) => { const d = waterDist(x, z); return d > -0.4 && d < 0.8; }, rrS)
        .map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.03, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU, 0.25), s: V3(1, 1, 1).multiplyScalar(0.8 + rrS() * 0.6), c: C('#e8e0cc').multiplyScalar(0.9 + rrS() * 0.15) })));
    }
  } catch (e) { console.warn('ground props skipped', e); }

  // fallen fruit under the trees that are fruiting now: acorns under oaks, carob pods under carobs, Brazil-nut
  // capsules under Brazil-nut trees. game.js calls setFallenFruit() with the fruiting trees (see updateLight there).
  const FRUIT_CAP = 160;
  const fruitMeshes = {};
  const fruitM4 = new THREE.Matrix4(), fruitQ = new THREE.Quaternion(), fruitS = new THREE.Vector3(), fruitP = new THREE.Vector3();
  function setFallenFruit(list) {
    const per = {};
    for (const t of list || []) (per[t.kind] = per[t.kind] || []).push(t);
    for (const kind of new Set([...Object.keys(per), ...Object.keys(fruitMeshes)])) {
      let mesh = fruitMeshes[kind];
      const trees = per[kind] || [];
      if (!mesh) {
        if (!trees.length) continue;
        const geom = propGeometry(kind); if (!geom) continue;
        propMat = propMat || scatterMaterial('props', { sway: 0, rough: 0.85 });
        mesh = fruitMeshes[kind] = new THREE.InstancedMesh(geom, propMat, FRUIT_CAP);
        mesh.name = 'fruit-' + kind; mesh.frustumCulled = false; mesh.receiveShadow = true;
        root.add(mesh); track(geom);
      }
      let n = 0;
      for (const t of trees) {
        const rr = makeRng(Math.floor(t.x * 131 + t.z * 71) + 7);   // the same spots for the same tree
        const count = Math.round(clamp(t.amount, 0, 1) * (kind === 'brazil_pod' ? 3 : 5));
        for (let k = 0; k < count && n < FRUIT_CAP; k++) {
          const a = rr() * TAU, d = Math.sqrt(rr()) * Math.max(0.6, t.radius * 0.75);
          const x = t.x + Math.cos(a) * d, z = t.z + Math.sin(a) * d;
          if (isWater(x, z)) continue;
          fruitP.set(x, heightAt(x, z) - 0.01, z);
          fruitQ.copy(slopeQuat(x, z, rr() * TAU, 1));
          fruitS.setScalar((kind === 'acorns' ? 1.6 : kind === 'carob_pods' ? 1.5 : 1.4) * (0.85 + rr() * 0.4));
          fruitM4.compose(fruitP, fruitQ, fruitS);
          mesh.setMatrixAt(n++, fruitM4);
        }
      }
      mesh.count = n; mesh.visible = n > 0;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  // ───────────────────────────── lights
  const sunLight = new THREE.DirectionalLight(0xffffff, 3);
  sunLight.castShadow = true;
  const ss = pipeline.shadowSize || ({ low: 1024, medium: 2048, high: 4096 })[quality] || 2048;
  sunLight.shadow.mapSize.set(ss, ss);
  const sc = sunLight.shadow.camera;
  sc.left = -54; sc.right = 54; sc.top = 54; sc.bottom = -54; sc.near = 1; sc.far = 260;
  sunLight.shadow.bias = -0.0004; sunLight.shadow.normalBias = 0.05; sunLight.shadow.radius = 3;
  sunLight.target.position.set(0, 0, 0);
  root.add(sunLight, sunLight.target);
  const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x4a3b28, 1.0);
  root.add(hemi);
  const fog = new THREE.Fog(0xcde, 100, 520);
  const prevFog = scene.fog, prevBg = scene.background;
  scene.fog = fog; scene.background = null;

  const sun = { direction: V3(0, 1, 0), elevation: Math.PI / 2, light: sunLight };

  // ───────────────────────────── light shafts (god rays)
  const shaftU = {
    uTime: U.uTime, uNoise: U.uNoise, uCol: { value: C('#fff0c8') }, uGlobal: { value: 1 },
  };
  const shaftGeo = track(new THREE.CylinderGeometry(1, 1, 1, 20, 1, true));
  shaftGeo.translate(0, -0.5, 0);  // y ∈ [-1, 0]
  const shaftData = new Float32Array(MAX_SHAFTS * 3 * 3);
  shaftGeo.setAttribute('aShaft', new THREE.InstancedBufferAttribute(shaftData, 3));
  const shaftMat = track(new THREE.ShaderMaterial({
    uniforms: shaftU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: /* glsl */`
      attribute vec3 aShaft; // strength, layer, seed
      const float edgeR0 = 42.5; varying float vWr;
      varying float vT; varying float vFace; varying float vStr; varying float vLayer; varying vec2 vN; varying float vDist; varying float vInside;
      void main(){
        vec3 p = position;
        { // camera inside this beam? (view both walls → fade)
          vec3 o = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          vec3 ax = normalize(mat3(modelMatrix * instanceMatrix) * vec3(0.0, 1.0, 0.0));
          float rad = length((modelMatrix * instanceMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
          vec3 oc = cameraPosition - o; vec3 perp = oc - ax * dot(oc, ax);
          vInside = 1.0 - smoothstep(rad * 0.8, rad * 1.6, length(perp));
        }
        float t = -p.y; vT = t;
        p.xz *= mix(1.0, 1.35, t);
        vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.0);
        vec3 nW = normalize(mat3(modelMatrix * instanceMatrix) * vec3(position.x, 0.0, position.z));
        vec3 V = normalize(cameraPosition - w.xyz);
        vec3 axis = normalize(mat3(modelMatrix * instanceMatrix) * vec3(0.0, 1.0, 0.0));
        vec3 Vp = normalize(V - axis * dot(V, axis));
        vFace = abs(dot(nW, Vp));
        vStr = aShaft.x; vLayer = aShaft.y;
        vN = vec2(atan(position.z, position.x) * 0.5 + aShaft.z * 7.0, t);
        vec4 mv = viewMatrix * w; vDist = -mv.z; vWr = length(w.xz) - (edgeR0 + 1.5);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uGlobal; uniform sampler2D uNoise; uniform vec3 uCol;
      varying float vT; varying float vFace; varying float vStr; varying float vLayer; varying vec2 vN; varying float vDist; varying float vInside; varying float vWr;
      void main(){
        if (vWr > 3.0) discard;
        float edge = pow(vFace, vLayer < 0.5 ? 2.2 : vLayer < 1.5 ? 1.6 : 1.2);
        float ends = smoothstep(0.0, 0.12, vT) * (1.0 - smoothstep(0.75, 1.0, vT) * 0.55);
        float n = texture2D(uNoise, vec2(vN.x * 0.22 + uTime * 0.004, vN.y * 0.12 - uTime * 0.006)).b;
        float n2 = texture2D(uNoise, vec2(vN.x * 0.45 + 0.2, vN.y * 0.25 + uTime * 0.01)).g;
        float streak = 0.6 + 0.65 * smoothstep(0.25, 0.85, n * 0.75 + n2 * 0.35);
        float layerA = vLayer < 0.5 ? 0.24 : vLayer < 1.5 ? 0.1 : 0.035;
        float near = smoothstep(2.0, 14.0, vDist) * (0.4 + 0.6 * smoothstep(12.0, 45.0, vDist)) * (1.0 - 0.8 * vInside);
        edge *= mix(1.0, edge, 1.0 - smoothstep(10.0, 40.0, vDist)); // crisper beams up close
        float a = edge * ends * streak * layerA * vStr * uGlobal * near * (1.0 - smoothstep(-2.0, 3.0, vWr));
        vec3 col = mix(uCol, uCol * vec3(1.0, 0.92, 0.75), vT);
        gl_FragColor = vec4(col * a, 1.0);
      }`,
  }));
  const shaftMesh = new THREE.InstancedMesh(shaftGeo, shaftMat, MAX_SHAFTS * 3);
  shaftMesh.count = 0; shaftMesh.frustumCulled = false; shaftMesh.renderOrder = 10; shaftMesh.name = 'light-shafts';
  root.add(shaftMesh);

  // dust motes inside shafts
  const MOTES = qual.motes;
  const moteU = {
    uTime: U.uTime, uPx: U.uPx, uCol: shaftU.uCol, uGlobal: shaftU.uGlobal, uDir: { value: V3(0, -1, 0) },
    uTop: { value: Array.from({ length: MAX_SHAFTS }, () => new THREE.Vector4()) },
    uInfo: { value: Array.from({ length: MAX_SHAFTS }, () => new THREE.Vector4()) },
  };
  let moteMesh;
  {
    const n = MAX_SHAFTS * MOTES; const rr = makeRng(seed + 404);
    const slot = new Float32Array(n), rnd = new Float32Array(n * 4), pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { slot[i] = Math.floor(i / MOTES); rnd[i * 4] = rr(); rnd[i * 4 + 1] = rr() * TAU; rnd[i * 4 + 2] = Math.sqrt(rr()); rnd[i * 4 + 3] = rr(); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSlot', new THREE.BufferAttribute(slot, 1));
    g.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 4));
    const mat = new THREE.ShaderMaterial({
      uniforms: moteU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        uniform float uTime, uPx; uniform vec3 uDir; uniform vec4 uTop[${MAX_SHAFTS}]; uniform vec4 uInfo[${MAX_SHAFTS}];
        attribute float aSlot; attribute vec4 aRnd; varying float vA;
        void main(){
          int s = int(aSlot + 0.5);
          vec4 top = uTop[s]; vec4 info = uInfo[s];
          float L = info.x; float str = info.y;
          float u = fract(aRnd.x + uTime * (0.004 + aRnd.w * 0.006));
          vec3 ax = uDir;
          vec3 b1 = normalize(cross(ax, abs(ax.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
          vec3 b2 = cross(ax, b1);
          float ang = aRnd.y + uTime * (0.05 + 0.1 * aRnd.w) + sin(uTime * 0.3 + aRnd.w * 20.0) * 0.4;
          float rad = aRnd.z * top.w * mix(1.0, 1.35, u) * 0.9;
          vec3 p = top.xyz + ax * (L * u) + (b1 * cos(ang) + b2 * sin(ang)) * rad;
          p.y += sin(uTime * 0.7 + aRnd.w * 30.0) * 0.25;
          vec4 mv = viewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float tw = 0.5 + 0.5 * sin(uTime * (1.0 + aRnd.w * 3.0) + aRnd.x * 40.0);
          vA = str * (0.35 + 0.65 * tw) * smoothstep(0.0, 0.1, u) * (1.0 - smoothstep(0.85, 1.0, u)) * smoothstep(0.8, 3.0, -mv.z);
          gl_PointSize = (str > 0.0 ? 1.0 : 0.0) * clamp(uPx * (0.05 + 0.05 * aRnd.w) / -mv.z, 1.0, 14.0);
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uCol; uniform float uGlobal; varying float vA;
        void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(uCol * 1.6 * a * vA * uGlobal, 1.0); }`,
    });
    moteMesh = new THREE.Points(track(g), track(mat)); moteMesh.frustumCulled = false; moteMesh.renderOrder = 11; moteMesh.name = 'motes';
    root.add(moteMesh);
  }

  // ───────────────────────────── ambient particles (pollen by day, glow motes at night)
  let pollenMesh; const pollenU = { uTime: U.uTime, uPx: U.uPx, uWind: U.uWind, uDay: { value: 1 }, uNightA: { value: 0 }, uDayCol: { value: C('#fff6d8') }, uNightCol: { value: C(isAmazon ? '#9fffd0' : '#e8ff7a') }, uLight: U.uLightCol };
  {
    const n = qual.pollen; const rr = makeRng(seed + 505);
    const pos = new Float32Array(n * 3), rnd = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const th = rr() * TAU, r = Math.sqrt(rr()) * 40; const x = Math.cos(th) * r, z = Math.sin(th) * r;
      const night = i % 4 === 0;
      pos[i * 3] = x; pos[i * 3 + 1] = heightAt(x, z) + (night ? 0.4 + rr() * 2.5 : 0.5 + rr() * 12); pos[i * 3 + 2] = z;
      rnd[i * 4] = rr(); rnd[i * 4 + 1] = rr(); rnd[i * 4 + 2] = night ? 1 : 0; rnd[i * 4 + 3] = rr();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 4));
    const mat = new THREE.ShaderMaterial({
      uniforms: pollenU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        uniform float uTime, uPx, uWind, uDay, uNightA; attribute vec4 aRnd; varying float vA; varying float vNight;
        void main(){
          vec3 p = position; float ph = aRnd.x * 60.0;
          p.x += sin(uTime * 0.21 + ph) * 2.0 + uWind * sin(uTime * 0.5 + ph) * 3.0;
          p.z += cos(uTime * 0.17 + ph * 1.3) * 2.0;
          p.y += sin(uTime * 0.31 + ph * 0.7) * (aRnd.z > 0.5 ? 0.6 : 1.5);
          vec4 mv = viewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
          vNight = aRnd.z;
          float blink = smoothstep(0.55, 1.0, sin(uTime * (1.1 + aRnd.w) + ph));
          vA = aRnd.z > 0.5 ? uNightA * blink : uDay * 0.55;
          float sz = aRnd.z > 0.5 ? 0.16 : 0.06;
          gl_PointSize = vA > 0.001 ? clamp(uPx * sz / -mv.z, 1.0, 10.0) : 0.0;
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uDayCol, uNightCol, uLight; varying float vA; varying float vNight;
        void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d);
          vec3 c = vNight > 0.5 ? uNightCol * 3.0 : uDayCol * uLight * 0.9; gl_FragColor = vec4(c * a * vA, 1.0); }`,
    });
    pollenMesh = new THREE.Points(track(g), track(mat)); pollenMesh.frustumCulled = false; pollenMesh.renderOrder = 12; pollenMesh.name = 'pollen';
    root.add(pollenMesh);
  }

  // ───────────────────────────── mist banks (billboards)
  let mistMesh; const mistU = { uTime: U.uTime, uTex: { value: puffTex }, uCol: { value: C('#fff') }, uAmt: { value: 0.3 }, ...THREE.UniformsLib.fog };
  {
    const rr = makeRng(seed + 606);
    const items = [];
    const nm = isAmazon ? qual.mist : Math.ceil(qual.mist * 0.6);
    for (let i = 0; i < nm; i++) {
      const th = rr() * TAU; const r = 8 + rr() * 34; const x = Math.cos(th) * r, z = Math.sin(th) * r;
      items.push([x, heightAt(x, z) + 1.5 + rr() * 5, z, 10 + rr() * 16, rr(), 1]);
    }
    // wreath of mist hugging the island's base / below rim
    for (let i = 0; i < Math.ceil(nm * 0.6); i++) {
      const th = rr() * TAU; const r = 30 + rr() * 22; items.push([Math.cos(th) * r, -6 - rr() * 16, Math.sin(th) * r, 18 + rr() * 20, rr(), 2]);
    }
    if (waterfall) for (let i = 0; i < 6; i++) {
      const E = riverExit; const o = 2 + rr() * 4;
      items.push([E.x + E.dir.x * o + (rr() - 0.5) * 6, -12 - rr() * 18, E.z + E.dir.z * o + (rr() - 0.5) * 6, 7 + rr() * 8, rr(), 3]);
    }
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const a = new Float32Array(items.length * 4), b = new Float32Array(items.length * 2);
    items.forEach((it, i) => { a.set(it.slice(0, 4), i * 4); b[i * 2] = it[4]; b[i * 2 + 1] = it[5]; });
    g.setAttribute('aC', new THREE.InstancedBufferAttribute(a, 4));
    g.setAttribute('aR', new THREE.InstancedBufferAttribute(b, 2));
    g.instanceCount = items.length;
    const mat = new THREE.ShaderMaterial({
      uniforms: mistU, transparent: true, depthWrite: false, fog: true,
      vertexShader: /* glsl */`
        uniform float uTime; attribute vec4 aC; attribute vec2 aR; varying vec2 vUv2; varying float vKind; varying float vR;
        #include <fog_pars_vertex>
        void main(){
          vec3 c = aC.xyz;
          float sp = aR.y > 2.5 ? 0.0 : 1.0;
          c.x += sin(uTime * 0.02 + aR.x * 30.0) * 6.0 * sp; c.z += cos(uTime * 0.017 + aR.x * 20.0) * 6.0 * sp;
          if (aR.y > 2.5) c.y += fract(uTime * 0.05 + aR.x) * 4.0;
          vec4 mvPosition = viewMatrix * vec4(c, 1.0);
          mvPosition.xy += position.xy * aC.w * vec2(1.6, 0.8);
          vUv2 = position.xy + 0.5; vKind = aR.y; vR = aR.x;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */`
        uniform sampler2D uTex; uniform vec3 uCol; uniform float uAmt; varying vec2 vUv2; varying float vKind; varying float vR;
        #include <fog_pars_fragment>
        void main(){
          float a = texture2D(uTex, vUv2).a;
          float k = vKind < 1.5 ? uAmt : vKind < 2.5 ? (0.25 + uAmt * 0.5) : 0.55;
          gl_FragColor = vec4(uCol, a * k * 0.5);
          #include <fog_fragment>
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    mistMesh = new THREE.Mesh(track(g), track(mat)); mistMesh.frustumCulled = false; mistMesh.renderOrder = 20; mistMesh.name = 'mist';
    root.add(mistMesh);
  }

  // ───────────────────────────── rain
  let rainMesh; const rainU = { uTime: U.uTime, uWind: U.uWind, uAmt: { value: 0 }, uCol: { value: C('#c8d4e0') } };
  {
    const n = qual.rain; const rr = makeRng(seed + 707);
    const pos = new Float32Array(n * 2 * 3), end = new Float32Array(n * 2), rnd = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const th = rr() * TAU, r = Math.sqrt(rr()) * 52; const x = Math.cos(th) * r, z = Math.sin(th) * r, y = rr() * 60;
      for (let k = 0; k < 2; k++) { pos.set([x, y, z], (i * 2 + k) * 3); end[i * 2 + k] = k; rnd[i * 2 + k] = i / n; }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    g.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: rainU, transparent: true, depthWrite: false,
      vertexShader: /* glsl */`
        uniform float uTime, uWind, uAmt; attribute float aEnd; attribute float aRnd; varying float vA;
        void main(){
          vec3 p = position;
          float sp = 26.0 + aRnd * 8.0;
          p.y = mod(p.y - uTime * sp, 60.0) - 8.0;
          vec3 vel = vec3(uWind * 7.0 + 1.0, -sp, uWind * 2.0);
          p += aEnd * normalize(vel) * 1.1;
          vA = (aRnd < uAmt ? 1.0 : 0.0) * (0.35 + 0.65 * aEnd);
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */`uniform vec3 uCol; varying float vA; void main(){ if (vA < 0.01) discard; gl_FragColor = vec4(uCol, vA * 0.4); }`,
    });
    rainMesh = new THREE.LineSegments(track(g), track(mat)); rainMesh.frustumCulled = false; rainMesh.renderOrder = 30; rainMesh.visible = false; rainMesh.name = 'rain';
    root.add(rainMesh);
  }

  // lightning bolt
  const boltMat = track(new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 4.4, 6), transparent: true, opacity: 1, fog: false, depthWrite: false, side: THREE.DoubleSide }));
  const boltMesh = new THREE.Mesh(new THREE.BufferGeometry(), boltMat); boltMesh.visible = false; boltMesh.frustumCulled = false;
  root.add(boltMesh);
  let flashT = 99, boltSeed = 1;
  function makeBolt(cam) {
    const rr = makeRng(boltSeed++ * 13 + seed);
    // strike somewhere in front of the camera, beyond the island
    const fwd = V3(0, 0, -1); if (cam) cam.getWorldDirection(fwd); fwd.y = 0; if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1); fwd.normalize();
    const th = Math.atan2(fwd.z, fwd.x) + (rr() - 0.5) * 1.1; const dist = 150 + rr() * 90;
    const base = cam ? cam.position : V3();
    let p = V3(base.x + Math.cos(th) * dist, 90 + rr() * 30, base.z + Math.sin(th) * dist);
    const camDir = cam ? cam.position.clone().sub(p).setY(0).normalize() : V3(0, 0, 1);
    const side = V3(-camDir.z, 0, camDir.x);
    const pos = [];
    const addSeg = (a, b, w) => { pos.push(a.x - side.x * w, a.y, a.z - side.z * w, a.x + side.x * w, a.y, a.z + side.z * w, b.x + side.x * w * 0.8, b.y, b.z + side.z * w * 0.8, a.x - side.x * w, a.y, a.z - side.z * w, b.x + side.x * w * 0.8, b.y, b.z + side.z * w * 0.8, b.x - side.x * w * 0.8, b.y, b.z - side.z * w * 0.8); };
    let w = 1.3;
    while (p.y > -60) {
      const q = p.clone().add(V3((rr() - 0.5) * 14, -6 - rr() * 10, (rr() - 0.5) * 6)); addSeg(p, q, w);
      if (rr() < 0.18) { const br = q.clone().add(V3((rr() - 0.5) * 20, -10 - rr() * 10, 0)); addSeg(q, br, w * 0.5); }
      p = q; w *= 0.96;
    }
    boltMesh.geometry.dispose();
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    boltMesh.geometry = g;
  }

  // ───────────────────────────── fire
  const fireU = {
    uTime: U.uTime, uWind: U.uWind, uLight: U.uLightCol, uNoise: U.uNoise,
    uFireA: { value: Array.from({ length: MAX_FIRES }, () => new THREE.Vector4()) }, // x,y,z,r
    uFireB: { value: Array.from({ length: MAX_FIRES }, () => new THREE.Vector4()) }, // intensity
  };
  function fireBillboards(perFire, kind) {
    const n = perFire * MAX_FIRES; const rr = makeRng(seed + (kind === 'flame' ? 808 : 909));
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const a = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { const th = rr() * TAU, r = Math.sqrt(rr()); a.set([Math.floor(i / perFire), Math.cos(th) * r, Math.sin(th) * r, rr()], i * 4); }
    g.setAttribute('aF', new THREE.InstancedBufferAttribute(a, 4));
    g.instanceCount = n;
    return g;
  }
  const flameMat = track(new THREE.ShaderMaterial({
    uniforms: fireU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      uniform float uTime, uWind; uniform vec4 uFireA[${MAX_FIRES}]; uniform vec4 uFireB[${MAX_FIRES}]; attribute vec4 aF; varying vec2 vUv2; varying float vI; varying float vLife;
      void main(){
        int s = int(aF.x + 0.5); vec4 A = uFireA[s]; float I = uFireB[s].x;
        float life = fract(uTime * (0.9 + aF.w * 0.6) + aF.w * 7.0); vLife = life;
        vec3 c = A.xyz + vec3(aF.y, 0.0, aF.z) * A.w * 0.75;
        float size = (1.2 + 1.8 * I) * (0.7 + 0.3 * A.w) * (1.0 - life * 0.5) * (0.6 + aF.w * 0.6);
        c.y += life * size * 0.9;
        c.x += uWind * life * 0.8;
        vec4 mv = viewMatrix * vec4(c, 1.0);
        mv.xy += vec2(position.x * size * 0.75, position.y * size * 1.6);
        vUv2 = position.xy + vec2(0.5, 0.0); vI = I > 0.0 ? I : 0.0;
        gl_Position = I > 0.0 ? projectionMatrix * mv : vec4(0.0, 0.0, -2.0, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime; uniform sampler2D uNoise; varying vec2 vUv2; varying float vI; varying float vLife;
      void main(){
        vec2 p = vUv2; float x = (p.x - 0.5) * 2.0;
        float n = texture2D(uNoise, vec2(p.x * 0.5, p.y * 0.4 - uTime * 0.6)).r;
        float w = (1.0 - p.y) * 0.9 + 0.1;
        float shape = smoothstep(w, w * 0.3, abs(x + (n - 0.5) * 0.5 * p.y)) * smoothstep(0.0, 0.12, p.y) * (1.0 - smoothstep(0.55, 1.0, p.y + n * 0.3));
        vec3 col = mix(vec3(1.0, 0.7, 0.3), vec3(0.95, 0.22, 0.03), smoothstep(0.05, 0.5, p.y + (1.0 - shape) * 0.35));
        float a = shape * (1.0 - vLife) * vI;
        gl_FragColor = vec4(col * a * 0.9, 1.0);
      }`,
  }));
  const smokeMat = track(new THREE.ShaderMaterial({
    uniforms: { ...fireU, uTex: { value: puffTex } }, transparent: true, depthWrite: false,
    vertexShader: /* glsl */`
      uniform float uTime, uWind; uniform vec4 uFireA[${MAX_FIRES}]; uniform vec4 uFireB[${MAX_FIRES}]; attribute vec4 aF; varying vec2 vUv2; varying float vA;
      void main(){
        int s = int(aF.x + 0.5); vec4 A = uFireA[s]; float I = uFireB[s].x;
        float life = fract(uTime * (0.08 + aF.w * 0.05) + aF.w * 3.0);
        vec3 c = A.xyz + vec3(aF.y, 0.0, aF.z) * A.w * 0.6;
        c.y += 1.5 + life * (9.0 + A.w * 2.0) * (0.6 + I * 0.6);
        c.x += life * life * (3.0 + uWind * 10.0) + sin(uTime * 0.3 + aF.w * 9.0) * life * 1.5;
        float size = (1.4 + life * 6.0) * (0.6 + 0.6 * I);
        vec4 mv = viewMatrix * vec4(c, 1.0);
        mv.xy += (position.xy - vec2(0.0, 0.5)) * size;
        vUv2 = position.xy + vec2(0.5, 0.0);
        vA = (I > 0.0 ? 1.0 : 0.0) * smoothstep(0.0, 0.15, life) * (1.0 - life) * min(I * 1.5, 1.0);
        gl_Position = I > 0.0 ? projectionMatrix * mv : vec4(0.0, 0.0, -2.0, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uTex; uniform vec3 uLight; varying vec2 vUv2; varying float vA;
      void main(){ float a = texture2D(uTex, vUv2).a; gl_FragColor = vec4(vec3(0.2, 0.19, 0.18) * (0.6 + uLight * 0.8), a * vA * 0.75); }`,
  }));
  const flames = new THREE.Mesh(track(fireBillboards(qual.flames, 'flame')), flameMat); flames.frustumCulled = false; flames.renderOrder = 25; flames.visible = false;
  const smoke = new THREE.Mesh(track(fireBillboards(Math.round(qual.flames * 1.2), "smoke")), smokeMat); smoke.frustumCulled = false; smoke.renderOrder = 24; smoke.visible = false;
  root.add(flames, smoke);
  let embers;
  {
    const per = 30, n = per * MAX_FIRES; const rr = makeRng(seed + 1010);
    const pos = new Float32Array(n * 3), a = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { const th = rr() * TAU, r = Math.sqrt(rr()); a.set([Math.floor(i / per), Math.cos(th) * r, Math.sin(th) * r, rr()], i * 4); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aF', new THREE.BufferAttribute(a, 4));
    const mat = new THREE.ShaderMaterial({
      uniforms: { ...fireU, uPx: U.uPx }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        uniform float uTime, uWind, uPx; uniform vec4 uFireA[${MAX_FIRES}]; uniform vec4 uFireB[${MAX_FIRES}]; attribute vec4 aF; varying float vA;
        void main(){
          int s = int(aF.x + 0.5); vec4 A = uFireA[s]; float I = uFireB[s].x;
          float life = fract(uTime * (0.25 + aF.w * 0.3) + aF.w * 5.0);
          vec3 c = A.xyz + vec3(aF.y, 0.0, aF.z) * A.w * 0.8;
          c.y += 0.3 + life * (5.0 + aF.w * 6.0);
          c.x += sin(uTime * 2.0 + aF.w * 40.0) * life * 1.2 + uWind * life * 4.0; c.z += cos(uTime * 1.7 + aF.w * 30.0) * life * 1.2;
          vec4 mv = viewMatrix * vec4(c, 1.0); gl_Position = projectionMatrix * mv;
          vA = (I > 0.0 ? 1.0 : 0.0) * (1.0 - life) * (0.5 + 0.5 * sin(uTime * 15.0 + aF.w * 90.0));
          gl_PointSize = vA > 0.0 ? clamp(uPx * 0.07 / -mv.z, 1.0, 6.0) : 0.0;
        }`,
      fragmentShader: /* glsl */`varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(1.0, 0.5, 0.12) * 3.0 * smoothstep(0.5, 0.0, d) * vA, 1.0); }`,
    });
    embers = new THREE.Points(track(g), track(mat)); embers.frustumCulled = false; embers.renderOrder = 26; embers.visible = false;
    root.add(embers);
  }
  const scorch = []; // {x,z,r,a}

  // ───────────────────────────── distant birds (more with vitality)
  let birds;
  {
    const nB = 10;
    const g = new THREE.InstancedBufferGeometry();
    // simple V wing pair: body at origin, wing tips flap in shader by |x|
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.25, -1, 0, -0.1, 0, 0, -0.15, 0, 0, 0.25, 0, 0, -0.15, 1, 0, -0.1], 3));
    const a = new Float32Array(nB * 4); const rr = makeRng(seed + 1111);
    for (let i = 0; i < nB; i++) a.set([60 + rr() * 60, 32 + rr() * 26, rr() * TAU, rr()], i * 4);
    g.setAttribute('aB', new THREE.InstancedBufferAttribute(a, 4)); g.instanceCount = nB;
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: U.uTime, uCount: { value: 6 }, uCol: { value: C('#1a1a1a') }, ...THREE.UniformsLib.fog }, side: THREE.DoubleSide, fog: true,
      vertexShader: /* glsl */`uniform float uTime, uCount; attribute vec4 aB;
        #include <fog_pars_vertex>
        void main(){
          float id = float(gl_InstanceID);
          float ang = aB.z + uTime * (0.05 + aB.w * 0.04) * (mod(id, 2.0) < 1.0 ? 1.0 : -1.0);
          vec3 c = vec3(cos(ang) * aB.x, aB.y + sin(uTime * 0.3 + aB.w * 9.0) * 2.0, sin(ang) * aB.x);
          vec3 fwd = normalize(vec3(-sin(ang), 0.0, cos(ang)) * (mod(id, 2.0) < 1.0 ? 1.0 : -1.0));
          vec3 side = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
          vec3 p = position;
          p.y += abs(p.x) * sin(uTime * 6.0 + aB.w * 20.0) * 0.6;
          float sc = 0.7 + aB.w * 0.5;
          vec3 w = c + (side * p.x + fwd * p.z) * sc + vec3(0.0, p.y * sc, 0.0);
          if (id >= uCount) w = vec3(0.0, -1000.0, 0.0);
          vec4 mvPosition = viewMatrix * vec4(w, 1.0); gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */`uniform vec3 uCol;
        #include <fog_pars_fragment>
        void main(){ gl_FragColor = vec4(uCol, 1.0);
        #include <fog_fragment>
        #include <colorspace_fragment>
        }`,
    });
    birds = new THREE.Mesh(track(g), track(mat)); birds.frustumCulled = false; birds.name = 'birds';
    root.add(birds);
  }

  // ───────────────────────────── state & update
  const state = { wet: 0, vital: 1, rain: 0, flash: 0, mistAmt: 0.3, drought: 0, lastQuality: quality };
  const gaps = [];
  const sunDir = V3(0, 1, 0), moonDir = V3(0, -1, 0);
  const tmpQ = new THREE.Quaternion(), tmpM = new THREE.Matrix4(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3();
  const Y = V3(0, 1, 0); const _down = V3();
  const night = { v: 0 };
  const cZen = C('#000'), cHor = C('#000'), cGnd = C('#000'), cFog = C('#000');
  const sunWarm = C('#ff8a40'), sunGold = C('#ffc98a'), sunNoon = C('#fff3e0'), moonCol = C('#b6c8ff');
  const greyRain = C('#8a939e');   // a soft grey winter sky, not a gloomy one

  function computeSun(dayFrac) {
    const th = TAU * (dayFrac - 0.25);
    const maxEl = isAmazon ? 1.15 : 1.0;  // noon elevation (rad) ≈ 66° / 57°
    const el = Math.asin(Math.sin(th)) * maxEl / (Math.PI / 2);
    const az = th; // east (+x) → west (−x)
    sunDir.set(Math.cos(az) * Math.cos(el), Math.sin(el), -0.42 * Math.cos(el)).normalize();
    // re-normalise keeps y close to sin(el)
    moonDir.set(-sunDir.x * 0.9, -sunDir.y, 0.35).normalize();
    if (moonDir.y < 0.15) moonDir.y = 0.15 + (moonDir.y - 0.15) * 0.3;
    moonDir.normalize();
    return Math.asin(clamp(sunDir.y, -1, 1));
  }

  // constant colours used every frame: parsed once (no per-frame allocations / garbage collection pauses)
  const _ccache = new Map(), _cWhite = new THREE.Color();
  const CC = (h) => { let c = _ccache.get(h); if (!c) { c = new THREE.Color(h); _ccache.set(h, c); } return c; };
  function update(dt, ctx = {}) {
    dt = Math.min(dt || 0.016, 0.1);
    const t = ctx.t !== undefined ? ctx.t : (U.uTime.value + dt);
    U.uTime.value = t;
    const dayFrac = ctx.dayFrac !== undefined ? ctx.dayFrac : 0.5;
    const cam = ctx.camera || pipeline.camera;
    const rain = clamp(ctx.rain || 0), wind = clamp(ctx.wind !== undefined ? ctx.wind : 0.2);
    const vitality = ctx.vitality !== undefined ? clamp(ctx.vitality) : 1;
    const drought = clamp(ctx.drought || 0);

    // sun & sky
    const elev = computeSun(dayFrac);
    sun.direction.copy(sunDir); sun.elevation = elev;
    const e = sunDir.y;
    const pal = SKY_C[biome];
    samplePalette(pal, e, 'zen', cZen); samplePalette(pal, e, 'hor', cHor); samplePalette(pal, e, 'gnd', cGnd); samplePalette(pal, e, 'fog', cFog);
    state.rain = damp(state.rain, rain, 1.5, dt);
    const rn = state.rain;
    if (rn > 0.001) {
      const lum = 0.35 + 0.65 * smoothstep(-0.1, 0.3, e);
      tmpC.copy(greyRain).multiplyScalar(lum);
      cZen.lerp(tmpC, rn * 0.75); cHor.lerp(tmpC, rn * 0.6); cFog.lerp(tmpC, rn * 0.65); cGnd.lerp(tmpC, rn * 0.6);
    }
    night.v = smoothstep(0.02, -0.16, e);
    // sun colour
    const sc = tmpC2;
    if (e < 0.12) sc.copy(sunWarm).lerp(sunGold, smoothstep(-0.02, 0.12, e));
    else sc.copy(sunGold).lerp(sunNoon, smoothstep(0.12, 0.5, e));
    if (!isAmazon) sc.lerp(tmpC.set('#ffe2b0'), 0.35 * smoothstep(0.1, 0.5, e));   // warm clear Mediterranean sun
    else sc.lerp(tmpC.set('#fff0c0'), 0.2 * smoothstep(0.1, 0.5, e));
    U.uSunCol.value.copy(sc);
    skyU.uZen.value.copy(cZen); skyU.uHor.value.copy(cHor); skyU.uGnd.value.copy(cFog);
    skyU.uSunCol.value.copy(sc).multiplyScalar(1 - rn * 0.85);
    skyU.uSunAmt.value = smoothstep(-0.12, 0.02, e) * (1 - rn * 0.8);
    skyU.uMoonDir.value.copy(moonDir);
    skyU.uNight.value = night.v * (1 - rn * 0.9);
    skyU.uCloud.value = clamp((isAmazon ? 0.45 : 0.2) + rn * 0.8);
    skyU.uCloudCol.value.copy(cHor).lerp(CC('#ffffff'), 0.5 * (1 - night.v)).multiplyScalar(lerp(1, 0.55, rn));
    {   // distant landscape lighting: daylight tinted by the sun, dim blue at night, hazier in rain and morning mist
      const day = smoothstep(-0.05, 0.16, e);
      skyU.uPanoTint.value.setRGB(1, 1, 1).lerp(sc, 0.3 * day).multiplyScalar(0.16 + 0.84 * day * (1 - 0.3 * rn)).lerp(CC('#4a5d8e'), 0.5 * night.v);
      skyU.uPanoHazeAdd.value = clamp(rn * 0.55 + (isAmazon ? 0.12 : 0.05) * bump(dayFrac, 0.19, 0.25, 0.32, 0.42) + 0.15 * night.v);
    }

    // lights
    const dayAmt = smoothstep(-0.05, 0.16, e);
    const sunI = (isAmazon ? 3.0 : 3.35) * dayAmt * (1 - 0.6 * rn);
    // moonlight: bright enough to read the plants and animals at the darkest hour, still clearly night (Avi, 19.10)
    const moonI = (isAmazon ? 2.2 : 1.9) * night.v * (1 - 0.5 * rn);
    const useSun = e > -0.04;
    const ld = useSun ? sunDir : moonDir;
    sunLight.position.copy(ld).multiplyScalar(130);
    sunLight.target.position.set(0, 0, 0);
    if (useSun) { sunLight.color.copy(sc); sunLight.intensity = sunI; }
    else { sunLight.color.copy(moonCol); sunLight.intensity = moonI; }
    // hemisphere
    const hemiSky = tmpC.copy(cZen).lerp(cHor, 0.45);
    hemi.color.copy(hemiSky).lerp(CC('#ffffff'), 0.15 * dayAmt);
    hemi.groundColor.set(isAmazon ? '#56622a' : '#a0623e').multiplyScalar(0.25 + 0.75 * dayAmt).lerp(CC('#34436a'), night.v * 0.75);
    if (isAmazon) hemi.color.lerp(CC('#cfe0b0'), 0.18 * dayAmt);   // humid golden-green skylight
    // an overcast sky gives soft light from everywhere: the sky light grows a little as the sun hides (winter rain stays grey, not gloomy)
    hemi.intensity = lerp((1.35 + 0.4 * bump(e, -0.05, 0.02, 0.1, 0.25)) * (isAmazon ? 1.0 : 1.05), isAmazon ? 3.0 : 2.5, night.v) * (1 + 0.22 * rn * dayAmt - 0.1 * rn * night.v);
    // night: a bluish-silver glow in the air, so the island never goes black
    if (night.v > 0) hemi.color.lerp(CC('#8aa4e6'), night.v * 0.85);

    // lightning
    if (ctx.lightning) { flashT = 0; makeBolt(cam); }
    if (flashT < 1.2) {
      flashT += dt;
      const f = Math.exp(-flashT * 7) * (0.7 + 0.3 * Math.sin(flashT * 70)) + (flashT > 0.12 && flashT < 0.5 ? 0.55 * Math.exp(-(flashT - 0.12) * 9) : 0);
      state.flash = clamp(f, 0, 1.2);
      boltMesh.visible = flashT < 0.35; boltMat.opacity = clamp(1 - flashT / 0.35);
    } else { state.flash = 0; boltMesh.visible = false; }
    hemi.intensity += state.flash * 2.4;
    skyU.uFlash.value = state.flash * 0.35;

    // fog
    fog.color.copy(cFog).lerp(CC('#c8d4ff'), state.flash * 0.3);
    const haze = isAmazon ? 1 : 0;
    const morning = bump(dayFrac, 0.19, 0.25, 0.32, 0.42);
    const camDist = Math.max(cam.position.length(), 55);
    const fogNear = lerp(isAmazon ? camDist + 15 : camDist + 60, camDist * 0.45, rn) - morning * haze * camDist * 0.3;
    const fogFar = lerp(isAmazon ? camDist + 420 : camDist + 600, camDist + 160, rn) - morning * haze * 80;
    farMat.userData.haze.value = (isAmazon ? 0.16 : 0.12) + rn * 0.3 + morning * haze * 0.2 + night.v * 0.3;
    if (!isAmazon) farMat.userData.haze.value *= 0.6;   // dry clear Mediterranean air
    if (farCrowns) farCrowns.material.userData.haze.value = farMat.userData.haze.value * 0.85;
    fog.near = fogNear; fog.far = fogFar;
    mistSeaU.uLit.value.copy(cHor).lerp(sc, 0.3 * dayAmt).lerp(CC('#ffffff'), 0.45 * dayAmt).multiplyScalar(lerp(1.08, 0.6, rn));
    mistSeaU.uShade.value.copy(cZen).lerp(cHor, 0.45).multiplyScalar(0.72);
    mistSeaU.uDensity.value = (isAmazon ? 0.4 + morning * 0.18 : 0.3 + morning * 0.15) + rn * 0.4;
    mistSea2.position.y = (isAmazon ? -24 : -22) + Math.sin(t * 0.05) * 0.6;
    { const k = (mistSea.position.y + 4) / Math.max(sunDir.y, 0.15); mistSeaU.uIsland.value.set(sunDir.x * k, sunDir.z * k, 44 * (1 + (1 - Math.max(sunDir.y, 0.15)) * 0.4)); if (sunDir.y < 0) mistSeaU.uIsland.value.z = 0.001; }

    // light level for unlit shaders
    const lightLvl = 0.22 + 0.95 * dayAmt * (1 - 0.4 * rn) + 0.4 * night.v;
    U.uLightCol.value.copy(hemiSky).lerp(sc, 0.4 * dayAmt).multiplyScalar(lightLvl).lerp(_cWhite.setRGB(lightLvl, lightLvl, lightLvl), 0.4);
    U.uSkyCol.value.copy(cHor).lerp(cZen, 0.4).multiplyScalar(0.95);
    waterU.uNight.value = night.v;

    // wind / wet / vitality
    U.uWind.value = damp(U.uWind.value, wind, 1.2, dt);
    state.wet = rn > state.wet ? damp(state.wet, rn, 1.0, dt) : damp(state.wet, rn, 0.04, dt);
    U.uWet.value = state.wet;
    updateTreeShadowStrength();
    state.vital = damp(state.vital, vitality, 1.2, dt);
    U.uVital.value = state.vital;
    state.drought = damp(state.drought, drought, 1.0, dt);

    // seasons (grove)
    if (!isAmazon) {
      const si = ['winter', 'spring', 'summer', 'autumn'].indexOf(ctx.season || 'spring');
      const p = (si < 0 ? 1 : si) + clamp(ctx.seasonFrac || 0);
      const y = sampleYear(p);
      const dr = state.drought;
      const dryC = CC('#c4a160');
      G.uGrass.value.copy(y.grass).lerp(dryC, dr * 0.75);
      G.uGrass2.value.copy(y.dry).lerp(CC('#b08e58'), dr * 0.75);
      G.uCoverAmt.value = y.cover * (1 - dr * 0.25);
      G.uSoilWet.value = Math.max(y.soilWet * (1 - dr), state.wet * 0.8);
      // grass tufts colour & height
      if (scatterRefs.grass) {
        const gm = scatterRefs.grass.material;
        gm.color.copy(G.uGrass.value).multiplyScalar(1.05);
        gm.userData.uniforms.uScale.value = lerp(0.85, 1.1, smoothstep(0.2, 1.3, p) * (1 - smoothstep(2.6, 3.6, p))) * (1 - dr * 0.2);
      }
      const bloomK = (1 - dr * 0.85) * lerp(0.5, 1, state.vital);
      if (scatterRefs.flower) {
        const b = scatterRefs.flower.material.userData.uniforms.uBloom.value;
        b.set(bump(p, 0.35, 0.75, 1.45, 1.85) * bloomK,      // red anemone: mid-winter → early spring
          bump(p, 1.0, 1.25, 1.75, 2.05) * bloomK,          // yellow (chrysanthemum): spring
          bump(p, 0.7, 1.0, 1.6, 1.9) * bloomK,             // white: late winter / spring
          bump(p, 2.65, 2.85, 3.2, 3.45) * (1 - dr * 0.3)); // tall white squill-like: end of summer
      }
      if (scatterRefs.thistle) {
        const tm = scatterRefs.thistle.material;
        const grow = smoothstep(1.1, 1.8, p) * (1 - smoothstep(3.5, 3.95, p));
        tm.userData.uniforms.uScale.value = Math.max(0.0001, grow * (1 + dr * 0.1));
        tm.color.set('#7a9a42').lerp(CC('#c6a76a'), smoothstep(1.7, 2.2, p) + dr);
      }
      if (scatterRefs.bush) scatterRefs.bush.material.color.set('#ffffff').lerp(CC('#d8c8a0'), smoothstep(2.0, 2.8, p) * (1 - smoothstep(3.3, 3.9, p)) * 0.35 + dr * 0.3);
      // pool shrinks a little in summer / drought
      const low = smoothstep(2.0, 2.9, p) * (1 - smoothstep(3.4, 3.95, p)) * 0.18 + dr * 0.22;
      if (waterMeshes[0]) { waterMeshes[0].position.y = WL - low; const s = 1 - low * 0.6; waterMeshes[0].scale.set(s, 1, s); waterMeshes[0].position.x = pools[0].x * (1 - s); waterMeshes[0].position.z = pools[0].z * (1 - s); }
    } else {
      G.uSoilWet.value = 0.35 + state.wet * 0.5;
      G.uCoverAmt.value = 0.85 * (1 - state.drought * 0.3);
    }

    // shafts
    const shafts = ctx.shafts || [];
    const elevFade = smoothstep(0.06, 0.32, e) * (1 - 0.92 * rn);
    shaftU.uGlobal.value = elevFade;
    shaftU.uCol.value.copy(sc).lerp(CC('#fff2d0'), 0.25);
    G.uSpotCol.value.copy(sc).multiplyScalar(0.6 * elevFade);
    let ni = 0;
    const down = _down.copy(sunDir).negate();
    moteU.uDir.value.copy(down);
    for (let i = 0; i < MAX_SHAFTS; i++) {
      const s = shafts[i];
      const spot = G.uSpots.value[i];
      if (!s || elevFade <= 0.001 || !(s.strength > 0)) { spot.w = 0; moteU.uInfo.value[i].set(0, 0, 0, 0); continue; }
      const yTop = s.yTop !== undefined ? s.yTop : 30;
      let gh = heightAt(s.x, s.z);
      let L = 0, lx = s.x, lz = s.z;
      for (let k = 0; k < 3; k++) {
        L = Math.max(1, (yTop - gh) / Math.max(sunDir.y, 0.08));
        L = Math.min(L, 140);
        lx = s.x + down.x * L; lz = s.z + down.z * L; gh = Math.max(heightAt(lx, lz), -1.5);
      }
      const str = clamp(s.strength);
      const rad = Math.max(0.5, s.radius || 2);
      tmpQ.setFromUnitVectors(Y, sunDir);
      const layers = [0.5, 0.9, 1.7];
      for (let l = 0; l < 3; l++) {
        tmpS.set(rad * layers[l], L, rad * layers[l]);
        tmpM.compose(tmpP.set(s.x, yTop, s.z), tmpQ, tmpS);
        shaftMesh.setMatrixAt(ni, tmpM);
        shaftData[ni * 3] = str; shaftData[ni * 3 + 1] = l; shaftData[ni * 3 + 2] = (i * 0.37) % 1;
        ni++;
      }
      spot.set(lx, lz, rad * 1.5 + 0.5, str * 0.9);
      moteU.uTop.value[i].set(s.x, yTop, s.z, rad * 0.9);
      moteU.uInfo.value[i].set(L, str * elevFade, 0, 0);
    }
    shaftMesh.count = ni;
    if (ni > 0) { shaftMesh.instanceMatrix.needsUpdate = true; shaftGeo.attributes.aShaft.needsUpdate = true; }
    shaftMesh.visible = ni > 0; moteMesh.visible = ni > 0;

    // pixel scale for points
    const rnd = pipeline.renderer; const dh = rnd.getContext().drawingBufferHeight;
    U.uPx.value = dh / (2 * Math.tan(THREE.MathUtils.degToRad((cam.fov || 45) / 2)));

    // ambient particles
    pollenU.uDay.value = dayAmt * (1 - rn) * (isAmazon ? 0.8 : 1);
    let nightMotes = 0;
    if (isAmazon) nightMotes = 0.6;
    else { const s = ctx.season || 'spring'; nightMotes = s === 'spring' ? 1 : s === 'summer' ? 0.8 : 0.15; }
    pollenU.uNightA.value = Math.max(night.v, clamp(ctx.nightGlow || 0) * 0.8) * nightMotes * (1 - rn) * (0.5 + 0.5 * state.vital);

    // mist banks
    const mistTarget = isAmazon ? 0.08 + morning * 0.75 + rn * 0.5 + night.v * 0.25 : 0.05 + morning * (ctx.season === 'winter' ? 0.5 : 0.15) + rn * 0.4;
    state.mistAmt = damp(state.mistAmt, mistTarget, 0.5, dt);
    mistU.uAmt.value = state.mistAmt;
    mistU.uCol.value.copy(cHor).lerp(CC('#ffffff'), 0.35 * dayAmt).lerp(sc, 0.2 * dayAmt).multiplyScalar(0.55 + 0.5 * dayAmt).lerp(CC('#7088c0'), 0.4 * night.v);   // moonlit mist

    // rain
    rainU.uAmt.value = rn; rainMesh.visible = rn > 0.01;
    rainU.uCol.value.copy(U.uLightCol.value).multiplyScalar(1.1).lerp(CC('#ffffff'), state.flash);

    // fire & scorch
    const fires = ctx.fire || [];
    let anyFire = false;
    for (let i = 0; i < MAX_FIRES; i++) {
      const f = fires[i];
      if (f && f.intensity > 0) {
        anyFire = true;
        const r = f.r || 3;
        fireU.uFireA.value[i].set(f.x, heightAt(f.x, f.z), f.z, r);
        fireU.uFireB.value[i].set(clamp(f.intensity), 0, 0, 0);
        G.uFires.value[i].set(f.x, f.z, r, clamp(f.intensity));
        let sp = scorch.find(s => Math.hypot(s.x - f.x, s.z - f.z) < Math.max(s.r, r) * 0.6);
        if (!sp) {
          if (scorch.length >= MAX_SCORCH) { scorch.sort((a, b) => a.a - b.a); scorch.shift(); }
          sp = { x: f.x, z: f.z, r, a: 0 }; scorch.push(sp);
        }
        sp.r = Math.max(sp.r, r * 1.1); sp.a = Math.min(1, sp.a + dt * 0.25 * f.intensity); sp.hot = true;
      } else {
        fireU.uFireB.value[i].set(0, 0, 0, 0); G.uFires.value[i].set(0, 0, 0, 0);
      }
    }
    for (let i = scorch.length - 1; i >= 0; i--) { const s = scorch[i]; if (!s.hot) s.a -= dt / 360; s.hot = false; if (s.a <= 0) scorch.splice(i, 1); }
    for (let i = 0; i < MAX_SCORCH; i++) { const s = scorch[i]; if (s) U.uScorch.value[i].set(s.x, s.z, s.r, s.a); else U.uScorch.value[i].set(0, 0, 0, 0); }
    flames.visible = smoke.visible = embers.visible = anyFire;

    // gaps
    for (let i = 0; i < MAX_GAPS; i++) { const g = gaps[i]; if (g) G.uGaps.value[i].set(g.x, g.z, g.r, g.a); else G.uGaps.value[i].set(0, 0, 0, 0); }

    // birds by vitality (day only)
    birds.material.uniforms.uCount.value = Math.round(lerp(0, 10, state.vital) * dayAmt * (1 - rn));

    // sky follows camera
    sky.position.copy(cam.position);
  }

  function setLightOverlay(tex) {
    G.uOverlay.value = tex || null;
    G.uOverlayOn.value = tex ? 1 : 0;
  }
  function setGap(x, z, r, amount) {
    const i = gaps.findIndex(g => Math.hypot(g.x - x, g.z - z) < 0.5);
    if (amount <= 0) { if (i >= 0) gaps.splice(i, 1); return; }
    if (i >= 0) { gaps[i].r = r; gaps[i].a = clamp(amount); return; }
    if (gaps.length >= MAX_GAPS) gaps.shift();
    gaps.push({ x, z, r, a: clamp(amount) });
  }

  function isPlaceable(x, z) {
    const r = Math.hypot(x, z);
    if (r > R) return false;
    if (isWater(x, z)) return false;
    if (onRock(x, z, -0.1)) return false;
    if (nearBridge(x, z, 0.9)) return false;
    const e = 0.6;
    const gx = (heightAt(x + e, z) - heightAt(x - e, z)) / (2 * e), gz = (heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
    return Math.hypot(gx, gz) < 0.6;
  }

  function setQuality(q) {
    const qq = Q[q]; if (!qq) return;
    const full = Q[quality].scatter;
    for (const m of scatterMeshes) m.count = Math.max(1, Math.min(m.userData.fullCount, Math.round(m.userData.fullCount * qq.scatter / full)));
    for (const m of scatterMeshes) m.castShadow = qq.shadowScatter && ['bush', 'bigleaf', 'chunk'].some(k => m.name.endsWith(k));
    const s = ({ min: 512, low: 512, medium: 1024, high: 2048 })[q];
    if (sunLight.shadow.mapSize.x !== s) { sunLight.shadow.mapSize.set(s, s); if (sunLight.shadow.map) { sunLight.shadow.map.dispose(); sunLight.shadow.map = null; } }
  }

  function dispose() {
    scene.remove(root);
    scene.fog = prevFog; scene.background = prevBg;
    for (const d of disposables) d.dispose && d.dispose();
    boltMesh.geometry.dispose();
    root.traverse(o => { if (o.isInstancedMesh) o.dispose(); });
    if (sunLight.shadow.map) sunLight.shadow.map.dispose();
  }

  const water = isAmazon
    ? { path: riverPts.filter((p, i) => i % 2 === 0 || i === riverPts.length - 1).map(p => ({ x: p.x, z: p.z })), width: riverHW * 2, pools: pools.map(p => ({ x: p.x, z: p.z, r: p.r })) }
    : { pools: pools.map(p => ({ x: p.x, z: p.z, r: p.r })) };

  // ───────────────────────────── soft tree shadows (works on every quality tier, including those without shadow maps)
  const TS_N = 512;
  const tsCanvas = document.createElement('canvas'); tsCanvas.width = tsCanvas.height = TS_N;
  const tsCtx = tsCanvas.getContext('2d');
  const tsTex = track(new THREE.CanvasTexture(tsCanvas));
  tsTex.flipY = false; tsTex.colorSpace = THREE.NoColorSpace; tsTex.minFilter = THREE.LinearFilter; tsTex.magFilter = THREE.LinearFilter; tsTex.generateMipmaps = false;
  G.uTreeSh.value = tsTex;
  if (typeof window !== 'undefined') window.__treeShadowCanvas = tsCanvas;
  const tsSprite = new Image(); let tsReady = false, tsPending = null;
  tsSprite.onload = () => { tsReady = true; if (tsPending) setTreeShadows(...tsPending); };
  tsSprite.src = TREE_SHADOW;
  let tsStrength = 0;
  // crowns: [{x, z, top, bottom, radius, density}] in world units; sun: THREE.Vector3 (towards the sun)
  function setTreeShadows(crowns, sunDirIn) {
    if (!tsReady) { tsPending = [crowns, sunDirIn]; return; }
    const px = TS_N / (2 * R);                                  // pixels per metre
    const sy = Math.max(0.28, sunDirIn.y);                      // low sun → longer shadows (clamped)
    const ax = -sunDirIn.x / sy, az = -sunDirIn.z / sy;         // ground offset per metre of height
    const ang = Math.atan2(az, ax), stretch = 1 + Math.min(1.2, Math.hypot(ax, az) * 0.45);
    tsCtx.clearRect(0, 0, TS_N, TS_N);
    for (const c of crowns) {
      if (!c || c.radius < 0.45) continue;
      const h = (c.top + c.bottom) * 0.5 - heightAt(c.x, c.z);
      const ox = c.x + ax * h * 0.85, oz = c.z + az * h * 0.85;
      const rr = c.radius * 1.25 * px;
      tsCtx.save();
      tsCtx.globalAlpha = clamp(0.55 + 0.45 * (c.density ?? 0.7), 0.35, 1);
      tsCtx.translate((ox + R) * px, (oz + R) * px); tsCtx.rotate(ang); tsCtx.scale(stretch, 1);
      tsCtx.drawImage(tsSprite, -rr, -rr, rr * 2, rr * 2);
      tsCtx.restore();
      // small soft contact shade right at the trunk foot (does not move with the sun)
      const cr = Math.max(0.6, c.radius * 0.28) * px;
      const g = tsCtx.createRadialGradient((c.x + R) * px, (c.z + R) * px, 0, (c.x + R) * px, (c.z + R) * px, cr);
      g.addColorStop(0, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      tsCtx.fillStyle = g; tsCtx.beginPath(); tsCtx.arc((c.x + R) * px, (c.z + R) * px, cr, 0, Math.PI * 2); tsCtx.fill();
    }
    tsTex.needsUpdate = true;
  }
  // strength follows daylight; weaker when real shadow maps are on (then it only adds soft ambient shade)
  function updateTreeShadowStrength() {
    const day = smoothstep(-0.02, 0.2, sunDir.y);
    const realShadows = pipeline.renderer && pipeline.renderer.shadowMap.enabled;
    tsStrength = (realShadows ? 0.22 : 0.62) * day * (1 - 0.6 * (state.wet || 0)) + 0.06 * night.v;
    G.uTreeShK.value = quality === 'min' ? tsStrength * 0.85 : tsStrength;
  }

  const env = {
    biome, radius: R, root,
    heightAt, isWater, isPlaceable, waterLevel: WL, water,
    bridges: bridges.map(b => ({ ax: b.ax, az: b.az, bx: b.bx, bz: b.bz })), bridgeAt, walkRoute,
    rocks: rocks.map(r => ({ x: r.x, z: r.z, r: r.r, top: r.top })),
    groundMeshes: [groundMesh],
    waterMeshes,
    rockMeshes: [rockMesh],
    sun,
    update, setLightOverlay, setGap, setQuality, dispose, setTreeShadows, setFallenFruit,
    get night() { return night.v; },
  };
  update(0, { t: 0, dayFrac: 0.5 });
  return env;
}
