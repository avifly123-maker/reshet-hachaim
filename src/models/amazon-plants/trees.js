// Amazon plants: the trees (moved unchanged from amazon-plants.js).
// Exports kapok, brazilnut, fig, cecropia, acai: each (opts) => PlantVisual; their build*(v) functions make the
// geometry of variant v. Needs: kit.js, visual.js.
import * as THREE from 'three';
import { lerp, smoothstep, jitterColor } from '../../core/util.js';
import { V3, TAU, GB, M, orient, place, curveOf, leafBlade, hash3, bead, octa, starFlower, trunkGeo, branchCurve, barkCol, leafCol, seedlingGeo } from './kit.js';
import { cached, makeVisual, variantOf, vrng, finGeo, addClumps } from './visual.js';

// ═════════════════════════════ KAPOK (Ceiba pentandra) ═════════════════════════════
function buildKapok(v) {
  const rng = vrng('kapok', v);
  const gb = new GB(rng); const cb = 22 + v; gb.cb = cb;
  const H = 36 + v;
  const lean = new V3(rng.range(-0.6, 0.6), 0, rng.range(-0.6, 0.6));
  const tTop = new V3(lean.x, cb + 7.5, lean.z);
  const trunk = curveOf([new V3(0, -0.3, 0), new V3(lean.x * 0.2, cb * 0.35, lean.z * 0.1), new V3(lean.x * 0.6, cb * 0.75, lean.z * 0.7), tTop]);
  gb.add(trunkGeo(trunk, { r0: 1.0, r1: 0.42, segs: 12, radial: 10, flare: 0.55, flareH: 0.05, noise: 0.07, ridges: 5, ridgeAmt: 0.05 }),
    { colFn: barkCol('#bdb7a8', '#7f7a6c', rng, 0.35) });
  // buttress fins — appear late in life
  const nf = 6;
  for (let i = 0; i < nf; i++) {
    const a = (i / nf) * TAU + rng.range(-0.25, 0.25);
    const g = finGeo(rng.range(3.4, 4.8), rng.range(4.2, 6.2), 0.3, 1.0, rng);
    gb.add(g, { m: M().makeRotationY(a), colFn: barkCol('#b3ad9e', '#7a7466', rng, 0.3), late: 0.55 + i * 0.05, pivot: new V3(0, 0, 0), anchorY: 0 });
  }
  // umbrella crown: main limbs radiating near the top
  const clumps = [], attach = [], perch = [], flowers = [], pods = [];
  const nb = 7;
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * TAU + rng.range(-0.2, 0.2);
    const t0 = 0.9 + rng() * 0.08; const p0 = trunk.getPointAt(t0);
    const R = rng.range(7.5, 9.0); const dir = new V3(Math.cos(a), 0, Math.sin(a));
    const p1 = p0.clone().addScaledVector(dir, R); p1.y = p0.y + rng.range(1.2, 2.6);
    const c = branchCurve(p0, p1, 0.12, rng);
    gb.add(trunkGeo(c, { r0: 0.34, r1: 0.1, segs: 5, radial: 6, flare: 0.25, flareH: 0.1, noise: 0.08 }), { colFn: barkCol('#b2ac9d', '#7d7769', rng, 0.3) });
    attach.push({ pos: c.getPointAt(0.35).add(new V3(0, 0.3, 0)), normal: new V3(0, 1, 0), minG: 0.3 });
    perch.push({ pos: c.getPointAt(0.55).add(new V3(0, 0.25, 0)) });
    // two forks
    for (const sd of [-1, 1]) {
      const q0 = c.getPointAt(rng.range(0.45, 0.65));
      const a2 = a + sd * rng.range(0.35, 0.6); const d2 = new V3(Math.cos(a2), 0, Math.sin(a2));
      const q1 = q0.clone().addScaledVector(d2, rng.range(3.0, 4.2)); q1.y += rng.range(0.6, 1.4);
      const c2 = branchCurve(q0, q1, 0.1, rng);
      gb.add(trunkGeo(c2, { r0: 0.14, r1: 0.05, segs: 3, radial: 4, flare: 0, noise: 0.05, cap: false }), { col: '#9e9888' });
      clumps.push({ p: q1.clone().add(new V3(0, 0.6, 0)), r: rng.range(2.2, 2.8), sy: 0.36 });
      if (sd > 0) attach.push({ pos: c2.getPointAt(0.3).add(new V3(0, 0.15, 0)), normal: new V3(0, 1, 0), minG: 0.5 });
    }
    clumps.push({ p: p1.clone().add(new V3(0, 0.7, 0)), r: rng.range(2.5, 3.1), sy: 0.36 });
    clumps.push({ p: c.getPointAt(0.45).add(new V3(0, 1.3, 0)), r: rng.range(2.2, 2.6), sy: 0.4, rank: 0.1, subs: 2 });
    perch.push({ pos: p1.clone().add(new V3(0, 1.6, 0)), minG: 0.4 });
  }
  clumps.push({ p: tTop.clone().add(new V3(0, 1.4, 0)), r: 2.8, sy: 0.5, rank: 0.02 });
  addClumps(gb, rng, clumps, { top: '#8cbf4a', bottom: '#2e5d26', subs: 4, fringe: 5 });
  // flowers (pale pink-white) on crown tops, pods + cotton below
  for (let i = 0; i < 24; i++) {
    const c = clumps[Math.floor(rng() * clumps.length)]; const a = rng() * TAU, rr = c.r * rng.range(0.4, 1.0);
    const p = c.p.clone().add(new V3(Math.cos(a) * rr, c.r * c.sy * rng.range(0.45, 0.95), Math.sin(a) * rr));
    gb.add(starFlower(0.5, 5, 0.6), { m: orient(p, new V3(rng.range(-0.3, 0.3), 1, rng.range(-0.3, 0.3)), rng() * 3), col: rng() < 0.5 ? '#f0d2cc' : '#e6a3b0', cj: [0.01, 0.05, 0.04], reveal: 1, centre: p });
  }
  for (let i = 0; i < 20; i++) {
    const c = clumps[Math.floor(rng() * clumps.length)]; const a = rng() * TAU, rr = c.r * rng.range(0.3, 0.9);
    const p = c.p.clone().add(new V3(Math.cos(a) * rr, -c.r * c.sy * rng.range(0.6, 0.9), Math.sin(a) * rr));
    const burst = i % 3 === 0;
    gb.add(burst ? octa(0.42, 0.8) : octa(0.22, 2.6), { m: M().setPosition(p), col: burst ? '#f4f1ea' : '#6b5a33', cj: [0.02, 0.05, 0.05], reveal: 2, centre: p });
  }
  return { geo: gb.build(), tris: gb.tris, cb, H, attach: attach.slice(0, 12), perch: perch.slice(0, 14) };
}


