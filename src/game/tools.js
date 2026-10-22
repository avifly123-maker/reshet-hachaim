// Technology tools the player can drag onto the island:
// monitoring drone, camera trap, rescue robot, water-from-air generator, seed-ball drone, forest listener.
// Each tool teaches something real that people use today to watch over and repair nature.
// 1.3.2 (area G): six more technologies live in src/world/tech.js (canopy robot, LiDAR drone, thermal drone, fire tower,
// healthy-reef speaker, young-corals robot), and the tools get upgrades from the threads (חוטים, core/threads.js):
// toolBoost(tool, zone) is read where each tool works (drone speed / hover / share, camera night / shy, rescue speed /
// heal, watergen output, nestbox storm, buoy range), eventBoost(id) shortens the reef's murky water, and choicesFor(id)
// adds new ways to an event's choices (eventChoices below; the full mode only).
import * as THREE from 'three';
import { hasInvention } from '../lab/progress.js';
import { clamp, makeRng } from '../core/util.js';
import { gw } from '../data/common.js';
import { toolProp } from '../world/props.js';
import { zoneWord } from '../core/place.js';

import { TOOL_DEFS, TECH_DEFS, ISLAND_TOOLS, TOOL_ICONS, toolDef, toolInZone, REEF_TOOL_CARDS, CAM } from './tool-defs.js';
import { createTech, techModel, TECH_IDS, TECH_HOST } from '../world/tech.js';
import { toolBoost, eventBoost, choicesFor } from '../core/threads.js';
export { TOOL_DEFS, TECH_DEFS, ISLAND_TOOLS, TOOL_ICONS, toolDef, toolInZone, REEF_TOOL_CARDS, CAM };
const ICONS = TOOL_ICONS;

