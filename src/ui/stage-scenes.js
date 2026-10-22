// The stage scenes of מסע החוקר (1.3.2): a short film, 5 to 7 seconds, when a new stage of the journey opens, before
// רובו־דע says what opened (src/main.js calls window.__stageScene(n) and waits for it; the journey map's replay buttons
// call it too). Each scene is staged live from the game's own models: רובו־דע (src/data/lab-robot.js), the Blender
// animals of the zone packs, the tool models (drone, underwater robot), the island stills, the card paintings, the pack,
// the frames. It draws on its own canvas with its own small WebGLRenderer, made for the scene and thrown away after it,
// so the game's pipeline is never touched. A "דלג" button and Escape end it at once.
//
//   window.__stageScene(n, { at }) → Promise   n = 1..6 (STAGES in src/core/journey.js)
//                                               at: hold the film at that second (headless screenshots), until .stop()
//   window.__stageScene.stop()                  end the running scene (as "דלג")
//   window.__stageScene.info                    the last scene: { n, frames, seconds, tier } (a frame-rate check)
//
// 1 מתבונן  רובו־דע lands on a drone, the two islands rise from the sea below him
// 2 אספן    a card pack opens, a toucan flies one card into the album
// 3 שומר    an owl spreads its wings over the grove at dusk, רובו־דע gives the keeper's badge
// 4 חוקר    the underwater robot dives, a school of fish opens, the reef appears, the doors of the lab open
// 5 ממציא   robot parts fly onto the table and click together, the new robot stands up and waves
// 6 מומחה   the three islands from above, a fleet of drones flies between them, a gold frame shines
// Every scene ends with the stage's name and the Baba Da logo. Weak computers ('min' / 'low' quality) get fewer pixels
// and fewer things. No human figures, no cross shapes (the sparkles are round), no text inside the 3D.
import * as THREE from 'three';
import { ISLAND_ART } from '../data/island-art.js';
import { CARD_ART } from '../data/card-art.js';
import { BABA_DA_LOGO } from '../data/logo.js';
import { STAGES } from '../core/journey.js';
import { key as profileKey } from '../core/profiles.js';
import { loadPack } from '../core/packs.js';
import { makeRng } from '../core/util.js';
import { toolProp } from '../world/props.js';
import { drawRoboFace } from './robo-face.js';
import { stageEmblem, STAGE_COLOR } from './journey-map.js';

// ───────────────────────────────────────── small helpers
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const E = {
  io: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  out: (x) => 1 - Math.pow(1 - x, 3),
  in: (x) => x * x * x,
  sine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  back: (x) => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
};
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ls = () => { try { return window.localStorage || null; } catch (e) { return null; } };
const isKids = () => { try { return ls().getItem(profileKey('web-of-life-mode')) === 'kids'; } catch (e) { return false; } };
function tier() {
  try { const q = window.__app && window.__app.pipe && window.__app.pipe.quality; if (q) return q; } catch (e) { }
  try { const q = ls().getItem('web-of-life-quality'); if (q) return q; } catch (e) { }
  try { const a = JSON.parse(ls().getItem('web-of-life-autoq') || 'null'); if (a && a.q) return a.q; } catch (e) { }
  return 'medium';
}
const sfx = (name) => { try { const a = window.__app && window.__app.audio; if (a) a.play(name); } catch (e) { } };

// a path through timed points (Catmull-Rom between them): keys = [[t, x, y, z], …]
function pathAt(keys, t, out = new THREE.Vector3()) {
  if (t <= keys[0][0]) return out.set(keys[0][1], keys[0][2], keys[0][3]);
  const L = keys.length - 1;
  if (t >= keys[L][0]) return out.set(keys[L][1], keys[L][2], keys[L][3]);
  let i = 0; while (i < L - 1 && t > keys[i + 1][0]) i++;
  const k = (t - keys[i][0]) / (keys[i + 1][0] - keys[i][0]);
  const p0 = keys[Math.max(0, i - 1)], p1 = keys[i], p2 = keys[i + 1], p3 = keys[Math.min(L, i + 2)];
  const cr = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * k + (2 * a - 5 * b + 4 * c - d) * k * k + (-a + 3 * b - 3 * c + d) * k * k * k);
  return out.set(cr(p0[1], p1[1], p2[1], p3[1]), cr(p0[2], p1[2], p2[2], p3[2]), cr(p0[3], p1[3], p2[3], p3[3]));
}

// ───────────────────────────────────────── canvas pictures (sparkles are round: no cross shapes anywhere)
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function glowCanvas(inner = 'rgba(255,255,255,1)', mid = 'rgba(255,255,255,.35)') {
  const c = canvas(64, 64), x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, inner); g.addColorStop(0.25, mid); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return c;
}
function ringCanvas() {
  const c = canvas(128, 128), x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 40, 64, 64, 62);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.55, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return c;
}
function raysCanvas(col = '255,226,140') {
  const c = canvas(256, 256), x = c.getContext('2d'); x.translate(128, 128);
  for (let i = 0; i < 18; i++) { x.rotate(Math.PI * 2 / 18); const g = x.createLinearGradient(0, 0, 0, -128); g.addColorStop(0, `rgba(${col},.55)`); g.addColorStop(1, `rgba(${col},0)`); x.fillStyle = g; x.beginPath(); x.moveTo(-5, 0); x.lineTo(-14, -128); x.lineTo(14, -128); x.lineTo(5, 0); x.fill(); }
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'destination-in';
  const m = x.createRadialGradient(128, 128, 10, 128, 128, 128); m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = m; x.fillRect(0, 0, 256, 256);
  return c;
}
function loadImg(src) { return new Promise((res) => { if (!src) { res(null); return; } const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
function rrect(x, X, Y, W, H, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); }
function coverDraw(x, img, X, Y, W, H) {
  if (!img) { x.fillStyle = '#cfe0c0'; x.fillRect(X, Y, W, H); return; }
  const s = Math.max(W / img.width, H / img.height), w = img.width * s, h = img.height * s;
  x.drawImage(img, X + (W - w) / 2, Y + (H - h) / 2, w, h);
}
// a collectible card: cream paper, a gold edge, the painting, a coloured band (as the album's cards look)
function cardCanvas(img, band = '#2f7f6f') {
  const c = canvas(256, 352), x = c.getContext('2d');
  rrect(x, 4, 4, 248, 344, 22); x.fillStyle = '#f7f0da'; x.fill(); x.lineWidth = 7; x.strokeStyle = '#d4a23a'; x.stroke();
  x.save(); rrect(x, 18, 18, 220, 232, 12); x.clip(); coverDraw(x, img, 18, 18, 220, 232); x.restore();
  rrect(x, 18, 262, 220, 22, 8); x.fillStyle = band; x.fill();
  x.fillStyle = 'rgba(80,60,30,.25)'; for (let i = 0; i < 3; i++) { rrect(x, 30, 296 + i * 15, 196 - i * 40, 7, 3); x.fill(); }
  return c;
}
function cardBackCanvas() {
  const c = canvas(256, 352), x = c.getContext('2d');
  rrect(x, 4, 4, 248, 344, 22); x.fillStyle = '#245c45'; x.fill(); x.lineWidth = 7; x.strokeStyle = '#d4a23a'; x.stroke();
  x.strokeStyle = 'rgba(246,207,114,.55)'; x.lineWidth = 3; for (let r = 30; r <= 110; r += 20) { x.beginPath(); x.arc(128, 176, r, 0, Math.PI * 2); x.stroke(); }
  return c;
}
// the keeper's medallion: a scalloped gold rim, a ring in the stage's colour, the painting in the middle
function medalCanvas(img, ring) {
  const c = canvas(512, 512), x = c.getContext('2d'); x.translate(256, 256);
  x.beginPath(); for (let i = 0; i <= 360; i++) { const a = i / 360 * Math.PI * 2, r = 246 - 10 * (0.5 + 0.5 * Math.cos(a * 40)); x.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  const g = x.createLinearGradient(-200, -240, 200, 240); g.addColorStop(0, '#fbe08a'); g.addColorStop(0.5, '#d9a43a'); g.addColorStop(1, '#a8741c');
  x.fillStyle = g; x.fill();
  x.beginPath(); x.arc(0, 0, 204, 0, Math.PI * 2); x.fillStyle = ring; x.fill();
  x.setLineDash([9, 10]); x.lineWidth = 5; x.strokeStyle = '#fbe7a8'; x.beginPath(); x.arc(0, 0, 192, 0, Math.PI * 2); x.stroke(); x.setLineDash([]);
  x.save(); x.beginPath(); x.arc(0, 0, 170, 0, Math.PI * 2); x.clip(); coverDraw(x, img, -170, -170, 340, 340);
  const s = x.createLinearGradient(-170, -170, 60, 60); s.addColorStop(0, 'rgba(255,255,255,.4)'); s.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = s; x.fillRect(-170, -170, 340, 340);
  x.restore(); x.lineWidth = 8; x.strokeStyle = '#f3e3b0'; x.beginPath(); x.arc(0, 0, 172, 0, Math.PI * 2); x.stroke();
  return c;
}
// an album page: cream paper with three by two card places; one place is still empty (it waits for the toucan's card)
function pageCanvas(imgs, emptyAt) {
  const c = canvas(512, 384), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 512, 0); g.addColorStop(0, '#efe4c4'); g.addColorStop(1, '#f8f0da'); x.fillStyle = g; x.fillRect(0, 0, 512, 384);
  x.strokeStyle = 'rgba(140,110,60,.35)'; x.lineWidth = 3; x.strokeRect(14, 14, 484, 356);
  const W = 128, H = 160, gx = (512 - 3 * W) / 4, gy = (384 - 2 * H) / 3;
  for (let i = 0; i < 6; i++) {
    const col = i % 3, row = (i / 3) | 0, X = 512 - gx - W - col * (W + gx), Y = gy + row * (H + gy);   // from the right
    if (i === emptyAt) { x.setLineDash([10, 8]); x.lineWidth = 4; x.strokeStyle = 'rgba(200,150,50,.9)'; rrect(x, X, Y, W, H, 12); x.stroke(); x.setLineDash([]); continue; }
    x.save(); rrect(x, X, Y, W, H, 12); x.fillStyle = '#f7f0da'; x.fill(); x.lineWidth = 4; x.strokeStyle = '#d4a23a'; x.stroke(); x.clip();
    coverDraw(x, imgs[i % imgs.length], X + 8, Y + 8, W - 16, H - 46); x.restore();
    x.fillStyle = '#2f7f6f'; rrect(x, X + 10, Y + H - 30, W - 20, 10, 4); x.fill();
  }
  return { c, slot: (i) => { const col = i % 3, row = (i / 3) | 0; return { u: (512 - gx - W / 2 - col * (W + gx)) / 512, v: (gy + H / 2 + row * (H + gy)) / 384, w: W / 512, h: H / 384 }; } };
}

// ───────────────────────────────────────── the stage of a scene: renderer, camera, light, things to dispose
function makeStage(cv, low) {
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: !low, alpha: false, powerPreference: 'high-performance', stencil: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 900);
  scene.add(camera);
  const owned = [];   // geometries, materials and textures made for this scene (freed at the end)
  const own = (x) => { if (x) owned.push(x); return x; };
  const tex = (c) => { const t = c && c.isTexture ? c : new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return own(t); };
  const loader = new THREE.TextureLoader();
  const imgTex = (url) => new Promise((res) => { if (!url) { res(null); return; } loader.load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; own(t); res(t); }, undefined, () => res(null)); });
  const glowTex = tex(glowCanvas());
  return { renderer, scene, camera, own, tex, imgTex, glowTex, owned };
}
function fitCamera(camera, w, h) {
  camera.aspect = w / Math.max(1, h);
  // the films are composed for a wide screen; a narrower one keeps the same width in view (a taller picture)
  const hf = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(19)) * 1.7);
  camera.fov = camera.aspect >= 1.7 ? 38 : THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hf / 2) / camera.aspect));
  camera.updateProjectionMatrix();
}

