// Procedural Web Audio for "רשת החיים" — no audio files, everything synthesized.
//
//   const audio = createAudio();            // or createAudio({ context }) to inject (e.g. OfflineAudioContext in tests)
//   audio.start();                          // from a user gesture; safe to call repeatedly
//   audio.setBiome('amazon'|'grove'|null);  // crossfades ambience beds
//   audio.update(ctx);                      // every frame (internally throttled)
//   audio.play(name, { pan, volume });      // UI / game one-shots
//   audio.setMuted(b); audio.muted; audio.setVolume(v)
//   audio.musicOut()                        // the bus background music plays into (audio/music.js); null until start()
//   audio.voiceOut(), audio.duckMusic(on)   // the bus רובו־דע speaks into (audio/voice.js), and the music stepping back meanwhile
//
// Design notes
// - Graph: [sfxBus] ─┐
//          [beds → ambBus → duck] ─┼→ master → compressor → destination
// - Three shared looping noise sources (white / pink / brown) feed every continuous layer through filters,
//   so the steady CPU cost is a handful of filters + LFO oscillators.
// - Discrete sounds (birds, frogs, drips, crackle, one-shots) are short-lived nodes scheduled on the audio clock;
//   every voice disconnects itself via `onended` of its last-stopping source. Voice counts are capped.
// - Ambient calls come from Poisson "emitters" polled in update(); at most one call per emitter per update,
//   and long gaps (hidden tab) never cause a burst.
// - Everything is a silent no-op when Web Audio is unavailable.

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const rand = (a, b) => a + (b - a) * Math.random();
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const fin = (x, d = 0) => (typeof x === 'number' && isFinite(x) ? x : d);

const SFX_NAMES = ['click', 'hover', 'pickup', 'place', 'invalid', 'grow', 'select', 'discover', 'mission', 'event',
  'remove', 'points', 'thunder', 'night', 'dawn', 'quizRight', 'quizWrong', 'pop'];
// minimum seconds between two plays of the same one-shot (prevents stacking when spammed)
const MIN_GAP = { hover: 0.05, points: 0.06, click: 0.03, pop: 0.05, grow: 0.12, place: 0.05, thunder: 1.5, select: 0.04 };

