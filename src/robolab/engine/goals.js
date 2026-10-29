// What a level asks for, and whether a finished run did it. level.goal = { all: [conditions] } (or a single condition).
//   { t: 'reach', tool, x, y }        the tool ended on that cell
//   { t: 'home', tool }               the tool ended on the base (level.home)
//   { t: 'done', item }               every item of that type is done (seed planted, fruit picked, fire out, …)
//   { t: 'report', n }                the last report said n (counting animals)
//   { t: 'reports', list }            the reports, in order, said exactly these numbers
//   { t: 'landed' }                   the drone came back and landed
//   { t: 'nooops' }                   no wasted action (planting where there is nothing to plant)
//   { t: 'steps', max }               the whole run took at most max steps
const ITEM = { seeds: 'seed', fruit: 'fruit', thirsty: 'thirsty', fires: 'fire', nets: 'net', trash: 'trash', corals: 'coral', animals: 'animal' };

function one(c, W) {
  const T = c.tool ? W.tools[c.tool] : null;
  switch (c.t) {
    case 'reach': return !!T && T.x === c.x && T.y === c.y;
    case 'home': return !!T && !!W.home && T.x === W.home.x && T.y === W.home.y;
    case 'done': { const t = ITEM[c.item] || c.item; const its = W.items.filter((it) => it.t === t); return its.length > 0 && its.every((it) => it.done); }
    case 'report': return W.reports.length > 0 && W.reports[W.reports.length - 1] === c.n;
    case 'reports': return W.reports.length === c.list.length && c.list.every((n, i) => W.reports[i] === n);
    case 'landed': return !!W.tools.drone && W.tools.drone.landed;
    case 'nooops': return W.oops === 0;
    case 'steps': return W.ticks <= c.max;
    default: return false;
  }
}

export function checkGoal(goal, W) {
  if (!goal) return { ok: false, why: 'nogoal' };
  const list = goal.all || [goal];
  for (const c of list) if (!one(c, W)) return { ok: false, why: c.t + (c.item ? ':' + c.item : '') };
  return { ok: true };
}
