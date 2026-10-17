// Validates src/data/kids.js (beginners mode) against the biome data.
// Usage: node tools/validate-kids.mjs   → exits 1 on errors.
import { KIDS } from '../src/data/kids.js';
import { BIOME as AMAZON } from '../src/data/amazon.js';
import { BIOME as GROVE } from '../src/data/grove.js';
import { BIOME as REEF } from '../src/data/reef.js';

const BIOMES = { amazon: AMAZON, grove: GROVE, reef: REEF };
const PLANT_KINDS = new Set(['tree', 'palm', 'shrub', 'herb', 'epiphyte', 'vine', 'fungus', 'water-plant', 'coral', 'sessile', 'seaplant']);
const GOAL_FIELDS = {
  place: ['species', 'count'], pollinate: ['species', 'count'], link: ['from', 'to'], disperse: ['count'],
  grow: ['species', 'count'], tool: ['tool', 'count'], photos: ['count'], speciesAlive: ['count'],
};
const MISSION_FIELDS = ['id', 'title', 'text', 'hint', 'after', 'goal', 'reward'];
const BANNED_PARTS = ['אבולוציה', 'מיליוני', 'דינוזאור', 'אנשים', 'ציידים', 'טורף', 'הורג', 'חזיר'];   // anywhere in a word
const BANNED_WORDS = ['אדם', 'מת', 'מתה', 'מתים'];   // whole words only
const MAX_WORDS = 10;

const errors = [], warns = [];
const err = (b, m) => errors.push(`[${b}] ${m}`);
const warn = (b, m) => warns.push(`[${b}] ${m}`);

