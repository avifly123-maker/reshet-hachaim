// Savanna animals (1.4.2) – the stand-ins behind the Blender models. The rule is that animals come from Blender
// (tools/blender/animals/<id>.py → art/rigged/savanna/<id>.json → src/data/rigged-savanna.js); withRigged() in the savanna
// pack puts each Blender model in as soon as it exists. Until then a relative from another zone keeps the savanna
// playable while its island and its systems are built (round 1 of docs/PLAN-1.4.2.md). Nothing here ships as the look.
import { RIGGED as AM } from '../data/rigged-amazon.js';
import { RIGGED as DE } from '../data/rigged-desert.js';
import { RIGGED as GR } from '../data/rigged-grove.js';
import { ANIMALS as G } from './grove-animals.js';

// procedural stand-ins (the colony of termites walks like the harvester ants)
export const ANIMALS = { termites: G.harvesterant };
// rigged stand-ins: the model data of a relative, under the savanna's id
export const STANDIN_RIGGED = {
  elephant: AM.tapir, giraffe: DE.camel, zebra: DE.ibex, wildebeest: DE.ibex, impala: DE.dorcas,
  lion: AM.jaguar, crocodile: DE.uromastyx, weaver: GR.blackbird,
};
export function releaseCaches() {}
