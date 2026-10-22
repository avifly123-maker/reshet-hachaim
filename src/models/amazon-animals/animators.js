// Amazon animals: the two shared procedural animators (moved unchanged from amazon-animals.js).
// quadAnimator(cfg): jaguar, tapir, capybara, agouti.  birdAnimator(cfg): toucan, macaw, harpy, hummingbird.
// Needs: kit.js.
import { clamp, lerp } from '../../core/util.js';
import { TAU, hash3, wave } from './kit.js';

// ═══════════════════════════════════════════════════════════════════════════════════
// Quadruped animator (jaguar, tapir, capybara, agouti)
// ═══════════════════════════════════════════════════════════════════════════════════
export const LEGS = ['fl', 'fr', 'hl', 'hr'];
const QUAD_DEF = { sleepDrop: 0, swimDrop: 0, sitDrop: 0, sleepRoll: 0, sleepLeg: [0, 0, 0, 0], walkAmp: 0.35, runAmp: 0.7, lift: 0.18, legLen: 0.5 };
export function quadAnimator(cfg) {
  cfg = { ...QUAD_DEF, ...cfg };
  return (N, inner, st) => {
    const P = st.P;
    const body = N.body, head = N.head, tail = N.tail;
    const legs = LEGS.map((k) => N[k]);
    const map = cfg.map || {};
    return (dt, action, speed, night) => {
      let a = map[action] || action;
      if (!['idle', 'walk', 'run', 'eat', 'sleep', 'swim', 'sit'].includes(a)) a = 'idle';
      const moving = a === 'walk' || a === 'run' || a === 'swim';
      let sp = speed == null || speed <= 0.01 ? (a === 'run' ? cfg.runSpeed : a === 'swim' ? cfg.walkSpeed * 0.7 : cfg.walkSpeed) : speed;
      const runW = P('run', a === 'run' ? 1 : 0, dt, 4);
      const gw = P('gw', moving ? 1 : 0, dt, 5);
      const sl = P('sl', a === 'sleep' ? 1 : 0, dt, 2.2);
      const et = P('et', a === 'eat' ? 1 : 0, dt, 4);
      const sw = P('sw', a === 'swim' ? 1 : 0, dt, 3);
      const si = P('si', a === 'sit' ? 1 : 0, dt, 4);
      const amp = lerp(cfg.walkAmp, cfg.runAmp, runW) * (1 - sw * 0.2);
      let freq = sp / (4 * cfg.legLen * Math.sin(amp));
      freq = clamp(freq, 0.5, cfg.maxFreq || 4.5);
      if (sw > 0.5) freq = clamp(freq * 1.4, 1.2, 3);
      if (gw > 0.01) st.ph += dt * TAU * freq * clamp(gw * 1.5);
      const ph = st.ph, t = st.t;
      // legs
      const walkOff = cfg.walkOff || [0.25, 0.75, 0, 0.5];
      const runOff = cfg.runOff || [0, 0.12, 0.55, 0.67];
      for (let i = 0; i < 4; i++) {
        const leg = legs[i]; if (!leg) continue;
        const off = lerp(walkOff[i], runOff[i], runW) * TAU;
        const q = ph + off;
        const front = i < 2;
        let ang = gw * amp * Math.sin(q) * (front ? 1 : 1.05);
        const lift = gw * (cfg.lift || 0.18) * Math.max(0, -Math.cos(q));
        ang += sl * cfg.sleepLeg[i] + si * (cfg.sitLeg ? cfg.sitLeg[i] : 0);
        if (sw > 0.01) ang = lerp(ang, 0.5 + 0.7 * Math.sin(q), sw);
        leg.rotation.x = ang;
        leg.rotation.z = (i % 2 ? -1 : 1) * sl * (cfg.sleepSplay || 0);
        leg.scale.y = 1 - lift - sl * (cfg.sleepFold?.[i] ?? 0.3) - si * (cfg.sitFold?.[i] ?? 0) - sw * 0.1;
      }
      // body
      const bob = gw * (lerp(0.012, 0.035, runW) * Math.cos(2 * ph)) * cfg.legLen * 2;
      const breathe = Math.sin(t * (sl > 0.5 ? 1.4 : 2.2)) * 0.008;
      body.position.y = body.userData.base.y + bob - sl * cfg.sleepDrop - sw * cfg.swimDrop - si * (cfg.sitDrop || 0);
      body.rotation.x = runW * gw * 0.07 * Math.sin(ph + 0.6) - si * (cfg.sitPitch || 0) - sw * 0.06 - sl * (cfg.sleepPitch || 0);
      body.rotation.z = sl * (cfg.sleepRoll || 0) + gw * (1 - runW) * 0.025 * Math.sin(ph);
      body.scale.set(1 + breathe, 1 + breathe, 1);
      // head
      if (head) {
        const look = (1 - gw * 0.7) * (1 - sl) * (1 - et * 0.6);
        head.rotation.y = look * 0.55 * wave(t + st.seed * 10, 0.37, 0.71, 1.9) + sl * (cfg.sleepHeadYaw || 0);
        head.rotation.x = et * (cfg.eatPitch || 0.8) + Math.sin(t * 7) * 0.04 * et + sl * (cfg.sleepHeadPitch || 0.4) - sw * (cfg.swimHeadUp || 0.25) + si * (cfg.sitHeadPitch || 0)
          + gw * 0.04 * Math.sin(2 * ph) - look * 0.12 * Math.max(0, wave(t * 0.7, 0.23, 0.53, 1.1));
        head.rotation.z = look * 0.08 * Math.sin(t * 0.3 + 2);
      }
      if (tail) {
        tail.rotation.y = (1 - sl) * (0.22 * Math.sin(t * (cfg.tailRate || 1.3)) + gw * 0.15 * Math.sin(ph)) + sl * (cfg.sleepTailYaw || 0);
        tail.rotation.x = (cfg.tailLift || 0) * gw * runW + sl * (cfg.sleepTailPitch || 0) + 0.05 * Math.sin(t * 0.9) - sw * 0.3;
      }
      if (cfg.extra) cfg.extra(N, { t, ph, gw, sl, et, sw, si, runW, dt });
    };
  };
}

