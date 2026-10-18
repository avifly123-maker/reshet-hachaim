// מעבדת רובו־דע – the lab of the science centre (המרכז המדעי).
// The room was modelled, lit and rendered in Blender with Cycles (tools/blender/lab_hd.py): one picture per station.
// Here each picture fills the screen, drawn with the very camera Blender used, and the live things go on top in 3D:
// רובו־דע (tools/blender/robo_da.py: a glossy robot whose eyes are drawn live on his visor) and the reef fish in the
// aquarium. The child moves between stations; the microscope and the inventors table open their own panels.
// Fully offline: the pictures and the robot are inside the game (src/data/lab-art.js, src/data/lab-robot.js).
import * as THREE from 'three';
import { esc, icon } from '../ui/ui.js';
import { LAB_ART } from '../data/lab-art.js';
import { LAB_ROBOT } from '../data/lab-robot.js';
import { CARD_ART } from '../data/card-art.js';
import { loadPack } from '../core/packs.js';
import { makeRng } from '../core/util.js';
import { openMicroscope, openInventors } from './stations.js';
import { labProgress } from './progress.js';
import { TORAH } from '../core/edition.js';
import { grantSource } from '../core/sources-store.js';
import { grant as grantBadge } from '../core/badges-store.js';
import { SAMPLES } from './samples.js';

const STATION_INFO = {
  home: { name: 'החדר', ic: 'home' },
  scope: { name: 'המיקרוסקופ', ic: 'binoc', open: 'scope' },
  table: { name: 'שולחן הממציאים', ic: 'bulb', open: 'inventors' },
  aquarium: { name: 'האקווריום', ic: 'drop', say: 'באקווריום שוחים דגים מהשונית של אילת. בקרוב נעשה כאן ניסוי: מה קורה לאלמוג כשהמים חמים מדי, או מלאים בוץ?' },
  greenhouse: { name: 'החממה', ic: 'sprout', say: 'בחממה הזרעים גדלים בזמן מהיר. בקרוב נבדוק כאן מה צמח צריך כדי לגדול: אור, מים, או חברים.' },
  cabinet: { name: 'ארון האוסף', ic: 'leaf', say: null },
  atlas: { name: 'האטלס', ic: 'book', open: 'atlas' },
};
const ROBOT_SPOT = { table: [-0.75, 0, -1.05] };   // three's axes: behind the inventors table, on the left
const ORDER = ['home', 'scope', 'table', 'aquarium', 'greenhouse', 'cabinet', 'atlas'];
const IMG_ASPECT = 16 / 9;

// ───────────────────────────────────────── decoding the packed robot (tools/build-lab.py)
const b64 = (s) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
function decodePart(e) {
  const g = new THREE.BufferGeometry();
  const q = new Int16Array(b64(e.p).buffer); const n = q.length / 3; const P = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) P[3 * i + k] = e.o[k] + (q[3 * i + k] + 32767) * e.s[k];
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  if (e.n) { const nn = new Int8Array(b64(e.n).buffer); const N = new Float32Array(nn.length); for (let i = 0; i < nn.length; i++) N[i] = nn[i] / 127; g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); }
  if (e.uv) { const uu = new Uint16Array(b64(e.uv).buffer); const U = new Float32Array(uu.length); for (let i = 0; i < uu.length; i++) U[i] = uu[i] / 65535; g.setAttribute('uv', new THREE.BufferAttribute(U, 2)); }
  g.setIndex(new THREE.BufferAttribute(new Uint16Array(b64(e.i).buffer), 1));
  if (!e.n) g.computeVertexNormals();
  return g;
}

