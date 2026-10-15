# טפיר (Tapirus terrestris) – heavy rounded body on slender legs, short flexible snout, white-rimmed ears, short stiff mane.
blobs = [
    dict(t='ell', c=(0, 0.72, -0.15), r=(0.33, 0.35, 0.62), bone='hips'),
    dict(t='ell', c=(0, 0.72, 0.35), r=(0.29, 0.33, 0.33), bone='chest'),
    dict(t='ell', c=(0, 0.82, 0.65), r=(0.15, 0.2, 0.2), bone='neck'),
    dict(t='ell', c=(0, 0.8, 0.86), r=(0.13, 0.17, 0.2), bone='head'),
    dict(t='ell', c=(0, 0.74, 1.02), r=(0.1, 0.12, 0.14), bone='head'),
    dict(t='cap', a=(0, 0.72, 1.1), b2=(0, 0.66, 1.2), r=(0.075, 0.05), bone='snout1'),
    dict(t='cap', a=(0, 0.66, 1.2), b2=(0, 0.58, 1.26), r=(0.05, 0.04), bone='snout2'),
    dict(t='ell', c=(0, 0.98, 0.6), r=(0.04, 0.08, 0.22), rot=(-25, 0, 0), bone='neck'),     # mane ridge
]
for sx, L in ((1, 'l'), (-1, 'r')):
    blobs += [
        dict(t='cap', a=(sx * 0.17, 0.55, 0.42), b2=(sx * 0.18, 0.3, 0.44), r=(0.1, 0.07), bone='f' + L),
        dict(t='cap', a=(sx * 0.18, 0.3, 0.44), b2=(sx * 0.18, 0.05, 0.46), r=(0.06, 0.05), bone='f' + L + '2'),
        dict(t='ell', c=(sx * 0.18, 0.035, 0.48), r=(0.06, 0.035, 0.07), bone='f' + L + '2'),
        dict(t='ell', c=(sx * 0.2, 0.55, -0.55), r=(0.13, 0.26, 0.22), bone='h' + L),
        dict(t='cap', a=(sx * 0.2, 0.35, -0.62), b2=(sx * 0.19, 0.06, -0.55), r=(0.07, 0.05), bone='h' + L + '2'),
        dict(t='ell', c=(sx * 0.19, 0.035, -0.52), r=(0.06, 0.035, 0.07), bone='h' + L + '2'),
    ]
bones = [('hips', None, (0, 0.7, -0.7), (0, 0.72, 0.1)), ('chest', 'hips', (0, 0.72, 0.1), (0, 0.76, 0.5)),
         ('neck', 'chest', (0, 0.78, 0.5), (0, 0.82, 0.72)), ('head', 'neck', (0, 0.82, 0.72), (0, 0.74, 1.1)),
         ('snout1', 'head', (0, 0.72, 1.1), (0, 0.66, 1.2)), ('snout2', 'snout1', (0, 0.66, 1.2), (0, 0.58, 1.27)),
         ('earL', 'head', (0.09, 0.95, 0.78), (0.13, 1.06, 0.74)), ('earR', 'head', (-0.09, 0.95, 0.78), (-0.13, 1.06, 0.74))]
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', (sx * 0.17, 0.6, 0.42), (sx * 0.18, 0.3, 0.44)), ('f' + L + '2', 'f' + L, (sx * 0.18, 0.3, 0.44), (sx * 0.18, 0.0, 0.48)),
              ('h' + L, 'hips', (sx * 0.2, 0.68, -0.52), (sx * 0.2, 0.35, -0.62)), ('h' + L + '2', 'h' + L, (sx * 0.2, 0.35, -0.62), (sx * 0.19, 0.0, -0.52))]

FUR, FUR2, DARK, BELLY, FACE = srgb('#4a4038'), srgb('#2c2622'), srgb('#1c1816'), srgb('#5e5248'), srgb('#6a5e54')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 8, y * 8, z * 8))); n2 = noise.noise(Vector((x * 60, y * 60, z * 60)))
    c = mix(FUR, FUR2, 0.35 + 0.25 * n + 0.15 * n2)
    c = mix(c, BELLY, smooth(0.5, 0.4, y) * smooth(-0.2, -0.6, N.y) * 0.6)
    if z > 0.8: c = mix(c, FACE, 0.4 * smooth(0.8, 1.0, z))
    if z > 1.05: c = mix(c, DARK, 0.6)
    if y < 0.35: c = mix(c, DARK, smooth(0.35, 0.15, y) * 0.8)
    if y > 0.95 and z > 0.4: c = mix(c, DARK, 0.8)                                    # mane
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.105, 0.86, 0.94), 0.022, 'head', '#0a0806', (sx, 0.2, 0.5))
    ear = ear_part((sx * 0.09, 0.95, 0.78), (sx * 0.5, 1, -0.3), 0.06, 0.1, 'ear' + ('L' if sx > 0 else 'R'), srgb('#2e2622'), srgb('#4a3e36'), thick=0.01, cup=0.35)
    # white ear rim
    ear.c = [srgb('#e8e2d8') if (cc is not None and cc == srgb('#2e2622') and i < len(ear.v) // 2) else cc for i, cc in enumerate(ear.c)]
    parts.append(ear)
    nost = Part('nose', bone='snout2', mat=1, color=srgb('#15110e')); nost.add(*ellipsoid((sx * 0.02, 0.56, 1.27), (0.016, 0.012, 0.01), 8, 5)); parts.append(nost)
    # hooves: three toes in front
    for k in (-1, 0, 1):
        h = Part('hoof', bone='f' + ('l' if sx > 0 else 'r') + '2', mat=1, color=srgb('#2a2420'))
        h.add(*ellipsoid((sx * 0.18 + k * 0.035, 0.02, 0.54), (0.02, 0.02, 0.025), 6, 4)); parts.append(h)

names = [b[0] for b in bones]
acts = quad_actions(names, dict(amp=22, knee=38, run_amp=32, bob=0.03, drop=0.42, head_eat=30, neck_eat=35, look=25, earflick=35,
                                frames=dict(walk=40, run=22, idle=150, eat=48, sleep=120, swim=40)))
for k in ('idle', 'eat', 'walk'):          # the snout keeps feeling around
    fr, fn = acts[k]
    def wrap(ph, fn=fn, k=k):
        p = fn(ph); a = 1.6 if k == 'eat' else 1.0
        p['snout1'] = (10 * a * math.sin(TAU * ph * 3), 8 * math.sin(TAU * ph * 2), 0); p['snout2'] = (14 * a * math.sin(TAU * ph * 3 + 0.8), 10 * math.sin(TAU * ph * 2 + 0.6), 0); return p
    acts[k] = (fr, wrap)
SPEC = dict(id='tapir', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.016, tris=2600, smooth=12, actions=acts,
            meta=dict(height=1.15, length=2.3, speeds={'walk': 1.0, 'run': 4.0}, map={'sit': 'idle'}))
