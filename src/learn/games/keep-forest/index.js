// "מחזיקים את היער" – solitaire mini-game for the learning hub (single player, gentle, cooperative).
// The player builds a small forest (3 layers × 3 slots) from album cards; every 2 turns "nature" flips an
// event card (drought, heat, flood...). A forest that is ready holds on; otherwise its weakest card wilts a little.
// Every real relation between two cards on the board is a glowing gold thread = +1 vitality (חִיּוּת).
// Rarity matters: an epic card is a keystone species ("מין מפתח") – once per run, when the forest is not ready
// for an event, the keystone on the board holds it (nothing wilts, no −1). A rare card adds +1 for its first gold thread.
//
// export function mountKeepForest(root, ctx, opts) → { destroy() }
// Debug hook: window.__kfDebug = { state(), place(handIdx, slot), tool(handIdx), cont(), auto(n), start(biome), hint() }
//
// The folder (1.3.2 split of the old src/learn/games/keep-forest.js, no change in behaviour; that file re-exports this one):
//   index.js   this file: mountKeepForest – the player's saved results (ST), the shared context K and its helpers, the
//              parts, the pointer / click listeners, the debug hook window.__kfDebug, destroy()
//   data.js    places, rows, numbers of a run, small helpers, the links between species (linksFor), late()
//   events.js  the events of nature (EV) and what each tool does (TOOL_FX)
//   icons.js   inline SVG icons (I) and the owl "שומר היער"      styles.js  the CSS, injected once
//   deck.js    deck building and a new run      board.js   the board's rules: slots, gold threads, totals, rarity, checks
//   turn.js    a turn: placing a card, tools, skipping, an event and its outcome; hints and auto play
//   finish.js  the end of a run (stars, summary) and "איך משחקים?"
//   render.js  drawing: the setup screen, the game screen, top bar, board and threads, side panel, hand
//   input.js   selection, drag & tap, the click handler
// The parts are made by createX(K), in the order they were written, with one context K: the hub's ctx, root, the
// state that more than one part reads or changes (K.S, K.biome, K.sel, K.drag, K.ro, K.seenThreads, K.uidN, K.quiet)
// and the helpers of this file. Each part adds its functions to K; a part calls a later part's function through late().
import { createBoard } from './board.js';
import { BIOMES, oasisWords, ROW_SHORT, ROW_SHORT_DESERT, ROW_SHORT_REEF, ROWS, ROWS_DESERT, ROWS_REEF } from './data.js';
import { createDeck } from './deck.js';
import { EV } from './events.js';
import { createFinish } from './finish.js';
import { I } from './icons.js';
import { createInput } from './input.js';
import { createRender } from './render.js';
import { injectCss } from './styles.js';
import { createTurn } from './turn.js';

