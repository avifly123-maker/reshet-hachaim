# עקרב צהוב (a desert scorpion) – pale yellow, a flat body of plates, two long pincers in front, four pairs of legs and a
# tail of five segments that curls up over the back and ends in a bulb with the sting. It hunts at night. No cross
# shapes: the plates are rounded, the legs leave the body at different angles, the tail is one curve.
YEL, YEL2, AMB, DARK = srgb('#e6c25a'), srgb('#c89a3a'), srgb('#b07a2a'), srgb('#3a2a14')
bones = [('body', None, (0, 0.03, -0.03), (0, 0.032, 0.05))]
blobs = [dict(t='ell', c=(0, 0.03, 0.035), r=(0.026, 0.012, 0.026), bone='body'),      # the head-shield
         dict(t='ell', c=(0, 0.029, -0.01), r=(0.03, 0.013, 0.035), bone='body')]      # the plated belly
# the tail: five segments rising from the back of the body, curling forward over it
TP = [(0, 0.03, -0.045), (0, 0.045, -0.075), (0, 0.075, -0.09), (0, 0.105, -0.08), (0, 0.125, -0.055), (0, 0.13, -0.03)]
bones += chain('tail', TP, 'body')
for i in range(len(TP) - 1):
    blobs.append(dict(t='cap', a=TP[i], b2=TP[i + 1], r=(0.011 - i * 0.0008, 0.01 - i * 0.0008), bone='tail%d' % (i + 1)))
parts = []
bulb = Part('sting', bone='tail%d' % (len(TP) - 1), mat=1)
bulb.add(*ellipsoid((0, 0.128, -0.022), (0.009, 0.008, 0.012), 10, 7))
bulb.add(*tube([(0, 0.124, -0.012), (0, 0.112, -0.004), (0, 0.1, -0.006)], [0.004, 0.002, 0.0006], 5))
parts.append(bulb)
def limb(nm, parent, pts, radii, tag='leg'):
    bs = []
    for i in range(len(pts) - 1):
        bs.append((nm + str(i + 1), parent if i == 0 else nm + str(i), tuple(pts[i]), tuple(pts[i + 1])))
    p = Part(tag, bones=[b[0] for b in bs]); p.add(*tube([tuple(x) for x in pts], radii, 6)); return bs, p
# the pincers: an arm forward, then a long claw
for sx, L in ((1, 'l'), (-1, 'r')):
    a = Vector((sx * 0.018, 0.03, 0.05)); b = a + Vector((sx * 0.03, 0.002, 0.02)); c = b + Vector((sx * -0.004, 0.0, 0.03))
    bs, p = limb('p' + L, 'body', [a, b, c], [0.005, 0.005, 0.006], 'arm'); bones += bs; parts.append(p)
    claw = Part('claw', bone=bs[-1][0], mat=1)
    claw.add(*ellipsoid(tuple(c + Vector((0, 0, 0.012))), (0.009, 0.006, 0.016), 10, 6))
    claw.add(*tube([tuple(c + Vector((sx * 0.004, 0, 0.024))), tuple(c + Vector((sx * 0.002, 0.0, 0.04)))], [0.004, 0.0012], 5))
    claw.add(*tube([tuple(c + Vector((sx * -0.004, 0, 0.024))), tuple(c + Vector((sx * -0.001, -0.001, 0.037)))], [0.0035, 0.001], 5))
    parts.append(claw)
# four pairs of legs, spread at different angles
for k, (z, ang) in enumerate([(0.03, 0.5), (0.012, 0.2), (-0.006, -0.15), (-0.024, -0.45)]):
    for sx, L in ((1, 'l'), (-1, 'r')):
        a = Vector((sx * 0.022, 0.026, z)); d = Vector((sx * math.cos(ang), 0, math.sin(ang)))
        b = a + d * 0.028 + Vector((0, 0.014, 0)); c = b + d * 0.022 + Vector((0, -0.04, 0))
        bs, p = limb('l%d%s' % (k, L), 'body', [a, b, c], [0.003, 0.0027, 0.0012]); bones += bs; parts.append(p)
for sx in (1, -1):
    parts += eye_parts((sx * 0.004, 0.043, 0.04), 0.0025, 'body', '#0a0806', (sx, 1, 0.3))
def paint(P, N, tag):
    n = noise.noise(P * 200)
    c = mix(YEL, YEL2, 0.35 + 0.3 * n)
    if tag in ('', 'body'):
        band = 0.5 + 0.5 * math.cos(P.z * 2 * math.pi / 0.012)          # the plates of the back
        c = mix(c, AMB, smooth(0.8, 0.95, band) * 0.6)
    if tag == 'sting': c = mix(AMB, DARK, smooth(-0.02, -0.004, P.z))
    if tag == 'claw': c = mix(YEL2, AMB, 0.4)
    return c
def S(x): return math.sin(TAU * x)
def legs(ph, amp):
    p = {}
    for k in range(4):
        for sd, L in ((1, 'l'), (-1, 'r')):
            o = (k * 0.25 + (0.5 if sd < 0 else 0)) % 1
            p['l%d%s1' % (k, L)] = (0, sd * amp * S(ph + o), sd * 8 * max(0, S(ph + o + 0.25)))
    return p
def walk(ph):
    p = legs(ph, 18); p['tail1'] = (3 * S(ph), 0, 0); p['pl1'] = (0, 6 * S(ph), 0); p['pr1'] = (0, -6 * S(ph), 0); return p
def run(ph):
    p = legs(ph, 28); p['tail1'] = (5 * S(ph * 2), 0, 0); return p
def idle(ph):
    p = legs(ph, 0); p['tail4'] = (6 * S(ph), 0, 0); p['pl2'] = (0, 8 * max(0, S(ph * 2)), 0); p['pr2'] = (0, -8 * max(0, S(ph * 2 + 0.3)), 0); return p
def eat(ph):      # the pincers bring the prey to the mouth
    p = legs(ph, 0); p['pl1'] = (10, -25 + 10 * S(ph * 2), 0); p['pr1'] = (10, 25 - 10 * S(ph * 2), 0); p['tail3'] = (8 * S(ph), 0, 0); return p
def sleep(ph):
    p = legs(ph, 0); p['tail1'] = (-15, 0, 0); return p
SPEC = dict(id='scorpion', bones=bones, blobs=blobs, parts=parts, paint=paint, paintParts=True, res=0.0022, tris=1600, skin='shell',
            noLids=True, actions={'walk': (24, walk), 'run': (14, run), 'idle': (90, idle), 'eat': (48, eat), 'sleep': (90, sleep)},
            meta=dict(rough=0.4, height=0.14, length=0.2, speeds={'walk': 0.18, 'run': 0.6}, map={'sit': 'idle', 'swim': 'walk', 'climb': 'walk'}))
