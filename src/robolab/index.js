// מעבדת הרובוטים (1.4.1) – "מתכננים, בונים ומפעילים". A whole part of the game in the science centre: lessons in
// chapters, puzzles, three tools (ground robot, drone, diving robot) on maps of the zones, programs made of picture
// blocks, funny blocks and funny mistakes. The pack 'robolab' (src/packs/robolab.js) loads it on demand.
//   const R = createRoboLab({ root, audio, kids, onExit })   R.open(); R.close(); R.isOpen()
// Data: src/data/robolab/ (lessons, puzzles). Engine: ./engine/ (pure). Screen: ./ui/ (map, editor, icons).
// Progress per player: ./progress.js. Debug (headless tests): window.__rlDebug = { open(id), solve(id), run(), state() }.
import { CHAPTERS, LESSONS, PUZZLES, ALL_LEVELS } from '../data/robolab/index.js';
import { runProgram } from './engine/run.js';
import { levelOf } from './engine/level.js';
import { createMap } from './ui/map.js';
import { createRoboSession } from './three/session.js';
import { openGarage } from './garage.js';
import { createEditor } from './ui/editor.js';
import { icon } from './ui/icons.js';
import { isOpen as journeyOpen, lockWords } from '../core/journey.js';
import { roboProgress, markSolved, addFun, markSeen } from './progress.js';
import { FAIL_LINES, GOAL_LINES, WIN_LINES, OOPS_LINES, FUN_LINES } from '../data/robolab/lines.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pick = (arr, seed) => arr[Math.abs(seed | 0) % arr.length];
const ZONE_WORD = { grove: { f: 'חורש', k: 'חֹרֶשׁ' }, amazon: { f: 'אמזונס', k: 'אָמָזוֹנַס' }, reef: { f: 'שונית', k: 'שׁוּנִית' }, desert: { f: 'מדבר', k: 'מִדְבָּר' } };

