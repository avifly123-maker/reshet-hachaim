// The badge medallion (תג): a gold scalloped rim, a ring in the group's colour, the card painting in the middle and a
// ribbon with the name. Locked badges are drawn as a grey medallion with a question mark and how to earn it.
// `peek`: a locked badge that is the next goal (the hub's showcase): grey, but its painting and name show through.
import { CARD_ART } from '../data/card-art.js';
import { BADGE_GROUPS } from '../data/badges.js';
const RIM = 'M50.00 1.40 L51.57 2.19 L53.01 4.10 L54.33 6.05 L55.66 6.97 L57.19 6.43 L58.97 4.88 L60.86 3.41 L62.58 3.06 L63.89 4.22 L64.79 6.44 L65.56 8.67 L66.61 9.90 L68.23 9.77 L70.35 8.74 L72.55 7.81 L74.30 7.91 L75.26 9.38 L75.56 11.75 L75.72 14.10 L76.42 15.57 L78.02 15.86 L80.33 15.42 L82.70 15.08 L84.37 15.63 L84.92 17.30 L84.58 19.67 L84.14 21.98 L84.43 23.58 L85.90 24.28 L88.25 24.44 L90.62 24.74 L92.09 25.70 L92.19 27.45 L91.26 29.65 L90.23 31.77 L90.10 33.39 L91.33 34.44 L93.56 35.21 L95.78 36.11 L96.94 37.42 L96.59 39.14 L95.12 41.03 L93.57 42.81 L93.03 44.34 L93.95 45.67 L95.90 46.99 L97.81 48.43 L98.60 50.00 L97.81 51.57 L95.90 53.01 L93.95 54.33 L93.03 55.66 L93.57 57.19 L95.12 58.97 L96.59 60.86 L96.94 62.58 L95.78 63.89 L93.56 64.79 L91.33 65.56 L90.10 66.61 L90.23 68.23 L91.26 70.35 L92.19 72.55 L92.09 74.30 L90.62 75.26 L88.25 75.56 L85.90 75.72 L84.43 76.42 L84.14 78.02 L84.58 80.33 L84.92 82.70 L84.37 84.37 L82.70 84.92 L80.33 84.58 L78.02 84.14 L76.42 84.43 L75.72 85.90 L75.56 88.25 L75.26 90.62 L74.30 92.09 L72.55 92.19 L70.35 91.26 L68.23 90.23 L66.61 90.10 L65.56 91.33 L64.79 93.56 L63.89 95.78 L62.58 96.94 L60.86 96.59 L58.97 95.12 L57.19 93.57 L55.66 93.03 L54.33 93.95 L53.01 95.90 L51.57 97.81 L50.00 98.60 L48.43 97.81 L46.99 95.90 L45.67 93.95 L44.34 93.03 L42.81 93.57 L41.03 95.12 L39.14 96.59 L37.42 96.94 L36.11 95.78 L35.21 93.56 L34.44 91.33 L33.39 90.10 L31.77 90.23 L29.65 91.26 L27.45 92.19 L25.70 92.09 L24.74 90.62 L24.44 88.25 L24.28 85.90 L23.58 84.43 L21.98 84.14 L19.67 84.58 L17.30 84.92 L15.63 84.37 L15.08 82.70 L15.42 80.33 L15.86 78.02 L15.57 76.42 L14.10 75.72 L11.75 75.56 L9.38 75.26 L7.91 74.30 L7.81 72.55 L8.74 70.35 L9.77 68.23 L9.90 66.61 L8.67 65.56 L6.44 64.79 L4.22 63.89 L3.06 62.58 L3.41 60.86 L4.88 58.97 L6.43 57.19 L6.97 55.66 L6.05 54.33 L4.10 53.01 L2.19 51.57 L1.40 50.00 L2.19 48.43 L4.10 46.99 L6.05 45.67 L6.97 44.34 L6.43 42.81 L4.88 41.03 L3.41 39.14 L3.06 37.42 L4.22 36.11 L6.44 35.21 L8.67 34.44 L9.90 33.39 L9.77 31.77 L8.74 29.65 L7.81 27.45 L7.91 25.70 L9.38 24.74 L11.75 24.44 L14.10 24.28 L15.57 23.58 L15.86 21.98 L15.42 19.67 L15.08 17.30 L15.63 15.63 L17.30 15.08 L19.67 15.42 L21.98 15.86 L23.58 15.57 L24.28 14.10 L24.44 11.75 L24.74 9.38 L25.70 7.91 L27.45 7.81 L29.65 8.74 L31.77 9.77 L33.39 9.90 L34.44 8.67 L35.21 6.44 L36.11 4.22 L37.42 3.06 L39.14 3.41 L41.03 4.88 L42.81 6.43 L44.34 6.97 L45.67 6.05 L46.99 4.10 L48.43 2.19Z';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const grp = (id) => BADGE_GROUPS.find((g) => g.id === id) || BADGE_GROUPS[0];

