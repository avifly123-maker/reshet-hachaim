// Grove EXTRA animals: hoopoe, tortoise, chukar, geometry + animators (moved unchanged from grove-animals-extra.js).
// Exports buildHoopoe, buildTortoise, buildChukar, HOOPOE_ANIM, TORTOISE_ANIM, CHUKAR_ANIM, groundOrigin.
// Needs: kit.js.
import * as THREE from 'three';
import { clamp, lerp, damp, smoothstep } from '../../../core/util.js';
import { TAU, K, h3, wobble, _col, colorize, paintG, loft, tube, ell, stick, plate, mirrorX, merge, add3, eyes, pulser, quadAnim, birdAnim } from './kit.js';

function legLoft(pts, sides = 6) { return loft(pts.map(([x, y, z, r]) => ({ p: [x, y, z], r })), sides, { up: [0, 0, 1], tipEnd: 0.004 }); }

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

// ================================================================ EXTRA SPECIES
// Bird builder variant: like grove-animals' buildBird, plus optional separate legs (animated stride), merged tail,
// and extra parts (e.g. an erectile crest).
function buildBirdX(rng, P) {
  const tilt = P.tilt;
  const d = [0, -Math.cos(tilt), -Math.sin(tilt)], fwd = [0, -Math.sin(tilt), Math.cos(tilt)];
  const bodyParts = [colorize(wobble(loft(P.bodyRings, 10), P.wob || 0.003, 1), P.bodyCol, rng, 0.05), ...(P.bodyExtra ? P.bodyExtra(rng) : [])];
  const legGeo = {};
  for (const sd of [1, -1]) {
    const hip = [sd * P.hipX, P.hipY, P.hipZ]; const foot = add3(hip, d, P.legLen);
    const lp = [];
    if (P.thigh) lp.push(paintG(ell(P.thigh[0], P.thigh[1], P.thigh[0], ...add3(hip, d, P.legLen * 0.3), 6, 4), P.thighCol, rng));
    lp.push(colorize(loft([{ p: hip, r: P.legR * 1.4 }, { p: add3(hip, d, P.legLen * 0.5), r: P.legR }, { p: foot, r: P.legR * 0.9 }], 5, { up: [1, 0, 0] }), () => P.legCol, rng, 0.03));
    const toe = (dir, len) => colorize(stick(foot, add3(foot, dir, len), P.legR * 0.8, P.legR * 0.4), () => P.clawCol || P.legCol, rng, 0.03);
    const T = P.toe;
    lp.push(toe([fwd[0], fwd[1], fwd[2]], T), toe([sd * 0.55, fwd[1] * 0.8, fwd[2] * 0.8], T * 0.85), toe([-sd * 0.4, fwd[1] * 0.8, fwd[2] * 0.85], T * 0.85), toe([0, -fwd[1], -fwd[2]], T * 0.6));
    if (P.legsSeparate) legGeo[sd] = { geom: merge(lp), pivot: hip }; else bodyParts.push(...lp);
  }
  const tail = plate((u, v) => [(v - 0.5) * lerp(P.tail.w0, P.tail.w1, u), 0, -u * P.tail.len], 3, 4, 0.006, P.tail.col, rng, 0.04)
    .translate(...P.tail.pivot);
  if (P.tailMerged) bodyParts.push(P.tail.rot ? tail.translate(...P.tail.pivot.map(x => -x)).rotateX(P.tail.rot).translate(...P.tail.pivot) : tail);
  const body = merge(bodyParts);
  const hipWorldY = P.hipY * Math.cos(tilt) + P.hipZ * Math.sin(tilt);
  const perchOffset = -hipWorldY + P.legLen + P.legR;
  const wl = birdWing(P.wing, rng, 1), wr = birdWing(P.wing, rng, -1);
  const parts = [
    { name: 'body', geom: body, pivot: [0, 0, 0] },
    { name: 'head', geom: P.head(rng), pivot: P.headPivot, parent: 'body' },
    { name: 'wingL', geom: wl, pivot: [P.wing.pivot[0], P.wing.pivot[1], P.wing.pivot[2]], parent: 'body' },
    { name: 'wingR', geom: wr, pivot: [-P.wing.pivot[0], P.wing.pivot[1], P.wing.pivot[2]], parent: 'body' },
  ];
  if (!P.tailMerged) parts.push({ name: 'tail', geom: tail, pivot: P.tail.pivot, parent: 'body' });
  if (P.legsSeparate) parts.push({ name: 'legL', geom: legGeo[1].geom, pivot: legGeo[1].pivot, parent: 'body' }, { name: 'legR', geom: legGeo[-1].geom, pivot: legGeo[-1].pivot, parent: 'body' });
  for (const x of P.extraParts ? P.extraParts(rng) : []) parts.push(x);
  return { height: P.height, length: P.length, tilt, perchOffset, parts };
}

