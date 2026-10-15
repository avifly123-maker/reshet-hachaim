// Player avatars: round crops of the painted species art (animals only – never people).
// Each entry: the animal's Hebrew name and the crop – the point to centre (fractions of the picture) and how far to zoom in.
import { CARD_ART } from '../data/card-art.js';
import { ANIMALS } from '../core/profiles.js';

export const AVATARS = {
  owl: { name: 'תנשמת', cx: 0.56, cy: 0.44, z: 2.2 },
  fox: { name: 'שועל', cx: 0.49, cy: 0.62, z: 1.9 },
  hedgehog: { name: 'קיפוד', cx: 0.41, cy: 0.53, z: 2.1 },
  hoopoe: { name: 'דוכיפת', cx: 0.52, cy: 0.44, z: 1.7 },
  toucan: { name: 'טוקן', cx: 0.51, cy: 0.49, z: 1.7 },
  dartfrog: { name: 'צפרדע', cx: 0.56, cy: 0.29, z: 2.1 },
  sloth: { name: 'עצלן', cx: 0.43, cy: 0.42, z: 1.8 },
  butterfly: { name: 'פרפר', cx: 0.53, cy: 0.33, z: 2.2 },
};
export const AVATAR_IDS = ANIMALS.filter((a) => AVATARS[a]);
export const avatarName = (id) => (AVATARS[id] || AVATARS.owl).name;

// <span class="av …"><img …></span> – the size comes from the caller's CSS (the span is a circle that crops the picture)
export function avatarHTML(id, cls = '') {
  const a = AVATARS[id] ? id : 'owl';
  const { cx, cy, z } = AVATARS[a];
  const src = CARD_ART[a] || '';
  const off = (c) => Math.max(-(z - 1), Math.min(0, 0.5 - c * z)) * 100;
  return `<span class="av${cls ? ' ' + cls : ''}" data-animal="${a}" aria-hidden="true"><img src="${src}" alt="" draggable="false" style="position:absolute;width:${(z * 100).toFixed(1)}%;height:${(z * 100).toFixed(1)}%;left:${off(cx).toFixed(1)}%;top:${off(cy).toFixed(1)}%;max-width:none"></span>`;
}
