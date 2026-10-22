// רשת החיים – מרכז הלמידה (learning hub): trivia quiz + TCG-style card album + "מי חזק ברשת?" duel.
// Self-contained DOM overlay (no WebGL, no network). CSS injected once, scoped under #wol-learn.wol-learn.
//
// export function createLearningHub(rootEl, { onClose, audio }) → { open(), close(), isOpen(), grantPack(n), go(name, opts) }
// Also exposes window.__wolLearn = { open, close, isOpen, grantPack(n), _go(screen, opts), _state(), … } (test hooks).
// 1.3.2 (מסע החוקר): the home is one page (album in the middle, quiz / badges / frames on the right, the card games on the
// left). Every tile follows core/journey.js isOpen(part): a part that is not open yet is veiled, and a click on it (or
// go() into it) lets רובו־דע say what opens it. The first visit of each screen: window.__guide.intro(part)
// (lines in src/data/guide/hub.js). journey.markUsed(part) when a part is really played. _go() is a test hook: it opens
// a screen even when its part is still locked.
// Persistence: localStorage 'web-of-life-cards::<player>' (optional – everything works without it). Each player
// (core/profiles.js) has their own album; the state is re-read from the current player's key every time the hub opens.
//
// The folder (1.3.2 split of the old src/learn/hub.js, no change in behaviour):
//   index.js      this file: the hub's frame (DOM, the player's state, chip, toast, confetti, sets check), navigation
//                 (go / back, locks and רובו־דע's tips), the card games' context, the events table, open / close, hooks
//   home.js       the home page, badges, frames, settings          quiz.js   the quiz screens
//   album.js      the album, sets panel, card zoom, legend          packs.js  opening a pack     duel.js  the duel
//   cards.js      species, cards and sets (data)                   quiz-build.js  building a round
//   card-html.js  drawing a card                                   base.js   constants, helpers, icons
//   storage.js    loading a player's album                         styles.js + css-main.js + css-more.js  the CSS
// The screens are parts made by createX(ctx) with one context object (see "the parts of the hub" below).
import { tally as badgeTally, chooseFrame, grant as grantBadge, hasBadge } from '../../core/badges-store.js';
import { TORAH, setSourcesOn, sourcesOn } from '../../core/edition.js';
import { isOpen, state as journeyState, lockInfo, markUsed } from '../../core/journey.js';
import { current as currentPlayer, key as profileKey } from '../../core/profiles.js';
import { grantSource, ownedSources } from '../../core/sources-store.js';
import { setSourceCheck } from '../../core/threads.js';
import { DIET_VERBS, RELATION_TYPES } from '../../data/common.js';
import { BABA_DA_LOGO } from '../../data/logo.js';
import { VERSE_LINKS } from '../../data/torah-links.js';
import { SHIRA, SOURCE_CARDS, TZVI_SET } from '../../data/torah.js';
import { avatarHTML } from '../../ui/avatars.js';
import { icon } from '../../ui/ui.js';
import { mountExpedition } from '../games/expedition.js';
import { mountInventors } from '../games/inventors.js';
import { mountKeepForest } from '../games/keep-forest.js';
import { mountVerseMatch } from '../games/verse-match.js';
import { mountWebPuzzle } from '../games/web-puzzle.js';
import { createAlbum } from './album.js';
import { IC, IC_CURTAIN, START_PACKS, STAT_ICON, STAT_NAMES, STORE_KEY, esc, pick, rnd, sample } from './base.js';
import { backHTML, cardHTML, flipHTML } from './card-html.js';
import { CARD, CARDS, SETS, SET_BY, SP, activeSets, spOf } from './cards.js';
import { createDuel } from './duel.js';
import { createHomeScreens } from './home.js';
import { createPacks } from './packs.js';
import { buildRound } from './quiz-build.js';
import { createQuiz } from './quiz.js';
import { loadState } from './storage.js';
import { injectCss } from './styles.js';

