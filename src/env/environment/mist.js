// Mist: the sea of clouds below the island (two layers, created right after the far land) and the billboard mist banks
// over and around the island (created later, after the ambient particles: index.js keeps that order).
// Exports: createMistSea(ctx) → { mistSeaU, mistSea, mistSea2 }; createMistBanks(ctx) → { mistU, mistMesh }.
// Needs from ctx: U, isAmazon, track, root; the banks also puffTex, seed, qual, heightAt, waterfall, riverExit.
import * as THREE from 'three';
import { makeRng } from '../../core/util.js';
import { TAU, C, V3 } from './common.js';

export function createMistSea(ctx) {
  const { U, isAmazon, track, root } = ctx;
  // ───────────────────────────── sea of mist below
  const mistSeaU = {
    uTime: U.uTime, uNoise: U.uNoise, uLit: { value: C('#fff') }, uShade: { value: C('#99a') }, uDensity: { value: 0.5 },
    uSunDir: U.uSunDir, uSunCol: U.uSunCol, uIsland: { value: V3(0, 0, 44) },
    ...THREE.UniformsLib.fog,
  };
  const makeMistSeaMat = (extra) => track(new THREE.ShaderMaterial({
    uniforms: { ...mistSeaU, ...extra }, transparent: true, depthWrite: false, fog: true,
    vertexShader: /* glsl */`varying vec3 vW; #include <fog_pars_vertex>
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition; #include <fog_vertex> }`.replace(/#include <fog_pars_vertex>/, '\n#include <fog_pars_vertex>\n').replace(/#include <fog_vertex>/, '\n#include <fog_vertex>\n'),
    fragmentShader: /* glsl */`
      uniform float uTime, uDensity; uniform sampler2D uNoise; uniform vec3 uLit, uShade, uSunDir, uSunCol; varying vec3 vW;
      #include <fog_pars_fragment>
      uniform vec3 uIsland; // x,z of island shadow centre, radius
      uniform float uOuter, uDensAdd;
      float field(vec2 p){
        vec2 q = p * 0.0032 + vec2(uTime * 0.0009, uTime * 0.0004);
        return texture2D(uNoise, q).b * 0.75
             + texture2D(uNoise, q * 2.1 + 0.37).a * 0.3
             + texture2D(uNoise, q * 5.3 - vec2(uTime * 0.002, 0.0)).g * 0.12;
      }
      void main(){
        float h = field(vW.xz);
        float e = 4.0;
        float hx = field(vW.xz + vec2(e, 0.0)) - h, hz = field(vW.xz + vec2(0.0, e)) - h;
        vec3 N = normalize(vec3(-hx * 45.0, 1.0, -hz * 45.0));
        float lo = 0.86 - (uDensity + uDensAdd) * 0.5;
        float d = smoothstep(lo, lo + 0.12, h);
        float r = length(vW.xz);
        d *= smoothstep(36.0, 64.0, r) * (1.0 - smoothstep(uOuter * 0.55, uOuter, r));
        float lit = clamp(dot(N, normalize(uSunDir + vec3(0.0, 0.25, 0.0))) * 0.6 + 0.45, 0.0, 1.0);
        float thick = smoothstep(lo, lo + 0.35, h);
        vec3 col = mix(uShade, uLit, lit * (0.4 + 0.6 * thick));
        // island shadow cast on the clouds
        float sh = 1.0 - smoothstep(uIsland.z * 0.55, uIsland.z * 1.15, length(vW.xz - uIsland.xy));
        col *= 1.0 - 0.38 * sh;
        col += uSunCol * pow(max(dot(normalize(vec3(vW.x, 40.0, vW.z)), uSunDir), 0.0), 8.0) * 0.06;
        gl_FragColor = vec4(col, d * (0.75 + 0.25 * thick));
        #include <fog_fragment>
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  const mistSeaGeo = track(new THREE.CircleGeometry(480, 64)); mistSeaGeo.rotateX(-Math.PI / 2);
  const mistSeaMat = makeMistSeaMat({ uOuter: { value: 2000 }, uDensAdd: { value: 0 } });
  const mistSeaMat2 = makeMistSeaMat({ uOuter: { value: 120 }, uDensAdd: { value: 0.12 } });
  const mistSea = new THREE.Mesh(mistSeaGeo, mistSeaMat); mistSea.position.y = isAmazon ? -30 : -29; mistSea.renderOrder = 2; mistSea.name = 'mist-sea';
  root.add(mistSea);
  // second, higher thin layer that wraps the island's base
  const mistSea2 = new THREE.Mesh(mistSeaGeo, mistSeaMat2); mistSea2.position.y = isAmazon ? -24 : -22; mistSea2.scale.setScalar(0.26); mistSea2.renderOrder = 3; mistSea2.name = 'mist-sea2';
  root.add(mistSea2);
  return { mistSeaU, mistSea, mistSea2 };
}

export function createMistBanks(ctx) {
  const { U, puffTex, seed, isAmazon, qual, heightAt, waterfall, riverExit, track, root } = ctx;
  // ───────────────────────────── mist banks (billboards)
  let mistMesh; const mistU = { uTime: U.uTime, uTex: { value: puffTex }, uCol: { value: C('#fff') }, uAmt: { value: 0.3 }, ...THREE.UniformsLib.fog };
  {
    const rr = makeRng(seed + 606);
    const items = [];
    const nm = isAmazon ? qual.mist : Math.ceil(qual.mist * 0.6);
    for (let i = 0; i < nm; i++) {
      const th = rr() * TAU; const r = 8 + rr() * 34; const x = Math.cos(th) * r, z = Math.sin(th) * r;
      items.push([x, heightAt(x, z) + 1.5 + rr() * 5, z, 10 + rr() * 16, rr(), 1]);
    }
    // wreath of mist hugging the island's base / below rim
    for (let i = 0; i < Math.ceil(nm * 0.6); i++) {
      const th = rr() * TAU; const r = 30 + rr() * 22; items.push([Math.cos(th) * r, -6 - rr() * 16, Math.sin(th) * r, 18 + rr() * 20, rr(), 2]);
    }
    if (waterfall) for (let i = 0; i < 6; i++) {
      const E = riverExit; const o = 2 + rr() * 4;
      items.push([E.x + E.dir.x * o + (rr() - 0.5) * 6, -12 - rr() * 18, E.z + E.dir.z * o + (rr() - 0.5) * 6, 7 + rr() * 8, rr(), 3]);
    }
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const a = new Float32Array(items.length * 4), b = new Float32Array(items.length * 2);
    items.forEach((it, i) => { a.set(it.slice(0, 4), i * 4); b[i * 2] = it[4]; b[i * 2 + 1] = it[5]; });
    g.setAttribute('aC', new THREE.InstancedBufferAttribute(a, 4));
    g.setAttribute('aR', new THREE.InstancedBufferAttribute(b, 2));
    g.instanceCount = items.length;
    const mat = new THREE.ShaderMaterial({
      uniforms: mistU, transparent: true, depthWrite: false, fog: true,
      vertexShader: /* glsl */`
        uniform float uTime; attribute vec4 aC; attribute vec2 aR; varying vec2 vUv2; varying float vKind; varying float vR;
        #include <fog_pars_vertex>
        void main(){
          vec3 c = aC.xyz;
          float sp = aR.y > 2.5 ? 0.0 : 1.0;
          c.x += sin(uTime * 0.02 + aR.x * 30.0) * 6.0 * sp; c.z += cos(uTime * 0.017 + aR.x * 20.0) * 6.0 * sp;
          if (aR.y > 2.5) c.y += fract(uTime * 0.05 + aR.x) * 4.0;
          vec4 mvPosition = viewMatrix * vec4(c, 1.0);
          mvPosition.xy += position.xy * aC.w * vec2(1.6, 0.8);
          vUv2 = position.xy + 0.5; vKind = aR.y; vR = aR.x;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */`
        uniform sampler2D uTex; uniform vec3 uCol; uniform float uAmt; varying vec2 vUv2; varying float vKind; varying float vR;
        #include <fog_pars_fragment>
        void main(){
          float a = texture2D(uTex, vUv2).a;
          float k = vKind < 1.5 ? uAmt : vKind < 2.5 ? (0.25 + uAmt * 0.5) : 0.55;
          gl_FragColor = vec4(uCol, a * k * 0.5);
          #include <fog_fragment>
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    mistMesh = new THREE.Mesh(track(g), track(mat)); mistMesh.frustumCulled = false; mistMesh.renderOrder = 20; mistMesh.name = 'mist';
    root.add(mistMesh);
  }
  return { mistU, mistMesh };
}
