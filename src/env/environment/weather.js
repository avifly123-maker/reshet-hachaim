// Weather: the rain streaks and the lightning bolt (makeBolt builds a new bolt in front of the camera; update.js runs the
// flash).
// Exports: createRain(ctx) → { rainU, rainMesh, boltMat, boltMesh, makeBolt }.
// Needs from ctx: U, qual, seed, track, root.
import * as THREE from 'three';
import { makeRng } from '../../core/util.js';
import { TAU, C, V3 } from './common.js';

export function createRain(ctx) {
  const { U, qual, seed, track, root } = ctx;
  // ───────────────────────────── rain
  let rainMesh; const rainU = { uTime: U.uTime, uWind: U.uWind, uAmt: { value: 0 }, uCol: { value: C('#c8d4e0') } };
  {
    const n = qual.rain; const rr = makeRng(seed + 707);
    const pos = new Float32Array(n * 2 * 3), end = new Float32Array(n * 2), rnd = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const th = rr() * TAU, r = Math.sqrt(rr()) * 52; const x = Math.cos(th) * r, z = Math.sin(th) * r, y = rr() * 60;
      for (let k = 0; k < 2; k++) { pos.set([x, y, z], (i * 2 + k) * 3); end[i * 2 + k] = k; rnd[i * 2 + k] = i / n; }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    g.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: rainU, transparent: true, depthWrite: false,
      vertexShader: /* glsl */`
        uniform float uTime, uWind, uAmt; attribute float aEnd; attribute float aRnd; varying float vA;
        void main(){
          vec3 p = position;
          float sp = 26.0 + aRnd * 8.0;
          p.y = mod(p.y - uTime * sp, 60.0) - 8.0;
          vec3 vel = vec3(uWind * 7.0 + 1.0, -sp, uWind * 2.0);
          p += aEnd * normalize(vel) * 1.1;
          vA = (aRnd < uAmt ? 1.0 : 0.0) * (0.35 + 0.65 * aEnd);
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */`uniform vec3 uCol; varying float vA; void main(){ if (vA < 0.01) discard; gl_FragColor = vec4(uCol, vA * 0.4); }`,
    });
    rainMesh = new THREE.LineSegments(track(g), track(mat)); rainMesh.frustumCulled = false; rainMesh.renderOrder = 30; rainMesh.visible = false; rainMesh.name = 'rain';
    root.add(rainMesh);
  }

  // lightning bolt
  const boltMat = track(new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 4.4, 6), transparent: true, opacity: 1, fog: false, depthWrite: false, side: THREE.DoubleSide }));
  const boltMesh = new THREE.Mesh(new THREE.BufferGeometry(), boltMat); boltMesh.visible = false; boltMesh.frustumCulled = false;
  root.add(boltMesh);
  let boltSeed = 1;   // (flashT, the flash clock, lives in update.js)
  function makeBolt(cam) {
    const rr = makeRng(boltSeed++ * 13 + seed);
    // strike somewhere in front of the camera, beyond the island
    const fwd = V3(0, 0, -1); if (cam) cam.getWorldDirection(fwd); fwd.y = 0; if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1); fwd.normalize();
    const th = Math.atan2(fwd.z, fwd.x) + (rr() - 0.5) * 1.1; const dist = 150 + rr() * 90;
    const base = cam ? cam.position : V3();
    let p = V3(base.x + Math.cos(th) * dist, 90 + rr() * 30, base.z + Math.sin(th) * dist);
    const camDir = cam ? cam.position.clone().sub(p).setY(0).normalize() : V3(0, 0, 1);
    const side = V3(-camDir.z, 0, camDir.x);
    const pos = [];
    const addSeg = (a, b, w) => { pos.push(a.x - side.x * w, a.y, a.z - side.z * w, a.x + side.x * w, a.y, a.z + side.z * w, b.x + side.x * w * 0.8, b.y, b.z + side.z * w * 0.8, a.x - side.x * w, a.y, a.z - side.z * w, b.x + side.x * w * 0.8, b.y, b.z + side.z * w * 0.8, b.x - side.x * w * 0.8, b.y, b.z - side.z * w * 0.8); };
    let w = 1.3;
    while (p.y > -60) {
      const q = p.clone().add(V3((rr() - 0.5) * 14, -6 - rr() * 10, (rr() - 0.5) * 6)); addSeg(p, q, w);
      if (rr() < 0.18) { const br = q.clone().add(V3((rr() - 0.5) * 20, -10 - rr() * 10, 0)); addSeg(q, br, w * 0.5); }
      p = q; w *= 0.96;
    }
    boltMesh.geometry.dispose();
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    boltMesh.geometry = g;
  }
  return { rainU, rainMesh, boltMat, boltMesh, makeBolt };
}