/* ───────────────────────────────────────────── the hub */
export function createLearningHub(rootEl, { onClose, audio } = {}) {
  injectCss();
  // the stamp "מן המקורות" (torah edition): a creature with a line in פרק שירה, in "רץ כצבי", or a card a verse speaks of
  const VERSE_CARDS = new Set(Object.values(VERSE_LINKS || {}).flatMap((v) => (v.links || []).filter((l) => (l.w || 0) >= 2).map((l) => l.c)));
  setSourceCheck((sp, zone) => { const id = zone + ':' + sp; return !!(SHIRA[id] || TZVI_SET.cards.includes(id) || VERSE_CARDS.has(id)); });
  const reduced = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const sfx = (n) => { try { audio && audio.play && audio.play(n); } catch (e) { /* ignore */ } };
  const S = loadState();
  let SKEY = profileKey(STORE_KEY);   // the player whose album S holds – saves always go back to that player
  const save = () => { try { window.localStorage.setItem(SKEY, JSON.stringify(S)); } catch (e) { /* storage unavailable – keep in memory */ } };
  // the start screen may have switched player since the hub was created: load that player's album (same object, so every closure sees it)
  function reloadState() {
    const k = profileKey(STORE_KEY); if (k === SKEY) return;
    const fresh = loadState(); SKEY = k;
    for (const p of Object.keys(S)) delete S[p];
    Object.assign(S, fresh);
  }

  const el = document.createElement('div');
  el.id = 'wol-learn'; el.className = 'wol-learn'; el.dir = 'rtl'; el.lang = 'he'; el.hidden = true;
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'מרכז הלמידה');
  el.innerHTML = `
    <header class="wl-top">
      <button class="wl-back" data-wl="back">${IC.back}<span>חזרה</span></button>
      <h2 class="wl-crumb"></h2><span class="wl-sp"></span>
      <span class="wl-who"></span>
      ${TORAH ? `<button class="wl-gear" data-wl="settings" title="הגדרות" aria-label="הגדרות">${icon('sliders')}</button>` : ''}
      <button class="wl-chip" data-wl="packs" title="חבילות קלפים">${icon('pack')}<span class="wl-chipn"></span></button>
      <img class="wl-logo" src="${BABA_DA_LOGO}" alt="בבא דע">
    </header>
    <main class="wl-main"></main>
    <div class="wl-modal" hidden></div>
    <div class="wl-fx"></div>
    <div class="wl-toast" role="status"></div>`;
  rootEl.appendChild(el);
  const $ = (s) => el.querySelector(s);
  const main = $('.wl-main'), modal = $('.wl-modal'), fx = $('.wl-fx'), toastEl = $('.wl-toast');
  let screen = 'home', open_ = false, timers = [];
  const later = (fn, ms) => { const t = setTimeout(fn, reduced() ? Math.min(ms, 60) : ms); timers.push(t); return t; };
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  const ownedCount = () => Object.keys(S.owned).length;
  function updateChip(bump) {
    $('.wl-chipn').textContent = `חבילות: ${S.packs}`;
    const c = $('.wl-chip'); if (bump) { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
  }
  let toastT;
  function toast(html, ms = 2400, cls = '') {
    toastEl.innerHTML = html; toastEl.className = 'wl-toast on' + (cls ? ' ' + cls : '');
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), ms);
  }
  /* ── album sets: a whole set → one free pack, once per player. Checked after every card gain and when the album opens. */
  // a set of source cards counts the player's source cards; every other set counts album cards
  const ownsIn = (st) => { if (!st.src) return (c) => !!S.owned[c.id]; const o = ownedSources(); return (c) => !!o[c.id]; };
  const setProg = (st) => { const has = ownsIn(st), have = st.cards.filter(has).length; return { have, n: st.cards.length, done: have === st.cards.length }; };
  let setQueue = 0;
  function checkSets() {
    if (!open_) return [];
    S.sets = S.sets && typeof S.sets === 'object' ? S.sets : {};
    const got = activeSets().filter((st) => !S.sets[st.id] && setProg(st).done);
    if (!got.length) return got;
    got.forEach((st) => { S.sets[st.id] = true; S.packs += 1; if (st.source) grantSource(st.source); });
    save(); updateChip(true);
    // one celebration after the other (plain timers: they survive moving between screens)
    got.forEach((st) => {
      const at = Math.max(0, setQueue - Date.now()) + 250; setQueue = Date.now() + at + 3000;
      setTimeout(() => {
        if (!open_) return;
        toast(`<span class="wl-seti" style="--sc:${st.col}">${st.ic}</span><span><b>השלמתם את הסדרה "${esc(st.name)}"!</b><small>${IC.pack} קיבלתם חבילת קלפים במתנה${st.source ? ' – וגם קלף מקור חדש!' : ''}</small></span>`, 3600, 'set');
        sfx('mission'); confetti(toastEl, 34, ['#f6cf72', st.col, '#fff1c4', '#8fd067', '#e79aab']);
        const chip = main.querySelector(`.wl-set[data-v="${st.id}"]`);
        if (chip) { chip.classList.add('justdone'); confetti(chip, 18, ['#f6cf72', st.col, '#fff1c4']); }
        updateChip(true);
      }, at);
    });
    return got;
  }
  function confetti(target, n = 18, palette) {
    if (reduced() || !target) return;
    const r = target.getBoundingClientRect(), R = el.getBoundingClientRect();
    const x = r.left + r.width / 2 - R.left, y = r.top + r.height / 2 - R.top;
    const cols = ['#8fd067', '#5fae4a', '#b7e08e', '#f0b44c', '#7cc46a', '#3f8a33'];
    for (let i = 0; i < n; i++) {
      const c = document.createElement('i'); c.className = 'wl-conf';
      const a = Math.random() * Math.PI * 2, d = 70 + Math.random() * 130;
      c.style.cssText = `left:${x}px;top:${y}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d * 0.8 + 50}px;--r:${Math.random() * 720 - 360}deg;--c:${pick(palette || cols)};animation-delay:${rnd(90)}ms`;
      fx.appendChild(c); setTimeout(() => c.remove(), 1500);
    }
  }
  function grantPack(n = 1) {
    if (!open_) reloadState();   // a pack won in the forest goes to whoever is playing now
    n = Math.max(0, Math.floor(+n || 0)); if (!n) return S.packs;
    S.packs += n; save(); updateChip(true);
    if (open_) toast(`${IC.pack}<span>קיבלתם ${n === 1 ? 'חבילת קלפים' : n + ' חבילות קלפים'}!</span>`);
    if (open_ && screen === 'album') renderAlbum();
    return S.packs;
  }

  /* ── navigation */
  const PARENT = { home: null, setup: 'home', quiz: 'setup', end: 'home', album: 'home', pack: 'album', duel: 'home', webpuzzle: 'home', keepforest: 'home', inventors: 'home', expedition: 'home', badges: 'home', frames: 'home', versematch: 'home' };
  const TITLES = { home: 'מרכז הלמידה', setup: 'חידון', quiz: 'חידון', end: 'חידון', album: 'אלבום הקלפים', pack: 'פתיחת חבילה', duel: 'מי חזק ברשת?', webpuzzle: 'חוט הקשר', keepforest: 'מחזיקים את היער', inventors: 'הממציאים', expedition: 'משלחת לעומק', badges: 'התגים שלי', frames: 'המסגרות שלי', versematch: 'מה הפסוק מלמד?' };
  /* ── מסע החוקר: the journey part behind each screen (core/journey.js PARTS) */
  const PART_OF = { setup: 'quiz', quiz: 'quiz', end: 'quiz', album: 'album', pack: 'album', duel: 'duel', webpuzzle: 'webpuzzle', keepforest: 'keepforest', inventors: 'inventors', expedition: 'expedition', badges: 'badges', frames: 'frames', versematch: 'versematch' };
  // רובו־דע presents a screen the first time it opens (src/data/guide/hub.js); 'learn' is the hub itself
  const INTRO_OF = { home: 'learn', setup: 'quiz', album: 'album', duel: 'duel', webpuzzle: 'webpuzzle', keepforest: 'keepforest', inventors: 'inventors', expedition: 'expedition', badges: 'badges', frames: 'frames', versematch: 'versematch' };
  const locked = (part) => { try { return !isOpen(part); } catch (e) { return false; } };
  const guide = () => (typeof window !== 'undefined' && window.__guide) || null;
  let tipAt = 0, guideMine = false, entered = null;
  // a click on a veiled part: רובו־דע says what opens it (one short bubble; a second click soon after does not stack another)
  function lockTip(part) {
    const info = lockInfo(part); if (!info) return;
    sfx('click');
    const now = Date.now(); if (now - tipAt < 1200) return;
    let st = null; try { st = journeyState(); } catch (e) { /* */ }
    const kids = !!(st && st.kids);
    let txt = `"${info.name}" ${info.text}.`;
    if (st && st.next && st.next.stage === info.stage && st.next.need && st.next.need.length) txt += ' ' + st.next.need.join(kids ? ' אוֹ ' : ' או ') + '.';
    const g = guide();
    if (!g) { toast(`${IC_CURTAIN}<span>${esc(txt)}</span>`, 3200); tipAt = now; return; }
    if (now - tipAt < 9000 && g.isOpen()) g.close();   // our last tip may still be up: the new one replaces it
    tipAt = now; guideMine = true;
    tipTxt = txt; g.tip({ f: txt, k: txt, expr: 'curious' }).then(() => { guideMine = false; });
  }
  // moving to another screen: our own lock tip (only ours: the bubble up now shows its words) goes away. Its own
  // "הבנתי" button closes it, as a child would, so bubbles of others waiting after it stay in the queue.
  let tipTxt = '';
  function dropTip() {
    if (!tipTxt) return; const words = tipTxt; tipTxt = '';
    const g = guide(); if (!g || !g.isOpen()) return;
    const box = document.querySelector('#rguide.tip'), t = box && box.querySelector('.rg-txt');
    if (t && t.textContent === words) { const b = box.querySelector('[data-g="next"]'); if (b) b.click(); }
  }
  // (הממציאים opened on the robot workshop, from the lab's robots door: the workshop is presented first, by its own lines)
  function introFor(name, opts = {}) {
    const robots = name === 'inventors' && opts.view === 'robots' && !locked('robots');
    const part = robots ? 'robots' : INTRO_OF[name], g = guide(); if (!part || !g || !g.intro) return;
    later(() => {
      if (!open_ || screen !== name) return;
      guideMine = true;
      g.intro(part, { modal: true }).then(() => { guideMine = false; });
    }, 450);
  }
  /* ── card mini-games (each lives in ./games/*.js and gets this context) */
  let MODE = 'full';
  const readMode = () => { try { MODE = window.localStorage.getItem(profileKey('web-of-life-mode')) || 'full'; } catch (e) { MODE = MODE || 'full'; } };
  // who is playing: a small, non-interactive label in the top bar
  function paintWho() {
    const p = currentPlayer(), w = $('.wl-who'); if (!w || !p) return;
    w.innerHTML = `${avatarHTML(p.animal, 'wl-av')}<span>${esc(p.name)}</span>`;
    w.setAttribute('aria-label', 'משחק עכשיו: ' + p.name); w.title = 'משחק עכשיו: ' + p.name;
  }
  readMode();
  const GAME_CTX = {
    CARDS, CARD, SP, spOf, RELATION_TYPES, DIET_VERBS, IC, STAT_ICON, STAT_NAMES,
    cardHTML, backHTML, flipHTML, esc,
    kids: () => MODE === 'kids',
    owned: () => S.owned,
    store: (key, val) => { if (val === undefined) return (S.games || {})[key]; S.games = S.games || {}; S.games[key] = val; save(); return val; },
    addCards: (ids) => { const fresh = []; for (const id of ids) { if (!CARD.get(id)) continue; if (!S.owned[id]) fresh.push(id); S.owned[id] = (S.owned[id] || 0) + 1; } save(); if (fresh.length) setTimeout(checkSets, 900); return fresh; },
    grantPack: (n) => grantPack(n), sfx: (n) => sfx(n), toast: (h) => toast(h), confetti: (t, n, p) => confetti(t, n, p),
    later: (fn, ms) => later(fn, ms), reduced, setTitle: (t) => { $('.wl-crumb').textContent = t; },
    exit: () => go('home'), toAlbum: (f) => { if (f) ctx.filter = f; go('album'); }, root: () => el,
    badge: (earn) => { if (GAMES[screen]) played(); return grantBadge(earn); }, tally: (key, add) => badgeTally(key, add), hasBadge: (id) => hasBadge(id),
    // מסע החוקר: a game marks a part as used (e.g. inventors → 'robots'), asks whether a part is open, or lets רובו־דע say what opens it
    markUsed: (part) => { try { markUsed(part); } catch (e) { /* */ } }, isOpen: (part) => !locked(part), lockTip: (part) => lockTip(part),
  };
  // a game is really being played (each game calls ctx.markUsed when a round starts); a badge or cards won count too
  function played(part = PART_OF[screen]) { if (part) { try { markUsed(part); } catch (e) { /* */ } } }
  { const ac0 = GAME_CTX.addCards; GAME_CTX.addCards = (ids) => { if (GAMES[screen]) played(); return ac0(ids); }; }
  const GAMES = { webpuzzle: mountWebPuzzle, keepforest: mountKeepForest, inventors: mountInventors, expedition: mountExpedition, versematch: mountVerseMatch };
  let gameInst = null;
  function go(name, opts = {}) {
    // a part that is not open yet (מסע החוקר): רובו־דע says what opens it, and the screen stays as it is
    // (the hub itself was just opened into it: the home). opts.force (the _go test hook) opens it anyway.
    const part = PART_OF[name];
    let tipNow = false;   // the tip just given stays up over the home it opens on
    if (part && !opts.force && locked(part)) {
      lockTip(part);
      if (main.firstElementChild && screen !== name) return;
      name = 'home'; tipNow = true;
    }
    if (name === 'versematch' && !srcOn()) name = 'home';   // the torah edition's game, only while the sources are on
    clearTimers(); closeModal(); ctx.setsOpen = false;
    const entering = entered !== name; entered = name;   // a repaint of the same screen does not present it again
    if (entering && !tipNow) dropTip();
    if (name === 'home') returnTo = null;
    if (gameInst) { try { gameInst.destroy && gameInst.destroy(); } catch (e) { console.warn(e); } gameInst = null; }
    if (name === 'frames') PARENT.frames = screen === 'badges' ? 'badges' : 'home';
    if (GAMES[name]) {
      screen = name; $('.wl-crumb').textContent = TITLES[name]; $('.wl-back span').textContent = returnTo === name ? (MODE === 'kids' ? 'חֲזָרָה לַמַּעְבָּדָה' : 'חזרה למעבדה') : 'חזרה'; updateChip(false);
      main.innerHTML = '';
      try { gameInst = GAMES[name](main, GAME_CTX, opts) || null; } catch (e) { console.error(e); main.innerHTML = '<p style="padding:2em">אירעה תקלה במשחק.</p>'; }
      main.scrollTop = 0; if (entering) introFor(name, opts); return;
    }
    screen = name;
    $('.wl-crumb').textContent = TITLES[name] || '';
    $('.wl-back span').textContent = name === 'home' ? 'חזרה למשחק' : 'חזרה';
    updateChip(false);
    ({ home: renderHome, setup: renderSetup, quiz: () => startQuiz(opts), end: renderEnd, album: renderAlbum, pack: renderPack, duel: () => startDuel(), badges: renderBadges, frames: renderFrames })[name]();
    main.scrollTop = 0;
    if (screen === name && ['album', 'pack', 'badges', 'frames'].includes(name)) played();   // looking through them is using them
    if (screen === name && entering) introFor(name);
  }
  // opened from the lab (the inventors table): "חזרה" on that screen goes straight back to the lab
  let returnTo = null;
  function back() {
    if (!modal.hidden) { closeModal(); onJourney(); return; }
    if (screen === 'album' && ctx.setsOpen) { sfx('click'); return showSets(false); }
    if (returnTo && screen === returnTo) { sfx('click'); returnTo = null; return close(); }
    const p = PARENT[screen];
    if (p) { sfx('click'); go(p); } else close();
  }

  // the whole collection: the game's cards and, in the torah edition, the source cards ("מן המקורות")
  const srcOn = () => TORAH && sourcesOn();
  function collection() {
    let total = CARDS.length, have = ownedCount();
    if (srcOn()) { const own = ownedSources(); total += SOURCE_CARDS.length; have += SOURCE_CARDS.filter((c) => own[c.id]).length; }
    return { total, have };
  }
  /* ── the parts of the hub (./home.js, ./quiz.js, ./album.js, ./packs.js, ./duel.js), in the order they were written.
     Each gets this one context: the DOM, the player's state S and the shared helpers. The few values that change and are
     read by more than one part are getters: screen, open_ and MODE belong to this file; filter and setsOpen to album.js
     (it adds them to ctx); opensLeft comes from packs.js. */
  const ctx = {
    el, $, main, modal, S, save, sfx, reduced, later, toast, confetti, updateChip, checkSets, ownsIn, setProg, collection, srcOn, locked, go, played,
    get screen() { return screen; }, get open_() { return open_; }, get MODE() { return MODE; },
  };
  const { renderHome, bzoom, openSettings, renderBadges, renderFrames } = createHomeScreens(ctx);
  const { QS, renderSetup, startQuiz, renderEnd, answer, nextQ, quizNow } = createQuiz(ctx);
  const { renderAlbum, showSets, onResize, szoom, zoom, cardLegend, closeModal } = createAlbum(ctx);
  const { renderPack, tearPack, revealCard, revealAll, opensLeft } = createPacks(ctx);
  ctx.opensLeft = opensLeft;
  const { startDuel, playCard, duelNext } = createDuel(ctx);

  /* ── events */
  const ACT = {
    back, close: () => { closeModal(); onJourney(); }, home: () => { sfx('click'); go('home'); }, setup: () => { sfx('click'); go('setup'); },
    album: () => { sfx('click'); go('album'); }, packs: () => { sfx('click'); go(S.packs ? 'pack' : 'album'); },
    pick: (t) => { QS[t.dataset.g] = t.dataset.v; sfx('select'); renderSetup(); },
    start: () => { sfx('click'); go('quiz'); }, again: () => { const Q = quizNow(); sfx('click'); go('quiz', { level: Q && Q.level, biome: Q && Q.biome }); },
    ans: (t) => answer(+t.dataset.k), next: nextQ,
    filter: (t) => { ctx.filter = t.dataset.v; ctx.setsOpen = false; sfx('click'); renderAlbum(); },
    setsopen: () => { sfx('click'); showSets(!ctx.setsOpen); }, setsclose: () => { sfx('click'); showSets(false); },
    set: (t) => { const v = 'set:' + t.dataset.v; const fromZoom = !modal.hidden; closeModal(); ctx.setsOpen = false; ctx.filter = ctx.filter === v && !fromZoom ? 'all' : v; sfx('select'); if (screen === 'album') renderAlbum(); else go('album'); },
    pack: () => { sfx('click'); go('pack'); }, tear: tearPack, reveal: (t) => revealCard(t), revealall: revealAll, legend: () => cardLegend(),
    game: (t) => { sfx('click'); go(t.dataset.g); },
    szoom: (t) => szoom(t.dataset.s),
    // the switch in the settings: the screen below follows it (a game in play is left alone, the source game closes)
    srctoggle: () => {
      setSourcesOn(!sourcesOn()); sfx('click');
      if (!sourcesOn() && (ctx.filter === 'src' || (ctx.filter.startsWith('set:') && SET_BY.get(ctx.filter.slice(4))?.torah))) ctx.filter = 'all';
      if (screen === 'versematch' && !sourcesOn()) go('home');
      else if (['home', 'album', 'setup', 'badges', 'frames'].includes(screen)) go(screen, { force: true });
      openSettings();
    },
    settings: () => openSettings(), bzoom: (t) => bzoom(t.dataset.b),
    duel: () => { sfx('click'); go('duel'); }, play: (t) => playCard(+t.dataset.k), dnext: duelNext,
    badges: () => { sfx('click'); go('badges'); }, frames: () => { sfx('click'); go('frames'); },
    frame: (t) => { if (chooseFrame(t.dataset.f)) { sfx('select'); if (screen === 'frames') renderFrames(); else renderBadges(); } },
    // a veiled part (מסע החוקר): רובו־דע says what opens it
    locked: (t) => lockTip(t.dataset.part),
  };
  // low screens: the set chips are one scrolling row; the mouse wheel moves it sideways
  el.addEventListener('wheel', (e) => {
    const row = e.target.closest && e.target.closest('.wl-setrow');
    if (!row || row.scrollWidth <= row.clientWidth + 2 || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    e.preventDefault(); row.scrollLeft -= e.deltaY;
  }, { passive: false });
  el.addEventListener('click', (e) => {
    const t = e.target.closest('[data-wl]');
    if (t && el.contains(t) && !t.disabled) { ACT[t.dataset.wl] && ACT[t.dataset.wl](t, e); return; }
    if (e.target === modal) { closeModal(); onJourney(); return; }
    const c = e.target.closest('.wl-grid .wl-card'); if (c) zoom(c.dataset.cid);
  });
  // keep the game underneath from reacting to input while the hub is open
  for (const ev of ['pointerdown', 'pointerup', 'pointermove', 'wheel', 'contextmenu', 'mousedown', 'touchstart']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: ev !== 'contextmenu' });
  const onKey = (e) => {
    if (!open_) return;
    // רובו־דע's bubble takes the key first (its own capture listener, added before this one, closes the bubble and stops
    // the event): the same Escape must not also leave the hub. cancelBubble reads that stop; isOpen() covers any order.
    if (e.cancelBubble || (window.__guide && window.__guide.isOpen())) return;
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); back(); }
    else if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.matches && e.target.matches('[data-wl][role=button]')) { e.preventDefault(); e.target.click(); }
  };

  // something opened or was used (מסע החוקר): repaint the screens that show locks (a game in play is left alone)
  // (only when a lock really changed: a part marked as used must not make the screen rise in again)
  let journeyT = 0, lockSig = '';
  const HUB_PARTS = ['album', 'quiz', 'webpuzzle', 'keepforest', 'badges', 'frames', 'inventors', 'expedition', 'duel', 'versematch'];
  // a part opened by a new stage comes with 'wol-stage' / 'wol-stage-done' (no 'wol-journey'): listen to all three
  const JOURNEY_EVENTS = ['wol-journey', 'wol-stage', 'wol-stage-done'];
  const sigNow = () => HUB_PARTS.map((p) => (locked(p) ? 0 : 1)).join('');
  function onJourney() {
    clearTimeout(journeyT);
    journeyT = setTimeout(() => {
      if (!open_) return;
      // (under an open window nothing is repainted and the new locks are not taken as seen: closing it repaints)
      const sg = sigNow(); if (sg === lockSig || !modal.hidden) return; lockSig = sg;
      if (screen === 'home') renderHome(); else if (screen === 'badges') renderBadges(); else return;
      const sc = main.querySelector('.wl-screen'); if (sc) sc.style.animation = 'none';   // a repaint, not a new screen: no rise
    }, 60);
  }
  function open() {
    if (open_) return;
    reloadState(); readMode(); paintWho(); // the start screen may have switched player or מתחילים / מתקדמים since the hub was created
    open_ = true; el.hidden = false; rootEl.classList.add('wl-hubopen');
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onResize);
    for (const ev of JOURNEY_EVENTS) window.addEventListener(ev, onJourney);
    lockSig = sigNow();
    go('home');
    try { $('.wl-back').focus({ preventScroll: true }); } catch (e) { /* */ }
  }
  function close() {
    if (!open_) return;
    open_ = false; entered = null; clearTimers(); closeModal(); el.hidden = true; rootEl.classList.remove('wl-hubopen');
    if (guideMine) { const g = guide(); try { g && g.isOpen() && g.close(); } catch (e) { /* */ } guideMine = false; }
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', onResize);
    for (const ev of JOURNEY_EVENTS) window.removeEventListener(ev, onJourney);
    sfx('click');
    try { onClose && onClose(); } catch (e) { console.warn(e); }
  }
  const api = { open, close, isOpen: () => open_, grantPack, go: (name, opts) => { if (!open_) open(); returnTo = opts && opts.from === 'lab' ? name : null; go(name, opts); } };
  try {
    window.__wolLearn = {
      ...api,
      _go: (name, opts) => { if (!open_) open(); go(name, { force: true, ...(opts || {}) }); return screen; },
      _locks: () => [...el.querySelectorAll('.is-veiled[data-part]')].map((x) => x.dataset.part),
      _answer: (right = true) => { const Q = quizNow(); if (!Q) return; const k = Q.qs[Q.i].options.findIndex((o) => !!o.ok === !!right); answer(k < 0 ? 0 : k); },
      _tear: tearPack, _play: (k = 0) => playCard(k), _zoom: zoom,
      _collect: (n = CARDS.length) => { if (!open_) reloadState(); sample(CARDS, n).forEach((c) => { S.owned[c.id] = (S.owned[c.id] || 0) + 1; }); save(); if (open_ && screen === 'album') renderAlbum(); else checkSets(); return ownedCount(); },
      _give: (ids) => { if (!open_) reloadState(); ids.forEach((id) => { if (CARD.has(id)) S.owned[id] = (S.owned[id] || 0) + 1; }); save(); if (open_ && screen === 'album') renderAlbum(); else checkSets(); return ownedCount(); },
      _sets: () => SETS.map((st) => ({ id: st.id, name: st.name, cards: st.cards.map((c) => c.id + ':' + c.rarity), have: setProg(st).have, done: !!(S.sets || {})[st.id] })),
      _reset: () => { if (!open_) reloadState(); S.owned = {}; S.packs = START_PACKS; S.duelPacks = null; S.sets = {}; save(); },
      _state: () => { if (!open_) reloadState(); return JSON.parse(JSON.stringify(S)); },
      _round: (level = 'easy', biome = 'both') => buildRound(level, biome).map((q) => ({ qid: q.qid, q: q.q, sub: q.sub, tag: q.tag, art: q.art && q.art.id, opts: q.options.map((o) => (o.ok ? '*' : '') + o.label) })),
      cards: CARDS.length,
    };
  } catch (e) { /* no window */ }
  updateChip(false);
  return api;
}
