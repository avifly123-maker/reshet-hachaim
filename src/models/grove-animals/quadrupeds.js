// Grove animals: geometry of the mammals (moved unchanged from grove-animals.js).
// Exports buildGazelle, buildFox, buildPorcupine, buildHedgehog, buildHyrax, buildSpinyMouse (each build(rng) returns
// the parts of one variant); legLoft is a local helper. Needs: kit.js.
import * as THREE from 'three';
import { lerp, smoothstep } from '../../core/util.js';
import { V3, h3, wobble, colorize, paintG, loft, tube, ell, merge, add3, eyes, earGeom } from './kit.js';

// ---------------------------------------------------------------- QUADRUPEDS
// Leg loft: points in model coordinates (from hip/shoulder down to hoof/paw)
function legLoft(pts, sides = 6) { return loft(pts.map(([x, y, z, r]) => ({ p: [x, y, z], r })), sides, { up: [0, 0, 1], tipEnd: 0.004 }); }

export function buildGazelle(rng) {
  const back = '#9a683b', backD = '#865a31', stripe = '#3b2416', belly = '#f3ede3', fawnL = '#b98d62';
  const bodyRings = [
    { p: [0, 0.9, -0.6], r: [0.07, 0.08] }, { p: [0, 0.9, -0.52], r: [0.13, 0.15] }, { p: [0, 0.9, -0.36], r: [0.155, 0.175] },
    { p: [0, 0.885, -0.15], r: [0.15, 0.165] }, { p: [0, 0.885, 0.07], r: [0.148, 0.172] }, { p: [0, 0.9, 0.25], r: [0.15, 0.195] },
    { p: [0, 0.94, 0.38], r: [0.12, 0.17] }, { p: [0, 0.99, 0.45], r: [0.085, 0.12] }];
  const body = colorize(wobble(loft(bodyRings, 10), 0.008, 1), (c, n) => {
    if (n.y < -0.72) return belly;
    if (c.z < -0.5 && n.y < 0.6 && Math.abs(n.x) < 0.75) return '#f0e8db';      // white rump
    if (n.y < 0.12 && n.y > -0.72) return (c.z > -0.42 && c.z < 0.3) ? stripe : belly; // dark flank stripe
    if (c.z > 0.33 && n.y < 0.25 && n.z > 0.1) return '#e8ddcc';
    return n.y > 0.85 ? backD : back;
  }, rng, 0.05);
  const neck = colorize(wobble(loft([
    { p: [0, 0.94, 0.37], r: [0.085, 0.12] }, { p: [0, 1.08, 0.46], r: [0.068, 0.092] }, { p: [0, 1.24, 0.54], r: [0.058, 0.074] },
    { p: [0, 1.38, 0.6], r: [0.055, 0.062] }], 8, { capStart: false }), 0.005, 2),
  (c, n) => (n.z > 0.45 && n.y < 0.2) ? '#efe6d8' : (n.y > 0.5 && n.z < 0 ? backD : back), rng, 0.05);
  // head: skull→muzzle
  const headLoft = colorize(wobble(loft([
    { p: [0, 1.4, 0.56], r: [0.06, 0.066] }, { p: [0, 1.415, 0.615], r: [0.07, 0.074] }, { p: [0, 1.38, 0.71], r: [0.054, 0.058] },
    { p: [0, 1.33, 0.8], r: [0.038, 0.042] }, { p: [0, 1.305, 0.855], r: [0.029, 0.03] }], 8, { tipEnd: 0.018 }), 0.004, 3),
  (c, n) => {
    if (c.z > 0.865) return '#241a14';
    if (n.y < -0.55) return '#efe7da';
    if (n.y > 0.6 && c.z > 0.62) return '#4f3322';           // dark nose bridge
    if (Math.abs(n.x) > 0.35 && c.z > 0.6) return n.y > -0.05 ? '#f2ebe0' : '#5d3d28'; // white face stripe over dark cheek stripe
    return back;
  }, rng, 0.04);
  // ringed, backward-curving horns
  const horns = [];
  for (const sd of [1, -1]) {
    horns.push(colorize(tube([[sd * 0.03, 1.44, 0.6], [sd * 0.045, 1.56, 0.575], [sd * 0.058, 1.67, 0.52], [sd * 0.062, 1.75, 0.45], [sd * 0.058, 1.8, 0.42]], 10,
      u => 0.022 * (1 - u * 0.85), 5, { tipEnd: 0.012 }), (c, n, k, ud) => {
      const seg = Math.floor(k / (2 * ud.sides)); if (seg >= ud.segs || seg > 7) return '#1d1611';
      return seg % 2 ? '#2c2219' : '#5a4835';
    }, rng, 0.03));
  }
  const head = merge([headLoft, ...horns, ...eyes(0.064, 1.418, 0.655, 0.02, '#0e0906', rng)]);
  const ears = {};
  for (const [k, sd] of [['earL', 1], ['earR', -1]]) {
    ears[k] = earGeom({ w: 0.04, h: 0.075, d: 0.012, pinch: 0.55, out: 0.85, back: 0.35, outer: back, inner: '#eadccb', tip: '#3a281c', tipFrom: 0.85, side: sd, rng })
      .translate(sd * 0.05, 1.45, 0.58);
  }
  const legCol = (c) => c.y < 0.035 ? '#17110d' : (c.y < 0.5 ? fawnL : back);
  const legs = {};
  for (const [k, sd, fr] of [['legFL', 1, 1], ['legFR', -1, 1], ['legHL', 1, 0], ['legHR', -1, 0]]) {
    const x = sd * 0.085;
    const pts = fr ? [[x, 0.94, 0.28, [0.06, 0.08]], [x, 0.72, 0.29, [0.045, 0.06]], [x, 0.46, 0.3, [0.026, 0.03]], [x, 0.4, 0.3, [0.03, 0.032]], [x, 0.06, 0.31, [0.018, 0.02]], [x, 0.025, 0.325, [0.022, 0.026]]]
      : [[x, 0.96, -0.38, [0.075, 0.11]], [x, 0.72, -0.44, [0.055, 0.085]], [x, 0.47, -0.5, [0.026, 0.04]], [x, 0.4, -0.47, [0.022, 0.028]], [x, 0.06, -0.42, [0.018, 0.02]], [x, 0.025, -0.405, [0.022, 0.026]]];
    legs[k] = { geom: colorize(wobble(legLoft(pts, 6), 0.003, 4 + sd), legCol, rng, 0.05), pivot: [x, fr ? 0.88 : 0.9, fr ? 0.28 : -0.38] };
  }
  const tail = colorize(loft([{ p: [0, 0.94, -0.6], r: 0.028 }, { p: [0, 0.87, -0.68], r: 0.026 }, { p: [0, 0.8, -0.71], r: 0.02 }], 5, { tipEnd: 0.03 }),
    (c) => c.y < 0.85 ? '#1b1410' : '#6a4a30', rng, 0.04);
  return {
    height: 1.8, length: 1.5,
    parts: [
      { name: 'body', geom: body, pivot: [0, 0.9, 0] },
      { name: 'neck', geom: neck, pivot: [0, 0.97, 0.4], parent: 'body' },
      { name: 'head', geom: head, pivot: [0, 1.38, 0.6], parent: 'neck' },
      { name: 'earL', geom: ears.earL, pivot: [0.05, 1.45, 0.58], parent: 'head' },
      { name: 'earR', geom: ears.earR, pivot: [-0.05, 1.45, 0.58], parent: 'head' },
      ...['legFL', 'legFR', 'legHL', 'legHR'].map(k => ({ name: k, geom: legs[k].geom, pivot: legs[k].pivot, parent: 'body' })),
      { name: 'tail', geom: tail, pivot: [0, 0.94, -0.6], parent: 'body' },
    ],
  };
}

