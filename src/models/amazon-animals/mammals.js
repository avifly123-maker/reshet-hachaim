// Amazon animals: geometry of the mammals (moved unchanged from amazon-animals.js).
// Exports the spec builders jaguarSpec, tapirSpec, capybaraSpec, agoutiSpec, slothSpec, howlerSpec
// (each spec(v) returns { parts } for variant v = seed % 3); legRings is a local helper. Needs: kit.js.
import * as THREE from 'three';
import { makeRng, clamp, lerp, smoothstep, mergeGeometries } from '../../core/util.js';
import { PI, col, mixc, L, ball, xf, paintFaces, solid, paintVerts, eyes, worley, jl } from './kit.js';

// ═══════════════════════════════════════════════════════════════════════════════════
// Species geometry
// ═══════════════════════════════════════════════════════════════════════════════════
const legRings = (top, pts, radii, opts = {}) => pts.map((p, i) => ({ p: [top[0] + p[0], top[1] + p[1], top[2] + p[2]], rx: radii[i][0], ry: radii[i][1] }));

// ─── JAGUAR ─────────────────────────────────────────────────────────────────────────
export function jaguarSpec(v) {
  const rng = makeRng(101 + v);
  const gold = col(['#d9962e', '#cf8a28', '#dc9f3c'][v]), deep = col('#b8701c'), cream = col('#f3e4c2'), dark = col('#2a1a10'), inner = col('#a8641a');
  const seed = 11 + v * 7;
  // rosettes: soft dark ring (broken into 3–4 blotches) around a slightly darker centre; solid spots on legs/head
  const coat = (i, spot = 0.17, belly = 0.45, ringOnly = true) => {
    let c = gold.clone();
    c.lerp(deep, clamp((i.ny - 0.1) * 0.9) * 0.45);
    const bk = smoothstep(-belly + 0.05, -belly - 0.2, i.ny);
    c.lerp(cream, bk);
    const w = worley(i.x, i.y, i.z * 0.85, spot, seed);
    let ink = 0;
    if (ringOnly) {
      const ang = Math.atan2(w.cy, w.cx) + w.id * 6;
      const gap = smoothstep(0.35, 0.75, Math.sin(ang * 3 + w.id * 3));
      ink = smoothstep(0.1, 0.22, w.f1) * (1 - smoothstep(0.42, 0.52, w.f1)) * (1 - gap * 0.6);
      c.lerp(inner, smoothstep(0.22, 0.08, w.f1) * 0.7);
    } else ink = smoothstep(0.42, 0.28, w.f1);
    c.lerp(dark, ink * (1 - bk * 0.5));
    return c;
  };
  const bodyR = [
    { p: [0, 0.62, -0.8], rx: 0.07, ry: 0.08 },
    { p: [0, 0.62, -0.72], rx: 0.16, ry: 0.18 },
    { p: [0, 0.61, -0.55], rx: 0.2, ry: 0.22, fb: 0.9 },
    { p: [0, 0.59, -0.3], rx: 0.18, ry: 0.19, fb: 0.8 },
    { p: [0, 0.6, -0.05], rx: 0.19, ry: 0.21, fb: 0.9 },
    { p: [0, 0.62, 0.2], rx: 0.2, ry: 0.25 },
    { p: [0, 0.66, 0.42], rx: 0.18, ry: 0.23 },
    { p: [0, 0.73, 0.56], rx: 0.13, ry: 0.15 },
    { p: [0, 0.79, 0.64], rx: 0.1, ry: 0.11 },
  ];
  const body = paintVerts(L(bodyR, { seg: 13, sub: 3 }), (i) => coat(i, 0.21));
  // head
  const hp = [0, 0.82, 0.62];
  const headR = [
    { p: [0, 0.83, 0.6], rx: 0.1, ry: 0.11 },
    { p: [0, 0.85, 0.68], rx: 0.15, ry: 0.14 },
    { p: [0, 0.85, 0.78], rx: 0.14, ry: 0.13 },
    { p: [0, 0.82, 0.86], rx: 0.1, ry: 0.1, fb: 0.9 },
    { p: [0, 0.8, 0.92], rx: 0.075, ry: 0.075 },
    { p: [0, 0.79, 0.95], rx: 0.05, ry: 0.05 },
  ];
  const headG = paintVerts(L(headR, { seg: 11, sub: 2, cap1: 0.7 }), (i) => {
    if (i.ny < -0.45 || (i.z > 0.87 && i.ny < 0.05)) return cream;
    const w = worley(i.x, i.y, i.z, 0.06, seed + 3);
    return mixc(gold, dark, smoothstep(0.4, 0.26, w.f1) * smoothstep(0.92, 0.84, i.z));
  });
  const ear = (s) => paintFaces(xf(ball(0.055, 0.05, 0.025, 6, 4), [s * 0.1, 0.96, 0.66], [0.2, 0, s * -0.4]), (i) => (i.nz > 0.3 ? cream : dark));
  const nose = solid(ball(0.03, 0.022, 0.02, 6, 4, [0, 0.83, 0.96]), '#5a3530');
  const head = mergeGeometries([headG, ear(1), ear(-1), nose, ...eyes(0.022, [0.075, 0.875, 0.85], '#d9a520', '#0c0c0c', 0.9)]);
  head.translate(-hp[0], -hp[1], -hp[2]); head.scale(1.15, 1.15, 1.15); head.translate(hp[0], hp[1] + 0.02, hp[2]);
  // legs
  const legF = (s) => paintVerts(L(legRings([s * 0.13, 0.66, 0.4], [[0, 0, 0], [0, -0.18, 0.01], [0, -0.38, 0.02], [0, -0.56, 0.03], [0, -0.63, 0.07]],
    [[0.1, 0.12], [0.085, 0.09], [0.06, 0.062], [0.052, 0.055], [0.064, 0.04]]), { seg: 7, up: [0, 0, 1], sub: 2, cap1: 0.9 }), (i) => coat(i, 0.075, 0.9, false));
  const legH = (s) => paintVerts(L(legRings([s * 0.13, 0.64, -0.55], [[0, 0, 0], [0, -0.18, -0.05], [0, -0.38, -0.1], [0, -0.5, -0.03], [0, -0.6, 0.0], [0, -0.62, 0.05]],
    [[0.115, 0.15], [0.095, 0.11], [0.052, 0.065], [0.046, 0.05], [0.05, 0.05], [0.062, 0.04]]), { seg: 7, up: [0, 0, 1], sub: 2, cap1: 0.9 }), (i) => coat(i, 0.075, 0.9, false));
  // tail
  const tailR = [[0, 0.66, -0.72], [0, 0.6, -0.85], [0, 0.46, -1.0], [0, 0.34, -1.16], [0, 0.31, -1.32], [0, 0.36, -1.45], [0, 0.42, -1.5]]
    .map((p, i, a) => ({ p, rx: lerp(0.06, 0.035, i / (a.length - 1)), ry: lerp(0.06, 0.035, i / (a.length - 1)) }));
  const tail = paintFaces(L(tailR, { seg: 6, sub: 2, cap1: 0.8 }), (i) => {
    const k = (-i.z - 0.72) / 0.78;
    if (k > 0.9) return dark;
    if (k > 0.5) return Math.sin(k * 34) > 0.3 ? dark : (i.ny < -0.4 ? cream : gold);
    return coat(i, 0.08, 0.6, false);
  });
  return {
    parts: [
      { name: 'body', geo: body, pivot: [0, 0.62, -0.5] },
      { name: 'head', geo: head, pivot: hp, parent: 'body' },
      { name: 'fl', geo: legF(1), pivot: [0.13, 0.66, 0.4], parent: 'body' },
      { name: 'fr', geo: legF(-1), pivot: [-0.13, 0.66, 0.4], parent: 'body' },
      { name: 'hl', geo: legH(1), pivot: [0.13, 0.64, -0.55], parent: 'body' },
      { name: 'hr', geo: legH(-1), pivot: [-0.13, 0.64, -0.55], parent: 'body' },
      { name: 'tail', geo: tail, pivot: [0, 0.66, -0.74], parent: 'body' },
    ],
  };
}

