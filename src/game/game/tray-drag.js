// Drag and drop from the tray: a species, a technology tool or a strong coral from the nursery follows the pointer as
// a preview model with the green / red ring and a hint; dropping it places it (or says why not). Owns ctx.dragState.
// Gives ctx: dragStart, dragMove, disposeDragModel, dragEnd.
// Takes from ctx: the names destructured at the top of createTrayDrag;
// functions of later parts through late(): refreshTray.
// Shared state it reads or changes: ctx.dragState, ctx.tools, ctx.moments.
import * as THREE from 'three';
import { toolDef, disposeObject } from '../tools.js';
import { makeRng } from '../../core/util.js';
import { zoneWord } from '../../core/place.js';
import { late } from './common.js';

export function createTrayDrag(ctx) {
  const { markers, audio, W, reg, env, plantBuilders, animalBuilders, groundHit, checkPlace, ui, transplant, place,
    showPanel } = ctx;
  const refreshTray = late(ctx, 'refreshTray');   // made by a later part

  // ─────────────────────────────────────────── drag & drop from the tray
  ctx.dragState = null;
  function dragStart({ id, x, y }) {
    if (ctx.dragState) { const old = ctx.dragState; ctx.dragState = null; markers.showGhost(null); disposeDragModel(old); }
    if (id.startsWith('tool:')) {
      const tid = id.slice(5); audio.play('pickup');
      ctx.dragState = { tool: tid, sp: { id, name: toolDef(tid, W.biomeId)?.name, isPlant: false }, model: ctx.tools.model(tid, W.biomeId) };
      dragMove({ id, x, y }); return;
    }
    const nursery = id.startsWith('nursery:');
    const sp = reg.byId.get(nursery ? id.slice(8) : id); if (!sp) return;
    audio.play('pickup');
    if (nursery && W.scars.length) markers.locate(W.scars.slice(), '#ffb0c8', (s, out) => { out.set(s.x, env.heightAt(s.x, s.z), s.z); return 0.3; }, 600);   // where the reef was hurt
    let model = null;
    try {
      if (sp.isPlant) { const v = plantBuilders[id]({ seed: 5, rng: makeRng(5), hostHeight: 8, hostRadius: 0.4 }); v.setGrowth(sp.kind === 'tree' || sp.kind === 'palm' ? 0.22 : 0.7); v.setHealth(1); model = v.object; ctx.dragState = { sp, vis: v }; }
      else { const v = animalBuilders[id]({ seed: 5, rng: makeRng(5) }); if (v.type === 'animal') { v.object.scale.setScalar(1.15 * Math.pow(Math.max(1, 0.9 / (v.length || 1)), 0.6)); v.update(0.016, { action: sp.locomotion === 'flying' ? 'hover' : 'idle', speed: 0, t: 0, night: 0 }); } model = v.object; ctx.dragState = { sp, vis: v }; }
    } catch (e) { ctx.dragState = { sp }; }
    ctx.dragState.model = model; ctx.dragState.nursery = nursery;
    dragMove({ id, x, y });
  }
  function dragMove({ x, y }) {
    if (!ctx.dragState) return;
    const hit = groundHit(x, y);
    const chk = ctx.dragState.tool ? ctx.tools.check(ctx.dragState.tool, hit) : checkPlace(ctx.dragState.sp, hit, { nursery: ctx.dragState.nursery });
    ctx.dragState.hit = hit; ctx.dragState.chk = chk;
    if (ctx.dragState.tool) {
      if (hit) { const pos = chk.host ? new THREE.Vector3(chk.host.x, chk.host.y + 4, chk.host.z) : chk.target ? chk.target.pos.clone() : new THREE.Vector3(hit.x, hit.y, hit.z); markers.showGhost(pos, chk.ok, 1.6, ctx.dragState.model, 3, false); if (ctx.dragState.tool === 'drone' || ctx.dragState.tool === 'seeddrone') ctx.dragState.model.position.y += 3; }
      else markers.showGhost(null);
      ui.setDragHint(hit ? { valid: chk.ok, text: chk.ok ? (chk.text || 'שחררו כדי להציב') : chk.reason } : { valid: false, text: `גררו ${zoneWord('to')}` });
      return;
    }
    if (hit) {
      let pos = new THREE.Vector3(hit.x, chk.host ? env.heightAt(hit.x, hit.z) : hit.y, hit.z);
      if (chk.host) pos.set(chk.host.x, chk.host.y, chk.host.z);
      const r = ctx.dragState.sp.isPlant ? (ctx.dragState.sp.kind === 'tree' ? 2.4 : ctx.dragState.sp.kind === 'palm' ? 1.8 : 1.1) : 1.3;
      markers.showGhost(pos, chk.ok, r, ctx.dragState.model, chk.host ? chk.host.topY() - chk.host.y : 3, chk.warn);
      if (ctx.dragState.model && chk.host && ctx.dragState.sp.kind === 'epiphyte') { const pts = chk.host.vis.attachPoints(); if (pts[0]) { chk.host.obj.updateMatrixWorld(); ctx.dragState.model.position.copy(pts[0].pos).applyMatrix4(chk.host.obj.matrixWorld); } }
      if (ctx.dragState.model && ctx.dragState.sp.locomotion === 'flying') ctx.dragState.model.position.y += 2;
    } else markers.showGhost(null);
    ui.setDragHint(hit ? { valid: chk.ok, text: chk.ok ? (chk.text || 'שחררו כדי למקם') : chk.reason } : { valid: false, text: `גררו ${zoneWord('to')}` });
  }
  // the preview model is ours alone: species visuals know which of their parts are shared caches; tool models are all own
  function disposeDragModel(st) {
    try { if (st.vis?.dispose) st.vis.dispose(); else if (st.tool && st.model) disposeObject(st.model); } catch (e) { }
  }
  function dragEnd({ x, y, cancelled }) {
    if (!ctx.dragState) return;
    const st = ctx.dragState; ctx.dragState = null;
    markers.showGhost(null); ui.setDragHint(null);
    disposeDragModel(st);
    if (st.nursery) markers.locate(null);
    if (cancelled) return;
    const hit = groundHit(x, y);
    if (st.tool) { const c = ctx.tools.check(st.tool, hit); if (!c.ok) { audio.play('invalid'); ui.toast(c.reason, 'warn'); return; } ctx.tools.use(st.tool, hit, c); ctx.moments?.onTool(st.tool); refreshTray(); return; }
    if (st.nursery) { const c = checkPlace(st.sp, hit, { nursery: true }); if (!c.ok) { audio.play('invalid'); ui.toast(c.reason, 'warn'); return; } transplant(st.sp, hit, c); return; }
    const chk = checkPlace(st.sp, hit);
    if (!chk.ok) { audio.play('invalid'); ui.toast(chk.reason, 'warn'); return; }
    place(st.sp, hit, chk); ctx.moments?.onPlace(st.sp);
    if (!W.selected) { showPanel(st.sp.id, true); }
  }
  return { dragStart, dragMove, disposeDragModel, dragEnd };
}
