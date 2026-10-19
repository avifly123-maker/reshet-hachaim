// רשת החיים – entry point.
import './core/edition.js';   // first: the torah edition's own storage namespace must be in place before anything reads it
import * as THREE from 'three';
import { createPipeline } from './env/pipeline.js';
import { createUI } from './ui/ui.js';
import { createAudio } from './audio/audio.js';
import { makeBus, makeRng } from './core/util.js';
import { BABA_DA_LOGO } from './data/logo.js';
import { KIDS } from './data/kids.js';
import { ZONES } from './data/zones.js';
import { loadPack, loadedPack, releasePack } from './core/packs.js';
import * as profiles from './core/profiles.js';
import { createResearchHub } from './research/hub.js';
import { caseById } from './research/cases/index.js';
import { initGamepad } from './ui/gamepad.js';
import { startBadgeToasts } from './ui/badge-toast.js';
import { howto } from './ui/howto.js';
import { labHowto, HOWTO_LABELS } from './data/howto-cards.js';

// Zones (biomes): the start screen draws them from the registry (data/zones.js); a zone's content and species models
// arrive in its pack – { zone: { data, plants, animals }, release() } – loaded when the zone is chosen (core/packs.js).
const zoneOf = (id) => { const m = loadedPack(id); return m ? m.zone : null; };

// Beginners (ages 6–8): a small set of species, short missions, no events, two tools.
function kidsBiome(base) {
  const K = KIDS[base.id];
  if (!K) return base;   // a zone without a beginners' set opens in full
  const keep = new Set(K.species);
  const species = base.species.filter(s => keep.has(s.id)).map(s => ({ ...s, unlock: K.start.includes(s.id) ? 'start' : (K.missions.find(m => (m.reward?.unlock || []).includes(s.id))?.id || 'start') }));
  return { ...base, mode: 'kids', species, missions: K.missions, events: [], tips: K.tips || base.tips, intro: K.intro || base.intro };
}
// Everything a child saves (mode, forests, cards, tutorial) belongs to the current player – see core/profiles.js.
let MODE = 'full';
const readMode = () => { try { MODE = localStorage.getItem(profiles.key('web-of-life-mode')) || 'full'; } catch (e) { MODE = 'full'; } return MODE; };
readMode();
const biomeFor = (id) => MODE === 'kids' ? kidsBiome(zoneOf(id).data) : zoneOf(id).data;
const saveKey = (id) => profiles.key('web-of-life-save-' + id + (MODE === 'kids' ? '-kids' : ''));

// Some computers draw 3D without a graphics driver (e.g. "Microsoft Basic Render Driver") – everything runs on the CPU.
function detectSoftwareGL() {
  try {
    const c = document.createElement('canvas'); const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return false;
    const e = gl.getExtension('WEBGL_debug_renderer_info');
    const r = e ? String(gl.getParameter(e.UNMASKED_RENDERER_WEBGL)) : '';
    const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
    return /Basic Render|SwiftShader|llvmpipe|Software/i.test(r);
  } catch (e) { return false; }
}
const SOFTWARE_GL = detectSoftwareGL();

function pickQuality() {
  if (SOFTWARE_GL) return 'min';
  try { const q = localStorage.getItem('web-of-life-quality'); if (q) return q; } catch (e) { }
  // what the automatic adjustment learned last time on this computer: start there instead of stuttering again
  // (kept for two weeks only, so one slow session – an antivirus scan, an update – does not pin the computer low for good)
  try { const a = JSON.parse(localStorage.getItem('web-of-life-autoq') || 'null'); if (a && ['min', 'low', 'medium'].includes(a.q) && Date.now() - a.t < 14 * 864e5) return a.q; } catch (e) { }
  const cores = navigator.hardwareConcurrency || 4;
  const mobile = /Mobi|Android|iPad|iPhone/i.test(navigator.userAgent);
  if (mobile || cores <= 2) return 'low';
  return 'medium';   // most current laptops and school PCs run 'medium' well; the game steps down only on real, sustained slowness
}