export function buildFox(rng) {
  const red = '#b0673a', redD = '#9a5530', grey = '#9c7a64', pale = '#e6ddd0', white = '#f2ede5', black = '#211915';
  const body = colorize(wobble(loft([
    { p: [0, 0.41, -0.35], r: [0.06, 0.07] }, { p: [0, 0.42, -0.29], r: [0.11, 0.12] }, { p: [0, 0.42, -0.12], r: [0.12, 0.128] },
    { p: [0, 0.41, 0.06], r: [0.112, 0.122] }, { p: [0, 0.43, 0.22], r: [0.118, 0.138] }, { p: [0, 0.47, 0.31], r: [0.09, 0.11] }], 10), 0.006, 1),
  (c, n) => {
    if (c.z > 0.2 && n.z > 0.15 && n.y < 0.35) return white;
    if (n.y < -0.5) return pale;
    if (n.y < -0.1) return grey;
    return n.y > 0.85 ? redD : red;
  }, rng, 0.06);
  const headL = colorize(wobble(loft([
    { p: [0, 0.46, 0.27], r: [0.085, 0.1] }, { p: [0, 0.53, 0.37], r: [0.088, 0.088] }, { p: [0, 0.565, 0.43], r: [0.1, 0.085] },
    { p: [0, 0.555, 0.49], r: [0.088, 0.075] }, { p: [0, 0.525, 0.565], r: [0.046, 0.042] }, { p: [0, 0.505, 0.635], r: [0.024, 0.024] }], 9, { tipEnd: 0.022, capStart: false }), 0.005, 2),
  (c, n) => {
    if (c.z > 0.645) return '#151010';
    if (c.z > 0.36 && n.y < -0.15) return white;                       // white jaw / cheeks
    if (c.z > 0.5 && Math.abs(n.x) > 0.5 && n.y < 0.15) return white;
    if (c.z < 0.36 && n.z > 0.2 && n.y < 0.2) return white;
    return n.y > 0.7 ? redD : red;
  }, rng, 0.05);
  const head = merge([headL, ...eyes(0.056, 0.578, 0.505, 0.016, '#3a2208', rng)]);
  const ears = {};
  for (const [k, sd] of [['earL', 1], ['earR', -1]]) ears[k] = earGeom({ w: 0.045, h: 0.07, d: 0.016, pinch: 0.85, out: 0.32, back: 0.15, outer: black, inner: '#efe2d2', side: sd, rng }).translate(sd * 0.058, 0.615, 0.425);
  const legs = {};
  for (const [k, sd, fr] of [['legFL', 1, 1], ['legFR', -1, 1], ['legHL', 1, 0], ['legHR', -1, 0]]) {
    const x = sd * 0.07;
    const pts = fr ? [[x, 0.44, 0.22, [0.05, 0.06]], [x, 0.3, 0.225, [0.036, 0.04]], [x, 0.16, 0.23, [0.026, 0.03]], [x, 0.03, 0.235, [0.024, 0.026]], [x, 0.012, 0.26, [0.026, 0.03]]]
      : [[x, 0.45, -0.23, [0.065, 0.085]], [x, 0.3, -0.27, [0.045, 0.06]], [x, 0.17, -0.3, [0.025, 0.03]], [x, 0.03, -0.27, [0.024, 0.026]], [x, 0.012, -0.245, [0.026, 0.03]]];
    legs[k] = { geom: colorize(wobble(legLoft(pts, 6), 0.003, 5), (c) => c.y < 0.25 ? black : (c.y < 0.33 ? '#5a3524' : redD), rng, 0.05), pivot: [x, fr ? 0.4 : 0.42, fr ? 0.22 : -0.23] };
  }
  const tail = colorize(wobble(loft([
    { p: [0, 0.43, -0.33], r: 0.035 }, { p: [0, 0.4, -0.43], r: [0.07, 0.075] }, { p: [0, 0.35, -0.57], r: [0.092, 0.095] },
    { p: [0, 0.3, -0.71], r: [0.085, 0.088] }, { p: [0, 0.27, -0.8], r: [0.055, 0.058] }], 8, { tipEnd: 0.05 }), 0.008, 6),
  (c, n) => c.z < -0.765 ? white : (n.y > 0.6 ? '#7a4f36' : (n.y < -0.4 ? '#b89a80' : '#a2694a')), rng, 0.06);
  return {
    height: 0.68, length: 1.15,
    parts: [
      { name: 'body', geom: body, pivot: [0, 0.42, 0] },
      { name: 'head', geom: head, pivot: [0, 0.47, 0.3], parent: 'body' },
      { name: 'earL', geom: ears.earL, pivot: [0.058, 0.615, 0.425], parent: 'head' },
      { name: 'earR', geom: ears.earR, pivot: [-0.058, 0.615, 0.425], parent: 'head' },
      ...['legFL', 'legFR', 'legHL', 'legHR'].map(k => ({ name: k, geom: legs[k].geom, pivot: legs[k].pivot, parent: 'body' })),
      { name: 'tail', geom: tail, pivot: [0, 0.43, -0.33], parent: 'body' },
    ],
  };
}

