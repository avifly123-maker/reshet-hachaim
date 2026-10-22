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
import { THINK, OPEN as THINK_OPEN, openThinkMenu, thinkById, thinkDone } from './thinking.js';   // חושבים כמו חוקרים
import { openQuestions, answeredCount, islandQuestions } from './questions.js';
import { markHTML } from '../ui/threads-ui.js';   // חוטים: "מהאי שלכם" on the atlas's questions button
import { labKids, fmt, readMs } from './level.js';
import { ROOM_K, TALK_K, FACTS_K, JOKES_K, ATLAS_K, SAMPLES_K, THINK_K } from './kids-text.js';   // the beginners' words (ניקוד מלא)
// the station worlds (19.10): the aquarium, the greenhouse and the cabinet open a menu of their own activities
import { openStationMenu, one, face as stFace, injectStationCss } from './station-kit.js';
import { MENU_T, COMMON_T, DOORS_T } from './station-text.js';
// מסע החוקר (1.3.2): the stations open one after the other; רובו־דע presents each one the first time
import { isOpen as partOpen, lockInfo, markUsed, introSeen, markIntro, state as journeyState, PARTS } from '../core/journey.js';
import { LAB_GUIDE } from '../data/guide/lab.js';
import { BABA_DA_LOGO } from '../data/logo.js';
import { stOf, thinkOf } from './progress.js';
import { openMiniReef, openDayNight } from './aquarium.js';
import { openGrow, openSeeds } from './greenhouse.js';
import { openCollection, openSort, openClues, collectionCount, shelfPeek } from './cabinet.js';
// the look-around room (19.10): a panorama from the room's centre, turning, and the robot's walks to the stations
import { createRoomView, yawOf } from './room-view.js';

const STATION_INFO = {
  home: { name: 'החדר', ic: 'home' },
  scope: { name: 'המיקרוסקופ', ic: 'binoc', open: 'scope' },
  table: { name: 'שולחן הממציאים', ic: 'bulb', open: 'inventors' },
  aquarium: { name: 'האקווריום', ic: 'drop', menu: ['minireef', 'daynight', 'float'] },
  greenhouse: { name: 'החממה', ic: 'sprout', menu: ['grow', 'seeds', 'fair'] },
  cabinet: { name: 'ארון האוסף', ic: 'leaf', menu: ['collection', 'sort', 'clues', 'observe'] },
  atlas: { name: 'האטלס', ic: 'book', open: 'atlas' },
};
// the activities of the station worlds (the thinking corner's own activities open through THINK_OPEN)
const ACTS = { minireef: openMiniReef, daynight: openDayNight, grow: openGrow, seeds: openSeeds, collection: openCollection, sort: openSort, clues: openClues };
const ACT_IC = { minireef: 'drop', daynight: 'moon', float: 'drop', grow: 'sprout', seeds: 'leaf', fair: 'sprout', collection: 'satchel', sort: 'cards', clues: 'search', observe: 'binoc' };
const ACT_DONE = { minireef: (r) => (r.ends || {}).thriving ? 'done' : r.runs ? 'mid' : '', daynight: (r) => Object.keys(r.found || {}).length >= 8 ? 'done' : r.found ? 'mid' : '',
  grow: (r) => Object.keys(r.ends || {}).length >= 4 ? 'done' : r.ends ? 'mid' : '', seeds: (r) => Object.keys(r.won || {}).length >= 4 ? 'done' : r.tries ? 'mid' : '',
  collection: (r) => (r.max || 0) >= 20 ? 'done' : '', sort: (r) => (r.robotGuessed || 0) >= 1 && (r.childGuessed || 0) >= 2 ? 'done' : r.robotGuessed || r.childGuessed ? 'mid' : '',
  clues: (r) => Object.keys(r.solved || {}).length >= 8 ? 'done' : r.solved ? 'mid' : '' };
