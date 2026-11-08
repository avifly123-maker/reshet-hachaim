// מעבדת הרובוטים – סדנת העיצוב: the player designs his three tools (Avi, 29.10: parts to connect, colours, earned as
// he advances). A turning 3D preview (its own small renderer: the island is not drawn while the lab's screens are
// open), the sockets of the chosen tool with the parts that fit them, and three paint rows (body, trim, accent).
// Every change is saved at once (progress.js setToolLook) and the tools wear it on every field (course.js).
// 1.4.3 set 4 (Avi, 3.11: "improve the design garage"): every part is a picture tile drawn from its own 3D mesh in the
// player's colours (so a repaint repaints the tiles and a new Blender mesh needs no new icons), a strip on the preview
// says what the picked part lets the tool do, a new part drops in, "הפתעה" makes a design from the earned parts and
// colours, "כמו בהתחלה" goes back to the tool's first look, a count of what is open, and a hands-on tutorial led by
// קוּבִּי on the first visit (garageTutorial, key g:gartut).
//   const G = openGarage(host, { kids, sfx, guide, voice, onClose })   G.close()   G.state()
import * as THREE from 'three';
import { PARTS, SOCKETS, PAINTS, DEFAULT_LOOK } from '../data/robolab/parts.js';
import { buildTool, buildPart, paintTool, hasBlenderTools, mats } from './three/parts3d.js';
import { BLOCKS } from './engine/blocks.js';
import { garageTutorial } from '../ui/tutorials.js';
import { makeTool } from './three/models.js';
import { toolLook, setToolLook } from './progress.js';
import { earned, earnState, earnWords } from './earn.js';
import { icon } from './ui/icons.js';

import { svcQuality } from '../core/services.js';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TOOLS = [['robot', { f: 'רובוט', k: 'רוֹבּוֹט' }], ['drone', { f: 'רחפן', k: 'רַחְפָן' }], ['sub', { f: 'צוללן', k: 'צוֹלְלָן' }]];
const PAINT_ROWS = [['body', { f: 'גוף', k: 'גּוּף' }], ['trim', { f: 'פסים', k: 'פַּסִּים' }], ['accent', { f: 'קישוטים', k: 'קִשּׁוּטִים' }]];
const NONE = { f: 'בלי', k: 'בְּלִי' };
const W = {
  gives: { f: 'נותן לכלי:', k: 'נוֹתֵן לַכְּלִי:' }, look: { f: 'חלק לעיצוב ולמראה', k: 'חֵלֶק לְעִצּוּב וּלְמַרְאֶה' },
  surprise: { f: 'הפתעה', k: 'הַפְתָּעָה' }, reset: { f: 'כמו בהתחלה', k: 'כְּמוֹ בַּהַתְחָלָה' },
  open: { f: 'פתוחים לכם', k: 'פְּתוּחִים לָכֶם' }, parts: { f: 'חלקים', k: 'חֲלָקִים' }, paints: { f: 'צבעים', k: 'צְבָעִים' },
};
const PART_IDS = Object.keys(PARTS);

