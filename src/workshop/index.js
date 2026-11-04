// הסדנה של ניצוץ (1.4.4 sets 3–4, docs/PLAN-1.4.4.md): the inventors' workshop, a whole world in the science centre
// (Avi, 4.11), where children learn to think like inventors while they play. ניצוץ, an enthusiastic light bulb, leads
// it; his light is the meter of the child's creative thinking (fluency, flexibility, originality, elaboration:
// progress.js). Seven places in one room; set 3 opens three of them:
//   machine (מכונת הרעיונות: a thing and a lever give an invention), mixer (מערבל הטבע: a creature's trait for a
//   problem), cards (קלפי אילוץ: a short round with a constraint and a clock, with a personal record).
// The other four (the build table, the test hall, the clients' orders, the patent office and the fair) come in set 4.
//   const S = createWorkshop({ root, audio, kids: () => bool, onExit })   S.open(); S.close(); S.isOpen()
// Debug and tests: window.__wsDebug = { state(), go(place), thing(id), lever(id), rate(r), spin(cardId?, problemId?), trait(t), draw(cardId), endRound() }
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createNitzotz } from './nitzotz.js';
import { THINGS, LEVERS, CATS, thingOf, leverOf } from '../data/workshop/ideas.js';
import { PROBLEMS, problemOf } from '../data/workshop/mixer.js';
import { CONSTRAINTS, constraintOf } from '../data/workshop/constraints.js';
import { NATURE_CARDS } from '../data/workshop/nature-cards.js';
import { TRIALS, TRAIT } from '../data/inventions.js';
import { TRAIT_K } from '../data/inventions-kids.js';
import { CARD_ART } from '../data/card-art.js';
import { ZONE_LOOK } from '../data/zones.js';
import { readWs, addIdea, rateLast, roundDone, measures, earned, crazyBox } from './progress.js';
import { grant } from '../core/badges-store.js';
import { K, readPlayer } from '../core/storage.js';
import { svcGuide } from '../core/services.js';
import { icon } from '../ui/ui/icons.js';
import { esc } from '../ui/ui/helpers.js';
import { nzRoomTutorial, nzMachineTutorial, nzMixerTutorial, nzCardsTutorial } from '../ui/tutorials.js';

const PLACES = [
  { id: 'machine', n: 'מכונת הרעיונות', k: 'מְכוֹנַת הָרַעְיוֹנוֹת', d: 'שמים חפץ, מושכים בידית, ויוצאת המצאה', kd: 'שָׂמִים חֵפֶץ, מוֹשְׁכִים בַּיָּדִית!', ic: 'bulb' },
  { id: 'mixer', n: 'מערבל הטבע', k: 'מְעַרְבֵּל הַטֶּבַע', d: 'יצור מהטבע מול בעיה מהעולם', kd: 'יְצוּר מוּל בְּעָיָה', ic: 'leaf' },
  { id: 'cards', n: 'קלפי אילוץ', k: 'קַלְפֵי אִלּוּץ', d: 'אתגר בזק עם שעון ושיא אישי', kd: 'אֶתְגָּר קָצָר עִם שָׁעוֹן', ic: 'cards' },
  { id: 'build', n: 'שולחן הבנייה', k: 'שֻׁלְחַן הַבְּנִיָּה', d: 'בונים אב טיפוס מחלקים', soon: true, ic: 'gear' },
  { id: 'test', n: 'אולם הבדיקות', k: 'אוּלַם הַבְּדִיקוֹת', d: 'מנהרת רוח, מגדל נפילה ועוד', soon: true, ic: 'flask' },
  { id: 'orders', n: 'הזמנות עבודה', k: 'הַזְמָנוֹת עֲבוֹדָה', d: 'לקוחות מהטבע ומהעולם', soon: true, ic: 'book' },
  { id: 'patent', n: 'משרד הפטנטים', k: 'מִשְׂרַד הַפָּטֶנְטִים', d: 'תעודות, ויריד הממציאים', soon: true, ic: 'sparkle' },
];
const MEASURES = [
  { id: 'fluency', n: 'שטף', k: 'כַּמָּה רַעְיוֹנוֹת', d: 'כמה רעיונות' },
  { id: 'flexibility', n: 'גמישות', k: 'כַּמָּה סוּגִים', d: 'מכמה סוגים' },
  { id: 'originality', n: 'מקוריות', k: 'רַעְיוֹנוֹת חֲדָשִׁים', d: 'כמה חדשים ומפתיעים' },
  { id: 'elaboration', n: 'שיפור', k: 'שִׁפּוּרִים', d: 'כמה שיפרתם' },
];
const LEVER_IC = { grow: 'M4 20h4M4 20v-4M20 4h-4M20 4v4M5 19l5-5M19 5l-5 5', shrink: 'M10 14H6M10 14v4M14 10h4M14 10V6M10 14l-5 5M14 10l5-5',
  flip: 'M7 7h10l-3-3M17 17H7l3 3', join: 'M8 12a4 4 0 1 1 0 .1M16 12a4 4 0 1 1 0 .1M12 12h0', remove: 'M5 12h14', material: 'M4 16c3-6 5-6 8 0s5 6 8 0',
  reuse: 'M5 12a7 7 0 0 1 12-5l2 2M19 12a7 7 0 0 1-12 5l-2-2', nature: 'M6 18c0-8 5-12 12-12 0 7-4 12-12 12zM6 18l6-6' };