// ─────────────────────────────────────────── device models (simple, readable from far)
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.1, ...o });
function box(w, h, d, mat) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = true; return m; }
function cyl(r1, r2, h, mat, seg = 12) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat); m.castShadow = true; return m; }
function makeDrone(seed = false) {
  // the Blender model (src/world/props.js); the blades spin, a faint disc shows their blur
  const g = toolProp('drone', { tint: seed ? '#b8935e' : null });
  if (!g) return makeDroneSimple(seed);
  for (const r of g.userData.rotors) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.01, 20), new THREE.MeshBasicMaterial({ color: '#d8e6ee', transparent: true, opacity: 0.22, depthWrite: false }));
    r.add(disc);
  }
  if (seed) { const pod = cyl(0.3, 0.22, 0.42, M('#c8a86a')); pod.position.y = -0.42; g.add(pod); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.scale.setScalar(1.3);
  return g;
}
function makeDroneSimple(seed = false) {
  const g = new THREE.Group();
  const body = box(1.2, 0.45, 1.2, M(seed ? '#6b5434' : '#33414d')); g.add(body);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), M('#6fd0ff', { emissive: '#2a8fd0', emissiveIntensity: 0.8 })); eye.position.set(0, -0.15, 0.55); g.add(eye);
  g.userData.rotors = [];
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const arm = box(0.12, 0.1, 1.1, M('#222a30')); arm.position.set(x * 0.55, 0.05, z * 0.55); arm.rotation.y = Math.atan2(x, z); g.add(arm);
    const rot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.03, 16), new THREE.MeshBasicMaterial({ color: '#cfe2ee', transparent: true, opacity: 0.45 })); rot.position.set(x * 0.95, 0.18, z * 0.95); g.add(rot); g.userData.rotors.push(rot);
  }
  if (seed) { const pod = cyl(0.4, 0.3, 0.5, M('#c8a86a')); pod.position.y = -0.45; g.add(pod); }
  g.scale.setScalar(1.3);
  return g;
}
function makeCamera() {
  const g = new THREE.Group();
  const post = cyl(0.07, 0.09, 1.1, M('#5b4a32')); post.position.y = 0.55; g.add(post);
  // the head turns on the post (yaw) and nods a little (pitch): it always faces where the camera looks
  const head = new THREE.Group(); head.position.y = 1.35; head.rotation.order = 'YXZ'; g.add(head);
  const b = box(0.6, 0.75, 0.45, M('#4d6b3a', { roughness: 0.9 })); head.add(b);
  const lens = cyl(0.17, 0.17, 0.12, M('#1a242b')); lens.rotation.x = Math.PI / 2; lens.position.set(0, 0.03, 0.27); head.add(lens);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), M('#ff4a3a', { emissive: '#ff2a1a', emissiveIntensity: 1.2 })); led.position.set(0.2, 0.27, 0.23); head.add(led);
  g.userData.led = led; g.userData.head = head;
  g.scale.setScalar(1.3);
  return g;
}
function makeRobot() {
  const g = toolProp('robot');
  if (!g) return makeRobotSimple();
  for (const c of g.children) c.position.y -= 0.04;   // tracks on the ground
  g.scale.setScalar(1.25);
  return g;
}
function makeRobotSimple() {
  const g = new THREE.Group();
  const body = box(1.3, 0.6, 1.0, M('#f2f2ee')); body.position.y = 0.6; g.add(body);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 16), M('#e5483b', { emissive: '#a01a10', emissiveIntensity: 0.3 })); lamp.position.set(0, 0.92, 0); g.add(lamp);
  for (const [x, z] of [[0.55, 0.42], [-0.55, 0.42], [0.55, -0.42], [-0.55, -0.42]]) { const w = cyl(0.28, 0.28, 0.2, M('#2b343b')); w.rotation.z = Math.PI / 2; w.position.set(x, 0.28, z); g.add(w); }
  const neck = cyl(0.06, 0.06, 0.45, M('#9fb4c4')); neck.position.set(0, 1.1, 0.3); g.add(neck);
  const head = box(0.4, 0.28, 0.3, M('#9fb4c4')); head.position.set(0, 1.4, 0.32); g.add(head);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), M('#6fd0ff', { emissive: '#2a8fd0', emissiveIntensity: 1 })); eye.position.set(0, 1.42, 0.48); g.add(eye);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), M('#ff5a4a', { emissive: '#ff2010', emissiveIntensity: 1.5 })); beacon.position.set(0, 1.62, 0.32); g.add(beacon);
  g.userData.beacon = beacon;
  g.scale.setScalar(1.25);
  return g;
}
function makeWatergen() {
  const g = new THREE.Group();
  const body = box(1.2, 1.5, 0.9, M('#f4f6f7', { roughness: 0.4 })); body.position.y = 0.75; g.add(body);
  const fan = cyl(0.42, 0.42, 0.06, M('#7d8f9b'), 20); fan.rotation.x = Math.PI / 2; fan.position.set(0, 0.95, 0.47); g.add(fan);
  const blades = box(0.75, 0.06, 0.04, M('#c9d6de')); blades.position.set(0, 0.95, 0.51); g.add(blades); g.userData.fan = blades;
  const panel = box(1.6, 0.06, 1.1, M('#2c4f7a', { metalness: 0.4, roughness: 0.3 })); panel.position.y = 1.75; panel.rotation.x = -0.35; g.add(panel);
  const tank = cyl(0.3, 0.3, 0.7, M('#3aa8e8', { transparent: true, opacity: 0.75, roughness: 0.2 })); tank.position.set(0.85, 0.35, 0); g.add(tank);
  g.scale.setScalar(1.15);
  return g;
}
function makeListener() {
  const g = new THREE.Group();
  const strap = cyl(0.62, 0.62, 0.12, M('#3b2c1e'), 14); g.add(strap);
  const b = box(0.55, 0.65, 0.3, M('#3c4a54')); b.position.set(0, 0, 0.72); g.add(b);
  const panel = box(0.8, 0.05, 0.55, M('#2c4f7a', { metalness: 0.4, roughness: 0.3 })); panel.position.set(0, 0.45, 0.8); panel.rotation.x = -0.6; g.add(panel);
  const ant = cyl(0.02, 0.02, 0.8, M('#222')); ant.position.set(0.2, 0.6, 0.72); g.add(ant);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), M('#8fd067', { emissive: '#4fbf27', emissiveIntensity: 1.4 })); led.position.set(0, 0.05, 0.89); g.add(led);
  g.userData.led = led;
  g.scale.setScalar(1.3);
  return g;
}
function makeNestbox() {
  const g = toolProp('nestbox');
  if (!g) return makeNestboxSimple();
  g.scale.setScalar(1.3); return g;
}
function makeNestboxSimple() {
  const g = new THREE.Group();
  const strap = cyl(0.62, 0.62, 0.1, M('#3b2c1e'), 14); g.add(strap);
  const b = box(0.6, 0.75, 0.55, M('#c8955a', { roughness: 0.9 })); b.position.set(0, 0, 0.85); g.add(b);
  const roof = box(0.8, 0.08, 0.75, M('#8a5a32')); roof.position.set(0, 0.42, 0.85); roof.rotation.x = -0.25; g.add(roof);
  const hole = cyl(0.13, 0.13, 0.05, M('#2a1c0e')); hole.rotation.x = Math.PI / 2; hole.position.set(0, 0.08, 1.14); g.add(hole);
  g.scale.setScalar(1.3); return g;
}
function makeInsectHotel() {
  const g = new THREE.Group();
  const legs = M('#6b4a32');
  for (const x of [-0.5, 0.5]) { const l = box(0.1, 0.6, 0.1, legs); l.position.set(x, 0.3, 0); g.add(l); }
  const body = box(1.3, 1.1, 0.6, M('#c8955a', { roughness: 0.95 })); body.position.y = 1.15; g.add(body);
  const front = new THREE.Mesh(new THREE.CircleGeometry(0.12, 8), M('#4a3018'));
  for (let i = 0; i < 12; i++) { const h = front.clone(); h.position.set(-0.45 + (i % 4) * 0.3, 0.85 + Math.floor(i / 4) * 0.28, 0.31); g.add(h); }
  const roof = box(1.55, 0.1, 0.8, M('#8a5a32')); roof.position.y = 1.78; g.add(roof);
  g.scale.setScalar(1.2); return g;
}
function makeWeather() {
  const g = new THREE.Group();
  const pole = cyl(0.06, 0.08, 3.2, M('#9aa8b2')); pole.position.y = 1.6; g.add(pole);
  const box1 = box(0.6, 0.5, 0.4, M('#f4f6f7')); box1.position.set(0, 1.2, 0.2); g.add(box1);
  const spin = new THREE.Group(); spin.position.y = 3.2; g.add(spin);
  for (let i = 0; i < 3; i++) { const arm = box(0.7, 0.04, 0.04, M('#7d8f9b')); arm.position.x = 0.35; const cup = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6, 0, Math.PI), M('#2c4f7a')); cup.position.x = 0.7; const a = new THREE.Group(); a.add(arm, cup); a.rotation.y = i * Math.PI * 2 / 3; spin.add(a); }
  g.userData.spin = spin;
  const vane = box(0.05, 0.25, 0.6, M('#e5483b')); vane.position.set(0, 2.85, -0.2); g.add(vane);
  g.scale.setScalar(1.2); return g;
}
// the reef's devices (Blender, tools/blender/reef_props.py)
function reefProp(id, scale) { const g = toolProp(id); if (!g) return null; g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(scale); return g; }
// a coral nursery "tree": a white pipe held up by a float, its branches rise at a slant (never across the pipe, so it never
// looks like a cross from any side), with coral fragments hanging on lines (the Blender model had level arms: replaced)
function makeNursery() {
  const g = new THREE.Group(), P = M('#f2f2ee', { roughness: 0.6 }), line = M('#d8d8d0');
  const trunk = cyl(0.045, 0.045, 2.3, P); trunk.position.y = 1.15; g.add(trunk);
  const block = cyl(0.16, 0.2, 0.18, M('#9a9a94')); block.position.y = 0.09; g.add(block);
  const fl = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), M('#f08a1a', { roughness: 0.5 })); fl.position.y = 2.45; g.add(fl);
  const cols = ['#c890d8', '#e89aa8', '#88c0e0', '#d8c070', '#9ad07a'].map((c) => M(c, { roughness: 0.8 }));
  const frag = new THREE.IcosahedronGeometry(0.05, 0);
  let n = 0;
  [0.7, 1.25, 1.8].forEach((h, k) => {
    for (let j = 0; j < 3; j++) {
      const a = (j / 3) * Math.PI * 2 + k * 1.05, L = 0.6 - 0.1 * k, up = 0.75;   // branches climb at about 37°
      const arm = cyl(0.03, 0.03, L, P); const dir = new THREE.Vector3(Math.cos(a), up, Math.sin(a)).normalize();
      arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); arm.position.set(0, h, 0).addScaledVector(dir, L / 2); g.add(arm);
      for (const t of [0.45, 0.8]) {
        const q = new THREE.Vector3(0, h, 0).addScaledVector(dir, L * t);
        const ln = cyl(0.005, 0.005, 0.14, line); ln.position.copy(q).add(new THREE.Vector3(0, -0.07, 0)); g.add(ln);
        const f = new THREE.Mesh(frag, cols[n++ % cols.length]); f.position.copy(q).add(new THREE.Vector3(0, -0.17, 0)); f.scale.set(1, 1.4, 1); g.add(f);
      }
    }
  });
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.scale.setScalar(1.25); return g;
}
function makeROV() {
  const g = reefProp('rov', 1.5); if (!g) return makeDrone();
  const w = new THREE.Group(); g.position.y = -0.6; w.add(g); w.userData.rotors = g.userData.rotors; return w;
}
function makeUWCam() {
  const head = reefProp('uwcam', 1.6); if (!head) return makeCamera();
  const g = new THREE.Group(); head.rotation.order = 'YXZ'; g.add(head);
  g.userData.head = head; g.userData.led = head.userData.led || new THREE.Mesh(new THREE.SphereGeometry(0.01), M('#ff3a2a'));
  return g;
}
// a buoy: the base sits on the sand, the rope reaches up to the surface, the float rides on it (set in addDevice)
function makeFloating(id) {
  const g = reefProp(id, 1.2); if (!g) return id === 'sensor' ? makeWeather() : makeNestboxSimple();
  for (const m of g.children) { if (m.name === 'float' || m.name === 'led') g.userData.top = (g.userData.top || []).concat(m); if (m.name === 'rope') g.userData.rope = m; }
  if (id === 'sensor') g.userData.spin = null;
  return g;
}
export function toolModel(id, biome) {
  if (TECH_IDS.has(id)) return techModel(id);
  if (biome === 'reef') {
    if (id === 'drone') return makeROV();
    if (id === 'camera') return makeUWCam();
    if (id === 'weather') return makeFloating('sensor');
  }
  if (id === 'nursery') return makeNursery();
  if (id === 'reefball') return reefProp('reefball', 1.5) || makeNestboxSimple();
  if (id === 'buoy') return makeFloating('buoy');
  if (id === 'nestbox') return makeNestbox();
  if (id === 'insecthotel') return makeInsectHotel();
  if (id === 'weather') return makeWeather();
  return id === 'drone' ? makeDrone() : id === 'seeddrone' ? makeDrone(true) : id === 'camera' ? makeCamera() : id === 'rescue' ? makeRobot() : id === 'watergen' ? makeWatergen() : makeListener();
}

// free the GPU memory of a model we built (own geometries and materials).
// Textures are never disposed here (the badge texture is shared), and sprites keep three's shared quad geometry.
// opts.geometryOnly: the materials are shared with other live objects (e.g. stumps) – keep them.
export function disposeObject(obj, opts = {}) {
  if (!obj) return;
  if (obj.parent) obj.parent.remove(obj);
  const seen = new Set();
  obj.traverse(o => {
    if (!o.isMesh && !o.isSprite && !o.isLine && !o.isPoints) return;
    if (!o.isSprite && o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); }
    if (opts.geometryOnly) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m && !seen.has(m)) { seen.add(m); m.dispose(); }
  });
}

// floating "!" badge (sprite) used for drone findings and injured animals
const badgeTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#e5483b'; x.beginPath(); x.arc(32, 32, 28, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#fff'; x.lineWidth = 5; x.stroke();
  x.fillStyle = '#fff'; x.font = 'bold 40px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('!', 32, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
