// 1.3.2 (area G): new technologies on the island, and רובו־דע flying in the forest while he speaks.
//
// Six devices, each one idea from real research (docs/sources.md "Technologies on the island"), procedural toy-like models
// in רובו־דע's colours (white shell, teal trim, cyan eyes) and one clear picture each:
//   canopybot   (amazon)  climbs a tall tree; a ring of light at every layer; counts who lives in each layer
//   lidar       (amazon)  takes off by itself, a fan of laser lines, a point cloud coloured by height (the light layers)
//   thermal     (grove)   flies at night; warm animals glow (birds and mammals; reptiles and insects stay cool)
//   firetower   (grove)   watches with a slow beam; a fire is found early: it stays smaller (an arc to the smoke)
//   reefspeaker (reef)    rings of sound; on a hurt reef young fish arrive
//   spawnbot    (reef)    at night: floating coral eggs, it sows young corals where the reef was hurt
// Experience mode (W.xp) shows the picture and one short line; the full mode also a number or a small graph. The words
// float over the device as a small card (`.tk-b`, src/ui/css/tech.css) for a few seconds; nothing is a toast.
// No cross shapes: no rods meet at right angles, rotors sit on a ring, nothing looks like a plus or a crosshair.
//
//   const tech = createTech({ W, env, scene, group, markers, camera, canvas, rig, reg, spawnPlant, spawnAnimal })
//   tech.model(id) → THREE.Group           tech.init(p, saved)    tech.tick(p, dt, rdt, t)    tech.save(p) → {}
//   tech.afterEventStart(e)                 (a fire is smaller with a tower, a spawning night with the robot)
//   tech.frame(rdt, t)                      the cards and רובו־דע (cheap when nothing shows)
//   tech.roboAt(vec3)                       רובו־דע's next bubble points at a spot in the world: he flies there
//   tech.removed(p), tech.dispose()
import * as THREE from 'three';
import { drawRoboFace } from '../ui/robo-face.js';
import { toolDef } from '../game/tool-defs.js';

export const TECH_IDS = new Set(['canopybot', 'lidar', 'thermal', 'firetower', 'reefspeaker', 'spawnbot']);
export const TECH_HOST = new Set(['canopybot']);   // hangs on a tree (like the forest listener)
// warm-blooded: birds and mammals glow in the thermal camera; reptiles, insects and others stay near the night's air
const COOL = new Set(['chameleon', 'agama', 'tortoise', 'gecko', 'frog', 'dartfrog', 'caiman', 'anaconda', 'boa', 'iguana', 'turtle']);
const YOUNG_FISH = ['butterflyfish', 'cleaner', 'goby', 'surgeonfish', 'parrotfish', 'clownfish'];
const CORAL_SOW = ['branching', 'table', 'firecoral', 'brain'];

// ─────────────────────────────────────────── materials and small parts
const C = { shell: '#f3f1ea', teal: '#2c9a92', tealD: '#1d5e66', dark: '#1d2b36', eye: '#8ff2ff' };
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.38, metalness: 0.05, ...o });
const glowM = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false, ...o });
const addM = (c, op) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide });
function mesh(geo, mat, cast = true) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; return m; }
// two round cyan eyes on a dark visor, looking along +z
function face(w = 0.5, h = 0.26) {
  const g = new THREE.Group();
  const v = mesh(new THREE.CapsuleGeometry(h / 2, w - h, 4, 12), std(C.dark, { roughness: 0.12 }), false); v.rotation.z = Math.PI / 2; v.scale.z = 0.5; g.add(v);
  const em = glowM(C.eye);
  for (const x of [-w * 0.22, w * 0.22]) { const e = mesh(new THREE.SphereGeometry(h * 0.22, 10, 8), em, false); e.scale.set(0.8, 1.2, 0.5); e.position.set(x, 0, h * 0.24); g.add(e); }
  return g;
}
// a soft round texture for points and glows
function dotTex(inner = 'rgba(255,255,255,1)', mid = 'rgba(255,255,255,.55)') {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 31); g.addColorStop(0, inner); g.addColorStop(0.45, mid); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
let DOT = null, HEAT = null;
const dot = () => DOT || (DOT = dotTex());
function heatTex() {
  if (HEAT) return HEAT;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 31);
  g.addColorStop(0, 'rgba(255,250,210,1)'); g.addColorStop(0.3, 'rgba(255,190,80,.95)'); g.addColorStop(0.62, 'rgba(255,90,50,.55)'); g.addColorStop(1, 'rgba(200,40,60,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  HEAT = new THREE.CanvasTexture(c); HEAT.colorSpace = THREE.SRGBColorSpace; return HEAT;
}

