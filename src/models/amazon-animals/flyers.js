// Amazon animals: geometry of the birds and the small animals (moved unchanged from amazon-animals.js).
// Exports toucanSpec, macawSpec, harpySpec, hummingbirdSpec, morphoSpec, orchidbeeSpec, dartfrogSpec,
// fruitbatSpec (birdLegs is a local helper). Needs: kit.js.
import { makeRng, clamp, smoothstep, mergeGeometries } from '../../core/util.js';
import { col, mixc, L, ball, xf, paintFaces, solid, plate, mapWingR, mapTail, mirrorX, eyes, worley, jl } from './kit.js';

// ─── Bird helpers ───────────────────────────────────────────────────────────────────
function birdLegs(x, top, len, zf, colr, toe = 0.04, r = 0.012, talon = null) {
  const parts = [];
  for (const s of [1, -1]) {
    parts.push(solid(L([{ p: [s * x, top, zf], rx: r, ry: r }, { p: [s * x, top - len, zf + 0.005], rx: r * 0.8, ry: r * 0.8 }], { seg: 5, up: [0, 0, 1], sub: 1 }), colr));
    for (const [dx, dz] of [[0.3, 1], [-0.3, 1], [0.15, -1], [-0.15, -1]]) {
      const ex = s * x + dx * toe, ez = zf + dz * toe;
      parts.push(solid(L([{ p: [s * x, top - len, zf], rx: r * 0.6, ry: r * 0.6 }, { p: [ex, top - len - r * 0.3, ez], rx: r * 0.45, ry: r * 0.45 }], { seg: 4, sub: 1, cap0: false }), colr));
      if (talon) parts.push(solid(L([{ p: [ex, top - len - r * 0.3, ez], rx: r * 0.4, ry: r * 0.4 }, { p: [ex + dx * toe * 0.2, top - len - r * 1.6, ez + dz * toe * 0.3], rx: r * 0.05, ry: r * 0.05 }], { seg: 4, sub: 1, cap0: false, cap1: false }), talon));
    }
  }
  return mergeGeometries(parts);
}

// ─── TOUCAN (toco-style) ────────────────────────────────────────────────────────────
export function toucanSpec(v) {
  const rng = makeRng(701 + v);
  const black = col('#121214'), throat = col(['#fff4c8', '#fff0b0', '#ffffff'][v]), red = col('#e0242a'), blue = col('#2f9ee8');
  const bodyR = [
    { p: [0, -0.02, -0.17], rx: 0.04, ry: 0.04 },
    { p: [0, -0.01, -0.13], rx: 0.085, ry: 0.09 },
    { p: [0, 0.0, -0.03], rx: 0.1, ry: 0.115 },
    { p: [0, 0.02, 0.06], rx: 0.095, ry: 0.11 },
    { p: [0, 0.06, 0.12], rx: 0.07, ry: 0.08 },
    { p: [0, 0.09, 0.15], rx: 0.055, ry: 0.06 },
  ];
  const bodyG = paintFaces(L(bodyR, { seg: 10, sub: 2 }), (i) => {
    if (i.z > 0.03 && i.ny < 0.35 && i.nz > 0.1) return i.y < -0.02 && i.z < 0.08 ? red : jl(throat, rng, 0.02);
    if (i.z < -0.1 && i.ny < -0.3) return red;
    return jl(black, rng, 0.03);
  });
  const legs = birdLegs(0.04, -0.09, 0.05, 0.0, '#5a78a8', 0.025, 0.009);
  const body = mergeGeometries([bodyG, legs]);
  const hp = [0, 0.1, 0.14];
  const skull = paintFaces(ball(0.065, 0.07, 0.072, 9, 7, [0, 0.12, 0.17]), (i) => (i.z > 0.17 && i.ny < -0.1 ? throat : black));
  const beakR = [
    { p: [0, 0.12, 0.21], rx: 0.04, ry: 0.065 },
    { p: [0, 0.115, 0.28], rx: 0.036, ry: 0.06 },
    { p: [0, 0.105, 0.36], rx: 0.028, ry: 0.047 },
    { p: [0, 0.085, 0.43], rx: 0.018, ry: 0.03 },
    { p: [0, 0.06, 0.475], rx: 0.006, ry: 0.012 },
  ];
  const beak = paintFaces(L(beakR, { seg: 10, sub: 3, cap1: 0.4 }), (i) => {
    const k = (i.z - 0.21) / 0.27;
    if (k > 0.82) return col('#141414');
    let c = mixc('#ffcf2a', '#ff7a14', smoothstep(0.1, 0.7, k));
    if (i.ny > 0.75 && k < 0.8) c = mixc(c, '#ffe066', 0.4);
    if (Math.abs(i.y - (0.115 - k * 0.03)) < 0.006 && Math.abs(i.nx) > 0.6) c = col('#b03010');
    return c;
  });
  const eyeRing = paintFaces(ball(0.022, 0.022, 0.012, 8, 5), () => blue);
  const ringL = xf(eyeRing.clone(), [0.06, 0.135, 0.19], [0, 0.5, 0]), ringR = xf(eyeRing.clone(), [-0.06, 0.135, 0.19], [0, -0.5, 0]);
  const head = mergeGeometries([skull, beak, ringL, ringR, ...eyes(0.012, [0.066, 0.137, 0.195], '#0a0a0a', null, 0.3)]);
  const wingR = plate([
    { s: 0, l: 0.07, t: -0.08 }, { s: 0.08, l: 0.08, t: -0.12 }, { s: 0.16, l: 0.07, t: -0.13 }, { s: 0.23, l: 0.04, t: -0.1 }, { s: 0.27, l: 0.0, t: -0.05 },
  ], { map: mapWingR, cs: 2, thick: 0.012, camber: 0.012, top: (u, v) => jl(mixc('#16161a', '#24201c', v), rng, 0.04), bot: () => col('#1a1a1a') });
  const tail = plate([{ s: 0, l: 0.035, t: -0.035 }, { s: 0.15, l: 0.05, t: -0.05 }, { s: 0.26, l: 0.045, t: -0.045, h: -0.01 }],
    { map: mapTail, cs: 2, thick: 0.012, top: () => jl(black, rng, 0.03), bot: () => black });
  return {
    parts: [
      { name: 'body', geo: body, pivot: [0, 0, 0] },
      { name: 'head', geo: head, pivot: hp, parent: 'body', mat: 'satin' },
      { name: 'wr', geo: xf(wingR, [0.07, 0.04, 0.04]), pivot: [0.07, 0.04, 0.04], parent: 'body' },
      { name: 'wl', geo: xf(mirrorX(wingR), [-0.07, 0.04, 0.04]), pivot: [-0.07, 0.04, 0.04], parent: 'body' },
      { name: 'tail', geo: xf(tail, [0, 0.0, -0.14]), pivot: [0, 0.0, -0.14], parent: 'body' },
    ],
    foot: [0, -0.143, 0],
  };
}

