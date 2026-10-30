// "הממציאים": every card, and every pair of cards, against every problem; and the robot workshop's missions.
//   node tools/check-inventions.mjs            → the summary table, then the checks (exit 1 on errors)
//   node tools/check-inventions.mjs --cards    → also the winning cards of every problem (to read them by eye)
// Checks:
//   · every problem has at least two working routes: two different trait routes (its own and a creative one), or, where
//     science has only one idea, at least two different creatures that bring it (printed as a warning)
//   · every alt route can be reached with the cards that exist
//   · a device never scores (only living things inspire), a bench of devices only scores 0
//   · a trait that wins a problem is visible on the card (one of the first three, the ones the bench shows)
//   · robot workshop: every mission can be passed with 2, 3 and 4 traits; no robot passes all twelve tests (the big test
//     says so); more traits help on average but weight makes some tests harder
import fs from 'node:fs';
import { PROBLEMS, TRAIT, TRAITS, traitsOf, TRIALS, MISSIONS } from '../src/data/inventions.js';
import { scoreProblem, routesOf, robotTest, covers } from '../src/data/invent-score.js';
import { BIOME as AMAZON } from '../src/data/amazon.js';
import { BIOME as GROVE } from '../src/data/grove.js';
import { BIOME as REEF } from '../src/data/reef.js';
import { BIOME as DESERT } from '../src/data/desert.js';

const SHOW = process.argv.includes('--cards');
const errors = [], warns = [];
const err = (m) => errors.push(m), warn = (m) => warns.push(m);

