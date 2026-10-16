# קוף יללן (Alouatta palliata) – black coat with a golden-brown fringe along the flanks, bare dark face, swollen throat with
# a beard, long limbs and a long prehensile tail. Walks along branches, climbs trunks, hangs, and howls in the morning.
TAIL = [(0, 0.33, -0.2), (0, 0.3, -0.36), (0, 0.22, -0.5), (0, 0.13, -0.6), (0, 0.06, -0.66), (0, 0.06, -0.72)]
blobs = [
    dict(t='ell', c=(0, 0.33, -0.04), r=(0.1, 0.12, 0.18), bone='hips'),
    dict(t='ell', c=(0, 0.36, 0.11), r=(0.1, 0.12, 0.12), bone='chest'),
    dict(t='ell', c=(0, 0.42, 0.24), r=(0.07, 0.075, 0.07), bone='head'),
    dict(t='ell', c=(0, 0.39, 0.29), r=(0.05, 0.045, 0.045), bone='head'),          # muzzle
    dict(t='ell', c=(0, 0.34, 0.24), r=(0.055, 0.06, 0.05), bone='head'),            # bearded throat
]
for a, b, r, bn in zip(TAIL[:-1], TAIL[1:], ((0.03, 0.026), (0.026, 0.022), (0.022, 0.018), (0.018, 0.014), (0.014, 0.01)), ['tail1', 'tail2', 'tail3', 'tail4', 'tail5']):
    blobs.append(dict(t='cap', a=a, b2=b, r=r, bone=bn))
for sx, L in ((1, 'l'), (-1, 'r')):
    blobs += [
        dict(t='cap', a=(sx * 0.08, 0.37, 0.15), b2=(sx * 0.09, 0.2, 0.17), r=(0.036, 0.03), bone='f' + L),
        dict(t='cap', a=(sx * 0.09, 0.2, 0.17), b2=(sx * 0.09, 0.03, 0.18), r=(0.028, 0.024), bone='f' + L + '2'),
        dict(t='ell', c=(sx * 0.09, 0.02, 0.2), r=(0.026, 0.016, 0.04), bone='f' + L + '2'),
        dict(t='cap', a=(sx * 0.08, 0.32, -0.12), b2=(sx * 0.09, 0.17, -0.1), r=(0.045, 0.034), bone='h' + L),
        dict(t='cap', a=(sx * 0.09, 0.17, -0.1), b2=(sx * 0.09, 0.03, -0.12), r=(0.03, 0.025), bone='h' + L + '2'),
        dict(t='ell', c=(sx * 0.09, 0.02, -0.09), r=(0.028, 0.016, 0.05), bone='h' + L + '2'),
    ]
bones = [('hips', None, (0, 0.32, -0.15), (0, 0.34, 0.03)), ('chest', 'hips', (0, 0.34, 0.03), (0, 0.38, 0.18)),
         ('head', 'chest', (0, 0.39, 0.18), (0, 0.4, 0.32))] + chain('tail', TAIL, 'hips')
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', (sx * 0.08, 0.38, 0.15), (sx * 0.09, 0.2, 0.17)), ('f' + L + '2', 'f' + L, (sx * 0.09, 0.2, 0.17), (sx * 0.09, 0.0, 0.2)),
              ('h' + L, 'hips', (sx * 0.08, 0.33, -0.12), (sx * 0.09, 0.17, -0.1)), ('h' + L + '2', 'h' + L, (sx * 0.09, 0.17, -0.1), (sx * 0.09, 0.0, -0.09))]

BLACK, BLACK2, GOLD, FACE = srgb('#16120f'), srgb('#2a221c'), srgb('#9a6a34'), srgb('#24201e')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 60, y * 60, z * 60)))
    c = mix(BLACK, BLACK2, 0.3 + 0.4 * n)
    # golden mantle: long hair on the flanks, soft-edged and streaky, fading toward the back, the belly and the ends
    m = smooth(0.055, 0.09, abs(x)) * smooth(-0.24, -0.12, z) * smooth(0.17, 0.07, z) * smooth(0.21, 0.27, y) * smooth(0.41, 0.35, y)
    streak = 0.75 + 0.25 * noise.noise(Vector((x * 30, y * 90, z * 30)))
    c = mix(c, GOLD, 0.72 * m * streak)
    if z > 0.27: c = mix(c, FACE, 0.6)
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.03, 0.435, 0.295), 0.011, 'head', '#2a1a0a', (sx * 0.4, 0.2, 0.8))
    parts.append(ear_part((sx * 0.06, 0.43, 0.22), (sx * 0.8, 1, -0.3), 0.014, 0.018, 'head', BLACK2, srgb('#3a302a'), thick=0.003, cup=0.3))
    nos = Part('nose', bone='head', mat=1, color=srgb('#0e0c0a')); nos.add(*ellipsoid((sx * 0.012, 0.4, 0.333), (0.007, 0.005, 0.004), 6, 4)); parts.append(nos)

names = [b[0] for b in bones]
acts = quad_actions(names, dict(amp=24, knee=40, run_amp=34, bob=0.015, drop=0.2, head_eat=35, look=35, tailsw=12,
                                frames=dict(walk=34, run=18, idle=150, eat=60, sleep=120)))
_idle = acts['idle'][1]
def idle(ph):     # sometimes throws its head back and howls
    p = _idle(ph); h = smooth(0.55, 0.62, ph) * smooth(0.85, 0.78, ph)
    p['head'] = (p.get('head', (0, 0, 0))[0] - 35 * h, p.get('head', (0, 0, 0))[1] * (1 - h), 0); p['chest'] = (-10 * h, 0, 0); return p
acts['idle'] = (150, idle)
H = (0, 0.32, -0.15)
def tail_grip(p, ph):
    for i in range(1, 6): p['tail%d' % i] = (-12, 0, 0)
acts['climb'] = (34, reorient(acts['walk'][1], H, 'climb', tail_grip))
acts['hang'] = (150, reorient(acts['idle'][1], H, 'hang'))
SPEC = dict(id='howler', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.0065, tris=2400, smooth=12, actions=acts,
            meta=dict(height=0.62, length=1.0, speeds={'walk': 0.9, 'run': 2.5}, gripY={'hang': 0.0, 'perch': 0.0},
                      map={'perch': 'idle', 'swim': 'walk', 'sit': 'idle'}))
