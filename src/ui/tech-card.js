// One technology card (1.4.3, set 3), the same face in the album (src/learn/hub/album.js), in the zoom window and in the
// drop-in announcement (src/ui/badge-toast.js). Data: src/data/robolab/tech-cards.js; owned: src/robolab/progress.js `tc`.
// Its own look (a blueprint-blue card with a coloured band and the icon in a ring), so it is never taken for a nature card.
//   techCardHTML(c, { own, kids, cls, attrs })   techZoomHTML(c, { kids })   ensureTechCSS()
import { BLOCK_ICONS } from '../robolab/ui/icons.js';
import { TECH_GROUPS } from '../data/robolab/tech-cards.js';
import { earnWords } from '../robolab/earn-words.js';
import { TECH_ART } from '../data/tech-card-art.js';   // 1.4.3 set 4: a painting per card (tools/build-tech-art.py)

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const T = (o, kids) => (o ? (kids && o.k ? o.k : o.f) : '');
const LOCK = BLOCK_ICONS.lock || '';
// a picture for each card (the game's rules: no cross or plus shapes, so the wheel has five spokes and the sun is a ring
// of dots; the drone has three rotors like the game's drone)
const S = (body) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const spokes = (n, r0, r1) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 - Math.PI / 2; return `<path d="M${(12 + Math.cos(a) * r0).toFixed(1)} ${(12 + Math.sin(a) * r0).toFixed(1)}L${(12 + Math.cos(a) * r1).toFixed(1)} ${(12 + Math.sin(a) * r1).toFixed(1)}"/>`; }).join('');
const ring = (n, r, rr) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return `<circle cx="${(12 + Math.cos(a) * r).toFixed(1)}" cy="${(12 + Math.sin(a) * r).toFixed(1)}" r="${rr}"/>`; }).join('');
const gear = Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; const p = (r, d) => `${(12 + Math.cos(a + d) * r).toFixed(1)} ${(12 + Math.sin(a + d) * r).toFixed(1)}`; return `${i ? 'L' : 'M'}${p(6.6, -0.22)}L${p(9, -0.14)}L${p(9, 0.14)}L${p(6.6, 0.22)}`; }).join('') + 'Z';
export const TECH_ICONS = {
  controller: S('<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>'),
  wheel: S('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2"/>' + spokes(5, 2.2, 8.2)),
  claw: S('<path d="M12 3v6"/><path d="M12 9c-4 0-6 3-6 6s2 5 4 5"/><path d="M12 9c4 0 6 3 6 6s-2 5-4 5"/><circle cx="12" cy="17" r="2"/>'),
  camera: S('<path d="M2.5 12c3-5 6.2-7 9.5-7s6.5 2 9.5 7c-3 5-6.2 7-9.5 7s-6.5-2-9.5-7z"/><circle cx="12" cy="12" r="3.4"/><circle cx="13.2" cy="10.8" r=".9" fill="currentColor"/>'),
  echo: S('<circle cx="5" cy="12" r="2"/><path d="M9 8a6 6 0 0 1 0 8"/><path d="M12.5 5.5a10 10 0 0 1 0 13"/><path d="M19 9v6" stroke-width="3"/>'),
  gears: S('<path d="' + gear + '"/><circle cx="12" cy="12" r="2.6"/>'),
  tracks: S('<rect x="2.5" y="9" width="19" height="9" rx="4.5"/><circle cx="7" cy="13.5" r="2"/><circle cx="12" cy="13.5" r="2"/><circle cx="17" cy="13.5" r="2"/><path d="M7 9V6h10v3"/>'),
  gyro: S('<circle cx="12" cy="12" r="8"/><ellipse cx="12" cy="12" rx="8" ry="3" transform="rotate(-25 12 12)"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/>'),
  solar: S('<circle cx="12" cy="12" r="4"/>' + ring(8, 8, 1.1)),
  drone: S('<circle cx="12" cy="13" r="2.6"/><path d="M12 10.4V6M9.8 14.3l-4 2.3M14.2 14.3l4 2.3"/><ellipse cx="12" cy="5" rx="3.2" ry="1"/><ellipse cx="4.8" cy="17.2" rx="3.2" ry="1" transform="rotate(-30 4.8 17.2)"/><ellipse cx="19.2" cy="17.2" rx="3.2" ry="1" transform="rotate(30 19.2 17.2)"/>'),
  sub: S('<path d="M3 13c0-3 3-5 8-5h4c4 0 6 2 6 5s-2 5-6 5h-4c-5 0-8-2-8-5z"/><path d="M11 8V5h3"/><circle cx="15" cy="13" r="1.6"/><path d="M3 10v6"/>'),
  farm: S('<path d="M12 21v-8"/><path d="M12 13c-5 0-7-3-7-7 4 0 7 2 7 7z"/><path d="M12 15c4 0 6-2 6-5-3 0-6 1-6 5z"/><path d="M4 21h16"/>'),
  team: S('<circle cx="12" cy="5.5" r="2.5"/><circle cx="5.5" cy="17" r="2.5"/><circle cx="18.5" cy="17" r="2.5"/><path d="M10.6 7.6L6.9 14.8M13.4 7.6l3.7 7.2M8 17h8" stroke-dasharray="1.5 2"/>'),
  snake: S('<path d="M4 18c3 0 3-5 6-5s3 5 6 5 3-6 0-8-6 0-6-3 3-4 5.5-4"/><circle cx="18" cy="3.2" r="2" fill="currentColor"/>'),
  rover: S('<rect x="6" y="6" width="12" height="6" rx="1.5"/><path d="M12 6V3.5"/><circle cx="12" cy="3" r=".8"/><path d="M4 16l4-4h8l4 4"/><circle cx="4" cy="18" r="2"/><circle cx="12" cy="18" r="2"/><circle cx="20" cy="18" r="2"/>'),
};
const groupName = (c, kids) => T(TECH_GROUPS.find((g) => g.id === c.group), kids);

