#!/usr/bin/env python3
"""The music of the savanna's opening film (1.4.2): "בוקר בסוואנה", an original piece in an African style, made here
with the instruments of tools/music/compose.py plus three of its own (no samples, no recordings).

    python3 tools/music/savanna_film.py [--mp3 DIR]   # art/music/savanna.ogg + savanna.json, then tools/build-music.py

  G major pentatonic, 112 BPM, 4/4 felt in triplets (12/8), 12 bars (25.7 s) + 2.3 s of ring-out, played once (no loop).
  Instruments: kalimba (thumb piano: a sine with its inharmonic tine overtones and a small click), a hand drum in three
  strokes (bass: a low membrane with a falling pitch; tone; slap: a bright noise burst), a shaker on the triplets, a soft
  marimba bass and a warm pad. The form follows the film's shots (src/game/savanna/film.js SHOTS):
    bars 1-2   the island from above            kalimba alone, the pad, a shaker coming in
    bars 3-6   the zebras, the wildebeest cross  the drum's groove, bass, the kalimba tune
    bars 7-8   the elephants at the waterhole    the drum drops to its bass strokes, a slow kalimba answer
    bars 9-10  the hyenas and the lion           the full groove with slaps, a fill at the end of bar 10
    bars 11-12 back up over the island           the tune once more, the last chord rings
"""
import json, math, os, subprocess, sys, tempfile
import numpy as np
from scipy.signal import butter, sosfilt
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import compose as C
from compose import SR, Track, struck, marimba, shaker, pad_note, hz, midi, hall_ir, circ_filter, ebur128, write_wav

RNG = np.random.default_rng(23)
C.RNG = RNG
BPM = 112
BEAT = 60 / BPM
BAR = 4 * BEAT
TRIP = BEAT / 3
BARS = 12
TAIL = 2.3
TOTAL = BARS * BAR + TAIL


def kalimba(f, vel=1.0):
    # a metal tine: the fundamental rings, the overtones near 5.9 and 15.6 times it die quickly; a tiny click at the start
    t1 = 1.4 * (440.0 / f) ** 0.35
    s = struck(f, [(1.0, 1.0, t1), (2.0, 0.05, t1 * 0.3), (5.93, 0.22 * vel, 0.07), (15.6, 0.06, 0.02)], vel, attack=0.0012)
    nc = int(0.004 * SR)
    s[:nc] += sosfilt(butter(2, [2000, 6000], 'band', fs=SR, output='sos'), RNG.standard_normal(nc)) * np.hanning(nc) * 0.08 * vel
    return s * 0.42


def drum(kind, vel=1.0):
    # a hand drum: bass (the middle of the skin), tone (near the edge), slap (the fingers, bright)
    if kind == 'bass':
        n = int(0.55 * SR); t = np.arange(n) / SR
        f = 68 + 40 * np.exp(-t / 0.03)
        ph = 2 * math.pi * np.cumsum(f) / SR
        s = np.sin(ph) * np.exp(-t / 0.16) + 0.3 * np.sin(2 * ph) * np.exp(-t / 0.06)
        g = 0.9
    elif kind == 'tone':
        n = int(0.32 * SR); t = np.arange(n) / SR
        f = 330 * (1 + 0.04 * np.exp(-t / 0.02))
        ph = 2 * math.pi * np.cumsum(f) / SR
        s = np.sin(ph) * np.exp(-t / 0.08) + 0.35 * np.sin(1.59 * ph) * np.exp(-t / 0.05) + 0.2 * np.sin(2.14 * ph) * np.exp(-t / 0.03)
        g = 0.5
    else:   # slap
        n = int(0.16 * SR); t = np.arange(n) / SR
        noise = sosfilt(butter(2, [900, 5200], 'band', fs=SR, output='sos'), RNG.standard_normal(n))
        s = noise * np.exp(-t / 0.035) * 0.9 + np.sin(2 * math.pi * 420 * t) * np.exp(-t / 0.04) * 0.4
        g = 0.42
    a = int(0.0015 * SR); s[:a] *= np.linspace(0, 1, a)
    return s * vel * g


