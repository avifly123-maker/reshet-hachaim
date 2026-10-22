// Amazon EXTRA animals: anteater, kinkajou, coati, geometry + animation (moved unchanged from amazon-animals-extra.js).
// Exports anteater, kinkajou, coati: each (opts) => AnimalVisual. Needs: kit.js.
import { makeRng, clamp, lerp, smoothstep, mergeGeometries } from '../../../core/util.js';
import { V3, TAU, PI, col, mixc, L, ball, xf, paintFaces, solid, paintVerts, eyes, jl, getSpec, wave, makeVisual, LEGS, quadAnimator, legRings } from './kit.js';

// ═══════════════════════════════════════════════════════════════════════════════════
// Species geometry
// ═══════════════════════════════════════════════════════════════════════════════════

// ─── GIANT ANTEATER ─────────────────────────────────────────────────────────────────
// Long tubular snout, huge bushy flag of a tail, grey coat with the black, white-edged diagonal shoulder stripe,
// pale forelegs with a black wrist band (walks on its knuckles).
function anteaterSpec(v) {
  const rng = makeRng(1101 + v);
  const grey = col(['#857b6e', '#7e7468', '#8a8073'][v]), pale = col('#a89e90'), rear = col('#4e463f'), black = col('#1c1916'), white = col('#ece6da');
  // diagonal stripe: centre line runs from the chest (low, front) up and back over the shoulder, narrowing to a point
  const stripe = (i) => {
    const zc = 0.33 - (i.y - 0.36) * 0.95;
    const u = i.z - zc;
    const w = 0.025 + 0.065 * smoothstep(0.9, 0.45, i.y);
    const a = Math.abs(u);
    return a < w ? 2 : a < w + 0.035 ? 1 : 0;
  };
  const coat = (i) => {
    let c = mixc(pale, grey, smoothstep(0.35, 0.0, i.z));
    c.lerp(rear, smoothstep(-0.05, -0.45, i.z) * 0.75);
    c.lerp(rear, clamp(i.ny) * 0.2);
    const s = stripe(i);
    if (s === 2) c = black.clone(); else if (s === 1) c = white.clone();
    return jl(c, rng, 0.06);
  };
  const bodyR = [
    { p: [0, 0.53, -0.5], rx: 0.06, ry: 0.07 },
    { p: [0, 0.55, -0.43], rx: 0.15, ry: 0.19 },
    { p: [0, 0.56, -0.25], rx: 0.185, ry: 0.24, fb: 0.9 },
    { p: [0, 0.56, -0.02], rx: 0.175, ry: 0.245, fb: 0.85 },
    { p: [0, 0.58, 0.2], rx: 0.17, ry: 0.255 },
    { p: [0, 0.61, 0.33], rx: 0.14, ry: 0.21 },
    { p: [0, 0.64, 0.43], rx: 0.095, ry: 0.13 },
  ];
  // shaggy dorsal crest
  const body = paintVerts(L(bodyR, { seg: 12, sub: 3, jit: 0.025, rng }), coat);
  const crest = paintVerts(L([[0, 0.79, 0.3], [0, 0.82, 0.1], [0, 0.82, -0.12], [0, 0.8, -0.32], [0, 0.73, -0.46]].map((p, i) => ({ p, rx: 0.03, ry: [0.02, 0.04, 0.045, 0.04, 0.02][i] })), { seg: 5, sub: 2, jit: 0.4, rng }), (i) => jl(mixc(grey, rear, smoothstep(0.1, -0.4, i.z)), rng, 0.08));
  // head + neck + long tube snout (slightly down-curved)
  const hp = [0, 0.63, 0.42];
  const headR = [
    { p: [0, 0.65, 0.38], rx: 0.1, ry: 0.13 },
    { p: [0, 0.63, 0.5], rx: 0.085, ry: 0.1 },
    { p: [0, 0.61, 0.62], rx: 0.072, ry: 0.082 },
    { p: [0, 0.58, 0.76], rx: 0.05, ry: 0.054 },
    { p: [0, 0.54, 0.9], rx: 0.036, ry: 0.039 },
    { p: [0, 0.5, 1.02], rx: 0.027, ry: 0.029 },
    { p: [0, 0.475, 1.1], rx: 0.021, ry: 0.021 },
  ];
  const headG = paintVerts(L(headR, { seg: 9, sub: 2, cap1: 0.7 }), (i) => {
    if (i.z > 1.07) return black;
    if (i.z < 0.55 && i.ny < -0.25) return black;     // black throat patch (continues the stripe)
    return jl(mixc(pale, mixc(grey, rear, 0.5), smoothstep(0.6, 1.05, i.z)), rng, 0.04);
  });
  const ear = (s) => paintFaces(xf(ball(0.032, 0.03, 0.014, 6, 4), [s * 0.06, 0.69, 0.56], [0, s * 0.5, s * -0.3]), (i) => (i.nz > 0.2 ? col('#6a6058') : grey));
  const head = mergeGeometries([headG, ear(1), ear(-1), ...eyes(0.017, [0.058, 0.645, 0.655], '#120e0c', null, 0.5)]);
  // legs: pale forelegs with black wrist band + dark curled hand (knuckle walking); dark hind legs
  const legF = (s) => paintVerts(L(legRings([s * 0.12, 0.5, 0.28], [[0, 0, 0], [0, -0.18, 0.02], [0, -0.36, 0.03], [0, -0.46, 0.05], [0, -0.5, 0.1]],
    [[0.085, 0.1], [0.068, 0.072], [0.056, 0.056], [0.062, 0.05], [0.055, 0.032]]), { seg: 7, up: [0, 0, 1], sub: 2, cap1: 0.9 }), (i) => {
    if (i.y < 0.07) return col('#2a2420');
    if (i.y < 0.17) return black;
    return jl(mixc(white, pale, smoothstep(0.2, 0.45, i.y)), rng, 0.05);
  });
  const legH = (s) => paintVerts(L(legRings([s * 0.12, 0.5, -0.32], [[0, 0, 0], [0, -0.18, -0.04], [0, -0.36, -0.05], [0, -0.47, 0.0], [0, -0.5, 0.06]],
    [[0.1, 0.13], [0.075, 0.085], [0.055, 0.058], [0.055, 0.05], [0.06, 0.03]]), { seg: 7, up: [0, 0, 1], sub: 2, cap1: 0.9 }), (i) => jl(mixc(rear, black, smoothstep(0.35, 0.05, i.y)), rng, 0.06));
  // tail: tall, laterally flat, shaggy flag (long hair hangs below)
  const tailR = [
    { p: [0, 0.62, -0.42], rx: 0.06, ry: 0.09 },
    { p: [0, 0.63, -0.55], rx: 0.065, ry: 0.15, fb: 1.1 },
    { p: [0, 0.6, -0.75], rx: 0.062, ry: 0.22, fb: 1.25 },
    { p: [0, 0.54, -0.95], rx: 0.055, ry: 0.235, fb: 1.3 },
    { p: [0, 0.47, -1.13], rx: 0.045, ry: 0.19, fb: 1.25 },
    { p: [0, 0.42, -1.27], rx: 0.03, ry: 0.11 },
    { p: [0, 0.4, -1.33], rx: 0.014, ry: 0.035 },
  ];
  const tail = paintVerts(L(tailR, { seg: 10, sub: 2, jit: 0.25, rng, cap1: 0.6 }), (i) => {
    const under = smoothstep(-0.1, -0.7, i.ny);
    return jl(mixc(mixc(grey, rear, 0.55), col('#3e3832'), under * 0.8 + smoothstep(-0.8, -1.3, i.z) * 0.3), rng, 0.1);
  });
  return {
    parts: [
      { name: 'body', geo: mergeGeometries([body, crest]), pivot: [0, 0.56, -0.05], mat: 'fur' },
      { name: 'head', geo: head, pivot: hp, parent: 'body', mat: 'fur' },
      { name: 'fl', geo: legF(1), pivot: [0.12, 0.5, 0.28], parent: 'body', mat: 'fur' },
      { name: 'fr', geo: legF(-1), pivot: [-0.12, 0.5, 0.28], parent: 'body', mat: 'fur' },
      { name: 'hl', geo: legH(1), pivot: [0.12, 0.5, -0.32], parent: 'body', mat: 'fur' },
      { name: 'hr', geo: legH(-1), pivot: [-0.12, 0.5, -0.32], parent: 'body', mat: 'fur' },
      { name: 'tail', geo: tail, pivot: [0, 0.62, -0.44], parent: 'body', mat: 'fur' },
    ],
  };
}

