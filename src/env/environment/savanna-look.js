// 1.4.2: the savanna's look in the shared environment (like desert-look.js for the desert). The savanna uses the dry-land
// parts (isAmazon false) on a bigger island (common.js K = 1.32, R ≈ 50) and these values and shapes where it differs:
// a wide plain with gentle swells, a brown river that crosses the whole island (the herds cross it), two waterholes that
// shrink in the dry season, a granite kopje (a hill of round boulders), red earth, laterite strata on the island's edge,
// and a far land of flat plains with lonely acacias and a long low mountain. Pure numbers and colours.
import { smoothstep } from '../../core/util.js';
import { C } from './common.js';

export const SAVANNA = {
  // the river: from a spring near the south-west edge, across the plain, off the north-east edge (a waterfall)
  river: [[-40, -34], [-31, -27], [-25, -16], [-15, -9], [-3, -7], [9, -1], [17, 9], [27, 15], [38, 21], [49, 29], [62, 38]],
  riverHW: 3.2,
  // the waterholes (pools of their own, away from the river): they shrink in the dry season (update.js)
  holes: [{ x: 15, z: -25, r: 3.3 }, { x: -21, z: 21, r: 2.9 }],
  // the kopje (granite boulders) and a few lone rocks
  rocks: [[25, 25, 4.4], [32, 17, 2.4], [-35, 5, 2.6], [-6, -36, 2.0], [4, 34, 1.6]],
  kopje: { x: 27, z: 22, r: 9 },
  soil: { a: C('#a8623a'), b: C('#bc7444'), mud: C('#6a4630'), bed: C('#8a7258'), rock: C('#9a8a78') },   // red earth
  // grass colours by season: green after the rains, straw in the dry season (scatter + ground, update.js)
  wet: { grass: '#7a9a3a', grass2: '#8aa046' },
  dry: { grass: '#c8a456', grass2: '#d4b46a' },
  bedrock: [0.5, 0.36, 0.27],   // bare red-brown earth showing through between the grass (the ground shader's bedrock)
  hemiGround: '#b88a58',
  rockA: '#a89a88', rockB: '#8a7c6c', rockLight: '#d0c4b2', rockDark: '#6a5e52',   // granite: grey with warm light
  water: { deep: '#5a4a2a', shallow: '#9a8450' },   // a muddy brown river
};

// height added to the shared island shape (terrain.js rawHeight): a flat plain with long low swells and the kopje's hill
export function savannaHeight(x, z, noise) {
  let h = -0.35;   // flatter than the grove: the shared shape's bumps are softened (below) and the plain sits a little lower
  h += 0.55 * noise(x * 0.012 + 3, z * 0.012 - 5);   // long low swells
  const k = SAVANNA.kopje, dk = Math.hypot(x - k.x, z - k.z);
  h += 2.2 * smoothstep(k.r + 6, k.r - 3, dk);   // the kopje rises from the plain
  return h;
}
// the shared shape's noise is made gentler on the plain (a factor on its bumps; 1 = as in the grove)
export const SAVANNA_BUMPS = 0.45;

// the island's cut edge: red earth on top, then laterite reds and ochres with a pale band now and then
const STRATA = ['#9a4a2a', '#b8683a', '#8a3e24', '#c8844a', '#a05430', '#d09a62', '#7e3a22'];
export function savannaStrata(d, out, tmp) {
  if (d < 0.8) return out.set('#a0603a');
  if (d < 1.4) return out.set('#7a4a2e');
  const band = Math.floor((d - 1.4) / 1.6);
  out.set(STRATA[band % STRATA.length]);
  const fr = ((d - 1.4) / 1.6) % 1;
  if (fr < 0.07) out.multiplyScalar(0.72);
  if (Math.floor((d - 1.4) / 6) % 3 === 1) out.lerp(tmp.set('#e0c090'), 0.25);
  return out;
}

// the far land: a wide flat plain, low hills, and one long mountain far away; returns its height and paints its colour
export function savannaFar(x, z, r, fn, farHills, c) {
  const plain = (fn(x * 0.006 + 1, z * 0.006 - 4) * 0.5 + 0.5) * 7 + fn(x * 0.03, z * 0.03) * 1.5;
  // a long low mountain to the north-west, very far
  const dm = Math.hypot((x + 300) * 0.6, z + 330);
  const mount = 95 * Math.exp(-(dm * dm) / (2 * 120 * 120)) * smoothstep(160, 320, r);
  const hills = smoothstep(0.25, 0.6, fn(x * 0.003 + 9, z * 0.003)) * 22 * farHills * smoothstep(140, 300, r);
  const y = -84 + plain + mount + hills;
  if (c) {
    const g = fn(x * 0.04 + 2, z * 0.04) * 0.5 + 0.5;
    c.set(mount > 12 ? '#8a7a6a' : '#b89a5a').lerp(C(mount > 12 ? '#a89a8a' : '#a08a48'), g);
    if (mount > 60) c.lerp(C('#d8d0c8'), smoothstep(60, 95, mount) * 0.6);   // a pale summit
  }
  return { y, ok: mount < 6 };
}
