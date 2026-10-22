// Grove plants: the low shrubs, herbs and the mushroom (moved unchanged from grove-plants.js).
// Exports buildSage, buildRockrose, buildCyclamen, buildAnemone, buildMushroom (each (variant) => { geoms, info });
// petal is a local helper. Needs: kit.js.
import * as THREE from 'three';
import { makeRng, makeNoise2D, hashString, clamp, lerp } from '../../core/util.js';
import { V3, Col, UP, TAU, Geo, rndUnit, jit, lum, hash3, perp, tube, walk, ICO, blob, card, gem, lathe } from './kit.js';

// ---------------------------------------------------------------------------------------------------------------
// Low shrubs & herbs
export function buildSage(variant) {
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

export function buildRockrose(variant) {
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

export function buildCyclamen(variant) {
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

export function buildAnemone(variant) {
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

export function buildMushroom(variant) {
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
