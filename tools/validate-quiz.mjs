// Validates the quiz banks: src/data/quiz-bank.js (QBANK, every edition) and src/data/torah-quiz.js (TQUIZ_ALL, the
// torah edition's "מן המקורות" corner). Usage: node tools/validate-quiz.mjs   (exit code 1 on errors)
import { BIOME as AMAZON } from '../src/data/amazon.js';
import { BIOME as GROVE } from '../src/data/grove.js';
import { BIOME as REEF } from '../src/data/reef.js';
import { QBANK } from '../src/data/quiz-bank.js';
import { TQUIZ_ALL } from '../src/data/torah-quiz.js';

const errors = [], warns = [];
const err = (m) => errors.push(m), warn = (m) => warns.push(m);
const SPECIES = new Set();
for (const B of [AMAZON, GROVE, REEF]) for (const s of B.species) SPECIES.add(B.id + ':' + s.id);
// the album's tool cards (src/game/tools.js TOOL_DEFS + the reef's own REEF_TOOL_CARDS)
const TOOLS = new Set(['drone', 'camera', 'rescue', 'watergen', 'seeddrone', 'listener', 'nestbox', 'insecthotel', 'weather',
  'nursery', 'reefball', 'buoy', 'rov', 'uwcam', 'sensor']);
const artOk = (a) => (a.startsWith('tool:') ? TOOLS.has(a.slice(5)) : SPECIES.has(a));