export function kapok(opts) {
  const v = variantOf(opts);
  const d = cached('kapok' + v, () => buildKapok(v));
  const sd = cached('kapok-seed', () => seedlingGeo(vrng('kapok-s', 0), { h: 1.5, leaves: 4, palmate: 5, leafLen: 0.5, leafWid: 0.22, stemCol: '#7a8a52', leafColor: '#5d9a35' }));
  return makeVisual({
    name: 'kapok', geo: d.geo, seedGeo: sd, H: d.H, cb: d.cb, trunkR: 1.0, sway: 0.006, droop: 0,
    crown: { top: d.H - 0.3, bottom: d.cb + 5.5, radius: 11, density: 0.75 }, attach: d.attach, perch: d.perch, seedCrown: { top: 1.6, bottom: 0.7, radius: 0.5, density: 0.25 },
    grow(g) {
      if (g < 0.1) return { seed: lerp(0.45, 1.2, g / 0.1) };
      const Ht = 2 + 34 * Math.pow(g, 1.1), s = 0.15 + 0.85 * g;
      const stretch = (Ht / s - (d.H - d.cb)) / d.cb;
      return { s, sxz: s * lerp(0.75, 1, g), stretch, late: smoothstep(0.35, 1, g) * 1.15, leaf: lerp(0.5, 1.001, smoothstep(0.1, 0.6, g)) };
    },
  }, opts);
}

