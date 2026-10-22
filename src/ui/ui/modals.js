// Modal windows (makeModal / closeModal / dismissDialog), the journal's cards, and the coach bubble with its ring.
// Exports: createModals(ctx) → { open, makeModal, dismissDialog, closeModal, journalCard, layoutCoach }.
// Needs from ctx (index.js and the parts made before it): root, emit, S, hud, toolbar, missions, layersEl, tray,
//   panel, coachRing, coachEl, modalEl.
import { esc, h, thumbHTML } from './helpers.js';

export function createModals(ctx) {
  const { root, emit, S, hud, toolbar, missions, layersEl, tray, panel, coachRing, coachEl, modalEl } = ctx;
  /* ================================================================ MODALS */
  const open = { event: null, outcome: null, dialog: null, journal: null, history: null };
  function makeModal(kind, inner, cls = '') {
    closeModal(kind);
    const wrap = h('div', `modal m-${kind}`, `<div class="backdrop"></div><div class="mbox paper ${cls}">${inner}</div>`, modalEl);
    open[kind] = wrap;
    void wrap.offsetWidth; wrap.classList.add('on');   // start the fade-in now (a slow computer may not give us a frame for a while)
    root.classList.add('has-modal');
    return wrap;
  }
  function dismissDialog() {
    const w = open.dialog; if (!w || !w._dismiss) return false;
    const id = w._dismiss; closeModal('dialog'); emit('dialog:button', { id }); return true;
  }
  function closeModal(kind) {
    const w = open[kind]; if (!w) return;
    open[kind] = null; w.classList.remove('on'); w.classList.add('off');
    setTimeout(() => w.remove(), 260);
    if (!Object.values(open).some(Boolean)) root.classList.remove('has-modal');
  }

  /* ================================================================ JOURNAL */
  function journalCard(sp, i) {
    if (!sp.discovered) return `<li class="jc unknown" style="--r:${((i * 37) % 7) - 3}deg"><span class="j-thumb">?</span><b>עוד לא התגלה</b><small>הוסיפו אותו ליער כדי להכיר</small></li>`;
    const tot = sp.relationsTotal || 0, f = sp.relationsFound || 0;
    let dots = ''; for (let k = 0; k < tot; k++) dots += `<i class="${k < f ? 'f' : ''}"></i>`;
    return `<li class="jc" style="--r:${((i * 37) % 7) - 3}deg;--c:${esc(sp.color || '#6a9')}"><button data-id="${esc(sp.id)}">
      <span class="tape"></span>${sp.art ? `<span class="j-thumb j-art"><img src="${esc(sp.art)}" alt="" draggable="false"></span>` : thumbHTML(sp.thumb, sp.color, sp.kind, 'j-thumb')}<b>${esc(sp.name)}</b>
      ${sp.fact ? `<small class="j-fact">${esc(sp.fact)}</small>` : ''}
      <span class="j-rel" title="קשרים שגילית">${dots}<em>${f}/${tot}</em></span></button></li>`;
  }

  /* ================================================================ COACH */
  coachEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-c]'); if (!b) return;
    emit(b.dataset.c === 'next' ? 'coach:next' : 'coach:skip');
  });
  function coachTargetEl(t) {
    return { tray, hud, layers: layersEl, toolbar, missions, species: root.classList.contains('sp-open') ? panel : null }[t] || null;
  }
  function layoutCoach() {
    if (!S.coach) return;
    const el = coachTargetEl(S.coach.target);
    const W = innerWidth, H = innerHeight, bw = coachEl.offsetWidth, bh = coachEl.offsetHeight;
    if (!el || !el.offsetParent) {
      coachRing.classList.remove('on');
      coachEl.style.left = (W - bw) / 2 + 'px'; coachEl.style.top = (H - bh) / 2 + 'px'; coachEl.dataset.arrow = 'none'; return;
    }
    const r = el.getBoundingClientRect(), pad = 8;
    Object.assign(coachRing.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
    coachRing.classList.add('on');
    let x, y, arrow;
    const spaceL = r.left, spaceR = W - r.right;
    if (r.height > H * 0.45 && Math.max(spaceL, spaceR) > bw + 40) { // tall region → beside it
      arrow = spaceR > spaceL ? 'left' : 'right';
      x = arrow === 'left' ? r.right + 22 : r.left - bw - 22; y = r.top + Math.min(r.height, H) / 2 - bh / 2;
    } else if (r.top + r.height / 2 > H / 2) { arrow = 'down'; y = r.top - bh - 22; x = r.left + r.width / 2 - bw / 2; }
    else { arrow = 'up'; y = r.bottom + 22; x = r.left + r.width / 2 - bw / 2; }
    x = Math.max(12, Math.min(W - bw - 12, x)); y = Math.max(12, Math.min(H - bh - 12, y));
    coachEl.style.left = x + 'px'; coachEl.style.top = y + 'px'; coachEl.dataset.arrow = arrow;
    const ax = Math.max(24, Math.min(bw - 24, r.left + r.width / 2 - x)), ay = Math.max(24, Math.min(bh - 24, r.top + r.height / 2 - y));
    coachEl.style.setProperty('--ax', ax + 'px'); coachEl.style.setProperty('--ay', ay + 'px');
  }
  return { open, makeModal, dismissDialog, closeModal, journalCard, layoutCoach };
}
