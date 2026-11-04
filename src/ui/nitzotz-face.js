// ניצוץ's face (1.4.4 set 2), drawn live on a transparent canvas: inside the glass of his bulb in 3D
// (src/workshop/nitzotz.js) and over his portrait in the guide's bubble (src/ui/robo-guide.js, speaker 'nitzotz').
// The sketch (art/concepts/nitzotz-1.webp): big round eyes with blue irises and two glints, soft brows, a small mouth.
// Laid out on 256 x 200 and scaled to the canvas it is given. No cross shapes: a "blown fuse" makes spiral eyes.
//   drawNitzotzFace(cx, W, H, { mood, talking, mouth, blink, lookX, lookY, light })
//   mood: 'happy' | 'idea' | 'excited' | 'think' | 'bored' | 'wow' | 'fuse' | 'proud'; light 0..1.5 (how bright he is)
export function drawNitzotzFace(cx, W, H, s = {}) {
  const { mood = 'happy', talking = false, mouth = 0, blink = 0, lookX = 0, lookY = 0, t = 0 } = s;
  cx.clearRect(0, 0, W, H);
  cx.save(); cx.scale(W / 256, H / 200);
  const ink = '#3a2a1a', iris = '#3d7fc2', irisD = '#1d4f86';
  const ey = 96 + lookY * 6, ex = 56, dx = lookX * 9;
  // the eyes
  for (const k of [-1, 1]) {
    const x = 128 + k * ex;
    if (mood === 'fuse') {   // dizzy: a spiral in each eye
      cx.strokeStyle = ink; cx.lineWidth = 5; cx.lineCap = 'round'; cx.beginPath();
      for (let a = 0; a < Math.PI * 5; a += 0.2) { const r = 3 + a * 2.2; const px = x + Math.cos(a * k + t * 6) * r, py = ey + Math.sin(a * k + t * 6) * r; a ? cx.lineTo(px, py) : cx.moveTo(px, py); }
      cx.stroke(); continue;
    }
    const open = mood === 'bored' ? 0.45 : 1;
    const rx = mood === 'wow' || mood === 'idea' ? 38 : 35, ry = (mood === 'wow' || mood === 'idea' ? 44 : 40) * open * (1 - blink * 0.92);
    if (mood === 'happy' && !talking && blink < 0.3 && s.smileEyes) {   // a big laugh: happy arcs
      cx.strokeStyle = ink; cx.lineWidth = 7; cx.lineCap = 'round'; cx.beginPath(); cx.arc(x, ey + 8, 20, Math.PI * 1.12, Math.PI * 1.88); cx.stroke(); continue;
    }
    // the white of the eye, its soft edge
    cx.fillStyle = '#fbfdff'; cx.strokeStyle = 'rgba(40,60,90,.55)'; cx.lineWidth = 3;
    cx.beginPath(); cx.ellipse(x, ey, rx, Math.max(3, ry), 0, 0, Math.PI * 2); cx.fill(); cx.stroke();
    if (ry > 6) {
      cx.save(); cx.beginPath(); cx.ellipse(x, ey, rx - 1, Math.max(2, ry - 1), 0, 0, Math.PI * 2); cx.clip();
      const ix = x + dx + k * -1.5, iy = ey + (mood === 'think' ? -10 : 3) + lookY * 4, ir = mood === 'wow' ? 20 : 24;
      const gI = cx.createRadialGradient(ix, iy - 4, 2, ix, iy, ir); gI.addColorStop(0, '#7fb8ea'); gI.addColorStop(0.65, iris); gI.addColorStop(1, irisD);
      cx.fillStyle = gI; cx.beginPath(); cx.arc(ix, iy, ir, 0, Math.PI * 2); cx.fill();
      cx.fillStyle = '#10243a'; cx.beginPath(); cx.arc(ix, iy, mood === 'wow' ? 8 : 11, 0, Math.PI * 2); cx.fill();
      cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(ix - 8, iy - 9, 7, 0, Math.PI * 2); cx.fill();
      cx.beginPath(); cx.arc(ix + 8, iy + 8, 3.2, 0, Math.PI * 2); cx.fill();
      // a lid that comes down for bored, and for a blink
      if (mood === 'bored') { cx.fillStyle = 'rgba(250,236,200,.95)'; cx.fillRect(x - rx, ey - ry - 2, rx * 2, ry * 0.75); }
      cx.restore();
    }
    // the brow
    cx.strokeStyle = 'rgba(70,52,30,.75)'; cx.lineWidth = 5; cx.lineCap = 'round'; cx.beginPath();
    const by = ey - 54 - (mood === 'wow' || mood === 'idea' || mood === 'excited' ? 8 : mood === 'happy' ? 4 : 0) + (mood === 'bored' ? 10 : 0);
    const tilt = mood === 'think' ? (k < 0 ? -7 : 5) : mood === 'proud' ? -4 : 0;
    cx.moveTo(x - 20, by + 3 + tilt * k * -0.3); cx.quadraticCurveTo(x, by - 5 + tilt, x + 20, by + 3 - tilt * k * 0.3); cx.stroke();
  }
  // the cheeks: a warm blush
  for (const k of [-1, 1]) { const g = cx.createRadialGradient(128 + k * 92, 146, 2, 128 + k * 92, 146, 18); g.addColorStop(0, 'rgba(255,140,110,.35)'); g.addColorStop(1, 'rgba(255,140,110,0)'); cx.fillStyle = g; cx.beginPath(); cx.arc(128 + k * 92, 146, 18, 0, Math.PI * 2); cx.fill(); }
  // the mouth
  const my = 162;
  cx.strokeStyle = ink; cx.fillStyle = '#7a2e22'; cx.lineWidth = 5; cx.lineCap = 'round';
  if (talking) { const h = 6 + mouth * 18; cx.beginPath(); cx.ellipse(128, my, 14 + mouth * 3, h / 2, 0, 0, Math.PI * 2); cx.fill(); }
  else if (mood === 'wow' || mood === 'fuse') { cx.beginPath(); cx.ellipse(128, my + 2, 9, 12, 0, 0, Math.PI * 2); cx.fill(); }
  else if (mood === 'idea' || mood === 'excited' || mood === 'proud') {   // a big open grin with a tongue
    cx.beginPath(); cx.moveTo(100, my - 8); cx.quadraticCurveTo(128, my + 30, 156, my - 8); cx.closePath(); cx.fill();
    cx.fillStyle = '#e8786a'; cx.beginPath(); cx.ellipse(128, my + 8, 10, 5, 0, 0, Math.PI * 2); cx.fill();
  }
  else if (mood === 'think') { cx.beginPath(); cx.moveTo(114, my + 2); cx.quadraticCurveTo(128, my - 4, 146, my - 2); cx.stroke(); }
  else if (mood === 'bored') { cx.beginPath(); cx.moveTo(114, my + 2); cx.lineTo(142, my + 2); cx.stroke(); }
  else {   // happy: an eager open smile (Avi, 5.11: a character of enthusiasm)
    cx.beginPath(); cx.moveTo(108, my - 6); cx.quadraticCurveTo(128, my + 18, 148, my - 6); cx.closePath(); cx.fill();
    cx.fillStyle = '#e8786a'; cx.beginPath(); cx.ellipse(128, my + 3, 7, 3.5, 0, 0, Math.PI * 2); cx.fill();
  }
  cx.restore();
}
