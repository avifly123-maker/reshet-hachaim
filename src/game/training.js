// שטח האימונים (1.3.3, the refresh of 29.10, Avi: "the game should begin as an empty field, only soil and the stream,
// with a tutorial that explains the idea and the structure step by step; the islands open only after it").
// The field is the grove's land with a stream through it (createEnvironment { river, bare }), nothing planted, a few
// local species, one mission. רובו־דע leads (src/ui/guided.js): the idea (a web: every living thing needs others), the
// points, planting, time, an animal that needs a plant and rocks, the species card, the web of life, a mission. At the
// end the first islands open (core/journey.js markTrained) and the start screen explains how the journey goes on.
// Nothing here is saved: no forest, no missions in the zone's progress, no badges or packs (gated by W.training in
// game/game/*.js). The words are in src/data/guide/tutorials.js.
//   trainingBiome(groveData) → the field's biome      startTraining(ctx) → { stop, get step } (W.debug.training)
import * as THREE from 'three';
import { runGuided } from '../ui/guided.js';
import { GUIDE } from '../data/guide-lines.js';
import { markTrained, playMode } from '../core/journey.js';

export const TRAIN_SPECIES = ['sage', 'anemone', 'cyclamen', 'mastic', 'oak', 'carob', 'hyrax', 'honeybee', 'butterfly'];
const TRAIN_POINTS = 150;
const FIELD_VIEW = 64;      // the camera's distance once רובו־דע has said hello (the island is ~88 wide)   // enough for every step, with room for a few more plants

export function trainingBiome(grove) {
  const keep = new Set(TRAIN_SPECIES);
  return {
    ...grove, training: true, mode: undefined,
    name: 'שטח האימונים',
    species: grove.species.filter((s) => keep.has(s.id)).map((s) => ({ ...s, unlock: 'start' })),
    missions: [{ id: 't1', title: 'דבורה לפרחים', text: 'דבורת הדבש צריכה פרחים, והפרחים צריכים אותה. הביאו דבורת דבש אל השטח.',
      hint: 'גררו דבורת דבש מהלשונית של בעלי החיים, קרוב למרווה.', after: null, goal: { type: 'place', species: 'honeybee', count: 1 }, reward: { points: 20 } }],
    events: [],
  };
}

export function startTraining(ctx) {
  const { W, bus, onExit } = ctx;
  const G = window.__guide; if (!G) return null;
  W.points = Math.max(W.points, TRAIN_POINTS);
  const L = (k) => GUIDE[k] || [];
  const kidsW = () => playMode() === 'kids';
  const has = (id) => (W.countAlive ? W.countAlive(id) : 0) > 0;
  const cost = (id) => (W.reg.byId.get(id) || {}).cost || 0;
  const afford = (id) => { if (W.points < cost(id) + 5) W.points = cost(id) + 5; };   // the field never runs out of points
  const tab = (t) => { const b = document.querySelector(`#ui .tray [data-tab="${t}"]`); const tr = document.querySelector('#ui .tray'); if (b && tr && tr.dataset.tab !== t) b.click(); };
  let webOn = false;
  const offWeb = bus.on('toggle:web', ({ on }) => { webOn = !!on; });
  const steps = [
    { id: 'hello', lines: L('train:hello'), modal: true },
    { id: 'points', lines: L('train:points'), before: () => { try { ctx.rig.focusOn(new THREE.Vector3(2, 1, 4), FIELD_VIEW); } catch (e) { } } },   // a closer look at the field
    { id: 'sage', lines: L('train:sage'), before: () => { tab('plants'); afford('sage'); }, wait: () => has('sage') },
    { id: 'oak', lines: L('train:oak'), before: () => { tab('plants'); afford('oak'); }, wait: () => has('oak') },
    { id: 'time', lines: L('train:time'), wait: () => W.speed >= 3 },
    { id: 'animals', lines: L('train:animals'), wait: () => (document.querySelector('#ui .tray') || {}).dataset?.tab === 'animals' || has('hyrax') },
    { id: 'hyrax', lines: L('train:hyrax'), before: () => { tab('animals'); afford('hyrax'); }, wait: () => has('hyrax') },
    { id: 'click', lines: L('train:click'), wait: () => !!(W.selected && W.selected.sp) },
    { id: 'card', lines: L('train:card') },
    { id: 'web', lines: L('train:web'), before: () => { try { ctx.select(null); } catch (e) { } }, wait: () => webOn },   // the card closes: on a small screen it covers the toolbar
    { id: 'missions', lines: L('train:missions'), before: () => { W.missionsOn = true; } },
    { id: 'bee', lines: L('train:bee'), before: () => { tab('animals'); afford('honeybee'); }, wait: () => has('honeybee') },
  ];
  let run = null, stopped = false, ending = null;
  const api = { stop() { stopped = true; offWeb(); if (run) run.stop(); if (ending) G.close(ending); }, get step() { return run ? run.step : ending ? 'end' : null; } };
  function finish(skipped) {
    markTrained();   // the islands open now (also if the child stays a little longer)
    // a breath for the mission banner, then the last words and the way out
    setTimeout(() => {
      if (stopped || ctx.disposed) return;
      ending = G.say(L(skipped ? 'train:skipped' : 'train:end'), { modal: true, place: 'center', actions: [{ id: 'go', label: kidsW() ? 'יוֹצְאִים לָאִיִּים' : 'יוצאים לאיים', kind: 'primary' }, { id: 'stay', label: kidsW() ? 'עוֹד קְצָת כָּאן' : 'עוד קצת כאן' }] });
      ending.then((r) => { ending = null; if (r === 'go' && !stopped && !ctx.disposed) { try { window.dispatchEvent(new CustomEvent('wol-trained')); } catch (e) { } onExit && onExit(); } });
    }, skipped ? 300 : 2600);
  }
  // a moment for the island to come into view before רובו־דע speaks
  setTimeout(() => {
    if (stopped || ctx.disposed) return;
    // 29.10 evening (Avi): the tutorial can be skipped; skipping opens the islands too, and the way out is offered at once
    run = runGuided({ guide: G, steps, onEnd: (r) => { run = null; offWeb(); if (r === 'done') finish(); else if (r === 'skip') finish(true); } });
  }, 1200);
  return api;
}
