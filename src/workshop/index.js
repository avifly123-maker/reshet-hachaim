// הסדנה של ניצוץ (1.4.4 sets 3–4, docs/PLAN-1.4.4.md): the inventors' workshop, a whole world in the science centre
// (Avi, 4.11), where children learn to think like inventors while they play. Avi, 5.11: "a computer game, not
// homework": every place is a drawn machine with light motion (src/workshop/art.js, workshop.css), not a list of words.
// ניצוץ, an enthusiastic light bulb, leads it; his light is the meter of the child's creative thinking (progress.js).
// Seven places in one room:
//   machine (מכונת הרעיונות), mixer (מערבל הטבע), cards (קלפי אילוץ)            set 3, here
//   build (שולחן הבנייה), test (אולם הבדיקות)                                  set 4, bench.js (3D: proto3d.js)
//   orders (הזמנות עבודה), patent (משרד הפטנטים) and the fair                  set 4, office.js
//   const S = createWorkshop({ root, audio, kids: () => bool, onExit })   S.open(); S.close(); S.isOpen()
// Debug and tests: window.__wsDebug = { state(), go(place), thing(id), lever(id), rate(r), spin(cardId?, problemId?),
//   trait(t), draw(cardId), endRound(), order(id), proto(spec), runTests(list) }
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createNitzotz } from './nitzotz.js';
import { THINGS, LEVERS, CATS, thingOf, leverOf } from '../data/workshop/ideas.js';
import { PROBLEMS, problemOf } from '../data/workshop/mixer.js';
import { CONSTRAINTS, constraintOf } from '../data/workshop/constraints.js';
import { NATURE_CARDS } from '../data/workshop/nature-cards.js';
import { orderOf } from '../data/workshop/orders.js';
import { TRIALS, TRAIT } from '../data/inventions.js';
import { TRAIT_K } from '../data/inventions-kids.js';
import { CARD_ART } from '../data/card-art.js';
import { ZONE_LOOK } from '../data/zones.js';
import { readWs, addIdea, rateLast, roundDone, measures, earned, crazyBox } from './progress.js';
import { thingSVG, stationSVG, machineSVG, blenderSVG, catIcon, clockSVG } from './art.js';
import { WS_ART } from '../data/workshop-art.js';
import { createBench } from './bench.js';
import { createOffice } from './office.js';
import { createRoom3d, roomReady, prepareSmallPano } from './room3d.js';
import { introSeen } from '../core/journey.js';
import { grant } from '../core/badges-store.js';
import { K, readPlayer } from '../core/storage.js';
import { svcGuide } from '../core/services.js';
import { icon } from '../ui/ui/icons.js';
import { esc } from '../ui/ui/helpers.js';
import { nzRoomTutorial, nzMachineTutorial, nzMixerTutorial, nzCardsTutorial, nzBuildTutorial, nzTestTutorial, nzOrdersTutorial } from '../ui/tutorials.js';

const PLACES = [
  { id: 'machine', n: 'מכונת הרעיונות', k: 'מְכוֹנַת הָרַעְיוֹנוֹת' },
  { id: 'mixer', n: 'מערבל הטבע', k: 'מְעַרְבֵּל הַטֶּבַע' },
  { id: 'cards', n: 'קלפי אילוץ', k: 'קַלְפֵי אִלּוּץ' },
  { id: 'orders', n: 'הזמנות עבודה', k: 'הַזְמָנוֹת עֲבוֹדָה' },
  { id: 'build', n: 'שולחן הבנייה', k: 'שֻׁלְחַן הַבְּנִיָּה' },
  { id: 'test', n: 'אולם הבדיקות', k: 'אוּלַם הַבְּדִיקוֹת' },
  { id: 'patent', n: 'משרד הפטנטים', k: 'מִשְׂרַד הַפָּטֶנְטִים' },
];
// התנסות בשיטות חשיבה (5.11, Avi: present the measures as thinking methods a child tries, not as grades)
const MEASURES = [
  { id: 'fluency', n: 'הרבה רעיונות', k: 'הַרְבֵּה רַעְיוֹנוֹת', d: 'לחשוב על הרבה רעיונות בלי לעצור' },
  { id: 'flexibility', n: 'מכמה כיוונים', k: 'מִכַּמָּה כִּוּוּנִים', d: 'רעיונות מסוגים שונים' },
  { id: 'originality', n: 'רעיון מפתיע', k: 'רַעְיוֹן מַפְתִּיעַ', d: 'שילוב שעוד לא ניסיתם' },
  { id: 'elaboration', n: 'משפרים גרסה', k: 'מְשַׁפְּרִים', d: 'גרסה חדשה שטובה בבירור מהקודמת' },
  { id: 'simplify', n: 'מפשטים', k: 'מְפַשְּׁטִים', d: 'פחות חלקים, והוא עדיין עובד' },
  { id: 'constraint', n: 'עם אילוץ', k: 'עִם כְּלָל', d: 'עמדתם בקלף אילוץ' },
];
const RATE = [['works', 'עובד!', 'עוֹבֵד!'], ['funny', 'מצחיק', 'מַצְחִיק'], ['improve', 'שווה לשפר', 'שָׁוֶה לְשַׁפֵּר']];
const LEVER_IC = { grow: 'M4 20h4M4 20v-4M20 4h-4M20 4v4M5 19l5-5M19 5l-5 5', shrink: 'M10 14H6M10 14v4M14 10h4M14 10V6M10 14l-5 5M14 10l5-5',
  flip: 'M7 7h10l-3-3M17 17H7l3 3', join: 'M8 12a4 4 0 1 1 0 .1M16 12a4 4 0 1 1 0 .1', remove: 'M5 12h14', material: 'M4 16c3-6 5-6 8 0s5 6 8 0',
  reuse: 'M5 12a7 7 0 0 1 12-5l2 2M19 12a7 7 0 0 1-12 5l-2-2', nature: 'M6 18c0-8 5-12 12-12 0 7-4 12-12 12zM6 18l6-6' };
