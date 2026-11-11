// Savanna plant models (1.4.2) — procedural, cached per species & variant (seed % 3), drawn by the grove plants' PlantVisual
// (src/models/grove-plants/plant.js makePlantFrom: wind, growth, drying and thinning, and the seasonal keyframes).
// Exports PLANTS = { umbrella, baobab, kigelia, sycamore, marula, doum, whistling, redoat, stargrass, papyrus,
// termitemound } and releaseCaches.
// The savanna's year has two seasons (grove-plants/kit.js SEASON_INDEX / SEASON_SPAN): the rains on y 0 → .5 and the dry
// season on y .5 → 1. So the keyframes below read: early rains ≈ 0.05, late rains ≈ 0.4, early dry ≈ 0.55, late dry ≈ 0.9.
//   trees.js   umbrella acacia, baobab, sausage tree, sycamore fig, marula, doum palm
//   ground.js  whistling thorn, red oat grass, star grass, papyrus, termite mound
import { disposeDeep } from '../../core/util.js';
import { Col } from '../grove-plants/kit.js';
import { makePlantFrom } from '../grove-plants/plant.js';
import { buildUmbrella, buildBaobab, buildKigelia, buildSycamore, buildMarula, buildDoum } from './trees.js';
import { buildWhistling, buildRedOat, buildStarGrass, buildPapyrus, buildTermiteMound } from './ground.js';

const L = (c1, c2, keys) => ({ c1: new Col(c1), c2: new Col(c2), keys });
const DRYTINT = (c1, c2) => [L(c1, c2, [[0.45, 0], [0.62, 0.55], [0.92, 0.6], [0.02, 0]])];   // leaves dull in the dry season
const S = (kind, sway, flutter, squash, density, woodDensity, rough, o = {}) => ({ kind, sway, flutter, squash, density, woodDensity, rough, bloom: [[0, 0]], fruit: [[0, 0]], ...o });
const SPECIES = {
  umbrella: S('tree', 0.012, 0.025, 0.02, 0.55, 0.12, 0.85, { layers: DRYTINT('#8a8a4a', '#9a9452'),
    bloom: [[0.0, 0], [0.06, 1], [0.22, 1], [0.3, 0]], fruit: [[0.32, 0], [0.48, 1], [0.8, 1], [0.95, 0]] }),
  // the baobab drops its leaves for the dry season and flowers just before the rains
  baobab: S('tree', 0.006, 0.02, 0.01, 0.45, 0.25, 0.9, { keep: [[0.0, 0.25], [0.08, 1], [0.46, 1], [0.6, 0.06], [0.92, 0.05]],
    bloom: [[0.9, 0], [0.96, 1], [0.08, 1], [0.15, 0]], fruit: [[0.25, 0], [0.45, 1], [0.85, 1], [0.97, 0]] }),
  kigelia: S('tree', 0.012, 0.025, 0.02, 0.75, 0.12, 0.8, { layers: DRYTINT('#5a6e34', '#6a7a3a'),
    bloom: [[0.52, 0], [0.6, 1], [0.84, 1], [0.92, 0]], fruit: [[0.88, 0], [0.04, 0.7], [0.2, 1], [0.5, 1], [0.6, 0]] }),
  sycamore: S('tree', 0.01, 0.022, 0.02, 0.85, 0.12, 0.75, { fruit: [[0, 0.65]] }),   // figs all year (the fig wasps' cycle)
  marula: S('tree', 0.012, 0.025, 0.02, 0.65, 0.12, 0.8, { keep: [[0.0, 1], [0.5, 1], [0.64, 0.45], [0.94, 0.55]],
    fruit: [[0.96, 0], [0.04, 1], [0.28, 1], [0.38, 0]] }),
  doum: S('tree', 0.015, 0.04, 0.02, 0.5, 0.08, 0.8, { fruit: [[0, 0.75]] }),
  whistling: S('shrub', 0.02, 0.015, 0.1, 0.55, 0.15, 0.85, { layers: DRYTINT('#8a8a4a', '#949050'),
    bloom: [[0.0, 0], [0.06, 1], [0.18, 1], [0.24, 0]], fruit: [[0, 1]] }),   // its galls (the "fruit" part) are there all year
  // the grasses: green in the rains, straw (the red oat grass rusty red) in the dry season; they shoot up after the rains
  redoat: S('herb', 0.08, 0.012, 0.3, 0.3, 0.0, 0.95, { layers: [L('#c08a52', '#a8643a', [[0.42, 0], [0.6, 1], [0.97, 1], [0.06, 0]])],
    grow: [[0.0, 0.55], [0.25, 1], [0.5, 1], [0.9, 0.85]], bloom: [[0.22, 0], [0.35, 1], [0.8, 1], [0.95, 0.2]] }),
  stargrass: S('herb', 0.04, 0.01, 0.3, 0.12, 0.0, 0.95, { layers: [L('#b8a462', '#c4ac6a', [[0.45, 0], [0.62, 0.9], [0.96, 0.9], [0.06, 0]])],
    bloom: [[0.1, 0], [0.2, 1], [0.4, 1], [0.5, 0]] }),
  papyrus: S('water-plant', 0.04, 0.02, 0.1, 0.35, 0.05, 0.8),
  termitemound: S('shrub', 0.0, 0.0, 0.0, 0.6, 0.6, 1.0),   // a building: no wind, no seasons
};
const BUILD = {
  umbrella: buildUmbrella, baobab: buildBaobab, kigelia: buildKigelia, sycamore: buildSycamore, marula: buildMarula, doum: buildDoum,
  whistling: buildWhistling, redoat: buildRedOat, stargrass: buildStarGrass, papyrus: buildPapyrus, termitemound: buildTermiteMound,
};

const _variants = new Map();
function getVariant(id, v) {
  const key = id + ':' + v;
  if (!_variants.has(key)) _variants.set(key, BUILD[id](v));
  return _variants.get(key);
}

export const PLANTS = Object.fromEntries(Object.keys(BUILD).map((id) => [id, (o) => makePlantFrom(id, SPECIES[id], (v) => getVariant(id, v), o, 'savanna-')]));

export function releaseCaches() { disposeDeep(_variants); _variants.clear(); }
