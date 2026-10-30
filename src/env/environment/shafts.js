// Light shafts (god rays through canopy gaps: three nested beams per shaft) and the dust motes floating inside them.
// update.js places them from ctx.shafts every frame.
// Exports: createShafts(ctx) → { shaftU, shaftGeo, shaftData, shaftMesh, moteU, moteMesh }.
// Needs from ctx: U, track, root, qual, seed.
import * as THREE from 'three';
import { makeRng } from '../../core/util.js';
import { MAX_SHAFTS, TAU, C, V3, K } from './common.js';

export function createShafts(ctx) {
  const { U, track, root, qual, seed } = ctx;
  // ───────────────────────────── light shafts (god rays)
  const shaftU = {
    uTime: U.uTime, uNoise: U.uNoise, uCol: { value: C('#fff0c8') }, uGlobal: { value: 1 },
  };
  const shaftGeo = track(new THREE.CylinderGeometry(1, 1, 1, 20, 1, true));
  shaftGeo.translate(0, -0.5, 0);  // y ∈ [-1, 0]
  const shaftData = new Float32Array(MAX_SHAFTS * 3 * 3);
  shaftGeo.setAttribute('aShaft', new THREE.InstancedBufferAttribute(shaftData, 3));
  const shaftMat = track(new THREE.ShaderMaterial({
    uniforms: shaftU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: /* glsl */`
      attribute vec3 aShaft; // strength, layer, seed
      const float edgeR0 = ${(42.5 * K).toFixed(2)}; varying float vWr;
      varying float vT; varying float vFace; varying float vStr; varying float vLayer; varying vec2 vN; varying float vDist; varying float vInside;
      void main(){
        vec3 p = position;
        { // camera inside this beam? (view both walls → fade)
          vec3 o = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          vec3 ax = normalize(mat3(modelMatrix * instanceMatrix) * vec3(0.0, 1.0, 0.0));
          float rad = length((modelMatrix * instanceMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
          vec3 oc = cameraPosition - o; vec3 perp = oc - ax * dot(oc, ax);
          vInside = 1.0 - smoothstep(rad * 0.8, rad * 1.6, length(perp));
        }
        float t = -p.y; vT = t;
        p.xz *= mix(1.0, 1.35, t);
        vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.0);
        vec3 nW = normalize(mat3(modelMatrix * instanceMatrix) * vec3(position.x, 0.0, position.z));
        vec3 V = normalize(cameraPosition - w.xyz);
        vec3 axis = normalize(mat3(modelMatrix * instanceMatrix) * vec3(0.0, 1.0, 0.0));
        vec3 Vp = normalize(V - axis * dot(V, axis));
        vFace = abs(dot(nW, Vp));
        vStr = aShaft.x; vLayer = aShaft.y;
        vN = vec2(atan(position.z, position.x) * 0.5 + aShaft.z * 7.0, t);
        vec4 mv = viewMatrix * w; vDist = -mv.z; vWr = length(w.xz) - (edgeR0 + 1.5);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uGlobal; uniform sampler2D uNoise; uniform vec3 uCol;
      varying float vT; varying float vFace; varying float vStr; varying float vLayer; varying vec2 vN; varying float vDist; varying float vInside; varying float vWr;
      void main(){
        if (vWr > 3.0) discard;
        float edge = pow(vFace, vLayer < 0.5 ? 2.2 : vLayer < 1.5 ? 1.6 : 1.2);
        float ends = smoothstep(0.0, 0.12, vT) * (1.0 - smoothstep(0.75, 1.0, vT) * 0.55);
        float n = texture2D(uNoise, vec2(vN.x * 0.22 + uTime * 0.004, vN.y * 0.12 - uTime * 0.006)).b;
        float n2 = texture2D(uNoise, vec2(vN.x * 0.45 + 0.2, vN.y * 0.25 + uTime * 0.01)).g;
        float streak = 0.6 + 0.65 * smoothstep(0.25, 0.85, n * 0.75 + n2 * 0.35);
        float layerA = vLayer < 0.5 ? 0.24 : vLayer < 1.5 ? 0.1 : 0.035;
        float near = smoothstep(2.0, 14.0, vDist) * (0.4 + 0.6 * smoothstep(12.0, 45.0, vDist)) * (1.0 - 0.8 * vInside);
        edge *= mix(1.0, edge, 1.0 - smoothstep(10.0, 40.0, vDist)); // crisper beams up close
        float a = edge * ends * streak * layerA * vStr * uGlobal * near * (1.0 - smoothstep(-2.0, 3.0, vWr));
        vec3 col = mix(uCol, uCol * vec3(1.0, 0.92, 0.75), vT);
        gl_FragColor = vec4(col * a, 1.0);
      }`,
  }));
  const shaftMesh = new THREE.InstancedMesh(shaftGeo, shaftMat, MAX_SHAFTS * 3);
  shaftMesh.count = 0; shaftMesh.frustumCulled = false; shaftMesh.renderOrder = 10; shaftMesh.name = 'light-shafts';
  root.add(shaftMesh);

  // dust motes inside shafts
  const MOTES = qual.motes;
  const moteU = {
    uTime: U.uTime, uPx: U.uPx, uCol: shaftU.uCol, uGlobal: shaftU.uGlobal, uDir: { value: V3(0, -1, 0) },
    uTop: { value: Array.from({ length: MAX_SHAFTS }, () => new THREE.Vector4()) },
    uInfo: { value: Array.from({ length: MAX_SHAFTS }, () => new THREE.Vector4()) },
  };
  let moteMesh;
  {
    const n = MAX_SHAFTS * MOTES; const rr = makeRng(seed + 404);
    const slot = new Float32Array(n), rnd = new Float32Array(n * 4), pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { slot[i] = Math.floor(i / MOTES); rnd[i * 4] = rr(); rnd[i * 4 + 1] = rr() * TAU; rnd[i * 4 + 2] = Math.sqrt(rr()); rnd[i * 4 + 3] = rr(); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSlot', new THREE.BufferAttribute(slot, 1));
    g.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 4));
    const mat = new THREE.ShaderMaterial({
      uniforms: moteU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        uniform float uTime, uPx; uniform vec3 uDir; uniform vec4 uTop[${MAX_SHAFTS}]; uniform vec4 uInfo[${MAX_SHAFTS}];
        attribute float aSlot; attribute vec4 aRnd; varying float vA;
        void main(){
          int s = int(aSlot + 0.5);
          vec4 top = uTop[s]; vec4 info = uInfo[s];
          float L = info.x; float str = info.y;
          float u = fract(aRnd.x + uTime * (0.004 + aRnd.w * 0.006));
          vec3 ax = uDir;
          vec3 b1 = normalize(cross(ax, abs(ax.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
          vec3 b2 = cross(ax, b1);
          float ang = aRnd.y + uTime * (0.05 + 0.1 * aRnd.w) + sin(uTime * 0.3 + aRnd.w * 20.0) * 0.4;
          float rad = aRnd.z * top.w * mix(1.0, 1.35, u) * 0.9;
          vec3 p = top.xyz + ax * (L * u) + (b1 * cos(ang) + b2 * sin(ang)) * rad;
          p.y += sin(uTime * 0.7 + aRnd.w * 30.0) * 0.25;
          vec4 mv = viewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float tw = 0.5 + 0.5 * sin(uTime * (1.0 + aRnd.w * 3.0) + aRnd.x * 40.0);
          vA = str * (0.35 + 0.65 * tw) * smoothstep(0.0, 0.1, u) * (1.0 - smoothstep(0.85, 1.0, u)) * smoothstep(0.8, 3.0, -mv.z);
          gl_PointSize = (str > 0.0 ? 1.0 : 0.0) * clamp(uPx * (0.05 + 0.05 * aRnd.w) / -mv.z, 1.0, 14.0);
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uCol; uniform float uGlobal; varying float vA;
        void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(uCol * 1.6 * a * vA * uGlobal, 1.0); }`,
    });
    moteMesh = new THREE.Points(track(g), track(mat)); moteMesh.frustumCulled = false; moteMesh.renderOrder = 11; moteMesh.name = 'motes';
    root.add(moteMesh);
  }
  return { shaftU, shaftGeo, shaftData, shaftMesh, moteU, moteMesh };
}
