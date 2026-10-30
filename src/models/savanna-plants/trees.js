// Savanna plants (1.4.2): the trees – the umbrella acacia, the baobab, the sausage tree, the sycamore fig, the marula and
// the doum palm. Each builder: (variant) => { geoms: { wood, leaves, flowers?, fruit?, seed? }, info } with the grove kit's
// helpers (src/models/grove-plants/kit.js), drawn by its PlantVisual (makePlantFrom). Origin at the trunk base, up +Y.
// Sizes are a little under the real trees (a game island), in the same proportion to each other and to the animals.
import { makeRng, makeNoise2D, hashString } from '../../core/util.js';
import { V3, Col, UP, TAU, Geo, jit, lum, tube, walk, blob, card, gem, taper, barkFn } from '../grove-plants/kit.js';
import { seedling } from '../desert-plants/parts.js';

const geomsOf = (o) => Object.fromEntries(Object.entries(o).map(([k, g]) => [k, g.build()]));

// a flat crown: many low, wide leaf blobs spread on a disc at height y (the acacia's umbrella, the marula's dome)
function flatCrown(leaves, rng, y, R, depth, cols, o = {}) {
  const crownC = new V3(0, y, 0), A = new Col(cols[0]), B = new Col(cols[1]);
  const n = o.n || 30;
  for (let i = 0; i < n; i++) {
    const a = i * 2.39996 + rng() * 0.4, rr = Math.sqrt((i + 0.5) / n) * R * 0.95;
    const c = new V3(Math.cos(a) * rr, y - (rr / R) * depth + rng.range(-0.1, 0.12) + (o.dome ? (1 - (rr / R) ** 2) * o.dome : 0), Math.sin(a) * rr);
    blob(leaves, c, rng.range(0.55, 0.85) * (o.size || 1), o.sy || 0.4, rng, { crownC, rx: R, ry: depth + 0.5, base: jit(A.clone().lerp(B, rng()), rng, 0.08), rank: rng.range(0.04, 0.96), center: c, spiky: o.spiky ?? 0.35, faceN: 0.25, aoLo: 0.55 });
  }
}

// the umbrella thorn acacia: a short trunk that splits into a few long limbs, and a very wide flat crown (giraffes browse it)
export function buildUmbrella(variant) {
  const rng = makeRng(hashString('umbrella') + variant * 7919), noise = makeNoise2D(41 + variant);
  const wood = new Geo(), leaves = new Geo(), flowers = new Geo(), fruit = new Geo(), seed = new Geo();
  const H = rng.range(6.0, 7.2), R = rng.range(4.2, 5.2);
  const bark = barkFn('#4e3e30', '#6e5a46', rng, noise, { fiss: 5 });
  const split = H * rng.range(0.32, 0.42);
  const trunk = walk(new V3(0, 0, 0), new V3(rng.range(-0.12, 0.12), 1, rng.range(-0.12, 0.12)), split, 4, rng, 0.06, 0.1);
  tube(wood, trunk.pts, taper(trunk.pts.length, 0.26, 0.2), 7, bark, {});
  const top = trunk.pts[trunk.pts.length - 1], perch = [];
  const nL = rng.int(4, 6);
  for (let i = 0; i < nL; i++) {
    const az = i / nL * TAU + rng.range(-0.3, 0.3), out = rng.range(0.55, 0.92);
    const end = new V3(Math.cos(az) * R * out, H - rng.range(0.3, 0.7), Math.sin(az) * R * out);
    const mid = top.clone().lerp(end, 0.45).add(new V3(0, 0.9, 0));
    const pts = [top.clone(), top.clone().lerp(mid, 0.5), mid, mid.clone().lerp(end, 0.5), end];
    tube(wood, pts, taper(pts.length, 0.15, 0.05), 5, bark, {});
    perch.push(end.clone().add(new V3(0, 0.25, 0)));
    for (let t = 0; t < 3; t++) {
      const a2 = az + rng.range(-0.8, 0.8), d = rng.range(0.6, 1.4);
      tube(wood, [end.clone(), end.clone().add(new V3(Math.cos(a2) * d * 0.5, 0.15, Math.sin(a2) * d * 0.5)), end.clone().add(new V3(Math.cos(a2) * d, 0.2, Math.sin(a2) * d))], [0.04, 0.025, 0.012], 3, bark, {});
    }
  }
  flatCrown(leaves, rng, H, R, 0.45, ['#748a40', '#8a9a4c'], { n: 34, sy: 0.32 });
  for (let i = 0; i < 50; i++) {
    const a = rng() * TAU, rr = Math.sqrt(rng()) * R * 0.9, c = new V3(Math.cos(a) * rr, H + 0.14 - (rr / R) * 0.4, Math.sin(a) * rr);
    gem(flowers, c, UP, 0.12, 0.07, 5, jit('#f4e8b0', rng, 0.06), new Col('#e0c880'), c, rng.range(0.04, 0.96));
  }
  for (let i = 0; i < 30; i++) {   // the coiled pods, eaten by many animals
    const a = rng() * TAU, rr = rng.range(0.4, 0.95) * R, c = new V3(Math.cos(a) * rr, H - 0.5 - (rr / R) * 0.4, Math.sin(a) * rr);
    const pts = []; for (let k = 0; k < 5; k++) pts.push(c.clone().add(new V3(Math.cos(k * 1.8) * 0.06, -k * 0.05, Math.sin(k * 1.8) * 0.06)));
    tube(fruit, pts, taper(5, 0.025, 0.015), 3, () => jit('#a8844a', rng, 0.08), { ce: c, rank: rng.range(0.04, 0.96) });
  }
  seedling(seed, rng, '#748a40', '#5e4a36', 0.5);
  const info = { H: H + 0.3, crownTop: H + 0.3, crownBottom: H - 0.9, crownR: R, trunkR: 0.26, perch: perch.slice(0, 8), attach: [], leafL: lum('#748a40'), flowerL: lum('#f4e8b0'), fruitL: lum('#a8844a'), seedH: 0.5 };
  return { geoms: geomsOf({ wood, leaves, flowers, fruit, seed }), info };
}

