// Grove animals: geometry of the birds and the lizards (moved unchanged from grove-animals.js).
// Exports buildJay, buildBlackbird, buildOwl, buildChameleon, buildAgama; birdWing and buildBird are local
// helpers. Needs: kit.js.
import { lerp, smoothstep } from '../../core/util.js';
import { h3, wobble, colorize, paintG, loft, tube, ell, stick, plate, mirrorX, merge, add3, eyes } from './kit.js';

// ---------------------------------------------------------------- BIRDS
function birdWing(P, rng, side) {
  const span = P.span, c0 = P.chord;
  const pos = (u, v) => {
    let ch = c0 * (1 - 0.2 * u);
    if (u > P.tipStart) { const q = (u - P.tipStart) / (1 - P.tipStart); ch *= Math.sqrt(Math.max(0.05, 1 - q * q * 0.92)); }
    const zl = 0.14 * c0 * Math.sin(u * Math.PI * 0.85) - (P.sweep || 0.25) * c0 * u * u;
    let z = zl - v * ch;
    z -= Math.pow(v, 4) * (P.scallop || 0) * c0 * Math.abs(Math.sin(u * Math.PI * (P.feathers || 4))) * smoothstep(0.35, 0.65, u);
    const y = (P.camber || 0.08) * c0 * Math.sin(Math.PI * v) * (1 - 0.6 * u);
    return [u * span, y, z];
  };
  const g = plate(pos, P.U || 9, P.V || 3, P.thick || 0.008, P.col, rng, 0.05);
  const gg = side < 0 ? mirrorX(g) : g;
  return gg.translate(side * P.pivot[0], P.pivot[1], P.pivot[2]);
}
function buildBird(rng, P) {
  const tilt = P.tilt;
  const d = [0, -Math.cos(tilt), -Math.sin(tilt)], fwd = [0, -Math.sin(tilt), Math.cos(tilt)];
  const bodyParts = [colorize(wobble(loft(P.bodyRings, 10), P.wob || 0.003, 1), P.bodyCol, rng, 0.05)];
  for (const sd of [1, -1]) {
    const hip = [sd * P.hipX, P.hipY, P.hipZ]; const foot = add3(hip, d, P.legLen);
    if (P.thigh) bodyParts.push(paintG(ell(P.thigh[0], P.thigh[1], P.thigh[0], ...add3(hip, d, P.legLen * 0.3), 6, 4), P.thighCol, rng));
    bodyParts.push(colorize(loft([{ p: hip, r: P.legR * 1.4 }, { p: add3(hip, d, P.legLen * 0.5), r: P.legR }, { p: foot, r: P.legR * 0.9 }], 5, { up: [1, 0, 0] }), () => P.legCol, rng, 0.03));
    const toe = (dir, len) => colorize(stick(foot, add3(foot, dir, len), P.legR * 0.8, P.legR * 0.4), () => P.clawCol || P.legCol, rng, 0.03);
    const T = P.toe;
    bodyParts.push(toe([fwd[0] + 0.0, fwd[1], fwd[2]], T), toe([sd * 0.55, fwd[1] * 0.8, fwd[2] * 0.8], T * 0.85), toe([-sd * 0.4, fwd[1] * 0.8, fwd[2] * 0.85], T * 0.85), toe([0, -fwd[1], -fwd[2]], T * 0.6));
  }
  const body = merge(bodyParts);
  const hipWorldY = P.hipY * Math.cos(tilt) + P.hipZ * Math.sin(tilt);
  const perchOffset = -hipWorldY + P.legLen + P.legR;
  const wl = birdWing(P.wing, rng, 1), wr = birdWing(P.wing, rng, -1);
  const tail = plate((u, v) => [(v - 0.5) * lerp(P.tail.w0, P.tail.w1, u), 0, -u * P.tail.len], 3, 4, 0.006, P.tail.col, rng, 0.04)
    .translate(...P.tail.pivot);
  return {
    height: P.height, length: P.length, tilt, perchOffset,
    parts: [
      { name: 'body', geom: body, pivot: [0, 0, 0] },
      { name: 'head', geom: P.head(rng), pivot: P.headPivot, parent: 'body' },
      { name: 'wingL', geom: wl, pivot: [P.wing.pivot[0], P.wing.pivot[1], P.wing.pivot[2]], parent: 'body' },
      { name: 'wingR', geom: wr, pivot: [-P.wing.pivot[0], P.wing.pivot[1], P.wing.pivot[2]], parent: 'body' },
      { name: 'tail', geom: tail, pivot: P.tail.pivot, parent: 'body' },
    ],
  };
}