const lvIcon = (id) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${LEVER_IC[id] || ''}"/></svg>`;
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function createWorkshop({ root, audio = null, kids: kidsOpt = false, onExit = null } = {}) {
  let kids = false;   // read again at every opening: the player or the level may have changed (kidsOpt may be a function)
  const T = (o) => (kids ? (o.k || o.f || o.n) : (o.f || o.n));
  const W = (f, k) => (kids ? k : f);
  const el = document.createElement('div'); el.className = 'ws'; el.hidden = true; el.dir = 'rtl';
  if (WS_ART.wall) el.style.setProperty('--wsbg', `url(${WS_ART.wall})`);
  root.appendChild(el);
  let tutPlace = null;   // the place whose tutorial runs (leaving it mid-way stops it; it comes back next time)
  let open_ = false, place = 'room', thing = null, last = null, mix = null, round = null, roundT = 0, mine = false, tut = null, spinning = 0, hand = [], orderId = null;
  const roundLog = [];   // test results during a build round
  const sfx = (n) => { try { audio && audio.play && audio.play(n); } catch (e) { } };

  // ── ניצוץ in 3D: one small renderer for his window; quality-aware, at most 30 frames a second, nothing when hidden
  let nz = null, renderer = null, scene = null, cam = null, raf = 0, lastT = 0, lastDraw = 0;
  function startNz() {
    const cv = el.querySelector('.ws-nz'); if (!cv || nz) return;
    const Q = (() => { try { return (window.__app && window.__app.quality) || 'medium'; } catch (e) { return 'medium'; } })();
    const weak = Q === 'min' || Q === 'low';
    try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: !weak, alpha: true }); } catch (e) { return; }
    renderer.setPixelRatio(Math.min(weak ? 1 : 1.5, window.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.35;   // Avi 5.11: a little brighter, so his glass shows over the dark box
    scene = new THREE.Scene();
    try { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.85; pm.dispose(); } catch (e) { }
    scene.add(new THREE.HemisphereLight('#fff4e0', '#7a6a5a', 1.6)); const sun = new THREE.DirectionalLight('#fff0d0', 2.6); sun.position.set(-2, 3, 3); scene.add(sun);
    cam = new THREE.PerspectiveCamera(30, 1, 0.05, 20); cam.position.set(0.2, 0.55, 2.7); cam.lookAt(0, 0.48, 0);
    nz = createNitzotz({ sparks: !weak }); scene.add(nz.object);
    lastT = performance.now(); raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    if (!open_) return; raf = requestAnimationFrame(frame);
    tickRound();
    const cv = renderer && renderer.domElement; if (!cv || cv.offsetParent === null || document.hidden) { lastT = now; return; }
    if (now - lastDraw < 33) return; lastDraw = now;
    const dt = Math.min(0.06, (now - lastT) / 1000); lastT = now;
    const r = cv.getBoundingClientRect(), w = Math.max(60, r.width | 0), h = Math.max(60, r.height | 0);
    if (cv.width !== Math.round(w * renderer.getPixelRatio()) || cv.height !== Math.round(h * renderer.getPixelRatio())) { renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    nz.update(dt); renderer.render(scene, cam);
  }
  function stopNz() {
    cancelAnimationFrame(raf); raf = 0;
    if (nz) { nz.dispose(); nz = null; }
    if (scene && scene.environment) scene.environment.dispose();
    if (renderer) { renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) { } renderer = null; }
    scene = null;
  }
  const act = (x) => { if (nz) nz.set(x); if (room3) room3.act(x); };

  // ── his words: a bubble of the guide, his portrait and face (written only)
  const say = (key, opts = {}) => {
    if (tut && tut.step) return;
    const g = svcGuide(); const L = g && g.lines(key); if (!L || !L.length) return;
    g.tip(L[Math.floor(Math.random() * L.length)], { speaker: 'nitzotz', ms: 3800, ...opts });
  };
  function after() { for (const e of earned()) grant(e); paintBoard(); }

  // the set 4 places
  const ctx = { kids: () => kids, T, W, say, act, sfx, after, go: (p) => go(p), order: () => (orderId ? orderOf(orderId) : null), setOrder: (id) => { orderId = id; bench.resetRun(); },
    onTests: (results, proto) => { if (round && round.card.at === 'build') { roundLog.push(...results.map((r) => ({ ...r, proto }))); roundCheck(); } },
    onPatent: (order, proto, sc, name) => { const pic = benchPic(); const P = office.ceremony(order, proto, sc, name, pic); void P; showCeremony(); } };
  const bench = createBench(ctx), office = createOffice(ctx);
  const benchPic = () => bench.pic(96);   // drawn in the same frame as the snapshot (a WebGL canvas keeps nothing between frames)
  function showCeremony() { const M = el.querySelector('.ws-main'); const d = document.createElement('div'); d.innerHTML = office.ceremonyHTML(); M.appendChild(d.firstElementChild); }

  // ── the screens
  function shell() {
    el.innerHTML = `<header class="ws-top"><button type="button" class="ws-back" data-wsexit>${icon('home')}<span>${W('יציאה', 'יְצִיאָה')}</span></button>
        <div class="ws-title"><h1>${W('הסדנה של ניצוץ', 'הַסַּדְנָה שֶׁל נִיצוֹץ')}</h1><p>${W('חושבים כמו ממציאים', 'חוֹשְׁבִים כְּמוֹ מַמְצִיאִים')}</p></div>
        <span class="ws-where"></span>
        <button type="button" class="ws-room-btn" data-wsroom hidden>${icon('arrowR')}<span>${W('לסדנה', 'לַסַּדְנָה')}</span></button></header>
      <div class="ws-body"><aside class="ws-side"><div class="ws-nzbox"><canvas class="ws-nz" aria-hidden="true"></canvas></div><div class="ws-board"></div><div class="ws-roundbar" hidden></div></aside>
        <main class="ws-main"></main></div>`;
  }
  function paintBoard() {
    const b = el.querySelector('.ws-board'); if (!b) return;
    const m = measures();
    b.innerHTML = `<h3>${W('התנסות בשיטות חשיבה', 'שִׁיטוֹת חֲשִׁיבָה')}</h3>${MEASURES.map((x) => `<div class="ws-meter" data-m="${x.id}" title="${esc(x.d)}"><span>${esc(kids ? x.k : x.n)}</span><i><u style="width:${Math.round(m.level[x.id] * 100)}%"></u></i><b>${m[x.id]}</b></div>`).join('')}
      <button type="button" class="ws-crazy" data-wscrazy>${icon('sparkle')}${W('תיבת השיגעונות', 'תֵּבַת הַשִּׁגְעוֹנוֹת')} <b>${crazyBox().length}</b></button>`;
    const lamp = el.querySelector('.ws-nzbox'); if (lamp) lamp.style.setProperty('--glow', String(0.25 + m.glow * 0.75));
  }
  function go(p) {
    if (tut && tut.step && tutPlace !== 'room' && tutPlace !== p) { tut.stop(); tut = null; }
    if (place === 'build' || place === 'test') { if (p !== 'build' && p !== 'test') bench.leave(); }
    if (room3 && p !== 'room') { room3.dispose(); room3 = null; }
    place = p; if (p !== 'mixer') mix = null;
    el.dataset.place = p;
    if (p !== 'room' && open_ && !nz) startNz();
    el.querySelector('[data-wsroom]').hidden = p === 'room';
    const P = PLACES.find((x) => x.id === p) || (p === 'fair' ? { n: 'יריד הממציאים', k: 'יְרִיד הַמַּמְצִיאִים' } : null);
    el.querySelector('.ws-where').textContent = P ? (kids ? P.k : P.n) : '';
    const M = el.querySelector('.ws-main');
    M.dataset.place = p;
    if (p === 'room') roomView(M);
    else if (p === 'machine') M.innerHTML = machineHTML();
    else if (p === 'mixer') M.innerHTML = mixerHTML();
    else if (p === 'cards') { hand = shuffle(cardsFor().slice()).slice(0, 5); M.innerHTML = cardsHTML(); }
    else if (p === 'build') bench.build(M);
    else if (p === 'test') bench.test(M);
    else if (p === 'orders') office.orders(M);
    else if (p === 'patent') office.patents(M);
    else if (p === 'fair') office.fair(M);
    startTut();
  }
  // the room: the Blender room to look around in, with ניצוץ flying to the chosen place (room3d.js); the flat room of drawn
  // machines stays as the fallback (no WebGL, no picture)
  let room3 = null;
  function roomBadges() {
    const S = readWs(), done = Object.values(S.orders).filter((x) => x.done).length;
    return { orders: done ? `${done}` : '', patent: S.patents.length ? `${S.patents.length}` : '', cards: Object.keys(S.rounds).length ? `${Object.keys(S.rounds).length}` : '', machine: S.n.ideas ? `${S.n.ideas}` : '' };
  }
  function roomView(M) {
    if (room3) { room3.dispose(); room3 = null; }
    if (roomReady()) {
      const Q = (() => { try { return (window.__app && window.__app.quality) || 'medium'; } catch (e) { return 'medium'; } })();
      const names = Object.fromEntries(PLACES.map((P) => [P.id, kids ? P.k : P.n]));
      room3 = createRoom3d(M, { kids, names, counts: roomBadges(), quality: Q, onPick: (id) => { if (open_ && place === 'room') { sfx('click'); go(id); } } });
      if (room3) { el.classList.add('room3'); if (!introSeen('g:nztut')) room3.face('machine'); return; }
    }
    el.classList.remove('room3'); M.innerHTML = roomHTML();
  }
  function roomHTML() {
    const badge = roomBadges();
    return `<div class="ws-room"><div class="ws-wall" aria-hidden="true"></div>
      <div class="ws-floor">${PLACES.map((P, i) => `<button type="button" class="ws-st st${i}" data-st="${P.id}">${stationSVG(P.id)}<b class="ws-plaque">${esc(kids ? P.k : P.n)}</b>${badge[P.id] ? `<em class="ws-count">${badge[P.id]}</em>` : ''}</button>`).join('')}</div></div>`;
  }
  // ── the idea machine
  const leversNow = () => LEVERS.filter((l) => (!kids || l.kids) && (!round || !round.card.levers || round.card.levers.includes(l.id)));
  function machineHTML(pulled = null) {
    const t = thing && thingOf(thing), L = leversNow();
    const outH = last ? `<div class="wm-out cat-${last.cat}${last.fun ? ' fun' : ''}"><span class="wm-cat">${catIcon(last.cat)}<small>${esc(kids ? CATS[last.cat].k : CATS[last.cat].n)}</small></span><p>${esc(T(last))}</p>${last.fun ? '<i class="wm-burst" aria-hidden="true"></i>' : ''}</div>`
      : `<div class="wm-out empty"><p>${esc(t ? W('עכשיו מושכים בידית!', 'עַכְשָׁו מוֹשְׁכִים בַּיָּדִית!') : W('בחרו חפץ מהמדף, והוא ייפול למכונה', 'בַּחֲרוּ חֵפֶץ מֵהַמַּדָּף'))}</p></div>`;
    const rateH = last ? `<div class="wm-rate">${RATE.map(([r, f, k]) => `<button type="button" data-wsrate="${r}" class="st-${r}${last.r === r ? ' on' : ''}">${esc(W(f, k))}</button>`).join('')}${last.r === 'works' && !kids ? `<button type="button" class="wm-tobuild" data-wstobuild>${icon('arrowL')} ${W('לבנות את זה!', 'לִבְנוֹת!')}</button>` : ''}</div>` : '<div class="wm-rate"></div>';
    return `<div class="wm"><div class="wm-shelf wm-things">${THINGS.map((x) => `<button type="button" data-wsthing="${x.id}" class="${thing === x.id ? 'on' : ''}">${thingSVG(x.id)}<small>${esc(kids ? x.k : x.n)}</small></button>`).join('')}</div>
      <div class="wm-stage"><div class="wm-machine${t ? ' fed' : ''}${pulled ? ' run' : ''}">${machineSVG(thing)}</div>${outH}</div>
      <div class="wm-levers">${LEVERS.filter((l) => !kids || l.kids).map((l) => { const ok = L.includes(l) && !!t; return `<button type="button" data-wslever="${l.id}" class="${pulled === l.id ? 'pulled' : ''}" ${ok ? '' : 'disabled'}><i class="lv-stick" aria-hidden="true"><u></u></i>${lvIcon(l.id)}<span>${esc(kids ? l.k : l.n)}</span></button>`; }).join('')}</div>
      ${rateH}</div>`;
  }
  function pull(lv) {
    const t = thingOf(thing), L = leverOf(lv); if (!t || !L || !leversNow().includes(L)) return;
    const out = t.out[lv]; if (!out) return;
    const r = addIdea({ at: 'machine', th: t.id, lv, cat: out.cat, fun: !!out.fun });
    last = { ...out, r: '', lv };
    sfx('pop'); act(r.orig >= 2 ? 'idea' : out.fun ? 'excited' : 'explain');
    el.querySelector('.ws-main').innerHTML = machineHTML(lv);
    after(); roundCheck();
  }
  function rate(r) {
    if (!last) return; last.r = r; rateLast(r);
    sfx(r === 'works' ? 'good' : 'click');
    act(r === 'works' ? 'cheer' : r === 'funny' ? (Math.random() < 0.35 ? 'fuse' : 'excited') : 'hint');
    say('nz:react:' + r);
    el.querySelector('.ws-main').innerHTML = machineHTML();
    after(); roundCheck();
  }
  // ── the nature mixer
  function owned() { try { const S = readPlayer(K.cards, {}) || {}; return new Set(Object.keys(S.owned || {}).map((k) => k.split(':').pop())); } catch (e) { return new Set(); } }
  function mixerHTML() {
    const C = mix && NATURE_CARDS.find((c) => c.id === mix.sp), P = mix && problemOf(mix.pb);
    const traits = C ? C.tr.slice(0, 4) : [];
    const res = mix && mix.fit ? `<div class="wx-res fit-${mix.fit}"><b>${esc(mix.fit === 'good' ? W('עובד!', 'עוֹבֵד!') : mix.fit === 'ok' ? W('עוזר קצת', 'עוֹזֵר קְצָת') : W('רעיון פרוע!', 'רַעְיוֹן פָּרוּעַ!'))}</b><p>${esc(mixWords(mix))}</p></div>` : '';
    return `<div class="wx"><div class="wx-row">
        <div class="wx-drum cards${spinning ? ' spin' : ''}"><div class="wx-win">${C ? `${CARD_ART[C.id] ? `<img src="${CARD_ART[C.id]}" alt="">` : ''}<b>${esc(kids ? C.k : C.n)}</b><small>${esc(ZONE_LOOK[C.z] ? (kids ? ZONE_LOOK[C.z].shortK : ZONE_LOOK[C.z].short) : '')}</small>` : `<i class="wx-q">?</i><small>${W('יצור מהטבע', 'יְצוּר')}</small>`}</div></div>
        <div class="wx-mid${spinning ? ' spin' : ''}">${blenderSVG()}</div>
        <div class="wx-drum probs${spinning ? ' spin' : ''}"><div class="wx-win">${P ? `<span class="wx-pic">${catIcon(P.cat)}</span><b>${esc(T(P))}</b>` : `<i class="wx-q">?</i><small>${W('בעיה מהעולם', 'בְּעָיָה')}</small>`}</div></div></div>
      <div class="wx-act"><button type="button" class="wx-spin" data-wsspin>${icon('undo')}<span>${W('לסובב!', 'לְסוֹבֵב!')}</span></button>
        <label class="wx-mine"><input type="checkbox" data-wsmine ${mine ? 'checked' : ''}> ${W('רק מהקלפים שלי', 'רַק מֵהַקְּלָפִים שֶׁלִּי')}</label></div>
      ${C && !mix.fit && !spinning ? `<div class="wx-traits"><p>${W('איזו תכונה שלו תפתור את הבעיה?', 'אֵיזוֹ תְּכוּנָה תַּעֲזֹר?')}</p>${traits.map((t) => `<button type="button" data-wstrait="${t}">${esc(kids ? (TRAIT_K[t] || TRAIT[t]) : TRAIT[t])}</button>`).join('')}</div>` : ''}
      ${res}</div>`;
  }
  function mixWords(m) {
    const C = NATURE_CARDS.find((c) => c.id === m.sp), P = problemOf(m.pb), tr = kids ? (TRAIT_K[m.tr] || TRAIT[m.tr]) : TRAIT[m.tr];
    const nm = kids ? C.k : C.n;
    if (m.fit === 'good') return W(`"${tr}" של ${nm} באמת עוזר ${P.f}.`, `"${tr}" שֶׁל ${nm} עוֹזֵר!`);
    if (m.fit === 'ok') return W(`"${tr}" של ${nm} יעזור קצת. אולי יש תכונה טובה עוד יותר?`, `אוּלַי תְּכוּנָה אַחֶרֶת?`);
    return W(`"${tr}" של ${nm}? זה לא מה שהטבע עושה כאן, אבל אף אחד לא חשב על זה!`, `אַף אֶחָד לֹא חָשַׁב עַל זֶה!`);
  }
  function spin(spId, pbId) {
    const mineSet = mine ? owned() : null;
    const pool = NATURE_CARDS.filter((c) => !mineSet || mineSet.has(c.id));
    const list = pool.length ? pool : NATURE_CARDS;
    const P = (pbId && problemOf(pbId)) || PROBLEMS[Math.floor(Math.random() * PROBLEMS.length)];
    // most spins give a creature that can really help (beginners more often), the rest are wild pairs
    const TL = TRIALS.find((x) => x.id === P.trial), helps = (c) => c.tr.some((t) => TL.good.includes(t) || TL.ok.includes(t));
    const rich = list.filter((c) => c.tr.length >= 2), base = rich.length ? rich : list;   // a choice of traits to think about
    const fit = base.filter(helps), from = fit.length && Math.random() < (kids ? 0.85 : 0.7) ? fit : base;
    const C = (spId && NATURE_CARDS.find((c) => c.id === spId)) || from[Math.floor(Math.random() * from.length)];
    mix = { sp: C.id, pb: P.id, fit: null, mine: !!(mineSet && mineSet.has(C.id)) };
    spinning = 1; sfx('click'); act('excited');
    const M = el.querySelector('.ws-main'); M.innerHTML = mixerHTML();
    // the drums roll through paintings and problems before they stop
    const winC = M.querySelector('.wx-drum.cards .wx-win'), winP = M.querySelector('.wx-drum.probs .wx-win');
    let n = 0; const roll = setInterval(() => {
      if (!winC || place !== 'mixer') { clearInterval(roll); return; }
      const c = NATURE_CARDS[(Math.random() * NATURE_CARDS.length) | 0], p = PROBLEMS[(Math.random() * PROBLEMS.length) | 0];
      winC.innerHTML = CARD_ART[c.id] ? `<img src="${CARD_ART[c.id]}" alt=""><b>${esc(kids ? c.k : c.n)}</b>` : `<b>${esc(c.n)}</b>`;
      winP.innerHTML = `<span class="wx-pic">${catIcon(p.cat)}</span><b>${esc(T(p))}</b>`;
      if (++n > 7) clearInterval(roll);
    }, 90);
    setTimeout(() => { clearInterval(roll); spinning = 0; if (place === 'mixer') { el.querySelector('.ws-main').innerHTML = mixerHTML(); sfx('pop'); } }, 820);
  }
  function pickTrait(tr) {
    if (!mix || mix.fit) return;
    const C = NATURE_CARDS.find((c) => c.id === mix.sp), P = problemOf(mix.pb), TL = TRIALS.find((x) => x.id === P.trial);
    mix.tr = tr; mix.fit = TL.good.includes(tr) ? 'good' : TL.ok.includes(tr) ? 'ok' : 'wild';
    addIdea({ at: 'mixer', sp: C.id, pb: P.id, tr, cat: P.cat, fit: mix.fit, zone: C.z, mine: mix.mine });
    sfx(mix.fit === 'good' ? 'good' : 'pop'); act(mix.fit === 'good' ? 'cheer' : mix.fit === 'ok' ? 'hint' : 'idea');
    say('nz:react:' + mix.fit);
    el.querySelector('.ws-main').innerHTML = mixerHTML();
    after(); roundCheck();
  }
  // ── constraint cards: a table with a deck and a hand
  const cardsFor = () => CONSTRAINTS.filter((c) => !kids || (c.k && !c.adv));
  const AT = { machine: ['מכונת הרעיונות', 'מְכוֹנָה'], mixer: ['מערבל הטבע', 'מְעַרְבֵּל'], build: ['שולחן הבנייה', 'בְּנִיָּה'] };
  function cardFace(c, i, R) {
    const r = R[c.id], sec = (kids && c.ksec) || c.sec;
    return `<button type="button" class="wc-card at-${c.at}${r ? ' done' : ''}" data-wscard="${c.id}" style="--i:${i};--y:${Math.abs(i - 2) * 6}px"><span class="wc-top">${clockSVG()}<small>${Math.round(sec / 6) / 10} ${W('דק׳', 'דַּק׳')}</small></span>
      <span class="wc-pic">${stationSVG(c.at)}</span><b>${esc(kids ? c.k : c.f)}</b><span class="wc-at">${esc(W(AT[c.at][0], AT[c.at][1]))}</span>${r ? `<em class="wc-rec">${W('שיא', 'שִׂיא')} ${Math.ceil(r.best / 1000)} ${W('שנ׳', 'שְׁנ׳')}</em>` : ''}</button>`;
  }
  function cardsHTML() {
    const R = readWs().rounds;
    const won = cardsFor().filter((c) => R[c.id]);
    return `<div class="wc"><div class="wc-table"><button type="button" class="wc-deck wc-draw" data-wsdraw><i></i><i></i><i></i><span>${W('לשלוף קלף', 'לִשְׁלֹף קְלָף')}</span></button>
        <div class="wc-hand">${hand.map((c, i) => cardFace(c, i, R)).join('')}</div></div>
      <div class="wc-foot"><button type="button" class="wc-shuffle" data-wsshuffle>${icon('undo')} ${W('לערבב', 'לְעַרְבֵּב')}</button>
        <span class="wc-won">${W('ניצחתם', 'נִצַּחְתֶּם')} <b>${won.length}</b> / ${cardsFor().length}</span><small>${W('השיא הוא רק מול עצמכם', 'הַשִּׂיא רַק מוּל עַצְמְכֶם')}</small></div></div>`;
  }
  function draw(id) {
    const list = cardsFor(); const c = (id && constraintOf(id)) || list[Math.floor(Math.random() * list.length)]; if (!c) return;
    round = { card: c, goal: (kids && c.kgoal) || c.goal, sec: (kids && c.ksec) || c.sec, t0: Date.now(), done: false };
    roundT = 0; roundLog.length = 0; sfx('pop'); act('excited');
    paintRound(); go(c.at);
  }
  function roundProgress() {
    if (!round) return { have: 0, need: 1 };
    const G = round.goal, ideas = readWs().ideas.filter((x) => x.t >= round.t0);
    const mach = ideas.filter((x) => x.at === 'machine'), mixr = ideas.filter((x) => x.at === 'mixer');
    const works = mixr.filter((x) => x.fit === 'good' || x.fit === 'ok');
    if (G.pass) {
      const ok = roundLog.filter((r) => r.pass && (!G.test || r.id === G.test) && (!G.noMetal || r.proto.mat !== 'metal') && (G.maxAdd == null || r.proto.add.length <= G.maxAdd) && (!G.nature || r.proto.add.some((a) => /^(spines|scales|suction|bigears|honeycomb|shell|softwing|ribs|widefoot|airtunnels|sharkskin|fogcatch|glow|reflect|uvglow|buzz)$/.test(a))));
      return { have: new Set(ok.map((r) => r.id)).size, need: G.pass };
    }
    if (G.ideas) return { have: mach.length, need: G.ideas };
    if (G.cats) return { have: new Set(mach.map((x) => x.cat)).size, need: G.cats };
    if (G.cat) return { have: mach.filter((x) => x.cat === G.cat).length, need: G.n };
    if (G.works) return { have: mach.filter((x) => x.r === 'works').length, need: G.works };
    if (G.funny) return { have: mach.filter((x) => x.r === 'funny').length, need: G.funny };
    if (G.improve) return { have: mach.filter((x) => x.r === 'improve').length, need: G.improve };
    if (G.thing) { const c = {}; for (const x of mach) c[x.th] = (c[x.th] || 0) + 1; return { have: Math.max(0, ...Object.values(c)), need: G.thing }; }
    if (G.things) return { have: new Set(mach.map((x) => x.th)).size, need: G.things };
    if (G.allLevers) return { have: new Set(mach.map((x) => x.lv)).size, need: LEVERS.length };
    if (G.mixWorks) return { have: works.length, need: G.mixWorks };
    if (G.mixWild) return { have: mixr.filter((x) => x.fit === 'wild').length, need: G.mixWild };
    if (G.mixZones) return { have: new Set(works.map((x) => x.zone)).size, need: G.mixZones };
    if (G.mixMine) return { have: works.filter((x) => x.mine).length, need: G.mixMine };
    return { have: 0, need: 1 };
  }
  function paintRound() {
    const b = el.querySelector('.ws-roundbar'); if (!b) return;
    if (!round) { b.hidden = true; return; }
    const p = roundProgress(), left = Math.max(0, round.sec - (Date.now() - round.t0) / 1000);
    b.hidden = false;
    b.style.setProperty('--left', String(left / round.sec));
    b.innerHTML = `<b>${esc(kids ? round.card.k : round.card.f)}</b><span class="ws-clock${left < 15 ? ' low' : ''}">${clockSVG()}${Math.ceil(left)}</span><span class="ws-prog">${Array.from({ length: Math.min(8, p.need) }, (_, i) => `<i class="${i < p.have ? 'on' : ''}"></i>`).join('')}${p.need > 8 ? ` ${Math.min(p.have, p.need)}/${p.need}` : ''}</span><button type="button" data-wsstop>${W('לעצור', 'לַעֲצֹר')}</button>`;
  }
  function roundCheck() {
    if (!round || round.done) return;
    const p = roundProgress();
    paintRound();
    if (p.have >= p.need) {
      round.done = true;
      const r = roundDone(round.card.id, Date.now() - round.t0);
      sfx('quizRight'); act('cheer'); say(r.record && !r.first ? 'nz:react:record' : 'nz:react:roundwin', { ms: 4500 });
      const b = el.querySelector('.ws-roundbar'); if (b) b.classList.add('won');
      setTimeout(() => { round = null; paintRound(); after(); if (el.querySelector('.ws-roundbar')) el.querySelector('.ws-roundbar').classList.remove('won'); if (place !== 'cards') go('cards'); }, 1600);
    }
  }
  function tickRound() {
    if (!round || round.done) return;
    roundT++; if (roundT % 10) return;   // a few times a second
    if ((Date.now() - round.t0) / 1000 >= round.sec) { round.done = true; act('bored'); say('nz:react:roundlose'); setTimeout(() => { round = null; paintRound(); if (nz) nz.set('happy'); go('cards'); }, 1400); return; }
    paintRound();
  }
  function showCrazy() {
    const list = crazyBox().slice(-12).reverse();
    const M = el.querySelector('.ws-main');
    M.innerHTML = `<div class="ws-box"><h3>${icon('sparkle')} ${W('תיבת השיגעונות', 'תֵּבַת הַשִּׁגְעוֹנוֹת')}</h3>${list.length ? `<div class="ws-boxgrid">${list.map((x) => { const t = x.at === 'machine' && thingOf(x.th); const o = t && t.out[x.lv]; return o ? `<div class="wm-out fun"><span class="wm-cat">${thingSVG(t.id)}</span><p>${esc(T(o))}</p></div>` : ''; }).join('')}</div>` : `<p>${W('עוד ריק. כל רעיון שתסמנו "מצחיק" נכנס לכאן.', 'עוֹד רֵיק.')}</p>`}</div>`;
    M.dataset.place = 'box'; place = 'box'; el.querySelector('[data-wsroom]').hidden = false;
  }

  // ── clicks
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    const d = b.dataset;
    if (d.wsexit != null) { close(); if (onExit) onExit(); return; }
    if (d.wsroom != null) { sfx('click'); go('room'); return; }
    if (d.st) { sfx('click'); go(d.st); return; }
    if (d.wsthing) { thing = d.wsthing; last = null; sfx('click'); act('hint'); el.querySelector('.ws-main').innerHTML = machineHTML(); return; }
    if (d.wslever) { pull(d.wslever); return; }
    if (d.wsrate) { rate(d.wsrate); return; }
    if (d.wstobuild != null) { orderId = null; sfx('click'); go('build'); return; }
    if (d.wsspin != null) { spin(); return; }
    if (d.wstrait) { pickTrait(d.wstrait); return; }
    if (d.wsdraw != null) { draw(); return; }
    if (d.wscard) { draw(d.wscard); return; }
    if (d.wsshuffle != null) { sfx('click'); hand = shuffle(cardsFor().slice()).slice(0, 5); el.querySelector('.ws-main').innerHTML = cardsHTML(); return; }
    if (d.wsstop != null) { round = null; paintRound(); go('cards'); return; }
    if (d.wscrazy != null) { sfx('click'); showCrazy(); return; }
    if (bench.click(b)) return;
    if (office.click(b)) return;
  });
  el.addEventListener('change', (e) => { if (e.target.matches('[data-wsmine]')) { mine = e.target.checked; } });

  // ── the tutorials: the room on the first visit, each place on its first visit (the standing rule of 29.10)
  function startTut() {
    if (tut && tut.step) return;
    const g = svcGuide(); if (!g) return;
    const ws = { state, face: (id) => { if (room3) room3.face(id); } }, onDone = (r) => { tut = null; if (open_ && r !== 'abort' && r !== 'skip') startTut(); };
    const F = { room: nzRoomTutorial, machine: nzMachineTutorial, mixer: nzMixerTutorial, cards: nzCardsTutorial, build: nzBuildTutorial, test: nzTestTutorial, orders: nzOrdersTutorial }[place];
    tut = F ? F({ guide: g, ws, onDone }) : null; tutPlace = tut ? place : null;
  }
  function state() {
    const w = readWs();
    return { place, thing, last: last && { cat: last.cat, r: last.r, lv: last.lv }, mix: mix && { ...mix }, round: round && { id: round.card.id, ...roundProgress(), done: round.done }, ideas: w.n.ideas, measures: measures(w), tut: tut && tut.step, nz: nz ? { mood: nz.mood, action: nz.action, light: nz.light } : room3 ? { room: true } : null,
      order: orderId, bench: bench.state(), office: office.state(), patents: w.patents.length, hand: hand.map((c) => c.id) };
  }

  function openWs() {
    kids = typeof kidsOpt === 'function' ? !!kidsOpt() : !!kidsOpt;
    open_ = true; el.hidden = false; place = 'room'; thing = null; last = null; mix = null; round = null; orderId = null;
    el.classList.toggle('kids', kids);
    try { const Q = window.__app && window.__app.quality; if (Q === 'min' || Q === 'low') prepareSmallPano(); } catch (e) { }
    shell(); paintBoard(); go('room'); if (!room3) startNz();   // in the 3D room ניצוץ lives in the room: his side window starts when the child leaves it
    setTimeout(() => { if (open_ && nz) nz.set('wave'); }, 600);
  }
  function close() {
    if (!open_) return; open_ = false;
    if (tut && tut.stop) tut.stop(); tut = null;
    bench.leave(); if (room3) { room3.dispose(); room3 = null; } stopNz(); el.hidden = true; el.innerHTML = '';
  }
  try {
    window.__wsDebug = { state, go: (p) => go(p), thing: (id) => { thing = id; last = null; if (place === 'machine') el.querySelector('.ws-main').innerHTML = machineHTML(); }, lever: (id) => pull(id), rate: (r) => rate(r),
      spin: (sp, pb) => spin(sp, pb), trait: (t) => pickTrait(t), draw: (id) => draw(id), endRound: () => { if (round) round.t0 = Date.now() - round.sec * 1000 - 1; }, nz: (x) => act(x),
      order: (id) => { orderId = id; bench.resetRun(); }, proto: (p) => bench.setProto(p), runTests: (list) => bench.run(list),
      face: (id) => { if (room3) room3.face(id); return !!room3; }, room: () => (room3 ? room3.state() : null) };
  } catch (e) { }
  return { open: openWs, close, isOpen: () => open_, state };
}
