# ברדלס (Acinonyx jubatus) – savanna pilot of kit v6 (docs/PLAN-1.4.md 11.1). Modelled on its own from real measures
# (metres): 0.78 at the shoulder, about 1.2 from nose to the base of the tail, a tail of 0.7. The runner among the
# cats, built by the kit's cat rules: the felid body plan (BODY['felid']: a deep chest, the waist tucked up high, a
# rounded rump; the trunk is one smooth row of ellipsoids, never a box), the anatomical cat legs (ANAT 'cat': shoulder
# and haunch masses, elbow, wrist, hock, round paws), made long and lean; a small round head on a slender neck, small
# round ears, a long tail. Golden coat with round solid black spots (not rosettes), white belly, the black "tear lines"
# from the inner corner of each eye to the mouth, dark rings and a white tip on the tail.
own('cheetah')
BODY_OF['cheetah'] = 'felid'
ANAT['cheetah'] = ('cat', dict(sh=(0.11, 0.48, 0.15), fa0=0.088, fa1=0.058, wr=0.064, can=0.05, th=(0.13, 0.6, 0.22), gas0=0.085, gas1=0.05,
                               hock=0.058, mt=0.048, paw=(0.085, 0.05, 0.12)))
EYE['cheetah'] = ('#c49a3a', 'round', 0.84, 0.46)
TAIL = [(0, 0.73, -0.57), (0, 0.6, -0.72), (0, 0.47, -0.88), (0, 0.38, -1.04), (0, 0.35, -1.22)]
blobs = [
    # the trunk: rump and chest; the felid body plan turns them into one smooth body with the waist tucked up
    dict(t='ell', c=(0, 0.74, -0.34), r=(0.125, 0.165, 0.24), bone='hips'),
    dict(t='ell', c=(0, 0.71, 0.14), r=(0.14, 0.23, 0.25), bone='chest'),
    dict(t='ell', c=(0.06, 0.86, 0.22), r=(0.055, 0.04, 0.11), rot=(-15, 0, 0), bone='chest', keep=True),    # shoulder blades
    dict(t='ell', c=(-0.06, 0.86, 0.22), r=(0.055, 0.04, 0.11), rot=(-15, 0, 0), bone='chest', keep=True),
    # a slender neck rising to a small round head
    dict(t='cap', a=(0, 0.8, 0.3), b2=(0, 0.87, 0.5), r=(0.095, 0.07), bone='neck'),
    dict(t='ell', c=(0, 0.885, 0.585), r=(0.078, 0.074, 0.08), bone='head'),
    dict(t='ell', c=(0, 0.858, 0.648), r=(0.05, 0.044, 0.046), bone='head'),               # the short muzzle
    dict(t='ell', c=(0, 0.83, 0.62), r=(0.047, 0.03, 0.05), bone='head'),                  # the jaw
    dict(t='ell', c=(0, 0.858, 0.6), r=(0.075, 0.05, 0.05), bone='head'),                  # the cheeks
    dict(t='cap', a=(0, 0.925, 0.6), b2=(0, 0.885, 0.672), r=(0.032, 0.022), bone='head'),  # the bridge of the nose
    # the long tail
    dict(t='cap', a=TAIL[0], b2=TAIL[1], r=(0.038, 0.032), bone='tail1'),
    dict(t='cap', a=TAIL[1], b2=TAIL[2], r=(0.032, 0.028), bone='tail2'),
    dict(t='cap', a=TAIL[2], b2=TAIL[3], r=(0.028, 0.025), bone='tail3'),
    dict(t='cap', a=TAIL[3], b2=TAIL[4], r=(0.025, 0.024), bone='tail4'),
]
bones = [('hips', None, (0, 0.74, -0.57), (0, 0.76, 0.0)), ('chest', 'hips', (0, 0.76, 0.0), (0, 0.79, 0.34)),
         ('neck', 'chest', (0, 0.8, 0.32), (0, 0.87, 0.5)), ('head', 'neck', (0, 0.88, 0.5), (0, 0.85, 0.7))] + chain('tail', TAIL, 'hips')
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', (sx * 0.085, 0.74, 0.27), (sx * 0.09, 0.4, 0.3)), ('f' + L + '2', 'f' + L, (sx * 0.09, 0.4, 0.3), (sx * 0.09, 0.0, 0.34)),
              ('h' + L, 'hips', (sx * 0.095, 0.73, -0.4), (sx * 0.1, 0.44, -0.29)), ('h' + L + '2', 'h' + L, (sx * 0.1, 0.44, -0.29), (sx * 0.1, 0.0, -0.42))]
    blobs += [dict(t='ell', c=(sx * 0.09, 0.035, 0.37), r=(0.05, 0.035, 0.065), bone='f' + L + '2', foot=True),
              dict(t='ell', c=(sx * 0.1, 0.033, -0.39), r=(0.045, 0.033, 0.06), bone='h' + L + '2', foot=True)]