// ═════════════════════════════ BRAZIL NUT (Bertholletia excelsa) ═════════════════════════════
function buildBrazil(v) {
  const rng = vrng('brazil', v);
  const gb = new GB(rng); const cb = 21 + v; gb.cb = cb; const H = 32 + v;
  const lean = new V3(rng.range(-0.5, 0.5), 0, rng.range(-0.5, 0.5));
  const tTop = new V3(lean.x, cb + 4.5, lean.z);
  const trunk = curveOf([new V3(0, -0.3, 0), new V3(lean.x * 0.15, cb * 0.4, 0), new V3(lean.x * 0.55, cb * 0.8, lean.z * 0.6), tTop]);
  gb.add(trunkGeo(trunk, { r0: 0.78, r1: 0.4, segs: 12, radial: 10, flare: 0.28, flareH: 0.04, noise: 0.06, ridges: 13, ridgeAmt: 0.045 }),
    { colFn: barkCol('#6f5a45', '#3e3127', rng, 0.45) });
  const clumps = [], attach = [], perch = [];
  const nb = 6;
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * TAU + rng.range(-0.3, 0.3);
    const p0 = trunk.getPointAt(0.8 + rng() * 0.18);
    const R = rng.range(3.0, 4.6); const dir = new V3(Math.cos(a), 0, Math.sin(a));
    const p1 = p0.clone().addScaledVector(dir, R); p1.y += rng.range(3.0, 4.5);
    const c = branchCurve(p0, p1, 0.05, rng);
    gb.add(trunkGeo(c, { r0: 0.26, r1: 0.08, segs: 5, radial: 6, flare: 0.2, flareH: 0.1 }), { colFn: barkCol('#6a5644', '#3c3026', rng, 0.3) });
    attach.push({ pos: c.getPointAt(0.3).add(new V3(0, 0.25, 0)), normal: new V3(0, 1, 0), minG: 0.3 });
    perch.push({ pos: c.getPointAt(0.6).add(new V3(0, 0.2, 0)) });
    clumps.push({ p: p1.clone().add(new V3(0, 0.6, 0)), r: rng.range(2.3, 2.8), sy: 0.72 });
    clumps.push({ p: c.getPointAt(0.55).addScaledVector(dir, 0.6).add(new V3(0, 0.4, 0)), r: rng.range(1.7, 2.1), sy: 0.7 });
    perch.push({ pos: p1.clone().add(new V3(0, 2.0, 0)), minG: 0.4 });
  }
  // cauliflower dome: extra clumps stacked on top
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.4; const p = tTop.clone().add(new V3(Math.cos(a) * 2.2, 3.4 + rng() * 0.8, Math.sin(a) * 2.2));
    clumps.push({ p, r: rng.range(1.9, 2.3), sy: 0.75, rank: 0.1 + rng() * 0.3 });
  }
  clumps.push({ p: tTop.clone().add(new V3(0, 4.6, 0)), r: 2.4, sy: 0.7, rank: 0.03 });
  addClumps(gb, rng, clumps, { top: '#6fa63a', bottom: '#1f4a22', detail: 1, amt: 0.38 });
  // bloom: cream-yellow flower spikes on the crown surface
  for (let i = 0; i < 30; i++) {
    const c = clumps[Math.floor(rng() * clumps.length)];
    const d = new V3(rng.range(-1, 1), rng.range(0.2, 1), rng.range(-1, 1)).normalize();
    const p = c.p.clone().add(new V3(d.x * c.r * 0.95, d.y * c.r * c.sy * 0.95, d.z * c.r * 0.95));
    gb.add(starFlower(0.38, 5, 0.9), { m: orient(p, d, rng() * 3), col: '#e6c43c', cj: [0.02, 0.06, 0.05], reveal: 1, centre: p });
  }
  // fruit: round hard woody pods hanging under the crown
  for (let i = 0; i < 18; i++) {
    const c = clumps[i % 12];
    const a = rng() * TAU; const p = c.p.clone().add(new V3(Math.cos(a) * c.r * 0.6, -c.r * c.sy * 0.85, Math.sin(a) * c.r * 0.6));
    gb.add(bead(0.4, 0.95, 0), { m: M().setPosition(p), col: '#6b4423', cj: [0.02, 0.08, 0.06], vj: 0.15, reveal: 2, centre: p });
    gb.add(new THREE.CylinderGeometry(0.03, 0.04, 0.4, 3, 1, true), { m: M().setPosition(p.clone().add(new V3(0, 0.45, 0))), col: '#4a3a24', reveal: 2, centre: p });
  }
  return { geo: gb.build(), tris: gb.tris, cb, H, attach, perch };
}
export function brazilnut(opts) {
  const v = variantOf(opts);
  const d = cached('brazil' + v, () => buildBrazil(v));
  const sd = cached('brazil-seed', () => seedlingGeo(vrng('brazil-s', 0), { h: 1.6, leaves: 7, leafLen: 0.42, leafWid: 0.17, stemCol: '#5b4632', leafColor: '#3f7a2c', shape: 'lance' }));
  return makeVisual({
    name: 'brazilnut', geo: d.geo, seedGeo: sd, H: d.H, cb: d.cb, trunkR: 0.78, sway: 0.007, droop: 0,
    crown: { top: d.H - 0.4, bottom: d.cb + 3.5, radius: 7, density: 0.85 }, attach: d.attach, perch: d.perch,
    grow(g) {
      if (g < 0.1) return { seed: lerp(0.45, 1.2, g / 0.1) };
      const Ht = 2 + 30 * Math.pow(g, 1.15), s = 0.18 + 0.82 * g;
      return { s, sxz: s * lerp(0.8, 1, g), stretch: (Ht / s - (d.H - d.cb)) / d.cb, leaf: lerp(0.5, 1.001, smoothstep(0.1, 0.6, g)) };
    },
  }, opts);
}

