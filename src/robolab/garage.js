// מעבדת הרובוטים – סדנת העיצוב: the player designs his three tools (Avi, 29.10: parts to connect, colours, earned as
// he advances). A turning 3D preview (its own small renderer: the island is not drawn while the lab's screens are
// open), the sockets of the chosen tool with the parts that fit them, and three paint rows (body, trim, accent).
// Every change is saved at once (progress.js setToolLook) and the tools wear it on every field (course.js).
//   const G = openGarage(host, { kids, sfx, onClose })   G.close()
import * as THREE from 'three';
import { PARTS, SOCKETS, PAINTS, DEFAULT_LOOK } from '../data/robolab/parts.js';
import { buildTool, attachPart, paintTool, hasBlenderTools } from './three/parts3d.js';
import { makeTool } from './three/models.js';
import { toolLook, setToolLook } from './progress.js';
import { earned, earnState, earnWords } from './earn.js';
import { icon } from './ui/icons.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TOOLS = [['robot', { f: 'רובוט', k: 'רוֹבּוֹט' }], ['drone', { f: 'רחפן', k: 'רַחְפָן' }], ['sub', { f: 'צוללן', k: 'צוֹלְלָן' }]];
const PAINT_ROWS = [['body', { f: 'גוף', k: 'גּוּף' }], ['trim', { f: 'פסים', k: 'פַּסִּים' }], ['accent', { f: 'קישוטים', k: 'קִשּׁוּטִים' }]];
const NONE = { f: 'בלי', k: 'בְּלִי' };

