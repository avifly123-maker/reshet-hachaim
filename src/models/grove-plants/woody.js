// Grove plants: the woody plants, trees and shrubs (moved unchanged from grove-plants.js).
// WOODY holds the shape parameters of oak, terebinth, carob, pine, mastic and buckthorn; buildWoody(id, variant)
// grows trunk(s), limbs and leaf clusters, plus the per-species EXTRAS (acorns, pods, cones, flowers ...) and the
// seedling. Exports WOODY, buildWoody. Needs: kit.js.
import * as THREE from 'three';
import { makeRng, makeNoise2D, hashString, clamp, lerp } from '../../core/util.js';
import { V3, Col, UP, TAU, Geo, rndUnit, jit, lum, perp, tube, walk, curve, taper, blob, shade, card, gem, barkFn } from './kit.js';

// ---------------------------------------------------------------------------------------------------------------
// Woody plants (trees & shrubs) — trunk(s) → limbs → leaf clusters of blobs + cards
export const WOODY = {
  oak: {
    H: 10, stems: [2, 4], stemSpread: 0.42, bole: 0.9, trunkH: 2.4, trunkR: 0.36, lean: 0.1, gnarl: 0.3,
    crown: { cy: 6.3, rx: 4.3, ry: 3.0 }, clusters: [13, 14], clusterR: [1.2, 1.65], uRange: [-0.6, 0.95], shell: [0.48, 0.8],
    blobs: [4, 5], blobR: [0.68, 0.95], blobSy: 0.78, spiky: 0.26, limbs: [4, 5], bendUp: 0.16, limbGnarl: 1.0,
    leaf: '#3f5f2b', leaf2: '#324f24', cards: 7, cardLen: 0.4, cardWid: 0.26, twigs: 0, faceN: 0.12,
    bark: '#6a5c4e', bark2: '#463b33', fiss: 3, kTrunk: 7, seedling: 'broad', seedCol: '#4a6a30',
  },
  terebinth: {
    H: 9, stems: [1, 2], stemSpread: 0.5, bole: 0.5, trunkH: 2.2, trunkR: 0.3, lean: 0.12, gnarl: 0.22,
    crown: { cy: 5.9, rx: 5.0, ry: 2.4 }, clusters: [13, 14], clusterR: [1.2, 1.6], uRange: [-0.4, 0.95], shell: [0.55, 0.88],
    blobs: [4, 4], blobR: [0.58, 0.82], blobSy: 0.68, spiky: 0.3, limbs: [4, 5], bendUp: 0.1, limbGnarl: 0.8, limbOut: 0.62,
    leaf: '#55752f', leaf2: '#4a6a2a', cards: 7, cardLen: 0.46, cardWid: 0.17, twigs: 3, twigLen: 0.7, faceN: 0.12,
    bark: '#8a857c', bark2: '#5e5a54', fiss: 2, kTrunk: 7, seedling: 'pinnate', seedCol: '#6a7a34',
  },
  carob: {
    H: 9, stems: [1, 1], stemSpread: 0, bole: 0, trunkH: 2.0, trunkR: 0.46, lean: 0.06, gnarl: 0.18,
    crown: { cy: 5.5, rx: 4.5, ry: 3.0 }, clusters: [13, 14], clusterR: [1.25, 1.75], uRange: [-0.7, 0.95], shell: [0.48, 0.8],
    blobs: [4, 5], blobR: [0.72, 1.0], blobSy: 0.76, spiky: 0.16, limbs: [4, 5], bendUp: 0.2, limbGnarl: 0.6,
    leaf: '#2e4f25', leaf2: '#3c5f2c', cards: 6, cardLen: 0.46, cardWid: 0.3, twigs: 0, faceN: 0.15,
    bark: '#6a5a4c', bark2: '#4a3d33', fiss: 4, kTrunk: 8, seedling: 'pinnate', seedCol: '#3e6a2c', lobes: 0.22,
  },
  pine: {
    H: 16, stems: [1, 1], stemSpread: 0, bole: 0, trunkH: 13.2, trunkR: 0.42, lean: 0.16, gnarl: 0.06, forkMode: 'along',
    crown: { cy: 12.0, rx: 4.2, ry: 4.0 }, clusters: [11, 12], clusterR: [1.3, 1.8], blobs: [4, 5], blobR: [0.6, 0.9],
    blobSy: 0.5, spiky: 0.42, limbs: [0, 0], bendUp: 0.25, limbGnarl: 0.8,
    leaf: '#5d8466', leaf2: '#4e7560', cards: 4, cardLen: 0.62, cardWid: 0.07, needle: true, twigs: 0, faceN: 0.2,
    bark: '#7a7068', bark2: '#8a5844', fiss: 5, vert: 1.6, kTrunk: 7, upper: '#9a6a4a', upperY: 9, seedling: 'needle', seedCol: '#5d8466',
  },
  mastic: {
    H: 3, shrub: true, stems: [5, 7], stemSpread: 0.9, bole: 0, trunkH: 0.55, trunkR: 0.07, lean: 0, gnarl: 0.3,
    crown: { cy: 1.4, rx: 1.75, ry: 1.25 }, clusters: [10, 10], clusterR: [0.5, 0.7], uRange: [-0.85, 0.95], shell: [0.5, 0.78],
    blobs: [3, 3], blobR: [0.36, 0.5], blobSy: 0.85, spiky: 0.28, limbs: [0, 0], bendUp: 0.25, limbGnarl: 0.8,
    leaf: '#3a552d', leaf2: '#2d4626', cards: 3, cardLen: 0.2, cardWid: 0.11, twigs: 0, faceN: 0.2,
    bark: '#5e4c3c', bark2: '#4a3b30', fiss: 2, kTrunk: 3, kLimb: 3, stemSeg: 3,
  },
  buckthorn: {
    H: 3, shrub: true, stems: [4, 5], stemSpread: 0.6, bole: 0, trunkH: 0.5, trunkR: 0.06, lean: 0, gnarl: 0.35,
    crown: { cy: 1.45, rx: 1.3, ry: 1.2 }, clusters: [12, 12], clusterR: [0.35, 0.5], uRange: [-0.9, 0.95], shell: [0.45, 0.8],
    blobs: [2, 2], blobR: [0.28, 0.38], blobSy: 0.9, spiky: 0.4, limbs: [0, 0], bendUp: 0.2, limbGnarl: 1.2,
    leaf: '#4a6a2e', leaf2: '#3e5c28', cards: 5, cardLen: 0.13, cardWid: 0.06, twigs: 1, twigLen: 0.9, spines: true, faceN: 0.15,
    bark: '#5a4a40', bark2: '#3e332c', fiss: 2, kTrunk: 3, kLimb: 3, stemSeg: 3,
  },
};

