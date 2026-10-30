// Ambient life in the air: pollen by day and glowing motes at night, and the distant birds circling the island (more of
// them with vitality, day only). index.js creates the pollen before the mist banks and the birds after the fire.
// Exports: createPollen(ctx) → { pollenU, pollenMesh }; createBirds(ctx) → { birds }.
// Needs from ctx: U, seed, track, root; the pollen also isAmazon, qual, heightAt.
import * as THREE from 'three';
import { makeRng } from '../../core/util.js';
import { TAU, C, K } from './common.js';

export function createPollen(ctx) {
  const { U, isAmazon, qual, seed, heightAt, track, root } = ctx;
  // ───────────────────────────── ambient particles (pollen by day, glow motes at night)
  let pollenMesh; const pollenU = { uTime: U.uTime, uPx: U.uPx, uWind: U.uWind, uDay: { value: 1 }, uNightA: { value: 0 }, uDayCol: { value: C('#fff6d8') }, uNightCol: { value: C(isAmazon ? '#9fffd0' : '#e8ff7a') }, uLight: U.uLightCol };
  {
    const n = qual.pollen; const rr = makeRng(seed + 505);
    const pos = new Float32Array(n * 3), rnd = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const th = rr() * TAU, r = Math.sqrt(rr()) * 40 * K; const x = Math.cos(th) * r, z = Math.sin(th) * r;
      const night = i % 4 === 0;
      pos[i * 3] = x; pos[i * 3 + 1] = heightAt(x, z) + (night ? 0.4 + rr() * 2.5 : 0.5 + rr() * 12); pos[i * 3 + 2] = z;
      rnd[i * 4] = rr(); rnd[i * 4 + 1] = rr(); rnd[i * 4 + 2] = night ? 1 : 0; rnd[i * 4 + 3] = rr();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 4));
    const mat = new THREE.ShaderMaterial({
      uniforms: pollenU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        uniform float uTime, uPx, uWind, uDay, uNightA; attribute vec4 aRnd; varying float vA; varying float vNight;
        void main(){
          vec3 p = position; float ph = aRnd.x * 60.0;
          p.x += sin(uTime * 0.21 + ph) * 2.0 + uWind * sin(uTime * 0.5 + ph) * 3.0;
          p.z += cos(uTime * 0.17 + ph * 1.3) * 2.0;
          p.y += sin(uTime * 0.31 + ph * 0.7) * (aRnd.z > 0.5 ? 0.6 : 1.5);
          vec4 mv = viewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
          vNight = aRnd.z;
          float blink = smoothstep(0.55, 1.0, sin(uTime * (1.1 + aRnd.w) + ph));
          vA = aRnd.z > 0.5 ? uNightA * blink : uDay * 0.55;
          float sz = aRnd.z > 0.5 ? 0.16 : 0.06;
          gl_PointSize = vA > 0.001 ? clamp(uPx * sz / -mv.z, 1.0, 10.0) : 0.0;
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uDayCol, uNightCol, uLight; varying float vA; varying float vNight;
        void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d);
          vec3 c = vNight > 0.5 ? uNightCol * 3.0 : uDayCol * uLight * 0.9; gl_FragColor = vec4(c * a * vA, 1.0); }`,
    });
    pollenMesh = new THREE.Points(track(g), track(mat)); pollenMesh.frustumCulled = false; pollenMesh.renderOrder = 12; pollenMesh.name = 'pollen';
    root.add(pollenMesh);
  }
  return { pollenU, pollenMesh };
}

export function createBirds(ctx) {
  const { U, seed, track, root } = ctx;
  // ───────────────────────────── distant birds (more with vitality)
  let birds;
  {
    const nB = 10;
    const g = new THREE.InstancedBufferGeometry();
    // simple V wing pair: body at origin, wing tips flap in shader by |x|
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.25, -1, 0, -0.1, 0, 0, -0.15, 0, 0, 0.25, 0, 0, -0.15, 1, 0, -0.1], 3));
    const a = new Float32Array(nB * 4); const rr = makeRng(seed + 1111);
    for (let i = 0; i < nB; i++) a.set([60 + rr() * 60, 32 + rr() * 26, rr() * TAU, rr()], i * 4);
    g.setAttribute('aB', new THREE.InstancedBufferAttribute(a, 4)); g.instanceCount = nB;
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: U.uTime, uCount: { value: 6 }, uCol: { value: C('#1a1a1a') }, ...THREE.UniformsLib.fog }, side: THREE.DoubleSide, fog: true,
      vertexShader: /* glsl */`uniform float uTime, uCount; attribute vec4 aB;
        #include <fog_pars_vertex>
        void main(){
          float id = float(gl_InstanceID);
          float ang = aB.z + uTime * (0.05 + aB.w * 0.04) * (mod(id, 2.0) < 1.0 ? 1.0 : -1.0);
          vec3 c = vec3(cos(ang) * aB.x, aB.y + sin(uTime * 0.3 + aB.w * 9.0) * 2.0, sin(ang) * aB.x);
          vec3 fwd = normalize(vec3(-sin(ang), 0.0, cos(ang)) * (mod(id, 2.0) < 1.0 ? 1.0 : -1.0));
          vec3 side = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
          vec3 p = position;
          p.y += abs(p.x) * sin(uTime * 6.0 + aB.w * 20.0) * 0.6;
          float sc = 0.7 + aB.w * 0.5;
          vec3 w = c + (side * p.x + fwd * p.z) * sc + vec3(0.0, p.y * sc, 0.0);
          if (id >= uCount) w = vec3(0.0, -1000.0, 0.0);
          vec4 mvPosition = viewMatrix * vec4(w, 1.0); gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */`uniform vec3 uCol;
        #include <fog_pars_fragment>
        void main(){ gl_FragColor = vec4(uCol, 1.0);
        #include <fog_fragment>
        #include <colorspace_fragment>
        }`,
    });
    birds = new THREE.Mesh(track(g), track(mat)); birds.frustumCulled = false; birds.name = 'birds';
    root.add(birds);
  }
  return { birds };
}
