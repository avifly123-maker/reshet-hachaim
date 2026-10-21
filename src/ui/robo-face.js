// The face of רובו־דע on a 2D canvas (512 x 256): the same eyes and mouth as on his visor in the lab (src/lab/lab.js
// makeFace), for the guide overlay and the journey screens. expr: 'normal' | 'happy' | 'curious' | 'wow' | 'oops'.
//   drawRoboFace(ctx2d, expr, blink 0..1, talk 0..1)
export function drawRoboFace(c, expr = 'normal', blink = 0, talk = 0) {
  c.save();
  c.fillStyle = '#060b10'; c.fillRect(0, 0, 512, 256);
  c.strokeStyle = c.fillStyle = '#8ff2ff'; c.shadowColor = 'rgba(120,240,255,.9)'; c.shadowBlur = 26; c.lineCap = 'round';
  const open = 1 - blink;
  for (const cx of [190, 322]) {
    if (expr === 'oops' && blink < 0.5) {
      c.lineWidth = 16; const t = cx < 256 ? -1 : 1; c.beginPath(); c.moveTo(cx - 20, 112 + 7 * t); c.lineTo(cx + 20, 112 - 7 * t); c.stroke();
    } else if (expr === 'happy' && blink < 0.5) {
      c.lineWidth = 20; c.beginPath(); c.arc(cx, 128, 30, Math.PI * 1.12, Math.PI * 1.88); c.stroke();
    } else {
      const w = expr === 'wow' ? 34 : 28, h = Math.max(5, (expr === 'wow' ? 44 : 40) * open);
      const hy = expr === 'curious' && cx > 256 ? h * 1.18 : h;
      rr(c, cx - w / 2, 112 - hy, w, hy * 2, Math.min(w / 2, hy)); c.fill();
    }
  }
  c.lineWidth = 9;
  if (expr === 'wow') { c.beginPath(); c.ellipse(256, 196, 14, 12 + talk * 6, 0, 0, Math.PI * 2); c.stroke(); }
  else if (talk > 0.05) { c.beginPath(); c.ellipse(256, 192, 24, 5 + talk * 13, 0, 0, Math.PI * 2); c.fill(); }
  else if (expr === 'oops') { c.beginPath(); c.moveTo(222, 186); c.quadraticCurveTo(239, 172, 256, 186); c.quadraticCurveTo(273, 200, 290, 186); c.stroke(); }
  else { c.beginPath(); c.arc(256, 168, expr === 'curious' ? 18 : 30, Math.PI * 0.2, Math.PI * 0.8); c.stroke(); }
  c.restore();
}
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

// His figure as SVG (white shell, teal trim, dark visor where the canvas face sits). A rendered portrait from Blender
// (src/data/robo-art.js, ROBO_ART.portrait) replaces the drawing when it exists; the visor rectangle stays the same.
// The visor box in the 200 x 240 frame: x 46..154, y 52..106.
export const VISOR = { x: 46, y: 52, w: 108, h: 54 };
export const ROBO_SVG = `<svg class="rg-body" viewBox="0 0 200 240" aria-hidden="true">
  <defs><radialGradient id="rgShell" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#eef0ec"/><stop offset="1" stop-color="#c9d0cf"/></radialGradient>
  <linearGradient id="rgTeal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3cb5ab"/><stop offset="1" stop-color="#1f7f78"/></linearGradient></defs>
  <line x1="100" y1="10" x2="100" y2="30" stroke="#9aa6a8" stroke-width="5" stroke-linecap="round"/><circle cx="100" cy="10" r="8" fill="url(#rgTeal)"/>
  <ellipse cx="100" cy="226" rx="56" ry="9" fill="rgba(0,0,0,.18)"/>
  <rect x="58" y="128" width="84" height="88" rx="34" fill="url(#rgShell)" stroke="#b9c3c2" stroke-width="2"/>
  <rect x="70" y="150" width="60" height="16" rx="8" fill="url(#rgTeal)"/><circle cx="100" cy="190" r="9" fill="#1d2b36"/><circle cx="100" cy="190" r="4" fill="#7ff0ff"/>
  <path d="M60 150 q-26 10 -30 40" stroke="#d7dddb" stroke-width="13" fill="none" stroke-linecap="round" class="rg-arm-r"/>
  <path d="M140 150 q26 6 34 -22" stroke="#d7dddb" stroke-width="13" fill="none" stroke-linecap="round" class="rg-arm-l"/>
  <rect x="30" y="30" width="140" height="96" rx="44" fill="url(#rgShell)" stroke="#b9c3c2" stroke-width="2"/>
  <rect x="${VISOR.x}" y="${VISOR.y}" width="${VISOR.w}" height="${VISOR.h}" rx="22" fill="#1d2b36"/>
  <rect x="22" y="64" width="12" height="28" rx="6" fill="url(#rgTeal)"/><rect x="166" y="64" width="12" height="28" rx="6" fill="url(#rgTeal)"/>
</svg>`;