// a picture standing in the world (an island still, the lab): its height in metres, its bottom edge at `bottom`
function picture(S, t, height, opts = {}) {
  const asp = t && t.image ? t.image.width / t.image.height : 1.6;
  const g = S.own(new THREE.PlaneGeometry(height * asp, height));
  if (opts.bottom != null) g.translate(0, height / 2 + opts.bottom, 0);
  const m = S.own(new THREE.MeshBasicMaterial({ map: t, transparent: opts.opaque ? false : true, toneMapped: false, depthWrite: !!(opts.depthWrite || opts.opaque), color: opts.color || '#ffffff', side: THREE.DoubleSide }));
  const mesh = new THREE.Mesh(g, m); mesh.renderOrder = opts.order || 0; return mesh;
}
function skyDome(S, top, mid, bottom, sunDir = null, sunCol = '#fff2c8') {
  const m = S.own(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, toneMapped: false,
    uniforms: { cT: { value: new THREE.Color(top) }, cM: { value: new THREE.Color(mid) }, cB: { value: new THREE.Color(bottom) }, sD: { value: (sunDir || V(0, 0.15, -1)).clone().normalize() }, sC: { value: new THREE.Color(sunCol) }, sOn: { value: sunDir ? 1 : 0 } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 cT, cM, cB, sC, sD; uniform float sOn; varying vec3 vD;
      void main(){ float y = vD.y; vec3 c = y > 0.0 ? mix(cM, cT, pow(clamp(y / 0.6, 0.0, 1.0), 0.7)) : mix(cM, cB, clamp(-y / 0.25, 0.0, 1.0));
        float s = max(dot(normalize(vD), sD), 0.0); c += sOn * sC * (pow(s, 40.0) * 0.9 + pow(s, 6.0) * 0.18);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  }));
  const mesh = new THREE.Mesh(S.own(new THREE.SphereGeometry(400, 32, 16)), m); mesh.renderOrder = -100; mesh.frustumCulled = false; return mesh;
}
// the sea: shades of blue to the horizon, soft moving ripples and a glitter of sun
function sea(S, { deep = '#1c6f96', shallow = '#3f9fbe', horizon = '#cfe8ef', glint = '#fff6d8', far = 150 } = {}) {
  const u = { uT: { value: 0 }, cD: { value: new THREE.Color(deep) }, cS: { value: new THREE.Color(shallow) }, cH: { value: new THREE.Color(horizon) }, cG: { value: new THREE.Color(glint) }, uCam: { value: new THREE.Vector3() }, uFar: { value: far } };
  const m = S.own(new THREE.ShaderMaterial({
    uniforms: u, toneMapped: false,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uT, uFar; uniform vec3 cD, cS, cH, cG, uCam; varying vec3 vW;
      float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){ float d = length(vW.xz - uCam.xz); float f = smoothstep(uFar * 0.18, uFar, d);
        vec3 c = mix(cS, cD, smoothstep(0.0, uFar * 0.3, d));
        float w = sin(vW.x * 0.9 + uT * 1.2) * sin(vW.z * 1.1 - uT * 0.9) + 0.6 * sin(vW.x * 2.1 - vW.z * 1.6 + uT * 1.7);
        c *= 1.0 + 0.06 * w;
        // glitter: a few cells twinkle at random times (no regular pattern)
        vec2 q = vW.xz * vec2(2.2, 3.4); vec2 cell = floor(q); float h = hs(cell);
        vec2 o = vec2(hs(cell + 1.7), hs(cell + 5.3)) - 0.5; float r = length(fract(q) - 0.5 - o * 0.6);
        float tw = pow(max(0.0, sin(uT * (1.5 + h * 2.0) + h * 60.0)), 6.0) * step(0.86, h);
        c += cG * tw * smoothstep(0.22, 0.0, r) * 0.9 * (1.0 - f) * (1.0 - smoothstep(4.0, 60.0, d) * 0.5);
        c = mix(c, cH, f);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  }));
  const mesh = new THREE.Mesh(S.own(new THREE.PlaneGeometry(900, 900)), m); mesh.rotation.x = -Math.PI / 2;
  mesh.userData.tick = (t, cam) => { u.uT.value = t; u.uCam.value.copy(cam.position); };
  return mesh;
}
// soft round lights (sparkles, fireflies, bubbles, bokeh): points with their own positions, colours and sizes
function dots(S, n, { size = 0.18, color = '#ffffff', additive = true, opacity = 1 } = {}) {
  const g = S.own(new THREE.BufferGeometry());
  const P = new Float32Array(n * 3), C = new Float32Array(n * 3); const col = new THREE.Color(color);
  for (let i = 0; i < n; i++) { C[3 * i] = col.r; C[3 * i + 1] = col.g; C[3 * i + 2] = col.b; P[3 * i + 1] = -999; }
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3));
  const m = S.own(new THREE.PointsMaterial({ size, map: S.glowTex, vertexColors: true, transparent: true, opacity, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false }));
  const p = new THREE.Points(g, m); p.frustumCulled = false;
  p.userData.set = (i, x, y, z, k = 1, c = null) => { P[3 * i] = x; P[3 * i + 1] = y; P[3 * i + 2] = z; const cc = c || col; C[3 * i] = cc.r * k; C[3 * i + 1] = cc.g * k; C[3 * i + 2] = cc.b * k; };
  p.userData.done = () => { g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; };
  return p;
}
// a burst of round sparks from a point (it plays by itself from `t0`)
function burst(S, n, color, { speed = 1.6, size = 0.16, life = 1.1, gravity = -1.2 } = {}) {
  const d = dots(S, n, { size, color }); const rng = makeRng(n * 31 + 7);
  const dirs = []; for (let i = 0; i < n; i++) { const a = rng() * Math.PI * 2, b = (rng() - 0.3) * 1.6; dirs.push(V(Math.cos(a) * Math.cos(b), Math.sin(b) + 0.4, Math.sin(a) * Math.cos(b)).multiplyScalar(speed * (0.5 + rng() * 0.7))); }
  d.userData.t0 = -1; d.userData.at = new THREE.Vector3();
  d.userData.fire = (t, p) => { d.userData.t0 = t; d.userData.at.copy(p); };
  d.userData.tick = (t) => {
    const t0 = d.userData.t0; const k = t0 < 0 ? -1 : (t - t0) / life;
    for (let i = 0; i < n; i++) {
      if (k < 0 || k > 1) { d.userData.set(i, 0, -999, 0, 0); continue; }
      const s = (t - t0), q = dirs[i];
      d.userData.set(i, d.userData.at.x + q.x * s, d.userData.at.y + q.y * s + 0.5 * gravity * s * s, d.userData.at.z + q.z * s, Math.pow(1 - k, 1.5));
    }
    d.userData.done();
  };
  return d;
}
function glowSprite(S, color, size, opacity = 1) {
  const m = S.own(new THREE.SpriteMaterial({ map: S.glowTex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  const s = new THREE.Sprite(m); s.scale.setScalar(size); return s;
}
function lights(S, { sky = '#e8f2ff', ground = '#6a5a48', hemi = 1.2, sun = '#fff1d6', sunI = 2.2, sunPos = [4, 8, 6], fill = 0.6 } = {}) {
  const g = new THREE.Group();
  g.add(new THREE.HemisphereLight(sky, ground, hemi));
  const d = new THREE.DirectionalLight(sun, sunI); d.position.set(...sunPos); g.add(d);
  const f = new THREE.DirectionalLight('#cfe6ff', fill); f.position.set(-5, 3, 4); g.add(f);
  return g;
}
// a size for a model: scale it so its largest side (or a chosen axis) measures `size`
function fit(obj, size, axis = 'max') {
  const b = new THREE.Box3().setFromObject(obj); const s = b.getSize(new THREE.Vector3());
  const m = axis === 'max' ? Math.max(s.x, s.y, s.z) : s[axis];
  if (m > 0) obj.scale.multiplyScalar(size / m);
  return obj;
}
function boxOf(obj) { obj.updateMatrixWorld(true); return new THREE.Box3().setFromObject(obj); }

// ───────────────────────────────────────── רובו־דע (the lab's robot, decoded like src/lab/lab.js)
let ROBOT_DATA = null;
const b64 = (s) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
const robotGeo = new Map();   // decoded once per visit to a scene, freed with the scene
function decodePart(e) {
  const g = new THREE.BufferGeometry();
  const q = new Int16Array(b64(e.p).buffer); const n = q.length / 3; const P = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) P[3 * i + k] = e.o[k] + (q[3 * i + k] + 32767) * e.s[k];
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  if (e.n) { const nn = new Int8Array(b64(e.n).buffer); const N = new Float32Array(nn.length); for (let i = 0; i < nn.length; i++) N[i] = nn[i] / 127; g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); }
  if (e.uv) { const uu = new Uint16Array(b64(e.uv).buffer); const U = new Float32Array(uu.length); for (let i = 0; i < uu.length; i++) U[i] = uu[i] / 65535; g.setAttribute('uv', new THREE.BufferAttribute(U, 2)); }
  g.setIndex(new THREE.BufferAttribute(new Uint16Array(b64(e.i).buffer), 1));
  if (!e.n) g.computeVertexNormals();
  return g;
}
async function robotData() {
  if (ROBOT_DATA) return ROBOT_DATA;
  try { ROBOT_DATA = (await import('../data/lab-robot.js')).LAB_ROBOT || null; } catch (e) { console.warn('stage scene: robot', e); }
  return ROBOT_DATA;
}
function leafBadgeCanvas() {
  const c = canvas(128, 128), x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 128, 128);
  x.translate(64, 64); x.rotate(-0.6); x.shadowColor = 'rgba(110,255,140,.9)'; x.shadowBlur = 14;
  x.fillStyle = '#6dff8a'; x.beginPath(); x.moveTo(0, -42); x.quadraticCurveTo(30, -10, 0, 42); x.quadraticCurveTo(-30, -10, 0, -42); x.fill();
  return c;
}
// accent: the trim colour (a new robot of the workshop is orange). groups: hover (the glowing base), body, head, arm_a, arm_b
function makeRobo(S, R, { low = false, accent = null, accentDark = null } = {}) {
  const fc = canvas(512, 256), fx = fc.getContext('2d'); const ft = S.tex(fc);
  const Mat = low ? THREE.MeshStandardMaterial : THREE.MeshPhysicalMaterial;
  const phys = (o) => (low ? (delete o.clearcoat, delete o.clearcoatRoughness, o) : o);
  const M = {
    shell: S.own(new Mat(phys({ color: '#f3f1ea', roughness: 0.26, clearcoat: 0.7, clearcoatRoughness: 0.12 }))),
    teal: S.own(new Mat(phys({ color: accent || '#2c9a92', roughness: 0.32, clearcoat: 0.4 }))),
    tealdark: S.own(new Mat(phys({ color: accentDark || '#1d5e66', roughness: 0.38, clearcoat: 0.3 }))),
    visor: S.own(new Mat(phys({ color: '#0a1016', roughness: 0.06, clearcoat: 1, emissive: '#ffffff', emissiveMap: ft, emissiveIntensity: 1.5, side: THREE.DoubleSide }))),
    seam: S.own(new THREE.MeshStandardMaterial({ color: '#3b434c', roughness: 0.5 })),
    metal: S.own(new THREE.MeshStandardMaterial({ color: '#c4cad2', roughness: 0.3, metalness: low ? 0.4 : 1 })),
    leaf: S.own(new Mat(phys({ color: '#5aa845', roughness: 0.42, clearcoat: 0.3, side: THREE.DoubleSide }))),
    glow: S.own(new THREE.MeshBasicMaterial({ color: '#9ff6ff', toneMapped: false })),
    badge: S.own(new Mat(phys({ color: '#0c1a1c', roughness: 0.08, clearcoat: 1, emissive: '#ffffff', emissiveMap: S.tex(leafBadgeCanvas()), emissiveIntensity: 1.2, side: THREE.DoubleSide }))),
  };
  const root = new THREE.Group(); root.name = 'robo-da';
  const float = new THREE.Group(); root.add(float);
  const piv = R ? R.pivots : { head: [0, 0.545, 0], arm_a: [-0.2, 0.455, 0.005], arm_b: [0.2, 0.455, 0.005] };
  const G = { hover: new THREE.Group(), body: new THREE.Group() };
  float.add(G.hover, G.body);
  for (const k of ['head', 'arm_a', 'arm_b']) { const g = new THREE.Group(); g.position.fromArray(piv[k]); float.add(g); G[k] = g; }
  if (R) for (const e of R.parts) {
    const id = e.p.length + ':' + e.p.slice(0, 24) + e.g;
    let geo = robotGeo.get(id); if (!geo) { geo = decodePart(e); robotGeo.set(id, geo); }
    const m = new THREE.Mesh(geo, M[e.m] || M.shell);
    const g = G[e.g] || G.body; if (piv[e.g]) m.position.set(-piv[e.g][0], -piv[e.g][1], -piv[e.g][2]);
    g.add(m);
  } else {   // without the model data (should not happen): a simple stand-in
    const b = new THREE.Mesh(S.own(new THREE.CapsuleGeometry(0.16, 0.18, 6, 16)), M.shell); b.position.y = 0.3; G.body.add(b);
    const h = new THREE.Mesh(S.own(new THREE.SphereGeometry(0.15, 20, 14)), M.shell); h.position.set(0, 0.08, 0); G.head.add(h);
  }
  for (const k in G) G[k].userData.base = G[k].position.clone();
  // his feet: the lowest point of the glowing base (`hover` below is the gap between it and the ground)
  const footY = R ? boxOf(G.hover).min.y : 0;
  // blob shadow under him
  const sh = new THREE.Mesh(S.own(new THREE.PlaneGeometry(0.7, 0.7)), S.own(new THREE.MeshBasicMaterial({ map: S.tex(glowCanvas('rgba(0,0,0,.55)', 'rgba(0,0,0,.3)')), transparent: true, depthWrite: false, toneMapped: false })));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.004; root.add(sh);
  const st = { blinkT: 1.6, blink: 0, expr: 'happy', talk: 0, wave: 0, off: false, last: '' };
  function face() {
    const key = st.off ? 'off' : st.expr + (st.blink > 0.5 ? 'b' : '') + (st.talk > 0.05 ? 't' + st.talk.toFixed(1) : '');
    if (key === st.last) return; st.last = key;
    if (st.off) { fx.fillStyle = '#05080b'; fx.fillRect(0, 0, 512, 256); } else drawRoboFace(fx, st.expr, st.blink > 0.5 ? 1 : 0, st.talk);
    ft.needsUpdate = true;
  }
  face();
  return {
    root, float, G, M, shadow: sh,
    set expr(v) { st.expr = v; }, get expr() { return st.expr; },
    set off(v) { st.off = v; }, get off() { return st.off; },
    wave(s = 1.4) { st.wave = s; },
    // hover: the height he floats at; look: a head turn (radians); armsUp: both arms raised (0..1, holding something)
    update(t, dt, { hover = 0.1, look = 0, bob = 1, armsUp = 0, cheer = 0, waving = false } = {}) {
      float.position.y = hover - footY + Math.sin(t * 1.8) * 0.018 * bob;
      float.rotation.z = Math.sin(t * 0.9) * 0.02 * bob;
      st.blinkT -= dt; if (st.blinkT < 0) { st.blink = 1; st.blinkT = 2.2 + Math.random() * 2.5; }
      st.blink = Math.max(0, st.blink - dt * 7);
      G.head.rotation.y += (look - G.head.rotation.y) * Math.min(1, dt * 4);
      G.head.rotation.x = Math.sin(t * 0.7) * 0.04;
      G.head.rotation.z = st.expr === 'curious' ? 0.12 : Math.sin(t * 0.4) * 0.03;
      st.wave = Math.max(0, st.wave - dt); if (waving) st.wave = Math.max(st.wave, 0.2);
      const up = armsUp, ch = cheer ? (0.5 + 0.5 * Math.sin(t * 9)) * cheer : 0;
      G.arm_a.rotation.z = lerp(-0.08 + Math.sin(t * 1.8 + 1) * 0.05, -1.1, up) - ch * 1.3;
      G.arm_a.rotation.x = lerp(0, -0.9, up);
      G.arm_b.rotation.z = st.wave > 0 ? 1.9 + Math.sin(t * 12) * 0.35 : lerp(0.08 + Math.sin(t * 1.8) * 0.05, 1.1, up) + ch * 1.3;
      G.arm_b.rotation.x = st.wave > 0 ? -0.4 : lerp(0, -0.9, up);
      face();
    },
  };
}

