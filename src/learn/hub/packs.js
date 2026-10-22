// מרכז הלמידה – opening a card pack: the foil bag, the cracks, the three cards that rise and flip, the daily limit.
// Exports: createPacks(ctx) → { renderPack, tearPack, revealCard, revealAll, opensLeft }.
// Needs from ctx (index.js): $, main, S, save, sfx, reduced, later, go, updateChip, confetti, checkSets, collection.
import { PACK_ART } from '../../data/pack-art.js';
import { icon } from '../../ui/ui.js';
import { IC, OPEN_PER_DAY, todayKey } from './base.js';
import { flipHTML } from './card-html.js';
import { CARDS } from './cards.js';

export function createPacks(ctx) {
  const { $, main, S, save, sfx, reduced, later, go, updateChip, confetti, checkSets, collection } = ctx;
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
  return { renderPack, tearPack, revealCard, revealAll, opensLeft };
}
