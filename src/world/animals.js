// Animal entity + procedural behaviour (ground / arboreal / flying / colony / swarm).
import * as THREE from 'three';
import { makeRng, clamp, damp, lerp } from '../core/util.js';
import { SWIMMERS } from '../sim/species.js';

let UID = 100000;
const _v = new THREE.Vector3(), _w = new THREE.Vector3();
const TAU = Math.PI * 2;
const wrapA = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };

const SPEED = {
  sloth: [0.18, 0.3], chameleon: [0.18, 0.3], hedgehog: [0.45, 0.9], dartfrog: [0.6, 1.4], spinymouse: [0.8, 2.2],
  agouti: [1.0, 3.6], capybara: [0.8, 2.6], tapir: [0.9, 2.8], jaguar: [1.3, 6.5], gazelle: [1.2, 7.5], fox: [1.2, 5.5],
  porcupine: [0.6, 1.5], hyrax: [0.6, 2.4], agama: [0.7, 3], howler: [1.0, 2.8],
};
const FLY = { hummingbird: 5.5, orchidbee: 2.6, honeybee: 2.4, morpho: 2.2, butterfly: 2, toucan: 6, macaw: 7, harpy: 7.5, fruitbat: 5.5, jay: 6, blackbird: 6, owl: 6.5 };

// trunks and shrubs are solid: walking animals steer around them (a short list, rebuilt twice a second per world)
function trunksOf(W) {
  const now = performance.now();
  if (W._trunks && now - W._trunksT < 500) return W._trunks;
  const out = [];
  for (const p of W.plants) {
    if (!p.alive || p.removed || p.falling || p.fallen || p.dying || p.host) continue;
    const k = p.sp.kind;
    let r = 0;
    if (k === 'tree' || k === 'palm') r = Math.min(1.2, Math.max(0.14, (p.vis.trunkRadius || 0.4) * (0.35 + 0.65 * p.growth)));
    else if (k === 'shrub' && p.growth > 0.35) r = 0.18 + 0.32 * p.growth;
    if (r) out.push({ x: p.x, z: p.z, r, p });
  }
  W._trunks = out; W._trunksT = now; return out;
}

export function visScale(len) { return 1.35 * Math.pow(Math.max(1, 0.9 / Math.max(0.05, len || 1)), 0.6); }

export class Animal {
  constructor(world, sp, pos, { seed = (Math.random() * 1e9) | 0, baby = false } = {}) {
    this.world = world; this.sp = sp; this.uid = ++UID; this.isAnimal = true; this.alive = true; this.removed = false;
    this.rng = makeRng(seed);
    this.vis = world.animalBuilders[sp.id]({ seed, rng: makeRng(seed) });
    this.type = this.vis.type || 'animal';
    this.obj = this.vis.object; this.obj.userData.entity = this;
    this.obj.rotation.order = 'YXZ';
    this.loco = this.type === 'colony' ? 'colony' : this.type === 'swarm' ? 'swarm' : (sp.locomotion || 'ground');
    this.len = this.vis.length || 1;
    this.baseScale = this.type === 'animal' ? visScale(this.len) : 1.25;
    this.grow = baby ? 0.6 : 1; this.pop = 0; this.leaving = 0;
    this.pos = pos.clone(); this.heading = this.rng() * TAU; this.bank = 0;
    this.energy = 0.72 + this.rng() * 0.18;
    this.state = 'idle'; this.timer = 0.5 + this.rng() * 2; this.action = this.loco === 'flying' ? 'perch' : 'idle'; this.speed = 0;
    this.home = pos.clone();
    this.range = this.loco === 'flying' ? 34 : this.loco === 'arboreal' ? 20 : this.len > 1.4 ? 22 : 12;
    this.perch = null; this.path = null; this.goal = null; this.food = null; this.carrying = null; this.prey = null;
    this.eatCD = 0; this.hungryT = 0; this.trailT = 0; this.flee = 0;
    const vs = this.vis.speeds || {};   // a model may say how fast its species moves (the reef's urchins and starfish crawl)
    const [w, r] = SPEED[sp.id] || (vs.walk ? [vs.walk, vs.run || vs.walk * 2] : [Math.min(1.4, 0.5 + this.len * 0.5), Math.min(5, 1.5 + this.len * 1.8)]);
    this.walkSpeed = w; this.runSpeed = r; this.flySpeed = FLY[sp.id] || vs.fly || 4;
    if (this.loco === 'colony') { this.pos.y = world.env.heightAt(pos.x, pos.z); this.obj.position.copy(this.pos); this.retargetColony(); }
    if (this.loco === 'swarm') { this.pos.y = world.env.heightAt(pos.x, pos.z) + 0.8; this.obj.position.copy(this.pos); }
    if (this.loco === 'arboreal') this.tryPerchNearest();
    if (this.loco === 'flying') { this.pos.y = Math.max(this.pos.y, world.env.heightAt(pos.x, pos.z) + 3); this.state = 'idle'; this.action = 'hover'; this.timer = 0.2; }
    if (sp.swims && world.env.surfaceY != null) this.pos.y = Math.min(this.pos.y, world.env.surfaceY - 1.5);   // a fish starts under the surface
    if (this.loco === 'ground' || this.loco === 'water') this.pos.y = this.groundY(pos.x, pos.z);
    this.obj.position.copy(this.pos); this.obj.scale.setScalar(0.001);
  }

