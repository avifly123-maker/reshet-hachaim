# חתול החולות (Felis margarita) – traced from photos of sand cats (Wikimedia Commons, 29.10; tools/blender/refs/),
# modelled at a shoulder height of 0.86 model units and scaled by meta.scale to 0.27 m. What the photos show: a small
# cat with a deep, fluffy body and short thick legs (the legs are only about 40 % of the shoulder height), a very big,
# broad head (half the shoulder height across) with big ears set wide and low, a thick neck, a thick tail with dark
# rings and a black tip. Pale sand colour, a reddish line from the corner of each eye across the cheek, dark bands on
# the upper legs, white chin and belly. Kit: cat legs (ANAT 'cat'), the trunk drawn from the photos (no body plan).
own('sandcat')
ANAT['sandcat'] = ('cat', dict(arm=0.16, sh=(0.14, 0.5, 0.2), fa0=0.12, fa1=0.1, wr=0.1, can=0.095, th=(0.15, 0.55, 0.22),
                               gas0=0.13, gas1=0.1, hock=0.1, mt=0.095, paw=(0.095, 0.055, 0.13)))
EYE['sandcat'] = ('#b0a858', 'round', 0.86, 0.5)
TRUNK = [(0.31, 0.8, 0.4), (0.22, 0.86, 0.36), (0.07, 0.875, 0.34), (-0.1, 0.885, 0.335), (-0.28, 0.89, 0.345), (-0.44, 0.875, 0.38),
         (-0.56, 0.83, 0.42), (-0.66, 0.76, 0.47)]   # compact: the body is about 1.25 times the shoulder height (photo 2)
TAIL = [(0, 0.7, -0.72), (0, 0.53, -0.85), (0, 0.38, -0.98), (0, 0.26, -1.1), (0, 0.18, -1.2)]   # held low, nearly to the ground (photo)
blobs = trunk_from_profile(TRUNK, lambda z: 0.17 + 0.035 * smooth(0.3, 0.0, z) * smooth(-0.7, -0.3, z))   # round in the middle   # one smooth, deep body along the traced profile
blobs += [
    dict(t='cap', a=(0, 0.7, 0.26), b2=(0, 0.77, 0.46), r=(0.17, 0.14), bone='neck'),          # a thick ruff of a neck
    dict(t='ell', c=(0, 0.82, 0.56), r=(0.18, 0.15, 0.145), bone='head'),                        # a big broad skull
    dict(t='ell', c=(0, 0.76, 0.6), r=(0.19, 0.1, 0.095), bone='head'),                          # wide cheeks
    dict(t='ell', c=(0, 0.76, 0.68), r=(0.075, 0.065, 0.06), bone='head'),                      # a short muzzle
    dict(t='ell', c=(0, 0.71, 0.65), r=(0.07, 0.04, 0.07), bone='head'),                        # the jaw
    dict(t='cap', a=(0, 0.9, 0.6), b2=(0, 0.82, 0.72), r=(0.05, 0.035), bone='head'),
    dict(t='cap', a=TAIL[0], b2=TAIL[1], r=(0.07, 0.065), bone='tail1'),        # a thick, bushy tail
    dict(t='cap', a=TAIL[1], b2=TAIL[2], r=(0.065, 0.062), bone='tail2'),
    dict(t='cap', a=TAIL[2], b2=TAIL[3], r=(0.062, 0.06), bone='tail3'),
    dict(t='cap', a=TAIL[3], b2=TAIL[4], r=(0.06, 0.052), bone='tail4'),
]
bones = [('hips', None, (0, 0.72, -0.72), (0, 0.76, 0.0)), ('chest', 'hips', (0, 0.76, 0.0), (0, 0.78, 0.28)),
         ('neck', 'chest', (0, 0.74, 0.26), (0, 0.78, 0.46)), ('head', 'neck', (0, 0.78, 0.46), (0, 0.77, 0.72))] + chain('tail', TAIL, 'hips')
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', (sx * 0.12, 0.66, 0.24), (sx * 0.12, 0.3, 0.26)), ('f' + L + '2', 'f' + L, (sx * 0.12, 0.3, 0.26), (sx * 0.12, 0.0, 0.28)),
              ('h' + L, 'hips', (sx * 0.12, 0.7, -0.48), (sx * 0.125, 0.34, -0.39)), ('h' + L + '2', 'h' + L, (sx * 0.125, 0.34, -0.39), (sx * 0.125, 0.0, -0.52))]
    blobs += [dict(t='ell', c=(sx * 0.12, 0.05, 0.31), r=(0.09, 0.05, 0.11), bone='f' + L + '2', foot=True),
              dict(t='ell', c=(sx * 0.125, 0.048, -0.49), r=(0.085, 0.048, 0.105), bone='h' + L + '2', foot=True)]
