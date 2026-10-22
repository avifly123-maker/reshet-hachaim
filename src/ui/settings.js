// Settings (1.3.2): the sheet that opens from the gear next to "מי משחק?" on the start screen, and the same three rows
// (play mode, text size, voice) inside the forest's satchel menu.
//
//   settingsRowsHTML({ rows })        HTML of the rows; rows: a list of 'mode' | 'text' | 'voice' | 'music' | 'again' | 'staff'
//                                     | 'sound' | 'quality' | 'sources' (the computer's rows: o.getSound/setSound, o.getQuality/setQuality;
//                                     'sources' only in the torah edition) | 'h:me' / 'h:pc' (a small heading)
//                                     (default: the three rows the forest shows: mode, text, voice)
//   bindSettingsRows(el, { emit, getMusic, onChange })   one delegated click handler on `el` (safe to call again)
//   paintSettingsRows(el)             re-read the current values (another player, a change elsewhere)
//   openSettings(host, { emit, getMusic, onClose }) → { close }   the full sheet (start screen)
//
// Everything is per player (core/journey.js). The play mode row is hidden for beginners: they always play their own
// simple mode. The instructors' row never shows the code; it only takes it.
import { icon } from './ui/icons.js';
import { esc } from './ui/helpers.js';   // not the ui.js barrel: it would close an import cycle (ui → start → settings → ui)
import * as J from '../core/journey.js';
import { TORAH, sourcesOn, setSourcesOn } from '../core/edition.js';
import { resetHowto } from './howto.js';

const kids = () => J.playMode() === 'kids';
const t = (f, k) => (kids() ? k : f);
// the torah edition's sources switch: one name, one icon and one description here and in the learning hub's settings
// (src/learn/hub/home.js openSettings) – [words, beginners' words]
export const SOURCES_T = {
  icon: 'scroll',
  name: ['מקורות ופסוקים', 'מְקוֹרוֹת וּפְסוּקִים'],
  about: ['פסוקים ומאמרי חז״ל בקלפים, במשימות, בחידון ובמשחק "מה הפסוק מלמד?"', 'פְּסוּקִים וּמַאַמְרֵי חֲזַ״ל בַּקְּלָפִים, בַּמְּשִׂימוֹת, בַּחִידוֹן וּבַמִּשְׂחָק "מָה הַפָּסוּק מְלַמֵּד?"'],
};

const SIZES = [
  { id: 'normal', f: 'רגיל', k: 'רָגִיל', em: 0.95 },
  { id: 'large', f: 'גדול', k: 'גָּדוֹל', em: 1.2 },
  { id: 'xlarge', f: 'גדול מאוד', k: 'גָּדוֹל מְאֹד', em: 1.45 },
];

// the instructors' code: after a few wrong tries the field waits a little (no guessing in a row); for this visit only
const CODE_TRIES = 5, CODE_WAIT_MS = 30e3;
let codeWrong = 0, codeWaitUntil = 0;

function sw(on) { return `<i class="set-sw${on ? ' on' : ''}" aria-hidden="true"></i>`; }

