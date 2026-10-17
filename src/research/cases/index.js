// All mysteries (תעלומות) of חוקרי היער, in the order the picker shows them within each level.
import { MICE_OWL } from './mice-owl.js';
import { FLOWERS_BEES } from './flowers-bees.js';
import { BRAZIL_NUT } from './brazil-nut.js';
export const CASES = [MICE_OWL, FLOWERS_BEES, BRAZIL_NUT];
export const caseById = (id) => CASES.find((c) => c.id === id) || null;
