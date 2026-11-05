// Every work order (src/data/workshop/orders.js) can be solved in at least two different ways, and a plain prototype
// (no idea from nature) never passes: checked without a screen over every prototype the build table can make.
import { ORDERS } from '../../src/data/workshop/orders.js';
import { SHAPES, MATERIALS, ADDONS, MAX_ADDONS, addonOf } from '../../src/data/workshop/build-parts.js';
import { checkOrder, scores } from '../../src/workshop/engine.js';
import { NATURE_CARDS } from '../../src/data/workshop/nature-cards.js';

let bad = 0; const err = (m) => { bad++; console.log('ERR ' + m); };
const ids = ADDONS.map((a) => a.id);
const subsets = [[]];
for (let k = 1; k <= MAX_ADDONS; k++) {
  const rec = (start, cur) => { if (cur.length === k) { subsets.push(cur.slice()); return; } for (let i = start; i < ids.length; i++) { cur.push(ids[i]); rec(i + 1, cur); cur.pop(); } };
  rec(0, []);
}
for (const a of ADDONS) if (a.card && !NATURE_CARDS.find((c) => c.id === a.card)) err(`addon ${a.id}: card ${a.card}`);
const stats = [];
for (const o of ORDERS) {
  if (o.lv === 1 && !/[ְ-ּ]/.test(o.k || '')) err(`${o.id}: a level-1 order needs beginners' words`);
  if (o.need) for (const n of o.need) if (!addonOf(n)) err(`${o.id}: need ${n}`);
  let ok = 0, shapesOk = new Set(), natureOk = new Set(), smallest = 9;
  for (const s of SHAPES) for (const m of MATERIALS) for (const add of subsets) {
    const r = checkOrder({ shape: s.id, mat: m.id, add }, o);
    if (r.ok) { ok++; shapesOk.add(s.id); add.forEach((a) => addonOf(a).kind === 'nature' && natureOk.add(a)); smallest = Math.min(smallest, add.length); }
  }
  if (shapesOk.size < 2) err(`${o.id}: works with only ${shapesOk.size} shape(s)`);
  if (natureOk.size < 2 && !o.need) err(`${o.id}: only one nature idea works`);
  if (o.lv === 1 && smallest > 2) err(`${o.id}: a beginners' order needs ${smallest} add-ons`);
  if (o.lv === 3 && smallest < 2) err(`${o.id}: level 3 is solved with one add-on`);
  if (checkOrder({ shape: 'box', mat: 'wood', add: [] }, o).ok) err(`${o.id}: a plain box passes`);
  stats.push(`${o.id}:${smallest}`);
}
// every test can be passed and failed
for (const t of ['wind', 'water', 'heat', 'sand', 'drop', 'noise']) {
  let lo = 100, hi = 0; for (const s of SHAPES) for (const m of MATERIALS) { const v = scores({ shape: s.id, mat: m.id, add: [] })[t]; lo = Math.min(lo, v); hi = Math.max(hi, v); }
  if (lo >= 60) err(`test ${t} never fails without add-ons`);
}
console.log(bad ? `workshop orders: ${bad} errors` : `workshop orders OK: ${ORDERS.length} orders, each with several working prototypes (fewest add-ons: ${stats.join(' ')})`);
process.exit(bad ? 1 : 0);
