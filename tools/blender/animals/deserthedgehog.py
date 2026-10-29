# קיפוד מדבר (Paraechinus aethiopicus) – traced from a side photo of a desert hedgehog (Wikimedia Commons, Museo Civico
# di Storia Naturale Giacomo Doria, 29.10; tools/blender/refs/deserthedgehog.png). What the photo shows (the first
# model wore its spines as a crest on a smooth body): a high dome of spines that covers the whole back and the sides
# down to just above the legs, from the crown behind the ears to the rump; a small pointed head held low with a long
# snout, a dark mask, big ears; thin dark legs. Pale spines with dark bands, a pale face, a cream belly.
own('deserthedgehog')
EYE['deserthedgehog'] = ('#0a0806', 'round', 0.9, 0.7)
BC, BR = (0, 0.112, -0.015), (0.115, 0.085, 0.13)          # the dome the spines sit on (photo: 1.3 times longer than high)
blobs = [
    dict(t='ell', c=BC, r=BR, bone='hips'),
    dict(t='ell', c=(0, 0.1, 0.05), r=(0.09, 0.065, 0.08), bone='chest'),
    dict(t='ell', c=(0, 0.06, -0.01), r=(0.09, 0.035, 0.12), bone='hips'),                       # the soft belly
    dict(t='ell', c=(0, 0.088, 0.125), r=(0.045, 0.045, 0.052), bone='head'),                         # the head, small and held low
    dict(t='cap', a=(0, 0.08, 0.15), b2=(0, 0.06, 0.215), r=(0.032, 0.011), bone='head'),         # the long snout
    # thin legs with small dark paws
    dict(t='cap', a=(0.06, 0.06, 0.08), b2=(0.065, 0.008, 0.095), r=(0.016, 0.01), bone='fl'),
    dict(t='ell', c=(0.065, 0.006, 0.105), r=(0.014, 0.007, 0.02), bone='fl'),
    dict(t='cap', a=(-0.06, 0.06, 0.08), b2=(-0.065, 0.008, 0.095), r=(0.016, 0.01), bone='fr'),
    dict(t='ell', c=(-0.065, 0.006, 0.105), r=(0.014, 0.007, 0.02), bone='fr'),
    dict(t='cap', a=(0.065, 0.06, -0.1), b2=(0.07, 0.008, -0.09), r=(0.018, 0.011), bone='hl'),
    dict(t='ell', c=(0.07, 0.006, -0.08), r=(0.014, 0.007, 0.022), bone='hl'),
    dict(t='cap', a=(-0.065, 0.06, -0.1), b2=(-0.07, 0.008, -0.09), r=(0.018, 0.011), bone='hr'),
    dict(t='ell', c=(-0.07, 0.006, -0.08), r=(0.014, 0.007, 0.022), bone='hr'),
]
bones = [
    ('hips', None, (0, 0.11, -0.14), (0, 0.112, 0.0)),
    ('chest', 'hips', (0, 0.112, 0.0), (0, 0.1, 0.1)),
    ('head', 'chest', (0, 0.1, 0.1), (0, 0.06, 0.235)),
    ('fl', 'chest', (0.06, 0.065, 0.08), (0.065, 0.0, 0.1)),
    ('fr', 'chest', (-0.06, 0.065, 0.08), (-0.065, 0.0, 0.1)),
    ('hl', 'hips', (0.065, 0.065, -0.1), (0.07, 0.0, -0.085)),
    ('hr', 'hips', (-0.065, 0.065, -0.1), (-0.07, 0.0, -0.085)),
]

SKIN, FUR, FACE, MASK, PAW, CREAM = srgb('#a88a68'), srgb('#c8b494'), srgb('#d8c8b0'), srgb('#5a4430'), srgb('#4a3424'), srgb('#efe4d0')
BAND, MIDB, SPTIP, UNDER = srgb('#7a5c3c'), srgb('#c8a874'), srgb('#eadcb8'), srgb('#6a5236')
SK = 1.1
def crown(P):    # the front edge of the spine coat: just behind the ears, lower on the sides
    return 0.075 + (P.y - 0.11) * 0.8
