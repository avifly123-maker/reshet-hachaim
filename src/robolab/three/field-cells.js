// מעבדת הרובוטים in 3D (1.4.3, set 4): the workshop missions' ground and things on a training field. A built robot
// meets them in the engine (engine/world.js: 'm' mud, 'h' a slope, 'n' a narrow log over a ditch, 'w' shallow water;
// items 'rock' to push and 'log' to lift); here they get their look, so a child sees why the robot sank, slipped or
// could not climb. Procedural, like the field's other things (models.js), with painted canvas textures made once.
//   const F = fieldCells({ rows, CS, wx, wz, ground, sea })   F.lift(x, z)  the extra height a hill or a log adds there
//   F.group  the meshes to add to the course;  F.update(dt)  the water's slow ripple;  F.dispose()
//   makeBoulder(rng), makeLog()   the two items (course.js places, pushes and lifts them)
import * as THREE from 'three';

const TEX = {};
function canvasTex(key, size, paint, repeat = 1) {
  if (TEX[key]) return TEX[key];
  const c = document.createElement('canvas'); c.width = c.height = size;
  paint(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 4;
  return (TEX[key] = t);
}
const rnd = (() => { let s = 11; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
// soft blobs of colour: the base of every painted texture (mud, grass, bark, water)
function blobs(g, size, n, cols, r0, r1, a = 0.5) {
  for (let i = 0; i < n; i++) {
    const x = rnd() * size, y = rnd() * size, r = r0 + rnd() * (r1 - r0);
    const gr = g.createRadialGradient(x, y, 0, x, y, r); const c = cols[(rnd() * cols.length) | 0];
    gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = a; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    // wrap round the edges, so the texture tiles
    for (const [dx, dy] of [[size, 0], [-size, 0], [0, size], [0, -size]]) { g.save(); g.translate(dx, dy); g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); }
  }
  g.globalAlpha = 1;
}
const mudTex = () => canvasTex('mud', 256, (g, s) => {
  g.fillStyle = '#5b3f27'; g.fillRect(0, 0, s, s);
  blobs(g, s, 70, ['#3e2a19', '#6e5034', '#4a321f', '#7a5a3a'], 8, 34, 0.55);
  blobs(g, s, 40, ['#2c1d11'], 3, 9, 0.7);                       // wet dark spots
  g.strokeStyle = 'rgba(30,18,10,.35)'; g.lineWidth = 2;           // tyre marks and cracks in the wet earth
  for (let i = 0; i < 9; i++) { g.beginPath(); const x = rnd() * s, y = rnd() * s; g.moveTo(x, y); g.bezierCurveTo(x + rnd() * 40 - 20, y + 20, x + rnd() * 40 - 20, y + 40, x + rnd() * 30 - 15, y + 60); g.stroke(); }
});
const grassTex = () => canvasTex('hill', 256, (g, s) => {
  g.fillStyle = '#7c9a4a'; g.fillRect(0, 0, s, s);
  blobs(g, s, 60, ['#5e7f36', '#93ad5a', '#a8925a', '#6f8c40'], 10, 40, 0.5);
  for (let i = 0; i < 900; i++) { const x = rnd() * s, y = rnd() * s, h = 3 + rnd() * 6; g.strokeStyle = rnd() < 0.5 ? 'rgba(60,90,30,.6)' : 'rgba(170,190,100,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + rnd() * 2 - 1, y - h); g.stroke(); }
});
const barkTex = () => canvasTex('bark', 256, (g, s) => {
  g.fillStyle = '#6b4a2e'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 70; i++) { const y = rnd() * s, w = 1 + rnd() * 3; g.fillStyle = rnd() < 0.5 ? 'rgba(40,26,14,.55)' : 'rgba(140,104,70,.35)'; g.fillRect(0, y, s, w); }
  blobs(g, s, 30, ['#4c3420', '#86643f', '#5d7a3a'], 6, 24, 0.4);   // a little moss
});
const ringsTex = () => canvasTex('rings', 128, (g, s) => {
  g.fillStyle = '#c99a62'; g.fillRect(0, 0, s, s);
  for (let r = 4; r < s / 2; r += 4 + rnd() * 3) { g.strokeStyle = `rgba(120,80,40,${0.35 + rnd() * 0.3})`; g.lineWidth = 1.2; g.beginPath(); g.arc(s / 2 + rnd() * 2, s / 2 + rnd() * 2, r, 0, Math.PI * 2); g.stroke(); }
  g.strokeStyle = '#5a3c22'; g.lineWidth = 7; g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 4, 0, Math.PI * 2); g.stroke();
});
const waterTex = () => canvasTex('water', 256, (g, s) => {
  g.fillStyle = '#3d97bf'; g.fillRect(0, 0, s, s);
  blobs(g, s, 50, ['#5fb6d8', '#2f7fa8', '#7ccbe6'], 10, 40, 0.45);
  g.strokeStyle = 'rgba(230,250,255,.55)'; g.lineWidth = 1.5;           // light on the ripples
  for (let i = 0; i < 40; i++) { const x = rnd() * s, y = rnd() * s, r = 6 + rnd() * 16; g.beginPath(); g.arc(x, y, r, Math.PI * (1.1 + rnd() * 0.2), Math.PI * (1.7 + rnd() * 0.2)); g.stroke(); }
});

const STONE = new THREE.MeshStandardMaterial({ color: '#8f8a80', roughness: 0.9, flatShading: true });
// a mesh laid on the ground over a cell: a plane of n×n segments whose points follow the island (and a shape of our own)
function layOn(w, d, n, at, ground, up, shape = null) {
  const g = new THREE.PlaneGeometry(w, d, n, n); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) + at.x, z = p.getZ(i) + at.z; p.setXYZ(i, x, ground(x, z) + up + (shape ? shape(p.getX(i), p.getZ(i)) : 0), z); }
  g.computeVertexNormals(); return g;
}

