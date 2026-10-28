// Colour keyframes: the sky by sun elevation (SKY per zone) and the grove's year (GROVE_YEAR, winter → autumn).
// Exports: SKY, SKY_C, samplePalette, GROVE_YEAR, GROVE_YEAR_C, sampleYear.  Needs: common.js, core/util.js.
import { lerp } from '../../core/util.js';
import { C } from './common.js';

// ───────────────────────────────────────────────────────── palettes
export const SKY = {
  amazon: [
    // e = sin(sun elevation)
    // night (Avi, 19.10: too dark to play): a deep blue moonlit sky and a faintly luminous haze instead of black
    { e: -1.0, zen: '#071534', hor: '#1f3558', gnd: '#172640', fog: '#223a5c' },
    { e: -0.22, zen: '#0a1a3e', hor: '#253d62', gnd: '#1a2a46', fog: '#28405f' },
    { e: -0.08, zen: '#1a2a52', hor: '#6a5a78', gnd: '#2a2c40', fog: '#3e4058' },
    { e: 0.0, zen: '#33508a', hor: '#e2875a', gnd: '#5a5050', fog: '#b98a74' },
    { e: 0.12, zen: '#4d78b8', hor: '#f0bf8e', gnd: '#8a8a78', fog: '#d5c0a0' },
    { e: 0.35, zen: '#4a84c4', hor: '#c6dcd2', gnd: '#9fb4a8', fog: '#b6cec2' },
    { e: 1.0, zen: '#3e7cc2', hor: '#cadfd6', gnd: '#a4b8ac', fog: '#bad2c6' },
  ],
  grove: [
    { e: -1.0, zen: '#081638', hor: '#22385e', gnd: '#182844', fog: '#263e62' },
    { e: -0.22, zen: '#0b1b42', hor: '#284068', gnd: '#1b2c4a', fog: '#2c4568' },
    { e: -0.08, zen: '#1e2d5a', hor: '#7a5e7a', gnd: '#2e2c42', fog: '#47425c' },
    { e: 0.0, zen: '#3a5a98', hor: '#f08a52', gnd: '#6a5048', fog: '#c88e6c' },
    { e: 0.12, zen: '#4a7cc4', hor: '#f6c48a', gnd: '#9a8e74', fog: '#e0c8a0' },
    { e: 0.35, zen: '#2463d0', hor: '#d2e2ee', gnd: '#c4bca8', fog: '#cddbe6' },
    { e: 1.0, zen: '#1f5ccc', hor: '#d6e6f2', gnd: '#c8c0ae', fog: '#d0dfea' },
  ],
  // 1.4: the desert – a deep clear blue by day with a pale dusty horizon, long orange evenings, a bright starry night
  desert: [
    { e: -1.0, zen: '#081334', hor: '#26355a', gnd: '#1c2640', fog: '#2a3a5c' },
    { e: -0.22, zen: '#0b183c', hor: '#2c4066', gnd: '#202c48', fog: '#30466a' },
    { e: -0.08, zen: '#1c2a58', hor: '#8a5a6a', gnd: '#3a2e3e', fog: '#5a4458' },
    { e: 0.0, zen: '#3a5494', hor: '#f4874a', gnd: '#7a5440', fog: '#d48e62' },
    { e: 0.12, zen: '#4a7ac8', hor: '#f8c890', gnd: '#b0906a', fog: '#e6c69a' },
    { e: 0.35, zen: '#2a68cc', hor: '#e2dccc', gnd: '#d2b48a', fog: '#e4dac6' },
    { e: 1.0, zen: '#2462c8', hor: '#e8e0d0', gnd: '#d8bc92', fog: '#e8e0ce' },
  ],
};
export const SKY_C = {};
for (const k in SKY) SKY_C[k] = SKY[k].map(s => ({ e: s.e, zen: C(s.zen), hor: C(s.hor), gnd: C(s.gnd), fog: C(s.fog) }));
export function samplePalette(pal, e, key, out) {
  if (e <= pal[0].e) return out.copy(pal[0][key]);
  for (let i = 1; i < pal.length; i++) {
    if (e <= pal[i].e) { const t = (e - pal[i - 1].e) / (pal[i].e - pal[i - 1].e); return out.copy(pal[i - 1][key]).lerp(pal[i][key], t); }
  }
  return out.copy(pal[pal.length - 1][key]);
}

// grove season keyframes over year position p ∈ [0,4): 0 winter, 1 spring, 2 summer, 3 autumn
export const GROVE_YEAR = [
  { p: 0.0, grass: '#6a9440', dry: '#7d8c46', cover: 0.80, soilWet: 0.55 },
  { p: 0.6, grass: '#558c34', dry: '#66883a', cover: 0.95, soilWet: 0.65 },
  { p: 1.2, grass: '#5f9236', dry: '#80983e', cover: 1.00, soilWet: 0.45 },
  { p: 1.75, grass: '#94a048', dry: '#b4a456', cover: 0.95, soilWet: 0.2 },
  { p: 2.15, grass: '#c8b05a', dry: '#d4b56a', cover: 0.85, soilWet: 0.0 },
  { p: 2.7, grass: '#cfac62', dry: '#c49a58', cover: 0.75, soilWet: 0.0 },
  { p: 3.15, grass: '#b49a5c', dry: '#a88c58', cover: 0.62, soilWet: 0.05 },
  { p: 3.5, grass: '#8e9c4e', dry: '#a69858', cover: 0.68, soilWet: 0.35 },
  { p: 3.8, grass: '#749a44', dry: '#8e9450', cover: 0.75, soilWet: 0.5 },
  { p: 4.0, grass: '#6a9440', dry: '#7d8c46', cover: 0.80, soilWet: 0.55 },
];
export const GROVE_YEAR_C = GROVE_YEAR.map(k => ({ ...k, grassC: C(k.grass), dryC: C(k.dry) }));
export function sampleYear(p) {
  p = ((p % 4) + 4) % 4;
  for (let i = 1; i < GROVE_YEAR_C.length; i++) {
    const a = GROVE_YEAR_C[i - 1], b = GROVE_YEAR_C[i];
    if (p <= b.p) {
      const t = (p - a.p) / (b.p - a.p);
      return { grass: a.grassC.clone().lerp(b.grassC, t), dry: a.dryC.clone().lerp(b.dryC, t), cover: lerp(a.cover, b.cover, t), soilWet: lerp(a.soilWet, b.soilWet, t) };
    }
  }
  const k = GROVE_YEAR_C[0]; return { grass: k.grassC.clone(), dry: k.dryC.clone(), cover: k.cover, soilWet: k.soilWet };
}