// ─── TAPIR ──────────────────────────────────────────────────────────────────────────
export function tapirSpec(v) {
  const rng = makeRng(201 + v);
  const fur = col(['#3a302c', '#33292a', '#41352f'][v]), belly = col('#4a3e38'), dark = col('#1e1a1a'), white = col('#e8e2d8');
  const furF = (i) => jl(i.ny < -0.55 ? belly : mixc(fur, dark, clamp(i.ny * 0.6)), rng, 0.05);
  const bodyR = [
    { p: [0, 0.84, -0.92], rx: 0.1, ry: 0.1 },
    { p: [0, 0.86, -0.85], rx: 0.27, ry: 0.3 },
    { p: [0, 0.85, -0.6], rx: 0.36, ry: 0.4, fb: 0.95 },
    { p: [0, 0.8, -0.25], rx: 0.37, ry: 0.39 },
    { p: [0, 0.76, 0.1], rx: 0.34, ry: 0.36 },
    { p: [0, 0.76, 0.38], rx: 0.27, ry: 0.32 },
    { p: [0, 0.82, 0.55], rx: 0.18, ry: 0.23 },
    { p: [0, 0.88, 0.62], rx: 0.15, ry: 0.18 },
  ];
  const tailStub = solid(xf(ball(0.05, 0.08, 0.04, 5, 4), [0, 0.86, -0.95], [0.4, 0, 0]), dark);
  const body = mergeGeometries([paintFaces(L(bodyR, { seg: 14, sub: 2 }), furF), tailStub]);
  const hp = [0, 0.9, 0.6];
  const headR = [
    { p: [0, 0.93, 0.56], rx: 0.15, ry: 0.19 },
    { p: [0, 0.94, 0.68], rx: 0.15, ry: 0.18 },
    { p: [0, 0.9, 0.82], rx: 0.12, ry: 0.15 },
    { p: [0, 0.84, 0.96], rx: 0.085, ry: 0.11 },
    { p: [0, 0.79, 1.06], rx: 0.06, ry: 0.07 },
    { p: [0, 0.74, 1.13], rx: 0.045, ry: 0.048 },
    { p: [0, 0.67, 1.17], rx: 0.04, ry: 0.04 },
  ];
  const headG = paintFaces(L(headR, { seg: 10, sub: 2, cap1: 0.6 }), (i) => (i.z > 1.12 ? col('#141010') : furF(i)));
  // mane ridge along the nape
  const mane = paintFaces(L([[0, 1.1, 0.55], [0, 1.12, 0.62], [0, 1.07, 0.72]].map((p, i) => ({ p, rx: 0.025, ry: [0.03, 0.05, 0.02][i] })), { seg: 5, sub: 2 }), () => dark);
  const ear = (s) => paintFaces(xf(ball(0.06, 0.075, 0.025, 7, 4), [s * 0.12, 1.1, 0.62], [0.3, s * 0.4, s * -0.5]), (i) => {
    const d = Math.hypot(i.x - s * 0.12, i.y - 1.1); return d > 0.055 ? white : (i.nz > 0.2 ? col('#5a4a44') : fur);
  });
  const lip = solid(ball(0.06, 0.035, 0.05, 6, 4, [0, 0.72, 1.06]), '#2a2222');
  const head = mergeGeometries([headG, mane, ear(1), ear(-1), lip, ...eyes(0.02, [0.11, 0.98, 0.78], '#1a1210', null, 0.5)]);
  const hoof = col('#5c524a');
  const leg = (x, y, z, back) => paintFaces(L(legRings([x, y, z], [[0, 0, 0], [0, -0.2, back ? -0.04 : 0.02], [0, -0.42, back ? -0.02 : 0.03], [0, -0.58, 0.02], [0, -0.66, 0.04]],
    [[0.13, 0.15], [0.1, 0.11], [0.075, 0.08], [0.07, 0.07], [0.075, 0.06]]), { seg: 8, up: [0, 0, 1], sub: 2, cap1: 0.6 }), (i) => (i.y < 0.06 ? hoof : jl(dark, rng, 0.05)));
  return {
    parts: [
      { name: 'body', geo: body, pivot: [0, 0.82, -0.55] },
      { name: 'head', geo: head, pivot: hp, parent: 'body' },
      { name: 'fl', geo: leg(0.2, 0.66, 0.35), pivot: [0.2, 0.66, 0.35], parent: 'body' },
      { name: 'fr', geo: leg(-0.2, 0.66, 0.35), pivot: [-0.2, 0.66, 0.35], parent: 'body' },
      { name: 'hl', geo: leg(0.21, 0.66, -0.6, true), pivot: [0.21, 0.66, -0.6], parent: 'body' },
      { name: 'hr', geo: leg(-0.21, 0.66, -0.6, true), pivot: [-0.21, 0.66, -0.6], parent: 'body' },
    ],
  };
}

