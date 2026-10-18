// Validates src/data/amazon.js, src/data/grove.js and src/data/common.js against CONTRACT.md.
// Usage: node tools/validate-content.mjs   (exit code 1 on errors)
import { BIOME as AMAZON } from '../src/data/amazon.js';
import { BIOME as GROVE } from '../src/data/grove.js';
import { BIOME as REEF } from '../src/data/reef.js';
import * as COMMON from '../src/data/common.js';

const SPECIES = {
  amazon: [
    'kapok', 'brazilnut', 'fig', 'cecropia', 'acai', 'heliconia', 'bromeliad', 'orchid', 'liana', 'fern', 'glowfungus', 'waterlily',
    'leafcutter', 'orchidbee', 'morpho', 'hummingbird', 'dartfrog', 'toucan', 'macaw', 'sloth', 'agouti', 'howler', 'jaguar', 'harpy',
    'capybara', 'tapir', 'fruitbat', 'anteater', 'kinkajou', 'coati',
  ],
  grove: [
    'oak', 'terebinth', 'carob', 'pine', 'mastic', 'buckthorn', 'sage', 'rockrose', 'cyclamen', 'anemone', 'mushroom',
    'honeybee', 'butterfly', 'harvesterant', 'firefly', 'jay', 'blackbird', 'chameleon', 'agama', 'spinymouse', 'porcupine',
    'hedgehog', 'hyrax', 'gazelle', 'fox', 'owl', 'hoopoe', 'tortoise', 'chukar',
  ],
  reef: [
    'branching', 'brain', 'table', 'firecoral', 'softcoral', 'seafan', 'sponge', 'seaanemone', 'clam', 'seagrass', 'algae', 'plankton',
    'clownfish', 'parrotfish', 'surgeonfish', 'cleaner', 'butterflyfish', 'lionfish', 'moray', 'grouper', 'goby', 'shrimp', 'turtle',
    'octopus', 'urchin', 'starfish', 'stingray', 'hermit', 'jellyfish', 'reefshark',
  ],
};
const LAYER_IDS = {
  amazon: ['emergent', 'canopy', 'understory', 'floor', 'water'],
  grove: ['canopy', 'understory', 'floor'],
  reef: ['shallow', 'slope', 'sand', 'open'],
};
const KINDS = ['tree', 'palm', 'shrub', 'herb', 'epiphyte', 'vine', 'fungus', 'water-plant', 'animal', 'colony', 'swarm', 'coral', 'sessile', 'seaplant'];
const ANIMAL_KINDS = ['animal', 'colony', 'swarm'];
const LOCOMOTION = ['ground', 'arboreal', 'flying', 'water', 'swim'];
const ACTIVE = ['day', 'night', 'both'];
const GROWTH = ['fast', 'medium', 'slow'];
const PARTS = ['leaves', 'fruit', 'nectar', 'seeds', 'insects', 'animals', 'fungus', 'dead', 'roots', 'algae', 'plankton', 'polyps'];
const REL_TYPES = ['pollinates', 'disperses', 'home', 'shelter', 'decomposes', 'partner', 'climbs', 'eats'];
const SEASONS = ['winter', 'spring', 'summer', 'autumn'];
const GOALS = {
  place: ['species', 'count'], speciesAlive: ['count'], link: ['from', 'to'], chain: ['length'],
  health: ['min', 'seconds'], grow: ['species', 'count'], floorLight: ['min'], pollinate: ['species', 'count'],
  disperse: ['count'], discover: ['count'], observeNight: [], survive: ['event'], bloom: ['species', 'season'], experiment: [],
  tool: ['tool', 'count'], photos: ['count'], rescue: ['count'], seeded: ['count'],
  all: ['parts'],   // expert missions: every part at once (src/game/missions.js evalPart), optional hold / holdLabel
};
// the parts of an expert mission's 'all' goal (each also needs a label for the checklist)
const GOAL_PARTS = {
  alive: ['species', 'count'], atMost: ['species', 'max'], fed: ['species', 'min'], did: ['stat', 'count'],
  toolSince: ['tool', 'count'], tool: ['tool', 'count'], young: ['species', 'min', 'count'], sownBy: ['species', 'by', 'count'],
  plantLight: ['species', 'min', 'count'], growTo: ['species', 'min', 'count'], pollinate: ['species', 'count'],
  swimKinds: ['count'], kinds: ['count'], link: ['from', 'to'], calm: ['seconds'], eventDone: ['event'], seasons: ['count', 'kinds'],
};
const DID_STATS = ['uprooted', 'moved', 'letGo', 'reshaped'];
const EFFECTS = {
  treeFall: ['target'], rain: ['seconds'], drought: ['seconds', 'strength'], fire: ['strength'], heat: ['seconds'],
  flood: ['seconds'], points: ['amount'], add: ['species', 'count'], remove: ['species', 'count'], unlock: ['species'],
  boost: ['species', 'amount'], plant: ['species', 'count', 'where'],
  logging: ['count'], anchor: ['count'], protect: [], road: [], ecoBridge: [], removeRoad: [],
};
// Forbidden content (hard content rules). Matched as substrings on all Hebrew/English text.
const FORBIDDEN = [
  'מיליוני שנים', 'מיליוני שנה', 'מיליון שנה', 'מיליון שנים', 'millions of years', 'million years',
  'דינוזאור', 'dinosaur', 'אבולוציה', 'evolution', 'evolve', 'התפתחות המינים', 'התפתחו מ',
  'חזיר', 'pig', 'boar', 'swine',
  'אנשים', 'בני אדם', 'אדם ', 'האדם', 'איש ', 'אישה', 'ילד ', 'ילדים', 'human', 'people', 'person', 'hunter', 'ציידים', 'ציד אדם',
  'זיווג', 'הזדווג', 'מין ', 'מיני', 'mating', 'sex',
  'דם', 'blood', 'טורף את', 'קורע', 'גווייה', 'גופה', 'פגר',
];
// words with "מין" (species) are legit: only flag 'מין ' when followed by sexual context – handled by allow-list below
const ALLOW = ['מין אחד', 'מין אחר', 'מינים', 'מין של', 'מין קטן', 'מין ',];

