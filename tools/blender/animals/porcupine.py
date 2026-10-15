# דורבן (Hystrix indica) – stocky dark body under long black-and-white banded quills, a crest of long bristles, blunt face.
BC, BR = (0, 0.3, -0.06), (0.21, 0.2, 0.33)
blobs = [
    dict(t='ell', c=BC, r=BR, bone='hips'),
    dict(t='ell', c=(0, 0.27, 0.17), r=(0.16, 0.17, 0.17), bone='chest'),
    dict(t='ell', c=(0, 0.27, 0.33), r=(0.09, 0.09, 0.1), bone='head'),
    dict(t='cap', a=(0, 0.26, 0.37), b2=(0, 0.22, 0.45), r=(0.065, 0.038), bone='head'),
]
for sx, L in ((1, 'l'), (-1, 'r')):
    blobs += [
        dict(t='cap', a=(sx * 0.1, 0.2, 0.2), b2=(sx * 0.11, 0.1, 0.22), r=(0.05, 0.04), bone='f' + L),
        dict(t='cap', a=(sx * 0.11, 0.1, 0.22), b2=(sx * 0.115, 0.02, 0.24), r=(0.038, 0.032), bone='f' + L + '2'),
        dict(t='ell', c=(sx * 0.115, 0.016, 0.26), r=(0.035, 0.016, 0.045), bone='f' + L + '2'),
        dict(t='ell', c=(sx * 0.12, 0.2, -0.22), r=(0.07, 0.12, 0.11), bone='h' + L),
        dict(t='cap', a=(sx * 0.12, 0.1, -0.24), b2=(sx * 0.12, 0.02, -0.2), r=(0.042, 0.034), bone='h' + L + '2'),
        dict(t='ell', c=(sx * 0.12, 0.016, -0.17), r=(0.036, 0.016, 0.055), bone='h' + L + '2'),
    ]
bones = [('hips', None, (0, 0.28, -0.32), (0, 0.29, 0.02)), ('chest', 'hips', (0, 0.29, 0.02), (0, 0.28, 0.24)),
         ('head', 'chest', (0, 0.28, 0.25), (0, 0.23, 0.47))]
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', (sx * 0.1, 0.22, 0.2), (sx * 0.11, 0.1, 0.22)), ('f' + L + '2', 'f' + L, (sx * 0.11, 0.1, 0.22), (sx * 0.115, 0.0, 0.25)),
              ('h' + L, 'hips', (sx * 0.12, 0.26, -0.2), (sx * 0.12, 0.1, -0.24)), ('h' + L + '2', 'h' + L, (sx * 0.12, 0.1, -0.24), (sx * 0.12, 0.0, -0.18))]
bones += [('quill', 'hips', (0, 0.42, -0.2), (0, 0.46, 0.05))]     # raises the whole coat when alarmed / idle shiver

