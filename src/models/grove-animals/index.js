// Grove (Israeli Mediterranean woodland / חורש ארץ-ישראלי) animal models.
// Procedural, softly shaded (smooth normals, per-vertex colour gradients) models with procedural animation.
// export ANIMALS = { id: (opts) => AnimalVisual | ColonyVisual | SwarmVisual }
// Models face +Z. Ground animals: origin at ground under body. Flyers: origin at body centre
// (birds also expose `perchOffset` = distance from origin down to the feet when perched).
// 1.3.2: split from the single src/models/grove-animals.js into this folder (pure move; same exports).
// src/models/grove-animals.js re-exports this file, so importers are unchanged. Parts, in their original order:
//   kit.js            colours, materials, geometry helpers, spec cache, makeAnimal
//   animators.js      quadAnim, birdAnim, lizardAnim and their helpers
//   quadrupeds.js     gazelle, fox, porcupine, hedgehog, hyrax, spiny mouse geometry
//   birds-lizards.js  jay, blackbird, owl, chameleon, agama geometry
//   insects.js        bee, butterfly, harvester ants, fireflies, and releaseCaches
// This file: the per-species animation configs and the ANIMALS table.
import * as THREE from 'three';
import { damp } from '../../core/util.js';
import { makeAnimal } from './kit.js';
import { pulser, quadAnim, birdAnim, lizardAnim } from './animators.js';
import { buildGazelle, buildFox, buildPorcupine, buildHedgehog, buildHyrax, buildSpinyMouse } from './quadrupeds.js';
import { buildJay, buildBlackbird, buildOwl, buildChameleon, buildAgama } from './birds-lizards.js';
import { buildBee, buildButterfly, insectAnim, makeHarvesterAnts, makeFireflies } from './insects.js';

