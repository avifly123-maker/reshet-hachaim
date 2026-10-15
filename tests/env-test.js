// Environment test page. Settings from URL (?biome=amazon&day=0.5&rain=0&season=winter&cam=high|floor|side|low&shafts=1&q=medium)
// or at runtime via window.__set({...}) (used by tools/shot.py 6th arg).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createPipeline } from '../src/env/pipeline.js';
import { createEnvironment } from '../src/env/environment.js';
import { makeRng } from '../src/core/util.js';

const qs = new URLSearchParams(location.search);
const S = {
  biome: qs.get('biome') || 'amazon', day: +(qs.get('day') ?? 0.5), rain: +(qs.get('rain') ?? 0), wind: +(qs.get('wind') ?? 0.25),
  season: qs.get('season') || 'spring', seasonFrac: +(qs.get('sf') ?? 0.4), cam: qs.get('cam') || 'high', shafts: +(qs.get('shafts') ?? 1),
  lightning: +(qs.get('lightning') ?? 0), q: qs.get('q') || 'medium', vitality: +(qs.get('vit') ?? 1), drought: +(qs.get('drought') ?? 0), fire: +(qs.get('fire') ?? 0),
  hide: qs.get('hide') || '', overlay: +(qs.get('overlay') ?? 0), trees: +(qs.get('trees') ?? 1), timeRun: 0,
  still: +(qs.get('still') ?? 0), // >0: render that many frames then stop (for slow headless screenshots)
};
if (window.__preset) Object.assign(S, window.__preset);

const canvas = document.getElementById('game');
const pipe = createPipeline(canvas, { quality: S.q });
const { scene, camera } = pipe;
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

let env = null, trees = null, fakeShafts = [];
const treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true });

function buildTrees(biome) {
  if (trees) { scene.remove(trees); trees.traverse(o => o.geometry && o.geometry.dispose()); }
  trees = new THREE.Group(); scene.add(trees);
  fakeShafts = [];
  if (!S.trees) return;
  const rng = makeRng(biome === 'amazon' ? 5 : 9);
  const trunkG = new THREE.CylinderGeometry(0.35, 0.7, 1, 7); trunkG.translate(0, 0.5, 0);
  const crownG = new THREE.IcosahedronGeometry(1, 1);
  const color = (g, c) => { const n = g.attributes.position.count; const a = new Float32Array(n * 3); const col = new THREE.Color(c); for (let i = 0; i < n; i++) { const k = 0.8 + 0.4 * Math.random(); a.set([col.r * k, col.g * k, col.b * k], i * 3); } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  const gaps = biome === 'amazon' ? [[4, 8, 5.5], [-14, -4, 4.5], [16, -12, 4], [-6, 20, 3.5], [24, 6, 3]] : [];
  const pts = [];
  const N = biome === 'amazon' ? 44 : 22;
  let tries = 0;
  while (pts.length < N && tries++ < 4000) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 36; const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!env.isPlaceable(x, z)) continue;
    if (gaps.some(([gx, gz, gr]) => Math.hypot(gx - x, gz - z) < gr + 2.5)) continue;
    if (pts.some(p => Math.hypot(p[0] - x, p[1] - z) < (biome === 'amazon' ? 5.5 : 9))) continue;
    pts.push([x, z]);
  }
  for (const [x, z] of pts) {
    const tall = biome === 'amazon' ? (rng() < 0.15 ? 34 : rng() < 0.6 ? 24 : 14) : 6 + rng() * 6;
    const crownR = biome === 'amazon' ? (tall > 30 ? 8 : tall > 20 ? 6 : 4) : 3 + rng() * 1.5;
    const tg = color(trunkG.clone(), biome === 'amazon' ? '#6a5a48' : '#5a4a3a'); tg.scale(tall / 34 + 0.6, tall, tall / 34 + 0.6);
    const cg = color(crownG.clone(), biome === 'amazon' ? (rng() < 0.5 ? '#2f5a22' : '#3d6a26') : '#4a6030'); cg.scale(crownR, crownR * 0.55, crownR); cg.translate(0, tall, 0);
    const y = env.heightAt(x, z);
    for (const g of [tg, cg]) { const m = new THREE.Mesh(g, treeMat); m.position.set(x, y - 0.2, z); m.castShadow = m.receiveShadow = true; trees.add(m); }
  }
  fakeShafts = gaps.map(([x, z, r], i) => ({ x, z, yTop: 27 + (i % 2) * 4, radius: r * 0.75, strength: 0.6 + 0.4 * ((i * 7) % 3) / 2 }));
}

function rebuild() {
  if (env) env.dispose();
  const tb = performance.now();
  env = createEnvironment(pipe, S.biome, { quality: S.q, seed: 1 });
  console.log('build ms', (performance.now() - tb).toFixed(0));
  { const t1 = performance.now(); let k = 0; for (let i = 0; i < 10000; i++) k += env.heightAt(Math.sin(i) * 40, Math.cos(i * 1.3) * 40); console.log('10k heightAt ms', (performance.now() - t1).toFixed(1)); }
  buildTrees(S.biome);
  setCam();
  window.env = env;
  if (S.hide) for (const n of String(S.hide).split(',')) env.root.traverse(o => { if (o.name === n) o.visible = false; });
}

