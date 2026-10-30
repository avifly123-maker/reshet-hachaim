// Events (decisions): starting one (W.runEvent; the mooring buoy and the forest listener can stop it), the short
// texts of חוויה, the child's choice, the effects of events and choices (applyEffect: a falling tree, rain, drought,
// heat, flood, fire, logging, a road ...), adding species, unlocking, and a finished mission (W.missionCompleted).
// Owns ctx.pendingEvent and ctx.roboEvent.
// Gives ctx: chooseEvent, applyEffect.
// Takes from ctx: the names destructured at the top of createEvents;
// functions of later parts through late(): addStump, buildRoad, buildBridge, removeRoad, refreshTray, saveGame,
// saveProgress.
// Shared state it reads or changes: ctx.pendingEvent, ctx.report, ctx.tools, ctx.roboEvent, ctx.lightDirty.
import { SOURCE_CARDS } from '../../data/torah.js';
import { grantSource } from '../../core/sources-store.js';
import { grant as grantBadge } from '../../core/badges-store.js';
import * as THREE from 'three';
import { clamp } from '../../core/util.js';
import { late } from './common.js';

export function createEvents(ctx) {
  const { W, missions, audio, ui, rig, reg, alive, amb, light, spawnPlant, env, spacingOK, findSpotNear,
    randomPlaceSpot, spawnAnimal } = ctx;
  const addStump = late(ctx, 'addStump'), buildRoad = late(ctx, 'buildRoad'), buildBridge = late(ctx, 'buildBridge'),
    removeRoad = late(ctx, 'removeRoad'), refreshTray = late(ctx, 'refreshTray'), saveGame = late(ctx, 'saveGame'),
    saveProgress = late(ctx, 'saveProgress');   // made by a later part

  // ─────────────────────────────────────────── events (decisions)
  ctx.pendingEvent = null;
  W.runEvent = (e) => {
    if (W.buoy && (e.start || []).some(fx => fx.type === 'anchor')) {
      missions.resolve(e); W.points += 10; audio.play('mission'); ctx.report?.event(e.id, 'buoy');
      ui.showOutcome({ title: 'הסירה נקשרה למצוף!', text: W.xp ? 'הסירה נקשרה למצוף העגינה, ולא הטילה עוגן. אף אלמוג לא נשבר. (+10)' : 'הסירה הגיעה לשונית, אבל במקום להטיל עוגן היא נקשרה למצוף העגינה. אף אלמוג לא נשבר. (+10)\n\nבמפרץ אילת יש מצופי עגינה כאלה באמת, כדי לשמור על השונית.' });
      return;
    }
    if (W.listener && (e.start || []).some(fx => fx.type === 'logging')) {
      missions.resolve(e); W.points += 10; audio.play('mission'); ctx.report?.event(e.id, 'listener');
      ui.showOutcome({ title: 'מאזין היער עצר כריתה!', text: W.xp ? 'מאזין היער שמע מסור חשמלי והזעיק את שומרי היער. העצים לא נכרתו. (+10)' : 'מאזין היער שמע רעש של מסור חשמלי ושלח התרעה לשומרי היער. הם הגיעו בזמן, והעצים לא נכרתו. (+10)\n\nיש היום חיישנים כאלה באמת: טלפונים ישנים עם לוח סולארי, שנתלים גבוה על עצים ומקשיבים ליער כל היום וכל הלילה.' });
      return;
    }
    ctx.pendingEvent = e; W._eventT = W.simT;
    for (const fx of e.start || []) applyEffect(fx);
    ctx.tools.afterEventStart(e);   // area G: a fire tower, the young-corals robot, murky water that clears sooner (tools.js)
    audio.play('event');
    if (rig.following) rig.stopFollow();
    // חוויה: one line of explanation (and the question) and at most two ways; רובו־דע tells the rest the first time
    const xp = W.xp;
    ui.showEvent({ id: e.id, title: e.title, text: xp ? shortEventText(e.text) : e.text, choices: ctx.tools.eventChoices(e).map(c => ({ id: c.id, label: c.label })) });   // חוויה: two; full: the threads may add a way
    ctx.roboEvent = 'zone:event:' + e.id;   // after the outcome is closed: his bubble must not cover the choices
  };
  ctx.roboEvent = null;
  const sentences = (t) => String(t || '').split('\n')[0].split(/(?<=[.!?])\s+/).filter(Boolean);
  function shortEventText(t) {
    const ss = sentences(t); if (ss.length <= 1) return String(t || '');
    const last = ss[ss.length - 1];
    return /\?$/.test(last) ? ss[0] + ' ' + last : ss[0];
  }
  const shortOutcome = (t) => { if (!W.xp) return t; const ss = sentences(t); const pts = (String(t).match(/\(\+\d+\)/) || [''])[0]; return ss[0] + (pts && !ss[0].includes(pts) ? ' ' + pts : ''); };
  function chooseEvent({ eventId, choiceId }) {
    const e = missions.events.find(x => x.id === eventId); if (!e) return;
    const c = ctx.tools.eventChoices(e).find(x => x.id === choiceId) || e.choices.find(x => x.id === choiceId); if (!c) return;
    for (const fx of c.effects || []) applyEffect(fx);
    missions.resolve(e);
    ctx.report?.event(e.id, c.id);
    if (/^(a_noagouti|g_nojay)$/.test(e.id)) W.stats.experiments++;
    ctx.pendingEvent = null; W._eventT = W.simT;   // the calm after an event counts from its end
    ui.showOutcome({ title: e.title, text: shortOutcome(c.outcome) });
  }
  function applyEffect(fx) {
    const sp = fx.species ? reg.byId.get(fx.species) : null;
    switch (fx.type) {
      case 'treeFall': {
        const cand = W.plants.filter(p => alive(p) && p.isTree && !p.falling && p.growth > 0.5 && (fx.target === 'tallest' || p.sp.id === fx.target));
        cand.sort((a, b) => b.topY() - a.topY());
        const t = cand[0]; if (!t) break;
        const dir = Math.atan2(t.z, t.x) + (Math.random() - 0.5) * 0.8; // fall outward
        t.fall(dir); W.treeFallen = true; W.gapPos = { x: t.x, z: t.z }; ctx.lightDirty = true;
        for (const p of W.plants) if (p.host === t) p.die('fall');
        W.storm = 1; W.stormT = 25; W.rainTarget = 1; W.rainT = Math.max(W.rainT, 25);
        rig.focusOn(new THREE.Vector3(t.x, t.y + 8, t.z), 40);
        break;
      }
      case 'rain': W.rainTarget = 1; W.rainT = Math.max(W.rainT, fx.seconds || 30); W.drought = Math.max(0, W.drought - 0.5); W.droughtT = 0; break;
      case 'drought': if (W.weatherStation) { fx = { ...fx, strength: (fx.strength ?? 0.6) * 0.55 }; amb('תחנת מזג האוויר התריעה מראש – היער התכונן, והבצורת פחות קשה', 'info'); }
        W.drought = fx.strength ?? 0.6; W.droughtT = fx.seconds || 60; W.rainT = 0; W.rainTarget = 0; break;
      case 'heat': if (W.weatherStation && W.biomeId === 'reef') { fx = { ...fx, seconds: (fx.seconds || 40) * 0.6 }; amb('מצוף החיישנים התריע על מים חמים – השונית נערכה, והנזק קטן יותר', 'info'); }
        W.heat = W.weatherStation && W.biomeId === 'reef' ? 0.6 : 1; W.heatT = fx.seconds || 40; W.drought = Math.max(W.drought, 0.35); W.droughtT = Math.max(W.droughtT, fx.seconds || 40); break;
      case 'flood': W.flood = W.weatherStation ? 0.5 : 1; W.floodT = (fx.seconds || 40) * (W.weatherStation ? 0.6 : 1); break;
      case 'fire': {
        const s = (fx.strength ?? 0.5) * (W.weatherStation ? 0.5 : 1);
        if (W.weatherStation) amb('תחנת מזג האוויר זיהתה חום ורוח – האש התגלתה מוקדם והייתה קטנה', 'info');
        let fx0 = null;
        const cand = W.plants.filter(p => alive(p) && (p.isTree || p.sp.kind === 'shrub') && Math.hypot(p.x, p.z) > 12);
        if (cand.length) { const p = cand[(Math.random() * cand.length) | 0]; fx0 = { x: p.x, z: p.z }; }
        else { const a = Math.random() * Math.PI * 2; fx0 = { x: Math.cos(a) * 24, z: Math.sin(a) * 24 }; }
        W.fires.push({ x: fx0.x, z: fx0.z, r: 4 + s * 9, intensity: 0, t: 0, dur: 26 + s * 10 });
        rig.focusOn(new THREE.Vector3(fx0.x, 4, fx0.z), 34);
        break;
      }
      case 'points': W.points += fx.amount || 0; break;
      case 'unlock': if (sp) unlock(sp.id, true); break;
      case 'add': if (sp) addSpecies(sp, fx.count || 1); break;
      case 'plant': if (sp) {
        // where 'scar': first the places where the reef was hurt; strong: corals from the nursery (bigger, bleach less)
        const spots = fx.where === 'gap' ? light.brightSpots((fx.count || 1) * 3, 4) : fx.where === 'scar' ? W.scars.slice() : [];
        const g0 = fx.strong ? 0.5 : 0.12;
        let n = 0;
        const put = (x, z) => { const p = spawnPlant(sp, x, z, { growth: g0 }); if (p && fx.strong) p.strong = true; return p; };
        for (const s of spots) {
          if (n >= (fx.count || 1)) break;
          let at = env.isPlaceable(s.x, s.z) && spacingOK(sp, s.x, s.z) ? s : fx.where === 'scar' ? findSpotNear(sp, s.x, s.z, 2.5) : null;
          if (at && put(at.x, at.z)) { n++; if (fx.where === 'scar') { W.scars.splice(W.scars.indexOf(s), 1); W.stats.scarsHealed = (W.stats.scarsHealed || 0) + 1; } }
        }
        while (n < (fx.count || 1)) { const s = randomPlaceSpot(sp); if (!s) break; if (put(s.x, s.z)) n++; else break; }
        W.everPlaced.add(sp.id);
      } break;
      case 'breakCorals': {   // a storm breaks corals; where they stood the reef is hurt (W.scars, filled by onPlantDied)
        const cor = W.plants.filter(p => alive(p) && p.sp.kind === 'coral').sort(() => Math.random() - 0.5);
        const n = fx.count || 1;
        for (let i = 0; i < Math.min(n, cor.length); i++) cor[i].die('event');
        for (let i = cor.length; i < n; i++) { const s = randomPlaceSpot({ kind: 'coral' }); if (s) { W.scars.push({ x: +s.x.toFixed(2), z: +s.z.toFixed(2), t: Math.round(W.simT) }); if (W.scars.length > 6) W.scars.shift(); } }   // no coral to break: the storm still leaves bare rock
        break;
      }
      case 'remove': if (sp) {
        const ents = [...W.plants.filter(p => p.sp.id === sp.id && alive(p)), ...W.animals.filter(a => a.sp.id === sp.id && alive(a) && !a.leaving)];
        const n = fx.count === 'all' ? ents.length : Math.min(ents.length, fx.count || 1);
        for (let i = 0; i < n; i++) { const e = ents[i]; if (e.isPlant) e.die('event'); else e.leave(); }
      } break;
      case 'anchor': {   // a boat's anchor drops onto the reef and breaks a coral or two
        const cor = W.plants.filter(p => alive(p) && p.sp.kind === 'coral');
        for (let i = 0; i < Math.min(fx.count || 1, cor.length); i++) { const p = cor[(Math.random() * cor.length) | 0]; if (alive(p)) p.die('event'); }
        break;
      }
      case 'logging': {
        if (W.protected) break;
        const trees = W.plants.filter(p => alive(p) && p.isTree && !p.falling && p.growth > 0.5).sort((a, b) => Math.hypot(b.x, b.z) - Math.hypot(a.x, a.z));
        const n = Math.min(fx.count || 2, trees.length);
        for (let i = 0; i < n; i++) {
          const t = trees[i];
          addStump(t.x, t.z, Math.max(0.35, (t.vis.trunkRadius || 0.5) * (0.6 + 0.4 * t.growth)));
          for (const q of W.plants) if (q.host === t) q.die('fall');
          W.onPlantDied(t, 'logged'); t.alive = false; W.removeEntity(t);
        }
        if (n) { rig.focusOn(new THREE.Vector3(trees[0].x, 3, trees[0].z), 30); ctx.lightDirty = true; }
        break;
      }
      case 'sandstorm': W.sandT = fx.seconds || 30; break;   // 1.4, the desert (src/game/game/water.js)
      case 'locust': W.locustT = fx.seconds || 25; break;
      case 'protect': W.protected = true; amb('היער הוא עכשיו שמורת טבע 🛡', 'good'); break;
      case 'road': buildRoad(); break;
      case 'ecoBridge': buildBridge(); break;
      case 'removeRoad': removeRoad(); break;
      case 'boost': if (sp) {
        const a = fx.amount || 0.3;
        for (const p of W.plants) if (p.sp.id === sp.id && alive(p)) { p.health = clamp(p.health + a); p.growth = clamp(p.growth + a * 0.4); p.fruit = clamp(p.fruit + a); if (p.sp.pollinators.length === 0) p.bloom = clamp(p.bloom + a); }
        for (const x of W.animals) if (x.sp.id === sp.id && alive(x)) x.energy = clamp(x.energy + a);
      } break;
    }
  }
  function addSpecies(sp, count) {
    if (sp.isPlant) {
      for (let i = 0; i < count; i++) {
        if (sp.needs?.host) { const hosts = W.plants.filter(p => alive(p) && p.isTree && p.growth > 0.5 && p.vis.attachPoints().length); if (!hosts.length) break; const h = hosts[(Math.random() * hosts.length) | 0]; spawnPlant(sp, h.x, h.z, { host: h }); }
        else { const s = randomPlaceSpot(sp); if (s) spawnPlant(sp, s.x, s.z, { growth: sp.kind === 'fungus' ? 0.7 : 0.25 }); }
      }
    } else {
      let base = null;
      if (sp.needs?.water && env.water) { const pts = env.water.path || env.water.pools || []; const p = pts[(Math.random() * pts.length) | 0]; if (p) base = { x: p.x + 4, z: p.z + 4 }; }
      if (!base) base = randomPlaceSpot({ kind: 'herb', needs: sp.needs }) || { x: 0, z: 0 };
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2; let x = base.x + Math.cos(a) * 2, z = base.z + Math.sin(a) * 2;
        if (!env.isPlaceable(x, z)) { x = base.x; z = base.z; }
        spawnAnimal(sp, new THREE.Vector3(x, env.heightAt(x, z), z));
      }
    }
    W.everPlaced.add(sp.id);
  }
  function unlock(id, announce) {
    if (W.unlocked.has(id)) return;
    W.unlocked.add(id);
    if (announce) ui.toast(`נפתח: ${reg.byId.get(id)?.name}`, 'good');
    refreshTray();
  }
  W.missionCompleted = (m) => {
    W._missionDoneT = W.simT;   // a calm moment after a mission (ecology.js W.calmBusy)
    ctx.report?.mission(m.id);
    W.points += m.reward?.points || 0;
    const names = [];
    for (const id of m.reward?.unlock || []) { unlock(id, false); names.push(reg.byId.get(id)?.name); }
    audio.play('mission');
    // a card pack for two missions out of every three (not every one – packs should stay special)
    if (!m.expert && !W.training && missions.doneCount % 3 !== 0) { try { window.__wolLearn?.grantPack(1); } catch (e) { } }
    const badges = W.research || W.training ? [] : grantBadge('mission:' + m.id);   // an expert mission gives a badge (תג), not a pack
    // torah edition: a mission from the sources gives its source card for the album ("מן המקורות")
    let srcText = '';
    if (m.reward?.source) { const card = SOURCE_CARDS.find(c => c.id === m.reward.source); if (card && grantSource(card.id)) srcText = ' · קלף מקור חדש באלבום: ' + card.title; }
    ui.missionDone({ title: m.title, note: m.autoNote || '', rewardText: `+${m.reward?.points || 0} נקודות חיים${names.length ? ' · נפתחו: ' + names.join(', ') : ''}${srcText}${badges.length ? ' · תג חדש: ' + badges.map(b => b.name).join(', ') : ''}` });
    try { const g = m.goal || {}; const sid = [g.from, g.id, g.species, g.to].find((x) => typeof x === 'string' && reg.byId.has(x) && reg.byId.get(x).kind === 'animal'); window.__flourish && window.__flourish.mission(sid); } catch (e) { }   // area I: an animal from the mission celebrates
    refreshTray();
    if (W.experiment) W._saveAfterExperiment = true; else saveGame(true);
    if (!W.research) saveProgress();
    // מסע החוקר (core/journey.js) counts missions from the saved progress: tell it, after the mission banner
    if (!W.research && !W.training) setTimeout(() => { try { window.dispatchEvent(new CustomEvent('wol-progress', { detail: { kind: 'mission', id: m.id } })); } catch (e) { } }, 2500);
  };
  return { chooseEvent, applyEffect };
}