  get visible() { return this.alive && !this.removed; }
  isActive() {
    const W = this.world, a = this.sp.active || 'day';
    if (this.sp.seasons?.dormant?.includes(W.season)) return false;
    if (a === 'night') return W.nightGlow > 0.45;
    if (a === 'day') return W.nightGlow < 0.6;
    return true;
  }
  focusPoint(out) { return out.copy(this.obj.position).add(_w.set(0, (this.vis.height || 0.5) * this.obj.scale.y * 0.6, 0)); }

  // ───────────────────────────── helpers
  groundY(x, z) {
    const env = this.world.env, h = env.heightAt(x, z);
    const b = env.bridgeAt ? env.bridgeAt(x, z) : null;
    return b !== null && b > h ? b : h;
  }
  // the tree it is heading for (to climb it or eat from it) is not in its way
  ownTree() { const g = this.food?.entity || this.perch?.plant || this.goal?.plant; return g && g.isPlant ? g : null; }
  bodyR() { return Math.min(0.45, Math.max(0.08, this.len * (this.obj.scale.x || 1) * 0.22)); }
  // the heading toward the target, turned aside when a trunk stands in the way (whichever side is shorter)
  steerAround(h, dist) {
    if (this.loco === 'flying' || this.type !== 'animal') return h;
    const T = trunksOf(this.world), own = this.ownTree(), br = this.bodyR();
    const fx = Math.sin(h), fz = Math.cos(h), px = this.pos.x, pz = this.pos.z;
    let best = null, bd = Math.min(dist, 2.6);
    for (const t of T) {
      if (t.p === own) continue;
      const rx = t.x - px, rz = t.z - pz, along = rx * fx + rz * fz;
      if (along < -0.1 || along > bd) continue;
      const lat = rx * fz - rz * fx, R = t.r + br + 0.12;
      if (Math.abs(lat) < R) { bd = along; best = { t, lat, R }; }
    }
    if (!best) return h;
    const dc = Math.hypot(best.t.x - px, best.t.z - pz);
    const turn = Math.asin(Math.min(1, best.R / Math.max(best.R, dc))) + 0.12;   // just enough to pass beside it
    return h + (best.lat > 0 ? -turn : turn);
  }
  // never inside a trunk: a step that ended inside one is pushed back to its edge
  pushOutOfTrunks() {
    if (this.loco === 'flying' || this.type !== 'animal') return;
    const own = this.ownTree(), br = this.bodyR();
    for (const t of trunksOf(this.world)) {
      if (t.p === own) continue;
      const rx = this.pos.x - t.x, rz = this.pos.z - t.z, d = Math.hypot(rx, rz), R = t.r + br;
      if (d < R) { if (d < 1e-4) { this.pos.x += R; continue; } this.pos.x = t.x + rx / d * R; this.pos.z = t.z + rz / d * R; }
    }
  }
  canStand(x, z) {
    const env = this.world.env;
    if (Math.hypot(x, z) > env.radius + 1) return false;
    if (env.isWater(x, z) && !SWIMMERS.has(this.sp.id) && !(env.bridgeAt && env.bridgeAt(x, z) !== null)) return false;
    if (this.loco !== 'flying' && this.world.blockedByRoad && this.world.blockedByRoad(x, z, this.pos)) return false;
    return true;
  }
  randomGroundPoint(center, rad) {
    for (let i = 0; i < 12; i++) {
      const a = this.rng() * TAU, r = Math.sqrt(this.rng()) * rad;
      const x = center.x + Math.cos(a) * r, z = center.z + Math.sin(a) * r;
      if (this.canStand(x, z) && (!this.sp.needs?.rocks || this.world.nearRock(x, z, 4))) return _v.set(x, this.groundY(x, z), z).clone();
    }
    return null;
  }
  perchWorld(plant, idx, out) {
    const pts = plant.vis.perchPoints();
    if (!pts.length) return null;
    plant.obj.updateMatrixWorld();
    return out.copy(pts[idx % pts.length]).applyMatrix4(plant.obj.matrixWorld);
  }
  perchYOffset(pose) {
    const s = this.obj.scale.y;
    if (this.vis.gripY && this.vis.gripY[pose] !== undefined) return -this.vis.gripY[pose] * s;
    if (this.vis.perchOffset) return this.vis.perchOffset * s;
    return 0;
  }
  tryPerchNearest() {
    const t = this.world.nearestPerchTree(this.pos, 30, this);
    if (t) { const idx = (this.rng() * 50) | 0; const p = this.perchWorld(t, idx, new THREE.Vector3()); if (p) { this.perch = { plant: t, idx }; this.pos.copy(p); this.state = 'perch'; this.timer = 2 + this.rng() * 5; return true; } }
    return false;
  }

