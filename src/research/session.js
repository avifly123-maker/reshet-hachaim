// חוקרי היער – one mystery in progress, inside a running game world (game.js creates it when `research` is set).
// It owns the population model and keeps the island showing it: the model decides how many mice, owls and shrubs
// there are; this file brings animals in, sends them away, plants seedlings and lets old shrubs wither, so the island
// always looks like the numbers. It also runs the research table (tools, ideas, hints), the balance meter, the
// fast-forward after an experiment, the lab and the end of the mystery.
import * as THREE from 'three';
import { createRunner } from './runner.js';
import { textsFor } from './texts.js';
import { createResearchUI } from './ui.js';
import { saveCaseResult, researchProgress } from './progress.js';
import { CASES } from './cases/index.js';
import { grant as grantBadge } from '../core/badges-store.js';
import { TORAH } from '../core/edition.js';
import { grantSource } from '../core/sources-store.js';
import { SOURCE_CARDS } from '../data/torah.js';

const FF_SECONDS = 90;        // model seconds shown by "see what happens"
const FF_MODEL_RATE = 3;      // during it the model runs this much faster than the island (on top of the fast speed)
const FF_SPEED = 3;           // the island's own speed while waiting
const HIST_EVERY = 2;         // model seconds between two points of the lab graphs
const BULB_REFILL = 40;       // real seconds for a new hint bulb
const _v = new THREE.Vector3();

