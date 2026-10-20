# צב ים ירוק (Chelonia mydas, the green sea turtle): a smooth, flat, heart-shaped shell of large plates with rays of
# brown, olive and amber, a short rounded head with big scales, long paddle-like front flippers and small rear ones.
# Grown-ups graze on seagrass and algae; it comes up to the surface to breathe.
A, Bw, H0, Hh = 0.55, 0.43, 0.2, 0.15          # shell half-length, half-width, rim height, dome height
OLIVE, AMBER, DARK, SEAM = srgb('#7a6a3a'), srgb('#b8873a'), srgb('#3a2a14'), srgb('#e6d6a8')
SKIN, SKIN2, BELLY, PLAST = srgb('#6e6a52'), srgb('#3e3a2a'), srgb('#e6dcb8'), srgb('#e8d8a0')

def outline_r(phi):
    """heart shape: wider at the front shoulders, narrowing to the rear"""
    c = math.cos(phi)
    return 1.0 + 0.06 * c - 0.08 * max(0, -c) ** 2

def shell_part():
    p = Part('shell', bone='body'); seg, rings = 64, 16; V = []; F = []
    def pt(phi, th, lip=0.0, drop=0.0):
        k = outline_r(phi) * (1 + lip); c = math.cos(th); s = math.sin(th)
        x = Bw * k * c * math.sin(phi); z = A * k * c * math.cos(phi) + 0.03
        return (x, H0 + Hh * (s ** 0.9) - drop, z)
    ths = [((i / rings) ** 0.85) * (math.pi / 2) for i in range(rings)]
    V.append((0.0, H0 + Hh, 0.03))
    for th in reversed(ths):
        for j in range(seg): V.append(pt(TAU * j / seg, th))
    for j in range(seg): V.append(pt(TAU * j / seg, 0, lip=0.03, drop=0.012))
    for j in range(seg): V.append(pt(TAU * j / seg, 0, lip=-0.1, drop=0.055))
    V.append((0.0, H0 - 0.06, 0.03))
    nr = len(ths) + 2
    for j in range(seg): F.append((0, 1 + j, 1 + (j + 1) % seg))
    for r in range(nr - 1):
        a0 = 1 + r * seg; a1 = a0 + seg
        for j in range(seg): jn = (j + 1) % seg; F.append((a0 + j, a1 + j, a1 + jn, a0 + jn))
    last = len(V) - 1; a0 = 1 + (nr - 1) * seg
    for j in range(seg): F.append((last, a0 + (j + 1) % seg, a0 + j))
    p.add(V, F); return p

def scute(x, y, z):
    xn, zn = x / Bw, (z - 0.03) / A; yn = (y - H0) / Hh
    if yn < 0.1:
        phi = math.atan2(xn, zn); k = (phi / TAU * 24) % 1
        return ('m', 1 - max(0, min(1, min(min(k, 1 - k) * 2, max(0, yn) / 0.05, (0.1 - yn) / 0.05))), int(phi / TAU * 24 + 24))
    if abs(xn) < 0.24:
        k = (zn + 1) / 2 * 5; f = k % 1
        return ('v', 1 - max(0, min(1, min(min(f, 1 - f) * 2, (0.24 - abs(xn)) / 0.1))), int(k))
    k = (zn + 1) / 2 * 4.0 + 0.5; f = k % 1
    return ('c', 1 - max(0, min(1, min(min(f, 1 - f) * 2, (abs(xn) - 0.24) / 0.14, (yn - 0.1) / 0.1))), int(k) + (10 if xn > 0 else 0))

