// מרכז הלמידה – the card album: the bar (tabs, sets, legend, packs, duel), the grid part by part, the sets panel,
// the torah edition's source cards, a card's zoom, the "מה רואים על הקלף?" legend, and closing the modal.
// Exports: createAlbum(ctx) → { renderAlbum, showSets, onResize, szoom, zoom, cardLegend, closeModal }; it also adds
// ctx.filter (the album page shown) and ctx.setsOpen (the sets panel) for index.js.
// Needs from ctx (index.js): main, modal, S, sfx, toast, srcOn, collection, ownsIn, setProg, checkSets, open_, screen,
// opensLeft (packs.js).
import { chosenFrame } from '../../core/badges-store.js';
import { TORAH, sourcesOn } from '../../core/edition.js';
import { ownedSources } from '../../core/sources-store.js';
import { gw } from '../../data/common.js';
import { SOURCE_ART } from '../../data/source-art.js';
import { EARN_TEXT, SHIRA, SOURCE_CARDS } from '../../data/torah.js';
import { stampsHTML } from '../../ui/threads-ui.js';
import { icon } from '../../ui/ui.js';
import { IC, KEYS_LAND, OPEN_PER_DAY, RARITY_GEMS, RARITY_MORE, RARITY_NAMES, STAT_HELP, STAT_ICON, STAT_NAMES, esc } from './base.js';
import { IC_GEM, IC_KEY, cardHTML, gems } from './card-html.js';
import { CARD, CARDS, IC_SCROLL, SETS, SET_BY, SET_WHERE, activeSets, setsOf } from './cards.js';
import { ZONE_IDS, ZONE_LOOK } from '../../data/zones.js';

export function createAlbum(ctx) {
  const { main, modal, S, sfx, toast, srcOn, collection, ownsIn, setProg, checkSets } = ctx;
  const opensLeft = () => ctx.opensLeft();   // packs.js (made after this part)
  /* ── album */
  let filter = 'all';
  const setDots = (st) => { const has = ownsIn(st); return st.cards.map((c) => `<i class="${has(c) ? 'on' : ''}${c.rarity === 'epic' || c.rarity === 'rare' ? ' r' : ''}"></i>`).join(''); };
  // the sets live in a panel that opens from the "סדרות" button, so the album page is mostly cards
  let setsOpen = false;
  // index.js (navigation, the events table, the games' toAlbum) reads and sets these two through ctx
  Object.defineProperties(ctx, {
    filter: { get: () => filter, set: (v) => { filter = v; }, enumerable: true },
    setsOpen: { get: () => setsOpen, set: (v) => { setsOpen = v; }, enumerable: true },
  });
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
  const ALBUM_PARTS = [...ZONE_IDS.map((z) => [z, ZONE_LOOK[z].short, ZONE_LOOK[z].color]), ['tech', 'טכנולוגיה', '#2c5f8f']];
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
    const TAB_IC = { all: 'zones', tech: 'robot', src: 'scroll', ...Object.fromEntries(ZONE_IDS.map((z) => [z, z])) };
    const tab = (v, t) => `<button class="wl-tab${filter === v ? ' sel' : ''}" data-wl="filter" data-v="${v}" aria-pressed="${filter === v}">${icon(TAB_IC[v])}${t}</button>`;
    const sets = activeSets(), setsDone = sets.filter((st) => setProg(st).done).length;
    const late = S.packs && !opensLeft();
    main.innerHTML = `<section class="wl-screen wl-album">
      <div class="wl-abar paper">
        <div class="wl-count" title="אספתם ${have} מתוך ${total} קלפים"><b><span class="wl-cw">אספתם </span>${have} <span class="wl-cof">מתוך</span> ${total}</b><div class="wl-meter"><i style="width:${Math.round((have / total) * 100)}%"></i></div></div>
        <div class="wl-tabs">${tab('all', 'הכול')}${ZONE_IDS.map((z) => tab(z, ZONE_LOOK[z].short)).join('')}${tab('tech', 'טכנולוגיה')}${srcOn() ? tab('src', 'מן המקורות') : ''}</div>
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
  const onResize = () => { clearTimeout(fitT); fitT = setTimeout(() => { if (ctx.open_ && ctx.screen === 'album') fitBar(); }, 80); };
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
      : `<b>בונוס קטן:</b> במשחק "מחזיקים את היער", אם ${gw(id, 'הוא מתחבר', 'היא מתחברת', 'הם מתחברים', 'הן מתחברות')} בחוט זהב כשמניחים ${it} – עוד נקודת חִיּוּת אחת.`;
    return `<div class="wl-mpow r-${c.rarity}"><span class="wl-powi">${c.rarity === 'epic' ? IC_KEY : IC.star}</span><span>${txt}</span></div>`;
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
      ['x-power', 'נדירות במשחק', `<span class="wl-lp e"><b>נדיר מאוד = מין מפתח.</b> כוח מיוחד במשחק "מחזיקים את היער": שומר על היער פעם אחת.</span><span class="wl-lp r"><b>נדיר:</b> בונוס קטן – עוד נקודת חִיּוּת אחת.</span>`],
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
  return { renderAlbum, showSets, onResize, szoom, zoom, cardLegend, closeModal };
}
