// "מה הפסוק מלמד?" – the source-card game of the learning hub (torah edition only, while "מקורות ופסוקים" is on).
// A source card (a verse, a saying of the sages or a midrash: SOURCE_CARDS in src/data/torah.js) lies on the table with
// three album cards. The child picks the card that fits what the source teaches. רובו־דע then tells the link in a
// sentence or two (src/data/torah-links.js). Sometimes two of the cards fit, one better than the other, and every card
// gets its explanation, also why it fits less. A card that fits less is no failure: the child hears why and tries
// another one. Rounds of 8 (6 at the beginners' level, fully vocalised), no timers, gentle scoring, badges ('verse:*').
//
// export function mountVerseMatch(root, ctx, opts) → { destroy() }
// Debug hook: window.__vmDebug = { start(ids?), pick(k), next(), state(), info(k) }
import { SOURCE_CARDS } from '../../data/torah.js';
import { SOURCE_ART } from '../../data/source-art.js';
import { VERSE_LINKS, VERSE_UI as U } from '../../data/torah-links.js';
import { nameK } from '../../data/inventions-kids.js';   // the card names, fully vocalised
import { icon } from '../../ui/ui.js';

const CSS_ID = 'wl-versematch-css';
const ROUND = 8, ROUND_KIDS = 6;


/* ───────────────────────────── the robot's face (the hub's games share this little visor) */
const FACE = {
  happy: '<path d="M8 13q2-3 4 0M14.5 13q2-3 4 0" stroke="#7ff0ff" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
  wow: '<circle cx="10" cy="12.5" r="2.4" fill="#7ff0ff"/><circle cx="16.5" cy="12.5" r="2.4" fill="#7ff0ff"/>',
  think: '<circle cx="10" cy="12" r="1.8" fill="#7ff0ff"/><path d="M14.4 12.6h4.2" stroke="#7ff0ff" stroke-width="2.2" stroke-linecap="round"/>',
};
const face = (e) => `<svg class="vm-face" viewBox="0 0 26 26" aria-hidden="true"><rect x="2" y="4" width="22" height="18" rx="7" fill="#e9eef2"/><rect x="4.5" y="7" width="17" height="11.5" rx="5" fill="#1d2b36"/>${FACE[e] || FACE.happy}<circle cx="13" cy="3" r="1.6" fill="#3fa9c9"/></svg>`;
const sv = (body) => `<svg class="wl-ic" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
const I_SCROLL = sv('<path d="M6 4h10.5A2.5 2.5 0 0 1 19 6.5V18a2 2 0 0 1-2 2H7.5A2.5 2.5 0 0 1 5 17.5V5a1 1 0 0 1 1-1z" fill="currentColor"/><path d="M8.5 8.5h7M8.5 11.5h7M8.5 14.5h4.5" stroke="#fff" stroke-opacity=".6" stroke-width="1.5" stroke-linecap="round"/>');
const I_STAR = sv('<path d="M12 2.6l2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.2l-5.8 3.2 1.2-6.5-4.8-4.5 6.5-.8z" fill="currentColor"/>');
const I_NEXT = sv('<path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>');

const rnd = (n) => Math.floor(Math.random() * n);
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (m, k) => (v[k] ?? m));

function injectCss() {
  if (document.getElementById(CSS_ID)) return;
  const st = document.createElement('style'); st.id = CSS_ID;
  st.textContent = (`
