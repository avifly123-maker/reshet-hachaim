# קיפוד (Erinaceus concolor) – round body under a coat of banded spines, pointed snout, shiny nose, quick trot.
BC, BR = (0, 0.15, 0.0), (0.15, 0.13, 0.2)          # body ellipsoid (spine coat sits on it)

blobs = [
    dict(t='ell', c=BC, r=BR, bone='hips', w=1.0),
    dict(t='ell', c=(0, 0.145, 0.07), r=(0.13, 0.11, 0.11), bone='chest'),
    dict(t='ell', c=(0, 0.125, 0.175), r=(0.068, 0.066, 0.075), bone='head'),
    dict(t='cap', a=(0, 0.115, 0.2), b2=(0, 0.092, 0.285), r=(0.045, 0.015), bone='head'),
    dict(t='ell', c=(0, 0.085, 0.0), r=(0.11, 0.05, 0.17), bone='hips'),       # belly
    # short legs with little paws
    dict(t='cap', a=(0.075, 0.08, 0.1), b2=(0.08, 0.015, 0.12), r=(0.028, 0.02), bone='fl'),
    dict(t='ell', c=(0.08, 0.01, 0.13), r=(0.022, 0.011, 0.028), bone='fl'),
    dict(t='cap', a=(-0.075, 0.08, 0.1), b2=(-0.08, 0.015, 0.12), r=(0.028, 0.02), bone='fr'),
    dict(t='ell', c=(-0.08, 0.01, 0.13), r=(0.022, 0.011, 0.028), bone='fr'),
    dict(t='cap', a=(0.08, 0.08, -0.12), b2=(0.085, 0.015, -0.11), r=(0.032, 0.022), bone='hl'),
    dict(t='ell', c=(0.085, 0.01, -0.1), r=(0.023, 0.011, 0.03), bone='hl'),
    dict(t='cap', a=(-0.08, 0.08, -0.12), b2=(-0.085, 0.015, -0.11), r=(0.032, 0.022), bone='hr'),
    dict(t='ell', c=(-0.085, 0.01, -0.1), r=(0.023, 0.011, 0.03), bone='hr'),
]
bones = [
    ('hips', None, (0, 0.14, -0.15), (0, 0.15, 0.0)),
    ('chest', 'hips', (0, 0.15, 0.0), (0, 0.14, 0.13)),
    ('head', 'chest', (0, 0.13, 0.14), (0, 0.1, 0.29)),
    ('fl', 'chest', (0.075, 0.085, 0.1), (0.08, 0.005, 0.125)),
    ('fr', 'chest', (-0.075, 0.085, 0.1), (-0.08, 0.005, 0.125)),
    ('hl', 'hips', (0.08, 0.085, -0.12), (0.085, 0.005, -0.105)),
    ('hr', 'hips', (-0.08, 0.085, -0.12), (-0.085, 0.005, -0.105)),
]

CREAM, BAND, SPTIP, MIDB = srgb('#e9dfc9'), srgb('#3a2a1b'), srgb('#efe6d2'), srgb('#8a6c4c')
def spines():
    p = Part('spine', bones=['hips', 'chest'])
    n_extra = 0
    rnd = random.Random(5); n = 480; ga = math.pi * (3 - math.sqrt(5)); placed = 0
    for i in range(n * 3):
        if placed >= n: break
        yy = 1 - (i / (n * 3 - 1)) * 2; rr = math.sqrt(max(0, 1 - yy * yy)); th = ga * i
        d = Vector((math.cos(th) * rr, yy, math.sin(th) * rr))
        P = Vector((BC[0] + d.x * BR[0], BC[1] + d.y * BR[1], BC[2] + d.z * BR[2]))
        # coat: back and flanks down to the legs, forward to the "crown" just behind the ears
        if P.y < 0.095 or P.z > 0.1 + (P.y - 0.15) * 0.9: continue
        nrm = Vector(((P.x - BC[0]) / BR[0] ** 2, (P.y - BC[1]) / BR[1] ** 2, (P.z - BC[2]) / BR[2] ** 2)).normalized()
        dirn = (nrm * 0.45 + Vector((0, 0.08, -1)) * 0.7 + Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1))) * 0.13).normalized()
        L = 0.06 + rnd.uniform(-0.01, 0.012)
        base = P - nrm * 0.008; tip = base + dirn * L
        u, w = _frame(dirn); r0 = 0.0068
        V = []; C = []
        for (c, r, col) in ((base, r0, BAND), (base + dirn * L * 0.6, r0 * 0.6, MIDB)):
            for j in range(3):
                a = TAU * j / 3 + rnd.random(); V.append(tuple(c + (u * math.cos(a) + w * math.sin(a)) * r)); C.append(col)
        V.append(tuple(tip)); C.append(SPTIP)
        F = []
        for j in range(3):
            jn = (j + 1) % 3; F.append((j, jn, 3 + jn, 3 + j))
        for j in range(3): F.append((3 + j, 3 + (j + 1) % 3, 6))
        p.add(V, F, C); placed += 1
    return p

