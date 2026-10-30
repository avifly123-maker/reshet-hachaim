# ברדלס (Acinonyx jubatus) – savanna pilot of kit v6 (docs/PLAN-1.4.md 11.1). The shape is traced from a side photo
# of a walking cheetah (Wikimedia Commons, 29.10; tools/blender/refs/): the top and bottom line of the body at ten
# places along it, the neck, the head and the tail, measured in units of the shoulder height (0.86 m to the top of the
# withers) and turned into ellipsoids. What the photo shows, and the first models missed (Avi, 29.10: "built from
# parts that do not fit"): a deep body, about 0.4 m from back to belly along its whole length, the belly lowest in the
# middle and rising only at the groin; a thick neck carried forward and down; a head a third of the shoulder height
# long, held below the line of the back; legs about a tenth of the shoulder height thick at the forearm; a long thick
# tail that hangs low and curls up at the tip. Cat legs from the kit (ANAT 'cat'), the trunk drawn from the photo
# (no body plan). Golden coat with round solid black spots, white belly, the black tear lines, a ringed tail with a
# white tip.
own('cheetah')
ANAT['cheetah'] = ('cat', dict(arm=0.12, sh=(0.11, 0.62, 0.2), fa0=0.066, fa1=0.05, wr=0.055, can=0.046, th=(0.12, 0.6, 0.2),
                               gas0=0.1, gas1=0.058, hock=0.058, mt=0.048, paw=(0.07, 0.04, 0.095)))   # the shoulder and the thigh as big muscles that show below the body line
EYE['cheetah'] = ('#c49a3a', 'round', 0.84, 0.46)
# the body, from the photo: (z along the body, top of the back, bottom of the belly), metres
TRUNK = [(0.31, 0.85, 0.47), (0.19, 0.853, 0.455), (0.0, 0.845, 0.436), (-0.18, 0.853, 0.41), (-0.3, 0.86, 0.424), (-0.395, 0.853, 0.46),
         (-0.487, 0.853, 0.534), (-0.58, 0.84, 0.596), (-0.66, 0.8, 0.626), (-0.73, 0.755, 0.645)]   # deepest behind the ribs, a real tuck at the groin
TAIL = [(0, 0.74, -0.72), (0, 0.58, -0.88), (0, 0.48, -1.06), (0, 0.47, -1.22), (0, 0.56, -1.33)]
blobs = trunk_from_profile(TRUNK, lambda z: 0.15 if z > 0.1 else (0.135 if z > -0.45 else 0.125))   # one smooth body along the traced profile
blobs += [
    dict(t='ell', c=(0.06, 0.815, 0.22), r=(0.05, 0.035, 0.1), rot=(-15, 0, 0), bone='chest'),    # shoulder blades under the skin
    dict(t='ell', c=(-0.06, 0.815, 0.22), r=(0.05, 0.035, 0.1), rot=(-15, 0, 0), bone='chest'),
    # a thick neck, carried forward and a little down
    dict(t='cap', a=(0, 0.72, 0.28), b2=(0, 0.73, 0.5), r=(0.13, 0.095), bone='neck'),
    # the head: the skull, the cheeks, a short muzzle, the jaw, the bridge of the nose
    dict(t='ell', c=(0, 0.735, 0.575), r=(0.088, 0.09, 0.1), bone='head'),
    dict(t='ell', c=(0, 0.7, 0.6), r=(0.085, 0.06, 0.055), bone='head'),
    dict(t='ell', c=(0, 0.698, 0.672), r=(0.056, 0.05, 0.05), bone='head'),
    dict(t='ell', c=(0, 0.66, 0.645), r=(0.052, 0.033, 0.056), bone='head'),
    dict(t='cap', a=(0, 0.79, 0.59), b2=(0, 0.735, 0.7), r=(0.036, 0.024), bone='head'),
    # the long tail, thick along all its length
    dict(t='cap', a=TAIL[0], b2=TAIL[1], r=(0.042, 0.038), bone='tail1'),
    dict(t='cap', a=TAIL[1], b2=TAIL[2], r=(0.038, 0.036), bone='tail2'),
    dict(t='cap', a=TAIL[2], b2=TAIL[3], r=(0.036, 0.035), bone='tail3'),
    dict(t='cap', a=TAIL[3], b2=TAIL[4], r=(0.035, 0.033), bone='tail4'),
]
bones = [('hips', None, (0, 0.76, -0.72), (0, 0.78, 0.0)), ('chest', 'hips', (0, 0.78, 0.0), (0, 0.8, 0.3)),
         ('neck', 'chest', (0, 0.78, 0.28), (0, 0.75, 0.5)), ('head', 'neck', (0, 0.75, 0.5), (0, 0.7, 0.72))] + chain('tail', TAIL, 'hips')
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', (sx * 0.1, 0.72, 0.25), (sx * 0.1, 0.4, 0.28)), ('f' + L + '2', 'f' + L, (sx * 0.1, 0.4, 0.28), (sx * 0.1, 0.0, 0.31)),
              ('h' + L, 'hips', (sx * 0.1, 0.74, -0.58), (sx * 0.105, 0.42, -0.48)), ('h' + L + '2', 'h' + L, (sx * 0.105, 0.42, -0.48), (sx * 0.105, 0.0, -0.62))]
    blobs += [dict(t='ell', c=(sx * 0.1, 0.035, 0.34), r=(0.05, 0.035, 0.065), bone='f' + L + '2', foot=True),
              dict(t='ell', c=(sx * 0.105, 0.033, -0.59), r=(0.046, 0.033, 0.062), bone='h' + L + '2', foot=True)]
