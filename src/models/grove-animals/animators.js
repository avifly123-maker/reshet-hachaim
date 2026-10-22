// Grove animals: the shared procedural animators (moved unchanged from grove-animals.js).
// lookAround, pulser, and the animator factories quadAnim (mammals), birdAnim (jay, blackbird, owl),
// lizardAnim (chameleon, agama). Needs: kit.js.
import * as THREE from 'three';
import { clamp, lerp, damp, smoothstep } from '../../core/util.js';
import { TAU, V3, K, _col } from './kit.js';

// ---------------------------------------------------------------- shared animation helpers
function lookAround(st, rng, dt, yawMax, pitchMax, minT = 1.4, maxT = 4.5, snap = 4) {
  st.lookT = (st.lookT ?? 0) - dt;
  if (st.lookT <= 0) {
    st.lookT = minT + rng() * (maxT - minT);
    st.tYaw = rng() < 0.3 ? 0 : (rng() * 2 - 1) * yawMax;
    st.tPitch = (rng() * 2 - 1) * pitchMax;
  }
  st.yaw = damp(st.yaw ?? 0, st.tYaw ?? 0, snap, dt);
  st.pitch = damp(st.pitch ?? 0, st.tPitch ?? 0, snap, dt);
}
// burst envelope helper: occasionally triggers a short pulse; returns 0..1
export function pulser(st, key, rng, dt, minGap, maxGap, dur) {
  const k = key + 'T', g = key + 'G';
  if (st[g] === undefined) st[g] = minGap + rng() * (maxGap - minGap);
  st[g] -= dt;
  if (st[g] <= 0) { st[k] = dur; st[g] = minGap + rng() * (maxGap - minGap) + dur; st[key + 'S'] = rng() < 0.5 ? 1 : -1; }
  if (st[k] > 0) { st[k] -= dt; return Math.sin(clamp(1 - st[k] / dur) * Math.PI); }
  return 0;
}