// ---------------------------------------------------------------- per-species animation configs
const GAZELLE_ANIM = quadAnim({
  walkSpeed: 0.9, runSpeed: 6, walkStride: 1.0, runStride: 3.2, walkAmp: 0.42, runAmp: 0.85, lift: 0.14, hindAmp: 1.1,
  runOff: [0, 0.25, Math.PI * 0.95, Math.PI * 1.15], walkBob: 0.025, runLift: 0.32, runPitch: 0.16, airPhase: 0.6,
  foldF: -1.5, foldH: -1.45, sleepDrop: 0.6, sleepShrink: 0.42, sleepNeck: 0.6, sleepHead: 0.5, sleepYaw: 1.1, sleepRoll: 0.06,
  eatNeck: 2.05, eatHead: -0.85, eatPitch: 0.12, eatDrop: 0.03, eatSplay: -0.1, lookYaw: 0.8, lookPitch: 0.15,
  tailIdle: 0.05, tailHz: 1, tailWalk: 0.1, tailFlick: true, tailRunLift: 0.8, nod: 0.08,
});
const FOX_ANIM = quadAnim({
  walkSpeed: 0.8, runSpeed: 4.5, walkStride: 0.6, runStride: 1.6, walkAmp: 0.48, runAmp: 0.9, lift: 0.15,
  walkBob: 0.012, runLift: 0.12, runPitch: 0.12, airPhase: 0.4,
  foldF: -1.45, foldH: -1.4, sleepDrop: 0.27, sleepShrink: 0.35, sleepHead: 0.35, sleepYaw: 1.25, sleepRoll: 0.15, sleepTail: 1.1, sleepTailX: -0.45,
  eatHead: 0.95, eatPitch: 0.18, eatDrop: 0.03, lookYaw: 0.8, lookPitch: 0.2,
  tailIdle: 0.15, tailHz: 1.1, tailWalk: 0.12, tailRunLift: -0.35, tailWalkLift: -0.1, nod: 0.05, sniff: true,
});
const PORCUPINE_ANIM = quadAnim({
  walkSpeed: 0.35, runSpeed: 1.6, walkStride: 0.32, runStride: 0.5, walkAmp: 0.45, runAmp: 0.6, lift: 0.18,
  walkBob: 0.008, runLift: 0.02, runPitch: 0.05, roll: 0.07, yawSway: 0.04,
  foldF: 1.2, foldH: 1.2, sleepDrop: 0.1, sleepShrink: 0.4, sleepHead: 0.4, sleepYaw: 0.5,
  eatHead: 0.55, eatPitch: 0.06, lookYaw: 0.5, lookPitch: 0.1, nod: 0.06, sniff: true,
  extra(n, st, s, dt, w) {
    const alarm = s.alarm || s.action === 'run' ? 1 : 0;
    const shimmer = pulser(st, 'qr', w.rng, dt, 5, 12, 1.2) * w.idleW * 0.35;
    st.raise = damp(st.raise ?? 0, Math.max(alarm, shimmer), alarm ? 6 : 2.5, dt);
    n.quillsMesh.morphTargetInfluences[0] = st.raise;
    n.quills.rotation.z = Math.sin(w.t * 34) * 0.025 * st.raise + Math.sin(w.t * 3) * 0.01 * w.wm;
  },
});
const HEDGEHOG_ANIM = quadAnim({
  walkSpeed: 0.3, runSpeed: 1.2, walkStride: 0.14, runStride: 0.22, walkAmp: 0.6, runAmp: 0.7, lift: 0.2,
  walkBob: 0.006, runLift: 0.01, runPitch: 0.03, roll: 0.05,
  foldF: 0.6, foldH: 0.6, sleepDrop: 0.03, sleepShrink: 0.7, sleepHead: 1.5, sleepYaw: 0,
  eatHead: 0.6, eatPitch: 0.08, lookYaw: 0.5, lookPitch: 0.12, nod: 0.05, sniff: true,
  extra(n, st, s, dt, w) { // curl into a ball when sleeping
    n.body.rotation.x = w.ws * 0.45; n.head.position.z = n.head.userData.base.z - w.ws * 0.05; n.head.position.y = n.head.userData.base.y - w.ws * 0.02;
    const sc = 1 - w.ws * 0.6; n.head.scale.set(sc, sc, sc);
  },
});
const HYRAX_ANIM = quadAnim({
  walkSpeed: 0.5, runSpeed: 2.4, walkStride: 0.3, runStride: 0.7, walkAmp: 0.5, runAmp: 0.75, lift: 0.18,
  walkBob: 0.01, runLift: 0.05, runPitch: 0.1, roll: 0.04,
  foldF: 1.2, foldH: 1.2, sleepDrop: 0.09, sleepShrink: 0.3, sleepHead: 0.35, sleepYaw: 0.3,
  eatHead: 0.7, eatPitch: 0.08, lookYaw: 0.7, lookPitch: 0.15, nod: 0.05,
  extra(n, st, s, dt, w) { // basking: in idle, alternate between alert sitting and lying flat sprawled on the warm rock
    st.baskT = (st.baskT ?? (w.rng() * 6)) - dt;
    if (st.baskT <= 0) { st.basking = !st.basking; st.baskT = st.basking ? 6 + w.rng() * 6 : 4 + w.rng() * 4; }
    st.wBask = damp(st.wBask ?? 0, st.basking ? w.idleW : 0, 1.5, dt);
    const b = Math.max(st.wBask, w.ws * 0.6);
    n.body.position.y -= b * 0.08;
    for (const [k, sd] of [['legFL', 1], ['legFR', -1], ['legHL', 1], ['legHR', -1]]) { n[k].rotation.z = -sd * b * 1.1; n[k].rotation.x += (k[3] === 'F' ? -0.5 : 0.6) * b * 0.6; }
    n.head.rotation.x += b * 0.12; n.head.rotation.y *= 1 - b * 0.7;
  },
});
const MOUSE_ANIM = quadAnim({
  walkSpeed: 0.4, runSpeed: 2.0, walkStride: 0.09, runStride: 0.2, walkAmp: 0.65, runAmp: 0.8, lift: 0.2,
  runOff: [0, 0.2, Math.PI, Math.PI + 0.2], walkBob: 0.004, runLift: 0.02, runPitch: 0.15,
  foldF: 0.8, foldH: 0.8, sleepDrop: 0.02, sleepShrink: 0.5, sleepHead: 0.6, sleepYaw: 0.6, sleepTail: 1.4,
  eatHead: 0.35, eatPitch: -0.25, lookYaw: 0.9, lookPitch: 0.25, nod: 0.06, sniff: true,
  tailIdle: 0.15, tailHz: 0.8, tailWalk: 0.25,
  extra(n, st, s, dt, w) { // sits up to nibble seeds
    n.legFL.rotation.x += w.we * -0.9;
  },
});
const JAY_ANIM = birdAnim({ flapHz: 4.2, flapAmp: 0.95, flapBias: 0.15, upFold: 0.25, bodyBob: 0.02, burstCycle: 1.8, burstFrac: 0.7, hopH: 0.05, hopHz: 2.6, flick: 0.5, sweep: 0.15, sleepHeadY: 2.6, sleepTuck: 0.03 });
const BLACKBIRD_ANIM = birdAnim({ flapHz: 5, flapAmp: 0.95, flapBias: 0.15, upFold: 0.3, bodyBob: 0.018, burstCycle: 1.4, burstFrac: 0.7, hopH: 0.045, hopHz: 3.2, flick: 0.7, flickGap: [1, 3], sweep: 0.1, sleepHeadY: 2.6, sleepTuck: 0.03 });
const OWL_ANIM = birdAnim({ flapHz: 2.0, flapAmp: 0.75, flapBias: 0.08, upFold: 0.15, bodyBob: 0.04, burstCycle: 3.2, burstFrac: 0.5, dihedral: 0.05, hopH: 0.03, hopHz: 2, flick: 0.15, lookYaw: 1.2, sweep: 0.1, sleepHeadY: 0.0, sleepHeadX: 0.25, foldDroop: 0.05, foldTuck: 0.06, foldScale: 0.62 });
const CHAMELEON_ANIM = lizardAnim({
  walkSpeed: 0.05, runSpeed: 0.12, stride: 0.09, undulate: 0.04, swing: 0.5, legAxis: 'x', hesitant: true, rock: 0.006, tailCurl: true, sleepDrop: 0.01, lookYaw: 0.25,
  colorShift: [new THREE.Color(1, 1, 1), new THREE.Color(1.25, 1.12, 0.55), new THREE.Color(0.78, 0.82, 0.62), new THREE.Color(1.1, 1.05, 0.8), new THREE.Color(0.95, 1.05, 0.95)],
});
const AGAMA_ANIM = lizardAnim({ walkSpeed: 0.35, runSpeed: 2.2, stride: 0.12, undulate: 0.22, swing: 0.7, headBob: true, bask: true, sleepDrop: 0.012, lookYaw: 0.5 });

