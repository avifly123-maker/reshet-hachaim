// מעבדת הרובוטים – the map of a level, drawn from above on a canvas, and the player that animates a run's trace.
//   const M = createMap(canvas, level, zone)
//   M.reset()                      back to the level's start
//   M.play(trace, { speed, onStep, onEnd })   animate a run (engine/run.js trace); speed: 'slow' | 'normal' | 'fast'
//   M.stop(); M.dispose()
// The look follows the zone (grove, amazon, desert, reef). No cross shapes anywhere: the drone has three rotors in a
// ring, nets are drawn as loops, a planted seed is two leaves.
import { makeWorld } from '../engine/world.js';
import { levelOf } from '../engine/level.js';

const LOOK = {
  grove:  { ground: '#b8c48a', ground2: '#a7b679', sand: '#d9c896', tree: '#4f7a3a', tree2: '#6e9a4c', water: '#6fb4c8', rock: '#9a9488', edge: '#5b4a35' },
  amazon: { ground: '#7fa860', ground2: '#6e9a52', sand: '#c9b98a', tree: '#1f5e34', tree2: '#2f8048', water: '#4f9fb0', rock: '#7d7a70', edge: '#2d3b24' },
  desert: { ground: '#e3c58e', ground2: '#d9b87c', sand: '#ecd3a0', tree: '#5f9a5a', tree2: '#7cb56f', water: '#5fb0bf', rock: '#b08a62', edge: '#8a5e36' },
  reef:   { ground: '#e9d9a8', ground2: '#dccb98', sand: '#e9d9a8', tree: '#e07a8a', tree2: '#f0a0a8', water: '#2f8fb5', rock: '#8a8478', edge: '#1d4f6e' },
};
const DIRV = [[0, -1], [1, 0], [0, 1], [-1, 0]];