// the baobab: a huge bottle trunk that stores water, short stubby branches like roots in the air, few leaves (none in the
// dry season), big white flowers that open at night and long velvety fruit hanging on stalks
export function buildBaobab(variant) {
  const rng = makeRng(hashString('baobab') + variant * 7919), noise = makeNoise2D(53 + variant);
  const wood = new Geo(), leaves = new Geo(), flowers = new Geo(), fruit = new Geo(), seed = new Geo();
  const H = rng.range(7.5, 8.8), Rb = rng.range(1.25, 1.5);
  const bark = barkFn('#8a7a6a', '#a8988a', rng, noise, { fiss: 2, vert: 0.4 });
  // the trunk: fat at the base, a little waist, then a wide top where the branches start
  const n = 9, pts = [], rads = [];
  for (let i = 0; i <= n; i++) { const t = i / n; pts.push(new V3(Math.sin(t * 2) * 0.08, t * H * 0.72, 0)); rads.push(Rb * (1.0 - 0.28 * Math.sin(t * Math.PI * 0.9) + 0.12 * t)); }
  tube(wood, pts, rads, 14, bark, {});
  const top = pts[n], perch = [];
  const nB = rng.int(6, 8);
  for (let i = 0; i < nB; i++) {
    const az = i / nB * TAU + rng.range(-0.25, 0.25), L = rng.range(1.8, 2.8);
    const d = new V3(Math.cos(az), rng.range(0.55, 0.9), Math.sin(az)).normalize();
    const w = walk(top.clone().addScaledVector(new V3(Math.cos(az), 0, Math.sin(az)), Rb * 0.7), d, L, 4, rng, 0.25, 0.08);
    tube(wood, w.pts, taper(w.pts.length, 0.32, 0.08), 6, bark, {});
    const e = w.pts[w.pts.length - 1]; perch.push(e.clone());
    for (let t = 0; t < 2; t++) {
      const a2 = az + rng.range(-1, 1), ee = e.clone().add(new V3(Math.cos(a2) * 0.7, 0.5, Math.sin(a2) * 0.7));
      tube(wood, [e.clone(), e.clone().lerp(ee, 0.5).add(new V3(0, 0.1, 0)), ee], [0.08, 0.05, 0.025], 4, bark, {});
      blob(leaves, ee.clone().add(new V3(0, 0.15, 0)), rng.range(0.5, 0.75), 0.6, rng, { crownC: new V3(0, H, 0), rx: 3, ry: 1.5, base: jit('#6e8a3a', rng, 0.08), rank: rng.range(0.04, 0.96), center: ee, spiky: 0.3, faceN: 0.3, aoLo: 0.6 });
      gem(flowers, ee.clone().add(new V3(0, -0.15, 0)), new V3(0, -1, 0), 0.22, 0.12, 5, new Col('#f6f2e6'), new Col('#e6dcc4'), ee, rng.range(0.04, 0.96));
      const f0 = ee.clone().add(new V3(rng.range(-0.3, 0.3), -0.3, rng.range(-0.3, 0.3)));
      tube(fruit, [f0, f0.clone().add(new V3(0, -0.3, 0))], [0.01, 0.01], 3, () => new Col('#6a5a3a'), { ce: f0, rank: 0.5 });
      gem(fruit, f0.clone().add(new V3(0, -0.5, 0)), UP, 0.36, 0.09, 6, jit('#b8a878', rng, 0.06), new Col('#9a8a5e'), f0, rng.range(0.04, 0.96));
    }
  }
  seedling(seed, rng, '#6e8a3a', '#8a7a6a', 0.45);
  const info = { H: H + 1.4, crownTop: H + 1.4, crownBottom: H * 0.68, crownR: 3.2, trunkR: Rb, perch, attach: [], leafL: lum('#6e8a3a'), flowerL: lum('#f6f2e6'), fruitL: lum('#b8a878'), seedH: 0.45 };
  return { geoms: geomsOf({ wood, leaves, flowers, fruit, seed }), info };
}

