// Plant entity: wraps a PlantVisual with ecological state (growth, health, light, bloom, fruit).
import * as THREE from 'three';
import { makeRng, clamp, damp, lerp } from '../core/util.js';
import { GEOPHYTES } from '../sim/species.js';

let UID = 0;
const GROW_TIME = { fast: 85, medium: 150, slow: 235 };   // +12%: time to notice and act
const _v = new THREE.Vector3();

export class Plant {
  constructor(world, sp, x, z, { growth = null, host = null, attachIdx = 0, seed = (Math.random() * 1e9) | 0 } = {}) {
    this.world = world; this.sp = sp; this.uid = ++UID; this.isPlant = true; this.alive = true;
    this.seed = seed; const rng = makeRng(seed); this.rng = rng;
    this.host = host; this.attachIdx = attachIdx;
    const env = world.env;
    const opts = { seed, rng };
    if (sp.id === 'liana' && host) {
      const c = host.vis.crown();
      opts.hostHeight = Math.max(5, c.bottom + (c.top - c.bottom) * 0.35);
      opts.hostRadius = Math.max(0.15, (host.vis.trunkRadius || 0.5) * (0.35 + 0.65 * host.growth));
    }
    this.vis = world.plantBuilders[sp.id](opts);
    this.obj = this.vis.object;
    this.obj.userData.entity = this;
    this.x = x; this.z = z;
    if (sp.kind === 'water-plant') this.y = (env.waterLevel ?? env.heightAt(x, z)) + 0.02;
    else if (host && sp.id === 'liana') { this.x = host.x; this.z = host.z; this.y = host.y; }
    else this.y = env.heightAt(x, z) - 0.05;
    this.obj.position.set(this.x, this.y, this.z);
    this.obj.rotation.y = rng() * Math.PI * 2;
    const defG = sp.kind === 'tree' || sp.kind === 'palm' ? 0.06 : sp.kind === 'shrub' ? 0.15 : sp.kind === 'fungus' ? 0.6 : sp.kind === 'epiphyte' ? 0.45 : sp.kind === 'vine' ? 0.1 : 0.3;
    this.growth = growth ?? defG;
    this.health = 1; this.light = 1; this.bloom = 0; this.fruit = 0; this.age = 0;
    this.pollinated = false; this.phase = rng() * 150; this.dying = 0; this.falling = null; this.fallen = false;
    this.seedTimer = 15 + rng() * 20; this.removed = false; this.burn = 0;
    const kindK = sp.kind === 'herb' || sp.kind === 'fungus' || sp.kind === 'epiphyte' ? 0.4 : sp.kind === 'shrub' || sp.kind === 'water-plant' ? 0.65 : 1;   // small plants grow quickly
    this.growTime = GROW_TIME[sp.growth || 'medium'] * kindK * (0.85 + rng() * 0.3);
    this.vis.setGrowth(this.growth); this.vis.setHealth(1); this.vis.setBloom(0); this.vis.setFruit(0);
    this.pop = 0; // spawn pop animation
    this._crown = null; this._crownT = -1;
    if (host && sp.kind === 'epiphyte') this.placeOnHost();
  }

  get isTree() { const k = this.sp.kind; return k === 'tree' || k === 'palm'; }
  get mature() { return this.growth >= 0.95; }

  placeOnHost() {
    const pts = this.host.vis.attachPoints();
    if (!pts.length || !this.host.alive) return;
    const p = pts[this.attachIdx % pts.length];
    this.host.obj.updateMatrixWorld();
    _v.copy(p.pos).applyMatrix4(this.host.obj.matrixWorld);
    this.obj.position.copy(_v); this.x = _v.x; this.z = _v.z; this.y = _v.y;
  }

  // world-space crown disc for the light system
  crown() {
    if (this.fallen || this.falling || this.removed || !this.alive) return null;
    const c = this.vis.crown();
    const s = this.obj.scale.x;
    return { x: this.x, z: this.z, top: this.y + c.top * s, bottom: this.y + c.bottom * s, radius: c.radius * s, density: c.density * (0.35 + 0.65 * this.health), ref: this };
  }
  topY() { const c = this.vis.crown(); return this.y + c.top * this.obj.scale.x; }
  focusPoint(out) { const c = this.vis.crown(); return out.set(this.x, this.y + Math.max(0.4, (c.top + c.bottom) * 0.5), this.z); }