/* ───────────────────────────── the game */
export function mountKeepForest(root, ctx, opts = {}) {
  injectCss();
  const esc = ctx.esc;
  const kids = !!ctx.kids();
  const ST = Object.assign({ best: {}, pack: {}, biome: 'amazon', runs: 0 }, ctx.store('keepforest') || {});
  ST.best = ST.best || {}; ST.pack = ST.pack || {};
  const save = () => ctx.store('keepforest', ST);
  // the state of a run and of the screen: more than one part reads or changes it, so it lives in K (K.S, K.sel, ...)
  const K = { ctx, root, S: null, biome: BIOMES.includes(opts.biome) ? opts.biome : (BIOMES.includes(ST.biome) ? ST.biome : 'amazon'),
    sel: null, drag: null, ro: null, seenThreads: new Set(), uidN: 1, quiet: false };
  let alive = true;
  const offs = [];
  const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); offs.push(() => t.removeEventListener(ev, fn, o)); };
  const $ = (s) => root.querySelector(s);
  const later = (fn, ms) => ctx.later(() => { if (alive) fn(); }, ms);
  const C = (ref) => ctx.CARD.get(ref.id);
  // words that follow the place: the forest (יער, masculine) or the reef (שונית, feminine)
  // the desert's oasis (נווה המדבר, masculine) takes the forest's words through oasisWords
  const reef = () => (K.S ? K.S.biome : K.biome) === 'reef';
  const desert = () => (K.S ? K.S.biome : K.biome) === 'desert';
  const Y = (f, r) => (reef() ? r : desert() ? oasisWords(f) : f);
  const ROWN = () => (reef() ? ROWS_REEF : desert() ? ROWS_DESERT : ROWS);
  const ROWSH = () => (reef() ? ROW_SHORT_REEF : desert() ? ROW_SHORT_DESERT : ROW_SHORT);
  const icOf = (D) => I[(reef() && D.ric) || D.ic];
  const tipOf = (id) => (reef() && EV[id].rtip) || (desert() ? oasisWords(EV[id].tip) : EV[id].tip);
  const needOf = (ev) => { const t = EV[ev.id].need(ev.need, K.S ? K.S.biome : K.biome); return desert() ? oasisWords(t) : t; };
  // the 'canopy' of the reef is its corals in the shallow water
  const canopyCard = (c) => !c.sp.animal && (!reef() || c.sp.kind === 'coral');
  Object.assign(K, { esc, kids, ST, save, $, later, C, reef, Y, ROWN, ROWSH, icOf, tipOf, needOf, canopyCard });

  /* ── the parts, in the order they were written (each adds its functions to K for the parts after it) */
  Object.assign(K, createDeck(K));
  Object.assign(K, createBoard(K));
  Object.assign(K, createTurn(K));
  Object.assign(K, createFinish(K));
  Object.assign(K, createRender(K));
  Object.assign(K, createInput(K));
  const { onDown, onMove, onUp, cleanupDrag, renderBoard, onClick, drawThreads, totals, place, useTool, cont,
    resolve, autoStep, render, newRun, starsFor, renderSetup, renderGame, bestMove, legal } = K;

  on(root, 'pointerdown', onDown);
  // capture phase: the hub stops pointer events from bubbling past #wol-learn
  on(window, 'pointermove', onMove, true);
  on(window, 'pointerup', onUp, true);
  on(window, 'pointercancel', () => { cleanupDrag(); if (K.S) renderBoard(); }, true);
  on(root, 'click', onClick);
  on(window, 'resize', () => drawThreads(false));

  // debug hook for scripted tests
  const dbg = {
    state: () => K.S && (() => { const T = totals(); return {
      biome: K.S.biome, phase: K.S.phase, turn: K.S.turn, evIdx: K.S.evIdx, events: K.S.events.map((e) => e.id + ':' + e.need), results: K.S.results.slice(),
      hand: K.S.hand.map((r) => r.id + (r.borrowed ? '*' : '')), deck: K.S.deck.length, board: K.S.board.map((b) => (b ? b.ref.id.split(':')[1] + (b.wilted ? '~' : '') : '-')),
      light: T.light, water: T.water, threads: T.threads, life: T.life, stars: K.S.stars, lost: K.S.lost, bonus: K.S.bonus, borrowed: K.S.borrowed, owned: K.S.owned, watch: K.S.watch,
      threadTexts: T.th.map((t) => t.e.text) }; })(),
    place: (hi, k) => place(hi, k),
    tool: (hi) => useTool(hi),
    cont: () => { if (K.S && K.S.phase === 'event' && K.S.cur && !K.S.cur.res) resolve(); return cont(); },
    auto: (n = 1, mode, q) => { K.quiet = !!q; try { for (let i = 0; i < n && K.S && K.S.phase !== 'end'; i++) autoStep(mode); } finally { K.quiet = false; } if (q && K.S && K.S.phase === 'end') { /* no UI */ } else render(); return dbg.state(); },
    sim: (b, mode, runs = 50) => { const L = [], H = [0, 0, 0, 0]; let P = 0, hard = 0, RB = 0, KS = 0; for (let r = 0; r < runs; r++) { K.quiet = true; newRun(b); let g = 0; while (K.S.phase !== 'end' && g++ < 400) { if (K.S.phase === 'event' && K.S.evIdx + 1 >= K.S.events.length && K.S.cur) { if (!K.S.cur.res) resolve(); K.S.evIdx++; K.S.phase = 'end'; break; } autoStep(mode); } K.quiet = false; const T = totals(); L.push(T.life); H[K.S.lost ? 0 : starsFor(T.life)]++; P += K.S.results.filter((x) => x === 'ok').length; hard += K.S.results.filter((x) => x !== 'gd').length; RB += K.S.rareBonus; KS += K.S.keySaves; } renderSetup(); return `${b} ${mode || 'greedy'} life ${(L.reduce((a, c) => a + c, 0) / runs).toFixed(1)} [${Math.min(...L)}-${Math.max(...L)}] pass ${(P / hard).toFixed(2)} lose ${Math.round((100 * H[0]) / runs)}% stars(0/1/2/3) ${H.join('/')} rare+${(RB / runs).toFixed(1)} keysaves ${(KS / runs).toFixed(1)}`; },
    lives: (b, mode, runs = 100) => { const L = []; for (let r = 0; r < runs; r++) { K.quiet = true; newRun(b); let g = 0; while (K.S.phase !== 'end' && g++ < 400) { if (K.S.phase === 'event' && K.S.evIdx + 1 >= K.S.events.length && K.S.cur) { if (!K.S.cur.res) resolve(); K.S.evIdx++; K.S.phase = 'end'; break; } autoStep(mode); } K.quiet = false; L.push(totals().life); } renderSetup(); return L; },
    start: (b = K.biome) => { K.biome = b; newRun(b); renderGame(); return dbg.state(); },
    hint: () => { const h = bestMove(); return h && { hi: h.hi, slot: h.k }; },
    legal: (hi) => K.S && K.S.hand[hi] ? legal(K.S.hand[hi]) : null,
    // screenshot staging: board = 9 card ids (or null), hand = card ids, ev = id of the next event (need forced to n)
    stage: ({ board, hand, ev, need, turn } = {}) => {
      if (!K.S) return null;
      const ref = (id) => ({ uid: K.uidN++, id: id.includes(':') ? id : K.S.biome + ':' + id, borrowed: false });
      if (board) K.S.board = board.map((id) => (id ? { ref: ref(id), wilted: false } : null));
      if (hand) K.S.hand = hand.map(ref);
      if (ev) { K.S.events[K.S.evIdx] = { id: ev, i: K.S.evIdx, need: need != null ? need : K.S.events[K.S.evIdx].need }; }
      if (turn != null) K.S.turn = turn;
      render(); return dbg.state();
    },
  };
  try { window.__kfDebug = dbg; } catch (e) { /* no window */ }

  renderSetup();

  return {
    destroy() {
      alive = false;
      cleanupDrag();
      offs.forEach((f) => f()); offs.length = 0;
      if (K.ro) { K.ro.disconnect(); K.ro = null; }
      K.S = null;
      try { if (window.__kfDebug === dbg) delete window.__kfDebug; } catch (e) { /* */ }
    },
  };
}
