// קוּבִּי's lines for his voice (Chatterbox on the owner's PC, tools/voice/cb_say.py): writes a JSON list
// [{ id, text }] of every line he says (src/data/robolab/kubi-lines.js, the lessons' and puzzles' words, the run
// messages). The text is the vocalised form (k). usage: node tools/voice/kubi-lines.mjs out.json [--test]
import { writeFileSync } from 'node:fs';
import { HELLO, INTRO, CHAPTER_INTRO, BLOCK_INTRO } from '../../src/data/robolab/kubi-lines.js';
import { ALL_LEVELS } from '../../src/data/robolab/index.js';
import { WIN_LINES, FAIL_LINES, GOAL_LINES, OOPS_LINES } from '../../src/data/robolab/lines.js';
const out = [];
const add = (id, o) => { if (o && o.k) out.push({ id, text: o.k }); };
if (process.argv.includes('--test')) {
  out.push({ id: 'test_nikud', text: HELLO.first.k }, { id: 'test_plain', text: HELLO.first.f });
}
for (const [k, o] of Object.entries(HELLO)) add('kh_' + k, o);
INTRO.forEach((o, i) => add('ki_' + i, o));
for (const [n, o] of Object.entries(CHAPTER_INTRO)) add('kc_' + n, o);
for (const [b, o] of Object.entries(BLOCK_INTRO)) add('kb_' + b, o);
for (const L of ALL_LEVELS) add('kl_' + L.id, { k: (L.say || []).map((s) => s.k).join(' ') });
WIN_LINES.forEach((o, i) => add('kw_' + i, o));
for (const [k, list] of Object.entries(FAIL_LINES)) list.forEach((o, i) => add('kf_' + k + '_' + i, o));
for (const [k, list] of Object.entries(GOAL_LINES)) list.forEach((o, i) => add('kg_' + k.replace(':', '_') + '_' + i, o));
for (const [k, list] of Object.entries(OOPS_LINES)) list.forEach((o, i) => add('ko_' + k + '_' + i, o));
writeFileSync(process.argv[2], JSON.stringify(out, null, 0));
console.log(out.length + ' lines, ' + out.reduce((n, l) => n + l.text.length, 0) + ' characters');
