// The prototype in 3D (1.4.4 set 4): the build table shows it, the test hall puts it through the six stations.
// Made in code from simple solids (no Blender for these: a child's prototype should look hand-made), one shared set of
// materials per stage, every add-on in its own place round the body. No cross shapes: the fan has three blades, the
// ribs are many, wheels are plain discs with a round hub.
//   const st = createStage(canvas, { weak })   st.show(proto) · st.play(test, pass) → Promise · st.dispose()
//   st.view: 'build' | 'test'   st.spin(true) turns the prototype slowly on the build table
import * as THREE from 'three';
import { protoOk } from './engine.js';
import { materialOf } from '../data/workshop/build-parts.js';

const SOCK = { top: [0, 0.62, 0], bottom: [0, -0.5, 0], left: [-0.62, 0.05, 0], right: [0.62, 0.05, 0], front: [0, 0.05, 0.58], back: [0, 0.1, -0.58] };
function bodyGeo(shape) {
  switch (shape) {
    case 'ball': return new THREE.SphereGeometry(0.55, 32, 20);
    case 'tube': { const g = new THREE.CylinderGeometry(0.36, 0.36, 1.2, 28, 1, false); g.rotateZ(Math.PI / 2); return g; }
    case 'cone': { const g = new THREE.ConeGeometry(0.45, 1.25, 28); g.rotateZ(-Math.PI / 2); return g; }
    case 'plate': return new THREE.BoxGeometry(1.35, 0.2, 1.0, 2, 1, 2);
    case 'dome': return new THREE.SphereGeometry(0.62, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    default: { const g = new THREE.BoxGeometry(0.95, 0.85, 0.85); return g; }
  }
}
const H = { ball: 0.55, tube: 0.36, cone: 0.45, plate: 0.1, dome: 0.62, box: 0.43 };   // top above the centre
const LOW = { ball: -0.55, tube: -0.36, cone: -0.45, plate: -0.1, dome: 0, box: -0.43 };

export function makeMats() {
  const M = {
    wood: new THREE.MeshStandardMaterial({ color: '#c58a4a', roughness: 0.75 }),
    cloth: new THREE.MeshStandardMaterial({ color: '#e07a8a', roughness: 0.95 }),
    metal: new THREE.MeshStandardMaterial({ color: '#b8c4d0', roughness: 0.3, metalness: 0.85 }),
    rubber: new THREE.MeshStandardMaterial({ color: '#3a9a6a', roughness: 0.6 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#bfe8fa', roughness: 0.05, transmission: 0.6, transparent: true, opacity: 0.55, thickness: 0.4 }),
    dark: new THREE.MeshStandardMaterial({ color: '#3a2a1a', roughness: 0.6 }),
    steel: new THREE.MeshStandardMaterial({ color: '#8a96a2', roughness: 0.35, metalness: 0.8 }),
    tyre: new THREE.MeshStandardMaterial({ color: '#2a2a2e', roughness: 0.85 }),
    yellow: new THREE.MeshStandardMaterial({ color: '#ffcc33', roughness: 0.5 }),
    spine: new THREE.MeshStandardMaterial({ color: '#7a5a3a', roughness: 0.7 }),
    scale: new THREE.MeshStandardMaterial({ color: '#5f8a3a', roughness: 0.55, flatShading: true }),
    pink: new THREE.MeshStandardMaterial({ color: '#f0a0b0', roughness: 0.6 }),
    shell: new THREE.MeshStandardMaterial({ color: '#8a6a3a', roughness: 0.6, flatShading: true }),
    feather: new THREE.MeshStandardMaterial({ color: '#f2e6cc', roughness: 0.9, side: THREE.DoubleSide }),
    leaf: new THREE.MeshStandardMaterial({ color: '#3f9a4a', roughness: 0.7, side: THREE.DoubleSide }),
    clay: new THREE.MeshStandardMaterial({ color: '#c8783a', roughness: 0.9 }),
    shark: new THREE.MeshStandardMaterial({ color: '#7d93a6', roughness: 0.45, flatShading: true }),
    bump: new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.4 }),
    glow: new THREE.MeshStandardMaterial({ color: '#fff3a0', emissive: '#ffdd44', emissiveIntensity: 1.6 }),
    reflect: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.05, metalness: 1, emissive: '#665522', emissiveIntensity: 0.4 }),
    uv: new THREE.MeshStandardMaterial({ color: '#8a5ad8', emissive: '#7a3ad8', emissiveIntensity: 1.2 }),
    hive: new THREE.MeshStandardMaterial({ color: '#f2c443', roughness: 0.7 }),
    egg: new THREE.MeshStandardMaterial({ color: '#fbf3e4', roughness: 0.5 }),
    yolk: new THREE.MeshStandardMaterial({ color: '#ffb81c', roughness: 0.3 }),
    sail: new THREE.MeshStandardMaterial({ color: '#ff8a5a', roughness: 0.9, side: THREE.DoubleSide }),
  };
  return M;
}

