# צפרדע חץ (Dendrobates tinctorius "azureus") – sky-blue frog with black spots, darker blue legs, big glossy black eyes, toe pads.
blobs = [
    dict(t='ell', c=(0, 0.085, -0.02), r=(0.07, 0.058, 0.095), rot=(-22, 0, 0), bone='hips'),
    dict(t='ell', c=(0, 0.1, 0.06), r=(0.068, 0.05, 0.065), bone='chest'),
    dict(t='ell', c=(0, 0.105, 0.105), r=(0.06, 0.042, 0.05), bone='head'),
    dict(t='ell', c=(0, 0.098, 0.135), r=(0.04, 0.03, 0.03), bone='head'),
    # eye bumps
    dict(t='ell', c=(0.04, 0.128, 0.1), r=(0.022, 0.02, 0.022), bone='head'),
    dict(t='ell', c=(-0.04, 0.128, 0.1), r=(0.022, 0.02, 0.022), bone='head'),
]
for sx, L in ((1, 'l'), (-1, 'r')):
    blobs += [
        dict(t='cap', a=(sx * 0.045, 0.08, 0.07), b2=(sx * 0.072, 0.045, 0.085), r=(0.016, 0.012), bone='f' + L),
        dict(t='cap', a=(sx * 0.072, 0.045, 0.085), b2=(sx * 0.068, 0.008, 0.11), r=(0.011, 0.008), bone='f' + L + '2'),
        dict(t='cap', a=(sx * 0.05, 0.06, -0.08), b2=(sx * 0.11, 0.035, -0.02), r=(0.024, 0.016), bone='h' + L),
        dict(t='cap', a=(sx * 0.11, 0.035, -0.02), b2=(sx * 0.085, 0.022, -0.1), r=(0.015, 0.01), bone='h' + L + '2'),
        dict(t='cap', a=(sx * 0.085, 0.015, -0.1), b2=(sx * 0.11, 0.008, -0.04), r=(0.009, 0.007), bone='h' + L + '3'),
    ]
bones = [('hips', None, (0, 0.07, -0.1), (0, 0.09, 0.02)), ('chest', 'hips', (0, 0.09, 0.02), (0, 0.1, 0.08)),
         ('head', 'chest', (0, 0.1, 0.08), (0, 0.098, 0.16))]
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', (sx * 0.045, 0.08, 0.07), (sx * 0.072, 0.045, 0.085)),
              ('f' + L + '2', 'f' + L, (sx * 0.072, 0.045, 0.085), (sx * 0.068, 0.0, 0.115)),
              ('h' + L, 'hips', (sx * 0.05, 0.06, -0.08), (sx * 0.11, 0.035, -0.02)),
              ('h' + L + '2', 'h' + L, (sx * 0.11, 0.035, -0.02), (sx * 0.085, 0.018, -0.1)),
              ('h' + L + '3', 'h' + L + '2', (sx * 0.085, 0.018, -0.1), (sx * 0.115, 0.004, -0.03))]