export function buildJay(rng) {
  const pink = '#b88f7c', pinkL = '#caa292', white = '#f2eee8';
  return buildBird(rng, {
    tilt: 0.42, height: 0.32, length: 0.5,
    bodyRings: [{ p: [0, 0.0, -0.13], r: [0.04, 0.04] }, { p: [0, 0, -0.09], r: [0.072, 0.075] }, { p: [0, 0, -0.01], r: [0.083, 0.088] },
      { p: [0, 0.008, 0.06], r: [0.074, 0.08] }, { p: [0, 0.025, 0.105], r: [0.048, 0.052] }],
    bodyCol: (c, n) => (c.z < -0.075 && n.y > 0.2) ? white : (c.z < -0.08 && n.y < -0.2 ? white : (n.y < -0.3 ? pinkL : pink)),
    hipX: 0.026, hipY: -0.06, hipZ: -0.01, legLen: 0.075, legR: 0.0065, toe: 0.03, legCol: '#8c6e5e',
    headPivot: [0, 0.035, 0.1],
    head: (rng) => {
      const h = colorize(wobble(loft([{ p: [0, 0.035, 0.07], r: [0.046, 0.05] }, { p: [0, 0.05, 0.115], r: [0.05, 0.05] }, { p: [0, 0.045, 0.15], r: [0.035, 0.035] }], 8, { tipEnd: 0.01 }), 0.003, 2),
        (c, n) => {
          if (n.y > 0.55 && c.z < 0.15) return '#151312';                          // black crown (Middle-East jay)
          if (Math.abs(n.x) > 0.45 && c.y < 0.04 && c.z > 0.115) return '#0f0e0e';   // black moustache
          if (c.z > 0.115 && n.y > -0.2) return white;                                // pale face/forehead
          if (n.y < -0.4) return '#ece4dc';                                           // pale throat
          return pinkL;
        }, rng, 0.04);
      const crest = [];
      for (let i = 0; i < 4; i++) { const x = (i - 1.5) * 0.012; crest.push(paintG(stick([x, 0.085, 0.11], [x * 1.4, 0.112, 0.07 - i % 2 * 0.01], 0.014, 0.004, 4), '#1a1817', rng)); }
      const beak = colorize(loft([{ p: [0, 0.04, 0.148], r: [0.016, 0.017] }, { p: [0, 0.036, 0.18], r: [0.008, 0.008] }], 5, { tipEnd: 0.012 }), () => '#2b2a2a', rng, 0.03);
      return merge([h, ...crest, beak, ...eyes(0.034, 0.06, 0.125, 0.0105, '#7fb2d6', rng), ...eyes(0.0425, 0.061, 0.129, 0.0045, '#050505', rng, false)]);
    },
    wing: {
      pivot: [0.06, -0.012, 0.06], span: 0.24, chord: 0.12, tipStart: 0.6, sweep: 0.3, scallop: 0.25, feathers: 5, camber: 0.1,
      col: (u, v, top) => {
        if (!top) return u < 0.55 ? '#c4a49a' : '#3a3636';
        if (u > 0.55) return v < 0.2 ? '#2a2828' : '#141313';                     // black primaries
        if (u > 0.18 && v < 0.5) {                                                 // barred blue patch
          const b = Math.floor(u * 22 + v * 3) % 3; return b === 0 ? '#2563c9' : (b === 1 ? '#0e1630' : '#6fa6ea');
        }
        if (u > 0.18 && v >= 0.5) return v < 0.85 ? white : '#1b1a1a';         // white speculum
        return v > 0.6 ? '#151414' : pink;
      },
    },
    tail: { pivot: [0, 0.01, -0.12], len: 0.17, w0: 0.045, w1: 0.075, col: (u, v, top) => top ? (u < 0.15 ? white : '#121111') : '#2a2828' },
  });
}