// one add-on, built round the origin, placed by the caller
function addon(id, M, shape) {
  const g = new THREE.Group(); g.userData.id = id;
  const top = H[shape] ?? 0.43, low = LOW[shape] ?? -0.43;
  const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  switch (id) {
    case 'spring': {
      const pts = []; for (let i = 0; i <= 80; i++) { const a = i / 80 * Math.PI * 10; pts.push(new THREE.Vector3(Math.cos(a) * 0.16, -i / 80 * 0.32, Math.sin(a) * 0.16)); }
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.025, 6), M.steel, 0, low, 0); break;
    }
    case 'wheel': for (const [x, z] of [[-0.42, 0.42], [0.42, 0.42], [-0.42, -0.42], [0.42, -0.42]]) {
      const w = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.1, 24), M.tyre, x, low - 0.05, z); w.rotation.x = Math.PI / 2;
      const hub = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 16), M.yellow, x, low - 0.05, z); hub.rotation.x = Math.PI / 2;
    } break;
    case 'pipe': { const p = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.55, 16), M.steel, 0.2, top + 0.22, 0); mesh(new THREE.TorusGeometry(0.08, 0.025, 8, 20), M.dark, 0.2, top + 0.5, 0).rotation.x = Math.PI / 2; void p; break; }
    case 'pump': { mesh(new THREE.BoxGeometry(0.22, 0.26, 0.22), M.steel, -0.75, 0, 0); mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.3, 10), M.dark, -0.75, 0.25, 0); mesh(new THREE.SphereGeometry(0.06, 12, 8), M.pink, -0.75, 0.42, 0); break; }
    case 'fan': {
      const hub = new THREE.Group(); hub.position.set(0, 0.05, -0.72); g.add(hub);
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 16), M.dark); c.rotation.x = Math.PI / 2; hub.add(c);
      for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.3, 0.015), M.yellow); b.position.set(Math.sin(i * 2.094) * 0.16, Math.cos(i * 2.094) * 0.16, 0); b.rotation.z = -i * 2.094; b.rotation.y = 0.35; hub.add(b); }
      g.userData.spin = hub; break;
    }
    case 'chute': {
      const c = mesh(new THREE.SphereGeometry(0.62, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2.6), M.sail, 0, top + 0.75, 0); c.scale.y = 0.55;
      const lineM = new THREE.LineBasicMaterial({ color: '#5a4030' });
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(Math.cos(a) * 0.5, top + 0.75, Math.sin(a) * 0.5), new THREE.Vector3(0, top, 0)]); g.add(new THREE.Line(geo, lineM)); }
      break;
    }
    case 'spines': { const geo = new THREE.ConeGeometry(0.03, 0.28, 6); for (let i = 0; i < 46; i++) { const u = i / 46, a = i * 2.4, r = Math.sqrt(u); const dir = new THREE.Vector3(Math.cos(a) * r * 0.7, 0.75, Math.sin(a) * r * 0.7).normalize(); const m = mesh(geo, M.spine, dir.x * 0.42, top - 0.05 + dir.y * 0.1, dir.z * 0.42); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); } break; }
    case 'scales': { const geo = new THREE.SphereGeometry(0.11, 8, 5); for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) { for (const s of [-1, 1]) { const m = mesh(geo, M.scale, s * 0.5, 0.25 - r * 0.2, -0.3 + i * 0.12 + (r % 2) * 0.06); m.scale.set(0.45, 1, 0.9); } } break; }
    case 'suction': { const geo = new THREE.CylinderGeometry(0.07, 0.09, 0.07, 16); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; mesh(geo, M.pink, Math.cos(a) * 0.3, low - 0.03, Math.sin(a) * 0.3); } break; }
    case 'bigears': for (const s of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(0.34, 18, 12), M.clay, s * 0.62, top * 0.5 + 0.25, 0); e.scale.set(0.12, 1.15, 0.7); e.rotation.z = s * -0.35; } break;
    case 'honeycomb': { const geo = new THREE.CylinderGeometry(0.09, 0.09, 0.08, 6); for (let q = -2; q <= 2; q++) for (let r = -1; r <= 1; r++) { const x = q * 0.16 + (r % 2) * 0.08, z = r * 0.14; if (x * x + z * z < 0.2) mesh(geo, M.hive, x, top + 0.04, z); } break; }
    case 'shell': { const s = mesh(new THREE.SphereGeometry(0.66, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.shell, 0, Math.max(0, top - 0.42), 0); s.scale.set(1, 0.75, 1); break; }
    case 'softwing': for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const f = mesh(new THREE.SphereGeometry(0.22, 12, 6), M.feather, s * (0.55 + i * 0.05), 0.1 - i * 0.08, -0.2 + i * 0.12); f.scale.set(0.1, 0.5, 1); f.rotation.z = s * (0.5 + i * 0.15); } break;
    case 'ribs': { const geo = new THREE.BoxGeometry(0.5, 0.05, 0.05); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const m = mesh(geo, M.leaf, Math.cos(a) * 0.45, low - 0.03, Math.sin(a) * 0.45); m.rotation.y = -a; } mesh(new THREE.TorusGeometry(0.7, 0.04, 6, 40), M.leaf, 0, low - 0.03, 0).rotation.x = Math.PI / 2; break; }
    case 'widefoot': { const geo = new THREE.CylinderGeometry(0.2, 0.24, 0.07, 20); for (const [x, z] of [[-0.38, 0.32], [0.38, 0.32], [-0.38, -0.32], [0.38, -0.32]]) mesh(geo, M.clay, x, low - 0.04, z); break; }
    case 'airtunnels': { const geo = new THREE.CylinderGeometry(0.05, 0.08, 0.36, 10, 1, true); for (const [x, z] of [[0, 0], [0.18, 0.1], [-0.16, -0.12]]) mesh(geo, M.clay, x, top + 0.15, z); break; }
    case 'sharkskin': { const geo = new THREE.BoxGeometry(0.6, 0.012, 0.02); for (let i = 0; i < 9; i++) mesh(geo, M.shark, 0, top - 0.01, -0.36 + i * 0.09); const f = mesh(new THREE.ConeGeometry(0.12, 0.3, 4), M.shark, 0, top + 0.13, 0); f.scale.z = 0.25; break; }
    case 'fogcatch': { const geo = new THREE.SphereGeometry(0.045, 8, 6); for (let i = 0; i < 24; i++) { const a = i * 2.4, r = Math.sqrt(i / 24) * 0.38; mesh(geo, M.bump, Math.cos(a) * r, top + 0.02, Math.sin(a) * r); } mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshStandardMaterial({ color: '#bfe8ff', roughness: 0.05, metalness: 0.2 }), 0.12, top + 0.07, 0.1); break; }
    case 'glow': { for (const [x, z] of [[-0.3, 0.45], [0.3, 0.45], [0, -0.45]]) mesh(new THREE.SphereGeometry(0.07, 12, 8), M.glow, x, 0.2, z); g.userData.glow = true; break; }
    case 'reflect': for (const s of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(0.1, 16, 10), M.reflect, s * 0.18, 0.15, 0.55); e.scale.z = 0.4; } break;
    case 'uvglow': for (let i = 0; i < 3; i++) mesh(new THREE.BoxGeometry(0.7, 0.03, 0.03), M.uv, 0, -0.15 + i * 0.12, 0.5); break;
    case 'buzz': { mesh(new THREE.BoxGeometry(0.3, 0.12, 0.24), M.hive, 0, top + 0.08, 0); mesh(new THREE.BoxGeometry(0.3, 0.12, 0.24), M.hive, 0, top + 0.21, 0); mesh(new THREE.BoxGeometry(0.36, 0.04, 0.3), M.dark, 0, top + 0.29, 0); g.userData.bees = true; break; }
    default: break;
  }
  return g;
}

