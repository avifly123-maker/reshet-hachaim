// Visual effects owned by the core: glowing "web of life" links, selection ring, placement ghost ring,
// sparkle bursts (pollination / discovery / birth / seed), all cheap and bloom-friendly.
import * as THREE from 'three';
import { clamp } from '../core/util.js';

// ───────────────────────────── links
const linkVS = `
attribute float aU; attribute float aBroken; attribute float aGlow;
varying float vU; varying float vBroken; varying float vGlow; varying vec3 vCol;
void main(){ vU=aU; vBroken=aBroken; vGlow=aGlow; vCol=color; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const linkFS = `
uniform float uTime; uniform float uOpacity;
varying float vU; varying float vBroken; varying float vGlow; varying vec3 vCol;
void main(){
  float flow = fract(vU*5.0 - uTime*0.55);
  float pulse = smoothstep(0.78,1.0,flow) * (1.0 - smoothstep(0.98,1.0,flow));
  float endFade = smoothstep(0.0,0.06,vU) * smoothstep(1.0,0.94,vU);
  float a = (0.22 + 0.9*pulse) * endFade;
  vec3 c = vCol * (0.9 + 1.6*pulse);
  if (vBroken > 0.5) { float dash = step(0.5, fract(vU*14.0 + uTime*0.3)); a = (0.35 + 0.35*sin(uTime*6.0)) * dash * endFade; c = vec3(1.0,0.25,0.2); }
  a *= mix(1.0, 0.28, vGlow);
  gl_FragColor = vec4(c * a * uOpacity, a * uOpacity);
}`;

export function createLinks(scene) {
  const uniforms = { uTime: { value: 0 }, uOpacity: { value: 1 } };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: linkVS, fragmentShader: linkFS, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
  mesh.frustumCulled = false; mesh.renderOrder = 12; mesh.name = 'web-links';
  scene.add(mesh);
  const SEG = 30, RAD = 5;
  const _p = new THREE.Vector3(), _t = new THREE.Vector3(), _n = new THREE.Vector3(), _b = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  function set(list) {
    const per = (SEG + 1) * RAD * 2;
    const nVerts = list.length * per;
    const pos = new Float32Array(nVerts * 3), col = new Float32Array(nVerts * 3), au = new Float32Array(nVerts), ab = new Float32Array(nVerts), ag = new Float32Array(nVerts);
    const idx = [];
    let v = 0;
    for (const L of list) {
      const a = L.a, b = L.b; const d = a.distanceTo(b);
      const mid = a.clone().lerp(b, 0.5); mid.y = Math.max(a.y, b.y) + 1.2 + d * 0.28;
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const c = L.color;
      for (let layer = 0; layer < 2; layer++) {
        const w = (L.width || 0.11) * (layer ? 3.2 : 1);
        const base = v;
        for (let i = 0; i <= SEG; i++) {
          const u = i / SEG;
          curve.getPoint(u, _p); curve.getTangent(u, _t);
          _n.crossVectors(_t, up); if (_n.lengthSq() < 1e-6) _n.set(1, 0, 0); _n.normalize(); _b.crossVectors(_t, _n).normalize();
          for (let r = 0; r < RAD; r++) {
            const ang = (r / RAD) * Math.PI * 2; const cx = Math.cos(ang) * w, cy = Math.sin(ang) * w;
            pos[v * 3] = _p.x + _n.x * cx + _b.x * cy; pos[v * 3 + 1] = _p.y + _n.y * cx + _b.y * cy; pos[v * 3 + 2] = _p.z + _n.z * cx + _b.z * cy;
            col[v * 3] = c.r * (L.strength ?? 1); col[v * 3 + 1] = c.g * (L.strength ?? 1); col[v * 3 + 2] = c.b * (L.strength ?? 1);
            au[v] = u; ab[v] = L.broken ? 1 : 0; ag[v] = layer; v++;
          }
        }
        for (let i = 0; i < SEG; i++) for (let r = 0; r < RAD; r++) {
          const r2 = (r + 1) % RAD; const i0 = base + i * RAD + r, i1 = base + i * RAD + r2, i2 = base + (i + 1) * RAD + r, i3 = base + (i + 1) * RAD + r2;
          idx.push(i0, i2, i1, i1, i2, i3);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aU', new THREE.BufferAttribute(au, 1)); g.setAttribute('aBroken', new THREE.BufferAttribute(ab, 1)); g.setAttribute('aGlow', new THREE.BufferAttribute(ag, 1));
    g.setIndex(idx);
    mesh.geometry.dispose(); mesh.geometry = g;
    mesh.visible = list.length > 0;
  }
  return { mesh, set, update(t) { uniforms.uTime.value = t; }, dispose() { scene.remove(mesh); mesh.geometry.dispose(); mat.dispose(); } };
}

// ───────────────────────────── rings
function ringMesh(color, r0 = 0.82, r1 = 1) {
  const g = new THREE.RingGeometry(r0, r1, 48); g.rotateX(-Math.PI / 2);
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const mesh = new THREE.Mesh(g, m); mesh.renderOrder = 11; return mesh;
}

export function createMarkers(scene) {
  const group = new THREE.Group(); group.name = 'markers'; scene.add(group);
  // selection
  const sel = new THREE.Group();
  const selRing = ringMesh('#ffe7a0', 0.86, 1); const selRing2 = ringMesh('#ffd25a', 0.55, 0.62);
  const beamG = new THREE.CylinderGeometry(0.03, 0.03, 1, 6, 1, true); beamG.translate(0, 0.5, 0);
  const beam = new THREE.Mesh(beamG, new THREE.MeshBasicMaterial({ color: '#ffe7a0', transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  sel.add(selRing, selRing2, beam); sel.visible = false; group.add(sel);
  // placement ghost
  const ghost = new THREE.Group();
  const gRing = ringMesh('#9cff9c', 0.8, 1); const gFill = new THREE.Mesh(new THREE.CircleGeometry(0.8, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#9cff9c', transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  const gBeam = beam.clone(); gBeam.material = beam.material.clone();
  ghost.add(gRing, gFill, gBeam); ghost.visible = false; group.add(ghost);
  let ghostModel = null;

  // sparkles (pooled points)
  const MAX = 600;
  // sSize = base size per sparkle (set at burst); sDraw = the per-frame drawn size uploaded as the aSize attribute
  // (kept separate so the shrink is base × life fraction, not compounded frame after frame).
  const sPos = new Float32Array(MAX * 3), sCol = new Float32Array(MAX * 3), sSize = new Float32Array(MAX), sDraw = new Float32Array(MAX), sVel = new Float32Array(MAX * 3), sLife = new Float32Array(MAX), sMax = new Float32Array(MAX);
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sPos, 3)); sg.setAttribute('color', new THREE.BufferAttribute(sCol, 3)); sg.setAttribute('aSize', new THREE.BufferAttribute(sDraw, 1));
  const sm = new THREE.ShaderMaterial({
    uniforms: { uPx: { value: 600 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, fog: false,
    vertexShader: `attribute float aSize; uniform float uPx; varying vec3 vC; void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize = aSize*uPx/max(1.0,-mv.z); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vC; void main(){ vec2 d=gl_PointCoord-0.5; float r=length(d); float a=smoothstep(0.5,0.0,r); a*=a; gl_FragColor=vec4(vC*a, a); }`,
  });
  const sparks = new THREE.Points(sg, sm); sparks.frustumCulled = false; sparks.renderOrder = 13; group.add(sparks);
  let sNext = 0;
  const _c = new THREE.Color();
  function burst(pos, color = '#ffe08a', n = 18, { speed = 2.2, size = 0.35, life = 1.2, up = 1.2 } = {}) {
    _c.set(color);
    for (let i = 0; i < n; i++) {
      const k = sNext; sNext = (sNext + 1) % MAX;
      sPos[k * 3] = pos.x; sPos[k * 3 + 1] = pos.y; sPos[k * 3 + 2] = pos.z;
      const a = Math.random() * Math.PI * 2, e = Math.random() * 0.9;
      sVel[k * 3] = Math.cos(a) * speed * (0.3 + Math.random()); sVel[k * 3 + 1] = up * (0.5 + Math.random()) + e; sVel[k * 3 + 2] = Math.sin(a) * speed * (0.3 + Math.random());
      sCol[k * 3] = _c.r * 1.6; sCol[k * 3 + 1] = _c.g * 1.6; sCol[k * 3 + 2] = _c.b * 1.6;
      sLife[k] = life * (0.6 + Math.random() * 0.6); sMax[k] = sLife[k]; sSize[k] = size * (0.6 + Math.random() * 0.8);
    }
  }
  function update(dt, t, camera, pxScale) {
    sm.uniforms.uPx.value = pxScale;
    for (let k = 0; k < MAX; k++) {
      if (sLife[k] <= 0) { if (sDraw[k] !== 0) sDraw[k] = 0; continue; }
      sLife[k] -= dt; const f = clamp(sLife[k] / sMax[k]);
      sVel[k * 3 + 1] -= dt * 1.2;
      sPos[k * 3] += sVel[k * 3] * dt; sPos[k * 3 + 1] += sVel[k * 3 + 1] * dt; sPos[k * 3 + 2] += sVel[k * 3 + 2] * dt;
      sVel[k * 3] *= 1 - dt * 1.5; sVel[k * 3 + 2] *= 1 - dt * 1.5;
      sDraw[k] = sLife[k] > 0 ? sSize[k] * (0.4 + 0.6 * f) : 0;
    }
    sg.attributes.position.needsUpdate = true; sg.attributes.aSize.needsUpdate = true; sg.attributes.color.needsUpdate = true;
    // selection pulse
    if (sel.visible) { const p = 1 + Math.sin(t * 4) * 0.06; selRing.scale.setScalar(p); selRing2.rotation.y = t; }
    if (ghost.visible) { const p = 1 + Math.sin(t * 6) * 0.05; gRing.scale.setScalar(p); if (ghostModel) ghostModel.rotation.y += dt * 0.6; }
    updatePins(dt, t, camera);
  }
  // "where are they?": a soft beacon over every individual of one species for a few seconds (they keep following
  // the animals as they move). locate(list, color, getPos) – getPos(e, v) writes the ground point and returns the height.
  const pins = []; let pinT = 0, pinDur = 0, pinGet = null;
  const pinBeamG = new THREE.CylinderGeometry(0.06, 0.18, 1, 8, 1, true); pinBeamG.translate(0, 0.5, 0);
  const pinDotG = new THREE.OctahedronGeometry(0.55, 0);
  function pinMat(color, op) { return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }); }
  function locate(list, color = '#ffe7a0', getPos = null, dur = 12) {
    for (const p of pins) { group.remove(p.g); p.g.traverse(o => { if (o.material) o.material.dispose(); if (o.geometry && o.geometry !== pinBeamG && o.geometry !== pinDotG) o.geometry.dispose(); }); }
    pins.length = 0; pinT = 0; pinDur = list && list.length ? dur : 0; pinGet = getPos;
    for (const e of (list || []).slice(0, 60)) {
      const g = new THREE.Group(); const ring = ringMesh(color, 0.8, 1); ring.material.opacity = 0;
      const beam = new THREE.Mesh(pinBeamG, pinMat(color, 0)); const dot = new THREE.Mesh(pinDotG, pinMat(color, 0));
      beam.renderOrder = dot.renderOrder = 12; g.add(ring, beam, dot); group.add(g); pins.push({ g, ring, beam, dot, e });
    }
    return pins.length;
  }
  const _pv = new THREE.Vector3();
  function updatePins(dt, t, camera) {
    if (!pins.length) return;
    pinT += dt; const fade = Math.min(1, pinT / 0.5) * Math.min(1, Math.max(0, (pinDur - pinT) / 1.5));
    if (pinT >= pinDur) { locate(null); return; }
    for (const p of pins) {
      const h = pinGet ? pinGet(p.e, _pv) : 2; if (h == null) { p.g.visible = false; continue; }
      p.g.visible = true; p.g.position.copy(_pv);
      // seen from far away the beacon grows, so it stays easy to spot from the overview
      const k = camera ? Math.min(4, Math.max(1, camera.position.distanceTo(_pv) / 28)) : 1;
      const top = h + 2.5 * k + Math.sin(t * 2.4 + p.e.x) * 0.25 * k;
      p.beam.scale.set(k, top, k); p.dot.position.y = top + 0.6 * k; p.dot.scale.setScalar(k); p.dot.rotation.y = t * 1.5;
      const r = (1.1 + Math.sin(t * 3) * 0.08) * Math.sqrt(k); p.ring.scale.setScalar(r); p.ring.position.y = 0.08;
      p.ring.material.opacity = 0.85 * fade; p.beam.material.opacity = 0.4 * fade; p.dot.material.opacity = fade;
    }
  }
  function select(pos, radius, groundY) {
    if (!pos) { sel.visible = false; return; }
    sel.visible = true; sel.position.set(pos.x, groundY + 0.06, pos.z);
    const r = Math.max(0.6, radius); selRing.scale.setScalar(r); selRing2.scale.setScalar(r);
    sel.userData.r = r;
    const h = Math.max(0.01, pos.y - groundY); beam.scale.set(1, h, 1); beam.visible = h > 1.5;
  }
  function showGhost(pos, valid, radius = 1, model = null, height = 2, warn = false) {
    if (!pos) { ghost.visible = false; if (ghostModel) { group.remove(ghostModel); ghostModel = null; } return; }
    ghost.visible = true; ghost.position.copy(pos); ghost.position.y += 0.06;
    const col = valid ? (warn ? '#ffd166' : '#8dff9a') : '#ff6b6b';
    gRing.material.color.set(col); gFill.material.color.set(col); gBeam.material.color.set(col);
    ghost.scale.setScalar(Math.max(0.8, radius)); gBeam.scale.set(1 / Math.max(0.8, radius), height / Math.max(0.8, radius), 1 / Math.max(0.8, radius));
    if (model !== ghostModel) { if (ghostModel) group.remove(ghostModel); ghostModel = model; if (model) group.add(model); }
    if (ghostModel) { ghostModel.position.copy(pos); }
  }
  function dispose() {
    scene.remove(group);
    // the ghost model belongs to the caller (drag state) — detach it, don't dispose it
    if (ghostModel) { group.remove(ghostModel); ghostModel = null; }
    locate(null); pinBeamG.dispose(); pinDotG.dispose();
    const geos = new Set(), mats = new Set();
    group.traverse((o) => {
      if (o.geometry) geos.add(o.geometry);
      if (o.material) for (const m of (Array.isArray(o.material) ? o.material : [o.material])) mats.add(m);
    });
    for (const g of geos) g.dispose();
    for (const m of mats) m.dispose();
  }
  return { group, burst, update, select, showGhost, locate, dispose };
}
