// Shared test rig for model galleries. Mimics the game's look (ACES tone mapping, warm sun, sky fill, soft shadows)
// so colours chosen here look the same in the final game.
// Usage:  import { makeRig } from './rig.js';
//         const rig = makeRig({ ground: '#5b6b3a', camPos:[0,6,18], target:[0,2,0] });
//         rig.scene.add(obj); rig.onFrame((dt,t)=>{...}); rig.start();
// URL params:  ?t=3 (fast-forward clock seconds before first frame, for screenshots)
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function makeRig({ ground = '#55623a', sky = '#9ec7e8', camPos = [0, 8, 22], target = [0, 2, 0], sunPos = [12, 20, 8], night = false, size = 60 } = {}) {
  const canvas = document.getElementById('game');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(night ? '#0a1424' : sky);
  scene.fog = new THREE.Fog(scene.background, size * 0.8, size * 2.2);
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.05, 500);
  camera.position.set(...camPos);
  const controls = new OrbitControls(camera, canvas); controls.target.set(...target); controls.update();
  const hemi = new THREE.HemisphereLight(night ? '#3a5a8a' : '#cfe6ff', night ? '#101010' : '#4a3b28', night ? 0.35 : 1.1);
  const sun = new THREE.DirectionalLight(night ? '#9fb6ff' : '#fff1d6', night ? 0.4 : 3.0);
  sun.position.set(...sunPos); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = sc.bottom = -size / 2; sc.right = sc.top = size / 2; sc.near = 1; sc.far = 120; sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
  scene.add(hemi, sun);
  const g = new THREE.Mesh(new THREE.CircleGeometry(size / 2, 64), new THREE.MeshStandardMaterial({ color: ground, roughness: 1 }));
  g.rotation.x = -Math.PI / 2; g.receiveShadow = true; scene.add(g);
  const frames = [];
  const clock = new THREE.Clock();
  let t = Number(new URLSearchParams(location.search).get('t') || 0);
  addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05); t += dt;
    for (const f of frames) f(dt, t);
    controls.update(); renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  // Grid of labelled positions helper: place items in rows
  function lineup(objs, spacing = 6, perRow = 6) {
    objs.forEach((o, i) => { const r = Math.floor(i / perRow), c = i % perRow; o.position.set((c - (perRow - 1) / 2) * spacing, 0, -r * spacing); scene.add(o); });
  }
  return { renderer, scene, camera, controls, sun, hemi, onFrame: f => frames.push(f), start: () => frame(), lineup };
}
