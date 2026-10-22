// Amazon animals: species definitions, geometry + animation config (moved unchanged from amazon-animals.js).
// Exports ANIM = { id: (opts) => AnimalVisual } (leafcutter.js adds ANIM.leafcutter). makeQuad / makeBird wrap the
// shared animators; the sloth, howler, morpho, orchid bee, dart frog and fruit bat have their own animators here.
// Needs: kit.js, animators.js, mammals.js, flyers.js.
import { clamp, lerp, damp, smoothstep } from '../../core/util.js';
import { V3, TAU, PI, getSpec, wave, makeVisual } from './kit.js';
import { LEGS, quadAnimator, birdAnimator } from './animators.js';
import { jaguarSpec, tapirSpec, capybaraSpec, agoutiSpec, slothSpec, howlerSpec } from './mammals.js';
import { toucanSpec, macawSpec, harpySpec, hummingbirdSpec, morphoSpec, orchidbeeSpec, dartfrogSpec, fruitbatSpec } from './flyers.js';

// ═══════════════════════════════════════════════════════════════════════════════════
// Species definitions (geometry + animation config)
// ═══════════════════════════════════════════════════════════════════════════════════
const QUAD_ACTIONS = ['idle', 'walk', 'run', 'eat', 'sleep'];

function makeQuad(id, specFn, target, cfg, opts) {
  const v = ((opts && opts.seed) || 0) % 3;
  const spec = getSpec(id + v, () => specFn(v));
  const size = new V3(); spec.box.getSize(size);
  const scale = target / size.z;
  return makeVisual(id, spec, opts, { scale, actions: cfg.actions || QUAD_ACTIONS, speeds: { walk: cfg.walkSpeed, run: cfg.runSpeed }, gripY: cfg.gripY }, quadAnimator(cfg));
}

export const ANIM = {};

ANIM.jaguar = (opts) => makeQuad('jaguar', jaguarSpec, 2.2, {
  actions: ['idle', 'walk', 'run', 'eat', 'sleep', 'swim', 'sit'],
  legLen: 0.62, walkAmp: 0.38, runAmp: 0.75, walkSpeed: 1.3, runSpeed: 6, maxFreq: 3.2, lift: 0.22,
  sleepLeg: [-1.45, -1.45, -1.35, -1.35], sleepFold: [0.3, 0.3, 0.45, 0.45], sleepDrop: 0.34, sleepRoll: 0.12, sleepHeadPitch: 0.35, sleepHeadYaw: 0.35,
  sleepTailYaw: 1.0, sleepTailPitch: 0.5, eatPitch: 0.9, swimDrop: 0.5, swimHeadUp: 0.35, tailLift: 0.3,
  sitLeg: [0.1, 0.1, -1.4, -1.4], sitFold: [0, 0, 0.45, 0.45], sitDrop: 0.2, sitPitch: 0.42, sitHeadPitch: 0.25,
  map: { perch: 'sleep', climb: 'walk', hang: 'idle', fly: 'run', glide: 'run', hover: 'idle' },
}, opts);

ANIM.tapir = (opts) => makeQuad('tapir', tapirSpec, 2.4, {
  actions: ['idle', 'walk', 'run', 'eat', 'sleep', 'swim'],
  legLen: 0.66, walkAmp: 0.32, runAmp: 0.55, walkSpeed: 1.0, runSpeed: 4, maxFreq: 2.6, lift: 0.15,
  sleepLeg: [-1.4, -1.4, -1.3, -1.3], sleepFold: [0.4, 0.4, 0.5, 0.5], sleepDrop: 0.5, sleepRoll: 0.1, sleepHeadPitch: 0.4,
  eatPitch: 0.75, swimDrop: 0.75, swimHeadUp: 0.35,
  extra: (N, p) => { N.head.rotation.x += Math.sin(p.t * 2.3) * 0.03; },
  map: { perch: 'idle', climb: 'walk', hang: 'idle', fly: 'run', glide: 'run', hover: 'idle' },
}, opts);

