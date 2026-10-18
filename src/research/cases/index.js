// All mysteries (תעלומות) of חוקרי הטבע, in the order the picker shows them within each level.
import { MICE_OWL } from './mice-owl.js';
import { FLOWERS_BEES } from './flowers-bees.js';
import { BRAZIL_NUT } from './brazil-nut.js';
import { GREEN_REEF } from './green-reef.js';
import { CLEANING_STATION } from './cleaning-station.js';
import { WHITE_CORAL } from './white-coral.js';
import { THE_TRAP } from './the-trap.js';
export const CASES = [MICE_OWL, FLOWERS_BEES, BRAZIL_NUT, GREEN_REEF, CLEANING_STATION, WHITE_CORAL, THE_TRAP];
export const caseById = (id) => CASES.find((c) => c.id === id) || null;