// ─── SCARLET MACAW ──────────────────────────────────────────────────────────────────
export function macawSpec(v) {
  const rng = makeRng(801 + v);
  const red = col(['#d81e1e', '#e0261c', '#cf1a22'][v]), yellow = col('#ffcc1a'), green = col('#3aa040'), blue = col('#1f5fd0'), dblue = col('#183f9a'), face = col('#f6f1ea');
  const bodyR = [
    { p: [0, -0.04, -0.17], rx: 0.04, ry: 0.04 },
    { p: [0, -0.03, -0.13], rx: 0.08, ry: 0.085 },
    { p: [0, 0.0, -0.03], rx: 0.095, ry: 0.11 },
    { p: [0, 0.03, 0.06], rx: 0.09, ry: 0.105 },
    { p: [0, 0.07, 0.12], rx: 0.07, ry: 0.075 },
    { p: [0, 0.1, 0.15], rx: 0.06, ry: 0.06 },
  ];
  const bodyG = paintFaces(L(bodyR, { seg: 10, sub: 2 }), (i) => (i.z < -0.08 && i.ny > 0.3 ? mixc(red, blue, 0.6) : jl(red, rng, 0.05)));
  const body = mergeGeometries([bodyG, birdLegs(0.035, -0.09, 0.04, 0.0, '#4a4a50', 0.025, 0.009)]);
  const hp = [0, 0.11, 0.14];
  const skull = paintFaces(ball(0.075, 0.075, 0.08, 9, 7, [0, 0.14, 0.18]), (i) => (i.z > 0.19 && Math.abs(i.nx) > 0.35 && i.y < 0.165 && i.y > 0.09 ? face : jl(red, rng, 0.04)));
  const upper = solid(L([
    { p: [0, 0.155, 0.235], rx: 0.03, ry: 0.035 }, { p: [0, 0.15, 0.275], rx: 0.026, ry: 0.032 }, { p: [0, 0.12, 0.3], rx: 0.018, ry: 0.025 },
    { p: [0, 0.085, 0.3], rx: 0.009, ry: 0.012 }, { p: [0, 0.07, 0.285], rx: 0.003, ry: 0.004 },
  ], { seg: 8, sub: 2, up: [0, 0, 1] }), '#ece2cf');
  const lower = solid(ball(0.024, 0.022, 0.025, 7, 5, [0, 0.095, 0.25]), '#1a1a1a');
  const head = mergeGeometries([skull, upper, lower, ...eyes(0.011, [0.06, 0.15, 0.215], '#e8d070', '#0a0a0a', 0.6)]);
  const wingTop = (u, v) => {
    let c;
    if (v > 0.5 || u > 0.72) c = mixc(blue, dblue, (v - 0.5) * 1.5 + (u > 0.72 ? 0.3 : 0));
    else if (v > 0.25) c = v > 0.42 ? green : yellow;
    else c = red;
    return jl(c, rng, 0.04);
  };
  const wingR = plate([
    { s: 0, l: 0.06, t: -0.1 }, { s: 0.1, l: 0.07, t: -0.15 }, { s: 0.2, l: 0.06, t: -0.15 }, { s: 0.28, l: 0.035, t: -0.12 }, { s: 0.34, l: 0.0, t: -0.07 }, { s: 0.36, l: -0.03, t: -0.04 },
  ], { map: mapWingR, cs: 4, thick: 0.012, camber: 0.012, top: wingTop, bot: (u, v) => (v > 0.45 ? col('#b8902a') : col('#a8261e')) });
  const tail = plate([{ s: 0, l: 0.04, t: -0.04 }, { s: 0.15, l: 0.04, t: -0.04 }, { s: 0.35, l: 0.025, t: -0.025, h: -0.01 }, { s: 0.5, l: 0.008, t: -0.008, h: -0.02 }],
    { map: mapTail, cs: 2, thick: 0.01, top: (u, v) => (u > 0.62 ? jl(blue, rng, 0.04) : jl(red, rng, 0.04)), bot: () => col('#a83a20') });
  return {
    parts: [
      { name: 'body', geo: body, pivot: [0, 0, 0] },
      { name: 'head', geo: head, pivot: hp, parent: 'body', mat: 'satin' },
      { name: 'wr', geo: xf(wingR, [0.065, 0.05, 0.04]), pivot: [0.065, 0.05, 0.04], parent: 'body' },
      { name: 'wl', geo: xf(mirrorX(wingR), [-0.065, 0.05, 0.04]), pivot: [-0.065, 0.05, 0.04], parent: 'body' },
      { name: 'tail', geo: xf(tail, [0, -0.02, -0.15]), pivot: [0, -0.02, -0.15], parent: 'body' },
    ],
    foot: [0, -0.133, 0],
  };
}