  startFlight(to, { arc = null, onArrive = null, speed = null } = {}) {
    const p0 = this.pos.clone(), p1 = to.clone();
    const d = p0.distanceTo(p1);
    const c = p0.clone().lerp(p1, 0.5); c.y = Math.max(p0.y, p1.y) + (arc ?? Math.min(10, 1.5 + d * 0.3));
    if (this.sp.swims) {   // a fish swims under the surface and above the sea floor, in gentle curves
      const env = this.world.env, top = (env.surfaceY ?? 1e9) - 1.2;
      p1.y = Math.min(top, Math.max(env.heightAt(p1.x, p1.z) + 0.5, p1.y));
      c.y = Math.min(top, Math.max(p0.y, p1.y) + Math.min(2.5, 0.4 + d * 0.08));
    }
    this.path = { p0, p1, c, t: 0, dur: Math.max(0.6, (d * 1.15) / (speed || this.flySpeed)), onArrive };
    this.perch = null; this.state = 'fly';
  }
  startWalk(to, { run = false, onArrive = null } = {}) {
    // a river in the way: walk to the nearest fallen log, over it, then on to the goal
    const env = this.world.env;
    let via = [];
    if (this.loco !== 'flying' && !SWIMMERS.has(this.sp.id) && env.walkRoute) via = env.walkRoute(this.pos.x, this.pos.z, to.x, to.z).map(q => new THREE.Vector3(q.x, 0, q.z));
    via.push(to.clone());
    this.goal = { p: via.shift(), via, run, onArrive }; this.state = 'walk'; this.perch = null;
  }

  // ───────────────────────────── decisions
  think() {
    const W = this.world;
    if (!this.alive || this.removed) return;
    if (this.loco === 'colony' || this.loco === 'swarm') return;
    const active = this.isActive();
    // flee from fire
    if (W.fires.length && W.fireNear(this.pos.x, this.pos.z, 10)) {
      const away = _v.set(this.pos.x, 0, this.pos.z).normalize().multiplyScalar(-1);
      const f = W.fires[0]; away.set(this.pos.x - f.x, 0, this.pos.z - f.z).normalize();
      const dest = this.pos.clone().addScaledVector(away, 14); dest.x = clamp(dest.x, -34, 34); dest.z = clamp(dest.z, -34, 34);
      if (this.loco === 'flying') { dest.y = W.env.heightAt(dest.x, dest.z) + 8; this.startFlight(dest); }
      else { const p = this.randomGroundPoint(dest, 4) || dest; this.startWalk(p, { run: true }); }
      this.timer = 3; return;
    }
    if (!active && !this.touring) { this.goSleep(); return; }   // the animal the child tours with stays awake (src/game/tour.js)
    if (this.sp.disperses?.length && !this.carrying && this.eatCD <= 0 && this.rng() < 0.6) {
      const f = W.findDisperseFood(this);
      if (f) { this.goEat(f); return; }
    }
    const hungry = this.energy < 0.72 && this.eatCD <= 0;
    if (hungry) {
      const f = W.findFood(this);
      if (f) { this.goEat(f); return; }
      this.hungryT += 1;
      // generalist foraging: its food plants exist but are out of season (no fruit / flowers right now)
      if (this.sp.diet2.some(e => W.countAlive(e.to) > 0) && this.rng() < 0.6) { this.forage(); return; }
    }
    this.wander();
  }

  goSleep() {
    const W = this.world;
    if (this.loco === 'flying') {
      if (this.perch && (this.state === 'perch' || this.state === 'sleep')) { this.state = 'sleep'; this.timer = 6 + this.rng() * 6; return; }
      const t = W.nearestPerchTree(this.pos, 40, this);
      if (t) { const idx = (this.rng() * 50) | 0; const p = this.perchWorld(t, idx, new THREE.Vector3()); if (p) { this.startFlight(p, { onArrive: () => { this.perch = { plant: t, idx }; this.state = 'sleep'; this.timer = 8; } }); return; } }
      const g = this.randomGroundPoint(this.home, 6); if (g) { this.startFlight(g.add(_w.set(0, 0.3, 0)), { onArrive: () => { this.state = 'sleep'; this.timer = 8; } }); return; }
    }
    if (this.loco === 'arboreal') { if (!this.perch) this.tryPerchNearest(); this.state = 'sleep'; this.timer = 8 + this.rng() * 6; return; }
    this.state = 'sleep'; this.timer = 8 + this.rng() * 8;
  }

