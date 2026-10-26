// Play time for the parents (1.3.3): how long the game may be played each day on this computer. One limit for all the
// players together (it belongs to the computer, not to a player): 30, 60 or 120 minutes a day, or no limit (the default,
// so every computer that upgrades keeps playing as before). Changing it, or adding time on a day that ran out, takes the
// parents' code. The UI is src/ui/playtime-ui.js (the lock screen, the warning, the start screen's chip) and the 'time'
// row of src/ui/settings.js.
//
//   PARENT_CODE                      the parents' code (written in the message to the parents)
//   LIMITS                           [30, 60, 120, 0] – minutes a day (0 = no limit)
//   limitMin()                       the limit now (0 = none)
//   setLimit(min, code) → bool       a wrong code changes nothing
//   addToday(min, code) → bool       more time for today only (the lock screen)
//   checkCode(code) → bool
//   usedSec(), leftSec()             today's play time and what is left (Infinity without a limit)
//   count(sec)                       add play time (playtime-ui.js counts while the window is seen); a new day starts at 0
//   timeUp() → bool
//   fmtLeft(kids) → 'עוד 25 דקות'    for the chip and the settings row
//
// Saved in 'web-of-life-playtime' (core/storage.js): { lim, day, s, extra } – the day is the computer's local date.
import { K, readDevice, writeDevice } from './storage.js';

export const PARENT_CODE = '2358';
export const LIMITS = [30, 60, 120, 0];

const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
let S = null;
function st() {
  if (!S) {
    const v = readDevice(K.playtime, null) || {};
    S = { lim: LIMITS.includes(v.lim) ? v.lim : 0, day: typeof v.day === 'string' ? v.day : today(), s: Math.max(0, +v.s || 0), extra: Math.max(0, +v.extra || 0) };
  }
  if (S.day !== today()) { S.day = today(); S.s = 0; S.extra = 0; save(); }
  return S;
}
function save() { if (S) writeDevice(K.playtime, { lim: S.lim, day: S.day, s: Math.round(S.s), extra: S.extra }); }
const changed = () => { try { dispatchEvent(new CustomEvent('wol-playtime')); } catch (e) { } };

export const checkCode = (code) => String(code == null ? '' : code).trim() === PARENT_CODE;
export const limitMin = () => st().lim;
export function setLimit(min, code) {
  if (!checkCode(code) || !LIMITS.includes(min)) return false;
  st().lim = min; save(); changed(); return true;
}
export function addToday(min, code) {
  if (!checkCode(code) || !(min > 0)) return false;
  st().extra += min; save(); changed(); return true;
}
export const usedSec = () => st().s;
export const leftSec = () => { const s = st(); return s.lim ? Math.max(0, (s.lim + s.extra) * 60 - s.s) : Infinity; };
export const timeUp = () => leftSec() <= 0;

let unsaved = 0;
export function count(sec) {
  if (!(sec > 0)) return;
  const s = st(); s.s += sec; unsaved += sec;
  if (unsaved >= 15 || (s.lim && leftSec() <= 0)) { unsaved = 0; save(); }
}
export function flush() { unsaved = 0; save(); }

// "עוד 25 דקות" / "עוד שעה ו־10 דקות"; beginners get the vowels
export function fmtLeft(kids) {
  const left = leftSec(); if (left === Infinity) return '';
  const m = Math.ceil(left / 60);
  if (m <= 0) return kids ? 'הַזְּמַן נִגְמַר' : 'הזמן נגמר';
  if (m === 1) return kids ? 'עוֹד דַּקָּה' : 'עוד דקה';
  const h = Math.floor(m / 60), r = m % 60;
  const mins = (n) => (n === 1 ? (kids ? 'דַּקָּה' : 'דקה') : n + (kids ? ' דַּקּוֹת' : ' דקות'));
  const hrs = h === 1 ? (kids ? 'שָׁעָה' : 'שעה') : h === 2 ? (kids ? 'שְׁעָתַיִם' : 'שעתיים') : h + (kids ? ' שָׁעוֹת' : ' שעות');
  const w = kids ? 'עוֹד ' : 'עוד ';
  if (!h) return w + mins(r);
  return w + hrs + (r ? (kids ? ' וְ' : ' ו־') + mins(r) : '');
}

// headless checks: window.__playtime (no code needed for the test helpers' reading, the code for writing)
try { window.__playtime = { limitMin, setLimit, addToday, usedSec, leftSec, timeUp, count, fmtLeft, _reset: () => { S = null; } }; } catch (e) { }