export function buildPorcupine(rng) {
  const dark = '#2a2421', darker = '#1d1916';
  const prof = [[-0.36, 0.22, 0.1, 0.08], [-0.28, 0.25, 0.2, 0.18], [-0.1, 0.26, 0.22, 0.2], [0.1, 0.25, 0.2, 0.18], [0.22, 0.24, 0.15, 0.14], [0.3, 0.24, 0.1, 0.1]];
  const body = colorize(wobble(loft(prof.map(([z, y, rx, ry]) => ({ p: [0, y, z], r: [rx, ry] })), 9), 0.01, 1), (c, n) => n.y < -0.4 ? '#3a302a' : dark, rng, 0.08);
  const headL = colorize(wobble(loft([
    { p: [0, 0.245, 0.26], r: [0.09, 0.095] }, { p: [0, 0.24, 0.36], r: [0.085, 0.08] }, { p: [0, 0.22, 0.44], r: [0.058, 0.055] },
    { p: [0, 0.205, 0.49], r: [0.034, 0.034] }], 8, { tipEnd: 0.015, capStart: false }), 0.006, 2),
  (c) => c.z > 0.485 ? '#4a3632' : darker, rng, 0.06);
  const earsG = [1, -1].map(sd => paintG(ell(0.022, 0.018, 0.01, sd * 0.06, 0.3, 0.36), '#3a2e29', rng));
  const head = merge([headL, ...earsG, ...eyes(0.05, 0.265, 0.42, 0.012, '#050403', rng)]);
  // quills: lowered + raised (morph target)
  const low = [], high = [];
  const profAt = (z) => { for (let i = 0; i < prof.length - 1; i++) { const A = prof[i], B = prof[i + 1]; if (z >= A[0] && z <= B[0]) { const f = (z - A[0]) / (B[0] - A[0]); return [lerp(A[1], B[1], f), lerp(A[2], B[2], f), lerp(A[3], B[3], f)]; } } return [0.24, 0.1, 0.1]; };
  const segCols = ['#1a1614', '#f2ede4', '#191513', '#f4efe6'];
  const quill = (base, dir, len, r) => loft([0, 0.35, 0.6, 0.86].map((f, i) => ({ p: add3(base, dir, len * f), r: r * (1 - f * 0.75) })), 3, { capStart: false, tipEnd: len * 0.14 });
  const qcol = (c, n, k) => segCols[Math.min(3, Math.floor(k / 6))];
  const NQ = 50;
  for (let i = 0; i < NQ; i++) {
    const z = lerp(-0.34, 0.24, (i + rng()) / NQ) ;
    const ang = (rng() * 2 - 1) * (z > 0.15 ? 0.5 : 1.25);
    const [yc, rx, ry] = profAt(z);
    const base = [Math.sin(ang) * rx * 0.92, yc + Math.cos(ang) * ry * 0.9, z];
    const nrm = new V3(Math.sin(ang), Math.cos(ang), 0);
    const rear = smoothstep(0.25, -0.2, z);
    const len = (0.13 + 0.26 * rear) * (1 - 0.3 * Math.abs(ang)) * (0.85 + rng() * 0.3);
    const dl = nrm.clone().multiplyScalar(0.38).add(new V3(0, 0.12, -1)).normalize();
    const dh = nrm.clone().multiplyScalar(1.0).add(new V3(0, 0.35, -0.35 + (z > 0.1 ? 0.25 : 0))).normalize();
    const r = 0.011 + 0.004 * rear;
    low.push(colorize(quill(base, dl.toArray(), len, r), qcol, rng, 0.04));
    high.push(colorize(quill(base, dh.toArray(), len * 1.12, r), qcol, null, 0));
  }
  // short white rattle quills at the tail
  for (let i = 0; i < 6; i++) {
    const a = (i / 6 - 0.5) * 1.6; const base = [Math.sin(a) * 0.05, 0.24 + Math.cos(a) * 0.04, -0.35];
    const dl = new V3(Math.sin(a) * 0.4, 0.2, -1).normalize(), dh = new V3(Math.sin(a) * 0.6, 0.9, -0.5).normalize();
    const qc = () => '#efe9df';
    low.push(colorize(quill(base, dl.toArray(), 0.1, 0.02), qc, rng, 0.03)); high.push(colorize(quill(base, dh.toArray(), 0.11, 0.02), qc, null, 0));
  }
  const quills = merge(low); const quillsHi = merge(high);
  quills.morphAttributes.position = [new THREE.Float32BufferAttribute(quillsHi.attributes.position.array, 3)];
  const legs = {};
  for (const [k, sd, fr] of [['legFL', 1, 1], ['legFR', -1, 1], ['legHL', 1, 0], ['legHR', -1, 0]]) {
    const x = sd * 0.1, z = fr ? 0.18 : -0.2;
    legs[k] = { geom: colorize(legLoft([[x, 0.2, z, [0.045, 0.05]], [x, 0.08, z + 0.005, [0.035, 0.035]], [x, 0.015, z + 0.02, [0.03, 0.04]]], 5), () => '#241e1b', rng, 0.06), pivot: [x, 0.17, z] };
  }
  return {
    height: 0.6, length: 0.9,
    parts: [
      { name: 'body', geom: body, pivot: [0, 0.25, 0] },
      { name: 'head', geom: head, pivot: [0, 0.245, 0.27], parent: 'body' },
      { name: 'quills', geom: quills, pivot: [0, 0.3, -0.05], parent: 'body' },
      ...['legFL', 'legFR', 'legHL', 'legHR'].map(k => ({ name: k, geom: legs[k].geom, pivot: legs[k].pivot, parent: 'body' })),
    ],
  };
}