// ─── HARPY EAGLE ────────────────────────────────────────────────────────────────────
export function harpySpec(v) {
  const rng = makeRng(901 + v);
  const slate = col('#34383c'), grey = col(['#a9adb0', '#b4b7b9', '#9ea3a7'][v]), white = col('#f2efe8'), black = col('#141416'), yellow = col('#f0c030');
  const bodyR = [
    { p: [0, -0.04, -0.34], rx: 0.07, ry: 0.06 },
    { p: [0, -0.03, -0.28], rx: 0.15, ry: 0.15 },
    { p: [0, 0.0, -0.12], rx: 0.19, ry: 0.21 },
    { p: [0, 0.03, 0.05], rx: 0.19, ry: 0.22 },
    { p: [0, 0.08, 0.17], rx: 0.15, ry: 0.17 },
    { p: [0, 0.14, 0.24], rx: 0.11, ry: 0.11 },
  ];
  const body = paintFaces(L(bodyR, { seg: 12, sub: 2 }), (i) => {
    if (i.ny > 0.25) return jl(slate, rng, 0.05);
    if (i.z > 0.07 && i.nz > -0.1 && i.ny > -0.75) return i.z > 0.19 ? grey : jl(black, rng, 0.03);   // chest band
    return jl(white, rng, 0.03);
  });
  // legs: feathered white thighs + thick yellow tarsus + huge talons (separate part: tucks in flight)
  const thighs = [1, -1].map((s) => paintFaces(L([{ p: [s * 0.08, -0.08, 0.02], rx: 0.07, ry: 0.07 }, { p: [s * 0.085, -0.17, 0.04], rx: 0.06, ry: 0.06 }, { p: [s * 0.09, -0.22, 0.05], rx: 0.04, ry: 0.04 }], { seg: 7, up: [0, 0, 1], sub: 2 }),
    (i) => (Math.sin(i.y * 120) > 0.5 ? col('#4a4a4a') : white)));
  const feet = birdLegs(0.09, -0.21, 0.09, 0.05, yellow, 0.07, 0.026, black);
  const legs = mergeGeometries([...thighs, feet]);
  const hp = [0, 0.18, 0.26];
  const skull = paintFaces(ball(0.11, 0.11, 0.12, 10, 7, [0, 0.24, 0.33]), (i) => (i.nz > 0.6 && i.ny > -0.2 && i.ny < 0.35 && Math.abs(i.nx) < 0.5 ? jl(col('#c4c7c9'), rng, 0.03) : jl(grey, rng, 0.04)));
  const beak = solid(L([
    { p: [0, 0.24, 0.42], rx: 0.04, ry: 0.045 }, { p: [0, 0.235, 0.47], rx: 0.032, ry: 0.04 }, { p: [0, 0.21, 0.505], rx: 0.022, ry: 0.03 },
    { p: [0, 0.175, 0.51], rx: 0.012, ry: 0.015 }, { p: [0, 0.155, 0.495], rx: 0.003, ry: 0.004 },
  ], { seg: 8, sub: 2, up: [0, 0, 1] }), '#1c1c1e');
  const crest = [];
  for (const s of [1, -1]) for (const [dx, len, up] of [[0.02, 0.13, 0.1], [0.045, 0.15, 0.07], [0.07, 0.11, 0.04]]) {
    crest.push(paintFaces(L([{ p: [s * dx, 0.32, 0.31], rx: 0.022, ry: 0.01 }, { p: [s * (dx + 0.025), 0.32 + up * 0.7, 0.31 - len * 0.6], rx: 0.024, ry: 0.008 }, { p: [s * (dx + 0.04), 0.32 + up, 0.31 - len], rx: 0.006, ry: 0.003 }],
      { seg: 5, sub: 1, up: [0, 0, 1] }), () => col('#26282a')));
  }
  const head = mergeGeometries([skull, beak, ...crest, ...eyes(0.02, [0.06, 0.27, 0.41], '#2a1a0c', '#050505', 1.2)]);
  const finger = (u, v) => (v > 0.9 ? 1 : 0);
  const wingTop = (u, v) => jl(mixc(slate, col('#2a2d30'), v + (Math.sin(u * 30) > 0.6 ? 0.25 : 0)), rng, 0.04);
  const wingBot = (u, v) => (v > 0.82 || u > 0.85 ? col('#202224') : (Math.sin(v * 22 + u * 3) > 0.55 ? col('#555a5e') : white));
  const wingR = plate([
    { s: 0, l: 0.14, t: -0.22 }, { s: 0.25, l: 0.17, t: -0.3 }, { s: 0.5, l: 0.15, t: -0.3 }, { s: 0.7, l: 0.12, t: -0.26 },
    { s: 0.78, l: 0.1, t: -0.12 }, { s: 0.84, l: 0.08, t: -0.22 }, { s: 0.9, l: 0.05, t: -0.08 }, { s: 0.96, l: 0.02, t: -0.16 }, { s: 1.02, l: -0.02, t: -0.06 },
  ], { map: mapWingR, cs: 3, thick: 0.025, camber: 0.04, top: wingTop, bot: wingBot });
  const tail = plate([{ s: 0, l: 0.09, t: -0.09 }, { s: 0.2, l: 0.13, t: -0.13 }, { s: 0.42, l: 0.14, t: -0.14, h: -0.01 }],
    { map: mapTail, cs: 2, thick: 0.02, top: (u) => (Math.sin(u * 19) > 0.3 ? black : jl(col('#8a8f92'), rng, 0.04)), bot: (u) => (Math.sin(u * 19) > 0.3 ? col('#2a2a2a') : col('#c8c8c8')) });
  return {
    parts: [
      { name: 'body', geo: body, pivot: [0, 0, 0] },
      { name: 'head', geo: head, pivot: hp, parent: 'body', mat: 'satin' },
      { name: 'legs', geo: legs, pivot: [0, -0.08, 0.03], parent: 'body' },
      { name: 'wr', geo: xf(wingR, [0.13, 0.08, 0.06]), pivot: [0.13, 0.08, 0.06], parent: 'body' },
      { name: 'wl', geo: xf(mirrorX(wingR), [-0.13, 0.08, 0.06]), pivot: [-0.13, 0.08, 0.06], parent: 'body' },
      { name: 'tail', geo: xf(tail, [0, -0.02, -0.3]), pivot: [0, -0.02, -0.3], parent: 'body' },
    ],
    foot: [0, -0.307, 0.05],
  };
}