  goEat(f) {
    const W = this.world; this.food = f;
    const e = f.entity;
    const done = () => this.arriveFood();
    if (f.entity.isAnimal) {
      const env = this.world.env;
      const via = this.loco !== 'flying' && !SWIMMERS.has(this.sp.id) && env.walkRoute ? env.walkRoute(this.pos.x, this.pos.z, e.pos.x, e.pos.z) : [];
      if (via.length) {   // prey across the river: cross on the log, then start the chase from the far bank
        const end = via[via.length - 1];
        this.startWalk(new THREE.Vector3(end.x, this.groundY(end.x, end.z), end.z), { onArrive: () => { if (e.alive && !e.removed && !e.leaving) { this.prey = e; this.state = 'hunt'; this.timer = 14; } } });
        return;
      }
      this.prey = e; this.state = 'hunt'; this.timer = 14; return;
    }
    if (this.loco === 'flying') {
      let p;
      if (f.part === 'nectar' || this.sp.isInsect || !e.vis.perchPoints().length) {
        const c = e.vis.crown(); const s = e.obj.scale.x;
        const a = this.rng() * TAU, r = c.radius * s * 0.55 * this.rng();
        p = new THREE.Vector3(e.x + Math.cos(a) * r, e.y + (c.bottom + (c.top - c.bottom) * (0.6 + this.rng() * 0.4)) * s + 0.3, e.z + Math.sin(a) * r);
        this.startFlight(p, { onArrive: () => { this.state = 'eat'; this.action = (f.part === 'nectar' && !this.sp.id.match(/morpho|butterfly/)) ? 'hover' : 'perch'; this.timer = 3 + this.rng() * 2; done(); } });
      } else {
        const idx = (this.rng() * 50) | 0; p = this.perchWorld(e, idx, new THREE.Vector3());
        this.startFlight(p, { onArrive: () => { this.perch = { plant: e, idx }; this.state = 'eat'; this.timer = 4 + this.rng() * 2; done(); } });
      }
      return;
    }
    if (this.loco === 'arboreal' && e.vis.perchPoints().length) {
      const idx = (this.rng() * 50) | 0; const p = this.perchWorld(e, idx, new THREE.Vector3());
      const fromP = this.pos.clone();
      this.path = { p0: fromP, p1: p, c: fromP.clone().lerp(p, 0.5).add(_w.set(0, this.sp.id === 'sloth' ? 0 : 3, 0)), t: 0, dur: Math.max(1, fromP.distanceTo(p) / (this.sp.id === 'sloth' ? 0.5 : 4)), onArrive: () => { this.perch = { plant: e, idx }; this.state = 'eat'; this.timer = 5; done(); } };
      this.state = 'climb'; this.perch = null; return;
    }
    // ground: walk to the plant's base edge
    const a = Math.atan2(this.pos.z - e.z, this.pos.x - e.x);
    const rr = (e.vis.trunkRadius || 0.3) * (e.isTree ? 1 : 0.5) + 0.6 + this.len * 0.3;
    let p = new THREE.Vector3(e.x + Math.cos(a) * rr, 0, e.z + Math.sin(a) * rr);
    if (!this.canStand(p.x, p.z)) p = this.randomGroundPoint(new THREE.Vector3(e.x, 0, e.z), 3) || p;
    p.y = this.groundY(p.x, p.z);
    this.startWalk(p, { onArrive: () => { this.state = 'eat'; this.timer = 4 + this.rng() * 3; done(); } });
  }

  arriveFood() {
    const f = this.food; if (!f) return;
    const W = this.world, e = f.entity;
    if (!e.alive || e.removed) { this.food = null; return; }
    const amt = e.foodAmount(f.part);
    this.energy = clamp(this.energy + 0.3 + Math.min(0.3, amt * 0.35), 0, 1);
    this.eatCD = (this.sp.disperses?.length ? 3 : 6) + this.rng() * 5; this.hungryT = 0;
    if (f.part === 'leaves') e.damage(this.len > 1.5 ? 0.035 : 0.015);
    if (f.part === 'fruit' || f.part === 'seeds') e.fruit = Math.max(0, e.fruit - 0.12);
    if (f.part === 'nectar') { e.bloom = Math.max(0, e.bloom - 0.03); }
    W.onFed(this, e, f);
    if (e.isPlant && e.sp.dispersers.includes(this.sp.id)) this.carrying = { sp: e.sp, x: e.x, z: e.z, t: 0 };
    this.food = null;
  }

