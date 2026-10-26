// "רגעי פסוק" – short source moments in the forest (torah edition only, when "מקורות ופסוקים" is on).
// A verse appears at a natural moment (sunrise, the first tree planted, a nest box, an ant colony, the jaguar…) on a
// parchment note at the top of the screen for ~9 s; a tap closes it. They are rare on purpose: each one at most once
// per visit to the forest, at least 220 s apart, three at the most (25.10, Avi: half of what was) – a moment of
// attention, never a lesson. Never while something else is on the screen (an event, a tour, רובו־דע speaking).
import { TORAH, sourcesOn } from '../core/edition.js';
import { MOMENTS } from '../data/torah.js';

const GAP = 220, SHOW = 9, MAX = 3;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function createSourceMoments({ W, ui, audio }) {
  const off = { onPlace() { }, onTool() { }, tick() { }, dispose() { }, _show() { return false; } };
  if (!TORAH) return off;
  const root = document.getElementById('ui'); if (!root) return off;
  const el = document.createElement('div'); el.className = 'srcm'; el.setAttribute('role', 'status'); root.appendChild(el);
  const shown = new Set();
  let count = 0, lastAt = -1e9, hideT = 0, pending = null, t = 0;
  let prevDay = W.dayFrac ?? 0.5, rainMax = 0, links0 = W.discovered ? W.discovered.size : 0, entryT = 0;
  const by = (trigger) => MOMENTS.find((m) => m.t === trigger);
  const forPlace = (id) => MOMENTS.find((m) => m.t.startsWith('place:') && m.t.slice(6).split('|').includes(id));

  function want(m) {
    if (!m || shown.has(m.id) || count >= MAX || !sourcesOn()) return;
    if (!pending) pending = { m, at: t };
  }
  function show(m) {
    shown.add(m.id); count++; lastAt = t; hideT = SHOW;
    el.innerHTML = `<div class="src-box"><button class="x" aria-label="סגירה">סגור</button><p class="src-text">${esc(m.text)}</p><small class="src-ref">${esc(m.ref)}</small>${m.line ? `<p class="src-line">${esc(m.line)}</p>` : ''}</div>`;
    el.classList.add('on');
    try { audio && audio.play('select'); } catch (e) { /* */ }
  }
  function hide() { el.classList.remove('on'); hideT = 0; }
  el.addEventListener('click', hide);

  function tick(rdt) {
    t += rdt; entryT += rdt;
    if (hideT > 0) { hideT -= rdt; if (hideT <= 0) hide(); }
    if (!sourcesOn()) { if (hideT > 0) hide(); return; }
    // conditions in the forest
    const df = W.dayFrac ?? 0.5;
    if (entryT > 20 && prevDay < 0.25 && df >= 0.25 && df < 0.4) want(by('dawn'));
    prevDay = df;
    rainMax = Math.max(rainMax * Math.exp(-rdt / 120), W.rain || 0);
    if (W.biomeId === 'amazon' && rainMax > 0.4 && (W.rain || 0) < 0.08) { want(by('rainEnd:amazon')); rainMax = 0; }
    if (entryT > 60 && W.vitality < 0.4) want(by('lowVitality'));
    if (W.discovered && W.discovered.size - links0 >= 5) want(by('links'));
    if (W.biomeId === 'grove' && W.season === 'spring' && W.plants.some((p) => p.isTree && p.alive && !p.removed && p.bloom > 0.5)) want(by('bloomSpring'));
    // show when the screen is free
    if (pending && t - pending.at > 45) pending = null;   // the moment passed
    const busy = ui.isModalOpen() || W.viewMode || root.classList.contains('imv-on') || (W.calmBusy && W.calmBusy());
    if (pending && !busy && hideT <= 0 && t - lastAt >= GAP && entryT > 8) { const m = pending.m; pending = null; if (!shown.has(m.id)) show(m); }
  }
  function onPlace(sp) {
    if (!sp) return;
    if (sp.id === 'carob') want(by('plant:carob'));
    else if (sp.kind === 'tree' || sp.kind === 'palm') want(by('plantTree'));
    want(forPlace(sp.id));
  }
  function onTool(id) { want(by('tool:' + id)); }
  function dispose() { el.remove(); }
  return { onPlace, onTool, tick, dispose, _show: (id) => { const m = MOMENTS.find((x) => x.id === id); if (m) show(m); return !!m; } };
}
