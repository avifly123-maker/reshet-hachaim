// Both zones' HQ builders in one table, for the model galleries / thumbnail tools in tests/ (the game itself gets them
// per zone from src/packs/<id>.js, so a zone never loads the other zone's models).
import { PLANTS as GROVE } from './grove-plants.js';
import { PLANTS as AMAZON } from './amazon-plants.js';
import { groveHQ, amazonHQ } from './hq-trees.js';

export const HQ_PLANTS = { ...groveHQ(GROVE), ...amazonHQ(AMAZON) };
