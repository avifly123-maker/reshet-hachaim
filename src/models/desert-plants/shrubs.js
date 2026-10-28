// Desert plants (1.4): the shrubs – white broom (retama), saltbush, bean caper (zygophyllum), caper, apple of Sodom.
// Each builder: (variant) => { geoms, info } (see trees.js).
import { makeRng, hashString, lerp } from '../../core/util.js';
import { V3, Col, UP, TAU, Geo, jit, lum, tube, walk, blob, card, gem } from '../grove-plants/kit.js';

const shrubInfo = (H, R, perch, leaf, flower, fruit) => ({
  H, crownTop: H, crownBottom: 0.08, crownR: R, trunkR: 0.06, perch: perch.filter((p) => p.y > H * 0.45).slice(0, 5), attach: [],
  leafL: lum(leaf), flowerL: flower ? lum(flower) : 0.1, fruitL: fruit ? lum(fruit) : 0.1, seedH: 0.4,
});

// retama: a large round broom of thin green twigs, almost no leaves; small white flowers in spring
export function buildRetama(variant) {
  const rng = makeRng(hashString('retama') + variant * 7919);
  const wood = new Geo(), leaves = new Geo(), flowers = new Geo();
  const H = rng.range(1.9, 2.4), R = rng.range(1.3, 1.6), perch = [];
  const twig = new Col('#8ea468'), twig2 = new Col('#a2b47c');
  for (let s = 0; s < 34; s++) {
    const az = s * 2.39996 + rng() * 0.3, tilt = rng.range(0.15, 0.85);
    const dir = new V3(Math.cos(az) * Math.sin(tilt), Math.cos(tilt), Math.sin(az) * Math.sin(tilt));
    const w = walk(new V3(Math.cos(az) * 0.06, 0, Math.sin(az) * 0.06), dir, H * rng.range(0.85, 1.15), 5, rng, 0.06, 0.02);
    // the twigs bend down at their tips like a fountain
    const pts = w.pts.map((p, i) => p.clone().add(new V3(0, -Math.pow(i / 5, 2) * 0.35 * Math.sin(tilt) * H * 0.3, 0)));
    const c = twig.clone().lerp(twig2, rng()), rank = rng.range(0.04, 0.96);
    tube(leaves, pts, [0.03, 0.022, 0.016, 0.012, 0.009, 0.006], 3, (t) => c.clone().multiplyScalar(0.7 + 0.4 * t), { ce: pts[2], rank });
    if (s % 3 === 0) for (let k = 2; k < 6; k++) gem(flowers, pts[k].clone().add(new V3(0, 0.02, 0)), UP, 0.05, 0.025, 4, new Col('#fbf8ee'), new Col('#d8c8e0'), pts[k], rank);
    if (s % 6 === 0) perch.push(pts[3].clone());
  }
  tube(wood, [new V3(0, 0, 0), new V3(0, 0.25, 0)], [0.07, 0.05], 5, () => new Col('#5e5040'), {});
  return { geoms: { wood: wood.build(), leaves: leaves.build(), flowers: flowers.build() }, info: shrubInfo(H, R, perch, '#8ea468', '#fbf8ee') };
}

