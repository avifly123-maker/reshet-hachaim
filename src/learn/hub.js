// רשת החיים – מרכז הלמידה (learning hub): trivia quiz + TCG-style card album + "מי חזק ברשת?" duel.
// Self-contained DOM overlay (no WebGL, no network). CSS injected once, scoped under #wol-learn.wol-learn.
//
// export function createLearningHub(rootEl, { onClose, audio }) → { open(), close(), isOpen(), grantPack(n) }
// Also exposes window.__wolLearn = { open, close, isOpen, grantPack(n), _go(screen, opts), _state() }.
// 1.3.2 (מסע החוקר): the home is one page (album in the middle, quiz / badges / frames on the right, the card games on the
// left). Every tile follows core/journey.js isOpen(part): a part that is not open yet is veiled, and a click on it (or
// go() into it) lets רובו־דע say what opens it. The first visit of each screen: window.__guide.intro(part)
// (lines in src/data/guide/hub.js). journey.markUsed(part) when a part is really played. _go() is a test hook: it opens
// a screen even when its part is still locked.
// Persistence: localStorage 'web-of-life-cards::<player>' (optional – everything works without it). Each player
// (core/profiles.js) has their own album; the state is re-read from the current player's key every time the hub opens.
import { tally as badgeTally, chooseFrame, chosenFrame, grant as grantBadge, hasBadge, openFrames, ownedBadges } from '../core/badges-store.js';
import { TORAH, setSourcesOn, sourcesOn } from '../core/edition.js';
import { PARTS as JPARTS, isOpen, state as journeyState, lockInfo, markUsed } from '../core/journey.js';
import { current as currentPlayer, key as profileKey } from '../core/profiles.js';
import { grantSource, ownedSources } from '../core/sources-store.js';
import { setSourceCheck } from '../core/threads.js';
import { BADGES, BADGE_GROUPS, FRAMES } from '../data/badges.js';
import { CARD_ART } from '../data/card-art.js';
import { DIET_VERBS, RELATION_TYPES, gw } from '../data/common.js';
import { BABA_DA_LOGO } from '../data/logo.js';
import { PACK_ART } from '../data/pack-art.js';
import { SOURCE_ART } from '../data/source-art.js';
import { THUMBS } from '../data/thumbs.js';
import { VERSE_LINKS } from '../data/torah-links.js';
import { EARN_TEXT, SHIRA, SOURCE_CARDS, TZVI_SET } from '../data/torah.js';
import { avatarHTML } from '../ui/avatars.js';
import { badgeHTML } from '../ui/badge-art.js';
import { TILE_TONE, tileIcon } from '../ui/icons-hub.js';
import { stampsHTML } from '../ui/threads-ui.js';
import { icon } from '../ui/ui.js';
import { mountExpedition } from './games/expedition.js';
import { mountInventors } from './games/inventors.js';
import { mountKeepForest } from './games/keep-forest.js';
import { mountVerseMatch } from './games/verse-match.js';
import { mountWebPuzzle } from './games/web-puzzle.js';
import { DUEL_PACKS_PER_DAY, IC, IC_CURTAIN, KEYS_LAND, OPEN_PER_DAY, PACK_CHANCE, QUIZ_PACKS_MAX, RARITY_GEMS, RARITY_MORE, RARITY_NAMES, START_PACKS, STAT_HELP, STAT_ICON, STAT_NAMES, STORE_KEY, esc, firstSentence, pick, rnd, sample, todayKey } from './hub/base.js';
import { IC_GEM, IC_KEY, artStyle, backHTML, cardHTML, flipHTML, gems } from './hub/card-html.js';
import { CARD, CARDS, IC_SCROLL, SETS, SET_BY, SET_WHERE, SP, activeSets, setsOf, spOf } from './hub/cards.js';
import { SEEN_MAX, buildRound, buildTorahRound, seenMap, setSeen } from './hub/quiz-build.js';
import { loadState } from './hub/storage.js';
import { injectCss } from './hub/styles.js';

