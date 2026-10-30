// קוּבִּי in a small window of his own (the teacher's corner of a lesson, the lab's home): a tiny renderer that shows
// him from the waist up, talking, explaining, cheering. It draws only while it is on the screen.
//   const C = kubiCam(canvas, { full })   C.set(mood|action)   C.talk(on, seconds)   C.dispose()
import * as THREE from 'three';
import { createKubi } from '../three/kubi.js';

export function kubiCam(canvas, { full = false } = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { window.__kubiErr = String(e && e.message || e); return { set() { }, talk() { }, look() { }, dispose() { } }; }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(full ? 30 : 26, 1, 0.1, 20);
  scene.add(new THREE.HemisphereLight('#e8f4ff', '#40504a', 1.6));
  const key = new THREE.DirectionalLight('#fff3dc', 2.2); key.position.set(1.5, 2.5, 3); scene.add(key);
  let K; try { K = createKubi(); } catch (e) { window.__kubiErr = String(e && e.stack || e); renderer.dispose(); return { set() { }, talk() { }, look() { }, dispose() { } }; }
  scene.add(K.object);
  K.object.rotation.y = -0.25;
  if (full) { cam.position.set(0.15, 0.8, 2.55); cam.lookAt(0, 0.66, 0); }
  else { cam.position.set(0.12, 1.12, 2.1); cam.lookAt(0, 0.93, 0); }
  K.set('wave');
  let raf = 0, last = performance.now(), dead = false, talkT = 0;
  function size() { const r = canvas.getBoundingClientRect(); const w = Math.max(40, r.width), h = Math.max(40, r.height); renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  function frame(now) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    if (!canvas.isConnected) { dispose(); return; }
    if (canvas.offsetParent === null) return;   // hidden: no drawing
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (talkT > 0) { talkT -= dt; if (talkT <= 0) K.talk(false); }
    K.update(dt); renderer.render(scene, cam);
  }
  function dispose() { if (dead) return; dead = true; cancelAnimationFrame(raf); K.dispose(); renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) { } }
  requestAnimationFrame(() => { size(); raf = requestAnimationFrame(frame); });
  return { set: (x) => K.set(x), talk: (on, sec = 0) => { K.talk(on); talkT = on ? sec : 0; }, look: (x, y) => K.look(x, y), dispose, resize: size };
}
