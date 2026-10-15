# חרדון מצוי (Laudakia stellio) – flat spiny lizard, olive-grey with dark bands and pale spots, splayed legs, long tail;
# does "push-ups" and head bobs on its rock.
TAIL = [(0, 0.035, -0.06), (0, 0.03, -0.13), (0, 0.022, -0.21), (0, 0.014, -0.29), (0, 0.008, -0.36)]
blobs = [
    dict(t='ell', c=(0, 0.04, -0.005), r=(0.047, 0.026, 0.085), bone='hips'),
    dict(t='ell', c=(0, 0.043, 0.06), r=(0.04, 0.025, 0.05), bone='chest'),
    dict(t='ell', c=(0, 0.046, 0.105), r=(0.03, 0.022, 0.03), bone='head'),
    dict(t='ell', c=(0, 0.047, 0.14), r=(0.032, 0.021, 0.04), bone='head'),
    dict(t='ell', c=(0, 0.041, 0.177), r=(0.02, 0.014, 0.022), bone='head'),
    dict(t='cap', a=TAIL[0], b2=TAIL[1], r=(0.022, 0.015), bone='tail1'),
    dict(t='cap', a=TAIL[1], b2=TAIL[2], r=(0.015, 0.01), bone='tail2'),
    dict(t='cap', a=TAIL[2], b2=TAIL[3], r=(0.01, 0.006), bone='tail3'),
    dict(t='cap', a=TAIL[3], b2=TAIL[4], r=(0.006, 0.0025), bone='tail4'),
]
for sx, L in ((1, 'l'), (-1, 'r')):
    blobs += [
        dict(t='cap', a=(sx * 0.03, 0.04, 0.065), b2=(sx * 0.075, 0.036, 0.075), r=(0.013, 0.01), bone='f' + L),
        dict(t='cap', a=(sx * 0.075, 0.036, 0.075), b2=(sx * 0.082, 0.006, 0.092), r=(0.009, 0.007), bone='f' + L + '2'),
        dict(t='cap', a=(sx * 0.035, 0.036, -0.05), b2=(sx * 0.088, 0.032, -0.045), r=(0.016, 0.011), bone='h' + L),
        dict(t='cap', a=(sx * 0.088, 0.032, -0.045), b2=(sx * 0.094, 0.005, -0.07), r=(0.01, 0.007), bone='h' + L + '2'),
    ]
bones = [('hips', None, (0, 0.04, -0.06), (0, 0.042, 0.03)), ('chest', 'hips', (0, 0.042, 0.03), (0, 0.045, 0.085)),
         ('head', 'chest', (0, 0.046, 0.085), (0, 0.042, 0.2))] + chain('tail', TAIL, 'hips')
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', (sx * 0.03, 0.04, 0.065), (sx * 0.075, 0.036, 0.075)), ('f' + L + '2', 'f' + L, (sx * 0.075, 0.036, 0.075), (sx * 0.082, 0.0, 0.095)),
              ('h' + L, 'hips', (sx * 0.035, 0.036, -0.05), (sx * 0.088, 0.032, -0.045)), ('h' + L + '2', 'h' + L, (sx * 0.088, 0.032, -0.045), (sx * 0.094, 0.0, -0.075))]

OLIVE, DARK, PALE, BELLY, HEAD = srgb('#7d735a'), srgb('#3a3326'), srgb('#e1cf8c'), srgb('#cbbf9c'), srgb('#5e5a4c')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 120, y * 120, z * 120)))
    c = mix(OLIVE, DARK, 0.25 + 0.25 * n)
    band = 0.5 + 0.5 * math.sin(z * 75 + 1.0)
    c = mix(c, DARK, 0.5 * smooth(0.55, 0.85, band) * (1 if y > 0.035 else 0.4))
    d, rid = worley(P, 120, 9)
    if y > 0.04: c = mix(c, PALE, smooth(0.35, 0.22, d) * (0.85 if rid > 0.35 else 0))          # pale "star" scales
    if N.y < -0.5: c = mix(c, BELLY, 0.7)
    if z > 0.09: c = mix(c, HEAD, 0.45)
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.027, 0.056, 0.152), 0.0048, 'head', '#2a1a0a', (sx, 0.3, 0.3))
    for leg, base, bone, fan in (('f', (sx * 0.083, 0.004, 0.096), 'f%s2', 0.5), ('h', (sx * 0.095, 0.004, -0.075), 'h%s2', 0.6)):
        t = Part('toe', bone=bone % ('l' if sx > 0 else 'r'), color=DARK)
        for k in range(5):
            a = (k / 4 - 0.5) * fan * 2 + sx * 0.4
            d = Vector((math.sin(a), 0, math.cos(a))); tip = Vector(base) + d * (0.018 + 0.006 * (k == 3))
            t.add(*tube([base, tuple(tip)], [0.0022, 0.0008], 3, cap0=False, cap1=False))
        parts.append(t)
