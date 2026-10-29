// קוּבִּי – the robot lab's teacher in 3D (Blender: tools/blender/kubi.py → build-kubi.py → src/data/kubi-model.js).
// A puppet of joints animated in code (no skeleton): idle bob and breathing, talking (the screen mouth moves), explaining
// (one arm points), cheering (both arms up, a hop), surprised (his blocks pop apart and click back), waving.
// The face is a canvas drawn live on the screen of his head: eyes that blink and look, a mouth, moods.
//   const K = createKubi()   K.object (Group)   K.set(mood|action)   K.talk(on)   K.look(x, y)   K.update(dt)   K.dispose()
//   moods: 'idle' | 'happy' | 'wow' | 'think' | 'oops';  actions: 'wave' | 'explain' | 'cheer' | 'surprised' | 'point'
import * as THREE from 'three';
import { KUBI_MODEL } from '../../data/kubi-model.js';
import { geo, mats } from './parts3d.js';

export function createKubi({ size = 1 } = {}) {
  const M = mats({});
  const J = {}, base = {}, parts = [];
  function build(node, parentObj, path) {
    const j = new THREE.Group(); j.name = 'kubi:' + node.name;
    j.position.fromArray(node.at); j.rotation.set(node.rot[0], node.rot[1], node.rot[2]);
    parentObj.add(j); J[node.name] = j; base[node.name] = { p: j.position.clone(), r: j.rotation.clone() };
    for (const [sl, m] of Object.entries(node.slots)) {
      const mesh = new THREE.Mesh(geo('k:' + path + ':' + sl, m), M[sl] || M.body);
      mesh.castShadow = true; j.add(mesh); parts.push(mesh);
    }
    if (node.sockets && node.sockets.face) J._face = { at: node.sockets.face, parent: j };
    for (const k of node.kids) build(k, j, path + '/' + k.name);
  }
  const root = new THREE.Group(); root.name = 'kubi';
  build(KUBI_MODEL, root, 'kubi');
  root.scale.setScalar(size);

  // ── the face: a canvas on the screen
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 184;
  const cx = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.287), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
  if (J._face) { face.position.fromArray(J._face.at); face.position.z += 0.004; J._face.parent.add(face); }
  let mood = 'happy', talking = false, mouth = 0, blink = 0, blinkT = 2, lookX = 0, lookY = 0, lookTX = 0, lookTY = 0, faceDirty = true;
  const rr = (x, y, w, h, r) => { cx.beginPath(); cx.roundRect(x, y, w, h, r); cx.fill(); };
  function drawFace() {
    const W = cv.width, H = cv.height;
    cx.clearRect(0, 0, W, H);
    cx.fillStyle = '#7fe3ff'; cx.strokeStyle = '#7fe3ff'; cx.lineWidth = 12; cx.lineCap = 'round';
    cx.shadowColor = '#7fe3ff'; cx.shadowBlur = 14;
    const ex = 70, ey = 74 + lookY * 10, dx = lookX * 12, ew = 44, eh = 54 * (1 - blink * 0.92);
    for (const s of [-1, 1]) {
      const x = W / 2 + s * ex + dx;
      if (mood === 'happy' && !talking && blink < 0.5) { cx.beginPath(); cx.arc(x, ey + 12, 22, Math.PI * 1.1, Math.PI * 1.9); cx.stroke(); }
      else if (mood === 'wow') { cx.beginPath(); cx.arc(x, ey, 26 * (1 - blink * 0.9), 0, 7); cx.fill(); }
      else if (mood === 'oops') { cx.save(); cx.translate(x, ey); cx.rotate(s * 0.25); rr(-ew / 2, -eh / 3, ew, eh * 0.66, 10); cx.restore(); }
      else rr(x - ew / 2, ey - eh / 2, ew, Math.max(5, eh), 16);
    }
    // the mouth: a smile, an "o", a talking oval, a thinking line
    const my = 140;
    if (talking) { const h = 8 + mouth * 22; rr(W / 2 - 22, my - h / 2, 44, h, 10); }
    else if (mood === 'wow') { cx.beginPath(); cx.arc(W / 2, my, 13, 0, 7); cx.stroke(); }
    else if (mood === 'think') { cx.beginPath(); cx.moveTo(W / 2 - 20, my); cx.lineTo(W / 2 + 18, my - 6); cx.stroke(); }
    else if (mood === 'oops') { cx.beginPath(); cx.moveTo(W / 2 - 22, my + 4); cx.quadraticCurveTo(W / 2, my - 10, W / 2 + 22, my + 4); cx.stroke(); }
    else { cx.beginPath(); cx.arc(W / 2, my - 16, 26, Math.PI * 0.2, Math.PI * 0.8); cx.stroke(); }
    tex.needsUpdate = true; faceDirty = false;
  }

  // ── motion
  let act = null, actT = 0, t = 0;
  const ACT_LEN = { wave: 2.2, explain: 2.6, cheer: 1.8, surprised: 1.6, point: 2.2 };
  const MOOD_OF = { cheer: 'happy', surprised: 'wow', explain: 'happy', wave: 'happy', point: 'happy' };
  function set(x) {
    if (ACT_LEN[x]) { act = x; actT = 0; mood = MOOD_OF[x] || mood; }
    else mood = x;
    faceDirty = true;
  }
  const ease = (k) => (k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k));
  const env = (k, a = 0.18, b = 0.25) => ease(k / a) * ease((1 - k) / b);   // rise, hold, fall
  function reset() { for (const [n, B] of Object.entries(base)) { J[n].position.copy(B.p); J[n].rotation.copy(B.r); } }
  function update(dt) {
    t += dt; reset();
    // idle: a soft bob, breathing, the head turns a little
    J.hips.position.z += 0; J.hips.position.y += Math.sin(t * 2.2) * 0.008;
    J.head.rotation.y += Math.sin(t * 0.7) * 0.12 + lookX * 0.25; J.head.rotation.x += Math.sin(t * 0.9) * 0.03 - lookY * 0.1;
    J.shoulder_l.rotation.z -= 0.08 + Math.sin(t * 2.2) * 0.03; J.shoulder_r.rotation.z += 0.08 + Math.sin(t * 2.2 + 1) * 0.03;
    if (talking) { J.head.rotation.x += Math.sin(t * 9) * 0.03; J.torso.rotation.y += Math.sin(t * 3) * 0.05; }
    if (act) {
      actT += dt; const L = ACT_LEN[act], k = actT / L, e = env(k);
      if (act === 'wave') { J.shoulder_r.rotation.z += 2.5 * e; J.elbow_r.rotation.z += (0.4 + Math.sin(actT * 10) * 0.45) * e; }
      if (act === 'explain' || act === 'point') { J.shoulder_r.rotation.x -= 1.3 * e; J.shoulder_r.rotation.z += 0.5 * e; J.elbow_r.rotation.x -= 0.3 * e; J.head.rotation.y -= 0.3 * e; if (act === 'explain') J.shoulder_l.rotation.x -= Math.sin(actT * 4) * 0.4 * e; }
      if (act === 'cheer') { J.shoulder_l.rotation.z -= 2.6 * e; J.shoulder_r.rotation.z += 2.6 * e; J.hips.position.y += Math.abs(Math.sin(actT * 7)) * 0.12 * e; }
      if (act === 'surprised') {   // his blocks pop apart and click back
        const p = Math.sin(Math.min(1, k * 1.6) * Math.PI) * (k < 0.62 ? 1 : 0);
        J.head.position.y += 0.22 * p; J.head.rotation.z += 0.3 * p;
        J.shoulder_l.position.x -= 0.12 * p; J.shoulder_r.position.x += 0.12 * p;
        J.hand_l.position.y -= 0.06 * p; J.hand_r.position.y -= 0.06 * p;
        J.torso.position.y += 0.05 * p;
      }
      if (actT >= L) { act = null; if (mood === 'wow') { mood = 'happy'; faceDirty = true; } }
    }
    // the face
    blinkT -= dt; if (blinkT <= 0) { blink = 1; blinkT = 2.5 + Math.random() * 3; faceDirty = true; }
    if (blink > 0) { blink = Math.max(0, blink - dt * 7); faceDirty = true; }
    if (talking) { mouth = 0.5 + 0.5 * Math.sin(t * 17) * Math.sin(t * 5.3); faceDirty = true; }
    lookX += (lookTX - lookX) * Math.min(1, dt * 4); lookY += (lookTY - lookY) * Math.min(1, dt * 4);
    if (Math.abs(lookTX - lookX) > 0.01 || Math.abs(lookTY - lookY) > 0.01) faceDirty = true;
    if (faceDirty) drawFace();
  }
  drawFace();
  return {
    object: root, joints: J, set, update,
    talk: (on) => { talking = !!on; faceDirty = true; },
    look: (x, y) => { lookTX = Math.max(-1, Math.min(1, x)); lookTY = Math.max(-1, Math.min(1, y)); },
    dispose: () => { tex.dispose(); face.geometry.dispose(); face.material.dispose(); for (const m of Object.values(M)) m.dispose(); },
  };
}
