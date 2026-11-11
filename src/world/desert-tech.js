// 1.4: the desert's devices, each one idea people really use in dry lands (docs/sources.md "המדבר"):
//   drip       a drip line: a thin hose with drippers that gives water right at the roots (no water is lost to the air)
//   fognet     a fog net: a fine net catches the tiny drops of morning fog and runs them into a tank for the plants near it
//   sandfence  a sand fence: a row of slats that slows the wind, so the sand drops behind it instead of burying seedlings
// The tools system treats them as technologies (world/tech.js routes these ids here): models, what they do, saves.
// No cross shapes: the fog net hangs in a round arch and its mesh is hexagonal, the fence slats are joined only at their
// tops by a curved rope, the hose is a ring.
//   desertModel(id) → THREE.Group
//   const d = createDesertTech({ W, env }); d.setDevices(fn); d.init(p) / d.tick(p, dt, rdt, t) / d.save(p) / d.removed(p)
//   d.waterAt(x, z) → 0..1 the water the devices bring here      d.shelterAt(x, z) → 0..1 shelter from blowing sand
import * as THREE from 'three';

// 1.4.2: the savanna's devices live here too (the dry lands share water.js):
//   solarpump  a solar pump fills a round trough with water from a deep well, by day (water for the animals far from the river)
//   beefence   a fence of beehives on a wire: elephants keep away from bees, so the trees inside it are not pushed over
export const DESERT_TECH_IDS = new Set(['drip', 'fognet', 'sandfence', 'solarpump', 'beefence']);
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.05, ...o });
const mesh = (g, m, cast = true) => { const x = new THREE.Mesh(g, m); x.castShadow = cast; x.receiveShadow = true; return x; };

let HEX = null;
function hexTex() {   // a hexagonal net (no squares, no crossing lines)
  if (HEX) return HEX;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.clearRect(0, 0, 128, 128); x.strokeStyle = 'rgba(240,244,240,0.95)'; x.lineWidth = 3;
  const r = 16, w = Math.sqrt(3) * r;
  for (let row = -1; row < 6; row++) for (let col = -1; col < 6; col++) {
    const cx = col * w + (row % 2 ? w / 2 : 0), cy = row * r * 1.5;
    x.beginPath(); for (let k = 0; k <= 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a); if (k) x.lineTo(px, py); else x.moveTo(px, py); } x.stroke();
  }
  HEX = new THREE.CanvasTexture(c); HEX.wrapS = HEX.wrapT = THREE.RepeatWrapping; HEX.repeat.set(3, 2); HEX.colorSpace = THREE.SRGBColorSpace;
  return HEX;
}

