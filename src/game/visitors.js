// מבקרים נדירים (1.3.2, area H): per zone three species of the zone's own data that are hard to attract come by for a
// short visit when the island has what they look for (a harpy eagle when there are giant trees and its prey, an owl at
// night where there are many spiny mice, a reef shark where many fish swim…). Only when that species is not on the
// island now. A visit: the animal comes from outside, a soft beacon and a round button in the dock (left) show where it
// is, רובו־דע says one line (src/data/guide/after.js 'after:visit:<id>'), and after about a minute and a half it goes on
// its way. Photographed (the photo mode, or a field camera), it is kept: 'web-of-life-visitors' (src/game/rank.js).
// A visitor never hunts, is never saved with the forest, and does not count as placed (game.js hooks marked "H:").
import * as THREE from 'three';
import { esc } from '../ui/ui.js';
import { nameK } from '../data/inventions-kids.js';
import { readVisitors } from './rank.js';

// Q: small questions about the island (after.js). kids: the beginners' list (their species set is smaller).
export const VISITORS = {
  amazon: [
    { id: 'harpy', when: (Q) => Q.alive('sloth') + Q.alive('howler') >= 2 && Q.grown(['kapok', 'brazilnut'], 0.75) >= 2 },
    { id: 'jaguar', when: (Q) => Q.kinds(['capybara', 'tapir', 'agouti']) >= 2 && Q.alive('capybara') + Q.alive('tapir') + Q.alive('agouti') >= 3 },
    { id: 'macaw', when: (Q) => Q.grown(['brazilnut'], 0.75) >= 1 && Q.kinds(['acai', 'fig']) >= 2 },
    { id: 'toucan', kids: true, when: (Q) => Q.grown(['acai'], 0.7) >= 2 },
    { id: 'sloth', kids: true, when: (Q) => Q.grown(['cecropia'], 0.7) >= 2 },
    { id: 'agouti', kids: true, when: (Q) => Q.alive('acai') >= 2 && Q.alive('kapok') >= 1 },
  ],
  grove: [
    { id: 'owl', when: (Q) => Q.night() && Q.alive('spinymouse') >= 3 },
    { id: 'hoopoe', when: (Q) => !Q.night() && Q.alive('harvesterant') >= 1 && Q.alive('anemone') + Q.alive('cyclamen') >= 4 },
    { id: 'gazelle', when: (Q) => !Q.night() && Q.grown(['oak', 'carob', 'terebinth'], 0.75) >= 3 && Q.alive('buckthorn') >= 1 },
    { id: 'gazelle', kids: true, when: (Q) => !Q.night() && Q.grown(['oak'], 0.75) >= 3 },
    { id: 'jay', kids: true, when: (Q) => !Q.night() && Q.grown(['oak'], 0.75) >= 2 },
    { id: 'hyrax', kids: true, when: (Q) => !Q.night() && Q.alive('sage') >= 3 },
  ],
  reef: [
    { id: 'reefshark', when: (Q) => Q.fishKinds() >= 4 },
    { id: 'turtle', when: (Q) => Q.alive('seagrass') >= 5 },
    { id: 'stingray', when: (Q) => Q.alive('shrimp') + Q.alive('goby') >= 2 },
    { id: 'turtle', kids: true, when: (Q) => Q.alive('seagrass') >= 4 },
    { id: 'reefshark', kids: true, when: (Q) => Q.fishKinds() >= 2 },
    { id: 'parrotfish', kids: true, when: (Q) => Q.alive('algae') >= 3 },
  ],
};
export const visitorsFor = (zone, kids) => (VISITORS[zone] || []).filter((v) => !!v.kids === !!kids);

const STAY = 85;          // seconds of game time a visit lasts (longer while the child is photographing)
const FIRST = 50;         // the earliest visit after entering
const GAP = 170;          // between two visits
const CHECK = 8;          // how often the island is looked at

