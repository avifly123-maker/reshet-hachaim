// רובו־דע the guide (1.3.2): he presents every new part of the game, explains each station the first time, and
// answers "what now?" – in short bubbles, one idea each, and in his own voice (src/audio/voice.js).
//
//   const guide = createGuide(root, { voice });   // one per page (main.js); exposed as window.__guide
//   guide.say(lines, opts) → Promise<'done'|'skip'|actionId>
//       lines: [{ id, f, k, at?, expr? }]   f = the words, k = the beginners' words (full nikud), id = the voice line,
//                                            at = a CSS selector or element to point at (a soft ring around it),
//                                            expr = 'normal'|'happy'|'curious'|'wow'|'oops'
//       opts:  { key, force, modal, actions: [{ id, label, kind }], place: 'corner'|'center', onClose }
//              key: shown once per player (core/journey.js markIntro / introSeen); force: show again anyway
//              modal: dim the screen behind (a new part being presented); actions: buttons on the last bubble
//   guide.intro(part, opts)       the lines of src/data/guide-lines.js GUIDE[part], once per player
//   guide.tip(line, opts)         one bubble that closes by itself after a while (no buttons but a close)
//   guide.close(match?), guide.isOpen()   close everything, or only one request (its promise, or { key }), or the
//                                          requests made in a place ({ scene: 'game' }); a dropped request resolves 'abort'
//   guide.setScene('game'|'app')          main.js: a forest runs / no forest (requests remember where they were made)
// Several requests wait in a queue: one bubble set at a time. Everything is RTL; the figure sits at the bottom right.
import { drawRoboFace, ROBO_SVG, VISOR } from './robo-face.js';
import { introSeen, markIntro, playMode } from '../core/journey.js';
import { GUIDE } from '../data/guide-lines.js';