// ─── KINKAJOU ───────────────────────────────────────────────────────────────────────
// Golden-brown, round face with big night eyes and small low ears, short legs, long prehensile tail (hook at the tip).
function kinkajouSpec(v) {
  const rng = makeRng(1201 + v);
  const fur = col(['#c48a3c', '#bb8236', '#cc9444'][v]), back = col('#a06a2a'), belly = col('#e2b878'), dark = col('#5a3818');
  const furF = (i) => jl(i.ny < -0.5 ? mixc(fur, belly, 0.7) : mixc(fur, back, clamp(i.ny * 0.9)), rng, 0.07);
  const bodyR = [
    { p: [0, 0.3, -0.27], rx: 0.06, ry: 0.06 },
    { p: [0, 0.31, -0.22], rx: 0.11, ry: 0.11 },
    { p: [0, 0.32, -0.08], rx: 0.125, ry: 0.125 },
    { p: [0, 0.33, 0.06], rx: 0.118, ry: 0.12 },
    { p: [0, 0.35, 0.15], rx: 0.095, ry: 0.095 },
    { p: [0, 0.37, 0.21], rx: 0.065, ry: 0.07 },
  ];
  const body = paintVerts(L(bodyR, { seg: 10, sub: 2, jit: 0.08, rng }), furF);
  const hp = [0, 0.38, 0.2];
  const skull = paintVerts(ball(0.098, 0.09, 0.09, 10, 7, [0, 0.41, 0.27]), (i) => (i.ny < -0.5 ? jl(belly, rng, 0.04) : furF(i)));
  const muzzle = paintVerts(ball(0.05, 0.042, 0.055, 8, 5, [0, 0.385, 0.34]), (i) => jl(mixc(fur, dark, 0.35), rng, 0.04));
  const nose = solid(ball(0.02, 0.016, 0.014, 6, 4, [0, 0.392, 0.392]), '#2a1a10');
  const ear = (s) => paintFaces(xf(ball(0.03, 0.028, 0.012, 6, 4), [s * 0.082, 0.465, 0.245], [-0.2, s * 0.4, s * -0.5]), (i) => (i.nz > 0.2 ? col('#7a4a20') : fur));
  const head = mergeGeometries([skull, muzzle, nose, ear(1), ear(-1), ...eyes(0.021, [0.044, 0.428, 0.335], '#1a0e06', '#050302', 0.9)]);
  const limb = (x, y, z, len, r) => paintVerts(L(legRings([x, y, z], [[0, 0, 0], [0, -len * 0.5, 0.01], [0, -len * 0.92, 0.0], [0, -len, 0.025]],
    [[r, r], [r * 0.75, r * 0.75], [r * 0.6, r * 0.6], [r * 0.7, r * 0.45]]), { seg: 6, up: [0, 0, 1], sub: 2, cap1: 0.8 }), (i) => (i.y < y - len * 0.8 ? jl(dark, rng, 0.05) : furF(i)));
  // tail along -Z with a slight droop and a hooked tip (prehensile)
  const tailR = [[0, 0.31, -0.23], [0, 0.3, -0.36], [0, 0.285, -0.5], [0, 0.27, -0.64], [0, 0.265, -0.76], [0, 0.28, -0.85], [0, 0.315, -0.88], [0, 0.34, -0.86]]
    .map((p, i, a) => ({ p, rx: lerp(0.048, 0.017, i / (a.length - 1)), ry: lerp(0.048, 0.017, i / (a.length - 1)) }));
  const tail = paintVerts(L(tailR, { seg: 7, sub: 2, cap1: 0.8 }), (i) => jl(mixc(mixc(fur, back, 0.4), dark, smoothstep(-0.6, -0.88, i.z) * 0.6), rng, 0.06));
  return {
    parts: [
      { name: 'body', geo: body, pivot: [0, 0.32, -0.05], mat: 'fur' },
      { name: 'head', geo: head, pivot: hp, parent: 'body', mat: 'fur' },
      { name: 'fl', geo: limb(0.075, 0.3, 0.12, 0.3, 0.042), pivot: [0.075, 0.3, 0.12], parent: 'body', mat: 'fur' },
      { name: 'fr', geo: limb(-0.075, 0.3, 0.12, 0.3, 0.042), pivot: [-0.075, 0.3, 0.12], parent: 'body', mat: 'fur' },
      { name: 'hl', geo: limb(0.08, 0.3, -0.16, 0.3, 0.05), pivot: [0.08, 0.3, -0.16], parent: 'body', mat: 'fur' },
      { name: 'hr', geo: limb(-0.08, 0.3, -0.16, 0.3, 0.05), pivot: [-0.08, 0.3, -0.16], parent: 'body', mat: 'fur' },
      { name: 'tail', geo: tail, pivot: [0, 0.31, -0.23], parent: 'body', mat: 'fur' },
    ],
  };
}