// the sausage tree: a spreading crown, dark red flowers on long hanging cords, and huge grey "sausage" fruit
export function buildKigelia(variant) {
  const rng = makeRng(hashString('kigelia') + variant * 7919), noise = makeNoise2D(61 + variant);
  const wood = new Geo(), leaves = new Geo(), flowers = new Geo(), fruit = new Geo(), seed = new Geo();
  const H = rng.range(6.2, 7.0), R = rng.range(3.2, 3.8);
  const bark = barkFn('#7a7060', '#9a9080', rng, noise, { fiss: 3 });
  const trunk = walk(new V3(0, 0, 0), UP, H * 0.45, 4, rng, 0.05, 0.05);
  tube(wood, trunk.pts, taper(trunk.pts.length, 0.3, 0.22), 8, bark, {});
  const top = trunk.pts[trunk.pts.length - 1], perch = [];
  for (let i = 0; i < 5; i++) {
    const az = i / 5 * TAU + rng.range(-0.3, 0.3), end = new V3(Math.cos(az) * R * 0.7, H * 0.82, Math.sin(az) * R * 0.7);
    const pts = [top.clone(), top.clone().lerp(end, 0.5).add(new V3(0, 0.3, 0)), end];
    tube(wood, pts, [0.16, 0.1, 0.05], 5, bark, {}); perch.push(end.clone());
  }
  const crownC = new V3(0, H * 0.85, 0);
  for (let i = 0; i < 26; i++) {
    const a = i * 2.39996, rr = Math.sqrt((i + 0.5) / 26) * R, c = new V3(Math.cos(a) * rr, H * 0.82 + (1 - (rr / R) ** 2) * 1.0 + rng.range(-0.2, 0.2), Math.sin(a) * rr);
    blob(leaves, c, rng.range(0.7, 1.0), 0.6, rng, { crownC, rx: R, ry: 1.4, base: jit('#4e7a2e', rng, 0.08), rank: rng.range(0.04, 0.96), center: c, spiky: 0.28, faceN: 0.3, aoLo: 0.5 });
  }
  for (let i = 0; i < 14; i++) {   // the fruit (and the flowers before them) hang on long cords below the crown
    const a = rng() * TAU, rr = rng.range(0.4, 0.9) * R, p0 = new V3(Math.cos(a) * rr, H * 0.78 - rng.range(0, 0.3), Math.sin(a) * rr);
    const L = rng.range(0.9, 1.6), p1 = p0.clone().add(new V3(0, -L, 0)), rank = rng.range(0.04, 0.96);
    tube(fruit, [p0, p0.clone().lerp(p1, 0.5), p1], [0.012, 0.012, 0.012], 3, () => new Col('#5a5040'), { ce: p0, rank });
    gem(fruit, p1.clone().add(new V3(0, -0.28, 0)), UP, 0.6, 0.11, 7, jit('#9a9478', rng, 0.06), new Col('#7a7460'), p0, rank, { top: 0.4 });
    gem(flowers, p0.clone().add(new V3(0, -L * 0.6, 0)), new V3(0, -1, 0), 0.18, 0.08, 5, new Col('#8a1e22'), new Col('#5a1418'), p0, rank);
  }
  seedling(seed, rng, '#4e7a2e', '#7a7060', 0.5);
  const info = { H: H + 1.2, crownTop: H + 1.2, crownBottom: H * 0.7, crownR: R, trunkR: 0.3, perch, attach: [], leafL: lum('#4e7a2e'), flowerL: lum('#8a1e22'), fruitL: lum('#9a9478'), seedH: 0.5 };
  return { geoms: geomsOf({ wood, leaves, flowers, fruit, seed }), info };
}