// ---------------------------------------------------------------- HOOPOE (דוכיפת)
// Pinkish-cinnamon body, zebra-barred black & white wings and back, white rump, black tail with a white band,
// long thin down-curved bill, erectile fan crest with black tips (separate part, fan spread via morph target).
export function buildHoopoe(rng) {
  const cin = '#d08a5c', cinL = '#e0a578', belly = '#efd6b8', blk = '#171313', wht = '#f4efe6';
  const crestFeathers = (rng) => {
    // feathers authored in a local frame (+Y = feather length), coloured, then laid along the crown midline.
    const N = 9, low = [], high = [];
    for (let i = 0; i < N; i++) {
      const f = i / (N - 1);
      const L = 0.05 + 0.022 * Math.sin(f * Math.PI) + (rng() - 0.5) * 0.004;
      const g = new THREE.SphereGeometry(1, 6, 5).scale(0.0115, L / 2, 0.0035).translate(0, L / 2, 0);
      const cg = colorize(g, (c) => c.y > L * 0.84 ? blk : (c.y > L * 0.7 ? wht : (c.y > L * 0.25 ? cinL : cin)), rng, 0.04, 0);
      const root = [0, 0.074 + 0.008 * Math.sin(f * Math.PI), 0.128 - f * 0.06];
      const aLow = -1.38 - f * 0.12, aHigh = lerp(0.55, -1.45, f);
      low.push(cg.clone().rotateX(aLow).translate(...root));
      high.push(cg.clone().rotateX(aHigh).translate(...root));
    }
    const geom = merge(low); const hi = merge(high);
    geom.morphAttributes.position = [new THREE.Float32BufferAttribute(hi.attributes.position.array, 3)];
    return [{ name: 'crest', geom, pivot: [0, 0.075, 0.1], parent: 'head' }];
  };
  return buildBirdX(rng, {
    tilt: 0.3, height: 0.36, length: 0.5, wob: 0.0025,
    bodyRings: [{ p: [0, 0, -0.12], r: [0.034, 0.034] }, { p: [0, 0, -0.08], r: [0.06, 0.058] }, { p: [0, 0, -0.01], r: [0.068, 0.07] },
      { p: [0, 0.008, 0.05], r: [0.06, 0.064] }, { p: [0, 0.026, 0.095], r: [0.038, 0.042] }],
    bodyCol: (c, n, k) => {
      if (c.z < -0.085 && n.y > -0.1) return wht;                                       // white rump
      if (c.z < -0.025 && n.y > 0.35) return (Math.floor((c.z + 0.3) * 70) % 2) ? blk : wht; // barred lower back
      if (n.y < -0.35) return belly;
      return n.y > 0.6 ? cin : cinL;
    },
    hipX: 0.024, hipY: -0.05, hipZ: 0.0, legLen: 0.06, legR: 0.0055, toe: 0.026, legCol: '#4b4446',
    headPivot: [0, 0.035, 0.09],
    head: (rng) => {
      const h = colorize(wobble(loft([{ p: [0, 0.03, 0.07], r: [0.039, 0.043] }, { p: [0, 0.047, 0.105], r: [0.04, 0.041] }, { p: [0, 0.043, 0.134], r: [0.025, 0.025] }], 8, { tipEnd: 0.008 }), 0.0025, 2),
        (c, n) => n.y < -0.4 ? belly : (n.y > 0.5 ? cin : cinL), rng, 0.04);
      const bill = colorize(tube([[0, 0.042, 0.13], [0, 0.038, 0.17], [0, 0.026, 0.21], [0, 0.006, 0.245]], 6, (t) => lerp(0.0085, 0.0017, t), 5, { tipEnd: 0.004 }),
        (c) => c.z < 0.15 ? '#5a4a46' : '#1d1a1a', rng, 0.03);
      return merge([h, bill, ...eyes(0.031, 0.054, 0.114, 0.0095, '#120c08', rng)]);
    },
    extraParts: crestFeathers,
    wing: {
      pivot: [0.06, -0.035, 0.05], span: 0.25, chord: 0.13, tipStart: 0.72, sweep: 0.12, scallop: 0.12, feathers: 5, camber: 0.1,
      col: (u, v, top) => {
        if (u < 0.1) return top ? cin : belly;
        if (u > 0.88) return blk;
        if (u > 0.68) return (u > 0.75 && u < 0.82) ? wht : blk;                       // white band across the primaries
        return (Math.floor(u * 11) % 2) ? wht : blk;                          // zebra bars
      },
    },
    tail: { pivot: [0, 0.008, -0.11], len: 0.15, w0: 0.04, w1: 0.068, col: (u, v, top) => (u > 0.45 && u < 0.62) ? wht : blk },
  });
}

