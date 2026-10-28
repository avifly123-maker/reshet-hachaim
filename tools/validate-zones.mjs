// Every zone in src/data/zones.js has everything a zone needs (1.4: the one list of zones).
// A new zone is done only when this passes. It checks the zone's own files, then every table elsewhere in the game
// that holds one entry per zone (names, colours, icons, lab words, card games, ranks, kids' set, guide lines…).
//   node tools/validate-zones.mjs            all zones
//   node tools/validate-zones.mjs desert     one zone
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const imp = (f) => import(pathToFileURL(path.join(ROOT, f)).href);
process.removeAllListeners('warning');

const { ZONES, ZONE_IDS, ZONE_LOOK } = await imp('src/data/zones.js');
const only = process.argv[2];
const ids = only ? [only] : ZONE_IDS;
const errors = [];
const bad = (z, msg) => errors.push(`${z}: ${msg}`);

// one entry per zone in these tables. `key` = the zone id followed by ':' (an object key); `str` = the zone id as a
// quoted string anywhere in the file (a list or a comparison). The note says what the entry is.
const TABLES = [
  ['src/core/place.js', 'key', 'the words for the place (בחורש, אל השונית…)'],
  ['src/core/packs.js', 'key', 'the zone pack loader'],
  ['src/learn/hub/base.js', 'key', 'the zone data in the hub (BIOMES)'],
  ['src/learn/hub/quiz-build.js', 'key', 'the quiz tag (BANK_TAG)'],
  ['src/learn/hub/cards.js', 'key', 'the album place name (SET_WHERE)'],
  ['src/learn/hub/home.js', 'key', 'the badge group icon (BGROUP_IC)'],
  ['src/ui/icons-hub.js', 'key', 'the zone icon and its tile colour'],
  ['src/game/after.js', 'key', 'the photo decoration counts (DECOR_N)'],
  ['src/game/photos.js', 'key', 'the zone in photo captions'],
  ['src/game/rank.js', 'key', 'the island ranks'],
  ['src/lab/questions.js', 'str', 'the atlas questions zone tab'],
  ['src/lab/cabinet.js', 'key', 'the cabinet zone colour'],
  ['src/lab/clue-cases.js', 'key', 'the clue cases zone words'],
  ['src/lab/kids-text.js', 'key', 'the beginners lab zone words'],
  ['src/lab/sort-data.js', 'key', 'the sorting game zone words'],
  ['src/audio/audio.js', 'str', 'the zone sound bed'],
  ['src/data/kids.js', 'key', 'the beginners set (מתחילים)'],
  ['src/data/badges.js', 'str', 'the zone badge group'],
  ['src/data/guide/zone.js', 'str', "רובו־דע's first visit lines ('zone:<id>')"],
  ['src/learn/games/keep-forest/data.js', 'str', 'the "מחזיקים" board'],
  ['src/data/island-art.js', 'str', 'the island picture on the start screen (tools/render-island.py)'],
];

