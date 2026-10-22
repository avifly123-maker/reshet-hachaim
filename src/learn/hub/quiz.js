// מרכז הלמידה – the quiz: choosing a level and a place, the questions one by one, the answer and its fact, the end.
// Exports: createQuiz(ctx) → { QS (the chosen level and place), renderSetup, startQuiz, renderEnd, answer, nextQ,
// quizNow() (the round in play, for the "שחקו שוב" button and the test hook) }.
// Needs from ctx (index.js): $, main, S, save, sfx, later, go, played, updateChip, confetti. Rounds: quiz-build.js.
import { TORAH, sourcesOn } from '../../core/edition.js';
import { grantSource, ownedSources } from '../../core/sources-store.js';
import { CARD_ART } from '../../data/card-art.js';
import { THUMBS } from '../../data/thumbs.js';
import { SOURCE_CARDS } from '../../data/torah.js';
import { icon } from '../../ui/ui.js';
import { IC, PACK_CHANCE, QUIZ_PACKS_MAX, esc, firstSentence, pick } from './base.js';
import { artStyle } from './card-html.js';
import { IC_SCROLL } from './cards.js';
import { SEEN_MAX, buildRound, buildTorahRound, seenMap, setSeen } from './quiz-build.js';

export function createQuiz(ctx) {
  const { $, main, S, save, sfx, later, go, played, updateChip, confetti } = ctx;
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
  return { QS, renderSetup, startQuiz, renderEnd, answer, nextQ, quizNow: () => Q };
}