// ═════════════════════════════ STRANGLER FIG (Ficus) ═════════════════════════════
function buildFig(v) {
  const rng = vrng('fig', v);
  const gb = new GB(rng); const cb = 14 + v; gb.cb = cb; const H = 24 + v;
  // braided lattice of aerial roots around a hollow core (the vanished host)
  const nr = 9, R0 = 0.95;
  for (let i = 0; i < nr; i++) {
    const a0 = (i / nr) * TAU + rng.range(-0.15, 0.15);
    const turns = rng.sign() * rng.range(0.25, 0.55);
    const pts = [];
    for (let k = 0; k <= 7; k++) {
      const t = k / 7; const y = lerp(-0.2, cb + 1.5, t);
      const a = a0 + turns * TAU * t + Math.sin(t * 9 + i) * 0.12;
      const r = R0 * (1 + 0.9 * Math.pow(1 - t, 4)) * (1 - 0.25 * t) + (k === 0 ? 0.6 : 0);
      pts.push(new V3(Math.cos(a) * r, y, Math.sin(a) * r));
    }
    gb.add(trunkGeo(curveOf(pts), { r0: rng.range(0.2, 0.3), r1: 0.16, segs: 9, radial: 5, flare: 0.5, flareH: 0.05, noise: 0.15 }), { colFn: barkCol('#8d8676', '#5c574b', rng, 0.35) });
  }
  // a few cross-connecting root bridges (fused lattice)
  for (let i = 0; i < 6; i++) {
    const y = rng.range(2, cb - 1); const a = rng() * TAU, b = a + rng.range(0.6, 1.1);
    const r = R0 * 1.02;
    const p0 = new V3(Math.cos(a) * r, y, Math.sin(a) * r), p1 = new V3(Math.cos(b) * r, y + rng.range(-1.2, 1.2), Math.sin(b) * r);
    const mid = p0.clone().lerp(p1, 0.5).multiplyScalar(1.15);
    gb.add(trunkGeo(curveOf([p0, mid, p1]), { r0: 0.11, r1: 0.09, segs: 4, radial: 4, flare: 0, noise: 0.1 }), { col: '#7f786a' });
  }
  // a few dangling aerial roots from the crown
  const clumps = [], attach = [], perch = [], figs = [];
  const nb = 7;
  const top = new V3(0, cb + 1.5, 0);
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * TAU + rng.range(-0.25, 0.25); const dir = new V3(Math.cos(a), 0, Math.sin(a));
    const p0 = top.clone().addScaledVector(dir, 0.6).add(new V3(0, rng.range(-1.5, 0.5), 0));
    const p1 = p0.clone().addScaledVector(dir, rng.range(5.5, 7.5)); p1.y += rng.range(3, 5.5);
    const c = branchCurve(p0, p1, 0.15, rng);
    gb.add(trunkGeo(c, { r0: 0.3, r1: 0.1, segs: 5, radial: 6, flare: 0.25, flareH: 0.1 }), { colFn: barkCol('#8a8373', '#5b564a', rng, 0.3) });
    attach.push({ pos: c.getPointAt(0.3).add(new V3(0, 0.28, 0)), normal: new V3(0, 1, 0), minG: 0.3 });
    perch.push({ pos: c.getPointAt(0.5).add(new V3(0, 0.25, 0)) });
    clumps.push({ p: p1.clone().add(new V3(0, 0.5, 0)), r: rng.range(2.5, 3.1), sy: 0.55 });
    clumps.push({ p: c.getPointAt(0.5).add(new V3(0, 1.5, 0)), r: rng.range(2.1, 2.6), sy: 0.55 });
    perch.push({ pos: p1.clone().add(new V3(0, 1.8, 0)), minG: 0.4 });
    if (i % 2 === 0) { // hanging aerial root
      const q = c.getPointAt(0.65); const L = rng.range(4, 8);
      gb.add(trunkGeo(curveOf([q, q.clone().add(new V3(0.2, -L * 0.5, 0.1)), q.clone().add(new V3(0.1, -L, -0.1))]), { r0: 0.05, r1: 0.025, segs: 4, radial: 3, flare: 0, noise: 0.1, cap: false }), { col: '#9b8f78', anchorY: cb });
    }
    // figs along the branch
    for (let k = 0; k < 6; k++) {
      const q = c.getPointAt(rng.range(0.35, 0.95)).add(new V3(rng.range(-0.35, 0.35), -0.22, rng.range(-0.35, 0.35)));
      figs.push(q);
    }
  }
  clumps.push({ p: top.clone().add(new V3(0, 4.4, 0)), r: 3.0, sy: 0.55, rank: 0.03 });
  addClumps(gb, rng, clumps, { top: '#5d8f34', bottom: '#14361a', amt: 0.34 });
  // figs also peeking from clump bottoms
  for (let i = 0; i < 20; i++) { const c = clumps[i % clumps.length]; const a = rng() * TAU; figs.push(c.p.clone().add(new V3(Math.cos(a) * c.r * 0.7, -c.r * c.sy * 0.75, Math.sin(a) * c.r * 0.7))); }
  figs.forEach((q, i) => gb.add(octa(0.2, 1.15), { m: M().setPosition(q), col: i % 3 ? '#b8342e' : '#e07a2a', cj: [0.03, 0.08, 0.08], reveal: 2, centre: q }));
  return { geo: gb.build(), tris: gb.tris, cb, H, attach, perch };
}
export function fig(opts) {
  const v = variantOf(opts);
  const d = cached('fig' + v, () => buildFig(v));
  const sd = cached('fig-seed', () => seedlingGeo(vrng('fig-s', 0), { h: 1.3, leaves: 6, leafLen: 0.38, leafWid: 0.24, stemCol: '#7a6a4c', leafColor: '#3f7432' }));
  return makeVisual({
    name: 'fig', geo: d.geo, seedGeo: sd, H: d.H, cb: d.cb, trunkR: 1.25, sway: 0.008, droop: 0,
    crown: { top: d.H - 0.3, bottom: d.cb + 0.5, radius: 9.5, density: 0.92 }, attach: d.attach, perch: d.perch,
    grow(g) {
      if (g < 0.1) return { seed: lerp(0.45, 1.2, g / 0.1) };
      const Ht = 2 + 22 * Math.pow(g, 1.05), s = 0.17 + 0.83 * g;
      return { s, sxz: s * lerp(0.7, 1, g), stretch: (Ht / s - (d.H - d.cb)) / d.cb, leaf: lerp(0.5, 1.001, smoothstep(0.1, 0.6, g)) };
    },
  }, opts);
}