BLACK, WHITE, DARK, BROWN = srgb('#141210'), srgb('#efeae0'), srgb('#24201c'), srgb('#3a2f26')
def quills():
    p = Part('quill', bones=['quill', 'hips'])
    rnd = random.Random(11); n = 230; ga = math.pi * (3 - math.sqrt(5)); placed = 0
    for i in range(n * 3):
        if placed >= n: break
        yy = 1 - (i / (n * 3 - 1)) * 2; rr = math.sqrt(max(0, 1 - yy * yy)); th = ga * i
        d = Vector((math.cos(th) * rr, yy, math.sin(th) * rr))
        P = Vector((BC[0] + d.x * BR[0], BC[1] + d.y * BR[1], BC[2] + d.z * BR[2]))
        if P.y < 0.24 or P.z > 0.18 - max(0, 0.42 - P.y) * 0.8: continue
        nrm = Vector(((P.x - BC[0]) / BR[0] ** 2, (P.y - BC[1]) / BR[1] ** 2, (P.z - BC[2]) / BR[2] ** 2)).normalized()
        back = smooth(0.15, -0.3, P.z)                        # the rear quills are the longest and stand more upright
        dirn = (nrm * (0.5 + 0.3 * back) + Vector((0, 0.25, -1)) * 0.75 + Vector((rnd.uniform(-1, 1), rnd.uniform(-.5, 1), rnd.uniform(-1, 1))) * 0.15).normalized()
        L = 0.14 + 0.2 * back + rnd.uniform(-0.03, 0.04)
        base = P - nrm * 0.01; u, w = _frame(dirn); r0 = 0.0065
        V = []; C = []
        bands = [(0.0, r0, BLACK), (0.35, r0 * 0.85, srgb('#d9d2c4')), (0.62, r0 * 0.6, BLACK)]
        for (t, r, col) in bands:
            c = base + dirn * L * t
            for j in range(3):
                a = TAU * j / 3 + rnd.random(); V.append(tuple(c + (u * math.cos(a) + w * math.sin(a)) * r)); C.append(col)
        V.append(tuple(base + dirn * L)); C.append(WHITE)
        F = []
        for rI in range(len(bands) - 1):
            for j in range(3):
                jn = (j + 1) % 3; F.append((rI * 3 + j, rI * 3 + jn, (rI + 1) * 3 + jn, (rI + 1) * 3 + j))
        b = (len(bands) - 1) * 3
        for j in range(3): F.append((b + j, b + (j + 1) % 3, b + 3))
        p.add(V, F, C); placed += 1
    # head crest: long thin bristles swept back
    for k in range(40):
        a = rnd.uniform(-0.6, 0.6); P = Vector((math.sin(a) * 0.05, 0.34 + math.cos(a) * 0.03, 0.27 + rnd.uniform(-0.06, 0.04)))
        dirn = Vector((math.sin(a) * 0.3, 0.6, -1)).normalized(); L = 0.12 + rnd.uniform(0, 0.06)
        V = [tuple(P + Vector((0.004, 0, 0))), tuple(P - Vector((0.004, 0, 0))), tuple(P + dirn * L)]
        p.add(V, [(0, 1, 2), (1, 0, 2)], [DARK, DARK, srgb('#bdb3a3')])
    return p

def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 40, y * 40, z * 40)))
    c = mix(DARK, BLACK, 0.4 + 0.3 * n)
    if z > 0.35: c = mix(c, BROWN, 0.5)
    # the white collar band across the throat
    if 0.17 < z < 0.25 and 0.16 < y < 0.36 and abs(x) < 0.13: c = mix(c, srgb('#d8d0c2'), smooth(0.17, 0.195, z) * smooth(0.25, 0.225, z) * smooth(0.16, 0.2, y) * 0.85)
    return c

parts = [quills()]
for sx in (1, -1):
    parts += eye_parts((sx * 0.055, 0.31, 0.38), 0.012, 'head', '#050403', (sx, 0.2, 0.6))
    parts.append(ear_part((sx * 0.06, 0.33, 0.31), (sx * 0.7, 1, -0.4), 0.02, 0.025, 'head', DARK, srgb('#5a4a40'), thick=0.004, cup=0.3))
    parts.append(whiskers((sx * 0.03, 0.23, 0.44), sx, 'head', 5, 0.09, srgb('#1a1612')))
nose = Part('nose', bone='head', mat=1, color=srgb('#2a2220')); nose.add(*ellipsoid((0, 0.225, 0.455), (0.03, 0.022, 0.016), 8, 5)); parts.append(nose)

names = [b[0] for b in bones]
acts = quad_actions(names, dict(amp=20, knee=34, run_amp=28, bob=0.014, drop=0.17, head_eat=35, look=30,
                                frames=dict(walk=36, run=20, idle=150, eat=48, sleep=120)))
_idle = acts['idle'][1]
def idle(ph):
    p = _idle(ph); p['quill'] = (-6 * smooth(0.5, 0.55, ph) * smooth(0.7, 0.62, ph) * (1 + 0.3 * math.sin(ph * 200)), 0, 0); return p
acts['idle'] = (150, idle)
_run = acts['run'][1]
def run(ph):
    p = _run(ph); p['quill'] = (-10, 0, 0); return p
acts['run'] = (20, run)
SPEC = dict(id='porcupine', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.007, tris=2000, smooth=10, actions=acts,
            meta=dict(height=0.6, length=0.9, speeds={'walk': 0.5, 'run': 1.6}, map={'swim': 'walk', 'sit': 'idle'}))
