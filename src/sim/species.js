// Species registry: wraps the BIOME content with derived lookups used by the simulation.
import { RELATION_TYPES, DIET_VERBS, KINDS, ACTIVE_NAMES, SEASON_NAMES, dietVerb } from '../data/common.js';

export const PLANT_KINDS = new Set(['tree', 'palm', 'shrub', 'herb', 'epiphyte', 'vine', 'fungus', 'water-plant', 'coral', 'sessile', 'seaplant', 'cactus']);
export const INSECTS = new Set(['leafcutter', 'orchidbee', 'morpho', 'honeybee', 'butterfly', 'harvesterant', 'firefly', 'darkling', 'desertant', 'hawkmoth']);
// Grove plants that resprout from the base after fire (well documented for Quercus calliprinos, Pistacia, Cistus, Ceratonia)
export const RESPROUTERS = new Set(['oak', 'terebinth', 'carob', 'mastic', 'buckthorn', 'rockrose', 'sage']);
export const GEOPHYTES = new Set(['cyclamen', 'anemone']); // survive fire & summer underground (tuber / rhizome)
export const SWIMMERS = new Set(['capybara', 'tapir', 'jaguar', 'dartfrog']);

const REVERSE_NAMES = {
  pollinates: 'מואבק על ידי', disperses: 'הזרעים מופצים על ידי', home: 'בית בשביל', shelter: 'נותן מחסה ל',
  decomposes: 'מפורק על ידי', partner: 'שותפות עם', climbs: 'תומך ב', eats: 'נאכל על ידי',
};

export function relKey(from, to, type) { return `${from}>${to}>${type}`; }

export function buildRegistry(biome) {
  const byId = new Map();
  for (const s of biome.species) byId.set(s.id, s);
  const isPlant = (id) => PLANT_KINDS.has(byId.get(id)?.kind);
  const all = [];       // every relation edge {from,to,type,text,part}
  for (const s of biome.species) {
    for (const d of s.diet || []) {
      if (!byId.has(d.id)) continue;
      const t = byId.get(d.id);
      const verb = dietVerb(d.part, s.id);
      const join = verb.split(' ').pop().length === 1 ? '' : ' ';   // "שותה צוף מ" + "הליקוניה"
      all.push({ from: s.id, to: d.id, type: 'eats', part: d.part, text: d.text || `${s.name} ${verb}${join}${t.name}.` });
    }
    for (const r of s.relations || []) {
      if (!byId.has(r.target)) continue;
      all.push({ from: s.id, to: r.target, type: r.type, text: r.text });
    }
  }
  // de-duplicate (diet + 'eats' relation may repeat)
  const seen = new Set(); const edges = [];
  for (const e of all) { const k = relKey(e.from, e.to, e.type); if (seen.has(k)) { const ex = edges.find(x => relKey(x.from, x.to, x.type) === k); if (e.text && e.type !== 'eats') ex.text = e.text; continue; } seen.add(k); e.key = k; edges.push(e); }

  const out = (id) => edges.filter(e => e.from === id);
  const inc = (id) => edges.filter(e => e.to === id);
  const pollinatorsOf = (id) => edges.filter(e => e.to === id && e.type === 'pollinates').map(e => e.from);
  const dispersersOf = (id) => edges.filter(e => e.to === id && e.type === 'disperses').map(e => e.from);
  const eatersOf = (id) => edges.filter(e => e.to === id && e.type === 'eats').map(e => e.from);
  const dietOf = (id) => edges.filter(e => e.from === id && e.type === 'eats');

  // relations shown in the species panel (both directions)
  function panelRelations(id) {
    const res = [];
    for (const e of out(id)) res.push({ key: e.key, targetId: e.to, type: e.type, typeName: RELATION_TYPES[e.type]?.name || e.type, text: e.text, dir: 'out' });
    for (const e of inc(id)) res.push({ key: e.key, targetId: e.from, type: e.type, typeName: REVERSE_NAMES[e.type] || e.type, text: e.text, dir: 'in' });
    return res;
  }

  for (const s of biome.species) {
    // the reef: fish swim through the water like flyers move through the air (3D paths, hovering, resting by a coral),
    // so 'swim' runs on the flying code; s.swims tells the models and the texts that it is a fish, not a bird
    if (s.locomotion === 'swim') { s.swims = true; s.locomotion = 'flying'; }
    s.isPlant = isPlant(s.id);
    s.isAnimal = !s.isPlant;
    s.isInsect = INSECTS.has(s.id);
    s.kindName = s.kindLabel || KINDS[s.kind] || '';
    s.activeName = ACTIVE_NAMES[s.active || 'day'] || '';
    s.layerName = (biome.layers.find(l => l.id === s.layer) || {}).name || '';
    s.pollinators = pollinatorsOf(s.id);
    s.dispersers = dispersersOf(s.id);
    s.disperses = edges.filter(e => e.from === s.id && e.type === 'disperses').map(e => e.to);
    s.eaters = eatersOf(s.id);
    s.diet2 = dietOf(s.id);
    s.groupSize = s.groupSize || [1, 1];
    if (!s._maxScaled) { s.maxCount = Math.ceil((s.maxCount || 6) * 1.3); s._maxScaled = true; }   // more room to plant (+30%)
    s.cost = s.cost || 10;
  }
  return { biome, byId, edges, out, inc, panelRelations, isPlant, seasonName: (s) => SEASON_NAMES[s] || '' };
}