// ---------------------------------------------------------------- TORTOISE (צב יבשה מצוי)
// High-domed shell with scutes painted by vertex colour (vertebral / costal / marginal rows: dark rims, golden areolae),
// pale plastron, scaly stumpy legs, small head on a neck that withdraws under the shell when sleeping.
export function buildTortoise(rng) {
  const RX = 0.17, RY = 0.16, RZ = 0.225, Y0 = 0.075;
  const gold = '#c7a453', goldL = '#d8bb6c', dark = '#4b3820', mid = '#8a6a33';
  // dome: upper part of an ellipsoid, slightly flared rim and gently pinched waist
  const g = new THREE.SphereGeometry(1, 36, 16, 0, TAU, 0, Math.PI * 0.56);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const rim = smoothstep(0.35, -0.05, y);                       // flare outward near the rim
    const s = 1 + rim * 0.07 + (z < 0 ? 0.04 * rim : 0);          // rear marginals flare a touch more
    x *= s; z *= s;
    y = y * (1 - 0.08 * (1 - Math.abs(z)));                        // slightly flattened top
    p.setXYZ(i, x * RX, Y0 + y * RY, z * RZ);
  }
  const scute = (c) => {
    const qx = c.x / (RX * 1.07), qy = (c.y - Y0) / RY, qz = c.z / (RZ * 1.07);
    const el = Math.asin(clamp(qy, -1, 1));                      // 0 at rim … π/2 at top
    const az = Math.atan2(qx, qz);                                 // around the vertical axis
    let cellU, cellV, id;
    if (el < 0.3) {                                                // marginals (24 around the rim)
      const a = (az / TAU + 1) * 24; cellU = a - Math.floor(a); cellV = clamp(el / 0.3); id = Math.floor(a);
    } else if (Math.abs(qx) < 0.3 * Math.cos(el * 0.3) && el > 0.55) { // vertebrals (5 along the midline)
      const w = (qz * 0.5 + 0.5) * 5; cellU = w - Math.floor(w); cellV = (qx / 0.3) * 0.5 + 0.5; id = 100 + Math.floor(w);
    } else {                                                       // costals (4 per side)
      const w = (qz * 0.5 + 0.5) * 4; cellU = w - Math.floor(w); cellV = clamp((el - 0.3) / 0.9); id = (qx > 0 ? 200 : 300) + Math.floor(w);
    }
    const edge = Math.max(Math.abs(cellU - 0.5), Math.abs(cellV - 0.5)) * 2; // 0 centre … 1 border
    const h = (h3(id, 7, 3, 5) & 255) / 255;
    const base = _col.copy(K(gold)).lerp(K(goldL), h * 0.7);
    if (edge > 0.74) return base.lerp(K(dark), 0.9).clone();
    if (edge > 0.5) return base.lerp(K(mid), (edge - 0.5) / 0.24).clone();
    if (edge < 0.22) return base.lerp(K(mid), 0.55).clone();       // darker areola blotch
    return base.clone();
  };
  const shell = colorize(g, scute, rng, 0.04, 0.06);
  const plastron = colorize(ell(RX * 0.93, 0.03, RZ * 0.95, 0, Y0 - 0.002, 0.004, 14, 6), (c, n) => n.y > 0.3 ? '#6b5a3c' : '#d2be86', rng, 0.05);
  const skin = '#8b7a5c', skinD = '#6c5d44', skinL = '#a59273';
  const tail = colorize(loft([{ p: [0, 0.07, -0.2], r: 0.02 }, { p: [0, 0.055, -0.25], r: 0.008 }], 5, { tipEnd: 0.012 }), () => skinD, rng, 0.04);
  const body = merge([shell, plastron, tail]);
  // head + neck (one part, pivot deep under the shell so it can slide back)
  const headL = colorize(wobble(loft([
    { p: [0, 0.088, 0.13], r: [0.034, 0.032] }, { p: [0, 0.098, 0.2], r: [0.032, 0.03] }, { p: [0, 0.112, 0.25], r: [0.04, 0.037] },
    { p: [0, 0.115, 0.285], r: [0.036, 0.032] }, { p: [0, 0.108, 0.31], r: [0.022, 0.02] }], 8, { tipEnd: 0.008, capStart: false }), 0.002, 2),
  (c, n) => {
    if (c.z > 0.303 && n.y < 0.2) return '#3a3026';                 // horny beak edge
    if (c.z > 0.23 && n.y > 0.45) return skinD;                     // head scutes
    if (n.y < -0.3) return skinL;
    return skin;
  }, rng, 0.05);
  const head = merge([headL, ...eyes(0.028, 0.124, 0.285, 0.0075, '#120c08', rng)]);
  // legs: stumpy columns, front legs wider and covered in big pale scales
  const legs = {};
  for (const [k, sd, fr] of [['legFL', 1, 1], ['legFR', -1, 1], ['legHL', 1, 0], ['legHR', -1, 0]]) {
    const x = sd * 0.115, z = fr ? 0.13 : -0.13;
    const pts = fr ? [[x, 0.1, z, [0.04, 0.034]], [x + sd * 0.025, 0.05, z + 0.02, [0.034, 0.028]], [x + sd * 0.035, 0.012, z + 0.03, [0.034, 0.03]]]
      : [[x, 0.1, z, [0.045, 0.04]], [x + sd * 0.025, 0.05, z - 0.01, [0.038, 0.034]], [x + sd * 0.03, 0.012, z - 0.012, [0.036, 0.034]]];
    const geom = colorize(wobble(legLoft(pts, 7), 0.003, 5 + sd), (c, n, i) => (h3(i, 3, sd, 9) & 3) === 0 ? skinL : (c.y < 0.02 ? '#4d4232' : skin), rng, 0.05);
    legs[k] = { geom, pivot: [x, 0.1, z] };
  }
  return {
    height: 0.27, length: 0.55,
    parts: [
      { name: 'body', geom: body, pivot: [0, 0.1, 0] },
      { name: 'head', geom: head, pivot: [0, 0.09, 0.13], parent: 'body' },
      ...['legFL', 'legFR', 'legHL', 'legHR'].map(k => ({ name: k, geom: legs[k].geom, pivot: legs[k].pivot, parent: 'body' })),
    ],
  };
}

