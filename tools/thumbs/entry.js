import { renderThumbnails } from '../../src/world/thumbs.js';
import { zone as D } from '../../src/packs/desert.js';
import { zone as S } from '../../src/packs/savanna.js';
import { buildRegistry } from '../../src/sim/species.js';
(async () => {
  const out = {};
  for (const [id, Z] of [['desert', D], ['savanna', S]]) {
    buildRegistry(Z.data);
    for (const sp of Z.data.species) if (!sp.isPlant && Z.animals[sp.id]) { try { const v = Z.animals[sp.id]({ seed: 3, rng: Math.random }); v.dispose && 0; } catch (e) {} }
    await new Promise(r => setTimeout(r, 6000));
    try { out[id] = await renderThumbnails(Z.data.species, Z.plants, Z.animals, { size: 128, fmt: 'image/webp' }); }
    catch (e) { out[id] = { __err: String(e && e.stack || e) }; }
  }
  window.__thumbs = out;
})();
