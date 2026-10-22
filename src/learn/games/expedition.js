import { DEPTHS, DEPTH_LOOK, SAMPLES, FRIENDS, RARE, TRAITS, TRAIT_NAMES, CHALLENGES, STARTER } from '../../data/expedition.js';
import { genderOf, defName } from '../../data/common.js';
import { icon } from '../../ui/ui.js';
// "משלחת לעומק" – a push-your-luck exploration game for the learning hub (single player).
// The player picks a team of four cards from the album and dives into the reef of the Gulf of Eilat, depth by depth.
// Each depth is a row of face-down sea tiles: samples (into the bag), friends (help), the rare find, and challenges.
// A challenge is met by the team card the player chooses; what happens comes from that card's traits (reef / land,
// swims / flies, night, coral, a tool that is or is not waterproof, plus src/data/expedition.js TRAITS): the card stays
// ready, gets tired, or goes back up to the boat. Going down sends the bag up to the boat (safe); if nobody in the team
// is ready any more, the expedition ends and the bag of the current depth floats away. רובו־דע narrates on the radio.
// Prizes are badges (src/data/badges.js 'deep:*'), never card packs.
//
// export function mountExpedition(root, ctx, opts) → { destroy() }
// Debug hook: window.__exDebug = { start(teamIds), flip(i), choose(cardIndex), up(), back(), peek(), state() }

const CSS_ID = 'wl-expedition-css';
const TEAM = 4;

