// The pictures of the lab's games (1.3.1): card paintings for creatures, and the lab's own paintings for everything else
// (clues, things, finds, pots: art/lab-items/, built by tools/build-lab-items.py into src/data/lab-items-art.js).
// Until a painting exists the game shows a soft tile with the item's name, so everything works before the art arrives.
//   picSrc(ref, thumbs)       a data URI / file path, or '' (ref: 'card:<speciesId>' | '<lab item id>' | a species id)
//   picHTML(ref, name, opts)  an <img>, or the soft tile with the name (opts: { thumbs, cls, alt })
import { esc } from '../ui/ui.js';
import { LAB_ITEMS } from '../data/lab-items-art.js';
import { CARD_ART } from '../data/card-art.js';

export function picSrc(ref, thumbs = CARD_ART) {
  if (!ref) return '';
  const r = String(ref);
  if (r.startsWith('card:')) { const id = r.slice(5); return (thumbs && thumbs[id]) || CARD_ART[id] || ''; }
  return LAB_ITEMS[r] || (thumbs && thumbs[r]) || CARD_ART[r] || '';
}
export const hasPic = (ref, thumbs) => !!picSrc(ref, thumbs);
export const frameArt = () => LAB_ITEMS['patent-frame'] || '';

// a soft paper-coloured tile; the hue comes from the name, so neighbours differ a little
function tone(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; }
export function picHTML(ref, name = '', { thumbs, cls = '', alt } = {}) {
  const src = picSrc(ref, thumbs);
  if (src) return `<img class="lp-img ${cls}" src="${src}" alt="${esc(alt != null ? alt : name)}" draggable="false">`;
  const h = tone(ref || name);
  return `<span class="lp-ph ${cls}" style="--lph:${h}" role="img" aria-label="${esc(name)}"><span>${esc(name)}</span></span>`;
}

export const PICS_CSS = `
#ui.wol .lp-ph{display:grid;place-items:center;aspect-ratio:1;border-radius:inherit;background:radial-gradient(circle at 35% 30%,hsl(var(--lph) 40% 96%),hsl(var(--lph) 28% 86%));box-shadow:inset 0 0 0 1px hsla(var(--lph),30%,50%,.25);overflow:hidden}
#ui.wol .lp-ph span{padding:6%;font-weight:800;font-size:.78em;line-height:1.2;text-align:center;color:hsl(var(--lph) 30% 30%)}
#ui.wol .lp-img{display:block;object-fit:cover;aspect-ratio:1}
`;
