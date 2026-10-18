// Environment of the reef zone (1.3): a floating "cube of sea" – the coral reef of the Gulf of Eilat as a diorama.
// Same contract as createEnvironment (CONTRACT.md §2), so the game, the light model, placement and the animals work
// unchanged: the sea floor is the "ground" (placeable, never isWater), the water column above it is only a look.
//   - sea floor: white sand, a raised reef crest along the north side and reef-rock mounds (env.rocks), with moving
//     caustics (sunlight focused by the waves) drawn in its shader
//   - the water: a glassy column with a depth gradient, a wavy surface with a sun glint, light rays from the surface,
//     rising bubbles and drifting plankton motes that glow blue at night
//   - below: the island's base of sandstone and reef rock, floating over a sea of mist like the other zones
//   - events: drought / heat → warm, paler water; flood → murky water (mud from a desert flood); rain → a rougher surface
import * as THREE from 'three';
import { REEF_ROCKS } from '../models/reef-plants.js';
import { GROUND_TEX } from '../data/ground-textures.js';
import { makeRng, makeNoise2D, clamp, lerp, smoothstep, damp } from '../core/util.js';

const R = 38;            // placeable radius (contract)
const EDGE = 44;         // visual radius of the sea floor
export const REEF_SURFACE = 15;   // y of the water surface
const BOTTOM = -3.2;     // where the sea floor meets the island's base at the rim
const TAU = Math.PI * 2;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const Q = {
  min: { seg: 72, rings: 26, bubbles: 40, motes: 120 },
  low: { seg: 96, rings: 34, bubbles: 80, motes: 220 },
  medium: { seg: 144, rings: 48, bubbles: 160, motes: 420 },
  high: { seg: 220, rings: 70, bubbles: 280, motes: 800 },
};

