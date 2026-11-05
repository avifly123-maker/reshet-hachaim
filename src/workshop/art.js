// הסדנה של ניצוץ: the drawings (1.4.4, Avi 5.11: "a computer game, not homework": pictures, machines, light motion).
// Hand-drawn SVG in one warm palette, light to load, sharp at any size, animated with CSS (src/ui/css/workshop.css).
// No cross shapes anywhere: no plus signs, no crossed tools, ladders' rungs end at the rails, wheels have round holes.
//   thingSVG(id)    the ten things of the idea machine
//   stationSVG(id)  the seven places of the room (each with a part that moves: .mv-*)
//   machineSVG(thingId)  the big idea machine (hopper, window, lights, chute)
//   blenderSVG()    the nature mixer's jar between the two drums
//   catIcon(cat)    the kinds of ideas on an invention card
const S = (vb, body, cls = '') => `<svg class="wsa ${cls}" viewBox="${vb}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
const INK = '#4a2d16';

const THING = {
  umbrella: `<path d="M8 30 Q32 2 56 30 Q50 26 44 30 Q38 26 32 30 Q26 26 20 30 Q14 26 8 30Z" fill="#e8574a" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M20 30 Q26 12 32 6 Q38 12 44 30" fill="none" stroke="#b83a30" stroke-width="2"/>
    <path d="M32 30 V52 Q32 58 26 58 Q21 58 21 53" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`,
  chair: `<rect x="18" y="6" width="28" height="26" rx="5" fill="#d08a3e" stroke="${INK}" stroke-width="2.5"/>
    <rect x="14" y="32" width="36" height="9" rx="3" fill="#e9a457" stroke="${INK}" stroke-width="2.5"/>
    <path d="M18 41 V58 M46 41 V58" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
    <path d="M23 13 H41 M23 20 H41" stroke="#b56d2a" stroke-width="2" stroke-linecap="round"/>`,
  bottle: `<path d="M26 4 H38 V12 Q38 16 42 20 Q46 24 46 32 V54 Q46 60 40 60 H24 Q18 60 18 54 V32 Q18 24 22 20 Q26 16 26 12Z" fill="#7cc4e8" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="25" y="2" width="14" height="7" rx="2" fill="#2f7a5a" stroke="${INK}" stroke-width="2"/>
    <path d="M23 34 Q24 48 30 54" fill="none" stroke="#e6f6ff" stroke-width="3" stroke-linecap="round" opacity=".8"/>`,
  shoe: `<path d="M6 40 Q6 26 14 24 Q22 24 26 30 Q32 36 44 38 Q58 40 58 48 V50 H6Z" fill="#4f8fd8" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M6 50 H58 V54 Q58 57 55 57 H9 Q6 57 6 54Z" fill="#f5f1e8" stroke="${INK}" stroke-width="2.5"/>
    <path d="M24 32 L30 30 M28 35 L34 33" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`,
  bucket: `<path d="M12 22 H52 L46 58 H18Z" fill="#f2c443" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M12 22 Q32 -4 52 22" fill="none" stroke="${INK}" stroke-width="2.5"/>
    <ellipse cx="32" cy="22" rx="20" ry="4" fill="#5aa6d6" stroke="${INK}" stroke-width="2"/>
    <path d="M18 34 H46" stroke="#d6a52a" stroke-width="2.5"/>`,
  bag: `<rect x="14" y="14" width="36" height="44" rx="9" fill="#3a9a6a" stroke="${INK}" stroke-width="2.5"/>
    <path d="M24 14 Q24 4 32 4 Q40 4 40 14" fill="none" stroke="${INK}" stroke-width="3"/>
    <rect x="20" y="34" width="24" height="16" rx="4" fill="#4fb880" stroke="${INK}" stroke-width="2"/>
    <path d="M24 38 H40" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`,
  ladder: `<path d="M18 4 L14 60 M46 4 L50 60" stroke="#b56d2a" stroke-width="5" stroke-linecap="round"/>
    <path d="M19 14 H45 M18 26 H46 M17 38 H47 M16 50 H48" stroke="#d08a3e" stroke-width="4" stroke-linecap="butt"/>`,
  pillow: `<path d="M8 18 Q8 10 16 12 Q32 6 48 12 Q56 10 56 18 Q60 32 56 46 Q56 54 48 52 Q32 58 16 52 Q8 54 8 46 Q4 32 8 18Z" fill="#c9a8e8" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M18 24 Q32 20 46 24" fill="none" stroke="#e8d8f6" stroke-width="3" stroke-linecap="round"/>`,
  spoon: `<ellipse cx="32" cy="17" rx="12" ry="14" fill="#cfd8e0" stroke="${INK}" stroke-width="2.5"/>
    <path d="M30 31 L28 60 Q32 62 36 60 L34 31" fill="#b8c4ce" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <ellipse cx="28" cy="13" rx="4" ry="6" fill="#f4f8fb" opacity=".8"/>`,
  ball: `<circle cx="32" cy="32" r="25" fill="#f5f1e8" stroke="${INK}" stroke-width="2.5"/>
    <path d="M10 22 Q32 30 54 22 Q54 28 56 32 Q32 40 8 32 Q8 27 10 22Z" fill="#e8574a"/>
    <path d="M12 44 Q32 50 52 44 Q48 50 44 53 Q32 56 20 53 Q15 50 12 44Z" fill="#4f8fd8"/>
    <circle cx="32" cy="32" r="25" fill="none" stroke="${INK}" stroke-width="2.5"/>`,
};
export const thingSVG = (id) => S('0 0 64 64', THING[id] || '', 'thing');

