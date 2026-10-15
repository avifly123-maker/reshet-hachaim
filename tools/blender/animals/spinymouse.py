# קוצן מצוי (Acomys cahirinus) – small mouse with a spiny rump, big round ears, big dark eyes, long thin tail, white belly.
blobs = [
    dict(t='ell', c=(0, 0.062, -0.035), r=(0.046, 0.046, 0.07), bone='hips'),
    dict(t='ell', c=(0, 0.06, 0.03), r=(0.04, 0.042, 0.052), bone='chest'),
    dict(t='ell', c=(0, 0.072, 0.085), r=(0.031, 0.031, 0.036), bone='head'),
    dict(t='cap', a=(0, 0.068, 0.1), b2=(0, 0.058, 0.142), r=(0.024, 0.009), bone='head'),
    # hind legs: big thighs, long feet
    dict(t='ell', c=(0.034, 0.048, -0.062), r=(0.02, 0.03, 0.034), bone='hl'),
    dict(t='cap', a=(0.036, 0.02, -0.07), b2=(0.038, 0.006, -0.035), r=(0.009, 0.006), bone='hl'),
    dict(t='ell', c=(-0.034, 0.048, -0.062), r=(0.02, 0.03, 0.034), bone='hr'),
    dict(t='cap', a=(-0.036, 0.02, -0.07), b2=(-0.038, 0.006, -0.035), r=(0.009, 0.006), bone='hr'),
    dict(t='cap', a=(0.024, 0.045, 0.045), b2=(0.027, 0.005, 0.058), r=(0.009, 0.006), bone='fl'),
    dict(t='cap', a=(-0.024, 0.045, 0.045), b2=(-0.027, 0.005, 0.058), r=(0.009, 0.006), bone='fr'),
]
TAILP = [(0, 0.05, -0.095), (0, 0.042, -0.15), (0, 0.025, -0.21), (0, 0.012, -0.27), (0, 0.01, -0.31)]
bones = [
    ('hips', None, (0, 0.06, -0.09), (0, 0.062, 0.0)),
    ('chest', 'hips', (0, 0.062, 0.0), (0, 0.065, 0.06)),
    ('head', 'chest', (0, 0.068, 0.06), (0, 0.06, 0.145)),
    ('fl', 'chest', (0.024, 0.05, 0.045), (0.027, 0.0, 0.058)),
    ('fr', 'chest', (-0.024, 0.05, 0.045), (-0.027, 0.0, 0.058)),
    ('hl', 'hips', (0.034, 0.06, -0.06), (0.038, 0.0, -0.04)),
    ('hr', 'hips', (-0.034, 0.06, -0.06), (-0.038, 0.0, -0.04)),
] + chain('tail', TAILP, 'hips')

BACK, BACK2, BELLY, PINK, SPINE = srgb('#9a7356'), srgb('#6e5241'), srgb('#f1ece2'), srgb('#e3b3a8'), srgb('#7c6450')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 120, y * 120, z * 120)))
    c = mix(BACK, BACK2, 0.35 + 0.35 * n)
    # sharp white belly line, white chin and throat
    side = y - (0.05 + 0.012 * math.cos(z * 20)) + 0.02 * (abs(x) / 0.05)
    c = mix(c, BELLY, smooth(0.008, -0.008, side + (0.012 if N.y < -0.2 else 0)))
    if z > 0.1: c = mix(c, BELLY, smooth(0.07, 0.055, y) * 0.9)
    if y < 0.012: c = mix(c, PINK, 0.6)
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.024, 0.08, 0.108), 0.0085, 'head', '#050404', (sx, 0.2, 0.6))
    parts.append(ear_part((sx * 0.022, 0.093, 0.075), (sx * 0.55, 1, -0.15), 0.019, 0.032, 'head', srgb('#b08d76'), PINK, thick=0.003, cup=0.45))
    parts.append(whiskers((sx * 0.012, 0.058, 0.138), sx, 'head', 5, 0.035, srgb('#2a2420')))