export function createRoboLab({ root, audio, kids = false, onExit, enter3d = null, leave3d = null }) {
  const T = (o) => (o ? (kids && o.k ? o.k : o.f) : '');
  const el = document.createElement('div');
  el.className = 'rl'; el.hidden = true; el.setAttribute('dir', 'rtl');
  root.appendChild(el);
  let open = false, map = null, ed = null, cur = null, lastRun = null, seedN = 1;
  const sfx = (n) => { try { audio && audio.play && audio.play(n); } catch (e) { } };

  // ── the home of the lab: chapters of lessons and the puzzles
  const levelOpen = (L, P) => {
    const list = L.puzzle ? PUZZLES : LESSONS.filter((q) => q.ch === L.ch);
    const i = list.indexOf(L);
    if (L.puzzle) return !L.after || !!P.done[L.after];
    if (L.ch > 1 && !journeyOpen('robolab:more')) return false;   // chapter 2 and on: stage 7 of מסע החוקר
    const chOpen = L.ch === 1 || LESSONS.filter((q) => q.ch === L.ch - 1).filter((q) => P.done[q.id]).length >= 3;
    return chOpen && (i === 0 || !!P.done[list[i - 1].id]);
  };
  const stars = (n) => [0, 1, 2].map((k) => `<i class="${k < n ? 'on' : ''}">${icon('star')}</i>`).join('');
  function home() {
    stopRun(); if (map) { map.dispose(); map = null; } ed = null; cur = null;
    // the island stays loaded behind the home (Avi, 29.10: no waiting between lessons): the next lesson in the same zone
    // opens at once; main.js neither updates nor draws it while the home covers it (coversGame)
    if (in3d) { el.classList.remove('in3d'); root.classList.remove('rl3d'); if (in3d.api) in3d.api.course.stop(); try { audio && audio.setBiome && audio.setBiome(null); } catch (e) { } }
    const P = roboProgress();
    const nDone = Object.keys(P.done).length;
    el.innerHTML = `<div class="rl-home">
      <header class="rl-top"><button type="button" class="rl-back" data-exit>${icon('home')}<span>${kids ? 'יְצִיאָה' : 'יציאה'}</span></button>
        <div class="rl-title"><h1>${kids ? 'מַעְבֶּדֶת הָרוֹבּוֹטִים' : 'מעבדת הרובוטים'}</h1><p>${kids ? 'מְתַכְנְנִים, בּוֹנִים וּמַפְעִילִים' : 'מתכננים, בונים ומפעילים'}</p></div>
        <button type="button" class="rl-gbtn" data-garage>${icon('paint')}<span>${kids ? 'סַדְנַת הָעִצּוּב' : 'סדנת העיצוב'}</span></button>
        <div class="rl-count">${icon('star')}<b>${nDone}</b><small>${kids ? 'פְּתוּרִים' : 'פתורים'}</small></div></header>
      <div class="rl-scroll">
        <section class="rl-sec"><h2>${icon('lesson')}${kids ? 'שִׁעוּרִים' : 'שיעורים'}</h2>
          ${CHAPTERS.map((C) => { const ls = LESSONS.filter((q) => q.ch === C.n); if (!ls.length) return '';
            return `<div class="rl-ch" style="--cc:${C.color}"><div class="rl-chh"><b>${C.n}</b><span><strong>${esc(T(C.title))}</strong><small>${esc(T(C.idea))}</small>${C.n > 1 && !journeyOpen('robolab:more') ? `<em class="rl-lock">${esc(lockWords('robolab:more'))}</em>` : ''}</span></div>
            <div class="rl-lv">${ls.map((L, i) => { const ok = levelOpen(L, P), d = P.done[L.id];
              return `<button type="button" class="rl-lvb${d ? ' done' : ''}" data-level="${L.id}" ${ok ? '' : 'disabled'} title="${esc(T(L.title))}"><span class="rl-z z-${L.zone}"></span><b>${i + 1}</b><span class="rl-st">${stars(d ? d.stars : 0)}</span></button>`; }).join('')}</div></div>`; }).join('')}
        </section>
        ${PUZZLES.length ? `<section class="rl-sec"><h2>${icon('puzzle')}${kids ? 'חִידוֹת' : 'חידות'}</h2><div class="rl-pz">${PUZZLES.map((L) => { const ok = levelOpen(L, P), d = P.done[L.id];
          return `<button type="button" class="rl-pzb${d ? ' done' : ''}" data-level="${L.id}" ${ok ? '' : 'disabled'}><span class="rl-z z-${L.zone}"></span><b>${esc(T(L.title))}</b><span class="rl-st">${stars(d ? d.stars : 0)}</span></button>`; }).join('')}</div></section>` : ''}
      </div></div>`;
  }

  // ── one level: the teacher's words, the map, the palette and the program, the run buttons
  // A lesson opens in its zone's island (Avi, 29.10: "everything in 3D, in controlled environments"): main.js loads the
  // forest as a controlled place and our session lays the field (three/session.js), then calls mountLevel with it.
  // Without a 3D host (tests of the screen alone, a failed load) the flat map is the fallback.
  let in3d = null;          // { api } while a lesson's island is open
  let garage = null;        // סדנת העיצוב while open (garage.js)
  function openLevel(id, { flat = false } = {}) {
    const L = ALL_LEVELS.find((q) => q.id === id); if (!L) return;
    if (enter3d && !flat) {
      if (in3d && in3d.zone === L.zone && in3d.api) { stopRun(); in3d.api.rebuild(L, { quick: true }); mountLevel(L, in3d.api); return; }
      if (in3d) end3d();
      stopRun(); if (map) { map.dispose(); map = null; }
      cur = L; el.hidden = true;
      in3d = { zone: L.zone, api: null };
      const desc = { robolab: true, zone: L.zone, level: L, id: 'robolab:' + L.id,
        makeSession: (ctx) => createRoboSession(ctx, desc),
        attach: (api) => { if (!in3d) return; in3d.api = api; el.hidden = false; root.classList.add('rl3d'); mountLevel(cur || L, api); },
        detach: () => { root.classList.remove('rl3d'); },
        onExit: () => { in3d = null; root.classList.remove('rl3d'); el.hidden = false; home(); } };
      enter3d(desc);
      return;
    }
    mountLevel(L, null);
  }
  function end3d() { const was = in3d; in3d = null; root.classList.remove('rl3d'); el.classList.remove('in3d'); if (was && leave3d) leave3d(); el.hidden = !open; }
  // the course as the screen sees it: the same calls as the flat map
  const stage3d = (api) => ({ reset: () => api.course.reset(), play: (tr, o) => api.course.play(tr, o), stop: () => api.course.stop(), isPlaying: () => api.course.isPlaying(), redraw: () => { }, dispose: () => { } });
  function mountLevel(L, api) {
    stopRun(); if (map) map.dispose();
    cur = L; lastRun = null;
    el.classList.toggle('in3d', !!api); root.classList.toggle('rl3d', !!api);
    if (api) { try { audio && audio.setBiome && audio.setBiome(L.zone); } catch (e) { } }
    const zw = ZONE_WORD[L.zone] || ZONE_WORD.grove;
    el.innerHTML = `<div class="rl-level z-${L.zone}">
      <header class="rl-top"><button type="button" class="rl-back" data-home>${icon('home')}<span>${kids ? 'לַמַּעְבָּדָה' : 'למעבדה'}</span></button>
        <div class="rl-title"><h1>${esc(T(L.title))}</h1><p>${esc(T(zw))}${L.concept ? ' · ' + esc(T(conceptWord(L.concept))) : ''}</p></div>
        <div class="rl-goalbar"><span class="rl-par">${icon('star')}${icon('star')}${icon('star')} ${kids ? 'עַד' : 'עד'} <b>${L.par || '?'}</b> ${kids ? 'בְּלוֹקִים' : 'בלוקים'}</span></div></header>
      <div class="rl-say"><span class="rl-teach" aria-hidden="true"></span><p>${(L.say || []).map((s) => esc(T(s))).join(' ')}</p></div>
      <div class="rl-body">
        <div class="rl-ed"></div>
        <div class="rl-stage"><canvas class="rl-map"></canvas><div class="rl-msg" hidden></div>
          <div class="rl-run">
            <button type="button" class="rl-go" data-run="normal">${icon('play')}<span>${kids ? 'הַפְעֵל' : 'הפעל'}</span></button>
            <button type="button" data-run="slow">${icon('slow')}<span>${kids ? 'לְאַט' : 'לאט'}</span></button>
            <button type="button" data-again>${icon('again')}<span>${kids ? 'מֵהַהַתְחָלָה' : 'מההתחלה'}</span></button>
            <button type="button" data-why disabled>${icon('why')}<span>${kids ? 'מָה קָרָה?' : 'מה קרה?'}</span></button>
            ${api ? `<button type="button" data-view aria-label="${kids ? 'לְהַחֲזִיר אֶת הַמַּבָּט' : 'להחזיר את המבט'}">${icon('eye')}</button>` : ''}
          </div></div>
      </div></div>`;
    ed = createEditor(el.querySelector('.rl-ed'), { lesson: L, kids, onChange: () => { lastRun = null; el.querySelector('[data-why]').disabled = true; if (map && !map.isPlaying()) map.reset(); hideMsg(); } });
    if (api) { map = stage3d(api); el.querySelector('.rl-map').remove(); }
    else { map = createMap(el.querySelector('.rl-map'), L, L.zone); requestAnimationFrame(() => map && map.redraw()); }
  }
  const CONCEPT = {
    step: { f: 'סדר פעולות', k: 'סֵדֶר פְּעֻלּוֹת' }, turn: { f: 'פניות', k: 'פְּנִיּוֹת' }, path: { f: 'מסלול', k: 'מַסְלוּל' }, order: { f: 'קודם ואחר כך', k: 'קֹדֶם וְאַחַר כָּךְ' },
    sub: { f: 'רובוט צוללן', k: 'רוֹבּוֹט צוֹלְלָן' }, drone: { f: 'רחפן', k: 'רַחְפָן' }, loop: { f: 'לולאה', k: 'לוּלָאָה' }, nested: { f: 'לולאה בתוך לולאה', k: 'לוּלָאָה בְּתוֹךְ לוּלָאָה' },
    function: { f: 'בלוק משלי', k: 'בְּלוֹק מִשֶּׁלִּי' }, cond: { f: 'תנאי', k: 'תְּנַאי' }, event: { f: 'אירוע', k: 'אֵרוּעַ' }, counter: { f: 'מונה', k: 'מוֹנֶה' }, team: { f: 'עבודת צוות', k: 'עֲבוֹדַת צֶוֶת' }, puzzle: { f: 'חידה', k: 'חִידָה' },
  };
  const conceptWord = (c) => CONCEPT[c] || { f: '', k: '' };

  function msg(html, kind) { const m = el.querySelector('.rl-msg'); if (!m) return; m.className = 'rl-msg ' + (kind || ''); m.innerHTML = html; m.hidden = false; }
  function hideMsg() { const m = el.querySelector('.rl-msg'); if (m) m.hidden = true; }
  function stopRun() { if (map) map.stop(); if (ed) ed.light(null); }

  function run(speed) {
    if (!cur || !ed) return;
    hideMsg();
    const prog = ed.program();
    const r = runProgram(levelOf(cur), prog);
    lastRun = r; seedN++;
    el.querySelector('[data-why]').disabled = true;
    let oopsShown = false;
    map.play(r.trace, { speed, onStep: (e) => {
      ed.light(e.nid);
      if (e.a === 'oops' && !oopsShown) { oopsShown = true; msg(esc(T(pick(OOPS_LINES[e.want] || OOPS_LINES.any, seedN))), 'oops'); sfx('pop'); }
      if (FUN_LINES[e.a]) { sfx('pop'); const n = addFun(); if (n === 1 || n % 10 === 0) msg(esc(T(pick(FUN_LINES[e.a], seedN))), 'fun'); }
      if (e.a === 'fail') sfx('invalid');
    }, onEnd: () => {
      ed.light(null);
      el.querySelector('[data-why]').disabled = false;
      if (r.ok) {
        const { first } = markSolved(cur.id, r.stars, r.blocks);
        msg(`<div class="rl-win"><span class="rl-st big">${stars(r.stars)}</span><b>${esc(T(pick(WIN_LINES, seedN)))}</b><small>${r.blocks} ${kids ? 'בְּלוֹקִים' : 'בלוקים'}${r.stars < 3 && cur.par ? ' · ' + esc(T({ f: 'אפשר גם ב־' + cur.par, k: 'אֶפְשָׁר גַּם בְּ־' + cur.par })) : ''}</small>
          <span class="rl-winb"><button type="button" data-next>${kids ? 'לַשִּׁעוּר הַבָּא' : 'לשיעור הבא'}</button><button type="button" data-stay>${kids ? 'לְנַסּוֹת שׁוּב' : 'לנסות שוב'}</button></span></div>`, 'win');
        sfx(first ? 'mission' : 'pop');
      } else {
        const why = r.error ? (FAIL_LINES[r.error.code] || FAIL_LINES.any) : (GOAL_LINES[r.why] || GOAL_LINES.any);
        msg(esc(T(pick(why, seedN))), 'fail');
      }
    } });
  }
  // "מה קרה?": the run's story in a few lines: what each tool did, where it stopped and why
  function why() {
    if (!lastRun) return;
    const r = lastRun, n = r.trace.filter((e) => e.a !== 'fail').length;
    const lines = [];
    lines.push(kids ? `הַתָּכְנִית עָשְׂתָה ${n} צְעָדִים.` : `התוכנית עשתה ${n} צעדים.`);
    const oops = r.trace.filter((e) => e.a === 'oops').length;
    if (oops) lines.push(kids ? `${oops} פְּעֻלּוֹת נַעֲשׂוּ בַּמָּקוֹם הַלֹּא נָכוֹן.` : `${oops} פעולות נעשו במקום הלא נכון (שם לא היה מה לעשות).`);
    if (r.error && r.error.x != null) lines.push(kids ? `הָעֲצִירָה הָיְתָה בַּמִּשְׁבֶּצֶת הַמְּסֻמֶּנֶת.` : `העצירה הייתה במשבצת המסומנת. בדקו את הבלוק שמואר.`);
    if (!r.ok && !r.error) lines.push(esc(T(pick(GOAL_LINES[r.why] || GOAL_LINES.any, 0))));
    msg(lines.map((l) => `<p>${l}</p>`).join(''), 'why');
    const last = [...r.trace].reverse().find((e) => e.nid); if (last) ed.light(last.nid);
  }

  el.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || !el.contains(b) || b.disabled) return;
    if (b.dataset.exit != null) { close(); if (onExit) onExit(); return; }
    if (b.dataset.home != null) { sfx('click'); home(); return; }
    if (b.dataset.garage != null) { sfx('click'); if (garage) garage.close(); garage = openGarage(el, { kids, sfx, onClose: () => { garage = null; } }); return; }
    if (b.dataset.level) { sfx('click'); openLevel(b.dataset.level); return; }
    if (b.dataset.run) { run(b.dataset.run); return; }
    if (b.dataset.again != null) { stopRun(); hideMsg(); map.reset(); return; }
    if (b.dataset.why != null) { why(); return; }
    if (b.dataset.view != null) { if (in3d && in3d.api) in3d.api.frame(); return; }
    if (b.dataset.stay != null) { hideMsg(); map.reset(); return; }
    if (b.dataset.next != null) {
      const list = cur.puzzle ? PUZZLES : LESSONS; const i = list.indexOf(cur);
      const nx = list[i + 1]; if (nx) openLevel(nx.id); else home(); return;
    }
  });
  const onKey = (e) => { if (!open) return; if (e.key === 'Escape') { e.preventDefault(); if (cur) home(); else { close(); if (onExit) onExit(); } } };
  window.addEventListener('keydown', onKey);

  function openLab() { open = true; el.hidden = false; markSeen('home'); home(); }
  function close() { open = false; stopRun(); if (garage) { garage.close(); garage = null; } if (in3d) end3d(); if (map) { map.dispose(); map = null; } el.hidden = true; el.innerHTML = ''; }
  const R = {
    open: openLab, close, isOpen: () => open,
    coversGame: () => open && !!in3d && !el.classList.contains('in3d'),   // the home over a kept island (main.js skips it)
    dispose: () => { close(); window.removeEventListener('keydown', onKey); el.remove(); },
  };
  // headless tests
  window.__rlDebug = {
    open: (id, flat) => (id ? openLevel(id, { flat: !!flat }) : home()),
    in3d: () => !!(in3d && in3d.api),
    garage: () => { if (garage) garage.close(); garage = openGarage(el, { kids, sfx, onClose: () => { garage = null; } }); return true; },
    solve: (id, i = 0) => { const L = ALL_LEVELS.find((q) => q.id === id); if (!L) return null; if (!(in3d && in3d.api && cur && cur.id === id)) openLevel(id, { flat: true }); ed.set({ ...L.solutions[i], defs: { ...(L.defs0 || {}), ...(L.solutions[i].defs || {}) } }); run('fast'); return lastRun && { ok: lastRun.ok, stars: lastRun.stars }; },
    run: (speed = 'fast') => run(speed), last: () => lastRun && { ok: lastRun.ok, stars: lastRun.stars, why: lastRun.why, error: lastRun.error },
    levels: () => ALL_LEVELS.map((q) => q.id),
  };
  return R;
}
