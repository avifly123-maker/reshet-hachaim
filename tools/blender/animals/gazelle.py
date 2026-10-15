# צבי ארץ-ישראלי (Gazella gazella) – slender, fawn back, dark flank band over a white belly, white rump, striped face,
# long ringed lyre-shaped horns, big ears, thin legs with small hooves, short black tail.
blobs = [
    dict(t='ell', c=(0, 0.92, -0.12), r=(0.13, 0.15, 0.32), bone='hips'),
    dict(t='ell', c=(0, 0.95, 0.2), r=(0.12, 0.16, 0.2), bone='chest'),
    dict(t='cap', a=(0, 1.0, 0.32), b2=(0, 1.3, 0.45), r=(0.075, 0.05), bone='neck'),
    dict(t='ell', c=(0, 1.37, 0.5), r=(0.06, 0.07, 0.085), bone='head'),
    dict(t='cap', a=(0, 1.36, 0.55), b2=(0, 1.29, 0.68), r=(0.05, 0.026), bone='head'),
    dict(t='cap', a=(0, 0.98, -0.42), b2=(0, 0.93, -0.5), r=(0.022, 0.012), bone='hips'),          # tail
]
for sx, L in ((1, 'l'), (-1, 'r')):
    blobs += [
        dict(t='cap', a=(sx * 0.07, 0.88, 0.24), b2=(sx * 0.075, 0.55, 0.25), r=(0.05, 0.028), bone='f' + L),
        dict(t='cap', a=(sx * 0.075, 0.55, 0.25), b2=(sx * 0.076, 0.04, 0.26), r=(0.022, 0.014), bone='f' + L + '2'),
        dict(t='ell', c=(sx * 0.07, 0.8, -0.27), r=(0.07, 0.15, 0.12), bone='h' + L),
        dict(t='cap', a=(sx * 0.075, 0.64, -0.35), b2=(sx * 0.075, 0.38, -0.42), r=(0.034, 0.02), bone='h' + L + '2'),
        dict(t='cap', a=(sx * 0.075, 0.38, -0.42), b2=(sx * 0.076, 0.04, -0.37), r=(0.018, 0.014), bone='h' + L + '2'),
    ]
bones = [('hips', None, (0, 0.92, -0.42), (0, 0.93, 0.02)), ('chest', 'hips', (0, 0.93, 0.02), (0, 0.98, 0.32)),
         ('neck', 'chest', (0, 1.0, 0.32), (0, 1.3, 0.45)), ('head', 'neck', (0, 1.33, 0.45), (0, 1.29, 0.7))]
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', (sx * 0.07, 0.9, 0.24), (sx * 0.075, 0.55, 0.25)), ('f' + L + '2', 'f' + L, (sx * 0.075, 0.55, 0.25), (sx * 0.076, 0.0, 0.27)),
              ('h' + L, 'hips', (sx * 0.07, 0.92, -0.25), (sx * 0.075, 0.64, -0.35)), ('h' + L + '2', 'h' + L, (sx * 0.075, 0.64, -0.35), (sx * 0.076, 0.0, -0.37))]
bones += [('earL', 'head', (0.045, 1.42, 0.46), (0.11, 1.52, 0.43)), ('earR', 'head', (-0.045, 1.42, 0.46), (-0.11, 1.52, 0.43))]

FAWN, FAWN2, WHITE, DARK, CHOC = srgb('#b9773e'), srgb('#9c5f2c'), srgb('#f4efe6'), srgb('#3a2414'), srgb('#5a3418')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 30, y * 30, z * 30)))
    c = mix(FAWN, FAWN2, 0.3 + 0.3 * n)
    # dark flank band dividing the fawn back from the white belly
    if -0.38 < z < 0.32 and y < 1.02:
        band = 0.86 + 0.03 * math.cos(z * 6)
        c = mix(c, CHOC, smooth(band + 0.035, band + 0.015, y) * smooth(band - 0.04, band - 0.02, y) * 0.9)
        c = mix(c, WHITE, smooth(band - 0.03, band - 0.06, y))
    if z < -0.36 and y < 1.0 and abs(x) < 0.08: c = mix(c, WHITE, 0.9)                        # white rump
    if y < 0.55: c = mix(c, FAWN2, 0.3)
    if y < 0.08: c = mix(c, DARK, 0.6)
    if z > 0.46 and y > 1.2:     # face: white stripe from eye to nose, dark stripe below, white chin
        e = abs(abs(x) - 0.04)
        if y > 1.33 + (z - 0.5) * -0.3: c = mix(c, WHITE, smooth(0.02, 0.008, e) * 0.85)
        c = mix(c, CHOC, smooth(0.02, 0.008, abs(y - (1.33 - (z - 0.5) * 0.45))) * 0.7)
        if y < 1.3: c = mix(c, WHITE, 0.8)
    if 0.33 < z < 0.46 and y < 1.25 and abs(x) < 0.05: c = mix(c, WHITE, 0.6)                   # throat patch
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.05, 1.4, 0.55), 0.018, 'head', '#1a0e06', (sx, 0.3, 0.5))
    parts.append(ear_part((sx * 0.045, 1.42, 0.46), (sx * 0.6, 1, -0.2), 0.04, 0.13, 'ear' + ('L' if sx > 0 else 'R'), FAWN2, srgb('#e9d8c0'), thick=0.007, cup=0.45, point=True, tipcol=CHOC))
    # horns: ringed, rising and curving back, tips turning forward
    hp = bez([(sx * 0.03, 1.43, 0.5), (sx * 0.045, 1.58, 0.47), (sx * 0.06, 1.72, 0.38), (sx * 0.055, 1.83, 0.33), (sx * 0.05, 1.87, 0.37)], 18)
    hr = [0.019 * (1 - i / 17) ** 0.7 + 0.002 for i in range(18)]
    hv, hf = tube(hp, hr, 7)
    hc = [mix(srgb('#2a2018'), srgb('#4a3a2a'), 0.5 + 0.5 * math.sin(i // 7 * 2.2)) for i in range(len(hv))]
    horn = Part('horn', bone='head', mat=1); horn.add(hv, hf, hc); parts.append(horn)
    for leg, z0 in (('f', 0.27), ('h', -0.37)):
        hf_ = Part('hoof', bone=leg + ('l' if sx > 0 else 'r') + '2', mat=1, color=srgb('#1e1814'))
        hf_.add(*ellipsoid((sx * 0.076, 0.022, z0 + 0.01), (0.018, 0.024, 0.026), 6, 4)); parts.append(hf_)
nose = Part('nose', bone='head', mat=1, color=srgb('#1a1412')); nose.add(*ellipsoid((0, 1.3, 0.69), (0.022, 0.016, 0.01), 8, 5)); parts.append(nose)

names = [b[0] for b in bones]
acts = quad_actions(names, dict(amp=24, knee=60, run_amp=45, bob=0.03, drop=0.6, head_eat=40, neck_eat=60, look=30, earflick=30, tailsw=25,
                                run_bound=True, frames=dict(walk=30, run=16, idle=150, eat=60, sleep=120)))
SPEC = dict(id='gazelle', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.009, tris=2800, smooth=10, actions=acts,
            meta=dict(height=1.85, length=1.5, speeds={'walk': 1.2, 'run': 8.0}, map={'swim': 'walk', 'sit': 'idle'}))
