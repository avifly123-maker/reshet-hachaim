// The game world for one biome: owns entities, simulation, input, UI wiring, missions and events.
// 1.3.2: split from the single src/game/game.js into this folder; the public API is unchanged (createGame, loaded in the
// lazy 'game' pack through src/packs/game.js; window.__game and W.debug as before). createGame builds the world state
// W, the environment and one shared context object (ctx), then calls the parts in the original creation order (event
// listeners, timers and the first update keep their order); each part reads what it needs from ctx and its results
// are merged back into ctx.
//   common.js      constants (day length, caps), scratch vectors, the far forest's tree sources, late()
//   ecology.js     queries used by entities (food, perches, room) and the ecological events they report (W.observe ...)
//   placement.js   spawning, placement checks, nursery corals, random spots, crowns and light (updateLight)
//   selection.js   selection, the species card, the links overlay, picking with the pointer
//   tray-drag.js   drag and drop from the tray (species, tools, nursery corals)
//   events.js      events and their choices, their effects (applyEffect), unlocking, a finished mission
//   experiment.js  "what if it disappears?"
//   tray.js        the tray cards (species, nursery, tools)
//   ui-bus.js      the UI bus wiring (species card, view, toggles, journal, coach buttons ...)
//   intro.js       "איך משחקים" cards, the coach, the points explanation, the first minute in a zone
//   pointer.js     canvas pointer: hover, click-select, moving plants (click or drag) and devices (drag)
//   road.js        human impact: stumps, the road and the eco-bridge
//   save.js        save / restore the whole ecosystem, a new island's wild start
//   update.js      the main update (time, weather, simulation, births, points, HUD, hover, injured-animal arrows)
//   dispose.js     leaving the forest
// State that several parts change lives on ctx (ctx.tools, ctx.report, ctx.lightDirty, ctx.dragState ...: see the ctx
// object below and each part's header). A part made early calls a later part's function through late() (common.js).
import { createSourceMoments } from '../sources.js';
import * as THREE from 'three';
import { createEnvironment } from '../../env/environment/index.js';
import { createLightSystem } from '../../sim/light.js';
import { buildRegistry, relKey, RESPROUTERS } from '../../sim/species.js';
import { createLinks, createMarkers } from '../../world/fx.js';
import { createCameraRig } from '../../world/camera.js';
import { THUMBS } from '../../data/thumbs.js';
import { CARD_ART } from '../../data/card-art.js';
import { createMissions } from '../missions.js';
import { createTools, TOOL_DEFS } from '../tools.js';
import { createCameraPad } from '../../ui/camera-pad.js';
import { setGamepadRig } from '../../ui/gamepad.js';
import { createImmersive } from '../immersive.js';
import { createFieldCam } from '../fieldcam.js';
import { createTour } from '../tour.js';
import { START_POINTS } from '../../data/common.js';
import { clamp, makeRng } from '../../core/util.js';
import { createFieldReport } from '../report.js';
import { createResearchSession } from '../../research/session.js';
import { zoneWord, setPlace } from '../../core/place.js';
import { playMode, introSeen } from '../../core/journey.js';
import { GUIDE } from '../../data/guide-lines.js';
import { createAfter } from '../after.js';   /* H: after the missions (visitors, photos, challenges, rank) */
import { MAX_ANIMALS, MAX_ALL_PLANTS, farTreeSources, addPart } from './common.js';
import { createEcology } from './ecology.js';
import { createPlacement } from './placement.js';
import { createSelection } from './selection.js';
import { createTrayDrag } from './tray-drag.js';
import { createEvents } from './events.js';
import { createExperiment } from './experiment.js';
import { createTray } from './tray.js';
import { createUiBus } from './ui-bus.js';
import { createIntro } from './intro.js';
import { createPointer } from './pointer.js';
import { createRoad } from './road.js';
import { createSave } from './save.js';
import { createUpdate } from './update.js';
import { createDispose } from './dispose.js';