// ═══════════════════════════════════════════════════════════════════════════════════
// Bird animator (toucan, macaw, harpy, hummingbird)
// ═══════════════════════════════════════════════════════════════════════════════════
const BIRD_DEF = { hoverFreq: 20, hoverAmp: 0.3, hoverPitch: 0, hoverSweep: 0, flapBias: 0, glideDihedral: 0.08, foldSweep: 1.4, foldDroop: 0, foldRoll: 1.2, perchPitch: 0.4, foldOut: 0, flySpeed: 5 };
export function birdAnimator(cfg) {
  cfg = { ...BIRD_DEF, ...cfg };
  return (N, inner, st) => {
    const P = st.P;
    const { body, head, wl, wr, tail, legs } = N;
    for (const w of [wl, wr]) w.rotation.order = 'YZX';
    let hopPh = 0;
    return (dt, action, speed, night) => {
      let a = action;
      if (a === 'run') a = 'fly';
      if (a === 'hover' && !cfg.hover) a = 'fly';
      if (a === 'hang' || a === 'climb') a = cfg.climb ? 'climb' : 'perch';
      if (a === 'swim') a = 'perch';
      if (!['idle', 'walk', 'fly', 'glide', 'hover', 'perch', 'climb', 'eat', 'sleep'].includes(a)) a = 'perch';
      if (a === 'idle') a = 'perch';
      const airborne = a === 'fly' || a === 'glide' || a === 'hover';
      const t = st.t;
      const fold = P('fold', airborne ? 0 : 1, dt, airborne ? 9 : 5);
      const fl = P('fl', a === 'fly' ? 1 : 0, dt, 5);
      const gl = P('gl', a === 'glide' ? 1 : 0, dt, 4);
      const hv = P('hv', a === 'hover' ? 1 : 0, dt, 6);
      const sl = P('sl', a === 'sleep' ? 1 : 0, dt, 2);
      const et = P('et', a === 'eat' ? 1 : 0, dt, 5);
      const wk = P('wk', a === 'walk' ? 1 : 0, dt, 5);
      const cl = P('cl', a === 'climb' ? 1 : 0, dt, 4);
      const freq = a === 'hover' ? cfg.hoverFreq : cfg.flapFreq * (speed ? clamp(0.8 + speed / (cfg.flySpeed * 4), 0.8, 1.4) : 1);
      st.ph += dt * TAU * (airborne ? freq : 1);
      const ph = st.ph;
      // flap: down-stroke faster (skewed sine)
      const sk = Math.sin(ph - 0.35 * Math.sin(ph));
      const flap = fl * (cfg.flapAmp * sk + cfg.flapBias) + gl * (cfg.glideDihedral + 0.04 * Math.sin(t * 1.3)) + hv * (cfg.hoverAmp * Math.sin(ph));
      const gr = 1 - fold;
      // wings: right (+X) and mirrored left
      const sweep = fold * cfg.foldSweep + hv * (cfg.hoverSweep || 0) * Math.sin(ph + 1.2);
      const droop = fold * cfg.foldDroop;
      const roll = fold * cfg.foldRoll + gr * (fl * 0.25 * Math.cos(ph) + hv * 0.5 * Math.cos(ph));
      wr.rotation.set(roll, sweep, flap + droop);
      wl.rotation.set(roll, -sweep, -(flap + droop));
      wr.position.x = wr.userData.base.x + fold * cfg.foldOut; wl.position.x = wl.userData.base.x - fold * cfg.foldOut;
      wr.position.y = wl.position.y = wr.userData.base.y + fold * (cfg.foldUp || 0);
      { const sx = (1 - fl * (cfg.wingStretch || 0) * Math.max(0, -sk)) * lerp(1, cfg.foldScale || 1, fold); wr.scale.x = wl.scale.x = sx; }
      // body attitude
      const bank = (fl + gl) * (cfg.bank ?? 0.22) * wave(t * 0.6 + st.seed * 5, 0.5, 1.1, 2.3);
      const pitch = fold * (-cfg.perchPitch) + fl * (cfg.flyPitch || 0) + hv * (-cfg.hoverPitch || 0) + sl * 0.15 + cl * -1.25;
      body.rotation.x = pitch + fl * 0.05 * Math.sin(ph + 1.5) + et * 0.25;
      body.rotation.z = bank;
      // hop on walk
      if (wk > 0.01) { hopPh += dt * TAU * 2.2; }
      const hop = wk * Math.abs(Math.sin(hopPh)) * 0.06 * cfg.size;
      body.position.y = body.userData.base.y + hop + fl * 0.04 * cfg.size * -sk + hv * 0.01 * Math.sin(t * 9);
      body.scale.setScalar(1 + sl * 0.06 + Math.sin(t * 2.6) * 0.008);
      // head
      if (head) {
        const look = fold * (1 - sl);
        const jerk = Math.floor(t * 1.3 + st.seed * 7);
        const ty = (hash3(jerk, 3, 1, 9) - 0.5) * 1.5 * look * (1 - et);
        const yawS = P('hy', ty, dt, 14);
        head.rotation.y = yawS + sl * 2.4;
        head.rotation.x = -pitch * 0.85 * (1 - sl) + et * (0.6 + 0.25 * Math.sin(t * 6)) + sl * 0.5 + gr * 0.1 - cl * 0.2;
        head.rotation.z = (fl + gl) * -bank * 0.6;
      }
      if (tail) {
        const flick = fold * (Math.max(0, Math.sin(t * 1.7 + st.seed * 3)) ** 12) * 0.35;
        tail.rotation.x = -flick + gr * (cfg.tailFly || 0) + fl * 0.06 * Math.sin(ph) + cl * 0.35 + fold * (cfg.tailPerch || 0);
        tail.scale.x = 1 + (gl + fl * 0.5) * 0.35 + hv * 0.4;
        tail.rotation.y = (fl + gl) * -bank * 0.5;
      }
      if (legs) legs.rotation.x = gr * 1.3;
      if (cfg.extra) cfg.extra(N, { t, ph, fold, fl, gl, hv, sl, et, wk, cl });
    };
  };
}
