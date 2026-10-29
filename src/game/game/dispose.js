// Leaving the forest: close what is open, bring back an experiment's species, save, remove every listener, dispose
// the entities, the environment and the tools. Owns ctx.disposed.
// Gives ctx: dispose.
// Takes from ctx: the names destructured at the top of createDispose.
// Shared state it reads or changes: ctx.disposed, ctx.after, ctx.howtoBox, ctx.session, ctx.report, ctx.dragState,
// ctx.pendingEvent, ctx.tour, ctx.fieldcam, ctx.imv, ctx.moments, ctx.tools, ctx.roadMesh, ctx.bridgeMesh.
import { disposeObject } from '../tools.js';
import { setGamepadRig } from '../../ui/gamepad.js';

export function createDispose(ctx) {
  const { W, restoreExperimentEntities, saveGame, markers, ui, disposeDragModel, offs, ptsEl, explainPoints,
    onMoveKey, onMvDown, onMvMove, onMvUp, onMvKey, mvHandle, canvas, onDown, onUp, onMove, onLeave, light, links,
    rig, env, camPad, impactGroup, barkMat, cutMat, onJourney } = ctx;

  ctx.disposed = false;
  function dispose() {
    ctx.disposed = true;
    if (ctx.training) { try { ctx.training.stop(); } catch (e) { console.error(e); } ctx.training = null; }   // the training field's steps (1.3.3)
    if (ctx.after) { try { ctx.after.dispose(); } catch (e) { console.error(e); } ctx.after = null; W.after = null; }   /* H: before the entities go (its snapshot reads them) */
    if (ctx.howtoBox) { const b = ctx.howtoBox; ctx.howtoBox = null; try { b.close(); } catch (e) { } }
    if (ctx.session) { ctx.session.dispose(); ctx.session = null; }
    if (ctx.report) { ctx.report.dispose(); }   // closes the report screen and keeps the child's note before the last save
    // leaving mid-experiment: bring the species back first, so nothing is lost and the banner does not stay on screen
    if (W.experiment) { restoreExperimentEntities(); W._saveAfterExperiment = false; }
    saveGame(true);
    if (ctx.dragState) { const st = ctx.dragState; ctx.dragState = null; markers.showGhost(null); ui.setDragHint(null); disposeDragModel(st); }
    ui.setExperiment({ active: false });
    ui.hideEvent?.(); ui.hideOutcome?.(); ui.hideDialog?.(); ui.hideHover?.(); ui.hideJournal?.();
    ctx.pendingEvent = null;
    for (const o of offs) o();
    if (ptsEl) ptsEl.removeEventListener('click', explainPoints);
    removeEventListener('keydown', onMoveKey);
    removeEventListener('pointerdown', onMvDown, true); removeEventListener('pointermove', onMvMove); removeEventListener('pointerup', onMvUp); removeEventListener('pointercancel', onMvUp); removeEventListener('keydown', onMvKey); mvHandle.remove();
    canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerleave', onLeave);
    for (const e of [...W.plants, ...W.animals]) { if (e.obj.parent) e.obj.parent.remove(e.obj); try { e.vis.dispose(); } catch (err) { } }
    W.plants = []; W.animals = [];
    for (const v of W.warm || []) { try { v.dispose(); } catch (err) { } }
    W.warm = null;
    try { light.texture.dispose(); } catch (err) { }
    ctx.tour.dispose(); ctx.fieldcam.dispose(); ctx.imv.dispose(); ctx.moments?.dispose();
    links.dispose(); markers.dispose(); rig.controls.dispose(); env.dispose(); ctx.tools.dispose(); camPad.dispose(); setGamepadRig(null);
    disposeObject(impactGroup); barkMat.dispose(); cutMat.dispose(); W.stumps = []; ctx.roadMesh = null; ctx.bridgeMesh = null;
    ui.hideSpecies(); ui.hideCoach();
    removeEventListener('wol-journey', onJourney); ui.setInjured([]); ui.setHurtArrows([]); ui.setPlayMode(null);
    if (window.__game === W) window.__game = null;   // the test hook must not keep the closed island in memory
  }
  return { dispose };
}
