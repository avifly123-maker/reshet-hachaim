// "סיור בעיני בעלי חיים" – the animal-eye tour.
// The child picks an animal that lives on the island, and the camera rides with it: just behind and above its head,
// so its head and back stay in view. Partial control: arrows / WASD or a big on-screen pad steer and change speed;
// without input the animal goes on with its own life (its normal AI). Flying animals fly (E / Q = up / down),
// climbers (the sloth…) are taken to the next tree in the direction you look. A caption tells what the animal notices,
// built from the species data (relations, diet, facts) with correct Hebrew gender.
// Comfort: no camera roll, smooth damped turns and follow, the camera never goes under the ground or into trunks.
import * as THREE from 'three';
import { gw, defName, prefName, joinObj, dietVerb } from '../data/common.js';
import { ARROW, holdButton } from './immersive.js';
import { zoneWord } from '../core/place.js';

const CSS_ID = 'tour-css';
const CSS = `
#ui.wol .tour-pick { position: absolute; inset: 0; z-index: 27; display: grid; place-items: center; pointer-events: none; opacity: 0; visibility: hidden; transition: opacity .3s, visibility 0s .3s; }
#ui.wol .tour-pick.on { opacity: 1; visibility: visible; pointer-events: auto; transition: opacity .3s; }
#ui.wol .tour-pick .tp-back { position: absolute; inset: 0; background: rgba(6, 14, 9, .45); }
#ui.wol .tour-pick .tp-box { position: relative; width: min(680px, calc(100vw - 40px)); max-height: calc(100vh - 40px); overflow: auto; padding: 18px 22px 20px; text-align: center; }
#ui.wol .tp-box h2 { font-family: var(--serif); font-size: 1.7em; color: #1f2c1a; }
#ui.wol .tp-box > p { margin: 4px 0 14px; color: var(--ink2); font-weight: 600; }
#ui.wol .tp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 10px; }
#ui.wol .tp-sec { grid-column: 1 / -1; margin: 6px 0 -2px; text-align: start; font-weight: 800; color: var(--ink2); font-size: .92em; }
#ui.wol .tp-card { --c: #6a9; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 8px 12px; border-radius: 18px;
  background: rgba(255, 255, 255, .42); box-shadow: inset 0 0 0 1.5px rgba(60, 70, 40, .3); transition: transform .15s, box-shadow .15s, background .15s; }
#ui.wol .tp-card:hover, #ui.wol .tp-card:focus-visible { transform: translateY(-2px); background: rgba(255, 255, 255, .7); box-shadow: inset 0 0 0 2.5px var(--leaf2), 0 6px 12px rgba(0, 0, 0, .15); }
#ui.wol .tp-card .tp-img { width: 72px; height: 72px; border-radius: 50%; overflow: hidden; display: grid; place-items: center;
  background: color-mix(in srgb, var(--c) 30%, #eef0dc); box-shadow: 0 0 0 3px #fff8, 0 3px 8px rgba(0, 0, 0, .2); }
#ui.wol .tp-card .tp-img img { width: 100%; height: 100%; object-fit: cover; }
#ui.wol .tp-card b { font-family: var(--serif); font-weight: 400; font-size: 1.2em; color: #1f2c1a; }
#ui.wol .tp-card small { color: var(--ink2); font-weight: 700; }
#ui.wol .tp-none { padding: 18px; color: var(--ink2); font-weight: 600; }
/* an animal that is not here yet: its shadow, and one line on how to bring it */
#ui.wol .tp-card.tp-shade { cursor: default; background: rgba(255, 255, 255, .22); box-shadow: inset 0 0 0 1.5px rgba(60, 70, 40, .16); }
#ui.wol .tp-card.tp-shade:hover { transform: none; background: rgba(255, 255, 255, .3); box-shadow: inset 0 0 0 1.5px rgba(60, 70, 40, .22); }
#ui.wol .tp-card.tp-shade .tp-img { background: rgba(60, 70, 50, .14); box-shadow: 0 0 0 3px #fff6; }
#ui.wol .tp-card.tp-shade .tp-img img { filter: grayscale(1) brightness(.62) contrast(.8) opacity(.5); }
#ui.wol .tp-card.tp-shade b { color: #4a5442; }
#ui.wol .tp-card.tp-shade small { font-weight: 600; font-size: .82em; line-height: 1.3; color: #55604a; }
#ui.wol .tp-close { position: absolute; top: 6px; left: 6px; width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; color: var(--ink2); }
#ui.wol .tp-close:hover { background: rgba(0, 0, 0, .06); }
#ui.wol .tp-close svg { width: 22px; height: 22px; }
/* riding */
#ui.wol .tour-view .tv-swap { position: absolute; top: 72px; left: 12px; pointer-events: auto; min-height: 48px; padding: 6px 16px; border-radius: 999px; font-weight: 800;
  background: rgba(17, 36, 26, .9); color: var(--chalk); box-shadow: 0 0 0 1.5px rgba(180, 203, 102, .45), 0 6px 14px rgba(0, 0, 0, .35); }
#ui.wol .tour-view .tv-swap:hover { background: rgba(27, 54, 38, .95); }
#ui.wol .tv-cap { position: absolute; right: 24px; bottom: 24px; width: min(470px, calc(100vw - 380px)); padding: 12px 16px 14px; pointer-events: none; }
#ui.wol .tv-head { display: flex; align-items: center; gap: 12px; }
#ui.wol .tv-img { --c: #6a9; display: block; flex: none; width: 58px; height: 58px; border-radius: 50%; overflow: hidden; background: color-mix(in srgb, var(--c) 30%, #eef0dc); box-shadow: 0 0 0 3px #fff8; }
#ui.wol .tv-img img { width: 100%; height: 100%; object-fit: cover; }
#ui.wol .tv-name { font-family: var(--serif); font-size: 1.45em; color: #1f2c1a; line-height: 1.1; }
#ui.wol .tv-state { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
#ui.wol .tv-state span { padding: 2px 10px; border-radius: 99px; background: rgba(95, 154, 62, .18); color: #2c4f26; font-weight: 700; font-size: .85em; }
#ui.wol .tv-state span.you { background: var(--honey); color: #2e1d05; }
#ui.wol .tv-note { margin-top: 10px; padding-top: 9px; border-top: 1.5px dashed rgba(90, 80, 50, .35); transition: opacity .35s; }
#ui.wol .tv-note.fade { opacity: 0; }
#ui.wol .tv-note b { display: block; font-size: 1.08em; color: #1f2c1a; }
#ui.wol .tv-note p { margin-top: 3px; color: #33402c; font-weight: 500; line-height: 1.45; }
#ui.wol .tv-pad { position: absolute; left: 30px; bottom: 34px; display: flex; align-items: flex-end; gap: 22px; direction: ltr; pointer-events: none; }
#ui.wol .tv-cross { display: grid; grid-template: repeat(3, 76px) / repeat(3, 76px); gap: 4px; }
#ui.wol .tv-cross [data-k="fwd"] { grid-area: 1 / 2; } #ui.wol .tv-cross [data-k="left"] { grid-area: 2 / 1; }
#ui.wol .tv-cross [data-k="right"] { grid-area: 2 / 3; } #ui.wol .tv-cross [data-k="back"] { grid-area: 3 / 2; }
#ui.wol .tv-cross .tv-dot { grid-area: 2 / 2; align-self: center; justify-self: center; width: 14px; height: 14px; border-radius: 50%; background: rgba(233, 230, 204, .55); box-shadow: 0 0 0 4px rgba(17, 36, 26, .5); }
#ui.wol .tv-alt { display: flex; flex-direction: column; gap: 34px; margin-bottom: 30px; }
#ui.wol .tv-pad .imv-round { direction: rtl; }
#ui.wol .tv-pad [data-k="fwd"] small { top: auto; bottom: calc(100% + 6px); }
#ui.wol .tv-keys { margin-top: 8px; font-size: .8em; font-weight: 700; color: var(--ink2); opacity: .8; }
#ui.wol .tour-view.m-climb .tv-alt, #ui.wol .tour-view.m-climb [data-k="back"], #ui.wol .tour-view.m-walk .tv-alt { display: none; }
@media (max-height: 520px) { #ui.wol .tp-card .tp-img { width: 56px; height: 56px; } #ui.wol .tp-card { padding: 8px 6px; } #ui.wol .tp-box { padding: 12px 16px 14px; } #ui.wol .tp-box h2 { font-size: 1.4em; } }
/* the toolbar button; it lights up when the missions are done */
#ui.wol .tb[data-a="tour"] .ic { color: #f2d77e; }
#ui.wol .tb[data-a="tour"].ready { background: var(--honey); color: #2e1d05; padding: 0 12px 0 10px; border-radius: 999px; animation: tour-glow 2.4s ease-in-out infinite; }
#ui.wol .tb[data-a="tour"].ready .ic { color: #2e1d05; }
#ui.wol .imv-dock .tb[data-a="tour"].ready .tb-lab { display: inline; }
#ui.wol .tb[data-a="tour"].ready::after { display: none; }
#ui.wol.kids .imv-dock .tb[data-a="tour"] .tb-lab { display: inline; }
#ui.wol.kids .imv-dock .tb[data-a="tour"] { justify-content: flex-start; padding: 0 12px 0 8px; border-radius: 999px; }
@keyframes tour-glow { 0%, 100% { box-shadow: 0 0 0 0 rgba(230, 169, 60, .55); } 50% { box-shadow: 0 0 0 7px rgba(230, 169, 60, 0); } }
/* species panel: "סיור בעיניים של …" */
#ui.wol .sp-actions:has(.sp-tour) { flex-wrap: wrap; }
#ui.wol .sp-actions .sp-tour { flex: 1 1 100%; order: -1; background: #f4e2b0; box-shadow: inset 0 0 0 1.5px var(--honey2); }
@media (max-height: 720px) { #ui.wol .tv-cross { grid-template: repeat(3, 64px) / repeat(3, 64px); } #ui.wol .tv-pad { bottom: 28px; } #ui.wol .tv-alt { gap: 26px; margin-bottom: 24px; } }
@media (max-width: 1100px) { #ui.wol .tv-cap { width: min(420px, calc(100vw - 330px)); right: 16px; bottom: 16px; } #ui.wol .tv-pad { left: 18px; gap: 14px; } }
@media (prefers-reduced-motion: reduce) { #ui.wol .tb[data-a="tour"].ready { animation: none; } }
/* narrow screens: the caption goes to the top corner, so the animal (just below the middle of the view) stays visible */
@media (max-width: 860px) { #ui.wol .tv-cap { top: 12px; bottom: auto; right: 12px; width: min(380px, calc(100vw - 236px)); padding: 9px 12px 10px; }
  #ui.wol .tv-cap .tv-img { width: 46px; height: 46px; } #ui.wol .tv-cap .tv-keys { display: none; } }
`;
const TOUR_ICON = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path class="f" d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const wrapA = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
// favourite riders first (the picker shows every animal that lives on the island right now; the rest follow)
const PREF = {
  amazon: ['agouti', 'hummingbird', 'toucan', 'sloth', 'macaw', 'morpho', 'tapir', 'howler', 'capybara', 'coati', 'kinkajou', 'orchidbee', 'dartfrog', 'anteater', 'fruitbat', 'jaguar', 'harpy'],
  grove: ['gazelle', 'hoopoe', 'hedgehog', 'butterfly', 'jay', 'hyrax', 'blackbird', 'tortoise', 'chukar', 'honeybee', 'agama', 'porcupine', 'spinymouse', 'chameleon', 'fox', 'owl'],
  reef: ['turtle', 'reefshark', 'clownfish', 'parrotfish', 'octopus', 'stingray', 'butterflyfish', 'surgeonfish', 'cleaner', 'grouper', 'moray', 'lionfish', 'jellyfish', 'goby', 'shrimp', 'hermit', 'urchin', 'starfish'],
};
// animals that stay in place (corals, the sponge, the anemone, the giant clam) and colonies / swarms get a close look
// instead of a ride: the camera circles them slowly, and the caption tells who comes to visit
const LOOK_KINDS = new Set(['coral', 'sessile']);
const HOVERERS = new Set(['hummingbird', 'morpho', 'butterfly', 'orchidbee', 'honeybee']);
const RELEASE_AFTER = 2.2;   // seconds without input before the animal goes on by itself

