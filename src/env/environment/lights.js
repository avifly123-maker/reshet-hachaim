// Lights and fog: the sun / moon directional light with its shadow camera, the hemisphere light, and the scene fog (the
// previous fog and background are kept for dispose()). update.js moves and colours them every frame.
// Exports: createLights(ctx) → { sunLight, hemi, fog, prevFog, prevBg, sun }.
// Needs from ctx: pipeline, quality, root, scene.
import * as THREE from 'three';
import { V3, K } from './common.js';

export function createLights(ctx) {
  const { pipeline, quality, root, scene } = ctx;
  // ───────────────────────────── lights
  const sunLight = new THREE.DirectionalLight(0xffffff, 3);
  sunLight.castShadow = true;
  const ss = pipeline.shadowSize || ({ low: 1024, medium: 2048, high: 4096 })[quality] || 2048;
  sunLight.shadow.mapSize.set(ss, ss);
  const sc = sunLight.shadow.camera;
  sc.left = -54 * K; sc.right = 54 * K; sc.top = 54 * K; sc.bottom = -54 * K; sc.near = 1; sc.far = 260;
  sunLight.shadow.bias = -0.0004; sunLight.shadow.normalBias = 0.05; sunLight.shadow.radius = 3;
  sunLight.target.position.set(0, 0, 0);
  root.add(sunLight, sunLight.target);
  const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x4a3b28, 1.0);
  root.add(hemi);
  const fog = new THREE.Fog(0xcde, 100, 520);
  const prevFog = scene.fog, prevBg = scene.background;
  scene.fog = fog; scene.background = null;

  const sun = { direction: V3(0, 1, 0), elevation: Math.PI / 2, light: sunLight };
  return { sunLight, hemi, fog, prevFog, prevBg, sun };
}
