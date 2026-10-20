# קיפוד ים (Diadema setosum, the long-spined sea urchin): a round dark shell covered with very long, thin black spines
# that turn toward any shadow; five white dots and an orange ring on top. It grazes algae off the rock at night, and
# that leaves room for young corals to settle.
R = 0.13
BLACK, DARK, ORANGE, WHITE, BLUE = srgb('#141414'), srgb('#232026'), srgb('#e8761e'), srgb('#e6eef6'), srgb('#3a6ad0')
NG = 6
bones = [('body', None, (0, 0.02, 0), (0, 0.24, 0))]
for i in range(NG):
    a = TAU * i / NG
    bones.append(('g%d' % (i + 1), 'body', (0, 0.12, 0), (0.12 * math.cos(a), 0.2, 0.12 * math.sin(a))))
blobs = [dict(t='ell', c=(0, 0.11, 0), r=(R, R * 0.75, R), bone='body'),
         dict(t='ell', c=(0, 0.2, 0), r=(0.03, 0.02, 0.03), bone='body')]           # the little cone on top
sp = []
rng = random.Random(4)
spines = Part('spine', bones=['g%d' % (i + 1) for i in range(NG)])
n = 0
for i in range(170):
    # spread over the upper two thirds of the shell (fibonacci sphere)
    y = 1 - (i + 0.5) / 170 * 1.45
    if y < -0.4: continue
    r = math.sqrt(max(0, 1 - y * y)); a = i * 2.399963
    d = Vector((r * math.cos(a), y, r * math.sin(a))).normalized()
    base = Vector((0, 0.11, 0)) + Vector((d.x * R, d.y * R * 0.75, d.z * R)) * 0.92
    ln = 0.22 + 0.16 * rng.random() if y > -0.1 else 0.12 + 0.06 * rng.random()
    tip = base + (d + Vector((0, 0.25, 0))).normalized() * ln
    spines.add(*tube([tuple(base), tuple(base + (tip - base) * 0.5), tuple(tip)], [0.0045, 0.003, 0.0006], 4, cap0=False))
    n += 1
parts = [spines]
def paint(P, N, tag):
    if tag == 'spine':
        return mix(BLACK, srgb('#3a3236'), 0.3 * (0.5 + 0.5 * math.sin(P.y * 160)))
    c = DARK
    if P.y > 0.18:
        r = math.hypot(P.x, P.z)
        c = mix(c, ORANGE, smooth(0.04, 0.025, abs(r - 0.035)))                 # the orange ring
        a = math.atan2(P.z, P.x)
        for k in range(5):                                                      # five white dots
            q = Vector((0.065 * math.cos(TAU * k / 5), 0, 0.065 * math.sin(TAU * k / 5)))
            if (Vector((P.x, 0, P.z)) - q).length < 0.012: c = WHITE
    c = mix(c, BLUE, 0.25 * smooth(0.6, 0.9, noise.noise(P * 60)))             # iridescent blue flecks
    return c
def S(x): return math.sin(TAU * x)
def sway(ph, amp):
    return {'g%d' % (i + 1): (amp * S(ph - i / NG), 0, amp * 0.6 * S(ph - i / NG + 0.25)) for i in range(NG)}
def idle(ph): p = sway(ph, 5); p['body'] = ((0, 0, 0), None); return p
def walk(ph): p = sway(ph * 2, 8); p['body'] = ((1.5 * S(ph), 0, 1.5 * S(ph + 0.25)), (0, 0.003 * abs(S(ph)), 0)); return p
def eat(ph): p = sway(ph, 4); p['body'] = ((3 * S(ph * 2), 0, 0), None); return p
def sleep(ph): return sway(ph, 2)
SPEC = dict(id='urchin', bones=bones, blobs=blobs, parts=parts, paint=paint, paintParts=True, res=0.006, tris=900, skin='smooth',
            noLids=True, noTone=True, actions={'idle': (120, idle), 'walk': (90, walk), 'eat': (90, eat), 'sleep': (120, sleep)},
            meta=dict(rough=0.4, height=0.5, length=0.6, speeds={'walk': 0.08, 'run': 0.12}, map={'run': 'walk', 'sit': 'idle', 'swim': 'walk'}))