// ---------------------------------------------------------------- CHUKAR (חוגלת סלעים)
// Plump grey-sand partridge: blue-grey breast, buff belly, black-white-chestnut barred flanks, cream throat framed by a
// black band through the eye that forms a necklace, coral-red bill, red eye-ring and red legs. Legs animated separately.
export function buildChukar(rng) {
  const back = '#b09d82', backD = '#9c8a70', breast = '#a2a5ab', buff = '#d9bf98', cream = '#f1e7d3', blk = '#1b1817', red = '#d23f30';
  return buildBirdX(rng, {
    tilt: 0.12, height: 0.36, length: 0.5, wob: 0.003, legsSeparate: true, tailMerged: true,
    bodyRings: [{ p: [0, 0.0, -0.15], r: [0.04, 0.036] }, { p: [0, 0, -0.105], r: [0.085, 0.08] }, { p: [0, 0, -0.025], r: [0.102, 0.1] },
      { p: [0, 0.012, 0.055], r: [0.09, 0.094] }, { p: [0, 0.035, 0.105], r: [0.05, 0.055] }],
    bodyCol: (c, n) => {
      if (Math.abs(n.x) > 0.6 && n.y < 0.3 && n.y > -0.5 && c.z > -0.1 && c.z < 0.05) return '#c9b8a0';   // flank ground (bars added below)
      if (n.y < -0.4) return buff;
      if (c.z > 0.03 && n.y < 0.55) return breast;
      return n.y > 0.75 ? backD : back;
    },
    bodyExtra: (rng) => {                                          // bold black / chestnut bars on the flanks
      const out = [];
      for (const sd of [1, -1]) for (let j = 0; j < 7; j++) {
        const z = -0.085 + j * 0.02, x = sd * (0.094 - Math.abs(z + 0.02) * 0.12);
        const g = ell(0.006, 0.038, 0.0095, 0, 0, 0, 6, 5).rotateX(-0.25).rotateZ(sd * 0.32).translate(x, -0.012, z);
        out.push(colorize(g, () => (j % 2 ? '#a5603a' : blk), rng, 0.03, 0));
      }
      return out;
    },
    hipX: 0.035, hipY: -0.06, hipZ: -0.005, legLen: 0.085, legR: 0.0075, toe: 0.032, legCol: red, clawCol: '#b5372b',
    headPivot: [0, 0.04, 0.1],
    head: (rng) => {
      const h = colorize(wobble(loft([{ p: [0, 0.035, 0.085], r: [0.042, 0.046] }, { p: [0, 0.058, 0.125], r: [0.042, 0.042] }, { p: [0, 0.058, 0.155], r: [0.027, 0.027] }], 8, { tipEnd: 0.008 }), 0.0025, 2),
        (c, n) => (n.y < -0.15 && c.z > 0.1) ? cream : (n.y > 0.55 ? '#9d9590' : (c.z > 0.14 && n.y < 0.3 ? cream : '#b3aca5')), rng, 0.04);
      const bands = [];
      for (const sd of [1, -1]) {                                   // black stripe: bill base → through the eye → down the neck
        bands.push(colorize(tube([[sd * 0.014, 0.066, 0.153], [sd * 0.029, 0.068, 0.138], [sd * 0.04, 0.058, 0.118], [sd * 0.044, 0.036, 0.1], [sd * 0.036, 0.015, 0.108]], 8, (t) => 0.0062 - t * 0.0012, 4), () => blk, null, 0, 0));
      }
      const neck = [];                                              // necklace across the throat
      for (let i = 0; i <= 8; i++) { const a = (i / 8 - 0.5) * 2.0; neck.push([Math.sin(a) * 0.036, 0.012 - 0.004 * Math.cos(a), 0.112 + Math.cos(a) * 0.025]); }
      bands.push(colorize(tube(neck, 10, () => 0.0058, 4), () => blk, null, 0, 0));
      const bill = colorize(loft([{ p: [0, 0.058, 0.155], r: [0.0115, 0.0125] }, { p: [0, 0.051, 0.178], r: [0.005, 0.005] }], 5, { tipEnd: 0.006 }), () => red, rng, 0.03);
      return merge([h, ...bands, bill, ...eyes(0.031, 0.067, 0.136, 0.0105, '#d6513a', rng, false), ...eyes(0.0365, 0.0675, 0.139, 0.0068, '#1a0c06', rng)]);
    },
    wing: {
      pivot: [0.097, -0.035, 0.045], span: 0.2, chord: 0.125, tipStart: 0.62, sweep: 0.14, scallop: 0.12, feathers: 5, camber: 0.12,
      col: (u, v, top) => top ? (u > 0.62 ? (v > 0.55 ? '#958670' : '#a3937c') : (v > 0.75 ? '#a08f78' : back)) : (u > 0.6 ? '#c6b9a6' : '#ddd2c2'),
    },
    tail: { pivot: [0, 0.012, -0.135], len: 0.085, w0: 0.045, w1: 0.075, rot: -0.12, col: (u, v, top) => (Math.abs(v - 0.5) > 0.25 ? '#b0653c' : back) },
  });
}

