// The sky dome: gradient by sun elevation, sun disc, clouds, stars, moon, and the distant landscape painted in Blender
// (PANO, loaded asynchronously). Drawn first (renderOrder -1000), follows the camera (see update.js).
// Exports: createSky(ctx) → { skyU, sky, pano, farHills }.
// Needs from ctx: U, isAmazon, track, root.
import * as THREE from 'three';
import { PANO } from '../../data/panorama.js';
import { C, V3 } from './common.js';

export function createSky(ctx) {
  const { U, isAmazon, biome, track, root } = ctx;
  // ───────────────────────────── sky dome
  const skyU = {
    uZen: { value: C('#3f7fc6') }, uHor: { value: C('#cde') }, uGnd: { value: C('#999') },
    uSunDir: U.uSunDir, uMoonDir: { value: V3(0, -1, 0) }, uSunCol: { value: C('#fff') }, uSunAmt: { value: 1 },
    uNight: { value: 0 }, uTime: U.uTime, uFlash: { value: 0 }, uNoise: U.uNoise, uCloud: { value: 0.3 }, uCloudCol: { value: C('#fff') },
    // distant landscape painted in Blender (equirectangular horizon strip + its haze/mist factor)
    uPano: { value: null }, uPanoMist: { value: null }, uPanoOn: { value: 0 }, uPanoLat: { value: new THREE.Vector2(-0.17, 0.12) },
    uPanoTint: { value: C('#fff') }, uPanoHazeSrc: { value: C('#fff') }, uPanoHazeAdd: { value: 0 }, uPanoRot: { value: 0 },
  };
  // the panorama loads asynchronously from embedded images; the sky simply shows without it until ready
  const pano = PANO && PANO[biome];   // 1.4: a zone without a painted panorama (the desert, until it is rendered) shows the far hills
  const farHills = pano ? 0 : 1;   // with the painted panorama the old low-poly horizon hills are not needed
  if (pano && pano.img && pano.mist) {
    const ld = new THREE.TextureLoader();
    const cfg = (t, srgb) => { t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
      t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 1; return track(t); };
    let n = 0; const done = () => { if (++n === 2) skyU.uPanoOn.value = 1; };
    skyU.uPano.value = cfg(ld.load(pano.img, done), true);
    skyU.uPanoMist.value = cfg(ld.load(pano.mist, done), false);
    skyU.uPanoLat.value.set(pano.lat[0] * Math.PI / 180, pano.lat[1] * Math.PI / 180);
    skyU.uPanoHazeSrc.value.setRGB(pano.haze[0], pano.haze[1], pano.haze[2]);
    skyU.uPanoRot.value = pano.rot || 0;
  }
  const skyMat = track(new THREE.ShaderMaterial({
    uniforms: skyU, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    vertexShader: /* glsl */`varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: /* glsl */`
      uniform vec3 uZen, uHor, uGnd, uSunDir, uMoonDir, uSunCol, uCloudCol; uniform float uSunAmt, uNight, uTime, uFlash, uCloud; uniform sampler2D uNoise;
      uniform sampler2D uPano, uPanoMist; uniform float uPanoOn, uPanoHazeAdd, uPanoRot; uniform vec2 uPanoLat; uniform vec3 uPanoTint, uPanoHazeSrc;
      varying vec3 vDir;
      float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      void main(){
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(uHor, uZen, pow(clamp(h, 0.0, 1.0), 0.55));
        col = mix(col, uGnd, smoothstep(0.0, -0.25, h));
        float s = max(dot(d, uSunDir), 0.0);
        // warm scattering around the sun, stronger near the horizon
        float horiz = pow(1.0 - abs(h), 5.0);
        col += uSunCol * (pow(s, 6.0) * 0.18 + pow(s, 48.0) * 0.45) * uSunAmt;
        col += uSunCol * pow(s, 2.5) * horiz * 0.35 * uSunAmt;
        // sun disc (HDR → bloom)
        float disc = smoothstep(0.99955, 0.99975, s);
        col += uSunCol * disc * 18.0 * smoothstep(-0.03, 0.02, uSunDir.y);
        // clouds (wispy, high)
        if (h > 0.0) {
          vec2 cuv = d.xz / (h + 0.15) * 0.18 + vec2(uTime * 0.0015, uTime * 0.0006);
          float n = texture2D(uNoise, cuv).g * 0.65 + texture2D(uNoise, cuv * 2.7 + 0.3).r * 0.35;
          float c = smoothstep(0.52 - uCloud * 0.25, 0.85, n) * smoothstep(0.0, 0.12, h) * (0.35 + 0.65 * uCloud);
          vec3 cc = uCloudCol * (0.85 + 0.3 * n) + uSunCol * pow(s, 8.0) * 0.6 * uSunAmt;
          col = mix(col, cc, c * 0.85);
        }
        // stars
        if (uNight > 0.01 && h > 0.0) {
          vec3 p = d * 220.0; vec3 cell = floor(p); float r = hash(cell);
          if (r > 0.965) {
            vec3 sp = cell + 0.5 + (vec3(hash(cell + 1.3), hash(cell + 2.7), hash(cell + 5.1)) - 0.5) * 0.6;
            float dd = length(p - sp);
            float tw = 0.65 + 0.35 * sin(uTime * (1.5 + r * 4.0) + r * 50.0);
            float b = smoothstep(0.32, 0.0, dd) * (r - 0.965) / 0.035 * tw;
            col += vec3(0.85, 0.9, 1.0) * b * 2.2 * uNight * smoothstep(0.0, 0.25, h);
          }
          // faint milky band
          float band = exp(-pow(dot(d, normalize(vec3(0.3, 0.2, 1.0))) * 4.0, 2.0));
          col += vec3(0.08, 0.1, 0.16) * band * texture2D(uNoise, d.xy * 1.5 + d.z).g * uNight * smoothstep(0.0, 0.3, h);
        }
        // moon
        float m = dot(d, uMoonDir);
        if (uNight > 0.01) {
          float md = smoothstep(0.99935, 0.99955, m);
          float crater = texture2D(uNoise, (d.xy - uMoonDir.xy) * 30.0).g;
          col += vec3(0.95, 0.96, 1.0) * md * (2.6 + crater * 1.2) * uNight;
          col += vec3(0.35, 0.45, 0.7) * pow(max(m, 0.0), 300.0) * 0.6 * uNight;
          col += vec3(0.2, 0.28, 0.5) * pow(max(m, 0.0), 12.0) * 0.12 * uNight;
        }
        // distant landscape: re-haze the Blender render toward the live horizon colour (time of day, rain)
        if (uPanoOn > 0.5) {
          float lat = asin(clamp(h, -1.0, 1.0));
          float pv = (lat - uPanoLat.x) / (uPanoLat.y - uPanoLat.x);
          if (pv > 0.0 && pv < 1.0) {
            vec2 puv = vec2(fract(atan(d.z, d.x) / 6.2831853 + 0.5 + uPanoRot), pv);
            vec4 pc = texture2D(uPano, puv);
            float m = texture2D(uPanoMist, puv).r * 0.85;
            vec3 land = max(pc.rgb - uPanoHazeSrc * m, 0.0) * uPanoTint + uHor * m;
            land = mix(land, uHor, uPanoHazeAdd);
            col = mix(col, land, pc.a * smoothstep(0.0, 0.1, pv));
          }
        }
        col += vec3(0.75, 0.8, 1.0) * uFlash;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  const skyGeo = track(new THREE.SphereGeometry(450, 48, 24));
  const sky = new THREE.Mesh(skyGeo, skyMat); sky.frustumCulled = false; sky.renderOrder = -1000; sky.name = 'sky';
  root.add(sky);
  return { skyU, sky, pano, farHills };
}