// ─── CAPYBARA ───────────────────────────────────────────────────────────────────────
export function capybaraSpec(v) {
  const rng = makeRng(301 + v);
  const fur = col(['#8a5c38', '#946540', '#7d5232'][v]), back = col('#6e4628'), belly = col('#b08458'), face = col('#5a3a24');
  const furF = (i) => jl(i.ny < -0.5 ? belly : mixc(fur, back, clamp(i.ny)), rng, 0.08);
  const bodyR = [
    { p: [0, 0.48, -0.6], rx: 0.08, ry: 0.08 },
    { p: [0, 0.5, -0.55], rx: 0.22, ry: 0.25 },
    { p: [0, 0.5, -0.38], rx: 0.3, ry: 0.32, fb: 0.85 },
    { p: [0, 0.47, -0.1], rx: 0.31, ry: 0.31, fb: 0.85 },
    { p: [0, 0.46, 0.16], rx: 0.27, ry: 0.28 },
    { p: [0, 0.5, 0.33], rx: 0.19, ry: 0.22 },
    { p: [0, 0.55, 0.42], rx: 0.15, ry: 0.17 },
  ];
  const body = paintFaces(L(bodyR, { seg: 12, sub: 2, flat: true, jit: 0.06, rng }), furF);
  const hp = [0, 0.58, 0.4];
  const headR = [
    { p: [0, 0.6, 0.36], rx: 0.13, ry: 0.15, sq: 2.6 },
    { p: [0, 0.64, 0.46], rx: 0.14, ry: 0.16, sq: 3 },
    { p: [0, 0.62, 0.6], rx: 0.13, ry: 0.15, sq: 3.2 },
    { p: [0, 0.58, 0.72], rx: 0.115, ry: 0.13, sq: 3.2, fb: 0.9 },
    { p: [0, 0.56, 0.79], rx: 0.1, ry: 0.11, sq: 3 },
  ];
  const headG = paintFaces(L(headR, { seg: 10, sub: 2, cap1: 0.35, flat: true }), (i) => (i.z > 0.78 && i.nz > 0.6 ? col('#2b1c12') : jl(i.z > 0.6 ? face : fur, rng, 0.06)));
  const ear = (s) => solid(xf(ball(0.035, 0.04, 0.02, 6, 4), [s * 0.09, 0.79, 0.44], [0, 0, s * -0.3]), '#4a2e1c');
  const head = mergeGeometries([headG, ear(1), ear(-1), ...eyes(0.022, [0.105, 0.72, 0.55], '#100a06', null, 0.4)]);
  const leg = (x, y, z, rad) => paintFaces(L(legRings([x, y, z], [[0, 0, 0], [0, -0.16, 0.0], [0, -0.32, 0.02], [0, -0.38, 0.06]],
    [[rad, rad * 1.2], [rad * 0.7, rad * 0.75], [rad * 0.5, rad * 0.5], [rad * 0.55, rad * 0.35]]), { seg: 7, up: [0, 0, 1], sub: 2, cap1: 0.6 }), (i) => jl(i.y < 0.05 ? col('#3b2a1e') : back, rng, 0.06));
  return {
    parts: [
      { name: 'body', geo: body, pivot: [0, 0.48, -0.35], mat: 'fur' },
      { name: 'head', geo: head, pivot: hp, parent: 'body', mat: 'fur' },
      { name: 'fl', geo: leg(0.15, 0.36, 0.26, 0.08), pivot: [0.15, 0.36, 0.26], parent: 'body', mat: 'fur' },
      { name: 'fr', geo: leg(-0.15, 0.36, 0.26, 0.08), pivot: [-0.15, 0.36, 0.26], parent: 'body', mat: 'fur' },
      { name: 'hl', geo: leg(0.19, 0.36, -0.38, 0.1), pivot: [0.19, 0.36, -0.38], parent: 'body', mat: 'fur' },
      { name: 'hr', geo: leg(-0.19, 0.36, -0.38, 0.1), pivot: [-0.19, 0.36, -0.38], parent: 'body', mat: 'fur' },
    ],
  };
}