export function createResearchSession(ctx) {
  const { W, C, env, reg, scene, markers, rig, ui, audio, tools, thumbs, spawnPlant, spawnAnimal, randomPlaceSpot, findSpotNear, addStump, select, exit } = ctx;
  const T = textsFor(C.level, C.zone);
  let runner = createRunner(C);   // the rules (costs, budget, limits, the balance clock), shared with the tests
  let model = runner.model;      // both are new after "try again" (retry)
  const known = new Map();      // board id → model time it was first measured
  let hist = [];                // [{ t, v: { id: value } }]
  let acts = runner.acts;       // [{ t, id, n }] what the child did, for the graph flags and the report
  // the experiment log (יומן ניסויים): every try, result and surprise, across "try again" (middle and advanced)
  const logs = [];
  let attempt = 1;
  const sandbox = C.level !== 'kids';
  const log = (kind, text, extra = {}) => { logs.push({ attempt, t: Math.round(model.state.t), kind, text, ...extra }); R.setLogCount && R.setLogCount(logs.length); };
  const placedTools = new Set();
  const pendingNight = [];      // tool ids that will count at night
  const alive = (e) => e.alive && !e.removed && !e.dying && !e.leaving;
  let finished = false, disposed = false, guess = null, histT = 0, syncT = 0, plantSyncT = 0, surpriseT = 0;
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!disposed) fn(); }, ms); timers.add(id); };
  let ff = null;                // { left, act } "see what happens"
  let toNight = null;           // a time-lapse to the evening for the night camera
  let baseSpeed = 1;            // the child's own speed, back when neither fast run is on
  let lastAct = null;
  const bulbs = { n: 1, max: 3, t: 0 }; let hintI = 0;
  let quadratMesh = null;
  let dilemmaShown = !C.dilemma;   // a case may bring one dilemma, once
  const measuring = {};   // the "measuring..." note of each tool, closed when its count arrives
  const zoneWord = T('zone_' + C.zone);

  // game.js and tools.js only ask whether a mystery is running, and call these two hooks
  W.research = { case: C, onSurvey: () => C.tools.filter((t) => (t.kind || t.id) === 'drone').forEach((t) => reveal(t.id)), onSeeds: () => { } };
  W.points = 1e9;   // the game's own life points are not used here; the mystery has its budget
  W.allToolsUnlocked = true;   // the game's devices (nest box, seed drone) are the research table's to use
  const offSpeed = ctx.bus ? ctx.bus.on('time:speed', ({ speed }) => { if (speed > 0) baseSpeed = speed; }) : null;   // the child's own choice wins after a fast run

  const R = createResearchUI(document.getElementById('ui'), {
    T, C, thumbs, zoneWord,
    onIdea: (id, n) => applyIdea(id, n),
    onTool: (id) => useTool(id),
    onHint: () => giveHint(),
    onLab: () => openLab(),
    onSee: () => startFF(),
    onToNight: () => startToNight(),
    onGuess: (id) => { guess = id; R.note(T('guessSaved'), { kind: 'good' }); },
    onExit: () => exit(),
    onStay: () => R.closeSolved(),
    onMore: () => exit(),
    onLog: () => R.openLog(logs, attempt),
    onRetry: () => retry(),
  });

  // ─────────────────────────────────────── the island at the start
  function start() {
    const S = C.scene || {};
    // decor: plants that are part of the picture but not of the model
    for (const [id, growth, n] of S.decor || []) {
      const sp = reg.byId.get(id); if (!sp) continue;
      for (let i = 0; i < n; i++) { const s = randomPlaceSpot(sp); if (!s) continue; const p = spawnPlant(sp, s.x, s.z, { growth }); if (p) { p.wild = true; p.pop = 1; p._decor = true; } }
    }
    if (S.stump) { const s = randomPlaceSpot({ kind: 'tree', needs: {} }); if (s) addStump(s.x, s.z, 0.9); }
    if (S.dayFrac != null) W.dayFrac = S.dayFrac;
    for (const v of C.visual || []) syncOne(v, true);
    syncPlants(true);
    record();
    R.mount();
    R.setTable(tableState());
    R.setBoard(boardState());
    R.setBulbs(bulbs.n, bulbs.max);
    R.showIntro();
    rig.setLayer && rig.setLayer('all');
  }

  // ─────────────────────────────────────── model ↔ island
  const showCount = (v, n) => {
    if (n < 0.5) return 0;
    if (v.per) return Math.max(1, Math.min(v.max, Math.round(n / v.per)));   // a big stock shown one per `per` (algae)
    if (v.scale === 'sqrt') return Math.max(1, Math.min(v.max, Math.round(1 + Math.sqrt(n) * 1.15)));
    return Math.max(0, Math.min(v.max, Math.round(n)));
  };
  function syncOne(v, instant) {
    const sp = reg.byId.get(v.species); if (!sp) return;
    if (v.plant) return;   // plants go through syncPlants
    const ents = W.animals.filter((a) => a.sp.id === sp.id && alive(a));
    // the animal being ridden or looked at is the last to go
    ents.sort((a, b) => (a.touring || a === W.selected ? 1 : 0) - (b.touring || b === W.selected ? 1 : 0)).reverse();
    const want = showCount(v, model.get(v.id));
    let diff = want - ents.length;
    let steps = instant ? Math.abs(diff) : 1;   // one at a time while playing: arrivals and departures look natural
    while (diff > 0 && steps-- > 0) { if (!bringAnimal(sp)) break; diff--; }
    while (diff < 0 && steps-- > 0) { const a = ents.pop(); if (!a || a.touring) break; if (a === W.selected) select(null); a.leave(); diff++; }
  }
  function bringAnimal(sp) {
    let pos;
    if (sp.locomotion === 'flying') {
      const a = Math.random() * Math.PI * 2;
      pos = new THREE.Vector3(Math.cos(a) * (env.radius - 6), 0, Math.sin(a) * (env.radius - 6)); pos.y = env.heightAt(pos.x, pos.z) + 6;
    } else {
      const s = randomPlaceSpot(sp); if (!s) return null;
      pos = new THREE.Vector3(s.x, env.heightAt(s.x, s.z), s.z);
    }
    return spawnAnimal(sp, pos);
  }
  // shrubs: adults are full grown; young ones are seedlings that stay small until the model says they grew up
  function syncPlants(instant) {
    const groups = new Map();
    for (const v of C.visual || []) { if (!v.plant) continue; if (!groups.has(v.species)) groups.set(v.species, {}); groups.get(v.species)[v.plant] = v; }
    for (const [sid, g] of groups) {
      const sp = reg.byId.get(sid); if (!sp) continue;
      const ents = W.plants.filter((p) => p.sp.id === sid && alive(p) && !p._decor);
      const adults = ents.filter((p) => p._adult), young = ents.filter((p) => !p._adult);
      const wT = g.white ? showCount(g.white, model.get(g.white.id)) : 0;   // sick ones (bleached corals): grown, but pale
      const aT = (g.adult ? showCount(g.adult, model.get(g.adult.id)) : 0) + wT;
      const yT = g.young ? showCount(g.young, model.get(g.young.id)) : 0;
      let n = instant ? 99 : 2;
      // young ones that grew up become adults
      while (n > 0 && young.length > yT && adults.length < aT) { const p = young.shift(); p._adult = true; if (p.baseScale) { p.baseScale = 1; p.pop = 0.5; } adults.push(p); n--; }
      const epi = sp.kind === 'epiphyte';
      const hosts = epi ? W.plants.filter((p) => alive(p) && p.isTree && p.growth > 0.5) : null;
      while (n > 0 && adults.length < aT) {
        const anchor = epi ? hosts[(Math.random() * hosts.length) | 0] : adults[(Math.random() * adults.length) | 0];
        if (epi && !anchor) break;
        const s = epi ? { x: anchor.x + 0.6, z: anchor.z } : anchor && !instant ? findSpotNear(sp, anchor.x, anchor.z, 6) : randomPlaceSpot(sp);
        if (!s) break;
        const p = spawnPlant(sp, s.x, s.z, { growth: instant ? 1 : 0.55 }); if (!p) break;
        p._adult = true; if (instant) p.pop = 1; adults.push(p); n--;
      }
      while (n > 0 && adults.length > aT) { const p = adults.sort((a, b) => a.health - b.health).shift(); p.die('old'); n--; }
      while (n > 0 && young.length < yT) {
        const anchor = adults[(Math.random() * adults.length) | 0];
        const s = anchor ? findSpotNear(sp, anchor.x, anchor.z, 5) : randomPlaceSpot(sp);
        if (!s) break;
        const p = spawnPlant(sp, s.x, s.z, { growth: 0.05 }); if (!p) break;
        p._adult = false; if (env.underwater) { p.baseScale = 0.42; p.obj.scale.setScalar(0.42); } young.push(p); n--;
        if (!instant && Math.random() < 0.5) markers.burst(_v.set(s.x, env.heightAt(s.x, s.z) + 0.3, s.z), '#b6ffb0', 8, { size: 0.25, speed: 0.8 });
      }
      while (n > 0 && young.length > yT) { const p = young.pop(); p.die('old'); n--; }
      for (const p of young) if (p.growth > 0.5) p.growth = 0.5;   // a seedling stays small until it grows up in the model
      if (g.white) {
        // the first wT adults (in a stable order) are the sick ones: when the model says they recovered, they colour up again
        adults.sort((a, b) => a.uid - b.uid).forEach((p, i) => { p.healthCap = i < wT ? 0.2 : null; });
      }
    }
  }

  // ─────────────────────────────────────── research tools
  // a tool's kind says how it measures: 'nightcam' counts at night, 'daycam' (a field camera by a plant, `near`) counts
  // right away by day, 'drone' flies over and counts, 'quadrat' counts what is on the ground, 'probe' measures at once
  // (a lab test, or a device such as the sensor buoy, `place`). The kind defaults to the id.
  const kindOf = (def) => def.kind || def.id;
  function useTool(id) {
    const def = C.tools.find((t) => t.id === id); if (!def) return;
    if (placedTools.has(id)) { R.note(def.tell, { icon: def.icon }); return; }
    placedTools.add(id);
    audio.play('place');
    const kind = kindOf(def);
    if (kind === 'daycam') {
      const host = W.plants.find((p) => alive(p) && p.sp.id === def.near && !p._decor) || W.plants.find((p) => alive(p) && p.sp.id === def.near) || W.plants.find(alive);
      const s = host ? findSpotNear({ kind: 'herb', needs: {} }, host.x, host.z, 4) || { x: host.x + 2, z: host.z } : { x: 4, z: 4 };
      const hit = { x: s.x, z: s.z, y: 0 };
      const chk = tools.check('camera', hit); if (chk.ok) tools.use('camera', hit, chk);
      rig.focusOn(_v.set(s.x, env.heightAt(s.x, s.z) + 1, s.z), 18);
      measuring[id] = R.note(T('measuring'), { icon: def.icon });
      later(() => reveal(id), 1800);
    } else if (kind === 'nightcam') {
      const rock = env.rocks && env.rocks.length ? env.rocks[(env.rocks.length / 2) | 0] : { x: 6, z: 6, r: 2 };
      const hit = { x: rock.x + rock.r + 1.5, z: rock.z + 1, y: 0 };
      const chk = tools.check('camera', hit); if (chk.ok) tools.use('camera', hit, chk);
      rig.focusOn(_v.set(hit.x, env.heightAt(hit.x, hit.z) + 1, hit.z), 18);
      if (W.nightGlow > 0.6) later(() => reveal(id), 1500);
      else { pendingNight.push(id); measuring[id] = R.note(T('camWaits'), { icon: def.icon, action: { label: T('toNight'), id: 'tonight' } }); }
    } else if (kind === 'drone') {
      const chk = tools.check('drone', { x: 0, z: 0, y: 0 }); if (chk.ok) tools.use('drone', { x: 0, z: 0, y: 0 }, chk);
      measuring[id] = R.note(T('measuring'), { icon: def.icon });
    } else if (kind === 'probe') {
      // a measurement with no figure on the ground (a lab test), or a device placed by the plants (the sensor buoy)
      if (def.place) placeDevice(def.place);
      measuring[id] = R.note(T('measuring'), { icon: def.icon });
      later(() => reveal(id), 1600);
    } else if (kind === 'quadrat') {
      const sage = W.plants.find((p) => alive(p) && p._adult) || W.plants.find(alive);
      const s = sage ? findSpotNear({ kind: 'herb', needs: {} }, sage.x, sage.z, 4) || { x: sage.x + 2, z: sage.z } : { x: 4, z: 4 };
      placeQuadrat(s.x, s.z);
      rig.focusOn(_v.set(s.x, env.heightAt(s.x, s.z) + 0.5, s.z), 12);
      measuring[id] = R.note(T('measuring'), { icon: def.icon });
      later(() => reveal(id), 1800);
    }
    R.setTable(tableState());
  }
  function placeQuadrat(x, z) {
    const g = new THREE.Group();
    const stake = new THREE.MeshStandardMaterial({ color: '#8a5a32', roughness: 0.8 });
    const cord = new THREE.MeshStandardMaterial({ color: '#f08a24', roughness: 0.6, emissive: '#5a2a00', emissiveIntensity: 0.25 });
    const S = 1.8, y0 = env.heightAt(x, z);
    for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.5, 6), stake);
      m.position.set(dx * S / 2, 0.2, dz * S / 2); m.castShadow = true; g.add(m);
    }
    for (const [cx, cz, rot] of [[0, -S / 2, 0], [0, S / 2, 0], [-S / 2, 0, Math.PI / 2], [S / 2, 0, Math.PI / 2]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(S, 0.025, 0.025), cord); m.position.set(cx, 0.3, cz); m.rotation.y = rot; g.add(m);
    }
    g.position.set(x, y0, z);
    scene.add(g); quadratMesh = g;
    markers.burst(_v.set(x, y0 + 0.5, z), '#f08a24', 14, { size: 0.3 });
  }
  function reveal(toolId) {
    const rows = C.board.filter((b) => b.tool === toolId);
    if (!rows.length) return;
    for (const b of rows) if (!known.has(b.id)) known.set(b.id, model.state.t);
    if (measuring[toolId]) { R.dropNote(measuring[toolId]); measuring[toolId] = null; }
    const def = C.tools.find((t) => t.id === toolId);
    const kind = def ? kindOf(def) : toolId;
    const head = kind === 'nightcam' ? T('camCounted') : kind === 'daycam' ? T('dayCamCounted') : kind === 'drone' ? T('droneCounted') : kind === 'probe' ? T('probeCounted') : T('quadratCounted');
    R.note(head, { icon: def && def.icon, counts: rows.map((b) => ({ name: b.name, value: shown(b), thumb: b.species ? thumbs[b.species] : null, icon: b.icon })) });
    audio.play('discover');
    R.setBoard(boardState());
  }
  const shown = (b) => Math.round(model.get(b.id) * (b.scale ?? 1));

  // ─────────────────────────────────────── ideas on the table
  const ideaCount = (id) => runner.used(id);
  const budgetLeft = () => runner.budgetLeft();
  function applyIdea(id, n) {
    const why = runner.blocked(id, n);
    if (why) { if (why !== 'unknown') { R.note(T(why === 'budget' ? 'noBudget' : 'noRoom'), { kind: 'warn' }); audio.play('invalid'); } return; }
    // what it looks like on the island
    if (id === 'nestbox' && !hangNestBox()) { R.note(T('noRoom'), { kind: 'warn' }); audio.play('invalid'); return; }
    const want = runner.ideaOf(id);
    if (want && want.place && want.place !== 'nestbox' && !placeDevice(want.place)) { R.note(T('noRoom'), { kind: 'warn' }); audio.play('invalid'); return; }
    if (id === 'seed-drone') { const a = W.plants.find((p) => alive(p) && p._adult); const hit = a ? { x: a.x, z: a.z, y: 0 } : { x: 0, z: 0, y: 0 }; const chk = tools.check('seeddrone', hit); if (chk.ok) tools.use('seeddrone', hit, chk); }
    runner.apply(id, n);
    const idea = runner.ideaOf(id);
    lastAct = { id, n };
    log('idea', idea.title + (n > 1 && idea.amounts.length > 1 ? ' (פי ' + n + ')' : ''), { icon: idea.icon, thumb: idea.icon.startsWith('species:') ? thumbs[idea.icon.slice(8)] : null });
    audio.play('place');
    R.setTable(tableState());
    R.offerSee(idea);
    syncT = 0;
  }
  function hangNestBox() {
    const used = new Set(W.research._boxTrees || []);
    const trees = W.plants.filter((p) => alive(p) && p.isTree && p.growth > 0.6 && !used.has(p));
    if (!trees.length) return false;
    const tree = trees.sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z))[0];
    const hit = { x: tree.x + 0.5, z: tree.z, y: 0 };
    const chk = tools.check('nestbox', hit); if (!chk.ok) return false;
    chk.host = tree;   // the tree chosen here, not whichever is nearest
    tools.use('nestbox', hit, chk);
    (W.research._boxTrees || (W.research._boxTrees = [])).push(tree);
    rig.focusOn(_v.set(tree.x, tree.topY() * 0.6, tree.z), 22);
    return true;
  }

  // a device the game already knows (an insect hotel), set down near the case's plants
  function placeDevice(devId) {
    const plantSp = (C.visual || []).find((v) => v.plant === 'adult');
    const near = plantSp ? W.plants.filter((p) => alive(p) && p.sp.id === plantSp.species) : [];
    const anchor = near.length ? near[(Math.random() * near.length) | 0] : null;
    const s = anchor ? findSpotNear({ kind: 'herb', needs: {} }, anchor.x, anchor.z, 4) : randomPlaceSpot({ kind: 'herb', needs: {} });
    if (!s) return false;
    const hit = { x: s.x, z: s.z, y: 0 };
    const chk = tools.check(devId, hit); if (!chk.ok) return false;
    tools.use(devId, hit, chk);
    rig.focusOn(_v.set(s.x, env.heightAt(s.x, s.z) + 1, s.z), 16);
    return true;
  }

  // ─────────────────────────────────────── "see what happens": a fast run after an experiment
  function startFF() {
    if (ff) return;
    if (!toNight) baseSpeed = W.speed || 1;
    ff = { left: FF_SECONDS, act: lastAct };
    W.speed = FF_SPEED;
    R.setFF({ on: true, p: 0 });
  }
  function endFF() {
    const f = ff; ff = null;
    W.speed = toNight ? 6 : baseSpeed;
    R.setFF({ on: false });
    const a = f.act; if (!a) return;
    let line = C.after && C.after[a.id];
    // a line that depends on the numbers: { test, below, no, ok } (or the first case's { noNest, ok })
    if (line && typeof line === 'object') line = line.test ? (model.get(line.test) < (line.below ?? 0.5) ? line.no : line.ok) : (model.get('nests') < 0.5 ? line.noNest : line.ok);
    if (line) { R.note(line, { action: { label: T('lab'), id: 'lab' } }); log('result', line); }
    lastAct = null;
  }
  function startToNight() {
    if (toNight || W.nightGlow > 0.6) return;
    if (!ff) baseSpeed = W.speed || 1;
    toNight = true;
    if (!ff) W.speed = 6;   // a quick time-lapse to the evening
  }

  // ─────────────────────────────────────── hints (bulbs that fill up again)
  function giveHint() {
    if (hintI >= C.hints.length) { R.note(T('noMoreHints')); return; }
    if (bulbs.n <= 0) { R.note(T('hintWait')); audio.play('invalid'); return; }
    bulbs.n--; R.setBulbs(bulbs.n, bulbs.max);
    R.note(C.hints[hintI++], { kind: 'hint' });
    audio.play('select');
  }

  // ─────────────────────────────────────── the lab
  function openLab() {
    const series = C.board.filter((b) => known.has(b.id)).map((b) => ({ id: b.id, name: b.name, thumb: b.species ? thumbs[b.species] : null, icon: b.icon,
      from: known.get(b.id), points: hist.filter((h) => h.t >= known.get(b.id)).map((h) => [h.t, h.v[b.id] * (b.scale ?? 1)]) }));
    R.openLab({ series, acts: acts.map((a) => ({ ...a, idea: C.ideas.find((i) => i.id === a.id) })), now: model.state.t, guess, guesses: C.guesses });
  }
  function record() { const v = {}; for (const id in model.state.v) v[id] = model.state.v[id]; hist.push({ t: model.state.t, v }); if (hist.length > 2000) hist.splice(0, hist.length - 2000); }

  // ─────────────────────────────────────── board & table data for the UI
  function boardState() {
    const prev = hist.length > 6 ? hist[hist.length - 6] : null;
    return C.board.map((b) => {
      const k = known.has(b.id);
      const v = shown(b);
      const was = prev ? Math.round(prev.v[b.id] * (b.scale ?? 1)) : v;
      return { id: b.id, name: b.name, thumb: b.species ? thumbs[b.species] : null, icon: b.icon, known: k, value: v, trend: !k ? 0 : v > was * 1.06 + 0.5 ? 1 : v < was * 0.94 - 0.5 ? -1 : 0, tool: C.tools.find((t) => t.id === b.tool) };
    });
  }
  function tableState() {
    return {
      tools: C.tools.map((t) => ({ ...t, placed: placedTools.has(t.id) })),
      ideas: C.ideas.map((i) => ({ ...i, thumb: i.icon.startsWith('species:') ? thumbs[i.icon.slice(8)] : null, used: ideaCount(i.id), full: !!(i.max && ideaCount(i.id) >= i.max), cost: i.cost })),
      budget: budgetLeft(), budgetMax: C.budget ?? 0,
    };
  }

  // ─────────────────────────────────────── every frame
  function update(dt, rdt) {
    if (!dt && !rdt) return;
    // the model follows the island's clock (and runs faster during "see what happens")
    const rate = ff ? FF_MODEL_RATE : 1;
    const mdt = dt * rate;
    if (mdt > 0) {
      const L = runner.step(mdt, W.season || null);
      histT += mdt; if (histT >= HIST_EVERY) { histT = 0; record(); }
      if (runner.solved && !finished) finish();
      R.setLights(L, runner.held, C.holdSeconds);
      if (ff) { ff.left -= mdt; R.setFF({ on: true, p: 1 - Math.max(0, ff.left) / FF_SECONDS }); if (ff.left <= 0) endFF(); }
    }
    // surprises: the numbers turned after something the child tried
    surpriseT -= rdt;
    if (surpriseT <= 0) { surpriseT = 0.5; for (const S of runner.surprises()) { R.note(S.text, { kind: 'surprise', action: { label: T('lab'), id: 'lab' } }); log('surprise', S.text); audio.play('discover'); } }
    // night for the camera
    if (pendingNight.length && W.nightGlow > 0.6) { const ids = pendingNight.splice(0); later(() => ids.forEach(reveal), 400); }
    if (toNight && W.nightGlow > 0.6) { toNight = null; if (!ff) W.speed = baseSpeed; }
    // hint bulbs fill up again
    // the dilemma comes once the child has looked around (model seconds), and never over another window
    if (!dilemmaShown && !ff && model.state.t >= (C.dilemma.at ?? 30) && !R.isOpen()) {
      dilemmaShown = true;
      R.showDilemma(C.dilemma, (id) => { const i = runner.ideaOf(id); if (i) applyIdea(id, i.amounts[0]); });
      audio.play('select');
    }
    if (bulbs.n < bulbs.max && hintI < C.hints.length && !R.isOpen()) { bulbs.t += rdt; if (bulbs.t >= BULB_REFILL) { bulbs.t = 0; bulbs.n++; R.setBulbs(bulbs.n, bulbs.max); } }
    // keep the island showing the numbers
    syncT -= rdt; if (syncT <= 0) { syncT = ff ? 0.25 : 0.5; for (const v of C.visual || []) syncOne(v, false); R.setBoard(boardState()); }
    plantSyncT -= rdt; if (plantSyncT <= 0) { plantSyncT = ff ? 0.4 : 1; syncPlants(false); }
  }

  // ─────────────────────────────────────── the end of the mystery
  function finish() {
    finished = true;
    const spent = runner.spent;
    const right = !!(guess && C.guesses.find((g) => g.id === guess)?.right);
    const thrift = spent <= (C.stars?.thrift ?? Infinity);
    const stars = [true, right, thrift];
    const first = saveCaseResult(C.id, stars, { spent, acts: acts.length });
    if (first) { try { window.__wolLearn && window.__wolLearn.grantPack && window.__wolLearn.grantPack(1); } catch (e) { /* the hub is optional */ } }
    // badges (תגים): the first mystery, three stars, every mystery, and a way of one's own
    const other = runner.otherWay();
    grantBadge('research:first');
    if (stars.every(Boolean)) grantBadge('research:stars');
    if (other) grantBadge('research:other');
    const done = researchProgress().cases;
    if (CASES.every((c) => done[c.id])) grantBadge('research:all');
    log('solved', other ? T('otherWay') : T('solvedTitle'));
    let source = null;
    if (TORAH && C.source) { const card = SOURCE_CARDS.find((c) => c.id === C.source); if (card) { grantSource(card.id); source = card; } }
    audio.play('mission');
    R.setSolved(T('solvedTitle'));
    R.showSolved({ stars, pack: first, source, solvedText: C.solved, learned: C.learned, real: C.realStory, other, attempt, tries: logs.filter((l) => l.kind === 'idea').length });
  }

  // ─────────────────────────────────────── try again: the place goes back to how it was; the measurements, the guess
  // and the experiment log stay (middle and advanced levels)
  function retry() {
    if (!sandbox) return;
    if (ff) { ff = null; R.setFF({ on: false }); }
    W.speed = baseSpeed;
    runner = createRunner(C); model = runner.model; acts = runner.acts;
    hist = []; histT = 0; record();
    for (const k of known.keys()) known.set(k, 0);
    finished = false; lastAct = null;
    // the devices the ideas put up come off the island (the measuring tools stay)
    const placedByIdeas = new Set(C.ideas.map((i) => (i.id === 'nestbox' ? 'nestbox' : i.place)).filter((d) => d && d !== 'sensor'));
    if (tools.removeDevices) tools.removeDevices((p) => placedByIdeas.has(p.id));
    if (W.research._boxTrees) W.research._boxTrees.length = 0;
    attempt++;
    log('retry', T('retryNote'));
    for (const v of C.visual || []) syncOne(v, true);
    syncPlants(true);
    R.setSolved('');
    R.setTable(tableState()); R.setBoard(boardState());
    R.setLights({ life: false, regen: false, env: false }, 0, C.holdSeconds);
    R.note(T('retryNote'), { kind: 'good' });
    audio.play('select');
  }

  function dispose() {
    disposed = true;
    if (offSpeed) offSpeed();
    for (const id of timers) clearTimeout(id); timers.clear();
    if (quadratMesh) { scene.remove(quadratMesh); const mats = new Set(); quadratMesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) mats.add(o.material); }); mats.forEach((m) => m.dispose()); quadratMesh = null; }
    R.dispose();
  }

  // test hooks
  W.research.dbg = { get model() { return model; }, get runner() { return runner; }, known, reveal, applyIdea, useTool, startFF, finish, openLab, retry, logs,
    openLog: () => R.openLog(logs, attempt), get held() { return runner.held; }, get spent() { return runner.spent; }, get solved() { return finished; } };
  return { start, update, dispose, get model() { return model; }, paused: () => R.isOpen() };
}
