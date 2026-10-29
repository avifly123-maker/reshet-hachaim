// The world's answers to the entities (food, perches, room, water, rocks, fire, threats) and the ecological events
// they report: a discovered link (W.observe), feeding and pollination, a catch, seed dispersal, self-seeding, a plant
// that matured or died, an animal that leaves, removing an entity, the longest food chain. Sets these on W; tmpLinks
// are the short-lived highlight links.
// Gives ctx: alive, tmpLinks.
// Takes from ctx: the names destructured at the top of createEcology;
// functions of later parts through late(): refreshPanel, findSpotNear, spawnPlant, select.
// Shared state it reads or changes: ctx.dragState, ctx.report, ctx.lightDirty.
import { RELATION_TYPES, gw } from '../../data/common.js';
import { clamp } from '../../core/util.js';
import { zoneWord } from '../../core/place.js';
import { MAX_PLANTS, SMALL_PLANT, MAX_ALL_PLANTS, _v, late } from './common.js';

export function createEcology(ctx) {
  const { W, env, ui, reg, markers, audio, amb, robo } = ctx;
  const refreshPanel = late(ctx, 'refreshPanel'), findSpotNear = late(ctx, 'findSpotNear'),
    spawnPlant = late(ctx, 'spawnPlant'), select = late(ctx, 'select');   // made by a later part

  // ─────────────────────────────────────────── queries used by entities
  const alive = (e) => e.alive && !e.removed && !e.dying;
  // room for one more plant of this kind: small ones only against the total, big ones also against the big-plant cap
  W.plantRoom = (sp) => {
    if (W.plants.length >= MAX_ALL_PLANTS) return false;
    if (SMALL_PLANT.has(sp.kind)) return true;
    let n = 0; for (const p of W.plants) if (!SMALL_PLANT.has(p.sp.kind)) n++;
    return n < MAX_PLANTS;
  };
  W.countAlive = (id) => { let n = 0; for (const p of W.plants) if (p.sp.id === id && alive(p)) n++; for (const a of W.animals) if (a.sp.id === id && alive(a) && !a.leaving && !a.visitor) n++; return n; };   /* H: a rare visitor is a guest, not a resident */
  W.countPlaced = (id) => { let n = 0; for (const p of W.plants) if (p.sp.id === id && alive(p) && !p.wild) n++; for (const a of W.animals) if (a.sp.id === id && alive(a) && !a.leaving && !a.visitor) n++; return n; };   /* H: a rare visitor is not placed */
  W.aliveSpecies = () => { const s = new Set(); for (const p of W.plants) if (alive(p)) s.add(p.sp.id); for (const a of W.animals) if (alive(a) && !a.leaving && !a.visitor) s.add(a.sp.id); return [...s]; };
  W.nearWater = (x, z, r) => {
    if (env.isWater(x, z)) return true;
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; if (env.isWater(x + Math.cos(a) * r, z + Math.sin(a) * r) || env.isWater(x + Math.cos(a) * r * 0.5, z + Math.sin(a) * r * 0.5)) return true; }
    return false;
  };
  W.nearRock = (x, z, r) => env.rocks.some(k => Math.hypot(k.x - x, k.z - z) < k.r + r);
  W.fireAt = (x, z) => { let v = 0; for (const f of W.fires) if (Math.hypot(f.x - x, f.z - z) < f.r) v = Math.max(v, f.intensity); return v > 0.35 ? v : 0; };
  W.fireNear = (x, z, r) => W.fires.some(f => f.intensity > 0.2 && Math.hypot(f.x - x, f.z - z) < f.r + r);
  W.isBusy = () => ui.isModalOpen() || !!ctx.dragState || !!W.experiment || !!W.viewMode;   // events wait until the child is back on the island view
  // 25.10 (Avi: "too much happens at once"): what comes by itself (a random event, an injury, a visitor, a verse, a small
  // note) also waits for a calm moment: not right after a mission was done, not soon after another event, not while
  // רובו־דע speaks. Times in game seconds (W.simT).
  W._missionDoneT = -1e9; W._eventT = -1e9;
  W.calmBusy = () => W.isBusy() || W.simT - W._missionDoneT < 30 || W.simT - W._eventT < 240
    || !!(window.__guide && window.__guide.isOpen && window.__guide.isOpen());

  W.findFood = (animal, radius) => {
    const sp = animal.sp; let best = null, bestS = 0;
    const R = radius || (animal.loco === 'flying' ? 80 : animal.loco === 'arboreal' ? 30 : 40);
    for (const e of sp.diet2) {
      const tsp = reg.byId.get(e.to); if (!tsp) continue;
      if (tsp.isPlant) {
        for (const p of W.plants) {
          if (p.sp.id !== e.to || !alive(p) || p.falling) continue;
          const amt = p.foodAmount(e.part); if (amt < 0.15) continue;
          const d = Math.hypot(p.x - animal.pos.x, p.z - animal.pos.z); if (d > R) continue;
          const s = amt / (1 + d / 14) * (0.8 + Math.random() * 0.4);
          if (s > bestS) { bestS = s; best = { entity: p, part: e.part, edge: e }; }
        }
      } else {
        if (animal.touring) continue;   // the hunter the child rides on only looks around (src/game/tour.js)
        for (const a of W.animals) {
          if (a === animal || a.sp.id !== e.to || !alive(a) || a.leaving || a.injured || a.touring) continue;
          const d = a.pos.distanceTo(animal.pos); if (d > R) continue;
          const s = 0.7 / (1 + d / 12) * (0.8 + Math.random() * 0.4);
          if (s > bestS) { bestS = s; best = { entity: a, part: e.part, edge: e }; }
        }
      }
    }
    return best;
  };
  const perchable = (p, treesOnly) => alive(p) && !p.falling && p.growth > 0.4 && p.vis.perchPoints().length > 0 && (!treesOnly || p.isTree || p.sp.kind === 'shrub');
  W.nearestPerchTree = (pos, r, animal) => {
    let best = null, bd = r;
    const treesOnly = animal.loco === 'arboreal';
    for (const p of W.plants) { if (!perchable(p, treesOnly)) continue; const d = Math.hypot(p.x - pos.x, p.z - pos.z); if (d < bd) { bd = d; best = p; } }
    return best;
  };
  W.randomPerchPlant = (center, range, animal, treesOnly) => {
    const insect = animal.sp.isInsect || animal.sp.id === 'hummingbird';
    const cand = W.plants.filter(p => {
      if (!alive(p) || p.falling || Math.hypot(p.x - center.x, p.z - center.z) > range) return false;
      if (insect) return p.growth > 0.3 && p.sp.kind !== 'fungus' && (p.bloom > 0.2 || p.sp.kind === 'herb' || p.sp.kind === 'shrub' || p.isTree);
      return perchable(p, treesOnly);
    });
    if (!cand.length) return null;
    if (insect) { const bl = cand.filter(p => p.bloom > 0.3); if (bl.length && Math.random() < 0.7) return bl[(Math.random() * bl.length) | 0]; }
    return cand[(Math.random() * cand.length) | 0];
  };
  W.threatNear = (animal, r) => {
    for (const a of W.animals) if (a.state === 'hunt' && a.prey === animal && a.pos.distanceTo(animal.pos) < r) return a;
    return null;
  };

  // ─────────────────────────────────────────── discovery & ecological events
  function edgeFor(from, to, type) { return reg.edges.find(e => e.from === from && e.to === to && e.type === type); }
  function entityPos(e, out) { return e.focusPoint(out); }
  const tmpLinks = [];   // short-lived highlight links {a,b,color,until}
  W.observe = (fromE, toE, type, quiet = false) => {
    const e = edgeFor(fromE.sp.id, toE.sp.id, type); if (!e) return;
    ctx.report?.observe(fromE.sp.id, toE.sp.id, e.key, !W.discovered.has(e.key));
    if (!quiet || !W.discovered.has(e.key)) tmpLinks.push({ from: fromE, to: toE, type, until: W.simT + 3.5 });
    if (W.discovered.has(e.key)) return;
    W.discovered.add(e.key);
    if (W.research) return;   // a mystery has its own notes: no "new link" cards over the table
    W.points += 5;
    const a = reg.byId.get(e.from), b = reg.byId.get(e.to);
    // חוויה: a link found by itself (an animal ate, a bee pollinated) only sparkles in the forest; the card comes when the
    // child asked for it ("גלו את הקשר")
    if (W.xp && !W._revealing) { markers.burst(entityPos(toE, _v), RELATION_TYPES[type]?.color || '#9ff', 26, { size: 0.5 }); refreshPanel(); return; }
    ui.discovery({ fromName: a.name, toName: b.name, typeName: RELATION_TYPES[type]?.name || '', text: e.text, color: RELATION_TYPES[type]?.color });
    audio.play('discover');
    markers.burst(entityPos(toE, _v), RELATION_TYPES[type]?.color || '#9ff', 26, { size: 0.5 });
    refreshPanel();
  };
  W.onFed = (animal, e, f) => {
    if (e.isPlant && f.part === 'nectar' && e.sp.pollinators.includes(animal.sp.id)) {
      if (!e.pollinated) { e.pollinated = true; markers.burst(entityPos(e, _v), '#ffe066', 14, { size: 0.32, speed: 1.2 }); }
      W.stats.pollinations[e.sp.id] = (W.stats.pollinations[e.sp.id] || 0) + 1;
      W.points += 1;
      W.observe(animal, e, 'pollinates');
    }
    W.observe(animal, e, 'eats', true);
  };
  W.tryCatch = (pred, prey) => {
    if (!alive(prey) || prey.leaving || prey.touring) return;   // the animal the child rides on is safe
    if (W.research) { pred.energy = 1; pred.eatCD = 25; W.observe(pred, prey, 'eats', true); return; }   // a mystery: the model counts the catches
    if (prey.type !== 'animal') { pred.energy = 1; pred.eatCD = 20; W.observe(pred, prey, 'eats'); return; }   // a colony or swarm feeds it without disappearing
    const cnt = W.countAlive(prey.sp.id);
    const p = prey.sp.isInsect ? 0.3 : cnt <= 2 ? 0.1 : 0.3;
    pred.energy = clamp(pred.energy + 0.25, 0, 1);
    pred.eatCD = 25;
    if (Math.random() < p) { pred.energy = 1; W.observe(pred, prey, 'eats'); prey.leave(); prey.caught = true; }
  };
  W.disperseSeed = (animal, sp, x, z, src) => {
    W.stats.dispersals++;
    W.points += 1;
    const room = !W.research && W.plantRoom(sp) && W.countAlive(sp.id) < sp.maxCount;   // in a mystery the model decides where new plants come up
    const pos = room ? findSpotNear(sp, x, z, 5) : null;
    const p = pos ? spawnPlant(sp, pos.x, pos.z, { growth: 0.05 }) : null;
    if (p) p.sownBy = animal.sp.id;
    const at = pos || { x, z };
    markers.burst(_v.set(at.x, env.heightAt(at.x, at.z) + 0.3, at.z), '#a8e06a', 16, { size: 0.3, speed: 1 });
    const target = p || src || W.plants.find(q => q.sp.id === sp.id && alive(q));
    if (target) W.observe(animal, target, 'disperses');
    if (p && Math.random() < 0.5) amb(`${animal.sp.name} ${gw(animal.sp.id,'פיזר','פיזרה','פיזרו','פיזרו')} זרע – ${sp.name} ${gw(sp.id,'חדש נובט','חדשה נובטת','חדשים נובטים','חדשות נובטות')}!`, 'good');
  };
  W.findDisperseFood = (animal) => {
    let best = null, bd = animal.loco === 'flying' ? 80 : 40;
    for (const p of W.plants) {
      if (!alive(p) || p.falling || !animal.sp.disperses.includes(p.sp.id) || p.growth < 0.4) continue;
      const e = animal.sp.diet2.find(d => d.to === p.sp.id);
      const part = e ? e.part : 'fruit';
      const amt = part === 'leaves' ? p.foodAmount('leaves') : Math.max(p.fruit, p.bloom * 0.3, 0.2);   // fruit or seeds are always found somewhere on a grown plant
      if (amt < 0.15) continue;
      const d = Math.hypot(p.x - animal.pos.x, p.z - animal.pos.z);
      if (d < bd) { bd = d; best = { entity: p, part, edge: e || { to: p.sp.id, part } }; }
    }
    return best;
  };
  W.selfSeed = (parent) => {
    if (W.research) return;
    const sp = parent.sp;
    if (!W.plantRoom(sp) || W.countAlive(sp.id) >= sp.maxCount) return;
    if (sp.needs?.host) return;
    const pos = findSpotNear(sp, parent.x, parent.z, sp.kind === 'tree' ? 7 : 3, parent);
    if (pos) { const p = spawnPlant(sp, pos.x, pos.z, { growth: 0.04 }); if (p && parent.wild) p.wild = true; }
  };
  W.pineAfterFire = (p) => { W._pineSeeds = (W._pineSeeds || 0) + 2; W._pineAt = { x: p.x, z: p.z }; };
  W.note = (type, e) => { if (type === 'resprout' && !W._resproutNoted) { W._resproutNoted = true; setTimeout(() => amb(`${e.sp.name} ${gw(e.sp.id,'נשרף','נשרפה','נשרפו','נשרפו')}, אבל השורשים חיים – ${gw(e.sp.id,'הוא יצמח','היא תצמח','הם יצמחו','הן תצמחנה')} מחדש מהגדם!`, 'info'), 6000); } };
  W.onMature = (p) => {
    ctx.report?.mature();
    W.points += 4; audio.play('grow');
    markers.burst(_v.set(p.x, p.topY(), p.z), '#c8ff8a', 20, { size: 0.5 });
    if (p.sp.layer === 'emergent' && !W._emNoted) { W._emNoted = true; amb(`ה${p.sp.name} ${gw(p.sp.id,'הגיע','הגיעה','הגיעו','הגיעו')} לקומת הענקים – עכשיו ${gw(p.sp.id,'הוא מקבל','היא מקבלת','הם מקבלים','הן מקבלות')} את כל אור השמש!`, 'good'); }
  };
  // the reef: where a coral broke or faded away a "scar" stays: the best place for a strong young coral from the nursery
  W.scars = W.scars || [];
  W.onPlantDied = (p, reason) => {
    if (W.biomeId === 'reef' && !W.research && p.sp.kind === 'coral' && reason !== 'uproot') {
      W.scars.push({ x: +p.x.toFixed(2), z: +p.z.toFixed(2), t: Math.round(W.simT) });
      if (W.scars.length > 6) W.scars.shift();
    }
    if (reason !== 'uproot' && reason !== 'fall' && reason !== 'event' && !W.research) W.stats.lossT = W.simT;
    if (reason !== 'uproot') ctx.report?.plantDied(reason);   // a plant the player took out did not die
    for (const a of W.animals) if (a.perch && a.perch.plant === p) { a.perch = null; a.state = 'idle'; a.timer = 0; }
    if (reason === 'weak' && W.simT - (W._lastDeathToast || -99) > 25) {
      W._lastDeathToast = W.simT;
      const g = (m, f, mp, fp) => gw(p.sp.id, m, f, mp, fp);
      const why = p.light < (p.sp.lightNeed ?? 0.5) * 0.6 ? g('לא קיבל', 'לא קיבלה', 'לא קיבלו', 'לא קיבלו') + ' מספיק אור' : W.drought > 0.3 ? g('התייבש', 'התייבשה', 'התייבשו', 'התייבשו') : g('נחלש', 'נחלשה', 'נחלשו', 'נחלשו');
      amb(`${p.sp.name} ${why} ${g('ונבל', 'ונבלה', 'ונבלו', 'ונבלו')}.`, 'bad');
    }
    if (W.selected === p) select(null);
  };
  W.onTreeLanded = (p) => { audio.play('thunder'); markers.burst(_v.set(p.x, p.y + 2, p.z), '#d8c6a0', 40, { size: 0.6, speed: 4 }); ctx.lightDirty = true; };
  W.animalLeaves = (a, reason) => {
    if (a.leaving) return;
    if ((W.kids || W.research || W.training || a.touring) && reason === 'hunger') { a.energy = 0.35; return; }
    a.leave(); ctx.report?.animalLeft(reason);
    if (reason === 'hunger') W.stats.lossT = W.simT;
    if (reason === 'hunger' && W.xp && !W._hungryRobo) { W._hungryRobo = true; robo('zone:hungry'); }   // חוויה: רובו־דע says it once
    if (reason === 'hunger' && W.simT - (W._lastLeaveToast || -99) > 15) { W._lastLeaveToast = W.simT; amb(`${a.sp.name} ${gw(a.sp.id,`עזב את ${zoneWord()} – לא מצא`,`עזבה את ${zoneWord()} – לא מצאה`,`עזבו את ${zoneWord()} – לא מצאו`,`עזבו את ${zoneWord()} – לא מצאו`)} מספיק אוכל.`, 'bad'); audio.play('remove'); }
  };
  W.removeEntity = (e) => {
    if (e.isPlant) { const i = W.plants.indexOf(e); if (i >= 0) W.plants.splice(i, 1); }
    else { const i = W.animals.indexOf(e); if (i >= 0) W.animals.splice(i, 1); }
    if (e.obj.parent) e.obj.parent.remove(e.obj);
    try { e.vis.dispose(); } catch (err) { }
    if (W.selected === e) select(null);
    ctx.lightDirty = true;
  };
  W.linkDiscovered = (from, to) => reg.edges.some(e => ((e.from === from && e.to === to) || (e.from === to && e.to === from)) && W.discovered.has(e.key));
  W.linkActive = (from, to) => {
    if (!W.countAlive(from) || !W.countAlive(to)) return false;
    return reg.edges.some(e => e.from === from && e.to === to) || reg.edges.some(e => e.from === to && e.to === from);
  };
  W.longestChain = () => {
    const present = new Set(W.aliveSpecies());
    const memo = new Map();
    const depth = (id, seen) => {
      if (memo.has(id)) return memo.get(id);
      let best = 1;
      for (const e of reg.edges) if (e.type === 'eats' && e.from === id && present.has(e.to) && !seen.has(e.to)) { seen.add(e.to); best = Math.max(best, 1 + depth(e.to, seen)); seen.delete(e.to); }
      memo.set(id, best); return best;
    };
    let m = 0; for (const id of present) m = Math.max(m, depth(id, new Set([id])));
    return m;
  };
  return { alive, tmpLinks };
}