// the orange spots on the room picture: a point on each piece of furniture (three's axes); a station outside the picture
// (the aquarium on the left wall, the greenhouse and the cabinet behind the right edge) gets a spot on that edge, pointing
const HOT = {
  scope: { p: [2.215, 1.3, -3.545] }, table: { p: [0.05, 0.86, -0.15] }, atlas: { p: [-2.3, 1.2, -3.2] },
  aquarium: { p: [-4.284, 1.35, 0.375], ey: 50 }, greenhouse: { p: [3.3, 0.95, 0.3], ey: 56 }, cabinet: { p: [3.493, 1.15, 3.145], ey: 70 },
};
const ROBOT_SPOT = { table: [-0.75, 0, -1.05] };   // three's axes: behind the inventors table, on the left
// the look-around room: a point on each station as seen from the room's centre (the panorama's eye), the robot's place
// in the room when the lab opens (beside the table, clear of it, in sight), and the first direction of the view
const HOT_P = {
  scope: [2.215, 1.25, -3.545], table: [0.05, 0.9, -0.8], atlas: [-2.35, 1.2, -3.25],
  aquarium: [-4.15, 1.4, 0.375], greenhouse: [3.95, 1.1, 0.0], cabinet: [3.4, 1.2, 3.05],
};
const HOME_SPOT = [-2.78, 0, -0.25];
const ROOM_SPOT = { table: [-1.85, 0, -0.45] };   // in the room he waits at the table's end, where the child can see him
const VIEW0 = { yaw: -58, pitch: -10 };
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
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
      if (expr === 'oops' && blink < 0.5) {   // an embarrassed robot: slanted lines
        c.lineWidth = 16; const t = cx < 256 ? -1 : 1; c.beginPath(); c.moveTo(cx - 20, 112 + 7 * t); c.lineTo(cx + 20, 112 - 7 * t); c.stroke();
      } else if (expr === 'happy' && blink < 0.5) {   // smiling eyes: soft arches
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
    else if (expr === 'oops') { c.beginPath(); c.moveTo(222, 186); c.quadraticCurveTo(239, 172, 256, 186); c.quadraticCurveTo(273, 200, 290, 186); c.stroke(); }
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
  const st = { t: 0, blinkT: 2, blink: 0, expr: 'happy', exprT: 0, talk: 0, look: 0, wave: 0, lean: 0 };
  return {
    root, M, face,
    say(expr, seconds) { st.expr = expr || 'happy'; st.exprT = 3; st.talkT = seconds; },
    wave() { st.wave = 1.6; },
    lean(v) { st.lean = v; },   // a little forward while he glides (the look-around room's walks)
    update(dt, camPos) {
      st.t += dt;
      float.position.y = 0.1 + Math.sin(st.t * 1.8) * 0.018;
      float.rotation.z = Math.sin(st.t * 0.9) * 0.02;
      float.rotation.x += (st.lean - float.rotation.x) * Math.min(1, dt * 6);
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
  // (uAlpha: a station's picture fading in over the look-around room, or out of it; blended while staying in the opaque
  // pass, so the robot is still drawn over it)
  const bgU = { tA: { value: fallback }, tB: { value: fallback }, uMix: { value: 0 }, uCrop: { value: new THREE.Vector4(0, 0, 1, 1) }, uZoomA: { value: 1 }, uZoomB: { value: 1 }, uAlpha: { value: 1 } };
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: bgU, depthTest: false, depthWrite: false, toneMapped: false,
    blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }',
    fragmentShader: `uniform sampler2D tA, tB; uniform float uMix, uZoomA, uZoomB, uAlpha; uniform vec4 uCrop; varying vec2 vUv;
      vec2 cr(vec2 uv, float z){ vec2 p = uCrop.xy + uv * uCrop.zw; return (p - 0.5) / z + 0.5; }
      void main(){ vec4 a = texture2D(tA, cr(vUv, uZoomA)); vec4 b = texture2D(tB, cr(vUv, uZoomB)); gl_FragColor = vec4(mix(a, b, uMix).rgb, uAlpha);
        #include <colorspace_fragment>
      }`,
  }));
  bg.frustumCulled = false; bg.renderOrder = -1000; group.add(bg);
  // the look-around room (src/lab/room-view.js): the panorama behind everything while the child is in the room
  const room = LAB_ART && LAB_ART.pano ? createRoomView({ url: LAB_ART.pano, eye: LAB_ART.cams && LAB_ART.cams.pano && LAB_ART.cams.pano.eye }) : null;
  if (room) group.add(room.quad);
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
  // the fish swim in the aquarium's own picture, and in the look-around room too (they are where the aquarium is)
  function updateFishVisible() { const on = view === 'room' || station === 'aquarium'; for (const f of fish) f.holder.visible = on; }

  // ── the screen
  let open_ = false, station = 'home', prevSt = null, move = 0, panel = null, sayT = 0, greeted = false, topDock = false;
  // view: 'room' = the look-around panorama (the room), 'pic' = a station's own picture with its Blender camera
  let view = room ? 'room' : 'pic';
  const prevState = {};
  // beginners (the start screen's מתחילים) read the room fully vocalised: the frame is painted again when the level changes
  let kids = labKids(), painted = null;
  const stName = (id) => (kids ? ROOM_K.stations[id] : STATION_INFO[id].name);
  injectStationCss();
  el.innerHTML = `<div class="lb-drag" aria-hidden="true"></div><div class="lb-top"><button class="lb-btn lb-exit">${icon('arrowL')}<span></span></button>
      <button class="lb-btn lb-talk"><i class="lb-tface"></i><span></span></button>
      <button class="lb-btn lb-think">${icon('flask')}<span></span></button>
      <div class="lb-title"><small></small><h1></h1></div>
      <button class="lb-btn lb-home">${icon('home')}<span></span></button><img class="lb-logo" src="${BABA_DA_LOGO}" alt="בבא דע" draggable="false"></div>
    <div class="lb-hots" role="group"></div>
    <button class="lb-turn lb-turn-l" data-turn="-1"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5L8 12l6.5 6.5"/></svg></button>
    <button class="lb-turn lb-turn-r" data-turn="1"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5.5L16 12l-6.5 6.5"/></svg></button>
    <div class="lb-look" hidden><svg viewBox="0 0 32 16" aria-hidden="true"><path d="M3 8h26M8 3L3 8l5 5M24 3l5 5-5 5"/></svg><span></span></div>
    <nav class="lb-bar">${ORDER.map((id) => `<button data-st="${id}" class="${id === 'home' ? 'on' : ''}">${icon(STATION_INFO[id].ic || 'leaf')}<span></span></button>`).join('')}</nav>
    <div class="lb-panels"></div><div class="lb-say" hidden><i class="lb-face"></i><p></p></div><i class="lb-ring" hidden></i>`;
  const hots = el.querySelector('.lb-hots'), sayEl = el.querySelector('.lb-say'), panels = el.querySelector('.lb-panels'), topEl = el.querySelector('.lb-top');
  el.querySelector('.lb-exit').onclick = () => { close(); onExit && onExit(); };
  el.querySelector('.lb-talk').onclick = () => openTalk();
  el.querySelector('.lb-think').onclick = () => thinkMenu();
  el.querySelector('.lb-home').onclick = () => go('home');   // the big way back from any station: the room's main view
  el.querySelectorAll('[data-st]').forEach((b) => b.onclick = () => go(b.dataset.st));
  // orange spots: hover, focus or a first touch shows the two words; a click (or a second touch) goes in
  hots.innerHTML = ORDER.filter((id) => id !== 'home').map((id) => `<button class="lb-hot" data-hot="${id}"><i class="lb-dot"></i><i class="lb-arrow" hidden></i><span class="lb-tip" role="tooltip"></span></button>`).join('');
  let touchShown = null;
  hots.querySelectorAll('[data-hot]').forEach((b) => {
    b.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      if (touchShown !== b) { touchShown = b; hots.querySelectorAll('.lb-hot').forEach((x) => x.classList.toggle('show', x === b)); b.dataset.skip = '1'; }
    });
    b.onclick = () => { if (b.dataset.skip) { delete b.dataset.skip; return; } touchShown = null; hots.querySelectorAll('.lb-hot').forEach((x) => x.classList.remove('show')); go(b.dataset.hot); };
  });
  el.addEventListener('pointerdown', (e) => { if (touchShown && !e.target.closest('.lb-hot')) { touchShown = null; hots.querySelectorAll('.lb-hot').forEach((x) => x.classList.remove('show')); } });
  // looking round the room: drag the room (mouse or finger), the two arrows (a click turns a step, holding keeps
  // turning), the keyboard's arrows. The left arrow turns to the left whatever the page's direction: it is a direction
  // in the room, not in the text. A click while the robot walks goes straight into the station.
  const dragEl = el.querySelector('.lb-drag'), lookEl = el.querySelector('.lb-look');
  if (room) {
    dragEl.addEventListener('pointerdown', (e) => {
      if (walk && walk.st) { finishWalk(); return; }
      if (view !== 'room' || station !== 'home' || e.button > 0) return;
      try { dragEl.setPointerCapture(e.pointerId); } catch (_) { /* a synthetic pointer */ }
      room.dragStart(e.clientX, e.clientY, el.clientWidth || innerWidth, el.clientHeight || innerHeight); dragEl.classList.add('grab');
    });
    dragEl.addEventListener('pointermove', (e) => { if (room.S.drag) room.dragMove(e.clientX, e.clientY, camera); });
    const up = () => { if (room.S.drag) { room.dragEnd(); dragEl.classList.remove('grab'); } };
    dragEl.addEventListener('pointerup', up); dragEl.addEventListener('pointercancel', up); dragEl.addEventListener('lostpointercapture', up);
    el.querySelectorAll('[data-turn]').forEach((b) => {
      const dir = +b.dataset.turn;
      b.addEventListener('pointerdown', (e) => { if (e.button > 0) return; try { b.setPointerCapture(e.pointerId); } catch (_) { /* */ } room.holdStart(dir); });
      const end = () => room.holdEnd();
      b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end); b.addEventListener('lostpointercapture', end);
      b.addEventListener('click', (e) => { if (e.detail === 0) room.step(dir * 40, 0); });   // Enter or Space on the focused arrow
    });
    addEventListener('keydown', (e) => {
      if (!open_ || view !== 'room' || e.target.closest && e.target.closest('input,textarea,select')) return;
      if (walk && walk.st && (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape')) { e.preventDefault(); finishWalk(); return; }
      if (station !== 'home' || panel || talkEl) return;
      const k = { ArrowLeft: [-30, 0], ArrowRight: [30, 0], ArrowUp: [0, 8], ArrowDown: [0, -8] }[e.key];
      if (k) { e.preventDefault(); room.step(k[0], k[1]); }
    });
  }
  function paintChrome() {
    kids = labKids(); if (painted === kids) return; painted = kids;
    el.classList.toggle('kids', kids);
    const T = (sel, t) => { const n = el.querySelector(sel); if (n) n.textContent = t; };
    T('.lb-exit span', kids ? ROOM_K.exit : 'למרכז המדעי'); T('.lb-talk span', kids ? ROOM_K.talk : 'לדבר עם רובו־דע'); T('.lb-think span', kids ? ROOM_K.think : 'חושבים כמו חוקרים');
    T('.lb-title small', kids ? ROOM_K.centre : 'המרכז המדעי'); T('.lb-title h1', kids ? ROOM_K.title : 'המעבדה של רובו־דע');
    T('.lb-home span', one(COMMON_T.room, kids));
    T('.lb-look span', kids ? ROOM_K.drag : 'גררו כדי להסתכל מסביב');
    const tl = el.querySelector('.lb-turn-l'), tr = el.querySelector('.lb-turn-r');
    tl.setAttribute('aria-label', kids ? ROOM_K.turnL : 'להסתובב שמאלה'); tr.setAttribute('aria-label', kids ? ROOM_K.turnR : 'להסתובב ימינה');
    el.querySelectorAll('[data-st] span').forEach((s) => { s.textContent = stName(s.parentNode.dataset.st); });
    hots.querySelectorAll('[data-hot]').forEach((b) => { const n = stName(b.dataset.hot); b.querySelector('.lb-tip').textContent = n; b.setAttribute('aria-label', n); });
  }
  paintChrome();

  // ── מסע החוקר (1.3.2): a station that is not open yet is veiled (a dim spot, a dim button in the bar, its name and
  // what opens it in the tip); a click lets רובו־דע say what opens it. Repainted whenever the journey changes.
  const partOf = (id) => 'lab:' + id;
  const stOpen = (id) => id === 'home' || partOpen(partOf(id));
  function paintLocks() {
    for (const b of el.querySelectorAll('[data-hot],[data-st]')) {
      const id = b.dataset.hot || b.dataset.st; if (id === 'home' || !STATION_INFO[id]) continue;
      const open = stOpen(id), n = stName(id), L = open ? null : lockInfo(partOf(id));
      b.classList.toggle('veil', !open);
      const tip = b.querySelector('.lb-tip'); if (tip) tip.textContent = L ? `${n} · ${L.text}` : n;
      if (b.dataset.hot) b.setAttribute('aria-label', L ? `${n}, ${L.text}` : n); else b.title = L ? L.text : '';
    }
  }
  // (a new stage reached inside the lab fires 'wol-stage', then 'wol-stage-done' when its moment closes: repaint on both)
  for (const ev of ['wol-journey', 'wol-stage', 'wol-stage-done']) addEventListener(ev, () => { if (open_) paintLocks(); });
  // something done at a station (any lab progress while the child is there) opens the next one (core/journey.js `after`)
  addEventListener('wol-progress', (e) => { if (open_ && station !== 'home' && e.detail && e.detail.kind === 'lab' && stOpen(station)) markUsed(partOf(station)); });
  // the line that says what opens a part (src/data/guide/lab.js 'lab:locks'): its stage, or the station before it
  function lockLine(part) {
    const P = PARTS[part] || {}, L = LAB_GUIDE['lab:locks'] || [], by = (k) => L.find((x) => x.id === 'lab.locks.' + k);
    let ln = null;
    try { if (journeyState().stage < (P.stage || 0)) ln = by('stage' + P.stage); else if (P.after) ln = by(P.after.replace(/^lab:/, '')); } catch (e) { /* */ }
    return ln || by('later');
  }
  function sayLocked(part) {
    try { audio && audio.play('click'); } catch (e) { /* */ }
    const ln = lockLine(part);
    if (ln) sayLines([ln]); else { const L = lockInfo(part); if (L) say(L.text, 'curious'); }
  }
  // his presentation lines (src/data/guide/lab.js): one bubble after the other, in his own voice when it exists
  // (__app.voice), each ringing the thing it talks about; a click on anything else (another station, an activity, a
  // panel's own words) stops them
  const ringEl = el.querySelector('.lb-ring');
  let introTok = 0, introT = 0, introWait = 0, ringAt = null, introVoice = false;
  // leaving the place (another station, an activity, closing the lab) also drops a presentation that is about to begin
  function cancelIntro() { clearTimeout(introWait); stopIntro(); }
  function stopIntro() {
    introTok++; clearTimeout(introT); setRing(null);
    if (introVoice) { introVoice = false; try { window.__app && window.__app.voice && window.__app.voice.stop(); } catch (e) { /* */ } }
  }
  function setRing(at) { ringAt = at || null; if (!ringAt) ringEl.hidden = true; else placeRing(); }
  function placeRing() {
    const t = ringAt && el.querySelector(ringAt);
    if (!t || !t.getClientRects().length) { ringEl.hidden = true; return; }
    const r = t.getBoundingClientRect(), o = el.getBoundingClientRect();
    ringEl.hidden = false; ringEl.style.cssText = `left:${r.left - o.left - 5}px;top:${r.top - o.top - 5}px;width:${r.width + 10}px;height:${r.height + 10}px`;
  }
  // the big guide speaking over the lab (a stage moment, a badge): his own bubbles wait, so his voice never cuts it off
  const guideBusy = () => { try { return !!(window.__guide && window.__guide.isOpen()); } catch (e) { return false; } };
  function sayLines(lines) {
    stopIntro(); const tok = introTok;
    const step = (i) => {
      if (tok !== introTok || !open_) return;
      if (i >= lines.length) { setRing(null); return; }
      if (guideBusy()) { introT = setTimeout(() => step(i), 1000); return; }
      const ln = lines[i], text = kids ? ln.k : ln.f, ex = ln.expr || 'happy';
      if (panel && panel.talk) panel.talk(text, ex); else say(text, ex, true);
      setRing(ln.at);
      const t0 = Date.now(), need = readMs(text);
      let p = null; try { const v = window.__app && window.__app.voice; if (v && ln.id) { p = v.say(ln.id); introVoice = true; } } catch (e) { p = null; }
      const next = (ok) => { if (tok !== introTok) return; introVoice = false; introT = setTimeout(() => step(i + 1), ok ? 500 : Math.max(400, need - (Date.now() - t0))); };
      Promise.resolve(p).then(next, () => next(false));
    };
    step(0);
  }
  // the first time a child enters a station he says what can be done there (once per player: journey introSeen)
  function maybeIntro(st) {
    const part = partOf(st), lines = LAB_GUIDE[part];
    if (!lines || !lines.length || introSeen(part) || !stOpen(st)) return;   // a veiled station is not presented yet
    // (while the big guide speaks over the lab, a stage moment for instance, he waits for it to finish)
    const begin = () => { if (!open_ || station !== st || walk) return; if (guideBusy()) { introWait = setTimeout(begin, 1000); return; } markIntro(part); sayLines(lines); };
    clearTimeout(introWait); introWait = setTimeout(begin, 650);
  }

  // a list is a few short bubbles (the beginners' texts), shown one after the other
  let sayQT = 0;
  function say(text, expr = 'happy', keep) {
    if (!keep) stopIntro();
    clearTimeout(sayQT); let rest = [];
    if (Array.isArray(text)) { rest = text.slice(1); text = text[0]; }
    text = String(text ?? '');
    // over a panel with its own voice strip (the microscope, the atlas, the questions, the conversation) his words go
    // there, at the panel's foot: they never cover a caption or a card
    const pvs = panels.querySelectorAll('.lb-pv'); const pv = pvs[pvs.length - 1];
    if (pv) {
      sayEl.hidden = true; sayT = 0;
      pv.innerHTML = `${stFace(expr === 'normal' ? 'happy' : expr)}<p><b>${esc(one(COMMON_T.robo, kids))}</b> ${esc(text)}</p>`;
      pv.classList.remove('pop'); void pv.offsetWidth; pv.classList.add('pop');
      robot.say(expr, Math.min(4, 0.8 + text.length * 0.045));
      if (rest.length) sayQT = setTimeout(() => { if (open_) say(rest, expr); }, readMs(text));
      return;
    }
    sayEl.hidden = false; sayEl.querySelector('p').textContent = text; topDock = false;
    sayEl.classList.remove('pop'); void sayEl.offsetWidth; sayEl.classList.add('pop');
    robot.say(expr, Math.min(4, 0.8 + text.length * 0.045)); sayT = 6 + text.length * 0.06;
    if (rest.length) { sayT += 2; sayQT = setTimeout(() => { if (open_) say(rest, expr); }, readMs(text)); }
  }
  // a panel closed by the lab itself (moving to another station) must not move the lab again
  let quiet = false;
  function dropPanel() { if (!panel) return; const p = panel; panel = null; quiet = true; try { p.close(); } finally { quiet = false; } }
  // every "חזרה לחדר" goes to the room's main view; a station activity's own back button goes to its station's menu
  const toRoom = () => { panel = null; if (!quiet && open_ && station !== 'home') go('home'); };
  // (a station still veiled, reached only by a thinking-corner activity, has no menu to return to: back to the room)
  const toStation = () => { panel = null; if (!quiet && open_) { if (stOpen(station)) arrive(); else if (station !== 'home') go('home'); } };
  function go(id, force) {
    if (!STATION_INFO[id]) return;
    if (!force && !stOpen(id)) { sayLocked(partOf(id)); return; }   // a veiled station: he says what opens it
    cancelIntro();
    if (walk && walk.st && id === walk.st) { finishWalk(); return; }   // asked again during the walk: straight in
    dropPanel();
    if (talkEl) { talkEl.remove(); talkEl = null; }   // the conversation does not stay open under the next station
    if (id === station && move <= 0 && !(walk && walk.st)) { arrive(); return; }
    audio && audio.play('select');
    if (room && view === 'room') {
      // in the look-around room: the robot walks to the station, the view turns with him, then the station's picture
      prevSt = station; station = id; navState();
      if (id === 'home') { walk = null; ov.to = 0; robot.lean(0); return; }   // the walk was called off: he stays where he is
      startWalk(id); return;
    }
    if (room && id === 'home') { prevSt = station; station = id; navState(); startBack(prevSt); return; }
    prevSt = station; station = id; move = 1;
    bgU.tA.value = texOf(prevSt); bgU.tB.value = texOf(station); bgU.uMix.value = 0;
    navState();
    placeRobot(true); updateFishVisible();
    if (station === 'aquarium') addFish();
  }
  function navState() {
    el.querySelectorAll('[data-st]').forEach((b) => b.classList.toggle('on', b.dataset.st === station));
    hots.classList.toggle('on', station === 'home');
    el.classList.toggle('at-st', station !== 'home');
  }

  // ── the look-around room: the robot's walk to a station, the station's picture fading in over the room, and back
  let walk = null;                       // { st (null: a short step back), path, t, dur, look }
  const ov = { a: 0, to: 0 };            // the station's picture over the room: 0 = the room only, 1 = the picture only
  let backHello = false;                 // the room's words once the picture has faded out
  const EYE = room ? room.EYE : new THREE.Vector3();
  const walkSpot = (id) => new THREE.Vector3().fromArray(ROOM_SPOT[id] || (cams[id] && cams[id].robot) || HOME_SPOT).setY(0);
  // the view looks at the station, a little toward the robot's spot beside it, so both are in the picture
  function viewToward(id, robotAt) {
    const look = new THREE.Vector3().fromArray(HOT_P[id]); const ys = yawOf(look, EYE);
    const yaw = robotAt ? ys + wrapA(yawOf(robotAt, EYE) - ys) * 0.3 : ys;
    const pitch = Math.atan2(look.y - EYE.y, Math.hypot(look.x - EYE.x, look.z - EYE.z)) - 0.1;
    return { yaw, pitch, look };
  }
  function startWalk(id) {
    const to = walkSpot(id), from = robot.root.position.clone().setY(0);
    const path = room.plan(from, to);
    const v = viewToward(id, to);
    room.S.rate = 3.5;
    walk = { st: id, path, t: 0, dur: THREE.MathUtils.clamp(0.75 + path.len * 0.13, 0.9, 1.6), look: v.look, ys: yawOf(v.look, EYE), pitch: v.pitch, p0: room.S.pitch };
    ov.to = 0; robot.root.visible = true; hush();
  }
  // a click during the walk, or asking for the same station again: straight in
  function finishWalk() {
    if (!walk || !walk.st) return;
    robot.root.position.copy(walk.path.pts[walk.path.pts.length - 1]); enterStation(walk.st);
  }
  function enterStation(id) {
    walk = null; ov.a = 0; ov.to = 0; view = 'pic'; room.quad.visible = false; room.S.fovMul = 1; room.S.rate = 6;
    bgU.tA.value = bgU.tB.value = texOf(id); bgU.uMix.value = 0; bgU.uAlpha.value = 1; bgU.uZoomA.value = 1; bg.visible = true;
    robot.lean(0); placeRobot(false); updateFishVisible(); el.classList.remove('pano');
    if (id === 'aquarium') addFish();
    arrive();
  }
  // back from a station: the room again, facing the station; its picture fades out, the robot turns round and steps
  // back toward the middle of the room when the table lets the child see him there
  function startBack(from) {
    view = 'room'; room.quad.visible = true; el.classList.add('pano');
    const at = walkSpot(from) || robot.root.position.clone();
    const v = viewToward(from, at); room.face(v.yaw, v.pitch, true); room.S.rate = 6;
    robot.root.position.copy(at); robot.root.visible = true; robot.root.rotation.y = Math.atan2(v.look.x - at.x, v.look.z - at.z);
    bgU.tA.value = texOf(from); bgU.uMix.value = 0; ov.a = 1; ov.to = 0; backHello = true;
    const rest = room.restSpot(at, v.yaw);
    walk = rest.distanceTo(at) > 0.15 ? { st: null, path: room.plan(at, rest), t: -0.35, dur: 1.0, look: null } : null;
    updateFishVisible();
  }
  const _ahead = new THREE.Vector3();
  let slowDbg = 1;   // headless tests: a slower walk, for a picture in the middle of it
  function updateRoom(dt) {
    dt *= slowDbg;
    const W = renderer.domElement.clientWidth || innerWidth, H = renderer.domElement.clientHeight || innerHeight;
    // the picture of a station over the room (entering: it fades in while the view closes in a little)
    if (ov.a !== ov.to) ov.a = ov.to > ov.a ? Math.min(ov.to, ov.a + dt / 0.5) : Math.max(ov.to, ov.a - dt / 0.55);
    const e = ov.a * ov.a * (3 - 2 * ov.a);
    room.S.fovMul = 1 - 0.14 * e;
    room.apply(camera, W, H, dt);
    computeCrop(); bg.visible = ov.a > 0.001; bgU.uAlpha.value = e; bgU.uZoomA.value = 1.06 - 0.06 * e; bgU.uMix.value = 0;
    if (backHello && ov.a <= 0) { backHello = false; if (station === 'home' && !panel && !talkEl) arrive(); }
    const rp = robot.root.position;
    if (walk) {
      walk.t += dt;
      const k = Math.max(0, Math.min(1, walk.t / walk.dur)), s = k * k * (3 - 2 * k);
      room.at(walk.path, s * walk.path.len, rp);
      room.at(walk.path, Math.min(walk.path.len, s * walk.path.len + 0.25), _ahead);
      const goal = walk.t < 0 ? null : k < 0.9 && _ahead.distanceToSquared(rp) > 1e-4 ? _ahead : walk.look || EYE;
      if (goal) robot.root.rotation.y += wrapA(Math.atan2(goal.x - rp.x, goal.z - rp.z) - robot.root.rotation.y) * Math.min(1, dt * (k < 0.9 ? 8 : 5));
      robot.lean(walk.t > 0 && k < 0.92 ? 0.13 * Math.sin(Math.PI * k) : 0);
      // the view follows him, leaning toward the station: at the end it looks at the station, with him beside it
      if (walk.st) { const yr = yawOf(rp, EYE); room.face(yr + THREE.MathUtils.clamp(wrapA(walk.ys - yr) * 0.7, -0.6, 0.6), walk.p0 + (walk.pitch - walk.p0) * Math.min(1, k * 1.5)); }
      if (k >= 1) {
        if (walk.st) { if (ov.to !== 1) { bgU.tA.value = texOf(walk.st); ov.to = 1; } if (ov.a >= 1) enterStation(walk.st); }
        else walk = null;
      }
    } else robot.root.rotation.y += wrapA(Math.atan2(EYE.x - rp.x, EYE.z - rp.z) - robot.root.rotation.y) * Math.min(1, dt * 3);   // idle: he faces the child
    // the fish load once the aquarium comes into view
    if (!fish.length && !fishLoading && Math.abs(wrapA(yawOf(AQ_P, EYE) - room.S.yaw)) < 1.3) addFish();
    // the hint about dragging fades once the child has turned (or after a while)
    if (lookEl && !lookEl.hidden && (room.S.turned || (lookT -= dt) < 0)) lookEl.classList.add('gone');
  }
  const AQ_P = new THREE.Vector3().fromArray(HOT_P.aquarium); let lookT = 9;
  // a working panel inside a frame with a voice strip at its foot (say() writes there)
  function framed(open) {
    const fr = document.createElement('div'); fr.className = 'lb-frame' + (kids ? ' kids' : ''); panels.appendChild(fr);
    const inner = document.createElement('div'); inner.className = 'lb-frame-in'; fr.appendChild(inner);
    const pv = document.createElement('div'); pv.className = 'lb-pv'; pv.setAttribute('aria-live', 'polite'); fr.appendChild(pv);
    const p = open(inner, () => fr.remove());
    return { close: () => { fr.remove(); p && p.close && p.close(); } };
  }
  const actCtx = (st) => ({ robot, audio, thumbs, back: one(MENU_T[st].back, labKids()), onClose: toStation });
  function openAct(id) {
    dropPanel(); hush();
    if (ACTS[id]) panel = ACTS[id](panels, actCtx(station));
    else if (THINK_OPEN[id]) openThink(id);
  }
  function stationMenu() {
    const info = STATION_INFO[station]; hush();
    const items = info.menu.map((id) => ({ id, ic: ACT_IC[id], state: ACTS[id] ? (ACT_DONE[id] || (() => ''))(stOf(id)) : thinkDone(id) ? 'done' : Object.keys(thinkOf(id)).length ? 'mid' : '', isNew: !!ACTS[id] && !Object.keys(stOf(id)).length }));
    const vars = station === 'cabinet' ? { n: collectionCount() } : {};
    panel = openStationMenu(panels, { st: station, items, robot, audio, vars, extra: station === 'cabinet' ? shelfPeek(thumbs) : '', onClose: () => { panel = null; }, onPick: (id) => openAct(id) });
  }
  function arrive() {
    const info = STATION_INFO[station];
    const picked = !!(pendingThink || pendingAct);   // straight into an activity: no presentation over it
    if (info.open === 'scope') panel = framed((r, done) => openMicroscope(r, { say, thumbs, audio, start: takeSample(), onDone: () => { robot.wave(); const P = labProgress(); if (SAMPLES.every((x) => P.seen[x.id])) grantBadge('lab:scope'); }, onClose: () => { done(); toRoom(); } }));
    else if (info.open === 'inventors') { robot.wave(); panel = openDoors(); }
    else if (info.open === 'atlas') { markUsed(partOf('atlas')); panel = framed((r, done) => openAtlas(r, { say, thumbs, onClose: () => { done(); toRoom(); }, onQuestions: () => openQuest() })); }
    else if (pendingThink) { const id = pendingThink; pendingThink = null; openThink(id); }
    else if (pendingAct) { const id = pendingAct; pendingAct = null; openAct(id); }
    else if (info.menu && stOpen(station)) stationMenu();
    else if (info.say) say(info.say, 'happy');
    else if (station === 'home' && kids) say(ROOM_K.home, 'happy');
    else if (station === 'home') say('לאן הולכים עכשיו? המיקרוסקופ מחכה לכם, וגם שולחן הממציאים. ובחממה ובאקווריום מחכים ניסויים.', 'happy');
    if (station !== 'home' && !picked) maybeIntro(station);
  }
  // ── the inventors table (1.3.2): two big doors into the hub's "הממציאים": solving a problem with the child's cards,
  // or the robot workshop (its own part of the journey: veiled until it opens)
  const BULB = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 6a18 18 0 0 0-10 33v7h20v-7A18 18 0 0 0 32 6z" fill="#ffd978"/><path d="M26 30q6 7 12 0" stroke="#e0a43a" stroke-width="2.6" fill="none" stroke-linecap="round"/><rect x="24" y="48" width="16" height="5" rx="2.5" fill="#8a6a3a"/><rect x="27" y="55" width="10" height="4" rx="2" fill="#8a6a3a"/></svg>';
  const ROBO = '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="7" r="4" fill="#ffd978"/><rect x="30" y="9" width="4" height="9" rx="2" fill="#5a6a74"/><rect x="13" y="18" width="38" height="26" rx="11" fill="#f3f1ea"/><rect x="18" y="23" width="28" height="15" rx="7" fill="#0a1016"/><circle cx="26" cy="30.5" r="3" fill="#8ff2ff"/><circle cx="38" cy="30.5" r="3" fill="#8ff2ff"/><rect x="17" y="46" width="30" height="14" rx="6" fill="#2c9a92"/></svg>';
  function openDoors() {
    const O = (v) => one(v, kids), robOpen = partOpen('robots'), rl = robOpen ? null : lockInfo('robots');
    const d = document.createElement('div'); d.className = 'lb-panel lb-doors' + (kids ? ' kids' : ''); panels.appendChild(d);
    d.innerHTML = `<header><h2>${esc(O(DOORS_T.title))}</h2><p>${esc(O(DOORS_T.sub))}</p></header>
      <div class="lb-drow"><button class="lb-door d-inv" data-door="inv"><span class="lb-dpic">${BULB}</span><b>${esc(O(DOORS_T.inv))}</b><small>${esc(O(DOORS_T.invLine))}</small></button>
        <button class="lb-door d-robot${robOpen ? '' : ' veil'}" data-door="robot"><span class="lb-dpic">${ROBO}</span><b>${esc(O(DOORS_T.robot))}</b><small>${esc(rl ? rl.text : O(DOORS_T.robotLine))}</small></button></div>
      <div class="lb-pv" aria-live="polite"></div>`;
    d.querySelectorAll('[data-door]').forEach((b) => b.onclick = () => {
      const rob = b.dataset.door === 'robot';
      if (rob && !partOpen('robots')) { sayLocked('robots'); return; }
      try { audio && audio.play('select'); } catch (e) { /* */ }
      cancelIntro(); markUsed(partOf('table')); robot.wave();
      if (openGame) openGame('inventors', rob ? { view: 'robots' } : {});
      else if (!rob) { dropPanel(); panel = framed((r, done) => openInventors(r, { say, thumbs, audio, onInvented: () => robot.wave(), onClose: () => { done(); toRoom(); }, goScope: () => setTimeout(() => go('scope'), 900) })); }
    });
    say(one(DOORS_T.hello, kids), 'happy');
    return { close: () => d.remove(), el: d };
  }
  let pendingAct = null;
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
    computeCrop();
    const FW = 1600, FH = FW / IMG_ASPECT;
    camera.fov = c.fov; camera.aspect = IMG_ASPECT; camera.near = 0.05; camera.far = 200;
    camera.setViewOffset(FW, FH, crop.x * FW, crop.y * FH, crop.w * FW, crop.h * FH);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  }
  function computeCrop() {
    const W = renderer.domElement.clientWidth || innerWidth, H = renderer.domElement.clientHeight || innerHeight; const A = W / H;
    if (A > IMG_ASPECT) { crop.w = 1; crop.h = IMG_ASPECT / A; } else { crop.h = 1; crop.w = A / IMG_ASPECT; }
    crop.x = (1 - crop.w) / 2; crop.y = (1 - crop.h) / 2;
    bgU.uCrop.value.set(crop.x, 1 - crop.y - crop.h, crop.w, crop.h);
  }
  const _v = new THREE.Vector3(), _up = new THREE.Vector3(0.6, 1.4, 0);
  function project(p) { _v.copy(p).project(camera); return { x: (_v.x * 0.5 + 0.5) * 100, y: (-_v.y * 0.5 + 0.5) * 100, ok: _v.z < 1 }; }
  // every orange spot sits on its furniture in the room picture, at any screen shape (the camera already carries the
  // cover crop); a station outside the picture gets a spot on that edge of the screen, with an arrow
  const _cs = new THREE.Vector3();
  function placeHots() {
    for (const b of hots.children) {
      const h = HOT[b.dataset.hot]; if (!h) { b.hidden = true; continue; }
      _v.fromArray(h.p); _cs.copy(_v).applyMatrix4(camera.matrixWorldInverse);
      const p = project(_v); const inFront = _cs.z < 0 && p.ok;
      let x = p.x, y = p.y, edge = '';
      if (!inFront || x < 4 || x > 96 || y < 12 || y > 86) { edge = _cs.x < 0 ? 'l' : 'r'; x = edge === 'l' ? 2.5 : 97.5; y = inFront ? p.y : (h.ey || 50); }
      y = Math.max(16, Math.min(80, edge && h.ey ? h.ey : y));
      b.hidden = false; b.style.left = x + '%'; b.style.top = y + '%';
      setEdge(b, edge);
    }
  }
  function setEdge(b, edge) { if (b.dataset.edge !== edge) { b.dataset.edge = edge; b.classList.toggle('edge-l', edge === 'l'); b.classList.toggle('edge-r', edge === 'r'); b.querySelector('.lb-arrow').hidden = !edge; } }
  // in the look-around room: a spot on every station in sight; the others wait at the side they are nearer to (the
  // shorter turn), above and below the turning arrow, nearest first. A click on one turns there and walks there.
  const EDGE_Y = [31, 69, 23, 77];
  function placeHotsRoom() {
    const side = { l: [], r: [] };
    for (const b of hots.children) {
      const h = HOT_P[b.dataset.hot]; if (!h) { b.hidden = true; continue; }
      _v.fromArray(h); _cs.copy(_v).applyMatrix4(camera.matrixWorldInverse);
      const p = project(_v);
      b.hidden = false;
      if (_cs.z < -0.2 && p.x > 9 && p.x < 91 && p.y > 6 && p.y < 94) { b.style.left = p.x + '%'; b.style.top = Math.max(17, Math.min(81, p.y)) + '%'; setEdge(b, ''); continue; }
      const d = wrapA(yawOf(_v.fromArray(h), EYE) - room.S.yaw); side[d < 0 ? 'l' : 'r'].push([Math.abs(d), b]);
    }
    for (const s of ['l', 'r']) side[s].sort((a, c) => a[0] - c[0]).forEach(([, b], i) => { b.style.left = (s === 'l' ? 2.8 : 97.2) + '%'; b.style.top = EDGE_Y[Math.min(i, 3)] + '%'; setEdge(b, s); });
  }
  function update(dt) {
    if (!open_) return;
    el.classList.toggle('busy', !!panel || !!talkEl);
    if (view === 'room') {
      updateRoom(dt);
      if (view === 'room') robot.root.visible = bgU.uAlpha.value < 0.55 || !bg.visible;   // (entering a station just switched to its picture)
      fill.position.copy(camera.position).add(_up); fill.target = robot.root;
      robot.update(dt, walk && walk.look && walk.t > 0 ? walk.look : camera.position);
      updateFish(dt);
      if (station === 'home') placeHotsRoom();
      placeSay(dt); if (ringAt) placeRing();
      return;
    }
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
    updateFish(dt);
    // hotspots (home) and the speech bubble above the robot's head
    if (station === 'home' && move === 0) placeHots();
    placeSay(dt); if (ringAt) placeRing();
  }
  function updateFish(dt) {
    for (const f of fish) {
      if (!f.holder.visible) continue;
      f.t += dt; _q.subVectors(f.tgt, f.p); const d = _q.length();
      if (d < 0.05) pickTarget(f);
      _q.normalize(); f.p.addScaledVector(_q, Math.min(d, f.speed * dt));
      f.holder.position.copy(f.p); const yaw = Math.atan2(_q.x, _q.z);
      f.holder.rotation.y += Math.atan2(Math.sin(yaw - f.holder.rotation.y), Math.cos(yaw - f.holder.rotation.y)) * Math.min(1, dt * 3);
      f.v.update(dt, { action: 'fly', speed: f.speed * 4, t: f.t });
    }
  }
  function placeSay(dt) {
    if (sayT > 0) {
      sayT -= dt; if (sayT <= 0) sayEl.hidden = true;
      // over a panel the robot is hidden: his words sit in a corner, with his face
      const hp = robot.root.position.clone(); hp.y = 1.22; const p = project(hp);
      let dock = !!panel || !p.ok || p.x < 12 || p.x > 88 || p.y < 14 || !robot.root.visible;
      // a bubble over his head must not cover the top bar (the way back, "?"): then it goes to the corner as well
      // (once docked for this reason it stays docked while these words show: the docked bubble is shorter, it must not flap)
      if (!dock && !topDock) { const H = el.clientHeight || innerHeight, top = (Math.max(16, p.y - 2) / 100) * H - sayEl.offsetHeight; if (top < topEl.offsetTop + topEl.offsetHeight + 4) topDock = true; }
      if (topDock) dock = true;
      sayEl.classList.toggle('dock', dock); sayEl.classList.toggle('lift', dock && !panel);
      if (!dock) { const hw = (sayEl.offsetWidth / (el.clientWidth || innerWidth)) * 50 + 1; sayEl.style.left = (hw < 49 ? Math.max(hw, Math.min(100 - hw, p.x)) : p.x) + '%'; sayEl.style.top = Math.max(16, p.y - 2) + '%'; }
      else { sayEl.style.left = ''; sayEl.style.top = ''; }
    }
  }
  function open() {
    if (open_) return; open_ = true; el.classList.add('on'); paintChrome();
    prevState.tone = renderer.toneMapping; prevState.env = scene.environment; prevState.bg = scene.background; prevState.fog = scene.fog;
    renderer.toneMapping = THREE.NoToneMapping; scene.environment = envTex; scene.background = null; scene.fog = null;
    if (pipe.setBloom) pipe.setBloom(0.12);
    scene.add(group);
    station = 'home'; move = 0; bgU.tA.value = texOf('home'); bgU.uMix.value = 0; bgU.uZoomA.value = 1;
    paintLocks();
    hots.classList.add('on'); el.classList.remove('at-st'); el.querySelectorAll('[data-st]').forEach((b) => b.classList.toggle('on', b.dataset.st === 'home'));
    if (room) {
      // the look-around room: the robot beside the table, the view a little to the left (the robot, the books, the
      // atlas and the aquarium's corner); the dragging hint until the child has turned once
      view = 'room'; walk = null; ov.a = ov.to = 0; backHello = false; room.load(); room.quad.visible = true; bg.visible = false; el.classList.add('pano');
      room.face(VIEW0.yaw * Math.PI / 180, VIEW0.pitch * Math.PI / 180, true); room.S.fovMul = 1; room.S.rate = 6;
      robot.root.position.fromArray(HOME_SPOT); robot.root.rotation.y = Math.atan2(EYE.x - HOME_SPOT[0], EYE.z - HOME_SPOT[2]); robot.lean(0);
      lookT = 9; lookEl.classList.remove('gone'); lookEl.hidden = room.S.turned;
    } else placeRobot(false);
    robot.root.visible = true; updateFishVisible();
    // warm up the other pictures in the background
    setTimeout(() => ORDER.forEach(texOf), 300);
    try { window.__flourish && window.__flourish.labDoors(); } catch (e) { }   // 1.3.2: the doors part as the child comes in (src/ui/flourish.js)
    if (!greeted) { greeted = true; setTimeout(() => { robot.wave(); say(kids ? ROOM_K.hello : 'שלום! אני רובו־דע. כאן במעבדה מגלים איך הטבע עובד, וממציאים בעזרתו. במה נתחיל?', 'happy'); }, 600); }
    else { setTimeout(() => robot.wave(), 700); say(kids ? ROOM_K.back : 'ברוכים השבים למעבדה!', 'happy'); }
  }
  function close() {
    if (!open_) return; open_ = false; el.classList.remove('on'); clearTimeout(sayQT); cancelIntro();
    dropPanel(); if (talkEl) { talkEl.remove(); talkEl = null; }
    scene.remove(group); camera.clearViewOffset();
    // the pictures leave the GPU (they stay decoded and go up again on the next visit)
    if (room) { room.dispose(); walk = null; room.S.drag = null; room.S.hold = 0; }
    for (const k in tex) tex[k].dispose();
    // 1.3.1: nothing of the lab stays on the graphics card while it is closed (the robot, the fish, the furniture depth and
    // their materials and pictures go up again by themselves on the next visit; the objects stay ready in memory)
    group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.isSkinnedMesh && o.skeleton) o.skeleton.dispose();   // the fish's bone textures (made again when drawn)
      for (const m of [].concat(o.material || [])) { for (const k in m) { const v = m[k]; if (v && v.isTexture && v !== envTex) v.dispose(); } m.dispose(); }
    });
    renderer.toneMapping = prevState.tone; scene.environment = prevState.env || null; scene.background = prevState.bg || null; scene.fog = prevState.fog || null;
    if (pipe.setBloom) pipe.setBloom(0.38);
    pipe.resize();
  }
  // ── talking with רובו־דע: questions the child picks; his answers depend on what was already done
  const TALK = {
    who: { q: 'מי אתה?', a: () => 'אני רובו־דע, הרובוט של המעבדה. אני עוזר לחוקרים צעירים: מראה איפה לחפש, שואל שאלות, ולפעמים גם מתבלבל. אבל אני אף פעם לא מגלה את התשובה. אותה אתם מוצאים!', e: 'happy' },
    what: { q: 'מה עושים כאן?', a: () => 'במיקרוסקופ מגדילים דגימות ומחפשים סודות קטנים. בשולחן הממציאים פותרים בעיות בעזרת היצורים, ובונים רובוטים. באטלס נרשם כל מה שגיליתם. ובאקווריום, בחממה ובארון האוסף יש ניסויים קטנים: חושבים כמו חוקרים!', e: 'curious' },
    next: { q: 'מה כדאי לי לעשות עכשיו?', a: () => {
      const P = labProgress(); const s = SAMPLES.find((x) => !P.seen[x.id]);
      const t = THINK.find((a) => !thinkDone(a.id));
      if (t && (nextN++ % 2 || !s)) return `אולי ננסה את "${t.name}" ${t.where}? שם לומדים ש${t.habit}.`;
      if (s) return `אולי נסתכל במיקרוסקופ על ${s.name}? יש שם משהו שעוד לא מצאתם.`;
      if (!P.inventions.sharkskin) return 'כל הדגימות נבדקו! עכשיו לשולחן הממציאים: אולי תצליחו להמציא בגד שחייה מהיר?';
      return 'גיליתם כל כך הרבה! נסו לבנות בשולחן הממציאים רובוט משונה ומצחיק, או צאו למשלחת לעומק במרכז הלמידה.';
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
    'תפוז עם קליפה צף במים, ותפוז קלוף שוקע. הקליפה מלאה כיסי אוויר קטנים.',
  ];
  const JOKES = [
    'למה פחדתי להיכנס לאקווריום? חשבתי שאחליד. מאז שקיבלתי ציפוי עור כריש, אני כבר לא מפחד!',
    'ניסיתי ללמוד מהעצלן איך לנוח. אבל עד שהתחלתי, כבר נגמר היום.',
    'שאלתי את הזיקית מה הצבע האהוב עליה. היא אמרה: "תלוי איפה אני עומדת".',
    'בניתי רובוט עם קוצים של קיפוד. עכשיו אף אחד לא רוצה לחבק אותו.',
    'התמנון ניצח אותי בציור. יש לו שמונה מכחולים!',
    'שקלתי את עצמי שלוש פעמים ולקחתי את האמצעית. עדיין כבד. כנראה המשקל צודק.',
  ];
  // the beginners' answers: the same questions, fully vocalised and in short bubbles (src/lab/kids-text.js)
  const KA = {
    who: () => TALK_K.who, what: () => TALK_K.what,
    next: () => {
      const P = labProgress(); const s = SAMPLES.find((x) => !P.seen[x.id]);
      const t = THINK.find((a) => !thinkDone(a.id));
      if (t && (nextN++ % 2 || !s)) return fmt(TALK_K.nextThink, THINK_K.items[t.id]);
      if (s) return fmt(TALK_K.nextScope, { name: (SAMPLES_K[s.id] || s).name });
      if (!P.inventions.sharkskin) return TALK_K.nextInvent;
      return TALK_K.nextAll;
    },
    fact: () => FACTS_K[(talkN++) % FACTS_K.length], joke: () => JOKES_K[(jokeN++) % JOKES_K.length],
    feel: () => { const n = Object.keys(labProgress().seen).length; return n >= 6 ? fmt(TALK_K.feelMany, { n }) : n === 1 ? TALK_K.feelOne : n ? fmt(TALK_K.feelSome, { n }) : TALK_K.feelNone; },
  };
  let talkN = 0, jokeN = 0, nextN = 0, talkEl = null;
  function openTalk() {
    if (talkEl) { talkEl.remove(); talkEl = null; return; }
    dropPanel();
    kids = labKids();
    talkEl = document.createElement('div'); talkEl.className = 'lb-panel lb-chat' + (kids ? ' kids' : '');
    talkEl.innerHTML = `<header><h2>${kids ? TALK_K.head : 'מדברים עם רובו־דע'}</h2><button class="lb-btn lb-back">${kids ? TALK_K.close : 'סגירה'}</button></header>
      <p class="lb-chat-sub">${kids ? TALK_K.sub : 'בחרו שאלה, ורובו־דע יענה.'}</p>
      <div class="lb-qs">${Object.entries(TALK).map(([k, t]) => `<button data-q="${k}">${esc(kids ? TALK_K.q[k] : t.q)}</button>`).join('')}</div><div class="lb-pv lb-chat-pv" aria-live="polite"></div>`;
    panels.appendChild(talkEl);
    talkEl.querySelector('.lb-back').onclick = () => { talkEl.remove(); talkEl = null; };
    talkEl.querySelectorAll('[data-q]').forEach((b) => b.onclick = () => { const k = b.dataset.q, t = TALK[k]; audio && audio.play('click'); robot.wave(); say(kids ? KA[k]() : t.a(), t.e); });
    say(kids ? TALK_K.open : 'שאלו אותי מה שתרצו. כלומר... מה שכתוב על הכפתורים.', 'happy');
  }

  // שאלות חקר (src/lab/questions.js): opened from the atlas; a question can send the child to the microscope or the inventors game
  let pendingSample = null;
  const takeSample = () => { const s = pendingSample; pendingSample = null; return s; };
  function openQuest(start) {
    dropPanel();
    panel = framed((r, done) => openQuestions(r, { say, thumbs, audio, start, onClose: () => { done(); panel = null; }, onBack: () => arrive(),
      goScope: (id) => { pendingSample = id; if (station === 'scope') { dropPanel(); arrive(); } else go('scope'); },
      goInvent: (pid) => { if (openGame) openGame('inventors', { problem: pid }); } }));
  }

  // ── חושבים כמו חוקרים (src/lab/thinking.js): a panel per activity; the menu lists all five
  let pendingThink = null;
  function hush() { sayEl.hidden = true; sayT = 0; cancelIntro(); }
  function openThink(id) {
    if (talkEl) { talkEl.remove(); talkEl = null; }
    dropPanel();
    const f = THINK_OPEN[id]; if (!f) return; hush();
    // at a station with its own menu the activity's back button returns to that menu; in the room it is the room
    // (a station that is still veiled: no menu behind the activity, its back button goes to the room)
    const menu = !!STATION_INFO[station].menu && stOpen(station), veiled = !stOpen(station);
    panel = f(panels, { robot, audio, thumbs, back: menu ? one(MENU_T[station].back, labKids()) : null, onClose: menu || veiled ? toStation : () => { panel = null; } });
  }
  function thinkMenu() {
    if (talkEl) { talkEl.remove(); talkEl = null; }
    dropPanel();
    hush();
    // its back button: the station's own menu, or the room (a pick opens something else at once: nothing to do then)
    const back = () => { panel = null; if (quiet) return; setTimeout(() => { if (!panel && move <= 0 && open_ && station !== 'home') { if (STATION_INFO[station].menu && stOpen(station)) arrive(); else go('home'); } }, 0); };
    // (the thinking corner follows the lab itself: its activities open even at a station that is still veiled)
    panel = openThinkMenu(panels, { robot, audio, onClose: back, onPick: (id) => { const a = thinkById(id); pendingThink = id; if (a.st === station && move <= 0) { pendingThink = null; openThink(id); } else go(a.st, true); } });
  }

  window.__labDebug = { go, say, openTalk, sayLines, locks: () => ORDER.filter((id) => id !== 'home').map((id) => ({ id, open: stOpen(id) })), get ring() { return ringAt; }, doors: () => panel && panel.el && panel.el.classList.contains('lb-doors'), openQuestions: (id) => openQuest(id), think: (id) => (id ? (pendingThink = id, go(thinkById(id).st, true)) : thinkMenu()), get panel() { return panel; }, get station() { return station; }, robot, openPanel: (k) => { station = k; arrive(); },
    act: (id) => { const st = Object.keys(STATION_INFO).find((k) => (STATION_INFO[k].menu || []).includes(id)); if (st === station && move <= 0) openAct(id); else { pendingAct = id; go(st, true); } },
    hots: () => [...hots.querySelectorAll('.lb-hot')].map((b) => ({ id: b.dataset.hot, x: b.style.left, y: b.style.top, edge: b.dataset.edge || '', hidden: b.hidden })),
    // the look-around room: where the view looks (degrees), turn it, and the robot's walk
    room: room && { face: (yaw, pitch = VIEW0.pitch, now = true) => room.face(yaw * Math.PI / 180, pitch * Math.PI / 180, now), get yaw() { return Math.round(wrapA(room.S.yaw) * 180 / Math.PI); },
      get pitch() { return Math.round(room.S.pitch * 180 / Math.PI); }, get view() { return view; }, get walking() { return walk ? (walk.st || 'back') : ''; }, get loaded() { return room.loaded; },
      robot: () => robot.root.position.toArray().map((x) => +x.toFixed(2)), slow: (k) => { slowDbg = k; } } };
  return { open, close, update, isOpen: () => open_ };
}

// ───────────────────────────────────────── the atlas: every creature studied, with its stamps
function openAtlas(root, { say, thumbs, onClose, onQuestions }) {
  const kids = labKids(), A = ATLAS_K;
  const el = document.createElement('div'); el.className = 'lb-panel lb-atlas' + (kids ? ' kids' : ''); root.appendChild(el);
  const P = labProgress();
  const rows = SAMPLES.map((s) => {
    const zoom = !!P.seen[s.id], idea = !!P.inventions[s.species] || (s.id === 'sharkskin' && !!P.inventions.sharkskin);
    const K = kids ? (SAMPLES_K[s.id] || s) : s;
    return `<article class="lb-a-card ${zoom ? '' : 'dim'}">${thumbs[s.species] ? `<img src="${thumbs[s.species]}" alt="">` : ''}
      <div><b>${esc(K.name)}</b><div class="lb-stamps"><span class="${zoom ? 'on z' : ''}">${kids ? A.zoom : 'הוגדל'}</span><span class="${idea ? 'on i' : ''}">${kids ? A.idea : 'השראה'}</span></div>
      <p>${zoom ? esc(K.found) : kids ? A.notYet : 'עוד לא הסתכלנו במיקרוסקופ.'}</p></div></article>`;
  }).join('');
  el.innerHTML = `<header><h2>${kids ? A.title : 'האטלס'}</h2><p>${kids ? A.sub : 'כל יצור שחקרתם מקבל דף. כל חותמת פותחת עוד חלק מהסיפור שלו.'}</p>${onQuestions ? `<button class="lb-btn lb-qbtn">${kids ? A.questions : 'שאלות חקר'} · ${answeredCount(undefined, kids)}${islandQuestions(kids) ? markHTML('island') : ''}</button>` : ''}<button class="lb-btn lb-back">${kids ? A.back : 'חזרה לחדר'}</button></header><div class="lb-a-grid">${rows}</div>`;
  el.querySelector('.lb-back').onclick = () => { el.remove(); onClose && onClose(); };
  const qb = el.querySelector('.lb-qbtn'); if (qb) qb.onclick = () => onQuestions();
  say(kids ? A.say : 'באטלס נרשום את כל היצורים שחקרתם. חותמת "הוגדל" מקבלים במיקרוסקופ, וחותמת "השראה" בשולחן הממציאים.', 'happy');
  return { close: () => { el.remove(); onClose && onClose(); } };
}
