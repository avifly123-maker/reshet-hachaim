// Amazon plant models for "רשת החיים" — procedural, cached per species+variant, one shader-driven material per instance.
// Every PlantVisual: growth / health / bloom / fruit / night-glow / sway are driven by uniforms of a single per-instance
// material (geometry is shared by all instances of a species variant). Flowers & fruit live in the same merged geometry
// but are revealed (scaled in from their own centres) by uBloom / uFruit, so they toggle without extra draw calls.
// 1.3.2: split from the single src/models/amazon-plants.js into this folder (pure move; same exports).
// src/models/amazon-plants.js re-exports this file, so importers are unchanged. Parts, in their original order:
//   kit.js         the plant material, geometry builder, primitives, shared tree parts
//   visual.js      makeVisual (the PlantVisual) and the per-variant geometry cache
//   trees.js       kapok, brazil nut, strangler fig, cecropia, acai palm
//   understory.js  heliconia, bromeliad, orchid, liana, fern, glow fungus, giant water lily
import { makeRng, disposeDeep } from '../../core/util.js';
import { CACHE } from './visual.js';
import { kapok, brazilnut, fig, cecropia, acai } from './trees.js';
import { heliconia, bromeliad, orchid, liana, fern, glowfungus, waterlily } from './understory.js';

// ═════════════════════════════ export ═════════════════════════════
export const PLANTS = { kapok, brazilnut, fig, cecropia, acai, heliconia, bromeliad, orchid, liana, fern, glowfungus, waterlily };
// debug helper: triangle counts per species variant (built lazily)
export function _plantStats() {
  const out = {};
  for (const id of Object.keys(PLANTS)) {
    const vis = PLANTS[id]({ seed: 3, rng: makeRng(3), hostHeight: 20, hostRadius: 0.6 });
    let tris = 0, meshes = 0; vis.object.traverse(o => { if (o.isMesh) { meshes++; tris += o.geometry.attributes.position.count / 3; } });
    out[id] = { tris, meshes }; vis.dispose();
  }
  return out;
}

// Called by the zone pack when its zone closes: frees the cached geometry / materials (rebuilt on the next visit).
export function releaseCaches() { disposeDeep(CACHE); CACHE.clear(); }