// Quadruped animator: gait (walk = lateral sequence, run = gallop/bound), bob, tail, head look, ears, eat, sleep.
export function quadAnim(cfg) {
  return (n, spec, rng, inst) => {
    const st = { ph: rng() * TAU, t: rng() * 100, wMove: 0, wRun: 0, wSleep: 0, wEat: 0, eatLift: 0 };
    const legs = ['legFL', 'legFR', 'legHL', 'legHR'].map(k => n[k]);
    const walkOff = [Math.PI * 0.5, Math.PI * 1.5, 0, Math.PI];
    const runOff = cfg.runOff || [0, 0.4, Math.PI, Math.PI + 0.4];
    const B = n.body.userData.base;
    return (dt, s) => {
      const a = s.action || 'idle'; st.t += dt; const t = st.t;
      const moving = a === 'walk' || a === 'run' || a === 'climb' || a === 'swim';
      const run = a === 'run';
      let spd = s.speed || 0; if (moving && spd < 0.05) spd = run ? cfg.runSpeed : cfg.walkSpeed;
      st.wMove = damp(st.wMove, moving ? 1 : 0, 6, dt);
      st.wRun = damp(st.wRun, run ? 1 : 0, 4, dt);
      st.wSleep = damp(st.wSleep, a === 'sleep' ? 1 : 0, 2.2, dt);
      st.wEat = damp(st.wEat, a === 'eat' ? 1 : 0, 3.5, dt);
      const wm = st.wMove, wr = st.wRun, ws = st.wSleep, we = st.wEat * (1 - ws);
      const stride = lerp(cfg.walkStride, cfg.runStride, wr);
      if (moving) st.ph += dt * Math.min(spd, cfg.runSpeed * 1.5) / stride * TAU;
      const amp = lerp(cfg.walkAmp, cfg.runAmp, wr) * wm;
      for (let i = 0; i < 4; i++) {
        const L = legs[i]; const front = i < 2;
        const ph = st.ph + lerp(walkOff[i], runOff[i], wr);
        const sw = Math.sin(ph), lift = Math.max(0, Math.cos(ph));
        L.rotation.x = -amp * sw * (front ? 1 : cfg.hindAmp || 1) + ws * (front ? -cfg.foldF : cfg.foldH) + we * (front ? cfg.eatSplay || 0 : 0);
        L.rotation.z = 0;
        L.scale.y = 1 - cfg.lift * lift * wm - ws * (cfg.sleepShrink || 0);
      }
      // body motion
      const idleW = (1 - wm) * (1 - ws) * (1 - we);
      const breathe = Math.sin(t * (ws > 0.5 ? 1.4 : 2.4)) * (0.012 + 0.02 * ws);
      const walkBob = cfg.walkBob * (0.5 + 0.5 * Math.cos(2 * st.ph)) * (1 - wr);
      const air = Math.pow(Math.max(0, Math.sin(st.ph - (cfg.airPhase || 0))), 1.5);
      n.rig.position.y = wm * (walkBob + wr * cfg.runLift * air);
      n.rig.rotation.x = wr * wm * cfg.runPitch * Math.cos(st.ph) + we * (cfg.eatPitch || 0);
      n.body.position.y = B.y - ws * cfg.sleepDrop - we * (cfg.eatDrop || 0);
      n.body.rotation.z = wm * (1 - wr) * (cfg.roll || 0.02) * Math.sin(st.ph) + ws * (cfg.sleepRoll || 0);
      n.body.rotation.y = wm * (cfg.yawSway || 0) * Math.sin(st.ph);
      n.body.scale.set(1 + breathe * 0.6, 1 + breathe, 1);
      // head
      lookAround(st, rng, dt, cfg.lookYaw ?? 0.7, cfg.lookPitch ?? 0.2);
      // vigilance while eating: lift head periodically
      const lift = pulser(st, 'eatL', rng, dt, 3.5, 7, 1.6) * we;
      st.eatLift = damp(st.eatLift, lift, 6, dt);
      const eatW = we * (1 - st.eatLift);
      const chew = Math.sin(t * 9) * 0.04 * eatW;
      const nodWalk = wm * (cfg.nod || 0.05) * Math.sin(2 * st.ph + 0.5);
      const head = n.head;
      if (n.neck) {
        n.neck.rotation.x = eatW * cfg.eatNeck + ws * (cfg.sleepNeck || 0) + nodWalk + idleW * st.pitch * 0.4 - wr * 0.15;
        n.neck.rotation.y = st.yaw * idleW * 0.5 + ws * (cfg.sleepYaw || 0) * 0.5;
        head.rotation.x = eatW * cfg.eatHead + ws * (cfg.sleepHead || 0) + idleW * st.pitch * 0.6 + chew;
        head.rotation.y = st.yaw * idleW * 0.6 + ws * (cfg.sleepYaw || 0) * 0.5 + st.eatLift * st.yaw * 0.8;
      } else {
        head.rotation.x = eatW * cfg.eatHead + ws * (cfg.sleepHead || 0) + idleW * st.pitch + nodWalk + chew - wr * (cfg.runHeadUp || 0);
        head.rotation.y = st.yaw * (idleW + st.eatLift * 0.6) + ws * (cfg.sleepYaw || 0);
      }
      if (cfg.sniff) { head.rotation.x += Math.sin(t * 17) * 0.05 * (1 - ws) * (idleW + we); }
      // ears: twitch + back when running
      const tw = pulser(st, 'ear', rng, dt, 1.2, 4.5, 0.28);
      for (const [k, side] of [['earL', 1], ['earR', -1]]) {
        const e = n[k]; if (!e) continue;
        const mine = (st.earS === side) ? tw : 0;
        e.rotation.z = -side * mine * 0.45; e.rotation.x = -wr * 0.6 - ws * 0.5 + mine * 0.2;
      }
      // tail
      if (n.tail) {
        const flick = cfg.tailFlick ? pulser(st, 'flick', rng, dt, 0.6, 2.5, 0.5) : 0;
        n.tail.rotation.y = idleW * (cfg.tailIdle || 0.1) * Math.sin(t * (cfg.tailHz || 1.3)) + wm * (cfg.tailWalk || 0.15) * Math.sin(st.ph)
          + flick * Math.sin(t * 30) * 0.5 + ws * (cfg.sleepTail || 0);
        n.tail.rotation.x = -wr * (cfg.tailRunLift || 0) + wm * (1 - wr) * (cfg.tailWalkLift || 0) - flick * 0.4 + ws * (cfg.sleepTailX || 0);
      }
      if (cfg.extra) cfg.extra(n, st, s, dt, { wm, wr, ws, we, idleW, t, rng });
    };
  };
}