export function techCardHTML(c, { own = true, kids = false, cls = '', attrs = '' } = {}) {
  const ic = own ? (TECH_ICONS[c.id] || BLOCK_ICONS[c.icon] || BLOCK_ICONS.robot) : LOCK;
  const art = own && TECH_ART[c.id];   // the painting, with the card's sign in a small ring on its corner
  return `<button type="button" class="tc-card${own ? '' : ' locked'}${art ? ' art' : ''}${cls ? ' ' + cls : ''}" style="--tc:${c.col}" ${attrs}>
    <span class="tc-band">${esc(kids ? 'קְלַף טֶכְנוֹלוֹגְיָה' : 'קלף טכנולוגיה')}</span>
    ${art ? `<span class="tc-pic"><img src="${art}" alt="" draggable="false"><span class="tc-ic">${ic}</span></span>` : `<span class="tc-ic">${ic}</span>`}
    <b>${own ? esc(T(c.title, kids)) : esc(kids ? 'עוֹד לֹא נִפְתַּח' : 'עוד לא נפתח')}</b>
    <small>${own ? esc(groupName(c, kids)) : esc(earnWords(c.earn, kids))}</small></button>`;
}

export function techZoomHTML(c, { kids = false } = {}) {
  return `<div class="tc-zoom" style="--tc:${c.col}">
    ${techCardHTML(c, { kids, cls: 'big', attrs: 'tabindex="-1"' })}
    <div class="tc-text"><h3>${esc(T(c.title, kids))}</h3>
      <p class="tc-what">${esc(T(c.what, kids))}</p>
      ${c.nature ? `<p class="tc-nat"><b>${esc(kids ? 'רַעְיוֹן מֵהַטֶּבַע:' : 'רעיון מהטבע:')}</b> ${esc(T(c.nature, kids))}</p>` : ''}
    </div></div>`;
}

