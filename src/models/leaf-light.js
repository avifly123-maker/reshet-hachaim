// Light through the leaves (1.4.4 set 10, "trees"): when the child looks toward the sun through a crown, the leaves
// glow a warm green, as thin leaves do. One small addition to the lit part of a plant shader; `mask` is a GLSL
// expression that is 1 on leaves and 0 on wood. Call it after cloudPatch, so a passing cloud dims this light too.
//   leafLightPatch(shader, mask, strength = 0.38)
export function leafLightPatch(shader, mask, strength = 0.38) {
  if (shader.fragmentShader.indexOf('#include <lights_fragment_end>') < 0) return;
  shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
    #if NUM_DIR_LIGHTS > 0
    {
      float _back = pow(max(dot(-normalize(vViewPosition), directionalLights[0].direction), 0.0), 3.0);
      float _rim = 1.0 - abs(dot(normalize(vViewPosition), normal));
      reflectedLight.directDiffuse += diffuseColor.rgb * vec3(1.05, 1.12, 0.78) * directionalLights[0].color * (_back * (0.55 + 0.45 * _rim)) * ${strength.toFixed(3)} * (${mask});
    }
    #endif`);
}