E = blob_ears(blobs, bones, base=(0.045, 0.94, 0.56), d=(0.6, 1, -0.25), H=0.045, w=0.036, t=0.01, tip=0.3)

GOLD, GOLD2, WHITE, BLACK, CREAM = srgb('#dcae62'), srgb('#c8984c'), srgb('#f4ede0'), srgb('#161210'), srgb('#ecd8b4')
def _seg(P, a, b):
    a = Vector(a); b = Vector(b); ab = b - a; t = max(0.0, min(1.0, (P - a).dot(ab) / ab.length_squared)); return (P - (a + ab * t)).length
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 22, y * 22, z * 22)))
    c = mix(GOLD, GOLD2, 0.3 + 0.3 * n)
    e = ear_paint(P, N, E)
    if e: return mix(mix(GOLD2, BLACK, 0.55 * smooth(0.2, 0.7, e[0])), CREAM, e[2] * 0.35)
    head = z > 0.5
    # the white underside: throat, chest, belly
    belly = (smooth(0.66, 0.56, y) * smooth(-0.15, -0.6, N.y) if -0.5 < z < 0.4 else 0)
    belly = max(belly, smooth(0.86, 0.8, y) * smooth(0.36, 0.46, z) * smooth(0.56, 0.48, z) * smooth(-0.1, -0.5, N.y))   # the throat, underneath only
    c = mix(c, WHITE, belly * 0.85)
    # round solid spots, smaller on the head and the lower legs, none on the white belly
    sc = 21 + 18 * smooth(0.48, 0.58, z) + 10 * smooth(0.4, 0.25, y)
    d1, d2, rid = worley2(Vector((x, y * 1.05, z)), sc, 31)
    spot = smooth(0.4, 0.3, d1) * (rid > 0.05) * (1 - belly)
    if head: spot *= smooth(0.01, 0.028, abs(x)) * smooth(0.68, 0.64, z)
    c = mix(c, BLACK, spot * 0.92)
    if head:   # a white muzzle and chin, a pale line above each eye, then the black tear lines over it
        c = mix(c, WHITE, smooth(0.64, 0.665, z) * smooth(0.87, 0.85, y) * 0.75)
        c = mix(c, WHITE, smooth(0.0, 0.5, -N.y) * smooth(0.6, 0.63, z) * 0.6)
        for sx in (1, -1):
            # drawn as seen from the front (x, y only), on the face's front half: the line follows the skin wherever it is
            dl = _seg(Vector((P.x, P.y, 0)), (sx * 0.024, 0.89, 0), (sx * 0.031, 0.828, 0))
            c = mix(c, BLACK, smooth(0.0075, 0.004, dl) * smooth(0.62, 0.645, z) * smooth(0.1, 0.4, N.z) * 0.95)
            de = _seg(P, (sx * 0.03, 0.912, 0.652), (sx * 0.05, 0.912, 0.638))
            c = mix(c, CREAM, smooth(0.006, 0.003, de) * 0.6)
    if z < -0.98:   # the tail's last third: dark rings, a white tip
        ring = math.sin((z + 0.98) * 60)
        c = mix(c, BLACK, smooth(0.45, 0.8, ring) * 0.85)
        if z < -1.17: c = mix(c, WHITE, 0.85)
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.037, 0.9, 0.652), 0.0125, 'head', '#c49a3a', (sx, 0.2, 0.75))
    parts.append(whiskers((sx * 0.028, 0.836, 0.688), sx, 'head', 5, 0.09, srgb('#f0ece4')))
nose = Part('nose', bone='head', mat=1, color=srgb('#2a1c16')); nose.add(*ellipsoid((0, 0.866, 0.694), (0.013, 0.009, 0.008), 8, 5)); parts.append(nose)

names = [b[0] for b in bones]
acts = quad_actions(names, dict(amp=30, knee=52, run_amp=48, bob=0.02, drop=0.4, head_eat=35, neck_eat=40, look=30, tailsw=14, earflick=18,
                                run_bound=True, frames=dict(walk=34, run=12, idle=150, eat=60, sleep=120, swim=40)))
_w = acts['walk'][1]
def walk(ph):     # a cat's walk: the head low and level, the shoulder blades rolling, the tail swinging after
    p = _w(ph); p['chest'] = (0, -4 * math.sin(TAU * ph), -4 * math.sin(TAU * ph)); p['neck'] = (6, 3 * math.sin(TAU * ph), 0)
    for i in range(1, 5): p['tail%d' % i] = (-6 + 5 * i, 10 * math.sin(TAU * (ph - 0.12 * i)), 0)
    return p
acts['walk'] = (34, walk)
SPEC = dict(id='cheetah', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.008, tris=5600, smooth=12, actions=acts,
            meta=dict(height=1.0, length=2.0, speeds={'walk': 1.3, 'run': 14.0}, map={'sit': 'idle'}))