def piece():
    T = Track(TOTAL)
    hum = lambda: RNG.normal(0, 0.006)
    # the harmony: G, Em, C, D (one chord a bar), pentatonic tunes over it
    prog = ['G', 'Em', 'C', 'D', 'G', 'Em', 'C', 'D', 'Em', 'C', 'D', 'G']
    roots = {'G': 'G2', 'Em': 'E2', 'C': 'C2', 'D': 'D2'}
    pad_ch = {'G': ['G3', 'B3', 'D4'], 'Em': ['E3', 'G3', 'B3'], 'C': ['C3', 'E3', 'G3'], 'D': ['D3', 'F#3', 'A3']}
    # the kalimba tune in triplet steps: (bar, step 0..11, note)
    tune = {
        0: [(0, 'G4'), (3, 'B4'), (5, 'D5'), (6, 'E5'), (9, 'D5')],
        1: [(0, 'B4'), (3, 'A4'), (6, 'G4'), (8, 'E4'), (9, 'D4')],
        2: [(0, 'G4'), (2, 'A4'), (3, 'B4'), (6, 'D5'), (8, 'B4'), (9, 'A4')],
        3: [(0, 'B4'), (3, 'G4'), (5, 'E4'), (6, 'G4'), (9, 'A4'), (11, 'B4')],
        4: [(0, 'D5'), (2, 'E5'), (3, 'D5'), (6, 'B4'), (8, 'A4'), (9, 'G4')],
        5: [(0, 'E4'), (3, 'G4'), (6, 'A4'), (8, 'B4'), (9, 'D5'), (11, 'E5')],
        6: [(0, 'E5'), (6, 'D5')],
        7: [(0, 'B4'), (6, 'A4'), (9, 'F#4')],
        8: [(0, 'G4'), (2, 'B4'), (3, 'E5'), (5, 'D5'), (6, 'B4'), (9, 'G4'), (11, 'B4')],
        9: [(0, 'C5'), (2, 'B4'), (3, 'G4'), (6, 'A4'), (8, 'B4'), (9, 'D5')],
        10: [(0, 'D5'), (3, 'B4'), (5, 'A4'), (6, 'G4'), (9, 'B4'), (11, 'D5')],
        11: [(0, 'G5'), (0, 'D5'), (0, 'B4'), (0, 'G4')],
    }
    # an ostinato under the tune (kalimba, low): the triplet "1 . 3 4 . 6" pattern on the chord tones
    for b in range(BARS):
        t0 = b * BAR
        ch = prog[b]
        # pad
        for n in pad_ch[ch]:   # pad_note gives (left, right)
            l, r = pad_note(hz(midi(n)), BAR * 1.02, 0.18, att=0.6, rel=1.0) if b < BARS - 1 else pad_note(hz(midi(n)), BAR + TAIL * 0.8, 0.2, att=0.4, rel=1.6)
            T.add2(t0, l, r)
        # the tune
        for st, n in tune.get(b, []):
            T.add(t0 + st * TRIP + hum(), kalimba(hz(midi(n)), 0.85 if b != 11 else 0.7), pan=-0.25 + 0.1 * (st % 3))
        # the low kalimba ostinato (not in the first bar: the tune is alone there; quiet at the elephants)
        if b >= 1 and b != 11:
            notes = pad_ch[ch]
            vel = 0.35 if b in (6, 7) else 0.5
            for k, st in enumerate((0, 2, 3, 5, 6, 8, 9, 11)):
                if st % 3 == 1:
                    continue
                n = notes[k % 3]
                T.add(t0 + st * TRIP + hum(), kalimba(hz(midi(n)), vel * (1 if st % 3 == 0 else 0.7)), pan=0.3)
        # the marimba bass
        if b >= 2:
            r = hz(midi(roots[ch]))
            T.add(t0 + hum(), marimba(r, 0.9), pan=0.0)
            if b not in (6, 7, 11):
                T.add(t0 + 6 * TRIP + hum(), marimba(r * (1.5 if ch != 'Em' else 1.5), 0.6), pan=0.0)
                T.add(t0 + 9 * TRIP + hum(), marimba(r * 2, 0.45), pan=0.0)
        # the shaker on the triplets (from bar 2), accents on the beats
        if 1 <= b <= 10:
            for st in range(12):
                v = 0.9 if st % 3 == 0 else 0.5
                if b == 1:
                    v *= (st + 1) / 12   # it comes in
                T.add(t0 + st * TRIP + hum() * 0.5, shaker(v * 1.3), pan=0.45)
        # the hand drum
        if 2 <= b <= 10:
            if b in (6, 7):   # the elephants: only the deep strokes
                pat = [(0, 'bass', 0.8), (6, 'bass', 0.55)]
            elif b in (8, 9, 10):   # the chase: the full groove with slaps
                pat = [(0, 'bass', 1.0), (2, 'slap', 0.7), (3, 'tone', 0.8), (5, 'tone', 0.6), (6, 'bass', 0.9), (7, 'slap', 0.55),
                       (8, 'slap', 0.8), (9, 'tone', 0.8), (11, 'tone', 0.6)]
            else:
                pat = [(0, 'bass', 0.95), (3, 'tone', 0.75), (5, 'tone', 0.55), (6, 'bass', 0.8), (8, 'slap', 0.6), (9, 'tone', 0.7), (11, 'tone', 0.5)]
            if b == 10:   # the fill into the last part
                pat = [(0, 'bass', 1.0), (2, 'slap', 0.7), (3, 'tone', 0.8), (5, 'tone', 0.6), (6, 'slap', 0.8), (7, 'slap', 0.7),
                       (8, 'tone', 0.8), (9, 'slap', 0.9), (10, 'tone', 0.85), (11, 'slap', 1.0)]
            for st, k, v in pat:
                T.add(t0 + st * TRIP + hum(), drum(k, v), pan={'bass': 0.0, 'tone': -0.2, 'slap': -0.35}[k])
        if b == 11:   # one deep stroke with the last chord
            T.add(t0, drum('bass', 1.0), pan=0.0)
    return T


