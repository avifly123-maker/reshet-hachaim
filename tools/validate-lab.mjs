// מעבדת רובו־דע at the beginners' level: every word a child of 6 to 8 reads in the lab is fully vocalised, short, and
// there is a beginners' version of everything the lab shows.
//   node tools/validate-lab.mjs        → exits 1 on errors (warnings are printed, they do not fail)
// - nikud: the test of tools/validate-research.mjs (every word of two letters or more carries a mark, and about one mark
//   per two letters) on every string of src/lab/kids-text.js and src/data/inventions-kids.js
// - length: a bubble at most 90 letters (nikud does not count), a fact box at most 150; a warning above 12 words a sentence
// - words a child should not meet (the beginners' list of tools/validate-kids.mjs), no em dash
// - coverage: every sample, research-question guess, beginners' problem, trait, theme, funny pair, trial, card name and
//   thinking activity has its beginners' version; SAY keeps its keys and its {m|f|mp|fp} tokens have four forms
import fs from 'node:fs';
import { ROOM_K, TALK_K, FACTS_K, JOKES_K, ATLAS_K, SCOPE_K, SAMPLES_K, THINK_K, QUEST_K, QUEST_UI_K } from '../src/lab/kids-text.js';
import { PROBLEMS_K, TRAIT_K, THEMES_K, WILD_K, SAY_K, TRIALS_K, INV_UI_K, NAMES_K, MISSIONS_K, ROBOT_SAY_K } from '../src/data/inventions-kids.js';
import * as STATION from '../src/lab/station-text.js';   // the station worlds (19.10): every text a pair { f, k }
import { RULES, THINGS, SORT2_T, CREATURES } from '../src/lab/sort-data.js';   // 1.3.1: the cabinet's bigger games
import { CLUE_CASES, SUS, ZONES_T, CAB_T } from '../src/lab/clue-cases.js';
import { OBS_CASES, OBS_T } from '../src/lab/observe-cases.js';
import { SAMPLES } from '../src/lab/samples.js';
import { QUESTIONS } from '../src/data/lab-questions.js';
import { PROBLEMS, TRAIT, THEMES, WILD, SAY, TRIALS, MISSIONS, ROBOT_SAY } from '../src/data/inventions.js';
import { BIOME as AMAZON } from '../src/data/amazon.js';
import { BIOME as GROVE } from '../src/data/grove.js';
import { BIOME as REEF } from '../src/data/reef.js';

