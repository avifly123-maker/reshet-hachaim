// The workshop as a room to look around in (5.11, Avi: "a 3D room like the lab; move round in it; ניצוץ moves in it;
// the windows look out on the rainforest"). The room is one panorama rendered in Blender from its middle
// (tools/blender/workshop_room.py → tools/build-workshop-room.py → src/data/workshop-room-art.js) and drawn with the
// lab's own look-around view (src/lab/room-view.js: drag, arrows, keys). ניצוץ is live in 3D on top of it: he floats on
// the rug, follows the child's eye, and when a place is chosen he flies to it on a ring round the middle, and only then
// the place opens. The seven places are rings on the picture with their names (the same `.ws-st[data-st]` buttons as the
// flat room, so the tutorial and the checks find them), and an arrow at the edge for a place out of sight.
//   const R = createRoom3d(host, { kids, names, counts, onPick(id), act })   R.dispose()   R.state()
// One small renderer while the room is shown; nothing is drawn while the window is hidden; at most 30 frames a second.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createRoomView, yawOf } from '../lab/room-view.js';
import { createNitzotz } from './nitzotz.js';
import { WS_ROOM } from '../data/workshop-room-art.js';
import { icon } from '../ui/ui/icons.js';
import { esc } from '../ui/ui/helpers.js';

const D2R = Math.PI / 180;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const ease = (k) => k * k * (3 - 2 * k);
export const roomReady = () => !!(WS_ROOM && WS_ROOM.pano);

