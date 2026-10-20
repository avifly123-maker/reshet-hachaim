// Background music: one soft piece on the start screen, another in the lab of רובו־דע; none in the forests (they have
// their own sounds), the learning hub, the card games or the mysteries (Avi, 19.10).
//
//   const music = createMusic(audio);
//   music.want('start' | 'lab' | null);   // every frame: what the screen on top would like (cheap when unchanged)
//   music.setEnabled(b); music.enabled
//
// The pieces were composed for the game (tools/music/compose.py) and live in src/data/music.js, an asset module that is
// imported only when music first plays (a file per piece in the desktop build). A piece is decoded when it is about to
// play and played by one looping AudioBufferSourceNode (loopStart..loopEnd: seamless); on the way out it fades, stops
// and is let go, and the decoded sound is dropped a little later, so nothing is held while a forest is open.
// The sound goes through audio.musicOut() → the master gain, so the "צלילים" switch (mute) silences it too.

const KEY = 'web-of-life-music';   // 'off' when the child turned the music off; a new key, no old data changes
const LEVEL = 1;
const FADE_IN = 3, CROSS = 2.5, FADE_OUT = 1.6;
const FORGET_AFTER = 25000;        // ms of silence before the decoded music is released

export function readMusicPref() { try { return localStorage.getItem(KEY) !== 'off'; } catch (e) { return true; } }

export function createMusic(audio) {
  let enabled = readMusicPref();
  let wantId = null, wantSince = 0;   // the screen's wish, and since when (short gaps between screens are ignored)
  let target = null;                  // the piece applied (or loading)
  let cur = null;                     // { id, src, gain }
  let tok = 0, data = null, forgetT = null;
  const bufs = new Map();             // id → decoded AudioBuffer (only around the playing piece)
  const failed = new Set();

  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const ctx = () => (audio && audio.ready ? audio.context : null);

  function load(id) {
    if (bufs.has(id)) return Promise.resolve(bufs.get(id));
    const ac = ctx(); if (!ac) return Promise.resolve(null);
    data = data || import('../data/music.js').then((m) => m.MUSIC);
    return data.then((M) => {
      const P = M && M[id]; if (!P) throw new Error('no music ' + id);
      return fetch(P.src).then((r) => r.arrayBuffer()).then((ab) => new Promise((res, rej) => {
        const p = ac.decodeAudioData(ab, res, rej); if (p && p.catch) p.catch(rej);
      })).then((buf) => { buf.__loop = [P.loopStart, P.loopEnd]; bufs.set(id, buf); return buf; });
    });
  }

  function stop(node, fade) {
    const ac = ctx(); if (!node || !ac) return;
    try {
      const t = ac.currentTime, g = node.gain.gain;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0, t + fade);
      node.src.stop(t + fade + 0.05);
      node.src.onended = () => { try { node.src.disconnect(); node.gain.disconnect(); } catch (e) { /* gone */ } };   // nothing holds the decoded sound after this
    } catch (e) { /* never let music break the game */ }
  }

  function apply(id) {
    target = id;
    const t = ++tok;
    const old = cur; cur = null;
    if (old) stop(old, id ? CROSS : FADE_OUT);
    clearTimeout(forgetT);
    if (!id) { forgetT = setTimeout(() => { if (!target) bufs.clear(); }, FORGET_AFTER); return; }
    load(id).then((buf) => {
      if (t !== tok || !buf) return;
      const ac = ctx(), out = audio.musicOut && audio.musicOut(); if (!ac || !out) return;
      const src = ac.createBufferSource(), gain = ac.createGain();
      src.buffer = buf; src.loop = true; src.loopStart = buf.__loop[0]; src.loopEnd = Math.min(buf.__loop[1], buf.duration);
      gain.gain.value = 0; src.connect(gain); gain.connect(out);
      const t0 = ac.currentTime;
      gain.gain.setValueAtTime(0, t0); gain.gain.linearRampToValueAtTime(LEVEL, t0 + (old ? CROSS : FADE_IN));
      src.start(t0, buf.__loop[0]);
      cur = { id, src, gain };
      for (const k of [...bufs.keys()]) if (k !== id) bufs.delete(k);   // the other piece's sound is not kept (its fade holds its own reference)
    }).catch((e) => { failed.add(id); if (t === tok) target = null; console.warn('[music]', id, e); });
  }

  function want(id) {
    id = id || null;
    if (id !== wantId) { wantId = id; wantSince = now(); }
    const goal = enabled && !failed.has(wantId) ? wantId : null;
    if (goal === target) return;
    if (goal && !(ctx() && ctx().state === 'running')) return;   // waits for the first click or key (autoplay rules), or for "צלילים" back on
    if (now() - wantSince < (goal ? 60 : 350)) return;          // a screen that is only passing by changes nothing
    apply(goal);
  }

  function setEnabled(b) {
    enabled = !!b;
    try { localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch (e) { /* private mode */ }
    wantSince = 0; want(wantId);
  }

  return {
    want, setEnabled,
    get enabled() { return enabled; },
    get playing() { return cur ? cur.id : null; },
    _debug: () => ({ wantId, target, playing: cur && cur.id, decoded: [...bufs.keys()], failed: [...failed], gain: cur ? cur.gain.gain.value : 0 }),
  };
}