// ─── HUMMINGBIRD ────────────────────────────────────────────────────────────────────
export function hummingbirdSpec(v) {
  const rng = makeRng(1001 + v);
  const green = col(['#1fbf4a', '#20b860', '#2ac040'][v]), throat = col(['#14d070', '#ff2a5a', '#14d070'][v]), belly = col('#e6eee4');
  const bodyR = [
    { p: [0, -0.005, -0.075], rx: 0.015, ry: 0.015 },
    { p: [0, 0.0, -0.055], rx: 0.03, ry: 0.032 },
    { p: [0, 0.0, -0.01], rx: 0.04, ry: 0.044 },
    { p: [0, 0.01, 0.03], rx: 0.036, ry: 0.04 },
    { p: [0, 0.025, 0.06], rx: 0.024, ry: 0.026 },
  ];
  const body = mergeGeometries([paintFaces(L(bodyR, { seg: 9, sub: 2 }), (i) => (i.ny < -0.35 ? belly : jl(green, rng, 0.05))), birdLegs(0.01, -0.035, 0.012, 0, '#222', 0.008, 0.003)]);
  const hp = [0, 0.03, 0.06];
  const skull = paintFaces(ball(0.03, 0.03, 0.032, 8, 6, [0, 0.04, 0.075]), (i) => (i.ny < -0.25 && i.nz > 0 ? jl(throat, rng, 0.04) : jl(green, rng, 0.05)));
  const beak = solid(L([{ p: [0, 0.038, 0.1], rx: 0.006, ry: 0.006 }, { p: [0, 0.033, 0.16], rx: 0.003, ry: 0.003 }, { p: [0, 0.027, 0.2], rx: 0.0015, ry: 0.0015 }], { seg: 5, sub: 1 }), '#141414');
  const head = mergeGeometries([skull, beak, ...eyes(0.007, [0.022, 0.048, 0.093], '#050505', null, 0.5)]);
  const wingR = plate([{ s: 0, l: 0.012, t: -0.014 }, { s: 0.05, l: 0.016, t: -0.02 }, { s: 0.11, l: 0.01, t: -0.016 }, { s: 0.14, l: -0.002, t: -0.008 }],
    { map: mapWingR, cs: 1, single: true, top: () => col('#b8c8c8') });
  const tail = plate([{ s: 0, l: 0.012, t: -0.012 }, { s: 0.04, l: 0.022, t: -0.022 }, { s: 0.055, l: 0.03, t: 0.015 }, { s: 0.056, l: 0.03, t: 0.015 }].slice(0, 3),
    { map: mapTail, cs: 2, thick: 0.004, top: (u, v) => (v > 0.4 && v < 0.6 && u > 0.6 ? col('#0e3a1e') : jl(col('#126a32'), rng, 0.05)) });
  return {
    parts: [
      { name: 'body', geo: body, pivot: [0, 0, 0], mat: 'irid' },
      { name: 'head', geo: head, pivot: hp, parent: 'body', mat: 'irid' },
      { name: 'wr', geo: xf(wingR, [0.02, 0.02, 0.02]), pivot: [0.02, 0.02, 0.02], parent: 'body', mat: 'blur', shadow: false },
      { name: 'wl', geo: xf(mirrorX(wingR), [-0.02, 0.02, 0.02]), pivot: [-0.02, 0.02, 0.02], parent: 'body', mat: 'blur', shadow: false },
      { name: 'tail', geo: xf(tail, [0, 0.0, -0.065]), pivot: [0, 0.0, -0.065], parent: 'body', mat: 'irid' },
    ],
    foot: [0, -0.048, 0],
  };
}

