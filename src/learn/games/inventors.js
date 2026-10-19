import { genderOf } from '../../data/common.js';
import { PROBLEMS, TRAIT as TRAIT0, TRAITS, traitsOf, SAY as SAY0, TRIALS as TRIALS0, THEMES as THEMES0, WILD as WILD0, problemNeeds } from '../../data/inventions.js';
import { PROBLEMS_K, TRAIT_K, THEMES_K, WILD_K, SAY_K, TRIALS_K, INV_UI_K, nameK } from '../../data/inventions-kids.js';   // the beginners' words (ניקוד מלא)
import { invent, markSolved } from '../../lab/progress.js';
import { TORAH } from '../../core/edition.js';
import { grantSource } from '../../core/sources-store.js';
// "הממציאים" – a sandbox of inventions for the learning hub and the lab of רובו־דע (single player).
// Two workshops:
//  · בעיות להמציא – a real problem people solved by learning from a creature. The child puts one or two of
//    their own cards on the workbench and runs the test. Every card brings traits (src/data/inventions.js):
//    the right trait solves it, a near one half solves it, anything else flops in a funny way. There is no
//    single path: try, fail, try again. A solved problem shows what really happened (docs/sources.md).
//  · סדנת הרובוטים – build a robot from one body card and two traits from other cards, and test it on five
//    trials (water race, night search, climbing, carrying, hide-and-seek). Pure fun and surprise.
// Prizes are badges (ctx.badge): inv:first, inv:five, inv:ten, inv:many (25), inv:all, inv:stubborn (10 failed
// tries), inv:wild, inv:pair (the first combination of two traits), inv:theme:<theme> (every problem on a shelf).
// The shark-skin problem also gives the lab's invention (the faster reef survey robot) and, in the torah
// edition, the source card "שאל נא בהמות ותורך".
// The problems sit on themed shelves (THEMES). Some need two traits from two cards (a combination): one of the
// two gives a "part" result that says what the test showed and what is still missing. Two cards whose traits
// make a funny pair (WILD) give an odd result. Hints come in two steps: a question, then the cards marked.
// When a child has no card with a needed trait, the lab lends the creature (marked "מושאל").
// Solved problems are mirrored into the lab's progress (markSolved) for the research questions of the atlas.
//
// export function mountInventors(root, ctx, opts) → { destroy() }   (opts.view: 'problems' | 'robots', opts.problem: an id)
// Debug hook: window.__ivDebug = { state(), pick(problemId), theme(id), put(cardId), clear(), test(), view(v), robot(body, a, b), run(), hand() }

const CSS_ID = 'wl-inventors-css';
const sv = (body) => `<svg class="wl-ic" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
const I = {
  drop: sv('<path d="M12 2.6C8.2 8 5.6 11.4 5.6 14.7a6.4 6.4 0 0 0 12.8 0C18.4 11.4 15.8 8 12 2.6z" fill="currentColor"/>'),
  wind: sv('<path d="M3 8.5h11.5a3 3 0 1 0-3-3M3 12.5h15a3 3 0 1 1-3 3M3 16.5h7" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/>'),
  drone: sv('<rect x="8" y="10" width="8" height="5" rx="2" fill="currentColor"/><path d="M4 8h6M14 8h6M7 8v2M17 8v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M10 15l-2 4M14 15l2 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
  shield: sv('<path d="M12 2.8l7.5 3v6c0 4.6-3.2 8.2-7.5 9.4-4.3-1.2-7.5-4.8-7.5-9.4v-6z" fill="currentColor"/>'),
  leaf: sv('<path d="M4.5 19.5C3.6 11 9 4 20.5 3.6 20.8 14.8 13.6 20.4 4.5 19.5z" fill="currentColor"/>'),
  sparkle: sv('<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6l-5.4 2.9 1.2-6-4.5-4.2 6.1-.7z" fill="currentColor"/>'),
  hand: sv('<path d="M7 12V6.5a1.5 1.5 0 0 1 3 0V11V4.5a1.5 1.5 0 0 1 3 0V11V5.5a1.5 1.5 0 0 1 3 0V12V8.5a1.5 1.5 0 0 1 3 0V14c0 4-2.8 7-7 7-3.3 0-5-1.6-6.4-4l-2.2-3.8a1.5 1.5 0 0 1 2.6-1.5L7 13.5z" fill="currentColor"/>'),
  feather: sv('<path d="M20 4C12 4 6.5 9.5 6 17l-2 3.5M6 17c6-.5 11-5 14-13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M9.5 14.5c3-.4 6-2.5 8-6" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>'),
  hexa: sv('<path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z" fill="currentColor"/><path d="M12 8l3.5 2v4L12 16l-3.5-2v-4z" fill="#fff" fill-opacity=".45"/>'),
  bulb: sv('<path d="M12 2.8a6.6 6.6 0 0 0-3.8 12c.8.6 1.3 1.4 1.3 2.3h5c0-.9.5-1.7 1.3-2.3A6.6 6.6 0 0 0 12 2.8z" fill="currentColor"/><path d="M9.6 19.4h4.8M10.4 21.6h3.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
  wave: sv('<path d="M2.5 9c2.5-2.5 4.5-2.5 7 0s4.5 2.5 7 0 4.5-2.5 5 0M2.5 15c2.5-2.5 4.5-2.5 7 0s4.5 2.5 7 0 4.5-2.5 5 0" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/>'),
  eye: sv('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" fill="currentColor"/><circle cx="12" cy="12" r="3.2" fill="#fff"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>'),
  moon: sv('<path d="M15.5 3.5a8.5 8.5 0 1 0 5 13.5A7 7 0 0 1 15.5 3.5z" fill="currentColor"/>'),
  tree: sv('<path d="M12 3C8 3 5 5.8 5 9.3S8 15 12 15s7-2.2 7-5.7S16 3 12 3z" fill="currentColor"/><path d="M12 13v8M9 21h6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
  box: sv('<path d="M3.5 8L12 4l8.5 4v8.5L12 20.5l-8.5-4z" fill="currentColor"/><path d="M3.5 8L12 12l8.5-4M12 12v8.5" stroke="#fff" stroke-opacity=".5" stroke-width="1.4" fill="none"/>'),
  check: sv('<path d="M4.5 12.5l4.8 4.8L19.5 7" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  flask: sv('<path d="M9.5 3h5M10.5 3v6L5 18.5A1.8 1.8 0 0 0 6.6 21h10.8a1.8 1.8 0 0 0 1.6-2.5L13.5 9V3" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/><path d="M7.4 15h9.2l2.1 3.6a1 1 0 0 1-.9 1.4H6.2a1 1 0 0 1-.9-1.4z" fill="currentColor"/>'),
  gear: sv('<circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M5.5 18.5l2.1-2.1M16.4 7.6l2.1-2.1" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
  bulbHint: sv('<path d="M12 2.8a6.6 6.6 0 0 0-3.8 12c.8.6 1.3 1.4 1.3 2.3h5c0-.9.5-1.7 1.3-2.3A6.6 6.6 0 0 0 12 2.8z" fill="currentColor"/><path d="M9.6 19.4h4.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
  sun: sv('<circle cx="12" cy="12" r="4.6" fill="currentColor"/><path d="M12 2.6v2.6M12 18.8v2.6M2.6 12h2.6M18.8 12h2.6M5.4 5.4l1.8 1.8M16.8 16.8l1.8 1.8M5.4 18.6l1.8-1.8M16.8 7.2l1.8-1.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  pill: sv('<g transform="rotate(-40 12 12)"><rect x="3.5" y="8" width="17" height="8" rx="4" fill="currentColor"/><path d="M12 8.2v7.6" stroke="#fff" stroke-opacity=".55" stroke-width="1.6"/></g>'),
  net: sv('<path d="M5 8L12 4l7 4.5-3 9H8zM12 4l4 13.5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/><circle cx="5" cy="8" r="2.3" fill="currentColor"/><circle cx="12" cy="4" r="2.3" fill="currentColor"/><circle cx="19" cy="8.5" r="2.3" fill="currentColor"/><circle cx="16" cy="17.5" r="2.3" fill="currentColor"/><circle cx="8" cy="17.5" r="2.3" fill="currentColor"/>'),
  spiral: sv('<path d="M12 12.5a1.6 1.6 0 1 1 1.6-1.6 3.4 3.4 0 1 1-3.4-3.4 5.4 5.4 0 1 1-5.2 6.8M5 14.3L3 21" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>'),
  jump: sv('<path d="M3.5 19.5Q8 4 14 8.5t6.5 10" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-dasharray="3 3"/><circle cx="14" cy="7.5" r="3" fill="currentColor"/><path d="M3 20.5h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  claw: sv('<path d="M12 3v6M7.5 4.5q-2 5 1.5 8.5M16.5 4.5q2 5-1.5 8.5" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M8 13h8l-1.5 7h-5z" fill="currentColor"/>'),
  back: sv('<path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  undo: sv('<path d="M8 7L4 11l4 4" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 11H14a5 5 0 0 1 0 10h-3" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/>'),
};
// the robot's face on the radio: a visor with eyes that change with the result
const FACE = {
  happy: '<path d="M8 13q2-3 4 0M14.5 13q2-3 4 0" stroke="#7ff0ff" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
  wow: '<circle cx="10" cy="12.5" r="2.4" fill="#7ff0ff"/><circle cx="16.5" cy="12.5" r="2.4" fill="#7ff0ff"/>',
  oops: '<path d="M7.8 12.5h4.4M14.3 12.5h4.4" stroke="#7ff0ff" stroke-width="2.4" stroke-linecap="round"/><path d="M11 17q2.2-1.4 4.4 0" stroke="#7ff0ff" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
  think: '<circle cx="10" cy="12" r="1.8" fill="#7ff0ff"/><path d="M14.4 12.6h4.2" stroke="#7ff0ff" stroke-width="2.2" stroke-linecap="round"/>',
};
const face = (e) => `<svg class="iv-face" viewBox="0 0 26 26" aria-hidden="true"><rect x="2" y="4" width="22" height="18" rx="7" fill="#e9eef2"/><rect x="4.5" y="7" width="17" height="11.5" rx="5" fill="#1d2b36"/>${FACE[e] || FACE.happy}<circle cx="13" cy="3" r="1.6" fill="#3fa9c9"/></svg>`;
const GI = { m: 0, f: 1, mp: 2, fp: 3 };
const WATER_P = new Set(['swim', 'sting', 'robotswim', 'glide']);
const LAND_P = new Set(['quiet', 'hover', 'roof', 'panel', 'cloth', 'wing']);

function injectCss() {
  if (document.getElementById(CSS_ID)) return;
  const st = document.createElement('style'); st.id = CSS_ID;
  // scoped like the hub's own CSS (#wol-learn.wol-learn), so the hub's card rules do not win over ours
  st.textContent = (`