export function createVisitors({ W, env, reg, ui, audio, markers, rig, imv, spawnAnimal, art, Q, photoOpen, openPhoto }) {
  const kids = !!W.kids;
  const list = visitorsFor(W.biomeId, kids).filter((v) => reg.byId.has(v.id) && W.animalBuilders && W.animalBuilders[v.id]);
  let cur = null, checkT = CHECK, nextAt = W.simT + FIRST, enabled = false;
  const nameOf = (id) => { const n = reg.byId.get(id)?.name || ''; return kids ? nameK(n) : n; };

  // the round button in the dock: the visitor's painting, its name; a click flies the camera to it and opens the photo mode
  const btn = document.createElement('button');
  btn.className = 'tb af-vbtn'; btn.hidden = true; btn.dataset.a = 'visitor';
  btn.addEventListener('click', (e) => { e.stopPropagation(); if (!cur) return; focus(); openPhoto && openPhoto(); });
  if (imv.dock) imv.dock.appendChild(btn);
  const _f = new THREE.Vector3();
  function focus() {
    const a = cur && cur.a; if (!a || !a.alive) return;
    rig.followEntity(a, Math.max(9, (a.vis.length || 1) * a.obj.scale.x * 7));   // it moves: the view keeps it
    audio && audio.play && audio.play('click');
  }

  const photographed = () => new Set(readVisitors().map((v) => v.id));
  function spot(sp) {
    const R = (env.radius || 40) * 0.62;
    for (let i = 0; i < 30; i++) {
      const ang = Math.random() * Math.PI * 2, r = R * (0.35 + Math.random() * 0.65);
      const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
      const loco = sp.locomotion || 'ground';
      if (loco === 'flying') return { x, z, y: env.heightAt(x, z) + (sp.swims ? 2 : 7) };   // a fish is kept under the surface by Animal
      if (env.isPlaceable(x, z) && !(env.isWater && env.isWater(x, z))) return { x, z, y: env.heightAt(x, z) };
    }
    return null;
  }
  function start(v) {
    const sp = reg.byId.get(v.id); if (!sp) return false;
    const s = spot(sp); if (!s) return false;
    const a = spawnAnimal(sp, new THREE.Vector3(s.x, s.y, s.z)); if (!a) return false;
    a.visitor = true; a.energy = 1; a.eatCD = 30;
    cur = { v, a, t0: W.simT, until: W.simT + STAY, shot: false };
    const thumb = art(v.id);
    btn.innerHTML = `<span class="af-vimg">${thumb ? `<img src="${thumb}" alt="">` : ''}<i class="af-vring"></i></span><span class="tb-lab">${esc(nameOf(v.id))}</span>`;
    btn.setAttribute('aria-label', (kids ? 'מְבַקֵּר נָדִיר: ' : 'מבקר נדיר: ') + nameOf(v.id));
    btn.dataset.tip = kids ? 'מְבַקֵּר נָדִיר! לִחֲצוּ כְּדֵי לִרְאוֹת אוֹתוֹ' : 'מבקר נדיר! לחצו כדי לראות אותו';
    btn.hidden = false; btn.classList.remove('shot'); btn.classList.add('new');
    setTimeout(() => btn.classList.remove('new'), 2400);
    try { markers.locate([a], '#ffd84a', (e, out) => { if (!e.alive || e.leaving) return null; const f = e.focusPoint(_f); out.set(f.x, env.heightAt(f.x, f.z), f.z); return Math.max(1, f.y - out.y + 0.8); }, 10); } catch (e) { }
    audio && audio.play && audio.play('discover');
    const g = window.__guide, L = g && g.lines('after:visit:' + v.id);
    if (g && L && L.length) g.say(L, { tip: true, ms: 10000 });
    return true;
  }
  function end() {
    if (!cur) return;
    const { a } = cur; cur = null;
    if (a && a.alive && !a.leaving) a.leave();
    btn.hidden = true; nextAt = W.simT + GAP;
  }
  // the visitor was in a photo (the photo mode, or a field camera)
  function photographedNow(a) {
    if (!cur || cur.a !== a || cur.shot) return false;
    cur.shot = true; btn.classList.add('shot');
    cur.until = Math.max(cur.until, W.simT + 20);   // a little more time to look at it
    const g = window.__guide, L = g && g.lines('after:fact:' + cur.v.id);
    if (g && L && L.length) setTimeout(() => g.say(L, { tip: true, ms: 9000 }), 2600);
    return true;
  }

  function update(dt) {
    if (W.research) return;
    if (cur) {
      const a = cur.a;
      if (!a.alive || a.removed) { cur = null; btn.hidden = true; nextAt = W.simT + GAP; return; }
      // a guest: never hungry, never hunting (findFood looks only when hungry and the wait is over)
      a.energy = 1; a.eatCD = Math.max(a.eatCD, 5);
      if (a.leaving) { cur = null; btn.hidden = true; nextAt = W.simT + GAP; return; }
      if (photoOpen && photoOpen()) cur.until = Math.max(cur.until, W.simT + 6);   // never leaves while the child is aiming
      const left = Math.max(0, cur.until - W.simT);
      btn.style.setProperty('--left', (left / STAY).toFixed(3));
      if (W.simT >= cur.until && !imv.active) end();
      return;
    }
    if (!enabled || dt <= 0) return;
    checkT -= dt; if (checkT > 0) return; checkT = CHECK;
    if (W.simT < nextAt || W.isBusy()) return;
    const have = photographed();
    const ok = list.filter((v) => W.countAlive(v.id) === 0 && (() => { try { return v.when(Q); } catch (e) { return false; } })());
    if (!ok.length || Math.random() > 0.45) return;
    const fresh = ok.filter((v) => !have.has(v.id));
    const pick = (fresh.length ? fresh : ok)[(Math.random() * (fresh.length || ok.length)) | 0];
    if (!start(pick)) nextAt = W.simT + 30;
  }
  function dispose() { if (cur && cur.a && cur.a.alive) cur.a.leave(); cur = null; btn.remove(); }

  return {
    update, dispose, photographedNow, list,
    get current() { return cur ? { id: cur.v.id, a: cur.a, shot: cur.shot, left: cur.until - W.simT } : null; },
    setEnabled(on) { enabled = !!on; },
    get enabled() { return enabled; },
    force(id) { if (cur) end(); const v = (id && (VISITORS[W.biomeId] || []).find((x) => x.id === id)) || list[0]; return v ? start(v) : false; },   // tests
    end,
  };
}
