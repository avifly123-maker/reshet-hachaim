// On-screen camera pad for young players: big round buttons to turn, tilt and zoom the view, plus "back to the whole island".
// Click = one smooth step, press-and-hold = continuous motion. Works with the rig from world/camera.js (rig.nudge / rig.hold).
// Usage: const pad = createCameraPad(document.getElementById('ui'), rig); pad.setVisible(true); … pad.dispose();
const CSS_ID = 'camera-pad-css';
const CSS = `
/* a brass-and-canopy compass rose: turn (west/east), tilt (north/south), home in the middle, zoom on the side; folds to one button */
.cam-pad { position: absolute; left: 10px; bottom: calc(var(--trayH, 140px) + 48px); z-index: 30; display: flex; gap: 4px; align-items: center;
  direction: ltr; pointer-events: auto; user-select: none; -webkit-user-select: none; touch-action: none; transition: opacity .25s, transform .25s; }
.cam-pad.cp-hidden { opacity: 0; transform: translateY(10px); pointer-events: none; visibility: hidden; transition: opacity .25s, transform .25s, visibility 0s .25s; }
/* the species info panel reaches down to the tray: the pad would cover its relations list and buttons, so it steps aside while the panel is open */
#ui.sp-open .cam-pad { opacity: 0; transform: translateY(10px); pointer-events: none; visibility: hidden; transition: opacity .25s, transform .25s, visibility 0s .25s; }
.cam-pad .cp-rose { position: relative; display: grid; grid-template: repeat(3, 32px) / repeat(3, 32px); gap: 2px; padding: 6px; border-radius: 50%;
  background: #11241a; box-shadow: 0 0 0 1.5px rgba(180, 203, 102, .45), 0 0 0 5px rgba(17, 36, 26, .55), 0 6px 14px rgba(0, 0, 0, .35); }
.cam-pad .cp-rose::before { content: ""; position: absolute; inset: 9px; border-radius: 50%; pointer-events: none;
  background: repeating-conic-gradient(from -4deg, rgba(233, 230, 204, .28) 0 8deg, transparent 8deg 45deg); -webkit-mask: radial-gradient(circle, transparent 60%, #000 61%, #000 70%, transparent 71%); mask: radial-gradient(circle, transparent 60%, #000 61%, #000 70%, transparent 71%); }
.cam-pad .cp-zoom { display: flex; flex-direction: column; gap: 4px; padding: 4px; border-radius: 18px; background: #11241a; box-shadow: 0 0 0 1.5px rgba(180, 203, 102, .45), 0 6px 14px rgba(0, 0, 0, .35); }
.cam-pad .cp-btn { position: relative; width: 32px; height: 32px; padding: 0; margin: 0; border: 0; border-radius: 50%; cursor: pointer; display: grid; place-items: center;
  background: transparent; color: #e9e6cc; transition: background .15s, transform .1s, color .15s; -webkit-tap-highlight-color: transparent; }
.cam-pad .cp-btn svg { width: 21px; height: 21px; display: block; pointer-events: none; }
.cam-pad .cp-btn:hover { background: rgba(233, 230, 204, .12); color: #fff; }
.cam-pad .cp-btn.cp-on, .cam-pad .cp-btn:active { transform: scale(.9); background: #b4cb66; color: #17300e; }
.cam-pad .cp-btn:focus-visible, .cam-pad .cp-fold:focus-visible { outline: 3px solid #e6a93c; outline-offset: 2px; }
.cam-pad [data-id="up"] { grid-area: 1 / 2; } .cam-pad [data-id="rotL"] { grid-area: 2 / 1; } .cam-pad [data-id="home"] { grid-area: 2 / 2; }
.cam-pad [data-id="rotR"] { grid-area: 2 / 3; } .cam-pad [data-id="side"] { grid-area: 3 / 2; }
.cam-pad .cp-home { background: #e6a93c; color: #2e1d05; border-radius: 50% 50% 50% 50% / 56% 56% 44% 44%; }
.cam-pad .cp-home:hover { background: #f0b950; color: #2e1d05; }
.cam-pad .cp-fold { align-self: flex-end; width: 26px; height: 26px; border: 0; padding: 0; border-radius: 50%; cursor: pointer; display: grid; place-items: center;
  background: #11241a; color: #b4cb66; box-shadow: 0 0 0 1.5px rgba(180, 203, 102, .45); }
.cam-pad .cp-fold svg { width: 16px; height: 16px; }
.cam-pad.cp-folded .cp-rose, .cam-pad.cp-folded .cp-zoom { display: none; }
.cam-pad.cp-folded .cp-fold { width: 42px; height: 42px; color: #e6a93c; box-shadow: 0 0 0 1.5px rgba(180, 203, 102, .55), 0 0 0 4px rgba(17, 36, 26, .6), 0 4px 10px rgba(0, 0, 0, .35); }
.cam-pad.cp-folded .cp-fold svg { width: 26px; height: 26px; }
.cam-pad .cp-btn::after, .cam-pad .cp-fold::after { content: attr(data-tip); position: absolute; bottom: calc(100% + 9px); left: 50%; transform: translateX(-50%) translateY(4px); z-index: 2;
  direction: rtl; white-space: nowrap; font: 700 14px/1.2 "wol-text", "Segoe UI", "Arial Hebrew", Arial, sans-serif; color: #1e2a1c;
  background: #e2dfc4; padding: 5px 9px; border-radius: 3px; box-shadow: 0 3px 8px rgba(0, 0, 0, .35); opacity: 0; pointer-events: none; transition: opacity .15s, transform .15s; }
.cam-pad .cp-btn:hover::after, .cam-pad .cp-btn:focus-visible::after, .cam-pad .cp-btn.cp-on::after, .cam-pad .cp-fold:hover::after, .cam-pad .cp-fold:focus-visible::after { opacity: 1; transform: translateX(-50%) translateY(0); }
.cam-pad [data-id="rotL"]::after, .cam-pad .cp-fold::after { left: 0; transform: translateY(4px); }
.cam-pad [data-id="rotL"]:hover::after, .cam-pad [data-id="rotL"].cp-on::after, .cam-pad [data-id="rotL"]:focus-visible::after, .cam-pad .cp-fold:hover::after, .cam-pad .cp-fold:focus-visible::after { transform: none; }
/* gentle hue per kind of move: turning = river blue, tilting = sunlight, zoom = leaf */
.cam-pad [data-id="rotL"], .cam-pad [data-id="rotR"] { color: #a9d3e3; }
.cam-pad [data-id="up"], .cam-pad [data-id="side"] { color: #f2d77e; }
.cam-pad .cp-zoom .cp-btn { color: #c3dc8c; }
@media (max-height: 720px) { .cam-pad .cp-rose { grid-template: repeat(3, 28px) / repeat(3, 28px); padding: 5px; } .cam-pad .cp-btn { width: 28px; height: 28px; } .cam-pad .cp-btn svg { width: 19px; height: 19px; } }
@media (prefers-reduced-motion: reduce) { .cam-pad, .cam-pad * { transition-duration: .01ms !important; } }
`;

