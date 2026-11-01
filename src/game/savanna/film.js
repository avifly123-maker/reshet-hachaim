// 1.4.2 (Avi, 1.11): the savanna's opening film, about 26 seconds, shown the first time a player enters the savanna
// and again from the button under the toolbar. It is played in the engine on the island itself (no video file): the
// camera flies over the plain, a zebra herd gallops, wildebeest cross the river, elephants drink at the waterhole with a
// giraffe beside them, two hyenas come too close to a resting lion and he chases them off (gently: nobody is caught),
// and the camera rises over the island at the end of the day. Music: an original piece in an African style
// (tools/music/savanna_film.py, MUSIC.savanna), played once and timed with the shots.
//
// The actors are the Blender models of the zone pack (W.animalBuilders), placed on their own group for the film and
// removed after it; the player's island, its saved state and its simulation are not touched (the clock stands still,
// the light is moved from morning to evening and given back). It runs as an immersive view (immersive.js), so Escape
// and the "דלג" button end it, and everything else waits (W.viewMode).
//   createSavannaFilm({ W, env, imv, camera, audio }) → { play({ force, onEnd }) → bool, stop(), dispose(), active }
import * as THREE from 'three';
import { visScale } from '../../world/animals.js';
import { makeRng } from '../../core/util.js';
import { introSeen, markIntro } from '../../core/journey.js';
import { readMusicPref } from '../../audio/music.js';

export const FILM_KEY = 'g:svfilm';
const BAR = 60 / 112 * 4;   // the music's bar (2.143 s): the cuts fall on its bars
export const SHOTS = [      // [start, end) in seconds
  { id: 'above', t0: 0, t1: 2 * BAR },             // the island from above, the title
  { id: 'zebras', t0: 2 * BAR, t1: 4 * BAR },      // beside the galloping zebras
  { id: 'river', t0: 4 * BAR, t1: 6 * BAR },       // the wildebeest cross the river
  { id: 'hole', t0: 6 * BAR, t1: 8 * BAR },        // elephants and giraffes at the waterhole
  { id: 'chase', t0: 8 * BAR, t1: 10 * BAR },      // the hyenas and the lion
  { id: 'rise', t0: 10 * BAR, t1: 12 * BAR + 0.6 },   // up over the island, the evening light
];
export const FILM_LEN = SHOTS[SHOTS.length - 1].t1;

const CSS_ID = 'svf-css';
const CSS = `
#ui.wol.imv-film > :not(.svf) { opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; }
#ui.wol .svf { position: absolute; inset: 0; z-index: var(--z-hover); pointer-events: none; }
#ui.wol .svf .svf-bar { position: absolute; left: 0; right: 0; height: 9vh; background: #000; transition: transform .6s ease; }
#ui.wol .svf .svf-bar.top { top: 0; transform: translateY(-100%); } #ui.wol .svf .svf-bar.bot { bottom: 0; transform: translateY(100%); }
#ui.wol .svf.on .svf-bar { transform: none; }
#ui.wol .svf .svf-dip { position: absolute; inset: 0; background: #000; opacity: 0; }
#ui.wol .svf .svf-title { position: absolute; left: 0; right: 0; top: 38%; text-align: center; direction: rtl; color: #fff6e2; opacity: 0;
  font-family: var(--serif); font-size: clamp(30px, 6.4vh, 64px); letter-spacing: .02em; text-shadow: 0 2px 14px rgba(40, 20, 0, .65), 0 0 2px rgba(0, 0, 0, .5); }
#ui.wol .svf .svf-title small { display: block; margin-top: .25em; font-family: var(--sans); font-weight: 700; font-size: .36em; letter-spacing: .04em; color: #f5dfae; }
#ui.wol .svf .svf-skip { position: absolute; top: calc(9vh + 12px); left: 14px; pointer-events: auto; min-height: 44px; padding: 6px 18px; border-radius: 999px;
  background: rgba(20, 14, 6, .55); color: #f6ead2; font-weight: 800; box-shadow: 0 0 0 1.5px rgba(246, 234, 210, .35); }
#ui.wol .svf .svf-skip:hover { background: rgba(40, 28, 10, .75); }
#ui.wol .tb[data-a="svfilm"] .ic { color: #f2c46e; }
`;
const FILM_ICON = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M10 9.2v5.6l4.6-2.8z" fill="currentColor"/></svg>';

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;
const wrapA = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