// ─────────────────────────────────────────── the models
// a round flying machine: a deck with four ducted rotors on a ring (no arms that could cross), a sensor underneath
function makeFlyer(kind) {
  const g = new THREE.Group();
  const shell = std(C.shell), teal = std(C.teal);
  const deck = mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.1, 32), shell); g.add(deck);
  const body = mesh(new THREE.SphereGeometry(0.62, 20, 14), shell); body.scale.set(1, 0.55, 1); body.position.y = 0.12; g.add(body);
  const ring = mesh(new THREE.TorusGeometry(1.0, 0.08, 8, 40), teal); ring.rotation.x = Math.PI / 2; g.add(ring);
  const f = face(0.5, 0.2); f.position.set(0, 0.2, 0.5); f.rotation.x = -0.25; g.add(f);
  const blade = new THREE.MeshBasicMaterial({ color: '#d8e6ee', transparent: true, opacity: 0.35, depthWrite: false });
  g.userData.rotors = [];
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2, x = Math.cos(a) * 1.0, z = Math.sin(a) * 1.0;
    const duct = mesh(new THREE.TorusGeometry(0.36, 0.06, 6, 24), teal); duct.rotation.x = Math.PI / 2; duct.position.set(x, 0.08, z); g.add(duct);
    const r = mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.02, 18), blade, false); r.position.set(x, 0.1, z); g.add(r); g.userData.rotors.push(r);
  }
  if (kind === 'lidar') {   // a spinning drum with a green window
    const drum = new THREE.Group(); drum.position.y = -0.3; g.add(drum);
    drum.add(mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.32, 20), std(C.dark, { roughness: 0.2 })));
    const win = mesh(new THREE.CylinderGeometry(0.265, 0.265, 0.09, 20, 1, true, 0, Math.PI * 0.9), glowM('#7dffb0'), false); drum.add(win);
    g.userData.drum = drum; g.userData.eye = new THREE.Vector3(0, -0.45, 0);
  } else {                  // a dark dome with a warm lens
    const dome = mesh(new THREE.SphereGeometry(0.3, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), std(C.dark, { roughness: 0.15 })); dome.position.y = -0.06; g.add(dome);
    const lens = mesh(new THREE.SphereGeometry(0.11, 12, 8), glowM('#ff9a4a'), false); lens.position.set(0, -0.3, 0.06); g.add(lens);
    g.userData.lens = lens; g.userData.eye = new THREE.Vector3(0, -0.36, 0);
  }
  return g;
}
// a landing pad: a white disc with teal circles (no letter, no plus)
function makePad() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(1.55, 1.7, 0.18, 36), std(C.shell, { roughness: 0.6 })));
  const r1 = mesh(new THREE.TorusGeometry(1.2, 0.07, 6, 40), std(C.teal), false); r1.rotation.x = Math.PI / 2; r1.position.y = 0.1; g.add(r1);
  const r2 = mesh(new THREE.TorusGeometry(0.55, 0.05, 6, 30), std(C.teal), false); r2.rotation.x = Math.PI / 2; r2.position.y = 0.1; g.add(r2);
  const led = mesh(new THREE.SphereGeometry(0.1, 10, 8), glowM('#ffcf5a'), false); led.position.set(1.42, 0.14, 0); g.add(led);
  g.userData.led = led;
  return g;
}
function makeDroneStation(kind) {
  const g = new THREE.Group();
  const pad = makePad(); g.add(pad);
  const fly = makeFlyer(kind); fly.position.y = 0.42; g.add(fly);
  g.userData = { flyer: fly, pad, led: pad.userData.led };
  return g;
}
// the canopy robot: a dock at the foot of the tree, a cable, and the climber hugging the trunk with a teal clamp ring
function makeCanopyBot() {
  const g = new THREE.Group();
  const shell = std(C.shell), teal = std(C.teal);
  const dock = new THREE.Group(); g.add(dock);
  dock.add(mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.42, 20), shell));
  const band = mesh(new THREE.TorusGeometry(0.46, 0.05, 6, 24), teal, false); band.rotation.x = Math.PI / 2; band.position.y = 0.12; dock.add(band);
  const climber = new THREE.Group(); g.add(climber);
  const body = mesh(new THREE.SphereGeometry(0.5, 20, 14), shell); body.scale.set(1, 0.85, 0.8); climber.add(body);
  const belt = mesh(new THREE.TorusGeometry(0.47, 0.05, 6, 28), teal, false); belt.rotation.x = Math.PI / 2; belt.scale.set(1, 0.8, 1); climber.add(belt);
  const f = face(0.48, 0.22); f.position.set(0, 0.08, 0.36); climber.add(f);
  const clamp = mesh(new THREE.TorusGeometry(1, 0.07, 6, 36, Math.PI * 1.6), teal); clamp.rotation.x = Math.PI / 2; clamp.rotation.z = Math.PI * 0.7; g.add(clamp);
  const cable = mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 6), std('#3b434c'), false); g.add(cable);
  const scan = [0, 1].map(() => { const r = mesh(new THREE.RingGeometry(0.92, 1, 56), addM('#8ff2ff', 0)); r.rotation.x = -Math.PI / 2; r.visible = false; g.add(r); return r; });
  g.userData = { dock, climber, clamp, cable, scan };
  return g;
}
// the fire lookout tower: a slim white column with teal bands, a round cabin with a dark window band, a teal cone roof,
// a small camera on top that turns slowly with a faint beam, and a warm alarm light
function makeTower() {
  const g = new THREE.Group();
  const shell = std(C.shell), teal = std(C.teal);
  const foot = mesh(new THREE.CylinderGeometry(0.85, 1.05, 0.5, 24), std('#cfc8b8', { roughness: 0.8 })); foot.position.y = 0.25; g.add(foot);
  const col = mesh(new THREE.CylinderGeometry(0.24, 0.42, 7.4, 16), shell); col.position.y = 4.1; g.add(col);
  for (const y of [2.4, 5.2]) { const b = mesh(new THREE.TorusGeometry(y < 3 ? 0.38 : 0.31, 0.06, 6, 22), teal, false); b.rotation.x = Math.PI / 2; b.position.y = y; g.add(b); }
  const cab = mesh(new THREE.CylinderGeometry(1.05, 0.95, 1.1, 24), shell); cab.position.y = 8.2; g.add(cab);
  const win = mesh(new THREE.CylinderGeometry(1.07, 1.07, 0.42, 24, 1, true), std('#24323c', { roughness: 0.1, emissive: '#ffcf8a', emissiveIntensity: 0.25 }), false); win.position.y = 8.32; g.add(win);
  const roof = mesh(new THREE.ConeGeometry(1.32, 0.8, 24), teal); roof.position.y = 9.15; g.add(roof);
  const lamp = mesh(new THREE.SphereGeometry(0.14, 10, 8), glowM('#ff7a3a'), false); lamp.position.y = 9.62; g.add(lamp);
  const head = new THREE.Group(); head.position.y = 7.55; g.add(head);
  const pod = mesh(new THREE.SphereGeometry(0.22, 14, 10), shell); pod.scale.set(1, 0.8, 1.3); pod.position.z = 1.1; head.add(pod);
  const lens = mesh(new THREE.SphereGeometry(0.09, 10, 8), glowM(C.eye), false); lens.position.set(0, 0, 1.36); head.add(lens);
  const beam = mesh(new THREE.ConeGeometry(2.6, 16, 24, 1, true), addM('#ffe8a8', 0.07), false); beam.rotation.x = -Math.PI / 2; beam.position.z = 1.3 + 8; head.add(beam);
  g.userData = { head, beam, lamp, win };
  return g;
}
// the healthy-reef speaker: a white dome on the sand, a short post, a round speaker that turns slowly
function makeSpeaker() {
  const g = new THREE.Group();
  const shell = std(C.shell), teal = std(C.teal);
  const dome = mesh(new THREE.SphereGeometry(0.75, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), shell); g.add(dome);
  const rim = mesh(new THREE.TorusGeometry(0.74, 0.06, 6, 30), teal, false); rim.rotation.x = Math.PI / 2; rim.position.y = 0.03; g.add(rim);
  const post = mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.7, 10), std('#9aa6a8')); post.position.y = 0.95; g.add(post);
  const turn = new THREE.Group(); turn.position.y = 1.45; g.add(turn);
  for (const s of [1, -1]) {   // two faces, back to back
    const drum = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.34, 26), shell); drum.rotation.x = Math.PI / 2; turn.add(drum);
    const ringT = mesh(new THREE.TorusGeometry(0.45, 0.06, 6, 26), teal, false); ringT.position.z = 0.17 * s; turn.add(ringT);
    const cone = mesh(new THREE.ConeGeometry(0.34, 0.16, 22, 1, true), std(C.dark, { roughness: 0.3, side: THREE.DoubleSide }), false); cone.rotation.x = s * Math.PI / 2; cone.position.z = 0.12 * s; turn.add(cone);
    const cap = mesh(new THREE.SphereGeometry(0.08, 10, 8), glowM(C.eye), false); cap.position.z = 0.12 * s; turn.add(cap);
  }
  const rings = [0, 1, 2].map(() => { const r = mesh(new THREE.TorusGeometry(1, 0.035, 6, 48), addM('#9ff6ff', 0), false); r.rotation.x = Math.PI / 2; r.visible = false; g.add(r); return r; });
  g.userData = { turn, rings };
  return g;
}
// the young-corals robot: a small white submarine with a teal nose ring, a funnel on its back, fins along its sides
function makeSpawnBot() {
  const g = new THREE.Group();
  const shell = std(C.shell), teal = std(C.teal);
  const sub = new THREE.Group(); sub.position.y = 0.6; g.add(sub);
  const body = mesh(new THREE.CapsuleGeometry(0.42, 1.0, 6, 18), shell); body.rotation.z = Math.PI / 2; sub.add(body);
  const nose = mesh(new THREE.TorusGeometry(0.4, 0.06, 6, 26), teal, false); nose.rotation.y = Math.PI / 2; nose.position.x = 0.5; sub.add(nose);
  const f = face(0.4, 0.2); f.rotation.y = Math.PI / 2; f.position.set(0.86, 0.06, 0); sub.add(f);
  for (const s of [1, -1]) { const fin = mesh(new THREE.BoxGeometry(0.7, 0.05, 0.3), teal); fin.position.set(-0.15, -0.12, s * 0.52); fin.rotation.x = s * 0.25; sub.add(fin); }
  const funnel = mesh(new THREE.CylinderGeometry(0.42, 0.14, 0.5, 20, 1, true), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }), false);
  funnel.position.set(-0.05, 0.62, 0); sub.add(funnel);
  const lip = mesh(new THREE.TorusGeometry(0.42, 0.04, 6, 24), teal, false); lip.rotation.x = Math.PI / 2; lip.position.set(-0.05, 0.87, 0); sub.add(lip);
  const prop = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 16), new THREE.MeshBasicMaterial({ color: '#d8e6ee', transparent: true, opacity: 0.4, depthWrite: false }), false);
  prop.rotation.z = Math.PI / 2; prop.position.x = -0.95; sub.add(prop);
  const base = mesh(new THREE.CylinderGeometry(0.7, 0.85, 0.16, 24), std('#cfc8b8', { roughness: 0.8 })); base.position.y = 0.08; g.add(base);
  g.userData = { sub, prop };
  return g;
}
export function techModel(id) {
  let g;
  if (id === 'canopybot') g = makeCanopyBot();
  else if (id === 'lidar' || id === 'thermal') { g = makeDroneStation(id); g.scale.setScalar(1.2); return g; }
  else if (id === 'firetower') { g = makeTower(); g.scale.setScalar(1.35); return g; }
  else if (id === 'reefspeaker') { g = makeSpeaker(); g.scale.setScalar(1.25); return g; }
  else if (id === 'spawnbot') { g = makeSpawnBot(); g.scale.setScalar(1.3); return g; }
  else return null;
  return g;
}