  // amount of a food part available (0..1+)
  foodAmount(part) {
    if (!this.alive || this.removed || this.falling) return 0;
    const gh = this.growth * this.health;
    switch (part) {
      case 'leaves': return this.growth > 0.2 ? gh : 0;
      case 'fruit': case 'seeds': return this.fruit;
      case 'nectar': return this.bloom;
      case 'roots': return this.growth > 0.3 ? 0.6 * this.growth : 0;
      case 'dead': return 0.3 + gh * 0.3;
      default: return gh * 0.5;
    }
  }

  damage(a) { this.health = clamp(this.health - a, 0, 1); }

  // ecological tick (dt = sim seconds)
  tick(dt, W) {
    if (!this.alive || this.removed) return;
    this.age += dt;
    const sp = this.sp;
    if (this.host && !this.host.alive) { this.die(); return; }
    const grove = W.biomeId === 'grove';
    const season = W.season;
    const dormant = grove && sp.seasons && (sp.seasons.dormant || []).includes(season);
    const need = sp.lightNeed ?? 0.5;
    const effNeed = sp.shadeTolerant ? need * 0.75 : need;
    let lightOK = clamp((this.light - effNeed * 0.3) / (effNeed * 0.7 + 1e-3));
    if (sp.kind === 'fungus') lightOK = 1;
    // water
    let water = 1;
    if (grove) water = season === 'summer' ? 0.82 : season === 'autumn' ? 0.92 : 1;
    water -= W.drought * (sp.kind === 'fungus' ? 0.6 : sp.kind === 'herb' || sp.kind === 'epiphyte' ? 0.45 : 0.3);
    if (W.flood > 0 && sp.kind !== 'water-plant' && sp.id !== 'acai' && W.nearWater(this.x, this.z, 7)) water -= 0.25 * W.flood;
    if (sp.kind === 'water-plant') water = 1;
    if (W.waterBonusAt) water = Math.min(1, water + W.waterBonusAt(this.x, this.z));
    let target = clamp(0.2 + 0.85 * lightOK) * clamp(water + 0.15, 0, 1);
    if (dormant) target = Math.max(target, 0.6);
    if (sp.kind === 'fungus') target = W.rain > 0.3 || W.season === 'winter' || W.season === 'autumn' || !grove ? 1 : 0.75 - W.drought * 0.3;
    if (W.fireAt(this.x, this.z) > 0) { this.burnFire(W); return; }
    const rate = target < this.health ? 0.018 : 0.03;
    this.health = damp(this.health, target, rate * 3, dt);
    if (this.healthCap != null && this.health > this.healthCap) this.health = damp(this.health, this.healthCap, 0.6, dt);   // a mystery shows this one sick (a bleached coral)
    if (this.health < 0.05) { this.die('weak'); return; }
    if (!dormant) {
      const g = dt / this.growTime * (0.15 + 0.85 * lightOK) * (0.3 + 0.7 * this.health) * W.growBoost;
      if (this.growth < 1) { const before = this.growth; this.growth = Math.min(1, this.growth + g); if (before < 0.95 && this.growth >= 0.95) W.onMature(this); }
    }
    // bloom & fruit
    let bloomT = 0, fruitT = 0;
    const pollNeeded = sp.pollinators.length > 0;
    if (grove && sp.seasons) {
      const bl = sp.seasons.bloom || [], fr = sp.seasons.fruit || [];
      if (this.growth > 0.5 && this.health > 0.35 && !dormant && bl.includes(season)) bloomT = 1;
      if (this.growth > 0.6 && fr.includes(season)) fruitT = pollNeeded ? (this.pollinated ? 1 : 0.35) : 1;
      if (season === 'winter' && W.seasonFrac < 0.05 && !bl.includes('winter')) this.pollinated = false;
    } else {
      const cyc = (this.age + this.phase) % 150;
      if (cyc < 2) this.pollinated = false;
      if (this.growth > 0.55 && this.health > 0.4) {
        if (cyc < 55) bloomT = 1;
        else if (cyc < 140 && (this.pollinated || !pollNeeded)) fruitT = 1;
        else if (cyc < 140 && pollNeeded) fruitT = 0.12;   // a few fruits set anyway
      }
    }
    this.bloom = damp(this.bloom, bloomT, 0.25, dt);
    this.fruit = damp(this.fruit, fruitT, 0.12, dt);
    // self seeding near the parent (wind / gravity / spores)
    this.seedTimer -= dt;
    if (this.seedTimer <= 0) {
      this.seedTimer = 25 + this.rng() * 25;
      const can = this.fruit > 0.5 || (sp.kind === 'fern' || sp.kind === 'fungus' ? this.growth > 0.8 : false) || ((sp.kind === 'herb' || sp.kind === 'fungus') && this.growth > 0.85 && !dormant);
      if (can && this.health > 0.6 && this.rng() < (sp.dispersers.length ? 0.1 : 0.22)) W.selfSeed(this);
    }
  }