const sv = (body) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const ICONS = {
  home: sv('<path d="M3.5 11.5 12 4l8.5 7.5"/><path d="M6 10v9.5h4.5v-5.5h3v5.5H18V10"/>'),
  rotL: sv('<ellipse cx="12" cy="9.5" rx="8.5" ry="3.6" stroke-width="2"/><path d="M18.5 15.2Q12 19.6 5.2 16.2"/><path d="m8.6 14.6-3.4 1.6 1.7 3.4"/>'),
  rotR: sv('<g transform="matrix(-1 0 0 1 24 0)"><ellipse cx="12" cy="9.5" rx="8.5" ry="3.6" stroke-width="2"/><path d="M18.5 15.2Q12 19.6 5.2 16.2"/><path d="m8.6 14.6-3.4 1.6 1.7 3.4"/></g>'),
  up: sv('<ellipse cx="12" cy="18" rx="8" ry="2.6"/><path d="M12 13V3.5"/><path d="m8.2 7.2 3.8-3.7 3.8 3.7"/>'),
  side: sv('<ellipse cx="12" cy="17" rx="8" ry="2.6"/><path d="M3 9.5h12"/><path d="m11.3 5.8 3.7 3.7-3.7 3.7"/>'),
  plus: sv('<path d="M12 5v14M5 12h14"/>'),
  minus: sv('<path d="M5 12h14"/>'),
  compass: sv('<circle cx="12" cy="12" r="9" stroke-width="2"/><path d="M12 6.5l2.2 5.5L12 17.5 9.8 12z" fill="currentColor" stroke-width="1.4"/>'),
  fold: sv('<path d="M7 7l10 10M17 7L7 17" stroke-width="2.2"/>'),
};
// visual order left → right (spatial controls stay spatial even in an RTL page)
const GROUPS = [
  [{ id: 'home', tip: 'מבט על כל היער', cls: 'cp-home' }],
  [{ id: 'rotL', tip: 'סובב שמאלה', kind: 'rot', dir: 1 }, { id: 'rotR', tip: 'סובב ימינה', kind: 'rot', dir: -1 }],
  [{ id: 'up', tip: 'מבט מלמעלה', kind: 'tilt', dir: 1 }, { id: 'side', tip: 'מבט מהצד', kind: 'tilt', dir: -1 }],
  [{ id: 'minus', tip: 'התרחק', kind: 'zoom', dir: -1 }, { id: 'plus', tip: 'התקרב', kind: 'zoom', dir: 1 }],
];
const HOLD_AFTER = 260;   // ms before a press turns into continuous motion