async function boot() {
  const canvas = document.getElementById('game');
  const root = document.getElementById('ui');
  const bus = makeBus();
  const ui = createUI(root, bus);
  initGamepad({ toast: (t, k) => ui.toast(t, k) });
  ui.setLogo(BABA_DA_LOGO);
  ui.setMode(MODE);
  ui.setProfiles(profiles.state());
  // The learning hub comes in its own pack: created the first time it is needed (or in idle time, see below) at the
  // place in #ui it always had, so it stacks exactly as before.
  const hubSlot = root.appendChild(document.createComment('learning hub'));
  let hub = null, hubP = null;
  const getHub = () => hubP || (hubP = loadPack('hub').then((m) => {
    if (!hub) { hub = m.createLearningHub(root, { onClose: () => { } }); const el = root.querySelector('#wol-learn'); if (el) root.insertBefore(el, hubSlot); }
    return hub;
  }).catch((e) => { hubP = null; throw e; }));
  // until the hub is in, window.__wolLearn forwards what the game may ask of it (a card pack won in a forest);
  // createLearningHub replaces it with the real one
  window.__wolLearn = { open: () => getHub().then((h) => h.open()), close: () => hub && hub.close(), isOpen: () => !!hub && hub.isOpen(), grantPack: (n) => getHub().then((h) => h.grantPack(n), (e) => console.error(e)) };
  const audio = createAudio();
  startBadgeToasts(root, audio);   // a badge (תג) earned anywhere drops in over whatever is open
  let quality = pickQuality();
  let pipe;
  try { pipe = createPipeline(canvas, { quality }); }
  catch (e) {
    ui.setLoading(0, 'המחשב הזה לא תומך בתלת־ממד (WebGL). נסו דפדפן Chrome או Edge מעודכן.');
    return;
  }
  // The quality tier already lowers the pixel ratio (e.g. 0.65 on 'min'); the resolution scale stacks on top of it.
  // Never let the two together drop below ~45% of a normal screen – below that the picture gets too blurry to read.
  const TIER_PR = { min: 0.65, low: 0.75, medium: 1, high: 1.5 };
  const MIN_PR = 0.45;
  const minResScale = () => { const tier = Math.min(window.devicePixelRatio || 1, TIER_PR[pipe.quality || quality] || 1); return Math.min(1, MIN_PR * Math.min(window.devicePixelRatio || 1, 1) / tier); };
  const setRes = (k) => pipe.setResScale(Math.max(k, minResScale()));
  if (SOFTWARE_GL) setRes(0.6);   // CPU drawing: fewer pixels is the only thing that really helps
  addEventListener('resize', () => pipe.resize());
  pipe.resize();
  const unlockAudio = () => { audio.start(); };
  addEventListener('pointerdown', unlockAudio, { capture: true }); addEventListener('keydown', unlockAudio, { capture: true });

  let game = null, loading = false;
  let pendingBiome = null;   // a biome waiting for the "continue the saved forest?" answer
  // idle background while on the start screen: a slowly turning preview of the island
  const preview = { env: null };

  function showStart() {
    pendingBiome = null;
    ui.hideLoading();
    root.classList.remove('kids');
    ui.showStart(Object.values(ZONES).map((z) => ({ id: z.id, name: z.name, subtitle: z.subtitle, intro: z.intro, kidsIntro: KIDS[z.id]?.intro, palette: z.palette, dev: !!z.dev })));
  }

  let gameZone = null;   // the zone whose pack the running (or last) game uses
  // the forest is gone: free the zone pack's cached models too (the pack's code stays loaded for a quick return)
  function closeGame() {
    if (game) { try { game.dispose(); } catch (e) { console.error(e); } game = null; }
    if (gameZone) { releasePack(gameZone); gameZone = null; }
    audio.setBiome(null);   // every way out of an island silences its ambience (rain and river included)
  }
  // research = a mystery of חוקרי הטבע (src/research/): the zone's full content, the case's own island, no save
  async function loadBiome(id, save = null, research = null) {
    if (loading) return; loading = true;
    ui.hideStart();
    root.classList.toggle('kids', MODE === 'kids' && !research);
    try {
      // the zone's pack: already in (chosen before, or loading since the click), or fetched now behind the loading screen
      if (!zoneOf(id) || !loadedPack('game')) { ui.setLoading(0.01, 'מכינים את היער...'); await Promise.all([loadPack(id), loadPack('game')]); }
    } catch (e) {
      console.error(e);
      ui.setLoading(0, 'משהו השתבש בטעינה. אפשר לחזור למסך הפתיחה ולנסות שוב.');
      ui.setLoadingActions([{ label: 'חזרה למסך הפתיחה', onClick: () => showStart() }]);
      loading = false; return;
    }
    const biome = research ? zoneOf(id).data : biomeFor(id), Z = zoneOf(id);
    ui.setTips(biome.tips);
    ui.setLoading(0.02, 'מכינים את היער...');
    closeGame();
    resetAutoQ(2);   // a fresh island: forget the previous one's frame timing (the loading gap would count as one huge frame)
    try {
      gameZone = id;
      const { createGame } = loadedPack('game');
      game = await createGame({ save, research, pipe, ui, audio, bus, biome, plantBuilders: Z.plants, animalBuilders: Z.animals, zoneEnv: Z.env || null, quality, onExit: () => { closeGame(); resetAutoQ(2); audio.setBiome(null); showStart(); if (research) researchHub.open(); } });
      const g = game;
      if (SOFTWARE_GL) setTimeout(() => game && game === g && ui.toast('שימו לב: המחשב הזה מצייר בלי מנהל התקן גרפי, ולכן המשחק איטי. עדכון מנהל ההתקן של כרטיס המסך יפתור את זה.', 'warn'), 2500);
      // warm up shaders before revealing
      pipe.render(0.016);
      ui.hideLoading();
      resetAutoQ(2);
    } catch (e) {
      console.error(e);
      closeGame();
      const hasSave = !research && (!!save || !!readSave(id));
      ui.setLoading(0, hasSave ? 'משהו השתבש בטעינה של היער השמור. אפשר לחזור, או להתחיל יער חדש.' : 'משהו השתבש בטעינה. אפשר לחזור למסך הפתיחה ולנסות שוב.');
      ui.setLoadingActions([
        { label: 'חזרה למסך הפתיחה', onClick: () => showStart() },
        ...(hasSave ? [{ label: 'להתחיל יער חדש (היער השמור יימחק)', onClick: () => { try { localStorage.removeItem(saveKey(id)); } catch (err) { } loadBiome(id); } }] : []),
      ]);
    }
    loading = false;
  }

  // a saved forest? offer to continue it
  const readSave = (id) => { try { const t = localStorage.getItem(saveKey(id)); return t ? JSON.parse(t) : null; } catch (e) { return null; } };
  function askSaved(id) {
    const sv = readSave(id);
    if (!sv || !Array.isArray(sv.plants) || !sv.plants.length) { pendingBiome = null; loadBiome(id); return; }
    pendingBiome = id;
    const when = new Date(sv.savedAt || Date.now());
    const d = `${when.getDate()}.${when.getMonth() + 1} בשעה ${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}`;
    const n = (x) => (Array.isArray(x) ? x.length : 0);
    ui.showDialog({ title: 'יש לכם יער שמור', text: `שמרתם כאן יער ב-${d}: ${n(sv.plants)} צמחים, ${n(sv.animals)} בעלי חיים, ${n(sv.missions)} משימות שהושלמו.\nלהמשיך ממנו או להתחיל יער חדש?`,
      buttons: [{ id: 'save-continue', label: 'להמשיך את היער השמור' }, { id: 'save-new', label: 'להתחיל יער חדש' }, { id: 'save-back', label: 'חזרה', kind: 'back' }], dismiss: 'save-back' });
  }
  // start fetching the zone's pack right at the click – it loads while the "continue the saved forest?" question is open
  bus.on('start:biome', ({ id }) => { audio.start(); loadPack('game').catch(() => { }); loadPack(id).catch(() => { /* reported by loadBiome */ }); askSaved(id); });
  bus.on('dialog:button', ({ id }) => {
    if (!pendingBiome) return;
    const b = pendingBiome;
    if (id === 'save-continue') { pendingBiome = null; loadBiome(b, readSave(b)); }
    else if (id === 'save-new') {
      // a second question first: the saved forest cannot come back
      ui.showDialog({ title: 'בטוח?', text: 'היער השמור יימחק, ואי אפשר יהיה להחזיר אותו.',
        buttons: [{ id: 'save-new-yes', label: 'כן, להתחיל יער חדש' }, { id: 'save-new-no', label: 'לא, חזרה' }], dismiss: 'save-new-no' });
    }
    else if (id === 'save-new-yes') { pendingBiome = null; try { localStorage.removeItem(saveKey(b)); } catch (e) { } loadBiome(b); }
    else if (id === 'save-new-no') askSaved(b);
    else pendingBiome = null;   // 'save-back', Escape or a click outside the box
  });
  bus.on('start:mode', ({ mode }) => { MODE = mode; try { localStorage.setItem(profiles.key('web-of-life-mode'), mode); } catch (e) { } });
  // players ("מי משחק?") – only reachable from the start screen, so no forest is running while the player changes
  const playerChanged = () => { readMode(); ui.setMode(MODE); ui.setProfiles(profiles.state()); };
  bus.on('profile:switch', ({ id }) => { if (game || loading) return; if (profiles.setCurrent(id)) playerChanged(); });
  bus.on('profile:add', ({ name, animal }) => { if (game || loading) return; const p = profiles.add(name, animal); if (p) profiles.setCurrent(p.id); playerChanged(); });
  bus.on('profile:edit', ({ id, name, animal }) => { if (name != null) profiles.rename(id, name); if (animal) profiles.setAnimal(id, animal); ui.setProfiles(profiles.state()); });
  bus.on('profile:reset', ({ id }) => { if (game || loading) return; if (profiles.reset(id)) { playerChanged(); ui.toast('השחקן אופס – מתחילים מההתחלה', 'good'); } });
  bus.on('profile:remove', ({ id }) => { if (game || loading) return; if (profiles.remove(id)) playerChanged(); });
  bus.on('ui:learn', (o) => { audio.start(); const scr = o && o.screen; getHub().then((h) => { if (scr && scr !== 'home' && h.go) h.go(scr); else h.open(); }, (e) => console.error(e)); });
  bus.on('ui:lab', () => { audio.start(); openLab('start'); });
  bus.on('ui:click', () => { try { audio.play('click'); } catch (e) { /* */ } });
  // חוקרי הטבע: the research centre and its mysteries
  const researchHub = createResearchHub(root, { onPick: (id) => { const C = caseById(id); if (!C) return; loadPack(C.zone).catch(() => { /* reported by loadBiome */ }); loadBiome(C.zone, null, C); }, onLab: () => openLab() });
  // מעבדת רובו־דע: its own pack; while it is open the frame loop draws it (there is no forest then)
  let lab = null, labP = null, labFrom = 'hub', labArt = null, labHow = null;
  // "איך משחקים" in the lab: four cards the first time (src/ui/howto.js), again from the "?" button in its top bar
  function showLabHowto(force) {
    if (labHow && labHow.open) return;
    const kids = MODE === 'kids', L = kids ? HOWTO_LABELS.kids : HOWTO_LABELS.full;
    const pic = (st) => (labArt && labArt.st && labArt.st[st]) || '';
    labHow = howto(root, labHowto(kids, pic), { key: 'lab', force, labels: L, title: L.title });
  }
  function openLab(from = 'hub') {
    labFrom = from;
    audio.start(); ui.hideStart();
    ui.setLoading && ui.setLoading(0.3, 'פותחים את המעבדה...');
    labP = labP || loadPack('lab').then((m) => {
      labArt = m.LAB_ART || null;
      lab = m.createLab({ root, pipe, audio, onExit: () => { if (labHow) { labHow.close(); labHow = null; } startDrawn = false; showStart(); if (labFrom === 'hub') researchHub.open(); },
        openGame: (name, opts) => getHub().then((h) => (h.go ? h.go(name, { ...(opts || {}), from: 'lab' }) : h.open()), (e) => console.error(e)) });
      const think = root.querySelector('.lb .lb-think');
      if (think) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'lb-btn lb-howto';
        b.innerHTML = '<b aria-hidden="true">?</b>'; b.title = 'איך משחקים?'; b.setAttribute('aria-label', 'איך משחקים?');
        b.style.cssText = 'pointer-events:auto;min-width:44px;justify-content:center;padding:9px 14px;font-size:1.1em';
        b.addEventListener('click', () => showLabHowto(true));
        think.after(b);
      }
      return lab;
    });
    labP.then((L) => { ui.hideLoading(); L.open(); setTimeout(() => { if (L.isOpen()) showLabHowto(false); }, 700); }, (e) => { labP = null; ui.hideLoading(); console.error(e); showStart(); });
  }
  bus.on('ui:research', () => { audio.start(); researchHub.open(); });
  bus.on('audio:mute', ({ muted }) => audio.setMuted(muted));
  // Compile every shader the current island can need – including species not placed yet – right now, in one go.
  // Changing quality makes all materials rebuild their shaders (shadows / tone mapping change), so without this the
  // game would stutter later, the first time each species is dragged onto the island.
  function precompileShaders() {
    if (!game) return;
    const W = game.W, scene = pipe.scene, camera = pipe.camera;
    const stage = new THREE.Group(); stage.position.set(0, -200, 0); const temp = [];
    for (const sp of W.biome.species) {
      try {
        const isP = !!W.plantBuilders[sp.id];
        const v = isP ? W.plantBuilders[sp.id]({ seed: 11, rng: makeRng(11), hostHeight: 8, hostRadius: 0.4 }) : W.animalBuilders[sp.id]({ seed: 11, rng: makeRng(11) });
        if (isP) { v.setGrowth(1); v.setBloom(1); v.setFruit(1); v.setNightGlow(1); }
        stage.add(v.object); temp.push(v);
      } catch (e) { }
    }
    scene.add(stage);
    const g = game;
    const finish = () => {
      if (game === g) { try { pipe.render(0.016); } catch (e) { } }   // also builds the shadow shaders
      scene.remove(stage);
      if (game !== g) { for (const v of temp) { try { v.dispose(); } catch (e) { } } return; }   // the forest was closed meanwhile
      // the new set keeps the freshly compiled programs alive (see game.js), the old set can go
      const old = W.warm; W.warm = temp;
      for (const v of old || []) { try { v.dispose(); } catch (e) { } }
    };
    // compile in the background where the driver allows it (no frozen frame at a quality change)
    const r = pipe.renderer;
    if (r.compileAsync && r.extensions && r.extensions.has('KHR_parallel_shader_compile')) {
      r.compileAsync(scene, camera).then(finish, finish);
    } else { try { r.compile(scene, camera); } catch (e) { } finish(); }
  }
  function applyQuality(q, remember) {
    quality = q; if (remember) { try { localStorage.setItem('web-of-life-quality', q); } catch (e) { } }
    pipe.setQuality(q); setRes(pipe.resScale); if (game && game.W.env.setQuality) game.W.env.setQuality(q);
    ui.setToggles({ quality: q === 'min' ? 'low' : q });
    if (game) precompileShaders();
    resetAutoQ(Math.max(autoQ.settle, 1));   // the recompile stall must not count as slow frames
  }
  bus.on('quality', ({ q }) => { autoQ.manual = true; pipe.shadowEvery = 1; applyQuality(q, true); setRes(SOFTWARE_GL ? 0.6 : 1); try { localStorage.removeItem('web-of-life-autoq'); } catch (e) { } });

  // automatic quality: measure the real frame rate while playing and step down only when the slowness is sustained.
  // Order of measures: 1) render slightly fewer pixels (hardly visible), 2) medium → low after ~12 s of slow play,
  // 3) low → min only when it is still very slow (< 15 fps for ~18 s) – a short stall never changes the graphics.
  // Tier steps need < 20 fps for ~12 s; between 20 and 24 fps only the pixel count is trimmed (floor 80%).
  const autoQ = { t: 0, n: 0, last: 0, manual: false, settle: 2, slow: 0, verySlow: 0, cool: 0 };
  function resetAutoQ(settle) { autoQ.last = 0; autoQ.t = 0; autoQ.n = 0; autoQ.settle = settle; autoQ.slow = 0; autoQ.slowRes = 0; autoQ.verySlow = 0; }
  try { autoQ.manual = !!localStorage.getItem('web-of-life-quality'); } catch (e) { }
  const WIN = 3;                                   // seconds per measuring window
  function autoQuality() {
    const now = performance.now(); const rdt = autoQ.last ? Math.min(1, (now - autoQ.last) / 1000) : 0; autoQ.last = now;
    if (!game || autoQ.manual || ui.isModalOpen() || document.hidden) { autoQ.t = 0; autoQ.n = 0; return; }
    autoQ.t += rdt; autoQ.n++;
    if (autoQ.t < WIN) return;
    const fps = autoQ.n / autoQ.t; autoQ.t = 0; autoQ.n = 0;
    if (autoQ.settle > 0) { autoQ.settle--; return; }   // ignore the first windows after loading / a change (shader warm-up)
    if (autoQ.cool > 0) { autoQ.cool--; return; }       // give every change ~45 s to prove itself
    // fewer pixels already below 24 fps; a lower graphics tier only below 20 fps (a real, felt stutter), very low below 15
    const resLine = SOFTWARE_GL ? 18 : 24, slowLine = SOFTWARE_GL ? 14 : 20, verySlowLine = SOFTWARE_GL ? 10 : 15;
    autoQ.slowRes = fps < resLine ? (autoQ.slowRes || 0) + 1 : 0;
    autoQ.slow = fps < slowLine ? autoQ.slow + 1 : 0;
    autoQ.verySlow = fps < verySlowLine ? autoQ.verySlow + 1 : 0;
    const floorRes = Math.max(SOFTWARE_GL ? 0.45 : 0.8, minResScale());
    let changed = false;
    if (autoQ.slowRes >= 2 && pipe.resScale > floorRes + 0.001) {         // ~6 s slow: first try fewer pixels
      setRes(Math.max(floorRes, pipe.resScale - 0.1)); changed = 'res';
    } else if (autoQ.slow >= 2 && pipe.shadowEvery < 2 && pipe.renderer.shadowMap.enabled) {   // then: shadows redrawn every 2nd frame
      pipe.shadowEvery = 2; changed = 'shadow';
    } else if (autoQ.slow >= 4 && quality === 'high') { applyQuality('medium'); changed = true; }
    else if (autoQ.slow >= 4 && quality === 'medium') { applyQuality('low'); changed = true; }
    else if (autoQ.verySlow >= 6 && quality === 'low') { applyQuality('min'); changed = true; }
    if (!changed) return;
    autoQ.slow = 0; autoQ.slowRes = 0; autoQ.verySlow = 0; autoQ.cool = changed === true ? 15 : 4; autoQ.t = 0; autoQ.n = 0;   // the quiet steps (pixels, shadow rate) prove themselves faster
    if (changed === true) { ui.toast('התאמתי את הגרפיקה כדי שהמשחק ירוץ חלק יותר', 'info'); try { localStorage.setItem('web-of-life-autoq', JSON.stringify({ q: quality, t: Date.now() })); } catch (e) { } }
  }

  showStart();
  // 1.3.1: nothing more is loaded in the background. The learning hub comes when it is opened (or when a forest grants a
  // card pack: window.__wolLearn above loads it then), each zone with its click, the lab when the child enters it.

  // F key: small frame-rate readout (handy when reporting speed problems)
  let fpsEl = null, fpsN = 0, fpsT = performance.now();
  addEventListener('keydown', (e) => {
    if ((e.key === 'f' || e.key === 'F' || e.key === 'כ') && !e.ctrlKey && !e.metaKey && !(e.target && /input|textarea/i.test(e.target.tagName))) {
      if (fpsEl) { fpsEl.remove(); fpsEl = null; return; }
      fpsEl = document.createElement('div');
      fpsEl.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99;padding:4px 8px;border-radius:8px;background:rgba(0,0,0,.7);color:#cfe;font:12px monospace;direction:ltr;pointer-events:none';
      document.body.appendChild(fpsEl);
    }
  });
  // frame loop
  const clock = new THREE.Timer();
  let t = 0, startDrawn = false;
  function frame() {
    requestAnimationFrame(frame);
    clock.update();
    const ts = window.__timeScale || 1;   // test hook (headless runs are slow)
    const dt = Math.min(clock.getDelta() * ts, 0.1 * ts);
    window.__frames = (window.__frames || 0) + 1;
    t += dt;
    if (lab && lab.isOpen()) { if (!(hub && hub.isOpen())) { lab.update(dt); pipe.render(dt); } startDrawn = false; }   // the learning hub covers the lab: no need to draw the room under it
    else if (game) { game.update(dt, t); autoQuality(); }
    else {
      // start screen: draw a dark backdrop only
      pipe.renderer.setClearColor('#0d1a14');
    }
    if (!window.__noRender && !(lab && lab.isOpen()) && (game || !startDrawn)) { pipe.render(dt); if (!game) startDrawn = true; else startDrawn = false; }
    if (fpsEl) { fpsN++; const now = performance.now(); if (now - fpsT > 1000) { const i = pipe.renderer.info.render; fpsEl.textContent = `${Math.round(fpsN * 1000 / (now - fpsT))} fps · ${quality} · x${pipe.resScale.toFixed(2)} · ${i.calls} calls · ${Math.round(i.triangles / 1000)}k tris`; fpsN = 0; fpsT = now; } }
  }
  frame();
  window.__app = { bus, ui, audio, pipe, loadBiome, researchHub, openLab: () => openLab(), openCase: (id) => { const C = caseById(id); if (C) loadBiome(C.zone, null, C); }, get game() { return game; } };
}

boot();
