// The toolbar: home, the satchel menu (home, help, coach, save, daily report, view all, and the settings: the journey
// rows, sounds, music, sources, picture quality), the journal, light map and web toggles; and the round music switch.
// Exports: createToolbar(ctx) → { qWrap, kitBtn, setKit, paintToggles, musicBtn }.
// Needs from ctx (index.js and the parts made before it): root, emit, S, toolbar.
import { setSourcesOn, sourcesOn, TORAH } from '../../core/edition.js';
import { zoneWord } from '../../core/place.js';
import { bindSettingsRows, settingsRowsHTML } from '../settings.js';
import { h } from './helpers.js';
import { icon } from './icons.js';

export function createToolbar(ctx) {
  const { root, emit, S, toolbar } = ctx;
  /* ================================================================ TOOLBAR */
  // A slim rail: the satchel menu (home, help, save + settings: sound and picture quality), the field journal,
  // and the two map views. Everything that used to be its own button now lives in the satchel.
  toolbar.innerHTML = `
    <button class="tb tb-home" data-a="home" data-tip="חזרה למסך הבית">${icon('home')}<span>מסך הבית</span></button>
    <span class="tb-sep"></span>
    <div class="kit">
      <button class="tb kit-btn" data-a="menu" data-tip="תפריט" aria-haspopup="true" aria-expanded="false">${icon('satchel')}</button>
      <div class="kit-menu" role="menu" aria-label="תפריט">
        <div class="km-who" hidden></div>
        <div class="km-group">
          <button class="km-row" data-a="home" role="menuitem">${icon('home')}<span>מסך הפתיחה</span></button>
          <button class="km-row" data-a="help" role="menuitem">${icon('help')}<span>איך משחקים</span></button>
          <button class="km-row" data-a="coach" role="menuitem">${icon('sprout')}<span>הדרכה צעד אחר צעד</span></button>
          <button class="km-row" data-a="save" role="menuitem">${icon('save')}<span>שמירת היער</span></button>
          <button class="km-row" data-a="report" role="menuitem">${icon('pencil')}<span>דוח יומי</span></button>
          <button class="km-row" data-a="reset" role="menuitem">${icon('target')}<span>מבט על ${zoneWord('all')}</span></button>
        </div>
        <div class="km-set"><h4>הגדרות</h4>
          <div class="km-journey" hidden></div>
          <button class="km-row km-switch" data-a="sound" role="menuitemcheckbox">${icon('sound')}<span>צלילים</span><i class="sw"></i></button>
          <button class="km-row km-switch" data-a="music" role="menuitemcheckbox" title="מוזיקה רכה במסך הפתיחה ובמעבדה">${icon('music')}<span>מוזיקה</span><i class="sw"></i></button>
          ${TORAH ? `<button class="km-row km-switch" data-a="sources" role="menuitemcheckbox">${icon('book')}<span>מקורות ופסוקים</span><i class="sw"></i></button>` : ''}
          <div class="km-q">${icon('quality')}<span>איכות תמונה</span></div>
          <div class="km-seg" role="radiogroup" aria-label="איכות תמונה">
            <button data-q="low" role="radio" title="למחשב איטי">פשוטה</button>
            <button data-q="medium" role="radio">רגילה</button>
            <button data-q="high" role="radio" title="למחשב חזק">עשירה</button></div>
        </div>
      </div>
    </div>
    <button class="tb" data-a="journal" data-tip="יומן השדה">${icon('book')}</button>
    <span class="tb-gap"></span>
    <button class="tb tg" data-a="lightmap" data-tip="מפת אור">${icon('lightmap')}<span class="tb-lab">מפת אור</span></button>
    <button class="tb tg" data-a="web" data-tip="הצג את כל הקשרים">${icon('web')}<span class="tb-lab">רשת החיים</span></button>`;
  toolbar.querySelectorAll('[data-tip]').forEach((b) => b.setAttribute('aria-label', b.dataset.tip));
  const tbBtn = (a) => toolbar.querySelector(`[data-a="${a}"]`);
  const qWrap = toolbar.querySelector('.kit'), kitBtn = tbBtn('menu');
  const setKit = (on) => { qWrap.classList.toggle('open', on); kitBtn.setAttribute('aria-expanded', String(on)); };
  toolbar.addEventListener('click', (e) => {
    const qb = e.target.closest('[data-q]');
    if (qb) { const q = qb.dataset.q; S.toggles.quality = q; paintToggles(); emit('quality', { q }); return; }
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = b.dataset.a;
    if (a === 'menu') { const on = !qWrap.classList.contains('open'); if (on) fillJourneyRows(); setKit(on); return; }
    if (a === 'home' || a === 'help' || a === 'coach' || a === 'save' || a === 'reset' || a === 'report') setKit(false);
    if (a === 'home') emit('ui:home');
    else if (a === 'help') emit('ui:help');
    else if (a === 'coach') emit('ui:coach');
    else if (a === 'journal') emit('ui:journal');
    else if (a === 'save') emit('ui:save');
    else if (a === 'report') emit('ui:report');
    else if (a === 'reset') emit('view:reset');
    else if (a === 'lightmap') { S.toggles.lightmap = !S.toggles.lightmap; paintToggles(); emit('toggle:lightmap', { on: S.toggles.lightmap }); }
    else if (a === 'web') { S.toggles.web = !S.toggles.web; paintToggles(); emit('toggle:web', { on: S.toggles.web }); }
    else if (a === 'sources') { setSourcesOn(!sourcesOn()); paintToggles(); emit('sources:toggle', { on: sourcesOn() }); }
    else if (a === 'sound') { S.toggles.sound = !(S.toggles.sound !== false); paintToggles(); emit('audio:mute', { muted: !S.toggles.sound }); }
    else if (a === 'music') { S.toggles.music = !(S.toggles.music !== false); paintToggles(); emit('music:toggle', { on: S.toggles.music }); }
  });
  document.addEventListener('pointerdown', (e) => { if (!qWrap.contains(e.target)) setKit(false); }, true);
  /* settings rows (journey) */
  // 1.3.2: the satchel gets the same three rows as the start screen's settings (play mode חוויה / מלא, text size, the voice
  // of רובו־דע) from src/ui/settings.js. The forest repaints itself on 'wol-journey' (game.js onJourney), so a changed
  // play mode applies at once.
  function fillJourneyRows() {
    const box = toolbar.querySelector('.km-journey'); if (!box) return;
    try { box.innerHTML = settingsRowsHTML({ place: 'zone' }); box.hidden = !box.innerHTML; bindSettingsRows(box, { emit }); }
    catch (e) { console.error(e); box.hidden = true; }
  }
  function paintToggles() {
    const t = S.toggles;
    tbBtn('lightmap').setAttribute('aria-pressed', String(!!t.lightmap));
    tbBtn('web').setAttribute('aria-pressed', String(!!t.web));
    const snd = tbBtn('sound'), on = t.sound !== false;
    snd.setAttribute('aria-checked', String(on)); snd.querySelector('.ic').outerHTML = icon(on ? 'sound' : 'mute'); snd.classList.toggle('off', !on);
    toolbar.querySelectorAll('[data-q]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.q === (t.quality || 'medium'))));
    const srcB = tbBtn('sources'); if (srcB) { const on = sourcesOn(); srcB.setAttribute('aria-checked', String(on)); srcB.classList.toggle('off', !on); }
    root.classList.toggle('q-low', t.quality === 'low');
    const mOn = t.music !== false;
    for (const b of [tbBtn('music'), musicBtn]) { b.setAttribute('aria-checked', String(mOn)); b.querySelector('.ic').outerHTML = icon(mOn ? 'music' : 'musicOff'); b.classList.toggle('off', !mOn); }
    musicBtn.setAttribute('aria-label', mOn ? 'מוזיקה: פועלת' : 'מוזיקה: כבויה'); musicBtn.title = mOn ? 'לכבות את המוזיקה' : 'להדליק את המוזיקה';
  }
  // the music switch where music plays (the start screen, the lab): a small round button, shown only there
  const musicBtn = h('button', 'mus-btn', icon('music'), root);
  musicBtn.setAttribute('role', 'switch'); musicBtn.hidden = true;
  musicBtn.addEventListener('click', () => { S.toggles.music = !(S.toggles.music !== false); paintToggles(); emit('music:toggle', { on: S.toggles.music }); });
  paintToggles();
  return { qWrap, kitBtn, setKit, paintToggles, musicBtn };
}
