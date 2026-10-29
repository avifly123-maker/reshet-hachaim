# פסמון (Psammomys obesus) – traced from a side photo of a fat sand rat in Israel (Wikimedia Commons, "Psammomys
# obesus. Israel 02", 29.10; tools/blender/refs/psammomys.png). What the photo shows (the first model was a long
# sausage): a round, plump body a little longer than twice its height, the belly close to the ground; a big blunt head
# with full cheeks, a short muzzle, big dark eyes and small round ears close to the head; short legs; a short tail
# with a dark tuft. Sandy orange-brown, a darker back with fine dark hairs, pale cream belly and chin, warm orange
# cheeks and legs. The mouse's motion (spinymouse.py), modelled on its own.
own('psammomys')
EYE['psammomys'] = ('#0a0706', 'round', 0.9, 0.7)
TRUNK = [(0.05, 0.088, 0.03), (0.03, 0.097, 0.024), (0.0, 0.1, 0.022), (-0.03, 0.098, 0.022), (-0.055, 0.088, 0.025), (-0.075, 0.07, 0.03),
         (-0.088, 0.05, 0.036)]
TAILP = [(0, 0.04, -0.088), (0, 0.032, -0.11), (0, 0.022, -0.135), (0, 0.016, -0.16), (0, 0.014, -0.18)]
blobs = trunk_from_profile(TRUNK, lambda z: 0.052, n=16)
blobs += [
    dict(t='ell', c=(0, 0.066, 0.068), r=(0.038, 0.035, 0.04), bone='head'),                    # a big round skull
    dict(t='ell', c=(0, 0.052, 0.078), r=(0.037, 0.024, 0.032), bone='head'),                   # full cheeks
    dict(t='cap', a=(0, 0.06, 0.09), b2=(0, 0.05, 0.113), r=(0.024, 0.013), bone='head'),         # a short blunt muzzle
    dict(t='ell', c=(0, 0.034, -0.05), r=(0.022, 0.026, 0.032), bone='hl'), dict(t='ell', c=(0, 0.034, -0.05), r=(0.022, 0.026, 0.032), bone='hr'),
]
blobs[-2]['c'] = (0.034, 0.034, -0.05); blobs[-1]['c'] = (-0.034, 0.034, -0.05)     # the haunches
for sx, L in ((1, 'l'), (-1, 'r')):
    blobs += [dict(t='cap', a=(sx * 0.024, 0.03, 0.04), b2=(sx * 0.026, 0.004, 0.05), r=(0.01, 0.007), bone='f' + L),
              dict(t='cap', a=(sx * 0.036, 0.016, -0.06), b2=(sx * 0.038, 0.004, -0.03), r=(0.01, 0.007), bone='h' + L)]
bones = [
    ('hips', None, (0, 0.05, -0.09), (0, 0.06, 0.0)),
    ('chest', 'hips', (0, 0.06, 0.0), (0, 0.065, 0.045)),
    ('head', 'chest', (0, 0.068, 0.045), (0, 0.05, 0.115)),
    ('fl', 'chest', (0.024, 0.04, 0.04), (0.026, 0.0, 0.05)),
    ('fr', 'chest', (-0.024, 0.04, 0.04), (-0.026, 0.0, 0.05)),
    ('hl', 'hips', (0.034, 0.05, -0.055), (0.038, 0.0, -0.035)),
    ('hr', 'hips', (-0.034, 0.05, -0.055), (-0.038, 0.0, -0.035)),
] + chain('tail', TAILP, 'hips')