// a rigged Blender animal from its zone pack, sized to `len` metres (its longest side)
async function animal(zone, id, { seed = 7, len = 1 } = {}) {
  try {
    const Z = (await loadPack(zone)).zone; const b = Z && Z.animals && Z.animals[id]; if (!b) return null;
    const v = b({ seed, rng: makeRng(seed) }); if (!v || !v.object) return null;
    const holder = new THREE.Group(); holder.add(v.object); holder.userData.__v = v;   // disposed with the scene
    v.object.scale.setScalar(1); fit(v.object, len);
    return { v, holder };
  } catch (e) { console.warn('stage scene: animal', zone, id, e); return null; }
}
function tool(S, id, size) {
  const g = toolProp(id); if (!g) return null;
  g.traverse((o) => { if (o.isMesh) { S.own(o.geometry); S.own(o.material); o.castShadow = false; } });
  const c = boxOf(g).getCenter(new THREE.Vector3()); const wrap = new THREE.Group(); g.position.sub(c); wrap.add(g); fit(wrap, size);
  wrap.userData.rotors = g.userData.rotors || [];
  return wrap;
}
function spinRotors(obj, t, speed = 40) { for (const r of obj.userData.rotors || []) r.rotation.y = t * speed; }

// nine-slice picture frame (a gold frame from src/data/frame-art.js): corners keep their shape at any size
function frameMesh(S, t, w, h, c, uvc = 0.22) {
  const xs = [-w / 2, -w / 2 + c, w / 2 - c, w / 2], ys = [-h / 2, -h / 2 + c, h / 2 - c, h / 2], us = [0, uvc, 1 - uvc, 1];
  const P = [], U = [], I = [];
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { P.push(xs[i], ys[j], 0); U.push(us[i], us[j]); }
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { if (i === 1 && j === 1) continue; const a = j * 4 + i; I.push(a, a + 1, a + 5, a, a + 5, a + 4); }
  const g = S.own(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I);
  return new THREE.Mesh(g, S.own(new THREE.MeshBasicMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false, toneMapped: false })));
}
// a size that fills the view at distance d in front of the camera
function viewSize(camera, d) { const h = 2 * d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); return { w: h * camera.aspect, h }; }
function lookCam(camera, p, at) { camera.position.copy(p); camera.lookAt(at); }

// ───────────────────────────────────────── the six scenes
// each: async (S, ctx) → { dur, update(t, dt) }; ctx = { low, kids, robot() }
const SCENES = {};

