// The game world for one biome: owns entities, simulation, input, UI wiring, missions and events.
import { TORAH, sourcesOn } from '../core/edition.js';
import { SOURCE_CARDS, SHIRA } from '../data/torah.js';
import { grantSource } from '../core/sources-store.js';
import { createSourceMoments } from './sources.js';
import * as THREE from 'three';
import { createEnvironment } from '../env/environment.js';
import { createLightSystem } from '../sim/light.js';
import { buildRegistry, relKey, RESPROUTERS, SWIMMERS } from '../sim/species.js';
import { Plant } from '../world/plants.js';
import { Animal } from '../world/animals.js';
import { createLinks, createMarkers } from '../world/fx.js';
import { createCameraRig } from '../world/camera.js';
import { THUMBS } from '../data/thumbs.js';
import { CARD_ART } from '../data/card-art.js';
import { createMissions } from './missions.js';
import { createTools, TOOL_DEFS, disposeObject } from './tools.js';
import { createCameraPad } from '../ui/camera-pad.js';
import { createImmersive } from './immersive.js';
import { createFieldCam } from './fieldcam.js';
import { createTour } from './tour.js';
import { RELATION_TYPES, SEASON_NAMES, START_POINTS, gw, activeNameFor } from '../data/common.js';
import { clamp, smoothstep, damp, makeRng, SEASONS } from '../core/util.js';
import { key as profileKey } from '../core/profiles.js';
import { createFieldReport } from './report.js';
import { createResearchSession } from '../research/session.js';

const DAY_LEN = 270;            // seconds of game time per day
const MAX_PLANTS = 95, MAX_ANIMALS = 75;
// small, cheap things (flowers, ferns, mushrooms, insects) get extra room above the caps, so the forest can bloom and buzz
// without letting the heavy trees crowd in further
const SMALL_PLANT = new Set(['herb', 'fungus', 'water-plant', 'epiphyte']);
const MAX_ALL_PLANTS = MAX_PLANTS + 30;   // big plants (trees, shrubs, palms, vines) alone are still capped at MAX_PLANTS
const animalCap = (sp) => (sp.isInsect ? MAX_ANIMALS + 15 : MAX_ANIMALS);
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _ray = new THREE.Raycaster(), _ndc = new THREE.Vector2();

// The far forest around the island is drawn with impostors baked from these mature trees of the zone (see env/impostors.js).
// Seed 11 = the same model variants the shader warm-up below builds, so their cached geometry is shared.
const FAR_TREES = {
  amazon: [['kapok', 'emergent'], ['brazilnut', 'emergent'], ['fig', 'canopy'], ['cecropia', 'canopy'], ['acai', 'palm']],
  grove: [['oak', 'tree'], ['carob', 'tree'], ['pine', 'tree'], ['mastic', 'bush']],
};
function farTreeSources(biomeId, plantBuilders) {
  return (FAR_TREES[biomeId] || []).filter(([id]) => plantBuilders && plantBuilders[id]).map(([id, role]) => ({
    id, role,
    build: () => {
      const v = plantBuilders[id]({ seed: 11, rng: makeRng(11), hostHeight: 8, hostRadius: 0.4 });
      v.setGrowth(1); v.setHealth(1); if (v.setSeason) v.setSeason('spring', 0.4); v.setBloom(0); v.setFruit(0);
      if (v.update) v.update(10, 0, 0);   // no wind
      return v;
    },
  }));
}

