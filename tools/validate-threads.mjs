// חוטים (1.3.2): checks src/data/threads.js against the rest of the game.
// Usage: node tools/validate-threads.mjs   (exit code 1 on errors)
// - ids unique, modes, exactly six 'exp' threads; parts are journey parts; every thread has a line of רובו־דע
// - references exist: problem / invention ids, case ids, event ids, tools, species, relation keys, samples, questions
// - every child-facing text is { f, k } with full nikud in k, no forbidden words, no em dash
// - every fact has a source, and docs/sources.md has the threads section naming every thread
import fs from 'node:fs';
import { THREADS, SAMPLE_OF, PHOTO_SAMPLE, QUESTION_SPECIES, CASE_SPECIES, REGULAR, STAMPS, STAMP_NAME, THREAD_WORDS } from '../src/data/threads.js';
import { GUIDE } from '../src/data/guide-lines.js';
import { PARTS } from '../src/core/journey.js';
import { PROBLEMS } from '../src/data/inventions.js';
import { SAMPLES } from '../src/lab/samples.js';
import { QUESTIONS } from '../src/data/lab-questions.js';
import { CASES } from '../src/research/cases/index.js';
import { TOOL_DEFS } from '../src/game/tool-defs.js';
import { KIDS } from '../src/data/kids.js';
import { buildRegistry } from '../src/sim/species.js';
import { BIOME as AMAZON } from '../src/data/amazon.js';
import { BIOME as GROVE } from '../src/data/grove.js';
import { BIOME as REEF } from '../src/data/reef.js';