export function buildHedgehog(rng) {
  const prof = [[-0.2, 0.1, 0.06, 0.05], [-0.16, 0.13, 0.13, 0.11], [-0.05, 0.15, 0.155, 0.13], [0.07, 0.14, 0.14, 0.12], [0.14, 0.12, 0.1, 0.09], [0.18, 0.11, 0.05, 0.05]];
  const bodyL = colorize(wobble(loft(prof.map(([z, y, rx, ry]) => ({ p: [0, y, z], r: [rx, ry] })), 10), 0.006, 1), (c, n) => n.y < -0.05 ? '#b49a7a' : '#5e4834', rng, 0.06);
  const profAt = (z) => { for (let i = 0; i < prof.length - 1; i++) { const A = prof[i], B = prof[i + 1]; if (z >= A[0] && z <= B[0]) { const f = (z - A[0]) / (B[0] - A[0]); return [lerp(A[1], B[1], f), lerp(A[2], B[2], f), lerp(A[3], B[3], f)]; } } return [0.12, 0.05, 0.05]; };
  const spines = [];
  const NS = 84;
  for (let i = 0; i < NS; i++) {
    const z = lerp(-0.19, 0.14, (i + rng()) / NS);
    const ang = (rng() * 2 - 1) * 1.45;
    const [yc, rx, ry] = profAt(z);
    const base = [Math.sin(ang) * rx * 0.9, yc + Math.cos(ang) * ry * 0.9, z];
    const d = new V3(Math.sin(ang), Math.cos(ang), 0).multiplyScalar(0.8).add(new V3(0, 0.1, -0.55)).normalize();
    const len = 0.05 + rng() * 0.025;
    const tipC = rng() < 0.75 ? '#efe4cf' : '#3d2c20';
    spines.push(colorize(loft([{ p: base, r: 0.011 }, { p: add3(base, d.toArray(), len * 0.55), r: 0.008 }], 3, { capStart: false, tipEnd: len * 0.45 }),
      (c, n, k) => k < 6 ? '#4a3626' : tipC, rng, 0.06));
  }
  const body = merge([bodyL, ...spines]);
  const headL = colorize(wobble(loft([
    { p: [0, 0.12, 0.12], r: [0.075, 0.075] }, { p: [0, 0.105, 0.2], r: [0.056, 0.052] }, { p: [0, 0.088, 0.26], r: [0.027, 0.024] }], 8, { tipEnd: 0.02, capStart: false }), 0.004, 2),
  (c, n) => c.z > 0.272 ? '#120c0a' : (n.y > 0.55 ? '#9c7d5c' : '#d4bf9f'), rng, 0.05);
  const earsG = [1, -1].map(sd => paintG(ell(0.018, 0.02, 0.008, sd * 0.05, 0.165, 0.15), '#c8ab88', rng));
  const head = merge([headL, ...earsG, ...eyes(0.032, 0.13, 0.205, 0.011, '#050403', rng)]);
  const legs = {};
  for (const [k, sd, fr] of [['legFL', 1, 1], ['legFR', -1, 1], ['legHL', 1, 0], ['legHR', -1, 0]]) {
    const x = sd * 0.065, z = fr ? 0.1 : -0.1;
    legs[k] = { geom: colorize(legLoft([[x, 0.08, z, 0.025], [x, 0.01, z + 0.012, 0.02]], 5), () => '#6a5240', rng, 0.05), pivot: [x, 0.075, z] };
  }
  return {
    height: 0.3, length: 0.45,
    parts: [
      { name: 'body', geom: body, pivot: [0, 0.12, 0] },
      { name: 'head', geom: head, pivot: [0, 0.12, 0.14], parent: 'body' },
      ...['legFL', 'legFR', 'legHL', 'legHR'].map(k => ({ name: k, geom: legs[k].geom, pivot: legs[k].pivot, parent: 'body' })),
    ],
  };
}