// Bird animator: perched (tilted, wings folded, head turns, tail flicks, hops, pecks, sleep tuck) ↔ flight
// (flap / glide / hover, banking from yaw rate).
export function birdAnim(cfg) {
  return (n, spec, rng, inst) => {
    const st = { ph: rng() * TAU, hop: 0, t: rng() * 100, wFly: 0, wGlide: 0, wHover: 0, wSleep: 0, wEat: 0, fold: 1, prevYaw: null, bank: 0, burst: 0 };
    const tilt = spec.tilt;
    // folded wing: span → backward along the flank, upper surface facing outward, slight droop & tuck
    const fq = (sd) => {
      const m = new THREE.Matrix4().makeBasis(new V3(0, 0, -sd), new V3(sd, 0, 0), new V3(0, -1, 0));
      const q = new THREE.Quaternion().setFromRotationMatrix(m);
      const adj = new THREE.Quaternion().setFromEuler(new THREE.Euler(-(cfg.foldDroop ?? 0.12), sd * (cfg.foldTuck ?? 0.1), 0, 'XYZ'));
      return adj.multiply(q);
    };
    const qFoldL = fq(1), qFoldR = fq(-1);
    const qa = new THREE.Quaternion(), e = new THREE.Euler();
    return (dt, s) => {
      const a = s.action || 'perch'; st.t += dt; const t = st.t;
      const flying = a === 'fly' || a === 'glide' || a === 'hover';
      st.wFly = damp(st.wFly, flying ? 1 : 0, 5, dt);
      st.wHover = damp(st.wHover, a === 'hover' ? 1 : 0, 4, dt);
      st.wSleep = damp(st.wSleep, a === 'sleep' ? 1 : 0, 2.5, dt);
      st.wEat = damp(st.wEat, a === 'eat' ? 1 : 0, 5, dt);
      const wf = st.wFly;
      // flight: bursts of flapping and glides (owl: long glides; songbirds: undulating)
      let flapAmt = 0, freq = cfg.flapHz;
      if (a === 'fly') {
        st.burst += dt;
        const cyc = cfg.burstCycle || 0; let flapping = true;
        if (cyc) flapping = (st.burst % cyc) < cyc * (cfg.burstFrac || 0.65);
        flapAmt = flapping ? 1 : 0;
      } else if (a === 'hover') { flapAmt = 1; freq *= 1.6; }
      st.wGlide = damp(st.wGlide, flying ? 1 - flapAmt : 0, 4, dt);
      st.flapW = damp(st.flapW ?? 0, flapAmt * wf, 6, dt);
      st.ph += dt * freq * TAU;
      const flap = cfg.flapAmp * Math.sin(st.ph) * st.flapW + cfg.flapBias * st.flapW + st.wGlide * (cfg.dihedral || 0.08) + Math.sin(t * 1.3) * 0.03 * st.wGlide;
      const upFold = st.flapW * cfg.upFold * Math.max(0, Math.cos(st.ph + 0.6));
      // perched fold amount (wings tucked) -> slight droop/flick while perched
      const droop = (1 - wf) * 0.06 * pulser(st, 'wflick', rng, dt, 3, 8, 0.4);
      const fold = clamp((1 - wf) * (1 - droop) + upFold);
      for (const [k, side, qF] of [['wingL', 1, qFoldL], ['wingR', -1, qFoldR]]) {
        const w = n[k];
        e.set(0, side * (cfg.sweep || 0) * st.wGlide, side * flap, 'XYZ'); qa.setFromEuler(e);
        w.quaternion.copy(qa).slerp(qF, fold);
        w.scale.setScalar(lerp(1, cfg.foldScale ?? 1, fold));
      }
      // bank from yaw rate
      const yaw = n.rig.parent.rotation.y;
      if (st.prevYaw === null) st.prevYaw = yaw;
      let dy = yaw - st.prevYaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); st.prevYaw = yaw;
      const yawRate = dt > 0 ? dy / dt : 0;
      st.bank = damp(st.bank, clamp(-yawRate * 0.35, -0.6, 0.6) * wf, 4, dt);
      // posture
      const hoverPitch = -0.7 * st.wHover;
      n.rig.rotation.x = lerp(-tilt, 0.04 + hoverPitch, wf);
      n.rig.rotation.z = st.bank;
      n.rig.position.y = wf * (-cfg.bodyBob * Math.sin(st.ph) * st.flapW);
      // hop (walk on ground / branch)
      const walking = a === 'walk' || a === 'run';
      if (walking) st.hop += dt * (cfg.hopHz || 2.4) * TAU;
      const hopY = walking ? Math.max(0, Math.sin(st.hop)) * (cfg.hopH || 0.04) : 0;
      st.hopY = damp(st.hopY ?? 0, hopY, 20, dt);
      n.rig.position.y += st.hopY;
      // head: quick saccades when perched; peck when eating; tuck when sleeping
      lookAround(st, rng, dt, cfg.lookYaw ?? 1.1, 0.2, 0.5, 2.2, 14);
      const perchW = (1 - wf) * (1 - st.wSleep);
      const peck = st.wEat * Math.max(0, Math.sin(t * 7)) ** 3 * 0.9;
      n.head.rotation.x = lerp(tilt, 0, wf) + st.pitch * perchW * (1 - st.wEat) + peck + st.wEat * 0.35 + st.wSleep * (cfg.sleepHeadX ?? 0.4) + wf * 0.1 * st.wHover;
      n.head.rotation.y = st.yaw * perchW * (1 - st.wEat * 0.7) + st.wSleep * (cfg.sleepHeadY ?? 2.4);
      n.head.position.z = n.head.userData.base.z - st.wSleep * (cfg.sleepTuck || 0);
      const puff = 1 + st.wSleep * 0.08 + Math.sin(t * 2.2) * 0.012 * (1 - wf);
      n.body.scale.set(puff, puff, 1);
      // tail flicks (blackbird/jay cock tails)
      const flick = pulser(st, 'tflick', rng, dt, cfg.flickGap?.[0] ?? 1.5, cfg.flickGap?.[1] ?? 4, 0.3) * (1 - wf);
      if (n.tail) {
        n.tail.rotation.x = flick * (cfg.flick || 0.5) + wf * (0.15 * st.wHover - 0.05) + st.hopY * 4;
        const spread = 1 + wf * 0.35 * (st.wGlide + st.wHover);
        n.tail.scale.set(spread, 1, 1);
      }
    };
  };
}