// 1 מתבונן: morning over the sea; רובו־דע glides down onto a hovering drone; the two islands rise from the water
SCENES[1] = async (S, { low }) => {
  const { scene, camera } = S;
  scene.add(skyDome(S, '#4f9fd8', '#bfe2f0', '#9fd0de', V(0.35, 0.12, -1), '#fff0c0'));
  const water = sea(S, { deep: '#1f78a0', shallow: '#3aa0c2', horizon: '#c8e6ee' }); scene.add(water);
  scene.add(lights(S, { sky: '#f2f7ff', ground: '#5d8aa0', hemi: 1.3, sunPos: [5, 7, 6] }));
  const sun = glowSprite(S, '#ffe6a8', 30, 0.55); sun.position.set(60, 22, -170); scene.add(sun);
  const [ta, tg, R] = await Promise.all([S.imgTex(ISLAND_ART.c_amazon), S.imgTex(ISLAND_ART.c_grove), robotData()]);
  const isl = [
    { m: picture(S, ta, 5.6, { bottom: 0 }), x: -5.3, z: -9.5, h: 5.6, sink: 0.2, t0: 2.0 },
    { m: picture(S, tg, 4.1, { bottom: 0 }), x: 5.4, z: -9, h: 4.1, sink: 0.12, t0: 1.55 },
  ];
  for (const I of isl) { I.m.position.set(I.x, -I.h, I.z); scene.add(I.m); }
  // ripples where they come up, and drops falling from them
  const ringT = S.tex(ringCanvas());
  const rings = [];
  for (const I of isl) for (let k = 0; k < 3; k++) {
    const m = new THREE.Mesh(S.own(new THREE.PlaneGeometry(1, 1)), S.own(new THREE.MeshBasicMaterial({ map: ringT, transparent: true, depthWrite: false, opacity: 0, toneMapped: false, color: '#e8fbff' })));
    m.rotation.x = -Math.PI / 2; m.position.set(I.x, 0.03, I.z + 0.4); scene.add(m); rings.push({ m, I, k });
  }
  const drops = dots(S, low ? 30 : 70, { size: 0.12, color: '#eaffff' }); scene.add(drops);
  const dropR = makeRng(3); const dropSeed = Array.from({ length: low ? 30 : 70 }, () => [dropR(), dropR(), dropR()]);
  // the drone and רובו־דע
  const drone = tool(S, 'drone', 1.5) || new THREE.Group(); scene.add(drone);
  const robo = makeRobo(S, R, { low }); robo.root.scale.setScalar(1.55); scene.add(robo.root); robo.shadow.visible = false;
  const droneTop = () => boxOf(drone).max.y;
  const landFx = burst(S, low ? 10 : 18, '#bff6ff', { speed: 1.3, size: 0.14, gravity: -0.6 }); scene.add(landFx);
  let landed = false, waved = false, rose = [false, false];
  const camA = V(0, 3.7, 8.8), camB = V(0, 2.6, 8.0), camC = V(0, 2.95, 9.2), atA = V(0, 3.4, 0), atB = V(0, 1.55, -2), cp = V(0, 0, 0), ca = V(0, 0, 0);
  return {
    dur: 6.6,
    update(t, dt) {
      // camera: from the sky down to the sea, then a slow step back
      const k1 = E.io(seg(t, 0.2, 2.6)), k2 = E.sine(seg(t, 2.6, 6.6));
      cp.lerpVectors(camA, camB, k1).lerp(camC, k2); ca.lerpVectors(atA, atB, k1); lookCam(camera, cp, ca);
      water.userData.tick(t, camera);
      // the drone flies in from the right and hovers
      const dp = pathAt([[0, 7, 3.6, -0.5], [0.7, 3.2, 2.1, 1.2], [1.3, 0, 1.25, 1.6], [6.6, 0, 1.25, 1.6]], t);
      dp.y += Math.sin(t * 2.1) * 0.05 + (landed ? -0.08 * Math.exp(-(t - 1.62) * 4) * Math.sin((t - 1.62) * 14) : 0);
      drone.position.copy(dp); drone.rotation.y = lerp(-0.9, 0, E.out(seg(t, 0, 1.3))); drone.rotation.z = lerp(0.25, 0, E.out(seg(t, 0, 1.3)));
      spinRotors(drone, t);
      // רובו־דע glides down onto it
      const top = droneTop();
      const k = E.out(seg(t, 0.35, 1.6));
      robo.root.position.set(lerp(0.6, dp.x, k), lerp(6.5, top - 0.02, k), lerp(1.6, dp.z, k));
      robo.root.rotation.y = lerp(0.6, 0.12, k);
      if (!landed && t >= 1.6) { landed = true; sfx('place'); landFx.userData.fire(t, V(dp.x, top + 0.05, dp.z)); }
      const look = t < 1.9 ? 0 : t < 3.4 ? lerp(0, Math.sin((t - 1.9) * 2.1) * 0.55, seg(t, 1.9, 2.3)) : lerp(0.3, 0, seg(t, 3.4, 3.8));
      robo.expr = t > 2.1 && t < 3.6 ? 'wow' : 'happy';
      if (!waved && t >= 3.7) { waved = true; sfx('pop'); }
      robo.update(t, dt, { hover: t < 1.6 ? 0.06 : 0.0, look, bob: t < 1.6 ? 1 : 0.3, waving: t > 3.7 && t < 5.4 });
      landFx.userData.tick(t);
      // the islands rise (a little overshoot, then they settle)
      isl.forEach((I, i) => {
        const r = seg(t, I.t0, I.t0 + 2.0);
        if (r > 0 && !rose[i]) { rose[i] = true; sfx('grow'); }
        const y = lerp(-I.h * 1.02, -I.h * I.sink, E.back(r)) + Math.sin(t * 1.3 + i) * 0.03 * r;
        I.m.position.y = y;
      });
      for (const R0 of rings) {
        const a = (t - R0.I.t0 - R0.k * 0.45) / 1.8;
        if (a < 0 || a > 1) { R0.m.material.opacity = 0; continue; }
        const s = R0.I.h * (0.7 + a * 1.1); R0.m.scale.set(s * 1.25, s * 0.5, 1); R0.m.material.opacity = 0.75 * (1 - a);
      }
      let di = 0;
      for (const I of isl) { const r = seg(t, I.t0 + 0.3, I.t0 + 2.4); for (let j = 0; j < drops.geometry.attributes.position.count / 2; j++, di++) {
        const q = dropSeed[di]; const ph = ((t * 0.7 + q[0]) % 1); const on = r > 0 && r < 1;
        if (!on) { drops.userData.set(di, 0, -999, 0); continue; }
        const bottom = I.m.position.y + I.h * 0.32;
        drops.userData.set(di, I.x + (q[1] - 0.5) * I.h * 0.9, bottom - ph * ph * 2.2, I.z + 0.2 + q[2] * 0.3, (1 - ph) * (1 - r));
      } }
      drops.userData.done();
    },
  };
};