const CSS_ID = 'robo-guide-css';
const RING_CHECK_MS = 500;   // how often the ring looks whether its element is still there
const TRAY_GAP_PX = 8;        // in a forest a tip sits this far above the tray (its cards stay free to click)
const WAVE_MS = 2600;         // he waves at the start of a set of bubbles
const NEXT_SET_MS = 250;      // a breath before the next request in the queue
const TIP_MS = 9000;          // a tip closes by itself after this (opts.ms changes it)
const CSS = `
#ui #rguide { position: absolute; inset: 0; z-index: 70; pointer-events: none; direction: rtl; font-family: var(--sans, sans-serif); }
#ui #rguide.modal { pointer-events: auto; background: rgba(6, 14, 9, .55); animation: rg-fade .25s ease-out; }
#ui #rguide .rg-wrap { position: absolute; right: max(12px, 2vw); bottom: max(10px, 2vh); display: flex; align-items: flex-end; gap: 10px; pointer-events: none; max-width: min(760px, calc(100vw - 24px)); }
#ui #rguide.center .rg-wrap { right: 50%; bottom: 50%; transform: translate(50%, 50%); }
#ui #rguide .rg-fig { position: relative; flex: none; width: clamp(92px, 13vw, 150px); aspect-ratio: 200 / 240; animation: rg-bob 3.2s ease-in-out infinite; filter: drop-shadow(0 6px 10px rgba(0,0,0,.35)); }
#ui #rguide .rg-fig svg, #ui #rguide .rg-fig img.rg-pic { position: absolute; inset: 0; width: 100%; height: 100%; }
#ui #rguide .rg-fig.art { width: clamp(104px, 13.5vw, 168px); aspect-ratio: 300 / 446; }
#ui #rguide .rg-fig .rg-fr { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; }
#ui #rguide .rg-fig .rg-fr.on { opacity: 1; }
#ui #rguide .rg-fig canvas { position: absolute; left: ${(VISOR.x / 200 * 100).toFixed(2)}%; top: ${(VISOR.y / 240 * 100).toFixed(2)}%; width: ${(VISOR.w / 200 * 100).toFixed(2)}%; height: ${(VISOR.h / 240 * 100).toFixed(2)}%; border-radius: 22%; }
#ui #rguide .rg-fig.talk { animation: rg-bob 3.2s ease-in-out infinite, rg-talk .35s ease-in-out infinite; }
#ui #rguide .rg-bub { position: relative; pointer-events: auto; margin-bottom: clamp(30px, 6vh, 60px); min-width: 240px; max-width: 520px; padding: 14px 18px 12px; border-radius: 20px; background: #fbf6e6; color: #1f2c1a;
  box-shadow: 0 0 0 2px rgba(44, 154, 146, .55), 0 12px 28px rgba(0, 0, 0, .4); }
#ui #rguide .rg-bub::after { content: ""; position: absolute; right: -10px; bottom: 26px; border: 10px solid transparent; border-left-color: #fbf6e6; border-right: 0; filter: drop-shadow(2px 0 0 rgba(44,154,146,.55)); }
#ui #rguide .rg-name { display: block; font-size: calc(.8em * var(--ts, 1)); font-weight: 800; color: #1f7f78; margin-bottom: 4px; letter-spacing: .02em; }
#ui #rguide .rg-txt { margin: 0; font-size: calc(1.22em * var(--ts, 1)); line-height: 1.55; font-weight: 700; }
#ui #rguide .rg-foot { display: flex; align-items: center; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
#ui #rguide .rg-dots { display: flex; gap: 5px; flex: 1; }
#ui #rguide .rg-dots i { width: 8px; height: 8px; border-radius: 50%; background: rgba(31, 127, 120, .25); }
#ui #rguide .rg-dots i.on { width: 20px; border-radius: 6px; background: #1f7f78; }
#ui #rguide button { font: inherit; font-size: calc(1em * var(--ts, 1)); cursor: pointer; border: 0; border-radius: 999px; min-height: 42px; padding: 6px 18px; font-weight: 800; }
#ui #rguide .rg-act { background: #e9e2c8; color: #2c3a26; }
#ui #rguide .rg-next, #ui #rguide .rg-act.primary { background: #2c9a92; color: #fff; box-shadow: 0 3px 0 #1d6b65; }
#ui #rguide .rg-skip { background: transparent; color: #5a5a40; padding: 6px 10px; }
#ui #rguide .rg-say { background: transparent; color: #1f7f78; padding: 6px 8px; min-width: 42px; }
#ui #rguide .rg-say svg { width: 22px; height: 22px; display: block; }
#ui #rguide button:focus-visible { outline: 3px solid #e6a93c; outline-offset: 2px; }
#ui #rguide .rg-ring { position: fixed; border-radius: 16px; pointer-events: none; box-shadow: 0 0 0 4px #ffd166, 0 0 0 9px rgba(255, 209, 102, .35), 0 0 24px 8px rgba(255, 209, 102, .5); animation: rg-pulse 1.4s ease-in-out infinite; transition: all .25s ease; }
#ui #rguide.tip .rg-bub { min-width: 200px; }
@keyframes rg-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
@keyframes rg-talk { 0%,100% { rotate: 0deg; } 50% { rotate: -1.5deg; } }
@keyframes rg-pulse { 0%,100% { opacity: 1; } 50% { opacity: .55; } }
@keyframes rg-fade { from { opacity: 0; } to { opacity: 1; } }
@media (max-height: 520px) { #ui #rguide .rg-txt { font-size: calc(1.05em * var(--ts, 1)); } #ui #rguide .rg-bub { padding: 10px 14px 9px; margin-bottom: 18px; } #ui #rguide .rg-fig, #ui #rguide .rg-fig.art { width: 84px; } }
@media (max-width: 560px) { #ui #rguide .rg-bub { min-width: 0; } }
@media (prefers-reduced-motion: reduce) { #ui #rguide .rg-fig, #ui #rguide .rg-fig.talk, #ui #rguide .rg-ring { animation: none; } }
`;
const SPEAKER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function createGuide(root, { voice = null, portrait = null } = {}) {
  if (!document.getElementById(CSS_ID)) { const st = document.createElement('style'); st.id = CSS_ID; st.textContent = CSS; document.head.appendChild(st); }
  const el = document.createElement('div'); el.id = 'rguide'; el.hidden = true; root.appendChild(el);
  const queue = []; let cur = null, raf = 0, blinkT = 0, nextBlink = 2.5, last = 0, synthTalk = 0, tipTimer = 0;
  // where the child is: 'game' while a forest (or a mystery's island) runs, set by main.js. Each request keeps the place
  // it was made in, so leaving a forest closes the forest's bubbles only (close({ scene: 'game' })).
  let scene = 'app', ringAt = null, ringCheck = 0;
  let pic = portrait, art = null;
  // his rendered portraits (src/data/robo-art.js, made from the lab's model): loaded the first time he appears
  const artP = import('../data/robo-art.js').then((m) => { art = m.ROBO_ART; if (cur) render(); }, () => { });
  const kidsNow = () => playMode() === 'kids';
  const words = (ln) => (kidsNow() && ln.k ? ln.k : ln.f);

  function render() {
    const c = cur; if (!c) return;
    const ln = c.lines[c.i]; const lastOne = c.i === c.lines.length - 1; const kids = kidsNow();
    el.className = (c.opts.modal ? 'modal ' : '') + (c.opts.place === 'center' ? 'center ' : '') + (c.opts.tip ? 'tip' : '');
    const acts = lastOne && c.opts.actions && c.opts.actions.length ? c.opts.actions : null;
    el.innerHTML = `<div class="rg-wrap" role="dialog" aria-live="polite" aria-label="רובו־דע">
      <div class="rg-fig${art ? ' art' : ''}">${art ? Object.entries(art.frames).map(([k, src]) => `<img class="rg-fr" data-fr="${k}" src="${src}" alt="" draggable="false">`).join('') : `${pic ? `<img class="rg-pic" src="${pic}" alt="">` : ROBO_SVG}<canvas width="512" height="256"></canvas>`}</div>
      <div class="rg-bub"><span class="rg-name">${kids ? 'רוֹבּוֹ־דַּע' : 'רובו־דע'}</span><p class="rg-txt">${esc(words(ln))}</p>
        <div class="rg-foot">${c.lines.length > 1 ? `<span class="rg-dots">${c.lines.map((_, j) => `<i class="${j === c.i ? 'on' : ''}"></i>`).join('')}</span>` : '<span class="rg-dots"></span>'}
          ${ln.id ? `<button class="rg-say" data-g="say" aria-label="${kids ? 'לִשְׁמֹעַ שׁוּב' : 'לשמוע שוב'}" title="${kids ? 'לִשְׁמֹעַ שׁוּב' : 'לשמוע שוב'}">${SPEAKER}</button>` : ''}
          ${acts ? acts.map((a, j) => `<button class="rg-act${a.kind === 'primary' || (!a.kind && j === 0) ? ' primary' : ''}" data-act="${esc(a.id)}">${esc(a.label)}</button>`).join('')
            : `<button class="rg-next" data-g="next">${lastOne ? (c.opts.tip ? (kids ? 'הָבַנְתִּי' : 'הבנתי') : (kids ? 'סִיּוּם' : 'סיום')) : (kids ? 'הַבָּא' : 'הבא')}</button>`}
          ${!lastOne && !c.opts.tip ? `<button class="rg-skip" data-g="skip">${kids ? 'דַּלֵּג' : 'דלג'}</button>` : ''}</div></div></div>`;
    placeRing(ln.at); placeWrap();
    synthTalk = Math.min(4, 0.9 + words(ln).length / 22);   // the mouth moves a little even without sound
    if (voice && ln.id && c.spokenI !== c.i) { c.spokenI = c.i; voice.say(ln.id).catch(() => { }); }
    const btn = el.querySelector('.rg-next, .rg-act'); try { btn && btn.focus({ preventScroll: true }); } catch (e) { }
  }
  // an element the child can see now (a ring around a removed or hidden one would float over nothing)
  function shown(t) {
    if (!t || !t.isConnected || !t.getBoundingClientRect || t.closest('[hidden]')) return false;
    const r = t.getBoundingClientRect(); if (!r.width && !r.height) return false;
    const cs = getComputedStyle(t); return cs.visibility !== 'hidden' && cs.display !== 'none';
  }
  // in a forest a tip (not a modal presentation) sits above the tray, so the cards and their prices stay free
  function placeWrap() {
    const w = el.querySelector('.rg-wrap'); if (!w || !cur) return;
    w.style.bottom = '';
    if (cur.scene !== 'game' || cur.opts.modal || cur.opts.place === 'center') return;
    const tray = document.querySelector('#ui .tray'); if (!shown(tray)) return;
    const top = tray.getBoundingClientRect().top; if (top <= 0 || top >= innerHeight) return;
    w.style.bottom = Math.round(innerHeight - top + TRAY_GAP_PX) + 'px';
  }
  function placeRing(at) {
    const old = el.querySelector('.rg-ring'); if (old) old.remove();
    ringAt = null;
    if (!at) return;
    const t = typeof at === 'string' ? document.querySelector(at) : at; if (!shown(t)) return;
    ringAt = t; const r = t.getBoundingClientRect();
    const ring = document.createElement('i'); ring.className = 'rg-ring';
    ring.style.cssText = `left:${r.left - 6}px;top:${r.top - 6}px;width:${r.width + 12}px;height:${r.height + 12}px`;
    el.appendChild(ring);
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
    const fig = el.querySelector('.rg-fig'); if (!fig || !cur) return;
    // the ringed thing went away (a forest closed, a panel changed): the ring goes too
    if (ringAt && now - ringCheck > RING_CHECK_MS) { ringCheck = now; if (!shown(ringAt)) placeRing(null); }
    const cv = fig.querySelector('canvas');
    blinkT += dt; let blink = 0;
    if (blinkT > nextBlink) { const k = (blinkT - nextBlink) / 0.16; blink = k < 1 ? Math.sin(k * Math.PI) : 0; if (k >= 1) { blinkT = 0; nextBlink = 2 + Math.random() * 3; } }
    synthTalk = Math.max(0, synthTalk - dt);
    const vl = voice && voice.speaking ? voice.level() : 0;
    const talk = vl > 0 ? vl : (synthTalk > 0 && !(voice && voice.speaking) ? (0.5 + 0.5 * Math.sin(now / 70)) * 0.6 : 0);
    el.querySelector('.rg-fig').classList.toggle('talk', talk > 0.05);
    const ln = cur.lines[cur.i] || {};
    const expr = ln.expr || (cur.i === 0 ? 'happy' : 'normal');
    if (cv) { drawRoboFace(cv.getContext('2d'), expr, blink, talk); return; }
    // the rendered portraits: he waves on the first bubble of a set, blinks, and his mouth follows the voice
    const pose = cur.i === 0 && !cur.opts.tip && (now - cur.t0) < WAVE_MS ? 'wave' : 'idle';
    let k = blink > 0.5 ? 'blink' : talk > 0.05 ? (talk > 0.55 ? 'talk2' : 'talk1') : expr;
    if (pose === 'wave' && !['blink', 'talk1', 'talk2'].includes(k)) k = 'happy';
    const want = art.frames[pose + '-' + k] ? pose + '-' + k : 'idle-' + (art.frames['idle-' + k] ? k : 'normal');
    if (fig.dataset.on !== want) { fig.dataset.on = want; fig.querySelectorAll('.rg-fr').forEach((im) => im.classList.toggle('on', im.dataset.fr === want)); }
  }
  function finish(result) {
    const c = cur; if (!c) return;
    cur = null; clearTimeout(tipTimer);
    if (voice) voice.stop();
    if (c.opts.key && result !== 'abort') markIntro(c.opts.key);
    el.hidden = true; el.innerHTML = ''; el.className = ''; cancelAnimationFrame(raf); raf = 0;   // no '.modal' left on a hidden guide (others ask for #rguide.modal)
    try { c.opts.onClose && c.opts.onClose(result); } catch (e) { console.error(e); }
    c.resolve(result);
    if (queue.length) setTimeout(pump, NEXT_SET_MS);
  }
  function pump() {
    if (cur || !queue.length) return;
    cur = queue.shift(); cur.i = 0; cur.t0 = performance.now(); el.hidden = false; last = 0; render();
    if (!raf) raf = requestAnimationFrame(loop);
    if (cur.opts.tip) { clearTimeout(tipTimer); tipTimer = setTimeout(() => finish('done'), cur.opts.ms || TIP_MS); }
  }
  el.addEventListener('click', (e) => {
    if (!cur) return;
    const a = e.target.closest('[data-act]'); if (a) { finish(a.dataset.act); return; }
    const g = e.target.closest('[data-g]'); if (!g) { if (e.target === el && cur.opts.modal) { /* a click outside does nothing: the child chooses */ } return; }
    if (g.dataset.g === 'say') { const ln = cur.lines[cur.i]; if (voice && ln.id) voice.say(ln.id); synthTalk = 2; return; }
    if (g.dataset.g === 'skip') { finish('skip'); return; }
    if (g.dataset.g === 'next') { if (cur.i < cur.lines.length - 1) { cur.i++; render(); } else finish('done'); }
  });
  addEventListener('keydown', (e) => {
    if (!cur) return;
    // a stage film on top takes its own Escape (its listener comes after this one: it ends the film, not this bubble)
    if (e.key === 'Escape' && !document.querySelector('.ss')) { e.stopPropagation(); finish('skip'); }
  }, true);
  addEventListener('resize', () => { if (cur) { placeRing(cur.lines[cur.i].at); placeWrap(); } });

  function say(lines, opts = {}) {
    lines = (lines || []).filter((l) => l && (l.f || l.k)); if (!lines.length) return Promise.resolve('none');
    if (opts.key && !opts.force && introSeen(opts.key)) return Promise.resolve('seen');
    if (opts.key && (queue.some((q) => q.opts.key === opts.key) || (cur && cur.opts.key === opts.key))) return Promise.resolve('queued');
    const item = { lines, opts, resolve: null, scene: opts.scene || scene };
    const p = new Promise((resolve) => { item.resolve = resolve; });
    item.promise = p; queue.push(item); pump();
    return p;
  }
  // close what matches (nothing given: everything). A match is the promise say() / intro() / tip() returned, or
  // { key } – so a screen closes only its own bubble. Every dropped request resolves with 'abort'.
  function close(match) {
    const hit = (q) => match == null || q.promise === match || (match && match.key != null && q.opts.key === match.key) || (match && match.scene != null && q.scene === match.scene);
    for (let i = queue.length - 1; i >= 0; i--) if (hit(queue[i])) { const q = queue.splice(i, 1)[0]; try { q.resolve('abort'); } catch (e) { } }
    if (cur && hit(cur)) finish('abort');
  }
  const intro = (part, opts = {}) => say(GUIDE[part] || [], { key: 'g:' + part, ...opts });
  const tip = (line, opts = {}) => say([line], { tip: true, ...opts });
  const G = {
    say, intro, tip,
    close,
    setScene: (s) => { scene = s || 'app'; },
    isOpen: () => !!cur,
    setPortrait: (src) => { pic = src || null; if (cur) render(); },
    lines: (part) => GUIDE[part] || [],
  };
  window.__guide = G;
  return G;
}