cat_muscles(blobs, bones, sh=(0.068, 0.16, 0.095), th=(0.085, 0.16, 0.12))
E = blob_ears(blobs, bones, base=(0.05, 0.805, 0.555), d=(0.6, 1, -0.3), H=0.07, w=0.048, t=0.012, tip=0.3, turn=30)

GOLD, GOLD2, WHITE, BLACK, CREAM = srgb('#dcae62'), srgb('#c8984c'), srgb('#f4ede0'), srgb('#161210'), srgb('#ecd8b4')
def _seg(P, a, b):
    a = Vector(a); b = Vector(b); ab = b - a; t = max(0.0, min(1.0, (P - a).dot(ab) / ab.length_squared)); return (P - (a + ab * t)).length
def paint(P, N, tag):
    e = ear_paint(P, N, E)
    x, y, z = P
    n = noise.noise(Vector((x * 22, y * 22, z * 22)))
    c = mix(GOLD, GOLD2, 0.3 + 0.3 * n)
    if e: return mix(mix(GOLD2, BLACK, 0.55 * smooth(0.2, 0.7, e[0])), CREAM, e[2] * 0.35)
    head = z > 0.5
    # the white underside: belly and chest, the throat
    belly = (smooth(0.56, 0.47, y) * smooth(-0.15, -0.6, N.y) if -0.6 < z < 0.35 else 0)
    belly = max(belly, smooth(0.7, 0.64, y) * smooth(0.3, 0.42, z) * smooth(0.6, 0.5, z) * smooth(-0.1, -0.5, N.y))
    c = mix(c, WHITE, belly * 0.85)
    # round solid spots, smaller on the head and the lower legs, none on the white underside
    sc = 31 + 16 * smooth(0.48, 0.58, z) + 10 * smooth(0.4, 0.25, y)   # dense, like the photo
    d1, d2, rid = worley2(Vector((x, y * 1.05, z)), sc, 31)
    # 3D seeds cut by the skin: a radius of about half a cell covers a third of the coat, as in the photo; two seeds
    # close together give two spots with a gap, never one smeared blot
    spot = smooth(0.47, 0.4, d1) * smooth(0.05, 0.13, d2 - d1) * (rid > 0.04) * (1 - belly * 0.85)
    if head: spot *= smooth(0.01, 0.028, abs(x)) * smooth(0.69, 0.65, z)
    c = mix(c, BLACK, spot * 0.92)
    if head:   # a white muzzle and chin, then the black tear lines from the inner eye to the corner of the mouth
        c = mix(c, WHITE, smooth(0.655, 0.68, z) * smooth(0.72, 0.7, y) * 0.75)
        c = mix(c, WHITE, smooth(0.0, 0.5, -N.y) * smooth(0.6, 0.63, z) * 0.6)
        for sx in (1, -1):   # seen from the front (x, y), on the face's front half, so the line follows the skin
            dl = _seg(Vector((P.x, P.y, 0)), (sx * 0.027, 0.738, 0), (sx * 0.034, 0.668, 0))
            c = mix(c, BLACK, smooth(0.0085, 0.0045, dl) * smooth(0.62, 0.645, z) * smooth(0.1, 0.4, N.z) * 0.95)
    if z < -1.0:   # the tail's end: dark rings, a white tip
        ring = math.sin((z + 1.0) * 55)
        c = mix(c, BLACK, smooth(0.45, 0.8, ring) * 0.85)
        if z < -1.24 and y > 0.52: c = mix(c, WHITE, 0.85)
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.042, 0.752, 0.652), 0.0135, 'head', '#c49a3a', (sx, 0.2, 0.75))
    parts.append(whiskers((sx * 0.03, 0.685, 0.71), sx, 'head', 5, 0.1, srgb('#f0ece4')))
nose = Part('nose', bone='head', mat=1, color=srgb('#2a1c16')); nose.add(*ellipsoid((0, 0.712, 0.718), (0.014, 0.01, 0.009), 8, 5)); parts.append(nose)

names = [b[0] for b in bones]
acts = quad_actions(names, dict(amp=26, knee=36, run_amp=46, bob=0.015, drop=0.3, head_eat=30, neck_eat=35, look=25, tailsw=12, earflick=18,
                                run_bound=True, frames=dict(walk=34, run=12, idle=150, eat=60, sleep=120, swim=40)))
_w = acts['walk'][1]
def walk(ph):     # a cat's walk: the head low and level, the shoulder blades rolling, the tail swinging after
    p = _w(ph); p['chest'] = (0, -3 * math.sin(TAU * ph), -3 * math.sin(TAU * ph)); p['neck'] = (4, 3 * math.sin(TAU * ph), 0)
    for i in range(1, 5): p['tail%d' % i] = (-4 + 4 * i, 8 * math.sin(TAU * (ph - 0.12 * i)), 0)
    return p
acts['walk'] = (34, walk)
SPEC = dict(id='cheetah', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.008, tris=5600, smooth=12, actions=acts,
            meta=dict(height=1.0, length=2.2, speeds={'walk': 1.3, 'run': 14.0}, map={'sit': 'idle'}))
