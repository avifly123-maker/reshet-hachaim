// 1.4.2, the savanna: the year (pure numbers). A year is `wet` days of rains and then `dry` days of dry season
// (BIOME.year, src/data/savanna.js). From the day and the time of day this gives the season, how far into it we are, and
// two smooth numbers the other parts read: wet (1 in the rains, fading over the first part of the dry season) and dryK
// (0 in the rains, rising to 1 as the dry season goes on). The year turns slowly, so nothing jumps at midnight.
import { clamp, smoothstep } from '../../core/util.js';

export function seasonAt(day, dayFrac, year = { wet: 3, dry: 3 }) {
  const Y = year.wet + year.dry, d = (((day - 1) % Y) + Y) % Y + clamp(dayFrac);
  if (d < year.wet) {
    const frac = d / year.wet;
    return { season: 'wet', frac, wet: 1, dryK: 0, yearPos: d / Y, dayOfSeason: Math.floor(d) };
  }
  const frac = (d - year.wet) / year.dry;
  return { season: 'dry', frac, wet: 1 - smoothstep(0, 0.25, frac), dryK: smoothstep(0.05, 0.6, frac), yearPos: d / Y, dayOfSeason: Math.floor(d - year.wet) };
}