const errors = [];
const warnings = [];
const err = (b, m) => errors.push(`[${b}] ${m}`);
const warn = (b, m) => warnings.push(`[${b}] ${m}`);

function collectStrings(obj, out = [], path = '') {
  if (typeof obj === 'string') out.push([path, obj]);
  else if (Array.isArray(obj)) obj.forEach((v, i) => collectStrings(v, out, `${path}[${i}]`));
  else if (obj && typeof obj === 'object')
    for (const [k, v] of Object.entries(obj)) if (k !== 'sources' && k !== 'nameEn' && k !== 'color') collectStrings(v, out, path ? `${path}.${k}` : k);
  return out;
}

function checkForbidden(b, obj) {
  for (const [path, s] of collectStrings(obj)) {
    const low = s.toLowerCase();
    for (const w of FORBIDDEN) {
      if (w === 'מין ' || w === 'מיני') continue; // too ambiguous in Hebrew ("מין" = species); see sexual list below
      if (w === 'חזיר') {
        // whole word with common prefixes (ה/ו/ל/ב/ש/כ), so "מחזיר" (returns) is not flagged
        if (/(^|[^\u05d0-\u05ea])[הולבשכ]{0,2}חזיר(ים|י|ה|ות)?($|[^\u05d0-\u05ea])/.test(s)) err(b, `forbidden word "${w}" in ${path}: ${s}`);
        continue;
      }
      if (w === 'דם') {
        if (/(^|[\s,.!?:;"'()\-–])דם($|[\s,.!?:;"'()\-–])/.test(s)) err(b, `forbidden word "${w}" in ${path}: ${s}`);
        continue;
      }
      if (w === 'אדם ' || w === 'איש ' || w === 'ילד ') {
        if (new RegExp(`(^|[\\s,.!?:;"'()\\-–])${w}`).test(s + ' ')) err(b, `forbidden word "${w.trim()}" in ${path}: ${s}`);
        continue;
      }
      if (/^[a-z ]+$/.test(w)) {
        if (new RegExp(`\\b${w}`, 'i').test(low)) err(b, `forbidden word "${w}" in ${path}: ${s}`);
      } else if (s.includes(w)) err(b, `forbidden word "${w}" in ${path}: ${s}`);
    }
  }
}

function isNum(x) { return typeof x === 'number' && Number.isFinite(x); }

function validateBiome(B, id) {
  if (B.id !== id) err(id, `BIOME.id is "${B.id}"`);
  for (const k of ['name', 'subtitle', 'intro']) if (typeof B[k] !== 'string' || !B[k]) err(id, `missing ${k}`);

  // layers
  const layerIds = (B.layers || []).map((l) => l.id);
  for (const L of LAYER_IDS[id]) if (!layerIds.includes(L)) err(id, `missing layer "${L}"`);
  for (const l of B.layers || []) {
    if (!l.name || !l.desc) err(id, `layer ${l.id} missing name/desc`);
    if (!Array.isArray(l.yRange) || l.yRange.length !== 2 || !(l.yRange[0] < l.yRange[1])) err(id, `layer ${l.id} bad yRange`);
  }

  // species ids exact
  const ids = (B.species || []).map((s) => s.id);
  const expected = SPECIES[id];
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  if (dup.length) err(id, `duplicate species ids: ${dup.join(', ')}`);
  for (const e of expected) if (!ids.includes(e)) err(id, `missing species "${e}"`);
  for (const x of ids) if (!expected.includes(x)) err(id, `unknown species "${x}"`);
  const idSet = new Set(ids);

  const missionIds = new Set((B.missions || []).map((m) => m.id));
  const eventIds = new Set((B.events || []).map((e) => e.id));

  for (const s of B.species || []) {
    const p = `species ${s.id}`;
    for (const k of ['name', 'nameEn', 'fact', 'more', 'color']) if (typeof s[k] !== 'string' || !s[k]) err(id, `${p}: missing ${k}`);
    if (!KINDS.includes(s.kind)) err(id, `${p}: bad kind "${s.kind}"`);
    if (!layerIds.includes(s.layer)) err(id, `${p}: bad layer "${s.layer}"`);
    if (!/^#[0-9a-fA-F]{6}$/.test(s.color || '')) err(id, `${p}: color must be #rrggbb`);
    const isAnimal = ANIMAL_KINDS.includes(s.kind);
    if (isAnimal) {
      if (!LOCOMOTION.includes(s.locomotion)) err(id, `${p}: animal needs locomotion`);
      if (!ACTIVE.includes(s.active)) err(id, `${p}: animal needs active`);
      if (!Array.isArray(s.diet)) err(id, `${p}: animal needs diet array`);
    } else {
      if (!isNum(s.lightNeed) || s.lightNeed < 0 || s.lightNeed > 1) err(id, `${p}: lightNeed must be 0..1`);
      if (typeof s.shadeTolerant !== 'boolean') err(id, `${p}: shadeTolerant must be boolean`);
      if (!GROWTH.includes(s.growth)) err(id, `${p}: bad growth`);
      if (s.active !== undefined && !ACTIVE.includes(s.active)) err(id, `${p}: bad active`);
      if (id === 'grove') {
        const se = s.seasons;
        if (!se) err(id, `${p}: grove plant needs seasons`);
        else {
          if (!['evergreen', 'deciduous'].includes(se.leaves)) err(id, `${p}: seasons.leaves`);
          for (const k of ['bloom', 'fruit', 'dormant']) {
            if (se[k] === undefined) continue;
            if (!Array.isArray(se[k]) || se[k].some((x) => !SEASONS.includes(x))) err(id, `${p}: seasons.${k} bad`);
          }
        }
      }
    }
    if (s.seasons && isAnimal) {
      for (const k of Object.keys(s.seasons)) {
        if (!['leaves', 'bloom', 'fruit', 'dormant'].includes(k)) err(id, `${p}: seasons.${k} unknown`);
        if (k !== 'leaves' && (!Array.isArray(s.seasons[k]) || s.seasons[k].some((x) => !SEASONS.includes(x)))) err(id, `${p}: seasons.${k} bad`);
      }
    }
    if (s.needs) {
      for (const [k, v] of Object.entries(s.needs)) {
        if (k === 'water' || k === 'rocks') { if (v !== true) err(id, `${p}: needs.${k} must be true`); }
        else if (k === 'host') { if (v !== 'tree') err(id, `${p}: needs.host must be 'tree'`); }
        else err(id, `${p}: unknown need "${k}"`);
      }
    }
    for (const d of s.diet || []) {
      if (!idSet.has(d.id)) err(id, `${p}: diet target "${d.id}" not in biome`);
      if (!PARTS.includes(d.part)) err(id, `${p}: diet part "${d.part}" invalid`);
      if (d.id === s.id) err(id, `${p}: eats itself`);
    }
    if (!Array.isArray(s.relations)) err(id, `${p}: relations must be an array`);
    for (const r of s.relations || []) {
      if (!idSet.has(r.target)) err(id, `${p}: relation target "${r.target}" not in biome`);
      if (!REL_TYPES.includes(r.type)) err(id, `${p}: relation type "${r.type}" invalid`);
      if (typeof r.text !== 'string' || !r.text) err(id, `${p}: relation to ${r.target} missing text`);
      if (r.target === s.id) err(id, `${p}: relation to itself`);
      if (r.type === 'climbs' && !(s.needs && s.needs.host)) warn(id, `${p}: climbs but has no needs.host`);
    }
    if (!isNum(s.cost) || s.cost <= 0) err(id, `${p}: bad cost`);
    if (!Array.isArray(s.groupSize) || s.groupSize.length !== 2 || !(s.groupSize[0] >= 1 && s.groupSize[0] <= s.groupSize[1]))
      err(id, `${p}: bad groupSize`);
    if (!Number.isInteger(s.maxCount) || s.maxCount < 1) err(id, `${p}: bad maxCount`);
    if (s.unlock !== 'start' && !missionIds.has(s.unlock)) err(id, `${p}: unlock "${s.unlock}" is not 'start' or a mission id`);
    if (s.question) {
      const q = s.question;
      if (typeof q.q !== 'string' || !Array.isArray(q.options) || q.options.length !== 3) err(id, `${p}: question must have q + 3 options`);
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= (q.options || []).length) err(id, `${p}: question.answer out of range`);
    } else err(id, `${p}: missing question`);
    if (!Array.isArray(s.sources) || !s.sources.length || s.sources.some((u) => !/^https?:\/\//.test(u))) err(id, `${p}: sources must be URLs`);
  }

  // every animal must have something to eat (diet) or be a non-eating role (pollinator/decomposer) – warn only
  for (const s of B.species || []) {
    if (ANIMAL_KINDS.includes(s.kind) && !(s.diet || []).length && !(s.relations || []).length) warn(id, `species ${s.id}: no diet and no relations`);
  }

  // missions
  const starters = (B.species || []).filter((s) => s.unlock === 'start').map((s) => s.id);
  const unlockedByMission = new Map();
  for (const m of B.missions || []) {
    const p = `mission ${m.id}`;
    for (const k of ['title', 'text', 'hint']) if (typeof m[k] !== 'string' || !m[k]) err(id, `${p}: missing ${k}`);
    if (m.after !== null && !missionIds.has(m.after)) err(id, `${p}: after "${m.after}" invalid`);
    const g = m.goal || {};
    if (!GOALS[g.type]) err(id, `${p}: goal type "${g.type}" invalid`);
    else if (g.type === 'all') {
      if (!m.expert) err(id, `${p}: an 'all' goal is for expert missions`);
      if (!Array.isArray(g.parts) || !g.parts.length) err(id, `${p}: goal all needs parts`);
      for (const k of Object.keys(g)) if (!['type', 'parts', 'hold', 'holdLabel'].includes(k)) err(id, `${p}: goal all unknown param ${k}`);
      if (g.hold !== undefined && !(Number.isInteger(g.hold) && g.hold > 0)) err(id, `${p}: hold must be positive int`);
      for (const q of g.parts || []) {
        const req = GOAL_PARTS[q.type];
        if (!req) { err(id, `${p}: part type "${q.type}" invalid`); continue; }
        if (typeof q.label !== 'string' || !q.label) err(id, `${p}: part ${q.type} needs a label`);
        for (const k of req) if (q[k] === undefined) err(id, `${p}: part ${q.type} missing ${k}`);
        const opt = q.type === 'eventDone' ? ['after'] : [];
        for (const k of Object.keys(q)) if (k !== 'type' && k !== 'label' && !req.includes(k) && !opt.includes(k)) err(id, `${p}: part ${q.type} unknown param ${k}`);
        for (const k of ['species', 'from', 'to', 'by']) if (q[k] !== undefined && !idSet.has(q[k])) err(id, `${p}: part ${k} "${q[k]}" not in biome`);
        if (q.event !== undefined && !eventIds.has(q.event)) err(id, `${p}: part event "${q.event}" not an event id`);
        if (q.stat !== undefined && !DID_STATS.includes(q.stat)) err(id, `${p}: part stat "${q.stat}" invalid`);
        if (q.min !== undefined && !(isNum(q.min) && q.min > 0 && q.min <= 1)) err(id, `${p}: part min must be 0..1`);
      }
    }
    else {
      for (const k of GOALS[g.type]) if (g[k] === undefined) err(id, `${p}: goal ${g.type} missing ${k}`);
      for (const k of Object.keys(g)) if (k !== 'type' && !GOALS[g.type].includes(k)) err(id, `${p}: goal ${g.type} unknown param ${k}`);
      for (const k of ['species', 'from', 'to']) if (g[k] !== undefined && !idSet.has(g[k])) err(id, `${p}: goal ${k} "${g[k]}" not in biome`);
      if (g.season !== undefined && !SEASONS.includes(g.season)) err(id, `${p}: goal season invalid`);
      if (g.event !== undefined && !eventIds.has(g.event)) err(id, `${p}: goal event "${g.event}" not an event id`);
      for (const k of ['count', 'length', 'seconds']) if (g[k] !== undefined && !(Number.isInteger(g[k]) && g[k] > 0)) err(id, `${p}: goal ${k} must be positive int`);
      if (g.min !== undefined && !(isNum(g.min) && g.min > 0 && g.min <= 1)) err(id, `${p}: goal min must be 0..1`);
      if (g.type === 'bloom' && id === 'amazon') err(id, `${p}: bloom goal in amazon (no seasons)`);
      if (g.type === 'link') {
        const from = B.species.find((s) => s.id === g.from);
        const has = from && ((from.diet || []).some((d) => d.id === g.to) || (from.relations || []).some((r) => r.target === g.to));
        if (!has) err(id, `${p}: link ${g.from}→${g.to} not defined in diet/relations of ${g.from}`);
      }
      if (g.type === 'pollinate') {
        const has = B.species.some((s) => (s.relations || []).some((r) => r.type === 'pollinates' && r.target === g.species));
        if (!has) err(id, `${p}: nobody pollinates ${g.species}`);
      }
      if (g.type === 'bloom') {
        const sp = B.species.find((s) => s.id === g.species);
        if (!sp?.seasons?.bloom?.includes(g.season)) err(id, `${p}: ${g.species} does not bloom in ${g.season}`);
      }
    }
    const r = m.reward || {};
    if (!isNum(r.points) || r.points < 0) err(id, `${p}: reward.points`);
    if (!Array.isArray(r.unlock)) err(id, `${p}: reward.unlock must be array`);
    for (const u of r.unlock || []) {
      if (!idSet.has(u)) err(id, `${p}: reward unlock "${u}" not in biome`);
      unlockedByMission.set(u, m.id);
    }
  }
  // unlock consistency
  for (const s of B.species || []) {
    if (s.unlock === 'start') { if (unlockedByMission.has(s.id)) err(id, `species ${s.id}: is 'start' but also a mission reward`); }
    else if (unlockedByMission.get(s.id) !== s.unlock) err(id, `species ${s.id}: unlock "${s.unlock}" but mission reward lists it in "${unlockedByMission.get(s.id)}"`);
  }
  // mission chain order: each mission's goal species must be available by then
  const order = [];
  {
    let cur = (B.missions || []).find((m) => m.after === null);
    const seen = new Set();
    while (cur && !seen.has(cur.id)) { order.push(cur); seen.add(cur.id); cur = B.missions.find((m) => m.after === cur.id); }
    if (order.length !== (B.missions || []).length) warn(id, `missions are not one linear chain (${order.length}/${B.missions.length})`);
  }
  const avail = new Set(starters);
  for (const m of order) {
    const g = m.goal || {};
    for (const k of ['species', 'from', 'to']) if (g[k] && !avail.has(g[k])) err(id, `mission ${m.id}: needs "${g[k]}" which is not unlocked yet`);
    for (const q of g.parts || []) for (const k of ['species', 'from', 'to', 'by']) if (q[k] && !avail.has(q[k])) err(id, `mission ${m.id}: needs "${q[k]}" which is not unlocked yet`);
    for (const u of m.reward?.unlock || []) avail.add(u);
  }
  if (starters.length < 5 || starters.length > 8) warn(id, `starter set size ${starters.length}`);

  // events
  for (const e of B.events || []) {
    const p = `event ${e.id}`;
    for (const k of ['title', 'text']) if (typeof e[k] !== 'string' || !e[k]) err(id, `${p}: missing ${k}`);
    const t = e.trigger || {};
    if (t.type === 'day') { if (!(Number.isInteger(t.day) && t.day >= 0)) err(id, `${p}: trigger.day`); }
    else if (t.type === 'mission') { if (!missionIds.has(t.id)) err(id, `${p}: trigger mission "${t.id}" invalid`); }
    else if (t.type === 'random') {
      if (!(isNum(t.chancePerDay) && t.chancePerDay > 0 && t.chancePerDay <= 1)) err(id, `${p}: chancePerDay`);
      if (t.season !== undefined && (id === 'amazon' || !SEASONS.includes(t.season))) err(id, `${p}: trigger season invalid`);
    } else err(id, `${p}: trigger type "${t.type}" invalid`);
    const checkEffects = (list, where) => {
      if (!Array.isArray(list)) { err(id, `${p}: ${where} must be array`); return; }
      for (const ef of list) {
        const req = EFFECTS[ef.type];
        if (!req) { err(id, `${p}: ${where} effect type "${ef.type}" invalid`); continue; }
        for (const k of req) if (ef[k] === undefined) err(id, `${p}: ${where} ${ef.type} missing ${k}`);
        for (const k of Object.keys(ef)) if (k !== 'type' && !req.includes(k)) err(id, `${p}: ${where} ${ef.type} unknown param ${k}`);
        if (ef.species !== undefined && !idSet.has(ef.species)) err(id, `${p}: ${where} species "${ef.species}" not in biome`);
        if (ef.type === 'treeFall' && ef.target !== 'tallest' && !idSet.has(ef.target)) err(id, `${p}: treeFall target invalid`);
        if (ef.type === 'remove' && !(ef.count === 'all' || (Number.isInteger(ef.count) && ef.count > 0))) err(id, `${p}: remove count`);
        if ((ef.type === 'add' || ef.type === 'plant') && !(Number.isInteger(ef.count) && ef.count > 0)) err(id, `${p}: ${ef.type} count`);
        if (ef.type === 'plant' && !['gap', 'any'].includes(ef.where)) err(id, `${p}: plant where`);
        for (const k of ['seconds']) if (ef[k] !== undefined && !(isNum(ef[k]) && ef[k] > 0)) err(id, `${p}: ${ef.type}.${k}`);
        for (const k of ['strength']) if (ef[k] !== undefined && !(isNum(ef[k]) && ef[k] > 0 && ef[k] <= 1)) err(id, `${p}: ${ef.type}.${k} must be 0..1`);
        if (ef.type === 'boost' && !(isNum(ef.amount) && ef.amount > 0 && ef.amount <= 1)) err(id, `${p}: boost amount 0..1`);
        if (ef.type === 'points' && !isNum(ef.amount)) err(id, `${p}: points amount`);
        if (id === 'amazon' && ef.type === 'fire' && ef.strength > 0.5) warn(id, `${p}: strong fire in amazon`);
      }
    };
    if (e.start !== undefined) checkEffects(e.start, 'start');
    if (!Array.isArray(e.choices) || e.choices.length < 2 || e.choices.length > 3) err(id, `${p}: needs 2–3 choices`);
    const cids = new Set();
    for (const c of e.choices || []) {
      if (!c.id || cids.has(c.id)) err(id, `${p}: choice id missing/duplicate`);
      cids.add(c.id);
      if (!c.label || !c.outcome) err(id, `${p}: choice ${c.id} missing label/outcome`);
      checkEffects(c.effects, `choice ${c.id}`);
    }
  }
  // survive goals must point to an event triggered by that same mission (or reachable)
  for (const m of B.missions || []) {
    if (m.goal?.type === 'survive') {
      const ev = (B.events || []).find((e) => e.id === m.goal.event);
      if (ev && !(ev.trigger.type === 'mission' && ev.trigger.id === m.id)) warn(id, `mission ${m.id}: survive event ${ev.id} is not triggered by this mission`);
    }
  }

  if (!Array.isArray(B.tips) || B.tips.length < 10) err(id, `need 10+ tips (have ${B.tips?.length})`);

  // counts
  // the expert missions come after the regular ones and are counted apart
  const regular = (B.missions || []).filter((m) => !m.expert), expert = (B.missions || []).filter((m) => m.expert);
  if (regular.length < 10 || regular.length > 21) warn(id, `${regular.length} regular missions (want 10–21)`);
  if (expert.length && expert.length !== 4) warn(id, `${expert.length} expert missions (want 4)`);
  if (expert.some((m) => regular.indexOf(B.missions.find((x) => x.id === m.after)) < 0 && !expert.some((x) => x.id === m.after))) err(id, 'expert missions must follow the regular chain');
  if ((B.events || []).length < 6 || B.events.length > 8) warn(id, `${B.events.length} events (want 6–8)`);

  checkForbidden(id, B);
}

validateBiome(AMAZON, 'amazon');
validateBiome(GROVE, 'grove');
validateBiome(REEF, 'reef');

// common.js
for (const t of REL_TYPES) if (!COMMON.RELATION_TYPES?.[t]?.name) err('common', `RELATION_TYPES.${t} missing`);
for (const t of PARTS) if (!COMMON.DIET_PARTS?.[t]) err('common', `DIET_PARTS.${t} missing`);
for (const t of KINDS) if (!COMMON.KINDS?.[t]) err('common', `KINDS.${t} missing`);
for (const t of SEASONS) if (!COMMON.SEASON_NAMES?.[t]) err('common', `SEASON_NAMES.${t} missing`);
for (const t of ACTIVE) if (!COMMON.ACTIVE_NAMES?.[t]) err('common', `ACTIVE_NAMES.${t} missing`);
for (const t of Object.keys(GOALS)) if (!COMMON.GOAL_LABELS?.[t]) err('common', `GOAL_LABELS.${t} missing`);
checkForbidden('common', COMMON);

// UI, learning hub, card games and the Torah edition: the same hard rules on every Hebrew string shown to children
// (whole-word matching with the usual one-letter prefixes, so דבורה / עשרה are not caught)
{
  const fs = await import('node:fs'), path = await import('node:path');
  const files = [];
  const walk = (d) => { for (const f of fs.readdirSync(d)) { const q = path.join(d, f); if (fs.statSync(q).isDirectory()) walk(q); else if (/\.js$/.test(f)) files.push(q); } };
  for (const d of ['src/learn', 'src/ui', 'src/research', 'src/lab']) if (fs.existsSync(d)) walk(d);
  for (const f of fs.readdirSync('src/data')) if (/torah|source|invention|lab-questions|badges/i.test(f)) files.push(path.join('src/data', f));
  const W = ['אישה', 'אשה', 'נשים', 'ילדה', 'ילדות', 'נערה', 'דינוזאור', 'דינוזאורים', 'אבולוציה'];
  const re = new RegExp(`(^|[^\u05d0-\u05ea])[והבלכמש]{0,2}(${W.join('|')})(?=$|[^\u05d0-\u05ea])`);
  const en = /\b(girls?|wom[ae]n|dinosaurs?|millions of years)\b/i;
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g)) {
      const t = m[2]; if (!/[\u05d0-\u05ea]/.test(t)) continue;
      const plain = t.replace(/[\u0591-\u05c7]/g, '');   // ignore nikud
      if (re.test(plain) || en.test(plain) || /מיליוני שנ|מיליון שנ/.test(plain)) err('ui', `${f}: forbidden word in "${plain.slice(0, 60)}"`);
    }
  }
}

// summary
const summ = (B) => {
  const start = B.species.filter((s) => s.unlock === 'start').map((s) => s.id);
  return `${B.id}: ${B.species.length} species (start: ${start.join(', ')}), ${B.missions.length} missions, ${B.events.length} events, ${B.tips.length} tips`;
};
console.log(summ(AMAZON));
console.log(summ(GROVE));
for (const w of warnings) console.log('WARN ', w);
for (const e of errors) console.log('ERROR', e);
console.log(errors.length ? `\n${errors.length} error(s)` : '\nOK – no errors');
process.exit(errors.length ? 1 : 0);