export async function createGame({ pipe, ui, audio, bus, biome, plantBuilders, animalBuilders, quality, onExit, save = null, research = null }) {
  const scene = pipe.scene, camera = pipe.camera, canvas = pipe.renderer.domElement;
  const reg = buildRegistry(biome);
  const W = {
    biome, biomeId: biome.id, reg, plantBuilders, animalBuilders,
    plants: [], animals: [], fires: [], resprouters: RESPROUTERS,
    simT: 0, day: 1, dayFrac: 0.3, season: biome.id === 'grove' ? 'winter' : null, seasonFrac: 0, nightGlow: 0,
    rain: 0, rainTarget: 0, rainT: 0, drought: 0, droughtT: 0, flood: 0, floodT: 0, heat: 0, heatT: 0, wind: 0.25, storm: 0,
    growBoost: 1, points: START_POINTS, vitality: 0.5, speed: 1, lastTickDt: 0,
    unlocked: new Set(biome.species.filter(s => s.unlock === 'start').map(s => s.id)),
    seenNew: new Set(), discovered: new Set(), everPlaced: new Set(), quizDone: new Set(),
    stats: { pollinations: {}, dispersals: 0, experiments: 0, births: 0, missionStart: {} },
    treeFallen: false, experiment: null, selected: null, selectedSpecies: null, kids: biome.mode === 'kids',
    maxPlants: MAX_ALL_PLANTS, maxAnimals: MAX_ANIMALS,
    // חוקרי היער: a mystery case. Its population model owns births, hunger and numbers; the entities only show them
    research: research || null,
  };
  let report = null;   // "דוח החוקר" daily log (created once the forest is restored or seeded)

  ui.setLoading(0.05, 'בונים את האי...');
  await tick0();
  const env = createEnvironment(pipe, biome.id, { quality, seed: biome.id === 'amazon' ? 3 : 7, impostorTrees: farTreeSources(biome.id, plantBuilders) });
  W.env = env;
  const light = createLightSystem(env); W.light = light;
  const links = createLinks(scene);
  const markers = createMarkers(scene);
  const rig = createCameraRig(camera, canvas, env);
  camera.position.set(70, 62, 86); rig.controls.target.set(0, 5, 0);
  const thumbs = THUMBS[biome.id] || {};
  // compile every shader up front (while the loading screen is showing) so the game never freezes mid-play
  ui.setLoading(0.4, 'מכינים את הצמחים ובעלי החיים...');
  await tick0();
  {
    const stage = new THREE.Group(); stage.position.set(0, -200, 0); const temp = [];
    for (const sp of biome.species) {
      try {
        const isP = !!plantBuilders[sp.id];
        const v = isP ? plantBuilders[sp.id]({ seed: 11, rng: makeRng(11), hostHeight: 8, hostRadius: 0.4 }) : animalBuilders[sp.id]({ seed: 11, rng: makeRng(11) });
        if (isP) { v.setGrowth(1); v.setBloom(1); v.setFruit(1); v.setNightGlow(1); }
        stage.add(v.object); temp.push(v);
      } catch (e) { }
    }
    scene.add(stage);
    try { const r = pipe.renderer; if (r.compileAsync && r.extensions && r.extensions.has('KHR_parallel_shader_compile')) await r.compileAsync(scene, camera); else r.compile(scene, camera); } catch (e) { try { pipe.renderer.compile(scene, camera); } catch (e2) { } }
    ui.setLoading(0.8, 'מכינים את הצמחים ובעלי החיים...');
    await tick0();
    try { pipe.render(0.016); } catch (e) { }    // also builds the shadow shaders
    scene.remove(stage);
    // keep these warm-up models (off-scene) for the whole visit: they hold the compiled shader programs of parts that
    // live plants keep hidden until their season (flowers, fruit) – disposing them would free the programs, and the
    // first bloom would then stall while compiling
    W.warm = temp;
  }
  ui.setLoading(0.9, 'כמעט מוכן...');
  const missions = createMissions(W); W.missions = missions;
  let tools = null;   // created once the helpers below exist
  let imv = null, fieldcam = null, tour = null, moments = null;   // immersive views: looking through a field camera, the animal-eye tour

  // keep the island centred in the part of the screen that the HUD and the tray leave free
  let lastFit = '';
  function fitViewToUI(force) {
    const root = document.getElementById('ui');
    const trayH = root ? parseFloat(getComputedStyle(root).getPropertyValue('--trayH')) || 0 : 0;
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    const topH = 70, freeH = Math.max(200, h - trayH - topH);
    const offY = Math.round((trayH - topH) / 2);
    const key = w + 'x' + h + ':' + offY;
    if (key === lastFit && !force) return;
    lastFit = key;
    camera.setViewOffset(w, h, 0, offY, w, h); camera.updateProjectionMatrix();
    rig.distScale = clamp(520 / freeH, 0.9, 1.5) * clamp(1.5 / Math.max(0.8, w / h), 1, 1.5);
    if (!force && W.simT < 6 && rig.layer === 'all') rig.setLayer('all');
  }
  fitViewToUI(true);
  rig.setLayer('all');

  // ─────────────────────────────────────────── queries used by entities
  const alive = (e) => e.alive && !e.removed && !e.dying;
  // room for one more plant of this kind: small ones only against the total, big ones also against the big-plant cap
  W.plantRoom = (sp) => {
    if (W.plants.length >= MAX_ALL_PLANTS) return false;
    if (SMALL_PLANT.has(sp.kind)) return true;
    let n = 0; for (const p of W.plants) if (!SMALL_PLANT.has(p.sp.kind)) n++;
    return n < MAX_PLANTS;
  };
  W.countAlive = (id) => { let n = 0; for (const p of W.plants) if (p.sp.id === id && alive(p)) n++; for (const a of W.animals) if (a.sp.id === id && alive(a) && !a.leaving) n++; return n; };
  W.countPlaced = (id) => { let n = 0; for (const p of W.plants) if (p.sp.id === id && alive(p) && !p.wild) n++; for (const a of W.animals) if (a.sp.id === id && alive(a) && !a.leaving) n++; return n; };
  W.aliveSpecies = () => { const s = new Set(); for (const p of W.plants) if (alive(p)) s.add(p.sp.id); for (const a of W.animals) if (alive(a) && !a.leaving) s.add(a.sp.id); return [...s]; };
  W.nearWater = (x, z, r) => {
    if (env.isWater(x, z)) return true;
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; if (env.isWater(x + Math.cos(a) * r, z + Math.sin(a) * r) || env.isWater(x + Math.cos(a) * r * 0.5, z + Math.sin(a) * r * 0.5)) return true; }
    return false;
  };
  W.nearRock = (x, z, r) => env.rocks.some(k => Math.hypot(k.x - x, k.z - z) < k.r + r);
  W.fireAt = (x, z) => { let v = 0; for (const f of W.fires) if (Math.hypot(f.x - x, f.z - z) < f.r) v = Math.max(v, f.intensity); return v > 0.35 ? v : 0; };
  W.fireNear = (x, z, r) => W.fires.some(f => f.intensity > 0.2 && Math.hypot(f.x - x, f.z - z) < f.r + r);
  W.isBusy = () => ui.isModalOpen() || !!dragState || !!W.experiment || !!W.viewMode;   // events wait until the child is back on the island view

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
    report?.observe(fromE.sp.id, toE.sp.id, e.key, !W.discovered.has(e.key));
    if (!quiet || !W.discovered.has(e.key)) tmpLinks.push({ from: fromE, to: toE, type, until: W.simT + 3.5 });
    if (W.discovered.has(e.key)) return;
    W.discovered.add(e.key);
    W.points += 5;
    const a = reg.byId.get(e.from), b = reg.byId.get(e.to);
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
    const at = pos || { x, z };
    markers.burst(_v.set(at.x, env.heightAt(at.x, at.z) + 0.3, at.z), '#a8e06a', 16, { size: 0.3, speed: 1 });
    const target = p || src || W.plants.find(q => q.sp.id === sp.id && alive(q));
    if (target) W.observe(animal, target, 'disperses');
    if (p && Math.random() < 0.5) ui.toast(`${animal.sp.name} ${gw(animal.sp.id,'פיזר','פיזרה','פיזרו','פיזרו')} זרע – ${sp.name} ${gw(sp.id,'חדש נובט','חדשה נובטת','חדשים נובטים','חדשות נובטות')}!`, 'good');
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
  W.note = (type, e) => { if (type === 'resprout' && !W._resproutNoted) { W._resproutNoted = true; setTimeout(() => ui.toast(`${e.sp.name} ${gw(e.sp.id,'נשרף','נשרפה','נשרפו','נשרפו')}, אבל השורשים חיים – ${gw(e.sp.id,'הוא יצמח','היא תצמח','הם יצמחו','הן תצמחנה')} מחדש מהגדם!`, 'info'), 6000); } };
  W.onMature = (p) => {
    report?.mature();
    W.points += 4; audio.play('grow');
    markers.burst(_v.set(p.x, p.topY(), p.z), '#c8ff8a', 20, { size: 0.5 });
    if (p.sp.layer === 'emergent' && !W._emNoted) { W._emNoted = true; ui.toast(`ה${p.sp.name} ${gw(p.sp.id,'הגיע','הגיעה','הגיעו','הגיעו')} לקומת הענקים – עכשיו ${gw(p.sp.id,'הוא מקבל','היא מקבלת','הם מקבלים','הן מקבלות')} את כל אור השמש!`, 'good'); }
  };
  W.onPlantDied = (p, reason) => {
    report?.plantDied(reason);
    for (const a of W.animals) if (a.perch && a.perch.plant === p) { a.perch = null; a.state = 'idle'; a.timer = 0; }
    if (reason === 'weak' && W.simT - (W._lastDeathToast || -99) > 25) {
      W._lastDeathToast = W.simT;
      const g = (m, f, mp, fp) => gw(p.sp.id, m, f, mp, fp);
      const why = p.light < (p.sp.lightNeed ?? 0.5) * 0.6 ? g('לא קיבל', 'לא קיבלה', 'לא קיבלו', 'לא קיבלו') + ' מספיק אור' : W.drought > 0.3 ? g('התייבש', 'התייבשה', 'התייבשו', 'התייבשו') : g('נחלש', 'נחלשה', 'נחלשו', 'נחלשו');
      ui.toast(`${p.sp.name} ${why} ${g('ונבל', 'ונבלה', 'ונבלו', 'ונבלו')}.`, 'bad');
    }
    if (W.selected === p) select(null);
  };
  W.onTreeLanded = (p) => { audio.play('thunder'); markers.burst(_v.set(p.x, p.y + 2, p.z), '#d8c6a0', 40, { size: 0.6, speed: 4 }); lightDirty = true; };
  W.animalLeaves = (a, reason) => {
    if (a.leaving) return;
    if ((W.kids || W.research || a.touring) && reason === 'hunger') { a.energy = 0.35; return; }
    a.leave(); report?.animalLeft(reason);
    if (reason === 'hunger' && W.simT - (W._lastLeaveToast || -99) > 15) { W._lastLeaveToast = W.simT; ui.toast(`${a.sp.name} ${gw(a.sp.id,'עזב את האי – לא מצא','עזבה את האי – לא מצאה','עזבו את האי – לא מצאו','עזבו את האי – לא מצאו')} מספיק אוכל.`, 'bad'); audio.play('remove'); }
  };
  W.removeEntity = (e) => {
    if (e.isPlant) { const i = W.plants.indexOf(e); if (i >= 0) W.plants.splice(i, 1); }
    else { const i = W.animals.indexOf(e); if (i >= 0) W.animals.splice(i, 1); }
    if (e.obj.parent) e.obj.parent.remove(e.obj);
    try { e.vis.dispose(); } catch (err) { }
    if (W.selected === e) select(null);
    lightDirty = true;
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

  // ─────────────────────────────────────────── spawning & placement
  function spacingOK(sp, x, z, ignore) {
    const k = sp.kind;
    for (const p of W.plants) {
      if (!alive(p) || p === ignore || p.host) continue;
      const d = Math.hypot(p.x - x, p.z - z);
      const big = (k === 'tree' || k === 'palm'), pbig = p.isTree;
      const need = big && pbig ? (k === 'palm' || p.sp.kind === 'palm' ? 3.2 : 4.5) : big || pbig ? 1.4 : (k === 'shrub' || p.sp.kind === 'shrub' ? 1.3 : 0.7);
      if (d < need) return false;
    }
    return true;
  }
  function findSpotNear(sp, x, z, r, ignore) {
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, rr = r * (0.3 + Math.random() * 0.7);
      const px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr;
      if (sp.kind === 'water-plant' ? !env.isWater(px, pz) : !env.isPlaceable(px, pz)) continue;
      if (W.onRoad && W.onRoad(px, pz, 0.8)) continue;
      if (sp.needs?.rocks && !W.nearRock(px, pz, 3)) continue;
      if (!spacingOK(sp, px, pz, ignore)) continue;
      return { x: px, z: pz };
    }
    return null;
  }
  function hostAt(x, z, sp) {
    let best = null, bd = 4.5;
    for (const p of W.plants) {
      if (!alive(p) || !p.isTree || p.falling) continue;
      if (sp.id === 'liana') { if (p.growth < 0.6 || W.plants.some(q => q.host === p && q.sp.id === 'liana' && alive(q))) continue; }
      else { if (p.growth < 0.5 || !p.vis.attachPoints().length) continue; if (W.plants.filter(q => q.host === p && alive(q)).length >= 5) continue; }
      const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = p; }
    }
    return best;
  }
  function spawnPlant(sp, x, z, opts = {}) {
    if (!opts.restore && !W.plantRoom(sp)) return null;   // a saved forest always comes back whole
    if (sp.needs?.host && !opts.host) { opts.host = hostAt(x, z, sp); if (!opts.host) return null; }
    if (opts.host && sp.kind === 'epiphyte' && !(opts.attachIdx >= 0)) { const used = new Set(W.plants.filter(q => q.host === opts.host).map(q => q.attachIdx)); const n = opts.host.vis.attachPoints().length; let idx = (Math.random() * n) | 0; for (let i = 0; i < n && used.has(idx); i++) idx = (idx + 1) % n; opts.attachIdx = idx; }
    const p = new Plant(W, sp, x, z, opts);
    scene.add(p.obj); W.plants.push(p); lightDirty = true;
    if (opts.light === undefined) p.light = light.transmission(p.x, p.y + 1, p.z, crowns, light.noonSun, p);
    return p;
  }
  function spawnAnimal(sp, pos, opts = {}) {
    if (!opts.restore && W.animals.length >= animalCap(sp)) return null;
    const a = new Animal(W, sp, pos, opts);
    scene.add(a.obj); W.animals.push(a);
    return a;
  }

  // validity check for placing species at (x,z) from the tray
  function checkPlace(sp, hit) {
    if (!hit) return { ok: false, reason: 'גררו אל האי' };
    const { x, z } = hit;
    if (!W.unlocked.has(sp.id)) return { ok: false, reason: 'עוד נעול' };
    if (W.points < sp.cost) return { ok: false, reason: 'אין מספיק נקודות חיים' };
    if (W.countPlaced(sp.id) >= sp.maxCount) return { ok: false, reason: `הגעתם למספר המרבי של ${sp.name} (${sp.maxCount}) – נסו מין אחר` };
    if (Math.hypot(x, z) > env.radius + 0.5) return { ok: false, reason: 'קרוב מדי לקצה' };
    if (sp.isPlant && !W.plantRoom(sp)) return { ok: false, reason: 'היער מלא – אין מקום לעוד צמחים כרגע' };
    if (!sp.isPlant && W.animals.length >= animalCap(sp)) return { ok: false, reason: 'היער מלא – אין מקום לעוד בעלי חיים כרגע' };
    if (sp.isPlant) {
      if (sp.kind === 'water-plant') return env.isWater(x, z) ? { ok: true, text: 'צמח מים – על הנהר' } : { ok: false, reason: 'צריך מים – גררו אל הנהר' };
      if (sp.needs?.host) { const h = hostAt(x, z, sp); return h ? { ok: true, host: h, text: `על ${h.sp.name}` } : { ok: false, reason: sp.id === 'liana' ? 'גררו אל עץ גבוה ובוגר' : 'גררו אל ענפים של עץ בוגר' }; }
      if (!env.isPlaceable(x, z)) return { ok: false, reason: env.isWater(x, z) ? 'זה מים' : 'אי אפשר לשתול כאן' };
      if (W.onRoad(x, z, 0.8)) return { ok: false, reason: 'אי אפשר לשתול על הכביש' };
      if (sp.needs?.rocks && !W.nearRock(x, z, 3)) return { ok: false, reason: 'צריך סלעים – גררו ליד הסלעים' };
      if (sp.needs?.water && !W.nearWater(x, z, 6)) return { ok: false, reason: 'צריך מים קרובים' };
      if (!spacingOK(sp, x, z)) return { ok: false, reason: 'צפוף מדי – אין מקום לשורשים' };
      const lv = light.transmission(x, env.heightAt(x, z) + 1, z, crowns, light.noonSun);
      const need = sp.lightNeed ?? 0.5;
      if (need > 0.55 && lv < 0.35) return { ok: true, warn: true, text: `מוצל כאן (${Math.round(lv * 100)}% אור) – יגדל לאט` };
      if (need < 0.35 && lv > 0.85) return { ok: true, warn: true, text: `חשוף לשמש (${Math.round(lv * 100)}% אור)` };
      return { ok: true, text: `אור כאן: ${Math.round(lv * 100)}%` };
    }
    if (sp.needs?.water && !W.nearWater(x, z, 8)) return { ok: false, reason: 'צריך להיות ליד המים' };
    if (sp.needs?.rocks && !W.nearRock(x, z, 4)) return { ok: false, reason: 'צריך סלעים – גררו ליד הסלעים' };
    if ((sp.locomotion || 'ground') !== 'flying' && env.isWater(x, z) && !SWIMMERS.has(sp.id)) return { ok: false, reason: 'זה מים' };
    if (sp.locomotion === 'arboreal' && !W.plants.some(p => alive(p) && (p.isTree || p.sp.kind === 'shrub') && p.growth > 0.4 && p.vis.perchPoints().length)) return { ok: false, reason: 'צריך קודם עצים או שיחים גדולים' };
    if (sp.diet2.length && !sp.diet2.some(e => W.countAlive(e.to) > 0)) return { ok: true, warn: true, text: 'אין כאן עדיין אוכל ' + gw(sp.id, 'בשבילו', 'בשבילה', 'בשבילם', 'בשבילן') };
    return { ok: true, text: sp.active === 'night' ? activeNameFor(sp.id, 'night') : '' };
  }

  function place(sp, hit, chk) {
    W.points -= sp.cost;
    const [g0, g1] = sp.groupSize; const n = Math.max(1, Math.min(g0 + Math.floor(Math.random() * (g1 - g0 + 1)), sp.maxCount - W.countPlaced(sp.id)));
    const placed = [];
    if (sp.isPlant) {
      for (let i = 0; i < n; i++) {
        let x = hit.x, z = hit.z;
        if (i > 0) { const s = findSpotNear(sp, hit.x, hit.z, 2.2); if (!s) break; x = s.x; z = s.z; }
        const p = spawnPlant(sp, x, z, { host: chk.host }); if (p) placed.push(p);
        if (chk.host) break;
      }
    } else {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, r = i ? 1 + Math.random() * 1.8 : 0;
        let x = hit.x + Math.cos(a) * r, z = hit.z + Math.sin(a) * r;
        if (!env.isPlaceable(x, z) && !(SWIMMERS.has(sp.id) && env.isWater(x, z)) && sp.locomotion !== 'flying') { x = hit.x; z = hit.z; }
        const e = spawnAnimal(sp, new THREE.Vector3(x, env.heightAt(x, z), z)); if (e) placed.push(e);
      }
    }
    if (!placed.length) { W.points += sp.cost; audio.play('invalid'); ui.toast(sp.isPlant ? 'לא נמצא מקום לשתול כאן – הנקודות חזרו אליכם' : 'לא נמצא מקום כאן – הנקודות חזרו אליכם', 'warn'); refreshTray(); return placed; }
    W.everPlaced.add(sp.id); W.seenNew.add(sp.id);
    audio.play('place');
    for (const e of placed) markers.burst(e.focusPoint(_v), sp.color || '#bfffa0', 16, { size: 0.42 });
    // auto-discover structural relations right away (epiphyte on host)
    if (chk.host && placed[0]) W.observe(placed[0], chk.host, 'climbs');
    refreshTray();
    if (placed[0] && !W.selected) { /* leave selection alone */ }
    return placed;
  }

  // ─────────────────────────────────────────── crowns & light
  const FALLEN_FRUIT = { oak: 'acorns', carob: 'carob_pods', brazilnut: 'brazil_pod' };
  let crowns = [], lightDirty = true, lightT = 0, shafts = [];
  function updateLight(force) {
    crowns = [];
    for (const p of W.plants) { if (p.removed) continue; const c = p.crown(); if (c && c.top > 1.2) crowns.push(c); }
    // per-plant light at the top of the plant (noon sun)
    for (const p of W.plants) {
      if (!alive(p)) continue;
      const top = p.sp.kind === 'fungus' ? 0.3 : Math.max(0.3, (p.topY() - p.y) * 0.92);
      p.light = light.transmission(p.x, p.y + top, p.z, crowns, light.noonSun, p);
    }
    const sun = env.sun.direction;
    const useSun = sun.y > 0.1 ? sun : light.noonSun;
    // soft crown shadows on the ground: trees, palms and shrubs (also the smaller crowns the light system skips)
    const shCrowns = [];
    for (const p of W.plants) { if (p.removed || !(p.isTree || p.sp.kind === 'shrub')) continue; const c = p.crown(); if (c) shCrowns.push(c); }
    env.setTreeShadows(shCrowns, sun.y > 0.05 ? sun : light.noonSun);
    // fallen fruit on the ground under fruiting trees (acorns, carob pods, Brazil-nut capsules) – Blender props
    if (env.setFallenFruit) {
      const ff = [];
      for (const p of W.plants) {
        const kind = FALLEN_FRUIT[p.sp.id];
        if (!kind || p.removed || !p.alive || p.fruit < 0.15) continue;
        const c = p.crown(); if (c) ff.push({ x: p.x, z: p.z, radius: c.radius, kind, amount: p.fruit });
      }
      env.setFallenFruit(ff);
    }
    light.computeFloor(crowns, useSun);
    light.noonFloorScore(crowns);
    shafts = sun.y > 0.08 ? light.findShafts(crowns, sun) : [];
    for (const sh of shafts) sh.strength *= 0.6;
  }

  // ─────────────────────────────────────────── selection, panel, hover
  // what happened to an injured animal and what to do (panel and hover label)
  function hurtText(a) {
    return `${a.injured.cause}. ` + (a.injured.saving ? 'רובוט הצלה בדרך' : `שלחו רובוט הצלה! גוררים אותו מלשונית טכנולוגיה ${gw(a.sp.id, 'לידו', 'לידה', 'לידם', 'לידן')}`);
  }
  function select(e) {
    W.selected = e || null;
    if (!e) { markers.select(null); W.selectedSpecies = null; ui.hideSpecies(); rebuildLinks(); return; }
    W.selectedSpecies = e.sp.id;
    showPanel(e.sp.id, true);
    audio.play('select');
    rebuildLinks();
  }
  // answer order is shuffled per species, so the right answer is not always the first one
  const quizCache = new Map();
  function shuffledQuestion(sp) {
    const q = sp.question; if (!q || !q.options) return null;
    if (quizCache.has(sp.id)) return quizCache.get(sp.id);
    const rng = makeRng([...sp.id].reduce((h, c) => h * 31 + c.charCodeAt(0), 7) >>> 0);
    const order = q.options.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    if (order[0] === q.answer && order.length > 1 && rng() < 0.8) [order[0], order[1]] = [order[1], order[0]];
    const out = { q: q.q, options: order.map(i => q.options[i]), answer: order.indexOf(q.answer) };
    quizCache.set(sp.id, out); return out;
  }
  function speciesInfo(id) {
    const sp = reg.byId.get(id);
    const ents = [...W.plants.filter(p => p.sp.id === id && alive(p)), ...W.animals.filter(a => a.sp.id === id && alive(a) && !a.leaving)];
    let status = '';
    let health = null;
    if (ents.length) {
      if (sp.isPlant) {
        health = ents.reduce((s, p) => s + p.health, 0) / ents.length;
        const lt = ents.reduce((s, p) => s + p.light, 0) / ents.length;
        const g = ents.reduce((s, p) => s + p.growth, 0) / ents.length;
        status = `אור: ${Math.round(lt * 100)}% · גדילה: ${Math.round(g * 100)}%`;
        if (lt < (sp.lightNeed ?? 0.5) * 0.6) status += ' · צריך יותר אור!';
        if (ents.some(p => p.bloom > 0.5)) status += ' · פורח';
        if (ents.some(p => p.fruit > 0.5)) status += ' · יש פירות';
      } else {
        const anims = ents.filter(a => a.type === 'animal');
        if (anims.length) { health = anims.reduce((s, a) => s + a.energy, 0) / anims.length; status = health < 0.3 ? 'רעב – מחפש אוכל' : health < 0.6 ? 'קצת רעב' : 'שבע ומרוצה'; }
        else { health = 1; status = 'פעילה'; }
        if (!ents.some(a => a.isActive?.())) status += sp.active === 'night' ? ' · ' + gw(sp.id, 'ישן – מתעורר', 'ישנה – מתעוררת', 'ישנים – מתעוררים', 'ישנות – מתעוררות') + ' בלילה' : ' · ' + gw(sp.id, 'נח', 'נחה', 'נחים', 'נחות') + ' עכשיו';
        // an injured one: say what happened and what to do, first (the "!" alone did not explain it)
        const hurt = anims.find(a => a.injured);
        if (hurt) status = `❗ ${hurtText(hurt)}`;
      }
    }
    const rels = reg.panelRelations(id).map(r => ({
      targetId: r.targetId, targetName: reg.byId.get(r.targetId)?.name || r.targetId, type: r.type, typeName: r.typeName,
      text: r.text, discovered: W.discovered.has(r.key), present: W.countAlive(r.targetId) > 0,
    }));
    return {
      id, name: sp.name, nameEn: sp.nameEn, color: sp.color, thumb: thumbs[id] || null, art: CARD_ART[id] || null, kindName: sp.kindName, layerName: sp.layerName, activeName: sp.isAnimal ? activeNameFor(sp.id, sp.active) : '',
      fact: sp.fact, more: sp.more, alive: ents.length > 0, count: ents.length, health, status: ents.length ? status : (W.unlocked.has(id) ? 'עדיין לא באי – גררו אותו מהמגש' : 'נעול – השלימו משימות כדי לפתוח'),
      relations: rels, canRemove: ents.length > 0, tour: tour ? tour.labelFor(id) : '', question: shuffledQuestion(sp), questionDone: W.quizDone.has(id),
      shira: TORAH && sourcesOn() ? SHIRA[biome.id + ':' + id] || null : null,   // torah edition: its line in פרק שירה
    };
  }
  let panelId = null;
  function showPanel(id, fresh) { panelId = id; const info = speciesInfo(id); if (fresh) ui.showSpecies(info); else ui.updateSpecies(info); }
  function refreshPanel() { if (panelId) showPanel(panelId, false); }

  function nearestOf(id, pos) {
    let best = null, bd = Infinity;
    for (const e of [...W.plants, ...W.animals]) { if (e.sp.id !== id || !alive(e)) continue; const p = e.isPlant ? _w.set(e.x, e.y, e.z) : e.pos; const d = p.distanceTo(pos); if (d < bd) { bd = d; best = e; } }
    return best;
  }

  // links for the selected species, or the whole web
  let webMode = false, linksT = 0;
  function rebuildLinks() {
    const list = [];
    const addLink = (A, B, type, broken = false, strength = 1) => {
      const a = A.focusPoint(new THREE.Vector3()), b = B.focusPoint(new THREE.Vector3());
      if (a.distanceTo(b) < 0.3) return;
      const cd = camera.position.distanceTo(a.clone().lerp(b, 0.5));
      list.push({ a, b, color: new THREE.Color(RELATION_TYPES[type]?.color || '#fff'), broken, strength, width: Math.max(0.07, cd * 0.0042) });
    };
    const sel = W.selected;
    if (sel && alive(sel)) {
      const ents = [sel];
      for (const r of reg.panelRelations(sel.sp.id)) {
        const other = nearestOf(r.targetId, sel.isPlant ? _w.set(sel.x, sel.y, sel.z).clone() : sel.pos);
        if (!other) continue;
        const known = W.discovered.has(r.key);
        // energy flows from food to eater; pollinator → flower etc.
        if (r.dir === 'out') { if (r.type === 'eats') addLink(other, sel, r.type, false, known ? 1 : 0.45); else addLink(sel, other, r.type, false, known ? 1 : 0.45); }
        else { if (r.type === 'eats') addLink(sel, other, r.type, false, known ? 1 : 0.45); else addLink(other, sel, r.type, false, known ? 1 : 0.45); }
      }
    }
    if (webMode) {
      const present = new Set(W.aliveSpecies());
      for (const e of reg.edges) {
        if (!present.has(e.from) || !present.has(e.to)) continue;
        const A = W.animals.find(a => a.sp.id === e.from && alive(a)) || W.plants.find(p => p.sp.id === e.from && alive(p));
        const B = W.animals.find(a => a.sp.id === e.to && alive(a)) || W.plants.find(p => p.sp.id === e.to && alive(p));
        if (!A || !B) continue;
        if (sel && (A.sp.id === sel.sp.id || B.sp.id === sel.sp.id)) continue;
        if (e.type === 'eats') addLink(B, A, e.type, false, W.discovered.has(e.key) ? 0.8 : 0.35); else addLink(A, B, e.type, false, W.discovered.has(e.key) ? 0.8 : 0.35);
      }
    }
    // experiment: broken links from the missing species' last positions
    if (W.experiment) {
      for (const d of W.experiment.ghosts) list.push(d);
    }
    for (const L of tmpLinks) if (W.simT < L.until && alive(L.from) && alive(L.to)) { if (L.type === 'eats') addLink(L.to, L.from, L.type, false, 1.2); else addLink(L.from, L.to, L.type, false, 1.2); }
    links.set(list);
  }

  // pointer → world
  function pick(clientX, clientY, { plants = true, animals = true } = {}) {
    const rect = canvas.getBoundingClientRect();
    _ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    _ray.setFromCamera(_ndc, camera);
    let best = null, bestT = Infinity;
    if (animals) {
      for (const a of W.animals) {
        if (!alive(a) || a.leaving) continue;
        a.focusPoint(_v); const p = _v.clone().project(camera);
        if (p.z > 1) continue;
        const sx = (p.x + 1) / 2 * rect.width, sy = (1 - p.y) / 2 * rect.height;
        const d = Math.hypot(sx - (clientX - rect.left), sy - (clientY - rect.top));
        const rad = 26 + Math.min(40, (a.vis.length || 1) * a.obj.scale.x * 300 / Math.max(5, camera.position.distanceTo(_v)));
        if (d < rad) { const t = camera.position.distanceTo(_v) + d * 0.05; if (t < bestT) { bestT = t; best = a; } }
      }
      if (best) return best;
    }
    if (plants) {
      const ro = _ray.ray.origin, rd = _ray.ray.direction;
      for (const p of W.plants) {
        if (!alive(p)) continue;
        const c = p.vis.crown(); const s = p.obj.scale.x;
        const cy = p.y + (c.top + c.bottom) / 2 * s; const cr = Math.max(0.5, c.radius * s * 0.8, (c.top - c.bottom) * s * 0.45);
        // ray-sphere
        _v.set(p.x - ro.x, cy - ro.y, p.z - ro.z); const tca = _v.dot(rd); if (tca < 0) continue;
        const d2 = _v.lengthSq() - tca * tca;
        if (d2 < cr * cr) { const t = tca - Math.sqrt(cr * cr - d2); if (t < bestT) { bestT = t; best = p; } }
        // trunk
        if (p.isTree) {
          const ty = p.y + c.bottom * s * 0.5; _v.set(p.x - ro.x, ty - ro.y, p.z - ro.z); const tc = _v.dot(rd); const dd = _v.lengthSq() - tc * tc;
          const tr = Math.max(0.7, (p.vis.trunkRadius || 0.3) * 2.2); if (tc > 0 && dd < tr * tr && tc < bestT) { bestT = tc; best = p; }
        }
      }
    }
    return best;
  }
  function groundHit(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    _ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    _ray.setFromCamera(_ndc, camera);
    const hits = _ray.intersectObjects([...env.groundMeshes, ...env.waterMeshes], false);
    if (!hits.length) return null;
    const h = hits[0].point; return { x: h.x, z: h.z, y: h.y, water: env.waterMeshes.includes(hits[0].object) };
  }

  // ─────────────────────────────────────────── drag & drop from the tray
  let dragState = null;
  function dragStart({ id, x, y }) {
    if (dragState) { const old = dragState; dragState = null; markers.showGhost(null); disposeDragModel(old); }
    if (id.startsWith('tool:')) {
      const tid = id.slice(5); audio.play('pickup');
      dragState = { tool: tid, sp: { id, name: TOOL_DEFS.find(d => d.id === tid)?.name, isPlant: false }, model: tools.model(tid) };
      dragMove({ id, x, y }); return;
    }
    const sp = reg.byId.get(id); if (!sp) return;
    audio.play('pickup');
    let model = null;
    try {
      if (sp.isPlant) { const v = plantBuilders[id]({ seed: 5, rng: makeRng(5), hostHeight: 8, hostRadius: 0.4 }); v.setGrowth(sp.kind === 'tree' || sp.kind === 'palm' ? 0.22 : 0.7); v.setHealth(1); model = v.object; dragState = { sp, vis: v }; }
      else { const v = animalBuilders[id]({ seed: 5, rng: makeRng(5) }); if (v.type === 'animal') { v.object.scale.setScalar(1.15 * Math.pow(Math.max(1, 0.9 / (v.length || 1)), 0.6)); v.update(0.016, { action: sp.locomotion === 'flying' ? 'hover' : 'idle', speed: 0, t: 0, night: 0 }); } model = v.object; dragState = { sp, vis: v }; }
    } catch (e) { dragState = { sp }; }
    dragState.model = model;
    dragMove({ id, x, y });
  }
  function dragMove({ x, y }) {
    if (!dragState) return;
    const hit = groundHit(x, y);
    const chk = dragState.tool ? tools.check(dragState.tool, hit) : checkPlace(dragState.sp, hit);
    dragState.hit = hit; dragState.chk = chk;
    if (dragState.tool) {
      if (hit) { const pos = chk.host ? new THREE.Vector3(chk.host.x, chk.host.y + 4, chk.host.z) : chk.target ? chk.target.pos.clone() : new THREE.Vector3(hit.x, hit.y, hit.z); markers.showGhost(pos, chk.ok, 1.6, dragState.model, 3, false); if (dragState.tool === 'drone' || dragState.tool === 'seeddrone') dragState.model.position.y += 3; }
      else markers.showGhost(null);
      ui.setDragHint(hit ? { valid: chk.ok, text: chk.ok ? (chk.text || 'שחררו כדי להציב') : chk.reason } : { valid: false, text: 'גררו אל האי' });
      return;
    }
    if (hit) {
      let pos = new THREE.Vector3(hit.x, chk.host ? env.heightAt(hit.x, hit.z) : hit.y, hit.z);
      if (chk.host) pos.set(chk.host.x, chk.host.y, chk.host.z);
      const r = dragState.sp.isPlant ? (dragState.sp.kind === 'tree' ? 2.4 : dragState.sp.kind === 'palm' ? 1.8 : 1.1) : 1.3;
      markers.showGhost(pos, chk.ok, r, dragState.model, chk.host ? chk.host.topY() - chk.host.y : 3, chk.warn);
      if (dragState.model && chk.host && dragState.sp.kind === 'epiphyte') { const pts = chk.host.vis.attachPoints(); if (pts[0]) { chk.host.obj.updateMatrixWorld(); dragState.model.position.copy(pts[0].pos).applyMatrix4(chk.host.obj.matrixWorld); } }
      if (dragState.model && dragState.sp.locomotion === 'flying') dragState.model.position.y += 2;
    } else markers.showGhost(null);
    ui.setDragHint(hit ? { valid: chk.ok, text: chk.ok ? (chk.text || 'שחררו כדי למקם') : chk.reason } : { valid: false, text: 'גררו אל האי' });
  }
  // the preview model is ours alone: species visuals know which of their parts are shared caches; tool models are all own
  function disposeDragModel(st) {
    try { if (st.vis?.dispose) st.vis.dispose(); else if (st.tool && st.model) disposeObject(st.model); } catch (e) { }
  }
  function dragEnd({ x, y, cancelled }) {
    if (!dragState) return;
    const st = dragState; dragState = null;
    markers.showGhost(null); ui.setDragHint(null);
    disposeDragModel(st);
    if (cancelled) return;
    const hit = groundHit(x, y);
    if (st.tool) { const c = tools.check(st.tool, hit); if (!c.ok) { audio.play('invalid'); ui.toast(c.reason, 'warn'); return; } tools.use(st.tool, hit, c); moments?.onTool(st.tool); refreshTray(); return; }
    const chk = checkPlace(st.sp, hit);
    if (!chk.ok) { audio.play('invalid'); ui.toast(chk.reason, 'warn'); return; }
    place(st.sp, hit, chk); moments?.onPlace(st.sp);
    if (!W.selected) { showPanel(st.sp.id, true); }
  }

  // ─────────────────────────────────────────── events (decisions)
  let pendingEvent = null;
  W.runEvent = (e) => {
    if (W.listener && (e.start || []).some(fx => fx.type === 'logging')) {
      missions.resolve(e); W.points += 10; audio.play('mission'); report?.event(e.id, 'listener');
      ui.showOutcome({ title: 'מאזין היער עצר כריתה!', text: 'מאזין היער שמע רעש של מסור חשמלי ושלח התרעה לשומרי היער. הם הגיעו בזמן, והעצים לא נכרתו. (+10)\n\nיש היום חיישנים כאלה באמת: טלפונים ישנים עם לוח סולארי, שנתלים גבוה על עצים ומקשיבים ליער כל היום וכל הלילה.' });
      return;
    }
    pendingEvent = e;
    for (const fx of e.start || []) applyEffect(fx);
    audio.play('event');
    if (rig.following) rig.stopFollow();
    ui.showEvent({ id: e.id, title: e.title, text: e.text, choices: e.choices.map(c => ({ id: c.id, label: c.label })) });
  };
  function chooseEvent({ eventId, choiceId }) {
    const e = missions.events.find(x => x.id === eventId); if (!e) return;
    const c = e.choices.find(x => x.id === choiceId); if (!c) return;
    for (const fx of c.effects || []) applyEffect(fx);
    missions.resolve(e);
    report?.event(e.id, c.id);
    if (/^(a_noagouti|g_nojay)$/.test(e.id)) W.stats.experiments++;
    pendingEvent = null;
    ui.showOutcome({ title: e.title, text: c.outcome });
  }
  function applyEffect(fx) {
    const sp = fx.species ? reg.byId.get(fx.species) : null;
    switch (fx.type) {
      case 'treeFall': {
        const cand = W.plants.filter(p => alive(p) && p.isTree && !p.falling && p.growth > 0.5 && (fx.target === 'tallest' || p.sp.id === fx.target));
        cand.sort((a, b) => b.topY() - a.topY());
        const t = cand[0]; if (!t) break;
        const dir = Math.atan2(t.z, t.x) + (Math.random() - 0.5) * 0.8; // fall outward
        t.fall(dir); W.treeFallen = true; W.gapPos = { x: t.x, z: t.z }; lightDirty = true;
        for (const p of W.plants) if (p.host === t) p.die('fall');
        W.storm = 1; W.stormT = 25; W.rainTarget = 1; W.rainT = Math.max(W.rainT, 25);
        rig.focusOn(new THREE.Vector3(t.x, t.y + 8, t.z), 40);
        break;
      }
      case 'rain': W.rainTarget = 1; W.rainT = Math.max(W.rainT, fx.seconds || 30); W.drought = Math.max(0, W.drought - 0.5); W.droughtT = 0; break;
      case 'drought': if (W.weatherStation) { fx = { ...fx, strength: (fx.strength ?? 0.6) * 0.55 }; ui.toast('תחנת מזג האוויר התריעה מראש – היער התכונן, והבצורת פחות קשה', 'info'); }
        W.drought = fx.strength ?? 0.6; W.droughtT = fx.seconds || 60; W.rainT = 0; W.rainTarget = 0; break;
      case 'heat': W.heat = 1; W.heatT = fx.seconds || 40; W.drought = Math.max(W.drought, 0.35); W.droughtT = Math.max(W.droughtT, fx.seconds || 40); break;
      case 'flood': W.flood = W.weatherStation ? 0.5 : 1; W.floodT = (fx.seconds || 40) * (W.weatherStation ? 0.6 : 1); break;
      case 'fire': {
        const s = (fx.strength ?? 0.5) * (W.weatherStation ? 0.5 : 1);
        if (W.weatherStation) ui.toast('תחנת מזג האוויר זיהתה חום ורוח – האש התגלתה מוקדם והייתה קטנה', 'info');
        let fx0 = null;
        const cand = W.plants.filter(p => alive(p) && (p.isTree || p.sp.kind === 'shrub') && Math.hypot(p.x, p.z) > 12);
        if (cand.length) { const p = cand[(Math.random() * cand.length) | 0]; fx0 = { x: p.x, z: p.z }; }
        else { const a = Math.random() * Math.PI * 2; fx0 = { x: Math.cos(a) * 24, z: Math.sin(a) * 24 }; }
        W.fires.push({ x: fx0.x, z: fx0.z, r: 4 + s * 9, intensity: 0, t: 0, dur: 26 + s * 10 });
        rig.focusOn(new THREE.Vector3(fx0.x, 4, fx0.z), 34);
        break;
      }
      case 'points': W.points += fx.amount || 0; break;
      case 'unlock': if (sp) unlock(sp.id, true); break;
      case 'add': if (sp) addSpecies(sp, fx.count || 1); break;
      case 'plant': if (sp) {
        const spots = fx.where === 'gap' ? light.brightSpots((fx.count || 1) * 3, 4) : [];
        let n = 0;
        for (const s of spots) { if (n >= (fx.count || 1)) break; if (env.isPlaceable(s.x, s.z) && spacingOK(sp, s.x, s.z)) { if (spawnPlant(sp, s.x, s.z, { growth: 0.12 })) n++; } }
        while (n < (fx.count || 1)) { const s = randomPlaceSpot(sp); if (!s) break; if (spawnPlant(sp, s.x, s.z, { growth: 0.12 })) n++; else break; }
        W.everPlaced.add(sp.id);
      } break;
      case 'remove': if (sp) {
        const ents = [...W.plants.filter(p => p.sp.id === sp.id && alive(p)), ...W.animals.filter(a => a.sp.id === sp.id && alive(a) && !a.leaving)];
        const n = fx.count === 'all' ? ents.length : Math.min(ents.length, fx.count || 1);
        for (let i = 0; i < n; i++) { const e = ents[i]; if (e.isPlant) e.die('event'); else e.leave(); }
      } break;
      case 'logging': {
        if (W.protected) break;
        const trees = W.plants.filter(p => alive(p) && p.isTree && !p.falling && p.growth > 0.5).sort((a, b) => Math.hypot(b.x, b.z) - Math.hypot(a.x, a.z));
        const n = Math.min(fx.count || 2, trees.length);
        for (let i = 0; i < n; i++) {
          const t = trees[i];
          addStump(t.x, t.z, Math.max(0.35, (t.vis.trunkRadius || 0.5) * (0.6 + 0.4 * t.growth)));
          for (const q of W.plants) if (q.host === t) q.die('fall');
          W.onPlantDied(t, 'logged'); t.alive = false; W.removeEntity(t);
        }
        if (n) { rig.focusOn(new THREE.Vector3(trees[0].x, 3, trees[0].z), 30); lightDirty = true; }
        break;
      }
      case 'protect': W.protected = true; ui.toast('היער הוא עכשיו שמורת טבע 🛡', 'good'); break;
      case 'road': buildRoad(); break;
      case 'ecoBridge': buildBridge(); break;
      case 'removeRoad': removeRoad(); break;
      case 'boost': if (sp) {
        const a = fx.amount || 0.3;
        for (const p of W.plants) if (p.sp.id === sp.id && alive(p)) { p.health = clamp(p.health + a); p.growth = clamp(p.growth + a * 0.4); p.fruit = clamp(p.fruit + a); if (p.sp.pollinators.length === 0) p.bloom = clamp(p.bloom + a); }
        for (const x of W.animals) if (x.sp.id === sp.id && alive(x)) x.energy = clamp(x.energy + a);
      } break;
    }
  }
  function randomPlaceSpot(sp, ignore) {
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * (env.radius - 2);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (sp.kind === 'water-plant') { if (env.isWater(x, z)) return { x, z }; continue; }
      if (!env.isPlaceable(x, z) || !spacingOK(sp, x, z, ignore)) continue;
      if (W.onRoad && W.onRoad(x, z, 0.8)) continue;
      if (sp.needs?.rocks && !W.nearRock(x, z, 3)) continue;
      return { x, z };
    }
    return null;
  }
  function addSpecies(sp, count) {
    if (sp.isPlant) {
      for (let i = 0; i < count; i++) {
        if (sp.needs?.host) { const hosts = W.plants.filter(p => alive(p) && p.isTree && p.growth > 0.5 && p.vis.attachPoints().length); if (!hosts.length) break; const h = hosts[(Math.random() * hosts.length) | 0]; spawnPlant(sp, h.x, h.z, { host: h }); }
        else { const s = randomPlaceSpot(sp); if (s) spawnPlant(sp, s.x, s.z, { growth: sp.kind === 'fungus' ? 0.7 : 0.25 }); }
      }
    } else {
      let base = null;
      if (sp.needs?.water && env.water) { const pts = env.water.path || env.water.pools || []; const p = pts[(Math.random() * pts.length) | 0]; if (p) base = { x: p.x + 4, z: p.z + 4 }; }
      if (!base) base = randomPlaceSpot({ kind: 'herb', needs: sp.needs }) || { x: 0, z: 0 };
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2; let x = base.x + Math.cos(a) * 2, z = base.z + Math.sin(a) * 2;
        if (!env.isPlaceable(x, z)) { x = base.x; z = base.z; }
        spawnAnimal(sp, new THREE.Vector3(x, env.heightAt(x, z), z));
      }
    }
    W.everPlaced.add(sp.id);
  }
  function unlock(id, announce) {
    if (W.unlocked.has(id)) return;
    W.unlocked.add(id);
    if (announce) ui.toast(`נפתח: ${reg.byId.get(id)?.name}`, 'good');
    refreshTray();
  }
  W.missionCompleted = (m) => {
    report?.mission(m.id);
    W.points += m.reward?.points || 0;
    const names = [];
    for (const id of m.reward?.unlock || []) { unlock(id, false); names.push(reg.byId.get(id)?.name); }
    audio.play('mission');
    // a card pack for two missions out of every three (not every one – packs should stay special)
    if (missions.doneCount % 3 !== 0) { try { window.__wolLearn?.grantPack(1); } catch (e) { } }
    // torah edition: a mission from the sources gives its source card for the album ("מן המקורות")
    let srcText = '';
    if (m.reward?.source) { const card = SOURCE_CARDS.find(c => c.id === m.reward.source); if (card && grantSource(card.id)) srcText = ' · קלף מקור חדש באלבום: ' + card.title; }
    ui.missionDone({ title: m.title, rewardText: `+${m.reward?.points || 0} נקודות חיים${names.length ? ' · נפתחו: ' + names.join(', ') : ''}${srcText}` });
    refreshTray();
    if (W.experiment) W._saveAfterExperiment = true; else saveGame(true);
  };

  // ─────────────────────────────────────────── experiment ("what if it disappears?")
  function startExperiment(id) {
    if (W.research) return;   // a mystery has its own experiments (its ideas); taking a species away would break its numbers
    const sp = reg.byId.get(id);
    const ents = [...W.plants.filter(p => p.sp.id === id && alive(p)), ...W.animals.filter(a => a.sp.id === id && alive(a) && !a.leaving)];
    if (!ents.length) { ui.toast(`אין ${sp.name} באי – אין מה לבדוק.`, 'warn'); return; }
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
    lightDirty = true;
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
    W.experiment = null; W.speed = W.prevSpeed || 1; lightDirty = true;
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
    let txt = lines.length ? `בלי ה${X.sp.name}:\n${lines.join('\n')}` : `נראה שאף מין אחר באי לא היה תלוי ב${X.sp.name} – עדיין. נסו להוסיף מינים שקשורים אליו ולבדוק שוב.`;
    if (X.energy0 != null && e1 != null && e1 < X.energy0 - 0.03) txt += `\n\nהשובע של בעלי החיים התלויים בו ירד מ־${Math.round(X.energy0 * 100)}% ל־${Math.round(e1 * 100)}%.`;
    txt += `\n\nכל מין הוא חוליה ברשת. כשחוליה אחת נעלמת – אחרים מרגישים בזה.`;
    if (reward) txt += `\n\n(+10 נקודות על ניסוי חדש)`;
    if (W._saveAfterExperiment) { W._saveAfterExperiment = false; saveGame(true); }
    ui.showDialog({ title: `תוצאות הניסוי: ${X.sp.name}`, text: txt, buttons: [{ id: 'ok', label: 'הבנתי – ה' + X.sp.name + ' ' + gw(X.sp.id, 'חזר', 'חזרה', 'חזרו', 'חזרו') }] });
    audio.play('discover');
    rebuildLinks();
  }

  // ─────────────────────────────────────────── tray / HUD
  function trayCards() {
    const order = { emergent: 0, canopy: 1, understory: 2, floor: 3, water: 4, air: 5 };
    const list = biome.species.slice().sort((a, b) => (a.isPlant === b.isPlant ? 0 : a.isPlant ? -1 : 1) || (order[a.layer] ?? 9) - (order[b.layer] ?? 9) || a.cost - b.cost);
    return list.map(sp => {
      const m = missions.missions.find(mm => (mm.reward?.unlock || []).includes(sp.id));
      return {
        id: sp.id, name: sp.name, kind: sp.kind, layer: sp.layer, layerName: sp.layerName, cost: sp.cost,
        locked: !W.unlocked.has(sp.id), lockText: m ? `משימה: ${m.title}` : 'נפתח באירוע',
        canAfford: W.points >= sp.cost, alive: W.countAlive(sp.id), thumb: thumbs[sp.id] || null, color: sp.color,
        isNew: W.unlocked.has(sp.id) && sp.unlock !== 'start' && !W.seenNew.has(sp.id),
      };
    });
  }
  function refreshTray() { if (W.research) return; ui.setTray(tools ? [...trayCards(), ...tools.cards()] : trayCards()); }

  // ─────────────────────────────────────────── save / load (localStorage, optional)
  const SAVE_KEY = profileKey('web-of-life-' + biome.id);   // per player
  function saveProgress() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ unlocked: [...W.unlocked], done: missions.missions.filter(m => m.done).map(m => m.id), discovered: [...W.discovered], placed: [...W.everPlaced], quiz: [...W.quizDone] })); } catch (e) { }
  }

  // ─────────────────────────────────────────── UI bus wiring
  const offs = [];
  const on = (n, f) => offs.push(bus.on(n, f));
  on('drag:start', dragStart); on('drag:move', dragMove); on('drag:end', dragEnd);
  on('drag:denied', ({ id, reason }) => { audio.play('invalid'); const sp = reg.byId.get(id) || { name: TOOL_DEFS.find(d => 'tool:' + d.id === id)?.name, cost: TOOL_DEFS.find(d => 'tool:' + d.id === id)?.cost }; ui.toast(reason === 'locked' ? `${sp?.name} עוד נעול – השלימו משימות כדי לפתוח` : reason === 'cost' ? `צריך ${sp?.cost} נקודות חיים` : 'אי אפשר עכשיו', 'warn'); });
  on('card:click', ({ id }) => { if (id.startsWith('tool:')) { const d = TOOL_DEFS.find(t => 'tool:' + t.id === id); if (d) ui.showDialog({ title: d.name, text: d.fact + '\n\n' + d.hint + `\nמחיר: ${d.cost} נקודות חיים.`, buttons: [{ id: 'ok', label: 'הבנתי' }] }); return; } W.seenNew.add(id); showPanel(id, true); audio.play('click'); refreshTray(); });
  on('time:speed', ({ speed }) => { if (!W.experiment) W.speed = speed; });
  on('species:select', ({ id }) => { const e = nearestOf(id, rig.controls.target); if (e) { select(e); rig.focusOn(e.focusPoint(new THREE.Vector3()), e.isPlant && e.isTree ? 30 : 12); } else showPanel(id, true); });
  on('species:close', () => { select(null); panelId = null; });
  on('species:follow', ({ id }) => { const e = (W.selected && W.selected.sp.id === id) ? W.selected : nearestOf(id, rig.controls.target); if (e) { const size = e.isPlant ? Math.max(6, (e.topY() - e.y) * 1.4) : Math.max(5, (e.vis.length || 1) * e.obj.scale.x * 5); rig.followEntity(e, size); W.selected = e; rebuildLinks(); } });
  on('species:experiment', ({ id }) => startExperiment(id));
  on('species:tour', ({ id }) => { if (tour) tour.start(id); });
  on('experiment:end', () => endExperiment());
  on('relation:reveal', ({ from, to, type }) => {
    const r = reg.panelRelations(from).find(x => x.targetId === to && x.type === type);
    if (!r) return;
    const otherPresent = W.countAlive(to) > 0, selfPresent = W.countAlive(from) > 0;
    if (!selfPresent || !otherPresent) { ui.toast(`כדי לגלות את הקשר, הביאו לאי גם את ${reg.byId.get(selfPresent ? to : from)?.name}.`, 'info'); return; }
    const A = nearestOf(from, rig.controls.target), B = nearestOf(to, rig.controls.target);
    const [f, t] = r.dir === 'out' ? [A, B] : [B, A];
    if (f && t) W.observe(f, t, type);
  });
  on('quiz:answer', ({ id, correct }) => { if (correct && !W.quizDone.has(id)) { W.quizDone.add(id); W.points += 5; audio.play('quizRight'); } else if (!correct) audio.play('quizWrong'); refreshPanel(); });
  on('event:choice', chooseEvent);
  on('outcome:close', () => { audio.play('click'); });
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
      if (shafts.length) {
        target = { x: shafts[0].gx, z: shafts[0].gz };
        const near = W.plants.filter(p => alive(p) && p.isTree && p.growth > 0.6).map(p => ({ p, d: Math.hypot(p.x - target.x, p.z - target.z) })).filter(o => o.d > 7 && o.d < 22).sort((a, b) => a.d - b.d)[0];
        if (near) { const a = Math.atan2(target.z - near.p.z, target.x - near.p.x); const off = (near.p.vis.trunkRadius || 0.6) * 3 + 4.5; camAt = { x: near.p.x + Math.cos(a) * off, z: near.p.z + Math.sin(a) * off }; if (blocked(camAt.x, camAt.z)) camAt = null; }
      }
      else { const trees = W.plants.filter(p => alive(p) && p.isTree && p.growth > 0.6).sort((a, b) => b.topY() - a.topY()); if (trees[0]) target = { x: trees[0].x + 4, z: trees[0].z + 4 }; }
    }
    rig.setLayer(id === 'all' ? 'all' : id, L?.yRange, { target, blocked, camAt: id === 'floor' ? camAt : null });
  }
  on('view:reset', () => rig.reset());
  on('toggle:lightmap', ({ on: v }) => { W.lightmap = v; env.setLightOverlay(v ? light.texture : null); if (v) ui.toast('מפת האור: צהוב = הרבה אור · כחול = צל עמוק', 'info'); });
  on('toggle:web', ({ on: v }) => { webMode = v; rebuildLinks(); if (v) ui.toast('כל הקווים הזוהרים הם קשרים ברשת החיים', 'info'); });
  on('journal:select', ({ id }) => { ui.hideJournal(); showPanel(id, true); });
  on('ui:journal', () => openJournal());
  on('ui:help', () => startCoach(true));
  on('coach:next', () => coachNext()); on('coach:skip', () => { coachStep = -1; ui.hideCoach(); try { localStorage.setItem(profileKey('web-of-life-coach'), '1'); } catch (e) { } });
  on('dialog:button', () => { });
  on('ui:home', () => { onExit && onExit(); });

  function openJournal() {
    const sp = biome.species.map(s => {
      const rels = reg.panelRelations(s.id);
      return { id: s.id, name: s.name, thumb: thumbs[s.id], art: CARD_ART[s.id] || null, color: s.color, discovered: W.everPlaced.has(s.id), fact: s.fact, relationsFound: rels.filter(r => W.discovered.has(r.key)).length, relationsTotal: rels.length };
    });
    ui.showJournal({ species: sp, stats: { discovered: W.everPlaced.size, total: biome.species.length, relationsFound: W.discovered.size, relationsTotal: reg.edges.length } });
  }

  // tutorial
  const COACH = [
    { text: `ברוכים הבאים ל${biome.name}! ${biome.id === 'amazon' ? 'כאן כל צמח נאבק כדי להגיע אל האור.' : 'כאן העונות מחליטות מתי פורחים, מתי אוכלים ומתי חוסכים מים.'}`, target: null },
    { text: 'גררו צמח מהמגש אל האי. הטבעת הירוקה אומרת שאפשר לשתול, ואחוז האור מראה כמה שמש מגיעה לשם.', target: 'tray' },
    { text: 'כל צמח ובעל חיים עולה נקודות חיים. הנקודות מצטברות לבד כשהיער חי ובריא, ועוד יותר כשמשלימים משימות ומגלים קשרים. לחיצה על המונה מסבירה הכול.', target: 'hud' },
    { text: 'כאן המשימות שלכם. כל משימה פותחת צמחים, בעלי חיים וכלים חדשים.', target: 'missions' },
    { text: 'בלשונית "טכנולוגיה" יש כלים ששומרים על היער: רחפן ניטור, מצלמת שטח, רובוט הצלה ועוד. גוררים אותם אל האי בדיוק כמו צמחים.', target: 'tray' },
    { text: 'רוצים לרדת אל תוך היער? בחרו קומה וראו איך האור משתנה מהצמרת ועד הקרקעית.', target: 'layers' },
    { text: '"מפת אור" מראה איפה יש שמש ואיפה צל. "רשת החיים" מראה את כל הקשרים. לחצו על כל צמח או בעל חיים כדי להכיר אותו.', target: 'toolbar' },
  ];
  let coachStep = -1;
  function startCoach(force) {
    let done = false; try { done = localStorage.getItem(profileKey('web-of-life-coach')) === '1'; } catch (e) { }
    if (done && !force) return;
    coachStep = 0; showCoach();
  }
  function showCoach() { const c = COACH[coachStep]; if (!c) { ui.hideCoach(); coachStep = -1; try { localStorage.setItem(profileKey('web-of-life-coach'), '1'); } catch (e) { } return; } ui.coach({ ...c, step: coachStep + 1, total: COACH.length }); }
  function coachNext() { if (coachStep < 0) return; coachStep++; showCoach(); }

  // the points counter explains how life points are earned
  function explainPoints() {
    const perMin = Math.round((W.income || 0.2) * 60);
    ui.showDialog({ title: 'איך צוברים נקודות חיים?', text:
      'נקודות חיים הן האנרגיה של היער. בהן קונים צמחים ובעלי חיים.\n\n' +
      `• היער מייצר נקודות לבד, כל הזמן. ככל שיש יותר מינים חיים והיער בריא יותר – מהר יותר. עכשיו: בערך ${perMin} נקודות בדקה.\n` +
      '• משימה שהושלמה: 25 עד 100 נקודות.\n' +
      '• גילוי קשר חדש ברשת החיים: 5 נקודות.\n' +
      '• עץ שגדל עד הסוף: 4 · זרע שבעל חיים שתל: 2 · צאצא חדש: 2 · האבקה של פרח: 1.\n' +
      '• תשובה נכונה לשאלה בכרטיס של מין: 5 נקודות.\n\n' +
      'טיפ: אם אין מספיק נקודות, הריצו את הזמן מהר יותר (⏩) ותנו ליער לעבוד.',
      buttons: [{ id: 'ok', label: 'הבנתי' }] });
  }
  const ptsEl = document.querySelector('#ui .h-pts');
  if (ptsEl) { ptsEl.style.cursor = 'pointer'; ptsEl.style.pointerEvents = 'auto'; ptsEl.title = 'לחצו כדי לראות איך צוברים נקודות'; ptsEl.addEventListener('click', explainPoints); }
  on('drag:denied', ({ reason }) => { if (reason === 'cost') setTimeout(() => ui.toast('לחצו על מונה נקודות החיים למעלה כדי לראות איך צוברים עוד', 'info'), 1200); });

  // canvas pointer: hover & click-select
  let down = null, hoverT = 0, lastMove = null;
  const onDown = (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; audio.start(); };
  const onUp = (e) => {
    if (!down) return; const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); const dt = performance.now() - down.t; down = null;
    if (moved > 6 || dt > 600 || dragState || W.viewMode) return;
    const cam = fieldcam && fieldcam.pickAt(e.clientX, e.clientY);   // a placed field camera: look through it
    if (cam) { fieldcam.open(cam); return; }
    const hit = pick(e.clientX, e.clientY);
    if (hit) { select(hit); markers.burst(hit.focusPoint(_v), '#fff2b0', 8, { size: 0.3, speed: 1 }); }
    else {
      select(null); rig.stopFollow();
      const g = W.road && !W.road.bridge ? groundHit(e.clientX, e.clientY) : null;
      if (g && W.onRoad(g.x, g.z, 1)) offerRoadFix();
    }
  };
  const onMove = (e) => { lastMove = { x: e.clientX, y: e.clientY }; };
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointermove', onMove);
  const onLeave = () => { lastMove = null; ui.hideHover(); };
  canvas.addEventListener('pointerleave', onLeave);


  // ─────────────────────────────────────────── human impact: stumps and roads
  W.stumps = []; W.road = null; W.protected = false;
  const impactGroup = new THREE.Group(); impactGroup.name = 'human-impact'; scene.add(impactGroup);
  const barkMat = new THREE.MeshStandardMaterial({ color: '#6b4a32', roughness: 0.95 });
  const cutMat = new THREE.MeshStandardMaterial({ color: '#d9b77e', roughness: 0.8 });
  function addStump(x, z, r) {
    const g = new THREE.Group();
    const side = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.35, 0.7, 10), barkMat); side.position.y = 0.3;
    const top = new THREE.Mesh(new THREE.CircleGeometry(r * 0.96, 12).rotateX(-Math.PI / 2), cutMat); top.position.y = 0.66;
    const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.45, r * 0.52, 12).rotateX(-Math.PI / 2), barkMat); ring.position.y = 0.67;
    side.castShadow = true; g.add(side, top, ring);
    g.position.set(x, env.heightAt(x, z) - 0.05, z); g.rotation.y = Math.random() * 6;
    impactGroup.add(g); W.stumps.push({ x, z, r, mesh: g });
  }
  const segDist = (px, pz, a, b) => { const vx = b.x - a.x, vz = b.z - a.z; const t = clamp(((px - a.x) * vx + (pz - a.z) * vz) / (vx * vx + vz * vz)); return Math.hypot(px - (a.x + vx * t), pz - (a.z + vz * t)); };
  W.onRoad = (x, z, extra = 0) => !!W.road && segDist(x, z, W.road.a, W.road.b) < W.road.w / 2 + extra;
  W.blockedByRoad = (x, z) => {
    if (!W.road || !W.onRoad(x, z, 0.4)) return false;
    if (W.road.bridge && Math.hypot(x - W.road.bridge.x, z - W.road.bridge.z) < 3.6) return false;
    return true;
  };
  let roadMesh = null, bridgeMesh = null;
  function buildRoad(saved) {
    if (W.road && !saved) return;
    let a, b;
    if (saved) { a = saved.a; b = saved.b; }
    else { const ang = Math.random() * Math.PI, off = (Math.random() - 0.5) * 12; const nx = Math.cos(ang + Math.PI / 2), nz = Math.sin(ang + Math.PI / 2); const L = 48; a = { x: Math.cos(ang) * L + nx * off, z: Math.sin(ang) * L + nz * off }; b = { x: -Math.cos(ang) * L + nx * off, z: -Math.sin(ang) * L + nz * off }; }
    W.road = { a, b, w: 4.2, bridge: saved?.bridge || null };
    // the road clears everything on its path
    if (!saved) for (const p of W.plants.slice()) if (alive(p) && !p.host && W.onRoad(p.x, p.z, p.isTree ? 1.5 : 0.6)) { W.onPlantDied(p, 'road'); p.alive = false; W.removeEntity(p); }
    // ribbon mesh hugging the terrain
    const N = 90, pos = [], col = [], idx = [];
    const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len, px = -uz, pz = ux;
    const asphalt = new THREE.Color('#4a4a46'), edge = new THREE.Color('#8a7a62'), paint = new THREE.Color('#e8e2c8');
    const cols = [-1, -0.92, -0.08, 0.08, 0.92, 1];
    for (let i = 0; i <= N; i++) {
      const t = i / N, cx = a.x + dx * t, cz = a.z + dz * t;
      for (const c of cols) {
        const x = cx + px * c * W.road.w / 2, z = cz + pz * c * W.road.w / 2;
        const inside = Math.hypot(x, z) < env.radius + 6;
        pos.push(x, inside ? env.heightAt(x, z) + 0.07 : -60, z);
        const dash = Math.abs(c) < 0.1 && (i % 6) < 3; const cc = Math.abs(c) > 0.95 ? edge : dash ? paint : asphalt;
        col.push(cc.r, cc.g, cc.b);
      }
    }
    const C = cols.length;
    for (let i = 0; i < N; i++) for (let k = 0; k < C - 1; k++) { const i0 = i * C + k, i1 = i0 + 1, i2 = i0 + C, i3 = i2 + 1; if (pos[i0 * 3 + 1] < -50 || pos[i3 * 3 + 1] < -50) continue; idx.push(i0, i2, i1, i1, i2, i3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    roadMesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -2 }));
    roadMesh.receiveShadow = true; impactGroup.add(roadMesh);
    if (W.road.bridge) buildBridge(true);
    lightDirty = true;
    if (!saved) rig.focusOn(new THREE.Vector3((a.x + b.x) / 2, 2, (a.z + b.z) / 2), 55);
  }
  function buildBridge(fromSave) {
    if (!W.road) return;
    const { a, b } = W.road; const dx = b.x - a.x, dz = b.z - a.z;
    // place the crossing where the road is closest to the island centre
    const t = clamp(-(a.x * dx + a.z * dz) / (dx * dx + dz * dz)); const bx = a.x + dx * t, bz = a.z + dz * t;
    if (!fromSave) W.road.bridge = { x: bx, z: bz };
    const { x, z } = W.road.bridge;
    const grp = new THREE.Group();
    const span = W.road.w + 5, width = 5.5, H = 2.6;
    const deck = new THREE.BoxGeometry(width, 0.8, span, 4, 1, 12);
    const p = deck.attributes.position;
    for (let i = 0; i < p.count; i++) { const zz = p.getZ(i) / (span / 2); p.setY(i, p.getY(i) + H * (1 - zz * zz)); }
    deck.computeVertexNormals();
    const top = new THREE.Mesh(deck, new THREE.MeshStandardMaterial({ color: '#6f9a45', roughness: 0.95 }));
    grp.add(top);
    const bushM = new THREE.MeshStandardMaterial({ color: '#4f7f36', roughness: 1, flatShading: true });
    for (let i = 0; i < 9; i++) { const bz2 = (i / 8 - 0.5) * span * 0.8; const yy = H * (1 - (bz2 / (span / 2)) ** 2) + 0.6; const s2 = 0.5 + Math.random() * 0.4; const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(s2, 0), bushM); bush.position.set((i % 2 ? 1 : -1) * (width / 2 - 0.5), yy, bz2); grp.add(bush); }
    grp.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    grp.position.set(x, env.heightAt(x, z), z);
    grp.rotation.y = Math.atan2(dx, dz) + Math.PI / 2;
    bridgeMesh = grp; impactGroup.add(grp);
    if (!fromSave) { markers.burst(new THREE.Vector3(x, env.heightAt(x, z) + 3, z), '#bfffa0', 30, { size: 0.6 }); rig.focusOn(new THREE.Vector3(x, 2, z), 26); }
  }
  function removeRoad() {
    if (roadMesh) { disposeObject(roadMesh); roadMesh = null; }
    if (bridgeMesh) { disposeObject(bridgeMesh); bridgeMesh = null; }
    W.road = null;
  }
  function offerRoadFix() {
    ui.showDialog({ title: 'הכביש חוצה את היער', text: 'בעלי החיים שהולכים על הקרקע לא יכולים לעבור מצד לצד, והיער חתוך לשניים. אפשר לתקן:', buttons: [
      { id: 'road-bridge', label: 'לבנות מעבר אקולוגי (40 נקודות)' }, { id: 'road-remove', label: 'להעביר את הכביש מהיער (70 נקודות)' }, { id: 'road-cancel', label: 'לא עכשיו' }] });
  }
  on('dialog:button', ({ id }) => {
    if (id === 'move-shaded') {
      // only free-standing land seedlings: not water plants, not plants on a host, not hosts of other plants or devices
      const dark = W.plants.filter(p => alive(p) && !p.host && !p.falling && p.sp.kind !== 'fungus' && p.sp.kind !== 'water-plant' && p.growth < 0.6 && p.light < (p.sp.lightNeed ?? 0.5) * 0.6
        && !W.plants.some(q => q.host === p && q.alive) && !tools.hostsDevice(p));
      if (W.points < 10) { ui.toast('צריך 10 נקודות חיים', 'warn'); return; }
      const spots = light.brightSpots(dark.length * 2 + 4, 3.5);
      let n = 0;
      for (const p of dark) {
        const sp = spots.find(s => env.isPlaceable(s.x, s.z) && spacingOK(p.sp, s.x, s.z, p) && !W.onRoad(s.x, s.z, 0.8) && !(p.sp.needs?.rocks && !W.nearRock(s.x, s.z, 3))) || randomPlaceSpot(p.sp, p);
        if (!sp) continue;
        const si = spots.indexOf(sp); if (si >= 0) spots.splice(si, 1);
        p.x = sp.x; p.z = sp.z; p.y = env.heightAt(sp.x, sp.z) - 0.05; p.obj.position.set(p.x, p.y, p.z); p.pop = 0;
        markers.burst(new THREE.Vector3(p.x, p.y + 1, p.z), '#ffe08a', 14, { size: 0.4 }); n++;
      }
      if (n) { W.points -= 10; lightDirty = true; ui.toast(`${n} שתילים הועברו למקום מואר – עכשיו הם יגדלו מהר יותר`, 'good'); audio.play('grow'); }
      else ui.toast('לא מצאתי מקום מואר פנוי. אפשר לשתול במקומם צמחי צל.', 'info');
      return;
    }
    if (id === 'road-bridge' || id === 'road-remove') {
      const cost = id === 'road-bridge' ? 40 : 70;
      if (W.points < cost) { ui.toast(`צריך ${cost} נקודות חיים`, 'warn'); return; }
      W.points -= cost;
      if (id === 'road-bridge') { buildBridge(); ui.toast('המעבר האקולוגי מוכן – בעלי החיים חוצים בבטחה', 'good'); }
      else { removeRoad(); ui.toast('הכביש הוסר, והיער שוב שלם', 'good'); }
      audio.play('mission');
    }
  });

  // ─────────────────────────────────────────── save / restore the whole ecosystem
  const SAVE_SLOT = profileKey('web-of-life-save-' + biome.id + (biome.mode === 'kids' ? '-kids' : ''));   // per player
  // entities hidden by a running "what if it disappears?" experiment are still part of the forest
  const hiddenByExperiment = (e) => !!W.experiment && W.experiment.ents.includes(e) && e.alive && !e.dying;
  const keepOnSave = (e) => (alive(e) || hiddenByExperiment(e)) && !(e.isPlant && (e.falling || e.fallen));
  function serialize() {
    const plants = W.plants.filter(keepOnSave);
    const index = new Map(plants.map((p, i) => [p, i]));
    return {
      v: 1, biome: biome.id, savedAt: Date.now(), points: Math.round(W.points), day: W.day, dayFrac: W.dayFrac, season: W.season, simT: W.simT,
      unlocked: [...W.unlocked], discovered: [...W.discovered], everPlaced: [...W.everPlaced], quizDone: [...W.quizDone], seenNew: [...W.seenNew],
      stats: { pollinations: W.stats.pollinations, dispersals: W.stats.dispersals, experiments: W.stats.experiments, births: W.stats.births, toolUse: W.stats.toolUse || {}, seeded: W.stats.seeded || 0, rescues: W.stats.rescues || 0, expSpecies: W.stats.expSpecies || [] },
      missions: missions.missions.filter(m => m.done).map(m => m.id),
      missionProgress: missions.serializeProgress(),
      events: missions.events.filter(e => e.fired && e.resolved).map(e => ({ id: e.id, r: 1 })),   // fired-but-unanswered events run again after loading
      treeFallen: W.treeFallen, gapPos: W.gapPos ? { x: +W.gapPos.x.toFixed(2), z: +W.gapPos.z.toFixed(2) } : null, protected: W.protected,
      road: W.road ? { a: W.road.a, b: W.road.b, bridge: W.road.bridge } : null,
      stumps: W.stumps.map(t => ({ x: +t.x.toFixed(2), z: +t.z.toFixed(2), r: +t.r.toFixed(2) })),
      plants: plants.map(p => ({ id: p.sp.id, x: +p.x.toFixed(2), z: +p.z.toFixed(2), g: +p.growth.toFixed(3), h: +p.health.toFixed(2), w: p.wild ? 1 : 0, host: p.host ? (index.get(p.host) ?? -1) : -1, ai: p.attachIdx || 0, s: p.seed })),   // the seed keeps the same shape (and branch spots) after loading
      tools: tools ? tools.serialize() : null,
      report: report ? report.serialize() : undefined,
      animals: W.animals.filter(a => keepOnSave(a) && !a.leaving).map(a => ({ id: a.sp.id, x: +a.pos.x.toFixed(2), y: +a.pos.y.toFixed(2), z: +a.pos.z.toFixed(2), e: +a.energy.toFixed(2), g: +a.grow.toFixed(2) })),
    };
  }
  function saveGame(quiet) {
    if (W.research) return true;
    try { localStorage.setItem(SAVE_SLOT, JSON.stringify(serialize())); if (!quiet) { ui.toast('היער נשמר ✓ בפעם הבאה תוכלו להמשיך מכאן', 'good'); audio.play('points'); } return true; }
    catch (e) { if (!quiet) ui.toast('לא הצלחתי לשמור במחשב הזה', 'bad'); return false; }
  }
  W.saveGame = saveGame;
  on('ui:save', () => saveGame(false));
  on('ui:report', () => report?.open());
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
      if (e) { e.health = p.h ?? 1; e.wild = !!p.w; e.pop = 1; made[i] = e; }
    }
    for (const a of S.animals || []) {
      const sp = reg.byId.get(a.id); if (!sp) continue;
      const e = spawnAnimal(sp, new THREE.Vector3(a.x, a.y, a.z), { restore: true });
      if (e) { e.energy = a.e ?? 0.8; e.grow = a.g ?? 1; }
    }
    W._toolSave = S.tools;
    W.missionsOn = true; coachStep = -1;
    W.restored = true;
  }

  const camPad = createCameraPad(document.getElementById('ui'), rig, { onHome: () => bus.emit('view:reset') });
  tools = createTools({ W, env, scene, markers, ui, audio, rig, reg, spawnPlant, findSpotNear, camera });
  W.tools = tools;
  imv = createImmersive({ W, rig, camera, ui, camPad, refit: () => fitViewToUI(true), deselect: () => { select(null); panelId = null; rig.stopFollow(); } });
  fieldcam = createFieldCam({ W, env, tools, camera, canvas, ui, audio, imv });
  moments = createSourceMoments({ W, ui, audio });   // torah edition: short source moments in the forest
  tour = createTour({ W, env, reg, camera, canvas, ui, audio, imv, missions, art: (id) => thumbs[id] || CARD_ART[id] || null });

  // ─────────────────────────────────────────── start state
  ui.setBiome({ id: biome.id, name: biome.name, layers: biome.layers.map(l => ({ id: l.id, name: l.name, desc: l.desc })), hasSeasons: biome.id === 'grove' });
  ui.setLayers(biome.layers.map(l => ({ id: l.id, name: l.name })), 'all');
  ui.setToggles({ lightmap: false, web: false, sound: !audio.muted, quality: pipe.quality === 'min' ? 'low' : pipe.quality });
  ui.setTips(biome.tips);
  // a saved forest, or a few wild things so a new island never starts empty
  let session = null;
  if (research) session = createResearchSession({ W, C: research, env, reg, scene, light, markers, rig, ui, audio, bus, tools, fieldcam, thumbs, spawnPlant, spawnAnimal, randomPlaceSpot, findSpotNear, addStump, select, refit: () => fitViewToUI(true), exit: () => onExit && onExit() });
  else if (save) restore(save); else seedStartingNature();
  report = research ? null : createFieldReport({ W, reg, biome, light, missions, thumbs, ui, bus, audio, saved: save && save.report });   // a mystery has its own lab report
  W.report = report;
  if (W._toolSave) tools.restore(W._toolSave, (x, z) => W.plants.find(p => alive(p) && p.isTree && Math.hypot(p.x - x, p.z - z) < 1.5));
  updateLight(true);
  if (W.treeFallen && !W.gapPos) {   // older saves did not keep the gap: use the brightest open floor spot, or a stump
    const s = light.brightSpots(1, 4)[0] || W.stumps[0];
    if (s) W.gapPos = { x: s.x, z: s.z };
  }
  if (research) { ui.setTray([]); try { session.start(); } catch (e) { session.dispose(); session = null; throw e; } } else refreshTray();
  ui.setLoading(1, 'מוכנים!');
  audio.setBiome(biome.id);

  function seedStartingNature() {
    const sp = (id) => reg.byId.get(id);
    const put = (id, growth, n = 1) => { const s = sp(id); if (!s) return; for (let i = 0; i < n; i++) { const p = randomPlaceSpot(s); if (p) { const e = spawnPlant(s, p.x, p.z, { growth: Math.min(1, growth * (0.85 + Math.random() * 0.3)) }); if (e) { e.wild = true; e.pop = 1; } } } W.everPlaced.add(id); };
    if (W.kids) { for (const s2 of biome.species) { if (s2.kind === 'tree' || s2.kind === 'palm') put(s2.id, 0.95, 3); else if (s2.kind === 'shrub') put(s2.id, 1, 3); } return; }
    if (biome.id === 'amazon') { put('kapok', 1, 1); put('fig', 1, 5); put('cecropia', 0.9, 2); put('acai', 0.9, 4); put('fern', 1, 8); }
    else { put('oak', 0.95, 4); put('carob', 1, 2); put('pine', 1, 1); put('mastic', 1, 5); put('sage', 1, 3); put('buckthorn', 1, 2); }
  }

  // ─────────────────────────────────────────── main update
  let autoSaveT = 40, fitT = 0, hudT = 0, simTickT = 0, vitT = 0, birthT = 0, weatherT = 0, panelT = 0, hungryWarn = {}, prevNight = 0, coachStarted = false, lightningT = 0;
  function computeVitality() {
    const present = W.aliveSpecies();
    const richness = Math.min(1, present.length / 10);
    const pl = W.plants.filter(alive);
    const ph = pl.length ? pl.reduce((s, p) => s + p.health, 0) / pl.length : 0.3;
    const an = W.animals.filter(a => alive(a) && a.type === 'animal' && !a.leaving);
    const fed = an.length ? an.reduce((s, a) => s + clamp(a.energy / 0.55), 0) / an.length : 0.7;
    const ps = new Set(present); let act = 0; for (const e of reg.edges) if (ps.has(e.from) && ps.has(e.to)) act++;
    const linkScore = Math.min(1, act / Math.max(4, present.length * 1.3));
    let v = 0.3 * richness + 0.3 * ph + 0.22 * fed + 0.18 * linkScore;
    if (!pl.length) v *= 0.4;
    if (W.road && !W.road.bridge) v -= 0.12;
    return clamp(v);
  }

  function update(rdt, t) {
    const dt = ui.isModalOpen() || (session && session.paused()) ? 0 : rdt * W.speed;   // a mystery's notebook (intro, lab, the end) stops the clock too
    W.lastTickDt = dt;
    W.simT += dt;
    // time of day / seasons
    const prevFrac = W.dayFrac;
    W.dayFrac = (W.dayFrac + dt / DAY_LEN * (1 + 3 * W.nightGlow)) % 1;   // nights pass quickly
    if (W.dayFrac < prevFrac) { const ended = report ? report.dayEnded() : null; W.day++; if (biome.id === 'grove') { const i = (SEASONS.indexOf(W.season) + 1) % 4; W.season = SEASONS[i]; ui.toast(`הגיעה עונת ה${SEASON_NAMES[W.season]}`, 'info'); seasonBegins(W.season); } report?.dayBegan(ended); }
    W.seasonFrac = W.dayFrac;
    // weather
    weatherUpdate(dt, rdt);
    report?.tick(dt);
    // env
    const night = 1 - smoothstep(-0.12, 0.14, env.sun.elevation ?? 0.5);
    W.nightGlow = night;
    if (night > 0.6 && prevNight <= 0.6) { audio.play('night'); if (W.plants.some(p => p.sp.id === 'glowfungus' && alive(p)) && !W._glowNoted) { W._glowNoted = true; ui.toast('לילה! הפטריות הזוהרות מאירות את קרקעית היער.', 'good'); } }
    if (night < 0.3 && prevNight >= 0.3) audio.play('dawn');
    prevNight = night;
    // fires
    for (const f of W.fires) { f.t += dt; f.intensity = f.t < 4 ? f.t / 4 : f.t > f.dur - 8 ? Math.max(0, (f.dur - f.t) / 8) : 1; }
    if (W.fires.length && W.fires.every(f => f.t >= f.dur)) { W.fires = []; afterFire(); }
    const summerDry = biome.id === 'grove' ? (W.season === 'summer' ? 0.45 + W.seasonFrac * 0.2 : W.season === 'autumn' ? 0.35 * (1 - W.seasonFrac) : 0) : 0;
    env.update(rdt, {
      t, dayFrac: W.dayFrac, season: W.season, seasonFrac: W.seasonFrac, rain: W.rain, wind: W.wind, nightGlow: night, camera,
      vitality: W.vitality, drought: Math.max(W.drought, summerDry), fire: W.fires.filter(f => f.intensity > 0).map(f => ({ x: f.x, z: f.z, r: f.r, intensity: f.intensity })),
      lightning: W._flash ? (W._flash = false, true) : false, shafts: W.experiment ? shafts : shafts,
    });
    // light (expensive) ~ every 0.6 s or when dirty
    lightT -= rdt;
    if (lightDirty || lightT <= 0) { lightT = 0.6; lightDirty = false; updateLight(); }
    // plants
    simTickT += dt;
    if (simTickT >= 0.25) { const st = simTickT; simTickT = 0; for (const p of W.plants.slice()) p.tick(st, W); }
    for (const p of W.plants.slice()) if (!p.removed) p.frame(rdt, t, W);
    // animals
    for (const a of W.animals.slice()) if (!a.removed) { if (a.injured) tools.updateInjured(a, rdt, t); else a.update(dt, rdt, t); }
    tools.update(dt, rdt, t);
    // births
    birthT += dt;
    if (birthT > 8) { birthT = 0; if (!W.research) { births(); hungerWarnings(); } }
    // vitality & points
    vitT += dt;
    if (vitT >= 1) {
      W.vitality = damp(W.vitality, computeVitality(), 1.5, vitT);
      W.income = (0.08 + 0.022 * W.aliveSpecies().length * W.vitality) * (W.kids ? 2 : 1);   // points per second – kept low so every purchase is a decision
      W.points += vitT * W.income;
      vitT = 0;
    }
    autoSaveT -= rdt; if (autoSaveT <= 0) { if (W.experiment || pendingEvent) autoSaveT = 5; else { autoSaveT = 40; if (W.simT > 10) saveGame(true); } }
    // missions & events (start only after the welcome tutorial)
    if (!W.missionsOn && !W.research && (coachStep < 0 && coachStarted && W.simT > 4)) W.missionsOn = true;
    if (session) session.update(dt, rdt, t);
    if (W.missionsOn) missions.tick();
    moments?.tick(rdt);
    if (W.experiment) {
      W.experiment.t += rdt;
      const left = Math.max(0, Math.ceil(W.experiment.dur - W.experiment.t));
      ui.setExperiment({ active: true, name: W.experiment.sp.name, secondsLeft: left });
      if (W.experiment.t >= W.experiment.dur) endExperiment();
    }
    // HUD
    hudT -= rdt;
    if (hudT <= 0) {
      hudT = 0.25;
      ui.setHUD({ points: Math.floor(W.points), vitality: W.vitality, speciesAlive: W.aliveSpecies().length, speciesTotal: biome.species.length, dayFrac: W.dayFrac, day: W.day, season: W.season ? SEASON_NAMES[W.season] : null, seasonId: W.season, speed: W.speed, isNight: night > 0.6 });
      ui.setMissions(W.missionsOn ? missions.list() : []);
      panelT -= 0.25; if (panelT <= 0) { panelT = 1; refreshPanel(); refreshTray(); }
    }
    // links (selected / web / temp)
    linksT -= rdt;
    for (let i = tmpLinks.length - 1; i >= 0; i--) if (W.simT > tmpLinks[i].until) tmpLinks.splice(i, 1);
    if (linksT <= 0) { linksT = 0.2; if (W.selected || webMode || W.experiment || tmpLinks.length) rebuildLinks(); else links.set([]); }
    links.update(t);
    // selection marker
    if (W.selected && alive(W.selected)) { const e = W.selected; e.focusPoint(_v); const gy = env.heightAt(_v.x, _v.z); const r = e.isPlant ? Math.max(0.8, e.vis.crown().radius * e.obj.scale.x * (e.isTree ? 0.35 : 1)) : Math.max(0.6, (e.vis.length || 1) * e.obj.scale.x * 0.6); markers.select(_v, r, gy); }
    else if (W.selected) select(null);
    const px = pipe.renderer.getContext().drawingBufferHeight / (2 * Math.tan((camera.fov * Math.PI) / 360));
    markers.update(rdt, t, camera, px);
    // hover label
    hoverT -= rdt;
    if (hoverT <= 0 && lastMove && !dragState && !down && !W.viewMode) {
      hoverT = 0.12;
      const fc = fieldcam && fieldcam.pickAt(lastMove.x, lastMove.y);
      const h = fc ? null : pick(lastMove.x, lastMove.y);
      if (fc) { ui.showHover({ x: lastMove.x, y: lastMove.y, name: 'מצלמת שטח', sub: 'לחצו כדי להסתכל דרכה' }); canvas.style.cursor = 'pointer'; }
      else if (h) { const sub = h.injured ? '❗ ' + hurtText(h) : h.isPlant ? `${h.sp.kindName}${h.growth < 0.95 ? ` · גדל ${Math.round(h.growth * 100)}%` : ''}` : (h.state === 'sleep' ? gw(h.sp.id, 'ישן', 'ישנה', 'ישנים', 'ישנות') : h.state === 'eat' ? gw(h.sp.id, 'אוכל', 'אוכלת', 'אוכלים', 'אוכלות') : h.energy < 0.3 ? gw(h.sp.id, 'רעב', 'רעבה', 'רעבים', 'רעבות') : h.sp.kindName); ui.showHover({ x: lastMove.x, y: lastMove.y, name: h.sp.name, sub }); canvas.style.cursor = 'pointer'; }
      else { ui.hideHover(); canvas.style.cursor = ''; }
    }
    if (fieldcam) fieldcam.update(rdt);
    if (tour) tour.update(dt, rdt);
    rig.update(rdt);
    fitT -= rdt; if (fitT <= 0) { fitT = 0.5; fitViewToUI(false); }
    // audio ambience
    audio.update({ dayFrac: W.dayFrac, season: W.season, rain: W.rain, wind: W.wind, vitality: W.vitality, night, cameraHeight: camera.position.y, fire: W.fires.length ? 1 : 0, speed: dt > 0 ? W.speed : 0 });
    if (!coachStarted) { coachStarted = true; if (!W.restored && !W.research) setTimeout(() => startCoach(false), 900); }
  }

  function weatherUpdate(dt, rdt) {
    weatherT -= dt;
    if (weatherT <= 0) {
      weatherT = 20;
      if (W.rainT <= 0 && W.droughtT <= 0) {
        let chance = 0;
        if (biome.id === 'amazon') chance = W.dayFrac > 0.5 && W.dayFrac < 0.72 ? 0.35 : 0.06;
        else chance = W.season === 'winter' ? 0.35 : W.season === 'autumn' ? 0.12 : W.season === 'spring' ? 0.1 : 0;
        if (Math.random() < chance) { W.rainTarget = 0.6 + Math.random() * 0.35; W.rainT = 25 + Math.random() * 35; }
      }
    }
    if (W.rainT > 0) { W.rainT -= dt; if (W.rainT <= 0) W.rainTarget = 0; }
    W.rain = damp(W.rain, W.rainTarget, 0.5, dt || rdt * 0.2);
    if (W.droughtT > 0) { W.droughtT -= dt; if (W.droughtT <= 0) W.drought = 0; } else W.drought = damp(W.drought, 0, 0.2, dt);
    if (W.floodT > 0) { W.floodT -= dt; if (W.floodT <= 0) W.flood = 0; }
    if (W.heatT > 0) { W.heatT -= dt; if (W.heatT <= 0) W.heat = 0; }
    if (W.stormT > 0) { W.stormT -= dt; lightningT -= dt; if (lightningT <= 0 && W.rain > 0.6) { lightningT = 4 + Math.random() * 6; W._flash = true; audio.play('thunder'); } if (W.stormT <= 0) W.storm = 0; }
    W.wind = 0.2 + W.rain * 0.35 + W.storm * 0.45;
    W.growBoost = W.rain > 0.3 ? 1.15 : 1;
    // mushrooms after rain (grove), new ferns etc.
    if (W.rain > 0.5 && biome.id === 'grove' && W.unlocked.has('mushroom') && Math.random() < dt * 0.02 && W.countAlive('mushroom') < (reg.byId.get('mushroom')?.maxCount || 4)) {
      const trees = W.plants.filter(p => alive(p) && p.isTree);
      if (trees.length) { const tr = trees[(Math.random() * trees.length) | 0]; const s = findSpotNear(reg.byId.get('mushroom'), tr.x, tr.z, 4); if (s) { spawnPlant(reg.byId.get('mushroom'), s.x, s.z, { growth: 0.6 }); if (!W._mushNoted) { W._mushNoted = true; ui.toast('אחרי הגשם צצו פטריות ליד העצים!', 'good'); } } }
    }
  }
  function seasonBegins(s) {
    if (s === 'winter') { W.rainTarget = 0.8; W.rainT = 30; }
    if (s === 'summer') ui.toast('קיץ: אין גשם עד הסתיו. הכלניות והרקפות נחות מתחת לאדמה, והחורש חוסך מים.', 'info');
  }
  function afterFire() {
    const pine = reg.byId.get('pine');
    if (W._pineSeeds && pine) { for (let i = 0; i < W._pineSeeds; i++) { const s = findSpotNear(pine, W._pineAt.x, W._pineAt.z, 6); if (s) spawnPlant(pine, s.x, s.z, { growth: 0.05 }); } ui.toast('האצטרובלים של האורן נפתחו בחום – ונבטו אורנים חדשים!', 'good'); W._pineSeeds = 0; }
    lightDirty = true;
  }
  function births() {
    const groups = new Map();
    for (const a of W.animals) { if (!alive(a) || a.leaving || a.type !== 'animal') continue; if (!groups.has(a.sp.id)) groups.set(a.sp.id, []); groups.get(a.sp.id).push(a); }
    for (const [id, arr] of groups) {
      const sp = reg.byId.get(id);
      if (arr.length >= sp.maxCount || W.animals.length >= animalCap(sp)) continue;
      if (arr.length < 2 && !sp.isInsect) continue;
      if (!arr.some(a => a.isActive())) continue;
      const avg = arr.reduce((s, a) => s + a.energy, 0) / arr.length;
      const bird = sp.locomotion === 'flying' && !sp.isInsect && id !== 'fruitbat';
      const nearHotel = sp.isInsect && (W.insectHotels || []).some(h => arr.some(a => Math.hypot(a.pos.x - h.x, a.pos.z - h.z) < 14));
      const bonus = (bird && W.nestboxes ? 0.18 : 0) + (nearHotel ? 0.2 : 0);
      if (avg < 0.66 - bonus * 0.5 || Math.random() > 0.22 + bonus) continue;
      const parent = arr.find(a => a.energy > 0.7) || arr[0];
      const p = parent.pos.clone(); if (parent.loco !== 'flying') { p.x += (Math.random() - 0.5) * 2; p.z += (Math.random() - 0.5) * 2; }
      if (!env.isPlaceable(p.x, p.z) && parent.loco !== 'flying' && parent.loco !== 'arboreal') continue;
      if (parent.loco === 'ground') p.y = env.heightAt(p.x, p.z);
      const baby = spawnAnimal(sp, p, { baby: !sp.isInsect });
      if (baby) { parent.energy -= 0.15; W.stats.births++; W.points += 1; markers.burst(baby.focusPoint(_v), '#b6ffb0', 12, { size: 0.35 }); audio.play('pop'); if (Math.random() < 0.6) ui.toast(sp.isInsect ? `${gw(sp.id, 'עוד', 'עוד', 'עוד', 'עוד')} ${sp.name} ${gw(sp.id, 'הצטרף', 'הצטרפה', 'הצטרפו', 'הצטרפו')}!` : `משפחת ה${sp.name} גדלה!`, 'good'); }
    }
  }
  function hungerWarnings() {
    for (const a of W.animals) {
      if (!alive(a) || a.type !== 'animal' || a.energy > 0.22 || !a.sp.diet2.length) continue;
      const k = a.sp.id; if (W.simT - (hungryWarn[k] || -999) < 70) continue;
      hungryWarn[k] = W.simT;
      const foods = a.sp.diet2.map(e => reg.byId.get(e.to)?.name).filter(Boolean).slice(0, 3).join(', ');
      ui.toast(`ה${a.sp.name} ${gw(a.sp.id,'רעב! הוא אוכל','רעבה! היא אוכלת','רעבים! הם אוכלים','רעבות! הן אוכלות')}: ${foods}.`, 'warn');
    }
  }

  function dispose() {
    if (session) { session.dispose(); session = null; }
    if (report) { report.dispose(); }   // closes the report screen and keeps the child's note before the last save
    // leaving mid-experiment: bring the species back first, so nothing is lost and the banner does not stay on screen
    if (W.experiment) { restoreExperimentEntities(); W._saveAfterExperiment = false; }
    saveGame(true);
    if (dragState) { const st = dragState; dragState = null; markers.showGhost(null); ui.setDragHint(null); disposeDragModel(st); }
    ui.setExperiment({ active: false });
    ui.hideEvent?.(); ui.hideOutcome?.(); ui.hideDialog?.(); ui.hideHover?.(); ui.hideJournal?.();
    pendingEvent = null;
    for (const o of offs) o();
    if (ptsEl) ptsEl.removeEventListener('click', explainPoints);
    canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerleave', onLeave);
    for (const e of [...W.plants, ...W.animals]) { if (e.obj.parent) e.obj.parent.remove(e.obj); try { e.vis.dispose(); } catch (err) { } }
    W.plants = []; W.animals = [];
    for (const v of W.warm || []) { try { v.dispose(); } catch (err) { } }
    W.warm = null;
    try { light.texture.dispose(); } catch (err) { }
    tour.dispose(); fieldcam.dispose(); imv.dispose(); moments?.dispose();
    links.dispose(); markers.dispose(); rig.controls.dispose(); env.dispose(); tools.dispose(); camPad.dispose();
    disposeObject(impactGroup); barkMat.dispose(); cutMat.dispose(); W.stumps = []; roadMesh = null; bridgeMesh = null;
    ui.hideSpecies(); ui.hideCoach();
    if (window.__game === W) window.__game = null;   // the test hook must not keep the closed island in memory
  }

  // debug / testing hooks
  let fakeT = 0;
  window.__game = W;
  W.debug = { place: (id, x, z) => { const sp = reg.byId.get(id); const hit = { x, z, y: env.heightAt(x, z) }; const c = checkPlace(sp, hit); if (c.ok) return place(sp, hit, c); return c.reason; }, select, rig, setView, applyEffect, check: (cx, cy, id) => { const h = groundHit(cx, cy); return JSON.stringify({ h, c: checkPlace(reg.byId.get(id), h) }); }, startExperiment, endExperiment, unlockAll: () => { for (const s of biome.species) W.unlocked.add(s.id); W.allToolsUnlocked = true; refreshTray(); }, tools: () => tools, moments: () => moments, fieldcam: () => fieldcam, tour: () => tour, light: () => ({ score: light.score, shafts }), crowns: () => crowns, auto: () => { let r = ''; if (pendingEvent) { r = pendingEvent.id; chooseEvent({ eventId: pendingEvent.id, choiceId: pendingEvent.choices[0].id }); } ui.hideEvent(); ui.hideOutcome(); ui.hideDialog(); ui.hideJournal && ui.hideJournal(); return r; }, ff: (sec, step = 0.1) => { for (let i = 0; i < sec / step; i++) { if (ui.isModalOpen()) return 'modal at ' + W.simT.toFixed(0); fakeT += step; update(step, fakeT); } return 'ok ' + W.simT.toFixed(0); }, openJournal };
  return { W, update, dispose, rig };

  function tick0() { return new Promise(r => setTimeout(r, 30)); }
}
