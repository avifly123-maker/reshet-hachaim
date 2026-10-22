// Grove (חורש ארץ-ישראלי) plant models — procedural, cached per species & variant (seed % 3).
// Exports PLANTS = { oak, terebinth, carob, pine, mastic, buckthorn, sage, rockrose, cyclamen, anemone, mushroom }.
//
// Technique: every part is a merged BufferGeometry with per-vertex colour plus two extra attributes:
//   aCenter (vec3) – the point a leaf blob / flower / fruit collapses into when hidden
//   aRank   (float) – per-element random rank; elements with rank > uKeep are scaled to 0 (leaf drop, thinning,
//                     partial bloom/fruit), and rank also staggers colour changes (autumn leaves turn blob by blob).
// A small onBeforeCompile patch (shared by all materials → one shader program per material type) adds wind sway,
// collapse/grow, drooping and seasonal / drought colour mixing, and is mirrored in the shadow depth material.
// Geometry is shared between instances; each instance owns light-weight material clones holding its uniforms.
// 1.3.2: split from the single src/models/grove-plants.js into this folder (pure move; same exports).
// src/models/grove-plants.js re-exports this file, so importers are unchanged. Parts, in their original order:
//   kit.js    the shader patch and the geometry helpers
//   woody.js  oak, terebinth, carob, pine, mastic, buckthorn (WOODY, buildWoody)
//   herbs.js  sage, rockrose, cyclamen, anemone, mushroom
//   plant.js  SPECIES behaviour, the variant cache and makePlant (the PlantVisual)
import { disposeDeep } from '../../core/util.js';
import { _variants, makePlant } from './plant.js';

export const PLANTS = {
  oak: (o) => makePlant('oak', o),
  terebinth: (o) => makePlant('terebinth', o),
  carob: (o) => makePlant('carob', o),
  pine: (o) => makePlant('pine', o),
  mastic: (o) => makePlant('mastic', o),
  buckthorn: (o) => makePlant('buckthorn', o),
  sage: (o) => makePlant('sage', o),
  rockrose: (o) => makePlant('rockrose', o),
  cyclamen: (o) => makePlant('cyclamen', o),
  anemone: (o) => makePlant('anemone', o),
  mushroom: (o) => makePlant('mushroom', o),
};

// Called by the zone pack when its zone closes: frees the cached geometry / materials (rebuilt on the next visit).
export function releaseCaches() { disposeDeep(_variants); _variants.clear(); }
