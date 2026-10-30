// מעבדת הרובוטים – what a player has earned: a part or a colour of the garage is open when its `earn` rule holds
// (src/data/robolab/parts.js): 'start', 'lesson:<id>', 'chapter:<n>' (every lesson of the chapter), 'stars:<n>' (all
// stars together), 'puzzles:<n>' (puzzles solved).
import { LESSONS, PUZZLES } from '../data/robolab/index.js';
import { roboProgress } from './progress.js';

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
  return false;
}
// the words for a locked part or colour
export function earnWords(earn, kids) {
  const [k, v] = String(earn || '').split(':');
  const w = (f, kk) => (kids ? kk : f);
  if (k === 'lesson') return w('נפתח אחרי השיעור ' + v.replace('l', '').replace('-', '.'), 'נִפְתָּח אַחֲרֵי הַשִּׁעוּר ' + v.replace('l', '').replace('-', '.'));
  if (k === 'chapter') return w('נפתח כשמסיימים את פרק ' + v, 'נִפְתָּח כְּשֶׁמְּסַיְּמִים אֶת פֶּרֶק ' + v);
  if (k === 'stars') return w('נפתח ב־' + v + ' כוכבים', 'נִפְתָּח בְּ־' + v + ' כּוֹכָבִים');
  if (k === 'puzzles') return w('נפתח אחרי ' + v + ' חידות', 'נִפְתָּח אַחֲרֵי ' + v + ' חִידוֹת');
  return '';
}
