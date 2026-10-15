// Looking through a field camera ("מצלמת שטח"): a full-screen view from the lens of a placed camera.
// The child turns the camera all the way around (drag, arrow keys / A-D, two big ◀ ▶ buttons) and tilts it a little
// (drag up/down, ↑ ↓ / W-S). "Auto scan" sweeps slowly and locks onto the nearest moving animal for a few seconds
// (the aiming itself lives in tools.js, so cameras keep working when nobody is looking through them).
// Cheap on weak PCs: the view is the normal single render from another point; the radar and labels update at ~6 Hz.
import * as THREE from 'three';
import { CAM } from './tools.js';
import { defName } from '../data/common.js';
import { ARROW, holdButton } from './immersive.js';

const CSS_ID = 'fieldcam-css';
const CSS = `
#ui.wol .fc-view .fc-frame { position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse at center, transparent 58%, rgba(6, 14, 9, .34) 100%); }
#ui.wol .fc-view .fc-corner { position: absolute; width: 46px; height: 46px; border: 3px solid rgba(233, 230, 204, .78); }
#ui.wol .fc-view .fc-corner.tl { top: 128px; left: 18px; border-right: 0; border-bottom: 0; border-radius: 14px 0 0 0; }
#ui.wol .fc-view .fc-corner.tr { top: 116px; right: 18px; border-left: 0; border-bottom: 0; border-radius: 0 14px 0 0; }
#ui.wol .fc-view .fc-corner.bl { bottom: 18px; left: 18px; border-right: 0; border-top: 0; border-radius: 0 0 0 14px; }
#ui.wol .fc-view .fc-corner.br { bottom: 18px; right: 18px; border-left: 0; border-top: 0; border-radius: 0 0 14px 0; }
#ui.wol .fc-view .fc-cross { position: absolute; left: 50%; top: 50%; width: 30px; height: 30px; transform: translate(-50%, -50%); opacity: .55; pointer-events: none; }
#ui.wol .fc-view .fc-cross::before, #ui.wol .fc-view .fc-cross::after { content: ""; position: absolute; background: var(--chalk); border-radius: 2px; }
#ui.wol .fc-view .fc-cross::before { left: 14px; top: 0; width: 2px; height: 30px; }
#ui.wol .fc-view .fc-cross::after { top: 14px; left: 0; height: 2px; width: 30px; }
#ui.wol .fc-label { position: absolute; top: 12px; right: 12px; display: flex; align-items: center; gap: 10px; padding: 6px 16px 6px 12px; border-radius: 999px;
  background: rgba(17, 36, 26, .9); box-shadow: 0 0 0 1.5px rgba(180, 203, 102, .45), 0 6px 14px rgba(0, 0, 0, .35); font-weight: 700; min-height: 48px; }
#ui.wol .fc-label b { font-family: var(--serif); font-weight: 400; font-size: 1.15em; }
#ui.wol .fc-rec { width: 12px; height: 12px; border-radius: 50%; background: #e5483b; box-shadow: 0 0 0 3px rgba(229, 72, 59, .25); animation: fc-blink 1.6s ease-in-out infinite; }
#ui.wol .fc-night { position: absolute; top: 70px; right: 12px; display: none; padding: 5px 14px; border-radius: 999px; color: #dfe6fb; font-weight: 700; font-size: .9em;
  background: rgba(20, 30, 58, .88); box-shadow: 0 0 0 1.5px rgba(160, 180, 230, .4); }
#ui.wol .fc-view.is-night .fc-night { display: block; }
@keyframes fc-blink { 50% { opacity: .25; } }
#ui.wol .fc-next { position: absolute; top: 72px; left: 12px; pointer-events: auto; min-height: 48px; padding: 6px 16px; border-radius: 999px; font-weight: 800;
  background: rgba(17, 36, 26, .9); color: var(--chalk); box-shadow: 0 0 0 1.5px rgba(180, 203, 102, .45), 0 6px 14px rgba(0, 0, 0, .35); }
#ui.wol .fc-next:hover { background: rgba(27, 54, 38, .95); }
#ui.wol .fc-turn { position: absolute; top: 50%; transform: translateY(-50%); }
#ui.wol .fc-turn.l { left: 26px; } #ui.wol .fc-turn.r { right: 26px; }
#ui.wol .fc-bottom { position: absolute; left: 50%; bottom: 26px; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 10px; width: min(560px, calc(100vw - 300px)); }
#ui.wol .fc-target { pointer-events: none; display: flex; align-items: center; gap: 10px; padding: 8px 18px; border-radius: 999px; min-height: 46px; max-width: 100%;
  background: rgba(226, 223, 196, .96); color: var(--ink); font-weight: 700; box-shadow: 0 6px 14px rgba(0, 0, 0, .35); transition: background .2s; }
#ui.wol .fc-target b { font-family: var(--serif); font-weight: 400; font-size: 1.2em; }
#ui.wol .fc-target.lock { background: #f4e2b0; box-shadow: 0 0 0 2px var(--honey), 0 6px 14px rgba(0, 0, 0, .35); }
#ui.wol .fc-target.empty { background: rgba(17, 36, 26, .86); color: var(--chalk); font-weight: 600; }
#ui.wol .fc-inrange { display: none; padding: 2px 9px; border-radius: 99px; background: var(--leaf2); color: #fff; font-size: .82em; white-space: nowrap; }
#ui.wol .fc-target.in .fc-inrange { display: inline; }
#ui.wol .fc-auto { pointer-events: auto; display: inline-flex; align-items: center; gap: 10px; min-height: 50px; padding: 6px 20px 6px 14px; border-radius: 999px; font-weight: 800;
  background: rgba(17, 36, 26, .92); color: var(--chalk); box-shadow: 0 0 0 1.5px rgba(180, 203, 102, .45), 0 6px 14px rgba(0, 0, 0, .35); }
#ui.wol .fc-auto i { position: relative; width: 44px; height: 24px; border-radius: 99px; background: rgba(233, 230, 204, .25); transition: background .2s; flex: none; }
#ui.wol .fc-auto i::after { content: ""; position: absolute; top: 3px; right: 3px; width: 18px; height: 18px; border-radius: 50%; background: var(--chalk); transition: transform .2s; }
#ui.wol .fc-auto[aria-pressed="true"] i { background: var(--leaf2); }
#ui.wol .fc-auto[aria-pressed="true"] i::after { transform: translateX(-20px); }
#ui.wol .fc-radar { position: absolute; right: 26px; bottom: 26px; width: 118px; height: 118px; border-radius: 50%; pointer-events: none;
  background: rgba(17, 36, 26, .88); box-shadow: 0 0 0 1.5px rgba(180, 203, 102, .45), 0 6px 14px rgba(0, 0, 0, .35); }
#ui.wol .fc-radar canvas { width: 100%; height: 100%; display: block; }
#ui.wol .fc-help { padding: 8px 16px; border-radius: 12px; pointer-events: none;
  background: rgba(17, 36, 26, .82); color: var(--chalk); font-weight: 600; text-align: center; transition: opacity .6s; max-width: min(520px, 80vw); }
#ui.wol .fc-help.gone { opacity: 0; }
#ui.wol .fc-flash { position: absolute; inset: 0; background: #fff; opacity: 0; pointer-events: none; }
#ui.wol .fc-flash.go { animation: fc-flash .5s ease-out; }
@keyframes fc-flash { 0% { opacity: .55; } 100% { opacity: 0; } }
/* at night a real trail camera sees in black and white (infrared light); skipped on the simple-graphics setting */
canvas#game.fc-ir { filter: grayscale(1) brightness(1.85) contrast(1.06); }
/* the toolbar button that opens the cameras */
#ui.wol .tb[data-a="fieldcam"] .ic { color: #c3dc8c; }
#ui.wol.kids .imv-dock .tb[data-a="fieldcam"] { justify-content: flex-start; padding: 0 10px 0 8px; }
#ui.wol.kids .imv-dock .tb[data-a="fieldcam"] .tb-lab { display: inline; }
@media (max-width: 1100px) { #ui.wol .fc-bottom { width: min(520px, calc(100vw - 280px)); } #ui.wol .fc-radar { width: 96px; height: 96px; } }
@media (max-height: 720px) { #ui.wol .fc-bottom { bottom: 16px; } #ui.wol .fc-auto { min-height: 44px; } }
`;
const CAM_ICON = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect class="f" x="5" y="5" width="14" height="11" rx="2.5"/><rect x="5" y="5" width="14" height="11" rx="2.5"/><circle cx="12" cy="10.5" r="3"/><path d="M12 16v5M9 21h6"/><circle cx="16.3" cy="7.4" r=".6" fill="currentColor"/></svg>';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const wrapA = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const FOV = 62;
const STEP = 0.4, RATE = 1.15, TILT_STEP = 0.12, TILT_RATE = 0.6;   // one click / holding (rad, rad/s)

