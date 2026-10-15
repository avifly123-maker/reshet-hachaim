// Dev-only entry: the full game plus window.__exportIsland() → binary glTF (base64) of the island diorama
// (ground, skirt, rocks, plants, animals) without sky, horizon, mist or particles. Used to render start-screen art in Blender.
import '../../src/main.js';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

const SKIP = /sky|far-|mist|cloud|rain|pollen|mote|shaft|bolt|fire|marker|ring|gauge|ghost|fx/i;
window.__exportIsland = async function (maxR = 46) {
  const scene = window.__app.pipe.scene;
  scene.updateMatrixWorld(true);
  const out = new THREE.Scene();
  const box = new THREE.Box3(), c = new THREE.Vector3();
  let n = 0, skipped = [];
  scene.traverse((o) => {
    if (!o.isMesh || !o.visible || o.isSprite || o.isPoints) return;
    let p = o, hidden = false; while (p) { if (!p.visible || SKIP.test(p.name || '')) { hidden = true; break; } p = p.parent; }
    if (hidden) { skipped.push(o.name); return; }
    if (!o.geometry || !o.geometry.attributes.position) return;
    if (!o.isInstancedMesh) { box.setFromObject(o); box.getCenter(c); if (Math.hypot(c.x, c.z) > maxR) { skipped.push(o.name); return; } }
    // plain standard material carrying the colour data (custom shaders don't survive export)
    const src = Array.isArray(o.material) ? o.material[0] : o.material;
    const m = new THREE.MeshStandardMaterial({
      color: src.color ? src.color.clone() : new THREE.Color(src.isShaderMaterial ? '#3a8fb0' : '#ffffff'),
      vertexColors: !!(src.vertexColors && o.geometry.attributes.color), map: src.map || null,
      alphaTest: src.alphaTest || 0, transparent: false, side: src.side ?? THREE.FrontSide,
      roughness: src.roughness ?? 0.85, metalness: 0, name: (src.name || '') + (src.isShaderMaterial ? 'water' : ''),
    });
    let clone;
    if (o.isInstancedMesh) {
      clone = new THREE.InstancedMesh(o.geometry, m, o.count);
      for (let i = 0; i < o.count; i++) { const mm = new THREE.Matrix4(); o.getMatrixAt(i, mm); clone.setMatrixAt(i, mm); }
      if (o.instanceColor) { clone.instanceColor = o.instanceColor.clone(); }
    } else clone = new THREE.Mesh(o.geometry, m);
    o.matrixWorld.decompose(clone.position, clone.quaternion, clone.scale);
    clone.name = o.name || o.type;
    out.add(clone); n++;
  });
  const glb = await new GLTFExporter().parseAsync(out, { binary: true, onlyVisible: true });
  const bytes = new Uint8Array(glb); let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  window.__islandB64 = btoa(s);
  return { meshes: n, bytes: bytes.length, skipped: skipped.slice(0, 40) };
};
