// Desert plants (1.4): the low ones – colocynth, rose of Jericho, the flowers after rain, the living soil crust and the
// barrel cactus. Each builder: (variant) => { geoms, info } (see trees.js).
import { makeRng, hashString } from '../../core/util.js';
import { V3, Col, UP, TAU, Geo, jit, lum, tube, walk, blob, card, gem } from '../grove-plants/kit.js';
import { ribbed } from './parts.js';

const lowInfo = (H, R, leaf, flower, fruit) => ({ H, crownTop: H, crownBottom: 0.02, crownR: R, trunkR: 0.03, perch: [], attach: [],
  leafL: lum(leaf), flowerL: flower ? lum(flower) : 0.1, fruitL: fruit ? lum(fruit) : 0.1, seedH: 0.2 });

// colocynth: a vine that crawls over the sand, lobed leaves and round striped gourds
export function buildColocynth(variant) {
  const rng = makeRng(hashString('colocynth') + variant * 7919);
  const wood = new Geo(), leaves = new Geo(), flowers = new Geo(), fruit = new Geo();
  const R = rng.range(1.0, 1.3);
  for (let s = 0; s < 6; s++) {
    const az = s / 6 * TAU + rng.range(-0.3, 0.3), w = walk(new V3(0, 0.02, 0), new V3(Math.cos(az), 0, Math.sin(az)), R * rng.range(0.8, 1.1), 6, rng, 0.25, 0);
    const pts = w.pts.map((p) => new V3(p.x, 0.03, p.z));
    tube(wood, pts, pts.map(() => 0.012), 3, () => jit('#6e8a3c', rng), {});
    const rank = rng.range(0.04, 0.96);
    for (let k = 1; k < pts.length; k++) {
      const d = new V3(Math.cos(az + (k % 2 ? 1 : -1)), 0, Math.sin(az + (k % 2 ? 1 : -1))).normalize();
      for (let l = 0; l < 3; l++) card(leaves, pts[k].clone().addScaledVector(d, 0.07).add(new V3(0, 0.04 + l * 0.01, 0)), UP, 0.12, 0.05, rng, jit('#7a9a48', rng, 0.08), pts[2], rank, { t: d.clone().applyAxisAngle(UP, (l - 1) * 0.6), fold: 0.1 });
    }
    if (s % 2 === 0) { const fp = pts[4].clone().add(new V3(0, 0.07, 0)); blob(fruit, fp, 0.08, 1, rng, { crownC: fp, rx: 0.1, ry: 0.1, base: new Col('#c8b44a'), rank: rng.range(0.04, 0.96), center: fp, spiky: 0.03, faceN: 0.5, aoLo: 0.8, detail: 1 }); }
    gem(flowers, pts[3].clone().add(new V3(0, 0.06, 0)), UP, 0.04, 0.03, 5, new Col('#f2d24a'), new Col('#c8a030'), pts[3], rank);
  }
  return { geoms: { wood: wood.build(), leaves: leaves.build(), flowers: flowers.build(), fruit: fruit.build() }, info: lowInfo(0.18, R, '#7a9a48', '#f2d24a', '#c8b44a') };
}

// rose of Jericho: a small grey-brown plant whose branches curl inwards when dry
export function buildAnastatica(variant) {
  const rng = makeRng(hashString('anastatica') + variant * 7919);
  const wood = new Geo(), leaves = new Geo(), flowers = new Geo();
  for (let s = 0; s < 9; s++) {
    const az = s / 9 * TAU, pts = [];
    for (let k = 0; k <= 4; k++) { const t = k / 4; pts.push(new V3(Math.cos(az) * 0.16 * Math.sin(t * 2.2), 0.02 + t * 0.12, Math.sin(az) * 0.16 * Math.sin(t * 2.2))); }
    tube(wood, pts, [0.012, 0.01, 0.008, 0.006, 0.004], 3, () => jit('#9a8a6a', rng), {});
    const rank = rng.range(0.04, 0.96);
    card(leaves, pts[2].clone(), UP, 0.06, 0.04, rng, jit('#8a9a6a', rng), pts[2], rank, { t: new V3(Math.cos(az), 0.3, Math.sin(az)), fold: 0.2 });
    gem(flowers, pts[3].clone(), UP, 0.025, 0.018, 4, new Col('#f8f6f0'), new Col('#e0d8c0'), pts[3], rank);
  }
  return { geoms: { wood: wood.build(), leaves: leaves.build(), flowers: flowers.build() }, info: lowInfo(0.16, 0.2, '#8a9a6a', '#f8f6f0') };
}