function makeDrip() {
  const g = new THREE.Group();
  const hose = mesh(new THREE.TorusGeometry(2.4, 0.06, 6, 48), std('#1d2226', { roughness: 0.5 }));
  hose.rotation.x = Math.PI / 2; hose.position.y = 0.07; g.add(hose);
  const dm = std('#2a6ad8', { roughness: 0.3 });
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, d = mesh(new THREE.SphereGeometry(0.09, 8, 6), dm, false); d.position.set(Math.cos(a) * 2.4, 0.12, Math.sin(a) * 2.4); g.add(d); }
  const feed = mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 6), std('#1d2226')); feed.rotation.z = Math.PI / 2 - 0.2; feed.position.set(3.0, 0.25, 0); g.add(feed);
  const tank = mesh(new THREE.CylinderGeometry(0.45, 0.5, 1.1, 18), std('#3a8ab8', { roughness: 0.35 })); tank.position.set(3.7, 0.55, 0); g.add(tank);
  const lid = mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.08, 18), std('#e8ecef')); lid.position.set(3.7, 1.12, 0); g.add(lid);
  // falling drops (one small set, animated in tick)
  const drops = new THREE.Group(); const wm = new THREE.MeshBasicMaterial({ color: '#7ad0ff', transparent: true, opacity: 0.85 });
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, d = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), wm); d.position.set(Math.cos(a) * 2.4, 0.06, Math.sin(a) * 2.4); d.userData.ph = i * 0.37; drops.add(d); }
  g.add(drops); g.userData.drops = drops;
  return g;
}
function makeFognet() {
  const g = new THREE.Group();
  const arch = mesh(new THREE.TorusGeometry(1.6, 0.06, 6, 32, Math.PI), std('#8a8f92', { metalness: 0.4, roughness: 0.4 }));
  arch.position.y = 1.0; g.add(arch);
  for (const s of [-1, 1]) { const leg = mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.0, 8), std('#8a8f92', { metalness: 0.4 })); leg.position.set(s * 1.6, 0.5, 0); g.add(leg); }
  const netShape = new THREE.Shape(); netShape.absarc(0, 0, 1.5, 0, Math.PI, false); netShape.lineTo(1.5, 0);
  const net = new THREE.Mesh(new THREE.ShapeGeometry(netShape, 24), new THREE.MeshStandardMaterial({ map: hexTex(), transparent: true, side: THREE.DoubleSide, roughness: 0.9, depthWrite: false }));
  net.position.y = 1.05; g.add(net);
  const gutter = mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.1, 8, 1, true, 0, Math.PI), std('#cfd6da', { side: THREE.DoubleSide }));
  gutter.rotation.z = Math.PI / 2; gutter.rotation.x = Math.PI; gutter.position.y = 1.0; g.add(gutter);
  const tank = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.9, 16), std('#e8ecef')); tank.position.set(1.95, 0.45, 0); g.add(tank);
  const water = mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.86, 16), new THREE.MeshStandardMaterial({ color: '#3aa8e8', transparent: true, opacity: 0.8 }), false);
  water.position.set(1.95, 0.45, 0); water.scale.y = 0.2; g.add(water); g.userData.water = water;
  return g;
}
function makeSandfence() {
  const g = new THREE.Group();
  const wood = [std('#a8784a', { roughness: 0.9 }), std('#8e6440', { roughness: 0.9 })];
  const tops = [];
  for (let i = 0; i < 11; i++) {
    const a = -0.7 + i / 10 * 1.4, x = Math.sin(a) * 4, z = (Math.cos(a) - 1) * 4, h = 1.1 + (i % 2) * 0.12;
    const slat = mesh(new THREE.BoxGeometry(0.16, h, 0.06), wood[i % 2]); slat.position.set(x, h / 2, z); slat.rotation.y = a; g.add(slat);
    tops.push(new THREE.Vector3(x, h - 0.04, z));
  }
  const rope = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tops), 40, 0.025, 5), std('#d8c49a'), false); g.add(rope);
  return g;
}
// the solar pump: a tilted panel (dark, with lines in one direction only) on a post, a pipe, a round trough of water
function makeSolarpump() {
  const g = new THREE.Group();
  const post = mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.0, 8), std('#8a8f92', { metalness: 0.4, roughness: 0.4 })); post.position.set(0, 1.0, 0); g.add(post);
  const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#1e3a74'; x.fillRect(0, 0, 64, 64); x.strokeStyle = '#4a6aa8'; x.lineWidth = 2;
  for (let i = 8; i < 64; i += 11) { x.beginPath(); x.moveTo(0, i); x.lineTo(64, i); x.stroke(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const panel = mesh(new THREE.BoxGeometry(1.9, 0.06, 1.2), [std('#c8ccd0'), std('#c8ccd0'), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.25, metalness: 0.3 }), std('#c8ccd0'), std('#c8ccd0'), std('#c8ccd0')]);
  panel.position.set(0, 2.05, 0); panel.rotation.x = -0.45; g.add(panel);
  const pipe = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.05, 0.3, 0), new THREE.Vector3(0.9, 0.35, 0.2), new THREE.Vector3(1.7, 0.6, 0.5)]), 12, 0.05, 6), std('#3a3f44'), false); g.add(pipe);
  const rim = mesh(new THREE.TorusGeometry(1.5, 0.14, 8, 40), std('#9a7a5a', { roughness: 0.95 })); rim.rotation.x = Math.PI / 2; rim.position.set(2.4, 0.35, 0.8); g.add(rim);
  const base = mesh(new THREE.CylinderGeometry(1.5, 1.55, 0.35, 36), std('#8a6a4a', { roughness: 0.95 })); base.position.set(2.4, 0.17, 0.8); g.add(base);
  const water = mesh(new THREE.CylinderGeometry(1.38, 1.38, 0.05, 36), new THREE.MeshStandardMaterial({ color: '#3a9ad8', roughness: 0.15, transparent: true, opacity: 0.85 }), false);
  water.position.set(2.4, 0.38, 0.8); g.add(water); g.userData.water = water;
  return g;
}
// the beehive fence: posts in an arc, a wire that sags between them, a box hive hanging from it between every two posts
function makeBeefence() {
  const g = new THREE.Group();
  const wood = std('#7a5a3a', { roughness: 0.9 }), hiveM = [std('#e8c050', { roughness: 0.7 }), std('#d8a838', { roughness: 0.7 })], roof = std('#6a6a62', { roughness: 0.6 });
  const posts = [];
  for (let i = 0; i < 6; i++) {
    const a = -0.9 + i / 5 * 1.8, px = Math.sin(a) * 5, pz = (Math.cos(a) - 1) * 5;
    const post = mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.6, 7), wood); post.position.set(px, 0.8, pz); g.add(post);
    posts.push(new THREE.Vector3(px, 1.5, pz));
  }
  const wirePts = [];
  for (let i = 0; i < posts.length - 1; i++) {
    const a = posts[i], b = posts[i + 1];
    for (let k = 0; k < 6; k++) { const t = k / 6; const p = a.clone().lerp(b, t); p.y -= Math.sin(Math.PI * t) * 0.25; wirePts.push(p); }
    const mid = a.clone().lerp(b, 0.5); mid.y -= 0.25;
    const hive = mesh(new THREE.BoxGeometry(0.55, 0.42, 0.42), hiveM[i % 2]); hive.position.set(mid.x, mid.y - 0.3, mid.z); hive.rotation.y = Math.atan2(b.x - a.x, b.z - a.z); g.add(hive);
    const lid = mesh(new THREE.BoxGeometry(0.62, 0.06, 0.48), roof); lid.position.set(mid.x, mid.y - 0.06, mid.z); lid.rotation.y = hive.rotation.y; g.add(lid);
  }
  wirePts.push(posts[posts.length - 1]);
  g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wirePts), 60, 0.015, 4), std('#5a5a52', { metalness: 0.5 }), false));
  return g;
}
export function desertModel(id) {
  const g = id === 'drip' ? makeDrip() : id === 'fognet' ? makeFognet() : id === 'sandfence' ? makeSandfence()
    : id === 'solarpump' ? makeSolarpump() : id === 'beefence' ? makeBeefence() : null;
  if (g) g.scale.setScalar(1.15);
  return g;
}

