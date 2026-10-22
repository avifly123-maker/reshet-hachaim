// The environment's small public controls: the light overlay on the ground, canopy gaps, isPlaceable(), quality changes
// (scatter density, shadow map size) and dispose().
// Exports: createControls(ctx) → { setLightOverlay, setGap, isPlaceable, setQuality, dispose }.
// Needs from ctx: G, gaps, isWater, onRock, nearBridge, heightAt, quality, scatterMeshes, sunLight, scene, root, prevFog,
// prevBg, disposables, boltMesh.
import { clamp } from '../../core/util.js';
import { Q, R, MAX_GAPS } from './common.js';

export function createControls(ctx) {
  const {
    G, gaps, isWater, onRock, nearBridge, heightAt, quality, scatterMeshes, sunLight, scene, root,
    prevFog, prevBg, disposables, boltMesh
  } = ctx;
  function setLightOverlay(tex) {
    G.uOverlay.value = tex || null;
    G.uOverlayOn.value = tex ? 1 : 0;
  }
  function setGap(x, z, r, amount) {
    const i = gaps.findIndex(g => Math.hypot(g.x - x, g.z - z) < 0.5);
    if (amount <= 0) { if (i >= 0) gaps.splice(i, 1); return; }
    if (i >= 0) { gaps[i].r = r; gaps[i].a = clamp(amount); return; }
    if (gaps.length >= MAX_GAPS) gaps.shift();
    gaps.push({ x, z, r, a: clamp(amount) });
  }

  function isPlaceable(x, z) {
    const r = Math.hypot(x, z);
    if (r > R) return false;
    if (isWater(x, z)) return false;
    if (onRock(x, z, -0.1)) return false;
    if (nearBridge(x, z, 0.9)) return false;
    const e = 0.6;
    const gx = (heightAt(x + e, z) - heightAt(x - e, z)) / (2 * e), gz = (heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
    return Math.hypot(gx, gz) < 0.6;
  }

  function setQuality(q) {
    const qq = Q[q]; if (!qq) return;
    const full = Q[quality].scatter;
    for (const m of scatterMeshes) m.count = Math.max(1, Math.min(m.userData.fullCount, Math.round(m.userData.fullCount * qq.scatter / full)));
    for (const m of scatterMeshes) m.castShadow = qq.shadowScatter && ['bush', 'bigleaf', 'chunk'].some(k => m.name.endsWith(k));
    const s = ({ min: 512, low: 512, medium: 1024, high: 2048 })[q];
    if (sunLight.shadow.mapSize.x !== s) { sunLight.shadow.mapSize.set(s, s); if (sunLight.shadow.map) { sunLight.shadow.map.dispose(); sunLight.shadow.map = null; } }
  }

  function dispose() {
    scene.remove(root);
    scene.fog = prevFog; scene.background = prevBg;
    for (const d of disposables) d.dispose && d.dispose();
    boltMesh.geometry.dispose();
    root.traverse(o => { if (o.isInstancedMesh) o.dispose(); });
    if (sunLight.shadow.map) sunLight.shadow.map.dispose();
  }
  return { setLightOverlay, setGap, isPlaceable, setQuality, dispose };
}
