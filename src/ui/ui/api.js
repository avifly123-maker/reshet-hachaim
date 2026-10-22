// The public api of the UI (the object createUI returns: core → UI methods), with the mission banners' queue
// (missionDone fills it, showStart empties it) and the loading tips' timer, which only the api uses.
// Exports: createApi(ctx) → ui.
// Needs from ctx (index.js and the parts made before it): root, emit, S, hud, missions, layersEl, tray, panel,
//   toastsEl, hurtBar, hurtArrowsEl, expEl, hoverEl, ghost, hintEl, fxEl, coachRing, coachEl, startEl, loadEl,
//   ldFill, ldStatus, ldTip, rotateTip, renderStart, PP, paintWho, ppClose, ppFocus, ppRender, ptsNum, vitBar, vitIc,
//   vitPc, bioNum, bioLab, dRot, dSky, dCut, dStars, dGround, dayPart, dayN, seasonBox, seasonIc, seasonName,
//   paintSpeed, animatePts, setKit, paintToggles, musicBtn, mList, mCount, whatBtn, paintMissionLine, paintLayers,
//   renderTray, endPress, renderSpecies, open, makeModal, dismissDialog, closeModal, journalCard, layoutCoach,
//   confetti, pushToast, flushToasts, syncTrayH.
import { zoneWord } from '../../core/place.js';
import { badgesFor } from '../../data/badges.js';
import { badgeHTML } from '../badge-art.js';
import { partOfDay, skyColor } from './art.js';
import { clamp01, esc, fmt, h, LAYER_TINT, mix, SEASON_ICON } from './helpers.js';
import { icon } from './icons.js';

