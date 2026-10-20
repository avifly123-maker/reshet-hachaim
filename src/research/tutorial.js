// חוקרי הטבע – the guided mystery: רובו־דע leads a first-time child through the five steps of a researcher, one
// sentence at a time, and lights up the next button. It never locks anything: each step waits for its own sign (the
// camera was placed, a hypothesis was chosen...) and steps the child already did on their own are passed over.
// Shown once (web-of-life-howto 'rs-tutorial'), and again from the research centre's "הדרכה" button.
// Texts: TUTORIAL in explain-data.js (vocalised; validate-research checks them).

// each step: the text key, what to light up, and when it is done. `manual` steps wait for "הבא".
const STEPS = [
  { id: 'hello', hi: '.rs-intro .rs-go', done: (s) => s.introClosed },
  { id: 'bar', hi: '.rs-steps ol', manual: true },
  { id: 'measure', hi: '.rs-tool[data-tool="nightcam"]', done: (s) => s.placed.has('nightcam') },
  { id: 'night', hi: '.rs-note [data-act="tonight"]', done: (s) => s.known.has('mice') },
  { id: 'board', hi: '.rs-board', manual: true },
  { id: 'notebook', hi: '.rs-lab', done: (s) => (s.nbOpen && s.known.size > 0) || !!s.guess },
  { id: 'hypTab', hi: '.nb-tab[data-tab="hyp"]', done: (s) => (s.nbTab === 'hyp' && s.known.size > 0) || !!s.guess },
  { id: 'hyp', hi: '.nb-hyps', done: (s) => !!s.guess },
  { id: 'close', hi: '.rs-nbm .rs-x', done: (s) => !!s.guess && !s.modal },
  { id: 'idea', hi: '.rs-ideas', done: (s) => s.acts > 0 },
  { id: 'see', hi: '.rs-see', done: (s) => s.ff || s.runs > 0 },
  { id: 'wait', hi: null, done: (s) => s.runs > 0 },
  { id: 'concl', hi: '.rs-concl .cc-verdict', done: (s) => s.runs > 0 && !s.conclOpen },
  { id: 'end', end: true },
];

export function createTutorial({ R, T, texts, state, onEnd }) {
  const pressed = new Set();
  let cur = null, over = false, t = 0;
  function tick(dt) {
    if (over) return;
    t -= Math.max(dt || 0, 0.05); if (t > 0) return; t = 0.2;   // also on a slow machine, where frames are far apart
    const s = state();
    // the step after the furthest one done: a child who goes ahead on their own is followed, never sent back
    let last = -1;
    for (let k = 0; k < STEPS.length - 1; k++) if (STEPS[k].manual ? pressed.has(STEPS[k].id) : STEPS[k].done(s)) last = k;
    const i = Math.min(STEPS.length - 1, last + 1);
    const st = STEPS[i];
    const key = st.end ? (s.lastHeals ? 'endOk' : 'endTry') : st.id;
    // a step inside a window (the notebook, the conclusion) speaks from the bottom, so it never covers the window's top
    // (so does a step whose button sits in a note at the top: on a small screen the bubble would cover that button)
    const low = !!s.modal || /rs-note/.test(st.hi || '');
    if (key !== cur || low !== R._tutLow) {
      cur = key; R._tutLow = low;
      const buttons = st.manual ? [{ id: 'next', label: T('tutNext'), primary: true }] : st.end ? [{ id: 'done', label: T('tutDone'), primary: true }] : [];
      buttons.push(...(st.end ? [] : [{ id: 'skip', label: T('tutSkip') }]));
      R.say(texts[key], { sticky: true, tut: true, low, buttons, on: { next: () => { pressed.add(st.id); t = 0; }, done: end, skip: end } });
    }
    R.hi(st.hi || null);
  }
  function end() { if (over) return; over = true; R.hi(null); R.hideSay(); if (onEnd) onEnd(); }
  return { tick, end, get over() { return over; }, get step() { return cur; } };
}