ANIM.capybara = (opts) => makeQuad('capybara', capybaraSpec, 1.4, {
  actions: ['idle', 'walk', 'run', 'eat', 'sleep', 'swim', 'sit'],
  legLen: 0.38, walkAmp: 0.4, runAmp: 0.65, walkSpeed: 0.8, runSpeed: 3.5, maxFreq: 3.5, lift: 0.18,
  sleepLeg: [-1.45, -1.45, -1.45, -1.45], sleepFold: [0.45, 0.45, 0.5, 0.5], sleepDrop: 0.2, sleepRoll: 0, sleepHeadPitch: 0.25,
  eatPitch: 0.75, swimDrop: 0.55, swimHeadUp: 0.3,
  sitLeg: [0.05, 0.05, -1.5, -1.5], sitFold: [0, 0, 0.5, 0.5], sitDrop: 0.12, sitPitch: 0.3, sitHeadPitch: 0.15,
  map: { perch: 'sit', climb: 'walk', hang: 'idle', fly: 'run', glide: 'run', hover: 'idle' },
}, opts);

ANIM.agouti = (opts) => makeQuad('agouti', agoutiSpec, 0.8, {
  actions: ['idle', 'walk', 'run', 'eat', 'sleep', 'sit'],
  legLen: 0.32, walkAmp: 0.4, runAmp: 0.8, walkSpeed: 0.7, runSpeed: 4, maxFreq: 5, lift: 0.25,
  walkOff: [0.25, 0.75, 0, 0.5], runOff: [0, 0.08, 0.5, 0.55],
  sleepLeg: [-1.45, -1.45, -1.3, -1.3], sleepFold: [0.45, 0.45, 0.45, 0.45], sleepDrop: 0.17, sleepPitch: 0.12, sleepHeadPitch: 0.1,
  sitLeg: [-0.3, -0.3, -1.3, -1.3], sitFold: [0.1, 0.1, 0.35, 0.35], sitDrop: 0.13, sitPitch: 0.55, sitHeadPitch: 0.4,
  eatPitch: 0.5,
  // agouti eats sitting up, holding a seed in its front paws
  map: { eat: 'sit', perch: 'sit', climb: 'walk', hang: 'idle', fly: 'run', glide: 'run', hover: 'idle', swim: 'walk' },
  extra: (N, p) => { if (p.si > 0.1) { N.fl.rotation.x = lerp(N.fl.rotation.x, -0.5 + Math.sin(p.t * 5) * 0.1, p.si); N.fr.rotation.x = lerp(N.fr.rotation.x, -0.5 + Math.sin(p.t * 5 + 0.4) * 0.1, p.si); N.fl.scale.y = N.fr.scale.y = 1 - 0.4 * p.si; N.head.rotation.x += p.si * Math.sin(p.t * 9) * 0.05; } },
}, opts);

