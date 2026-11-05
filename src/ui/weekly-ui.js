// אירוע השבוע (1.4.4 set 1): the sheet that opens from the chip on the start screen and from the hub's tile. It shows
// this week's event (its kind, its story, the days Sunday to Thursday with today marked), the child's records, the rare
// guests who came to live on his islands, and for the instructors (their switch on) every event of every kind.
// The events themselves (sets 5 to 7) register here: registerWeekly(kind, open), where
//   open({ host, kind, ver, rec, week, kids, emit, save(state), done({ win, score, guest }) , close() })
// takes over the screen; `done` ends the event (core/weekly.js finish), grants the badges and tells the child.
//
//   openWeekly(host, { emit, onClose }) → { close, el }      chipState() → { show, label, dot }   (the start screen chip)
import { icon } from './ui/icons.js';
import { esc } from './ui/helpers.js';
import { hubIcon } from './icons-hub.js';
import * as WK from '../core/weekly.js';
import { playMode } from '../core/journey.js';
import { allOpen } from '../core/journey.js';
import { WEEK_KINDS, WEEK_UI, kindOf, versionsOf } from '../data/weekly.js';
import { ZONE_LOOK } from '../data/zones.js';
import { grant } from '../core/badges-store.js';
import { svcGuide } from '../core/services.js';
import { weeklyTutorial } from './tutorials.js';
import { loadPack } from '../core/packs.js';

const kids = () => playMode() === 'kids';
const w = (o, vars) => { let s = kids() ? o.k : o.f; if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace('{' + k + '}', v); return s; };
const nameOf = (k) => (kids() ? k.kname : k.name);

const OPENERS = {};
let tutRun = null;   // the first-visit tutorial while it runs (tests read its step)
export function registerWeekly(kind, open) { OPENERS[kind] = open; }
// the events that are built (their screens load with the pack 'weekly' when opened)
registerWeekly('glitch', (o) => loadPack('weekly').then((m) => m.openGlitch(o), (e) => console.error(e)));   // set 5
registerWeekly('jar', (o) => loadPack('weekly').then((m) => m.openJar(o), (e) => console.error(e)));         // set 6
export const weeklyReady = (kind) => !!OPENERS[kind];
try { window.__weeklyUI = { registerWeekly, openWeekly, chipState, afterEvent, tut: () => (tutRun && tutRun.step) || null }; } catch (e) { /* node */ }

// the chip on the start screen: shown once the part is open; a dot while this week's event waits for the child
export function chipState() {
  if (!WK.anyOpen()) return { show: false };
  const c = WK.current();
  const k = kindOf(c.kind);
  const ready = c.ready && !!OPENERS[c.kind];
  return { show: true, dot: c.open && ready && !c.done, label: w(WEEK_UI.title), sub: k ? nameOf(k) : '', open: c.open };
}

