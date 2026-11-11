// 1.4.4 stability set: the species registry must not change the zones' content, and building it again gives the same
// answer (it used to turn the reef's 'swim' into 'flying' and raise maxCount on the content itself, guarded by a flag).
// node tests/sim/registry.mjs   (part of tools/check-all.sh)
import { buildRegistry } from '../../src/sim/species.js';
import { BIOME as AMAZON } from '../../src/data/amazon.js';
import { BIOME as GROVE } from '../../src/data/grove.js';
import { BIOME as REEF } from '../../src/data/reef.js';
import { BIOME as DESERT } from '../../src/data/desert.js';
import { BIOME as SAVANNA } from '../../src/data/savanna.js';
let bad = 0;
const fail = (m) => { bad++; console.log('FAIL ' + m); };
const pick = (r) => r.biome.species.map((s) => [s.id, s.locomotion, !!s.swims, s.maxCount, s.isPlant, s.kindName].join('|')).join(';');
for (const [name, B] of Object.entries({ AMAZON, GROVE, REEF, DESERT, SAVANNA })) {
  const before = JSON.stringify(B);
  const a = buildRegistry(B), b = buildRegistry(B);
  if (JSON.stringify(B) !== before) fail(name + ': the content changed');
  if (pick(a) !== pick(b)) fail(name + ': a second build differs');
  if (a.biome === B || a.biome.species[0] === B.species[0]) fail(name + ': the registry works on the content itself');
  for (const s of a.biome.species) {
    const c = B.species.find((q) => q.id === s.id);
    if (s.maxCount !== Math.ceil((c.maxCount || 6) * 1.3)) fail(name + ' ' + s.id + ': maxCount ' + s.maxCount);
    if (c.locomotion === 'swim' && !(s.swims && s.locomotion === 'flying')) fail(name + ' ' + s.id + ': a fish does not swim');
    if (a.byId.get(s.id) !== s) fail(name + ' ' + s.id + ': byId is not the runtime species');
  }
}
console.log(bad ? `registry: ${bad} problem(s)` : 'registry: content untouched, the same every build (5 zones)');
process.exit(bad ? 1 : 0);
