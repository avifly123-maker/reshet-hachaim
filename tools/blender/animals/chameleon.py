# זיקית מצויה (Chamaeleo chamaeleon) – tall narrow green body with a pale side stripe and dark bands, helmet-like casque,
# turret eyes that swivel on their own, grasping feet and a coiled tail. Rocks back and forth as it creeps along a branch.
TAIL = [(0, 0.12, -0.065), (0, 0.095, -0.12), (0, 0.06, -0.155), (0, 0.03, -0.15), (0, 0.025, -0.115), (0, 0.045, -0.1)]
blobs = [
    dict(t='ell', c=(0, 0.13, -0.005), r=(0.034, 0.058, 0.075), bone='hips'),
    dict(t='ell', c=(0, 0.135, 0.05), r=(0.032, 0.052, 0.045), bone='chest'),
    dict(t='ell', c=(0, 0.17, -0.01), r=(0.008, 0.035, 0.07), bone='hips'),          # dorsal ridge
    dict(t='ell', c=(0, 0.15, 0.1), r=(0.03, 0.036, 0.042), bone='head'),
    dict(t='ell', c=(0, 0.185, 0.075), r=(0.012, 0.03, 0.04), rot=(-25, 0, 0), bone='head'),   # casque
    dict(t='ell', c=(0, 0.138, 0.135), r=(0.02, 0.022, 0.022), bone='head'),
    dict(t='cap', a=TAIL[0], b2=TAIL[1], r=(0.02, 0.014), bone='tail1'),
    dict(t='cap', a=TAIL[1], b2=TAIL[2], r=(0.014, 0.01), bone='tail2'),
    dict(t='cap', a=TAIL[2], b2=TAIL[3], r=(0.01, 0.008), bone='tail3'),
    dict(t='cap', a=TAIL[3], b2=TAIL[4], r=(0.008, 0.006), bone='tail4'),
    dict(t='cap', a=TAIL[4], b2=TAIL[5], r=(0.006, 0.004), bone='tail5'),
]
for sx, L in ((1, 'l'), (-1, 'r')):
    blobs += [
        dict(t='cap', a=(sx * 0.022, 0.11, 0.05), b2=(sx * 0.042, 0.065, 0.075), r=(0.011, 0.009), bone='f' + L),
        dict(t='cap', a=(sx * 0.042, 0.065, 0.075), b2=(sx * 0.03, 0.008, 0.07), r=(0.009, 0.007), bone='f' + L + '2'),
        dict(t='ell', c=(sx * 0.03, 0.006, 0.07), r=(0.01, 0.006, 0.012), bone='f' + L + '2'),
        dict(t='cap', a=(sx * 0.022, 0.105, -0.05), b2=(sx * 0.042, 0.06, -0.075), r=(0.012, 0.01), bone='h' + L),
        dict(t='cap', a=(sx * 0.042, 0.06, -0.075), b2=(sx * 0.03, 0.008, -0.07), r=(0.01, 0.007), bone='h' + L + '2'),
        dict(t='ell', c=(sx * 0.03, 0.006, -0.07), r=(0.01, 0.006, 0.012), bone='h' + L + '2'),
    ]
bones = [('hips', None, (0, 0.13, -0.06), (0, 0.132, 0.02)), ('chest', 'hips', (0, 0.132, 0.02), (0, 0.14, 0.07)),
         ('head', 'chest', (0, 0.145, 0.07), (0, 0.14, 0.16))] + chain('tail', TAIL, 'hips')
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', (sx * 0.022, 0.11, 0.05), (sx * 0.042, 0.065, 0.075)), ('f' + L + '2', 'f' + L, (sx * 0.042, 0.065, 0.075), (sx * 0.03, 0.0, 0.07)),
              ('h' + L, 'hips', (sx * 0.022, 0.105, -0.05), (sx * 0.042, 0.06, -0.075)), ('h' + L + '2', 'h' + L, (sx * 0.042, 0.06, -0.075), (sx * 0.03, 0.0, -0.07))]
    bones.append(('eye' + L.upper(), 'head', (sx * 0.024, 0.158, 0.11), (sx * 0.042, 0.16, 0.115)))

GREEN, GREEN2, PALE, BAND, BELLY = srgb('#5aa83a'), srgb('#3c8a2c'), srgb('#d8e8a0'), srgb('#2e5a22'), srgb('#c8dc90')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 120, y * 120, z * 120)))
    c = mix(GREEN, GREEN2, 0.3 + 0.35 * n)
    c = mix(c, BAND, 0.45 * smooth(0.6, 0.9, 0.5 + 0.5 * math.sin(z * 55)) * smooth(0.11, 0.14, y))
    c = mix(c, PALE, smooth(0.008, 0.0, abs(y - 0.105 - z * 0.08)) * (1 if -0.07 < z < 0.08 else 0) * 0.9)   # side stripe
    if N.y < -0.5: c = mix(c, BELLY, 0.6)
    d, rid = worley(P, 140, 4)
    if rid > 0.75: c = mix(c, PALE, smooth(0.25, 0.12, d) * 0.6)
    return c

