#!/usr/bin/env python3
"""Background music of רשת החיים: two original pieces, composed and rendered here (no samples, no recordings).

    python3 tools/music/compose.py              # renders both: art/music/{start,lab}.ogg (+ .wav previews in /tmp)
    python3 tools/music/compose.py start        # only one
    python3 tools/music/compose.py --mp3 DIR    # also writes DIR/start.mp3 and DIR/lab.mp3 (one loop, for listening)

  start  "בוקר ביער"          D major, 72 BPM, 4/4, 32 bars (~107 s): harp arpeggios, warm pad, soft bass,
                               a flute melody, celesta glints. Form: A (texture) B (flute) C (celesta + flute) D (return).
  lab    "המעבדה של רובו־דע"  F major with a lydian B natural, 96 BPM, 4/4, 40 bars (100 s): marimba ostinato,
                               pizzicato bass, celesta and a woody flute, pizz/marimba dialogue, a very soft shaker.
                               Form: intro, A (celesta), A' (flute), B (dialogue), A'' (both), bridge.

Everything is synthesised with numpy: additive partials with their own decays (harp, celesta, marimba, pizzicato),
wavetable voices (pad, flute, bass), band-passed noise (breath, shaker), and a synthetic stereo hall.

Seamless loop: the piece is rendered on a circular timeline – a note (or the hall's tail) that runs past the end of
the loop continues at its start, and the reverb is a circular convolution – so the end flows into the beginning
exactly. The encoded file holds one extra second on each side (the loop's own end before it, its start after it);
the game plays it with AudioBufferSourceNode.loopStart / loopEnd = PAD .. PAD + loop, so the codec's edges are never
heard. Loudness is set to TARGET_LUFS (quieter than the sound effects), measured with ffmpeg's ebur128 filter.
"""
import json
import math
import os
import re
import subprocess
import sys
import tempfile

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 44100
PAD = 1.0                 # seconds of wrapped audio on each side of the loop in the encoded file
TARGET_LUFS = -20.0
OPUS_KBPS = 56
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'art', 'music')

# ───────────────────────────────────────────────────────────── notes and chords
PC = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
      'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}


def midi(name):
    m = re.fullmatch(r'([A-G][#b]?)(-?\d)', name)
    return 12 * (int(m.group(2)) + 1) + PC[m.group(1)]


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


QUAL = {'': [0, 4, 7], 'm': [0, 3, 7], '7': [0, 4, 7, 10], 'm7': [0, 3, 7, 10], 'maj7': [0, 4, 7, 11],
        'sus4': [0, 5, 7], '7sus4': [0, 5, 7, 10], '6': [0, 4, 7, 9], 'm9': [0, 3, 7, 10, 14],
        'add9': [0, 4, 7, 14], 'madd9': [0, 3, 7, 14], 'maj9': [0, 4, 7, 11, 14], 'sus2': [0, 2, 7]}


def chord(sym):
    """'D/F#' → (bass pitch class, [chord pitch classes], root pitch class)"""
    m = re.fullmatch(r'([A-G][#b]?)([a-z0-9]*)(?:/([A-G][#b]?))?', sym)
    root = PC[m.group(1)]
    tones = [(root + i) % 12 for i in QUAL[m.group(2)]]
    bass = PC[m.group(3)] if m.group(3) else root
    return bass, tones, root


def near(pc, lo, hi, centre):
    """the octave of pitch class pc inside [lo, hi] closest to centre"""
    best = None
    for m in range(lo, hi + 1):
        if m % 12 == pc and (best is None or abs(m - centre) < abs(best - centre)):
            best = m
    return best


def melody(text):
    """'A4:1.5 D5:.5 r:1 F#5:1' → [(beat, midi or None, dur)]"""
    out, t = [], 0.0
    for tok in text.split():
        n, d = tok.split(':')
        d = float(d)
        out.append((t, None if n == 'r' else midi(n), d))
        t += d
    return out