// the same, with soft ragged edges where the cell meets another kind of ground (a puddle or a pool has no square sides):
// same = which sides touch the same ground ([left, right, up, down]); there the sheet runs on without a fade
function softSheet(size, n, at, ground, up, same, shape = null, seed = 1) {
  const g = layOn(size, size, n, at, ground, up, shape), p = g.attributes.position, col = [];
  const half = size / 2, fade = size * 0.16;
  for (let i = 0; i < p.count; i++) {
    const lx = p.getX(i) - at.x, lz = p.getZ(i) - at.z;
    const rag = (k) => fade * 0.55 * Math.sin(k * 7.3 + seed) * Math.cos(k * 3.1 + seed * 2.1);   // a ragged shore
    let a = 1;
    const side = (d, k, ok) => { if (!ok) a = Math.min(a, Math.max(0, Math.min(1, (half - d + rag(k)) / fade))); };
    side(-lx, lz / size * 6, same[0]); side(lx, lz / size * 6 + 2, same[1]); side(-lz, lx / size * 6 + 4, same[2]); side(lz, lx / size * 6 + 6, same[3]);
    col.push(1, 1, 1, a * a * (3 - 2 * a));
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  return g;
}

export function fieldCells({ rows, CS, wx, wz, ground, sea = false }) {
  const H = rows.length, cell = (y, x) => (rows[y] || '')[x] || '#';
  const group = new THREE.Group(); group.name = 'rl-field-cells';
  const HILL = CS * 0.32, LOG_UP = CS * 0.12;
  const open = (y, x) => !'#TR'.includes(cell(y, x));
  // a narrow cell's log lies along the way the robot comes: along the row when the cells on both sides of it are open
  const alongX = (y, x) => (open(y, x - 1) || open(y, x + 1)) && !(open(y - 1, x) && open(y + 1, x) && !open(y, x - 1) && !open(y, x + 1));
  const hillAt = (u, v) => { const a = Math.cos(Math.PI * Math.min(0.5, Math.abs(u))), b = Math.cos(Math.PI * Math.min(0.5, Math.abs(v))); return HILL * a * a * b * b; };
  // the extra height a robot rides on: over a hill, or on the narrow log
  function lift(x, z) {
    const cx = Math.round((x - wx(0)) / CS), cy = Math.round((z - wz(0)) / CS), ch = cell(cy, cx);
    const u = (x - wx(cx)) / CS, v = (z - wz(cy)) / CS;
    if (ch === 'h') return hillAt(u, v);
    if (ch === 'n') return LOG_UP;
    return 0;
  }
  let water = null;
  const mats = {
    mud: new THREE.MeshStandardMaterial({ map: mudTex(), roughness: 0.32, metalness: 0.02, color: '#ffffff', vertexColors: true, transparent: true, depthWrite: false }),
    clod: new THREE.MeshStandardMaterial({ map: mudTex(), roughness: 0.5 }),
    wet: new THREE.MeshStandardMaterial({ color: '#2a1c10', roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.75 }),
    hill: new THREE.MeshStandardMaterial({ map: grassTex(), roughness: 0.92 }),
    bark: new THREE.MeshStandardMaterial({ map: barkTex(), roughness: 0.88 }),
    rings: new THREE.MeshStandardMaterial({ map: ringsTex(), roughness: 0.8 }),
    ditch: new THREE.MeshStandardMaterial({ color: '#2d5a6e', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.85 }),
    bank: new THREE.MeshStandardMaterial({ map: mudTex(), color: '#b89878', roughness: 0.95 }),
    bed: new THREE.MeshStandardMaterial({ color: '#cbb88e', roughness: 0.95 }),
  };
  mats.water = water = new THREE.MeshStandardMaterial({ map: waterTex(), roughness: 0.06, metalness: 0.15, transparent: true, opacity: 0.8, depthWrite: false, vertexColors: true });
  mats.bed.vertexColors = true; mats.bed.transparent = true; mats.bed.depthWrite = false;
  const clears = [];   // the squares where the island's grass must not grow through (env.clearScatter)
  const sameAs = (y, x, ch) => [cell(y, x - 1) === ch, cell(y, x + 1) === ch, cell(y - 1, x) === ch, cell(y + 1, x) === ch];
  const mesh = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; group.add(m); return m; };
  for (let y = 0; y < H; y++) for (let x = 0; x < (rows[y] || '').length; x++) {
    const ch = cell(y, x), at = new THREE.Vector3(wx(x), 0, wz(y));
    if ('mhnw'.includes(ch)) clears.push({ x: at.x, z: at.z, hw: CS * 0.56, hd: CS * 0.56 });
    if (ch === 'm') {   // mud: a wet, dark puddle that runs a little past the cell, glossy pools, clods on its rim
      const wob = (px, pz) => 0.012 * Math.sin(px * 9 + pz * 7) * Math.cos(pz * 11);
      mesh(softSheet(CS * 1.12, 14, at, ground, 0.05, sameAs(y, x, 'm'), wob, x * 3 + y), mats.mud).renderOrder = 1;
      for (let i = 0; i < 3; i++) { const r = CS * (0.1 + rnd() * 0.1), px = at.x + (rnd() - 0.5) * CS * 0.6, pz = at.z + (rnd() - 0.5) * CS * 0.6;
        const p = mesh(new THREE.CircleGeometry(r, 20), mats.wet); p.rotation.x = -Math.PI / 2; p.position.set(px, ground(px, pz) + 0.075, pz); p.scale.set(1, 0.6 + rnd() * 0.5, 1); }
      for (let i = 0; i < 7; i++) { const a = rnd() * Math.PI * 2, r = CS * (0.46 + rnd() * 0.08), px = at.x + Math.cos(a) * r, pz = at.z + Math.sin(a) * r;
        const c = mesh(new THREE.DodecahedronGeometry(CS * (0.03 + rnd() * 0.035), 0), mats.clod); c.position.set(px, ground(px, pz) + 0.06, pz); c.scale.y = 0.5; c.castShadow = true; }
    } else if (ch === 'h') {   // a slope: a grassy hill across the cell, with a few stones on its flanks
      mesh(layOn(CS, CS, 18, at, ground, 0.03, (u, v) => hillAt(u / CS, v / CS)), mats.hill);
      for (let i = 0; i < 4; i++) { const u = (rnd() - 0.5) * 0.8, v = (rnd() - 0.5) * 0.8, px = at.x + u * CS, pz = at.z + v * CS;
        const s = mesh(new THREE.DodecahedronGeometry(CS * (0.035 + rnd() * 0.03), 0), STONE); s.position.set(px, ground(px, pz) + hillAt(u, v) + 0.03, pz); s.rotation.set(rnd() * 3, rnd() * 3, 0); s.castShadow = true; }
    } else if (ch === 'n') {   // a narrow log over a little stream: banks of earth, the water between, the log across
      const ax = alongX(y, x);
      const ditch = mesh(layOn(ax ? CS * 0.62 : CS * 1.02, ax ? CS * 1.02 : CS * 0.62, 6, at, ground, 0.02), mats.ditch);
      ditch.renderOrder = 1;
      for (const s of [-1, 1]) { const b = new THREE.Vector3(at.x + (ax ? s * CS * 0.4 : 0), 0, at.z + (ax ? 0 : s * CS * 0.4)); mesh(layOn(ax ? CS * 0.2 : CS * 1.02, ax ? CS * 1.02 : CS * 0.2, 4, b, ground, 0.06), mats.bank); }
      const L = new THREE.Group(); group.add(L);
      const len = CS * 1.06, r = CS * 0.085;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, len, 14, 1, true), mats.bark); body.castShadow = true; L.add(body);
      for (const s of [-1, 1]) { const end = new THREE.Mesh(new THREE.CircleGeometry(r * (s > 0 ? 1 : 1.08), 14), mats.rings); end.position.y = s * len / 2; end.rotation.x = s > 0 ? -Math.PI / 2 : Math.PI / 2; L.add(end); }
      L.rotation.set(ax ? 0 : Math.PI / 2, 0, ax ? Math.PI / 2 : 0);
      L.position.set(at.x, ground(at.x, at.z) + LOG_UP - r * 0.6, at.z);
    } else if (ch === 'w') {   // shallow water: a sandy bed with pebbles, and the water over it, moving a little
      mesh(softSheet(CS * 1.1, 10, at, ground, 0.03, sameAs(y, x, 'w'), null, x + y * 5), mats.bed).renderOrder = 1;
      for (let i = 0; i < 6; i++) { const px = at.x + (rnd() - 0.5) * CS * 0.8, pz = at.z + (rnd() - 0.5) * CS * 0.8; const s = mesh(new THREE.DodecahedronGeometry(CS * (0.025 + rnd() * 0.03), 0), STONE); s.position.set(px, ground(px, pz) + 0.05, pz); s.scale.y = 0.55; }
      const wv = mesh(softSheet(CS * 1.02, 10, at, ground, sea ? 0.1 : 0.16, sameAs(y, x, 'w'), null, x * 2 + y), water); wv.renderOrder = 4;
    }
  }
  return {
    group, lift, clears,
    update: (dt) => { if (water && water.map) { water.map.offset.x += dt * 0.02; water.map.offset.y += dt * 0.011; } },
    dispose: () => { group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); for (const k of Object.keys(mats)) mats[k].dispose(); },
  };
}

