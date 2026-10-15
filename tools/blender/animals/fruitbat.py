# עטלף פירות (Artibeus, a neotropical fruit bat) – brown furry body, dog-like face with a nose-leaf, big dark eyes, pale
# facial stripes, leathery wings stretched between long fingers. Hangs head-down by its feet.
blobs = [
    dict(t='ell', c=(0, 0.0, -0.005), r=(0.04, 0.036, 0.07), bone='hips'),
    dict(t='ell', c=(0, 0.006, 0.05), r=(0.042, 0.04, 0.045), bone='chest'),
    dict(t='ell', c=(0, 0.014, 0.095), r=(0.03, 0.03, 0.032), bone='head'),
    dict(t='cap', a=(0, 0.01, 0.11), b2=(0, 0.004, 0.135), r=(0.02, 0.012), bone='head'),
]
bones = [('hips', None, (0, 0.0, -0.06), (0, 0.0, 0.02)), ('chest', 'hips', (0, 0.0, 0.02), (0, 0.006, 0.07)),
         ('head', 'chest', (0, 0.01, 0.075), (0, 0.006, 0.14))]
FUR, FUR2, MEM, MEM2, PALE = srgb('#6a4a32'), srgb('#4a3424'), srgb('#3a2a22'), srgb('#5a4234'), srgb('#d8c8b0')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 120, y * 120, z * 120)))
    c = mix(FUR, FUR2, 0.3 + 0.35 * n)
    if y < -0.015: c = mix(c, mix(FUR, PALE, 0.3), 0.6)
    if z > 0.09:   # pale stripes above and below the eye
        for yy in (0.03, 0.006):
            c = mix(c, PALE, 0.8 * math.exp(-((abs(x) - 0.017) ** 2 / 0.006 ** 2 + (y - yy) ** 2 / 0.003 ** 2)))
    return c
def wcol(s, c, top):
    k = math.sin((s * 3 + c * 1.2) * 4.2)
    return mix(MEM, MEM2, 0.35 + 0.3 * k) if top else mix(MEM2, MEM, 0.4)

parts = []
for sx, L in ((1, 'l'), (-1, 'r')):
    wp, wb = wing_part(L, sx, (sx * 0.03, 0.012, 0.045), 0.34, 0.2, wcol, sweep=-0.02, thick=0.004, tip=0.8, fingers=3, fdepth=0.6, cols=6, rows=16)
    parts.append(wp); bones += wb
    parts += eye_parts((sx * 0.018, 0.024, 0.115), 0.0075, 'head', '#050403', (sx, 0.3, 0.6))
    parts.append(ear_part((sx * 0.02, 0.035, 0.09), (sx * 0.5, 1, -0.2), 0.012, 0.024, 'head', FUR2, srgb('#6a5040'), thick=0.002, cup=0.4))
    # hind legs + claws (they hold the branch when hanging)
    lg = Part('leg', bone='hips', color=FUR2); b = Vector((sx * 0.02, -0.01, -0.06))
    lg.add(*tube([b, b + Vector((sx * 0.012, -0.012, -0.03)), b + Vector((sx * 0.012, -0.016, -0.05))], [0.005, 0.004, 0.003], 4))
    parts.append(lg)
leaf = Part('noseleaf', bone='head', color=srgb('#5a3a2a')); leaf.add(*ellipsoid((0, 0.016, 0.137), (0.005, 0.012, 0.003), 6, 4)); parts.append(leaf)

FEET_Y = 0.04
def S(x): return math.sin(TAU * x)
def folded(p, k=1.0, wrap=0.0):
    for L, s in (('l', 1), ('r', -1)):
        p['w%s1' % L] = (-50 * k, s * 70 * k, s * (-20 - 40 * wrap) * k); p['w%s2' % L] = (0, s * -150 * k, 0); p['w%s3' % L] = (0, s * 140 * k, 0)
    return p
HANG = ((90, 0, 0), (0, 0, 0.08))
def hang(ph):
    look = S(ph) * smooth(0.1, 0.25, ph) * smooth(0.9, 0.75, ph)
    p = folded({'hips': (HANG[0], (0, 0.004 * S(ph * 2), 0.08)), 'head': (-60, 30 * look, 0), 'chest': (0, 0, 0)})
    return p
def eat(ph):
    p = hang(ph); p['head'] = (-70 + 8 * max(0, S(ph * 6)), 0, 0); return p
def sleep(ph):
    p = folded({'hips': (HANG[0], (0, 0, 0.08)), 'head': (-10, 0, 0)}, 1.0, wrap=1.0); return p
def fly(ph):
    u = TAU * ph; down = math.cos(u)
    p = {'hips': ((-2 + 4 * math.sin(u), 0, 0), (0, -0.004 * math.sin(u), 0)), 'head': (-4, 0, 0)}
    for L, s in (('l', 1), ('r', -1)):
        fold = max(0, math.sin(u + 0.6))
        p['w%s1' % L] = (8 * math.sin(u), s * 10 * fold, s * 50 * down)
        p['w%s2' % L] = (0, s * -30 * fold, s * 20 * math.cos(u - 0.7))
        p['w%s3' % L] = (-10 * math.sin(u), s * 40 * fold, s * 22 * math.cos(u - 1.2))
    return p
def glide(ph):
    p = {'hips': ((-3, 0, 2 * S(ph)), None)}
    for L, s in (('l', 1), ('r', -1)): p['w%s1' % L] = (0, 0, s * (6 + 2 * S(ph))); p['w%s3' % L] = (-4, 0, s * -6)
    return p
SPEC = dict(id='fruitbat', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.0025, tris=1300, smooth=10,
            actions={'hang': (150, hang), 'eat': (48, eat), 'sleep': (90, sleep), 'fly': (12, fly), 'glide': (60, glide)},
            meta=dict(height=0.12, length=0.8, speeds={'fly': 5}, gripY={'hang': FEET_Y},
                      map={'idle': 'hang', 'perch': 'hang', 'hover': 'fly', 'walk': 'hang'}))
