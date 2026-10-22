// מרכז הלמידה – drawing a card: the front (cardHTML), the back, a card that flips, the rarity gems, and the CSS
// of the Blender frames around album cards.
// Exports: IC_GEM, IC_KEY, gems, artStyle, cardHTML, backHTML, flipHTML, FRAME_CSS.
// Needs: base.js (words, icons, esc), card paintings' focus (data/art-focus.js), frame pictures (data/frame-art.js).
import { artPos } from '../../data/art-focus.js';
import { defName, gw } from '../../data/common.js';
import { FRAME_ART } from '../../data/frame-art.js';
import { BIOME_IN, BIOME_SHORT, IC, KEYS_LAND, RARITY_GEMS, RARITY_MORE, RARITY_NAMES, RARITY_POWER, RARITY_TIP, STAT_HELP, STAT_ICON, STAT_NAMES, esc, rgba, sv } from './base.js';

/* ───────────────────────────────────────────── card rendering */
// rarity is shown as faceted gems (not stars – stars are the score of a game): 1–3 lit out of 3, a gear for tools
export const IC_GEM = sv('<path d="M7 3.6h10l4.4 5.6L12 20.8 2.6 9.2z" fill="currentColor"/><path d="M2.6 9.2h18.8M9.2 3.6L7.6 9.2 12 20.8l4.4-11.6-1.6-5.6" stroke="#fff" stroke-opacity=".55" stroke-width="1.1" fill="none" stroke-linejoin="round"/>');
export const IC_KEY = sv('<circle cx="8.2" cy="8.2" r="5" fill="none" stroke="currentColor" stroke-width="2.7"/><path d="M11.8 11.8l8.6 8.6M16.4 16.4l2.7-2.7M18.9 18.9l2.3-2.3" stroke="currentColor" stroke-width="2.7" stroke-linecap="round"/>');
const IC_GEAR = sv('<circle cx="12" cy="12" r="3.4" fill="currentColor"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>');
export function gems(r) {
  if (r === 'tech') return `<span class="wl-gem t">${IC_GEAR}</span>`;
  const n = RARITY_GEMS[r] || 1;
  return [0, 1, 2].map((k) => `<span class="wl-gem${k < n ? ' on' : ''}">${IC_GEM}</span>`).join('');
}
const badgeTip = (c) => (c.type === 'tool' ? 'כלי טכנולוגי שעוזר לשמור על הטבע' : `${defName(c.sp.id, c.name)} ${gw(c.sp.id, 'גר', 'גרה', 'גרים', 'גרות')} ${BIOME_IN[c.biome]}`);
export function artStyle(color) { return `background:radial-gradient(circle at 50% 38%, ${rgba(color, 0.55)}, ${rgba(color, 0.12)} 62%, transparent 72%), linear-gradient(180deg, #fbf6e5, #e9dfc2)`; }
export function cardHTML(c, o = {}) {
  if (o.locked) {
    return `<div class="wl-card is-locked ${o.cls || ''}" data-cid="${esc(c.id)}" style="${o.style || ''}" aria-label="קלף שעוד לא נאסף">
      <div class="wl-cin"><div class="wl-sil">${c.img ? `<img src="${c.img}" alt="" draggable="false">` : ''}</div><b class="wl-qm">?</b>
      <span class="wl-lockb">${c.type === 'tool' ? 'טכנולוגיה' : BIOME_SHORT[c.biome]}</span></div></div>`;
  }
  const badge = c.type === 'tool' ? `<span class="wl-badge b-tech" title="${esc(badgeTip(c))}">טכנולוגיה</span>` : `<span class="wl-badge b-${c.biome}" title="${esc(badgeTip(c))}">${BIOME_SHORT[c.biome]}</span>`;
  const stats = (c.sk || KEYS_LAND).map((k) => `<span class="wl-st s-${k}${o.hl === k ? ' hl' : ''}" title="${STAT_NAMES[k]} – ${STAT_HELP[k]}"><i>${STAT_ICON[k]}</i><b>${c.stats[k]}</b><small>${STAT_NAMES[k]}</small></span>`).join('');
  return `<div class="wl-card r-${c.rarity} ${o.cls || ''}" data-cid="${esc(c.id)}" style="${o.style || ''}">
    <div class="wl-cin">
      <div class="wl-ctop"><span class="wl-cname${c.name.length > 12 ? ' xl' : c.name.length > 9 ? ' l' : ''}">${esc(c.name)}</span>${badge}</div>
      ${c.art ? `<div class="wl-cart paint"><img src="${c.art}" alt="${esc(c.name)}" draggable="false" style="${artPos(c.type === 'tool' ? c.tool.id : c.sp.id)}"></div>` : `<div class="wl-cart${c.type === 'tool' ? ' tool' : ''}" style="${artStyle(c.color)}">${c.img ? `<img src="${c.img}" alt="${esc(c.name)}" draggable="false">` : `<b>${esc(c.name[0])}</b>`}</div>`}
      <div class="wl-ctype"><span>${esc(c.kind)}</span><span class="wl-gems" title="${RARITY_TIP[c.rarity]}">${gems(c.rarity)}</span></div>
      <div class="wl-stats">${stats}</div>
      <p class="wl-cfact">${esc(c.short)}</p>
      <div class="wl-crar" title="${RARITY_TIP[c.rarity]}. ${RARITY_POWER[c.rarity] || RARITY_MORE[c.rarity]}">${c.type === 'tool' ? 'קלף טכנולוגיה' : c.rarity === 'epic' ? 'נדיר מאוד · מין מפתח' : 'נדירות: ' + RARITY_NAMES[c.rarity]}</div>
    </div>${o.isNew ? '<span class="wl-new">חדש!</span>' : ''}${o.count > 1 ? `<span class="wl-cnt" title="${o.count} עותקים">${o.count}</span>` : ''}</div>`;
}
export const backHTML = () => `<div class="wl-card wl-cback"><div class="wl-cin"><div class="wl-emb">${IC.web}</div><span>רשת החיים</span></div></div>`;
export function flipHTML(c, o = {}) {
  return `<div class="wl-flip${o.up ? ' is-up' : ''} ${o.cls || ''}" style="${o.style || ''}" data-cid="${esc(c ? c.id : '')}">
    <div class="wl-fin"><div class="wl-face wl-fback">${backHTML()}</div><div class="wl-face wl-ffront">${c ? cardHTML(c, o) : ''}</div></div></div>`;
}

/* ───────────────────────────────────────────── album frames from Blender (art/frames/<id>.png → src/data/frame-art.js)
   A frame with a picture is drawn by border-image (9-slice: the corners keep their ornament, the edges stretch along the
   card); one without keeps its box-shadow frame below. */
const FRAME_SLICE = '22%';
export const FRAME_CSS = Object.keys(FRAME_ART || {}).map((id) => `
.wol-learn .fr-${id}.wl-card,.wol-learn .wl-frame.fr-${id} .wl-fsw{box-shadow:0 .5em 1em rgba(0,0,0,.35)}
.wol-learn .fr-${id}.wl-card::before,.wol-learn .wl-frame.fr-${id} .wl-fsw::before{content:"";position:absolute;inset:-.5em;z-index:4;pointer-events:none;
  border:1.15em solid transparent;border-image:url("${FRAME_ART[id]}") ${FRAME_SLICE} / 1.15em / 0 stretch}
.wol-learn .wl-frame.fr-${id} .wl-fsw{position:relative}
.wol-learn .wl-frame.fr-${id} .wl-fsw::before{inset:-.35em;border-width:.8em;border-image-width:.8em}`).join('');
