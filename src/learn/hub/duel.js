// מרכז הלמידה – "מי חזק ברשת?": five rounds of the player's cards against the computer's, one number a round.
// Exports: createDuel(ctx) → { startDuel, playCard, duelNext }.
// Needs from ctx (index.js): $, main, S, save, sfx, later, go, played, updateChip, confetti.
import { icon } from '../../ui/ui.js';
import { DUEL_PACKS_PER_DAY, IC, STAT_ICON, STAT_NAMES, pick, sample, todayKey } from './base.js';
import { cardHTML, flipHTML } from './card-html.js';
import { CARDS } from './cards.js';

export function createDuel(ctx) {
  const { $, main, S, save, sfx, later, go, played, updateChip, confetti } = ctx;
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
  return { startDuel, playCard, duelNext };
}
