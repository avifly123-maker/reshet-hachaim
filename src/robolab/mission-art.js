// Pictures for the robot workshop's missions (5.11, Avi: "the robot workshop and the missions are too textual: make
// them visual, like the inventors' workshop"). One small drawing per kind of mission, in the workshop's hand-drawn
// style (filled shapes, a dark outline, soft colours). No cross shapes: five-petal flowers, a net drawn as knots on
// curves, never lines meeting in a plus or an X.
//   missionPic(M) → '<svg …>'   (M: a mission of src/data/robolab/missions.js; `tpl` decides, hand-made ones get the robot)
const INK = '#2a2420';
const S = (body) => `<svg class="wk-mpic" viewBox="0 0 64 64" aria-hidden="true">${body}</svg>`;
const PICS = {
  pollinate: `<circle cx="22" cy="40" r="6" fill="#ffd24a" stroke="${INK}" stroke-width="2"/>${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="22" cy="29" rx="5" ry="8" fill="#ff8ab0" stroke="${INK}" stroke-width="2" transform="rotate(${a} 22 40)"/>`).join('')}<circle cx="22" cy="40" r="5" fill="#ffd24a" stroke="${INK}" stroke-width="2"/>
    <path d="M22 50 Q20 58 24 62" stroke="#3a8a3a" stroke-width="3" fill="none"/><ellipse cx="46" cy="22" rx="8" ry="6" fill="#ffc83a" stroke="${INK}" stroke-width="2"/><path d="M42 18v8M46 17v10M50 18v8" stroke="${INK}" stroke-width="2"/>
    <ellipse cx="44" cy="13" rx="5" ry="3.5" fill="#e8f6ff" stroke="${INK}" stroke-width="1.5" transform="rotate(-25 44 13)"/><path d="M30 34 Q36 26 38 24" stroke="#c89a2a" stroke-width="2" stroke-dasharray="2 3" fill="none"/>`,
  feed: `<path d="M8 40 Q32 62 56 40Z" fill="#c58a4a" stroke="${INK}" stroke-width="2.5"/><path d="M8 40h48" stroke="${INK}" stroke-width="2.5"/>
    <circle cx="22" cy="34" r="7" fill="#e8574a" stroke="${INK}" stroke-width="2"/><circle cx="35" cy="31" r="8" fill="#ffb03a" stroke="${INK}" stroke-width="2"/><circle cx="46" cy="35" r="6" fill="#8a4ad0" stroke="${INK}" stroke-width="2"/>
    <path d="M35 23 q3-6 8-6" stroke="#3a8a3a" stroke-width="3" fill="none"/>`,
  disperse: `<path d="M6 52h52" stroke="#8a5a2a" stroke-width="5" stroke-linecap="round"/><path d="M40 50 V34" stroke="#3a8a3a" stroke-width="3.5"/><path d="M40 38 Q30 30 32 24 Q40 28 40 38Z M40 36 Q50 28 52 22 Q42 24 40 36Z" fill="#5ab04a" stroke="${INK}" stroke-width="2"/>
    <ellipse cx="18" cy="30" rx="6" ry="8" fill="#a8784a" stroke="${INK}" stroke-width="2" transform="rotate(-30 18 30)"/><path d="M22 22 Q30 12 38 16" stroke="${INK}" stroke-width="2" stroke-dasharray="3 3" fill="none"/>`,
  clear: `<path d="M8 50h48" stroke="#8a5a2a" stroke-width="5" stroke-linecap="round"/><path d="M28 47 Q24 30 36 26 Q50 28 48 47Z" fill="#9a9aa2" stroke="${INK}" stroke-width="2.5"/><path d="M33 34 l6 3" stroke="#6a6a72" stroke-width="2"/>
    <rect x="6" y="34" width="14" height="12" rx="3" fill="#e8873a" stroke="${INK}" stroke-width="2"/><path d="M20 40h5" stroke="${INK}" stroke-width="3"/><path d="M10 22 l8 0 l-3 -3 M18 22 l-3 3" stroke="#2fa39a" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  count: `<ellipse cx="32" cy="30" rx="22" ry="13" fill="#fffaf0" stroke="${INK}" stroke-width="2.5"/><circle cx="32" cy="30" r="8" fill="#2fa39a" stroke="${INK}" stroke-width="2"/><circle cx="32" cy="30" r="3.5" fill="${INK}"/><circle cx="35" cy="27" r="1.6" fill="#fff"/>
    ${[0, 1, 2, 3].map((i) => `<circle cx="${14 + i * 12}" cy="54" r="4" fill="${i < 3 ? '#ffc83a' : '#e3dccb'}" stroke="${INK}" stroke-width="1.5"/>`).join('')}`,
  water: `<path d="M32 8 Q48 30 48 40 A16 16 0 0 1 16 40 Q16 30 32 8Z" fill="#4fb0e0" stroke="${INK}" stroke-width="2.5"/><path d="M24 40 a8 8 0 0 0 8 8" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  fire: `<path d="M32 6 Q44 22 44 34 A12 12 0 0 1 20 34 Q20 26 26 20 Q26 28 30 28 Q28 16 32 6Z" fill="#ff8a3a" stroke="${INK}" stroke-width="2.5"/><path d="M32 26 Q38 34 37 40 A5 5 0 0 1 27 40 Q27 34 32 26Z" fill="#ffd24a"/>
    <path d="M10 56 Q32 48 54 56" stroke="#4fb0e0" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  nets: `<path d="M8 22 Q32 62 56 22" fill="#e3dccb" fill-opacity=".5" stroke="${INK}" stroke-width="2.5"/><path d="M14 30 Q32 44 50 30 M20 40 Q32 50 44 40" stroke="${INK}" stroke-width="1.6" fill="none"/>
    ${[[16, 31], [24, 36], [32, 38], [40, 36], [48, 31], [24, 43], [32, 46], [40, 43]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="${INK}"/>`).join('')}<path d="M8 22h48" stroke="#c58a4a" stroke-width="4" stroke-linecap="round"/>
    <path d="M50 52 q4-5 8 0 q-4 5-8 0z" fill="#ffb03a" stroke="${INK}" stroke-width="1.5"/>`,
  seagrass: `<path d="M6 56h52" stroke="#e8d6a8" stroke-width="6" stroke-linecap="round"/>${[[16, 0], [26, 8], [36, -6], [46, 6]].map(([x, b]) => `<path d="M${x} 54 Q${x + b} 34 ${x + b / 2} 12" stroke="#3a9a5a" stroke-width="5" fill="none" stroke-linecap="round"/>`).join('')}
    <circle cx="52" cy="20" r="3" fill="#cfefff" stroke="#4fb0e0" stroke-width="1.5"/><circle cx="56" cy="12" r="2" fill="#cfefff" stroke="#4fb0e0" stroke-width="1.5"/>`,
  hand: `<rect x="16" y="20" width="32" height="24" rx="6" fill="#e8873a" stroke="${INK}" stroke-width="2.5"/><rect x="21" y="25" width="22" height="12" rx="4" fill="#1d2c38"/><circle cx="27" cy="31" r="2.5" fill="#7cf0f0"/><circle cx="37" cy="31" r="2.5" fill="#7cf0f0"/>
    <path d="M32 20 V12" stroke="${INK}" stroke-width="2.5"/><circle cx="32" cy="10" r="3" fill="#ffd24a" stroke="${INK}" stroke-width="2"/><circle cx="20" cy="50" r="6" fill="#3a3a40" stroke="${INK}" stroke-width="2"/><circle cx="44" cy="50" r="6" fill="#3a3a40" stroke="${INK}" stroke-width="2"/>`,
};
export const missionPic = (M) => S(PICS[M && M.tpl] || PICS.hand);
// the stats of the robot, each with a small sign
export const STAT_PIC = {
  speed: '<path d="M4 8h9M2 12h11M4 16h9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M15 6l6 6-6 6" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linejoin="round"/>',
  force: '<path d="M5 18 L12 6 L19 18Z" fill="currentColor" opacity=".25"/><rect x="4" y="15" width="16" height="5" rx="1.5" fill="currentColor"/>',
  precision: '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/>',
  battery: '<rect x="3" y="7" width="16" height="10" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><rect x="19" y="10" width="2.5" height="4" rx="1" fill="currentColor"/><rect x="5.5" y="9.5" width="7" height="5" rx="1" fill="currentColor"/>',
  lift: '<path d="M12 20V5M6 10l6-6 6 6" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
};
export const statIcon = (k) => `<svg class="wk-sic" viewBox="0 0 24 24" aria-hidden="true">${STAT_PIC[k] || ''}</svg>`;
