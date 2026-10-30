// Desert plant models (1.4) — procedural, cached per species & variant (seed % 3), drawn by the grove plants' PlantVisual
// (src/models/grove-plants/plant.js makePlantFrom: the same shader patch for wind, growth, drying and thinning).
// Exports PLANTS = { acacia, datepalm, tamarisk, columncactus, retama, saltbush, zygophyllum, caper, calotropis,
// colocynth, anastatica, blooms, crust, barrelcactus } and releaseCaches.
// The desert has no seasons: flowers and fruit follow the plant's own cycle (setBloom / setFruit from the simulation),
// so the keyframes below are flat. `kind` here is only how the model grows (tree: a seedling first, then scale up).
//   trees.js   acacia, date palm, tamarisk, column cactus
//   shrubs.js  retama, saltbush, zygophyllum, caper, calotropis
//   ground.js  colocynth, rose of Jericho, flowers after rain, soil crust, barrel cactus
//   parts.js   ribbed cactus body, seedling
import { disposeDeep } from '../../core/util.js';
import { makePlantFrom } from '../grove-plants/plant.js';
import { buildAcacia, buildDatePalm, buildTamarisk, buildColumnCactus } from './trees.js';
import { buildRetama, buildSaltbush, buildZygophyllum, buildCaper, buildCalotropis } from './shrubs.js';
import { buildColocynth, buildAnastatica, buildBlooms, buildCrust, buildBarrelCactus } from './ground.js';

const flat = { bloom: [[0, 0]], fruit: [[0, 0]] };
const S = (kind, sway, flutter, squash, density, woodDensity, rough = 0.85) => ({ kind, sway, flutter, squash, density, woodDensity, rough, ...flat });
const SPECIES = {
  acacia: S('tree', 0.01, 0.02, 0.02, 0.62, 0.12),
  datepalm: S('tree', 0.02, 0.05, 0.02, 0.55, 0.08),
  tamarisk: S('tree', 0.018, 0.03, 0.03, 0.55, 0.1),
  columncactus: S('tree', 0.0, 0.0, 0.0, 0.5, 0.0, 0.7),
  retama: S('shrub', 0.035, 0.015, 0.1, 0.45, 0.05),
  saltbush: S('shrub', 0.02, 0.01, 0.12, 0.8, 0.1),
  zygophyllum: S('shrub', 0.015, 0.008, 0.12, 0.5, 0.15),
  caper: S('shrub', 0.02, 0.012, 0.15, 0.4, 0.1),
  calotropis: S('shrub', 0.02, 0.02, 0.1, 0.55, 0.1),
  colocynth: S('herb', 0.01, 0.01, 0.2, 0.15, 0.0),
  anastatica: S('herb', 0.0, 0.004, 0.2, 0.1, 0.0),
  blooms: S('herb', 0.05, 0.01, 0.3, 0.15, 0.0),
  crust: S('herb', 0.0, 0.0, 0.0, 0.02, 0.0, 1.0),
  barrelcactus: S('shrub', 0.0, 0.0, 0.0, 0.3, 0.0, 0.7),
};
const BUILD = {
  acacia: buildAcacia, datepalm: buildDatePalm, tamarisk: buildTamarisk, columncactus: buildColumnCactus,
  retama: buildRetama, saltbush: buildSaltbush, zygophyllum: buildZygophyllum, caper: buildCaper, calotropis: buildCalotropis,
  colocynth: buildColocynth, anastatica: buildAnastatica, blooms: buildBlooms, crust: buildCrust, barrelcactus: buildBarrelCactus,
};

const _variants = new Map();
function getVariant(id, v) {
  const key = id + ':' + v;
  if (!_variants.has(key)) _variants.set(key, BUILD[id](v));
  return _variants.get(key);
}

export const PLANTS = Object.fromEntries(Object.keys(BUILD).map((id) => [id, (o) => makePlantFrom(id, SPECIES[id], (v) => getVariant(id, v), o, 'desert-')]));

export function releaseCaches() { disposeDeep(_variants); _variants.clear(); }