// ─── MORPHO BUTTERFLY ───────────────────────────────────────────────────────────────
export function morphoSpec(v) {
  const rng = makeRng(1101 + v);
  const blue = col(['#0640c8', '#0848d0', '#053ab8'][v]), edge = col('#050a14'), spot = col('#e8eef8');
  const body = mergeGeometries([
    solid(L([{ p: [0, 0, -0.07], rx: 0.007, ry: 0.007 }, { p: [0, 0, -0.03], rx: 0.012, ry: 0.012 }, { p: [0, 0, 0.02], rx: 0.014, ry: 0.014 }, { p: [0, 0.002, 0.045], rx: 0.011, ry: 0.011 }], { seg: 6, sub: 2 }), '#2a2018'),
    solid(ball(0.011, 0.011, 0.011, 6, 4, [0, 0.004, 0.056]), '#1a140e'),
    ...[1, -1].map((s) => solid(L([{ p: [s * 0.004, 0.008, 0.062], rx: 0.0015, ry: 0.0015 }, { p: [s * 0.03, 0.03, 0.12], rx: 0.0015, ry: 0.0015 }, { p: [s * 0.034, 0.032, 0.128], rx: 0.004, ry: 0.004 }], { seg: 3, sub: 1 }), '#1a140e')),
  ]);
  const wingCol = (u, v, i) => {
    const r = Math.hypot(i.x, i.z * 1.1);
    const rim = v > 0.82 || v < 0.06 || u > 0.86;
    if (rim) {
      if (u > 0.55 && v > 0.15 && v < 0.75 && ((i.f * 7) % 5) < 1) return spot;
      return edge;
    }
    return jl(mixc(blue, col('#1a8cff'), clamp(1 - r * 6) * 0.6), rng, 0.03);
  };
  // underside: brown with eyespots (seen when the wings close – the morpho 'vanishes' when it folds them)
  const under = (cx, cz) => (u, v, i) => {
    const d = Math.hypot(i.x - cx, i.z - cz);
    if (d < 0.012) return '#f0e8d0'; if (d < 0.022) return '#1a1008'; if (d < 0.032) return '#e0a830';
    return jl(mixc('#6a4424', '#9a6a3a', Math.sin(u * 9 + v * 4) * 0.5 + 0.5), rng, 0.04);
  };
  const fore = plate([
    { s: 0.0, l: 0.025, t: -0.005 }, { s: 0.06, l: 0.05, t: -0.04 }, { s: 0.13, l: 0.075, t: -0.06 }, { s: 0.2, l: 0.095, t: -0.06 }, { s: 0.245, l: 0.1, t: -0.035 }, { s: 0.26, l: 0.09, t: 0.0 },
  ], { map: mapWingR, cs: 4, thick: 0.002, top: wingCol, bot: under(0.17, 0.02) });
  const hind = plate([
    { s: 0.0, l: 0.0, t: -0.07 }, { s: 0.05, l: -0.005, t: -0.13 }, { s: 0.11, l: -0.02, t: -0.165 }, { s: 0.16, l: -0.035, t: -0.16 }, { s: 0.19, l: -0.055, t: -0.13 }, { s: 0.2, l: -0.075, t: -0.1 },
  ], { map: (s, c, h) => [s, h - 0.003, c], cs: 4, thick: 0.002, top: wingCol, bot: under(0.1, -0.1) });
  const wingR = mergeGeometries([fore, hind]);
  return {
    parts: [
      { name: 'body', geo: body, pivot: [0, 0, 0] },
      { name: 'wr', geo: xf(wingR, [0.008, 0.004, 0.0]), pivot: [0.008, 0.004, 0], parent: 'body', mat: 'morpho' },
      { name: 'wl', geo: xf(mirrorX(wingR), [-0.008, 0.004, 0.0]), pivot: [-0.008, 0.004, 0], parent: 'body', mat: 'morpho' },
    ],
  };
}

