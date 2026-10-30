// Zone pack: הסוואנה האפריקאית (1.4.2). Its content, its plants (procedural, src/models/savanna-plants/) and its animals
// (Blender models in src/data/rigged-savanna.js as they are made; stand-ins meanwhile, src/models/savanna-animals.js).
// The environment is the shared one (src/env/environment/) with the savanna's look (biome 'savanna', savanna-look.js).
import { BIOME } from '../data/savanna.js';
import { PLANTS, releaseCaches as releasePlants } from '../models/savanna-plants/index.js';
import { ANIMALS, STANDIN_RIGGED, releaseCaches as releaseAnimals } from '../models/savanna-animals.js';
import { withRigged, releaseRigged } from '../models/rigged.js';
import { RIGGED } from '../data/rigged-savanna.js';

export const zone = { data: BIOME, plants: PLANTS, animals: withRigged(ANIMALS, { ...STANDIN_RIGGED, ...RIGGED }) };
export function release() { releasePlants(); releaseAnimals(); releaseRigged(); }