// the whole prototype, its lowest point at y = 0
export function buildProto(spec, M) {
  const p = protoOk(spec), root = new THREE.Group();
  const mat = M[p.mat] || M.wood;
  const body = new THREE.Mesh(bodyGeo(p.shape), mat); body.castShadow = true; body.receiveShadow = true; root.add(body);
  if (p.shape === 'dome') { const base = new THREE.Mesh(new THREE.CircleGeometry(0.62, 32), mat); base.rotation.x = Math.PI / 2; root.add(base); }
  // eyes: every prototype gets two friendly dots on the front (a gentle touch; not a face of a person)
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), M.dark); const z = p.shape === 'plate' ? 0.5 : p.shape === 'tube' ? 0.37 : p.shape === 'cone' ? 0.3 : p.shape === 'dome' ? 0.5 : p.shape === 'ball' ? 0.52 : 0.43; e.position.set(s * 0.12, p.shape === 'dome' ? 0.25 : p.shape === 'plate' ? 0.12 : 0.1, z); if (!p.add.includes('reflect')) root.add(e); }
  const parts = [];
  for (const a of p.add) { const g = addon(a, M, p.shape); root.add(g); parts.push(g); }
  // stand on the ground
  const box = new THREE.Box3().setFromObject(root); root.position.y = -box.min.y;
  const wrap = new THREE.Group(); wrap.add(root); wrap.userData = { parts, height: box.max.y - box.min.y, mat: p.mat };
  return wrap;
}