function rowHTML(id, o) {
  if (id === 'mode') {
    if (kids()) return '';
    const m = J.playMode();
    return `<div class="set-row" data-row="mode"><div class="set-lab">${icon('leaf')}<span><b>איך משחקים ביער?</b><small>אפשר להחליף בכל רגע</small></span></div>
      <div class="set-seg" role="radiogroup" aria-label="איך משחקים ביער?">
        <button role="radio" data-set="mode" data-v="experience" aria-checked="${m === 'experience'}"><b>חוויה</b><small>פחות מילים</small></button>
        <button role="radio" data-set="mode" data-v="full" aria-checked="${m === 'full'}"><b>מלא</b><small>כל הפרטים</small></button></div></div>`;
  }
  if (id === 'text') {
    const s = J.textSize();
    return `<div class="set-row" data-row="text"><div class="set-lab">${icon('book')}<span><b>${t('גודל האותיות', 'גֹּדֶל הָאוֹתִיּוֹת')}</b></span></div>
      <div class="set-seg set-ts" role="radiogroup" aria-label="${t('גודל האותיות', 'גֹּדֶל הָאוֹתִיּוֹת')}">${SIZES.map((z) => `<button role="radio" data-set="text" data-v="${z.id}" aria-checked="${s === z.id}">
        <i class="set-aa" style="font-size:${z.em}em">א</i><small>${t(z.f, z.k)}</small></button>`).join('')}</div></div>`;
  }
  if (id === 'voice') {
    const on = J.voiceOn();
    return `<button class="set-row set-tog" data-row="voice" data-set="voice" role="switch" aria-checked="${on}"><span class="set-lab">${icon(on ? 'sound' : 'mute')}<span><b>${t('הקול של רובו־דע', 'הַקּוֹל שֶׁל רוֹבּוֹ־דַּע')}</b><small>${t('הוא מקריא את מה שהוא אומר', 'הוּא מַקְרִיא אֶת מָה שֶׁהוּא אוֹמֵר')}</small></span></span>${sw(on)}</button>`;
  }
  if (id === 'h:me') return `<p class="set-sub" data-row="h:me">${t('לשחקן', 'לַשַּׂחְקָן')}</p>`;
  if (id === 'h:pc') return `<p class="set-sub" data-row="h:pc">${t('למחשב הזה (לכל השחקנים)', 'לַמַּחְשֵׁב הַזֶּה')}</p>`;
  if (id === 'sound') {
    const on = o.getSound ? !!o.getSound() : true;
    return `<button class="set-row set-tog" data-row="sound" data-set="sound" role="switch" aria-checked="${on}"><span class="set-lab">${icon(on ? 'sound' : 'mute')}<span><b>${t('צלילים', 'צְלִילִים')}</b><small>${t('קולות הטבע וצלילי המשחק', 'קוֹלוֹת הַטֶּבַע וְהַמִּשְׂחָק')}</small></span></span>${sw(on)}</button>`;
  }
  if (id === 'quality') {
    const q = o.getQuality ? o.getQuality() : 'medium';
    const Q = [['low', 'פשוטה', 'פְּשׁוּטָה', 'למחשב חלש'], ['medium', 'רגילה', 'רְגִילָה', ''], ['high', 'עשירה', 'עֲשִׁירָה', 'לכרטיס מסך חזק']];
    return `<div class="set-row" data-row="quality"><div class="set-lab">${icon('quality')}<span><b>${t('איכות התמונה', 'אֵיכוּת הַתְּמוּנָה')}</b><small>${t('לפי כרטיס המסך של המחשב', 'לְפִי הַמַּחְשֵׁב')}</small></span></div>
      <div class="set-seg" role="radiogroup" aria-label="${t('איכות התמונה', 'אֵיכוּת הַתְּמוּנָה')}">${Q.map(([v, f, k, tip]) => `<button role="radio" data-set="quality" data-v="${v}" aria-checked="${q === v}"${tip ? ` title="${tip}"` : ''}><b>${t(f, k)}</b></button>`).join('')}</div></div>`;
  }
  if (id === 'sources') {
    if (!TORAH) return '';
    const on = sourcesOn();
    return `<button class="set-row set-tog" data-row="sources" data-set="sources" role="switch" aria-checked="${on}"><span class="set-lab">${icon(SOURCES_T.icon)}<span><b>${t(...SOURCES_T.name)}</b><small>${t(...SOURCES_T.about)}</small></span></span>${sw(on)}</button>`;
  }
  if (id === 'music') {
    const on = o.getMusic ? !!o.getMusic() : true;
    return `<button class="set-row set-tog" data-row="music" data-set="music" role="switch" aria-checked="${on}"><span class="set-lab">${icon(on ? 'music' : 'musicOff')}<span><b>${t('מוזיקה', 'מוּזִיקָה')}</b><small>${t('במסך הפתיחה ובמעבדה', 'בַּמָּסָךְ הָרִאשׁוֹן וּבַמַּעְבָּדָה')}</small></span></span>${sw(on)}</button>`;
  }
  if (id === 'again') {
    return `<button class="set-row set-again" data-row="again" data-set="again"><span class="set-lab">${icon('undo')}<span><b>${t('לשמוע שוב את ההסברים', 'לִשְׁמֹעַ שׁוּב אֶת הַהֶסְבֵּרִים')}</b><small>${t('רובו־דע יסביר שוב כל חלק', 'רוֹבּוֹ־דַּע יַסְבִּיר שׁוּב כָּל חֵלֶק')}</small></span></span></button>`;
  }
  if (id === 'staff') {
    const open = J.allOpen();
    return `<details class="set-row set-staff" data-row="staff"${open ? ' open' : ''}><summary>${icon('sliders')}<span>למדריכים ולהורים</span>${icon('chevron', 'set-chev')}</summary>
      ${open ? `<div class="set-staff-in"><p>${icon('check')}כל חלקי המשחק פתוחים במחשב הזה.</p><button class="btn soft" data-set="lock">לנעול שוב לפי המסע</button></div>`
        : `<div class="set-staff-in"><label for="set-code">קוד מדריכים: פותח את כל המשחק במחשב הזה</label>
        <div class="set-code"><input id="set-code" type="password" inputmode="numeric" autocomplete="off" maxlength="8" dir="ltr" aria-label="קוד מדריכים"><button class="btn primary" data-set="unlock">פתיחה</button></div>
        <p class="set-err" hidden>הקוד לא נכון</p></div>`}</details>`;
  }
  return '';
}