# ───────────────────────────────────────────────────────────── circular timeline
class Track:
    def __init__(self, seconds):
        self.n = int(round(seconds * SR))
        self.L = np.zeros(self.n)
        self.R = np.zeros(self.n)

    def add(self, t, sig, pan=0.0, width=0.0):
        """mono sig at t seconds, constant-power pan (-1 left .. 1 right); wraps round the loop"""
        a = (pan + 1) * math.pi / 4
        gl, gr = math.cos(a), math.sin(a)
        self._add(t, sig * gl, sig * gr)

    def add2(self, t, l, r):
        self._add(t, l, r)

    def _add(self, t, l, r):
        i = int(round(t * SR)) % self.n
        k = 0
        while k < len(l):
            m = min(len(l) - k, self.n - i)
            self.L[i:i + m] += l[k:k + m]
            self.R[i:i + m] += r[k:k + m]
            k += m
            i = 0


def env_adsr(n, a, r, hold=None):
    """attack a s, sustain to hold s, release r s (raised-cosine edges)"""
    e = np.ones(n)
    na = max(1, int(a * SR))
    e[:na] = 0.5 - 0.5 * np.cos(np.linspace(0, math.pi, na))
    if hold is not None:
        h = int(hold * SR)
        nr = max(1, int(r * SR))
        if h < n:
            seg = min(nr, n - h)
            e[h:h + seg] *= 0.5 + 0.5 * np.cos(np.linspace(0, math.pi * seg / nr, seg))
            e[h + seg:] = 0
    return e


RNG = np.random.default_rng(7)


# ───────────────────────────────────────────────────────────── instruments
def struck(f, partials, vel=1.0, attack=0.002, length=None, bright=1.0):
    """additive struck / plucked tone: partials = [(ratio, amp, decay s)]"""
    taus = [p[2] for p in partials]
    dur = length or min(9.0, 5.0 * max(taus))
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for ratio, amp, tau in partials:
        fr = f * ratio
        if fr > 15000:
            continue
        ph = RNG.uniform(0, 2 * math.pi) if ratio > 1.01 else 0.0
        out += amp * (bright if ratio > 1.5 else 1.0) * np.sin(2 * math.pi * fr * t + ph) * np.exp(-t / tau)
    out *= env_adsr(n, attack, 0.05, hold=None)
    if length:   # damped at the end of a short note (pizzicato)
        nr = int(0.06 * SR)
        out[-nr:] *= np.linspace(1, 0, nr) ** 2
    return out * vel


def harp(f, vel=1.0):
    # plucked string: harmonics from a pluck near one end, upper ones decaying faster; low strings ring longer
    t1 = 2.6 * (196.0 / f) ** 0.4
    parts = []
    p = 0.13
    for k in range(1, 18):
        fr = k * f * math.sqrt(1 + 0.00012 * k * k)
        if fr > 9000:
            break
        amp = abs(math.sin(math.pi * k * p)) / k ** 1.0
        parts.append((fr / f, amp, t1 / (1 + 0.55 * (k - 1) ** 1.15)))
    s = struck(f, parts, vel, attack=0.004)[:int(6.5 * SR)]
    nf = int(0.5 * SR)
    if len(s) > nf:
        s[-nf:] *= np.linspace(1, 0, nf)
    return s * 0.55


def pizz(f, vel=1.0, dur=0.35):
    t1 = 0.55 * (196.0 / f) ** 0.4
    parts = []
    for k in range(1, 12):
        if k * f > 7000:
            break
        amp = abs(math.sin(math.pi * k * 0.2)) / k ** 1.3
        parts.append((k * math.sqrt(1 + 0.0001 * k * k), amp, t1 / (1 + 0.8 * (k - 1))))
    return struck(f, parts, vel, attack=0.003, length=max(dur, 0.18) + 0.25) * 0.6