def mix(T):
    # no circular reverb here (the piece plays once): a linear hall, then a fade over the ring-out
    ir = hall_ir(1.6, 2.4)
    hp = butter(2, 40, 'high', fs=SR, output='sos')
    L, R = sosfilt(hp, T.L), sosfilt(hp, T.R)
    wl = np.convolve(L, ir[0])[:len(L)]; wr = np.convolve(R, ir[1])[:len(R)]
    w = 0.22
    x = np.stack([L * (1 - w * 0.5) + wl * w, R * (1 - w * 0.5) + wr * w], 1)
    n = len(x); nf = int(TAIL * SR)
    x[n - nf:] *= np.linspace(1, 0, nf)[:, None] ** 1.5
    ni = int(0.02 * SR); x[:ni] *= np.linspace(0, 1, ni)[:, None]
    return x


def render(mp3_dir=None):
    x = mix(piece())
    tmp = tempfile.mkdtemp(prefix='svmusic-')
    w1 = os.path.join(tmp, 'savanna.wav')
    write_wav(w1, x / np.max(np.abs(x)) * 0.5)
    I, _, _ = ebur128(w1)
    x = x / np.max(np.abs(x)) * 0.5 * 10 ** ((-18.0 - I) / 20)   # a little louder than the background pieces: it is the film's own sound
    if np.max(np.abs(x)) > 0.95:
        x *= 0.95 / np.max(np.abs(x))
    write_wav(w1, x)
    I, LRA, tp = ebur128(w1)
    out = C.OUT
    os.makedirs(out, exist_ok=True)
    ogg = os.path.join(out, 'savanna.ogg')
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', w1, '-c:a', 'libopus', '-b:a', '64k', '-vbr', 'on',
                    '-application', 'audio', '-map_metadata', '-1', ogg], check=True)
    info = dict(name='savanna', loop=round(len(x) / SR, 4), pad=0.0, once=True, bpm=BPM, bar=round(BAR, 5), lufs=I, lra=LRA,
                true_peak=tp, bytes=os.path.getsize(ogg))
    with open(os.path.join(out, 'savanna.json'), 'w') as f:
        json.dump(info, f, indent=1)
    if mp3_dir:
        os.makedirs(mp3_dir, exist_ok=True)
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', w1, '-c:a', 'libmp3lame', '-b:a', '160k',
                        os.path.join(mp3_dir, 'savanna.mp3')], check=True)
    print(json.dumps(info))


if __name__ == '__main__':
    a = sys.argv[1:]
    render(a[a.index('--mp3') + 1] if '--mp3' in a else None)
