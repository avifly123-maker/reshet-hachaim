// אחרי המשימות (1.3.2, area H): what keeps a zone interesting once its missions are done. One object per open forest,
// created by game.js (hooks marked "H:"), never inside a mystery.
//   photos.js      the photo mode (a "צילום" button in the dock) and the album; photo missions after the regular chain
//   visitors.js    rare visitors that come when the island has what they look for
//   challenges.js  one guardian challenge per visit (the full mode only)
//   rank.js        the island's rank (four per zone), its stores, and the start screen's line under the island
// Here: the "שומרי האי" panel in the right column (it takes the place of the finished missions list), the rewards of a
// photo, the rank going up (רובו־דע says it), the small extras of a high rank on the island (more butterflies in the
// forests, a school of fish on the reef: models the zone already has), and the snapshot of the island for the rank.
import * as THREE from 'three';
import { esc, icon } from '../ui/ui.js';
import { createPhotos, photoMissions, photoMatches, CAM_SVG } from './photos.js';
import { createVisitors } from './visitors.js';
import { createChallenges } from './challenges.js';
import { rankOf, rankEmblem, zoneAfter, updateZone, snapshot, readPhotos, addVisitor, CH_POINTS } from './rank.js';
import { makeRng } from '../core/util.js';
import { visScale } from '../world/animals.js';

const T = {
  title: ['שומרי האי', 'שׁוֹמְרֵי הָאִי'], pm: ['משימת צילום', 'מְשִׂימַת צִלּוּם'], pmAll: ['כל משימות הצילום הושלמו', 'כָּל מְשִׂימוֹת הַצִּלּוּם הֻשְׁלְמוּ'],
  pmMore: ['צלמו עוד, והאי יעלה בדרגה', 'צַלְּמוּ עוֹד, וְהָאִי יַעֲלֶה בְּדַרְגָּה'], ch: 'אתגר שומרים', chNext: 'אתגר חדש מחכה בביקור הבא',
  lv: 'רמה', done: ['משימת צילום', 'מְשִׂימַת צִלּוּם'], next: ['עד הדרגה הבאה', 'עַד הַדַּרְגָּה הַבָּאָה'],
};
const DECOR = { amazon: 'morpho', grove: 'butterfly', reef: 'butterflyfish' };
const DECOR_N = { amazon: [0, 2, 4, 6], grove: [0, 2, 4, 6], reef: [0, 4, 7, 10] };

