// Missions (goals + rewards) and events (decisions with ecological consequences).
import { TORAH, sourcesOn } from '../core/edition.js';
import { TORAH_MISSIONS } from '../data/torah.js';

// torah edition (sources on, not in the beginners' mode): missions from the sources join the chain, each one right
// after the mission it names (the mission that used to follow comes after it)
function withTorahMissions(list, extra) {
  const out = list.map(m => ({ ...m }));
  for (const t of extra || []) {
    const i = out.findIndex(m => m.id === t.insertAfter); if (i < 0) continue;
    for (const m of out) if (m.after === t.insertAfter) m.after = t.id;
    const { insertAfter, ...rest } = t;
    out.splice(i + 1, 0, { ...rest, after: insertAfter });
  }
  return out;
}

export function createMissions(W) {
  const B = W.biome;
  const base = TORAH && sourcesOn() && !W.kids ? withTorahMissions(B.missions, TORAH_MISSIONS[W.biomeId]) : B.missions;
  const missions = base.map(m => ({ ...m, done: false, progress: 0, started: false, t0: 0, healthT: 0 }));
  const events = B.events.map(e => ({ ...e, fired: false, resolved: false, resolvedAt: -1 }));
  const queue = [];
  let lastDay = 0;

  function current() { return missions.find(m => !m.done && (!m.after || missions.find(x => x.id === m.after)?.done)); }

  function start(m) {
    if (m.started) return;
    m.started = true; m.t0 = W.simT;
    // a mission that was running before the game was saved keeps its starting point (restored from the save)
    if (!W.stats.missionStart[m.id]) W.stats.missionStart[m.id] = { pollinations: { ...W.stats.pollinations }, dispersals: W.stats.dispersals, experiments: W.stats.experiments, rescues: W.stats.rescues || 0, seeded: W.stats.seeded || 0 };
    for (const e of events) if (!e.fired && e.trigger.type === 'mission' && e.trigger.id === m.id) fire(e, 6);
  }

  function fire(e, delay = 0) {
    if (e.fired) return; e.fired = true;
    const item = { e, at: W.simT + delay };
    const i = queue.findIndex(q => q.at > item.at);   // keep the queue in time order
    if (i < 0) queue.push(item); else queue.splice(i, 0, item);
  }

  function aliveCount(id) { return W.countAlive(id); }

  function evalGoal(m) {
    const g = m.goal; const S = W.stats; const base = S.missionStart[m.id] || { pollinations: {}, dispersals: 0, experiments: 0 };
    switch (g.type) {
      case 'place': return Math.min(1, W.countPlaced(g.species) / g.count);   // only what the player placed, not the wild forest
      case 'speciesAlive': return Math.min(1, W.aliveSpecies().length / g.count);
      case 'link': return W.linkDiscovered(g.from, g.to) ? 1 : (aliveCount(g.from) > 0) * 0.4 + (aliveCount(g.to) > 0) * 0.4;
      case 'chain': return Math.min(1, W.longestChain() / g.length);
      case 'health': {
        if (W.vitality >= g.min) m.healthT += W.lastTickDt; else m.healthT = Math.max(0, m.healthT - W.lastTickDt * 2);
        return Math.min(1, m.healthT / g.seconds);
      }
      case 'growTo': return Math.min(1, W.plants.filter(p => p.sp.id === g.species && p.alive && !p.removed && !p.wild && p.growth >= g.min).length / (g.count || 1));
      case 'grow': return Math.min(1, W.plants.filter(p => p.sp.id === g.species && p.alive && !p.removed && !p.wild && p.growth >= 0.95).length / g.count);
      case 'floorLight': { if (!W.treeFallen || !W.gapPos) return 0; const v = W.light.floorAt(W.gapPos.x, W.gapPos.z); return Math.min(1, v / Math.max(0.05, g.min)); }
      case 'pollinate': return Math.min(1, ((S.pollinations[g.species] || 0) - (base.pollinations[g.species] || 0)) / g.count);
      case 'disperse': return Math.min(1, (S.dispersals - base.dispersals) / g.count);
      case 'discover': return Math.min(1, W.discovered.size / g.count);
      case 'observeNight': return W.nightGlow > 0.6 && W.animals.some(a => a.visible && a.isActive() && (a.sp.active === 'night')) || (W.nightGlow > 0.6 && W.plants.some(p => p.alive && (p.sp.id === 'glowfungus' || p.sp.id === 'mushroom'))) ? 1 : W.nightGlow * 0.5;
      case 'survive': {
        const e = events.find(x => x.id === g.event);
        if (!e || !e.resolved) return 0;
        if (W.vitality >= 0.45) m.healthT += W.lastTickDt; else m.healthT = Math.max(0, m.healthT - W.lastTickDt);
        return Math.min(1, 0.3 + 0.7 * m.healthT / 60);
      }
      case 'bloom': return W.plants.some(p => p.sp.id === g.species && p.alive && !p.wild && p.bloom > 0.5) ? 1 : W.countPlaced(g.species) > 0 ? 0.4 : 0;   // blooming in its own season (winter–spring)
      case 'experiment': return S.experiments - base.experiments > 0 ? 1 : 0;
      case 'tool': return Math.min(1, ((S.toolUse || {})[g.tool] || 0) / g.count);
      case 'photos': return Math.min(1, new Set([...(W.photos || [])].map(k => k.split(':')[0])).size / g.count);
      case 'rescue': return Math.min(1, ((S.rescues || 0) - (base.rescues || 0)) / g.count);
      case 'seeded': return Math.min(1, ((S.seeded || 0) - (base.seeded || 0)) / g.count);
      default: return 0;
    }
  }

  let nextAt = 0;
  function tick() {
    const m = W.simT >= nextAt ? current() : null;
    if (m) {
      start(m);
      m.progress = evalGoal(m);
      if (m.progress >= 0.999) {
        m.done = true;
        W.missionCompleted(m);
        nextAt = W.simT + 10;
      }
    }
    // day & random triggers
    if (W.day !== lastDay) {
      lastDay = W.day;
      for (const e of events) {
        if (e.fired) continue;
        if (e.trigger.type === 'day' && W.day >= e.trigger.day) fire(e, 20);
        else if (e.trigger.type === 'random' && (!e.trigger.season || e.trigger.season === W.season) && W.day >= 3 && Math.random() < e.trigger.chancePerDay * 1.6) fire(e, 30 + Math.random() * 60);
      }
    }
    // dispatch queued events (one at a time, never during a modal/drag)
    if (queue.length && !W.isBusy() && W.simT >= queue[0].at) {
      const { e } = queue.shift();
      if (eventApplicable(e)) W.runEvent(e);
      else {
        e.fired = false;
        // a mission waits for its own event – try again a bit later instead of getting stuck
        const m = e.trigger.type === 'mission' && missions.find(x => x.id === e.trigger.id);
        if (m && m.started && !m.done) fire(e, 30);
      }
    }
  }

  function eventApplicable(e) {
    // skip events that would act on species not present (e.g. a disease of a tree that isn't planted)
    for (const fx of e.start || []) {
      if ((fx.type === 'remove' || fx.type === 'boost') && fx.species && W.countAlive(fx.species) === 0) return false;
      if (fx.type === 'logging' && W.protected) return false;
      if (fx.type === 'road' && W.road) return false;
      if (fx.type === 'treeFall' && !W.plants.some(p => p.isTree && p.alive && p.growth > 0.5 && (fx.target === 'tallest' || p.sp.id === fx.target))) return false;
    }
    return true;
  }

  function list() {
    const out = [];
    const doneList = missions.filter(m => m.done);
    const last = doneList[doneList.length - 1];
    if (last) out.push({ id: last.id, title: last.title, text: last.text, hint: last.hint, progress: 1, done: true });
    const c = current();
    if (c) out.push({ id: c.id, title: c.title, text: c.text, hint: c.hint, progress: c.progress, done: false });
    const next = c && missions.find(m => m.after === c.id);
    if (next) out.push({ id: next.id, title: next.title, text: 'המשימה הבאה תיפתח אחרי שתסיימו את הנוכחית.', hint: '', progress: 0, done: false, locked: true });
    return out;
  }

  // progress of missions that are running but not done yet (the starting counters and the health/survive timers)
  function serializeProgress() {
    const out = {};
    for (const m of missions) {
      if (m.done || !m.started) continue;
      const base = W.stats.missionStart[m.id];
      out[m.id] = { h: +(m.healthT || 0).toFixed(1), base: base || null };
    }
    return out;
  }
  function restoreProgress(P) {
    if (!P) return;
    for (const m of missions) {
      const r = P[m.id]; if (!r || m.done) continue;
      m.healthT = isFinite(r.h) ? r.h : 0;
      if (r.base) W.stats.missionStart[m.id] = r.base;
    }
  }

  return { missions, events, tick, list, current, fire, serializeProgress, restoreProgress, resolve(e) { e.resolved = true; e.resolvedAt = W.simT; }, get doneCount() { return missions.filter(m => m.done).length; } };
}