// ─────────────────────────────────────────── a point cloud / egg cloud (one buffer, reused)
function makeCloud(n, size, blending = THREE.NormalBlending) {
  const geo = new THREE.BufferGeometry();
  const P = new Float32Array(n * 3), Cc = new Float32Array(n * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color', new THREE.BufferAttribute(Cc, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setDrawRange(0, 0);
  const mat = new THREE.PointsMaterial({ size, map: dot(), vertexColors: true, transparent: true, opacity: 1, depthWrite: false, blending, toneMapped: false, sizeAttenuation: false, alphaTest: 0.02, fog: false });   // sizes in pixels: a snow of dots that reads at any distance
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 5;
  return { pts, P, Cc, geo, mat, n: 0, max: n };
}
const _c = new THREE.Color(), _c2 = new THREE.Color();
function heightColor(h, out) {   // low blue → teal → green → yellow → orange, like a LiDAR height map
  const k = Math.max(0, Math.min(1, h / 40));
  const stops = [[0, '#2a6fdb'], [0.25, '#2fc0a8'], [0.55, '#9be15d'], [0.8, '#ffd34d'], [1, '#ff9a3c']];
  for (let i = 1; i < stops.length; i++) if (k <= stops[i][0]) { const a = stops[i - 1], b = stops[i]; const u = (k - a[0]) / (b[0] - a[0]); out.set(a[1]).lerp(_c2.set(b[1]), u); return out; }
  return out.set('#ff9a3c');
}

// ─────────────────────────────────────────── the system
export function createTech(ctx) {
  const { W, env, scene, group, markers, camera, canvas, reg } = ctx;
  const _v = new THREE.Vector3(), _w = new THREE.Vector3();
  const alive = (e) => e && e.alive && !e.removed && !e.leaving && !e.dying;
  const xp = () => !!W.xp;
  const gY = (x, z) => env.heightAt(x, z);
  const fullName = (id) => reg.byId.get(id)?.name || '';

  // ───── the floating cards (HTML over the canvas: crisp Hebrew, RTL, the child's text size)
  const uiRoot = document.getElementById('ui');
  let boardsEl = null;
  const boards = new Map();   // device → { el, until, anchor() }
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  /** card = { title, line, num?, bars?: [{ label, n, c? }], spark?: [numbers] } (num / bars / spark only in the full mode) */
  function showBoard(p, card, secs = 8) {
    if (!uiRoot || W.research) return;
    if (!boardsEl) { boardsEl = document.createElement('div'); boardsEl.className = 'tk-boards'; uiRoot.appendChild(boardsEl); }
    let b = boards.get(p);
    if (!b) { const el = document.createElement('div'); el.className = 'tk-b'; boardsEl.appendChild(el); b = { el, until: 0 }; boards.set(p, b); }
    const full = !xp();
    let html = `<b>${esc(card.title)}</b><p>${esc(card.line)}</p>`;
    if (full && card.num) html += `<p class="tk-num">${esc(card.num)}</p>`;
    if (full && card.bars && card.bars.length) {
      const mx = Math.max(1, ...card.bars.map((x) => x.n));
      html += `<div class="tk-bars">${card.bars.map((x) => `<i style="--h:${(x.n / mx).toFixed(2)};--c:${x.c || '#2c9a92'}"><em>${x.n}</em><u></u><small>${esc(x.label)}</small></i>`).join('')}</div>`;
    }
    if (full && card.meter) {   // a gauge that fills from the right (RTL)
      const m = card.meter;
      html += `<div class="tk-meter"><u style="width:${Math.round(Math.max(0.04, Math.min(1, m.v)) * 100)}%;background:${m.c || '#2c9a92'}"></u></div><div class="tk-meter-l"><small>${esc(m.lo || '')}</small><small>${esc(m.hi || '')}</small></div>`;
    }
    if (full && card.spark && card.spark.length > 1) {
      // time runs from right to left (RTL): the newest reading is on the left
      const s = card.spark, mx = Math.max(1, ...s), n = s.length;
      const pts = s.map((v, i) => `${(100 - (i / (n - 1)) * 100).toFixed(1)},${(28 - (v / mx) * 24).toFixed(1)}`).join(' ');
      html += `<svg class="tk-spark" viewBox="-4 0 108 32" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="#2c9a92" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/><circle cx="0" cy="${(28 - (s[n - 1] / mx) * 24).toFixed(1)}" r="3.2" fill="#e8743a"/></svg>`;
    }
    b.el.innerHTML = html; b.until = performance.now() + secs * 1000; b.p = p;
    b.el.classList.add('on');
  }
  function hideBoard(p) { const b = boards.get(p); if (!b) return; b.el.remove(); boards.delete(p); }
  function anchorOf(p, out) {
    const m = p.mesh; const top = p.boardY != null ? p.boardY : 3;
    if (p.id === 'canopybot' && p.cy != null) return out.set(p.x, p.baseY + p.cy + 1.6, p.z);
    if ((p.id === 'lidar' || p.id === 'thermal') && m.userData.flyer) { m.userData.flyer.getWorldPosition(out); out.y += 1.6; return out; }
    if (p.id === 'spawnbot' && m.userData.sub) { m.userData.sub.getWorldPosition(out); out.y += 1.8; return out; }
    return out.set(m.position.x, m.position.y + top * m.scale.y, m.position.z);
  }
  function updateBoards() {
    if (!boards.size) return;
    const now = performance.now();
    const r = canvas.getBoundingClientRect(), ur = uiRoot.getBoundingClientRect();
    for (const [p, b] of boards) {
      if (now > b.until) { b.el.classList.remove('on'); if (now > b.until + 500) { b.el.remove(); boards.delete(p); } continue; }
      anchorOf(p, _v).project(camera);
      const off = _v.z > 1 || Math.abs(_v.x) > 1.05 || Math.abs(_v.y) > 1.05 || W.viewMode;
      b.el.style.visibility = off ? 'hidden' : '';
      if (off) continue;
      const sx = (_v.x + 1) / 2 * r.width + r.left - ur.left, sy = (1 - _v.y) / 2 * r.height + r.top - ur.top;
      b.el.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -100%)`;
    }
  }
  const told = new Set();   // one card per kind of moment in the experience mode is plenty: the picture says the rest
  function xpOnce(key) { if (!xp()) return true; if (told.has(key)) return false; told.add(key); return true; }

  // ───── device life
  function init(p, saved) {
    const m = p.mesh;
    if (p.id === 'canopybot') {
      const h = p.host;
      const tr = h ? Math.max(0.35, (h.vis.trunkRadius || 0.5) * (h.obj ? h.obj.scale.x : 1)) : 0.5;
      p.trunkR = tr; p.baseY = gY(p.x, p.z);
      p.topH = h ? Math.max(6, (h.topY() - p.baseY) * 0.86) : 12;
      m.position.set(p.x, p.baseY, p.z);
      const u = m.userData, K = p.sk = Math.max(1.8, Math.min(3, tr * 2.4));   // the robot reads from afar on a big tree
      u.dock.scale.setScalar(K); u.climber.scale.setScalar(K);
      u.dock.position.set(0, 0.2 * K, tr + 0.6 * K);
      u.climber.position.set(0, 1.2, tr + 0.4 * K);
      u.clamp.scale.set(tr + 0.08, tr + 0.08, K);
      for (const s of u.scan) s.position.set(0, 0, 0);
      p.cy = 1.2; p.ph = 'rest'; p.wait = saved ? 6 : 2.5; p.layerHit = new Set();
      p.boardY = 2;
    } else if (p.id === 'lidar' || p.id === 'thermal') {
      p.ph = 'pad'; p.wait = p.id === 'lidar' ? (saved ? 25 : 3) : 0; p.boardY = 2.2;
      p.cloud = null; p.flew = false;
      if (p.id === 'thermal' && W.nightGlow < 0.5 && !saved) showBoard(p, { title: toolName('thermal'), line: 'מחכה ללילה. בחושך בעלי החיים החמים יזהרו.' }, 7);
    } else if (p.id === 'firetower') {
      p.boardY = 10.6; p.alert = 0; p.risk = -1; p.riskT = 8;
    } else if (p.id === 'reefspeaker') {
      p.boardY = 2.8; p.ringT = 0; p.ring = 0; p.callT = saved ? 30 : 12; p.came = saved?.came || 0; p.hist = Array.isArray(saved?.hist) ? saved.hist.slice(-8) : [];
    } else if (p.id === 'spawnbot') {
      p.boardY = 2; p.ph = 'rest'; p.flew = !!saved && W.nightGlow > 0.6; p.sown = saved?.sown || 0; p.nights = saved?.nights || 0;
    }
  }
  const toolName = (id) => (toolDef(id) || {}).name || '';
  function save(p) {
    if (p.id === 'reefspeaker') return { came: p.came || 0, hist: (p.hist || []).slice(-8) };
    if (p.id === 'spawnbot') return { sown: p.sown || 0, nights: p.nights || 0 };
    return {};
  }
  function removed(p) {
    hideBoard(p);
    for (const k of ['cloud', 'eggs', 'larvae']) if (p[k]) { scene.remove(p[k].pts); p[k].geo.dispose(); p[k].mat.dispose(); p[k] = null; }
    if (p.lasers) { scene.remove(p.lasers); p.lasers.geometry.dispose(); p.lasers.material.dispose(); p.lasers = null; }
    if (p.cone) { p.cone.geometry.dispose(); p.cone.material.dispose(); p.cone = null; }
    if (p.glows) { for (const s of p.glows) { scene.remove(s); s.material.dispose(); } p.glows = null; }
    if (p.arc) { scene.remove(p.arc); p.arc.geometry.dispose(); p.arc.material.dispose(); p.arc = null; }
    if (p.pulse) { scene.remove(p.pulse); p.pulse.geometry.dispose(); p.pulse.material.dispose(); p.pulse = null; }
  }

  // ───── canopy robot: climbs, a ring of light at each layer, counts who lives at each height
  function layersOf() {
    const L = (W.biome && W.biome.layers || []).filter((l) => Array.isArray(l.yRange) && l.id !== 'water');
    return L.slice().sort((a, b) => a.yRange[0] - b.yRange[0]);
  }
  function heightAbove(a) { return a.pos.y - gY(a.pos.x, a.pos.z); }
  const SHORT = { emergent: 'ענקים', canopy: 'צמרות', understory: 'ביניים', floor: 'קרקעית' };
  const short = (l) => SHORT[l.id] || l.name;
  const animalsN = (n) => (n === 1 ? 'בעל חיים אחד' : `${n} בעלי חיים`);
  function countLayers(x, z, R) {
    const L = layersOf(), counts = L.map(() => 0), who = L.map(() => new Map());
    for (const a of W.animals) {
      if (!alive(a) || a.type !== 'animal') continue;
      if (Math.hypot(a.pos.x - x, a.pos.z - z) > R) continue;
      const h = heightAbove(a);
      let i = L.findIndex((l) => h >= l.yRange[0] && h < l.yRange[1]); if (i < 0) i = h >= (L[L.length - 1]?.yRange[1] ?? 0) ? L.length - 1 : 0;
      counts[i]++; who[i].set(a.sp.id, (who[i].get(a.sp.id) || 0) + 1);
    }
    return { L, counts, who };
  }
  function tickCanopy(p, dt, rdt, t) {
    const u = p.mesh.userData;
    if (p.host && (!p.host.alive || p.host.falling || p.host.removed)) { p.mesh.visible = !p.host.removed && p.host.alive && !p.host.falling; if (!p.host.alive || p.host.falling) p.dead = true; return; }
    const L = layersOf();
    if (p.ph === 'rest') { p.wait -= dt; if (p.wait <= 0) { p.ph = 'up'; p.layerHit.clear(); } }
    else if (p.ph === 'up') {
      const prev = p.cy; p.cy = Math.min(p.topH, p.cy + dt * 2.2);
      for (const l of L) { const y = l.yRange[0]; if (y > 0.5 && prev < y && p.cy >= y && !p.layerHit.has(l.id)) { p.layerHit.add(l.id); pulseScan(p, y, l); } }
      if (p.cy >= p.topH) { p.ph = 'top'; p.wait = 3.5; pulseScan(p, p.cy, null); report(); }
    } else if (p.ph === 'top') { p.wait -= dt; if (p.wait <= 0) p.ph = 'down'; }
    else if (p.ph === 'down') { p.cy = Math.max(1.2, p.cy - dt * 3.2); if (p.cy <= 1.2) { p.ph = 'rest'; p.wait = 45; } }
    function report() {
      const { L: LL, counts, who } = countLayers(p.x, p.z, 16);
      if (!LL.length) return;
      let best = 0; for (let i = 1; i < counts.length; i++) if (counts[i] > counts[best]) best = i;
      const total = counts.reduce((s, n) => s + n, 0);
      if (!xpOnce('canopy:' + (total ? 'some' : 'none'))) return;
      const line = total ? `הכי הרבה חיים מצאתי ב${LL[best].name}.` : 'עוד אין כאן בעלי חיים. הביאו בעלי חיים שגרים בצמרות.';
      const top = [...who[best].entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([id]) => fullName(id)).filter(Boolean);
      // bars from the top layer down: the forest as it stands
      showBoard(p, { title: toolName('canopybot'), line, num: total ? `${animalsN(total)} ליד העץ${top.length ? ' · למשל: ' + top.join(', ') : ''}` : '',
        bars: total ? LL.map((l, i) => ({ label: short(l), n: counts[i], c: ['#7a5532', '#4f9a45', '#2c9a92', '#ffb547'][i] || '#2c9a92' })) : null }, 9);
    }
    // the climber, the clamp and the cable follow it; it sways a little as it climbs
    const moving = p.ph === 'up' || p.ph === 'down';
    u.climber.position.y = p.cy + (moving ? Math.sin(t * 9) * 0.04 : 0);
    u.climber.rotation.z = moving ? Math.sin(t * 4.5) * 0.06 : 0;
    u.clamp.position.y = p.cy - 0.05;
    const cl = Math.max(0.1, p.cy - 0.6);
    u.cable.scale.set(p.sk, cl, p.sk); u.cable.position.set(0.18 * p.sk, 0.4 * p.sk + cl / 2, p.trunkR + 0.6 * p.sk);
    for (const s of u.scan) if (s.visible) {
      s.userData.t += rdt; const k = s.userData.t / 2.2;
      if (k >= 1) { s.visible = false; continue; }
      s.scale.setScalar(p.trunkR + 0.4 + k * 12); s.material.opacity = 0.65 * (1 - k);
    }
  }
  function pulseScan(p, y, layer) {
    const u = p.mesh.userData; const s = u.scan.find((r) => !r.visible) || u.scan[0];
    s.visible = true; s.userData.t = 0; s.position.y = y; s.material.color.set(layer ? '#8ff2ff' : '#ffe08a');
    // the animals of that layer near the tree twinkle once
    if (layer) {
      let n = 0;
      for (const a of W.animals) {
        if (n >= 5 || !alive(a) || a.type !== 'animal' || Math.hypot(a.pos.x - p.x, a.pos.z - p.z) > 16) continue;
        const h = heightAbove(a); if (h < layer.yRange[0] || h >= layer.yRange[1]) continue;
        markers.burst(a.focusPoint(_w), '#8ff2ff', 8, { size: 0.35, speed: 0.6 }); n++;
      }
    }
  }

  // ───── LiDAR drone: a fan of laser lines and a point cloud of the treetops, coloured by height
  const FAN = 14;
  function crowns() {
    const out = [];
    for (const q of W.plants) {
      if (!alive(q) || !q.topY) continue;
      const top = q.topY(), base = gY(q.x, q.z), h = top - base; if (h < 0.8) continue;
      out.push({ x: q.x, z: q.z, top, h, r: Math.max(1.2, Math.min(7, h * (q.isTree ? 0.2 : 0.35))), q });
    }
    return out;
  }
  function hitAt(x, z, list) {
    let y = gY(x, z), q = null;
    for (const c of list) { const d = Math.hypot(c.x - x, c.z - z); if (d < c.r) { const yy = c.top - (d / c.r) * (d / c.r) * Math.min(3, c.h * 0.25); if (yy > y) { y = yy; q = c; } } }
    return { y, q };
  }
  function tickLidar(p, dt, rdt, t) {
    const u = p.mesh.userData, fly = u.flyer;
    for (const r of fly.userData.rotors) r.rotation.y += rdt * (p.ph === 'pad' ? 0 : 38);
    if (fly.userData.drum) fly.userData.drum.rotation.y += rdt * (p.ph === 'fly' ? 9 : 0.6);
    u.led.material.color.set(p.ph === 'pad' ? '#ffcf5a' : '#7dffb0');
    if (p.cloud && p.ph !== 'fly') {   // the picture stays a while after landing, then fades
      p.cloudT += rdt; if (p.cloudT > 14) p.cloud.mat.opacity = Math.max(0, 1 - (p.cloudT - 14) / 3);
      if (p.cloudT > 17) { scene.remove(p.cloud.pts); p.cloud.geo.dispose(); p.cloud.mat.dispose(); p.cloud = null; }
    }
    if (p.ph === 'pad') {
      fly.position.set(0, 0.42, 0); fly.rotation.set(0, fly.rotation.y, 0);
      p.wait -= dt; if (p.wait > 0) return;
      // a flight: three passes across the island, high above the tallest crowns
      const a = Math.random() * Math.PI, R = env.radius * 0.82, dir = new THREE.Vector2(Math.cos(a), Math.sin(a)), side = new THREE.Vector2(-dir.y, dir.x);
      const legs = [-1, 0, 1].map((k, i) => { const off = side.clone().multiplyScalar(k * R * 0.42); const s = i % 2 ? 1 : -1; return [off.clone().addScaledVector(dir, -R * s), off.clone().addScaledVector(dir, R * s)]; });
      const path = [new THREE.Vector3(p.x, gY(p.x, p.z) + 1, p.z)];
      const alt = Math.max(30, ...crowns().map((c) => c.top)) + 7;
      for (const [s0, s1] of legs) { path.push(new THREE.Vector3(s0.x, alt, s0.y), new THREE.Vector3(s1.x, alt, s1.y)); }
      path.push(new THREE.Vector3(p.x, gY(p.x, p.z) + 1, p.z));
      p.path = path; p.seg = 0; p.segT = 0; p.ph = 'fly'; p.list = crowns(); p.emit = 0; p.flyT = 0;
      if (p.cloud) { scene.remove(p.cloud.pts); p.cloud.geo.dispose(); p.cloud.mat.dispose(); }
      p.cloud = makeCloud(2800, 4.5); scene.add(p.cloud.pts); p.cloudT = 0;

      if (!p.lasers) {
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(FAN * 6), 3).setUsage(THREE.DynamicDrawUsage));
        p.lasers = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#9dffc4', transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));

        p.lasers.frustumCulled = false; scene.add(p.lasers);
      }
      p.lasers.visible = true; p.tops = new Map();
      return;
    }
    if (p.ph !== 'fly') return;
    // along the path at a gentle speed
    p.flyT += dt;
    const a = p.path[p.seg], b = p.path[p.seg + 1];
    const len = a.distanceTo(b), sp = p.seg === 0 || p.seg === p.path.length - 2 ? 7 : 13;
    p.segT += dt * sp / Math.max(0.1, len);
    if (p.segT >= 1) { p.segT = 0; p.seg++; if (p.seg >= p.path.length - 1) { land(); return; } }
    const A = p.path[p.seg], B = p.path[p.seg + 1];
    fly.parent.worldToLocal(_v.copy(A).lerp(B, p.segT)); fly.position.copy(_v);
    const hx = B.x - A.x, hz = B.z - A.z; if (Math.abs(hx) + Math.abs(hz) > 0.1) fly.rotation.y = Math.atan2(hx, hz) - p.mesh.rotation.y;
    fly.rotation.z = Math.sin(t * 2) * 0.04;
    // the laser fan: across the flight line, down to the treetops or the ground
    const scanning = p.seg > 0 && p.seg < p.path.length - 2;
    fly.localToWorld(_w.copy(fly.userData.eye));
    const pos = p.lasers.geometry.attributes.position, arr = pos.array;
    const dl = Math.hypot(hx, hz) || 1, sx = -hz / dl, sz = hx / dl;
    p.emit -= dt;
    const drop = scanning && p.emit <= 0; if (drop) p.emit = 0.12;
    for (let i = 0; i < FAN; i++) {
      const k = (i / (FAN - 1) - 0.5) * 2, w = 13 + Math.sin(t * 7 + i) * 0.6;
      const x = _w.x + sx * k * w, z = _w.z + sz * k * w;
      const { y, q } = hitAt(x, z, p.list);
      arr[i * 6] = _w.x; arr[i * 6 + 1] = _w.y; arr[i * 6 + 2] = _w.z; arr[i * 6 + 3] = x; arr[i * 6 + 4] = y; arr[i * 6 + 5] = z;
      if (drop && p.cloud.n < p.cloud.max && Math.hypot(x, z) < env.radius + 2) {
        const c = p.cloud, j = c.n++;
        c.P[j * 3] = x; c.P[j * 3 + 1] = y + 0.15; c.P[j * 3 + 2] = z;
        heightColor(y - gY(x, z), _c); c.Cc[j * 3] = _c.r; c.Cc[j * 3 + 1] = _c.g; c.Cc[j * 3 + 2] = _c.b;
        if (q && q.q.isTree) { const prev = p.tops.get(q.q) || 0; if (q.h > prev) p.tops.set(q.q, q.h); }
      }
    }
    p.lasers.visible = scanning;
    pos.needsUpdate = true;
    if (drop) { p.cloud.geo.setDrawRange(0, p.cloud.n); p.cloud.geo.attributes.position.needsUpdate = true; p.cloud.geo.attributes.color.needsUpdate = true; }
    function land() {
      p.ph = 'pad'; p.wait = 85; p.lasers.visible = false; p.cloudT = 0;
      const trees = [...p.tops.entries()].map(([q, h]) => ({ q, h }));
      const L = layersOf().filter((l) => l.yRange[1] > 2);
      if (!trees.length) { showBoard(p, { title: toolName('lidar'), line: 'עוד אין כאן עצים גבוהים. שתלו עצים, והרחפן ימדוד אותם.' }, 7); return; }
      const tall = trees.reduce((m, x) => (x.h > m.h ? x : m));
      if (!xpOnce('lidar')) return;
      const bars = L.map((l) => ({ label: short(l), n: trees.filter((x) => x.h >= l.yRange[0] && x.h < l.yRange[1]).length, c: heightColor((l.yRange[0] + l.yRange[1]) / 2, _c).getStyle() }));
      showBoard(p, { title: toolName('lidar'), line: 'הנקודות הצהובות הן הצמרות הגבוהות. שם יש הכי הרבה אור.',
        num: `${trees.length} עצים נמדדו · הגבוה ביותר: ${tall.q.sp.name}, ${Math.round(tall.h)} מטר`, bars }, 10);
    }
  }

  // ───── thermal drone: at night, warm animals glow
  const GLOWS = 16;
  function tickThermal(p, dt, rdt, t) {
    const u = p.mesh.userData, fly = u.flyer;
    for (const r of fly.userData.rotors) r.rotation.y += rdt * (p.ph === 'pad' ? 0 : 38);
    const night = W.nightGlow > 0.55;
    u.led.material.color.set(p.ph === 'pad' ? (night ? '#ff9a4a' : '#ffcf5a') : '#ff7a3a');
    if (p.ph === 'pad') {
      fly.position.set(0, 0.42, 0);
      if (W.nightGlow < 0.3) p.flew = false;
      if (night && !p.flew) { p.flew = true; p.ph = 'up'; p.k = 0; p.seen = new Map(); p.seenSet = new WeakSet(); p.cool = 0; p.coolSet = new WeakSet(); p.ang = Math.atan2(p.z, p.x); startGlows(p); }
      return;
    }
    // up to the circle, round the island while it is dark, then home
    const R = env.radius * 0.45, alt = 24;
    if (p.ph === 'up' || p.ph === 'down') p.k = Math.min(1, p.k + dt / 4);
    if (p.ph === 'circle') p.ang += dt * 0.16;
    const cx = Math.cos(p.ang) * R, cz = Math.sin(p.ang) * R;
    if (p.ph === 'up') { _v.set(p.x, gY(p.x, p.z) + 0.5, p.z).lerp(_w.set(cx, alt, cz), smooth(p.k)); if (p.k >= 1) p.ph = 'circle'; }
    else if (p.ph === 'circle') { _v.set(cx, alt + Math.sin(t * 0.8) * 0.4, cz); if (W.nightGlow < 0.3) { p.ph = 'down'; p.k = 0; p.from = _v.clone(); } }
    else { _v.copy(p.from).lerp(_w.set(p.x, gY(p.x, p.z) + 0.5, p.z), smooth(p.k)); if (p.k >= 1) { p.ph = 'pad'; endGlows(p); reportNight(p); return; } }
    fly.parent.worldToLocal(_v); fly.position.copy(_v);
    if (p.ph === 'circle') fly.rotation.y = Math.atan2(-Math.sin(p.ang), Math.cos(p.ang)) - p.mesh.rotation.y; fly.rotation.z = 0.08;
    if (p.cone) { p.cone.material.opacity = p.ph === 'circle' ? 0.06 : 0.02; }
    // which animals are under the camera: warm ones glow (seen through the leaves, like a heat picture)
    p.scanT = (p.scanT || 0) - rdt;
    fly.getWorldPosition(_w);
    if (p.scanT <= 0) {
      p.scanT = 0.3; p.tracked = [];
      for (const a of W.animals) {
        if (!alive(a) || a.type !== 'animal' || a.sp.isInsect) continue;
        if (Math.hypot(a.pos.x - _w.x, a.pos.z - _w.z) > 24) continue;
        if (COOL.has(a.sp.id)) { if (!p.coolSet.has(a)) { p.coolSet.add(a); p.cool++; } continue; }
        p.tracked.push(a);
        if (!p.seenSet.has(a)) { p.seenSet.add(a); p.seen.set(a.sp.id, (p.seen.get(a.sp.id) || 0) + 1); }
      }
      p.tracked.sort((a, b) => Math.hypot(a.pos.x - _w.x, a.pos.z - _w.z) - Math.hypot(b.pos.x - _w.x, b.pos.z - _w.z));
      p.tracked.length = Math.min(p.tracked.length, GLOWS);
    }
    for (let i = 0; i < GLOWS; i++) {
      const s = p.glows[i], a = p.tracked && p.tracked[i];
      if (!a || !alive(a)) { s.visible = false; continue; }
      a.focusPoint(s.position); s.visible = true;
      const k = 1 + Math.sin(t * 3 + i) * 0.08; s.scale.setScalar((a.loco === 'flying' ? 3 : 4.6) * k);
    }
  }
  const smooth = (k) => k * k * (3 - 2 * k);
  function startGlows(p) {
    if (!p.glows) p.glows = [...Array(GLOWS)].map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: heatTex(), transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); s.renderOrder = 18; s.visible = false; scene.add(s); return s; });
    if (!p.cone) {
      p.cone = new THREE.Mesh(new THREE.ConeGeometry(5, 18, 28, 1, true), addM('#ffb347', 0.05));
      p.cone.position.y = -9; p.mesh.userData.flyer.add(p.cone);
    }
    p.cone.visible = true;
  }
  function endGlows(p) { if (p.glows) for (const s of p.glows) s.visible = false; if (p.cone) p.cone.visible = false; p.tracked = []; }
  function reportNight(p) {
    const total = [...p.seen.values()].reduce((s, n) => s + n, 0);
    if (!xpOnce('thermal:' + (total ? 'some' : 'none'))) return;
    const bars = [...p.seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id, n]) => ({ label: fullName(id), n, c: '#ff8a3a' }));
    showBoard(p, { title: toolName('thermal'), line: total ? 'בלילה, בעלי החיים החמים זהרו במצלמת החום.' : 'הלילה לא נמצאו בעלי חיים חמים. הביאו בעלי חיים שפעילים בלילה.',
      num: total ? `${total === 1 ? 'בעל חיים חם אחד נספר' : total + ' בעלי חיים חמים נספרו'} בלילה${p.cool ? ` · ${p.cool === 1 ? 'זוחל אחד כמעט לא זהר: הגוף שלו קריר' : p.cool + ' זוחלים כמעט לא זהרו: הגוף שלהם קריר'} בלילה` : ''}` : '', bars: total ? bars : null }, 10);
  }

  // ───── fire tower: a slow beam; a fire found early stays smaller
  function tickTower(p, dt, rdt, t) {
    const u = p.mesh.userData;
    u.head.rotation.y += rdt * (p.alert > 0 ? 0 : 0.35);
    const night = W.nightGlow;
    u.beam.material.opacity = 0.03 + night * 0.07;
    if (p.alert > 0) {
      p.alert -= rdt;
      const on = Math.sin(t * 9) > 0; u.lamp.material.color.set(on ? '#ff4a2a' : '#5a1a10');
      if (p.fire) { const a = Math.atan2(p.fire.x - p.x, p.fire.z - p.z) - p.mesh.rotation.y; u.head.rotation.y += (wrap(a - u.head.rotation.y)) * Math.min(1, rdt * 4); }
      if (p.pulse) { const k = (t * 0.7) % 1; p.pulse.scale.setScalar(2 + k * (p.fire ? p.fire.r * 1.2 : 8)); p.pulse.material.opacity = 0.5 * (1 - k); }
      if (p.arc) p.arc.material.opacity = 0.35 + Math.sin(t * 6) * 0.25;
      if (p.alert <= 0) { if (p.arc) p.arc.visible = false; if (p.pulse) p.pulse.visible = false; u.lamp.material.color.set('#ff7a3a'); }
    } else u.lamp.material.color.set(Math.sin(t * 1.2) > 0.97 ? '#ffd0a0' : '#ff7a3a');
    // full mode: the danger of fire, now and then (summer and drought, heat and wind)
    if (xp() || W.biomeId !== 'grove') return;
    p.riskT -= dt; if (p.riskT > 0) return; p.riskT = 30;
    const season = { summer: 0.55, autumn: 0.35, spring: 0.15, winter: 0.02 }[W.season] ?? 0.2;
    const v = Math.min(1, season + (W.drought || 0) * 0.5 + (W.heat || 0) * 0.2 + Math.max(0, (W.wind || 0) - 0.3) * 0.4 - (W.rain || 0) * 0.5);
    const lvl = v > 0.6 ? 2 : v > 0.3 ? 1 : 0;
    if (lvl === p.risk) return; p.risk = lvl;
    const names = ['נמוכה', 'בינונית', 'גבוהה'];
    showBoard(p, { title: toolName('firetower'), line: lvl === 2 ? 'סכנת שריפה גבוהה. המגדל שומר בעיניים פקוחות.' : `סכנת שריפה ${names[lvl]}.`,
      meter: { v, c: ['#57b86a', '#ffb547', '#e8543a'][lvl], lo: 'נמוכה', hi: 'גבוהה' } }, 7);
  }
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  function towerAlert(p, fire, r0) {
    p.alert = 9; p.fire = fire;
    const top = new THREE.Vector3(p.x, p.mesh.position.y + 8.4 * p.mesh.scale.y, p.z), end = new THREE.Vector3(fire.x, gY(fire.x, fire.z) + 1.5, fire.z);
    const mid = top.clone().lerp(end, 0.5); mid.y = Math.max(top.y, end.y) + top.distanceTo(end) * 0.25;
    const pts = new THREE.QuadraticBezierCurve3(top, mid, end).getPoints(32);
    if (p.arc) { scene.remove(p.arc); p.arc.geometry.dispose(); p.arc.material.dispose(); }
    p.arc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#ffb547', transparent: true, opacity: 0.6, depthTest: false, toneMapped: false }));
    p.arc.renderOrder = 15; scene.add(p.arc);
    if (!p.pulse) { p.pulse = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), addM('#ff6a3a', 0.5)); p.pulse.rotation.x = -Math.PI / 2; scene.add(p.pulse); }
    p.pulse.visible = true; p.pulse.position.set(fire.x, gY(fire.x, fire.z) + 0.3, fire.z);
    showBoard(p, { title: toolName('firetower'), line: 'המגדל גילה את העשן מוקדם, והאש נשארה קטנה.', num: `גודל האש: ${Math.round(fire.r)} מטר במקום ${Math.round(r0)}` }, 9);
  }

  // ───── healthy-reef speaker: rings of sound; young fish come to a hurt reef
  function reefHurt() {
    const cor = W.plants.filter((q) => alive(q) && q.sp.kind === 'coral');
    const avg = cor.length ? cor.reduce((s, q) => s + (q.health ?? 1), 0) / cor.length : 0;
    return (W.scars && W.scars.length > 0) || cor.length < 6 || avg < 0.75;
  }
  function tickSpeaker(p, dt, rdt, t) {
    const u = p.mesh.userData;
    u.turn.rotation.y += rdt * 0.4;
    p.ringT -= rdt;
    if (p.ringT <= 0) { p.ringT = 1.3; const r = u.rings[p.ring++ % u.rings.length]; r.visible = true; r.userData.t = 0; }
    for (const r of u.rings) if (r.visible) {
      r.userData.t += rdt; const k = r.userData.t / 3.6; if (k >= 1) { r.visible = false; continue; }
      r.scale.setScalar(0.6 + k * 11); r.position.y = 1.45 + k * 0.6; r.material.opacity = 0.55 * (1 - k) * (1 - k);
    }
    p.callT -= dt; if (p.callT > 0) return; p.callT = 40;
    const fishNow = W.animals.filter((a) => alive(a) && a.sp.swims).length;
    p.hist = (p.hist || []).concat(fishNow).slice(-8);
    if (!reefHurt()) {
      if (!xp() && !p.calmShown) { p.calmShown = true; showBoard(p, { title: toolName('reefspeaker'), line: 'השונית בריאה, והדגים כבר כאן. הרמקול שומר על השקט.', spark: p.hist }, 6); }
      return;
    }
    const pool = YOUNG_FISH.map((id) => reg.byId.get(id)).filter((sp) => sp && (W.unlocked.has(sp.id) || sp.unlock === 'start'));
    if (!pool.length || !ctx.spawnAnimal) return;
    const sp = pool[(Math.random() * pool.length) | 0];
    const a = Math.random() * Math.PI * 2, x = p.x + Math.cos(a) * 3, z = p.z + Math.sin(a) * 3;
    const fish = ctx.spawnAnimal(sp, new THREE.Vector3(x, gY(x, z), z));
    if (!fish) return;
    p.came = (p.came || 0) + 1; p.hist[p.hist.length - 1] = fishNow + 1;
    markers.burst(_v.set(x, gY(x, z) + 1.5, z), '#9ff6ff', 14, { size: 0.4, speed: 0.8 });
    if (!xpOnce('speaker')) return;
    showBoard(p, { title: toolName('reefspeaker'), line: `הקולות של שונית בריאה קראו ל${sp.name} צעיר.`, num: `דגים צעירים שהגיעו בזכות הרמקול: ${p.came}`, spark: p.hist }, 9);
  }

  // ───── young-corals robot: at night, floating coral eggs; it sows young corals where the reef was hurt
  function tickSpawn(p, dt, rdt, t) {
    const u = p.mesh.userData, sub = u.sub;
    u.prop.rotation.x += rdt * (p.ph === 'rest' ? 1 : 16);
    p.k = (p.k || 0) + dt;
    // eggs drift up (and a little sideways); near the robot they slide into its funnel
    if (p.eggs) {
      const E = p.eggs; let any = false;
      sub.getWorldPosition(_w);
      for (let i = 0; i < E.n; i++) {
        const j = i * 3; if (E.P[j + 1] < -900) continue; any = true;
        E.P[j + 1] += dt * (0.55 + (i % 7) * 0.05); E.P[j] += Math.sin(t * 0.7 + i) * dt * 0.15;
        if (p.ph === 'collect') { const dx = _w.x - E.P[j], dy = _w.y + 0.9 - E.P[j + 1], dz = _w.z - E.P[j + 2], d = Math.hypot(dx, dy, dz); if (d < 5) { if (d < 0.6) { E.P[j + 1] = -999; p.got++; continue; } E.P[j] += dx / d * dt * 3; E.P[j + 1] += dy / d * dt * 3; E.P[j + 2] += dz / d * dt * 3; } }
        if (env.surfaceY != null && E.P[j + 1] > env.surfaceY - 0.3) E.P[j + 1] = env.surfaceY - 0.3;
      }
      E.geo.attributes.position.needsUpdate = true;
      if (p.k > 24) E.mat.opacity = Math.max(0, 1 - (p.k - 24) / 4);
      if (!any || p.k > 28) { scene.remove(E.pts); E.geo.dispose(); E.mat.dispose(); p.eggs = null; }
    }
    if (p.larvae) {
      const L = p.larvae;
      for (let i = 0; i < L.n; i++) { const j = i * 3; L.P[j + 1] -= dt * (0.5 + (i % 5) * 0.08); L.P[j] += Math.sin(t + i) * dt * 0.2; const g = gY(L.P[j], L.P[j + 2]) + 0.1; if (L.P[j + 1] < g) L.P[j + 1] = g; }
      L.geo.attributes.position.needsUpdate = true; L.t += dt; L.mat.opacity = Math.max(0, 1 - L.t / 6);
      if (L.t > 6) { scene.remove(L.pts); L.geo.dispose(); L.mat.dispose(); p.larvae = null; }
    }
    // the robot: up, a slow round among the eggs, to the hurt place, sow, home
    if (p.ph === 'rest') {
      sub.position.set(0, 0.6 + Math.sin(t * 1.4) * 0.04, 0); sub.rotation.set(0, sub.rotation.y, 0);
      if (W.nightGlow < 0.3) p.flew = false;
      if (W.nightGlow > 0.6 && !p.flew) { p.flew = true; startSpawn(p, false); }
      return;
    }
    const home = { y: gY(p.x, p.z) };
    if (p.ph === 'rise') { moveTo(p, sub, _w.set(p.x, home.y + 4, p.z), dt, 2); if (p.k > 3) { p.ph = 'collect'; p.k0 = p.k; } }
    else if (p.ph === 'collect') {
      const a = (p.k - p.k0) * 0.35, R = 6;
      moveTo(p, sub, _w.set(p.x + Math.cos(a) * R, home.y + 4.5 + Math.sin(p.k) * 0.4, p.z + Math.sin(a) * R), dt, 3);
      if (p.k - p.k0 > 9) { p.ph = 'go'; p.goal = pickSowSpot(p); }
    } else if (p.ph === 'go') {
      const G = p.goal; moveTo(p, sub, _w.set(G.x, gY(G.x, G.z) + 2.2, G.z), dt, 4);
      if (_w.distanceTo(sub.getWorldPosition(_v)) < 0.8) { p.ph = 'sow'; p.k0 = p.k; sow(p); }
    } else if (p.ph === 'sow') { if (p.k - p.k0 > 3.5) { p.ph = 'back'; } }
    else if (p.ph === 'back') {
      moveTo(p, sub, _w.set(p.x, home.y + 0.6 * p.mesh.scale.y, p.z), dt, 4);
      if (_w.distanceTo(sub.getWorldPosition(_v)) < 0.3) { p.ph = 'rest'; sub.position.set(0, 0.6, 0); report(); }
    }
    function report() {
      p.nights = (p.nights || 0) + 1;
      if (!xpOnce('spawn:' + (p.lastSown ? 'sown' : 'none'))) return;
      showBoard(p, { title: toolName('spawnbot'), line: p.lastSown ? 'הרובוט פיזר אלמוגים צעירים במקום שבו השונית נפגעה.' : 'הרובוט פיזר זחלים של אלמוגים. אם השונית תיפגע, הוא יזרע שם.',
        num: `לילות של ביצים: ${p.nights} · אלמוגים צעירים שנזרעו: ${p.sown || 0}`, bars: [{ label: 'הלילה', n: p.lastSown || 0, c: '#e889a8' }, { label: 'בסך הכול', n: p.sown || 0, c: '#2c9a92' }] }, 9);
    }
  }
  function moveTo(p, sub, worldGoal, dt, speed) {
    sub.getWorldPosition(_v);
    const d = _v.distanceTo(worldGoal);
    if (d > 0.01) { const s = Math.min(1, speed * dt / d); _v.lerp(worldGoal, s); }
    const lx = worldGoal.x - _v.x, lz = worldGoal.z - _v.z;
    p.mesh.worldToLocal(_v); sub.position.copy(_v);
    if (Math.abs(lx) + Math.abs(lz) > 0.05) { const want = Math.atan2(-lz, lx) - p.mesh.rotation.y; sub.rotation.y += wrap(want - sub.rotation.y) * Math.min(1, dt * 3); }
  }
  function pickSowSpot(p) {
    const sc = (W.scars || []).slice().sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
    if (sc) return { x: sc.x, z: sc.z, scar: sc };
    const a = Math.random() * Math.PI * 2; return { x: p.x + Math.cos(a) * 5, z: p.z + Math.sin(a) * 5, scar: null };
  }
  function startSpawn(p, big) {
    p.ph = 'rise'; p.k = 0; p.got = 0; p.lastSown = 0; p.big = big;
    // eggs rise from the corals: near the robot on an ordinary night, from every coral on the spawning night
    const cor = W.plants.filter((q) => alive(q) && q.sp.kind === 'coral' && (big || Math.hypot(q.x - p.x, q.z - p.z) < 20));
    if (p.eggs) { scene.remove(p.eggs.pts); p.eggs.geo.dispose(); p.eggs.mat.dispose(); }
    const per = big ? 40 : 16, n = Math.min(big ? 1200 : 360, Math.max(60, cor.length * per));
    const E = p.eggs = makeCloud(n, big ? 7 : 6); scene.add(E.pts);
    const cols = ['#ff9cc0', '#ffc39a', '#ffb0d0', '#ffd8a8'];
    for (let i = 0; i < n; i++) {
      const q = cor.length ? cor[i % cor.length] : { x: p.x + (Math.random() - 0.5) * 12, z: p.z + (Math.random() - 0.5) * 12 };
      const x = q.x + (Math.random() - 0.5) * 2.4, z = q.z + (Math.random() - 0.5) * 2.4;
      E.P[i * 3] = x; E.P[i * 3 + 1] = gY(x, z) + 0.3 + Math.random() * (big ? 2.5 : 1.5); E.P[i * 3 + 2] = z;
      _c.set(cols[i % cols.length]); E.Cc[i * 3] = _c.r; E.Cc[i * 3 + 1] = _c.g; E.Cc[i * 3 + 2] = _c.b;
    }
    E.n = n; E.geo.setDrawRange(0, n); E.geo.attributes.color.needsUpdate = true; E.geo.attributes.position.needsUpdate = true;
  }
  function sow(p) {
    const G = p.goal;
    if (p.larvae) { scene.remove(p.larvae.pts); p.larvae.geo.dispose(); p.larvae.mat.dispose(); }
    p.larvae = sowCloud(G.x, G.z);
    const want = p.big ? 2 : 1;
    const pool = CORAL_SOW.map((id) => reg.byId.get(id)).filter((sp) => sp && (W.unlocked.has(sp.id) || sp.unlock === 'start'));
    if (!pool.length || !ctx.spawnPlant) return;
    let n = 0;
    for (let i = 0; i < want; i++) {
      const sc = i === 0 ? G.scar : (W.scars || [])[0];
      if (!sc) break;   // without a hurt place the larvae only drift: the reef needs no help today
      const sp = pool[(Math.random() * pool.length) | 0];
      const s = ctx.findSpotNear ? ctx.findSpotNear(sp, sc.x, sc.z, 2.5) : { x: sc.x, z: sc.z };
      if (!s) continue;
      const q = ctx.spawnPlant(sp, s.x, s.z, { growth: 0.08 }); if (!q) continue;
      n++; const k = W.scars.indexOf(sc); if (k >= 0) W.scars.splice(k, 1);
      W.stats.scarsHealed = (W.stats.scarsHealed || 0) + 1; W.everPlaced.add(sp.id);
      markers.burst(_v.set(s.x, gY(s.x, s.z) + 0.5, s.z), '#ffb0c8', 16, { size: 0.4, speed: 0.7 });
    }
    p.lastSown = n; p.sown = (p.sown || 0) + n;
  }
  function sowCloud(x, z) {
    // tiny glowing larvae sink to the rock (they are not the eggs any more: a few days old, ready to settle)
    const L = makeCloud(160, 5, THREE.AdditiveBlending); L.t = 0;

    for (let i = 0; i < 160; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * 2.2;
      L.P[i * 3] = x + Math.cos(a) * r; L.P[i * 3 + 1] = gY(x, z) + 2 + Math.random() * 1.2; L.P[i * 3 + 2] = z + Math.sin(a) * r;
      _c.set(i % 3 ? '#d8fff4' : '#ffd0e4'); L.Cc[i * 3] = _c.r; L.Cc[i * 3 + 1] = _c.g; L.Cc[i * 3 + 2] = _c.b;
    }
    L.n = 160; L.geo.setDrawRange(0, 160); L.geo.attributes.color.needsUpdate = true;
    scene.add(L.pts);
    return L;
  }
  let devicesFn = () => [];
  const devices = () => devicesFn();

  // ───── per device, per frame
  function tick(p, dt, rdt, t) {
    switch (p.id) {
      case 'canopybot': return tickCanopy(p, dt, rdt, t);
      case 'lidar': return tickLidar(p, dt, rdt, t);
      case 'thermal': return tickThermal(p, dt, rdt, t);
      case 'firetower': return tickTower(p, dt, rdt, t);
      case 'reefspeaker': return tickSpeaker(p, dt, rdt, t);
      case 'spawnbot': return tickSpawn(p, dt, rdt, t);
    }
  }

  // ───── events: a fire found early from the tower; the spawning night with the robot
  function afterEventStart(e) {
    const D = devices();
    const fx = e.start || [];
    if (fx.some((f) => f.type === 'fire')) {
      const tw = D.find((d) => d.id === 'firetower');
      const fire = W.fires && W.fires[W.fires.length - 1];
      if (tw && fire && !fire._tower) {
        fire._tower = true; const r0 = fire.r;
        fire.r *= 0.6; fire.dur *= 0.75;
        towerAlert(tw, fire, r0);
      }
    }
    if (e.id === 'r_spawn') {
      const sb = D.find((d) => d.id === 'spawnbot');
      if (sb && sb.ph === 'rest') startSpawn(sb, true);
    }
  }
  // ───── רובו־דע on the island: the lab's model hovers near what the camera looks at while his bubble is open
  const robo = createIslandRobo({ W, scene, camera, rig: ctx.rig });

  function frame(rdt, t) { updateBoards(); robo.frame(rdt, t); }
  function dispose() {
    for (const p of devices()) removed(p);
    if (boardsEl) { boardsEl.remove(); boardsEl = null; } boards.clear();
    robo.dispose();
  }
  return {
    model: techModel, init, tick, save, removed, afterEventStart, frame, dispose, showBoard,
    roboAt: robo.pointAt, robo,
    setDevices(fn) { devicesFn = fn; },
    // headless tests (window.__tech): start a device's moment now
    debug: {
      go(id) {
        const p = devices().find((d) => d.id === id); if (!p) return 'none';
        if (id === 'canopybot') { p.ph = 'rest'; p.wait = 0; }
        else if (id === 'lidar') { p.ph = 'pad'; p.wait = 0; }
        else if (id === 'thermal') { p.flew = false; }
        else if (id === 'reefspeaker') { p.callT = 0; }
        else if (id === 'spawnbot') { p.flew = true; startSpawn(p, true); }
        else if (id === 'firetower') { const f = { x: p.x + 14, z: p.z + 6, r: 9, intensity: 0, t: 0, dur: 30 }; W.fires.push(f); const r0 = f.r; f.r *= 0.6; towerAlert(p, f, r0); }
        return 'ok';
      },
      boards: () => [...boards.values()].map((b) => b.el.textContent),
      dev: (id) => devices().find((d) => d.id === id) || null,
      state: (id) => { const p = devices().find((d) => d.id === id); return p ? { ph: p.ph, k: p.k, seen: p.seen ? [...p.seen.entries()] : null, came: p.came, sown: p.sown, nights: p.nights, cy: p.cy } : null; },

    },
  };
}

// ─────────────────────────────────────────── רובו־דע in the forest
// While a guide bubble is open (window.__guide.isOpen()), the lab's model of רובו־דע (src/data/lab-robot.js, loaded the
// first time he speaks in a forest) floats near what the camera looks at, a little to the side, bobbing gently and
// facing the camera; his visor shows the guide's face (src/ui/robo-face.js), and his mouth moves while the bubble talks.
// pointAt(vec3) (an injured animal, a device just placed): his next bubble sends him there.
// Hidden: invisible and not updated at all (one cheap check per frame).
const b64 = (s) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
function decodePart(e) {   // the packed geometry of tools/build-lab.py (same format as src/lab/lab.js reads)
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
function createIslandRobo({ W, scene, camera, rig }) {
  let root = null, loading = null, failed = false, M = null, groups = null, faceCv = null, faceTex = null;
  let shown = false, t0 = 0, openedAt = 0, faceKey = '', faceT = 0, blinkT = 2, blink = 0;
  let point = null, pointT = -1e9, goal = null;
  const pos = new THREE.Vector3(), vel = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3(), _r = new THREE.Vector3(), _t = new THREE.Vector3();
  async function build() {
    try {
      const { LAB_ROBOT } = await import('../data/lab-robot.js');
      if (!LAB_ROBOT || disposed) return;
      faceCv = document.createElement('canvas'); faceCv.width = 512; faceCv.height = 256;
      faceTex = new THREE.CanvasTexture(faceCv); faceTex.colorSpace = THREE.SRGBColorSpace;
      drawRoboFace(faceCv.getContext('2d'), 'happy', 0, 0); faceTex.needsUpdate = true;
      M = {
        shell: new THREE.MeshStandardMaterial({ color: '#f3f1ea', roughness: 0.28, metalness: 0.02, emissive: '#3a3a36', emissiveIntensity: 0.25 }),
        teal: new THREE.MeshStandardMaterial({ color: '#2c9a92', roughness: 0.32, emissive: '#0c2a28', emissiveIntensity: 0.3 }),
        tealdark: new THREE.MeshStandardMaterial({ color: '#1d5e66', roughness: 0.38 }),
        visor: new THREE.MeshStandardMaterial({ color: '#0a1016', roughness: 0.08, emissive: '#ffffff', emissiveMap: faceTex, emissiveIntensity: 1.5, side: THREE.DoubleSide }),
        seam: new THREE.MeshStandardMaterial({ color: '#3b434c', roughness: 0.5 }),
        metal: new THREE.MeshStandardMaterial({ color: '#c4cad2', roughness: 0.3, metalness: 0.9 }),
        leaf: new THREE.MeshStandardMaterial({ color: '#5aa845', roughness: 0.42, side: THREE.DoubleSide }),
        glow: new THREE.MeshBasicMaterial({ color: '#9ff6ff', toneMapped: false }),
        badge: new THREE.MeshStandardMaterial({ color: '#0c1a1c', roughness: 0.1, emissive: '#6dff8a', emissiveIntensity: 0.6, side: THREE.DoubleSide }),
      };
      for (const m of Object.values(M)) m.fog = false;
      root = new THREE.Group(); root.name = 'robo-da-island'; root.visible = false; root.renderOrder = 30;
      const float = new THREE.Group(); root.add(float);
      const piv = LAB_ROBOT.pivots || { head: [0, 0.545, 0], arm_a: [-0.2, 0.455, 0.005], arm_b: [0.2, 0.455, 0.005] };
      groups = { body: float, hover: float, float };
      for (const k of ['head', 'arm_a', 'arm_b']) { const g = new THREE.Group(); g.position.fromArray(piv[k]); float.add(g); groups[k] = g; }
      for (const e of LAB_ROBOT.parts) {
        const m = new THREE.Mesh(decodePart(e), M[e.m] || M.shell); m.castShadow = false; m.receiveShadow = false;
        const g = groups[e.g] || float; if (g !== float) m.position.set(-piv[e.g][0], -piv[e.g][1], -piv[e.g][2]);
        g.add(m);
      }
      float.position.y = -0.35;   // his middle at the group's origin
      scene.add(root);
    } catch (e) { failed = true; console.warn('island robot', e); }
  }
  let disposed = false;
  const guideOpen = () => { const G = typeof window !== 'undefined' && window.__guide; return !!(G && G.isOpen && G.isOpen()); };
  function pointAt(v) { if (!v) return; point = v.clone ? v.clone() : new THREE.Vector3(v.x, v.y || 0, v.z); pointT = performance.now(); if (shown) goal = point.clone(); }
  // where he waits: in front of the camera target, toward the camera and to the left side of the view (the bubble is on
  // the right), a little above the middle; his size keeps about the same on the screen
  function restSpot(out) {
    const tgt = rig && rig.controls ? rig.controls.target : _t.set(0, 5, 0);
    const d = camera.position.distanceTo(tgt);
    const k = 0.42;   // how far from the camera, as a part of the way to the target
    _d.copy(tgt).sub(camera.position).normalize();
    out.copy(camera.position).addScaledVector(_d, d * k);
    const right = _r.crossVectors(_d, camera.up).normalize();
    const h = d * k * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));   // half the visible height at that depth
    out.addScaledVector(right, -h * camera.aspect * 0.42).addScaledVector(camera.up, h * 0.12);
    return out;
  }
  function frame(rdt, t) {
    // never in a photo: the photo mode (#ui.af-shoot) hides him; photos.js capture() also hides him for its one frame
    const uiEl = typeof document !== 'undefined' && document.getElementById('ui');
    const want = guideOpen() && !W.research && !W.viewMode && !(uiEl && uiEl.classList.contains('af-shoot'));
    if (!want) { if (shown && root) { root.visible = false; } shown = false; return; }
    if (!root) { if (!loading && !failed) loading = build(); return; }
    const now = performance.now();
    if (!shown) {
      shown = true; root.visible = true; openedAt = now; t0 = t;
      goal = point && now - pointT < 4000 ? point.clone() : null;
      restSpot(pos); if (goal) { pos.lerp(goal, 0.15); }
      vel.set(0, 0, 0);
    } else if (point && now - pointT < 600 && (!goal || !goal.equals(point))) goal = point.clone();
    // the goal: a world point he flies to (a bit above it, toward the camera), else the resting spot by the view
    const dCam = camera.position.distanceTo(rig && rig.controls ? rig.controls.target : _t.set(0, 5, 0));
    if (goal) { _a.copy(goal); _a.y += 2.5; _b.copy(camera.position).sub(_a).normalize(); _a.addScaledVector(_b, 3); }
    else restSpot(_a);
    // a soft spring: he floats after the spot, never jumps
    const k = 3.2, damp = 2 * Math.sqrt(k);
    _b.copy(_a).sub(pos).multiplyScalar(k).addScaledVector(vel, -damp);
    vel.addScaledVector(_b, Math.min(rdt, 0.05));
    pos.addScaledVector(vel, Math.min(rdt, 0.05));
    root.position.copy(pos); root.position.y += Math.sin(t * 1.8) * 0.06 * Math.max(1, dCam * 0.02);
    const dist = camera.position.distanceTo(pos);
    const s = Math.max(0.6, dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 0.5);   // about a fifth of the screen tall
    root.scale.setScalar(s);
    // face the camera (yaw), lean into the flight
    const yaw = Math.atan2(camera.position.x - pos.x, camera.position.z - pos.z);
    const speed = vel.length() / Math.max(0.5, s);
    root.rotation.set(0, root.rotation.y + wrapA(yaw - root.rotation.y) * Math.min(1, rdt * 4), 0);
    groups.float.rotation.x = Math.min(0.35, speed * 0.05);
    groups.float.rotation.z = Math.sin(t * 0.9) * 0.03;
    groups.head.rotation.y = Math.sin(t * 0.5) * 0.12; groups.head.rotation.x = Math.sin(t * 0.7) * 0.04;
    const wave = (now - openedAt) < 1800;
    groups.arm_a.rotation.z = -0.08 + Math.sin(t * 1.8 + 1) * 0.05;
    groups.arm_b.rotation.z = wave ? 1.9 + Math.sin(t * 12) * 0.35 : 0.08 + Math.sin(t * 1.8) * 0.05;
    groups.arm_b.rotation.x = wave ? -0.4 : 0;
    // the face: blink now and then, the mouth moves while the bubble talks (the guide's figure has the class 'talk')
    blinkT -= rdt; if (blinkT < 0) { blink = 1; blinkT = 2.5 + Math.random() * 3; } blink = Math.max(0, blink - rdt * 7);
    faceT -= rdt;
    if (faceT <= 0) {
      faceT = 1 / 14;
      const talking = !!document.querySelector('#rguide .rg-fig.talk');
      const talk = talking ? 0.5 + 0.5 * Math.sin(t * 17) * Math.sin(t * 5.3) : 0;
      const expr = now - openedAt < 1500 ? 'happy' : 'normal';
      const key = expr + (blink > 0.5 ? 'b' : '') + (talk > 0.05 ? Math.round(talk * 6) : '');
      if (key !== faceKey) { faceKey = key; drawRoboFace(faceCv.getContext('2d'), expr, blink > 0.5 ? 1 : 0, Math.max(0, talk)); faceTex.needsUpdate = true; }
    }
  }
  const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  function dispose() {
    disposed = true;
    if (!root) return;
    scene.remove(root);
    const seen = new Set();
    root.traverse((o) => { if (o.isMesh && o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); } });
    for (const m of Object.values(M || {})) m.dispose();
    if (faceTex) faceTex.dispose();
    root = null;
  }
  return { frame, pointAt, dispose, get visible() { return shown; }, get root() { return root; } };
}