// ─── sloth: custom animator (hang is its home pose) ───
ANIM.sloth = (opts) => {
  const v = ((opts && opts.seed) || 0) % 3;
  const spec = getSpec('sloth' + v, () => slothSpec(v));
  const size = new V3(); spec.box.getSize(size);
  return makeVisual('sloth', spec, opts, { scale: 1.0 / size.z * 0.95, actions: ['hang', 'climb', 'idle', 'walk', 'eat', 'sleep', 'perch'], speeds: { walk: 0.12, run: 0.25 }, calib: [['hang', ['fl', 'fr', 'hl', 'hr'], 'max']], calibOffset: { hang: 0.07 } }, (N, inner, st) => {
    const P = st.P, { body, head } = N, limbs = LEGS.map((k) => N[k]);
    const base = body.userData.base.clone();
    let support = 'hang';   // idle / eat / sleep keep the last support pose (hanging, clinging to a trunk, or on the ground)
    return (dt, action, speed) => {
      let a = action;
      if (a === 'perch' || a === 'fly' || a === 'glide' || a === 'hover') a = 'hang';
      if (a === 'run' || a === 'swim') a = 'walk';   // sloths swim surprisingly well – reuse the slow crawl
      if (a === 'walk' || a === 'hang' || a === 'climb') support = a === 'walk' ? 'ground' : a;
      const sup = a === 'idle' || a === 'eat' || a === 'sleep' ? support : a === 'walk' ? 'ground' : a;
      const sp = speed == null || speed <= 0.001 ? (a === 'walk' || a === 'climb' ? 0.12 : 0) : speed;
      const hang = P('hang', sup === 'hang' ? 1 : 0, dt, 2.5);
      const climb = P('climb', sup === 'climb' ? 1 : 0, dt, 2.5);
      const ground = 1 - hang - climb;
      const sl = P('sl', a === 'sleep' ? 1 : 0, dt, 1.5);
      const et = P('et', a === 'eat' ? 1 : 0, dt, 3);
      const moving = (a === 'walk' || a === 'climb' || (a === 'hang' && speed > 0.01)) ? 1 : 0;
      st.ph += dt * TAU * (moving ? clamp(sp / 0.25, 0.2, 1.2) : 0.0);
      const t = st.t, ph = st.ph;
      // body placement per pose (contact point at origin)
      const hy = -0.08 * (1 + sl * 0.3), hz = 0;
      body.position.set(0, lerp(base.y, 0, 1 - ground) + hang * (-0.36 - base.y * 0 + Math.sin(t * 0.8) * 0.01) + climb * 0.42 + sl * hang * 0.04, hz + climb * -0.2);
      body.rotation.set(climb * -PI / 2, 0, hang * PI);
      body.rotation.z += hang * Math.sin(t * 0.7) * 0.05;
      // limbs: alternate slow reach
      for (let i = 0; i < 4; i++) {
        const off = [0, 0.5, 0.5, 0][i] * TAU;
        const swing = moving * 0.55 * Math.sin(ph + off);
        let rx = swing, rz = 0, sy = 1;
        // hang: hands reach up to the branch at y=0 (they point up after the body roll)
        if (i < 2) { rx += hang * -0.1 + climb * -0.6 + ground * 0.15; rz = (i % 2 ? 1 : -1) * (hang * 0.35 + sl * hang * 0.15); }
        else { rx += hang * 0.15 + climb * 0.1; rz = (i % 2 ? 1 : -1) * hang * 0.3; }
        sy = 1 - moving * 0.15 * Math.max(0, -Math.cos(ph + off)) - ground * (i < 2 ? 0.08 : 0);
        limbs[i].rotation.set(rx, 0, rz);
        limbs[i].scale.y = sy;
      }
      // head: sloths keep their face upright even when hanging upside-down
      head.rotation.set(hang * -0.6 + et * 0.3 * Math.sin(t * 1.5) + sl * 0.6, Math.sin(t * 0.25 + st.seed * 9) * 0.5 * (1 - sl), hang * PI * (1 - sl * 0.3));
      if (climb > 0.5) head.rotation.x += 0.9 * climb;
      body.scale.setScalar(1 + Math.sin(t * 1.2) * 0.01);
    };
  });
};

