# חרדון צב (Uromastyx aegyptia) – modelled on its own: a big, heavy plant-eating lizard with a broad flat body, a blunt
# rounded head like a tortoise's, small stout legs with strong claws, and a thick, short, flattened tail ringed with
# whorls of spines. Sandy yellow to olive with fine dark speckles; dark when cold in the morning, paler in the heat.
own('uromastyx')
TAIL = [(0, 0.05, -0.1), (0, 0.042, -0.18), (0, 0.032, -0.26), (0, 0.022, -0.33), (0, 0.014, -0.39)]
blobs = [
    dict(t='ell', c=(0, 0.055, -0.02), r=(0.075, 0.04, 0.11), bone='hips'),          # a broad, flat, heavy body
    dict(t='ell', c=(0, 0.058, 0.07), r=(0.062, 0.038, 0.06), bone='chest'),
    dict(t='ell', c=(0, 0.06, 0.13), r=(0.042, 0.032, 0.04), bone='head'),           # a blunt, rounded head
    dict(t='ell', c=(0, 0.058, 0.162), r=(0.034, 0.026, 0.03), bone='head'),
    dict(t='cap', a=TAIL[0], b2=TAIL[1], r=(0.045, 0.036), bone='tail1'),            # the thick tail
    dict(t='cap', a=TAIL[1], b2=TAIL[2], r=(0.036, 0.026), bone='tail2'),
    dict(t='cap', a=TAIL[2], b2=TAIL[3], r=(0.026, 0.016), bone='tail3'),
    dict(t='cap', a=TAIL[3], b2=TAIL[4], r=(0.016, 0.006), bone='tail4'),
]
for sx, L in ((1, 'l'), (-1, 'r')):
    blobs += [
        dict(t='cap', a=(sx * 0.05, 0.05, 0.075), b2=(sx * 0.09, 0.04, 0.085), r=(0.018, 0.014), bone='f' + L),
        dict(t='cap', a=(sx * 0.09, 0.04, 0.085), b2=(sx * 0.098, 0.008, 0.1), r=(0.013, 0.01), bone='f' + L + '2'),
        dict(t='cap', a=(sx * 0.06, 0.046, -0.06), b2=(sx * 0.105, 0.04, -0.06), r=(0.022, 0.016), bone='h' + L),
        dict(t='cap', a=(sx * 0.105, 0.04, -0.06), b2=(sx * 0.112, 0.008, -0.085), r=(0.014, 0.011), bone='h' + L + '2'),
    ]
bones = [('hips', None, (0, 0.05, -0.1), (0, 0.055, 0.03)), ('chest', 'hips', (0, 0.055, 0.03), (0, 0.058, 0.1)),
         ('head', 'chest', (0, 0.06, 0.1), (0, 0.056, 0.195))] + chain('tail', TAIL, 'hips')
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', (sx * 0.05, 0.05, 0.075), (sx * 0.09, 0.04, 0.085)), ('f' + L + '2', 'f' + L, (sx * 0.09, 0.04, 0.085), (sx * 0.098, 0.0, 0.102)),
              ('h' + L, 'hips', (sx * 0.06, 0.046, -0.06), (sx * 0.105, 0.04, -0.06)), ('h' + L + '2', 'h' + L, (sx * 0.105, 0.04, -0.06), (sx * 0.112, 0.0, -0.088))]
EYE['uromastyx'] = ('#3a2a14', 'round', 0.84, 0.55)

YEL, OCHRE, OLIVE, SPECK, BELLY = srgb('#d8b45a'), srgb('#c09a44'), srgb('#9a8a52'), srgb('#4a3a22'), srgb('#e6d6a8')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 60, y * 60, z * 60)))
    c = mix(YEL, OCHRE, 0.35 + 0.3 * n)
    c = mix(c, OLIVE, smooth(0.0, 0.6, noise.noise(Vector((x * 14, y * 14, z * 14)))) * 0.5)
    d, rid = worley(P, 180, 11)
    c = mix(c, SPECK, smooth(0.3, 0.15, d) * (rid > 0.55) * 0.7)                    # fine dark speckles
    if N.y < -0.45: c = mix(c, BELLY, 0.7)
    if z < -0.1: c = mix(c, OCHRE, 0.3)
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.033, 0.072, 0.155), 0.0062, 'head', '#3a2a14', (sx, 0.3, 0.3))
    for base, bone in (((sx * 0.1, 0.004, 0.103), 'f%s2'), ((sx * 0.113, 0.004, -0.09), 'h%s2')):
        t = Part('toe', bone=bone % ('l' if sx > 0 else 'r'), color=srgb('#3a3024'))
        for k in range(5):
            a = (k / 4 - 0.5) * 1.0 + sx * 0.35
            d = Vector((math.sin(a), 0, math.cos(a))); tip = Vector(base) + d * 0.016
            t.add(*tube([base, tuple(tip)], [0.003, 0.0012], 4, cap0=False, cap1=True))
        parts.append(t)
# whorls of spines round the tail: short, broad spikes in rings, pointing back
sp = Part('spine', bones=['tail1', 'tail2', 'tail3', 'tail4'], color=srgb('#b8944a'))
for i in range(11):
    t = i / 10; z = -0.11 - t * 0.27
    cy = 0.05 - t * 0.034; R = 0.044 * (1 - t) + 0.01
    for k in range(9):
        a = math.pi * (0.1 + 0.8 * k / 8)                                   # the top half and the sides of the tail
        b = Vector((math.cos(a) * R * 1.05, cy + math.sin(a) * R * 0.8, z))
        out = Vector((math.cos(a), math.sin(a) * 0.8, 0)).normalized()
        sp.add([tuple(b + Vector((0, 0, 0.006))), tuple(b + Vector((0, 0, -0.004)) + out * 0.002), tuple(b + out * 0.008 + Vector((0, 0, -0.01)))], [(0, 1, 2), (1, 0, 2)])
parts.append(sp)

def S(x): return math.sin(TAU * x)
def legs(ph, amp):
    p = {}
    for L, o in (('fl', 0), ('hr', 0), ('fr', 0.5), ('hl', 0.5)):
        p[L] = (0, (1 if L[1] == 'l' else -1) * amp * S(ph + o), 10 * max(0, S(ph + o + 0.25)))
    return p
def walk(ph):
    p = legs(ph, 28); p['hips'] = ((0, 6 * S(ph), 0), (0, 0, 0)); p['chest'] = (0, -6 * S(ph), 0)
    for i in range(1, 5): p['tail%d' % i] = (0, 8 * S(ph - 0.1 * i), 0)
    return p
def run(ph):
    p = legs(ph, 40); p['hips'] = ((0, 9 * S(ph), 0), (0, 0.004, 0)); return p
def idle(ph):     # basking, the head raised now and then
    return {'head': (-6 * max(0, S(ph * 2)), 0, 0), 'tail3': (0, 4 * S(ph), 0)}
def eat(ph): return {'head': (14 + 8 * S(ph * 3), 0, 0)}
def sleep(ph): return {'head': (8, 0, 0), 'tail1': (0, 20, 0), 'tail2': (0, 20, 0)}
SPEC = dict(id='uromastyx', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.003, tris=2600, smooth=10, skin='scale',
            actions={'idle': (120, idle), 'walk': (24, walk), 'run': (14, run), 'eat': (40, eat), 'sleep': (90, sleep)},
            meta=dict(height=0.12, length=0.6, speeds={'walk': 0.35, 'run': 1.6}, map={'climb': 'walk', 'swim': 'walk', 'sit': 'idle', 'perch': 'idle'}))
