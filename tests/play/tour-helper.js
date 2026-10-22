// Headless helper for the animal-eye tour checks (tools/tour-check.py injects it): places a zone's species, rides each
// animal for a few seconds with the keys held, and reports whether it moved and whether the camera stayed out of things.
(() => {
  const G = () => window.__game;
  const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code, bubbles: true }));
  const T = {};
  // place a species on the first free spot of a spiral around (cx, cz)
  T.put = (id, cx = 0, cz = 0, n = 1) => {
    const W = G(); W.points = 1e6; let ok = 0;
    for (let k = 0; k < 400 && ok < n; k++) {
      const a = k * 2.39996, r = 1.2 + Math.sqrt(k) * 1.6, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      const res = W.debug.place(id, x, z);
      if (res && typeof res !== 'string') ok++;
    }
    return ok;
  };
  // every unlocked species: plants first (two of each), then the animals (one group each)
  T.setup = (only) => {
    const W = G(), d = W.debug; d.auto(); d.unlockAll(); W.points = 1e6;
    const ids = only || [...W.unlocked];
    const out = {};
    for (const id of ids) out[id] = T.put(id, (Math.random() - 0.5) * 24, (Math.random() - 0.5) * 24, 1);
    d.auto(); d.ff(4); d.auto();
    return JSON.stringify(out);
  };
  // is the point inside something solid? plants (reef corals: their crown box), scenery decor, rocks, trunks, the ground
  T.inside = (p, skip) => {
    const W = G(), env = W.env;
    if (p.y < env.heightAt(p.x, p.z) + 0.1) return 'ground';
    for (const q of W.plants) {
      if (q === skip || !q.alive || q.removed) continue;
      const s = q.obj.scale.x;
      if (q.isTree) { const r = Math.max(0.3, (q.vis.trunkRadius || 0.4) * s); const c = q.crown && q.crown(); if (Math.hypot(q.x - p.x, q.z - p.z) < r && (!c || p.y < c.bottom)) return 'trunk:' + q.sp.id; continue; }
      if (env.biome !== 'reef') continue;
      const c = q.vis.crown(); if (!c) continue;
      const r = c.radius * s * 0.75, top = q.y + c.top * s;
      if (Math.hypot(q.x - p.x, q.z - p.z) < r && p.y < top && p.y > q.y) return 'plant:' + q.sp.id;
    }
    for (const q of env.decor || []) if (Math.hypot(q.x - p.x, q.z - p.z) < q.r * 0.8 && p.y < q.top) return 'decor';
    return '';
  };
  // ride one species for `secs` of game time; keys: a list of [code, from, to] (seconds)
  T.ride = (id, secs = 6, keys = [['ArrowUp', 0.3, 4], ['ArrowLeft', 2, 3.2], ['KeyE', 3.5, 4.5]]) => {
    const W = G(), tour = W.debug.tour();
    tour.start(id);
    const R = tour.riding;
    if (!R) return { id, err: 'no rider' };
    const a = R.pos ? R : null;
    const look = tour.mode === 'look';
    const start = a ? a.pos.clone() : null;
    const camera = window.__app.pipe.camera;
    let path = 0, prev = a ? a.pos.clone() : null, hits = {}, minD = 99, inFor = 0, steps = 0, states = {};
    const held = new Set();
    for (let t = 0; t < secs; t += 0.1) {
      for (const [k, t0, t1] of keys) { const on = t >= t0 && t < t1; if (on && !held.has(k)) { key(k, true); held.add(k); } else if (!on && held.has(k)) { key(k, false); held.delete(k); } }
      W.debug.ff(0.1); steps++;
      if (!tour.riding) return { id, err: 'tour ended at ' + t.toFixed(1) };
      if (a) { path += a.pos.distanceTo(prev); prev.copy(a.pos); states[a.state] = (states[a.state] || 0) + 1; }
      if (camera) {
        const what = T.inside(camera.position, look ? R : null);
        if (what && t > 0.8) { hits[what] = (hits[what] || 0) + 1; inFor++; }
        if (a) minD = Math.min(minD, camera.position.distanceTo(a.obj.position));
      }
    }
    for (const k of held) key(k, false);
    const res = { id, mode: tour.mode, moved: a ? +a.pos.distanceTo(start).toFixed(2) : null, path: +path.toFixed(2), camIn: inFor, hits, minCamD: +minD.toFixed(2), states };
    tour.stop();
    return res;
  };
  window.__tt = T;
  return 'tt ok';
})();