def celesta(f, vel=1.0):
    t1 = 1.9 * (523.0 / f) ** 0.3
    parts = [(1.0, 1.0, t1), (2.0, 0.14, t1 * 0.35), (3.01, 0.07, 0.3), (4.17, 0.10, 0.14), (5.43, 0.05, 0.06), (8.9, 0.02, 0.025)]
    return struck(f, parts, vel, attack=0.0015) * 0.42


def marimba(f, vel=1.0):
    t1 = 0.85 * (330.0 / f) ** 0.55
    parts = [(1.0, 1.0, t1), (3.94, 0.30 * vel, 0.16 * (330 / f) ** 0.3), (9.9, 0.06, 0.035)]
    s = struck(f, parts, vel, attack=0.0018)
    # the soft mallet: a few ms of low noise
    nm = int(0.006 * SR)
    thump = RNG.standard_normal(nm) * np.hanning(nm) * 0.05 * vel
    s[:nm] += sosfilt(butter(2, min(2.5 * f, 3000), 'low', fs=SR, output='sos'), thump)
    return s * 0.5


def table(harm):
    """one period of a wave from [(harmonic, amp)] → 4096 samples"""
    N = 4096
    x = np.arange(N) / N
    w = np.zeros(N)
    for k, a in harm:
        w += a * np.sin(2 * math.pi * k * x + (0 if k == 1 else 0.7 * k))
    return w / np.max(np.abs(w))


def osc(tab, freq_curve):
    """wavetable oscillator following a per-sample frequency curve (linear interpolation)"""
    N = len(tab)
    ph = (np.cumsum(freq_curve) / SR + RNG.uniform()) % 1.0
    idx = ph * N
    i0 = idx.astype(int)
    fr = idx - i0
    return tab[i0] * (1 - fr) + tab[(i0 + 1) % N] * fr


def pad_note(f, dur, vel=1.0, att=1.4, rel=2.2, bright=1.0):
    """warm pad: three slightly detuned soft-saw voices, slow breathing; returns (left, right)"""
    kmax = max(1, int(min(3200.0 * bright, 12000) / f))
    harm = [(k, (1.0 / k) * math.exp(-k * f / (900.0 * bright))) for k in range(1, kmax + 1)]
    tab = table(harm)
    n = int((dur + rel) * SR)
    t = np.arange(n) / SR
    env = env_adsr(n, att, rel, hold=dur) * (1 + 0.08 * np.sin(2 * math.pi * 0.17 * t + RNG.uniform(0, 6)))
    voices = []
    for cents in (-7.0, 0.0, 6.0):
        drift = 1 + (cents + 1.5 * np.sin(2 * math.pi * 0.23 * t + RNG.uniform(0, 6))) / 1731.0
        voices.append(osc(tab, f * drift))
    l = (voices[0] * 0.8 + voices[1] * 0.55 + voices[2] * 0.25) * env * vel
    r = (voices[2] * 0.8 + voices[1] * 0.55 + voices[0] * 0.25) * env * vel
    return l * 0.11, r * 0.11


_BREATH = {}


def breath_noise(n, f):
    key = int(f)
    sos = _BREATH.get(key)
    if sos is None:
        lo, hi = max(200, f * 0.8), min(9000, f * 4.5)
        sos = _BREATH[key] = butter(2, [lo, hi], 'band', fs=SR, output='sos')
    return sosfilt(sos, RNG.standard_normal(n))


def wind(f, dur, vel=1.0, harm=((1, 1.0), (2, 0.32), (3, 0.11), (4, 0.04)), breath=0.05, vib=9.0):
    """flute-like voice: soft harmonics, delayed vibrato, a little breath (more at the start of the note)"""
    tab = table(list(harm))
    rel = 0.18
    n = int((dur + rel) * SR)
    t = np.arange(n) / SR
    vdepth = vib * np.clip((t - 0.28) / 0.5, 0, 1)
    fc = f * (1 + (vdepth * np.sin(2 * math.pi * 5.1 * t + RNG.uniform(0, 6))) / 1731.0)
    env = env_adsr(n, 0.07, rel, hold=dur)
    swell = 1 + 0.12 * np.clip(t / max(dur, 0.2), 0, 1) - 0.12 * np.clip((t - dur * 0.7) / max(dur * 0.3, 0.05), 0, 1)
    tone = osc(tab, fc) * env * swell
    chiff = np.exp(-t / 0.06)
    b = breath_noise(n, f) * env * (breath + 0.10 * chiff)
    return (tone + b * 0.6) * vel * 0.20


