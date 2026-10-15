# צב יבשה מצוי (Testudo graeca) – domed shell with scutes, stubby scaly legs, slow diagonal walk.
A, Bw, H0, Hh = 0.21, 0.16, 0.075, 0.15        # shell half-length, half-width, rim height, dome height

def shell_part():
    p = Part('shell', bone='body')
    seg, rings = 60, 17
    V = []; F = []
    def pt(phi, th, lip=0.0, drop=0.0):
        c = math.cos(th); s = math.sin(th)
        # slightly squarer outline toward the back, a raised spine
        rx = Bw * (1 + 0.06 * math.cos(phi) ** 2); rz = A
        x = rx * c * math.sin(phi) * (1 + lip); z = rz * c * math.cos(phi) * (1 + lip)
        y = H0 + Hh * (s ** 0.8) - drop
        # scute bulges
        return (x, y, z)
    ths = [0.0] + [((i / rings) ** 0.9) * (math.pi / 2) for i in range(1, rings)]
    # top pole
    V.append((0.0, H0 + Hh, 0.0))
    for th in reversed(ths):
        for j in range(seg): V.append(pt(TAU * j / seg, th))
    # flared lip and the plastron underneath
    for j in range(seg): V.append(pt(TAU * j / seg, 0, lip=0.05, drop=0.012))
    for j in range(seg): V.append(pt(TAU * j / seg, 0, lip=-0.12, drop=0.04))
    V.append((0.0, H0 - 0.045, 0.0))
    nr = len(ths) + 2
    for j in range(seg): F.append((0, 1 + j, 1 + (j + 1) % seg))
    for r in range(nr - 1):
        a0 = 1 + r * seg; a1 = a0 + seg
        for j in range(seg):
            jn = (j + 1) % seg; F.append((a0 + j, a1 + j, a1 + jn, a0 + jn))
    last = len(V) - 1; a0 = 1 + (nr - 1) * seg
    for j in range(seg): F.append((last, a0 + (j + 1) % seg, a0 + j))
    # bulge each scute a little (vertebral/costal centres)
    out = []
    for (x, y, z) in V:
        xn, zn = x / Bw, z / A
        if y > H0 + 0.01:
            cell = scute(x, y, z)
            bump = 0.0035 * (1 - cell[1]) ** 2 if cell[0] != 'm' else 0
            n = Vector((x / Bw ** 2, (y - H0) / Hh ** 2, z / A ** 2)).normalized()
            x, y, z = x + n.x * bump, y + n.y * bump, z + n.z * bump
        out.append((x, y, z))
    p.add(out, F)
    return p

def scute(x, y, z):
    """→ (kind, edge 0..1 (1 = on a seam, 0 = scute centre), cell id) for a point on the dome"""
    xn, zn = x / Bw, z / A; yn = (y - H0) / Hh
    if yn < 0.16:   # marginal ring
        phi = math.atan2(xn, zn); k = (phi / TAU * 24) % 1
        cen = min(min(k, 1 - k) * 2, max(0, yn) / 0.08, (0.16 - yn) / 0.08)
        return ('m', 1 - max(0, min(1, cen)), int(phi / TAU * 24 + 24))
    if abs(xn) < 0.27:   # vertebral column, 5 scutes
        k = (zn + 1) / 2 * 5; f = k % 1
        cen = min(min(f, 1 - f) * 2, (0.27 - abs(xn)) / 0.14)
        return ('v', 1 - max(0, min(1, cen)), int(k))
    k = (zn + 1) / 2 * 4.2 + 0.4; f = k % 1     # costal, 4 per side
    cen = min(min(f, 1 - f) * 2, (abs(xn) - 0.27) / 0.18, (yn - 0.16) / 0.16)
    return ('c', 1 - max(0, min(1, cen)), int(k) + (10 if xn > 0 else 0))

OCHRE, AMBER, DARK, SEAM = srgb('#cfa553'), srgb('#a87a33'), srgb('#3a2812'), srgb('#1e170c')
SKIN, SKIN2, BELLY = srgb('#8c8466'), srgb('#5f5844'), srgb('#c2b48a')
PLAST = srgb('#b8975a')

