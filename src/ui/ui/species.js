// The species card (the side panel): full card, the short חוויה card, relations, the question, the one clicked.
// Exports: createSpecies(ctx) → { renderSpecies }.
// Needs from ctx (index.js and the parts made before it): emit, S, panel.
// The public api (ctx.ui, api.js) is made last: event handlers here reach it as ctx.ui.
import { zoneWord } from '../../core/place.js';
import { artPos } from '../../data/art-focus.js';
import { clamp01, esc, fmt, thumbHTML, typeColor } from './helpers.js';
import { icon } from './icons.js';

export function createSpecies(ctx) {
  const { emit, S, panel } = ctx;
  /* ================================================================ SPECIES PANEL */
  panel.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act]'); if (!t || !S.species) return;
    const act = t.dataset.act, id = S.species.id;
    if (act === 'close') { emit('species:close'); ctx.ui.hideSpecies(); }
    else if (act === 'follow') { emit('species:follow', { id }); t.classList.add('on'); }
    else if (act === 'locate') emit('species:locate', { id });
    else if (act === 'exp') { if (!t.disabled) emit('species:experiment', { id }); }
    else if (act === 'tour') emit('species:tour', { id });
    else if (act === 'uproot') {   // two steps: the first click asks, the second takes it out
      if (!(S.sureUntil > performance.now())) {
        S.sureUntil = performance.now() + 3500; t.classList.add('sure'); t.querySelector('span').textContent = 'בטוח? לחצו שוב';
        setTimeout(() => { const b = panel.querySelector('.sp-uproot'); if (b && !(S.sureUntil > performance.now())) { b.classList.remove('sure'); b.querySelector('span').textContent = b.dataset.label; } }, 3600);
        return;
      }
      S.sureUntil = 0; emit('species:uproot', { id });
    }
    else if (act === 'move') emit('species:move', { id });
    else if (act === 'select') emit('species:select', { id: t.dataset.id });
    else if (act === 'reveal') { t.classList.add('busy'); emit('relation:reveal', { from: id, to: t.dataset.to, type: t.dataset.type }); }
    else if (act === 'more') { S.moreOpen = !S.moreOpen; panel.classList.toggle('more-open', S.moreOpen); }
    else if (act === 'quiz') {
      const q = S.species.question; if (!q || S.species.questionDone) return;
      const index = +t.dataset.i, correct = index === q.answer;
      S.quiz = S.quiz && S.quiz.id === id ? S.quiz : { id, wrong: [], right: false };
      if (correct) S.quiz.right = true; else if (!S.quiz.wrong.includes(index)) S.quiz.wrong.push(index);
      emit('quiz:answer', { id, index, correct });
      renderSpecies(true);
    }
  });
  function relRow(r) {
    const col = typeColor(r.type);
    if (!r.discovered) {
      return `<li class="rel hidden" style="--rc:${col}"><span class="rel-type">${esc(r.typeName || '')}</span>
        <div class="rel-main"><button class="rel-target" data-act="select" data-id="${esc(r.targetId)}">${esc(r.targetName)}</button>
        <p class="rel-q">יש כאן קשר שעוד לא גילית…</p></div>
        <button class="rel-reveal" data-act="reveal" data-to="${esc(r.targetId)}" data-type="${esc(r.type)}">${icon('bulb')}גלה את הקשר</button></li>`;
    }
    return `<li class="rel${r.present ? ' present' : ' absent'}" style="--rc:${col}"><span class="rel-type">${esc(r.typeName || '')}</span>
      <div class="rel-main"><button class="rel-target" data-act="select" data-id="${esc(r.targetId)}">${esc(r.targetName)}</button>
      ${r.present ? '' : `<span class="rel-away">לא נמצא ${zoneWord('in')}</span>`}<p>${esc(r.text)}</p></div></li>`;
  }
  function renderSpecies(force) {
    const s = S.species; if (!s) return;
    const sig = JSON.stringify([s, S.quiz && S.quiz.id === s.id ? S.quiz : 0]);
    if (!force && sig === S.speciesSig) return;
    S.speciesSig = sig;
    const scroller = panel.querySelector('.sp-scroll'); const top = scroller ? scroller.scrollTop : 0;
    if (s.xp) { panel.style.setProperty('--c', s.color || '#6a9'); panel.innerHTML = xpCardHTML(s); panel.classList.add('xp'); const sc = panel.querySelector('.sp-scroll'); if (sc) sc.scrollTop = top; return; }
    panel.classList.remove('xp');
    const health = s.health == null ? null : clamp01(s.health);
    const rels = s.relations || [];
    const found = rels.filter((r) => r.discovered).length;
    let quiz = '';
    if (s.question) {
      const q = s.question, qs = S.quiz && S.quiz.id === s.id ? S.quiz : { wrong: [], right: false };
      const done = s.questionDone || qs.right;
      quiz = `<section class="sp-quiz${done ? ' done' : ''}"><h4>${icon('help')}שאלה לחוקר</h4><p class="q">${esc(q.q)}</p><div class="opts">` +
        (q.options || []).map((o, i) => {
          const cls = done && i === q.answer ? 'right' : qs.wrong.includes(i) ? 'wrong' : '';
          return `<button data-act="quiz" data-i="${i}" class="${cls}" ${done || qs.wrong.includes(i) ? 'disabled' : ''}>${esc(o)}</button>`;
        }).join('') + `</div>` +
        (done ? `<p class="q-fb good">${icon('check')}נכון מאוד!</p>` : qs.wrong.length ? `<p class="q-fb bad">כמעט… נסו תשובה אחרת.</p>` : '') + `</section>`;
    }
    panel.style.setProperty('--c', s.color || '#6a9');
    panel.innerHTML = `<button class="sp-close" data-act="close" title="סגור" aria-label="סגור">${icon('close')}</button>
      <div class="sp-scroll">${s.art ? `<figure class="sp-art"><img src="${esc(s.art)}" alt="" draggable="false" style="${artPos(s.id, 2)}"></figure>` : ''}
      <header class="sp-head${s.art ? ' has-art' : ''}">${thumbHTML(s.thumb, s.color, s.kindName === 'בעל חיים' ? 'animal' : s.kind || '', 'sp-thumb')}
        <div><h2>${esc(s.name)}</h2>${s.nameEn ? `<p class="en" dir="ltr">${esc(s.nameEn)}</p>` : ''}
        <div class="chips">${s.kindName ? `<span>${esc(s.kindName)}</span>` : ''}${s.layerName ? `<span>${esc(s.layerName)}</span>` : ''}${s.activeName ? `<span>${icon(/לילה/.test(s.activeName) ? 'moon' : 'sun')}${esc(s.activeName)}</span>` : ''}</div></div></header>
      <div class="sp-status">
        <div class="st-alive"><b>${fmt(s.count || 0)}</b><small>${zoneWord('in')} עכשיו</small></div>
        ${health != null ? `<div class="st-health"><div class="hb"><i style="width:${(health * 100).toFixed(0)}%;background:hsl(${(health * 110).toFixed(0)} 60% 45%)"></i></div><small>${esc(s.status || 'בריאות')}</small></div>` : (s.status ? `<div class="st-health"><small>${esc(s.status)}</small></div>` : '')}
      </div>
      ${s.hurt ? `<p class="sp-hurt">${icon('bang')}<span>${esc(s.hurt)}</span></p>` : ''}
      ${s.fact ? `<blockquote class="sp-fact">${esc(s.fact)}</blockquote>` : ''}
      ${s.shira ? `<section class="sp-shira src-box"><h4>${icon('book')}<span>בפרק שירה</span></h4><p class="src-text"><b>${esc(s.shira.who)}:</b> ${esc(s.shira.text)}</p><small class="src-ref">${esc(s.shira.ref)}</small>${s.shira.note ? `<p class="src-note">${esc(s.shira.note)}</p>` : ''}</section>` : ''}
      ${s.more ? `<div class="sp-more"><p>${esc(s.more)}</p></div><button class="sp-more-btn" data-act="more"><span class="m1">עוד עליו</span><span class="m2">פחות</span></button>` : ''}
      ${rels.length ? `<section class="sp-rels"><h4>${icon('web')}קשרים ברשת <small>${found}/${rels.length}</small></h4><ul>${rels.map(relRow).join('')}</ul></section>` : ''}
      ${quiz}
      ${s.one ? oneHTML(s) : ''}
      </div>
      <footer class="sp-actions">
        ${s.tour ? `<button class="btn sp-tour" data-act="tour">${icon('binoc')}${esc(s.tour)}</button>` : ''}
        <button class="btn ghosty sp-locate" data-act="locate" title="סמנו את כולם ${zoneWord('in')}">${icon('target')}איפה?</button>
        <button class="btn ghosty" data-act="follow">${icon('binoc')}עקוב</button>
        <button class="btn amber" data-act="exp" ${s.canRemove === false ? 'disabled title="אין עכשיו מה לבדוק"' : ''}>${icon('flask')}מה יקרה אם ייעלם?</button>
      </footer>`;
    panel.classList.toggle('more-open', S.moreOpen);
    const sc = panel.querySelector('.sp-scroll'); if (sc) sc.scrollTop = top;
  }

  // חוויה (1.3.2): a short card: the painting, the name, one fact and who it lives with. No question, no long texts.
  const firstSentence = (t) => { t = String(t || ''); if (t.length <= 110) return t; const m = t.match(/^.+?[.!?](?=\s|$)/); return m ? m[0] : t; };
  function xpCardHTML(s) {
    const seen = new Set(), rels = (s.relations || []).filter((r) => !seen.has(r.targetId) && seen.add(r.targetId)).slice(0, 8);
    const lives = rels.map((r) => r.discovered
      ? `<li style="--rc:${typeColor(r.type)}"><button class="lw-name" data-act="select" data-id="${esc(r.targetId)}">${esc(r.targetName)}</button><span class="lw-type">${esc(r.typeName || '')}</span></li>`
      : `<li class="hid" style="--rc:${typeColor(r.type)}"><button class="lw-name" data-act="select" data-id="${esc(r.targetId)}">${esc(r.targetName)}</button><button class="lw-reveal" data-act="reveal" data-to="${esc(r.targetId)}" data-type="${esc(r.type)}">${icon('bulb')}<span>גלו את הקשר</span></button></li>`).join('');
    const o = s.one;
    const one = o ? `<div class="sp-one xp-one-btns">${o.canMove ? `<button class="btn ghosty" data-act="move">${icon('target')}<span>להעביר</span></button>` : ''}${upBtn(o.kind === 'plant' && !/בעל חיים/.test(s.kindName || '') ? 'לעקור' : 'להוציא', o.kind === 'plant' ? 'leaf' : 'arrowL', o.refund ? ` <small>+${o.refund}</small>` : '')}</div>` : '';
    return `<button class="sp-close" data-act="close" title="סגור" aria-label="סגור">${icon('close')}</button>
      <div class="sp-scroll">${s.art ? `<figure class="sp-art"><img src="${esc(s.art)}" alt="" draggable="false" style="${artPos(s.id, 2)}"></figure>` : ''}
      <header class="sp-head${s.art ? ' has-art' : ''}">${s.art ? '' : thumbHTML(s.thumb, s.color, s.kindName === 'בעל חיים' ? 'animal' : s.kind || '', 'sp-thumb')}
        <div><h2>${esc(s.name)}</h2><div class="chips"><span>${fmt(s.count || 0)} ${zoneWord('in')}</span></div></div></header>
      ${s.hurt ? `<p class="sp-hurt">${icon('bang')}<span>${esc(s.hurt)}</span></p>` : ''}
      ${s.fact ? `<blockquote class="sp-fact">${esc(firstSentence(s.fact))}</blockquote>` : ''}
      ${s.shira ? `<section class="sp-shira src-box"><h4>${icon('book')}<span>בפרק שירה</span></h4><p class="src-text"><b>${esc(s.shira.who)}:</b> ${esc(s.shira.text)}</p><small class="src-ref">${esc(s.shira.ref)}</small></section>` : ''}
      ${rels.length ? `<section class="sp-lives"><h4>${icon('web')}<span>השותפים ברשת</span></h4><ul>${lives}</ul></section>` : ''}
      ${one}
      </div>
      <footer class="sp-actions">
        ${s.tour ? `<button class="btn sp-tour" data-act="tour">${icon('binoc')}${esc(s.tour)}</button>` : ''}
        <button class="btn ghosty sp-locate" data-act="locate" title="סמנו את כולם ${zoneWord('in')}">${icon('target')}איפה?</button>
        ${s.expNeeded ? `<button class="btn amber" data-act="exp" ${s.canRemove === false ? 'disabled' : ''}>${icon('flask')}מה יקרה אם ייעלם?</button>` : ''}
      </footer>`;
  }

  // the one plant or animal that was clicked: take it out, move it, let it go
  function oneHTML(s) {
    const o = s.one, back = o.refund ? ` <small>+${o.refund}</small>` : '';
    if (o.kind === 'plant' && /בעל חיים/.test(s.kindName || '')) {   // a coral, a sponge, an anemone: an animal that stays in place
      const lb = 'להוציא אותו מהשונית';
      return `<section class="sp-one"><h4>${icon('sprout')}מה שבחרתם</h4>${o.strong ? '<p class="sp-strong">זה אלמוג חזק מהמשתלה. הוא גדל משבר של אלמוג שעמד בחום, ולכן בגל חום הוא מלבין פחות.</p>' : ''}<p>יותר מדי ממנו, או שהוא במקום לא טוב? גררו אותו למקום אחר (לוחצים עליו וגוררים, או גוררים את הידית שמתחתיו), או הוציאו אותו ופנו מקום.</p>
        <div class="sp-one-btns">${o.canMove ? `<button class="btn ghosty" data-act="move">${icon('target')}<span>להעביר למקום אחר</span></button>` : ''}
        ${upBtn(lb, 'leaf', back)}</div></section>`;
    }
    if (o.kind === 'plant') {
      const lb = 'לעקור את הצמח הזה';
      return `<section class="sp-one"><h4>${icon('sprout')}הצמח שבחרתם</h4><p>מוצל מדי, או שיש יותר מדי ממנו? גררו אותו למקום אחר (לוחצים עליו וגוררים, או גוררים את הידית שמתחתיו), או עקרו אותו ופנו מקום.</p>
        <div class="sp-one-btns">${o.canMove ? `<button class="btn ghosty" data-act="move">${icon('target')}<span>להעביר למקום אחר</span></button>` : ''}
        ${upBtn(lb, 'leaf', back)}</div></section>`;
    }
    const lb = 'להוציא אותו מהמקום';
    return `<section class="sp-one"><h4>${icon('paw')}בעל החיים שבחרתם</h4><p>יותר מדי מהם? אפשר לתת לו לצאת ולחפש בית אחר.</p>
      <div class="sp-one-btns">${upBtn(lb, 'arrowL', back)}</div></section>`;
  }
  function upBtn(lb, ic, back) {
    const sure = S.sureUntil > performance.now();
    return `<button class="btn ghosty sp-uproot${sure ? ' sure' : ''}" data-act="uproot" data-label="${lb}">${icon(ic)}<span>${sure ? 'בטוח? לחצו שוב' : lb}</span>${back}</button>`;
  }
  return { renderSpecies };
}
