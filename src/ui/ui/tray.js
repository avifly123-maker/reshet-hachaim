// The tray of cards at the bottom (plants, animals, technology; layer chips; help; fold) and dragging a card out.
// Exports: createTray(ctx) → { trScroll, renderTray, endPress }.
// Needs from ctx (index.js and the parts made before it): root, emit, S, tray, ghost, hintEl.
// Called through ctx because their parts are made later: syncTrayH (keys.js).
// The public api (ctx.ui, api.js) is made last: event handlers here reach it as ctx.ui.
import { zoneWord } from '../../core/place.js';
import { ANIMAL_KINDS, esc, fmt, h, LAYER_TINT, thumbHTML } from './helpers.js';
import { icon } from './icons.js';

export function createTray(ctx) {
  const { root, emit, S, tray, ghost, hintEl } = ctx;
  const syncTrayH = (...a) => ctx.syncTrayH(...a);   // keys.js is made later
  /* ================================================================ TRAY */
  tray.innerHTML = `<div class="tr-top">
      <div class="tr-tabs" role="tablist">
        <button data-tab="plants" role="tab">${icon('sprout')}צמחים<span class="tc"></span></button>
        <button data-tab="animals" role="tab">${icon('paw')}בעלי חיים<span class="tc"></span></button>
        <button data-tab="tech" role="tab">${icon('bulb')}טכנולוגיה<span class="tc"></span></button></div>
      <div class="tr-filter"></div>
      <button class="tr-info" title="מה רואים בקלף?" aria-label="מה רואים בקלף?" aria-expanded="false">${icon('info')}</button>
      <button class="tr-fold" title="הסתר/הצג" aria-label="הסתר או הצג את הקלפים">${icon('chevron')}</button></div>
    <div class="tr-help" role="note"><p><span class="lg-dot">3</span>כמה יש ${zoneWord('in')} עכשיו</p><p><span class="lg-cost">${icon('leaf')}20</span>המחיר בנקודות חיים</p><p><span class="lg-drag">${icon('arrowL')}</span>גוררים את הקלף ${zoneWord('to')}</p></div>
    <div class="tr-scroll"><div class="tr-cards"></div></div>
    <div class="tr-cancel">${icon('close')}שחררו כאן כדי לבטל</div>`;
  const trTabs = [...tray.querySelectorAll('[data-tab]')], trFilter = tray.querySelector('.tr-filter');
  const trScroll = tray.querySelector('.tr-scroll'), trCards = tray.querySelector('.tr-cards');
  trTabs.forEach((b) => b.addEventListener('click', () => { S.tab = b.dataset.tab; S.layerFilter = 'all'; renderTray(true); }));
  trFilter.addEventListener('click', (e) => { const b = e.target.closest('[data-l]'); if (!b) return; S.layerFilter = b.dataset.l; renderTray(true); });
  tray.querySelector('.tr-info').addEventListener('click', (e) => { const on = tray.classList.toggle('help-open'); e.currentTarget.setAttribute('aria-expanded', String(on)); });
  tray.querySelector('.tr-fold').addEventListener('click', () => { S.trayCollapsed = !S.trayCollapsed; tray.classList.toggle('collapsed', S.trayCollapsed); syncTrayH(); });
  trScroll.addEventListener('wheel', (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { trScroll.scrollBy({ left: -e.deltaY }); e.preventDefault(); } }, { passive: false });
  const isAnimal = (c) => c.tab === 'animals' || ANIMAL_KINDS.has(c.kind);   // tab: a species that stays in place but is an animal (the giant clam)
  function cardSig(c) { return [c.name, c.cost, c.locked, c.lockText, c.canAfford, c.alive, c.isNew, c.color, c.layerName, c.thumb ? c.thumb.length + c.thumb.slice(-24) : 0].join('|'); }
  const lockMsg = (c) => { const t = c.lockText || ''; return /^משימה:\s*/.test(t) ? 'נפתח במשימה: ' + t.replace(/^משימה:\s*/, '') : (t || 'עוד נעול'); };
  const lockShort = (c) => (c.lockText || 'נעול').replace(/^משימה:\s*/, '');
  function fillCard(el, c) {
    el.className = 'card k-' + (isAnimal(c) ? 'animal' : c.kind === 'tool' ? 'tech' : 'plant') + (c.locked ? ' locked' : '') + (!c.locked && !c.canAfford ? ' poor' : '') + (c.isNew ? ' new' : '') + (c.alive ? ' has-alive' : '') + (c.nursery ? ' nursery' : '');
    el.style.setProperty('--c', c.color || '#6a9');
    el.innerHTML = `${thumbHTML(c.thumb, c.color, c.kind)}
      <span class="c-name">${esc(c.name)}</span>
      <span class="c-meta">${c.nursery ? '<span class="c-nur">מהמשתלה</span>' : c.locked ? `<span class="c-lock">${icon('lock')}<span>${esc(lockShort(c))}</span></span>` :
        `<span class="c-cost" title="מחיר: ${fmt(c.cost || 0)} נקודות חיים">${icon('leaf')}${fmt(c.cost || 0)}</span>${c.layerName ? `<span class="c-layer" title="${esc(c.layerName)}" style="--lt:${LAYER_TINT[c.layer] || '#7a9a5a'}"></span>` : ''}`}</span>
      ${c.alive ? `<span class="c-alive" title="${c.nursery ? `${fmt(c.alive)} מחכים במשתלה` : `יש ${fmt(c.alive)} כאלה ${zoneWord('in')} עכשיו`}">${fmt(c.alive)}</span>` : ''}
      ${c.isNew ? `<span class="c-new">${icon('sparkle')}חדש</span>` : ''}
      ${c.locked ? `<span class="c-lockbig">${icon('lock')}</span>` : ''}`;
    el.title = c.locked ? lockMsg(c) : '';
    el.setAttribute('aria-label', c.name + (c.nursery ? `. מהמשתלה, ${fmt(c.alive || 0)} מחכים. גררו אל השונית` : c.locked ? '. ' + lockMsg(c) : `. מחיר ${fmt(c.cost || 0)} נקודות חיים` + (c.alive ? `. יש ${fmt(c.alive)} ${zoneWord('in')}` : '')));
  }
  function renderTray(force) {
    const isTech = (c) => c.kind === 'tool';
    const plants = S.cards.filter((c) => !isAnimal(c) && !isTech(c)), animals = S.cards.filter(isAnimal), tech = S.cards.filter(isTech);
    trTabs[0].querySelector('.tc').textContent = plants.length; trTabs[1].querySelector('.tc').textContent = animals.length;
    if (trTabs[2]) { trTabs[2].querySelector('.tc').textContent = tech.length; trTabs[2].hidden = !tech.length; }
    trTabs.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === S.tab))); tray.dataset.tab = S.tab;
    const list = S.tab === 'plants' ? plants : S.tab === 'tech' ? tech : animals;
    // layer chips (only layers present in this tab)
    const seen = new Map(); list.forEach((c) => { if (c.layer && !seen.has(c.layer)) seen.set(c.layer, c.layerName || c.layer); });
    if (S.layerFilter !== 'all' && !seen.has(S.layerFilter)) S.layerFilter = 'all';
    const chips = seen.size > 1 ? `<button data-l="all">הכל</button>` + [...seen].map(([id, n]) => `<button data-l="${esc(id)}" style="--lt:${LAYER_TINT[id] || '#6a9'}">${esc(n)}</button>`).join('') : '';
    if (trFilter.dataset.sig !== chips + S.layerFilter) { trFilter.innerHTML = chips; trFilter.dataset.sig = chips + S.layerFilter; trFilter.querySelectorAll('[data-l]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.l === S.layerFilter))); }
    const shown = list.filter((c) => S.layerFilter === 'all' || c.layer === S.layerFilter);
    const keep = new Set(shown.map((c) => c.id));
    for (const [id, el] of S.cardEls) if (!keep.has(id) && !(S.press && S.press.id === id)) { el.remove(); S.cardEls.delete(id); S.cardSig.delete(id); }
    shown.forEach((c, i) => {
      let el = S.cardEls.get(c.id);
      if (!el) { el = h('div', 'card'); el.dataset.id = c.id; el.tabIndex = 0; el.setAttribute('role', 'button'); bindCard(el); S.cardEls.set(c.id, el); }
      const sig = cardSig(c);
      if (force || S.cardSig.get(c.id) !== sig) { fillCard(el, c); S.cardSig.set(c.id, sig); }
      if (trCards.children[i] !== el) trCards.insertBefore(el, trCards.children[i] || null);
    });
    tray.classList.toggle('empty', !shown.length);
    const rc = S.cardEls.get('tool:rescue'); if (rc) rc.classList.toggle('help-pulse', !!S.rescueHelp);   // 1.3.2: the injured bar was clicked
  }
  const cardById = (id) => S.cards.find((c) => c.id === id);

  /* ---- drag & drop (pointer events; mouse + touch) */
  function bindCard(el) {
    el.addEventListener('pointerdown', (e) => {
      if (e.button > 0 || S.press) return;
      S.press = { id: el.dataset.id, el, pid: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, dragging: false, denied: false };
      el.classList.add('pressed');
    });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    // keyboard: Enter / Space opens the species card (placing still needs the mouse or a finger)
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault(); e.stopPropagation(); if (S.press) return;
      const c = cardById(el.dataset.id); if (!c) return;
      if (c.locked) ctx.ui.toast(lockMsg(c), 'info');
      emit('card:click', { id: c.id });
    });
  }
  const overTray = (x, y) => { const r = tray.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; };
  function placeFloating(x, y) {
    ghost.style.transform = `translate(${x}px, ${y}px)`;
    hintEl.style.transform = `translate(${x}px, ${y + 46}px)`;
  }
  window.addEventListener('pointermove', (e) => {
    const p = S.press; if (!p || e.pointerId !== p.pid) return;
    p.x = e.clientX; p.y = e.clientY;
    if (!p.dragging) {
      if (p.denied || Math.hypot(p.x - p.x0, p.y - p.y0) < 6) return;
      const c = cardById(p.id);
      if (!c || c.locked || !c.canAfford) {
        p.denied = true; p.el.classList.remove('shake'); void p.el.offsetWidth; p.el.classList.add('shake');
        emit('drag:denied', { id: p.id, reason: !c ? 'missing' : c.locked ? 'locked' : 'cost' });
        if (c && c.locked) ctx.ui.toast(lockMsg(c), 'info');
        return;
      }
      p.dragging = true;
      ghost.innerHTML = `${thumbHTML(c.thumb, c.color, c.kind, 'g-thumb')}<span>${esc(c.name)}</span>`;
      ghost.style.setProperty('--c', c.color || '#6a9');
      root.classList.add('dragging'); p.el.classList.add('lifted');
      placeFloating(p.x, p.y); ghost.classList.add('on');
      emit('drag:start', { id: p.id, x: p.x, y: p.y });
    }
    placeFloating(p.x, p.y);
    tray.classList.toggle('drop-cancel', overTray(p.x, p.y));
    emit('drag:move', { id: p.id, x: p.x, y: p.y });
  });
  function endPress(cancelled, viaEsc) {
    const p = S.press; if (!p) return;
    S.press = null;
    p.el.classList.remove('pressed', 'lifted');
    if (p.dragging) {
      const c = !!cancelled || overTray(p.x, p.y);
      ghost.classList.remove('on'); hintEl.classList.remove('on'); tray.classList.remove('drop-cancel'); root.classList.remove('dragging');
      if (!c) { ghost.classList.add('drop'); setTimeout(() => ghost.classList.remove('drop'), 300); }
      emit('drag:end', { id: p.id, x: p.x, y: p.y, cancelled: c });
    } else if (!p.denied && !viaEsc && !cancelled) {
      const c = cardById(p.id); if (c && c.locked) ctx.ui.toast(lockMsg(c), 'info');
      emit('card:click', { id: p.id });
    }
  }
  window.addEventListener('pointerup', (e) => { if (S.press && e.pointerId === S.press.pid) { S.press.x = e.clientX; S.press.y = e.clientY; endPress(false); } });
  window.addEventListener('pointercancel', (e) => { if (S.press && e.pointerId === S.press.pid) endPress(true); });
  window.addEventListener('blur', () => { if (S.press) endPress(true); });
  return { trScroll, renderTray, endPress };
}
