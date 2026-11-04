// ניצוץ in 3D (1.4.4 set 2; Blender: tools/blender/nitzotz.py → tools/build-nitzotz.py → src/data/nitzotz-model.js).
// A puppet of joints animated in code like קוּבִּי: the bulb floats and sways, his two gloves float beside him and
// gesture, a trail of sparks falls from his base, and his light is his feeling (Avi, 4.11): it brightens with an idea,
// flickers when he is excited, dims when he is bored, and "blows a fuse" when an idea is too big (a puff of smoke, the
// light goes out, and comes straight back). The face is a canvas inside the glass (src/ui/nitzotz-face.js).
//   const N = createNitzotz({ size })   N.object (Group)   N.set(mood | action)   N.talk(on)   N.look(x, y)   N.update(dt)   N.dispose()
//   moods: 'happy' | 'think' | 'bored' | 'wow' | 'proud'
//   actions: 'idea' (a flash and a hop), 'explain' (a glove opens to the side), 'hint' (a glove raised, a soft glow),
//            'cheer' (both gloves up, a spin, bright), 'fuse' (smoke, out, back on), 'wave', 'excited' (flicker, bounce)
import * as THREE from 'three';
import { NITZOTZ_MODEL } from '../data/nitzotz-model.js';
import { geo } from '../robolab/three/parts3d.js';
import { drawNitzotzFace } from '../ui/nitzotz-face.js';

const WARM = new THREE.Color('#ffd27a'), HOT = new THREE.Color('#fff4d6'), DIM = new THREE.Color('#8a6a3a');

// a soft round glow (the halo round the bulb, the sparks, the smoke): one radial gradient, made once
let GLOW_TEX = null;
function glowTex() {
  if (GLOW_TEX) return GLOW_TEX;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  GLOW_TEX = new THREE.CanvasTexture(c); GLOW_TEX.colorSpace = THREE.SRGBColorSpace;
  return GLOW_TEX;
}

function materials() {
  const M = {
    // the glass: almost clear, bright at its edges (a rim term), so the face and the heart show through
    shell: new THREE.MeshStandardMaterial({ color: '#dff0ff', roughness: 0.06, metalness: 0, transparent: true, opacity: 0.22, depthWrite: false, envMapIntensity: 1.6 }),
    core: new THREE.MeshBasicMaterial({ color: WARM.clone(), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    filament: new THREE.MeshBasicMaterial({ color: '#ffb84a', toneMapped: false }),
    wire: new THREE.MeshStandardMaterial({ color: '#9a8a74', roughness: 0.4, metalness: 0.7 }),
    brass: new THREE.MeshStandardMaterial({ color: '#c89a52', roughness: 0.3, metalness: 0.9 }),
    thread: new THREE.MeshStandardMaterial({ color: '#b8bcc2', roughness: 0.3, metalness: 0.9 }),
    contact: new THREE.MeshStandardMaterial({ color: '#2a2624', roughness: 0.6 }),
    glove: new THREE.MeshStandardMaterial({ color: '#fbf9f3', roughness: 0.62 }),
    cuff: new THREE.MeshStandardMaterial({ color: '#f1ebdd', roughness: 0.58 }),
  };
  M.shell.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `
      float rimN = 1.0 - abs(dot(normal, normalize(vViewPosition)));
      outgoingLight += vec3(0.75, 0.88, 1.0) * pow(rimN, 2.5) * 0.9;
      diffuseColor.a = clamp(diffuseColor.a + pow(rimN, 3.0) * 0.55, 0.0, 0.9);
      #include <opaque_fragment>`);
  };
  M.shell.customProgramCacheKey = () => 'nz-glass';
  return M;
}