// 2 אספן: warm light; a pack opens, three cards come out; a toucan carries the middle one into the album
SCENES[2] = async (S, { low }) => {
  const { scene, camera } = S;
  scene.add(skyDome(S, '#5a3a5e', '#e7a463', '#7a4a3a', V(0, 0.3, -1), '#ffe0a0'));
  scene.add(lights(S, { sky: '#fff3e0', ground: '#7a4a30', hemi: 1.35, sun: '#ffe6c4', sunI: 2.0, sunPos: [3, 6, 7] }));
  const PA = await import('../data/pack-art.js').then((m) => m.PACK_ART).catch(() => null);
  const picks = ['macaw', 'morpho', 'dartfrog', 'jaguar', 'owl', 'clownfish', 'gazelle', 'hoopoe', 'sloth', 'turtle', 'kapok', 'fox'];
  const [tBody, tStrip, imgs, T] = await Promise.all([
    S.imgTex(PA && PA.body), S.imgTex(PA && PA.strip),
    Promise.all(picks.map((id) => loadImg(CARD_ART[id]))),
    animal('amazon', 'toucan', { seed: 11, len: 1.5 }),
  ]);
  // bokeh lights floating in the warm air
  const nb = low ? 14 : 30; const bok = dots(S, nb, { size: 0.9, color: '#ffd9a0', opacity: 0.35 }); scene.add(bok);
  const br = makeRng(9); const bseed = Array.from({ length: nb }, () => [br() * 14 - 7, br() * 7 - 2.5, -3 - br() * 6, br()]);
  // the pack
  const pack = new THREE.Group(); scene.add(pack);
  const PH = 2.7, PW = PH * 600 / 904;
  const body = new THREE.Mesh(S.own(new THREE.PlaneGeometry(PW, PH)), S.own(new THREE.MeshBasicMaterial({ map: tBody, transparent: true, toneMapped: false, side: THREE.DoubleSide, depthWrite: false })));
  const strip = new THREE.Mesh(S.own(new THREE.PlaneGeometry(PW, PH)), S.own(new THREE.MeshBasicMaterial({ map: tStrip, transparent: true, toneMapped: false, side: THREE.DoubleSide, depthWrite: false })));
  body.renderOrder = 2; strip.renderOrder = 3; strip.position.z = 0.005; pack.add(body, strip);
  if (!tBody) { body.material.map = null; body.material.color.set('#2f6a4a'); }
  const shine = glowSprite(S, '#fff1c8', 1.6, 0); shine.renderOrder = 5; pack.add(shine);
  // three cards
  const backT = S.tex(cardBackCanvas());
  const cards = [0, 1, 2].map((i) => {
    const g = new THREE.Group();
    const f = new THREE.Mesh(S.own(new THREE.PlaneGeometry(0.86, 1.18)), S.own(new THREE.MeshStandardMaterial({ map: S.tex(cardCanvas(imgs[[3, 0, 6][i]], ['#2f7f6f', '#c98a2b', '#2f6f9a'][i])), transparent: true, roughness: 0.55 })));
    const b = new THREE.Mesh(S.own(new THREE.PlaneGeometry(0.86, 1.18)), S.own(new THREE.MeshStandardMaterial({ map: backT, transparent: true, roughness: 0.55 }))); b.rotation.y = Math.PI;
    g.add(f, b); g.visible = false; scene.add(g); return g;
  });
  // the album, open, tilted toward us
  const album = new THREE.Group(); scene.add(album);
  const cover = new THREE.Mesh(S.own(new THREE.BoxGeometry(3.5, 0.08, 1.35)), S.own(new THREE.MeshStandardMaterial({ color: '#2d5a3d', roughness: 0.6 })));
  cover.position.y = -0.05; cover.scale.z = 1.0;
  const pg = [pageCanvas(imgs.slice(6), -1), pageCanvas(imgs.slice(0, 6), 0)];
  const pageMeshes = pg.map((p, i) => {
    const m = new THREE.Mesh(S.own(new THREE.PlaneGeometry(1.68, 1.26)), S.own(new THREE.MeshStandardMaterial({ map: S.tex(p.c), roughness: 0.8 })));
    m.rotation.x = -Math.PI / 2; m.position.set(i ? 0.86 : -0.86, 0.001, 0); m.rotation.z = 0; album.add(m); return m;
  });
  const spine = new THREE.Mesh(S.own(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 12)), S.own(new THREE.MeshStandardMaterial({ color: '#c9a24a', roughness: 0.35, metalness: 0.6 })));
  spine.rotation.x = Math.PI / 2; album.add(cover, spine);
  pageMeshes.forEach((m) => { m.scale.set(1, 1, 1); });
  album.position.set(-1.5, -0.72, 1.1); album.rotation.set(1.12, 0.24, 0.0); album.scale.setScalar(1.02);
  // the empty place on the right page (RTL: the album's first page), in the world
  const sl = pg[1].slot(0);
  const slotLocal = V((sl.u - 0.5) * 1.68, (0.5 - sl.v) * 1.26, 0.01);
  const slotGlow = glowSprite(S, '#ffd27a', 0.9, 0); scene.add(slotGlow);
  const arrive = burst(S, low ? 14 : 26, '#ffe08a', { speed: 1.5, size: 0.13, gravity: -0.8 }); scene.add(arrive);
  const opened = burst(S, low ? 10 : 20, '#fff3cf', { speed: 1.4, size: 0.12, gravity: -0.4 }); scene.add(opened);
  if (T) { scene.add(T.holder); }
  const slotW = new THREE.Vector3(), slotQ = new THREE.Quaternion(), tp = new THREE.Vector3(), tp2 = new THREE.Vector3(), cardQ = new THREE.Quaternion(), fanQ = new THREE.Quaternion();
  let popped = false, placed = false, grabbed = false;
  const toucanKeys = [[1.9, 6.4, 2.4, -0.6], [2.5, 3.8, 2.3, 0.3], [3.0, 1.95, 2.3, 0.3], [3.55, 0.3, 2.0, 0.9], [4.15, -1.5, 1.05, 1.15], [4.6, -2.4, 1.7, 0.9], [5.6, -6.5, 2.6, -0.5]];
  return {
    dur: 6.6,
    update(t, dt) {
      lookCam(camera, V(Math.sin(t * 0.25) * 0.25, 0.55, 7.2), V(0, 0.35, 0));
      for (let i = 0; i < nb; i++) { const q = bseed[i]; bok.userData.set(i, q[0] + Math.sin(t * 0.3 + q[3] * 6) * 0.4, q[1] + Math.sin(t * 0.5 + q[3] * 9) * 0.3, q[2], 0.5 + 0.5 * Math.sin(t * 1.2 + q[3] * 7)); }
      bok.userData.done();
      // the pack drifts in and settles, shivers, the strip flies off
      const kin = E.out(seg(t, 0, 0.9));
      pack.position.set(lerp(3.3, 1.9, kin), lerp(-3.2, 0.15, kin), 0);
      const shiver = seg(t, 0.95, 1.4) > 0 && t < 1.4 ? Math.sin(t * 60) * 0.035 : 0;
      pack.rotation.set(0, lerp(1.2, -0.22, kin), shiver);
      shine.material.opacity = 0.9 * Math.sin(Math.PI * seg(t, 0.9, 1.5)); shine.position.set(lerp(-0.6, 0.6, seg(t, 0.9, 1.5)), lerp(0.8, -0.4, seg(t, 0.9, 1.5)), 0.05);
      const ks = E.out(seg(t, 1.38, 2.1));
      strip.position.set(ks * 0.5, ks * 1.6, 0.005 + ks * 0.3); strip.rotation.z = -ks * 0.9; strip.material.opacity = 1 - seg(t, 1.45, 1.85); strip.visible = t < 1.9;
      if (!popped && t >= 1.4) { popped = true; sfx('pop'); opened.userData.fire(t, V(1.9, 1.35, 0.2)); }
      opened.userData.tick(t);
      // the cards come out and fan above the pack
      album.updateMatrixWorld(true); pageMeshes[1].updateMatrixWorld(true);
      slotW.copy(slotLocal); pageMeshes[1].localToWorld(slotW); pageMeshes[1].getWorldQuaternion(slotQ);
      cards.forEach((c, i) => {
        const k = E.back(seg(t, 1.5 + i * 0.08, 2.15 + i * 0.08));
        c.visible = t > 1.5;
        const fx = 1.9 + (i - 1) * 0.78, fy = 1.6 + (i === 1 ? 0.12 : 0) + Math.sin(t * 1.6 + i) * 0.03;
        tp.set(lerp(1.9, fx, k), lerp(0.4, fy, k), lerp(-0.02, 0.15 + (i === 1 ? 0.06 : 0), k));
        fanQ.setFromEuler(new THREE.Euler(0, -0.15, (1 - i) * 0.22 * k));
        if (i === 1 && t >= 3.0) {
          // carried by the toucan, then into the album's empty place
          if (!grabbed) { grabbed = true; sfx('select'); }
          const kc = E.io(seg(t, 4.1, 4.5));
          if (T) { tp2.copy(T.holder.position).add(V(0, -0.62, 0.05)); } else tp2.copy(pathAt(toucanKeys, t));
          tp.lerpVectors(tp2, slotW, kc);
          cardQ.copy(fanQ).slerp(slotQ, E.io(seg(t, 3.3, 4.4)));
          c.quaternion.copy(cardQ);
          const sc = lerp(1, 0.31 / 0.86 * 1.0, E.io(seg(t, 3.6, 4.45)));
          c.scale.setScalar(sc);
          c.position.copy(tp);
          if (t >= 4.45) { c.position.copy(slotW).add(V(0, 0.01, 0).applyQuaternion(slotQ)); }
        } else { c.position.copy(tp); c.quaternion.copy(fanQ); }
      });
      if (!placed && t >= 4.45) { placed = true; sfx('discover'); arrive.userData.fire(t, slotW); }
      arrive.userData.tick(t);
      slotGlow.position.copy(slotW).add(V(0, 0.05, 0.05)); slotGlow.material.opacity = 0.75 * Math.sin(Math.PI * seg(t, 4.3, 5.6)) + 0.25 * seg(t, 2.6, 3.4) * (1 - seg(t, 4.3, 4.5));
      // the toucan
      if (T) {
        const p = pathAt(toucanKeys, t), q = pathAt(toucanKeys, t + 0.05);
        T.holder.position.copy(p);
        const dx = q.x - p.x, dz = q.z - p.z, dy = q.y - p.y;
        T.holder.rotation.set(-Math.atan2(dy, Math.hypot(dx, dz)) * 0.5, Math.atan2(dx, dz), 0);
        T.holder.visible = t > 1.85;
        T.v.update(dt, { action: t > 3.0 && t < 4.2 ? 'fly' : 'fly' });
      }
    },
  };
};

// 3 שומר: the grove at dusk, fireflies; an owl spreads its wings over it; רובו־דע holds up the keeper's badge
SCENES[3] = async (S, { low }) => {
  const { scene, camera } = S;
  scene.add(skyDome(S, '#2e3570', '#e38a64', '#5a3a50', V(-0.4, 0.06, -1), '#ffc27a'));
  scene.add(lights(S, { sky: '#ffd7b8', ground: '#3a2c48', hemi: 1.1, sun: '#ffb47a', sunI: 2.4, sunPos: [-6, 4, 5], fill: 0.5 }));
  const sunG = glowSprite(S, '#ffb070', 40, 0.6); sunG.position.set(-90, 12, -200); scene.add(sunG);
  const [tg, R, O, owlImg] = await Promise.all([S.imgTex(ISLAND_ART.c_grove), robotData(), animal('grove', 'owl', { seed: 5, len: 2.1 }), loadImg(CARD_ART.owl)]);
  const grove = picture(S, tg, 5.0, { bottom: -2.4, color: '#f2c6b0' }); grove.position.set(0, 0, -6); scene.add(grove);
  // fireflies (warm round lights)
  const nf = low ? 18 : 44; const ff = dots(S, nf, { size: 0.16, color: '#ffe27a' }); scene.add(ff);
  const fr = makeRng(4); const fseed = Array.from({ length: nf }, () => [fr() * 9 - 4.5, fr() * 3.2 - 1.6, -5 - fr() * 2.5, fr()]);
  const robo = makeRobo(S, R, { low }); robo.root.scale.setScalar(1.7); robo.shadow.visible = false; scene.add(robo.root);
  // the badge: a coin with the medallion on its face
  const medT = S.tex(medalCanvas(owlImg, STAGE_COLOR[3]));
  const gold = S.own(new THREE.MeshStandardMaterial({ color: '#d9a43a', roughness: 0.3, metalness: low ? 0.5 : 0.9 }));
  const faceM = S.own(new THREE.MeshStandardMaterial({ map: medT, roughness: 0.4, metalness: 0.1, transparent: true }));
  const coin = new THREE.Group();
  const rim = new THREE.Mesh(S.own(new THREE.CylinderGeometry(0.46, 0.46, 0.06, 48, 1, true)), gold); rim.rotation.x = Math.PI / 2; coin.add(rim);
  const front = new THREE.Mesh(S.own(new THREE.CircleGeometry(0.47, 48)), faceM); front.position.z = 0.031; coin.add(front);
  const back = new THREE.Mesh(S.own(new THREE.CircleGeometry(0.47, 48)), faceM); back.position.z = -0.031; back.rotation.y = Math.PI; coin.add(back);
  scene.add(coin);
  const rays = new THREE.Mesh(S.own(new THREE.PlaneGeometry(3, 3)), S.own(new THREE.MeshBasicMaterial({ map: S.tex(raysCanvas()), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })));
  scene.add(rays);
  const pop = burst(S, low ? 14 : 28, '#ffe39a', { speed: 1.7, size: 0.13, gravity: -0.5 }); scene.add(pop);
  if (O) scene.add(O.holder);
  const owlKeys = [[0, -7.5, 4.6, -5], [1.0, -4.6, 3.6, -2.6], [2.0, -2.0, 2.75, -0.4], [2.6, -1.3, 2.55, 0.9], [6.6, -1.15, 2.5, 1.1]];
  let gave = false, shone = false;
  return {
    dur: 6.6,
    update(t, dt) {
      const k = E.io(seg(t, 0, 3.0));
      lookCam(camera, V(lerp(-1.2, 0.2, k), lerp(0.4, 0.9, k), lerp(9.2, 7.9, k)), V(lerp(-1.4, 0.15, k), lerp(1.6, 1.55, k), 0));
      for (let i = 0; i < nf; i++) { const q = fseed[i]; const b = 0.5 + 0.5 * Math.sin(t * (2 + q[3] * 2) + q[3] * 20); ff.userData.set(i, q[0] + Math.sin(t * 0.4 + q[3] * 9) * 0.35, q[1] + ((t * 0.18 + q[3]) % 1) * 1.2, q[2] + 0.6, b * seg(t, 0, 1.2)); }
      ff.userData.done();
      // the owl glides in and opens its wings over the grove
      if (O) {
        const p = pathAt(owlKeys, t), q = pathAt(owlKeys, t + 0.08);
        O.holder.position.copy(p); O.holder.position.y += Math.sin(t * 1.6) * 0.06 * seg(t, 2.4, 3);
        const head = Math.atan2(q.x - p.x, q.z - p.z);
        const face = lerp(head, 0.15, E.io(seg(t, 1.9, 2.8)));
        O.holder.rotation.set(lerp(0.15, 0.95, E.io(seg(t, 1.8, 2.8))), t < 1.9 ? head : face, Math.sin(t * 1.1) * 0.06);
        O.v.update(dt, { action: t < 2.0 ? 'fly' : 'glide' });
      }
      // רובו־דע floats in from the right, raises the badge
      const kr = E.out(seg(t, 2.4, 3.3));
      robo.root.position.set(lerp(5.2, 2.35, kr), lerp(-1.6, -0.15, kr), 2.4);
      robo.root.rotation.y = lerp(-0.9, -0.35, kr);
      robo.expr = t > 3.6 ? 'happy' : 'normal';
      const up = E.io(seg(t, 3.1, 3.6)) * (1 - E.io(seg(t, 4.0, 4.4)));
      robo.update(t, dt, { hover: 0.1, look: lerp(0.4, -0.2, seg(t, 3.3, 3.8)), armsUp: up, waving: t > 4.5 && t < 6 });
      if (!gave && t >= 4.3) { gave = true; }
      // the coin: it appears between his hands, turns and flies up to the middle, shining
      robo.root.updateMatrixWorld(true);
      const hand = V(-0.05, 0.5, 0.42); robo.root.localToWorld(hand);
      const kc = E.io(seg(t, 3.75, 4.5));
      const target = V(0.55, 1.75, 4.1);
      coin.position.lerpVectors(hand, target, kc);
      coin.visible = t > 3.05;
      coin.scale.setScalar(lerp(0.5, 1.0, E.back(seg(t, 3.05, 3.6))) * lerp(1, 1.12, kc));
      coin.rotation.set(0, (1 - E.out(seg(t, 3.05, 4.5))) * Math.PI * 4 - 0.35 * (1 - kc) + Math.sin(t * 1.4) * 0.12 * kc, 0);
      if (!shone && t >= 4.45) { shone = true; sfx('mission'); pop.userData.fire(t, target); }
      pop.userData.tick(t);
      rays.position.copy(coin.position).add(V(0, 0, -0.05)); rays.rotation.z = t * 0.4; rays.lookAt(camera.position); rays.rotation.z = t * 0.35;
      rays.material.opacity = 0.9 * seg(t, 4.3, 4.9);
    },
  };
};