// ─── AGOUTI ─────────────────────────────────────────────────────────────────────────
export function agoutiSpec(v) {
  const rng = makeRng(401 + v);
  const fur = col(['#c0702a', '#c97a30', '#b46628'][v]), rump = col('#e09a40'), back = col('#6e3c1a'), belly = col('#e0bc88');
  const furF = (i) => {
    let c = mixc(fur, back, clamp(i.ny * 0.8));
    if (i.z < -0.1 && i.ny > -0.3) c.lerp(rump, 0.55);
    if (i.ny < -0.55) c = belly.clone();
    return jl(c, rng, 0.1);
  };
  const bodyR = [
    { p: [0, 0.34, -0.31], rx: 0.05, ry: 0.05 },
    { p: [0, 0.36, -0.27], rx: 0.11, ry: 0.12 },
    { p: [0, 0.37, -0.16], rx: 0.125, ry: 0.135, fb: 0.9 },
    { p: [0, 0.34, -0.03], rx: 0.095, ry: 0.105, fb: 0.85 },
    { p: [0, 0.31, 0.07], rx: 0.07, ry: 0.08 },
    { p: [0, 0.31, 0.13], rx: 0.05, ry: 0.058 },
  ];
  const body = paintFaces(L(bodyR, { seg: 10, sub: 2, flat: true, jit: 0.06, rng }), furF);
  const hp = [0, 0.32, 0.13];
  const headR = [
    { p: [0, 0.33, 0.11], rx: 0.048, ry: 0.052 },
    { p: [0, 0.345, 0.17], rx: 0.056, ry: 0.058 },
    { p: [0, 0.33, 0.235], rx: 0.04, ry: 0.042 },
    { p: [0, 0.31, 0.285], rx: 0.022, ry: 0.025 },
  ];
  const headG = paintFaces(L(headR, { seg: 9, sub: 2, cap1: 0.8, flat: true }), (i) => (i.z > 0.285 ? col('#2a1a12') : jl(mixc(fur, back, 0.35), rng, 0.06)));
  const ear = (s) => solid(xf(ball(0.022, 0.03, 0.009, 6, 4), [s * 0.035, 0.395, 0.15], [-0.2, s * 0.3, s * -0.3]), '#4a2a14');
  const head = mergeGeometries([headG, ear(1), ear(-1), ...eyes(0.013, [0.043, 0.355, 0.2], '#0a0606', null, 0.6)]);
  const leg = (x, y, z, hind) => paintFaces(L(legRings([x, y, z], hind
    ? [[0, 0, 0], [0, -0.12, -0.05], [0, -0.24, -0.06], [0, -0.33, -0.01], [0, -0.35, 0.04]]
    : [[0, 0, 0], [0, -0.1, 0.0], [0, -0.2, 0.0], [0, -0.28, 0.01], [0, -0.29, 0.035]],
  hind ? [[0.055, 0.075], [0.04, 0.045], [0.016, 0.018], [0.013, 0.013], [0.016, 0.01]] : [[0.03, 0.035], [0.02, 0.02], [0.013, 0.013], [0.012, 0.012], [0.014, 0.009]]),
  { seg: 6, up: [0, 0, 1], sub: 2, cap1: 0.6 }), (i) => jl(i.y < 0.2 ? col('#3a2212') : fur, rng, 0.08));
  return {
    parts: [
      { name: 'body', geo: body, pivot: [0, 0.34, -0.17], mat: 'fur' },
      { name: 'head', geo: head, pivot: hp, parent: 'body', mat: 'fur' },
      { name: 'fl', geo: leg(0.045, 0.29, 0.06), pivot: [0.045, 0.29, 0.06], parent: 'body', mat: 'fur' },
      { name: 'fr', geo: leg(-0.045, 0.29, 0.06), pivot: [-0.045, 0.29, 0.06], parent: 'body', mat: 'fur' },
      { name: 'hl', geo: leg(0.08, 0.35, -0.18, true), pivot: [0.08, 0.35, -0.18], parent: 'body', mat: 'fur' },
      { name: 'hr', geo: leg(-0.08, 0.35, -0.18, true), pivot: [-0.08, 0.35, -0.18], parent: 'body', mat: 'fur' },
    ],
  };
}