export function createAfter({ W, env, reg, scene, camera, canvas, pipe, ui, audio, bus, markers, rig, imv, tools, spawnAnimal, art }) {
  const zone = W.biomeId, kids = !!W.kids, root = document.getElementById('ui');
  const t = (k) => (Array.isArray(T[k]) ? T[k][kids ? 1 : 0] : T[k]);
  const alive = (e) => e.alive && !e.removed && !e.dying && !e.leaving;
  const full = () => !W.kids && !W.xp && !W.research;   // the challenges are for the full mode only

  // ── small questions about the island (visitors' conditions, challenges)
  const Q = {
    alive: (id) => W.countAlive(id),
    kinds: (ids) => ids.filter((id) => W.countAlive(id) > 0).length,
    grown: (ids, g) => W.plants.filter((p) => ids.includes(p.sp.id) && alive(p) && p.growth >= g).length,
    night: () => W.nightGlow > 0.5,
    fishKinds: () => new Set(W.animals.filter((a) => alive(a) && a.sp.swims).map((a) => a.sp.id)).size,
  };
  const activeLinks = () => { const s = new Set(W.aliveSpecies()); let n = 0; for (const e of reg.edges) if (s.has(e.from) && s.has(e.to)) n++; return n; };
  const live = () => ({ kinds: W.aliveSpecies().length, links: activeLinks(), days: Math.max(0, W.day - 1) });

  // ── the parts
  let visitors = null;
  const photos = createPhotos({ W, reg, camera, canvas, pipe, ui, audio, imv, bus, rig, markers, onShot: (rec, info) => onPhoto(rec, info) });
  visitors = createVisitors({ W, env, reg, ui, audio, markers, rig, imv, spawnAnimal, art, Q, photoOpen: () => photos.isOpen, openPhoto: () => photos.open() });
  const chCtx = {
    grove: zone === 'grove',
    kinds: () => W.aliveSpecies().length,
    total: () => W.biome.species.length,
    undiscovered: () => reg.edges.filter((e) => !W.discovered.has(e.key)).length,
    chain: () => W.longestChain(),
    visitorsPossible: () => visitors.list.length > 0,
  };
  const challenges = createChallenges({ W, ctx: chCtx, pickLast: () => { const ch = zoneAfter(zone).ch; return ch.length ? ch[ch.length - 1].id : null; } });

  // a field camera photographed a visitor: it counts as photographed too (no picture: the cabinet shows its card painting)
  const prevShot = tools && tools.hooks ? tools.hooks.onShot : null;
  if (tools && tools.hooks) tools.hooks.onShot = (p, a, fresh) => {
    try { if (prevShot) prevShot(p, a, fresh); } catch (e) { console.error(e); }
    if (a && a.visitor && visitors.photographedNow(a)) { addVisitor({ id: a.sp.id, zone, t: Date.now() }); W.points += 10; challenges.onVisitor(a.sp.id); paint(); }
  };

  // ── the rewards of a photo
  function onPhoto(rec, info) {
    let pts = 0;
    const all = readPhotos();
    const before = all.filter((p) => p.zone === zone && p !== all[all.length - 1]);
    if (rec.sp && !before.some((p) => p.sp === rec.sp)) pts += 3;
    const z = zoneAfter(zone); let newPair = false;
    const fresh = info.pairs.map((p) => p.join('>')).filter((k) => !z.pairs[k]);
    if (fresh.length) { pts += 5 * Math.min(2, fresh.length); newPair = true; updateZone(zone, (zz) => { for (const k of fresh) zz.pairs[k] = Date.now(); }); }
    for (const a of info.visitors) if (visitors.photographedNow(a)) { addVisitor({ id: a.sp.id, zone, t: Date.now(), img: rec.img }); pts += 10; }
    if (full()) challenges.onPhoto(info);
    // the photo mission
    const pm = currentPM();
    let pmDone = false;
    if (pm && afterOn && photoMatches(pm, info, W)) {
      updateZone(zone, (zz) => { zz.pm[pm.id] = Date.now(); });
      const reward = kids ? 20 : 30; pts += reward; pmDone = true;
      ui.missionDone({ title: pm.f, rewardText: kids ? `קִבַּלְתֶּם ${reward} נְקֻדּוֹת` : `${reward} נקודות חיים · דרגת האי עולה` });
      audio && audio.play && audio.play('mission');
    }
    W.points += pts;
    const g = window.__guide;
    if (g) {
      if (pmDone) setTimeout(() => g.say(g.lines('after:pmdone'), { tip: true }), 4400);
      else if (newPair) g.say(g.lines('after:pair'), { key: 'g:after:pair', tip: true });
    }
    paint(); rankCheck(true);
    return { points: pts };
  }
  const currentPM = () => { const z = zoneAfter(zone); return photoMissions(zone, kids).find((m) => !z.pm[m.id]) || null; };

  // ── "שומרי האי": the panel in the right column, once the regular missions are done
  const panel = document.createElement('section');
  panel.className = 'af-panel glass'; panel.hidden = true; panel.lang = 'he'; panel.setAttribute('aria-label', t('title'));
  const rc = root.querySelector('.rightcol');
  const anchor = rc && (rc.querySelector('.m-whatnow') || rc.querySelector('.missions'));
  if (rc) { if (anchor && anchor.parentNode === rc) anchor.after(panel); else rc.prepend(panel); }
  let afterOn = false, chOpen = false, rank = null, paintSig = '';
  function paint() {
    if (!afterOn) { panel.hidden = true; root.classList.remove('af-done'); return; }
    const pm = currentPM(), ch = full() ? challenges.current : null;
    const expert = W.missions && W.missions.current && W.missions.current();
    const r = rank || rankOf(zone, kids, live());
    const simple = !full();
    const pmRow = pm ? `<button type="button" class="af-row af-pm"><i class="af-ric">${CAM_SVG}</i><span><small>${esc(t('pm'))}</small><b>${esc(pm.f)}</b><em>${esc(pm.hint || '')}</em></span></button>`
      : `<div class="af-row af-pm all"><i class="af-ric">${icon('check')}</i><span><small>${esc(t('pmAll'))}</small><b>${esc(t('pmMore'))}</b></span></div>`;
    const pc = ch ? Math.round((ch.progress || 0) * 100) : 0;
    const chRow = ch ? `<button type="button" class="af-row af-ch${ch.done ? ' done' : ''}${chOpen ? ' open' : ''}">
        <span><small><i class="af-lv" aria-label="${T.lv} ${ch.lv}">${[1, 2, 3].map((k) => `<i class="${k <= ch.lv ? 'on' : ''}"></i>`).join('')}</i>${esc(T.ch)}<i class="af-pc" style="--p:${pc}%">${ch.done ? icon('check') : pc + '%'}</i></small>
        <b>${esc(ch.done ? T.chNext : ch.title)}</b>${chOpen && !ch.done ? `<em>${esc(ch.how)}</em>` : ''}</span></button>` : '';
    const html = `<header class="af-head">${rankEmblem(zone, r.i)}<span><small>${esc(t('title'))}</small><b>${esc(r.name)}</b></span>
        ${simple || r.next == null ? '' : `<i class="af-rbar" title="${esc(t('next'))}"><i style="width:${Math.round(r.progress * 100)}%"></i></i>`}</header>${pmRow}${chRow}`;
    if (html !== paintSig) { panel.innerHTML = html; paintSig = html; }
    panel.hidden = false;
    panel.classList.toggle('min', !!expert);
    root.classList.toggle('af-done', !expert);
  }
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) { if (e.target.closest('.af-head') && panel.classList.contains('min')) panel.classList.toggle('peek'); return; }
    if (b.classList.contains('af-pm')) { photos.open(); return; }
    if (b.classList.contains('af-ch')) { chOpen = !chOpen; paint(); audio && audio.play && audio.play('click'); }
  });
  panel.addEventListener('pointerdown', (e) => e.stopPropagation());

  const regularDone = () => !!(W.missions && W.missions.missions.length && W.missions.missions.every((m) => m.expert || m.done));
  function turnOn() {
    afterOn = true; paint();
    const g = window.__guide;
    if (g) setTimeout(() => { if (!disposed && afterOn) g.say(g.lines(full() ? 'after:open' : 'after:openxp'), { key: 'g:after:open:' + zone }); }, W.simT < 20 ? 6000 : 5200);
    if (full()) offerChallenge(true);
  }
  let chOffered = false;
  function offerChallenge(announce) {
    if (chOffered || !full()) return;
    chOffered = true;
    const c = challenges.offer(zoneAfter(zone).ch.length);
    if (c && announce) { const g = window.__guide; if (g) setTimeout(() => { if (!disposed) g.say(g.lines('after:challenge'), { key: 'g:after:challenge', tip: true }); }, 16000); }
    paint();
  }
  function challengeDone(c) {
    updateZone(zone, (z) => { z.ch.push({ id: c.id, lv: c.lv, t: Date.now() }); });
    const reward = [20, 35, 50][c.lv - 1] || 20; W.points += reward;
    ui.missionDone({ title: T.ch + ': ' + c.title, rewardText: `${reward} נקודות חיים · ${CH_POINTS[c.lv]} נקודות לדרגת האי` });
    audio && audio.play && audio.play('mission');
    const g = window.__guide; if (g) setTimeout(() => { if (!disposed) g.say(g.lines('after:chdone'), { tip: true }); }, 4400);
    paint(); rankCheck(true);
  }

  // ── the rank: checked every few seconds with the island's live numbers; up → רובו־דע says it, the extras grow
  let rankT = 2, snapT = 60;
  function rankCheck(now) {
    const r = rankOf(zone, kids, live());
    const prev = rank; rank = r;
    if (prev && r.i > prev.i) {
      const g = window.__guide, L = g && g.lines('after:rank:' + zone + ':' + r.i);
      if (L && L.length) setTimeout(() => { if (!disposed) g.say(L, { tip: true, ms: 9000 }); }, now ? 5200 : 0);
      buildDecor(r.i);
      paint();
    } else if (!prev) buildDecor(r.i);
  }

  // ── the extras of a rank: butterflies (the forests) or a school of fish (the reef), models the zone already has
  const flock = []; let decorI = -1;
  const rng = makeRng(77);
  function clearDecor() { for (const f of flock) { try { f.obj.removeFromParent(); f.vis.dispose && f.vis.dispose(); } catch (e) { } } flock.length = 0; }
  function buildDecor(i) {
    if (i === decorI || W.research) return; decorI = i;
    clearDecor();
    const id = DECOR[zone], make = W.animalBuilders && W.animalBuilders[id]; if (!make) return;
    const n = (DECOR_N[zone] || [0, 0, 0, 0])[i] || 0;
    const R = (env.radius || 40);
    const fish = zone === 'reef';
    const school = { ang: rng() * 6.28, r: R * 0.42, cx: 0, cz: 0 };
    for (let k = 0; k < n; k++) {
      let vis; try { vis = make({ seed: 900 + k, rng: makeRng(900 + k) }); } catch (e) { continue; }
      const obj = vis.object; obj.rotation.order = 'YXZ';
      obj.scale.setScalar(visScale(vis.length || 1) * (fish ? 0.9 : 1));
      scene.add(obj);
      const a = rng() * 6.28, rr = R * (0.2 + rng() * 0.45);
      flock.push({ vis, obj, k, fish, school, ph: rng() * 6.28, cx: Math.cos(a) * rr, cz: Math.sin(a) * rr, r: 2.5 + rng() * 3.5, h: 2 + rng() * 2.5, sp: 0.5 + rng() * 0.4, off: [(rng() - 0.5) * 3, (rng() - 0.5) * 1.6, (rng() - 0.5) * 3] });
    }
  }
  function updateDecor(dt, rdt, tt) {
    if (!flock.length) return;
    const night = W.nightGlow > 0.6;
    const S0 = flock[0].school; if (flock[0].fish) S0.ang += dt * 0.05;
    for (const f of flock) {
      let x, y, z, hx, hz;
      if (f.fish) {   // the school swims slowly round the reef, each fish a little apart, under the surface
        const a = S0.ang + f.off[0] * 0.02;
        x = Math.cos(a) * S0.r + f.off[0]; z = Math.sin(a) * S0.r + f.off[2];
        const top = env.surfaceY != null ? env.surfaceY - 2.2 : env.heightAt(x, z) + 4;
        y = Math.max(env.heightAt(x, z) + 1.2, top - 1.5 + f.off[1] + Math.sin(tt * 0.7 + f.ph) * 0.3);
        hx = -Math.sin(a); hz = Math.cos(a);
        f.obj.visible = true;
      } else {        // a butterfly flutters in a loose loop over its own patch; at night they rest out of sight
        f.ph += dt * f.sp;
        x = f.cx + Math.cos(f.ph) * f.r; z = f.cz + Math.sin(f.ph * 1.3) * f.r * 0.7;
        y = env.heightAt(x, z) + f.h + Math.sin(tt * 2.1 + f.k) * 0.5;
        hx = -Math.sin(f.ph); hz = Math.cos(f.ph * 1.3) * 0.9;
        f.obj.visible = !night;
      }
      f.obj.position.set(x, y, z);
      f.obj.rotation.y = Math.atan2(hx, hz);
      try { f.vis.update(rdt, { action: 'fly', speed: f.fish ? 1.6 : 2.2, t: tt, night: W.nightGlow }); } catch (e) { }
    }
  }

  // ── per frame
  let tt = 0, offerT = 25, disposed = false, chT = 0;
  function update(dt, rdt, t) {
    if (W.research || disposed) return;
    tt = t || (tt + rdt);
    photos.update(rdt);
    visitors.setEnabled(!!W.missions && W.missions.doneCount >= (kids ? 2 : 4));
    visitors.update(dt);
    if (!afterOn && regularDone()) turnOn();
    if (afterOn && full() && !chOffered) { offerT -= dt; if (offerT <= 0) offerChallenge(false); }
    chT -= rdt;
    if (afterOn && chT <= 0) {
      chT = 0.5;
      const c = full() ? challenges.current : null;
      if (c && challenges.tick()) challengeDone(c);
      paint();
    }
    rankT -= rdt; if (rankT <= 0) { rankT = 5; rankCheck(false); }
    snapT -= rdt; if (snapT <= 0) { snapT = 60; snapshot(zone, kids, live()); }
    updateDecor(dt, rdt, tt);
  }
  function dispose() {
    if (disposed) return; disposed = true;
    try { if (W.simT > 5) snapshot(zone, kids, live()); } catch (e) { }
    if (tools && tools.hooks && prevShot !== undefined) tools.hooks.onShot = prevShot;
    photos.dispose(); visitors.dispose(); clearDecor(); panel.remove(); root.classList.remove('af-done', 'af-shoot');
  }
  const api = { update, dispose, photos, visitors, challenges, get rank() { return rank; }, get on() { return afterOn; }, turnOn, paint, offerChallenge: () => { chOffered = false; offerChallenge(false); },
    decor: (i) => buildDecor(i), get flock() { return flock.length; } };   // tests: the extras of rank i
  return api;
}
