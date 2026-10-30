// The island's shape and height field: the edge outline, the river (amazon) or spring pool (grove), the fallen-log
// crossings and walking routes over them, the rock outcrop layout, and the soil / cover values the ground mesh is built from.
// Exports: createTerrain(ctx) → { edgeR, WL, riverPts, riverHW, springPool, pools, riverExit, rocks, heightAt, isWater,
// poolShapeR, bridges, bridgeTops, bridgeAt, nearBridge, walkRoute, waterDist, rockInfluence, buildGround, coverAt }.
// Needs from ctx: isAmazon, seed, noise, noiseB, qual; river (1.3.3: a stream on a grove island, the training field).
import * as THREE from 'three';
import { makeNoise2D, clamp, lerp, smoothstep } from '../../core/util.js';
import { R, TAU, C, tmpC, V3 } from './common.js';
import { DESERT, desertHeight } from './desert-look.js';

export function createTerrain(ctx) {
  const { isAmazon, isDesert, seed, noise, noiseB, qual } = ctx;
  // 1.3.3: the training field (שטח האימונים) is the grove's land with the Amazon's stream running through it (ctx.river)
  const hasRiver = isAmazon || !!ctx.river;
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

  if (hasRiver) {
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
    if (isDesert) h += desertHeight(x, z, noise);   // dunes, the dry wadi and the sandstone mesa (desert-look.js)
    else if (!isAmazon) {
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
  if (!hasRiver) {
    const P = isDesert ? { ...DESERT.pool } : { x: 13, z: -6, r: 4.3 };   // the desert: the oasis spring
    P.h0 = rawHeight(P.x, P.z);
    WL = P.h0 - 0.12;
    pools = [P];
  }

  function heightAt(x, z) {
    let h = rawHeight(x, z);
    if (hasRiver) {
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
    if (hasRiver && riverPts) {
      if (Math.hypot(x, z) > edgeR(Math.atan2(z, x))) return false;
      return distToRiver(x, z).d < riverHW - 0.15;
    }
    return false;
  }
  // ───────────────────────────── fallen-log crossings over the river (ground animals walk across them)
  const bridges = [];
  if (hasRiver) {
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
    if (hasRiver) d = Math.min(d, distToRiver(x, z).d - riverHW);
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
  } else if (isDesert) {
    for (const [x, z, r] of DESERT.rocks) addOutcrop(x, z, r);
  } else {
    const cand = [[-17, -15, 3.8], [-25, 4, 2.8], [-8, 22, 2.6], [17, 22, 3.0], [26, -14, 3.2], [3, -24, 2.4], [-28, -22, 2.6], [17.5, -2.5, 1.8], [8.5, -10.5, 1.5]];
    for (const [x, z, r] of cand) if (!hasRiver || x * x + z * z > 400) addOutcrop(x, z, r);   // the training field: no rocks in the middle (the stream runs there)
  }

  // ───────────────────────────── ground (top surface)
  const SOIL = isAmazon
    ? { a: C('#3b2b1d'), b: C('#4c3624'), mud: C('#2c2219'), bed: C('#5a4a34'), rock: C('#5c5446') }
    : isDesert ? DESERT.soil
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
    if (isDesert) c = c * 0.3 + (WL !== null ? smoothstep(6, 0.5, waterDist(x, z)) * 0.55 : 0);   // bare sand; green only by the oasis
    return clamp(c);
  }
  return {
    hasRiver, edgeR, WL, riverPts, riverHW, springPool, pools, riverExit, rocks, heightAt, isWater, poolShapeR,
    bridges, bridgeTops, bridgeAt, nearBridge, walkRoute, waterDist, rockInfluence, buildGround, coverAt
  };
}
