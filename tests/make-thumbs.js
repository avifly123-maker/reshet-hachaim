// Build-time: render every species portrait once (headless) so the game never needs a second WebGL context.
import { renderThumbnails } from '../src/world/thumbs.js';
import { BIOME as A } from '../src/data/amazon.js';
import { BIOME as G } from '../src/data/grove.js';
import { PLANTS as AP } from '../src/models/amazon-plants.js';
import { PLANTS as GP } from '../src/models/grove-plants.js';
import { ANIMALS as AA } from '../src/models/amazon-animals.js';
import { ANIMALS as GA } from '../src/models/grove-animals.js';
import { buildRegistry } from '../src/sim/species.js';
import { HQ_PLANTS } from '../src/models/hq-trees-all.js';
import { ANIMALS_EXTRA as AX } from '../src/models/amazon-animals-extra.js';
import { ANIMALS_EXTRA as GX } from '../src/models/grove-animals-extra.js';
const withHQ = (base) => { const o = { ...base }; for (const k of Object.keys(HQ_PLANTS)) if (k in base) o[k] = HQ_PLANTS[k]; return o; };
(async () => {
  buildRegistry(A); buildRegistry(G);
  const a = await renderThumbnails(A.species, withHQ(AP), { ...AA, ...AX }, { size: 128, fmt: 'image/webp' });
  const g = await renderThumbnails(G.species, withHQ(GP), { ...GA, ...GX }, { size: 128, fmt: 'image/webp' });
  window.__thumbs = { amazon: a, grove: g };
})();
