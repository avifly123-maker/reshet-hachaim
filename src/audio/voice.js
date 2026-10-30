// The voice of רובו־דע (1.3.2). Every line he says is made in advance (tools/voice/make.py: the Phonikud "shaul"
// voice, read by its nikud, with a robot colour added) and kept in src/data/voice.js, an asset module imported only
// when he first speaks (a file per line in the desktop build). No model and no network in the game.
//
//   const voice = createVoice(audio);
//   voice.say(id) → Promise<boolean>   resolves when the line ends (false: no file, voice off, or stopped)
//   voice.stop()                        stop at once (the bubble was skipped)
//   voice.level() → 0..1                how loud he is right now (the face's mouth follows it)
//   voice.has(id) → Promise<boolean>
// The words always stay on screen too; the switch "הקול של רובו־דע" (core/journey.js voiceOn) turns the sound off.
import { voiceOn, playMode } from '../core/journey.js';

// a line ends by itself after its length and this much more, even when its 'ended' never comes (sounds switched off:
// the audio context is suspended and its clock stands still)
const END_MARGIN_MS = 400;

// A second voice (קוּבִּי, 1.4.1) passes its own library: createVoice(audio, { load: () => import(...) })
export function createVoice(audio, { load = null } = {}) {
  let data = null, cur = null, analyser = null, buf = null;
  let gen = 0;   // every say() and stop() starts a new generation: a line still loading when a newer one comes is dropped
  const cache = new Map();
  const ctx = () => (audio && audio.ready ? audio.context : null);
  const lib = () => (data = data || (load ? load() : import('../data/voice.js').then((m) => m.VOICE || {})).then((x) => x || {}, () => ({})));
  async function decode(id) {
    if (cache.has(id)) return cache.get(id);
    const ac = ctx(); if (!ac) return null;
    const V = await lib(); const P = V[id]; if (!P) return null;
    const ab = await fetch(P.src || P).then((r) => r.arrayBuffer());
    const b = await new Promise((res, rej) => { const p = ac.decodeAudioData(ab, res, rej); if (p && p.catch) p.catch(rej); });
    if (cache.size > 24) cache.delete(cache.keys().next().value);
    cache.set(id, b); return b;
  }
  // the line playing now ends: stopped (a skip, a close, a newer line) or played to its end
  function end(c, played) {
    if (!c || cur !== c) return;
    cur = null; clearTimeout(c.timer);
    try { c.src.onended = null; if (!played) c.src.stop(); } catch (e) { }
    try { c.src.disconnect(); } catch (e) { }
    try { audio.duckMusic && audio.duckMusic(false); } catch (e) { }
    c.done(played);
  }
  function stop() { gen++; end(cur, false); }
  async function say(id) {
    stop(); const my = gen;
    if (!id || !voiceOn() || (audio && audio.muted)) return false;
    try { audio.start && audio.start(); } catch (e) { }
    const ac = ctx(); const out = audio && audio.voiceOut && audio.voiceOut(); if (!ac || !out) return false;
    // beginners hear their own words (<id>.k) when they differ from the others'
    const V = await lib(); if (my !== gen) return false;
    if (playMode() === 'kids' && V[id + '.k']) id = id + '.k';
    let b; try { b = await decode(id); } catch (e) { return false; }
    if (!b || my !== gen) return false;   // a newer line, a skip or a close came while this one was loading
    return new Promise((done) => {
      const src = ac.createBufferSource(); src.buffer = b;
      if (!analyser) { analyser = ac.createAnalyser(); analyser.fftSize = 512; buf = new Uint8Array(analyser.fftSize); }
      src.connect(out); src.connect(analyser);
      const me = { src, done, timer: 0 }; cur = me;
      src.onended = () => end(me, true);
      // a suspended context never sends 'ended': the line is over after its length anyway (and never plays later)
      me.timer = setTimeout(() => { if (cur === me) { try { src.stop(); } catch (e) { } end(me, ac.state === 'running'); } }, b.duration * 1000 + END_MARGIN_MS);
      try { audio.duckMusic && audio.duckMusic(true); } catch (e) { }
      src.start();
    });
  }
  function level() {
    if (!cur || !analyser) return 0;
    analyser.getByteTimeDomainData(buf); let s = 0;
    for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; s += v * v; }
    return Math.min(1, Math.sqrt(s / buf.length) * 5);
  }
  const has = (id) => lib().then((V) => !!V[id]);
  return { say, stop, level, has, get speaking() { return !!cur; } };
}