.wol-learn .vm{position:relative;flex:1;min-height:0;width:100%;display:flex;flex-direction:column;gap:.55em;padding:0 1.4em .8em;box-sizing:border-box;animation:wl-rise .35s ease-out both}
.wol-learn .vm .wl-prog{align-self:center}
.wol-learn .vm .wl-pl.half{color:#c9d98a}
.wol-learn .vm-stage{flex:1;min-height:0;display:grid;grid-template-columns:minmax(14em,34%) 1fr;gap:1em;align-items:stretch}
/* the source card: a parchment with the painting on top */
.wol-learn .vm-src{--sc:#8a6420;position:relative;display:flex;flex-direction:column;min-height:0;border-radius:1.1em;overflow:hidden;color:#2a1c08;
  background:radial-gradient(120% 70% at 100% 0%,rgba(255,255,255,.55),transparent 55%),repeating-linear-gradient(0deg,rgba(120,90,40,.05) 0 1px,transparent 1px 3px),#f4e7c4;
  box-shadow:0 0 0 .3em var(--sc),0 0 0 .45em #f6dfa0,0 1em 2em rgba(0,0,0,.4)}
.wol-learn .vm-sart{position:relative;flex:none;height:min(9em,26vh);overflow:hidden;background:var(--sc)}
.wol-learn .vm-sart img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.wol-learn .vm-sart .wl-ic{position:absolute;left:50%;top:50%;width:3em;height:3em;margin:-1.5em;color:rgba(255,248,230,.85)}
.wol-learn .vm-stxt{flex:1;min-height:0;overflow-y:auto;padding:.6em .9em .8em;display:flex;flex-direction:column;gap:.3em;scrollbar-width:thin}
.wol-learn .vm-stitle{font-family:var(--serif);font-size:1.25em;line-height:1.3;color:#3a2608}
.wol-learn .vm-quote{margin:0;font-family:var(--serif);font-size:calc(1.12em * var(--tsr,1));line-height:1.75;color:#2a1c08}
.wol-learn .vm-quote.long{font-size:1em;line-height:1.6}
.wol-learn .vm-ref{font-weight:800;color:var(--sc);font-size:.9em}
.wol-learn .vm-side{min-width:0;min-height:0;display:flex;flex-direction:column;gap:.6em}
.wol-learn .vm-ask{display:flex;align-items:center;gap:.6em;padding:.55em .9em;border-radius:1em;background:rgba(246,240,220,.12);border:1px solid rgba(246,240,220,.2);color:#f6eed0;font-size:calc(1.1em * var(--tsr,1));font-weight:700;line-height:1.35}
.wol-learn .vm-ask .wl-ic{width:1.6em;height:1.6em;color:#f6cf72;flex:none}
.wol-learn .vm-opts{flex:1 1 auto;min-height:0;display:flex;justify-content:center;align-items:center;gap:1.1em;padding:.3em 0 .7em}
.wol-learn .vm-opt{position:relative;display:flex;flex-direction:column;align-items:center;gap:.35em;border-radius:.9em;transition:transform .18s,filter .25s,opacity .25s}
.wol-learn .vm-opt .wl-card{--cw:min(10.5em,27vh);pointer-events:none}
.wol-learn .vm-opt:not(:disabled):hover{transform:translateY(-.3em)}
.wol-learn .vm-opt:focus-visible{outline:3px solid var(--amber);outline-offset:4px}
.wol-learn .vm-opt.ok .wl-card{box-shadow:0 0 0 .22em #fff3c4,0 0 0 .4em #e2b247,0 0 1.6em rgba(246,207,114,.85)}
.wol-learn .vm-opt.also .wl-card{box-shadow:0 0 0 .2em #e3f5d3,0 0 0 .36em #8cc46b,0 0 1.2em rgba(143,208,103,.6)}
.wol-learn .vm-opt.less{filter:saturate(.45) brightness(.82)}
.wol-learn .vm-opt.sel{transform:translateY(-.3em)}
.wol-learn .vm-chip{position:absolute;bottom:-.75em;left:50%;transform:translateX(-50%);z-index:3;white-space:nowrap;padding:.15em .8em;border-radius:99px;font-weight:900;font-size:.85em;box-shadow:0 .2em .5em rgba(0,0,0,.35)}
.wol-learn .vm-chip.ok{background:linear-gradient(180deg,#ffe9a8,#e8a43a);color:#4a2c06}
.wol-learn .vm-chip.also{background:#d9f0c4;color:#24461a}
.wol-learn .vm-chip.less{background:#e6e0cc;color:#4a4436}
.wol-learn .vm-nown{font-size:.75em;font-weight:700;color:#d8d0b0;opacity:.85}
.wol-learn .vm-opt.ok .vm-nown,.wol-learn .vm-opt.also .vm-nown,.wol-learn .vm-opt.less .vm-nown{visibility:hidden}
.wol-learn .vm-say{flex:0 1 auto;min-height:3.4em;max-height:40%;display:flex;align-items:flex-start;gap:.7em;padding:.6em .9em;border-radius:1em;background:#22303b;color:#e7f4f9;box-shadow:inset 0 0 0 1px rgba(127,240,255,.25);overflow-y:auto;scrollbar-width:thin}
.wol-learn .vm-face{width:2.8em;height:2.8em;flex:none}
.wol-learn .vm-say p{margin:0;line-height:1.5;font-size:calc(1.05em * var(--tsr,1))}
.wol-learn .vm-say b.v{display:block;color:#f6cf72;font-family:var(--serif);font-size:1.12em}
.wol-learn .vm-say small{display:block;margin-top:.3em;color:#a9c7d2}
.wol-learn .vm-row{flex:none;display:flex;justify-content:center;gap:.7em}
.wol-learn .vm-row .wl-btn{min-height:2.6em;padding:.3em 1.3em}
/* start and end */
.wol-learn .vm-card{margin:auto;width:min(40em,94%);border-radius:1.4em;padding:1.3em 1.6em;display:flex;flex-direction:column;align-items:center;gap:.8em;text-align:center}
.wol-learn .vm-card h2{font-family:var(--serif);font-size:2.1em;line-height:1.1;color:#3a2608;display:flex;align-items:center;gap:.35em}
.wol-learn .vm-card p{color:#4a3a20;font-size:calc(1.08em * var(--tsr,1));line-height:1.5}
.wol-learn .vm-fan{display:flex;justify-content:center;gap:.4em}
.wol-learn .vm-fan img{width:5.2em;height:5.2em;object-fit:cover;border-radius:.7em;box-shadow:0 0 0 .2em #f6dfa0,0 .4em .8em rgba(0,0,0,.3)}
.wol-learn .vm-fan img:nth-child(odd){transform:rotate(-5deg)}.wol-learn .vm-fan img:nth-child(even){transform:rotate(4deg) translateY(-.3em)}
.wol-learn .vm-met{font-weight:800;color:#6a4a10}
.wol-learn .vm-stars{display:flex;gap:.3em;color:#cfc6a8}
.wol-learn .vm-stars .wl-ic{width:3em;height:3em}
.wol-learn .vm-stars .on{color:var(--amber);filter:drop-shadow(0 .2em .4em rgba(217,142,38,.55))}
.wol-learn .vm-intro{display:flex;align-items:flex-start;gap:.7em;text-align:right;padding:.7em .9em;border-radius:1em;background:#22303b;color:#e7f4f9}
.wol-learn .vm-intro p{color:#e7f4f9}
@media (max-height:620px){
  .wol-learn .vm{gap:.4em;padding-bottom:.5em}.wol-learn .vm-stage{grid-template-columns:minmax(12em,32%) 1fr;gap:.7em}
  .wol-learn .vm-sart{height:min(6.5em,20vh)}.wol-learn .vm-ask{font-size:calc(1em * var(--tsr,1));padding:.4em .7em}.wol-learn .vm-opts{gap:.8em}
  .wol-learn .vm-opt .wl-card{--cw:min(9.8em,25vh)}.wol-learn .vm-say{padding:.45em .7em;min-height:2.8em}.wol-learn .vm-face{width:2.2em;height:2.2em}
  .wol-learn .vm-say p{font-size:.98em}.wol-learn .vm-quote{font-size:calc(1.02em * var(--tsr,1));line-height:1.6}.wol-learn .vm-stitle{font-size:1.1em}
  .wol-learn .vm-card{padding:.8em 1.2em;gap:.5em}.wol-learn .vm-card h2{font-size:1.7em}.wol-learn .vm-fan img{width:4em;height:4em}}
@media (max-height:500px){.wol-learn .vm-opt .wl-card{--cw:min(8.4em,25vh)}.wol-learn .vm-nown{display:none}.wol-learn .vm .wl-prog .wl-pnum{display:none}}
`).replace(/\.wol-learn/g, '#wol-learn.wol-learn');
  document.head.appendChild(st);
}

export function mountVerseMatch(root, ctx, opts = {}) {
  injectCss();
  const esc = ctx.esc, kids = !!ctx.kids();
  const u = (k, v) => (v ? fill(U[k][kids ? 1 : 0], v) : U[k][kids ? 1 : 0]);
  const ST = Object.assign({ met: {}, rounds: 0, best: 0 }, ctx.store('versematch') || {});
  if (!ST.met || typeof ST.met !== 'object') ST.met = {};
  const save = () => ctx.store('versematch', ST);
  let alive = true, G = null;
  const offs = [];
  const on = (t, ev, fn) => { t.addEventListener(ev, fn); offs.push(() => t.removeEventListener(ev, fn)); };
  const SRC = new Map(SOURCE_CARDS.map((c) => [c.id, c]));
  const playable = () => SOURCE_CARDS.filter((c) => VERSE_LINKS[c.id] && (!kids || VERSE_LINKS[c.id].kids));
  const metCount = () => SOURCE_CARDS.filter((c) => ST.met[c.id]).length;

  /* ── a round */
  // the cards on the table come from the child's album; with few cards in it, from all cards
  const owned = () => ctx.owned() || {};
  const ownedSpecies = () => Object.keys(owned()).filter((id) => owned()[id] > 0).length;
  function pickPref(ids, n, preferOwn) {
    const ok = ids.filter((id) => ctx.CARD.get(id));
    const own = shuffle(ok.filter((id) => owned()[id])), rest = shuffle(ok.filter((id) => !owned()[id]));
    return (preferOwn ? [...own, ...rest] : shuffle(ok)).slice(0, n);
  }
  function buildItem(src) {
    const V = VERSE_LINKS[src.id], preferOwn = ownedSpecies() >= 12;
    const links = V.links.filter((l) => ctx.CARD.get(l.c));
    const best = links.filter((l) => l.w === 2), more = links.filter((l) => l.w === 1);
    // one card that fits (most often a best one); sometimes a second that fits too, so the child weighs the two
    const first = pickPref((Math.random() < 0.75 || !more.length ? best : more).map((l) => l.c), 1, preferOwn)[0];
    const fits = [first];
    if (links.length > 1 && Math.random() < 0.35) { const two = pickPref(links.map((l) => l.c).filter((c) => c !== first), 1, preferOwn)[0]; if (two) fits.push(two); }
    const others = pickPref(V.pool, 3 - fits.length, preferOwn);
    const cards = shuffle([...fits, ...others]).map((id) => {
      const l = links.find((x) => x.c === id);
      return { id, c: ctx.CARD.get(id), w: l ? l.w : 0, t: l ? (kids ? V.kids.links[id] : l.t) : '', tried: false };
    });
    return { src, V, cards, tries: 0, done: false, shown: -1, pts: 0 };
  }
  function start(ids) {
    const n = kids ? ROUND_KIDS : ROUND;
    let list = ids ? ids.map((id) => SRC.get(id)).filter((c) => c && VERSE_LINKS[c.id]) : null;
    if (!list || !list.length) {
      // the ones met least come first (new ones before old ones), in a fresh order every round
      const all = shuffle(playable()).sort((a, b) => (ST.met[a.id] || 0) - (ST.met[b.id] || 0));
      list = all.slice(0, n);
    }
    G = { items: list.map(buildItem), i: 0, firstTry: 0, pts: 0, fresh: list.filter((c) => !ST.met[c.id]).length };
    ctx.sfx('click');
    render();
  }

  /* ── screens */
  function render() {
    if (!alive) return;
    ctx.setTitle(u('title'));
    if (!G) return renderStart();
    if (G.i >= G.items.length) return renderEnd();
    renderItem();
  }
  function renderStart() {
    const art = ['ant', 'choni', 'yam', 'lion'].map((id) => SOURCE_ART[id]).filter(Boolean);
    root.innerHTML = `<section class="wl-screen vm${kids ? ' vm-kids' : ''}"><div class="vm-card paper">
      <h2>${I_SCROLL}${esc(u('title'))}</h2>
      ${art.length ? `<div class="vm-fan">${art.map((a) => `<img src="${a}" alt="" draggable="false">`).join('')}</div>` : ''}
      <div class="vm-intro">${face('happy')}<p>${esc(u('intro'))}</p></div>
      <span class="vm-met">${esc(u('met', { n: metCount(), all: SOURCE_CARDS.length }))}</span>
      <button class="wl-btn go" data-vm="start">${esc(u('start'))} ${I_NEXT}</button>
    </div></section>`;
  }
  function progHTML() {
    const leaf = ctx.IC.leaf;
    return `<div class="wl-prog">${G.items.map((it, k) => `<span class="wl-pl ${it.done ? (it.pts === 2 ? 'ok' : 'half') : k === G.i ? 'cur' : ''}">${leaf}</span>`).join('')}
      <span class="wl-pnum">${esc(u('of', { i: G.i + 1, n: G.items.length }))}</span></div>`;
  }
  const shownText = (src) => src.quote || String(src.story || '').split('\n').pop();
  const cardName = (c) => (kids ? nameK(c.name) : c.name);
  function chipHTML(o, it) {
    if (!it.done && !o.tried) return '';
    if (o.w === 2) return `<span class="vm-chip ok">${esc(u('chipBest'))}</span>`;
    if (o.w === 1) return `<span class="vm-chip also">${esc(u('chipAlso'))}</span>`;
    return `<span class="vm-chip less">${esc(u('chipLess'))}</span>`;
  }
  // what רובו־דע says about one card on the table
  function lineFor(o, it) {
    if (o.w) return o.t;
    return kids ? it.V.kids.less : `${o.c.short} ${it.V.less}`;
  }
  function sayHTML(it) {
    if (it.shown < 0) return `<div class="vm-say">${face('happy')}<p>${esc(it.done ? u('tapAll') : u('pick'))}</p></div>`;
    const o = it.cards[it.shown];
    const verdict = o.w === 2 ? (it.tries === 1 ? u('best') : u('best2')) : o.w === 1 ? u('also') : u('less');
    let more = '';
    if (!it.done) more = u('tryOther');
    else if (o.w === 1 && it.cards.some((x) => x.w === 2)) more = u('better');
    else if (it.cards.filter((x) => x !== o).length) more = u('tapAll');
    return `<div class="vm-say" aria-live="polite">${face(o.w ? 'wow' : 'think')}<p><b class="v">${esc(verdict)}</b><b>${esc(cardName(o.c))}:</b> ${esc(lineFor(o, it))}${more ? `<small>${esc(more)}</small>` : ''}</p></div>`;
  }
  function renderItem() {
    const it = G.items[G.i], src = it.src, art = SOURCE_ART[src.id], quote = shownText(src);
    const last = G.i >= G.items.length - 1;
    root.innerHTML = `<section class="wl-screen vm${kids ? ' vm-kids' : ''}">
      ${progHTML()}
      <div class="vm-stage">
        <div class="vm-src" style="--sc:${src.col}">
          <span class="vm-sart">${art ? `<img src="${art}" alt="" draggable="false">` : I_SCROLL}</span>
          <div class="vm-stxt"><b class="vm-stitle">${esc(src.title)}</b><p class="vm-quote${quote.length > 150 ? ' long' : ''}">${esc(quote)}</p><span class="vm-ref">${esc(src.ref)}</span></div>
        </div>
        <div class="vm-side">
          <div class="vm-ask">${I_SCROLL}<span>${esc(kids ? it.V.kids.ask : it.V.ask)}</span></div>
          <div class="vm-opts">${it.cards.map((o, k) => {
            const cls = (it.done || o.tried) ? (o.w === 2 ? ' ok' : o.w === 1 ? ' also' : ' less') : '';
            return `<button class="vm-opt${cls}${it.shown === k ? ' sel' : ''}" data-vm="pick" data-k="${k}" aria-label="${esc(cardName(o.c))}" ${!it.done && o.tried ? 'disabled' : ''}>${chipHTML(o, it)}${ctx.cardHTML(o.c)}${owned()[o.id] ? '' : `<span class="vm-nown">${esc(u('notOwn'))}</span>`}</button>`;
          }).join('')}</div>
          ${sayHTML(it)}
          ${it.done ? `<div class="vm-row"><button class="wl-btn ${last ? 'gold' : 'go'}" data-vm="next">${esc(last ? u('results') : u('next'))} ${I_NEXT}</button></div>` : ''}
        </div>
      </div></section>`;
    if (it.done) { const nb = root.querySelector('[data-vm="next"]'); if (nb) setTimeout(() => { try { nb.focus({ preventScroll: true }); } catch (e) { /* */ } }, 40); }
  }
  function pick(k) {
    const it = G && G.items[G.i]; if (!it) return;
    const o = it.cards[k]; if (!o) return;
    if (it.done) { it.shown = k; ctx.sfx('select'); renderItem(); return; }   // after the answer: hear about any card
    if (o.tried) return;
    o.tried = true; it.tries++; it.shown = k;
    if (o.w) {
      it.done = true; it.pts = it.tries === 1 ? 2 : it.tries === 2 ? 1 : 0;
      G.pts += it.pts; if (it.tries === 1) G.firstTry++;
      ST.met[it.src.id] = (ST.met[it.src.id] || 0) + 1; save(); ctx.markUsed && ctx.markUsed('versematch');
      ctx.sfx(it.tries === 1 ? 'quizRight' : 'discover');
      renderItem();
      const b = root.querySelectorAll('.vm-opt')[k]; if (b && it.tries === 1) ctx.confetti(b, 16, ['#f6cf72', '#fff1c4', '#8fd067', it.src.col]);
    } else {
      ctx.sfx('click');
      renderItem();
    }
  }
  function next() {
    const it = G && G.items[G.i]; if (!it || !it.done) return;
    ctx.sfx('click'); G.i++; render();
  }
  function renderEnd() {
    const n = G.items.length, max = n * 2;
    const stars = G.pts >= max - 2 ? 3 : G.pts >= Math.ceil(max * 0.6) ? 2 : 1;
    if (!G.counted) {
      G.counted = true;
      ST.rounds = (ST.rounds || 0) + 1; ST.best = Math.max(ST.best || 0, G.firstTry); save();
      ctx.badge('verse:first');
      if (G.firstTry === n) ctx.badge('verse:perfect');
      if (ST.rounds >= 5) ctx.badge('verse:five');
      if (SOURCE_CARDS.every((c) => !VERSE_LINKS[c.id] || ST.met[c.id])) ctx.badge('verse:all');
      ctx.sfx(stars === 3 ? 'mission' : 'discover');
    }
    const title = stars === 3 ? u('end3') : stars === 2 ? u('end2') : u('end1');
    root.innerHTML = `<section class="wl-screen vm${kids ? ' vm-kids' : ''}"><div class="vm-card paper">
      <div class="vm-stars">${[0, 1, 2].map((k) => `<span class="${k < stars ? 'on' : ''}">${I_STAR}</span>`).join('')}</div>
      <h2>${esc(title)}</h2>
      <p>${esc(u('endLine', { f: G.firstTry, n }))}${G.fresh ? ' ' + esc(u('newMet', { k: G.fresh })) : ''}</p>
      <span class="vm-met">${esc(u('met', { n: metCount(), all: SOURCE_CARDS.length }))}</span>
      <div class="wl-row">
        <button class="wl-btn go" data-vm="again">${icon('again')}${esc(u('again'))}</button>
        <button class="wl-btn" data-vm="album">${icon('album')}${esc(u('album'))}</button>
        <button class="wl-btn" data-vm="home">${icon('learn')}${esc(u('home'))}</button>
      </div></div></section>`;
    if (stars === 3) ctx.later(() => { if (alive) ctx.confetti(root.querySelector('.vm-stars'), 28); }, 400);
  }

  function onClick(e) {
    const t = e.target.closest('[data-vm]'); if (!t || !root.contains(t) || t.disabled) return;
    const a = t.dataset.vm;
    if (a === 'start' || a === 'again') return start();
    if (a === 'pick') return pick(+t.dataset.k);
    if (a === 'next') return next();
    if (a === 'home') { ctx.sfx('click'); return ctx.exit(); }
    if (a === 'album') { ctx.sfx('click'); return ctx.toAlbum('src'); }
  }
  on(root, 'click', onClick);
  if (opts.sources) start(opts.sources); else render();
  try {
    window.__vmDebug = {
      start: (ids) => { start(ids); return G.items.map((it) => it.src.id + ': ' + it.cards.map((o) => (o.w ? '*' + o.w : '') + o.id).join(' ')); },
      pick: (k) => pick(k), next: () => next(),
      // the first card that fits on the table now (or the first that does not, with ok = false)
      find: (ok = true) => { const it = G && G.items[G.i]; return it ? it.cards.findIndex((o) => !!o.w === !!ok && !o.tried) : -1; },
      state: () => (G ? { i: G.i, n: G.items.length, pts: G.pts, firstTry: G.firstTry, done: G.items[G.i] ? G.items[G.i].done : null, met: metCount(), rounds: ST.rounds } : { start: true, met: metCount() }),
    };
  } catch (e) { /* */ }
  return { destroy() { alive = false; offs.forEach((f) => f()); try { if (window.__vmDebug) delete window.__vmDebug; } catch (e) { /* */ } } };
}