export function createMap(canvas, L, zone) {
  const ctx = canvas.getContext('2d');
  const look = LOOK[zone] || LOOK.grove;
  const rows = L.map.rows, H = rows.length, Wd = Math.max(...rows.map((r) => r.length));
  let cs = 40, ox = 0, oy = 0, raf = 0, disposed = false;
  let state = null;          // what is drawn: { tools: {k: {x,y,dir,flying,show}}, items: [...], fx: [...], bubble }
  const seed = (x, y) => { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s); };

  function fit() {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(200, r.width), h = Math.max(150, r.height);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cs = Math.floor(Math.min(w / Wd, h / H)); ox = (w - cs * Wd) / 2; oy = (h - cs * H) / 2;
  }
  function reset() {
    const W = makeWorld(levelOf(L));
    state = { tools: {}, items: W.items.map((it) => ({ ...it })), fx: [], bubble: null, shake: 0 };
    for (const [k, T] of Object.entries(W.tools)) state.tools[k] = { x: T.x, y: T.y, dir: T.dir, a: T.dir * Math.PI / 2, flying: T.flying, show: k !== 'drone' || !T.parked, lift: 0 };
    draw();
  }
  const cx = (x) => ox + (x + 0.5) * cs, cy = (y) => oy + (y + 0.5) * cs;

  function drawCell(x, y, c) {
    const px = ox + x * cs, py = oy + y * cs, n = seed(x, y);
    if (c === '#') { ctx.fillStyle = look.edge; ctx.fillRect(px, py, cs + 0.5, cs + 0.5); return; }
    const water = c === '~';
    ctx.fillStyle = water ? look.water : c === 's' ? look.sand : (n > 0.5 ? look.ground : look.ground2);
    ctx.fillRect(px, py, cs + 0.5, cs + 0.5);
    if (water) {   // soft waves
      ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = Math.max(1, cs * 0.04);
      for (let k = 0; k < 2; k++) { const yy = py + cs * (0.3 + 0.4 * k + 0.08 * n); ctx.beginPath(); ctx.moveTo(px + cs * 0.15, yy); ctx.quadraticCurveTo(px + cs * 0.35, yy - cs * 0.08, px + cs * 0.5, yy); ctx.quadraticCurveTo(px + cs * 0.65, yy + cs * 0.08, px + cs * 0.85, yy); ctx.stroke(); }
    } else {      // a few grains or blades
      ctx.fillStyle = 'rgba(0,0,0,.06)';
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(px + cs * seed(x + k, y) , py + cs * seed(x, y + k), cs * 0.03, 0, 7); ctx.fill(); }
    }
    ctx.strokeStyle = 'rgba(0,0,0,.07)'; ctx.lineWidth = 1; ctx.strokeRect(px + 0.5, py + 0.5, cs - 1, cs - 1);
  }
  function drawTree(x, y) {
    const X = cx(x), Y = cy(y), r = cs * 0.4;
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(X + r * 0.15, Y + r * 0.2, r, r * 0.85, 0, 0, 7); ctx.fill();
    if (zone === 'desert') {   // a round barrel cactus with ribs
      ctx.fillStyle = look.tree; ctx.beginPath(); ctx.arc(X, Y, r * 0.8, 0, 7); ctx.fill();
      ctx.strokeStyle = look.tree2; ctx.lineWidth = Math.max(1, cs * 0.04);   // ribs as rings (no spokes: nothing that reads as a cross)
      for (const q of [0.35, 0.6]) { ctx.beginPath(); ctx.arc(X, Y, r * q, 0, 7); ctx.stroke(); }
      ctx.fillStyle = '#f2c94c'; ctx.beginPath(); ctx.arc(X, Y, r * 0.18, 0, 7); ctx.fill();
      return;
    }
    if (zone === 'reef') {     // a coral head
      ctx.fillStyle = look.tree;
      for (let k = 0; k < 5; k++) { const a = k * 1.256 + 0.3; ctx.beginPath(); ctx.arc(X + Math.cos(a) * r * 0.4, Y + Math.sin(a) * r * 0.4, r * 0.45, 0, 7); ctx.fill(); }
      ctx.fillStyle = look.tree2; ctx.beginPath(); ctx.arc(X, Y, r * 0.35, 0, 7); ctx.fill();
      return;
    }
    const blobs = zone === 'amazon' ? 6 : 5;
    ctx.fillStyle = look.tree;
    for (let k = 0; k < blobs; k++) { const a = k * (Math.PI * 2 / blobs) + seed(x, y); ctx.beginPath(); ctx.arc(X + Math.cos(a) * r * 0.42, Y + Math.sin(a) * r * 0.42, r * 0.5, 0, 7); ctx.fill(); }
    ctx.fillStyle = look.tree2; ctx.beginPath(); ctx.arc(X - r * 0.15, Y - r * 0.15, r * 0.45, 0, 7); ctx.fill();
  }
  function drawRock(x, y) {
    const X = cx(x), Y = cy(y), r = cs * 0.36;
    ctx.fillStyle = look.rock; ctx.beginPath(); ctx.ellipse(X, Y, r, r * 0.75, 0.3, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(X - r * 0.25, Y - r * 0.2, r * 0.4, r * 0.25, 0.3, 0, 7); ctx.fill();
  }
  function leaf(X, Y, r, a, col) { ctx.save(); ctx.translate(X, Y); ctx.rotate(a); ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(r * 0.5, 0, r * 0.5, r * 0.22, 0, 0, 7); ctx.fill(); ctx.restore(); }
  function drawItem(it) {
    const X = cx(it.x), Y = cy(it.y), r = cs * 0.3;
    switch (it.t) {
      case 'seed':
        if (it.done) { ctx.strokeStyle = '#4a7a2a'; ctx.lineWidth = cs * 0.05; ctx.beginPath(); ctx.moveTo(X, Y + r * 0.6); ctx.lineTo(X, Y - r * 0.1); ctx.stroke(); leaf(X, Y - r * 0.1, r, -2.4, '#5aa03a'); leaf(X, Y - r * 0.1, r, -0.7, '#6cb44a'); }
        else { ctx.fillStyle = '#7a5434'; ctx.beginPath(); ctx.ellipse(X, Y, r * 0.75, r * 0.5, 0, 0, 7); ctx.fill(); ctx.setLineDash([cs * 0.06, cs * 0.06]); ctx.strokeStyle = '#fff6'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X, Y, r, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
        break;
      case 'fruit':
        if (!it.done) for (const [dx, dy] of [[-0.3, 0], [0.3, 0.05], [0, -0.3]]) { ctx.fillStyle = '#f08a24'; ctx.beginPath(); ctx.arc(X + dx * r, Y + dy * r, r * 0.38, 0, 7); ctx.fill(); ctx.fillStyle = '#fff5'; ctx.beginPath(); ctx.arc(X + dx * r - r * 0.12, Y + dy * r - r * 0.12, r * 0.1, 0, 7); ctx.fill(); }
        break;
      case 'thirsty': {
        const col = it.done ? '#4f9a3a' : '#c9a548';
        ctx.strokeStyle = col; ctx.lineWidth = cs * 0.05; ctx.beginPath(); ctx.moveTo(X, Y + r * 0.7); ctx.lineTo(X, Y - r * 0.2); ctx.stroke();
        leaf(X, Y - r * 0.2, r * 1.1, it.done ? -2.5 : 2.6, col); leaf(X, Y - r * 0.2, r * 1.1, it.done ? -0.6 : 0.5, col);
        if (it.done) { ctx.fillStyle = '#6fc3e8'; ctx.beginPath(); ctx.arc(X + r * 0.7, Y + r * 0.5, r * 0.16, 0, 7); ctx.fill(); }
        break;
      }
      case 'fire':
        if (it.done) { ctx.fillStyle = 'rgba(120,120,120,.45)'; ctx.beginPath(); ctx.arc(X, Y - r * 0.2, r * 0.5, 0, 7); ctx.fill(); }
        else { const fl = (k, s, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(X + k * r, Y + r * 0.6); ctx.quadraticCurveTo(X + k * r - r * 0.5 * s, Y, X + k * r, Y - r * s); ctx.quadraticCurveTo(X + k * r + r * 0.5 * s, Y, X + k * r, Y + r * 0.6); ctx.fill(); };
          fl(-0.25, 0.8, '#e8562a'); fl(0.25, 0.9, '#e8562a'); fl(0, 1.2, '#f5a623'); fl(0, 0.7, '#ffe066'); }
        break;
      case 'net': case 'trash':
        if (!it.done) {
          if (it.t === 'net') { ctx.strokeStyle = '#ddd'; ctx.lineWidth = cs * 0.035; for (const [dx, dy] of [[-0.25, -0.2], [0.25, -0.2], [0, 0.25], [-0.25, 0.3], [0.28, 0.3]]) { ctx.beginPath(); ctx.arc(X + dx * r * 1.2, Y + dy * r * 1.2, r * 0.32, 0, 7); ctx.stroke(); } }
          else { ctx.fillStyle = '#8fc0d8'; ctx.beginPath(); ctx.roundRect(X - r * 0.25, Y - r * 0.6, r * 0.5, r * 1.2, r * 0.2); ctx.fill(); ctx.fillStyle = '#3a6a8a'; ctx.fillRect(X - r * 0.12, Y - r * 0.8, r * 0.24, r * 0.25); }
        }
        break;
      case 'coral':
        if (it.done) { ctx.fillStyle = '#ff8fa3'; for (let k = 0; k < 4; k++) { const a = k * 1.57 + 0.4; ctx.beginPath(); ctx.arc(X + Math.cos(a) * r * 0.35, Y + Math.sin(a) * r * 0.35, r * 0.33, 0, 7); ctx.fill(); } }
        else { ctx.setLineDash([cs * 0.06, cs * 0.06]); ctx.strokeStyle = '#ffffffaa'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X, Y, r, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
        break;
      case 'animal': {   // a small round animal seen from above (ears and a tail), a flash when photographed
        ctx.fillStyle = it.kind === 'owl' ? '#9a7a56' : '#c48a4a';
        ctx.beginPath(); ctx.ellipse(X, Y, r * 0.55, r * 0.75, 0, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(X, Y - r * 0.75, r * 0.38, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.ellipse(X - r * 0.3, Y - r * 1.0, r * 0.12, r * 0.22, -0.4, 0, 7); ctx.ellipse(X + r * 0.3, Y - r * 1.0, r * 0.12, r * 0.22, 0.4, 0, 7); ctx.fill();
        if (it.done) { ctx.strokeStyle = '#ffe066'; ctx.lineWidth = cs * 0.05; ctx.beginPath(); ctx.arc(X, Y - r * 0.2, r * 1.15, 0, 7); ctx.stroke(); }
        break;
      }
      default: break;
    }
  }
  function drawHome() {
    const h = L.home; if (!h) return;
    const X = cx(h.x), Y = cy(h.y), r = cs * 0.42;
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = cs * 0.05; ctx.beginPath(); ctx.arc(X, Y, r, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(X - r * 0.45, Y + r * 0.1); ctx.lineTo(X, Y - r * 0.45); ctx.lineTo(X + r * 0.45, Y + r * 0.1); ctx.closePath(); ctx.fill();
    ctx.fillRect(X - r * 0.32, Y + r * 0.1, r * 0.64, r * 0.4);
  }
  function drawTool(k, T) {
    if (!T.show) return;
    const X = cx(T.x), Y = cy(T.y), r = cs * 0.36;
    ctx.save(); ctx.translate(X, Y - (T.lift || 0) * cs * 0.15); ctx.rotate(T.a);
    if (k === 'drone' && T.flying) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.arc(cs * 0.12, cs * 0.18, r * 0.8, 0, 7); ctx.fill(); }
    if (k === 'robot') {
      ctx.fillStyle = '#2b2b2b'; ctx.fillRect(-r * 0.95, -r * 0.6, r * 0.3, r * 1.2); ctx.fillRect(r * 0.65, -r * 0.6, r * 0.3, r * 1.2);
      ctx.fillStyle = '#f5f1e8'; ctx.beginPath(); ctx.roundRect(-r * 0.7, -r * 0.75, r * 1.4, r * 1.5, r * 0.35); ctx.fill();
      ctx.fillStyle = '#e8873a'; ctx.beginPath(); ctx.roundRect(-r * 0.45, -r * 0.6, r * 0.9, r * 0.55, r * 0.15); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-r * 0.18, -r * 0.34, r * 0.1, 0, 7); ctx.arc(r * 0.18, -r * 0.34, r * 0.1, 0, 7); ctx.fill();
      ctx.fillStyle = '#e8873a'; ctx.beginPath(); ctx.moveTo(0, -r * 1.15); ctx.lineTo(-r * 0.22, -r * 0.82); ctx.lineTo(r * 0.22, -r * 0.82); ctx.closePath(); ctx.fill();
    } else if (k === 'drone') {   // a round drone with three rotors in a ring (never four in a cross)
      for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * 2.094; ctx.fillStyle = '#d6dde3'; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85, r * 0.42, 0, 7); ctx.fill(); ctx.strokeStyle = '#7a8a96'; ctx.lineWidth = 1.5; ctx.stroke(); }
      ctx.fillStyle = '#3b82c4'; ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-r * 0.17, -r * 0.12, r * 0.1, 0, 7); ctx.arc(r * 0.17, -r * 0.12, r * 0.1, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(0, -r * 0.5, r * 0.1, 0, 7); ctx.fill();
    } else {                      // the diving robot: a capsule with a fin and a propeller
      ctx.fillStyle = '#f2c14e'; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.55, r * 0.95, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#9ad8ea'; ctx.beginPath(); ctx.arc(0, -r * 0.45, r * 0.3, 0, 7); ctx.fill();
      ctx.fillStyle = '#e08a2b'; ctx.beginPath(); ctx.moveTo(0, r * 0.7); ctx.lineTo(-r * 0.45, r * 1.15); ctx.lineTo(r * 0.45, r * 1.15); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function drawFx(now) {
    state.fx = state.fx.filter((f) => now - f.t0 < f.life);
    for (const f of state.fx) {
      const k = (now - f.t0) / f.life;
      if (f.type === 'firework') {
        for (let i = 0; i < 14; i++) { const a = i * 0.449 + f.seed; const d = k * cs * 1.6; ctx.fillStyle = `hsla(${(i * 47 + f.seed * 100) % 360},90%,60%,${1 - k})`; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d - k * cs * 0.4, cs * 0.06, 0, 7); ctx.fill(); }
      } else if (f.type === 'spray' || f.type === 'water') {
        for (let i = 0; i < 8; i++) { ctx.fillStyle = `rgba(110,195,232,${1 - k})`; ctx.beginPath(); ctx.arc(f.x + (seed(i, f.seed) - 0.5) * cs * 0.8, f.y + k * cs * 0.5 * seed(f.seed, i), cs * 0.05, 0, 7); ctx.fill(); }
      } else if (f.type === 'flash') {
        ctx.fillStyle = `rgba(255,255,255,${0.8 * (1 - k)})`; ctx.beginPath(); ctx.arc(f.x, f.y, cs * (0.4 + k), 0, 7); ctx.fill();
      } else if (f.type === 'lights') {
        for (let i = 0; i < 6; i++) { ctx.fillStyle = `hsla(${(i * 60 + k * 360) % 360},90%,60%,${0.8 * (1 - k)})`; ctx.beginPath(); ctx.arc(f.x + Math.cos(i + k * 6) * cs * 0.5, f.y + Math.sin(i + k * 6) * cs * 0.5, cs * 0.08, 0, 7); ctx.fill(); }
      } else if (f.type === 'puff') {
        ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - k)})`; ctx.beginPath(); ctx.arc(f.x + k * cs * 0.3, f.y - k * cs * 0.3, cs * 0.2 * (1 + k), 0, 7); ctx.fill();
      } else if (f.type === 'notes') {
        ctx.fillStyle = `rgba(60,60,60,${1 - k})`; ctx.font = `${Math.round(cs * 0.4)}px sans-serif`; ctx.fillText('♪', f.x + k * cs * 0.4, f.y - k * cs * 0.8);
      }
    }
  }
  function draw(now = performance.now()) {
    if (disposed || !state) return;
    const r = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, r.width, r.height);
    ctx.save();
    if (state.shake > 0) ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    for (let y = 0; y < H; y++) for (let x = 0; x < Wd; x++) drawCell(x, y, (rows[y] || '')[x] || '#');
    drawHome();
    for (const it of state.items) drawItem(it);
    for (let y = 0; y < H; y++) for (let x = 0; x < Wd; x++) { const c = (rows[y] || '')[x]; if (c === 'T') drawTree(x, y); else if (c === 'R') drawRock(x, y); }
    for (const k of ['sub', 'robot', 'drone']) if (state.tools[k]) drawTool(k, state.tools[k]);
    drawFx(now);
    ctx.restore();
  }

  // ── playing a trace: one event at a time, smoothly
  let playing = null;
  const DUR = { slow: 700, normal: 360, fast: 140 };
  function play(trace, { speed = 'normal', onStep, onEnd } = {}) {
    stop(); reset();
    const evs = trace.slice(); let i = 0, t0 = performance.now(), from = null;
    const dur = DUR[speed] || DUR.normal;
    playing = { stop: false };
    const me = playing;
    const begin = (e) => {
      const T = state.tools[e.tool];
      from = T ? { x: T.x, y: T.y, a: T.a } : null;
      if (T) {
        if (e.a === 'launch') { const D = state.tools.drone; if (D) { D.show = true; D.flying = true; D.x = e.x; D.y = e.y; D.a = (e.dir || 0) * Math.PI / 2; D.lift = 1; } }
        if (e.a === 'land') T.lift = 0;
      }
      const X = cx(e.x), Y = cy(e.y), now = performance.now();
      const fx = (type, life = 700, x = X, y = Y) => state.fx.push({ type, t0: now, life, x, y, seed: Math.random() * 10 });
      if (e.item != null) { const it = state.items.find((q) => q.i === e.item); if (it) { it.done = true; fx(e.a === 'photo' ? 'flash' : e.a === 'spray' || e.a === 'water' ? 'spray' : 'puff', 600, cx(it.x), cy(it.y)); } }
      if (e.a === 'fireworks') { fx('firework', 1100); fx('firework', 1300, X + cs * 0.4, Y - cs * 0.3); }
      if (e.a === 'lights' || e.a === 'dance') fx('lights', 900);
      if (e.a === 'beep') fx('notes', 800);
      if (e.a === 'sneeze') fx('puff', 600);
      if (e.a === 'fail') state.shake = cs * 0.15;
      if (onStep) onStep(e, i);
    };
    const step = (now) => {
      if (me.stop || disposed) return;
      const e = evs[i];
      if (!e) { state.shake = 0; draw(now); if (onEnd) onEnd(); playing = null; return; }
      if (from === null) begin(e);
      const k = Math.min(1, (now - t0) / dur), T = state.tools[e.tool];
      if (T && from && (e.a === 'fwd' || e.a === 'back')) { T.x = from.x + (e.x - from.x) * ease(k); T.y = from.y + (e.y - from.y) * ease(k); }
      if (T && from && (e.a === 'right' || e.a === 'left')) { const target = from.a + (e.a === 'right' ? 1 : -1) * Math.PI / 2; T.a = from.a + (target - from.a) * ease(k); }
      if (T && e.a === 'fail' && e.code === 'battery') T.lift = 1 - k;
      if (T && e.a === 'dance') T.a = from.a + Math.sin(k * Math.PI * 4) * 0.5;
      if (T && e.a === 'launch') state.tools.drone.lift = k;
      state.shake *= 0.85;
      draw(now);
      if (k >= 1) {
        if (T && from) { T.x = e.x; T.y = e.y; if (e.a === 'right' || e.a === 'left') T.a = from.a + (e.a === 'right' ? 1 : -1) * Math.PI / 2; }
        if (T && e.a === 'dance') T.a = from.a;
        i++; from = null; t0 = now;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  const ease = (k) => k * k * (3 - 2 * k);
  function stop() { if (playing) playing.stop = true; playing = null; cancelAnimationFrame(raf); }
  const onResize = () => { fit(); draw(); };
  window.addEventListener('resize', onResize);
  fit(); reset();
  return {
    reset: () => { stop(); fit(); reset(); }, play, stop, redraw: () => { fit(); draw(); },
    isPlaying: () => !!playing,
    dispose: () => { disposed = true; stop(); window.removeEventListener('resize', onResize); },
  };
}
