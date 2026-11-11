# תנין היאור (Crocodylus niloticus) – savanna, kit v6, measured from a side photo of a big basking male (Commons
# "Nile Crocodile ... big male basking", 31.10.2026, refs "c0"): snout to vent 1.9 m; the whole animal about 4 m with
# the tail. Drawn in the low walk: a long flat head with eyes and nostrils on top, a heavy body low over the ground,
# short legs splayed to the sides, a long tall tail flattened from side to side with a double row of crests. The back
# carries rows of raised scutes. Dark olive above, mottled on the flanks, a pale cream belly. A row of teeth shows along
# the jaw, as on every crocodile, but the mouth is closed.
own('crocodile')
TAIL = [(0, 0.42, -0.1), (0, 0.36, -0.6), (0, 0.28, -1.1), (0, 0.2, -1.55), (0, 0.13, -1.98)]
blobs = []
for z, top, bot, w in ((1.15, 0.42, 0.16, 0.24), (1.0, 0.5, 0.13, 0.3), (0.7, 0.55, 0.11, 0.36), (0.4, 0.56, 0.11, 0.38),
                       (0.1, 0.53, 0.13, 0.34), (-0.1, 0.48, 0.16, 0.28)):
    blobs.append(dict(t='ell', c=(0, (top + bot) / 2, z), r=(w, (top - bot) / 2, 0.24), bone='chest' if z > 0.5 else 'hips'))
blobs += [
    # the long flat head
    dict(t='ell', c=(0, 0.35, 1.32), r=(0.2, 0.13, 0.2), bone='head'),
    dict(t='ell', c=(0, 0.29, 1.5), r=(0.17, 0.09, 0.15), bone='head'),
    dict(t='ell', c=(0, 0.26, 1.68), r=(0.13, 0.075, 0.13), bone='head'),
    dict(t='ell', c=(0, 0.24, 1.84), r=(0.1, 0.065, 0.08), bone='head'),
    dict(t='ell', c=(0, 0.29, 1.87), r=(0.045, 0.03, 0.04), bone='head'),                          # the nostrils' knob
    # the tail: tall and flat
    dict(t='ell', c=(0, 0.38, -0.35), r=(0.22, 0.2, 0.3), bone='tail1'),
    dict(t='ell', c=(0, 0.32, -0.8), r=(0.15, 0.17, 0.3), bone='tail2'),
    dict(t='ell', c=(0, 0.25, -1.25), r=(0.09, 0.13, 0.3), bone='tail3'),
    dict(t='ell', c=(0, 0.18, -1.65), r=(0.05, 0.09, 0.25), bone='tail4'),
    dict(t='ell', c=(0, 0.13, -1.95), r=(0.025, 0.05, 0.12), bone='tail4'),
]
for sx in (1, -1):
    blobs.append(dict(t='ell', c=(sx * 0.12, 0.45, 1.33), r=(0.05, 0.045, 0.06), bone='head'))     # the raised eye sockets
    for k in range(9):                                                                             # the scutes on the back, two rows a side
        z = 1.0 - k * 0.13
        for xo in (0.08, 0.2):
            blobs.append(dict(t='ell', c=(sx * xo, 0.53 - 0.04 * xo / 0.2 - (0.04 if z < 0 or z > 0.9 else 0), z), r=(0.04, 0.025, 0.045), bone='chest' if z > 0.5 else 'hips'))
    for k in range(13):                                                                            # the double crest along the tail
        z = -0.2 - k * 0.12
        t = k / 12
        blobs.append(dict(t='ell', c=(sx * 0.05 * (1 - t), 0.55 - 0.4 * t, z), r=(0.03, 0.035 * (1 - 0.5 * t), 0.04),
                          bone='tail%d' % min(4, 1 + int(k / 3.3))))
for sx, L in ((1, 'l'), (-1, 'r')):
    blobs += [
        dict(t='cap', a=(sx * 0.28, 0.3, 1.0), b2=(sx * 0.47, 0.24, 1.05), r=(0.1, 0.075), bone='f' + L),
        dict(t='cap', a=(sx * 0.47, 0.24, 1.05), b2=(sx * 0.5, 0.04, 1.13), r=(0.07, 0.055), bone='f' + L + '2'),
        dict(t='ell', c=(sx * 0.52, 0.03, 1.18), r=(0.08, 0.03, 0.09), bone='f' + L + '2', foot=True),
        dict(t='cap', a=(sx * 0.28, 0.3, 0.05), b2=(sx * 0.53, 0.27, 0.0), r=(0.13, 0.095), bone='h' + L),
        dict(t='cap', a=(sx * 0.53, 0.27, 0.0), b2=(sx * 0.57, 0.04, -0.08), r=(0.08, 0.06), bone='h' + L + '2'),
        dict(t='ell', c=(sx * 0.59, 0.03, -0.04), r=(0.09, 0.03, 0.12), bone='h' + L + '2', foot=True),
    ]
LOW = 0.06                                                    # the body hangs low between the splayed legs
for bl in blobs:
    if bl['bone'] not in ('fl', 'fl2', 'fr', 'fr2', 'hl', 'hl2', 'hr', 'hr2'):
        for k in ('c', 'a', 'b2'):
            if k in bl: bl[k] = (bl[k][0], bl[k][1] - LOW, bl[k][2])