# spiny scale rows along the back and around the tail
sp = Part('spine', bones=['hips', 'chest', 'tail1', 'tail2', 'tail3'], color=DARK)
for k in range(60):
    z = 0.08 - k * 0.0065
    if z < -0.25: break
    if z > -0.06: y0 = 0.065 - 0.01 * (abs(z) / 0.08) ** 2; xs = (-0.025, 0.0, 0.025)
    else: y0 = 0.035 + (z + 0.06) * 0.12 + 0.012; xs = (0.0,)
    for x0 in xs:
        b = Vector((x0, y0 - 0.004, z)); sp.add([tuple(b + Vector((0.003, 0, 0))), tuple(b - Vector((0.003, 0, 0))), tuple(b + Vector((0, 0.006, -0.006)))], [(0, 1, 2), (1, 0, 2)])
parts.append(sp)

def S(x): return math.sin(TAU * x)
def walk(ph, k=1.0):
    p = {}
    for L, s, off in (('fl', 1, 0), ('hr', -1, 0), ('fr', -1, 0.5), ('hl', 1, 0.5)):
        u = (ph + off) % 1; sw = math.cos(TAU * u); lift = max(0, math.sin(TAU * u))
        p[L] = (0, -s * 35 * k * sw, s * 18 * lift * k)
        p[L + '2'] = (0, 0, -s * 10 * lift)
    p['hips'] = ((0, 10 * k * S(ph), 0), (0, 0.002, 0))
    p['chest'] = (0, -14 * k * S(ph), 0)
    p['head'] = (0, 6 * S(ph), 0)
    for i in range(1, 5): p['tail%d' % i] = (0, 14 * k * S(ph - 0.15 * i), 0)
    return p
def run(ph):
    p = walk(ph, 1.4)
    for i in range(1, 5): p['tail%d' % i] = (-4, 10 * S(ph - 0.15 * i), 0)
    return p
def idle(ph):
    # three push-ups, then a pause with the head turning
    pu = max(0, S(ph * 3)) * smooth(0.0, 0.05, ph) * smooth(0.55, 0.45, ph)
    look = S(ph) * smooth(0.55, 0.7, ph) * smooth(1.0, 0.9, ph)
    p = {'chest': (-14 * pu, 18 * look, 0), 'head': (8 * pu - 4, 15 * look, 0)}
    for L, s in (('fl', 1), ('fr', -1)): p[L] = (0, 0, -s * 30 * pu); p[L + '2'] = (0, 0, s * 25 * pu)
    for i in range(1, 5): p['tail%d' % i] = (0, 3 * S(ph * 0.5 - i * 0.1), 0)
    return p
def eat(ph):
    l = smooth(0.0, 0.08, ph) * smooth(0.3, 0.15, ph)
    return {'hips': ((0, 0, 0), (0, 0, 0.02 * l)), 'chest': (10 * l, 0, 0), 'head': (12 * l, 0, 0)}
def sleep(ph):
    p = {'hips': ((0, 0, 0), (0, -0.008, 0)), 'head': (6, 10, 0)}
    for i in range(1, 5): p['tail%d' % i] = (0, 12, 0)
    return p

SPEC = dict(id='agama', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.0025, tris=2200, smooth=8,
            actions={'idle': (120, idle), 'walk': (22, walk), 'run': (14, run), 'eat': (40, eat), 'sleep': (90, sleep)},
            meta=dict(height=0.1, length=0.5, speeds={'walk': 0.4, 'run': 2.0}, map={'climb': 'walk', 'swim': 'walk', 'sit': 'idle', 'perch': 'idle'}))
