// Checks the torah edition's source-card sets and the game "מה הפסוק מלמד?" (src/data/torah-links.js).
// Usage: node tools/validate-verse.mjs   (exit code 1 on errors)
// - SOURCE_SETS: every source card in exactly one set, 4 or 5 cards a set
// - VERSE_LINKS: every source card has an entry; every card id exists (species of the three zones, devices of tools.js);
//   no card is both a link and in the pool; at least two pool cards; w is 1 or 2
// - kids: ask, less and a line for every link, all fully vocalised (the nikud test of tools/validate-research.mjs)
// - no em dash, no forbidden words (women and girls, dinosaurs, millions of years)
import fs from 'node:fs';
import { BIOME as AMAZON } from '../src/data/amazon.js';
import { BIOME as GROVE } from '../src/data/grove.js';
import { BIOME as REEF } from '../src/data/reef.js';
import { SOURCE_CARDS, SOURCE_SETS } from '../src/data/torah.js';
import { VERSE_LINKS, VERSE_UI } from '../src/data/torah-links.js';

const errors = [];
const err = (w, m) => errors.push(`${w}: ${m}`);
const HEB = /[א-ת]/g, NIK = /[ְ-ׇּׁׂ]/g;
function vocalised(s) {
  const letters = (String(s).match(HEB) || []).length; if (!letters) return true;
  const marks = (String(s).match(NIK) || []).length;
  for (const w of String(s).split(/[\s,.?!:;"'()–-]+/)) { const l = (w.match(HEB) || []).length; if (l >= 2 && !(w.match(NIK) || []).length) return false; }
  return marks * 2 >= letters * 0.8;
}
const CARD_IDS = new Set();
for (const B of [AMAZON, GROVE, REEF]) for (const s of B.species) CARD_IDS.add(B.id + ':' + s.id);
for (const m of fs.readFileSync(new URL('../src/game/tools.js', import.meta.url), 'utf8').matchAll(/^\s*\{ id: '([a-z]+)'/gm)) CARD_IDS.add('tool:' + m[1]);
const W = ['אישה', 'אשה', 'נשים', 'ילדה', 'ילדות', 'נערה', 'דינוזאור', 'דינוזאורים', 'אבולוציה'];
const BAD = new RegExp(`(^|[^א-ת])[והבלכמש]{0,2}(${W.join('|')})(?=$|[^א-ת])`);
function text(where, s) {
  if (typeof s !== 'string' || !s.trim()) { err(where, 'missing text'); return; }
  if (s.includes('—')) err(where, `em dash in "${s}"`);
  const plain = s.replace(/[֑-ׇ]/g, '');
  if (BAD.test(plain) || /מיליוני שנ|מיליון שנ/.test(plain)) err(where, `forbidden word in "${plain}"`);
}

// the album sets
const SRC = new Set(SOURCE_CARDS.map((c) => c.id));
const inSet = new Map();
for (const st of SOURCE_SETS) {
  text('set ' + st.id, st.name); text('set ' + st.id, st.sub);
  if (st.cards.length < 4 || st.cards.length > 5) err('set ' + st.id, `${st.cards.length} cards (4 or 5)`);
  for (const id of st.cards) { if (!SRC.has(id)) err('set ' + st.id, `unknown source card ${id}`); if (inSet.has(id)) err('set ' + st.id, `${id} is also in ${inSet.get(id)}`); inSet.set(id, st.id); }
}
for (const id of SRC) if (!inSet.has(id)) err('sets', `source card ${id} is in no set`);

// the game
let kidsN = 0, linkN = 0;
for (const id of SRC) if (!VERSE_LINKS[id]) err('links', `no entry for source card ${id}`);
for (const [id, V] of Object.entries(VERSE_LINKS)) {
  const w = 'links.' + id;
  if (!SRC.has(id)) err(w, 'not a source card');
  text(w + '.ask', V.ask); text(w + '.less', V.less);
  if (!V.links || !V.links.length) err(w, 'no links');
  const L = new Set();
  for (const l of V.links || []) {
    if (!CARD_IDS.has(l.c)) err(w, `unknown card ${l.c}`);
    if (L.has(l.c)) err(w, `${l.c} twice`); L.add(l.c);
    if (l.w !== 1 && l.w !== 2) err(w, `${l.c}: w must be 1 or 2`);
    if (!V.links.some((x) => x.w === 2)) err(w, 'no link with w 2');
    text(`${w}.${l.c}`, l.t); linkN++;
  }
  if (!V.pool || V.pool.length < 2) err(w, 'pool needs at least two cards');
  for (const c of V.pool || []) { if (!CARD_IDS.has(c)) err(w, `unknown pool card ${c}`); if (L.has(c)) err(w, `${c} is both a link and in the pool`); }
  if (new Set(V.pool).size !== (V.pool || []).length) err(w, 'pool has a card twice');
  if (V.kids) {
    kidsN++;
    for (const k of ['ask', 'less']) { text(`${w}.kids.${k}`, V.kids[k]); if (!vocalised(V.kids[k])) err(w, `kids.${k} without full nikud: "${V.kids[k]}"`); }
    for (const l of V.links) {
      const s = (V.kids.links || {})[l.c];
      if (!s) { err(w, `kids line missing for ${l.c}`); continue; }
      text(`${w}.kids.${l.c}`, s); if (!vocalised(s)) err(w, `kids line for ${l.c} without full nikud: "${s}"`);
    }
    for (const c of Object.keys(V.kids.links || {})) if (!L.has(c)) err(w, `kids line for ${c}, which is not a link`);
  }
}
if (kidsN < 6) err('links', `only ${kidsN} sources for the beginners (a round needs 6)`);
for (const [k, [plain, kid]] of Object.entries(VERSE_UI)) {
  text('ui.' + k, plain); text('ui.' + k + '.kids', kid);
  if (!vocalised(kid)) err('ui.' + k, `beginners' line without full nikud: "${kid}"`);
  const vars = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
  if (vars(plain) !== vars(kid)) err('ui.' + k, 'the plain and the beginners\' lines have different {x} fields');
}
for (const e of errors) console.log('ERROR', e);
console.log(errors.length ? `\n${errors.length} error(s)` : `OK – ${SOURCE_SETS.length} sets, ${Object.keys(VERSE_LINKS).length} sources, ${linkN} links, ${kidsN} for beginners`);
process.exit(errors.length ? 1 : 0);