export function createDesertTech({ W }) {
  let devicesFn = () => [];
  const mine = (id) => devicesFn().filter((p) => p.id === id && !p.dead);
  // fog comes in the early morning and at night; the net catches little in the hot afternoon
  const fogNow = () => { const f = W.dayFrac || 0.5; return (f > 0.1 && f < 0.38) ? 1 : (W.nightGlow || 0) > 0.5 ? 0.55 : 0.15; };
  function waterAt(x, z) {
    let w = 0;
    for (const p of mine('drip')) { const d = Math.hypot(p.x - x, p.z - z); if (d < 6.5) w = Math.max(w, 0.7 * Math.sqrt(1 - d / 6.5)); }
    const fog = fogNow();
    for (const p of mine('fognet')) { const d = Math.hypot(p.x - x, p.z - z); if (d < 9) w = Math.max(w, (0.25 + 0.4 * (p.fill || 0)) * (1 - d / 9) * (0.5 + 0.5 * fog)); }
    for (const p of mine('solarpump')) { const d = Math.hypot(p.x + 2.6 - x, p.z + 0.9 - z); if (d < 9) w = Math.max(w, (0.3 + 0.5 * (p.fill ?? 0.5)) * (1 - d / 9)); }
    return w;
  }
  // 1.4.2: elephants keep away from the bees: the trees near a beehive fence are not pushed over (savanna/index.js)
  function guardAt(x, z) {
    let g = 0;
    for (const p of mine('beefence')) { const d = Math.hypot(p.x - x, p.z - (z + 2.4)); if (d < 8) g = Math.max(g, 1 - d / 10); }
    return g;
  }
  function shelterAt(x, z) {
    let s = 0;
    for (const p of mine('sandfence')) { const d = Math.hypot(p.x - x, p.z - z); if (d < 9) s = Math.max(s, 0.95 * (1 - d / 9) + 0.05); }
    return s;
  }
  function init(p, saved) { p.fill = saved && saved.fill != null ? saved.fill : (p.id === 'solarpump' ? 0.6 : 0.2); }
  function tick(p, dt, rdt, t) {
    const u = p.mesh && p.mesh.userData;
    if (p.id === 'fognet') {
      p.fill = Math.max(0, Math.min(1, (p.fill || 0) + dt * (fogNow() - 0.4) * 0.01));
      if (u && u.water) { u.water.scale.y = 0.05 + p.fill * 0.95; u.water.position.y = 0.45 * (0.05 + p.fill * 0.95) + 0.02; }
    } else if (p.id === 'solarpump') {   // the sun fills the trough by day; the animals drink it down at night
      const sun = (W.nightGlow || 0) > 0.5 ? 0 : 1;
      p.fill = Math.max(0, Math.min(1, (p.fill ?? 0.5) + dt * (sun ? 0.006 : -0.004)));
      if (u && u.water) u.water.position.y = 0.2 + 0.18 * p.fill;
    } else if (p.id === 'drip' && u && u.drops) {
      for (const d of u.drops.children) { const k = ((t * 0.9 + d.userData.ph) % 1); d.position.y = 0.16 - k * 0.12; d.visible = k < 0.9; }
    }
  }
  const save = (p) => (p.id === 'fognet' || p.id === 'solarpump' ? { fill: +(p.fill || 0).toFixed(2) } : {});
  return { waterAt, shelterAt, guardAt, init, tick, save, removed() {}, setDevices(fn) { devicesFn = fn; } };
}