export async function createGame({ pipe, ui, audio, bus, biome, plantBuilders, animalBuilders, zoneEnv = null, quality, onExit, save = null, research = null }) {
  const scene = pipe.scene, camera = pipe.camera, canvas = pipe.renderer.domElement;
  setPlace(biome.id);
  const reg = buildRegistry(biome);
  const W = {
    biome, biomeId: biome.id, reg, plantBuilders, animalBuilders,
    plants: [], animals: [], fires: [], resprouters: RESPROUTERS,
    simT: 0, day: 1, dayFrac: 0.3, season: biome.id === 'grove' ? 'winter' : null, seasonFrac: 0, nightGlow: 0,
    rain: 0, rainTarget: 0, rainT: 0, drought: 0, droughtT: 0, flood: 0, floodT: 0, heat: 0, heatT: 0, wind: 0.25, storm: 0,
    growBoost: 1, points: START_POINTS, vitality: 0.5, speed: 1, lastTickDt: 0,
    unlocked: new Set(biome.species.filter(s => s.unlock === 'start').map(s => s.id)),
    seenNew: new Set(), discovered: new Set(), everPlaced: new Set(), quizDone: new Set(),
    stats: { pollinations: {}, dispersals: 0, experiments: 0, births: 0, missionStart: {}, uprooted: 0, moved: 0, letGo: 0, lossT: -1e9 },
    treeFallen: false, experiment: null, selected: null, selectedSpecies: null, kids: biome.mode === 'kids',
    maxPlants: MAX_ALL_PLANTS, maxAnimals: MAX_ANIMALS,
    // חוקרי הטבע: a mystery case. Its population model owns births, hunger and numbers; the entities only show them
    research: research || null,
  };
  // 1.3.2 – חוויה (experience) mode: the same forest with much less to read. Only the important reaches the screen
  // (missions, unlocks, an injured animal, events), the species card is short, the HUD shows points and one health
  // meter, and רובו־דע says the rest. Never inside a mystery, never for beginners (they have their own simple mode).
  const calcXP = () => { try { return !W.research && !W.kids && playMode() === 'experience'; } catch (e) { return false; } };
  W.xp = calcXP();
  // a toast that only tells what is happening by itself (a birth, a seed, a photo...): shown in the full mode only
  // 25.10 (Avi): at most one such note every 20 seconds, and none in a tour, a close look or the photo mode
  let ambAt = -1e9;
  const amb = (text, kind, ms) => {
    if (W.xp || W.viewMode) return;
    const now = performance.now(); if (now - ambAt < 20000) return;
    ambAt = now; ui.toast(text, kind, ms);
  };
  W.amb = amb;
  // רובו־דע in the forest (src/ui/robo-guide.js, lines in src/data/guide/zone.js). Nothing from him inside a mystery.
  const guide = () => (W.research ? null : window.__guide || null);
  function robo(key, opts = {}) {
    const G = guide(), lines = GUIDE[key]; if (!G || !lines || !lines.length) return Promise.resolve('none');
    if (!(opts.key !== null && !opts.force && introSeen('g:' + key))) W._roboT = W.simT;   // when he last spoke (the day-end line waits for quiet)
    return G.say(lines, { key: 'g:' + key, tip: lines.length === 1, ...opts });
  }
  // one line from a list (a different one each time), or a line made of the game's own words (no voice for those)
  function roboOne(key, i, opts = {}) { const G = guide(), L = GUIDE[key]; if (!G || !L || !L.length) return; W._roboT = W.simT; G.say([L[((i % L.length) + L.length) % L.length]], { tip: true, ...opts }); }
  function roboSay(f, k, opts = {}) { const G = guide(); if (!G || !f) return; G.say([{ f, k: k || f, ...(opts.at ? { at: opts.at } : {}) }], { tip: true, ...opts }); }
  W.robo = robo;

  ui.setLoading(0.05, `בונים את ${zoneWord()}...`);
  await tick0();
  const env = createEnvironment(pipe, biome.id, { quality, seed: biome.id === 'amazon' ? 3 : 7, impostorTrees: farTreeSources(biome.id, plantBuilders), zoneEnv });
  W.env = env;
  const light = createLightSystem(env); W.light = light;
  const links = createLinks(scene);
  const markers = createMarkers(scene);
  const rig = createCameraRig(camera, canvas, env);
  setGamepadRig(rig);
  camera.position.set(70, 62, 86); rig.controls.target.set(0, 5, 0);
  const thumbs = THUMBS[biome.id] || (biome.id === 'reef' ? CARD_ART : {});   // the reef has no rendered thumbnails: its card paintings stand in
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
  // one shared context for the parts (see the header): the forest's basics and helpers, and the state that more than
  // one part changes; each part's results are merged into it, in creation order
  const ctx = {
    pipe, ui, audio, bus, biome, plantBuilders, animalBuilders, onExit, save, research, scene, camera, canvas, reg, W,
    calcXP, amb, guide, robo, roboOne, roboSay, env, light, links, markers, rig, thumbs, missions, fitViewToUI,
    report: null,   // "דוח החוקר" daily log (created once the forest is restored or seeded)
    tools: null,   // created once the helpers below exist
    imv: null, fieldcam: null, tour: null, moments: null,   // immersive views: looking through a field camera, the animal-eye tour
    after: null,   /* H: after the missions */
  };

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

  addPart(ctx, createEcology(ctx), 'Ecology');         // ─ queries used by entities, discovery & ecological events
  addPart(ctx, createPlacement(ctx), 'Placement');       // ─ spawning & placement, crowns & light
  addPart(ctx, createSelection(ctx), 'Selection');       // ─ selection, the species card, links, picking
  addPart(ctx, createTrayDrag(ctx), 'TrayDrag');        // ─ drag & drop from the tray
  addPart(ctx, createEvents(ctx), 'Events');          // ─ events (decisions), effects, a finished mission
  addPart(ctx, createExperiment(ctx), 'Experiment');      // ─ experiment ("what if it disappears?")
  addPart(ctx, createTray(ctx), 'Tray');            // ─ tray / HUD
  addPart(ctx, createUiBus(ctx), 'UiBus');           // ─ UI bus wiring
  addPart(ctx, createIntro(ctx), 'Intro');           // ─ "איך משחקים", the coach, the points counter
  addPart(ctx, createPointer(ctx), 'Pointer');         // ─ canvas pointer: hover, click-select, moving by dragging
  addPart(ctx, createRoad(ctx), 'Road');            // ─ human impact: stumps and roads
  addPart(ctx, createSave(ctx), 'Save');            // ─ save / restore the whole ecosystem
  const { spawnPlant, spawnAnimal, findSpotNear, select, refreshPanel, refreshTray, randomPlaceSpot, addStump,
    restore, seedStartingNature, alive, updateLight } = ctx;

  const camPad = createCameraPad(document.getElementById('ui'), rig, { onHome: () => bus.emit('view:reset') });
  ctx.tools = createTools({ W, env, scene, markers, ui, audio, rig, reg, spawnPlant, spawnAnimal, findSpotNear, camera, canvas });

  W.tools = ctx.tools;
  ctx.imv = createImmersive({ W, rig, camera, ui, camPad, refit: () => fitViewToUI(true), deselect: () => { select(null); ctx.panelId = null; rig.stopFollow(); } });
  ctx.fieldcam = createFieldCam({ W, env, tools: ctx.tools, camera, canvas, ui, audio, imv: ctx.imv });
  ctx.moments = createSourceMoments({ W, ui, audio });   // torah edition: short source moments in the forest
  ctx.tour = createTour({ W, env, reg, camera, canvas, ui, audio, imv: ctx.imv, missions, art: (id) => thumbs[id] || CARD_ART[id] || null });
  /* H: after the missions (not inside a mystery) */
  if (!research) { try { ctx.after = createAfter({ W, env, reg, scene, camera, canvas, pipe, ui, audio, bus, markers, rig, imv: ctx.imv, tools: ctx.tools, spawnAnimal, art: (id) => CARD_ART[id] || thumbs[id] || null }); W.after = ctx.after; } catch (e) { console.error(e); ctx.after = null; } }

  // ─────────────────────────────────────────── start state
  ui.setBiome({ id: biome.id, name: biome.name, layers: biome.layers.map(l => ({ id: l.id, name: l.name, desc: l.desc })), hasSeasons: biome.id === 'grove' });
  const modeName = () => (W.kids ? 'kids' : W.xp ? 'experience' : 'full');
  ui.setPlayMode(W.research ? null : modeName());
  // the play mode can change while the forest is open (the satchel's settings rows): repaint what depends on it
  const onJourney = () => { const x = calcXP(); if (x === W.xp) return; W.xp = x; ui.setPlayMode(modeName()); refreshPanel(); refreshTray(); };
  addEventListener('wol-journey', onJourney);
  ui.setLayers(biome.layers.map(l => ({ id: l.id, name: l.name })), 'all');
  ui.setToggles({ lightmap: false, web: false, sound: !audio.muted, quality: pipe.quality === 'min' ? 'low' : pipe.quality });
  ui.setTips(biome.tips);
  // a saved forest, or a few wild things so a new island never starts empty
  ctx.session = null;
  if (research) ctx.session = createResearchSession({ W, C: research, env, reg, scene, light, markers, rig, ui, audio, bus, tools: ctx.tools, fieldcam: ctx.fieldcam, thumbs, spawnPlant, spawnAnimal, randomPlaceSpot, findSpotNear, addStump, select, refit: () => fitViewToUI(true), exit: () => onExit && onExit() });
  else if (save) restore(save); else seedStartingNature();
  ctx.report = research ? null : createFieldReport({ W, reg, biome, light, missions, thumbs, ui, bus, audio, saved: save && save.report });   // a mystery has its own lab report
  W.report = ctx.report;
  if (W._toolSave) ctx.tools.restore(W._toolSave, (x, z) => W.plants.find(p => alive(p) && p.isTree && Math.hypot(p.x - x, p.z - z) < 1.5));
  updateLight(true);
  if (W.treeFallen && !W.gapPos) {   // older saves did not keep the gap: use the brightest open floor spot, or a stump
    const s = light.brightSpots(1, 4)[0] || W.stumps[0];
    if (s) W.gapPos = { x: s.x, z: s.z };
  }
  if (research) { ui.setTray([]); try { ctx.session.start(); } catch (e) { ctx.session.dispose(); ctx.session = null; throw e; } } else refreshTray();
  ui.setLoading(1, 'מוכנים!');
  audio.setBiome(biome.id);
  addPart(ctx, { camPad, onJourney }, 'start');   // for dispose

  addPart(ctx, createUpdate(ctx), 'Update');          // ─ main update
  addPart(ctx, createDispose(ctx), 'Dispose');         // ─ dispose
  const { checkPlace, place, setView, applyEffect, groundHit, startExperiment, endExperiment, chooseEvent, update,
    openJournal, dispose } = ctx;

  // debug / testing hooks
  let fakeT = 0;
  window.__game = W;
  W.debug = { place: (id, x, z) => { const sp = reg.byId.get(id); const hit = { x, z, y: env.heightAt(x, z) }; const c = checkPlace(sp, hit); if (c.ok) return place(sp, hit, c); return c.reason; }, select, rig, setView, applyEffect, check: (cx, cy, id) => { const h = groundHit(cx, cy); return JSON.stringify({ h, c: checkPlace(reg.byId.get(id), h) }); }, startExperiment, endExperiment, unlockAll: () => { for (const s of biome.species) W.unlocked.add(s.id); W.allToolsUnlocked = true; refreshTray(); }, tools: () => ctx.tools, moments: () => ctx.moments, fieldcam: () => ctx.fieldcam, tour: () => ctx.tour, light: () => ({ score: light.score, shafts: ctx.shafts }), crowns: () => ctx.crowns, auto: () => { let r = ''; if (ctx.pendingEvent) { r = ctx.pendingEvent.id; chooseEvent({ eventId: ctx.pendingEvent.id, choiceId: ctx.pendingEvent.choices[0].id }); } ui.hideEvent(); ui.hideOutcome(); ui.hideDialog(); ui.hideJournal && ui.hideJournal(); return r; }, ff: (sec, step = 0.1) => { for (let i = 0; i < sec / step; i++) { if (ui.isModalOpen()) return 'modal at ' + W.simT.toFixed(0); fakeT += step; update(step, fakeT); } return 'ok ' + W.simT.toFixed(0); }, openJournal };
  return { W, update, dispose, rig };

  function tick0() { return new Promise(r => setTimeout(r, 30)); }
}