// ─── ORCHID BEE (Euglossa) ──────────────────────────────────────────────────────────
export function orchidbeeSpec(v) {
  const rng = makeRng(1201 + v);
  const green = col(['#1ec060', '#22b84a', '#18b878'][v]), bronze = col('#7ac030');
  const thorax = paintFaces(ball(0.05, 0.048, 0.055, 9, 7, [0, 0.01, 0.02]), () => jl(green, rng, 0.06));
  const abdomen = paintFaces(L([{ p: [0, 0.0, -0.025], rx: 0.045, ry: 0.042 }, { p: [0, -0.005, -0.07], rx: 0.05, ry: 0.045 }, { p: [0, -0.012, -0.115], rx: 0.035, ry: 0.032 }, { p: [0, -0.02, -0.14], rx: 0.012, ry: 0.012 }], { seg: 9, sub: 2 }),
    (i) => jl(mixc(green, bronze, Math.sin(i.z * 90) * 0.5 + 0.3), rng, 0.05));
  const headG = paintFaces(ball(0.035, 0.035, 0.03, 8, 6, [0, 0.012, 0.085]), (i) => (Math.abs(i.nx) > 0.6 ? col('#1a2a20') : jl(green, rng, 0.05)));
  const eyesG = [1, -1].map((s) => solid(ball(0.016, 0.026, 0.016, 6, 5, [s * 0.026, 0.016, 0.085]), '#141c18'));
  const tongue = solid(L([{ p: [0, -0.008, 0.11], rx: 0.004, ry: 0.004 }, { p: [0, -0.03, 0.06], rx: 0.003, ry: 0.003 }, { p: [0, -0.05, -0.08], rx: 0.0025, ry: 0.0025 }, { p: [0, -0.045, -0.16], rx: 0.0015, ry: 0.0015 }], { seg: 4, sub: 2 }), '#2a2018');
  const legs = [];
  for (const s of [1, -1]) for (const [z, len, r] of [[0.035, 0.05, 0.004], [0.015, 0.06, 0.004], [-0.005, 0.08, 0.01]]) {
    legs.push(solid(L([{ p: [s * 0.03, -0.015, z], rx: r * 0.6, ry: r * 0.6 }, { p: [s * 0.055, -0.04, z - 0.01], rx: r, ry: r }, { p: [s * 0.06, -0.015 - len, z - 0.035], rx: r * 0.5, ry: r * 0.5 }], { seg: 4, sub: 1 }), r > 0.008 ? '#2a6040' : '#1a1a1a'));
  }
  const ant = [1, -1].map((s) => solid(L([{ p: [s * 0.01, 0.03, 0.1], rx: 0.002, ry: 0.002 }, { p: [s * 0.02, 0.07, 0.12], rx: 0.002, ry: 0.002 }, { p: [s * 0.035, 0.07, 0.15], rx: 0.0018, ry: 0.0018 }], { seg: 3, sub: 1 }), '#1a1a1a'));
  const body = mergeGeometries([thorax, abdomen, headG, ...eyesG, tongue, ...legs, ...ant]);
  const wingR = plate([{ s: 0, l: 0.015, t: -0.01 }, { s: 0.05, l: 0.025, t: -0.03 }, { s: 0.11, l: 0.015, t: -0.035 }, { s: 0.14, l: -0.005, t: -0.02 }],
    { map: mapWingR, cs: 1, single: true, top: () => col('#c8d8e0') });
  return {
    parts: [
      { name: 'body', geo: body, pivot: [0, 0, 0], mat: 'irid' },
      { name: 'wr', geo: xf(wingR, [0.025, 0.045, 0.03], [0, 0.2, 0]), pivot: [0.025, 0.045, 0.03], parent: 'body', mat: 'blur', shadow: false },
      { name: 'wl', geo: xf(mirrorX(wingR), [-0.025, 0.045, 0.03], [0, -0.2, 0]), pivot: [-0.025, 0.045, 0.03], parent: 'body', mat: 'blur', shadow: false },
    ],
  };
}

