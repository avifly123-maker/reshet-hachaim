// The savanna's first visit, hands-on (1.4.2; the standing rule of 29.10: every part comes with its tutorial). רובו־דע
// asks for one action at a time and waits for it (src/ui/guided.js): plant red oat grass, bring a weaver (it eats grass
// seeds and nests on the acacia), look at the stability bar, run time on to see the grass dry. Shown once per player
// ('g:savannatut'); the zone's own greeting (zone:savanna) is replaced by it that time. Words: src/data/guide/tutorials.js
// 'stut:*'.
//   savannaTutorial({ W, guide }) → the run ({ stop, step }) | null (seen, or not the savanna)
import { runGuided } from '../ui/guided.js';
import { GUIDE } from '../data/guide-lines.js';
import { introSeen, markIntro } from '../core/journey.js';

const KEY = 'g:savannatut';
export function savannaTutorial({ W, guide, force = false }) {
  if (!guide || !W || !W.biome || W.biome.id !== 'savanna' || W.research || W.training) return null;
  if (!force && introSeen(KEY)) return null;
  const L = (k) => GUIDE[k] || [];
  const count = (id) => (W.countAlive ? W.countAlive(id) : 0);
  const cost = (id) => (W.reg.byId.get(id) || {}).cost || 0;
  const afford = (id) => { if (W.points < cost(id) + 5) W.points = cost(id) + 5; };   // the lesson never stops for points
  const tab = (t) => { const b = document.querySelector(`#ui .tray [data-tab="${t}"]`); const tr = document.querySelector('#ui .tray'); if (b && tr && tr.dataset.tab !== t) b.click(); };
  let n0 = 0;
  const steps = [
    { id: 'hello', lines: L('stut:hello'), modal: true },
    { id: 'plant', lines: L('stut:plant'), before: () => { tab('plants'); afford('redoat'); n0 = count('redoat'); }, wait: () => count('redoat') > n0 },
    { id: 'weaver', lines: L('stut:weaver'), before: () => { tab('animals'); afford('weaver'); }, wait: () => count('weaver') > 0 },
    { id: 'stab', lines: L('stut:stab') },
    { id: 'dry', lines: L('stut:dry'), wait: () => W.speed >= 3 },
    { id: 'end', lines: L('stut:end') },
  ];
  return runGuided({ guide, steps, onEnd: (r) => { if (r !== 'abort') markIntro(KEY); } });
}
