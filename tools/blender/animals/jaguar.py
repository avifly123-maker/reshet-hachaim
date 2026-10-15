# יגואר (Panthera onca) – powerful golden cat with black rosettes (each ringing a darker centre, often with a dot), white
# belly, broad head, rounded ears, spotted tail ringed toward the tip.
TAIL = [(0, 0.62, -0.55), (0, 0.52, -0.72), (0, 0.38, -0.86), (0, 0.27, -1.0), (0, 0.24, -1.14)]
blobs = [
    dict(t='ell', c=(0, 0.6, -0.18), r=(0.17, 0.2, 0.4), bone='hips'),
    dict(t='ell', c=(0, 0.6, 0.2), r=(0.17, 0.22, 0.26), bone='chest'),
    dict(t='cap', a=(0, 0.65, 0.35), b2=(0, 0.7, 0.5), r=(0.12, 0.1), bone='neck'),
    dict(t='ell', c=(0, 0.72, 0.6), r=(0.11, 0.1, 0.11), bone='head'),
    dict(t='ell', c=(0, 0.68, 0.69), r=(0.075, 0.065, 0.07), bone='head'),          # muzzle
    dict(t='ell', c=(0, 0.64, 0.64), r=(0.07, 0.04, 0.07), bone='head'),            # jaw
    dict(t='cap', a=TAIL[0], b2=TAIL[1], r=(0.05, 0.042), bone='tail1'),
    dict(t='cap', a=TAIL[1], b2=TAIL[2], r=(0.042, 0.036), bone='tail2'),
    dict(t='cap', a=TAIL[2], b2=TAIL[3], r=(0.036, 0.032), bone='tail3'),
    dict(t='cap', a=TAIL[3], b2=TAIL[4], r=(0.032, 0.026), bone='tail4'),
]
for sx, L in ((1, 'l'), (-1, 'r')):
    blobs += [
        dict(t='ell', c=(sx * 0.1, 0.55, 0.28), r=(0.07, 0.16, 0.1), bone='f' + L),
        dict(t='cap', a=(sx * 0.11, 0.42, 0.3), b2=(sx * 0.11, 0.05, 0.31), r=(0.068, 0.052), bone='f' + L + '2'),
        dict(t='ell', c=(sx * 0.11, 0.038, 0.35), r=(0.07, 0.038, 0.08), bone='f' + L + '2'),
        dict(t='ell', c=(sx * 0.12, 0.5, -0.36), r=(0.08, 0.2, 0.15), bone='h' + L),
        dict(t='cap', a=(sx * 0.12, 0.34, -0.44), b2=(sx * 0.12, 0.16, -0.52), r=(0.05, 0.04), bone='h' + L + '2'),
        dict(t='cap', a=(sx * 0.12, 0.16, -0.52), b2=(sx * 0.12, 0.04, -0.44), r=(0.04, 0.038), bone='h' + L + '2'),
        dict(t='ell', c=(sx * 0.12, 0.033, -0.4), r=(0.055, 0.033, 0.07), bone='h' + L + '2'),
    ]
bones = [('hips', None, (0, 0.6, -0.55), (0, 0.6, 0.0)), ('chest', 'hips', (0, 0.6, 0.0), (0, 0.63, 0.35)),
         ('neck', 'chest', (0, 0.65, 0.35), (0, 0.71, 0.5)), ('head', 'neck', (0, 0.72, 0.5), (0, 0.68, 0.76))] + chain('tail', TAIL, 'hips')
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', (sx * 0.1, 0.62, 0.27), (sx * 0.11, 0.42, 0.3)), ('f' + L + '2', 'f' + L, (sx * 0.11, 0.42, 0.3), (sx * 0.11, 0.0, 0.36)),
              ('h' + L, 'hips', (sx * 0.12, 0.62, -0.33), (sx * 0.12, 0.34, -0.44)), ('h' + L + '2', 'h' + L, (sx * 0.12, 0.34, -0.44), (sx * 0.12, 0.0, -0.4))]