def paint(P, N, tag):
    x, y, z = P
    if tag == 'shell':
        if y < H0 - 0.005: return mix(PLAST, DARK, 0.35 * max(0, noise.noise(Vector((x * 25, y * 25, z * 25)))))
        kind, edge, cid = scute(x, y, z)
        r = random.Random(cid * 31 + (7 if kind == 'v' else 3 if kind == 'c' else 1))
        base = mix(OCHRE, AMBER, r.random() * 0.45)
        band = smooth(0.5, 0.72, edge) * (0.85 if kind != 'm' else 0.6)          # dark border of every scute
        spot = smooth(0.78, 0.92, 1 - edge) * (0.7 if r.random() > 0.4 else 0.0) if kind != 'm' else 0.0
        if kind == 'm' and r.random() > 0.5: band = max(band, 0.75 * smooth(0.2, 0.5, edge))
        c = mix(base, DARK, max(band, spot))
        c = mix(c, SEAM, smooth(0.9, 0.99, edge))
        g = 0.06 * noise.noise(Vector((x * 60, y * 60, z * 60)))
        return tuple(max(0, min(1, v + g)) for v in c)
    # skin: scaly legs (darker on top), pale throat
    n = noise.noise(Vector((x * 70, y * 70, z * 70)))
    sc = 0.5 + 0.5 * math.sin(x * 160) * math.sin(z * 160 + y * 90)
    c = mix(SKIN, SKIN2, 0.35 + 0.35 * sc + 0.2 * n)
    if N.y < -0.3 or (z > 0.2 and y < 0.11): c = mix(c, BELLY, 0.5)
    if z > 0.3: c = mix(c, srgb('#4a4232'), smooth(0.31, 0.335, z) * 0.8)                   # horny beak
    if z > 0.27 and abs(y - 0.106) < 0.0035 and abs(x) < 0.03: c = mix(c, DARK, 0.75)     # mouth line
    return c

LEG = 0.036
blobs = [
    dict(t='ell', c=(0, 0.095, 0.0), r=(0.15, 0.055, 0.19), bone='body'),
    dict(t='cap', a=(0, 0.1, 0.13), b2=(0, 0.115, 0.255), r=(0.03, 0.024), bone='neck'),
    dict(t='ell', c=(0, 0.122, 0.285), r=(0.032, 0.03, 0.045), bone='head'),
    dict(t='ell', c=(0, 0.113, 0.318), r=(0.022, 0.021, 0.026), rot=(25, 0, 0), bone='head'),
    dict(t='ell', c=(0, 0.103, 0.296), r=(0.024, 0.016, 0.034), bone='head'),          # jaw
    # front legs: forearm angled out and forward, flat scaly "paddle"; hind legs: columns
    dict(t='cap', a=(0.1, 0.085, 0.13), b2=(0.15, 0.06, 0.16), r=(0.03, 0.027), bone='fl'),
    dict(t='cap', a=(0.15, 0.06, 0.16), b2=(0.168, 0.015, 0.18), r=(0.027, 0.024), bone='fl2'),
    dict(t='ell', c=(0.17, 0.012, 0.185), r=(0.03, 0.013, 0.028), bone='fl2'),
    dict(t='cap', a=(-0.1, 0.085, 0.13), b2=(-0.15, 0.06, 0.16), r=(0.03, 0.027), bone='fr'),
    dict(t='cap', a=(-0.15, 0.06, 0.16), b2=(-0.168, 0.015, 0.18), r=(0.027, 0.024), bone='fr2'),
    dict(t='ell', c=(-0.17, 0.012, 0.185), r=(0.03, 0.013, 0.028), bone='fr2'),
    dict(t='cap', a=(0.095, 0.08, -0.125), b2=(0.125, 0.025, -0.15), r=(0.036, 0.032), bone='hl'),
    dict(t='ell', c=(0.128, 0.014, -0.152), r=(0.034, 0.016, 0.034), bone='hl'),
    dict(t='cap', a=(-0.095, 0.08, -0.125), b2=(-0.125, 0.025, -0.15), r=(0.036, 0.032), bone='hr'),
    dict(t='ell', c=(-0.128, 0.014, -0.152), r=(0.034, 0.016, 0.034), bone='hr'),
    dict(t='cap', a=(0, 0.085, -0.19), b2=(0, 0.06, -0.245), r=(0.018, 0.007), bone='tail'),
]
bones = [
    ('body', None, (0, 0.10, -0.08), (0, 0.10, 0.08)),
    ('neck', 'body', (0, 0.105, 0.14), (0, 0.118, 0.24)),
    ('head', 'neck', (0, 0.118, 0.255), (0, 0.115, 0.34)),
    ('fl', 'body', (0.1, 0.085, 0.13), (0.15, 0.06, 0.16)),
    ('fl2', 'fl', (0.15, 0.06, 0.16), (0.17, 0.008, 0.185)),
    ('fr', 'body', (-0.1, 0.085, 0.13), (-0.15, 0.06, 0.16)),
    ('fr2', 'fr', (-0.15, 0.06, 0.16), (-0.17, 0.008, 0.185)),
    ('hl', 'body', (0.095, 0.08, -0.125), (0.128, 0.01, -0.152)),
    ('hr', 'body', (-0.095, 0.08, -0.125), (-0.128, 0.01, -0.152)),
    ('tail', 'body', (0, 0.085, -0.19), (0, 0.06, -0.25)),
]
parts = [shell_part()]
parts += eye_parts((0.025, 0.13, 0.298), 0.0075, 'head', '#120c06', (1, 0.2, 0.6))
parts += eye_parts((-0.025, 0.13, 0.298), 0.0075, 'head', '#120c06', (-1, 0.2, 0.6))
# claws: little pale cones on the front feet
for sx in (1, -1):
    cl = Part('claw', bone='f' + ('l' if sx > 0 else 'r') + '2', color=srgb('#d8ccaa'))
    for k in range(4):
        a = (k - 1.5) * 0.35
        b0 = (sx * 0.17 + math.sin(a) * 0.022, 0.01, 0.185 + math.cos(a) * 0.022)
        b1 = (sx * 0.17 + math.sin(a) * 0.036, 0.003, 0.185 + math.cos(a) * 0.036)
        cl.add(*tube([b0, b1], [0.0045, 0.0008], 5))
    parts.append(cl)