// ───────────────────────────────────────── the face on the visor (a canvas: eyes, blinks, a smile, talking)
function makeFace() {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256;
  const c = cv.getContext('2d'); const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  let last = '';
  function draw(expr, blink, talk) {
    const key = expr + '|' + blink.toFixed(2) + '|' + talk.toFixed(2); if (key === last) return; last = key;
    c.fillStyle = '#000'; c.fillRect(0, 0, 512, 256);
    c.strokeStyle = c.fillStyle = '#8ff2ff'; c.shadowColor = 'rgba(120,240,255,.9)'; c.shadowBlur = 26; c.lineCap = 'round';
    const open = 1 - blink;
    for (const cx of [190, 322]) {
      if (expr === 'happy' && blink < 0.5) {   // smiling eyes: soft arches
        c.lineWidth = 20; c.beginPath(); c.arc(cx, 128, 30, Math.PI * 1.12, Math.PI * 1.88); c.stroke();
      } else {
        const w = expr === 'wow' ? 34 : 28, h = Math.max(5, (expr === 'wow' ? 44 : 40) * open);
        const hy = expr === 'curious' && cx > 256 ? h * 1.18 : h;
        roundRect(c, cx - w / 2, 112 - hy, w, hy * 2, Math.min(w / 2, hy)); c.fill();
      }
    }
    // the mouth: a smile, an "o" when surprised, opening and closing while talking
    c.lineWidth = 9;
    if (expr === 'wow') { c.beginPath(); c.ellipse(256, 196, 14, 12 + talk * 6, 0, 0, Math.PI * 2); c.stroke(); }
    else if (talk > 0.05) { c.beginPath(); c.ellipse(256, 192, 24, 5 + talk * 13, 0, 0, Math.PI * 2); c.fill(); }
    else { c.beginPath(); c.arc(256, 168, expr === 'curious' ? 18 : 30, Math.PI * 0.2, Math.PI * 0.8); c.stroke(); }
    tex.needsUpdate = true;
  }
  draw('happy', 0, 0);
  return { tex, draw };
}
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function leafBadge() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d');
  c.fillStyle = '#000'; c.fillRect(0, 0, 128, 128);
  c.translate(64, 64); c.rotate(-0.6); c.shadowColor = 'rgba(110,255,140,.9)'; c.shadowBlur = 14;
  c.fillStyle = '#6dff8a'; c.beginPath(); c.moveTo(0, -42); c.quadraticCurveTo(30, -10, 0, 42); c.quadraticCurveTo(-30, -10, 0, -42); c.fill();
  c.strokeStyle = '#e8ffd0'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -36); c.lineTo(0, 38); c.stroke();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ───────────────────────────────────────── רובו־דע
function makeRobot() {
  const face = makeFace();
  const M = {
    shell: new THREE.MeshPhysicalMaterial({ color: '#f3f1ea', roughness: 0.24, clearcoat: 0.7, clearcoatRoughness: 0.12 }),
    teal: new THREE.MeshPhysicalMaterial({ color: '#2c9a92', roughness: 0.32, clearcoat: 0.4 }),
    tealdark: new THREE.MeshPhysicalMaterial({ color: '#1d5e66', roughness: 0.38, clearcoat: 0.3 }),
    visor: new THREE.MeshPhysicalMaterial({ color: '#0a1016', roughness: 0.06, clearcoat: 1, emissive: '#ffffff', emissiveMap: face.tex, emissiveIntensity: 1.6 }),
    seam: new THREE.MeshStandardMaterial({ color: '#3b434c', roughness: 0.5 }),
    metal: new THREE.MeshStandardMaterial({ color: '#c4cad2', roughness: 0.28, metalness: 1 }),
    leaf: new THREE.MeshPhysicalMaterial({ color: '#5aa845', roughness: 0.42, clearcoat: 0.3, side: THREE.DoubleSide }),
    glow: new THREE.MeshBasicMaterial({ color: '#9ff6ff', toneMapped: false }),
    badge: new THREE.MeshPhysicalMaterial({ color: '#0c1a1c', roughness: 0.08, clearcoat: 1, emissive: '#ffffff', emissiveMap: leafBadge(), emissiveIntensity: 1.2 }),
  };
  const root = new THREE.Group(); root.name = 'robo-da';
  const float = new THREE.Group(); root.add(float);
  const piv = LAB_ROBOT ? LAB_ROBOT.pivots : { head: [0, 0.545, 0], arm_a: [-0.2, 0.455, 0.005], arm_b: [0.2, 0.455, 0.005] };
  const groups = { body: float, hover: float };
  for (const k of ['head', 'arm_a', 'arm_b']) { const g = new THREE.Group(); g.position.fromArray(piv[k]); float.add(g); groups[k] = g; }
  if (LAB_ROBOT) for (const e of LAB_ROBOT.parts) {
    const m = new THREE.Mesh(decodePart(e), M[e.m] || M.shell); m.castShadow = false;
    if (e.m === 'visor' || e.m === 'leaf' || e.m === 'badge') m.material.side = THREE.DoubleSide;
    const g = groups[e.g] || float; if (g !== float) m.position.set(-piv[e.g][0], -piv[e.g][1], -piv[e.g][2]);
    g.add(m);
  }
  // a soft round shadow on the floor
  const sc = document.createElement('canvas'); sc.width = sc.height = 128; const sx = sc.getContext('2d');
  const gr = sx.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); sx.fillStyle = gr; sx.fillRect(0, 0, 128, 128);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false, toneMapped: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.004; root.add(sh);
  const st = { t: 0, blinkT: 2, blink: 0, expr: 'happy', exprT: 0, talk: 0, look: 0, wave: 0 };
  return {
    root, M, face,
    say(expr, seconds) { st.expr = expr || 'happy'; st.exprT = 3; st.talkT = seconds; },
    wave() { st.wave = 1.6; },
    update(dt, camPos) {
      st.t += dt;
      float.position.y = 0.1 + Math.sin(st.t * 1.8) * 0.018;
      float.rotation.z = Math.sin(st.t * 0.9) * 0.02;
      // blink now and then
      st.blinkT -= dt; if (st.blinkT < 0) { st.blink = 1; st.blinkT = 2.5 + Math.random() * 3; }
      st.blink = Math.max(0, st.blink - dt * 7);
      st.talkT = Math.max(0, (st.talkT || 0) - dt);
      const talk = st.talkT > 0 ? 0.5 + 0.5 * Math.sin(st.t * 17) * Math.sin(st.t * 5.3) : 0;
      st.exprT -= dt; if (st.exprT < 0 && st.talkT <= 0) st.expr = 'happy';
      face.draw(st.talkT > 0 && st.expr === 'happy' ? 'normal' : st.expr, st.blink > 0.5 ? 1 : 0, Math.max(0, talk));
      // the head turns toward the child, with a little curiosity
      if (camPos) {
        const p = root.position; const a = Math.atan2(camPos.x - p.x, camPos.z - p.z) - root.rotation.y;
        const want = THREE.MathUtils.clamp(Math.atan2(Math.sin(a), Math.cos(a)), -0.6, 0.6) + Math.sin(st.t * 0.5) * 0.12;
        groups.head.rotation.y += (want - groups.head.rotation.y) * Math.min(1, dt * 3);
        groups.head.rotation.x = Math.sin(st.t * 0.7) * 0.04 - (st.expr === 'curious' ? 0.06 : 0);
        groups.head.rotation.z = st.expr === 'curious' ? 0.12 : Math.sin(st.t * 0.4) * 0.03;
      }
      // arms: a gentle swing, or a wave hello
      st.wave = Math.max(0, st.wave - dt);
      groups.arm_a.rotation.z = -0.08 + Math.sin(st.t * 1.8 + 1) * 0.05;
      groups.arm_b.rotation.z = st.wave > 0 ? 1.9 + Math.sin(st.t * 12) * 0.35 : 0.08 + Math.sin(st.t * 1.8) * 0.05;
      groups.arm_b.rotation.x = st.wave > 0 ? -0.4 : 0;
    },
  };
}