// saltbush: a dense mound of small silvery-grey leaves
export function buildSaltbush(variant) {
  const rng = makeRng(hashString('saltbush') + variant * 7919);
  const wood = new Geo(), leaves = new Geo();
  const H = rng.range(1.1, 1.4), R = rng.range(0.9, 1.15), crownC = new V3(0, H * 0.5, 0), perch = [];
  for (let s = 0; s < 8; s++) {
    const az = s / 8 * TAU, w = walk(new V3(0, 0, 0), new V3(Math.cos(az) * 0.8, 1, Math.sin(az) * 0.8), H * 0.8, 3, rng, 0.2, 0.05);
    tube(wood, w.pts, [0.035, 0.026, 0.018, 0.012], 3, () => jit('#7a6e5a', rng), {});
  }
  for (let i = 0; i < 24; i++) {
    const u = lerp(-0.3, 0.95, (i + rng()) / 24), az = i * 2.39996, rr = Math.sqrt(1 - u * u) * R * 0.8;
    const c = new V3(Math.cos(az) * rr, crownC.y + u * H * 0.45, Math.sin(az) * rr);
    blob(leaves, c, rng.range(0.28, 0.4), 0.85, rng, { crownC, rx: R, ry: H * 0.5, base: jit(rng() < 0.5 ? '#a8b4a2' : '#bcc4b4', rng, 0.06), rank: rng.range(0.04, 0.96), center: c, spiky: 0.4, faceN: 0.15, aoLo: 0.6 });
    if (i % 5 === 0) perch.push(c.clone().add(new V3(0, 0.2, 0)));
  }
  return { geoms: { wood: wood.build(), leaves: leaves.build() }, info: shrubInfo(H, R, perch, '#a8b4a2') };
}

// zygophyllum: a low grey-green shrub of stiff jointed stems with small fleshy leaflets
export function buildZygophyllum(variant) {
  const rng = makeRng(hashString('zygophyllum') + variant * 7919);
  const wood = new Geo(), leaves = new Geo(), flowers = new Geo();
  const H = rng.range(0.6, 0.8), R = rng.range(0.55, 0.7), perch = [];
  for (let s = 0; s < 14; s++) {
    const az = s * 2.39996, w = walk(new V3(0, 0, 0), new V3(Math.cos(az) * 0.9, 1, Math.sin(az) * 0.9), H * rng.range(0.9, 1.2), 4, rng, 0.25, 0.02);
    tube(wood, w.pts, [0.025, 0.019, 0.014, 0.01, 0.007], 3, () => jit('#7a7458', rng), {});
    const rank = rng.range(0.04, 0.96);
    for (let k = 1; k < 5; k++) for (const sg of [1, -1]) {
      const p = w.pts[k], d = new V3(Math.cos(az + sg * 1.4), 0.3, Math.sin(az + sg * 1.4)).normalize();
      gem(leaves, p.clone().addScaledVector(d, 0.04), d, 0.07, 0.025, 5, jit('#7e9a5c', rng, 0.08), new Col('#5e7a44'), w.pts[2], rank);
    }
    if (s % 3 === 0) gem(flowers, w.pts[4].clone(), UP, 0.05, 0.03, 5, new Col('#f2eedc'), new Col('#d8d0a0'), w.pts[4], rank);
    if (s % 4 === 0) perch.push(w.pts[4].clone());
  }
  return { geoms: { wood: wood.build(), leaves: leaves.build(), flowers: flowers.build() }, info: shrubInfo(H, R, perch, '#7e9a5c', '#f2eedc') };
}

