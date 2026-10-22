// The UI's icon set: hand-drawn inline SVG bodies (I) and icon(name, cls), which many files import through ui.js.
// icon() also draws the learning hub's icons (icons-hub.js). tools/icon-sheet.mjs reads the I table from this file.
// Exports: icon.
import { HUB_ICONS } from '../icons-hub.js';   // the learning hub's icons: icon() draws them too

/* ------------------------------------------------------------------ icons (hand-drawn inline SVG) */
const I = {
  // two-tone "ink stamp" icons: a soft fill (class f) under a hand-weight outline
  leaf: '<path class="f" d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15z"/><path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15z"/><path d="M5 19c3-5 6-8 10-10"/>',
  sprout: '<path class="f" d="M12 12C12 8 9 6 5 6c0 4 3 6 7 6zM12 10c0-4 3-6 7-6 0 4-3 6-7 6z"/><path d="M12 21v-9"/><path d="M12 12C12 8 9 6 5 6c0 4 3 6 7 6z"/><path d="M12 10c0-4 3-6 7-6 0 4-3 6-7 6z"/><path d="M8 21h8"/>',
  paw: '<circle cx="6.5" cy="10" r="1.9"/><circle cx="10" cy="6" r="1.9"/><circle cx="14.5" cy="6" r="1.9"/><circle cx="18" cy="10" r="1.9"/><path class="f" d="M12.2 11.5c-2.8 0-5.2 3.1-5.2 5.4 0 1.5 1.2 2.3 2.5 2.3 1 0 1.7-.6 2.7-.6s1.7.6 2.7.6c1.3 0 2.5-.8 2.5-2.3 0-2.3-2.4-5.4-5.2-5.4z"/><path d="M12.2 11.5c-2.8 0-5.2 3.1-5.2 5.4 0 1.5 1.2 2.3 2.5 2.3 1 0 1.7-.6 2.7-.6s1.7.6 2.7.6c1.3 0 2.5-.8 2.5-2.3 0-2.3-2.4-5.4-5.2-5.4z"/>',
  web: '<circle class="f" cx="12" cy="13" r="4.6"/><circle cx="12" cy="13" r="2"/><circle cx="12" cy="3.8" r="1.6"/><circle cx="4" cy="18.6" r="1.6"/><circle cx="20" cy="18.6" r="1.6"/><path d="M12 5.4V11M5.4 17.8l4.9-3.4M18.6 17.8l-4.9-3.4M10.6 4.6L4.8 17.2M13.4 4.6l5.8 12.6M5.6 18.8h12.8"/>',
  lock: '<rect class="f" x="5" y="11" width="14" height="9.5" rx="2.2"/><rect x="5" y="11" width="14" height="9.5" rx="2.2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  pause: '<path d="M9 6v12M15 6v12" stroke-width="2.8"/>',
  play: '<path d="M8 5.5l11 6.5-11 6.5z" fill="currentColor"/>',
  fast: '<path d="M3.5 6l8 6-8 6zM12 6l8 6-8 6z" fill="currentColor"/>',
  sun: '<circle class="f" cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
  moon: '<path class="f" d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.3 6.3 0 0 0 10 10z"/><path d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.3 6.3 0 0 0 10 10z"/>',
  // field notebook with an elastic band
  book: '<path class="f" d="M6 3.5h11a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H6z"/><path d="M6 3.5h11a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H6z"/><path d="M6 3.5v17M4.5 7.5H7.5M4.5 12H7.5M4.5 16.5H7.5"/><path d="M15 3.5v17" stroke-width="2.4"/>',
  help: '<circle class="f" cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="9"/><path d="M9.5 9.6a2.6 2.6 0 1 1 3.7 2.3c-.8.4-1.2 1-1.2 1.8v.4"/><circle cx="12" cy="17.2" r=".7" fill="currentColor"/>',
  // a little forest hut instead of a generic house
  home: '<path class="f" d="M6 10.5l6-6 6 6V20H6z"/><path d="M3 12.5L12 4l9 8.5"/><path d="M6 10.5V20h12v-9.5"/><path d="M10 20v-5h4v5"/><path d="M15.5 6.5V4h2v4.3"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/>',
  sound: '<path class="f" d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9.2a4 4 0 0 1 0 5.6M18 6.8a7.4 7.4 0 0 1 0 10.4"/>',
  mute: '<path class="f" d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 12h5"/>',
  // background music: two beamed notes; off = one note and a bar (like mute: no slash across a stem)
  music: '<ellipse class="f" cx="7" cy="17.5" rx="2.8" ry="2.2"/><ellipse class="f" cx="17" cy="15.5" rx="2.8" ry="2.2"/><ellipse cx="7" cy="17.5" rx="2.8" ry="2.2"/><ellipse cx="17" cy="15.5" rx="2.8" ry="2.2"/><path d="M9.8 17.3V6.2l10-2.2v11.3"/>',
  musicOff: '<ellipse class="f" cx="7" cy="17.5" rx="2.8" ry="2.2"/><ellipse cx="7" cy="17.5" rx="2.8" ry="2.2"/><path d="M9.8 17.3V5c1.2 2.4 4.5 3 4.5 6"/><path d="M16 14.5h5"/>',
  lightmap: '<circle class="f" cx="12" cy="7" r="2.6"/><circle cx="12" cy="7" r="2.6"/><path d="M12 1.8v1.3M7.4 3.4l.9.9M16.6 3.4l-.9.9M6 7h1.2M16.8 7H18"/><path class="f" d="M2.5 15.5L12 12l9.5 3.5L12 19z"/><path d="M2.5 15.5L12 12l9.5 3.5L12 19z"/><path d="M5.5 15.5h13"/>',
  gear: '<path d="M18.69 9.35 L21.38 9.96 L21.38 14.04 L18.69 14.65 L18.61 14.86 L20.07 17.19 L17.19 20.07 L14.86 18.61 L14.65 18.69 L14.04 21.38 L9.96 21.38 L9.35 18.69 L9.14 18.61 L6.81 20.07 L3.93 17.19 L5.39 14.86 L5.31 14.65 L2.62 14.04 L2.62 9.96 L5.31 9.35 L5.39 9.14 L3.93 6.81 L6.81 3.93 L9.14 5.39 L9.35 5.31 L9.96 2.62 L14.04 2.62 L14.65 5.31 L14.86 5.39 L17.19 3.93 L20.07 6.81 L18.61 9.14 Z" stroke-linejoin="round"/><circle cx="12" cy="12" r="3"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/>',
  close: '<circle cx="12" cy="12" r="8"/><path d="M8.2 12h7.6"/>',   // no X anywhere: a circle with a bar
  binoc: '<circle class="f" cx="6.5" cy="15.5" r="3.8"/><circle class="f" cx="17.5" cy="15.5" r="3.8"/><circle cx="6.5" cy="15.5" r="3.8"/><circle cx="17.5" cy="15.5" r="3.8"/><path d="M4 12.5L6.2 5h3l.8 7M20 12.5L17.8 5h-3l-.8 7M10.3 15h3.4"/>',
  flask: '<path class="f" d="M7.2 15h9.6l2.6 3.4A1.8 1.8 0 0 1 17.8 21H6.2a1.8 1.8 0 0 1-1.6-2.6z"/><path d="M9 3h6M10 3v6.2L4.6 18.4A1.8 1.8 0 0 0 6.2 21h11.6a1.8 1.8 0 0 0 1.6-2.6L14 9.2V3"/><path d="M7.2 15h9.6"/>',
  sparkle: '<path d="M12.0 3.1 L14.4 9.3 L21.0 9.7 L15.9 13.9 L17.6 20.3 L12.0 16.7 L6.4 20.3 L8.1 13.9 L3.0 9.7 L9.6 9.3z" fill="currentColor" stroke="none" stroke-linejoin="round"/>',   // a five-point star (a four-point sparkle looks like a cross)
  drop: '<path class="f" d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
  flower: '<circle cx="12" cy="12" r="2.3" fill="currentColor"/><circle class="f" cx="12" cy="6.3" r="2.6"/><circle class="f" cx="17.4" cy="10.2" r="2.6"/><circle class="f" cx="15.3" cy="16.6" r="2.6"/><circle class="f" cx="8.7" cy="16.6" r="2.6"/><circle class="f" cx="6.6" cy="10.2" r="2.6"/><circle cx="12" cy="6.3" r="2.6"/><circle cx="17.4" cy="10.2" r="2.6"/><circle cx="15.3" cy="16.6" r="2.6"/><circle cx="8.7" cy="16.6" r="2.6"/><circle cx="6.6" cy="10.2" r="2.6"/>',
  autumn: '<path class="f" d="M12 16l-6-2 1.5-2-3-3 3.5-.5L7 5l3.5 1.5L12 3l1.5 3.5L17 5l-1 3.5 3.5.5-3 3 1.5 2z"/><path d="M12 21v-5"/><path d="M12 16l-6-2 1.5-2-3-3 3.5-.5L7 5l3.5 1.5L12 3l1.5 3.5L17 5l-1 3.5 3.5.5-3 3 1.5 2z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5" stroke-width="2.6"/>',
  // a seed packet being sealed: "save the forest"
  save: '<path class="f" d="M6 3.5h12V20.5H6z"/><path d="M6 3.5h12v17H6z"/><path d="M6 7.5h12"/><path d="M12 11c-2.2 1.2-2.6 3.8-1 5.6 2.4-.4 3.4-2.6 2.6-5 .2 1.6-.4 3-1.6 3.8"/>',
  tree: '<path class="f" d="M12 3C8 3 5 5.8 5 9.3S8 15 12 15s7-2.2 7-5.7S16 3 12 3z"/><path d="M12 21.5V15"/><path d="M12 3C8 3 5 5.8 5 9.3S8 15 12 15s7-2.2 7-5.7S16 3 12 3z"/><path d="M9 21.5h6"/>',
  chevron: '<path d="M8 10l4 4 4-4"/>',
  bulb: '<path class="f" d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
  arrowL: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  search: '<circle class="f" cx="10.5" cy="10.5" r="6"/><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/>',
  cards: '<rect class="f" x="8" y="4" width="11" height="15" rx="2"/><rect x="8" y="4" width="11" height="15" rx="2"/><path d="M5.5 7.5v11a2 2 0 0 0 2 2h8"/>',
  versus: '<rect class="f" x="3" y="5" width="8" height="12" rx="1.6" transform="rotate(-8 7 11)"/><rect x="3" y="5" width="8" height="12" rx="1.6" transform="rotate(-8 7 11)"/><rect x="13" y="7" width="8" height="12" rx="1.6" transform="rotate(8 17 13)"/>',
  undo: '<path d="M9 7L4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 0 12h-2" transform="translate(0 -6)"/>',
  bang: '<path d="M12 6v8" stroke-width="2.6"/><circle cx="12" cy="18" r="1.3" fill="currentColor" stroke="none"/>',
  hourglass: '<circle cx="12" cy="13" r="8"/><path d="M12 8.5V13l3 2M9.5 2.5h5"/>',
  pencil: '<path class="f" d="M5 16.5L15.8 5.7l2.5 2.5L7.5 19H5z"/><path d="M5 16.5L15.8 5.7l2.5 2.5L7.5 19H5z"/><path d="M13.8 7.7l2.5 2.5"/>',
  plus: '<path d="M12 5v7.5M5 12.5h14" stroke-width="2.4"/>',   // the plus of the children's schools: the stem stops at the bar
  trash: '<path d="M5 7h14"/><path d="M9.5 7V5h5v2"/><path class="f" d="M6.5 7l1 12.5h9l1-12.5"/><path d="M6.5 7l1 12.5h9l1-12.5"/><path d="M10.3 10.5v6M13.7 10.5v6"/>',
  // the naturalist's satchel: the game menu
  satchel: '<path class="f" d="M4 9h16v10.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5z"/><path d="M4 9h16v10.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5z"/><path d="M4 9l2-4h12l2 4"/><path d="M9.5 9v4.2a2.5 2.5 0 0 0 5 0V9"/><circle cx="12" cy="13.3" r=".8" fill="currentColor"/>',
  info: '<circle class="f" cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r=".9" fill="currentColor"/>',
  quality: '<path class="f" d="M3 18l5.5-8 4 5.5 2.5-3.5L21 18z"/><path d="M3 18l5.5-8 4 5.5 2.5-3.5L21 18z"/><circle cx="16.5" cy="6.5" r="2"/>',
};
export const icon = (n, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${I[n] || HUB_ICONS[n] || ''}</svg>`;