cat_muscles(blobs, bones, sh=(0.1, 0.17, 0.12), th=(0.12, 0.17, 0.16))
HC, HS = Vector((0, 0.8, 0.58)), 1.25   # the photos' head is big for the body: grow it round its centre
def _h(p): return tuple(HC + (Vector(p) - HC) * HS)
for bl in blobs:
    if bl.get('bone') == 'head':
        for k in ('c', 'a', 'b2'):
            if k in bl: bl[k] = _h(bl[k])
        bl['r'] = tuple(x * HS for x in bl['r'])
E = blob_ears(blobs, bones, base=_h((0.1, 0.92, 0.53)), d=(0.85, 0.7, -0.15), H=0.2, w=0.1, t=0.016, tip=0.65, turn=30)

SAND, SAND2, BACK, WHITE, BAR, RUST, BLACK = srgb('#d4b47c'), srgb('#bf9d64'), srgb('#8c7656'), srgb('#f4ece0'), srgb('#8a6e48'), srgb('#c08050'), srgb('#1a1410')
def _seg(P, a, b):
    a = Vector(a); b = Vector(b); ab = b - a; t = max(0.0, min(1.0, (P - a).dot(ab) / ab.length_squared)); return (P - (a + ab * t)).length
def paint(P, N, tag):
    P0 = P
    if P.z > 0.45: P = HC + (Vector(P) - HC) / HS     # the face is painted on the first, smaller head
    x, y, z = P
    n = noise.noise(Vector((x * 22, y * 22, z * 22)))
    c = mix(SAND, SAND2, 0.3 + 0.3 * n)
    if -0.72 < z < 0.35:   # a greyer back with faint dark stripes across the sides (the photo's tabby marks)
        c = mix(c, BACK, smooth(0.62, 0.86, y) * smooth(0.2, 0.0, abs(x)) * 0.5)
        w = math.sin(z * 26 + 3 * noise.noise(Vector((x * 6, y * 6, z * 6))))
        c = mix(c, BAR, smooth(0.75, 0.95, w) * smooth(0.55, 0.72, y) * 0.28)
    e = ear_paint(P0, N, E)
    if e:
        along, across, inside = e
        return mix(mix(SAND2, BLACK, smooth(0.75, 0.95, along) * 0.7), mix(WHITE, srgb('#e8c8b0'), 0.4), inside * 0.8)
    belly = (smooth(0.46, 0.38, y) * smooth(-0.15, -0.6, N.y) if -0.62 < z < 0.38 else 0)
    belly = max(belly, smooth(0.72, 0.66, y) * smooth(0.3, 0.44, z) * smooth(0.62, 0.52, z) * smooth(-0.1, -0.5, N.y))
    c = mix(c, WHITE, belly * 0.85)
    if z > 0.5:   # the face: a white muzzle and chin, the reddish line from the eye across the cheek
        c = mix(c, WHITE, smooth(0.66, 0.69, z) * smooth(0.78, 0.76, y) * 0.75)
        c = mix(c, WHITE, smooth(0.0, 0.5, -N.y) * smooth(0.6, 0.63, z) * 0.6)
        for sx in (1, -1):
            dl = _seg(P, (sx * 0.085, 0.83, 0.665), (sx * 0.15, 0.79, 0.58))
            c = mix(c, RUST, smooth(0.012, 0.006, dl) * 0.75)
    elif z < -0.74:   # the tail: dark rings, a black tip
        ring = math.sin((z + 0.74) * 38)
        c = mix(c, BAR, smooth(0.55, 0.85, ring) * 0.8)
        if z < -1.18: c = mix(c, BLACK, 0.85)
    elif y < 0.4 and abs(x) > 0.06:   # dark bands across the upper legs
        c = mix(c, BAR, smooth(0.7, 0.92, math.sin(y * 40 + 1.0)) * 0.7 * smooth(0.12, 0.2, y))
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.062, 0.845, 0.67), 0.026, 'head', '#b0a858', (sx, 0.2, 0.75))
    parts.append(whiskers((sx * 0.042, 0.745, 0.725), sx, 'head', 5, 0.14, srgb('#f4f0e8')))
nose = Part('nose', bone='head', mat=1, color=srgb('#5a3a30')); nose.add(*ellipsoid((0, 0.795, 0.738), (0.02, 0.014, 0.012), 8, 5)); parts.append(nose)
for p in parts:
    if p.bone == 'head': p.v = [_h(v) for v in p.v]

names = [b[0] for b in bones]
acts = quad_actions(names, dict(amp=24, knee=34, run_amp=42, bob=0.015, drop=0.3, head_eat=30, neck_eat=30, look=25, tailsw=12, earflick=22,
                                run_bound=True, frames=dict(walk=30, run=12, idle=150, eat=60, sleep=120, swim=40)))
SPEC = dict(id='sandcat', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.009, tris=5200, smooth=12, actions=acts,
            meta=dict(height=1.1, length=1.9, scale=0.31, speeds={'walk': 1.0, 'run': 5.0}, map={'sit': 'idle'}))