// ─── POISON DART FROG ───────────────────────────────────────────────────────────────
export function dartfrogSpec(v) {
  const rng = makeRng(1301 + v);
  const yellow = v === 2;
  const base = col(yellow ? '#ffd21a' : '#1e6ae0'), leg = col(yellow ? '#141414' : '#123c9e'), belly = col(yellow ? '#141414' : '#3a86f0'), black = col('#0a0a12');
  const skin = (i, isLeg) => {
    // soft-edged (vertex-blended) markings
    if (yellow) { const w = worley(i.x, i.y, i.z * 0.6, 0.07, 41 + v); return mixc(black, jl(base, rng, 0.04), smoothstep(0.1, 0.3, w.f2 - w.f1)); }
    const w = worley(i.x, i.y, i.z, isLeg ? 0.045 : 0.075, 41 + v);
    const c = jl(isLeg ? leg : i.ny < -0.5 ? belly : base, rng, 0.05);
    return i.ny > -0.4 ? mixc(c, black, smoothstep(0.58, 0.36, w.f1)) : c;
  };
  const bodyR = [
    { p: [0, 0.07, -0.11], rx: 0.04, ry: 0.035 },
    { p: [0, 0.075, -0.08], rx: 0.07, ry: 0.055, fb: 0.6 },
    { p: [0, 0.08, -0.02], rx: 0.08, ry: 0.06, fb: 0.6 },
    { p: [0, 0.075, 0.04], rx: 0.075, ry: 0.052, fb: 0.6 },
    { p: [0, 0.065, 0.09], rx: 0.06, ry: 0.04, fb: 0.6 },
    { p: [0, 0.055, 0.12], rx: 0.04, ry: 0.028, fb: 0.6 },
  ];
  const bodyG = paintFaces(L(bodyR, { seg: 12, sub: 2, cap1: 0.8 }), (i) => skin(i, false));
  const eyeG = eyes(0.019, [0.045, 0.103, 0.075], '#08080a', null, 0.2);
  const front = [1, -1].map((s) => paintFaces(L([{ p: [s * 0.055, 0.055, 0.06], rx: 0.016, ry: 0.016 }, { p: [s * 0.085, 0.025, 0.085], rx: 0.012, ry: 0.012 }, { p: [s * 0.09, 0.006, 0.1], rx: 0.009, ry: 0.009 }], { seg: 5, sub: 2, up: [0, 0, 1] }), (i) => skin(i, true)));
  const pads = [1, -1].flatMap((s) => [-0.4, 0, 0.4].map((a) => solid(ball(0.008, 0.004, 0.008, 5, 3, [s * 0.09 + Math.sin(a) * 0.02, 0.004, 0.1 + Math.cos(a) * 0.02]), yellow ? '#141414' : '#0c2c70')));
  const body = mergeGeometries([bodyG, ...eyeG, ...front, ...pads]);
  const hind = (s) => {
    const g = paintFaces(L([
      { p: [s * 0.055, 0.06, -0.08], rx: 0.022, ry: 0.022 }, { p: [s * 0.11, 0.045, -0.03], rx: 0.02, ry: 0.018 },
      { p: [s * 0.12, 0.03, -0.035], rx: 0.016, ry: 0.014 }, { p: [s * 0.09, 0.02, -0.12], rx: 0.012, ry: 0.011 }, { p: [s * 0.1, 0.008, -0.06], rx: 0.01, ry: 0.007 },
      { p: [s * 0.11, 0.005, -0.02], rx: 0.007, ry: 0.004 },
    ], { seg: 6, sub: 2 }), (i) => skin(i, true));
    const tp = [-0.5, 0, 0.5].map((a) => solid(ball(0.008, 0.004, 0.008, 5, 3, [s * 0.11 + Math.sin(a) * 0.02, 0.004, -0.015 + Math.cos(a) * 0.02]), yellow ? '#141414' : '#0c2c70'));
    return mergeGeometries([g, ...tp]);
  };
  return {
    parts: [
      { name: 'body', geo: body, pivot: [0, 0.06, -0.06], mat: 'gloss' },
      { name: 'hl', geo: hind(1), pivot: [0.055, 0.06, -0.08], parent: 'body', mat: 'gloss' },
      { name: 'hr', geo: hind(-1), pivot: [-0.055, 0.06, -0.08], parent: 'body', mat: 'gloss' },
    ],
  };
}