// ═════════════════════════════ CECROPIA ═════════════════════════════
function ringCol(base, ring, n) {
  const b = new THREE.Color(base), r = new THREE.Color(ring);
  return (c, p, nn, uv) => { const k = Math.pow(Math.abs(Math.sin(uv.x * n * Math.PI)), 14); c.copy(b).lerp(r, k * 0.8 + 0.08 * hash3(uv.x * 40, uv.y * 7, 2)); };
}
// palmate umbrella leaf: lobes radiating from centre, drooping at the tips (built around origin, facing up)
function addPalmate(gb, rng, centre, size, tilt, yaw, rank, col = '#4f8f3a') {
  const nl = 8;
  const m0 = place(centre, yaw, tilt, 0);
  for (let k = 0; k < nl; k++) {
    const a = (k / nl) * TAU;
    const L = size * (0.75 + 0.25 * Math.cos(a * 2) * 0.5 + 0.1 * rng());
    const g = leafBlade(L, size * 0.36, { segs: 3, bend: 0.38, fold: 0.15, shape: 'lance' });
    g.applyMatrix4(M().makeRotationY(a));
    gb.add(g, { m: m0, colFn: leafCol(col, rng, { dl: 0.05 }), leaf: 1, rank, centre });
  }
}
function buildCecropia(v) {
  const rng = vrng('cecropia', v);
  const gb = new GB(rng); const cb = 9 + v; gb.cb = cb; const H = 16 + v * 0.8;
  const lean = new V3(rng.range(-0.6, 0.6), 0, rng.range(-0.6, 0.6));
  const tTop = new V3(lean.x, cb + 2.5, lean.z);
  const trunk = curveOf([new V3(0, -0.2, 0), new V3(lean.x * 0.1, cb * 0.45, lean.z * 0.2), new V3(lean.x * 0.6, cb * 0.85, lean.z * 0.6), tTop]);
  gb.add(trunkGeo(trunk, { r0: 0.3, r1: 0.16, segs: 12, radial: 8, flare: 0.25, flareH: 0.03, noise: 0.03 }), { colFn: ringCol('#d4d1c3', '#8c8a7c', 26) });
  // stilt roots
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + rng() * 0.5; const p0 = new V3(Math.cos(a) * 0.1, 1.1 + rng() * 0.4, Math.sin(a) * 0.1);
    const p1 = new V3(Math.cos(a) * 0.8, -0.1, Math.sin(a) * 0.8);
    gb.add(trunkGeo(curveOf([p0, p0.clone().lerp(p1, 0.5).add(new V3(Math.cos(a) * 0.15, 0.1, Math.sin(a) * 0.15)), p1]), { r0: 0.08, r1: 0.06, segs: 3, radial: 4, flare: 0, noise: 0.05 }), { col: '#a8a594', late: 0.4 + i * 0.1, pivot: p0, anchorY: 0 });
  }
  const attach = [], perch = [], tips = [];
  // candelabra: 3-4 branches curving up
  const nb = 3 + (v % 2);
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * TAU + rng.range(-0.3, 0.3); const dir = new V3(Math.cos(a), 0, Math.sin(a));
    const p0 = trunk.getPointAt(rng.range(0.72, 0.88));
    const p1 = p0.clone().addScaledVector(dir, rng.range(2.6, 3.6)).add(new V3(0, rng.range(3.0, 4.2), 0));
    const mid = p0.clone().addScaledVector(dir, 2.0).add(new V3(0, 0.6, 0));
    const c = curveOf([p0, mid, p1]);
    gb.add(trunkGeo(c, { r0: 0.13, r1: 0.08, segs: 6, radial: 6, flare: 0.1, flareH: 0.1 }), { colFn: ringCol('#cfccbd', '#8c8a7c', 10) });
    tips.push({ p: p1, dir });
    attach.push({ pos: c.getPointAt(0.25).add(new V3(0, 0.13, 0)), normal: new V3(0, 1, 0), minG: 0.4 });
    attach.push({ pos: c.getPointAt(0.55).add(new V3(0, 0.1, 0)), normal: dir.clone().add(new V3(0, 1, 0)).normalize(), minG: 0.5 });
    perch.push({ pos: c.getPointAt(0.35).add(new V3(0, 0.1, 0)) });
    perch.push({ pos: c.getPointAt(0.7), minG: 0.5 });
  }
  tips.push({ p: tTop, dir: new V3(0, 1, 0) });
  attach.push({ pos: trunk.getPointAt(0.6).add(new V3(0.2, 0, 0)), normal: new V3(1, 0.4, 0).normalize(), minG: 0.5 });
  // leaf clusters at tips: long petioles holding big palmate leaves spreading outward/down
  let rk = 0;
  tips.forEach((tp, ti) => {
    const nl = ti === tips.length - 1 ? 6 : 5;
    for (let k = 0; k < nl; k++) {
      const a = (k / nl) * TAU + rng() * 0.6; const d = new V3(Math.cos(a), 0, Math.sin(a));
      const L = rng.range(1.1, 1.5);
      const end = tp.p.clone().addScaledVector(d, L).add(new V3(0, rng.range(-0.1, 0.5), 0));
      gb.add(new THREE.CylinderGeometry(0.02, 0.03, 1, 3).translate(0, 0.5, 0), { m: orient(tp.p, end.clone().sub(tp.p), 0, new V3(1, tp.p.distanceTo(end), 1)), col: '#9c8760', leaf: 1, flutter: 0, rank: rk, centre: tp.p });
      addPalmate(gb, rng, end, rng.range(1.35, 1.75), rng.range(-0.15, 0.25), a, rk, '#4c8a38');
      rk = Math.min(0.98, rk + 0.04 + rng() * 0.04);
    }
    // finger-like catkin fruit spikes hanging under the cluster
    for (let k = 0; k < 4; k++) {
      const a = rng() * TAU; const q = tp.p.clone().add(new V3(Math.cos(a) * 0.2, -0.1, Math.sin(a) * 0.2));
      const g = new THREE.CylinderGeometry(0.05, 0.035, 0.9, 4).translate(0, -0.45, 0);
      gb.add(g, { m: orient(q, new V3(Math.cos(a) * 0.4, 1, Math.sin(a) * 0.4), 0), col: '#93a35a', cj: [0.03, 0.08, 0.06], reveal: 2, centre: q });
      gb.add(new THREE.CylinderGeometry(0.03, 0.025, 0.55, 3).translate(0, -0.28, 0), { m: orient(q, new V3(Math.cos(a) * -0.3, 1, Math.sin(a) * -0.3), 0), col: '#e8e0b8', reveal: 1, centre: q });
    }
    perch.push({ pos: tp.p.clone().add(new V3(0, 0.1, 0)), minG: 0.6 });
  });
  return { geo: gb.build(), tris: gb.tris, cb, H, attach, perch };
}
export function cecropia(opts) {
  const v = variantOf(opts);
  const d = cached('cecropia' + v, () => buildCecropia(v));
  const sd = cached('cecropia-seed', () => { const rng = vrng('cec-s', 0); const gb = new GB(rng);
    gb.add(trunkGeo(curveOf([new V3(0, 0, 0), new V3(0.02, 0.6, 0), new V3(0, 1.2, 0.02)]), { r0: 0.05, r1: 0.03, segs: 4, radial: 5, flare: 0.2 }), { colFn: ringCol('#c9c6b5', '#8c8a7c', 6) });
    for (let k = 0; k < 3; k++) { const a = k * 2.2; const p = new V3(Math.cos(a) * 0.35, 1.1 + k * 0.08, Math.sin(a) * 0.35); addPalmate(gb, rng, p, 0.45, 0.2, a, k * 0.2, '#5a9a40'); }
    return gb.build(); });
  return makeVisual({
    name: 'cecropia', geo: d.geo, seedGeo: sd, H: d.H, cb: d.cb, trunkR: 0.3, sway: 0.018, droop: 0.6,
    look: { under: 0.7, underCol: '#b9c7ae' },
    crown: { top: d.H, bottom: d.cb, radius: 5.2, density: 0.55 }, attach: d.attach, perch: d.perch,
    grow(g) {
      if (g < 0.08) return { seed: lerp(0.5, 1.2, g / 0.08) };
      const Ht = 2 + 14 * Math.pow(g, 0.85), s = 0.22 + 0.78 * g;
      return { s, sxz: s * lerp(0.65, 1, g), stretch: (Ht / s - (d.H - d.cb)) / d.cb, late: g, leaf: lerp(0.5, 1.001, smoothstep(0.1, 0.6, g)) };
    },
  }, opts);
}

