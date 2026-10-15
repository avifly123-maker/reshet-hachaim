// Plants a lush, varied island (every species several times) and grows it. Paste into the page via play.py.
(() => {
  const W = window.__game, d = W.debug; d.unlockAll();
  const sp = W.biome ? W.biome.species : null;
  const ids = (sp || []).map(s => s.id);
  let placed = 0, tries = 0;
  const order = ids.slice().sort((a, b) => { const k = (id) => { const s = sp.find(x => x.id === id); return s.animal ? 2 : (s.kind === 'tree' || s.kind === 'palm') ? 0 : 1; }; return k(a) - k(b); });
  for (const id of order) {
    const s = sp.find(x => x.id === id);
    const want = s.animal ? 2 : (s.kind === 'tree' || s.kind === 'palm') ? 3 : 4;
    let got = 0;
    for (let i = 0; i < 60 && got < want; i++) {
      tries++;
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 33;
      const res = d.place(id, Math.cos(a) * r, Math.sin(a) * r);
      if (res && typeof res === 'object') { got++; placed++; }
    }
  }
  for (let k = 0; k < 40; k++) { d.auto(); const r = d.ff(10); if (String(r).startsWith('modal')) d.auto(); }
  for (const p of W.plants) { if (p.alive && !p.removed) { p.growth = 1; p.health = 1; p.vis.setGrowth(1); p.vis.setHealth(1); } }
  return 'placed ' + placed + ' / tries ' + tries + ' plants ' + W.plants.length + ' animals ' + W.animals.length;
})()