// ---------------------------------------------------------------- export
export const ANIMALS = {
  honeybee: (o) => makeAnimal('honeybee', o, buildBee, insectAnim('bee')),
  butterfly: (o) => makeAnimal('butterfly', o, buildButterfly, insectAnim('butterfly')),
  harvesterant: (o) => makeHarvesterAnts(o),
  firefly: (o) => makeFireflies(o),
  jay: (o) => makeAnimal('jay', o, buildJay, JAY_ANIM),
  blackbird: (o) => makeAnimal('blackbird', o, buildBlackbird, BLACKBIRD_ANIM),
  chameleon: (o) => makeAnimal('chameleon', o, buildChameleon, CHAMELEON_ANIM, { perInstanceMaterial: true }),
  agama: (o) => makeAnimal('agama', o, buildAgama, AGAMA_ANIM),
  spinymouse: (o) => makeAnimal('spinymouse', o, buildSpinyMouse, MOUSE_ANIM),
  porcupine: (o) => makeAnimal('porcupine', o, buildPorcupine, PORCUPINE_ANIM),
  hedgehog: (o) => makeAnimal('hedgehog', o, buildHedgehog, HEDGEHOG_ANIM),
  hyrax: (o) => makeAnimal('hyrax', o, buildHyrax, HYRAX_ANIM),
  gazelle: (o) => makeAnimal('gazelle', o, buildGazelle, GAZELLE_ANIM),
  fox: (o) => makeAnimal('fox', o, buildFox, FOX_ANIM),
  owl: (o) => makeAnimal('owl', o, buildOwl, OWL_ANIM),
};
export default ANIMALS;

export { releaseCaches } from './insects.js';