// ─── howler: sits on branches, walks, climbs, hangs by its tail ───
ANIM.howler = (opts) => {
  const v = ((opts && opts.seed) || 0) % 3;
  const spec = getSpec('howler' + v, () => howlerSpec(v));
  const size = new V3(); spec.box.getSize(size);
  return makeVisual('howler', spec, opts, { scale: 1.0 / size.z, actions: ['idle', 'perch', 'walk', 'run', 'climb', 'hang', 'eat', 'sleep'], speeds: { walk: 0.9, run: 2.5 }, calib: [['hang', ['tail'], 'max'], ['perch', ['body'], 'min']], calibOffset: { hang: 0.03, perch: -0.02 } }, (N, inner, st) => {
    const P = st.P, { body, head, tail } = N, limbs = LEGS.map((k) => N[k]);
    const base = body.userData.base.clone();
    let howl = 0;
    return (dt, action, speed) => {
      let a = action;
      if (a === 'fly' || a === 'glide' || a === 'hover' || a === 'swim') a = 'walk';
      if (a === 'idle') a = 'perch';
      const moving = a === 'walk' || a === 'run' || a === 'climb';
      const sp = speed == null || speed <= 0.01 ? (a === 'run' ? 2.5 : a === 'climb' ? 0.5 : 0.9) : speed;
      const sit = P('sit', a === 'perch' || a === 'eat' || a === 'sleep' ? 1 : 0, dt, 4);
      const hang = P('hang', a === 'hang' ? 1 : 0, dt, 3);
      const climb = P('climb', a === 'climb' ? 1 : 0, dt, 3);
      const gw = P('gw', moving ? 1 : 0, dt, 5);
      const run = P('run', a === 'run' ? 1 : 0, dt, 4);
      const sl = P('sl', a === 'sleep' ? 1 : 0, dt, 2);
      const et = P('et', a === 'eat' ? 1 : 0, dt, 4);
      const amp = lerp(0.45, 0.8, run);
      if (gw > 0.01) st.ph += dt * TAU * clamp(sp / (4 * 0.4 * Math.sin(amp)), 0.5, 4);
      const t = st.t, ph = st.ph;
      // howling bouts while perched (head up, jaw out)
      const hb = sit * (1 - sl) * (1 - et) * smoothstep(0.75, 0.9, Math.sin(t * 0.21 + st.seed * 20));
      howl = damp(howl, hb, 4, dt);
      body.position.set(0, base.y - sit * 0.33 + hang * (-0.98 - base.y + 0.43) + climb * 0.05 + gw * (1 - climb) * 0.015 * Math.cos(2 * ph), climb * -0.15);
      body.rotation.set(-sit * (1.15 - sl * 0.25) + hang * PI / 2 * 1.0 + climb * -PI / 2 + gw * run * 0.08 * Math.sin(ph), 0, sit * sl * 0.1);
      for (let i = 0; i < 4; i++) {
        const front = i < 2, s = i % 2 ? -1 : 1;
        const off = (front ? [0.25, 0.75] : [0, 0.5])[i % 2] * TAU + (run > 0.5 ? (front ? 0 : PI) : 0);
        let rx = gw * amp * Math.sin(ph + off), rz = 0, sy = 1 - gw * 0.18 * Math.max(0, -Math.cos(ph + off));
        if (front) {
          // eat: right hand brings leaves to the mouth, left hand holds the branch
          const feed = i === 1 ? et : 0;
          rx += sit * (0.55 - et * 0.3 * (1 - feed)) + hang * -1.3 + climb * -0.5;
          rz = s * (sit * 0.15 + hang * 0.2);
          rx = lerp(rx, -1.15 + 0.12 * Math.sin(t * 3), feed); rz = lerp(rz, 0.6, feed); sy = lerp(sy, 0.42, feed);
        }
        else { rx += sit * -1.0 + hang * 0.6 + climb * 0.3; rz = s * (sit * 0.45 + hang * 0.3); sy -= sit * 0.15; }
        limbs[i].rotation.set(rx, 0, rz);
        limbs[i].scale.y = sy;
      }
      head.rotation.set(sit * 1.0 - howl * 0.6 + et * 0.35 + sl * 0.5 + hang * -1.0 + climb * 1.0 + gw * 0.05 * Math.sin(2 * ph),
        (1 - sl) * (1 - gw * 0.6) * 0.5 * wave(t + st.seed * 10, 0.33, 0.8, 1.7), 0);
      head.scale.set(1, 1 + howl * 0.08, 1 + howl * 0.12);
      tail.rotation.set(sit * 1.1 + hang * -0.2 + climb * 0.2 + gw * (1 - climb) * -0.35 + 0.08 * Math.sin(t * 0.9), (1 - hang) * 0.25 * Math.sin(t * 0.6 + 1), 0);
    };
  });
};