def bass(f, dur, vel=1.0, pl=False):
    tab = table([(1, 1.0), (2, 0.28), (3, 0.08)])
    rel = 0.25 if not pl else 0.08
    n = int((dur + rel) * SR)
    t = np.arange(n) / SR
    env = env_adsr(n, 0.012 if pl else 0.05, rel, hold=dur) * (np.exp(-t / (0.45 if pl else 2.4)) * 0.75 + 0.25)
    return osc(tab, np.full(n, f)) * env * vel * 0.30


def shaker(vel=1.0):
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    e = (1 - np.exp(-t / 0.008)) * np.exp(-t / 0.028)
    s = sosfilt(butter(2, [4500, 10000], 'band', fs=SR, output='sos'), RNG.standard_normal(n)) * e
    return s * vel * 0.05


# ───────────────────────────────────────────────────────────── the hall
def hall_ir(rt=2.6, length=4.0, pre=0.022, tone=0.6):
    """stereo synthetic hall: decorrelated noise, high frequencies dying faster, a few early reflections"""
    n = int(length * SR)
    t = np.arange(n) / SR
    out = []
    for ch in range(2):
        acc = np.zeros(n)
        for (lo, hi), k in (((None, 600), 1.15), ((600, 3500), 1.0), ((3500, None), 0.55)):
            noise = RNG.standard_normal(n)
            if lo is None:
                sos = butter(2, hi, 'low', fs=SR, output='sos')
            elif hi is None:
                sos = butter(2, lo, 'high', fs=SR, output='sos')
            else:
                sos = butter(2, [lo, hi], 'band', fs=SR, output='sos')
            band = sosfilt(sos, noise) * np.exp(-6.91 * t / (rt * k))
            acc += band * (tone if lo == 3500 else 1.0)
        acc *= np.clip(t / 0.06, 0, 1) ** 1.5           # the tail swells in after the early sound
        ip = int(pre * SR)
        acc = np.concatenate([np.zeros(ip), acc[:n - ip]])
        for d, g in ((0.011, 0.5), (0.019, 0.35), (0.027, 0.3), (0.041, 0.2)):
            j = int((d + 0.004 * ch) * SR)
            acc[j] += g * (1 if (int(d * 1000) + ch) % 2 else -1) * 3
        out.append(acc / np.sqrt(np.sum(acc ** 2)))
    return out


def circ_conv(x, h):
    n = len(x)
    H = np.fft.rfft(h, n)
    return np.fft.irfft(np.fft.rfft(x) * H, n)


def circ_filter(sos, x):
    """IIR filter on a looped signal: run over three copies, keep the middle one"""
    return sosfilt(sos, np.concatenate([x, x, x]))[len(x):2 * len(x)]


