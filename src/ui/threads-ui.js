// חוטים (1.3.2) on screen: the card stamps (src/learn/hub/), the small "מהאי שלכם" / "מחכה לכם" / "רובו־דע ממליץ"
// marks (src/lab, src/research/hub.js, the inventors game), and the threads layer of מפת המסע (src/ui/journey-map.js).
//
//   stampsHTML(spId, zone)        a row of small stamp icons for a card's detail (all six, the earned ones lit)
//   markHTML(kind)                a small pill: 'island' | 'waiting' | 'recommend'
//   mountMapThreads(jm, { emit }) draws the threads on the journey map: soft lines between the part tiles (open), dashed
//                                 ones (not yet), and a row of chips in `.jm-threads`; returns { redraw, announceFresh }
// Icons: the hand of src/ui/icons-hub.js (24 x 24, round caps, a soft fill "f"); no cross shapes, no figures.
import * as TH from '../core/threads.js';
import { playMode } from '../core/journey.js';
import { STAMPS, STAMP_NAME, THREAD_WORDS, threadById } from '../data/threads.js';
import { HUB_ICONS } from './icons-hub.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const kids = () => playMode() === 'kids';
export const W = (v) => (v && typeof v === 'object' && 'f' in v ? (kids() ? v.k || v.f : v.f) : String(v == null ? '' : v));

export const STAMP_ICONS = {
  // an open eye
  seen: '<path class="f" d="M2.6 12s3.6-6.2 9.4-6.2 9.4 6.2 9.4 6.2-3.6 6.2-9.4 6.2S2.6 12 2.6 12z"/><path d="M2.6 12s3.6-6.2 9.4-6.2 9.4 6.2 9.4 6.2-3.6 6.2-9.4 6.2S2.6 12 2.6 12z"/><circle cx="12" cy="12" r="3"/>',
  // a camera: a body, a round lens, a small light
  photo: '<path class="f" d="M5 7.4h14a2 2 0 0 1 2 2v8.2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.4a2 2 0 0 1 2-2z"/><path d="M5 7.4h2.8l1.6-2.4h5.2l1.6 2.4H19a2 2 0 0 1 2 2v8.2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.4a2 2 0 0 1 2-2z"/><circle cx="12" cy="13.4" r="3.4"/><circle cx="17.6" cy="10.2" r=".9" fill="currentColor" stroke="none"/>',
  // a microscope: a slanted tube, a curved arm, a base (nothing meets at a right angle)
  scope: '<path class="f" d="M7.2 4.8l2.8-1.5 4.3 8.1-2.8 1.5z"/><path d="M7.2 4.8l2.8-1.5 4.3 8.1-2.8 1.5z"/><path d="M15.2 20.4c2.4-2 2.8-6.2.4-8.6"/><path d="M4.6 20.4h14.2"/><path d="M8.4 16.6h4.4"/>',
  // a bulb (the inventors)
  invent: '<path class="f" d="M12 2.8a6.4 6.4 0 0 0-3.8 11.5c.7.6 1.1 1.4 1.1 2.3h5.4c0-.9.4-1.7 1.1-2.3A6.4 6.4 0 0 0 12 2.8z"/><path d="M12 2.8a6.4 6.4 0 0 0-3.8 11.5c.7.6 1.1 1.4 1.1 2.3h5.4c0-.9.4-1.7 1.1-2.3A6.4 6.4 0 0 0 12 2.8z"/><path d="M9.6 19.2h4.8M10.6 21.6h2.8"/>',
  // a magnifying lens (a mystery)
  case: '<circle class="f" cx="10.4" cy="10.4" r="6"/><circle cx="10.4" cy="10.4" r="6"/><path d="M14.8 14.8l5.4 5.4" stroke-width="2.6"/><path d="M7.6 8.6a3.4 3.4 0 0 1 2.6-1.9"/>',
  source: HUB_ICONS.scroll,
};
export const stampIcon = (k, cls = '') => `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${STAMP_ICONS[k] || ''}</svg>`;
const threadIcon = (cls = '') => `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${HUB_ICONS.thread || ''}</svg>`;