// ---------------------------------------------------------------- animators
const HOOPOE_BASE = birdAnim({ flapHz: 3.2, flapAmp: 1.0, flapBias: 0.12, upFold: 0.35, bodyBob: 0.025, burstCycle: 1.1, burstFrac: 0.55, hopH: 0.012, hopHz: 3.4, flick: 0.35, flickGap: [2, 5], sweep: 0.1, lookYaw: 0.9, sleepHeadY: 2.5, sleepTuck: 0.02, foldScale: 0.85 });
export function HOOPOE_ANIM(n, spec, rng, inst) {
  const base = HOOPOE_BASE(n, spec, rng, inst);
  const st = { raise: 0, t: 0 };
  return (dt, s) => {
    base(dt, s);
    const a = s.action || 'perch'; st.t += dt;
    // crest: lies flat most of the time; fans open now and then while idle, on landing/take-off and while probing
    const idle = a === 'idle' || a === 'perch';
    const p = pulser(st, 'cr', rng, dt, 2.5, 6, 1.8);
    if (st.prevA !== a) { st.flash = 1.1; st.prevA = a; }
    st.flash = Math.max(0, (st.flash || 0) - dt);
    let tgt = idle ? p : 0;
    if (a === 'eat') tgt = 0.35 * Math.max(0, Math.sin(st.t * 1.3));
    if (a !== 'sleep' && st.flash > 0) tgt = Math.max(tgt, Math.min(1, st.flash * 2));
    if (a === 'fly' || a === 'glide') tgt = Math.max(tgt, 0.15);
    st.raise = damp(st.raise, tgt, tgt > st.raise ? 9 : 3, dt);
    n.crestMesh.morphTargetInfluences[0] = st.raise;
    n.crest.rotation.x = -0.06 * st.raise * Math.sin(st.t * 9) * (idle ? 1 : 0);
    // probing: deeper, slower jabs of the long bill into the soil
    if (a === 'eat') n.head.rotation.x += 0.25 * Math.max(0, Math.sin(st.t * 3.2)) ** 2;
  };
}