const errors = [], warns = [];
const err = (w, m) => errors.push(`${w}: ${m}`);
const warn = (w, m) => warns.push(`${w}: ${m}`);
const HEB = /[א-ת]/g, NIK = /[ְ-ׇּׁׂ]/g;
const plainOf = (s) => String(s).replace(/[֑-ׇ]/g, '');
const words = (s) => String(s).replace(/\{\w+\}/g, ' ').replace(/[{}|]/g, ' ').split(/[\s,.?!:;"'()–\-·…]+/);
function vocalised(s) {
  const t = String(s).replace(/\{\w+\}/g, ' ').replace(/[{}|]/g, ' ');
  const letters = (t.match(HEB) || []).length; if (!letters) return true;
  const marks = (t.match(NIK) || []).length;
  for (const w of words(t)) { const l = (w.match(HEB) || []).length; if (l >= 2 && !(w.match(NIK) || []).length) return false; }
  // the mark-per-letters rule needs a few words: a label like "אוֹר" or "חוֹל" has one mark on three letters and is right
  return letters < 8 || marks * 2 >= letters * 0.8;
}
const BANNED_PARTS = ['אבולוציה', 'מיליוני', 'דינוזאור', 'אנשים', 'ציידים', 'טורף', 'הורג', 'צלב'];
const BANNED_WORDS = ['אדם', 'מת', 'מתה', 'מתים', 'חזיר', 'חזירים', 'החזיר', 'החזירים'];   // whole words ("מחזירים אור" is fine)
// a placeholder stands for a short word or a number
const letterCount = (s) => plainOf(String(s).replace(/\{\w+\}/g, 'xxxxxx').replace(/\{[^{}]*\|[^{}]*\}/g, (g) => g.slice(1, -1).split('|')[0])).replace(/[^א-תx0-9]/g, '').length;

function check(where, s, max = 90) {
  if (typeof s !== 'string') { err(where, `not a string (${typeof s})`); return; }
  if (!s.trim()) { err(where, 'empty'); return; }
  if (!vocalised(s)) err(where, `without full nikud: "${s}"`);
  const n = letterCount(s); if (n > max) err(where, `${n} letters, more than ${max} for one bubble: "${plainOf(s)}"`);
  if (s.includes('—')) err(where, `em dash: "${s}"`);
  const p = plainOf(s);
  for (const b of BANNED_PARTS) if (p.includes(b)) err(where, `word a beginner should not meet "${b}": "${p}"`);
  for (const w of words(p)) if (BANNED_WORDS.includes(w)) err(where, `word a beginner should not meet "${w}": "${p}"`);
  const p1 = p.replace(/\{[^{}]*\|[^{}]*\}/g, (g) => g.slice(1, -1).split('|')[0]);   // one form of each gender token
  for (const sen of p1.split(/[.!?]+/)) { const n2 = sen.trim().split(/\s+/).filter(Boolean).length; if (n2 > 12) warn(where, `${n2} words in one sentence: "${sen.trim()}"`); }
}
// walk an object: every string is a beginner text; `fact` keys may be a little longer (a box, not a bubble)
function walk(where, v, max = 90) {
  if (typeof v === 'string') return check(where, v, max);
  if (Array.isArray(v)) return v.forEach((x, i) => walk(`${where}[${i}]`, x, max));
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(`${where}.${k}`, x, k === 'fact' ? 150 : max);
}
walk('ROOM_K', ROOM_K); walk('TALK_K', TALK_K); walk('FACTS_K', FACTS_K); walk('JOKES_K', JOKES_K); walk('ATLAS_K', ATLAS_K);
walk('SCOPE_K', SCOPE_K); walk('SAMPLES_K', SAMPLES_K); walk('THINK_K', THINK_K); walk('QUEST_K', QUEST_K); walk('QUEST_UI_K', QUEST_UI_K);
walk('PROBLEMS_K', PROBLEMS_K); walk('TRAIT_K', TRAIT_K); walk('THEMES_K', THEMES_K); walk('WILD_K', WILD_K); walk('SAY_K', SAY_K);
walk('TRIALS_K', TRIALS_K); walk('INV_UI_K', INV_UI_K); walk('NAMES_K', Object.values(NAMES_K));

// the station worlds: every leaf is a pair { f, k }; k is the beginners' text (a bubble or a list of bubbles), f the
// full level's (plain, one string). Facts and the endings' and discoveries' words are a box, not a bubble: up to 150.
let stationPairs = 0;
function walkPairs(where, v, max = 90) {
  if (v && typeof v === 'object' && !Array.isArray(v) && 'f' in v && 'k' in v) {
    stationPairs++;
    if (typeof v.f !== 'string' || !v.f.trim()) err(where, 'no full-level text (f)');
    else if (v.f.includes('—')) err(where, `em dash: "${v.f}"`);
    if (Array.isArray(v.k)) v.k.forEach((x, i) => check(`${where}.k[${i}]`, x, max)); else check(`${where}.k`, v.k, max);
    // the same {name} placeholders on both levels
    const ph = (s) => [...new Set(String([].concat(s).join(' ')).match(/\{\w+\}/g) || [])].sort().join(',');
    if (ph(v.f) !== ph(v.k)) err(where, `placeholders differ: f ${ph(v.f) || '-'} / k ${ph(v.k) || '-'}`);
    return;
  }
  if (typeof v === 'string') { err(where, `a plain string, not a pair { f, k }: "${v}"`); return; }
  if (Array.isArray(v)) return v.forEach((x, i) => walkPairs(`${where}[${i}]`, x, max));
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkPairs(`${where}.${k}`, x, ['fact', 'say', 'yes'].includes(k) ? 150 : max);
}
for (const [name, v] of Object.entries(STATION)) if (name !== 'L') walkPairs(name, v);

// ── coverage
for (const s of SAMPLES) {
  const k = SAMPLES_K[s.id]; if (!k) { err('SAMPLES_K', `no beginners' version of sample ${s.id}`); continue; }
  for (const f of ['name', 'task', 'found', 'idea']) if (!k[f]) err('SAMPLES_K.' + s.id, `no ${f}`);
  if (!k.hints || k.hints.length < 1) err('SAMPLES_K.' + s.id, 'no hints');
}
for (const id of Object.keys(SAMPLES_K)) if (!SAMPLES.some((s) => s.id === id)) err('SAMPLES_K', `unknown sample ${id}`);

const kidsProblems = PROBLEMS.filter((p) => p.kids);
for (const p of kidsProblems) {
  const k = PROBLEMS_K[p.id]; if (!k) { err('PROBLEMS_K', `no beginners' version of problem ${p.id}`); continue; }
  for (const f of ['title', 'ask', 'fact', 'clue']) if (!k[f]) err('PROBLEMS_K.' + p.id, `no ${f}`);
  for (const f of Object.keys(p.show || {})) if (!(k.show || {})[f]) err('PROBLEMS_K.' + p.id, `no show.${f}`);
  if (p.need) err('PROBLEMS_K.' + p.id, 'a beginners\' problem needs one trait, not a combination');
}
for (const id of Object.keys(PROBLEMS_K)) if (!PROBLEMS.some((p) => p.id === id)) err('PROBLEMS_K', `unknown problem ${id}`);
for (const t of Object.keys(TRAIT)) if (!TRAIT_K[t]) err('TRAIT_K', `no beginners' name for trait ${t}`);
for (const t of THEMES) if (!THEMES_K[t.id]) err('THEMES_K', `no beginners' name for theme ${t.id}`);
if (WILD_K.length !== WILD.length) err('WILD_K', `${WILD_K.length} funny pairs, WILD has ${WILD.length}`);
for (const t of TRIALS) { const k = TRIALS_K[t.id]; if (!k) { err('TRIALS_K', `no trial ${t.id}`); continue; } for (const f of Object.keys(t.fun)) if (!k.fun[f]) err('TRIALS_K.' + t.id, `no fun.${f}`);
  for (const f of ['title', 'need']) if (!k[f]) err('TRIALS_K.' + t.id, `no ${f}`);
  if (t.load && !k.load) err('TRIALS_K.' + t.id, 'no load (why the weight or the size hurt)'); }
for (const id of Object.keys(TRIALS_K)) if (!TRIALS.some((t) => t.id === id)) err('TRIALS_K', `unknown test ${id}`);
// open inventions (1.3.1): the beginners' problems say what they need (want) and why each creative route works
for (const p of kidsProblems) {
  const k = PROBLEMS_K[p.id]; if (!k) continue;
  if (p.want && !k.want) err('PROBLEMS_K.' + p.id, 'no want (the gentle hint)');
  if ((k.alt || []).length !== (p.alt || []).length) err('PROBLEMS_K.' + p.id, `${(k.alt || []).length} creative routes, the problem has ${(p.alt || []).length}`);
  (p.alt || []).forEach((a, i) => { const ka = (k.alt || [])[i] || {}; if (!ka.why) err(`PROBLEMS_K.${p.id}.alt[${i}]`, 'no why'); if (a.fact && !ka.fact) err(`PROBLEMS_K.${p.id}.alt[${i}]`, 'no fact'); });
}
walk('MISSIONS_K', MISSIONS_K); walk('ROBOT_SAY_K', ROBOT_SAY_K);
for (const m of MISSIONS) { const k = MISSIONS_K[m.id]; if (!k || !k.title || !k.ask) err('MISSIONS_K', `no beginners' title and ask for mission ${m.id}`); }
for (const key of Object.keys(ROBOT_SAY)) if (!ROBOT_SAY_K[key]) err('ROBOT_SAY_K', `no ${key}`);
for (const key of Object.keys(SAY)) if (!SAY_K[key] || !SAY_K[key].length) err('SAY_K', `no lines for ${key}`);
for (const [key, lines] of Object.entries(SAY_K)) for (const [i, l] of lines.entries()) for (const g of l.match(/\{[^{}]*\|[^{}]*\}/g) || []) if (g.split('|').length !== 4) err(`SAY_K.${key}[${i}]`, `gender token without four forms: ${g}`);

// every card name a child can put on the bench: all species and every device (src/game/tools.js, with the reef look)
const names = new Set();
for (const B of [AMAZON, GROVE, REEF]) for (const s of B.species) names.add(s.name);
const toolsSrc = fs.readFileSync(new URL('../src/game/tool-defs.js', import.meta.url), 'utf8');
for (const m of toolsSrc.matchAll(/^\s*(?:\{ id: '[a-z]+'[^\n]*?|[a-z]+: \{ )name: '([^']+)'/gm)) names.add(m[1]);
for (const n of names) if (!NAMES_K[n]) err('NAMES_K', `no vocalised name for the card "${n}"`);

// the research questions: 12 to 15, each a real question with the same number of guesses, investigated in a way a
// beginner meets in beginners' words (a sample, or a beginners' problem)
const qs = Object.keys(QUEST_K);
if (qs.length < 12 || qs.length > 15) err('QUEST_K', `${qs.length} questions; the beginners' set is 12 to 15`);
for (const id of qs) {
  const q = QUESTIONS.find((x) => x.id === id); if (!q) { err('QUEST_K', `unknown question ${id}`); continue; }
  if (QUEST_K[id].guesses.length !== q.guesses.length) err('QUEST_K.' + id, `${QUEST_K[id].guesses.length} guesses, the question has ${q.guesses.length}`);
  if (q.open) err('QUEST_K.' + id, 'an open question (its texts are not in the beginners\' set)');
  if (q.how.invent && !PROBLEMS_K[q.how.invent]) err('QUEST_K.' + id, `investigated by problem ${q.how.invent}, which has no beginners' version`);
  if (q.how.scope && !SAMPLES_K[q.how.scope]) err('QUEST_K.' + id, `investigated by sample ${q.how.scope}, which has no beginners' version`);
  if (q.how.watch) err('QUEST_K.' + id, 'an observation question (its watch text has no beginners\' version)');
}

// the four thinking activities (המשקל הרועד was removed in 1.3.1): the same things as src/lab/thinking.js (read from its source: it draws on the page)
const thinkSrc = fs.readFileSync(new URL('../src/lab/thinking.js', import.meta.url), 'utf8');
const block = (name) => { const i = thinkSrc.indexOf(`const ${name} = [`); return i < 0 ? '' : thinkSrc.slice(i, thinkSrc.indexOf('\n];', i)); };
const idsIn = (name) => [...block(name).matchAll(/^\s*\{ id: '(\w+)'/gm)].map((m) => m[1]);
for (const a of ['fair', 'float', 'observe', 'cause']) if (!THINK_K.items[a]) err('THINK_K.items', `no ${a}`);
for (const v of idsIn('VARS')) if (!THINK_K.fair.vars[v]) err('THINK_K.fair.vars', `no ${v}`);
for (const id of idsIn('ITEMS_ALL')) { const it = THINK_K.float.items[id]; if (!it) err('THINK_K.float.items', `no ${id}`); else for (const f of ['name', 'the', 'to', 'why']) if (!it[f]) err('THINK_K.float.items.' + id, `no ${f}`); }
// (ראינו או חשבנו? moved to src/lab/observe-cases.js in 1.3.1: checked below)
for (const id of idsIn('CASES_ALL')) {
  const c = THINK_K.cause.cases[id]; if (!c) { err('THINK_K.cause.cases', `no ${id}`); continue; }
  const src = block('CASES_ALL'); const at = src.indexOf(`id: '${id}'`); const seg = src.slice(at, src.indexOf("{ id: '", at + 5) > 0 ? src.indexOf("{ id: '", at + 5) : undefined);
  const nTests = ((seg.match(/tests: \[(.*?)\]\],/s) || [])[1] || '').split("], ['").length;
  if (c.tests.length !== nTests) err('THINK_K.cause.cases.' + id, `${c.tests.length} tests, the case has ${nTests}`);
}
if (idsIn('ITEMS_ALL').length !== 8 || idsIn('CASES_ALL').length !== 3) warn('thinking.js', 'the lists of thinking.js changed: check THINK_K');

// ── 1.3.1: the cabinet's games (sort-data.js, clue-cases.js, observe-cases.js)
walkPairs('SORT2_T', SORT2_T); walkPairs('SUS', SUS); walkPairs('ZONES_T', ZONES_T); walkPairs('CAB_T', CAB_T); walkPairs('OBS_T', OBS_T);
for (const [r, v] of Object.entries(RULES)) { walkPairs(`RULES.${r}.name`, v.name); walkPairs(`RULES.${r}.g`, v.g); }
THINGS.forEach((t) => walkPairs(`THINGS.${t.id}`, t.name));
for (const c of CREATURES) { if (!c.name.k || c.name.k === c.name.f) err('CREATURES.' + c.id, `no vocalised name for "${c.name.f}" (NAMES_K)`); if (!fs.existsSync(new URL(`../art/${c.id}.webp`, import.meta.url))) err('CREATURES.' + c.id, 'no card painting'); }
// a case of the full level only: its texts are { f, k: null }; a beginners' case: every text a full pair
function walkCase(where, v, kidsOn) {
  if (v && typeof v === 'object' && !Array.isArray(v) && 'f' in v && 'k' in v) {
    if (kidsOn) return walkPairs(where, v, 150);
    if (typeof v.f !== 'string' || !v.f.trim()) err(where, 'no full-level text (f)'); else if (v.f.includes('—')) err(where, `em dash: "${v.f}"`);
    return;
  }
  if (Array.isArray(v)) return v.forEach((x, i) => walkCase(`${where}[${i}]`, x, kidsOn));
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkCase(`${where}.${k}`, x, kidsOn);
}
let manifest = []; try { manifest = JSON.parse(fs.readFileSync(new URL('../art/lab-items/manifest.json', import.meta.url), 'utf8')).map((m) => m.id); } catch (e) { warn('art/lab-items/manifest.json', 'missing'); }
const picRef = (where, ref) => {
  if (String(ref).startsWith('card:')) { if (!fs.existsSync(new URL(`../art/${ref.slice(5)}.webp`, import.meta.url))) err(where, `no card painting ${ref}`); return; }
  if (!manifest.includes(ref)) err(where, `the painting "${ref}" is not in art/lab-items/manifest.json`);
};
const clueKids = {};
for (const c of CLUE_CASES) {
  const w = 'CLUE_CASES.' + c.id;
  walkCase(w, { title: c.title, what: c.what, d: c.d, no: c.no, yes: c.yes }, !!c.kids);
  if (!c.pics || c.pics.length < 1 || c.pics.length > 2) err(w, 'one or two pictures'); else c.pics.forEach((p) => picRef(w, p));
  if (c.d.length < 2 || c.d.length > 3) err(w, 'two or three details');
  if (c.sus.length !== 4 || new Set(c.sus).size !== 4) err(w, 'four different suspects');
  for (const s of c.sus) { if (!SUS[s]) err(w, `no name for suspect ${s}`); picRef(w, 'card:' + s); }
  for (const s of c.sus.slice(1)) if (!c.no[s]) err(w, `no reason why it is not ${s}`);
  if (c.kids) clueKids[c.zone] = (clueKids[c.zone] || 0) + 1;
}
for (const z of ['amazon', 'grove', 'reef']) { const n = CLUE_CASES.filter((c) => c.zone === z).length; if (n < 8) err('CLUE_CASES', `${n} cases in ${z}, at least 8`); if ((clueKids[z] || 0) < 4) err('CLUE_CASES', `${clueKids[z] || 0} beginners' cases in ${z}, at least 4`); }
let obsKids = 0;
for (const c of OBS_CASES) {
  const w = 'OBS_CASES.' + c.id;
  walkCase(w, { title: c.title, intro: c.intro, cards: c.cards.map((x) => x[0]), checks: c.checks.map((x) => [x[0], x[2]].filter(Boolean)), reveal: c.reveal }, !!c.kids);
  picRef(w, c.pic); if (c.after) picRef(w, c.after);
  if (c.cards.length !== 4 || c.cards.filter((x) => x[1] === 'see').length !== 2) err(w, 'four sentences, two seen and two thought');
  if (c.checks.length !== 3 || c.checks[0][1] !== 1 || c.checks.slice(1).some((x) => x[1] !== 0 || !x[2])) err(w, 'three checks: the first shows what happened, the others say why not');
  if (c.kids) obsKids++;
}
if (OBS_CASES.length < 16) err('OBS_CASES', `${OBS_CASES.length} finds, at least 16`);
if (obsKids < 8) err('OBS_CASES', `${obsKids} beginners' finds, at least 8`);

for (const w of warns) console.log('warn  ' + w);
for (const e of errors) console.log('ERROR ' + e);
console.log(errors.length ? `\n${errors.length} error(s)` : `OK – lab beginners' texts: ${SAMPLES.length} samples, ${qs.length} questions, ${kidsProblems.length} problems, ${names.size} card names, ${stationPairs} station texts, all vocalised`);
process.exit(errors.length ? 1 : 0);
