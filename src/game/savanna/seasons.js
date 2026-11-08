// 1.4.2, the savanna: the year (pure numbers). A year is `wet` days of rains and then `dry` days of dry season
// (BIOME.year, src/data/savanna.js). From the day and the time of day this gives the season, how far into it we are, and
// two smooth numbers the other parts read: wet (1 in the rains, fading over the first part of the dry season) and dryK
// (0 in the rains, rising to 1 as the dry season goes on). The year turns slowly, so nothing jumps at midnight.
import { clamp, smoothstep } from '../../core/math.js';

export function seasonAt(day, dayFrac, year = { wet: 3, dry: 3 }) {
  const Y = year.wet + year.dry, d = (((day - 1) % Y) + Y) % Y + clamp(dayFrac);
  if (d < year.wet) {
    const frac = d / year.wet;
    return { season: 'wet', frac, wet: 1, dryK: 0, yearPos: d / Y, dayOfSeason: Math.floor(d) };
  }
  const frac = (d - year.wet) / year.dry;
  return { season: 'dry', frac, wet: 1 - smoothstep(0, 0.25, frac), dryK: smoothstep(0.05, 0.6, frac), yearPos: d / Y, dayOfSeason: Math.floor(d - year.wet) };
}

// 2.11 (Avi: "in the drought mission it rains"): a drought holds the rains back. When the rainy season begins during a
// drought, its first shower waits (st.late) and comes only once the drought is over. Returns what to do this frame:
// 'rain' (the rains begin now), 'held' (the season turned but the drought keeps the sky clear) or null.
//   rainsGate(st, season, droughtOn)   st keeps { season, late } between frames
export function rainsGate(st, season, droughtOn) {
  const turned = st.season != null && st.season !== season;
  if (turned && season === 'dry') st.late = false;
  if (turned && season === 'wet') { if (droughtOn) { st.late = true; return 'held'; } return 'rain'; }
  if (st.late && season === 'wet' && !droughtOn) { st.late = false; return 'rain'; }
  return null;
}
// how much the grass may grow and green: the season's wetness, less while a drought lasts
export const grassWet = (svWet, drought) => (svWet ?? 1) * (1 - 0.85 * Math.min(1, drought || 0));
