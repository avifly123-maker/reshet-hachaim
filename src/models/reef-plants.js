// Reef "plants" (1.3): corals, sponges, anemones, giant clams, seagrass, algae and drifting plankton – everything on
// the reef that stays in place. Unlike trees, corals barely change shape as they grow, so they are modelled in Blender
// (tools/blender/reef_flora.py → src/data/reef-flora.js: real branches, maze ridges, polyps, tentacles, baked ambient
// occlusion) and appear at full size (Avi's decision, October 2026). The procedural shapes below remain as a fallback
// for any species without a Blender model. Contract: CONTRACT.md §3 (PlantVisual).
//   - a vertex-coloured mesh per species (3 cached variants), one material per instance with a few uniforms:
//     uHealth (bleaching: a sick coral goes pale and white), uSway (soft parts bend in the current, by height),
//     uGlow (polyps open and shine softly at night), uTime
//   - crown(): how much light it blocks (a table coral shades what is under it), perchPoints(): where fish rest
import * as THREE from 'three';
import { makeRng, clamp, lerp, smoothstep, mergeGeometries } from '../core/util.js';
import { REEF_FLORA } from '../data/reef-flora.js';

const TAU = Math.PI * 2;
// diorama scale: like the animals, the reef's corals are drawn larger than life so they read from the camera
const SIZE = { branching: 3.0, brain: 2.8, table: 2.7, firecoral: 2.9, softcoral: 3.1, seafan: 2.8, sponge: 2.8, seaanemone: 3.0, clam: 2.6, seagrass: 2.2, algae: 2.2 };
// the Blender models are fuller and wider than the stand-ins, so they need less enlarging
const SIZE_B = { branching: 2.3, brain: 2.1, table: 1.5, firecoral: 2.1, softcoral: 2.4, seafan: 2.0, sponge: 2.0, seaanemone: 2.5, clam: 2.1, seagrass: 1.9, algae: 2.0 };
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const col = (h) => new THREE.Color(h);

