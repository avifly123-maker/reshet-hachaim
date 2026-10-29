// Saving and loading: the per-player progress (unlocks, missions, links), the whole ecosystem (serialize, saveGame,
// restore), and a new island's few wild things (seedStartingNature).
// Gives ctx: saveProgress, saveGame, restore, seedStartingNature.
// Takes from ctx: the names destructured at the top of createSave.
// Shared state it reads or changes: ctx.tools, ctx.report, ctx.coachStep.
import * as THREE from 'three';
import { zoneKey, saveKey, writePlayer } from '../../core/storage.js';

export function createSave(ctx) {
  const { biome, W, missions, alive, ui, audio, on, addStump, buildRoad, reg, spawnPlant, spawnAnimal, randomPlaceSpot } = ctx;

  // ─────────────────────────────────────────── save / load (localStorage, optional)
  const SAVE_KEY = zoneKey(biome.id);   // per player (core/storage.js)
  function saveProgress() {
    if (W.training) return;   // the training field writes nothing into the grove's progress
    try { writePlayer(SAVE_KEY, { unlocked: [...W.unlocked], done: missions.missions.filter(m => m.done).map(m => m.id), discovered: [...W.discovered], placed: [...W.everPlaced], quiz: [...W.quizDone] }); } catch (e) { }
  }

  // ─────────────────────────────────────────── save / restore the whole ecosystem
  const SAVE_SLOT = saveKey(biome.id, biome.mode === 'kids');   // per player (core/storage.js)
  // entities hidden by a running "what if it disappears?" experiment are still part of the forest
  const hiddenByExperiment = (e) => !!W.experiment && W.experiment.ents.includes(e) && e.alive && !e.dying;
  const keepOnSave = (e) => (alive(e) || hiddenByExperiment(e)) && !(e.isPlant && (e.falling || e.fallen));
  function serialize() {
    const plants = W.plants.filter(keepOnSave);
    const index = new Map(plants.map((p, i) => [p, i]));
    return {
      v: 1, biome: biome.id, savedAt: Date.now(), points: Math.round(W.points), day: W.day, dayFrac: W.dayFrac, season: W.season, simT: W.simT,
      unlocked: [...W.unlocked], discovered: [...W.discovered], everPlaced: [...W.everPlaced], quizDone: [...W.quizDone], seenNew: [...W.seenNew],
      stats: { pollinations: W.stats.pollinations, dispersals: W.stats.dispersals, experiments: W.stats.experiments, births: W.stats.births, toolUse: W.stats.toolUse || {}, seeded: W.stats.seeded || 0, rescues: W.stats.rescues || 0, expSpecies: W.stats.expSpecies || [], uprooted: W.stats.uprooted || 0, moved: W.stats.moved || 0, letGo: W.stats.letGo || 0, transplants: W.stats.transplants || 0, scarsHealed: W.stats.scarsHealed || 0 },
      ...(W.scars.length ? { scars: W.scars } : {}),
      missions: missions.missions.filter(m => m.done).map(m => m.id),
      missionProgress: missions.serializeProgress(),
      events: missions.events.filter(e => e.fired && e.resolved).map(e => ({ id: e.id, r: 1 })),   // fired-but-unanswered events run again after loading
      treeFallen: W.treeFallen, gapPos: W.gapPos ? { x: +W.gapPos.x.toFixed(2), z: +W.gapPos.z.toFixed(2) } : null, protected: W.protected,
      road: W.road ? { a: W.road.a, b: W.road.b, bridge: W.road.bridge } : null,
      stumps: W.stumps.map(t => ({ x: +t.x.toFixed(2), z: +t.z.toFixed(2), r: +t.r.toFixed(2) })),
      plants: plants.map(p => ({ id: p.sp.id, x: +p.x.toFixed(2), z: +p.z.toFixed(2), g: +p.growth.toFixed(3), h: +p.health.toFixed(2), w: p.wild ? 1 : 0, host: p.host ? (index.get(p.host) ?? -1) : -1, ai: p.attachIdx || 0, s: p.seed, b: Math.round(p.bornT ?? -1), ...(p.sownBy ? { a: p.sownBy } : {}), ...(p.strong ? { st: 1 } : {}) })),   // the seed keeps the same shape (and branch spots) after loading
      tools: ctx.tools ? ctx.tools.serialize() : null,
      report: ctx.report ? ctx.report.serialize() : undefined,
      animals: W.animals.filter(a => keepOnSave(a) && !a.leaving && !a.visitor).map(   /* H: a rare visitor is not saved */
        a => ({ id: a.sp.id, x: +a.pos.x.toFixed(2), y: +a.pos.y.toFixed(2), z: +a.pos.z.toFixed(2), e: +a.energy.toFixed(2), g: +a.grow.toFixed(2) })),
    };
  }
  function saveGame(quiet) {
    if (W.research || W.training) return true;   // a mystery and the training field are never saved
    try { if (!writePlayer(SAVE_SLOT, serialize())) throw new Error('not saved'); if (!quiet) { ui.toast('היער נשמר ✓ בפעם הבאה תוכלו להמשיך מכאן', 'good'); audio.play('points'); } return true; }
    catch (e) { if (!quiet) ui.toast('לא הצלחתי לשמור במחשב הזה', 'bad'); return false; }
  }
  W.saveGame = saveGame;
  on('ui:save', () => saveGame(false));
  on('ui:report', () => ctx.report?.open());
  function restore(S) {
    W.points = S.points ?? W.points; W.day = S.day || 1; W.dayFrac = S.dayFrac ?? 0.3; W.season = S.season ?? W.season; W.simT = S.simT || 0;
    for (const id of S.unlocked || []) W.unlocked.add(id);
    for (const k of S.discovered || []) W.discovered.add(k);
    for (const id of S.everPlaced || []) W.everPlaced.add(id);
    for (const id of S.quizDone || []) W.quizDone.add(id);
    for (const id of S.seenNew || []) W.seenNew.add(id);
    Object.assign(W.stats, S.stats || {});
    missions.restoreProgress(S.missionProgress);
    for (const m of missions.missions) if ((S.missions || []).includes(m.id)) { m.done = true; m.started = true; }
    // only answered events stay done; an event that fired but was never answered (old saves) is queued again
    const doneIds = new Set(missions.missions.filter(m => m.done).map(m => m.id));
    for (const e of missions.events) {
      const r = (S.events || []).find(x => x.id === e.id);
      if (r && r.r) { e.fired = true; e.resolved = true; continue; }
      e.fired = false; e.resolved = false;
      if (e.trigger.type === 'mission' && doneIds.has(e.trigger.id)) missions.fire(e, 8);   // its mission will not start again, so queue it now
    }
    W.scars = Array.isArray(S.scars) ? S.scars.filter(s => s && isFinite(s.x) && isFinite(s.z)).slice(-6) : [];
    W.treeFallen = !!S.treeFallen; W.protected = !!S.protected;
    W.gapPos = S.gapPos && isFinite(S.gapPos.x) && isFinite(S.gapPos.z) ? { x: S.gapPos.x, z: S.gapPos.z } : null;
    for (const t of S.stumps || []) addStump(t.x, t.z, t.r);
    if (S.road) buildRoad(S.road);
    const made = [];
    const order = (S.plants || []).map((p, i) => [p, i]).sort((a, b) => (a[0].host >= 0) - (b[0].host >= 0));
    for (const [p, i] of order) {
      const sp = reg.byId.get(p.id); if (!sp) continue;
      const host = p.host >= 0 ? made[p.host] : null;
      if (p.host >= 0 && !host) continue;
      const opts = { growth: p.g, host, attachIdx: p.ai, restore: true }; if (Number.isFinite(p.s)) opts.seed = p.s;
      const e = spawnPlant(sp, p.x, p.z, opts);
      if (e) { e.health = p.h ?? 1; e.wild = !!p.w; e.pop = 1; e.bornT = Number.isFinite(p.b) ? p.b : -1; if (p.a) e.sownBy = p.a; if (p.st) e.strong = true; made[i] = e; }   // saves before 1.3: born "long ago"
    }
    for (const a of S.animals || []) {
      const sp = reg.byId.get(a.id); if (!sp) continue;
      const e = spawnAnimal(sp, new THREE.Vector3(a.x, a.y, a.z), { restore: true });
      if (e) { e.energy = a.e ?? 0.8; e.grow = a.g ?? 1; }
    }
    W._toolSave = S.tools;
    W.missionsOn = true; ctx.coachStep = -1;
    W.restored = true;
  }

  function seedStartingNature() {
    const sp = (id) => reg.byId.get(id);
    const put = (id, growth, n = 1) => { const s = sp(id); if (!s) return; for (let i = 0; i < n; i++) { const p = randomPlaceSpot(s); if (p) { const e = spawnPlant(s, p.x, p.z, { growth: Math.min(1, growth * (0.85 + Math.random() * 0.3)) }); if (e) { e.wild = true; e.pop = 1; } } } W.everPlaced.add(id); };
    // 1.3.3 (29.10, Avi: "each environment starts a little emptier, without trees already in it – not bare, designed,
    // with a few things to begin with"): one landmark, some low plants on the ground; the child plants the rest.
    // (before: amazon kapok 1, fig 5, cecropia 2, acai 4, fern 8; grove oak 4, carob 2, pine 1, mastic 5, sage 3,
    // buckthorn 2; reef branching 4, softcoral 3, sponge 3, seagrass 6, anemone 1, brain 2; beginners 3 of each tree and shrub)
    if (W.kids) { for (const s2 of biome.species) { if (s2.kind === 'shrub' || s2.kind === 'coral') put(s2.id, 1, 1); } const t = biome.species.find((s2) => s2.kind === 'tree' || s2.kind === 'palm'); if (t) put(t.id, 0.95, 1); return; }
    if (biome.id === 'amazon') { put('kapok', 1, 1); put('fern', 1, 5); put('acai', 0.9, 1); }
    else if (biome.id === 'reef') { put('branching', 1, 2); put('seagrass', 1, 4); put('sponge', 1, 1); put('brain', 1, 1); }
    else { put('oak', 0.95, 1); put('mastic', 1, 2); put('sage', 1, 2); }
  }
  return { saveProgress, saveGame, restore, seedStartingNature };
}
