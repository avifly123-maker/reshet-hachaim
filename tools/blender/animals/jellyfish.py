# מדוזה (Aurelia aurita, the moon jellyfish): a clear, shallow bell with four pale pink rings (seen through the top),
# a fringe of fine short tentacles all round the rim and four frilly oral arms hanging below. It swims by squeezing
# its bell; mostly it drifts with the current and eats plankton. Sea turtles eat jellyfish.
R, TOP, RIM = 0.42, 0.62, 0.46        # bell radius, top and rim heights
NB = 8
BELL, PINK, MILK = srgb('#dfe9f2'), srgb('#e9a0c0'), srgb('#f6f2f8')
def bell_pt(r_frac, ang, inner=False):
    """the bell: a shallow dome; the underside follows it a little higher (the jelly is thick in the middle)"""
    r = R * r_frac; y = TOP - (TOP - RIM) * (r_frac ** 2.2)
    if inner: y -= 0.05 * (1 - r_frac ** 1.5) + 0.006
    return (r * math.cos(ang), y, r * math.sin(ang))
def bell_part():
    p = Part('bell', bones=['bell'] + ['r%d' % (i + 1) for i in range(NB)]); V = []; F = []
    rings, seg = 12, 48
    for inner in (False, True):
        base = len(V); V.append(bell_pt(0, 0, inner))
        for i in range(1, rings + 1):
            f = i / rings
            for j in range(seg):
                a = TAU * j / seg; rr = f * (1 + 0.025 * math.sin(a * 16) * f ** 4)   # scalloped rim
                V.append(bell_pt(rr, a, inner))
        for j in range(seg):
            a_, b_ = base + 1 + j, base + 1 + (j + 1) % seg
            F.append((base, b_, a_) if not inner else (base, a_, b_))
        for i in range(rings - 1):
            r0 = base + 1 + i * seg; r1 = r0 + seg
            for j in range(seg):
                jn = (j + 1) % seg
                F.append((r0 + j, r0 + jn, r1 + jn, r1 + j) if not inner else (r0 + j, r1 + j, r1 + jn, r0 + jn))
    half = len(V) // 2; e0 = 1 + (rings - 1) * 48
    for j in range(48):
        jn = (j + 1) % 48; F.append((e0 + j, half + e0 + j, half + e0 + jn, e0 + jn))
    p.add(V, F); return p
bones = [('bell', None, (0, RIM - 0.02, 0), (0, TOP + 0.02, 0))]
for i in range(NB):
    a = TAU * (i + 0.5) / NB
    bones.append(('r%d' % (i + 1), 'bell', bell_pt(0.45, a), bell_pt(1.0, a)))
blobs = [dict(t='ell', c=(0, TOP - 0.05, 0), r=(0.2, 0.035, 0.2), bone='bell'),          # the thick jelly in the middle
         dict(t='ell', c=(0, RIM - 0.01, 0), r=(0.07, 0.06, 0.07), bone='bell')]           # the mouth under it
parts = [bell_part()]
# four pink rings (the gonads), seen through the bell: flat rings just under its top
for k in range(4):
    a = TAU * k / 4 + math.pi / 4; c = Vector((0.11 * math.cos(a), TOP - 0.004, 0.11 * math.sin(a)))
    g = Part('ring', bone='bell', color=PINK); V = []; F = []; n = 20
    for j in range(n):
        th = TAU * j / n
        for rr in (0.045, 0.075):
            q = c + Vector((rr * math.cos(th), 0, rr * math.sin(th))); rf = math.hypot(q.x, q.z) / R
            V.append((q.x, TOP - (TOP - RIM) * (rf ** 2.2) + 0.003, q.z))
    for j in range(n):
        jn = (j + 1) % n; F.append((j * 2, j * 2 + 1, jn * 2 + 1, jn * 2)); F.append((jn * 2, jn * 2 + 1, j * 2 + 1, j * 2))
    g.add(V, F); parts.append(g)