// Lizard animator: sprawling diagonal gait with lateral body undulation, head bob displays, basking, tongue.
export function lizardAnim(cfg) {
  return (n, spec, rng, inst, ownMat) => {
    const st = { ph: rng() * TAU, t: rng() * 100, wMove: 0, wSleep: 0, wEat: 0, wClimb: 0, tint: new THREE.Color(1, 1, 1), tintT: new THREE.Color(1, 1, 1), tintTimer: 0, eyeL: [0, 0], eyeR: [0, 0], eyeTL: [0, 0], eyeTR: [0, 0] };
    const legs = ['legFL', 'legFR', 'legHL', 'legHR'].map(k => n[k]);
    const sides = [1, -1, 1, -1]; const off = [0, Math.PI, Math.PI, 0];
    const B = n.body.userData.base;
    return (dt, s) => {
      const a = s.action || 'idle'; st.t += dt; const t = st.t;
      const moving = a === 'walk' || a === 'run' || a === 'climb' || a === 'swim';
      let spd = s.speed || 0; if (moving && spd < 0.02) spd = a === 'run' ? cfg.runSpeed : cfg.walkSpeed;
      st.wMove = damp(st.wMove, moving ? 1 : 0, 6, dt);
      st.wSleep = damp(st.wSleep, a === 'sleep' ? 1 : 0, 2, dt);
      st.wEat = damp(st.wEat, a === 'eat' ? 1 : 0, 5, dt);
      st.wClimb = damp(st.wClimb, a === 'climb' ? 1 : 0, 3, dt);
      const wm = st.wMove, ws = st.wSleep, we = st.wEat;
      // chameleon: hesitant stop-go; others continuous
      let gate = 1; if (cfg.hesitant) gate = 0.25 + 0.75 * smoothstep(-0.2, 0.6, Math.sin(t * 0.9));
      if (moving) st.ph += dt * Math.min(spd, cfg.runSpeed * 1.4) / cfg.stride * TAU * gate;
      const und = cfg.undulate * wm;
      n.body.rotation.y = und * Math.sin(st.ph);
      for (let i = 0; i < 4; i++) {
        const L = legs[i]; const ph = st.ph + off[i];
        const sw = Math.sin(ph), lift = Math.max(0, Math.cos(ph));
        if (cfg.legAxis === 'x') { L.rotation.x = -cfg.swing * wm * sw; L.rotation.z = sides[i] * lift * wm * 0.25; }
        else { L.rotation.y = sides[i] * cfg.swing * wm * sw; L.rotation.z = -sides[i] * lift * wm * 0.35; }
        L.rotation.z += -sides[i] * ws * 0.3;
      }
      // head bob display (agama) – push-ups while idle
      const idleW = (1 - wm) * (1 - ws) * (1 - we);
      let bob = 0;
      if (cfg.headBob) {
        const p = pulser(st, 'bob', rng, dt, 2.5, 6, 1.6);
        bob = p > 0 ? Math.max(0, Math.sin((1.6 - (st.bobT || 0)) / 1.6 * Math.PI * 3)) * idleW : 0;
      }
      lookAround(st, rng, dt, cfg.lookYaw ?? 0.4, 0.12, 1.5, 4);
      n.body.position.y = B.y + bob * 0.025 - ws * cfg.sleepDrop + (cfg.bask ? Math.sin(t * 0.7) * 0.002 : 0);
      n.body.position.z = B.z + (cfg.rock ? Math.sin(t * 5.5) * cfg.rock * (0.4 + wm) : 0);
      n.rig.rotation.x = -bob * 0.22 - st.wClimb * 0.15;
      n.head.rotation.y = -und * 0.8 * Math.sin(st.ph) + st.yaw * idleW;
      // eating: lunge (agama) / tongue shot (chameleon)
      let shot = 0;
      if (n.tongue) {
        const p = pulser(st, 'tg', rng, dt, 1.5, 3.5, 0.45) * we;
        shot = p; n.tongue.scale.set(1, 1, Math.max(0.001, p));
        n.tongue.visible = p > 0.01;
      }
      const lunge = !n.tongue ? we * Math.max(0, Math.sin(t * 4)) ** 4 : 0;
      n.head.rotation.x = st.pitch * idleW - bob * 0.35 + ws * 0.15 + lunge * 0.4 - shot * 0.1;
      n.body.position.z += lunge * 0.02;
      if (n.tail) {
        n.tail.rotation.y = -cfg.undulate * 1.4 * wm * Math.sin(st.ph - 0.9) + Math.sin(t * 0.6) * 0.05 * idleW;
        n.tail.rotation.x = cfg.tailCurl ? Math.sin(t * 0.5) * 0.08 + wm * 0.1 * Math.sin(st.ph) : 0;
      }
      // turret eyes, each moving independently
      if (n.eyeL) {
        for (const [k, cur, tgt, key] of [['eyeL', st.eyeL, st.eyeTL, 'eL'], ['eyeR', st.eyeR, st.eyeTR, 'eR']]) {
          st[key] = (st[key] ?? 0) - dt;
          if (st[key] <= 0) { st[key] = 0.4 + rng() * 2; tgt[0] = (rng() * 2 - 1) * 0.9; tgt[1] = (rng() * 2 - 1) * 0.5; }
          if (we > 0.5) { tgt[0] = k === 'eyeL' ? 0.9 : -0.9; tgt[1] = 0.1; }
          cur[0] = damp(cur[0], tgt[0], 12, dt); cur[1] = damp(cur[1], tgt[1], 12, dt);
          n[k].rotation.set(0, cur[0], cur[1]); const sc = 1 - ws * 0.4; n[k].scale.set(sc, sc, sc);
        }
      }
      // colour shift (chameleon) via per-instance material tint
      if (ownMat && cfg.colorShift) {
        st.tintTimer -= dt;
        if (st.tintTimer <= 0) { st.tintTimer = 5 + rng() * 6; st.tintT.copy(rng.pick(cfg.colorShift)); }
        const night = s.night || 0;
        const tgt = _col.copy(st.tintT).lerp(K('#e8f0c8').clone().multiplyScalar(1.5), night * 0.6 + ws * 0.3);
        st.tint.r = damp(st.tint.r, tgt.r, 0.6, dt); st.tint.g = damp(st.tint.g, tgt.g, 0.6, dt); st.tint.b = damp(st.tint.b, tgt.b, 0.6, dt);
        ownMat.color.copy(st.tint);
      }
    };
  };
}
