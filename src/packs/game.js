// Pack: the building game itself (the island, its environment, the simulation, the tools, the tour, the field cameras,
// the mysteries' session). Loaded the first time a zone or a mystery is opened, together with that zone's pack, so the
// start screen, the learning hub and the lab never carry it (1.3.1: each area loads on its own).
export { createGame } from '../game/game/index.js';
