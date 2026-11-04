// הסדנה של ניצוץ (1.4.4 set 3): the workshop's data is whole. Every thing has an invention for every lever (and the
// beginners' levers have vocalised words), every problem leans on a real test that some card can pass, every
// constraint card can be won with the levers it allows (beginners: with their four), and the measures count right.
import { THINGS, LEVERS, CATS } from '../../src/data/workshop/ideas.js';
import { PROBLEMS } from '../../src/data/workshop/mixer.js';
import { CONSTRAINTS } from '../../src/data/workshop/constraints.js';
import { NATURE_CARDS } from '../../src/data/workshop/nature-cards.js';
import { TRIALS, TRAIT } from '../../src/data/inventions.js';
import { TRAIT_K } from '../../src/data/inventions-kids.js';

let bad = 0; const err = (m) => { bad++; console.log('ERR ' + m); };
const NIK = /[ְ-ּ]/;
for (const t of THINGS) for (const l of LEVERS) {
  const o = t.out[l.id]; if (!o) { err(`${t.id}: no ${l.id}`); continue; }
  if (!CATS[o.cat]) err(`${t.id}.${l.id}: cat ${o.cat}`);
  if (l.kids && !(o.k && NIK.test(o.k))) err(`${t.id}.${l.id}: beginners' words missing`);
}
if (!THINGS.every((t) => t.k && NIK.test(t.k))) err('a thing without beginners name');
for (const p of PROBLEMS) {
  const T = TRIALS.find((x) => x.id === p.trial); if (!T) { err(`${p.id}: trial ${p.trial}`); continue; }
  if (!CATS[p.cat]) err(`${p.id}: cat`);
  if (!NIK.test(p.k || '')) err(`${p.id}: k`);
  if (!NATURE_CARDS.some((c) => c.tr.some((x) => T.good.includes(x)))) err(`${p.id}: no card passes ${p.trial}`);
}
for (const c of NATURE_CARDS) for (const t of c.tr) if (!TRAIT[t] || !TRAIT_K[t]) err(`${c.id}: trait ${t}`);
const goalOK = (g, levers, kidsMode) => {
  const L = levers || LEVERS.filter((l) => !kidsMode || l.kids).map((l) => l.id);
  const outs = THINGS.flatMap((t) => L.map((l) => ({ t: t.id, l, o: t.out[l] })));
  if (g.ideas) return outs.length >= g.ideas;
  if (g.cats) return new Set(outs.map((x) => x.o.cat)).size >= g.cats;
  if (g.cat) return outs.filter((x) => x.o.cat === g.cat).length >= g.n;
  if (g.thing) return L.length >= g.thing;
  if (g.things) return THINGS.length >= g.things;
  if (g.allLevers) return !kidsMode && !levers;
  return true;   // ratings and the mixer: any idea can get them
};
for (const c of CONSTRAINTS) {
  if (!['machine', 'mixer'].includes(c.at)) err(`${c.id}: at`);
  if (c.levers && c.levers.some((l) => !LEVERS.find((x) => x.id === l))) err(`${c.id}: lever`);
  if (!goalOK(c.goal, c.levers, false)) err(`${c.id}: cannot be won`);
  if (c.k) {
    if (c.adv) err(`${c.id}: adv with k`);
    if (!NIK.test(c.k)) err(`${c.id}: k without nikud`);
    const kl = c.levers && c.levers.filter((l) => LEVERS.find((x) => x.id === l).kids);
    if (!goalOK(c.kgoal || c.goal, kl && kl.length ? kl : c.levers ? [] : null, true)) err(`${c.id}: beginners cannot win it`);
  }
}
console.log(bad ? `workshop data: ${bad} errors` : `workshop data OK: ${THINGS.length} things x ${LEVERS.length} levers, ${PROBLEMS.length} problems, ${NATURE_CARDS.length} cards, ${CONSTRAINTS.length} constraint cards`);
process.exit(bad ? 1 : 0);