SKY, SKY2, NAVY, BLACK, BELLY = srgb('#3f8fe0'), srgb('#6fb4f0'), srgb('#1d3f9a'), srgb('#0b0d14'), srgb('#5a86c8')
def paint(P, N, tag):
    x, y, z = P
    d, rid = worley(P, 44, 5)
    limb = smooth(0.045, 0.065, abs(x)) if y < 0.075 else 0.0
    c = mix(SKY, SKY2, 0.4 * smooth(0.11, 0.15, y))
    c = mix(c, NAVY, max(limb, smooth(0.06, 0.035, y) * 0.8))
    if N.y < -0.4: c = mix(c, BELLY, 0.6)
    sp = smooth(0.42 + 0.12 * rid, 0.32 + 0.12 * rid, d) * (1 if rid > 0.25 else 0)
    c = mix(c, BLACK, sp * (1 if y > 0.05 or limb > 0.5 else 0.6))
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.046, 0.132, 0.105), 0.018, 'head', '#06070c', (sx, 0.5, 0.5))
    # toe pads: little round discs on the fingers and toes
    for leg, base, n, fan in (('f', (sx * 0.068, 0.006, 0.112), 4, 0.5), ('h', (sx * 0.11, 0.005, -0.04), 5, 0.6)):
        bone = leg + ('l' if sx > 0 else 'r') + ('2' if leg == 'f' else '3')
        t = Part('toe', bone=bone, color=NAVY)
        for k in range(n):
            a = (k / (n - 1) - 0.5) * fan * 2 + (0.2 * sx if leg == 'h' else 0)
            d = Vector((math.sin(a), 0, math.cos(a)))
            tip = Vector(base) + d * (0.022 if leg == 'f' else 0.03)
            t.add(*tube([base, tuple(tip)], [0.0035, 0.003], 4, cap0=False, cap1=False))
            t.add(*ellipsoid(tuple(tip), (0.0055, 0.003, 0.0055), 6, 4))
        parts.append(t)

def S(x): return math.sin(TAU * x)
def hop(ph, k=1.0):
    # crouched (0) → legs kick back, body rises and arcs (0.15–0.55) → lands and folds (0.6–1)
    up = max(0, math.sin(math.pi * min(1, max(0, (ph - 0.12) / 0.5))))
    ext = smooth(0.08, 0.2, ph) * smooth(0.55, 0.35, ph)
    p = {'hips': ((-12 * up * k + 6 * ext, 0, 0), (0, 0.05 * up * k, 0)), 'chest': (-6 * up, 0, 0), 'head': (6 * up, 0, 0)}
    for L in ('l', 'r'):
        s = 1 if L == 'l' else -1
        p['h' + L] = (70 * ext * k, 0, s * -8 * ext)
        p['h' + L + '2'] = (-90 * ext * k, 0, 0)
        p['h' + L + '3'] = (80 * ext * k, 0, 0)
        p['f' + L] = (-30 * up, 0, 0); p['f' + L + '2'] = (-20 * up, 0, 0)
    return p
def walk(ph): return hop(ph, 0.7)
def run(ph): return hop(ph, 1.0)
def idle(ph):
    th = S(ph * 8) * 0.5 + 0.5
    look = S(ph) * smooth(0.3, 0.45, ph) * smooth(0.9, 0.75, ph)
    return {'hips': ((0, 0, 0), (0, 0.002 * th, 0)), 'chest': (0, 4 * look, 0), 'head': (-3 * th, 10 * look, 0)}
def eat(ph):      # quick lunge at a tiny insect, then settles
    l = smooth(0.0, 0.1, ph) * smooth(0.3, 0.15, ph)
    return {'hips': ((-6 * l, 0, 0), (0, 0.01 * l, 0.01 * l)), 'chest': (10 * l, 0, 0), 'head': (14 * l, 0, 0)}
def sleep(ph):
    return {'hips': ((4, 0, 0), (0, -0.012 + 0.001 * S(ph), 0)), 'head': (8, 0, 0), 'fl': (10, 0, 0), 'fr': (10, 0, 0)}
def swim(ph):
    k = max(0, S(ph))
    p = {'hips': ((10, 0, 0), None)}
    for L in ('l', 'r'):
        p['h' + L] = (60 * k, 0, 0); p['h' + L + '2'] = (-70 * k, 0, 0); p['h' + L + '3'] = (50 * k, 0, 0)
        p['f' + L] = (40, 0, 0)
    return p

SPEC = dict(id='dartfrog', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.0025, tris=2800, smooth=10,
            actions={'idle': (120, idle), 'walk': (20, walk), 'run': (16, run), 'eat': (40, eat), 'sleep': (90, sleep), 'swim': (24, swim)},
            meta=dict(height=0.16, length=0.32, speeds={'walk': 0.4, 'run': 1.0}, map={'climb': 'walk', 'sit': 'idle'}))