export function settingsRowsHTML({ rows = ['mode', 'text', 'voice'], ...o } = {}) {
  return `<div class="set-rows">${rows.map((r) => rowHTML(r, o)).join('')}</div>`;
}

// draw the rows again with the current values (keeps the element, so a bound handler stays)
export function paintSettingsRows(el, opts = {}) {
  if (!el) return;
  const boxes = el.matches && el.matches('.set-rows') ? [el] : [...el.querySelectorAll('.set-rows')];   // the sheet has two columns
  for (const box of boxes) paintBox(box, opts);
}
function paintBox(box, opts) {
  const rows = [...box.querySelectorAll('[data-row]')].map((r) => r.dataset.row);
  const wasOpen = !!box.querySelector('.set-staff[open]');
  box.innerHTML = rows.map((r) => rowHTML(r, opts)).join('');
  const st = box.querySelector('.set-staff'); if (st && wasOpen) st.open = true;
}

export function bindSettingsRows(el, opts = {}) {
  if (!el) return;
  el._setOpts = opts;
  if (el._setBound) return;
  el._setBound = true;
  const tryUnlock = () => {
    const inp = el.querySelector('#set-code'); if (!inp) return;
    const err = el.querySelector('.set-err');
    if (Date.now() < codeWaitUntil) { inp.value = ''; if (err) { err.textContent = 'נסו שוב בעוד חצי דקה'; err.hidden = false; } return; }
    const ok = J.unlockAll(inp.value); inp.value = '';
    if (!ok) {
      codeWrong++; if (codeWrong >= CODE_TRIES) { codeWrong = 0; codeWaitUntil = Date.now() + CODE_WAIT_MS; }
      if (err) { err.textContent = Date.now() < codeWaitUntil ? 'הקוד לא נכון. נסו שוב בעוד חצי דקה' : 'הקוד לא נכון'; err.hidden = false; }
      const c = el.querySelector('.set-code'); if (c) { c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); } return;
    }
    codeWrong = 0;
    after('unlock');
  };
  const after = (what) => {
    const o = el._setOpts || {};
    paintSettingsRows(el, o);
    try { o.onChange && o.onChange(what); } catch (e) { console.error(e); }
    try { o.emit && o.emit('ui:click'); } catch (e) { }
  };
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-set]'); if (!b || !el.contains(b)) return;
    const o = el._setOpts || {}; const k = b.dataset.set;
    if (k === 'mode') { J.setPlayMode(b.dataset.v); after('mode'); }
    else if (k === 'text') { J.setTextSize(b.dataset.v); after('text'); }
    else if (k === 'voice') { const on = !J.voiceOn(); J.setVoice(on); if (!on) { try { window.__app && window.__app.voice && window.__app.voice.stop(); } catch (er) { } } after('voice'); }
    else if (k === 'sound') { const on = !(o.getSound ? o.getSound() : true); if (o.setSound) o.setSound(on); setTimeout(() => after('sound'), 0); }
    else if (k === 'quality') { if (o.setQuality) o.setQuality(b.dataset.v); setTimeout(() => after('quality'), 0); }
    else if (k === 'sources') { setSourcesOn(!sourcesOn()); if (o.emit) o.emit('sources:toggle', { on: sourcesOn() }); after('sources'); }
    else if (k === 'music') { const on = !(o.getMusic ? o.getMusic() : true); if (o.emit) o.emit('music:toggle', { on }); setTimeout(() => after('music'), 0); }
    else if (k === 'again') {
      J.resetIntros(); resetHowto(); after('again');
      const g = window.__guide; const ln = g && (g.lines('start:tips') || []).find((l) => l.id === 'start.again.1'); if (ln) g.tip(ln, { ms: 5000 });
    }
    else if (k === 'unlock') tryUnlock();
    else if (k === 'lock') { J.lockAgain(); after('lock'); }
  });
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('#set-code')) { e.preventDefault(); tryUnlock(); } });
  el.addEventListener('input', (e) => { if (e.target.matches('#set-code')) { const er = el.querySelector('.set-err'); if (er) er.hidden = true; } });
}

