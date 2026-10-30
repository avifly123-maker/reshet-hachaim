// Icons of the learning hub (מרכז הלמידה), its games and the start screen's learn tab.
// Same hand as the icons in ui.js: a 24×24 box, round caps and joins, a 2 px line in currentColor, and a soft fill
// (class "f") under the outline. ui.js `icon(name)` draws these as well, so every screen asks for icons the same way.
// Rules: no cross shapes (no plus, no x, no crosshair, no four-armed sparkle), no human figures, no hands.
// Check every new path on the sheet: node tools/icon-sheet.mjs, then look at the PNG.

// a five-point star (never four arms): cx, cy, outer and inner radius
function star(cx, cy, R, r) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, k = i % 2 ? r : R;
    d += (i ? 'L' : 'M') + (cx + k * Math.cos(a)).toFixed(2) + ' ' + (cy + k * Math.sin(a)).toFixed(2);
  }
  return d + 'z';
}

export const HUB_ICONS = {
  // החידון: a speech bubble with a question mark
  quiz: '<path class="f" d="M6.5 3.5h11A2.5 2.5 0 0 1 20 6v7.5a2.5 2.5 0 0 1-2.5 2.5H11l-4 3.5V16h-.5A2.5 2.5 0 0 1 4 13.5V6a2.5 2.5 0 0 1 2.5-2.5z"/>'
    + '<path d="M6.5 3.5h11A2.5 2.5 0 0 1 20 6v7.5a2.5 2.5 0 0 1-2.5 2.5H11l-4 3.5V16h-.5A2.5 2.5 0 0 1 4 13.5V6a2.5 2.5 0 0 1 2.5-2.5z"/>'
    + '<path d="M10 8a2.1 2.1 0 1 1 3 1.9c-.6.3-1 .8-1 1.4v.2"/><circle cx="12" cy="13.4" r=".9" fill="currentColor" stroke="none"/>',
  // אלבום הקלפים: an open album, a card on each page
  album: '<path class="f" d="M2.8 6.6c3-1.3 6.1-1.2 9.2.8 3.1-2 6.2-2.1 9.2-.8v12.2c-3-1.3-6.1-1.2-9.2.8-3.1-2-6.2-2.1-9.2-.8z"/>'
    + '<path d="M2.8 6.6c3-1.3 6.1-1.2 9.2.8 3.1-2 6.2-2.1 9.2-.8v12.2c-3-1.3-6.1-1.2-9.2.8-3.1-2-6.2-2.1-9.2-.8z"/><path d="M12 7.4v12.2"/>'
    + '<rect x="5.2" y="9" width="4.2" height="5.6" rx=".8" stroke-width="1.6"/><rect x="14.6" y="9" width="4.2" height="5.6" rx=".8" stroke-width="1.6"/>',
  // a wrapped card pack: crimped ends and a round seal
  pack: '<path class="f" d="M6 5h12v14H6z"/>'
    + '<path d="M6 5.2V19M18 5.2V19"/><path d="M6 5.2l1.5-1.5L9 5.2l1.5-1.5L12 5.2l1.5-1.5L15 5.2l1.5-1.5L18 5.2M6 18.8l1.5 1.5L9 18.8l1.5 1.5 1.5-1.5 1.5 1.5 1.5-1.5 1.5 1.5 1.5-1.5"/>'
    + '<circle cx="12" cy="12" r="2.6"/><path d="M6 12h3.4M14.6 12H18" stroke-width="1.6"/>',
  // התגים: a medallion on two ribbon tails (the tails never meet or cross)
  medal: '<path class="f" d="M9.3 14.3L7.9 21l2.2-1 1.3 1.8.6-6M14.7 14.3l1.4 6.7-2.2-1-1.3 1.8-.6-6"/>'
    + '<path d="M9.3 14.3L7.9 21l2.2-1 1.3 1.8M14.7 14.3l1.4 6.7-2.2-1-1.3 1.8"/>'
    + '<circle class="f" cx="12" cy="9.2" r="5.8"/><circle cx="12" cy="9.2" r="5.8"/>'
    + `<path d="${star(12, 9.4, 3, 1.3)}" fill="currentColor" stroke="none"/>`,
  // חוט הקשר: two creatures joined by a curving thread
  thread: '<circle class="f" cx="5.5" cy="17.5" r="3"/><circle cx="5.5" cy="17.5" r="3"/><circle class="f" cx="18.5" cy="6.5" r="3"/><circle cx="18.5" cy="6.5" r="3"/>'
    + '<path d="M8 15.8c3.4-1.8 1-5.6 4.4-6.6 1.6-.5 2.6.3 3.6-.6"/><circle cx="11.2" cy="11.6" r=".9" fill="currentColor" stroke="none"/>',
  // מחזיקים את הסביבה: a young tree (a wide, bumpy crown) cradled by two leaves
  keep: '<path class="f" d="M7.6 10.4a2.7 2.7 0 0 1 .1-5.4 4.5 4.5 0 0 1 8.6-.3 2.8 2.8 0 0 1 .3 5.7z"/><path d="M7.6 10.4a2.7 2.7 0 0 1 .1-5.4 4.5 4.5 0 0 1 8.6-.3 2.8 2.8 0 0 1 .3 5.7z"/><path d="M12 10.4v9.4M12 13.4l-1.6-1.4"/>'
    + '<path class="f" d="M12 20.2c-4 0-7-2-8-5.8 4 0 7 2 8 5.8zM12 20.2c4 0 7-2 8-5.8-4 0-7 2-8 5.8z"/>'
    + '<path d="M12 20.2c-4 0-7-2-8-5.8 4 0 7 2 8 5.8zM12 20.2c4 0 7-2 8-5.8-4 0-7 2-8 5.8z"/>',
  // מי חזק ברשת?: a web of links around one strong node
  strong: '<circle class="f" cx="13.5" cy="13.5" r="4.6"/><circle cx="13.5" cy="13.5" r="4.6"/>'
    + '<circle cx="5" cy="5.5" r="2"/><circle cx="19.5" cy="4" r="1.7"/><circle cx="4.5" cy="19.5" r="1.7"/>'
    + '<path d="M6.5 7l3.7 3.4M18.7 5.6l-2.6 4.1M6.1 18.4l3.6-2.3M5 7.5v10.3" stroke-width="1.7"/>'
    + `<path d="${star(13.5, 13.7, 2.4, 1)}" fill="currentColor" stroke="none"/>`,
  // הממציאים: a light bulb with a leaf inside (ideas taken from nature)
  invent: '<path class="f" d="M12 2.8a6.2 6.2 0 0 0-3.7 11.2c.6.5 1 1.2 1 2v.4h5.4V16c0-.8.4-1.5 1-2A6.2 6.2 0 0 0 12 2.8z"/>'
    + '<path d="M12 2.8a6.2 6.2 0 0 0-3.7 11.2c.6.5 1 1.2 1 2v.4h5.4V16c0-.8.4-1.5 1-2A6.2 6.2 0 0 0 12 2.8z"/><path d="M9.6 19h4.8M10.6 21.6h2.8"/>'
    + '<path d="M9.7 12.1c-.1-2.9 1.7-4.9 4.8-5.1.1 2.9-1.7 4.9-4.8 5.1zM9.7 12.1l2.6-2.7" stroke-width="1.6"/>',
  // משלחת לעומק: a diving mask and rising bubbles
  dive: '<path class="f" d="M3.5 12.6c0-1.6 1.3-2.9 2.9-2.9h11.2c1.6 0 2.9 1.3 2.9 2.9v2.6c0 1.8-1.4 3.2-3.2 3.2h-2.1c-1.2 0-1.9-1.7-3.2-1.7s-2 1.7-3.2 1.7H6.7c-1.8 0-3.2-1.4-3.2-3.2z"/>'
    + '<path d="M3.5 12.6c0-1.6 1.3-2.9 2.9-2.9h11.2c1.6 0 2.9 1.3 2.9 2.9v2.6c0 1.8-1.4 3.2-3.2 3.2h-2.1c-1.2 0-1.9-1.7-3.2-1.7s-2 1.7-3.2 1.7H6.7c-1.8 0-3.2-1.4-3.2-3.2z"/>'
    + '<path d="M3.5 13.5H2M20.5 13.5H22"/><circle cx="9" cy="5.6" r="1.6"/><circle cx="12.6" cy="3.2" r="1"/><circle cx="15.6" cy="6" r=".8" fill="currentColor" stroke="none"/>',
  // מרכז הלמידה: an open book with a sprout
  learn: '<path class="f" d="M2.8 9c3-1.3 6.1-1.2 9.2.8 3.1-2 6.2-2.1 9.2-.8v10.4c-3-1.3-6.1-1.2-9.2.8-3.1-2-6.2-2.1-9.2-.8z"/>'
    + '<path d="M2.8 9c3-1.3 6.1-1.2 9.2.8 3.1-2 6.2-2.1 9.2-.8v10.4c-3-1.3-6.1-1.2-9.2.8-3.1-2-6.2-2.1-9.2-.8z"/><path d="M12 9.8v10.4"/>'
    + '<path d="M12 8.6V5.8"/><path class="f" d="M12 6.2C12 4.3 10.7 3 8.7 3c0 1.9 1.3 3.2 3.3 3.2zM12 5.6c0-1.7 1.2-2.9 3-2.9 0 1.7-1.2 2.9-3 2.9z"/><path d="M12 6.2C12 4.3 10.7 3 8.7 3c0 1.9 1.3 3.2 3.3 3.2zM12 5.6c0-1.7 1.2-2.9 3-2.9 0 1.7-1.2 2.9-3 2.9z" stroke-width="1.6"/>',
  // play again: one round arrow
  again: '<path d="M5.2 12.8A7 7 0 1 0 7.4 6.6"/><path d="M7.6 2.8v4h-4" />',
  // the album's sets: three cards in a stack
  sets: '<rect class="f" x="9" y="3" width="11" height="14.5" rx="2"/><rect x="9" y="3" width="11" height="14.5" rx="2"/><path d="M6.5 5.5v12.5a2 2 0 0 0 2 2H17"/><path d="M4 8v12a2 2 0 0 0 2 2h8.5"/>',
  // a place on the map (בחירת מקום)
  place: '<path class="f" d="M12 21.2s-6.3-5.6-6.3-10.9a6.3 6.3 0 0 1 12.6 0c0 5.3-6.3 10.9-6.3 10.9z"/><path d="M12 21.2s-6.3-5.6-6.3-10.9a6.3 6.3 0 0 1 12.6 0c0 5.3-6.3 10.9-6.3 10.9z"/><circle cx="12" cy="10.2" r="2.3"/>',
  // stages (שלבים): steps going up to a flag
  levels: '<path d="M3 20h4.5v-4h4.5v-4h4.5V8H20"/><path d="M20 8V2.8"/><path class="f" d="M20 3l-4 1.6L20 6.2z"/><path d="M20 3l-4 1.6L20 6.2"/>',
  // zones: the Amazon (a big tropical leaf), the grove (an acorn of the oak), the reef (branching coral), all of them
  amazon: '<path class="f" d="M6.3 17.7C3.4 14.2 4 8.6 8.4 5.8 12 3.5 16.6 3.3 20.4 3.6c.3 3.8.1 8.4-2.2 12-2.8 4.4-8.4 5-11.9 2.1z"/>'
    + '<path d="M6.3 17.7C3.4 14.2 4 8.6 8.4 5.8 12 3.5 16.6 3.3 20.4 3.6c.3 3.8.1 8.4-2.2 12-2.8 4.4-8.4 5-11.9 2.1z"/>'
    + '<path d="M3.2 20.8L16.6 7.4"/><path d="M8.6 15.4l-1.4-5M11.6 12.4l-.7-5.2M10.2 13.8l5.2 1.1M13.2 10.8l5 .5" stroke-width="1.6"/>',
  grove: '<path class="f" d="M7 10.6v1.2c0 4.2 2.3 7.6 5 8.7 2.7-1.1 5-4.5 5-8.7v-1.2z"/><path d="M7 10.6v1.2c0 4.2 2.3 7.6 5 8.7 2.7-1.1 5-4.5 5-8.7v-1.2"/>'
    + '<path class="f" d="M4.8 10.6c0-3.7 3.2-6.2 7.2-6.2s7.2 2.5 7.2 6.2z"/><path d="M4.8 10.6c0-3.7 3.2-6.2 7.2-6.2s7.2 2.5 7.2 6.2z"/><path d="M12 4.4c0-1.2.6-2 1.6-2.4"/>'
    + '<circle cx="9.2" cy="8" r=".7" fill="currentColor" stroke="none"/><circle cx="12.4" cy="7.3" r=".7" fill="currentColor" stroke="none"/><circle cx="15.3" cy="8.4" r=".7" fill="currentColor" stroke="none"/>',
  reef: '<path d="M7.5 21h9"/><path d="M12 21v-6.2c0-2.6-3.3-3.4-3.3-6.6V5.4M12 14.8c0-2.4 3.4-3 3.4-6.2V6.4M8.7 9.4c-2.2 0-3.6-1.3-3.6-3.9M15.4 10.2c2 0 3.5-1.1 3.5-3.5"/>'
    + '<circle cx="8.7" cy="4.4" r="1.1" fill="currentColor" stroke="none"/><circle cx="15.4" cy="5.3" r="1.1" fill="currentColor" stroke="none"/><circle cx="5.1" cy="4.5" r="1" fill="currentColor" stroke="none"/><circle cx="18.9" cy="5.6" r="1" fill="currentColor" stroke="none"/>',
  // the desert (1.4): a dune under the sun
  desert: '<circle class="f" cx="16.5" cy="7" r="3.2"/><circle cx="16.5" cy="7" r="3.2"/>'
    + '<path class="f" d="M2.5 19.5c3.2-5 7.6-6.6 11.4-4.4 2.4 1.4 4.6 1.6 7.6.8v3.6z"/><path d="M2.5 19.5c3.2-5 7.6-6.6 11.4-4.4 2.4 1.4 4.6 1.6 7.6.8"/><path d="M2.5 19.5h19"/>',
  zones: '<circle class="f" cx="12" cy="8.2" r="4.6"/><circle cx="12" cy="8.2" r="4.6"/><circle cx="8" cy="15" r="4.6"/><circle cx="16" cy="15" r="4.6"/>',
  // technology cards: a small robot head with one antenna
  robot: '<rect class="f" x="4.5" y="7.5" width="15" height="11.5" rx="3.6"/><rect x="4.5" y="7.5" width="15" height="11.5" rx="3.6"/>'
    + '<path d="M12 7.5V5"/><circle cx="12" cy="3.6" r="1.3"/><circle cx="9.3" cy="13" r="1.4" fill="currentColor" stroke="none"/><circle cx="14.7" cy="13" r="1.4" fill="currentColor" stroke="none"/>'
    + '<path d="M2.5 12v3M21.5 12v3"/>',
  // torah sources (מן המקורות): a scroll on two rollers
  scroll: '<path class="f" d="M6.5 5.5h11v13h-11z"/><path d="M6.5 5.5h11M6.5 18.5h11"/>'
    + '<rect x="3.5" y="3.5" width="3" height="17" rx="1.5"/><rect x="17.5" y="3.5" width="3" height="17" rx="1.5"/>'
    + '<path d="M9.3 9.2h5.4M9.3 12h5.4M9.3 14.8h3.4" stroke-width="1.6"/>',
  // חוקרי הטבע: a magnifying glass over a leaf
  research: '<circle class="f" cx="10.5" cy="10.5" r="6.3"/><circle cx="10.5" cy="10.5" r="6.3"/><path d="M15.2 15.2l5.3 5.3" stroke-width="2.6"/>'
    + '<path d="M7.8 13.2c-.1-2.8 1.6-4.8 4.9-5 .1 2.8-1.6 4.8-4.9 5zM7.8 13.2l2.6-2.6" stroke-width="1.6"/>',
  // a picture frame for the album cards (מסגרות)
  frame: '<rect class="f" x="4" y="3.5" width="16" height="17" rx="2.4"/><rect x="4" y="3.5" width="16" height="17" rx="2.4"/><rect x="7.5" y="7" width="9" height="10" rx="1.2" stroke-width="1.6"/>',
  // the lab (המעבדה): a round flask with bubbles
  lab: '<path class="f" d="M7 13.6a5.5 5.5 0 1 0 10 0z"/><path d="M10 3h4M10.6 3v5.6a6.6 6.6 0 1 0 2.8 0V3"/><path d="M7 13.6h10" stroke-width="1.6"/><circle cx="10.6" cy="16.6" r=".9" fill="currentColor" stroke="none"/><circle cx="13.6" cy="17.8" r=".7" fill="currentColor" stroke="none"/>',
};

// one colour per game / place: the tile behind its icon, on the start screen and in the hub alike
export const TILE_TONE = {
  learn: '#3d7a3a', quiz: '#2f7a52', album: '#a8641a', strong: '#b2492e', keep: '#2b7268', thread: '#a3466e',
  invent: '#3a4d5c', dive: '#22648c', medal: '#8e6a12', scroll: '#8a6420', lab: '#3a4d5c', research: '#3f6a2e',
  amazon: '#2f7a52', grove: '#9a6a1a', reef: '#22648c', desert: '#a8702a', zones: '#4f6a3a', robot: '#3a4d5c',
};
// the svg the same way ui.js icon() draws it (class "ic": the game's CSS sizes it and softens the "f" fill)
export const hubIcon = (n, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${HUB_ICONS[n] || ''}</svg>`;
// the icon in a coloured rounded square (like the lab's menus); cls names the tile for the CSS of the screen it is on
export const tileIcon = (n, cls = 'hic-tile') => `<i class="${cls}" style="--tc:${TILE_TONE[n] || '#3a4d5c'}" aria-hidden="true">${hubIcon(n)}</i>`;
