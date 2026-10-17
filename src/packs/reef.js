// Zone pack: שונית האלמוגים של אילת (1.3, in development). Its content, its fixed life (corals, sponges, the anemone, the
// clam, seagrass, algae: Blender models in src/data/reef-flora.js, drawn by src/models/reef-plants.js) and its animals
// (Blender models in src/data/rigged-reef.js; the procedural stand-ins remain only as a fallback).
import { BIOME } from '../data/reef.js';
import { PLANTS, releaseCaches as releasePlants } from '../models/reef-plants.js';
import { ANIMALS, releaseCaches as releaseAnimals } from '../models/reef-animals.js';
import { withRigged, releaseRigged } from '../models/rigged.js';
import { RIGGED } from '../data/rigged-reef.js';

export const zone = { data: BIOME, plants: PLANTS, animals: withRigged(ANIMALS, RIGGED) };
export function release() { releasePlants(); releaseAnimals(); releaseRigged(); }
