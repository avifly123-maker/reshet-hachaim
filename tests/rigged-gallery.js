// Gallery for the Blender animals: node build.mjs tests/rigged-gallery.js scratch/rigged.html --dev
// window.setAction(name, speed), window.focus(id, yawDeg, dist), window.only(id)
import * as THREE from 'three';
import { makeRig } from './rig.js';
import { makeRigged } from '../src/models/rigged.js';
import { RIGGED as G } from '../src/data/rigged-grove.js';
import { RIGGED as A } from '../src/data/rigged-amazon.js';
import { ANIMALS as GA } from '../src/models/grove-animals.js';
import { ANIMALS_EXTRA as GE } from '../src/models/grove-animals-extra.js';
import { ANIMALS as AA } from '../src/models/amazon-animals.js';
import { ANIMALS_EXTRA as AE } from '../src/models/amazon-animals-extra.js';

const rig = makeRig({ ground: '#8a7350', camPos: [0, 2, 4], target: [0, 0.3, 0], size: 30 });
const { scene, camera, controls } = rig; window.camera = camera; window.controls = controls;
const data = { ...G, ...A }, OLD = { ...GA, ...GE, ...AA, ...AE };
const items = []; let x = 0;
for (const [id, d] of Object.entries(data)) {
  const v = makeRigged(id, d, { seed: 3 });
  const old = OLD[id] ? OLD[id]({ seed: 1 }) : null;
  const w = Math.max(0.6, v.length) * 1.4;
  v.object.position.set(x, 0, 0); scene.add(v.object);
  if (old) { old.object.position.set(x, 0, -Math.max(1, v.length * 1.6)); scene.add(old.object); }
  items.push({ id, v, old, x }); x += w;
}
let action = 'walk', speed = null;
window.setAction = (a, s = null) => { action = a; speed = s; return a; };
window.focus = (id, yaw = 30, dist = null) => {
  const it = items.find((i) => i.id === id); if (!it) return 'no ' + id;
  const d = dist || Math.max(it.v.length, it.v.height) * 2.4, y = yaw * Math.PI / 180;
  const t = new THREE.Vector3(it.x, it.v.height * 0.45, 0);
  camera.position.set(t.x + Math.sin(y) * d, t.y + d * 0.35, t.z + Math.cos(y) * d); controls.target.copy(t); controls.update();
  return id;
};
window.compare = (id, yaw = 30) => {
  const it = items.find((i) => i.id === id); const d = Math.max(it.v.length, it.v.height) * 3.6, y = yaw * Math.PI / 180;
  const t = new THREE.Vector3(it.x, it.v.height * 0.4, -Math.max(1, it.v.length * 1.6) / 2);
  camera.position.set(t.x + Math.sin(y) * d, t.y + d * 0.45, t.z + Math.cos(y) * d); controls.target.copy(t); controls.update();
};
window.stats = () => items.map((i) => `${i.id}: ${i.v.tris} tris, actions ${i.v.actions.join('/')}, h ${i.v.height.toFixed(2)} len ${i.v.length.toFixed(2)}`).join('\n');
rig.onFrame((dt, t) => {
  for (const it of items) {
    it.v.update(dt, { action, speed, t, night: 0 });
    if (it.old) it.old.update(dt, { action, speed: speed ?? 0.3, t, night: 0 });
  }
});
rig.start();