nose = Part('nose', bone='head', mat=1, color=srgb('#c98d86')); nose.add(*ellipsoid((0, 0.058, 0.143), (0.0055, 0.005, 0.004), 8, 5)); parts.append(nose)
parts.append(tail_part('tail', 4, TAILP, 0.006, 0.0025, 6, 18, colfn=lambda t: mix(srgb('#8a6a58'), srgb('#d4b5a4'), t * 0.8)))
# the spiny rump: short stiff spines among the fur
sp = Part('spine', bones=['hips', 'chest'])
rnd = random.Random(3)
for i in range(170):
    zz = rnd.uniform(-0.1, 0.0); xx = rnd.uniform(-1, 1)
    a = xx * 1.2; P = Vector((math.sin(a) * 0.044, 0.062 + math.cos(a) * 0.044, zz))
    if P.y < 0.07: continue
    nrm = Vector((math.sin(a), math.cos(a), 0)); d = (nrm * 0.22 + Vector((0, 0.0, -1))).normalized()
    base = P - nrm * 0.001; L = 0.011 + rnd.uniform(0, 0.004); u, w = _frame(d)
    V = [tuple(base + (u * math.cos(k * TAU / 3) + w * math.sin(k * TAU / 3)) * 0.0022) for k in range(3)] + [tuple(base + d * L)]
    sp.add(V, [(0, 1, 3), (1, 2, 3), (2, 0, 3)], [BACK2, BACK2, BACK2, srgb('#c9b7a2')])
parts.append(sp)

def S(x): return math.sin(TAU * x)
def walk(ph):     # quick scurry (bound-like: hind pair together, fore pair together)
    p = gait(ph, {'fl': 0, 'fr': 0.1, 'hl': 0.5, 'hr': 0.6}, amp=34)
    p['hips'] = ((4 * S(ph), 0, 0), (0, 0.004 * abs(S(ph)), 0))
    p['chest'] = (-6 * S(ph), 0, 0)
    p['head'] = (3 * S(ph), 0, 0)
    for i in range(1, 5): p['tail%d' % i] = (-3 + 4 * S(ph - i * 0.08), 6 * S(ph * 0.5 - i * 0.1), 0)
    return p
def idle(ph):
    sn = S(ph * 10) * smooth(0.1, 0.2, ph) * smooth(0.5, 0.4, ph)
    look = S(ph) * smooth(0.45, 0.6, ph)
    p = {'hips': ((0, 0, 0), (0, 0.0015 * S(ph * 6), 0)), 'head': (-4 + 3 * sn, 30 * look, 0), 'chest': (0, 8 * look, 0)}
    for i in range(1, 5): p['tail%d' % i] = (-2, 5 * S(ph * 2 - i * 0.12), 0)
    return p
def eat(ph):      # sits up holding a seed
    ch = S(ph * 6)
    p = {'hips': ((-28, 0, 0), (0, 0.0, -0.005)), 'chest': (-30, 0, 0), 'head': (35 + 4 * ch, 0, 0),
         'fl': (-70, 0, -12), 'fr': (-70, 0, 12), 'hl': (25, 0, 0), 'hr': (25, 0, 0)}
    for i in range(1, 5): p['tail%d' % i] = (6, 4 * S(ph - i * 0.1), 0)
    return p
def sleep(ph):
    b = S(ph)
    p = {'hips': ((0, 0, 0), (0, -0.018 + 0.001 * b, 0)), 'chest': (18, 0, 0), 'head': (40, -25, 0),
         'fl': (-40, 0, 0), 'fr': (-40, 0, 0), 'hl': (40, 0, 0), 'hr': (40, 0, 0)}
    for i in range(1, 5): p['tail%d' % i] = (8, 38, 0)
    return p

SPEC = dict(id='spinymouse', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.0028, tris=1700, smooth=14,
            actions={'idle': (120, idle), 'walk': (14, walk), 'eat': (60, eat), 'sleep': (90, sleep)},
            meta=dict(height=0.14, length=0.31, speeds={'walk': 0.5, 'run': 1.4}, map={'run': 'walk', 'swim': 'walk', 'sit': 'eat'}))