export const TORTOISE_ANIM = quadAnim({
  walkSpeed: 0.1, runSpeed: 0.22, walkStride: 0.16, runStride: 0.2, walkAmp: 0.45, runAmp: 0.55, lift: 0.12, hindAmp: 0.9,
  runOff: [Math.PI * 0.5, Math.PI * 1.5, 0, Math.PI], walkBob: 0.006, runLift: 0.0, runPitch: 0.0, roll: 0.035, yawSway: 0.02,
  foldF: 0.0, foldH: 0.0, sleepDrop: 0.038, sleepShrink: 0.55, sleepHead: 0.0, sleepYaw: 0,
  eatHead: 0.55, eatPitch: 0.04, eatDrop: 0.005, lookYaw: 0.55, lookPitch: 0.15, nod: 0.06,
  extra(n, st, s, dt, w) {
    // withdraw head under the shell when sleeping (and briefly flinch when starting to run)
    const B = n.head.userData.base;
    const pull = Math.max(w.ws, 0);
    n.head.position.z = B.z - pull * 0.115 + w.we * 0.012 + w.wm * 0.01 * Math.sin(st.ph * 2);
    n.head.position.y = B.y - pull * 0.012;
    const sc = 1 - pull * 0.25; n.head.scale.set(sc, sc, sc);
    n.head.rotation.x *= 1 - pull; n.head.rotation.y *= 1 - pull;
    for (const k of ['legFL', 'legFR', 'legHL', 'legHR']) n[k].rotation.z = (k[4] === 'L' ? -1 : 1) * pull * 0.35;
    // slow chewing bites when eating
    if (w.we > 0.1) n.head.rotation.x += Math.max(0, Math.sin(w.t * 2.2)) * 0.12 * w.we;
  },
});