// ───────────────────────────── geometry helpers
function colorize(g, fn) {
  const p = g.attributes.position, a = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { fn(p.getX(i), p.getY(i), p.getZ(i), c, i); a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g;
}
// a tube through points with radii (tapering), closed with a round cap at the end
function tube(pts, radii, seg = 6) {
  const pos = [], idx = [];
  const n = pts.length; let prevN = V3(1, 0, 0);
  for (let i = 0; i < n; i++) {
    const p = pts[i], d = (i < n - 1 ? pts[i + 1].clone().sub(p) : p.clone().sub(pts[i - 1])).normalize();
    let nn = prevN.clone().sub(d.clone().multiplyScalar(prevN.dot(d))); if (nn.lengthSq() < 1e-6) nn = V3(0, 0, 1).cross(d); nn.normalize(); prevN = nn;
    const bb = d.clone().cross(nn).normalize();
    for (let j = 0; j < seg; j++) { const a = (j / seg) * TAU; const v = p.clone().addScaledVector(nn, Math.cos(a) * radii[i]).addScaledVector(bb, Math.sin(a) * radii[i]); pos.push(v.x, v.y, v.z); }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) { const a = i * seg + j, b = i * seg + ((j + 1) % seg), c2 = (i + 1) * seg + ((j + 1) % seg), d2 = (i + 1) * seg + j; idx.push(a, d2, c2, a, c2, b); }
  // tip cap
  const tip = pts[n - 1].clone().add(pts[n - 1].clone().sub(pts[n - 2]).normalize().multiplyScalar(radii[n - 1] * 0.9));
  const ti = pos.length / 3; pos.push(tip.x, tip.y, tip.z);
  for (let j = 0; j < seg; j++) idx.push((n - 1) * seg + j, (n - 1) * seg + ((j + 1) % seg), ti);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function blob(r, sy, detail, rng, wob = 0.12) {
  const g = new THREE.IcosahedronGeometry(r, detail); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const k = 1 + wob * (Math.sin(x * 7.1 + rng() * 0.2) * Math.cos(z * 6.3) + 0.5 * Math.sin(y * 9.7)); p.setXYZ(i, x * k, y * k * sy, z * k); }
  g.computeVertexNormals(); return g;
}

// ───────────────────────────── species shapes (each returns { geo, H, crown, perch, sway, soft })
function branching(rng) {
  const parts = []; const base = col('#e7a6b3'), tipC = col('#fbe3e6');
  function grow(p, dir, len, r, depth) {
    const n = 4, pts = [p.clone()], rad = [r];
    let cur = p.clone(), d = dir.clone();
    for (let i = 1; i <= n; i++) { d.add(V3(rng.range(-0.25, 0.25), 0.18, rng.range(-0.25, 0.25))).normalize(); cur = cur.clone().addScaledVector(d, len / n); pts.push(cur); rad.push(r * (1 - 0.45 * i / n)); }
    parts.push(tube(pts, rad, 6));
    if (depth > 0) { const k = 2 + (rng() < 0.5 ? 1 : 0); for (let i = 0; i < k; i++) { const a = rng() * TAU; grow(cur, V3(Math.cos(a) * 0.7, 0.8, Math.sin(a) * 0.7).normalize().lerp(d, 0.3).normalize(), len * 0.72, r * 0.62, depth - 1); } }
  }
  const trunks = 3 + (rng() * 2 | 0);
  for (let i = 0; i < trunks; i++) { const a = (i / trunks) * TAU + rng() * 0.5; grow(V3(Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12), V3(Math.cos(a) * 0.5, 1, Math.sin(a) * 0.5).normalize(), 0.75, 0.11, 2); }
  const geo = colorize(mergeGeometries(parts), (x, y, z, c) => c.copy(base).lerp(tipC, smoothstep(0.6, 1.7, y)));
  return { geo, H: 1.8, crown: { top: 1.8, bottom: 0.4, radius: 1.1, density: 0.25 }, perch: [V3(0, 1.9, 0), V3(0.6, 1.5, 0.3), V3(-0.5, 1.5, -0.4)], sway: 0, glow: '#ffd6e0' };
}
function brain(rng) {
  const g = new THREE.SphereGeometry(1.15, 40, 22, 0, TAU, 0, Math.PI * 0.55); const p = g.attributes.position;
  const ph = rng() * 10;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const m = Math.sin(x * 6 + Math.sin(z * 4 + ph) * 1.8) * Math.cos(z * 5.5 + Math.sin(x * 3.5) * 1.6);   // meandering grooves
    const k = 1 + 0.045 * m; p.setXYZ(i, x * k, y * 0.78 * k, z * k);
  }
  g.computeVertexNormals();
  const a = col('#c9b46a'), b = col('#8a7a3a');
  const geo = colorize(g, (x, y, z, c) => { const m = Math.sin(x * 6 + Math.sin(z * 4 + ph) * 1.8) * Math.cos(z * 5.5 + Math.sin(x * 3.5) * 1.6); c.copy(a).lerp(b, smoothstep(0.2, -0.6, m)); });
  return { geo, H: 0.95, crown: { top: 0.95, bottom: 0, radius: 1.15, density: 0.5 }, perch: [V3(0, 1.05, 0), V3(0.7, 0.75, 0)], sway: 0, glow: '#e8f0a0' };
}
function table(rng) {
  const parts = [];
  parts.push(tube([V3(0, 0, 0), V3(0.05, 0.5, 0), V3(0, 1.0, 0.04)], [0.22, 0.17, 0.2], 7));
  const plate = new THREE.CylinderGeometry(2.0, 1.6, 0.18, 28, 1); const p = plate.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z); const k = 1 + 0.12 * Math.sin(a * 5 + rng() * 0.3) + 0.06 * Math.sin(a * 11); p.setX(i, x * k); p.setZ(i, z * k); p.setY(i, p.getY(i) + 1.05 + r * 0.08 - 0.05 * Math.sin(a * 7)); }
  plate.computeVertexNormals(); parts.push(plate);
  const g = mergeGeometries(parts);
  const geo = colorize(g, (x, y, z, c) => c.copy(col('#8fb36a')).lerp(col('#d7e6a8'), smoothstep(1.2, 2.1, Math.hypot(x, z))).multiplyScalar(y < 0.95 ? 0.8 : 1));
  return { geo, H: 1.3, crown: { top: 1.3, bottom: 1.0, radius: 2.0, density: 0.75 }, perch: [V3(0, 0.55, 0), V3(1.0, 0.55, 0.3), V3(0, 1.35, 0)], sway: 0, glow: '#d8ffb0' };
}
function firecoral(rng) {
  const parts = [];
  for (let i = 0; i < 5; i++) {
    const w = 0.5 + rng() * 0.5, h = 0.8 + rng() * 0.7;
    const b = new THREE.BoxGeometry(w, h, 0.12, 4, 4, 1); const p = b.attributes.position;
    for (let j = 0; j < p.count; j++) { const y = p.getY(j) + h / 2; const x = p.getX(j); p.setY(j, y + (y > h * 0.9 ? 0.1 * Math.sin(x * 20) : 0)); }
    b.rotateY(rng() * Math.PI); b.translate(rng.range(-0.4, 0.4), 0, rng.range(-0.4, 0.4)); parts.push(b);
  }
  const g = mergeGeometries(parts); g.computeVertexNormals();
  const geo = colorize(g, (x, y, z, c) => c.copy(col('#c9a23a')).lerp(col('#f6f0d8'), smoothstep(1.0, 1.5, y)));
  return { geo, H: 1.5, crown: { top: 1.5, bottom: 0.3, radius: 0.9, density: 0.3 }, perch: [V3(0, 1.6, 0)], sway: 0, glow: '#fff3b0' };
}
function softcoral(rng) {
  const parts = [];
  const stalks = 5 + (rng() * 3 | 0);
  for (let i = 0; i < stalks; i++) {
    const a = rng() * TAU, r = rng() * 0.35, h = 0.5 + rng() * 0.45;
    const base = V3(Math.cos(a) * r, 0, Math.sin(a) * r), top = base.clone().add(V3(Math.cos(a) * 0.15, h, Math.sin(a) * 0.15));
    parts.push(tube([base, base.clone().lerp(top, 0.5), top], [0.07, 0.06, 0.05], 5));
    // the polyp crown: little arms around the top
    for (let k = 0; k < 8; k++) { const b = (k / 8) * TAU; const tip = top.clone().add(V3(Math.cos(b) * 0.18, 0.12, Math.sin(b) * 0.18)); parts.push(tube([top, top.clone().lerp(tip, 0.5).add(V3(0, 0.04, 0)), tip], [0.025, 0.02, 0.012], 4)); }
  }
  const g = mergeGeometries(parts);
  const geo = colorize(g, (x, y, z, c) => c.copy(col('#b593c9')).lerp(col('#f3e9fb'), smoothstep(0.55, 1.05, y)));
  return { geo, H: 1.1, crown: { top: 1.1, bottom: 0.2, radius: 0.6, density: 0.15 }, perch: [V3(0, 1.15, 0)], sway: 0.12, soft: true, glow: '#e6d0ff' };
}
function seafan(rng) {
  const parts = [];
  function br(p, a, len, r, d) {
    const end = p.clone().add(V3(Math.sin(a) * len, Math.cos(a) * len, 0));
    parts.push(tube([p, p.clone().lerp(end, 0.5), end], [r, r * 0.85, r * 0.7], 4));
    if (d > 0) { br(end, a - 0.35 - rng() * 0.2, len * 0.78, r * 0.75, d - 1); br(end, a + 0.35 + rng() * 0.2, len * 0.78, r * 0.75, d - 1); }
  }
  br(V3(0, 0, 0), rng.range(-0.1, 0.1), 0.55, 0.06, 4);
  const g = mergeGeometries(parts);
  const geo = colorize(g, (x, y, z, c) => c.copy(col('#c8402a')).lerp(col('#f08a5a'), smoothstep(0.5, 2.2, y)));
  return { geo, H: 2.2, crown: { top: 2.2, bottom: 0.6, radius: 1.0, density: 0.12 }, perch: [V3(0, 1.0, 0.3)], sway: 0.1, soft: true, glow: '#ffb090' };
}
function sponge(rng) {
  const parts = [], n = 2 + (rng() * 3 | 0);
  for (let i = 0; i < n; i++) {
    const h = 0.6 + rng() * 0.8, r = 0.18 + rng() * 0.12;
    const c = new THREE.CylinderGeometry(r * 1.1, r * 0.8, h, 12, 4, true); c.translate(0, h / 2, 0);
    const inner = new THREE.CylinderGeometry(r * 0.8, r * 0.6, h * 0.95, 12, 1, true); inner.scale(-1, 1, 1); inner.translate(0, h * 0.5, 0);
    const lip = new THREE.TorusGeometry(r * 0.95, r * 0.18, 5, 12); lip.rotateX(Math.PI / 2); lip.translate(0, h, 0);
    const off = V3(rng.range(-0.3, 0.3), 0, rng.range(-0.3, 0.3));
    for (const gg of [c, inner, lip]) { gg.rotateZ(rng.range(-0.15, 0.15)); gg.translate(off.x, 0, off.z); parts.push(gg); }
  }
  const g = mergeGeometries(parts);
  const hue = rng() < 0.5 ? '#e07a3a' : '#9a5ab8';
  const geo = colorize(g, (x, y, z, c) => c.copy(col(hue)).multiplyScalar(0.8 + 0.25 * Math.sin(y * 9 + x * 4)));
  return { geo, H: 1.3, crown: { top: 1.3, bottom: 0, radius: 0.5, density: 0.2 }, perch: [V3(0, 1.0, 0.4)], sway: 0, glow: null };
}
function seaanemone(rng) {
  const parts = [];
  const base = new THREE.CylinderGeometry(0.38, 0.45, 0.25, 16); base.translate(0, 0.12, 0); parts.push(base);
  const n = 46;
  for (let i = 0; i < n; i++) {
    const a = i * 2.39996, r = 0.08 + 0.32 * Math.sqrt(i / n);
    const p0 = V3(Math.cos(a) * r, 0.24, Math.sin(a) * r), dir = V3(Math.cos(a) * 0.45, 1, Math.sin(a) * 0.45).normalize();
    const L = 0.38 + rng() * 0.18;
    parts.push(tube([p0, p0.clone().addScaledVector(dir, L * 0.5).add(V3(0, 0.02, 0)), p0.clone().addScaledVector(dir, L)], [0.035, 0.03, 0.022], 4));
  }
  const g = mergeGeometries(parts);
  const geo = colorize(g, (x, y, z, c) => c.copy(col('#7ab04a')).lerp(col('#e8f0a0'), smoothstep(0.45, 0.65, y)).lerp(col('#b05a9a'), y < 0.22 ? 0.7 : 0));
  return { geo, H: 0.65, crown: { top: 0.65, bottom: 0.2, radius: 0.6, density: 0.1 }, perch: [V3(0, 0.55, 0), V3(0.2, 0.5, 0.1), V3(-0.15, 0.5, -0.1)], sway: 0.16, soft: true, glow: '#e8ffb0' };
}
function clam(rng) {
  const parts = [];
  function half(side) {
    const g = new THREE.SphereGeometry(0.55, 20, 10, 0, Math.PI, 0, Math.PI); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const wave = 0.06 * Math.sin(Math.atan2(y, x) * 7); p.setXYZ(i, x * (1 + wave), y * 0.55, z * 0.55 * side); }
    g.rotateX(side > 0 ? -0.35 : 0.35); g.translate(0, 0.28, 0); return g;
  }
  parts.push(half(1), half(-1));
  const mantle = new THREE.CylinderGeometry(0.5, 0.5, 0.06, 20, 1); mantle.scale(1, 1, 0.22); mantle.translate(0, 0.42, 0); parts.push(mantle);
  const g = mergeGeometries(parts);
  const geo = colorize(g, (x, y, z, c) => { if (Math.abs(z) < 0.14 && y > 0.35) c.copy(col('#2fa0d6')).lerp(col('#4ad08a'), 0.5 + 0.5 * Math.sin(x * 14)); else c.copy(col('#d8ccb0')).multiplyScalar(0.85 + 0.15 * Math.sin(Math.atan2(y - 0.28, x) * 7)); });
  return { geo, H: 0.6, crown: { top: 0.6, bottom: 0, radius: 0.6, density: 0.1 }, perch: [], sway: 0, glow: null };
}
function seagrass(rng) {
  const pos = [], c = [];
  const n = 70;
  for (let i = 0; i < n; i++) {
    const a = rng() * TAU, r = Math.sqrt(rng()) * 1.2, x = Math.cos(a) * r, z = Math.sin(a) * r, h = 0.35 + rng() * 0.35, yaw = rng() * TAU, w = 0.05;
    const dx = Math.cos(yaw) * w, dz = Math.sin(yaw) * w;
    // a blade of two triangles, leaning a little
    const lx = rng.range(-0.08, 0.08), lz = rng.range(-0.08, 0.08);
    pos.push(x - dx, 0, z - dz, x + dx, 0, z + dz, x + lx, h, z + lz);
    const g0 = col('#3f7a2a'), g1 = col('#8fca5a');
    c.push(g0.r, g0.g, g0.b, g0.r, g0.g, g0.b, g1.r, g1.g, g1.b);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.computeVertexNormals();
  return { geo: g, H: 0.7, crown: { top: 0.7, bottom: 0, radius: 1.2, density: 0.05 }, perch: [], sway: 0.25, soft: true, double: true, glow: null };
}
function algae(rng) {
  const parts = [];
  for (let i = 0; i < 26; i++) { const a = rng() * TAU, r = Math.sqrt(rng()) * 0.9; const b = new THREE.ConeGeometry(0.07 + rng() * 0.05, 0.15 + rng() * 0.25, 4); b.translate(Math.cos(a) * r, 0.08, Math.sin(a) * r); parts.push(b); }
  const mat = new THREE.CircleGeometry(1.0, 14); mat.rotateX(-Math.PI / 2); mat.translate(0, 0.02, 0); parts.push(mat);
  const g = mergeGeometries(parts);
  const geo = colorize(g, (x, y, z, c) => c.copy(col('#6a7a2a')).lerp(col('#a8b44a'), smoothstep(0.05, 0.3, y)));
  return { geo, H: 0.4, crown: { top: 0.4, bottom: 0, radius: 1.0, density: 0.05 }, perch: [], sway: 0.12, soft: true, glow: null };
}
const SHAPES = { branching, brain, table, firecoral, softcoral, seafan, sponge, seaanemone, clam, seagrass, algae };

// ───────────────────────────── Blender models (src/data/reef-flora.js)
function bytes(s) { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
// sway and night glow per species (the shapes come from Blender, the behaviour stays here)
const LOOK = {
  branching: { sway: 0, glow: '#ffd6e0' }, brain: { sway: 0, glow: '#e8f0a0' }, table: { sway: 0, glow: '#d8ffb0' }, firecoral: { sway: 0, glow: '#fff3b0' },
  softcoral: { sway: 0.12, glow: '#e6d0ff' }, seafan: { sway: 0.08, glow: '#ffb090' }, sponge: { sway: 0, glow: null }, seaanemone: { sway: 0.16, glow: '#e8ffb0' },
  clam: { sway: 0, glow: null }, seagrass: { sway: 0.25, glow: null }, algae: { sway: 0.12, glow: null }, reefrock: { sway: 0, glow: null },
};
function blenderShape(id, k) {
  const vs = REEF_FLORA[id]; const e = vs[k % vs.length];
  const q = bytes(e.p), qi = new Int16Array(q.buffer, 0, q.length >> 1), n = qi.length / 3, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) pos[i * 3 + c] = e.o[c] + (qi[i * 3 + c] + 32767) * e.s[c];
  const nb = bytes(e.n), nrm = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) nrm[i] = (nb[i] << 24 >> 24) / 127;
  const cb = bytes(e.c), colA = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) { const v = cb[i] / 255; colA[i] = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  const ib = bytes(e.i), idx = e.w === 4 ? new Uint32Array(ib.buffer, 0, ib.length >> 2) : new Uint16Array(ib.buffer, 0, ib.length >> 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setAttribute('color', new THREE.BufferAttribute(colA, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  const L = LOOK[id] || { sway: 0, glow: null };
  const c = e.crown || { top: e.h, bottom: 0, radius: 1, density: 0.2 };
  return { geo: g, H: e.h, crown: c, perch: (e.perch || []).map((p) => V3(p[0], p[1], p[2])), sway: L.sway, soft: e.soft, double: e.double, glow: L.glow, blender: true };
}
const CACHE = new Map();
function shapeOf(id, seed) {
  const k = id + ':' + (seed % 3);
  if (!CACHE.has(k)) CACHE.set(k, REEF_FLORA[id] ? blenderShape(id, seed % 3) : SHAPES[id](makeRng(1000 + (seed % 3) * 17 + id.length)));
  return CACHE.get(k);
}

// one material per instance: bleaching (health), sway in the current, night glow
function coralMaterial(shape) {
  const u = { uTime: { value: 0 }, uHealth: { value: 1 }, uSway: { value: shape.sway || 0 }, uGlow: { value: 0 }, uGlowCol: { value: col(shape.glow || '#ffffff') }, uH: { value: shape.H } };
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: shape.soft ? 0.7 : 0.85, metalness: 0, side: shape.double ? THREE.DoubleSide : THREE.FrontSide });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'uniform float uTime, uSway, uH; varying float vHy;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vHy = clamp(position.y / max(uH, 0.01), 0.0, 1.0);
      if (uSway > 0.0) { float k = vHy * vHy * uSway; vec4 wp = modelMatrix * vec4(position, 1.0);
        transformed.x += sin(uTime * 1.3 + wp.x * 0.7 + wp.z * 0.4) * k; transformed.z += cos(uTime * 1.1 + wp.z * 0.6) * k * 0.6; }`);
    sh.fragmentShader = 'uniform float uHealth, uGlow; uniform vec3 uGlowCol; varying float vHy;\n' + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        float bl = smoothstep(0.75, 0.15, uHealth);   // bleaching: the algae leave, the white skeleton shows
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.94, 0.93, 0.9), bl * 0.9);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += uGlowCol * uGlow * smoothstep(0.4, 1.0, vHy) * 0.35;`);
  };
  m.customProgramCacheKey = () => 'reef-coral' + (shape.sway ? '-s' : '');
  return { m, u };
}

