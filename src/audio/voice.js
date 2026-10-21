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
import { voiceOn } from '../core/journey.js';

export function createVoice(audio) {
  let data = null, cur = null, analyser = null, buf = null;
  const cache = new Map();
  const ctx = () => (audio && audio.ready ? audio.context : null);
  const lib = () => (data = data || import('../data/voice.js').then((m) => m.VOICE || {}, () => ({}))); 
  async function decode(id) {
    if (cache.has(id)) return cache.get(id);
    const ac = ctx(); if (!ac) return null;
    const V = await lib(); const P = V[id]; if (!P) return null;
    const ab = await fetch(P.src || P).then((r) => r.arrayBuffer());
    const b = await new Promise((res, rej) => { const p = ac.decodeAudioData(ab, res, rej); if (p && p.catch) p.catch(rej); });
    if (cache.size > 24) cache.delete(cache.keys().next().value);
    cache.set(id, b); return b;
  }
  function stop() {
    if (!cur) return;
    const c = cur; cur = null;
    try { c.src.onended = null; c.src.stop(); } catch (e) { }
    try { c.src.disconnect(); } catch (e) { }
    try { audio.duckMusic && audio.duckMusic(false); } catch (e) { }
    c.done(false);
  }
  async function say(id) {
    stop();
    if (!id || !voiceOn()) return false;
    try { audio.start && audio.start(); } catch (e) { }
    const ac = ctx(); const out = audio && audio.voiceOut && audio.voiceOut(); if (!ac || !out) return false;
    let b; try { b = await decode(id); } catch (e) { return false; }
    if (!b) return false;
    return new Promise((done) => {
      const src = ac.createBufferSource(); src.buffer = b;
      if (!analyser) { analyser = ac.createAnalyser(); analyser.fftSize = 512; buf = new Uint8Array(analyser.fftSize); }
      src.connect(out); src.connect(analyser);
      const me = { src, done }; cur = me;
      src.onended = () => { if (cur === me) { cur = null; try { src.disconnect(); } catch (e) { } try { audio.duckMusic && audio.duckMusic(false); } catch (e) { } done(true); } };
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
