// Shared constants and helpers of the island environment (moved from src/env/environment.js, 1.3.2).
// Exports: R (playable radius), MAX_SHAFTS / MAX_FIRES / MAX_SCORCH / MAX_GAPS (shader array sizes), TAU, Q (quality tiers),
// C (hex → THREE.Color), tmpC / tmpC2 (shared scratch colours), V3, bump, GLSL_COMMON, patchMaterial (injects the shared
// wind / wetness / vitality / scorch GLSL into a standard material).
// Needs: three, core/util.js.
import * as THREE from 'three';
import { smoothstep } from '../../core/util.js';

export const R = 38;
export const MAX_SHAFTS = 20;
export const MAX_FIRES = 6;
export const MAX_SCORCH = 8;
export const MAX_GAPS = 8;
export const TAU = Math.PI * 2;

export const Q = {
  min:    { seg: 96,  rings: 30, scatter: 0.05, motes: 6,  pollen: 24,  rain: 300,  mist: 3,  flames: 4,  shadowScatter: false },
  low:    { seg: 128, rings: 40, scatter: 0.16, motes: 14, pollen: 60,  rain: 800,  mist: 6,  flames: 6,  shadowScatter: false },
  medium: { seg: 176, rings: 52, scatter: 0.4,  motes: 28, pollen: 150, rain: 1800, mist: 12, flames: 10, shadowScatter: false },
  high:   { seg: 288, rings: 80, scatter: 1.0,  motes: 56, pollen: 420, rain: 5200, mist: 26, flames: 14, shadowScatter: true },
};

export const C = (h) => new THREE.Color(h);
export const tmpC = new THREE.Color(), tmpC2 = new THREE.Color();
export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

export const bump = (p, a, b, c, d) => smoothstep(a, b, p) * (1 - smoothstep(c, d, p));

// ───────────────────────────────────────────────────────── GLSL snippets
export const GLSL_COMMON = /* glsl */`
uniform float uTime; uniform float uWind; uniform float uVital; uniform float uWet;
uniform vec4 uScorch[${MAX_SCORCH}];
varying vec3 vWPos;
float scorchAt(vec2 p){ float sc = 0.0; for (int i = 0; i < ${MAX_SCORCH}; i++){ vec4 s = uScorch[i]; if (s.w <= 0.0) continue; float d = length(p - s.xy); sc = max(sc, s.w * (1.0 - smoothstep(s.z * 0.45, s.z * 1.2, d))); } return sc; }
vec3 vitalGrade(vec3 c){ float l = dot(c, vec3(0.299, 0.587, 0.114)); return mix(vec3(l) * vec3(1.04, 0.98, 0.9), c, 0.35 + 0.65 * uVital) * (0.88 + 0.12 * uVital); }
`;

export function patchMaterial(mat, key, uniforms, { vertexPre = '', vertexBegin = '', fragPre = '', fragColor = '', fragRough = '', fragEmissive = '', fragNormal = '', colorVertex = null, instanced = false, cards = false } = {}) {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + GLSL_COMMON + vertexPre)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + vertexBegin + `\n{ vec4 _wp = vec4(transformed, 1.0); ${instanced ? '_wp = instanceMatrix * _wp;' : ''} vWPos = (modelMatrix * _wp).xyz; }`);
    if (colorVertex) shader.vertexShader = shader.vertexShader.replace('#include <color_vertex>', colorVertex);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + GLSL_COMMON + fragPre)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + fragColor)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' + fragRough)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + fragEmissive)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + fragNormal);
    if (cards) shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize(vNormal);');
  };
  mat.customProgramCacheKey = () => 'env-' + key;
  return mat;
}