const lvIcon = (id) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${LEVER_IC[id] || ''}"/></svg>`;

export function createWorkshop({ root, audio = null, kids: kidsOpt = false, onExit = null } = {}) {
  let kids = false;   // read again at every opening: the player or the level may have changed (kidsOpt may be a function)
  const T = (o) => (kids ? (o.k || o.f || o.n) : (o.f || o.n));
  const W = (f, k) => (kids ? k : f);
  const el = document.createElement('div'); el.className = 'ws'; el.hidden = true; el.dir = 'rtl';
  root.appendChild(el);
  let open_ = false, place = 'room', thing = null, last = null, mix = null, round = null, roundT = 0, mine = false, tut = null, spinning = 0;
  const sfx = (n) => { try { audio && audio.play && audio.play(n); } catch (e) { } };

  // ── ניצוץ in 3D: one small renderer for his window; quality-aware, at most 30 frames a second, nothing when hidden
  let nz = null, renderer = null, scene = null, cam = null, raf = 0, lastT = 0, lastDraw = 0;
  function startNz() {
    const cv = el.querySelector('.ws-nz'); if (!cv || nz) return;
    const Q = (() => { try { return (window.__app && window.__app.quality) || 'medium'; } catch (e) { return 'medium'; } })();
    const weak = Q === 'min' || Q === 'low';
    try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: !weak, alpha: true }); } catch (e) { return; }
    renderer.setPixelRatio(Math.min(weak ? 1 : 1.5, window.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
    scene = new THREE.Scene();
    try { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.5; pm.dispose(); } catch (e) { }
    scene.add(new THREE.HemisphereLight('#fff4e0', '#5a4a3a', 1.1)); const sun = new THREE.DirectionalLight('#fff0d0', 2); sun.position.set(-2, 3, 3); scene.add(sun);
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
  const act = (x) => { if (nz) nz.set(x); };

  // ── his words: a bubble of the guide, his portrait and face (written only)
  const say = (key, opts = {}) => {
    const g = svcGuide(); const L = g && g.lines(key); if (!L || !L.length) return;
    const ln = L[Math.floor(Math.random() * L.length)];
    g.tip(ln, { speaker: 'nitzotz', ms: 3800, ...opts });
  };
  // the badges every new idea may bring, and the board
  function after() {
    for (const e of earned()) grant(e);
    paintBoard();
  }

  // ── the screens
  function shell() {
    el.innerHTML = `<header class="ws-top"><button type="button" class="ws-back" data-wsexit>${icon('home')}<span>${W('יציאה', 'יְצִיאָה')}</span></button>
        <div class="ws-title"><h1>${W('הסדנה של ניצוץ', 'הַסַּדְנָה שֶׁל נִיצוֹץ')}</h1><p>${W('חושבים כמו ממציאים', 'חוֹשְׁבִים כְּמוֹ מַמְצִיאִים')}</p></div>
        <button type="button" class="ws-room-btn" data-wsroom hidden>${icon('arrowR')}<span>${W('לסדנה', 'לַסַּדְנָה')}</span></button></header>
      <div class="ws-body"><aside class="ws-side"><canvas class="ws-nz" aria-hidden="true"></canvas><div class="ws-board"></div><div class="ws-roundbar" hidden></div></aside>
        <main class="ws-main"></main></div>`;
  }
  function paintBoard() {
    const b = el.querySelector('.ws-board'); if (!b) return;
    const m = measures();
    b.innerHTML = `<h3>${W('לוח הניצוצות', 'לוּחַ הַנִּיצוֹצוֹת')}</h3>${MEASURES.map((x) => `<div class="ws-meter" data-m="${x.id}" title="${esc(x.d)}"><span>${esc(kids ? x.k : x.n)}</span><i><u style="width:${Math.round(m.level[x.id] * 100)}%"></u></i><b>${m[x.id]}</b></div>`).join('')}
      <button type="button" class="ws-crazy" data-wscrazy>${W('תיבת השיגעונות', 'תֵּבַת הַשִּׁגְעוֹנוֹת')} <b>${crazyBox().length}</b></button>`;
  }
  function go(p) {
    place = p; if (p !== 'machine') thing = thing; mix = p === 'mixer' ? mix : null;
    el.querySelector('[data-wsroom]').hidden = p === 'room';
    const M = el.querySelector('.ws-main');
    if (p === 'room') M.innerHTML = roomHTML();
    else if (p === 'machine') M.innerHTML = machineHTML();
    else if (p === 'mixer') M.innerHTML = mixerHTML();
    else if (p === 'cards') M.innerHTML = cardsHTML();
    M.dataset.place = p;
    startTut();
  }
  function roomHTML() {
    return `<div class="ws-room">${PLACES.map((P) => `<button type="button" class="ws-st${P.soon ? ' soon' : ''}" data-st="${P.id}" ${P.soon ? 'disabled' : ''}>
      <span class="ws-stic">${icon(P.ic)}</span><b>${esc(kids ? P.k : P.n)}</b><small>${esc(P.soon ? W('בקרוב', 'בְּקָרוֹב') : kids ? P.kd : P.d)}</small></button>`).join('')}</div>`;
  }
  // ── the idea machine
  const leversNow = () => LEVERS.filter((l) => (!kids || l.kids) && (!round || !round.card.levers || round.card.levers.includes(l.id)));
  function machineHTML() {
    const t = thing && thingOf(thing), L = leversNow();
    const outH = last ? `<div class="wm-out cat-${last.cat}${last.fun ? ' fun' : ''}"><small>${esc(kids ? CATS[last.cat].k : CATS[last.cat].n)}</small><p>${esc(T(last))}</p></div>
      <div class="wm-rate">${[['works', W('עובד!', 'עוֹבֵד!')], ['funny', W('מצחיק', 'מַצְחִיק')], ['improve', W('שווה לשפר', 'שָׁוֶה לְשַׁפֵּר')]].map(([r, n]) => `<button type="button" data-wsrate="${r}" class="${last.r === r ? 'on' : ''}">${esc(n)}</button>`).join('')}</div>`
      : `<div class="wm-out empty"><p>${esc(t ? W('עכשיו מושכים בידית!', 'עַכְשָׁו מוֹשְׁכִים בַּיָּדִית!') : W('בחרו חפץ ושימו אותו במכונה', 'בַּחֲרוּ חֵפֶץ'))}</p></div>`;
    return `<div class="wm"><div class="wm-things">${THINGS.map((x) => `<button type="button" data-wsthing="${x.id}" class="${thing === x.id ? 'on' : ''}">${esc(kids ? x.k : x.n)}</button>`).join('')}</div>
      <div class="wm-machine"><div class="wm-slot">${t ? esc(kids ? t.k : t.n) : '?'}</div><div class="wm-gears" aria-hidden="true"><i></i><i></i></div></div>
      <div class="wm-levers">${LEVERS.filter((l) => !kids || l.kids).map((l) => { const ok = L.includes(l) && !!t; return `<button type="button" data-wslever="${l.id}" ${ok ? '' : 'disabled'}>${lvIcon(l.id)}<span>${esc(kids ? l.k : l.n)}</span></button>`; }).join('')}</div>
      ${outH}</div>`;
  }
  function pull(lv) {
    const t = thingOf(thing), L = leverOf(lv); if (!t || !L || !leversNow().includes(L)) return;
    const out = t.out[lv]; if (!out) return;
    const r = addIdea({ at: 'machine', th: t.id, lv, cat: out.cat, fun: !!out.fun });
    last = { ...out, r: '', lv };
    sfx('pop'); act(r.orig >= 2 ? 'idea' : out.fun ? 'excited' : 'explain');
    const M = el.querySelector('.ws-main'); M.innerHTML = machineHTML();
    const g = M.querySelector('.wm-machine'); if (g) { g.classList.remove('run'); void g.offsetWidth; g.classList.add('run'); }
    after(); roundCheck();
  }
  function rate(r) {
    if (!last) return; last.r = r; rateLast(r);
    sfx(r === 'works' ? 'good' : 'click');
    act(r === 'works' ? 'cheer' : r === 'funny' ? (Math.random() < 0.35 ? 'fuse' : 'excited') : 'hint');
    if (!tut || !tut.step) say('nz:react:' + r);
    el.querySelector('.ws-main').innerHTML = machineHTML();
    after(); roundCheck();
  }
  // ── the nature mixer
  function owned() { try { const S = readPlayer(K.cards, {}) || {}; return new Set(Object.keys(S.owned || {}).map((k) => k.split(':').pop())); } catch (e) { return new Set(); } }
  function mixerHTML() {
    const C = mix && NATURE_CARDS.find((c) => c.id === mix.sp), P = mix && problemOf(mix.pb);
    const traits = C ? C.tr.slice(0, 4) : [];
    const res = mix && mix.fit ? `<div class="wx-res fit-${mix.fit}"><p>${esc(mixWords(mix))}</p></div>` : '';
    return `<div class="wx"><div class="wx-wheels">
        <div class="wx-wheel cards${spinning ? ' spin' : ''}">${C ? `${CARD_ART[C.id] ? `<img src="${CARD_ART[C.id]}" alt="">` : ''}<b>${esc(kids ? C.k : C.n)}</b><small>${esc(ZONE_LOOK[C.z] ? (kids ? ZONE_LOOK[C.z].shortK : ZONE_LOOK[C.z].short) : '')}</small>` : `<b>?</b>`}</div>
        <span class="wx-vs">${W('פותר את', 'פּוֹתֵר אֶת')}</span>
        <div class="wx-wheel probs${spinning ? ' spin' : ''}">${P ? `<b>${esc(T(P))}</b>` : `<b>?</b>`}</div></div>
      <div class="wx-act"><button type="button" class="wx-spin" data-wsspin>${icon('undo')}<span>${W('לסובב!', 'לְסוֹבֵב!')}</span></button>
        <label class="wx-mine"><input type="checkbox" data-wsmine ${mine ? 'checked' : ''}> ${W('רק מהקלפים שלי', 'רַק מֵהַקְּלָפִים שֶׁלִּי')}</label></div>
      ${C && !mix.fit ? `<div class="wx-traits"><p>${W('איזו תכונה שלו תעזור?', 'אֵיזוֹ תְּכוּנָה תַּעֲזֹר?')}</p>${traits.map((t) => `<button type="button" data-wstrait="${t}">${esc(kids ? (TRAIT_K[t] || TRAIT[t]) : TRAIT[t])}</button>`).join('')}</div>` : ''}
      ${res}</div>`;
  }
  function mixWords(m) {
    const C = NATURE_CARDS.find((c) => c.id === m.sp), P = problemOf(m.pb), tr = kids ? (TRAIT_K[m.tr] || TRAIT[m.tr]) : TRAIT[m.tr];
    const nm = kids ? C.k : C.n;
    if (m.fit === 'good') return W(`עובד! "${tr}" של ${nm} באמת עוזר ${P.f}.`, `עוֹבֵד! "${tr}" שֶׁל ${nm} עוֹזֵר!`);
    if (m.fit === 'ok') return W(`יעזור קצת: "${tr}" של ${nm}. אולי יש תכונה טובה עוד יותר?`, `יַעֲזֹר קְצָת. אוּלַי תְּכוּנָה אַחֶרֶת?`);
    return W(`רעיון פרוע: "${tr}" של ${nm}. זה לא מה שהטבע עושה כאן, אבל אף אחד לא חשב על זה!`, `רַעְיוֹן פָּרוּעַ! אַף אֶחָד לֹא חָשַׁב עַל זֶה!`);
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
    el.querySelector('.ws-main').innerHTML = mixerHTML();
    setTimeout(() => { spinning = 0; if (place === 'mixer') el.querySelector('.ws-main').innerHTML = mixerHTML(); }, 700);
  }
  function pickTrait(tr) {
    if (!mix || mix.fit) return;
    const C = NATURE_CARDS.find((c) => c.id === mix.sp), P = problemOf(mix.pb), TL = TRIALS.find((x) => x.id === P.trial);
    mix.tr = tr; mix.fit = TL.good.includes(tr) ? 'good' : TL.ok.includes(tr) ? 'ok' : 'wild';
    addIdea({ at: 'mixer', sp: C.id, pb: P.id, tr, cat: P.cat, fit: mix.fit, zone: C.z, mine: mix.mine });
    sfx(mix.fit === 'good' ? 'good' : 'pop'); act(mix.fit === 'good' ? 'cheer' : mix.fit === 'ok' ? 'hint' : 'idea');
    if (!tut || !tut.step) say('nz:react:' + mix.fit);
    el.querySelector('.ws-main').innerHTML = mixerHTML();
    after(); roundCheck();
  }
  // ── constraint cards: a round
  const cardsFor = () => CONSTRAINTS.filter((c) => !kids || (c.k && !c.adv));
  function cardsHTML() {
    const R = readWs().rounds;
    return `<div class="wc"><div class="wc-head"><button type="button" class="wc-draw" data-wsdraw>${icon('cards')}<span>${W('לשלוף קלף', 'לִשְׁלֹף קְלָף')}</span></button>
      <p>${W('כל קלף הוא אתגר קצר. בתוך הזמן, ומול השיא שלכם בלבד.', 'כָּל קְלָף הוּא אֶתְגָּר קָצָר עִם שָׁעוֹן.')}</p></div>
      <div class="wc-list">${cardsFor().map((c) => { const r = R[c.id]; return `<button type="button" class="wc-card${r ? ' done' : ''}" data-wscard="${c.id}"><b>${esc(kids ? c.k : c.f)}</b><small>${c.at === 'mixer' ? W('מערבל הטבע', 'מְעַרְבֵּל') : W('מכונת הרעיונות', 'מְכוֹנָה')} · ${Math.round((kids && c.ksec ? c.ksec : c.sec) / 60 * 10) / 10} ${W('דק׳', 'דַּק׳')}${r ? ` · ${W('שיא', 'שִׂיא')} ${Math.ceil(r.best / 1000)} ${W('שנ׳', 'שְׁנ׳')}` : ''}</small></button>`; }).join('')}</div></div>`;
  }
  function draw(id) {
    const list = cardsFor(); const c = (id && constraintOf(id)) || list[Math.floor(Math.random() * list.length)]; if (!c) return;
    round = { card: c, goal: (kids && c.kgoal) || c.goal, sec: (kids && c.ksec) || c.sec, t0: Date.now(), done: false };
    roundT = 0; sfx('pop'); act('excited');
    paintRound(); go(c.at);
  }
  function roundProgress() {
    if (!round) return { have: 0, need: 1 };
    const G = round.goal, ideas = readWs().ideas.filter((x) => x.t >= round.t0);
    const mach = ideas.filter((x) => x.at === 'machine'), mixr = ideas.filter((x) => x.at === 'mixer');
    const works = mixr.filter((x) => x.fit === 'good' || x.fit === 'ok');
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
    b.innerHTML = `<b>${esc(kids ? round.card.k : round.card.f)}</b><span class="ws-clock${left < 15 ? ' low' : ''}">${Math.ceil(left)}</span><span class="ws-prog">${Math.min(p.have, p.need)} / ${p.need}</span><button type="button" data-wsstop>${W('לעצור', 'לַעֲצֹר')}</button>`;
  }
  function roundCheck() {
    if (!round || round.done) return;
    const p = roundProgress();
    paintRound();
    if (p.have >= p.need) {
      round.done = true;
      const r = roundDone(round.card.id, Date.now() - round.t0);
      sfx('quizRight'); act('cheer'); say(r.record && !r.first ? 'nz:react:record' : 'nz:react:roundwin', { ms: 4500 });
      setTimeout(() => { round = null; paintRound(); after(); if (place !== 'cards') go('cards'); }, 1600);
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
    M.innerHTML = `<div class="ws-box"><h3>${W('תיבת השיגעונות', 'תֵּבַת הַשִּׁגְעוֹנוֹת')}</h3>${list.length ? `<ul>${list.map((x) => { const t = x.at === 'machine' && thingOf(x.th); const o = t && t.out[x.lv]; return o ? `<li>${esc(T(o))}</li>` : ''; }).join('')}</ul>` : `<p>${W('עוד ריק. כל רעיון שתסמנו "מצחיק" נכנס לכאן.', 'עוֹד רֵיק.')}</p>`}</div>`;
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
    if (d.wsspin != null) { spin(); return; }
    if (d.wstrait) { pickTrait(d.wstrait); return; }
    if (d.wsdraw != null) { draw(); return; }
    if (d.wscard) { draw(d.wscard); return; }
    if (d.wsstop != null) { round = null; paintRound(); go('cards'); return; }
    if (d.wscrazy != null) { sfx('click'); showCrazy(); return; }
  });
  el.addEventListener('change', (e) => { if (e.target.matches('[data-wsmine]')) { mine = e.target.checked; } });

  // ── the tutorials: the room on the first visit, each place on its first visit (the standing rule of 29.10)
  function startTut() {
    if (tut && tut.step) return;
    const g = svcGuide(); if (!g) return;
    const ws = { state }, onDone = (r) => { tut = null; if (open_ && r !== 'abort' && r !== 'skip') startTut(); };
    const F = { room: nzRoomTutorial, machine: nzMachineTutorial, mixer: nzMixerTutorial, cards: nzCardsTutorial }[place];
    tut = F ? F({ guide: g, ws, onDone }) : null;
  }
  function state() {
    const w = readWs();
    return { place, thing, last: last && { cat: last.cat, r: last.r, lv: last.lv }, mix: mix && { ...mix }, round: round && { id: round.card.id, ...roundProgress(), done: round.done }, ideas: w.n.ideas, measures: measures(w), tut: tut && tut.step, nz: nz ? { mood: nz.mood, action: nz.action, light: nz.light } : null };
  }

  function openWs() {
    kids = typeof kidsOpt === 'function' ? !!kidsOpt() : !!kidsOpt;
    open_ = true; el.hidden = false; place = 'room'; thing = null; last = null; mix = null; round = null;
    shell(); paintBoard(); go('room'); startNz();
    setTimeout(() => { if (open_ && nz) nz.set('wave'); }, 600);
  }
  function close() {
    if (!open_) return; open_ = false;
    if (tut && tut.stop) tut.stop(); tut = null;
    stopNz(); el.hidden = true; el.innerHTML = '';
  }
  try {
    window.__wsDebug = { state, go: (p) => go(p), thing: (id) => { thing = id; last = null; if (place === 'machine') el.querySelector('.ws-main').innerHTML = machineHTML(); }, lever: (id) => pull(id), rate: (r) => rate(r),
      spin: (sp, pb) => spin(sp, pb), trait: (t) => pickTrait(t), draw: (id) => draw(id), endRound: () => { if (round) round.t0 = Date.now() - round.sec * 1000 - 1; }, nz: (x) => act(x) };
  } catch (e) { }
  return { open: openWs, close, isOpen: () => open_, state };
}