# ───────────────────────────────────────────────────────────── piece 1: the start screen
def piece_start():
    bpm = 72.0
    beat = 60.0 / bpm
    bars = 32
    T = Track(bars * 4 * beat)
    hum = lambda: RNG.normal(0, 0.006)

    # one chord per bar, or [(beat, chord), ...]
    prog = ['Dadd9', 'Bm7', 'Gmaj7', [(0, 'Asus4'), (2, 'A')], 'D/F#', 'Gmaj7', 'Em9', [(0, 'Asus4'), (2, 'A')],
            'Dadd9', 'Bm7', 'Gmaj7', 'A', 'F#m7', 'Bm7', 'Em7', [(0, 'A7sus4'), (2, 'A7')],
            'Gmaj7', 'A/G', 'F#m7', 'Bm7', 'Em7', 'A', 'D/F#', 'G6',
            'Bmadd9', 'Gmaj7', 'D/F#', 'Em7', 'Gmaj7', 'Asus4', 'Em7', [(0, 'Asus4'), (2, 'A')]]
    flute = {
        9: 'A4:1.5 D5:.5 E5:1 F#5:1', 10: 'A5:2 F#5:1 D5:1', 11: 'E5:1.5 D5:.5 B4:2', 12: 'C#5:1 E5:1 A4:2',
        13: 'A4:1.5 C#5:.5 E5:1 F#5:1', 14: 'A5:1 B5:2 A5:1', 15: 'G5:1.5 F#5:.5 E5:1 D5:1', 16: 'E5:2 C#5:1 E5:1',
        17: 'D5:3.5 r:.5',
        21: 'B4:2 D5:1 E5:1', 22: 'C#5:3 r:1', 23: 'F#5:2 E5:1 D5:1', 24: 'D5:3 r:1',
        27: 'A5:2 F#5:2', 28: 'G5:1 F#5:1 E5:2', 29: 'D5:3 B4:1', 30: 'D5:2 E5:1.5 r:.5',
    }
    cel = {
        3: 'r:2 B5:.5 D6:.5 F#6:1', 4: 'E6:2 r:2', 7: 'r:2 G5:.5 B5:.5 E6:1', 8: 'r:2 C#6:2',
        17: 'D6:1 B5:1 F#5:1 A5:1', 18: 'C#6:1.5 A5:.5 E5:2', 19: 'C#6:1 A5:1 E5:1 F#5:1', 20: 'D6:3 C#6:1',
        21: 'r:3 E6:1', 22: 'r:2 A5:.5 C#6:.5 E6:1', 24: 'r:2 B5:.5 D6:.5 G6:1',
        26: 'r:2 F#6:2', 31: 'r:2 B5:.5 D6:.5 E6:1', 32: 'r:2 C#6:2',
    }
    # harp patterns: indexes into the ascending chord list (0 = bass), eighth notes
    pat_full = [0, 2, 3, 4, 5, 4, 3, 2]
    pat_light = [0, None, 3, None, 4, None, 3, None]
    pat_high = [1, 3, 4, 5, 6, 5, 4, 3]
    for b in range(bars):
        bar_t = b * 4 * beat
        segs = prog[b] if isinstance(prog[b], list) else [(0, prog[b])]
        sec = b // 8   # 0 A, 1 B, 2 C, 3 D
        for si, (sb, sym) in enumerate(segs):
            eb = segs[si + 1][0] if si + 1 < len(segs) else 4
            bpc, tones, root = chord(sym)
            t0 = bar_t + sb * beat
            # pad: chord tones around middle C
            for pc in sorted(set(tones)):
                m = near(pc, 54, 67, 61)
                l, r = pad_note(hz(m), (eb - sb) * beat + 0.15, vel=0.7 if sec != 3 else 0.62, bright=1.2)
                T.add2(t0, l, r)
            # bass: the bar's bass note, a soft sustained low string
            bm = near(bpc, 38, 49, 43)
            T.add(t0 + hum(), bass(hz(bm), (eb - sb) * beat * 0.95, vel=0.55), pan=0.0)
            # the harp's ascending chord list
            asc = [near(bpc, 45, 56, 50)]
            cur = asc[0]
            while len(asc) < 9:
                cur += 1
                if cur % 12 in tones:
                    asc.append(cur)
            pat = pat_light if sec in (1,) else pat_high if sec == 2 else pat_full
            for e in range(int(sb * 2), int(eb * 2)):
                idx = pat[e % 8]
                if idx is None:
                    continue
                v = (0.95 if e % 4 == 0 else 0.7 if e % 2 == 0 else 0.55) * (0.85 if sec == 3 and b >= 28 else 1.0)
                T.add(bar_t + e * beat / 2 + hum(), harp(hz(asc[idx]), v), pan=-0.28 + 0.06 * (idx - 3))
        # melodies
        if (b + 1) in flute:
            for nb, m, d in melody(flute[b + 1]):
                if m is None:
                    continue
                T.add(bar_t + nb * beat + hum(), wind(hz(m), d * beat * 0.97, vel=0.9), pan=0.18)
        if (b + 1) in cel:
            for nb, m, d in melody(cel[b + 1]):
                if m is None:
                    continue
                T.add(bar_t + nb * beat + hum(), celesta(hz(m), 0.75), pan=0.38)
    return T, dict(rt=2.7, length=4.2, wet=0.30)


