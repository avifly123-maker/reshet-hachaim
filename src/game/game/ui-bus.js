// The UI bus wiring: the tray's drag and cards, speed, the species card (select, follow, "where are they?",
// experiment, uproot, move, tour, reveal a link, quiz), events, the layer view (setView), the light map and web
// toggles, the journal, help and coach buttons, "מה עושים עכשיו?", the injured-animal bar, home. Later parts add
// their own handlers through on (all are removed by dispose through offs).
// Gives ctx: offs, on, setView, openJournal.
// Takes from ctx: the names destructured at the top of createUiBus;
// functions of later parts through late(): startMove, showHowto, startCoach, coachNext.
// Shared state it reads or changes: ctx.panelId, ctx.tour, ctx.roboEvent, ctx.disposed, ctx.shafts, ctx.webMode,
// ctx.coachStep.
import * as THREE from 'three';
import { CARD_ART } from '../../data/card-art.js';
import { toolDef } from '../tools.js';
import { K, writePlayerRaw } from '../../core/storage.js';
import { zoneWord } from '../../core/place.js';
import { late } from './common.js';

export function createUiBus(ctx) {
  const { bus, dragStart, dragMove, dragEnd, audio, reg, W, ui, refreshTray, showPanel, nearestOf, rig, select,
    rebuildLinks, alive, markers, env, missions, startExperiment, uproot, endExperiment, refreshPanel, chooseEvent,
    robo, biome, light, roboSay, onExit, thumbs } = ctx;
  const startMove = late(ctx, 'startMove'), showHowto = late(ctx, 'showHowto'), startCoach = late(ctx, 'startCoach'),
    coachNext = late(ctx, 'coachNext');   // made by a later part

  // ─────────────────────────────────────────── UI bus wiring
  const offs = [];
  const on = (n, f) => offs.push(bus.on(n, f));
  on('drag:start', dragStart); on('drag:move', dragMove); on('drag:end', dragEnd);
  on('drag:denied', ({ id, reason }) => { audio.play('invalid'); const sp = reg.byId.get(id) || toolDef(String(id).replace(/^tool:/, ''), W.biomeId); ui.toast(reason === 'locked' ? `${sp?.name} עוד נעול – השלימו משימות כדי לפתוח` : reason === 'cost' ? `צריך ${sp?.cost} נקודות חיים` : 'אי אפשר עכשיו', 'warn'); });
  on('card:click', ({ id }) => {
    if (id.startsWith('nursery:')) {
      const sp = reg.byId.get(id.slice(8)); W.nurseryNew = 0; refreshTray();
      ui.showDialog({ title: `${sp.name} חזק מהמשתלה`, text: `במשתלה גדלים שברים של אלמוגים שעמדו בגל חום. אלמוג כזה מלבין פחות כשהמים מתחממים, והוא כבר גדול כשהוא יוצא מהמשתלה.\n\nגררו אותו מהמגש אל השונית. הכי טוב לשתול אותו במקום שבו אלמוג נשבר או נחלש: שם השונית צריכה עזרה. בזמן הגרירה המקומות האלה מסומנים.\n\nאלמוג חזק מגיע רק מהמשתלה.`, buttons: [{ id: 'ok', label: 'הבנתי' }] });
      return;
    }
    if (id.startsWith('tool:')) { const d = toolDef(id.slice(5), W.biomeId); if (d) ui.showDialog({ title: d.name, text: d.fact + '\n\n' + d.hint + `\nמחיר: ${d.cost} נקודות חיים.`, buttons: [{ id: 'ok', label: 'הבנתי' }] }); return; } W.seenNew.add(id); showPanel(id, true); audio.play('click'); refreshTray(); });
  on('time:speed', ({ speed }) => { if (!W.experiment) W.speed = speed; });
  on('species:select', ({ id }) => { const e = nearestOf(id, rig.controls.target); if (e) { select(e); rig.focusOn(e.focusPoint(new THREE.Vector3()), e.isPlant && e.isTree ? 30 : 12); } else showPanel(id, true); });
  on('species:close', () => { select(null); ctx.panelId = null; });
  on('species:follow', ({ id }) => { const e = (W.selected && W.selected.sp.id === id) ? W.selected : nearestOf(id, rig.controls.target); if (e) { const size = e.isPlant ? Math.max(6, (e.topY() - e.y) * 1.4) : Math.max(5, (e.vis.length || 1) * e.obj.scale.x * 5); rig.followEntity(e, size); W.selected = e; rebuildLinks(); } });
  // "where are they?": soft beacons over every individual of the species for a few seconds, and the camera backs off
  // far enough to see all of them
  const _lp = new THREE.Vector3();
  on('species:locate', ({ id }) => {
    const sp = reg.byId.get(id); if (!sp) return;
    const list = (sp.isPlant ? W.plants : W.animals).filter(e => e.sp.id === id && alive(e) && !e.leaving);
    if (!list.length) { markers.locate(null); ui.toast(`אין עכשיו ${sp.name} ${zoneWord('in')}.`, 'info'); return; }
    markers.locate(list, '#ffd84a', (e, v) => {
      if (!alive(e) || e.leaving) return null;
      const f = e.focusPoint(_lp), gy = env.heightAt(f.x, f.z); v.set(f.x, gy, f.z);
      return e.isPlant && e.topY ? Math.max(1, e.topY() - gy) : Math.max(1, f.y - gy + 0.8);
    });
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const e of list) { const f = e.focusPoint(_lp); x0 = Math.min(x0, f.x); x1 = Math.max(x1, f.x); z0 = Math.min(z0, f.z); z1 = Math.max(z1, f.z); }
    const spread = Math.max(x1 - x0, z1 - z0);
    rig.focusOn(new THREE.Vector3((x0 + x1) / 2, 2, (z0 + z1) / 2), list.length === 1 ? 16 : Math.min(95, Math.max(22, spread * 1.5 + 14)));
    audio.play('click');
    ui.toast(`${sp.name} ${zoneWord('in')}: ${list.length}. ${list.length === 1 ? 'המקום מסומן' : 'המקומות מסומנים'} באור.`, 'info');
  });
  on('missions:history', () => ui.showDoneMissions(missions.doneList()));
  on('species:experiment', ({ id }) => startExperiment(id));
  on('species:uproot', () => uproot(W.selected));
  on('species:move', () => startMove(W.selected));
  on('species:tour', ({ id }) => { if (ctx.tour) ctx.tour.start(id); });
  on('experiment:end', () => endExperiment());
  on('relation:reveal', ({ from, to, type }) => {
    const r = reg.panelRelations(from).find(x => x.targetId === to && x.type === type);
    if (!r) return;
    const otherPresent = W.countAlive(to) > 0, selfPresent = W.countAlive(from) > 0;
    if (!selfPresent || !otherPresent) { ui.toast(`כדי לגלות את הקשר, הביאו ${zoneWord('lamed')} גם את ${reg.byId.get(selfPresent ? to : from)?.name}.`, 'info'); return; }
    const A = nearestOf(from, rig.controls.target), B = nearestOf(to, rig.controls.target);
    const [f, t] = r.dir === 'out' ? [A, B] : [B, A];
    if (f && t) { W._revealing = true; try { W.observe(f, t, type); } finally { W._revealing = false; } }
  });
  on('quiz:answer', ({ id, correct }) => { if (correct && !W.quizDone.has(id)) { W.quizDone.add(id); W.points += 5; audio.play('quizRight'); } else if (!correct) audio.play('quizWrong'); refreshPanel(); });
  on('event:choice', chooseEvent);
  on('outcome:close', () => { audio.play('click'); if (ctx.roboEvent) { const k = ctx.roboEvent; ctx.roboEvent = null; setTimeout(() => { if (!ctx.disposed) robo(k); }, 400); } });
  on('view:layer', ({ id }) => { setView(id); audio.play('click'); });
  function setView(id) {
    const L = biome.layers.find(l => l.id === id);
    const blocked = (x, z) => {
      if (Math.hypot(x, z) > env.radius - 1 || env.isWater(x, z)) return true;
      for (const p of W.plants) { if (!alive(p)) continue; const r = p.isTree ? (p.vis.trunkRadius || 0.5) * 2.5 + 1.6 : p.sp.kind === 'shrub' ? 1.4 : 0; if (r && Math.hypot(p.x - x, p.z - z) < r) return true; }
      return W.nearRock(x, z, 1.2);
    };
    let target = null, camAt = null;
    if (id === 'floor' || id === 'understory') {
      if (ctx.shafts.length) {
        target = { x: ctx.shafts[0].gx, z: ctx.shafts[0].gz };
        const near = W.plants.filter(p => alive(p) && p.isTree && p.growth > 0.6).map(p => ({ p, d: Math.hypot(p.x - target.x, p.z - target.z) })).filter(o => o.d > 7 && o.d < 22).sort((a, b) => a.d - b.d)[0];
        if (near) { const a = Math.atan2(target.z - near.p.z, target.x - near.p.x); const off = (near.p.vis.trunkRadius || 0.6) * 3 + 4.5; camAt = { x: near.p.x + Math.cos(a) * off, z: near.p.z + Math.sin(a) * off }; if (blocked(camAt.x, camAt.z)) camAt = null; }
      }
      else { const trees = W.plants.filter(p => alive(p) && p.isTree && p.growth > 0.6).sort((a, b) => b.topY() - a.topY()); if (trees[0]) target = { x: trees[0].x + 4, z: trees[0].z + 4 }; }
    }
    rig.setLayer(id === 'all' ? 'all' : id, L?.yRange, { target, blocked, camAt: id === 'floor' ? camAt : null });
  }
  on('view:reset', () => rig.reset());
  on('toggle:lightmap', ({ on: v }) => { W.lightmap = v; env.setLightOverlay(v ? light.texture : null); if (v) ui.toast('מפת האור: צהוב = הרבה אור · כחול = צל עמוק', 'info'); });
  on('toggle:web', ({ on: v }) => { ctx.webMode = v; rebuildLinks(); if (v) ui.toast('כל הקווים הזוהרים הם קשרים ברשת החיים', 'info'); });
  on('journal:select', ({ id }) => { ui.hideJournal(); showPanel(id, true); });
  on('ui:journal', () => openJournal());
  on('ui:help', () => showHowto(true));
  on('ui:coach', () => { if (W.xp) robo('zone:' + biome.id, { tip: false, force: true }); else startCoach(true); });
  // "מה עושים עכשיו?" next to the missions: רובו־דע answers in one bubble with the current mission's how-to
  on('mission:whatnow', () => {
    if (W.research) return;
    const c = missions.list().find(m => !m.done && !m.locked);   // also in the first seconds, before the missions panel opens
    if (!c) { robo('zone:alldone', { key: null, force: true }); return; }
    const how = String(c.how || '').replace(/^איך עושים:\s*/, '');
    const f = W.kids ? c.text : `${c.title}: ${how || c.text}`;
    // beginners read full nikud: the mission's own k line (src/data/kids.js), else a general vocalised line
    const k = W.kids ? (c.k || 'הִסְתַּכְּלוּ בַּמְּשִׂימָה לְמַעְלָה, וְנַסּוּ לַעֲשׂוֹת אוֹתָהּ.') : f;
    roboSay(f, k, { ms: 16000, force: true, at: '#ui .missions' });
  });
  // the red bar of an injured animal: fly to it (the rescue robot's card in the tray pulses, ui.js)
  on('injured:focus', ({ uid }) => {
    const a = W.animals.find(x => x.injured && x.injured.uid === uid && alive(x)); if (!a) return;
    rig.stopFollow(); rig.focusOn(a.focusPoint(new THREE.Vector3()), 20); audio.play('click');
  });
  on('coach:next', () => coachNext()); on('coach:skip', () => { ctx.coachStep = -1; ui.hideCoach(); writePlayerRaw(K.coach, '1'); });
  on('dialog:button', () => { });
  on('ui:home', () => { onExit && onExit(); });

  function openJournal() {
    const sp = biome.species.map(s => {
      const rels = reg.panelRelations(s.id);
      return { id: s.id, name: s.name, thumb: thumbs[s.id], art: CARD_ART[s.id] || null, color: s.color, discovered: W.everPlaced.has(s.id), fact: s.fact, relationsFound: rels.filter(r => W.discovered.has(r.key)).length, relationsTotal: rels.length };
    });
    ui.showJournal({ species: sp, stats: { discovered: W.everPlaced.size, total: biome.species.length, relationsFound: W.discovered.size, relationsTotal: reg.edges.length } });
  }
  return { offs, on, setView, openJournal };
}
