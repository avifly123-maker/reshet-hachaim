// ניצוץ's workshop: what a child did there, and the four measures of creative thinking (1.4.4 set 3; Avi, 4.11):
//   fluency (שטף): how many ideas;  flexibility (גמישות): from how many kinds (ideas.js CATS);
//   originality (מקוריות): a pair the child never tried before, a far lever, a wild trait in the mixer;
//   elaboration (פירוט ושיפור): "worth improving", and one thing turned many ways.
// Each measure has a meter on ניצוץ's board and badges; together they are how bright he shines.
// Storage (per player, core/storage.js K.workshop): { v: 1, ideas: [idea], tried: { <pair>: 1 }, rounds: { <cardId>: { best: ms, n } } }
//   idea: { at: 'machine' | 'mixer', th, lv, sp, pb, tr, cat, fit: 'good' | 'ok' | 'wild', r: 'works' | 'funny' | 'improve' | '', t, zone }
// The list keeps the newest 400 ideas; the counters keep counting (n*).
import { K, readPlayer, writePlayer } from '../core/storage.js';
import { CATS } from '../data/workshop/ideas.js';

const FAR = new Set(['remove', 'material', 'reuse', 'nature']);   // the levers that move far from the thing
const blank = () => ({ v: 1, ideas: [], tried: {}, rounds: {}, proto: null, orders: {}, patents: [], n: { ideas: 0, orig: 0, improve: 0, works: 0, funny: 0, mixWorks: 0, mixWild: 0, tests: 0, fails: 0, allSix: 0 } });
export function readWs() {
  const o = readPlayer(K.workshop, null);
  if (!o || typeof o !== 'object') return blank();
  const b = blank();
  return { ...b, ...o, ideas: Array.isArray(o.ideas) ? o.ideas : [], tried: o.tried || {}, rounds: o.rounds || {}, orders: o.orders || {}, patents: Array.isArray(o.patents) ? o.patents : [], n: { ...b.n, ...(o.n || {}) } };
}
const save = (o) => { try { writePlayer(K.workshop, o); } catch (e) { /* the play goes on */ } };

// a new idea: returns { idea, orig } (orig: the originality points it brought)
export function addIdea(x) {
  const o = readWs();
  const pair = x.at === 'machine' ? `m:${x.th}:${x.lv}` : `x:${x.sp}:${x.pb}:${x.tr}`;
  let orig = 0;
  if (!o.tried[pair]) { o.tried[pair] = 1; orig += 1; if (x.at === 'machine' && FAR.has(x.lv)) orig += 1; if (x.at === 'mixer' && x.fit === 'wild') orig += 1; }
  const idea = { ...x, r: x.r || '', t: Date.now() };
  o.ideas.push(idea); if (o.ideas.length > 400) o.ideas.splice(0, o.ideas.length - 400);
  o.n.ideas++; o.n.orig += orig;
  if (x.at === 'mixer') { if (x.fit === 'good' || x.fit === 'ok') o.n.mixWorks++; else o.n.mixWild++; }
  save(o);
  return { idea, orig, index: o.ideas.length - 1 };
}
// the child's rating of the last machine idea: works / funny / worth improving
export function rateLast(r) {
  const o = readWs(); const i = o.ideas.length - 1; if (i < 0) return;
  const was = o.ideas[i].r;
  if (was === r) return;
  if (was) o.n[was === 'improve' ? 'improve' : was] = Math.max(0, (o.n[was === 'improve' ? 'improve' : was] || 0) - 1);
  o.ideas[i].r = r; o.n[r === 'improve' ? 'improve' : r] = (o.n[r === 'improve' ? 'improve' : r] || 0) + 1;
  save(o);
}
export function roundDone(id, ms) {
  const o = readWs(); const R = o.rounds[id] || { best: 0, n: 0 };
  const record = !R.best || ms < R.best;
  R.n++; if (record) R.best = ms; o.rounds[id] = R; save(o);
  return { record, best: R.best, first: R.n === 1 };
}
export const crazyBox = () => readWs().ideas.filter((x) => x.r === 'funny' || x.fun);

