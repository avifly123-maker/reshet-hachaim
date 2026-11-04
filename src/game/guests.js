// אורחי הכבוד (1.4.4 set 1, Avi 4.11: "a badge and a rare visitor who stays to live on the island"): every weekly event a
// child wins brings one rare guest (core/weekly.js guests) to one of his islands. The guest lives there from then on:
// it comes a little after the island opens, walks about like any animal, and stays. It is a visitor in the game's terms
// (a.visitor: never saved with the forest, never counted as placed, never hungry and never hunting: game.js hooks
// marked "H:"), so it does not change the island's balance, its missions or its rank. If it is lost (it left the
// island's edge, a tool removed it) it comes back a while later. Not in mysteries, lessons or the training field.
import * as THREE from 'three';
import { guestsOf } from '../core/weekly.js';

const ARRIVE = 20;    // real seconds after the island opens
const BACK = 90;      // real seconds before a lost guest comes back
const nowS = () => performance.now() / 1000;

export function createGuests({ W, env, reg, spawnAnimal }) {
  const zone = W.biomeId;
  let wanted = [], live = [], nextAt = nowS() + ARRIVE, disposed = false;
  const read = () => {
    try { wanted = guestsOf(zone).filter((g) => reg.byId.has(g.id) && W.animalBuilders && W.animalBuilders[g.id]); } catch (e) { wanted = []; }
  };
  read();
  function spot(sp) {
    const R = (env.radius || 40) * 0.55;
    for (let i = 0; i < 30; i++) {
      const ang = Math.random() * Math.PI * 2, r = R * (0.3 + Math.random() * 0.7);
      const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
      if ((sp.locomotion || 'ground') === 'flying') return { x, z, y: env.heightAt(x, z) + (sp.swims ? 2 : 6) };
      if (env.isPlaceable(x, z) && !(env.isWater && env.isWater(x, z))) return { x, z, y: env.heightAt(x, z) };
    }
    return null;
  }
  function bring(g) {
    const sp = reg.byId.get(g.id); if (!sp) return null;
    const s = spot(sp); if (!s) return null;
    const a = spawnAnimal(sp, new THREE.Vector3(s.x, s.y, s.z)); if (!a) return null;
    a.visitor = true; a.guest = true; a.energy = 1; a.eatCD = 30;
    return { g, a };
  }
  function update() {
    if (disposed || W.research || W.training) return;
    for (const L of live) { const a = L.a; if (a && a.alive && !a.removed && !a.leaving) { a.energy = 1; a.eatCD = Math.max(a.eatCD || 0, 5); } }
    const lost = live.filter((L) => !L.a || !L.a.alive || L.a.removed || L.a.leaving);
    if (lost.length) { live = live.filter((L) => !lost.includes(L)); nextAt = Math.max(nextAt, nowS() + BACK); }
    if (nowS() < nextAt) return;
    nextAt = nowS() + 10;
    for (const g of wanted) {
      if (live.some((L) => L.g.id === g.id)) continue;
      const L = bring(g); if (L) live.push(L);
      break;   // one at a time, so they do not all appear in the same moment
    }
  }
  function dispose() { disposed = true; live = []; }
  return { update, dispose, refresh: read, get count() { return live.length; }, get wanted() { return wanted.length; }, now: () => { nextAt = 0; } };
}
