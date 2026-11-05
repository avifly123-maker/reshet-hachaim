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
// The lessons' tutorials stay with רובו־דע, in his recorded voice, until קוּבִּי's lines for them are recorded (Avi, 3.11:
// recording can wait). Given `voice` (קוּבִּי's), קוּבִּי says them, and his tutorial line and a lesson line never play together.
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
  return runGuided({ guide, steps, sayOpts: voice ? { speaker: 'kubi', voice } : null, onEnd: (r) => { if (r !== 'abort') markIntro(KEY); } });
}
// 1.4.2 (Avi, 1.11: "it is not clear how one block goes inside another"): the first lesson with "חזור" shows it by hand:
// add the loop, see the glowing place inside it, put a block in, change the number, and how to go on below the loop.
export function robolabLoopTutorial({ guide, rl, force = false }) {
  const KEY = 'g:rltut:loop';
  if (!guide || !rl || !rl.state || (!force && introSeen(KEY))) return null;
  const st = () => rl.state();
  const after = L('rltut:after').slice();
  const steps = [
    { id: 'loop', lines: L('rltut:loop'), wait: () => st().loops > 0,
      before: () => { const b = document.querySelector('#ui .rl-pal .rl-blk[data-add="repeat"]'); if (b) b.scrollIntoView({ block: 'center' }); } },
    { id: 'inside', lines: L('rltut:inside'), wait: () => st().inLoop > 0 },
    { id: 'count', lines: L('rltut:count') },
    { id: 'after', lines: after, before: () => {   // ring the empty place right under the loop (the top list's last slot)
      const top = document.querySelector('#ui .rl-code .rl-list'), sl = top && [...top.children].filter((c) => c.classList.contains('rl-slot')).pop();
      if (sl && after[0]) after[0] = { ...after[0], at: sl };
    } },
  ];
  return runGuided({ guide, steps, onEnd: (r) => { if (r !== 'abort') markIntro(KEY); } });
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
  return runGuided({ guide, steps, sayOpts: voice ? { speaker: 'kubi', voice } : null, onEnd: (r) => { if (r !== 'abort') markIntro(KEY); } });
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

// 1.4.3 set 4: the workshop's missions, in two parts. In the workshop: the missions tab, a mission, its card, going
// out (ws = workshop-ui.js; it closes when the robot goes, which ends this part). In the mission: the robot is the
// child's own, a program and a run, and the way back to improve it (rl = the lab's tutState). קוּבִּי leads both.
export function wkMissionsTutorial({ guide, ws, force = false, voice = null }) {
  const KEY = 'g:wmtut';
  if (!guide || !ws || !ws.state || (!force && introSeen(KEY))) return null;
  const st = () => ws.state();
  const steps = [
    { id: 'tab', lines: L('wmtut:tab'), wait: () => st().tab === 'missions' },
    { id: 'pick', lines: L('wmtut:pick'), wait: () => !!st().mpick },
    { id: 'go', lines: L('wmtut:go'), wait: () => !!st().gone },
  ];
  return runGuided({ guide, steps, sayOpts: { speaker: 'kubi', voice }, onEnd: (r) => { if (r !== 'abort' || st().gone) markIntro(KEY); } });
}
// סדנת העיצוב (1.4.3 set 4): one part, one colour, then the surprise and the way back
export function garageTutorial({ guide, gar, force = false, voice = null }) {
  const KEY = 'g:gartut';
  if (!guide || !gar || !gar.state || (!force && introSeen(KEY))) return null;
  const st = () => gar.state();
  const see = (sel) => { const t = document.querySelector(sel); if (t) t.scrollIntoView({ block: 'nearest' }); };   // the ring needs it on screen
  let c0 = 0;
  const steps = [
    { id: 'part', lines: L('gartut:part'), before: () => { c0 = st().changes; see('.rl-garage .rl-gtile:not([disabled]):not(.on):not(.none)'); }, wait: () => !!st().picked },
    { id: 'paint', lines: L('gartut:paint'), before: () => { c0 = st().changes; see('.rl-garage .rl-gsw'); }, wait: () => st().changes > c0 },
    { id: 'end', lines: L('gartut:end') },
  ];
  return runGuided({ guide, steps, sayOpts: { speaker: 'kubi', voice }, onEnd: (r) => { if (r !== 'abort' || st().changes) markIntro(KEY); } });
}
// ארגז החול (1.4.3 set 5): one press of an arrow, the program that the driving wrote, a run of it
export function sandboxTutorial({ guide, rl, force = false, voice = null }) {
  const KEY = 'g:sbtut';
  if (!guide || !rl || !rl.state || (!force && introSeen(KEY))) return null;
  const st = () => rl.state();
  let runs0 = 0;
  const steps = [
    { id: 'drive', lines: L('sbtut:drive'), wait: () => st().drives > 0 },
    { id: 'prog', lines: L('sbtut:prog'), before: () => { runs0 = st().runs; }, wait: () => st().runs > runs0 },
    { id: 'end', lines: L('sbtut:end') },
  ];
  return runGuided({ guide, steps, sayOpts: { speaker: 'kubi', voice }, onEnd: (r) => { if (r !== 'abort' || st().drives) markIntro(KEY); } });
}
export function missionRunTutorial({ guide, rl, force = false, voice = null }) {
  const KEY = 'g:wmtut:run';
  if (!guide || !rl || !rl.state || (!force && introSeen(KEY))) return null;
  const st = () => rl.state();
  let runs0 = 0;
  const steps = [
    { id: 'robot', lines: L('wmtut:robot'), before: () => { runs0 = st().runs; }, wait: () => st().runs > runs0 },
    { id: 'end', lines: L('wmtut:end') },
  ];
  return runGuided({ guide, steps, sayOpts: { speaker: 'kubi', voice }, onEnd: (r) => { if (r !== 'abort') markIntro(KEY); } });
}

// אירוע השבוע (1.4.4 set 1): the first time the week's sheet opens. The last step waits for the child to close it.
export function weeklyTutorial({ guide, sheet, force = false }) {
  const KEY = 'g:weektut';
  if (!guide || !sheet || (!force && introSeen(KEY))) return null;
  const steps = [
    { id: 'days', lines: L('weektut:days') },
    { id: 'kinds', lines: L('weektut:kinds') },
    { id: 'guests', lines: L('weektut:guests') },
    { id: 'end', lines: L('weektut:end'), wait: () => !sheet.isConnected },
  ];
  return runGuided({ guide, steps, onEnd: (r) => { if (r !== 'abort' || !sheet.isConnected) markIntro(KEY); } });
}

// הסדנה של ניצוץ (1.4.4 set 3): ניצוץ leads these himself (speaker 'nitzotz', written only). One per place, each the
// first time the child comes there; ws.state() → { place, thing, last, mix, round } (src/workshop/index.js).
const nzRun = (KEY, guide, steps, onDone) => runGuided({ guide, steps, sayOpts: { speaker: 'nitzotz' },
  onEnd: (r) => { if (r !== 'abort') markIntro(KEY); if (onDone) onDone(r); } });
export function nzRoomTutorial({ guide, ws, force = false, onDone }) {
  const KEY = 'g:nztut';
  if (!guide || !ws || (!force && introSeen(KEY))) return null;
  return nzRun(KEY, guide, [
    { id: 'hello', lines: L('nztut:hello') },
    { id: 'board', lines: L('nztut:board') },
    { id: 'go', lines: L('nztut:go'), wait: () => ws.state().place !== 'room' },
  ], onDone);
}
export function nzMachineTutorial({ guide, ws, force = false, onDone }) {
  const KEY = 'g:nztut:mach';
  if (!guide || !ws || (!force && introSeen(KEY))) return null;
  return nzRun(KEY, guide, [
    { id: 'thing', lines: L('nzmach:thing'), wait: () => !!ws.state().thing },
    { id: 'lever', lines: L('nzmach:lever'), wait: () => !!ws.state().last },
    { id: 'rate', lines: L('nzmach:rate'), wait: () => { const l = ws.state().last; return !!(l && l.r); } },
    { id: 'end', lines: L('nzmach:end') },
  ], onDone);
}
export function nzMixerTutorial({ guide, ws, force = false, onDone }) {
  const KEY = 'g:nztut:mix';
  if (!guide || !ws || (!force && introSeen(KEY))) return null;
  return nzRun(KEY, guide, [
    { id: 'spin', lines: L('nzmix:spin'), wait: () => !!ws.state().mix },
    { id: 'pick', lines: L('nzmix:pick'), wait: () => { const m = ws.state().mix; return !!(m && m.fit); } },
    { id: 'end', lines: L('nzmix:end') },
  ], onDone);
}
export function nzCardsTutorial({ guide, ws, force = false, onDone }) {
  const KEY = 'g:nztut:card';
  if (!guide || !ws || (!force && introSeen(KEY))) return null;
  return nzRun(KEY, guide, [
    { id: 'draw', lines: L('nzcard:draw'), wait: () => !!ws.state().round },
    { id: 'end', lines: L('nzcard:end') },
  ], onDone);
}
export function nzBuildTutorial({ guide, ws, force = false, onDone }) {
  const KEY = 'g:nztut:build';
  if (!guide || !ws || (!force && introSeen(KEY))) return null;
  return nzRun(KEY, guide, [
    { id: 'pick', lines: L('nzbuild:pick'), wait: () => { const b = ws.state().bench; return !!(b && b.proto.add.length); } },
    { id: 'go', lines: L('nzbuild:go'), wait: () => ws.state().place !== 'build' },
  ], onDone);
}
export function nzTestTutorial({ guide, ws, force = false, onDone }) {
  const KEY = 'g:nztut:test';
  if (!guide || !ws || (!force && introSeen(KEY))) return null;
  return nzRun(KEY, guide, [
    { id: 'run', lines: L('nztest:run'), wait: () => { const b = ws.state().bench; return !!(b && Object.keys(b.last).length); } },
    { id: 'end', lines: L('nztest:end') },
  ], onDone);
}
export function nzOrdersTutorial({ guide, ws, force = false, onDone }) {
  const KEY = 'g:nztut:ord';
  if (!guide || !ws || (!force && introSeen(KEY))) return null;
  return nzRun(KEY, guide, [
    { id: 'pick', lines: L('nzord:pick'), wait: () => { const s = ws.state(); return !!(s.office && s.office.ticket) || s.place !== 'orders'; } },
  ], onDone);
}

// אירוע השבוע: התקלה במעבדה והצנצנת (1.4.4 sets 5–6). קוּבִּי leads them in writing (no voice: kw.* lines).
const kwRun = (KEY, guide, steps) => runGuided({ guide, steps, sayOpts: { speaker: 'kubi' }, onEnd: (r) => { if (r !== 'abort') markIntro(KEY); } });
export function glitchTutorial({ guide, ev, force = false }) {
  const KEY = 'g:wk:glitch';
  if (!guide || !ev || (!force && introSeen(KEY))) return null;
  return kwRun(KEY, guide, [
    { id: 'oops', lines: L('gltut:oops') },
    { id: 'pick', lines: L('gltut:pick'), wait: () => ev.state().picks > 0 || ev.state().sent > 0 },
    { id: 'gate', lines: L('gltut:gate'), wait: () => ev.state().sent > 0 },
  ]);
}
export function jarTutorial({ guide, ev, force = false }) {
  const KEY = 'g:wk:jar';
  if (!guide || !ev || (!force && introSeen(KEY))) return null;
  return kwRun(KEY, guide, [
    { id: 'jar', lines: L('jartut:jar') },
    { id: 'pick', lines: L('jartut:pick'), wait: () => ev.state().picks >= 2 },
    { id: 'seal', lines: L('jartut:seal'), wait: () => ev.state().sealed },
  ]);
}
// הבלש של השבוע ומירוץ הרובוטים (1.4.4 set 7)
export function detectiveTutorial({ guide, ev, force = false }) {
  const KEY = 'g:wk:det';
  if (!guide || !ev || (!force && introSeen(KEY))) return null;
  return kwRun(KEY, guide, [
    { id: 'board', lines: L('dettut:board') },
    { id: 'clue', lines: L('dettut:clue'), wait: () => ev.state().clicks > 0 },
    { id: 'guess', lines: L('dettut:guess'), wait: () => !!ev.state().hyp },
    { id: 'end', lines: L('dettut:end') },
  ]);
}
export function raceTutorial({ guide, ev, force = false }) {
  const KEY = 'g:wk:race';
  if (!guide || !ev || (!force && introSeen(KEY))) return null;
  return kwRun(KEY, guide, [
    { id: 'race', lines: L('ractut:race') },
    { id: 'robot', lines: L('ractut:robot'), wait: () => ev.state().picks > 0 },
    { id: 'prog', lines: L('ractut:prog'), wait: () => ev.state().blocks > 0 },
    { id: 'run', lines: L('ractut:run'), wait: () => ev.state().runs > 0 },
  ]);
}
