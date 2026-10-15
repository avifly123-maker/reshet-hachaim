// Zone pack: החורש הארץ-ישראלי. Everything only this zone needs – its content and its species models.
// Loaded on demand through core/packs.js (a separate file in the desktop build, inlined in the single-file build).
// Its pictures (panorama, ground textures, species art) are referenced by URL from the core's asset tables.
import { BIOME } from '../data/grove.js';
import { PLANTS, releaseCaches as releasePlants } from '../models/grove-plants.js';
import { ANIMALS, releaseCaches as releaseAnimals } from '../models/grove-animals.js';
import { ANIMALS_EXTRA, releaseCaches as releaseExtra } from '../models/grove-animals-extra.js';
import { groveHQ, withHQ, releaseCaches as releaseHQ } from '../models/hq-trees.js';
import { releaseCaches as releaseFoliage } from '../models/foliage.js';
import { withRigged, releaseRigged } from '../models/rigged.js';
import { RIGGED } from '../data/rigged-grove.js';

export const zone = { data: BIOME, plants: withHQ(PLANTS, groveHQ(PLANTS)), animals: withRigged({ ...ANIMALS, ...ANIMALS_EXTRA }, RIGGED) };
// the zone was closed (game disposed): let its cached geometry / materials go
export function release() { releasePlants(); releaseAnimals(); releaseExtra(); releaseHQ(); releaseFoliage(); releaseRigged(); }
