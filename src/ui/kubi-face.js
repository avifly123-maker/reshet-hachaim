// קוּבִּי's face, drawn live on a canvas (1.4.3: one drawing for his 3D model, src/robolab/three/kubi.js, and for his
// portrait in the guide's bubble, src/ui/robo-guide.js). The drawing is laid out on a 256 x 184 screen and scaled to the
// canvas it is given.
//   drawKubiFace(cx, W, H, { mood, talking, mouth, blink, lookX, lookY })
//   mood: 'happy' | 'normal' | 'wow' | 'oops' | 'think'; talking: the mouth moves (mouth 0..1); blink 0..1
export function drawKubiFace(cx, W, H, s = {}) {
  const { mood = 'happy', talking = false, mouth = 0, blink = 0, lookX = 0, lookY = 0 } = s;
  cx.clearRect(0, 0, W, H);
  cx.save(); cx.scale(W / 256, H / 184);
  const rr = (x, y, w, h, r) => { cx.beginPath(); cx.roundRect(x, y, w, h, r); cx.fill(); };
  cx.fillStyle = '#7fe3ff'; cx.strokeStyle = '#7fe3ff'; cx.lineWidth = 12; cx.lineCap = 'round';
  cx.shadowColor = '#7fe3ff'; cx.shadowBlur = 14;
  const ex = 70, ey = 74 + lookY * 10, dx = lookX * 12, ew = 44, eh = 54 * (1 - blink * 0.92);
  for (const k of [-1, 1]) {
    const x = 128 + k * ex + dx;
    if (mood === 'happy' && !talking && blink < 0.5) { cx.beginPath(); cx.arc(x, ey + 12, 22, Math.PI * 1.1, Math.PI * 1.9); cx.stroke(); }
    else if (mood === 'wow') { cx.beginPath(); cx.arc(x, ey, 26 * (1 - blink * 0.9), 0, 7); cx.fill(); }
    else if (mood === 'oops') { cx.save(); cx.translate(x, ey); cx.rotate(k * 0.25); rr(-ew / 2, -eh / 3, ew, eh * 0.66, 10); cx.restore(); }
    else rr(x - ew / 2, ey - eh / 2, ew, Math.max(5, eh), 16);
  }
  // the mouth: a smile, an "o", a talking oval, a thinking line
  const my = 140;
  if (talking) { const h = 8 + mouth * 22; rr(128 - 22, my - h / 2, 44, h, 10); }
  else if (mood === 'wow') { cx.beginPath(); cx.arc(128, my, 13, 0, 7); cx.stroke(); }
  else if (mood === 'think') { cx.beginPath(); cx.moveTo(108, my); cx.lineTo(146, my - 6); cx.stroke(); }
  else if (mood === 'oops') { cx.beginPath(); cx.moveTo(106, my + 4); cx.quadraticCurveTo(128, my - 10, 150, my + 4); cx.stroke(); }
  else { cx.beginPath(); cx.arc(128, my - 16, 26, Math.PI * 0.2, Math.PI * 0.8); cx.stroke(); }
  cx.restore();
}