/* the hub's icons (src/ui/icons-hub.js): a coloured tile before each title, a line icon before each button's words */
const BGROUP_IC = { amazon: 'amazon', grove: 'grove', reef: 'reef', lab: 'invent', deep: 'dive', research: 'research', sources: 'scroll' };

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
    g.tip({ f: txt, k: txt, expr: 'curious' }).then(() => { guideMine = false; });
  }
  function introFor(name) {
    const part = INTRO_OF[name], g = guide(); if (!part || !g || !g.intro) return;
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
    exit: () => go('home'), toAlbum: (f) => { if (f) filter = f; go('album'); }, root: () => el,
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
    if (part && !opts.force && locked(part)) {
      lockTip(part);
      if (main.firstElementChild && screen !== name) return;
      name = 'home';
    }
    if (name === 'versematch' && !srcOn()) name = 'home';   // the torah edition's game, only while the sources are on
    clearTimers(); closeModal(); setsOpen = false;
    const entering = entered !== name; entered = name;   // a repaint of the same screen does not present it again
    if (name === 'home') returnTo = null;
    if (gameInst) { try { gameInst.destroy && gameInst.destroy(); } catch (e) { console.warn(e); } gameInst = null; }
    if (name === 'frames') PARENT.frames = screen === 'badges' ? 'badges' : 'home';
    if (GAMES[name]) {
      screen = name; $('.wl-crumb').textContent = TITLES[name]; $('.wl-back span').textContent = returnTo === name ? (MODE === 'kids' ? 'חֲזָרָה לַמַּעְבָּדָה' : 'חזרה למעבדה') : 'חזרה'; updateChip(false);
      main.innerHTML = '';
      try { gameInst = GAMES[name](main, GAME_CTX, opts) || null; } catch (e) { console.error(e); main.innerHTML = '<p style="padding:2em">אירעה תקלה במשחק.</p>'; }
      main.scrollTop = 0; if (entering) introFor(name); return;
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
    if (!modal.hidden) return closeModal();
    if (screen === 'album' && setsOpen) { sfx('click'); return showSets(false); }
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
  /* ── home (1.3.2): one page. Right: the quiz, my badges, my frames; middle: the album; left: the card games.
     A part that is not open yet (core/journey.js) is veiled: dimmed, a curtain, and the words of what opens it. */
  const HOME_GAMES = [
    { part: 'webpuzzle', ic: 'thread', name: 'חוט הקשר' },
    { part: 'keepforest', ic: 'keep', name: 'מחזיקים את היער' },
    { part: 'duel', ic: 'strong', name: 'מי חזק ברשת?' },
    { part: 'inventors', ic: 'invent', name: 'הממציאים' },
    { part: 'expedition', ic: 'dive', name: 'משלחת לעומק' },
    { part: 'versematch', ic: 'scroll', name: 'מה הפסוק מלמד?', torah: true },
  ];
  const FRAME_SAMPLE = ['amazon:toucan', 'grove:owl', 'reef:clownfish', 'amazon:jaguar', 'grove:jay'];
  function renderHome() {
    const { total, have } = collection();
    const veiled = (p) => locked(p);
    const vc = (p) => (veiled(p) ? ' is-veiled' : '');
    const act = (p, a, extra = '') => (veiled(p) ? `data-wl="locked" data-part="${p}" aria-disabled="true"` : `data-wl="${a}" ${extra}`);
    const veil = (p) => { if (!veiled(p)) return ''; const L = lockInfo(p); return `<span class="wl-veil">${IC_CURTAIN}<span>${esc(L ? L.text : '')}</span></span>`; };
    const fan = ['amazon:jaguar', 'grove:owl', 'amazon:toucan'].map((id) => CARD.get(id)).filter(Boolean);
    const toucan = spOf('amazon', 'toucan');
    // my badges: the three newest
    const ownB = ownedBadges(), mine = vBadges().filter((b) => ownB[b.id]).sort((a, b) => ownB[b.id] - ownB[a.id]);
    // my frames: the chosen one on one of my cards
    const fr = chosenFrame(), frame = FRAMES.find((f) => f.id === fr), frOpen = openFrames().filter(visB).length, frAll = FRAMES.filter(visB).length;
    const sample = CARD.get(FRAME_SAMPLE.find((id) => S.owned[id]) || Object.keys(S.owned).find((id) => CARD.has(id)) || FRAME_SAMPLE[0]);
    const late = S.packs && !opensLeft();
    const games = HOME_GAMES.filter((g) => !g.torah || srcOn());
    const K = (f, k) => (MODE === 'kids' ? k : f);   // beginners read the home's words fully vocalised
    const of = K('מתוך', 'מִתּוֹךְ');
    main.innerHTML = `<section class="wl-screen wl-home">
      <div class="wl-hside">
        <button class="wl-ht wl-hq paper${vc('quiz')}" ${act('quiz', 'setup')} aria-label="חידון">
          <span class="wl-hqart"><span class="wl-qbubble">${CARD_ART.toucan ? `<img src="${CARD_ART.toucan}" alt="">` : toucan && toucan.img ? `<img src="${toucan.img}" alt="">` : ''}</span><span class="wl-qbadge">${IC.quest}</span></span>
          <span class="wl-htx"><b class="wl-hh">${tileIcon('quiz', 'wl-tic')}${K('חידון', 'חִידוֹן')}</b><small>${K('עשר שאלות על היצורים. תשובה נכונה יכולה להביא חבילת קלפים!', 'עֶשֶׂר שְׁאֵלוֹת עַל הַיְּצוּרִים. תְּשׁוּבָה נְכוֹנָה יְכוֹלָה לְהָבִיא חֲבִילַת קְלָפִים!')}</small></span>
          ${veil('quiz')}</button>
        <button class="wl-ht wl-hb paper${vc('badges')}" ${act('badges', 'badges')} aria-label="התגים שלי">
          <span class="wl-hrow"><b class="wl-hh">${tileIcon('medal', 'wl-tic')}${K('התגים שלי', 'הַתָּגִים שֶׁלִּי')}</b><span class="wl-hn">${mine.length} ${of} ${vBadges().length}</span></span>
          <span class="wl-hbrow">${mine.length ? mine.slice(0, 3).map((b) => badgeHTML(b, { own: true })).join('') : `<span class="wl-hempty">${K('עוד אין לכם תגים. משחקים, חוקרים ומקבלים!', 'עוֹד אֵין לָכֶם תָּגִים. מְשַׂחֲקִים, חוֹקְרִים וּמְקַבְּלִים!')}</span>`}</span>
          ${veil('badges')}</button>
        <button class="wl-ht wl-hf paper${vc('frames')}" ${act('frames', 'frames')} aria-label="המסגרות שלי">
          <span class="wl-hfcard">${sample ? cardHTML(sample, { cls: fr !== 'none' ? 'fr-' + fr : '' }) : ''}</span>
          <span class="wl-htx"><b class="wl-hh">${tileIcon('frame', 'wl-tic')}${K('המסגרות שלי', 'הַמִּסְגָּרוֹת שֶׁלִּי')}</b>
            <small>${fr === 'none' || !frame ? K('עוד לא בחרתם מסגרת', 'עוֹד לֹא בְּחַרְתֶּם מִסְגֶּרֶת') : K('בחרתם: ', 'בְּחַרְתֶּם: ') + esc(frame.name)}</small>
            <small class="wl-hn">${frOpen} ${of} ${frAll} ${K('פתוחות', 'פְּתוּחוֹת')}</small></span>
          ${veil('frames')}</button>
      </div>
      <div class="wl-hmid">
        <button class="wl-ht wl-ha paper${vc('album')}" ${act('album', 'album')} aria-label="אלבום הקלפים">
          <span class="wl-hfan">${fan.map((c) => cardHTML(c)).join('')}</span>
          <span class="wl-hab"><b class="wl-hh big">${tileIcon('album', 'wl-tic')}${K('אלבום הקלפים', 'אַלְבּוֹם הַקְּלָפִים')}</b>
            <span class="wl-hcount">${K('אספתם', 'אֲסַפְתֶּם')} <b>${have}</b> ${of} <b>${total}</b> ${K('קלפים', 'קְלָפִים')}</span>
            <span class="wl-meter"><i style="width:${Math.round((have / total) * 100)}%"></i></span></span>
          ${veil('album')}</button>
        ${veiled('album') ? '' : S.packs ? `<button class="wl-btn gold wl-hpack" data-wl="pack" ${late ? 'disabled' : ''} title="${late ? 'היום כבר פתחתם ' + OPEN_PER_DAY + ' חבילות. מחר אפשר לפתוח עוד' : 'פתחו חבילה'}">${icon('pack')}<span>${late ? K('עוד חבילות מחר', 'עוֹד חֲבִילוֹת מָחָר') : K('פתחו חבילה', 'פִּתְחוּ חֲבִילָה')}</span><span class="wl-badgeN">${S.packs}</span></button>`
          : `<span class="wl-hnopack">${IC.quest}<span>${K('שחקו בחידון כדי להרוויח חבילות', 'שַׂחֲקוּ בַּחִידוֹן כְּדֵי לְהַרְוִיחַ חֲבִילוֹת')}</span></span>`}
      </div>
      <div class="wl-hgames">
        <h3 class="wl-hgh">${IC.cards}${K('משחקי קלפים', 'מִשְׂחֲקֵי קְלָפִים')}</h3>
        <div class="wl-hgrid n${games.length}">${games.map((g) => `<button class="wl-gt${vc(g.part)}" ${act(g.part, 'game', `data-g="${g.part}"`)} style="--tc:${TILE_TONE[g.ic] || '#3a4d5c'}" aria-label="${esc(g.name)}">${tileIcon(g.ic, 'wl-tic')}<b>${esc(MODE === 'kids' && JPARTS[g.part] ? JPARTS[g.part].kname : g.name)}</b>${veil(g.part)}</button>`).join('')}</div>
      </div>
    </section>`;
  }
  /* ── badges: the ones this edition shows (the torah edition's own only while "מקורות ופסוקים" is on) */
  const visB = (x) => !x.torah || srcOn();
  const vBadges = () => { const own = ownedBadges(); return BADGES.filter((b) => visB(b) && (!b.retired || own[b.id])); };   /* a retired badge shows only to who earned it */
  // a badge you can point at: it grows, and shows its name and how it is earned; a click (or a touch) opens it big
  const bzHTML = (b, own, cls = '') => `<button class="wl-bz ${cls}" data-wl="bzoom" data-b="${b.id}" aria-label="${esc(own ? b.name + ': ' + b.how : 'תג נעול: ' + b.how)}">${badgeHTML(b, { own, peek: !own && cls.includes('next') })}
    <span class="wl-btip" aria-hidden="true"><b>${esc(own ? b.name : 'עוד לא: ' + b.name)}</b><small>${esc(b.how)}</small></span></button>`;
  function bzoom(id) {
    const b = BADGES.find((x) => x.id === id); if (!b) return;
    const own = ownedBadges(), g = BADGE_GROUPS.find((x) => x.id === b.group);
    sfx('select');
    const when = own[b.id] ? new Date(own[b.id]) : null;
    modal.innerHTML = `<div class="wl-bzbig">${badgeHTML(b, { own: !!own[b.id], peek: !own[b.id] })}</div>
      <div class="wl-mtext paper wl-bzt"><h3>${esc(own[b.id] ? b.name : 'תג נעול: ' + b.name)}</h3>
        <p><b>${own[b.id] ? 'קיבלתם אותו על:' : 'איך מקבלים אותו:'}</b> ${esc(b.how)}</p>
        ${g ? `<p class="wl-bzg">${tileIcon(BGROUP_IC[g.id] || 'medal', 'wl-tic')}${esc(g.name)}</p>` : ''}
        ${when ? `<small>התקבל ב־${when.getDate()}.${when.getMonth() + 1}.${when.getFullYear()}</small>` : ''}
        <button class="wl-btn" data-wl="close">${icon('close')}סגירה</button></div>`;
    modal.hidden = false;
  }
  /* ── settings (the gear in the top bar): the torah edition's "מקורות ופסוקים" switch lives here */
  function openSettings() {
    sfx('select');
    const on = sourcesOn();
    modal.innerHTML = `<div class="wl-mtext paper wl-settings"><h3>${icon('sliders')}הגדרות</h3>
      <button class="wl-srcsw${on ? ' on' : ''}" data-wl="srctoggle" role="switch" aria-checked="${on}">${IC_SCROLL}<span><b>מקורות ופסוקים</b><small>${on ? 'פועל: חידון "מן המקורות", קלפי מקור, המשחק "מה הפסוק מלמד?" ושירת הבריאה' : 'כבוי: המשחק בלי תוכן מן המקורות'}</small></span><i class="sw"></i></button>
      <button class="wl-btn" data-wl="close">${icon('check')}סיום</button></div>`;
    modal.hidden = false;
  }

  /* ── the badges (תגים); the frames they open have their own screen (1.3.2), linked from here */
  function renderBadges() {
    const own = ownedBadges();
    const frV = locked('frames');
    main.innerHTML = `<section class="wl-screen wl-badges">
      <div class="wl-bhead paper"><b>${tileIcon('medal', 'wl-tic')}התגים שלי</b><span>אספתם ${vBadges().filter((b) => own[b.id]).length} מתוך ${vBadges().length}</span>
        <button class="wl-btn${frV ? ' is-veiled' : ''}" ${frV ? 'data-wl="locked" data-part="frames"' : 'data-wl="frames"'}>${icon('frame')}<span>המסגרות שלי</span></button></div>
      ${BADGE_GROUPS.filter(visB).map((g) => { const list = vBadges().filter((b) => b.group === g.id); const have = list.filter((b) => own[b.id]).length;
        return `<section class="wl-bgroup" style="--bg1:${g.col};--bg2:${g.col2}"><h3><span>${tileIcon(BGROUP_IC[g.id] || 'medal', 'wl-tic')}${esc(g.name)}</span><small>${have} מתוך ${list.length}</small></h3>
          <div class="wl-bgrid">${list.map((b) => bzHTML(b, !!own[b.id])).join('')}</div></section>`; }).join('')}
    </section>`;
  }
  /* ── my frames: choose the frame of the album cards (each group of badges opens one) */
  function renderFrames() {
    const cur = chosenFrame(), open = new Set(openFrames().map((f) => f.id));
    const sample = CARD.get(FRAME_SAMPLE.find((id) => S.owned[id]) || Object.keys(S.owned).find((id) => CARD.has(id)) || FRAME_SAMPLE[0]);
    const list = FRAMES.filter(visB);
    main.innerHTML = `<section class="wl-screen wl-framesx">
      <section class="wl-frames paper">
        <div class="wl-fprev">${sample ? cardHTML(sample, { cls: cur !== 'none' ? 'fr-' + cur : '' }) : ''}</div>
        <h3>${icon('frame')}מסגרות לקלפים באלבום</h3>
        <p>כל קבוצת תגים פותחת מסגרת. בחרו מסגרת, והיא תופיע על כל הקלפים שלכם באלבום. פתוחות: ${list.filter((f) => open.has(f.id)).length} מתוך ${list.length}</p>
        <div class="wl-frow">${list.map((f) => { const g = BADGE_GROUPS.find((x) => x.id === f.group);
          return `<button class="wl-frame fr-${f.id}${cur === f.id ? ' sel' : ''}" data-wl="frame" data-f="${f.id}" ${open.has(f.id) ? '' : 'disabled'}><span class="wl-fsw"></span><b>${esc(f.name)}</b><small>${open.has(f.id) ? (cur === f.id ? 'נבחרה' : 'אפשר לבחור') : f.group === 'all' ? `נפתחת עם ${f.need} תגים` : `נפתחת עם ${f.need} תגים של ${esc(g ? g.short : '')}`}</small></button>`; }).join('')}</div>
      </section>
    </section>`;
  }

  /* ── quiz setup */
  const QS = { level: 'easy', biome: 'both' };
  function renderSetup() {
    const torahQuiz = TORAH && sourcesOn();
    if (!torahQuiz && QS.level === 'torah') QS.level = 'easy';
    const th = (b, id) => (THUMBS[b] || {})[id] || '';
    const ch = (grp, v, icon, title, sub) => `<button class="wl-choice${QS[grp] === v ? ' sel' : ''}" data-wl="pick" data-g="${grp}" data-v="${v}" aria-pressed="${QS[grp] === v}">
      <span class="wl-cic">${icon}</span><span><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span></button>`;
    main.innerHTML = `<section class="wl-screen"><div class="wl-setup paper">
      <h2>חידון רשת החיים</h2>
      <div class="wl-step"><h3>1. בחרו רמה</h3><div class="wl-choices" style="--n:${torahQuiz ? 3 : 2}">
        ${ch('level', 'easy', IC.seedling, 'מתחילים', 'גילאי 6–8 · שאלות עם תמונות')}
        ${ch('level', 'hard', IC.tree, 'מתקדמים', 'קשרים ברשת, קומות היער וטכנולוגיה')}
        ${torahQuiz ? ch('level', 'torah', IC_SCROLL, 'מן המקורות', 'פסוקים, מדרשים ופרק שירה') : ''}
      </div></div>
      ${QS.level === 'torah' ? '' : `<div class="wl-step"><h3>2. בחרו מקום</h3><div class="wl-choices wl-places" style="--n:4">
        ${ch('biome', 'amazon', CARD_ART.toucan ? `<img class="paint" src="${CARD_ART.toucan}" alt="" style="transform-origin:58% 36%">` : `<img src="${th('amazon', 'toucan')}" alt="">`, 'אמזונס', 'יער הגשם')}
        ${ch('biome', 'grove', CARD_ART.gazelle ? `<img class="paint" src="${CARD_ART.gazelle}" alt="" style="transform-origin:52% 32%">` : `<img src="${th('grove', 'jay')}" alt="">`, 'חורש', 'החורש הארץ-ישראלי')}
        ${ch('biome', 'reef', CARD_ART.clownfish ? `<img class="paint" src="${CARD_ART.clownfish}" alt="" style="transform-origin:50% 45%">` : IC.drop, 'שונית', 'שונית האלמוגים')}
        ${ch('biome', 'both', IC.globe, 'הכול', 'כל המקומות')}
      </div></div>`}
      <button class="wl-btn go" data-wl="start">יוצאים לדרך! ${IC.next}</button>
    </div></section>`;
  }

  /* ── quiz */
  let Q = null;
  function startQuiz(opts = {}) {
    let level = opts.level || QS.level; const biome = opts.biome || QS.biome;
    if (level === 'torah' && !(TORAH && sourcesOn())) level = 'easy';
    setSeen(seenMap(S.seen));
    const qs = level === 'torah' ? buildTorahRound() : buildRound(level, biome);
    if (qs.forget && qs.forget.length) { const f = new Set(qs.forget); S.seen = (Array.isArray(S.seen) ? S.seen : []).filter((id) => !f.has(id)); save(); }
    Q = { level, biome, qs, i: 0, res: [], packs: 0, answered: false };
    renderQuestion();
  }
  // a question counts as asked once it is on the screen (a round left in the middle does not use up the rest)
  function markSeen(id) {
    if (!id) return;
    const l = (Array.isArray(S.seen) ? S.seen : []).filter((x) => x !== id); l.push(id);
    S.seen = l.length > SEEN_MAX ? l.slice(l.length - SEEN_MAX) : l;
    save();
  }
  function progHTML() {
    return `<div class="wl-prog" aria-label="התקדמות">${Q.qs.map((_, k) => `<span class="wl-pl ${k < Q.res.length ? (Q.res[k] ? 'ok' : 'no') : k === Q.i ? 'cur' : ''}">${IC.leaf}</span>`).join('')}
      <span class="wl-pnum">שאלה ${Math.min(Q.i + 1, Q.qs.length)} מתוך ${Q.qs.length}</span></div>`;
  }
  function renderQuestion() {
    const q = Q.qs[Q.i]; Q.answered = false;
    markSeen(q.qid);
    const longOpts = q.options.some((o) => o.label.length > (Q.level === 'easy' ? 14 : 18)) || (q.options.length > 3);
    let art = '';
    if (q.art) {
      const a = q.art;
      const paint = CARD_ART[a.id] || '';
      const alt = q.hideName ? 'מי זה?' : esc(a.name);
      const pic = paint ? `<img src="${paint}" alt="${alt}" draggable="false">` : (a.img ? `<img src="${a.img}" alt="${alt}" draggable="false">` : '');
      art = `<div class="wl-qart${paint ? ' paint' : a.tool ? ' tool' : ''}"${paint ? '' : ` style="${artStyle(a.color || '#7fae4f')}"`}>
        ${pic}${q.hideName ? '' : `<span class="wl-anm">${esc(a.name)}</span>`}</div>`;
    }
    const sub = q.sub ? `<p class="wl-sub">${esc(q.sub).replace(/___/g, '<span class="wl-blank">?</span>')}</p>` : '';
    main.innerHTML = `<section class="wl-screen wl-quiz ${Q.level}">
      ${progHTML()}
      <div class="wl-qwrap"><div class="wl-qcard paper${q.art ? '' : ' noart'}">
        ${art}
        <div class="wl-qbody">
          ${q.tag && Q.level !== 'easy' ? `<span class="wl-qtag">${esc(q.tag)}</span>` : ''}
          <h2 class="wl-q">${esc(q.q)}</h2>${sub}
          <div class="wl-opts${longOpts ? ' stack' : ''}" style="--n:${q.options.length}">
            ${q.options.map((o, k) => `<button class="wl-opt${o.tone ? ' t-' + o.tone : ''}" data-wl="ans" data-k="${k}">
              ${o.img ? `<img${o.paint ? ' class="pt"' : ''} src="${o.img}" alt="" draggable="false">` : ''}${o.icon ? `<i>${o.icon}</i>` : ''}<span>${esc(o.label)}</span></button>`).join('')}
          </div>
          <div class="wl-fbslot"></div>
        </div></div></div></section>`;
  }
  function answer(k) {
    if (!Q || Q.answered) return;
    const q = Q.qs[Q.i], o = q.options[k]; if (!o) return;
    played('quiz');
    Q.answered = true;
    const ok = o.ok; Q.res.push(ok);
    const btns = [...main.querySelectorAll('.wl-opt')];
    btns.forEach((b, j) => {
      b.disabled = true;
      const oj = q.options[j];
      if (oj.ok) { b.classList.add('ok'); b.insertAdjacentHTML('beforeend', `<span class="wl-mark">${IC.check}</span>`); }
      else if (j === k) { b.classList.add('no'); b.insertAdjacentHTML('beforeend', `<span class="wl-mark">${IC.cross}</span>`); }
      else b.classList.add('dim');
    });
    const pl = main.querySelectorAll('.wl-pl')[Q.i]; if (pl) { pl.classList.remove('cur'); pl.classList.add(ok ? 'ok' : 'no'); }
    let gotPack = false;
    if (ok) {
      sfx('quizRight'); confetti(btns[k]);
      if (Q.packs < QUIZ_PACKS_MAX && Math.random() < PACK_CHANCE) { Q.packs++; gotPack = true; S.packs++; save(); updateChip(true); later(() => sfx('discover'), 350); }
    } else sfx('quizWrong');
    const right = q.options.find((x) => x.ok);
    const fact = Q.level === 'easy' ? firstSentence(q.fact) : q.fact;
    const last = Q.i >= Q.qs.length - 1;
    $('.wl-fbslot').innerHTML = `<div class="wl-fb ${ok ? 'ok' : 'no'}">
      <div class="wl-fbt"><b>${ok ? pick(['נכון! כל הכבוד!', 'מצוין!', 'יפה מאוד!', 'בדיוק!']) : `כמעט! התשובה הנכונה: ${esc(right.label)}`}</b>
        <p>${esc(fact)}</p>${q.src ? `<div class="wl-src"><p class="t">${esc(q.src)}</p><small>${esc(q.ref)}</small></div>` : ''}${gotPack ? `<span class="wl-gotpack">${IC.pack} קיבלתם חבילת קלפים!</span>` : ''}</div>
      <button class="wl-btn ${last ? 'gold' : 'go'}" data-wl="next">${last ? 'לתוצאות' : 'הבא'} ${IC.next}</button></div>`;
    const nb = $('.wl-fb [data-wl="next"]'); if (nb) setTimeout(() => { try { nb.focus({ preventScroll: true }); $('.wl-fb').scrollIntoView({ block: 'nearest' }); } catch (e) { /* */ } }, 50);
  }
  function nextQ() {
    if (!Q || !Q.answered) return;
    sfx('click');
    Q.i++;
    if (Q.i >= Q.qs.length) { go('end'); return; }
    renderQuestion();
  }
  function renderEnd() {
    if (!Q) return go('setup');
    const right = Q.res.filter(Boolean).length, n = Q.qs.length;
    const stars = right >= n - 1 ? 3 : right >= Math.ceil(n * 0.6) ? 2 : 1;
    if (Q.packs === 0 && right >= 7) { Q.packs = 1; S.packs++; }   // a very good round never ends empty-handed
    S.quizzes = (S.quizzes || 0) + 1; S.best = Math.max(S.best || 0, right); save(); updateChip(true);
    // torah corner: 7 right answers or more – the next source card the quiz gives, once
    let gotSrc = null;
    if (Q.level === 'torah' && right >= 7 && !Q.srcDone) {
      Q.srcDone = true; const own = ownedSources();
      gotSrc = SOURCE_CARDS.find((c) => c.earn === 'quiz' && !own[c.id]) || null;
      if (gotSrc) grantSource(gotSrc.id);
    }
    const title = stars === 3 ? 'אלופי רשת החיים!' : stars === 2 ? 'כל הכבוד!' : 'יופי של התחלה!';
    main.innerHTML = `<section class="wl-screen"><div class="wl-end paper">
      <div class="wl-stars">${[0, 1, 2].map((k) => `<span class="${k < stars ? 'on' : ''}" style="animation-delay:${0.15 + k * 0.22}s">${IC.star}</span>`).join('')}</div>
      <h2>${title}</h2>
      <p>עניתם נכון על <b>${right}</b> מתוך <b>${n}</b> שאלות</p>
      ${gotSrc ? `<span class="wl-gotpack src">${IC_SCROLL} קלף מקור חדש באלבום: ${esc(gotSrc.title)}</span>` : ''}
      ${Q.packs ? `<span class="wl-gotpack">${IC.pack} הרווחתם ${Q.packs === 1 ? 'חבילת קלפים אחת' : Q.packs + ' חבילות קלפים'}</span>` : '<p>בפעם הבאה אולי תרוויחו חבילת קלפים!</p>'}
      <div class="wl-row">
        <button class="wl-btn go" data-wl="again">${icon('again')}שחקו שוב</button>
        ${S.packs ? `<button class="wl-btn gold" data-wl="pack">${icon('pack')} פתחו חבילה</button>` : `<button class="wl-btn" data-wl="album">${icon('album')} לאלבום</button>`}
        <button class="wl-btn" data-wl="home">${icon('learn')}למרכז הלמידה</button>
      </div></div></section>`;
    sfx(stars === 3 ? 'mission' : 'discover');
    if (stars === 3) later(() => confetti($('.wl-stars'), 30), 600);
  }

  /* ── album */
  let filter = 'all';
  const setDots = (st) => { const has = ownsIn(st); return st.cards.map((c) => `<i class="${has(c) ? 'on' : ''}${c.rarity === 'epic' || c.rarity === 'rare' ? ' r' : ''}"></i>`).join(''); };
  // the sets live in a panel that opens from the "סדרות" button, so the album page is mostly cards
  let setsOpen = false;
  function setsHTML() {
    const sets = activeSets(), done = sets.filter((st) => setProg(st).done).length;
    const chip = (st) => {
      const p = setProg(st), sel = filter === 'set:' + st.id;
      return `<button class="wl-set${p.done ? ' done' : ''}${sel ? ' sel' : ''}" data-wl="set" data-v="${st.id}" style="--sc:${st.col}" aria-pressed="${sel}" title="${esc(st.sub)} · ${SET_WHERE[st.where]}">
        <span class="wl-seti">${st.ic}</span><span class="wl-setb"><b>${esc(st.name)}</b><span class="wl-setd">${setDots(st)}<span class="wl-setn">${p.done ? IC.check : `${p.have}/${p.n}`}</span></span></span></button>`;
    };
    // the source-card sets get a heading of their own, after the album's sets
    const srcSets = sets.filter((st) => st.src);
    const chips = sets.filter((st) => !st.src).map(chip).join('')
      + (srcSets.length ? `<div class="wl-setsub">${IC_SCROLL}<b>מן המקורות</b><small>סדרות של קלפי מקור</small></div>${srcSets.map(chip).join('')}` : '');
    return `<div class="wl-setlayer"${setsOpen ? '' : ' hidden'}><div class="wl-setveil" data-wl="setsclose"></div>
      <div class="wl-sets paper" role="dialog" aria-label="סדרות"><div class="wl-setsh"><b>סדרות</b><small>${IC.pack}<span>אספו סדרה שלמה – וקבלו חבילת קלפים במתנה</span></small><span class="wl-sp"></span><span class="wl-setsn">שלמות: <b>${done}</b> מתוך <b>${sets.length}</b></span><button class="wl-btn" data-wl="setsclose">${icon('close')}סגירה</button></div>
      <div class="wl-setrow">${chips}</div></div></div>`;
  }
  function showSets(on) {
    setsOpen = !!on;
    const layer = main.querySelector('.wl-setlayer'); if (layer) layer.hidden = !setsOpen;
    const btn = main.querySelector('.wl-setsbtn'); if (btn) btn.setAttribute('aria-expanded', String(setsOpen));
  }
  function setInfoHTML(st) {
    const p = setProg(st), miss = p.n - p.have;
    return `<div class="wl-setinfo paper${p.done ? ' done' : ''}" style="--sc:${st.col}">
      <span class="wl-seti">${st.ic}</span>
      <div class="wl-sett"><b>${esc(st.name)}</b><span class="wl-setw">${SET_WHERE[st.where]}</span><p>${esc(st.sub)}</p></div>
      <span class="wl-setp"><b>${p.have}</b> מתוך <b>${p.n}</b></span>
      <span class="wl-setr">${IC.pack}<span>${p.done ? 'הסדרה שלמה – קיבלתם חבילה!' : `עוד ${miss === 1 ? 'קלף אחד' : miss + ' קלפים'} – וחבילה במתנה`}</span></span>
      <button class="wl-btn" data-wl="filter" data-v="all">${icon('album')}כל הקלפים</button></div>`;
  }
  // a heading row inside the card grid (the "הכול" page shows the album part by part)
  const ALBUM_PARTS = [['amazon', 'אמזונס', '#2f7a5a'], ['grove', 'חורש', '#9a7a2e'], ['reef', 'שונית', '#1f8ab0'], ['tech', 'טכנולוגיה', '#2c5f8f']];
  const inPart = (c, v) => (v === 'tech' ? c.type === 'tool' : c.biome === v);
  const secHTML = (title, have, n, col, sub = '', cls = '') => `<div class="wl-gsec${cls ? ' ' + cls : ''}" style="--gc:${col}"><b>${title}</b>${sub ? `<span class="wl-gsub">${sub}</span>` : ''}<small>${have} מתוך ${n}</small><i></i></div>`;
  function renderAlbum() {
    checkSets(); // also grants sets an older save already had complete (with the celebration)
    const { total, have } = collection();
    const frameCls = chosenFrame() !== 'none' ? 'fr-' + chosenFrame() : '';   // the frame the player chose with their badges
    if (filter === 'src' && !srcOn()) filter = 'all';
    const curSet0 = filter.startsWith('set:') ? SET_BY.get(filter.slice(4)) : null;
    const curSet = curSet0 && (!curSet0.torah || sourcesOn()) ? curSet0 : null;
    if (filter.startsWith('set:') && !curSet) filter = 'all';
    let n = 0;   // running index: the first cards rise in one after the other
    const cards = (arr) => arr.map((c) => { const i = n++, anim = i < 24 ? 'anim' : ''; return S.owned[c.id] ? cardHTML(c, { style: `--d:${i}`, cls: anim + (frameCls ? ' ' + frameCls : ''), count: S.owned[c.id] }) : cardHTML(c, { style: `--d:${i}`, cls: anim, locked: true }); }).join('');
    const own = srcOn() ? ownedSources() : {}, srcHave = SOURCE_CARDS.filter((c) => own[c.id]).length;
    const srcCards = (list = SOURCE_CARDS) => list.map((c) => sourceCardHTML(c, !!own[c.id], n++)).join('');
    // the source cards, set by set (SOURCE_SETS): a small heading for each set
    const srcBySets = () => SETS.filter((st) => st.src).map((st) => secHTML(esc(st.name), st.cards.filter((c) => own[c.id]).length, st.cards.length, st.col, esc(st.sub), 'sub') + srcCards(st.cards)).join('');
    let body;
    if (curSet) body = curSet.src ? srcCards(curSet.cards) : cards(curSet.cards);
    else if (filter === 'src') body = secHTML('קלפי מקור', srcHave, SOURCE_CARDS.length, '#b8892e', 'סיפורים ופסוקים על הבריאה') + srcBySets();
    else if (filter === 'all') {
      body = ALBUM_PARTS.map(([v, t, col]) => { const l = CARDS.filter((c) => inPart(c, v)); return secHTML(t, l.filter((c) => S.owned[c.id]).length, l.length, col) + cards(l); }).join('');
      if (srcOn()) body += secHTML('מן המקורות', srcHave, SOURCE_CARDS.length, '#b8892e', 'סיפורים ופסוקים על הבריאה') + srcBySets();
    } else body = cards(CARDS.filter((c) => inPart(c, filter)));
    const TAB_IC = { all: 'zones', amazon: 'amazon', grove: 'grove', reef: 'reef', tech: 'robot', src: 'scroll' };
    const tab = (v, t) => `<button class="wl-tab${filter === v ? ' sel' : ''}" data-wl="filter" data-v="${v}" aria-pressed="${filter === v}">${icon(TAB_IC[v])}${t}</button>`;
    const sets = activeSets(), setsDone = sets.filter((st) => setProg(st).done).length;
    const late = S.packs && !opensLeft();
    main.innerHTML = `<section class="wl-screen wl-album">
      <div class="wl-abar paper">
        <div class="wl-count" title="אספתם ${have} מתוך ${total} קלפים"><b><span class="wl-cw">אספתם </span>${have} <span class="wl-cof">מתוך</span> ${total}</b><div class="wl-meter"><i style="width:${Math.round((have / total) * 100)}%"></i></div></div>
        <div class="wl-tabs">${tab('all', 'הכול')}${tab('amazon', 'אמזונס')}${tab('grove', 'חורש')}${tab('reef', 'שונית')}${tab('tech', 'טכנולוגיה')}${srcOn() ? tab('src', 'מן המקורות') : ''}</div>
        <button class="wl-btn wl-setsbtn${curSet ? ' on' : ''}" data-wl="setsopen" aria-expanded="${setsOpen}" title="סדרות: אספו סדרה שלמה וקבלו חבילת קלפים במתנה">${icon('sets')}<span class="wl-bl">סדרות</span><span class="wl-setsc">${setsDone}/${sets.length}</span></button>
        <button class="wl-btn wl-legbtn" data-wl="legend" title="מה רואים על הקלף?" aria-label="מה רואים על הקלף?">${icon('help')}<span class="wl-bl">מה רואים על הקלף?</span></button>
        <span class="wl-sp"></span>
        <button class="wl-btn gold wl-packbtn" data-wl="pack" ${S.packs ? '' : 'disabled'} title="${late ? 'היום כבר פתחתם ' + OPEN_PER_DAY + ' חבילות. מחר אפשר לפתוח עוד' : 'פתחו חבילה. אפשר לפתוח עד ' + OPEN_PER_DAY + ' חבילות ביום'}" aria-label="${late ? 'עוד חבילות מחר' : 'פתחו חבילה'}">${icon('pack')}<span class="wl-bl">${late ? 'עוד חבילות מחר' : 'פתחו חבילה'}</span>${S.packs ? `<span class="wl-badgeN">${S.packs}</span>` : ''}</button>
        <button class="wl-btn go wl-duelbtn" data-wl="duel" ${have >= 3 ? '' : 'disabled'} title="${have >= 3 ? 'מי חזק ברשת?' : 'צריך לפחות 3 קלפים'}" aria-label="מי חזק ברשת?">${icon('strong')}<span class="wl-dlab">מי חזק ברשת?</span></button>
      </div>
      <div class="wl-abody">
        ${curSet ? setInfoHTML(curSet) : ''}
        <div class="wl-grid${curSet ? ' inset' : ''}">${body}</div>
        ${setsHTML()}
      </div>
    </section>`;
    fitBar();
    if (!S.packs && have < 3) toast(`${IC.quest}<span>שחקו בחידון כדי להרוויח חבילות קלפים</span>`);
  }
  // The album bar stays one row while it can: first the tab icons go, then the words of the buttons, then the tabs get
  // smaller; if that is still too wide, the tabs take a row of their own. Every tab stays in sight (Avi, 19.10: the
  // "טכנולוגיה" and "מן המקורות" tabs hid behind the sets button).
  function fitBar() {
    const bar = main.querySelector('.wl-abar'), tabs = bar && bar.querySelector('.wl-tabs'); if (!tabs) return;
    bar.classList.remove('t1', 't2', 't3', 'wrap');
    for (const c of ['t1', 't2', 't3', 'wrap']) {
      if (tabs.scrollWidth <= tabs.clientWidth + 1) return;
      bar.classList.add(c);
    }
  }
  let fitT = 0;
  const onResize = () => { clearTimeout(fitT); fitT = setTimeout(() => { if (open_ && screen === 'album') fitBar(); }, 80); };
  // torah edition: the album page of source cards ("מן המקורות")
  // where the subject of each painting sits (0 = top, 1 = bottom): the album card shows a wide strip of it
  const SRC_FOCUS = { lion: 0.42, tzvi: 0.42, small4: 0.55, ant: 0.6, rashbi: 0.45, choni: 0.42, spider: 0.5, lashevet: 0.45, tikva: 0.62, shnayim: 0.72, kfirim: 0.6, efes: 0.62, tzvaim: 0.64 };
  // a card that has no painting yet: a strip in the card's colour with its sign, so it sits well among the painted ones
  const srcNoArt = (c, own) => `<span class="wl-sart none"><i>${own ? (IC[c.icon] || IC_SCROLL) : IC_SCROLL}</i></span>`;
  function sourceCardHTML(c, own, i) {
    const art = TORAH ? SOURCE_ART[c.id] : '';
    return `<button class="wl-scard${own ? '' : ' locked'}${art || TORAH ? ' art' : ''}${i < 24 ? ' anim' : ''}" data-wl="szoom" data-s="${c.id}" style="--sc:${c.col};--d:${i}">
      ${art ? `<span class="wl-sart"><img src="${art}" alt="" draggable="false" style="object-position:50% ${((SRC_FOCUS[c.id] ?? 0.5) * 100).toFixed(0)}%"></span>` : TORAH ? srcNoArt(c, own) : ''}
      <span class="wl-sci">${own ? (IC[c.icon] || IC_SCROLL) : IC_SCROLL}</span>
      <b>${own ? esc(c.title) : 'קלף מקור'}</b><small>${own ? esc(c.ref) : esc(EARN_TEXT[c.earn] || '')}</small></button>`;
  }
  function szoom(id) {
    const c = SOURCE_CARDS.find((x) => x.id === id); if (!c) return;
    if (!ownedSources()[id]) { toast(`${IC.quest}<span>${esc(EARN_TEXT[c.earn] || 'את הקלף הזה עוד לא קיבלתם')}</span>`, 3200); return; }
    sfx('select');
    const paras = (t) => String(t || '').split('\n').map((x) => `<p>${esc(x)}</p>`).join('');
    const art = TORAH ? SOURCE_ART[c.id] : '';
    modal.innerHTML = `<div class="wl-scard big${art || TORAH ? ' art' : ''}" style="--sc:${c.col}">${art ? `<span class="wl-sart"><img src="${art}" alt="" draggable="false"></span>` : TORAH ? srcNoArt(c, true) : ''}<span class="wl-sci">${IC[c.icon] || IC_SCROLL}</span><b>${esc(c.title)}</b><small>${esc(c.ref)}</small></div>
      <div class="wl-mtext paper wl-smtext"><h3>${esc(c.title)}</h3>
        ${c.story ? `<div class="wl-sstory">${paras(c.story)}</div>` : ''}
        ${c.quote ? `<div class="wl-src"><p class="t">${esc(c.quote)}</p><small>${esc(c.ref)}</small></div>` : `<div class="wl-src"><small>${esc(c.ref)}</small></div>`}
        ${c.lesson ? `<p class="wl-slesson">${esc(c.lesson)}</p>` : ''}
        ${((st) => (st ? `<div class="wl-msets"><small>בסדרה:</small><button class="wl-mset${setProg(st).done ? ' done' : ''}" data-wl="set" data-v="${st.id}" style="--sc:${st.col}">${st.ic}<span>${esc(st.name)}</span><b>${setProg(st).done ? IC.check : setProg(st).have + '/' + setProg(st).n}</b></button></div>` : ''))(SETS.find((s) => s.src && s.cards.some((x) => x.id === c.id)))}
        <button class="wl-btn" data-wl="close">${icon('close')}סגירה</button></div>`;
    modal.hidden = false;
  }
  function zoom(id) {
    const c = CARD.get(id); if (!c) return;
    if (!S.owned[id]) { toast(`${IC.quest}<span>את הקלף הזה עוד לא מצאתם. פתחו חבילות!</span>`); return; }
    sfx('select');
    const pips = (v) => `<span class="wl-pips">${[1, 2, 3, 4, 5].map((k) => `<i class="${k <= v ? 'on' : ''}"></i>`).join('')}</span>`;
    modal.innerHTML = `${cardHTML(c)}
      <div class="wl-mtext paper"><h3>${esc(c.name)}</h3><p>${esc(c.fact)}</p>
        ${c.type === 'species' ? stampsHTML(c.sp.id, c.biome, { sources: TORAH && sourcesOn() }) : ''}
        <div class="wl-mrar r-${c.rarity}"><span class="wl-gems">${gems(c.rarity)}</span><span><b>${c.type === 'tool' ? 'כלי טכנולוגי' : RARITY_NAMES[c.rarity]}</b> – ${c.type === 'tool' ? RARITY_MORE.tech : `${c.rarity === 'common' ? 'יהלום נדירות אחד מתוך 3' : RARITY_GEMS[c.rarity] + ' מתוך 3 יהלומי נדירות'}. ${RARITY_MORE[c.rarity]}`}</span></div>
        ${powerHTML(c)}
        ${TORAH && sourcesOn() && SHIRA[id] ? `<div class="wl-src shira"><small>בפרק שירה</small><p class="t"><b>${esc(SHIRA[id].who)}:</b> ${esc(SHIRA[id].text)}</p><small>${esc(SHIRA[id].ref)}</small>${SHIRA[id].note ? `<p class="n">${esc(SHIRA[id].note)}</p>` : ''}</div>` : ''}
        <div class="wl-mstats">${(c.sk || KEYS_LAND).map((k) => `<span class="s-${k}">${STAT_ICON[k]} <b>${STAT_NAMES[k]}</b> – ${STAT_HELP[k]} ${pips(c.stats[k])}</span>`).join('')}</div>
        ${setsOf(id).length ? `<div class="wl-msets"><small>בסדרה:</small>${setsOf(id).map((st) => { const p = setProg(st); return `<button class="wl-mset${p.done ? ' done' : ''}" data-wl="set" data-v="${st.id}" style="--sc:${st.col}">${st.ic}<span>${esc(st.name)}</span><b>${p.done ? IC.check : p.have + '/' + p.n}</b></button>`; }).join('')}</div>` : ''}
        <button class="wl-btn" data-wl="close">${icon('close')}סגירה</button></div>`;
    modal.hidden = false;
  }
  // what a rare / very rare card can do in "מחזיקים את היער" (agreeing with the species)
  function powerHTML(c) {
    if (c.type !== 'species' || (c.rarity !== 'epic' && c.rarity !== 'rare')) return '';
    const id = c.sp.id, it = gw(id, 'אותו', 'אותה', 'אותם', 'אותן');
    const txt = c.rarity === 'epic'
      ? `<b>מין מפתח:</b> הרבה יצורים צריכים ${it}. במשחק "מחזיקים את היער" ${gw(id, 'הוא שומר', 'היא שומרת', 'הם שומרים', 'הן שומרות')} על היער פעם אחת, כשהיער לא מוכן לאירוע.`
      : `<b>בונוס קטן:</b> במשחק "מחזיקים את היער", אם ${gw(id, 'הוא מתחבר', 'היא מתחברת', 'הם מתחברים', 'הן מתחברות')} בחוט זהב כשמניחים ${it} – עוד <bdi dir="ltr">+1</bdi> חִיּוּת.`;
    return `<div class="wl-mpow r-${c.rarity}"><span class="wl-powi">${c.rarity === 'epic' ? IC_KEY : '+1'}</span><span>${txt}</span></div>`;
  }
  // "מה רואים על הקלף?" – one big example card with numbered markers + a numbered legend
  function cardLegend() {
    const c = CARDS.find((x) => x.rarity === 'rare' && x.art && x.type === 'species' && x.name.length <= 9) || CARDS[0];
    sfx('select');
    const dia = (n) => `<span class="wl-lgems">${[0, 1, 2].map((k) => `<span class="wl-gem${k < n ? ' on' : ''}">${IC_GEM}</span>`).join('')}</span>`;
    const items = [
      ['name', 'השם', 'איזה יצור זה.'],
      ['badge', 'איפה הוא גר', '<b class="wl-badge b-amazon">אמזונס</b> <b class="wl-badge b-grove">חורש</b> <b class="wl-badge b-reef">שונית</b> – יער הגשם, החורש שלנו או שונית האלמוגים של אילת. <b class="wl-badge b-tech">טכנולוגיה</b> – כלי שעוזר לשמור על הטבע.'],
      ['kind', 'מה הוא', 'עץ, שיח, פרח, בעל חיים, פטרייה...'],
      ['gems', 'יהלומי נדירות', `כמה קשה למצוא את הקלף בחבילות: <span class="wl-lr c">${dia(1)} נפוץ</span><span class="wl-lr r">${dia(2)} נדיר</span><span class="wl-lr e">${dia(3)} נדיר מאוד</span><span class="wl-lr t"><span class="wl-gems">${gems('tech')}</span> כלי טכנולוגי</span>`],
      ['x-power', 'נדירות במשחק', `<span class="wl-lp e"><b>נדיר מאוד = מין מפתח.</b> כוח מיוחד במשחק "מחזיקים את היער": שומר על היער פעם אחת.</span><span class="wl-lp r"><b>נדיר:</b> בונוס קטן – עוד <bdi dir="ltr">+1</bdi> חִיּוּת.</span>`],
      ['stats', 'שלושה מספרים', `${STAT_ICON.light} <b>אור</b> – כמה אור הוא צריך. ${STAT_ICON.water} <b>מים</b> – כמה מים ולחות (בקלפי השונית במקומם ${STAT_ICON.shelter} <b>מחסה</b> – כמה בית הוא נותן לאחרים). ${STAT_ICON.links} <b>קשרים</b> – עם כמה יצורים יש לו קשר ברשת. מ-1 עד 5.`],
      ['fact', 'הידעת?', 'משפט קצר ומעניין על היצור.'],
      ['rar', 'נדירות במילים', 'גם צבע המסגרת מספר: ירוק – נפוץ, זהב – נדיר, אדום-סגול – נדיר מאוד, כחול – טכנולוגיה.'],
    ];
    // numbered items point at a part of the card; "x-" items are extra notes (an icon, no number)
    let num = 0; const nums = items.map(([k]) => (k.startsWith('x-') ? 0 : ++num));
    modal.innerHTML = `<div class="wl-lgcard">${cardHTML(c)}${items.map(([k], i) => (nums[i] ? `<span class="wl-lgpin" data-k="${k}">${nums[i]}</span>` : '')).join('')}</div>
      <div class="wl-mtext wl-legend paper"><h3>מה רואים על הקלף?</h3>
        <ol>${items.map(([k, t, x], i) => `<li data-k="${k}"${nums[i] ? '' : ' class="wl-lgx"'}><span class="wl-lgn">${nums[i] || IC_KEY}</span><div><b>${t}</b><p>${x}</p></div></li>`).join('')}</ol>
        <button class="wl-btn go" data-wl="close">${icon('check')}הבנתי</button></div>`;
    modal.hidden = false;
    // pin each number next to its part of the card (offsets ignore the pop-in scale animation)
    const box = modal.querySelector('.wl-lgcard'), card = box.querySelector('.wl-card');
    const SEL = { name: '.wl-cname', badge: '.wl-badge', kind: '.wl-ctype > span', gems: '.wl-gems', stats: '.wl-stats', fact: '.wl-cfact', rar: '.wl-crar' };
    const place = () => {
      const W = card.offsetWidth;
      box.querySelectorAll('.wl-lgpin').forEach((pin) => {
        const t = card.querySelector(SEL[pin.dataset.k]); if (!t) return;
        let y = 0, e = t; while (e && e !== card) { y += e.offsetTop; e = e.offsetParent; }
        const right = ['name', 'kind', 'fact'].includes(pin.dataset.k); // RTL: these start at the right edge
        pin.style.top = (card.offsetTop + y + t.offsetHeight / 2) + 'px';
        pin.style.left = (card.offsetLeft + (right ? W + 2 : -2)) + 'px'; // on the frame, next to the part it names
      });
    };
    place(); requestAnimationFrame(place);
  }
  function closeModal() { modal.hidden = true; modal.innerHTML = ''; }

  /* ── pack opening */
  let P = null;
  function rollPack() {
    const W = { common: 6, rare: 3.2, tech: 3, epic: 1.5 };
    const res = [];
    for (let i = 0; i < 3; i++) {
      const missing = CARDS.filter((c) => !S.owned[c.id] && !res.includes(c));
      const pool = (missing.length && Math.random() < 0.75 ? missing : CARDS).filter((c) => !res.includes(c));
      let sum = pool.reduce((s, c) => s + W[c.rarity], 0), r = Math.random() * sum, got = pool[pool.length - 1];
      for (const c of pool) { r -= W[c.rarity]; if (r <= 0) { got = c; break; } }
      res.push(got);
    }
    return res;
  }
  const RAR_ORDER = { common: 0, tech: 1, rare: 2, epic: 3 };
  const RAR_CONF = { common: ['#8fd067', '#5fae4a', '#b7e08e', '#e9e6cc'], tech: ['#8cc3dc', '#4aa3d6', '#dbeaf0', '#b9e0f5'],
    rare: ['#f6cf72', '#e09a2c', '#fff1c4', '#f2cf5b'], epic: ['#f6cf72', '#e79aab', '#b9a8e0', '#8cc3dc', '#fff1c4'] };
  const RAR_SAY = { rare: 'קלף נדיר!', epic: 'נדיר מאוד!', tech: 'טכנולוגיה!' };
  const SEAL_CRACKS = '<svg class="wl-pcrk" viewBox="0 0 40 40" aria-hidden="true"><path class="c1" d="M20 3l-2 8 4 5-3 7"/><path class="c2" d="M5 23l7-2 4 4 8-2 6 5"/><path class="c3" d="M34 9l-6 6 2 6-6 9 2 7"/></svg>';
  const openedToday = () => (S.opened && S.opened.d === todayKey() ? S.opened.n : 0);
  const opensLeft = () => Math.max(0, OPEN_PER_DAY - openedToday());
  function renderPack() {
    P = { stage: 'closed', taps: 0, cards: null, fresh: null, up: 0 };
    if (!S.packs) { go('album'); return; }
    if (!opensLeft()) {
      main.innerHTML = `<section class="wl-screen wl-packs"><div><h2 class="wl-ptitle">החבילות מחכות למחר</h2>
        <p class="wl-psub">היום כבר פתחתם ${OPEN_PER_DAY} חבילות. ${S.packs === 1 ? 'החבילה שלכם שמורה' : `${S.packs} החבילות שלכם שמורות`}, ומחר תוכלו לפתוח עוד ${OPEN_PER_DAY}.</p></div>
        <div class="wl-stage v2"><div class="wl-rays"></div><span class="wl-pk-wait">${IC.pack}</span></div>
        <div class="wl-row"><button class="wl-btn go" data-wl="album">${icon('album')} לאלבום</button><button class="wl-btn" data-wl="duel">${icon('strong')} מי חזק ברשת?</button></div></section>`;
      return;
    }
    main.innerHTML = `<section class="wl-screen wl-packs">
      <div><h2 class="wl-ptitle">חבילת קלפים</h2><p class="wl-psub">לחצו על החבילה כדי לפתוח אותה</p></div>
      <div class="wl-stage v2"><div class="wl-rays"></div>
        <button class="wl-pack v2" data-wl="tear" aria-label="פתיחת החבילה" style="--tear:${PACK_ART.tear * 100}%">
          <span class="wl-pk3"><span class="wl-pk-beam"></span>
            <span class="wl-pk-body" style="background-image:url('${PACK_ART.body}');-webkit-mask-image:url('${PACK_ART.body}');mask-image:url('${PACK_ART.body}')"><span class="wl-pk-sheen"></span></span>
            <span class="wl-pk-strip" style="background-image:url('${PACK_ART.strip}');-webkit-mask-image:url('${PACK_ART.strip}');mask-image:url('${PACK_ART.strip}')"><span class="wl-pk-sheen"></span></span>
            <span class="wl-pk-tear" style="top:${PACK_ART.tear * 100}%"></span></span></button></div>
      <div class="wl-row wl-pafter" style="visibility:hidden"></div></section>`;
    // the foil bag leans toward the pointer
    const pk = $('.wl-pack.v2'), p3 = pk && pk.querySelector('.wl-pk3'), st = $('.wl-stage');
    if (p3 && !reduced()) {
      st.addEventListener('pointermove', (e) => {
        if (!P || P.stage !== 'closed') return;
        const r = pk.getBoundingClientRect();
        const x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / r.width)), y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / r.height));
        p3.style.setProperty('--ry', (x * 16).toFixed(1) + 'deg'); p3.style.setProperty('--rx', (-y * 12).toFixed(1) + 'deg');
      });
      st.addEventListener('pointerleave', () => { p3.style.setProperty('--ry', '0deg'); p3.style.setProperty('--rx', '0deg'); });
    }
  }
  // one tap starts the whole sequence: crack, crack again, then the pack opens
  function tearPack() {
    if (!P || P.stage !== 'closed' || !S.packs || !opensLeft()) return;
    P.stage = 'cracking';
    const pack = $('.wl-pack'); pack.disabled = true;
    // the cards are drawn now, so the light leaking from the seam already tells how special the best one is
    P.pre = rollPack();
    const best = P.pre.reduce((b, c) => (RAR_ORDER[c.rarity] > RAR_ORDER[b] ? c.rarity : b), 'common');
    pack.style.setProperty('--rc', { common: '170,224,130', tech: '140,200,236', rare: '255,214,110', epic: '240,150,200' }[best]);
    const p3 = pack.querySelector('.wl-pk3'); if (p3) { p3.style.setProperty('--ry', '0deg'); p3.style.setProperty('--rx', '0deg'); }
    $('.wl-psub').textContent = 'פותחים...';
    const crack = (n) => {
      pack.classList.remove('hit'); void pack.offsetWidth; pack.classList.add('hit', 'crk' + n);
      pack.style.setProperty('--glow', String(n / 3)); sfx('pickup');
    };
    if (reduced()) { crack(3); openPack(); return; }
    crack(1); later(() => crack(2), 520); later(() => crack(3), 1000); later(openPack, 1300);
  }
  function openPack() {
    P.stage = 'opening'; S.packs--; S.opened = { d: todayKey(), n: openedToday() + 1 };
    // weakest first, so the most special card waits at the end of the row
    const cards = (P.pre || rollPack()).sort((a, b) => RAR_ORDER[a.rarity] - RAR_ORDER[b.rarity]);
    const fresh = cards.map((c) => !S.owned[c.id]);
    cards.forEach((c) => { S.owned[c.id] = (S.owned[c.id] || 0) + 1; });
    save(); updateChip(true);
    P.cards = cards; P.fresh = fresh;
    const pack = $('.wl-pack'), stage = $('.wl-stage');
    pack.classList.add('open'); sfx('pop');
    $('.wl-psub').textContent = 'נפתח...';
    later(() => {
      stage.classList.add('lit'); sfx('discover');
      stage.insertAdjacentHTML('beforeend', '<div class="wl-flash"></div>');
      stage.insertAdjacentHTML('beforeend', cards.map((c, i) => flipHTML(c, { cls: `k${i} h-${c.rarity}`, isNew: fresh[i] })
        .replace('<div class="wl-flip', `<div data-wl="reveal" data-k="${i}" role="button" tabindex="0" aria-label="הפיכת קלף" class="wl-flip`)).join(''));
      const flips = [...stage.querySelectorAll('.wl-flip')];
      requestAnimationFrame(() => requestAnimationFrame(() => flips.forEach((f, i) => later(() => f.classList.add('rise'), i * 110))));
      later(() => pack.classList.add('gone'), 500);
      later(() => {
        flips.forEach((f) => f.classList.add('out')); sfx('select');
        P.stage = 'reveal';
        $('.wl-ptitle').textContent = 'מה יצא לכם?';
        $('.wl-psub').textContent = 'הקישו על כל קלף כדי להפוך אותו';
        const after = $('.wl-pafter'); after.style.visibility = 'visible';
        after.innerHTML = `<button class="wl-btn" data-wl="revealall">${IC.cards} הפכו את כולם</button>`;
      }, 1250);
    }, 520);
  }
  function revealCard(t, quick) {
    if (!P || P.stage !== 'reveal' || !t) return;
    const f = t.closest('.wl-flip'); if (!f || f.classList.contains('is-up') || f.classList.contains('tease')) return;
    const k = +f.dataset.k, c = P.cards[k];
    const flip = () => {
      f.classList.remove('tease'); f.classList.add('is-up');
      sfx(c.rarity === 'epic' ? 'mission' : c.rarity === 'rare' ? 'event' : c.rarity === 'tech' ? 'discover' : 'select');
      f.insertAdjacentHTML('afterbegin', `<span class="wl-burst b-${c.rarity}"></span>${RAR_SAY[c.rarity] ? `<span class="wl-rsay s-${c.rarity}">${RAR_SAY[c.rarity]}</span>` : ''}`);
      const n = { common: 10, tech: 14, rare: 20, epic: 34 }[c.rarity];
      later(() => confetti(f, P.fresh[k] ? n : Math.ceil(n / 2), RAR_CONF[c.rarity]), 330);
      if (++P.up === 3) later(finishPack, 900);
    };
    if (!quick && !reduced() && (c.rarity === 'rare' || c.rarity === 'epic')) {
      f.classList.add('tease'); sfx('pickup'); later(flip, c.rarity === 'epic' ? 950 : 600);
    } else flip();
  }
  function revealAll() {
    if (!P || P.stage !== 'reveal') return;
    const after = $('.wl-pafter'); if (after) after.style.visibility = 'hidden';
    [...main.querySelectorAll('.wl-stage .wl-flip:not(.is-up):not(.tease)')].forEach((f, i) => later(() => revealCard(f, true), i * 380));
  }
  function finishPack() {
    if (!P || P.stage === 'done') return;
    P.stage = 'done';
    const sets = checkSets();
    const nNew = P.fresh.filter(Boolean).length;
    $('.wl-ptitle').textContent = nNew ? (nNew === 1 ? 'קלף חדש באלבום!' : `${nNew} קלפים חדשים באלבום!`) : 'הקלפים כבר באלבום – עכשיו יש לכם עוד עותק';
    $('.wl-psub').textContent = `אספתם ${collection().have} מתוך ${collection().total}` + (sets.length ? ` · השלמתם סדרה: ${sets.map((st) => st.name).join(', ')} – חבילה במתנה!` : '');
    const after = $('.wl-pafter'); after.style.visibility = 'visible';
    after.innerHTML = `${S.packs && opensLeft() ? `<button class="wl-btn gold" data-wl="pack">${icon('pack')} עוד חבילה <span class="wl-badgeN">${S.packs}</span></button>` : S.packs ? `<span class="wl-dhint">${IC.pack} עוד חבילות מחכות למחר</span>` : ''}
      <button class="wl-btn go" data-wl="album">${icon('album')} לאלבום</button>`;
  }

  /* ── duel: מי חזק ברשת? */
  let D = null;
  const STATS = ['light', 'water', 'shelter', 'links'];
  const hasStat = (c, k) => c.stats[k] != null;
  // a round asks about a number both sides can play: מים only for land cards, מחסה only for reef cards
  function pickStat(avoid) {
    const ok = (k) => D.hand.some((h) => !h.used && hasStat(h.c, k)) && D.cpu.some((h) => !h.used && hasStat(h.c, k));
    let list = STATS.filter(ok);
    if (!list.length) { D.hand.forEach((h) => { h.used = false; }); list = STATS.filter(ok); }
    if (!list.length) list = ['light', 'links'];   // every card has these two
    if (avoid && list.length > 1 && Math.random() < 0.6) list = list.filter((k) => k !== avoid);
    // מים and מחסה share one turn of the wheel, so אור and קשרים come up as often as before
    const w = list.map((k) => (k === 'water' || k === 'shelter' ? 0.5 : 1));
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < list.length; i++) { r -= w[i]; if (r <= 0) return list[i]; }
    return list[list.length - 1];
  }
  function startDuel() {
    const owned = CARDS.filter((c) => S.owned[c.id]);
    if (owned.length < 3) { go('album'); return; }
    D = { hand: sample(owned, Math.min(5, owned.length)).map((c) => ({ c, used: false })), cpu: sample(CARDS, 5).map((c) => ({ c, used: false })),
      round: 0, me: 0, him: 0, res: [], stat: 'light', phase: 'pick', mine: null, his: null };
    D.stat = pickStat();
    renderDuel();
  }
  function renderDuel() {
    const statLine = `${STAT_ICON[D.stat]} הסבב הזה: ${STAT_NAMES[D.stat]}`;
    const slot = (who, card, up) => card ? flipHTML(card, { up, hl: D.phase === 'show' ? D.stat : null }) : `<div class="wl-empty">${who === 'me' ? 'בחרו קלף מלמטה' : 'המחשב מחכה'}</div>`;
    const winMe = D.phase === 'show' && D.last === 'w', winHim = D.phase === 'show' && D.last === 'l';
    main.innerHTML = `<section class="wl-screen wl-duel">
      <div class="wl-dhead paper">
        <div class="wl-score"><span>אתם</span><b>${D.me}</b><span>:</span><b>${D.him}</b><span>המחשב</span></div>
        <div class="wl-rounds">${[0, 1, 2, 3, 4].map((k) => `<i class="${D.res[k] || (k === D.round && !D.done ? 'c' : '')}"></i>`).join('')}</div>
        <span class="wl-dstat">${statLine}</span>
      </div>
      <p class="wl-dhelp">${IC.sun} אור – כמה אור צריך · ${IC.drop} מים – כמה מים ולחות · ${STAT_ICON.shelter} מחסה – כמה בית נותן (בשונית) · ${IC.web} קשרים. המספר הגבוה מנצח!</p>
      <div class="wl-arena">
        <div class="wl-slot me${winMe ? ' win' : ''}"><small>הקלף שלכם</small>${slot('me', D.mine, true)}</div>
        <span class="wl-vs">מול</span>
        <div class="wl-slot cpu${winHim ? ' win' : ''}"><small>הקלף של המחשב</small>${slot('cpu', D.his, D.phase === 'show')}</div>
      </div>
      <div class="wl-dbar">${D.msg ? `<div class="wl-dmsg paper">${D.msg}</div>` : D.phase === 'pick' ? `<span class="wl-dhint">${IC.cards} בחרו קלף מהיד שלכם – מי חזק יותר ב${STAT_NAMES[D.stat]}?</span>` : ''}</div>
      <div class="wl-hand${D.phase !== 'pick' ? ' locked' : ''}">${D.hand.map((h, i) => cardHTML(h.c, { cls: h.used ? 'used' : !hasStat(h.c, D.stat) ? 'used off' : '', style: `--d:${i}` }).replace('class="wl-card', `data-wl="play" data-k="${i}" class="wl-card`)).join('')}</div>
    </section>`;
  }
  function playCard(k) {
    if (!D || D.phase !== 'pick') return;
    const h = D.hand[k]; if (!h || h.used || !hasStat(h.c, D.stat)) return;
    played('duel');
    sfx('place');
    h.used = true; D.mine = h.c; D.phase = 'wait';
    let left = D.cpu.filter((x) => !x.used && hasStat(x.c, D.stat));
    if (!left.length) left = D.cpu.filter((x) => hasStat(x.c, D.stat));
    const choice = Math.random() < 0.5 ? left.slice().sort((a, b) => b.c.stats[D.stat] - a.c.stats[D.stat])[0] : pick(left);
    choice.used = true; D.his = choice.c; D.msg = '';
    renderDuel();
    later(() => {
      D.phase = 'show';
      const a = D.mine.stats[D.stat], b = D.his.stats[D.stat];
      D.last = a > b ? 'w' : a < b ? 'l' : 't';
      if (D.last === 'w') D.me++; else if (D.last === 'l') D.him++;
      D.res[D.round] = D.last;
      D.done = D.me >= 3 || D.him >= 3 || D.round >= 4;
      const txt = D.last === 'w' ? `ניצחתם בסבב! ${a} מול ${b}` : D.last === 'l' ? `המחשב לקח את הסבב: ${b} מול ${a}` : `תיקו! ${a} מול ${b}`;
      D.msg = `<span>${txt}</span><button class="wl-btn ${D.done ? 'gold' : 'go'}" data-wl="dnext">${D.done ? 'לתוצאה' : 'לסבב הבא'} ${IC.next}</button>`;
      renderDuel();
      // the cpu card was rendered face-down → flip it up on the next frame
      const f = main.querySelector('.wl-slot.cpu .wl-flip'); if (f) { f.classList.remove('is-up'); requestAnimationFrame(() => requestAnimationFrame(() => f.classList.add('is-up'))); }
      sfx(D.last === 'w' ? 'quizRight' : D.last === 'l' ? 'quizWrong' : 'click');
      if (D.last === 'w') later(() => confetti(main.querySelector('.wl-slot.me')), 300);
    }, 650);
  }
  function duelNext() {
    if (!D || D.phase !== 'show') return;
    sfx('click');
    if (D.done) return duelEnd();
    D.round++; D.phase = 'pick'; D.mine = D.his = null; D.msg = '';
    if (D.hand.every((h) => h.used)) D.hand.forEach((h) => { h.used = false; });
    D.stat = pickStat(D.stat);
    renderDuel();
  }
  function duelEnd() {
    const win = D.me > D.him, tie = D.me === D.him;
    // at most DUEL_PACKS_PER_DAY packs a day from duels (tracked by local date in the saved state)
    let gotPack = false;
    if (win) {
      S.duelsWon = (S.duelsWon || 0) + 1;
      const today = todayKey();
      if (!S.duelPacks || S.duelPacks.d !== today) S.duelPacks = { d: today, n: 0 };
      if (S.duelPacks.n < DUEL_PACKS_PER_DAY) { S.duelPacks.n++; S.packs++; gotPack = true; }
      save(); updateChip(gotPack);
    }
    main.innerHTML = `<section class="wl-screen"><div class="wl-end paper">
      <div class="wl-stars">${[0, 1, 2].map((k) => `<span class="${k < (win ? 3 : tie ? 2 : 1) ? 'on' : ''}" style="animation-delay:${0.15 + k * 0.22}s">${IC.star}</span>`).join('')}</div>
      <h2>${win ? 'ניצחתם!' : tie ? 'תיקו!' : 'הפעם המחשב ניצח'}</h2>
      <p>אתם <b>${D.me}</b> · המחשב <b>${D.him}</b></p>
      ${win ? (gotPack ? `<span class="wl-gotpack">${IC.pack} קיבלתם חבילת קלפים!</span>` : '<p>היום כבר קיבלתם את כל חבילות הקלפים מהמשחק הזה. מחר יהיו עוד!<br>אפשר להמשיך לשחק בשביל הכיף, או להרוויח חבילות בחידון.</p>') : '<p>נסו שוב – כל קלף חזק במשהו אחר.</p>'}
      <div class="wl-row"><button class="wl-btn go" data-wl="duel">${icon('again')}שחקו שוב</button><button class="wl-btn" data-wl="album">${icon('album')} לאלבום</button></div>
    </div></section>`;
    sfx(win ? 'mission' : 'click');
    if (win) later(() => confetti($('.wl-stars'), 30), 500);
  }

  /* ── events */
  const ACT = {
    back, close: closeModal, home: () => { sfx('click'); go('home'); }, setup: () => { sfx('click'); go('setup'); },
    album: () => { sfx('click'); go('album'); }, packs: () => { sfx('click'); go(S.packs ? 'pack' : 'album'); },
    pick: (t) => { QS[t.dataset.g] = t.dataset.v; sfx('select'); renderSetup(); },
    start: () => { sfx('click'); go('quiz'); }, again: () => { sfx('click'); go('quiz', { level: Q && Q.level, biome: Q && Q.biome }); },
    ans: (t) => answer(+t.dataset.k), next: nextQ,
    filter: (t) => { filter = t.dataset.v; setsOpen = false; sfx('click'); renderAlbum(); },
    setsopen: () => { sfx('click'); showSets(!setsOpen); }, setsclose: () => { sfx('click'); showSets(false); },
    set: (t) => { const v = 'set:' + t.dataset.v; const fromZoom = !modal.hidden; closeModal(); setsOpen = false; filter = filter === v && !fromZoom ? 'all' : v; sfx('select'); if (screen === 'album') renderAlbum(); else go('album'); },
    pack: () => { sfx('click'); go('pack'); }, tear: tearPack, reveal: (t) => revealCard(t), revealall: revealAll, legend: () => cardLegend(),
    game: (t) => { sfx('click'); go(t.dataset.g); },
    szoom: (t) => szoom(t.dataset.s),
    // the switch in the settings: the screen below follows it (a game in play is left alone, the source game closes)
    srctoggle: () => {
      setSourcesOn(!sourcesOn()); sfx('click');
      if (!sourcesOn() && (filter === 'src' || (filter.startsWith('set:') && SET_BY.get(filter.slice(4))?.torah))) filter = 'all';
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
    if (e.target === modal) { closeModal(); return; }
    const c = e.target.closest('.wl-grid .wl-card'); if (c) zoom(c.dataset.cid);
  });
  // keep the game underneath from reacting to input while the hub is open
  for (const ev of ['pointerdown', 'pointerup', 'pointermove', 'wheel', 'contextmenu', 'mousedown', 'touchstart']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: ev !== 'contextmenu' });
  const onKey = (e) => {
    if (!open_) return;
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); back(); }
    else if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.matches && e.target.matches('[data-wl][role=button]')) { e.preventDefault(); e.target.click(); }
  };

  // something opened or was used (מסע החוקר): repaint the screens that show locks (a game in play is left alone)
  // (only when a lock really changed: a part marked as used must not make the screen rise in again)
  let journeyT = 0, lockSig = '';
  const HUB_PARTS = ['album', 'quiz', 'webpuzzle', 'keepforest', 'badges', 'frames', 'inventors', 'expedition', 'duel', 'versematch'];
  const sigNow = () => HUB_PARTS.map((p) => (locked(p) ? 0 : 1)).join('');
  function onJourney() {
    clearTimeout(journeyT);
    journeyT = setTimeout(() => {
      if (!open_) return;
      const sg = sigNow(); if (sg === lockSig) return; lockSig = sg;
      if (!modal.hidden) return;
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
    window.addEventListener('wol-journey', onJourney);
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
    window.removeEventListener('wol-journey', onJourney);
    sfx('click');
    try { onClose && onClose(); } catch (e) { console.warn(e); }
  }
  const api = { open, close, isOpen: () => open_, grantPack, go: (name, opts) => { if (!open_) open(); returnTo = opts && opts.from === 'lab' ? name : null; go(name, opts); } };
  try {
    window.__wolLearn = {
      ...api,
      _go: (name, opts) => { if (!open_) open(); go(name, { force: true, ...(opts || {}) }); return screen; },
      _locks: () => [...el.querySelectorAll('.is-veiled[data-part]')].map((x) => x.dataset.part),
      _answer: (right = true) => { if (!Q) return; const k = Q.qs[Q.i].options.findIndex((o) => !!o.ok === !!right); answer(k < 0 ? 0 : k); },
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
