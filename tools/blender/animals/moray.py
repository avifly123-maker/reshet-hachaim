# מורנה (Gymnothorax javanicus, the giant moray): a long muscular body without scales, brown with black spots that turn
# into a leopard pattern, one fin along the back that wraps round the tail, a big head with small eyes. It opens and
# closes its mouth all the time: that is how it breathes, pumping water over its gills. Hides in reef holes by day.
L = 1.5
N = 8
BROWN, TAN, BLACK, PINK = srgb('#7a5a2a'), srgb('#b0904a'), srgb('#1a120a'), srgb('#e8b0a0')
pts = [(0, 0.11, 0.62 - i * (L / N)) for i in range(N + 1)]          # from behind the head to the tail tip
bones = [('body', None, (0, 0.11, 0.62), (0, 0.11, 0.75)),
         ('head', 'body', (0, 0.11, 0.75), (0, 0.105, 0.98)),
         ('jaw', 'head', (0, 0.075, 0.78), (0, 0.065, 0.97))]
bones += chain('s', pts, 'body')
def r_at(i):   # body radius along the chain
    u = i / N; return 0.085 * (1 - 0.25 * u) * (1 - smooth(0.7, 1.0, u) * 0.75)
blobs = [dict(t='ell', c=(0, 0.115, 0.78), r=(0.075, 0.09, 0.12), bone='head'),
         dict(t='ell', c=(0, 0.12, 0.9), r=(0.055, 0.06, 0.1), bone='head'),
         dict(t='ell', c=(0, 0.13, 0.7), r=(0.08, 0.1, 0.1), bone='body'),
         dict(t='ell', c=(0, 0.07, 0.88), r=(0.045, 0.028, 0.09), bone='jaw')]
for i in range(N):
    a, b = pts[i], pts[i + 1]
    blobs.append(dict(t='cap', a=a, b2=b, r=(r_at(i) * 1.0, r_at(i + 1)), bone='s%d' % (i + 1)))
# the fin along the back (and round the tail): a strip of plate following the chain
fin = Part('fin_d', bones=['body'] + ['s%d' % (i + 1) for i in range(N)])
for i in range(N):
    a, b = Vector(pts[i]), Vector(pts[i + 1]); ra, rb = r_at(i), r_at(i + 1)
    ha, hb = 0.045 * (1 - 0.3 * i / N), 0.045 * (1 - 0.3 * (i + 1) / N)
    V = [tuple(a + Vector((0, ra * 0.6, 0))), tuple(a + Vector((0, ra + ha, 0))), tuple(b + Vector((0, rb + hb, 0))), tuple(b + Vector((0, rb * 0.6, 0)))]
    V2 = [tuple(Vector(v) + Vector((0.004, 0, 0))) for v in V]
    fin.add(V + V2, [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (2, 6, 7, 3)])
    if i >= N // 2:   # the anal fin under the rear half
        V = [tuple(a - Vector((0, ra * 0.6, 0))), tuple(a - Vector((0, ra + ha * 0.8, 0))), tuple(b - Vector((0, rb + hb * 0.8, 0))), tuple(b - Vector((0, rb * 0.6, 0)))]
        V2 = [tuple(Vector(v) + Vector((0.004, 0, 0))) for v in V]
        fin.add(V + V2, [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (2, 3, 7, 6)])
parts = [fin]
parts += fish_eye((0.043, 0.165, 0.9), 0.016, 1, iris='#d8c070')
parts += fish_eye((-0.043, 0.165, 0.9), 0.016, -1, iris='#d8c070')
# teeth: small pale cones along both jaws
tt = Part('tooth', bone='head', color=srgb('#f2ece0'))
for sx in (1, -1):
    for k in range(6):
        z = 0.84 + k * 0.022; x = sx * (0.036 - k * 0.003)
        tt.add(*tube([(x, 0.088, z), (x, 0.075, z)], [0.004, 0.0008], 4))
parts.append(tt)
def paint(P, N_, tag):
    if tag == 'fin_d':
        return mix(BROWN, BLACK, 0.4 * smooth(0.3, 0.1, worley(P, 1 / 0.03, 7)[0]))
    c = mix(TAN, BROWN, 0.5 + 0.3 * noise.noise(P * 20))
    d, rid = worley(P, 1 / (0.04 if P.z > 0.6 else 0.05), 11)
    spot = smooth(0.42, 0.28, d) if P.z > 0.55 else smooth(0.5, 0.35, d) * (0.6 + 0.4 * rid)
    c = mix(c, BLACK, 0.85 * spot)
    if P.z > 0.62 and N_.y < -0.4: c = mix(c, TAN, 0.4)
    if 0.66 < P.z < 0.71 and abs(P.x) > 0.05: c = mix(c, BLACK, 0.6)          # gill opening
    if P.z > 0.76 and P.y < 0.085: c = mix(c, PINK, 0.35)                      # inside of the mouth
    return c
def body_wave(ph, amp, lag=0.11, head=0.2):
    p = {'body': (0, -amp * head * math.sin(TAU * ph), 0)}
    for i in range(N):
        k = (i + 1) / N
        p['s%d' % (i + 1)] = (0, amp * (0.4 + 0.6 * k) * math.sin(TAU * (ph - (i + 1) * lag)), 0)
    return p
def breathe(p, ph, k=1.0):
    p['jaw'] = (k * (6 + 6 * math.sin(TAU * ph * 2)), 0, 0); return p
def fly(ph): return breathe(body_wave(ph, 22), ph)
def glide(ph): return breathe(body_wave(ph, 12), ph)
def hover(ph): return breathe(body_wave(ph * 2, 6), ph * 2)
def perch(ph):
    p = {'s%d' % (i + 1): (0, 8 * math.sin(TAU * (ph - i * 0.1)) * (i / N), 0) for i in range(N)}
    p['body'] = (0, 10 * math.sin(TAU * ph), 0); p['head'] = (-3 * math.sin(TAU * ph * 2), 6 * math.sin(TAU * ph), 0)
    return breathe(p, ph * 3, 1.3)
def eat(ph):
    k = max(0.0, math.sin(TAU * ph)) ** 4
    p = body_wave(ph, 8); p['jaw'] = (8 + 30 * k, 0, 0); p['body'] = ((0, 0, 0), (0, 0, 0.12 * k)); return p
def sleep(ph): return breathe(body_wave(ph, 3), ph, 0.6)
SPEC = dict(id='moray', bones=bones, blobs=blobs, parts=parts, paint=paint, paintParts=True, res=0.009, tris=2200, skin='smooth',
            noLids=True, actions={'fly': (36, fly), 'glide': (60, glide), 'hover': (90, hover), 'perch': (150, perch), 'eat': (48, eat), 'sleep': (150, sleep)},
            meta=dict(rough=0.35, height=0.22, length=L + 0.35, speeds={'fly': 1.4, 'walk': 0.4}, map={'idle': 'perch', 'walk': 'glide', 'run': 'fly', 'sit': 'perch'}))