  wander() {
    const W = this.world;
    // on tour it roams on from where it is: no flying home, no long rest by a coral (it looked stuck)
    const home = this.touring ? this.pos : this.home;
    if (this.loco === 'flying') {
      // perch for a while, then fly to a random tree / flower / ground
      if (this.state === 'perch' && this.timer > 0) return;
      const r = this.touring && this.sp.swims ? 1 : this.rng();
      if (r < 0.65) {
        const t = W.randomPerchPlant(home, this.range, this);
        if (t) {
          if (this.sp.isInsect || this.sp.id === 'hummingbird') {
            const c = t.vis.crown(); const s = t.obj.scale.x; const a = this.rng() * TAU;
            const p = new THREE.Vector3(t.x + Math.cos(a) * c.radius * s * 0.5, t.y + c.top * s * (0.7 + this.rng() * 0.3) + 0.2, t.z + Math.sin(a) * c.radius * s * 0.5);
            this.startFlight(p, { arc: 1.5, onArrive: () => { this.state = 'perch'; this.action = this.sp.id === 'hummingbird' ? 'hover' : 'perch'; this.timer = 2 + this.rng() * 4; this.dropSeed(); } });
          } else {
            const idx = (this.rng() * 50) | 0; const p = this.perchWorld(t, idx, new THREE.Vector3());
            if (p) { this.startFlight(p, { onArrive: () => { this.perch = { plant: t, idx }; this.state = 'perch'; this.timer = 3 + this.rng() * 6; this.dropSeed(); } }); return; }
          }
          return;
        }
      }
      if (r < 0.85 && !this.sp.isInsect && this.sp.id !== 'hummingbird' && this.sp.id !== 'fruitbat') {
        const g = this.randomGroundPoint(home, this.range * 0.6);
        if (g) { this.startFlight(g, { onArrive: () => { this.state = 'perch'; this.timer = 2 + this.rng() * 4; this.onGround = true; this.dropSeed(); } }); return; }
      }
      const a = this.rng() * TAU, rr = this.touring ? 4 + this.rng() * 10 : this.rng() * this.range;
      const x = clamp(home.x + Math.cos(a) * rr, -34, 34), z = clamp(home.z + Math.sin(a) * rr, -34, 34);
      const p = new THREE.Vector3(x, W.env.heightAt(x, z) + (this.sp.isInsect ? 1.5 + this.rng() * 2 : 6 + this.rng() * 14), z);
      this.startFlight(p, { onArrive: () => { this.state = 'idle'; this.action = this.sp.isInsect || this.sp.id === 'hummingbird' ? 'hover' : 'glide'; this.timer = 0.3; } });
      return;
    }
    if (this.loco === 'arboreal') {
      if (this.perch && this.rng() < 0.55) { this.state = 'perch'; this.timer = 3 + this.rng() * 6; return; }
      const t = W.randomPerchPlant(this.perch ? this.pos : home, this.sp.id === 'sloth' ? 9 : 16, this, true);
      if (t) {
        const idx = (this.rng() * 50) | 0; const p = this.perchWorld(t, idx, new THREE.Vector3());
        if (p) {
          const fromP = this.pos.clone(); const sl = this.sp.id === 'sloth' || this.sp.id === 'chameleon';
          this.path = { p0: fromP, p1: p, c: fromP.clone().lerp(p, 0.5).add(_w.set(0, sl ? 0 : 2.5, 0)), t: 0, dur: Math.max(1, fromP.distanceTo(p) / (sl ? 0.35 : 4)), onArrive: () => { this.perch = { plant: t, idx }; this.state = 'perch'; this.timer = 4 + this.rng() * 6; this.dropSeed(); } };
          this.state = 'climb'; this.perch = null; return;
        }
      }
      if (!this.perch) { const g = this.randomGroundPoint(this.pos, 6); if (g) { this.startWalk(g); return; } }
      this.state = 'perch'; this.timer = 4; return;
    }
    // ground
    if (this.rng() < 0.45) { this.state = 'idle'; this.timer = 2 + this.rng() * 5; return; }
    const g = this.randomGroundPoint(home, this.touring ? 8 : this.range);
    if (g) this.startWalk(g, { onArrive: () => { this.state = 'idle'; this.timer = 1 + this.rng() * 3; this.dropSeed(); } });
    else { this.state = 'idle'; this.timer = 3; }
  }

  forage() {
    const W = this.world;
    const done = () => { this.energy = clamp(this.energy + 0.12 + 0.12 * W.vitality, 0, 1); this.eatCD = 8; };
    if (this.loco === 'flying') { const g = this.randomGroundPoint(this.touring ? this.pos : this.home, this.range * 0.5); if (g) { this.startFlight(this.sp.isInsect ? g.add(_w.set(0, 0.6, 0)) : g, { onArrive: () => { this.state = 'eat'; this.onGround = true; this.timer = 3; done(); } }); return; } }
    else if (this.loco === 'arboreal' && this.perch) { this.state = 'eat'; this.timer = 4; done(); return; }
    else { const g = this.randomGroundPoint(this.pos, 6); if (g) { this.startWalk(g, { onArrive: () => { this.state = 'eat'; this.timer = 3; done(); } }); return; } }
    this.state = 'idle'; this.timer = 2;
  }

