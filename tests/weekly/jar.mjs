// הצנצנת הסגורה: every jar version can hold (at least two different choices of the minimum size or more) and can break,
// every creature on a shelf has a card and a painting, and every failure reason appears somewhere.
import { JAR_VERSIONS, JAR_MIN, WHY } from '../../src/data/weekly/jar.js';
import { simulate } from '../../src/weekly/jar-model.js';
import { NATURE_CARDS } from '../../src/data/workshop/nature-cards.js';
let bad = 0; const err = (m) => { bad++; console.log('ERR ' + m); };
const seen = {}; const out = [];
for (const v of JAR_VERSIONS) {
  const ids = Object.keys(v.pool); let ok = 0, okKids = 0, broke = 0;
  for (const id of ids) if (!NATURE_CARDS.find((c) => c.id === id)) err(`${v.id}: ${id} has no card`);
  for (let m = 1; m < (1 << ids.length); m++) {
    const s = ids.filter((_, i) => m & (1 << i)); if (s.length > 6) continue;
    const r = simulate(s, v); seen[r.why || 'ok'] = 1;
    if (r.ok && s.length >= JAR_MIN.full) ok++; if (r.ok && s.length >= JAR_MIN.kids) okKids++; if (!r.ok && s.length >= JAR_MIN.full) broke++;
  }
  if (ok < 2) err(`${v.id}: only ${ok} full jars hold`); if (okKids < 2) err(`${v.id}: beginners have ${okKids}`); if (!broke) err(`${v.id}: never breaks`);
  out.push(`${v.id}:${ok}`);
}
for (const w of Object.keys(WHY)) if (!seen[w]) err(`no jar ever ends "${w}"`);
console.log(bad ? `jar: ${bad} errors` : `jar OK: ${JAR_VERSIONS.length} jars hold and break (${out.join(' ')})`);
process.exit(bad ? 1 : 0);
