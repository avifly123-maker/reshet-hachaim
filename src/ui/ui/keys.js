// The window's keys (Escape walks back, Space pauses) and the tray's height as a CSS variable (on resize).
// Exports: createKeys(ctx) → { syncTrayH }.
// Needs from ctx (index.js and the parts made before it): root, emit, S, tray, startEl, ppEscape, setSpeed, qWrap,
//   kitBtn, setKit, endPress, open, dismissDialog, closeModal, layoutCoach.
// The public api (ctx.ui, api.js) is made last: event handlers here reach it as ctx.ui.

export function createKeys(ctx) {
  const { root, emit, S, tray, startEl, ppEscape, setSpeed, qWrap, kitBtn, setKit, endPress, open, dismissDialog, closeModal, layoutCoach } = ctx;
  /* ================================================================ KEYBOARD */
  window.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
    if (e.key === 'Escape') {
      if (S.press) { endPress(true, true); e.preventDefault(); return; }
      if (startEl.classList.contains('on') && !open.dialog && ppEscape()) { e.preventDefault(); return; }
      if (qWrap.classList.contains('open')) { setKit(false); kitBtn.focus(); return; }
      if (tray.classList.contains('help-open')) { tray.classList.remove('help-open'); return; }
      if (open.dialog) { if (dismissDialog()) e.preventDefault(); return; }
      if (open.history) { closeModal('history'); return; }
      if (open.journal) { emit('journal:close'); ctx.ui.hideJournal(); return; }
      if (open.outcome) { emit('outcome:close'); closeModal('outcome'); return; }
      if (S.species) { emit('species:close'); ctx.ui.hideSpecies(); return; }
    } else if ((e.code === 'Space' || e.key === ' ') && root.classList.contains('ingame') && !ctx.ui.isModalOpen()) {
      e.preventDefault();
      setSpeed(S.speed === 0 ? S.lastSpeed || 1 : 0);
    }
  });

  /* tray height → CSS var so side panels end above it */
  function syncTrayH() {
    // a mystery (חוקרי הטבע) has its research desk where the tray was: the island frames itself above it
    const desk = root.classList.contains('research') && root.querySelector('.rs-desk');
    if (desk) { root.style.setProperty('--trayH', Math.round(innerHeight - desk.getBoundingClientRect().top) + 'px'); layoutCoach(); return; }
    const r = tray.getBoundingClientRect(), t = tray.querySelector('.tr-top').getBoundingClientRect(); root.style.setProperty('--trayH', (tray.offsetParent ? Math.round(innerHeight - Math.min(r.top, t.top || r.top)) : 0) + 'px'); layoutCoach(); }
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(syncTrayH).observe(tray);
  window.addEventListener('resize', () => { syncTrayH(); layoutCoach(); });
  return { syncTrayH };
}
