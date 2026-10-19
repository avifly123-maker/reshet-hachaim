// "איך משחקים": a few short cards (a picture from the game's own paintings and one sentence each), shown the first time
// a child enters a place (a zone, the lab) and again from an "איך משחקים" button. Skippable at any card.
// Seen-state lives in localStorage 'web-of-life-howto' ({ [key]: 1 }); storage errors are ignored (the cards then show
// once per visit at most).
//   howto(el, cards, { key, force, onClose, labels }) → { close } | null   (null: this key was seen and force is not set)
//   cards: [{ img, title, text }]   labels: { next, done, skip, close } for vocalised beginner words
//   howtoSeen(key) → boolean
const STORE = 'web-of-life-howto';
const CSS_ID = 'howto-css';
const CSS = `
#howto { position: absolute; inset: 0; z-index: 62; display: grid; place-items: center; pointer-events: auto; direction: rtl; font-family: var(--sans, sans-serif);
  background: rgba(6, 14, 9, .5); animation: howto-in .25s ease-out; }
#howto .howto-box { position: relative; width: min(600px, calc(100vw - 32px)); max-height: calc(100vh - 32px); overflow: auto; box-sizing: border-box; padding: 18px 20px 16px;
  border-radius: 18px; background: #f3ecd6; color: #24301f; box-shadow: 0 0 0 2px rgba(120, 100, 60, .35), 0 14px 34px rgba(0, 0, 0, .45); }
#howto h2.howto-head { margin: 0 0 12px; font-family: var(--serif, serif); font-weight: 400; font-size: 1.5em; color: #1f2c1a; text-align: center; }
#howto .howto-card { display: flex; gap: 18px; align-items: center; min-height: 170px; }
#howto .howto-img { flex: none; width: 170px; height: 170px; border-radius: 16px; overflow: hidden; background: #dfe6cf; box-shadow: 0 0 0 3px #fff8, 0 4px 10px rgba(0, 0, 0, .2); }
#howto .howto-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
#howto .howto-txt { flex: 1; min-width: 0; }
#howto .howto-txt b { display: block; font-size: 1.2em; margin-bottom: 6px; color: #1f2c1a; }
#howto .howto-txt p { margin: 0; font-size: 1.08em; line-height: 1.6; font-weight: 600; color: #33402c; }
#howto .howto-foot { display: flex; align-items: center; gap: 10px; margin-top: 14px; }
#howto .howto-dots { display: flex; gap: 6px; flex: 1; justify-content: center; }
#howto .howto-dots i { width: 9px; height: 9px; border-radius: 50%; background: rgba(60, 70, 40, .25); }
#howto .howto-dots i.on { background: #4f8a3a; width: 22px; border-radius: 6px; }
#howto .howto-foot button.howto-btn { min-height: 44px; padding: 6px 20px; border-radius: 999px; border: 0; font: inherit; font-weight: 800; cursor: pointer; }
#howto .howto-foot button.howto-next { background: #4f8a3a; color: #fff; box-shadow: 0 3px 0 #2f5f22; }
#howto .howto-foot button.howto-next:hover { filter: brightness(1.07); }
#howto .howto-foot button.howto-skip { background: transparent; color: #5a5a40; }
#howto .howto-foot button.howto-skip:hover { background: rgba(0, 0, 0, .06); }
#howto .howto-foot button.howto-btn:focus-visible { outline: 3px solid #e6a93c; outline-offset: 2px; }
@media (max-width: 560px), (max-height: 470px) {
  #howto .howto-box { padding: 12px 14px 12px; } #howto h2.howto-head { font-size: 1.25em; margin-bottom: 8px; }
  #howto .howto-card { min-height: 120px; gap: 12px; } #howto .howto-img { width: 120px; height: 120px; }
  #howto .howto-txt p { font-size: 1em; line-height: 1.5; } #howto .howto-foot { margin-top: 10px; } }
@media (max-width: 420px) { #howto .howto-card { flex-direction: column; text-align: center; } }
@keyframes howto-in { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { #howto { animation: none; } }
`;

