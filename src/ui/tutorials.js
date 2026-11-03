// The first-visit tutorials of the lab and the learning hub (1.3.3, the refresh of 29.10; Avi: "a guided part also when
// the lab and the cards open"). Hands-on: רובו־דע asks for one action at a time and waits for it (src/ui/guided.js).
// Shown once per player (journey intro keys 'g:labtut' / 'g:hubtut'); "לדלג על ההדרכה" ends one for good.
//   labTutorial({ guide, lab })   lab.state() → { open, station, turned }   (src/lab/lab.js)
//   hubTutorial({ guide, hub })   hub.state() → { open, screen, packs, zoom, owned } (src/learn/hub/index.js)
// Each returns the run ({ stop, step }) or null when it was seen already. Words: src/data/guide/tutorials.js.
import { runGuided } from './guided.js';
import { GUIDE } from '../data/guide-lines.js';
import { introSeen, markIntro } from '../core/journey.js';

const L = (k) => GUIDE[k] || [];

export function labTutorial({ guide, lab, force = false }) {
  const KEY = 'g:labtut';
  if (!guide || !lab || !lab.state || (!force && introSeen(KEY))) return null;
  const st = () => lab.state();
  const steps = [
    { id: 'hello', lines: L('labtut:hello') },
    { id: 'turn', lines: L('labtut:turn'), wait: () => st().turned || st().station !== 'home' },
    { id: 'end', lines: L('labtut:end') },   // the "?" button and the stations that open later
    { id: 'dot', lines: L('labtut:dot'), wait: () => st().station !== 'home' },   // then the station's own words take over
  ];
  return runGuided({ guide, steps, onEnd: (r) => { if (r !== 'abort') markIntro(KEY); } });
}

export function hubTutorial({ guide, hub, force = false }) {
  const KEY = 'g:hubtut';
  if (!guide || !hub || !hub.state || (!force && introSeen(KEY))) return null;
  const st = () => hub.state();
  let hadPacks = 0, opened = false;
  const steps = [
    { id: 'hello', lines: L('hubtut:hello'), modal: true },
    { id: 'album', lines: L('hubtut:album'), wait: () => st().screen === 'album' },
    { id: 'pack', lines: L('hubtut:pack'), before: () => { hadPacks = st().packs || 0; },
      wait: () => { const s = st(); if (s.screen === 'pack') opened = true; return !hadPacks || opened || (s.packs || 0) < hadPacks; } },
    { id: 'zoom', lines: L('hubtut:zoom'), wait: () => st().zoom || !st().owned },   // no card yet: nothing to look at
    { id: 'home', lines: L('hubtut:home'), wait: () => st().screen === 'home' },
    { id: 'end', lines: L('hubtut:end') },
  ];
  return runGuided({ guide, steps, onEnd: (r) => { if (r !== 'abort') { markIntro(KEY); markIntro('g:learn'); } } });
}

// מעבדת הרובוטים (1.4.1): the first lesson teaches the editor and the run; the first lesson with an event block teaches
// the event (a hat that waits for its moment). rl.state() → { level, blocks, runs, hats } (src/robolab/index.js).
// 1.4.3: קוּבִּי leads the robot lab's tutorials (his lab); his voice object is shared with his lesson lines, so his
// tutorial line and a lesson line never play together
export function robolabTutorial({ guide, rl, force = false, voice = null }) {
  const KEY = 'g:rltut';
  if (!guide || !rl || !rl.state || (!force && introSeen(KEY))) return null;
  const st = () => rl.state();
  let runs0 = 0;
  const steps = [
    { id: 'hello', lines: L('rltut:hello') },
    { id: 'block', lines: L('rltut:block'), wait: () => st().blocks > 0 },
    { id: 'program', lines: L('rltut:program') },
    { id: 'run', lines: L('rltut:run'), before: () => { runs0 = st().runs; }, wait: () => st().runs > runs0 },
    { id: 'end', lines: L('rltut:end') },
  ];
  return runGuided({ guide, steps, sayOpts: { speaker: 'kubi', voice }, onEnd: (r) => { if (r !== 'abort') markIntro(KEY); } });
}
export function robolabEventTutorial({ guide, rl, force = false, voice = null }) {
  const KEY = 'g:rltut:ev';
  if (!guide || !rl || !rl.state || (!force && introSeen(KEY))) return null;
  const st = () => rl.state();
  const steps = [
    { id: 'ev', lines: L('rltut:ev'), wait: () => st().hats > 0,   // the event blocks sit low in the palette: bring them into view
      before: () => { const b = document.querySelector('#ui .rl-pal .rl-blk.f-event'); if (b) b.scrollIntoView({ block: 'center' }); } },
    { id: 'evbody', lines: L('rltut:evbody') },
  ];
  return runGuided({ guide, steps, sayOpts: { speaker: 'kubi', voice }, onEnd: (r) => { if (r !== 'abort') markIntro(KEY); } });
}

// 1.4.3: סדנת הרובוט, the first visit: a ready robot, a part's card and the numbers, a run on the test track.
// ws = the workshop (src/robolab/workshop-ui.js): its state() tells what the child did.
// קוּבִּי leads it (Avi, 3.11: the workshop is in his lab), in his voice when the lines are recorded
export function workshopTutorial({ guide, ws, force = false, onDone, voice = null }) {
  const KEY = 'g:wktut';
  if (!guide || !ws || !ws.state || (!force && introSeen(KEY))) return null;
  const st = () => ws.state();
  let tests0 = 0;
  const steps = [
    { id: 'hello', lines: L('wktut:hello') },
    { id: 'ready', lines: L('wktut:ready'), before: () => ws.show('garage'), wait: () => st().robots > 0 },
    { id: 'part', lines: L('wktut:part'), before: () => ws.show('parts'), wait: () => !!st().picked },
    { id: 'card', lines: L('wktut:card') },
    { id: 'track', lines: L('wktut:track'), before: () => { tests0 = st().tests; }, wait: () => st().tests > tests0 },
    { id: 'end', lines: L('wktut:end') },
  ];
  return runGuided({ guide, steps, sayOpts: { speaker: 'kubi', voice }, onEnd: (r) => { if (r !== 'abort') markIntro(KEY); if (onDone) onDone(r); } });
}
