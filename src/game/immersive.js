// Immersive views (looking through a field camera, the animal-eye tour): one at a time.
// A view takes over the camera (rig.setDriver), hides the island chrome (tray, missions, toolbar, camera pad)
// and gets the keyboard first. Escape always leaves the view. The simulation keeps running underneath.
const CSS_ID = 'imv-css';
const CSS = `
#ui.wol.imv-on .tray, #ui.wol.imv-on .rightcol, #ui.wol.imv-on .toolbar, #ui.wol.imv-on .species, #ui.wol.imv-on .hud-logo,
#ui.wol.imv-on .cam-pad, #ui.wol.imv-on .coach, #ui.wol.imv-on .coach-ring, #ui.wol.imv-on .hover, #ui.wol.imv-on .experiment {
  opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; transition: opacity .3s, visibility 0s .3s !important; }
/* shared pieces of the view overlays */
#ui.wol .imv { position: absolute; inset: 0; z-index: 25; pointer-events: none; opacity: 0; visibility: hidden; transition: opacity .35s, visibility 0s .35s; }
#ui.wol .imv.on { opacity: 1; visibility: visible; transition: opacity .35s; }
#ui.wol .imv-exit { position: absolute; top: 12px; left: 12px; pointer-events: auto; display: inline-flex; align-items: center; gap: 8px; min-height: 48px;
  padding: 6px 18px 6px 12px; border-radius: 999px; background: var(--honey); color: #2e1d05; font-weight: 800; font-size: 1.05em;
  box-shadow: 0 3px 0 var(--honey2), 0 6px 14px rgba(0, 0, 0, .35); transition: transform .15s, filter .15s; }
#ui.wol .imv-exit:hover { filter: brightness(1.06); transform: translateY(-1px); }
#ui.wol .imv-exit:active { transform: translateY(1px); }
#ui.wol .imv-exit .ic { width: 22px; height: 22px; }
#ui.wol .imv-exit kbd { font: 700 .72em var(--sans); padding: 1px 6px; border-radius: 5px; background: rgba(46, 29, 5, .16); }
#ui.wol .imv-round { pointer-events: auto; width: 76px; height: 76px; border-radius: 50%; display: grid; place-items: center; color: var(--chalk);
  background: rgba(17, 36, 26, .9); box-shadow: 0 0 0 2px rgba(180, 203, 102, .5), 0 0 0 7px rgba(17, 36, 26, .45), 0 6px 14px rgba(0, 0, 0, .4);
  transition: transform .1s, background .15s, color .15s; touch-action: none; -webkit-user-select: none; user-select: none; }
#ui.wol .imv-round svg { width: 38px; height: 38px; pointer-events: none; }
#ui.wol .imv-round:hover { background: rgba(27, 54, 38, .95); color: #fff; }
#ui.wol .imv-round.on, #ui.wol .imv-round:active { transform: scale(.92); background: var(--lichen); color: #17300e; }
#ui.wol .imv-round small { position: absolute; top: calc(100% + 8px); left: 50%; transform: translateX(-50%); white-space: nowrap; font-weight: 800; font-size: .82em;
  color: var(--chalk); text-shadow: 0 1px 3px rgba(0, 0, 0, .9), 0 0 8px rgba(0, 0, 0, .6); pointer-events: none; }
#ui.wol .imv-round { position: relative; }
/* the dock under the toolbar: buttons that open the views (field cameras, the tour) */
#ui.wol .imv-dock { position: absolute; top: 70px; left: 10px; display: flex; flex-direction: column; align-items: stretch; gap: 4px; padding: 0 2px; pointer-events: auto;
  border: 10px solid transparent; border-image: var(--plate) 16 fill / 10px / 0 stretch; filter: drop-shadow(0 4px 10px rgba(4, 12, 7, .35)); transition: opacity .3s, visibility .3s, transform .3s; }
#ui.wol .imv-dock.empty { display: none; }
#ui.wol.sp-open .imv-dock, #ui.wol.imv-on .imv-dock { opacity: 0; visibility: hidden; transform: translateX(-20px); pointer-events: none; }
#ui.wol .imv-dock .tb::after { top: 50%; left: calc(100% + 16px); transform: translate(-4px, -50%); }
#ui.wol .imv-dock .tb:hover::after, #ui.wol .imv-dock .tb:focus-visible::after { transform: translate(0, -50%); }
#ui.wol .imv-dock .tb .tb-lab { display: none; }
.q-low#ui.wol .imv-dock { filter: none; }
@media (max-height: 720px) { #ui.wol .imv-round { width: 64px; height: 64px; } #ui.wol .imv-round svg { width: 32px; height: 32px; } }
@media (prefers-reduced-motion: reduce) { #ui.wol .imv, #ui.wol .imv * { transition-duration: .01ms !important; animation: none !important; } }
`;

