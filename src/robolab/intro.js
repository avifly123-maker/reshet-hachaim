// מעבדת הרובוטים – the opening film on the first visit (PLAN-1.4 7.0: "פתיחה מונפשת"). A small stage of its own
// (its own renderer, like the garage): the light comes up on a round pad, קוּבִּי drops in and waves, then the robot
// rolls in, the drone comes down, the sub glides in with its bubbles, and he cheers under falling coloured discs.
// One line of his per beat (INTRO in kubi-lines.js, voice ids ki_0..ki_4): a beat lasts as long as its line, or a
// few seconds without a recording. "דלג" ends it at once; the home has a button to watch it again.
//   const F = playIntro(host, { kids, voice, sfx, onDone })   (voice: createVoice of his lines)   F.close()
import * as THREE from 'three';
import { createKubi } from './three/kubi.js';
import { makeTool } from './three/models.js';
import { lookFor } from '../data/robolab/parts.js';
import { INTRO } from '../data/robolab/kubi-lines.js';
import { toolLook } from './progress.js';

const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
const bounce = (k) => { if (k >= 1) return 1; const s = 1 - k; return 1 - s * s * Math.abs(Math.cos(k * Math.PI * 2.5)); };
const MIN = [3.4, 3.6, 3.6, 3.6, 4.2];   // seconds per beat without a recording