parts = []
for sx, L in ((1, 'l'), (-1, 'r')):
    # turret eye: a scaly cone with a tiny black pupil at its tip
    tur = Part('turret', bone='eye' + L.upper(), color=GREEN)
    tv, tf = ellipsoid((sx * 0.03, 0.158, 0.112), (0.014, 0.015, 0.015), 10, 6)
    tur.add(tv, tf, [mix(GREEN, PALE, 0.3 * math.sin(i)) for i in range(len(tv))]); parts.append(tur)
    pu = Part('pupil', bone='eye' + L.upper(), mat=1, color=srgb('#0a0a08')); pu.add(*ellipsoid((sx * 0.044, 0.159, 0.115), (0.0035, 0.004, 0.004), 6, 4)); parts.append(pu)
    for leg, z0, b in (('f', 0.07, 'f%s2'), ('h', -0.07, 'h%s2')):    # grasping feet: two pads gripping the branch
        g = Part('grip', bone=b % L, color=GREEN2)
        g.add(*ellipsoid((sx * 0.03, 0.004, z0 + 0.012), (0.008, 0.005, 0.01), 6, 4)); g.add(*ellipsoid((sx * 0.03, 0.004, z0 - 0.012), (0.008, 0.005, 0.01), 6, 4))
        parts.append(g)

def S(x): return math.sin(TAU * x)
def eyes(p, ph, k=1.0):
    p['eyeL'] = (12 * S(ph * 2) * k, 40 * S(ph * 1.3) * k, 0); p['eyeR'] = (-10 * S(ph * 1.7 + 0.3) * k, -35 * S(ph * 0.9 + 0.5) * k, 0)
def walk(ph):     # slow, deliberate, rocking forward and back
    p = {}
    for L, s, off in (('fl', 1, 0), ('hr', -1, 0), ('fr', -1, 0.5), ('hl', 1, 0.5)):
        u = (ph + off) % 1; sw = math.cos(TAU * u); lift = max(0, math.sin(TAU * u))
        p[L] = (25 * sw, 0, s * 10 * lift); p[L + '2'] = (-20 * lift if L[0] == 'h' else 20 * lift, 0, 0)
    p['hips'] = ((0, 0, 3 * S(ph)), (0, 0, 0.008 * S(ph * 2)))
    p['head'] = (0, 4 * S(ph), 0)
    for i in range(1, 6): p['tail%d' % i] = (4 * S(ph - 0.1 * i), 0, 0)
    eyes(p, ph); return p
def idle(ph):
    rock = S(ph * 3) * smooth(0.1, 0.2, ph) * smooth(0.5, 0.4, ph)
    p = {'hips': ((0, 0, 0), (0, 0, 0.01 * rock)), 'head': (3 * S(ph), 8 * S(ph * 0.5), 0)}
    for i in range(1, 6): p['tail%d' % i] = (3 * S(ph * 2 - 0.1 * i), 0, 0)
    eyes(p, ph); return p
def eat(ph):      # fixes both eyes ahead, leans, strikes
    s = smooth(0.3, 0.38, ph) * smooth(0.55, 0.45, ph)
    p = {'hips': ((0, 0, 0), (0, 0, 0.015 * s)), 'chest': (6 * s, 0, 0), 'head': (4 * s, 0, 0), 'eyeL': (0, -15, 0), 'eyeR': (0, 15, 0)}
    return p
def sleep(ph):
    p = {'hips': ((0, 0, 0), (0, -0.01, 0)), 'head': (8, 0, 0), 'eyeL': (0, 0, 0), 'eyeR': (0, 0, 0)}
    for i in range(1, 6): p['tail%d' % i] = (12, 0, 0)
    return p
H = (0, 0.13, -0.06)
SPEC = dict(id='chameleon', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.0025, tris=2200, smooth=8,
            actions={'idle': (150, idle), 'walk': (48, walk), 'eat': (60, eat), 'sleep': (90, sleep), 'climb': (48, reorient(walk, H, 'climb'))},
            meta=dict(height=0.22, length=0.4, speeds={'walk': 0.15, 'run': 0.3}, map={'perch': 'idle', 'run': 'walk', 'hang': 'idle', 'sit': 'idle'}))