BACK, BACK2, DARKB, BELLY, ORANGE, PINK = srgb('#c8995e'), srgb('#a87a46'), srgb('#6e5236'), srgb('#efe2c4'), srgb('#d89a54'), srgb('#d8a898')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 120, y * 120, z * 120))); n2 = noise.noise(Vector((x * 400, y * 400, z * 400)))
    c = mix(BACK, BACK2, 0.35 + 0.35 * n)
    c = mix(c, DARKB, smooth(0.07, 0.1, y) * (0.25 + 0.25 * n2))                                   # fine dark hairs on the back
    c = mix(c, BELLY, smooth(0.04, 0.025, y) * smooth(-0.1, -0.5, N.y) * 0.9)                      # pale belly
    if z > 0.06:
        c = mix(c, ORANGE, smooth(0.07, 0.055, y) * smooth(0.5, 0.9, abs(N.x)) * 0.5)              # warm cheeks
        c = mix(c, BELLY, smooth(0.05, 0.04, y) * smooth(0.0, -0.4, N.y) * 0.8)                    # pale chin
    if y < 0.02 and abs(x) > 0.015: c = mix(c, ORANGE, 0.4)                                        # warm legs
    if z < -0.15: c = mix(c, DARKB, 0.8)                                                          # the dark tuft
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.029, 0.072, 0.088), 0.0078, 'head', '#050404', (sx, 0.25, 0.6))
    ear = Part('ear', bone='head', color=srgb('#b08a60'))
    ear.add(*ellipsoid((sx * 0.026, 0.094, 0.05), (0.004, 0.011, 0.01), 10, 6, rot=(0, sx * 30, sx * -15))); parts.append(ear)
    parts.append(whiskers((sx * 0.012, 0.05, 0.11), sx, 'head', 5, 0.035, srgb('#2a2420')))
nose = Part('nose', bone='head', mat=1, color=srgb('#b07a70')); nose.add(*ellipsoid((0, 0.051, 0.115), (0.006, 0.005, 0.004), 8, 5)); parts.append(nose)
parts.append(tail_part('tail', 4, TAILP, 0.007, 0.004, 6, 14, colfn=lambda t: mix(srgb('#a87a46'), srgb('#4a3424'), smooth(0.6, 0.9, t))))

def S(x): return math.sin(TAU * x)
def walk(ph):     # a quick scurry
    p = gait(ph, {'fl': 0, 'fr': 0.1, 'hl': 0.5, 'hr': 0.6}, amp=30)
    p['hips'] = ((4 * S(ph), 0, 0), (0, 0.003 * abs(S(ph)), 0))
    p['chest'] = (-5 * S(ph), 0, 0)
    p['head'] = (3 * S(ph), 0, 0)
    for i in range(1, 5): p['tail%d' % i] = (-2 + 3 * S(ph - i * 0.08), 5 * S(ph * 0.5 - i * 0.1), 0)
    return p
def idle(ph):
    sn = S(ph * 10) * smooth(0.1, 0.2, ph) * smooth(0.5, 0.4, ph)
    look = S(ph) * smooth(0.45, 0.6, ph)
    p = {'hips': ((0, 0, 0), (0, 0.0012 * S(ph * 6), 0)), 'head': (-4 + 3 * sn, 28 * look, 0), 'chest': (0, 8 * look, 0)}
    for i in range(1, 5): p['tail%d' % i] = (-2, 4 * S(ph * 2 - i * 0.12), 0)
    return p
def eat(ph):      # sits up and nibbles a saltbush leaf
    ch = S(ph * 6)
    p = {'hips': ((-24, 0, 0), (0, 0.0, -0.004)), 'chest': (-26, 0, 0), 'head': (30 + 4 * ch, 0, 0),
         'fl': (-65, 0, -12), 'fr': (-65, 0, 12), 'hl': (22, 0, 0), 'hr': (22, 0, 0)}
    for i in range(1, 5): p['tail%d' % i] = (6, 3 * S(ph - i * 0.1), 0)
    return p
def sleep(ph):
    b = S(ph)
    p = {'hips': ((0, 0, 0), (0, -0.016 + 0.001 * b, 0)), 'chest': (16, 0, 0), 'head': (38, -25, 0),
         'fl': (-40, 0, 0), 'fr': (-40, 0, 0), 'hl': (40, 0, 0), 'hr': (40, 0, 0)}
    for i in range(1, 5): p['tail%d' % i] = (8, 30, 0)
    return p

SPEC = dict(id='psammomys', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.0028, tris=1900, smooth=14,
            actions={'idle': (120, idle), 'walk': (14, walk), 'eat': (60, eat), 'sleep': (90, sleep)},
            meta=dict(height=0.14, length=0.3, scale=1.15, speeds={'walk': 0.5, 'run': 1.4}, map={'run': 'walk', 'swim': 'walk', 'sit': 'eat'}))
