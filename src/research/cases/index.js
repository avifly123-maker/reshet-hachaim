// All mysteries (תעלומות) of חוקרי היער, in the order the picker shows them within each level.
import { MICE_OWL } from './mice-owl.js';
export const CASES = [MICE_OWL];
export const caseById = (id) => CASES.find((c) => c.id === id) || null;
