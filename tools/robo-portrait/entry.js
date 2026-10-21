// Renders portraits of רובו־דע from his real model (src/data/lab-robot.js, the same one the lab draws) for the guide
// overlay (src/ui/robo-guide.js). Run by tools/robo-portrait/render.py; frames come out as transparent PNGs.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { LAB_ROBOT } from '../../src/data/lab-robot.js';
import { drawRoboFace } from '../../src/ui/robo-face.js';

const W = 480, H = 576;
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.75;
const key = new THREE.DirectionalLight('#fff4e6', 2.4); key.position.set(1.6, 2.4, 2.2); scene.add(key);
const rim = new THREE.DirectionalLight('#9fe8ff', 1.6); rim.position.set(-2, 1.2, -1.5); scene.add(rim);
scene.add(new THREE.HemisphereLight('#eaf6ff', '#3a4a3a', 0.6));
const cam = new THREE.PerspectiveCamera(24, W / H, 0.05, 20);

const fc = document.createElement('canvas'); fc.width = 512; fc.height = 256;
const faceTex = new THREE.CanvasTexture(fc); faceTex.colorSpace = THREE.SRGBColorSpace;
const cv = document.createElement('canvas'); cv.width = cv.height = 128; const cx = cv.getContext('2d');
cx.fillStyle = '#000'; cx.fillRect(0, 0, 128, 128); cx.translate(64, 64); cx.rotate(-0.6); cx.shadowColor = 'rgba(110,255,140,.9)'; cx.shadowBlur = 14;
cx.fillStyle = '#6dff8a'; cx.beginPath(); cx.moveTo(0, -42); cx.quadraticCurveTo(30, -10, 0, 42); cx.quadraticCurveTo(-30, -10, 0, -42); cx.fill();
const badgeTex = new THREE.CanvasTexture(cv); badgeTex.colorSpace = THREE.SRGBColorSpace;
const M = {
  shell: new THREE.MeshPhysicalMaterial({ color: '#f3f1ea', roughness: 0.24, clearcoat: 0.7, clearcoatRoughness: 0.12 }),
  teal: new THREE.MeshPhysicalMaterial({ color: '#2c9a92', roughness: 0.32, clearcoat: 0.4 }),
  tealdark: new THREE.MeshPhysicalMaterial({ color: '#1d5e66', roughness: 0.38, clearcoat: 0.3 }),
  visor: new THREE.MeshPhysicalMaterial({ color: '#0a1016', roughness: 0.06, clearcoat: 1, emissive: '#ffffff', emissiveMap: faceTex, emissiveIntensity: 1.6, side: THREE.DoubleSide }),
  seam: new THREE.MeshStandardMaterial({ color: '#3b434c', roughness: 0.5 }),
  metal: new THREE.MeshStandardMaterial({ color: '#c4cad2', roughness: 0.28, metalness: 1 }),
  leaf: new THREE.MeshPhysicalMaterial({ color: '#5aa845', roughness: 0.42, clearcoat: 0.3, side: THREE.DoubleSide }),
  glow: new THREE.MeshBasicMaterial({ color: '#9ff6ff', toneMapped: false }),
  badge: new THREE.MeshPhysicalMaterial({ color: '#0c1a1c', roughness: 0.08, clearcoat: 1, emissive: '#ffffff', emissiveMap: badgeTex, emissiveIntensity: 1.2, side: THREE.DoubleSide }),
};
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
const root = new THREE.Group(); scene.add(root);
const piv = LAB_ROBOT.pivots; const groups = { body: root, hover: root };
for (const k of ['head', 'arm_a', 'arm_b']) { const g = new THREE.Group(); g.position.fromArray(piv[k]); root.add(g); groups[k] = g; }
for (const e of LAB_ROBOT.parts) {
  if (e.m === 'proxy' || e.g === 'proxy') continue;
  const m = new THREE.Mesh(decodePart(e), M[e.m] || M.shell);
  const g = groups[e.g] || root; if (g !== root) m.position.set(-piv[e.g][0], -piv[e.g][1], -piv[e.g][2]);
  g.add(m);
}
const box = new THREE.Box3().setFromObject(root); const c = box.getCenter(new THREE.Vector3()); const sz = box.getSize(new THREE.Vector3());
window.__box = { min: box.min.toArray(), max: box.max.toArray() };
// pose: { yaw, wave (0..1), headTilt, headTurn }, face: { expr, blink, talk }
window.renderFrame = (pose = {}, face = {}) => {
  drawRoboFace(fc.getContext('2d'), face.expr || 'happy', face.blink || 0, face.talk || 0); faceTex.needsUpdate = true;
  root.rotation.y = pose.yaw ?? -0.42;
  groups.head.rotation.set(pose.headNod || 0, pose.headTurn ?? 0.18, pose.headTilt || 0);
  groups.arm_a.rotation.z = -0.08; groups.arm_b.rotation.z = 0.08;
  if (pose.wave) groups.arm_b.rotation.z = 1.9 + (pose.wave - 0.5) * 0.5;
  if (pose.point) { groups.arm_a.rotation.z = -1.25; groups.arm_a.rotation.x = -0.35; }
  const d = Math.max(sz.y, sz.x) * 3.15;
  cam.position.set(c.x + d * 0.08, c.y + sz.y * 0.16, c.z + d); cam.lookAt(c.x, c.y + sz.y * 0.02, c.z);
  renderer.render(scene, cam);
  return renderer.domElement.toDataURL('image/png');
};
window.__ready = true;
