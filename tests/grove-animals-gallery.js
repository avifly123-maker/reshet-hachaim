// Gallery for grove animals: node build.mjs tests/grove-animals-gallery.js scratch/grove-animals.html --dev
// window.setAction(name), window.focus(id[, yawDeg, distMul]), window.setNight(0..1), window.stats()
import * as THREE from 'three';
import { makeRig } from './rig.js';
import { ANIMALS } from '../src/models/grove-animals.js';

const rig = makeRig({ ground: '#8a6a45', camPos: [0, 5, 13], target: [0, 0.5, -1], size: 40 });
const { scene, camera, controls } = rig;
const ids = Object.keys(ANIMALS);
const order = ['gazelle', 'fox', 'porcupine', 'hyrax', 'hedgehog', 'spinymouse', 'owl', 'jay', 'blackbird', 'chameleon', 'agama', 'butterfly', 'honeybee', 'harvesterant', 'firefly'];
const FLYERS = new Set(['owl', 'jay', 'blackbird', 'honeybee', 'butterfly']);
const items = [];
const slots = { gazelle: [-5, 0], fox: [-3, 0], porcupine: [-1.4, 0], hyrax: [0, 0], hedgehog: [1.1, 0], spinymouse: [2, 0],
  owl: [3.2, 0], jay: [4.4, 0], blackbird: [5.3, 0], chameleon: [-3.2, 2], agama: [-2.2, 2], butterfly: [-1.2, 2], honeybee: [-0.4, 2],
  harvesterant: [1.5, 2.3], firefly: [5, -3] };
let action = 'idle';
for (const id of order) {
  const v = ANIMALS[id]({ seed: 1 });
  const holder = new THREE.Group(); holder.add(v.object); holder.position.set(slots[id][0], 0, slots[id][1]);
  if (id !== 'harvesterant' && id !== 'firefly') holder.rotation.y = 0.5;
  scene.add(holder);
  items.push({ id, v, holder });
  if (id === 'harvesterant') {
    // trail in world space, fanning off toward the right
    v.setTrail([new THREE.Vector3(1.5, 0.02, 2.3), new THREE.Vector3(2.3, 0, 2.8), new THREE.Vector3(3.0, 0, 2.5), new THREE.Vector3(3.8, 0, 3.2), new THREE.Vector3(4.6, 0, 3.0)]);
  }
}
// small rock & branch props for context
const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0).scale(1.2, 0.5, 1), new THREE.MeshStandardMaterial({ color: '#c9c0ad', roughness: 1, flatShading: true }));
rock.position.set(-2.2, -0.05, 2.0); rock.castShadow = rock.receiveShadow = true; scene.add(rock);
const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.9, 6).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#5a4430', roughness: 1 }));
branch.position.set(-3.2, 0.31, 2.0); branch.castShadow = true; scene.add(branch);
const it = (id) => items.find(i => i.id === id);
// agama on rock
it('agama').holder.position.y = 0.2;
let night = 0;
let spinFly = false;
window.setAction = (a) => { action = a; return a; };
window.setNight = (n) => {
  night = n;
  scene.background.set(n > 0.5 ? '#0b1526' : '#9ec7e8'); scene.fog.color.copy(scene.background);
  rig.hemi.intensity = n > 0.5 ? 0.35 : 1.1; rig.hemi.color.set(n > 0.5 ? '#3a5a8a' : '#cfe6ff');
  rig.sun.intensity = n > 0.5 ? 0.35 : 3; rig.sun.color.set(n > 0.5 ? '#9fb6ff' : '#fff1d6');
  return n;
};
window.setSpin = (b) => { spinFly = b; return b; };
window.focus = (id, yawDeg = 35, distMul = 1, pitch = 0.32) => {
  const i = it(id); if (!i) return 'no ' + id;
  const box = new THREE.Box3().setFromObject(i.v.object);
  const c = box.getCenter(new THREE.Vector3()); const sz = box.getSize(new THREE.Vector3());
  const r = Math.max(sz.x, sz.y, sz.z, 0.15) * 1.25 * distMul;
  const yaw = THREE.MathUtils.degToRad(yawDeg);
  camera.position.set(c.x + Math.sin(yaw) * r * Math.cos(pitch) * 2, c.y + r * Math.sin(pitch) * 2, c.z + Math.cos(yaw) * r * Math.cos(pitch) * 2);
  controls.target.copy(c); camera.near = 0.01; camera.updateProjectionMatrix(); controls.update();
  return id;
};
window.view = (pos, tgt) => { camera.position.set(...pos); controls.target.set(...tgt); controls.update(); return 'ok'; };
window.stats = () => items.map(({ id, v }) => {
  let tris = 0, meshes = 0;
  v.object.traverse(o => { if (o.isMesh) { meshes++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? 1 : 1); } });
  return `${id}: tris=${Math.round(tris)} meshes=${meshes} h=${(v.height || 0).toFixed(2)} len=${(v.length || 0).toFixed(2)}`;
}).join('\n');
window.dumpState = () => JSON.stringify({ action, night });

rig.onFrame((dt, t) => {
  for (const { id, v, holder } of items) {
    if (v.type === 'colony' || v.type === 'swarm') { v.update(dt, { t, night, activity: 1 }); continue; }
    let a = action; const fl = FLYERS.has(id);
    if (fl && a === 'idle') a = (id === 'honeybee' || id === 'butterfly') ? 'hover' : 'perch';
    if (!fl && (a === 'fly' || a === 'glide' || a === 'hover' || a === 'perch')) a = 'idle';
    if (id === 'chameleon' && (a === 'walk' || a === 'run')) a = 'climb';
    const air = fl && (a === 'fly' || a === 'glide' || a === 'hover');
    let y = 0;
    if (id === 'honeybee' || id === 'butterfly') y = air ? 0.6 : 0.05;
    else if (fl) y = air ? 1.3 : v.perchOffset;
    if (id === 'chameleon') y = 0.31 - 0.15 + 0.17;
    if (id === 'agama') y = 0.2;
    holder.position.y = y;
    if (spinFly && air) holder.rotation.y += dt * 0.8;
    const sp = { walk: 0, run: 0 }[a] ?? 0;
    v.update(dt, { action: a, speed: sp, t, night });
  }
});
window.setNight(Number(new URLSearchParams(location.search).get('night') || 0));
rig.start();