export function playIntro(host, { kids = false, voice = null, sfx = () => { }, onDone = () => { }, film = null } = {}) {
  // film: { lens: [seconds per beat] } records it frame by frame (tools/record-intro.py): no timers, F.seek(t, dt) draws one frame
  const T = (o) => (kids ? o.k : o.f);
  const el = document.createElement('div'); el.className = 'rl-intro';
  el.innerHTML = `<canvas></canvas><div class="rl-ititle"><h1>${kids ? 'מַעְבֶּדֶת הָרוֹבּוֹטִים' : 'מעבדת הרובוטים'}</h1><p>${kids ? 'מְתַכְנְנִים, בּוֹנִים וּמַפְעִילִים' : 'מתכננים, בונים ומפעילים'}</p></div>
    <p class="rl-icap" aria-live="polite"></p>
    <button type="button" class="rl-iskip" data-iskip>${kids ? 'דַּלֵּג' : 'דלג'}</button>
    <button type="button" class="rl-igo" data-igo hidden>${kids ? 'יוֹצְאִים לַדֶּרֶךְ!' : 'יוצאים לדרך!'}</button>`;
  host.appendChild(el);
  const canvas = el.querySelector('canvas'), cap = el.querySelector('.rl-icap');
  let renderer = null;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false }); } catch (e) { renderer = null; }
  let closed = false, raf = 0;
  function close() {
    if (closed) return; closed = true; cancelAnimationFrame(raf); removeEventListener('resize', size);
    try { voice && voice.stop && voice.stop(); } catch (e) { }
    if (renderer) { scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); K && K.dispose(); renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) { } }
    el.remove(); onDone();
  }
  el.querySelector('[data-iskip]').onclick = () => { sfx('click'); close(); };
  el.querySelector('[data-igo]').onclick = () => { sfx('click'); close(); };
  const scene = new THREE.Scene();
  let K = null;
  if (!renderer) { setTimeout(close, 0); return { close }; }   // no WebGL: straight to the home
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  // the backdrop: a deep teal night of the lab, a soft glow behind the pad
  { const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#0d2a3a'); gr.addColorStop(0.6, '#174a58'); gr.addColorStop(1, '#0b1f2a'); g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t; }
  const cam = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
  const hemi = new THREE.HemisphereLight('#dff0ff', '#2a3a40', 0); scene.add(hemi);
  const key = new THREE.SpotLight('#fff1d8', 0, 14, 0.6, 0.5); key.position.set(1.5, 6, 3.5); key.target.position.set(0, 0.5, 0); scene.add(key, key.target);
  const rim = new THREE.DirectionalLight('#8fd6ff', 0); rim.position.set(-4, 3, -4); scene.add(rim);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.75, 0.12, 64), new THREE.MeshStandardMaterial({ color: '#e7dfcf', roughness: 0.75 }));
  pad.position.y = -0.06; scene.add(pad);
  const ringM = new THREE.MeshStandardMaterial({ color: '#e8873a', emissive: '#e8873a', emissiveIntensity: 0 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.62, 0.035, 8, 96), ringM); ring.rotation.x = Math.PI / 2; ring.position.y = 0.01; scene.add(ring);
  // little lights round the pad, lit one after another as the film starts
  const dots = [];
  for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2, m = new THREE.MeshStandardMaterial({ color: '#7fe0d0', emissive: '#7fe0d0', emissiveIntensity: 0 });
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), m); d.position.set(Math.cos(a) * 2.95, 0.04, Math.sin(a) * 2.95); scene.add(d); dots.push(m); }
  // the cast
  K = createKubi(); scene.add(K.object); K.object.position.set(0, 3.5, 0); K.object.rotation.y = 0;
  const tool = (k) => { const L = toolLook(k); const o = makeTool(k, L.paint, lookFor(k, [], L.parts)); o.scale.multiplyScalar(0.5); o.visible = false; scene.add(o); return o; };
  const robot = tool('robot'), drone = tool('drone'), sub = tool('sub');
  const SPOT = { robot: [-1.45, 0, 0.45], drone: [-1.85, 1.3, -0.95], sub: [1.45, 0.55, -0.35] };
  // bubbles for the sub, discs of colour for the end (circles only)
  const bubM = new THREE.MeshStandardMaterial({ color: '#cfefff', transparent: true, opacity: 0.55, roughness: 0.1 });
  const bubG = new THREE.SphereGeometry(0.05, 10, 8), bubs = [];
  const conf = [], COLS = ['#f0a63a', '#5cc8b0', '#e86a5a', '#7aa8f0', '#f2d35a', '#9bd36a'];
  const discG = new THREE.CircleGeometry(0.07, 14);
  function confetti() {
    for (let i = 0; i < 70; i++) { const m = new THREE.Mesh(discG, new THREE.MeshStandardMaterial({ color: COLS[i % COLS.length], side: THREE.DoubleSide, emissive: COLS[i % COLS.length], emissiveIntensity: 0.25 }));
      m.position.set((Math.random() - 0.5) * 5, 3.5 + Math.random() * 2.5, (Math.random() - 0.5) * 3); m.userData.v = 0.8 + Math.random() * 0.8; m.userData.s = (Math.random() - 0.5) * 6; scene.add(m); conf.push(m); }
  }
  function size() { const w = Math.max(100, el.clientWidth), h = Math.max(100, el.clientHeight); renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  addEventListener('resize', size);
  // ── the timeline: each piece of the cast has the time it starts to move in (set by the beats)
  const at = { light: 0, kubi: 1.2, robot: 1e9, drone: 1e9, sub: 1e9, end: 1e9 };
  const t0 = performance.now(); let t = 0, last = t0;
  function frame(now) {
    if (closed || film) return;
    raf = requestAnimationFrame(frame);
    if (!el.isConnected) { close(); return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t = (now - t0) / 1000;
    step(dt);
  }
  function step(dt) {
    // light comes up
    const L = ease((t - at.light) / 1.4);
    hemi.intensity = 1.2 * L; key.intensity = 60 * L; rim.intensity = 1.1 * L; ringM.emissiveIntensity = 0.55 * L;
    dots.forEach((m, i) => { m.emissiveIntensity = ease((t - 0.2 - i * 0.05) / 0.3) * (0.7 + 0.3 * Math.sin(t * 3 + i)); });
    // קוּבִּי drops in with a bounce
    const kk = (t - at.kubi) / 0.9; K.object.position.y = 3.5 * (1 - bounce(Math.max(0, kk)));
    K.update(dt);
    // the robot rolls in from the left of the screen (from his right)
    if (t > at.robot) { const k = ease((t - at.robot) / 1.5); robot.visible = true; robot.position.set(-4.5 + (SPOT.robot[0] + 4.5) * k, 0, SPOT.robot[2]); robot.rotation.y = Math.PI / 2 - k * (Math.PI / 2 - 0.5); }
    // the drone comes down from above, rotors spinning
    if (t > at.drone) { const k = ease((t - at.drone) / 1.6); drone.visible = true; drone.position.set(SPOT.drone[0], SPOT.drone[1] + 3.5 * (1 - k) + Math.sin(t * 2.4) * 0.05, SPOT.drone[2]); drone.rotation.y = -0.5 - (1 - k) * 1.5;
      for (const r of drone.userData.rotors || []) r.rotation.y += dt * 30; }
    // the sub glides in from the right, floating, bubbles from its propeller
    if (t > at.sub) { const k = ease((t - at.sub) / 1.7); sub.visible = true; sub.position.set(4.5 - (4.5 - SPOT.sub[0]) * k, SPOT.sub[1] + Math.sin(t * 1.7) * 0.06, SPOT.sub[2]); sub.rotation.y = -Math.PI / 2 + k * 0.4;
      if (sub.userData.prop) sub.userData.prop.rotation.y += dt * 12;
      if (Math.random() < dt * 5) { const b = new THREE.Mesh(bubG, bubM); b.position.copy(sub.position).add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.2, (Math.random() - 0.5) * 0.4)); b.userData.v = 0.5 + Math.random() * 0.5; scene.add(b); bubs.push(b); } }
    for (let i = bubs.length - 1; i >= 0; i--) { const b = bubs[i]; b.position.y += b.userData.v * dt; b.position.x += Math.sin(t * 4 + i) * dt * 0.1; if (b.position.y > 3.2) { scene.remove(b); bubs.splice(i, 1); } }
    for (const c of conf) { c.position.y -= c.userData.v * dt; c.rotation.x += c.userData.s * dt; c.rotation.y += c.userData.s * 0.7 * dt; if (c.position.y < 0.05) c.position.y = 0.05; }
    // the camera: close on קוּבִּי, then wider for the whole team
    const wide = ease((t - Math.min(at.robot, 1e8) + 0.5) / 2.5) * 0.5 + ease((t - at.end) / 2) * 0.5;
    cam.position.set(0.3 + Math.sin(t * 0.15) * 0.4, 1.25 + wide * 1.3, 3.1 + wide * 3.2); cam.lookAt(0, 0.62 + wide * 0.2, 0);   // קוּבִּי a little higher in the frame, clear of the caption (QA 30.10)
    renderer.render(scene, cam);
  }
  if (!film) requestAnimationFrame(() => { size(); raf = requestAnimationFrame(frame); });
  // ── the beats
  const wait = (s) => new Promise((r) => setTimeout(r, s * 1000));
  async function beat(i, start) {
    if (closed) return;
    if (start) start();
    cap.textContent = T(INTRO[i]); cap.classList.remove('on'); void cap.offsetWidth; cap.classList.add('on');
    const t0 = performance.now();
    K.talk(true);
    try { if (voice && await voice.has('ki_' + i)) { if (!closed) await voice.say('ki_' + i); } else await wait(MIN[i] - 0.8); } catch (e) { }
    if (K && !closed) K.talk(false);
    const left = MIN[i] - (performance.now() - t0) / 1000;
    if (left > 0) await wait(left); else await wait(0.4);
  }
  if (film) {   // the same beats on a fixed timeline, run by seek()
    const lens = film.lens || MIN, starts = []; let at0 = 1.9; for (let i = 0; i < 5; i++) { starts.push(at0); at0 += lens[i]; }
    const acts = [() => { K.set('wave'); }, () => { at.robot = t; K.set('point'); }, () => { at.drone = t; K.set('explain'); }, () => { at.sub = t; K.set('point'); }, () => { at.end = t; K.set('cheer'); confetti(); el.classList.add('end'); }];
    let done = -1;
    const F = { close, length: at0 + 0.6,
      seek(tt, dt = 1 / 24) {
        t = tt;
        while (done + 1 < 5 && tt >= starts[done + 1]) { done++; acts[done](); cap.textContent = T(INTRO[done]); cap.classList.add('on'); }
        if (done >= 0) K.talk(tt < starts[done] + lens[done] - 0.5);
        if (tt >= at0) { const go = el.querySelector('[data-igo]'); go.hidden = false; el.querySelector('[data-iskip]').hidden = true; }
        step(dt);
      } };
    size(); return F;
  }
  (async () => {
    await wait(1.9); if (closed) return;
    K.set('wave'); sfx('pop');
    await beat(0);
    await beat(1, () => { at.robot = t; K.set('point'); sfx('pop'); });
    await beat(2, () => { at.drone = t; K.set('explain'); sfx('pop'); });
    await beat(3, () => { at.sub = t; K.set('point'); sfx('pop'); });
    await beat(4, () => { at.end = t; K.set('cheer'); confetti(); sfx('mission'); el.classList.add('end'); });
    if (closed) return;
    const go = el.querySelector('[data-igo]'); go.hidden = false; el.querySelector('[data-iskip]').hidden = true; go.focus();
  })();
  return { close };
}