// the full sheet: a paper card under the gear, with a scrim behind it
export function openSettings(host, { emit, getMusic, getSound, setSound, getQuality, setQuality, onClose } = {}) {
  const old = host.querySelector('.set-layer'); if (old) old.remove();
  const layer = document.createElement('div'); layer.className = 'set-layer';
  layer.innerHTML = `<div class="set-scrim"></div><div class="set-sheet paper" role="dialog" aria-modal="true" aria-label="${esc(t('הגדרות', 'הַגְדָּרוֹת'))}">
    <button class="pp-x set-x" data-x="1" aria-label="סגירה" title="סגירה">${icon('close')}</button>
    <h3 class="set-h">${icon('gear')}${t('הגדרות', 'הַגְדָּרוֹת')}</h3>
    <div class="set-cols">${settingsRowsHTML({ rows: ['h:me', 'mode', 'text', 'voice', 'again'], getMusic, getSound, getQuality })}
    ${settingsRowsHTML({ rows: ['h:pc', 'sources', 'sound', 'music', 'quality', 'staff'], getMusic, getSound, getQuality })}</div></div>`;
  host.appendChild(layer);
  const sheet = layer.querySelector('.set-sheet');
  bindSettingsRows(sheet, { emit, getMusic, getSound, setSound, getQuality, setQuality });
  const close = () => {
    if (!layer.isConnected) return;
    layer.remove(); removeEventListener('keydown', onKey);
    try { onClose && onClose(); } catch (e) { console.error(e); }
  };
  const onKey = (e) => { if (e.key === 'Escape' && !(window.__guide && window.__guide.isOpen())) { e.preventDefault(); close(); } };
  addEventListener('keydown', onKey);
  layer.querySelector('.set-scrim').addEventListener('click', close);
  layer.querySelector('[data-x]').addEventListener('click', close);
  requestAnimationFrame(() => { const f = sheet.querySelector('[aria-checked="true"], button'); try { f && f.focus({ preventScroll: true }); } catch (e) { } });
  return { close, el: layer };
}