// ── the seven places (120 x 100), each with something that moves
const STATION = {
  machine: `<rect x="22" y="30" width="76" height="58" rx="10" fill="#e08a32" stroke="${INK}" stroke-width="3"/>
    <path d="M36 30 L28 8 H92 L84 30Z" fill="#c76b22" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="34" y="42" width="40" height="26" rx="6" fill="#2b1a0c" stroke="${INK}" stroke-width="2.5"/>
    <circle class="mv-blink" cx="44" cy="55" r="5" fill="#ffd24a"/><circle class="mv-blink d2" cx="56" cy="55" r="5" fill="#7cd8a0"/><circle class="mv-blink d3" cx="66" cy="55" r="4" fill="#ff8a7a"/>
    <g class="mv-lever"><path d="M98 64 L112 44" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><circle cx="112" cy="44" r="7" fill="#e8574a" stroke="${INK}" stroke-width="2.5"/></g>
    <path d="M40 88 V96 M80 88 V96" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <path class="mv-pop" d="M84 70 q8 -4 14 0" fill="none" stroke="#ffd24a" stroke-width="3" stroke-linecap="round"/>`,
  mixer: `<path d="M30 94 H90 L84 72 H36Z" fill="#6b3f1d" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="60" cy="84" r="5" fill="#ffd24a" class="mv-blink"/>
    <path d="M38 72 L32 14 H88 L82 72Z" fill="#bfe6f5" fill-opacity=".75" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <g class="mv-swirl"><path d="M60 46 m-14 0 a14 10 0 1 0 28 0" fill="none" stroke="#2f7a5a" stroke-width="4" stroke-linecap="round"/>
      <path d="M48 36 q6 -10 14 -6 q-4 8 -14 6Z" fill="#4fb880" stroke="${INK}" stroke-width="1.5"/>
      <path d="M66 56 q10 -2 10 8 q-8 0 -10 -8Z" fill="#e8574a" stroke="${INK}" stroke-width="1.5"/></g>
    <rect x="30" y="8" width="60" height="9" rx="3" fill="#e08a32" stroke="${INK}" stroke-width="3"/>`,
  cards: `<g transform="rotate(-14 60 60)"><rect x="30" y="18" width="40" height="58" rx="6" fill="#3a6b4a" stroke="${INK}" stroke-width="3"/><circle cx="50" cy="47" r="10" fill="none" stroke="#9fe0b0" stroke-width="3"/></g>
    <g transform="rotate(4 60 60)"><rect x="42" y="14" width="40" height="58" rx="6" fill="#e08a32" stroke="${INK}" stroke-width="3"/><circle cx="62" cy="43" r="10" fill="none" stroke="#ffe0a0" stroke-width="3"/></g>
    <g class="mv-flip"><rect x="54" y="20" width="40" height="58" rx="6" fill="#fffaf0" stroke="${INK}" stroke-width="3"/>
      <circle cx="74" cy="44" r="11" fill="#ffd24a" stroke="${INK}" stroke-width="2.5"/><path d="M74 37 V44 L79 47" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M62 62 H86 M66 69 H82" stroke="#c79b62" stroke-width="3" stroke-linecap="round"/></g>`,
  build: `<rect x="10" y="58" width="100" height="10" rx="3" fill="#b56d2a" stroke="${INK}" stroke-width="3"/>
    <path d="M18 68 V94 M102 68 V94" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <rect x="22" y="36" width="24" height="22" rx="3" fill="#7cc4e8" stroke="${INK}" stroke-width="2.5"/>
    <circle class="mv-bob" cx="62" cy="46" r="11" fill="#e8574a" stroke="${INK}" stroke-width="2.5"/>
    <path d="M80 58 c0 -4 12 -4 12 -8 c0 -4 -12 -4 -12 -8 c0 -4 12 -4 12 -8" fill="none" stroke="#4a5a68" stroke-width="3" stroke-linecap="round" class="mv-spring"/>
    <path d="M30 20 L46 10 L62 20" fill="none" stroke="#ffd24a" stroke-width="3" stroke-linecap="round" class="mv-blink"/>`,
  test: `<rect x="10" y="30" width="80" height="44" rx="22" fill="#cfe8f5" stroke="${INK}" stroke-width="3"/>
    <rect x="10" y="30" width="80" height="44" rx="22" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 8" opacity=".7"/>
    <g class="mv-wind"><path d="M22 44 h18 M18 52 h26 M24 60 h16" stroke="#5a9ac8" stroke-width="3" stroke-linecap="round"/></g>
    <path d="M58 52 L74 46 L74 58Z" fill="#e8574a" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="100" cy="52" r="15" fill="#6b3f1d" stroke="${INK}" stroke-width="3"/>
    <g class="mv-fan" style="transform-origin:100px 52px"><path d="M100 52 L100 40 Q106 42 100 52 M100 52 L110 58 Q104 62 100 52 M100 52 L90 58 Q90 52 100 52" fill="#ffd24a" stroke="${INK}" stroke-width="1.5"/></g>
    <path d="M30 74 V92 M70 74 V92" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`,
  orders: `<rect x="14" y="10" width="92" height="74" rx="6" fill="#c9965a" stroke="${INK}" stroke-width="3"/>
    <rect x="22" y="18" width="34" height="28" rx="2" fill="#fffaf0" stroke="${INK}" stroke-width="2" transform="rotate(-5 39 32)"/>
    <rect x="62" y="20" width="34" height="26" rx="2" fill="#ffe6a8" stroke="${INK}" stroke-width="2" transform="rotate(4 79 33)" class="mv-sway"/>
    <rect x="34" y="52" width="40" height="26" rx="2" fill="#dff3e4" stroke="${INK}" stroke-width="2" transform="rotate(3 54 65)"/>
    <circle cx="39" cy="19" r="3.5" fill="#e8574a"/><circle cx="79" cy="21" r="3.5" fill="#4f8fd8"/><circle cx="54" cy="53" r="3.5" fill="#3a9a6a"/>
    <path d="M28 30 H50 M28 36 H44 M68 32 H90 M40 64 H68" stroke="#9a7a5a" stroke-width="2" stroke-linecap="round"/>`,
  patent: `<rect x="18" y="12" width="70" height="78" rx="4" fill="#fffaf0" stroke="${INK}" stroke-width="3"/>
    <rect x="24" y="18" width="58" height="66" rx="2" fill="none" stroke="#e0b860" stroke-width="2"/>
    <path d="M32 32 H74 M32 42 H68 M32 52 H72" stroke="#b9a07a" stroke-width="2.5" stroke-linecap="round"/>
    <g class="mv-stamp"><circle cx="82" cy="72" r="15" fill="#e8574a" stroke="${INK}" stroke-width="2.5"/>
      <path d="M82 62 L85 69 L92 69 L86 74 L88 81 L82 77 L76 81 L78 74 L72 69 L79 69Z" fill="#ffd24a" stroke="${INK}" stroke-width="1.2"/></g>
    <path d="M76 86 L72 98 L80 94 L84 98 L86 86" fill="#c8402f" stroke="${INK}" stroke-width="2"/>`,
};
export const stationSVG = (id) => S('0 0 120 100', STATION[id] || '', 'station st-' + id);