function setCam() {
  const c = S.cam;
  if (c === 'high') { camera.position.set(62, 66, 92); controls.target.set(0, 2, 0); }
  else if (c === 'low') { camera.position.set(40, 22, 70); controls.target.set(0, 4, 0); }
  else if (c === 'side') { camera.position.set(70, 2, 70); controls.target.set(0, -8, 0); }
  else if (c === 'floor') { const s = fakeShafts[0] || { x: 4, z: 8 }; const px = s.x + 13, pz = s.z + 9; const y = env.heightAt(px, pz); camera.position.set(px, y + 2.2, pz); controls.target.set(s.x - 2, y + 9, s.z - 1); }
  else if (c === 'pool') { camera.position.set(28, 10, 8); controls.target.set(13, 0, -6); }
  else if (c === 'far') { camera.position.set(-70, 75, 60); controls.target.set(0, 0, 0); }
  else if (c === 'fire') { camera.position.set(4, 12, 34); controls.target.set(-8, 2, 13); }
  else if (c === 'fall') { camera.position.set(72, -6, 18); controls.target.set(40, -14, 34); }
  controls.update();
}

window.__set = (o) => {
  const needRebuild = (o.biome && o.biome !== S.biome) || (o.q && o.q !== S.q) || (o.trees !== undefined && o.trees !== S.trees);
  Object.assign(S, o);
  if (o.q && !needRebuild) pipe.setQuality(o.q);
  if (needRebuild) { if (o.q) pipe.setQuality(o.q); rebuild(); } else if (o.cam) setCam();
  return 'ok';
};

let overlayTex = null;
function makeOverlay() {
  const n = 32; const d = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const v = 0.5 + 0.5 * Math.sin(x * 0.4) * Math.cos(y * 0.3); const i = (y * n + x) * 4;
    d[i] = 255 * v; d[i + 1] = 200 * v + 30; d[i + 2] = 60; d[i + 3] = 200;
  }
  const t = new THREE.DataTexture(d, n, n); t.magFilter = THREE.LinearFilter; t.needsUpdate = true; return t;
}

rebuild();
addEventListener('resize', () => pipe.resize());
pipe.resize();

const clock = new THREE.Timer();
pipe.renderer.info.autoReset = false;
let t = 5, lastLightning = 0, warmed = false;
const info = document.createElement('div');
info.style.cssText = 'position:fixed;left:8px;bottom:8px;color:#fff;font:12px monospace;background:#0006;padding:4px 6px;direction:ltr;z-index:9';
document.body.appendChild(info);
let frames = 0, acc = 0;
function frame() {
  clock.update(); const dt = Math.min(clock.getDelta(), 0.1); t += dt; frames++; acc += dt;
  if (S.timeRun) S.day = (S.day + dt / 240) % 1;
  if (S.overlay && !overlayTex) { overlayTex = makeOverlay(); env.setLightOverlay(overlayTex); }
  if (!S.overlay && overlayTex) { env.setLightOverlay(null); overlayTex = null; }
  const lightning = !!S.lightning; S.lightning = 0;
  const fire = S.fire ? [{ x: -10, z: 12, r: 3, intensity: S.fire }, { x: -4, z: 16, r: 2, intensity: S.fire * 0.7 }] : [];
  const ctxNow = (dtx) => ({
    t, dayFrac: S.day, season: S.biome === 'grove' ? S.season : null, seasonFrac: S.seasonFrac, rain: S.rain, wind: S.wind,
    nightGlow: 0, camera, vitality: S.vitality, drought: S.drought, fire, lightning: false,
    shafts: S.shafts ? fakeShafts : [],
  });
  if (S.still > 0 && !warmed) { warmed = true; for (let i = 0; i < 60; i++) { t += 0.2; env.update(0.2, ctxNow(0.2)); } }
  env.update(dt, { ...ctxNow(dt), lightning });
  controls.update();
  pipe.renderer.info.reset();
  pipe.render(dt);
  if (acc > 1) { info.textContent = `${S.biome} day=${S.day.toFixed(2)} fps=${(frames / acc).toFixed(1)} calls=${pipe.renderer.info.render.calls} tris=${(pipe.renderer.info.render.triangles / 1000).toFixed(0)}k q=${pipe.quality}`; frames = 0; acc = 0; }
  if (S.still > 0 && frames + 0 >= 0) { S.still--; if (S.still === 0) { window.__done = true; console.log('frame ms', (performance.now() - t0).toFixed(0), 'calls', pipe.renderer.info.render.calls, 'tris', pipe.renderer.info.render.triangles); return; } }
  requestAnimationFrame(frame);
}
const t0 = performance.now();
frame();
