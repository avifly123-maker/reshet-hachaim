// Zone pack: שונית האלמוגים של אילת (1.3, in development). Its content, its corals (procedural, like the trees of the
// other zones) and its animals: procedural stand-ins until the Blender models exist – withRigged() swaps each species for
// its Blender model as soon as art/rigged/reef/<id>.json is packed into src/data/rigged-reef.js.
import { BIOME } from '../data/reef.js';
import { PLANTS, releaseCaches as releasePlants } from '../models/reef-plants.js';
import { ANIMALS, releaseCaches as releaseAnimals } from '../models/reef-animals.js';
import { withRigged, releaseRigged } from '../models/rigged.js';

export const zone = { data: BIOME, plants: PLANTS, animals: withRigged(ANIMALS, {}) };
export function release() { releasePlants(); releaseAnimals(); releaseRigged(); }