// ───────────────────────────────────────── the lab
export function createLab({ root, pipe, audio, thumbs = CARD_ART, onExit, openGame }) {
  const el = document.createElement('div'); el.className = 'lb'; root.appendChild(el);
  const scene = pipe.scene, camera = pipe.camera, renderer = pipe.renderer;
  const group = new THREE.Group(); group.name = 'lab';
  const loader = new THREE.TextureLoader();
  const tex = {};
  const art = (LAB_ART && LAB_ART.st) || {};
  const cams = (LAB_ART && LAB_ART.cams && LAB_ART.cams.stations) || {};
  const fallback = (() => { const cv = document.createElement('canvas'); cv.width = 16; cv.height = 9; const c = cv.getContext('2d'); const g = c.createLinearGradient(0, 0, 0, 9); g.addColorStop(0, '#3a5a4a'); g.addColorStop(1, '#1a2a20'); c.fillStyle = g; c.fillRect(0, 0, 16, 9); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  function texOf(id) {
    if (tex[id]) return tex[id];
    if (!art[id]) return id !== 'home' && art.home ? texOf('home') : fallback;
    const t = loader.load(art[id]); t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
    return (tex[id] = t);
  }
  // the rendered room behind everything: two pictures, cross-faded during a move
  const bgU = { tA: { value: fallback }, tB: { value: fallback }, uMix: { value: 0 }, uCrop: { value: new THREE.Vector4(0, 0, 1, 1) }, uZoomA: { value: 1 }, uZoomB: { value: 1 } };
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: bgU, depthTest: false, depthWrite: false, toneMapped: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }',
    fragmentShader: `uniform sampler2D tA, tB; uniform float uMix, uZoomA, uZoomB; uniform vec4 uCrop; varying vec2 vUv;
      vec2 cr(vec2 uv, float z){ vec2 p = uCrop.xy + uv * uCrop.zw; return (p - 0.5) / z + 0.5; }
      void main(){ vec4 a = texture2D(tA, cr(vUv, uZoomA)); vec4 b = texture2D(tB, cr(vUv, uZoomB)); gl_FragColor = mix(a, b, uMix);
        #include <colorspace_fragment>
      }`,
  }));
  bg.frustumCulled = false; bg.renderOrder = -1000; group.add(bg);
  // light for the live things, close to the room's (the morning sun through the windows, warm lamps, the room around)
  const hemi = new THREE.HemisphereLight('#f4eee2', '#8a6a4a', 1.25); group.add(hemi);
  const key = new THREE.DirectionalLight('#fff0dc', 1.6); key.position.set(0.3 * 10, 0.5 * 10, -0.82 * 10); group.add(key);
  const fill = new THREE.DirectionalLight('#ffe2c0', 1.1); fill.position.set(0, 3, 4); group.add(fill);
  let envTex = null;
  if (LAB_ART && LAB_ART.env) {
    loader.load(LAB_ART.env, (t) => { t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace; const pm = new THREE.PMREMGenerator(renderer); envTex = pm.fromEquirectangular(t).texture; pm.dispose(); t.dispose(); if (open_) scene.environment = envTex; });
  }
  const robot = makeRobot(); group.add(robot.root);
  // the furniture as invisible depth (tools/lab-proxy.py): the robot and the fish go behind the table like in the picture
  if (LAB_ROBOT && LAB_ROBOT.proxy) {
    const pm = new THREE.Mesh(decodePart(LAB_ROBOT.proxy), new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide }));
    pm.renderOrder = -500; pm.frustumCulled = false; group.add(pm);
  }
  // fish in the aquarium: the reef's own rigged fish, small
  const fish = []; let fishLoading = false;
  async function addFish() {
    if (fishLoading || fish.length || !LAB_ART || !LAB_ART.cams || !LAB_ART.cams.aquarium) return; fishLoading = true;
    try {
      const Z = (await loadPack('reef')).zone; const aq = LAB_ART.cams.aquarium;
      const box = { c: new THREE.Vector3().fromArray(aq.centre), s: aq.size, yaw: THREE.MathUtils.degToRad(aq.yaw) };
      const picks = ['clownfish', 'butterflyfish', 'butterflyfish', 'surgeonfish', 'cleaner', 'parrotfish', 'goby'];
      for (let i = 0; i < picks.length; i++) {
        const b = Z.animals[picks[i]]; if (!b) continue;
        const v = b({ seed: 100 + i, rng: makeRng(100 + i) });
        const bb = new THREE.Box3().setFromObject(v.object); const L = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) || 1;
        const k = (picks[i] === 'parrotfish' ? 0.2 : picks[i] === 'surgeonfish' ? 0.17 : 0.11) / L;
        const holder = new THREE.Group(); holder.add(v.object); v.object.scale.multiplyScalar(k);
        group.add(holder);
        const f = { v, holder, box, p: new THREE.Vector3(), tgt: new THREE.Vector3(), speed: 0.12 + Math.random() * 0.1, t: Math.random() * 10 };
        pickTarget(f, true); f.p.copy(f.tgt); pickTarget(f); fish.push(f);
      }
      updateFishVisible();
    } catch (e) { console.warn('lab fish', e); }
  }
  const _q = new THREE.Vector3();
  function boxPoint(box, u, v, w, out) {
    out.set((u - 0.5) * box.s[0], (v - 0.5) * box.s[1], (w - 0.5) * box.s[2]);
    out.applyAxisAngle(new THREE.Vector3(0, 1, 0), box.yaw); return out.add(box.c);
  }
  function pickTarget(f, first) { boxPoint(f.box, 0.06 + Math.random() * 0.88, 0.15 + Math.random() * 0.75, 0.15 + Math.random() * 0.7, f.tgt); }
  function updateFishVisible() { const on = station === 'aquarium'; for (const f of fish) f.holder.visible = on; }

  // ── the screen
  let open_ = false, station = 'home', prevSt = null, move = 0, panel = null, sayT = 0, greeted = false;
  const prevState = {};
  el.innerHTML = `<div class="lb-top"><button class="lb-btn lb-exit">${icon('arrowL')}<span>למרכז המדעי</span></button>
      <button class="lb-btn lb-talk"><i class="lb-tface"></i><span>לדבר עם רובו־דע</span></button>
      <div class="lb-title"><small>המרכז המדעי</small><h1>המעבדה של רובו־דע</h1></div></div>
    <div class="lb-hots"></div>
    <nav class="lb-bar">${ORDER.map((id) => `<button data-st="${id}" class="${id === 'home' ? 'on' : ''}">${icon(STATION_INFO[id].ic || 'leaf')}<span>${STATION_INFO[id].name}</span></button>`).join('')}</nav>
    <div class="lb-panels"></div><div class="lb-say" hidden><i class="lb-face"></i><p></p></div>`;
  const hots = el.querySelector('.lb-hots'), sayEl = el.querySelector('.lb-say'), panels = el.querySelector('.lb-panels');
  el.querySelector('.lb-exit').onclick = () => { close(); onExit && onExit(); };
  el.querySelector('.lb-talk').onclick = () => openTalk();
  el.querySelectorAll('[data-st]').forEach((b) => b.onclick = () => go(b.dataset.st));
  hots.innerHTML = ORDER.filter((id) => id !== 'home').map((id) => `<button class="lb-hot" data-hot="${id}">${icon(STATION_INFO[id].ic || 'leaf')}<span>${STATION_INFO[id].name}</span></button>`).join('');
  hots.querySelectorAll('[data-hot]').forEach((b) => b.onclick = () => go(b.dataset.hot));

  function say(text, expr = 'happy') {
    sayEl.hidden = false; sayEl.querySelector('p').textContent = text;
    sayEl.classList.remove('pop'); void sayEl.offsetWidth; sayEl.classList.add('pop');
    robot.say(expr, Math.min(4, 0.8 + text.length * 0.045)); sayT = 6 + text.length * 0.06;
  }
  function go(id) {
    if (!STATION_INFO[id]) return;
    if (panel) { panel.close(); panel = null; }
    if (id === station && move <= 0) { arrive(); return; }
    audio && audio.play('select');
    prevSt = station; station = id; move = 1;
    bgU.tA.value = texOf(prevSt); bgU.tB.value = texOf(station); bgU.uMix.value = 0;
    el.querySelectorAll('[data-st]').forEach((b) => b.classList.toggle('on', b.dataset.st === station));
    hots.classList.toggle('on', station === 'home');
    placeRobot(true); updateFishVisible();
    if (station === 'aquarium') addFish();
  }
  function arrive() {
    const info = STATION_INFO[station];
    if (info.open === 'scope') panel = openMicroscope(panels, { say, thumbs, audio, onDone: () => { robot.wave(); const P = labProgress(); if (SAMPLES.every((x) => P.seen[x.id])) grantBadge('lab:scope'); }, onClose: () => { panel = null; } });
    else if (info.open === 'inventors') {
      // the inventors table is the hub's "הממציאים" (problems and robots, with the child's own cards); the lab stays underneath
      robot.wave(); say('שולחן הממציאים! כאן פותרים בעיות אמיתיות בעזרת היצורים שלכם, ובונים רובוטים. מותר לטעות, ככה ממציאים.', 'happy');
      if (openGame) setTimeout(() => openGame('inventors'), 700);
      else panel = openInventors(panels, { say, thumbs, audio, onInvented: () => robot.wave(), onClose: () => { panel = null; }, goScope: () => setTimeout(() => go('scope'), 900) });
    }
    else if (info.open === 'atlas') panel = openAtlas(panels, { say, thumbs, onClose: () => { panel = null; } });
    else if (station === 'cabinet') { const n = Object.keys(labProgress().seen).length; say(n ? `בארון האוסף שומרים את מה שמצאנו. כבר יש כאן ${n} ${n === 1 ? 'גילוי' : 'גילויים'} מהמיקרוסקופ.` : 'בארון האוסף שומרים את מה שמצאנו: קונכיות, נוצות, זרעים ושברי אלמוג. כל גילוי במיקרוסקופ יוסיף כאן עוד משהו.', 'happy'); }
    else if (info.say) say(info.say, 'happy');
    else if (station === 'home') say('לאן הולכים עכשיו? המיקרוסקופ מחכה לכם, וגם שולחן הממציאים.', 'happy');
  }
  const _fromP = new THREE.Vector3(), _toP = new THREE.Vector3();
  let robotMove = 0;
  // where the robot hovers: by his charging pad in the room view; at a station, in the near corner of the picture
  const SIDE = {};   // table: behind the table (ROBOT_SPOT); the close views (microscope, aquarium, cabinet, greenhouse, atlas) leave him out: his words sit in the corner with his face
  const robotShown = () => viewOf(station) === 'home' || station === 'table' || !!SIDE[station];
  function placeRobot(fly) {
    robot.root.visible = robotShown();
    const c = cams[viewOf(station)]; if (!c) return;
    const cp = new THREE.Vector3().fromArray(c.pos);
    if (!SIDE[station] || viewOf(station) !== station) { _toP.fromArray(viewOf(station) === station ? (ROBOT_SPOT[station] || c.robot) : c.robot); _toP.y = 0; }
    else {
      const fwd = new THREE.Vector3().fromArray(c.at).sub(cp); fwd.y = 0; const d = fwd.length(); fwd.normalize();
      const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0));
      // well in front of the station's furniture, in the near corner of the picture
      _toP.copy(cp).addScaledVector(fwd, Math.min(2.3, d * 0.62)).addScaledVector(right, SIDE[station] * Math.min(1.0, d * 0.4)); _toP.y = 0;
    }
    if (fly) { _fromP.copy(_toP).add(new THREE.Vector3(cp.x - _toP.x, 0, cp.z - _toP.z).normalize().cross(new THREE.Vector3(0, 1, 0)).multiplyScalar(1.6)); robotMove = 1; }
    else { _fromP.copy(_toP); robotMove = 0; robot.root.position.copy(_toP); }
    robot.root.rotation.y = Math.atan2(cp.x - _toP.x, cp.z - _toP.z);
  }
  // camera = the Blender camera of the station; the picture is cropped to fill the screen (cover), the camera with it
  const crop = { x: 0, y: 0, w: 1, h: 1 }; const _at = new THREE.Vector3();
  // a station whose picture is not rendered yet shows the room (its picture and its camera)
  const viewOf = (id) => (art[id] && cams[id] ? id : 'home');
  function setCamera(id) {
    const c = cams[viewOf(id)]; if (!c) return;
    camera.position.fromArray(c.pos); camera.up.set(0, 1, 0); camera.lookAt(_at.fromArray(c.at));   // Blender aims its cameras with no roll, like lookAt
    const W = renderer.domElement.clientWidth || innerWidth, H = renderer.domElement.clientHeight || innerHeight; const A = W / H;
    const FW = 1600, FH = FW / IMG_ASPECT;
    if (A > IMG_ASPECT) { crop.w = 1; crop.h = IMG_ASPECT / A; } else { crop.h = 1; crop.w = A / IMG_ASPECT; }
    crop.x = (1 - crop.w) / 2; crop.y = (1 - crop.h) / 2;
    camera.fov = c.fov; camera.aspect = IMG_ASPECT; camera.near = 0.05; camera.far = 200;
    camera.setViewOffset(FW, FH, crop.x * FW, crop.y * FH, crop.w * FW, crop.h * FH);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    bgU.uCrop.value.set(crop.x, 1 - crop.y - crop.h, crop.w, crop.h);
  }
  const _v = new THREE.Vector3(), _up = new THREE.Vector3(0.6, 1.4, 0);
  function project(p) { _v.copy(p).project(camera); return { x: (_v.x * 0.5 + 0.5) * 100, y: (-_v.y * 0.5 + 0.5) * 100, ok: _v.z < 1 }; }
  function update(dt) {
    if (!open_) return;
    setCamera(station);
    if (move > 0) {
      move = Math.max(0, move - dt / 0.75); const k = 1 - move; const e = k * k * (3 - 2 * k);
      bgU.uMix.value = e; bgU.uZoomA.value = 1 + e * 0.12; bgU.uZoomB.value = 1.08 - e * 0.08;
      robot.root.visible = e > 0.6 && robotShown();
      if (move === 0) { bgU.tA.value = bgU.tB.value; bgU.uMix.value = 0; bgU.uZoomA.value = 1; arrive(); }
    }
    if (robotMove > 0) { robotMove = Math.max(0, robotMove - dt / 1.1); const k = 1 - robotMove; const e = 1 - (1 - k) * (1 - k); robot.root.position.lerpVectors(_fromP, _toP, e); }
    fill.position.copy(camera.position).add(_up); fill.target = robot.root;   // a soft light from the child's side
    robot.update(dt, camera.position);
    for (const f of fish) {
      if (!f.holder.visible) continue;
      f.t += dt; _q.subVectors(f.tgt, f.p); const d = _q.length();
      if (d < 0.05) pickTarget(f);
      _q.normalize(); f.p.addScaledVector(_q, Math.min(d, f.speed * dt));
      f.holder.position.copy(f.p); const yaw = Math.atan2(_q.x, _q.z);
      f.holder.rotation.y += Math.atan2(Math.sin(yaw - f.holder.rotation.y), Math.cos(yaw - f.holder.rotation.y)) * Math.min(1, dt * 3);
      f.v.update(dt, { action: 'fly', speed: f.speed * 4, t: f.t });
    }
    // hotspots (home) and the speech bubble above the robot's head
    if (station === 'home' && move === 0) {
      for (const b of hots.children) { const c = cams[b.dataset.hot]; if (!c) { b.hidden = true; continue; } const p = project(_v.fromArray(c.at || c.robot)); b.hidden = !p.ok; b.style.left = p.x + '%'; b.style.top = p.y + '%'; }
    }
    if (sayT > 0) {
      sayT -= dt; if (sayT <= 0) sayEl.hidden = true;
      // over a panel the robot is hidden: his words sit in a corner, with his face
      const hp = robot.root.position.clone(); hp.y = 1.22; const p = project(hp);
      const dock = !!panel || !p.ok || p.x < 12 || p.x > 88 || p.y < 14 || !robot.root.visible;
      sayEl.classList.toggle('dock', dock);
      if (!dock) { sayEl.style.left = p.x + '%'; sayEl.style.top = Math.max(16, p.y - 2) + '%'; }
      else { sayEl.style.left = ''; sayEl.style.top = ''; }
    }
  }
  function open() {
    if (open_) return; open_ = true; el.classList.add('on');
    prevState.tone = renderer.toneMapping; prevState.env = scene.environment; prevState.bg = scene.background; prevState.fog = scene.fog;
    renderer.toneMapping = THREE.NoToneMapping; scene.environment = envTex; scene.background = null; scene.fog = null;
    if (pipe.setBloom) pipe.setBloom(0.12);
    scene.add(group);
    station = 'home'; move = 0; bgU.tA.value = texOf('home'); bgU.uMix.value = 0; bgU.uZoomA.value = 1;
    hots.classList.add('on'); el.querySelectorAll('[data-st]').forEach((b) => b.classList.toggle('on', b.dataset.st === 'home'));
    placeRobot(false); robot.root.visible = true; updateFishVisible();
    // warm up the other pictures in the background
    setTimeout(() => ORDER.forEach(texOf), 300);
    if (!greeted) { greeted = true; setTimeout(() => { robot.wave(); say('שלום! אני רובו־דע. כאן במעבדה מגלים איך הטבע עובד, וממציאים בעזרתו. במה נתחיל?', 'happy'); }, 600); }
    else say('ברוכים השבים למעבדה!', 'happy');
  }
  function close() {
    if (!open_) return; open_ = false; el.classList.remove('on');
    if (panel) { panel.close(); panel = null; }
    scene.remove(group); camera.clearViewOffset();
    renderer.toneMapping = prevState.tone; scene.environment = prevState.env || null; scene.background = prevState.bg || null; scene.fog = prevState.fog || null;
    if (pipe.setBloom) pipe.setBloom(0.38);
    pipe.resize();
  }
  // ── talking with רובו־דע: questions the child picks; his answers depend on what was already done
  const TALK = {
    who: { q: 'מי אתה?', a: () => 'אני רובו־דע, הרובוט של המעבדה. אני עוזר לחוקרים צעירים: מראה איפה לחפש, שואל שאלות, ולפעמים גם מתבלבל. אבל אני אף פעם לא מגלה את התשובה. אותה אתם מוצאים!', e: 'happy' },
    what: { q: 'מה עושים כאן?', a: () => 'במיקרוסקופ מגדילים דגימות ומחפשים סודות קטנים. בשולחן הממציאים פותרים בעיות בעזרת היצורים, ובונים רובוטים. באטלס נרשם כל מה שגיליתם. ובאקווריום ובחממה... עוד מעט יהיו ניסויים!', e: 'curious' },
    next: { q: 'מה כדאי לי לעשות עכשיו?', a: () => {
      const P = labProgress(); const s = SAMPLES.find((x) => !P.seen[x.id]);
      if (s) return `אולי נסתכל במיקרוסקופ על ${s.name}? יש שם משהו שעוד לא מצאתם.`;
      if (!P.inventions.sharkskin) return 'כל הדגימות נבדקו! עכשיו לשולחן הממציאים: אולי תצליחו להמציא בגד שחייה מהיר?';
      return 'גיליתם כל כך הרבה! נסו לבנות בשולחן הממציאים רובוט מטורף, או צאו למשלחת לעומק במרכז הלמידה.';
    }, e: 'curious' },
    fact: { q: 'ספר לי משהו מפתיע', a: () => FACTS[(talkN++) % FACTS.length], e: 'wow' },
    joke: { q: 'בדיחה!', a: () => JOKES[(jokeN++) % JOKES.length], e: 'happy' },
    feel: { q: 'איך אתה מרגיש?', a: () => { const n = Object.keys(labProgress().seen).length; return n >= 6 ? 'מצוין! מצאתם כבר ' + n + ' דגימות. אני מרגיש כמו רובוט של חוקרים אמיתיים.' : n ? 'שמח! כבר מצאתם ' + n + (n === 1 ? ' דגימה' : ' דגימות') + '. יש עוד הרבה לגלות.' : 'קצת משועמם... עוד לא בדקנו אף דגימה. בואו למיקרוסקופ!'; }, e: 'happy' },
  };
  // true facts, gently said (docs/sources.md, the lab)
  const FACTS = [
    'לתמנון יש שלושה לבבות, וכל אחת מהזרועות שלו יכולה לטעום את מה שהיא נוגעת בו.',
    'הזיקית יכולה להזיז כל עין לחוד: אחת מסתכלת קדימה, ואחת אחורה.',
    'לכריש אין עצמות בכלל. השלד שלו עשוי סחוס, כמו קצה האף.',
    'התנשמת יכולה לצוד בחושך מוחלט, רק לפי השמיעה.',
    'הגחלילית מאירה כמעט בלי חום. נורה רגילה מתחממת הרבה יותר.',
    'קיפוד ים הולך על מאות רגליים זעירות שיוצאות בין הקוצים שלו.',
    'יונק הדבש יכול לעוף גם אחורה!',
    'העלה של הוויקטוריה האמזונית יכול להיות רחב יותר משני מטרים.',
  ];
  const JOKES = [
    'למה פחדתי להיכנס לאקווריום? חשבתי שאחליד. מאז שקיבלתי ציפוי עור כריש, אני כבר לא מפחד!',
    'ניסיתי ללמוד מהעצלן איך לנוח. אבל עד שהתחלתי, כבר נגמר היום.',
    'שאלתי את הזיקית מה הצבע האהוב עליה. היא אמרה: "תלוי איפה אני עומדת".',
    'בניתי רובוט עם קוצים של קיפוד. עכשיו אף אחד לא רוצה לחבק אותו.',
    'התמנון ניצח אותי בציור. יש לו שמונה מכחולים!',
  ];
  let talkN = 0, jokeN = 0, talkEl = null;
  function openTalk() {
    if (talkEl) { talkEl.remove(); talkEl = null; return; }
    if (panel) { panel.close(); panel = null; }
    talkEl = document.createElement('div'); talkEl.className = 'lb-panel lb-chat';
    talkEl.innerHTML = `<header><h2>מדברים עם רובו־דע</h2><button class="lb-btn lb-back">סגירה</button></header>
      <p class="lb-chat-sub">בחרו שאלה, ורובו־דע יענה.</p>
      <div class="lb-qs">${Object.entries(TALK).map(([k, t]) => `<button data-q="${k}">${esc(t.q)}</button>`).join('')}</div>`;
    panels.appendChild(talkEl);
    talkEl.querySelector('.lb-back').onclick = () => { talkEl.remove(); talkEl = null; };
    talkEl.querySelectorAll('[data-q]').forEach((b) => b.onclick = () => { const t = TALK[b.dataset.q]; audio && audio.play('click'); robot.wave(); say(t.a(), t.e); });
    say('שאלו אותי מה שתרצו. כלומר... מה שכתוב על הכפתורים.', 'happy');
  }

  window.__labDebug = { go, say, openTalk, get station() { return station; }, robot, openPanel: (k) => { station = k; arrive(); } };
  return { open, close, update, isOpen: () => open_ };
}

