// The start screen (renderStart): three tabs (the game's environments with the level and a carousel of the islands,
// the science centre, the learning hub), the veils and the journey bar of מסע החוקר (opens the map), the settings gear,
// the listeners on 'wol-journey' / 'wol-stage-done', and the players panel ("מי משחק?": pick, add, edit, delete).
// Exports: createStart(ctx) → { renderStart, PP, paintWho, ppClose, ppFocus, ppRender, ppEscape }.
// Needs from ctx (index.js and the parts made before it): root, emit, S, toolbar, startEl.
// Called through ctx because their parts are made later: paintToggles (toolbar.js).
import { EDITION_NAME } from '../../core/edition.js';
// 1.3.2 start screen (מסע החוקר): veils, the journey bar, the map and the settings sheet
import * as JR from '../../core/journey.js';
import { CARD_ART } from '../../data/card-art.js';
import { ISLAND_ART } from '../../data/island-art.js';
import { islandRankHTML } from '../../game/rank.js';   /* H: the island's rank under the island */
import { AVATAR_IDS, avatarHTML, avatarName } from '../avatars.js';
import { tileIcon } from '../icons-hub.js';
import { lockTip, lockWords, mapIcon, openJourneyMap, STAGE_COLOR, stageEmblem } from '../journey-map.js';
import { openSettings } from '../settings.js';
import { canopySVG, VINE, waxSeal } from './art.js';
import { esc } from './helpers.js';
import { icon } from './icons.js';
import { svcGuide } from '../../core/services.js';

