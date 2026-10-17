# סרטן נזיר (a hermit crab, Dardanus): its soft back half lives inside an empty sea-snail shell that it carries
# everywhere, and when it grows it moves into a bigger one. Red legs with pale spots, the left claw bigger, eyes on
# stalks. It cleans the reef floor of leftovers.
RED, SPOT, SHELL1, SHELL2, CREAM = srgb('#c83a26'), srgb('#f2dcc8'), srgb('#c8a878'), srgb('#7a5a3a'), srgb('#efe2c8')
bones = [('body', None, (0, 0.06, -0.02), (0, 0.07, 0.08)), ('shell', 'body', (0, 0.1, -0.02), (0, 0.16, -0.16))]
blobs = [dict(t='ell', c=(0, 0.06, 0.07), r=(0.035, 0.028, 0.035), bone='body'),
         dict(t='ell', c=(0, 0.065, 0.035), r=(0.03, 0.03, 0.04), bone='body')]       # the soft abdomen going into the shell
def spiral_shell():
    """a cone spiral (a turban / whelk shell): a tube along a helix that grows, its whorls overlapping; aperture forward"""
    p = Part('shell', bone='shell'); V = []; F = []
    turns, n, sides = 3.2, 120, 16
    apex = Vector((0, 0.15, -0.12)); axis = Vector((0, 0.45, -0.89)).normalized()
    u = Vector((1, 0, 0)); w = axis.cross(u).normalized()
    pts = []; rad = []
    for i in range(n + 1):
        t = i / n; th = TAU * turns * t; g = 0.03 + 0.97 * t ** 1.15
        R = 0.075 * g; along = 0.16 * (1 - g)
        c = apex - axis * (0.16 - along) * 0 + axis * (-0.16 * g + 0.0) * -1
        c = apex - axis * 0.17 * g + (u * math.cos(th) + w * math.sin(th)) * R * 0.55
        pts.append(c); rad.append(R * 0.62)
    V0, F0 = tube([tuple(x) for x in pts], rad, sides, cap0=True, cap1=False)
    p.add(V0, F0); return p
parts = [spiral_shell()]
def limb(nm, parent, pts, radii, tag='leg'):
    bs = []
    for i in range(len(pts) - 1):
        bs.append((nm + str(i + 1), parent if i == 0 else nm + str(i), tuple(pts[i]), tuple(pts[i + 1])))
    p = Part(tag, bones=[b[0] for b in bs]); p.add(*tube([tuple(x) for x in pts], radii, 6)); return bs, p
for sx, big in ((1, True), (-1, False)):
    s = 1.35 if big else 1.0
    a = Vector((sx * 0.025, 0.055, 0.09)); b = a + Vector((sx * 0.03, -0.01, 0.03)) * s; c = b + Vector((sx * -0.005, -0.012, 0.04)) * s
    bs, p = limb('c' + ('l' if sx > 0 else 'r'), 'body', [a, b, c], [0.012 * s, 0.012 * s, 0.011 * s]); bones += bs; parts.append(p)
    h = Part('claw', bone=bs[-1][0]); h.add(*ellipsoid(tuple(c + Vector((0, 0, 0.022 * s))), (0.017 * s, 0.013 * s, 0.03 * s), 12, 7)); parts.append(h)
for k in range(2):
    for sx in (1, -1):
        a = Vector((sx * 0.03, 0.05, 0.06 - k * 0.03)); b = a + Vector((sx * 0.06, 0.03, 0.02)); c = b + Vector((sx * 0.04, -0.075, 0.02))
        bs, p = limb('l%d%s' % (k, 'l' if sx > 0 else 'r'), 'body', [a, b, c], [0.008, 0.007, 0.003]); bones += bs; parts.append(p)
st = Part('stalk', bone='body')
for sx in (1, -1):
    b = Vector((sx * 0.01, 0.075, 0.1)); t = b + Vector((sx * 0.008, 0.035, 0.012))
    st.add(*tube([tuple(b), tuple(t)], [0.004, 0.0035], 5))
    parts += fish_eye(tuple(t + Vector((0, 0.005, 0))), 0.007, sx, iris='#1a1a1a', ring='#3a3a3a', bone='body')
    st.add(*tube([tuple(b + Vector((0, -0.01, 0.0))), tuple(b + Vector((sx * 0.03, 0.03, 0.08)))], [0.0015, 0.0005], 4))
parts.append(st)
def paint(P, N, tag):
    if tag == 'shell':
        # spiral bands that follow the whorls, a pale lip at the opening
        r = math.atan2(P.x, P.y - 0.12)
        c = mix(SHELL1, SHELL2, smooth(0.55, 0.8, 0.5 + 0.5 * math.sin(P.z * 120 + r * 3)))
        c = mix(c, CREAM, 0.4 * smooth(0.6, 0.9, noise.noise(P * 50)))
        return c
    c = RED
    d, _ = worley(P, 1 / 0.012, 2)
    c = mix(c, SPOT, smooth(0.3, 0.18, d))
    if tag == 'claw': c = mix(c, srgb('#e86a4a'), 0.3)
    return c
def S(x): return math.sin(TAU * x)
def legs(ph, amp):
    p = {}
    for k in range(2):
        for sd, L in ((1, 'l'), (-1, 'r')):
            o = (k * 0.5 + (0.25 if sd < 0 else 0)) % 1
            p['l%d%s1' % (k, L)] = (0, sd * amp * S(ph + o), sd * 10 * max(0, S(ph + o + 0.25)))
    return p
def walk(ph):
    p = legs(ph, 22); p['shell'] = (0, 4 * S(ph), 3 * S(ph * 2)); p['body'] = ((0, 0, 0), (0, 0.004 * abs(S(ph * 2)), 0)); return p
def idle(ph):
    p = legs(ph, 2); p['cl1'] = (4 * S(ph), 0, 0); p['cr1'] = (-8 * max(0, S(ph * 2)), 0, 0); return p
def eat(ph):
    p = legs(ph, 0); k = max(0, S(ph * 2)); p['cr1'] = (-25 * k, 10, 0); p['cl1'] = (-10, 0, 0); return p
def sleep(ph):     # pulled into the shell
    p = legs(ph, 0); p['body'] = ((0, 0, 0), (0, 0.0, -0.035)); p['shell'] = (-6, 0, 0)
    for k in range(2):
        for L in ('l', 'r'): p['l%d%s1' % (k, L)] = (0, 0, 0)
    return p
SPEC = dict(id='hermit', bones=bones, blobs=blobs, parts=parts, paint=paint, paintParts=True, res=0.004, tris=1400, skin='shell',
            noLids=True, actions={'walk': (32, walk), 'idle': (90, idle), 'eat': (48, eat), 'sleep': (90, sleep)},
            meta=dict(rough=0.5, height=0.22, length=0.4, speeds={'walk': 0.25, 'run': 0.4}, map={'run': 'walk', 'sit': 'idle', 'swim': 'walk'}))