  dropSeed() {
    const c = this.carrying; if (!c) return;
    if (c.t < 3) return;
    if (Math.hypot(this.pos.x - c.x, this.pos.z - c.z) < 5) return;
    if (this.rng() < 0.85) { this.world.disperseSeed(this, c.sp, this.pos.x, this.pos.z); this.carrying = null; }
  }

  retargetColony() {
    const W = this.world;
    const f = W.findFood(this, 22);
    const nest = this.pos;
    let tx, tz;
    if (f) { const e = f.entity; const a = Math.atan2(nest.z - e.z, nest.x - e.x); tx = e.x + Math.cos(a) * 0.8; tz = e.z + Math.sin(a) * 0.8; this.food = f; }
    else { const a = this.rng() * TAU; tx = nest.x + Math.cos(a) * 6; tz = nest.z + Math.sin(a) * 6; this.food = null; }
    const pts = [];
    const n = 7; const perp = Math.atan2(tz - nest.z, tx - nest.x) + Math.PI / 2; const bend = (this.rng() - 0.5) * 2.5;
    for (let i = 0; i <= n; i++) {
      const u = i / n; let x = lerp(nest.x, tx, u), z = lerp(nest.z, tz, u);
      const b = Math.sin(u * Math.PI) * bend; x += Math.cos(perp) * b; z += Math.sin(perp) * b;
      pts.push(new THREE.Vector3(x, W.env.heightAt(x, z) + 0.03, z));
    }
    this.vis.setTrail(pts);
  }

