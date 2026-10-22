// Amazon animals — EXTRA species (anteater, kinkajou, coati).
// Same contract & conventions as src/models/amazon-animals.js (CONTRACT.md §4): AnimalVisual with
// actions / speeds / gripY extras. amazon-animals.js exports only ANIMALS, so the geometry toolkit,
// rig assembly and quadruped animator below are copied verbatim from it (keep in sync if the style changes).
//   anteater : ground quadruped – idle, walk, run, eat (snout down, tongue-flick bob), sleep (curled under its tail)
//   kinkajou : arboreal – idle, walk, run, eat, sleep, perch (on a branch, feet at gripY.perch), climb, hang (by the tail,
//              grip = tail top at gripY.hang, branch along Z)
//   coati    : ground + trees – idle, walk, run, eat (rooting with the snout), sleep, climb
// 1.3.2: split from the single src/models/amazon-animals-extra.js into this folder (pure move; same exports);
// src/models/amazon-animals-extra.js re-exports this file. Since the split the helpers it copied live in ../kit.js
// and ../animators.js; this folder keeps its own copy in kit.js. Parts: kit.js (the toolkit), species.js (the three
// species).
import { disposeDeep, releaseMaterials } from '../../../core/util.js';
import { _specCache } from './kit.js';
import { anteater, kinkajou, coati } from './species.js';

export const ANIMALS_EXTRA = { anteater, kinkajou, coati };

// Called by the zone pack when its zone closes: frees the cached geometry / materials (rebuilt on the next visit).
export function releaseCaches() { disposeDeep(_specCache); _specCache.clear(); releaseMaterials('amzA:'); }
