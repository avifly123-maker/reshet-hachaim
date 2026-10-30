// חוקרי הטבע – the screens of a mystery in progress: the balance meter, the board of measurements, the research table
// (tools, ideas, budget, hints, lab), notes from the field notebook, "see what happens", the lab and the end.
// Plain DOM inside #ui, styled by src/research/research.css (same field-kit look as the rest of the game).
import { icon, esc } from '../ui/ui.js';
import { TOOL_ICONS } from '../game/tool-defs.js';   // plain data (no 3D models)
import { CASE_ICONS } from './case-icons.js';
import { ADV_ICONS } from './icons-adv.js';
import { CARD_ART } from '../data/card-art.js';
import { notebookHTML } from './notebook.js';
import { tileIcon } from '../ui/icons-hub.js';

const svgURL = (body, bg) => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="${bg}"/>${body}</svg>`);
export const R_ICONS = {
  quadrat: svgURL('<g stroke="#8a5a32" stroke-width="3"><path d="M17 20v28M47 20v28"/></g><rect x="15" y="18" width="34" height="28" fill="#8fbf5a" fill-opacity=".35" stroke="#f08a24" stroke-width="2.5"/><circle cx="26" cy="30" r="2.5" fill="#6b4a2a"/><circle cx="37" cy="36" r="2.5" fill="#6b4a2a"/><path d="M32 40c0-5 3-7 6-8" stroke="#3f8f2e" stroke-width="2.4" fill="none"/>', '#f6ead6'),
  seed: svgURL('<g fill="#7a5530"><ellipse cx="24" cy="30" rx="5" ry="7" transform="rotate(-25 24 30)"/><ellipse cx="38" cy="26" rx="5" ry="7" transform="rotate(20 38 26)"/><ellipse cx="33" cy="41" rx="5" ry="7" transform="rotate(-5 33 41)"/></g><path d="M12 50h40" stroke="#a37a4c" stroke-width="3"/>', '#f1e5cf'),
  sprout: svgURL('<path d="M32 50V30" stroke="#3f8f2e" stroke-width="3.5"/><path d="M32 34c-2-8-9-11-16-10 0 7 7 11 16 10zM32 30c2-8 9-11 16-10 0 7-7 11-16 10z" fill="#6fbf4a"/><path d="M18 51h28" stroke="#8a5a32" stroke-width="3.5"/>', '#e6f2da'),
  rain: svgURL('<path d="M18 30a10 10 0 0 1 19-5 8 8 0 1 1 6 14H21a7 7 0 0 1-3-9z" fill="#b7c9d6"/><g stroke="#3a8fd0" stroke-width="3"><path d="M24 44l-3 7M33 44l-3 7M42 44l-3 7"/></g>', '#e6f1f8'),
  nightcam: TOOL_ICONS.camera, camera: TOOL_ICONS.camera, drone: TOOL_ICONS.drone, nestbox: TOOL_ICONS.nestbox, seeddrone: TOOL_ICONS.seeddrone, insecthotel: TOOL_ICONS.insecthotel,
  // the desert (1.4)
  weather: TOOL_ICONS.weather, sandfence: TOOL_ICONS.sandfence, drip: TOOL_ICONS.drip, fognet: TOOL_ICONS.fognet,
  // the reef
  rov: TOOL_ICONS.rov, uwcam: TOOL_ICONS.uwcam, nursery: TOOL_ICONS.nursery, reefball: TOOL_ICONS.reefball, buoy: TOOL_ICONS.buoy, sensor: TOOL_ICONS.sensor,
  holes: svgURL('<path d="M10 46c2-12 9-20 22-21s20 9 22 21z" fill="#b9a68a"/><g fill="#3d3328"><ellipse cx="24" cy="38" rx="4.5" ry="3.6"/><ellipse cx="37" cy="34" rx="4" ry="3.2"/><ellipse cx="44" cy="42" rx="3.4" ry="2.8"/><ellipse cx="31" cy="43" rx="3" ry="2.4"/></g><path d="M14 30c3-3 6-3 8 0M44 22c3-3 6-3 8 0" stroke="#e889a8" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M8 47h48" stroke="#e2cf9e" stroke-width="3"/>', '#d8eef4'),
  // an anchor without a stock: no cross shapes (Avi's rule)
  anchor: svgURL('<circle cx="32" cy="16" r="5" fill="none" stroke="#4a5a68" stroke-width="3.5"/><path d="M32 21v28" stroke="#4a5a68" stroke-width="4" stroke-linecap="round"/><path d="M16 36c1 9 7 14 16 14s15-5 16-14" stroke="#4a5a68" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M12 40l4-5 5 3M52 40l-4-5-5 3" stroke="#4a5a68" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>', '#d8eaf2'),
  // a white (bleached) coral: the skeleton shows
  bleach: svgURL('<path d="M32 52V36M32 40l-9-10v-8M32 38l10-11v-7M23 30l-6-4M42 27l6-5M32 36v-12" stroke="#f4f2ea" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M32 52V36M32 40l-9-10v-8M32 38l10-11v-7" stroke="#d8d4c8" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M14 53h36" stroke="#c8b48a" stroke-width="4" stroke-linecap="round"/>', '#3f8fb5'),
  // muddy water from the wadi
  mud: svgURL('<path d="M8 26c6-4 10-4 16 0s10 4 16 0 10-4 16 0v22H8z" fill="#9a7a52"/><g fill="#6e5236"><circle cx="18" cy="36" r="2.4"/><circle cx="30" cy="42" r="2.8"/><circle cx="43" cy="35" r="2.2"/><circle cx="48" cy="44" r="1.8"/></g><path d="M8 26c6-4 10-4 16 0s10 4 16 0 10-4 16 0" stroke="#c8a87a" stroke-width="2.5" fill="none"/>', '#dbe9f0'),
  // a round fish-farm cage: a floating ring with a net of vertical lines only
  cage: svgURL('<ellipse cx="32" cy="24" rx="20" ry="7" fill="none" stroke="#e8a03a" stroke-width="4"/><path d="M12 24v18c0 4 9 7 20 7s20-3 20-7V24" fill="#7aa8c0" fill-opacity=".35"/><g stroke="#4a6878" stroke-width="1.6"><path d="M18 29v17M25 31v17M32 31v18M39 31v17M46 29v17"/></g><path d="M8 24h48" stroke="#3a8fd0" stroke-width="2" stroke-dasharray="3 3"/>', '#e6f1f8'),
  // a poison bait box: a closed box with a red "!" (no skull, no cross)
  poison: svgURL('<rect x="13" y="24" width="38" height="24" rx="4" fill="#5a6470"/><rect x="13" y="20" width="38" height="8" rx="3" fill="#6e7a86"/><path d="M28 48v-6h8v6" fill="#2a3038"/><path d="M32 30v8" stroke="#e8433a" stroke-width="4" stroke-linecap="round"/><circle cx="32" cy="42.5" r="2.2" fill="#e8433a"/>', '#f6e6d0'),
  // a hedge of bushes along a field edge
  hedge: svgURL('<path d="M8 50h48" stroke="#8a5a32" stroke-width="3"/><g fill="#4f8a3f"><circle cx="17" cy="38" r="9"/><circle cx="31" cy="34" r="11"/><circle cx="46" cy="38" r="9"/></g><g fill="#6fbf4a"><circle cx="14" cy="35" r="4"/><circle cx="29" cy="29" r="5"/><circle cx="44" cy="34" r="4"/></g><g fill="#c8473a"><circle cx="22" cy="40" r="1.8"/><circle cx="36" cy="38" r="1.8"/><circle cx="49" cy="41" r="1.8"/></g>', '#f1e9d6'),
  // a strip of forest joining a small patch to the big forest
  corridor: svgURL('<path d="M6 44c10-2 14-10 26-10s18 8 26 6" stroke="#8fbf5a" stroke-width="9" fill="none" stroke-linecap="round"/><g fill="#3f7a3a"><circle cx="11" cy="30" r="8"/><circle cx="20" cy="24" r="7"/><circle cx="46" cy="22" r="9"/><circle cx="55" cy="30" r="7"/></g><g fill="#5f9a4a"><circle cx="28" cy="36" r="4"/><circle cx="36" cy="33" r="4"/></g>', '#e6f2da'),
  // a box hive of honeybees
  hive: svgURL('<rect x="16" y="22" width="32" height="10" rx="2" fill="#e8b84a"/><rect x="16" y="33" width="32" height="10" rx="2" fill="#d9a43a"/><rect x="14" y="17" width="36" height="5" rx="2" fill="#a8742a"/><rect x="28" y="40" width="8" height="3" fill="#5a3a1a"/><g fill="#2a2420"><circle cx="50" cy="20" r="2"/><circle cx="12" cy="40" r="2"/></g><path d="M16 46h32" stroke="#8a5a32" stroke-width="3"/>', '#fbf1d6'),
  // corn spread on the ground
  corn: svgURL('<path d="M32 50V22" stroke="#7a9a3a" stroke-width="3"/><ellipse cx="32" cy="28" rx="7" ry="13" fill="#f2c23a"/><g fill="#e0a82a"><circle cx="29" cy="22" r="1.6"/><circle cx="35" cy="22" r="1.6"/><circle cx="29" cy="28" r="1.6"/><circle cx="35" cy="28" r="1.6"/><circle cx="29" cy="34" r="1.6"/><circle cx="35" cy="34" r="1.6"/></g><path d="M25 38c-6-2-9-8-9-14 6 2 9 7 9 14zM39 38c6-2 9-8 9-14-6 2-9 7-9 14z" fill="#8fbf5a"/>', '#fbf1d6'),
  // bread crumbs on the water
  bread: svgURL('<path d="M8 40c6-4 10-4 16 0s10 4 16 0 10-4 16 0" stroke="#3a8fd0" stroke-width="3" fill="none"/><path d="M18 30c0-6 6-10 14-10s14 4 14 10v4H18z" fill="#d9a45a"/><path d="M22 26c3-2 6-2 9 0M33 26c3-2 6-2 9 0" stroke="#b07a3a" stroke-width="2" fill="none"/><g fill="#d9a45a"><circle cx="16" cy="44" r="2"/><circle cx="44" cy="46" r="2"/><circle cx="30" cy="47" r="1.6"/></g>', '#dbe9f0'),
  // a bottle of medicine poured into the sea (no cross: a drop on the label)
  medicine: svgURL('<rect x="24" y="18" width="16" height="6" rx="2" fill="#6e7a86"/><rect x="21" y="24" width="22" height="24" rx="5" fill="#b8d8e8"/><path d="M32 30c-3 4-4 6-4 8a4 4 0 0 0 8 0c0-2-1-4-4-8z" fill="#3a8fd0"/><path d="M10 52c6-3 10-3 16 0s10 3 16 0 10-3 16 0" stroke="#3a8fd0" stroke-width="3" fill="none"/>', '#e6f1f8'),
  // edible seaweed grown on ropes beside the fish cages
  seaweed: svgURL('<path d="M8 22h48" stroke="#8a5a32" stroke-width="2.5"/><g fill="#4f9a3c"><path d="M16 22c-4 8 4 12 0 20 6-6 2-12 4-20z"/><path d="M30 22c-4 9 4 14 0 24 6-7 2-14 4-24z"/><path d="M44 22c-4 8 4 12 0 20 6-6 2-12 4-20z"/></g><path d="M8 50c6-3 10-3 16 0s10 3 16 0 10-3 16 0" stroke="#3a8fd0" stroke-width="3" fill="none"/>', '#e6f1f8'),
  // an old hollow tree (two bare limbs going up and apart, no crossing)
  hollow: svgURL('<path d="M27 32c-2-6-7-9-11-12M37 30c2-5 6-8 10-10" stroke="#7a5530" stroke-width="5" fill="none" stroke-linecap="round"/><rect x="24" y="26" width="16" height="28" rx="5" fill="#8a6038"/><ellipse cx="32" cy="38" rx="4" ry="5.5" fill="#2a1a10"/><path d="M14 56h36" stroke="#8a5a32" stroke-width="3"/>', '#f1e9d6'),
  // a pile of branches at the field edge: logs stacked side by side (no crossing sticks)
  piles: svgURL('<g fill="#8a6038" stroke="#5a3a1a" stroke-width="1.5"><rect x="12" y="40" width="40" height="7" rx="3.5"/><rect x="16" y="33" width="32" height="7" rx="3.5"/><rect x="22" y="26" width="20" height="7" rx="3.5"/></g><g fill="#6f9a4a"><circle cx="50" cy="31" r="3.5"/><circle cx="14" cy="35" r="3"/></g><path d="M8 50h48" stroke="#8a5a32" stroke-width="3"/>', '#f1e9d6'),
  parasites: svgURL('<ellipse cx="30" cy="32" rx="18" ry="11" fill="#e8a03a"/><path d="M46 32l10-7v14z" fill="#e8a03a"/><circle cx="20" cy="29" r="2.4" fill="#2a2420"/><g fill="#7a3a5a"><circle cx="30" cy="30" r="2.2"/><circle cx="36" cy="36" r="2"/><circle cx="27" cy="38" r="1.8"/><circle cx="40" cy="28" r="1.6"/></g>', '#f6e6d0'),
};
for (const k in CASE_ICONS) if (!R_ICONS[k]) R_ICONS[k] = CASE_ICONS[k];   // pictures of the frogs, young oaks and leaf-cutters mysteries
Object.assign(R_ICONS, ADV_ICONS);   // the advanced mysteries' own icons (icons-adv.js)
const LIGHT_ICONS = { life: 'paw', regen: 'sprout', env: 'drop' };

export function createResearchUI(root, o) {
  const { T, C, thumbs } = o;
  const kids = C.level === 'kids';
  const els = [];
  const mk = (cls, html, parent = root, tag = 'div') => { const e = document.createElement(tag); e.className = cls; if (html != null) e.innerHTML = html; parent.appendChild(e); if (parent === root) els.push(e); return e; };
  // a picture: the card painting when there is one (creatures, and devices such as the camera or the nest box), else the
  // research icon; `species:<id>` names a creature
  const pic = (thumb, ic, cls = 'rs-pic') => {
    if (!thumb && ic && ic.startsWith('species:')) thumb = thumbs[ic.slice(8)] || CARD_ART[ic.slice(8)];
    if (!thumb && ic && CARD_ART[ic]) thumb = CARD_ART[ic];
    return thumb ? `<img class="${cls}" src="${thumb}" alt="" draggable="false">` : R_ICONS[ic] ? `<img class="${cls}" src="${R_ICONS[ic]}" alt="" draggable="false">` : `<span class="${cls} rs-pic-ic">${icon(ic || 'leaf')}</span>`;
  };
  const ideaPic = (i) => i.thumb ? pic(i.thumb) : pic(null, i.icon);

  let meter, board, table, notes, ffEl, steps, sayEl, ro = null;   // leaving goes through the game's own home button (toolbar)
  const STEP_IC = ['binoc', 'search', 'pencil', 'flask', 'bulb'];
  function mount() {
    root.classList.add('research');
    if (kids) root.classList.add('rs-kids');
    // the five steps of a researcher: where we are; a step can be tapped, and "what now?" answers in one sentence
    steps = mk('rs-steps', `<ol>${[0, 1, 2, 3, 4].map((i) => `<li><button class="rs-st" data-step="${i}"><b>${icon(STEP_IC[i])}</b><span>${esc(T('s' + i))}</span></button></li>`).join('')}</ol>
      <button class="rs-now">${icon('help')}<span>${esc(T('whatNow'))}</span></button>`);
    steps.addEventListener('click', (e) => {
      const s = e.target.closest('[data-step]'); if (s) { o.onStep && o.onStep(+s.dataset.step); return; }
      if (e.target.closest('.rs-now')) o.onWhatNow && o.onWhatNow();
    });
    sayEl = mk('rs-say', '');
    sayEl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-say]'); if (b && sayEl._h && sayEl._h[b.dataset.say]) { sayEl._h[b.dataset.say](); return; }
      if (e.target.closest('.rs-say-x')) hideSay();
    });
    meter = mk('rs-meter plate', `<div class="rs-m-title">${esc(T('meter'))}</div>
      <div class="rs-lights">${['life', 'regen', 'env'].map((k) => `<div class="rs-light" data-k="${k}"><span class="rs-bulb">${icon(LIGHT_ICONS[k])}</span><span class="rs-l-name">${esc(C.lightNames[k])}</span></div>`).join('')}</div>
      <div class="rs-clock"><div class="rs-clock-fill"></div></div><div class="rs-m-line"></div>`);
    board = mk('rs-board paper', `<h3>${esc(T('board'))}</h3><ul class="rs-rows"></ul>`);
    table = mk('rs-table', '');
    notes = mk('rs-notes', '');
    ffEl = mk('rs-ff', '');
    ffEl.addEventListener('click', (e) => { if (e.target.closest('[data-see]')) o.onSee(); });
    table.addEventListener('click', onTableClick);
    // a long row of ideas: the mouse wheel scrolls it sideways
    table.addEventListener('wheel', (e) => { const r = e.target.closest('.rs-ideas'); if (!r || r.scrollWidth <= r.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; r.scrollBy({ left: -e.deltaY }); e.preventDefault(); }, { passive: false });
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(() => window.dispatchEvent(new Event('resize'))); ro.observe(table); }
    notes.addEventListener('click', onNoteClick);
  }

  // ───────────── balance meter
  let lastSig = '';
  let solvedLine = '';
  function setSolved(text) { solvedLine = text; lastSig = ''; if (meter) meter.classList.toggle('solved', !!text); }
  function setLights(L, held, hold) {
    if (!meter) return;
    const sig = `${L.life}${L.regen}${L.env}|${Math.floor(held)}|${solvedLine}`;
    if (sig === lastSig) return; lastSig = sig;
    for (const k of ['life', 'regen', 'env']) meter.querySelector(`[data-k="${k}"]`).classList.toggle('on', !!L[k]);
    const all = L.life && L.regen && L.env;
    meter.classList.toggle('all', all);
    meter.querySelector('.rs-clock-fill').style.width = (100 * held / hold).toFixed(1) + '%';
    meter.querySelector('.rs-m-line').textContent = solvedLine ? solvedLine : all ? T('balanced', { n: Math.max(0, Math.ceil(hold - held)) }) : held > 0 ? T('clockWaits') : T('notYet');
  }

  // ───────────── the step bar: { cur, done: [5 booleans] } (a step left out on the way shows as hollow)
  let stepSig = '';
  function setSteps(st) {
    if (!steps) return;
    const sig = st.cur + '|' + st.done.join('');
    if (sig === stepSig) return; stepSig = sig;
    steps.querySelectorAll('.rs-st').forEach((b, i) => {
      b.classList.toggle('on', i === st.cur);
      b.classList.toggle('done', !!st.done[i] && i !== st.cur);
      b.classList.toggle('skip', !st.done[i] && i < st.cur);
      b.querySelector('b').innerHTML = st.done[i] && i !== st.cur ? icon('check') : icon(STEP_IC[i]);
    });
  }
  // a bubble of רובו־דע under the step bar: "what now?", the guided mystery's steps. opts: { buttons: [{ id, label, primary }],
  // on: { id: fn }, sticky (no closing by time), skip: { label, fn } }
  function say(text, opts = {}) {
    if (!sayEl) return;
    clearTimeout(sayEl._t);
    sayEl._h = { ...(opts.on || {}) };
    const btns = (opts.buttons || []).map((b) => `<button class="rs-say-b${b.primary ? ' p' : ''}" data-say="${b.id}">${esc(b.label)}</button>`).join('');
    sayEl.className = 'rs-say on' + (opts.tut ? ' tut' : '') + (opts.low ? ' low' : '');
    root.classList.toggle('rs-say-low', !!opts.low);   // a window open under it leaves room at the bottom
    sayEl.innerHTML = `${tileIcon('robot', 'rs-say-ic')}<div class="rs-say-body"><p>${esc(text)}</p>${btns ? `<div class="rs-say-bs">${btns}</div>` : ''}</div>
      ${opts.sticky ? '' : `<button class="rs-say-x" aria-label="${esc(T('close'))}">${icon('close')}</button>`}`;
    if (!opts.sticky) sayEl._t = setTimeout(hideSay, opts.ttl || 9000);
  }
  function hideSay() { if (!sayEl) return; clearTimeout(sayEl._t); sayEl.className = 'rs-say'; root.classList.remove('rs-say-low'); }
  // highlight one element (the guided mystery points at the next button); null clears
  let hiSel = null;
  function hi(sel) {
    hiSel = sel;
    document.querySelectorAll('.rs-hi').forEach((e) => { if (!sel || !e.matches(sel)) e.classList.remove('rs-hi'); });
    if (sel) { const e = [...document.querySelectorAll(sel)].find((x) => x.offsetParent !== null || x.getClientRects().length); if (e) e.classList.add('rs-hi'); }
  }
  // a short glow on a part of the desk (a tapped step points at the tools or the ideas)
  function pulse(sel) {
    const e = (table && table.querySelector(sel)) || document.querySelector(sel); if (!e) return;
    e.classList.remove('rs-pulse'); void e.offsetWidth; e.classList.add('rs-pulse');
    setTimeout(() => e.classList.remove('rs-pulse'), 2400);
  }

  // ───────────── the board of measurements
  let boardSig = '';
  function setBoard(rows) {
    if (!board) return;
    const sig = rows.map((r) => `${r.id}:${r.known ? r.value : '?'}:${r.trend}`).join('|');
    if (sig === boardSig) return; boardSig = sig;
    board.querySelector('.rs-rows').innerHTML = rows.map((r) => `<li class="${r.known ? 'k' : 'u'}">${pic(r.thumb, r.icon)}<span class="rs-r-name">${esc(r.name)}</span>
      ${r.known ? `<b class="rs-r-val">${r.value}</b><i class="rs-trend t${r.trend}">${r.trend > 0 ? '▲' : r.trend < 0 ? '▼' : '•'}</i>`
        : `<button class="rs-r-q" data-tool="${r.tool ? r.tool.id : ''}" title="${esc(T('unknown'))}">?${r.tool ? pic(null, r.tool.icon, 'rs-r-tool') : ''}</button>`}</li>`).join('');
    board.querySelectorAll('.rs-r-q').forEach((b) => b.addEventListener('click', () => b.dataset.tool && o.onTool(b.dataset.tool)));
  }

  // ───────────── the research table
  function setTable(st) {
    if (!table) return;
    const oldRow = table.querySelector('.rs-ideas'), keepX = oldRow ? oldRow.scrollLeft : 0;   // the row of ideas keeps its place
    table.innerHTML = `<div class="rs-desk">
      <section class="rs-sec rs-sec-tools"><h4>${esc(T('tools'))}</h4><div class="rs-tools">${st.tools.map((t) => `<button class="rs-tool${t.placed ? ' placed' : ''}" data-tool="${t.id}">${pic(null, t.icon)}<span>${esc(t.name)}</span>${t.placed ? `<i class="rs-ok">${icon('check')}</i>` : ''}</button>`).join('')}</div></section>
      <section class="rs-sec rs-sec-ideas"><h4>${esc(T('ideas'))}</h4><div class="rs-ideas${st.ideas.length > 6 ? ' many' : ''}">${st.ideas.map((i) => `<div class="rs-idea${i.full ? ' full' : ''}${i.tech ? ' tech' : ''}" data-idea="${i.id}">${ideaPic(i)}<span class="rs-i-title">${esc(i.title)}</span>
        <span class="rs-i-amts">${i.amounts.map((n) => `<button data-n="${n}" ${i.full ? 'disabled' : ''}>${i.amounts.length > 1 || n > 1 ? ((kids ? 'פִּי ' : 'פי ') + n) : `${icon('plus')}`}<small>${i.perUnit ? i.cost * n : i.cost}</small></button>`).join('')}</span>
        ${i.used ? `<i class="rs-used">${i.used}</i>` : ''}</div>`).join('')}</div></section>
      <section class="rs-sec rs-sec-side">
        <div class="rs-budget" title="${esc(T('budget'))}"><span>${esc(T('budget'))}</span><b>${st.budget}</b><div class="rs-b-bar"><i style="width:${st.budgetMax ? (100 * st.budget / st.budgetMax).toFixed(0) : 0}%"></i></div></div>
        <button class="rs-hint" data-hint="1">${icon('bulb')}<span>${esc(T('hint'))}</span><span class="rs-bulbs"></span></button>
        <button class="rs-lab" data-lab="1">${icon('book')}<span>${esc(T('lab'))}</span></button>
        ${kids ? (st.stuck ? `<div class="rs-sbx"><button class="rs-retry" data-retry="1" title="${esc(T('retryTip'))}">${icon('undo')}<span>${esc(T('retry'))}</span></button></div>` : '') : `<div class="rs-sbx"><button class="rs-log" data-log="1">${icon('book')}<span>${esc(T('log'))}</span><i class="rs-log-n">${logN || ''}</i></button>
        <button class="rs-retry" data-retry="1" title="${esc(T('retryTip'))}">${icon('undo')}<span>${esc(T('retry'))}</span></button></div>`}
      </section></div>`;
    setBulbs(bulbsN, bulbsMax);
    if (keepX) { const r = table.querySelector(".rs-ideas"); if (r) r.scrollLeft = keepX; }
  }
  function onTableClick(e) {
    const t = e.target.closest('[data-tool]'); if (t) { o.onTool(t.dataset.tool); return; }
    const amt = e.target.closest('.rs-idea [data-n]');
    if (amt) { const card = amt.closest('.rs-idea'); card.classList.remove('pulse'); void card.offsetWidth; card.classList.add('pulse'); o.onIdea(card.dataset.idea, +amt.dataset.n); return; }
    if (e.target.closest('[data-hint]')) { o.onHint(); return; }
    if (e.target.closest('[data-lab]')) { o.onLab(); return; }
    if (e.target.closest('[data-log]')) { o.onLog && o.onLog(); return; }
    const rt = e.target.closest('[data-retry]');
    if (rt) {   // two steps, so a stray click does not start over
      if (!rt.classList.contains('sure')) { rt.classList.add('sure'); rt.querySelector('span').textContent = T('retrySure'); clearTimeout(rt._t); rt._t = setTimeout(() => { rt.classList.remove('sure'); rt.querySelector('span').textContent = T('retry'); }, 3500); return; }
      clearTimeout(rt._t); o.onRetry && o.onRetry();
    }
  }
  let logN = 0;
  function setLogCount(n) { logN = n; const i = table && table.querySelector('.rs-log-n'); if (i) { i.textContent = n || ''; i.classList.remove('bump'); void i.offsetWidth; i.classList.add('bump'); } }
  let bulbsN = 1, bulbsMax = 3;
  function setBulbs(n, max) {
    bulbsN = n; bulbsMax = max;
    const b = table && table.querySelector('.rs-bulbs'); if (!b) return;
    b.innerHTML = Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
  }

  // ───────────── notes from the field notebook
  function note(text, opts = {}) {
    if (!notes) return;
    const n = mk('rs-note' + (opts.kind ? ' ' + opts.kind : ''), `${opts.icon ? pic(null, opts.icon, 'rs-n-ic') : opts.kind === 'hint' ? `<span class="rs-n-ic rs-pic-ic">${icon('bulb')}</span>` : ''}
      <div class="rs-n-body"><p>${esc(text)}</p>
      ${opts.counts ? `<ul class="rs-n-counts">${opts.counts.map((c) => `<li>${pic(c.thumb, c.icon)}<b>${c.value}</b><span>${esc(c.name)}</span></li>`).join('')}</ul>` : ''}
      ${opts.action ? `<button class="rs-n-act" data-act="${opts.action.id}">${esc(opts.action.label)}</button>` : ''}</div>
      <button class="rs-n-x" aria-label="${esc(T('close'))}">${icon('close')}</button>`, notes);
    requestAnimationFrame(() => n.classList.add('on'));
    const ttl = opts.kind === 'surprise' ? 16000 : opts.counts || opts.action ? 14000 : opts.kind === 'hint' ? 12000 : 6500;
    n._t = setTimeout(() => dropNote(n), ttl);
    const live = [...notes.children].filter((x) => !x._gone);
    for (let i = 0; i < live.length - 3; i++) dropNote(live[i]);   // at most three notes at a time: the oldest go
    return n;
  }
  function dropNote(n) { if (!n || n._gone) return; n._gone = true; clearTimeout(n._t); n.classList.remove('on'); setTimeout(() => n.remove(), 350); }
  function onNoteClick(e) {
    const a = e.target.closest('[data-act]');
    if (a) { if (a.dataset.act === 'tonight') o.onToNight(); if (a.dataset.act === 'lab') o.onLab(); dropNote(a.closest('.rs-note')); return; }
    if (e.target.closest('.rs-n-x')) dropNote(e.target.closest('.rs-note'));
  }

  // ───────────── "see what happens"
  function offerSee(idea) {
    if (!ffEl) return;
    ffEl.className = 'rs-ff on';
    ffEl.innerHTML = `<button class="rs-see" data-see="1">${icon('fast')}<span>${esc(T('see'))}</span></button>`;
    clearTimeout(ffEl._t); ffEl._t = setTimeout(() => { if (!ffEl.classList.contains('run')) ffEl.className = 'rs-ff'; }, 20000);
  }
  function setFF({ on, p = 0 }) {
    if (!ffEl) return;
    if (on) {
      if (!ffEl.classList.contains('run')) { ffEl.className = 'rs-ff on run'; ffEl.innerHTML = `<div class="rs-wait">${icon('hourglass')}<span>${esc(T('seeing'))}</span><div class="rs-w-bar"><i></i></div></div>`; }
      const i = ffEl.querySelector('.rs-w-bar i'); if (i) i.style.width = (100 * p).toFixed(0) + '%';
    } else { ffEl.className = 'rs-ff'; ffEl.innerHTML = ''; }
  }

  // ───────────── modals: intro, lab, solved
  let modal = null;
  function openModal(cls, html) {
    closeModal();
    modal = mk('rs-modal ' + cls, `<div class="rs-scrim"></div><div class="rs-sheet">${html}</div>`);
    requestAnimationFrame(() => modal && modal.classList.add('on'));
    sayLow(true);
    return modal;
  }
  // the guided mystery's bubble moves under an open window, and back up when it closes (at once, not a frame later)
  function sayLow(on) { if (!sayEl || !sayEl.classList.contains('tut')) return; sayEl.classList.toggle('low', on); root.classList.toggle('rs-say-low', on && sayEl.classList.contains('on')); }
  function closeModal() { if (!modal) return; const m = modal; modal = null; sayLow(false); m.classList.remove('on'); m.style.pointerEvents = 'none';   /* a closing window never catches the next click */ const i = els.indexOf(m); if (i >= 0) els.splice(i, 1); setTimeout(() => m.remove(), 300); }
  const isOpen = () => !!modal;

  function showIntro() {
    const cast = C.board.filter((b) => b.species).map((b) => `<img src="${thumbs[b.species]}" alt="">`).join('');
    const m = openModal('rs-intro', `<div class="rs-tape"></div><div class="rs-case-tag">${icon('binoc')}<span>${esc(kids ? 'תַּעֲלוּמָה' : 'תעלומה')}</span></div>
      <h2>${esc(C.title)}</h2><p class="rs-call">${esc(C.call)}</p><p class="rs-more">${esc(C.callMore)}</p>
      <div class="rs-cast">${cast}</div>
      <button class="rs-go">${esc(T('start'))}${icon('arrowL')}</button>`);
    const go = () => { closeModal(); o.onIntroClosed && o.onIntroClosed(); };
    m.querySelector('.rs-go').addEventListener('click', go);
    m.querySelector('.rs-scrim').addEventListener('click', go);
  }

  // a dilemma: two (or three) ways, each with what it gives and what it costs; choosing one applies that idea
  function showDilemma(D, onChoose, onLater) {
    const m = openModal('rs-intro rs-dilemma', `<div class="rs-tape"></div><div class="rs-case-tag">${icon('bulb')}<span>${esc(kids ? 'דִּילֶמָּה' : 'דילמה')}</span></div>
      <h2>${esc(D.title)}</h2><p class="rs-call">${esc(D.text)}</p>
      <div class="rs-dl-opts">${D.options.map((op) => { const i = C.ideas.find((x) => x.id === op.idea) || {}; return `<button class="rs-dl-opt" data-idea="${esc(op.idea)}">${ideaPic({ thumb: i.icon && i.icon.startsWith('species:') ? thumbs[i.icon.slice(8)] : null, icon: i.icon })}
        <b>${esc(op.title || i.title || '')}</b><span class="rs-dl-plus">${esc(op.plus)}</span><span class="rs-dl-minus">${esc(op.minus)}</span><small>${esc(T('budget'))}: ${i.perUnit ? i.cost * ((i.amounts && i.amounts[0]) || 1) : i.cost ?? ''}</small></button>`; }).join('')}</div>
      <button class="rs-dl-later">${esc(D.later || T('close'))}</button>`);
    m.querySelectorAll('.rs-dl-opt').forEach((b) => b.addEventListener('click', () => { closeModal(); onChoose(b.dataset.idea); }));
    m.querySelector('.rs-dl-later').addEventListener('click', () => { closeModal(); if (onLater) onLater(); });
  }

  // the researcher's notebook (notebook.js): get() gives fresh data each time it is drawn (a chosen hypothesis, a new
  // measurement); tab: 'measure' | 'hyp' | 'links' | 'log'
  let nb = null;
  function openNotebook(get, tab = 'measure') {
    nb = { get, tab, sel: null };
    const draw = () => {
      if (!nb) return;
      const d = get();
      if (!nb.sel) { const k = d.rows.filter((r) => r.known); const best = k.slice().sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0]; nb.sel = best ? [best.id] : []; }
      nb.sel = nb.sel.filter((id) => d.rows.some((r) => r.id === id && r.known));
      const html = notebookHTML(d, nb.tab, nb.sel, { T, kids, pic });
      if (modal && modal.classList.contains('rs-nbm')) { const s = modal.querySelector('.rs-sheet'); const keep = s.querySelector('.nb-page'); const y = keep ? keep.scrollTop : 0; s.innerHTML = html; const p = s.querySelector('.nb-page'); if (p && nb.keepScroll) p.scrollTop = y; }
      else openModal('rs-labm rs-nbm', html);
      nb.keepScroll = false;
    };
    draw();
    const m = modal;
    if (m._nb) return; m._nb = true;   // already open: drawn again on the asked page, with its own clicks
    m.addEventListener('click', (e) => {
      if (!nb || modal !== m) return;
      if (e.target.closest('.rs-x') || e.target.classList.contains('rs-scrim')) { closeModal(); return; }
      const t = e.target.closest('[data-tab]'); if (t) { nb.tab = t.dataset.tab; o.onNotebookTab && o.onNotebookTab(nb.tab); draw(); return; }
      const r = e.target.closest('[data-row]');
      if (r) {   // one line; a tap on another adds it for comparing (two at most); a tap on a chosen one takes it off
        const id = r.dataset.row, i = nb.sel.indexOf(id);
        if (i >= 0) { if (nb.sel.length > 1) nb.sel.splice(i, 1); } else { nb.sel.push(id); if (nb.sel.length > 2) nb.sel.shift(); }
        nb.keepScroll = true; draw(); return;
      }
      const ms = e.target.closest('.nb-measure[data-tool]'); if (ms && ms.dataset.tool) { closeModal(); o.onTool(ms.dataset.tool); return; }
      const pk = e.target.closest('[data-pick]'); if (pk) { o.onGuess(pk.dataset.pick); nb.keepScroll = true; draw(); return; }
      const out = e.target.closest('[data-out]'); if (out) { o.onRule && o.onRule(out.dataset.out, true); nb.keepScroll = true; draw(); return; }
      const bk = e.target.closest('[data-back]'); if (bk) { o.onRule && o.onRule(bk.dataset.back, false); nb.keepScroll = true; draw(); return; }
    });
  }
  const nbOpen = () => !!(modal && modal.classList.contains('rs-nbm'));
  const nbTab = () => (nbOpen() && nb ? nb.tab : null);

  // what happened and why, after "see what happens": d = { ideas: [{ title, thumb, icon }], story, rows: [{ name, thumb,
  // icon, before, after, dir, known, why }], heals, why: [text], guess, onWrite }
  function showConclusion(d) {
    const tried = d.ideas.map((i) => `<span class="cc-idea">${ideaPic(i)}<b>${esc(i.title)}</b></span>`).join('');
    const rows = d.rows.length ? d.rows.map((r) => `<li class="cc-row d${r.dir}">${pic(r.thumb, r.icon, 'cc-pic')}<div><span class="cc-name">${esc(r.name)}</span>
        ${r.known ? `<span class="cc-num"><b>${r.before}</b><i>${r.dir > 0 ? '▲' : '▼'}</i><b>${r.after}</b></span>` : `<span class="cc-num u">${esc(T('unknownRow'))}</span>`}
        ${r.why ? `<p>${esc(r.why)}</p>` : ''}</div></li>`).join('') : `<li class="cc-row"><p>${esc(T('conclNothing'))}</p></li>`;
    const verdict = d.heals ? `<div class="cc-verdict ok">${icon('check')}<p>${esc(T('conclGood'))}</p></div>`
      : d.why.length ? `<div class="cc-verdict why"><h3>${icon('bulb')}${esc(T('conclWhy'))}</h3>${d.why.map((w) => `<p>${esc(w)}</p>`).join('')}</div>` : '';
    const g = d.guess;
    const hyp = g ? `<div class="cc-hyp"><span>${esc(T('conclGuess'))}</span> <b>${esc(g.text)}</b><div class="cc-hq"><span>${esc(T('conclStill'))}</span>
        <button class="cc-yes">${esc(T('conclYes'))}</button><button class="cc-change">${esc(T('conclChange'))}</button></div></div>`
      : `<div class="cc-hyp none"><span>${esc(T('conclNoGuess'))}</span><button class="cc-change">${esc(T('conclWrite'))}</button></div>`;
    const m = openModal('rs-concl', `<div class="cc-sheet"><div class="rs-tape"></div><h2>${icon('bulb')}${esc(T('conclTitle'))}</h2>
      <div class="cc-tried"><small>${esc(T('conclTried'))}</small>${tried}</div>
      ${d.story ? `<p class="cc-story">${esc(d.story)}</p>` : ''}
      ${verdict}
      <h3 class="cc-h">${esc(T('conclSaw'))}</h3><ul class="cc-rows">${rows}</ul>
      ${hyp}
      <div class="cc-btns"><button class="cc-again">${esc(d.heals ? T('conclOk') : T('conclAgain'))}</button><button class="cc-graph">${icon('search')}${esc(T('conclGraph'))}</button></div></div>`);
    m.querySelector('.cc-again').addEventListener('click', () => closeModal());
    m.querySelector('.rs-scrim').addEventListener('click', () => closeModal());
    m.querySelector('.cc-graph').addEventListener('click', () => { closeModal(); o.onLab('measure'); });
    const y = m.querySelector('.cc-yes'); if (y) y.addEventListener('click', () => { y.closest('.cc-hq').innerHTML = `<b class="cc-kept">${icon('check')}</b>`; });
    m.querySelector('.cc-change').addEventListener('click', () => { closeModal(); o.onLab('hyp'); });
  }



  function showSolved(d) {
    const starNames = [T('starHealed'), T('starGuess'), T('starThrift')];
    const stars = d.stars.map((s, i) => `<div class="rs-star${s ? ' on' : ''}" style="--i:${i}"><svg viewBox="0 0 24 24"><path d="M12 2.6l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.9l-5.8 3.2 1.4-6.4-4.9-4.4 6.5-.7z"/></svg><span>${esc(starNames[i])}</span></div>`).join('');
    const src = d.source ? `<div class="rs-src" style="--c:${d.source.col}"><small>${esc(T('sourceWon'))}</small><b>${esc(d.source.title)}</b><p>${esc(d.source.quote || '')}</p><i>${esc(d.source.ref)}</i>${d.source.lesson ? `<p class="rs-src-l">${esc(d.source.lesson)}</p>` : ''}</div>` : '';
    const m = openModal('rs-solved', `<div class="rs-burst"></div><h2>${esc(T('solvedTitle'))}</h2><div class="rs-stars">${stars}</div>
      ${d.other ? `<div class="rs-other">${icon('sparkle')}<b>${esc(T('otherWay'))}</b></div>` : ''}
      <p class="rs-solved-t">${esc(d.solvedText)}</p>
      ${!kids && d.tries ? `<p class="rs-tries">${esc(T('triesLine', { n: d.tries, a: d.attempt }))}</p>` : ''}
      <div class="rs-learn"><b>${esc(T('learned'))}</b> ${esc(d.learned)}</div>
      <div class="rs-real"><b>${esc(T('realWorld'))}</b> ${esc(d.real)}</div>
      ${d.pack ? `<div class="rs-pack">${icon('satchel')}<span>${esc(T('packWon'))}</span></div>` : ''}${src}
      <div class="rs-btns"><button class="rs-more-b">${esc(T('more'))}</button><button class="rs-stay-b">${esc(T('stay'))}</button></div>`);
    m.querySelector('.rs-more-b').addEventListener('click', () => o.onMore());
    m.querySelector('.rs-stay-b').addEventListener('click', () => closeModal());
  }

  function dispose() {
    if (ro) { ro.disconnect(); ro = null; }
    for (const e of els) { clearTimeout(e._t); e.remove(); }
    els.length = 0; modal = null;
    root.classList.remove('research', 'rs-kids', 'rs-say-low');
  }
  return { mount, setLights, setSolved, setBoard, setTable, setBulbs, note, dropNote, offerSee, setFF, showIntro, showDilemma, openNotebook, nbOpen, nbTab, showConclusion,
    setLogCount, showSolved, closeSolved: closeModal, closeModal, isOpen, modalIs: (cls) => !!(modal && modal.classList.contains(cls)), setSteps, say, hideSay, hi, pulse, dispose };
}
