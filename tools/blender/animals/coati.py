# קואטי (Nasua nasua) – reddish-brown, long ringed tail held up, long flexible upturned snout, dark face with pale marks.
TAIL = [(0, 0.3, -0.24), (0, 0.42, -0.34), (0, 0.6, -0.38), (0, 0.78, -0.36), (0, 0.95, -0.3), (0, 1.08, -0.22)]
blobs = [
    dict(t='ell', c=(0, 0.25, -0.05), r=(0.09, 0.1, 0.2), bone='hips'),
    dict(t='ell', c=(0, 0.24, 0.12), r=(0.08, 0.095, 0.12), bone='chest'),
    dict(t='ell', c=(0, 0.27, 0.27), r=(0.055, 0.055, 0.065), bone='head'),
    dict(t='cap', a=(0, 0.26, 0.3), b2=(0, 0.24, 0.42), r=(0.03, 0.013), bone='snout'),
    dict(t='cap', a=TAIL[0], b2=TAIL[1], r=(0.035, 0.03), bone='tail1'),
    dict(t='cap', a=TAIL[1], b2=TAIL[2], r=(0.03, 0.027), bone='tail2'),
    dict(t='cap', a=TAIL[2], b2=TAIL[3], r=(0.027, 0.024), bone='tail3'),
    dict(t='cap', a=TAIL[3], b2=TAIL[4], r=(0.024, 0.02), bone='tail4'),
    dict(t='cap', a=TAIL[4], b2=TAIL[5], r=(0.02, 0.012), bone='tail5'),
]
for sx, L in ((1, 'l'), (-1, 'r')):
    blobs += [
        dict(t='cap', a=(sx * 0.055, 0.22, 0.14), b2=(sx * 0.06, 0.11, 0.15), r=(0.032, 0.024), bone='f' + L),
        dict(t='cap', a=(sx * 0.06, 0.11, 0.15), b2=(sx * 0.06, 0.02, 0.165), r=(0.022, 0.018), bone='f' + L + '2'),
        dict(t='ell', c=(sx * 0.06, 0.015, 0.18), r=(0.022, 0.013, 0.03), bone='f' + L + '2'),
        dict(t='ell', c=(sx * 0.06, 0.2, -0.15), r=(0.045, 0.09, 0.075), bone='h' + L),
        dict(t='cap', a=(sx * 0.06, 0.12, -0.19), b2=(sx * 0.06, 0.02, -0.16), r=(0.024, 0.019), bone='h' + L + '2'),
        dict(t='ell', c=(sx * 0.06, 0.015, -0.13), r=(0.022, 0.013, 0.04), bone='h' + L + '2'),
    ]
bones = [('hips', None, (0, 0.25, -0.22), (0, 0.25, 0.02)), ('chest', 'hips', (0, 0.25, 0.02), (0, 0.26, 0.2)),
         ('head', 'chest', (0, 0.27, 0.21), (0, 0.27, 0.31)), ('snout', 'head', (0, 0.26, 0.31), (0, 0.24, 0.43))] + chain('tail', TAIL, 'hips')
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', (sx * 0.055, 0.23, 0.14), (sx * 0.06, 0.11, 0.15)), ('f' + L + '2', 'f' + L, (sx * 0.06, 0.11, 0.15), (sx * 0.06, 0.0, 0.17)),
              ('h' + L, 'hips', (sx * 0.06, 0.25, -0.13), (sx * 0.06, 0.12, -0.19)), ('h' + L + '2', 'h' + L, (sx * 0.06, 0.12, -0.19), (sx * 0.06, 0.0, -0.14))]

RED, RED2, DARK, PALE, CREAM = srgb('#a4643a'), srgb('#7e4a2a'), srgb('#2a1c14'), srgb('#e8dcc4'), srgb('#c8a47a')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 50, y * 50, z * 50)))
    c = mix(RED, RED2, 0.3 + 0.35 * n)
    if z < -0.22 and y > 0.28:   # ringed tail
        t = math.hypot(y - 0.3, z + 0.24); c = mix(c, DARK, 0.85 * smooth(0.1, 0.6, math.sin(t * 38)))
        return c
    c = mix(c, CREAM, smooth(0.2, 0.16, y) * smooth(-0.1, -0.6, N.y) * 0.7)
    if z > 0.22:   # dark face with pale spots above / below the eye and a pale muzzle band
        c = mix(c, DARK, 0.65)
        for (yy, zz, r) in ((0.3, 0.3, 0.012), (0.258, 0.3, 0.011)):
            c = mix(c, PALE, math.exp(-((abs(x) - 0.034) ** 2 + (y - yy) ** 2 + (z - zz) ** 2) / r ** 2))
        if z > 0.36: c = mix(c, PALE, smooth(0.36, 0.38, z) * smooth(0.4, 0.38, z) * 0.7)
    if y < 0.1 and abs(x) > 0.03: c = mix(c, DARK, 0.7)
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.032, 0.29, 0.31), 0.0095, 'head', '#0a0806', (sx, 0.25, 0.6))
    parts.append(ear_part((sx * 0.035, 0.31, 0.24), (sx * 0.5, 1, -0.3), 0.022, 0.03, 'head', RED2, PALE, thick=0.004, cup=0.4))
    parts.append(whiskers((sx * 0.012, 0.235, 0.41), sx, 'snout', 4, 0.05, srgb('#1a120e')))
nose = Part('nose', bone='snout', mat=1, color=srgb('#141010')); nose.add(*ellipsoid((0, 0.24, 0.432), (0.014, 0.012, 0.008), 8, 5)); parts.append(nose)

names = [b[0] for b in bones]
acts = quad_actions(names, dict(amp=26, knee=40, run_amp=36, bob=0.012, drop=0.17, head_eat=40, look=30, tailsw=8,
                                frames=dict(walk=24, run=14, idle=150, eat=48, sleep=120)))
for k in list(acts):
    fr, fn = acts[k]
    def w(ph, fn=fn, k=k):
        p = fn(ph)
        p['snout'] = (12 * math.sin(TAU * ph * 4) if k in ('eat', 'idle') else 4 * math.sin(TAU * ph * 2), 8 * math.sin(TAU * ph * 3), 0)
        if k == 'sleep':
            for i in range(1, 6): p['tail%d' % i] = (35, 15, 0)
        return p
    acts[k] = (fr, w)
SPEC = dict(id='coati', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.005, tris=2400, smooth=10, actions=acts,
            meta=dict(height=1.1, length=1.0, speeds={'walk': 0.7, 'run': 3.2}, map={'climb': 'walk', 'swim': 'walk', 'sit': 'idle'}))
