// Cloud shadows (1.4.4 set 10, "atmosphere"): soft dark patches of passing clouds drift over the island. One shared
// set of uniforms for every material that takes part (the ground, grass and rocks through patchMaterial, the plants
// and trees through their own onBeforeCompile), so the shadows line up across them. Only the sun's direct light is
// dimmed; the sky light stays, as under a real cloud. The environment's update sets the strength: more on cloudy
// days and in rain, none at night or under the sea.
//   CLOUD_U                  the uniforms (uCloudTex, uCloudT, uCloudK, uCloudDir)
//   cloudPatch(shader)       call inside onBeforeCompile, after the material's own replacements
//   setCloudTex(tex)         the island's tiling noise texture (environment index.js)
import * as THREE from 'three';

export const CLOUD_U = {
  uCloudTex: { value: null }, uCloudT: { value: 0 }, uCloudK: { value: 0 }, uCloudDir: { value: new THREE.Vector2(0.9, 0.35) },
};
export const setCloudTex = (t) => { CLOUD_U.uCloudTex.value = t; };

const FRAG = /* glsl */`
uniform sampler2D uCloudTex; uniform float uCloudT, uCloudK; uniform vec2 uCloudDir; varying vec3 vCloudW;
float cloudShade(){
  if (uCloudK <= 0.0) return 1.0;
  vec2 uv = vCloudW.xz * 0.011 + uCloudDir * uCloudT * 0.0065;
  float n = texture2D(uCloudTex, uv).r * 0.62 + texture2D(uCloudTex, uv * 2.1 + 0.37).g * 0.38;
  return 1.0 - uCloudK * smoothstep(0.5, 0.66, n);
}`;

export function cloudPatch(shader) {
  // the code goes into every lit material that asks (one shader each); the strength is 0 where there is no island
  if (shader.fragmentShader.indexOf('#include <lights_fragment_end>') < 0) return;   // unlit materials keep their look
  Object.assign(shader.uniforms, CLOUD_U);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vCloudW;')
    .replace('#include <project_vertex>', `{ vec4 _cw = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        _cw = instanceMatrix * _cw;
      #endif
      vCloudW = (modelMatrix * _cw).xyz; }
      #include <project_vertex>`);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\n' + FRAG)
    .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
      { float _cs = cloudShade(); reflectedLight.directDiffuse *= _cs; reflectedLight.directSpecular *= _cs; }`);
}
