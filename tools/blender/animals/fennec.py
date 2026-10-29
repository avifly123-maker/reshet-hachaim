# שועל הפנק (Vulpes zerda) – traced from a side photo of a standing fennec (Wikimedia Commons, "Fennec Fox Vulpes
# zerda", 29.10; tools/blender/refs/fennec.png), modelled at a withers height of 0.5 (the fox's frame) and scaled by
# meta.scale to about 20 cm. What the photo shows (Avi, 29.10: "built from parts" before): a small, round, fluffy body
# as long as it is tall at the withers, a softly arched back, a deep chest; a big round head with huge broad ears
# (a third of the height); short furry white legs; a thick bushy tail that hangs low, with a black tip. Cream and
# sandy coat, white face, belly and legs, a brown streak under each eye, dark eyes.
own('fennec')
ANAT['fennec'] = ('canid', dict(fa0=0.09, fa1=0.07, wr=0.07, can=0.06, mt=0.058, gas0=0.1, gas1=0.07, hock=0.06, paw=(0.075, 0.045, 0.1)))
EYE['fennec'] = ('#6a4422', 'round', 0.84, 0.48)   # big dark eyes, not the red fox's amber slit
TRUNK = [(0.24, 0.5, 0.27), (0.17, 0.515, 0.26), (0.087, 0.53, 0.25), (0.0, 0.535, 0.245), (-0.1, 0.53, 0.25), (-0.175, 0.51, 0.27),
         (-0.24, 0.475, 0.3), (-0.29, 0.43, 0.34)]
TAIL = [(0, 0.42, -0.3), (0, 0.33, -0.38), (0, 0.24, -0.44), (0, 0.16, -0.48), (0, 0.1, -0.5)]
blobs = trunk_from_profile(TRUNK, lambda z: 0.105 if z > -0.15 else 0.1)   # one round, fluffy body
HC, HS = Vector((0, 0.57, 0.36)), 1.42     # a big round head
blobs += [
    dict(t='cap', a=(0, 0.45, 0.2), b2=(0, 0.54, 0.32), r=(0.085, 0.06), bone='neck'),                 # a short, thick ruff of a neck
    dict(t='ell', c=(0, 0.575, 0.35), r=(0.068, 0.062, 0.07), bone='head'),
    dict(t='ell', c=(0, 0.565, 0.345), r=(0.085, 0.05, 0.052), bone='head'),                          # wide fluffy cheeks
    dict(t='cap', a=(0, 0.555, 0.39), b2=(0, 0.535, 0.465), r=(0.034, 0.015), bone='head'),            # a short pointed muzzle
    dict(t='ell', c=(0, 0.528, 0.405), r=(0.028, 0.02, 0.045), bone='head'),                          # lower jaw
    # the bushy tail, thick all along, hanging low
    dict(t='cap', a=TAIL[0], b2=TAIL[1], r=(0.04, 0.05), bone='tail1'),
    dict(t='cap', a=TAIL[1], b2=TAIL[2], r=(0.05, 0.055), bone='tail2'),
    dict(t='cap', a=TAIL[2], b2=TAIL[3], r=(0.055, 0.05), bone='tail3'),
    dict(t='cap', a=TAIL[3], b2=TAIL[4], r=(0.05, 0.035), bone='tail4'),
]
def _h(p): return tuple(HC + (Vector(p) - HC) * HS)
for bl in blobs:
    if bl.get('bone') == 'head':
        for k in ('c', 'a', 'b2'):
            if k in bl: bl[k] = _h(bl[k])
        bl['r'] = tuple(x * HS for x in bl['r'])
bones = [('hips', None, (0, 0.42, -0.3), (0, 0.42, 0.0)), ('chest', 'hips', (0, 0.42, 0.0), (0, 0.45, 0.2)),
         ('neck', 'chest', (0, 0.46, 0.2), (0, 0.55, 0.32)), ('head', 'neck', (0, 0.56, 0.32), (0, 0.53, 0.48))] + chain('tail', TAIL, 'hips')
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', (sx * 0.06, 0.42, 0.16), (sx * 0.065, 0.2, 0.17)), ('f' + L + '2', 'f' + L, (sx * 0.065, 0.2, 0.17), (sx * 0.066, 0.0, 0.19)),
              ('h' + L, 'hips', (sx * 0.065, 0.42, -0.2), (sx * 0.07, 0.22, -0.16)), ('h' + L + '2', 'h' + L, (sx * 0.07, 0.22, -0.16), (sx * 0.07, 0.0, -0.22))]
    blobs += [dict(t='ell', c=(sx * 0.066, 0.02, 0.21), r=(0.03, 0.02, 0.042), bone='f' + L + '2', foot=True),
              dict(t='ell', c=(sx * 0.07, 0.02, -0.2), r=(0.03, 0.02, 0.042), bone='h' + L + '2', foot=True)]
