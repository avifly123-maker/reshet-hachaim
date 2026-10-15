// Offline numeric test for src/audio/audio.js.
// node build.mjs tests/audio-test.js scratch/audio.html --dev && python3 tools/shot.py scratch/audio.html scratch/audio.png 40
import { createAudio } from '../src/audio/audio.js';

const SR = 44100;
const out = [];
let fails = 0; const failList = [];
const log = (s) => { out.push(s); console.log(s); };
const db = (x) => (x > 0 ? (20 * Math.log10(x)).toFixed(1) : '-inf');

function stats(buf, from = 0) {
  let peak = 0, ss = 0, n = 0, nan = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = Math.floor(from * SR); i < d.length; i++) {
      const v = d[i];
      if (!Number.isFinite(v)) { nan++; continue; }
      const a = Math.abs(v); if (a > peak) peak = a; ss += v * v; n++;
    }
  }
  return { peak, rms: Math.sqrt(ss / Math.max(1, n)), nan };
}
// RMS per 1s window → variation (to see that calls happen)
function windows(buf, from) {
  const d = buf.getChannelData(0), r = [];
  for (let s = from; s + 1 <= buf.duration; s++) {
    let ss = 0; for (let i = s * SR; i < (s + 1) * SR; i++) ss += d[i] * d[i];
    r.push(Math.sqrt(ss / SR));
  }
  return r;
}

async function renderOneShot(name, opts) {
  const ctx = new OfflineAudioContext(2, SR * 5, SR);
  const a = createAudio({ context: ctx });
  a.start();
  a.play(name, opts);
  const dbg = a._debug();
  const buf = await ctx.startRendering();
  return { buf, voices: dbg.active.sfx, after: a._debug().active.sfx };
}

async function renderAmbience(biome, state, seconds = 20, extra) {
  const ctx = new OfflineAudioContext(2, SR * seconds, SR);
  const a = createAudio({ context: ctx });
  a.start();
  a.setBiome(biome);
  const step = 1 / 30;
  let maxAmb = 0;
  for (let t = step; t < seconds - 0.05; t += step) {
    ctx.suspend(Math.round(t * SR / 128) * 128 / SR).then(() => {
      a.update(state);
      if (extra) extra(a, ctx.currentTime);
      maxAmb = Math.max(maxAmb, a._debug().active.amb);
      ctx.resume();
    });
  }
  a.update(state);
  const buf = await ctx.startRendering();
  return { buf, maxAmb, end: a._debug().active };
}

async function bandRms(buf, type, f, Q = 1) {
  const ctx = new OfflineAudioContext(1, buf.length, SR);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const bq = ctx.createBiquadFilter(); bq.type = type; bq.frequency.value = f; bq.Q.value = Q;
  src.connect(bq); bq.connect(ctx.destination); src.start();
  return stats(await ctx.startRendering(), 4).rms;
}
const bandCache = {};
function check(cond, msg) { if (!cond) { fails++; failList.push(msg); log('  FAIL: ' + msg); } }

const base = { dayFrac: 0.45, season: null, rain: 0, wind: 0.2, vitality: 0.8, cameraHeight: 50, fire: 0, speed: 1 };
const AMB_STATES = [
  ['amazon', 'day', { ...base }],
  ['amazon', 'dawn', { ...base, dayFrac: 0.27 }],
  ['amazon', 'night', { ...base, dayFrac: 0.02 }],
  ['amazon', 'rain', { ...base, rain: 1, wind: 0.6 }],
  ['amazon', 'lowVitality', { ...base, vitality: 0.05 }],
  ['amazon', 'highCam', { ...base, cameraHeight: 160 }],
  ['amazon', 'paused', { ...base, speed: 0 }],
  ['amazon', 'fire', { ...base, fire: 1 }],
  ['amazon', 'storm+fire+wind', { ...base, rain: 1, wind: 1, fire: 1, cameraHeight: 200 }],
  ['grove', 'spring', { ...base, season: 'spring' }],
  ['grove', 'summer', { ...base, season: 'summer', dayFrac: 0.55 }],
  ['grove', 'autumn', { ...base, season: 'autumn' }],
  ['grove', 'winterRain', { ...base, season: 'winter', rain: 0.8, wind: 0.6 }],
  ['grove', 'night', { ...base, season: 'summer', dayFrac: 0.95 }],
  ['grove', 'winterNight', { ...base, season: 'winter', dayFrac: 0.05 }],
  ['grove', 'lowVitality', { ...base, season: 'spring', vitality: 0.05 }],
  ['grove', 'fire', { ...base, season: 'summer', fire: 1, wind: 0.7 }],
  [null, 'noBiome', { ...base }],
];

