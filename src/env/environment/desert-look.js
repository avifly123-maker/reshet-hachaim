// 1.4: the desert's look in the shared environment. The desert uses the grove's dry-land parts (isAmazon false) and
// these values and shapes where it differs: sand dunes on one side, a dry wadi running in towards the oasis spring, a
// sandstone mesa with boulders, sandy soil, red and cream sandstone strata on the island's edge, a far land of dunes and
// flat-topped mesas, and the colours of its ground cover. Pure numbers and colours, no three.js objects of its own.
import { clamp, smoothstep } from '../../core/util.js';
import { C } from './common.js';

export const DESERT = {
  pool: { x: 6, z: -4, r: 3.4 },   // the oasis spring (the date palms need water close by)
  rocks: [[-20, -16, 4.0], [-26, -6, 2.6], [-13, -25, 2.4], [25, -16, 2.2], [22, 22, 2.0], [10.5, -8.5, 1.3]],
  soil: { a: C('#cfa772'), b: C('#ddb985'), mud: C('#8c6a46'), bed: C('#a89070'), rock: C('#b4744c') },
  grass: '#a8a062', grass2: '#c2ac6c', green: '#6e9a44',   // dry tufts; after rain they turn green
  bedrock: [0.74, 0.5, 0.34],    // sandstone breaking through the sand (the grove's limestone, in the ground shader)
  hemiGround: '#c89a68',
  rockA: '#c88a5a', rockB: '#a86a44', rockLight: '#e2b07c', rockDark: '#8a5a3a',
};

// the dry wadi: a shallow winding bed from the island's edge to the spring
const WADI = [[-44, 18], [-32, 13], [-21, 9], [-11, 5], [-1, 0], [4, -2.5]];
function wadiDist(x, z) {
  let best = 1e9;
  for (let i = 0; i < WADI.length - 1; i++) {
    const [ax, az] = WADI[i], [bx, bz] = WADI[i + 1], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / L2);
    best = Math.min(best, Math.hypot(ax + dx * t - x, az + dz * t - z));
  }
  return best;
}
export const nearWadi = (x, z, r = 2.5) => wadiDist(x, z) < r;

// height added to the shared island shape (terrain.js rawHeight)
export function desertHeight(x, z, noise) {
  let h = 0;
  // dunes: long wavy ridges on the far side, growing towards the edge
  const side = smoothstep(2, 22, z + 0.35 * x);
  const ridge = Math.pow(0.5 + 0.5 * Math.sin((x * 0.55 + z * 0.85) * 0.3 + noise(x * 0.03 + 4, z * 0.03 - 2) * 2.4), 2.6);
  h += side * (0.6 + 2.0 * ridge);
  // the wadi bed
  const wd = wadiDist(x, z);
  h -= 0.75 * Math.exp(-(wd * wd) / 9);
  // the sandstone mesa: a low flat-topped hill with steep sides
  const dm = Math.hypot(x + 20, z + 16);
  h += 2.6 * smoothstep(7.5, 5.2, dm) + 0.4 * smoothstep(9, 6, dm);
  return h;
}

// the island's cut edge: sand on top, then red, orange and cream sandstone
const STRATA = ['#c8804c', '#d89a62', '#b8683e', '#e0b07a', '#a85c38', '#cf9058', '#b87448'];
export function desertStrata(d, out, tmp) {
  if (d < 0.9) return out.set('#d2a870');
  if (d < 1.3) return out.set('#b48a5a');
  const band = Math.floor((d - 1.3) / 1.2);
  out.set(STRATA[band % STRATA.length]);
  const fr = ((d - 1.3) / 1.2) % 1;
  if (fr < 0.08) out.multiplyScalar(0.7);
  if (Math.floor((d - 1.3) / 5) % 3 === 2) out.lerp(tmp.set('#f0d8a8'), 0.3);
  return out;
}

// the far land: rolling dunes and flat-topped mesas; returns its height and paints its colour
export function desertFar(x, z, r, fn, farHills, c) {
  const dune = (fn(x * 0.01 + 3, z * 0.01) * 0.5 + 0.5) * 16 + fn(x * 0.04, z * 0.04) * 3;
  const m = smoothstep(0.32, 0.42, fn(x * 0.0045 - 7, z * 0.0045 + 2));
  const mesa = m * (38 + 20 * (fn(x * 0.002, z * 0.002) * 0.5 + 0.5)) * (0.6 + 0.4 * farHills) * smoothstep(120, 260, r);
  const y = -84 + dune + mesa;
  if (c) {
    const side = m > 0.05 && m < 0.95;
    c.set(side ? '#b0643c' : m >= 0.95 ? '#c8905a' : '#dcb882').lerp(C(side ? '#8a4a2c' : '#e6c894'), fn(x * 0.05, z * 0.05 + 7) * 0.5 + 0.5);
  }
  return { y, ok: m < 0.05 };
}
