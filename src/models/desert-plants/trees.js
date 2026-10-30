// Desert plants (1.4): the tall ones – the umbrella acacia, the date palm, the tamarisk and the column cactus.
// Each builder: (variant) => { geoms: { wood, leaves, flowers?, fruit?, seed? }, info } with the grove kit's helpers
// (src/models/grove-plants/kit.js), drawn by its PlantVisual (makePlantFrom). Origin at the trunk base, up +Y.
import * as THREE from 'three';
import { makeRng, makeNoise2D, hashString, clamp, lerp } from '../../core/util.js';
import { V3, Col, UP, TAU, Geo, jit, lum, tube, walk, blob, card, gem, taper, barkFn } from '../grove-plants/kit.js';
import { ribbed, seedling } from './parts.js';

// the umbrella thorn: a short trunk that splits into a few limbs, and a wide flat crown
export function buildAcacia(variant) {
  const rng = makeRng(hashString('acacia') + variant * 7919), noise = makeNoise2D(17 + variant);
  const wood = new Geo(), leaves = new Geo(), flowers = new Geo(), fruit = new Geo(), seed = new Geo();
  const H = rng.range(4.6, 5.6), R = rng.range(3.0, 3.8);
  const bark = barkFn('#5e4a36', '#7a6248', rng, noise, { fiss: 4 });
  const split = H * rng.range(0.28, 0.38);
  const trunk = walk(new V3(0, 0, 0), new V3(rng.range(-0.1, 0.1), 1, rng.range(-0.1, 0.1)), split, 4, rng, 0.06, 0.1);
  tube(wood, trunk.pts, taper(trunk.pts.length, 0.2, 0.15), 7, bark, {});
  const top = trunk.pts[trunk.pts.length - 1];
  const crownC = new V3(0, H - 0.3, 0), rx = R, ry = 0.7;
  const perch = [], nL = rng.int(4, 5);
  for (let i = 0; i < nL; i++) {
    const az = i / nL * TAU + rng.range(-0.3, 0.3), out = rng.range(0.55, 0.9);
    const end = new V3(Math.cos(az) * R * out, H - rng.range(0.4, 0.8), Math.sin(az) * R * out);
    const mid = top.clone().lerp(end, 0.5).add(new V3(0, 0.4, 0));
    const pts = [top.clone(), top.clone().lerp(mid, 0.5), mid, mid.clone().lerp(end, 0.5), end];
    tube(wood, pts, taper(pts.length, 0.12, 0.04), 5, bark, {});
    perch.push(end.clone().add(new V3(0, 0.25, 0)));
    // thin twigs fanning out under the crown
    for (let t = 0; t < 3; t++) {
      const a2 = az + rng.range(-0.7, 0.7), d = rng.range(0.5, 1.2);
      const tw = [end.clone(), end.clone().add(new V3(Math.cos(a2) * d * 0.5, 0.15, Math.sin(a2) * d * 0.5)), end.clone().add(new V3(Math.cos(a2) * d, 0.22, Math.sin(a2) * d))];
      tube(wood, tw, [0.035, 0.022, 0.012], 3, bark, {});
    }
  }
  // the flat crown: many low wide blobs
  const leafA = new Col('#7f8f4c'), leafB = new Col('#94a058');
  const nB = 26;
  for (let i = 0; i < nB; i++) {
    const a = i * 2.39996 + rng() * 0.4, rr = Math.sqrt((i + 0.5) / nB) * R * 0.95;
    const c = new V3(Math.cos(a) * rr, H - 0.1 - (rr / R) * 0.5 + rng.range(-0.1, 0.12), Math.sin(a) * rr);
    blob(leaves, c, rng.range(0.6, 0.85), 0.42, rng, { crownC, rx, ry, base: jit(leafA.clone().lerp(leafB, rng()), rng, 0.08), rank: rng.range(0.04, 0.96), center: c, spiky: 0.35, faceN: 0.25, aoLo: 0.55 });
  }
  // cream puff flowers on top of the crown, and twisted pods hanging below it
  for (let i = 0; i < 46; i++) {
    const a = rng() * TAU, rr = Math.sqrt(rng()) * R * 0.9;
    const c = new V3(Math.cos(a) * rr, H + 0.12 - (rr / R) * 0.45, Math.sin(a) * rr);
    gem(flowers, c, UP, 0.12, 0.07, 5, jit('#f2e2a0', rng, 0.06), new Col('#e0c070'), c, rng.range(0.04, 0.96));
  }
  for (let i = 0; i < 34; i++) {
    const a = rng() * TAU, rr = rng.range(0.4, 0.95) * R;
    const c = new V3(Math.cos(a) * rr, H - 0.55 - (rr / R) * 0.45, Math.sin(a) * rr);
    const pts = []; for (let k = 0; k < 5; k++) pts.push(c.clone().add(new V3(Math.cos(k * 1.7) * 0.05, -k * 0.06, Math.sin(k * 1.7) * 0.05)));
    tube(fruit, pts, taper(5, 0.025, 0.015), 3, () => jit('#a07a40', rng, 0.08), { ce: c, rank: rng.range(0.04, 0.96) });
  }
  seedling(seed, rng, '#7f8f4c', '#6a5a40', 0.5);
  const info = {
    H: H + 0.3, crownTop: H + 0.3, crownBottom: H - 1.0, crownR: R, trunkR: 0.2,
    perch: perch.slice(0, 8), attach: [], leafL: lum('#7f8f4c'), flowerL: lum('#f2e2a0'), fruitL: lum('#a07a40'), seedH: 0.5,
  };
  return { geoms: { wood: wood.build(), leaves: leaves.build(), flowers: flowers.build(), fruit: fruit.build(), seed: seed.build() }, info };
}

