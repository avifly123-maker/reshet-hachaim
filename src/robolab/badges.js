// מעבדת הרובוטים – which badges a player has earned here (src/data/badges.js, group 'robolab'). Checked after every
// solved level, a funny block and a change in the garage; grant() announces a new badge (wol-badge) once.
import { grant } from '../core/badges-store.js';
import { LESSONS, PUZZLES, CHAPTERS } from '../data/robolab/index.js';
import { roboProgress } from './progress.js';

export function checkRoboBadges() {
  const P = roboProgress(), out = [];
  const g = (k) => { try { out.push(...grant(k)); } catch (e) { } };
  for (const C of CHAPTERS) { const ls = LESSONS.filter((q) => q.ch === C.n); if (ls.length && ls.every((q) => P.done[q.id])) g('robo:ch:' + C.n); }
  const three = Object.values(P.done).filter((d) => d.stars >= 3).length;
  if (three >= 10) g('robo:stars:10');
  if (three >= 30) g('robo:stars:30');
  const pz = PUZZLES.filter((q) => P.done[q.id]).length;
  if (pz >= 1) g('robo:puzzles:1');
  if (pz >= 5) g('robo:puzzles:5');
  if (P.fun >= 20) g('robo:fun');
  if (Object.values(P.look || {}).some((L) => L && L.paint && Object.keys(L.paint).length)) g('robo:design');
  return out;
}