// ─── SOUTH AMERICAN COATI ───────────────────────────────────────────────────────────
// Reddish-brown, long mobile up-turned snout, pale eye marks, dark legs, long ringed tail held upright.
function coatiSpec(v) {
  const rng = makeRng(1301 + v);
  const fur = col(['#a8582c', '#9e5228', '#b0602f'][v]), back = col('#7a3c1c'), belly = col('#d9a876'), dark = col('#33221a'), face = col('#4a3224'), white = col('#efe4d2');
  const ringL = col('#c9965e'), ringD = col('#3e2414');
  const furF = (i) => jl(i.ny < -0.55 ? belly : mixc(fur, back, clamp(i.ny * 0.9)), rng, 0.08);
  const bodyR = [
    { p: [0, 0.3, -0.25], rx: 0.05, ry: 0.05 },
    { p: [0, 0.31, -0.21], rx: 0.1, ry: 0.11 },
    { p: [0, 0.315, -0.08], rx: 0.115, ry: 0.12 },
    { p: [0, 0.305, 0.06], rx: 0.1, ry: 0.11 },
    { p: [0, 0.315, 0.15], rx: 0.08, ry: 0.09 },
    { p: [0, 0.34, 0.21], rx: 0.055, ry: 0.06 },
  ];
  const body = paintVerts(L(bodyR, { seg: 10, sub: 2, jit: 0.07, rng }), furF);
  const hp = [0, 0.34, 0.2];
  const headR = [
    { p: [0, 0.35, 0.19], rx: 0.058, ry: 0.06 },
    { p: [0, 0.372, 0.25], rx: 0.066, ry: 0.062 },
    { p: [0, 0.355, 0.31], rx: 0.048, ry: 0.044 },
    { p: [0, 0.335, 0.37], rx: 0.03, ry: 0.028 },
    { p: [0, 0.322, 0.42], rx: 0.02, ry: 0.019 },
    { p: [0, 0.326, 0.455], rx: 0.015, ry: 0.014 },
  ];
  const ex = 0.04, ey = 0.388, ez = 0.29;
  const headG = paintVerts(L(headR, { seg: 9, sub: 2, cap1: 0.6 }), (i) => {
    if (i.z > 0.445) return col('#1a120c');
    const de = Math.hypot(Math.abs(i.x) - ex, i.y - ey, i.z - ez);
    if (de < 0.03 && i.ny > -0.3) return white;                         // pale eye marks
    if (i.ny < -0.5 && i.z > 0.25) return mixc(white, face, 0.35);      // pale muzzle underside
    return jl(i.z > 0.3 ? face : mixc(fur, face, 0.5), rng, 0.05);
  });
  const nose = solid(ball(0.017, 0.014, 0.012, 6, 4, [0, 0.33, 0.458]), '#120c08');
  const ear = (s) => paintFaces(xf(ball(0.022, 0.024, 0.01, 6, 4), [s * 0.04, 0.428, 0.215], [-0.2, s * 0.3, s * -0.3]), (i) => (Math.hypot(i.x - s * 0.04, i.y - 0.428) > 0.017 ? white : face));
  const head = mergeGeometries([headG, nose, ear(1), ear(-1), ...eyes(0.013, [ex, ey, ez + 0.012], '#120a06', null, 0.8)]);
  const limb = (x, y, z, len, r, hind) => paintVerts(L(legRings([x, y, z], hind
    ? [[0, 0, 0], [0, -len * 0.45, -0.03], [0, -len * 0.85, -0.02], [0, -len, 0.03]]
    : [[0, 0, 0], [0, -len * 0.5, 0.01], [0, -len * 0.9, 0.0], [0, -len, 0.03]],
  [[r, r * 1.2], [r * 0.7, r * 0.75], [r * 0.55, r * 0.55], [r * 0.65, r * 0.4]]), { seg: 6, up: [0, 0, 1], sub: 2, cap1: 0.8 }), (i) => jl(mixc(dark, back, smoothstep(y - len * 0.4, y, i.y) * 0.7), rng, 0.06));
  // tail: rises from the rump, held upright with a slight forward curl; crisp rings
  const tailPts = [[0, 0.33, -0.22], [0, 0.4, -0.3], [0, 0.52, -0.335], [0, 0.66, -0.33], [0, 0.78, -0.3], [0, 0.87, -0.255], [0, 0.91, -0.21]];
  const tailR = tailPts.map((p, i, a) => ({ p, rx: lerp(0.042, 0.016, i / (a.length - 1)), ry: lerp(0.042, 0.016, i / (a.length - 1)) }));
  const tail = paintFaces(L(tailR, { seg: 7, sub: 4, cap1: 0.8 }), (i) => {
    const k = clamp((i.y - 0.36) / 0.55);
    if (i.y > 0.88) return ringD;
    return jl(Math.sin(k * PI * 13) > -0.1 ? ringL : ringD, rng, 0.05);
  }, false);
  return {
    parts: [
      { name: 'body', geo: body, pivot: [0, 0.31, -0.04], mat: 'fur' },
      { name: 'head', geo: head, pivot: hp, parent: 'body', mat: 'fur' },
      { name: 'fl', geo: limb(0.06, 0.27, 0.1, 0.27, 0.036), pivot: [0.06, 0.27, 0.1], parent: 'body', mat: 'fur' },
      { name: 'fr', geo: limb(-0.06, 0.27, 0.1, 0.27, 0.036), pivot: [-0.06, 0.27, 0.1], parent: 'body', mat: 'fur' },
      { name: 'hl', geo: limb(0.065, 0.28, -0.16, 0.28, 0.048, true), pivot: [0.065, 0.28, -0.16], parent: 'body', mat: 'fur' },
      { name: 'hr', geo: limb(-0.065, 0.28, -0.16, 0.28, 0.048, true), pivot: [-0.065, 0.28, -0.16], parent: 'body', mat: 'fur' },
      { name: 'tail', geo: tail, pivot: [0, 0.33, -0.22], parent: 'body', mat: 'fur' },
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════════
// Species definitions (geometry + animation)
// ═══════════════════════════════════════════════════════════════════════════════════
const QUAD_ACTIONS = ['idle', 'walk', 'run', 'eat', 'sleep'];
function quadSpec(id, specFn, opts) {
  const v = ((opts && opts.seed) || 0) % 3;
  return getSpec('x-' + id + v, () => specFn(v));
}

// anteater: plain quadruped; eat = snout to the ground with quick tongue-flick bobs; sleeps curled under its tail
export function anteater(opts) {
  const spec = quadSpec('anteater', anteaterSpec, opts);
  const size = new V3(); spec.box.getSize(size);
  const cfg = {
    legLen: 0.5, walkAmp: 0.3, runAmp: 0.62, walkSpeed: 0.6, runSpeed: 2.8, maxFreq: 3, lift: 0.16,
    sleepLeg: [-1.35, -1.35, -1.2, -1.2], sleepFold: [0.4, 0.4, 0.45, 0.45], sleepDrop: 0.26, sleepRoll: 0.18, sleepHeadPitch: 0.55, sleepHeadYaw: 1.0,
    sleepTailYaw: 1.25, sleepTailPitch: 0.35, eatPitch: 0.7, tailRate: 0.7, tailLift: 0.15,
    map: { perch: 'idle', climb: 'walk', hang: 'idle', fly: 'run', glide: 'run', hover: 'idle', swim: 'walk', sit: 'idle' },
    extra: (N, p) => {
      // tongue-flicking bob while feeding; slow snout sniff-sway otherwise
      N.head.rotation.x += p.et * 0.07 * Math.sin(p.t * 14) - (1 - p.et) * (1 - p.sl) * 0.04 * Math.sin(p.t * 0.9);
      N.head.rotation.y += (1 - p.sl) * (1 - p.gw) * 0.05 * Math.sin(p.t * 3.1);
      // sleeping: the big tail drapes over the body like a blanket
      N.tail.rotation.z = p.sl * 0.9;
    },
  };
  return makeVisual('anteater', spec, opts, { scale: 2.0 / size.z, actions: QUAD_ACTIONS, speeds: { walk: cfg.walkSpeed, run: cfg.runSpeed } }, quadAnimator(cfg));
}

// kinkajou: walks along branches / ground, climbs trunks, hangs by its tail (often feeding), sleeps curled up
export function kinkajou(opts) {
  const spec = quadSpec('kinkajou', kinkajouSpec, opts);
  const size = new V3(); spec.box.getSize(size);
  return makeVisual('kinkajou', spec, opts, {
    scale: 0.95 / size.z, actions: ['idle', 'walk', 'run', 'eat', 'sleep', 'perch', 'climb', 'hang'], speeds: { walk: 0.6, run: 2.0 },
    gripY: { perch: 0 }, calib: [['hang', ['tail'], 'max']], calibOffset: { hang: 0.02 },
  }, (N, inner, st) => {
    const { body, head, tail } = N, limbs = LEGS.map((k) => N[k]);
    const base = body.userData.base.clone();
    let support = 'ground';
    st.reset = () => { support = 'ground'; };
    return (dt, action, speed) => {
      const P = st.P;
      let a = action;
      if (a === 'fly' || a === 'glide' || a === 'hover') a = 'hang';
      if (a === 'swim') a = 'walk';
      if (a === 'walk' || a === 'run' || a === 'perch') support = 'ground';
      else if (a === 'hang' || a === 'climb') support = a;
      const sup = a === 'sleep' ? 'ground' : support;
      const moving = a === 'walk' || a === 'run' || a === 'climb';
      const sp = speed == null || speed <= 0.01 ? (a === 'run' ? 2.0 : a === 'climb' ? 0.4 : 0.6) : speed;
      const hang = P('hang', sup === 'hang' ? 1 : 0, dt, 3);
      const climb = P('climb', sup === 'climb' ? 1 : 0, dt, 3);
      const gw = P('gw', moving ? 1 : 0, dt, 5);
      const run = P('run', a === 'run' ? 1 : 0, dt, 4);
      const sl = P('sl', a === 'sleep' ? 1 : 0, dt, 2);
      const et = P('et', a === 'eat' ? 1 : 0, dt, 4);
      const si = et * (1 - hang) * (1 - climb);          // eating on a branch/ground: sits up holding fruit
      const amp = lerp(0.5, 0.85, run);
      if (gw > 0.01) st.ph += dt * TAU * clamp(sp / (4 * 0.3 * Math.sin(amp)), 0.6, 4.5);
      const t = st.t, ph = st.ph;
      const bob = gw * (1 - climb) * 0.012 * Math.cos(2 * ph);
      body.position.set(0,
        base.y + bob - sl * 0.15 - si * 0.04 + hang * (-0.78 - base.y + Math.sin(t * 0.9) * 0.01) + climb * 0.25,
        base.z + climb * -0.3);
      body.rotation.set(hang * PI / 2 + climb * -PI / 2 - si * 0.85 + gw * run * 0.08 * Math.sin(ph), 0, sl * 0.15 + hang * Math.sin(t * 0.8) * 0.06);
      for (let i = 0; i < 4; i++) {
        const front = i < 2, s = i % 2 ? -1 : 1;
        const off = (front ? [0.25, 0.75] : [0, 0.5])[i % 2] * TAU + (run > 0.5 ? (front ? 0 : PI) : 0);
        let rx = gw * amp * Math.sin(ph + off), rz = 0;
        let sy = 1 - gw * 0.15 * Math.max(0, -Math.cos(ph + off)) - sl * 0.35;
        if (front) {
          rx += hang * -1.35 + climb * -0.55 + sl * -1.2 + si * -0.35;
          rz = s * (hang * 0.25 + si * 0.35);
          if (et > 0.01) rx += Math.sin(t * 4 + i) * 0.12 * et;   // hands to the mouth
          sy -= si * 0.3;
        } else {
          rx += hang * 1.3 + climb * 0.25 + sl * 1.2 + si * 0.85;
          rz = s * (hang * 0.2 + si * 0.25);
        }
        limbs[i].rotation.set(rx, 0, rz);
        limbs[i].scale.y = sy;
      }
      head.rotation.set(hang * -1.0 + climb * 0.5 + si * 0.75 + sl * 0.55 + et * 0.08 * Math.sin(t * 7) + gw * 0.05 * Math.sin(2 * ph),
        (1 - sl) * (1 - gw * 0.6) * 0.45 * wave(t + st.seed * 10, 0.33, 0.8, 1.7) + sl * 0.7, 0);
      tail.rotation.set(-0.06 * (1 - hang) * (1 - climb) + gw * (1 - climb) * 0.05 * Math.sin(ph) + sl * -0.1 + si * 0.75,
        (1 - hang) * (1 - climb) * ((1 - sl) * 0.3 * Math.sin(t * 0.7 + 1) + sl * 1.5), hang * 0.08 * Math.sin(t * 0.8));
      body.scale.setScalar(1 + Math.sin(t * (sl > 0.5 ? 1.3 : 2.2)) * 0.01);
    };
  });
}

// coati: quadruped with upright ringed tail; eat = rooting with the snout; climb = vertical on a trunk
export function coati(opts) {
  const spec = quadSpec('coati', coatiSpec, opts);
  const size = new V3(); spec.box.getSize(size);
  const cfg = {
    legLen: 0.27, walkAmp: 0.42, runAmp: 0.78, walkSpeed: 0.7, runSpeed: 3.2, maxFreq: 4.5, lift: 0.22,
    sleepLeg: [-1.4, -1.4, -1.3, -1.3], sleepFold: [0.4, 0.4, 0.45, 0.45], sleepDrop: 0.15, sleepRoll: 0.1, sleepHeadPitch: 0.55, sleepHeadYaw: 0.9,
    sleepTailYaw: 1.2, sleepTailPitch: -1.35, eatPitch: 0.75, tailRate: 1.1, tailLift: -0.35,
    map: { perch: 'idle', hang: 'idle', fly: 'run', glide: 'run', hover: 'idle', swim: 'walk', sit: 'idle' },
    extra: (N, p) => {
      // busy snout: rooting wiggle while eating, sniffing while idle
      N.head.rotation.z = p.et * 0.12 * Math.sin(p.t * 11) + (1 - p.gw) * (1 - p.sl) * 0.04 * Math.sin(p.t * 6.3);
      N.head.rotation.x += p.et * 0.05 * Math.sin(p.t * 8);
    },
  };
  const animator = quadAnimator(cfg);
  return makeVisual('coati', spec, opts, { scale: 1.0 / size.z, actions: [...QUAD_ACTIONS, 'climb'], speeds: { walk: cfg.walkSpeed, run: cfg.runSpeed } }, (N, inner, st) => {
    const upd = animator(N, inner, st);
    const { body, tail, head } = N, base = body.userData.base.clone();
    return (dt, action, speed, night) => {
      const climbing = action === 'climb';
      upd(dt, climbing ? 'walk' : action, climbing ? (speed || 0.35) : speed, night);
      const cl = st.P('cl', climbing ? 1 : 0, dt, 4);
      body.rotation.x += cl * -PI / 2;
      body.position.y += cl * 0.22;
      body.position.z = base.z + cl * -0.28;
      tail.rotation.x = lerp(tail.rotation.x, -1.25, cl);
      head.rotation.x -= cl * 0.35;
    };
  });
}