/* ───────────────────────────── icons (inline SVG – no emoji fonts offline, and no cross shapes anywhere) */
const sv = (body, vb = '0 0 24 24') => `<svg class="wl-ic" viewBox="${vb}" aria-hidden="true">${body}</svg>`;
const I = {
  current: sv('<path d="M3 8c3-3 6 3 9 0s6 3 9 0M3 13c3-3 6 3 9 0s6 3 9 0M3 18c3-3 6 3 9 0s6 3 9 0" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/>'),
  dark: sv('<path d="M15.5 3.2a8.8 8.8 0 1 0 5.3 13.6A7.3 7.3 0 0 1 15.5 3.2z" fill="currentColor"/><circle cx="18.5" cy="6" r="1" fill="currentColor"/>'),
  murky: sv('<path d="M12 2.8C8.6 7.8 6 11 6 14.3a6 6 0 0 0 12 0C18 11 15.4 7.8 12 2.8z" fill="currentColor" opacity=".55"/><circle cx="10" cy="14" r="1.4" fill="currentColor"/><circle cx="14" cy="16.6" r="1.1" fill="currentColor"/><circle cx="13" cy="11.6" r=".9" fill="currentColor"/>'),
  predator: sv('<path d="M2.5 12c3-4.2 8.5-5.6 13.5-3.4L21.5 6v12l-5.5-2.6C11 17.6 5.5 16.2 2.5 12z" fill="currentColor"/><circle cx="7" cy="11" r="1.2" fill="#fff"/><path d="M4 13.2l1 1 1-1 1 1 1-1" stroke="#fff" stroke-width="1" fill="none"/>'),
  crack: sv('<path d="M2.5 20.5L6 8l5-4.5 5.5 2.5 5 14.5z" fill="currentColor"/><path d="M11.5 4.5l-1 5 2 3-1.5 4 .5 4" stroke="#0b2c44" stroke-width="1.8" fill="none" stroke-linejoin="round"/><circle cx="11.6" cy="12.6" r="1.3" fill="#ffe7a8"/>'),
  deepwater: sv('<path d="M12 3v14M6.5 12L12 17.5 17.5 12" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 21h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
  jelly: sv('<path d="M4.5 12a7.5 7 0 0 1 15 0z" fill="currentColor"/><path d="M7 12c0 3-1 5 0 8M10.5 12c0 3 1 5 0 8M13.5 12c0 3-1 5 0 8M17 12c0 3 1 5 0 8" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>'),
  net: sv('<path d="M4 5c4 1.5 12 1.5 16 0-1 7-3 13-8 15C7 18 5 12 4 5z" fill="currentColor" opacity=".35"/><path d="M4 5c4 1.5 12 1.5 16 0-1 7-3 13-8 15C7 18 5 12 4 5z" stroke="currentColor" stroke-width="1.6" fill="none"/><g fill="currentColor"><circle cx="9" cy="9.5" r="1"/><circle cx="15" cy="9.5" r="1"/><circle cx="12" cy="13" r="1"/><circle cx="9.6" cy="15.8" r="1"/><circle cx="14.4" cy="15.8" r="1"/></g>'),
  anchor: sv('<circle cx="12" cy="4.6" r="2.2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 6.8v13.4M4.5 13.5c.4 4 3.5 6.8 7.5 6.8s7.1-2.8 7.5-6.8" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/>'),
  heat: sv('<path d="M10 4.5a2 2 0 0 1 4 0v9.2a4.5 4.5 0 1 1-4 0z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="17.5" r="2.6" fill="currentColor"/><path d="M12 9v7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'),
  sand: sv('<path d="M3 18c3-2 6-2 9 0s6 2 9 0v3H3z" fill="currentColor"/><path d="M8 13.5a4 4 0 0 1 8 0z" fill="currentColor" opacity=".7"/><path d="M12 9.5v4M10 10.4l1 3M14 10.4l-1 3" stroke="currentColor" stroke-width="1.2"/>'),
  sample: sv('<path d="M5 17.5C5 11 9 6 12 4c3 2 7 7 7 13.5z" fill="currentColor"/><path d="M12 4.5v13M8.4 9.5L12 17.5M15.6 9.5L12 17.5" stroke="#fff" stroke-opacity=".5" stroke-width="1.1" fill="none"/>'),
  clean: sv('<path d="M3 12c2.5-3.5 7-4.5 11-2.6L19 7v10l-5-2.4C10 16.5 5.5 15.5 3 12z" fill="currentColor"/><path d="M5 12h8" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><circle cx="6.5" cy="10.8" r=".9" fill="#fff"/>'),
  turtle: sv('<ellipse cx="11" cy="12.5" rx="6.5" ry="5" fill="currentColor"/><circle cx="19.4" cy="11.5" r="2" fill="currentColor"/><path d="M6 16.5l-2 2.5M15 16.8l1.6 2.4M6.4 8.8L4.4 6.4M15.2 8.4l1.4-2.2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M8 11h6M9 14h4" stroke="#fff" stroke-opacity=".45" stroke-width="1.2"/>'),
  dolphin: sv('<path d="M2.8 15.5c3.5-6.5 9.5-9 16.4-6.6l1.9-2.4.4 3.9c.8.8 1 1.6.4 2.2-4.8-1.5-9.6.3-12.4 4.5l-1.5-1.6-1.7 2.8z" fill="currentColor"/><circle cx="17" cy="10.4" r=".8" fill="#fff"/>'),
  whale: sv('<path d="M2 13c2.5-4.5 8-6.5 14-5l4-3v14l-4-3C10 17.5 4.5 16.5 2 13z" fill="currentColor"/><g fill="#fff" fill-opacity=".55"><circle cx="7" cy="11" r=".8"/><circle cx="10" cy="10" r=".8"/><circle cx="9" cy="13" r=".8"/><circle cx="12.5" cy="12" r=".8"/></g>'),
  spawn: sv('<g fill="currentColor"><circle cx="6" cy="16" r="1.6"/><circle cx="10" cy="11" r="1.4"/><circle cx="14.5" cy="14.5" r="1.7"/><circle cx="17.5" cy="8.5" r="1.3"/><circle cx="8" cy="6" r="1.1"/><circle cx="13" cy="5" r="1"/></g><path d="M3 21c2-2 5-2 7 0s5 2 7 0 4-2 4-2" stroke="currentColor" stroke-width="1.6" fill="none"/>'),
  tile: sv('<path d="M3 9c3-2.5 6 2.5 9 0s6 2.5 9 0M3 15c3-2.5 6 2.5 9 0s6 2.5 9 0" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>'),
  boat: sv('<path d="M2 13h20l-3.5 5.5h-13z" fill="currentColor"/><path d="M7 13V8.5h7l2 4.5z" fill="currentColor" opacity=".75"/><rect x="8.5" y="9.6" width="2.4" height="2" rx=".4" fill="#fff" fill-opacity=".7"/>'),
  down: sv('<path d="M12 4v13M6.5 11.5L12 17l5.5-5.5" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  up: sv('<path d="M12 20V7M6.5 12.5L12 7l5.5 5.5" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  eye: sv('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" fill="currentColor"/><circle cx="12" cy="12" r="3.2" fill="#fff"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>'),
  star: sv('<path d="M12 2.6l2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.2l-5.8 3.2 1.2-6.5-4.8-4.5 6.5-.8z" fill="currentColor"/>'),
  team: sv('<rect x="3" y="6" width="8" height="12" rx="1.6" fill="currentColor" opacity=".6"/><rect x="13" y="6" width="8" height="12" rx="1.6" fill="currentColor"/>'),
  zzz: sv('<path d="M5 7h5l-5 6h5M13 12h4l-4 5h4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  check: sv('<path d="M4.5 12.5l4.8 4.8L19.5 7" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  shuffle: sv('<path d="M3 7h4c4 0 6 10 10 10h4M3 17h4c1.6 0 2.8-1.6 3.8-3.6M14.2 9.6C15.2 8.4 16 7 17 7h4M18.5 4.5L21 7l-2.5 2.5M18.5 14.5L21 17l-2.5 2.5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
};
const TILE_IC = { sample: I.sample, cleaners: I.clean, turtleguide: I.turtle, dolphins: I.dolphin, whaleshark: I.whale, spawning: I.spawn };
// רובו־דע's face for the radio (the lab robot: a rounded head, a teal visor, two eyes, one antenna)
const ROBO = (mood = 'happy') => `<svg class="ex-robo ${mood}" viewBox="0 0 64 64" aria-hidden="true">
  <path d="M32 5v6" stroke="#9fb7c6" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="5" r="3.4" fill="#f6cf72"/>
  <rect x="9" y="11" width="46" height="42" rx="17" fill="#eef4f6"/><rect x="9" y="11" width="46" height="42" rx="17" fill="none" stroke="#b9cbd4" stroke-width="2"/>
  <rect x="15" y="20" width="34" height="22" rx="10" fill="#1d3a4a"/>
  <g class="eyes"><ellipse cx="25" cy="30" rx="4" ry="${mood === 'wow' ? 5.4 : 4.4}" fill="#6ff0ff"/><ellipse cx="39" cy="30" rx="4" ry="${mood === 'wow' ? 5.4 : 4.4}" fill="#6ff0ff"/></g>
  ${mood === 'oops' ? '<path d="M26 38.5q6-3 12 0" stroke="#6ff0ff" stroke-width="2" fill="none" stroke-linecap="round"/>' : '<path d="M26 37q6 4 12 0" stroke="#6ff0ff" stroke-width="2" fill="none" stroke-linecap="round"/>'}
  <circle cx="9" cy="32" r="3.5" fill="#cfdde3"/><circle cx="55" cy="32" r="3.5" fill="#cfdde3"/></svg>`;

/* ───────────────────────────── names, gender and lines */
// the tools' definite names and genders (species come from data/common.js)
const TOOL_DEF = { drone: 'רחפן הניטור', camera: 'מצלמת השטח', rescue: 'רובוט ההצלה', watergen: 'מחולל המים', seeddrone: 'רחפן הזריעה',
  listener: 'מאזין היער', nestbox: 'תיבת הקינון', insecthotel: 'מלון החרקים', weather: 'תחנת מזג האוויר', nursery: 'משתלת האלמוגים',
  reefball: 'השונית המלאכותית', buoy: 'מצוף העגינה', rov: 'הרובוט הצולל', uwcam: 'המצלמה התת־ימית', sensor: 'מצוף החיישנים' };
const TOOL_G = { camera: 'f', nestbox: 'f', weather: 'f', nursery: 'f', reefball: 'f', uwcam: 'f' };
const GI = { m: 0, f: 1, mp: 2, fp: 3 };
const idOf = (c) => (c.type === 'tool' ? c.tool.id : c.sp.id);
const gOf = (c) => (c.type === 'tool' ? TOOL_G[idOf(c)] || 'm' : genderOf(idOf(c)));
const dnOf = (c) => (c.type === 'tool' ? TOOL_DEF[idOf(c)] || 'ה' + c.name : defName(idOf(c), c.name));
const pre = (p, c) => { const d = dnOf(c); return p + (/^[בל]$/.test(p) && d[0] === 'ה' ? d.slice(1) : d); };
const PRON = { P: ['הוא', 'היא', 'הם', 'הן'], O: ['אותו', 'אותה', 'אותם', 'אותן'], L: ['לו', 'לה', 'להם', 'להן'] };
function say(line, c) {
  const g = c ? GI[gOf(c)] : 0;
  return line
    .replace(/\[\[([^\]]+)\]\]/g, (_, f) => { const p = f.split('|'); return p[g] ?? p[g % 2] ?? p[0]; })
    .replace(/\{bN\}/g, () => pre('ב', c)).replace(/\{lN\}/g, () => pre('ל', c)).replace(/\{mN\}/g, () => pre('מ', c))
    .replace(/\{N\}/g, () => (c ? dnOf(c) : ''))
    .replace(/\{([POL])\}/g, (_, k) => PRON[k][g]);
}

/* ───────────────────────────── traits */
function traitsOf(c) {
  const t = new Set();
  const id = idOf(c);
  for (const x of TRAITS[id] || []) t.add(x);
  if (c.type === 'tool') { t.add('tool'); if (!t.has('wet') && id !== 'rescue') t.add('land'); }
  else {
    const s = c.sp;
    t.add(s.biome === 'reef' ? 'reef' : 'land');
    t.add(s.animal ? 'animal' : 'plant');
    if (s.kind === 'coral') { t.add('coral'); t.add('sessile'); t.delete('plant'); t.add('animal'); }
    if (s.kind === 'sessile') { t.add('sessile'); t.delete('plant'); t.add('animal'); }
    if (s.locomotion === 'swim') t.add('swim');
    if (s.locomotion === 'flying' && s.biome !== 'reef') t.add('fly');
    if (s.active === 'night') t.add('night');
    if (s.kind === 'fungus') t.add('fungus');
  }
  return t;
}
const match = (alt, c, t) => alt === '*' || alt.split('+').every((p) => (p[0] === '#' ? idOf(c) === p.slice(1) : t.has(p)));
const ruleFor = (rules, c) => { const t = traitsOf(c); return rules.find((r) => r.t.some((a) => match(a, c, t))) || rules[rules.length - 1]; };
// the three traits worth showing under a card (its strengths under water)
const SHOW = ['squeeze', 'hide', 'cling', 'scare', 'strongswim', 'sense', 'smell', 'deep', 'shell', 'sting', 'spines', 'big', 'grab', 'lights', 'camera',
  'measure', 'motor', 'anchored', 'rescue', 'regrow', 'shade', 'filter', 'roots', 'dig', 'glow', 'night', 'tiny', 'hang', 'camo', 'landswim', 'swim', 'coral', 'fly'];
const chipsOf = (c) => { const t = traitsOf(c); return SHOW.filter((k) => t.has(k) && TRAIT_NAMES[k]).slice(0, 3).map((k) => TRAIT_NAMES[k]); };

/* ───────────────────────────── helpers */
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rnd(a.length)];
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const PRIZE = { crack: 'קונכייה מהסדק', net: 'דגימה שהדג המשוחרר הראה לנו', sand: 'קונכייה מהחול', dark: 'דגימה מהחושך', murky: 'מדידת בוץ', anchor: 'שבר אלמוג לשתילה', heat: 'מדידת חום' };

export function mountExpedition(root, ctx, opts = {}) {
  injectCss();
  const esc = ctx.esc;
  const kids = !!ctx.kids();
  const ST = Object.assign({ best: 0, runs: 0, deepest: 0, team: null }, ctx.store('expedition') || {});
  const save = () => ctx.store('expedition', ST);
  const NDEP = kids ? 3 : DEPTHS.length;
  let S = null, alive = true, pickSel = [], filter = 'all', radio = null, flash = null;
  const offs = [];
  const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); offs.push(() => t.removeEventListener(ev, fn, o)); };
  const later = (fn, ms) => ctx.later(() => { if (alive) fn(); }, ms);
  const card = (id) => ctx.CARD.get(id);

  /* ── the team */
  function ownedCards() {
    const own = ctx.owned() || {};
    const order = (c) => (c.type === 'species' && c.biome === 'reef' ? 0 : c.type === 'tool' ? 1 : 2);
    return ctx.CARDS.filter((c) => own[c.id] > 0).sort((a, b) => order(a) - order(b) || a.name.localeCompare(b.name, 'he'));
  }
  // a suggested team: a mix of strengths (something that hides or squeezes, a strong swimmer, a light, a helper)
  function suggest(list) {
    const want = [['squeeze', 'hide'], ['strongswim', 'big', 'scare'], ['lights', 'camera', 'sense', 'night'], ['grab', 'rescue', 'regrow', 'cling', 'measure']];
    const out = [];
    // sea creatures and waterproof devices first (a land card now and then, for the fun of it)
    const sea = (x) => { const t = traitsOf(x); return t.has('reef') || t.has('wet') || t.has('rescue'); };
    const order = () => shuffle(list).sort((a, b) => (sea(b) ? 1 : 0) - (sea(a) ? 1 : 0) + (Math.random() < 0.12 ? 1 : 0));
    for (const w of shuffle(want)) {
      const c = order().find((x) => !out.includes(x) && w.some((k) => traitsOf(x).has(k)));
      if (c) out.push(c);
    }
    for (const c of order()) { if (out.length >= TEAM) break; if (!out.includes(c)) out.push(c); }
    return out.slice(0, TEAM);
  }

  /* ── setup screen */
  function renderSetup() {
    S = null;
    ctx.setTitle('משלחת לעומק');
    const mine = ownedCards();
    const starter = mine.length < TEAM;
    if (!pickSel.length) pickSel = (ST.team || []).map(card).filter((c) => c && (starter || mine.includes(c))).slice(0, TEAM);
    const pool = starter ? STARTER.map(card).filter(Boolean) : mine;
    if (starter && pickSel.length < TEAM) pickSel = pool.slice(0, TEAM);
    const shown = pool.filter((c) => filter === 'all' || (filter === 'reef' ? c.type === 'species' && c.biome === 'reef' : filter === 'tool' ? c.type === 'tool' : c.type === 'species' && c.biome !== 'reef'));
    const T_IC = { all: 'zones', reef: 'reef', tool: 'robot', land: 'leaf' };
    const tab = (v, t) => `<button class="ex-tab${filter === v ? ' sel' : ''}" data-ex="filter" data-v="${v}">${icon(T_IC[v])}${t}</button>`;
    root.innerHTML = `<section class="wl-screen ex-setup${kids ? ' ex-kids' : ''}">
      <div class="ex-sea" style="--top:${DEPTH_LOOK[0].top};--bot:${DEPTH_LOOK[1].bot}"><i class="ex-rays"></i>${bubbles(10)}
      <div class="ex-shead">
        <div class="ex-radio">${ROBO('happy')}<p>${starter ? 'עוד אין לכם מספיק קלפים, אז הבאתי צוות התחלה. בכל אתגר בים תבחרו מי מהצוות מתמודד, ותראו מה קורה. לפעמים זה מפתיע!' : 'בחרו ארבעה קלפים לצוות. כל קלף טוב במשהו אחר: מי מתחבא, מי שוחה חזק, מי מאיר בחושך. גם קלף של יבשה יכול להפתיע מתחת למים...'}</p></div>
        <div class="ex-stat">${I.star}<span>שיא: <b>${ST.best}</b></span><span>משלחות: <b>${ST.runs}</b></span><span>דגימות: <b>${ctx.tally('deep:samples')}</b></span></div>
      </div>
      <div class="ex-slots">${Array.from({ length: TEAM }, (_, i) => { const c = pickSel[i]; return c ? `<button class="ex-slot full" data-ex="unpick" data-k="${i}">${ctx.cardHTML(c)}<span class="ex-chips">${chipsOf(c).map((x) => `<i>${esc(x)}</i>`).join('')}</span></button>` : `<div class="ex-slot"><span>${i + 1}</span></div>`; }).join('')}</div>
      <div class="ex-srow">
        ${starter ? '' : `<div class="ex-tabs">${tab('all', 'הכול')}${tab('reef', 'שונית')}${tab('tool', 'כלים')}${tab('land', 'יבשה')}</div>`}
        ${starter ? '' : `<button class="wl-btn" data-ex="suggest">${I.shuffle} צוות מוצע</button>`}
        <button class="wl-btn gold ex-go" data-ex="go" ${pickSel.length === TEAM ? '' : 'disabled'}>${I.down} יוצאים לים</button>
      </div>
      ${starter ? '' : `<div class="ex-pool">${shown.map((c) => { const k = pickSel.indexOf(c); return `<button class="ex-pc${k >= 0 ? ' sel' : ''}" data-ex="pick" data-id="${esc(c.id)}">${ctx.cardHTML(c)}${k >= 0 ? `<b class="ex-num">${k + 1}</b>` : ''}</button>`; }).join('')}</div>`}
      </div></section>`;
  }

  /* ── a run */
  function genDepth(d) {
    const D = DEPTHS[d]; const n = kids ? D.kidsTiles : D.tiles;
    const mix = { ...D.mix }; let total = mix.sample + mix.challenge + mix.friend;
    while (total > n) { const k = mix.sample > 1 ? 'sample' : 'challenge'; mix[k]--; total--; }
    const tiles = [];
    const ch = shuffle(CHALLENGES.filter((c) => c.depths.includes(D.id)));
    for (let i = 0; i < mix.challenge; i++) tiles.push({ kind: 'challenge', data: ch[i % ch.length] });
    const sm = shuffle(SAMPLES[D.id]);
    for (let i = 0; i < mix.sample; i++) tiles.push({ kind: 'sample', data: sm[i % sm.length] });
    for (let i = 0; i < mix.friend; i++) tiles.push({ kind: 'friend', data: pick(FRIENDS) });
    if (S.rareAt === d) { const k = tiles.findIndex((t) => t.kind === 'sample'); tiles[k >= 0 ? k : 0] = { kind: 'rare', data: S.rare }; }
    return shuffle(tiles).map((t) => ({ ...t, open: false, peek: false, res: null }));
  }
  function start(teamIds) {
    const team = (teamIds || pickSel.map((c) => c.id)).map(card).filter(Boolean).slice(0, TEAM);
    if (team.length < TEAM) return false;
    ST.team = team.map((c) => c.id); save(); ctx.markUsed && ctx.markUsed('expedition');   // מסע החוקר: a dive starts
    S = { team: team.map((c) => ({ c, st: 'ready' })), depth: 0, tiles: [], bag: [], banked: [], lost: [], phase: 'flip', pending: -1,
      shield: false, peeked: {}, log: [], rare: pick(RARE), rareAt: 1 + rnd(NDEP - 1), rareGot: false, reached: 0, done: false };
    S.tiles[0] = genDepth(0);
    ctx.sfx('click');
    setRadio(kids ? 'יורדים למים! הפכו אריח בים. כשמגיע אתגר, בחרו מי מהצוות מתמודד איתו.' : 'יורדים למים! הפכו אריח. בכל אתגר תבחרו מי מהצוות מתמודד. אפשר לחזור לסירה מתי שרוצים, אבל מה שבשקית צף למעלה רק כשיורדים עמוק יותר או חוזרים.', 'happy');
    renderRun();
    return true;
  }
  const ready = () => S.team.filter((m) => m.st === 'ready');
  const cur = () => S.tiles[S.depth];
  function setRadio(text, mood = 'happy') { radio = { text, mood }; }
  function addSample(name, v, from) { S.bag.push({ name, v, from: from || 'sample' }); }

  function flip(i) {
    if (!S || S.done || S.phase !== 'flip') return;
    const t = cur()[i]; if (!t || t.open) return;
    t.open = true; flash = i; ctx.sfx('select');
    if (t.kind === 'sample') {
      addSample(t.data.name, t.data.v); t.res = 'win';
      setRadio(t.data.line, 'happy'); S.log.push({ ic: 'sample', text: t.data.name });
    } else if (t.kind === 'friend') {
      const f = t.data; t.res = 'win';
      if (f.effect === 'refresh') { const n = S.team.filter((m) => m.st === 'tired').length; S.team.forEach((m) => { if (m.st === 'tired') m.st = 'ready'; }); setRadio(f.line + (n ? '' : ' (אף אחד לא היה עייף, אבל ניקיון זה תמיד נעים.)'), 'happy'); }
      else if (f.effect === 'guide') { const sm = pick(SAMPLES[DEPTHS[S.depth].id]); addSample(sm.name, sm.v); setRadio(f.line, 'wow'); }
      else { S.shield = true; setRadio(f.line, 'wow'); }
      S.log.push({ ic: f.id, text: f.name });
    } else if (t.kind === 'challenge') {
      if (S.shield) {
        S.shield = false; t.res = 'win';
        setRadio(`${t.data.name}! אבל הדולפינים כאן: הם שוחים סביבנו, ועוברים את זה בלי שאף אחד מהצוות מתאמץ.`, 'wow');
        S.log.push({ ic: t.data.id, text: t.data.name + ' (הדולפינים עזרו)' });
      } else { S.phase = 'choose'; S.pending = i; setRadio(t.data.intro, 'oops'); }
    } else if (t.kind === 'rare') { S.phase = 'choose'; S.pending = i; setRadio(t.data.intro, 'wow'); }
    afterTurn();
  }
  function choose(k) {
    if (!S || S.done || S.phase !== 'choose') return;
    const m = S.team[k]; if (!m || m.st !== 'ready') return;
    const t = cur()[S.pending]; const data = t.data;
    const rule = ruleFor(data.rules, m.c);
    let r = rule.r; if (kids && r === 'boat') r = 'tired';
    if (r === 'tired') m.st = 'tired'; else if (r === 'boat') m.st = 'boat';
    // beginners: nobody is sent up to the boat in the middle; a card that would be just rests
    const line = kids && rule.r === 'boat'
      ? say('{N} [[ניסה|ניסתה|ניסו|ניסו]] מאוד, אבל מתחת למים זה לא [[המקום שלו|המקום שלה|המקום שלהם|המקום שלהן]]. {P} [[נח|נחה|נחים|נחות]] קצת בצד, ואחר כך [[ימשיך|תמשיך|ימשיכו|ימשיכו]].', m.c)
      : say(rule.l, m.c);
    if (t.kind === 'rare') { addSample(data.name, rule.v || data.v, 'rare'); S.rareGot = true; }
    else if (rule.v) addSample(PRIZE[data.id] || 'דגימה', rule.v, data.id);
    t.res = r; t.by = m.c.id;
    S.phase = 'flip'; S.pending = -1;
    setRadio(line, r === 'win' ? 'happy' : r === 'none' ? 'happy' : 'oops');
    S.log.push({ ic: t.kind === 'rare' ? data.id : data.id, text: `${data.name}: ${m.c.name}`, res: r });
    ctx.sfx(r === 'win' ? 'quizRight' : r === 'boat' ? 'quizWrong' : 'click');
    afterTurn();
  }
  function afterTurn() {
    if (S.phase === 'flip' && !ready().length) {
      // nobody can go on: the bag of this depth floats away (gently), what was sent up is safe
      S.lost = S.bag.slice(); S.bag = [];
      setRadio(S.lost.length ? 'כל הצוות צריך לנוח. השקית של העומק הזה צפה לה למעלה ונעלמה בין הגלים... לא נורא, נחזור לכאן. מה ששלחנו קודם לסירה שמור.' : 'כל הצוות צריך לנוח. חוזרים לסירה בשקט. מה ששלחנו קודם שמור.', 'oops');
      return finish(false);
    }
    renderRun();
  }
  function up() {   // go one depth deeper: the bag goes up to the boat
    if (!S || S.done || S.phase !== 'flip') return;
    if (S.depth >= NDEP - 1) return;
    if (!cur().some((t) => t.open)) { setRadio('קודם הפכו לפחות אריח אחד כאן. מי יודע מה מסתתר?', 'happy'); renderRun(); return; }
    S.banked.push(...S.bag); const sent = S.bag.length; S.bag = [];
    S.depth++; S.reached = Math.max(S.reached, S.depth);
    if (!S.tiles[S.depth]) S.tiles[S.depth] = genDepth(S.depth);
    ctx.sfx('pickup');
    let msg = `יורדים ${DEPTHS[S.depth].into}. ${sent ? (sent === 1 ? 'את הדגימה שלחתי לסירה בבלון. ' : `את ${sent} הדגימות שלחתי לסירה בבלון. `) : ''}כאן המים כהים יותר.`;
    if (DEPTHS[S.depth].id === 'cave') { msg = 'הגענו למערה! כאן חשוך ושקט, ומסתתרים יצורים של לילה. ' + (sent ? 'הדגימות כבר בסירה.' : ''); ctx.badge('deep:cave'); }
    setRadio(msg, 'wow');
    renderRun();
  }
  function back() {   // back up to the boat with everything
    if (!S || S.done || S.phase !== 'flip') return;
    S.banked.push(...S.bag); S.bag = [];
    setRadio('עולים לסירה. כל הדגימות איתנו!', 'happy');
    finish(true);
  }
  function peek() {
    if (!S || S.done || S.phase !== 'flip' || S.peeked[S.depth]) return;
    const who = ready().find((m) => traitsOf(m.c).has('sonar')); if (!who) return;
    const closed = cur().map((t, i) => [t, i]).filter(([t]) => !t.open && !t.peek);
    if (!closed.length) return;
    // a peek shows a challenge if there is one (that is the useful thing to know)
    const ch = closed.filter(([t]) => t.kind === 'challenge' || t.kind === 'rare');
    const [t] = pick(ch.length ? ch : closed); t.peek = true; S.peeked[S.depth] = true;
    ctx.sfx('select');
    setRadio(say('{N} [[הציץ|הציצה|הציצו|הציצו]] קדימה. סימנתי לכם אריח אחד: עכשיו יודעים מה מחכה שם.', who.c), 'wow');
    renderRun();
  }
  function finish(safe) {
    S.done = true; S.phase = 'end';
    const score = S.banked.reduce((s, x) => s + x.v, 0);
    const got = [];
    ST.runs++; const newBest = score > ST.best; if (newBest) ST.best = score; ST.deepest = Math.max(ST.deepest, S.reached); save();
    const total = ctx.tally('deep:samples', S.banked.length);
    const g = (earn) => { const f = ctx.badge(earn) || []; got.push(...f); };
    if (safe) g('deep:first');
    if (safe && S.reached >= 2 && S.team.every((m) => m.st !== 'boat')) g('deep:full');
    if (S.banked.some((x) => x.from === 'rare')) g('deep:rare');
    if (total >= 20) g('deep:samples');
    S.result = { safe, score, newBest, got };
    later(() => renderRun(), 50);
    if (score >= 8) later(() => ctx.confetti(root.querySelector('.ex-sum'), 40), 400);
  }

  /* ── drawing */
  function bubbles(n) { let s = '<div class="ex-bub">'; for (let i = 0; i < n; i++) s += `<i style="--x:${(i * 37) % 100}%;--d:${(i * 0.83) % 6}s;--s:${0.5 + ((i * 7) % 5) / 6}"></i>`; return s + '</div>'; }
  function tileHTML(t, i) {
    if (!t.open) {
      const pk = t.peek ? `<span class="ex-peek">${t.kind === 'challenge' ? I[t.data.ic] : TILE_IC[t.data.id] || I.sample}</span>` : '';
      return `<button class="ex-tile back${t.peek ? ' peeked' : ''}" data-ex="flip" data-i="${i}" aria-label="אריח סגור">${I.tile}${pk}</button>`;
    }
    const ic = t.kind === 'challenge' ? I[t.data.ic] : t.kind === 'sample' ? I.sample : TILE_IC[t.data.id] || I.star;
    const by = t.by ? card(t.by) : null;
    const pending = S.phase === 'choose' && S.pending === i;
    return `<div class="ex-tile open k-${t.kind} r-${t.res || 'wait'}${pending ? ' pending' : ''}${flash === i ? ' just' : ''}">${ic}<b>${esc(t.data.name)}</b>${by ? `<small>${esc(by.name)}</small>` : ''}</div>`;
  }
  function memberHTML(m, k) {
    const can = S.phase === 'choose' && m.st === 'ready';
    const tag = m.st === 'tired' ? `<span class="ex-tag tired">${I.zzz}עייף</span>` : m.st === 'boat' ? `<span class="ex-tag boat">${I.boat}בסירה</span>` : '';
    return `<button class="ex-mem st-${m.st}${can ? ' can' : ''}" data-ex="choose" data-k="${k}" ${can ? '' : 'tabindex="-1"'} aria-label="${esc(m.c.name)}">${ctx.cardHTML(m.c)}${tag}
      <span class="ex-chips">${chipsOf(m.c).map((x) => `<i>${esc(x)}</i>`).join('')}</span></button>`;
  }
  function renderRun() {
    if (!S) return renderSetup();
    const L = DEPTH_LOOK[Math.min(S.depth, DEPTH_LOOK.length - 1)];
    const bankedV = S.banked.reduce((s, x) => s + x.v, 0), bagV = S.bag.reduce((s, x) => s + x.v, 0);
    const sonar = !S.peeked[S.depth] && S.phase === 'flip' && ready().find((m) => traitsOf(m.c).has('sonar'));
    const canUp = S.phase === 'flip' && S.depth < NDEP - 1;
    let body;
    if (S.done) body = summaryHTML();
    else body = `
      <div class="ex-mid">
        <aside class="ex-gauge">${DEPTHS.slice(0, NDEP).map((d, i) => `<div class="ex-lv${i === S.depth ? ' here' : i < S.depth ? ' past' : ''}"><i></i><span>${d.name}</span></div>`).join('')}</aside>
        <div class="ex-board">
          <h3 class="ex-dname">${esc(DEPTHS[S.depth].name)}</h3>
          <div class="ex-tiles n${cur().length}">${cur().map(tileHTML).join('')}</div>
          <div class="ex-bag">${I.sample}<span>בשקית: ${S.bag.length ? S.bag.map((x) => `<i>${esc(x.name)}</i>`).join('') : '<em>עוד ריקה</em>'}</span></div>
        </div>
      </div>
      <div class="ex-radio live">${ROBO(radio ? radio.mood : 'happy')}<p>${esc(radio ? radio.text : '')}</p></div>
      <div class="ex-actions">${S.phase === 'choose' ? `<span class="ex-hint">${I.team} בחרו קלף מהצוות</span>` : `
        ${sonar ? `<button class="wl-btn" data-ex="peek">${I.eye} הצצה עם ${esc(sonar.c.name)}</button>` : ''}
        ${canUp ? `<button class="wl-btn go" data-ex="up">${I.down} לרדת ${esc(DEPTHS[S.depth + 1].into)}</button>` : ''}
        <button class="wl-btn gold" data-ex="back">${I.up} חזרה לסירה${bagV ? ` (+${bagV})` : ''}</button>`}</div>
      <div class="ex-team">${S.team.map(memberHTML).join('')}</div>`;
    root.innerHTML = `<section class="wl-screen ex-run${kids ? ' ex-kids' : ''}${S.phase === 'choose' ? ' choosing' : ''}">
      <div class="ex-sea" style="--top:${L.top};--bot:${L.bot};--dk:${S.depth / 3}"><i class="ex-rays"></i>${bubbles(12)}
        <header class="ex-top"><span class="ex-boat">${I.boat}<span>בסירה: <b>${bankedV}</b> נקודות${S.banked.length ? ` · ${S.banked.length} דגימות` : ''}</span></span>
          <span class="ex-wave"></span></header>
        ${body}
      </div></section>`;
    flash = null;
  }
  function summaryHTML() {
    const R = S.result;
    const facts = DEPTHS.slice(0, S.reached + 1).map((d) => `<li>${I.star}<span><b>${esc(d.name)}:</b> ${esc(d.fact)}</span></li>`).join('');
    const rare = S.banked.find((x) => x.from === 'rare') ? `<li>${I.whale}<span><b>${esc(S.rare.name)}</b> ${esc(S.rare.fact)}</span></li>` : '';
    return `<div class="ex-sum paper">
      <div class="ex-radio">${ROBO(R.safe ? 'happy' : 'oops')}<p>${esc(radio ? radio.text : '')}</p></div>
      <h2>${R.safe ? 'חזרנו בשלום!' : 'המשלחת הסתיימה'}</h2>
      <div class="ex-score"><b>${R.score}</b><span>נקודות</span>${R.newBest ? '<em>שיא חדש!</em>' : `<small>השיא: ${ST.best}</small>`}</div>
      ${S.banked.length ? `<div class="ex-got">${S.banked.map((x) => `<i class="${x.from === 'rare' ? 'rare' : ''}">${esc(x.name)} <b>${x.v}</b></i>`).join('')}</div>` : '<p class="ex-none">הפעם לא הבאנו דגימות. בפעם הבאה אולי כדאי לחזור לסירה קצת קודם.</p>'}
      ${S.lost.length ? `<p class="ex-lost">צפו למעלה: ${S.lost.map((x) => esc(x.name)).join(', ')}</p>` : ''}
      <h4>מה למדנו בדרך</h4><ul class="ex-facts">${facts}${rare}</ul>
      ${R.got.length ? `<p class="ex-badges">${I.star} תג חדש: ${R.got.map((b) => `<b>${esc(b.name)}</b>`).join(', ')}</p>` : ''}
      <div class="wl-row"><button class="wl-btn gold" data-ex="again">${I.down} עוד משלחת, אותו צוות</button><button class="wl-btn" data-ex="newteam">${I.team} צוות אחר</button><button class="wl-btn" data-ex="exit">${icon('arrowR')}חזרה</button></div>
    </div>`;
  }

  /* ── input */
  on(root, 'click', (e) => {
    const b = e.target.closest('[data-ex]'); if (!b || !alive) return;
    const a = b.dataset.ex;
    if (a === 'filter') { filter = b.dataset.v; ctx.sfx('click'); renderSetup(); }
    else if (a === 'pick') {
      const c = card(b.dataset.id); const k = pickSel.indexOf(c);
      if (k >= 0) pickSel.splice(k, 1); else if (pickSel.length < TEAM) pickSel.push(c); else { ctx.toast(`<span>הצוות מלא. לחצו על קלף בצוות כדי להוציא אותו.</span>`); return; }
      ctx.sfx('select'); renderSetup();
    } else if (a === 'unpick') { pickSel.splice(+b.dataset.k, 1); ctx.sfx('click'); renderSetup(); }
    else if (a === 'suggest') { pickSel = suggest(ownedCards()); ctx.sfx('select'); renderSetup(); }
    else if (a === 'go') start();
    else if (a === 'flip') flip(+b.dataset.i);
    else if (a === 'choose') choose(+b.dataset.k);
    else if (a === 'up') up();
    else if (a === 'back') back();
    else if (a === 'peek') peek();
    else if (a === 'again') start(ST.team);
    else if (a === 'newteam') { S = null; renderSetup(); }
    else if (a === 'exit') ctx.exit();
  });

  try {
    window.__exDebug = {
      start: (ids) => start(ids), flip: (i) => flip(i), choose: (k) => choose(k), up: () => up(), back: () => back(), peek: () => peek(),
      state: () => S && ({ depth: S.depth, phase: S.phase, done: S.done, bag: S.bag.map((x) => x.name + ':' + x.v), banked: S.banked.map((x) => x.name + ':' + x.v),
        team: S.team.map((m) => m.c.id + ':' + m.st), tiles: cur().map((t) => (t.open ? '+' : '-') + t.kind + ':' + t.data.id + (t.res ? '=' + t.res : '')),
        radio: radio && radio.text, result: S.result }),
      traits: (id) => [...traitsOf(card(id))],
      line: (chId, cardId) => { const ch = CHALLENGES.find((c) => c.id === chId) || RARE.find((c) => c.id === chId); const c = card(cardId); const r = ruleFor(ch.rules, c); return r.r + ' · ' + say(r.l, c); },
    };
  } catch (e) { /* */ }

  if (opts.team) start(opts.team); else renderSetup();
  return {
    destroy() { alive = false; offs.forEach((f) => f()); try { if (window.__exDebug) delete window.__exDebug; } catch (e) { /* */ } },
  };
}