// the card's stamps: all of them, the earned ones lit ('source' only where the edition has sources)
export function stampsHTML(spId, zone, { sources = false } = {}) {
  let got = [];
  try { got = TH.stamps(spId, zone); } catch (e) { console.error(e); }
  const list = STAMPS.filter((k) => k !== 'source' || sources);
  const n = got.filter((k) => list.includes(k)).length;
  return `<div class="th-stamps" role="list" aria-label="${esc(W(THREAD_WORDS.stamps))}"><small>${esc(W(THREAD_WORDS.stamps))} <b>${n}/${list.length}</b></small>
    ${list.map((k) => { const on = got.includes(k); return `<span class="th-stamp s-${k}${on ? ' on' : ''}" role="listitem" title="${esc(W(STAMP_NAME[k]))}" aria-label="${esc(W(STAMP_NAME[k]))}${on ? '' : ' (' + (kids() ? 'עוֹד לֹא' : 'עוד לא') + ')'}">${stampIcon(k)}</span>`; }).join('')}</div>`;
}

const MARK = { island: ['fromIsland', 'photo'], waiting: ['waiting', 'invent'], recommend: ['recommend', 'case'] };
export function markHTML(kind) {
  const m = MARK[kind]; if (!m) return '';
  return `<i class="th-mark th-${kind}">${stampIcon(m[1])}<span>${esc(W(THREAD_WORDS[m[0]]))}</span></i>`;
}

