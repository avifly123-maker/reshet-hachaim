// a page that shows ניצוץ alone (1.4.4 set 2): node tools/nitzotz-view.mjs, then play.py or a browser on shots/nitzotz-view.html
// window.__nz.set(x) / pose(seconds)
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createNitzotz } from '../../src/workshop/nitzotz.js';
const W = innerWidth, H = innerHeight;
const Q = new URLSearchParams(location.search), PORTRAIT = Q.has('portrait');
const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); r.setSize(W, H); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
document.body.style.margin = 0; document.body.appendChild(r.domElement);
const scene = new THREE.Scene(); if (!PORTRAIT) scene.background = new THREE.Color(Q.get('bg') || '#dfe6ee');
const pm = new THREE.PMREMGenerator(r); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.5;
scene.add(new THREE.HemisphereLight('#ffffff', '#8a9aa8', 1.0)); const sun = new THREE.DirectionalLight('#fff4e0', 2.2); sun.position.set(-2, 3, 3); scene.add(sun);
const cam = new THREE.PerspectiveCamera(30, W / H, 0.05, 20);
if (PORTRAIT) { cam.position.set(0, 0.52, 2.5); cam.lookAt(0, 0.47, 0); } else { cam.position.set(0.25, 0.55, 2.6); cam.lookAt(0, 0.5, 0); }
const N = createNitzotz({ sparks: !PORTRAIT }); scene.add(N.object);
if (PORTRAIT) { N.face.visible = false; N.calm(true); }
let last = performance.now(), still = false;
function frame(now) { requestAnimationFrame(frame); if (still) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; N.update(dt); r.render(scene, cam); }
requestAnimationFrame(frame);
window.__nz = { set: (x) => N.set(x), talk: (o) => N.talk(o), look: (x, y) => N.look(x, y), state: () => ({ mood: N.mood, act: N.action, light: N.light }), pose: (sec) => { for (let i = 0; i < sec * 30; i++) N.update(1 / 30); r.render(scene, cam); }, still: (on) => { still = on; },
  // where the face is on the screen (normalised x, y, w, h), from its plane's four corners
  faceRect: () => { const f = N.face; f.updateWorldMatrix(true, false); const g = f.geometry; g.computeBoundingBox(); const b = g.boundingBox, pts = [];
    for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) { const v = new THREE.Vector3(x, y, 0).applyMatrix4(f.matrixWorld).project(cam); pts.push([(v.x + 1) / 2, (1 - v.y) / 2]); }
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }; } };