# fringe tentacles round the rim, each on the nearest rim bone
fr = Part('fringe', bones=['r%d' % (i + 1) for i in range(NB)], color=MILK)
for j in range(96):
    a = TAU * j / 96; b = Vector(bell_pt(1.0, a)); out = Vector((math.cos(a), 0, math.sin(a)))
    ln = 0.07 + 0.03 * math.sin(j * 1.7)
    fr.add(*tube([tuple(b), tuple(b + out * 0.01 - Vector((0, ln * 0.5, 0))), tuple(b + out * 0.004 - Vector((0, ln, 0)))], [0.004, 0.003, 0.001], 4, cap0=False))
parts.append(fr)
# four oral arms: frilly ribbons hanging from the mouth, two bones each
for k in range(4):
    a = TAU * k / 4; d = Vector((math.cos(a), 0, math.sin(a)))
    top = Vector((0, RIM - 0.03, 0)) + d * 0.03; mid = top + d * 0.05 - Vector((0, 0.17, 0)); end = top + d * 0.09 - Vector((0, 0.36, 0))
    nm = 'a%d' % (k + 1)
    bones += [(nm + '1', 'bell', tuple(top), tuple(mid)), (nm + '2', nm + '1', tuple(mid), tuple(end))]
    arm = Part('arm', bones=[nm + '1', nm + '2'], color=srgb('#f0d8e6'))
    C = bez([tuple(top), tuple(mid), tuple(end)], 14)
    C = [tuple(Vector(c) + d.cross(Vector((0, 1, 0))).normalized() * 0.012 * math.sin(i * 1.9)) for i, c in enumerate(C)]
    V, F = tube(C, [0.026 * (1 - 0.6 * i / 13) + 0.004 for i in range(14)], 7, cap0=False, cap1=True)
    arm.add(V, F); parts.append(arm)
def paint(P, N, tag):
    if tag in ('bell', 'body'):
        r = math.hypot(P.x, P.z) / R
        c = mix(MILK, BELL, smooth(0.2, 0.9, r))
        c = mix(c, srgb('#c8d8ec'), 0.25 * (0.5 + 0.5 * math.sin(math.atan2(P.z, P.x) * 16)) * smooth(0.5, 0.95, r))   # radial canals
        if r > 0.94: c = mix(c, srgb('#f2c8dc'), 0.5)
        return c
    if tag == 'ring': return mix(PINK, srgb('#d47aa8'), 0.3 + 0.3 * math.sin(P.x * 200 + P.z * 150))
    if tag == 'arm': return mix(srgb('#f0d8e6'), PINK, 0.35 + 0.25 * math.sin(P.y * 90))
    return MILK
def pulse(ph, k=1.0):
    """the bell squeezes (rim bones fold in) and the whole jelly rises a little, then relaxes slowly"""
    u = ph % 1.0; sq = smooth(0.0, 0.25, u) * smooth(1.0, 0.35, u)
    p = {'bell': ((0, 0, 0), (0, 0.035 * k * smooth(0.1, 0.5, u) * smooth(1.0, 0.6, u), 0))}
    for i in range(NB):
        a = TAU * (i + 0.5) / NB
        # fold toward the centre: a rotation about the tangent axis
        p['r%d' % (i + 1)] = (k * 26 * sq * math.sin(a), 0, -k * 26 * sq * math.cos(a))
    for kk in range(4):
        sw = 8 * math.sin(TAU * (u - 0.2 + kk * 0.25))
        p['a%d1' % (kk + 1)] = (sw * 0.5, 0, sw * 0.4); p['a%d2' % (kk + 1)] = (sw, 0, -sw * 0.5)
    return p
def fly(ph): return pulse(ph, 1.0)
def hover(ph): return pulse(ph, 0.6)
def glide(ph): return pulse(ph * 0.5, 0.3)
SPEC = dict(id='jellyfish', bones=bones, blobs=blobs, parts=parts, paint=paint, paintParts=True, res=0.012, tris=900, skin='smooth',
            noLids=True, noTone=True,
            actions={'fly': (45, fly), 'hover': (60, hover), 'glide': (90, glide), 'perch': (90, glide), 'eat': (60, hover), 'sleep': (120, glide)},
            meta=dict(rough=0.25, height=0.66, length=0.84, speeds={'fly': 0.5, 'walk': 0.2}, opacity=0.72,
                      map={'idle': 'hover', 'walk': 'glide', 'run': 'fly', 'sit': 'glide'}))