export function buildBlackbird(rng) {
  const blk = '#161412', blkL = '#24201d';
  return buildBird(rng, {
    tilt: 0.45, height: 0.26, length: 0.42,
    bodyRings: [{ p: [0, 0, -0.11], r: [0.034, 0.034] }, { p: [0, 0, -0.075], r: [0.06, 0.062] }, { p: [0, 0, -0.01], r: [0.068, 0.072] },
      { p: [0, 0.008, 0.05], r: [0.06, 0.065] }, { p: [0, 0.022, 0.09], r: [0.04, 0.043] }],
    bodyCol: (c, n) => n.y > 0.5 ? blkL : blk,
    hipX: 0.022, hipY: -0.05, hipZ: -0.01, legLen: 0.07, legR: 0.0055, toe: 0.026, legCol: '#2e2219',
    headPivot: [0, 0.03, 0.085],
    head: (rng) => {
      const h = colorize(wobble(loft([{ p: [0, 0.03, 0.06], r: [0.038, 0.042] }, { p: [0, 0.042, 0.097], r: [0.04, 0.041] }, { p: [0, 0.038, 0.126], r: [0.026, 0.026] }], 8, { tipEnd: 0.008 }), 0.0025, 2),
        (c, n) => n.y > 0.5 ? blkL : blk, rng, 0.05);
      const beak = colorize(loft([{ p: [0, 0.035, 0.125], r: [0.012, 0.013] }, { p: [0, 0.031, 0.155], r: [0.006, 0.006] }], 5, { tipEnd: 0.01 }), () => '#f4a118', rng, 0.03);
      return merge([h, beak, ...eyes(0.029, 0.05, 0.106, 0.0105, '#f2b02c', rng, false), ...eyes(0.0355, 0.0505, 0.108, 0.0065, '#050403', rng)]);
    },
    wing: { pivot: [0.05, -0.01, 0.05], span: 0.2, chord: 0.1, tipStart: 0.6, sweep: 0.3, scallop: 0.2, feathers: 5, col: (u, v, top) => top ? (v > 0.6 ? '#0f0e0d' : blkL) : '#2a2623' },
    tail: { pivot: [0, 0.01, -0.105], len: 0.15, w0: 0.04, w1: 0.06, col: (u, v, top) => top ? '#100f0e' : '#1d1a18' },
  });
}

export function buildOwl(rng) {
  const buff = '#cd9a55', grey = '#b3a594', white = '#f5f1e8', rim = '#b9844b';
  const mottle = (c) => { const h = h3(c.x * 700, c.y * 700, c.z * 700, 7); return (h & 7) === 0 ? '#5a4632' : ((h & 3) === 1 ? grey : buff); };
  return buildBird(rng, {
    tilt: 1.15, height: 0.62, length: 0.42,
    bodyRings: [{ p: [0, 0, -0.2], r: [0.06, 0.055] }, { p: [0, 0, -0.14], r: [0.12, 0.112] }, { p: [0, 0, -0.02], r: [0.145, 0.14] },
      { p: [0, 0, 0.08], r: [0.13, 0.125] }, { p: [0, 0.01, 0.15], r: [0.085, 0.085] }],
    bodyCol: (c, n) => n.y < -0.15 ? ((h3(c.x * 900, c.y * 900, c.z * 900, 5) & 15) === 0 ? '#9c8060' : white) : mottle(c),
    wob: 0.006,
    hipX: 0.05, hipY: -0.08, hipZ: -0.06, legLen: 0.17, legR: 0.012, toe: 0.04, legCol: '#e9e1d2', clawCol: '#2a2420',
    thigh: [0.035, 0.07], thighCol: white,
    headPivot: [0, 0.03, 0.16],
    head: (rng) => {
      // authored relative to the neck pivot in a level frame, then moved onto the pivot
      const skull = colorize(wobble(ell(0.118, 0.108, 0.1, 0, 0.1, -0.015, 10, 7), 0.004, 3), (c, n) => n.z > 0.25 ? rim : mottle(c), rng, 0.05);
      const disc = [];
      for (const sd of [1, -1]) {
        const g = ell(0.064, 0.1, 0.03, 0, 0, 0, 12, 8); g.rotateZ(sd * 0.36); g.translate(sd * 0.04, 0.083, 0.072);
        disc.push(colorize(g, (c, n) => (n.z < 0.45) ? '#a8733e' : white, rng, 0.02, 0)); // heart-shaped facial disc with a tawny rim
      }
      const beak = colorize(loft([{ p: [0, 0.085, 0.095], r: [0.011, 0.015] }, { p: [0, 0.06, 0.108], r: [0.005, 0.006] }], 4, { tipEnd: 0.008 }), () => '#e8d6c0', rng, 0.02);
      return merge([skull, ...disc, beak, ...eyes(0.034, 0.1, 0.096, 0.016, '#0a0605', rng)]).translate(0, 0.03, 0.16);
    },
    wing: {
      pivot: [0.11, -0.01, 0.07], span: 0.5, chord: 0.21, tipStart: 0.55, sweep: 0.25, scallop: 0.2, feathers: 6, camber: 0.08,
      col: (u, v, top) => {
        if (!top) return u > 0.75 && v > 0.6 ? '#d9cbb4' : white;
        if (u > 0.55) return (Math.floor(u * 14) % 2) ? '#a87a44' : '#d3a663';   // barred flight feathers
        return (Math.floor(u * 30 + v * 7) % 5 === 0) ? grey : (v > 0.7 ? '#c08a4a' : buff);
      },
    },
    tail: { pivot: [0, 0.0, -0.19], len: 0.12, w0: 0.08, w1: 0.11, col: (u, v, top) => top ? (Math.floor(u * 6) % 2 ? '#a67a46' : buff) : white },
  });
}