// the four measures, each with its value and a level 0..1 for the meters
const CAP = { fluency: 60, flexibility: Object.keys(CATS).length, originality: 60, elaboration: 20 };
export function measures(o = readWs()) {
  const kinds = new Set(o.ideas.map((x) => x.cat).filter(Boolean));
  const byThing = {};
  for (const x of o.ideas) if (x.at === 'machine') (byThing[x.th] = byThing[x.th] || new Set()).add(x.lv);
  const deep = Object.values(byThing).filter((s) => s.size >= 3).length;
  const v = { fluency: o.n.ideas, flexibility: kinds.size, originality: o.n.orig, elaboration: o.n.improve + deep };
  const lv = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, Math.min(1, x / CAP[k])]));
  return { ...v, level: lv, glow: (lv.fluency + lv.flexibility + lv.originality + lv.elaboration) / 4 };
}

// the badges a state has reached (earn keys of src/data/badges.js, group 'workshop')
export function earned(o = readWs()) {
  const m = measures(o), out = [];
  if (m.fluency >= 1) out.push('nz:first');
  if (m.fluency >= 15) out.push('nz:fluency15');
  if (m.fluency >= 60) out.push('nz:fluency60');
  if (m.flexibility >= Object.keys(CATS).length) out.push('nz:flex');
  if (m.originality >= 25) out.push('nz:orig25');
  if (m.elaboration >= 6) out.push('nz:elab6');
  if (crazyBox().length >= 5) out.push('nz:crazy5');
  if (o.n.mixWorks >= 6) out.push('nz:mixer6');
  if (Object.keys(o.rounds).length >= 5) out.push('nz:cards5');
  if (o.patents.length >= 1) out.push('nz:patent1');
  if (o.patents.length >= 10) out.push('nz:patent10');
  if (Object.values(o.orders).filter((x) => x.done).length >= 10) out.push('nz:orders10');
  if (o.n.allSix >= 1) out.push('nz:allsix');
  if (o.n.fails >= 10) out.push('nz:fails10');
  if (o.patents.some((p) => (p.stars || 0) >= 3)) out.push('nz:fair3');
  return out;
}
// ── the build table and the test hall (set 4)
// the prototype on the table, kept between visits
export function saveProto(proto) { const o = readWs(); o.proto = proto; save(o); }
// a run in the test hall: counts tests and failures (a failure is a celebration: badge at ten); an order's versions
// (א', ב', ג'...) keep the scores of each tested prototype, so the child sees the improvement
export function recordTests(results, { orderId = null, proto = null } = {}) {
  const o = readWs();
  o.n.tests += results.length; o.n.fails += results.filter((r) => !r.pass).length;
  if (results.length === 6 && results.every((r) => r.pass)) o.n.allSix++;
  if (orderId) {
    const S = o.orders[orderId] || { versions: [], done: false };
    const sc = Object.fromEntries(results.map((r) => [r.id, r.score]));
    const lastV = S.versions[S.versions.length - 1];
    if (!lastV || JSON.stringify(lastV.proto) !== JSON.stringify(proto)) S.versions.push({ proto, sc, t: Date.now() });
    else lastV.sc = { ...lastV.sc, ...sc };
    if (S.versions.length > 8) S.versions.splice(0, S.versions.length - 8);
    o.orders[orderId] = S;
  }
  save(o);
}
export function orderState(id) { return readWs().orders[id] || { versions: [], done: false }; }
export function markOrder(id, patch) { const o = readWs(); o.orders[id] = { ...(o.orders[id] || { versions: [], done: false }), ...patch }; save(o); }
// a patent: { no, name, proto, order, sc, pic (a small picture), stars, t }; the newest 40 are kept with their pictures
export function addPatent(p) {
  const o = readWs();
  const no = 101 + (o.n.patents || 0); o.n.patents = (o.n.patents || 0) + 1;
  const P = { ...p, no, t: Date.now() };
  o.patents.push(P); if (o.patents.length > 40) o.patents.splice(0, o.patents.length - 40);
  save(o); return P;
}
export function setStars(no, stars) { const o = readWs(); const P = o.patents.find((x) => x.no === no); if (P) { P.stars = stars; save(o); } }
try { window.__wsProgress = { readWs, measures, earned, reset: () => save(blank()) }; } catch (e) { /* node */ }
