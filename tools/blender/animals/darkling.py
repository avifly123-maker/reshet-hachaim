# חיפושית שחורה (a desert darkling beetle) – a domed, glossy black body with fused wing cases, a small head with short
# beaded antennae, and six long legs that lift the body above the hot sand.
BLK, BLK2, SHEEN = srgb('#141210'), srgb('#2a2622'), srgb('#4a4640')
bones = [('body', None, (0, 0.03, -0.03), (0, 0.03, 0.04))]
blobs = [dict(t='ell', c=(0, 0.032, -0.01), r=(0.026, 0.022, 0.036), bone='body'),     # the domed wing cases
         dict(t='ell', c=(0, 0.03, 0.03), r=(0.018, 0.014, 0.012), bone='body'),      # the shield behind the head
         dict(t='ell', c=(0, 0.028, 0.046), r=(0.011, 0.009, 0.009), bone='body')]    # the head
parts = []
def limb(nm, parent, pts, radii, tag='leg'):
    bs = []
    for i in range(len(pts) - 1):
        bs.append((nm + str(i + 1), parent if i == 0 else nm + str(i), tuple(pts[i]), tuple(pts[i + 1])))
    p = Part(tag, bones=[b[0] for b in bs]); p.add(*tube([tuple(x) for x in pts], radii, 5)); return bs, p
for k, (z, ang) in enumerate([(0.025, 0.6), (0.005, 0.05), (-0.02, -0.55)]):
    for sx, L in ((1, 'l'), (-1, 'r')):
        a = Vector((sx * 0.016, 0.022, z)); d = Vector((sx * math.cos(ang), 0, math.sin(ang)))
        b = a + d * 0.024 + Vector((0, 0.016, 0)); c = b + d * 0.03 + Vector((0, -0.04, 0))
        bs, p = limb('l%d%s' % (k, L), 'body', [a, b, c], [0.0028, 0.0024, 0.0012]); bones += bs; parts.append(p)
ant = Part('ant', bone='body')
for sx in (1, -1):
    b = Vector((sx * 0.006, 0.032, 0.054))
    ant.add(*tube([tuple(b), tuple(b + Vector((sx * 0.01, 0.006, 0.012))), tuple(b + Vector((sx * 0.018, 0.004, 0.022)))], [0.0016, 0.0016, 0.002], 5))
parts.append(ant)
for sx in (1, -1):
    parts += eye_parts((sx * 0.008, 0.031, 0.05), 0.0024, 'body', '#050404', (sx, 0.3, 0.6))
def paint(P, N, tag):
    c = mix(BLK, BLK2, 0.4 + 0.3 * noise.noise(P * 300))
    if tag in ('', 'body'):
        ridge = 0.5 + 0.5 * math.cos(P.x * 2 * math.pi / 0.008)          # fine ridges along the wing cases
        c = mix(c, SHEEN, smooth(0.85, 0.98, ridge) * 0.4 * smooth(0.0, 0.5, N.y))
    return c
def S(x): return math.sin(TAU * x)
def legs(ph, amp):
    p = {}
    for k in range(3):
        for sd, L in ((1, 'l'), (-1, 'r')):
            o = ((k % 2) * 0.5 + (0.5 if sd < 0 else 0)) % 1      # a tripod gait
            p['l%d%s1' % (k, L)] = (0, sd * amp * S(ph + o), sd * 10 * max(0, S(ph + o + 0.25)))
    return p
def walk(ph): return legs(ph, 22)
def run(ph): return legs(ph, 30)
def idle(ph): return legs(ph, 0)
def eat(ph):
    p = legs(ph, 0); p['body'] = ((6 + 4 * S(ph * 2), 0, 0), (0, -0.003, 0)); return p
def sleep(ph): return legs(ph, 0)
SPEC = dict(id='darkling', bones=bones, blobs=blobs, parts=parts, paint=paint, paintParts=True, res=0.0018, tris=1300, skin='shell',
            noLids=True, actions={'walk': (16, walk), 'run': (10, run), 'idle': (90, idle), 'eat': (40, eat), 'sleep': (90, sleep)},
            meta=dict(rough=0.25, height=0.07, length=0.11, speeds={'walk': 0.2, 'run': 0.5}, map={'sit': 'idle', 'swim': 'walk', 'climb': 'walk', 'fly': 'walk'}))