// the date palm: a ringed trunk and a crown of long feather leaves, with clusters of dates under them
export function buildDatePalm(variant) {
  const rng = makeRng(hashString('datepalm') + variant * 7919);
  const wood = new Geo(), leaves = new Geo(), fruit = new Geo(), seed = new Geo();
  const H = rng.range(6.2, 7.4), lean = new V3(rng.range(-0.25, 0.25), 1, rng.range(-0.25, 0.25)).normalize();
  const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(lean.clone().multiplyScalar(H * t).add(new V3(0, 0, 0)).add(new V3(Math.sin(t * 2.2) * 0.15, 0, 0))); }
  // the trunk is covered with the bases of old leaves: rings of a lighter and a darker brown
  tube(wood, pts, taper(pts.length, 0.34, 0.27), 9, (t, a) => new Col('#6e5634').lerp(new Col('#9a7e52'), 0.5 + 0.5 * Math.sin(t * 90 + a * 3)), {});
  const top = pts[pts.length - 1];
  const crownC = top.clone(), rx = 3.4, ry = 1.6;
  const nF = 18, perch = [];
  for (let i = 0; i < nF; i++) {
    const az = i * 2.39996, up = i < 5 ? rng.range(0.55, 0.85) : rng.range(-0.15, 0.4);
    const L = rng.range(2.6, 3.4);
    const dir = new V3(Math.cos(az), up, Math.sin(az)).normalize();
    const spine = [];
    for (let k = 0; k <= 8; k++) { const t = k / 8; spine.push(top.clone().addScaledVector(dir, L * t).add(new V3(0, -t * t * L * 0.45, 0))); }
    tube(wood, spine, taper(9, 0.05, 0.012), 3, () => jit('#8a9050', rng, 0.06), {});
    const rank = rng.range(0.04, 0.96), side = new V3().crossVectors(dir, UP).normalize();
    for (let k = 2; k < 9; k++) {
      const p = spine[Math.min(8, k)], tg = spine[Math.min(8, k)].clone().sub(spine[k - 1]).normalize();
      for (const sg of [1, -1]) {
        const ld = side.clone().multiplyScalar(sg).addScaledVector(tg, 0.6).addScaledVector(UP, -0.15).normalize();
        card(leaves, p.clone().addScaledVector(ld, 0.32), UP.clone().lerp(side.clone().multiplyScalar(sg), 0.3).normalize(), 0.62, 0.07, rng, jit('#6f8a4a', rng, 0.1), spine[3], rank, { t: ld, fold: 0.5 });
      }
    }
    if (i < 6) perch.push(spine[3].clone());
  }
  // dates: a few heavy clusters under the crown
  for (let c = 0; c < 4; c++) {
    const az = c / 4 * TAU + rng(), base = top.clone().add(new V3(Math.cos(az) * 0.5, -0.4, Math.sin(az) * 0.5)), rank = rng.range(0.04, 0.96);
    for (let k = 0; k < 26; k++) {
      const p = base.clone().add(new V3(rng.range(-0.25, 0.25), -rng.range(0.1, 0.9), rng.range(-0.25, 0.25)));
      gem(fruit, p, UP, 0.09, 0.04, 5, jit('#d07a24', rng, 0.1), new Col('#8a3e18'), base, rank);
    }
  }
  seedling(seed, rng, '#6f8a4a', '#6e5634', 0.55, true);
  const info = {
    H: H + 1.4, crownTop: H + 1.6, crownBottom: H - 1.2, crownR: 3.0, trunkR: 0.34,
    perch, attach: [], leafL: lum('#6f8a4a'), fruitL: lum('#d07a24'), flowerL: 0.1, seedH: 0.6,
  };
  return { geoms: { wood: wood.build(), leaves: leaves.build(), fruit: fruit.build(), seed: seed.build() }, info };
}

