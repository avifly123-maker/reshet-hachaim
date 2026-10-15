# שועל מצוי (Vulpes vulpes) – russet-orange coat, white chin/chest and tail tip, black "socks" and ear backs, big pointed
# ears, narrow muzzle, long bushy tail. Trots; pounces when eating.
TAIL = [(0, 0.44, -0.33), (0, 0.38, -0.47), (0, 0.3, -0.6), (0, 0.24, -0.72), (0, 0.22, -0.82)]
blobs = [
    dict(t='ell', c=(0, 0.42, -0.1), r=(0.1, 0.11, 0.24), bone='hips'),
    dict(t='ell', c=(0, 0.43, 0.12), r=(0.095, 0.115, 0.15), bone='chest'),
    dict(t='cap', a=(0, 0.47, 0.22), b2=(0, 0.55, 0.32), r=(0.07, 0.055), bone='neck'),
    dict(t='ell', c=(0, 0.57, 0.35), r=(0.065, 0.06, 0.07), bone='head'),
    dict(t='ell', c=(0, 0.575, 0.34), r=(0.08, 0.05, 0.05), bone='head'),                # cheeks
    dict(t='cap', a=(0, 0.555, 0.38), b2=(0, 0.53, 0.47), r=(0.038, 0.016), bone='head'),
    dict(t='ell', c=(0, 0.525, 0.4), r=(0.03, 0.02, 0.05), bone='head'),                 # lower jaw
    # bushy tail
    dict(t='ell', c=(0, 0.41, -0.4), r=(0.05, 0.05, 0.09), rot=(-25, 0, 0), bone='tail1'),
    dict(t='ell', c=(0, 0.34, -0.54), r=(0.075, 0.075, 0.1), rot=(-35, 0, 0), bone='tail2'),
    dict(t='ell', c=(0, 0.27, -0.66), r=(0.075, 0.072, 0.1), rot=(-30, 0, 0), bone='tail3'),
    dict(t='ell', c=(0, 0.23, -0.77), r=(0.055, 0.05, 0.075), rot=(-15, 0, 0), bone='tail4'),
]
for sx, L in ((1, 'l'), (-1, 'r')):
    blobs += [
        dict(t='cap', a=(sx * 0.06, 0.4, 0.16), b2=(sx * 0.065, 0.22, 0.17), r=(0.04, 0.026), bone='f' + L),
        dict(t='cap', a=(sx * 0.065, 0.22, 0.17), b2=(sx * 0.066, 0.025, 0.18), r=(0.022, 0.017), bone='f' + L + '2'),
        dict(t='ell', c=(sx * 0.066, 0.016, 0.2), r=(0.021, 0.014, 0.032), bone='f' + L + '2'),
        dict(t='ell', c=(sx * 0.07, 0.36, -0.22), r=(0.05, 0.11, 0.09), bone='h' + L),
        dict(t='cap', a=(sx * 0.07, 0.26, -0.27), b2=(sx * 0.07, 0.12, -0.32), r=(0.03, 0.021), bone='h' + L + '2'),
        dict(t='cap', a=(sx * 0.07, 0.12, -0.32), b2=(sx * 0.07, 0.022, -0.27), r=(0.02, 0.016), bone='h' + L + '2'),
        dict(t='ell', c=(sx * 0.07, 0.016, -0.245), r=(0.021, 0.014, 0.034), bone='h' + L + '2'),
    ]
bones = [('hips', None, (0, 0.42, -0.3), (0, 0.42, 0.0)), ('chest', 'hips', (0, 0.42, 0.0), (0, 0.45, 0.2)),
         ('neck', 'chest', (0, 0.46, 0.2), (0, 0.55, 0.32)), ('head', 'neck', (0, 0.56, 0.32), (0, 0.53, 0.48))] + chain('tail', TAIL, 'hips')
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', (sx * 0.06, 0.42, 0.16), (sx * 0.065, 0.22, 0.17)), ('f' + L + '2', 'f' + L, (sx * 0.065, 0.22, 0.17), (sx * 0.066, 0.0, 0.2)),
              ('h' + L, 'hips', (sx * 0.07, 0.42, -0.2), (sx * 0.07, 0.26, -0.27)), ('h' + L + '2', 'h' + L, (sx * 0.07, 0.26, -0.27), (sx * 0.07, 0.0, -0.25))]
bones += [('earL', 'head', (0.04, 0.61, 0.32), (0.07, 0.72, 0.3)), ('earR', 'head', (-0.04, 0.61, 0.32), (-0.07, 0.72, 0.3))]

RUST, RUST2, WHITE, BLACK, CREAM = srgb('#d9662a'), srgb('#b84e1e'), srgb('#f3eee6'), srgb('#1e1612'), srgb('#e9d6b8')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 40, y * 40, z * 40))); n2 = noise.noise(Vector((x * 150, y * 150, z * 150)))
    c = mix(RUST, RUST2, 0.35 + 0.3 * n + 0.15 * n2)
    if z < -0.3:   # tail: grizzled, white tip
        c = mix(c, mix(RUST2, BLACK, 0.3), 0.3 * smooth(0.0, 0.6, n2 + 0.3))
        c = mix(c, WHITE, smooth(-0.74, -0.79, z))
        return c
    # white chin, throat and chest; pale belly
    if z > 0.1 and 0.33 < y < 0.53 and abs(x) < 0.05 + (0.53 - y) * 0.15: c = mix(c, WHITE, smooth(0.1, 0.18, z) * smooth(0.53, 0.5, y) * 0.95)
    if z > 0.38 and y < 0.545: c = mix(c, WHITE, 0.85)
    c = mix(c, CREAM, smooth(0.36, 0.3, y) * smooth(-0.2, -0.6, N.y) * 0.7)
    if y < 0.25 and abs(x) > 0.035: c = mix(c, BLACK, smooth(0.25, 0.15, y) * 0.9)              # black socks
    if z > 0.44: c = mix(c, BLACK, 0.4)
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.036, 0.585, 0.408), 0.011, 'head', '#3a2408', (sx, 0.25, 0.6))
    parts.append(ear_part((sx * 0.04, 0.6, 0.32), (sx * 0.45, 1, -0.15), 0.04, 0.1, 'ear' + ('L' if sx > 0 else 'R'), RUST2, WHITE, thick=0.006, cup=0.35, point=True, tipcol=BLACK))
    parts.append(whiskers((sx * 0.02, 0.535, 0.46), sx, 'head', 4, 0.07, srgb('#1a1410')))
nose = Part('nose', bone='head', mat=1, color=srgb('#141010')); nose.add(*ellipsoid((0, 0.538, 0.476), (0.016, 0.012, 0.01), 8, 5)); parts.append(nose)

names = [b[0] for b in bones]
acts = quad_actions(names, dict(gait='trot', amp=26, knee=50, run_amp=40, bob=0.014, drop=0.26, head_eat=30, neck_eat=45, look=35, tailsw=10, earflick=25,
                                frames=dict(walk=22, run=14, idle=150, eat=48, sleep=120)))
_sl = acts['sleep'][1]
def sleep(ph):      # curled up with the tail around the nose
    p = _sl(ph)
    for i in range(1, 5): p['tail%d' % i] = (10, 22, 0)
    p['neck'] = (30, 40, 0); p['head'] = (25, 25, 10); return p
acts['sleep'] = (120, sleep)
SPEC = dict(id='fox', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.006, tris=2600, smooth=14, actions=acts,
            meta=dict(height=0.72, length=1.15, speeds={'walk': 1.1, 'run': 4.5}, map={'swim': 'walk', 'sit': 'idle'}))