for (const z of ids) {
  if (!ZONES[z]) { bad(z, 'not in src/data/zones.js'); continue; }
  const look = ZONE_LOOK[z];
  if (!look) bad(z, 'no ZONE_LOOK entry in src/data/zones.js');
  else for (const k of ['short', 'shortK', 'inside', 'color', 'mascot', 'decor']) if (!look[k]) bad(z, `ZONE_LOOK.${k} is missing`);

  // the zone's own files
  for (const f of [`src/data/${z}.js`, `src/packs/${z}.js`]) if (!fs.existsSync(path.join(ROOT, f))) bad(z, `${f} is missing`);
  let B = null;
  try { B = (await imp(`src/data/${z}.js`)).BIOME; } catch (e) { bad(z, `src/data/${z}.js does not load: ${e.message}`); }
  if (B) {
    if (B.id !== z) bad(z, `BIOME.id is '${B.id}'`);
    for (const k of ['species', 'missions', 'events', 'tips', 'layers']) if (!Array.isArray(B[k]) || !B[k].length) bad(z, `BIOME.${k} is empty`);
    const sp = new Set((B.species || []).map((s) => s.id));
    if (look && !sp.has(look.mascot)) bad(z, `the mascot '${look.mascot}' is not one of its species`);
    if (look && !sp.has(look.decor)) bad(z, `the decoration animal '${look.decor}' is not one of its species`);
    for (const s of B.species || []) if (!(s.sources || []).length) bad(z, `species '${s.id}' has no source`);
  }

  // the quiz: as validate-quiz asks for every place
  try {
    const { QBANK } = await imp('src/data/quiz-bank.js');
    const n = QBANK.filter((q) => q.z === z).length;
    if (n < 110) bad(z, `${n} quiz questions (110 needed)`);
  } catch (e) { bad(z, 'quiz bank: ' + e.message); }

  // 1.4 (Avi, 28.10): a new place reaches every part of the game, not only the island. Each line below is one part.
  const atLeast = (n, have, what) => { if (have < n) bad(z, `${what}: ${have} (at least ${n})`); };
  if (B) {
    // the album: a painting for every species card and for every device of this place
    const { TOOL_DEFS } = await imp('src/game/tool-defs.js');
    const devs = TOOL_DEFS.filter((t) => t.zones && t.zones.length === 1 && t.zones[0] === z).map((t) => t.id);
    const noArt = [...(B.species || []).map((x) => x.id), ...devs].filter((id) => !fs.existsSync(path.join(ROOT, 'art', id + '.webp')));
    if (noArt.length) bad(z, `card paintings missing (art/<id>.webp, tools/build-card-art.py): ${noArt.join(', ')}`);
    // album sets of this place
    atLeast(2, (rd('src/learn/hub/cards.js').match(new RegExp(`where: '${z}'`, 'g')) || []).length, 'album sets (cards.js SET_DEFS)');
  }
  // חוקרי הטבע: mysteries of this place, one at each level
  { const files = fs.readdirSync(path.join(ROOT, 'src/research/cases')).filter((f) => f.endsWith('.js') && f !== 'index.js');
    const lv = new Set(); let n = 0;
    for (const f of files) { const t = rd('src/research/cases/' + f); if (new RegExp(`zone:\\s*'${z}'`).test(t)) { n++; const m = t.match(/level:\s*'(\w+)'/); if (m) lv.add(m[1]); } }
    atLeast(3, n, 'mysteries in חוקרי הטבע (src/research/cases)');
    for (const l of ['kids', 'middle', 'advanced']) if (n && !lv.has(l)) bad(z, `no ${l} mystery in חוקרי הטבע`); }
  // the lab of רובו־דע: microscope samples, atlas questions, clue cases, observe finds, the sorting pool
  const cnt = (f, re) => (rd(f).match(re) || []).length;
  atLeast(2, cnt('src/lab/samples.js', new RegExp(`zone: '${z}'`, 'g')), 'microscope samples (src/lab/samples.js)');
  atLeast(4, cnt('src/data/lab-questions.js', new RegExp(`zone: '${z}'`, 'g')), 'atlas research questions (src/data/lab-questions.js)');
  atLeast(6, cnt('src/lab/clue-cases.js', new RegExp(`zone: '${z}'`, 'g')), 'clue cases "מי השאיר את זה?" (src/lab/clue-cases.js)');
  const spIds = new Set(((B && B.species) || []).map((x) => x.id));
  atLeast(2, [...rd('src/lab/observe-cases.js').matchAll(/after: 'card:(\w+)'/g)].filter((m) => spIds.has(m[1])).length, 'observe finds about its creatures (src/lab/observe-cases.js, after: card:<id>)');
  atLeast(6, cnt('src/lab/sort-data.js', new RegExp(`\\['\\w+', '${z}'`, 'g')), 'creatures in the sorting game (src/lab/sort-data.js)');
  // הממציאים: problems that come from this place's creatures, and threads that tie the place to other parts
  atLeast(3, [...rd('src/data/inventions.js').matchAll(/real: '(\w+)'/g)].filter((m) => spIds.has(m[1])).length, 'inventors problems learned from its creatures (src/data/inventions.js, real)');
  atLeast(1, cnt('src/data/threads.js', new RegExp(`'zone:${z}'`, 'g')), 'threads (src/data/threads.js parts)');

  // the tables elsewhere
  for (const [f, how, what] of TABLES) {
    const s = rd(f);
    const re = how === 'key' ? new RegExp(`(^|[\\s{,'"])${z}['"]?\\s*:`, 'm') : new RegExp(`['"\`]${z}['":]`);
    if (!re.test(s)) bad(z, `${what}: no entry in ${f}`);
  }
}

if (errors.length) {
  console.log(errors.join('\n'));
  console.log(`validate-zones: ${errors.length} missing`);
  process.exit(1);
}
console.log(`validate-zones: ${ids.length} zones complete (${ids.join(', ')})`);