function makeCoral(id, opts) {
  const rng = opts.rng || makeRng(opts.seed || 1);
  const shape = shapeOf(id, opts.seed || 1);
  const { m, u } = coralMaterial(shape);
  const object = new THREE.Group(); object.name = id;
  const body = new THREE.Group(); object.add(body);
  const mesh = new THREE.Mesh(shape.geo, m); mesh.castShadow = mesh.receiveShadow = true; body.add(mesh);
  const yaw = rng() * TAU, jit = (0.85 + rng() * 0.3) * ((shape.blender ? SIZE_B[id] : SIZE[id]) || 2); body.rotation.y = yaw;
  const st = { g: 1, h: 1, s: 1 };
  const rot = new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), yaw);
  // Blender corals do not grow in size: a young colony is nearly as big as an old one (only a gentle settle-in)
  const g0 = shape.blender ? 0.82 : 0.22;
  function setGrowth(g) { st.g = clamp(g); st.s = lerp(g0, 1, smoothstep(0, 1, st.g)) * jit; body.scale.setScalar(st.s); }
  setGrowth(1);
  return {
    object, trunkRadius: 0.2 * jit,
    setGrowth, setHealth(h) { st.h = clamp(h); u.uHealth.value = st.h; },
    setSeason() { }, setBloom() { }, setFruit() { },
    setNightGlow(n) { u.uGlow.value = clamp(n); },
    update(dt, t) { u.uTime.value = t; },
    crown() { const c = shape.crown; return { top: c.top * st.s, bottom: c.bottom * st.s, radius: c.radius * st.s, density: c.density }; },
    attachPoints() { return []; },
    perchPoints() { return st.g < 0.4 && !shape.blender ? [] : shape.perch.map((p) => p.clone().multiplyScalar(st.s).applyQuaternion(rot)); },
    fall() { }, dispose() { m.dispose(); object.removeFromParent(); },
  };
}

