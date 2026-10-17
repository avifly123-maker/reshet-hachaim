# קוצנון (Acanthaster, a large sea star with many arms – 13 to 19 – all covered with long sharp spines). It eats coral
# polyps: a few are part of a healthy reef, but when there are too many they can strip whole reefs. Divers move them
# away; in the game we relocate them, never harm them.
NA = 14
DISC, ARM = 0.13, 0.17
GREY, PURPLE, RED, ORANGE = srgb('#8a7a90'), srgb('#6a4a7a'), srgb('#b8402a'), srgb('#f08a3a')
bones = [('body', None, (0, 0.0, 0), (0, 0.1, 0))]
blobs = [dict(t='ell', c=(0, 0.045, 0), r=(DISC, 0.045, DISC), bone='body')]
for k in range(NA):
    a = TAU * k / NA; d = Vector((math.sin(a), 0, math.cos(a)))
    b0 = Vector((0, 0.04, 0)) + d * DISC * 0.6; b1 = Vector((0, 0.025, 0)) + d * (DISC + ARM)
    nm = 'a%d' % (k + 1); bones.append((nm, 'body', tuple(b0), tuple(b1)))
    blobs.append(dict(t='cap', a=tuple(b0), b2=tuple(b1), r=(0.035, 0.01), bone=nm))
spines = Part('spine', bones=['body'] + ['a%d' % (k + 1) for k in range(NA)])
rng = random.Random(9)
for i in range(260):
    # points on the top of the disc and the arms
    k = rng.randrange(NA); a = TAU * k / NA; d = Vector((math.sin(a), 0, math.cos(a))); side = d.cross(Vector((0, 1, 0)))
    if i < 60:
        rr = DISC * math.sqrt(rng.random()) * 0.9; aa = rng.random() * TAU
        base = Vector((rr * math.cos(aa), 0.045 + 0.045 * math.sqrt(max(0, 1 - (rr / DISC) ** 2)) * 0.95, rr * math.sin(aa)))
        up = Vector((base.x * 2, 1, base.z * 2)).normalized(); ln = 0.035 + 0.025 * rng.random()
    else:
        t = 0.35 + rng.random() * 0.62; w = (0.035 * (1 - t) + 0.01 * t)
        s_ = (rng.random() * 2 - 1) * 0.8
        base = Vector((0, 0.04 - 0.015 * t, 0)) + d * (DISC * 0.6 + (DISC * 0.4 + ARM) * t) + side * s_ * w + Vector((0, w * 0.6 * math.sqrt(max(0, 1 - s_ * s_)), 0))
        up = (Vector((0, 1, 0)) + side * s_ * 0.8 + d * 0.3).normalized(); ln = 0.03 + 0.02 * rng.random()
    tip = base + up * ln
    spines.add(*tube([tuple(base), tuple(tip)], [0.0035, 0.0004], 4, cap0=False))
parts = [spines]
def paint(P, N, tag):
    if tag == 'spine':
        return mix(RED, ORANGE, smooth(0.04, 0.09, P.y))
    c = mix(GREY, PURPLE, 0.4 + 0.3 * noise.noise(P * 25))
    if N.y < -0.4: c = mix(c, srgb('#c8b0a0'), 0.6)
    return c
def S(x): return math.sin(TAU * x)
def arms(ph, amp, lift=0.0):
    out = {}
    for k in range(NA):
        a = TAU * k / NA; th = lift + amp * S(ph - k / NA)          # lift the arm about its own side axis
        out['a%d' % (k + 1)] = (-th * math.cos(a), 0, th * math.sin(a))
    return out
def idle(ph): return arms(ph, 2)
def walk(ph): p = arms(ph * 2, 5, 2); p['body'] = ((0, 3 * S(ph), 0), (0, 0.002 * abs(S(ph * 2)), 0)); return p
def eat(ph): p = arms(ph, 3, -6); p['body'] = ((0, 0, 0), (0, 0.015, 0)); return p     # humped over the coral
def sleep(ph): return arms(ph, 1)
SPEC = dict(id='starfish', bones=bones, blobs=blobs, parts=parts, paint=paint, paintParts=True, res=0.006, tris=1600, skin='scale',
            noLids=True, actions={'idle': (120, idle), 'walk': (90, walk), 'eat': (90, eat), 'sleep': (120, sleep)},
            meta=dict(rough=0.6, height=0.14, length=0.66, speeds={'walk': 0.06, 'run': 0.1}, map={'run': 'walk', 'sit': 'idle', 'swim': 'walk'}))
