// Small geometry builders for the instanced ground scatter (grass tufts, ferns, bushes, big leaves, leaf litter, pebbles,
// flowers, thistles) and vertex-colour helpers. Pure functions: every random choice comes from the rr() passed in.
// Exports: colorize, geoFromArrays, twoSided, upNormals, grassTuftGeom, fernGeom, blobGeom, bigLeafGeom, leafLitterGeom,
// pebbleGeom, flowerGeom, thistleGeom.  Needs: three, core/util.js, common.js.
import * as THREE from 'three';
import { clamp, mergeGeometries } from '../../core/util.js';
import { TAU, tmpC } from './common.js';

// geometry builders ------------------------------------------------------
export function colorize(g, fn) {
  const p = g.attributes.position; const n = p.count; const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const c = fn(p.getX(i), p.getY(i), p.getZ(i), i); a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
export function geoFromArrays(pos, col, idx) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  if (idx) g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
export function twoSided(g) {
  const p = g.attributes.position.array, n = g.attributes.normal.array, c = g.attributes.color.array; const cnt = g.attributes.position.count;
  const P = new Float32Array(cnt * 6), Nn = new Float32Array(cnt * 6), Cc = new Float32Array(cnt * 6);
  P.set(p); Nn.set(n); Cc.set(c);
  for (let t = 0; t < cnt / 3; t++) for (let k = 0; k < 3; k++) {
    const src = t * 3 + (2 - k), dst = cnt + t * 3 + k;
    for (let q = 0; q < 3; q++) { P[dst * 3 + q] = p[src * 3 + q]; Nn[dst * 3 + q] = n[src * 3 + q]; Cc[dst * 3 + q] = c[src * 3 + q]; }
  }
  const o = new THREE.BufferGeometry();
  o.setAttribute('position', new THREE.BufferAttribute(P, 3)); o.setAttribute('normal', new THREE.BufferAttribute(Nn, 3)); o.setAttribute('color', new THREE.BufferAttribute(Cc, 3));
  g.dispose(); return o;
}
export function upNormals(g, k = 1) {
  const nr = g.attributes.normal; const n = nr.count;
  for (let i = 0; i < n; i++) { const x = nr.getX(i) * (1 - k), y = nr.getY(i) * (1 - k) + k, z = nr.getZ(i) * (1 - k); const l = Math.hypot(x, y, z) || 1; nr.setXYZ(i, x / l, y / l, z / l); }
  return g;
}
export function grassTuftGeom(blades = 7, rr) {
  const pos = [], col = [];
  for (let b = 0; b < blades; b++) {
    const a = b / blades * TAU + rr() * 0.6; const lean = 0.2 + rr() * 0.4; const h = 0.6 + rr() * 0.4; const w = 0.06 + rr() * 0.03;
    const dx = Math.cos(a), dz = Math.sin(a); const px = -dz, pz = dx;
    const ox = dx * 0.04 * rr(), oz = dz * 0.04 * rr();
    const mid = [ox + dx * lean * 0.35 * h, h * 0.55, oz + dz * lean * 0.35 * h];
    const tip = [ox + dx * lean * h, h, oz + dz * lean * h];
    const v = [[ox - px * w, 0, oz - pz * w], [ox + px * w, 0, oz + pz * w], [mid[0] - px * w * 0.6, mid[1], mid[2] - pz * w * 0.6], [mid[0] + px * w * 0.6, mid[1], mid[2] + pz * w * 0.6], tip];
    const sh = [0.7, 0.7, 0.9, 0.9, 1.12];
    for (const t of [[0, 1, 2], [1, 3, 2], [2, 3, 4]]) for (const k of t) { pos.push(...v[k]); col.push(sh[k], sh[k], sh[k]); }
  }
  return geoFromArrays(pos, col);
}
export function fernGeom(rr, fronds = 6) {
  const pos = [], col = [];
  for (let f = 0; f < fronds; f++) {
    const a = f / fronds * TAU + rr() * 0.4; const L = 0.8 + rr() * 0.35; const segs = 4; const rise = 0.5 + rr() * 0.25;
    const dx = Math.cos(a), dz = Math.sin(a); const px = -dz, pz = dx;
    let prev = null;
    for (let s = 0; s <= segs; s++) {
      const t = s / segs; const x = dx * L * t, z = dz * L * t; const y = rise * Math.sin(t * Math.PI * 0.85) * (1 - t * 0.3);
      const w = 0.2 * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.08));
      const cur = { c: [x, y, z], l: [x + px * w, y - 0.05, z + pz * w], r: [x - px * w, y - 0.05, z - pz * w] };
      if (prev) {
        const shA = 0.6 + 0.5 * t;
        for (const tri of [[prev.c, prev.l, cur.c], [prev.l, cur.l, cur.c], [prev.c, cur.c, prev.r], [prev.r, cur.c, cur.r]]) for (const v of tri) { pos.push(...v); col.push(shA * 0.9, shA, shA * 0.85); }
      }
      prev = cur;
    }
  }
  return geoFromArrays(pos, col);
}
export function blobGeom(rr, n = 5, flat = 0.75) {
  const parts = [];
  for (let i = 0; i < n; i++) {
    const g = new THREE.IcosahedronGeometry(0.45 + rr() * 0.3, 0);
    const a = rr() * TAU, d = i === 0 ? 0 : 0.35 + rr() * 0.3;
    g.scale(1, flat, 1); g.translate(Math.cos(a) * d, 0.35 + rr() * 0.35 + (i === 0 ? 0.2 : 0), Math.sin(a) * d);
    parts.push(colorize(g, (x, y) => tmpC.setScalar(0.55 + 0.5 * clamp(y / 1.1))));
  }
  const m = mergeGeometries(parts); parts.forEach(p => p.dispose()); return m;
}
export function bigLeafGeom(rr, leaves = 6) {
  const pos = [], col = [];
  for (let l = 0; l < leaves; l++) {
    const a = l / leaves * TAU + rr() * 0.5; const dx = Math.cos(a), dz = Math.sin(a); const px = -dz, pz = dx;
    const stemH = 0.5 + rr() * 0.6; const L = 0.9 + rr() * 0.5; const W = L * 0.42;
    // petiole as a thin triangle
    pos.push(-px * 0.03, 0, -pz * 0.03, px * 0.03, 0, pz * 0.03, dx * 0.25, stemH, dz * 0.25); col.push(0.45, 0.55, 0.3, 0.45, 0.55, 0.3, 0.6, 0.7, 0.4);
    const base = [dx * 0.25, stemH, dz * 0.25];
    const segs = 5; let prev = null;
    for (let s = 0; s <= segs; s++) {
      const t = s / segs; const w = W * Math.sin(Math.PI * t) * 0.5;
      const c = [base[0] + dx * L * t, base[1] + Math.sin(t * 1.4) * 0.25 - t * t * 0.45, base[2] + dz * L * t];
      const cur = { c, l: [c[0] + px * w, c[1] - w * 0.25, c[2] + pz * w], r: [c[0] - px * w, c[1] - w * 0.25, c[2] - pz * w] };
      if (prev) for (const tri of [[prev.c, prev.l, cur.c], [prev.l, cur.l, cur.c], [prev.c, cur.c, prev.r], [prev.r, cur.c, cur.r]]) for (const v of tri) { pos.push(...v); const sh = 0.75 + 0.35 * t; col.push(sh, sh, sh); }
      prev = cur;
    }
  }
  return geoFromArrays(pos, col);
}
export function leafLitterGeom() {
  const pos = [0, 0.01, -0.5, 0.22, 0.03, 0, 0, 0.06, 0.02, 0, 0.01, -0.5, 0, 0.06, 0.02, -0.22, 0.03, 0, 0.22, 0.03, 0, 0, 0.01, 0.5, 0, 0.06, 0.02, -0.22, 0.03, 0, 0, 0.06, 0.02, 0, 0.01, 0.5];
  const col = []; for (let i = 0; i < 12; i++) col.push(1, 1, 1);
  return geoFromArrays(pos, col);
}
export function pebbleGeom(rr, flat = 0.55, detail = 0) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = 0.85 + 0.3 * rr(); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * flat, p.getZ(i) * k); }
  g.computeVertexNormals();
  return colorize(g, (x, y) => tmpC.setScalar(y < 0 ? 0.75 : 1));
}
export function flowerGeom() {
  const pos = [], col = [];
  const H = 0.4;
  pos.push(-0.012, 0, 0, 0.012, 0, 0, 0, H, 0); col.push(0.3, 0.5, 0.2, 0.3, 0.5, 0.2, 0.35, 0.55, 0.25);
  pos.push(0, 0, -0.012, 0, 0, 0.012, 0, H, 0); col.push(0.3, 0.5, 0.2, 0.3, 0.5, 0.2, 0.35, 0.55, 0.25);
  const P = 6, rP = 0.16;
  for (let i = 0; i < P; i++) {
    const a0 = i / P * TAU, a1 = (i + 0.5) / P * TAU, a2 = (i + 1) / P * TAU;
    const tip = [Math.cos(a1) * rP, H + 0.035, Math.sin(a1) * rP];
    pos.push(0, H, 0, Math.cos(a0) * rP * 0.55, H + 0.015, Math.sin(a0) * rP * 0.55, ...tip); col.push(1, 1, 1, 1, 1, 1, 1, 1, 1);
    pos.push(0, H, 0, ...tip, Math.cos(a2) * rP * 0.55, H + 0.015, Math.sin(a2) * rP * 0.55); col.push(1, 1, 1, 1, 1, 1, 1, 1, 1);
  }
  for (let i = 0; i < 5; i++) { const a0 = i / 5 * TAU, a1 = (i + 1) / 5 * TAU; pos.push(0, H + 0.03, 0, Math.cos(a1) * 0.03, H + 0.02, Math.sin(a1) * 0.03, Math.cos(a0) * 0.03, H + 0.02, Math.sin(a0) * 0.03); col.push(0.08, 0.06, 0.1, 0.08, 0.06, 0.1, 0.08, 0.06, 0.1); }
  return geoFromArrays(pos, col);
}
export function thistleGeom(rr) {
  const pos = [], col = [];
  const stems = 3;
  for (let s = 0; s < stems; s++) {
    const a = rr() * TAU, lean = 0.15 * rr(); const H = 0.55 + rr() * 0.35;
    const tx = Math.cos(a) * lean, tz = Math.sin(a) * lean;
    pos.push(-0.015, 0, 0, 0.015, 0, 0, tx, H, tz); col.push(0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.8, 0.8, 0.8);
    pos.push(0, 0, -0.015, 0, 0, 0.015, tx, H, tz); col.push(0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.8, 0.8, 0.8);
    // spiky head
    const hr = 0.06 + rr() * 0.03;
    for (let k = 0; k < 10; k++) {
      const u = rr() * TAU, v = rr() * Math.PI; const d = [Math.cos(u) * Math.sin(v), Math.cos(v), Math.sin(u) * Math.sin(v)];
      const tip = [tx + d[0] * hr * 2.2, H + d[1] * hr * 2.2, tz + d[2] * hr * 2.2];
      pos.push(tx - d[2] * hr * 0.6, H, tz + d[0] * hr * 0.6, tx + d[2] * hr * 0.6, H, tz - d[0] * hr * 0.6, ...tip); col.push(0.85, 0.85, 0.85, 0.85, 0.85, 0.85, 1, 1, 1);
    }
    // a couple of spiny leaves
    for (let k = 0; k < 2; k++) {
      const la = rr() * TAU; const lh = H * (0.2 + rr() * 0.4);
      pos.push(0, lh, 0, Math.cos(la) * 0.22, lh + 0.05, Math.sin(la) * 0.22, Math.cos(la + 0.5) * 0.1, lh - 0.02, Math.sin(la + 0.5) * 0.1); col.push(0.7, 0.7, 0.7, 0.75, 0.75, 0.75, 0.7, 0.7, 0.7);
    }
  }
  return geoFromArrays(pos, col);
}