# ───────────────────────────────────────────────────────────── piece 2: the lab of רובו־דע
def piece_lab():
    bpm = 96.0
    beat = 60.0 / bpm
    bars = 40
    T = Track(bars * 4 * beat)
    hum = lambda: RNG.normal(0, 0.005)
    A = ['F', 'G/F', 'Am7', 'Dm7', 'Bbmaj7', 'C', 'Gm7', 'C7sus4']
    prog = (['F', 'G/F', 'F', 'G/F'] + A +
            ['F', 'G/F', 'Am7', 'Dm7', 'Bbmaj7', 'C/Bb', 'Am7', [(0, 'Gm7'), (2, 'C')]] +
            ['Bb', 'C', 'Dm', 'Dm/C', 'Bb', 'F/A', 'Gm7', 'C'] +
            A + ['F', 'G/F', 'Bbmaj7', 'Csus4'])
    celA = ['C5:.5 F5:.5 A5:1 G5:.5 r:.5 F5:1', 'D5:.5 G5:.5 B5:1.5 A5:.5 G5:1', 'E5:1 G5:.5 A5:.5 C6:1 r:1',
            'A5:1.5 F5:.5 D5:1 r:1', 'D5:.5 F5:.5 A5:.5 D6:1.5 C6:1', 'G5:1 E5:1 C5:.5 D5:.5 E5:1',
            'F5:1 D5:.5 Bb4:.5 G5:1.5 r:.5', 'F5:.5 G5:.5 Bb5:1 G5:2']
    fluA = ['A4:1 C5:.5 F5:1.5 E5:1', 'D5:1 B4:.5 D5:.5 G5:2', 'E5:.5 G5:.5 A5:1.5 G5:.5 E5:1', 'F5:2 D5:1 C5:1',
            'D5:1 F5:1 A5:1.5 G5:.5', 'G5:1.5 E5:.5 C5:2', 'C5:.5 E5:.5 G5:1 E5:1 A4:1', 'Bb4:1 D5:1 E5:2']
    dia = {21: ('pz', 'F5:.5 D5:.5 F5:.5 Bb5:.5 r:2'), 22: ('mb', 'G5:.5 E5:.5 G5:.5 C6:.5 r:2'),
           23: ('pz', 'A5:.5 F5:.5 A5:.5 D6:1 C6:.5 A5:1'), 24: ('mb', 'G5:1 F5:.5 E5:.5 F5:2'),
           25: ('pz', 'D5:.5 F5:.5 Bb5:.5 D6:.5 C6:1 Bb5:.5 A5:.5'), 26: ('mb', 'A5:1.5 F5:.5 C5:2'),
           27: ('pz', 'Bb5:.5 A5:.5 G5:.5 F5:.5 D5:1 F5:1'), 28: ('mb', 'E5:2 G5:1 r:1')}
    sparkle = {16: 'r:3 A5:.5 C6:.5', 20: 'r:3 G5:.5 C6:.5', 39: 'r:2 C6:.5 D6:.5 F6:1', 40: 'G6:2 r:2',
               4: 'r:2 B5:.5 D6:.5 G6:1'}
    ost_t = [0, 0.75, 1.5, 2, 2.75, 3.5]
    for b in range(bars):
        bar_t = b * 4 * beat
        n1 = b + 1
        segs = prog[b] if isinstance(prog[b], list) else [(0, prog[b])]
        part = 'intro' if n1 <= 4 else 'A' if n1 <= 12 else "A'" if n1 <= 20 else 'B' if n1 <= 28 else "A''" if n1 <= 36 else 'bridge'
        for si, (sb, sym) in enumerate(segs):
            eb = segs[si + 1][0] if si + 1 < len(segs) else 4
            bpc, tones, root = chord(sym)
            t0 = bar_t + sb * beat
            for pc in sorted(set(tones)):
                m = near(pc, 55, 67, 61)
                l, r = pad_note(hz(m), (eb - sb) * beat + 0.1, vel=0.42, att=0.9, rel=1.6, bright=0.8)
                T.add2(t0, l, r)
            # pizzicato bass: the root on the beat, an answer on the "and" of 3
            bm = near(bpc, 41, 52, 46)
            T.add(t0 + hum(), bass(hz(bm), 0.55 * beat, vel=0.95, pl=True))
            if eb - sb >= 4:
                fifth = near((bpc + 7) % 12, 41, 55, bm + 5) if part != 'B' else bm + 12
                T.add(bar_t + 2.5 * beat + hum(), bass(hz(fifth), 0.4 * beat, vel=0.7, pl=True))
            # marimba ostinato (3+3+2 feel), turning round every other bar
            voic = [near(bpc, 55, 66, 60)]
            cur = voic[0]
            while len(voic) < 5:
                cur += 1
                if cur % 12 in tones:
                    voic.append(cur)
            order = [0, 1, 2, 3, 2, 1] if b % 2 == 0 else [0, 2, 3, 4, 3, 1]
            quiet = part == 'B'
            for i, ot in enumerate(ost_t):
                if not (sb <= ot < eb):
                    continue
                v = (0.75 if i in (0, 3) else 0.5) * (0.7 if quiet else 1.0)
                T.add(bar_t + ot * beat + hum(), marimba(hz(voic[order[i]]), v), pan=-0.22)
        # melodies
        def play(text, inst, pan, vel):
            for nb, m, d in melody(text):
                if m is None:
                    continue
                t = bar_t + nb * beat + hum()
                if inst == 'cel':
                    T.add(t, celesta(hz(m), vel), pan=pan)
                elif inst in ('flu', 'flu8'):
                    m = m - 12 if inst == 'flu8' else m
                    T.add(t, wind(hz(m), d * beat * 0.92, vel=vel, harm=((1, 1.0), (2, 0.06), (3, 0.24), (4, 0.03), (5, 0.07)), breath=0.04, vib=7.0), pan=pan)
                elif inst == 'pz':
                    T.add(t, pizz(hz(m), vel, d * beat), pan=pan)
                elif inst == 'mb':
                    T.add(t, marimba(hz(m), vel), pan=pan)
        if part == 'A':
            play(celA[n1 - 5], 'cel', 0.25, 0.66)
        elif part == "A'":
            play(fluA[n1 - 13], 'flu', -0.08, 0.85)
        elif part == 'B':
            inst, txt = dia[n1]
            play(txt, inst, 0.32 if inst == 'pz' else -0.3, 0.85)
        elif part == "A''":
            play(celA[n1 - 29], 'cel', 0.25, 0.6)
            if n1 >= 33:
                play(celA[n1 - 29], 'flu8', -0.08, 0.55)   # the flute doubles the celesta an octave lower
        if n1 in sparkle:
            play(sparkle[n1], 'cel', 0.35, 0.6)
        # a very soft shaker on the eighths, only in the middle of the piece
        if part in ("A'", 'B', "A''"):
            for e in range(8):
                v = 0.55 if e % 2 else 0.3
                T.add(bar_t + e * beat / 2 + hum(), shaker(v), pan=0.42)
    return T, dict(rt=1.8, length=3.0, wet=0.24)