const errors = []; const err = (m) => errors.push(m);
const HEB = /[א-ת]/g, NIK = /[ְ-ׇּׁׂ]/g;
function vocalised(s) {
  const letters = (String(s).match(HEB) || []).length; if (!letters) return true;
  const marks = (String(s).match(NIK) || []).length;
  for (const w of String(s).split(/[\s,.?!:;"'()–־-]+/)) { const l = (w.match(HEB) || []).length; if (l >= 2 && !(w.match(NIK) || []).length) return false; }
  return marks * 2 >= letters * 0.8;
}
const FORBIDDEN = ['מיליוני שנים', 'מיליון שנה', 'דינוזאור', 'אבולוציה', 'חזיר', 'אנשים', 'בני אדם', 'אישה', 'ילדים', 'זיווג', 'הזדווג', 'גופה', 'פגר', 'צלב'];
const strip = (s) => String(s).replace(NIK, '');
function text(where, v) {
  if (!v || typeof v !== 'object' || !v.f || !v.k) { err(`${where}: needs { f, k }`); return; }
  if (!vocalised(v.k)) err(`${where}: k without full nikud: "${v.k}"`);
  if (vocalised(v.f) && (String(v.f).match(HEB) || []).length > 3) err(`${where}: f should be plain (no nikud): "${v.f}"`);
  for (const s of [v.f, v.k]) {
    for (const w of FORBIDDEN) if (strip(s).includes(w)) err(`${where}: forbidden word "${w}"`);
    if (/[—]/.test(s)) err(`${where}: no em dash`);
  }
}

const ZONE = { amazon: AMAZON, grove: GROVE, reef: REEF };
const SP = {}; const EDGES = new Set(); const EVENTS = new Map();
for (const [z, B] of Object.entries(ZONE)) {
  SP[z] = new Set(B.species.map((s) => s.id));
  for (const e of buildRegistry(B).edges) EDGES.add(e.key);
  for (const e of B.events) EVENTS.set(e.id, z);
}
const anySp = (id) => Object.values(SP).some((s) => s.has(id));
const PROB = new Set(PROBLEMS.map((p) => p.id));
const INVENTIONS = new Set(['sharkskin']);   // the lab's own inventions (src/lab/stations.js)
const CASE = new Map(CASES.map((c) => [c.id, c]));
const TOOLS = new Set(TOOL_DEFS.map((t) => t.id));
const THINK = new Set([...fs.readFileSync(new URL('../src/lab/thinking.js', import.meta.url), 'utf8').matchAll(/\{ id: '([a-z]+)', name: '/g)].map((m) => m[1]));
const SAMPLE = new Map(SAMPLES.map((s) => [s.id, s]));
const lines = {};

const ids = new Set(); let exp = 0;
for (const t of THREADS) {
  const w = `thread ${t.id}`;
  if (!t.id || !/^[a-z0-9-]+$/.test(t.id)) err(`bad id: ${t.id}`);
  if (ids.has(t.id)) err(`duplicate id: ${t.id}`); ids.add(t.id);
  if (t.mode === 'exp') exp++; else if (t.mode !== 'full') err(`${w}: mode must be 'exp' or 'full'`);
  if (!Array.isArray(t.parts) || t.parts.length !== 2 || t.parts.some((p) => !PARTS[p])) err(`${w}: parts must be two journey parts (${t.parts})`);
  text(`${w} name`, t.name); text(`${w} hint`, t.hint);
  if (!t.fact || !String(t.fact).trim()) err(`${w}: no fact`);
  if (!t.src || !String(t.src).trim()) err(`${w}: no source`);
  const ln = (GUIDE['threads:' + t.id] || [])[0];
  if (!ln) err(`${w}: no line of רובו־דע (src/data/guide/threads.js 'threads:${t.id}')`); else if (ln.id !== 'th.' + t.id) err(`${w}: line id must be th.${t.id}`);
  lines[t.id] = 1;
  // from
  const f = t.from || {};
  switch (f.kind) {
    case 'invention': if (!PROB.has(f.id) && !INVENTIONS.has(f.id)) err(`${w}: no problem or invention "${f.id}"`); break;
    case 'case': if (f.id !== '*' && !CASE.has(f.id)) err(`${w}: no case "${f.id}"`); if (f.tool && !CASES.some((c) => (c.tools || []).some((x) => x.id === f.tool || x.kind === f.tool))) err(`${w}: no research tool "${f.tool}"`); break;
    case 'photo': case 'link': case 'robot': if (f.id !== '*') err(`${w}: ${f.kind} threads use id '*'`); break;
    case 'event': for (const id of f.ids || [f.id]) if (!EVENTS.has(id)) err(`${w}: no island event "${id}"`); break;
    case 'zone': if (!REGULAR[f.id]) err(`${w}: no zone "${f.id}"`); break;
    case 'think': if (!THINK.has(f.id)) err(`${w}: no thinking-corner activity "${f.id}"`); break;
    default: err(`${w}: unknown from.kind ${f.kind}`);
  }
  // to
  const o = t.to || {}, e = t.effect;
  switch (o.kind) {
    case 'tool':
      if (!e || !TOOLS.has(e.tool) || e.tool !== o.id) err(`${w}: tool effect must name a tool of tool-defs (${e && e.tool})`);
      else { const D = TOOL_DEFS.find((x) => x.id === e.tool); if (e.zone && D.zones && !D.zones.includes(e.zone)) err(`${w}: tool ${e.tool} is not in zone ${e.zone}`); }
      if (!e || !e.key || e.value == null) err(`${w}: tool effect needs key and value`);
      if (e && e.event && !EVENTS.has(e.event)) err(`${w}: no island event "${e.event}"`);
      break;
    case 'choice': {
      if (!e || !EVENTS.has(e.event) || e.event !== o.id) { err(`${w}: choice effect must name an island event (${e && e.event})`); break; }
      const ev = ZONE[EVENTS.get(e.event)].events.find((x) => x.id === e.event);
      const c = e.choice || {};
      if (!c.id || (ev.choices || []).some((x) => x.id === c.id)) err(`${w}: the new choice needs an id of its own`);
      text(`${w} choice label`, c.label); text(`${w} choice outcome`, c.outcome);
      for (const x of c.effects || []) { if (x.species && !SP[EVENTS.get(e.event)].has(x.species)) err(`${w}: effect species "${x.species}" not in ${EVENTS.get(e.event)}`); if (!['unlock', 'add', 'plant', 'boost', 'points'].includes(x.type)) err(`${w}: unknown effect type ${x.type}`); }
      break;
    }
    case 'reveal':
      if (!e || !ZONE[e.zone]) { err(`${w}: reveal needs a zone`); break; }
      for (const k of e.links || []) { const [a, b] = k.split('>'); if (!EDGES.has(k) || !SP[e.zone].has(a) || !SP[e.zone].has(b)) err(`${w}: no relation "${k}" in ${e.zone}`); }
      if (e.mark && (!TOOLS.has(e.mark.tool) || !SP[e.zone].has(e.mark.species))) err(`${w}: bad mark`);
      break;
    case 'measure': if (!e || !['notebook', 'quadrat', 'experiment'].includes(e.what)) err(`${w}: measure what?`); break;
    case 'sample': case 'question': case 'robotout': break;
    case 'case': if (!CASE.has(o.id)) err(`${w}: no case "${o.id}"`); break;
    case 'problem': for (const id of o.ids || []) { if (!PROB.has(id)) err(`${w}: no problem "${id}"`); else if (!PROBLEMS.find((p) => p.id === id).kids) err(`${w}: problem "${id}" is not in the beginners' set`); } if ((o.ids || []).length !== 3) err(`${w}: three problems per zone`); break;
    default: err(`${w}: unknown to.kind ${o.kind}`);
  }
}
if (exp !== 6) err(`the experience mode has exactly six threads (found ${exp})`);
for (const k of Object.keys(GUIDE)) if (k.startsWith('threads:') && !lines[k.slice(8)]) err(`guide line ${k} has no thread`);

// tables
for (const [sp, s] of Object.entries(SAMPLE_OF)) { const S = SAMPLE.get(s); if (!S) err(`SAMPLE_OF ${sp}: no sample ${s}`); else if (S.species !== sp) err(`SAMPLE_OF ${sp}: sample ${s} is of ${S.species}`); }
for (const S of SAMPLES) if (SAMPLE_OF[S.species] !== S.id) err(`sample ${S.id} (${S.species}) missing from SAMPLE_OF`);
for (const [sp, s] of Object.entries(PHOTO_SAMPLE)) { if (!SAMPLE.has(s)) err(`PHOTO_SAMPLE ${sp}: no sample ${s}`); if (!anySp(sp)) err(`PHOTO_SAMPLE: no species ${sp}`); }
const QS = new Set(QUESTIONS.map((q) => q.sp));
if ([...QS].sort().join() !== [...QUESTION_SPECIES].sort().join()) err(`QUESTION_SPECIES differs from lab-questions.js: ${[...QS].filter((x) => !QUESTION_SPECIES.includes(x)).concat(QUESTION_SPECIES.filter((x) => !QS.has(x))).join(', ')}`);
for (const C of CASES) {
  const want = new Set(); for (const b of C.board || []) if (b.species) want.add(b.species);
  const have = CASE_SPECIES[C.id];
  if (!have) { err(`CASE_SPECIES: no entry for ${C.id}`); continue; }
  if (have[0] !== C.zone) err(`CASE_SPECIES ${C.id}: zone ${have[0]} is not ${C.zone}`);
  if ([...want].sort().join() !== have.slice(1).sort().join()) err(`CASE_SPECIES ${C.id}: ${have.slice(1)} vs the board ${[...want]}`);
}
for (const [z, [pre, n, kn]] of Object.entries(REGULAR)) {
  const reg = ZONE[z].missions.filter((m) => !m.expert).map((m) => m.id);
  const want = [...Array(n)].map((_, i) => pre + (i + 1));
  if (reg.join() !== want.join()) err(`REGULAR ${z}: the regular missions are ${reg.join(' ')}`);
  const kids = (KIDS[z] && KIDS[z].missions || []).map((m) => m.id);
  if (kids.length !== kn) err(`REGULAR ${z}: ${kids.length} beginners' missions, not ${kn}`);
}
for (const k of STAMPS) text(`stamp ${k}`, STAMP_NAME[k]);
for (const [k, v] of Object.entries(THREAD_WORDS)) text(`word ${k}`, v);

// sources: docs/sources.md has the threads section with every thread id
const doc = fs.readFileSync(new URL('../docs/sources.md', import.meta.url), 'utf8');
const sec = doc.split(/\n## /).find((s) => s.startsWith('חוטים'));
if (!sec) err('docs/sources.md: no "## חוטים" section');
else for (const t of THREADS) if (!sec.includes('`' + t.id + '`')) err(`docs/sources.md חוטים: thread \`${t.id}\` is not listed`);

if (errors.length) { console.log(errors.join('\n')); console.log(`\n${errors.length} error(s)`); process.exit(1); }
console.log(`threads OK: ${THREADS.length} threads (${exp} in the experience mode), ${Object.keys(SAMPLE_OF).length} samples, ${CASES.length} cases`);
