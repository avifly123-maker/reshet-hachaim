// Light system – the heart of "the struggle for light".
// Crowns (world-space foliage discs) shade everything below them along the sun direction.
// Provides: per-point transmission (for plant growth), a floor light grid (overlay + floorLight goal),
// and canopy-gap detection for the god-ray shafts.
import * as THREE from 'three';
import { clamp, smoothstep } from '../core/util.js';

export function createLightSystem(env, N = 44) {
  const R = env.radius;   // must match the environment's overlay mapping [-R,R]
  const cell = (2 * R) / N;
  const floor = new Float32Array(N * N);
  const forest = new Uint8Array(N * N);
  const land = new Uint8Array(N * N);
  const cellY = new Float32Array(N * N);   // terrain never changes: sample the height of every cell once
  let yLo = 1e9, yHi = -1e9;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = -R + (i + 0.5) * cell, z = -R + (j + 0.5) * cell, k = j * N + i;
    land[k] = Math.hypot(x, z) < env.radius + 1 && !env.isWater(x, z) ? 1 : 0;
    if (land[k]) { cellY[k] = env.heightAt(x, z) + 0.4; yLo = Math.min(yLo, cellY[k]); yHi = Math.max(yHi, cellY[k]); }
  }
  if (yLo > yHi) { yLo = 0; yHi = 1; }
  // Per-cell crown lists (flat linked lists, reused). A crown only shades the cells its shadow can reach, so each cell
  // tests a handful of crowns instead of all of them – same result, several times faster.
  let head = new Int32Array(N * N), nxt = new Int32Array(4096), item = new Int32Array(4096), used = 0;
  let headF = new Int32Array(N * N), nxtF = new Int32Array(4096), itemF = new Int32Array(4096), usedF = 0;
  const cellOf = (v) => Math.floor((v + R) / cell);
  function bucket(crowns, sun) {
    head.fill(-1); headF.fill(-1); used = 0; usedF = 0;
    const sy = Math.max(sun.y, 0.18);
    const push = (k, ci) => { if (used >= item.length) { const n2 = item.length * 2; const a = new Int32Array(n2); a.set(item); item = a; const b2 = new Int32Array(n2); b2.set(nxt); nxt = b2; } item[used] = ci; nxt[used] = head[k]; head[k] = used++; };
    const pushF = (k, ci) => { if (usedF >= itemF.length) { const n2 = itemF.length * 2; const a = new Int32Array(n2); a.set(itemF); itemF = a; const b2 = new Int32Array(n2); b2.set(nxtF); nxtF = b2; } itemF[usedF] = ci; nxtF[usedF] = headF[k]; headF[k] = usedF++; };
    for (let ci = 0; ci < crowns.length; ci++) {
      const c = crowns[ci];
      if (c.top > 5) {   // "forest" cells: within radius + 5 of a tall crown
        const rr = c.radius + 5;
        const i0 = Math.max(0, cellOf(c.x - rr)), i1 = Math.min(N - 1, cellOf(c.x + rr)), j0 = Math.max(0, cellOf(c.z - rr)), j1 = Math.min(N - 1, cellOf(c.z + rr));
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) pushF(j * N + i, ci);
      }
      if (c.density <= 0.01 || c.top <= yLo + 0.2) continue;
      // the shadow centre slides along the sun direction with the receiver height: bound it over the island's height range
      let mnx = 1e9, mxx = -1e9, mnz = 1e9, mxz = -1e9;
      for (const y of [yLo, yHi]) {
        const hc = Math.max((c.top + c.bottom) * 0.5, y + 0.1), t = (hc - y) / sy;
        const sx = c.x - sun.x * t, sz = c.z - sun.z * t;
        mnx = Math.min(mnx, sx); mxx = Math.max(mxx, sx); mnz = Math.min(mnz, sz); mxz = Math.max(mxz, sz);
      }
      const r = c.radius + cell;
      const i0 = Math.max(0, cellOf(mnx - r)), i1 = Math.min(N - 1, cellOf(mxx + r)), j0 = Math.max(0, cellOf(mnz - r)), j1 = Math.min(N - 1, cellOf(mxz + r));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) push(j * N + i, ci);
    }
  }
  // transmission at a cell using only the crowns bucketed there (identical maths to transmission())
  function cellTransmission(k, x, y, z, crowns, sun) {
    const sy = Math.max(sun.y, 0.18);
    let tr = 1;
    for (let e = head[k]; e >= 0; e = nxt[e]) {
      const c = crowns[item[e]];
      if (c.top <= y + 0.2) continue;
      const hc = Math.max((c.top + c.bottom) * 0.5, y + 0.1);
      const t = (hc - y) / sy;
      const d = Math.hypot(x + sun.x * t - c.x, z + sun.z * t - c.z);
      if (d >= c.radius) continue;
      let cov = 1 - smoothstep(c.radius * 0.5, c.radius, d);
      if (c.bottom < y) cov *= clamp((c.top - y) / Math.max(0.5, c.top - c.bottom));
      tr *= 1 - c.density * cov * 0.94;
      if (tr < 0.02) return 0.02;
    }
    return tr;
  }
  function cellForest(k, x, z, crowns) {
    for (let e = headF[k]; e >= 0; e = nxtF[e]) { const c = crowns[itemF[e]]; if (Math.hypot(x - c.x, z - c.z) < c.radius + 5) return 1; }
    return 0;
  }
  const texData = new Uint8Array(N * N * 4);
  const texture = new THREE.DataTexture(texData, N, N, THREE.RGBAFormat);
  texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearFilter; texture.needsUpdate = true;
  const noonSun = env.sun.direction.clone();
  if (noonSun.y < 0.5) noonSun.set(0.3, 0.9, 0.2).normalize();

  // transmission of light reaching point (x,y,z) from direction sun (unit, toward sun)
  function transmission(x, y, z, crowns, sun, exclude = null) {
    const sy = Math.max(sun.y, 0.18);
    let tr = 1;
    for (let k = 0; k < crowns.length; k++) {
      const c = crowns[k];
      if (c.ref === exclude || c.density <= 0.01) continue;
      if (c.top <= y + 0.2) continue;                       // crown entirely below the point
      const hc = Math.max((c.top + c.bottom) * 0.5, y + 0.1);
      const t = (hc - y) / sy;
      const px = x + sun.x * t, pz = z + sun.z * t;
      const d = Math.hypot(px - c.x, pz - c.z);
      if (d >= c.radius) continue;
      let cov = 1 - smoothstep(c.radius * 0.5, c.radius, d);
      if (c.bottom < y) cov *= clamp((c.top - y) / Math.max(0.5, c.top - c.bottom)); // point inside the crown band
      tr *= 1 - c.density * cov * 0.94;
      if (tr < 0.02) return 0.02;
    }
    return tr;
  }

  // floor grid + overlay texture. Uses the given sun.
  function computeFloor(crowns, sun) {
    let fs = 0, fn = 0;
    bucket(crowns, sun);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i;
      const x = -R + (i + 0.5) * cell, z = -R + (j + 0.5) * cell;
      if (!land[k]) { floor[k] = 1; forest[k] = 0; texData[k * 4 + 3] = 0; continue; }
      const y = cellY[k];
      const v = cellTransmission(k, x, y, z, crowns, sun);
      floor[k] = v;
      // forest cell = some crown overhead within reach (vertical)
      const f = cellForest(k, x, z, crowns);
      forest[k] = f;
      if (f) { fs += v; fn++; }
      // colour ramp: deep shade = indigo, half = teal/green, full = warm gold
      const t = clamp(v);
      let r, g, b;
      if (t < 0.5) { const u = t / 0.5; r = 40 + 20 * u; g = 30 + 150 * u; b = 120 - 30 * u; }
      else { const u = (t - 0.5) / 0.5; r = 60 + 195 * u; g = 180 + 40 * u; b = 90 - 50 * u; }
      texData[k * 4] = r; texData[k * 4 + 1] = g; texData[k * 4 + 2] = b; texData[k * 4 + 3] = 190;
    }
    texture.needsUpdate = true;
    return fn > 0 ? fs / fn : 1;
  }

  // forest-floor light at noon (for the floorLight goal): average over forest cells
  let lastScore = 1;
  function noonFloorScore(crowns) {
    let fs = 0, fn = 0;
    bucket(crowns, noonSun);
    for (let j = 0; j < N; j += 2) for (let i = 0; i < N; i += 2) {
      const k = j * N + i; if (!land[k]) continue;
      const x = -R + (i + 0.5) * cell, z = -R + (j + 0.5) * cell;
      if (!cellForest(k, x, z, crowns)) continue;
      fs += cellTransmission(k, x, cellY[k], z, crowns, noonSun); fn++;
    }
    lastScore = fn >= 6 ? fs / fn : 0;
    return lastScore;
  }

  // canopy gaps → shafts. Must call computeFloor with the same sun first.
  function findShafts(crowns, sun, max = 14) {
    if (sun.y < 0.08) return [];
    const cand = [];
    for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) {
      const k = j * N + i;
      if (!land[k] || !forest[k]) continue;
      const v = floor[k];
      if (v < 0.42) continue;
      // must be a gap: some shaded forest cells around within 2 cells
      let shadeAround = 0, litAround = 0;
      for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
        const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue;
        const kk = jj * N + ii; if (!land[kk]) continue;
        if (floor[kk] < 0.3) shadeAround++; else litAround++;
      }
      if (shadeAround < 3) continue;
      cand.push({ i, j, v, lit: litAround });
    }
    cand.sort((a, b) => b.v - a.v);
    const out = [];
    for (const c of cand) {
      const gx = -R + (c.i + 0.5) * cell, gz = -R + (c.j + 0.5) * cell;
      if (out.some(o => Math.hypot(o.gx - gx, o.gz - gz) < 7)) continue;
      let yTop = 0;
      for (const cr of crowns) if (Math.hypot(cr.x - gx, cr.z - gz) < cr.radius + 9) yTop = Math.max(yTop, cr.top);
      if (yTop < 6) continue;
      const gh = env.heightAt(gx, gz);
      const t = (yTop - gh) / Math.max(sun.y, 0.12);
      const radius = clamp(Math.sqrt(c.lit) * cell * 0.42, 1.4, 4.5);
      out.push({ gx, gz, x: gx + sun.x * t, z: gz + sun.z * t, yTop, radius, strength: clamp((c.v - 0.35) / 0.55) * 0.95 });
      if (out.length >= max) break;
    }
    return out;
  }

  // brightest open floor spots (for "plant in the gap" effects)
  function brightSpots(count, minDist = 4) {
    const cand = [];
    for (let k = 0; k < N * N; k++) if (land[k] && forest[k] && floor[k] > 0.5) cand.push(k);
    cand.sort((a, b) => floor[b] - floor[a]);
    const res = [];
    for (const k of cand) {
      const i = k % N, j = (k / N) | 0;
      const x = -R + (i + 0.5) * cell, z = -R + (j + 0.5) * cell;
      if (res.some(p => Math.hypot(p.x - x, p.z - z) < minDist)) continue;
      res.push({ x, z }); if (res.length >= count) break;
    }
    return res;
  }

  function floorAt(x, z) {
    const i = clamp(Math.floor((x + R) / cell), 0, N - 1), j = clamp(Math.floor((z + R) / cell), 0, N - 1);
    return floor[j * N + i];
  }

  return { transmission, computeFloor, noonFloorScore, findShafts, brightSpots, floorAt, texture, noonSun, get score() { return lastScore; } };
}
