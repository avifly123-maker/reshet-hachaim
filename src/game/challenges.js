// אתגרי שומרים (1.3.2, area H, the full mode only): once the regular missions of a zone are done, each visit to it
// brings one short challenge, drawn from templates at one of three levels (the level grows with the challenges done in
// that zone: three of level 1, three of level 2, then level 3). A challenge done gives life points and rank points
// (src/game/rank.js CH_POINTS); it is kept in 'web-of-life-after' (zones[z].ch). Nothing is saved for a challenge that
// was not finished: the next visit brings a new one.
import { zoneWord } from '../core/place.js';

// the words for a day: in the grove every day is a season
const dayWords = (grove) => (grove ? ['עד סוף העונה', 'במשך עונה שלמה', 'במשך שתי עונות'] : ['עד סוף היום', 'במשך יום שלם', 'במשך שני ימים']);

// each template: id, ok(ctx) → can it be offered now, make(lv, ctx) → { title, how, goal, need }
//   goal kinds: 'hold' (a condition kept through day changes), 'links' (new links found), 'photos' (species photographed
//   this visit), 'pairs' (linked pairs photographed this visit), 'visitor' (rare visitors photographed this visit),
//   'chain' (a food chain of n links), 'kinds' (species alive), 'health' (vitality above p for s seconds)
export const TEMPLATES = [
  { id: 'hold', ok: (c) => c.kinds() >= 5,
    make: (lv, c) => { const n = Math.max(5, c.kinds() + [-2, 0, 1][lv - 1]); const d = dayWords(c.grove)[lv - 1];
      return { title: `שמרו על ${n} מינים חיים ${d}`, how: 'אם מין נעלם, הספירה מתחילה מחדש. האכילו, שתלו ושמרו.', goal: { kind: 'hold', n, days: lv } }; } },
  { id: 'links', ok: (c) => c.undiscovered() >= 2,
    make: (lv, c) => { const n = Math.min(c.undiscovered(), [2, 3, 4][lv - 1]);
      return { title: `גלו ${n} קשרים חדשים ברשת`, how: 'לחצו על צמח או על בעל חיים, ובכרטיס שלו לחצו "גלה את הקשר".', goal: { kind: 'links', n } }; } },
  { id: 'photos', ok: () => true,
    make: (lv) => { const n = [3, 5, 7][lv - 1];
      return { title: `צלמו ${n} מינים שונים`, how: 'לחצו על "צילום" משמאל, כוונו וצלמו.', goal: { kind: 'photos', n } }; } },
  { id: 'pairs', ok: () => true,
    make: (lv) => { const n = lv;
      return { title: n === 1 ? 'צלמו שני מינים שקשורים זה לזה' : `צלמו ${n} זוגות של מינים שקשורים זה לזה`, how: 'למשל ציפור ליד העץ שהיא אוכלת ממנו, באותה תמונה.', goal: { kind: 'pairs', n } }; } },
  { id: 'visitor', ok: (c) => c.visitorsPossible(),
    make: (lv) => ({ title: lv >= 3 ? 'צלמו שני מבקרים נדירים' : 'משכו מבקר נדיר וצלמו אותו', how: 'מבקר נדיר בא כשיש לו מה שהוא מחפש: אוכל, עצים גבוהים או מחבוא.', goal: { kind: 'visitor', n: lv >= 3 ? 2 : 1 } }) },
  { id: 'chain', ok: (c) => c.chain() < 5,
    make: (lv, c) => { const n = Math.min(5, Math.max(c.chain() + 1, [3, 4, 5][lv - 1]));
      return { title: `בנו שרשרת מזון של ${n} חוליות`, how: 'צמח, מי שאוכל אותו, ומי שאוכל אותו. בכרטיסים רואים מי אוכל את מי.', goal: { kind: 'chain', n } }; } },
  { id: 'kinds', ok: (c) => c.kinds() + 2 <= c.total(),
    make: (lv, c) => { const n = Math.min(c.total(), c.kinds() + [2, 3, 4][lv - 1]);
      return { title: `הביאו ${zoneWord('to')} ${n} מינים חיים`, how: 'מינים שחיים יחד וניזונים זה מזה נשארים.', goal: { kind: 'kinds', n } }; } },
  { id: 'health', ok: () => true,
    make: (lv) => { const p = [55, 65, 75][lv - 1], s = [60, 90, 120][lv - 1];
      return { title: `החזיקו את הבריאות של ${zoneWord()} מעל ${p}% במשך ${s} שניות`, how: 'הרבה מינים, צמחים בריאים ובעלי חיים שבעים.', goal: { kind: 'health', p: p / 100, s } }; } },
];

export const levelOf = (done) => Math.min(3, 1 + Math.floor(done / 3));

export function createChallenges({ W, ctx, pickLast }) {
  let cur = null;
  // the counters of this visit
  const visit = { photos: new Set(), pairs: new Set(), visitors: new Set() };
  function offer(doneCount) {
    const lv = levelOf(doneCount);
    const last = pickLast ? pickLast() : null;
    const can = TEMPLATES.filter((t) => t.id !== last && (() => { try { return t.ok(ctx); } catch (e) { return false; } })());
    if (!can.length) return null;
    const T = can[(Math.random() * can.length) | 0];
    const m = T.make(lv, ctx);
    cur = { id: T.id, lv, ...m, progress: 0, done: false, base: { links: W.discovered.size, day: W.day }, holdDays: 0, holdT: 0, lastDay: W.day };
    return cur;
  }
  function progress() {
    const c = cur; if (!c || c.done) return c ? 1 : 0;
    const g = c.goal;
    switch (g.kind) {
      case 'hold': {
        if (ctx.kinds() < g.n) { c.holdDays = 0; c.lastDay = W.day; return Math.min(0.3, ctx.kinds() / g.n * 0.3); }
        if (W.day !== c.lastDay) { c.lastDay = W.day; c.holdDays++; }
        return Math.min(1, 0.1 + 0.9 * c.holdDays / g.days);
      }
      case 'links': return Math.min(1, (W.discovered.size - c.base.links) / g.n);
      case 'photos': return Math.min(1, visit.photos.size / g.n);
      case 'pairs': return Math.min(1, visit.pairs.size / g.n);
      case 'visitor': return Math.min(1, visit.visitors.size / g.n);
      case 'chain': return Math.min(1, W.longestChain() / g.n);
      case 'kinds': return Math.min(1, ctx.kinds() / g.n);
      case 'health': {
        if (W.vitality >= g.p) c.holdT += W.lastTickDt; else c.holdT = Math.max(0, c.holdT - W.lastTickDt * 2);
        return Math.min(1, c.holdT / g.s);
      }
      default: return 0;
    }
  }
  // → true the moment the challenge is done
  function tick() {
    if (!cur || cur.done) return false;
    cur.progress = progress();
    if (cur.progress >= 0.999) { cur.done = true; return true; }
    return false;
  }
  function onPhoto(info) {
    for (const x of info.ents) visit.photos.add(x.sp);
    for (const p of info.pairs) visit.pairs.add(p.join('>'));
    for (const a of info.visitors) visit.visitors.add(a.sp.id);
  }
  function onVisitor(id) { visit.visitors.add(id); }
  return { offer, tick, onPhoto, onVisitor, get current() { return cur; }, visit };
}