cat_muscles(blobs, bones, sh=(0.04, 0.09, 0.055), th=(0.05, 0.1, 0.075))
E = blob_ears(blobs, bones, base=_h((0.035, 0.61, 0.33)), d=(0.6, 1, -0.1), H=0.2, w=0.072, t=0.012, tip=0.55, turn=35)

SAND, SAND2, CREAM, WHITE, DARK, PINK, STREAK = srgb('#ddb57c'), srgb('#c4955a'), srgb('#ecd8b4'), srgb('#f5eee2'), srgb('#2a1c14'), srgb('#e2aa98'), srgb('#9a7450')
def paint(P, N, tag):
    P0 = P
    e = ear_paint(P0, N, E)
    if e:
        along, across, inside = e
        n = noise.noise(Vector((P[0] * 90, P[1] * 90, P[2] * 90)))
        out = mix(SAND, SAND2, 0.35 + 0.25 * n)
        hair = 0.5 + 0.5 * math.sin(across * 26 + along * 9 + n * 3)        # white hairs along the inner edges
        ins = mix(PINK, CREAM, 0.4 + 0.2 * n)
        ins = mix(ins, WHITE, smooth(0.55, 0.9, abs(across)) * smooth(0.6, 0.95, hair) * 0.8)
        return mix(mix(out, ins, inside), SAND2, smooth(0.85, 1.0, along) * 0.3 * (1 - inside))
    if P.z > 0.3: P = HC + (Vector(P) - HC) / HS     # the face is painted on the first, smaller head
    x, y, z = P
    n = noise.noise(Vector((x * 40, y * 40, z * 40))); n2 = noise.noise(Vector((x * 150, y * 150, z * 150)))
    c = mix(SAND, SAND2, 0.3 + 0.25 * n + 0.12 * n2)
    if z < -0.3:   # the tail: sandy, darker along the top, a black tip
        c = mix(c, SAND2, 0.3)
        return mix(c, DARK, smooth(0.17, 0.12, y) * 0.95)
    c = mix(c, WHITE, smooth(0.3, 0.24, y) * smooth(-0.1, -0.5, N.y) * 0.85)                 # white belly
    c = mix(c, WHITE, smooth(0.24, 0.16, y) * smooth(0.04, 0.055, abs(x)) * 0.8)              # white legs
    if z > 0.12 and 0.26 < y < 0.48 and N.z > 0.15 and abs(x) < 0.05 + (0.48 - y) * 0.2: c = mix(c, WHITE, 0.8 * smooth(0.15, 0.45, N.z))   # white throat and chest, in front only
    if z > 0.33: c = mix(c, mix(CREAM, WHITE, 0.5), smooth(0.33, 0.4, z) * 0.75)               # a pale face
    if z > 0.39 and 0.553 < y < 0.58 and 0.014 < abs(x) < 0.026: c = mix(c, STREAK, 0.6)      # the brown streak below the eye
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.036, 0.587, 0.405), 0.0125, 'head', '#6a4422', (sx, 0.25, 0.6))
    parts.append(whiskers((sx * 0.02, 0.535, 0.46), sx, 'head', 4, 0.075, srgb('#2a2018')))
nose = Part('nose', bone='head', mat=1, color=srgb('#1a1410')); nose.add(*ellipsoid((0, 0.538, 0.471), (0.015, 0.011, 0.01), 8, 5)); parts.append(nose)
for p in parts:
    if p.bone == 'head': p.v = [_h(v) for v in p.v]

names = [b[0] for b in bones]
acts = quad_actions(names, dict(gait='trot', amp=26, knee=50, run_amp=42, bob=0.014, drop=0.24, head_eat=30, neck_eat=45, look=40, tailsw=10, earflick=30,
                                frames=dict(walk=20, run=12, idle=150, eat=48, sleep=120)))
_sl = acts['sleep'][1]
def sleep(ph):      # curled up with the tail around the nose
    p = _sl(ph)
    for i in range(1, 5): p['tail%d' % i] = (10, 22, 0)
    p['neck'] = (30, 40, 0); p['head'] = (25, 25, 10); return p
acts['sleep'] = (120, sleep)
SPEC = dict(id='fennec', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.0055, tris=3200, smooth=14, actions=acts,
            meta=dict(height=0.8, length=1.0, scale=0.42, speeds={'walk': 0.8, 'run': 4.0}, map={'swim': 'walk', 'sit': 'idle'}))
