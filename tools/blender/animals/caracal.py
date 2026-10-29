# קרקל (Caracal caracal) – traced from a side photo of a walking caracal (Wikimedia Commons, 29.10; tools/blender/refs/),
# modelled at a shoulder height of 0.86 model units and scaled by meta.scale to 0.45 m. What the photo shows: a strong,
# deep body (back to belly almost half the shoulder height), the rump higher than the shoulders (long hind legs), the
# belly line nearly straight and rising only at the groin, big thighs, a thick neck, a broad head with tall pointed
# ears that end in long black tufts, legs about a tenth of the shoulder height thick, a short tail. Plain reddish-tan,
# white chin and belly, black marks above the eyes, a dark line down each side of the nose, dark whisker spots, ears
# black on the back. Kit: cat legs (ANAT 'cat'), the trunk drawn from the photo (no body plan).
own('caracal')
ANAT['caracal'] = ('cat', dict(arm=0.16, sh=(0.13, 0.62, 0.22), fa0=0.1, fa1=0.075, wr=0.075, can=0.065, th=(0.14, 0.6, 0.22),
                               gas0=0.13, gas1=0.08, hock=0.08, mt=0.065, paw=(0.09, 0.05, 0.12)))   # thick strong legs, as in the photo
EYE['caracal'] = ('#c8a040', 'round', 0.84, 0.5)
# the body, from the photo: (z along the body, top of the back, bottom of the belly)
TRUNK = [(0.35, 0.82, 0.48), (0.25, 0.86, 0.465), (0.1, 0.885, 0.45), (-0.1, 0.92, 0.45), (-0.3, 0.945, 0.47), (-0.5, 0.96, 0.53),
         (-0.65, 0.945, 0.57), (-0.78, 0.87, 0.62)]   # deep: the belly is lower than the elbow (photo, 29.10 second look)
TAIL = [(0, 0.84, -0.8), (0, 0.66, -0.87), (0, 0.5, -0.92), (0, 0.36, -0.94)]   # short, thin, hanging
blobs = trunk_from_profile(TRUNK, lambda z: 0.16 if z > 0.0 else 0.15)   # one smooth body along the traced profile
blobs += [
    dict(t='cap', a=(0, 0.72, 0.3), b2=(0, 0.74, 0.5), r=(0.14, 0.105), bone='neck'),          # a thick neck
    dict(t='ell', c=(0, 0.75, 0.58), r=(0.1, 0.098, 0.105), bone='head'),                       # a broad skull
    dict(t='ell', c=(0, 0.712, 0.605), r=(0.095, 0.064, 0.058), bone='head'),                    # the cheeks
    dict(t='ell', c=(0, 0.71, 0.68), r=(0.06, 0.054, 0.052), bone='head'),                      # the muzzle
    dict(t='ell', c=(0, 0.67, 0.652), r=(0.055, 0.035, 0.058), bone='head'),                    # the jaw
    dict(t='cap', a=(0, 0.81, 0.6), b2=(0, 0.75, 0.71), r=(0.038, 0.026), bone='head'),
    dict(t='cap', a=TAIL[0], b2=TAIL[1], r=(0.038, 0.034), bone='tail1'),
    dict(t='cap', a=TAIL[1], b2=TAIL[2], r=(0.034, 0.031), bone='tail2'),
    dict(t='cap', a=TAIL[2], b2=TAIL[3], r=(0.031, 0.028), bone='tail3'),
]
bones = [('hips', None, (0, 0.82, -0.82), (0, 0.84, 0.0)), ('chest', 'hips', (0, 0.84, 0.0), (0, 0.82, 0.3)),
         ('neck', 'chest', (0, 0.78, 0.3), (0, 0.76, 0.5)), ('head', 'neck', (0, 0.76, 0.5), (0, 0.71, 0.72))] + chain('tail', TAIL, 'hips')
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', (sx * 0.11, 0.73, 0.25), (sx * 0.11, 0.4, 0.28)), ('f' + L + '2', 'f' + L, (sx * 0.11, 0.4, 0.28), (sx * 0.11, 0.0, 0.31)),
              ('h' + L, 'hips', (sx * 0.11, 0.82, -0.62), (sx * 0.115, 0.46, -0.5)), ('h' + L + '2', 'h' + L, (sx * 0.115, 0.46, -0.5), (sx * 0.115, 0.0, -0.66))]
    blobs += [dict(t='ell', c=(sx * 0.11, 0.04, 0.34), r=(0.058, 0.04, 0.075), bone='f' + L + '2', foot=True),
              dict(t='ell', c=(sx * 0.115, 0.038, -0.63), r=(0.054, 0.038, 0.07), bone='h' + L + '2', foot=True)]
cat_muscles(blobs, bones, sh=(0.085, 0.18, 0.12), th=(0.1, 0.18, 0.15))
HC, HS, HO = Vector((0, 0.74, 0.6)), 1.36, Vector((0, -0.05, 0.02))   # the photo's head is bigger than the first model's and held lower:
def _h(p): return tuple(HC + (Vector(p) - HC) * HS + HO)                    # grow it round its centre, then lower it
for bl in blobs:
    if bl.get('bone') == 'head':
        for k in ('c', 'a', 'b2'):
            if k in bl: bl[k] = _h(bl[k])
        bl['r'] = tuple(x * HS for x in bl['r'])