export function buildWoody(id, variant) {
  const sp = WOODY[id];
  const rng = makeRng(hashString(id) + variant * 7919 + 13);
  const noise = makeNoise2D(hashString(id) + variant * 31);
  const wood = new Geo(), leaves = new Geo(), fruit = new Geo(), flowers = new Geo(), seed = new Geo();
  const k = rng.range(0.93, 1.06); const H = sp.H * k;
  const crownC = new V3(rng.range(-0.25, 0.25) * k, sp.crown.cy * k, rng.range(-0.25, 0.25) * k);
  const rx = sp.crown.rx * k * rng.range(0.92, 1.08), ry = sp.crown.ry * k;
  const bark = barkFn(sp.bark, sp.bark2, rng, noise, { fiss: sp.fiss, vert: sp.vert, upper: sp.upper, upperY: sp.upperY });
  const kL = sp.kLimb || 5;
  const perch = [], attach = [];

  // ---- stems / trunk
  const nStems = rng.int(sp.stems[0], sp.stems[1]);
  const leanA = rng() * TAU; const lean = new V3(Math.cos(leanA), 0, Math.sin(leanA)).multiplyScalar(sp.lean);
  const stems = [];
  const r0All = sp.trunkR * k;
  if (sp.bole > 0 && nStems > 1) { // shared gnarled bole
    const bp = [new V3(0, -0.15, 0), new V3(0, sp.bole * 0.5, 0), new V3(0, sp.bole, 0)];
    tube(wood, bp, [r0All * 1.5, r0All * 1.25, r0All * 1.05], sp.kTrunk + 1, bark, { lobes: { rings: 2, amp: 0.35, n: 5, ph: rng() * 6 }, rng, jit: 0.12 });
  }
  for (let s = 0; s < nStems; s++) {
    const ang = (s / nStems) * TAU + rng.range(-0.5, 0.5);
    const out = new V3(Math.cos(ang), 0, Math.sin(ang));
    const multi = nStems > 1;
    const start = multi ? out.clone().multiplyScalar(r0All * (sp.shrub ? 0.6 : 0.35)).setY(sp.bole > 0 ? sp.bole * 0.55 : -0.05) : new V3(0, -0.1, 0);
    const dir = new V3(0, 1, 0).addScaledVector(out, multi ? sp.stemSpread * rng.range(0.7, 1.2) : 0).add(lean);
    const len = sp.trunkH * k * (multi ? rng.range(0.75, 1.15) : 1) * (sp.shrub ? rng.range(0.8, 1.3) : 1);
    const nseg = sp.forkMode === 'along' ? 9 : (sp.stemSeg || 5);
    const w = walk(start, dir, len, nseg, rng, sp.gnarl, sp.shrub ? 0.05 : 0.08);
    const rr0 = multi ? r0All / Math.sqrt(nStems) * 1.2 : r0All;
    const rads = taper(w.pts.length, rr0, rr0 * (sp.forkMode === 'along' ? 0.35 : 0.72), 0.8);
    if (!multi && !sp.shrub) { rads[0] *= 1.35; }
    tube(wood, w.pts, rads, sp.kTrunk, bark, { lobes: !multi && !sp.shrub ? { rings: 2, amp: sp.lobes ?? 0.3, n: 4, ph: rng() * 6 } : null, rng, jit: 0.1 });
    stems.push({ pts: w.pts, rads, top: w.pts[w.pts.length - 1], r: rads[rads.length - 1] });
  }

  // ---- leaf clusters
  const nC = rng.int(sp.clusters[0], sp.clusters[1]);
  const clusters = [];
  if (sp.forkMode === 'along') { // pine: irregular tiers, wide below, narrow top, flattened clumps
    const T = stems[0];
    for (let i = 0; i < nC; i++) {
      const f = (i + rng.range(0.1, 0.9)) / nC; // 0 low … 1 top
      const y = lerp(0.52, 0.97, f) * H;
      const hd = lerp(4.3, 0.9, Math.pow(f, 1.2)) * k * rng.range(0.6, 1.1);
      const az = i * 2.39996 + rng.range(-0.5, 0.5);
      const tp = trunkAt(T.pts, y);
      clusters.push({ pos: new V3(tp.x + Math.cos(az) * hd, y + rng.range(-0.3, 0.3), tp.z + Math.sin(az) * hd), r: rng.range(sp.clusterR[0], sp.clusterR[1]) * k * lerp(1.05, 0.8, f), az });
    }
    clusters.push({ pos: T.top.clone().add(new V3(0, 0.35, 0)), r: sp.clusterR[0] * k, az: 0, apex: true });
  } else {
    for (let i = 0; i < nC; i++) {
      const u = lerp(sp.uRange[0], sp.uRange[1], (i + rng.range(0.15, 0.85)) / nC);
      const az = i * 2.39996 + rng.range(-0.3, 0.3);
      const s = rng.range(sp.shell[0], sp.shell[1]);
      const rr = Math.sqrt(Math.max(0, 1 - u * u)) * s;
      clusters.push({ pos: new V3(crownC.x + Math.cos(az) * rr * rx, crownC.y + u * s * ry, crownC.z + Math.sin(az) * rr * rx), r: rng.range(sp.clusterR[0], sp.clusterR[1]) * k, az });
    }
    clusters.push({ pos: crownC.clone().add(new V3(rng.range(-0.3, 0.3), ry * 0.62, rng.range(-0.3, 0.3))), r: sp.clusterR[1] * k, az: rng() * TAU });
  }

  // ---- limbs
  const limbList = [];
  const addLimb = (pts, r0, r1, kk) => { tube(wood, pts, taper(pts.length, r0, r1, 0.9), kk, bark, { rng, jit: 0.08 }); limbList.push({ pts, r0, r1 }); };
  if (sp.forkMode === 'along') {
    const T = stems[0];
    for (const c of clusters) {
      if (c.apex) continue;
      const hd = Math.hypot(c.pos.x - T.top.x, c.pos.z - T.top.z);
      const oy = clamp(c.pos.y - 0.6 - hd * 0.35, H * 0.45, T.top.y - 0.4);
      const A = trunkAt(T.pts, oy);
      const tr = lerp(T.rads[0], T.rads[T.rads.length - 1], clamp(oy / T.top.y));
      const pts = curve(A, c.pos.clone().addScaledVector(UP, -0.15), 4, rng, sp.bendUp, sp.limbGnarl);
      addLimb(pts, tr * 0.55, 0.05 * k, 5);
      c.limb = pts;
      // forked secondary toward a sub-clump
      const sub = c.pos.clone().add(new V3(rng.range(-1, 1), rng.range(-0.2, 0.4), rng.range(-1, 1)).multiplyScalar(c.r * 0.9));
      const sp2 = curve(pts[2], sub, 2, rng, 0.2, 0.5); addLimb(sp2, tr * 0.25, 0.035 * k, 4);
      perch.push(pts[3].clone().add(new V3(0, tr * 0.4, 0)));
      attach.push({ pos: pts[2].clone(), normal: UP.clone() });
    }
    // a few dead stubs on the lower trunk
    for (let i = 0; i < 4; i++) {
      const y = rng.range(H * 0.2, H * 0.48); const A = trunkAt(T.pts, y); const az = rng() * TAU;
      const B = A.clone().add(new V3(Math.cos(az), rng.range(-0.15, 0.25), Math.sin(az)).multiplyScalar(rng.range(0.5, 1.1)));
      addLimb([A, A.clone().lerp(B, 0.5), B], 0.07 * k, 0.025 * k, 3);
    }
  } else if (sp.shrub) {
    // each cluster gets a branch from a stem point
    for (const c of clusters) {
      const st = stems[Math.floor(rng() * stems.length)];
      const A = st.pts[Math.min(st.pts.length - 1, rng.int(1, st.pts.length - 1))];
      const pts = curve(A, c.pos.clone().lerp(crownC, 0.15), 3, rng, sp.bendUp, sp.limbGnarl);
      addLimb(pts, st.r * 0.9, 0.018, kL);
      perch.push(c.pos.clone().add(new V3(0, c.r * 0.55, 0)));
      c.limb = pts;
    }
  } else {
    // group clusters by azimuth into main limbs, then secondaries to each cluster
    const order = clusters.slice().sort((a, b) => Math.atan2(a.pos.z - crownC.z, a.pos.x - crownC.x) - Math.atan2(b.pos.z - crownC.z, b.pos.x - crownC.x));
    const nL = rng.int(sp.limbs[0], sp.limbs[1]);
    const per = Math.ceil(order.length / nL);
    for (let g = 0; g < nL; g++) {
      const grp = order.slice(g * per, (g + 1) * per); if (!grp.length) continue;
      const st = stems[g % stems.length];
      const F = st.top;
      const M = new V3(); grp.forEach(c => M.add(c.pos)); M.multiplyScalar(1 / grp.length);
      const Q = F.clone().lerp(M, sp.limbOut ?? 0.5).addScaledVector(UP, 0.25 * k).add(rndUnit(rng).multiplyScalar(0.25 * k));
      const mp = curve(F, Q, 4, rng, sp.bendUp, sp.limbGnarl);
      const mr = st.r * 0.82;
      addLimb(mp, mr, mr * 0.6, 6);
      attach.push({ pos: Q.clone(), normal: UP.clone() });
      for (const c of grp) {
        const sp2 = curve(Q, c.pos.clone().lerp(crownC, 0.12), 3, rng, sp.bendUp * 0.6, sp.limbGnarl);
        addLimb(sp2, mr * 0.5, 0.04 * k, 4);
        c.limb = sp2;
        perch.push(sp2[2].clone().add(new V3(0, mr * 0.35, 0)));
      }
    }
  }
  // twigs (fine branch tips – they make a bare deciduous tree read as a tree; on buckthorn they carry spines)
  const tips = [];
  for (const c of clusters) {
    for (let i = 0; i < (sp.twigs || 0); i++) {
      const out = c.pos.clone().sub(crownC); out.y *= 0.6; out.normalize().add(rndUnit(rng).multiplyScalar(0.7)).addScaledVector(UP, 0.25).normalize();
      const len = c.r * (sp.twigLen || 1) * rng.range(0.7, 1.15);
      const A = c.pos.clone().add(rndUnit(rng).multiplyScalar(c.r * 0.2));
      const w = walk(A, out, len, 2, rng, 0.25, 0.05);
      const tr = sp.shrub ? 0.014 : 0.026 * k;
      tube(wood, w.pts, taper(3, tr, tr * 0.35), 3, bark, {});
      tips.push({ p: w.pts[2], dir: w.dir.clone(), c });
      if (sp.spines) for (let s = 1; s <= 2; s++) { // thorny tips
        const sp0 = w.pts[s]; const sd = perp(w.dir, rng).addScaledVector(w.dir, 0.3).normalize();
        const st = sp0.clone().addScaledVector(sd, 0.09); const sn = sd.clone();
        const sc = new Col('#6a5a48'); const side = perp(sd, rng).multiplyScalar(0.008);
        wood.tri(sp0.clone().add(side), sp0.clone().sub(side), st, sn, sn, sn, sc, sc, sc.clone().multiplyScalar(1.3), null, 0);
      }
    }
  }

  // ---- foliage
  const blobs = [];
  const leafBase = new Col(sp.leaf), leafAlt = new Col(sp.leaf2);
  const fo = { crownC, rx, ry: sp.forkMode === 'along' ? ry * 1.2 : ry, spiky: sp.spiky, faceN: sp.faceN };
  for (const c of clusters) {
    const nb = rng.int(sp.blobs[0], sp.blobs[1]);
    const cBase = leafBase.clone().lerp(leafAlt, rng());
    for (let i = 0; i < nb; i++) {
      const off = rndUnit(rng).multiplyScalar(c.r * (i === 0 ? 0.1 : rng.range(0.35, 0.7)));
      off.y *= sp.forkMode === 'along' ? 0.35 : 0.6;
      const bc = c.pos.clone().add(off);
      const br = rng.range(sp.blobR[0], sp.blobR[1]) * k * (i === 0 ? 1.1 : 1);
      const rank = rng.range(0.04, 0.96);
      blob(leaves, bc, br, sp.blobSy, rng, { ...fo, base: jit(cBase, rng, 0.08), rank, center: bc });
      blobs.push({ c: bc, r: br, sy: sp.blobSy, rank, cl: c });
      // leaf cards on the blob surface
      for (let j = 0; j < sp.cards; j++) {
        const d = rndUnit(rng); if (d.y < -0.5) d.y *= -0.5; d.normalize();
        const p = bc.clone().add(new V3(d.x * br, d.y * br * sp.blobSy, d.z * br).multiplyScalar(rng.range(0.85, 1.08)));
        const nOut = p.clone().sub(crownC); nOut.y /= (fo.ry / rx); nOut.normalize().lerp(d, 0.5).normalize();
        const cc = shade(jit(cBase, rng, 0.14).multiplyScalar(1.08), p, { ...fo, aoLo: 0.6 });
        if (sp.needle) { // needle tufts: a little starburst
          for (let q = 0; q < 2; q++) card(leaves, p.clone().addScaledVector(d, sp.cardLen * 0.35), nOut, sp.cardLen * k, sp.cardWid * k, rng, cc, bc, rank, { t: d.clone().add(rndUnit(rng).multiplyScalar(0.8)).normalize(), fold: 0.6, baseDark: 0.7, tipLight: 1.25 });
        } else card(leaves, p, nOut, sp.cardLen * k, sp.cardWid * k, rng, cc, bc, rank, { t: d.clone().add(rndUnit(rng).multiplyScalar(0.9)).normalize() });
      }
    }
  }

  // ---- species extras
  const ctx = { rng, k, H, crownC, rx, ry, blobs, clusters, tips, limbs: limbList, stems, fruit, flowers, wood, leaves };
  const extra = EXTRAS[id];
  if (extra) extra(ctx);
  if (!sp.shrub) buildSeedling(seed, rng, sp.seedling, sp.seedCol, sp.bark);

  // ---- info
  const bb = new THREE.Box3();
  for (const b of blobs) { bb.expandByPoint(b.c.clone().add(new V3(b.r, b.r * b.sy, b.r))); bb.expandByPoint(b.c.clone().sub(new V3(b.r, b.r * b.sy, b.r))); }
  let crownR = 0; for (const b of blobs) crownR = Math.max(crownR, Math.hypot(b.c.x, b.c.z) + b.r * 0.85);
  const info = {
    H: bb.max.y, crownTop: bb.max.y, crownBottom: Math.max(0.05, bb.min.y), crownR, trunkR: sp.shrub ? sp.trunkR * k * 2.5 : r0All,
    perch: perch.filter(p => p.y > (sp.shrub ? 0.8 : H * 0.35)).slice(0, 10), attach,
    leafL: lum(sp.leaf), fruitL: ctx.fruitL || 0.1, flowerL: ctx.flowerL || 0.1, seedH: 0.55,
  };
  return { geoms: { wood: wood.build(), leaves: leaves.build(), fruit: fruit.build(), flowers: flowers.build(), seed: seed.build() }, info };
}
function trunkAt(pts, y) {
  for (let i = 1; i < pts.length; i++) if (pts[i].y >= y) { const a = pts[i - 1], b = pts[i]; return a.clone().lerp(b, clamp((y - a.y) / Math.max(1e-4, b.y - a.y))); }
  return pts[pts.length - 1].clone();
}
// random point on a blob's lower/outer surface
function onBlob(b, rng, crownC, down = 0.4) {
  const out = b.c.clone().sub(crownC); out.y = 0; out.normalize();
  const d = rndUnit(rng).add(out.multiplyScalar(0.8)).add(new V3(0, -down, 0)).normalize();
  return { p: b.c.clone().add(new V3(d.x * b.r, d.y * b.r * b.sy, d.z * b.r).multiplyScalar(rng.range(0.85, 1.0))), d };
}
function pickBlobs(ctx, n, filter) {
  const list = ctx.blobs.filter(filter || (() => true)); const out = [];
  for (let i = 0; i < n && list.length; i++) out.push(list[Math.floor(ctx.rng() * list.length)]);
  return out;
}