export function createApi(ctx) {
  const { root, emit, S, hud, missions, layersEl, tray, panel, toastsEl, hurtBar, hurtArrowsEl, expEl, hoverEl, ghost, hintEl, fxEl, coachRing,
    coachEl, startEl, loadEl, ldFill, ldStatus, ldTip, rotateTip, renderStart, PP, paintWho, ppClose, ppFocus, ppRender, ptsNum, vitBar, vitIc, vitPc,
    bioNum, bioLab, dRot, dSky, dCut, dStars, dGround, dayPart, dayN, seasonBox, seasonIc, seasonName, paintSpeed, animatePts, setKit, paintToggles,
    musicBtn, mList, mCount, whatBtn, paintMissionLine, paintLayers, renderTray, endPress, renderSpecies, open, makeModal, dismissDialog, closeModal,
    journalCard, layoutCoach, confetti, pushToast, flushToasts, syncTrayH } = ctx;
  // the loading tips' timer and the mission banners' queue: only the api uses them (they were declared with the
  // loading screen and the toasts)
  let tipTimer = 0;
  const bannerQ = []; let bannerBusy = false;
  function nextBanner() {
    if (bannerBusy || !bannerQ.length) return;
    bannerBusy = true;
    const m = bannerQ.shift();
    const b = h('div', 'mission-banner', `<div class="mb-ribbon">${icon('check')}</div><small>משימה הושלמה!</small><h3>${esc(m.title)}</h3>${m.note ? `<p class="mb-note">בוצע: ${esc(m.note)}</p>` : ''}${m.rewardText ? `<p>${esc(m.rewardText)}</p>` : ''}`, root);
    requestAnimationFrame(() => b.classList.add('on'));
    confetti();
    setTimeout(() => { b.classList.remove('on'); b.classList.add('off'); }, 3800);
    setTimeout(() => { b.remove(); bannerBusy = false; nextBanner(); }, 4200);
  }

  /* ================================================================ PUBLIC API */
  const ui = {
    setLoading(p, text) {
      loadEl.classList.add('on'); loadEl.classList.remove('off');
      ldFill.style.width = (clamp01(p) * 100).toFixed(1) + '%';
      if (text != null) ldStatus.textContent = text;
      if (!tipTimer) { rotateTip(); tipTimer = setInterval(rotateTip, 5200); }
    },
    // buttons under the loading message (e.g. after a failed load): [{ label, onClick, primary }]
    setLoadingActions(list) {
      let box = loadEl.querySelector('.ld-actions');
      loadEl.classList.toggle('has-actions', !!(list && list.length));
      if (!list || !list.length) { if (box) box.remove(); return; }
      clearInterval(tipTimer); tipTimer = 0; ldTip.classList.remove('show');   // the message and the buttons are what matter now
      if (!box) box = h('div', 'ld-actions', null, loadEl.querySelector('.ld-inner'));
      box.innerHTML = '';
      list.forEach((a, i) => { const b = h('button', `btn ${a.primary || (i === 0 && a.primary !== false) ? 'primary' : 'soft'}`, esc(a.label), box); b.addEventListener('click', () => { ui.setLoadingActions(null); a.onClick && a.onClick(); }); });
    },
    hideLoading() {
      ui.setLoadingActions(null);
      loadEl.classList.add('off'); loadEl.classList.remove('on');
      clearInterval(tipTimer); tipTimer = 0;
    },
    setLogo(src) { S.logo = src; const l = loadEl.querySelector('.ld-logo'); if (l) l.src = src; else if (src) { const im = h('img', 'ld-logo', null, loadEl); im.src = src; im.alt = 'בבא דע'; } const hl = root.querySelector('.hud-logo'); if (!hl && src) { const im = h('img', 'hud-logo', null, root); im.src = src; im.alt = 'בבא דע'; } },
    setTips(tips) { if (Array.isArray(tips) && tips.length) { S.tips = tips.slice(); S.tipI = Math.floor(Math.random() * tips.length); } },

    setMode(m) { S.mode = m; if (startEl.classList.contains('on') && S.repaintStartMode) S.repaintStartMode(); },
    // players: { list: [{ id, name, animal }], current: { id, name, animal }, max, nameMax }
    setProfiles(st) {
      const prev = S.profiles && S.profiles.current && S.profiles.current.id;
      S.profiles = st || null; paintWho();
      const chip = startEl.querySelector('.st-who');
      if (chip && st && st.current && prev && prev !== st.current.id) { chip.classList.remove('bump'); void chip.offsetWidth; chip.classList.add('bump'); }
      if (!PP.open) return;
      if (PP.after === 'close') ppClose(); else { PP.view = 'list'; ppRender(); ppFocus(); }
      PP.after = null;
    },
    showStart(biomes) {
      // nothing from the last forest should linger over the start screen
      toastsEl.innerHTML = ''; S.toastQ.length = 0; bannerQ.length = 0; root.querySelectorAll('.mission-banner').forEach((b) => b.remove()); bannerBusy = false; fxEl.innerHTML = '';
      for (const k of Object.keys(open)) closeModal(k);   // a journal or list left open must not cover the start screen
      renderStart(biomes); root.classList.remove('ingame');
      startEl.classList.remove('off'); S.startTok = (S.startTok || 0) + 1; const tok = S.startTok; requestAnimationFrame(() => { if (S.startTok === tok) startEl.classList.add('on'); });
    },
    hideStart() { S.startTok = (S.startTok || 0) + 1; startEl.classList.remove('on'); startEl.classList.add('off'); },

    setBiome(b) {
      S.biome = b || {};
      root.dataset.biome = S.biome.id || '';
      root.classList.add('ingame');
      seasonBox.hidden = !S.biome.hasSeasons;
      // words that depend on the zone (the menu and the tray help were written once, before the zone was known)
      const reef = S.biome.id === 'reef';
      const pt = tray.querySelector('[data-tab="plants"]');
      if (pt) for (const n of pt.childNodes) if (n.nodeType === 3 && n.textContent.trim()) n.textContent = reef ? 'אלמוגים וצמחים' : 'צמחים';   // corals are animals
      const kr = root.querySelector('.km-row[data-a="reset"] span'); if (kr) kr.textContent = `מבט על ${zoneWord('all')}`;
      const th = tray.querySelector('.tr-help'); if (th) th.innerHTML = `<p><span class="lg-dot">3</span>כמה יש ${zoneWord('in')} עכשיו</p><p><span class="lg-cost">${icon('leaf')}20</span>המחיר בנקודות חיים</p><p><span class="lg-drag">${icon('arrowL')}</span>גוררים את הקלף ${zoneWord('to')}</p>`;
      S.layerFilter = 'all';
      syncTrayH();
    },

    setTray(cards) { S.cards = Array.isArray(cards) ? cards : []; renderTray(false); },

    setDragHint(hint) {
      if (!hint || !S.press || !S.press.dragging) { hintEl.classList.remove('on'); ghost.classList.remove('valid', 'invalid'); return; }
      const sig = !!hint.valid + '|' + (hint.text || '');
      if (hintEl.dataset.sig !== sig) {
        hintEl.dataset.sig = sig;
        hintEl.className = 'drag-hint on ' + (hint.valid ? 'valid' : 'invalid');
        hintEl.innerHTML = `${icon(hint.valid ? 'check' : 'close')}<span>${esc(hint.text || (hint.valid ? 'אפשר לשתול כאן' : 'לא כאן'))}</span>`;
      } else hintEl.classList.add('on');
      ghost.classList.toggle('valid', !!hint.valid); ghost.classList.toggle('invalid', !hint.valid);
    },

    setHUD(d) {
      if (!d) return;
      const o = S.hud;
      if (d.points != null && d.points !== o.points) { if (o.points == null) { S.shownPts = d.points; ptsNum.textContent = fmt(d.points); } else animatePts(d.points); o.points = d.points; }
      if (d.vitality != null) {
        const v = clamp01(d.vitality);
        if (o.vitality == null || Math.abs(v - o.vitality) > 0.004) {
          o.vitality = v;
          const col = `hsl(${(v * 112).toFixed(0)} 62% 48%)`;
          vitBar.style.width = (v * 100).toFixed(1) + '%'; vitBar.style.background = col; vitIc.style.color = `hsl(${(v * 112).toFixed(0)} 65% 62%)`;
          vitPc.textContent = Math.round(v * 100) + '%'; vitPc.parentElement.title = `החיוניות של ${zoneWord('the')}: ${Math.round(v * 100)}%`;
          hud.classList.toggle('vit-low', v < 0.3);
        }
      }
      if (d.speciesAlive != null && (d.speciesAlive !== o.speciesAlive || d.speciesTotal !== o.speciesTotal)) {
        if (o.speciesAlive != null && d.speciesAlive > o.speciesAlive) { const bx = bioNum.parentElement.parentElement; bx.classList.remove('up'); void bx.offsetWidth; bx.classList.add('up'); }
        o.speciesAlive = d.speciesAlive; o.speciesTotal = d.speciesTotal;
        bioNum.textContent = fmt(d.speciesAlive); bioLab.textContent = d.speciesTotal ? `מתוך ${fmt(d.speciesTotal)}` : ''; bioLab.parentElement.title = d.speciesTotal ? `${fmt(d.speciesAlive)} מינים חיים ${zoneWord('in')}, מתוך ${fmt(d.speciesTotal)}` : `מינים חיים ${zoneWord('in')}`;
      }
      if (d.dayFrac != null && (o.dayFrac == null || Math.abs(d.dayFrac - o.dayFrac) > 0.0015)) {
        if (o.dayFrac != null && d.dayFrac + 0.5 < o.dayFrac) o.day = (o.day || 1) + 1;
        o.dayFrac = d.dayFrac;
        const f = ((d.dayFrac % 1) + 1) % 1;
        dRot.setAttribute('transform', `rotate(${(f * 360 + 180).toFixed(1)} 24 24)`);
        const sky = skyColor(f); dSky.setAttribute('fill', sky); dCut.setAttribute('fill', sky);
        const night = -Math.cos(f * Math.PI * 2) < -0.1;
        dStars.style.opacity = night ? 1 : 0;
        dGround.setAttribute('fill', night ? '#1d3524' : '#3f7a3a');
        const part = partOfDay(f); if (dayPart.textContent !== part) dayPart.textContent = part;
        const dn = d.day != null ? d.day : o.day || 1; const dt = 'יום ' + dn; if (dayN.textContent !== dt) dayN.textContent = dt;
      }
      if (d.isNight != null && d.isNight !== o.isNight) { o.isNight = d.isNight; root.classList.toggle('night', !!d.isNight); }
      if ('season' in d && (d.season !== o.season || d.seasonId !== o.seasonId)) {
        o.season = d.season; o.seasonId = d.seasonId;
        seasonBox.hidden = !d.season;
        seasonBox.dataset.season = d.seasonId || '';
        seasonIc.innerHTML = icon(SEASON_ICON[d.seasonId] || 'leaf'); seasonName.textContent = d.season || '';
      }
      if (d.speed != null && d.speed !== S.speed) { S.speed = d.speed; if (d.speed > 0) S.lastSpeed = d.speed; paintSpeed(); }
    },

    setMissions(list) {
      list = Array.isArray(list) ? list : [];
      const sig = S.play + JSON.stringify(list.map((m) => [m.id, m.title, m.text, m.hint, m.how, m.note, Math.round(clamp01(m.progress) * 100), !!m.done, m.checks]));
      if (sig === S.missionsSig) return;
      S.missionsSig = sig;
      if (S.play === 'experience') { paintMissionLine(list); return; }
      missions.classList.remove('xp');
      const hintsOpen = new Set([...mList.querySelectorAll('li.hint-open')].map((x) => x.dataset.id));
      mList.innerHTML = list.map((m) => {
        const p = m.done ? 1 : clamp01(m.progress);
        // an expert mission (משימת מומחים): a gold tag, its badge, and a checklist of its parts
        const bd = m.expert ? badgesFor('mission:' + m.id)[0] : null;
        const xp = m.expert ? `<div class="m-expert">${bd ? badgeHTML(bd, { cls: 'mini' }) : ''}<span><b>משימת מומחים</b><small>${bd ? 'הפרס: התג "' + esc(bd.name) + '"' : 'משימה קשה במיוחד'}</small></span></div>` : '';
        const ck = m.checks && !m.done ? `<ul class="m-checks">${m.checks.map((c) => `<li class="${c.ok ? 'ok' : ''}"><i>${c.ok ? icon('check') : ''}</i><span>${esc(c.label)}${c.hold != null && !c.ok && c.hold > 0 ? ` <em>${c.hold}%</em>` : ''}</span></li>`).join('')}</ul>` : '';
        return `<li data-id="${esc(m.id)}" class="${m.done ? 'done' : ''}${m.expert ? ' expert' : ''}${S.openMission === m.id ? ' open' : ''}${hintsOpen.has(m.id) ? ' hint-open' : ''}">
          <div class="m-row"><span class="m-check" style="--p:${(p * 100).toFixed(1)}%">${m.done ? icon('check') : ''}</span><b>${esc(m.title)}</b><span class="m-pc">${m.done ? '' : Math.round(p * 100) + '%'}</span></div>
          <div class="m-detail">${xp}<p>${esc(m.text || '')}</p>${ck}${m.done && m.note ? `<p class="m-note">${icon('check')}בוצע: ${esc(m.note)}</p>` : ''}${(m.hint || m.how) && !m.done ? `<button class="m-hint-btn">${icon('bulb')}רמז</button><div class="m-hint">${m.hint ? `<p>${esc(m.hint)}</p>` : ''}${m.how ? `<p class="m-how">${esc(m.how)}</p>` : ''}</div>` : ''}</div></li>`;
      }).join('');
      const d = list.filter((m) => m.done).length;
      // the current mission is always in view (on a low screen the list shows only a line or two)
      const cur = mList.querySelector('li:not(.done)'); if (cur && (cur.offsetTop < mList.scrollTop || cur.offsetTop + 24 > mList.scrollTop + mList.clientHeight)) mList.scrollTop = Math.max(0, cur.offsetTop - mList.offsetTop - 2);
      mCount.textContent = list.length ? `${d}/${list.length}` : '';
      missions.hidden = !list.length;
    },
    missionDone(m) { bannerQ.push(m || {}); nextBanner(); },

    showSpecies(info) {
      if (!info) return;
      if (!S.species || S.species.id !== info.id) { S.moreOpen = false; if (!S.quiz || S.quiz.id !== info.id) S.quiz = null; const sc = panel.querySelector('.sp-scroll'); if (sc) sc.scrollTop = 0; S.speciesSig = ''; }
      S.sureUntil = 0; S.species = info; renderSpecies(true);
      const sc = panel.querySelector('.sp-scroll'); if (sc && S.speciesSig && panel.dataset.id !== info.id) sc.scrollTop = 0;
      panel.dataset.id = info.id;
      root.classList.add('sp-open'); panel.classList.add('on'); setKit(false);
      layoutCoach();
    },
    updateSpecies(info) {
      if (!info || !S.species || info.id !== S.species.id) return;
      S.species = info; renderSpecies(false);
    },
    hideSpecies() { S.species = null; S.speciesSig = ''; panel.classList.remove('on'); root.classList.remove('sp-open'); layoutCoach(); },

    showEvent(ev) {
      if (!ev) return;
      const w = makeModal('event', `<div class="ev-badge">${icon('bang')}</div><small class="ev-kicker">קורה ${zoneWord('in')}</small><h2>${esc(ev.title)}</h2><p class="ev-text">${esc(ev.text)}</p>
        <div class="ev-choices">${(ev.choices || []).map((c, i) => `<button class="btn ${i === 0 ? 'primary' : 'soft'}" data-id="${esc(c.id)}">${esc(c.label)}</button>`).join('')}</div>`, 'ev');
      w.querySelector('.ev-choices').addEventListener('click', (e) => {
        const b = e.target.closest('button[data-id]'); if (!b) return;
        closeModal('event'); emit('event:choice', { eventId: ev.id, choiceId: b.dataset.id });
      });
    },
    hideEvent() { closeModal('event'); },
    hideOutcome() { closeModal('outcome'); },
    cancelDrag() { if (S.press) endPress(true, true); },
    showOutcome(o) {
      if (!o) return;
      const w = makeModal('outcome', `<div class="ev-badge good">${icon('sprout')}</div><h2>${esc(o.title)}</h2><p class="ev-text">${esc(o.text)}</p>
        <div class="ev-choices"><button class="btn primary" data-close>המשך</button></div>`, 'ev');
      w.querySelector('[data-close]').addEventListener('click', () => { closeModal('outcome'); emit('outcome:close'); });
    },

    discovery(d) {
      if (!d) return;
      const col = d.color || '#f0b44c';
      const t = h('div', 'toast discovery paper', `<header>${icon('sparkle')}<b>גילית קשר חדש!</b></header>
        <div class="dc-link" style="--rc:${esc(col)}"><span class="dc-a">${esc(d.fromName)}</span><span class="dc-line"><em>${esc(d.typeName || '')}</em></span><span class="dc-b">${esc(d.toName)}</span></div>
        ${d.text ? `<p>${esc(d.text)}</p>` : ''}`);
      pushToast(t, 6500);
    },
    toast(text, kind = 'info', ms = 0) {
      const ic = { info: 'leaf', good: 'check', warn: 'bang', bad: 'bang' }[kind] || 'leaf';
      const t = h('div', `toast small glass k-${kind}`, `<span class="t-ic">${icon(ic)}</span><span>${esc(text)}</span>`);
      pushToast(t, ms || (kind === 'bad' || kind === 'warn' ? 4600 : 3400));
    },
    floatText(x, y, text, color) {
      const f = h('div', 'float', esc(text), fxEl);
      f.style.left = x + 'px'; f.style.top = y + 'px'; if (color) f.style.color = color;
      setTimeout(() => f.remove(), 1700);
    },

    showHover(p) {
      if (!p) return;
      const sig = (p.name || '') + '|' + (p.sub || '');
      if (hoverEl.dataset.sig !== sig) { hoverEl.dataset.sig = sig; hoverEl.innerHTML = `<b>${esc(p.name)}</b>${p.sub ? `<small>${esc(p.sub)}</small>` : ''}`; }
      const w = hoverEl.offsetWidth || 120;
      const x = Math.max(8, Math.min(innerWidth - w - 8, p.x - w / 2)), y = Math.max(8, p.y - 56);
      hoverEl.style.transform = `translate(${x}px, ${y}px)`; hoverEl.classList.add('on');
    },
    hideHover() { hoverEl.classList.remove('on'); },

    setLayers(layers, activeId) {
      S.layers = Array.isArray(layers) ? layers.filter((l) => l.id !== 'all') : [];
      S.activeLayer = activeId || 'all';
      const n = S.layers.length;
      layersEl.innerHTML = `<button class="ly-all" data-id="all" title="${zoneWord('all')}" aria-label="${zoneWord('all')}">${icon('tree')}<span>${zoneWord('all')}</span></button><div class="strata">` +
        S.layers.map((l, i) => `<button data-id="${esc(l.id)}" aria-label="${esc(l.name)}" style="--lt:${LAYER_TINT[l.id] || mix('#a8cf7a', '#7a5636', n > 1 ? i / (n - 1) : 0)}"><span>${esc(l.name)}</span></button>`).join('') + `</div>`;
      layersEl.setAttribute('aria-label', 'קומות היער');
      layersEl.hidden = !n;
      paintLayers();
    },

    setToggles(t) { Object.assign(S.toggles, t || {}); paintToggles(); },
    // where music could play now ('start' | 'lab' | null): shows the music switch there (main.js calls it every frame)
    setMusicPlace(p) { p = p || ''; if (musicBtn.dataset.place === p) return; musicBtn.dataset.place = p; musicBtn.hidden = !p; },
    isStartShown() { return startEl.classList.contains('on') && !loadEl.classList.contains('on'); },

    showDoneMissions(list) {
      list = Array.isArray(list) ? list : [];
      const w = makeModal('history', `<button class="j-close" title="סגור" aria-label="סגור">${icon('close')}</button>
        <h2>משימות שבוצעו</h2><p class="mh-sub">${list.length ? (list.length === 1 ? 'השלמתם משימה אחת.' : `השלמתם ${fmt(list.length)} משימות.`) : 'עוד לא השלמתם משימות. המשימה הנוכחית מחכה לכם בצד.'}</p>
        <ol class="mh-list">${list.map((m) => `<li><span class="mh-ic">${icon('check')}</span><div><b>${esc(m.title)}</b><p>${esc(m.text || '')}</p>${m.note ? `<p class="mh-note">בוצע: ${esc(m.note)}</p>` : ''}</div></li>`).join('')}</ol>`, 'history');
      const close = () => closeModal('history');
      w.querySelector('.j-close').addEventListener('click', close); w.querySelector('.backdrop').addEventListener('click', close);
    },
    showJournal(j) {
      if (!j) return;
      const st = j.stats || {};
      const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
      const w = makeModal('journal', `<div class="spine"></div><button class="j-close" title="סגור" aria-label="סגור">${icon('close')}</button>
        <header class="j-head"><div><h2>יומן השדה</h2><p>כל מין שפגשת וכל קשר שגילית נרשמים כאן.</p></div>
          <div class="j-stats"><div><b>${fmt(st.discovered || 0)}<small>מתוך ${fmt(st.total || 0)}</small></b><span>מינים שהכרת</span><i style="--p:${pct(st.discovered, st.total)}%"></i></div>
          <div><b>${fmt(st.relationsFound || 0)}<small>מתוך ${fmt(st.relationsTotal || 0)}</small></b><span>קשרים שגילית</span><i style="--p:${pct(st.relationsFound, st.relationsTotal)}%"></i></div></div></header>
        <ul class="j-grid">${(j.species || []).map(journalCard).join('')}</ul>`, 'journal');
      w.querySelector('.j-close').addEventListener('click', () => { emit('journal:close'); ui.hideJournal(); });
      w.querySelector('.backdrop').addEventListener('click', () => { emit('journal:close'); ui.hideJournal(); });
      w.querySelector('.j-grid').addEventListener('click', (e) => { const b = e.target.closest('button[data-id]'); if (b) emit('journal:select', { id: b.dataset.id }); });
    },
    hideJournal() { closeModal('journal'); },

    coach(c) {
      if (!c) return ui.hideCoach();
      S.coach = c;
      let dots = ''; for (let i = 1; i <= (c.total || 0); i++) dots += `<i class="${i === c.step ? 'on' : i < c.step ? 'past' : ''}"></i>`;
      const last = c.total && c.step >= c.total;
      coachEl.innerHTML = `<div class="c-arrow"></div><div class="c-body"><span class="c-ic">${icon('sprout')}</span><p>${esc(c.text)}</p></div>
        <footer><span class="c-dots">${dots}</span><button class="btn link" data-c="skip">דלג</button><button class="btn primary sm" data-c="next">${last ? 'סיימתי' : 'הבא'}</button></footer>`;
      coachEl.classList.add('on');
      requestAnimationFrame(() => { layoutCoach(); requestAnimationFrame(layoutCoach); });
    },
    hideCoach() { S.coach = null; coachEl.classList.remove('on'); coachRing.classList.remove('on'); },

    // d.dismiss: the button id that Escape / a click outside the box stands for.
    // A dialog with a single button (an "OK" note) can always be dismissed that way.
    showDialog(d) {
      if (!d) return;
      const buttons = d.buttons || [{ id: 'ok', label: 'אישור' }];
      const w = makeModal('dialog', `<h2>${esc(d.title)}</h2><div class="dl-text">${esc(d.text).replace(/\n/g, '<br>')}</div>
        <div class="ev-choices row">${buttons.map((b, i) => `<button class="btn ${b.kind === 'back' ? 'link' : i === 0 ? 'primary' : 'soft'}" data-id="${esc(b.id)}">${esc(b.label)}</button>`).join('')}</div>`, 'dialog');
      w._dismiss = d.dismiss || (buttons.length === 1 ? buttons[0].id : null);
      w.querySelector('.ev-choices').addEventListener('click', (e) => {
        const b = e.target.closest('button[data-id]'); if (!b) return;
        closeModal('dialog'); emit('dialog:button', { id: b.dataset.id });
      });
      w.querySelector('.backdrop').addEventListener('click', () => { if (open.dialog === w) dismissDialog(); });
      const first = w.querySelector('.ev-choices button'); if (first) requestAnimationFrame(() => { try { first.focus({ preventScroll: true }); } catch (e) { } });
    },
    hideDialog() { closeModal('dialog'); },

    setExperiment(x) {
      if (!x || !x.active) { expEl.classList.remove('on'); expEl.dataset.name = ''; root.classList.remove('has-experiment'); return; }
      root.classList.add('has-experiment');
      if (expEl.dataset.name !== x.name) {
        expEl.dataset.name = x.name;
        expEl.innerHTML = `<span class="ex-ic">${icon('flask')}</span><div><small>ניסוי</small><b>מה קורה ליער בלי ${esc(x.name)}?</b></div>
          <span class="ex-time">${icon('hourglass')}<em></em></span><button class="btn amber sm">${icon('undo')}החזר</button>`;
        expEl.querySelector('button').addEventListener('click', () => emit('experiment:end'));
      }
      const em = expEl.querySelector('.ex-time em');
      const sec = Math.max(0, Math.ceil(x.secondsLeft || 0));
      em.textContent = x.secondsLeft == null ? '' : `עוד ${sec} שניות`;
      expEl.classList.add('on');
    },

    // 1.3.2 – the play mode of the open forest: 'experience' (חוויה: less text), 'full', 'kids', or null (a mystery / no forest)
    setPlayMode(m) {
      S.play = m || null;
      root.classList.toggle('play-xp', m === 'experience');
      whatBtn.querySelector('span').textContent = m === 'kids' ? 'מָה עוֹשִׂים עַכְשָׁו?' : 'מה עושים עכשיו?';
      whatBtn.hidden = !m;
      if (m !== 'experience') flushToasts();
      S.missionsSig = ''; S.speciesSig = '';
      if (S.species) renderSpecies(true);
    },
    // injured animals: [{ uid, id, name, cause, color, thumb, saving, left (0..1 of the time it still waits) }]
    // a fixed red bar at the top, one chip per animal, until it is healed or gone. A click flies the camera to it
    // ('injured:focus') and makes the rescue robot pulse in the tray's technology tab.
    setInjured(list) {
      list = Array.isArray(list) ? list : [];
      S.injured = list;
      const keep = new Set(list.map((x) => String(x.uid)));
      hurtBar.querySelectorAll('.hb-chip').forEach((el) => { if (!keep.has(el.dataset.uid)) el.remove(); });
      for (const x of list) {
        let el = hurtBar.querySelector(`.hb-chip[data-uid="${x.uid}"]`);
        if (!el) {
          el = h('button', 'hb-chip', `<span class="hb-pic">${x.thumb ? `<img src="${esc(x.thumb)}" alt="" draggable="false">` : ''}<i class="hb-bang">!</i></span>
            <span class="hb-txt"><b>${esc(x.name)}</b><small></small></span><span class="hb-time"><i></i></span>`, hurtBar);
          el.dataset.uid = x.uid; el.style.setProperty('--c', x.color || '#e5483b');
        }
        const sm = el.querySelector('small'), t = x.saving ? 'רובוט ההצלה בדרך!' : x.cause;
        if (sm.textContent !== t) sm.textContent = t;
        el.classList.toggle('saving', !!x.saving); el.classList.toggle('late', !x.saving && x.left < 0.3);
        el.querySelector('.hb-time i').style.width = (clamp01(x.left) * 100).toFixed(0) + '%';
        el.setAttribute('aria-label', `${x.name}: ${t}. לחצו כדי להגיע אליו`);
      }
      const any = list.length > 0;
      hurtBar.hidden = !any; root.classList.toggle('has-hurt', any);
      if (!any && S.rescueHelp) { S.rescueHelp = false; renderTray(false); }
    },
    // arrows at the screen's edge pointing to injured animals out of view: [{ uid, x, y, ang (degrees, screen) }]
    setHurtArrows(list) {
      list = Array.isArray(list) ? list : [];
      const keep = new Set(list.map((x) => String(x.uid)));
      hurtArrowsEl.querySelectorAll('.ha').forEach((el) => { if (!keep.has(el.dataset.uid)) el.remove(); });
      for (const a of list) {
        let el = hurtArrowsEl.querySelector(`.ha[data-uid="${a.uid}"]`);
        if (!el) { el = h('button', 'ha', '<i class="ha-pt"></i><b>!</b>', hurtArrowsEl); el.dataset.uid = a.uid; el.setAttribute('aria-label', 'בעל חיים פגוע: לחצו כדי להגיע אליו'); }
        el.style.left = a.x + 'px'; el.style.top = a.y + 'px'; el.style.setProperty('--a', a.ang + 'deg');
      }
    },

    isModalOpen() {
      return !!(open.event || open.outcome || open.dialog || open.journal) || !!root.querySelector('.rep-layer.on') || startEl.classList.contains('on') || loadEl.classList.contains('on');
    },
  };
  return ui;
}