// the sycamore fig (שקמה): a thick short trunk with buttresses, a wide dense dome, and figs in clusters on the trunk and limbs
export function buildSycamore(variant) {
  const rng = makeRng(hashString('sycamore') + variant * 7919), noise = makeNoise2D(67 + variant);
  const wood = new Geo(), leaves = new Geo(), fruit = new Geo(), seed = new Geo();
  const H = rng.range(6.5, 7.5), R = rng.range(4.0, 4.6);
  const bark = barkFn('#a09a7a', '#b8ae8a', rng, noise, { fiss: 2, vert: 0.6 });
  const trunk = walk(new V3(0, 0, 0), UP, H * 0.35, 4, rng, 0.04, 0.05);
  tube(wood, trunk.pts, taper(trunk.pts.length, 0.6, 0.45), 10, bark, {});
  for (let b = 0; b < 4; b++) {   // buttress roots
    const a = b / 4 * TAU + rng(), e = new V3(Math.cos(a) * 1.1, 0.02, Math.sin(a) * 1.1);
    tube(wood, [new V3(Math.cos(a) * 0.3, 0.8, Math.sin(a) * 0.3), e.clone().lerp(new V3(0, 0.4, 0), 0.4), e], [0.2, 0.14, 0.06], 5, bark, {});
  }
  const top = trunk.pts[trunk.pts.length - 1], perch = [];
  for (let i = 0; i < 6; i++) {
    const az = i / 6 * TAU + rng.range(-0.3, 0.3), end = new V3(Math.cos(az) * R * 0.75, H * 0.7, Math.sin(az) * R * 0.75);
    const pts = [top.clone(), top.clone().lerp(end, 0.5).add(new V3(0, 0.6, 0)), end];
    tube(wood, pts, [0.3, 0.18, 0.08], 6, bark, {}); perch.push(end.clone());
    for (let k = 0; k < 10; k++) {   // figs on the limbs
      const p = pts[0].clone().lerp(pts[1], rng()).add(new V3(rng.range(-0.25, 0.25), rng.range(-0.2, 0.1), rng.range(-0.25, 0.25)));
      gem(fruit, p, UP, 0.1, 0.06, 5, jit('#c89a5a', rng, 0.1), new Col('#a8703a'), p, rng.range(0.04, 0.96));
    }
  }
  const crownC = new V3(0, H * 0.8, 0);
  for (let i = 0; i < 40; i++) {
    const a = i * 2.39996, rr = Math.sqrt((i + 0.5) / 40) * R, c = new V3(Math.cos(a) * rr, H * 0.72 + (1 - (rr / R) ** 2) * 1.6 + rng.range(-0.2, 0.2), Math.sin(a) * rr);
    blob(leaves, c, rng.range(0.75, 1.05), 0.65, rng, { crownC, rx: R, ry: 1.8, base: jit('#4a6e2c', rng, 0.08), rank: rng.range(0.04, 0.96), center: c, spiky: 0.22, faceN: 0.3, aoLo: 0.45 });
  }
  seedling(seed, rng, '#4a6e2c', '#a09a7a', 0.5);
  const info = { H: H + 1.4, crownTop: H + 1.6, crownBottom: H * 0.55, crownR: R, trunkR: 0.6, perch, attach: [], leafL: lum('#4a6e2c'), flowerL: 0.1, fruitL: lum('#c89a5a'), seedH: 0.5 };
  return { geoms: geomsOf({ wood, leaves, fruit, seed }), info };
}

// the marula: a straight grey trunk and a rounded open crown; round yellow fruit that fall in the rains (elephants love them)
export function buildMarula(variant) {
  const rng = makeRng(hashString('marula') + variant * 7919), noise = makeNoise2D(71 + variant);
  const wood = new Geo(), leaves = new Geo(), fruit = new Geo(), seed = new Geo();
  const H = rng.range(6.0, 6.8), R = rng.range(3.0, 3.6);
  const bark = barkFn('#7a7268', '#9a9288', rng, noise, { fiss: 4 });
  const trunk = walk(new V3(0, 0, 0), UP, H * 0.5, 4, rng, 0.05, 0.06);
  tube(wood, trunk.pts, taper(trunk.pts.length, 0.28, 0.2), 8, bark, {});
  const top = trunk.pts[trunk.pts.length - 1], perch = [];
  for (let i = 0; i < 5; i++) {
    const az = i / 5 * TAU + rng.range(-0.3, 0.3), end = new V3(Math.cos(az) * R * 0.7, H * 0.85, Math.sin(az) * R * 0.7);
    tube(wood, [top.clone(), top.clone().lerp(end, 0.5).add(new V3(0, 0.4, 0)), end], [0.15, 0.09, 0.04], 5, bark, {}); perch.push(end.clone());
  }
  flatCrown(leaves, rng, H * 0.9, R, 0.2, ['#5a7e34', '#6e8e3e'], { n: 26, dome: 0.9, sy: 0.55, size: 1.1, spiky: 0.28 });
  for (let i = 0; i < 26; i++) {
    const a = rng() * TAU, rr = rng.range(0.3, 0.95) * R, c = new V3(Math.cos(a) * rr, H * 0.86 - rng.range(0, 0.4), Math.sin(a) * rr);
    gem(fruit, c, UP, 0.1, 0.07, 6, jit('#e8c444', rng, 0.08), new Col('#c89a2a'), c, rng.range(0.04, 0.96));
  }
  seedling(seed, rng, '#5a7e34', '#7a7268', 0.5);
  const info = { H: H + 1.0, crownTop: H + 1.0, crownBottom: H * 0.7, crownR: R, trunkR: 0.28, perch, attach: [], leafL: lum('#5a7e34'), flowerL: 0.1, fruitL: lum('#e8c444'), seedH: 0.5 };
  return { geoms: geomsOf({ wood, leaves, fruit, seed }), info };
}

