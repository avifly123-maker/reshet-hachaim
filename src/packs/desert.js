// Zone pack: המדבר (1.4). Its content, its plants (procedural, src/models/desert-plants/) and its animals (Blender models
// in src/data/rigged-desert.js as they are made; stand-ins from other zones meanwhile, src/models/desert-animals.js).
// The environment is the shared one (src/env/environment/) with the desert's own look (biome 'desert').
import { BIOME } from '../data/desert.js';
import { PLANTS, releaseCaches as releasePlants } from '../models/desert-plants/index.js';
import { ANIMALS, releaseCaches as releaseAnimals } from '../models/desert-animals.js';
import { withRigged, releaseRigged } from '../models/rigged.js';
import { RIGGED } from '../data/rigged-desert.js';

export const zone = { data: BIOME, plants: PLANTS, animals: withRigged(ANIMALS, RIGGED) };
export function release() { releasePlants(); releaseAnimals(); releaseRigged(); }