export function createReefEnvironment(pipeline, { quality = 'medium', seed = 5 } = {}) {
  const scene = pipeline.scene;
  const qual = Q[quality] || Q.medium;
  const rng = makeRng(seed * 7919 + 41);
  const noise = makeNoise2D(seed * 31 + 13);
  const noiseB = makeNoise2D(seed * 57 + 29);
  const root = new THREE.Group(); root.name = 'environment-reef';
  scene.add(root);
  const disposables = [];
  const track = (x) => { disposables.push(x); return x; };
  const U = { uTime: { value: 0 }, uCaust: { value: 1 }, uMurk: { value: 0 }, uWarm: { value: 0 }, uNight: { value: 0 },
    uOverlay: { value: null }, uOverlayOn: { value: 0 }, uR: { value: R }, uSunDir: { value: V3(0, 1, 0) } };

  // ───────────────────────────── the sea floor
  // reef-rock mounds: where morays, octopuses and urchins hide; also env.rocks for the game
  const mounds = [];
  for (let i = 0; i < 9; i++) {
    for (let k = 0; k < 30; k++) {
      const a = rng() * TAU, rr = 8 + rng() * 26;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      if (mounds.some((m) => Math.hypot(m.x - x, m.z - z) < m.r + 6)) continue;
      mounds.push({ x, z, r: 2.4 + rng() * 2.2, h: 1.1 + rng() * 1.3 }); break;
    }
  }
  const crest = (x, z) => smoothstep(-2, -22, z) * (0.75 + 0.25 * noise(x * 0.08, z * 0.08));   // the reef crest to the north
  function moundAt(x, z) {
    let h = 0;
    for (const m of mounds) { const d = Math.hypot(x - m.x, z - m.z) / m.r; if (d < 1.4) h = Math.max(h, m.h * Math.pow(clamp(1 - d * d / 1.96), 1.4)); }
    return h;
  }
  function rawHeight(x, z) {
    const r = Math.hypot(x, z);
    let h = -0.4 + 0.35 * noise(x * 0.06, z * 0.06) + 0.18 * noiseB(x * 0.21, z * 0.21);
    h += 2.6 * crest(x, z) + 0.5 * crest(x, z) * noiseB(x * 0.3, z * 0.3);
    h += moundAt(x, z);
    // ripples in the sand
    h += 0.05 * Math.sin(x * 1.3 + z * 0.4 + noise(x * 0.1, z * 0.1) * 3) * (1 - crest(x, z));
    // the rim drops to the island's base
    h = lerp(h, BOTTOM, smoothstep(EDGE - 5, EDGE, r));
    return h;
  }
  const heightAt = (x, z) => rawHeight(x, z);
  const rocks = mounds.map((m) => ({ x: m.x, z: m.z, r: m.r * 0.75, top: rawHeight(m.x, m.z) }));
  const onRock = (x, z) => mounds.some((m) => Math.hypot(x - m.x, z - m.z) < m.r * 0.55);

  // a polar grid (fine near the middle, where the camera looks most)
  function buildFloor() {
    const segs = qual.seg, rings = qual.rings;
    const pos = [], col = [], idx = [];
    const sand = new THREE.Color('#f2dfb4'), sand2 = new THREE.Color('#e2c898'), rock = new THREE.Color('#9a8270'),
      rock2 = new THREE.Color('#b8706c'), algae = new THREE.Color('#6f8446'), c = new THREE.Color();
    const rk = [];
    pos.push(0, heightAt(0, 0), 0); c.copy(sand); col.push(c.r, c.g, c.b); rk.push(0);
    for (let i = 1; i <= rings; i++) {
      const rr = EDGE * Math.pow(i / rings, 1.15);
      for (let j = 0; j < segs; j++) {
        const a = (j / segs) * TAU, x = Math.cos(a) * rr, z = Math.sin(a) * rr, y = heightAt(x, z);
        pos.push(x, y, z);
        const rockness = clamp(moundAt(x, z) * 0.9 + crest(x, z) * 0.85 + 0.25 * noiseB(x * 0.4, z * 0.4));
        c.copy(sand).lerp(sand2, clamp(0.5 + 0.5 * noise(x * 0.25, z * 0.25)) * 0.6);
        c.lerp(rock, smoothstep(0.25, 0.6, rockness));
        c.lerp(rock2, smoothstep(0.55, 0.95, rockness) * clamp(0.5 + 0.5 * noiseB(x * 0.5, z * 0.5)) * 0.7);   // pink coralline crust
        c.lerp(algae, smoothstep(0.45, 0.8, rockness) * clamp(noise(x * 0.7 + 3, z * 0.7)) * 0.35);
        col.push(c.r, c.g, c.b); rk.push(smoothstep(0.2, 0.55, rockness));
      }
    }
    for (let j = 0; j < segs; j++) idx.push(0, 1 + ((j + 1) % segs), 1 + j);
    for (let i = 1; i < rings; i++) {
      const a0 = 1 + (i - 1) * segs, b0 = 1 + i * segs;
      for (let j = 0; j < segs; j++) {
        const j1 = (j + 1) % segs;
        idx.push(a0 + j, a0 + j1, b0 + j1, a0 + j, b0 + j1, b0 + j);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('aRock', new THREE.Float32BufferAttribute(rk, 1));
    g.setIndex(idx); g.computeVertexNormals();
    return track(g);
  }
  // the sea-floor textures baked in Blender (tools/blender/reef_ground.py): white rippled sand, and coral rubble on the rock
  const GT = { uGA: { value: null }, uGAn: { value: null }, uGB: { value: null }, uGBn: { value: null }, uGOn: { value: 0 },
    uGAvgA: { value: new THREE.Color(0.5, 0.5, 0.5) }, uGAvgB: { value: new THREE.Color(0.5, 0.5, 0.5) }, uGTile: { value: new THREE.Vector2(3, 3) }, uGNk: { value: 1 } };
  {
    const gt = GROUND_TEX && GROUND_TEX.reef;
    if (gt && gt.a && gt.an && gt.b && gt.bn && quality !== 'min') {
      const ld = new THREE.TextureLoader(); let n = 0; const done = () => { if (++n === 4) GT.uGOn.value = 1; };
      const mk = (url, srgb) => { const t = ld.load(url, done); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return track(t); };
      GT.uGA.value = mk(gt.a, true); GT.uGAn.value = mk(gt.an, false); GT.uGB.value = mk(gt.b, true); GT.uGBn.value = mk(gt.bn, false);
      GT.uGAvgA.value.setRGB(...gt.avgA); GT.uGAvgB.value.setRGB(...gt.avgB); GT.uGTile.value.set(gt.tile[0], gt.tile[1]); GT.uGNk.value = gt.nk ?? 1;
    }
  }
  const floorMat = track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }));
  floorMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uTime: U.uTime, uCaust: U.uCaust, uMurk: U.uMurk, uOverlay: U.uOverlay, uOverlayOn: U.uOverlayOn, uR: U.uR }, GT);
    sh.vertexShader = 'attribute float aRock; varying float vRock; varying vec3 vWPos; varying vec3 vWNrm;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz; vRock = aRock; vWNrm = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = `varying vec3 vWPos; varying vec3 vWNrm; varying float vRock; uniform float uTime, uCaust, uMurk, uOverlayOn, uR; uniform sampler2D uOverlay;
      uniform sampler2D uGA, uGAn, uGB, uGBn; uniform float uGOn, uGNk; uniform vec3 uGAvgA, uGAvgB; uniform vec2 uGTile;
      const mat2 GROT = mat2(0.8, -0.6, 0.6, 0.8);
      vec4 gS(sampler2D t, vec2 p) { return mix(texture2D(t, p), texture2D(t, GROT * p * 0.41 + 0.31), 0.38); }
      vec3 gN(sampler2D t, vec2 p) { vec3 a = texture2D(t, p).xyz * 2.0 - 1.0; vec3 b = texture2D(t, GROT * p * 0.41 + 0.31).xyz * 2.0 - 1.0; b.xy = b.xy * GROT; return normalize(mix(a, b, 0.38)); }
      // caustics: the bright net of light that waves focus onto the sea floor – the edges of moving Voronoi cells
      vec2 h2(vec2 p) { p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
      float caust(vec2 p, float t) {
        p *= 1.05; p += 0.35 * sin(p.yx * 1.3 + t * 0.4); vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
        for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
          vec2 g = vec2(float(x), float(y)); vec2 o = h2(i + g); o = 0.5 + 0.45 * sin(t * 0.9 + 6.2831 * o);
          float d = length(g + o - f); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
        }
        return pow(1.0 - smoothstep(0.0, 0.07, d2 - d1), 3.0);
      }\n` + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        if (uGOn > 0.5) {
          vec3 ta = gS(uGA, vWPos.xz / uGTile.x).rgb / max(uGAvgA, vec3(0.02)), tb = gS(uGB, vWPos.xz / uGTile.y).rgb / max(uGAvgB, vec3(0.02));
          diffuseColor.rgb *= mix(ta, tb, vRock);
        }
        if (uOverlayOn > 0.5) {
          vec2 ouv = (vWPos.xz + uR) / (2.0 * uR);
          float inside = 1.0 - smoothstep(uR - 1.5, uR + 1.0, length(vWPos.xz));
          vec4 o = texture2D(uOverlay, clamp(ouv, 0.0, 1.0));
          diffuseColor.rgb = mix(diffuseColor.rgb, o.rgb * 0.9, o.a * inside * 0.6);
        }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        if (uGOn > 0.5) {
          vec3 nm = normalize(mix(gN(uGAn, vWPos.xz / uGTile.x), gN(uGBn, vWPos.xz / uGTile.y), vRock));
          nm.xy *= uGNk;
          vec3 Ng = normalize(vWNrm), T = normalize(cross(vec3(0.0, 0.0, 1.0), Ng)), Bt = cross(Ng, T);
          vec3 nw = normalize(T * nm.x + Bt * nm.y + Ng * nm.z);
          normal = normalize((viewMatrix * vec4(nw, 0.0)).xyz);
        }`)
      .replace('#include <dithering_fragment>', `
        float cs = caust(vWPos.xz, uTime) * 0.6 + caust(vWPos.xz * 1.45 + 3.1, uTime * 1.21) * 0.45;
        gl_FragColor.rgb += vec3(0.8, 0.97, 1.0) * cs * uCaust * 0.22 * (1.0 - uMurk * 0.85);
        // sea water takes the red out of the light: the floor reads blue-green, deeper spots more so
        float dep = clamp((${REEF_SURFACE.toFixed(1)} - vWPos.y) / 18.0, 0.0, 1.0);
        gl_FragColor.rgb *= mix(vec3(1.0), vec3(0.82, 0.92, 1.0), 0.3 + 0.3 * dep);
        #include <dithering_fragment>`);
  };
  const floor = new THREE.Mesh(buildFloor(), floorMat);
  floor.receiveShadow = true; floor.name = 'reef-floor';
  root.add(floor);

  // ───────────────────────────── reef-rock boulders on the mounds (Blender, tools/blender/reef_flora.py 'reefrock')
  const rockShapes = REEF_ROCKS();
  const rockMeshes = [];
  if (rockShapes.length) {
    const rmat = track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }));
    mounds.forEach((m, i) => {
      const sh = rockShapes[i % rockShapes.length];
      const o = new THREE.Mesh(sh.geo, rmat);
      const k = m.r / 1.35;   // the model is about 1.3 m across
      o.scale.set(k * (0.9 + 0.2 * rng()), Math.max(0.6, m.h * 0.9), k * (0.9 + 0.2 * rng()));
      o.rotation.y = rng() * TAU;
      o.position.set(m.x, heightAt(m.x, m.z) - m.h * 0.55, m.z);
      o.castShadow = true; o.receiveShadow = true; o.name = 'reef-rock';
      root.add(o); rockMeshes.push(o);
    });
  }

  // ───────────────────────────── the island's base (sandstone and reef rock under the sea floor)
  {
    const prof = [];
    const n = 22;
    for (let i = 0; i <= n; i++) {
      const t = i / n, y = lerp(BOTTOM + 0.1, -30, Math.pow(t, 1.15));
      const rr = EDGE * (1 - Math.pow(t, 1.7)) + 1.2 * t;
      prof.push(new THREE.Vector2(Math.max(0.5, rr), y));
    }
    const g = track(new THREE.LatheGeometry(prof, qual.seg));
    const p = g.attributes.position, colA = [], c = new THREE.Color();
    const sandC = new THREE.Color('#d7c39a'), stone = new THREE.Color('#9c8268'), deep = new THREE.Color('#5f4c3e'), pink = new THREE.Color('#b47c76');
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x);
      const jag = 0.9 * noise(a * 3, y * 0.25) + 0.4 * noiseB(a * 9, y * 0.6);
      const rr = Math.hypot(x, z); if (rr > 0.6) { const k = (rr + jag) / rr; p.setX(i, x * k); p.setZ(i, z * k); }
      const d = clamp((BOTTOM - y) / 26);
      c.copy(sandC).lerp(stone, smoothstep(0.02, 0.18, d)).lerp(deep, smoothstep(0.4, 1, d));
      c.lerp(pink, 0.35 * smoothstep(0.1, 0.3, d) * smoothstep(0.5, 0.3, d) * clamp(0.5 + noise(a * 5, y * 0.5)));
      const band = 0.5 + 0.5 * Math.sin(y * 1.7 + noise(a * 2, y * 0.2) * 2);
      c.multiplyScalar(0.9 + 0.12 * band);
      colA.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colA, 3));
    g.computeVertexNormals();
    const base = new THREE.Mesh(g, track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })));
    base.castShadow = true; base.receiveShadow = true; base.name = 'reef-base';
    root.add(base);
  }

  // ───────────────────────────── the water column
  const waterU = { uTime: U.uTime, uDeep: { value: new THREE.Color('#0d4f78') }, uShallow: { value: new THREE.Color('#3fc3d6') },
    uSunDir: U.uSunDir, uSunCol: { value: new THREE.Color('#ffffff') }, uMurk: U.uMurk, uWarm: U.uWarm, uNight: U.uNight, uRough: { value: 0.2 } };
  const wallH = REEF_SURFACE - BOTTOM;
  const wallGeo = track(new THREE.CylinderGeometry(EDGE + 0.25, EDGE + 0.25, wallH, qual.seg, 1, true));
  wallGeo.translate(0, BOTTOM + wallH / 2, 0);
  const wallMat = track(new THREE.ShaderMaterial({
    uniforms: waterU, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: /* glsl */`varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`uniform vec3 uDeep, uShallow; uniform float uTime, uMurk, uWarm, uNight; varying vec3 vW; varying vec3 vN;
      void main(){
        float h = clamp((vW.y - (${BOTTOM.toFixed(2)})) / ${wallH.toFixed(2)}, 0.0, 1.0);
        vec3 c = mix(uDeep, uShallow, pow(h, 1.4));
        c = mix(c, vec3(0.42, 0.38, 0.22), uMurk * 0.55);
        c = mix(c, c * vec3(1.08, 1.02, 0.86), uWarm * 0.5);
        c *= mix(1.0, 0.28, uNight);
        vec3 V = normalize(cameraPosition - vW);
        float fr = pow(1.0 - abs(dot(V, vN)), 2.0);
        float band = 0.5 + 0.5 * sin(vW.y * 2.4 + uTime * 0.8 + atan(vW.z, vW.x) * 6.0);
        float a = 0.07 + 0.2 * fr + 0.04 * band * h + uMurk * 0.25;
        // the rim line at the top: a bright edge like a glass tank
        a += smoothstep(0.985, 1.0, h) * 0.35;
        gl_FragColor = vec4(c + smoothstep(0.985, 1.0, h) * 0.25, clamp(a, 0.0, 0.85));
      }`,
  }));
  const wall = new THREE.Mesh(wallGeo, wallMat); wall.renderOrder = 2; wall.name = 'reef-water-wall';
  root.add(wall);

  const surfGeo = track(new THREE.CircleGeometry(EDGE + 0.25, qual.seg));
  surfGeo.rotateX(-Math.PI / 2); surfGeo.translate(0, REEF_SURFACE, 0);
  const surfMat = track(new THREE.ShaderMaterial({
    uniforms: waterU, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: /* glsl */`varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`uniform vec3 uShallow, uSunDir, uSunCol; uniform float uTime, uMurk, uNight, uRough; varying vec3 vW;
      vec2 wave(vec2 p, float t){
        return vec2(sin(p.x*0.45 + t*1.1) + sin(p.x*0.9 + p.y*0.6 - t*1.6)*0.5 + sin(p.y*1.7 + t*2.3)*0.25*uRough*4.0,
                    cos(p.y*0.5 - t*1.2) + cos(p.y*1.1 - p.x*0.7 + t*1.4)*0.5 + cos(p.x*1.9 - t*2.1)*0.25*uRough*4.0);
      }
      void main(){
        vec2 w = wave(vW.xz, uTime) * (0.08 + uRough * 0.25);
        vec3 N = normalize(vec3(w.x, 1.0, w.y));
        vec3 V = normalize(cameraPosition - vW);
        float fr = 0.25 + 0.75 * pow(1.0 - max(dot(N, V), 0.0), 3.0);
        vec3 H = normalize(V + uSunDir);
        float spec = pow(max(dot(N, H), 0.0), 140.0) * smoothstep(-0.05, 0.2, uSunDir.y);
        vec3 c = mix(uShallow * 1.05, vec3(0.85, 0.95, 1.0), fr * 0.5);
        c = mix(c, vec3(0.45, 0.4, 0.25), uMurk * 0.5);
        c *= mix(1.0, 0.25, uNight);
        float edge = 1.0 - smoothstep(${(EDGE - 0.6).toFixed(1)}, ${(EDGE + 0.2).toFixed(1)}, length(vW.xz));
        gl_FragColor = vec4(c + uSunCol * spec * 2.2, (0.04 + fr * 0.3 + spec * 0.5 + uMurk * 0.3) * edge);
      }`,
  }));
  const surface = new THREE.Mesh(surfGeo, surfMat); surface.renderOrder = 3; surface.name = 'reef-surface';
  root.add(surface);

  // light rays from the surface, swaying with the waves
  const rayU = { uTime: U.uTime, uAmt: { value: 1 }, uCol: { value: new THREE.Color('#d8f6ff') } };
  const rayGeo = track(new THREE.CylinderGeometry(1, 1.8, 1, 10, 1, true)); rayGeo.translate(0, -0.5, 0);
  const rayMat = track(new THREE.ShaderMaterial({
    uniforms: rayU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: /* glsl */`varying float vY; varying vec2 vUv2; void main(){ vY = -position.y; vUv2 = uv; vec4 w = modelMatrix * instanceMatrix * vec4(position,1.0); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`uniform float uTime, uAmt; uniform vec3 uCol; varying float vY; varying vec2 vUv2;
      void main(){ float s = 0.5 + 0.5 * sin(vUv2.x * 40.0 + uTime * 0.7); float a = (1.0 - vY) * smoothstep(0.0, 0.25, vY) * 0.08 * uAmt * (0.6 + 0.4 * s);
        gl_FragColor = vec4(uCol * a, a); }`,
  }));
  const NRAYS = quality === 'min' ? 4 : 9;
  const rays = new THREE.InstancedMesh(rayGeo, rayMat, NRAYS); rays.frustumCulled = false; rays.renderOrder = 4;
  const rayInfo = [];
  for (let i = 0; i < NRAYS; i++) { const a = rng() * TAU, rr = 4 + rng() * 26; rayInfo.push({ x: Math.cos(a) * rr, z: Math.sin(a) * rr, w: 1.4 + rng() * 2.2, ph: rng() * TAU }); }
  root.add(rays);
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _e = new THREE.Euler();

  // bubbles and plankton motes (points)
  function points(n, make, mat) {
    const g = track(new THREE.BufferGeometry()); const a = new Float32Array(n * 3), b = new Float32Array(n);
    for (let i = 0; i < n; i++) { const v = make(i); a[i * 3] = v[0]; a[i * 3 + 1] = v[1]; a[i * 3 + 2] = v[2]; b[i] = rng(); }
    g.setAttribute('position', new THREE.BufferAttribute(a, 3)); g.setAttribute('aRnd', new THREE.BufferAttribute(b, 1));
    const p = new THREE.Points(g, mat); p.frustumCulled = false; root.add(p); return p;
  }
  const ptU = { uTime: U.uTime, uNight: U.uNight, uPx: { value: 600 }, uMurk: U.uMurk };
  const bubbleMat = track(new THREE.ShaderMaterial({
    uniforms: ptU, transparent: true, depthWrite: false,
    vertexShader: /* glsl */`attribute float aRnd; uniform float uTime, uPx; varying float vA;
      void main(){ vec3 p = position; float sp = 1.2 + aRnd * 1.6; float y = mod(p.y + uTime * sp, ${(REEF_SURFACE - 0.3).toFixed(1)} - p.y) + p.y;
        p.x += sin(uTime * 2.0 + aRnd * 30.0) * 0.12; p.y = y; vA = smoothstep(${REEF_SURFACE.toFixed(1)}, ${(REEF_SURFACE - 2.0).toFixed(1)}, y);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = (0.08 + aRnd * 0.1) * uPx / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */`varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5) discard;
      float ring = smoothstep(0.5, 0.38, r) * (0.35 + 0.65 * smoothstep(0.25, 0.45, r)); gl_FragColor = vec4(vec3(0.9, 0.97, 1.0), ring * 0.7 * vA); }`,
  }));
  // bubbles come up from the reef (rock mounds) in thin streams
  const bubbles = points(qual.bubbles, (i) => { const m = mounds[i % mounds.length]; const a = rng() * TAU; const x = m.x + Math.cos(a) * m.r * 0.4, z = m.z + Math.sin(a) * m.r * 0.4; return [x, heightAt(x, z) + 0.2, z]; }, bubbleMat);
  const moteMat = track(new THREE.ShaderMaterial({
    uniforms: ptU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`attribute float aRnd; uniform float uTime, uPx, uNight; varying float vA; varying float vG;
      void main(){ vec3 p = position; p.x += sin(uTime * 0.13 + aRnd * 40.0) * 1.4; p.z += cos(uTime * 0.11 + aRnd * 33.0) * 1.4; p.y += sin(uTime * 0.2 + aRnd * 12.0) * 0.6;
        vG = step(0.55, aRnd) * uNight * (0.55 + 0.45 * sin(uTime * 3.0 + aRnd * 80.0));
        vA = 0.18 + vG; vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = (0.05 + 0.08 * aRnd + vG * 0.12) * uPx / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */`varying float vA; varying float vG; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5) discard;
      vec3 c = mix(vec3(0.85, 0.95, 0.9), vec3(0.35, 0.85, 1.0), clamp(vG * 2.0, 0.0, 1.0)); gl_FragColor = vec4(c * smoothstep(0.5, 0.0, r) * vA, 1.0); }`,
  }));
  const motes = points(qual.motes, () => { const a = rng() * TAU, rr = Math.sqrt(rng()) * (EDGE - 2); const x = Math.cos(a) * rr, z = Math.sin(a) * rr; return [x, lerp(heightAt(x, z) + 0.5, REEF_SURFACE - 0.5, rng()), z]; }, moteMat);

  // ───────────────────────────── sky, mist below, lights, fog
  const skyU = { uZen: { value: new THREE.Color('#5aa6e8') }, uHor: { value: new THREE.Color('#cfe8f4') }, uGnd: { value: new THREE.Color('#e6eef2') },
    uSunDir: U.uSunDir, uSunCol: { value: new THREE.Color('#fff6e0') }, uSunAmt: { value: 1 }, uNight: U.uNight };
  const skyGeo = track(new THREE.SphereGeometry(480, 32, 16));
  const skyMat = track(new THREE.ShaderMaterial({
    uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: /* glsl */`varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`uniform vec3 uZen, uHor, uGnd, uSunDir, uSunCol; uniform float uSunAmt, uNight; varying vec3 vD;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      void main(){ float y = vD.y; vec3 c = y > 0.0 ? mix(uHor, uZen, pow(y, 0.55)) : mix(uHor, uGnd, smoothstep(0.0, -0.25, y));
        float sd = max(dot(vD, normalize(uSunDir)), 0.0); c += uSunCol * (pow(sd, 900.0) * 3.0 + pow(sd, 12.0) * 0.25) * uSunAmt;
        vec3 q = floor(vD * 300.0); float st = step(0.997, h(q)) * uNight * smoothstep(0.05, 0.3, y);
        gl_FragColor = vec4(c + st, 1.0); }`,
  }));
  const sky = new THREE.Mesh(skyGeo, skyMat); sky.renderOrder = -10; sky.frustumCulled = false; root.add(sky);
  // the sea of mist the island floats over
  const mistGeo = track(new THREE.CircleGeometry(460, 48)); mistGeo.rotateX(-Math.PI / 2);
  const mistMat = track(new THREE.MeshBasicMaterial({ color: '#dfeef5', transparent: true, opacity: 0.92, depthWrite: false, fog: true }));
  const mist = new THREE.Mesh(mistGeo, mistMat); mist.position.y = -34; mist.renderOrder = -5; root.add(mist);

  const sunLight = new THREE.DirectionalLight(0xffffff, 3);
  sunLight.castShadow = true;
  const ss = pipeline.shadowSize || ({ low: 1024, medium: 2048, high: 4096 })[quality] || 2048;
  sunLight.shadow.mapSize.set(ss, ss);
  const sc = sunLight.shadow.camera; sc.left = -54; sc.right = 54; sc.top = 54; sc.bottom = -54; sc.near = 1; sc.far = 260;
  sunLight.shadow.bias = -0.0004; sunLight.shadow.normalBias = 0.05; sunLight.shadow.radius = 4;
  root.add(sunLight, sunLight.target);
  const hemi = new THREE.HemisphereLight(0x9fe0f0, 0xd8c8a0, 1.2); root.add(hemi);
  const fog = new THREE.Fog(0x9fd4e6, 120, 560);
  const prevFog = scene.fog, prevBg = scene.background;
  scene.fog = fog; scene.background = null;
  const sun = { direction: V3(0, 1, 0), elevation: Math.PI / 2, light: sunLight };
  const sunDir = V3(), moonDir = V3();
  const state = { murk: 0, warm: 0, rain: 0 };
  const night = { v: 0 };
  function computeSun(dayFrac) {
    const th = TAU * (dayFrac - 0.25);
    const el = Math.asin(Math.sin(th)) * 1.1 / (Math.PI / 2);
    sunDir.set(Math.cos(th) * Math.cos(el), Math.sin(el), -0.42 * Math.cos(el)).normalize();
    moonDir.set(-sunDir.x * 0.9, Math.max(0.2, -sunDir.y), 0.35).normalize();
    return Math.asin(clamp(sunDir.y, -1, 1));
  }
  const cTmp = new THREE.Color(), cTmp2 = new THREE.Color();
  const COL = { zenDay: new THREE.Color('#4f9fe6'), horDay: new THREE.Color('#d6eef6'), zenNight: new THREE.Color('#0a1530'), horNight: new THREE.Color('#1c2d52'),
    zenDusk: new THREE.Color('#3d5fa8'), horDusk: new THREE.Color('#ffb98a'), sunNoon: new THREE.Color('#fff4dc'), sunLow: new THREE.Color('#ffb070'), moon: new THREE.Color('#8fb0ff'),
    fogDay: new THREE.Color('#8fcfe8'), fogNight: new THREE.Color('#122440'), fogMurk: new THREE.Color('#9a9270'),
    shallowDay: new THREE.Color('#3fc3d6'), deepDay: new THREE.Color('#0d5a86') };

  function update(dt, ctx = {}) {
    dt = Math.min(dt || 0.016, 0.1);
    const t = ctx.t !== undefined ? ctx.t : (U.uTime.value + dt);
    U.uTime.value = t;
    const dayFrac = ctx.dayFrac !== undefined ? ctx.dayFrac : 0.5;
    const cam = ctx.camera || pipeline.camera;
    const el = computeSun(dayFrac); sun.direction.copy(sunDir); sun.elevation = el;
    const e = sunDir.y;
    night.v = smoothstep(0.02, -0.16, e);
    const dayAmt = smoothstep(-0.05, 0.16, e), dusk = smoothstep(0.35, 0.05, Math.abs(e)) * (1 - night.v);
    U.uNight.value = night.v; U.uSunDir.value.copy(sunDir);
    state.rain = damp(state.rain, clamp(ctx.rain || 0), 1.2, dt);
    state.murk = damp(state.murk, clamp((ctx.flood || 0) * 0.9 + state.rain * 0.15), 0.6, dt);
    state.warm = damp(state.warm, clamp(Math.max(ctx.drought || 0, ctx.heat || 0)), 0.5, dt);
    U.uMurk.value = state.murk; U.uWarm.value = state.warm;
    waterU.uRough.value = 0.2 + state.rain * 0.6 + clamp(ctx.wind ?? 0.2) * 0.2;
    // sky
    skyU.uZen.value.copy(COL.zenDay).lerp(COL.zenDusk, dusk * 0.6).lerp(COL.zenNight, night.v);
    skyU.uHor.value.copy(COL.horDay).lerp(COL.horDusk, dusk * 0.55).lerp(COL.horNight, night.v);
    skyU.uGnd.value.copy(skyU.uHor.value).lerp(new THREE.Color('#ffffff'), 0.25 * dayAmt);
    const sCol = cTmp.copy(COL.sunLow).lerp(COL.sunNoon, smoothstep(0.08, 0.45, e));
    skyU.uSunCol.value.copy(sCol); skyU.uSunAmt.value = smoothstep(-0.12, 0.02, e) * (1 - state.rain * 0.8);
    waterU.uSunCol.value.copy(sCol).multiplyScalar(dayAmt * (1 - state.rain * 0.7));
    // lights: daylight under water is bluish and soft
    const useSun = e > -0.04;
    sunLight.position.copy(useSun ? sunDir : moonDir).multiplyScalar(130);
    if (useSun) { sunLight.color.copy(sCol).lerp(cTmp2.set('#bfefff'), 0.35); sunLight.intensity = 2.1 * dayAmt * (1 - 0.6 * state.rain) * (1 - 0.5 * state.murk); }
    else { sunLight.color.copy(COL.moon); sunLight.intensity = 1.2 * night.v; }
    hemi.color.set('#b4d6f2').lerp(cTmp2.set('#3a5fb0'), night.v * 0.85);
    hemi.groundColor.set('#d8c8a0').multiplyScalar(0.3 + 0.7 * dayAmt).lerp(cTmp2.set('#1a2a48'), night.v * 0.7);
    hemi.intensity = lerp(1.05, 1.6, night.v) * (1 - 0.2 * state.murk);
    // water colours
    waterU.uShallow.value.copy(COL.shallowDay).lerp(cTmp2.set('#2a6ba0'), dusk * 0.2);
    waterU.uDeep.value.copy(COL.deepDay);
    // fog: the whole diorama sits in sea light; murky water closes it in
    fog.color.copy(COL.fogDay).lerp(COL.fogNight, night.v).lerp(COL.fogMurk, state.murk * 0.6);
    const camDist = Math.max(cam.position.length(), 55);
    fog.near = lerp(camDist + 40, camDist * 0.5, state.murk); fog.far = lerp(camDist + 520, camDist + 140, state.murk);
    mistMat.color.copy(skyU.uHor.value).lerp(cTmp2.set('#ffffff'), 0.3 * dayAmt);
    // caustics: strong at midday in clear water, none at night
    U.uCaust.value = smoothstep(0.0, 0.5, e) * (1 - state.rain * 0.6) * (1 - state.murk);
    // light rays
    rayU.uAmt.value = smoothstep(0.05, 0.5, e) * (1 - state.murk) * (1 - state.rain * 0.7);
    rays.visible = rayU.uAmt.value > 0.01;
    if (rays.visible) {
      for (let i = 0; i < NRAYS; i++) {
        const r = rayInfo[i];
        const len = REEF_SURFACE - heightAt(r.x, r.z) + 0.3;
        _p.set(r.x + Math.sin(t * 0.2 + r.ph) * 1.2, REEF_SURFACE, r.z + Math.cos(t * 0.17 + r.ph) * 1.2);
        _e.set(sunDir.z * 0.35, 0, -sunDir.x * 0.35); _q.setFromEuler(_e);
        _s.set(r.w * (0.8 + 0.2 * Math.sin(t * 0.5 + r.ph)), len, r.w);
        rays.setMatrixAt(i, _m.compose(_p, _q, _s));
      }
      rays.instanceMatrix.needsUpdate = true;
    }
    // points pixel scale
    const dh = pipeline.renderer.getContext().drawingBufferHeight;
    ptU.uPx.value = dh / (2 * Math.tan(THREE.MathUtils.degToRad((cam.fov || 45) / 2)));
    sky.position.copy(cam.position);
  }

  function isPlaceable(x, z) {
    if (Math.hypot(x, z) > R) return false;
    if (onRock(x, z)) return false;
    const ee = 0.6;
    const gx = (heightAt(x + ee, z) - heightAt(x - ee, z)) / (2 * ee), gz = (heightAt(x, z + ee) - heightAt(x, z - ee)) / (2 * ee);
    return Math.hypot(gx, gz) < 0.75;
  }
  function setLightOverlay(tex) { U.uOverlay.value = tex || null; U.uOverlayOn.value = tex ? 1 : 0; }
  function setQuality(q) {
    const s = ({ min: 512, low: 512, medium: 1024, high: 2048 })[q];
    if (s && sunLight.shadow.mapSize.x !== s) { sunLight.shadow.mapSize.set(s, s); if (sunLight.shadow.map) { sunLight.shadow.map.dispose(); sunLight.shadow.map = null; } }
  }
  function dispose() {
    scene.remove(root);
    scene.fog = prevFog; scene.background = prevBg;
    for (const d of disposables) d.dispose && d.dispose();
    rays.dispose();
    if (sunLight.shadow.map) sunLight.shadow.map.dispose();
  }

  const env = {
    biome: 'reef', radius: R, root, underwater: true, surfaceY: REEF_SURFACE,
    heightAt, isWater: () => false, isPlaceable, waterLevel: null, water: { pools: [] },
    bridges: [], bridgeAt: () => null, walkRoute: () => [],
    rocks, groundMeshes: [floor], waterMeshes: [], rockMeshes, sun,
    update, setLightOverlay, setGap() { }, setQuality, dispose, setTreeShadows() { }, setFallenFruit() { },
    get night() { return night.v; },
  };
  update(0, { t: 0, dayFrac: 0.5 });
  return env;
}
