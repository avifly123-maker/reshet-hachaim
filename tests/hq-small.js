// OLD (top) vs NEW (bottom): sage, rockrose, fern, heliconia (left) and açaí palm (right). Daylight.
// Build: node build.mjs tests/hq-small.js scratch/hq-small.html --dev
import * as THREE from 'three';
import { makeRig } from './rig.js';
import { PLANTS as GROVE } from '../src/models/grove-plants.js';
import { PLANTS as AMAZON } from '../src/models/amazon-plants.js';
import { HQ_PLANTS } from '../src/models/hq-trees-all.js';

const rig = makeRig({ ground: '#6b7a44', size: 20 });
const { renderer } = rig;
function makeScene(size, ground) {
  const s = new THREE.Scene(); s.background = rig.scene.background.clone();
  const sun = rig.sun.clone(); sun.shadow = rig.sun.shadow.clone(); sun.position.set(size * 0.4, size * 0.7, size * 0.3);
  const c = sun.shadow.camera; c.left = c.bottom = -size; c.right = c.top = size; c.near = 0.5; c.far = size * 4;
  const g = new THREE.Mesh(new THREE.CircleGeometry(size * 1.5, 48), new THREE.MeshStandardMaterial({ color: ground, roughness: 1 }));
  g.rotation.x = -Math.PI / 2; g.receiveShadow = true; s.add(rig.hemi.clone(), sun, g);
  return s;
}
const small = { old: makeScene(5, '#6b7a44'), neu: makeScene(5, '#6b7a44') };
const palm = { old: makeScene(9, '#4d5e30'), neu: makeScene(9, '#4d5e30') };
const sCam = new THREE.PerspectiveCamera(40, 1, 0.05, 100); sCam.position.set(0, 2.0, 6.3); sCam.lookAt(0, 0.8, 0);
const pCam = new THREE.PerspectiveCamera(40, 1, 0.1, 200); pCam.position.set(0, 7, 18); pCam.lookAt(0, 8.2, 0);

const all = [];
const LIB = { sage: GROVE, rockrose: GROVE, fern: AMAZON, heliconia: AMAZON, acai: AMAZON };
function put(scene, v, x) { v.object.position.x = x; scene.add(v.object); v.setGrowth(1); v.setHealth(1); v.setSeason('spring', 0.5); all.push(v); }
['sage', 'rockrose', 'fern', 'heliconia'].forEach((id, i) => {
  const x = (i - 1.5) * 2.4;
  put(small.old, LIB[id][id]({ seed: 1 }), x); put(small.neu, HQ_PLANTS[id]({ seed: 1 }), x);
});
put(palm.old, AMAZON.acai({ seed: 1 }), 0); put(palm.neu, HQ_PLANTS.acai({ seed: 1 }), 0);

const tris = {};
for (const id of ['sage', 'rockrose', 'fern', 'heliconia', 'acai']) { const v = HQ_PLANTS[id]({ seed: 1 }); let n = 0; v.object.traverse(o => { if (o.isMesh && o.parent !== v.object) n += o.geometry.attributes.position.count / 3; }); tris[id] = n; v.dispose(); }
console.log('tris', JSON.stringify(tris));

const lab = document.createElement('div');
lab.style.cssText = 'position:fixed;inset:0;pointer-events:none;font:bold 16px sans-serif;color:#fff;text-shadow:0 1px 3px #000';
lab.innerHTML = `<div style="position:absolute;left:10px;top:8px">OLD — sage · rockrose · fern · heliconia · açaí</div><div style="position:absolute;left:10px;top:50%;margin-top:8px">NEW</div>`;
document.body.appendChild(lab);

const timer = new THREE.Timer(); let t = 0;
renderer.setScissorTest(true);
function view(scene, cam, x, y, w, h) { cam.aspect = w / h; cam.updateProjectionMatrix(); renderer.setViewport(x, y, w, h); renderer.setScissor(x, y, w, h); renderer.render(scene, cam); }
function frame(ts) {
  timer.update(ts); const dt = Math.min(timer.getDelta(), 0.05); t += dt;
  for (const v of all) v.update(dt, t, 0.3);
  const W = innerWidth, H = innerHeight, h2 = H / 2, wl = Math.round(W * 0.68);
  view(small.old, sCam, 0, h2, wl, h2); view(palm.old, pCam, wl, h2, W - wl, h2);
  view(small.neu, sCam, 0, 0, wl, h2); view(palm.neu, pCam, wl, 0, W - wl, h2);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