def spines():
    p = Part('spine', bones=['hips', 'chest'])
    rnd = random.Random(7); n = 1000; ga = math.pi * (3 - math.sqrt(5)); placed = 0
    for i in range(n):   # every point of the sphere is tried (a cap on the count stopped the coat at the top of the back)
        yy = 1 - (i / (n - 1)) * 2; rr = math.sqrt(max(0, 1 - yy * yy)); th = ga * i
        d = Vector((math.cos(th) * rr, yy, math.sin(th) * rr))
        P = Vector((BC[0] + d.x * BR[0] * SK, BC[1] + d.y * BR[1] * SK, BC[2] + d.z * BR[2] * SK))   # on the skin, which the metaballs swell a little past the dome
        if P.y < 0.055 or P.z > crown(P): continue          # the whole dome, down to just above the legs
        nrm = Vector(((P.x - BC[0]) / BR[0] ** 2, (P.y - BC[1]) / BR[1] ** 2, (P.z - BC[2]) / BR[2] ** 2)).normalized()
        dirn = (nrm * 0.42 + Vector((0, 0.05, -1)) * 0.72 + Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1))) * 0.13).normalized()
        L = 0.04 + rnd.uniform(-0.006, 0.008)
        base = P - nrm * 0.006; tip = base + dirn * L
        u, w = _frame(dirn); r0 = 0.0062
        V = []; C = []
        for (c, r, col) in ((base, r0, BAND), (base + dirn * L * 0.55, r0 * 0.6, MIDB)):
            for j in range(3):
                a = TAU * j / 3 + rnd.random(); V.append(tuple(c + (u * math.cos(a) + w * math.sin(a)) * r)); C.append(col)
        V.append(tuple(tip)); C.append(SPTIP)
        F = []
        for j in range(3):
            jn = (j + 1) % 3; F.append((j, jn, 3 + jn, 3 + j))
        for j in range(3): F.append((3 + j, 3 + (j + 1) % 3, 6))
        p.add(V, F, C); placed += 1
    return p

def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 50, y * 50, z * 50)))
    c = mix(FUR, SKIN, 0.35 + 0.3 * n)
    coat = smooth(0.05, 0.07, y) * smooth(0.03, 0.0, z - crown(Vector(P)))    # dark under the coat, so the gaps read as a dense coat
    c = mix(c, UNDER, coat * 0.9)
    c = mix(c, CREAM, smooth(0.06, 0.04, y) * 0.7)                                # cream belly
    if z > 0.1:                                                                    # a pale face with a dark mask round the eyes and down the snout
        c = mix(c, FACE, smooth(0.1, 0.15, z) * 0.85)
        m = math.exp(-(((abs(x) - 0.03) / 0.025) ** 2 + ((y - 0.095) / 0.02) ** 2 + ((z - 0.165) / 0.04) ** 2))
        c = mix(c, MASK, 0.75 * m)
        c = mix(c, MASK, smooth(0.17, 0.215, z) * 0.7)
    if y < 0.05 and abs(x) > 0.045: c = mix(c, PAW, smooth(0.05, 0.02, y))         # dark legs
    return c

parts = [spines()]
parts += eye_parts((0.03, 0.1, 0.168), 0.0085, 'head', '#0a0806', (1, 0.3, 0.7))
parts += eye_parts((-0.03, 0.1, 0.168), 0.0085, 'head', '#0a0806', (-1, 0.3, 0.7))
nose = Part('nose', bone='head', mat=1, color=srgb('#141010')); nose.add(*ellipsoid((0, 0.06, 0.217), (0.011, 0.009, 0.009), 8, 5)); parts.append(nose)
for sx in (1, -1):   # the desert hedgehog's big ears
    ear = Part('ear', bone='head', color=srgb('#b08a68'))
    ear.add(*ellipsoid((sx * 0.045, 0.135, 0.11), (0.007, 0.03, 0.024), 10, 6, rot=(0, sx * 30, sx * -22)))
    parts.append(ear)

def S(x): return math.sin(TAU * x)
def walk(ph):
    p = {}
    for leg, off in (('fl', 0), ('hr', 0), ('fr', 0.5), ('hl', 0.5)):
        u = (ph + off) % 1
        p[leg] = (28 * math.cos(TAU * u), 0, 0)
    p['hips'] = ((0, 0, 3 * S(ph)), (0, 0.005 * abs(S(ph * 2 + 0.25)), 0))
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
    return {'hips': ((-8, 0, 0), (0, -0.04 + 0.003 * b, -0.01)), 'chest': (25, 0, 0), 'head': (60, 0, 0),
            'fl': (-50, 0, 0), 'fr': (-50, 0, 0), 'hl': (45, 0, 0), 'hr': (45, 0, 0)}

SPEC = dict(id='deserthedgehog', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.0055, tris=1900,
            actions={'idle': (120, idle), 'walk': (20, walk), 'eat': (40, eat), 'sleep': (90, sleep)},
            meta=dict(height=0.28, length=0.42, scale=0.92, speeds={'walk': 0.35, 'run': 0.8}, map={'run': 'walk', 'swim': 'walk', 'sit': 'idle'}))
