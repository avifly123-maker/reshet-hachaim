// OLD vs NEW crowns. Left half: oak (old | new). Right half: kapok (old | new). Same camera per pair, daylight.
// Build: node build.mjs tests/hq-trees-compare.js scratch/hq.html --dev
import * as THREE from 'three';
import { makeRig } from './rig.js';
import { PLANTS as GROVE } from '../src/models/grove-plants.js';
import { PLANTS as AMAZON } from '../src/models/amazon-plants.js';
import { HQ_PLANTS } from '../src/models/hq-trees-all.js';

const rig = makeRig({ ground: '#6b7a44', camPos: [0, 5.5, 27], target: [0, 4.6, 0], size: 40 });
const { renderer } = rig;

// second scene for the 36 m kapoks (bigger shadow frustum)
const kScene = new THREE.Scene(); kScene.background = rig.scene.background.clone();
kScene.fog = new THREE.Fog(kScene.background, 150, 300);
const kHemi = rig.hemi.clone(); const kSun = rig.sun.clone(); kSun.position.set(40, 60, 25);
kSun.shadow = rig.sun.shadow.clone(); kSun.shadow.mapSize.set(2048, 2048);
const sc = kSun.shadow.camera; sc.left = sc.bottom = -50; sc.right = sc.top = 50; sc.near = 1; sc.far = 200;
kScene.add(kHemi, kSun);
const kg = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshStandardMaterial({ color: '#4d5e30', roughness: 1 }));
kg.rotation.x = -Math.PI / 2; kg.receiveShadow = true; kScene.add(kg);
const kCam = new THREE.PerspectiveCamera(45, 1, 0.5, 600); kCam.position.set(0, 22, 74); kCam.lookAt(0, 24, 0);

const all = [];
function put(scene, v, x, label) { v.object.position.x = x; scene.add(v.object); v.setGrowth(1); v.setHealth(1); v.setSeason('summer', 0.5); all.push(v); }
put(rig.scene, GROVE.oak({ seed: 1 }), -5.5);
put(rig.scene, HQ_PLANTS.oak({ seed: 1 }), 5.5);
put(kScene, AMAZON.kapok({ seed: 1 }), -13);
put(kScene, HQ_PLANTS.kapok({ seed: 1 }), 13);

// labels
const lab = document.createElement('div');
lab.style.cssText = 'position:fixed;inset:0;pointer-events:none;font:bold 22px sans-serif;color:#fff;text-shadow:0 1px 3px #000';
lab.innerHTML = ['OAK old', 'OAK new', 'KAPOK old', 'KAPOK new'].map((t, i) => `<div style="position:absolute;top:14px;left:${12.5 + i * 25}%;transform:translateX(-50%)">${t}</div>`).join('');
document.body.appendChild(lab);

let tris = {};
for (const v of all) { let n = 0; v.object.traverse(o => { if (o.isMesh && o.visible !== false && !o.name.endsWith('-seed')) n += o.geometry.attributes.position.count / 3; }); tris[v.object.name + (all.indexOf(v) % 2 ? '-new' : '-old')] = n; }
console.log('tris', JSON.stringify(tris));
window.__tris = tris;

const clock = new THREE.Clock(); let t = 0;
renderer.setScissorTest(true);
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05); t += dt;
  for (const v of all) v.update(dt, t, 0.3);
  const W = innerWidth, H = innerHeight;
  rig.camera.aspect = (W / 2) / H; rig.camera.updateProjectionMatrix();
  renderer.setViewport(0, 0, W / 2, H); renderer.setScissor(0, 0, W / 2, H); renderer.render(rig.scene, rig.camera);
  kCam.aspect = (W / 2) / H; kCam.updateProjectionMatrix();
  renderer.setViewport(W / 2, 0, W / 2, H); renderer.setScissor(W / 2, 0, W / 2, H); renderer.render(kScene, kCam);
  requestAnimationFrame(frame);
}
frame();