function read() { try { return JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { return {}; } }
function mark(key) { try { const s = read(); s[key] = 1; localStorage.setItem(STORE, JSON.stringify(s)); } catch (e) { /* no storage: fine */ } }
export const howtoSeen = (key) => !!read()[key];
export function markHowto(key, on = true) {
  if (on) { mark(key); return; }
  try { const s = read(); delete s[key]; localStorage.setItem(STORE, JSON.stringify(s)); } catch (e) { /* no storage: fine */ }
}
// a small round "?" replay button (the research centre uses it)
const REPLAY_CSS = `.howto-replay.howto-replay { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 16px; border: 0; cursor: pointer; font: inherit; color: #f6edd0; background: rgba(0, 0, 0, .3); box-shadow: inset 0 0 0 1.5px rgba(240, 220, 160, .45); }
.howto-replay b { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: #f6cf72; color: #3a2410; font-size: .9em; }`;
export function howtoButton(label = 'אֵיךְ מְשַׂחֲקִים') {
  if (!document.getElementById('howto-replay-css')) { const st = document.createElement('style'); st.id = 'howto-replay-css'; st.textContent = REPLAY_CSS; document.head.appendChild(st); }
  return `<button type="button" class="howto-replay"><b>?</b><span>${esc(label)}</span></button>`;
}
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function howto(el, cards, { key = 'general', force = false, onClose = null, onDone = null, labels = {}, title = null } = {}) {
  if (!onClose && onDone) onClose = onDone;
  if (!title) title = labels.title || 'איך משחקים?';
  if (!el || !cards || !cards.length) return null;
  if (!force && howtoSeen(key)) return null;
  if (!document.getElementById(CSS_ID)) { const st = document.createElement('style'); st.id = CSS_ID; st.textContent = CSS; document.head.appendChild(st); }
  const L = { next: 'הבא', done: 'מתחילים!', skip: 'דלגו', ...labels };
  const wrap = document.createElement('div');
  wrap.className = 'howto'; wrap.id = 'howto'; wrap.lang = 'he'; wrap.dir = 'rtl';
  wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true'); wrap.setAttribute('aria-label', title);
  el.appendChild(wrap);
  let i = 0, closed = false;
  function paint() {
    const c = cards[i], last = i === cards.length - 1;
    wrap.innerHTML = `<div class="howto-box"><h2 class="howto-head">${esc(title)}</h2>
      <div class="howto-card">${c.img ? `<span class="howto-img"><img src="${esc(c.img)}" alt="" draggable="false"></span>` : ''}
        <div class="howto-txt">${c.title ? `<b>${esc(c.title)}</b>` : ''}<p>${esc(c.text)}</p></div></div>
      <div class="howto-foot"><button type="button" class="howto-btn howto-skip" data-h="skip">${esc(L.skip)}</button>
        <span class="howto-dots" aria-hidden="true">${cards.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</span>
        <button type="button" class="howto-btn howto-next" data-h="next">${esc(last ? L.done : L.next)}</button></div></div>`;
    const b = wrap.querySelector('[data-h="next"]'); if (b) requestAnimationFrame(() => { try { b.focus({ preventScroll: true }); } catch (e) { } });
  }
  function close() {
    if (closed) return; closed = true;
    mark(key); wrap.remove(); removeEventListener('keydown', onKey, true);
    if (onClose) { try { onClose(); } catch (e) { console.error(e); } }
  }
  function next() { if (i < cards.length - 1) { i++; paint(); } else close(); }
  wrap.addEventListener('click', (e) => { const b = e.target.closest('[data-h]'); if (!b) return; if (b.dataset.h === 'skip') close(); else next(); });
  ['pointerdown', 'pointerup', 'wheel'].forEach((ev) => wrap.addEventListener(ev, (e) => e.stopPropagation()));   // the island under it stays still
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 'ArrowLeft' || e.key === 'Enter') { if (e.key === 'ArrowLeft' || !e.target.closest || !e.target.closest('button')) { e.preventDefault(); e.stopPropagation(); next(); } }
    else if (e.key === 'ArrowRight' && i > 0) { e.preventDefault(); e.stopPropagation(); i--; paint(); }
  }
  addEventListener('keydown', onKey, true);
  paint();
  return { close, get open() { return !closed; } };
}
