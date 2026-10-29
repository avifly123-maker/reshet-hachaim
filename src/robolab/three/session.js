// מעבדת הרובוטים in 3D – a lesson running inside a real island. main.js opens the zone's forest with
// `research: { robolab: true, level, zone, attach, ... }` (so the forest is a controlled place: no saves, missions,
// births or events, like a mystery of חוקרי הטבע); game.js calls R.makeSession(ctx) instead of the research session.
// This file lays the training field (course.js), frames the camera on it, keeps the view clear of the lesson's panel,
// and hands the field to the robot lab's screen (R.attach), which drives it like the flat map.
import { createCourse } from './course.js';

export function createRoboSession(ctx, R) {
  const { W, env, scene, reg, markers, rig, spawnPlant, spawnAnimal, ui } = ctx;
  let course = null, panelW = -1, viewT = 0, disposed = false, reframed = false;
  const camera = ctx.camera || (rig && rig.camera) || null;
  function build(L) {
    if (course) course.dispose();
    course = createCourse({ W, env, scene, reg, markers, spawnPlant, spawnAnimal, zone: L.zone }, L);
    frame(2.2);
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
      build(R.level);
      if (R.attach) R.attach({ course, rebuild: (L) => build(L), frame: () => frame(1) });
    },
    update(dt, rdt) {
      if (disposed || !course) return;
      course.update(rdt || dt || 0);
      fitPanel();
      // the forest frames its overview during its first seconds (index.js fitViewToUI): frame the field once more after
      if (!reframed && W.simT > 6.5) { reframed = true; frame(1.2); }
      viewT += rdt || 0; if (viewT > 5) { viewT = 0; if (rig.poke) rig.poke(); }   // no idle orbit: north stays up
    },
    paused: () => false,
    dispose() { disposed = true; if (course) course.dispose(); course = null; if (camera) { camera.clearViewOffset(); camera.updateProjectionMatrix(); } if (R.detach) R.detach(); },
  };
}
