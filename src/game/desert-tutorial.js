// The desert's first visit, hands-on (1.4.1; the standing rule of 29.10: every part comes with its tutorial). רובו־דע
// asks for one action at a time and waits for it (src/ui/guided.js): plant a saltbush, bring a fat sand rat (it eats
// almost only saltbush leaves), run time on to the night. Shown once per player ('g:deserttut'); the zone's own
// greeting (zone:desert) is replaced by it that time. Words: src/data/guide/tutorials.js 'dtut:*'.
//   desertTutorial({ W, guide }) → the run ({ stop, step }) | null (seen, or not the desert)
import { runGuided } from '../ui/guided.js';
import { GUIDE } from '../data/guide-lines.js';
import { introSeen, markIntro } from '../core/journey.js';

const KEY = 'g:deserttut';
export function desertTutorial({ W, guide, force = false }) {
  if (!guide || !W || !W.biome || W.biome.id !== 'desert' || W.research || W.training) return null;
  if (!force && introSeen(KEY)) return null;
  const L = (k) => GUIDE[k] || [];
  const count = (id) => (W.countAlive ? W.countAlive(id) : 0);
  const cost = (id) => (W.reg.byId.get(id) || {}).cost || 0;
  const afford = (id) => { if (W.points < cost(id) + 5) W.points = cost(id) + 5; };   // the lesson never stops for points
  const tab = (t) => { const b = document.querySelector(`#ui .tray [data-tab="${t}"]`); const tr = document.querySelector('#ui .tray'); if (b && tr && tr.dataset.tab !== t) b.click(); };
  let n0 = 0;
  const steps = [
    { id: 'hello', lines: L('dtut:hello'), modal: true },
    { id: 'plant', lines: L('dtut:plant'), before: () => { tab('plants'); afford('saltbush'); n0 = count('saltbush'); }, wait: () => count('saltbush') > n0 },
    { id: 'rat', lines: L('dtut:rat'), before: () => { tab('animals'); afford('psammomys'); }, wait: () => count('psammomys') > 0 },
    { id: 'night', lines: L('dtut:night'), wait: () => W.speed >= 3 },
    { id: 'end', lines: L('dtut:end') },
  ];
  return runGuided({ guide, steps, onEnd: (r) => { if (r !== 'abort') markIntro(KEY); } });
}
