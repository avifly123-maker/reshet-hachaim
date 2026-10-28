// All mysteries (תעלומות) of חוקרי הטבע, in the order the picker shows them within each level.
import { MICE_OWL } from './mice-owl.js';
import { FLOWERS_BEES } from './flowers-bees.js';
import { BRAZIL_NUT } from './brazil-nut.js';
import { GREEN_REEF } from './green-reef.js';
import { CLEANING_STATION } from './cleaning-station.js';
import { WHITE_CORAL } from './white-coral.js';
import { THE_TRAP } from './the-trap.js';
import { FROGS } from './frogs.js';
import { YOUNG_OAKS } from './young-oaks.js';
import { LEAFCUTTERS } from './leafcutters.js';
import { NO_PREDATORS } from './no-predators.js';
import { SUMMER_FIRE } from './summer-fire.js';
import { GAZELLES } from './gazelles.js';
import { MOVING_SAND } from './moving-sand.js';
import { LONELY_ACACIAS } from './lonely-acacias.js';
import { SHRINKING_OASIS } from './shrinking-oasis.js';
export const CASES = [MICE_OWL, FLOWERS_BEES, BRAZIL_NUT, GREEN_REEF, CLEANING_STATION, WHITE_CORAL, THE_TRAP];
CASES.push(FROGS, YOUNG_OAKS, LEAFCUTTERS);
CASES.push(NO_PREDATORS, SUMMER_FIRE, GAZELLES);   // advanced: the forest without hunters, summer fire, the vanishing gazelles
CASES.push(MOVING_SAND, LONELY_ACACIAS, SHRINKING_OASIS);   // 1.4, the desert: the sand that buries the seedlings (beginners), the acacias that do not renew (middle), the shrinking oasis (advanced)
export const caseById = (id) => CASES.find((c) => c.id === id) || null;