// plankton: a slow cloud of tiny drifting specks above the reef, glowing blue at night
const PLANKTON_GEO = new Map();
function makePlankton(opts) {
  const rng = opts.rng || makeRng(opts.seed || 1);
  const k = (opts.seed || 1) % 3;
  if (!PLANKTON_GEO.has(k)) {
    const r2 = makeRng(500 + k), n = 160, a = new Float32Array(n * 3), b = new Float32Array(n);
    for (let i = 0; i < n; i++) { const q = r2() * TAU, rr = Math.sqrt(r2()) * 2.4; a[i * 3] = Math.cos(q) * rr; a[i * 3 + 1] = 1.2 + r2() * 4.5; a[i * 3 + 2] = Math.sin(q) * rr; b[i] = r2(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); g.setAttribute('aRnd', new THREE.BufferAttribute(b, 1));
    PLANKTON_GEO.set(k, g);
  }
  const u = { uTime: { value: 0 }, uGlow: { value: 0 }, uGrow: { value: 1 } };
  const m = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`attribute float aRnd; uniform float uTime, uGlow, uGrow; varying float vA; varying float vG;
      void main(){ vec3 p = position; p.x += sin(uTime * 0.4 + aRnd * 30.0) * 0.5; p.z += cos(uTime * 0.35 + aRnd * 21.0) * 0.5; p.y += sin(uTime * 0.6 + aRnd * 9.0) * 0.3;
        vG = uGlow * (0.6 + 0.4 * sin(uTime * 4.0 + aRnd * 60.0)); vA = step(aRnd, uGrow) * (0.35 + vG);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = (2.0 + 4.0 * aRnd + vG * 4.0) * 30.0 / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */`varying float vA; varying float vG; void main(){ float r = length(gl_PointCoord - 0.5); if (r > 0.5) discard;
      vec3 c = mix(vec3(0.85, 0.95, 0.85), vec3(0.3, 0.8, 1.0), clamp(vG * 1.5, 0.0, 1.0)); gl_FragColor = vec4(c * smoothstep(0.5, 0.0, r) * vA, 1.0); }`,
  });
  const pts = new THREE.Points(PLANKTON_GEO.get(k), m); pts.frustumCulled = false;
  const object = new THREE.Group(); object.name = 'plankton'; object.add(pts); object.rotation.y = rng() * TAU;
  return {
    object, trunkRadius: 0.1,
    setGrowth(g) { u.uGrow.value = lerp(0.25, 1, clamp(g)); }, setHealth() { }, setSeason() { }, setBloom() { }, setFruit() { },
    setNightGlow(n) { u.uGlow.value = clamp(n); },
    update(dt, t) { u.uTime.value = t; },
    crown() { return { top: 5.5, bottom: 1.2, radius: 2.4, density: 0 }; },
    attachPoints() { return []; }, perchPoints() { return []; }, fall() { },
    dispose() { m.dispose(); object.removeFromParent(); },
  };
}

export const PLANTS = Object.fromEntries([...new Set([...Object.keys(SHAPES), ...Object.keys(REEF_FLORA)])].map((id) => [id, (opts) => makeCoral(id, opts)]).concat([['plankton', makePlankton]]));
export const REEF_ROCKS = () => (REEF_FLORA.reefrock ? [0, 1, 2].map((k) => blenderShape('reefrock', k)) : []);
export function releaseCaches() {
  for (const s of CACHE.values()) s.geo.dispose();
  CACHE.clear();
  for (const g of PLANKTON_GEO.values()) g.dispose();
  PLANKTON_GEO.clear();
}