PIECES = {'start': piece_start, 'lab': piece_lab}


# ───────────────────────────────────────────────────────────── mix, measure, encode
def mixdown(T, rv):
    ir = hall_ir(rv['rt'], rv['length'])
    L, R = T.L, T.R
    hp = butter(2, 45, 'high', fs=SR, output='sos')
    L, R = circ_filter(hp, L), circ_filter(hp, R)
    wl, wr = circ_conv(L, ir[0]), circ_conv(R, ir[1])
    w = rv['wet']
    outL = L * (1 - w * 0.5) + wl * w
    outR = R * (1 - w * 0.5) + wr * w
    # a gentle high shelf down: softer, less "digital"
    lp = butter(1, 13000, 'low', fs=SR, output='sos')
    outL, outR = circ_filter(lp, outL), circ_filter(lp, outR)
    return np.stack([outL, outR], 1)


def ebur128(path):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       capture_output=True, text=True)
    s = r.stderr[r.stderr.rfind('Summary:'):]
    I = float(re.search(r'I:\s+(-?[\d.]+) LUFS', s).group(1))
    LRA = float(re.search(r'LRA:\s+(-?[\d.]+) LU', s).group(1))
    tp = re.search(r'Peak:\s+(-?[\d.]+|-inf) dBFS', s)
    return I, LRA, float(tp.group(1)) if tp else None


