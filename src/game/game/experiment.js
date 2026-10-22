// The experiment "what if it disappears?": a species is hidden for 40 seconds at triple speed, the links that broke
// are drawn in red, and at the end a dialog tells who lost what.
// Gives ctx: startExperiment, restoreExperimentEntities, endExperiment.
// Takes from ctx: the names destructured at the top of createExperiment;
// functions of later parts through late(): saveGame.
// Shared state it reads or changes: ctx.lightDirty.
import * as THREE from 'three';
import { gw } from '../../data/common.js';
import { zoneWord } from '../../core/place.js';
import { late } from './common.js';

export function createExperiment(ctx) {
  const { W, reg, alive, ui, nearestOf, markers, audio, rebuildLinks } = ctx;
  const saveGame = late(ctx, 'saveGame');   // made by a later part

  // ─────────────────────────────────────────── experiment ("what if it disappears?")
  function startExperiment(id) {
    if (W.research) return;   // a mystery has its own experiments (its ideas); taking a species away would break its numbers
    const sp = reg.byId.get(id);
    const ents = [...W.plants.filter(p => p.sp.id === id && alive(p)), ...W.animals.filter(a => a.sp.id === id && alive(a) && !a.leaving)];
    if (!ents.length) { ui.toast(`אין ${sp.name} ${zoneWord('in')} – אין מה לבדוק.`, 'warn'); return; }
    // dependents and their state before
    const deps = [];
    for (const e of reg.edges) {
      if (e.to === id && e.from !== id && W.countAlive(e.from)) deps.push({ id: e.from, type: e.type, rel: 'needs' });
      if (e.from === id && e.type !== 'eats' && W.countAlive(e.to)) deps.push({ id: e.to, type: e.type, rel: 'helped' });
    }
    const ghosts = [];
    for (const d of deps) {
      const other = nearestOf(d.id, ents[0].isPlant ? new THREE.Vector3(ents[0].x, ents[0].y, ents[0].z) : ents[0].pos);
      if (other) ghosts.push({ a: ents[0].focusPoint(new THREE.Vector3()), b: other.focusPoint(new THREE.Vector3()), color: new THREE.Color('#ff5a4a'), broken: true, width: 0.14 });
    }
    for (const e of ents) { e.removed = true; e.obj.visible = false; }
    W.experiment = { id, sp, ents, deps, ghosts, t: 0, dur: 40, energy0: avgEnergyOf(deps.map(d => d.id)) };
    ctx.lightDirty = true;
    W.prevSpeed = W.speed; W.speed = 3;
    ui.setExperiment({ active: true, name: sp.name, secondsLeft: 40 });
    ui.hideSpecies(); markers.select(null);
    audio.play('remove');
    rebuildLinks();
  }
  function avgEnergyOf(ids) { const as = W.animals.filter(a => ids.includes(a.sp.id) && alive(a)); return as.length ? as.reduce((s, a) => s + a.energy, 0) / as.length : null; }
  // bring the hidden species back (used when the experiment ends, and when leaving the game mid-experiment)
  function restoreExperimentEntities() {
    const X = W.experiment; if (!X) return null;
    for (const e of X.ents) { if (e.alive) { e.removed = false; e.obj.visible = true; } }
    W.experiment = null; W.speed = W.prevSpeed || 1; ctx.lightDirty = true;
    ui.setExperiment({ active: false });
    return X;
  }
  function endExperiment() {
    const X = restoreExperimentEntities(); if (!X) return;
    W.stats.experiments++;
    // points only for the first full experiment on each species (no farming by repeating it)
    const expDone = W.stats.expSpecies || (W.stats.expSpecies = []);
    const reward = !expDone.includes(X.id) && X.t >= X.dur * 0.5;
    if (reward) { expDone.push(X.id); W.points += 10; }
    const lines = [];
    const typeLine = { eats: (n) => `${n} איבד מקור מזון`, pollinates: (n) => `${n} – אף אחד לא העביר אבקה לפרחים שלו`, disperses: (n) => `${n} – אף אחד לא הפיץ את הזרעים שלו`, home: (n) => `${n} איבד בית`, shelter: (n) => `${n} איבד מחסה`, climbs: (n) => `${n} איבד את העץ שתומך בו`, decomposes: (n) => `${n} – העלים המתים לא התפרקו`, partner: (n) => `${n} איבד שותף` };
    const bySp = new Map();
    for (const d of X.deps) { if (!bySp.has(d.id)) bySp.set(d.id, []); bySp.get(d.id).push(d); }
    const why = { eats: 'מקור מזון', pollinates: 'מישהו שמעביר אבקה בין הפרחים', disperses: 'מישהו שמפיץ את הזרעים', home: 'בית', shelter: 'מחסה', climbs: 'עץ שתומך בו', decomposes: 'מישהו שמפרק עלים מתים', partner: 'שותף' };
    for (const [sid, ds] of bySp) {
      const n = reg.byId.get(sid)?.name;
      const needs = ds.filter(d => d.rel === 'needs');
      const helped = ds.filter(d => d.rel === 'helped');
      if (needs.some(d => d.type === 'eats')) lines.push(`• ${n} איבד מקור מזון`);
      else if (needs.length) lines.push(`• ${n} איבד ${why[needs[0].type] ? 'את ה' + X.sp.name + ' שהיה ' + (needs[0].type === 'pollinates' ? 'מקור הצוף שלו' : 'חשוב לו') : 'משהו חשוב'}`);
      else if (helped.length) lines.push(`• ${n} איבד ${why[helped[0].type] || 'עזרה'}`);
    }
    const e1 = avgEnergyOf(X.deps.map(d => d.id));
    let txt = lines.length ? `בלי ה${X.sp.name}:\n${lines.join('\n')}` : `נראה שאף מין אחר ${zoneWord('in')} לא היה תלוי ב${X.sp.name} – עדיין. נסו להוסיף מינים שקשורים אליו ולבדוק שוב.`;
    if (X.energy0 != null && e1 != null && e1 < X.energy0 - 0.03) txt += `\n\nהשובע של בעלי החיים התלויים בו ירד מ־${Math.round(X.energy0 * 100)}% ל־${Math.round(e1 * 100)}%.`;
    txt += `\n\nכל מין הוא חוליה ברשת. כשחוליה אחת נעלמת – אחרים מרגישים בזה.`;
    if (reward) txt += `\n\n(+10 נקודות על ניסוי חדש)`;
    if (W._saveAfterExperiment) { W._saveAfterExperiment = false; saveGame(true); }
    ui.showDialog({ title: `תוצאות הניסוי: ${X.sp.name}`, text: txt, buttons: [{ id: 'ok', label: 'הבנתי – ה' + X.sp.name + ' ' + gw(X.sp.id, 'חזר', 'חזרה', 'חזרו', 'חזרו') }] });
    audio.play('discover');
    rebuildLinks();
  }
  return { startExperiment, restoreExperimentEntities, endExperiment };
}