// ─── SLOTH (brown-throated three-toed) ──────────────────────────────────────────────
export function slothSpec(v) {
  const rng = makeRng(501 + v);
  const fur = col(['#8a7a62', '#7d6f5a', '#8f8068'][v]), dark = col('#5a4c3c'), algae = col('#7d8a5e'), face = col('#e2d6bc'), mask = col('#2a1d14'), claw = col('#d8c8a2');
  const furF = (i) => { let c = mixc(fur, dark, clamp(-i.ny * 0.5)); if (i.ny > 0.5 && worley(i.x, i.y, i.z, 0.08, 7).f1 < 0.4) c.lerp(algae, 0.45); return jl(c, rng, 0.14); };
  const bodyR = [
    { p: [0, 0.42, -0.32], rx: 0.07, ry: 0.07 },
    { p: [0, 0.43, -0.27], rx: 0.15, ry: 0.15 },
    { p: [0, 0.44, -0.12], rx: 0.18, ry: 0.18 },
    { p: [0, 0.45, 0.05], rx: 0.17, ry: 0.17 },
    { p: [0, 0.46, 0.17], rx: 0.13, ry: 0.13 },
    { p: [0, 0.47, 0.24], rx: 0.09, ry: 0.09 },
  ];
  const body = paintFaces(L(bodyR, { seg: 11, sub: 2, flat: true, jit: 0.3, rng }), furF);
  const hp = [0, 0.48, 0.24];
  const skull = paintFaces(L([
    { p: [0, 0.49, 0.2], rx: 0.08, ry: 0.08 },
    { p: [0, 0.5, 0.26], rx: 0.105, ry: 0.1 },
    { p: [0, 0.49, 0.33], rx: 0.095, ry: 0.09 },
    { p: [0, 0.48, 0.37], rx: 0.07, ry: 0.065 },
  ], { seg: 11, sub: 2, cap1: 0.5, flat: true, jit: 0.12, rng }), (i) => {
    if (i.nz > 0.35) {
      const dx = Math.abs(i.x), stripe = Math.abs((i.y - 0.495) + (dx - 0.04) * 0.25) < 0.017 && dx > 0.02;
      return stripe ? mask : jl(face, rng, 0.04);
    }
    return furF(i);
  });
  const nose = solid(ball(0.022, 0.016, 0.014, 6, 4, [0, 0.475, 0.385]), '#1e1510');
  const smile = solid(xf(new THREE.TorusGeometry(0.022, 0.004, 3, 8, PI).toNonIndexed(), [0, 0.462, 0.378], [0, 0, PI]), '#3a2a20');
  smile.deleteAttribute('uv');
  const head = mergeGeometries([skull, nose, smile, ...eyes(0.013, [0.042, 0.5, 0.36], '#0a0604', null, 1.2)]);
  const limb = (x, y, z, len, r) => {
    const arm = paintFaces(L(legRings([x, y, z], [[0, 0, 0], [0, -len * 0.45, 0.01], [0, -len * 0.85, 0.0], [0, -len, 0.0]],
      [[r, r], [r * 0.85, r * 0.8], [r * 0.7, r * 0.65], [r * 0.6, r * 0.55]]), { seg: 7, up: [0, 0, 1], sub: 2, flat: true, jit: 0.3, rng }), furF);
    const claws = [];
    for (let k = -1; k <= 1; k++) {
      const cx = x + k * r * 0.45;
      claws.push(solid(L([[0, 0, 0], [0, -0.05, 0.015], [0, -0.085, 0.045], [0, -0.095, 0.08]].map((p, i) => ({ p: [cx + p[0], y - len + p[1] + 0.02, z + p[2]], rx: [0.012, 0.01, 0.007, 0.002][i], ry: [0.012, 0.01, 0.007, 0.002][i] })), { seg: 4, up: [0, 0, 1], sub: 1 }), claw));
    }
    return mergeGeometries([arm, ...claws]);
  };
  return {
    parts: [
      { name: 'body', geo: body, pivot: [0, 0.44, -0.05], mat: 'fur' },
      { name: 'head', geo: head, pivot: hp, parent: 'body', mat: 'fur' },
      { name: 'fl', geo: limb(0.14, 0.49, 0.14, 0.44, 0.055), pivot: [0.14, 0.49, 0.14], parent: 'body', mat: 'fur' },
      { name: 'fr', geo: limb(-0.14, 0.49, 0.14, 0.44, 0.055), pivot: [-0.14, 0.49, 0.14], parent: 'body', mat: 'fur' },
      { name: 'hl', geo: limb(0.13, 0.45, -0.22, 0.36, 0.06), pivot: [0.13, 0.45, -0.22], parent: 'body', mat: 'fur' },
      { name: 'hr', geo: limb(-0.13, 0.45, -0.22, 0.36, 0.06), pivot: [-0.13, 0.45, -0.22], parent: 'body', mat: 'fur' },
    ],
  };
}