export function createSavannaFilm({ W, env, imv, camera, audio }) {
  if (!document.getElementById(CSS_ID)) { const st = document.createElement('style'); st.id = CSS_ID; st.textContent = CSS; document.head.appendChild(st); }
  const root = document.getElementById('ui');
  let run = null;   // the film that is playing

  // ─────────────────────────────────── the places (from the island itself, so they follow its layout)
  function places() {
    const E = env.edgeRadius || 58;
    const H = (env.holes && env.holes[0]) || { x: 0.26 * E, z: -0.43 * E, r: 3 };
    const path = (env.water && env.water.path) || [];
    let mid = { x: -0.1 * E, z: 0.05 * E }, along = { x: 1, z: 0 };
    if (path.length > 2) {
      // the river point nearest the middle of the island, and the river's direction there
      let bi = 1, bd = 1e9;
      for (let i = 1; i < path.length - 1; i++) { const d = Math.hypot(path[i].x, path[i].z); if (d < bd) { bd = d; bi = i; } }
      mid = path[bi]; const a = path[bi - 1], b = path[bi + 1], L = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      along = { x: (b.x - a.x) / L, z: (b.z - a.z) / L };
    }
    const n = { x: -along.z, z: along.x };   // across the river
    const dry = (x, z, r = 0) => Math.hypot(x, z) < E - 4 && !env.isWater(x, z) && !(r && [0, 1.6, 3.1, 4.7].some((a) => env.isWater(x + Math.cos(a) * r, z + Math.sin(a) * r)));
    // the zebras' run: a straight dry line of 34 m, as far from the river and the waterhole as possible
    let run = null, best = -1;
    for (let k = 0; k < 24; k++) {
      const ang = k / 24 * Math.PI * 2, rr = 0.42 * E, cx = Math.cos(ang) * rr, cz = Math.sin(ang) * rr;
      const dx = -Math.sin(ang), dz = Math.cos(ang);   // along the circle
      let ok = true;
      for (let s = -17; s <= 17; s += 2) if (!dry(cx + dx * s, cz + dz * s, 3)) { ok = false; break; }
      if (!ok) continue;
      const sc = Math.hypot(cx - H.x, cz - H.z) + Math.hypot(cx - mid.x, cz - mid.z) * 0.5;
      if (sc > best) { best = sc; run = { x: cx, z: cz, dx, dz }; }
    }
    run = run || { x: -0.4 * E, z: -0.1 * E, dx: 0, dz: 1 };
    // the lion's resting place: 14 m from the waterhole, on dry land, away from the river
    let L = null;
    for (let k = 0; k < 16 && !L; k++) {
      const a = Math.atan2(H.z - mid.z, H.x - mid.x) + (k % 2 ? 1 : -1) * Math.floor((k + 1) / 2) * 0.35;
      const x = H.x + Math.cos(a) * 14, z = H.z + Math.sin(a) * 14;
      if (dry(x, z, 6)) L = { x, z, a };
    }
    L = L || { x: H.x * 0.6, z: H.z * 0.6, a: 0 };
    return { E, H, mid, along, n, run, L };
  }

  // ─────────────────────────────────── one film
  function play({ force = false, onEnd = null } = {}) {
    if (run || W.viewMode || !W.animalBuilders) return false;
    if (!force && introSeen(FILM_KEY)) return false;
    let P;
    try { P = places(); } catch (e) { console.warn('[svfilm]', e); return false; }
    const stage = new THREE.Group(); stage.name = 'savanna-film';
    (env.root || camera.parent).add(stage);
    const actors = [], plants = [];
    const rng = makeRng(31);
    const groundY = (x, z) => env.heightAt(x, z);

    function actor(id, x, z, { seed = 1, scale = 1, head = 0, keys = null, act = 'idle' } = {}) {
      const make = W.animalBuilders[id]; if (!make) return null;
      let v = null;
      try { v = make({ seed, rng: makeRng(seed) }); } catch (e) { return null; }
      if (!v || !v.object) return null;
      const o = v.object; o.rotation.order = 'YXZ';
      o.scale.setScalar(visScale(v.length || 1) * scale);
      stage.add(o);
      const a = { id, v, o, x, z, h: head, act, spd: 0, keys };
      actors.push(a); put(a); return a;
    }
    function put(a) { a.o.position.set(a.x, groundY(a.x, a.z), a.z); a.o.rotation.y = a.h; }
    function plant(id, x, z, seed = 1) {
      const make = W.plantBuilders && W.plantBuilders[id]; if (!make) return;
      try {
        const v = make({ seed, rng: makeRng(seed) });
        v.setGrowth(1); v.setHealth(1); v.setBloom(0); v.setFruit(0);
        if (v.setSeason) v.setSeason('wet', 0.4);
        v.object.position.set(x, groundY(x, z) - 0.05, z); v.object.rotation.y = rng() * 6.28;
        stage.add(v.object); plants.push(v);
      } catch (e) { /* a plant that cannot be made is left out */ }
    }
    // keys: [{ t, x, z, act }]: the actor moves in a straight line between keys, facing where it goes
    function step(a, t, dt) {
      if (a.keys) {
        const K = a.keys; let i = 0;
        while (i < K.length - 1 && t >= K[i + 1].t) i++;
        const k0 = K[i], k1 = K[Math.min(i + 1, K.length - 1)];
        const f = k1 === k0 || t <= k0.t ? (t >= k0.t && k1 === k0 ? 1 : 0) : clamp01((t - k0.t) / (k1.t - k0.t));
        const nx = lerp(k0.x, k1.x, f), nz = lerp(k0.z, k1.z, f);
        const dx = nx - a.x, dz = nz - a.z, d = Math.hypot(dx, dz);
        a.spd = dt > 0 ? lerp(a.spd, d / dt, Math.min(1, dt * 6)) : 0;
        if (d > 1e-3) a.h += wrapA(Math.atan2(dx, dz) - a.h) * Math.min(1, dt * 7);
        else if (k0.face != null) a.h += wrapA(k0.face - a.h) * Math.min(1, dt * 3);
        a.x = nx; a.z = nz; a.act = f > 0 && f < 1 && d > 1e-3 ? (k0.act || 'walk') : (k0.rest || (f >= 1 ? (k1.rest || 'idle') : 'idle'));
      }
      put(a);
      try { a.v.update(dt, { action: a.act, speed: a.act === 'walk' || a.act === 'run' ? a.spd : 0 }); } catch (e) { /* a model that fails stays still */ }
    }

    // ── the cast
    const { E, H, mid, along, n, run: R, L } = P;
    const T = (id) => SHOTS.find((s) => s.id === id);
    // the plain: a few trees beside the zebras' run, and impalas grazing
    plant('umbrella', R.x + R.dx * 6 - R.dz * 9, R.z + R.dz * 6 + R.dx * 9, 3);
    plant('umbrella', R.x - R.dx * 12 + R.dz * 11, R.z - R.dz * 12 - R.dx * 11, 4);
    plant('baobab', R.x - R.dz * 16, R.z + R.dx * 16, 5);
    const zs = T('zebras');
    for (let i = 0; i < 11; i++) {
      const lat = (rng() - 0.5) * 7, lag = (rng() - 0.5) * 9, sp = 0.92 + rng() * 0.16;
      const ax = R.x - R.dx * 22 + R.dz * lat + R.dx * lag, az = R.z - R.dz * 22 - R.dx * lat + R.dz * lag;
      actor('zebra', ax, az, { seed: 40 + i, keys: [{ t: 0, x: ax, z: az, act: 'run' }, { t: zs.t0 - 0.6, x: ax, z: az, act: 'run' },
        { t: zs.t1 + 1.5, x: ax + R.dx * 42 * sp, z: az + R.dz * 42 * sp, act: 'run' }, { t: zs.t1 + 3, x: ax + R.dx * 46 * sp, z: az + R.dz * 46 * sp, rest: 'eat' }] });
    }
    for (let i = 0; i < 4; i++) actor('impala', R.x + R.dz * (8 + rng() * 5) + R.dx * (rng() * 10 - 2), R.z - R.dx * (8 + rng() * 5) + R.dz * (rng() * 10 - 2), { seed: 60 + i, head: rng() * 6.28, act: 'eat' });
    // the river: wildebeest walk across it in a line; buffaloes graze on the far bank
    const rv = T('river');
    for (let i = 0; i < 13; i++) {
      const side = (rng() - 0.5) * 3, back = i * 2.4;
      const sx = mid.x - n.x * (11 + back) + along.x * side, sz = mid.z - n.z * (11 + back) + along.z * side;
      const ex = mid.x + n.x * (13 - back * 0.25) + along.x * side * 1.6, ez = mid.z + n.z * (13 - back * 0.25) + along.z * side * 1.6;
      actor('wildebeest', sx, sz, { seed: 80 + i, keys: [{ t: 0, x: sx, z: sz, rest: 'idle' }, { t: rv.t0 - 1.5, x: sx, z: sz, act: 'walk' },
        { t: rv.t1 + 2.5, x: ex, z: ez, act: 'walk' }, { t: rv.t1 + 3, x: ex, z: ez, rest: 'eat' }] });
    }
    for (let i = 0; i < 4; i++) actor('buffalo', mid.x + n.x * (17 + rng() * 6) + along.x * (8 + i * 3), mid.z + n.z * (17 + rng() * 6) + along.z * (8 + i * 3), { seed: 100 + i, head: rng() * 6.28, act: 'eat' });
    // the waterhole: elephants drink, giraffes eat from an acacia
    const toH = (k, r) => { const a = Math.atan2(mid.z - H.z, mid.x - H.x) + k; return { x: H.x + Math.cos(a) * r, z: H.z + Math.sin(a) * r, face: Math.atan2(H.x - (H.x + Math.cos(a) * r), H.z - (H.z + Math.sin(a) * r)) }; };
    const hr = (H.r || 3) + 1.4;
    const e1 = toH(0.3, hr), e2 = toH(-0.5, hr + 0.6), e3 = toH(-0.05, hr + 0.2), e4 = toH(1.7, hr + 10);
    actor('elephant', e1.x, e1.z, { seed: 121, head: e1.face, act: 'eat' });
    actor('elephant', e3.x, e3.z, { seed: 123, scale: 0.55, head: e3.face, act: 'idle' });
    actor('elephant', e4.x, e4.z, { seed: 122, keys: [{ t: 0, x: e4.x, z: e4.z, rest: 'idle' }, { t: SHOTS[3].t0 - 1, x: e4.x, z: e4.z, act: 'walk' }, { t: SHOTS[3].t1 + 1, x: e2.x, z: e2.z, act: 'walk' }, { t: SHOTS[3].t1 + 2, x: e2.x, z: e2.z, rest: 'eat', face: e2.face }] });
    const g = toH(0.75, hr + 7.5);   // across the water from the camera's arc
    plant('umbrella', g.x + Math.cos(g.face) * -2, g.z + Math.sin(g.face) * -2, 7);
    actor('giraffe', g.x, g.z, { seed: 131, head: g.face + 2.6, act: 'eat' });
    const g2 = toH(0.45, hr + 10);
    actor('giraffe', g2.x, g2.z, { seed: 132, scale: 0.8, head: g2.face + 2.2, act: 'idle' });
    // the chase: a lion rests in the shade; two hyenas come close; he gets up and runs at them; they run off; he stops
    const ch = T('chase');
    const ux = Math.cos(L.a + 1.2), uz = Math.sin(L.a + 1.2);   // where the hyenas come from
    plant('baobab', L.x - ux * 5 + uz * 2, L.z - uz * 5 - ux * 2, 9);
    actor('lion', L.x, L.z, { seed: 141, keys: [{ t: 0, x: L.x, z: L.z, rest: 'sleep', face: Math.atan2(ux, uz) }, { t: ch.t0 + 1.6, x: L.x, z: L.z, rest: 'idle', face: Math.atan2(ux, uz) },
      { t: ch.t0 + 2.0, x: L.x, z: L.z, act: 'run' }, { t: ch.t0 + 3.6, x: L.x + ux * 9, z: L.z + uz * 9, act: 'run' }, { t: ch.t1 + 0.4, x: L.x + ux * 10.5, z: L.z + uz * 10.5, act: 'walk' },
      { t: ch.t1 + 1, x: L.x + ux * 10.5, z: L.z + uz * 10.5, rest: 'idle' }] });
    for (let i = 0; i < 2; i++) {
      const s = i ? 1.6 : -1.6, sx = L.x + ux * 17 + uz * s, sz = L.z + uz * 17 - ux * s, nx = L.x + ux * 6.5 + uz * s * 0.8, nz = L.z + uz * 6.5 - ux * s * 0.8;
      const fx = L.x + ux * 30 + uz * s * 4, fz = L.z + uz * 30 - ux * s * 4;
      actor('hyena', sx, sz, { seed: 151 + i, keys: [{ t: 0, x: sx, z: sz, rest: 'idle' }, { t: ch.t0 - 0.4 + i * 0.3, x: sx, z: sz, act: 'walk' },
        { t: ch.t0 + 2.1, x: nx, z: nz, rest: 'idle' }, { t: ch.t0 + 2.3 + i * 0.15, x: nx, z: nz, act: 'run' }, { t: ch.t1 + 0.6, x: fx, z: fz, act: 'run' },
        { t: ch.t1 + 1, x: fx, z: fz, rest: 'idle' }] });
    }

    // ── the overlay
    const el = document.createElement('div');
    el.className = 'svf'; el.lang = 'he';
    el.innerHTML = '<div class="svf-dip"></div><div class="svf-bar top"></div><div class="svf-bar bot"></div>' +
      '<div class="svf-title" data-t="a">הַסַּוָּאנָה<small>עֲדָרִים, גְּשָׁמִים וְעוֹנַת יֹבֶשׁ</small></div>' +
      '<div class="svf-title" data-t="b">רֶשֶׁת הַחַיִּים<small>בּוֹאוּ לִשְׁמֹר עַל הַסַּוָּאנָה</small></div>' +
      '<button type="button" class="svf-skip">דלג</button>';
    root.appendChild(el);
    const dip = el.querySelector('.svf-dip'), tA = el.querySelector('[data-t="a"]'), tB = el.querySelector('[data-t="b"]');
    requestAnimationFrame(() => el.classList.add('on'));

    // ── the music (once, through the music bus: the sound switch silences it too)
    let src = null, gain = null, startAt = null;
    const ac = audio && audio.ready ? audio.context : null;
    if (ac && readMusicPref() && audio.musicOut && ac.state === 'running') {
      import('../../data/music.js').then((m) => fetch(m.MUSIC.savanna.src)).then((r) => r.arrayBuffer())
        .then((ab) => new Promise((res, rej) => { const p = ac.decodeAudioData(ab, res, rej); if (p && p.catch) p.catch(rej); }))
        .then((buf) => {
          if (!run || run.done) return;
          src = ac.createBufferSource(); gain = ac.createGain(); src.buffer = buf;
          src.connect(gain); gain.connect(audio.musicOut());
          gain.gain.value = 1; src.start(ac.currentTime, Math.max(0, run.t));   // starts where the film is (normally at 0)
        }).catch((e) => console.warn('[svfilm] music', e));
    }

    // ── the light, the clock
    const saved = { dayFrac: W.dayFrac, speed: W.speed, rain: W.rain, rainTarget: W.rainTarget, fov: camera.fov };
    W.speed = 0; W.rain = 0; W.rainTarget = 0;

    // ── the camera, shot by shot
    const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const cen = (id) => { let x = 0, z = 0, k = 0; for (const a of actors) if (a.id === id && a.keys) { x += a.x; z += a.z; k++; } return k ? { x: x / k, z: z / k } : { x: 0, z: 0 }; };
    const gy = (p) => groundY(p.x, p.z);
    const pos = new THREE.Vector3(), look = new THREE.Vector3();
    function shot(t) {
      const s = SHOTS.find((q) => t >= q.t0 && t < q.t1) || SHOTS[SHOTS.length - 1], k = clamp01((t - s.t0) / (s.t1 - s.t0)), e = ease(k);
      let fov = 48;
      if (s.id === 'above') {
        const a = Math.atan2(R.z, R.x) + 0.9 - e * 0.5;
        pos.set(Math.cos(a) * lerp(1.15, 0.78, e) * E, lerp(0.95, 0.42, e) * E, Math.sin(a) * lerp(1.15, 0.78, e) * E);
        look.set(lerp(0, R.x * 0.6, e), 0, lerp(0, R.z * 0.6, e));
      } else if (s.id === 'zebras') {
        const c = cen('zebra');
        pos.set(c.x - R.dz * 10 - R.dx * lerp(4, -1, e), gy(c) + 2.1, c.z + R.dx * 10 - R.dz * lerp(4, -1, e));
        look.set(c.x + R.dx * 2.5, gy(c) + 0.9, c.z + R.dz * 2.5); fov = 42;
      } else if (s.id === 'river') {
        const c = { x: mid.x + along.x * 9 - n.x * 2, z: mid.z + along.z * 9 - n.z * 2 };
        pos.set(c.x + along.x * lerp(2, -1, e), Math.max(gy(c), env.waterLevel || 0) + lerp(1.6, 2.4, e), c.z + along.z * lerp(2, -1, e));
        look.set(mid.x + n.x * lerp(-3, 4, e), (env.waterLevel || gy(mid)) + 0.8, mid.z + n.z * lerp(-3, 4, e)); fov = 44;
      } else if (s.id === 'hole') {
        const a0 = Math.atan2(mid.z - H.z, mid.x - H.x) - 1.9 + e * 0.9, r = lerp(15, 12, e);
        pos.set(H.x + Math.cos(a0) * r, gy(H) + lerp(3.2, 4.4, e), H.z + Math.sin(a0) * r);
        look.set(H.x + Math.cos(a0 + 2.2) * 2, gy(H) + 1.6, H.z + Math.sin(a0 + 2.2) * 2); fov = 46;
      } else if (s.id === 'chase') {
        const lion = actors.find((a) => a.id === 'lion') || { x: L.x, z: L.z };
        const fx = lion.x + ux * 3, fz = lion.z + uz * 3, side = -1;
        pos.set(fx + uz * 11 * side - ux * 3, groundY(fx, fz) + 2.4, fz - ux * 11 * side - uz * 3);
        look.set(fx, groundY(fx, fz) + 0.8, fz); fov = 44;
      } else {   // rise
        const lion = { x: L.x + ux * 9, z: L.z + uz * 9 };
        const a = Math.atan2(lion.z, lion.x) + 0.4 + e * 0.6, r = lerp(14, 1.0 * E, e);
        pos.set(lion.x * (1 - e) + Math.cos(a) * r, groundY(lion.x, lion.z) + lerp(3, 0.62 * E, e * e * 0.6 + e * 0.4), lion.z * (1 - e) + Math.sin(a) * r);
        look.set(lion.x * (1 - e), lerp(groundY(lion.x, lion.z) + 1, 0, e), lion.z * (1 - e));
      }
      // never under the ground
      const gh = groundY(pos.x, pos.z); if (pos.y < gh + 1.1) pos.y = gh + 1.1;
      camera.position.copy(pos); camera.lookAt(look);
      if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
      // a short dip to black at each cut, the titles
      let d = 0;
      for (const q of SHOTS) { const dt = Math.abs(t - q.t0); if (q.t0 > 0 && dt < 0.22) d = Math.max(d, 1 - dt / 0.22); }
      d = Math.max(d, 1 - clamp01(t / 0.8), clamp01((t - (FILM_LEN - 0.9)) / 0.9));
      dip.style.opacity = d.toFixed(3);
      tA.style.opacity = (clamp01((t - 0.7) / 0.6) * clamp01((SHOTS[0].t1 - 0.3 - t) / 0.6)).toFixed(3);
      tB.style.opacity = (clamp01((t - (SHOTS[5].t0 + 1.4)) / 0.7) * clamp01((FILM_LEN - 0.5 - t) / 0.6)).toFixed(3);
      W.dayFrac = lerp(0.34, 0.71, ease(t / FILM_LEN));
    }

    run = { t: 0, done: false, stage, actors, fixed: 0, budget: 0 };
    const finish = (how) => {
      if (!run || run.done) return; run.done = true;
      if (how !== 'exit') { try { imv.exit(); } catch (e) { } return; }   // imv.exit calls back with 'exit'
      try { if (src && gain && ac) { const t0 = ac.currentTime; gain.gain.cancelScheduledValues(t0); gain.gain.setValueAtTime(gain.gain.value, t0); gain.gain.linearRampToValueAtTime(0, t0 + 1.2); src.stop(t0 + 1.3); } } catch (e) { }
      for (const a of actors) { try { a.v.dispose ? a.v.dispose() : a.o.removeFromParent(); } catch (e) { } }
      for (const p of plants) { try { p.dispose ? p.dispose() : p.object.removeFromParent(); } catch (e) { } }
      stage.removeFromParent();
      W.dayFrac = saved.dayFrac; W.speed = saved.speed || 1; W.rain = saved.rain; W.rainTarget = saved.rainTarget;
      el.classList.remove('on'); setTimeout(() => el.remove(), 650);
      markIntro(FILM_KEY);
      run = null;
      if (onEnd) setTimeout(() => onEnd(), 300);
    };
    el.querySelector('.svf-skip').addEventListener('click', (e) => { e.stopPropagation(); finish('skip'); });
    imv.enter('film', {
      driver: (dt) => {
        if (!run || run.done) return;
        if (run.fixed) { if (run.budget <= 0) { shot(Math.min(run.t, FILM_LEN)); return; } run.budget--; dt = run.fixed; }   // tools/record-savanna-film.py: one step a frame
        run.t += dt;
        for (const a of actors) step(a, run.t, dt);
        for (const p of plants) { try { p.update(dt, run.t, 0.2); } catch (e) { } }
        shot(Math.min(run.t, FILM_LEN));
        if (run.t >= FILM_LEN) finish('end');
      },
      onExit: () => { if (run) { run.done = false; finish('exit'); } },
    });
    try {
      window.__svFilm = { get t() { return run ? run.t : -1; }, get actors() { return run ? run.actors.length : 0; }, places: P, length: FILM_LEN,
        fix(step) { if (run) { run.fixed = step; run.budget = 0; } }, step(k = 1) { if (run) run.budget += k; }, get budget() { return run ? run.budget : -1; } };
    } catch (e) { }
    return true;
  }

  // the button under the toolbar: watch it again
  let btn = null;
  if (imv && imv.dock) {
    btn = document.createElement('button');
    btn.className = 'tb tg'; btn.dataset.a = 'svfilm'; btn.dataset.tip = 'הסרט של הסוואנה'; btn.setAttribute('aria-label', 'הסרט של הסוואנה');
    btn.innerHTML = `${FILM_ICON}<span class="tb-lab">הסרט של הסוואנה</span>`;
    btn.addEventListener('click', (e) => { e.stopPropagation(); play({ force: true }); });
    imv.dock.appendChild(btn);
    if (imv.syncDock) imv.syncDock();
  }

  return {
    play,
    stop: () => { if (run) try { imv.exit(); } catch (e) { } },
    get active() { return !!run; },
    dispose() { if (run) try { imv.exit(); } catch (e) { } if (btn) btn.remove(); },
  };
}