export function buildHyrax(rng) {
  const brown = '#7d644a', grizzle = '#8d765c', bellyC = '#b9a283';
  const body = colorize(wobble(loft([
    { p: [0, 0.19, -0.29], r: [0.08, 0.07] }, { p: [0, 0.21, -0.25], r: [0.16, 0.14] }, { p: [0, 0.225, -0.09], r: [0.18, 0.162] },
    { p: [0, 0.225, 0.07], r: [0.165, 0.152] }, { p: [0, 0.23, 0.17], r: [0.13, 0.13] }, { p: [0, 0.25, 0.23], r: [0.09, 0.1] }], 10), 0.008, 1),
  (c, n) => {
    if (n.y < -0.45) return bellyC;
    if (n.y > 0.9 && Math.abs(c.z + 0.06) < 0.05) return '#2a1e14'; // dorsal gland spot
    return (h3(c.x * 900, c.y * 900, c.z * 900, 3) & 3) === 0 ? grizzle : brown;
  }, rng, 0.07);
  const headL = colorize(wobble(loft([
    { p: [0, 0.255, 0.19], r: [0.095, 0.095] }, { p: [0, 0.27, 0.27], r: [0.098, 0.09] }, { p: [0, 0.255, 0.335], r: [0.07, 0.066] },
    { p: [0, 0.238, 0.38], r: [0.042, 0.04] }], 9, { tipEnd: 0.018, capStart: false }), 0.006, 2),
  (c, n) => c.z > 0.385 ? '#14100c' : (c.z > 0.34 ? '#4c3a2b' : (n.y < -0.4 ? bellyC : (n.y > 0.4 && Math.abs(n.x) > 0.3 && c.z > 0.27 && c.z < 0.32 ? '#c9b08a' : brown))), rng, 0.05);
  const head = merge([headL, ...eyes(0.062, 0.29, 0.31, 0.015, '#0a0705', rng)]);
  const ears = {};
  for (const [k, sd] of [['earL', 1], ['earR', -1]]) ears[k] = earGeom({ w: 0.03, h: 0.022, d: 0.012, out: 0.6, back: 0.4, outer: '#6a543e', inner: '#4a3a2c', side: sd, rng }).translate(sd * 0.07, 0.33, 0.24);
  const legs = {};
  for (const [k, sd, fr] of [['legFL', 1, 1], ['legFR', -1, 1], ['legHL', 1, 0], ['legHR', -1, 0]]) {
    const x = sd * 0.09, z = fr ? 0.13 : -0.15;
    legs[k] = { geom: colorize(legLoft([[x, 0.15, z, [0.045, 0.05]], [x, 0.06, z + 0.01, [0.034, 0.036]], [x, 0.012, z + 0.03, [0.034, 0.042]]], 6), (c) => c.y < 0.03 ? '#2a2018' : brown, rng, 0.06), pivot: [x, 0.13, z] };
  }
  return {
    height: 0.38, length: 0.62,
    parts: [
      { name: 'body', geom: body, pivot: [0, 0.22, 0] },
      { name: 'head', geom: head, pivot: [0, 0.25, 0.21], parent: 'body' },
      { name: 'earL', geom: ears.earL, pivot: [0.07, 0.33, 0.24], parent: 'head' },
      { name: 'earR', geom: ears.earR, pivot: [-0.07, 0.33, 0.24], parent: 'head' },
      ...['legFL', 'legFR', 'legHL', 'legHR'].map(k => ({ name: k, geom: legs[k].geom, pivot: legs[k].pivot, parent: 'body' })),
    ],
  };
}