// ---------------------------------------------------------------- LIZARDS
export function buildChameleon(rng) {
  const g1 = '#5d9a3a', g2 = '#3f7c2c', spot = '#cfe08a', bellyC = '#e2e9b8';
  const body = colorize(wobble(loft([
    { p: [0, 0.13, -0.11], r: [0.022, 0.035] }, { p: [0, 0.15, -0.07], r: [0.038, 0.062] }, { p: [0, 0.162, -0.005], r: [0.044, 0.075] },
    { p: [0, 0.157, 0.05], r: [0.04, 0.065] }, { p: [0, 0.152, 0.09], r: [0.03, 0.045] }], 10, { capStart: false }), 0.003, 1),
  (c, n) => {
    if (n.y < -0.75) return bellyC;
    if (n.y > 0.85) return '#4e8a33';
    if (Math.abs(n.x) > 0.5 && Math.abs(c.y - 0.16) < 0.018 && (Math.floor((c.z + 1) * 38) % 2 === 0)) return spot; // lateral spot row
    return (Math.floor((c.z + 1) * 26) % 2) ? g1 : g2;
  }, rng, 0.06);
  // dorsal crest serrations
  const crest = [];
  for (let i = 0; i < 7; i++) { const z = lerp(-0.08, 0.07, i / 6); crest.push(paintG((stick([0, 0.215 - Math.abs(z) * 0.35, z], [0, 0.235 - Math.abs(z) * 0.35, z - 0.006], 0.006, 0.001, 3)), '#4a8530', rng)); }
  const bodyG = merge([body, ...crest]);
  const headL = colorize(wobble(loft([
    { p: [0, 0.155, 0.085], r: [0.03, 0.045] }, { p: [0, 0.16, 0.12], r: [0.028, 0.038] }, { p: [0, 0.148, 0.148], r: [0.02, 0.024] },
    { p: [0, 0.143, 0.165], r: [0.011, 0.012] }], 8, { tipEnd: 0.005, capStart: false }), 0.002, 2),
  (c, n) => (n.y < -0.3 && c.z > 0.11) ? '#d8dc90' : (n.y > 0.5 ? '#4b8a30' : g1), rng, 0.05);
  const casque = colorize(ell(0.014, 0.04, 0.038, 0, 0, 0, 7, 5).rotateX(-0.6).translate(0, 0.198, 0.088), (c, n) => n.z < -0.3 ? '#4a8a30' : '#62a03e', rng, 0.05);
  const head = merge([headL, casque]);
  const eyeG = {};
  for (const [k, sd] of [['eyeL', 1], ['eyeR', -1]]) {
    const turret = colorize(ell(0.017, 0.016, 0.016, sd * 0.004, 0, 0, 8, 6), (c, n) => '#6aaa42', rng, 0.05);
    const pupil = paintG(ell(0.005, 0.005, 0.005, sd * 0.019, 0, 0, 5, 4), '#050505', rng, 0);
    const ring = paintG(ell(0.007, 0.007, 0.007, sd * 0.0165, 0, 0, 6, 4), '#d6c040', rng, 0);
    eyeG[k] = merge([turret, ring, pupil]).translate(sd * 0.026, 0.168, 0.122);
  }
  const legs = {};
  for (const [k, sd, fr] of [['legFL', 1, 1], ['legFR', -1, 1], ['legHL', 1, 0], ['legHR', -1, 0]]) {
    const x = sd * 0.03, z = fr ? 0.06 : -0.065;
    const elbow = [sd * 0.062, 0.085, z + (fr ? -0.012 : 0.012)], foot = [sd * 0.05, 0.01, z + (fr ? 0.012 : -0.008)];
    const leg = loft([{ p: [x, 0.14, z], r: 0.013 }, { p: elbow, r: 0.01 }, { p: foot, r: 0.007 }], 5, { up: [0, 0, 1] });
    const t1 = stick(foot, add3(foot, [sd * 0.015, -0.006, 0.016]), 0.006, 0.003, 4), t2 = stick(foot, add3(foot, [-sd * 0.01, -0.006, -0.016]), 0.006, 0.003, 4);
    legs[k] = { geom: merge([colorize(leg, () => g1, rng, 0.06), paintG(t1, '#4e8a33', rng), paintG(t2, '#4e8a33', rng)]), pivot: [x, 0.14, z] };
  }
  // spiral tail
  const tpts = [[0, 0.13, -0.1], [0, 0.128, -0.15]];
  const C = [0, 0.075, -0.15];
  for (let i = 1; i <= 14; i++) { const th = i / 14 * 2.25 * Math.PI; const R = 0.053 * Math.exp(-0.26 * th); tpts.push([0, C[1] + R * Math.cos(th), C[2] - R * Math.sin(th)]); }
  const tail = colorize(tube(tpts, 22, u => [0.02 * (1 - u * 0.82), 0.024 * (1 - u * 0.8)], 6, { tipEnd: 0.004 }),
    (c, n, k, ud) => (Math.floor(k / (2 * ud.sides)) % 3 === 0) ? g2 : g1, rng, 0.05);
  const tongue = merge([colorize(loft([{ p: [0, 0.145, 0.16], r: 0.004 }, { p: [0, 0.145, 0.38], r: 0.004 }], 4, { capStart: false }), () => '#e48a98', rng, 0),
    paintG(ell(0.01, 0.01, 0.012, 0, 0.145, 0.386, 6, 4), '#d86c80', rng, 0)]);
  return {
    height: 0.24, length: 0.42,
    parts: [
      { name: 'body', geom: bodyG, pivot: [0, 0.15, 0] },
      { name: 'head', geom: head, pivot: [0, 0.155, 0.085], parent: 'body' },
      { name: 'eyeL', geom: eyeG.eyeL, pivot: [0.026, 0.168, 0.122], parent: 'head' },
      { name: 'eyeR', geom: eyeG.eyeR, pivot: [-0.026, 0.168, 0.122], parent: 'head' },
      { name: 'tongue', geom: tongue, pivot: [0, 0.145, 0.16], parent: 'head', noShadow: true },
      ...['legFL', 'legFR', 'legHL', 'legHR'].map(k => ({ name: k, geom: legs[k].geom, pivot: legs[k].pivot, parent: 'body' })),
      { name: 'tail', geom: tail, pivot: [0, 0.13, -0.1], parent: 'body' },
    ],
  };
}

