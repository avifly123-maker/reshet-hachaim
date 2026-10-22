// Fire: flame and smoke billboards and embers for up to MAX_FIRES fires, and the scorch list (burnt ground patches).
// update.js feeds them from ctx.fire every frame.
// Exports: createFire(ctx) → { fireU, flames, smoke, embers, scorch }.
// Needs from ctx: U, qual, seed, puffTex, track, root.
import * as THREE from 'three';
import { makeRng } from '../../core/util.js';
import { MAX_FIRES, TAU } from './common.js';

export function createFire(ctx) {
  const { U, qual, seed, puffTex, track, root } = ctx;
  // ───────────────────────────── fire
  const fireU = {
    uTime: U.uTime, uWind: U.uWind, uLight: U.uLightCol, uNoise: U.uNoise,
    uFireA: { value: Array.from({ length: MAX_FIRES }, () => new THREE.Vector4()) }, // x,y,z,r
    uFireB: { value: Array.from({ length: MAX_FIRES }, () => new THREE.Vector4()) }, // intensity
  };
  function fireBillboards(perFire, kind) {
    const n = perFire * MAX_FIRES; const rr = makeRng(seed + (kind === 'flame' ? 808 : 909));
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const a = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { const th = rr() * TAU, r = Math.sqrt(rr()); a.set([Math.floor(i / perFire), Math.cos(th) * r, Math.sin(th) * r, rr()], i * 4); }
    g.setAttribute('aF', new THREE.InstancedBufferAttribute(a, 4));
    g.instanceCount = n;
    return g;
  }
  const flameMat = track(new THREE.ShaderMaterial({
    uniforms: fireU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      uniform float uTime, uWind; uniform vec4 uFireA[${MAX_FIRES}]; uniform vec4 uFireB[${MAX_FIRES}]; attribute vec4 aF; varying vec2 vUv2; varying float vI; varying float vLife;
      void main(){
        int s = int(aF.x + 0.5); vec4 A = uFireA[s]; float I = uFireB[s].x;
        float life = fract(uTime * (0.9 + aF.w * 0.6) + aF.w * 7.0); vLife = life;
        vec3 c = A.xyz + vec3(aF.y, 0.0, aF.z) * A.w * 0.75;
        float size = (1.2 + 1.8 * I) * (0.7 + 0.3 * A.w) * (1.0 - life * 0.5) * (0.6 + aF.w * 0.6);
        c.y += life * size * 0.9;
        c.x += uWind * life * 0.8;
        vec4 mv = viewMatrix * vec4(c, 1.0);
        mv.xy += vec2(position.x * size * 0.75, position.y * size * 1.6);
        vUv2 = position.xy + vec2(0.5, 0.0); vI = I > 0.0 ? I : 0.0;
        gl_Position = I > 0.0 ? projectionMatrix * mv : vec4(0.0, 0.0, -2.0, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime; uniform sampler2D uNoise; varying vec2 vUv2; varying float vI; varying float vLife;
      void main(){
        vec2 p = vUv2; float x = (p.x - 0.5) * 2.0;
        float n = texture2D(uNoise, vec2(p.x * 0.5, p.y * 0.4 - uTime * 0.6)).r;
        float w = (1.0 - p.y) * 0.9 + 0.1;
        float shape = smoothstep(w, w * 0.3, abs(x + (n - 0.5) * 0.5 * p.y)) * smoothstep(0.0, 0.12, p.y) * (1.0 - smoothstep(0.55, 1.0, p.y + n * 0.3));
        vec3 col = mix(vec3(1.0, 0.7, 0.3), vec3(0.95, 0.22, 0.03), smoothstep(0.05, 0.5, p.y + (1.0 - shape) * 0.35));
        float a = shape * (1.0 - vLife) * vI;
        gl_FragColor = vec4(col * a * 0.9, 1.0);
      }`,
  }));
  const smokeMat = track(new THREE.ShaderMaterial({
    uniforms: { ...fireU, uTex: { value: puffTex } }, transparent: true, depthWrite: false,
    vertexShader: /* glsl */`
      uniform float uTime, uWind; uniform vec4 uFireA[${MAX_FIRES}]; uniform vec4 uFireB[${MAX_FIRES}]; attribute vec4 aF; varying vec2 vUv2; varying float vA;
      void main(){
        int s = int(aF.x + 0.5); vec4 A = uFireA[s]; float I = uFireB[s].x;
        float life = fract(uTime * (0.08 + aF.w * 0.05) + aF.w * 3.0);
        vec3 c = A.xyz + vec3(aF.y, 0.0, aF.z) * A.w * 0.6;
        c.y += 1.5 + life * (9.0 + A.w * 2.0) * (0.6 + I * 0.6);
        c.x += life * life * (3.0 + uWind * 10.0) + sin(uTime * 0.3 + aF.w * 9.0) * life * 1.5;
        float size = (1.4 + life * 6.0) * (0.6 + 0.6 * I);
        vec4 mv = viewMatrix * vec4(c, 1.0);
        mv.xy += (position.xy - vec2(0.0, 0.5)) * size;
        vUv2 = position.xy + vec2(0.5, 0.0);
        vA = (I > 0.0 ? 1.0 : 0.0) * smoothstep(0.0, 0.15, life) * (1.0 - life) * min(I * 1.5, 1.0);
        gl_Position = I > 0.0 ? projectionMatrix * mv : vec4(0.0, 0.0, -2.0, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uTex; uniform vec3 uLight; varying vec2 vUv2; varying float vA;
      void main(){ float a = texture2D(uTex, vUv2).a; gl_FragColor = vec4(vec3(0.2, 0.19, 0.18) * (0.6 + uLight * 0.8), a * vA * 0.75); }`,
  }));
  const flames = new THREE.Mesh(track(fireBillboards(qual.flames, 'flame')), flameMat); flames.frustumCulled = false; flames.renderOrder = 25; flames.visible = false;
  const smoke = new THREE.Mesh(track(fireBillboards(Math.round(qual.flames * 1.2), "smoke")), smokeMat); smoke.frustumCulled = false; smoke.renderOrder = 24; smoke.visible = false;
  root.add(flames, smoke);
  let embers;
  {
    const per = 30, n = per * MAX_FIRES; const rr = makeRng(seed + 1010);
    const pos = new Float32Array(n * 3), a = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { const th = rr() * TAU, r = Math.sqrt(rr()); a.set([Math.floor(i / per), Math.cos(th) * r, Math.sin(th) * r, rr()], i * 4); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aF', new THREE.BufferAttribute(a, 4));
    const mat = new THREE.ShaderMaterial({
      uniforms: { ...fireU, uPx: U.uPx }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        uniform float uTime, uWind, uPx; uniform vec4 uFireA[${MAX_FIRES}]; uniform vec4 uFireB[${MAX_FIRES}]; attribute vec4 aF; varying float vA;
        void main(){
          int s = int(aF.x + 0.5); vec4 A = uFireA[s]; float I = uFireB[s].x;
          float life = fract(uTime * (0.25 + aF.w * 0.3) + aF.w * 5.0);
          vec3 c = A.xyz + vec3(aF.y, 0.0, aF.z) * A.w * 0.8;
          c.y += 0.3 + life * (5.0 + aF.w * 6.0);
          c.x += sin(uTime * 2.0 + aF.w * 40.0) * life * 1.2 + uWind * life * 4.0; c.z += cos(uTime * 1.7 + aF.w * 30.0) * life * 1.2;
          vec4 mv = viewMatrix * vec4(c, 1.0); gl_Position = projectionMatrix * mv;
          vA = (I > 0.0 ? 1.0 : 0.0) * (1.0 - life) * (0.5 + 0.5 * sin(uTime * 15.0 + aF.w * 90.0));
          gl_PointSize = vA > 0.0 ? clamp(uPx * 0.07 / -mv.z, 1.0, 6.0) : 0.0;
        }`,
      fragmentShader: /* glsl */`varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(1.0, 0.5, 0.12) * 3.0 * smoothstep(0.5, 0.0, d) * vA, 1.0); }`,
    });
    embers = new THREE.Points(track(g), track(mat)); embers.frustumCulled = false; embers.renderOrder = 26; embers.visible = false;
    root.add(embers);
  }
  const scorch = []; // {x,z,r,a}
  return { fireU, flames, smoke, embers, scorch };
}
