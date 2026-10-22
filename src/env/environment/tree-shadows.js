// Soft tree shadows painted into a top-down canvas texture (works on every quality tier, even without shadow maps):
// setTreeShadows(crowns, sunDir) redraws it, updateTreeShadowStrength() follows daylight (called by update.js).
// Exports: createTreeShadows(ctx) → { setTreeShadows, updateTreeShadowStrength }.
// Needs from ctx: G, track, heightAt, pipeline, quality and update.js's sunDir, state, night.
import * as THREE from 'three';
import { TREE_SHADOW } from '../../data/tree-shadow.js';
import { clamp, smoothstep } from '../../core/util.js';
import { R } from './common.js';

export function createTreeShadows(ctx) {
  const { G, track, heightAt, pipeline, quality, sunDir, state, night } = ctx;
  // ───────────────────────────── soft tree shadows (works on every quality tier, including those without shadow maps)
  const TS_N = 512;
  const tsCanvas = document.createElement('canvas'); tsCanvas.width = tsCanvas.height = TS_N;
  const tsCtx = tsCanvas.getContext('2d');
  const tsTex = track(new THREE.CanvasTexture(tsCanvas));
  tsTex.flipY = false; tsTex.colorSpace = THREE.NoColorSpace; tsTex.minFilter = THREE.LinearFilter; tsTex.magFilter = THREE.LinearFilter; tsTex.generateMipmaps = false;
  G.uTreeSh.value = tsTex;
  if (typeof window !== 'undefined') window.__treeShadowCanvas = tsCanvas;
  const tsSprite = new Image(); let tsReady = false, tsPending = null;
  tsSprite.onload = () => { tsReady = true; if (tsPending) setTreeShadows(...tsPending); };
  tsSprite.src = TREE_SHADOW;
  let tsStrength = 0;
  // crowns: [{x, z, top, bottom, radius, density}] in world units; sun: THREE.Vector3 (towards the sun)
  function setTreeShadows(crowns, sunDirIn) {
    if (!tsReady) { tsPending = [crowns, sunDirIn]; return; }
    const px = TS_N / (2 * R);                                  // pixels per metre
    const sy = Math.max(0.28, sunDirIn.y);                      // low sun → longer shadows (clamped)
    const ax = -sunDirIn.x / sy, az = -sunDirIn.z / sy;         // ground offset per metre of height
    const ang = Math.atan2(az, ax), stretch = 1 + Math.min(1.2, Math.hypot(ax, az) * 0.45);
    tsCtx.clearRect(0, 0, TS_N, TS_N);
    for (const c of crowns) {
      if (!c || c.radius < 0.45) continue;
      const h = (c.top + c.bottom) * 0.5 - heightAt(c.x, c.z);
      const ox = c.x + ax * h * 0.85, oz = c.z + az * h * 0.85;
      const rr = c.radius * 1.25 * px;
      tsCtx.save();
      tsCtx.globalAlpha = clamp(0.55 + 0.45 * (c.density ?? 0.7), 0.35, 1);
      tsCtx.translate((ox + R) * px, (oz + R) * px); tsCtx.rotate(ang); tsCtx.scale(stretch, 1);
      tsCtx.drawImage(tsSprite, -rr, -rr, rr * 2, rr * 2);
      tsCtx.restore();
      // small soft contact shade right at the trunk foot (does not move with the sun)
      const cr = Math.max(0.6, c.radius * 0.28) * px;
      const g = tsCtx.createRadialGradient((c.x + R) * px, (c.z + R) * px, 0, (c.x + R) * px, (c.z + R) * px, cr);
      g.addColorStop(0, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      tsCtx.fillStyle = g; tsCtx.beginPath(); tsCtx.arc((c.x + R) * px, (c.z + R) * px, cr, 0, Math.PI * 2); tsCtx.fill();
    }
    tsTex.needsUpdate = true;
  }
  // strength follows daylight; weaker when real shadow maps are on (then it only adds soft ambient shade)
  function updateTreeShadowStrength() {
    const day = smoothstep(-0.02, 0.2, sunDir.y);
    const realShadows = pipeline.renderer && pipeline.renderer.shadowMap.enabled;
    tsStrength = (realShadows ? 0.22 : 0.62) * day * (1 - 0.6 * (state.wet || 0)) + 0.06 * night.v;
    G.uTreeShK.value = quality === 'min' ? tsStrength * 0.85 : tsStrength;
  }
  return { setTreeShadows, updateTreeShadowStrength };
}