// ─────────────────────────────── the threads on the journey map
export function mountMapThreads(jm, { emit } = {}) {
  const path = jm.querySelector('.jm-path'), box = jm.querySelector('.jm-threads');
  if (!path || !box) return { redraw() { }, announceFresh() { } };
  let focus = null, raf = 0;
  const list = () => { try { return TH.all(); } catch (e) { console.error(e); return []; } };
  function chips() {
    const L = list(); const open = L.filter((x) => x.open).length;
    const ord = [...L.filter((x) => x.open), ...L.filter((x) => !x.open)];
    box.innerHTML = `<div class="jm-th-head">${threadIcon('jm-th-ic')}<b>${esc(W(THREAD_WORDS.threads))}</b><small>${open} ${esc(W(THREAD_WORDS.of))} ${L.length} ${esc(W(THREAD_WORDS.open))}</small>
        <p class="jm-th-cap" aria-live="polite"></p></div>
      <div class="jm-th-row">${ord.map(({ t, open: o }) => `<button class="jm-th${o ? ' on' : ''}" data-th="${t.id}" title="${esc(W(o ? t.name : t.hint))}"><i class="jm-th-dot"></i><span>${esc(W(t.name))}</span></button>`).join('')}</div>`;
  }
  // a curve from the side of one tile to the side of the other (behind the tiles)
  function lines() {
    const old = path.querySelector('.jm-th-svg'); if (old) old.remove();
    const pr = path.getBoundingClientRect(); if (!pr.width) return;
    const W0 = path.scrollWidth, H0 = Math.max(path.scrollHeight, path.clientHeight);
    const at = (part) => { const b = path.querySelector(`.jm-part[data-part="${CSS.escape(part)}"]`); if (!b) return null; const r = b.getBoundingClientRect(); return { l: r.left - pr.left + path.scrollLeft, r: r.right - pr.left + path.scrollLeft, y: r.top - pr.top + path.scrollTop + r.height / 2, cx: r.left - pr.left + r.width / 2 }; };
    const pairs = new Map();
    for (const { t, open } of list()) {
      const [a, b] = t.parts; const k = [a, b].sort().join('|');
      const p = pairs.get(k) || { a, b, open: false, ids: [] }; p.open = p.open || open; p.ids.push(t.id); pairs.set(k, p);
    }
    let svg = `<svg class="jm-th-svg" width="${W0}" height="${H0}" viewBox="0 0 ${W0} ${H0}" aria-hidden="true">`;
    for (const p of pairs.values()) {
      const A = at(p.a), B = at(p.b); if (!A || !B) continue;
      let x1, x2;
      if (Math.abs(A.cx - B.cx) < 8) { x1 = A.l; x2 = B.l; } else if (A.cx > B.cx) { x1 = A.l; x2 = B.r; } else { x1 = A.r; x2 = B.l; }
      const same = Math.abs(A.cx - B.cx) < 8, dx = same ? -40 : (x2 - x1) * 0.45;
      const d = `M${x1.toFixed(1)} ${A.y.toFixed(1)} C${(x1 + dx).toFixed(1)} ${A.y.toFixed(1)}, ${(x2 - (same ? -40 : dx)).toFixed(1)} ${B.y.toFixed(1)}, ${x2.toFixed(1)} ${B.y.toFixed(1)}`;
      const hot = focus && p.ids.includes(focus);
      svg += `<path class="jm-th-ln${p.open ? ' on' : ''}${hot ? ' hot' : ''}" data-ids="${p.ids.join(' ')}" d="${d}" pathLength="1"/>`
        + `<circle class="jm-th-end${p.open ? ' on' : ''}" cx="${x1.toFixed(1)}" cy="${A.y.toFixed(1)}" r="3.4"/><circle class="jm-th-end${p.open ? ' on' : ''}" cx="${x2.toFixed(1)}" cy="${B.y.toFixed(1)}" r="3.4"/>`;
    }
    path.insertAdjacentHTML('afterbegin', svg + '</svg>');
  }
  function setFocus(id) {
    focus = id;
    path.querySelectorAll('.jm-th-ln').forEach((l) => l.classList.toggle('hot', !!id && l.dataset.ids.split(' ').includes(id)));
    box.querySelectorAll('.jm-th').forEach((c) => c.classList.toggle('hot', c.dataset.th === id));
    const parts = id ? threadById(id) : null;
    jm.querySelectorAll('.jm-part.th-hot').forEach((b) => b.classList.remove('th-hot'));
    if (parts) for (const p of parts.parts) { const b = jm.querySelector(`.jm-part[data-part="${CSS.escape(p)}"]`); if (b) b.classList.add('th-hot'); }
    const cap = box.querySelector('.jm-th-cap');
    if (cap) { const e = list().find((x) => x.t.id === id); cap.textContent = e ? W(e.open ? (TH.lineOf(id) || e.t.name) : e.t.hint) : ''; }
  }
  function redraw() { chips(); cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { lines(); if (focus) setFocus(focus); }); }
  box.addEventListener('click', (e) => {
    const c = e.target.closest('[data-th]'); if (!c) return;
    const id = c.dataset.th; const it = list().find((x) => x.t.id === id); if (!it) return;
    try { emit && emit('ui:click'); } catch (er) { }
    setFocus(id);
    const g = window.__guide; if (!g) return;
    const ln = it.open ? TH.lineOf(id) : null;
    g.tip(ln ? { ...ln } : { f: it.t.hint.f, k: it.t.hint.k, expr: 'curious' }, { ms: 8000 });
  });
  box.addEventListener('pointerover', (e) => { const c = e.target.closest('[data-th]'); if (c) setFocus(c.dataset.th); });
  box.addEventListener('focusin', (e) => { const c = e.target.closest('[data-th]'); if (c) setFocus(c.dataset.th); });
  // one resize listener per map: the map repaints (and mounts this again) on every journey change
  if (jm._thResize) removeEventListener('resize', jm._thResize);
  const onResize = () => { if (jm.isConnected) { cancelAnimationFrame(raf); raf = requestAnimationFrame(lines); } else { removeEventListener('resize', onResize); if (jm._thResize === onResize) jm._thResize = null; } };
  jm._thResize = onResize;
  addEventListener('resize', onResize);
  // the threads that opened since רובו־דע last spoke: their lines glow and he says them, one bubble each (at most three)
  async function announceFresh() {
    let f = []; try { f = TH.fresh(); } catch (e) { return; }
    const g = window.__guide; if (!f.length || !g) return;
    f = f.slice(0, 3); TH.markShown(f.map((t) => t.id));
    const lns = f.map((t) => ({ ...(TH.lineOf(t.id) || { id: 'th.' + t.id, f: t.name.f, k: t.name.k }), at: `.jm-th[data-th="${t.id}"]` }));
    for (const t of f) path.querySelectorAll('.jm-th-ln').forEach((l) => { if (l.dataset.ids.split(' ').includes(t.id)) l.classList.add('new'); });
    setFocus(f[0].id);
    // the new threads' chips first in the row, so רובו־דע's ring finds them on screen
    const row = box.querySelector('.jm-th-row');
    if (row) for (const t of f.slice().reverse()) { const c = row.querySelector(`[data-th="${t.id}"]`); if (c) row.prepend(c); }
    if (row) row.scrollLeft = 0;
    await g.say(lns, { modal: true });
    path.querySelectorAll('.jm-th-ln.new').forEach((l) => l.classList.remove('new'));
  }
  redraw();
  return { redraw, announceFresh, setFocus };
}
