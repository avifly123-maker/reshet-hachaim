// Gallery for the extra grove animals (hoopoe, tortoise, chukar):
//   node build.mjs tests/grove-extra-gallery.js scratch/gx.html --dev
// Rows = species, columns = actions. window.setAction(a) forces one action on all; window.stats(); window.view(pos, tgt)
import * as THREE from 'three';
import { makeRig } from './rig.js';
import { ANIMALS_EXTRA } from '../src/models/grove-animals-extra.js';

const rig = makeRig({ ground: '#8a7a50', camPos: [0.1, 1.5, 3.0], target: [0.1, 0.12, 0.1], size: 30 });
const { scene, camera, controls } = rig;
const COLS = {
  hoopoe: ['perch', 'eat', 'walk', 'fly', 'sleep'],
  tortoise: ['idle', 'eat', 'walk', 'run', 'sleep'],
  chukar: ['idle', 'eat', 'walk', 'run', 'sleep'],
};
const ROWS = ['hoopoe', 'chukar', 'tortoise'];
const items = [];
ROWS.forEach((id, r) => COLS[id].forEach((a, c) => {
  const v = ANIMALS_EXTRA[id]({ seed: c });
  const holder = new THREE.Group(); holder.add(v.object);
  holder.position.set((c - 2) * 0.85, 0, (r - 1) * 0.95);
  holder.rotation.y = 1.15;
  scene.add(holder);
  items.push({ id, v, holder, action: a, base: a });
}));
const params = new URLSearchParams(location.search);
let forced = params.get('act');
window.setAction = (a) => { forced = a; return a; };
window.view = (pos, tgt) => { camera.position.set(...pos); controls.target.set(...tgt); controls.update(); return 'ok'; };
window.stats = () => ROWS.map(id => {
  const v = items.find(i => i.id === id).v; let tris = 0, meshes = 0;
  v.object.traverse(o => { if (o.isMesh) { meshes++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; } });
  return `${id}: tris=${Math.round(tris)} meshes=${meshes} h=${v.height.toFixed(2)} len=${v.length.toFixed(2)} perch=${(v.perchOffset || 0).toFixed(3)}`;
}).join('\n');
rig.onFrame((dt, t) => {
  for (const it of items) {
    let a = forced || it.base;
    if (it.id !== 'hoopoe' && (a === 'fly' || a === 'perch')) a = 'idle';
    const air = it.id === 'hoopoe' && (a === 'fly' || a === 'glide' || a === 'hover');
    it.holder.position.y = it.id === 'hoopoe' ? (air ? 0.55 : it.v.perchOffset) : 0;
    it.v.update(dt, { action: a, speed: 0, t, night: 0 });
  }
});
console.log(window.stats());
rig.start();
