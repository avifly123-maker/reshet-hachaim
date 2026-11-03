// סדנת הרובוט (1.4.3, set 3): the child builds a robot from parts, sees what each part changes, and tries it on the test
// track. Separate from סדנת העיצוב (garage.js: looks only). Opens from the robot lab's home at journey stage 9
// ('robolab:workshop'). Avi (3.11): the parts come in slowly (workshop.js WK_STEPS, a card for each new step), without
// confusing, with written explanations of what each part does, what to watch for, and where it fits.
//   const W = openWorkshop(host, { kids, sfx, onClose })   W.close()
// Layout (RTL): a side panel with two tabs (the garage: up to 8 named robots; the parts, by family) and, beside it, the
// robot: a turning preview, its numbers, the rules it breaks, and the test track (one ground at a time).
// Beginners (kids) build from a ready robot with three choices only: wheels, tools, sensors; a tool that needs a motor
// gets one by itself.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CHASSIS, PARTS, PRESETS, FAMILIES } from '../data/robolab/workshop.js';
import { PART_WORDS, FAMILY_WORDS, STEP_WORDS, PROBLEM_WORDS, STAT_WORDS, ZONE_GROUND, GROUND_WORDS } from '../data/robolab/workshop-text.js';
import { FAIL_LINES } from '../data/robolab/lines.js';
import { checkBuild, statsOf, fitOf } from './engine/build.js';
import { runProgram } from './engine/run.js';
import { buildTool, hasBlenderTools } from './three/parts3d.js';
import { makeTool } from './three/models.js';
import { wkLook, socketsOf } from '../data/robolab/workshop-look.js';
import { myRobots, saveRobot, deleteRobot, addTrial, wkState, MAX_ROBOTS } from './progress.js';
import { earned, earnState, earnWords, wkStepOf } from './earn.js';
import { icon } from './ui/icons.js';
import { workshopTutorial } from '../ui/tutorials.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ALL = { ...CHASSIS, ...PARTS };
// the test track: one ground in the middle of a short straight way (engine cells, world.js)
export const TRACKS = [
  { id: 'ground', cell: '.' }, { id: 'sand', cell: 's' }, { id: 'mud', cell: 'm' },
  { id: 'slope', cell: 'h' }, { id: 'narrow', cell: 'n' }, { id: 'shallow', cell: 'w' },
];
const TRACK_LEN = 8;
const trackLevel = (t) => ({ map: { rows: ['..' + t.cell.repeat(4) + '..'] }, tools: { robot: { x: 0, y: 0, dir: 1 } }, goal: { t: 'reach', tool: 'robot', x: TRACK_LEN - 1, y: 0 } });
const STAT_MAX = { speed: 1.4, force: 1.6, precision: 1, battery: 100, lift: 3 };
const blank = () => JSON.parse(JSON.stringify(PRESETS.gardener.build));
let uid = Date.now() % 100000;