export function createCameraPad(rootEl, rig, opts = {}) {
  const root = rootEl || document.body;
  if (!document.getElementById(CSS_ID)) {
    const st = document.createElement('style'); st.id = CSS_ID; st.textContent = CSS; document.head.appendChild(st);
  }
  const el = document.createElement('div');
  el.className = 'cam-pad'; el.setAttribute('role', 'toolbar'); el.setAttribute('aria-label', 'הזזת המבט'); el.lang = 'he';
  const btn = (b) => `<button type="button" class="cp-btn ${b.cls || ''}" data-id="${b.id}" data-tip="${b.tip}" aria-label="${b.tip}">${ICONS[b.id]}</button>`;
  const all = GROUPS.flat(), pick = (...ids) => ids.map(id => btn(all.find(b => b.id === id))).join('');
  el.innerHTML = `<div class="cp-rose">${pick('up', 'rotL', 'home', 'rotR', 'side')}</div><div class="cp-zoom">${pick('plus', 'minus')}</div>
    <button type="button" class="cp-fold" aria-expanded="true"></button>`;
  // fold to a single compass button (remembered); young players start with it open
  const foldBtn = el.querySelector('.cp-fold');
  let folded = false;
  try { const v = localStorage.getItem('web-of-life-campad'); folded = v ? v === 'folded' : !root.classList.contains('kids'); } catch (e) { }
  function paintFold() {
    el.classList.toggle('cp-folded', folded); foldBtn.setAttribute('aria-expanded', String(!folded));
    const tip = folded ? 'הזזת המבט' : 'הסתר את מצפן המבט'; foldBtn.dataset.tip = tip; foldBtn.setAttribute('aria-label', tip);
    foldBtn.innerHTML = folded ? ICONS.compass : ICONS.fold;
  }
  paintFold();
  foldBtn.addEventListener('click', (e) => { e.stopPropagation(); folded = !folded; try { localStorage.setItem('web-of-life-campad', folded ? 'folded' : 'open'); } catch (err) { } paintFold(); });
  foldBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
  root.appendChild(el);
  const defs = new Map(GROUPS.flat().map(b => [b.id, b]));

  const presses = new Map();   // pointerId → { btn, def, timer }
  function endPress(pid) {
    const p = presses.get(pid); if (!p) return;
    presses.delete(pid); clearTimeout(p.timer); p.btn.classList.remove('cp-on');
    if (p.def.kind) rig.hold(p.def.kind, 0);
  }
  function onDown(e) {
    const btn = e.target.closest('.cp-btn'); if (!btn || (e.button !== undefined && e.button > 0)) return;
    e.preventDefault(); e.stopPropagation();
    const def = defs.get(btn.dataset.id);
    if (def.id === 'home') { rig.releaseAll && rig.releaseAll(); if (opts.onHome) opts.onHome(); else rig.reset(); btn.classList.add('cp-on'); setTimeout(() => btn.classList.remove('cp-on'), 160); return; }
    endPress(e.pointerId);
    try { btn.setPointerCapture(e.pointerId); } catch (err) { }
    btn.classList.add('cp-on');
    rig.nudge(def.kind, def.dir);
    const timer = setTimeout(() => { if (presses.has(e.pointerId)) rig.hold(def.kind, def.dir); }, HOLD_AFTER);
    presses.set(e.pointerId, { btn, def, timer });
  }
  const onUp = (e) => endPress(e.pointerId);
  // keyboard activation of a focused button (Enter / Space) = one step
  function onKey(e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const btn = e.target.closest('.cp-btn'); if (!btn) return;
    e.preventDefault(); e.stopPropagation();
    const def = defs.get(btn.dataset.id);
    if (def.id === 'home') { if (opts.onHome) opts.onHome(); else rig.reset(); } else rig.nudge(def.kind, def.dir);
  }
  const stop = (e) => e.stopPropagation();
  const cancelAll = () => { for (const pid of [...presses.keys()]) endPress(pid); };
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointerup', onUp); el.addEventListener('pointercancel', onUp); el.addEventListener('lostpointercapture', onUp);
  el.addEventListener('keydown', onKey);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  el.addEventListener('dblclick', stop); el.addEventListener('wheel', stop, { passive: true });
  window.addEventListener('blur', cancelAll);
  // stay clear of the left toolbar: on short screens slide to its right instead of covering its last buttons
  function layout() {
    el.style.left = '';
    const tb = root.querySelector('.toolbar'); if (!tb || el.classList.contains('cp-hidden')) return;
    const a = tb.getBoundingClientRect(), b = el.getBoundingClientRect();
    // (while the in-game UI fades in the toolbar is still 'hidden' – it is about to show, so make room already)
    if (!a.width || (!root.classList.contains('ingame') && getComputedStyle(tb).visibility === 'hidden')) return;
    if (b.top < a.bottom + 8 && b.left < a.right) el.style.left = Math.round(a.right - root.getBoundingClientRect().left + 12) + 'px';
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(layout) : null;
  if (ro) { ro.observe(root); const tb = root.querySelector('.toolbar'); if (tb) ro.observe(tb); }
  window.addEventListener('resize', layout);
  const layoutTimer = setInterval(layout, 1000);   // tray height (--trayH) changes without resizing the root
  // species panel open/close (class "sp-open" on the UI root): drop any held button, re-place the pad when it comes back
  const mo = typeof MutationObserver !== 'undefined' ? new MutationObserver(() => { if (root.classList.contains('sp-open')) cancelAll(); else { layout(); setTimeout(layout, 350); } }) : null;   // again once the toolbar has slid back in
  if (mo) mo.observe(root, { attributes: true, attributeFilter: ['class'] });
  layout();

  return {
    el,
    setVisible(b) { el.classList.toggle('cp-hidden', !b); if (!b) cancelAll(); else layout(); },
    dispose() { cancelAll(); window.removeEventListener('blur', cancelAll); window.removeEventListener('resize', layout); clearInterval(layoutTimer); if (ro) ro.disconnect(); if (mo) mo.disconnect(); el.remove(); },
  };
}
