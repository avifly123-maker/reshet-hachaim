// Procedural textures of the environment: a tiling 4-channel noise texture and a soft puff (cloud / smoke) sprite.
// Exports: makeTileNoiseTexture, makePuffTexture.  Needs: three, core/util.js.
import * as THREE from 'three';
import { makeRng, makeNoise2D, clamp, lerp } from '../../core/util.js';

// ───────────────────────────────────────────────────────── procedural textures
export function makeTileNoiseTexture(size = 256, seed = 7) {
  const rng = makeRng(seed);
  const data = new Uint8Array(size * size * 4);
  const chans = [[32, 64, 128], [8, 16, 32, 64], [4, 8, 16], [16, 32]];
  for (let c = 0; c < 4; c++) {
    const field = new Float32Array(size * size);
    let amp = 1;
    for (const period of chans[c]) {
      const g = new Float32Array(period * period);
      for (let i = 0; i < g.length; i++) g[i] = rng();
      const cell = size / period;
      for (let y = 0; y < size; y++) {
        const gy = y / cell, y0 = Math.floor(gy), fy = gy - y0, sy = fy * fy * (3 - 2 * fy);
        const ya = (y0 % period) * period, yb = ((y0 + 1) % period) * period;
        for (let x = 0; x < size; x++) {
          const gx = x / cell, x0 = Math.floor(gx), fx = gx - x0, sx = fx * fx * (3 - 2 * fx);
          const xa = x0 % period, xb = (x0 + 1) % period;
          const v = lerp(lerp(g[ya + xa], g[ya + xb], sx), lerp(g[yb + xa], g[yb + xb], sx), sy);
          field[y * size + x] += v * amp;
        }
      }
      amp *= 0.55;
    }
    let mn = Infinity, mx = -Infinity;
    for (const v of field) { if (v < mn) mn = v; if (v > mx) mx = v; }
    for (let i = 0; i < field.length; i++) data[i * 4 + c] = Math.round(255 * (field[i] - mn) / (mx - mn));
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true; tex.needsUpdate = true;
  return tex;
}

export function makePuffTexture(size = 128, seed = 3) {
  const noise = makeNoise2D(seed);
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = (x + 0.5) / size * 2 - 1, v = (y + 0.5) / size * 2 - 1;
    const r = Math.sqrt(u * u + v * v);
    const n = noise.fbm(u * 2.5 + 4, v * 2.5 + 9, 4) * 0.5 + 0.5;
    let a = clamp(1 - r) ** 1.6 * (0.45 + 0.9 * n);
    a = clamp(a);
    const i = (y * size + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = 255; data[i + 3] = Math.round(a * 255);
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}
