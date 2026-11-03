// מעבדת הרובוטים – the counter over the tool while a run plays (1.4.3 set 5; CLAUDE.md "a counter shown above the
// tool during a run"). A small card that floats over the tool doing the step and shows only what this level is about:
// the steps left when the level has a step limit (a rescue against the clock), the count when it counts (the add
// block), and the battery when the tool has one (the drone, a built robot). It follows the trace's events, so what it
// says is exactly what the engine counted. Nothing is shown in a level that has none of the three.
//   const RC = createRunCounter({ root, CS, level, kids })   RC.reset()  RC.event(e)  RC.place(tools, wx, wz, toolY)  RC.dispose()
import * as THREE from 'three';
import { playerMode } from '../../core/storage.js';

const WORDS = {
  steps: { f: 'צעדים', k: 'צְעָדִים' }, count: { f: 'ספירה', k: 'סְפִירָה' }, bat: { f: 'סוללה', k: 'סוֹלְלָה' },
};
const PX = 2;   // the canvas is drawn at twice its size, for sharp letters

// the step limit of a level, wherever it sits in its goal ({ t: 'steps', max } inside all / some)
function stepLimit(g) {
  if (!g || typeof g !== 'object') return 0;
  if (g.t === 'steps') return g.max | 0;
  for (const k of ['all', 'some']) if (Array.isArray(g[k])) for (const c of g[k]) { const n = stepLimit(c); if (n) return n; }
  return 0;
}
const countsIn = (L) => (L.blocks || []).includes('add') || JSON.stringify(L.goal || {}).includes('"counter"');

export function createRunCounter({ root, CS, level: L, kids = playerMode() === 'kids' }) {
  const T = (o) => (kids ? o.k : o.f);
  const limit = stepLimit(L.goal), counts = countsIn(L);
  const batTools = Object.entries(L.tools0 || {}).filter(([k, t]) => t && (t.battery || (k === 'robot' && L.build && L.build.robot))).map(([k]) => k);
  const any = !!(limit || counts || batTools.length);
  const cv = document.createElement('canvas'); cv.width = 190 * PX; cv.height = 64 * PX;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, fog: false, toneMapped: false }));
  spr.renderOrder = 20; spr.visible = false; spr.center.set(0.5, 1);   // hangs under its point
  root.add(spr);
  let st = null, who = null, drawn = '';

  function reset() { st = { t: 0, n: 0, bat: null, batMax: 0 }; who = null; spr.visible = false; drawn = ''; }
  function event(e) {
    if (!any || !st || !e) return;
    if (e.t != null) st.t = Math.max(st.t, e.t | 0);
    if (e.a === 'add' && e.counter != null) st.n = e.counter;
    if (e.bat != null && batTools.includes(e.tool)) { st.bat = e.bat; st.batMax = Math.max(st.batMax, e.bat); }
    if (e.tool) who = e.tool;
    draw();
  }
  function rows() {
    const out = [];
    if (limit) out.push([T(WORDS.steps), String(Math.max(0, limit - st.t)), st.t > limit * 0.75 ? '#e8562a' : '#2f7f6f']);
    if (counts) out.push([T(WORDS.count), String(st.n), '#c98a2b']);
    if (st.bat != null && st.batMax) out.push([T(WORDS.bat), null, st.bat / st.batMax < 0.3 ? '#e8562a' : '#3f9a4a']);
    return out;
  }
  function draw() {
    const R = rows(); if (!R.length) { spr.visible = false; return; }
    const key = JSON.stringify(R) + (st.bat != null ? st.bat + '/' + st.batMax : '');
    spr.visible = true; if (key === drawn) return; drawn = key;
    const W = 190, H = 18 + R.length * 22, g = cv.getContext('2d');
    if (cv.height !== H * PX) { cv.height = H * PX; tex.dispose(); }
    g.setTransform(PX, 0, 0, PX, 0, 0); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(245,241,232,0.94)'; g.strokeStyle = 'rgba(29,44,56,0.35)'; g.lineWidth = 1.5;
    g.beginPath(); g.roundRect(1, 1, W - 2, H - 2, 12); g.fill(); g.stroke();
    g.direction = 'rtl'; g.textBaseline = 'middle';
    R.forEach(([name, val, col], i) => {
      const y = 9 + 11 + i * 22;
      g.fillStyle = '#1d2c38'; g.font = '700 15px Heebo, Rubik, Arial, sans-serif'; g.textAlign = 'right'; g.fillText(name, W - 12, y);
      if (val != null) { g.fillStyle = col; g.font = '800 19px Heebo, Rubik, Arial, sans-serif'; g.textAlign = 'left'; g.direction = 'ltr'; g.fillText(val, 14, y); g.direction = 'rtl'; }
      else {   // the battery: a bar that empties (the drone and a built robot)
        const k = Math.max(0, Math.min(1, st.bat / st.batMax)), bw = 92, bx = 14;
        g.fillStyle = '#d9d2c0'; g.beginPath(); g.roundRect(bx, y - 6, bw, 12, 6); g.fill();
        g.fillStyle = col; g.beginPath(); g.roundRect(bx + bw * (1 - k), y - 6, Math.max(6, bw * k), 12, 6); g.fill();
      }
    });
    tex.image = cv; tex.needsUpdate = true;
    const s = CS * 0.26; spr.scale.set(s * (W / 64), s * (H / 64), 1);
  }
  // by the tool that did the last step (or the robot before the first one)
  function place(tools, wx, wz, toolY) {
    if (!spr.visible) return;
    const k = (who && tools[who] && tools[who].show !== false) ? who : (tools.robot ? 'robot' : Object.keys(tools)[0]);
    const Tt = k && tools[k]; if (!Tt) return;
    spr.position.set(wx(Tt.x), toolY(k, Tt) + CS * 0.1, wz(Tt.y) + CS * 0.45);   // just in front of the tool, under it on the screen: the lesson's top panel never hides it
  }
  function dispose() { root.remove(spr); spr.material.dispose(); tex.dispose(); }
  reset();
  return { reset, event, place, dispose, active: () => any, state: () => (st ? { ...st, visible: spr.visible, pos: spr.position.toArray().map((v) => +v.toFixed(2)), scale: +spr.scale.x.toFixed(2), parent: !!spr.parent, rows: spr.visible ? rows().map((r) => r[0] + ':' + (r[1] == null ? 'bar' : r[1])) : [] } : null) };
}
