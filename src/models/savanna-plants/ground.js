// Savanna plants (1.4.2): the low ones – the whistling thorn (a shrub with swollen hollow thorns where ants live), the tall
// red oat grass, the short star grass, papyrus by the river, and the termite mound (a building, not a plant, placed and
// growing like one, as the reef's corals are). Each builder: (variant) => { geoms, info } (see trees.js).
import { makeRng, makeNoise2D, hashString } from '../../core/util.js';
import { V3, Col, UP, TAU, Geo, jit, lum, tube, walk, blob, card, gem, taper, lathe, barkFn } from '../grove-plants/kit.js';
import * as THREE from 'three';

const geomsOf = (o) => Object.fromEntries(Object.entries(o).filter(([, g]) => g.tris).map(([k, g]) => [k, g.build()]));
const lowInfo = (H, R, leaf, flower, fruit, trunkR = 0.04) => ({ H, crownTop: H, crownBottom: 0.05, crownR: R, trunkR, perch: [], attach: [],
  leafL: lum(leaf), flowerL: flower ? lum(flower) : 0.1, fruitL: fruit ? lum(fruit) : 0.1, seedH: 0.25 });

// the whistling thorn: a low many-stemmed acacia with long white thorns and round black galls (the ants' homes)
export function buildWhistling(variant) {
  const rng = makeRng(hashString('whistling') + variant * 7919), noise = makeNoise2D(83 + variant);
  const wood = new Geo(), leaves = new Geo(), flowers = new Geo(), fruit = new Geo();
  const H = rng.range(1.9, 2.4), R = rng.range(1.2, 1.5);
  const bark = barkFn('#4a3a2e', '#5e4a3a', rng, noise, { fiss: 3 });
  const crownC = new V3(0, H * 0.7, 0), perch = [];
  for (let s = 0; s < 6; s++) {
    const az = s / 6 * TAU + rng.range(-0.3, 0.3);
    const w = walk(new V3(0, 0, 0), new V3(Math.cos(az) * 0.45, 1, Math.sin(az) * 0.45), H, 5, rng, 0.15, 0.02);
    tube(wood, w.pts, taper(w.pts.length, 0.05, 0.015), 4, bark, {});
    for (let k = 2; k < w.pts.length; k++) {
      const p = w.pts[k], rank = rng.range(0.04, 0.96);
      // the swollen thorns: dark round galls with a pair of white spines (the wind whistles through the ants' holes)
      if (rng() < 0.7) {
        const g = p.clone().add(new V3(rng.range(-0.08, 0.08), 0, rng.range(-0.08, 0.08)));
        gem(fruit, g, UP, 0.08, 0.05, 6, jit('#2e2620', rng, 0.1), new Col('#5a4a3a'), g, rank);
        for (const sg of [1, -1]) tube(wood, [g.clone(), g.clone().add(new V3(sg * 0.12, 0.02, sg * 0.04))], [0.008, 0.003], 3, () => new Col('#e8e2d4'), {});
      }
      blob(leaves, p.clone().add(new V3(0, 0.05, 0)), rng.range(0.25, 0.36), 0.5, rng, { crownC, rx: R, ry: H * 0.5, base: jit('#6e8a40', rng, 0.08), rank, center: p, spiky: 0.4, faceN: 0.3, aoLo: 0.55 });
      if (rng() < 0.4) gem(flowers, p.clone().add(new V3(0, 0.12, 0)), UP, 0.06, 0.05, 5, new Col('#f4eed8'), new Col('#e0d8b0'), p, rank);
    }
    perch.push(w.pts[w.pts.length - 1].clone());
  }
  const info = { ...lowInfo(H, R, '#6e8a40', '#f4eed8', '#2e2620', 0.06), crownBottom: 0.4, perch };
  return { geoms: geomsOf({ wood, leaves, flowers, fruit }), info };
}

// grass clumps: blades as thin cards from one base. tall: the red oat grass (knee to waist high, red-brown seed heads that
// turn rusty when dry); short: the star grass (a low lawn that grazers keep short)
function grassClump(variant, id, o) {
  const rng = makeRng(hashString(id) + variant * 7919);
  const leaves = new Geo(), flowers = new Geo();
  const R = o.R * rng.range(0.85, 1.1);
  for (let i = 0; i < o.n; i++) {
    const a = rng() * TAU, lean = rng.range(0.15, o.lean), L = o.H * rng.range(0.6, 1.0);
    const d = new V3(Math.cos(a) * lean, 1, Math.sin(a) * lean).normalize();
    const base = new V3(Math.cos(a) * R * rng() * 0.4, 0, Math.sin(a) * R * rng() * 0.4), rank = rng.range(0.04, 0.96);
    const mid = base.clone().addScaledVector(d, L * 0.5);
    card(leaves, mid, new V3(Math.cos(a + 1.57), 0, Math.sin(a + 1.57)), L, o.w, rng, jit(o.leaf, rng, 0.12), base, rank, { t: d, fold: 0.3, baseDark: 0.6, tipLight: 1.2 });
    if (o.head && rng() < 0.5) {   // a seed head on a thin stalk above the blades
      const tip = base.clone().addScaledVector(d, L * 1.25);
      card(flowers, tip, new V3(Math.cos(a + 1.57), 0, Math.sin(a + 1.57)), o.H * 0.28, 0.05, rng, jit(o.head, rng, 0.1), base, rank, { t: d, fold: 0.1 });
    }
  }
  return { geoms: geomsOf({ leaves, flowers }), info: lowInfo(o.H * 1.2, R, o.leaf, o.head) };
}
export const buildRedOat = (v) => grassClump(v, 'redoat', { n: 46, H: 1.15, R: 0.35, w: 0.035, lean: 0.4, leaf: '#8a9a44', head: '#9a4a2a' });
export const buildStarGrass = (v) => grassClump(v, 'stargrass', { n: 40, H: 0.28, R: 0.5, w: 0.03, lean: 0.9, leaf: '#6e9a3a', head: '#7a5a6a' });