def paint(P, N, tag):
    x, y, z = P
    if tag == 'shell':
        if y < H0 - 0.01: return mix(PLAST, srgb('#c8b070'), 0.3 * max(0, noise.noise(P * 20)))
        kind, edge, cid = scute(x, y, z)
        r = random.Random(cid * 13 + 5); base = mix(OLIVE, AMBER, 0.3 + r.random() * 0.4)
        # rays from each plate's growth centre: the "tortoiseshell" streaks
        ang = math.atan2(x - (r.random() - 0.5) * 0.05, z - (r.random() - 0.5) * 0.05)
        ray = 0.5 + 0.5 * math.sin(ang * (9 + r.randint(0, 5)) + noise.noise(P * 30) * 2)
        c = mix(base, DARK, 0.55 * smooth(0.55, 0.95, ray) * (0.4 + 0.6 * (1 - edge)))
        c = mix(c, AMBER, 0.3 * smooth(0.6, 0.9, 1 - edge))
        c = mix(c, SEAM, 0.6 * smooth(0.88, 0.99, edge))
        return c
    if tag == 'flip' or tag == 'body':
        # skin with big scales: dark centres, pale borders (the cells of a Worley pattern)
        d, rid = worley(P, 1 / (0.03 if tag == 'flip' else 0.022), 3)
        c = mix(SKIN2, SKIN, 0.4 + 0.4 * rid)
        c = mix(c, BELLY, smooth(0.62, 0.8, d))
        if N.y < -0.5: c = mix(c, BELLY, 0.6)
        return c
    return SKIN

blobs = [
    dict(t='ell', c=(0, 0.19, 0.03), r=(0.36, 0.09, 0.46), bone='body'),                 # body under the shell
    dict(t='cap', a=(0, 0.2, 0.42), b2=(0, 0.22, 0.6), r=(0.085, 0.075), bone='neck'),
    dict(t='ell', c=(0, 0.235, 0.66), r=(0.085, 0.075, 0.1), bone='head'),
    dict(t='ell', c=(0, 0.225, 0.73), r=(0.06, 0.055, 0.06), bone='head'),
    dict(t='ell', c=(0, 0.2, 0.69), r=(0.065, 0.035, 0.08), bone='head'),                # jaw
    dict(t='cap', a=(0, 0.17, -0.42), b2=(0, 0.16, -0.55), r=(0.04, 0.01), bone='tail'),
]
bones = [('body', None, (0, 0.2, -0.2), (0, 0.2, 0.25)),
         ('neck', 'body', (0, 0.2, 0.42), (0, 0.22, 0.6)), ('head', 'neck', (0, 0.225, 0.6), (0, 0.22, 0.79)),
         ('tail', 'body', (0, 0.17, -0.42), (0, 0.16, -0.56))]
parts = [shell_part()]
def flipper(side, base, dirv, ln, w0, nm, n2=None, thick=0.03):
    """flat paddle: rows along the flipper, oval cross-section, the tip rounded; bones nm (and n2 for the outer half)"""
    base = Vector(base); d = Vector(dirv).normalized(); up = Vector((0, 1, 0)); u = d.cross(up).normalized()
    if u.z < 0: u = -u                    # u = toward the front edge
    rows = 10; seg = 10; V = []; F = []
    for i in range(rows + 1):
        t = i / rows; w = w0 * (0.55 + 0.75 * math.sin(math.pi * min(1, t * 0.9 + 0.08)) ** 0.8) * (1 - 0.85 * t ** 3)
        c = base + d * ln * t + u * w0 * 0.25 * t
        th = thick * (1 - 0.7 * t)
        for j in range(seg):
            a = TAU * j / seg; V.append(tuple(c + u * math.cos(a) * w * 0.5 + up * math.sin(a) * th * 0.5))
    for i in range(rows):
        for j in range(seg): jn = (j + 1) % seg; F.append((i * seg + j, i * seg + jn, (i + 1) * seg + jn, (i + 1) * seg + j))
    V.append(tuple(base + d * ln * 1.01)); c = len(V) - 1; b = rows * seg
    for j in range(seg): F.append((c, b + j, b + (j + 1) % seg))
    p = Part('flip', bones=[nm] + ([n2] if n2 else [])); p.add(V, F); return p
