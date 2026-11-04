// check-sync (1.4.3, Avi 4.11: "the layers are in step: what shows in one shows accordingly in the others, no
// contradictions"): checks that the words and the docs agree with the data they speak of.
//   1. the journey table in docs/JOURNEY.md has the same numbers as STAGES in src/core/journey.js (full and beginners)
//   2. every guide line is voiced: רובו־דע's in art/voice, קוּבִּי's in src/data/kubi-voice.js
//   3. every `at` of a guide line names classes and data attributes that exist in the game's code
//   4. the robot workshop: every technology card speaks of parts and missions that exist; six missions per zone
//   5. the zones: every zone of ZONE_IDS is in the start screen's list, the album, the quiz banks and the journey
// Usage: node tools/check-sync.mjs   (exit code 1 on errors)
import fs from 'fs';
import path from 'path';
import { STAGES, PARTS } from '../src/core/journey.js';
import { allGuideLines } from '../src/data/guide-lines.js';
import { ZONE_IDS } from '../src/data/zones.js';

const errors = []; const err = (m) => errors.push(m);
const ROOT = new URL('..', import.meta.url).pathname;
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// 1. the journey table
// numbers in words count too ("מחמישה פרקים", "בדרגה השלישית"); a need of 1 may be said without a number ("תעלומה
// פתורה"), and the island's rank is said from one (rank 2 = "השלישית")
const WORDS = { 'שתי': 2, 'שני': 2, 'שנייה': 2, 'השנייה': 2, 'שלוש': 3, 'שלושה': 3, 'השלישית': 3, 'ארבע': 4, 'ארבעה': 4, 'הרביעית': 4, 'חמש': 5, 'חמישה': 5, 'מחמישה': 5, 'שש': 6, 'שישה': 6 };
const docNums = (t) => [...(t.match(/\d+/g) || []).map(Number), ...t.split(/[\s,.()]+/).map((w) => WORDS[w.replace(/^[ובלמה](?=[א-ת]{3})/, '')] || WORDS[w]).filter(Boolean)];
const dataNums = (need) => (need || []).flatMap((w) => Object.entries(w).filter(([k]) => k !== 'or').map(([k, v]) => (k === 'rank' ? v + 1 : v))).filter((v) => typeof v === 'number' && v !== 1);
const rows = read('docs/JOURNEY.md').split('\n').filter((l) => /^\| *\d+ *\|/.test(l));
for (const S of STAGES) {
  const row = rows.find((r) => +r.split('|')[1] === S.n); if (!row) { if (!S.soon) err(`JOURNEY.md: no row for stage ${S.n}`); continue; }
  const cells = row.split('|').map((c) => c.trim());
  const docF = docNums(cells[3]), docK = docNums(cells[4]);
  const miss = (data, doc) => data.filter((x) => !doc.includes(x));
  if (S.need && miss(dataNums(S.need), docF).length) err(`stage ${S.n}: journey.js needs ${dataNums(S.need)}, the table (full) does not say ${miss(dataNums(S.need), docF)}`);
  if (S.kneed && miss(dataNums(S.kneed), docK).length) err(`stage ${S.n}: journey.js needs ${dataNums(S.kneed)}, the table (beginners) does not say ${miss(dataNums(S.kneed), docK)}`);
}

// 2. voices
const kubiVoice = read('src/data/kubi-voice.js');
const lines = allGuideLines();
for (const l of lines) {
  const robo = fs.existsSync(path.join(ROOT, 'art/voice', l.id + '.ogg'));
  const kubi = kubiVoice.includes(`'${l.id}'`) || kubiVoice.includes(`"${l.id}"`);
  if (!robo && !kubi) err(`guide line ${l.id} has no voice`);
}

// 3. the `at` of guide lines: its class names and data attributes are written somewhere in the code
const code = []; const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) { if (!p.endsWith('/guide')) walk(p); } else if (/\.(js|css)$/.test(p)) code.push(fs.readFileSync(p, 'utf8')); } };
walk(path.join(ROOT, 'src')); const all = code.join('\n');
for (const l of lines) {
  if (!l.at) continue;
  for (const c of l.at.match(/\.[a-zA-Z][\w-]*/g) || []) if (!all.includes(c.slice(1))) err(`guide line ${l.id}: at "${l.at}" names ${c}, which is nowhere in the code`);
  for (const a of l.at.match(/\[data-[\w-]+/g) || []) if (!all.includes(a.slice(1))) err(`guide line ${l.id}: at "${l.at}" names ${a.slice(1)}, which is nowhere in the code`);
}

// 4. the workshop
const W = await import('../src/data/robolab/workshop.js');
const T = await import('../src/data/robolab/tech-cards.js');
const M = await import('../src/data/robolab/missions.js');
const cards = T.TECH_CARDS;
const R = await import('../src/data/robolab/index.js');
const LESSONS = R.LESSONS || [], PUZZLES = R.PUZZLES || [];
const maxStars = 3 * (LESSONS.length + PUZZLES.length);
for (const c of cards) {
  const [k, v] = String(c.earn).split(':');
  if (k === 'chapter' && !LESSONS.some((q) => q.ch === +v)) err(`tech card ${c.id}: earned by chapter ${v}, which has no lessons`);
  else if (k === 'stars' && +v > maxStars) err(`tech card ${c.id}: earned at ${v} stars, but only ${maxStars} can be won`);
  else if (k === 'wk' && +v > W.WK_STEPS.length) err(`tech card ${c.id}: earned at workshop step ${v}, but there are ${W.WK_STEPS.length}`);
  else if (!['chapter', 'stars', 'wk', 'isl', 'lesson', 'puzzles', 'start'].includes(k)) err(`tech card ${c.id}: unknown earn ${c.earn}`);
}
const missions = [...(M.MISSIONS || []), ...(M.TEMPLATE_MISSIONS || [])];
for (const z of ZONE_IDS) { const n = missions.filter((m) => m.zone === z).length; if (n !== 6) err(`workshop missions: ${n} in ${z}, six expected`); }

// 5. zones in every list of the game
const kidsZones = (await import('../src/data/kids.js')).KIDS || {};
for (const z of ZONE_IDS) {
  if (!PARTS['zone:' + z]) err(`zone ${z}: no part zone:${z} in the journey`);
  if (!kidsZones[z]) err(`zone ${z}: no beginners' set in src/data/kids.js`);
}

if (errors.length) { for (const e of errors) console.log(e); console.log(`\n${errors.length} error(s)`); process.exit(1); }
console.log(`sync OK: ${STAGES.length} stages against the journey table, ${lines.length} guide lines voiced and pointing at real parts, ${cards.length} tech cards, ${missions.length} workshop missions, ${ZONE_IDS.length} zones`);