/* ───────────────────────────── CSS */
function injectCss() {
  if (document.getElementById(CSS_ID)) return;
  const st = document.createElement('style'); st.id = CSS_ID;
  // the hub's own rules are '#wol-learn.wol-learn …' (src/learn/hub/): the game's rules get the same weight
  st.textContent = CSS_TEXT.replace(/\.wol-learn/g, '#wol-learn.wol-learn');
  document.head.appendChild(st);
}
const CSS_TEXT = `
.wol-learn .ex-setup,.wol-learn .ex-run{padding:0;gap:0;height:100%;min-height:0;width:100%;align-items:stretch}
.wol-learn .ex-sea{position:relative;flex:1;min-height:0;width:100%;overflow-y:auto;display:flex;flex-direction:column;align-items:center;gap:.55em;padding:.6em 1.2em .8em;overflow:hidden;
  background:linear-gradient(180deg,var(--top),var(--bot));color:#eaf6fa;transition:background .8s}
.wol-learn .ex-rays{position:absolute;inset:-10% 0 auto 0;height:70%;pointer-events:none;opacity:calc(.55 - var(--dk,0) * .4);
  background:repeating-linear-gradient(100deg,rgba(255,255,255,.07) 0 4%,transparent 4% 11%);-webkit-mask:linear-gradient(180deg,#000,transparent);mask:linear-gradient(180deg,#000,transparent);animation:ex-sway 9s ease-in-out infinite alternate}
@keyframes ex-sway{to{transform:translateX(4%) skewX(-4deg)}}
.wol-learn .ex-bub{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.wol-learn .ex-bub i{position:absolute;bottom:-20px;left:var(--x);width:calc(10px * var(--s));height:calc(10px * var(--s));border-radius:50%;border:1.5px solid rgba(220,250,255,.45);animation:ex-rise 8s linear var(--d) infinite}
@keyframes ex-rise{to{transform:translate(12px,-110vh)}}
.wol-learn .ex-sea>*:not(.ex-rays):not(.ex-bub){position:relative;z-index:1}
/* radio with רובו־דע */
.wol-learn .ex-radio{display:flex;align-items:center;gap:.7em;max-width:52em;width:100%;padding:.45em .9em;border-radius:1em;background:rgba(10,30,44,.62);box-shadow:inset 0 0 0 1px rgba(111,240,255,.25)}
.wol-learn .ex-radio p{margin:0;font-size:1.02em;line-height:1.45;color:#eaf6fa}
.wol-learn .ex-robo{width:3.2em;height:3.2em;flex:none}
.wol-learn .ex-robo .eyes{animation:ex-blink 5s infinite}
@keyframes ex-blink{0%,94%,100%{transform:none}96%{transform:scaleY(.1)}}
.wol-learn .ex-robo .eyes{transform-origin:32px 30px}
.wol-learn .ex-radio.live p{animation:ex-in .35s ease-out}
@keyframes ex-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
/* setup */
.wol-learn .ex-shead{display:flex;gap:.8em;align-items:center;width:100%;max-width:64em;justify-content:center;flex-wrap:wrap}
.wol-learn .ex-stat{display:flex;gap:.9em;align-items:center;padding:.4em .9em;border-radius:99px;background:rgba(10,30,44,.5);font-size:.92em}
.wol-learn .ex-stat .wl-ic{width:1.1em;height:1.1em;color:#f6cf72}
.wol-learn .ex-slots{--sw:min(7.4em,19vh);display:flex;gap:.8em;justify-content:center;align-items:flex-start}
.wol-learn .ex-slot{position:relative;display:flex;flex-direction:column;align-items:center;gap:.25em;width:calc(var(--sw) + .4em);min-height:calc(var(--sw) * 1.42);border-radius:.8em;border:2px dashed rgba(234,246,250,.4);justify-content:center;color:rgba(234,246,250,.6);font-weight:800}
.wol-learn .ex-slot>span{font-size:1.3em}
.wol-learn .ex-slot.full{border:0;font-size:1em;background:none;cursor:pointer}
.wol-learn .ex-mem .wl-card{--cw:min(6.8em,13.5vh)}
.wol-learn .ex-slot .wl-card{--cw:var(--sw)}
.wol-learn .ex-chips{display:flex;flex-wrap:wrap;gap:.2em;justify-content:center;max-width:9em}
.wol-learn .ex-chips i{font-style:normal;font-size:.72em;padding:.05em .45em;border-radius:99px;background:rgba(10,30,44,.7);color:#bff4ff;white-space:nowrap}
.wol-learn .ex-srow{display:flex;gap:.6em;align-items:center;flex-wrap:wrap;justify-content:center}
.wol-learn .ex-tabs{display:flex;gap:.25em;padding:.25em;border-radius:99px;background:rgba(10,30,44,.55)}
.wol-learn .ex-tab{min-height:34px;padding:.3em .95em;border-radius:99px;color:#d6eef4;font-weight:700}
.wol-learn .ex-tab.sel{background:#eaf6fa;color:#0f3a52}
.wol-learn .ex-pool{display:grid;grid-template-columns:repeat(auto-fill,minmax(6.2em,1fr));justify-items:center;gap:.55em;width:100%;max-width:70em;overflow:auto;padding:.3em .3em 1em;flex:1;min-height:6em}
.wol-learn .ex-pc{position:relative;padding:0;border-radius:.7em;transition:transform .15s}
.wol-learn .ex-pc .wl-card{--cw:5.4em}
.wol-learn .ex-pc:hover{transform:translateY(-.3em)}
.wol-learn .ex-pc.sel{filter:drop-shadow(0 0 .5em #6ff0ff)}
.wol-learn .ex-num{position:absolute;top:-.4em;left:-.3em;width:1.6em;height:1.6em;border-radius:50%;display:grid;place-items:center;background:#f6cf72;color:#3a2608;font-weight:900}
/* the run */
.wol-learn .ex-top{width:100%;display:flex;align-items:center;justify-content:center;position:relative}
.wol-learn .ex-boat{display:flex;align-items:center;gap:.5em;padding:.3em 1em;border-radius:99px;background:rgba(250,246,230,.92);color:#2a3a44;font-weight:700;box-shadow:0 .3em .7em rgba(0,0,0,.25)}
.wol-learn .ex-boat .wl-ic{width:1.6em;height:1.6em;color:#c8553a}
.wol-learn .ex-mid{display:flex;gap:1em;align-items:stretch;width:100%;max-width:62em;justify-content:center}
.wol-learn .ex-gauge{display:flex;flex-direction:column;justify-content:space-between;padding:.4em .2em;min-width:7.5em}
.wol-learn .ex-lv{display:flex;align-items:center;gap:.45em;font-size:.86em;color:rgba(234,246,250,.55)}
.wol-learn .ex-lv i{width:.8em;height:.8em;border-radius:50%;border:2px solid currentColor}
.wol-learn .ex-lv.past{color:rgba(234,246,250,.8)}.wol-learn .ex-lv.past i{background:currentColor}
.wol-learn .ex-lv.here{color:#f6cf72;font-weight:800}.wol-learn .ex-lv.here i{background:#f6cf72;box-shadow:0 0 .6em #f6cf72}
.wol-learn .ex-board{flex:1;display:flex;flex-direction:column;align-items:center;gap:.45em}
.wol-learn .ex-dname{margin:0;font-family:var(--serif);font-size:1.4em;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.4)}
.wol-learn .ex-tiles{display:flex;gap:.6em;flex-wrap:wrap;justify-content:center}
.wol-learn .ex-tile{position:relative;width:min(6.6em,14vh);height:min(6.6em,14vh);border-radius:1em;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.2em;text-align:center;padding:.3em}
.wol-learn .ex-tile.back{background:linear-gradient(160deg,rgba(255,255,255,.22),rgba(255,255,255,.06));box-shadow:inset 0 0 0 2px rgba(220,250,255,.35),0 .4em .8em rgba(0,0,0,.25);color:rgba(220,250,255,.55);cursor:pointer;transition:transform .15s,box-shadow .15s}
.wol-learn .ex-tile.back .wl-ic{width:2.4em;height:2.4em}
.wol-learn .ex-tile.back:hover{transform:translateY(-.25em);box-shadow:inset 0 0 0 2px #bff4ff,0 .6em 1em rgba(0,0,0,.3)}
.wol-learn .ex-peek{position:absolute;inset:auto .3em .3em auto;width:1.8em;height:1.8em;border-radius:50%;display:grid;place-items:center;background:#f6cf72;color:#3a2608}
.wol-learn .ex-peek .wl-ic{width:1.2em;height:1.2em}
.wol-learn .ex-tile.open{background:rgba(250,246,230,.94);color:#22404f;box-shadow:0 .4em .8em rgba(0,0,0,.28)}
.wol-learn .ex-tile.open .wl-ic{width:2em;height:2em}
.wol-learn .ex-tile.open b{font-size:.74em;line-height:1.15}
.wol-learn .ex-tile.open small{font-size:.66em;color:#5a6a72}
.wol-learn .ex-tile.k-challenge .wl-ic{color:#c8553a}.wol-learn .ex-tile.k-sample .wl-ic{color:#d98e26}.wol-learn .ex-tile.k-friend .wl-ic{color:#2f8a7a}.wol-learn .ex-tile.k-rare .wl-ic{color:#7a4ac0}
.wol-learn .ex-tile.r-boat{background:rgba(232,220,214,.94)}
.wol-learn .ex-tile.pending{animation:ex-pulse 1.2s ease-in-out infinite;box-shadow:0 0 0 .2em #f6cf72,0 .4em .8em rgba(0,0,0,.28)}
@keyframes ex-pulse{50%{transform:scale(1.06)}}
.wol-learn .ex-tile.just{animation:ex-flip .45s ease-out}
@keyframes ex-flip{from{transform:rotateY(90deg)}to{transform:none}}
.wol-learn .ex-bag{display:flex;align-items:center;gap:.4em;font-size:.88em;min-height:1.8em}
.wol-learn .ex-bag .wl-ic{width:1.3em;height:1.3em;color:#f6cf72}
.wol-learn .ex-bag i{font-style:normal;display:inline-block;margin-inline-start:.3em;padding:.05em .55em;border-radius:99px;background:rgba(250,246,230,.18)}
.wol-learn .ex-bag em{opacity:.7}
.wol-learn .ex-actions{display:flex;gap:.6em;flex-wrap:wrap;justify-content:center;min-height:2.6em;align-items:center}
.wol-learn .ex-actions .wl-btn{min-height:36px}
.wol-learn .ex-hint{display:flex;align-items:center;gap:.4em;font-weight:800;color:#f6cf72;animation:ex-pulse 1.4s ease-in-out infinite}
.wol-learn .ex-hint .wl-ic{width:1.4em;height:1.4em}
.wol-learn .ex-team{display:flex;gap:.8em;justify-content:center;align-items:flex-start;margin-top:.2em}
.wol-learn .ex-run .ex-mem .wl-card{--cw:min(8em,17vh)}
.wol-learn .ex-mem{position:relative;display:flex;flex-direction:column;align-items:center;gap:.2em;padding:0;border-radius:.8em;transition:transform .2s,filter .2s}
.wol-learn .ex-run.choosing .ex-mem.can{cursor:pointer;filter:drop-shadow(0 0 .55em #6ff0ff)}
.wol-learn .ex-run.choosing .ex-mem.can:hover{transform:translateY(-.5em)}
.wol-learn .ex-mem.st-tired .wl-card{filter:saturate(.4) brightness(.75)}
.wol-learn .ex-mem.st-boat .wl-card{filter:grayscale(1) brightness(.6);opacity:.6}
.wol-learn .ex-tag{position:absolute;top:35%;left:50%;transform:translate(-50%,-50%) rotate(-6deg);display:flex;align-items:center;gap:.25em;padding:.15em .6em;border-radius:.4em;font-weight:900;font-size:.85em;box-shadow:0 .2em .4em rgba(0,0,0,.35);white-space:nowrap}
.wol-learn .ex-tag .wl-ic{width:1.1em;height:1.1em}
.wol-learn .ex-tag.tired{background:#f6cf72;color:#3a2608}.wol-learn .ex-tag.boat{background:#eaf6fa;color:#c8553a}
/* summary */
.wol-learn .ex-sum{display:flex;flex-direction:column;align-items:center;gap:.5em;max-width:46em;width:100%;padding:1em 1.4em;border-radius:1.2em;color:#22404f;overflow:auto}
.wol-learn .ex-sum{flex:0 1 auto;min-height:0}
.wol-learn .ex-sum>.wl-row{position:sticky;bottom:-1em;z-index:2;align-self:stretch;margin:0 -1.4em -1em;padding:.7em 1.4em .9em;background:linear-gradient(180deg,rgba(244,236,214,0),var(--paper) 38%)}
.wol-learn .ex-sum .ex-radio{background:#163a4f}
.wol-learn .ex-sum h2{margin:0;font-family:var(--serif);font-size:1.8em;color:#1f5a72}
.wol-learn .ex-score{display:flex;align-items:baseline;gap:.4em}
.wol-learn .ex-score b{font-size:2.6em;color:#d98e26;line-height:1}
.wol-learn .ex-score em{font-style:normal;font-weight:900;color:#2f8a4a}
.wol-learn .ex-got{display:flex;flex-wrap:wrap;gap:.35em;justify-content:center}
.wol-learn .ex-got i{font-style:normal;padding:.2em .7em;border-radius:99px;background:#e8f2ec;font-size:.9em}
.wol-learn .ex-got i.rare{background:#efe4fb;color:#5a2ea0;font-weight:800}
.wol-learn .ex-got b{color:#d98e26}
.wol-learn .ex-lost,.wol-learn .ex-none{margin:0;font-size:.9em;color:#6a7a82}
.wol-learn .ex-sum h4{margin:.3em 0 0;color:#1f5a72}
.wol-learn .ex-facts{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.35em;max-width:40em}
.wol-learn .ex-facts li{display:flex;gap:.5em;align-items:flex-start;font-size:.95em;line-height:1.45}
.wol-learn .ex-facts .wl-ic{width:1.1em;height:1.1em;color:#d98e26;flex:none;margin-top:.2em}
.wol-learn .ex-badges{margin:0;font-weight:700;color:#5a3a8a}.wol-learn .ex-badges .wl-ic{width:1.1em;height:1.1em;vertical-align:-.15em}
/* beginners: bigger text */
.wol-learn .ex-kids .ex-radio p{font-size:1.15em}.wol-learn .ex-kids .ex-tile.open b{font-size:.84em}
/* small screens */
@media (max-height:620px){
  .wol-learn .ex-sea{gap:.35em;padding:.4em .8em .5em}
  .wol-learn .ex-radio{padding:.3em .7em}.wol-learn .ex-radio p{font-size:.92em}.wol-learn .ex-robo{width:2.6em;height:2.6em}
  .wol-learn .ex-dname{font-size:1.15em}
  .wol-learn .ex-mem .wl-card{--cw:min(6em,13vh)}
  .wol-learn .ex-run .ex-mem .wl-card{--cw:min(7em,16.5vh)}
  .wol-learn .ex-gauge{min-width:6.4em}
}
@media (max-width:760px){.wol-learn .ex-gauge{display:none}}
@media (prefers-reduced-motion:reduce){.wol-learn .ex-rays,.wol-learn .ex-bub i,.wol-learn .ex-tile.pending,.wol-learn .ex-hint,.wol-learn .ex-robo .eyes{animation:none}}
`;