// ───────────────────────────────────────── the atlas: every creature studied, with its stamps
function openAtlas(root, { say, thumbs, onClose }) {
  const el = document.createElement('div'); el.className = 'lb-panel lb-atlas'; root.appendChild(el);
  const P = labProgress();
  const rows = SAMPLES.map((s) => {
    const zoom = !!P.seen[s.id], idea = !!P.inventions[s.species] || (s.id === 'sharkskin' && !!P.inventions.sharkskin);
    return `<article class="lb-a-card ${zoom ? '' : 'dim'}">${thumbs[s.species] ? `<img src="${thumbs[s.species]}" alt="">` : ''}
      <div><b>${esc(s.name)}</b><div class="lb-stamps"><span class="${zoom ? 'on z' : ''}">הוגדל</span><span class="${idea ? 'on i' : ''}">השראה</span></div>
      <p>${zoom ? esc(s.found) : 'עוד לא הסתכלנו במיקרוסקופ.'}</p></div></article>`;
  }).join('');
  el.innerHTML = `<header><h2>האטלס</h2><p>כל יצור שחקרתם מקבל דף. כל חותמת פותחת עוד חלק מהסיפור שלו.</p><button class="lb-btn lb-back">חזרה לחדר</button></header><div class="lb-a-grid">${rows}</div>`;
  el.querySelector('.lb-back').onclick = () => { el.remove(); onClose && onClose(); };
  say('באטלס נרשום את כל היצורים שחקרתם. חותמת "הוגדל" מקבלים במיקרוסקופ, וחותמת "השראה" בשולחן הממציאים.', 'happy');
  return { close: () => { el.remove(); onClose && onClose(); } };
}
