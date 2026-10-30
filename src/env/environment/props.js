// Ground details modelled in Blender (src/world/props.js): fallen logs, rocks, mushrooms, river stones; and the fallen
// fruit under fruiting trees (setFallenFruit, called by game.js).
// Exports: createProps(ctx) → { setFallenFruit }.
// Needs from ctx: quality, root, track, isAmazon, scatter.js's scatterMaterial, slopeQuat, samplePoints, dryLand, rrS and
// terrain.js's rocks, heightAt, rockInfluence, WL, waterDist, isWater.
import * as THREE from 'three';
import { makeRng, clamp } from '../../core/util.js';
import { TAU, C, tmpC, V3 } from './common.js';
import { propGeometry } from '../../world/props.js';

export function createProps(ctx) {
  const {
    quality, root, track, isAmazon, isDesert, scatterMaterial, slopeQuat, samplePoints, dryLand, rrS, rocks,
    heightAt, rockInfluence, WL, waterDist, isWater
  } = ctx;
  // ───────────────────────────── ground details modelled in Blender (src/world/props.js)
  // A few of each – they are details, not cover: fallen logs, rocks, river stones, mushrooms. Their counts depend on
  // the quality only at creation (unlike the dense scatter they are never thinned later).
  const propMeshes = [];
  const PQ = ({ min: 0.35, low: 0.6, medium: 1, high: 1.3 })[quality] ?? 1;
  const NP = (n) => Math.max(1, Math.round(n * PQ));
  let propMat = null;
  function addProp(name, items, { castShadow = false } = {}) {
    if (!items.length) return null;
    const geom = propGeometry(name); if (!geom) return null;
    propMat = propMat || scatterMaterial('props', { sway: 0, rough: 0.85 });
    const mesh = new THREE.InstancedMesh(geom, propMat, items.length);
    const m = new THREE.Matrix4();
    items.forEach((it, i) => { m.compose(it.p, it.q, it.s); mesh.setMatrixAt(i, m); mesh.setColorAt(i, it.c || tmpC.setScalar(1)); });
    mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = castShadow; mesh.receiveShadow = true; mesh.frustumCulled = false;
    mesh.name = 'prop-' + name; root.add(mesh); propMeshes.push(mesh); track(geom);
    return mesh;
  }
  const grey = (lo, hi) => tmpC.setScalar(lo + rrS() * (hi - lo)).clone();
  const lying = (x, z) => slopeQuat(x, z, rrS() * TAU, 1);
  const awayFromRocks = (pad) => (x, z) => rocks.every(rk => Math.hypot(x - rk.x, z - rk.z) > rk.r * 0.9 + pad);
  try {
    if (isAmazon) {
      // fallen trunks: mossy, with shelf fungi – they rot slowly back into the soil
      addProp('log_amazon', samplePoints(NP(9), 10, 40, (x, z) => dryLand(1.5)(x, z) && awayFromRocks(1)(x, z), rrS)
        .map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.12, p.z), q: lying(p.x, p.z), s: V3(1, 1, 1).multiplyScalar(0.85 + rrS() * 0.5), c: grey(0.85, 1.05) })), { castShadow: true });
      addProp('rock_moss', samplePoints(NP(16), 6, 44, (x, z) => dryLand(0.8)(x, z) && rrS() < 0.4 + rockInfluence(x, z), rrS)
        .map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.15, p.z), q: lying(p.x, p.z), s: V3(1, 0.8 + rrS() * 0.5, 1).multiplyScalar(0.5 + rrS() * 0.8), c: grey(0.8, 1.05) })), { castShadow: true });
      addProp('mush_amazon', samplePoints(NP(34), 0, 44, (x, z) => dryLand(0.5)(x, z), rrS)
        .map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.02, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU, 0.4), s: V3(1, 1, 1).multiplyScalar(1.8 + rrS() * 1.2), c: grey(0.85, 1.1) })));
      if (WL !== null) addProp('river_stones', samplePoints(NP(40), 0, 46, (x, z) => { const d = waterDist(x, z); return d > -0.5 && d < 1.0; }, rrS)
        .map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.03, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU, 0.25), s: V3(1, 1, 1).multiplyScalar(0.9 + rrS() * 0.9), c: grey(0.85, 1.1) })));
    } else if (isDesert) {
      // sandstone rocks and stones (the grove's rock models, painted warm), and smooth pebbles in the wadi and by the spring
      const sand = () => C('#d89a68').multiplyScalar(0.85 + rrS() * 0.2);
      addProp('rock_lime', samplePoints(NP(16), 6, 44, (x, z) => dryLand(0.8)(x, z) && rrS() < 0.25 + rockInfluence(x, z) * 1.5, rrS)
        .map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.18, p.z), q: lying(p.x, p.z), s: V3(1, 0.8 + rrS() * 0.4, 1).multiplyScalar(0.45 + rrS() * 0.8), c: sand() })), { castShadow: true });
      addProp('rock_lime2', samplePoints(NP(22), 4, 44, (x, z) => dryLand(0.6)(x, z) && rrS() < 0.3 + rockInfluence(x, z) * 1.5, rrS)
        .map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.12, p.z), q: lying(p.x, p.z), s: V3(1, 1, 1).multiplyScalar(0.4 + rrS() * 0.6), c: sand() })), { castShadow: true });
      if (WL !== null) addProp('river_stones', samplePoints(NP(12), 0, 46, (x, z) => { const d = waterDist(x, z); return d > -0.4 && d < 0.8; }, rrS)
        .map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.03, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU, 0.25), s: V3(1, 1, 1).multiplyScalar(0.8 + rrS() * 0.6), c: C('#d8c0a0').multiplyScalar(0.9 + rrS() * 0.15) })));
    } else {
      // a fallen pine or oak branch; limestone rocks with lichen; mushrooms after the rains
      addProp('log_grove', samplePoints(NP(7), 12, 40, (x, z) => dryLand(1.5)(x, z) && awayFromRocks(1)(x, z), rrS)
        .map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.08, p.z), q: lying(p.x, p.z), s: V3(1, 1, 1).multiplyScalar(0.8 + rrS() * 0.45), c: grey(0.9, 1.05) })), { castShadow: true });
      addProp('rock_lime', samplePoints(NP(14), 6, 44, (x, z) => dryLand(0.8)(x, z) && rrS() < 0.3 + rockInfluence(x, z) * 1.5, rrS)
        .map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.18, p.z), q: lying(p.x, p.z), s: V3(1, 0.8 + rrS() * 0.4, 1).multiplyScalar(0.45 + rrS() * 0.7), c: grey(0.85, 1.0) })), { castShadow: true });
      addProp('rock_lime2', samplePoints(NP(18), 4, 44, (x, z) => dryLand(0.6)(x, z) && rrS() < 0.35 + rockInfluence(x, z) * 1.5, rrS)
        .map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.12, p.z), q: lying(p.x, p.z), s: V3(1, 1, 1).multiplyScalar(0.4 + rrS() * 0.6), c: grey(0.85, 1.0) })), { castShadow: true });
      addProp('mush_grove', samplePoints(NP(24), 0, 44, (x, z) => dryLand(0.5)(x, z), rrS)
        .map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.02, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU, 0.4), s: V3(1, 1, 1).multiplyScalar(1.8 + rrS() * 1.1), c: grey(0.9, 1.1) })));
      if (WL !== null) addProp('river_stones', samplePoints(NP(12), 0, 46, (x, z) => { const d = waterDist(x, z); return d > -0.4 && d < 0.8; }, rrS)
        .map(p => ({ p: V3(p.x, heightAt(p.x, p.z) - 0.03, p.z), q: slopeQuat(p.x, p.z, rrS() * TAU, 0.25), s: V3(1, 1, 1).multiplyScalar(0.8 + rrS() * 0.6), c: C('#e8e0cc').multiplyScalar(0.9 + rrS() * 0.15) })));
    }
  } catch (e) { console.warn('ground props skipped', e); }

  // fallen fruit under the trees that are fruiting now: acorns under oaks, carob pods under carobs, Brazil-nut
  // capsules under Brazil-nut trees. game.js calls setFallenFruit() with the fruiting trees (see updateLight there).
  const FRUIT_CAP = 160;
  const fruitMeshes = {};
  const fruitM4 = new THREE.Matrix4(), fruitQ = new THREE.Quaternion(), fruitS = new THREE.Vector3(), fruitP = new THREE.Vector3();
  function setFallenFruit(list) {
    const per = {};
    for (const t of list || []) (per[t.kind] = per[t.kind] || []).push(t);
    for (const kind of new Set([...Object.keys(per), ...Object.keys(fruitMeshes)])) {
      let mesh = fruitMeshes[kind];
      const trees = per[kind] || [];
      if (!mesh) {
        if (!trees.length) continue;
        const geom = propGeometry(kind); if (!geom) continue;
        propMat = propMat || scatterMaterial('props', { sway: 0, rough: 0.85 });
        mesh = fruitMeshes[kind] = new THREE.InstancedMesh(geom, propMat, FRUIT_CAP);
        mesh.name = 'fruit-' + kind; mesh.frustumCulled = false; mesh.receiveShadow = true;
        root.add(mesh); track(geom);
      }
      let n = 0;
      for (const t of trees) {
        const rr = makeRng(Math.floor(t.x * 131 + t.z * 71) + 7);   // the same spots for the same tree
        const count = Math.round(clamp(t.amount, 0, 1) * (kind === 'brazil_pod' ? 3 : 5));
        for (let k = 0; k < count && n < FRUIT_CAP; k++) {
          const a = rr() * TAU, d = Math.sqrt(rr()) * Math.max(0.6, t.radius * 0.75);
          const x = t.x + Math.cos(a) * d, z = t.z + Math.sin(a) * d;
          if (isWater(x, z)) continue;
          fruitP.set(x, heightAt(x, z) - 0.01, z);
          fruitQ.copy(slopeQuat(x, z, rr() * TAU, 1));
          fruitS.setScalar((kind === 'acorns' ? 1.6 : kind === 'carob_pods' ? 1.5 : 1.4) * (0.85 + rr() * 0.4));
          fruitM4.compose(fruitP, fruitQ, fruitS);
          mesh.setMatrixAt(n++, fruitM4);
        }
      }
      mesh.count = n; mesh.visible = n > 0;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
  return { setFallenFruit };
}