// ── a small stage: one renderer, a warm studio, the prototype and the test stations' props
export function createStage(canvas, { weak = false } = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: !weak, alpha: true }); } catch (e) { return null; }
  renderer.setPixelRatio(Math.min(weak ? 1 : 1.5, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = !weak; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(34, 1, 0.05, 50); cam.position.set(2.2, 1.7, 2.8);
  scene.add(new THREE.HemisphereLight('#fff6e0', '#6a4a2a', 1.25));
  const sun = new THREE.DirectionalLight('#fff0d0', 2.2); sun.position.set(2.5, 4, 2.5); sun.castShadow = !weak; sun.shadow.mapSize.set(512, 512); scene.add(sun);
  const M = makeMats();
  const floorMat = new THREE.MeshStandardMaterial({ color: '#d9b177', roughness: 0.9 });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(2.4, 48), floorMat); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const props = new THREE.Group(); scene.add(props);
  let proto = null, yaw = 0.5, spinOn = true, raf = 0, last = 0, lastDraw = 0, anim = null, alive = true, look = new THREE.Vector3(0, 0.5, 0);
  const fx = [];   // little things that live a while (bubbles, streaks, yolk drops)

  function show(spec) {
    if (proto) { scene.remove(proto); dispose(proto); }
    proto = buildProto(spec, M); scene.add(proto); anim = null; resetProps();
    look.set(0, Math.max(0.35, proto.userData.height * 0.45), 0);
    return proto;
  }
  function dispose(o) { o.traverse((m) => { if (m.geometry) m.geometry.dispose(); }); }
  function clearFx() { for (const f of fx) { props.remove(f.o); if (f.o.geometry) f.o.geometry.dispose(); } fx.length = 0; }
  function resetProps() { clearFx(); while (props.children.length) { const c = props.children.pop(); dispose(c); } floorMat.color.set('#d9b177'); }
  // the stations' look
  const tank = () => { const w = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.0, 1.8), new THREE.MeshStandardMaterial({ color: '#4fa8d8', transparent: true, opacity: 0.35, roughness: 0.1 })); w.position.y = 0.5; props.add(w); return w; };
  const sandBed = () => { floorMat.color.set('#e8c98a'); const d = new THREE.Mesh(new THREE.CircleGeometry(1.6, 40), new THREE.MeshStandardMaterial({ color: '#efd49a', roughness: 1 })); d.rotation.x = -Math.PI / 2; d.position.y = 0.005; props.add(d); };
  const lamp = () => { const l = new THREE.PointLight('#ff6a2a', 6, 4); l.position.set(0, 2.2, 0.6); props.add(l); const s = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 10), new THREE.MeshStandardMaterial({ color: '#ffb070', emissive: '#ff6a2a', emissiveIntensity: 2 })); s.position.copy(l.position); props.add(s); return l; };
  const tower = () => { const m = new THREE.MeshStandardMaterial({ color: '#8a5a2a', roughness: 0.8 }); for (const x of [-0.9, 0.9]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.6, 0.1), m); p.position.set(x, 1.8, -0.6); props.add(p); } const b = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.1, 0.1), m); b.position.set(0, 3.6, -0.6); props.add(b); };
  const tunnel = () => { const t = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 3.2, 32, 1, true), new THREE.MeshStandardMaterial({ color: '#cfe8f5', transparent: true, opacity: 0.22, side: THREE.DoubleSide })); t.rotation.z = Math.PI / 2; t.position.y = 0.7; props.add(t); };
  const egg = () => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), M.egg); e.scale.y = 1.3; e.position.set(0, proto.userData.height + 0.13, 0); proto.add(e); return e; };

  // a test: the props, then the prototype's act (pass: it holds; fail: the funny failure). Resolves when done.
  function play(test, pass) {
    resetProps(); if (!proto) return Promise.resolve();
    proto.position.set(0, 0, 0); proto.rotation.set(0, 0, 0); proto.scale.set(1, 1, 1);
    const P = proto, t0 = performance.now(); let eggM = null; yaw = 0.35;   // a front view: the stations' props stand behind
    if (test === 'water') tank(); if (test === 'sand') sandBed(); if (test === 'heat') lamp(); if (test === 'drop') { tower(); eggM = egg(); } if (test === 'wind') tunnel();
    const DUR = 3200;
    return new Promise((res) => {
      anim = (now) => {
        const t = Math.min(1, (now - t0) / DUR), s = (now - t0) / 1000;
        if (test === 'wind') {
          if (Math.random() < 0.6) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.015, 0.015), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 })); st.position.set(1.6, 0.2 + Math.random() * 1.0, -0.6 + Math.random() * 1.2); props.add(st); fx.push({ o: st, v: [-4, 0, 0], life: 0.8 }); }
          if (pass) P.rotation.z = Math.sin(s * 9) * 0.04; else if (t > 0.3) { const k = (t - 0.3) / 0.7; P.position.set(-k * k * 4, k * 1.6, 0); P.rotation.z = k * 6; P.rotation.x = k * 3; }
        } else if (test === 'water') {
          if (pass) { P.position.y = 0.55 + Math.sin(s * 3) * 0.05 - (t < 0.2 ? (0.2 - t) * 2 : 0); P.rotation.z = Math.sin(s * 2) * 0.06; }
          else { P.position.y = Math.max(0.02, 0.8 - t * 1.2); P.rotation.z = t * 0.6; if (Math.random() < 0.35) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.04 + Math.random() * 0.04, 8, 6), new THREE.MeshStandardMaterial({ color: '#e8f8ff', transparent: true, opacity: 0.8 })); b.position.set((Math.random() - 0.5) * 0.5, P.position.y + 0.3, (Math.random() - 0.5) * 0.5); props.add(b); fx.push({ o: b, v: [0, 1.2, 0], life: 0.9 }); } }
        } else if (test === 'heat') {
          if (pass) P.position.y = Math.sin(s * 2) * 0.02;
          else { const k = Math.min(1, t * 1.6); P.scale.set(1 + k * 0.35 + Math.sin(s * 14) * 0.04 * k, 1 - k * 0.2, 1 + k * 0.35); }
        } else if (test === 'sand') {
          if (pass) { P.position.y = 0; P.rotation.z = Math.sin(s * 5) * 0.02; } else P.position.y = -Math.min(1, t * 1.3) * Math.max(0.6, P.userData.height * 0.8);
        } else if (test === 'drop') {
          const fall = Math.min(1, t * 2.2), y = 3.2 * (1 - fall * fall);
          if (fall < 1) P.position.y = y;
          else if (pass) { const b = (t - 0.455) * 6; P.position.y = Math.abs(Math.sin(b * 3)) * 0.4 * Math.exp(-b * 1.2); }
          else if (eggM && !eggM.userData.broke) {
            eggM.userData.broke = true; eggM.visible = false;
            const halfGeo = new THREE.SphereGeometry(0.11, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
            for (const sg of [-1, 1]) { const h = new THREE.Mesh(halfGeo, M.egg); h.position.copy(eggM.position).add(P.position); h.rotation.x = sg > 0 ? 0 : Math.PI; props.add(h); fx.push({ o: h, v: [sg * 0.8, 1.4, 0.3], life: 1.8, grav: true, spin: sg * 6 }); }
            const y0 = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20), M.yolk); y0.rotation.x = -Math.PI / 2; y0.position.set(0.25, 0.01, 0.35); props.add(y0);
            P.scale.y = 0.85;
          }
        } else if (test === 'noise') {
          if (Math.random() < (pass ? 0.06 : 0.25)) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.02, 6, 40), new THREE.MeshBasicMaterial({ color: pass ? '#7cd8a0' : '#ff5a4a', transparent: true, opacity: 0.8 })); r.position.y = 0.5; r.rotation.y = Math.random() * 3; props.add(r); fx.push({ o: r, grow: pass ? 0.8 : 2.4, life: 1.1 }); }
          if (!pass) { P.position.x = Math.sin(s * 40) * 0.04; P.rotation.z = Math.sin(s * 31) * 0.06; }
        }
        if (t >= 1 && test !== 'drop') { anim = null; res(); }
        if (test === 'drop' && t >= 1) { anim = null; res(); }
      };
    });
  }
  function frame(now) {
    if (!alive) return; raf = requestAnimationFrame(frame);
    if (canvas.offsetParent === null || document.hidden) { last = now; return; }
    if (now - lastDraw < 33) return; lastDraw = now;
    const dt = Math.min(0.06, (now - (last || now)) / 1000); last = now;
    const r = canvas.getBoundingClientRect(), w = Math.max(60, r.width | 0), h = Math.max(60, r.height | 0);
    if (canvas.width !== Math.round(w * renderer.getPixelRatio())) { renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    if (spinOn && !anim) yaw += dt * 0.45;
    const dist = 3.3 + (proto ? Math.max(0, proto.userData.height - 1) : 0);
    const camY = anim && stageView === 'drop' ? 2.2 : 1.6;
    cam.position.set(Math.sin(yaw) * dist, camY, Math.cos(yaw) * dist); cam.lookAt(anim && stageView === 'drop' ? new THREE.Vector3(0, 1.3, 0) : look);
    if (proto) for (const p of proto.userData.parts) { if (p.userData.spin) p.userData.spin.rotation.z += dt * 14; if (p.userData.glow) p.children.forEach((m, i) => { m.scale.setScalar(1 + Math.sin(now / 300 + i) * 0.15); }); }
    if (anim) anim(now);
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i]; f.life -= dt;
      if (f.v) { f.o.position.x += f.v[0] * dt; f.o.position.y += f.v[1] * dt; f.o.position.z += f.v[2] * dt; if (f.grav) { f.v[1] -= 6 * dt; if (f.o.position.y < 0.05) { f.o.position.y = 0.05; f.v[1] *= -0.3; f.v[0] *= 0.6; } } }
      if (f.spin) f.o.rotation.z += f.spin * dt;
      if (f.grow) { const k = 1 + (1.1 - f.life) * f.grow; f.o.scale.setScalar(k); f.o.material.opacity = Math.max(0, f.life); }
      if (f.life <= 0 && !f.grav) { props.remove(f.o); f.o.geometry.dispose(); f.o.material.dispose && f.o.material !== M.egg && f.o.material.dispose(); fx.splice(i, 1); }
    }
    renderer.render(scene, cam);
  }
  let stageView = 'build';
  // drag to turn
  let drag = null;
  const down = (e) => { drag = { x: e.clientX, yaw }; spinOn = false; };
  const move = (e) => { if (drag) yaw = drag.yaw - (e.clientX - drag.x) * 0.012; };
  const up = () => { drag = null; };
  canvas.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  raf = requestAnimationFrame(frame);
  return {
    show, play: (test, pass) => { stageView = test; return play(test, pass).then(() => { stageView = 'build'; }); },
    spin: (on) => { spinOn = !!on; },
    snapshot: (size = 160) => { try { renderer.render(scene, cam); const c = document.createElement('canvas'); c.width = size; c.height = size; const x = c.getContext('2d'); const s = Math.min(canvas.width, canvas.height); x.drawImage(canvas, (canvas.width - s) / 2, (canvas.height - s) / 2, s, s, 0, 0, size, size); return c.toDataURL('image/webp', 0.8); } catch (e) { return ''; } },
    get busy() { return !!anim; },
    dispose() {
      alive = false; cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      resetProps(); if (proto) dispose(proto);
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      Object.values(M).forEach((m) => m.dispose()); floorMat.dispose();
      renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) { }
    },
  };
}
export const matColor = (id) => (materialOf(id) || {}).col || '#c58a4a';