  // ───────────────────────────── per-frame update (sim dt may be 0 when paused)
  update(dt, rdt, t) {
    const W = this.world;
    if (!this.alive) return;
    // spawn / leave animations
    if (this.pop < 1) this.pop = Math.min(1, this.pop + rdt * 2);
    if (this.grow < 1) this.grow = Math.min(1, this.grow + dt / 70);
    let sc = this.baseScale * this.grow * (this.pop < 1 ? Math.min(1, this.pop * 1.6) * (1 + Math.sin(this.pop * Math.PI) * 0.2) : 1);
    if (this.leaving) { this.leaving += rdt; sc *= Math.max(0.001, 1 - this.leaving / 1.4); if (this.leaving > 1.4) { this.alive = false; W.removeEntity(this); return; } }
    this.obj.scale.setScalar(Math.max(0.001, sc));
    const night = W.nightGlow;
    if (this.loco === 'colony') {
      this.trailT -= dt; if (this.trailT <= 0) { this.trailT = 18 + this.rng() * 10; this.retargetColony(); }
      if (this.sp.disperses?.length && this.isActive()) {
        this.seedT = (this.seedT ?? 10) - dt;
        if (this.seedT <= 0) {
          this.seedT = 14 + this.rng() * 10;
          const src = W.plants.find(p => this.sp.disperses.includes(p.sp.id) && p.alive && !p.removed && p.growth > 0.5 && Math.hypot(p.x - this.pos.x, p.z - this.pos.z) < 26);
          if (src && this.rng() < 0.7) { const a = this.rng() * TAU, r = 1.5 + this.rng() * 3; W.disperseSeed(this, src.sp, this.pos.x + Math.cos(a) * r, this.pos.z + Math.sin(a) * r, src); }
        }
      }
      const act = this.isActive() ? (this.food ? 1 : 0.35) : 0.12;
      this.vis.update(dt > 0 ? rdt : 0, { t, night, activity: act });
      return;
    }
    if (this.loco === 'swarm') {
      const a = this.isActive() ? 1 : 0;
      this.vis.update(dt > 0 ? rdt : 0, { t, night, activity: a });
      return;
    }
    if (dt <= 0) { this.vis.update(0, { action: this.action, speed: 0, t, night }); return; }
    this.carrying && (this.carrying.t += dt, this.carrying.t > 120 && (this.carrying = null));
    this.eatCD -= dt;
    // timers
    this.timer -= dt;
    let speed = 0;
    const st = this.state;
    // a steering hook (the animal-eye tour): it moves the animal itself and returns its speed
    if (this.driver) speed = this.driver(dt, rdt) || 0;
    else if (st === 'fly' || st === 'climb') {
      const p = this.path;
      if (!p) { this.state = 'idle'; }
      else {
        p.t += dt / p.dur; const u = Math.min(1, p.t), iu = 1 - u;
        const nx = iu * iu * p.p0.x + 2 * iu * u * p.c.x + u * u * p.p1.x;
        const ny = iu * iu * p.p0.y + 2 * iu * u * p.c.y + u * u * p.p1.y;
        const nz = iu * iu * p.p0.z + 2 * iu * u * p.c.z + u * u * p.p1.z;
        const dx = nx - this.pos.x, dz = nz - this.pos.z;
        const stepLen = Math.hypot(dx, ny - this.pos.y, dz);
        speed = stepLen / Math.max(dt, 1e-4);
        if (Math.hypot(dx, dz) > 1e-4) { const h = Math.atan2(dx, dz); const dh = wrapA(h - this.heading); this.heading += dh * Math.min(1, dt * 6); this.bank = damp(this.bank, clamp(-dh * 2.5, -0.5, 0.5), 4, dt); }
        this.pos.set(nx, ny, nz);
        if (st === 'fly') this.action = this.sp.isInsect || this.sp.id === 'hummingbird' ? (u > 0.85 ? 'hover' : 'fly') : (ny < p.p0.y && u > 0.4 && u < 0.85 ? 'glide' : 'fly');
        else this.action = this.sp.id === 'sloth' ? 'climb' : (u < 0.15 || u > 0.85 ? 'climb' : 'run');
        if (u >= 1) { this.path = null; this.state = 'idle'; this.timer = 0.5; const cb = p.onArrive; if (cb) cb(); }
      }
    } else if (st === 'walk' || st === 'hunt' || st === 'flee') {
      let target, run = false;
      if (st === 'hunt') {
        const pr = this.prey;
        if (!pr || !pr.alive || pr.removed || this.timer <= 0) { this.prey = null; this.state = 'idle'; this.timer = 2; this.eatCD = 10; }
        else {
          target = pr.obj.position; run = true;
          const d = Math.hypot(target.x - this.pos.x, target.z - this.pos.z) + (this.loco === 'flying' ? Math.abs(target.y - this.pos.y) * 0.5 : 0);
          if (d < 1.2 + this.len * 0.4) { W.tryCatch(this, pr); this.prey = null; this.state = 'eat'; this.timer = 4; }
        }
      } else if (this.goal) { target = this.goal.p; run = this.goal.run || st === 'flee'; }
      if (target && this.state !== 'eat') {
        if (this.loco === 'flying') {
          // swoop toward the prey
          const dir = _v.subVectors(target, this.pos); const d = dir.length();
          if (d > 0.01) { dir.multiplyScalar(1 / d); const sp = this.flySpeed * 1.2; this.pos.addScaledVector(dir, Math.min(d, sp * dt)); speed = sp; const h = Math.atan2(dir.x, dir.z); this.heading += wrapA(h - this.heading) * Math.min(1, dt * 5); }
          this.action = 'fly';
        } else {
          const dx = target.x - this.pos.x, dz = target.z - this.pos.z; const d = Math.hypot(dx, dz);
          if (d < 0.35 && st === 'walk' && this.goal?.via?.length) { this.goal.p = this.goal.via.shift(); }
          else if (d < 0.35) { if (st === 'walk') { const cb = this.goal?.onArrive; this.goal = null; this.state = 'idle'; this.timer = 1 + this.rng() * 2; if (cb) cb(); } }
          else {
            const h = this.steerAround(Math.atan2(dx, dz), d); const dh = wrapA(h - this.heading);
            this.heading += dh * Math.min(1, dt * 4);
            const sp = (run ? this.runSpeed : this.walkSpeed) * (Math.abs(dh) > 1.2 ? 0.35 : 1);
            const nx = this.pos.x + Math.sin(this.heading) * sp * dt, nz = this.pos.z + Math.cos(this.heading) * sp * dt;
            if (this.canStand(nx, nz)) { this.pos.x = nx; this.pos.z = nz; speed = sp; this.pushOutOfTrunks(); }
            else {
              // still turning (e.g. onto a log): step straight at the target instead of along the current heading
              const s2 = Math.min(d, this.walkSpeed * dt), qx = this.pos.x + dx / d * s2, qz = this.pos.z + dz / d * s2;
              if (this.canStand(qx, qz)) { this.pos.x = qx; this.pos.z = qz; this.heading = h; speed = s2 / dt; }
              // slide along the water's edge (x only, then z only) before giving up
              else if (Math.abs(dx) > 0.05 && this.canStand(this.pos.x + Math.sign(dx) * s2, this.pos.z)) { this.pos.x += Math.sign(dx) * s2; speed = s2 / dt; }
              else if (Math.abs(dz) > 0.05 && this.canStand(this.pos.x, this.pos.z + Math.sign(dz) * s2)) { this.pos.z += Math.sign(dz) * s2; speed = s2 / dt; }
              else {
                // really blocked: give up on this target for a while so the animal does not walk back to the same bank
                if (st === 'hunt' || this.food) { this.prey = null; this.food = null; this.eatCD = Math.max(this.eatCD, 8 + this.rng() * 4); }
                this.goal = null; this.state = 'idle'; this.timer = 0.5;
              }
            }
          }
        }
      }
    } else if (this.timer <= 0 && (st === 'idle' || st === 'perch' || st === 'eat' || st === 'sleep')) {
      if (st === 'sleep' && !this.isActive() && !this.touring && !(W.fires.length && W.fireNear(this.pos.x, this.pos.z, 10))) this.timer = 4 + this.rng() * 4;
      else this.think();
    }
    // flee if threatened (ground prey)
    if (this.loco === 'ground' && !this.driver && st !== 'flee' && st !== 'hunt' && this.rng() < dt * 2) {
      const th = W.threatNear(this, 6);
      if (th) { const a = Math.atan2(this.pos.x - th.pos.x, this.pos.z - th.pos.z); const p = new THREE.Vector3(this.pos.x + Math.sin(a) * 8, 0, this.pos.z + Math.cos(a) * 8); if (this.canStand(p.x, p.z)) { p.y = this.groundY(p.x, p.z); this.goal = { p, run: true }; this.state = 'flee'; this.timer = 3; } }
    }
    if (st === 'flee' && this.timer <= 0) { this.state = 'idle'; this.timer = 1; }
    // keep perched on (possibly growing/swaying) trees
    if (this.perch && (this.state === 'perch' || this.state === 'sleep' || this.state === 'eat' || this.state === 'idle')) {
      const pl = this.perch.plant;
      if (!pl.alive || pl.falling || pl.removed) { this.perch = null; if (this.loco === 'flying') { this.state = 'idle'; this.timer = 0; } else { this.state = 'idle'; this.timer = 0; this.pos.y = this.groundY(this.pos.x, this.pos.z); } }
      else if (((t * 3 + this.uid) % 3) < dt * 3) { const p = this.perchWorld(pl, this.perch.idx, _w); if (p) this.pos.copy(p); }
    }
    // pose / action
    const loco = this.loco;
    if (!(st === 'fly' || st === 'climb' || st === 'walk' || st === 'hunt' || st === 'flee')) {
      if (st === 'sleep') this.action = this.sp.id === 'fruitbat' ? 'hang' : this.sp.id === 'sloth' ? 'hang' : 'sleep';
      else if (st === 'eat') this.action = (loco === 'flying' && (this.sp.isInsect || this.sp.id === 'hummingbird')) ? 'hover' : this.sp.id === 'sloth' ? 'hang' : 'eat';
      else if (loco === 'flying') this.action = this.perch ? (this.sp.id === 'fruitbat' ? 'hang' : 'perch') : (this.onGround ? 'idle' : (this.sp.isInsect || this.sp.id === 'hummingbird' ? 'hover' : this.action === 'glide' ? 'glide' : 'hover'));
      else if (loco === 'arboreal') this.action = this.perch ? (this.sp.id === 'sloth' ? 'hang' : 'perch') : 'idle';
      else this.action = 'idle';
    } else if (st === 'walk' || st === 'hunt' || st === 'flee') {
      if (loco !== 'flying') this.action = speed > this.walkSpeed * 1.5 ? 'run' : speed > 0.01 ? 'walk' : 'idle';
    }
    if (this.state === 'fly' || this.state === 'climb') this.onGround = false;
    // vertical placement
    let y = this.pos.y;
    if (loco === 'ground' || (loco === 'arboreal' && !this.perch && this.state !== 'climb') || (loco === 'water')) {
      const env = W.env;
      if (SWIMMERS.has(this.sp.id) && env.isWater(this.pos.x, this.pos.z) && env.waterLevel != null) { y = env.waterLevel - 0.35 * this.obj.scale.y * (this.vis.height || 0.5); if (this.action === 'walk' || this.action === 'run' || this.action === 'idle') this.action = 'swim'; }
      else y = this.groundY(this.pos.x, this.pos.z);
      this.pos.y = y;
    }
    let oy = y;
    if (this.perch && (this.state !== 'fly' && this.state !== 'climb')) oy = y + this.perchYOffset(this.action === 'hang' ? 'hang' : 'perch');
    if (this.action === 'hover' && this.state !== 'fly') oy += Math.sin(t * 3 + this.uid) * 0.08;
    this.obj.position.set(this.pos.x, oy, this.pos.z);
    this.obj.rotation.y = this.heading;
    this.obj.rotation.z = loco === 'flying' ? this.bank : 0;
    this.speed = speed;
    this.vis.update(rdt, { action: this.action, speed: speed / Math.max(0.3, this.obj.scale.y), t, night, alarm: this.state === 'flee' });
    // energy
    const active = this.isActive();
    const pred = this.sp.diet2.some(e => e.part === 'animals');
    const drain = (this.state === 'sleep' ? 0.0013 : pred ? 0.0022 : 0.0034) * (this.sp.diet2.length ? 1 : 0.2) * (W.thirstK ? W.thirstK(this) : 1);   // 1.4: thirst far from water
    this.energy = clamp(this.energy - drain * dt, 0, 1);
    if (!this.sp.diet2.length) this.energy = Math.max(this.energy, 0.6);
    if (this.sp.roams) this.energy = Math.max(this.energy, 0.3);   // a roaming hunter (the reef shark) also feeds beyond the reef edge: it does not leave hungry
    else if (this.energy <= 0.001) W.animalLeaves(this, 'hunger');
  }

  leave() { if (!this.leaving) this.leaving = 0.0001; }
}
