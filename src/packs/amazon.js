// Zone pack: יער הגשם של האמזונס. Everything only this zone needs – its content and its species models.
// Loaded on demand through core/packs.js (a separate file in the desktop build, inlined in the single-file build).
// Its pictures (panorama, ground textures, species art) are referenced by URL from the core's asset tables.
import { BIOME } from '../data/amazon.js';
import { PLANTS, releaseCaches as releasePlants } from '../models/amazon-plants.js';
import { ANIMALS, releaseCaches as releaseAnimals } from '../models/amazon-animals.js';
import { ANIMALS_EXTRA, releaseCaches as releaseExtra } from '../models/amazon-animals-extra.js';
import { amazonHQ, withHQ, releaseCaches as releaseHQ } from '../models/hq-trees.js';
import { releaseCaches as releaseFoliage } from '../models/foliage.js';
import { withRigged, releaseRigged } from '../models/rigged.js';
import { RIGGED } from '../data/rigged-amazon.js';

export const zone = { data: BIOME, plants: withHQ(PLANTS, amazonHQ(PLANTS)), animals: withRigged({ ...ANIMALS, ...ANIMALS_EXTRA }, RIGGED) };
// the zone was closed (game disposed): let its cached geometry / materials go
export function release() { releasePlants(); releaseAnimals(); releaseExtra(); releaseHQ(); releaseFoliage(); releaseRigged(); }