function buildSeedling(geo, rng, type, leafHex, barkHex) {
  const stemC = new Col(barkHex).lerp(new Col('#6a8a3a'), 0.7);
  const h = type === 'needle' ? 0.42 : 0.5;
  const w = walk(new V3(0, -0.02, 0), new V3(rng.range(-0.1, 0.1), 1, rng.range(-0.1, 0.1)), h, 3, rng, 0.08, 0.05);
  tube(geo, w.pts, taper(4, 0.02, 0.01), 3, (t) => stemC.clone().multiplyScalar(0.8 + 0.4 * t), {});
  const top = w.pts[3]; const lc = new Col(leafHex);
  if (type === 'needle') {
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU, d = new V3(Math.cos(a), i % 2 ? 0.9 : 0.35, Math.sin(a)).normalize();
      card(geo, top.clone().addScaledVector(d, 0.13), d.clone().cross(UP).normalize().cross(d).normalize(), 0.28, 0.035, rng, jit(lc, rng), top, 0.02 + i / 13, { t: d, fold: 0.3 });
    }
    return;
  }
  const nLeaves = type === 'pinnate' ? 3 : 6;
  for (let i = 0; i < nLeaves; i++) {
    const t = 0.4 + 0.6 * i / nLeaves; const p = w.pts[1].clone().lerp(top, t);
    const a = i * 2.4; const d = new V3(Math.cos(a), 0.5, Math.sin(a)).normalize();
    if (type === 'pinnate') {
      const axisEnd = p.clone().addScaledVector(d, 0.3);
      for (let j = 0; j < 4; j++) {
        const q = p.clone().lerp(axisEnd, 0.3 + j * 0.23); const side = new V3().crossVectors(d, UP).normalize().multiplyScalar(j % 2 ? 1 : -1);
        card(geo, q.clone().addScaledVector(side, 0.06), UP, 0.14, 0.075, rng, jit(lc, rng), top, 0.03 + (i * 4 + j) / 14, { t: side.clone().addScaledVector(d, 0.4).normalize() });
      }
    } else card(geo, p.clone().addScaledVector(d, 0.11), new V3(0, 1, 0).lerp(d, 0.3).normalize(), 0.22, 0.14, rng, jit(lc, rng), top, 0.03 + i / 7, { t: d });
  }
}