export function buildSpinyMouse(rng) {
  const fur = '#8f7460', spiny = '#7a6250', white = '#ece6dc';
  const bodyL = colorize(wobble(loft([
    { p: [0, 0.052, -0.085], r: [0.028, 0.026] }, { p: [0, 0.06, -0.065], r: [0.045, 0.043] }, { p: [0, 0.066, -0.01], r: [0.05, 0.05] },
    { p: [0, 0.062, 0.045], r: [0.042, 0.043] }, { p: [0, 0.066, 0.08], r: [0.03, 0.032] }], 9), 0.003, 1),
  (c, n) => n.y < -0.35 ? white : (n.y > 0.6 && c.z < 0.02 ? spiny : fur), rng, 0.06);
  const spikes = [];
  for (let i = 0; i < 16; i++) {
    const z = lerp(-0.07, 0.02, rng()), a = (rng() * 2 - 1) * 0.9;
    const base = [Math.sin(a) * 0.044, 0.064 + Math.cos(a) * 0.044, z];
    const d = new V3(Math.sin(a) * 0.5, 0.6, -1).normalize();
    spikes.push(colorize(loft([{ p: base, r: 0.0065 }, { p: add3(base, d.toArray(), 0.008), r: 0.004 }], 3, { capStart: false, tipEnd: 0.012 }), () => '#6e5848', rng, 0.05));
  }
  const body = merge([bodyL, ...spikes]);
  const headL = colorize(wobble(loft([
    { p: [0, 0.075, 0.065], r: [0.034, 0.033] }, { p: [0, 0.074, 0.1], r: [0.03, 0.027] }, { p: [0, 0.064, 0.13], r: [0.016, 0.014] }], 8, { tipEnd: 0.012, capStart: false }), 0.002, 2),
  (c, n) => c.z > 0.138 ? '#d89a98' : (n.y < -0.3 ? white : fur), rng, 0.05);
  const head = merge([headL, ...eyes(0.022, 0.087, 0.104, 0.009, '#050302', rng)]);
  const ears = {};
  for (const [k, sd] of [['earL', 1], ['earR', -1]]) ears[k] = earGeom({ w: 0.022, h: 0.024, d: 0.006, out: 0.55, back: 0.25, outer: '#a08a7a', inner: '#d2b0a8', side: sd, rng }).translate(sd * 0.022, 0.097, 0.08);
  const legs = {};
  for (const [k, sd, fr] of [['legFL', 1, 1], ['legFR', -1, 1], ['legHL', 1, 0], ['legHR', -1, 0]]) {
    const x = sd * (fr ? 0.026 : 0.032), z = fr ? 0.045 : -0.05;
    legs[k] = { geom: colorize(legLoft(fr ? [[x, 0.045, z, 0.012], [x, 0.004, z + 0.008, 0.008]] : [[x, 0.05, z, [0.018, 0.022]], [x, 0.02, z - 0.008, 0.01], [x, 0.004, z + 0.012, 0.008]], 5), (c) => c.y < 0.02 ? '#d8b4aa' : fur, rng, 0.05), pivot: [x, fr ? 0.045 : 0.05, z] };
  }
  const tail = colorize(tube([[0, 0.052, -0.08], [0, 0.04, -0.13], [0.006, 0.022, -0.19], [0.016, 0.012, -0.24], [0.026, 0.008, -0.28]], 7, u => 0.008 * (1 - u * 0.6), 4, { tipEnd: 0.008 }), () => '#9c8474', rng, 0.05);
  return {
    height: 0.13, length: 0.3,
    parts: [
      { name: 'body', geom: body, pivot: [0, 0.06, 0] },
      { name: 'head', geom: head, pivot: [0, 0.07, 0.065], parent: 'body' },
      { name: 'earL', geom: ears.earL, pivot: [0.022, 0.097, 0.08], parent: 'head' },
      { name: 'earR', geom: ears.earR, pivot: [-0.022, 0.097, 0.08], parent: 'head' },
      ...['legFL', 'legFR', 'legHL', 'legHR'].map(k => ({ name: k, geom: legs[k].geom, pivot: legs[k].pivot, parent: 'body' })),
      { name: 'tail', geom: tail, pivot: [0, 0.052, -0.08], parent: 'body' },
    ],
  };
}
