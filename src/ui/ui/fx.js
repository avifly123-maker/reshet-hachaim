// Leaf confetti, the injured animals' bar and edge arrows (a click flies to the animal), and the toasts.
// Exports: createFx(ctx) → { confetti, pushToast }.
// Needs from ctx (index.js and the parts made before it): emit, S, tray, toastsEl, hurtBar, hurtArrowsEl, fxEl,
//   trScroll, renderTray.
// Called through ctx because their parts are made later: syncTrayH (keys.js).
import { h } from './helpers.js';
import { icon } from './icons.js';

export function createFx(ctx) {
  const { emit, S, tray, toastsEl, hurtBar, hurtArrowsEl, fxEl, trScroll, renderTray } = ctx;
  const syncTrayH = (...a) => ctx.syncTrayH(...a);   // keys.js is made later
  /* ================================================================ FX helpers */
  function confetti(n = 38) {
    const cols = ['#8fd067', '#5fae4a', '#f0b44c', '#f6d36a', '#c8e68a', '#e98bc4'];
    for (let i = 0; i < n; i++) {
      const l = h('span', 'leafbit', icon('leaf'), fxEl);
      l.style.left = Math.random() * 100 + '%';
      l.style.color = cols[i % cols.length];
      l.style.setProperty('--dx', (Math.random() - 0.5) * 220 + 'px');
      l.style.setProperty('--rot', (Math.random() - 0.5) * 900 + 'deg');
      l.style.setProperty('--s', 0.7 + Math.random() * 0.9);
      l.style.animationDuration = 2.4 + Math.random() * 1.8 + 's';
      l.style.animationDelay = Math.random() * 0.6 + 's';
      setTimeout(() => l.remove(), 5200);
    }
  }
  // the injured bar and the edge arrows: a click flies to the animal, and the rescue robot pulses in the tray
  function focusInjured(uid) {
    emit('injured:focus', { uid: +uid });
    S.rescueHelp = true;
    if (S.trayCollapsed) { S.trayCollapsed = false; tray.classList.remove('collapsed'); syncTrayH(); }
    if (S.cards.some((c) => c.id === 'tool:rescue')) { S.tab = 'tech'; S.layerFilter = 'all'; }
    renderTray(true);
    requestAnimationFrame(() => {   // bring the robot's card into the tray's view (scrollIntoView could move the whole overlay)
      const rc = S.cardEls.get('tool:rescue'); if (!rc || !rc.isConnected) return;
      const r = rc.getBoundingClientRect(), sr = trScroll.getBoundingClientRect();
      if (r.left < sr.left || r.right > sr.right) trScroll.scrollLeft += (r.left + r.width / 2) - (sr.left + sr.width / 2);
    });
  }
  hurtBar.addEventListener('click', (e) => { const b = e.target.closest('.hb-chip'); if (b) focusInjured(b.dataset.uid); });
  hurtArrowsEl.addEventListener('click', (e) => { const b = e.target.closest('.ha'); if (b) focusInjured(b.dataset.uid); });

  function pushToast(node, ms) {
    // חוויה (1.3.2): one message at a time; the next waits for its turn (at most three wait, the oldest gives way)
    if (S.play === 'experience' && toastsEl.querySelector('.toast:not(.off)')) { S.toastQ.push([node, ms]); if (S.toastQ.length > 3) S.toastQ.shift(); return; }
    toastsEl.appendChild(node);
    requestAnimationFrame(() => node.classList.add('on'));
    const kill = () => { if (!node.isConnected) return; node.classList.remove('on'); node.classList.add('off'); setTimeout(() => { node.remove(); if (S.toastQ.length) { const [n2, ms2] = S.toastQ.shift(); pushToast(n2, ms2); } }, 320); };
    node.addEventListener('click', kill);
    setTimeout(kill, ms);
    while (toastsEl.children.length > 4) toastsEl.firstChild.remove();
  }
  return { confetti, pushToast };
}