// ── the idea machine itself (320 x 210): the thing shows in its window; .wm-machine.run makes it go
export const machineSVG = (thing) => S('0 0 320 210', `
  <defs><linearGradient id="wmBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0a043"/><stop offset="1" stop-color="#c76b22"/></linearGradient>
    <radialGradient id="wmWin" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#3a2410"/><stop offset="1" stop-color="#1a0f06"/></radialGradient></defs>
  <path d="M110 58 L92 8 H228 L210 58Z" fill="#b8601e" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
  <path d="M104 14 H216" stroke="#e8a457" stroke-width="4" stroke-linecap="round"/>
  <rect x="40" y="56" width="240" height="128" rx="22" fill="url(#wmBody)" stroke="${INK}" stroke-width="4"/>
  <rect x="96" y="72" width="128" height="92" rx="16" fill="url(#wmWin)" stroke="${INK}" stroke-width="4"/>
  <svg class="wm-thing" x="124" y="86" width="72" height="72" viewBox="0 0 64 64">${THING[thing] || '<text x="32" y="44" text-anchor="middle" font-size="34" fill="#ffd24a">?</text>'}</svg>
  <path d="M104 80 Q112 74 124 76" stroke="#fff" stroke-width="3" fill="none" opacity=".25" stroke-linecap="round"/>
  <g class="wm-lights"><circle cx="64" cy="80" r="9" fill="#ffd24a" stroke="${INK}" stroke-width="2.5"/><circle cx="64" cy="108" r="9" fill="#7cd8a0" stroke="${INK}" stroke-width="2.5"/><circle cx="64" cy="136" r="9" fill="#ff8a7a" stroke="${INK}" stroke-width="2.5"/>
    <circle cx="256" cy="80" r="9" fill="#7cc4e8" stroke="${INK}" stroke-width="2.5"/><circle cx="256" cy="108" r="9" fill="#ffd24a" stroke="${INK}" stroke-width="2.5"/><circle cx="256" cy="136" r="9" fill="#c9a8e8" stroke="${INK}" stroke-width="2.5"/></g>
  <g class="wm-dial"><circle cx="64" cy="162" r="11" fill="#fffaf0" stroke="${INK}" stroke-width="2.5"/><path d="M64 162 L70 155" stroke="#e8574a" stroke-width="3" stroke-linecap="round"/></g>
  <path d="M226 184 L246 202 H290 L272 184Z" fill="#8a4a18" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
  <path d="M74 184 V204 M150 184 V204" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
  <g class="wm-steam"><circle cx="150" cy="40" r="7" fill="#fff" opacity=".7"/><circle cx="168" cy="30" r="9" fill="#fff" opacity=".55"/><circle cx="186" cy="38" r="6" fill="#fff" opacity=".6"/></g>`, 'machine');

