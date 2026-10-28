// Desert animals (1.4) – stand-ins until the Blender models are made. The rule is that animals come from Blender
// (tools/blender/animals/<id>.py → art/rigged/desert/<id>.json → src/data/rigged-desert.js); withRigged() in the desert
// pack replaces each stand-in as soon as its Blender model exists. Until then a close relative from another zone keeps
// the desert playable (a fox for the fennec, a gazelle for the ibex). Nothing here is meant to ship as the final look.
import { ANIMALS as G } from './grove-animals.js';
import { ANIMALS_EXTRA as GX } from './grove-animals-extra.js';
import { ANIMALS as A } from './amazon-animals.js';

export const ANIMALS = {
  fennec: G.fox, sandcat: G.fox, caracal: G.fox,
  ibex: G.gazelle, dorcas: G.gazelle, camel: A.tapir,
  jerboa: G.spinymouse, psammomys: G.spinymouse, deserthedgehog: G.hedgehog,
  uromastyx: G.agama, scorpion: G.agama, darkling: GX.tortoise, desertsnail: GX.tortoise,
  desertant: G.harvesterant, sandgrouse: GX.chukar, houbara: GX.chukar, eagleowl: G.owl, hawkmoth: G.butterfly,
};
// the stand-ins' caches belong to their own zones' modules (released with them)
export function releaseCaches() {}