export function openGarage(host, { kids = false, sfx = () => { }, onClose } = {}) {
  const T = (o) => (o ? (kids && o.k ? o.k : o.f) : '');
  const ES = earnState();
  let tool = 'robot', look = toolLook(tool);
  const el = document.createElement('div'); el.className = 'rl-garage';
  host.appendChild(el);

  // ── the preview
  el.innerHTML = `<header class="rl-top"><button type="button" class="rl-back" data-gclose>${icon('home')}<span>${kids ? 'לַמַּעְבָּדָה' : 'למעבדה'}</span></button>
      <div class="rl-title"><h1>${kids ? 'סַדְנַת הָעִצּוּב' : 'סדנת העיצוב'}</h1><p>${kids ? 'מְעַצְּבִים אֶת הַכֵּלִים שֶׁלָּכֶם' : 'מעצבים את הכלים שלכם: חלקים וצבעים'}</p></div></header>
    <div class="rl-gbody"><div class="rl-gside"><div class="rl-gtabs" role="tablist"></div><div class="rl-gopts"></div></div>
      <div class="rl-gview"><canvas></canvas><small>${kids ? 'גִּרְרוּ כְּדֵי לְסוֹבֵב' : 'גררו כדי לסובב'}</small></div></div>`;
  const canvas = el.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  scene.add(new THREE.HemisphereLight('#dff0ff', '#3a4a40', 1.4));
  const sun = new THREE.DirectionalLight('#fff4e0', 2.2); sun.position.set(3, 5, 4); scene.add(sun);
  const rim = new THREE.DirectionalLight('#9fd8ff', 1.0); rim.position.set(-4, 2, -3); scene.add(rim);
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.7, 0.08, 48), new THREE.MeshStandardMaterial({ color: '#e9e2d2', roughness: 0.8 }));
  floor.position.y = -0.04; scene.add(floor);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.62, 0.025, 8, 64), new THREE.MeshStandardMaterial({ color: '#e8873a', emissive: '#e8873a', emissiveIntensity: 0.4 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.01; scene.add(ring);
  const turn = new THREE.Group(); scene.add(turn);
  let model = null, yaw = -0.6, drag = null, raf = 0, last = performance.now(), closed = false;

  function rebuild() {
    if (model) turn.remove(model);
    const parts = { ...(DEFAULT_LOOK[tool] || {}), ...look.parts };
    for (const [s, pid] of Object.entries(parts)) { const P = PARTS[pid]; if (P && P.also) for (const s2 of P.also) if (!(s2 in look.parts)) parts[s2] = pid; }
    model = hasBlenderTools() ? buildTool({ base: tool, parts, paint: look.paint }) : makeTool(tool, look.paint);
    model.position.y = tool === 'drone' ? 0.55 : tool === 'sub' ? 0.5 : 0;
    turn.add(model);
    const sz = tool === 'robot' ? 2.6 : tool === 'drone' ? 2.6 : 2.9;
    cam.position.set(0, sz * 0.55, sz * 1.45); cam.lookAt(0, tool === 'robot' ? 0.5 : 0.5, 0);
  }
  function size() {
    const r = canvas.getBoundingClientRect(); const w = Math.max(100, r.width), h = Math.max(100, r.height);
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  function frame(now) {
    if (closed) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!drag) yaw += dt * 0.35;
    turn.rotation.y = yaw;
    if (model) {
      const U = model.userData;
      for (const r of U.rotors || []) r.rotation.y += dt * 14;
      if (U.prop) U.prop.rotation.y += dt * 8;
      if (tool === 'drone') model.position.y = 0.55 + Math.sin(now / 500) * 0.04;
    }
    renderer.render(scene, cam);
  }
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y0: yaw }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (drag) yaw = drag.y0 + (e.clientX - drag.x) * 0.012; });
  canvas.addEventListener('pointerup', () => { drag = null; });

  // ── the options
  function renderTabs() {
    el.querySelector('.rl-gtabs').innerHTML = TOOLS.map(([k, n]) => `<button type="button" role="tab" data-gtool="${k}" aria-selected="${tool === k}">${icon(k)}<span>${esc(T(n))}</span></button>`).join('');
  }
  function renderOpts() {
    const cur = { ...(DEFAULT_LOOK[tool] || {}), ...look.parts };
    const socks = Object.entries(SOCKETS[tool] || {}).filter(([s]) => Object.values(PARTS).some((P) => P.tool === tool && (P.socket === s)));
    let h = '';
    for (const [s, name] of socks) {
      const list = Object.entries(PARTS).filter(([, P]) => P.tool === tool && P.socket === s);
      const optional = !(DEFAULT_LOOK[tool] || {})[s];
      h += `<div class="rl-grow"><b>${esc(T(name))}</b><div class="rl-gchips">`;
      if (optional) h += `<button type="button" class="rl-gchip${!cur[s] ? ' on' : ''}" data-gpart="" data-gsock="${s}">${esc(T(NONE))}</button>`;
      for (const [id, P] of list) {
        const ok = earned(P.earn, ES);
        h += `<button type="button" class="rl-gchip${cur[s] === id ? ' on' : ''}${ok ? '' : ' locked'}" data-gpart="${id}" data-gsock="${s}" ${ok ? '' : `disabled title="${esc(earnWords(P.earn, kids))}"`}>${ok ? '' : icon('lock')}${esc(T(P))}${ok ? '' : `<small>${esc(earnWords(P.earn, kids))}</small>`}</button>`;
      }
      h += `</div></div>`;
    }
    for (const [slot, name] of PAINT_ROWS) {
      h += `<div class="rl-grow"><b>${esc(T(name))}</b><div class="rl-gsw">`;
      for (const C of PAINTS) {
        const ok = earned(C.earn, ES), on = (look.paint[slot] || '').toLowerCase() === C.c.toLowerCase();
        h += `<button type="button" class="rl-sw${on ? ' on' : ''}${ok ? '' : ' locked'}" style="--sw:${C.c}" data-gpaint="${C.c}" data-gslot="${slot}" ${ok ? '' : 'disabled'} title="${esc(T(C))}${ok ? '' : ' · ' + esc(earnWords(C.earn, kids))}" aria-label="${esc(T(C))}"></button>`;
      }
      h += `</div></div>`;
    }
    el.querySelector('.rl-gopts').innerHTML = h;
  }
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.gclose != null) { close(); if (onClose) onClose(); return; }
    if (b.dataset.gtool) { tool = b.dataset.gtool; look = toolLook(tool); sfx('click'); renderTabs(); renderOpts(); rebuild(); return; }
    if (b.dataset.gsock) {
      const s = b.dataset.gsock, id = b.dataset.gpart;
      look.parts[s] = id || null;
      const P = PARTS[id]; if (P && P.also) for (const s2 of P.also) look.parts[s2] = id;
      if (!id) for (const [s2, pid] of Object.entries(look.parts)) if (pid && PARTS[pid] && PARTS[pid].also && PARTS[pid].also.includes(s2) && s === PARTS[pid].socket) look.parts[s2] = null;
      setToolLook(tool, look); sfx('pop'); renderOpts(); rebuild(); return;
    }
    if (b.dataset.gpaint) { look.paint[b.dataset.gslot] = b.dataset.gpaint; setToolLook(tool, look); sfx('pop'); renderOpts(); if (model) paintTool(model, look.paint); return; }
  });
  const onResize = () => size();
  window.addEventListener('resize', onResize);
  renderTabs(); renderOpts(); rebuild();
  requestAnimationFrame(() => { size(); raf = requestAnimationFrame(frame); });

  function close() {
    if (closed) return; closed = true; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize);
    renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) { }
    el.remove();
  }
  return { close, el };
}