// flowers after rain: a little patch of green rosettes and bright flowers (yellow, purple, pink)
const BLOOM_COLS = ['#f4d23c', '#b46ad8', '#ec6aa0', '#f0f0e8', '#f4a03c'];
export function buildBlooms(variant) {
  const rng = makeRng(hashString('blooms') + variant * 7919);
  const leaves = new Geo(), flowers = new Geo();
  for (let i = 0; i < 9; i++) {
    const a = rng() * TAU, rr = Math.sqrt(rng()) * 0.5, c = new V3(Math.cos(a) * rr, 0.02, Math.sin(a) * rr), rank = rng.range(0.04, 0.96);
    for (let l = 0; l < 5; l++) { const d = new V3(Math.cos(l * 1.26 + a), 0.25, Math.sin(l * 1.26 + a)).normalize(); card(leaves, c.clone().addScaledVector(d, 0.05), UP, 0.09, 0.035, rng, jit('#6a9a44', rng, 0.1), c, rank, { t: d, fold: 0.2 }); }
    const top = c.clone().add(new V3(0, rng.range(0.1, 0.2), 0));
    tube(leaves, [c.clone(), top], [0.006, 0.004], 3, () => new Col('#5a8a3a'), { ce: c, rank });
    const fc = new Col(BLOOM_COLS[(i + variant) % BLOOM_COLS.length]);
    for (let p = 0; p < 5; p++) { const d = new V3(Math.cos(p * 1.26), 0.35, Math.sin(p * 1.26)).normalize(); card(flowers, top.clone().addScaledVector(d, 0.025), UP, 0.045, 0.035, rng, jit(fc, rng, 0.06), top, rank, { t: d, fold: 0.05, tipLight: 1.05 }); }
  }
  return { geoms: { leaves: leaves.build(), flowers: flowers.build() }, info: lowInfo(0.22, 0.55, '#6a9a44', '#f4d23c') };
}

// the living soil crust: a dark, knobbly skin on the sand (cyanobacteria, lichens and tiny mosses)
export function buildCrust(variant) {
  const rng = makeRng(hashString('crust') + variant * 7919);
  const leaves = new Geo();
  const crownC = new V3(0, 0, 0);
  for (let i = 0; i < 26; i++) {
    const a = rng() * TAU, rr = Math.sqrt(rng()) * 0.8, c = new V3(Math.cos(a) * rr, 0.005, Math.sin(a) * rr);
    blob(leaves, c, rng.range(0.1, 0.18), 0.18, rng, { crownC, rx: 0.9, ry: 0.1, base: jit(rng() < 0.3 ? '#6a7a4a' : rng() < 0.5 ? '#4a4434' : '#5c5440', rng, 0.1), rank: rng.range(0.04, 0.96), center: c, spiky: 0.5, faceN: 0.6, aoLo: 0.8 });
  }
  return { geoms: { leaves: leaves.build() }, info: lowInfo(0.05, 0.85, '#5c5440') };
}

// the barrel cactus: a round ribbed body with long spines, and a crown of flowers on its head
export function buildBarrelCactus(variant) {
  const rng = makeRng(hashString('barrelcactus') + variant * 7919);
  const leaves = new Geo(), flowers = new Geo();
  const H = rng.range(0.7, 0.95), r = rng.range(0.32, 0.4);
  ribbed(leaves, new V3(0, 0, 0), UP, H, (t) => r * (0.82 + 0.25 * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.8)) * (t > 0.85 ? Math.max(0.15, 1 - (t - 0.85) * 4) : 1), 18, 0.14,
    (t) => new Col('#4e7a48').lerp(new Col('#6a8e52'), t * 0.5), 0.5, { spine: '#d8a860' });
  const top = new V3(0, H, 0), fc = new Col(variant === 1 ? '#e84a3a' : '#f2c040');
  for (let k = 0; k < 9; k++) { const a = k / 9 * TAU, p = top.clone().add(new V3(Math.cos(a) * r * 0.45, 0.02, Math.sin(a) * r * 0.45)); gem(flowers, p, UP, 0.1, 0.05, 6, fc, new Col('#c87a2a'), top, rng.range(0.04, 0.96)); }
  return { geoms: { leaves: leaves.build(), flowers: flowers.build() }, info: { ...lowInfo(H + 0.1, r * 1.1, '#4e7a48', '#f2c040'), trunkR: r } };
}
