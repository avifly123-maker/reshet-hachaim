// Constants and helpers shared by the parts of the forest (src/game/game/): day length, the caps on plants and
// animals, scratch vectors (one set for the whole game, as before the split), the far forest's tree sources, and
// late(): a part made early calls a function of a part made later through it (the function exists by then).
import * as THREE from 'three';
import { makeRng } from '../../core/util.js';

export const DAY_LEN = 270;            // seconds of game time per day
export const MAX_PLANTS = 95, MAX_ANIMALS = 75;
// small, cheap things (flowers, ferns, mushrooms, insects) get extra room above the caps, so the forest can bloom and buzz
// without letting the heavy trees crowd in further
export const SMALL_PLANT = new Set(['herb', 'fungus', 'water-plant', 'epiphyte']);
export const MAX_ALL_PLANTS = MAX_PLANTS + 30;   // big plants (trees, shrubs, palms, vines) alone are still capped at MAX_PLANTS
export const animalCap = (sp) => (sp.isInsect ? MAX_ANIMALS + 15 : MAX_ANIMALS);
export const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _ray = new THREE.Raycaster(), _ndc = new THREE.Vector2();

// The far forest around the island is drawn with impostors baked from these mature trees of the zone (see env/impostors.js).
// Seed 11 = the same model variants the shader warm-up below builds, so their cached geometry is shared.
const FAR_TREES = {
  amazon: [['kapok', 'emergent'], ['brazilnut', 'emergent'], ['fig', 'canopy'], ['cecropia', 'canopy'], ['acai', 'palm']],
  grove: [['oak', 'tree'], ['carob', 'tree'], ['pine', 'tree'], ['mastic', 'bush']],
  savanna: [['umbrella', 'tree'], ['marula', 'tree'], ['whistling', 'bush']],   // 1.4.2: lone acacias far over the plain
};
export function farTreeSources(biomeId, plantBuilders) {
  return (FAR_TREES[biomeId] || []).filter(([id]) => plantBuilders && plantBuilders[id]).map(([id, role]) => ({
    id, role,
    build: () => {
      const v = plantBuilders[id]({ seed: 11, rng: makeRng(11), hostHeight: 8, hostRadius: 0.4 });
      v.setGrowth(1); v.setHealth(1); if (v.setSeason) v.setSeason('spring', 0.4); v.setBloom(0); v.setFruit(0);
      if (v.update) v.update(10, 0, 0);   // no wind
      return v;
    },
  }));
}

// a function of a later part, looked up in ctx when it is called (all parts exist before the forest runs)
export const late = (ctx, name) => (...args) => ctx[name](...args);

// add a part's results to the shared ctx; a part must never replace a name another part already gave
// (two parts with the same function name would silently override each other)
export function addPart(ctx, part, name) {
  for (const k of Object.keys(part || {})) if (k in ctx) throw new Error(`forest part "${name}" gives "${k}", which is already in ctx`);
  return Object.assign(ctx, part);
}
