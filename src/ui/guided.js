// Guided steps (1.3.3): רובו־דע leads the child through a short list of steps, one bubble at a time, and rings the thing
// to press. The engine of every hands-on tutorial: the training field (src/game/training.js), the first visit to the lab
// (src/lab/tutorial.js) and to the learning hub (src/learn/hub/tutorial.js). Built like the research tutorial
// (src/research/tutorial.js): a step that waits for the child's own action never locks anything else, and a step the
// child already did on their own is passed over.
//
//   const run = runGuided({ guide, steps, onEnd, skipLabel, every })
//   steps: [{ id, lines: [{ id, f, k, at?, expr? }], wait?: () => bool, modal?, place?, before?: () => void }]
//     - a step without `wait` shows its lines with "הבא" and moves on when the last one is read
//     - a step with `wait` shows its lines (the last one stays, with a quiet "לדלג על ההדרכה" button) until wait() is
//       true; wait() is asked every `every` ms (default 300), and also before the step is shown
//     - before(): runs once when the step begins (open a panel, set something up)
//   noSkip: true (the training field): a waiting step offers "הבנתי" (the bubble steps aside for a while) instead of
//     "לדלג על ההדרכה": the field is the way into the game, so it is not skipped
//   onEnd(result): 'done' (every step), 'skip' (the child pressed "לדלג על ההדרכה"; "דלג" and Escape only skip one step's words), 'abort' (the screen closed)
//   run.stop()   ends it from outside (the screen closes): onEnd('abort')
//   run.step     the current step's id (tests)
// The words are in src/data/guide/tutorials.js (checked by tools/validate-guide.mjs, voiced by tools/voice/make.py).
import { playMode } from '../core/journey.js';

const LATER_MS = 15000;   // noSkip: "הבנתי" hides a waiting step's bubble for this long

export function runGuided({ guide, steps, onEnd, skipLabel, noSkip = false, every = 300 }) {
  let i = -1, over = false, pending = null, poll = 0;
  const run = { step: null, stop: () => end('abort') };
  const skipText = () => skipLabel || (playMode() === 'kids' ? 'לְדַלֵּג עַל הַהַדְרָכָה' : 'לדלג על ההדרכה');

  function end(result) {
    if (over) return; over = true; clearInterval(poll); poll = 0;
    if (pending) { const p = pending; pending = null; try { guide.close(p); } catch (e) { } }
    run.step = null;
    try { onEnd && onEnd(result); } catch (e) { console.error(e); }
  }
  function next() {
    if (over) return;
    clearInterval(poll); poll = 0;
    i++;
    const st = steps[i];
    if (!st) { end('done'); return; }
    run.step = st.id;
    try { st.before && st.before(); } catch (e) { console.error(e); }
    let ok = false; try { ok = !!(st.wait && st.wait()); } catch (e) { }
    if (ok) { next(); return; }   // done on their own already: on to the next one
    const opts = { modal: !!st.modal, place: st.place || (st.modal ? 'center' : 'corner') };
    if (st.wait) opts.actions = noSkip ? [{ id: 'later', label: playMode() === 'kids' ? 'הָבַנְתִּי' : 'הבנתי', kind: 'quiet' }] : [{ id: 'skipall', label: skipText(), kind: 'quiet' }];
    show(st, st.lines, opts);
    if (st.wait) {
      poll = setInterval(() => {
        if (over) { clearInterval(poll); return; }
        let done = false; try { done = !!st.wait(); } catch (e) { }
        if (!done) return;
        clearInterval(poll); poll = 0;
        const q = pending; pending = null;
        if (q) { try { guide.close(q); } catch (e) { } }
        setTimeout(next, 350);   // a breath: the child sees what happened before the next bubble
      }, every);
    }
  }
  // One bubble set. Only "לדלג על ההדרכה" ends the whole run; "דלג" or Escape skips this step's words: a step that
  // waits for the child keeps its last line on the screen (otherwise the child would not know what is asked).
  function show(st, lines, opts) {
    const p = guide.say(lines, opts);
    pending = p;
    p.then((r) => {
      if (pending !== p || over) return;   // closed by us (the action was done) or the run ended
      pending = null;
      if (r === 'abort') { end('abort'); return; }
      if (r === 'skipall') { end('skip'); return; }
      if (!st.wait) { next(); return; }
      // "הבנתי" (noSkip): the bubble steps aside, and comes back after a while if the step is still not done
      const again = r === 'later' ? LATER_MS : 200;
      if (r !== 'none' && steps[i] === st) setTimeout(() => { if (!over && steps[i] === st && !pending) show(st, lines.slice(-1), opts); }, again);
    });
  }
  setTimeout(next, 0);
  return run;
}