export function createFieldCam({ W, env, tools, camera, canvas, ui, audio, imv }) {
  if (!document.getElementById(CSS_ID)) { const st = document.createElement('style'); st.id = CSS_ID; st.textContent = CSS; document.head.appendChild(st); }
  const root = document.getElementById('ui');
  const el = document.createElement('div');
  el.className = 'imv fc-view'; el.lang = 'he';
  el.innerHTML = `<div class="fc-frame"></div><i class="fc-corner tl"></i><i class="fc-corner tr"></i><i class="fc-corner bl"></i><i class="fc-corner br"></i><i class="fc-cross"></i>
    <div class="fc-flash"></div>
    <button type="button" class="imv-exit" data-a="exit">${ARROW.close}<span>חזרה לאי</span><kbd>Esc</kbd></button>
    <button type="button" class="fc-next" data-a="next">המצלמה הבאה</button>
    <div class="fc-label"><span class="fc-rec"></span><b class="fc-name">מצלמת שטח</b></div><span class="fc-night">🌙 מצלמת לילה – רואה בחושך</span>
    <button type="button" class="imv-round fc-turn l" aria-label="סובבו שמאלה">${ARROW.left}<small>שמאלה</small></button>
    <button type="button" class="imv-round fc-turn r" aria-label="סובבו ימינה">${ARROW.right}<small>ימינה</small></button>
    <div class="fc-bottom"><p class="fc-help">גררו את התמונה, או לחצו על החצים, כדי לסובב את המצלמה לכל הכיוונים</p><div class="fc-target empty"><span class="fc-tt">סורקת את היער…</span><span class="fc-inrange">📷 בטווח צילום</span></div>
      <button type="button" class="fc-auto" aria-pressed="true"><i></i><span>סריקה אוטומטית</span></button></div>
    <div class="fc-radar"><canvas width="118" height="118"></canvas></div>`;
  root.appendChild(el);
  const $ = (s) => el.querySelector(s);
  const nameEl = $('.fc-name'), targetEl = $('.fc-target'), ttEl = $('.fc-tt'), autoBtn = $('.fc-auto'), nextBtn = $('.fc-next'), helpEl = $('.fc-help'), flashEl = $('.fc-flash');
  const radar = $('.fc-radar canvas'), rctx = radar.getContext('2d');

  // toolbar button (only while there is a camera on the island)
  let tbBtn = null;
  const tb = imv.dock;
  if (tb) {
    tbBtn = document.createElement('button');
    tbBtn.className = 'tb tg'; tbBtn.dataset.a = 'fieldcam'; tbBtn.dataset.tip = 'מה רואות המצלמות?'; tbBtn.setAttribute('aria-label', 'להסתכל דרך מצלמות השטח');
    tbBtn.innerHTML = `${CAM_ICON}<span class="tb-lab">מצלמות</span>`; tbBtn.hidden = true;
    tbBtn.addEventListener('click', (e) => { e.stopPropagation(); open(); });
    tb.appendChild(tbBtn);
  }

  let cur = null, helpT = 0, labelT = 0, radarT = 0, lastShown = '';
  const hold = { turn: 0, tilt: 0 }, vel = { turn: 0, tilt: 0 }, pulse = { turn: 0, tilt: 0 };
  const keys = new Set();
  const cams = () => tools.cameras();

  function setAuto(on) {
    if (!cur) return;
    cur.auto = !!on; autoBtn.setAttribute('aria-pressed', String(cur.auto));
    if (!on) { cur.lock = null; } else { cur.lockCool = 0; cur.scanT = 0; }
  }
  // any manual turn switches the auto scan off (the child decides where to look)
  function manual() { if (cur && cur.auto) setAuto(false); helpEl.classList.add('gone'); }

  function open(p) {
    const list = cams(); if (!list.length) { ui.toast('אין עדיין מצלמות שטח באי. גררו מצלמה מהלשונית "טכנולוגיה".', 'info'); return; }
    cur = p && list.includes(p) ? p : list[0];
    resetInput();
    imv.enter('fieldcam', { driver, onExit, onKey, onBlur: resetInput });
    camera.fov = FOV; camera.near = 0.08; camera.updateProjectionMatrix();
    el.classList.add('on'); paint(); helpEl.classList.remove('gone'); helpT = 6;
    audio && audio.play && audio.play('click');
  }
  function onExit() { el.classList.remove('on'); canvas.classList.remove('fc-ir'); cur = null; resetInput(); }
  function close() { if (imv.active === 'fieldcam') imv.exit(); }
  function next() {
    const list = cams(); if (!cur || list.length < 2) return;
    cur = list[(list.indexOf(cur) + 1) % list.length]; resetInput(); paint();
    audio && audio.play && audio.play('click');
  }
  function paint() {
    if (!cur) return;
    const list = cams(), i = list.indexOf(cur) + 1;
    nameEl.textContent = list.length > 1 ? `מצלמת שטח ${i} מתוך ${list.length}` : 'מצלמת שטח';
    nextBtn.hidden = list.length < 2;
    autoBtn.setAttribute('aria-pressed', String(!!cur.auto));
    lastShown = ''; labelT = 0; radarT = 0;
  }
  function resetInput() { for (const k in hold) { hold[k] = 0; vel[k] = 0; pulse[k] = 0; } keys.clear(); for (const f of ends) f(); drag = null; }

  // ── input: buttons
  const ends = [];
  ends.push(holdButton($('.fc-turn.l'), { press: () => { manual(); pulse.turn += STEP; }, hold: (on) => { hold.turn = on ? 1 : 0; } }));
  ends.push(holdButton($('.fc-turn.r'), { press: () => { manual(); pulse.turn -= STEP; }, hold: (on) => { hold.turn = on ? -1 : 0; } }));
  autoBtn.addEventListener('click', () => { setAuto(!(cur && cur.auto)); audio && audio.play && audio.play('click'); });
  nextBtn.addEventListener('click', next);
  $('.imv-exit').addEventListener('click', close);
  for (const b of el.querySelectorAll('button')) b.addEventListener('pointerdown', (e) => e.stopPropagation());

  // ── input: keyboard (arrows / WASD; a held key turns smoothly)
  const KEYMAP = { ArrowLeft: ['turn', 1], KeyA: ['turn', 1], ArrowRight: ['turn', -1], KeyD: ['turn', -1], ArrowUp: ['tilt', 1], KeyW: ['tilt', 1], ArrowDown: ['tilt', -1], KeyS: ['tilt', -1] };
  function onKey(e, down) {
    if (down && (e.code === 'KeyN' || e.key === 'Tab')) { if (cams().length > 1) { next(); return true; } return e.key === 'Tab' ? false : true; }
    const m = KEYMAP[e.code] || KEYMAP[e.key]; if (!m) return false;
    const id = e.code || e.key;
    if (down) {
      if (!keys.has(id)) { keys.add(id); manual(); pulse[m[0]] += m[1] * (m[0] === 'turn' ? STEP * 0.6 : TILT_STEP); }
    } else keys.delete(id);
    hold.turn = 0; hold.tilt = 0;
    for (const k of keys) { const mm = KEYMAP[k]; if (mm) hold[mm[0]] = mm[1]; }
    return true;
  }

  // ── input: drag the picture (grab the scene: dragging right turns the camera to the left, like a photo sphere)
  let drag = null;
  function onDown(e) { if (!cur || e.button > 0) return; drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; try { canvas.setPointerCapture(e.pointerId); } catch (err) { } }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id || !cur) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    if (!dx && !dy) return;
    manual();
    const k = (FOV * Math.PI / 180) / Math.max(200, canvas.clientHeight || innerHeight);   // a drag across the picture ≈ the angle it shows
    cur.yaw = wrapA(cur.yaw + dx * k);
    cur.pitch = clamp(cur.pitch + dy * k, CAM.pitchMin, CAM.pitchMax);
  }
  function onUp(e) { if (drag && e.pointerId === drag.id) drag = null; }
  canvas.addEventListener('pointerdown', onDown); window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp);

  // a photo was taken: flash the view if it is this camera
  tools.hooks.onShot = (p) => { if (p === cur) { flashEl.classList.remove('go'); void flashEl.offsetWidth; flashEl.classList.add('go'); } };

  // ── per frame (before the camera rig runs the driver)
  const _eye = new THREE.Vector3(), _at = new THREE.Vector3(), _f = new THREE.Vector3();
  function update(rdt) {
    if (tbBtn) { const n = cams().length; const hide = n === 0; if (tbBtn.hidden !== hide) tbBtn.hidden = hide; }
    if (!cur) return;
    if (!cams().includes(cur)) { close(); return; }
    // manual motion: eased holds + one-click steps
    for (const k of ['turn', 'tilt']) {
      const take = pulse[k] * Math.min(1, rdt * 7); pulse[k] -= take; if (Math.abs(pulse[k]) < 1e-4) pulse[k] = 0;
      vel[k] += (hold[k] * (k === 'turn' ? RATE : TILT_RATE) - vel[k]) * Math.min(1, rdt * (hold[k] ? 5 : 9));
      if (Math.abs(vel[k]) < 1e-4) vel[k] = 0;
      const d = take + vel[k] * rdt;
      if (k === 'turn') cur.yaw = wrapA(cur.yaw + d); else cur.pitch = clamp(cur.pitch + d, CAM.pitchMin, CAM.pitchMax);
    }
    if (helpT > 0) { helpT -= rdt; if (helpT <= 0) helpEl.classList.add('gone'); }
    const night = W.nightGlow > 0.5;
    el.classList.toggle('is-night', night);
    const ir = night && !root.classList.contains('q-low');
    if (canvas.classList.contains('fc-ir') !== ir) canvas.classList.toggle('fc-ir', ir);
    labelT -= rdt; if (labelT <= 0) { labelT = 0.16; paintTarget(); }
    radarT -= rdt; if (radarT <= 0) { radarT = 0.2; drawRadar(); }
  }
  function driver() {
    if (!cur) return;
    tools.camEye(cur, _eye);
    const cp = Math.cos(cur.pitch);
    _at.set(_eye.x + Math.sin(cur.yaw) * cp, _eye.y + Math.sin(cur.pitch), _eye.z + Math.cos(cur.yaw) * cp);
    camera.up.set(0, 1, 0); camera.position.copy(_eye); camera.lookAt(_at);
  }
  // what is in front of the lens right now
  function inFront() {
    const eyeY = env.heightAt(cur.x, cur.z) + CAM.eyeY;
    const vh = camera.fov * Math.PI / 360, hh = Math.atan(Math.tan(vh) * camera.aspect) * 0.92;   // half of the picture, across and up
    let best = null, bs = Infinity;
    for (const a of W.animals) {
      if (!a.alive || a.removed || a.leaving || a.type !== 'animal') continue;
      a.focusPoint(_f);
      const dx = _f.x - cur.x, dz = _f.z - cur.z, d = Math.hypot(dx, dz);
      if (d > CAM.view || d < 0.5) continue;
      const off = Math.abs(wrapA(Math.atan2(dx, dz) - cur.yaw)), voff = Math.abs(Math.atan2(_f.y - eyeY, d) - cur.pitch);
      if (off > hh || voff > vh * 0.95) continue;
      const s = off * 10 + d * 0.3; if (s < bs) { bs = s; best = a; }
    }
    return best;
  }
  function paintTarget() {
    const locked = cur.auto && cur.lock && cur.lock.alive && !cur.lock.removed ? cur.lock : null;
    const a = locked || inFront();
    const seen = a ? tools.cameraSees(cur) : null;
    let html, cls;
    if (locked) { html = `🎯 המצלמה עוקבת אחרי <b>${esc(defName(a.sp.id, a.sp.name))}</b>`; cls = 'lock'; }
    else if (a) { html = `בתמונה: <b>${esc(a.sp.name)}</b>`; cls = ''; }
    else { html = cur.auto ? 'סורקת את היער… מחפשת בעלי חיים' : 'אין בעלי חיים בתמונה – סובבו את המצלמה'; cls = 'empty'; }
    const sig = html + cls + (seen === a && a ? '1' : '0');
    if (sig === lastShown) return;
    lastShown = sig;
    ttEl.innerHTML = html;
    targetEl.className = 'fc-target ' + cls + (a && seen === a ? ' in' : '');
  }
  // radar: the camera looks "up"; dots are animals around it, the wedge is what the lens can photograph
  function drawRadar() {
    const c = rctx, S = radar.width, cx = S / 2, cy = S / 2, R = S / 2 - 6, k = R / CAM.view;
    c.clearRect(0, 0, S, S);
    c.strokeStyle = 'rgba(233,230,204,.22)'; c.lineWidth = 1;
    c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(cx, cy, CAM.range * k, 0, Math.PI * 2); c.stroke();
    c.fillStyle = 'rgba(180,203,102,.28)';
    c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, CAM.range * k, -Math.PI / 2 - CAM.half, -Math.PI / 2 + CAM.half); c.closePath(); c.fill();
    for (const a of W.animals) {
      if (!a.alive || a.removed || a.leaving || a.type !== 'animal') continue;
      const dx = a.pos.x - cur.x, dz = a.pos.z - cur.z, d = Math.hypot(dx, dz); if (d > CAM.view) continue;
      const off = wrapA(Math.atan2(dx, dz) - cur.yaw);   // + = to the left of the lens
      const x = cx - Math.sin(off) * d * k, y = cy - Math.cos(off) * d * k;
      const moving = (a.speed || 0) > 0.15;
      c.fillStyle = moving ? '#f2d77e' : 'rgba(233,230,204,.75)';
      c.beginPath(); c.arc(x, y, moving ? 3.6 : 3, 0, Math.PI * 2); c.fill();
      if (a === cur.lock && cur.auto) { c.strokeStyle = '#e6a93c'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 6.5, 0, Math.PI * 2); c.stroke(); }
    }
    c.fillStyle = '#e9e6cc'; c.beginPath(); c.moveTo(cx, cy - 7); c.lineTo(cx - 5, cy + 5); c.lineTo(cx + 5, cy + 5); c.closePath(); c.fill();
  }

  // ── picking a placed camera on the island (click = look through it)
  const _p = new THREE.Vector3();
  function pickAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect(); let best = null, bd = Infinity;
    for (const p of cams()) {
      _p.set(p.x, env.heightAt(p.x, p.z) + CAM.eyeY - 0.3, p.z);
      const dist = camera.position.distanceTo(_p);
      const q = _p.project(camera); if (q.z > 1 || q.z < -1) continue;
      const sx = (q.x + 1) / 2 * rect.width + rect.left, sy = (1 - q.y) / 2 * rect.height + rect.top;
      const r = 18 + Math.min(40, 900 / Math.max(4, dist));
      const d = Math.hypot(sx - clientX, sy - clientY);
      if (d < r && d < bd) { bd = d; best = p; }
    }
    return best;
  }

  function dispose() {
    close(); tools.hooks.onShot = null;
    canvas.removeEventListener('pointerdown', onDown); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
    el.remove(); if (tbBtn) tbBtn.remove();
  }
  return { open, close, next, update, pickAt, dispose, setAuto, get current() { return cur; } };
}