export function openGarage(host, { kids = false, sfx = () => { }, toolSound = null, guide = null, voice = null, onClose } = {}) {
  const T = (o) => (o ? (kids && o.k ? o.k : o.f) : '');
  const ES = earnState();
  let tool = 'robot', look = toolLook(tool);
  const el = document.createElement('div'); el.className = 'rl-garage';
  host.appendChild(el);

  // ── the preview
  el.innerHTML = `<header class="rl-top"><button type="button" class="rl-back" data-gclose>${icon('home')}<span>${kids ? 'לַמַּעְבָּדָה' : 'למעבדה'}</span></button>
      <div class="rl-title"><h1>${kids ? 'סַדְנַת הָעִצּוּב' : 'סדנת העיצוב'}</h1><p>${kids ? 'מְעַצְּבִים אֶת הַכֵּלִים שֶׁלָּכֶם' : 'מעצבים את הכלים שלכם: חלקים וצבעים'}</p></div></header>
    <div class="rl-gbody"><div class="rl-gside"><div class="rl-gtabs" role="tablist"></div><div class="rl-gact"><span class="rl-gcount"></span><button type="button" data-gsurp>${icon('star')}<span>${esc(T(W.surprise))}</span></button><button type="button" data-greset>${icon('again')}<span>${esc(T(W.reset))}</span></button></div><div class="rl-gopts"></div></div>
      <div class="rl-gview"><canvas></canvas><div class="rl-ginfo" hidden></div><small>${kids ? 'גִּרְרוּ כְּדֵי לְסוֹבֵב' : 'גררו כדי לסובב'}</small></div></div>`;
  const canvas = el.querySelector('canvas');
  // 1.4.4 set 0 (Avi: "heavy: the surprise button, coming near the robot, it sticks on the wheels and freezes"): the
  // preview follows the game's quality, keeps one set of materials (a new part or a surprise no longer recompiles the
  // GPU's shaders, and old ones no longer pile up), draws at most 30 times a second and not while hidden, and the part
  // tiles are drawn one at a time on a small canvas of their own (they used to be drawn all at once, each by resizing
  // the big preview twice: a surprise that changed the colours redrew every tile in one go and froze the screen)
  const Q = svcQuality();
  const weak = Q === 'min' || Q === 'low';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !weak, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(weak ? 1 : Q === 'medium' ? 1.25 : 1.75, window.devicePixelRatio || 1));
  const MATS = mats({}, { grit: !weak }), TMATS = mats({}, { grit: false });
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
  let model = null, yaw = -0.6, drag = null, raf = 0, last = performance.now(), closed = false, dirty = 2, lastDraw = 0;
  let drop = null, picked = null, changes = 0, tut = null;   // drop: the part that just went on ({ obj, t })

  function rebuild(newSock) {
    if (model) turn.remove(model);
    const parts = { ...(DEFAULT_LOOK[tool] || {}), ...look.parts };
    for (const [s, pid] of Object.entries(parts)) { const P = PARTS[pid]; if (P && P.also) for (const s2 of P.also) if (!(s2 in look.parts)) parts[s2] = pid; }
    model = hasBlenderTools() ? buildTool({ base: tool, parts, paint: look.paint, mats: MATS }) : makeTool(tool, look.paint);
    dirty = 2;
    model.position.y = tool === 'drone' ? 0.55 : tool === 'sub' ? 0.5 : 0;
    turn.add(model);
    const U = model.userData, P = newSock && U.parts && U.parts[newSock];
    drop = P && P.obj ? { obj: P.obj, t: 0 } : null;
    place();
  }
  // the camera backs off on a narrow preview (a small screen), so the whole tool stays in the picture
  function place() {
    const sz = (tool === 'sub' ? 2.9 : 2.6) * Math.max(1, 1.25 / Math.max(0.3, cam.aspect));
    cam.position.set(0, sz * 0.55, sz * 1.45); cam.lookAt(0, 0.5, 0);
  }
  function size() {
    const r = canvas.getBoundingClientRect(); const w = Math.max(100, r.width), h = Math.max(100, r.height);
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); place();
  }
  function frame(now) {
    if (closed) return;
    raf = requestAnimationFrame(frame);
    if (canvas.offsetParent === null || document.hidden) { last = now; return; }
    { const t0 = performance.now(); do tileStep(); while (tileQ.length && performance.now() - t0 < 8); }   // waiting part tiles, about 8 ms a frame
    if (!dirty && !drag && !drop && now - lastDraw < 33) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; lastDraw = now; if (dirty) dirty--;
    if (!drag) yaw += dt * 0.35;
    turn.rotation.y = yaw;
    if (model) {
      const U = model.userData;
      for (const r of U.rotors || []) r.rotation.y += dt * 14;
      if (U.prop) U.prop.rotation.y += dt * 8;
      if (tool === 'drone') model.position.y = 0.55 + Math.sin(now / 500) * 0.04;
    }
    if (drop) {   // a new part comes down onto its socket and settles with a small bounce
      drop.t += dt / 0.42; const t = Math.min(1, drop.t), b = t < 1 ? 1 - Math.pow(1 - t, 3) : 1;
      drop.obj.position.y = (1 - b) * 0.45 + Math.sin(Math.min(1, t) * Math.PI) * 0.03;
      drop.obj.scale.setScalar(0.7 + 0.3 * b + Math.sin(t * Math.PI) * 0.12);
      if (t >= 1) { drop.obj.position.y = 0; drop.obj.scale.setScalar(1); drop = null; }
    }
    renderer.render(scene, cam);
  }
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y0: yaw }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (drag) yaw = drag.y0 + (e.clientX - drag.x) * 0.012; });
  canvas.addEventListener('pointerup', () => { drag = null; });

  // ── the part pictures: each part alone, in the tool's colours, drawn once per colour set and kept
  const pics = new Map();
  const iscene = new THREE.Scene();
  iscene.add(new THREE.HemisphereLight('#eef6ff', '#5a5040', 1.5));
  const isun = new THREE.DirectionalLight('#fff4e0', 2.4); isun.position.set(2, 4, 3); iscene.add(isun);
  const irim = new THREE.DirectionalLight('#9fd8ff', 0.9); irim.position.set(-3, 1, -2); iscene.add(irim);
  const icam = new THREE.PerspectiveCamera(28, 1, 0.01, 50);
  const box = new THREE.Box3(), sph = new THREE.Sphere();
  let tr = null;   // the tiles' own small renderer, made on the first tile
  const tileQ = [];
  const tileKey = (pid) => pid + '|' + ['body', 'trim', 'accent'].map((k) => look.paint[k] || '').join(',');
  function picOf(pid) {
    const key = tileKey(pid);
    if (pics.has(key)) return pics.get(key);
    if (hasBlenderTools() && !tileQ.some((q) => q.key === key)) tileQ.push({ key, pid, paint: { ...look.paint } });
    return '';
  }
  function tileStep() {
    const q = tileQ.shift(); if (!q) return;
    if (pics.has(q.key)) return;
    let url = '';
    try {
      if (!tr) {
        const c = document.createElement('canvas'); c.width = c.height = 128;
        tr = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true });
        tr.outputColorSpace = THREE.SRGBColorSpace; tr.toneMapping = THREE.ACESFilmicToneMapping; tr.toneMappingExposure = 1.05; tr.setClearColor(0x000000, 0);
      }
      const g = buildPart(q.pid, q.paint, TMATS);
      if (g) {
        g.rotation.y = /side_r|_r$/.test(q.pid) ? 0.7 : -0.7;
        iscene.add(g); g.updateMatrixWorld(true);
        box.setFromObject(g); box.getBoundingSphere(sph);
        const r = Math.max(0.05, sph.radius), d = r / Math.sin((icam.fov * Math.PI) / 360) * 1.02;
        icam.position.set(sph.center.x, sph.center.y + d * 0.42, sph.center.z + d * 0.9); icam.lookAt(sph.center);
        tr.render(iscene, icam); url = tr.domElement.toDataURL('image/png');
        iscene.remove(g);   // the materials are the shared TMATS; the geometry is shared (parts3d geo)
      }
    } catch (e) { console.error(e); }
    pics.set(q.key, url);
    // put it into its tile if the tile is on the screen now (same part, same colours)
    if (url && q.key === tileKey(q.pid)) for (const b of el.querySelectorAll(`.rl-gtile[data-gpart="${q.pid}"] .rl-gpic`)) {
      const im = document.createElement('img'); im.className = 'rl-gpic'; im.src = url; im.alt = ''; im.draggable = false; b.replaceWith(im);
    }
  }
  const blockWord = (b) => (BLOCKS[b] ? T(BLOCKS[b]) : '');
  function showInfo(pid) {
    const box = el.querySelector('.rl-ginfo'), P = PARTS[pid];
    if (!P) { box.hidden = true; return; }
    const does = (P.gives || []).map(blockWord).filter(Boolean);
    box.innerHTML = `<b>${esc(T(P))}</b><span>${does.length ? `${esc(T(W.gives))} ${does.map((w) => `<i>${esc(w)}</i>`).join(' ')}` : esc(T(W.look))}</span>`;
    box.hidden = false;
  }
  function counts() {
    const ps = PART_IDS.filter((id) => earned(PARTS[id].earn, ES)).length, cs = PAINTS.filter((C) => earned(C.earn, ES)).length;
    return { parts: ps, partsAll: PART_IDS.length, paints: cs, paintsAll: PAINTS.length };
  }

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
      if (optional) h += `<button type="button" class="rl-gchip rl-gtile none${!cur[s] ? ' on' : ''}" data-gpart="" data-gsock="${s}"><span class="rl-gpic">${icon('del')}</span>${esc(T(NONE))}</button>`;
      for (const [id, P] of list) {
        const ok = earned(P.earn, ES), url = picOf(id);
        const pic = url ? `<img class="rl-gpic" src="${url}" alt="" draggable="false">` : `<span class="rl-gpic">${icon(tool)}</span>`;
        h += `<button type="button" class="rl-gchip rl-gtile${cur[s] === id ? ' on' : ''}${picked === id ? ' pick' : ''}${ok ? '' : ' locked'}" data-gpart="${id}" data-gsock="${s}" ${ok ? '' : `disabled title="${esc(earnWords(P.earn, kids))}"`}>${pic}${ok ? '' : `<span class="rl-glock">${icon('lock')}</span>`}<span>${esc(T(P))}</span>${ok ? '' : `<small>${esc(earnWords(P.earn, kids))}</small>`}</button>`;
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
    const n = counts();
    const cnt = el.querySelector('.rl-gcount');
    cnt.textContent = `${n.parts}/${n.partsAll} ${T(W.parts)} · ${n.paints}/${n.paintsAll} ${T(W.paints)}`; cnt.title = T(W.open);
    const box = el.querySelector('.rl-gopts'), top = box.scrollTop;
    box.innerHTML = h; box.scrollTop = top;
  }
  // a design from what is open: one part on every socket (an optional one may stay empty) and three different colours
  function surprise() {
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const parts = {};
    for (const s of Object.keys(SOCKETS[tool] || {})) {
      const list = PART_IDS.filter((id) => PARTS[id].tool === tool && PARTS[id].socket === s && earned(PARTS[id].earn, ES));
      if (!list.length) continue;
      const optional = !(DEFAULT_LOOK[tool] || {})[s];
      const id = optional && Math.random() < 0.35 ? null : pick(list);
      parts[s] = id; if (id && PARTS[id].also) for (const s2 of PARTS[id].also) parts[s2] = id;
    }
    const cols = PAINTS.filter((C) => earned(C.earn, ES)).map((C) => C.c).sort(() => Math.random() - 0.5);
    const paint = {}; PAINT_ROWS.forEach(([slot], i) => { if (cols[i]) paint[slot] = cols[i]; });
    look = { parts, paint }; setToolLook(tool, look); changes++;
  }
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.gclose != null) { close(); if (onClose) onClose(); return; }
    if (b.dataset.gtool) { tool = b.dataset.gtool; look = toolLook(tool); picked = null; showInfo(null); if (toolSound) toolSound(tool, 0.5); else sfx('click'); renderTabs(); renderOpts(); rebuild(); return; }
    if (b.dataset.gsurp != null) { surprise(); picked = null; showInfo(null); sfx('pop'); renderOpts(); rebuild(); return; }
    if (b.dataset.greset != null) { look = { parts: {}, paint: {} }; setToolLook(tool, look); changes++; picked = null; showInfo(null); sfx('click'); renderOpts(); rebuild(); return; }
    if (b.dataset.gsock) {
      const s = b.dataset.gsock, id = b.dataset.gpart;
      look.parts[s] = id || null;
      const P = PARTS[id]; if (P && P.also) for (const s2 of P.also) look.parts[s2] = id;
      if (!id) for (const [s2, pid] of Object.entries(look.parts)) if (pid && PARTS[pid] && PARTS[pid].also && PARTS[pid].also.includes(s2) && s === PARTS[pid].socket) look.parts[s2] = null;
      setToolLook(tool, look); changes++; picked = id || null; showInfo(picked); sfx('pop'); renderOpts(); rebuild(id ? s : null); return;
    }
    if (b.dataset.gpaint) { look.paint[b.dataset.gslot] = b.dataset.gpaint; setToolLook(tool, look); changes++; sfx('pop'); renderOpts(); if (model) paintTool(model, look.paint); return; }
  });
  const onResize = () => size();
  window.addEventListener('resize', onResize);
  renderTabs(); renderOpts(); rebuild();
  requestAnimationFrame(() => { size(); raf = requestAnimationFrame(frame); });
  const state = () => ({ tool, picked, changes, parts: { ...look.parts }, paint: { ...look.paint }, tiles: el.querySelectorAll('.rl-gtile img').length, open: counts(), tut: tut && tut.step });
  // the first visit: קוּבִּי asks for one part, one colour and a look at the surprise (the standing rule of 29.10)
  setTimeout(() => { if (!closed && guide) tut = garageTutorial({ guide, gar: { state }, voice }); }, 400);

  function close() {
    if (closed) return; closed = true; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize);
    if (tut) { tut.stop(); tut = null; }
    for (const m of [...Object.values(MATS), ...Object.values(TMATS)]) m.dispose();
    if (tr) { tr.dispose(); try { tr.forceContextLoss(); } catch (e) { } tr = null; }
    renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) { }
    el.remove();
  }
  return { close, el, state };
}