export const blenderSVG = () => S('0 0 120 150', `
  <path d="M26 146 H94 L86 118 H34Z" fill="#6b3f1d" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
  <circle cx="60" cy="132" r="6" fill="#ffd24a" class="mv-blink"/>
  <path d="M34 118 L26 18 H94 L86 118Z" fill="#cfeefa" fill-opacity=".8" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
  <g class="wx-swirl" style="transform-origin:60px 72px">
    <path d="M60 72 m-22 0 a22 16 0 1 0 44 0 a16 11 0 1 0 -32 0" fill="none" stroke="#2f7a5a" stroke-width="4" stroke-linecap="round"/>
    <path d="M42 50 q8 -14 20 -8 q-6 12 -20 8Z" fill="#4fb880" stroke="${INK}" stroke-width="1.8"/>
    <path d="M66 92 q14 -2 14 10 q-12 0 -14 -10Z" fill="#e8574a" stroke="${INK}" stroke-width="1.8"/>
    <circle cx="74" cy="56" r="5" fill="#ffd24a" stroke="${INK}" stroke-width="1.5"/></g>
  <rect x="22" y="10" width="76" height="12" rx="4" fill="#e08a32" stroke="${INK}" stroke-width="3.5"/>`, 'blender');

// the kind of an idea, as a small round badge on its card
const CAT = {
  home: `<path d="M5 13 L12 6 L19 13 V20 H5Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>`,
  move: `<circle cx="7" cy="17" r="3" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="17" cy="17" r="3" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M4 12 H16 L19 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`,
  water: `<path d="M12 4 Q19 13 19 16 A7 7 0 0 1 5 16 Q5 13 12 4Z" fill="none" stroke="currentColor" stroke-width="2.2"/>`,
  food: `<path d="M6 10 H18 Q18 20 12 20 Q6 20 6 10Z M9 7 Q10 4 12 6 Q14 4 15 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>`,
  shield: `<path d="M12 4 L19 7 V12 Q19 18 12 21 Q5 18 5 12 V7Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>`,
  sound: `<path d="M5 10 H9 L14 6 V18 L9 14 H5Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M17 9 Q19 12 17 15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`,
  nature: `<path d="M6 19 C6 10 11 5 19 5 C19 13 14 19 6 19Z M6 19 L13 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`,
  fun: `<path d="M12 4 L14.5 9.5 L20 10 L16 14 L17 20 L12 17 L7 20 L8 14 L4 10 L9.5 9.5Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>`,
};
export const catIcon = (cat) => `<svg class="wsa cat" viewBox="0 0 24 24" aria-hidden="true">${CAT[cat] || CAT.fun}</svg>`;
// a tiny clock for the constraint cards
export const clockSVG = () => `<svg class="wsa clk" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8" fill="#ffd24a" stroke="${INK}" stroke-width="2"/><path d="M12 8 V13 L15.5 15" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/><path d="M9 3 H15" stroke="${INK}" stroke-width="2" stroke-linecap="round"/></svg>`;