// the tamarisk: a few leaning trunks and a soft, feathery grey-green crown with pink flower plumes
export function buildTamarisk(variant) {
  const rng = makeRng(hashString('tamarisk') + variant * 7919), noise = makeNoise2D(29 + variant);
  const wood = new Geo(), leaves = new Geo(), flowers = new Geo(), seed = new Geo();
  const H = rng.range(4.0, 4.8), crownC = new V3(0, H * 0.65, 0), rx = 2.3, ry = 1.5;
  const bark = barkFn('#5a4a3c', '#74604a', rng, noise, { fiss: 5 });
  const tips = [], perch = [];
  for (let i = 0; i < 3; i++) {
    const az = i / 3 * TAU + rng(), w = walk(new V3(Math.cos(az) * 0.15, 0, Math.sin(az) * 0.15), new V3(Math.cos(az) * 0.35, 1, Math.sin(az) * 0.35), H * 0.7, 5, rng, 0.12, 0.05);
    tube(wood, w.pts, taper(w.pts.length, 0.14, 0.05), 5, bark, {});
    tips.push(w.pts[w.pts.length - 1]); perch.push(w.pts[4].clone());
  }
  for (let i = 0; i < 30; i++) {
    const t = tips[i % 3], c = t.clone().add(new V3(rng.range(-1.5, 1.5), rng.range(-0.8, 0.9), rng.range(-1.5, 1.5)));
    blob(leaves, c, rng.range(0.45, 0.7), 1.0, rng, { crownC, rx, ry, base: jit(rng() < 0.5 ? '#8a9c84' : '#9aa890', rng, 0.08), rank: rng.range(0.04, 0.96), center: c, spiky: 0.55, faceN: 0.15, aoLo: 0.6 });
  }
  for (let i = 0; i < 40; i++) {
    const t = tips[i % 3], c = t.clone().add(new V3(rng.range(-1.6, 1.6), rng.range(-0.3, 1.1), rng.range(-1.6, 1.6)));
    gem(flowers, c, new V3(rng.range(-0.3, 0.3), 1, rng.range(-0.3, 0.3)).normalize(), 0.3, 0.06, 4, jit('#e8a8bc', rng, 0.08), new Col('#c87a96'), c, rng.range(0.04, 0.96));
  }
  seedling(seed, rng, '#8a9c84', '#5a4a3c', 0.45);
  const info = { H: H + 0.8, crownTop: H + 0.8, crownBottom: 1.2, crownR: 2.2, trunkR: 0.2, perch, attach: [], leafL: lum('#8a9c84'), flowerL: lum('#e8a8bc'), fruitL: 0.1, seedH: 0.45 };
  return { geoms: { wood: wood.build(), leaves: leaves.build(), flowers: flowers.build(), seed: seed.build() }, info };
}

