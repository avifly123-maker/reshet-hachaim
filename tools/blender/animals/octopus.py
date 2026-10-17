# תמנון (Octopus cyanea, the day octopus of the reef): a soft rounded mantle, big golden eyes with a bar-shaped pupil,
# eight long arms with two rows of pale suckers underneath, joined at the base by a skin web. It changes colour and
# texture in a moment to match the rock; hunts crabs and shrimps by day and hides in a den.
L = 0.28                 # arm length per bone chain (3 bones)
BROWN, CREAM, DARK, WHITE = srgb('#8a5a3a'), srgb('#d8b890'), srgb('#4a2a1a'), srgb('#f2e8dc')
arms = []
for k in range(8):
    a = TAU * (k + 0.5) / 8 + 0.0
    d = Vector((math.sin(a), 0, math.cos(a)))
    base = Vector((0, 0.11, 0.05)) + d * 0.07
    p1 = base + d * L * 0.9 + Vector((0, -0.07, 0)); p2 = p1 + d * L * 0.85 + Vector((0, -0.03, 0))
    side = d.cross(Vector((0, 1, 0)))
    p3 = p2 + d * L * 0.55 + side * 0.08 * (1 if k % 2 else -1) + Vector((0, 0.03, 0))     # tips curl up a little
    arms.append((k, base, p1, p2, p3))
bones = [('body', None, (0, 0.12, -0.05), (0, 0.13, 0.12)),
         ('mantle', 'body', (0, 0.16, -0.02), (0, 0.3, -0.22))]
blobs = [dict(t='ell', c=(0, 0.15, 0.06), r=(0.12, 0.09, 0.11), bone='body'),               # head with the eyes
         dict(t='ell', c=(0, 0.24, -0.12), r=(0.13, 0.12, 0.17), rot=(-30, 0, 0), bone='mantle'),
         dict(t='ell', c=(0, 0.1, 0.05), r=(0.15, 0.045, 0.15), bone='body')]                # the web between the arms
for k, b0, p1, p2, p3 in arms:
    nm = 'a%d' % (k + 1)
    bones += [(nm + '1', 'body', tuple(b0), tuple(p1)), (nm + '2', nm + '1', tuple(p1), tuple(p2)), (nm + '3', nm + '2', tuple(p2), tuple(p3))]
    blobs += [dict(t='cap', a=tuple(b0), b2=tuple(p1), r=(0.04, 0.026), bone=nm + '1'),
              dict(t='cap', a=tuple(p1), b2=tuple(p2), r=(0.026, 0.014), bone=nm + '2'),
              dict(t='cap', a=tuple(p2), b2=tuple(p3), r=(0.014, 0.004), bone=nm + '3')]
parts = []
# suckers: two rows of pale discs under each arm
for k, b0, p1, p2, p3 in arms:
    nm = 'a%d' % (k + 1)
    C = bez([tuple(b0), tuple(p1), tuple(p2), tuple(p3)], 26)
    sk = Part('sucker', bones=[nm + '1', nm + '2', nm + '3'])
    for i in range(3, 25, 2):
        t = i / 25; c = Vector(C[i]); dn = (Vector(C[i + 1]) - Vector(C[i - 1])).normalized()
        side = dn.cross(Vector((0, 1, 0))).normalized(); r = 0.04 * (1 - t) ** 0.9 + 0.004
        for sd in (-1, 1):
            q = c + side * sd * r * 0.38 - Vector((0, r * 0.82, 0))
            rr = r * 0.32
            V, F = ellipsoid(tuple(q), (rr * 1.2, rr * 0.45, rr * 1.2), 6, 3)
            sk.add(V, F)
    parts.append(sk)
for sx in (1, -1):
    parts += fish_eye((sx * 0.085, 0.205, 0.08), 0.03, sx, iris='#d8a830', ring='#6a4a1a', bone='body')
def paint(P, N, tag):
    if tag == 'sucker': return WHITE
    n1 = noise.noise(P * 14); n2 = noise.noise(P * 40 + Vector((3, 1, 2)))
    c = mix(BROWN, CREAM, 0.35 + 0.35 * n1)
    d, rid = worley(P, 1 / 0.035, 5)
    c = mix(c, WHITE, 0.55 * smooth(0.2, 0.08, d) * (rid > 0.4))          # pale spots
    c = mix(c, DARK, 0.25 * smooth(0.1, 0.5, n2))
    if N.y < -0.5: c = mix(c, CREAM, 0.5)
    return c
def S(x): return math.sin(TAU * x)
def arms_pose(ph, amp, curl=0.0, lift=0.0, spread=0.0):
    p = {}
    for k in range(8):
        nm = 'a%d' % (k + 1); o = k / 8 * (0.5 if k % 2 else 1.0)
        w = S(ph - o)
        p[nm + '1'] = (-lift + amp * 0.4 * w, spread * (1 if k < 4 else -1), 0)
        p[nm + '2'] = (curl * 0.5 + amp * 0.6 * S(ph - o - 0.1), amp * 0.4 * w, 0)
        p[nm + '3'] = (curl + amp * S(ph - o - 0.2), amp * 0.6 * w, 0)
    return p
def walk(ph):
    p = arms_pose(ph, 14, curl=-10, lift=4); p['body'] = ((2 * S(ph * 2), 0, 0), (0, 0.01 * abs(S(ph)), 0)); p['mantle'] = (4 * S(ph), 0, 0); return p
def run(ph):       # jet: arms trail together, the mantle squeezes
    p = arms_pose(ph, 4, curl=-5, lift=-30); p['mantle'] = (10 * S(ph), 0, 0); p['body'] = ((-8, 0, 0), (0, 0.06, 0)); return p
def idle(ph):
    p = arms_pose(ph, 5, curl=-12); p['mantle'] = (3 * S(ph * 2), 2 * S(ph), 0); p['body'] = ((0, 0, 0), (0, 0.004 * S(ph * 3), 0)); return p
def eat(ph):
    p = arms_pose(ph * 2, 6, curl=-40, lift=-10); p['mantle'] = (6 * S(ph * 2), 0, 0); return p
def sleep(ph):
    p = arms_pose(ph, 2, curl=-60, lift=-20); p['body'] = ((0, 0, 0), (0, -0.02, 0)); p['mantle'] = (-12, 0, 0); return p
SPEC = dict(id='octopus', bones=bones, blobs=blobs, parts=parts, paint=paint, paintParts=True, res=0.009, tris=2400, skin='smooth',
            noLids=True, actions={'walk': (48, walk), 'run': (24, run), 'idle': (120, idle), 'eat': (60, eat), 'sleep': (120, sleep)},
            meta=dict(rough=0.4, height=0.38, length=1.1, speeds={'walk': 0.4, 'run': 1.2}, map={'sit': 'idle', 'swim': 'run'}))