// ── set 4: the build table's pieces, the six stations and the world's clients (64 x 64 unless said)
const SHAPE = {
  box: `<path d="M14 24 L32 14 L50 24 V44 L32 54 L14 44Z" fill="#e9a457" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M14 24 L32 34 L50 24 M32 34 V54" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M32 34 L50 24 V44 L32 54Z" fill="#c76b22" opacity=".5"/>`,
  ball: `<circle cx="32" cy="34" r="20" fill="#e9a457" stroke="${INK}" stroke-width="2.5"/><ellipse cx="25" cy="27" rx="6" ry="4" fill="#fff" opacity=".5"/>`,
  tube: `<path d="M12 26 H48 V42 H12Z" fill="#e9a457" stroke="${INK}" stroke-width="2.5"/><ellipse cx="48" cy="34" rx="5" ry="8" fill="#c76b22" stroke="${INK}" stroke-width="2.5"/><ellipse cx="12" cy="34" rx="5" ry="8" fill="#e9a457" stroke="${INK}" stroke-width="2.5"/>`,
  cone: `<path d="M10 34 L50 22 Q56 34 50 46Z" fill="#e9a457" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><ellipse cx="50" cy="34" rx="5" ry="12" fill="#c76b22" stroke="${INK}" stroke-width="2.5"/>`,
  plate: `<path d="M6 36 L26 26 H58 L38 36Z" fill="#e9a457" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M6 36 V42 H38 L58 32 V26 M38 36 V42" fill="#c76b22" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`,
  dome: `<path d="M10 44 Q10 18 32 18 Q54 18 54 44Z" fill="#e9a457" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><ellipse cx="32" cy="44" rx="22" ry="4" fill="#c76b22" stroke="${INK}" stroke-width="2.5"/><ellipse cx="24" cy="27" rx="5" ry="3" fill="#fff" opacity=".5"/>`,
};
export const shapeSVG = (id) => S('0 0 64 64', SHAPE[id] || '', 'piece');
const MECH = {
  spring: `<path d="M20 14 H44 M20 50 H44" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M32 14 c12 3 12 6 0 9 c-12 3 -12 6 0 9 c12 3 12 6 0 9 c-12 3 -12 6 0 9" fill="none" stroke="#6a7a88" stroke-width="3.5"/>`,
  wheel: `<circle cx="32" cy="32" r="20" fill="#2a2a2e" stroke="${INK}" stroke-width="2.5"/><circle cx="32" cy="32" r="12" fill="#5a5a62"/><circle cx="32" cy="32" r="6" fill="#ffcc33" stroke="${INK}" stroke-width="2"/>`,
  pipe: `<path d="M14 46 H34 Q42 46 42 38 V14" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M14 46 H34 Q42 46 42 38 V14" fill="none" stroke="#9aa6b2" stroke-width="7" stroke-linecap="round"/>`,
  pump: `<rect x="20" y="28" width="24" height="26" rx="4" fill="#9aa6b2" stroke="${INK}" stroke-width="2.5"/><path d="M32 28 V10" stroke="${INK}" stroke-width="3.5"/><path d="M22 10 H42" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M44 40 H54 V48" fill="none" stroke="${INK}" stroke-width="3"/><path d="M54 52 q0 4 0 6" stroke="#4fa8d8" stroke-width="3" stroke-linecap="round"/>`,
  fan: `<circle cx="32" cy="32" r="22" fill="#fffaf0" stroke="${INK}" stroke-width="2.5"/><g class="mv-fan" style="transform-origin:32px 32px"><path d="M32 32 Q26 16 32 12 Q40 16 32 32 M32 32 Q46 38 48 44 Q40 48 32 32 M32 32 Q20 44 14 42 Q14 34 32 32" fill="#ffcc33" stroke="${INK}" stroke-width="1.8"/></g><circle cx="32" cy="32" r="4" fill="${INK}"/>`,
  chute: `<path d="M8 28 Q32 0 56 28 Q48 24 40 28 Q32 24 24 28 Q16 24 8 28Z" fill="#ff8a5a" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M8 28 L30 52 M56 28 L34 52 M32 28 V52" stroke="${INK}" stroke-width="1.5"/><rect x="26" y="50" width="12" height="9" rx="2" fill="#e9a457" stroke="${INK}" stroke-width="2"/>`,
};
export const mechSVG = (id) => S('0 0 64 64', MECH[id] || '', 'piece');
const TEST = {
  wind: `<rect x="6" y="18" width="52" height="28" rx="14" fill="#cfe8f5" stroke="${INK}" stroke-width="2.5"/><g class="mv-wind"><path d="M14 27 h16 M10 33 h24 M16 39 h14" stroke="#4f8fd8" stroke-width="3" stroke-linecap="round"/></g><path d="M38 32 L50 27 V37Z" fill="#e8574a" stroke="${INK}" stroke-width="2"/>`,
  water: `<rect x="10" y="14" width="44" height="40" rx="5" fill="#bfe6f5" stroke="${INK}" stroke-width="2.5"/><path d="M10 30 q6 -4 11 0 t11 0 t11 0 t11 0 V54 H10Z" fill="#4fa8d8" opacity=".8"/><circle class="mv-bob" cx="30" cy="27" r="6" fill="#e9a457" stroke="${INK}" stroke-width="2"/>`,
  heat: `<circle cx="32" cy="22" r="10" fill="#ffcc33" stroke="${INK}" stroke-width="2.5" class="mv-blink"/><path d="M32 6 V9 M18 12 L20 14 M46 12 L44 14 M14 22 H17 M47 22 H50" stroke="#e8874a" stroke-width="3" stroke-linecap="round"/><rect x="18" y="38" width="28" height="16" rx="4" fill="#e9a457" stroke="${INK}" stroke-width="2.5"/>`,
  sand: `<path d="M4 46 Q18 32 32 42 Q46 30 60 44 V56 H4Z" fill="#efd49a" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M22 36 h20 l-4 -12 h-12z" fill="#e9a457" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><circle cx="16" cy="50" r="1.6" fill="#c8a060"/><circle cx="44" cy="51" r="1.6" fill="#c8a060"/>`,
  drop: `<path d="M14 58 V8 M50 58 V8 M14 8 H50" stroke="#8a5a2a" stroke-width="4" stroke-linecap="round"/><g class="mv-fall"><ellipse cx="32" cy="22" rx="7" ry="9" fill="#fbf3e4" stroke="${INK}" stroke-width="2.5"/></g><path d="M20 56 H44" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
  noise: `<path d="M10 26 H20 L32 16 V48 L20 38 H10Z" fill="#e9a457" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><g class="mv-blink"><path d="M38 24 Q44 32 38 40" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M44 18 Q54 32 44 46" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/></g>`,
};
export const testSVG = (id) => S('0 0 64 64', TEST[id] || '', 'tst');
const CLIENT = {
  road: `<path d="M22 60 L28 4 H36 L42 60Z" fill="#5a5a62"/><path d="M32 8 V16 M32 24 V32 M32 40 V48 M32 54 V60" stroke="#ffd24a" stroke-width="3"/><circle cx="14" cy="16" r="5" fill="#2a2a2e"/><circle cx="14" cy="16" r="2" fill="#ffd24a"/>`,
  phone: `<rect x="20" y="6" width="24" height="46" rx="5" fill="#3a4a5a" stroke="${INK}" stroke-width="2.5"/><rect x="23" y="12" width="18" height="32" rx="2" fill="#9fd8f0"/><path d="M26 30 L36 22 M28 38 L38 28" stroke="#fff" stroke-width="1.5" opacity=".8"/><path d="M12 56 L20 52 M44 52 L52 56" stroke="#e8574a" stroke-width="3" stroke-linecap="round"/>`,
  slide: `<path d="M8 56 Q30 56 44 22" fill="none" stroke="#e8574a" stroke-width="8" stroke-linecap="round"/><path d="M44 22 V58 M54 22 V58 M44 30 H54 M44 40 H54 M44 50 H54" stroke="#4f8fd8" stroke-width="3"/><circle cx="14" cy="12" r="6" fill="#ffcc33"/>`,
  eggs: `<path d="M8 40 H56 L52 54 H12Z" fill="#c9965a" stroke="${INK}" stroke-width="2.5"/><ellipse cx="20" cy="36" rx="7" ry="9" fill="#fbf3e4" stroke="${INK}" stroke-width="2"/><ellipse cx="34" cy="34" rx="7" ry="9" fill="#f6e2c4" stroke="${INK}" stroke-width="2"/><ellipse cx="47" cy="36" rx="7" ry="9" fill="#fbf3e4" stroke="${INK}" stroke-width="2"/>`,
  roof: `<path d="M6 34 L32 10 L58 34Z" fill="#c8402f" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><rect x="12" y="34" width="40" height="22" fill="#f2d7a8" stroke="${INK}" stroke-width="2.5"/><path d="M30 40 q2 4 0 6 M38 44 q2 4 0 6" stroke="#4fa8d8" stroke-width="3" stroke-linecap="round"/>`,
  ship: `<path d="M6 40 H58 L50 54 H14Z" fill="#3a6b8a" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><rect x="18" y="26" width="26" height="14" fill="#f5f1e8" stroke="${INK}" stroke-width="2.5"/><rect x="34" y="16" width="8" height="10" fill="#e8574a" stroke="${INK}" stroke-width="2"/><path d="M4 58 q7 -4 14 0 t14 0 t14 0 t14 0" fill="none" stroke="#4fa8d8" stroke-width="2.5"/>`,
  school: `<rect x="10" y="26" width="44" height="30" fill="#f2c443" stroke="${INK}" stroke-width="2.5"/><path d="M6 28 L32 10 L58 28" fill="#c8402f" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><rect x="27" y="40" width="10" height="16" fill="#8a5a2a"/><rect x="15" y="32" width="8" height="8" fill="#9fd8f0"/><rect x="41" y="32" width="8" height="8" fill="#9fd8f0"/><path d="M2 60 Q32 54 62 60" stroke="#e8c98a" stroke-width="4"/>`,
  building: `<rect x="16" y="6" width="32" height="52" fill="#9fb6c8" stroke="${INK}" stroke-width="2.5"/><g fill="#e8f4fb">${[0, 1, 2, 3, 4].map((r) => `<rect x="21" y="${11 + r * 9}" width="8" height="5"/><rect x="35" y="${11 + r * 9}" width="8" height="5"/>`).join('')}</g><circle cx="54" cy="12" r="6" fill="#ffcc33" class="mv-blink"/>`,
  umbrella: THING.umbrella,
  tent: `<path d="M8 52 L32 12 L56 52Z" fill="#3a9a6a" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M32 12 L26 52 H38Z" fill="#2a6a4a"/><path d="M2 56 H62" stroke="#e8c98a" stroke-width="5"/><path d="M48 18 q6 -2 10 2" stroke="#9fc8e8" stroke-width="2.5" fill="none"/>`,
  window: `<rect x="14" y="8" width="36" height="48" rx="3" fill="#9fd8f0" stroke="${INK}" stroke-width="3"/><path d="M14 32 H50" stroke="${INK}" stroke-width="3"/><path d="M20 14 L28 22 M36 38 L44 46" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>`,
  bank: `<rect x="6" y="18" width="52" height="30" rx="4" fill="#9ad08a" stroke="${INK}" stroke-width="2.5"/><circle cx="32" cy="33" r="9" fill="#6ab05a" stroke="${INK}" stroke-width="2"/><path d="M12 24 H20 M44 42 H52" stroke="${INK}" stroke-width="2.5"/><circle cx="50" cy="16" r="6" fill="#a86ad8" class="mv-blink"/>`,
  train: `<path d="M8 44 V28 Q8 18 22 18 H56 V44Z" fill="#e8574a" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><rect x="26" y="24" width="10" height="8" fill="#9fd8f0"/><rect x="42" y="24" width="10" height="8" fill="#9fd8f0"/><circle cx="20" cy="48" r="5" fill="#2a2a2e"/><circle cx="46" cy="48" r="5" fill="#2a2a2e"/><path d="M2 56 H62" stroke="#8a5a2a" stroke-width="3"/>`,
  library: `<rect x="8" y="10" width="48" height="46" fill="#c9965a" stroke="${INK}" stroke-width="2.5"/><path d="M8 32 H56" stroke="${INK}" stroke-width="2.5"/>${['#e8574a', '#4f8fd8', '#3a9a6a', '#f2c443', '#c9a8e8'].map((c, i) => `<rect x="${12 + i * 8}" y="14" width="6" height="18" fill="${c}"/><rect x="${12 + i * 8}" y="36" width="6" height="18" fill="${c}" opacity=".8"/>`).join('')}`,
  helmet: `<path d="M8 42 Q8 14 32 14 Q56 14 56 42Z" fill="#4f8fd8" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M18 22 Q24 18 30 18 M34 18 Q42 18 46 22" stroke="#bfe0ff" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M6 42 H58" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><circle cx="52" cy="54" r="7" fill="none" stroke="${INK}" stroke-width="3"/><circle cx="14" cy="54" r="7" fill="none" stroke="${INK}" stroke-width="3"/>`,
};
export const clientSVG = (id) => S('0 0 64 64', CLIENT[id] || '', 'client');
