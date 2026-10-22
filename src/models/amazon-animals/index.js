// Amazon animals — procedural stylised low-poly models + procedural animation.
// Contract: CONTRACT.md §4.  export const ANIMALS = { id: (opts) => AnimalVisual | ColonyVisual }
//
// Extra (non-contract, optional) fields on every AnimalVisual:
//   actions : string[]            actions this species really animates (others fall back gracefully)
//   speeds  : { walk, run, fly }  natural speeds in m/s (gait frequency is derived from s.speed when given)
//   gripY   : { perch?, hang?, climb? } local y of the grip point (feet / hooks) for that pose – core can place
//             the object at branchY - gripY. Ground animals' hang/climb poses already have the grip at the origin.
// Pose conventions:
//   ground animals: origin = contact point. 'hang' → hanging upside-down under a branch running along Z at y=0.
//                   'climb' → body vertical, head up (+Y), belly toward +Z (the trunk surface is at the origin, +Z side).
//   flyers: origin = body centre (as contract).  perch → feet at gripY.perch.
// 1.3.2: split from the single src/models/amazon-animals.js into this folder (pure move; same exports).
// src/models/amazon-animals.js re-exports this file, so importers are unchanged. Parts, in their original order:
//   kit.js         geometry toolkit, materials, rig assembly, makeVisual
//   animators.js   quadruped and bird animators
//   mammals.js     jaguar, tapir, capybara, agouti, sloth, howler geometry
//   flyers.js      toucan, macaw, harpy, hummingbird, morpho, orchid bee, dart frog, fruit bat geometry
//   species.js     ANIM: each species = geometry + animation config
//   leafcutter.js  the leafcutter colony, and releaseCaches
import { ANIM } from './species.js';

export const ANIMALS = {
  leafcutter: ANIM.leafcutter,
  orchidbee: ANIM.orchidbee,
  morpho: ANIM.morpho,
  hummingbird: ANIM.hummingbird,
  dartfrog: ANIM.dartfrog,
  toucan: ANIM.toucan,
  macaw: ANIM.macaw,
  sloth: ANIM.sloth,
  agouti: ANIM.agouti,
  howler: ANIM.howler,
  jaguar: ANIM.jaguar,
  harpy: ANIM.harpy,
  capybara: ANIM.capybara,
  tapir: ANIM.tapir,
  fruitbat: ANIM.fruitbat,
};
export { releaseCaches } from './leafcutter.js';
