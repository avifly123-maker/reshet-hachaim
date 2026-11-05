// מירוץ הרובוטים in 3D (1.4.4 set 7): the course as a lane through five small landscapes, one per island, with a start
// gate and a finish arch; the robot is the child's chosen one (the robot workshop's Blender parts, as in its missions),
// and the best run so far drives beside it as a see-through ghost. The cells' ground (mud, hills, logs, water) is the
// lab's own (three/field-cells.js); trees, rocks and the lane's margins are drawn here, each island in its own colours.
//   const R = createRace3D(canvas, { level, segs, kids })
//   R.setRobot(build)  R.play(path, ghost, { speed, onEnd })  R.reset()  R.view()  R.isPlaying()  R.dispose()
//   path / ghost: [[tick, x, y, dir], ...] (race-model.js pathOf); the failure shows as a shake at the last place
import * as THREE from 'three';
import { fieldCells, makeBoulder } from '../robolab/three/field-cells.js';
import { buildTool, hasBlenderTools, farEyes } from '../robolab/three/parts3d.js';
import { makeTool } from '../robolab/three/models.js';
import { wkLook } from '../data/robolab/workshop-look.js';
import { SEGMENTS } from '../data/weekly/race.js';
import { SEG_W } from './race-model.js';

const CS = 2.4, TICK = 0.2;
// each island's look: its ground, the grass at the lane's margins, its trees
const LOOK = {
  amazon: { ground: ['#3f6a2a', '#2f5420'], edge: '#24401a', leaf: ['#2f7a2a', '#1f5a22', '#3a8a32'], trunk: '#5a3a22', tree: 'tall', sky: '#bfe0c8' },
  grove: { ground: ['#8a9a4a', '#6f8040'], edge: '#5a6a34', leaf: ['#5a7a2a', '#6a8a36', '#4a6a24'], trunk: '#6a4a2a', tree: 'round', sky: '#cfe4f2' },
  reef: { ground: ['#e8d8a8', '#d8c48e'], edge: '#cdb27a', leaf: ['#3a9a4a', '#4aa85a', '#2a8a3a'], trunk: '#8a6a3a', tree: 'palm', sky: '#bfe8f4' },
  desert: { ground: ['#e8c486', '#d6a866'], edge: '#c8955a', leaf: ['#7a8a4a', '#8a9a5a', '#6a7a3a'], trunk: '#7a5a3a', tree: 'shrub', sky: '#f4dcb0' },
  savanna: { ground: ['#c8a85a', '#b0904a'], edge: '#9a7a3a', leaf: ['#6a8a2a', '#7a9a3a', '#5a7a24'], trunk: '#5a3a1e', tree: 'acacia', sky: '#f2d8a8' },
};
const rng = (seed) => { let s = seed % 2147483647 || 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };
const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });

function groundTex(a, b, seed) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = a; g.fillRect(0, 0, 128, 128); const r = rng(seed);
  for (let i = 0; i < 260; i++) { g.fillStyle = i % 3 ? b : 'rgba(255,255,255,.12)'; g.globalAlpha = 0.25 + r() * 0.4; g.beginPath(); g.arc(r() * 128, r() * 128, 1 + r() * 5, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function signTex(text, bg, fg = '#fff', w = 512, h = 128) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = bg; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 26); g.fill(); g.lineWidth = 8; g.strokeStyle = 'rgba(255,255,255,.7)'; g.stroke();
  g.fillStyle = fg; g.font = `900 ${Math.round(h * 0.46)}px Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl'; g.fillText(text, w / 2, h / 2 + 3);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function checkerTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
  for (let y = 0; y < 2; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#1a1a1a' : '#fafafa'; g.fillRect(x * 32, y * 32, 32, 32); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// a tree of an island's kind (no cross shapes: trunks and round crowns only)
function makeTree(look, r) {
  const g = new THREE.Group(), trunk = M(look.trunk, { roughness: 0.95 }), leaf = () => M(look.leaf[(r() * 3) | 0], { roughness: 0.9, flatShading: true });
  const add = (geo, m, x, y, z, s = [1, 1, 1]) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.scale.set(...s); o.castShadow = true; g.add(o); return o; };
  const k = 0.85 + r() * 0.35;
  if (look.tree === 'tall') { add(new THREE.CylinderGeometry(0.16, 0.26, 3.4, 7), trunk, 0, 1.7, 0); for (let i = 0; i < 4; i++) add(new THREE.IcosahedronGeometry(0.95 - i * 0.12, 0), leaf(), (r() - 0.5) * 0.8, 2.6 + i * 0.55, (r() - 0.5) * 0.8, [1.2, 0.7, 1.2]); }
  else if (look.tree === 'round') { add(new THREE.CylinderGeometry(0.14, 0.22, 1.6, 7), trunk, 0, 0.8, 0); add(new THREE.IcosahedronGeometry(1.05, 1), leaf(), 0, 2, 0, [1.1, 0.85, 1.1]); add(new THREE.IcosahedronGeometry(0.6, 0), leaf(), 0.5, 2.2, 0.3); }
  else if (look.tree === 'acacia') { add(new THREE.CylinderGeometry(0.1, 0.18, 2.2, 6), trunk, 0, 1.1, 0).rotation.z = 0.12; add(new THREE.CylinderGeometry(1.5, 1.1, 0.35, 10), leaf(), 0.2, 2.3, 0); add(new THREE.CylinderGeometry(0.9, 0.7, 0.25, 9), leaf(), -0.5, 2.05, 0.4); }
  else if (look.tree === 'palm') { const t = add(new THREE.CylinderGeometry(0.1, 0.16, 2.6, 6), trunk, 0, 1.3, 0); t.rotation.z = 0.15; for (let i = 0; i < 5; i++) { const f = add(new THREE.ConeGeometry(0.22, 1.5, 4), leaf(), 0.2, 2.6, 0); f.rotation.set(Math.cos(i * 1.256) * 1.2, 0, Math.sin(i * 1.256) * 1.2); f.position.x += Math.sin(i * 1.256) * 0.5; f.position.z += -Math.cos(i * 1.256) * 0.5; } }
  else { for (let i = 0; i < 3; i++) add(new THREE.IcosahedronGeometry(0.45 + r() * 0.2, 0), leaf(), (r() - 0.5) * 0.7, 0.35, (r() - 0.5) * 0.7, [1, 0.7, 1]); }
  g.scale.setScalar(k); g.rotation.y = r() * 6.28;
  return g;
}

export function createRace3D(canvas, { level, segs, kids = false }) {
  const Q = (() => { try { return (window.__app && window.__app.quality) || 'medium'; } catch (e) { return 'medium'; } })();
  const weak = Q === 'min' || Q === 'low';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !weak, alpha: false });
  renderer.setPixelRatio(Math.min(weak ? 1 : 1.5, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = !weak; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const rows = level.map.rows, Wd = rows[0].length;
  const wx = (x) => (x - (Wd - 1) / 2) * CS, wz = (y) => (y - 1) * CS;
  // sky: a soft gradient, warm at the horizon
  { const c = document.createElement('canvas'); c.width = 2; c.height = 256; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#6aa8e0'); gr.addColorStop(0.55, '#bfe0f2'); gr.addColorStop(1, '#f4e2c0'); g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t; }
  scene.fog = new THREE.Fog('#dfe8e4', 40, 110);
  scene.add(new THREE.HemisphereLight('#fff6e4', '#5a6a3a', 1.3));
  const sun = new THREE.DirectionalLight('#fff0d4', 2.4); sun.position.set(-12, 22, -14); sun.castShadow = !weak;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 70 }); scene.add(sun, sun.target);
  const world = new THREE.Group(); scene.add(world);
  // the five landscapes: a wide ground under each stretch, a margin of its own trees and rocks, a sign at its start
  segs.forEach((id, i) => {
    const S = SEGMENTS[id], look = LOOK[S.zone], r = rng(i * 97 + id.length * 13);
    const x0 = wx(1 + i * SEG_W) - CS / 2, w = SEG_W * CS;
    const tex = groundTex(look.ground[0], look.ground[1], i + 3); tex.repeat.set(w / 6, 22 / 6);
    const gnd = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.02, 22), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
    gnd.rotation.x = -Math.PI / 2; gnd.position.set(x0 + w / 2, -0.01, 0); gnd.receiveShadow = true; world.add(gnd);
    // the lane: a slightly paler band with low stone curbs on both sides
    const lane = new THREE.Mesh(new THREE.PlaneGeometry(w, CS * 3 + 0.4), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.1, roughness: 1, depthWrite: false }));
    lane.rotation.x = -Math.PI / 2; lane.position.set(x0 + w / 2, 0.005, 0); world.add(lane);
    for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, 0.22), M(look.edge, { roughness: 0.95 })); c.position.set(x0 + w / 2, 0.09, s * (CS * 1.5 + 0.2)); c.receiveShadow = true; world.add(c); }
    for (let k = 0; k < (weak ? 5 : 10); k++) {   // the margins: trees far, rocks and bushes near
      // the far side gets the trees; the camera's side only low rocks near the curb, so nothing hides the robot
      const far = r() < 0.7, z = far ? CS * 1.8 + 1 + r() * 6 : -(CS * 1.5 + 0.9 + r() * 1.2), x = x0 + r() * w;
      const isTree = far && r() < 0.8, o = isTree ? makeTree(look, r) : makeBoulder(r);
      if (!isTree) o.scale.multiplyScalar(far ? 0.7 : 0.4);
      o.position.set(x, 0, z); world.add(o);
    }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), new THREE.MeshBasicMaterial({ map: signTex(kids ? S.name.k : S.name.f, look.trunk), transparent: true }));
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 6), M('#6a4a2a')); post.position.set(x0 + 0.4, 0.9, -CS * 1.5 - 0.9); world.add(post);
    sign.position.set(x0 + 0.4, 1.7, -CS * 1.5 - 0.86); sign.rotation.y = Math.PI; world.add(sign);
  });
  // start and finish ground (plain earth), gate and arch
  for (const [x, col] of [[0, '#8a7a5a'], [Wd - 1, '#8a7a5a']]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(CS, 22), M(col, { roughness: 1 })); p.rotation.x = -Math.PI / 2; p.position.set(wx(x), -0.012, 0); p.receiveShadow = true; world.add(p); }
  function arch(x, label, colour) {
    const g = new THREE.Group(), m = M(colour, { roughness: 0.5, metalness: 0.2 });
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 3.2, 10), m); p.position.set(0, 1.6, s * (CS * 1.5 + 0.3)); p.castShadow = true; g.add(p); }
    const ban = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, CS * 3 + 0.6), [new THREE.MeshBasicMaterial({ map: signTex(label, colour) }), new THREE.MeshBasicMaterial({ map: signTex(label, colour) }), m, m, m, m]);
    ban.position.y = 3.1; g.add(ban);
    const chk = new THREE.Mesh(new THREE.PlaneGeometry(CS * 3 + 0.6, 0.3), new THREE.MeshBasicMaterial({ map: checkerTex(), side: THREE.DoubleSide })); chk.rotation.y = Math.PI / 2; chk.position.y = 2.55; g.add(chk);
    g.position.x = x; world.add(g); return g;
  }
  arch(wx(0) + CS * 0.45, kids ? 'הַתְחָלָה' : 'התחלה', '#2a8a6a');
  const finish = arch(wx(Wd - 1) + CS * 0.3, kids ? 'סִיּוּם' : 'סיום', '#c8402f');
  // the course's cells: the lab's ground for mud, hills, logs and water; trees, rocks and the river here
  const FC = fieldCells({ rows, CS, wx, wz, ground: () => 0, sea: false });
  world.add(FC.group);
  const segAt = (x) => SEGMENTS[segs[Math.max(0, Math.min(4, Math.floor((x - 1) / SEG_W)))]];
  const r0 = rng(5);
  const river = new THREE.MeshStandardMaterial({ color: '#3a7a9a', roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.9 });
  const sand = new THREE.MeshStandardMaterial({ color: '#f0cf8e', roughness: 1 });
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const X = wx(x), Z = wz(y), look = LOOK[segAt(x).zone];
    if (ch === 'T') { const t = makeTree(look, r0); t.position.set(X, 0, Z); world.add(t); }
    else if (ch === 'R') { const b = makeBoulder(r0); b.scale.setScalar(1.1); b.position.set(X, 0, Z); world.add(b); }
    else if (ch === '#') { const w = new THREE.Mesh(new THREE.PlaneGeometry(CS, CS), river); w.rotation.x = -Math.PI / 2; w.position.set(X, 0.02, Z); world.add(w); }
    else if (ch === 's') { const d = new THREE.Mesh(new THREE.SphereGeometry(CS * 0.62, 14, 8, 0, 6.29, 0, 1.2), sand); d.scale.y = 0.22; d.position.set(X, -0.02, Z); d.receiveShadow = true; world.add(d); }
  }));

  // the robots: the chosen one, and the ghost of the best run
  let robot = null, ghost = null;
  function robotOf(build, ghostly) {
    let g = null;
    if (hasBlenderTools()) { const inner = build && buildTool(wkLook(build)); if (inner) {
      const bb = new THREE.Box3().setFromObject(inner), sz = bb.getSize(new THREE.Vector3()); inner.position.y = -bb.min.y;
      g = new THREE.Group(); g.add(inner); g.scale.setScalar(1.9 * Math.min(1.3, 1.05 / Math.max(0.5, sz.x, sz.z))); try { farEyes(inner); } catch (e) { } } }
    if (!g) g = makeTool('robot');
    if (ghostly) { const gm = new THREE.MeshBasicMaterial({ color: '#8fe8ff', transparent: true, opacity: 0.32, depthWrite: false }); g.traverse((o) => { if (o.isMesh) { o.material = gm; o.castShadow = false; } }); }
    else g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return g;
  }
  const place = (g, x, y, dir, t = 0) => { if (!g) return; const X = wx(x), Z = wz(y); g.position.set(X, FC.lift(X, Z), Z); g.rotation.y = Math.PI / 2 - dir * Math.PI / 2; };
  function setRobot(build) { if (robot) world.remove(robot); robot = robotOf(build, false); world.add(robot); place(robot, 0, 1, 1); if (ghost) place(ghost, 0, 1, 1); }
  // a run: keyframes by tick; the robot moves between them smoothly, turns the short way, rides over hills and logs
  let run = null, mode = 'follow', fx = [];
  const keys = (path) => [[0, 0, 1, 1], ...path.map((p) => [p[0] + 1, p[1], p[2], p[3]])];
  function at(K, tt) {
    let i = 0; while (i < K.length - 1 && K[i + 1][0] <= tt) i++;
    const a = K[i], b = K[Math.min(K.length - 1, i + 1)], u = b[0] > a[0] ? Math.max(0, Math.min(1, (tt - a[0]) / (b[0] - a[0]))) : 0;
    const s = u * u * (3 - 2 * u), X = wx(a[1]) + (wx(b[1]) - wx(a[1])) * s, Z = wz(a[2]) + (wz(b[2]) - wz(a[2])) * s;
    const ra = Math.PI / 2 - a[3] * Math.PI / 2; let rb = Math.PI / 2 - b[3] * Math.PI / 2; while (rb - ra > Math.PI) rb -= Math.PI * 2; while (ra - rb > Math.PI) rb += Math.PI * 2;
    return { X, Z, ry: ra + (rb - ra) * s, end: i >= K.length - 1 };
  }
  function play(path, ghostPath, { speed = 1, ok = false, onEnd = null, ghostBuild = null } = {}) {
    if (ghost) { world.remove(ghost); ghost = null; }
    if (ghostPath && ghostPath.length) { ghost = robotOf(ghostBuild, true); world.add(ghost); }
    run = { K: keys(path), G: ghostPath ? keys(ghostPath) : null, t: 0, speed, ok, onEnd, done: false, shake: 0 };
  }
  function reset() { run = null; if (ghost) { world.remove(ghost); ghost = null; } place(robot, 0, 1, 1); fx.forEach((f) => world.remove(f.o)); fx = []; }
  function confetti() {
    const cols = ['#ffd24a', '#ff6a5a', '#5ac8ff', '#7ad84a', '#ff9ad8'];
    for (let i = 0; i < (weak ? 30 : 80); i++) { const o = new THREE.Mesh(new THREE.CircleGeometry(0.09, 6), new THREE.MeshBasicMaterial({ color: cols[i % 5], side: THREE.DoubleSide }));
      o.position.set(finish.position.x + (Math.random() - 0.5), 3.3, (Math.random() - 0.5) * CS * 3); world.add(o);
      fx.push({ o, v: new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 3, (Math.random() - 0.5) * 3), life: 2.6 }); }
  }
  // the camera: behind and to the side of the robot (the course runs right to left on the screen), or the whole course
  const cam = new THREE.PerspectiveCamera(42, 2, 0.1, 200);
  const look = new THREE.Vector3(), camPos = new THREE.Vector3();
  let overview = 0;
  function aimCam(dt, first) {
    const p = robot ? robot.position : new THREE.Vector3(wx(0), 0, 0);
    let tp, tl;
    if (mode === 'all') { overview += dt * 0.08; const u = 0.5 - 0.5 * Math.cos(overview); const X = wx(0) + (wx(Wd - 1) - wx(0)) * u; tp = new THREE.Vector3(X - 3, 15, -17); tl = new THREE.Vector3(X + 1, 0, 0); }
    else { tp = new THREE.Vector3(p.x - 4, 9.5, p.z - 8.2); tl = new THREE.Vector3(p.x + 2.2, 0.4, p.z * 0.4 + 0.6); }
    if (first) { camPos.copy(tp); look.copy(tl); } else { camPos.lerp(tp, Math.min(1, dt * 2.5)); look.lerp(tl, Math.min(1, dt * 3)); }
    cam.position.copy(camPos); cam.lookAt(look);
    sun.position.set(look.x - 12, 22, -14); sun.target.position.copy(look);
  }
  let raf = 0, last = performance.now(), lastDraw = 0, disposed = false;
  function frame(now) {
    if (disposed) return; raf = requestAnimationFrame(frame);
    if (canvas.offsetParent === null || document.hidden) { last = now; return; }
    if (now - lastDraw < 33) return; lastDraw = now;
    const dt = Math.min(0.06, (now - last) / 1000); last = now;
    const r = canvas.getBoundingClientRect(), w = Math.max(80, r.width | 0), h = Math.max(60, r.height | 0);
    if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) { renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    if (run && !run.done) {
      run.t += dt / TICK * run.speed;
      const A = at(run.K, run.t); robot.position.set(A.X, FC.lift(A.X, A.Z), A.Z); robot.rotation.y = A.ry;
      if (run.G && ghost) { const G = at(run.G, run.t); ghost.position.set(G.X, FC.lift(G.X, G.Z) + 0.02, G.Z); ghost.rotation.y = G.ry; ghost.visible = !G.end || run.t < run.G[run.G.length - 1][0] + 3; }
      if (A.end && run.t > run.K[run.K.length - 1][0] + 0.4) {
        if (!run.ok && run.shake < 0.7) { run.shake += dt; robot.rotation.z = Math.sin(run.shake * 40) * 0.08 * (1 - run.shake / 0.7); }
        else { robot.rotation.z = 0; run.done = true; if (run.ok) confetti(); const f = run.onEnd; run.onEnd = null; if (f) setTimeout(f, run.ok ? 900 : 200); }
      }
    }
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.life -= dt; f.v.y -= 4 * dt; f.o.position.addScaledVector(f.v, dt); f.o.rotation.x += dt * 5; f.o.rotation.y += dt * 3; if (f.life <= 0) { world.remove(f.o); f.o.geometry.dispose(); fx.splice(i, 1); } }
    FC.update(dt); aimCam(dt, false);
    renderer.render(scene, cam);
  }
  aimCam(0, true); raf = requestAnimationFrame(frame);
  return {
    setRobot, play, reset,
    view: () => { mode = mode === 'follow' ? 'all' : 'follow'; overview = 0; return mode; },
    isPlaying: () => !!(run && !run.done),
    dispose: () => { disposed = true; cancelAnimationFrame(raf); try { FC.dispose(); } catch (e) { } scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) { } },
  };
}