export function createRoom3d(host, { kids = false, names = {}, counts = {}, onPick = () => { }, quality = 'medium' } = {}) {
  const weak = quality === 'min' || quality === 'low';
  host.innerHTML = `<div class="wr3"><canvas class="wr3-cv"></canvas><div class="wr3-hots">${Object.keys(WS_ROOM.places).map((id) =>
    `<button type="button" class="ws-st wr3-hot" data-st="${id}"><i class="wr3-ring"></i><b class="ws-plaque">${esc(names[id] || id)}</b>${counts[id] ? `<em class="ws-count">${esc(counts[id])}</em>` : ''}</button>`).join('')}</div>
    <button type="button" class="wr3-turn l" data-wr3="-1" aria-label="${kids ? 'לְהִסְתּוֹבֵב' : 'להסתובב'}">${icon('arrowL')}</button><button type="button" class="wr3-turn r" data-wr3="1" aria-label="${kids ? 'לְהִסְתּוֹבֵב' : 'להסתובב'}">${icon('arrowR')}</button>
    <div class="wr3-edge"></div></div>`;
  const box = host.querySelector('.wr3'), cv = box.querySelector('.wr3-cv');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: !weak, alpha: false }); } catch (e) { return null; }
  renderer.setPixelRatio(Math.min(weak ? 1 : 1.5, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(60, 1, 0.05, 200);
  const view = createRoomView({ url: WS_ROOM.pano, eye: WS_ROOM.eye, renderer });
  view.quad.material.toneMapped = false; scene.add(view.quad); view.load();
  try { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.8; pm.dispose(); } catch (e) { }
  scene.add(new THREE.HemisphereLight('#fff4e0', '#8a6a4a', 1.5)); const sun = new THREE.DirectionalLight('#fff0d0', 2.2); sun.position.set(0, 4, -3); scene.add(sun);

  // ניצוץ: floats a little above the rug, on a ring round the eye; a little smaller than a child would stand
  const nz = createNitzotz({ sparks: !weak }); nz.object.scale.setScalar(0.62); scene.add(nz.object);
  const P = WS_ROOM.places, RING = Math.hypot(P.cards.stop[0], P.cards.stop[2]);
  const at = (th) => new THREE.Vector3(RING * Math.sin(th), 0.55, -RING * Math.cos(th));
  const W = { th: 18 * D2R, from: 0, to: 0, t: 0, dur: 0, onEnd: null, bob: 0 };
  nz.object.position.copy(at(W.th));
  view.face(0, -6 * D2R, true);
  function flyTo(id, done) {
    const tgt = Math.atan2(P[id].stop[0], -P[id].stop[2]);
    W.from = W.th; W.to = W.th + wrap(tgt - W.th); W.t = 0; W.dur = Math.max(0.55, Math.min(1.3, Math.abs(W.to - W.from) * 0.42)); W.onEnd = done;
    view.face(yawOf(new THREE.Vector3(P[id].hot[0], 0, P[id].hot[2]), view.EYE), -12 * D2R);
    nz.set('excited');
  }

  // the rings on the picture and the arrows at the edge
  const hots = [...box.querySelectorAll('.wr3-hot')], edge = box.querySelector('.wr3-edge');
  const v3 = new THREE.Vector3();
  function placeHots(Wd, Hd) {
    let left = [], right = [];
    for (const b of hots) {
      const p = P[b.dataset.st].hot; v3.set(p[0], p[1], p[2]);
      const dir = v3.clone().sub(view.EYE), fwd = new THREE.Vector3(); cam.getWorldDirection(fwd);
      v3.project(cam);
      const inFront = dir.dot(fwd) > 0, sx = (v3.x * 0.5 + 0.5) * Wd, sy = (-v3.y * 0.5 + 0.5) * Hd;
      const vis = inFront && sx > 72 && sx < Wd - 72 && sy > 10 && sy < Hd - 10;   // clear of the turning arrows at the sides
      b.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px)`; b.classList.toggle('off', !vis);
      if (!vis) { const yawTo = wrap(yawOf(new THREE.Vector3(p[0], 0, p[2]), view.EYE) - view.S.yaw); (yawTo < 0 ? left : right).push(b.dataset.st); }
    }
    const key = left.join() + '|' + right.join();
    if (edge.dataset.k !== key) {
      edge.dataset.k = key;
      edge.innerHTML = (left.length ? `<button type="button" class="wr3-edgeb l" data-wr3go="${left[left.length - 1]}">${icon('arrowL')}<span>${esc(names[left[left.length - 1]] || '')}</span></button>` : '')
        + (right.length ? `<button type="button" class="wr3-edgeb r" data-wr3go="${right[0]}"><span>${esc(names[right[0]] || '')}</span>${icon('arrowR')}</button>` : '');
    }
  }

  // input: drag the room, the side arrows (a click turns a step, holding keeps turning), keys
  let down = null, busy = false;
  cv.addEventListener('pointerdown', (e) => { const r = cv.getBoundingClientRect(); down = { id: e.pointerId }; view.dragStart(e.clientX - r.left, e.clientY - r.top, r.width, r.height); try { cv.setPointerCapture(e.pointerId); } catch (er) { } });
  cv.addEventListener('pointermove', (e) => { if (!down) return; const r = cv.getBoundingClientRect(); view.dragMove(e.clientX - r.left, e.clientY - r.top, cam); });
  const up = () => { if (!down) return; down = null; view.dragEnd(); };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  box.addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-wr3]'); if (b) view.holdStart(+b.dataset.wr3); });
  const end = () => view.holdEnd();
  box.addEventListener('pointerup', end); box.addEventListener('pointerleave', end);
  box.addEventListener('click', (e) => {
    const g = e.target.closest('[data-wr3go]'); if (g) { const p = P[g.dataset.wr3go].hot; view.face(yawOf(new THREE.Vector3(p[0], 0, p[2]), view.EYE)); return; }
    const b = e.target.closest('.wr3-hot'); if (!b || busy) return;
    e.stopPropagation(); busy = true; b.classList.add('go');
    flyTo(b.dataset.st, () => { busy = false; onPick(b.dataset.st); });
  }, true);
  const onKey = (e) => { if (e.key === 'ArrowLeft') view.step(-25, 0); else if (e.key === 'ArrowRight') view.step(25, 0); };
  addEventListener('keydown', onKey);

  let raf = 0, lastT = performance.now(), lastDraw = 0, dead = false;
  function frame(now) {
    if (dead) return; raf = requestAnimationFrame(frame);
    if (cv.offsetParent === null || document.hidden) { lastT = now; return; }
    if (now - lastDraw < 33) return; lastDraw = now;
    const dt = Math.min(0.06, (now - lastT) / 1000); lastT = now;
    const r = cv.getBoundingClientRect(), w = Math.max(80, r.width | 0), h = Math.max(80, r.height | 0);
    if (cv.width !== Math.round(w * renderer.getPixelRatio()) || cv.height !== Math.round(h * renderer.getPixelRatio())) renderer.setSize(w, h, false);
    view.apply(cam, w, h, dt);
    if (W.onEnd) {   // flying round the ring to a place
      W.t += dt; const k = ease(Math.min(1, W.t / W.dur)); W.th = W.from + (W.to - W.from) * k;
      if (W.t >= W.dur) { const f = W.onEnd; W.onEnd = null; nz.set('idea'); setTimeout(f, 180); }
    }
    else {   // idle: he keeps near the child's eye, a little to the side, drifting after it as the room turns
      const want = view.S.yaw + 22 * D2R; W.th += wrap(want - W.th) * (1 - Math.exp(-dt * 1.6));
    }
    W.bob += dt; const p = at(W.th); p.y += Math.sin(W.bob * 1.6) * 0.05;
    nz.object.position.copy(p);
    nz.object.rotation.y = Math.atan2(view.EYE.x - p.x, view.EYE.z - p.z) * 0.85 + (W.onEnd ? Math.sign(W.to - W.from) * 0.6 : 0);
    placeHots(w, h);   // before drawing: the rings stay right even when a slow computer draws late
    nz.update(dt); renderer.render(scene, cam);
  }
  raf = requestAnimationFrame(frame);
  return {
    act: (x) => nz.set(x),
    state: () => ({ yaw: Math.round(view.S.yaw / D2R), loaded: view.loaded, th: Math.round(W.th / D2R), flying: !!W.onEnd, visible: hots.filter((b) => !b.classList.contains('off')).map((b) => b.dataset.st) }),
    face: (id) => { const p = P[id].hot; view.face(yawOf(new THREE.Vector3(p[0], 0, p[2]), view.EYE), null, true); W.th = view.S.yaw + 22 * D2R; },
    dispose() {
      if (dead) return; dead = true; cancelAnimationFrame(raf); removeEventListener('keydown', onKey);
      nz.dispose(); view.dispose(); view.quad.geometry.dispose(); view.quad.material.dispose();
      if (scene.environment) scene.environment.dispose();
      renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) { }
    },
  };
}
