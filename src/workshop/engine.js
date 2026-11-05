// The test hall's engine (1.4.4 set 4): pure numbers, no three.js. Shared by the screen, the orders and the tests.
//   scores(proto) → { wind, water, heat, sand, drop, noise }  0..100 each (base 30 + every piece's effect)
//   runTest(proto, test, min = PASS) → { score, pass, fail }   fail: the funny animation of a failure
//   checkOrder(proto, order) → { ok, tests: [{ id, score, min, pass }], need: bool, nature: bool, missing: [what] }
//   protoOk(proto) → a proto with known pieces only (an old save may hold a piece that no longer exists)
// A proto: { shape, mat, add: [addon ids] (at most MAX_ADDONS, no repeats) }
import { TESTS, TEST_IDS, shapeOf, materialOf, addonOf, MAX_ADDONS } from '../data/workshop/build-parts.js';

export const PASS = 60;
const BASE = 30;
export function protoOk(p) {
  const o = p && typeof p === 'object' ? p : {};
  const add = [...new Set((Array.isArray(o.add) ? o.add : []).filter((a) => addonOf(a)))].slice(0, MAX_ADDONS);
  return { shape: shapeOf(o.shape) ? o.shape : 'box', mat: materialOf(o.mat) ? o.mat : 'wood', add };
}
export function scores(proto) {
  const p = protoOk(proto);
  const out = Object.fromEntries(TEST_IDS.map((t) => [t, BASE]));
  const addFx = (fx) => { for (const t of TEST_IDS) out[t] += fx[t] || 0; };
  addFx(shapeOf(p.shape).fx); addFx(materialOf(p.mat).fx);
  for (const a of p.add) addFx(addonOf(a).fx);
  for (const t of TEST_IDS) out[t] = Math.max(0, Math.min(100, out[t]));
  return out;
}
export function runTest(proto, test, min = PASS) {
  const T = TESTS.find((x) => x.id === test); const score = scores(proto)[test];
  return { score, pass: score >= min, fail: T ? T.fail : 'apart' };
}
export const hasNature = (proto) => protoOk(proto).add.some((a) => addonOf(a).kind === 'nature');
export function checkOrder(proto, order) {
  const p = protoOk(proto), sc = scores(p);
  const tests = Object.entries(order.tests).map(([id, min]) => ({ id, min, score: sc[id], pass: sc[id] >= min }));
  const need = !order.need || order.need.some((a) => p.add.includes(a));
  const nature = hasNature(p);
  const missing = [...(nature ? [] : ['nature']), ...(need ? [] : ['need']), ...tests.filter((t) => !t.pass).map((t) => t.id)];
  return { ok: !missing.length, tests, need, nature, missing };
}