def S(x): return math.sin(TAU * x)
def walk(ph):
    p = {}
    sw, lift = 24, 14
    for leg, off in (('fl', 0), ('hr', 0), ('fr', 0.5), ('hl', 0.5)):
        u = (ph + off) % 1
        swing = -math.cos(TAU * u)                     # -1 forward … +1 back
        up = max(0, math.sin(TAU * u)) if True else 0   # lifted during the forward half
        side = 1 if leg[1] == 'l' else -1
        p[leg] = (-sw * swing * (1 if leg[0] == 'f' else 0.9), 0, side * lift * up)
    for leg in ('fl', 'fr'):
        u = (ph + (0 if leg == 'fl' else 0.5)) % 1
        p[leg + '2'] = (12 * max(0, math.sin(TAU * u)), 0, 0)
    p['body'] = ((0, 0, 2.5 * S(ph * 2)), (0, 0.004 * abs(S(ph)), 0))
    p['neck'] = (3 * S(ph * 2 + 0.2), 3 * S(ph), 0)
    p['head'] = (-2 * S(ph * 2), 0, 0)
    p['tail'] = (0, 8 * S(ph), 0)
    return p
def idle(ph):
    return {'body': ((0, 0, 0), (0, 0.002 * S(ph * 3), 0)),
            'neck': (-4 + 3 * S(ph), 25 * S(ph) * smooth(0.0, 0.2, ph) * smooth(1.0, 0.8, ph), 0),
            'head': (4 * S(ph * 2), 6 * S(ph), 0), 'tail': (0, 4 * S(ph), 0)}
def eat(ph):
    ch = max(0, S(ph * 4))
    return {'neck': (28, 0, 0), 'head': (12 + 10 * ch, 0, 0), 'body': ((4, 0, 0), None)}
def sleep(ph):
    b = 0.002 * S(ph)
    return {'body': ((0, 0, 0), (0, -0.04 + b, 0)), 'neck': ((15, 0, 0), (0, -0.01, -0.085)), 'head': (10, 0, 0),
            'fl': (-20, 0, 35), 'fr': (-20, 0, -35), 'fl2': (40, 0, 0), 'fr2': (40, 0, 0), 'hl': (30, 0, 25), 'hr': (30, 0, -25), 'tail': (0, 0, 0)}

SPEC = dict(id='tortoise', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.005, tris=1800,
            actions={'idle': (150, idle), 'walk': (40, walk), 'eat': (40, eat), 'sleep': (90, sleep)},
            meta=dict(height=0.25, length=0.6, speeds={'walk': 0.18, 'run': 0.3}, map={'run': 'walk', 'swim': 'walk', 'sit': 'idle'}))