// a boulder the pusher moves: bigger than the field's rocks, rounded, a little moss on its top
export function makeBoulder(rng = Math.random) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: '#9b958a', roughness: 0.88, flatShading: true });
  const moss = new THREE.MeshStandardMaterial({ color: '#6f8a44', roughness: 1, flatShading: true });
  const main = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 1), m);
  const p = main.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = 0.85 + rng() * 0.3; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.82, p.getZ(i) * k); }
  main.geometry.computeVertexNormals(); main.position.y = 0.5; main.castShadow = true; g.add(main);
  const cap = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), moss); cap.scale.set(1, 0.28, 0.9); cap.position.set(0.05, 1.02, -0.05); g.add(cap);
  for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16 + rng() * 0.1, 0), m); s.position.set(Math.cos(i * 2.1) * 0.75, 0.08, Math.sin(i * 2.1) * 0.75); s.castShadow = true; g.add(s); }
  return g;
}
// a fallen log to lift: bark, rings on its ends, a broken stub of a branch
export function makeLog() {
  const g = new THREE.Group(), len = 1.6, r = 0.26;
  const bark = new THREE.MeshStandardMaterial({ map: barkTex(), roughness: 0.88 }), rings = new THREE.MeshStandardMaterial({ map: ringsTex(), roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.1, len, 16, 1, true), bark); body.castShadow = true; g.add(body);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.CircleGeometry(r * (s > 0 ? 1 : 1.1), 16), rings); e.position.y = s * len / 2; e.rotation.x = s > 0 ? -Math.PI / 2 : Math.PI / 2; g.add(e); }
  const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.34, 8), bark); stub.position.set(r * 0.9, 0.2, 0); stub.rotation.z = -1.0; g.add(stub);
  g.rotation.z = Math.PI / 2;
  const holder = new THREE.Group(); holder.add(g); g.position.y = r; return holder;
}
// the mark on a flower of the island's own plant (set 4, artificial pollination): a ring on the ground, and over the
// flower that gives pollen a little cloud of golden grains (no new plant: the flower is the child's own)
export function makeFlowerMark(src = false) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.78, 0.95, 40), new THREE.MeshBasicMaterial({ color: src ? '#ffd25a' : '#f59ac8', transparent: true, opacity: 0.85, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring);
  if (src) {
    const m = new THREE.MeshStandardMaterial({ color: '#ffd84a', emissive: '#ffb020', emissiveIntensity: 0.9, roughness: 0.5 });
    const grains = new THREE.Group(); grains.position.y = 1.6; g.add(grains);
    for (let i = 0; i < 9; i++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06 + (i % 3) * 0.02, 0), m); const a = i * 2.4; s.position.set(Math.cos(a) * 0.32, (i % 4) * 0.12, Math.sin(a) * 0.32); grains.add(s); }
    g.userData.grains = grains;
  }
  return g;
}
// a feeding tray (set 4, "ארוחה מהעץ"): a low wooden trough on short legs; the fruit the robot brings shows in it
export function makeFeeder() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ map: barkTex(), color: '#c9a070', roughness: 0.85 });
  const box = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wood); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  box(1.2, 0.08, 0.7, 0, 0.3, 0);
  for (const s of [-1, 1]) { box(1.2, 0.22, 0.06, 0, 0.42, s * 0.32); box(0.06, 0.22, 0.7, s * 0.57, 0.42, 0); }
  for (const [x, z] of [[-0.5, -0.27], [0.5, -0.27], [-0.5, 0.27], [0.5, 0.27]]) box(0.08, 0.3, 0.08, x, 0.13, z);
  const fruit = new THREE.Group(); fruit.visible = false; g.add(fruit);
  const fm = new THREE.MeshStandardMaterial({ color: '#e0563a', roughness: 0.45 });
  for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), fm); f.position.set(-0.3 + i * 0.2, 0.48, (i % 2) * 0.12 - 0.06); fruit.add(f); }
  g.userData.fruit = fruit;
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.0, 40), new THREE.MeshBasicMaterial({ color: '#8fe36a', transparent: true, opacity: 0.8, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring);
  return g;
}
// a ring that marks a job on a plant of the child's own island (a thirsty seedling): his plant is there already
export function makeMark(color) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 0.96, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring);
  return g;
}
