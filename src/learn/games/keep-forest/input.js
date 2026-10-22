// מחזיקים את היער – the player's hands: selecting a card, dragging it with a ghost card to a slot (or a tool onto the
// board), tapping a slot, and the click handler of every button (data-a), place tile (data-b) and slot.
// Owns the drag's ghost card.
// Gives K: cleanupDrag, onDown, onMove, onUp, onClick.
// Takes from K: ctx, root, C, canUse, msg, $, esc, legal, ROWN, rowOfCard, Y, renderBoard, renderHand, useTool,
//   place, hideHow, ST, save, renderSetup, totals, newRun, renderGame, showHow, cont, showHint, skip.
// Shared state it reads or changes: K.S, K.biome, K.sel, K.drag, K.ro.
import { gw } from '../../../data/common.js';
import { dn } from './data.js';
import { TOOL_FX } from './events.js';
import { I } from './icons.js';

export function createInput(K) {
  const { ctx, root, C, canUse, msg, $, esc, legal, ROWN, rowOfCard, Y, renderBoard, renderHand, useTool, place,
    hideHow, ST, save, renderSetup, totals, newRun, renderGame, showHow, cont, showHint, skip } = K;
  let ghost = null;   // the card that follows the pointer while dragging

  /* ── selection, drag & tap */
  function selectCard(i) {
    if (!K.S || K.S.phase !== 'play') return;
    K.sel = K.sel === i ? null : i;
    ctx.sfx('click');
    if (K.sel != null) {
      const c = C(K.S.hand[K.sel]);
      if (c.type === 'tool') { const u = canUse(K.S.hand[K.sel]); msg('tip', `${I.bulb}<span>${esc(c.name)}: ${esc(TOOL_FX[c.tool.id])}. ${u.ok ? 'לחצו "הפעלה".' : esc(u.why)}</span>`); }
      else { const lg = legal(K.S.hand[K.sel]); msg('tip', `${I.life}<span>${lg.swap ? `הקומה מלאה – לחצו על קלף ב${ROWN()[rowOfCard(c)]} כדי להחליף אותו` : `עכשיו לחצו על מקום מסומן ${Y('ביער', 'בשונית')}`}</span>`); }
    }
    renderBoard(); renderHand();
  }
  function makeGhost(ref, x, y) {
    const g = document.createElement('div'); g.className = 'kf-ghost';
    g.innerHTML = ctx.cardHTML(C(ref)); g.style.left = x + 'px'; g.style.top = y + 'px';
    (ctx.root() || root).appendChild(g); return g;
  }
  function killGhost() { if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost); ghost = null; }
  function slotAt(x, y) {
    let best = null, bd = Infinity;
    root.querySelectorAll('.kf-slot.ok').forEach((s) => { const r = s.getBoundingClientRect(); const d = Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y); if (d < Math.max(r.width, r.height) * 0.85 && d < bd) { bd = d; best = s; } });
    return best;
  }
  function overBoard(x, y) { const b = $('.kf-board'); if (!b) return false; const r = b.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; }
  function cleanupDrag() {
    killGhost();
    if (K.drag && K.drag.el) K.drag.el.classList.remove('lift');
    K.drag = null;
    root.querySelectorAll && root.querySelectorAll('.kf-slot.hot').forEach((s) => s.classList.remove('hot'));
  }
  function onDown(e) {
    if (e.target.closest && e.target.closest('[data-a]')) return;
    const h = e.target.closest && e.target.closest('.kf-hc');
    if (!h || !root.contains(h) || !K.S || K.S.phase !== 'play' || e.button > 0) return;
    e.preventDefault();
    K.drag = { hi: +h.dataset.i, el: h, x0: e.clientX, y0: e.clientY, hot: null, pid: e.pointerId, moved: false };
  }
  function onMove(e) {
    if (!K.drag || (K.drag.pid != null && e.pointerId !== K.drag.pid)) return;
    if (!K.drag.moved) {
      if (Math.hypot(e.clientX - K.drag.x0, e.clientY - K.drag.y0) < 7) return;
      K.drag.moved = true; K.sel = null;
      ghost = makeGhost(K.S.hand[K.drag.hi], e.clientX, e.clientY); K.drag.el.classList.add('lift'); ctx.sfx('select');
      renderBoard();
      const el = root.querySelector(`.kf-hc[data-i="${K.drag.hi}"]`); if (el) { K.drag.el = el; el.classList.add('lift'); }
    }
    ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px';
    const s = slotAt(e.clientX, e.clientY);
    if (s !== K.drag.hot) { if (K.drag.hot) K.drag.hot.classList.remove('hot'); K.drag.hot = s; if (s) s.classList.add('hot'); }
  }
  function onUp(e) {
    if (!K.drag || (K.drag.pid != null && e.pointerId !== K.drag.pid)) return;
    const d = K.drag;
    if (!d.moved) { K.drag = null; selectCard(d.hi); return; }
    const s = slotAt(e.clientX, e.clientY);
    const ref = K.S.hand[d.hi]; const c = ref && C(ref);
    cleanupDrag();
    if (c && c.type === 'tool') { if (overBoard(e.clientX, e.clientY)) useTool(d.hi); else renderBoard(); return; }
    if (s) place(d.hi, +s.dataset.s);
    else { renderBoard(); renderHand(); msg('tip', `${I.life}<span>${c && !c.sp.animal ? `${esc(dn(c))} ${gw(c.sp.id, 'גדל', 'גדלה', 'גדלים', 'גדלות')} רק ב${ROWN()[rowOfCard(c)]}` : `גררו אל מקום מסומן ${Y('ביער', 'בשונית')}`}</span>`); }
  }
  function onClick(e) {
    if (e.target.classList && e.target.classList.contains('kf-how')) { hideHow(); return; }
    const t = e.target.closest && e.target.closest('[data-a],[data-b],.kf-slot');
    if (!t || !root.contains(t)) return;
    if (t.dataset.b) { if (t.dataset.b !== K.biome) { K.biome = t.dataset.b; ST.biome = K.biome; save(); ctx.sfx('click'); renderSetup(); } return; }
    if (t.classList.contains('kf-slot')) {
      if (!K.S) return;
      const k = +t.dataset.s;
      if (K.S.phase === 'play' && K.sel != null) {
        const c = C(K.S.hand[K.sel]);
        if (c.type === 'tool') { useTool(K.sel); return; }
        if (!place(K.sel, k)) msg('tip', `${I.life}<span>${!c.sp.animal ? `${esc(dn(c))} ${gw(c.sp.id, 'גדל', 'גדלה', 'גדלים', 'גדלות')} רק ב${ROWN()[rowOfCard(c)]}` : 'בחרו מקום מסומן'}</span>`);
        return;
      }
      const b = K.S.board[k];
      if (b) { // tell about this card's threads
        const th = totals().th.filter((x) => x.i === k || x.j === k);
        const c = C(b.ref);
        msg(th.length ? 'ok' : 'tip', `${th.length ? I.thread : I.life}<span>${th.length ? esc(th.slice(0, 2).map((x) => x.e.text).join(' ')) : `${esc(dn(c))}${b.wilted ? ' ' + gw(c.sp.id, 'נבל', 'נבלה', 'נבלו', 'נבלו') + ' קצת' : ''} – ${esc(c.short)}`}</span>`);
      }
      return;
    }
    const a = t.dataset.a;
    if (a === 'start') { ctx.sfx('click'); ST.biome = K.biome; save(); ctx.markUsed && ctx.markUsed('keepforest'); newRun(K.biome); renderGame(); if (!ST.seenHow) showHow(); }
    else if (a === 'how') showHow();
    else if (a === 'howok') hideHow();
    else if (a === 'setup') { ctx.sfx('click'); if (K.ro) { K.ro.disconnect(); K.ro = null; } renderSetup(); }
    else if (a === 'again') { ctx.sfx('click'); newRun(K.S ? K.S.biome : K.biome); renderGame(); }
    else if (a === 'album') { ctx.sfx('click'); ctx.toAlbum(); }
    else if (a === 'cont') { ctx.sfx('click'); cont(); }
    else if (a === 'hint') showHint();
    else if (a === 'skip') skip();
    else if (a === 'use') { if (K.sel != null) useTool(K.sel); }
  }

  return { cleanupDrag, onDown, onMove, onUp, onClick };
}