export function badgeHTML(b, { own = true, cls = '', how = false, peek = false } = {}) {
  const g = grp(b.group), art = CARD_ART[b.art] || '';
  peek = !own && peek;
  return `<div class="bdg${own ? '' : ' locked'}${peek ? ' peek' : ''} ${cls}" style="--b1:${g.col};--b2:${g.col2}" title="${esc(own ? b.name : 'עוד לא: ' + b.how)}">
    <div class="bdg-med"><svg class="bdg-rim" viewBox="0 0 100 100" aria-hidden="true">
      <path d="${RIM}" class="bdg-gold"/><circle cx="50" cy="50" r="40.5" class="bdg-ring"/><circle cx="50" cy="50" r="40.5" class="bdg-ring2"/></svg>
      <span class="bdg-img">${(own || peek) && art ? `<img src="${art}" alt="" draggable="false">` : '<b>?</b>'}</span><i class="bdg-shine"></i></div>
    <div class="bdg-rib"><span>${esc(own || peek ? b.name : 'תג נעול')}</span></div>${how ? `<small class="bdg-how">${esc(b.how)}</small>` : ''}</div>`;
}

export const BADGE_CSS = `
.bdg{--bs:6.4em;display:flex;flex-direction:column;align-items:center;gap:.15em;width:calc(var(--bs) * 1.25);text-align:center}
.bdg-med{position:relative;width:var(--bs);height:var(--bs);filter:drop-shadow(0 .35em .5em rgba(0,0,0,.45))}
.bdg-rim{position:absolute;inset:0;width:100%;height:100%}
.bdg-gold{fill:#e2b247;stroke:#a8741c;stroke-width:1.2}
.bdg-ring{fill:var(--b1)}
.bdg-ring2{fill:none;stroke:#fbe7a8;stroke-width:1.4;stroke-dasharray:2.2 2.4}
.bdg-img{position:absolute;left:15%;top:15%;width:70%;height:70%;border-radius:50%;overflow:hidden;background:#f3ead0;box-shadow:inset 0 0 0 .18em var(--b2),inset 0 .3em .6em rgba(0,0,0,.35);display:grid;place-items:center}
.bdg-img img{width:100%;height:100%;object-fit:cover;display:block}
.bdg-img b{font-family:var(--serif,serif);font-size:calc(var(--bs) * .38);color:#8a8470}
.bdg-shine{position:absolute;inset:0;border-radius:50%;background:linear-gradient(135deg,rgba(255,255,255,.45),rgba(255,255,255,0) 40%);pointer-events:none}
.bdg-rib{margin-top:-.7em;position:relative;z-index:1;padding:.18em .75em;border-radius:.35em;background:linear-gradient(180deg,color-mix(in srgb,var(--b1) 85%,#fff),var(--b1));color:#fffbe9;font-weight:800;font-size:calc(var(--bs) * .135);white-space:nowrap;box-shadow:0 .15em .3em rgba(0,0,0,.35)}
.bdg-how{font-size:calc(var(--bs) * .12);color:#cfc6a8;line-height:1.3}
.bdg.locked .bdg-gold{fill:#9a9686;stroke:#6e6a5c}.bdg.locked .bdg-ring{fill:#5c5a52}.bdg.locked .bdg-ring2{stroke:#a9a594}.bdg.locked .bdg-rib{background:#6e6a5c}
.bdg.locked .bdg-med{filter:grayscale(1) drop-shadow(0 .3em .4em rgba(0,0,0,.35));opacity:.8}
.bdg.peek .bdg-med{opacity:.95}.bdg.peek .bdg-img img{opacity:.55}.bdg.peek .bdg-rib{background:#7e7866}
`;