TAIL = [(t[0], t[1] - LOW, t[2]) for t in TAIL]
bones = [('hips', None, (0, 0.29, -0.1), (0, 0.32, 0.5)), ('chest', 'hips', (0, 0.32, 0.5), (0, 0.3, 1.15)),
         ('head', 'chest', (0, 0.27, 1.15), (0, 0.2, 1.9))] + chain('tail', TAIL, 'hips')
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', (sx * 0.28, 0.3, 1.0), (sx * 0.47, 0.24, 1.05)), ('f' + L + '2', 'f' + L, (sx * 0.47, 0.24, 1.05), (sx * 0.5, 0.0, 1.15)),
              ('h' + L, 'hips', (sx * 0.28, 0.3, 0.05), (sx * 0.53, 0.27, 0.0)), ('h' + L + '2', 'h' + L, (sx * 0.53, 0.27, 0.0), (sx * 0.57, 0.0, -0.06))]
EYE['crocodile'] = ('#9c9a3a', 'slit', 0.86, 0.35)

TOP, TOP2, FLANK, BELLY, SPOT = srgb('#4e5034'), srgb('#3c3e28'), srgb('#7a7448'), srgb('#d0c49a'), srgb('#2a2a1c')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 5, y * 5, z * 5))); n2 = noise.noise(Vector((x * 30, y * 30, z * 30)))
    c = mix(TOP, TOP2, 0.4 + 0.3 * n)
    c = mix(c, FLANK, smooth(0.4, -0.2, N.y) * 0.6)                                              # paler, yellower flanks
    c = mix(c, SPOT, smooth(0.2, 0.45, n2) * smooth(0.5, 0.0, N.y) * 0.6)                         # dark mottling on the flanks
    c = mix(c, BELLY, smooth(-0.3, -0.7, N.y))                                                   # the pale belly
    if N.y > 0.3:                                                                                # a grid of scales on the back and the tail
        g = min(abs(math.sin(z * 26)), abs(math.sin(x * 32)))
        c = mix(c, SPOT, smooth(0.18, 0.0, g) * 0.5)
    if z < -0.4 and N.y > -0.3: c = mix(c, SPOT, smooth(0.4, 0.9, math.sin(z * 9)) * 0.35)      # dark bands across the tail
    if z > 1.2: c = mix(c, mix(TOP, FLANK, 0.5), 0.3)
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.13, 0.42, 1.34), 0.026, 'head', '#9c9a3a', (sx * 0.6, 0.7, 0.3))
    teeth = Part('teeth', bone='head', color=srgb('#ece6d0'))
    for k in range(8):
        z = 1.5 + k * 0.045
        teeth.add(*ellipsoid((sx * (0.135 - 0.6 * (z - 1.5) * 0.12), 0.155, z), (0.008, 0.016, 0.008), 6, 4))
    parts.append(teeth)
nose = Part('nose', bone='head', color=srgb('#1a1a12'))
for sx in (1, -1): nose.add(*ellipsoid((sx * 0.02, 0.255, 1.88), (0.01, 0.006, 0.012), 6, 4))
parts.append(nose)

names = [b[0] for b in bones]
S = lambda ph: math.sin(TAU * ph)
def legs(ph, a):
    p = {}
    for L, o in (('fl', 0), ('hr', 0), ('fr', 0.5), ('hl', 0.5)):
        p[L] = (a * S(ph + o), 0, 0); p[L + '2'] = (-a * 0.6 * max(0.0, S(ph + o + 0.25)), 0, 0)
    return p
def walk(ph):
    p = legs(ph, 26); p['hips'] = ((0, 5 * S(ph), 0), (0, 0, 0)); p['chest'] = (0, -6 * S(ph), 0)
    for i in range(1, 5): p['tail%d' % i] = (0, 7 * S(ph - 0.12 * i), 0)
    return p
def run(ph):
    p = legs(ph, 36); p['hips'] = ((0, 8 * S(ph), 0), (0, 0.01, 0))
    for i in range(1, 5): p['tail%d' % i] = (0, 10 * S(ph - 0.12 * i), 0)
    return p
def idle(ph): return {'head': (-3 * max(0, S(ph * 2)), 0, 0), 'tail3': (0, 3 * S(ph), 0), 'tail4': (0, 5 * S(ph - 0.1), 0)}
def eat(ph): return {'head': (6 + 4 * S(ph * 2), 0, 0)}
def sleep(ph): return {'tail2': (0, 12, 0), 'tail3': (0, 14, 0), 'tail4': (0, 10, 0)}
def swim(ph):
    p = {'fl': (40, 0, 0), 'fr': (40, 0, 0), 'hl': (50, 0, 0), 'hr': (50, 0, 0)}
    for i in range(1, 5): p['tail%d' % i] = (0, 16 * S(ph - 0.15 * i), 0)
    return p
SPEC = dict(id='crocodile', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.012, tris=6000, smooth=10, skin='scale',
            actions={'idle': (160, idle), 'walk': (40, walk), 'run': (20, run), 'eat': (60, eat), 'sleep': (140, sleep), 'swim': (40, swim)},
            meta=dict(height=0.6, length=4.0, speeds={'walk': 0.6, 'run': 3.0}, map={'climb': 'walk', 'sit': 'idle', 'perch': 'idle'}))