// 4 חוקר: under the sea; the underwater robot dives, a school of fish swirls and opens, the reef appears; then the
// doors of the lab close in front of us and open onto the lab, where רובו־דע waves
SCENES[4] = async (S, { low }) => {
  const { scene, camera } = S;
  scene.add(skyDome(S, '#56c3e0', '#167aa6', '#062a44'));
  scene.fog = new THREE.FogExp2('#0f5f86', 0.055);
  scene.add(lights(S, { sky: '#bff0ff', ground: '#0b3550', hemi: 1.5, sun: '#e8fbff', sunI: 1.8, sunPos: [2, 9, 4] }));
  const species = ['butterflyfish', 'surgeonfish', 'butterflyfish', 'clownfish', 'surgeonfish', 'parrotfish'];
  const NF = low ? 6 : 14;
  const [tr, tlab, R, ...fish] = await Promise.all([
    S.imgTex(ISLAND_ART.c_reef), S.imgTex(ISLAND_ART.lab), robotData(),
    ...Array.from({ length: NF }, (_, i) => animal('reef', species[i % species.length], { seed: 40 + i, len: species[i % species.length] === 'parrotfish' ? 1.0 : 0.72 })),
  ]);
  const reef = picture(S, tr, 6.2, { bottom: -3.4 }); reef.position.set(0, 0, -5); reef.material.fog = true; reef.material.opacity = 0; scene.add(reef);
  // light rays from the surface
  const rayT = S.tex((() => { const c = canvas(64, 256), x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, 'rgba(220,250,255,.55)'); g.addColorStop(1, 'rgba(220,250,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 256); const h = x.createLinearGradient(0, 0, 64, 0); h.addColorStop(0, 'rgba(0,0,0,1)'); h.addColorStop(0.5, 'rgba(0,0,0,0)'); h.addColorStop(1, 'rgba(0,0,0,1)'); x.globalCompositeOperation = 'destination-out'; x.fillStyle = h; x.fillRect(0, 0, 64, 256); return c; })());
  const shafts = [];
  for (let i = 0; i < (low ? 3 : 6); i++) {
    const m = new THREE.Mesh(S.own(new THREE.PlaneGeometry(1.2, 12)), S.own(new THREE.MeshBasicMaterial({ map: rayT, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false })));
    m.position.set(-5 + i * 2.1, 4, -3 - (i % 3)); m.rotation.z = 0.25; scene.add(m); shafts.push(m);
  }
  // bubbles
  const nbub = low ? 20 : 50; const bub = dots(S, nbub, { size: 0.09, color: '#e6fbff' }); scene.add(bub);
  const brg = makeRng(21); const bseed = Array.from({ length: nbub }, () => [brg(), brg(), brg(), brg()]);
  // the underwater robot
  const rov = tool(S, 'rov', 1.6) || new THREE.Group(); scene.add(rov);
  // the fish
  const F = fish.filter(Boolean).map((f, i) => { scene.add(f.holder); return { ...f, a: (i / NF) * Math.PI * 2, r: 0.9 + (i % 3) * 0.45, y: ((i * 7) % 5) * 0.2 - 0.4, side: i % 2 ? 1 : -1, sp: 0.9 + (i % 4) * 0.12 }; });
  const schoolC = V(0, 1.5, 2.2);
  // the lab behind the doors (they live in front of the camera)
  const labG = new THREE.Group(); camera.add(labG); labG.visible = false;
  const vs = viewSize(camera, 3.2);
  const lab = picture(S, tlab, 1, { opaque: true }); lab.material.fog = false; labG.add(lab); lab.position.z = -3.2;
  const robo = makeRobo(S, R, { low }); robo.root.scale.setScalar(1.0); robo.shadow.visible = false; robo.root.position.set(0.5, -0.92, -2.6); robo.root.rotation.y = -0.25; labG.add(robo.root);
  robo.root.traverse((o) => { if (o.material) o.material.fog = false; });
  const doors = new THREE.Group(); camera.add(doors);
  const shell = S.own(new THREE.MeshStandardMaterial({ color: '#f1efe8', roughness: 0.35, emissive: '#5a6466', fog: false }));
  const trim = S.own(new THREE.MeshStandardMaterial({ color: '#2c9a92', roughness: 0.35, fog: false }));
  const glass = S.own(new THREE.MeshStandardMaterial({ color: '#7fd6ea', roughness: 0.1, emissive: '#2a7f9a', emissiveIntensity: 0.6, fog: false }));
  const leafM = S.own(new THREE.MeshStandardMaterial({ color: '#5aa845', roughness: 0.4, emissive: '#2a5a20', emissiveIntensity: 0.4, fog: false, side: THREE.DoubleSide }));
  const D = 1.2; const dv = viewSize(camera, D); const DW = dv.w / 2 * 1.04, DH = dv.h * 1.08;
  const leaves = [];
  const mkDoor = (side) => {
    const hinge = new THREE.Group(); hinge.position.set(side * dv.w / 2 * 1.02, 0, -D); doors.add(hinge);
    const g = new THREE.Group(); g.position.x = -side * DW / 2; hinge.add(g);
    const p = new THREE.Mesh(S.own(new THREE.BoxGeometry(DW, DH, 0.03)), shell); g.add(p);
    const e = new THREE.Mesh(S.own(new THREE.BoxGeometry(DW * 0.06, DH, 0.035)), trim); e.position.x = side * DW * 0.47; g.add(e);
    const ring = new THREE.Mesh(S.own(new THREE.TorusGeometry(DH * 0.13, DH * 0.018, 10, 40)), trim); ring.position.set(side * DW * 0.05, DH * 0.12, 0.02); g.add(ring);
    const gl = new THREE.Mesh(S.own(new THREE.CircleGeometry(DH * 0.13, 40)), glass); gl.position.copy(ring.position); gl.position.z = 0.017; g.add(gl);
    // half a leaf on each door: closed, they show one leaf
    const lg = S.own(new THREE.ShapeGeometry((() => { const s = new THREE.Shape(); const L = DH * 0.11; s.moveTo(0, -L); s.quadraticCurveTo(-side * L * 0.75, 0, 0, L); s.lineTo(0, -L); return s; })()));
    const leaf = new THREE.Mesh(lg, leafM); leaf.position.set(-side * DW / 2, -DH * 0.16, 0.02); g.add(leaf); leaves.push(leaf);
    return { hinge, g };
  };
  const dL = mkDoor(-1), dR = mkDoor(1);
  doors.visible = false;
  const flash = glowSprite(S, '#fff4d8', 2.2, 0); flash.material.fog = false; flash.position.set(0, 0, -2.4); camera.add(flash);
  let closed = false, opened = false, dove = false, parted = false;
  return {
    dur: 6.8,
    update(t, dt) {
      // the camera dives with the robot
      const kd = E.io(seg(t, 0, 2.2));
      lookCam(camera, V(lerp(0.6, 0, kd), lerp(7.2, 1.85, kd), lerp(9.5, 8.4, kd) - seg(t, 2.2, 3.9) * 1.2), V(lerp(0.4, 0, kd), lerp(6.4, 1.2, kd), -1));
      const cover = viewSize(camera, 3.2); const la = tlab && tlab.image ? tlab.image.width / tlab.image.height : 1.78;
      const lw = Math.max(cover.w, cover.h * la) * 1.02; lab.scale.set(lw, lw / la, 1);
      for (const m of shafts) { m.material.opacity = 0.35 + 0.15 * Math.sin(t * 0.8 + m.position.x); m.position.y = 4 + (camera.position.y - 1.85) * 0.6; }
      // the underwater robot
      const rp = pathAt([[0, 1.4, 9.2, 1.0], [1.0, 1.0, 5.0, 1.8], [2.0, 0.9, 2.6, 2.6], [3.0, 1.9, 2.4, 1.6], [4.2, 3.8, 2.9, -0.4]], t);
      if (!dove && t > 0.15) { dove = true; sfx('pop'); }
      rov.position.copy(rp); rov.rotation.set(lerp(0.5, 0.05, seg(t, 0.4, 2.0)), lerp(0.3, -0.9, seg(t, 2.0, 4.0)), Math.sin(t * 1.4) * 0.06);
      spinRotors(rov, t, 30);
      // bubbles: some from the robot, some rising from below
      for (let i = 0; i < nbub; i++) {
        const q = bseed[i]; const ph = (t * (0.35 + q[0] * 0.3) + q[1]) % 1;
        if (i % 3 === 0) bub.userData.set(i, rp.x + (q[2] - 0.5) * 0.5 + Math.sin(t * 3 + i) * 0.05, rp.y + ph * 1.6, rp.z + (q[3] - 0.5) * 0.4, 1 - ph);
        else bub.userData.set(i, (q[2] - 0.5) * 12, -1 + ph * 9, -2 - q[3] * 4, (1 - ph) * 0.7);
      }
      bub.userData.done();
      // the fish swirl, then open to both sides
      const kp = E.io(seg(t, 2.3, 3.5));
      if (!parted && t >= 2.4) { parted = true; sfx('grow'); }
      for (const f of F) {
        const a = f.a + t * f.sp;
        const sx = schoolC.x + Math.cos(a) * f.r, sz = schoolC.z + Math.sin(a) * f.r * 0.6, sy = schoolC.y + f.y + Math.sin(t * 2 + f.a) * 0.08;
        const ox = f.side * (3.4 + f.r * 1.6), oy = f.y * 2 + 0.6;
        const px = lerp(sx, ox + Math.cos(a) * 0.3, kp), py = lerp(sy, oy, kp), pz = lerp(sz, sz + 0.6, kp);
        const vx = lerp(-Math.sin(a), f.side * 1, kp), vz = lerp(Math.cos(a) * 0.6, 0.15, kp);
        f.holder.position.set(px, py, pz); f.holder.rotation.y = Math.atan2(vx, vz);
        f.v.update(dt, { action: 'swim' });
      }
      reef.material.opacity = E.out(seg(t, 2.4, 3.6)); reef.scale.setScalar(lerp(0.92, 1, E.out(seg(t, 2.4, 3.8))));
      // the doors close in front of us, then open onto the lab
      const kcl = E.out(seg(t, 3.85, 4.35)), kop = E.io(seg(t, 4.65, 5.5));
      doors.visible = t > 3.85; labG.visible = t > 4.4;
      const under = t < 4.4; reef.visible = rov.visible = bub.visible = under; for (const m of shafts) m.visible = under; for (const f of F) f.holder.visible = under;
      dL.hinge.position.x = -dv.w / 2 * 1.02 - (1 - kcl) * dv.w * 0.55; dR.hinge.position.x = dv.w / 2 * 1.02 + (1 - kcl) * dv.w * 0.55;
      dL.hinge.rotation.y = kop * 1.75; dR.hinge.rotation.y = -kop * 1.75;
      if (!closed && t >= 4.3) { closed = true; sfx('place'); }
      if (!opened && t >= 4.7) { opened = true; sfx('discover'); }
      flash.material.opacity = 0.85 * Math.sin(Math.PI * seg(t, 4.65, 5.4));
      flash.scale.setScalar(lerp(1.5, 6, seg(t, 4.65, 5.4)));
      robo.expr = 'happy';
      robo.update(t, dt, { hover: 0.1, look: 0.25, waving: t > 4.9 && t < 6.6 });
    },
  };
};

// 5 ממציא: at the lab's table: the parts of a new robot fly in and click together; its face lights up, it stands up and
// waves; רובו־דע cheers beside it
SCENES[5] = async (S, { low }) => {
  const { scene, camera } = S;
  scene.add(skyDome(S, '#3b4a52', '#6a7a7c', '#2a2622'));
  scene.add(lights(S, { sky: '#fff4e6', ground: '#6a5040', hemi: 1.25, sun: '#ffefd8', sunI: 2.1, sunPos: [3, 7, 6], fill: 0.7 }));
  const [tlab, R] = await Promise.all([S.imgTex(ISLAND_ART.lab), robotData()]);
  const back = picture(S, tlab, 7.4, { opaque: true, color: '#c8c2b8' }); back.position.set(0, 1.9, -5.5); scene.add(back);
  // the table and the assembly pad
  const wood = S.own(new THREE.MeshStandardMaterial({ color: '#b07a4a', roughness: 0.55 }));
  const top = new THREE.Mesh(S.own(new THREE.BoxGeometry(4.6, 0.12, 1.9)), wood); top.position.set(0, 0.74, 0); scene.add(top);
  const edge = new THREE.Mesh(S.own(new THREE.BoxGeometry(4.6, 0.04, 0.04)), S.own(new THREE.MeshStandardMaterial({ color: '#8a5a32', roughness: 0.5 }))); edge.position.set(0, 0.68, 0.95); scene.add(edge);
  const pad = new THREE.Mesh(S.own(new THREE.CylinderGeometry(0.62, 0.66, 0.05, 48)), S.own(new THREE.MeshStandardMaterial({ color: '#1d4e56', roughness: 0.4 }))); pad.position.set(0.35, 0.825, 0.15); scene.add(pad);
  const ringM = S.own(new THREE.MeshBasicMaterial({ color: '#7ff0ff', toneMapped: false, transparent: true, opacity: 0.5 }));
  const ring = new THREE.Mesh(S.own(new THREE.TorusGeometry(0.56, 0.012, 8, 64)), ringM); ring.rotation.x = Math.PI / 2; ring.position.set(0.35, 0.853, 0.15); scene.add(ring);
  // the new robot (orange trim) and רובו־דע
  const bot = makeRobo(S, R, { low, accent: '#e8873a', accentDark: '#9a4f22' }); bot.root.scale.setScalar(1.45); bot.root.position.set(0.35, 0.85, 0.15); bot.shadow.visible = false; scene.add(bot.root);
  const robo = makeRobo(S, R, { low }); robo.root.scale.setScalar(1.45); robo.root.position.set(-1.55, 0.8, -0.2); robo.root.rotation.y = 0.55; robo.shadow.visible = false; scene.add(robo.root);
  const parts = [
    { g: bot.G.hover, t0: 0.45, from: V(1.9, -0.9, 0.9), spin: V(0, 4, 0) },
    { g: bot.G.body, t0: 0.85, from: V(-2.2, 1.0, 0.6), spin: V(1.5, 3, 0) },
    { g: bot.G.arm_a, t0: 1.3, from: V(-1.9, 1.7, 0.4), spin: V(0, 0, 6) },
    { g: bot.G.arm_b, t0: 1.55, from: V(1.9, 1.7, 0.4), spin: V(0, 0, -6) },
    { g: bot.G.head, t0: 1.95, from: V(0.3, 2.4, 0.2), spin: V(0, 6.3, 0) },
  ];
  const sparks = parts.map(() => { const b = burst(S, low ? 8 : 16, '#bff6ff', { speed: 1.1, size: 0.09, gravity: -1 }); scene.add(b); return b; });
  const joy = burst(S, low ? 16 : 30, '#ffd27a', { speed: 1.6, size: 0.12, gravity: -0.7 }); scene.add(joy);
  bot.off = true;
  let lit = false, stood = false;
  const fired = parts.map(() => false);
  return {
    dur: 6.8,
    update(t, dt) {
      lookCam(camera, V(lerp(0.5, -0.2, E.sine(seg(t, 0, 6.8))), lerp(1.75, 1.6, seg(t, 0, 4)), lerp(5.0, 4.5, E.sine(seg(t, 0, 6.8)))), V(-0.1, 1.3, 0));
      ringM.opacity = 0.35 + 0.25 * Math.sin(t * 3) + 0.4 * seg(t, 2.5, 3.0) * (1 - seg(t, 3.6, 4.4));
      parts.forEach((P, i) => {
        const k = seg(t, P.t0, P.t0 + 0.55), e = E.back(k);
        const base = P.g.userData.base;
        P.g.position.set(base.x + P.from.x * (1 - e), base.y + P.from.y * (1 - e), base.z + P.from.z * (1 - e));
        P.g.rotation.set(P.spin.x * (1 - E.out(k)), P.g === bot.G.head ? P.spin.y * (1 - E.out(k)) : P.spin.y * (1 - E.out(k)), P.spin.z * (1 - E.out(k)));
        P.g.visible = t > P.t0 - 0.05;
        if (!fired[i] && k >= 1) { fired[i] = true; sfx(i === 4 ? 'place' : 'click'); P.g.updateMatrixWorld(true); sparks[i].userData.fire(t, P.g.getWorldPosition(V(0, 0, 0))); }
        sparks[i].userData.tick(t);
      });
      // the face lights up, it stands up (rises from the pad, a little stretch), then it waves
      if (!lit && t >= 2.85) { lit = true; bot.off = false; bot.expr = 'wow'; sfx('pop'); }
      if (t >= 3.5) bot.expr = 'happy';
      const ks = E.back(seg(t, 3.2, 3.9));
      if (!stood && t >= 3.3) { stood = true; joy.userData.fire(t, V(0.35, 1.3, 0.2)); sfx('discover'); }
      joy.userData.tick(t);
      const squash = t > 3.2 && t < 3.9 ? 1 + Math.sin(seg(t, 3.2, 3.9) * Math.PI) * 0.06 : 1;
      bot.root.scale.set(1.45 / Math.sqrt(squash), 1.45 * squash, 1.45 / Math.sqrt(squash));
      // the hover (the float group's own) is kept at 0 while assembling, then rises
      const assembled = t < 3.2;
      bot.update(t, dt, { hover: assembled ? 0.0 : lerp(0.0, 0.08, ks), look: lerp(0.4, 0.15, seg(t, 3, 4)), bob: assembled ? 0 : 1, waving: t > 4.0 && t < 6.2 });
      if (assembled) bot.float.rotation.z = 0;
      robo.expr = t > 3.3 ? 'happy' : 'curious';
      robo.update(t, dt, { hover: 0.1, look: lerp(0.5, 0.2, seg(t, 3, 4)), cheer: seg(t, 3.4, 3.7) * (1 - seg(t, 5.2, 5.6)) });
    },
  };
};

// 6 מומחה: high over the sea, the three islands; a fleet of drones flies between them with trails of light; a gold
// frame closes around the view and shines
SCENES[6] = async (S, { low }) => {
  const { scene, camera } = S;
  scene.add(skyDome(S, '#3f8fd0', '#bfe0ef', '#8fc8da', V(0.3, 0.2, -1), '#fff0c0'));
  const water = sea(S, { deep: '#1b6e98', shallow: '#2f93b8', horizon: '#c4e2ec', far: 220 }); scene.add(water);
  scene.add(lights(S, { sky: '#f2f7ff', ground: '#5d8aa0', hemi: 1.35, sunPos: [6, 9, 5] }));
  const FA = await import('../data/frame-art.js').then((m) => m.FRAME_ART).catch(() => null);
  const [ta, tg, tr, tf] = await Promise.all([S.imgTex(ISLAND_ART.c_amazon), S.imgTex(ISLAND_ART.c_grove), S.imgTex(ISLAND_ART.c_reef), S.imgTex(FA && FA.gold)]);
  const isl = [
    { m: picture(S, ta, 6.2, { bottom: -1.0 }), p: V(-7.5, 0, -1.5) },
    { m: picture(S, tg, 4.6, { bottom: -0.55 }), p: V(7.5, 0, -1.2) },
    { m: picture(S, tr, 5.4, { bottom: -1.6 }), p: V(0, 0, -11) },
  ];
  for (const I of isl) { I.m.position.copy(I.p); scene.add(I.m); }
  // the fleet: drones on a loop through the three islands
  const loop = new THREE.CatmullRomCurve3([V(-7.5, 4.6, -1.5), V(-4, 5.4, -8.5), V(0, 5.0, -11), V(4, 5.4, -8.5), V(7.5, 4.6, -1.2), V(2.5, 4.0, 3.5), V(-2.5, 4.0, 3.5)], true, 'centripetal');
  const ND = low ? 4 : 7, TRAIL = low ? 10 : 22;
  const drones = [];
  for (let i = 0; i < ND; i++) { const d = tool(S, 'drone', 1.25); if (!d) break; scene.add(d); drones.push({ d, ph: i / ND, off: ((i % 3) - 1) * 0.5 }); }
  const trail = dots(S, Math.max(1, drones.length) * TRAIL, { size: 0.6, color: '#bff6ff' }); scene.add(trail);
  const gold = new THREE.Color('#ffd27a'), cyan = new THREE.Color('#bff6ff');
  // the gold frame, in front of the camera
  const FD = 2;
  let frame = null;
  const glints = [];
  if (tf) {
    const vs = viewSize(camera, FD);
    frame = frameMesh(S, tf, vs.w * 0.97, vs.h * 0.95, vs.h * 0.2); frame.position.z = -FD; frame.renderOrder = 50; camera.add(frame);
    for (let i = 0; i < 2; i++) { const g = glowSprite(S, '#fff4cc', 0.5, 0); g.material.depthTest = false; g.renderOrder = 51; camera.add(g); glints.push(g); }
  }
  const tp = new THREE.Vector3(), tn = new THREE.Vector3();
  let rang = false;
  return {
    dur: 6.8,
    update(t, dt) {
      const a = lerp(-0.3, 0.16, E.sine(seg(t, 0, 6.8))), r = lerp(22, 20.5, E.sine(seg(t, 0, 6.8)));
      lookCam(camera, V(Math.sin(a) * r, lerp(10.5, 8.2, E.sine(seg(t, 0, 5))), -4 + Math.cos(a) * r), V(0, 1.2, -4.5));
      water.userData.tick(t, camera);
      for (const I of isl) { I.m.rotation.y = Math.atan2(camera.position.x - I.p.x, camera.position.z - I.p.z); I.m.position.y = Math.sin(t * 0.8 + I.p.x) * 0.05; }
      let n = 0;
      drones.forEach((D, i) => {
        const u0 = (D.ph + t * 0.075) % 1;
        loop.getPointAt(u0, tp); loop.getTangentAt(u0, tn);
        tp.y += D.off + Math.sin(t * 2 + i) * 0.12; tp.x += D.off * 0.6;
        D.d.position.copy(tp); D.d.rotation.set(0, Math.atan2(tn.x, tn.z), -0.25);
        D.d.visible = t > 0.3 + i * 0.12; spinRotors(D.d, t);
        for (let j = 0; j < TRAIL; j++, n++) {
          const u = (u0 - j * 0.006 + 1) % 1; loop.getPointAt(u, tp); tp.y += D.off + Math.sin(t * 2 + i - j * 0.05) * 0.12; tp.x += D.off * 0.6;
          trail.userData.set(n, tp.x, tp.y - 0.15, tp.z, D.d.visible ? Math.pow(1 - j / TRAIL, 1.6) * 0.9 : 0, i % 2 ? gold : cyan);
        }
      });
      trail.userData.done();
      if (frame) {
        const k = E.out(seg(t, 3.9, 4.7));
        frame.material.opacity = k; frame.scale.setScalar(lerp(1.25, 1, k));
        if (!rang && t >= 4.1) { rang = true; sfx('mission'); }
        // two glints run round the frame, from opposite corners
        const vs = viewSize(camera, FD); const w = vs.w * 0.97 * 0.47, h = vs.h * 0.95 * 0.47;
        glints.forEach((g, i) => {
          const u = (seg(t, 4.4, 6.2) * 1.0 + i * 0.5) % 1; const P = 2 * (w + h); let d = u * P * 2 % P; let x, y;
          if (d < 2 * w) { x = w - d; y = h; } else if ((d -= 2 * w) < 2 * h) { x = -w; y = h - d; } else if ((d -= 2 * h) < 2 * w) { x = -w + d; y = -h; } else { d -= 2 * w; x = w; y = -h + d; }
          g.position.set(x, y, -FD + 0.01); g.material.opacity = 0.95 * Math.sin(Math.PI * seg(t, 4.4, 6.4));
          g.scale.setScalar(0.35 + 0.15 * Math.sin(t * 9 + i));
        });
      }
    },
  };
};

// a test stand for the models (headless checks of size and facing): __stageScene(0, { at: 0, probe: { zone, id, action, yaw } })
SCENES[0] = async (S, { probe = {} }) => {
  const { scene, camera } = S;
  scene.add(skyDome(S, '#8aa', '#cdd', '#777')); scene.add(lights(S));
  const A = await animal(probe.zone || 'amazon', probe.id || 'toucan', { len: 1.2 });
  if (A) scene.add(A.holder);
  return { dur: 99, update(t, dt) { lookCam(camera, V(0, 0.4, 3.2), V(0, 0, 0)); if (A) { A.holder.rotation.y = probe.yaw || 0; A.holder.rotation.x = probe.pitch || 0; A.v.update(dt, { action: probe.action || 'idle' }); } } };
};

// ───────────────────────────────────────── the player
let running = null;   // { promise, finish }
function endCardHTML(n, kids) {
  const S = STAGES.find((s) => s.n === n) || STAGES[0];
  const name = kids ? S.kname : S.name;
  const sub = kids ? `שָׁלָב ${n} בְּמַסַּע הַחוֹקֵר` : `שלב ${n} במסע החוקר`;
  return `<div class="ss-end" style="--sc:${STAGE_COLOR[n] || '#5f9a3e'}">
    <span class="ss-med">${stageEmblem(n)}</span>
    <span class="ss-tx"><small>${esc(sub)}</small><b>${esc(name)}</b></span>
    <img class="ss-logo" src="${BABA_DA_LOGO}" alt="בבא דע" draggable="false"></div>`;
}

export function playStageScene(n, opts = {}) {
  n = opts.probe ? 0 : Math.max(1, Math.min(6, Math.round(+n) || 1));
  if (running) return running.promise;
  const kids = isKids(), q = tier(), low = q === 'min' || q === 'low';
  const host = document.getElementById('ui') || document.body;
  const el = document.createElement('div'); el.className = 'ss'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', kids ? 'שָׁלָב חָדָשׁ' : 'שלב חדש');
  el.innerHTML = `<canvas class="ss-cv"></canvas><div class="ss-vig"></div>${endCardHTML(n, kids)}
    <button class="ss-skip" type="button">${kids ? 'דַּלֵּג' : 'דלג'}</button><i class="ss-wait" aria-hidden="true"></i>`;
  host.appendChild(el);
  const cv = el.querySelector('.ss-cv');
  let finish = () => { };
  const promise = new Promise((resolve) => {
    const animals = [];   // the rigged animals of the scene (their holders carry the visual), disposed at the end
    const tCall = performance.now(); let readyMs = -1;
    let S = null, sc = null, raf = 0, done = false, t = 0, last = 0, frames = 0, t0 = performance.now(), endShown = false;
    let hold = opts.at != null ? +opts.at : null;   // a fixed time (shots); seek() moves it (recording a film frame by frame)
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(); } };
    const onResize = () => { if (!S) return; const w = el.clientWidth || innerWidth, h = el.clientHeight || innerHeight; S.renderer.setSize(w, h, false); fitCamera(S.camera, w, h); };
    finish = () => {
      if (done) return; done = true;
      cancelAnimationFrame(raf); removeEventListener('keydown', onKey, true); removeEventListener('resize', onResize);
      try { window.__stageScene.info = { n, frames, seconds: +((performance.now() - t0) / 1000).toFixed(2), readyMs, tier: q, low }; } catch (e) { }
      el.classList.add('out');
      setTimeout(() => {
        el.remove();
        if (S) {
          try {
            for (const a of animals) try { a.v.dispose(); } catch (e) { }
            for (const x of S.owned) try { x.dispose(); } catch (e) { }
            for (const g of robotGeo.values()) g.dispose(); robotGeo.clear();
            S.renderer.dispose(); S.renderer.forceContextLoss();
          } catch (e) { console.warn('stage scene dispose', e); }
        }
        running = null; resolve();
      }, 420);
    };
    el.querySelector('.ss-skip').addEventListener('click', (e) => { e.stopPropagation(); sfx('click'); finish(); });
    addEventListener('keydown', onKey, true); addEventListener('resize', onResize);
    (async () => {
      try {
        S = makeStage(cv, low);
        const pr = low ? (q === 'min' ? 0.5 : 0.7) : Math.min(window.devicePixelRatio || 1, q === 'high' ? 1.5 : 1);
        S.renderer.setPixelRatio(pr); onResize();
        sc = await SCENES[n](S, { low, kids, probe: opts.probe });
        S.scene.traverse((o) => { if (o.userData && o.userData.__v) animals.push({ v: o.userData.__v }); });
        if (done) return;
        try { S.renderer.compile(S.scene, S.camera); } catch (e) { }
        el.classList.add('ready'); readyMs = Math.round(performance.now() - tCall);
        last = performance.now(); t0 = last;
        const frame = (now) => {
          if (done) return;
          const dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
          t = hold != null ? hold : t + dt;
          try { sc.update(t, hold != null ? 1 / 30 : dt); S.renderer.render(S.scene, S.camera); } catch (e) { console.error('stage scene', e); finish(); return; }
          frames++;
          if (!endShown && t >= sc.dur - 1.95) { endShown = true; el.classList.add('end'); }
          if (hold == null && t >= sc.dur) { finish(); return; }
          raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
      } catch (e) { console.error('stage scene', n, e); finish(); }
    })();
  });
  running = { promise, finish: () => finish(), seek: (x) => { hold = x == null ? null : +x; } };
  return promise;
}

window.__stageScene = (n, opts) => playStageScene(n, opts);
window.__stageScene.stop = () => { if (running) running.finish(); };
window.__stageScene.seek = (x) => { if (running) running.seek(x); };   // tools/record-scenes.py
