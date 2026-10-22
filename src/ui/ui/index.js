// רשת החיים – DOM overlay UI (RTL Hebrew). Plain DOM + CSS, no frameworks, no network.
// export function createUI(root, bus) → ui   (core → UI: methods;  UI → core: bus.emit)
// Also exported, for the many files that import them through src/ui/ui.js: icon(name, cls) and esc(s).
//
// The folder (1.3.2 split of the old src/ui/ui.js, no change in behaviour; src/ui/ui.js re-exports this file):
//   index.js     this file: createUI – the root, emit, S (the UI's state), the regions (one element each), the loading
//                screen, then the parts in the original order with one context object (ctx), and the public api last
//   start.js     the start screen and the players panel        hud.js       the forest HUD
//   toolbar.js   the toolbar, the satchel menu, music switch   missions.js  the missions panel and the layers
//   tray.js      the tray of cards, drag & drop                species.js   the species card
//   modals.js    modal windows, the journal's cards, coach     fx.js        confetti, the injured bar, toasts
//   keys.js      Escape / Space, the tray's height             api.js       the public api (the object createUI returns)
//   icons.js     the icon set and icon()                       helpers.js   esc, h, colours, thumbHTML and other helpers
//   art.js       SVG drawings: the emblem, the start screen's canopy, wax seal and vine, the day dial's colours
import { emblem } from './art.js';
import { DEFAULT_TIPS, h } from './helpers.js';
import { icon } from './icons.js';
import { createStart } from './start.js';
import { createHud } from './hud.js';
import { createToolbar } from './toolbar.js';
import { createMissions } from './missions.js';
import { createTray } from './tray.js';
import { createSpecies } from './species.js';
import { createModals } from './modals.js';
import { createFx } from './fx.js';
import { createKeys } from './keys.js';
import { createApi } from './api.js';

export { esc } from './helpers.js';
export { icon } from './icons.js';

/* ================================================================== createUI */
export function createUI(root, bus) {
  root.classList.add('wol');
  root.setAttribute('dir', 'rtl');
  root.setAttribute('lang', 'he');
  const emit = (n, p) => { try { bus && bus.emit(n, p); } catch (e) { console.error(e); } };

  const S = {
    tab: 'plants', layerFilter: 'all', cards: [], cardEls: new Map(), cardSig: new Map(),
    biome: null, speed: 1, lastSpeed: 1, hud: {}, shownPts: 0, ptsRaf: 0,
    press: null, drag: null, species: null, speciesSig: '', quiz: null, moreOpen: false,
    missionsSig: '', openMission: null, toggles: {}, tips: DEFAULT_TIPS.slice(), tipI: 0,
    coach: null, layers: [], activeLayer: 'all', trayCollapsed: false,
    play: null, injured: [], toastQ: [], rescueHelp: false,   // 1.3.2: play mode in the forest ('experience' | 'full' | 'kids'), injured animals
  };

  /* ---------------- regions */
  const hud = h('div', 'hud glass ui-in', null, root);
  const toolbar = h('div', 'toolbar ui-in', null, root);
  const rightCol = h('div', 'rightcol ui-in', null, root);
  const missions = h('section', 'missions glass', null, rightCol);
  h('div', 'rc-spacer', null, rightCol);
  const layersEl = h('nav', 'layers', null, rightCol);
  const tray = h('section', 'tray glass ui-in', null, root);
  const panel = h('aside', 'species paper', null, root);
  const toastsEl = h('div', 'toasts', null, root);
  const hurtBar = h('div', 'hurtbar', null, root);          // 1.3.2: injured animals, a fixed red bar at the top
  const hurtArrowsEl = h('div', 'hurt-arrows', null, root);  // …and an arrow at the screen's edge when one is out of view
  hurtBar.setAttribute('role', 'status'); hurtBar.hidden = true;
  const expEl = h('div', 'experiment', null, root);
  const hoverEl = h('div', 'hover', null, root);
  const ghost = h('div', 'ghost', null, root);
  const hintEl = h('div', 'drag-hint', null, root);
  const fxEl = h('div', 'fx', null, root);
  const coachRing = h('div', 'coach-ring', null, root);
  const coachEl = h('div', 'coach paper', null, root);
  const modalEl = h('div', 'modal-layer', null, root);
  const startEl = h('div', 'start', null, root);
  const loadEl = h('div', 'loading', null, root);

  /* ================================================================ LOADING */
  loadEl.innerHTML = `<div class="ld-inner">${emblem(150, 'emblem spin')}
    <h1 class="ld-title">רשת החיים</h1>
    <div class="ld-bar"><div class="ld-fill"><span class="ld-tip-leaf">${icon('leaf')}</span></div></div>
    <div class="ld-status"></div><p class="ld-tip"></p></div>`;
  const ldFill = loadEl.querySelector('.ld-fill'), ldStatus = loadEl.querySelector('.ld-status'), ldTip = loadEl.querySelector('.ld-tip');
  function rotateTip() {
    if (!S.tips.length) return;
    ldTip.classList.remove('show');
    setTimeout(() => { ldTip.textContent = S.tips[S.tipI++ % S.tips.length]; ldTip.classList.add('show'); }, 260);
  }

  /* ================================================================ the parts (src/ui/ui/*.js) */
  // One context object for the parts: root, emit, S, the regions and the loading screen above. Each part is made in
  // the original order (DOM, listeners) and adds what it returns to ctx; the public api (api.js) comes last.
  const ctx = { root, emit, S, hud, toolbar, rightCol, missions, layersEl, tray, panel, toastsEl, hurtBar, hurtArrowsEl, expEl, hoverEl, ghost,
    hintEl, fxEl, coachRing, coachEl, modalEl, startEl, loadEl, ldFill, ldStatus, ldTip, rotateTip };
  Object.assign(ctx, createStart(ctx));       // START, PLAYERS ("מי משחק?")
  Object.assign(ctx, createHud(ctx));         // HUD
  Object.assign(ctx, createToolbar(ctx));     // TOOLBAR (the satchel, the toggles, the music switch)
  Object.assign(ctx, createMissions(ctx));    // MISSIONS, LAYERS
  Object.assign(ctx, createTray(ctx));        // TRAY, drag & drop
  Object.assign(ctx, createSpecies(ctx));     // SPECIES PANEL
  Object.assign(ctx, createModals(ctx));      // MODALS, JOURNAL, COACH
  Object.assign(ctx, createFx(ctx));          // FX helpers, the injured bar, toasts
  Object.assign(ctx, createKeys(ctx));        // KEYBOARD, the tray height
  const ui = createApi(ctx);                  // PUBLIC API
  ctx.ui = ui;

  return ui;
}
