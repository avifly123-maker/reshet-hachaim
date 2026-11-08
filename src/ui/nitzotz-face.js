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
  // 8.11 (Avi: "the film's ניצוץ is much nicer, make him more like it"): the film's face (art/films/workshop.webm): two big
  // eyes side by side with a dark outline, large blue irises with a bright glint, thick dark brows, a wide open smile
  const ink = '#1e1a18', iris = '#2f86d6', irisD = '#164f8e';
  const ey = 86 + lookY * 6, ex = 41, dx = lookX * 9;
  const big = mood === 'wow' || mood === 'idea' || mood === 'excited';
  // the eyes
  for (const k of [-1, 1]) {
    const x = 128 + k * ex;
    if (mood === 'fuse') {   // dizzy: a spiral in each eye
      cx.fillStyle = '#fbfdff'; cx.strokeStyle = ink; cx.lineWidth = 5; cx.beginPath(); cx.ellipse(x, ey, 38, 44, 0, 0, Math.PI * 2); cx.fill(); cx.stroke();
      cx.lineWidth = 4.5; cx.lineCap = 'round'; cx.beginPath();
      for (let a = 0; a < Math.PI * 5; a += 0.2) { const r = 2 + a * 2.1; const px = x + Math.cos(a * k + t * 6) * r, py = ey + Math.sin(a * k + t * 6) * r; a ? cx.lineTo(px, py) : cx.moveTo(px, py); }
      cx.stroke(); continue;
    }
    const open = mood === 'bored' ? 0.5 : 1;
    const rx = big ? 41 : 38, ry = (big ? 50 : 46) * open * (1 - blink * 0.94);
    if (mood === 'happy' && !talking && blink < 0.3 && s.smileEyes) {   // a big laugh: happy arcs
      cx.strokeStyle = ink; cx.lineWidth = 8; cx.lineCap = 'round'; cx.beginPath(); cx.arc(x, ey + 10, 24, Math.PI * 1.12, Math.PI * 1.88); cx.stroke(); continue;
    }
    // the white of the eye with its dark outline (a closed eye is a dark line)
    cx.fillStyle = '#fdfeff'; cx.strokeStyle = ink; cx.lineWidth = 7;
    cx.beginPath(); cx.ellipse(x, ey, rx, Math.max(2.5, ry), 0, 0, Math.PI * 2); cx.fill(); cx.stroke();
    if (ry > 7) {
      cx.save(); cx.beginPath(); cx.ellipse(x, ey, rx - 2, Math.max(2, ry - 2), 0, 0, Math.PI * 2); cx.clip();
      const sh = cx.createLinearGradient(0, ey - ry, 0, ey + ry); sh.addColorStop(0, 'rgba(120,150,190,.28)'); sh.addColorStop(0.35, 'rgba(120,150,190,0)'); cx.fillStyle = sh; cx.fillRect(x - rx, ey - ry, rx * 2, ry * 2);
      const ix = x + dx - k * 5, iy = ey + (mood === 'think' ? -12 : 6) + lookY * 5, ir = big ? 23 : 25;
      const gI = cx.createRadialGradient(ix, iy + 6, 2, ix, iy, ir); gI.addColorStop(0, '#9fd2ff'); gI.addColorStop(0.55, iris); gI.addColorStop(1, irisD);
      cx.fillStyle = gI; cx.beginPath(); cx.arc(ix, iy, ir, 0, Math.PI * 2); cx.fill();
      cx.strokeStyle = '#123a66'; cx.lineWidth = 2.5; cx.stroke();
      cx.fillStyle = '#0c1622'; cx.beginPath(); cx.arc(ix, iy, big ? 10 : 12, 0, Math.PI * 2); cx.fill();
      cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(ix - 8, iy - 9, 8.5, 0, Math.PI * 2); cx.fill();
      cx.beginPath(); cx.arc(ix + 8, iy + 7, 3.2, 0, Math.PI * 2); cx.fill();
      if (mood === 'bored') { cx.fillStyle = 'rgba(252,240,210,.97)'; cx.fillRect(x - rx, ey - ry - 2, rx * 2, ry * 0.8); }
      cx.restore();
      if (mood === 'bored') { cx.strokeStyle = ink; cx.lineWidth = 4.5; cx.beginPath(); cx.moveTo(x - rx + 3, ey - ry * 0.2); cx.lineTo(x + rx - 3, ey - ry * 0.2); cx.stroke(); }
    }
    // the brow: thick and dark, high and arched when he is excited
    const by = ey - 58 - (big ? 9 : mood === 'happy' ? 4 : 0) + (mood === 'bored' ? 14 : 0);
    const tilt = mood === 'think' ? (k < 0 ? -8 : 6) : mood === 'proud' ? -5 : 0;
    cx.strokeStyle = '#2a1a10'; cx.lineWidth = 11; cx.lineCap = 'round'; cx.beginPath();
    cx.moveTo(x - 24, by + 6 + (k < 0 ? -tilt * 0.3 : tilt * 0.3)); cx.quadraticCurveTo(x + k * 2, by - 7 + tilt, x + 24, by + 6 + (k < 0 ? tilt * 0.3 : -tilt * 0.3)); cx.stroke();
  }
  // the cheeks: a warm blush
  for (const k of [-1, 1]) { const g = cx.createRadialGradient(128 + k * 88, 150, 2, 128 + k * 88, 150, 20); g.addColorStop(0, 'rgba(255,120,100,.38)'); g.addColorStop(1, 'rgba(255,120,100,0)'); cx.fillStyle = g; cx.beginPath(); cx.arc(128 + k * 88, 150, 20, 0, Math.PI * 2); cx.fill(); }
  // the mouth: a wide open smile, dark inside, a red tongue and a strip of teeth (the film's)
  const my = 150;
  const grin = (w, d, teeth = true) => {   // w: half its width, d: how deep it opens
    cx.save();
    cx.beginPath(); cx.moveTo(128 - w, my - 6); cx.quadraticCurveTo(128, my - 10, 128 + w, my - 6); cx.quadraticCurveTo(128 + w * 0.9, my + d, 128, my + d); cx.quadraticCurveTo(128 - w * 0.9, my + d, 128 - w, my - 6); cx.closePath();
    cx.fillStyle = '#5a1414'; cx.fill(); cx.clip();
    if (teeth) { cx.fillStyle = '#fffaf2'; cx.fillRect(128 - w, my - 12, w * 2, Math.max(4, d * 0.22) + 6); }
    cx.fillStyle = '#e2504a'; cx.beginPath(); cx.ellipse(128, my + d * 0.95, w * 0.62, d * 0.45, 0, 0, Math.PI * 2); cx.fill();
    cx.restore();
    cx.strokeStyle = ink; cx.lineWidth = 6; cx.lineJoin = 'round';
    cx.beginPath(); cx.moveTo(128 - w, my - 6); cx.quadraticCurveTo(128, my - 10, 128 + w, my - 6); cx.quadraticCurveTo(128 + w * 0.9, my + d, 128, my + d); cx.quadraticCurveTo(128 - w * 0.9, my + d, 128 - w, my - 6); cx.closePath(); cx.stroke();
  };
  cx.lineCap = 'round';
  if (talking) grin(38 + mouth * 6, 10 + mouth * 24, mouth > 0.25);
  else if (mood === 'wow' || mood === 'fuse') { cx.fillStyle = '#5a1414'; cx.strokeStyle = ink; cx.lineWidth = 5; cx.beginPath(); cx.ellipse(128, my + 6, 13, 16, 0, 0, Math.PI * 2); cx.fill(); cx.stroke(); }
  else if (big || mood === 'proud') grin(50, 38);
  else if (mood === 'think') { cx.strokeStyle = ink; cx.lineWidth = 6; cx.beginPath(); cx.moveTo(110, my + 4); cx.quadraticCurveTo(128, my - 4, 148, my); cx.stroke(); }
  else if (mood === 'bored') { cx.strokeStyle = ink; cx.lineWidth = 6; cx.beginPath(); cx.moveTo(112, my + 4); cx.lineTo(144, my + 4); cx.stroke(); }
  else grin(45, 30);   // happy: an eager open smile (Avi, 5.11: a character of enthusiasm)
  cx.restore();
}