export function ensureTechCSS() {
  if (document.getElementById('wol-tech-css')) return;
  const st = document.createElement('style'); st.id = 'wol-tech-css';
  st.textContent = `
.tc-card{--tc:#3b82c4;position:relative;display:flex;flex-direction:column;align-items:center;gap:.35em;width:8.6em;min-height:11.4em;padding:0 .5em .7em;border:0;border-radius:.9em;cursor:pointer;font:inherit;color:#eaf3ff;text-align:center;overflow:hidden;
  background:linear-gradient(180deg,#1d3b5e,#14293f);box-shadow:0 .35em .9em rgba(0,0,0,.35),inset 0 0 0 2px color-mix(in srgb,var(--tc) 55%,transparent);
  background-image:linear-gradient(180deg,#1d3b5e,#14293f),repeating-linear-gradient(0deg,rgba(255,255,255,.05) 0 1px,transparent 1px 14px),repeating-linear-gradient(90deg,rgba(255,255,255,.05) 0 1px,transparent 1px 14px);background-blend-mode:normal,overlay,overlay}
.tc-card:hover{transform:translateY(-2px)}
.tc-band{align-self:stretch;margin:0 -.5em;padding:.3em .4em;background:var(--tc);color:#fff;font-size:.72em;font-weight:700;letter-spacing:.02em}
.tc-ic{display:grid;place-items:center;width:4.2em;height:4.2em;margin-top:.4em;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--tc) 40%,#14293f),#14293f 72%);box-shadow:inset 0 0 0 2px var(--tc)}
.tc-ic svg{width:2.5em;height:2.5em;color:#fff}
.tc-card b{font-size:1em;line-height:1.2}
.tc-card small{font-size:.74em;color:#b9cde6;line-height:1.3}
.tc-card.locked{filter:saturate(.25);opacity:.7}
.tc-pic{position:relative;display:block;align-self:stretch;margin-top:.45em;aspect-ratio:1;border-radius:.6em;overflow:visible;box-shadow:0 0 0 2px var(--tc)}
.tc-pic img{display:block;width:100%;height:100%;object-fit:cover;border-radius:.6em}
.tc-pic .tc-ic{position:absolute;bottom:-.7em;inset-inline-end:-.3em;width:2.3em;height:2.3em;margin:0;background:#14293f}
.tc-pic .tc-ic svg{width:1.35em;height:1.35em}
.tc-card.art b{margin-top:.35em}
.tc-card.big .tc-pic .tc-ic{width:2.6em;height:2.6em;margin:0}.tc-card.big .tc-pic .tc-ic svg{width:1.5em;height:1.5em}
#wol-learn .wl-grid .tc-card .tc-pic .tc-ic{width:2.3em;height:2.3em;margin:0}#wol-learn .wl-grid .tc-card .tc-pic .tc-ic svg{width:1.35em;height:1.35em}
.tc-card.locked .tc-ic svg{width:1.8em;height:1.8em;opacity:.8}
.tc-card.big{flex:none;width:10em;min-height:13.4em;cursor:default}
.tc-card.big .tc-ic{width:5.4em;height:5.4em;margin-top:.8em}.tc-card.big .tc-ic svg{width:3.2em;height:3.2em}
.tc-zoom{display:flex;gap:1.2em;align-items:center;direction:rtl}
.tc-text{flex:1;min-width:14em;max-width:24em}
.tc-text h3{margin:0 0 .4em}
.tc-text p{margin:0 0 .6em;line-height:1.5}
.tc-nat{padding:.5em .7em;border-radius:.6em;background:color-mix(in srgb,var(--tc) 14%,#fff8e8)}
#wol-learn .wl-grid .tc-card{width:10em;height:14.2em;min-height:0;font-size:1em;animation:none}
#wol-learn .wl-grid .tc-card .tc-ic{width:5em;height:5em;margin-top:.9em}#wol-learn .wl-grid .tc-card .tc-ic svg{width:2.9em;height:2.9em}
#wol-learn.wol-learn .tc-card{background:linear-gradient(180deg,#1d3b5e,#14293f);color:#eaf3ff}#wol-learn.wol-learn .tc-card b{color:#fff}
#wol-learn.wol-learn .wl-mtext.wl-tcwin{width:min(36em,88vw);align-items:center;gap:.6em}
#wol-learn .wl-tcwin .tc-text h3{font-size:1.7em}#wol-learn .wl-tcwin .tc-text p{font-size:1.02em;margin:0 0 .45em}
@media (max-height:520px){.tc-card.big{width:8.6em;min-height:11.4em;font-size:.92em}.tc-card.big .tc-ic{width:4.4em;height:4.4em}.tc-zoom{gap:.8em}.tc-text p{font-size:.92em}}`;
  document.head.appendChild(st);
}