bones += [('earL', 'head', (0.07, 0.8, 0.56), (0.1, 0.86, 0.55)), ('earR', 'head', (-0.07, 0.8, 0.56), (-0.1, 0.86, 0.55))]

GOLD, GOLD2, TAN, BLACK, WHITE = srgb('#e0a44a'), srgb('#c78434'), srgb('#b8742c'), srgb('#1a1209'), srgb('#f3ece0')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 20, y * 20, z * 20)))
    c = mix(GOLD, GOLD2, 0.3 + 0.3 * n)
    belly = smooth(0.48, 0.4, y) * smooth(-0.1, -0.5, N.y) if z > -0.55 else 0
    c = mix(c, WHITE, belly * 0.9)
    head = z > 0.45; tail = z < -0.55
    if head:   # small solid spots on the head; white muzzle and chin
        d, rid = worley(P, 28, 3)
        c = mix(c, BLACK, smooth(0.32, 0.22, d) * (rid > 0.2))
        if z > 0.66 and y < 0.68: c = mix(c, WHITE, 0.8)
        return c
    if tail:
        d, rid = worley(P, 14, 4)
        ring = smooth(0.85, 0.95, math.sin(z * 32)) * smooth(-0.85, -0.95, z)
        c = mix(c, BLACK, max(smooth(0.35, 0.25, d) * (rid > 0.3), ring))
        if z < -1.1: c = mix(c, BLACK, 0.8)
        return c
    if y < 0.42 and abs(x) > 0.06:   # legs: solid spots
        d, rid = worley(P, 13, 5)
        return mix(c, BLACK, smooth(0.3, 0.2, d) * (rid > 0.25))
    # rosettes: broken dark rings, a slightly darker centre, sometimes a dot
    d, rid = worley(P, 6.0, 2)
    ring = smooth(0.24, 0.3, d) * smooth(0.48, 0.4, d)
    gap = 0.5 + 0.5 * noise.noise(Vector((x * 60, y * 60, z * 60)))
    c = mix(c, TAN, smooth(0.32, 0.18, d) * 0.6)
    c = mix(c, BLACK, ring * smooth(0.25, 0.5, gap) * (1 - belly))
    if rid > 0.6: c = mix(c, BLACK, smooth(0.09, 0.05, d) * (1 - belly))
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.052, 0.738, 0.69), 0.015, 'head', '#9a7a1a', (sx, 0.2, 0.7))
    parts.append(ear_part((sx * 0.07, 0.79, 0.56), (sx * 0.6, 1, -0.3), 0.032, 0.045, 'ear' + ('L' if sx > 0 else 'R'), srgb('#3a2814'), srgb('#d9b07a'), thick=0.008, cup=0.45))
    parts.append(whiskers((sx * 0.04, 0.665, 0.74), sx, 'head', 5, 0.12, srgb('#f0ece4')))
nose = Part('nose', bone='head', mat=1, color=srgb('#5a3428')); nose.add(*ellipsoid((0, 0.7, 0.755), (0.025, 0.018, 0.012), 8, 5)); parts.append(nose)

names = [b[0] for b in bones]
acts = quad_actions(names, dict(amp=26, knee=50, run_amp=42, bob=0.02, drop=0.4, head_eat=35, neck_eat=40, look=30, tailsw=14, earflick=20,
                                run_bound=True, frames=dict(walk=36, run=16, idle=150, eat=60, sleep=120, swim=40)))
_w = acts['walk'][1]
def walk(ph):     # a cat's prowl: low head, shoulders rolling
    p = _w(ph); p['chest'] = (0, -4 * math.sin(TAU * ph), -4 * math.sin(TAU * ph)); p['neck'] = (8, 3 * math.sin(TAU * ph), 0)
    for i in range(1, 5): p['tail%d' % i] = (-6 + 4 * i, 10 * math.sin(TAU * (ph - 0.12 * i)), 0)
    return p
acts['walk'] = (36, walk)
SPEC = dict(id='jaguar', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.009, tris=5200, smooth=12, actions=acts,
            meta=dict(height=0.9, length=2.2, speeds={'walk': 1.3, 'run': 6.0}, map={'sit': 'idle'}))