  burnFire(W) {
    const sp = this.sp;
    if (this.burn > 0) return;
    this.burn = 1;
    if (W.biomeId === 'grove' && (W.resprouters.has(sp.id))) { this.growth = Math.max(0.12, this.growth * 0.2); this.health = 0.45; W.note('resprout', this); }
    else if (GEOPHYTES.has(sp.id)) { this.health = 0.5; }
    else if (sp.id === 'pine') { W.pineAfterFire(this); this.die('fire'); }
    else this.die('fire');
  }

  // visual update every frame (dt real seconds, simDt)
  frame(dt, t, W) {
    if (this.pop < 1) { this.pop = Math.min(1, this.pop + dt * 2.2); const p = this.pop; const s = 1 + Math.sin(p * Math.PI) * 0.25; this.obj.scale.setScalar(this.dying ? this.obj.scale.x : Math.max(0.001, s * Math.min(1, p * 3)) * (this.baseScale ?? 1)); }
    if (this.dying) {
      this.dying += dt;
      const s = Math.max(0.001, 1 - this.dying / 1.6);
      this.obj.scale.setScalar(s); if (this.dying > 1.6) { this.alive = false; W.removeEntity(this); }
      return;
    }
    if (this.falling) {
      const f = this.falling; f.t += dt;
      const p = Math.min(1, f.t / 2.8); const ang = p * p * 1.45;
      this.obj.quaternion.setFromAxisAngle(f.axis, ang).multiply(f.q0);
      if (this.vis.fall) this.vis.fall(p);
      if (p >= 1 && !this.fallen) { this.fallen = true; f.lieT = 0; W.onTreeLanded(this); }
      if (this.fallen) { f.lieT += dt; if (f.lieT > 70) { this.obj.position.y -= dt * 0.15; if (f.lieT > 82) { this.alive = false; W.removeEntity(this); } } }
      this.vis.update(dt, t, 0);
      return;
    }
    if (this._g !== this.growth) { this.vis.setGrowth(this.growth); this._g = this.growth; }
    if (Math.abs((this._h ?? -1) - this.health) > 0.01) { this.vis.setHealth(this.health); this._h = this.health; }
    if (Math.abs((this._b ?? -1) - this.bloom) > 0.02) { this.vis.setBloom(this.bloom); this._b = this.bloom; }
    if (Math.abs((this._f ?? -1) - this.fruit) > 0.02) { this.vis.setFruit(this.fruit); this._f = this.fruit; }
    if (W.biomeId === 'grove' && (this._s !== W.season || Math.abs((this._sf ?? 0) - W.seasonFrac) > 0.05)) { this.vis.setSeason(W.season, W.seasonFrac); this._s = W.season; this._sf = W.seasonFrac; }
    this.vis.setNightGlow(W.nightGlow);
    this.vis.update(dt, t, W.wind);
    if (this.host && this.sp.kind === 'epiphyte' && ((t * 2 + this.uid) % 2) < dt * 2) this.placeOnHost();
  }

  fall(dirAngle) {
    if (this.falling) return;
    const axis = new THREE.Vector3(Math.cos(dirAngle + Math.PI / 2), 0, Math.sin(dirAngle + Math.PI / 2));
    this.falling = { t: 0, axis, q0: this.obj.quaternion.clone() };
  }

  die(reason = 'weak') { if (this.dying || !this.alive) return; this.dying = 0.0001; this.deathReason = reason; this.world.onPlantDied(this, reason); }
}
