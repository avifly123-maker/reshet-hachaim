// The test hall's engine (1.4.4 set 4): pure numbers, no three.js. Shared by the screen, the orders and the tests.
//   scores(proto) → { wind, water, heat, sand, drop, noise }  0..100 each (base 30 + every piece's effect)
//   runTest(proto, test, min = PASS) → { score, pass, fail }   fail: the funny animation of a failure
//   checkOrder(proto, order) → { ok, tests: [{ id, score, min, pass }], need: bool, nature: bool, missing: [what] }
//   protoOk(proto) → a proto with known pieces only (an old save may hold a piece that no longer exists)
//   autoFit(order|null, shape, nature|null) → the beginners' proto: their shape and idea from nature, with the material
//     and up to two mechanisms ניצוץ picks so the order passes when it can ("ממציא צעיר", 6.11)
// A proto: { shape, mat, add: [addon ids] (at most MAX_ADDONS, no repeats) }
import { TESTS, TEST_IDS, MATERIALS, ADDONS, shapeOf, materialOf, addonOf, MAX_ADDONS } from '../data/workshop/build-parts.js';
import { UNITS, GAUGES } from '../data/workshop/gauges.js';

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
// ── the quantities and the reasons (5.11, Avi: "real quantities, from a simple model, with a clear reason")
// unitOf(test, score) → { value, unit... } the station's score as a quantity (src/data/workshop/gauges.js UNITS)
export function unitOf(test, score) { const U = UNITS[test]; return U ? { ...U, value: U.f(score) } : null; }
// gaugeOf(proto, order) → the client's own quantity now and the target it must reach (the same line at the order's minimum)
export function gaugeOf(proto, order) {
  if (!order || !order.g) return null;
  const [id, test0] = Array.isArray(order.g) ? order.g : [order.g, null];
  const G = GAUGES[id]; if (!G) return null;
  const test = test0 || Object.keys(order.tests)[0];
  const p = protoOk(proto), sc = scores(p)[test], has = (a) => p.add.includes(a);
  const needHas = (a) => has(a) || (order.need || []).includes(a);
  const value = G.f(sc, has), target = G.f(order.tests[test], needHas);
  const ok = G.better === 'up' ? value >= target : value <= target;
  return { id, test, ...G, value, target, ok };
}
// reasons(proto, test) → which pieces helped and which got in the way, biggest first ({ id, kind, v })
export function reasons(proto, test) {
  const p = protoOk(proto);
  const parts = [{ id: p.shape, kind: 'shape', v: shapeOf(p.shape).fx[test] || 0 }, { id: p.mat, kind: 'mat', v: materialOf(p.mat).fx[test] || 0 },
    ...p.add.map((a) => ({ id: a, kind: 'add', v: addonOf(a).fx[test] || 0 }))];
  return { plus: parts.filter((x) => x.v > 0).sort((a, b) => b.v - a.v), minus: parts.filter((x) => x.v < 0).sort((a, b) => a.v - b.v) };
}

// ── ממציא צעיר (6.11, Avi: the beginners choose only a shape and an idea from nature; ניצוץ adds the rest)
// The material and up to two mechanisms that make the order pass, with the widest margin; with no order, plain wood.
const MECHS = ADDONS.filter((a) => a.kind === 'mech').map((a) => a.id);
const MECH_SETS = [[], ...MECHS.map((m) => [m]), ...MECHS.flatMap((m, i) => MECHS.slice(i + 1).map((n) => [m, n]))];
const better = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] > b[i]; return false; };   // the first key that differs decides
export function autoFit(order, shape, nature) {
  const base = nature && addonOf(nature) ? [nature] : [];
  if (!order) return protoOk({ shape, mat: 'wood', add: base });
  let best = null, bestKey = null;
  for (const m of MATERIALS) for (const set of MECH_SETS) {
    if (base.length + set.length > MAX_ADDONS) continue;
    const p = { shape, mat: m.id, add: [...base, ...set] }, r = checkOrder(p, order);
    const margin = Math.min(...r.tests.map((t) => t.score - t.min));
    const key = [r.ok ? 1 : 0, r.need ? 1 : 0, margin, -set.length];
    if (!bestKey || better(key, bestKey)) { best = p; bestKey = key; }
  }
  return protoOk(best);
}
