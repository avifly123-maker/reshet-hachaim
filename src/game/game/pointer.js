// The canvas pointer: hover and click-select, a click on a placed field camera, a click on the road; moving a plant
// by a click (the card's "להעביר למקום אחר") or by dragging it or its handle, and dragging a device that stands on
// the ground. Owns ctx.moving, ctx.down, ctx.lastMove and ctx.mv.
// Gives ctx: startMove, onDown, onUp, onMove, onMoveKey, onLeave, mvHandle, onMvDown, onMvMove, onMvUp, onMvKey,
// placeMoveHandle.
// Takes from ctx: the names destructured at the top of createPointer;
// functions of later parts through late(): offerRoadFix.
// Shared state it reads or changes: ctx.moving, ctx.crowns, ctx.panelId, ctx.lightDirty, ctx.down, ctx.lastMove,
// ctx.dragState, ctx.fieldcam, ctx.mv, ctx.tools.
import * as THREE from 'three';
import { toolDef } from '../tools.js';
import { gw } from '../../data/common.js';
import { zoneWord } from '../../core/place.js';
import { _v, late } from './common.js';

export function createPointer(ctx) {
  const { env, W, spacingOK, light, alive, ui, markers, canvas, audio, groundHit, pick, select, rig, camera } = ctx;
  const offerRoadFix = late(ctx, 'offerRoadFix');   // made by a later part

  // moving a plant: the next click on the ground is its new place (Escape or a click on it again cancels)
  ctx.moving = null;
  function checkMove(e, hit) {
    if (!hit) return { ok: false, reason: `לחצו על מקום ${zoneWord('in')}` };
    const sp = e.sp, { x, z } = hit;
    if (Math.hypot(x, z) > env.radius + 0.5) return { ok: false, reason: 'קרוב מדי לקצה' };
    if (!env.isPlaceable(x, z)) return { ok: false, reason: env.isWater(x, z) ? 'זה מים' : 'אי אפשר לשתול כאן' };
    if (W.onRoad(x, z, 0.8)) return { ok: false, reason: 'אי אפשר לשתול על הכביש' };
    if (sp.needs?.rocks && !W.nearRock(x, z, 3)) return { ok: false, reason: 'צריך סלעים – בחרו מקום ליד הסלעים' };
    if (sp.needs?.water && !W.nearWater(x, z, 6)) return { ok: false, reason: 'צריך מים קרובים' };
    if (!spacingOK(sp, x, z, e)) return { ok: false, reason: 'צפוף מדי – אין מקום לשורשים' };
    const lv = light.transmission(x, env.heightAt(x, z) + 1, z, ctx.crowns, light.noonSun, e);
    return { ok: true, warn: (sp.lightNeed ?? 0.5) > 0.55 && lv < 0.35, text: `אור כאן: ${Math.round(lv * 100)}% · לחצו כדי להעביר` };
  }
  function startMove(e) {
    if (!e || !alive(e) || !e.isPlant || e.host || W.research) return;
    ctx.moving = { e }; ui.hideSpecies(); ctx.panelId = null; markers.select(null);
    ui.toast(`בחרו מקום חדש ל${e.sp.name} ולחצו עליו. Esc לביטול.`, 'info');
  }
  function endMove(hit) {
    const m = ctx.moving; ctx.moving = null; markers.showGhost(null); ui.hideHover(); canvas.style.cursor = '';
    if (!m || !hit) return;
    commitMove(m.e, hit);
  }
  function commitMove(e, hit) {
    const chk = checkMove(e, hit);
    if (!chk.ok) { audio.play('invalid'); ui.toast(chk.reason, 'warn'); return false; }
    if (!alive(e)) return false;
    markers.burst(_v.set(e.x, e.y + 0.5, e.z), '#c8a878', 16, { size: 0.4, speed: 2 });
    e.x = hit.x; e.z = hit.z; e.y = env.heightAt(hit.x, hit.z) - 0.05; e.obj.position.set(e.x, e.y, e.z);
    e.health = Math.min(e.health, 0.85);   // moving shakes the roots a little
    for (const q of W.plants) if (q.host === e && alive(q)) { if (q.sp.id === 'liana') { q.x = e.x; q.z = e.z; q.y = e.y; q.obj.position.set(q.x, q.y, q.z); } else q.placeOnHost(); }
    for (const a of W.animals) if (a.perch && a.perch.plant === e) { a.perch = null; a.state = 'idle'; a.timer = 0; }
    e._crownT = -1; ctx.lightDirty = true;
    markers.burst(_v.set(e.x, e.y + 0.5, e.z), '#b8f08a', 18, { size: 0.4, speed: 2 });
    W.stats.moved = (W.stats.moved || 0) + 1;
    audio.play('place'); ui.toast(`${e.sp.name} ${gw(e.sp.id, 'הועבר', 'הועברה', 'הועברו', 'הועברו')} למקום החדש.`, 'good');
    return true;
  }

  // canvas pointer: hover & click-select
  ctx.down = null; ctx.lastMove = null;
  const onDown = (e) => { ctx.down = { x: e.clientX, y: e.clientY, t: performance.now() }; audio.start(); };
  const onUp = (e) => {
    if (!ctx.down) return; const moved = Math.hypot(e.clientX - ctx.down.x, e.clientY - ctx.down.y); const dt = performance.now() - ctx.down.t; ctx.down = null;
    if (moved > 6 || dt > 600 || ctx.dragState || W.viewMode) return;
    if (ctx.moving) { endMove(groundHit(e.clientX, e.clientY)); return; }
    const cam = ctx.fieldcam && ctx.fieldcam.pickAt(e.clientX, e.clientY);   // a placed field camera: look through it
    if (cam) { ctx.fieldcam.open(cam); return; }
    const hit = pick(e.clientX, e.clientY);
    if (hit) { select(hit); markers.burst(hit.focusPoint(_v), '#fff2b0', 8, { size: 0.3, speed: 1 }); }
    else {
      select(null); rig.stopFollow();
      const g = W.road && !W.road.bridge ? groundHit(e.clientX, e.clientY) : null;
      if (g && W.onRoad(g.x, g.z, 1)) offerRoadFix();
    }
  };
  const onMove = (e) => {
    ctx.lastMove = { x: e.clientX, y: e.clientY };
    if (ctx.moving) {
      const hit = groundHit(e.clientX, e.clientY), chk = checkMove(ctx.moving.e, hit);
      markers.showGhost(hit ? new THREE.Vector3(hit.x, env.heightAt(hit.x, hit.z), hit.z) : null, chk.ok, ctx.moving.e.isTree ? 2.4 : 1.1, null, 3, chk.warn);
      ui.showHover({ x: e.clientX, y: e.clientY, name: (chk.ok ? '✓ ' : '') + ctx.moving.e.sp.name, sub: chk.ok ? chk.text : chk.reason }); canvas.style.cursor = chk.ok ? 'copy' : 'not-allowed';
    }
  };
  const onMoveKey = (e) => { if (ctx.moving && e.key === 'Escape') { ctx.moving = null; markers.showGhost(null); ui.hideHover(); canvas.style.cursor = ''; ui.toast('ההעברה בוטלה', 'info'); } };
  addEventListener('keydown', onMoveKey);
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointermove', onMove);
  const onLeave = () => { ctx.lastMove = null; ui.hideHover(); };
  canvas.addEventListener('pointerleave', onLeave);

  // ─────────────────────────────────────────── moving by dragging (1.3.1, Avi: moving plants was too complicated)
  // A selected plant: press on it and drag, or drag the "גררו כדי להזיז" handle under it (mouse and touch). A device that
  // stands on the ground (a field camera, a nursery, a water generator...): press on it and drag. While dragging, the
  // thing itself follows the pointer a little above the ground, with the green / red ring and a line that says why not.
  // The orbit camera stays still meanwhile. The old way (the card's "להעביר למקום אחר", then a click) still works.
  const mvHandle = document.createElement('button');
  mvHandle.type = 'button'; mvHandle.className = 'mv-handle'; mvHandle.hidden = true;
  mvHandle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor"><circle cx="9" cy="6" r="1.9"/><circle cx="15" cy="6" r="1.9"/><circle cx="9" cy="12" r="1.9"/><circle cx="15" cy="12" r="1.9"/><circle cx="9" cy="18" r="1.9"/><circle cx="15" cy="18" r="1.9"/></g></svg><span>גררו כדי להזיז</span>';
  mvHandle.setAttribute('aria-label', 'גררו כדי להזיז למקום אחר');
  document.getElementById('ui').appendChild(mvHandle);
  ctx.mv = null;   // { kind: 'plant' | 'device', e, p, pid, x0, y0, started, hit, chk }
  const movable = (e) => !!e && e.isPlant && alive(e) && !e.host && !e.falling && !e.fallen && e.sp.kind !== 'water-plant' && !W.research && !W.experiment;
  const controlsOn = (v) => { if (!W.viewMode) rig.controls.enabled = v; };
  function mvStart() {
    ctx.mv.started = true; ui.hideSpecies(); ui.hideHover(); mvHandle.hidden = true; canvas.style.cursor = 'grabbing';
    audio.play('pickup');
  }
  function mvUpdate(x, y) {
    const hit = groundHit(x, y);
    const chk = ctx.mv.kind === 'plant' ? checkMove(ctx.mv.e, hit) : ctx.tools.checkDeviceMove(ctx.mv.p, hit);
    ctx.mv.hit = hit; ctx.mv.chk = chk;
    if (hit) {
      markers.showGhost(new THREE.Vector3(hit.x, env.heightAt(hit.x, hit.z), hit.z), chk.ok, ctx.mv.kind === 'plant' && ctx.mv.e.isTree ? 2.4 : 1.1, null, 3, chk.warn);
      if (ctx.mv.kind === 'plant') ctx.mv.e.obj.position.set(hit.x, env.heightAt(hit.x, hit.z) + 0.35, hit.z);
      else ctx.tools.placeDeviceAt(ctx.mv.p, hit.x, hit.z, false, 0.35);
    } else markers.showGhost(null);
    const name = ctx.mv.kind === 'plant' ? ctx.mv.e.sp.name : (toolDef(ctx.mv.p.id, W.biomeId)?.name || '');
    ui.showHover({ x, y, name: (chk.ok ? '✓ ' : '') + name, sub: chk.ok ? (ctx.mv.kind === 'plant' ? chk.text.replace('לחצו כדי להעביר', 'שחררו כדי להעביר') : chk.text) : chk.reason });
  }
  function mvEnd(cancel) {
    const m = ctx.mv; ctx.mv = null; controlsOn(true);
    markers.showGhost(null); ui.hideHover(); canvas.style.cursor = '';
    if (!m || !m.started) return;
    if (m.kind === 'plant') {
      const e = m.e, ok = !cancel && m.hit && m.chk && m.chk.ok && commitMove(e, m.hit);
      if (!ok && alive(e)) { e.obj.position.set(e.x, e.y, e.z); if (!cancel && m.chk && !m.chk.ok) { audio.play('invalid'); ui.toast(m.chk.reason, 'warn'); } }
      if (alive(e)) select(e);
    } else {
      const p = m.p;
      if (!cancel && m.hit && m.chk && m.chk.ok) { ctx.tools.placeDeviceAt(p, m.hit.x, m.hit.z, true); audio.play('place'); markers.burst(_v.set(p.x, env.heightAt(p.x, p.z) + 1, p.z), '#b8f08a', 14, { size: 0.4 }); }
      else { ctx.tools.placeDeviceAt(p, p.x, p.z, false); if (!cancel && m.chk && !m.chk.ok) { audio.play('invalid'); ui.toast(m.chk.reason, 'warn'); } }
    }
  }
  const mvPress = (e, kind, target, from) => { ctx.mv = { kind, e: kind === 'plant' ? target : null, p: kind === 'device' ? target : null, pid: e.pointerId, x0: e.clientX, y0: e.clientY, started: false, from }; controlsOn(false); };
  mvHandle.addEventListener('pointerdown', (e) => {
    if (e.button > 0 || ctx.mv || !movable(W.selected)) return;
    e.preventDefault(); e.stopPropagation();
    try { mvHandle.setPointerCapture(e.pointerId); } catch (err) { }
    mvPress(e, 'plant', W.selected, 'handle'); mvStart(); mvUpdate(e.clientX, e.clientY);
  });
  mvHandle.addEventListener('click', (e) => e.preventDefault());
  // capture phase: decide before the orbit controls see the press
  const onMvDown = (e) => {
    if (ctx.mv || e.target !== canvas || e.button > 0 || W.viewMode || ctx.dragState || ctx.moving || W.research) return;
    const dv = ctx.tools && ctx.tools.pickDevice(e.clientX, e.clientY, canvas.getBoundingClientRect());
    if (dv) { mvPress(e, 'device', dv, 'press'); return; }
    if (movable(W.selected) && pick(e.clientX, e.clientY, { animals: false }) === W.selected) mvPress(e, 'plant', W.selected, 'press');
  };
  const onMvMove = (e) => {
    if (!ctx.mv || e.pointerId !== ctx.mv.pid) return;
    if (!ctx.mv.started) { if (Math.hypot(e.clientX - ctx.mv.x0, e.clientY - ctx.mv.y0) < 8) return; mvStart(); }
    mvUpdate(e.clientX, e.clientY);
  };
  const onMvUp = (e) => { if (ctx.mv && e.pointerId === ctx.mv.pid) mvEnd(e.type === 'pointercancel'); };
  const onMvKey = (e) => { if (ctx.mv && ctx.mv.started && e.key === 'Escape') { mvEnd(true); ui.toast('ההזזה בוטלה', 'info'); } };
  addEventListener('pointerdown', onMvDown, true); addEventListener('pointermove', onMvMove); addEventListener('pointerup', onMvUp); addEventListener('pointercancel', onMvUp); addEventListener('keydown', onMvKey);
  // the handle sits under the selected plant (projected every frame)
  const _hp = new THREE.Vector3();
  function placeMoveHandle() {
    const e = W.selected;
    const show = movable(e) && !W.viewMode && !ctx.mv && !ctx.dragState && !ctx.moving && !ui.isModalOpen();
    if (!show) { if (!mvHandle.hidden) mvHandle.hidden = true; return; }
    _hp.set(e.x, e.y, e.z).project(camera);
    if (_hp.z > 1 || Math.abs(_hp.x) > 1.05 || Math.abs(_hp.y) > 1.05) { mvHandle.hidden = true; return; }
    const r = canvas.getBoundingClientRect();
    const x = (_hp.x + 1) / 2 * r.width + r.left, sy = (1 - _hp.y) / 2 * r.height + r.top;
    const tr = document.querySelector('#ui .tray'), trTop = tr && !tr.classList.contains('collapsed') ? tr.getBoundingClientRect().top : r.bottom;
    const y = sy + 18 + 46 > trTop ? Math.max(r.top + 70, sy - 64) : sy + 18;   // near the tray: above the plant instead of under it
    mvHandle.hidden = false;
    mvHandle.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, 0)`;
  }
  return { startMove, onDown, onUp, onMove, onMoveKey, onLeave, mvHandle, onMvDown, onMvMove, onMvUp, onMvKey,
    placeMoveHandle };
}