const sentences = (s) => s.split(/[.!?]+/).map((x) => x.trim()).filter(Boolean);
const words = (s) => s.split(/\s+/).filter((w) => w && !/^[–\-,]$/.test(w));
function checkText(b, where, s, maxSentences) {
  if (typeof s !== 'string' || !s.trim()) { err(b, `${where}: empty text`); return; }
  const ss = sentences(s);
  if (maxSentences && ss.length > maxSentences) err(b, `${where}: ${ss.length} sentences (max ${maxSentences}): "${s}"`);
  for (const x of ss) if (words(x).length > MAX_WORDS) err(b, `${where}: sentence has ${words(x).length} words (max ${MAX_WORDS}): "${x}"`);
  for (const w of BANNED_PARTS) if (s.includes(w)) err(b, `${where}: banned word "${w}": "${s}"`);
  const toks = s.split(/[\s.,!?:;"'–-]+/);
  for (const w of BANNED_WORDS) if (toks.includes(w)) err(b, `${where}: banned word "${w}": "${s}"`);
}

for (const [bid, K] of Object.entries(KIDS)) {
  const B = BIOMES[bid];
  if (!B) { err(bid, 'unknown biome'); continue; }
  const byId = new Map(B.species.map((s) => [s.id, s]));
  const set = new Set(K.species || []);
  const isPlant = (id) => PLANT_KINDS.has(byId.get(id)?.kind);

  // ── species
  if (set.size !== (K.species || []).length) err(bid, 'duplicate species ids');
  if (set.size < 7 || set.size > 8) err(bid, `species count ${set.size} (want 7–8)`);
  for (const id of set) if (!byId.has(id)) err(bid, `species "${id}" not in ${bid}.js`);
  const plants = [...set].filter(isPlant), animals = [...set].filter((id) => byId.has(id) && !isPlant(id));
  if (plants.length < 3 || plants.length > 4) err(bid, `plants ${plants.length} (want 3–4)`);
  if (!plants.some((id) => ['tree', 'coral'].includes(byId.get(id).kind))) err(bid, 'no tree (reef: no coral) in the set');

  // edges from diet + relations, restricted to the set
  const edges = [];
  for (const id of set) {
    const s = byId.get(id); if (!s) continue;
    for (const d of s.diet || []) if (set.has(d.id)) edges.push({ from: id, to: d.id, type: 'eats', part: d.part });
    for (const r of s.relations || []) if (set.has(r.target)) edges.push({ from: id, to: r.target, type: r.type });
  }
  const hasEdge = (a, b) => edges.some((e) => (e.from === a && e.to === b) || (e.from === b && e.to === a));
  // pollination works in the core only when the pollinator also drinks nectar of that plant
  const pollinatorsOf = (plant) => [...set].filter((a) => {
    const s = byId.get(a);
    return (s?.relations || []).some((r) => r.type === 'pollinates' && r.target === plant) &&
      (s?.diet || []).some((d) => d.id === plant && d.part === 'nectar');
  });
  const dispersals = edges.filter((e) => e.type === 'disperses');

  // no hunting inside the set; every animal has food in the set
  for (const e of edges) if (e.type === 'eats' && (e.part === 'animals' || e.part === 'insects')) err(bid, `${e.from} hunts ${e.to}`);
  for (const a of animals) if (!edges.some((e) => e.from === a && e.type === 'eats' && isPlant(e.to))) err(bid, `animal ${a} has no food in the set`);
  // the reef has no flowers and no seeds to carry: its story is partnership, so it needs a home / partner relation instead
  if (bid === 'reef') { if (!edges.some((e) => e.type === 'partner' || e.type === 'home')) err(bid, 'no partnership in the set'); }
  else {
    if (!plants.some((p) => pollinatorsOf(p).length)) err(bid, 'no working pollination relation in the set');
    if (!dispersals.length) err(bid, 'no dispersal relation in the set');
  }

  // ── start
  const start = new Set(K.start || []);
  if (start.size < 4 || start.size > 5) err(bid, `start count ${start.size} (want 4–5)`);
  for (const id of start) if (!set.has(id)) err(bid, `start "${id}" not in species`);

  // ── missions
  const ms = K.missions || [];
  if (ms.length < 6 || ms.length > 7) err(bid, `missions ${ms.length} (want 6–7)`);
  const avail = new Set(start);
  const unlockedBy = new Map();
  ms.forEach((m, i) => {
    const w = `mission ${m.id}`;
    if (m.id !== `k${i + 1}`) err(bid, `${w}: id should be k${i + 1}`);
    const keys = Object.keys(m);
    for (const f of MISSION_FIELDS) if (!keys.includes(f)) err(bid, `${w}: missing field ${f}`);
    for (const f of keys) if (!MISSION_FIELDS.includes(f)) err(bid, `${w}: unexpected field ${f}`);
    if (m.after !== (i === 0 ? null : ms[i - 1].id)) err(bid, `${w}: after should be ${i === 0 ? null : ms[i - 1].id}`);
    checkText(bid, `${w}.title`, m.title, 1);
    checkText(bid, `${w}.text`, m.text, 2);
    checkText(bid, `${w}.hint`, m.hint, 1);

    const g = m.goal || {};
    const want = GOAL_FIELDS[g.type];
    if (!want) err(bid, `${w}: goal type "${g.type}" not allowed`);
    else {
      for (const f of want) if (g[f] === undefined) err(bid, `${w}: goal missing ${f}`);
      for (const f of Object.keys(g)) if (f !== 'type' && !want.includes(f)) err(bid, `${w}: goal has extra field ${f}`);
    }
    if ('count' in g && g.type !== 'speciesAlive' && !(g.count >= 1 && g.count <= 3)) err(bid, `${w}: count ${g.count} (want 1–3)`);
    const need = (id, label) => {
      if (!set.has(id)) err(bid, `${w}: ${label} "${id}" not in the kids set`);
      else if (!avail.has(id)) err(bid, `${w}: ${label} "${id}" not unlocked yet`);
    };
    switch (g.type) {
      case 'place': need(g.species, 'species'); break;
      case 'grow': need(g.species, 'species'); if (!isPlant(g.species)) err(bid, `${w}: grow needs a plant`); break;
      case 'pollinate': {
        need(g.species, 'species');
        const ps = pollinatorsOf(g.species).filter((a) => avail.has(a));
        if (!ps.length) err(bid, `${w}: no available pollinator for ${g.species}`);
        break;
      }
      case 'link':
        need(g.from, 'from'); need(g.to, 'to');
        if (!hasEdge(g.from, g.to)) err(bid, `${w}: no relation between ${g.from} and ${g.to}`);
        break;
      case 'disperse': {
        const ok = dispersals.filter((e) => avail.has(e.from) && avail.has(e.to));
        if (!ok.length) err(bid, `${w}: no available disperser+plant pair`);
        break;
      }
      case 'tool':
        if (g.tool !== 'drone' && g.tool !== 'camera') err(bid, `${w}: tool "${g.tool}" not allowed`);
        if (g.tool === 'drone' && g.count !== 1) err(bid, `${w}: drone count must be 1`);
        break;
      case 'photos': {
        if (g.count > 2) err(bid, `${w}: photos count ${g.count} (max 2)`);
        const n = [...avail].filter((id) => !isPlant(id)).length;
        if (n < g.count) err(bid, `${w}: only ${n} animals available for ${g.count} photos`);
        break;
      }
      case 'speciesAlive': if (g.count > avail.size) err(bid, `${w}: speciesAlive ${g.count} > ${avail.size} available`); break;
    }

    const r = m.reward || {};
    if (!(r.points >= 20 && r.points <= 40)) err(bid, `${w}: points ${r.points} (want 20–40)`);
    if (!Array.isArray(r.unlock)) err(bid, `${w}: reward.unlock must be an array`);
    for (const id of r.unlock || []) {
      if (!set.has(id)) err(bid, `${w}: unlocks "${id}" not in the kids set`);
      if (start.has(id)) err(bid, `${w}: unlocks "${id}" which is already a start species`);
      if (unlockedBy.has(id)) err(bid, `${w}: "${id}" already unlocked by ${unlockedBy.get(id)}`);
      unlockedBy.set(id, m.id);
      avail.add(id);
    }
    if ((r.unlock || []).length > 1) warn(bid, `${w}: unlocks more than one species`);
  });
  for (const id of set) if (!start.has(id) && !unlockedBy.has(id)) err(bid, `"${id}" is never unlocked`);

  // ── tips & intro
  if ((K.tips || []).length !== 6) err(bid, `tips ${(K.tips || []).length} (want 6)`);
  (K.tips || []).forEach((t, i) => checkText(bid, `tip ${i + 1}`, t, 1));
  checkText(bid, 'intro', K.intro, 2);
}

for (const w of warns) console.log('WARN ', w);
for (const e of errors) console.log('ERROR', e);
if (errors.length) { console.log(`\n${errors.length} error(s)`); process.exit(1); }
console.log(`kids.js OK – ${Object.keys(KIDS).length} biomes checked${warns.length ? `, ${warns.length} warning(s)` : ''}`);
