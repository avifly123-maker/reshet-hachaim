// מעבדת הרובוטים in 3D – a lesson running inside a real island. main.js opens the zone's forest with
// `research: { robolab: true, level, zone, attach, ... }` (so the forest is a controlled place: no saves, missions,
// births or events, like a mystery of חוקרי הטבע); game.js calls R.makeSession(ctx) instead of the research session.
// This file lays the training field (course.js), frames the camera on it, keeps the view clear of the lesson's panel,
// and hands the field to the robot lab's screen (R.attach), which drives it like the flat map.
import { createCourse } from './course.js';
import { makeIslandLevel } from './island-level.js';
import { makeMission, practiceView, isBig } from '../island-missions.js';   // 1.4.3 set 4: workshop missions from the child's own island

export function createRoboSession(ctx, R) {
  const { W, env, scene, reg, markers, rig, spawnPlant, spawnAnimal, ui } = ctx;
  let course = null, panelW = -1, viewT = 0, disposed = false, leaveSoon = false, follow = null, follow0 = false, wasPlaying = false;
  const camera = ctx.camera || (rig && rig.camera) || null;
  // the field; the first one is framed at once (the loading screen hides the jump), a next lesson with a short flight
  function build(L, { quick = false } = {}) {
    if (course) course.dispose();
    course = createCourse({ W, env, scene, reg, markers, spawnPlant, spawnAnimal, zone: L.zone }, L);
    frame(quick ? 1 : 0.05);
    return course;
  }
  function frame(dur = 1.4) { const v = course.view(); rig.goTo(v.target, v.pos, dur); }
  // the lesson's panel covers the right part of the screen (RTL): shift the picture so the field sits in the free part
  function fitPanel() {
    if (!camera) return;
    const p = document.querySelector('#ui .rl.in3d .rl-ed');
    const w = p ? Math.max(0, Math.round(innerWidth - p.getBoundingClientRect().left)) : 0;   // from the panel's left edge to the right of the screen
    const v = camera.view, want = Math.round(w / 2);
    if (w === panelW && v && v.enabled && v.offsetX === want) return; panelW = w;
    const cw = (ctx.canvas && ctx.canvas.clientWidth) || innerWidth, ch = (ctx.canvas && ctx.canvas.clientHeight) || innerHeight;
    camera.setViewOffset(cw, ch, want, 0, cw, ch); camera.updateProjectionMatrix();
  }
  return {
    start() {
      ui.setTray([]);
      W.speed = 1;
      // a mission on the player's own island: the level is made from the island now that it is loaded
      const newIsland = (kind) => makeIslandLevel({ W, env }, R.zone, { kind, seed: Date.now() });
      // a template mission of the workshop (R.templateMission = { id, tpl, shape, build, name, step, seed, island }):
      // made now from what is on this island (his own, when he asked for it), or from the zone's practice island
      const fromTemplate = () => {
        const Q = R.templateMission, alive = (p) => p && p.alive && !p.removed && p.sp;
        const species = reg && reg.byId ? [...reg.byId.values()] : [];
        const view = Q.island ? { plants: (W.plants || []).filter(alive).map((p) => ({ id: p.sp.id, x: p.x, z: p.z, g: p.growth, tree: isBig(p.sp, !!env.underwater) })),
          animals: (W.animals || []).filter((a) => a && a.alive !== false && a.sp).map((a) => ({ id: a.sp.id, x: a.x, z: a.z })),
          isWater: (x, z) => !!(env.isWater && env.isWater(x, z)), isPlaceable: (x, z) => !env.isPlaceable || env.isPlaceable(x, z),
          heightAt: env.heightAt ? (x, z) => env.heightAt(x, z) : null, bridgeAt: env.bridgeAt ? (x, z) => !!env.bridgeAt(x, z) : null,
          radius: env.radius || 38, sea: !!env.underwater } : practiceView(R.zone, species);
        const M = makeMission(view, { zone: R.zone, species, step: Q.step, seed: Q.seed || 1, tpl: Q.tpl, shape: Q.shape, id: Q.id });
        if (!M) return null;
        return { ...M, build: { robot: Q.build }, robotName: Q.name || '' };
      };
      if (!R.level && R.templateMission) { R.level = fromTemplate(); if (!R.level) R.noMission = true; }
      else if (!R.level && R.ownIsland) R.level = newIsland();
      if (!R.level) { R.noRoom = true; leaveSoon = true; return; }   // no room for a field on his island: closed from the first update, once the game is in place
      build(R.level);
      const api = {
        get level() { return R.level; },
        newIsland: () => { const L = newIsland(); if (L) R.level = L; return L; },
        get course() { return course; }, rebuild: (L, o) => { const c = build(L, o); return c; }, frame: () => frame(1) };
      if (R.attach) R.attach(api);
    },
    update(dt, rdt) {
      if (leaveSoon) { leaveSoon = false; if (ctx.exit) ctx.exit(); else if (R.onExit) R.onExit(); return; }
      if (disposed || !course) return;
      // a training field is in good daylight; the "sunset" event of a run turns it to evening, slowly
      { const want = W._rlSunset ? 0.735 : 0.42; W.dayFrac += (want - W.dayFrac) * Math.min(1, (rdt || 0) * (W._rlSunset ? 0.8 : 4)); }
      course.update(rdt || dt || 0);
      if (course.setFar && camera && course.robotAt) { const p = course.robotAt(); if (p) course.setFar(camera.position.distanceTo(p) > 16); }   // far from the camera: the light eyes
      // a big field (a mission on an island): while the robot runs the camera goes with it, nearer; then back to all of it
      if (course.span > 26 && course.robotAt) {
        const playing = course.isPlaying();
        if (playing) { const p = course.robotAt(); if (p && (!follow || follow.distanceTo(p) > course.span * 0.06)) { follow = p.clone(); rig.goTo(p.clone().setY(p.y + 0.5), p.clone().add({ x: 0, y: 7.5, z: 7 }), follow0 ? 0.9 : 1.2); follow0 = true; } wasPlaying = true; }
        else if (wasPlaying) { wasPlaying = false; follow = null; follow0 = false; setTimeout(() => { if (!disposed && course && !course.isPlaying()) frame(1.2); }, 1400); }
      }
      fitPanel();
      viewT += rdt || 0; if (viewT > 5) { viewT = 0; if (rig.poke) rig.poke(); }   // no idle orbit: north stays up
    },
    paused: () => false,
    dispose() { disposed = true; if (course) course.dispose(); course = null; if (camera) { camera.clearViewOffset(); camera.updateProjectionMatrix(); } if (R.detach) R.detach(); },
  };
}
