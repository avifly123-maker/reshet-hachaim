// מחזיקים את היער – drawing: the message line and the owl's bubble (msg, say), the setup screen (the three places), the
// game screen, the top bar, the board with its gold threads (SVG), the side panel (the event card, its outcome) and the
// hand.
// Gives K: msg, say, renderSetup, renderGame, render, renderBoard, drawThreads, renderHand.
// Takes from K: ctx, root, $, thresholds, biomeInfo, ST, Y, kids, ROWN, rowSlots, bestMove, hintText, totals, C,
//   keyCharged, rareReady, legal, slotRow, later, icOf, esc, needOf, turnsToEvent, evName, reef, ROWSH, rowOfCard,
//   canUse.
// Functions of later parts through late(): cleanupDrag.
// Shared state it reads or changes: K.S, K.biome, K.sel, K.drag, K.ro, K.seenThreads, K.quiet.
import { tileIcon } from '../../../ui/icons-hub.js';
import { icon } from '../../../ui/ui.js';
import { BIOMES, BNAME, late, ROW_SUB } from './data.js';
import { EV, TOOL_FX } from './events.js';
import { I, OWL } from './icons.js';

export function createRender(K) {
  const { ctx, root, $, thresholds, biomeInfo, ST, Y, kids, ROWN, rowSlots, bestMove, hintText, totals, C,
    keyCharged, rareReady, legal, slotRow, later, icOf, esc, needOf, turnsToEvent, evName, reef, ROWSH, rowOfCard,
    canUse } = K;
  const cleanupDrag = late(K, 'cleanupDrag');   // made by a later part

  /* ── rendering */
  function msg(kind, html) { if (K.quiet) return; const m = $('.kf-msg'); if (m) m.innerHTML = `<div class="${kind}">${html}</div>`; if (K.S) K.S.lastMsg = { kind, html }; }
  function say(html) { if (K.S) K.S.says = html; if (K.quiet) return; const b = $('.kf-bub'); if (b) { b.innerHTML = html; b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; } }

  // "⭐ 7 · ⭐⭐ 12 · ⭐⭐⭐ 17" – lit when reached (life = current vitality, or null on the setup screen)
  function goalStars(life = null) {
    return thresholds().map((t, i) => `<span class="kf-gs${life != null && life >= t ? ' on' : ''}" title="${i + 1} ${i ? 'כוכבים' : 'כוכב'} ב-${t} חִיּוּת"><i>${Array.from({ length: i + 1 }, () => I.star).join('')}</i>ב-${t}</span>`).join('');
  }
  function renderSetup() {
    K.S = null; K.sel = null; cleanupDrag();
    ctx.setTitle('מחזיקים את היער');
    const tile = (b) => {
      const { mine, add } = biomeInfo(b);
      const sp = mine.filter((c) => c.type === 'species');
      const show = (sp.length >= 3 ? sp : ctx.CARDS.filter((c) => c.biome === b && c.art)).slice(0, 3);
      const best = ST.best[b] || 0;
      return `<button class="kf-bt paper${b === K.biome ? ' on' : ''}" data-b="${b}">
        <h2>${tileIcon(b, 'wl-tic')}${BNAME[b]}</h2>
        <div class="kf-fan">${show.map((c) => ctx.cardHTML(c)).join('')}</div>
        <p>${mine.length ? `<b>${mine.length}</b> קלפים שלכם מתאימים` : 'עוד אין לכם קלפים מהמקום הזה'}${add ? `<br>ועוד ${add} קלפים שאולים מתוך ערכת ההתחלה` : ''}</p>
        <span class="kf-best">${[0, 1, 2].map((k) => `<span class="${k < best ? 'on' : ''}">${I.star}</span>`).join('')}</span>
      </button>`;
    };
    root.innerHTML = `<section class="wl-screen kf-pick">
      <div class="kf-phead"><h1>${tileIcon('keep', 'wl-tic')}מחזיקים את היער</h1><p>בונים יער מהקלפים שלכם, ועוזרים לו לעבור את מה שהטבע מביא.</p></div>
      <div class="kf-biomes">${BIOMES.map(tile).join('')}</div>
      <div class="kf-goalbox paper">
        <div class="kf-hgoal">${I.target}<div><small>המטרה</small><b>${Y('לשמור על היער חי ובריא', 'לשמור על השונית חיה ובריאה')} במשך ${kids ? 5 : 8} אירועים של הטבע</b></div></div>
        <div class="kf-gline">${goalStars()}<span class="kf-glose">${I.wilt}פחות מ-${thresholds()[0]} חִיּוּת בסוף – ${Y('היער לא החזיק', 'השונית לא החזיקה')} מעמד</span></div>
      </div>
      <div class="kf-pbtns"><button class="wl-btn" data-a="how">${I.quest}<span>איך משחקים?</span></button>
      <button class="wl-btn go" data-a="start">יוצאים ל${BNAME[K.biome]}!${icon('arrowL')}</button></div>
    </section>`;
  }

  function renderGame() {
    ctx.setTitle(`מחזיקים את היער · ${BNAME[K.S.biome]}`);
    root.innerHTML = `<section class="wl-screen kf-game">
      <div class="kf-bar"></div>
      <div class="kf-mid">
        <div class="kf-board paper">${[0, 1, 2].map((r) => `<div class="kf-row" data-r="${r}"><div class="kf-rl"><b>${ROWN()[r]}</b><small>${ROW_SUB[K.S.biome][r]}</small></div><div class="kf-slots">${rowSlots(r).map((k) => `<div class="kf-slot" data-s="${k}"></div>`).join('')}</div></div>`).join('')}<svg class="kf-svg" xmlns="http://www.w3.org/2000/svg"></svg></div>
        <aside class="kf-side"><div class="kf-evhead"></div><div class="kf-evtop"></div><div class="kf-info paper"></div><div class="kf-cont"></div>
          <div class="kf-owl">${OWL}<div class="kf-bub"></div></div></aside>
      </div>
      <div class="kf-msg"></div>
      <div class="kf-bottom"><div class="kf-deck"></div><div class="kf-hand"></div><div class="kf-acts"></div></div>
      <div class="kf-done" hidden></div>
    </section>`;
    if (typeof ResizeObserver !== 'undefined') { if (K.ro) K.ro.disconnect(); K.ro = new ResizeObserver(() => drawThreads(false)); K.ro.observe($('.kf-board')); }
    msg('tip', `${I.life}<span>${kids ? `בחרו קלף מלמטה ושימו אותו ${Y('ביער', 'בשונית')}` : `גררו קלף מהיד אל ${Y('היער', 'השונית')}, או לחצו על קלף ואחר כך על מקום`}</span>`);
    const hello = Y('שלום! אני שומר היער.', 'שלום! אני שומר היער, והיום אני שומר גם על השונית.');
    say(kids ? `${hello} בואו נבנה ${Y('יער חזק – כל חוט זהב נותן לו', 'שונית חזקה – כל חוט זהב נותן לה')} חִיּוּת.` : `${hello} כל חוט זהב בין יצורים נותן ${Y('ליער', 'לשונית')} חִיּוּת. בעוד 2 תורות הטבע יהפוך קלף ראשון.`);
    if (kids) { const h = bestMove(); if (h) say(hello + ' ' + hintText(h)); }
    render();
  }

  function render(fresh) {
    if (K.quiet || !K.S || !$('.kf-game')) return;
    const T = totals();
    // top bar
    const flags = [];
    if (K.S.watch) flags.push(`<span class="kf-flag">${I.eye} שומרים על ${Y('היער', 'השונית')}</span>`);
    if (K.S.nest) flags.push(`<span class="kf-flag">ציפורים פי 2</span>`);
    if (K.S.insect) flags.push(`<span class="kf-flag">חרקים פי 2</span>`);
    if (K.S.fish) flags.push(`<span class="kf-flag">דגים פי 2</span>`);
    $('.kf-bar').innerHTML = `
      <span class="kf-stat s-light" title="סכום האור של ${Y('היער', 'השונית')}">${ctx.STAT_ICON.light}<small>אור</small><b>${T.light}</b></span>
      <span class="kf-stat s-water" title="${Y('סכום המים של היער', 'סכום המחסה של השונית')}">${Y(ctx.STAT_ICON.water, ctx.STAT_ICON.shelter)}<small>${Y('מים', 'מחסה')}</small><b>${T.water}</b>${K.S.waterBoost ? `<span class="kf-boost">+${K.S.waterBoost}</span>` : ''}</span>
      <span class="kf-stat s-thr" title="חוטי זהב בין יצורים קשורים">${I.thread}<small>קשרים</small><b>${T.threads}</b></span>
      <span class="kf-goal${T.life < thresholds()[0] && K.S.events.length - K.S.evIdx <= 2 ? ' low' : ''}" title="המטרה: לעבור ${K.S.events.length} אירועים עם ${Y('יער חי', 'שונית חיה')}. הכוכבים נקבעים לפי החִיּוּת בסוף.">
        <span class="kf-gev">אירוע ${Math.min(K.S.evIdx + 1, K.S.events.length)} מתוך ${K.S.events.length}</span>
        <span class="kf-stat s-life${fresh && fresh.length ? ' bump' : ''}">${I.life}<small>חִיּוּת</small><b>${T.life}</b></span>
        ${goalStars(T.life)}
      </span>
      <span class="kf-flags">${flags.join('')}</span>
      <span class="kf-sp"></span>
      ${kids && K.S.phase === 'play' ? `<button class="wl-btn gold" data-a="hint">${I.bulb}<span>רמז</span></button>` : ''}
      <button class="wl-btn kf-q" data-a="how" title="איך משחקים?" aria-label="איך משחקים?">${I.quest}</button>
      <button class="wl-btn" data-a="setup">${icon('place')}<span>מקום אחר</span></button>`;
    renderBoard(fresh);
    renderSide();
    renderHand();
  }
  // rarity badge on a card: a glowing key while a keystone is charged (dim once used), "+1" while a rare bonus waits
  function rarBadge(ref, wilted) {
    const c = C(ref);
    if (c.rarity === 'epic') {
      const on = keyCharged(ref) && !wilted;
      return `<span class="kf-key${on ? '' : ' used'}" title="${on ? `מין מפתח: אם ${Y('היער לא מוכן לאירוע – שומר עליו', 'השונית לא מוכנה לאירוע – שומר עליה')} פעם אחת` : `מין מפתח: כבר שמר על ${Y('היער', 'השונית')} בסיבוב הזה`}">${I.key}</span>`;
    }
    if (c.rarity === 'rare' && rareReady(ref) && !wilted) return '<span class="kf-rb" title="קלף נדיר: אם הוא מתחבר בחוט זהב כשמניחים אותו – עוד \u2066+1\u2069 חִיּוּת">+1</span>';
    return '';
  }
  function renderBoard(fresh) {
    const lg = K.sel != null && K.S.phase === 'play' && K.S.hand[K.sel] ? legal(K.S.hand[K.sel]) : (K.drag && K.drag.moved && K.S.phase === 'play' && K.S.hand[K.drag.hi] ? legal(K.S.hand[K.drag.hi]) : null);
    root.querySelectorAll('.kf-slot').forEach((el) => {
      const k = +el.dataset.s; const b = K.S.board[k];
      const ok = lg && lg.slots.includes(k);
      el.className = `kf-slot${b ? '' : ' empty'}${b && b.wilted ? ' wilted' : ''}${b && b.fresh ? ' fresh' : ''}${b && b.fx === 'key' ? ' keyfire' : ''}${ok ? ' ok' : ''}${ok && b && !b.wilted ? ' swap' : ''}`;
      el.innerHTML = b ? `${ctx.cardHTML(C(b.ref))}${rarBadge(b.ref, b.wilted)}${b.wilted ? `<span class="kf-wb">${I.wilt}נובל</span>` : ''}<span class="kf-sw">${I.swap}</span>`
        : `${slotRow(k) === 0 ? ctx.IC.tree : slotRow(k) === 1 ? ctx.IC.seedling : ctx.IC.leaf}`;
      if (b) { b.fresh = false; b.fx = null; }
    });
    drawThreads(true, fresh);
  }
  function drawThreads(animate, fresh) {
    const board = $('.kf-board'), svg = $('.kf-svg'); if (!board || !svg || !K.S) return;
    const br = board.getBoundingClientRect(); if (!br.width) return;
    svg.setAttribute('viewBox', `0 0 ${br.width} ${br.height}`);
    const T = totals();
    const ctr = (k) => { const el = root.querySelector(`.kf-slot[data-s="${k}"]`); const r = el.getBoundingClientRect(); return { x: r.left - br.left + r.width / 2, y: r.top - br.top + r.height / 2, w: r.width, h: r.height }; };
    const clip = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y; const hx = a.w * 0.36, hy = a.h * 0.36; const t = Math.min(dx ? hx / Math.abs(dx) : Infinity, dy ? hy / Math.abs(dy) : Infinity, 0.45); return { x: a.x + dx * t, y: a.y + dy * t }; };
    let html = '';
    T.th.forEach((t, n) => {
      const A = ctr(t.i), B = ctr(t.j);
      let s = clip(A, B), e = clip(B, A);
      const mx = (s.x + e.x) / 2, my = (s.y + e.y) / 2; let L = Math.hypot(e.x - s.x, e.y - s.y);
      const bend = (n % 2 ? 1 : -1) * Math.min(40, L * 0.18);
      let cx = mx + (-(e.y - s.y) / (L || 1)) * bend, cy = my + ((e.x - s.x) / (L || 1)) * bend;
      const r1 = slotRow(t.i), r2 = slotRow(t.j);
      if (r1 === r2 && Math.abs(t.i - t.j) === 2) { // same row, card in between: arc through the gap between rows
        const up = r1 === 2; const dy = (up ? -1 : 1) * A.h * 0.5;
        s = { x: A.x, y: A.y + dy }; e = { x: B.x, y: B.y + dy }; cx = (A.x + B.x) / 2; cy = A.y + dy * 1.55; L = Math.abs(B.x - A.x) * 1.2;
      } else if (Math.abs(r1 - r2) === 2 && t.i % 3 === t.j % 3) { // straight down through the middle row: bow sideways
        cx = (s.x + e.x) / 2 + A.w * 0.9; cy = (s.y + e.y) / 2;
      }
      const isNew = animate && !K.seenThreads.has(t.key);
      html += `<path class="th${t.w > 1 ? ' w2' : ''}${isNew ? ' new' : ''}" style="--len:${Math.ceil(L * 1.2 + 10)}" d="M${s.x.toFixed(1)} ${s.y.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${e.x.toFixed(1)} ${e.y.toFixed(1)}"/><circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="4"/><circle cx="${e.x.toFixed(1)}" cy="${e.y.toFixed(1)}" r="4"/>`;
    });
    svg.innerHTML = html;
    if (animate) {
      T.th.forEach((t) => K.seenThreads.add(t.key));
      if (fresh && fresh.length) {
        const t = fresh[0]; const A = ctr(t.i), B = ctr(t.j);
        const f = document.createElement('div'); f.className = 'kf-float';
        f.textContent = `\u2066+${fresh.reduce((s, x) => s + x.w, 0) + (fresh.rb || 0)}\u2069 חִיּוּת`;
        f.style.left = ((A.x + B.x) / 2) + 'px'; f.style.top = ((A.y + B.y) / 2) + 'px';
        board.appendChild(f); later(() => f.remove(), 1300);
      }
    }
  }
  function renderSide() {
    const N = K.S.events.length;
    const dots = K.S.events.map((e, i) => `<i class="${K.S.results[i] || ''}${i === K.S.evIdx ? ' cur' : ''}"></i>`).join('');
    $('.kf-evhead').innerHTML = `<span>אירוע ${Math.min(K.S.evIdx + 1, N)} מתוך ${N}</span><span class="kf-dots">${dots}</span>`;
    const top = $('.kf-evtop'), info = $('.kf-info'), cont = $('.kf-cont');
    cont.innerHTML = '';   // the continue button sits outside the info box so the owl below can never cover it
    const side = $('.kf-side'); side.classList.remove('resolved');
    const face = (ev) => { const D = EV[ev.id]; return `<div class="kf-evf${D.good ? ' good' : ''}"><div>${icOf(D)}<b>${esc(D.name[K.S.biome])}</b></div></div>`; };
    const flip = (ev, up) => `<div class="wl-flip${up ? ' is-up' : ''}"><div class="wl-fin"><div class="wl-face wl-fback">${ctx.backHTML()}</div><div class="wl-face wl-ffront">${ev ? face(ev) : ''}</div></div></div>`;
    if (K.S.phase === 'event' && K.S.cur) {
      const ev = K.S.cur.ev, D = EV[ev.id], r = K.S.cur.res;
      const existing = top.querySelector('.wl-flip');
      if (!existing || top.dataset.ev !== String(ev.i)) { top.innerHTML = flip(ev, false) + `<div class="kf-peek"><span class="kf-when">הטבע הופך קלף...</span></div>`; top.dataset.ev = String(ev.i); }
      else if (r) { existing.classList.add('is-up'); }
      if (r) {
        const pk = top.querySelector('.kf-peek'); if (pk) pk.innerHTML = `<span class="kf-when">${r.good ? 'מתנה מהטבע' : r.key != null ? 'מין מפתח עזר!' : r.ok ? Y('היער מוכן!', 'השונית מוכנה!') : Y('היער ילמד מזה', 'השונית תלמד מזה')}</span>`;
        // the outcome first: on small screens the story below may need scrolling, the result never does
        info.innerHTML = `<h3>${icOf(D)}${esc(D.name[K.S.biome])}</h3>
          <div class="kf-res ${r.key != null ? 'key' : r.ok ? 'ok' : 'no'}">${r.key != null ? I.key : r.ok ? I.check : I.wilt}<span>${r.key != null ? '<b>מין מפתח!</b> ' : ''}${esc(r.text)}</span></div>
          ${D.good ? '' : `<div class="kf-need">${I.bulb}<span>צריך: ${esc(needOf(ev))}${r.have ? ` · יש: ${esc(r.have.split(': ').pop())}` : ''}</span></div>`}
          <p>${esc(D.story[K.S.biome])}</p>`;
        // small screens: once the card has turned over, fold it away so the outcome has room (its name is the heading)
        later(() => { if (K.S && K.S.phase === 'event' && K.S.cur && K.S.cur.res) side.classList.add('resolved'); }, 1000);
        cont.innerHTML = `<button class="wl-btn go" data-a="cont">${K.S.evIdx + 1 >= N ? 'לסיכום' : 'ממשיכים'}${icon('arrowL')}</button>`;
      } else info.innerHTML = `<h3>${I.deck}<span>הטבע הופך קלף...</span></h3>`;
      return;
    }
    if (K.S.phase === 'end') { info.innerHTML = '<h3>הסיבוב הסתיים</h3>'; return; }
    // waiting for the next event
    const ev = K.S.events[K.S.evIdx];
    const known = K.S.revealed.has(K.S.evIdx);
    top.dataset.ev = '';
    const t2 = turnsToEvent();
    const peeks = [];
    for (let i = K.S.evIdx + 1; i < N; i++) if (K.S.revealed.has(i)) peeks.push(`<span class="kf-pk">${icOf(EV[K.S.events[i].id])}<span>אחר כך: ${esc(evName(K.S.events[i]))}</span></span>`);
    top.innerHTML = flip(known ? ev : null, known) + `<div class="kf-peek"><span class="kf-when">${t2 === 1 ? 'האירוע הבא – אחרי התור הזה!' : 'האירוע הבא בעוד 2 תורות'}</span>${peeks.join('')}</div>`;
    if (known) {
      const D = EV[ev.id];
      info.innerHTML = `<h3>${icOf(D)}${esc(D.name[K.S.biome])}</h3><p>${esc(D.story[K.S.biome])}</p>${D.good ? '' : `<div class="kf-need">${I.bulb}<span>צריך: ${esc(needOf(ev))}</span></div>`}`;
    } else {
      info.innerHTML = `<h3>${I.eye}<span>מה יביא הטבע?</span></h3><p>${t2 === 1 ? 'הקלף ייהפך אחרי התור הזה. שומר היער רומז מה בא.' : Y('תחנת מזג אוויר או מצלמת שטח יכולות לגלות מראש.', 'מצוף חיישנים או מצלמה תת־ימית יכולים לגלות מראש.')}</p>`;
    }
  }
  function renderHand() {
    const h = $('.kf-hand'); if (!h) return;
    h.innerHTML = K.S.hand.map((ref, i) => {
      const c = C(ref);
      let chip;
      if (c.type === 'tool') chip = `<span class="kf-chip tool">${esc(TOOL_FX[c.tool.id] || 'כלי עזר')}</span>`;
      else chip = `<span class="kf-chip">${c.sp.animal ? ctx.IC.paw : ctx.IC.leaf}<span>${c.sp.animal || (reef() && c.sp.kind === 'sessile') ? 'בעל חיים · ' : reef() && c.sp.kind === 'coral' ? 'אלמוג · ' : 'צמח · '}${ROWSH()[rowOfCard(c)]}</span></span>`;
      const off = c.type === 'tool' && !canUse(ref).ok;
      return `<div class="kf-hc${K.sel === i ? ' sel' : ''}${off ? ' off' : ''}" data-i="${i}" role="button" aria-label="${esc(c.name)}">${chip}${ctx.cardHTML(c)}${c.type === 'species' ? rarBadge(ref, false) : ''}${ref.borrowed ? '<span class="kf-borrow" title="קלף שאול: קיבלתם אותו בהשאלה לסיבוב הזה. עוד אין לכם אותו באלבום.">שאול</span>' : ''}${K.sel === i && c.type === 'tool' && !off ? '<button class="wl-btn gold kf-use" data-a="use">הפעלה</button>' : ''}</div>`;
    }).join('');
    const noSpecies = !K.S.hand.some((r) => C(r).type === 'species');
    $('.kf-deck').innerHTML = `${I.deck}<span>בחפיסה: ${K.S.deck.length}</span><span>תור ${K.S.turn + 1}</span>`;
    $('.kf-acts').innerHTML = K.S.phase === 'play' && (noSpecies || !kids) ? `<button class="wl-btn" data-a="skip" title="דילוג על התור: מחזירים קלף אחד לחפיסה ומקבלים קלף אחר. הטבע ממשיך">${I.skip}<span>דילוג על התור</span></button>` : '';
    root.querySelectorAll('.kf-bub').forEach((b) => { if (K.S.says != null && b.innerHTML !== K.S.says) b.innerHTML = K.S.says; });
  }

  return { msg, say, renderSetup, renderGame, render, renderBoard, drawThreads, renderHand };
}