// caper: long sprawling stems with round blue-green leaves; big white flowers with long purple stamens
export function buildCaper(variant) {
  const rng = makeRng(hashString('caper') + variant * 7919);
  const wood = new Geo(), leaves = new Geo(), flowers = new Geo();
  const H = rng.range(0.7, 0.9), R = rng.range(1.0, 1.3), perch = [];
  for (let s = 0; s < 9; s++) {
    const az = s / 9 * TAU + rng.range(-0.2, 0.2), w = walk(new V3(0, 0.05, 0), new V3(Math.cos(az), 0.55, Math.sin(az)), R * rng.range(0.9, 1.15), 5, rng, 0.18, -0.06);
    tube(wood, w.pts, [0.025, 0.02, 0.016, 0.012, 0.009, 0.006], 3, () => jit('#8a6a4a', rng), {});
    const rank = rng.range(0.04, 0.96);
    for (let k = 1; k < 6; k++) for (const sg of [1, -1]) {
      const p = w.pts[k], d = new V3(Math.cos(az + sg * 1.3), 0.4, Math.sin(az + sg * 1.3)).normalize();
      card(leaves, p.clone().addScaledVector(d, 0.06), UP.clone().lerp(d, 0.3).normalize(), 0.11, 0.1, rng, jit('#6e9a7a', rng, 0.08), w.pts[2], rank, { t: d, fold: 0.1 });
    }
    // a flower: four white petals around a burst of purple stamens
    const f = w.pts[4].clone().add(new V3(0, 0.08, 0)), frank = rng.range(0.04, 0.96);
    for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + az, d = new V3(Math.cos(a), 0.5, Math.sin(a)).normalize(); card(flowers, f.clone().addScaledVector(d, 0.06), UP, 0.1, 0.09, rng, new Col('#fbf7f0'), f, frank, { t: d, fold: 0.05, tipLight: 1 }); }
    for (let k = 0; k < 10; k++) { const a = k / 10 * TAU, d = new V3(Math.cos(a) * 0.6, 1, Math.sin(a) * 0.6).normalize(); tube(flowers, [f.clone(), f.clone().addScaledVector(d, 0.14)], [0.005, 0.004], 3, () => new Col('#a04aa8'), { ce: f, rank: frank }); }
    if (s % 3 === 0) perch.push(w.pts[3].clone());
  }
  return { geoms: { wood: wood.build(), leaves: leaves.build(), flowers: flowers.build() }, info: shrubInfo(H, R, perch, '#6e9a7a', '#fbf7f0') };
}

// apple of Sodom (calotropis): a tall shrub with big grey-green leaves, star flowers and balloon-like green fruit
export function buildCalotropis(variant) {
  const rng = makeRng(hashString('calotropis') + variant * 7919);
  const wood = new Geo(), leaves = new Geo(), flowers = new Geo(), fruit = new Geo();
  const H = rng.range(2.0, 2.5), R = rng.range(0.9, 1.2), perch = [];
  for (let s = 0; s < 5; s++) {
    const az = s / 5 * TAU + rng(), w = walk(new V3(0, 0, 0), new V3(Math.cos(az) * 0.3, 1, Math.sin(az) * 0.3), H * rng.range(0.85, 1.05), 4, rng, 0.1, 0.05);
    tube(wood, w.pts, [0.06, 0.05, 0.04, 0.03, 0.02], 4, () => jit('#a89a80', rng), {});
    const rank = rng.range(0.04, 0.96);
    for (let k = 1; k < 5; k++) for (const sg of [1, -1]) {
      const p = w.pts[k], d = new V3(Math.cos(az + sg * 1.57 + k), 0.2, Math.sin(az + sg * 1.57 + k)).normalize();
      card(leaves, p.clone().addScaledVector(d, 0.18), UP.clone().lerp(d, 0.5).normalize(), 0.34, 0.2, rng, jit('#9aac94', rng, 0.06), w.pts[2], rank, { t: d, fold: 0.2 });
    }
    const top = w.pts[4], frank = rng.range(0.04, 0.96);
    for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; gem(flowers, top.clone().add(new V3(Math.cos(a) * 0.08, 0.06, Math.sin(a) * 0.08)), UP, 0.06, 0.035, 5, new Col('#efe6f4'), new Col('#8a4a9a'), top, frank, { rot: a }); }
    if (s < 3) { const fp = w.pts[3].clone().add(new V3(Math.cos(az) * 0.2, -0.05, Math.sin(az) * 0.2)); blob(fruit, fp, 0.13, 1.1, rng, { crownC: fp, rx: 0.2, ry: 0.2, base: new Col('#9ab86a'), rank: rng.range(0.04, 0.96), center: fp, spiky: 0.04, faceN: 0.4, aoLo: 0.8, detail: 1 }); }
    perch.push(w.pts[3].clone());
  }
  return { geoms: { wood: wood.build(), leaves: leaves.build(), flowers: flowers.build(), fruit: fruit.build() }, info: shrubInfo(H, R, perch, '#9aac94', '#efe6f4', '#9ab86a') };
}