// the column cactus: a tall ribbed column with one or two arms; white flowers on the tips
export function buildColumnCactus(variant) {
  const rng = makeRng(hashString('columncactus') + variant * 7919);
  const wood = new Geo(), leaves = new Geo(), flowers = new Geo(), seed = new Geo();
  const H = rng.range(4.6, 5.8), r = rng.range(0.32, 0.38);
  const green = (t) => new Col('#3f6e44').lerp(new Col('#5a8a52'), t * 0.6);
  // the body is the "leaves" part: it swells and thins with health like a leafy crown would
  ribbed(leaves, new V3(0, 0, 0), UP, H, (t) => r * (t < 0.06 ? lerp(0.85, 1, t / 0.06) : t > 0.9 ? Math.sqrt(Math.max(0, 1 - ((t - 0.9) / 0.1) ** 2)) * 0.98 + 0.02 : 1), 14, 0.12, green, 0.5);
  const perch = [new V3(0, H + 0.05, 0)], tips = [new V3(0, H, 0)];
  // no cross shapes: at most two arms, at clearly different heights and never opposite each other (seen from any side
  // the trunk and two level arms would read as a cross)
  const nA = rng.int(1, 2), az0 = rng.range(0, TAU);
  for (let i = 0; i < nA; i++) {
    const az = az0 + i * rng.range(1.2, 1.9), y0 = H * (i ? rng.range(0.56, 0.66) : rng.range(0.3, 0.4)), out = rng.range(0.5, 0.7), up = i ? rng.range(0.7, 1.1) : rng.range(1.2, 1.7);
    const d = new V3(Math.cos(az), 0, Math.sin(az));
    const a = new V3(0, y0, 0).addScaledVector(d, r * 0.6), b = a.clone().addScaledVector(d, out).add(new V3(0, 0.15, 0)), c = b.clone().add(new V3(0, up, 0));
    const pts = []; for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push(t < 0.5 ? a.clone().lerp(b, t * 2).add(new V3(0, Math.sin(t * Math.PI) * 0.12, 0)) : b.clone().lerp(c, (t - 0.5) * 2)); }
    for (let k = 1; k < pts.length; k++) ribbed(leaves, pts[k - 1], pts[k].clone().sub(pts[k - 1]).normalize(), pts[k].distanceTo(pts[k - 1]), () => r * 0.72, 12, 0.1, green, 0.5);
    perch.push(c.clone()); tips.push(c.clone());
  }
  for (const t of tips) for (let k = 0; k < 5; k++) { const a = k / 5 * TAU, p = t.clone().add(new V3(Math.cos(a) * 0.14, 0.04, Math.sin(a) * 0.14)); gem(flowers, p, UP, 0.16, 0.08, 6, new Col('#fbf6e8'), new Col('#f0d878'), t, rng.range(0.04, 0.96)); }
  seedling(seed, rng, '#4a7a48', '#4a7a48', 0.35, false, true);
  const info = { H: H + 0.2, crownTop: H + 0.2, crownBottom: 0.2, crownR: 1.0, trunkR: r, perch, attach: [], leafL: lum('#4a7a48'), flowerL: lum('#fbf6e8'), fruitL: 0.1, seedH: 0.35 };
  return { geoms: { wood: wood.build(), leaves: leaves.build(), flowers: flowers.build(), seed: seed.build() }, info };
}