// ─── birds ───
function makeBird(id, specFn, target, cfg, opts) {
  const v = ((opts && opts.seed) || 0) % 3;
  const spec = getSpec(id + v, () => specFn(v));
  const size = new V3(); spec.box.getSize(size);
  const scale = target / (cfg.lengthAxis === 'x' ? size.x : size.z);
  return makeVisual(id, spec, opts, { scale, flyer: true, lengthAxis: cfg.lengthAxis, actions: cfg.actions, speeds: { walk: 0.3, fly: cfg.flySpeed }, calib: [['perch', [spec.byName.legs ? 'legs' : 'body', spec.foot], 'point']] }, birdAnimator({ size: target, ...cfg }));
}
const BIRD_ACT = ['perch', 'fly', 'glide', 'walk', 'eat', 'sleep', 'idle'];
ANIM.toucan = (opts) => makeBird('toucan', toucanSpec, 0.8, {
  actions: BIRD_ACT, flapFreq: 4.2, flapAmp: 0.9, flapBias: 0.15, glideDihedral: 0.08, flySpeed: 6,
  foldSweep: 1.45, foldDroop: -0.25, foldRoll: 0.5, perchPitch: 0.45, flyPitch: 0.05, tailPerch: 0.35, 
}, opts);
ANIM.macaw = (opts) => makeBird('macaw', macawSpec, 1.0, {
  actions: [...BIRD_ACT, 'climb'], climb: true, flapFreq: 3.6, flapAmp: 0.85, flapBias: 0.12, glideDihedral: 0.06, flySpeed: 8, wingStretch: 0.15,
  foldSweep: 1.45, foldDroop: -0.25, foldRoll: 0.5, perchPitch: 0.55, flyPitch: 0.02, tailPerch: 0.25, tailFly: -0.05, 
}, opts);
ANIM.harpy = (opts) => makeBird('harpy', harpySpec, 1.3, {
  actions: BIRD_ACT, flapFreq: 2.0, flapAmp: 0.6, flapBias: 0.08, glideDihedral: 0.1, flySpeed: 10, bank: 0.3, wingStretch: 0.12,
  foldSweep: 1.5, foldDroop: -0.05, foldRoll: 0.6, foldScale: 0.6, perchPitch: 0.45, flyPitch: 0.0, tailPerch: 0.3, 
}, opts);
ANIM.hummingbird = (opts) => makeBird('hummingbird', hummingbirdSpec, 0.4, {
  actions: ['hover', 'fly', 'perch', 'eat', 'sleep', 'idle'], hover: true, flapFreq: 22, flapAmp: 0.9, flapBias: 0.1, hoverFreq: 24, hoverAmp: 0.25, hoverSweep: 1.1, hoverPitch: 0.95,
  glideDihedral: 0.3, flySpeed: 5, foldSweep: 1.5, foldDroop: -0.1, foldRoll: 0.35, perchPitch: 0.35, flyPitch: 0.15, 
  extra: (N, p) => { if (p.et > 0.01) { N.body.rotation.x = lerp(N.body.rotation.x, -0.95, p.et); /* feeding = hovering at a flower */ } },
}, opts);
// hummingbird 'eat' = hover with bill forward into a flower
{
  const raw = ANIM.hummingbird;
  ANIM.hummingbird = (opts) => {
    const vis = raw(opts); const u = vis.update;
    vis.update = (dt, s = {}) => u(dt, s.action === 'eat' ? { ...s, action: 'hover' } : s);
    return vis;
  };
}

// ─── morpho ───
ANIM.morpho = (opts) => {
  const v = ((opts && opts.seed) || 0) % 3;
  const spec = getSpec('morpho' + v, () => morphoSpec(v));
  const size = new V3(); spec.box.getSize(size);
  return makeVisual('morpho', spec, opts, { scale: 0.55 / size.x, flyer: true, lengthAxis: 'x', actions: ['fly', 'glide', 'perch', 'eat', 'idle', 'sleep'], speeds: { fly: 1.5 }, calib: [['perch', ['body'], 'min']] }, (N, inner, st) => {
    const P = st.P, { body, wl, wr } = N;
    return (dt, action) => {
      const air = action === 'fly' || action === 'glide' || action === 'hover' || action === 'run' || action === 'walk';
      const t = st.t;
      const air1 = P('air', air ? 1 : 0, dt, 5);
      // lazy flap with short glides
      const cyc = (t * 0.35 + st.seed * 3) % 1;
      const gliding = action === 'glide' || (cyc > 0.7);
      const gw = P('g', gliding ? 1 : 0, dt, 3);
      st.ph += dt * TAU * 2.4 * (1 - gw * 0.85);
      const fl = Math.sin(st.ph);
      // perched: wings mostly closed upright (brown underside out), slow opening now and then
      const open = 0.5 + 0.5 * Math.sin(t * 0.6 + st.seed * 4);
      const perchA = lerp(1.45, 0.25, smoothstep(0.75, 1, open));
      const ang = air1 * ((1 - gw) * (0.35 + 0.95 * fl) + gw * 0.12) + (1 - air1) * perchA;
      wr.rotation.z = ang; wl.rotation.z = -ang;
      body.position.y = air1 * -0.03 * fl * (1 - gw);
      body.rotation.x = air1 * (0.1 * Math.sin(st.ph + 1)) - (1 - air1) * 0.1;
      body.rotation.z = air1 * 0.2 * Math.sin(t * 0.7 + st.seed);
    };
  });
};