// the doum palm: the only palm whose trunk forks (two or three times), each arm with its own crown of stiff fan leaves,
// and clusters of hard shiny orange-brown fruit
export function buildDoum(variant) {
  const rng = makeRng(hashString('doum') + variant * 7919);
  const wood = new Geo(), leaves = new Geo(), fruit = new Geo(), seed = new Geo();
  const H = rng.range(6.5, 7.5), perch = [];
  const ring = (t, a) => new Col('#6a5a40').lerp(new Col('#8a7650'), 0.5 + 0.5 * Math.sin(t * 70 + a * 2));
  const crowns = [];
  const fork = (start, dir, len, depth) => {
    const w = walk(start, dir, len, 4, rng, 0.04, 0.02);
    tube(wood, w.pts, taper(w.pts.length, depth ? 0.17 : 0.25, depth ? 0.14 : 0.2), 7, ring, {});
    const end = w.pts[w.pts.length - 1];
    if (depth < 1) {
      const side = new V3(rng.range(-1, 1), 0, rng.range(-1, 1)).normalize();
      fork(end, UP.clone().addScaledVector(side, 0.45).normalize(), len * 0.8, depth + 1);
      fork(end, UP.clone().addScaledVector(side, -0.45).normalize(), len * 0.75, depth + 1);
    } else crowns.push(end);
  };
  fork(new V3(0, 0, 0), UP, H * 0.45, 0);
  for (const top of crowns) {
    for (let i = 0; i < 12; i++) {   // fan leaves: a stalk and a round fan of stiff segments
      const az = i * 2.39996, up = rng.range(-0.1, 0.7);
      const d = new V3(Math.cos(az), up, Math.sin(az)).normalize(), stalkEnd = top.clone().addScaledVector(d, 0.8);
      tube(wood, [top.clone(), stalkEnd], [0.03, 0.02], 3, () => jit('#7a8a4a', rng, 0.06), {});
      const rank = rng.range(0.04, 0.96), side = new V3().crossVectors(d, UP).normalize();
      for (let k = -4; k <= 4; k++) {
        const ld = d.clone().addScaledVector(side, k * 0.22).addScaledVector(UP, 0.1).normalize();
        card(leaves, stalkEnd.clone().addScaledVector(ld, 0.45), UP.clone().lerp(d, 0.3).normalize(), 0.85, 0.09, rng, jit('#7e9850', rng, 0.08), stalkEnd, rank, { t: ld, fold: 0.3 });
      }
    }
    perch.push(top.clone());
    for (let k = 0; k < 12; k++) {
      const p = top.clone().add(new V3(rng.range(-0.3, 0.3), -rng.range(0.2, 0.6), rng.range(-0.3, 0.3)));
      gem(fruit, p, UP, 0.12, 0.07, 6, jit('#b8702a', rng, 0.1), new Col('#7a4418'), top, rng.range(0.04, 0.96));
    }
  }
  seedling(seed, rng, '#7e9850', '#6a5a40', 0.55, true);
  const topY = Math.max(...crowns.map((c) => c.y));
  const info = { H: topY + 1.0, crownTop: topY + 1.2, crownBottom: topY - 1.2, crownR: 2.6, trunkR: 0.25, perch, attach: [], leafL: lum('#7e9850'), flowerL: 0.1, fruitL: lum('#b8702a'), seedH: 0.6 };
  return { geoms: geomsOf({ wood, leaves, fruit, seed }), info };
}