// species-specific fruit & flowers on woody plants
const EXTRAS = {
  oak(ctx) { // acorns (fruit) + golden catkins (flowers, spring)
    const { rng, crownC } = ctx; ctx.fruitL = lum('#8a6234'); ctx.flowerL = lum('#c8b450');
    for (const b of pickBlobs(ctx, 20, b => b.c.y < crownC.y + ctx.ry * 0.5)) {
      const { p, d } = onBlob(b, rng, crownC, 0.5);
      const ax = d.clone().lerp(new V3(0, -1, 0), 0.6).normalize();
      const rank = rng.range(0.04, 0.96);
      gem(ctx.fruit, p.clone().addScaledVector(ax, 0.13), ax, 0.32, 0.105, 5, jit('#9a6c38', rng), new Col('#7a5228'), p, rank, { top: 0.4 });
      gem(ctx.fruit, p.clone().addScaledVector(ax, 0.02), ax, 0.13, 0.125, 5, new Col('#5c4a34'), new Col('#4a3a28'), p, rank, { top: 0.6 });
    }
    for (const b of pickBlobs(ctx, 26)) {
      const { p } = onBlob(b, rng, crownC, 0.9); const rank = rng.range(0.04, 0.96);
      const ax = new V3(rng.range(-0.3, 0.3), -1, rng.range(-0.3, 0.3)).normalize();
      gem(ctx.flowers, p.clone().addScaledVector(ax, 0.16), ax, 0.34, 0.035, 3, jit('#d8c460', rng), new Col('#b8a040'), p, rank);
    }
  },
  terebinth(ctx) { // reddish fruit clusters at twig tips; reddish-purple flower panicles in early spring
    const { rng } = ctx; ctx.fruitL = lum('#b8402c'); ctx.flowerL = lum('#9a3a40');
    const tips = ctx.tips.slice().sort(() => rng() - 0.5);
    for (const t of tips.slice(0, 10)) {
      const rank = rng.range(0.04, 0.96); const base = t.p.clone();
      for (let i = 0; i < 5; i++) {
        const c = base.clone().add(new V3(rng.range(-0.1, 0.1), -0.06 - i * 0.035, rng.range(-0.1, 0.1)));
        gem(ctx.fruit, c, rndUnit(rng), 0.11, 0.055, 4, jit('#c2442e', rng, 0.15), new Col('#8a2a24'), base, rank);
      }
    }
    for (const t of tips.slice(10, 22)) {
      const rank = rng.range(0.04, 0.96);
      for (let q = 0; q < 3; q++) gem(ctx.flowers, t.p.clone().add(new V3(rng.range(-0.09, 0.09), -0.04 - q * 0.07, rng.range(-0.09, 0.09))), rndUnit(rng), 0.09, 0.05, 3, jit('#a8404a', rng, 0.15), new Col('#7a2a34'), t.p, rank);
    }
  },
  carob(ctx) { // long hanging pods; small reddish flower clusters on old wood (autumn)
    const { rng, crownC } = ctx; ctx.fruitL = lum('#4a2c1c'); ctx.flowerL = lum('#a83a30');
    for (const b of pickBlobs(ctx, 24, b => b.c.y < crownC.y - ctx.ry * 0.05)) {
      const { p } = onBlob(b, rng, crownC, 1.6);
      const rank = rng.range(0.04, 0.96); const L = rng.range(0.55, 0.8);
      const sw = new V3(rng.range(-0.25, 0.25), 0, rng.range(-0.25, 0.25));
      const pts = [p.clone(), p.clone().add(new V3(0, -L * 0.35, 0)).add(sw), p.clone().add(new V3(0, -L * 0.7, 0)).addScaledVector(sw, 1.6), p.clone().add(new V3(0, -L, 0)).addScaledVector(sw, 1.3).add(new V3(0.05, 0.06, 0))];
      const pc = jit('#4e2e1c', rng, 0.15);
      tube(ctx.fruit, pts, [0.025, 0.06, 0.055, 0.025], 3, (t) => pc.clone().multiplyScalar(0.85 + 0.3 * Math.sin(t * 3)), { ce: p, rank, capEnd: true });
    }
    for (let i = 0; i < 12; i++) {
      const l = ctx.limbs[Math.floor(rng() * ctx.limbs.length)]; const p = l.pts[Math.min(l.pts.length - 1, rng.int(1, 2))].clone();
      const rank = rng.range(0.04, 0.96);
      blob(ctx.flowers, p.add(new V3(0, 0.06, 0)), 0.12, 1.0, rng, { crownC: p, rx: 1, ry: 1, spiky: 0.5, base: jit('#b04434', rng, 0.15), rank, center: p, faceN: 0.6 });
    }
  },
  pine(ctx) { // cones near clump bases; yellow pollen cones (spring)
    const { rng } = ctx; ctx.fruitL = lum('#7a5232'); ctx.flowerL = lum('#e2c450');
    for (const c of ctx.clusters) {
      if (!c.limb) continue;
      const n = rng.int(1, 3);
      for (let i = 0; i < n; i++) {
        const p = c.limb[c.limb.length - 2].clone().add(new V3(rng.range(-0.2, 0.2), -0.12, rng.range(-0.2, 0.2)));
        const ax = new V3(rng.range(-0.5, 0.5), -1, rng.range(-0.5, 0.5)).normalize();
        gem(ctx.fruit, p.clone().addScaledVector(ax, 0.15), ax, 0.36, 0.1, 6, jit('#8a5c36', rng, 0.12), new Col('#5e4030'), p, rng.range(0.04, 0.96), { top: 0.35 });
      }
    }
    for (const b of pickBlobs(ctx, 28)) {
      const { p, d } = onBlob(b, rng, ctx.crownC, -0.6);
      gem(ctx.flowers, p, d.clone().lerp(UP, 0.5).normalize(), 0.16, 0.06, 4, jit('#ecd060', rng), new Col('#c8a040'), p, rng.range(0.04, 0.96));
    }
  },
  mastic(ctx) { // berry bunches (red → black), tiny reddish flowers
    const { rng, crownC } = ctx; ctx.fruitL = lum('#c4342a'); ctx.flowerL = lum('#8a2a2a');
    for (const b of pickBlobs(ctx, 8)) {
      const { p } = onBlob(b, rng, crownC, 0.1); const rank = rng.range(0.04, 0.96);
      for (let i = 0; i < 5; i++) gem(ctx.fruit, p.clone().add(rndUnit(rng).multiplyScalar(0.06)), rndUnit(rng), 0.085, 0.045, 3, jit('#cc3a2c', rng, 0.15), new Col('#9a2a22'), p, rank);
    }
    for (const b of pickBlobs(ctx, 10)) {
      const { p, d } = onBlob(b, rng, crownC, -0.3);
      gem(ctx.flowers, p, d, 0.09, 0.05, 3, jit('#9a2c30', rng), new Col('#6a2a20'), p, rng.range(0.04, 0.96));
    }
  },
  buckthorn(ctx) { // small dark berries along twigs, tiny yellow-green flowers
    const { rng } = ctx; ctx.fruitL = lum('#2a1c2c'); ctx.flowerL = lum('#d0d070');
    for (const b of pickBlobs(ctx, 24)) {
      const { p } = onBlob(b, rng, ctx.crownC, 0.2);
      gem(ctx.fruit, p, rndUnit(rng), 0.08, 0.045, 3, jit('#2e2030', rng, 0.15), new Col('#1a1420'), p, rng.range(0.04, 0.96));
    }
    for (const b of pickBlobs(ctx, 10)) {
      const { p, d } = onBlob(b, rng, ctx.crownC, -0.2);
      gem(ctx.flowers, p, d, 0.06, 0.04, 3, jit('#d6d478', rng), new Col('#a8a850'), p, rng.range(0.04, 0.96));
    }
  },
};