// ─── orchid bee ───
ANIM.orchidbee = (opts) => {
  const v = ((opts && opts.seed) || 0) % 3;
  const spec = getSpec('orchidbee' + v, () => orchidbeeSpec(v));
  const size = new V3(); spec.box.getSize(size);
  return makeVisual('orchidbee', spec, opts, { scale: 0.3 / size.z, flyer: true, actions: ['fly', 'hover', 'perch', 'eat', 'idle', 'sleep'], speeds: { fly: 3 }, calib: [['perch', ['body'], 'min']] }, (N, inner, st) => {
    const P = st.P, { body, wl, wr } = N;
    for (const w of [wl, wr]) w.rotation.order = 'YZX';
    return (dt, action) => {
      const air = !(action === 'perch' || action === 'sleep' || action === 'idle');
      const a1 = P('air', air ? 1 : 0, dt, 8);
      st.ph += dt * TAU * (air ? 26 : 0);
      const t = st.t;
      const f = Math.sin(st.ph);
      wr.rotation.set(0, (1 - a1) * 1.2, a1 * (0.2 + 0.7 * f));
      wl.rotation.set(0, -(1 - a1) * 1.2, -a1 * (0.2 + 0.7 * f));
      body.position.y = a1 * (0.012 * Math.sin(t * 7) + 0.006 * Math.sin(t * 13));
      body.position.x = a1 * 0.01 * Math.sin(t * 5.3);
      body.rotation.x = a1 * (action === 'eat' ? 0.25 : -0.05) + (1 - a1) * 0.0;
      body.rotation.y = a1 * 0.12 * Math.sin(t * 2.1);
    };
  });
};

// ─── dart frog ───
ANIM.dartfrog = (opts) => {
  const v = ((opts && opts.seed) || 0) % 3;
  const spec = getSpec('dartfrog' + v, () => dartfrogSpec(v));
  const size = new V3(); spec.box.getSize(size);
  return makeVisual('dartfrog', spec, opts, { scale: 0.35 / size.z, actions: ['idle', 'walk', 'run', 'eat', 'sleep', 'swim', 'climb'], speeds: { walk: 0.4, run: 1.0 } }, (N, inner, st) => {
    const P = st.P, { body, hl, hr } = N;
    const base = body.userData.base.clone();
    let tongue = 0;
    return (dt, action, speed) => {
      let a = action;
      if (a === 'fly' || a === 'glide' || a === 'hover' || a === 'perch' || a === 'hang') a = 'idle';
      const hop = a === 'walk' || a === 'run' || a === 'climb';
      const sp = speed == null || speed <= 0.01 ? (a === 'run' ? 1.0 : 0.4) : speed;
      const hopLen = a === 'run' ? 0.35 : 0.2;
      const t = st.t;
      const sw = P('sw', a === 'swim' ? 1 : 0, dt, 4);
      const sl = P('sl', a === 'sleep' ? 1 : 0, dt, 2);
      const cl = P('cl', a === 'climb' ? 1 : 0, dt, 4);
      if (hop || a === 'swim') st.ph += dt * clamp(sp / hopLen, 0.5, 4);
      const c = st.ph % 1;
      const air = hop ? smoothstep(0.0, 0.08, c) * (1 - smoothstep(0.6, 0.7, c)) : 0;
      const arc = hop ? Math.max(0, Math.sin(clamp(c / 0.68) * PI)) : 0;
      const ext = hop ? Math.max(0, Math.sin(clamp(c / 0.4) * PI)) : 0;
      body.position.set(0, base.y + arc * hopLen * 0.45 - sl * 0.012 - sw * 0.04, 0);
      body.rotation.x = hop ? -0.35 * Math.sin(clamp(c / 0.68) * PI * 1.0 - 0.3) * air : 0;
      body.rotation.x += -cl * 1.2;
      // swim: legs kick back
      const kick = sw * Math.max(0, Math.sin(st.ph * TAU));
      for (const [leg, s] of [[hl, 1], [hr, -1]]) { leg.rotation.set(ext * 0.9 + kick * 0.9, s * ext * -0.3, 0); leg.scale.z = 1 + ext * 0.6 + kick * 0.5; }
      // throat / breathing pulse
      const br = (1 - sl * 0.6) * 0.03 * Math.max(0, Math.sin(t * 6));
      body.scale.set(1 + br, 1 - br * 0.5 - sl * 0.08, 1);
      if (a === 'eat') { tongue = damp(tongue, Math.sin(t * 3) > 0.7 ? 1 : 0, 20, dt); body.rotation.x = -0.15 + tongue * -0.1; }
    };
  });
};