for sx, L in ((1, 'l'), (-1, 'r')):
    sh = (sx * 0.3, 0.2, 0.33); el = (sx * 0.62, 0.17, 0.2); tip = (sx * 1.0, 0.13, -0.05)
    parts.append(flipper(sx, sh, (sx * 1.0, -0.06, -0.38), 0.78, 0.2, 'f' + L, 'f' + L + '2'))
    bones += [('f' + L, 'body', sh, el), ('f' + L + '2', 'f' + L, el, tip)]
    hs = (sx * 0.24, 0.18, -0.36); ht = (sx * 0.46, 0.15, -0.55)
    parts.append(flipper(sx, hs, (sx * 0.8, -0.05, -0.75), 0.3, 0.16, 'h' + L, thick=0.025))
    bones += [('h' + L, 'body', hs, ht)]
parts += eye_parts((0.06, 0.255, 0.72), 0.018, 'head', '#2a1a0a', (1, 0.1, 0.5))
parts += eye_parts((-0.06, 0.255, 0.72), 0.018, 'head', '#2a1a0a', (-1, 0.1, 0.5))
beak = Part('beak', bone='head', color=srgb('#4a4232'))
beak.add(*ellipsoid((0, 0.205, 0.775), (0.03, 0.02, 0.03), 10, 6)); parts.append(beak)

def S(x): return math.sin(TAU * x)
def stroke(ph, amp=1.0):
    """front flippers fly through the water like wings: down-and-back, then feathered up; rear flippers steer"""
    p = {}
    for L, sd in (('l', 1), ('r', -1)):
        a = math.cos(TAU * ph)
        p['f' + L] = (8 * S(ph) * amp, sd * 18 * amp * (0.5 + 0.5 * S(ph - 0.15)), sd * 32 * amp * a)
        p['f' + L + '2'] = (0, sd * 10 * amp * S(ph - 0.1), sd * 18 * amp * math.cos(TAU * (ph - 0.12)))
        p['h' + L] = (0, sd * 6 * S(ph), sd * 6 * S(ph + 0.25))
    p['body'] = ((-3 * S(ph) * amp, 0, 0), (0, 0.015 * S(ph + 0.25) * amp, 0))
    p['neck'] = (3 * S(ph), 0, 0); p['head'] = (-2 * S(ph), 0, 0); p['tail'] = (0, 0, 0)
    return p
def fly(ph): return stroke(ph, 1.0)
def glide(ph):
    p = {}
    for L, sd in (('l', 1), ('r', -1)):
        p['f' + L] = (0, sd * 30, sd * (-6 + 3 * S(ph))); p['f' + L + '2'] = (0, sd * 8, sd * 4 * S(ph)); p['h' + L] = (0, sd * 4, 0)
    p['head'] = (0, 8 * S(ph), 0); p['body'] = ((0, 0, 3 * S(ph)), None); return p
def hover(ph): return stroke(ph, 0.45)
def perch(ph):     # resting on the bottom, flippers tucked, looking round
    p = {}
    for L, sd in (('l', 1), ('r', -1)):
        p['f' + L] = (0, sd * 40, sd * -6); p['f' + L + '2'] = (0, sd * 15, 0); p['h' + L] = (0, sd * 5, sd * -4)
    look = S(ph) * smooth(0.05, 0.2, ph) * smooth(0.95, 0.8, ph)
    p['neck'] = (-4, 18 * look, 0); p['head'] = (3 * S(ph * 2), 10 * look, 0); p['body'] = ((0, 0, 0), (0, -0.06, 0))
    return p
def eat(ph):
    k = max(0, S(ph * 2)) ** 2
    p = perch(0); p['neck'] = (22 + 8 * k, 0, 0); p['head'] = (10 + 12 * k, 0, 0); return p
def sleep(ph):
    p = perch(0); p['neck'] = (14, 0, 0); p['head'] = (6 + 2 * S(ph), 0, 0); return p

SPEC = dict(id='turtle', bones=bones, blobs=blobs, parts=parts, paint=paint, paintParts=True, res=0.012, tris=2400, skin='scale',
            noLids=False, actions={'fly': (48, fly), 'glide': (90, glide), 'hover': (72, hover), 'perch': (150, perch), 'eat': (48, eat), 'sleep': (120, sleep)},
            meta=dict(rough=0.55, height=0.42, length=1.4, speeds={'fly': 1.4, 'walk': 0.3}, map={'idle': 'hover', 'walk': 'hover', 'run': 'fly', 'sit': 'perch'}))