async function main() {
  log('=== AUDIO TEST ===');
  // 0. API surface + no-context no-op
  const dummy = createAudio();
  for (const k of ['start', 'setBiome', 'update', 'play', 'setMuted', 'setVolume']) check(typeof dummy[k] === 'function', 'missing ' + k);
  dummy.play('click'); dummy.update(base); dummy.setBiome('grove'); dummy.setMuted(true); check(dummy.muted === true, 'muted getter');

  log('--- one-shots (peak dBFS / rms dBFS / dur) ---');
  for (const name of dummy.sounds) {
    const { buf, voices } = await renderOneShot(name, { pan: 0.3 });
    const s = stats(buf);
    const d = buf.getChannelData(0); let last = 0; for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > 1e-3) last = i;
    log(`${name.padEnd(10)} peak ${db(s.peak).padStart(6)}  rms ${db(s.rms).padStart(6)}  dur ${(last / SR).toFixed(2)}s`);
    check(s.nan === 0, name + ' NaN');
    check(s.peak < 0.95, name + ' clipping');
    check(s.peak > (name === 'hover' ? 0.02 : 0.03), name + ' inaudible');
    check(voices === 1, name + ' voice not created');
  }
  // spam test: 100 hovers + 50 places at once must not exceed limits / clip
  {
    const ctx = new OfflineAudioContext(2, SR * 3, SR);
    const a = createAudio({ context: ctx }); a.start();
    for (let i = 0; i < 50; i++) { a.play('place'); a.play('mission'); a.play('discover'); }
    const n = a._debug().active.sfx;
    const s = stats(await ctx.startRendering());
    log(`spam: voices ${n}, peak ${db(s.peak)}  rms ${db(s.rms)}`);
    check(n <= 14, 'voice cap'); check(s.peak < 0.95, 'spam clipping');
  }
  // cleanup test: voices released after render (onended fires)
  {
    const ctx = new OfflineAudioContext(2, SR * 6, SR);
    const a = createAudio({ context: ctx }); a.start();
    ['click', 'thunder', 'mission', 'dawn'].forEach((n) => a.play(n));
    await ctx.startRendering();
    await new Promise((r) => setTimeout(r, 200));
    log('after render active voices: ' + JSON.stringify(a._debug().active));
    check(a._debug().active.sfx === 0, 'voices not released');
  }

  log('--- ambience 20s (rms/peak dBFS over 4..20s, maxAmbVoices, 1s window rms range) ---');
  for (const [biome, label, st] of AMB_STATES) {
    const { buf, maxAmb } = await renderAmbience(biome, st);
    const s = stats(buf, 4);
    const w = windows(buf, 4); const mn = Math.min(...w), mx = Math.max(...w);
    if (biome) bandCache[biome + ':' + label] = {
      cic: await bandRms(buf, 'bandpass', 5300, 5), bee: await bandRms(buf, 'bandpass', 400, 1.5),
      cri: await bandRms(buf, 'bandpass', 4400, 8), crk: await bandRms(buf, 'highpass', 7000, 0.7), low: await bandRms(buf, 'lowpass', 200, 0.7) };
    log(`${String(biome).padEnd(6)} ${label.padEnd(16)} rms ${db(s.rms).padStart(6)}  peak ${db(s.peak).padStart(6)}  voices≤${maxAmb}  win ${db(mn)}..${db(mx)}`);
    check(s.nan === 0, label + ' NaN');
    check(s.peak < 0.95, label + ' clipping');
    if (biome) {
      check(s.rms > 0.004, `${biome} ${label} too quiet`);
      check(s.rms < 0.12, `${biome} ${label} too loud`);
    } else check(s.rms < 0.001, 'no-biome should be silent');
  }

  const B = bandCache, rel = (a, b, k) => db(B[a][k] / B[b][k]);
  log(`band check: grove cicada summer/spring ${rel('grove:summer', 'grove:spring', 'cic')} dB; bees spring/autumn ${rel('grove:spring', 'grove:autumn', 'bee')} dB; ` +
      `amazon crickets night/day ${rel('amazon:night', 'amazon:day', 'cri')} dB; grove crickets night/day ${rel('grove:night', 'grove:summer', 'cri')} dB; ` +
      `crackle fire/summer(grove) ${rel('grove:fire', 'grove:summer', 'crk')} dB; highCam low-wind/ground ${rel('amazon:highCam', 'amazon:day', 'low')} dB; ` +
      `highCam insects ${rel('amazon:highCam', 'amazon:day', 'cic')} dB; lowVit/day ${rel('amazon:lowVitality', 'amazon:day', 'cic')} dB`);
  check(B['grove:summer'].cic > 2 * B['grove:spring'].cic, 'cicadas not dominant in summer');
  check(B['grove:spring'].bee > 1.2 * B['grove:autumn'].bee, 'bees not present in spring');
  check(B['amazon:highCam'].low > B['amazon:day'].low, 'high camera should have more wind');

  // biome crossfade + mute + full SFX over ambience
  {
    const fired = {};
    const { buf, end } = await renderAmbience('amazon', base, 16, (a, t) => {
      const once = (k, at, fn) => { if (t >= at && !fired[k]) { fired[k] = 1; fn(); } };
      once('b', 5, () => a.setBiome('grove'));
      once('m', 6, () => a.play('mission'));
      once('t', 7, () => a.play('thunder'));
      once('u', 11, () => a.setMuted(true));
    });
    const pre = stats({ numberOfChannels: 1, getChannelData: () => buf.getChannelData(0).subarray(0, 11 * SR) });
    const post = stats({ numberOfChannels: 1, getChannelData: () => buf.getChannelData(0).subarray(12 * SR) });
    log(`crossfade+sfx+mute: peak ${db(pre.peak)}, after mute rms ${db(post.rms)}, active ${JSON.stringify(end)}`);
    check(pre.peak < 0.95, 'crossfade clipping'); check(post.rms < 1e-4, 'mute not silent');
  }

  log(fails ? `RESULT: ${fails} FAILURES: ${failList.join('; ')}` : 'RESULT: ALL PASS');
  document.body.innerHTML = '<pre style="color:#fff;font:12px monospace;direction:ltr;text-align:left">' + out.join('\n') + '</pre>';
}
main().catch((e) => { console.error('test crashed', e && e.stack || e); });