def write_wav(path, x):
    wavfile.write(path, SR, np.clip(x, -1, 1).astype(np.float32))


def render(name, mp3_dir=None):
    T, rv = PIECES[name]()
    x = mixdown(T, rv)
    loop_s = len(x) / SR
    tmp = tempfile.mkdtemp(prefix='music-')
    w1 = os.path.join(tmp, name + '.wav')
    write_wav(w1, x / max(1e-9, np.max(np.abs(x))) * 0.5)
    I, _, _ = ebur128(w1)
    x = x / max(1e-9, np.max(np.abs(x))) * 0.5 * 10 ** ((TARGET_LUFS - I) / 20)
    peak = float(np.max(np.abs(x)))
    write_wav(w1, x)
    I, LRA, tp = ebur128(w1)
    # the loop's seam: jump between the last and the first sample against the usual sample-to-sample step
    step = np.abs(np.diff(x, axis=0))
    seam = float(np.max(np.abs(x[0] - x[-1])))
    p = int(PAD * SR)
    padded = np.concatenate([x[-p:], x, x[:p]])
    w2 = os.path.join(tmp, name + '-padded.wav')
    write_wav(w2, padded)
    os.makedirs(OUT, exist_ok=True)
    ogg = os.path.join(OUT, name + '.ogg')
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', w2, '-c:a', 'libopus', '-b:a', f'{OPUS_KBPS}k',
                    '-vbr', 'on', '-application', 'audio', '-map_metadata', '-1', ogg], check=True)
    info = dict(name=name, loop=round(loop_s, 4), pad=PAD, lufs=I, lra=LRA, true_peak=tp, sample_peak_db=round(20 * math.log10(peak), 2),
                seam_jump=round(seam, 5), max_step=round(float(np.max(step)), 5), median_step=round(float(np.median(step)), 6),
                bytes=os.path.getsize(ogg))
    if mp3_dir:
        os.makedirs(mp3_dir, exist_ok=True)
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', w1, '-c:a', 'libmp3lame', '-b:a', '160k',
                        os.path.join(mp3_dir, name + '.mp3')], check=True)
    with open(os.path.join(OUT, name + '.json'), 'w') as f:
        json.dump(info, f, indent=1)
    print(json.dumps(info))
    return info


if __name__ == '__main__':
    args = sys.argv[1:]
    mp3 = None
    if '--mp3' in args:
        i = args.index('--mp3')
        mp3 = args[i + 1]
        del args[i:i + 2]
    for n in (args or list(PIECES)):
        RNG = np.random.default_rng(7 if n == 'start' else 11)
        render(n, mp3)