.wol-learn .iv{position:relative;display:flex;flex-direction:column;gap:.6em;padding:0 1.4em .6em;height:100%;width:100%;box-sizing:border-box;--wood:#7a5232;--brass:#d8a640;--paper:#f3ead0;--ink:#2a2014}
.wol-learn .iv-top{display:flex;align-items:center;gap:.8em;flex-wrap:wrap}
.wol-learn .iv-tabs{display:flex;gap:.4em;padding:.3em;border-radius:1em;background:rgba(10,20,14,.45)}
.wol-learn .iv-tabs button{display:flex;align-items:center;gap:.45em;padding:.5em 1.1em;border-radius:.8em;color:#e8e2c4;font-weight:800}
.wol-learn .iv-tabs button.on{background:linear-gradient(180deg,#f6edcf,#e2d3a6);color:var(--ink)}
.wol-learn .iv-tabs .wl-ic{width:1.3em;height:1.3em}
.wol-learn .iv-score{margin-inline-start:auto;display:flex;align-items:center;gap:.5em;font-weight:800;color:#f6cf72}
.wol-learn .iv-score .wl-ic{width:1.3em;height:1.3em}
.wol-learn .iv-main{display:grid;grid-template-columns:minmax(12em,15em) 1fr;gap:1em;flex:1 1 auto;min-height:0}
.wol-learn .iv-plist{display:flex;flex-direction:column;gap:.35em;overflow:auto;min-height:0;padding:.2em}
.wol-learn .iv-pbtn{display:flex;align-items:center;gap:.55em;padding:.55em .7em;border-radius:.7em;text-align:right;background:rgba(246,240,220,.08);color:#ece5c8;font-weight:700;line-height:1.2;min-height:2.6em}
.wol-learn .iv-pbtn .wl-ic{width:1.4em;height:1.4em;flex:none;color:#f6cf72}
.wol-learn .iv-pbtn.on{background:linear-gradient(180deg,#f6edcf,#e2d3a6);color:var(--ink)}
.wol-learn .iv-pbtn.on .wl-ic{color:#8a5a12}
.wol-learn .iv-pbtn.done::after{content:"";margin-inline-start:auto;width:.9em;height:.9em;border-radius:50%;background:#7cc45a;box-shadow:0 0 0 .18em rgba(124,196,90,.35)}
.wol-learn .iv-bench{position:relative;display:flex;flex-direction:column;gap:.7em;padding:1em 1.2em;border-radius:1.1em;overflow:auto;min-height:0;background:
  linear-gradient(180deg,rgba(255,255,255,.05),rgba(0,0,0,.18)),repeating-linear-gradient(90deg,#7a5232 0 3.2em,#6f4a2d 3.2em 3.3em);box-shadow:inset 0 .25em 0 rgba(255,255,255,.12),0 .8em 1.6em rgba(0,0,0,.45)}
.wol-learn .iv-plan{position:relative;padding:.8em 1.1em;border-radius:.6em;color:#eaf3fb;background:
  linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px) 0 0/1.2em 1.2em,linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px) 0 0/1.2em 1.2em,#22507a;box-shadow:0 .3em .6em rgba(0,0,0,.35)}
.wol-learn .iv-plan h3{margin:0 0 .2em;font-family:var(--serif);font-size:1.45em;display:flex;align-items:center;gap:.4em}
.wol-learn .iv-plan h3 .wl-ic{width:1.2em;height:1.2em;color:#f6cf72}
.wol-learn .iv-plan p{margin:0;opacity:.92}
.wol-learn .iv-row{display:flex;align-items:stretch;gap:.9em;flex-wrap:wrap;justify-content:center}
.wol-learn .iv-slot{--cw:min(8.6em,15vh);position:relative;width:var(--cw);min-height:calc(var(--cw) * 1.42);border-radius:.8em;border:.18em dashed rgba(246,240,220,.45);display:grid;place-items:center;color:rgba(246,240,220,.7);font-weight:700;text-align:center;padding:.3em;cursor:pointer;background:rgba(0,0,0,.15)}
.wol-learn .iv-slot .wl-card{--cw:min(8.6em,15vh);cursor:pointer}
.wol-learn .iv-plus{align-self:center;font-family:var(--serif);font-size:1.3em;font-weight:800;color:#f6cf72}
.wol-learn .iv-go{align-self:center;display:flex;flex-direction:column;align-items:center;gap:.4em}
.wol-learn .iv-test{display:flex;align-items:center;gap:.5em;padding:.75em 1.5em;border-radius:999px;font-weight:900;font-size:1.15em;color:#2a1a06;background:linear-gradient(180deg,#ffe08a,#e8a43a);box-shadow:0 .25em 0 #9c6519,0 .6em 1.2em rgba(0,0,0,.4)}
.wol-learn .iv-test:disabled{filter:grayscale(1) brightness(.75);cursor:default}
.wol-learn .iv-test .wl-ic{width:1.3em;height:1.3em}
.wol-learn .iv-hintb{display:flex;align-items:center;gap:.3em;color:#f6e7b8;font-weight:700;font-size:.9em;padding:.3em .8em;border-radius:999px;background:rgba(0,0,0,.25)}
.wol-learn .iv-hintb .wl-ic{width:1.1em;height:1.1em}
.wol-learn .iv-gauge{position:relative;width:min(16em,60vw);height:1.1em;border-radius:999px;background:rgba(0,0,0,.35);overflow:hidden;box-shadow:inset 0 .15em .3em rgba(0,0,0,.5)}
.wol-learn .iv-gauge i{position:absolute;inset:0 auto 0 0;width:0;border-radius:999px;background:linear-gradient(90deg,#e05a3a,#f2c94c 50%,#5fc35a);transition:width 1.2s cubic-bezier(.3,.9,.3,1)}
.wol-learn .iv-radio{display:flex;align-items:flex-start;gap:.7em;padding:.7em .9em;border-radius:.9em;background:#22303b;color:#e7f4f9;box-shadow:inset 0 0 0 1px rgba(127,240,255,.25);min-height:3.2em}
.wol-learn .iv-face{width:2.8em;height:2.8em;flex:none}
.wol-learn .iv-radio p{margin:0;line-height:1.45}
.wol-learn .iv-radio b{color:#7ff0ff}
.wol-learn .iv-fact{padding:.7em 1em;border-radius:.8em;background:var(--paper);color:var(--ink);box-shadow:0 .3em .7em rgba(0,0,0,.3);animation:iv-pop .5s both}
.wol-learn .iv-fact h4{margin:0 0 .2em;font-family:var(--serif);color:#2f6a3a;display:flex;align-items:center;gap:.4em}
.wol-learn .iv-fact h4 .wl-ic{width:1.1em;height:1.1em}
.wol-learn .iv-fact p{margin:0;line-height:1.5}
.wol-learn .iv-handbar{display:flex;align-items:center;gap:.5em;flex-wrap:wrap}
.wol-learn .iv-handbar .iv-f{padding:.35em .9em;border-radius:999px;background:rgba(246,240,220,.1);color:#e8e2c4;font-weight:700}
.wol-learn .iv-handbar .iv-f.on{background:#f6edcf;color:var(--ink)}
.wol-learn .iv-handbar small{color:#cfc6a8}
.wol-learn .iv-hand{flex:none;display:flex;gap:.7em;overflow-x:auto;overflow-y:hidden;padding:.4em .2em .5em;scroll-snap-type:x proximity}
.wol-learn .iv-hc{display:flex;flex-direction:column;align-items:center;gap:.3em;scroll-snap-align:start;flex:none}
.wol-learn .iv-hc .wl-card{--cw:min(7em,12.5vh);cursor:pointer;transition:transform .2s}
.wol-learn .iv-hc .wl-card:hover{transform:translateY(-.4em)}
.wol-learn .iv-hc.used .wl-card{opacity:.35;filter:grayscale(.8)}
.wol-learn .iv-hc.hint .wl-card{box-shadow:0 0 0 .25em #f6cf72,0 0 1.2em #f6cf72}
.wol-learn .iv-tr{display:flex;flex-wrap:wrap;gap:.2em;justify-content:center;max-width:min(7.6em,14vh)}
.wol-learn .iv-tr i{font-style:normal;font-size:.72em;padding:.1em .45em;border-radius:999px;background:rgba(246,240,220,.14);color:#efe6c4;white-space:nowrap}
.wol-learn .iv-tr i.k{background:#f6cf72;color:#3a2608}
.wol-learn .iv-lent{color:#f6cf72;font-weight:700}
/* the shelves: themes, then the problems of the chosen theme */
.wol-learn .iv-side{display:flex;flex-direction:column;gap:.4em;min-height:0}
.wol-learn .iv-themes{display:grid;grid-template-columns:repeat(4,1fr);gap:.25em;flex:none}
.wol-learn .iv-th{position:relative;display:flex;flex-direction:column;align-items:center;gap:.1em;padding:.3em .1em .25em;border-radius:.6em;background:rgba(246,240,220,.08);color:#e8e2c4;font-weight:700;font-size:.74em;line-height:1.1;min-height:2.9em}
.wol-learn .iv-th .wl-ic{width:1.5em;height:1.5em;color:#f6cf72}
.wol-learn .iv-th.on{background:linear-gradient(180deg,#f6edcf,#e2d3a6);color:var(--ink)}
.wol-learn .iv-th.on .wl-ic{color:#8a5a12}
.wol-learn .iv-th.full::after{content:"";position:absolute;top:.25em;inset-inline-end:.25em;width:.6em;height:.6em;border-radius:50%;background:#7cc45a}
.wol-learn .iv-tname{display:flex;justify-content:space-between;align-items:baseline;margin:.1em .2em 0;font-family:var(--serif);color:#f6edcf;font-size:1em}
.wol-learn .iv-tname small{font-family:inherit;color:#cfc6a8;font-size:.8em}
.wol-learn .iv-pbtn .iv-tag{margin-inline-start:auto;flex:none;font-size:.7em;padding:.1em .45em;border-radius:999px;background:#7ff0ff;color:#0f2530;font-weight:800}
.wol-learn .iv-pbtn.done .iv-tag{margin-inline-start:.3em}
.wol-learn .iv-plan .iv-need{display:flex;gap:.4em;flex-wrap:wrap;margin-top:.35em}
.wol-learn .iv-plan .iv-need span{font-size:.8em;padding:.12em .6em;border-radius:999px;background:rgba(255,255,255,.14);color:#eaf3fb;font-weight:700}
.wol-learn .iv-plan .iv-need span.ok{background:#7cc45a;color:#123010}
.wol-learn .iv-radio .iv-saw{display:block;margin-top:.25em;color:#bfe8f2}
.wol-learn .iv-radio .iv-clue{display:block;margin-top:.3em;color:#f6e7b8}
.wol-learn .iv-hc .iv-lb{font-size:.68em;padding:.05em .5em;border-radius:999px;background:#f6cf72;color:#3a2608;font-weight:800}
.wol-learn .iv-fact .iv-two{display:inline-block;margin-inline-start:.4em;font-size:.75em;padding:.05em .5em;border-radius:999px;background:#2f6a3a;color:#fff;vertical-align:middle}
/* robots */
.wol-learn .iv-rmain{display:grid;grid-template-columns:minmax(16em,22em) 1fr;gap:1.1em;flex:1 1 auto;min-height:0}
.wol-learn .iv-robot{overflow:auto;min-height:0}
.wol-learn .iv-robot{position:relative;display:flex;flex-direction:column;align-items:center;gap:.5em;padding:1em;border-radius:1.1em;background:radial-gradient(ellipse at 50% 30%,#3a4c5a,#1c262e);box-shadow:inset 0 0 0 1px rgba(127,240,255,.2),0 .8em 1.6em rgba(0,0,0,.45)}
.wol-learn .iv-rbody{position:relative;width:12em;height:12.5em}
.wol-learn .iv-rbody svg{position:absolute;inset:0;width:100%;height:100%}
.wol-learn .iv-port{position:absolute;left:50%;top:3.1em;width:6.4em;height:6.4em;margin-left:-3.2em;border-radius:50%;overflow:hidden;background:#0f171d;box-shadow:inset 0 0 0 .35em #c9d4dc,inset 0 0 0 .55em #6b7b86,0 0 1.2em rgba(127,240,255,.35)}
.wol-learn .iv-port img{width:100%;height:100%;object-fit:cover}
.wol-learn .iv-port b{display:grid;place-items:center;height:100%;color:#7ff0ff;font-size:2.2em}
.wol-learn .iv-mods{display:flex;gap:.4em;flex-wrap:wrap;justify-content:center}
.wol-learn .iv-mod{display:flex;align-items:center;gap:.35em;padding:.35em .8em;border-radius:.6em;background:#d8a640;color:#2a1a06;font-weight:800;box-shadow:0 .2em 0 #8a6214}
.wol-learn .iv-mod.empty{background:rgba(246,240,220,.12);color:#cfc6a8;box-shadow:none}
.wol-learn .iv-rname{font-family:var(--serif);font-size:1.25em;color:#f6edcf;text-align:center;min-height:1.4em}
.wol-learn .iv-steps{display:flex;gap:.4em;justify-content:center;flex-wrap:wrap}
.wol-learn .iv-steps button{padding:.4em .9em;border-radius:999px;background:rgba(246,240,220,.1);color:#e8e2c4;font-weight:700}
.wol-learn .iv-steps button.on{background:#7ff0ff;color:#0f2530}
.wol-learn .iv-trials{display:flex;flex-direction:column;gap:.45em}
.wol-learn .iv-trial{display:grid;grid-template-columns:2em 8em 1fr;align-items:center;gap:.6em;padding:.5em .8em;border-radius:.8em;background:rgba(246,240,220,.07);color:#ece5c8}
.wol-learn .iv-trial .wl-ic{width:1.5em;height:1.5em;color:#7ff0ff}
.wol-learn .iv-trial b{font-weight:800}
.wol-learn .iv-trial .bar{position:relative;height:.8em;border-radius:999px;background:rgba(0,0,0,.35);overflow:hidden}
.wol-learn .iv-trial .bar i{position:absolute;inset:0 auto 0 0;width:0;background:linear-gradient(90deg,#e05a3a,#f2c94c 50%,#5fc35a);transition:width .9s ease-out}
.wol-learn .iv-trial small{grid-column:2 / 4;color:#cfc6a8}
.wol-learn .iv-best{display:flex;gap:.5em;flex-wrap:wrap}
.wol-learn .iv-best span{padding:.3em .7em;border-radius:.6em;background:rgba(246,240,220,.08);color:#e8e2c4;font-size:.88em}
@keyframes iv-pop{from{opacity:0;transform:translateY(.6em) scale(.97)}to{opacity:1;transform:none}}
@keyframes iv-shake{0%,100%{transform:none}25%{transform:translateX(-.3em) rotate(-2deg)}75%{transform:translateX(.3em) rotate(2deg)}}
.wol-learn .iv-slot.shake{animation:iv-shake .4s 2}
.wol-learn .iv-main>*,.wol-learn .iv-rmain>*{min-width:0}
.wol-learn .iv.wl-screen{align-items:stretch}.wol-learn .iv>*{max-width:100%}.wol-learn .iv-bench>*{flex:none}
@media (max-width:860px){.wol-learn .iv{padding:0 .7em .4em;gap:.4em}.wol-learn .iv-main{grid-template-columns:minmax(9em,11em) minmax(0,1fr);gap:.6em}.wol-learn .iv-rmain{grid-template-columns:minmax(10em,13em) minmax(0,1fr);gap:.6em}
  .wol-learn .iv-robot{font-size:.74em;padding:.6em}.wol-learn .iv-rbody{flex:none}
  .wol-learn .iv-side{gap:.25em}.wol-learn .iv-th{min-height:0;padding:.3em .1em}.wol-learn .iv-th span{display:none}
  .wol-learn .iv-pbtn{min-height:2.2em;padding:.35em .5em;font-size:.88em}.wol-learn .iv-pbtn .wl-ic{width:1.15em;height:1.15em}
  .wol-learn .iv-hc .wl-card{--cw:min(6em,12vh)}.wol-learn .iv-tr{max-width:min(7em,13vh)}.wol-learn .iv-tr i{font-size:.66em}}
@media (max-width:600px){.wol-learn .iv-main{grid-template-columns:1fr}.wol-learn .iv-plist{flex-direction:row;overflow-x:auto}.wol-learn .iv-pbtn{flex:none}.wol-learn .iv-themes{grid-template-columns:repeat(8,1fr)}.wol-learn .iv-tname{display:none}}
@media (max-height:660px){.wol-learn .iv-row{gap:.6em}.wol-learn .iv-plan{padding:.5em .9em}.wol-learn .iv-plan h3{font-size:1.2em}.wol-learn .iv-plan p{font-size:.88em;line-height:1.3}.wol-learn .iv-slot,.wol-learn .iv-slot .wl-card{--cw:min(7em,13vh)}.wol-learn .iv-bench{gap:.45em;padding:.7em .9em}}
@media (max-height:500px){.wol-learn .iv-plan p{font-size:.8em;line-height:1.25}.wol-learn .iv-plan .iv-need{margin-top:.15em}.wol-learn .iv-plan h3{font-size:1.05em}
  .wol-learn .iv-tabs button{padding:.3em .8em}.wol-learn .iv-handbar .iv-f{padding:.2em .7em}.wol-learn .iv-hand{padding:.2em .2em .3em}.wol-learn .iv-hc .wl-card{--cw:min(5.4em,11vh)}
  .wol-learn .iv-slot,.wol-learn .iv-slot .wl-card{--cw:min(5.4em,12vh)}.wol-learn .iv-test{padding:.5em 1.1em;font-size:1em}.wol-learn .iv-radio{padding:.45em .7em;min-height:0}.wol-learn .iv-face{width:2.2em;height:2.2em}}
`).replace(/\.wol-learn/g, '#wol-learn.wol-learn');
  document.head.appendChild(st);
}

export function mountInventors(root, ctx, opts = {}) {
  injectCss();
  const esc = ctx.esc, kids = !!ctx.kids();
  // beginners read every word fully vocalised (src/data/inventions-kids.js): the same data with their texts laid over it
  const U = INV_UI_K, ui = (plain, key, vars) => (kids ? (vars ? String(U[key]).replace(/\{(\w+)\}/g, (m, x) => vars[x] ?? m) : U[key]) : plain);
  const TRAIT = kids ? { ...TRAIT0, ...TRAIT_K } : TRAIT0;
  const SAY = kids ? { ...SAY0, ...SAY_K } : SAY0;
  const THEMES = kids ? THEMES0.map((t) => ({ ...t, name: THEMES_K[t.id] || t.name })) : THEMES0;
  const WILD = kids ? WILD0.map((w, i) => ({ ...w, text: WILD_K[i] || w.text })) : WILD0;
  const TRIALS = kids ? TRIALS0.map((t) => (TRIALS_K[t.id] ? { ...t, title: TRIALS_K[t.id].title, fun: { ...t.fun, ...TRIALS_K[t.id].fun } } : t)) : TRIALS0;
  const kidsP = (p) => (kids && PROBLEMS_K[p.id] ? { ...p, ...PROBLEMS_K[p.id], show: { ...(p.show || {}), ...PROBLEMS_K[p.id].show } } : p);
  const nm = (c) => (c ? (kids ? nameK(c.name) : c.name) : '');
  const ST = Object.assign({ solved: {}, tries: 0, fails: 0, robots: [], seen: {} }, ctx.store('inventors') || {});
  const save = () => ctx.store('inventors', ST);
  // the beginners' set: the eight first problems (as before) and a few simple new ones
  // (a research question of the lab may ask for another problem: it joins the list then)
  const PLIST = kids ? PROBLEMS.filter((p) => p.kids || p.id === opts.problem).map(kidsP) : PROBLEMS;
  const SHELVES = THEMES.filter((t) => PLIST.some((p) => p.theme === t.id));
  let view = opts.view === 'robots' ? 'robots' : 'problems';
  let pid = (PLIST.find((p) => p.id === opts.problem) || PLIST.find((p) => !ST.solved[p.id]) || PLIST[0]).id;
  let theme = (PLIST.find((p) => p.id === pid) || PLIST[0]).theme;
  let slots = [null, null], filter = 'all', result = null, failsHere = 0, hintAsk = 0, alive = true;
  const R = { body: null, mods: [null, null], step: 0, run: null };
  const offs = [];
  const on = (t, ev, fn) => { t.addEventListener(ev, fn); offs.push(() => t.removeEventListener(ev, fn)); };
  const later = (fn, ms) => ctx.later(() => { if (alive) fn(); }, ms);
  ctx.setTitle && ctx.setTitle(ui('הממציאים', 'title'));
  // problems solved before this version live only in the hub's store: mirror them for the lab's research questions
  try { markSolved(Object.keys(ST.solved)); } catch (e) { /* */ }

  const spId = (c) => (c.sp ? c.sp.id : String(c.id).split(':').pop());
  const isTool = (c) => c.type === 'tool';
  const isPlant = (c) => !isTool(c) && c.sp && !c.sp.animal;
  const traits = (c) => traitsOf({ id: c.id, type: c.type, skind: c.sp && c.sp.kind });
  const cardOfSp = (sp) => ['amazon', 'grove', 'reef'].map((b) => ctx.CARD.get(b + ':' + sp)).find(Boolean) || null;
  // {m|f|mp|fp} → the words for the card name's gender and number
  const fill = (s, c, p) => String(s).replace(/\{n\}/g, nm(c)).replace(/\{p\}/g, p ? p.title : '')
    .replace(/\{([^{}|]*\|[^{}]*)\}/g, (_, g) => { const o = g.split('|'); const k = c && !isTool(c) ? GI[genderOf(spId(c))] ?? 0 : (c && /ת$|ה$/.test(c.name.split(' ')[0]) ? 1 : 0); return o[Math.min(k, o.length - 1)]; });
  const pick = (arr, seed) => arr[Math.abs(seed) % arr.length];
  const hash = (s) => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0; return h; };
  const curP = () => PLIST.find((x) => x.id === pid) || PLIST[0];

  // the cards on the table: the player's own; with fewer than 8 the lab lends a starter set.
  // If no card on the table has a trait the current problem needs, the lab lends the creature it came from.
  const STARTER = ['reef:reefshark', 'grove:owl', 'amazon:hummingbird', 'reef:octopus', 'grove:honeybee', 'amazon:toucan', 'reef:jellyfish', 'grove:pine', 'grove:chameleon', 'reef:clownfish'];
  function hand(p = curP()) {
    const own = ctx.owned() || {};
    let list = ctx.CARDS.filter((c) => own[c.id]);
    let lent = false; const lentIds = new Set();
    if (list.length < 8) { lent = true; for (const id of STARTER) { const c = ctx.CARD.get(id); if (c && !list.includes(c)) list.push(c); } }
    if (p) {
      const reals = [p.real, p.real2].filter(Boolean);
      for (const t of problemNeeds(p)) {
        if (list.some((c) => traits(c).includes(t))) continue;
        const sp = reals.find((s) => (TRAITS[s] || []).includes(t)) || Object.keys(TRAITS).find((s) => TRAITS[s].includes(t) && cardOfSp(s));
        const c = sp && cardOfSp(sp);
        if (c && !list.includes(c)) { list.push(c); lentIds.add(c.id); lent = true; }
      }
    }
    return { list, lent, lentIds };
  }

  /* ───────────── problems */
  // which needed traits the cards on the bench bring, each from a different card
  function cover(need, cards) {
    if (need.length === 1) return cards.some((c) => traits(c).includes(need[0])) ? [need[0]] : [];
    const [a, b] = need;
    for (const x of cards) for (const y of cards) if (x !== y && traits(x).includes(a) && traits(y).includes(b)) return [a, b];
    const got = need.filter((t) => cards.some((c) => traits(c).includes(t)));
    return got.slice(0, 1);
  }
  function evaluate(p, cards) {
    // only living things are a source of inspiration: a device card never solves a problem (it can still be half of a funny pair)
    const need = problemNeeds(p), got = cover(need, cards.filter((c) => !isTool(c)));
    const has = (c, t) => !isTool(c) && traits(c).includes(t);
    const reals = [p.real, p.real2].filter(Boolean);
    if (got.length === need.length) {
      const keyCards = cards.filter((c) => need.some((t) => has(c, t)));
      const combo = need.length === 2;
      const halfCards = cards.filter((c) => !need.some((t) => has(c, t)) && traits(c).some((t) => p.half.includes(t)));
      const pair = !combo && cards.length === 2 && (keyCards.length === 2 || halfCards.length === 1);
      const biomes = new Set(cards.map((c) => (isTool(c) ? 'tool' : c.biome)));
      const realHit = keyCards.some((c) => reals.includes(spId(c)));
      const wild = cards.length === 2 && (combo ? !realHit : biomes.size === 2 && !realHit);
      return { level: 'win', score: combo || pair ? 100 : 92, by: keyCards[0], pair, combo, wild };
    }
    if (got.length) {   // a combination with one of its two parts
      const by = cards.find((c) => has(c, got[0]));
      return { level: 'part', score: 55, by, part: got[0], missing: need.find((t) => t !== got[0]) };
    }
    const halfCards = cards.filter((c) => traits(c).some((t) => p.half.includes(t)));
    if (halfCards.length) return { level: 'half', score: cards.length === 2 && halfCards.length === 2 ? 62 : 48, by: halfCards[0] };
    if (cards.length === 2) {
      const [x, y] = cards.map(traits);
      const w = WILD.find((o) => (x.includes(o.t[0]) && y.includes(o.t[1])) || (x.includes(o.t[1]) && y.includes(o.t[0])));
      if (w) return { level: 'odd', score: 30, by: cards[0], text: w.text };
    }
    return { level: 'fail', score: 8 + (hash(cards.map((c) => c.id).join()) & 15), by: cards[0] };
  }
  function sayFor(p, r, cards) {
    const c = r.by, seed = hash(p.id + cards.map((x) => x.id).join());
    const show = p.show || {};
    if (r.level === 'win') return { face: r.wild ? 'wow' : 'happy', text: fill(pick(r.wild ? SAY.wild : r.combo ? SAY.combo : r.pair ? SAY.winPair : SAY.win, seed), c, p) };
    if (r.level === 'part') return { face: 'think', text: pick(SAY.part, seed), saw: (p.part && p.part[r.part]) || show.half || '' };
    if (r.level === 'half') return { face: 'think', text: fill(pick(SAY.half, seed), c, p) + ` (${TRAIT[traits(c).find((t) => p.half.includes(t))]}: ${ui('קרוב!', 'close')})`, saw: show.half || '' };
    if (r.level === 'odd') return { face: 'wow', text: kids ? r.text : pick(SAY.odd, seed) + ' ' + r.text, saw: show.fail || '' };
    let text;
    if (isTool(c)) text = fill(pick(SAY.failTool, seed), c, p);
    else if (!isPlant(c) && p.sea && c.biome !== 'reef') text = fill(pick(SAY.oddWater, seed), c, p);
    else if (!isPlant(c) && p.land && c.biome === 'reef') text = fill(pick(SAY.oddLand, seed), c, p);
    else text = fill(pick(isPlant(c) ? SAY.failPlant : SAY.failAnimal, seed), c, p);
    return { face: 'oops', text, saw: show.fail || '' };
  }
  const solvedCount = () => Object.keys(ST.solved).filter((id) => PROBLEMS.some((p) => p.id === id)).length;
  function runTest() {
    const p = curP(), cards = slots.filter(Boolean);
    if (!p || !cards.length || result === 'busy') return;
    result = 'busy'; render();
    ctx.sfx('click');
    ST.tries++;
    const r = evaluate(p, cards), s = sayFor(p, r, cards);
    const g = root.querySelector('.iv-gauge i'); if (g) requestAnimationFrame(() => { g.style.width = r.score + '%'; });
    later(() => {
      if (r.level === 'win') {
        const first = !ST.solved[p.id];
        ST.solved[p.id] = { by: cards.map((c) => c.id), at: Date.now() };
        ctx.sfx('quizRight'); ctx.confetti(root.querySelector('.iv-bench'), 40);
        const n = solvedCount();
        ctx.badge('inv:first');
        if (n >= 5) ctx.badge('inv:five');
        if (n >= 10) ctx.badge('inv:ten');
        if (n >= 25) ctx.badge('inv:many');
        if (PROBLEMS.every((x) => ST.solved[x.id])) ctx.badge('inv:all');
        if (PLIST.filter((x) => x.theme === p.theme).every((x) => ST.solved[x.id])) ctx.badge('inv:theme:' + p.theme);
        if (r.combo) ctx.badge('inv:pair');
        if (r.wild) ctx.badge('inv:wild');
        try { markSolved(p.id); invent(p.real); if (p.real2) invent(p.real2); } catch (e) { /* the lab's atlas stamps "השראה" on this creature */ }
        if (p.id === 'swim' && first) {   // the lab's real invention: the reef survey robot gets the shark-skin coat
          try { invent('sharkskin'); } catch (e) { /* */ }
          if (TORAH) { try { grantSource('sheal'); } catch (e) { /* */ } }
        }
        failsHere = 0; hintAsk = 0;
      } else {
        ST.fails++; failsHere++;
        ctx.tally('inv:fails', 1); if (ctx.tally('inv:fails') >= 10) ctx.badge('inv:stubborn');
        ctx.sfx(r.level === 'half' || r.level === 'part' ? 'click' : 'quizWrong');
        root.querySelectorAll('.iv-slot').forEach((el) => { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); });
      }
      save();
      result = { ...r, ...s, p };
      render();
      // the bench is short on small screens: bring the result (and what really happened) into view
      const bench = root.querySelector('.iv-bench'), last = bench && bench.querySelector(r.level === 'win' ? '.iv-fact' : '.iv-radio');
      if (bench && last) bench.scrollTop = Math.max(0, last.offsetTop + last.offsetHeight - bench.clientHeight + 12);
      const handEl = root.querySelector('.iv-hand'); if (handEl) handEl.scrollLeft = 0;
    }, 1250);
  }
  // hints: 1 = the clue (a question), 2 = the cards with a missing trait are marked
  const hintStage = () => Math.max(hintAsk, failsHere >= (kids ? 2 : 3) ? 2 : failsHere >= 1 ? 1 : 0);
  function missingNow(p) {
    const need = problemNeeds(p), got = cover(need, slots.filter(Boolean));
    return need.filter((t) => !got.includes(t));
  }
  function problemsHTML() {
    const p = curP();
    const { list, lent, lentIds } = hand(p);
    const used = new Set(slots.filter(Boolean).map((c) => c.id));
    const shown = list.filter((c) => filter === 'all' || (filter === 'tech' ? isTool(c) : c.biome === filter));
    const stage = hintStage(), missing = missingNow(p);
    const hinted = (c) => (traits(c).some((t) => missing.includes(t)) ? 1 : 0);   // marked cards come first in the hand
    const need = problemNeeds(p);
    const slot = (i) => slots[i] ? `<div class="iv-slot" data-iv="unslot" data-i="${i}" title="${ui('הורדה מהשולחן', 'unslot')}">${ctx.cardHTML(slots[i])}</div>`
      : `<div class="iv-slot" data-iv="noop">${i === 0 ? ui('בחרו קלף מלמטה', 'slot0') : p.need ? ui('כאן שמים את הקלף השני', 'slot1need') : ui('אפשר להוסיף עוד אחד', 'slot1')}</div>`;
    const traitList = missing.map((t) => `"${esc(TRAIT[t])}"`).join(kids ? U.and : ' וגם ');
    const clueText = stage >= 2 && missing.length ? ui(`רמז: חפשו ${traitList}. סימנתי לכם קלפים כאלה.`, 'clueCards', { t: traitList })
      : stage >= 1 && p.clue ? ui(`רמז: ${esc(p.clue)}`, 'clue', { t: esc(p.clue) }) : '';
    const clueLine = clueText ? `<span class="iv-clue">${clueText}</span>` : '';
    let res = '';
    const robo = ui('רובו־דע:', 'robo');
    if (result === 'busy') res = `<div class="iv-radio">${face('think')}<p>${kids ? U.busy : `בודקים... ${esc(slots.filter(Boolean).map((c) => c.name).join(' ו'))} על שולחן הניסוי.`}</p></div>`;
    else if (result && result.p && result.p.id === p.id) {
      res = `<div class="iv-radio">${face(result.face)}<p><b>${robo}</b> ${esc(result.text)}${result.saw ? `<span class="iv-saw">${ui('הניסוי הראה:', 'saw')} ${esc(result.saw)}</span>` : ''}${result.level !== 'win' ? clueLine : ''}</p></div>`;
      if (result.level === 'win') {
        const r1 = cardOfSp(p.real), r2 = p.real2 ? cardOfSp(p.real2) : null;
        const who = [r1, r2].filter(Boolean).map(nm).join(kids ? ', ' : ' ו');
        res += `<div class="iv-fact"><h4>${I.check}${p.need ? ui('מאיפה הרעיונות באו', 'howPair') : ui('כך זה קרה באמת', 'how')}${who ? ` · ${esc(who)}` : ''}${p.need ? `<span class="iv-two">${ui('שילוב', 'pair')}</span>` : ''}</h4><p>${esc(p.fact)}</p></div>`;
      }
    }
    const inTheme = PLIST.filter((x) => x.theme === theme);
    const th = THEMES.find((t) => t.id === theme) || THEMES[0];
    return `<div class="iv-main">
      <div class="iv-side">
        <div class="iv-themes">${SHELVES.map((t) => { const all = PLIST.filter((x) => x.theme === t.id); const full = all.every((x) => ST.solved[x.id]);
          return `<button class="iv-th${t.id === theme ? ' on' : ''}${full ? ' full' : ''}" data-iv="theme" data-t="${t.id}" title="${esc(t.name)}">${I[t.icon] || I.flask}<span>${esc(t.name)}</span></button>`; }).join('')}</div>
        <h4 class="iv-tname">${esc(th.name)}<small>${ui(`${inTheme.filter((x) => ST.solved[x.id]).length} מתוך ${inTheme.length}`, 'of', { n: inTheme.filter((x) => ST.solved[x.id]).length, all: inTheme.length })}</small></h4>
        <nav class="iv-plist">${inTheme.map((x) => `<button class="iv-pbtn${x.id === p.id ? ' on' : ''}${ST.solved[x.id] ? ' done' : ''}" data-iv="prob" data-p="${x.id}">${I[x.icon] || I.flask}<span>${esc(x.title)}</span>${x.need ? `<i class="iv-tag">${ui('שילוב', 'pair')}</i>` : ''}</button>`).join('')}</nav>
      </div>
      <div class="iv-bench">
        <div class="iv-plan"><h3>${I[p.icon] || I.flask}${esc(p.title)}</h3><p>${esc(p.ask)}</p>
          ${p.need ? `<div class="iv-need">${need.map((t) => `<span class="${missing.includes(t) ? '' : 'ok'}">${stage >= 2 || !missing.includes(t) ? esc(TRAIT[t]) : ui('תכונה ' + (need.indexOf(t) + 1), 'trait', { n: need.indexOf(t) + 1 })}</span>`).join('')}<span>${ui('שני קלפים, שתי תכונות', 'twoCards')}</span></div>` : ''}</div>
        <div class="iv-row">${slot(0)}<span class="iv-plus">${ui('וגם', 'plus')}</span>${slot(1)}
          <div class="iv-go"><button class="iv-test" data-iv="test" ${slots.some(Boolean) && result !== 'busy' ? '' : 'disabled'}>${I.flask}${ui('לבדוק בניסוי!', 'test')}</button>
            <div class="iv-gauge"><i style="width:${result && result !== 'busy' && result.p && result.p.id === p.id ? result.score : 0}%"></i></div>
            <button class="iv-hintb" data-iv="hint">${I.bulbHint}${ui('רמז', 'hint')}</button></div></div>
        ${res || `<div class="iv-radio">${face('happy')}<p><b>${robo}</b> ${clueText || (p.need ? ui('כאן צריך שילוב: שני קלפים, וכל אחד מביא תכונה אחרת. מותר לטעות, ככה ממציאים!', 'idleNeed') : ui('שימו על השולחן קלף אחד או שניים, ונבדוק יחד. מותר לטעות, ככה ממציאים!', 'idle'))}</p></div>`}
      </div></div>
      <div class="iv-handbar">${filtersHTML()}
        ${lent ? `<small class="iv-lent">${ui('המעבדה השאילה לכם כמה קלפים', 'lent')}</small>` : `<small>${ui(`${shown.length} קלפים`, 'cards', { n: shown.length })}</small>`}</div>
      <div class="iv-hand">${(stage >= 2 ? [...shown].sort((a, b) => hinted(b) - hinted(a)) : shown).map((c) => { const tr = traits(c); const hint = stage >= 2 && tr.some((t) => missing.includes(t));
        const chips = [...new Set([...(hint ? tr.filter((t) => missing.includes(t)) : []), ...tr])].slice(0, 2);
        return `<div class="iv-hc${used.has(c.id) ? ' used' : ''}${hint ? ' hint' : ''}" data-iv="card" data-c="${esc(c.id)}" title="${esc(tr.map((t) => TRAIT[t]).join(' · '))}">${ctx.cardHTML(c)}<div class="iv-tr">${chips.map((t) => `<i class="${hint && missing.includes(t) ? 'k' : ''}">${esc(TRAIT[t])}</i>`).join('')}${lentIds.has(c.id) ? `<i class="iv-lb">${ui('מושאל', 'lentOne')}</i>` : ''}</div></div>`; }).join('')}</div>`;
  }
  const filtersHTML = () => [['all', 'הכול'], ['amazon', 'אמזונס'], ['grove', 'חורש'], ['reef', 'שונית'], ['tech', 'טכנולוגיה']].map(([v, t]) => `<button class="iv-f${filter === v ? ' on' : ''}" data-iv="filter" data-v="${v}">${kids ? U.filters[v] : t}</button>`).join('');
  /* ───────────── robots */
  function robotName() {
    if (!R.body) return '';
    const mods = R.mods.filter(Boolean).map((m) => TRAIT[m.t]);
    if (kids) return U.robotOf.replace('{name}', nm(R.body)) + (mods.length ? U.with + mods.join(U.and) : '');
    return `רובו־${R.body.name}${mods.length ? ' עם ' + mods.join(' ו') : ''}`;
  }
  function robotTraits() { return [...(R.body ? traits(R.body).slice(0, 2) : []), ...R.mods.filter(Boolean).map((m) => m.t)]; }
  function runRobot() {
    if (!R.body || R.run) return;
    const tr = robotTraits();
    const res = TRIALS.map((tl, i) => {
      const g = tl.good.filter((t) => tr.includes(t)).length, o = tl.ok.filter((t) => tr.includes(t)).length;
      const sc = Math.min(100, g * 55 + o * 22 + (hash(R.body.id + tl.id) & 7));
      const lv = sc >= 55 ? 'win' : sc >= 22 ? 'half' : 'fail';
      return { tl, sc, lv, line: tl.fun[lv] + ' ' + pick(lv === 'win' ? SAY.trialWin : lv === 'half' ? SAY.trialHalf : SAY.trialFail, hash(tl.id + R.body.id + i)) };
    });
    R.run = res; ctx.sfx('click'); render();
    root.querySelectorAll('.iv-trial .bar i').forEach((b, i) => later(() => { b.style.width = res[i].sc + '%'; if (i === res.length - 1) finishRobot(); }, 350 + i * 450));
  }
  function finishRobot() {
    const res = R.run; if (!res) return;
    const total = res.reduce((s, r) => s + r.sc, 0), wins = res.filter((r) => r.lv === 'win').length;
    ST.robots = [{ name: robotName(), total, at: Date.now() }, ...(ST.robots || [])].sort((a, b) => b.total - a.total).slice(0, 5);
    // a robot that wins a trial its body could never do alone is a wild idea
    const own = R.body ? traits(R.body) : [];
    if (res.some((r) => r.lv === 'win' && !r.tl.good.some((t) => own.includes(t)))) ctx.badge('inv:wild');
    save(); ctx.sfx(wins >= 3 ? 'quizRight' : 'click');
    if (wins >= 4) ctx.confetti(root.querySelector('.iv-robot'), 30);
    R.done = { total, wins }; render();
  }
  function robotSVG() {
    return `<svg viewBox="0 0 120 125" aria-hidden="true"><defs><linearGradient id="ivm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9eef2"/><stop offset="1" stop-color="#a9b6c0"/></linearGradient></defs>
      <path d="M60 4v10" stroke="#9fb4c4" stroke-width="3"/><circle cx="60" cy="4" r="4" fill="#7ff0ff"/>
      <rect x="18" y="14" width="84" height="80" rx="30" fill="url(#ivm)" stroke="#6b7b86" stroke-width="2"/>
      <rect x="6" y="46" width="14" height="30" rx="7" fill="#c9d4dc" stroke="#6b7b86" stroke-width="2"/><rect x="100" y="46" width="14" height="30" rx="7" fill="#c9d4dc" stroke="#6b7b86" stroke-width="2"/>
      <rect x="34" y="94" width="14" height="22" rx="6" fill="#c9d4dc" stroke="#6b7b86" stroke-width="2"/><rect x="72" y="94" width="14" height="22" rx="6" fill="#c9d4dc" stroke="#6b7b86" stroke-width="2"/>
      <ellipse cx="60" cy="120" rx="40" ry="4" fill="rgba(127,240,255,.25)"/></svg>`;
  }
  function robotsHTML() {
    const { list, lent } = hand(null);
    const shown = list.filter((c) => filter === 'all' || (filter === 'tech' ? isTool(c) : c.biome === filter));
    const stepName = kids ? U.steps : ['בחרו גוף לרובוט: יצור מהקלפים', 'בחרו תכונה ראשונה: לחצו על קלף ואז על תכונה', 'בחרו תכונה שנייה'];
    const mod = (i) => R.mods[i] ? `<span class="iv-mod" data-iv="unmod" data-i="${i}">${I.gear}${esc(TRAIT[R.mods[i].t])}</span>` : `<span class="iv-mod empty">${ui('תכונה ' + (i + 1), 'trait', { n: i + 1 })}</span>`;
    let trials = '';
    if (R.run) trials = `<div class="iv-trials">${R.run.map((r) => `<div class="iv-trial">${I[r.tl.icon] || I.flask}<b>${esc(r.tl.title)}</b><span class="bar"><i${R.done ? ` style="width:${r.sc}%"` : ''}></i></span><small>${esc(r.line)}</small></div>`).join('')}</div>`
      + (R.done ? `<div class="iv-radio">${face(R.done.wins >= 3 ? 'wow' : R.done.wins >= 1 ? 'happy' : 'oops')}<p><b>${ui('רובו־דע:', 'robo')}</b> ${kids ? (R.done.wins >= 4 ? U.champ : R.done.wins >= 2 ? U.some.replace('{n}', R.done.wins) : R.done.wins === 1 ? U.oneTrial : U.rest)
        : R.done.wins >= 4 ? 'רובוט אלוף! הוא עבר כמעט הכול.' : R.done.wins >= 2 ? `עבר ${R.done.wins} מתוך 5. לא רע בכלל! אולי תכונה אחרת תעזור בשאר?` : R.done.wins === 1 ? 'עבר ניסוי אחד. מצחיק, אבל עוד לא מוכן לשטח.' : 'הרובוט הלך לנוח... ננסה גוף אחר או תכונות אחרות?'}</p></div>` : '');
    return `<div class="iv-rmain">
      <div class="iv-robot"><div class="iv-rbody">${robotSVG()}<div class="iv-port">${R.body && R.body.art ? `<img src="${R.body.art}" alt="">` : '<b>?</b>'}</div></div>
        <div class="iv-rname">${esc(robotName() || ui('הרובוט שלכם', 'yourRobot'))}</div>
        <div class="iv-mods">${mod(0)}${mod(1)}</div>
        <div class="iv-steps"><button class="${R.step === 0 ? 'on' : ''}" data-iv="step" data-s="0">${ui('גוף', 'body')}</button><button class="${R.step === 1 ? 'on' : ''}" data-iv="step" data-s="1">${ui('תכונה 1', 'trait', { n: 1 })}</button><button class="${R.step === 2 ? 'on' : ''}" data-iv="step" data-s="2">${ui('תכונה 2', 'trait', { n: 2 })}</button></div>
        <button class="iv-test" data-iv="run" ${R.body && !R.run ? '' : 'disabled'}>${I.flask}${ui('לבדוק בשטח!', 'field')}</button>
        ${R.run && R.done ? `<button class="iv-hintb" data-iv="again">${I.undo}${ui('רובוט חדש', 'newRobot')}</button>` : ''}
        ${(ST.robots || []).length ? `<div class="iv-best">${ST.robots.slice(0, 3).map((r) => `<span>${esc(r.name)} · ${r.total}</span>`).join('')}</div>` : ''}
      </div>
      <div class="iv-bench">${trials || `<div class="iv-radio">${face('think')}<p><b>${ui('רובו־דע:', 'robo')}</b> ${esc(stepName[R.step] || stepName[0])}. ${kids ? U.later : 'אחר כך נבדוק את הרובוט בחמישה ניסויים: מרוץ במים, חיפוש בלילה, טיפוס, הרמת משא ומחבואים.'}</p></div>`}
        ${R.pickFor ? `<div class="iv-plan"><h3>${I.gear}${kids ? esc(U.pickTrait.replace('{name}', nm(R.pickFor))) : `איזו תכונה לקחת מ${esc(R.pickFor.name)}?`}</h3><div class="iv-row">${traits(R.pickFor).map((t) => `<button class="iv-mod" data-iv="trait" data-t="${t}">${esc(TRAIT[t])}</button>`).join('')}</div></div>` : ''}
      </div></div>
      <div class="iv-handbar">${filtersHTML()}
        ${lent ? `<small class="iv-lent">${ui('המעבדה השאילה לכם כמה קלפים', 'lent')}</small>` : ''}</div>
      <div class="iv-hand">${shown.map((c) => `<div class="iv-hc${(R.body && R.body.id === c.id) ? ' used' : ''}" data-iv="rcard" data-c="${esc(c.id)}" title="${esc(traits(c).map((t) => TRAIT[t]).join(' · '))}">${ctx.cardHTML(c)}<div class="iv-tr">${traits(c).slice(0, 2).map((t) => `<i>${esc(TRAIT[t])}</i>`).join('')}</div></div>`).join('')}</div>`;
  }

  function render() {
    if (!alive) return;
    const solved = PLIST.filter((p) => ST.solved[p.id]).length;
    root.innerHTML = `<section class="wl-screen iv${kids ? ' kids' : ''}">
      <div class="iv-top"><div class="iv-tabs"><button class="${view === 'problems' ? 'on' : ''}" data-iv="view" data-v="problems">${I.bulb}${ui('בעיות להמציא', 'problems')}</button><button class="${view === 'robots' ? 'on' : ''}" data-iv="view" data-v="robots">${I.gear}${ui('סדנת הרובוטים', 'robots')}</button></div>
        <span class="iv-score">${I.check}${ui(`${solved} מתוך ${PLIST.length} המצאות`, 'score', { n: solved, all: PLIST.length })}</span></div>
      ${view === 'problems' ? problemsHTML() : robotsHTML()}</section>`;
  }
  function onClick(e) {
    const t = e.target.closest('[data-iv]'); if (!t || !alive) return;
    const a = t.dataset.iv;
    if (a === 'view') { view = t.dataset.v; result = null; ctx.sfx('click'); render(); return; }
    if (a === 'filter') { filter = t.dataset.v; render(); return; }
    if (a === 'prob') { pid = t.dataset.p; slots = [null, null]; result = null; failsHere = 0; hintAsk = 0; ctx.sfx('click'); render(); return; }
    if (a === 'theme') { theme = t.dataset.t; const first = PLIST.find((x) => x.theme === theme && !ST.solved[x.id]) || PLIST.find((x) => x.theme === theme); if (first && first.id !== pid) { pid = first.id; slots = [null, null]; result = null; failsHere = 0; hintAsk = 0; } ctx.sfx('click'); render(); return; }
    if (a === 'card') {
      if (result === 'busy') return;
      const c = ctx.CARD.get(t.dataset.c); if (!c) return;
      if (slots.some((s) => s && s.id === c.id)) { slots = slots.map((s) => (s && s.id === c.id ? null : s)); }
      else { const i = slots[0] ? (slots[1] ? 1 : 1) : 0; slots[i] = c; }
      result = null; ctx.sfx('place'); render(); return;
    }
    if (a === 'unslot') { slots[+t.dataset.i] = null; result = null; render(); return; }
    if (a === 'test') { runTest(); return; }
    if (a === 'hint') { hintAsk = Math.min(2, hintStage() + 1); if (result && result !== 'busy' && result.level === 'win') result = null; render(); return; }
    // robots
    if (a === 'step') { R.step = +t.dataset.s; R.pickFor = null; render(); return; }
    if (a === 'rcard') {
      const c = ctx.CARD.get(t.dataset.c); if (!c || R.run) return;
      if (R.step === 0) { R.body = c; R.step = 1; R.pickFor = null; ctx.sfx('place'); }
      else { R.pickFor = c; }
      render(); return;
    }
    if (a === 'trait') { const i = R.step === 2 ? 1 : 0; R.mods[i] = { t: t.dataset.t, from: R.pickFor && R.pickFor.id }; R.pickFor = null; R.step = Math.min(2, R.step + 1); ctx.sfx('place'); render(); return; }
    if (a === 'unmod') { R.mods[+t.dataset.i] = null; render(); return; }
    if (a === 'run') { runRobot(); return; }
    if (a === 'again') { R.body = null; R.mods = [null, null]; R.step = 0; R.run = null; R.done = null; render(); return; }
  }
  on(root, 'click', onClick);
  render();
  try {
    window.__ivDebug = {
      state: () => JSON.parse(JSON.stringify({ view, pid, theme, slots: slots.map((c) => c && c.id), result: result && result.level, text: result && result.text, saw: result && result.saw, hint: hintStage(), solved: ST.solved, tries: ST.tries, fails: ST.fails, problems: PLIST.length })),
      pick: (id) => { const p = PLIST.find((x) => x.id === id); if (!p) return 'no problem'; pid = id; theme = p.theme; slots = [null, null]; result = null; failsHere = 0; hintAsk = 0; render(); return 'ok'; },
      theme: (id) => { theme = id; render(); },
      put: (id) => { const c = ctx.CARD.get(id); if (!c) return 'no card'; slots[slots[0] ? 1 : 0] = c; result = null; render(); return 'ok'; },
      clear: () => { slots = [null, null]; result = null; render(); },
      hand: () => { const h = hand(); return { ids: h.list.map((c) => c.id), lent: [...h.lentIds] }; },
      eval: (pidX, ids) => { const p = PROBLEMS.find((x) => x.id === pidX); const cards = ids.map((i) => ctx.CARD.get(i)).filter(Boolean); return p && cards.length ? evaluate(p, cards).level : null; },
      test: () => runTest(), view: (v) => { view = v; render(); },
      robot: (body, a, b) => { R.body = ctx.CARD.get(body); R.mods = [a ? { t: a } : null, b ? { t: b } : null]; R.run = null; R.done = null; render(); }, run: () => runRobot(),
    };
  } catch (e) { /* */ }
  return { destroy() { alive = false; offs.forEach((f) => f()); try { if (window.__ivDebug) delete window.__ivDebug; } catch (e) { /* */ } } };
}
