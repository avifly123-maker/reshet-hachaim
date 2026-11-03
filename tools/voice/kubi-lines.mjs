// קוּבִּי's lines for his voice (Chatterbox on the owner's PC, tools/voice/cb_say.py): writes a JSON list
// [{ id, text }] of every line he says (src/data/robolab/kubi-lines.js, the lessons' and puzzles' words, the run
// messages). The text is the vocalised form (k). usage: node tools/voice/kubi-lines.mjs out.json [--test]
import { writeFileSync } from 'node:fs';
import { HELLO, INTRO, CHAPTER_INTRO, BLOCK_INTRO } from '../../src/data/robolab/kubi-lines.js';
import { ALL_LEVELS } from '../../src/data/robolab/index.js';
import { WIN_LINES, FAIL_LINES, GOAL_LINES, OOPS_LINES } from '../../src/data/robolab/lines.js';
import { TUTORIAL_GUIDE as TUTORIALS } from '../../src/data/guide/tutorials.js';
const out = [];
// 31.10 (Avi heard "שׁ" where the text has "שׂ"): Chatterbox reads every ש as shin, also with the sin dot. The text it
// reads spells a sin as ס (with the same vowels), so שְׂרֵפוֹת is said srefot; the words on the screen stay as they are.
const SIN = /ש([\u0591-\u05C7]*?)\u05C2([\u0591-\u05C7]*)/g;
export const forVoice = (t) => t.replace(SIN, 'ס$1$2');
const add = (id, o) => { if (o && o.k) out.push({ id, text: forVoice(o.k) }); };
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
// 1.4.3: he leads the robot lab's hands-on tutorials and the workshop's (their own ids, as in the guide's bubble)
for (const [part, list] of Object.entries(TUTORIALS)) if (/^(rltut|wktut|wmtut|gartut|sbtut)/.test(part)) list.forEach((o) => add(o.id, o));
// --tutorials: only the workshop's, the missions', the design garage's and the sandbox's (Avi, 4.11: record these 20)
if (process.argv.includes('--tutorials')) for (let i = out.length - 1; i >= 0; i--) if (!/^(wk|wm|gar|sb)\./.test(out[i].id)) out.splice(i, 1);
// --missing: only the lines his voice does not have yet
if (process.argv.includes('--missing')) { const { KUBI_VOICE } = await import('../../src/data/kubi-voice.js'); const have = new Set(Object.keys(KUBI_VOICE || {})); for (let i = out.length - 1; i >= 0; i--) if (have.has(out[i].id)) out.splice(i, 1); }
writeFileSync(process.argv[2], JSON.stringify(out, null, 0));
console.log(out.length + ' lines, ' + out.reduce((n, l) => n + l.text.length, 0) + ' characters');