export function openWorkshop(host, { kids = false, sfx = () => { }, onClose, guide = null } = {}) {
  const T = (o) => (o ? (kids && o.k ? o.k : o.f) : '');
  const w = (f, k) => (kids ? k : f);
  let ES = earnState(), step = wkStepOf();
  const open = (id) => !!ALL[id] && earned(ALL[id].earn, ES);
  // the robot on the bench: one of the garage's, or a new one from a ready robot
  let robots = myRobots();
  let cur = robots[0] ? JSON.parse(JSON.stringify(robots[0])) : { id: 'r' + (++uid), name: w('רובוט 1', 'רוֹבּוֹט 1'), build: blank() };
  let tab = robots.length ? 'parts' : 'garage', fam = kids ? 'move' : 'chassis', picked = null, delAsk = null, lastRun = null;
  const el = document.createElement('div'); el.className = 'rl-garage rl-wk';
  host.appendChild(el);
  el.innerHTML = `<header class="rl-top"><button type="button" class="rl-back" data-wclose>${icon('home')}<span>${w('למעבדה', 'לַמַּעְבָּדָה')}</span></button>
      <div class="rl-title"><h1>${w('סדנת הרובוט', 'סַדְנַת הָרוֹבּוֹט')}</h1><p>${w('בונים רובוט מחלקים, ומנסים אותו', 'בּוֹנִים רוֹבּוֹט מֵחֲלָקִים, וּמְנַסִּים אוֹתוֹ')}</p></div>
      <div class="rl-count wk-step" title="${esc(w('החלקים נפתחים שלב אחרי שלב', 'הַחֲלָקִים נִפְתָּחִים שָׁלָב אַחֲרֵי שָׁלָב'))}">${icon('lock')}<b></b><small>${w('שלב בסדנה', 'שָׁלָב בַּסַּדְנָה')}</small></div></header>
    <div class="rl-gbody"><div class="rl-gside"><div class="rl-gtabs" role="tablist"></div><div class="rl-gopts wk-side"></div><div class="wk-card" hidden></div></div>
      <div class="wk-main"><div class="rl-gview"><canvas></canvas><input class="wk-name" maxlength="18" aria-label="${esc(w('שם הרובוט', 'שֵׁם הָרוֹבּוֹט'))}"></div>
        <div class="wk-stats"></div><div class="wk-probs"></div><div class="wk-track"></div></div></div>
    <div class="wk-steps" hidden></div>`;

  // ── the preview: the build in its Blender chassis and parts, on a turntable, lit like a workshop (a soft room
  //    reflected in the paint and the steel, a warm key, a cool rim), framed to its own size
  const canvas = el.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  try { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.35; pm.dispose(); } catch (e) { }
  scene.add(new THREE.HemisphereLight('#dff0ff', '#3a4a40', 0.8));
  const sun = new THREE.DirectionalLight('#fff4e0', 2.0); sun.position.set(-2.5, 4, 3); scene.add(sun);
  const rim = new THREE.DirectionalLight('#cfe6ff', 1.4); rim.position.set(2, 2.5, -3.5); scene.add(rim);
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.22, 0.08, 64), new THREE.MeshStandardMaterial({ color: '#e9e2d2', roughness: 0.8 }));
  floor.position.y = -0.04; scene.add(floor);
  const turn = new THREE.Group(); scene.add(turn);
  let model = null, yaw = -0.6, drag = null, raf = 0, last = performance.now(), closed = false;
  // the garage's feel (Avi, 3.11): a new part drops onto its place with a click, the places a picked part can go glow
  let shownLook = null, drops = [], marks = [], markT = 0;
  const glowMat = new THREE.MeshBasicMaterial({ color: '#7fe3ff', transparent: true, opacity: 0.85, depthTest: false });
  const glowGeo = new THREE.SphereGeometry(0.035, 16, 10);
  function rebuild() {
    if (model) turn.remove(model);
    // the build as it is: its chassis, wheels and the parts that have a picture (src/data/robolab/workshop-look.js)
    const L = wkLook(cur.build), before = shownLook && shownLook.base === L.base ? shownLook.parts : null;
    model = hasBlenderTools() ? (buildTool(L) || buildTool({ base: 'robot' })) : makeTool('robot');
    if (model) turn.add(model);
    drops = [];
    if (before && model && model.userData.parts) for (const [sock, P] of Object.entries(model.userData.parts)) {
      if (P && before[sock] !== P.id) { P.obj.position.y = 0.38; drops.push({ obj: P.obj, t: 0 }); }
    }
    shownLook = L; marks = []; showSockets(picked);
    // frame the robot: a three-quarter view from the front, as far as its size needs
    let r = 0.9, cy = 0.35;
    if (model) { const bb = new THREE.Box3().setFromObject(model), sz = bb.getSize(new THREE.Vector3()); r = Math.max(0.5, sz.length() / 2); cy = (bb.min.y + bb.max.y) / 2; }
    const d = r / Math.sin((cam.fov * Math.PI / 180) / 2) * 0.66;
    cam.position.set(d * 0.42, cy + d * 0.38, d * 0.82); cam.lookAt(0, cy, 0);
  }
  // the places on the robot where the picked part would go, glowing
  function showSockets(id) {
    for (const m of marks) m.parent && m.parent.remove(m);
    marks = [];
    if (!id || !model || !model.userData.sockets) return;
    for (const s of socketsOf(id, B())) {
      const o = model.userData.sockets[s]; if (!o) continue;
      const m = new THREE.Mesh(glowGeo, glowMat); m.renderOrder = 10; m.position.y = 0.06; o.add(m); marks.push(m);
    }
  }
  function size() { const r = canvas.getBoundingClientRect(); const ww = Math.max(100, r.width), hh = Math.max(80, r.height); renderer.setSize(ww, hh, false); cam.aspect = ww / hh; cam.updateProjectionMatrix(); }
  function frame(now) {
    if (closed) return; raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!drag) yaw += dt * 0.35; turn.rotation.y = yaw;
    for (const D of drops) {   // a part dropping in: down with a little bounce, a click when it lands
      if (D.t >= 1) continue;
      D.t = Math.min(1, D.t + dt / 0.38); const e = 1 - Math.pow(1 - D.t, 3);
      D.obj.position.y = 0.38 * (1 - e) + (D.t > 0.8 ? Math.sin((D.t - 0.8) / 0.2 * Math.PI) * 0.015 : 0);
      if (D.t >= 1) { D.obj.position.y = 0; sfx('click'); }
    }
    markT += dt; for (const m of marks) m.scale.setScalar(1 + Math.sin(markT * 5) * 0.3);
    renderer.render(scene, cam);
  }
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y0: yaw }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (drag) yaw = drag.y0 + (e.clientX - drag.x) * 0.012; });
  canvas.addEventListener('pointerup', () => { drag = null; });

  // ── where a part goes in the build, and whether it is on
  const B = () => cur.build;
  const listOf = (id) => {
    const p = ALL[id]; if (!p) return null;
    if (p.fam === 'sensor') return 'sensors';
    if (p.fam === 'tool' || p.fam === 'team') return 'tools';
    if (p.mech) return 'mechs';
    if (p.fam === 'chassis' && !CHASSIS[id]) return 'extras';
    if (p.fam === 'move' && !p.set) return 'extras';
    return null;
  };
  const isOn = (id) => {
    const b = B(), L = listOf(id);
    if (CHASSIS[id]) return b.chassis === id;
    if (ALL[id].set === 'wheels') return b.wheels === id;
    if (ALL[id].gear) return b.gear === id;
    if (ALL[id].rpm) return b.drive === id || (b.motors || []).includes(id);
    return !!L && (b[L] || []).includes(id);
  };
  function toggle(id, how) {
    const b = B(), p = ALL[id], L = listOf(id);
    if (CHASSIS[id]) b.chassis = id;
    else if (p.set === 'wheels') b.wheels = id;
    else if (p.gear) b.gear = b.gear === id ? null : id;
    else if (p.rpm) { if (how === 'drive') b.drive = id; else if (how === 'remove') { const i = b.motors.indexOf(id); if (i >= 0) b.motors.splice(i, 1); } else b.motors.push(id); }
    else if (L) { const a = b[L] = b[L] || []; const i = a.indexOf(id); if (i >= 0) a.splice(i, 1); else a.push(id); }
    // beginners: a tool that needs a motor gets one, and a motor nobody needs goes (they only choose wheels, tools, sensors)
    if (kids) {
      const need = (b.tools || []).filter((t) => ALL[t] && ALL[t].motor).length;
      while (b.motors.length < need && b.motors.length < 2) b.motors.push('motor_med');
      while (b.motors.length > need) b.motors.pop();
    }
    sfx('pop'); persist(); renderAll(); rebuild();
  }
  function persist() { if (myRobots().some((r) => r.id === cur.id)) saveRobot(cur); }

  // ── the side panel
  function renderTabs() {
    el.querySelector('.rl-gtabs').innerHTML = [['garage', w('המוסך', 'הַמּוּסָךְ'), 'robot'], ['parts', w('החלקים', 'הַחֲלָקִים'), 'paint']]
      .map(([k, n, ic]) => `<button type="button" role="tab" data-wtab="${k}" aria-selected="${tab === k}">${icon(ic)}<span>${esc(n)}</span></button>`).join('');
  }
  function renderGarage() {
    robots = myRobots();
    let h = `<p class="wk-note">${esc(w(`אפשר לשמור עד ${MAX_ROBOTS} רובוטים, לתת להם שם ולבחור ביניהם.`, `אֶפְשָׁר לִשְׁמֹר עַד ${MAX_ROBOTS} רוֹבּוֹטִים, לָתֵת לָהֶם שֵׁם וְלִבְחֹר בֵּינֵיהֶם.`))}</p><div class="wk-robots">`;
    for (const r of robots) {
      const st = statsOf(r.build);
      h += `<div class="wk-rob${r.id === cur.id ? ' on' : ''}"><button type="button" data-wpick="${r.id}"><b>${esc(r.name)}</b><small>${st ? esc(w(`${st.mass} גרם · ${Object.values(r.build).flat().filter(Boolean).length} חלקים`, `${st.mass} גְּרַם`)) : esc(T(PROBLEM_WORDS.any))}</small></button>`
        + `<button type="button" class="wk-del" data-wdel="${r.id}" aria-label="${esc(w('למחוק', 'לִמְחֹק'))}">${delAsk === r.id ? esc(w('בטוח?', 'בָּטוּחַ?')) : icon('del')}</button></div>`;
    }
    h += `</div>`;
    if (robots.length < MAX_ROBOTS) {
      h += `<b class="wk-h">${esc(w('רובוט חדש', 'רוֹבּוֹט חָדָשׁ'))}</b><div class="rl-gchips">`;
      for (const [k, P] of Object.entries(PRESETS)) {
        const ok = step >= P.step;
        h += `<button type="button" class="rl-gchip${ok ? '' : ' locked'}" data-wnew="${k}" ${ok ? '' : 'disabled'}>${ok ? '' : icon('lock')}<span>${esc(T(P))}</span>${ok ? '' : `<small>${esc(earnWords('wk:' + P.step, kids))}</small>`}</button>`;
      }
      h += `</div>`;
    }
    return h;
  }
  // the families a child sees: beginners only the three they choose
  const FAMS = () => (kids ? [['move', { f: 'גלגלים', k: 'גַּלְגַּלִּים' }], ['tool', FAMILIES.tool], ['sensor', FAMILIES.sensor]] : Object.entries(FAMILIES));
  const inFam = (id, f) => { const p = ALL[id]; if (kids && f === 'move') return p.set === 'wheels'; return p.fam === f; };
  function renderParts() {
    let h = `<div class="wk-fams">${FAMS().map(([k, n]) => `<button type="button" data-wfam="${k}" class="${fam === k ? 'on' : ''}">${esc(T(n))}</button>`).join('')}</div>`;
    h += `<p class="wk-note">${esc(T(FAMILY_WORDS[fam]))}</p><div class="rl-gchips">`;
    const ids = Object.keys(ALL).filter((id) => inFam(id, fam));
    const shown = ids.filter(open), hidden = ids.length - shown.length;
    for (const id of shown) h += `<button type="button" class="rl-gchip${isOn(id) ? ' on' : ''}${picked === id ? ' pick' : ''}" data-wpart="${id}">${esc(T(ALL[id]))}</button>`;
    h += `</div>`;
    if (hidden) h += `<p class="wk-more">${icon('lock')} ${esc(w(`עוד ${hidden} חלקים ייפתחו בהמשך`, `עוֹד ${hidden} חֲלָקִים יִפָּתְחוּ בְּהֶמְשֵׁךְ`))}</p>`;
    return h;
  }
  function renderSide() {
    el.querySelector('.wk-side').innerHTML = tab === 'garage' ? renderGarage() : renderParts();
    renderCard();
    showSockets(picked);
  }
  // the card of one part: what it does, what to watch for, where it fits, its numbers, and the buttons
  function renderCard() {
    const c = el.querySelector('.wk-card');
    if (!picked || tab !== 'parts') { c.hidden = true; return; }
    const p = ALL[picked], words = PART_WORDS[picked] || {}, f = fitOf(picked, ZONE_GROUND);
    const zones = (list) => list.map((z) => `${T(ZONE_GROUND[z.zone])} (${z.ground.map((g) => T(GROUND_WORDS[g])).join(', ')})`).join(w('; ', '; '));
    let h = `<button type="button" class="wk-x" data-wcard="close" aria-label="${esc(w('לסגור', 'לִסְגֹּר'))}">${icon('back')}</button><h3>${esc(T(p))}</h3>`;
    h += `<p><b>${esc(w('מה הוא עושה: ', 'מָה הוּא עוֹשֶׂה: '))}</b>${esc(T(words.what))}</p>`;
    h += `<p><b>${esc(w('שימו לב: ', 'שִׂימוּ לֵב: '))}</b>${esc(T(words.watch))}</p>`;
    if (f.helps.length) h += `<p class="wk-good"><b>${esc(w('עוזר ב', 'עוֹזֵר בְּ'))}</b>${esc(zones(f.helps))}</p>`;
    if (f.stuck.length) h += `<p class="wk-bad"><b>${esc(w('נתקע ב', 'נִתְקָע בְּ'))}</b>${esc(zones(f.stuck))}</p>`;
    if (!kids) h += `<p class="wk-nums">${esc(w(`משקל ${p.mass} גרם · מקום ${p.size || 0}`, ''))}</p>`;
    const on = isOn(picked);
    if (p.rpm && !kids) {
      h += `<div class="wk-btns"><button type="button" data-wdo="drive" class="${B().drive === picked ? 'on' : ''}">${esc(w('למנועי הנסיעה', 'לִנְסִיעָה'))}</button><button type="button" data-wdo="add">${esc(w('עוד מנוע לכלי', 'עוֹד מָנוֹעַ'))}</button>${(B().motors || []).includes(picked) ? `<button type="button" data-wdo="remove">${esc(w('להוריד מנוע', 'לְהוֹרִיד'))}</button>` : ''}</div>`;
    } else if (CHASSIS[picked] || p.set === 'wheels') {
      h += on ? `<p class="wk-on">${esc(w('זה מה שיש לרובוט עכשיו.', 'זֶה מָה שֶׁיֵּשׁ לָרוֹבּוֹט עַכְשָׁו.'))}</p>` : `<div class="wk-btns"><button type="button" data-wdo="set">${esc(w('להחליף לזה', 'לְהַחְלִיף לָזֶה'))}</button></div>`;
    } else h += `<div class="wk-btns"><button type="button" data-wdo="toggle">${esc(on ? w('להוריד מהרובוט', 'לְהוֹרִיד') : w('להוסיף לרובוט', 'לְהוֹסִיף'))}</button></div>`;
    c.innerHTML = h; c.hidden = false;
  }

  // ── the robot: its numbers, the rules it breaks, the test track
  let prevStats = null;
  function renderMain() {
    el.querySelector('.wk-name').value = cur.name;
    el.querySelector('.wk-step b').textContent = String(step);
    const chk = checkBuild(B()), st = statsOf(B());
    const pct = (k, v) => Math.round(Math.max(0.04, Math.min(1, v / STAT_MAX[k])) * 100);
    const bar = (k, v, txt) => { const was = prevStats && prevStats[k] != null ? pct(k, prevStats[k]) : pct(k, v), now = pct(k, v);
      return `<div class="wk-stat${now > was ? ' up' : now < was ? ' down' : ''}"><span>${esc(T(STAT_WORDS[k]))}</span><i><u style="width:${was}%" data-to="${now}"></u></i>${txt ? `<small>${esc(txt)}</small>` : ''}</div>`; };
    el.querySelector('.wk-stats').innerHTML = st ? bar('speed', st.speed, st.stepsPerMove > 1 ? w(`${st.stepsPerMove} צעדים למשבצת`, 'אִטִּי') : '') + bar('force', st.force) + bar('precision', st.precision) + bar('battery', st.battery, w(`${st.moveDrain} לכל צעד`, '')) + bar('lift', st.lift)
      + `<p class="wk-mass">${esc(w(`משקל: ${st.mass} גרם`, `מִשְׁקָל: ${st.mass} גְּרַם`))}</p>` : '';
    prevStats = st;
    requestAnimationFrame(() => el.querySelectorAll('.wk-stat u[data-to]').forEach((u) => { u.style.width = u.dataset.to + '%'; }));
    el.querySelector('.wk-probs').innerHTML = chk.ok ? '' : chk.problems.map((q) => `<p>${icon('lock')} ${esc(T(PROBLEM_WORDS[q.code] || PROBLEM_WORDS.any))}</p>`).join('');
    const mine = myRobots().some((r) => r.id === cur.id);
    let h = `<div class="wk-tbar"><b>${esc(w('מסלול ניסוי', 'מַסְלוּל נִסּוּי'))}</b>${TRACKS.map((t) => `<button type="button" data-wtrack="${t.id}" ${st ? '' : 'disabled'}>${esc(T(GROUND_WORDS[t.id]))}</button>`).join('')}`
      + (mine ? '' : `<button type="button" class="wk-save" data-wsave ${myRobots().length >= MAX_ROBOTS ? 'disabled' : ''}>${esc(w('לשמור במוסך', 'לִשְׁמֹר בַּמּוּסָךְ'))}</button>`) + `</div>`;
    h += `<div class="wk-run">${lastRun ? lastRun : esc(w('בחרו קרקע, והרובוט ינסה לעבור אותה.', 'בַּחֲרוּ קַרְקַע, וְהָרוֹבּוֹט יְנַסֶּה לַעֲבֹר אוֹתָהּ.'))}</div>`;
    el.querySelector('.wk-track').innerHTML = h;
  }
  function renderAll() { renderTabs(); renderSide(); renderMain(); }

  // a run on the test track: the strip of cells, where the robot got to, and why (the same words as "מה קרה?")
  function trial(id) {
    const t = TRACKS.find((q) => q.id === id), r = runProgram({ ...trackLevel(t), build: { robot: B() } }, { robot: [{ b: 'repeat', n: TRACK_LEN - 1, body: [{ b: 'fwd' }] }] });
    const at = r.state.tools.robot.x;
    const cells = ('..' + t.cell.repeat(4) + '..').split('').map((c, i) => `<span class="wk-c c-${c === '.' ? 'g' : c}${i === at ? ' bot' : ''}">${i === at ? icon('robot') : ''}</span>`).join('');
    let why = '';
    if (r.ok) why = `<p class="wk-good">${esc(w(`עבר! ${r.steps} צעדים, ונשארה סוללה ${r.state.tools.robot.battery}.`, 'עָבַר!'))}</p>`;
    else {
      const L = FAIL_LINES[r.error && r.error.code] || FAIL_LINES.any, need = (r.error && r.error.need || []).filter((p) => ALL[p]);
      why = `<p class="wk-bad">${esc(T(L[0]))}</p>` + (need.length ? `<p class="wk-help">${esc(w('מה יכול לעזור: ', 'מָה יָכוֹל לַעֲזֹר: '))}${need.map((p) => esc(T(ALL[p])) + (open(p) ? '' : ' ' + icon('lock'))).join(w(', ', ', '))}</p>` : '');
    }
    lastRun = `<div class="wk-strip" data-ground="${id}">${cells}</div>${why}`;
    const { was, now } = addTrial(id, r.ok, wkStepOf);
    sfx(r.ok ? 'good' : 'invalid');
    ES = earnState(); step = wkStepOf();
    renderAll();
    // a step card never opens over the guide's bubble: during the tutorial it waits for the tutorial's end
    if (now > was) { if (tut && tut.step) held = now; else showStep(now); }
    return r;
  }
  // a new step: a card that presents the parts it opens (one at a time, with their words)
  function showStep(n) {
    const box = el.querySelector('.wk-steps');
    const ids = Object.keys(ALL).filter((id) => ALL[id].earn === 'wk:' + n && (!kids || ['move', 'tool', 'sensor'].includes(ALL[id].fam)));
    box.innerHTML = `<div class="wk-stepcard"><h3>${esc(w(`שלב ${n} בסדנה`, `שָׁלָב ${n} בַּסַּדְנָה`))}</h3><p>${esc(T(STEP_WORDS[n]))}</p><ul>${ids.map((id) => `<li><b>${esc(T(ALL[id]))}</b> ${esc(T((PART_WORDS[id] || {}).what))}</li>`).join('')}</ul><button type="button" data-wstepok>${esc(w('יופי, ממשיכים', 'יֹפִי, מַמְשִׁיכִים'))}</button></div>`;
    box.hidden = false;
  }

  el.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    const d = b.dataset;
    if (d.wclose != null) { close(); if (onClose) onClose(); return; }
    if (d.wstepok != null) { el.querySelector('.wk-steps').hidden = true; startTut(); return; }
    if (d.wtab) { tab = d.wtab; picked = null; sfx('click'); renderAll(); return; }
    if (d.wfam) { fam = d.wfam; picked = null; sfx('click'); renderSide(); return; }
    if (d.wpart) { picked = picked === d.wpart ? null : d.wpart; sfx('click'); renderSide(); return; }
    if (d.wcard === 'close') { picked = null; renderSide(); return; }
    if (d.wdo) { if (d.wdo === 'set' || d.wdo === 'toggle') toggle(picked); else toggle(picked, d.wdo); return; }
    if (d.wtrack) { trial(d.wtrack); return; }
    if (d.wsave != null) { if (saveRobot(cur)) { sfx('good'); renderAll(); } return; }
    if (d.wpick) { const r = myRobots().find((q) => q.id === d.wpick); if (r) { cur = JSON.parse(JSON.stringify(r)); lastRun = null; delAsk = null; sfx('click'); renderAll(); rebuild(); } return; }
    if (d.wdel) { if (delAsk !== d.wdel) { delAsk = d.wdel; renderSide(); return; } deleteRobot(d.wdel); delAsk = null; if (cur.id === d.wdel) { const r = myRobots()[0]; cur = r ? JSON.parse(JSON.stringify(r)) : { id: 'r' + (++uid), name: w('רובוט 1', 'רוֹבּוֹט 1'), build: blank() }; rebuild(); } renderAll(); return; }
    if (d.wnew) {
      const n = myRobots().length + 1;
      cur = { id: 'r' + (++uid), name: w(`רובוט ${n}`, `רוֹבּוֹט ${n}`), build: JSON.parse(JSON.stringify(PRESETS[d.wnew].build)) };
      saveRobot(cur); tab = 'parts'; picked = null; lastRun = null; sfx('pop'); renderAll(); rebuild(); return;
    }
  });
  el.querySelector('.wk-name').addEventListener('change', (e) => { cur.name = e.target.value.trim().slice(0, 18) || cur.name; persist(); renderSide(); });
  const onResize = () => size();
  window.addEventListener('resize', onResize);
  renderAll(); rebuild();
  // the first visit: the first step's card presents the first parts, then the hands-on tutorial (the standing rule of 29.10)
  let tut = null, held = 0;
  const api = { close, el, trial, show: (t) => { if (tab !== t) { tab = t; picked = null; renderAll(); } },
    state: () => ({ cur, step, tab, fam, picked, robots: myRobots().length, tests: wkState().tests, passed: wkState().passed, stats: statsOf(B()), problems: checkBuild(B()).problems, tut: tut && tut.step, held, card: !el.querySelector('.wk-steps').hidden }) };
  function startTut() {
    if (!tut && guide) tut = workshopTutorial({ guide, ws: api, onDone: (r) => { el.removeAttribute('data-hold-toasts'); if (r !== 'abort' && held && !closed) { const n = held; held = 0; showStep(n); } } });
    if (tut) el.setAttribute('data-hold-toasts', '');   // new cards and badges wait for its end
  }
  if (!wkState().tests && !myRobots().length) showStep(1); else startTut();
  requestAnimationFrame(() => { size(); raf = requestAnimationFrame(frame); });

  function close() {
    if (closed) return; closed = true; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize);
    if (tut && tut.stop) tut.stop();
    renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) { }
    el.remove();
  }
  return api;
}