// ═════════════════════════════ AÇAÍ PALM (Euterpe oleracea) ═════════════════════════════
// Pinnate frond: rachis arching out & down, leaflets hanging (pendulous) on both sides.
function addFrond(gb, rng, base, dir, len, { rank = 0, pairs = 14, leafLen = 0.9, col = '#3f7d34', droop = 0.9, rachisCol = '#6f7a3c', late, pivot } = {}) {
  const d = dir.clone().normalize();
  const side0 = new V3(-d.z, 0, d.x).normalize();
  const p1 = base.clone().addScaledVector(d, len * 0.45).add(new V3(0, len * 0.32, 0));
  const p2 = base.clone().addScaledVector(d, len * 0.85).add(new V3(0, len * 0.1, 0));
  const p3 = base.clone().addScaledVector(d, len * 1.05).add(new V3(0, -len * 0.25 * droop, 0));
  const rc = curveOf([base, p1, p2, p3]);
  const extra = { leaf: 1, rank, centre: base, late, pivot };
  gb.add(trunkGeo(rc, { r0: 0.045, r1: 0.012, segs: 5, radial: 3, flare: 0, noise: 0, cap: false }), { col: rachisCol, ...extra, flutter: 0.6 });
  const lc = jitterColor(col, rng, 0.02, 0.06, 0.06), tip = lc.clone().offsetHSL(0.02, 0, 0.08);
  const pos = [], cols = [];
  for (let i = 0; i < pairs; i++) {
    const t = 0.12 + 0.86 * (i / (pairs - 1));
    const P = rc.getPointAt(t), T = rc.getTangentAt(t);
    const L = leafLen * Math.sin(Math.PI * (0.15 + 0.8 * t)) * (0.85 + 0.3 * rng());
    for (const sd of [-1, 1]) {
      const side = new V3().crossVectors(T, new V3(0, 1, 0)).normalize().multiplyScalar(sd);
      const hang = side.clone().multiplyScalar(0.45).add(new V3(0, -0.85, 0)).addScaledVector(T, 0.25).normalize();
      const tipP = P.clone().addScaledVector(hang, L);
      const mid = P.clone().addScaledVector(hang, L * 0.45).addScaledVector(side, 0.07);
      const b2 = P.clone().addScaledVector(T, 0.06);
      // two triangles: base(P,b2)->mid, mid->tip
      pos.push(...P.toArray(), ...mid.toArray(), ...b2.toArray(), ...b2.toArray(), ...mid.toArray(), ...tipP.toArray());
      for (let k = 0; k < 6; k++) { const c = k === 5 ? tip : lc; cols.push(c.r, c.g, c.b); }
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  const cArr = cols;
  gb.add(g, { colFn: (c, p, n, uv, i) => c.setRGB(cArr[i * 3], cArr[i * 3 + 1], cArr[i * 3 + 2]), ...extra, flutter: 1.2 });
  return rc;
}
function buildAcai(v) {
  const rng = vrng('acai', v);
  const gb = new GB(rng); const H = 10.8 + v * 0.5;
  const ns = 4 + (v === 2 ? 1 : 0) - (v === 1 ? 1 : 0); // 4,3,5 stems
  const perch = [], tops = [];
  for (let si = 0; si < ns; si++) {
    const main = si === 0;
    const a = (si / ns) * TAU + rng.range(-0.3, 0.3);
    const h = main ? H - 1.6 : rng.range(H * 0.55, H * 0.9) - 1.6;
    const off = main ? 0 : rng.range(0.35, 0.6);
    const b0 = new V3(Math.cos(a) * off, -0.1, Math.sin(a) * off);
    const lean = main ? 0.25 : rng.range(0.8, 1.6);
    const top = new V3(Math.cos(a) * (off + lean), h, Math.sin(a) * (off + lean));
    const mid = b0.clone().lerp(top, 0.5); mid.x += Math.cos(a) * lean * -0.25; mid.z += Math.sin(a) * lean * -0.25;
    const sc = curveOf([b0, mid, top]);
    const late = main ? -1 : 0.25 + si * 0.15; const pivot = b0.clone();
    gb.add(trunkGeo(sc, { r0: 0.13, r1: 0.1, segs: 8, radial: 6, flare: 0.25, flareH: 0.04, noise: 0.03 }), { colFn: ringCol('#8e8b78', '#5d5a4c', 30), late, pivot });
    // crownshaft (smooth, olive-purple)
    const csTop = top.clone().add(new V3(0, 1.3, 0));
    gb.add(trunkGeo(curveOf([top, top.clone().lerp(csTop, 0.5), csTop]), { r0: 0.15, r1: 0.11, segs: 2, radial: 6, flare: 0, noise: 0 }), { col: '#6c7a3e', cj: [0.03, 0.08, 0.06], late, pivot });
    // stilt roots at base
    if (main || rng() < 0.5) for (let k = 0; k < 3; k++) { const ra = rng() * TAU; gb.add(new THREE.ConeGeometry(0.07, 0.6, 4).translate(0, 0.3, 0), { m: orient(b0.clone().add(new V3(Math.cos(ra) * 0.12, 0, Math.sin(ra) * 0.12)), new V3(-Math.cos(ra), 2.5, -Math.sin(ra)), 0), col: '#7a6a4a', late, pivot }); }
    // fronds
    const nf = main ? 9 : (ns >= 5 ? 5 : 6);
    for (let k = 0; k < nf; k++) {
      const fa = (k / nf) * TAU + rng() * 0.4;
      const up = k < 2 ? 1.6 : rng.range(0.15, 0.6);
      const dir = new V3(Math.cos(fa), up, Math.sin(fa));
      addFrond(gb, rng, csTop.clone(), dir, rng.range(2.4, 3.1) * (main ? 1 : 0.85), { rank: k < 2 ? 0.05 * k : 0.15 + rng() * 0.85, pairs: main ? 12 : 9, late, pivot, droop: k < 2 ? 0.2 : 1 });
    }
    tops.push({ top, csTop, late, pivot });
    perch.push({ pos: csTop.clone().add(new V3(0, 0.1, 0)), minG: main ? 0.4 : 0.8 });
  }
  // berry bunches below the crownshaft: rachillae (bloom: cream) + dark purple berries (fruit)
  tops.forEach(({ top, late, pivot }, si) => {
    for (let b = 0; b < (si === 0 ? 3 : 1); b++) {
      const a = rng() * TAU; const d = new V3(Math.cos(a), 0, Math.sin(a));
      const q = top.clone().addScaledVector(d, 0.14).add(new V3(0, 0.15, 0));
      for (let r = 0; r < 5; r++) {
        const rd = d.clone().multiplyScalar(0.8).add(new V3(rng.range(-0.4, 0.4), rng.range(-1.2, -0.3), rng.range(-0.4, 0.4))).normalize();
        const L = rng.range(0.55, 0.8);
        gb.add(new THREE.CylinderGeometry(0.035, 0.03, L * 0.95, 3, 1, true).translate(0, L / 2, 0), { m: orient(q, rd, 0), col: '#efe7c2', late, pivot, reveal: 1, centre: q });
        for (let k = 0; k < 3; k++) {
          const bp = q.clone().addScaledVector(rd, L * (0.4 + k * 0.22)).add(new V3(rng.range(-0.04, 0.04), 0, rng.range(-0.04, 0.04)));
          gb.add(octa(0.075), { m: M().setPosition(bp), col: '#3a1640', cj: [0.02, 0.1, 0.05], late, pivot, reveal: 2, centre: bp });
        }
      }
    }
  });
  return { geo: gb.build(), tris: gb.tris, H, perch };
}
export function acai(opts) {
  const v = variantOf(opts);
  const d = cached('acai' + v, () => buildAcai(v));
  const sd = cached('acai-seed', () => { const rng = vrng('acai-s', 0); const gb = new GB(rng);
    for (let k = 0; k < 5; k++) { const a = k * 2.4; addFrond(gb, rng, new V3(0, 0.05, 0), new V3(Math.cos(a), 1.6 - k * 0.2, Math.sin(a)), 0.9, { rank: k * 0.15, pairs: 7, leafLen: 0.35, droop: 0.6 }); }
    return gb.build(); });
  return makeVisual({
    name: 'acai', geo: d.geo, seedGeo: sd, H: d.H, trunkR: 0.14, sway: 0.03, droop: 0.4,
    crown: { top: d.H + 1.4, bottom: d.H - 3.0, radius: 3.3, density: 0.4 }, perch: d.perch,
    seedCrown: { top: 1.0, bottom: 0.2, radius: 0.8, density: 0.25 },
    grow(g) {
      if (g < 0.08) return { seed: lerp(0.6, 1.3, g / 0.08) };
      return { s: 0.18 + 0.82 * g, sxz: (0.18 + 0.82 * g) * lerp(1.6, 1, g), late: g };
    },
  }, opts);
}
