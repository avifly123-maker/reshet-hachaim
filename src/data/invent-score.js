// "הממציאים": the scoring rules, in plain code (no DOM), shared by the game (src/learn/games/inventors.js) and
// tools/check-inventions.mjs. Everything is decided by the TRAITS of the cards, never by a card id.
//
// scoreProblem(p, cards) → a result for the cards on the bench. `cards` are { id, tr: [traits], tool, biome } objects.
//   stars 3 (level 'win'): a route of the problem is covered by living cards (a device never inspires). `route` is the
//            traits; `alt` the alt route's index when it is a creative route (null for the problem's own route).
//   stars 2 (level 'good'): two cards each bring something useful (a half trait, or part of a route), not a full route.
//   stars 1 (level 'part' when it is half of the problem's own combination, else 'half'): one card brings something.
//   stars 0 (level 'odd' for a funny pair from WILD, else 'fail').
//   `helped` lists { card, t } for every useful trait on the bench, `missing` the traits of the problem's own route
//   that are still missing (for the hint and the breakdown).
// robotTest(test, robot) → { sc, lv, good, ok, bad, weightPen, busyPen } for one test of the robot workshop.
import { problemNeeds, WILD, traitWeight, bodyWeight } from './inventions.js';

const living = (cards) => cards.filter((c) => !c.tool);

// can these traits all be found on these cards? (a card may bring two traits of one route)
export function covers(route, cards) {
  return route.every((t) => cards.some((c) => c.tr.includes(t)));
}
// the problem's own combination keeps its rule from 1.3: two traits from two different cards
function coversOwn(need, cards) {
  if (need.length === 1) return covers(need, cards);
  const [a, b] = need;
  return cards.some((x) => cards.some((y) => x !== y && x.tr.includes(a) && y.tr.includes(b)));
}
export const routesOf = (p) => [problemNeeds(p), ...(p.alt || []).map((a) => a.t)];
export const usefulTraits = (p) => new Set([...p.half, ...routesOf(p).flat()]);

export function scoreProblem(p, cards, hash = 0) {
  const live = living(cards), need = problemNeeds(p);
  const useful = usefulTraits(p);
  const helped = [];
  for (const c of live) for (const t of c.tr) if (useful.has(t) && !helped.some((h) => h.card === c && h.t === t)) helped.push({ card: c, t });
  const missing = need.filter((t) => !live.some((c) => c.tr.includes(t)));
  const base = { helped, missing, need };
  if (coversOwn(need, live)) {
    const keyCards = live.filter((c) => need.some((t) => c.tr.includes(t)));
    return { ...base, stars: 3, level: 'win', route: need, alt: null, keyCards, combo: need.length === 2 };
  }
  // several creative routes may fit: take the one whose traits come first on the cards (a card's strongest trait first)
  const rank = (route) => route.reduce((s, t) => s + Math.min(...live.filter((c) => c.tr.includes(t)).map((c) => c.tr.indexOf(t))), 0);
  let ai = -1;
  (p.alt || []).forEach((a, i) => { if (covers(a.t, live) && (ai < 0 || rank(a.t) < rank(p.alt[ai].t))) ai = i; });
  if (ai >= 0) {
    const route = p.alt[ai].t;
    const keyCards = live.filter((c) => route.some((t) => c.tr.includes(t)));
    return { ...base, stars: 3, level: 'win', route, alt: ai, keyCards, creative: true };
  }
  const helpers = [...new Set(helped.map((h) => h.card))];
  if (helpers.length) {
    // half of the problem's own combination (the part texts say what the test showed and what is missing)
    const part = need.length === 2 ? need.find((t) => live.some((c) => c.tr.includes(t))) : null;
    const stars = Math.min(2, helpers.length);
    return { ...base, stars, level: stars === 2 ? 'good' : part ? 'part' : 'half', part: part || null, by: helpers[0] };
  }
  if (cards.length === 2) {
    const [x, y] = cards.map((c) => c.tr);
    const wi = WILD.findIndex((o) => (x.includes(o.t[0]) && y.includes(o.t[1])) || (x.includes(o.t[1]) && y.includes(o.t[0])));
    if (wi >= 0) return { ...base, stars: 0, level: 'odd', wild: wi, by: cards[0] };
  }
  return { ...base, stars: 0, level: 'fail', by: cards[0], jitter: hash & 15 };
}
// the gauge on the bench, in percent
export const gaugeOf = (r) => ({ win: r.combo || (r.keyCards && r.keyCards.length > 1) ? 100 : 94, good: 72, part: 50, half: 42, odd: 28 }[r.level] ?? 8 + (r.jitter || 0));

/* ───────────── the robot workshop */
// robot = { body: card ({ id, type, skind }), bodyTr: [traits the body brings], mods: [traits] }
export function robotWeight(robot) { return bodyWeight(robot.body) + robot.mods.reduce((s, t) => s + traitWeight(t), 0); }
export function robotTraits(robot) { return [...new Set([...(robot.bodyTr || []), ...robot.mods])]; }
export function robotTest(test, robot) {
  const tr = robotTraits(robot), W = robotWeight(robot), n = robot.mods.length;
  const good = test.good.filter((t) => tr.includes(t)), ok = test.ok.filter((t) => tr.includes(t)), bad = (test.bad || []).filter((t) => tr.includes(t));
  let base = good.length ? 62 + (good.length > 1 ? 18 : 0) : 0;
  base += Math.min(2, ok.length) * 16;
  const weightPen = (test.heavy || 0) * Math.max(0, W - 4) * 4;
  const busyPen = (test.busy || 0) * Math.max(0, n - 2);
  const badPen = bad.length * 30;
  const sc = Math.max(0, Math.min(100, Math.round(base - weightPen - busyPen - badPen)));
  return { sc, lv: sc >= 60 ? 'win' : sc >= 30 ? 'half' : 'fail', good, ok, bad, weightPen, busyPen, W };
}
