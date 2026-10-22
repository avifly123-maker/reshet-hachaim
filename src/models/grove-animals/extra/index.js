// Extra grove (חורש) animals: hoopoe (דוכיפת), spur-thighed tortoise (צב יבשה מצוי), chukar (חוגלת סלעים).
// Same API & look as src/models/grove-animals.js (smooth-shaded lofted bodies, per-vertex colour gradients, cute eyes,
// procedural animation). The shared helpers below are copied verbatim from grove-animals.js (which does not export them).
// export ANIMALS_EXTRA = { hoopoe, tortoise, chukar }  — each (opts) => AnimalVisual
// Models face +Z. hoopoe (flying): origin at body centre + perchOffset. tortoise / chukar (ground): origin on the ground.
// 1.3.2: split from the single src/models/grove-animals-extra.js into this folder (pure move; same exports);
// src/models/grove-animals-extra.js re-exports this file. Since the split the helpers it copied live in ../kit.js
// and ../animators.js; this folder keeps its own copy in kit.js. Parts: kit.js (the helpers), species.js (the three
// species).
import { disposeDeep, releaseMaterials } from '../../../core/util.js';
import { SPECS, makeAnimal } from './kit.js';
import { buildHoopoe, buildTortoise, buildChukar, HOOPOE_ANIM, TORTOISE_ANIM, CHUKAR_ANIM, groundOrigin } from './species.js';

// ---------------------------------------------------------------- export
export const ANIMALS_EXTRA = {
  hoopoe: (o) => makeAnimal('hoopoe', o, buildHoopoe, HOOPOE_ANIM),
  tortoise: (o) => makeAnimal('tortoise', o, buildTortoise, TORTOISE_ANIM),
  chukar: (o) => groundOrigin(makeAnimal('chukar', o, buildChukar, CHUKAR_ANIM)),
};
export default ANIMALS_EXTRA;

// Called by the zone pack when its zone closes: frees the cached geometry / materials (rebuilt on the next visit).
export function releaseCaches() { disposeDeep(SPECS); SPECS.clear(); releaseMaterials('grove-animals:'); }