export function openWeekly(host, { emit, onClose } = {}) {
  const old = host.querySelector('.wkv-layer'); if (old) old.remove();
  const layer = document.createElement('div'); layer.className = 'wkv-layer';
  host.appendChild(layer);
  const close = () => {
    if (!layer.isConnected) return;
    layer.remove(); removeEventListener('keydown', onKey);
    try { onClose && onClose(); } catch (e) { console.error(e); }
  };
  const onKey = (e) => { if (e.key === 'Escape' && !(svcGuide() && svcGuide().isOpen())) { e.preventDefault(); close(); } };
  addEventListener('keydown', onKey);

  function paint() {
    const c = WK.current(), K = kindOf(c.kind);
    const ready = c.ready && !!OPENERS[c.kind];
    const days = WEEK_UI.days.slice(0, 5).map((d, i) => `<i class="${i < c.day ? 'past' : ''}${i === c.day ? ' today' : ''}">${esc(kids() ? d : d)}</i>`).join('');
    let status, btn = '';
    if (!c.open) status = `<p class="wkv-st">${esc(w(WEEK_UI.closed))}</p>`;
    else if (!ready) status = `<p class="wkv-st">${esc(w(WEEK_UI.soon))}</p>`;
    else {
      status = `<p class="wkv-st">${esc(c.daysLeft <= 1 ? w(WEEK_UI.lastDay) : w(WEEK_UI.left, { n: c.daysLeft }))}</p>`;
      btn = c.done ? `<span class="wkv-done">${icon('check')}${esc(w(WEEK_UI.done))}</span><button class="btn soft wkv-go" data-wk="go">${esc(w(WEEK_UI.again))}</button>`
        : `<button class="btn primary wkv-go" data-wk="go">${icon('play')}${esc(c.rec ? w(WEEK_UI.cont) : w(WEEK_UI.start))}</button>`;
    }
    const recs = WEEK_KINDS.map((k) => { const n = Object.keys(WK.doneMap()).filter((x) => x.startsWith(k.id + ':')).length, b = WK.bestOf(k.id);
      return `<div class="wkv-kind${k.id === c.kind ? ' now' : ''}"><span class="wkv-kic">${hubIcon(k.icon === 'search' ? 'research' : k.icon)}</span><b>${esc(nameOf(k))}</b><small>${n ? `${icon('check')}${n}` : ''}${b ? ` · ${esc(w(WEEK_UI.best))}: ${b}` : ''}</small></div>`; }).join('');
    const gs = WK.allGuests();
    const guests = gs.length ? `<div class="wkv-guests">${gs.map((g) => `<span class="wkv-guest z-${esc(g.zone)}"><b>${esc((kids() ? g.kname : g.name) || g.id)}</b><small>${esc(ZONE_LOOK[g.zone] ? (kids() ? ZONE_LOOK[g.zone].shortK : ZONE_LOOK[g.zone].short) : g.zone)}</small></span>`).join('')}</div>`
      : `<p class="wkv-note">${esc(w(WEEK_UI.noGuests))}</p>`;
    const staff = allOpen() ? `<details class="wkv-staff"><summary>${icon('sliders')}${esc(w(WEEK_UI.staff))}</summary><div>${WEEK_KINDS.map((k) => `<p><b>${esc(k.name)}</b> ${versionsOf(k.id).map((v) => `<button class="btn soft" data-wk="any" data-k="${k.id}" data-v="${esc(v.id)}" ${OPENERS[k.id] ? '' : 'disabled'}>${esc(v.title || v.id)}</button>`).join('') || '<small>—</small>'}</p>`).join('')}</div></details>` : '';
    layer.innerHTML = `<div class="wkv-scrim"></div><div class="wkv-sheet paper" role="dialog" aria-modal="true" aria-label="${esc(w(WEEK_UI.title))}">
      <button class="pp-x wkv-x" data-wk="x" aria-label="${esc(w(WEEK_UI.close))}" title="${esc(w(WEEK_UI.close))}">${icon('close')}</button>
      <h3 class="wkv-h">${hubIcon('week')}${esc(w(WEEK_UI.title))}</h3>
      <section class="wkv-card k-${esc(c.kind)}"><span class="wkv-big">${hubIcon(K && K.icon === 'search' ? 'research' : (K ? K.icon : 'week'))}</span>
        <div class="wkv-body"><h4>${esc(K ? nameOf(K) : '')}</h4><p>${esc(K ? (kids() ? K.kblurb : K.blurb) : '')}</p>
          <div class="wkv-days" aria-label="${esc(w(WEEK_UI.open))}">${days}</div>${status}<div class="wkv-act">${btn}</div></div></section>
      <div class="wkv-kinds">${recs}</div>
      <h5>${esc(w(WEEK_UI.guests))}</h5>${guests}${staff}</div>`;
  }
  layer.addEventListener('click', (e) => {
    if (e.target.classList.contains('wkv-scrim')) { close(); return; }
    const b = e.target.closest('[data-wk]'); if (!b) return;
    const a = b.dataset.wk;
    try { emit && emit('ui:click'); } catch (er) { }
    if (a === 'x') close();
    else if (a === 'go') { const c = WK.current(); if (!c.open || !c.ready || !OPENERS[c.kind]) return; const rec = WK.begin(); launch(c.kind, c.ver, c.week, rec); }
    else if (a === 'any') { const r = WK.openAny(b.dataset.k, b.dataset.v); if (r) launch(b.dataset.k, b.dataset.v, r.week, r.rec); }
  });

  function launch(kind, ver, week, rec) {
    const open = OPENERS[kind]; if (!open) return;
    const v = versionsOf(kind).find((x) => x.id === ver);
    close();
    try {
      open({ host, kind, ver, version: v, rec, week, kids: kids(), emit,
        save: (state) => WK.saveState(state, week),
        done: (res) => afterEvent(WK.finish({ week, win: !!(res && res.win), score: (res && res.score) || 0, guest: (res && res.guest) || (v && v.guest) || null })) });
    } catch (e) { console.error(e); }
  }
  paint();
  try { const g = svcGuide(); if (g) tutRun = weeklyTutorial({ guide: g, sheet: layer }) || tutRun; } catch (e) { console.error(e); }
  return { close, el: layer, paint };
}

// the event is over: the badges (one drop-in each), and רובו־דע tells about the guest who came to live on the island
export function afterEvent(r) {
  if (!r) return r;
  for (const earn of r.badges) { try { grant(earn); } catch (e) { console.error(e); } }
  if (r.guest) {   // the guest's name and island are on the sheet (גרים באיים שלכם); רובו־דע says it in a recorded line
    const g = svcGuide(), L = g && g.lines('weekly:guest');
    if (L && L.length) g.say(L, { tip: true, ms: 7000 });
  }
  return r;
}