const NIKUD = /[ְ-ׇ]/, TAAMIM = /[֑-ֽ֯׀׃]/;
const plain = (s) => String(s).replace(/[֑-ׇ]/g, '');
// the hard content rules (as in validate-content / validate-kids), on every string
const BAD = ['אבולוציה', 'התפתחו מ', 'מיליוני שנ', 'מיליון שנ', 'דינוזאור', 'אישה', 'אשה', 'נשים', 'ילדה', 'ילדות', 'נערה', 'הזדווג', 'זיווג'];
const badRe = new RegExp(`(^|[^א-ת])[והבלכמש]{0,2}(${BAD.join('|')})(ים|ות|י|ה)?(?=$|[^א-ת])`);
function textRules(where, s) {
  if (typeof s !== 'string' || !s.trim()) { err(`${where}: empty text`); return; }
  const p = plain(s);
  if (badRe.test(p)) err(`${where}: forbidden word in "${p.slice(0, 60)}"`);
  // as in validate-content: a whole word with the usual prefixes, so מחזיר (returns) is not caught
  if (/(^|[^א-ת])[הולבשכ]{0,2}חזיר(ים|י|ה|ות)?($|[^א-ת])/.test(p)) err(`${where}: forbidden word "חזיר" in "${p.slice(0, 60)}"`);
  if (/(^|[\s,.!?:;"'()])דם($|[\s,.!?:;"'()])/.test(p)) err(`${where}: forbidden word "דם" in "${p.slice(0, 60)}"`);
  if (s.includes('—')) err(`${where}: em dash in "${p.slice(0, 60)}"`);
  if (/[✕✖×+]/.test(s)) err(`${where}: a cross-shaped sign in "${p.slice(0, 60)}"`);
}

// ───────────────────────────── the general bank
{
  const ids = new Set(), qs = new Set();
  const per = {};
  for (const b of QBANK) {
    const w = `qbank ${b.id}`;
    if (!b.id || ids.has(b.id)) err(`${w}: missing or duplicate id`); ids.add(b.id);
    if (!['amazon', 'grove', 'reef', 'desert', 'all'].includes(b.z)) err(`${w}: bad z "${b.z}"`);
    if (!['easy', 'hard'].includes(b.lvl)) err(`${w}: bad lvl "${b.lvl}"`);
    textRules(w + '.q', b.q); textRules(w + '.e', b.e);
    if (qs.has(b.q)) err(`${w}: the same question twice`); qs.add(b.q);
    if (typeof b.tf === 'boolean') { if (b.o) err(`${w}: both tf and o`); }
    else {
      if (!Array.isArray(b.o) || b.o.length < 2 || b.o.length > 4) err(`${w}: needs 2–4 answers`);
      else { if (new Set(b.o).size !== b.o.length) err(`${w}: two answers are the same`); b.o.forEach((o, i) => textRules(`${w}.o[${i}]`, o)); }
    }
    if (b.art && !artOk(b.art)) err(`${w}: unknown art "${b.art}"`);
    if (b.art && b.art.startsWith(b.z + ':') === false && !b.art.startsWith('tool:') && b.z !== 'all') err(`${w}: art "${b.art}" from another place`);
    // never the picture of the answer when the answers are names (the picture would give it away)
    if (b.art && Array.isArray(b.o) && !b.art.startsWith('tool:')) {
      const sp = [AMAZON, GROVE, REEF].flatMap((B) => B.species.map((s) => [B.id + ':' + s.id, s.name])).find(([k]) => k === b.art);
      const ans = plain(b.o[0]).replace(/^[הלבמ](?=[א-ת])/, '');
      if (sp && (ans === sp[1] || ans === sp[1].replace(/^ה/, ''))) err(`${w}: the picture shows the answer (${sp[1]})`);
    }
    if (b.lvl === 'easy') {
      const words = plain(b.q).split(/\s+/).filter(Boolean).length;
      if (words > 9) warn(`${w}: a long beginner question (${words} words): ${b.q}`);
    }
    if (plain(b.e).split(/[.!?]/)[0].split(/\s+/).length > 22) warn(`${w}: a long first sentence in e`);
    const k = b.z + '/' + b.lvl; per[k] = (per[k] || 0) + 1;
  }
  if (QBANK.length < 120) err(`quiz bank: ${QBANK.length} questions (want 120 or more)`);
  // enough for coming back again and again: every place about 120, with a fair share at each level
  // (a round takes 4 bank questions for beginners and 5 for advanced; S.seen keeps up to 700 ids)
  const MIN_ZONE = 110, MIN_LEVEL = 45;
  for (const z of ['amazon', 'grove', 'reef']) {
    const e = per[z + '/easy'] || 0, h = per[z + '/hard'] || 0;
    if (e + h < MIN_ZONE) err(`quiz bank: ${z} has ${e + h} questions (want ${MIN_ZONE} or more)`);
    if (e < MIN_LEVEL) err(`quiz bank: ${z} has ${e} beginner questions (want ${MIN_LEVEL} or more)`);
    if (h < MIN_LEVEL) err(`quiz bank: ${z} has ${h} advanced questions (want ${MIN_LEVEL} or more)`);
  }
  // duplicates: the same question written a little differently is an error; a very similar one is a warning
  const norm = (s) => plain(s).replace(/[^א-ת0-9 ]/g, ' ').replace(/(^| )[והבלכמש]?ה?(?=[א-ת])/g, '$1').replace(/\s+/g, ' ').trim();
  const words = (s) => new Set(norm(s).split(' ').filter((w) => w.length > 1));
  const seenNorm = new Map();
  for (const b of QBANK) {
    const n = norm(b.q);
    if (seenNorm.has(n)) err(`qbank ${b.id}: the same question as ${seenNorm.get(n)} ("${plain(b.q).slice(0, 50)}")`);
    else seenNorm.set(n, b.id);
  }
  const ws = QBANK.map((b) => [b, words(b.q)]);
  for (let i = 0; i < ws.length; i++) {
    for (let j = i + 1; j < ws.length; j++) {
      const [a, A] = ws[i], [b, B] = ws[j];
      if (a.z !== b.z && a.z !== 'all' && b.z !== 'all') continue;
      let both = 0; for (const w of A) if (B.has(w)) both++;
      const sim = both / (A.size + B.size - both || 1);
      if (sim >= 0.75 && norm(a.q) !== norm(b.q)) warn(`qbank ${a.id} / ${b.id}: very similar questions ("${plain(a.q).slice(0, 40)}" / "${plain(b.q).slice(0, 40)}")`);
    }
  }
  // three answers, one clearly right (older entries may have two to four)
  for (const b of QBANK) if (Array.isArray(b.o) && b.o.length !== 3) warn(`qbank ${b.id}: ${b.o.length} answers (three is the house style)`);
  console.log(`quiz bank: ${QBANK.length} questions · ` + Object.entries(per).map(([k, n]) => `${k} ${n}`).join(', '));
}

// ───────────────────────────── the torah corner
{
  const ids = new Set(), qs = new Set();
  let lv = { 1: 0, 2: 0 };
  TQUIZ_ALL.forEach((t, i) => {
    const w = `tquiz ${t.id || '#' + i}`;
    if (t.id) { if (ids.has(t.id)) err(`${w}: duplicate id`); ids.add(t.id); }
    if (t.lvl != null && t.lvl !== 1 && t.lvl !== 2) err(`${w}: lvl must be 1 or 2`);
    lv[t.lvl || 1]++;
    for (const k of ['q', 'e', 'src', 'ref']) textRules(`${w}.${k}`, t[k]);
    if (qs.has(t.q)) err(`${w}: the same question twice`); qs.add(t.q);
    if (!Array.isArray(t.o) || t.o.length < 3) err(`${w}: needs 3 or more answers`);
    else { if (new Set(t.o).size !== t.o.length) err(`${w}: two answers are the same`); t.o.forEach((o, j) => textRules(`${w}.o[${j}]`, o)); }
    if (t.src && !NIKUD.test(t.src)) err(`${w}: the quote has no nikud`);
    if (t.src && TAAMIM.test(t.src)) err(`${w}: cantillation, meteg or paseq left in the quote`);
    if (t.src && /י[ְ-ׇ]*ה[ְ-ׇ]*ו[ְ-ׇ]*ה/.test(t.src)) err(`${w}: the Name is spelled out (write ה')`);
    if (t.src && /(^|\s)י[ְ-ׇ]*י[ְ-ׇ]*(?=[\s.,:;]|$)/.test(t.src)) err(`${w}: "יי" for the Name (write ה')`);
    if (t.e && NIKUD.test(t.e)) warn(`${w}: nikud in the explanation (the game's plain Hebrew has none)`);
    if (t.art && !SPECIES.has(t.art)) err(`${w}: unknown art "${t.art}"`);
  });
  if (TQUIZ_ALL.length < 150) err(`torah corner: ${TQUIZ_ALL.length} questions (want 150 or more)`);
  console.log(`torah corner: ${TQUIZ_ALL.length} questions (${lv[1]} easier, ${lv[2]} harder)`);
}

for (const w of warns) console.log('WARN ', w);
for (const e of errors) console.log('ERROR', e);
console.log(errors.length ? `\n${errors.length} error(s)` : '\nOK – quiz banks');
process.exit(errors.length ? 1 : 0);
