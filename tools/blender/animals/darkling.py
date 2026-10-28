# חיפושית שחורה (a desert darkling beetle) – a domed, glossy black body with fused wing cases, a small head with short
# beaded antennae, and six long legs that lift the body above the hot sand.
own('darkling')   # modelled on its own: no family tweaks from the kit
BLK, BLK2, SHEEN = srgb('#141210'), srgb('#2a2622'), srgb('#4a4640')
bones = [('body', None, (0, 0.03, -0.03), (0, 0.03, 0.04))]
blobs = [dict(t='ell', c=(0, 0.03, -0.01), r=(0.025, 0.017, 0.034), bone='body'),     # the domed wing cases
         dict(t='ell', c=(0, 0.03, 0.03), r=(0.018, 0.014, 0.012), bone='body'),      # the shield behind the head
         dict(t='ell', c=(0, 0.028, 0.046), r=(0.011, 0.009, 0.009), bone='body')]    # the head
parts = []
def limb(nm, parent, pts, radii, tag='leg'):
    bs = []
    for i in range(len(pts) - 1):
        bs.append((nm + str(i + 1), parent if i == 0 else nm + str(i), tuple(pts[i]), tuple(pts[i + 1])))
    p = Part(tag, bones=[b[0] for b in bs]); p.add(*tube([tuple(x) for x in pts], radii, 5)); return bs, p
for k, (z, ang) in enumerate([(0.024, 0.75), (0.006, 0.1), (-0.016, -0.6)]):
    for sx, L in ((1, 'l'), (-1, 'r')):
        # femur up and out, tibia down to the sand, a short foot along the sand: a knee you can see
        a = Vector((sx * 0.015, 0.02, z)); d = Vector((sx * math.cos(ang), 0, math.sin(ang)))
        b = a + d * 0.02 + Vector((0, 0.009, 0)); c = b + d * 0.01 + Vector((0, -0.028, 0)); e = c + d * 0.008 + Vector((0, -0.001, 0))
        bs, p = limb('l%d%s' % (k, L), 'body', [a, b, c, e], [0.0034, 0.0028, 0.0017, 0.0011]); bones += bs; parts.append(p)
ant = Part('ant', bone='body')
for sx in (1, -1):                                   # beaded antennae: a row of small beads, bending outwards
    for i in range(11):
        t = i / 10; q = Vector((sx * (0.007 + 0.013 * t), 0.031 + 0.006 * math.sin(t * 2.6), 0.052 + 0.016 * t))
        ant.add(*ellipsoid(tuple(q), (0.0011 + 0.0004 * t,) * 3, 6, 4))
parts.append(ant)
jaw = Part('jaw', bone='body')
for sx in (1, -1): jaw.add(*tube([(sx * 0.003, 0.024, 0.053), (sx * 0.0045, 0.023, 0.057), (sx * 0.0015, 0.0225, 0.0595)], [0.0014, 0.0011, 0.0006], 5))
parts.append(jaw)
for sx in (1, -1):
    parts += eye_parts((sx * 0.0095, 0.030, 0.048), 0.0018, 'body', '#050404', (sx, 0.3, 0.4))
parts = [p for p in parts if p.tag != 'hl']          # no white glint: the eyes of a beetle are dull and dark
def paint(P, N, tag):
    c = mix(BLK, BLK2, 0.4 + 0.3 * noise.noise(P * 300))
    if tag in ('', 'body'):
        ridge = 0.5 + 0.5 * math.cos(P.x * 2 * math.pi / 0.008)          # fine ridges along the wing cases
        c = mix(c, SHEEN, smooth(0.85, 0.98, ridge) * 0.4 * smooth(0.0, 0.5, N.y) * smooth(0.024, 0.016, P.z))
        if P.z < 0.022: c = mix(c, BLK, smooth(0.0016, 0.0005, abs(P.x)) * 0.9)          # the seam between the wing cases
        if 0.018 < P.z < 0.026: c = mix(c, BLK, 0.6)                                     # the gap behind the shield
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
            meta=dict(rough=0.25, height=0.07, length=0.11, scale=0.75, speeds={'walk': 0.2, 'run': 0.5}, map={'sit': 'idle', 'swim': 'walk', 'climb': 'walk', 'fly': 'walk'}))
