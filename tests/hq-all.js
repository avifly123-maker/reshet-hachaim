// All HQ trees in a row. Top: grove (oak, terebinth summer/autumn/winter, carob, pine, mastic, buckthorn).
// Bottom: amazon (kapok, brazilnut, fig, cecropia). Daylight.
// Build: node build.mjs tests/hq-all.js scratch/hq-all.html --dev
import * as THREE from 'three';
import { makeRig } from './rig.js';
import { HQ_PLANTS } from '../src/models/hq-trees-all.js';

const rig = makeRig({ ground: '#6b7a44', camPos: [0, 6.5, 27], target: [0, 6.5, 0], size: 90 });
const { renderer } = rig; window.__rig = rig;

const aScene = new THREE.Scene(); aScene.background = rig.scene.background.clone();
aScene.fog = new THREE.Fog(aScene.background, 200, 400);
const aSun = rig.sun.clone(); aSun.position.set(40, 60, 25); aSun.shadow = rig.sun.shadow.clone();
const sc = aSun.shadow.camera; sc.left = sc.bottom = -70; sc.right = sc.top = 70; sc.near = 1; sc.far = 220;
aScene.add(rig.hemi.clone(), aSun);
const ag = new THREE.Mesh(new THREE.CircleGeometry(90, 64), new THREE.MeshStandardMaterial({ color: '#4d5e30', roughness: 1 }));
ag.rotation.x = -Math.PI / 2; ag.receiveShadow = true; aScene.add(ag);
const aCam = new THREE.PerspectiveCamera(45, 1, 0.5, 700); aCam.position.set(0, 17, 52); aCam.lookAt(0, 17, 0);

const all = []; const labels = [];
function row(scene, items, spacing) {
  items.forEach(([id, season, label], i) => {
    const v = HQ_PLANTS[id]({ seed: 1 });
    v.object.position.x = (i - (items.length - 1) / 2) * spacing;
    scene.add(v.object); v.setGrowth(1); v.setHealth(1); v.setSeason(season, 0.5); all.push(v);
    labels.push({ v, label: label || id, scene });
  });
}
row(rig.scene, [['oak', 'summer'], ['terebinth', 'summer', 'terebinth'], ['terebinth', 'autumn', 'terebinth autumn'], ['terebinth', 'winter', 'terebinth winter'],
  ['carob', 'summer'], ['pine', 'summer'], ['mastic', 'summer'], ['buckthorn', 'summer']], 10);
row(aScene, [['kapok', null], ['brazilnut', null], ['fig', null], ['cecropia', null]], 28);

const tris = {};
for (const { v, label } of labels) { let n = 0; v.object.traverse(o => { if (o.isMesh && !/seed/.test(o.name) && o.parent !== v.object) n += o.geometry.attributes.position.count / 3; }); tris[label] = n; }
console.log('tris', JSON.stringify(tris)); window.__tris = tris;

const lab = document.createElement('div');
lab.style.cssText = 'position:fixed;inset:0;pointer-events:none;font:bold 15px sans-serif;color:#fff;text-shadow:0 1px 3px #000';
document.body.appendChild(lab);

const clock = new THREE.Timer(); let t = 0;
renderer.setScissorTest(true);
const tmp = new THREE.Vector3();
function frame(ts) {
  clock.update(ts); const dt = Math.min(clock.getDelta(), 0.05); t += dt;
  for (const v of all) v.update(dt, t, 0.3);
  const W = innerWidth, H = innerHeight, h2 = H / 2;
  rig.camera.aspect = W / h2; rig.camera.updateProjectionMatrix(); aCam.aspect = W / h2; aCam.updateProjectionMatrix();
  renderer.setViewport(0, h2, W, h2); renderer.setScissor(0, h2, W, h2); renderer.render(rig.scene, rig.camera);
  renderer.setViewport(0, 0, W, h2); renderer.setScissor(0, 0, W, h2); renderer.render(aScene, aCam);
  lab.innerHTML = labels.map(({ v, label, scene }) => {
    const top = scene === rig.scene; tmp.copy(v.object.position).project(top ? rig.camera : aCam);
    const x = (tmp.x * 0.5 + 0.5) * W, y = (top ? 0 : h2) + h2 - 22;
    return `<div style="position:absolute;left:${x}px;top:${y}px;transform:translateX(-50%);white-space:nowrap">${label}</div>`;
  }).join('');
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__close = () => { rig.controls.target.set(-15, 6, 0); rig.camera.position.set(-15, 7, 15); aCam.position.set(42, 16, 18); aCam.lookAt(42, 14, 0); };