/** arrows for the big round buttons (drawn left → right; the view controls are spatial, also in RTL) */
export const ARROW = {
  left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 15l7-7 7 7"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 9l7 7 7-7"/></svg>',
  rise: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V6"/><path d="M7 10l5-5 5 5"/><path d="M5 21h14" stroke-width="2"/></svg>',
  sink: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v13"/><path d="M7 13l5 5 5-5"/><path d="M5 21h14" stroke-width="2"/></svg>',
  close: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};

/** press-and-hold wiring for a big button: onPress(dir) once, onHold(on) while held (after a short delay) */
export function holdButton(btn, { press, hold }) {
  let pid = null, timer = 0;
  const end = () => { if (pid === null) return; pid = null; clearTimeout(timer); btn.classList.remove('on'); if (hold) hold(false); };
  btn.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return; e.preventDefault(); e.stopPropagation();
    end(); pid = e.pointerId; try { btn.setPointerCapture(pid); } catch (err) { }
    btn.classList.add('on'); if (press) press();
    timer = setTimeout(() => { if (pid !== null && hold) hold(true); }, 240);
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) btn.addEventListener(ev, end);
  btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); if (press) press(); } });
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
  return end;
}

export function createImmersive({ W, rig, camera, ui, camPad, refit, deselect }) {
  if (!document.getElementById(CSS_ID)) { const st = document.createElement('style'); st.id = CSS_ID; st.textContent = CSS; document.head.appendChild(st); }
  const root = document.getElementById('ui');
  let cur = null;   // { name, onExit, onKey, onBlur }
  // a small plate under the toolbar for the buttons that open the views; it hides itself while it is empty
  const dock = document.createElement('div');
  dock.className = 'imv-dock ui-in empty'; dock.setAttribute('role', 'toolbar'); dock.setAttribute('aria-label', 'מבטים מיוחדים');
  root.appendChild(dock);
  const syncDock = () => { const any = [...dock.children].some(b => !b.hidden); dock.classList.toggle('empty', !any); };
  const dockMo = typeof MutationObserver !== 'undefined' ? new MutationObserver(syncDock) : null;
  if (dockMo) dockMo.observe(dock, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden'] });
  const typing = (t) => t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || '') || t.isContentEditable);

  function enter(name, { driver, onExit, onKey, onBlur }) {
    if (cur) exit();
    try { deselect && deselect(); ui.hideHover && ui.hideHover(); ui.cancelDrag && ui.cancelDrag(); } catch (e) { }
    cur = { name, onExit, onKey, onBlur };
    W.viewMode = name;
    rig.setDriver((dt) => {
      if (camera.view && camera.view.enabled) camera.clearViewOffset();   // full-screen view (the HUD offset is for the tray)
      driver(dt);
    });
    if (camPad) camPad.setVisible(false);
    root.classList.add('imv-on', 'imv-' + name);
  }
  function exit() {
    if (!cur) return;
    const c = cur; cur = null; W.viewMode = null;
    root.classList.remove('imv-on', 'imv-' + c.name);
    rig.setDriver(null);
    if (camPad) camPad.setVisible(true);
    if (refit) refit();
    if (c.onExit) c.onExit();
  }
  // the view gets the keyboard first (capture phase); Escape leaves it
  function onKeyDown(e) {
    if (!cur || typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Escape') {
      if (ui.isModalOpen && ui.isModalOpen()) return;   // close the dialog first
      e.preventDefault(); e.stopPropagation(); exit(); return;
    }
    if (cur.onKey && cur.onKey(e, true)) { e.preventDefault(); e.stopPropagation(); }
  }
  function onKeyUp(e) { if (cur && cur.onKey && cur.onKey(e, false)) { e.preventDefault(); e.stopPropagation(); } }
  function onBlur() { if (cur && cur.onBlur) cur.onBlur(); }
  window.addEventListener('keydown', onKeyDown, true); window.addEventListener('keyup', onKeyUp, true); window.addEventListener('blur', onBlur);

  return {
    enter, exit,
    get active() { return cur ? cur.name : null; },
    dock, syncDock,
    dispose() { exit(); if (dockMo) dockMo.disconnect(); dock.remove(); window.removeEventListener('keydown', onKeyDown, true); window.removeEventListener('keyup', onKeyUp, true); window.removeEventListener('blur', onBlur); },
  };
}