// ─── HOWLER MONKEY (red howler; black variant) ──────────────────────────────────────
export function howlerSpec(v) {
  const rng = makeRng(601 + v);
  const black = v === 2;
  const fur = col(black ? '#1d1714' : '#9a3e1a'), back = col(black ? '#2a1e18' : '#c06024'), limbC = col(black ? '#16110e' : '#6a2812'),
    face = col('#1a1210'), beard = col(black ? '#120d0b' : '#5a2210'), hand = col(black ? '#8a3a18' : '#3a1a10');
  const furF = (i) => jl(mixc(fur, back, clamp(i.ny * 1.2)), rng, 0.1);
  const bodyR = [
    { p: [0, 0.42, -0.24], rx: 0.07, ry: 0.07 },
    { p: [0, 0.43, -0.2], rx: 0.12, ry: 0.12 },
    { p: [0, 0.44, -0.06], rx: 0.13, ry: 0.13 },
    { p: [0, 0.46, 0.08], rx: 0.14, ry: 0.15 },
    { p: [0, 0.49, 0.18], rx: 0.12, ry: 0.12 },
    { p: [0, 0.52, 0.23], rx: 0.07, ry: 0.08 },
  ];
  const body = paintFaces(L(bodyR, { seg: 10, sub: 2, flat: true, jit: 0.15, rng }), furF);
  const hp = [0, 0.54, 0.23];
  const skull = paintFaces(L([
    { p: [0, 0.56, 0.2], rx: 0.07, ry: 0.07 },
    { p: [0, 0.58, 0.26], rx: 0.085, ry: 0.085 },
    { p: [0, 0.56, 0.31], rx: 0.075, ry: 0.08 },
    { p: [0, 0.53, 0.35], rx: 0.05, ry: 0.06 },
  ], { seg: 10, sub: 2, cap1: 0.6, flat: true, jit: 0.1, rng }), (i) => (i.nz > 0.45 && i.y < 0.6 ? jl(face, rng, 0.04) : furF(i)));
  const jaw = paintFaces(L([{ p: [0, 0.5, 0.24], rx: 0.06, ry: 0.05 }, { p: [0, 0.47, 0.29], rx: 0.065, ry: 0.065 }, { p: [0, 0.48, 0.33], rx: 0.045, ry: 0.04 }], { seg: 8, sub: 2, flat: true, jit: 0.2, rng }), () => jl(beard, rng, 0.08));
  const head = mergeGeometries([skull, jaw, ...eyes(0.014, [0.032, 0.575, 0.335], '#3a1a08', '#050302', 1.4)]);
  const limb = (x, y, z, len, r) => paintFaces(L(legRings([x, y, z], [[0, 0, 0], [0, -len * 0.5, 0.02], [0, -len * 0.92, 0.0], [0, -len, 0.025]],
    [[r, r], [r * 0.75, r * 0.75], [r * 0.6, r * 0.6], [r * 0.65, r * 0.4]]), { seg: 6, up: [0, 0, 1], sub: 2, flat: true, jit: 0.15, rng, cap1: 0.8 }), (i) => (i.y < y - len * 0.85 ? hand : jl(limbC, rng, 0.08)));
  const tailR = [[0, 0.44, -0.22], [0, 0.4, -0.36], [0, 0.32, -0.5], [0, 0.22, -0.6], [0, 0.12, -0.62], [0, 0.07, -0.56], [0, 0.1, -0.5]]
    .map((p, i, a) => ({ p, rx: lerp(0.04, 0.018, i / (a.length - 1)), ry: lerp(0.04, 0.018, i / (a.length - 1)) }));
  const tail = paintFaces(L(tailR, { seg: 6, sub: 2, flat: true }), (i) => jl(limbC, rng, 0.08));
  return {
    parts: [
      { name: 'body', geo: body, pivot: [0, 0.43, -0.16], mat: 'fur' },
      { name: 'head', geo: head, pivot: hp, parent: 'body', mat: 'fur' },
      { name: 'fl', geo: limb(0.11, 0.5, 0.15, 0.48, 0.04), pivot: [0.11, 0.5, 0.15], parent: 'body', mat: 'fur' },
      { name: 'fr', geo: limb(-0.11, 0.5, 0.15, 0.48, 0.04), pivot: [-0.11, 0.5, 0.15], parent: 'body', mat: 'fur' },
      { name: 'hl', geo: limb(0.1, 0.45, -0.17, 0.44, 0.05), pivot: [0.1, 0.45, -0.17], parent: 'body', mat: 'fur' },
      { name: 'hr', geo: limb(-0.1, 0.45, -0.17, 0.44, 0.05), pivot: [-0.1, 0.45, -0.17], parent: 'body', mat: 'fur' },
      { name: 'tail', geo: tail, pivot: [0, 0.44, -0.22], parent: 'body', mat: 'fur' },
    ],
  };
}
