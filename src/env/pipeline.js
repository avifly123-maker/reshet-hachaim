// Render pipeline: renderer + post-processing (bloom, output, gentle grade/vignette).
// See CONTRACT.md §1.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { setRenderQuality } from '../core/util.js';

// Tuned for weak school PCs: post-processing only on 'high'; 'low' has no shadows and renders below native resolution.
const TIERS = {
  min: { pixelRatio: 0.65, shadow: 0, bloom: false, samples: 0, grade: false },   // computers without a graphics driver
  low: { pixelRatio: 0.75, shadow: 0, bloom: false, samples: 0, grade: false },
  medium: { pixelRatio: 1, shadow: 1024, bloom: false, samples: 0, grade: false },
  high: { pixelRatio: 1.5, shadow: 2048, bloom: true, samples: 4, grade: true },
};

// Gentle colour grade + vignette, applied after OutputPass (input already tone-mapped, sRGB).
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uVignette: { value: 0.28 },
    uSaturation: { value: 1.06 },
    uContrast: { value: 1.04 },
    uLift: { value: new THREE.Color(0.0, 0.004, 0.012) },   // cool shadows
    uGain: { value: new THREE.Color(1.015, 1.0, 0.975) },   // warm highlights
    uAspect: { value: 1.6 },
  },
  vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uVignette, uSaturation, uContrast, uAspect; uniform vec3 uLift, uGain;
    varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = c.rgb;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSaturation);
      col = (col - 0.5) * uContrast + 0.5;
      col = col * mix(vec3(1.0), uGain, smoothstep(0.3, 1.0, l)) + uLift * (1.0 - l);
      vec2 d = (vUv - 0.5) * vec2(uAspect, 1.0) / max(uAspect, 1.0);
      float v = smoothstep(0.85, 0.25, length(d) * 1.25);
      col *= mix(1.0 - uVignette, 1.0, v);
      // tiny dither against banding in the sky gradient
      float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
      col += (n - 0.5) / 255.0;
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), c.a);
    }`,
};

export function createPipeline(canvas, { quality = 'medium' } = {}) {
  if (!TIERS[quality]) quality = 'medium';
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: quality !== 'low' && quality !== 'min', powerPreference: 'high-performance', stencil: false,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  // r186 removed PCFSoftShadowMap (falls back to PCF with a warning); PCF + shadow.radius gives the soft look.
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0x0d1a14, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 600);
  camera.position.set(0, 60, 90);
  camera.lookAt(0, 0, 0);

  let composer = null, bloomPass = null, gradePass = null, renderPass = null, outputPass = null;
  let bloomStrength = 0.38;
  const size = new THREE.Vector2();

  function cssSize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    return [Math.max(1, w), Math.max(1, h)];
  }

  function buildComposer() {
    disposeComposer();
    const tier = TIERS[api.quality];
    if (!tier.bloom && !tier.grade) return;
    renderer.getDrawingBufferSize(size);
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: tier.samples });
    composer = new EffectComposer(renderer, rt);
    composer.setPixelRatio(renderer.getPixelRatio());
    const [w, h] = cssSize();
    composer.setSize(w, h);
    renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    if (tier.bloom) {
      bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), bloomStrength, 0.55, 0.92);
      composer.addPass(bloomPass);
    }
    outputPass = new OutputPass();
    composer.addPass(outputPass);
    if (tier.grade) {
      gradePass = new ShaderPass(GradeShader);
      gradePass.uniforms.uAspect.value = w / h;
      composer.addPass(gradePass);
    }
  }

  function disposeComposer() {
    if (!composer) return;
    for (const p of composer.passes) p.dispose && p.dispose();
    composer.renderTarget1.dispose(); composer.renderTarget2.dispose();
    composer = bloomPass = gradePass = renderPass = outputPass = null;
  }

  function applyShadowSize() {
    const s = TIERS[api.quality].shadow;
    const want = s > 0;
    if (renderer.shadowMap.enabled !== want) {
      renderer.shadowMap.enabled = want;
      scene.traverse(o => { const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach(x => { x.needsUpdate = true; }); });
    }
    if (!want) return;
    scene.traverse(o => {
      if (o.isLight && o.castShadow && o.shadow) {
        if (o.shadow.mapSize.x !== s) {
          o.shadow.mapSize.set(s, s);
          if (o.shadow.map) { o.shadow.map.dispose(); o.shadow.map = null; }
        }
      }
    });
  }

  const api = {
    renderer, scene, camera, quality, resScale: 1,
    get shadowSize() { return TIERS[api.quality].shadow || 512; },
    get bloomEnabled() { return !!bloomPass; },
    // shadowEvery > 1 redraws the sun's shadow map only every n-th frame (auto-quality's first, invisible step on slow PCs);
    // the stale map stays consistent with its own light matrix, so shadows just update at a lower rate
    shadowEvery: 1, _frame: 0,
    render(dt = 0.016) {
      if (renderer.shadowMap.enabled) {
        renderer.shadowMap.autoUpdate = false;
        if (api.shadowEvery <= 1 || (++api._frame % api.shadowEvery) === 0) renderer.shadowMap.needsUpdate = true;
      }
      if (composer) composer.render(dt); else renderer.render(scene, camera);
    },
    refreshShadows() { renderer.shadowMap.needsUpdate = true; },
    resize() {
      const [w, h] = cssSize();
      const pr = Math.min(window.devicePixelRatio || 1, TIERS[api.quality].pixelRatio) * api.resScale;
      renderer.setPixelRatio(pr);
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      if (composer) {
        composer.setPixelRatio(pr); composer.setSize(w, h);
        if (gradePass) gradePass.uniforms.uAspect.value = w / h;
      }
    },
    setQuality(q) {
      if (!TIERS[q]) return;
      api.quality = q; setRenderQuality(q);
      const pr = Math.min(window.devicePixelRatio || 1, TIERS[q].pixelRatio);
      renderer.setPixelRatio(pr);
      buildComposer();
      api.resize();
      applyShadowSize();
      renderer.shadowMap.needsUpdate = true;
    },
    setBloom(strength) {
      bloomStrength = strength;
      if (bloomPass) { bloomPass.strength = strength; bloomPass.enabled = strength > 0.001; }
    },
    setExposure(x) { renderer.toneMappingExposure = x; },
    setResScale(k) { api.resScale = k; api.resize(); },
    dispose() { disposeComposer(); renderer.dispose(); },
  };

  api.setQuality(quality);
  return api;
}