// ─── fruit bat ───
ANIM.fruitbat = (opts) => {
  const v = ((opts && opts.seed) || 0) % 3;
  const spec = getSpec('fruitbat' + v, () => fruitbatSpec(v));
  const size = new V3(); spec.box.getSize(size);
  return makeVisual('fruitbat', spec, opts, { scale: 0.8 / size.x, flyer: true, lengthAxis: 'x', actions: ['fly', 'glide', 'hang', 'eat', 'sleep', 'idle'], speeds: { fly: 5 }, calib: [['hang', ['body', [0, 0.012, -0.145]], 'point']] }, (N, inner, st) => {
    const P = st.P, { body, head, wl, wr } = N;
    for (const w of [wl, wr]) w.rotation.order = 'YZX';
    return (dt, action) => {
      let a = action;
      if (a === 'perch' || a === 'idle' || a === 'climb' || a === 'walk') a = 'hang';
      if (a === 'run' || a === 'hover' || a === 'swim') a = 'fly';
      const air = a === 'fly' || a === 'glide';
      const t = st.t;
      const fl = P('fl', a === 'fly' ? 1 : 0, dt, 6), gl = P('gl', a === 'glide' ? 1 : 0, dt, 4);
      const hg = P('hg', air ? 0 : 1, dt, 4);
      const sl = P('sl', a === 'sleep' ? 1 : 0, dt, 2);
      st.ph += dt * TAU * (air ? 3.6 : 0.4);
      const sk = Math.sin(st.ph - 0.4 * Math.sin(st.ph));
      const flap = fl * (0.95 * sk + 0.1) + gl * (0.12 + 0.04 * Math.sin(t * 1.5));
      // hanging: wrapped in wings like a cloak (sleep wraps tighter)
      const wrap = hg * (1.25 + sl * 0.25);
      wr.rotation.set(hg * 1.1, hg * 1.2 + fl * 0.25 * Math.cos(st.ph), flap - wrap * 0.6);
      wl.rotation.set(hg * 1.1, -(hg * 1.2 + fl * 0.25 * Math.cos(st.ph)), -(flap - wrap * 0.6));
      const sx = 1 - fl * 0.25 * Math.max(0, -sk) - hg * 0.35; wr.scale.x = wl.scale.x = sx;
      body.rotation.set(hg * PI / 2 + fl * 0.05 * Math.sin(st.ph), 0, (fl + gl) * 0.25 * wave(t * 0.7 + st.seed * 4, 0.6, 1.3, 2.9) + hg * 0.08 * Math.sin(t * 0.8));
      body.position.y = fl * -0.04 * sk;
      head.rotation.set(hg * (-0.4 + (a === 'eat' ? 0.3 * Math.sin(t * 5) : 0)) + fl * 0.1, (1 - sl) * hg * 0.6 * wave(t + st.seed * 8, 0.4, 0.9, 2.2), 0);
    };
  });
};
