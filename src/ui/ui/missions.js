// The right column: the missions panel ("מה עושים עכשיו?", the done list, folding, hints; in חוויה one mission line)
// and the layers (forest floors) buttons.
// Exports: createMissions(ctx) → { mList, mCount, whatBtn, paintMissionLine, paintLayers }.
// Needs from ctx (index.js and the parts made before it): emit, S, rightCol, missions, layersEl.
import { CARD_ART } from '../../data/card-art.js';
import { clamp01, esc, h } from './helpers.js';
import { icon } from './icons.js';

export function createMissions(ctx) {
  const { emit, S, rightCol, missions, layersEl } = ctx;
  /* ================================================================ MISSIONS */
  missions.innerHTML = `<header class="m-head"><span class="m-ic">${icon('flower')}</span><h3>משימות</h3><span class="m-count"></span><button class="m-hist" title="משימות שבוצעו" aria-label="משימות שבוצעו">${icon('check')}<span>בוצעו</span></button>
    <button class="m-fold" title="קפל/פתח" aria-label="קפל או פתח את המשימות" aria-expanded="true">${icon('chevron')}</button></header><ul class="m-list"></ul>`;
  const mList = missions.querySelector('.m-list'), mCount = missions.querySelector('.m-count');
  // 1.3.2: "מה עושים עכשיו?" – רובו־דע answers in one bubble with the current mission's how-to (game.js 'mission:whatnow')
  const whatBtn = h('button', 'm-whatnow', `${icon('robot')}<span>מה עושים עכשיו?</span>`);   // its own row under the panel: never cut off
  rightCol.insertBefore(whatBtn, missions.nextSibling);
  whatBtn.addEventListener('click', (e) => { e.stopPropagation(); emit('mission:whatnow'); });
  missions.querySelector('.m-hist').addEventListener('click', (e) => { e.stopPropagation(); emit('missions:history'); });
  missions.querySelector('.m-head').addEventListener('click', () => { const f = missions.classList.toggle('folded'); missions.querySelector('.m-fold').setAttribute('aria-expanded', String(!f)); });
  mList.addEventListener('click', (e) => {
    const hintB = e.target.closest('.m-hint-btn');
    const li = e.target.closest('li'); if (!li) return;
    if (hintB) { li.classList.add('hint-open'); e.stopPropagation(); return; }
    if (li.classList.contains('xp-one')) { emit('mission:whatnow'); return; }   // חוויה: the one line has no details; רובו־דע tells
    const id = li.dataset.id;
    S.openMission = S.openMission === id ? null : id;
    mList.querySelectorAll('li').forEach((x) => x.classList.toggle('open', x.dataset.id === S.openMission));
  });

  // חוויה (1.3.2): the mission panel is one line with an icon: the mission to do now (a click: רובו־דע explains it)
  const KIND_ICON = { link: 'web', chain: 'web', discover: 'web', tool: 'bulb', photos: 'bulb', rescue: 'bulb', seeded: 'bulb', experiment: 'flask',
    pollinate: 'flower', bloom: 'flower', grow: 'sprout', growTo: 'sprout', place: 'sprout', speciesAlive: 'paw', disperse: 'sprout', health: 'sprout',
    survive: 'leaf', observeNight: 'moon', floorLight: 'sun', all: 'flower' };
  function paintMissionLine(list) {
    missions.classList.add('xp');
    const c = list.find((m) => !m.done && !m.locked), m = c || list.find((x) => x.done);
    if (!m) { mList.innerHTML = ''; mCount.textContent = ''; missions.hidden = true; return; }
    const p = m.done ? 1 : clamp01(m.progress);
    const art = m.sp && CARD_ART[m.sp];
    const pic = art ? `<img src="${art}" alt="" draggable="false">` : icon(KIND_ICON[m.kind] || 'flower');
    mList.innerHTML = `<li data-id="${esc(m.id)}" class="xp-one${m.done ? ' done' : ''}" title="${esc(m.text || '')}"><div class="m-row">
      <span class="m-xic${art ? ' art' : ''}">${pic}</span><b>${esc(m.done ? 'כל המשימות הושלמו!' : m.title)}</b>
      <span class="m-check" style="--p:${(p * 100).toFixed(1)}%">${m.done ? icon('check') : ''}</span></div></li>`;
    mCount.textContent = ''; missions.hidden = false;
  }

  /* ================================================================ LAYERS */
  layersEl.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-id]'); if (!b) return;
    S.activeLayer = b.dataset.id; paintLayers(); emit('view:layer', { id: b.dataset.id });
  });
  function paintLayers() { layersEl.querySelectorAll('button[data-id]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === S.activeLayer))); }
  return { mList, mCount, whatBtn, paintMissionLine, paintLayers };
}
