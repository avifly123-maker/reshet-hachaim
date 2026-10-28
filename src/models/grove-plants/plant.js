// Grove plants: per-species behaviour and the PlantVisual (moved unchanged from grove-plants.js).
// SPECIES: the seasonal keyframes of every species (sorted once at load); getVariant caches the geometry per species
// + variant in _variants (cleared by releaseCaches in index.js); makePlant(id, opts) builds the PlantVisual of
// CONTRACT.md §3. Needs: kit.js, woody.js, herbs.js.
import * as THREE from 'three';
import { makeRng, clamp, lerp, smoothstep } from '../../core/util.js';
import { V3, Col, UP, TAU, SEASON_INDEX, patchShader, makeUniforms, kf } from './kit.js';
import { WOODY, buildWoody } from './woody.js';
import { buildSage, buildRockrose, buildCyclamen, buildAnemone, buildMushroom } from './herbs.js';

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
export const _variants = new Map();
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

export function makePlant(id, opts = {}) {
  return makePlantFrom(id, SPECIES[id], (v) => getVariant(id, v), opts, 'grove-');
}

// 1.4: the same PlantVisual for another zone's plants (the desert: src/models/desert-plants/), given that zone's
// behaviour entry S (as in SPECIES above) and a getG(variant) → { geoms, info } built with the kit.js helpers.
export function makePlantFrom(id, S, getG, opts = {}, prefix = 'plant-') {
  const seed = (opts.seed ?? 1) | 0;
  const variant = ((seed % 3) + 3) % 3;
  const G = getG(variant);
  const info = G.info;
  const irng = makeRng(((seed * 2654435761) ^ 0x5bd1e995) >>> 0);
  const object = new THREE.Group(); object.name = prefix + id;
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
