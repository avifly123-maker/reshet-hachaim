// מעבדת הרובוטים – what a player has earned: a part or a colour of the garage is open when its `earn` rule holds
// (src/data/robolab/parts.js): 'start', 'lesson:<id>', 'chapter:<n>' (every lesson of the chapter), 'stars:<n>' (all
// stars together), 'puzzles:<n>' (puzzles solved), 'wk:<step>' (1.4.3: the robot workshop's step).
import { LESSONS, PUZZLES } from '../data/robolab/index.js';
import { roboProgress } from './progress.js';
import { WK_STEPS } from '../data/robolab/workshop.js';

// 1.4.3: the robot workshop's step (data/robolab/workshop.js WK_STEPS): the highest step whose needs are met; a step
// reached is kept (progress.js wk.step), so a part once open never closes
export function wkStepOf(wk = roboProgress().wk) {
  let n = 0;
  for (let i = 1; i < WK_STEPS.length; i++) { const need = WK_STEPS[i].need; if (Object.entries(need).every(([k, v]) => (wk[k] || 0) >= v)) n = i; else break; }
  return Math.max(n, wk.step || 0);
}

export function earnState(P = roboProgress()) {
  let stars = 0; for (const id in P.done) stars += P.done[id].stars || 0;
  const puzzles = PUZZLES.filter((q) => P.done[q.id]).length;
  return { P, stars, puzzles };
}
export function earned(earn, S = earnState()) {
  if (!earn || earn === 'start') return true;
  const [k, v] = String(earn).split(':');
  if (k === 'lesson') return !!S.P.done[v];
  if (k === 'chapter') { const ls = LESSONS.filter((q) => q.ch === +v); return ls.length > 0 && ls.every((q) => S.P.done[q.id]); }
  if (k === 'stars') return S.stars >= +v;
  if (k === 'puzzles') return S.puzzles >= +v;
  if (k === 'wk') return wkStepOf(S.P.wk) >= +v;
  if (k === 'isl') return (S.P.isl | 0) >= +v;
  return false;
}
// the words for a locked part or colour: in earn-words.js (light, read also by the learning hub's technology cards)
export { earnWords } from './earn-words.js';