export function createStart(ctx) {
  const { root, emit, S, toolbar, startEl } = ctx;
  const paintToggles = (...a) => ctx.paintToggles(...a);   // toolbar.js is made later
  /* ================================================================ START */
  // the start screen (1.3): three tabs – the game's environments (a carousel of the three islands, with the level),
  // the science centre (חוקרי הטבע and the lab of רובו־דע) and the learning hub
  function renderStart(biomes) {
    biomes = biomes || [];
    S.stTab = S.stTab || 'env';
    if (S.stCur == null || S.stCur >= biomes.length) S.stCur = 0;
    const isl = (id) => ISLAND_ART['c_' + id] || ISLAND_ART[id] || '';
    const fan = ['amazon:jaguar', 'grove:owl', 'reef:clownfish', 'amazon:toucan', 'reef:turtle'].map((k) => CARD_ART[k.split(':')[1]]).filter(Boolean).slice(0, 4);
    startEl.innerHTML = `<div class="st-bg">${canopySVG('top')}${canopySVG('bottom')}<i class="st-shaft s1"></i><i class="st-shaft s2"></i><i class="st-tint"></i></div>
      ${S.logo ? `<div class="st-logo"><img src="${S.logo}" alt="בבא דע"></div>` : ''}
      <div class="st-corner"><div class="st-corner-row"><button class="st-who" aria-haspopup="dialog" aria-expanded="false" hidden></button>
        <button class="st-time" aria-haspopup="dialog" hidden>${icon('hourglass')}<b></b></button>
        <button class="st-gear" aria-haspopup="dialog" aria-label="הגדרות" title="הגדרות">${icon('gear')}</button></div>
        <button class="st-jbar" data-part="journey" aria-haspopup="dialog"></button></div>
      <div class="st-pp-layer" hidden><div class="st-pp-scrim"></div><div class="st-pp paper" role="dialog" aria-modal="true" aria-label="מי משחק?"></div></div>
      <div class="st-inner v13">
      <header class="st-head"><div class="st-seal">${waxSeal(124)}</div>
        <div class="st-titles"><h1 class="st-title">רשת החיים</h1>${EDITION_NAME ? `<span class="st-edition">${EDITION_NAME}</span>` : ''}${VINE}<p class="st-sub">בונים יער חי, מגלים מי צריך את מי</p></div></header>
      <nav class="st-tabs" role="tablist">
        <button role="tab" data-tab="env">${icon('leaf')}<span><b>סביבות משחק</b><small>אמזונס, חורש, שונית ומדבר</small></span></button>
        <button role="tab" data-tab="sci" data-research-tab="1" data-part="science">${icon('flask')}<span><b>המרכז המדעי</b><small>חוקרי הטבע, המעבדה ומעבדת הרובוטים</small><small class="jv-note"></small></span></button>
        <button role="tab" data-tab="learn" data-part="learn">${icon('book')}<span><b>מרכז הלמידה</b><small>חידון, אלבום ומשחקי קלפים</small><small class="jv-note"></small></span></button>
      </nav>
      <section class="st-pane" data-pane="env">
        <div class="st-modes" role="radiogroup" aria-label="רמת משחק">
          <button data-mode="kids" role="radio">${icon('sprout')}<span><b>מתחילים</b><small>מעט מינים, משימות קצרות</small></span></button>
          <button data-mode="full" role="radio">${icon('web')}<span><b>מתקדמים</b><small>כל המינים, אירועים וטכנולוגיה</small></span></button>
        </div>
        <div class="st-car" aria-roledescription="קרוסלה">
          <button class="st-arrow prev" data-car="-1" aria-label="הסביבה הקודמת">${icon('arrowR')}</button>
          <div class="st-ring">${biomes.map((b, i) => `<button class="st-isl" data-i="${i}" data-id="${esc(b.id)}" data-part="zone:${esc(b.id)}" style="--zc:${(b.palette && b.palette[1]) || '#6a9'};--zc2:${(b.palette && b.palette[2]) || '#f0b44c'}" aria-label="${esc(b.name)}">
            <i class="st-glow"></i><img src="${isl(b.id)}" alt="" draggable="false"><i class="jv-curtain" aria-hidden="true"></i><span class="jv-note"></span><span class="af-srank" aria-hidden="true"></span></button>`).join('')}</div>
          <button class="st-arrow next" data-car="1" aria-label="הסביבה הבאה">${icon('arrowL')}</button>
        </div>
        <div class="st-info"></div>
        <div class="st-dots">${biomes.map((b, i) => `<button data-dot="${i}" aria-label="${esc(b.name)}"></button>`).join('')}</div>
      </section>
      <section class="st-pane" data-pane="sci">
        <div class="st-big2">
          <button class="st-panel" data-research="1" data-part="research"><span class="st-pimg rs">${biomes.slice(0, 3).map((b) => `<img src="${isl(b.id)}" alt="" draggable="false">`).join('')}<i class="st-lens">${icon('search')}</i><i class="jv-curtain" aria-hidden="true"></i></span>
            <span class="st-ptext"><b>חוקרי הטבע</b><small>תעלומות בטבע: מודדים, משערים, מנסים ומאזנים. שלוש רמות, משלוש הסביבות.</small><em>${icon('arrowL')}לתעלומות</em><em class="jv-note"></em></span></button>
          <button class="st-panel" data-lab="1" data-part="lab"><span class="st-pimg lab">${ISLAND_ART.lab ? `<img src="${ISLAND_ART.lab}" alt="" draggable="false">` : ''}<i class="jv-curtain" aria-hidden="true"></i></span>
            <span class="st-ptext"><b>המעבדה של רובו־דע</b><small>מיקרוסקופ, שולחן ממציאים ואטלס. ממציאים בעזרת הטבע ומשדרגים את הכלים.</small><em>${icon('arrowL')}למעבדה</em><em class="jv-note"></em></span></button>
          <button class="st-panel" data-robolab="1" data-part="robolab"><span class="st-pimg rlb" aria-hidden="true"><i class="rlb-bot"></i><i class="rlb-drone"></i><i class="rlb-blocks"></i><i class="jv-curtain" aria-hidden="true"></i></span>
            <span class="st-ptext"><b>מעבדת הרובוטים</b><small>מתכננים, בונים ומפעילים: רובוט, רחפן ורובוט צולל בתוך הסביבות. שיעורים, חידות ותגים.</small><em>${icon('arrowL')}למעבדת הרובוטים</em><em class="jv-note"></em></span></button>
        </div>
      </section>
      <section class="st-pane" data-pane="learn">
        <div class="st-learnwrap">
          <div class="st-fan">${fan.map((src, i) => `<img src="${src}" alt="" draggable="false" style="--k:${i - (fan.length - 1) / 2}">`).join('')}</div>
          <div class="st-lgrid">
            <button data-learn="home" data-part="learn">${tileIcon('learn', 'st-lic')}<span><b>מרכז הלמידה</b><small>כל המשחקים במקום אחד</small><small class="jv-note"></small></span></button>
            <button data-learn="setup" data-part="quiz">${tileIcon('quiz', 'st-lic')}<span><b>חידון</b><small>שאלות על היער והשונית</small><small class="jv-note"></small></span></button>
            <button data-learn="album" data-part="album">${tileIcon('album', 'st-lic')}<span><b>אלבום הקלפים</b><small>חבילות, סדרות ואוסף</small><small class="jv-note"></small></span></button>
            <button data-learn="duel" data-part="duel">${tileIcon('strong', 'st-lic')}<span><b>מי חזק ברשת?</b><small>קלף מול קלף</small><small class="jv-note"></small></span></button>
            <button data-learn="keepforest" data-part="keepforest">${tileIcon('keep', 'st-lic')}<span><b>מחזיקים את היער</b><small>משחק קלפים ואירועים</small><small class="jv-note"></small></span></button>
            <button data-learn="webpuzzle" data-part="webpuzzle">${tileIcon('thread', 'st-lic')}<span><b>חוט הקשר</b><small>מחברים את הרשת</small><small class="jv-note"></small></span></button>
            <button data-learn="inventors" data-part="inventors">${tileIcon('invent', 'st-lic')}<span><b>הממציאים</b><small>פותרים בעיות בעזרת הטבע</small><small class="jv-note"></small></span></button>
            <button data-learn="expedition" data-part="expedition">${tileIcon('dive', 'st-lic')}<span><b>משלחת לעומק</b><small>צוללים עם הקלפים לשונית</small><small class="jv-note"></small></span></button>
            <button data-learn="badges" data-part="badges">${tileIcon('medal', 'st-lic')}<span><b>התגים שלי</b><small>תגים ומסגרות לקלפים</small><small class="jv-note"></small></span></button>
          </div>
        </div>
      </section>
      </div>`;
    const paintModes = () => startEl.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.mode === S.mode)));
    S.mode = S.mode || 'full';
    startEl.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { S.mode = b.dataset.mode; paintModes(); emit('start:mode', { mode: S.mode }); paintJourney(); paintInfo(); }));
    // 1.3.2: a veiled part (core/journey.js isOpen) stays in place, dimmed; a click lets רובו־דע say what opens it
    const veiled = (el) => !!(el && el.dataset.part && !JR.isOpen(el.dataset.part));
    const gate = (el, fn) => () => { if (veiled(el)) lockTip(el.dataset.part, { emit }); else fn(); };
    startEl.querySelectorAll('[data-learn]').forEach((b) => b.addEventListener('click', gate(b, () => emit('ui:learn', { screen: b.dataset.learn }))));
    const rsBtn = startEl.querySelector('[data-research]'), labBtn = startEl.querySelector('[data-lab]');
    rsBtn.addEventListener('click', gate(rsBtn, () => emit('ui:research')));
    labBtn.addEventListener('click', gate(labBtn, () => emit('ui:lab')));
    const rlBtn = startEl.querySelector('[data-robolab]'); if (rlBtn) rlBtn.addEventListener('click', gate(rlBtn, () => emit('ui:robolab')));
    // tabs
    const paintTab = () => {
      startEl.querySelectorAll('[data-tab]').forEach((b) => { const on = b.dataset.tab === S.stTab; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
      startEl.querySelectorAll('[data-pane]').forEach((p) => p.classList.toggle('on', p.dataset.pane === S.stTab));
      startEl.dataset.tab = S.stTab;
    };
    // a veiled tab still opens (the child sees what waits there, veiled), and רובו־דע says when it opens
    startEl.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { if (S.stTab !== b.dataset.tab) { S.stTab = b.dataset.tab; paintTab(); emit('ui:click'); } if (veiled(b)) lockTip(b.dataset.part); }));
    // the carousel: the chosen island in front, the other two behind it on a slow ring
    const isls = [...startEl.querySelectorAll('.st-isl')], n = isls.length, info = startEl.querySelector('.st-info');
    // the carousel starts on an open island
    if (isls[S.stCur] && veiled(isls[S.stCur])) { const k = isls.findIndex((el) => !veiled(el)); if (k >= 0) S.stCur = k; }
    const paintInfo = () => {
      const b = biomes[S.stCur]; if (!b) return;
      const shut = veiled(isls[S.stCur]);
      info.style.setProperty('--zc', (b.palette && b.palette[0]) || '#2d5a35'); info.style.setProperty('--zc2', (b.palette && b.palette[2]) || '#f0b44c');
      info.innerHTML = `<div class="st-info-in" key="${S.stCur}"><h2>${esc(b.name)}</h2><p class="bc-sub">${esc(b.subtitle)}</p>
        <p class="bc-intro">${esc((S.mode === 'kids' && b.kidsIntro) ? b.kidsIntro : b.intro)}</p>
        ${shut ? `<button class="st-go jv" data-id="${esc(b.id)}">${icon('sprout')}<span>${esc(lockWords('zone:' + b.id))}</span></button>`
          : `<button class="st-go" data-id="${esc(b.id)}">${S.mode === 'kids' ? 'יוצאים לדרך · מתחילים' : 'יוצאים לדרך'}${icon('arrowL')}</button>`}</div>`;
      info.querySelector('.st-go').addEventListener('click', () => { if (veiled(isls[S.stCur])) lockTip('zone:' + b.id, { emit }); else emit('start:biome', { id: b.id }); });
      startEl.style.setProperty('--zc', (b.palette && b.palette[1]) || '#2d5a35');
      startEl.dataset.zone = b.id;   // the background takes the chosen environment's light and colours (style.css)
      /* H: each island's rank (src/game/rank.js), shown small under the island in front */
      isls.forEach((el) => { const r = el.querySelector('.af-srank'), kd = S.mode === 'kids', sm = !kd && JR.playMode() === 'experience', key = kd + '|' + sm + '|' + ((S.profiles && S.profiles.current && S.profiles.current.id) || ''); if (r && r.dataset.rk !== key) { r.dataset.rk = key; r.innerHTML = islandRankHTML(el.dataset.id, kd, sm); } });   // once per paint of the start screen, not on every turn
    };
    const paintCar = () => {
      isls.forEach((el, i) => {
        let k = ((i - S.stCur) % n + n) % n; if (k > n / 2) k -= n;   // -1 left, 0 front, 1 right
        el.dataset.k = String(k); el.tabIndex = k === 0 ? 0 : -1;
      });
      startEl.querySelectorAll('[data-dot]').forEach((d, i) => d.classList.toggle('on', i === S.stCur));
      paintInfo();
    };
    const turn = (d) => { S.stCur = ((S.stCur + d) % n + n) % n; paintCar(); emit('ui:click'); };
    startEl.querySelectorAll('[data-car]').forEach((b) => b.addEventListener('click', () => turn(+b.dataset.car)));
    startEl.querySelectorAll('[data-dot]').forEach((b) => b.addEventListener('click', () => { S.stCur = +b.dataset.dot; paintCar(); }));
    isls.forEach((el) => el.addEventListener('click', () => { const i = +el.dataset.i; if (i === S.stCur) { if (veiled(el)) lockTip(el.dataset.part, { emit }); else emit('start:biome', { id: biomes[i].id }); } else { S.stCur = i; paintCar(); emit('ui:click'); } }));
    // swipe / drag the ring
    const car = startEl.querySelector('.st-car'); let sx = null;
    car.addEventListener('pointerdown', (e) => { sx = e.clientX; });
    car.addEventListener('pointerup', (e) => { if (sx == null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 50) turn(dx > 0 ? 1 : -1); });
    // the start screen is drawn again after every visit: one listener at a time, or the arrows would jump several islands
    if (startEl._kd) startEl.removeEventListener('keydown', startEl._kd);
    startEl._kd = (e) => { if (S.stTab !== 'env' || e.target.closest('input,textarea')) return; if (e.key === 'ArrowLeft') turn(1); else if (e.key === 'ArrowRight') turn(-1); };
    startEl.addEventListener('keydown', startEl._kd);
    // ── מסע החוקר (1.3.2): veils on every part, the journey bar (opens the map), the settings gear
    const jbar = startEl.querySelector('.st-jbar');
    const jbarHTML = () => {
      const st = JR.state(), kids = st.kids, nx = st.next, c = STAGE_COLOR[st.stage];
      let need = '';
      if (nx) {   // the closest way to the next stage (the map lists all of them)
        const ways = (kids ? JR.STAGES[nx.stage - 1].kneed : JR.STAGES[nx.stage - 1].need) || [];
        let bi = 0, bp = -1; ways.forEach((w, i) => { const ks = Object.keys(w); const p = ks.reduce((a, k) => a + Math.min(1, (st.metrics[k] || 0) / w[k]), 0) / ks.length; if (p > bp) { bp = p; bi = i; } });
        need = nx.need[bi] || nx.need[0] || '';
      } else need = kids ? 'הִגַּעְתֶּם לַשָּׁלָב הָאַחֲרוֹן!' : 'הגעתם לשלב האחרון!';
      jbar.style.setProperty('--c', c);
      jbar.setAttribute('aria-label', `${kids ? 'מַפַּת הַמַּסָּע' : 'מפת המסע'}: ${st.name}. ${need}`);
      return `<span class="jb-med">${stageEmblem(st.stage)}<i>${st.stage}</i></span>
        <span class="jb-txt"><small>${kids ? `שָׁלָב ${st.stage} מִתּוֹךְ ${JR.STAGES.length}` : `שלב ${st.stage} מתוך ${JR.STAGES.length}`}</small><b>${esc(st.name)}</b></span>
        <span class="jb-prog"><i style="width:${Math.round((nx ? nx.progress : 1) * 100)}%"></i></span>
        <small class="jb-need">${esc(need)}</small>${mapIcon('jb-map')}`;
    };
    const paintJourney = (moveOff) => {
      if (!startEl.contains(jbar)) return;
      // another player: the carousel turns to an island that is open for them
      if (moveOff === true && veiled(isls[S.stCur])) { const k = isls.findIndex((el) => !veiled(el)); if (k >= 0) { S.stCur = k; paintCar(); } }
      startEl.querySelectorAll('[data-part]').forEach((el) => {
        if (el === jbar) return;
        const shut = veiled(el); el.classList.toggle('jv', shut);
        const note = el.querySelector('.jv-note'); if (note) note.textContent = shut ? lockWords(el.dataset.part) : '';
        if (shut) el.setAttribute('aria-description', lockWords(el.dataset.part)); else el.removeAttribute('aria-description');
      });
      jbar.innerHTML = jbarHTML();
      paintInfo();
    };
    S.paintJourney = paintJourney;
    let map = null;
    const goPart = (part) => {   // an open tile on the map: go there
      const showTab = (tab) => { S.stTab = tab; paintTab(); };
      if (part === 'experts') { showTab('env'); return true; }   // the expert missions wait in the forests
      if (part.startsWith('zone:')) { const i = isls.findIndex((el) => el.dataset.part === part); showTab('env'); if (i >= 0) { S.stCur = i; paintCar(); } return true; }
      const LEARN = { learn: 'home', quiz: 'setup', album: 'album', webpuzzle: 'webpuzzle', keepforest: 'keepforest', badges: 'badges', frames: 'frames', inventors: 'inventors', expedition: 'expedition', duel: 'duel', versematch: 'versematch' };
      if (LEARN[part]) { emit('ui:learn', { screen: LEARN[part] }); return true; }
      if (part === 'science') { showTab('sci'); return true; }
      if (part === 'research') { emit('ui:research'); return true; }
      if (part === 'robots') { emit('ui:learn', { screen: 'inventors', opts: { view: 'robots' } }); return true; }   // the robot workshop tab
      if (part === 'lab' || part.startsWith('lab:')) { emit('ui:lab'); return true; }
      if (part === 'robolab' || part.startsWith('robolab:')) { emit('ui:robolab'); return true; }
      return false;
    };
    const openMap = () => { emit('ui:click'); map = openJourneyMap(root, { emit, onPart: goPart, onClose: () => { map = null; try { jbar.focus({ preventScroll: true }); } catch (e) { } } }); };
    jbar.addEventListener('click', openMap);
    S.openJourneyMap = openMap;
    const gear = startEl.querySelector('.st-gear');
    // the parents' play time (1.3.3): the chip shows what is left today (ui/playtime-ui.js paints it) and opens the settings
    const ptChip = startEl.querySelector('.st-time');
    if (ptChip) ptChip.addEventListener('click', () => gear.click());
    try { window.__ptCheck && window.__ptCheck(); } catch (e) { }
    gear.addEventListener('click', () => {
      emit('ui:click'); gear.setAttribute('aria-expanded', 'true');
      openSettings(startEl, { emit, getMusic: () => S.toggles.music !== false,
        getSound: () => S.toggles.sound !== false, setSound: (on) => { S.toggles.sound = on; paintToggles(); emit('audio:mute', { muted: !on }); },
        getQuality: () => S.toggles.quality || 'medium', setQuality: (q) => { S.toggles.quality = q; paintToggles(); emit('quality', { q }); },
        onClose: () => { gear.setAttribute('aria-expanded', 'false'); try { gear.focus({ preventScroll: true }); } catch (e) { } } });
      // the first time: רובו־דע presents the rows that are on screen (beginners have no play mode row)
      setTimeout(() => { const g = svcGuide(); if (g && startEl.querySelector('.set-layer')) g.say(g.lines('start:settings').filter((l) => !l.at || startEl.querySelector(l.at)), { key: 'g:start:settings' }); }, 300);
    });
    // listen once (the start screen is drawn again after every visit)
    if (!S.jListen) {
      S.jListen = true;
      const onStart = () => startEl.classList.contains('on') && !root.classList.contains('ingame') && !root.querySelector('.rs-hub.on') && !(window.__wolLearn && window.__wolLearn.isOpen && window.__wolLearn.isOpen());
      // the first visit of a player: רובו־דע presents the journey bar (after his hello, which main.js queues first)
      S.journeyIntro = () => { clearTimeout(S.jIntroT); S.jIntroT = setTimeout(() => { if (onStart() && svcGuide()) svcGuide().intro('journey', { modal: true }); }, 1500); };
      addEventListener('wol-journey', () => { if (S.paintJourney) S.paintJourney(); S.journeyIntro(); });
      // a stage moment closed: offer to go to what opened ("בואו נלך!" / "אחר כך"), switch the tab and ring the new button
      const GO = { 2: { tab: 'learn' }, 3: { tab: 'learn' }, 4: { tab: 'sci' }, 5: { tab: 'sci' }, 6: { tab: 'learn' } };
      addEventListener('wol-stage-done', (e) => {
        if (S.paintJourney) S.paintJourney();
        const n = e.detail && e.detail.stage, g = svcGuide(); const go = GO[n];
        if (!go || !g || !onStart() || !e.detail || !['done', 'skip'].includes(e.detail.result)) return;
        if (JR.state().stage > n) return;   // several stages at once: only the last one offers the way (its moment comes next)
        const kids = JR.playMode() === 'kids', ask = (g.lines('start:go') || []).find((l) => l.id === 'start.go.ask');
        const ring = (g.lines('start:go') || []).find((l) => l.id === 'start.go.' + n);
        if (!ask || !ring) return;
        g.say([ask], { actions: [{ id: 'go', label: kids ? 'בּוֹאוּ נֵלֵךְ!' : 'בואו נלך!', kind: 'primary' }, { id: 'later', label: kids ? 'אַחַר כָּךְ' : 'אחר כך' }] }).then((r) => {
          if (r !== 'go' || !onStart()) return;
          if (S.stTab !== go.tab) startEl.querySelector(`[data-tab="${go.tab}"]`)?.click();
          setTimeout(() => { if (onStart()) g.tip(ring, { ms: 9000 }); }, 520);   // after the pane's opening animation, so the ring sits right
        });
      });
    }
    paintModes(); paintTab(); paintCar(); paintJourney();
    S.journeyIntro();
    const renderStartIntros = () => paintInfo();
    S.repaintStartMode = () => { paintModes(); paintJourney(true); renderStartIntros(); };   // another player was chosen: show their level
    PP.open = false;
    startEl.querySelector('.st-who').addEventListener('click', () => (PP.open ? ppClose() : ppOpen()));
    const layer = startEl.querySelector('.st-pp-layer');
    layer.querySelector('.st-pp-scrim').addEventListener('click', () => ppClose());
    layer.querySelector('.st-pp').addEventListener('click', ppClick);
    layer.querySelector('.st-pp').addEventListener('input', (e) => { if (e.target.matches('.pp-input') && PP.draft) PP.draft.name = e.target.value; });
    layer.querySelector('.st-pp').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.matches('.pp-input')) { e.preventDefault(); ppSave(); return; }
      if (e.key !== 'Tab') return;
      // keep Tab inside the open sheet
      const f = [...ppBox().querySelectorAll('button, input')]; if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    });
    paintWho();
  }

  /* ================================================================ PLAYERS ("מי משחק?") */
  // A chip on the start screen shows who is playing; tapping it opens a small sheet: pick a player, add one, edit or delete.
  // The UI only emits profile:* events – main.js changes the profiles and answers with ui.setProfiles(state).
  const PP = { open: false, view: 'list', id: null, draft: null, after: null };
  const ppBox = () => startEl.querySelector('.st-pp');
  const ppPlayer = (id) => ((S.profiles && S.profiles.list) || []).find((p) => p.id === id) || null;
  function paintWho() {
    const p = S.profiles && S.profiles.current;
    const chip = startEl.querySelector('.st-who');
    if (chip) {
      chip.hidden = !p;
      if (p) {
        chip.innerHTML = `${avatarHTML(p.animal, 'who-av')}<span class="who-txt"><small>מי משחק?</small><b>${esc(p.name)}</b></span>${icon('chevron', 'who-chev')}`;
        chip.setAttribute('aria-label', `מי משחק? ${p.name}. אפשר ללחוץ ולהחליף שחקן`);
      }
    }
    const km = toolbar.querySelector('.km-who');
    if (km) { km.hidden = !p; km.innerHTML = p ? `${avatarHTML(p.animal, 'km-av')}<b>${esc(p.name)}</b>` : ''; if (p) km.title = 'מי משחק: ' + p.name; }
  }
  function ppOpen() {
    const layer = startEl.querySelector('.st-pp-layer'); if (!layer) return;
    PP.open = true; PP.view = 'list'; PP.after = null; layer.hidden = false;
    startEl.querySelector('.st-who').setAttribute('aria-expanded', 'true');
    ppRender(); ppFocus();
  }
  function ppClose(keepFocus) {
    const layer = startEl.querySelector('.st-pp-layer'); if (!layer || !PP.open) return;
    PP.open = false; PP.after = null; layer.hidden = true;
    const chip = startEl.querySelector('.st-who'); chip.setAttribute('aria-expanded', 'false');
    if (!keepFocus) try { chip.focus({ preventScroll: true }); } catch (e) { }
  }
  function ppFocus() {
    requestAnimationFrame(() => {
      const box = ppBox(); if (!box) return;
      const t = box.querySelector(PP.view === 'form' ? '.pp-input' : PP.view === 'confirm' ? '[data-a="del-no"]' : '.pp-row.cur .pp-pick') || box.querySelector('button');
      try { t && t.focus({ preventScroll: true }); } catch (e) { }
    });
  }
  function ppGo(view, id) {
    PP.view = view; PP.id = id || null;
    if (view === 'form') { const p = ppPlayer(id); const used = new Set(((S.profiles && S.profiles.list) || []).map((q) => q.animal)); PP.draft = p ? { name: p.name, animal: p.animal } : { name: '', animal: AVATAR_IDS.find((a) => !used.has(a)) || AVATAR_IDS[0] }; }
    ppRender(); ppFocus();
  }
  function ppRender() {
    const box = ppBox(); if (!box) return;
    const st = S.profiles || { list: [], current: null, max: 6, nameMax: 14 };
    const cur = st.current && st.current.id;
    const x = `<button class="pp-x" data-a="close" aria-label="סגירה" title="סגירה">${icon('close')}</button>`;
    box.dataset.view = PP.view;
    if (PP.view === 'form') {
      const editing = ppPlayer(PP.id), d = PP.draft || { name: '', animal: AVATAR_IDS[0] };
      box.innerHTML = `${x}<h3 class="pp-h">${editing ? 'עריכת שחקן' : 'שחקן חדש'}</h3>
        <label class="pp-lab" for="pp-name">השם</label>
        <input id="pp-name" class="pp-input" type="text" maxlength="${st.nameMax || 14}" autocomplete="off" spellcheck="false" dir="rtl" lang="he" placeholder="כתבו כאן את השם" value="${esc(d.name)}">
        <div class="pp-lab" id="pp-anl">בחרו חיה</div>
        <div class="pp-animals" role="radiogroup" aria-labelledby="pp-anl">${AVATAR_IDS.map((a) => `<button role="radio" data-animal="${a}" aria-checked="${a === d.animal}" aria-label="${esc(avatarName(a))}">${avatarHTML(a)}<small>${esc(avatarName(a))}</small></button>`).join('')}</div>
        <div class="pp-actions"><button class="btn primary" data-a="save">${icon('check')}${editing ? 'שמירה' : 'הוספה'}</button><button class="btn soft" data-a="cancel">ביטול</button></div>
        ${editing ? `<div class="pp-danger"><button class="pp-del" data-a="pp-reset">${icon('undo')}<span>איפוס השחקן</span></button>${st.list.length > 1 ? `<button class="pp-del" data-a="del">${icon('trash')}<span>מחיקת השחקן</span></button>` : ''}</div>` : ''}`;
      return;
    }
    if (PP.view === 'confirm') {
      const p = ppPlayer(PP.id); if (!p) { PP.view = 'list'; return ppRender(); }
      box.innerHTML = PP.kind === 'reset'
        ? `${x}<div class="pp-confirm">${avatarHTML(p.animal, 'pp-bigav')}<h3 class="pp-h">לאפס את ${esc(p.name)}?</h3>
        <p>כל ההישגים של ${esc(p.name)} יימחקו: היערות השמורים, הקלפים, האלבום והחבילות.<br>השם והחיה יישארו, והמשחק יתחיל מההתחלה.<br><b>אי אפשר יהיה להחזיר אותם.</b></p></div>
        <div class="pp-actions"><button class="btn danger" data-a="pp-reset-yes">${icon('undo')}כן, לאפס</button><button class="btn soft" data-a="del-no">לא, חזרה</button></div>`
        : `${x}<div class="pp-confirm">${avatarHTML(p.animal, 'pp-bigav')}<h3 class="pp-h">למחוק את ${esc(p.name)}?</h3>
        <p>היערות, הקלפים והחבילות של ${esc(p.name)} יימחקו.<br>אי אפשר יהיה להחזיר אותם.</p></div>
        <div class="pp-actions"><button class="btn danger" data-a="del-yes">${icon('trash')}כן, למחוק</button><button class="btn soft" data-a="del-no">לא, חזרה</button></div>`;
      return;
    }
    box.classList.toggle('many', PP.view === 'list' && st.list.length > 4);   // five or six players: two columns, no scrolling
    box.innerHTML = `${x}<h3 class="pp-h">מי משחק?</h3><p class="pp-sub">בחרו את השם שלכם</p>
      <ul class="pp-list${st.list.length > 4 ? ' many' : ''}">${st.list.map((p) => `<li class="pp-row${p.id === cur ? ' cur' : ''}">
        <button class="pp-pick" data-pick="${esc(p.id)}" aria-pressed="${p.id === cur}">${avatarHTML(p.animal)}<span class="pp-name">${esc(p.name)}</span>${p.id === cur ? `<span class="pp-tick" title="זה השחקן שבחרתם">${icon('check')}</span>` : ''}</button>
        <button class="pp-edit" data-edit="${esc(p.id)}" aria-label="עריכה: ${esc(p.name)}" title="עריכה">${icon('pencil')}</button></li>`).join('')}</ul>
      ${st.list.length < (st.max || 6) ? `<button class="pp-add" data-a="add">${icon('plus')}<span>שחקן חדש</span></button>` : `<p class="pp-note">אפשר עד ${st.max || 6} שחקנים</p>`}`;
  }
  function ppSave() {
    const d = PP.draft; if (!d) return;
    const name = String(d.name || '').replace(/\s+/g, ' ').trim();
    const editing = ppPlayer(PP.id);
    if (editing) { PP.after = 'list'; emit('profile:edit', { id: editing.id, name: name || null, animal: d.animal }); }
    else { PP.after = 'close'; emit('profile:add', { name, animal: d.animal }); }
  }
  function ppClick(e) {
    const pick = e.target.closest('[data-pick]');
    if (pick) { const id = pick.dataset.pick; if (S.profiles && S.profiles.current && S.profiles.current.id === id) { ppClose(); return; } PP.after = 'close'; emit('profile:switch', { id }); return; }
    const ed = e.target.closest('[data-edit]'); if (ed) { ppGo('form', ed.dataset.edit); return; }
    const an = e.target.closest('[data-animal]');
    if (an && PP.draft) { PP.draft.animal = an.dataset.animal; ppBox().querySelectorAll('.pp-animals [data-animal]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.animal === PP.draft.animal))); return; }
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = b.dataset.a;
    if (a === 'close') ppClose();
    else if (a === 'add') ppGo('form', null);
    else if (a === 'save') ppSave();
    else if (a === 'cancel') ppGo('list');
    else if (a === 'del') { PP.kind = 'del'; ppGo('confirm', PP.id); }
    else if (a === 'pp-reset') { PP.kind = 'reset'; ppGo('confirm', PP.id); }
    else if (a === 'pp-reset-yes') { PP.after = 'list'; emit('profile:reset', { id: PP.id }); }
    else if (a === 'del-no') ppGo('form', PP.id);
    else if (a === 'del-yes') { PP.after = 'list'; emit('profile:remove', { id: PP.id }); }
  }
  // Escape walks back: confirm → form → list → closed
  function ppEscape() {
    if (!PP.open) return false;
    if (PP.view === 'confirm') ppGo('form', PP.id); else if (PP.view === 'form') ppGo('list'); else ppClose();
    return true;
  }
  return { renderStart, PP, paintWho, ppClose, ppFocus, ppRender, ppEscape };
}