// the cards of the hub (src/learn/hub/): every species, every device (and the reef's own devices)
const cards = [];
for (const B of [AMAZON, GROVE, REEF, DESERT]) for (const s of B.species) cards.push({ id: `${B.id || ''}:${s.id}`, sp: s.id, name: s.name, skind: s.kind, type: 'species', tool: false });
const toolsSrc = fs.readFileSync(new URL('../src/game/tool-defs.js', import.meta.url), 'utf8');
const toolIds = [...new Set([...toolsSrc.matchAll(/^\s*\{ id: '([a-z]+)'.*?name: '([^']+)'/gm)].map((m) => m[1] + '|' + m[2]))].map((x) => x.split('|'));
for (const [id, name] of [...toolIds, ['rov', 'רובוט צולל'], ['uwcam', 'מצלמה תת־ימית'], ['sensor', 'מצוף חיישנים']]) cards.push({ id: 'tool:' + id, sp: id, name, type: 'tool', tool: true });
for (const c of cards) c.tr = traitsOf({ id: c.id, type: c.type, skind: c.skind });
const living = cards.filter((c) => !c.tool);
const nm = (c) => c.name;

// ── problems
const rows = [];
let totalSingles = 0, totalPairs = 0;
for (const p of PROBLEMS) {
  const routes = routesOf(p);
  const singles = { 3: [], 2: [], 1: [], 0: [] };
  for (const c of cards) { const r = scoreProblem(p, [c]); singles[r.stars].push({ c, r }); }
  const pairStars = { 3: 0, 2: 0, 1: 0, 0: 0 };
  const routeHit = routes.map(() => 0), creatures = new Set();
  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
    const r = scoreProblem(p, [cards[i], cards[j]]);
    pairStars[r.stars]++;
    if (r.level === 'win') { routeHit[r.alt == null ? 0 : r.alt + 1]++; for (const k of r.keyCards) creatures.add(k.sp); }
    if (r.stars > 0 && cards[i].tool && cards[j].tool) err(`${p.id}: two devices scored ${r.stars}`);
  }
  for (const { c, r } of singles[3]) { if (r.alt == null) routeHit[0]++; else routeHit[r.alt + 1]++; for (const k of r.keyCards) creatures.add(k.sp); }
  totalSingles += cards.length; totalPairs += cards.length * (cards.length - 1) / 2;
  for (const s of [3, 2, 1]) for (const { c } of singles[s]) if (c.tool) err(`${p.id}: the device ${c.id} scored ${s}`);
  // a route works when some bench of one or two living cards brings all its traits (even if another route is reported first)
  const reach = routes.map((rt, i) => living.some((c) => covers(rt, [c]) && (i > 0 || rt.length === 1)) || living.some((c, k) => living.some((d, l) => l > k && covers(rt, [c, d]) && (i > 0 || (c.tr.includes(rt[0]) && d.tr.includes(rt[1])) || (d.tr.includes(rt[0]) && c.tr.includes(rt[1]))))));
  routes.forEach((rt, i) => { if (!reach[i]) err(`${p.id}: route ${i ? 'alt ' + i : 'own'} [${rt.join('+')}] can be reached by no card or pair`); });
  const working = reach.filter(Boolean).length;
  if (working < 2) {
    if (creatures.size >= 2) warn(`${p.id}: one trait route [${routes[0].join('+')}], brought by ${creatures.size} creatures (${[...creatures].join(', ')}): no second idea that really works was found`);
    else err(`${p.id}: only one working route and one creature`);
  }
  // a winning trait must be one the bench shows (the first three of a card)
  for (const { c, r } of singles[3]) for (const t of r.route) if (c.tr.includes(t) && c.tr.indexOf(t) > 2) warn(`${p.id}: ${c.sp} wins with "${t}", its trait no. ${c.tr.indexOf(t) + 1} (not shown on the bench)`);
  rows.push({ p, routes, working, creatures: creatures.size, s3: singles[3].length, s2: singles[2].length, s1: singles[1].length, s0: singles[0].length, pairStars, winners: singles[3] });
}

const pad = (s, n) => String(s).padEnd(n);
const lpad = (s, n) => String(s).padStart(n);
console.log(`הממציאים: ${PROBLEMS.length} problems × ${cards.length} cards (${living.length} living, ${cards.length - living.length} devices): ${totalSingles} single benches, ${totalPairs} pairs\n`);
console.log(`${pad('problem', 11)} ${pad('routes (own | creative)', 46)} ${lpad('ok', 2)} ${lpad('who', 3)}   singles ★3 ★2 ★1 ★0     pairs ★3 ★2 ★1 ★0`);
for (const r of rows) {
  const rt = r.routes.map((x) => x.join('+')).join(' | ');
  console.log(`${pad(r.p.id, 11)} ${pad(rt.slice(0, 46), 46)} ${lpad(r.working, 2)} ${lpad(r.creatures, 3)}   ${lpad(r.s3, 9)} ${lpad(r.s2, 2)} ${lpad(r.s1, 2)} ${lpad(r.s0, 2)}  ${lpad(r.pairStars[3], 7)} ${lpad(r.pairStars[2], 4)} ${lpad(r.pairStars[1], 4)} ${lpad(r.pairStars[0], 4)}`);
  if (SHOW) console.log(`            wins alone: ${r.winners.map(({ c, r: x }) => nm(c) + (x.creative ? '*' : '')).join(', ') || '(a combination: pairs only)'}`);
}
const two = rows.filter((r) => r.working >= 2).length;
console.log(`\n${two} of ${PROBLEMS.length} problems have two or more trait routes; ${rows.reduce((s, r) => s + r.p.alt.length, 0)} creative routes in all; * = a creative route`);

// ── robot workshop
const pool = [...new Set(Object.values(TRAITS).flat())];
let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const bodies = cards;
const mkRobot = (body, mods) => ({ body: { id: body.id, type: body.type, skind: body.skind }, bodyTr: body.tr.slice(0, 2), mods });
const randRobot = (n) => { const b = bodies[Math.floor(rnd() * bodies.length)]; const m = new Set(); while (m.size < n) m.add(pool[Math.floor(rnd() * pool.length)]); return mkRobot(b, [...m]); };
const runMission = (m, robot) => { const res = m.tests.map((id) => robotTest(TRIALS.find((t) => t.id === id), robot)); return { res, wins: res.filter((x) => x.lv === 'win').length, pass: res.every((x) => x.lv !== 'fail') }; };
// the best robot for a mission with n traits: a hill climb from many random starts
function best(m, n) {
  let top = null;
  for (let s = 0; s < 300; s++) {
    let r = randRobot(n), sc = runMission(m, r); const val = (x) => x.wins * 1000 + x.res.reduce((a, y) => a + y.sc, 0);
    for (let k = 0; k < 400; k++) {
      const r2 = rnd() < 0.3 ? mkRobot(bodies[Math.floor(rnd() * bodies.length)], r.mods) : mkRobot(bodies.find((b) => b.id === r.body.id), r.mods.map((t, i) => (i === Math.floor(rnd() * n) ? pool[Math.floor(rnd() * pool.length)] : t)));
      if (new Set(r2.mods).size < n) continue;
      const s2 = runMission(m, r2); if (val(s2) >= val(sc)) { r = r2; sc = s2; }
    }
    if (!top || (sc.wins * 1000 + sc.res.reduce((a, y) => a + y.sc, 0)) > (top.sc.wins * 1000 + top.sc.res.reduce((a, y) => a + y.sc, 0))) top = { r, sc };
  }
  return top;
}
console.log(`\nסדנת הרובוטים: ${TRIALS.length} tests, ${MISSIONS.length} missions; random robots (2000 per size) and the best robot found by a search`);
console.log(`${pad('mission', 8)} ${pad('tests', 24)}  random pass% n=2  n=3  n=4   best wins n=2 n=3 n=4   best robot (n=2)`);
for (const m of MISSIONS) {
  const rate = [2, 3, 4].map((n) => { let ok = 0; for (let i = 0; i < 2000; i++) if (runMission(m, randRobot(n)).pass) ok++; return Math.round(ok / 20); });
  const bests = [2, 3, 4].map((n) => best(m, n));
  console.log(`${pad(m.id, 8)} ${pad(m.tests.length > 3 ? 'all ' + m.tests.length : m.tests.join(','), 24)}  ${lpad(rate[0], 15)} ${lpad(rate[1], 4)} ${lpad(rate[2], 4)}   ${lpad(bests[0].sc.wins, 13)} ${lpad(bests[1].sc.wins, 3)} ${lpad(bests[2].sc.wins, 3)}   ${bests[0].r.body.id.split(':').pop()} + ${bests[0].r.mods.join(', ')}`);
  for (const [i, b] of bests.entries()) if (!m.free && !b.sc.pass) err(`mission ${m.id}: no robot with ${i + 2} traits passes`);
  if (m.free && bests.some((b) => b.sc.wins === m.tests.length)) err(`mission ${m.id}: a robot passed all ${m.tests.length} tests (the text says none does)`);
  if (m.free) console.log(`         the big test, most tests won: ${bests.map((b, i) => `n=${i + 2}: ${b.sc.wins} (${b.r.body.id.split(':').pop()} + ${b.r.mods.join(', ')})`).join('; ')}`);
}
// the trade-off: per test, the average score of random robots with 2 and with 4 traits
console.log('\nper test, average score of random robots: 2 traits → 4 traits (weight and size hurt where the number falls)');
console.log(TRIALS.map((t) => { const avg = (n) => { let s = 0; for (let i = 0; i < 3000; i++) s += robotTest(t, randRobot(n)).sc; return Math.round(s / 3000); }; return `${t.id} ${avg(2)}→${avg(4)}`; }).join('   '));

for (const w of warns) console.log('warn  ' + w);
for (const e of errors) console.log('ERROR ' + e);
console.log(errors.length ? `\n${errors.length} error(s)` : `\nOK – ${PROBLEMS.length} problems checked, ${warns.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