SKIN, FUR, FACE, MASK, PAW = srgb('#8a6a4a'), srgb('#a98a66'), srgb('#d8c4a0'), srgb('#4a3424'), srgb('#5a4030')
UNDER = srgb('#4a3826')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 50, y * 50, z * 50)))
    c = mix(FUR, SKIN, 0.4 + 0.3 * n)
    # under the coat: dark, so the gaps between the spines read as a dense coat
    coat = smooth(0.09, 0.12, y) * smooth(0.05, 0.0, z - (0.1 + (y - 0.15) * 0.9))
    c = mix(c, UNDER, coat)
    if z > 0.16:                                      # face: pale, with a dark "mask" around the eyes
        c = mix(c, FACE, smooth(0.16, 0.22, z) * 0.85)
        m = math.exp(-(((abs(x) - 0.04) / 0.03) ** 2 + ((y - 0.14) / 0.025) ** 2 + ((z - 0.205) / 0.04) ** 2))
        c = mix(c, MASK, 0.7 * m)
    if y < 0.06: c = mix(c, PAW, smooth(0.06, 0.02, y))
    return c

parts = [spines()]
parts += eye_parts((0.038, 0.145, 0.212), 0.012, 'head', '#0a0806', (1, 0.3, 0.7))
parts += eye_parts((-0.038, 0.145, 0.212), 0.012, 'head', '#0a0806', (-1, 0.3, 0.7))
nose = Part('nose', bone='head', mat=1, color=srgb('#141010')); nose.add(*ellipsoid((0, 0.093, 0.29), (0.014, 0.012, 0.012), 8, 5)); parts.append(nose)
for sx in (1, -1):
    ear = Part('ear', bone='head', color=srgb('#9c7a5a'))
    ear.add(*ellipsoid((sx * 0.055, 0.178, 0.165), (0.008, 0.022, 0.02), 8, 5, rot=(0, sx * 25, sx * -20)))
    parts.append(ear)

def S(x): return math.sin(TAU * x)
def walk(ph):
    p = {}
    for leg, off in (('fl', 0), ('hr', 0), ('fr', 0.5), ('hl', 0.5)):
        u = (ph + off) % 1
        p[leg] = (-28 * -math.cos(TAU * u) * -1 if False else 28 * math.cos(TAU * u), 0, 0)
    p['hips'] = ((0, 0, 3 * S(ph)), (0, 0.006 * abs(S(ph * 2 + 0.25)), 0))
    p['chest'] = (2 * S(ph * 2), 2 * S(ph), 0)
    p['head'] = (-3 + 4 * S(ph * 2 + 0.3), 4 * S(ph), 0)
    return p
def idle(ph):
    sniff = max(0, S(ph * 6)) * smooth(0.2, 0.3, ph) * smooth(0.6, 0.5, ph)
    look = S(ph) * smooth(0.0, 0.15, ph)
    return {'hips': ((0, 0, 0), (0, 0.003 * S(ph * 4), 0)), 'head': (-6 * sniff + 8 * S(ph * 2) * 0.3, 22 * look, 0), 'chest': (0, 6 * look, 0)}
def eat(ph):
    ch = max(0, S(ph * 4))
    return {'chest': (12, 0, 0), 'head': (28 + 8 * ch, 6 * S(ph), 0), 'fl': (-10, 0, 0), 'fr': (-10, 0, 0)}
def sleep(ph):
    b = S(ph)
    return {'hips': ((-8, 0, 0), (0, -0.05 + 0.003 * b, -0.01)), 'chest': (25, 0, 0), 'head': (60, 0, 0),
            'fl': (-50, 0, 0), 'fr': (-50, 0, 0), 'hl': (45, 0, 0), 'hr': (45, 0, 0)}

SPEC = dict(id='hedgehog', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.006, tris=1800,
            actions={'idle': (120, idle), 'walk': (20, walk), 'eat': (40, eat), 'sleep': (90, sleep)},
            meta=dict(height=0.3, length=0.45, speeds={'walk': 0.35, 'run': 0.8}, map={'run': 'walk', 'swim': 'walk', 'sit': 'idle'}))
