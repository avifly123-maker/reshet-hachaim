// "איך משחקים": a few short cards (a picture and one sentence each) shown the first time a child enters a place, and
// again from a replay button. Small and reusable: the research centre uses it, and so can the building zones and the lab.
//
//   import { howto, howtoSeen, howtoButton } from '../ui/howto.js';
//   howto(el, cards, { key: 'research' })              shows the cards unless this key was seen; returns a handle or null
//   howto(el, cards, { key: 'research', force: true }) shows them again (the replay button)
//   cards: [{ img: <url>, text: 'one sentence', title?: 'short heading' }]
//   options: { key, force, onDone, labels: { next, back, skip, done, title }, kids }
//   handle: { close() }
//   howtoButton(label) → the HTML of a small round "?" replay button (class "howto-replay")
//
// "Seen" is kept per device under its own storage key, web-of-life-howto ({ <key>: <time> }); a blocked or full storage
// only means the cards show again. Fully RTL. The default labels are vocalised, so beginners can read them too.

const STORE = 'web-of-life-howto';
const LABELS = { next: 'הַבָּא', back: 'הַקּוֹדֵם', skip: 'דִּלּוּג', done: 'מַתְחִילִים!', title: 'אֵיךְ מְשַׂחֲקִים?' };

function readSeen() { try { const o = JSON.parse(localStorage.getItem(STORE) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
export function howtoSeen(key) { return !!readSeen()[key]; }
export function markHowto(key, on = true) {
  try { const o = readSeen(); if (on) o[key] = Date.now(); else delete o[key]; localStorage.setItem(STORE, JSON.stringify(o)); } catch (e) { /* storage blocked: shown again next time */ }
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CSS = `
.howto { position: absolute; inset: 0; z-index: 90; display: grid; place-items: center; pointer-events: auto; direction: rtl; font-family: inherit; opacity: 0; transition: opacity .25s; }
.howto.on { opacity: 1; }
.howto-scrim { position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(8, 18, 12, .5), rgba(4, 10, 6, .82)); }
.howto-card { position: relative; width: min(440px, calc(100vw - 32px)); max-height: calc(100vh - 24px); overflow: auto; padding: 16px 18px 14px; border-radius: 10px; text-align: center; color: #2a2418;
  background: radial-gradient(circle at 50% 0, #fffaf0, #f3e8cc 75%); box-shadow: 0 18px 40px rgba(0, 0, 0, .5), inset 0 0 0 1px #c9b98a, inset 0 0 0 5px #f8f0d8, inset 0 0 0 6px #d8c79a; }
.howto-head { margin: 0 0 8px; font-size: 1.05em; color: #6a5a30; letter-spacing: .02em; }
.howto-pic { display: block; width: min(220px, 52vw, 34vh); aspect-ratio: 1; margin: 0 auto 10px; border-radius: 50%; object-fit: cover; border: 4px solid #fff; box-shadow: 0 4px 14px rgba(0, 0, 0, .25); background: #efe3c4; }
.howto-title { margin: 0 0 4px; font-size: 1.35em; color: #2c4f26; line-height: 1.4; }
.howto-text { margin: 0 0 12px; font-size: 1.15em; line-height: 1.8; min-height: 2.4em; }
.howto-dots { display: flex; justify-content: center; gap: 6px; margin: 0 0 12px; }
.howto-dots i { width: 9px; height: 9px; border-radius: 50%; background: #d8c9a2; }
.howto-dots i.on { background: #4f8a3f; transform: scale(1.25); }
.howto-btns { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.howto-btns button { min-height: 36px; padding: 6px 16px; border-radius: 18px; font: inherit; font-size: 1em; cursor: pointer; border: 0; }
.howto-btns .howto-next { color: #f1f6e2; background: linear-gradient(180deg, #4f8a3f, #2c5a24); box-shadow: 0 3px 0 #173512; }
.howto-btns .howto-back { color: #4a3a20; background: #efe2bf; box-shadow: 0 2px 0 #b9a77a; }
.howto-btns .howto-back[disabled] { visibility: hidden; }
.howto-btns .howto-skip { color: #6a5a40; background: transparent; text-decoration: underline; text-underline-offset: 3px; }
.howto-replay.howto-replay { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 16px; border: 0; cursor: pointer; font: inherit; color: #f6edd0; background: rgba(0, 0, 0, .3); box-shadow: inset 0 0 0 1.5px rgba(240, 220, 160, .45); }
.howto-replay b { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: #f6cf72; color: #3a2410; font-size: .9em; }
@media (max-height: 520px) { .howto-pic { width: min(150px, 30vh); margin-bottom: 6px; } .howto-text { font-size: 1.05em; line-height: 1.6; margin-bottom: 8px; } .howto-card { padding: 10px 14px; } }
`;
function ensureCss() {
  if (typeof document === 'undefined' || document.getElementById('howto-css')) return;
  // every rule also comes with "#ui " in front, so the game's own button styles (#ui.wol button) do not win over it
  const css = CSS.replace(/(^|[{}]\s*)(\.howto[^{}]*)\{/gm, (_, pre, sel) => `${pre}${sel.split(',').map((x) => `#ui ${x.trim()}, ${x.trim()}`).join(', ')} {`);
  const s = document.createElement('style'); s.id = 'howto-css'; s.textContent = css; document.head.appendChild(s);
}

export function howtoButton(label = 'אֵיךְ מְשַׂחֲקִים') { ensureCss(); return `<button type="button" class="howto-replay"><b>?</b><span>${esc(label)}</span></button>`; }

export function howto(el, cards, opts = {}) {
  const { key, force = false, onDone } = opts;
  const L = { ...LABELS, ...(opts.labels || {}) };
  if (!el || !cards || !cards.length) return null;
  if (!force && key && howtoSeen(key)) return null;
  ensureCss();
  const root = document.createElement('div');
  root.className = 'howto'; root.setAttribute('dir', 'rtl'); root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
  el.appendChild(root);
  let i = 0, closed = false;
  function render() {
    const c = cards[i], last = i === cards.length - 1;
    root.innerHTML = `<div class="howto-scrim"></div><div class="howto-card">
      <p class="howto-head">${esc(L.title)}</p>
      ${c.img ? `<img class="howto-pic" src="${c.img}" alt="" draggable="false">` : ''}
      ${c.title ? `<h3 class="howto-title">${esc(c.title)}</h3>` : ''}
      <p class="howto-text">${esc(c.text)}</p>
      <div class="howto-dots">${cards.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
      <div class="howto-btns"><button type="button" class="howto-back"${i ? '' : ' disabled'}>${esc(L.back)}</button>
        ${last ? '<span></span>' : `<button type="button" class="howto-skip">${esc(L.skip)}</button>`}
        <button type="button" class="howto-next">${esc(last ? L.done : L.next)}</button></div></div>`;
  }
  function close() {
    if (closed) return; closed = true;
    if (key) markHowto(key);
    document.removeEventListener('keydown', onKey, true);
    root.classList.remove('on'); setTimeout(() => root.remove(), 260);
    if (onDone) onDone();
  }
  function go(d) { const n = i + d; if (n < 0) return; if (n >= cards.length) { close(); return; } i = n; render(); }
  function onKey(e) {
    // RTL: the left arrow goes forward
    if (e.key === 'Escape') { e.stopPropagation(); close(); } else if (e.key === 'ArrowLeft' || e.key === 'Enter') { e.stopPropagation(); go(1); } else if (e.key === 'ArrowRight') { e.stopPropagation(); go(-1); }
  }
  root.addEventListener('click', (e) => {
    e.stopPropagation();
    if (e.target.closest('.howto-next')) go(1);
    else if (e.target.closest('.howto-back')) go(-1);
    else if (e.target.closest('.howto-skip')) close();
  });
  document.addEventListener('keydown', onKey, true);
  render();
  requestAnimationFrame(() => root.classList.add('on'));
  return { close };
}
