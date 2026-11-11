// הבלש של השבוע (1.4.4 set 7): every case is whole. Five clues of known kinds, each painting exists, every suspect has
// a name and a painting, every wrong suspect is answered by a clue that comes before the end, beginners' words have nikud.
import { DETECTIVE_VERSIONS, DET_UI } from '../../src/data/weekly/detective.js';
import { SUS } from '../../src/lab/clue-cases.js';
import fs from 'fs';
const art = fs.readFileSync(new URL('../../src/data/lab-items-art.js', import.meta.url), 'utf8');
const cards = fs.readFileSync(new URL('../../src/data/card-art.js', import.meta.url), 'utf8');
const has = (src, id) => src.includes('"' + id + '":');
const NIKUD = /[ְ-ׇּׁׂ]/;
let bad = 0; const fail = (m) => { bad++; console.log('FAIL ' + m); };
const zones = new Set();
for (const V of DETECTIVE_VERSIONS) {
  zones.add(V.zone);
  if (V.clues.length !== 5) fail(V.id + ': five clues, one a day');
  for (const [i, c] of V.clues.entries()) {
    if (!DET_UI[c.kind]) fail(V.id + ' clue ' + i + ': kind ' + c.kind);
    if (c.pic) { const ok = c.pic.startsWith('card:') ? has(cards, c.pic.slice(5)) : has(art, c.pic); if (!ok) fail(V.id + ' clue ' + i + ': no painting ' + c.pic); }
    if (['find', 'look'].includes(c.kind) && !c.pic) fail(V.id + ' clue ' + i + ': a ' + c.kind + ' needs a painting');
    if (!c.f || !c.k || !NIKUD.test(c.k)) fail(V.id + ' clue ' + i + ': words (with nikud for beginners)');
  }
  if (V.sus.length < 3 || new Set(V.sus).size !== V.sus.length) fail(V.id + ': three or four different suspects');
  for (const s of V.sus) { if (!SUS[s]) fail(V.id + ': no name for ' + s); if (!has(cards, s)) fail(V.id + ': no painting for ' + s); }
  for (const s of V.sus.slice(1)) { const n = V.no[s]; if (!n || !(n.by >= 0 && n.by <= 4) || !n.k || !NIKUD.test(n.k)) fail(V.id + ': why not ' + s); }
  if (Object.keys(V.no).some((s) => !V.sus.includes(s) || s === V.sus[0])) fail(V.id + ': a "no" for someone who is not a wrong suspect');
  for (const t of [V.title, V.story, V.yes]) if (!t || !t.f || !NIKUD.test(t.k || '')) fail(V.id + ': title, story and answer with nikud');
  if (!V.guest || !V.guest.zone || !V.guest.id) fail(V.id + ': a guest');
}
if (DETECTIVE_VERSIONS.length < 8) fail('eight cases');
if (zones.size < 5) fail('cases from all five islands');
console.log(bad ? 'detective: ' + bad + ' problems' : 'detective: ' + DETECTIVE_VERSIONS.length + ' cases ok');
process.exit(bad ? 1 : 0);