const CHUKAR_BASE = birdAnim({ flapHz: 9, flapAmp: 0.9, flapBias: 0.12, upFold: 0.25, bodyBob: 0.02, burstCycle: 1.2, burstFrac: 0.55, hopH: 0.0, hopHz: 3, flick: 0.2, flickGap: [3, 7], sweep: 0.15, lookYaw: 0.8, sleepHeadY: 2.6, sleepTuck: 0.03 });
export function CHUKAR_ANIM(n, spec, rng, inst) {
  const base = CHUKAR_BASE(n, spec, rng, inst);
  const st = { ph: rng() * TAU, w: 0, run: 0, tuck: 0 };
  return (dt, s) => {
    base(dt, s);
    const a = s.action || 'idle';
    const moving = a === 'walk' || a === 'run';
    const flying = a === 'fly' || a === 'glide' || a === 'hover';
    let spd = s.speed || 0; if (moving && spd < 0.05) spd = a === 'run' ? 2.2 : 0.45;
    st.w = damp(st.w, moving ? 1 : 0, 8, dt);
    st.run = damp(st.run, a === 'run' ? 1 : 0, 5, dt);
    st.tuck = damp(st.tuck, flying ? 1 : (a === 'sleep' ? 0.6 : 0), 5, dt);
    const stride = lerp(0.12, 0.3, st.run);
    if (moving) st.ph += dt * Math.min(spd, 3) / stride * TAU;
    const amp = lerp(0.55, 0.9, st.run) * st.w;
    const sw = Math.sin(st.ph);
    n.legL.rotation.x = -amp * sw + st.tuck * 1.1;
    n.legR.rotation.x = amp * sw + st.tuck * 1.1;
    n.legL.scale.y = 1 - 0.18 * Math.max(0, Math.cos(st.ph)) * st.w - st.tuck * 0.35;
    n.legR.scale.y = 1 - 0.18 * Math.max(0, -Math.cos(st.ph)) * st.w - st.tuck * 0.35;
    // body bob & forward lean while running; sitting low when sleeping
    n.rig.position.y += st.w * Math.abs(Math.sin(st.ph)) * lerp(0.01, 0.025, st.run) - (a === 'sleep' ? 0.05 : 0) * (1 - st.tuck * 0.3);
    n.rig.rotation.x += st.run * 0.18 * st.w;
    n.head.rotation.x += st.w * (1 - st.run) * 0.12 * Math.sin(st.ph * 2);   // pigeon-like nod while walking
  };
}

// chukar is a 'ground' species: the core puts the origin on the ground, so lift the bird (built body-centred) onto its feet.
export function groundOrigin(v) {
  const outer = new THREE.Group(); outer.name = v.object.name;
  v.object.position.y = v.perchOffset; outer.add(v.object);
  return { ...v, object: outer, perchOffset: 0, dispose() { outer.removeFromParent(); v.dispose(); } };
}