export function createNitzotz({ size = 1, sparks = true } = {}) {
  const M = materials();
  const J = {}, base = {}, meshes = [];
  let faceAt = null, heartAt = null;
  function build(node, parentObj, path) {
    const j = new THREE.Group(); j.name = 'nz:' + node.name;
    j.position.fromArray(node.at); j.rotation.set(node.rot[0], node.rot[1], node.rot[2]);
    parentObj.add(j); J[node.name] = j; base[node.name] = { p: j.position.clone(), r: j.rotation.clone() };
    for (const [sl, m] of Object.entries(node.slots)) {
      const mesh = new THREE.Mesh(geo('nz:' + path + ':' + sl, m), M[sl] || M.glove);
      mesh.castShadow = sl !== 'shell' && sl !== 'core'; mesh.name = sl;
      if (sl === 'shell') mesh.renderOrder = 5;   // the glass last: the face and the heart are seen through it
      j.add(mesh); meshes.push(mesh);
    }
    if (node.sockets && node.sockets.face) faceAt = { at: node.sockets.face, parent: j };
    if (node.sockets && node.sockets.heart) heartAt = { at: node.sockets.heart, parent: j };
    for (const k of node.kids) build(k, j, path + '/' + k.name);
  }
  const root = new THREE.Group(); root.name = 'nitzotz';
  const float = new THREE.Group(); root.add(float);
  build(NITZOTZ_MODEL, float, 'nz');
  root.scale.setScalar(size);

  // ── the face: a canvas behind the glass, a little curved back at its sides
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 200;
  const cx = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const fg = new THREE.PlaneGeometry(0.4, 0.3125, 12, 1);
  { const p = fg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, -x * x * 1.4); } fg.computeVertexNormals(); }
  const face = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false }));
  face.renderOrder = 4;
  if (faceAt) { face.position.fromArray(faceAt.at); face.position.z -= 0.012; faceAt.parent.add(face); }
  // the halo: a glow sprite round the heart (its size and strength are his light)
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: WARM.clone(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  halo.renderOrder = 6; halo.scale.setScalar(1.1);
  if (heartAt) { halo.position.fromArray(heartAt.at); heartAt.parent.add(halo); }
  // the smoke of a blown fuse: a few grey puffs
  const smoke = [];
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#8a8a8a', transparent: true, opacity: 0, depthWrite: false }));
    s.renderOrder = 7; s.visible = false; (J.bulb || float).add(s); smoke.push({ s, t: 0, vx: 0, vy: 0 });
  }
  // the trail of sparks under him: small warm points that fall and fade
  const SN = sparks ? 26 : 0;
  const sp = { pos: new Float32Array(SN * 3), life: new Float32Array(SN), vel: new Float32Array(SN * 3) };
  const sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(sp.pos, 3));
  const sMat = new THREE.PointsMaterial({ map: glowTex(), color: '#ffd98a', size: 0.06, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, sizeAttenuation: true });
  const trail = new THREE.Points(sGeo, sMat); trail.frustumCulled = false; if (SN) root.add(trail);
  let spawnT = 0, nextSpark = 0;

  // ── state
  let mood = 'happy', talking = false, mouth = 0, blink = 0, blinkT = 2.5, lookX = 0, lookY = 0, lookTX = 0, lookTY = 0;
  let act = null, actT = 0, t = 0, light = 1, lightT = 1, faceDirty = true, faceT = 0;
  const ACT_LEN = { idea: 1.6, explain: 2.4, hint: 2.2, cheer: 2.0, fuse: 2.6, wave: 2.0, excited: 1.8 };
  const MOOD_OF = { idea: 'idea', explain: 'happy', hint: 'think', cheer: 'proud', fuse: 'fuse', wave: 'happy', excited: 'excited' };
  const LIGHT_OF = { happy: 1, think: 0.85, bored: 0.4, wow: 1.2, proud: 1.25, idea: 1.5, excited: 1.3, fuse: 0 };
  function set(x) {
    if (ACT_LEN[x]) { act = x; actT = 0; mood = MOOD_OF[x] || mood; }
    else { mood = x; if (act && MOOD_OF[act] !== x) act = null; }
    faceDirty = true;
  }
  const ease = (k) => (k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k));
  const env = (k, a = 0.18, b = 0.25) => ease(k / a) * ease((1 - k) / b);
  function reset() { for (const [n, B] of Object.entries(base)) { J[n].position.copy(B.p); J[n].rotation.copy(B.r); } }

  function update(dt) {
    t += dt; reset();
    // floating: a slow bob and a sway; the gloves float on their own phase
    float.position.y = Math.sin(t * 1.6) * 0.03;
    float.rotation.z = Math.sin(t * 0.9) * 0.05; float.rotation.y = Math.sin(t * 0.55) * 0.18 + lookX * 0.3;
    const HL = J.hand_l, HR = J.hand_r;
    if (HL && HR) {
      HL.position.y += Math.sin(t * 2.1 + 1) * 0.025; HR.position.y += Math.sin(t * 2.1 + 2.3) * 0.025;
      HL.rotation.z += Math.sin(t * 1.3) * 0.12; HR.rotation.z -= Math.sin(t * 1.4 + 0.5) * 0.12;
    }
    lightT = LIGHT_OF[mood] != null ? LIGHT_OF[mood] : 1;
    if (act) {
      actT += dt; const k = Math.min(1, actT / ACT_LEN[act]), e = env(k);
      if (act === 'idea') { float.position.y += Math.sin(Math.min(1, k * 2) * Math.PI) * 0.12; lightT = 1.5 + (k < 0.25 ? 1 : 0); }
      if (act === 'explain' && HR) { HR.position.x += 0.08 * e; HR.position.y += 0.06 * e; HR.rotation.z -= 0.6 * e; HR.rotation.y += Math.sin(t * 6) * 0.2 * e; }
      if (act === 'hint' && HL) { HL.position.y += 0.18 * e; HL.position.x += 0.06 * e; HL.rotation.z += 0.25 * e; lightT = 1.05 + Math.sin(t * 3) * 0.15 * e; }
      if (act === 'wave' && HR) { HR.position.y += 0.16 * e; HR.rotation.z -= (0.3 + Math.sin(t * 10) * 0.35) * e; }
      if (act === 'cheer' && HL && HR) { HL.position.y += 0.22 * e; HR.position.y += 0.22 * e; HL.rotation.z -= Math.sin(t * 9) * 0.3 * e; HR.rotation.z += Math.sin(t * 9) * 0.3 * e; float.rotation.y += k * Math.PI * 2 * e; float.position.y += Math.abs(Math.sin(k * Math.PI * 2)) * 0.08; }
      if (act === 'excited') { float.position.y += Math.abs(Math.sin(t * 14)) * 0.05 * e; lightT = 1.2 + (Math.sin(t * 31) > 0.2 ? 0.35 : -0.25) * e; }
      if (act === 'fuse') {
        // a pop, the light goes out with a little shake, the smoke rises, and he comes back on
        lightT = k < 0.08 ? 2 : k < 0.7 ? 0.05 : Math.min(1, (k - 0.7) / 0.2) * (Math.sin(t * 40) > 0 || k > 0.82 ? 1 : 0.2);
        if (k < 0.5) float.position.x += Math.sin(t * 50) * 0.01 * (1 - k * 2);
        if (k > 0.06 && smoke.every((S) => !S.s.visible)) for (const S of smoke) { S.s.visible = true; S.t = 0; S.vx = (Math.random() - 0.5) * 0.15; S.vy = 0.25 + Math.random() * 0.2; S.s.position.set((Math.random() - 0.5) * 0.12, 0.62, 0); }
        if (k >= 1) mood = 'happy';
      }
      if (k >= 1) { act = null; if (mood === 'idea' || mood === 'excited' || mood === 'proud' || mood === 'fuse') mood = 'happy'; faceDirty = true; }
    }
    // the smoke drifts up and fades
    for (const S of smoke) {
      if (!S.s.visible) continue;
      S.t += dt; S.s.position.x += S.vx * dt; S.s.position.y += S.vy * dt;
      const a = Math.max(0, 1 - S.t / 1.6); S.s.material.opacity = 0.55 * a; S.s.scale.setScalar(0.12 + S.t * 0.25);
      if (S.t > 1.6) S.s.visible = false;
    }
    // the light: eased towards its target; the heart, the filament and the halo follow it
    light += (lightT - light) * Math.min(1, dt * (lightT > light ? 14 : 5));
    const L = Math.max(0, light);
    M.core.opacity = Math.min(0.75, 0.08 + L * 0.3);
    M.core.color.copy(DIM).lerp(L > 1 ? HOT : WARM, Math.min(1, L > 1 ? (L - 1) * 1.6 : L));
    M.filament.color.copy(DIM).lerp(WARM, Math.min(1, L));
    halo.material.opacity = Math.min(0.8, L * 0.28); halo.scale.setScalar(0.5 + L * 0.28);
    // the sparks: a few a second while he glows
    if (SN) {
      spawnT -= dt;
      if (spawnT <= 0 && L > 0.3) { spawnT = 0.09 / Math.max(0.5, L); const i = nextSpark++ % SN; sp.life[i] = 1;
        sp.pos[i * 3] = (Math.random() - 0.5) * 0.08 + float.position.x; sp.pos[i * 3 + 1] = 0.02 + float.position.y; sp.pos[i * 3 + 2] = (Math.random() - 0.5) * 0.08;
        sp.vel[i * 3] = (Math.random() - 0.5) * 0.12; sp.vel[i * 3 + 1] = -0.18 - Math.random() * 0.12; sp.vel[i * 3 + 2] = (Math.random() - 0.5) * 0.1; }
      for (let i = 0; i < SN; i++) {
        if (sp.life[i] <= 0) { sp.pos[i * 3 + 1] = -99; continue; }
        sp.life[i] -= dt * 0.9;
        sp.pos[i * 3] += sp.vel[i * 3] * dt + Math.sin(t * 3 + i) * 0.002; sp.pos[i * 3 + 1] += sp.vel[i * 3 + 1] * dt; sp.pos[i * 3 + 2] += sp.vel[i * 3 + 2] * dt;
      }
      sGeo.attributes.position.needsUpdate = true; sMat.opacity = Math.min(1, L);
    }
    // the face: blink, look, talk
    blinkT -= dt; if (blinkT <= 0) { blink = 1; blinkT = 2 + Math.random() * 3; faceDirty = true; }
    if (blink > 0) { blink = Math.max(0, blink - dt * 7); faceDirty = true; }
    lookX += (lookTX - lookX) * Math.min(1, dt * 6); lookY += (lookTY - lookY) * Math.min(1, dt * 6);
    if (talking) { mouth = 0.5 + 0.5 * Math.sin(t * 17) * Math.sin(t * 5.3); faceDirty = true; }
    faceT += dt;
    if (mood === 'fuse') faceDirty = true;
    if (faceDirty && faceT > 1 / 30) { faceT = 0; drawNitzotzFace(cx, cv.width, cv.height, { mood, talking, mouth, blink, lookX, lookY, t }); tex.needsUpdate = true; faceDirty = false; }
    face.material.opacity = mood === 'fuse' && light < 0.3 ? 0.65 : 1;
  }

  function dispose() {
    for (const m of Object.values(M)) m.dispose();
    face.geometry.dispose(); face.material.dispose(); tex.dispose();
    halo.material.dispose(); for (const S of smoke) S.s.material.dispose();
    sGeo.dispose(); sMat.dispose();
    root.removeFromParent();
  }
  update(0);
  return {
    object: root, set, update, dispose,
    talk: (on) => { talking = !!on; if (!on) mouth = 0; faceDirty = true; },
    look: (x, y) => { lookTX = Math.max(-1, Math.min(1, x)); lookTY = Math.max(-1, Math.min(1, y)); },
    get mood() { return mood; }, get action() { return act; }, get light() { return light; },
    face,   // the face's mesh (the portraits' tool hides it and measures where it is)
  };
}