export function createAudio(options = {}) {
  let ac = null, offline = false, ready = false;
  let master, sfxBus, ambBus, duck, globalGain, musicBus, voiceBus;
  let bufW, bufP, bufB, srcW, srcP, srcB;
  const curves = {};
  let muted = !!options.muted;
  let volume = clamp01(fin(options.volume, 0.8));
  let biome = null;
  let beds = {};            // id → live bed
  let G = null;             // global layers (wind, rain, fire)
  const active = { amb: 0, sfx: 0 };
  const LIMIT = { amb: 11, sfx: 14 };
  const lastPlay = {};
  let lastLevels = -1;
  const lastTarget = new WeakMap();
  let suspendTimer = null;
  let globalEmitters = [];
  // smoothed world state
  const S = { dayFrac: 0.5, season: null, rain: 0, wind: 0, vitality: 0.6, night: 0, cameraHeight: 40, fire: 0, speed: 1,
    day: 1, dawn: 0, dusk: 0, heat: 0, high: 0, rich: 0.75 };

  // ---------------------------------------------------------------- setup
  function start() {
    try {
      if (!ac) {
        if (options.context) ac = options.context;
        else {
          const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
          if (!AC) return false;
          try { ac = new AC({ latencyHint: 'balanced' }); } catch (e) { ac = new AC(); }
        }
        offline = typeof OfflineAudioContext !== 'undefined' && ac instanceof OfflineAudioContext;
        build();
        ready = true;
        if (!offline && typeof document !== 'undefined' && document.addEventListener) {
          document.addEventListener('visibilitychange', () => {
            try {
              if (document.hidden) { if (ac.state === 'running') ac.suspend().catch(() => {}); }
              else if (!muted && ac.state !== 'running') ac.resume().catch(() => {});
            } catch (e) { /* ignore */ }
          });
        }
        if (biome) openBed(biome);
      }
      if (!offline && ac.state !== 'running' && !muted && ac.resume) {
        const p = ac.resume(); if (p && p.catch) p.catch(() => {});
      }
      return true;
    } catch (e) {
      console.warn('[audio] unavailable:', e);
      ready = false;
      return false;
    }
  }

  function build() {
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 4;
    comp.attack.value = 0.004; comp.release.value = 0.25;
    master = ac.createGain(); master.gain.value = muted ? 0 : volume;
    master.connect(comp); comp.connect(ac.destination);
    sfxBus = ac.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(master);
    musicBus = ac.createGain(); musicBus.gain.value = 0.9; musicBus.connect(master);   // background music (audio/music.js)
    voiceBus = ac.createGain(); voiceBus.gain.value = 1.15; voiceBus.connect(master);   // the voice of רובו־דע (audio/voice.js)
    duck = ac.createGain(); duck.gain.value = 1; duck.connect(master);
    ambBus = ac.createGain(); ambBus.gain.value = 1; ambBus.connect(duck);
    globalGain = ac.createGain(); globalGain.gain.value = 0; globalGain.connect(ambBus);

    bufW = makeNoise('white', 3.1);
    bufP = makeNoise('pink', 4.3);
    bufB = makeNoise('brown', 3.7);
    srcW = loopSource(bufW); srcP = loopSource(bufP); srcB = loopSource(bufB);

    // waveshaper curves for shaping sine LFOs
    curves.gate = makeCurve((x) => Math.pow(clamp01((x - 0.25) / 0.75), 1.5));     // chirp gate with gaps
    curves.buzz = makeCurve((x) => 0.5 + 0.5 * Math.tanh(3 * x));                  // soft square 0..1
    G = buildGlobal();
    globalEmitters = [
      emitter(() => S.rain * 2.2, dripCall),
      emitter(() => S.fire * 5, crackleCall, 0.04),
    ];
  }

  function makeNoise(kind, seconds) {
    const sr = ac.sampleRate, len = Math.floor(sr * seconds), N = Math.floor(sr * 0.05);
    const tmp = new Float32Array(len + N);
    let b0 = 0, b1 = 0, b2 = 0, last = 0;
    for (let i = 0; i < len + N; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'white') tmp[i] = w;
      else if (kind === 'pink') {
        b0 = 0.99765 * b0 + w * 0.0990460; b1 = 0.96300 * b1 + w * 0.2965164; b2 = 0.57000 * b2 + w * 1.0526913;
        tmp[i] = b0 + b1 + b2 + w * 0.1848;
      } else { last = (last + 0.02 * w) / 1.02; tmp[i] = last; }
    }
    // remove DC
    let mean = 0; for (let i = 0; i < tmp.length; i++) mean += tmp[i]; mean /= tmp.length;
    const buf = ac.createBuffer(1, len, sr), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = tmp[i] - mean;
    // seamless loop: crossfade the tail (len..len+N) into the head
    for (let i = 0; i < N; i++) { const a = i / N; d[i] = d[i] * a + (tmp[len + i] - mean) * (1 - a); }
    let ss = 0; for (let i = 0; i < len; i++) ss += d[i] * d[i];
    const k = 0.3 / Math.sqrt(ss / len);
    for (let i = 0; i < len; i++) { const v = d[i] * k; d[i] = v > 1 ? 1 : v < -1 ? -1 : v; }
    return buf;
  }
  function loopSource(buf) {
    const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0); return s;
  }
  function makeCurve(fn) {
    const n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) c[i] = fn((i / (n - 1)) * 2 - 1);
    return c;
  }

  // -------------------------------------------------- persistent-node helpers (beds / global layers)
  function P(owner) {   // node factory that remembers what it created so it can be torn down
    const nodes = [], oscs = [];
    const f = {
      nodes, oscs,
      gain(v = 0, dest) { const g = ac.createGain(); g.gain.value = v; nodes.push(g); if (dest) g.connect(dest); return g; },
      filter(type, freq, Q = 1, dest) {
        const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = freq; b.Q.value = Q; nodes.push(b);
        if (dest) b.connect(dest); return b;
      },
      pan(p, dest) {
        if (!ac.createStereoPanner) return dest;
        const n = ac.createStereoPanner(); n.pan.value = p; nodes.push(n); n.connect(dest); return n;
      },
      osc(type, freq) { const o = ac.createOscillator(); o.type = type; o.frequency.value = freq; o.start(); nodes.push(o); oscs.push(o); return o; },
      // sine LFO → param:  param += center-less modulation of given depth
      lfo(hz, depth, param, shape) {
        const o = f.osc('sine', hz); const g = f.gain(depth);
        if (shape) { const ws = ac.createWaveShaper(); ws.curve = shape; nodes.push(ws); o.connect(ws); ws.connect(g); }
        else o.connect(g);
        g.connect(param); return o;
      },
      tap(src, dest) { src.connect(dest); nodes.push({ disconnect: () => { try { src.disconnect(dest); } catch (e) { /* already */ } } }); },
    };
    return f;
  }

  function buildGlobal() {
    const f = P();
    const out = globalGain;
    // wind: pink → lowpass (gusting) + white → band (leaf rustle)
    const windLow = f.gain(0, out), rustle = f.gain(0, out);
    const gust = f.gain(0.7, windLow);
    f.lfo(0.071, 0.2, gust.gain); f.lfo(0.13, 0.12, gust.gain);
    const lp = f.filter('lowpass', 500, 0.6, gust); f.lfo(0.09, 160, lp.frequency);
    f.tap(srcP, lp);
    const rgust = f.gain(0.6, rustle); f.lfo(0.11, 0.3, rgust.gain); f.lfo(0.37, 0.12, rgust.gain);
    const rbp = f.filter('bandpass', 2600, 0.7, rgust); f.tap(srcW, rbp);
    // rain: hiss + body
    const rainHi = f.gain(0, out), rainLo = f.gain(0, out);
    const rlp = f.filter('lowpass', 6500, 0.5, rainHi); const rhp = f.filter('highpass', 1400, 0.6, rlp); f.tap(srcW, rhp);
    const rbody = f.filter('lowpass', 900, 0.5, rainLo); f.tap(srcP, rbody);
    // fire: low roar (crackle is an emitter)
    const fire = f.gain(0, out); const flp = f.filter('lowpass', 260, 0.7, fire); f.tap(srcB, flp);
    return { f, windLow, rustle, lp, rainHi, rainLo, fire };
  }

  // ------------------------------------------------------------------ beds
  function cricket(f, dest, freq, pulseHz, chirpHz, panV, level = 1) {
    const g = f.gain(level, f.pan(panV, dest));
    const bp = f.filter('bandpass', freq, 6, g);
    const gate = f.gain(0, bp); f.lfo(chirpHz, 1, gate.gain, curves.gate);
    const pulse = f.gain(0.5, gate); f.lfo(pulseHz, 0.5, pulse.gain);
    const car = f.osc('sine', freq); car.connect(pulse);
    return g;
  }

  // soft leaves in the breeze: band-limited pink noise with slow, irregular swells (independent of the wind layer)
  function leafBed(f, out, freq, depth) {
    const g = f.gain(0, f.pan(0.15, out));
    const sw = f.gain(0.55, g); f.lfo(0.07, 0.3, sw.gain); f.lfo(0.19, 0.15, sw.gain);
    const bp = f.filter('bandpass', freq, 0.9, sw); f.lfo(0.05, freq * depth, bp.frequency);
    f.tap(srcP, f.filter('highpass', 700, 0.5, bp));
    return g;
  }
  function buildAmazon() {
    const f = P();
    const out = f.gain(0, ambBus);
    // day insects: two band-limited noise drones with different trill rates + a faint beating whine
    const ins1 = f.gain(0, f.pan(-0.35, out));
    const am1 = f.gain(0.5, ins1); f.lfo(21, 0.5, am1.gain);
    f.tap(srcW, f.filter('bandpass', 4700, 9, am1));
    const ins2 = f.gain(0, f.pan(0.45, out));
    const am2 = f.gain(0.5, ins2); f.lfo(33, 0.5, am2.gain, curves.buzz);
    const sw2 = f.gain(0.6, am2); f.lfo(0.13, 0.4, sw2.gain);
    f.tap(srcW, f.filter('bandpass', 6600, 14, sw2));
    const ins3 = f.gain(0, out);
    const sw3 = f.gain(0.5, ins3); f.lfo(0.07, 0.5, sw3.gain);
    f.osc('sine', 3120).connect(sw3); f.osc('sine', 3157).connect(sw3);
    // river
    const river = f.gain(0, f.pan(-0.25, out));
    f.tap(srcP, f.filter('bandpass', 420, 0.8, river));
    const shimmer = f.gain(0.35, river);
    const sbp = f.filter('bandpass', 1900, 2, shimmer); f.lfo(0.17, 300, sbp.frequency); f.tap(srcW, sbp);
    // night: cricket chorus + a soft frog trill bed
    const night = f.gain(0, out);
    cricket(f, night, 4400, 28, 1.7, -0.5, 1);
    cricket(f, night, 3900, 34, 2.3, 0.4, 0.8);
    cricket(f, night, 5100, 41, 0.9, 0.1, 0.6);
    const trill = f.gain(0, f.pan(0.25, out));
    const tam = f.gain(0, trill); f.lfo(17, 1, tam.gain, curves.buzz);
    const tsw = f.gain(0.5, tam); f.lfo(0.21, 0.5, tsw.gain);
    f.tap(srcW, f.filter('bandpass', 2300, 12, tsw));
    const leaves = leafBed(f, out, 2300, 0.08);
    const emitters = [
      emitter(() => S.day * (0.22 + 0.5 * S.dawn + 0.2 * S.dusk) * S.rich * (1 - 0.8 * S.rain) * (1 - 0.4 * S.high), amazonBird, 0.5),
      emitter(() => S.day * 0.03 * S.rich * (1 - 0.8 * S.rain) * (1 - 0.4 * S.high), parrots, 8),
      emitter(() => S.day * 0.025 * S.rich * (1 - 0.6 * S.rain) * (1 - 0.5 * S.high), cicadaSwell, 20),
      emitter(() => S.day * 0.012 * S.rich * (1 - 0.7 * S.rain), woodpecker, 25),
      emitter(() => (S.day * 0.008 + S.dawn * 0.03) * S.rich * (1 - 0.7 * S.rain), howler, 25),
      emitter(() => S.night * (0.15 + 1.0 * S.rich) * (1 - 0.5 * S.high), frogCall, 0.15),
      emitter(() => S.night * 0.035 * S.rich, potoo, 12),
      emitter(() => 0.6 * (1 - 0.6 * S.high), bubble, 0.25),
    ];
    return { id: 'amazon', f, out, ins1, ins2, ins3, river, night, trill, leaves, emitters, levels: amazonLevels };
  }
  function amazonLevels(b, set) {
    const ground = 1 - 0.75 * S.high, wet = 1 - 0.5 * S.rain;
    set(b.ins1.gain, 0.30 * S.day * ground * (0.1 + 0.9 * S.rich) * wet);
    set(b.ins2.gain, 0.24 * S.day * ground * clamp01(S.vitality * 1.3 - 0.1) * wet);
    set(b.ins3.gain, 0.006 * (0.3 * S.day + S.night) * ground * S.rich);
    set(b.river.gain, 0.16 * (1 - 0.5 * S.high) * (0.7 + 0.3 * S.rich));
    set(b.night.gain, 0.020 * S.night * ground * (0.3 + 0.7 * S.rich) * (1 - 0.4 * S.rain));
    set(b.trill.gain, 0.22 * S.night * ground * clamp01(S.vitality * 1.4 - 0.2));
    set(b.leaves.gain, 0.05 * (0.5 + 0.5 * S.day) * (0.5 + 0.5 * S.rich) * (1 - 0.5 * S.rain) * (1 - 0.4 * S.high));
  }

  function buildGrove() {
    const f = P();
    const out = f.gain(0, ambBus);
    // cicadas: buzzy band-noise with slow swells
    const cic = f.gain(0, f.pan(0.3, out));
    const swell = f.gain(0.55, cic); f.lfo(0.11, 0.35, swell.gain); f.lfo(0.29, 0.1, swell.gain);
    const cam = f.gain(0, swell); f.lfo(47, 1, cam.gain, curves.buzz);
    f.tap(srcW, f.filter('bandpass', 5300, 5, cam));
    // bees: two detuned saws with vibrato, lowpassed
    const bees = f.gain(0, f.pan(-0.25, out));
    const bsw = f.gain(0.6, bees); f.lfo(0.23, 0.4, bsw.gain);
    const blp = f.filter('lowpass', 650, 0.8, bsw);
    const s1 = f.osc('sawtooth', 196), s2 = f.osc('sawtooth', 209);
    f.lfo(4.3, 6, s1.frequency); f.lfo(5.1, 7, s2.frequency);
    s1.connect(blp); s2.connect(blp);
    // spring trickle (the little pool)
    const trickle = f.gain(0, f.pan(-0.4, out));
    const tbp = f.filter('bandpass', 1500, 2.5, trickle); f.lfo(0.23, 250, tbp.frequency); f.tap(srcP, tbp);
    // night crickets (Mediterranean field crickets: slower chirps)
    const night = f.gain(0, out);
    cricket(f, night, 4600, 40, 2.6, 0.45, 1);
    cricket(f, night, 4250, 35, 1.9, -0.4, 0.85);
    cricket(f, night, 4900, 30, 1.3, 0.0, 0.5);
    const leaves = leafBed(f, out, 2900, 0.1);
    const emitters = [
      emitter(() => S.day * (0.09 + 0.32 * S.dawn + 0.18 * S.dusk) * S.rich * groveBirdSeason() * (1 - 0.8 * S.rain), blackbird, 2.5),
      emitter(() => S.day * 0.17 * S.rich * groveBirdSeason() * (1 - 0.8 * S.rain) * (1 - 0.5 * S.high), sparrow, 1.2),
      emitter(() => S.day * 0.05 * S.rich * (1 - 0.8 * S.rain), dove, 6),
      emitter(() => S.day * (0.06 + 0.12 * S.dawn) * S.rich * groveBirdSeason() * (1 - 0.8 * S.rain), bulbul, 3),
      emitter(() => S.day * 0.04 * S.rich * ({ winter: 1.2, spring: 1, summer: 0.4, autumn: 0.8 }[S.season] || 1) * (1 - 0.8 * S.rain), greatTit, 5),
      emitter(() => S.day * 0.02 * S.rich * (S.season === 'winter' ? 0.3 : 1) * (1 - 0.8 * S.rain), hoopoe, 15),
      emitter(() => (S.dawn + S.dusk) * 0.03 * S.rich * (1 - 0.8 * S.rain), chukar, 25),
      emitter(() => S.night * 0.06 * S.rich * (S.season === 'spring' || S.season === 'winter' ? 1 : 0.2) * (1 - 0.3 * S.rain), treeFrog, 6),
      emitter(() => S.night * 0.022 * (0.3 + 0.7 * S.rich), owlScreech, 20),
      emitter(() => S.night * 0.05 * S.rich * (S.season === 'winter' ? 0.2 : 1), scops, 10),
    ];
    return { id: 'grove', f, out, cic, bees, trickle, night, leaves, emitters, levels: groveLevels };
  }
  // the reef (1.3): the slow surge of the sea heard from under the water, the crackle of snapping shrimp, bubbles
  function buildReef() {
    const f = P();
    const out = f.gain(0, ambBus);
    const surge = f.gain(0, out);
    const sw = f.gain(0.55, surge); f.lfo(0.075, 0.35, sw.gain); f.lfo(0.031, 0.15, sw.gain);
    const lp = f.filter('lowpass', 320, 0.7, sw); f.lfo(0.06, 90, lp.frequency); f.tap(srcB, lp);
    const hiss = f.gain(0, f.pan(-0.2, out));
    f.tap(srcP, f.filter('bandpass', 900, 0.6, hiss));
    const emitters = [
      emitter(() => 3.5 * (0.5 + 0.5 * S.rich), shrimpSnap, 0.03),
      emitter(() => 0.25 * (0.4 + 0.6 * S.rich), bubbles, 1.5),
    ];
    return { id: 'reef', f, out, surge, hiss, emitters, levels: reefLevels };
  }
  function reefLevels(b, set) {
    set(b.surge.gain, 0.16 * (1 - 0.25 * S.night));
    set(b.hiss.gain, 0.025 * (0.5 + 0.5 * S.day));
  }
  function shrimpSnap(t) {
    if (!AMB()) return;
    const v = voice('amb', globalGain, rand(-0.9, 0.9), rand(0.2, 0.7)); if (!v) return;
    noiseHit(v, t, bufW, 'highpass', rand(2500, 5000), 0.7, 0.0005, rand(0.004, 0.01), rand(0.03, 0.08));
    done(v);
  }
  function bubbles(t) {
    const d = AMB(); if (!d) return;
    const v = voice('amb', globalGain, rand(-0.6, 0.6), rand(0.3, 0.8)); if (!v) return;
    let tt = t; const n = 2 + ((Math.random() * 4) | 0);
    for (let i = 0; i < n; i++) { const f = rand(380, 700); tone(v, tt, f, f * 1.9, 0.004, 0.07, 0.03); tt += rand(0.05, 0.16); }
    done(v);
  }
  function groveBirdSeason() {
    return { winter: 0.45, spring: 1.2, summer: 0.7, autumn: 0.75 }[S.season] || 1;
  }
  function groveLevels(b, set) {
    const ground = 1 - 0.75 * S.high, se = S.season || 'spring';
    const cicSeason = se === 'summer' ? 1 : se === 'autumn' ? 0.2 : 0;
    set(b.cic.gain, 0.20 * cicSeason * S.day * sstep(0.1, 0.6, S.heat) * ground * (0.3 + 0.7 * S.rich) * (1 - 0.8 * S.rain));
    set(b.bees.gain, 0.07 * (se === 'spring' ? 1 : se === 'summer' ? 0.45 : se === 'autumn' ? 0.2 : 0) * S.day * ground * clamp01(S.vitality * 1.3 - 0.1) * (1 - 0.9 * S.rain));
    set(b.trickle.gain, 0.045 * ({ winter: 1, spring: 0.9, summer: 0.35, autumn: 0.5 }[se]) * (1 - 0.6 * S.high));
    const cr = { winter: 0.15, spring: 0.6, summer: 1, autumn: 0.85 }[se];
    set(b.night.gain, 0.020 * S.night * cr * ground * (0.3 + 0.7 * S.rich) * (1 - 0.6 * S.rain));
    set(b.leaves.gain, 0.045 * (0.45 + 0.55 * S.day) * (0.5 + 0.5 * S.rich) * (1 - 0.5 * S.rain) * (1 - 0.4 * S.high));
  }

  function openBed(id) {
    if (!ready) return;
    const now = ac.currentTime;
    for (const k in beds) if (k !== id) closeBed(k);
    if (!beds[id]) {
      beds[id] = id === 'amazon' ? buildAmazon() : id === 'grove' ? buildGrove() : id === 'reef' ? buildReef() : null;
      if (!beds[id]) { delete beds[id]; return; }
    }
    const b = beds[id];
    b.levels(b, (p, v) => { p.setValueAtTime(v, now); });   // start layers at their current target (no swoop)
    b.out.gain.cancelScheduledValues(now);
    b.out.gain.setValueAtTime(b.out.gain.value, now);
    b.out.gain.setTargetAtTime(1, now, 0.9);
  }
  function closeBed(id) {
    const b = beds[id]; if (!b) return;
    delete beds[id];
    const now = ac.currentTime, end = now + 4.5;
    b.out.gain.cancelScheduledValues(now);
    b.out.gain.setValueAtTime(b.out.gain.value, now);
    b.out.gain.setTargetAtTime(0, now, 0.7);
    // tear down in audio time once silent
    const anchor = b.f.osc('sine', 1);           // silent, unconnected: only marks the teardown time
    for (const o of b.f.oscs) o.stop(end);
    anchor.onended = () => { for (const n of b.f.nodes) { try { n.disconnect(); } catch (e) { /* ignore */ } } };
  }

  // -------------------------------------------------------------- emitters
  function emitter(rateFn, fire, minGap = 0.1) { return { rateFn, fire, minGap, next: null, rate: 0 }; }
  function interval(rate, minGap) { return Math.max(minGap, -Math.log(1 - Math.random() * 0.999) / rate); }
  function runEmitters(list, now, mul = 1) {
    for (const e of list) {
      const r = fin(e.rateFn(), 0) * mul;
      if (r <= 1e-4) { e.next = null; continue; }
      if (e.next === null || e.next < now - 0.5 || r > e.rate * 2.5) e.next = now + interval(r, e.minGap) * (e.next === null ? 0.6 : 1);
      e.rate = r;
      if (e.next <= now + 0.12) {
        const t = Math.max(e.next, now + 0.02);
        try { e.fire(t); } catch (err) { /* never let a sound break the game */ }
        e.next = t + interval(r, e.minGap);
      }
    }
  }

  // ------------------------------------------------------- transient voices
  // A voice owns the short-lived nodes of one sound and disconnects them when its last source ends.
  function voice(kind, dest, panV = 0, level = 1) {
    if (!ready || active[kind] >= LIMIT[kind]) return null;
    active[kind]++;
    const v = { kind, nodes: [], end: 0, anchor: null, out: null };
    v.out = vgain(v, level);
    if (panV && ac.createStereoPanner) {
      const p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, panV)); v.nodes.push(p);
      v.out.connect(p); p.connect(dest);
    } else v.out.connect(dest);
    return v;
  }
  function vgain(v, val = 0, dest) { const g = ac.createGain(); g.gain.value = val; v.nodes.push(g); if (dest) g.connect(dest); return g; }
  function vfilter(v, type, freq, Q, dest) {
    const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = freq; b.Q.value = Q; v.nodes.push(b);
    if (dest) b.connect(dest); return b;
  }
  function track(v, src, t1) { v.nodes.push(src); if (t1 >= v.end) { v.end = t1; v.anchor = src; } }
  function vosc(v, type, freq, t0, t1, dest) {
    const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t0);
    o.start(t0); o.stop(t1); track(v, o, t1); if (dest) o.connect(dest); return o;
  }
  function vnoise(v, buf, t0, t1, dest) {
    const s = ac.createBufferSource(); s.buffer = buf; s.loop = true;
    s.start(t0, Math.random() * (buf.duration - 0.2)); s.stop(t1); track(v, s, t1); if (dest) s.connect(dest); return s;
  }
  function done(v) {
    if (!v.anchor) { cleanup(v); return; }
    v.anchor.onended = () => cleanup(v);
  }
  function cleanup(v) {
    for (const n of v.nodes) { try { n.disconnect(); } catch (e) { /* ignore */ } }
    v.nodes.length = 0; active[v.kind]--;
  }
  // simple percussive envelope on a gain param
  function env(p, t, peak, a, d, sustain = 0) {
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(peak, t + a);
    if (sustain > 0) p.setValueAtTime(peak, t + a + sustain);
    p.exponentialRampToValueAtTime(0.0001, t + a + sustain + d);
    p.setValueAtTime(0, t + a + sustain + d + 0.005);
    return t + a + sustain + d + 0.02;
  }
  // tone with pitch glide and envelope
  function tone(v, t, f0, f1, a, d, peak, type = 'sine', dest = v.out, sustain = 0) {
    const g = vgain(v, 0, dest);
    const end = env(g.gain, t, peak, a, d, sustain);
    const o = vosc(v, type, f0, t, end, g);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + a + sustain + d * 0.8);
    return o;
  }
  // bell: inharmonic partials, high ones decay faster
  function bell(v, t, f, peak, dur, dest = v.out) {
    const parts = [[1, 1, 1], [2.0, 0.28, 0.6], [2.76, 0.12, 0.4], [5.4, 0.04, 0.22]];
    for (const [m, g, dm] of parts) if (f * m < 12000) tone(v, t, f * m, 0, 0.004, dur * dm, peak * g, 'sine', dest);
  }
  function noiseHit(v, t, buf, type, freq, Q, a, d, peak, dest = v.out, f1) {
    const g = vgain(v, 0, dest);
    const fl = vfilter(v, type, freq, Q, g);
    const end = env(g.gain, t, peak, a, d);
    if (f1) fl.frequency.exponentialRampToValueAtTime(f1, end);
    vnoise(v, buf, t, end, fl);
    return end;
  }
  // a whistle phrase on ONE oscillator: notes = [{t, dur, f0, f1, g}] in strictly increasing, non-overlapping time
  function phrase(v, notes, type = 'sine', vib = 0, vibHz = 0, dest = v.out) {
    if (!notes.length) return;
    const t0 = notes[0].t, last = notes[notes.length - 1], t1 = last.t + last.dur + 0.03;
    const g = vgain(v, 0, dest);
    const o = vosc(v, type, notes[0].f0, t0, t1, g);
    g.gain.setValueAtTime(0, t0);
    for (const n of notes) {
      const a = Math.min(0.02, n.dur * 0.25);
      o.frequency.setValueAtTime(n.f0, n.t);
      o.frequency.exponentialRampToValueAtTime(n.f1 || n.f0, n.t + n.dur);
      g.gain.setValueAtTime(0, n.t);
      g.gain.linearRampToValueAtTime(n.g, n.t + a);
      g.gain.linearRampToValueAtTime(n.g * 0.75, n.t + n.dur * 0.7);
      g.gain.linearRampToValueAtTime(0, n.t + n.dur);
    }
    if (vib) { const l = vosc(v, 'sine', vibHz, t0, t1); const lg = vgain(v, vib); l.connect(lg); lg.connect(o.frequency); }
    return o;
  }

  // ------------------------------------------------- ambient calls (biomes)
  const AMB = () => (beds[biome] ? beds[biome].out : null);
  function ambVoice(level, panV = rand(-0.8, 0.8)) { const d = AMB(); return d ? voice('amb', d, panV, level) : null; }

  function amazonBird(t) {
    const kind = pick(['whistle', 'whistle', 'piha', 'trill', 'toucan', 'tinamou', 'wren']);
    const v = ambVoice(rand(0.5, 1) * (0.6 + 0.4 * S.rich)); if (!v) return;
    const notes = [];
    if (kind === 'whistle') {           // long clear rising / falling whistles
      const f = rand(1400, 2600), n = 1 + ((Math.random() * 3) | 0); let tt = t;
      for (let i = 0; i < n; i++) { const up = Math.random() < 0.5; const d = rand(0.25, 0.5); notes.push({ t: tt, dur: d, f0: up ? f * 0.8 : f * 1.2, f1: up ? f * 1.15 : f * 0.75, g: 0.08 }); tt += d + rand(0.12, 0.35); }
      phrase(v, notes, 'sine', 15, 6);
    } else if (kind === 'piha') {       // "pee-pee-YO" (screaming-piha-like, but soft & distant)
      const f = rand(1700, 2200);
      notes.push({ t, dur: 0.22, f0: f * 0.7, f1: f, g: 0.055 });
      notes.push({ t: t + 0.35, dur: 0.22, f0: f * 0.7, f1: f, g: 0.065 });
      notes.push({ t: t + 0.7, dur: 0.45, f0: f * 1.25, f1: f * 0.55, g: 0.08 });
      phrase(v, notes);
    } else if (kind === 'trill') {      // fast descending trill
      const f = rand(2800, 4200), n = 8 + ((Math.random() * 8) | 0);
      for (let i = 0; i < n; i++) { const ff = f * (1 - i * 0.025); notes.push({ t: t + i * 0.065, dur: 0.045, f0: ff * 1.08, f1: ff * 0.9, g: 0.05 }); }
      phrase(v, notes);
    } else if (kind === 'tinamou') {    // tremulous mellow whistles
      const f = rand(700, 1000);
      for (let i = 0; i < 3; i++) notes.push({ t: t + i * 0.9, dur: 0.6, f0: f * (1 + i * 0.06), f1: f * (0.97 + i * 0.06), g: 0.09 });
      phrase(v, notes, 'sine', 18, 9);
    } else if (kind === 'wren') {       // musical quick phrase
      const base = rand(1800, 3000); const steps = [1, 1.25, 1.12, 1.5, 1.33, 1.68]; let tt = t;
      const n = 4 + ((Math.random() * 4) | 0);
      for (let i = 0; i < n; i++) { const d = rand(0.07, 0.16); const ff = base * pick(steps); notes.push({ t: tt, dur: d, f0: ff, f1: ff * rand(0.92, 1.1), g: 0.055 }); tt += d + rand(0.03, 0.08); }
      phrase(v, notes, 'sine', 30, 25);
    } else {                            // toucan-like croaks: "grek grek grek"
      const f = rand(260, 340), n = 3 + ((Math.random() * 4) | 0);
      const bp = vfilter(v, 'bandpass', 1100, 2.5, v.out);
      for (let i = 0; i < n; i++) notes.push({ t: t + i * 0.24, dur: 0.11, f0: f * 1.15, f1: f * 0.85, g: 0.15 });
      phrase(v, notes, 'sawtooth', 0, 0, bp);
    }
    done(v);
  }
  function howler(t) {                  // distant low roar, rare and soft
    const v = ambVoice(0.8, rand(-0.9, 0.9)); if (!v) return;
    const dur = rand(3.5, 5.5);
    const lp = vfilter(v, 'lowpass', 750, 0.7, v.out);
    const form = vfilter(v, 'bandpass', 380, 2.2, lp);
    form.frequency.setValueAtTime(330, t);
    form.frequency.linearRampToValueAtTime(620, t + dur * 0.45);
    form.frequency.linearRampToValueAtTime(380, t + dur);
    const g = vgain(v, 0, form);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.12, t + dur * 0.35);
    g.gain.linearRampToValueAtTime(0.1, t + dur * 0.7);
    g.gain.linearRampToValueAtTime(0, t + dur);
    const am = vgain(v, 0.7, g); const l = vosc(v, 'sine', rand(2.5, 3.5), t, t + dur + 0.05); const lg = vgain(v, 0.3); l.connect(lg); lg.connect(am.gain);
    const s = vosc(v, 'sawtooth', rand(80, 95), t, t + dur + 0.05, am);
    s.frequency.linearRampToValueAtTime(rand(100, 115), t + dur * 0.5);
    s.frequency.linearRampToValueAtTime(85, t + dur);
    const ng = vgain(v, 0.6, am); vnoise(v, bufB, t, t + dur + 0.05, ng);
    done(v);
  }
  function frogCall(t) {
    const v = ambVoice(rand(0.4, 1) * (0.5 + 0.5 * S.rich)); if (!v) return;
    const kind = Math.random();
    const notes = [];
    if (kind < 0.45) {                  // "co-kee" peeps
      const f = rand(1100, 1500), n = 1 + ((Math.random() * 3) | 0);
      for (let i = 0; i < n; i++) {
        const tt = t + i * 0.45;
        notes.push({ t: tt, dur: 0.07, f0: f, f1: f * 1.05, g: 0.04 });
        notes.push({ t: tt + 0.1, dur: 0.12, f0: f * 1.6, f1: f * 1.9, g: 0.045 });
      }
      phrase(v, notes);
    } else if (kind < 0.75) {           // tiny tree-frog clicks/peeps
      const f = rand(2400, 3400), n = 3 + ((Math.random() * 6) | 0), gap = rand(0.12, 0.22);
      for (let i = 0; i < n; i++) notes.push({ t: t + i * gap, dur: 0.035, f0: f, f1: f * 1.15, g: 0.03 });
      phrase(v, notes);
    } else {                            // low soft croaks
      const f = rand(140, 220), n = 2 + ((Math.random() * 3) | 0);
      const lp = vfilter(v, 'lowpass', 900, 1.5, v.out);
      for (let i = 0; i < n; i++) notes.push({ t: t + i * 0.3, dur: 0.16, f0: f, f1: f * 0.92, g: 0.11 });
      phrase(v, notes, 'square', 0, 0, lp);
    }
    done(v);
  }
  function potoo(t) {                   // mournful falling whistles, very soft
    const v = ambVoice(0.6); if (!v) return;
    let f = rand(1050, 1250); const notes = [];
    for (let i = 0; i < 5; i++) { notes.push({ t: t + i * 0.75, dur: 0.5, f0: f * 1.03, f1: f * 0.97, g: 0.035 }); f *= 0.89; }
    phrase(v, notes, 'sine', 5, 5);
    done(v);
  }
  function bubble(t) {
    const v = ambVoice(rand(0.3, 1), rand(-0.6, 0.1)); if (!v) return;
    const f = rand(320, 650);
    tone(v, t, f, f * rand(1.6, 2.2), 0.004, 0.05, 0.03);
    done(v);
  }
  function blackbird(t) {               // melodic fluting phrase that ends in a quiet twitter
    const v = ambVoice(rand(0.6, 1) * (0.6 + 0.4 * S.rich)); if (!v) return;
    const scale = [1, 1.122, 1.26, 1.335, 1.498, 1.682, 2];
    const base = rand(1200, 1600); let tt = t; const notes = [];
    const n = 3 + ((Math.random() * 4) | 0);
    for (let i = 0; i < n; i++) {
      const d = rand(0.1, 0.28), f = base * pick(scale), gl = Math.random() < 0.4 ? rand(0.85, 1.2) : 1;
      notes.push({ t: tt, dur: d, f0: f, f1: f * gl, g: 0.05 }); tt += d + rand(0.03, 0.1);
    }
    const tw = 2 + ((Math.random() * 5) | 0), tf = rand(3200, 4500);
    for (let i = 0; i < tw; i++) { notes.push({ t: tt, dur: 0.04, f0: tf, f1: tf * 0.8, g: 0.022 }); tt += 0.06; }
    phrase(v, notes, 'sine', 25, 22);
    done(v);
  }
  function sparrow(t) {
    const v = ambVoice(rand(0.4, 0.9)); if (!v) return;
    const n = 2 + ((Math.random() * 5) | 0), f = rand(3300, 4200), gap = rand(0.14, 0.3); const notes = [];
    for (let i = 0; i < n; i++) notes.push({ t: t + i * gap, dur: 0.055, f0: f * rand(0.97, 1.05), f1: f * 0.72, g: 0.03 });
    phrase(v, notes);
    done(v);
  }
  function dove(t) {                    // soft "coo-COO-coo-coo"
    const v = ambVoice(rand(0.6, 1)); if (!v) return;
    const f = rand(470, 540);
    const lp = vfilter(v, 'lowpass', 1200, 0.7, v.out);
    const pat = [[0, 0.22, 1.0], [0.32, 0.4, 1.06], [0.85, 0.22, 0.98], [1.15, 0.3, 0.95]];
    phrase(v, pat.map(([dt, d, m]) => ({ t: t + dt, dur: d, f0: f * m, f1: f * m * 0.93, g: 0.05 })), 'triangle', 0, 0, lp);
    done(v);
  }
  function owlScreech(t) {              // barn-owl-like breathy hiss, gentle
    const v = ambVoice(0.6); if (!v) return;
    const dur = rand(0.9, 1.3);
    const g = vgain(v, 0, v.out);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.11, t + 0.3);
    g.gain.linearRampToValueAtTime(0.08, t + dur * 0.7);
    g.gain.linearRampToValueAtTime(0, t + dur);
    const lp = vfilter(v, 'lowpass', 5000, 0.5, g);
    const bp = vfilter(v, 'bandpass', 3000, 1.6, lp);
    bp.frequency.setValueAtTime(3200, t); bp.frequency.linearRampToValueAtTime(2500, t + dur);
    vnoise(v, bufW, t, t + dur + 0.05, bp);
    done(v);
  }
  function scops(t) {                   // scops-owl-like soft "tyu" repeated
    const v = ambVoice(rand(0.5, 0.9)); if (!v) return;
    const f = rand(1150, 1350), n = 3 + ((Math.random() * 3) | 0), notes = [];
    for (let i = 0; i < n; i++) notes.push({ t: t + i * 2.4, dur: 0.18, f0: f * 1.04, f1: f * 0.94, g: 0.045 });
    phrase(v, notes, 'sine');
    done(v);
  }
  function bulbul(t) {                  // bulbul: a short, liquid, bubbling phrase
    const v = ambVoice(rand(0.55, 0.95) * (0.6 + 0.4 * S.rich)); if (!v) return;
    const base = rand(1300, 1700), steps = [1, 1.19, 0.89, 1.33, 1.06]; let tt = t; const notes = [];
    const n = 3 + ((Math.random() * 3) | 0);
    for (let i = 0; i < n; i++) { const d = rand(0.08, 0.17), ff = base * pick(steps); notes.push({ t: tt, dur: d, f0: ff * 0.9, f1: ff * 1.08, g: 0.05 }); tt += d + rand(0.02, 0.06); }
    phrase(v, notes, 'sine', 40, 30);
    done(v);
  }
  function greatTit(t) {                // great tit: "ti-tu, ti-tu, ti-tu"
    const v = ambVoice(rand(0.45, 0.85)); if (!v) return;
    const hi = rand(4300, 5200), lo = hi * rand(0.62, 0.7), n = 2 + ((Math.random() * 3) | 0); const notes = [];
    for (let i = 0; i < n; i++) { const tt = t + i * 0.34; notes.push({ t: tt, dur: 0.07, f0: hi, f1: hi * 0.97, g: 0.03 }); notes.push({ t: tt + 0.11, dur: 0.12, f0: lo, f1: lo * 0.98, g: 0.032 }); }
    phrase(v, notes);
    done(v);
  }
  function hoopoe(t) {                  // hoopoe: soft low "hoo-po-po"
    const v = ambVoice(rand(0.6, 0.95)); if (!v) return;
    const f = rand(480, 560); const notes = [];
    for (let i = 0; i < 3; i++) notes.push({ t: t + i * 0.2, dur: 0.11, f0: f * 1.02, f1: f * 0.97, g: 0.07 });
    const lp = vfilter(v, 'lowpass', 1400, 0.7, v.out);
    phrase(v, notes, 'sine', 0, 0, lp);
    done(v);
  }
  function chukar(t) {                  // chukar: a distant rhythmic "chuk-chuk-chukar"
    const v = ambVoice(rand(0.5, 0.8), rand(-0.9, 0.9)); if (!v) return;
    const f = rand(900, 1100), n = 4 + ((Math.random() * 4) | 0); const notes = [];
    for (let i = 0; i < n; i++) { const tt = t + i * 0.2 * (1 - i * 0.03); notes.push({ t: tt, dur: 0.07, f0: f * (i === n - 1 ? 1.15 : 1), f1: f * 0.8, g: 0.035 }); }
    const bp = vfilter(v, 'bandpass', 1300, 1.5, v.out);
    phrase(v, notes, 'triangle', 0, 0, bp);
    done(v);
  }
  function treeFrog(t) {                // tree frogs by the pool in spring nights: quick soft "krek-krek-krek"
    const v = ambVoice(rand(0.4, 0.8), rand(-0.7, 0.2)); if (!v) return;
    const f = rand(1500, 1900), n = 4 + ((Math.random() * 6) | 0); const notes = [];
    for (let i = 0; i < n; i++) notes.push({ t: t + i * 0.13, dur: 0.05, f0: f, f1: f * 0.85, g: 0.025 });
    const bp = vfilter(v, 'bandpass', 1800, 3, v.out);
    phrase(v, notes, 'square', 0, 0, bp);
    done(v);
  }
  function parrots(t) {                 // a small flock of parrots passing far away: a few soft, filtered squawks
    const v = ambVoice(rand(0.35, 0.6), rand(-0.9, 0.9)); if (!v) return;
    const lp = vfilter(v, 'lowpass', 2600, 0.7, v.out);
    const bp = vfilter(v, 'bandpass', 1500, 1.8, lp);
    const n = 2 + ((Math.random() * 4) | 0); const notes = []; let tt = t;
    for (let i = 0; i < n; i++) { const f = rand(650, 900), d = rand(0.12, 0.22); notes.push({ t: tt, dur: d, f0: f * 1.2, f1: f * 0.8, g: 0.09 }); tt += d + rand(0.1, 0.4); }
    phrase(v, notes, 'sawtooth', 20, 35, bp);
    done(v);
  }
  function cicadaSwell(t) {             // a tropical cicada that rises, holds and fades away
    const v = ambVoice(rand(0.35, 0.6), rand(-0.8, 0.8)); if (!v) return;
    const dur = rand(4, 7), f = rand(3600, 5200);
    const g = vgain(v, 0, v.out);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + dur * 0.35);
    g.gain.setValueAtTime(0.05, t + dur * 0.7); g.gain.linearRampToValueAtTime(0, t + dur);
    const am = vgain(v, 0.5, g); const l = vosc(v, 'sine', rand(55, 80), t, t + dur + 0.05); const lg = vgain(v, 0.5); l.connect(lg); lg.connect(am.gain);
    const bp = vfilter(v, 'bandpass', f * 0.9, 8, am); bp.frequency.linearRampToValueAtTime(f, t + dur * 0.4);
    vnoise(v, bufW, t, t + dur + 0.05, bp);
    done(v);
  }
  function woodpecker(t) {              // a far woodpecker drumming on a hollow trunk
    const v = ambVoice(rand(0.4, 0.7), rand(-0.9, 0.9)); if (!v) return;
    const n = 10 + ((Math.random() * 10) | 0), gap = rand(0.045, 0.06);
    for (let i = 0; i < n; i++) noiseHit(v, t + i * gap, bufB, 'bandpass', rand(700, 850), 3, 0.001, 0.03, 0.12 * (1 - i / n * 0.5));
    done(v);
  }
  function dripCall(t) {
    const d = AMB(); if (!d) return;
    const v = voice('amb', globalGain, rand(-0.9, 0.9), rand(0.3, 1)); if (!v) return;
    const f = rand(1100, 2600);
    tone(v, t, f, f * 1.7, 0.002, 0.06, 0.035);
    done(v);
  }
  function crackleCall(t) {
    if (!AMB()) return;
    const v = voice('amb', globalGain, rand(-0.6, 0.6), 1); if (!v) return;
    const n = 1 + ((Math.random() * 3) | 0); let tt = t;
    for (let i = 0; i < n; i++) {
      if (Math.random() < 0.8) noiseHit(v, tt, bufW, 'highpass', rand(1500, 3500), 0.7, 0.001, rand(0.008, 0.025), rand(0.07, 0.18));
      else noiseHit(v, tt, bufW, 'bandpass', rand(500, 900), 1.5, 0.001, 0.04, 0.12);
      tt += rand(0.01, 0.05);
    }
    done(v);
  }

  // ------------------------------------------------------------ one-shots
  const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5, 1568, 1760, 2093];
  const SFX = {
    click(v, t) { tone(v, t, 1100, 820, 0.002, 0.05, 0.16, 'triangle'); tone(v, t, 2200, 1800, 0.001, 0.02, 0.04); },
    hover(v, t) { tone(v, t, 1500, 1600, 0.004, 0.04, 0.07); },
    select(v, t) { tone(v, t, 660, 0, 0.002, 0.12, 0.18); tone(v, t, 2640, 0, 0.001, 0.04, 0.05); tone(v, t + 0.05, 990, 0, 0.002, 0.14, 0.12); },
    pickup(v, t) {
      tone(v, t, 380, 720, 0.01, 0.1, 0.14, 'triangle');
      noiseHit(v, t, bufW, 'bandpass', 900, 1.2, 0.03, 0.1, 0.07, v.out, 2400);
    },
    place(v, t) {
      tone(v, t, 150, 58, 0.004, 0.2, 0.42);                                     // earthy thump
      noiseHit(v, t, bufB, 'lowpass', 380, 0.8, 0.003, 0.16, 0.5);                // soil
      [1568, 2093, 2637].forEach((f, i) => tone(v, t + 0.07 + i * 0.045, f, 0, 0.002, 0.25, 0.045)); // sparkle
    },
    invalid(v, t) {
      const lp = vfilter(v, 'lowpass', 1100, 0.7, v.out);
      tone(v, t, 330, 320, 0.01, 0.13, 0.17, 'triangle', lp); tone(v, t + 0.14, 262, 255, 0.01, 0.18, 0.15, 'triangle', lp);
    },
    grow(v, t) {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(v, t + i * 0.07, f * 0.985, f, 0.01, 0.55, 0.09));
      tone(v, t + 0.28, 2093, 0, 0.003, 0.4, 0.025);
    },
    discover(v, t) {
      const seq = [0, 2, 4, 5, 7, 8, 10];
      seq.forEach((k, i) => { tone(v, t + i * 0.075, PENTA[k], 0, 0.004, 0.7, 0.08, 'triangle'); tone(v, t + i * 0.075, PENTA[k] * 2, 0, 0.002, 0.3, 0.025); });
      bell(v, t + 0.55, 2093, 0.06, 1.4);
      noiseHit(v, t + 0.5, bufW, 'highpass', 6000, 0.7, 0.2, 0.7, 0.025);       // shimmer
    },
    mission(v, t) {
      const lp = vfilter(v, 'lowpass', 2600, 0.6, v.out);
      [[0, 392], [0.13, 523.25], [0.26, 659.25]].forEach(([dt, f]) => {
        tone(v, t + dt, f, 0, 0.012, 0.22, 0.14, 'triangle', lp); tone(v, t + dt, f, 0, 0.012, 0.18, 0.04, 'sawtooth', lp);
      });
      [523.25, 659.25, 783.99, 1046.5].forEach((f) => {
        tone(v, t + 0.42, f, 0, 0.03, 1.1, 0.085, 'triangle', lp, 0.25);
        tone(v, t + 0.42, f * 1.003, 0, 0.03, 0.9, 0.02, 'sawtooth', lp, 0.2);
      });
      bell(v, t + 0.42, 2093, 0.035, 1.2);
    },
    event(v, t) { bell(v, t, 784, 0.16, 1.1); bell(v, t + 0.2, 1175, 0.13, 1.3); },
    remove(v, t) {
      tone(v, t, 620, 280, 0.01, 0.28, 0.14, 'triangle');
      noiseHit(v, t, bufP, 'bandpass', 1200, 1, 0.02, 0.22, 0.12, v.out, 400);
    },
    points(v, t) { tone(v, t, 2350, 0, 0.001, 0.05, 0.12); tone(v, t + 0.035, 3135, 0, 0.001, 0.08, 0.09); },
    thunder(v, t) {                     // distant roll: slow attack, no sharp crack
      const lp = vfilter(v, 'lowpass', 160, 0.7, v.out);
      lp.frequency.setValueAtTime(420, t); lp.frequency.exponentialRampToValueAtTime(110, t + 4);
      const g = vgain(v, 0, lp);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.5, t + 0.35);
      g.gain.linearRampToValueAtTime(0.3, t + 0.9);
      g.gain.linearRampToValueAtTime(0.4, t + 1.4);
      g.gain.exponentialRampToValueAtTime(0.001, t + 4.5);
      g.gain.setValueAtTime(0, t + 4.52);
      vnoise(v, bufB, t, t + 4.6, g);
      noiseHit(v, t + 0.05, bufP, 'lowpass', 900, 0.6, 0.06, 0.6, 0.12);
    },
    night(v, t) { bell(v, t, 523.25, 0.13, 2.6); bell(v, t + 0.01, 784, 0.05, 2.2); },
    dawn(v, t) {
      const notes = []; const base = 1500; let tt = t;
      [[1, 1.12, 0.14], [1.5, 1.4, 0.18], [1.26, 1.5, 0.12], [1.68, 1.6, 0.22]].forEach(([a, b, d]) => { notes.push({ t: tt, dur: d, f0: base * a, f1: base * b, g: 0.07 }); tt += d + 0.05; });
      for (let i = 0; i < 4; i++) { notes.push({ t: tt, dur: 0.04, f0: 3600, f1: 2900, g: 0.035 }); tt += 0.065; }
      phrase(v, notes, 'sine', 20, 22);
    },
    quizRight(v, t) {
      tone(v, t, 659.25, 0, 0.006, 0.3, 0.13, 'triangle'); tone(v, t + 0.12, 987.77, 0, 0.006, 0.55, 0.13, 'triangle');
      [1975.5, 2637].forEach((f, i) => tone(v, t + 0.22 + i * 0.06, f, 0, 0.002, 0.3, 0.03));
    },
    quizWrong(v, t) {
      const lp = vfilter(v, 'lowpass', 900, 0.7, v.out);
      tone(v, t, 349.23, 340, 0.02, 0.22, 0.13, 'triangle', lp); tone(v, t + 0.2, 311.13, 300, 0.02, 0.35, 0.12, 'triangle', lp);
    },
    pop(v, t) { tone(v, t, 320, 900, 0.003, 0.07, 0.17); tone(v, t + 0.02, 1400, 0, 0.002, 0.05, 0.03); },
  };

  function play(name, opts = {}) {
    if (!ready || muted || !SFX[name]) return;
    try {
      if (!offline && ac.state !== 'running') return;
      const now = ac.currentTime;
      if (MIN_GAP[name] && lastPlay[name] !== undefined && now - lastPlay[name] < MIN_GAP[name] && now >= lastPlay[name]) return;
      lastPlay[name] = now;
      const vol = Math.max(0, Math.min(1.5, fin(opts.volume, 1)));
      if (vol <= 0) return;
      const v = voice('sfx', sfxBus, fin(opts.pan, 0), vol); if (!v) return;
      SFX[name](v, now + 0.01);
      done(v);
    } catch (e) { /* never let a sound break the game */ }
  }

  // ------------------------------------------------------------- per frame
  function update(c = {}) {
    if (!ready) return;
    try {
      const df = fin(c.dayFrac, S.dayFrac);
      S.dayFrac = ((df % 1) + 1) % 1;
      S.season = c.season === undefined ? S.season : c.season;
      S.rain = clamp01(fin(c.rain, S.rain)); S.wind = clamp01(fin(c.wind, S.wind));
      S.vitality = clamp01(fin(c.vitality, S.vitality)); S.fire = clamp01(fin(c.fire, S.fire));
      S.cameraHeight = fin(c.cameraHeight, S.cameraHeight); S.speed = fin(c.speed, S.speed);
      const elev = Math.sin(2 * Math.PI * (S.dayFrac - 0.25));          // ~sun elevation proxy
      S.night = c.night !== undefined ? clamp01(fin(c.night, 0)) : 1 - sstep(-0.12, 0.12, elev);
      S.day = 1 - S.night;
      S.dawn = Math.exp(-Math.pow((S.dayFrac - 0.27) / 0.035, 2));
      S.dusk = Math.exp(-Math.pow((S.dayFrac - 0.73) / 0.035, 2));
      S.heat = clamp01(elev);
      S.high = sstep(30, 140, S.cameraHeight);
      S.rich = 0.25 + 0.75 * S.vitality;

      const now = ac.currentTime;
      if (now - lastLevels >= 0.1 || now < lastLevels) { lastLevels = now; applyLevels(now); }
      if (muted || (!offline && ac.state !== 'running')) return;
      const mul = S.speed === 0 ? 0.35 : 1;          // paused → sparser calls (beds are ducked too)
      runEmitters(globalEmitters, now, mul);
      const b = beds[biome]; if (b) runEmitters(b.emitters, now, mul);
    } catch (e) { /* ignore */ }
  }

  function applyLevels(now) {
    const set = (p, v, tau = 0.5) => {         // skip unchanged targets → fewer automation events
      v = fin(v, 0); const o = lastTarget.get(p);
      if (o !== undefined && Math.abs(o - v) < 1e-5) return;
      lastTarget.set(p, v); p.setTargetAtTime(v, now, tau);
    };
    set(duck.gain, S.speed === 0 ? 0.35 : 1, 0.3);
    set(globalGain.gain, biome ? 1 : 0, 0.8);
    const base = biome === 'grove' ? 0.3 : 0.12;
    const w = clamp01(base + 0.6 * S.wind + 0.5 * S.high + (S.season === 'winter' ? 0.12 : 0) + 0.15 * S.rain);
    set(G.windLow.gain, 0.22 * w * w + 0.02 * w, 0.8);
    set(G.rustle.gain, (biome === 'grove' ? 0.05 : 0.03) * w * (1 - 0.6 * S.high), 0.8);
    set(G.lp.frequency, 350 + 900 * w, 0.8);
    set(G.rainHi.gain, 0.045 * S.rain, 0.8);
    set(G.rainLo.gain, 0.06 * S.rain, 0.8);
    set(G.fire.gain, 0.09 * S.fire, 0.6);
    const b = beds[biome];
    if (b) b.levels(b, set);
  }

  // ------------------------------------------------------------- controls
  function setBiome(id) {
    id = id === 'amazon' || id === 'grove' || id === 'reef' ? id : null;
    if (id === biome) return;
    biome = id;
    if (!ready) return;
    try {
      if (id) openBed(id);
      else {
        for (const k in beds) closeBed(k);
        // leaving the island: nobody calls update() any more, so the weather layers (rain, wind, fire)
        // would hold their last level on the start screen. Clear the weather and fade the global layer now.
        S.rain = 0; S.wind = 0; S.fire = 0; S.speed = 1;
        applyLevels(ac.currentTime);
      }
      lastLevels = -1;
    } catch (e) { /* ignore */ }
  }
  function setMuted(b) {
    muted = !!b;
    if (!ready) return;
    try {
      const now = ac.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.setTargetAtTime(muted ? 0 : volume, now, 0.08);
      if (offline) return;
      clearTimeout(suspendTimer);
      if (muted) suspendTimer = setTimeout(() => { if (muted && ac.state === 'running') ac.suspend().catch(() => {}); }, 400);
      else if (ac.state !== 'running') ac.resume().catch(() => {});
    } catch (e) { /* ignore */ }
  }
  function setVolume(v) {
    volume = clamp01(fin(v, volume));
    if (!ready || muted) return;
    try { master.gain.setTargetAtTime(volume, ac.currentTime, 0.05); } catch (e) { /* ignore */ }
  }

  return {
    start, setBiome, update, play, setMuted, setVolume,
    musicOut: () => (ready ? musicBus : null),
    voiceOut: () => (ready ? voiceBus : null),
    // while רובו־דע speaks the music steps back (audio/voice.js)
    duckMusic(on) { if (!ready || !musicBus) return; const t = ac.currentTime; musicBus.gain.cancelScheduledValues(t); musicBus.gain.setTargetAtTime(on ? 0.35 : 0.9, t, on ? 0.08 : 0.4); },
    get muted() { return muted; },
    get volume() { return volume; },
    get context() { return ac; },
    get ready() { return ready; },
    sounds: SFX_NAMES.slice(),
    _debug: () => ({ active: { ...active }, beds: Object.keys(beds), S: { ...S } }),
  };
}