export function buildAgama(rng) {
  const gb = '#7b6c5a', gbD = '#4d4134', yel = '#cdb35e', bellyC = '#b9ab92';
  const bodyL = colorize(wobble(loft([
    { p: [0, 0.052, -0.11], r: [0.034, 0.024] }, { p: [0, 0.058, -0.075], r: [0.062, 0.034] }, { p: [0, 0.062, -0.005], r: [0.072, 0.037] },
    { p: [0, 0.062, 0.055], r: [0.058, 0.034] }, { p: [0, 0.066, 0.1], r: [0.036, 0.03] }], 10), 0.0045, 1),
  (c, n) => {
    if (n.y < -0.5) return bellyC;
    if (n.y > 0.5) { const band = Math.floor((c.z + 1) * 32) % 3; if (band === 0 && Math.abs(c.x) < 0.035) return yel; if (band === 1) return gbD; }
    if (Math.abs(n.x) > 0.6 && (h3(c.x * 800, c.y * 800, c.z * 800, 2) & 3) === 0) return '#b8a06a';
    return gb;
  }, rng, 0.08);
  const spikes = [];
  for (let i = 0; i < 18; i++) {
    const z = lerp(-0.09, 0.08, rng()), sd = rng.sign();
    const base = [sd * 0.058 * (1 - Math.abs(z) * 3), 0.07, z];
    spikes.push(paintG(stick(base, add3(base, [sd * 0.008, 0.009, -0.004]), 0.005, 0.0008, 3), '#8a7a62', rng, 0.08));
  }
  const body = merge([bodyL, ...spikes]);
  const headL = colorize(wobble(loft([
    { p: [0, 0.064, 0.09], r: [0.036, 0.029] }, { p: [0, 0.07, 0.125], r: [0.035, 0.027] }, { p: [0, 0.062, 0.158], r: [0.022, 0.018] },
    { p: [0, 0.056, 0.178], r: [0.011, 0.01] }], 8, { tipEnd: 0.005, capStart: false }), 0.0025, 2),
  (c, n) => n.y < -0.4 ? '#c9b98a' : (n.y > 0.5 ? '#6a5c4b' : gb), rng, 0.06);
  const tufts = [1, -1].flatMap(sd => [0, 1].map(j => paintG(stick([sd * 0.034, 0.072, 0.1 - j * 0.012], [sd * 0.046, 0.08, 0.097 - j * 0.012], 0.006, 0.001, 3), '#5c4f40', rng)));
  const head = merge([headL, ...tufts, ...eyes(0.03, 0.08, 0.135, 0.007, '#1a1208', rng)]);
  const legs = {};
  for (const [k, sd, fr] of [['legFL', 1, 1], ['legFR', -1, 1], ['legHL', 1, 0], ['legHR', -1, 0]]) {
    const x = sd * 0.05, z = fr ? 0.065 : -0.065;
    const pts = fr ? [[x, 0.055, z, 0.014], [sd * 0.09, 0.05, z + 0.01, 0.011], [sd * 0.1, 0.006, z + 0.025, 0.008]]
      : [[x, 0.055, z, 0.017], [sd * 0.1, 0.05, z - 0.015, 0.012], [sd * 0.115, 0.006, z - 0.035, 0.008]];
    const leg = loft(pts.map(([a, b, c, r]) => ({ p: [a, b, c], r })), 5, { up: [0, 1, 0] });
    const foot = pts[2].slice(0, 3);
    const toes = [-0.5, 0, 0.5].map(o => paintG(stick(foot, add3(foot, [sd * 0.012 + o * 0.01, -0.004, fr ? 0.02 : -0.02]), 0.004, 0.0015, 3), gbD, rng));
    legs[k] = { geom: merge([colorize(leg, () => gb, rng, 0.08), ...toes]), pivot: [x, 0.055, z] };
  }
  const tail = colorize(wobble(tube([[0, 0.052, -0.1], [0, 0.045, -0.18], [0.008, 0.03, -0.27], [0.02, 0.016, -0.33]], 12, u => [0.026 * (1 - u * 0.85), 0.02 * (1 - u * 0.8)], 6, { tipEnd: 0.01 }), 0.002, 3),
    (c, n, k, ud) => (Math.floor(k / (2 * ud.sides)) % 2) ? gbD : gb, rng, 0.07);
  return {
    height: 0.12, length: 0.5,
    parts: [
      { name: 'body', geom: body, pivot: [0, 0.06, 0] },
      { name: 'head', geom: head, pivot: [0, 0.066, 0.095], parent: 'body' },
      ...['legFL', 'legFR', 'legHL', 'legHR'].map(k => ({ name: k, geom: legs[k].geom, pivot: legs[k].pivot, parent: 'body' })),
      { name: 'tail', geom: tail, pivot: [0, 0.052, -0.1], parent: 'body' },
    ],
  };
}