// ─── FRUIT BAT ──────────────────────────────────────────────────────────────────────
export function fruitbatSpec(v) {
  const rng = makeRng(1401 + v);
  const fur = col(['#5a3e2a', '#634430', '#523826'][v]), mantle = col('#a87038'), memb = col('#3a2a22'), bone = col('#5a4232');
  const bodyR = [
    { p: [0, -0.005, -0.1], rx: 0.03, ry: 0.03 },
    { p: [0, 0, -0.07], rx: 0.05, ry: 0.045 },
    { p: [0, 0, -0.01], rx: 0.06, ry: 0.055 },
    { p: [0, 0.005, 0.04], rx: 0.055, ry: 0.05 },
    { p: [0, 0.01, 0.075], rx: 0.04, ry: 0.038 },
  ];
  const bodyG = paintFaces(L(bodyR, { seg: 9, sub: 2, flat: true, jit: 0.15, rng }), (i) => jl(i.z > 0.03 && i.ny > -0.3 ? mantle : fur, rng, 0.1));
  const feet = [1, -1].map((s) => solid(L([{ p: [s * 0.025, -0.01, -0.08], rx: 0.007, ry: 0.007 }, { p: [s * 0.03, -0.0, -0.13], rx: 0.006, ry: 0.006 }, { p: [s * 0.03, 0.012, -0.145], rx: 0.004, ry: 0.004 }], { seg: 4, sub: 1 }), '#2a1e18'));
  const body = mergeGeometries([bodyG, ...feet]);
  const hp = [0, 0.015, 0.075];
  const skull = paintFaces(ball(0.038, 0.036, 0.04, 8, 6, [0, 0.02, 0.1]), (i) => jl(mixc(fur, mantle, 0.4), rng, 0.08));
  const snout = solid(L([{ p: [0, 0.015, 0.12], rx: 0.024, ry: 0.022 }, { p: [0, 0.01, 0.15], rx: 0.014, ry: 0.013 }, { p: [0, 0.006, 0.165], rx: 0.008, ry: 0.008 }], { seg: 7, sub: 2 }), '#4a3224');
  const ears = [1, -1].map((s) => solid(xf(ball(0.014, 0.024, 0.007, 6, 4), [s * 0.024, 0.058, 0.095], [0, 0, s * -0.35]), '#2a1c16'));
  const head = mergeGeometries([skull, snout, ...ears, solid(ball(0.004, 0.004, 0.004, 4, 3, [0, 0.008, 0.168]), '#111'), ...eyes(0.009, [0.022, 0.03, 0.128], '#140c08', null, 0.9)]);
  // membrane wing with fingers and scalloped trailing edge
  const st = [
    { s: 0, l: 0.03, t: -0.09 }, { s: 0.05, l: 0.045, t: -0.085 }, { s: 0.1, l: 0.055, t: -0.15 }, { s: 0.15, l: 0.06, t: -0.19 },
    { s: 0.2, l: 0.05, t: -0.11 }, { s: 0.26, l: 0.035, t: -0.17 }, { s: 0.3, l: 0.02, t: -0.08 }, { s: 0.34, l: 0.005, t: -0.11 }, { s: 0.38, l: -0.02, t: -0.04 },
  ];
  const wingR = plate(st, {
    map: mapWingR, cs: 3, thick: 0.006, camber: 0.012,
    top: (u, v) => (v < 0.2 && u < 0.5 ? bone : jl(memb, rng, 0.05)), bot: (u, v) => (v < 0.2 && u < 0.5 ? bone : jl(col('#4a3428'), rng, 0.05)),
  });
  return {
    parts: [
      { name: 'body', geo: body, pivot: [0, 0, 0], mat: 'fur' },
      { name: 'head', geo: head, pivot: hp, parent: 'body', mat: 'fur' },
      { name: 'wr', geo: xf(wingR, [0.04, 0.015, 0.035]), pivot: [0.04, 0.015, 0.035], parent: 'body', mat: 'membrane' },
      { name: 'wl', geo: xf(mirrorX(wingR), [-0.04, 0.015, 0.035]), pivot: [-0.04, 0.015, 0.035], parent: 'body', mat: 'membrane' },
    ],
  };
}