function makeBadge() { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTex, depthTest: false, transparent: true })); s.scale.setScalar(1.6); s.renderOrder = 20; return s; }

// ─────────────────────────────────────────── the tools system
export function createTools(ctx) {
  const { W, env, scene, markers, ui, audio, rig, reg } = ctx;
  // ground height including the river logs (the rescue robot and an injured animal stand on a log, not on the riverbed)
  const deckY = (x, z) => { const h = env.heightAt(x, z), b = env.bridgeAt ? env.bridgeAt(x, z) : null; return b !== null && b > h ? b : h; };
  const group = new THREE.Group(); group.name = 'tools'; scene.add(group);
  const placed = [];       // persistent devices {id, x, z, mesh, host?}
  const flights = [];      // drones in the air
  const robots = [];       // rescue robots on their way
  const badges = [];       // {sprite, follow, until}
  W.photos = W.photos || new Set();
  const told = new Set();
  // the new technologies (src/world/tech.js): their models, effects, floating cards and רובו־דע flying on the island
  const tech = createTech({ ...ctx, group, canvas: ctx.canvas || document.getElementById('game') || document.querySelector('canvas') });
  tech.setDevices(() => placed);
  // upgrades from the threads, read where each tool works; kept for a few seconds (the lists ask every frame).
  // Never inside a mystery: its numbers are balanced without them.
  const bcache = new Map(); let bT = 0;
  function boost(tool) {
    if (W.research) return {};
    const now = performance.now(); if (now - bT > 3000) { bcache.clear(); bT = now; }
    let b = bcache.get(tool);
    if (!b) { try { b = toolBoost(tool, W.biomeId) || {}; } catch (e) { b = {}; } bcache.set(tool, b); }
    return b;
  }
  const humidity = () => {
    if (W.biomeId === 'amazon') return 1;
    const s = { winter: 0.9, spring: 0.75, autumn: 0.6, summer: 0.45 }[W.season] ?? 0.7;
    return clamp(s + W.nightGlow * 0.2 + W.rain * 0.2);
  };

  function count(id) { return placed.filter(p => p.id === id).length; }
  function unlocked(def) { if (W.kids && !['drone', 'camera'].includes(def.id)) return false; return (W.missions?.doneCount || 0) >= def.needs || W.allToolsUnlocked; }

  function cards() {
    return ISLAND_TOOLS.filter(d => (!W.kids || ['drone', 'camera'].includes(d.id)) && toolInZone(d, W.biomeId) && !(d.tech && W.research)).map(d0 => {
      const d = toolDef(d0.id, W.biomeId);
      return {
        id: 'tool:' + d.id, name: d.name, kind: 'tool', layer: null, layerName: '', cost: d.cost,
        locked: !unlocked(d), lockText: `נפתח אחרי ${d.needs} משימות`, canAfford: W.points >= d.cost && count(d.id) < d.max,
        alive: d.max < 99 ? count(d.id) : 0, thumb: ICONS[d.icon || d.id], color: d.color, isNew: false,
      };
    });
  }

  // where can it go?
  function check(id, hit) {
    const d = toolDef(id, W.biomeId);
    if (!hit) return { ok: false, reason: `גררו ${zoneWord('to')}` };
    if (!unlocked(d)) return { ok: false, reason: `נפתח אחרי ${d.needs} משימות` };
    if (W.points < d.cost) return { ok: false, reason: 'אין מספיק נקודות חיים' };
    if (count(id) >= d.max) return { ok: false, reason: `אפשר להציב עד ${d.max}` };
    if (Math.hypot(hit.x, hit.z) > env.radius + 0.5) return { ok: false, reason: 'קרוב מדי לקצה' };
    if (id === 'rescue') {
      const a = injuredNear(hit.x, hit.z, 12);
      if (a) return { ok: true, target: a, text: `לטפל ב${a.sp.name}` };
      const waiting = W.animals.filter(x => x.injured && x.alive && !x.leaving);
      return { ok: false, reason: waiting.some(x => !x.injured.saving) ? 'גררו קרוב יותר לבעל החיים הפגוע' : waiting.length ? 'רובוט הצלה כבר בדרך' : 'אין כרגע בעל חיים פגוע' };
    }
    if (id === 'listener' || id === 'nestbox' || TECH_HOST.has(id)) {
      const climb = TECH_HOST.has(id);   // the canopy robot wants a tall tree of its own
      let best = null, bd = 5;
      for (const p of W.plants) {
        if (!p.alive || p.removed || !p.isTree || p.growth < 0.5 || p.falling) continue;
        if (climb && (p.topY() - env.heightAt(p.x, p.z) < 10 || placed.some(q => q.host === p && q.id === id))) continue;
        const dd = Math.hypot(p.x - hit.x, p.z - hit.z); if (dd < bd) { bd = dd; best = p; }
      }
      return best ? { ok: true, host: best, text: climb ? `הרובוט יטפס על ה${best.sp.name}` : `על ה${best.sp.name}` } : { ok: false, reason: 'גררו אל עץ גבוה' };
    }
    if (id === 'drone') return { ok: true, text: W.biomeId === 'reef' ? 'הרובוט יצלול ויסרוק את השונית' : 'הרחפן יטוס ויסרוק את היער' };
    if (env.isWater(hit.x, hit.z)) return { ok: false, reason: 'זה מים' };
    if (W.onRoad && W.onRoad(hit.x, hit.z, 0.5)) return { ok: false, reason: 'לא על הכביש' };
    if (id === 'seeddrone') return W.maxPlants && W.plants.length >= W.maxPlants ? { ok: false, reason: 'היער מלא – אין מקום לעוד צמחים כרגע' } : { ok: true, text: 'כאן יפוזרו כדורי זרעים' };
    if (id === 'watergen') { const h = humidity(); return { ok: true, text: `לחות באוויר: ${Math.round(h * 100)}%` }; }
    if (id === 'lidar') return { ok: true, text: 'מכאן הרחפן ימריא לבד' };
    if (id === 'thermal') return { ok: true, text: W.nightGlow > 0.5 ? 'לילה! הרחפן ימריא מיד' : 'בלילה הרחפן ימריא מכאן' };
    return { ok: true };
  }

  function use(id, hit, chk) {
    const d = toolDef(id, W.biomeId);
    W.points -= d.cost;
    W.stats.toolUse = W.stats.toolUse || {}; W.stats.toolUse[id] = (W.stats.toolUse[id] || 0) + 1;
    audio.play('place');
    // the first time: רובו־דע tells what the tool does (once per player); the full mode keeps its one fact toast per visit after that
    if (!told.has(id) && !W.research) {
      tech.roboAt(new THREE.Vector3(hit.x, env.heightAt(hit.x, hit.z) + 1, hit.z));   // רובו־דע flies to the new device while he tells about it
      told.add(id); const r = W.roboTool ? W.roboTool(id) : null;
      if (!W.xp) Promise.resolve(r).then((x) => { if (!r || x === 'seen' || x === 'none') ui.toast(d.fact, 'info'); });
    }
    if (id === 'drone') return launchSurvey(hit);
    if (id === 'seeddrone') return launchSeeding(hit);
    if (id === 'rescue') return sendRobot(hit, chk.target);
    const p = addDevice(id, hit.x, hit.z, chk.host);
    markers.burst(new THREE.Vector3(p.x, env.heightAt(p.x, p.z) + 1.5, p.z), d.color, 18, { size: 0.45 });
  }

  function addDevice(id, x, z, host, saved) {
    const mesh = toolModel(id, W.biomeId);
    const p = { id, x, z, mesh, host: host || null, t: 0, cool: 0 };
    if (id === 'nursery') { p.stock = Array.isArray(saved?.stock) ? saved.stock.filter(s => reg.byId.has(s)).slice(0, 3) : []; p.grow = Number.isFinite(saved?.grow) ? saved.grow : 0; p.made = saved?.made || 0; }
    if (id === 'camera') {
      // facing (yaw: 0 = +z), tilt, and auto-scan mode; a new camera faces the island's centre and starts scanning
      p.yaw = Number.isFinite(saved?.yaw) ? saved.yaw : Math.atan2(-x, -z) + (Math.random() - 0.5) * 0.6;
      p.pitch = -0.06; p.auto = saved?.auto !== 0; p.turn = 0; p.tilt = 0; p.lock = null; p.lockT = 0; p.lockCool = 0; p.scanT = 0;
      p.recent = new Map(); p.sweepDir = Math.random() < 0.5 ? 1 : -1;
    }
    if ((id === 'listener' || id === 'nestbox') && host) mountOnHost(p, host);
    else if (TECH_HOST.has(id) && host) { p.x = host.x; p.z = host.z; }
    else mesh.position.set(x, env.heightAt(x, z) - 0.02, z);
    if (mesh.userData.rope && env.surfaceY != null) {
      // a buoy: the rope stretches from the ring in the sand to the surface, where the float rides
      const sc = mesh.scale.y, depth = (env.surfaceY - mesh.position.y) / sc;
      mesh.userData.rope.scale.y = Math.max(0.2, depth - 0.1); mesh.userData.rope.position.y = 0;
      for (const m of mesh.userData.top || []) m.position.y += depth;
      p.bobY = depth;
    }
    mesh.rotation.y = id === 'camera' ? 0 : Math.random() * Math.PI * 2;
    if (id === 'camera') { mesh.userData.head.rotation.set(-p.pitch, p.yaw, 0); p.num = placed.filter(q => q.id === 'camera').length + 1; }
    if (id === 'listener' || id === 'nestbox' || TECH_HOST.has(id)) mesh.rotation.y = Math.atan2(rig.controls.object.position.x - p.x, rig.controls.object.position.z - p.z);
    if (TECH_IDS.has(id)) tech.init(p, saved);
    group.add(mesh); placed.push(p);
    if (id === 'listener') W.listener = true;
    return p;
  }

  function mountOnHost(p, host) {
    const mesh = p.mesh; p.host = host; p.x = host.x; p.z = host.z;
    const y = host.y + Math.max(3, (host.vis.crown().bottom || 6) * host.obj.scale.x * 0.55);
    mesh.position.set(host.x, y, host.z);
    if (!p.baseScale) p.baseScale = mesh.scale.x;
    mesh.scale.setScalar(p.baseScale * Math.max(1, (host.vis.trunkRadius || 0.5) * 1.3));
  }
  // a strong nest box (the "nutshell" thread): when its tree falls, it is hung on the nearest tree instead of breaking
  function rehost(p) {
    let best = null, bd = 25;
    for (const q of W.plants) {
      if (!q.alive || q.removed || !q.isTree || q.growth < 0.5 || q.falling || q.dying || q === p.host) continue;
      const d = Math.hypot(q.x - p.x, q.z - p.z); if (d < bd) { bd = d; best = q; }
    }
    if (!best) return false;
    mountOnHost(p, best);
    markers.burst(new THREE.Vector3(best.x, p.mesh.position.y, best.z), '#c8955a', 12, { size: 0.4 });
    (W.amb || ui.toast)('תיבת הקינון החזקה שרדה, ונתלתה על עץ אחר', 'good');
    return true;
  }

  // ───── monitoring drone: flies a loop, then reports what needs attention
  function launchSurvey(hit) {
    const mesh = W.biomeId === 'reef' ? makeROV() : makeDrone(); group.add(mesh);
    const start = new THREE.Vector3(hit.x, env.heightAt(hit.x, hit.z) + 1.5, hit.z);
    // invented in רובו־דע's lab: a shark-skin coat lets the underwater robot glide through the water faster
    const skin = W.biomeId === 'reef' && hasInvention('sharkskin');
    const b = boost('drone');
    const dur = skin ? 7 : 11 / (b.speed || 1);   // threads: a faster drone (the shark-skin coat keeps its own 7 s)
    flights.push({ kind: 'survey', mesh, t: 0, dur, start, a0: Math.atan2(hit.z, hit.x), hover: !!b.hover, share: !!b.share });
    (W.amb || ui.toast)(W.biomeId === 'reef' ? (skin ? 'הרובוט הצולל עם ציפוי עור הכריש יצא לדרך, וסורק את השונית מהר...' : 'הרובוט הצולל יצא לדרך – סורק את השונית...') : 'רחפן הניטור המריא – סורק את היער...', 'info');
  }
  function surveyReport(f = {}) {
    const lines = [], marks = [];
    if (f.hv && f.hv.a) lines.push(`🚁 הרחפן ריחף מעל ה${f.hv.a.sp.name}, ${f.hv.a.injured ? 'שצריך רובוט הצלה' : 'שמחפש אוכל'}.`);
    const plants = W.plants.filter(p => p.alive && !p.removed && !p.dying);
    const dark = plants.filter(p => p.sp.kind !== 'fungus' && p.light < (p.sp.lightNeed ?? 0.5) * 0.55 && p.health < 0.85);
    let moveBtn = false;
    if (dark.length) {
      lines.push(`🌑 ${dark.length} צמחים לא מקבלים מספיק אור: ${[...new Set(dark.map(p => p.sp.name))].slice(0, 4).join(', ')}.`); marks.push(...dark.slice(0, 4));
      const young = dark.filter(p => p.growth < 0.6 && !p.host);
      if (young.length) { lines.push(`   ← אפשר להעביר ${young.length} שתילים צעירים למקום מואר (כפתור למטה).`); moveBtn = true; }
      if (dark.some(p => p.growth >= 0.6)) lines.push('   ← צמח גדול בצל: שתלו לידו צמחים שאוהבים צל (שרך, רקפת), או חכו שעץ ייפול ויפתח חלון אור.');
    }
    const thirsty = plants.filter(p => p.health < 0.5 && !dark.includes(p));
    if (thirsty.length) { lines.push(`💧 ${thirsty.length} צמחים חלשים או צמאים: ${[...new Set(thirsty.map(p => p.sp.name))].slice(0, 4).join(', ')}.`); marks.push(...thirsty.slice(0, 3)); }
    const hungry = W.animals.filter(a => a.alive && !a.leaving && a.type === 'animal' && a.energy < 0.35 && a.sp.diet2.length);
    for (const sid of [...new Set(hungry.map(a => a.sp.id))].slice(0, 3)) { const sp = reg.byId.get(sid); lines.push(`🍽 ה${sp.name} ${gw(sid,'רעב','רעבה','רעבים','רעבות')}. ${gw(sid,'הוא אוכל','היא אוכלת','הם אוכלים','הן אוכלות')}: ${sp.diet2.map(e => reg.byId.get(e.to)?.name).filter(Boolean).slice(0, 3).join(', ')}.`); }
    marks.push(...hungry.slice(0, 3));
    const present = new Set(W.aliveSpecies());
    for (const sid of present) {
      const sp = reg.byId.get(sid); if (!sp?.isPlant) continue;
      if (sp.pollinators.length && !sp.pollinators.some(x => present.has(x))) lines.push(`🌸 ל${sp.name} אין מאביק ${zoneWord('in')}. מי יכול לעזור: ${sp.pollinators.map(x => reg.byId.get(x)?.name).join(', ')}.`);
      else if (sp.dispersers.length && !sp.dispersers.some(x => present.has(x))) lines.push(`🌱 אין מי שיפיץ את הזרעים של ה${sp.name}: ${sp.dispersers.map(x => reg.byId.get(x)?.name).join(', ')}.`);
    }
    const inj = W.animals.filter(a => a.injured);
    for (const a of inj) lines.push(`❗ ${a.sp.name} ${a.injured.cause}. ${a.injured.saving ? 'רובוט הצלה כבר בדרך.' : 'שלחו רובוט הצלה!'}`);
    if (W.road && !W.road.bridge) lines.push('🛣 הכביש חותך את היער לשניים. לחצו עליו כדי לתקן.');
    const wg = TOOL_DEFS.find(t => t.id === 'watergen');
    if ((W.drought > 0.2 || (W.biomeId === 'grove' && W.season === 'summer')) && unlocked(wg) && count('watergen') < wg.max) lines.push('☀ האדמה יבשה. מחולל מים מהאוויר ליד העצים יעזור.');
    if (f.share) {   // threads (anternet): the drone hears what the field cameras found, and one report holds it all
      const cams = placed.filter(p => p.id === 'camera').length;
      if (cams) lines.push(`📡 הרחפן קיבל גם מ${cams === 1 ? 'מצלמת השטח' : cams + ' מצלמות השטח'}: עד עכשיו צולמו ${W.photos.size} מינים.`);
    }
    for (const m of marks.slice(0, 8)) addBadge(m, f.share ? 60 : 30);
    W.points += 3;
    const ok = lines.length === 0;
    const buttons = [{ id: 'ok', label: 'תודה, רחפן!' }];
    if (moveBtn) buttons.unshift({ id: 'move-shaded', label: 'העבירו את השתילים המוצלים לאור (10 נקודות)' });
    ui.showDialog({ title: 'דוח רחפן הניטור', text: ok ? 'הרחפן סרק את כל היער – הכול נראה טוב! כל המינים מקבלים מה שהם צריכים.' : 'הרחפן מצא כמה דברים שכדאי לטפל בהם (הם מסומנים ב-! אדום):\n\n' + lines.slice(0, W.xp ? 4 : 9).join('\n'), buttons });
    audio.play('discover');
  }

  // ───── seed-ball drone
  function launchSeeding(hit) {
    const mesh = makeDrone(true); group.add(mesh);
    const a = Math.atan2(hit.z, hit.x);
    const start = new THREE.Vector3(Math.cos(a) * 50, 25, Math.sin(a) * 50);
    const target = new THREE.Vector3(hit.x, env.heightAt(hit.x, hit.z) + 9, hit.z);
    flights.push({ kind: 'seed', mesh, t: 0, dur: 6, start, target, dropped: false });
  }
  function dropSeeds(f) {
    if (W.research) { W.research.onSeeds?.(f.target); return; }   // a mystery: the seeds go into the soil (the model's seed bank)
    const pool = (W.biomeId === 'amazon' ? ['cecropia', 'fig', 'brazilnut', 'kapok', 'acai', 'heliconia'] : ['oak', 'carob', 'terebinth', 'mastic', 'sage', 'rockrose'])
      .filter(id => W.unlocked.has(id) || reg.byId.get(id)?.unlock === 'start');
    let n = 0;
    for (let i = 0; i < 6 && n < 4; i++) {
      const sp = reg.byId.get(pool[(Math.random() * pool.length) | 0]); if (!sp) continue;
      const s = ctx.findSpotNear(sp, f.target.x, f.target.z, 6); if (!s) continue;
      const p = ctx.spawnPlant(sp, s.x, s.z, { growth: 0.06 }); if (!p) continue;
      W.everPlaced.add(sp.id); n++; W.stats.seeded = (W.stats.seeded || 0) + 1;
      markers.burst(new THREE.Vector3(s.x, env.heightAt(s.x, s.z) + 0.4, s.z), '#a07a4a', 12, { size: 0.35, speed: 1.2 });
    }
    ui.toast(n ? `רחפן הזריעה פיזר כדורי זרעים – ${n} שתילים חדשים נובטים!` : 'אין כאן מקום פנוי לשתילים', n ? 'good' : 'warn');
    if (n) W.points += 2;
  }

  // ───── injured animals + rescue robot
  let injuryT = 120, hurtN = 0;
  // 1.3.2: an injured animal waits longer for help (Avi: the alert got lost), and רובו־דע reminds once before it leaves
  const HURT_WAIT = 150, HURT_REMIND = 45;
  function injuredNear(x, z, r) { let best = null, bd = r; for (const a of W.animals) if (a.injured && !a.injured.saving && a.alive && !a.leaving) { const d = Math.hypot(a.pos.x - x, a.pos.z - z); if (d < bd) { bd = d; best = a; } } return best; }
  function maybeInjure(dt) {
    if (W.kids || W.research || W.day < 2 || W.animals.some(a => a.injured)) return;
    if (W.missions?.current()?.goal?.type === 'rescue') injuryT = Math.min(injuryT, 25);
    injuryT -= dt; if (injuryT > 0) return;
    injuryT = 150 + Math.random() * 120;
    const cand = W.animals.filter(a => a.alive && !a.leaving && !a.touring && a.type === 'animal' && a.visible && (a.loco === 'ground' || a.loco === 'flying') && !a.sp.isInsect && (a.loco !== 'flying' || !a.perch));
    if (!cand.length) return;
    const a = cand[(Math.random() * cand.length) | 0];
    let cause;
    const g = (m, f, mp, fp) => gw(a.sp.id, m, f, mp, fp);
    if (W.road && !W.road.bridge && a.loco === 'ground') cause = g('נפגע כשניסה', 'נפגעה כשניסתה', 'נפגעו כשניסו', 'נפגעו כשניסו') + ' לחצות את הכביש';
    else if (a.loco === 'flying') cause = g('נתקע', 'נתקעה', 'נתקעו', 'נתקעו') + ` ברשת ישנה שמישהו השאיר ${zoneWord('in')}`;
    else cause = [g('נפצע', 'נפצעה', 'נפצעו', 'נפצעו') + ' ברגל מחתיכת זכוכית שנזרקה', g('נתקע', 'נתקעה', 'נתקעו', 'נתקעו') + ' בשקית ניילון'][(Math.random() * 2) | 0];
    if (a.loco === 'flying') { a.path = null; a.perch = null; a.pos.y = env.heightAt(a.pos.x, a.pos.z) + 0.3; }
    a.injured = { t: 0, max: HURT_WAIT, cause, uid: ++hurtN, reminded: false };
    a.state = 'sleep'; a.action = 'sleep';
    removeBadge(a);   // a short-lived drone "!" on it would otherwise expire and take the alert with it
    addBadge(a, 999, true);
    // the alert is the red bar at the top (game.js → ui.setInjured), with the animal's picture, its name and what
    // happened; it stays until the animal is healed or gone. One short sound; רובו־דע explains it the first time.
    audio.play('event');
    tech.roboAt(a.pos);   // רובו־דע flies to it while he tells
    if (W.onHurt) W.onHurt('new', a);
    if (!unlocked(TOOL_DEFS.find(t => t.id === 'rescue'))) { W.allToolsUnlocked = true; }   // the rescue robot must be available when needed
  }
  function sendRobot(hit, a) {
    const mesh = makeRobot(); group.add(mesh);
    const p = new THREE.Vector3(hit.x, env.heightAt(hit.x, hit.z), hit.z);
    mesh.position.copy(p);
    if (a.injured) a.injured.saving = true;   // only one robot per injured animal
    robots.push({ mesh, a, phase: 'go', t: 0 });
  }
  function updateInjured(a, rdt, t) {
    // an event (or anything else) made it leave: drop the injury so the normal update can play the leaving animation
    if (!a.alive || a.leaving || a.dying) { a.injured = null; removeBadge(a); return; }
    addBadge(a, 999, true);   // e.g. after an experiment hid it, the badge comes back
    a.injured.t += W.lastTickDt;
    if (!a.injured.reminded && !a.injured.saving && a.injured.t > a.injured.max - HURT_REMIND) { a.injured.reminded = true; tech.roboAt(a.pos); if (W.onHurt) W.onHurt('remind', a); }
    a.obj.position.set(a.pos.x, a.groundY(a.pos.x, a.pos.z) + (a.loco === 'flying' ? 0.2 : 0), a.pos.z);
    a.vis.update(rdt, { action: 'sleep', speed: 0, t, night: W.nightGlow });
    if (a.injured.t > a.injured.max && !a.injured.saving) {
      a.injured = null; removeBadge(a); a.leave();
      ui.toast(`${a.sp.name} ${gw(a.sp.id,'לא קיבל עזרה בזמן ועזב','לא קיבלה עזרה בזמן ועזבה','לא קיבלו עזרה בזמן ועזבו','לא קיבלו עזרה בזמן ועזבו')} את ${zoneWord()}.`, 'bad');
    }
  }

  // ───── badges
  function addBadge(ent, secs, pulse) {
    if (badges.some(b => b.follow === ent)) return;
    const s = makeBadge(); group.add(s);
    badges.push({ sprite: s, follow: ent, until: W.simT + secs, pulse });
  }
  function removeBadge(ent) { for (let i = badges.length - 1; i >= 0; i--) if (badges[i].follow === ent) { disposeObject(badges[i].sprite); badges.splice(i, 1); } }

  // ───── field cameras: 360° head, auto scan with a short lock-on, photos of what is in front of the lens
  const hooks = { onShot: null };
  const wrapA = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
  const _f = new THREE.Vector3();
  /** lens position of a placed camera (world) */
  function camEye(p, out = new THREE.Vector3()) { return out.set(p.x + Math.sin(p.yaw) * 0.42, env.heightAt(p.x, p.z) + CAM.eyeY, p.z + Math.cos(p.yaw) * 0.42); }
  const camOK = (a) => a.alive && !a.removed && !a.leaving && a.type === 'animal';
  /** where an animal is seen from the camera: horizontal distance, bearing offset from the facing, height difference */
  function bearing(p, a, eyeY) {
    a.focusPoint(_f);
    const dx = _f.x - p.x, dz = _f.z - p.z, d = Math.hypot(dx, dz);
    return { d, off: wrapA(Math.atan2(dx, dz) - p.yaw), dy: _f.y - eyeY };
  }
  function pickTarget(p) {
    const eyeY = env.heightAt(p.x, p.z) + CAM.eyeY;
    let best = null, bs = Infinity;
    const view = CAM.view * camNight();
    for (const a of W.animals) {
      if (!camOK(a)) continue;
      const until = p.recent.get(a); if (until && until > W.simT) continue;
      const b = bearing(p, a, eyeY);
      if (b.d > view || b.d < 0.6 || Math.abs(b.dy) > 14) continue;
      const moving = (a.speed || 0) > 0.15;
      const key = a.sp.id + (W.nightGlow > 0.5 ? ':night' : '');
      // near + moving + not photographed yet wins; a small bias toward what is already in view keeps the swings calm
      const s = b.d + (moving ? 0 : 5) + (W.photos.has(key) ? 4 : 0) + Math.abs(b.off) * 1.5;
      if (s < bs) { bs = s; best = a; }
    }
    return best;
  }
  function aimCamera(p, dt) {
    if (p.auto) {
      p.scanT -= dt; p.lockCool -= dt;
      const eyeY = env.heightAt(p.x, p.z) + CAM.eyeY;
      if (p.lock && (!camOK(p.lock) || bearing(p, p.lock, eyeY).d > CAM.view + 3)) { p.lock = null; p.lockCool = 1; }
      if (p.lock) { p.lockT -= dt; if (p.lockT <= 0) { p.recent.set(p.lock, W.simT + 10); p.lock = null; p.lockCool = 1.6; } }
      if (!p.lock && p.lockCool <= 0 && p.scanT <= 0) {
        p.scanT = 0.4;
        if (p.recent.size > 24) for (const [k, v] of p.recent) if (v < W.simT) p.recent.delete(k);
        p.lock = pickTarget(p); if (p.lock) p.lockT = 4 + Math.random() * 1.5;
      }
      if (p.lock) {
        const b = bearing(p, p.lock, eyeY);
        p.yaw += clamp(b.off * 2.6, -CAM.turnMax, CAM.turnMax) * dt;
        const pt = clamp(Math.atan2(b.dy, Math.max(0.5, b.d)), CAM.pitchMin, CAM.pitchMax);
        p.pitch += (pt - p.pitch) * Math.min(1, dt * 3);
      } else {
        p.yaw += CAM.sweep * p.sweepDir * dt;
        p.pitch += (-0.06 - p.pitch) * Math.min(1, dt * 1.5);
      }
    }
    p.yaw = wrapA(p.yaw); p.pitch = clamp(p.pitch, CAM.pitchMin, CAM.pitchMax);
    p.mesh.userData.head.rotation.set(-p.pitch, p.yaw, 0);
  }
  // threads: a brighter lamp sees farther at night (lamp), a hidden camera has a wider, quicker eye for shy animals (camo)
  function camNight() { return W.nightGlow > 0.5 ? (boost('camera').night || 1) : 1; }
  /** the animal in the photo cone (the locked one first, else the nearest) */
  function cameraSees(p) {
    const eyeY = env.heightAt(p.x, p.z) + CAM.eyeY;
    const range = CAM.range * camNight(), half = CAM.half * (boost('camera').shy ? 1.25 : 1);
    let best = null, bd = Infinity;
    for (const a of W.animals) {
      if (!camOK(a)) continue;
      const b = bearing(p, a, eyeY);
      if (b.d > range || Math.abs(b.off) > half || Math.abs(b.dy) > 12) continue;
      const s = a === p.lock ? -1 : b.d;
      if (s < bd) { bd = s; best = a; }
    }
    return best;
  }

  // ───── per-frame
  const _v = new THREE.Vector3();
  function update(dt, rdt, t) {
    // drones
    for (let i = flights.length - 1; i >= 0; i--) {
      const f = flights[i]; f.t += rdt;
      for (const r of f.mesh.userData.rotors) r.rotation.y += rdt * 40;
      if (f.kind === 'survey') {
        const u = clamp(f.t / f.dur);
        const rise = Math.min(1, f.t / 1.5);
        const ang = f.a0 + u * Math.PI * 2, R = 24;
        const tx = Math.cos(ang) * R, tz = Math.sin(ang) * R, ty = env.underwater ? Math.min(32, env.surfaceY - 4) : 32;
        const k = Math.min(1, f.t / 2.5);
        f.mesh.position.set(f.start.x + (tx - f.start.x) * k, f.start.y + (ty - f.start.y) * rise, f.start.z + (tz - f.start.z) * k);
        f.mesh.rotation.y = -ang; f.mesh.rotation.z = 0.15;
        if (Math.random() < rdt * 3) markers.burst(_v.set(f.mesh.position.x, env.heightAt(f.mesh.position.x, f.mesh.position.z) + 0.5, f.mesh.position.z), '#6fd0ff', 4, { size: 0.3, speed: 0.6, up: 0.3 });
        if (u >= 1 && f.hover && !f.hv && !W.research) {
          // threads (hover): it stops in the air over an animal that needs help, and marks it
          const a = W.animals.find(x => x.injured && x.alive && !x.leaving) || W.animals.filter(x => x.alive && !x.leaving && x.type === 'animal' && x.energy < 0.35).sort((p, q) => p.energy - q.energy)[0];
          if (a) { f.hv = { a, t: 0, from: f.mesh.position.clone() }; addBadge(a, 30); }
        }
        if (f.hv) {
          f.hv.t += rdt; const a = f.hv.a; a.focusPoint(_v); _v.y += env.underwater ? 3 : 6;
          f.mesh.position.lerpVectors(f.hv.from, _v, Math.min(1, f.hv.t / 2)); f.mesh.position.y += Math.sin(t * 3) * 0.15; f.mesh.rotation.z = 0;
          if (Math.random() < rdt * 4) markers.burst(a.focusPoint(_v), '#6fd0ff', 5, { size: 0.35, speed: 0.5 });
          if (f.hv.t > 4.5) { disposeObject(f.mesh); flights.splice(i, 1); surveyReport(f); }
          continue;
        }
        if (u >= 1) { disposeObject(f.mesh); flights.splice(i, 1); if (W.research) W.research.onSurvey?.(); else surveyReport(f); }   // a mystery shows its own count
      } else {
        const u = clamp(f.t / f.dur);
        if (u < 0.6) f.mesh.position.lerpVectors(f.start, f.target, u / 0.6);
        else if (!f.dropped) { f.dropped = true; dropSeeds(f); }
        else f.mesh.position.lerpVectors(f.target, new THREE.Vector3(-f.start.x, 30, -f.start.z), (u - 0.6) / 0.4);
        f.mesh.rotation.y = Math.atan2(f.target.x - f.start.x, f.target.z - f.start.z);
        if (u >= 1) { disposeObject(f.mesh); flights.splice(i, 1); }
      }
    }
    // rescue robots
    for (let i = robots.length - 1; i >= 0; i--) {
      const r = robots[i]; r.t += rdt; const a = r.a;
      if (r.mesh.userData.beacon) r.mesh.userData.beacon.material.emissiveIntensity = 0.8 + Math.sin(t * 10) * 0.8;
      if (r.phase === 'go') {
        if (!a.alive || !a.injured || a.leaving) { r.phase = 'leave'; r.t = 0; continue; }
        a.injured.saving = true;
        const dx = a.pos.x - r.mesh.position.x, dz = a.pos.z - r.mesh.position.z, d = Math.hypot(dx, dz);
        r.mesh.rotation.y = Math.atan2(dx, dz);
        if (d > 1.6) { const s = Math.min(d, 5 * (boost('rescue').speed || 1) * rdt); r.mesh.position.x += dx / d * s; r.mesh.position.z += dz / d * s; r.mesh.position.y = deckY(r.mesh.position.x, r.mesh.position.z); }
        else { r.phase = 'heal'; r.t = 0; }
      } else if (r.phase === 'heal') {
        if (!a.alive || !a.injured || a.leaving) { r.phase = 'leave'; r.t = 0; continue; }   // healed by someone else, or gone
        if (Math.random() < rdt * 8) markers.burst(a.focusPoint(_v), '#9fffb0', 6, { size: 0.4, speed: 1 });
        const rb = boost('rescue');
        if (r.t > 3 / ((rb.speed || 1) * (rb.heal || 1))) {   // threads: a gentle gripper and a wet-skin patch heal sooner
          a.injured = null; removeBadge(a); a.energy = 1; a.state = 'idle'; a.timer = 0.5;
          W.points += 8; W.stats.rescues = (W.stats.rescues || 0) + 1;
          ui.toast(`ה${a.sp.name} ${gw(a.sp.id,'טופל וחזר','טופלה וחזרה','טופלו וחזרו','טופלו וחזרו')} לחיות ${zoneWord('in')}! (+8)`, 'good'); audio.play('mission');
          r.phase = 'leave'; r.t = 0;
        }
      } else {
        r.mesh.position.y += rdt * 0.6; r.mesh.scale.multiplyScalar(1 - rdt * 1.5);
        if (r.t > 1.5) { disposeObject(r.mesh); robots.splice(i, 1); }
      }
    }
    // devices
    for (const p of placed) {
      p.t += rdt;
      if (TECH_IDS.has(p.id)) {
        if (!p.dead) tech.tick(p, dt, rdt, t);
        if (p.dead && !p.gone) { p.gone = true; tech.removed(p); disposeObject(p.mesh); }
        continue;
      }
      if (p.id === 'buoy' && !W.research) buoyGuard(p, dt);
      if (p.id === 'camera') {
        p.mesh.userData.led.material.emissiveIntensity = (Math.sin(t * 3) > 0.6) ? 1.6 : 0.2;
        aimCamera(p, dt);
        p.cool -= dt; if (p.cool > 0) continue;
        // it photographs what is in front of the lens (the same cone the camera view shows)
        const a = cameraSees(p);
        if (a) {
          p.cool = boost('camera').shy ? 4 : 6;
          markers.burst(_v.set(p.x, env.heightAt(p.x, p.z) + 2, p.z), '#ffffff', 10, { size: 0.6, speed: 0.4, life: 0.4 });
          const key = a.sp.id + (W.nightGlow > 0.5 ? ':night' : '');
          const fresh = !W.photos.has(key);
          if (fresh) {
            W.photos.add(key); W.points += 3; audio.play('points');
            if (!W.research) (W.amb || ui.toast)(`📷 מצלמת השטח צילמה: ${a.sp.name}${W.nightGlow > 0.5 ? ' – בלילה!' : ''} (+3)`, 'good');   // a mystery reports its counts in its own notebook
          }
          if (hooks.onShot) hooks.onShot(p, a, fresh);
        }
      } else if (p.id === 'watergen') {
        const h = humidity();
        if (p.mesh.children[2]) p.mesh.children[2].rotation.z += rdt * (2 + 8 * h);
        if (Math.random() < rdt * 2 * h) markers.burst(_v.set(p.x, env.heightAt(p.x, p.z) + 0.6, p.z), '#5cc4ff', 3, { size: 0.28, speed: 0.4, up: 0.2, life: 0.8 });
      } else if (p.id === 'weather') { if (p.mesh.userData.spin) p.mesh.userData.spin.rotation.y += rdt * (2 + W.wind * 8); }
      else if (p.id === 'nursery') nurseryTick(p, dt);
      if (p.bobY != null) for (const m of p.mesh.userData.top || []) m.position.y = p.bobY + Math.sin(t * 1.3 + p.x) * 0.06;
      else if (p.id === 'nestbox' || p.id === 'listener') {
        // only a really dead host takes the device with it; a host hidden by an experiment just hides it for a while
        if (p.host && (!p.host.alive || p.host.dying || p.host.falling)) {
          if (p.id === 'nestbox' && boost('nestbox').storm && rehost(p)) continue;
          disposeObject(p.mesh); p.dead = true; continue;
        }
        p.hidden = !!(p.host && p.host.removed);
        p.mesh.visible = !p.hidden;
        if (p.id === 'listener' && !p.hidden) p.mesh.userData.led.material.emissiveIntensity = (Math.sin(t * 2) > 0.8) ? 2 : 0.3;
      }
    }
    for (let i = placed.length - 1; i >= 0; i--) if (placed[i].dead) placed.splice(i, 1);
    W.listener = placed.some(p => p.id === 'listener' && !p.hidden);
    W.weatherStation = placed.some(p => p.id === 'weather');
    W.nestboxes = placed.filter(p => p.id === 'nestbox' && !p.hidden).length;
    W.insectHotels = placed.filter(p => p.id === 'insecthotel');
    W.reefBalls = placed.filter(p => p.id === 'reefball');
    W.buoy = placed.some(p => p.id === 'buoy');
    // badges follow their entity
    for (let i = badges.length - 1; i >= 0; i--) {
      const b = badges[i], e = b.follow;
      if (W.simT > b.until || !e.alive || e.removed) { disposeObject(b.sprite); badges.splice(i, 1); continue; }
      e.focusPoint(_v); const top = e.isPlant ? e.topY() + 1.2 : _v.y + 1.4;
      b.sprite.position.set(_v.x, top, _v.z);
      let s = 1.4;
      if (b.pulse) {   // an injured animal: a larger "!" that pulses, and keeps its size on the screen when the camera is far
        const cam = ctx.camera; const d = cam ? cam.position.distanceTo(b.sprite.position) : 30;
        const base = Math.min(8, Math.max(1.5, d * 0.08));
        s = base * (1 + Math.sin(t * 6) * 0.16);
        b.sprite.position.y += base * 0.4;   // a bigger badge floats a little higher, clear of the animal
      }
      b.sprite.scale.setScalar(s);
    }
    maybeInjure(dt);
    tech.frame(rdt, t);
  }
  // a mooring buoy that guards more (the "cleaning-station" thread): corals in a wide circle round it are spared the
  // boats' harm, and recover a little; the circle shows as a faint ring on the sand
  function buoyGuard(p, dt) {
    const R = 10 * (boost('buoy').range || 0); if (!R) { if (p.guard) p.guard.visible = false; return; }
    if (!p.guard) {
      p.guard = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 64), new THREE.MeshBasicMaterial({ color: '#7fe8ff', transparent: true, opacity: 0.18, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
      p.guard.rotation.x = -Math.PI / 2; group.add(p.guard);
    }
    p.guard.visible = true; p.guard.scale.setScalar(R); p.guard.position.set(p.x, env.heightAt(p.x, p.z) + 0.15, p.z);
    for (const q of W.plants) if (q.alive && !q.removed && q.sp.kind === 'coral' && q.health < 1 && Math.hypot(q.x - p.x, q.z - p.z) < R) q.health = Math.min(1, q.health + dt * 0.004);
  }

  // coral nursery: weak corals around it get a little stronger, and on its branches grow fragments of corals that stood
  // the heat (strong corals). Up to NURSERY_MAX wait in each nursery; the child transplants them from the tray.
  // Branching corals (Stylophora, Acropora) are the ones grown in real nurseries; the brain coral is not cut into fragments.
  const NURSERY_CORALS = ['branching', 'table', 'firecoral'];
  const NURSERY_GROW = 40, NURSERY_MAX = 3;   // sim seconds per fragment
  let nurseryTold = false;
  function nurseryTick(p, dt) {
    for (const q of W.plants) {
      if (!q.alive || q.removed || q.sp.kind !== 'coral' || q.health >= 1) continue;
      if (Math.hypot(q.x - p.x, q.z - p.z) < 12) q.health = Math.min(1, q.health + dt * 0.01);
    }
    if (W.research) return;
    p.stock = p.stock || [];
    if (p.stock.length >= NURSERY_MAX) { p.grow = 0; return; }
    p.grow = (p.grow || 0) + dt;
    if (p.grow < NURSERY_GROW) return;
    p.grow = 0;
    const pool = NURSERY_CORALS.filter(id => reg.byId.has(id) && (W.unlocked.has(id) || reg.byId.get(id)?.unlock === 'start'));
    if (!pool.length) return;
    p.made = (p.made || 0) + 1;
    const sid = pool[p.made % pool.length];
    p.stock.push(sid);
    markers.burst(new THREE.Vector3(p.x, env.heightAt(p.x, p.z) + 2.2, p.z), '#ffb0c8', 14, { size: 0.4, speed: 0.8 });
    W.nurseryNew = (W.nurseryNew || 0) + 1;
    if (!nurseryTold) { nurseryTold = true; ui.toast(`במשתלה גדל ${reg.byId.get(sid).name} חזק! הוא מחכה במגש. גררו אותו למקום בשונית, הכי טוב למקום שבו השונית נפגעה.`, 'good', 8000); }
  }
  /** strong young corals waiting in the nurseries: Map(species id → count) */
  function nurseryStock() {
    const m = new Map();
    for (const p of placed) if (p.id === 'nursery') for (const sid of p.stock || []) m.set(sid, (m.get(sid) || 0) + 1);
    return m;
  }
  /** one strong coral of this species leaves a nursery (the one with most waiting) */
  function takeFromNursery(sid) {
    const ps = placed.filter(p => p.id === 'nursery' && (p.stock || []).includes(sid)).sort((a, b) => b.stock.length - a.stock.length);
    if (!ps.length) return false;
    const p = ps[0]; p.stock.splice(p.stock.indexOf(sid), 1);
    return true;
  }

  // water from the air: extra water for plants near a generator (0..1)
  W.waterBonusAt = (x, z) => {
    let b = 0; const h = humidity();
    for (const p of placed) if (p.id === 'watergen') { const d = Math.hypot(p.x - x, p.z - z); if (d < 11) b = Math.max(b, (1 - d / 11) * 0.5 + 0.5); }
    return Math.min(1, b * (0.4 + 0.6 * h) * (boost('watergen').output || 1));   // threads: more power, more water
  };

  function serialize() { return { devices: placed.map(p => ({ id: p.id, x: +p.x.toFixed(2), z: +p.z.toFixed(2), ...(p.id === 'camera' ? { yaw: +p.yaw.toFixed(2), auto: p.auto ? 1 : 0 } : {}), ...(p.id === 'nursery' ? { stock: (p.stock || []).slice(), grow: Math.round(p.grow || 0), made: p.made || 0 } : {}), ...(TECH_IDS.has(p.id) ? tech.save(p) : {}) })), photos: [...W.photos], told: [...told] }; }
  function restore(S, findHost) {
    if (!S) return;
    for (const k of S.photos || []) W.photos.add(k);
    for (const k of S.told || []) told.add(k);
    for (const d of S.devices || []) { const needsHost = d.id === 'listener' || d.id === 'nestbox' || TECH_HOST.has(d.id); const host = needsHost ? findHost(d.x, d.z) : null; if (needsHost && !host) continue; addDevice(d.id, d.x, d.z, host, d); }
  }
  function dispose() {
    try { tech.dispose(); } catch (e) { console.error(e); }
    disposeObject(group);
    placed.length = 0; flights.length = 0; robots.length = 0; badges.length = 0;
  }
  // a mystery that starts over takes its devices off the island (nest boxes, buoys, reef balls…)
  function removeDevices(test) {
    for (let i = placed.length - 1; i >= 0; i--) { const p = placed[i]; if (!test(p)) continue; if (TECH_IDS.has(p.id)) tech.removed(p); if (p.guard) disposeObject(p.guard); group.remove(p.mesh); disposeObject(p.mesh); placed.splice(i, 1); }
  }
  // ───── moving a placed device by dragging it (game.js): the ones standing on the ground (not the nest box / listener on a tree)
  const MOVABLE_DEV = new Set(['camera', 'watergen', 'insecthotel', 'weather', 'nursery', 'reefball', 'buoy', 'lidar', 'thermal', 'firetower', 'reefspeaker', 'spawnbot']);
  const _pd = new THREE.Vector3();
  function pickDevice(cx, cy, rect) {
    let best = null, bd = 34;
    for (const p of placed) {
      if (!MOVABLE_DEV.has(p.id) || p.host || p.dead) continue;
      _pd.set(p.x, env.heightAt(p.x, p.z) + 0.9, p.z).project(ctx.camera); if (_pd.z > 1) continue;
      const d = Math.hypot((_pd.x + 1) / 2 * rect.width + rect.left - cx, (1 - _pd.y) / 2 * rect.height + rect.top - cy);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }
  function checkDeviceMove(p, hit) {
    if (!hit) return { ok: false, reason: `גררו ${zoneWord('to')}` };
    if (Math.hypot(hit.x, hit.z) > env.radius + 0.5) return { ok: false, reason: 'קרוב מדי לקצה' };
    if (env.isWater(hit.x, hit.z)) return { ok: false, reason: 'זה מים' };
    if (W.onRoad && W.onRoad(hit.x, hit.z, 0.5)) return { ok: false, reason: 'לא על הכביש' };
    return { ok: true, text: 'שחררו כדי להציב כאן' };
  }
  /** show the device at (x, z) (while dragging) or put it there (commit) */
  function placeDeviceAt(p, x, z, commit, lift = 0) {
    p.mesh.position.set(x, env.heightAt(x, z) - 0.02 + lift, z);
    if (!commit) return;
    p.x = x; p.z = z;
    if (p.mesh.userData.rope && env.surfaceY != null) {   // a buoy: the rope fits the new depth
      const sc = p.mesh.scale.y, depth = (env.surfaceY - p.mesh.position.y) / sc;
      p.mesh.userData.rope.scale.y = Math.max(0.2, depth - 0.1); p.bobY = depth;
    }
    W.stats.moved = (W.stats.moved || 0) + 1;
  }
  // ───── events (game.js): the choices to show (threads add new ones in the full mode; חוויה keeps two), and what the
  // devices do when an event starts (a fire tower, the young-corals robot, murky water that clears sooner)
  function eventChoices(e) {
    const base = (e && e.choices) || [];
    if (W.xp) return base.slice(0, 2);
    let extra = [];
    try { if (!W.research) extra = choicesFor(e.id) || []; } catch (er) { extra = []; }
    const ids = new Set(base.map(c => c.id));
    return base.concat(extra.filter(c => c && !ids.has(c.id)));
  }
  function afterEventStart(e) {
    if (!e || W.research) return;
    try { tech.afterEventStart(e); } catch (er) { console.error(er); }
    let b = {}; try { b = eventBoost(e.id) || {}; } catch (er) { b = {}; }
    if (b.shorter && W.floodT > 0 && (e.start || []).some(fx => fx.type === 'flood')) {
      W.floodT *= b.shorter;
      (W.amb || ui.toast)('ההמצאה שלכם עוזרת: המים יתבהרו מהר יותר', 'info');
    }
  }
  // does a device (nest box, forest listener) hang on this plant?
  function hostsDevice(plant) { return placed.some(p => p.host === plant && !p.dead); }
  return { debugInjure: () => { const d = W.day; W.day = Math.max(2, W.day); injuryT = 0; maybeInjure(0.01); W.day = d; return W.animals.filter((a) => a.injured).length; }, cards, hostsDevice, check, use, update, updateInjured, serialize, restore, dispose, removeDevices, model: toolModel, defs: TOOL_DEFS, humidity, nurseryStock, takeFromNursery, pickDevice, checkDeviceMove, placeDeviceAt,
    cameras: () => placed.filter(p => p.id === 'camera'), camEye, cameraSees, hooks, eventChoices, afterEventStart, tech, boost };

}
