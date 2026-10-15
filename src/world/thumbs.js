// Renders a small portrait (dataURL) of every species from its real 3D model, for the tray / journal / panel.
import * as THREE from 'three';
import { makeRng } from '../core/util.js';

export async function renderThumbnails(species, plantBuilders, animalBuilders, { size = 112, onProgress, fmt = 'image/png' } = {}) {
  const out = {};
  let renderer;
  try {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  } catch (e) { return out; }
  renderer.setSize(size, size, false); renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#e8f4ff', '#6b5a40', 1.6));
  const sun = new THREE.DirectionalLight('#fff3dc', 2.6); sun.position.set(3, 5, 4); scene.add(sun);
  const rim = new THREE.DirectionalLight('#bfe0ff', 1.0); rim.position.set(-4, 2, -3); scene.add(rim);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 500);
  const box = new THREE.Box3(), c = new THREE.Vector3(), s = new THREE.Vector3();
  let i = 0;
  for (const sp of species) {
    i++;
    let vis = null;
    try {
      if (sp.isPlant) {
        const opts = { seed: 7, rng: makeRng(7) };
        if (sp.id === 'liana') { opts.hostHeight = 6; opts.hostRadius = 0.3; }
        vis = plantBuilders[sp.id](opts);
        vis.setGrowth(1); vis.setHealth(1); vis.setBloom(1); vis.setFruit(1);
        if (vis.setSeason) vis.setSeason('spring', 0.5);
        vis.update(0.016, 1, 0);
      } else {
        vis = animalBuilders[sp.id]({ seed: 3, rng: makeRng(3) });
        if (vis.type === 'colony' && vis.setTrail) vis.setTrail([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.6, 0, 0.4), new THREE.Vector3(1.4, 0, 0.2)]);
        if (vis.type === 'animal') vis.update(0.016, { action: (sp.locomotion === 'flying') ? (sp.id === 'fruitbat' ? 'fly' : 'perch') : 'idle', speed: 0, t: 1, night: sp.id === 'firefly' ? 1 : 0 });
        else vis.update(0.016, { t: 1, night: sp.id === 'firefly' ? 1 : 0, activity: 1 });
      }
      const o = vis.object; scene.add(o);
      o.updateMatrixWorld(true);
      box.setFromObject(o); box.getCenter(c); box.getSize(s);
      const r = Math.max(s.x, s.y, s.z) * 0.62 + 0.001;
      const d = r / Math.tan((cam.fov * Math.PI) / 360) * 1.05;
      const dir = sp.isPlant ? new THREE.Vector3(0.55, 0.32, 1) : new THREE.Vector3(0.9, 0.35, 1);
      cam.position.copy(c).addScaledVector(dir.normalize(), d); cam.lookAt(c);
      cam.near = d / 50; cam.far = d * 4; cam.updateProjectionMatrix();
      renderer.render(scene, cam);
      out[sp.id] = renderer.domElement.toDataURL(fmt, 0.82);
      scene.remove(o);
      vis.dispose && vis.dispose();
    } catch (e) { console.warn('thumb failed', sp.id, e); }
    if (onProgress) onProgress(i / species.length);
    if (i % 4 === 0) await new Promise(r => setTimeout(r, 0));
  }
  renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss();
  return out;
}