export function createTour({ W, env, reg, camera, canvas, ui, audio, imv, missions, art }) {
  if (!document.getElementById(CSS_ID)) { const st = document.createElement('style'); st.id = CSS_ID; st.textContent = CSS; document.head.appendChild(st); }
  const root = document.getElementById('ui');
  const biomeId = W.biomeId;

  // ── which animals can be ridden: every animal that moves (hunters and fish too; while the child rides a hunter it
  // does not hunt). Animals that stay in place, colonies and swarms get a close look instead (lookable).
  const modeOf = (a) => a.loco === 'flying' ? 'fly' : a.loco === 'arboreal' ? 'climb' : 'walk';
  function tourableSp(sp) {
    if (!sp || sp.isPlant || sp.kind !== 'animal') return false;
    return ['ground', 'flying', 'arboreal', 'water', undefined].includes(sp.locomotion);
  }
  const lookableSp = (sp) => !!sp && (LOOK_KINDS.has(sp.kind) || sp.kind === 'colony' || sp.kind === 'swarm');
  const rideable = (a) => a.alive && !a.removed && !a.leaving && !a.injured && a.type === 'animal' && tourableSp(a.sp);
  const lookable = (e) => e.alive && !e.removed && !e.dying && !e.leaving && !e.falling && lookableSp(e.sp) && (!e.isPlant || e.growth > 0.08);
  const ordered = (ids) => { const order = PREF[biomeId] || []; return [...ids].sort((x, y) => ((order.indexOf(x) + 1 || 99) - (order.indexOf(y) + 1 || 99))); };
  function presentSpecies() {
    const ids = new Set(); for (const a of W.animals) if (rideable(a)) ids.add(a.sp.id);
    return ordered(ids);
  }
  function presentLook() {
    const ids = new Set();
    for (const p of W.plants) if (lookable(p)) ids.add(p.sp.id);
    for (const a of W.animals) if (a.type !== 'animal' && lookable(a)) ids.add(a.sp.id);
    return [...ids];
  }
  const anyTour = () => W.animals.some(rideable) || W.plants.some(lookable) || W.animals.some(a => a.type !== 'animal' && lookable(a));
  function bestOf(id) {
    let best = null, bs = Infinity;
    for (const a of W.animals) {
      if (a.sp.id !== id || !rideable(a)) continue;
      const s = (a.isActive() ? 0 : 50) + (a.state === 'sleep' ? 20 : 0) + a.pos.distanceTo(camera.position) * 0.05;
      if (s < bs) { bs = s; best = a; }
    }
    return best;
  }
  const locoText = (id, loco) => {
    const sp = reg.byId.get(id);
    if (sp && lookableSp(sp)) return 'מבט מקרוב';
    if (sp && sp.swims) return gw(id, 'שוחה', 'שוחה');
    return loco === 'flying' ? gw(id, 'עף', 'עפה') : loco === 'arboreal' ? gw(id, 'מטפס על עצים', 'מטפסת על עצים') : biomeId === 'reef' ? gw(id, 'הולך על הקרקעית', 'הולכת על הקרקעית') : gw(id, 'הולך על הקרקע', 'הולכת על הקרקע');
  };
  const imgHTML = (id, cls) => { const src = art(id); const sp = reg.byId.get(id); return `<span class="${cls}" style="--c:${esc(sp?.color || '#6a9')}">${src ? `<img src="${esc(src)}" alt="" draggable="false">` : ''}</span>`; };

  // ── toolbar button
  let tbBtn = null;
  const tb = imv.dock;
  if (tb) {
    tbBtn = document.createElement('button');
    tbBtn.className = 'tb tg'; tbBtn.dataset.a = 'tour'; tbBtn.dataset.tip = 'סיור בעיני בעלי חיים'; tbBtn.setAttribute('aria-label', 'סיור בעיני בעלי חיים');
    tbBtn.innerHTML = `${TOUR_ICON}<span class="tb-lab">סיור בעיני בעלי חיים</span>`; tbBtn.hidden = true;
    tbBtn.addEventListener('click', (e) => { e.stopPropagation(); openPicker(); });
    tb.appendChild(tbBtn);
  }

  // ── picker
  const pick = document.createElement('div');
  pick.className = 'tour-pick'; pick.lang = 'he';
  pick.innerHTML = `<div class="tp-back"></div><div class="tp-box paper" role="dialog" aria-modal="true" aria-label="סיור בעיני בעלי חיים">
    <button type="button" class="tp-close" aria-label="סגירה">${ARROW.close}</button>
    <h2>סיור בעיני בעלי חיים</h2><p>בחרו חיה, ותראו את ${zoneWord()} כמו שהיא רואה אותו</p><div class="tp-grid"></div></div>`;
  root.appendChild(pick);
  const grid = pick.querySelector('.tp-grid');
  function openPicker() {
    const ids = presentSpecies(), look = presentLook();
    const card = (id) => { const sp = reg.byId.get(id); return `<button type="button" class="tp-card" data-id="${esc(id)}">${imgHTML(id, 'tp-img')}<b>${esc(sp.name)}</b><small>${esc(locoText(id, sp.locomotion))}</small></button>`; };
    const away = absentSpecies(ids);
    grid.innerHTML = (ids.length || look.length ? ids.map(card).join('') + (look.length ? `<p class="tp-sec">${ids.length ? 'ויש גם מי שנשאר במקום. אפשר להסתכל עליו מקרוב:' : 'אלה נשארים במקום. אפשר להסתכל עליהם מקרוב:'}</p>` + look.map(card).join('') : '')
      : `<p class="tp-none">עוד אין ${zoneWord('in')} בעלי חיים שאפשר לטייל איתם. הביאו בעלי חיים מהמגש, ונסו שוב.</p>`)
      + (away.length ? `<p class="tp-sec">${W.kids ? 'עוֹד בַּעֲלֵי חַיִּים שֶׁאֶפְשָׁר לְהָבִיא:' : 'ועוד בעלי חיים שאפשר להביא:'}</p>` + away.map(shadeCard).join('') : '');
    pick.classList.add('on'); audio && audio.play && audio.play('click');
    const first = grid.querySelector('button'); if (first) requestAnimationFrame(() => { try { first.focus({ preventScroll: true }); } catch (e) { } });
  }
  function closePicker() { pick.classList.remove('on'); }
  // animals of this zone that could be toured but are not here now: shown as a shadow with how to bring them
  function absentSpecies(present) {
    const have = new Set(present);
    return ordered((reg.biome?.species || []).filter(sp => tourableSp(sp) && !have.has(sp.id)).map(sp => sp.id));
  }
  function bringLine(id) {
    if (W.unlocked && W.unlocked.has(id)) return W.kids ? 'הָבִיאוּ מֵהַמַּגָּשׁ' : `הביאו מהמגש ${zoneWord('to')}`;
    if (W.kids) return 'הַשְׁלִימוּ עוֹד מְשִׂימוֹת';
    const m = missions.missions.find(q => !q.done && (q.reward?.unlock || []).includes(id));
    return m ? `השלימו את המשימה "${m.title}"` : 'השלימו עוד משימות';
  }
  function shadeCard(id) {
    const sp = reg.byId.get(id);
    return `<div class="tp-card tp-shade" data-shade="${esc(id)}" aria-disabled="true">${imgHTML(id, 'tp-img')}<b>${esc(sp.name)}</b><small>${esc(bringLine(id))}</small></div>`;
  }
  pick.querySelector('.tp-back').addEventListener('click', closePicker);
  pick.querySelector('.tp-close').addEventListener('click', closePicker);
  grid.addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (!b) return; closePicker(); start(b.dataset.id); });
  function onPickKey(e) { if (pick.classList.contains('on') && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePicker(); } }
  window.addEventListener('keydown', onPickKey, true);

  // ── riding view overlay
  const el = document.createElement('div');
  el.className = 'imv tour-view'; el.lang = 'he';
  el.innerHTML = `<button type="button" class="imv-exit" data-a="exit">${ARROW.close}<span>חזרה ${zoneWord('lamed')}</span><kbd>Esc</kbd></button>
    <button type="button" class="tv-swap">חיה אחרת</button>
    <div class="tv-cap paper"><div class="tv-head"><span class="tv-imgw"></span><div><div class="tv-name"></div><div class="tv-state"><span class="tv-do"></span><span class="tv-who"></span></div></div></div>
      <div class="tv-note"><b></b><p></p></div><div class="tv-keys"></div></div>
    <div class="tv-pad"><div class="tv-cross">
      <button type="button" class="imv-round" data-k="fwd">${ARROW.up}<small>קדימה</small></button>
      <button type="button" class="imv-round" data-k="left">${ARROW.left}<small>שמאלה</small></button><i class="tv-dot"></i>
      <button type="button" class="imv-round" data-k="right">${ARROW.right}<small>ימינה</small></button>
      <button type="button" class="imv-round" data-k="back">${ARROW.down}<small>לאט</small></button></div>
      <div class="tv-alt"><button type="button" class="imv-round" data-k="rise">${ARROW.rise}<small>למעלה</small></button>
      <button type="button" class="imv-round" data-k="sink">${ARROW.sink}<small>למטה</small></button></div></div>`;
  root.appendChild(el);
  const $ = (s) => el.querySelector(s);
  const nameEl = $('.tv-name'), doEl = $('.tv-do'), whoEl = $('.tv-who'), noteEl = $('.tv-note'), noteB = $('.tv-note b'), noteP = $('.tv-note p'), imgW = $('.tv-imgw'), keysEl = $('.tv-keys');
  $('.imv-exit').addEventListener('click', () => stop());
  $('.tv-swap').addEventListener('click', () => openPicker());
  for (const b of el.querySelectorAll('button')) b.addEventListener('pointerdown', (e) => e.stopPropagation());

  // input: pad buttons and keys feed one input state; a click is a short tap of the same input
  const padHeld = { fwd: 0, back: 0, left: 0, right: 0, rise: 0, sink: 0 }, keyHeld = { ...padHeld }, taps = { ...padHeld };
  const ends = [];
  for (const b of el.querySelectorAll('.tv-pad [data-k]')) {
    const k = b.dataset.k;
    ends.push(holdButton(b, { press: () => { taps[k] = 0.45; onPress(k); }, hold: (on) => { padHeld[k] = on ? 1 : 0; } }));
  }
  const KEYS = { ArrowUp: 'fwd', KeyW: 'fwd', ArrowDown: 'back', KeyS: 'back', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', KeyE: 'rise', PageUp: 'rise', KeyQ: 'sink', PageDown: 'sink' };
  function onKey(e, down) {
    const k = KEYS[e.code] || KEYS[e.key]; if (!k) return false;
    if (down && !keyHeld[k]) onPress(k);
    keyHeld[k] = down ? 1 : 0; return true;
  }
  function clearInput() { for (const k in padHeld) { padHeld[k] = 0; keyHeld[k] = 0; taps[k] = 0; } for (const f of ends) f(); }
  const held = (k) => padHeld[k] || keyHeld[k] || taps[k] > 0 ? 1 : 0;

  // ── state of the ride
  let R = null;
  const _v = new THREE.Vector3(), _head = new THREE.Vector3(), _want = new THREE.Vector3(), _look = new THREE.Vector3();

  function start(id) {
    if (lookableSp(reg.byId.get(id))) { startLook(id); return; }
    const a = bestOf(id);
    if (!a) { ui.toast(`לא מצאתי עכשיו חיה כזאת ${zoneWord('in')}`, 'info'); return; }
    if (R) releaseAnimal();
    const mode = modeOf(a);
    R = { a, mode, camYaw: a.heading, lookOff: 0, lookV: 0, turnV: 0, spd: 0, altV: 0, idle: 99, pos: new THREE.Vector3(), look: new THREE.Vector3(), fresh: true,
      note: null, noteT: 0, noteSince: -99, stateT: 0, climbing: false };
    a.touring = true;
    if (a.state === 'sleep') a.timer = Math.min(a.timer, 2.5);   // it wakes up for the tour (src/world/animals.js keeps it awake)
    if (a.state === 'hunt' || a.prey) { a.prey = null; a.food = null; a.state = 'idle'; a.timer = 0.5; }   // a hunter on tour only looks around (game.js findFood skips prey while touring)
    if (imv.active !== 'tour') imv.enter('tour', { driver, onExit, onKey, onBlur: clearInput });
    camera.fov = 60; camera.near = 0.05; camera.updateProjectionMatrix();
    el.classList.add('on'); el.classList.remove('m-walk', 'm-fly', 'm-climb', 'm-look'); el.classList.add('m-' + mode);
    const sp = a.sp;
    nameEl.textContent = sp.name; imgW.innerHTML = imgHTML(sp.id, 'tv-img');
    const K = (t) => `<bdi dir="ltr">${t}</bdi>`;
    keysEl.innerHTML = mode === 'climb' ? `במקלדת: ${K('↑')} – לעץ הבא · ${K('← →')} – להסתכל מסביב`
      : mode === 'fly' ? `במקלדת: חצים או ${K('W A S D')} – לכוון · ${K('E')} – למעלה · ${K('Q')} – למטה` : `במקלדת: חצים או ${K('W A S D')} – לכוון ולהאיץ`;
    $('[data-k="fwd"] small').textContent = mode === 'climb' ? 'לעץ הבא' : mode === 'fly' ? 'מהר יותר' : 'קדימה';
    $('[data-k="left"] small').textContent = mode === 'climb' ? 'להסתכל שמאלה' : 'שמאלה';
    $('[data-k="right"] small').textContent = mode === 'climb' ? 'להסתכל ימינה' : 'ימינה';
    $('[data-k="back"] small').textContent = mode === 'fly' ? 'לאט יותר' : 'לעצור';
    $('[data-k="rise"] small').textContent = 'למעלה'; $('[data-k="sink"] small').textContent = 'למטה';
    setNote(pickNote(a), true);
    audio && audio.play && audio.play('select');
  }
  // ── a close look at one that stays in place: the camera circles it slowly; the arrows go round, closer, farther, up, down
  function bestLook(id) {
    let best = null, bs = Infinity;
    for (const e of [...W.plants, ...W.animals]) {
      if (e.sp.id !== id || !lookable(e) || (!e.isPlant && e.type === 'animal')) continue;
      e.focusPoint(_v);
      const s = _v.distanceTo(camera.position) * 0.05 - (e.isPlant ? e.growth * 2 + e.health : 0);
      if (s < bs) { bs = s; best = e; }
    }
    return best;
  }
  function startLook(id) {
    const e = bestLook(id);
    if (!e) { ui.toast(`לא מצאתי עכשיו ${zoneWord('in')} את ${defName(id, reg.byId.get(id)?.name)}`, 'info'); return; }
    if (R) releaseAnimal();
    let size = 1;
    if (e.isPlant) { const c = e.vis.crown(), s = e.obj.scale.x; size = Math.max(0.5, (c.top - c.bottom) * s, c.radius * s * 2); }
    else size = Math.max(1, (e.vis.length || 1) * e.obj.scale.x * 3);
    const ex = e.isPlant ? e.x : e.pos.x, ez = e.isPlant ? e.z : e.pos.z;
    R = { a: null, e, mode: 'look', size, yaw: Math.atan2(camera.position.x - ex, camera.position.z - ez), pitch: 0.32, dist: clamp(size * 2.1, 1.6, 9), yawV: 0, idle: 99,
      pos: new THREE.Vector3(), look: new THREE.Vector3(), fresh: true, note: null, noteT: 0, noteSince: -99, stateT: 0, factI: 0 };
    if (imv.active !== 'tour') imv.enter('tour', { driver, onExit, onKey, onBlur: clearInput });
    camera.fov = 55; camera.near = 0.05; camera.updateProjectionMatrix();
    el.classList.add('on'); el.classList.remove('m-walk', 'm-fly', 'm-climb'); el.classList.add('m-look');
    const sp = e.sp;
    nameEl.textContent = sp.name; imgW.innerHTML = imgHTML(sp.id, 'tv-img');
    const K = (t) => `<bdi dir="ltr">${t}</bdi>`;
    keysEl.innerHTML = `במקלדת: ${K('← →')} – להקיף · ${K('↑ ↓')} – קרוב ורחוק · ${K('E Q')} – מלמעלה ומלמטה`;
    $('[data-k="fwd"] small').textContent = 'קרוב יותר'; $('[data-k="back"] small').textContent = 'רחוק יותר';
    $('[data-k="left"] small').textContent = 'להקיף'; $('[data-k="right"] small').textContent = 'להקיף';
    $('[data-k="rise"] small').textContent = 'מלמעלה'; $('[data-k="sink"] small').textContent = 'מלמטה';
    setNote(pickLookNote(e), true);
    audio && audio.play && audio.play('select');
  }
  // who comes by: a living neighbour linked to it (the anemonefish in its anemone, a fish under the table coral), else its facts
  function pickLookNote(e) {
    const id = e.sp.id, ex = e.isPlant ? e.x : e.pos.x, ez = e.isPlant ? e.z : e.pos.z;
    let best = null, bd = 9;
    for (const ed of reg.edges) {
      const other = ed.from === id ? ed.to : ed.to === id ? ed.from : null; if (!other || other === id) continue;
      for (const b of W.animals) {
        if (b.sp.id !== other || !b.alive || b.removed || b.leaving) continue;
        const d = Math.hypot(b.pos.x - ex, b.pos.z - ez); if (d >= bd) continue;
        bd = d; best = { b, ed };
      }
    }
    if (best) return { key: 'visit:' + best.ed.key, prio: 1, title: `${defName(best.b.sp.id, best.b.sp.name)} ${gw(best.b.sp.id, 'קרוב', 'קרובה', 'קרובים', 'קרובות')}`, text: best.ed.text };
    const facts = [e.sp.fact, ...String(e.sp.more || '').split(/(?<=[.!?])\s+/)].filter(Boolean);
    const i = R && R.factI ? R.factI % facts.length : 0;
    return { key: 'fact:' + i, prio: 4, title: i === 0 ? 'הידעתם?' : 'ועוד משהו', text: facts[i] || '' };
  }
  function onExit() { releaseAnimal(); R = null; el.classList.remove('on', 'm-look'); clearInput(); }
  function stop() { closePicker(); if (imv.active === 'tour') imv.exit(); }
  function releaseAnimal() {
    if (!R || !R.a) return; const a = R.a;
    a.touring = false;
    if (a.driver) letGo(a);
  }
  // hand the animal back to its own behaviour
  function letGo(a) {
    a.driver = null;
    if (!a.alive || a.leaving) return;
    if (a.loco === 'flying') { a.state = 'idle'; a.action = HOVERERS.has(a.sp.id) ? 'hover' : 'glide'; a.timer = 0.4; }
    else { a.state = 'idle'; a.timer = 0.6 + Math.random() * 1.2; }
  }
  // take the steering (ground and flying animals)
  function grab(a) {
    a.driver = (dt, rdt) => (R && R.a === a ? (R.mode === 'fly' ? driveFly(a, rdt) : driveWalk(a, rdt)) : 0);
    R.spd = a.speed || 0; R.turnV = 0; R.altV = 0;
    a.path = null; a.goal = null; a.prey = null; a.food = null; a.perch = null; a.onGround = false;
    a.state = R.mode === 'fly' ? 'fly' : 'walk';
    if (R.mode === 'fly' && a.pos.y < env.heightAt(a.pos.x, a.pos.z) + 0.8) a.pos.y = env.heightAt(a.pos.x, a.pos.z) + 0.8;
  }
  function onPress(k) {
    if (!R || R.mode === 'look') return;
    if (R.mode === 'climb' && k === 'fwd') climbNext();
  }

  // ── obstacles
  function trunkHit(x, z, pad, y) {
    for (const p of W.plants) {
      if (!p.isTree || !p.alive || p.removed || p.falling) continue;
      const r = Math.max(0.3, (p.vis.trunkRadius || 0.4) * p.obj.scale.x) + pad;
      if (Math.abs(p.x - x) > r || Math.abs(p.z - z) > r) continue;
      if (y != null) { const c = p.crown(); if (c && y > c.bottom + 0.3) continue; }   // above the trunk: the crown is soft
      if (Math.hypot(p.x - x, p.z - z) < r) return p;
    }
    return null;
  }
  // the highest crown under / around a point (flying: rise over the trees instead of passing through them)
  function crownTopAt(x, z, y) {
    let top = -Infinity;
    for (const p of W.plants) {
      if (!p.isTree || !p.alive || p.removed || p.falling) continue;
      const c = p.crown(); if (!c) continue;
      if (Math.hypot(c.x - x, c.z - z) > c.radius * 0.8) continue;
      if (y < c.bottom - 0.5 || y > c.top + 0.6) continue;   // flying under the crown (along the trunks) is fine
      top = Math.max(top, c.top + 0.6);
    }
    return top;
  }
  // under the sea: corals, the anemone, the clam, the scenery coral heads and the rock boulders are solid
  // ({x, z, r, top}, rebuilt a few times a second). Seagrass, algae and plankton are soft: one swims through them.
  let solidList = [], solidT = -1;
  function solids() {
    if (!env.underwater) return solidList;
    const now = performance.now(); if (now - solidT < 250) return solidList;
    solidT = now; solidList = [];
    for (const p of W.plants) {
      if (!p.alive || p.removed || p.isTree || (p.sp.kind !== 'coral' && p.sp.kind !== 'sessile')) continue;
      const c = p.crown(); if (!c) continue;
      solidList.push({ x: p.x, z: p.z, r: Math.max(0.3, c.radius * 0.8), top: c.top, ref: p });
    }
    for (const d of env.decor || []) solidList.push({ x: d.x, z: d.z, r: d.r, top: d.top });
    for (const k of env.rocks || []) if (k.boulderTop != null) solidList.push({ x: k.x, z: k.z, r: k.r * 0.85, top: k.boulderTop });
    return solidList;
  }
  // the solid a point is inside (pad: a margin around it), or null
  function solidAt(x, y, z, pad = 0, skip = null) {
    for (const o of solids()) {
      if (o.ref && o.ref === skip) continue;
      if (Math.abs(o.x - x) > o.r + pad || Math.abs(o.z - z) > o.r + pad || y > o.top + pad) continue;
      if (Math.hypot(o.x - x, o.z - z) < o.r + pad) return o;
    }
    return null;
  }
  // a swimmer's next point: it slides along a coral or a rock (pushed out to its side), or rises over it near the top.
  // One that starts inside (a clownfish in its anemone) eases out instead of jumping.
  function keepOutOfSolids(a, p, pad, dt) {
    for (const o of solids()) {
      const R = o.r + pad, dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz);
      if (d >= R || p.y >= o.top + pad * 0.6) continue;
      const was = Math.hypot(a.pos.x - o.x, a.pos.z - o.z) < R && a.pos.y < o.top + pad * 0.6;
      if (p.y > o.top - 0.45) { p.y += (o.top + pad * 0.6 - p.y) * (was ? Math.min(1, dt * 4) : 1); continue; }
      const ux = d > 1e-4 ? dx / d : Math.sin(a.heading + Math.PI), uz = d > 1e-4 ? dz / d : Math.cos(a.heading + Math.PI);
      const ex = o.x + ux * R, ez = o.z + uz * R;
      if (was) { p.x += (ex - p.x) * Math.min(1, dt * 3); p.z += (ez - p.z) * Math.min(1, dt * 3); }
      else { p.x = ex; p.z = ez; }
    }
    return p;
  }
  // the chase camera: out of a solid it is in, and over one that hides the animal (between the camera and the head).
  // It rises at most 4 m for that; a coral the animal itself is passing through does not count as "in the way".
  function blockedView(want, head, skip, headIn) {
    let lift = 0;
    for (let k = 4; k < 10; k++) {
      const t = k / 10, sx = head.x + (want.x - head.x) * t, sy = head.y + (want.y - head.y) * t, sz = head.z + (want.z - head.z) * t;
      const o = solidAt(sx, sy, sz, 0.3, skip); if (!o || o === headIn) continue;
      lift = Math.max(lift, (o.top + 0.4 - sy) / t);
    }
    return lift;
  }
  function cameraOverSolids(want, head, skip) {
    const headIn = solidAt(head.x, head.y, head.z, 0, skip);
    const top = env.surfaceY != null ? env.surfaceY - 0.4 : 40;
    for (let i = 0; i < 3; i++) { const o = solidAt(want.x, want.y, want.z, 0.3, skip); if (!o) break; want.y = Math.min(top, o.top + 0.4); }
    let total = 0;
    for (let i = 0; i < 3; i++) {
      const lift = blockedView(want, head, skip, headIn); if (lift <= 0) break;
      const d = Math.min(lift, 4 - total, top - want.y); if (d <= 0.01) break;
      want.y += d; total += d;
    }
    // no room above (or still hidden): come in closer instead
    for (let i = 0; i < 4 && (solidAt(want.x, want.y, want.z, 0.25, skip) || blockedView(want, head, skip, headIn) > 0); i++) want.lerp(head, 0.35);
  }

  // ── steering: ground
  function driveWalk(a, rdt) {
    const dt = Math.min(rdt, 0.1);
    const turn = held('left') - held('right'), fwd = held('fwd'), back = held('back');
    R.turnV += (turn * 1.7 - R.turnV) * Math.min(1, dt * 6);
    a.heading = wrapA(a.heading + R.turnV * dt);
    const run = Math.max(a.runSpeed * 0.75, a.walkSpeed * 1.6);
    const target = back ? 0 : fwd ? run : turn ? a.walkSpeed * 0.8 : (R.idle < 0.6 ? R.spd : 0);
    R.spd += (target - R.spd) * Math.min(1, dt * (target > R.spd ? 2.2 : 3.5));
    // keep away from the shore: turn gently back toward the island
    const r = Math.hypot(a.pos.x, a.pos.z), edge = env.radius - 3.5;
    if (r > edge) { const home = Math.atan2(-a.pos.x, -a.pos.z); a.heading = wrapA(a.heading + wrapA(home - a.heading) * Math.min(1, dt * 1.5 * (r - edge))); }
    const step = R.spd * dt;
    if (step > 1e-4) {
      const pad = 0.15 + a.len * 0.2;
      // a coral or a rock in the way is solid too; one that started inside may only move out of it
      const outOf = (x, z) => {
        for (const o of solids()) {
          const R = o.r + pad * 0.5, dn = Math.hypot(x - o.x, z - o.z); if (dn >= R) continue;
          if (Math.hypot(a.pos.x - o.x, a.pos.z - o.z) < R && dn >= Math.hypot(a.pos.x - o.x, a.pos.z - o.z) - 1e-4) continue;
          return false;
        }
        return true;
      };
      const ok = (x, z) => a.canStand(x, z) && Math.hypot(x, z) < env.radius - 1.2 && !trunkHit(x, z, pad) && outOf(x, z);
      const nx = a.pos.x + Math.sin(a.heading) * step, nz = a.pos.z + Math.cos(a.heading) * step;
      if (ok(nx, nz)) { a.pos.x = nx; a.pos.z = nz; }
      else if (ok(nx, a.pos.z)) a.pos.x = nx;          // slide along the obstacle
      else if (ok(a.pos.x, nz)) a.pos.z = nz;
      else { R.spd *= 0.5; a.heading = wrapA(a.heading + 1.2 * dt); }
    }
    a.state = 'walk';
    return R.spd;
  }
  // ── steering: flying
  function driveFly(a, rdt) {
    const dt = Math.min(rdt, 0.1);
    const turn = held('left') - held('right'), fwd = held('fwd'), back = held('back'), alt = held('rise') - held('sink');
    R.turnV += (turn * 1.4 - R.turnV) * Math.min(1, dt * 5);
    a.heading = wrapA(a.heading + R.turnV * dt);
    const hover = HOVERERS.has(a.sp.id);
    const cruise = a.flySpeed * 0.62, target = fwd ? a.flySpeed : back ? (hover ? 0 : a.flySpeed * 0.32) : cruise;
    R.spd += (target - R.spd) * Math.min(1, dt * 1.8);
    R.altV += (alt * 3 - R.altV) * Math.min(1, dt * 4);
    let x = a.pos.x + Math.sin(a.heading) * R.spd * dt, z = a.pos.z + Math.cos(a.heading) * R.spd * dt, y = a.pos.y + R.altV * dt;
    const r = Math.hypot(x, z), edge = env.radius - 3;
    if (r > edge) { const home = Math.atan2(-a.pos.x, -a.pos.z); a.heading = wrapA(a.heading + wrapA(home - a.heading) * Math.min(1, dt * 1.8 * (r - edge))); if (r > env.radius - 0.5) { x *= (env.radius - 0.5) / r; z *= (env.radius - 0.5) / r; } }
    if (trunkHit(x, z, 0.3, y)) { x = a.pos.x; z = a.pos.z; R.spd *= 0.6; a.heading = wrapA(a.heading + 1.3 * dt); }
    const floor = env.heightAt(x, z) + (a.sp.isInsect ? 0.6 : 1.0);
    const over = crownTopAt(x, z, y);
    if (y < floor) y = floor;
    if (over > y) y += (over - y) * Math.min(1, dt * 2.5);   // rise smoothly over a crown in the way
    y = Math.min(y, 30);
    if (env.surfaceY != null) y = Math.min(y, env.surfaceY - 0.9);   // a fish stays under the water
    if (a.sp.swims || env.underwater) {   // corals and rocks: slide along them or rise over them, never into them
      const p = keepOutOfSolids(a, _v.set(x, y, z), clamp(a.len * a.obj.scale.x * 0.35, 0.2, 0.9), dt);
      x = p.x; z = p.z; y = Math.max(env.heightAt(p.x, p.z) + 0.5, Math.min(p.y, env.surfaceY != null ? env.surfaceY - 0.9 : 30));
    }
    a.pos.set(x, y, z);
    a.bank += (clamp(-R.turnV * 0.35, -0.45, 0.45) - a.bank) * Math.min(1, dt * 4);
    a.action = hover && R.spd < 0.8 ? 'hover' : (R.altV < -0.8 && !hover ? 'glide' : 'fly');
    a.state = 'fly';
    return R.spd;
  }
  // ── climbers: go to the next tree in the direction the child is looking
  function climbNext() {
    const a = R.a;
    if (a.state === 'climb' && a.path && a.path === R.userPath) { flashNote('כבר בדרך לעץ…'); return; }   // its own trip can be changed, ours runs to the end
    const look = R.camYaw;
    let best = null, bs = Infinity;
    for (const p of W.plants) {
      if (!p.isTree || !p.alive || p.removed || p.falling || p.growth < 0.4 || !p.vis.perchPoints().length) continue;
      if (a.perch && a.perch.plant === p) continue;
      const dx = p.x - a.pos.x, dz = p.z - a.pos.z, d = Math.hypot(dx, dz);
      if (d < 2 || d > 16) continue;
      const off = Math.abs(wrapA(Math.atan2(dx, dz) - look)); if (off > 1.1) continue;
      const s = d + off * 6; if (s < bs) { bs = s; best = p; }
    }
    let note = '';
    if (!best) {   // nothing that way: go to the nearest tree instead (a press should always lead somewhere)
      for (const p of W.plants) {
        if (!p.isTree || !p.alive || p.removed || p.falling || p.growth < 0.4 || !p.vis.perchPoints().length || (a.perch && a.perch.plant === p)) continue;
        const d = Math.hypot(p.x - a.pos.x, p.z - a.pos.z); if (d < 2 || d > 22) continue;
        if (d < bs) { bs = d; best = p; }
      }
      if (!best) { flashNote('אין כאן עוד עץ קרוב'); return; }
      note = 'אין עץ בכיוון הזה, ולכן ';
    }
    const idx = (Math.random() * 50) | 0, to = a.perchWorld(best, idx, new THREE.Vector3()); if (!to) return;
    const from = a.pos.clone(), slow = a.sp.id === 'sloth' || a.sp.id === 'chameleon';
    a.path = { p0: from, p1: to, c: from.clone().lerp(to, 0.5).add(_v.set(0, slow ? 0.5 : 2.5, 0)), t: 0, dur: Math.max(1, from.distanceTo(to) / (slow ? 0.5 : 4)),
      onArrive: () => { a.perch = { plant: best, idx }; a.state = 'perch'; a.timer = 5 + Math.random() * 5; } };
    a.state = 'climb'; a.perch = null; a.goal = null; a.food = null;
    R.lookOff = 0; R.userPath = a.path;
    flashNote(`${note}${defName(a.sp.id, a.sp.name)} ${gw(a.sp.id, 'יוצא', 'יוצאת')} אל ${defName(best.sp.id, best.sp.name)}${slow ? ` – ${gw(a.sp.id, 'הוא זז', 'היא זזה')} לאט, וכך ${gw(a.sp.id, 'חוסך', 'חוסכת')} כוח` : ''}`);
  }

  // ── what the animal notices (a caption from the species data)
  const near = (a, e, r) => { const x = e.isPlant ? e.x : e.pos.x, z = e.isPlant ? e.z : e.pos.z; return Math.hypot(x - a.pos.x, z - a.pos.z) < r; };
  const edge = (from, to, type) => reg.edges.find(e => e.from === from && e.to === to && e.type === type);
  // the card text of a relation; a food link without its own text becomes "העצלן אוכל עלים של הצקרופיה."
  function edgeText(a, e) {
    const custom = e.type !== 'eats' || (a.sp.diet || []).some(d => d.id === e.to && d.text);
    if (custom) return e.text;
    const t = reg.byId.get(e.to);
    return `${defName(a.sp.id, a.sp.name)} ${joinObj(dietVerb(e.part, a.sp.id), e.to, t?.name)}.`;
  }
  function pickNote(a) {
    const id = a.sp.id, def = defName(id, a.sp.name), g = (m, f) => gw(id, m, f);
    const sense = a.loco === 'flying' ? 'רואה' : g('מריח', 'מריחה');
    const R1 = a.loco === 'flying' ? 12 : 8;
    // resting / sleeping
    if (a.state === 'sleep') {
      const text = a.sp.active === 'night' && W.nightGlow < 0.5 ? `${def} ${g('פעיל', 'פעילה')} בלילה. ביום ${g('הוא נח', 'היא נחה')} במקום שקט.`
        : !a.isActive() ? `עכשיו לילה. בבוקר ${g('הוא ימשיך', 'היא תמשיך')} לחפש אוכל.`
        : `${g('הוא נח', 'היא נחה')} קצת, ועוד מעט ${g('ימשיך', 'תמשיך')} לחפש אוכל.`;
      return { key: 'sleep', prio: 1, title: `${def} ${g('ישן', 'ישנה')}`, text };
    }
    // someone that hunts it is around: gently, it is careful
    for (const b of W.animals) {
      if (!b.alive || b.removed || b.leaving || b === a || !b.sp.diet2.some(e => e.to === id && e.part === 'animals') || !near(a, b, 10)) continue;
      return { key: 'pred:' + b.sp.id, prio: 0, title: `${def} ${g('מרגיש', 'מרגישה')} ${prefName('ש', b.sp.id, b.sp.name)} ${gw(b.sp.id, 'קרוב', 'קרובה')}`, text: `${g('הוא נזהר', 'היא נזהרת')}, ${g('מקשיב', 'מקשיבה')} לכל רחש ${g('ומוכן', 'ומוכנה')} להתרחק.` };
    }
    // eating right now
    const eatP = a.state === 'eat' ? (a.food?.entity || a.perch?.plant) : null;
    if (eatP && eatP.isPlant) {
      const e = edge(id, eatP.sp.id, 'disperses') || edge(id, eatP.sp.id, 'pollinates') || edge(id, eatP.sp.id, 'eats');
      if (e) return { key: 'eat:' + eatP.sp.id, prio: 1, title: `${def} ${g('אוכל', 'אוכלת')} ליד ${defName(eatP.sp.id, eatP.sp.name)}`, text: edgeText(a, e) };
    }
    // plants it is linked to, nearby: seeds to spread > flowers > food > shelter / home
    const rank = { disperses: 0, pollinates: 1, eats: 2, shelter: 3, home: 3 };
    let best = null, bs = Infinity;
    for (const e of reg.edges) {
      if (e.from !== id || !(e.type in rank)) continue;
      const tsp = reg.byId.get(e.to); if (!tsp || !tsp.isPlant) continue;
      for (const p of W.plants) {
        if (p.sp.id !== e.to || !p.alive || p.removed || !near(a, p, R1)) continue;
        if (e.type === 'pollinates' && p.bloom < 0.2) continue;
        // a relation written in the species card beats a plain generated food line
        const custom = e.type !== 'eats' || (a.sp.diet || []).some(dd => dd.id === e.to && dd.text);
        const d = Math.hypot(p.x - a.pos.x, p.z - a.pos.z), s = (rank[e.type] + (custom ? 0 : 1.6)) * 6 + d;
        if (s < bs) { bs = s; best = { e, p }; }
      }
    }
    if (best) return { key: best.e.key, prio: 2, title: `${def} ${sense} את ${defName(best.p.sp.id, best.p.sp.name)}`, text: edgeText(a, best.e) };
    // small insects near an ant nest (colonies are never caught, so this stays gentle)
    for (const e of a.sp.diet2) {
      if (e.part !== 'insects') continue;
      const nest = W.animals.find(b => b.sp.id === e.to && b.alive && !b.removed && b.type !== 'animal' && near(a, b, R1));
      if (nest) return { key: 'nest:' + e.to, prio: 2, title: `${def} ${sense} את ${defName(e.to, nest.sp.name)}`, text: `${g('הוא מחפש', 'היא מחפשת')} חרקים קטנים ליד הקן – זה האוכל ${g('שלו', 'שלה')}.` };
    }
    if (a.carrying) return { key: 'carry', prio: 3, title: `${def} ${g('נושא', 'נושאת')} ${g('איתו', 'איתה')} זרעים של ${defName(a.carrying.sp.id, a.carrying.sp.name)}`, text: `במקום אחר הזרעים ייפלו לאדמה – ואולי יצמח שם צמח חדש.` };
    for (const b of W.animals) {
      if (b === a || b.sp.id !== id || !b.alive || b.removed || b.leaving || !near(a, b, 7)) continue;
      return { key: 'kin', prio: 3, title: `${def} ${g('פוגש', 'פוגשת')} עוד ${a.sp.name}`, text: `${g('גם הוא', 'גם היא')} ${g('מחפש', 'מחפשת')} כאן אוכל ומקום טוב לנוח.` };
    }
    return { key: 'fact', prio: 4, title: 'הידעתם?', text: a.sp.fact || '' };
  }
  function setNote(n, now) {
    if (!R || !n) return;
    R.note = n; R.noteSince = W.simT;
    const swap = () => { noteB.textContent = n.title; noteP.textContent = n.text; noteEl.classList.remove('fade'); };
    if (now) swap(); else { noteEl.classList.add('fade'); setTimeout(swap, 300); }
  }
  function flashNote(text) { if (!R) return; setNote({ key: 'msg:' + text, prio: -1, title: text, text: '' }, false); R.noteSince = W.simT + 2; }
  const doing = (a) => {
    const g = (m, f) => gw(a.sp.id, m, f), act = a.action, st = a.state;
    if (st === 'sleep') return g('ישן', 'ישנה');
    if (st === 'eat') return g('אוכל', 'אוכלת');
    if (st === 'climb') return g('מטפס', 'מטפסת');
    if (act === 'swim') return g('שוחה', 'שוחה');
    if (act === 'run') return g('רץ', 'רצה');
    if (act === 'walk') return g('הולך', 'הולכת');
    if (a.sp.swims && (act === 'hover' || act === 'glide' || act === 'fly' || st === 'fly')) return act === 'hover' ? g('מרחף במים', 'מרחפת במים') : g('שוחה', 'שוחה');
    if (act === 'hover') return g('מרחף', 'מרחפת');
    if (act === 'glide') return g('דואה', 'דואה');
    if (act === 'fly' || st === 'fly') return g('עף', 'עפה');
    return g('נח', 'נחה');
  };

  // ── per frame (before the rig places the camera)
  let tbT = 0, readyShown = false;
  function update(dt, rdt) {
    tbT -= rdt;
    if (tbT <= 0) {
      tbT = 1;
      if (tbBtn) {
        const any = anyTour();
        tbBtn.hidden = !any;
        const all = missions.missions.length > 0 && missions.missions.every(m => m.done);
        tbBtn.classList.toggle('ready', all);
        if (all && any && !readyShown && !W.viewMode) { readyShown = true; setTimeout(() => ui.toast('כל המשימות הושלמו! עכשיו אפשר לצאת לסיור בעיני בעלי החיים – הכפתור הכתום משמאל, למעלה.', 'good'), 2500); }
        if (all) readyShown = true;
      }
    }
    if (!R) return;
    if (R.mode === 'look') { updateLook(rdt); return; }
    const a = R.a;
    if (!a.alive || a.removed || a.leaving || a.injured) {
      const name = defName(a.sp.id, a.sp.name);
      stop(); ui.toast(`הסיור עם ${name} הסתיים`, 'info'); return;
    }
    for (const k in taps) if (taps[k] > 0) taps[k] -= rdt;
    const anyInput = ['fwd', 'back', 'left', 'right', 'rise', 'sink'].some(k => held(k));
    if (R.mode === 'climb') {
      // left / right look around the climber (the camera orbits, the sloth keeps its own pace)
      const turn = held('left') - held('right');
      R.lookV += (turn * 1.3 - R.lookV) * Math.min(1, rdt * 6);
      R.lookOff = wrapA(R.lookOff + R.lookV * rdt);
    } else {
      R.idle = anyInput ? 0 : R.idle + rdt;
      if (anyInput && !a.driver && dt > 0) grab(a);
      if (a.driver && R.idle > RELEASE_AFTER && R.spd < 0.3) letGo(a);
      if (a.driver && R.idle > RELEASE_AFTER + 2) letGo(a);
    }
    // caption
    R.stateT -= rdt;
    if (R.stateT <= 0) {
      R.stateT = 0.25;
      doEl.textContent = doing(a);
      const you = !!a.driver || (R.mode === 'climb' && a.state === 'climb' && !!a.path && a.path === R.userPath);
      whoEl.textContent = you ? 'אתם מכוונים' : `${gw(a.sp.id, 'מחליט', 'מחליטה')} לבד`;
      whoEl.classList.toggle('you', you);
    }
    R.noteT -= rdt;
    if (R.noteT <= 0) {
      R.noteT = 1;
      const n = pickNote(a), cur = R.note, age = W.simT - R.noteSince;
      if (!cur || (n.key !== cur.key && (age > 6 || n.prio < cur.prio))) setNote(n);
    }
  }

  // camera: behind and a little above the head, looking ahead; smoothed, no roll
  function driver(dt) {
    if (!R) return;
    if (R.mode === 'look') { lookDriver(dt); return; }
    const a = R.a, o = a.obj, s = o.scale.y;
    const size = clamp((a.vis.length || 1) * o.scale.x, 0.25, 3);
    _head.copy(o.position); _head.y += (a.vis.height || 0.5) * s * 0.85;
    // under the sea the camera keeps at least 3 m back: a small fish is still easy to see, and the reef has room to show
    const sea = !!(a.sp.swims || env.underwater);
    const back = clamp(size * 2.3, sea ? 3.2 : 1.4, 5.5), up = clamp(size * 0.8, sea ? 0.9 : 0.5, 2.4);
    // sitting in a crown (a resting sloth, a perched toucan): a chase camera would end up inside the leaves,
    // so look at the animal from just outside its tree instead (left / right walk around it)
    const pp = !a.sp.swims && a.perch && a.perch.plant && a.state !== 'fly' && a.state !== 'climb' && !a.driver ? a.perch.plant : null;   // a fish resting by a coral keeps the chase view
    const c = pp ? pp.crown() : null;
    let od = 0, yawT;
    if (c) {
      const ox = a.pos.x - c.x, oz = a.pos.z - c.z; od = Math.hypot(ox, oz);
      yawT = wrapA((od > 0.3 ? Math.atan2(ox, oz) : R.camYaw + Math.PI) + Math.PI + R.lookOff);
    } else yawT = wrapA(a.heading + (R.mode === 'climb' ? R.lookOff : 0));
    R.camYaw = wrapA(R.camYaw + wrapA(yawT - R.camYaw) * Math.min(1, dt * (c ? 1.6 : R.mode === 'climb' ? 3 : 2.2)));
    const fx = Math.sin(R.camYaw), fz = Math.cos(R.camYaw);
    if (c) {
      const out = Math.max(od + back, Math.min(c.radius * 0.9 + 0.8, od + 7));
      _want.set(c.x - fx * out, _head.y + up * 0.4, c.z - fz * out);
      _look.copy(_head);
    } else {
      _want.set(_head.x - fx * back, _head.y + up, _head.z - fz * back);
      _look.set(_head.x + fx * 3.2, _head.y - up * 0.12, _head.z + fz * 3.2);
    }
    // never inside a trunk (move in toward the head) and never under the ground
    for (let i = 0; i < 4 && trunkHit(_want.x, _want.z, 0.25, _want.y); i++) _want.lerp(_head, 0.35);
    const gy = env.heightAt(_want.x, _want.z) + 0.35; if (_want.y < gy) _want.y = gy;
    if (sea) cameraOverSolids(_want, _head, null);   // rise over a coral or a rock in the way (as the close look does)
    if (R.fresh) { R.pos.copy(_want); R.look.copy(_look); R.fresh = false; }
    const k = 1 - Math.exp(-dt * (c ? 2.5 : 5)), kl = 1 - Math.exp(-dt * 6);
    R.pos.lerp(_want, k); R.look.lerp(_look, kl);
    const gy2 = env.heightAt(R.pos.x, R.pos.z) + 0.3; if (R.pos.y < gy2) R.pos.y = gy2;
    if (sea) { const o = solidAt(R.pos.x, R.pos.y, R.pos.z, 0.2); if (o && (env.surfaceY == null || o.top + 0.3 < env.surfaceY - 0.4)) R.pos.y = o.top + 0.3; }   // the smoothed camera too
    if (env.surfaceY != null && R.pos.y > env.surfaceY - 0.4) R.pos.y = env.surfaceY - 0.4;   // under the water, the camera stays under it too
    camera.up.set(0, 1, 0); camera.position.copy(R.pos); camera.lookAt(R.look);
  }
  // the close look: circle round the one that stays in place; without input it goes round slowly by itself
  function lookDriver(dt) {
    const e = R.e;
    e.focusPoint(_head);
    const turn = held('left') - held('right'), zoom = held('fwd') - held('back'), tilt = held('rise') - held('sink');
    R.idle = turn || zoom || tilt ? 0 : R.idle + dt;
    const auto = R.idle > RELEASE_AFTER ? 0.14 : 0;
    R.yawV += ((turn * 1.1 + auto) - R.yawV) * Math.min(1, dt * 4);
    R.yaw = wrapA(R.yaw + R.yawV * dt);
    R.dist = clamp(R.dist * (1 - zoom * dt * 0.8), Math.max(0.8, R.size * 0.7), Math.max(4, R.size * 5));
    R.pitch = clamp(R.pitch + tilt * dt * 0.7, -0.05, 1.15);
    const ch = Math.cos(R.pitch) * R.dist;
    _want.set(_head.x + Math.sin(R.yaw) * ch, _head.y + Math.sin(R.pitch) * R.dist, _head.z + Math.cos(R.yaw) * ch);
    for (let i = 0; i < 4 && trunkHit(_want.x, _want.z, 0.25, _want.y); i++) _want.lerp(_head, 0.35);
    // never inside a neighbour (a big coral right behind the clam): rise over it instead
    for (const p of W.plants) {
      if (p === e || !p.alive || p.removed || p.isTree) continue;
      const c = p.vis.crown(), s = p.obj.scale.x, r = Math.max(0.3, c.radius * s * 0.9);
      if (Math.abs(p.x - _want.x) > r || Math.abs(p.z - _want.z) > r || Math.hypot(p.x - _want.x, p.z - _want.z) > r) continue;
      const top = p.y + c.top * s + 0.35; if (_want.y < top) _want.y = top;
    }
    for (let i = 0; i < 3 && env.underwater; i++) { const o = solidAt(_want.x, _want.y, _want.z, 0.3, e); if (!o) break; _want.y = o.top + 0.4; }   // the scenery coral heads and rocks too
    const gy = env.heightAt(_want.x, _want.z) + 0.3; if (_want.y < gy) _want.y = gy;
    if (env.surfaceY != null && _want.y > env.surfaceY - 0.5) _want.y = env.surfaceY - 0.5;
    if (R.fresh) { R.pos.copy(_want); R.look.copy(_head); R.fresh = false; }
    R.pos.lerp(_want, 1 - Math.exp(-dt * 4)); R.look.lerp(_head, 1 - Math.exp(-dt * 6));
    camera.up.set(0, 1, 0); camera.position.copy(R.pos); camera.lookAt(R.look);
  }
  function updateLook(rdt) {
    const e = R.e;
    if (!lookable(e)) { const name = defName(e.sp.id, e.sp.name); stop(); ui.toast(`המבט על ${name} הסתיים`, 'info'); return; }
    for (const k in taps) if (taps[k] > 0) taps[k] -= rdt;
    R.stateT -= rdt;
    if (R.stateT <= 0) {
      R.stateT = 0.5;
      const id = e.sp.id;
      doEl.textContent = !e.isPlant ? gw(id, 'עסוק', 'עסוקה', 'עסוקים', 'עסוקות') : e.health < 0.55 ? gw(id, 'חלש', 'חלשה', 'חלשים', 'חלשות')
        : e.growth < 0.95 ? gw(id, 'גדל', 'גדלה', 'גדלים', 'גדלות') : gw(id, 'בוגר', 'בוגרת', 'בוגרים', 'בוגרות');
      whoEl.textContent = e.isPlant ? gw(id, 'נשאר במקום', 'נשארת במקום', 'נשארים במקום', 'נשארות במקום') : 'מבט מקרוב'; whoEl.classList.remove('you');
    }
    R.noteT -= rdt;
    if (R.noteT <= 0) {
      R.noteT = 1;
      const age = W.simT - R.noteSince;
      if (R.note && R.note.prio === 4 && age > 9) R.factI++;   // read one fact, then the next one
      const n = pickLookNote(e), cur = R.note;
      if (!cur || (n.key !== cur.key && (age > 7 || n.prio < cur.prio))) setNote(n);
    }
  }

  /** label for the species panel button, or '' when this species cannot be toured now */
  function labelFor(id) {
    const sp = reg.byId.get(id);
    if (lookableSp(sp)) return [...W.plants, ...W.animals].some(e => e.sp.id === id && lookable(e)) ? 'מבט מקרוב על ' + defName(id, sp.name) : '';
    if (!tourableSp(sp) || !W.animals.some(a => a.sp.id === id && rideable(a))) return '';
    return 'סיור בעיניים של ' + defName(id, sp.name);
  }
  function dispose() {
    stop(); window.removeEventListener('keydown', onPickKey, true);
    el.remove(); pick.remove(); if (tbBtn) tbBtn.remove();
  }
  return { start, stop, openPicker, closePicker, update, labelFor, dispose, presentSpecies, presentLook, absentSpecies: () => absentSpecies(presentSpecies()), bringLine, get riding() { return R ? (R.a || R.e) : null; }, get mode() { return R ? R.mode : null; } };
}
