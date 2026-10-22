// Human impact: stumps left by logging, the road across the island (it clears its path and cuts the forest), the
// eco-bridge, removing the road, and the dialogs that fix them (and the one that moves shaded seedlings to light).
// Owns ctx.roadMesh and ctx.bridgeMesh.
// Gives ctx: impactGroup, barkMat, cutMat, addStump, buildRoad, buildBridge, removeRoad, offerRoadFix.
// Takes from ctx: the names destructured at the top of createRoad.
// Shared state it reads or changes: ctx.roadMesh, ctx.bridgeMesh, ctx.lightDirty, ctx.tools.
import * as THREE from 'three';
import { disposeObject } from '../tools.js';
import { clamp } from '../../core/util.js';

export function createRoad(ctx) {
  const { W, scene, env, alive, rig, markers, ui, on, light, spacingOK, randomPlaceSpot, audio } = ctx;

  // ─────────────────────────────────────────── human impact: stumps and roads
  W.stumps = []; W.road = null; W.protected = false;
  const impactGroup = new THREE.Group(); impactGroup.name = 'human-impact'; scene.add(impactGroup);
  const barkMat = new THREE.MeshStandardMaterial({ color: '#6b4a32', roughness: 0.95 });
  const cutMat = new THREE.MeshStandardMaterial({ color: '#d9b77e', roughness: 0.8 });
  function addStump(x, z, r) {
    const g = new THREE.Group();
    const side = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.35, 0.7, 10), barkMat); side.position.y = 0.3;
    const top = new THREE.Mesh(new THREE.CircleGeometry(r * 0.96, 12).rotateX(-Math.PI / 2), cutMat); top.position.y = 0.66;
    const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.45, r * 0.52, 12).rotateX(-Math.PI / 2), barkMat); ring.position.y = 0.67;
    side.castShadow = true; g.add(side, top, ring);
    g.position.set(x, env.heightAt(x, z) - 0.05, z); g.rotation.y = Math.random() * 6;
    impactGroup.add(g); W.stumps.push({ x, z, r, mesh: g });
  }
  const segDist = (px, pz, a, b) => { const vx = b.x - a.x, vz = b.z - a.z; const t = clamp(((px - a.x) * vx + (pz - a.z) * vz) / (vx * vx + vz * vz)); return Math.hypot(px - (a.x + vx * t), pz - (a.z + vz * t)); };
  W.onRoad = (x, z, extra = 0) => !!W.road && segDist(x, z, W.road.a, W.road.b) < W.road.w / 2 + extra;
  W.blockedByRoad = (x, z) => {
    if (!W.road || !W.onRoad(x, z, 0.4)) return false;
    if (W.road.bridge && Math.hypot(x - W.road.bridge.x, z - W.road.bridge.z) < 3.6) return false;
    return true;
  };
  ctx.roadMesh = null; ctx.bridgeMesh = null;
  function buildRoad(saved) {
    if (W.road && !saved) return;
    let a, b;
    if (saved) { a = saved.a; b = saved.b; }
    else { const ang = Math.random() * Math.PI, off = (Math.random() - 0.5) * 12; const nx = Math.cos(ang + Math.PI / 2), nz = Math.sin(ang + Math.PI / 2); const L = 48; a = { x: Math.cos(ang) * L + nx * off, z: Math.sin(ang) * L + nz * off }; b = { x: -Math.cos(ang) * L + nx * off, z: -Math.sin(ang) * L + nz * off }; }
    W.road = { a, b, w: 4.2, bridge: saved?.bridge || null };
    // the road clears everything on its path
    if (!saved) for (const p of W.plants.slice()) if (alive(p) && !p.host && W.onRoad(p.x, p.z, p.isTree ? 1.5 : 0.6)) { W.onPlantDied(p, 'road'); p.alive = false; W.removeEntity(p); }
    // ribbon mesh hugging the terrain
    const N = 90, pos = [], col = [], idx = [];
    const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len, px = -uz, pz = ux;
    const asphalt = new THREE.Color('#4a4a46'), edge = new THREE.Color('#8a7a62'), paint = new THREE.Color('#e8e2c8');
    const cols = [-1, -0.92, -0.08, 0.08, 0.92, 1];
    for (let i = 0; i <= N; i++) {
      const t = i / N, cx = a.x + dx * t, cz = a.z + dz * t;
      for (const c of cols) {
        const x = cx + px * c * W.road.w / 2, z = cz + pz * c * W.road.w / 2;
        const inside = Math.hypot(x, z) < env.radius + 6;
        pos.push(x, inside ? env.heightAt(x, z) + 0.07 : -60, z);
        const dash = Math.abs(c) < 0.1 && (i % 6) < 3; const cc = Math.abs(c) > 0.95 ? edge : dash ? paint : asphalt;
        col.push(cc.r, cc.g, cc.b);
      }
    }
    const C = cols.length;
    for (let i = 0; i < N; i++) for (let k = 0; k < C - 1; k++) { const i0 = i * C + k, i1 = i0 + 1, i2 = i0 + C, i3 = i2 + 1; if (pos[i0 * 3 + 1] < -50 || pos[i3 * 3 + 1] < -50) continue; idx.push(i0, i2, i1, i1, i2, i3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    ctx.roadMesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -2 }));
    ctx.roadMesh.receiveShadow = true; impactGroup.add(ctx.roadMesh);
    if (W.road.bridge) buildBridge(true);
    ctx.lightDirty = true;
    if (!saved) rig.focusOn(new THREE.Vector3((a.x + b.x) / 2, 2, (a.z + b.z) / 2), 55);
  }
  function buildBridge(fromSave) {
    if (!W.road) return;
    const { a, b } = W.road; const dx = b.x - a.x, dz = b.z - a.z;
    // place the crossing where the road is closest to the island centre
    const t = clamp(-(a.x * dx + a.z * dz) / (dx * dx + dz * dz)); const bx = a.x + dx * t, bz = a.z + dz * t;
    if (!fromSave) W.road.bridge = { x: bx, z: bz };
    const { x, z } = W.road.bridge;
    const grp = new THREE.Group();
    const span = W.road.w + 5, width = 5.5, H = 2.6;
    const deck = new THREE.BoxGeometry(width, 0.8, span, 4, 1, 12);
    const p = deck.attributes.position;
    for (let i = 0; i < p.count; i++) { const zz = p.getZ(i) / (span / 2); p.setY(i, p.getY(i) + H * (1 - zz * zz)); }
    deck.computeVertexNormals();
    const top = new THREE.Mesh(deck, new THREE.MeshStandardMaterial({ color: '#6f9a45', roughness: 0.95 }));
    grp.add(top);
    const bushM = new THREE.MeshStandardMaterial({ color: '#4f7f36', roughness: 1, flatShading: true });
    for (let i = 0; i < 9; i++) { const bz2 = (i / 8 - 0.5) * span * 0.8; const yy = H * (1 - (bz2 / (span / 2)) ** 2) + 0.6; const s2 = 0.5 + Math.random() * 0.4; const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(s2, 0), bushM); bush.position.set((i % 2 ? 1 : -1) * (width / 2 - 0.5), yy, bz2); grp.add(bush); }
    grp.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    grp.position.set(x, env.heightAt(x, z), z);
    grp.rotation.y = Math.atan2(dx, dz) + Math.PI / 2;
    ctx.bridgeMesh = grp; impactGroup.add(grp);
    if (!fromSave) { markers.burst(new THREE.Vector3(x, env.heightAt(x, z) + 3, z), '#bfffa0', 30, { size: 0.6 }); rig.focusOn(new THREE.Vector3(x, 2, z), 26); }
  }
  function removeRoad() {
    if (ctx.roadMesh) { disposeObject(ctx.roadMesh); ctx.roadMesh = null; }
    if (ctx.bridgeMesh) { disposeObject(ctx.bridgeMesh); ctx.bridgeMesh = null; }
    W.road = null;
  }
  function offerRoadFix() {
    ui.showDialog({ title: 'הכביש חוצה את היער', text: 'בעלי החיים שהולכים על הקרקע לא יכולים לעבור מצד לצד, והיער חתוך לשניים. אפשר לתקן:', buttons: [
      { id: 'road-bridge', label: 'לבנות מעבר אקולוגי (40 נקודות)' }, { id: 'road-remove', label: 'להעביר את הכביש מהיער (70 נקודות)' }, { id: 'road-cancel', label: 'לא עכשיו' }] });
  }
  on('dialog:button', ({ id }) => {
    if (id === 'move-shaded') {
      // only free-standing land seedlings: not water plants, not plants on a host, not hosts of other plants or devices
      const dark = W.plants.filter(p => alive(p) && !p.host && !p.falling && p.sp.kind !== 'fungus' && p.sp.kind !== 'water-plant' && p.growth < 0.6 && p.light < (p.sp.lightNeed ?? 0.5) * 0.6
        && !W.plants.some(q => q.host === p && q.alive) && !ctx.tools.hostsDevice(p));
      if (W.points < 10) { ui.toast('צריך 10 נקודות חיים', 'warn'); return; }
      const spots = light.brightSpots(dark.length * 2 + 4, 3.5);
      let n = 0;
      for (const p of dark) {
        const sp = spots.find(s => env.isPlaceable(s.x, s.z) && spacingOK(p.sp, s.x, s.z, p) && !W.onRoad(s.x, s.z, 0.8) && !(p.sp.needs?.rocks && !W.nearRock(s.x, s.z, 3))) || randomPlaceSpot(p.sp, p);
        if (!sp) continue;
        const si = spots.indexOf(sp); if (si >= 0) spots.splice(si, 1);
        p.x = sp.x; p.z = sp.z; p.y = env.heightAt(sp.x, sp.z) - 0.05; p.obj.position.set(p.x, p.y, p.z); p.pop = 0;
        markers.burst(new THREE.Vector3(p.x, p.y + 1, p.z), '#ffe08a', 14, { size: 0.4 }); n++;
      }
      if (n) { W.points -= 10; ctx.lightDirty = true; ui.toast(`${n} שתילים הועברו למקום מואר – עכשיו הם יגדלו מהר יותר`, 'good'); audio.play('grow'); }
      else ui.toast('לא מצאתי מקום מואר פנוי. אפשר לשתול במקומם צמחי צל.', 'info');
      return;
    }
    if (id === 'road-bridge' || id === 'road-remove') {
      const cost = id === 'road-bridge' ? 40 : 70;
      if (W.points < cost) { ui.toast(`צריך ${cost} נקודות חיים`, 'warn'); return; }
      W.points -= cost;
      if (id === 'road-bridge') { buildBridge(); ui.toast('המעבר האקולוגי מוכן – בעלי החיים חוצים בבטחה', 'good'); }
      else { removeRoad(); ui.toast('הכביש הוסר, והיער שוב שלם', 'good'); }
      audio.play('mission');
    }
  });
  return { impactGroup, barkMat, cutMat, addStump, buildRoad, buildBridge, removeRoad, offerRoadFix };
}
