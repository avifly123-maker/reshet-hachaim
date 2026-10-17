# שרימפס אקדח (Alpheus, the pistol shrimp that shares a burrow with the prawn goby): a small orange shrimp with white
# bands, one claw much bigger than the other – snapping it shut makes a loud "click" under water. It is almost blind:
# it digs and keeps the burrow, and keeps one antenna on the goby, which warns it of danger with a flick of its tail.
ORANGE, WHITE, RED, PALE = srgb('#e8783a'), srgb('#f6efe6'), srgb('#c8462a'), srgb('#f6d0b0')
bones = [('body', None, (0, 0.05, 0.0), (0, 0.055, 0.1)),
         ('abd1', 'body', (0, 0.05, 0.0), (0, 0.048, -0.05)), ('abd2', 'abd1', (0, 0.048, -0.05), (0, 0.042, -0.1)),
         ('fan', 'abd2', (0, 0.042, -0.1), (0, 0.035, -0.15))]
blobs = [dict(t='ell', c=(0, 0.055, 0.055), r=(0.032, 0.03, 0.065), bone='body'),
         dict(t='ell', c=(0, 0.06, 0.12), r=(0.012, 0.01, 0.025), bone='body')]       # rostrum
for i, (z, r) in enumerate([(-0.01, 0.03), (-0.035, 0.029), (-0.06, 0.026), (-0.085, 0.022), (-0.105, 0.018)]):
    blobs.append(dict(t='ell', c=(0, 0.05, z), r=(r * 0.95, r * 0.9, 0.018), bone='abd1' if i < 2 else 'abd2'))
parts = []
# tail fan
fan = Part('fan', bone='fan')
for a in (-0.6, -0.25, 0.0, 0.25, 0.6):
    d = Vector((math.sin(a), 0, -math.cos(a)))
    o = Vector((0, 0.04, -0.11))
    V, F = plate(tuple(o), tuple(d), (math.cos(a), 0, math.sin(a)), [(0, -0.006), (0.035, -0.011), (0.045, 0), (0.035, 0.011), (0, 0.006)], thick=0.003)
    fan.add(V, F)
parts.append(fan)
def limb(nm, parent, pts, radii, tag='leg'):
    bs = []
    for i in range(len(pts) - 1):
        bs.append((nm + str(i + 1), parent if i == 0 else nm + str(i), tuple(pts[i]), tuple(pts[i + 1])))
    p = Part(tag, bones=[b[0] for b in bs]); p.add(*tube([tuple(x) for x in pts], radii, 5)); return bs, p
# big snapping claw (right) and small claw (left)
for sx, big in ((-1, True), (1, False)):
    sh = Vector((sx * 0.022, 0.035, 0.085)); el = sh + Vector((sx * 0.02, -0.005, 0.045)); wr = el + Vector((sx * 0.005, 0.0, 0.035 if big else 0.025))
    bs, p = limb('c' + ('r' if sx < 0 else 'l'), 'body', [sh, el, wr], [0.007, 0.007, 0.006]); bones += bs; parts.append(p)
    hand = Part('claw', bone=bs[-1][0])
    if big:
        hand.add(*ellipsoid(tuple(wr + Vector((0, 0.004, 0.03))), (0.022, 0.016, 0.04), 14, 8))
        hand.add(*tube([tuple(wr + Vector((sx * -0.004, -0.004, 0.06))), tuple(wr + Vector((sx * -0.002, -0.006, 0.085)))], [0.008, 0.002], 6))
    else:
        hand.add(*ellipsoid(tuple(wr + Vector((0, 0, 0.018))), (0.008, 0.007, 0.022), 10, 6))
    parts.append(hand)
# walking legs, four pairs
for k in range(4):
    for sx in (1, -1):
        z = 0.07 - k * 0.022; a = Vector((sx * 0.02, 0.035, z)); b = a + Vector((sx * 0.035, 0.012, 0.004)); c = b + Vector((sx * 0.02, -0.05, -0.006))
        bs, p = limb('l%d%s' % (k, 'l' if sx > 0 else 'r'), 'body', [a, b, c], [0.004, 0.0035, 0.0015]); bones += bs; parts.append(p)
# antennae: long, forward and out
ant = Part('ant', bone='body')
for sx in (1, -1):
    b = Vector((sx * 0.008, 0.07, 0.12))
    ant.add(*tube([tuple(b), tuple(b + Vector((sx * 0.04, 0.03, 0.08))), tuple(b + Vector((sx * 0.09, 0.02, 0.2)))], [0.0015, 0.001, 0.0004], 4))
parts.append(ant)
for sx in (1, -1):
    parts += fish_eye((sx * 0.012, 0.07, 0.105), 0.007, sx, iris='#3a2a2a', ring='#1a1010', bone='body')
def paint(P, N, tag):
    if tag == 'ant': return PALE
    band = 0.5 + 0.5 * math.cos(P.z * 2 * math.pi / 0.024)
    c = mix(ORANGE, WHITE, smooth(0.75, 0.9, band) * (0.85 if tag in ('body', 'fan') else 0.5))
    if tag in ('claw',): c = mix(RED, ORANGE, 0.4 + 0.3 * noise.noise(P * 120))
    if tag == 'leg': c = mix(PALE, ORANGE, 0.5 + 0.5 * math.sin(P.y * 300))
    return c
def S(x): return math.sin(TAU * x)
def legs(ph, amp):
    p = {}
    for k in range(4):
        for sd, L in ((1, 'l'), (-1, 'r')):
            o = (k * 0.25 + (0.5 if sd < 0 else 0)) % 1
            p['l%d%s1' % (k, L)] = (0, sd * amp * S(ph + o), sd * 6 * max(0, S(ph + o + 0.25)))
    return p
def walk(ph):
    p = legs(ph, 20); p['body'] = ((0, 0, 0), (0, 0.002 * abs(S(ph * 2)), 0)); p['abd1'] = (2 * S(ph), 0, 0); p['fan'] = (4 * S(ph), 0, 0)
    p['cr1'] = (-5, 0, 0); p['cl1'] = (-5 + 6 * S(ph), 0, 0); return p
def run(ph):      # the escape: a quick flick of the tail
    k = max(0, S(ph)) ** 2
    p = legs(ph, 8); p['abd1'] = (40 * k, 0, 0); p['abd2'] = (40 * k, 0, 0); p['fan'] = (20 * k, 0, 0); return p
def idle(ph):
    p = legs(ph, 2); p['cl1'] = (6 * S(ph * 2), 0, 0); p['cl2'] = (-10 * max(0, S(ph * 3)), 0, 0); p['fan'] = (3 * S(ph * 2), 0, 0); return p
def eat(ph):   # bulldozing sand with the claws held together in front
    p = legs(ph, 10); p['cr1'] = (20 + 10 * S(ph * 2), -10, 0); p['cl1'] = (20 + 10 * S(ph * 2), 10, 0); return p
def sleep(ph): return legs(ph, 0)
SPEC = dict(id='shrimp', bones=bones, blobs=blobs, parts=parts, paint=paint, paintParts=True, res=0.003, tris=1400, skin='shell',
            noLids=True, actions={'walk': (24, walk), 'run': (20, run), 'idle': (90, idle), 'eat': (48, eat), 'sleep': (90, sleep)},
            meta=dict(rough=0.35, height=0.09, length=0.35, speeds={'walk': 0.25, 'run': 0.8}, map={'sit': 'idle', 'swim': 'run'}))
