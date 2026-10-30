// The parents' play time on screen (1.3.3; the rules are in core/playtime.js):
//   - counts play time once a second while the game's window is seen (a hidden or minimised window does not count);
//   - a gentle note five minutes and one minute before the end;
//   - when the day's time is over: a screen over everything (the forest stops, the sounds stop, the keys do nothing)
//     with רובו־דע's goodbye; the parents can add time today with their code, or close the game (desktop);
//   - the start screen's chip (.st-time, next to the gear) shows what is left today, only when there is a limit.
//
//   startPlaytime({ root, kids, onLock, onUnlock }) → { locked() }
//     kids()      true for a beginner (the words get vowels)
//     onLock()    the game goes quiet (main.js: mute, save the forest)   onUnlock()   back as it was
import * as PT from '../core/playtime.js';
import { icon } from './ui/icons.js';
import { ROBO_ART } from '../data/robo-art.js';
import { svcGuide, svcApp } from '../core/services.js';

const CODE_TRIES = 5, CODE_WAIT_MS = 30e3;

export function startPlaytime({ root, kids = () => false, onLock, onUnlock } = {}) {
  const t = (f, k) => (kids() ? k : f);
  let lockEl = null, noteEl = null, noteT = 0, last = performance.now(), warned = '';
  let wrong = 0, waitUntil = 0, codeOk = '';

  function paintChips() {
    const lim = PT.limitMin();
    for (const c of root.querySelectorAll('.st-time')) {
      c.hidden = !lim;
      if (!lim) continue;
      const txt = PT.fmtLeft(kids());
      const b = c.querySelector('b'); if (b && b.textContent !== txt) b.textContent = txt;
      c.classList.toggle('low', PT.leftSec() <= 300);
      c.title = t('זמן המשחק שנשאר היום (ההורים קובעים אותו בהגדרות)', 'הַזְּמַן שֶׁנִּשְׁאַר הַיּוֹם');
    }
  }

  function note(min) {
    if (!noteEl) { noteEl = document.createElement('div'); noteEl.className = 'pt-note'; noteEl.setAttribute('role', 'status'); root.appendChild(noteEl); }
    noteEl.innerHTML = `${icon('hourglass')}<span>${min === 1
      ? t('נשארה דקה אחת של משחק להיום.', 'נִשְׁאֲרָה דַּקָּה אַחַת שֶׁל מִשְׂחָק לְהַיּוֹם.')
      : t('נשארו 5 דקות של משחק להיום. זה זמן טוב לסיים את מה שהתחלתם.', 'נִשְׁאֲרוּ 5 דַּקּוֹת שֶׁל מִשְׂחָק לְהַיּוֹם.')}</span>`;
    noteEl.classList.add('on'); clearTimeout(noteT); noteT = setTimeout(() => noteEl && noteEl.classList.remove('on'), 9000);
  }

  function lockHTML() {
    const face = ROBO_ART && ROBO_ART.frames && (ROBO_ART.frames['wave-happy'] || ROBO_ART.frames['idle-happy']);
    const desk = typeof window !== 'undefined' && !!window.wolDesktop;
    return `<div class="pt-card paper" role="dialog" aria-modal="true" aria-labelledby="pt-h">
      ${face ? `<img class="pt-robo" src="${face}" alt="" draggable="false">` : `<div class="pt-big">${icon('moon')}</div>`}
      <h2 id="pt-h">${t('זמן המשחק של היום נגמר', 'זְמַן הַמִּשְׂחָק שֶׁל הַיּוֹם נִגְמַר')}</h2>
      <p>${t('כל מה שעשיתם נשמר. מחר אפשר להמשיך בדיוק מאותו מקום.', 'כָּל מָה שֶׁעֲשִׂיתֶם נִשְׁמַר. מָחָר מַמְשִׁיכִים מֵאוֹתוֹ מָקוֹם.')}</p>
      <p class="pt-bye">${t('רובו־דע מחכה לכם מחר!', 'רוֹבּוֹ־דַּע מְחַכֶּה לָכֶם מָחָר!')}</p>
      ${desk ? `<button class="btn primary pt-quit" data-pt="quit">${t('לסגור את המשחק', 'לִסְגֹּר אֶת הַמִּשְׂחָק')}</button>` : ''}
      <details class="pt-par"><summary>${icon('sliders')}<span>להורים</span></summary>
        <div class="pt-par-in">
          <div class="pt-ask"><label for="pt-code">קוד הורים</label>
            <div class="set-code"><input id="pt-code" type="password" inputmode="numeric" autocomplete="off" maxlength="8" dir="ltr" aria-label="קוד הורים"><button class="btn primary" data-pt="code">אישור</button></div>
            <p class="pt-err" hidden></p></div>
          <div class="pt-more" hidden><p>כמה זמן להוסיף להיום?</p>
            <div class="pt-btns"><button class="btn soft" data-pt="add" data-min="30">עוד חצי שעה</button><button class="btn soft" data-pt="add" data-min="60">עוד שעה</button></div>
            <small>את ההגבלה היומית משנים בהגדרות שבמסך הפתיחה (גלגל השיניים).</small></div>
        </div></details></div>`;
  }

  function lock() {
    if (lockEl) return;
    if (noteEl) { clearTimeout(noteT); noteEl.classList.remove('on'); }   // the note has nothing more to say
    lockEl = document.createElement('div'); lockEl.className = 'pt-lock';
    lockEl.innerHTML = lockHTML(); root.appendChild(lockEl);
    codeOk = '';
    lockEl.addEventListener('click', onClick);
    lockEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('#pt-code')) { e.preventDefault(); tryCode(); } });
    lockEl.addEventListener('input', (e) => { if (e.target.matches('#pt-code')) { const er = lockEl.querySelector('.pt-err'); if (er) er.hidden = true; } });
    try { svcGuide() && svcGuide().close(); } catch (e) { }
    try { svcApp() && svcApp().voice && svcApp().voice.stop(); } catch (e) { }
    try { onLock && onLock(); } catch (e) { console.error(e); }
  }
  function unlock() {
    if (!lockEl) return;
    lockEl.remove(); lockEl = null; codeOk = '';
    try { onUnlock && onUnlock(); } catch (e) { console.error(e); }
  }
  function tryCode() {
    const inp = lockEl && lockEl.querySelector('#pt-code'); if (!inp) return;
    const err = lockEl.querySelector('.pt-err'); const v = inp.value; inp.value = '';
    if (Date.now() < waitUntil) { err.textContent = 'נסו שוב בעוד חצי דקה'; err.hidden = false; return; }
    if (!PT.checkCode(v)) {
      wrong++; if (wrong >= CODE_TRIES) { wrong = 0; waitUntil = Date.now() + CODE_WAIT_MS; }
      err.textContent = Date.now() < waitUntil ? 'הקוד לא נכון. נסו שוב בעוד חצי דקה' : 'הקוד לא נכון'; err.hidden = false;
      const c = lockEl.querySelector('.set-code'); if (c) { c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); }
      return;
    }
    wrong = 0; codeOk = v;
    lockEl.querySelector('.pt-ask').hidden = true; lockEl.querySelector('.pt-more').hidden = false;
  }
  function onClick(e) {
    const b = e.target.closest('[data-pt]'); if (!b) return;
    const k = b.dataset.pt;
    if (k === 'code') tryCode();
    else if (k === 'add') { if (PT.addToday(+b.dataset.min, codeOk)) check(); }
    else if (k === 'quit') { PT.flush(); try { window.close(); } catch (er) { } }
  }

  function check() {
    paintChips();
    if (PT.limitMin() && PT.timeUp()) lock(); else unlock();
  }

  // a key pressed while the day is over does nothing in the game (only inside the lock screen)
  addEventListener('keydown', (e) => { if (lockEl && !lockEl.contains(e.target)) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  addEventListener('wol-playtime', () => { warned = ''; check(); });
  document.addEventListener('visibilitychange', () => { last = performance.now(); if (document.visibilityState === 'hidden') PT.flush(); });
  addEventListener('beforeunload', () => PT.flush());

  setInterval(() => {
    const now = performance.now(); const dt = Math.min(5, (now - last) / 1000); last = now;   // a computer that slept does not count
    if (document.visibilityState === 'visible' && !lockEl && PT.limitMin()) {
      PT.count(dt);
      const left = PT.leftSec(), day = new Date().toDateString();
      if (left <= 60 && warned !== day + ':1') { warned = day + ':1'; note(1); }
      else if (left <= 300 && left > 60 && !warned.startsWith(day)) { warned = day + ':5'; note(5); }
    }
    check();   // also the new day (core/playtime.js starts it at 0) and a limit changed in the settings
  }, 1000);
  check();
  return { locked: () => !!lockEl, check };
}