E = blob_ears(blobs, bones, base=_h((0.055, 0.83, 0.56)), d=(0.3, 1, -0.15), H=0.2, w=0.085, t=0.014, tip=0.9, turn=30)
tufts = []
for L, (bp, dd, side, fwd) in E['sides'].items():
    tip = bp + dd * (E['H'] * 0.95)
    tuft = Part('tuft', bone='ear' + L, color=srgb('#141010'))
    tuft.add(*tube([tuple(tip), tuple(tip + dd * 0.03 + Vector((0, 0.006, 0))), tuple(tip + dd * 0.055 + Vector((0, 0.008, -0.008)))], [0.009, 0.005, 0.0015], 6))
    tufts.append(tuft)

RED, RED2, WHITE, BLACK, CREAM = srgb('#c88c55'), srgb('#b47a46'), srgb('#f3ece0'), srgb('#1a1410'), srgb('#e8d2b2')
def _seg(P, a, b):
    a = Vector(a); b = Vector(b); ab = b - a; t = max(0.0, min(1.0, (P - a).dot(ab) / ab.length_squared)); return (P - (a + ab * t)).length
def paint(P, N, tag):
    P0 = P
    if P.z > 0.48: P = HC + (Vector(P) - HO - HC) / HS     # the face is painted on the first, smaller head
    x, y, z = P
    n = noise.noise(Vector((x * 22, y * 22, z * 22)))
    c = mix(RED, RED2, 0.3 + 0.3 * n)
    e = ear_paint(P0, N, E)
    if e:
        along, across, inside = e
        return mix(mix(BLACK, RED2, smooth(0.35, 0.0, along) * 0.6), mix(CREAM, WHITE, 0.4), inside * 0.8)
    belly = (smooth(0.58, 0.5, y) * smooth(-0.15, -0.6, N.y) if -0.7 < z < 0.38 else 0)
    belly = max(belly, smooth(0.72, 0.66, y) * smooth(0.32, 0.44, z) * smooth(0.6, 0.52, z) * smooth(-0.1, -0.5, N.y))
    c = mix(c, WHITE, belly * 0.85)
    if z > 0.5:   # the face: white muzzle and chin, dark nose lines, soft dark whisker spots, a dark mark above each eye
        c = mix(c, WHITE, smooth(0.665, 0.69, z) * smooth(0.73, 0.71, y) * 0.75)
        c = mix(c, WHITE, smooth(0.0, 0.5, -N.y) * smooth(0.6, 0.63, z) * 0.6)
        for sx in (1, -1):
            dl = _seg(Vector((P.x, P.y, 0)), (sx * 0.026, 0.765, 0), (sx * 0.022, 0.725, 0))
            c = mix(c, BLACK, smooth(0.007, 0.0035, dl) * smooth(0.63, 0.66, z) * smooth(0.1, 0.4, N.z) * 0.85)
            dw = Vector((P.x - sx * 0.028, (P.y - 0.695) * 1.4, 0)).length
            c = mix(c, BLACK, smooth(0.014, 0.007, dw) * smooth(0.66, 0.69, z) * 0.7)
            db = Vector((P.x - sx * 0.036, (P.y - 0.792) * 2.0, 0)).length
            c = mix(c, BLACK, smooth(0.013, 0.006, db) * smooth(0.6, 0.63, z) * 0.6)
    if z < -0.85: c = mix(c, RED2, 0.5)
    return c

parts = list(tufts)
for sx in (1, -1):
    parts += eye_parts((sx * 0.046, 0.77, 0.66), 0.015, 'head', '#c8a040', (sx, 0.2, 0.75))
    parts.append(whiskers((sx * 0.032, 0.69, 0.72), sx, 'head', 5, 0.1, srgb('#f0ece4')))
nose = Part('nose', bone='head', mat=1, color=srgb('#7a4a3a')); nose.add(*ellipsoid((0, 0.73, 0.73), (0.016, 0.011, 0.01), 8, 5)); parts.append(nose)
for p in parts:
    if p.bone == 'head': p.v = [_h(v) for v in p.v]

names = [b[0] for b in bones]
acts = quad_actions(names, dict(amp=26, knee=36, run_amp=44, bob=0.015, drop=0.3, head_eat=30, neck_eat=35, look=25, tailsw=10, earflick=22,
                                run_bound=True, frames=dict(walk=34, run=14, idle=150, eat=60, sleep=120, swim=40)))
_w = acts['walk'][1]
def walk(ph):
    p = _w(ph); p['chest'] = (0, -3 * math.sin(TAU * ph), -3 * math.sin(TAU * ph)); p['neck'] = (4, 3 * math.sin(TAU * ph), 0)
    return p
acts['walk'] = (34, walk)
SPEC = dict(id='caracal', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.008, tris=5600, smooth=12, actions=acts,
            meta=dict(height=1.1, length=2.0, scale=0.52, speeds={'walk': 1.3, 'run': 8.0}, map={'sit': 'idle'}))