// papyrus: tall green three-sided stems standing in the water, each ending in a round burst of thin threads
export function buildPapyrus(variant) {
  const rng = makeRng(hashString('papyrus') + variant * 7919);
  const wood = new Geo(), leaves = new Geo();
  const H = rng.range(2.4, 3.0), R = 0.6;
  for (let i = 0; i < 16; i++) {
    const a = rng() * TAU, b = new V3(Math.cos(a) * R * Math.sqrt(rng()), 0, Math.sin(a) * R * Math.sqrt(rng()));
    const d = new V3(b.x * 0.25, 1, b.z * 0.25).normalize(), L = H * rng.range(0.7, 1.0);
    const top = b.clone().addScaledVector(d, L);
    tube(wood, [b, b.clone().addScaledVector(d, L * 0.5), top], [0.025, 0.02, 0.012], 3, () => jit('#5e8a34', rng, 0.06), {});
    const rank = rng.range(0.04, 0.96);
    for (let k = 0; k < 14; k++) {   // the umbel: thin rays bursting from the top
      const az = k / 14 * TAU + rng() * 0.3, el = rng.range(0.2, 0.9);
      const rd = new V3(Math.cos(az) * Math.cos(el), Math.sin(el) * 0.6 - 0.1, Math.sin(az) * Math.cos(el)).normalize();
      card(leaves, top.clone().addScaledVector(rd, 0.22), UP, 0.46, 0.02, rng, jit('#7aa040', rng, 0.1), top, rank, { t: rd, fold: 0.05 });
    }
  }
  return { geoms: geomsOf({ wood, leaves }), info: { ...lowInfo(H + 0.3, R + 0.4, '#7aa040', null, null, 0.1), crownBottom: H - 0.4 } };
}

// the termite mound: a tall red-earth tower with buttresses and chimneys (the mound is the termites' air conditioner);
// it is all "wood" (it never loses leaves), lumpy, with darker vents near the top
export function buildTermiteMound(variant) {
  const rng = makeRng(hashString('termitemound') + variant * 7919), noise = makeNoise2D(97 + variant);
  const wood = new Geo();
  const H = rng.range(2.2, 2.8), Rb = rng.range(0.9, 1.1);
  const earth = new Col('#b0643a'), dark = new Col('#7a4026');
  const lump = (y, r) => r * (1 + 0.12 * noise(y * 3.1, r * 2 + variant));
  const prof = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12, y = t * H, r = Math.max(0.02, Rb * Math.pow(1 - t, 0.75) * (1 - 0.15 * Math.sin(t * 9)));
    prof.push({ r: lump(y, r), y, c: earth.clone().lerp(dark, Math.max(0, t - 0.6) * 1.2).multiplyScalar(0.9 + 0.2 * rng()) });
  }
  lathe(wood, prof, 14, new V3(0, 0, 0), new THREE.Quaternion(), new V3(0, H * 0.5, 0), 0.5);
  for (let c = 0; c < rng.int(2, 3); c++) {   // side chimneys
    const a = rng() * TAU, h0 = H * rng.range(0.35, 0.6), base = new V3(Math.cos(a) * Rb * 0.45, h0, Math.sin(a) * Rb * 0.45);
    const tip = base.clone().add(new V3(Math.cos(a) * 0.25, H * rng.range(0.3, 0.45), Math.sin(a) * 0.25));
    tube(wood, [base, base.clone().lerp(tip, 0.5), tip], [0.28, 0.18, 0.05], 8, (t) => earth.clone().lerp(dark, t * 0.6), {});
  }
  for (let b = 0; b < 5; b++) {   // buttresses at the foot
    const a = b / 5 * TAU + rng() * 0.5, e = new V3(Math.cos(a) * Rb * 1.25, 0.02, Math.sin(a) * Rb * 1.25);
    tube(wood, [new V3(Math.cos(a) * Rb * 0.6, H * 0.35, Math.sin(a) * Rb * 0.6), e.clone().lerp(new V3(0, H * 0.2, 0), 0.4), e], [0.25, 0.2, 0.08], 6, () => earth.clone().multiplyScalar(0.9 + 0.15 * rng()), {});
  }
  return { geoms: geomsOf({ wood }), info: { ...lowInfo(H, Rb * 1.2, '#b0643a', null, null, Rb * 0.7), crownBottom: 0.1 } };
}
