# צבי נגבי (Gazella dorcas) – traced from a side photo of a dorcas gazelle in the Negev (Wikimedia Commons, "Gazella
# dorcas, Israel", 29.10; tools/blender/refs/dorcas.png), modelled at a withers height of 0.95 and scaled by meta.scale
# to 0.62 m. What the photo shows: a long level back, a deep chest (a third of the withers height) and a belly that
# rises to a slim waist before the thigh; a long upright neck; a small head with very big ears and lyre horns with
# rings; long thin legs, the thigh big and round behind. Fawn back, a soft rufous band along the flank above the white
# belly, a white rump, a striped face (pale stripe from the eye to the nose, dark below), a short black tail.
own('dorcas')
ANAT['dorcas'] = ('ungulate', dict(can=0.024, mt=0.022, fa0=0.055, gas0=0.062, th=(0.06, 0.4, 0.1)))   # a small haunch: no bump on the rump
EYE['dorcas'] = ('#1a0e06', 'round', 0.84, 0.5)
# the body, from the photo: (z, top of the back, bottom of the belly)
TRUNK = [(0.33, 0.93, 0.63), (0.25, 0.95, 0.59), (0.1, 0.938, 0.6), (-0.055, 0.926, 0.64), (-0.2, 0.92, 0.73), (-0.33, 0.904, 0.74),
         (-0.435, 0.89, 0.76), (-0.5, 0.87, 0.8)]
blobs = trunk_from_profile(TRUNK, lambda z: 0.13 if z > -0.1 else 0.12)
blobs += [
    dict(t='cap', a=(0, 0.84, 0.3), b2=(0, 1.2, 0.44), r=(0.1, 0.06), bone='neck'),            # the long upright neck
    dict(t='ell', c=(0, 1.36, 0.49), r=(0.055, 0.065, 0.08), bone='head'),                          # the skull
    dict(t='cap', a=(0, 1.35, 0.53), b2=(0, 1.28, 0.67), r=(0.045, 0.026), bone='head'),            # the long narrow muzzle
    dict(t='ell', c=(0, 1.3, 0.56), r=(0.035, 0.03, 0.06), bone='head'),                            # the lower jaw
    dict(t='cap', a=(0, 0.9, -0.49), b2=(0, 0.83, -0.55), r=(0.024, 0.016), bone='hips'),           # the short tail
]
bones = [('hips', None, (0, 0.88, -0.5), (0, 0.9, 0.0)), ('chest', 'hips', (0, 0.9, 0.0), (0, 0.92, 0.3)),
         ('neck', 'chest', (0, 0.88, 0.3), (0, 1.22, 0.45)), ('head', 'neck', (0, 1.24, 0.45), (0, 1.2, 0.68))]
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', (sx * 0.07, 0.86, 0.22), (sx * 0.075, 0.56, 0.2)), ('f' + L + '2', 'f' + L, (sx * 0.075, 0.56, 0.2), (sx * 0.076, 0.0, 0.22)),
              ('h' + L, 'hips', (sx * 0.07, 0.86, -0.36), (sx * 0.075, 0.54, -0.27)), ('h' + L + '2', 'h' + L, (sx * 0.075, 0.54, -0.27), (sx * 0.076, 0.0, -0.42))]
cat_muscles(blobs, bones, sh=(0.05, 0.13, 0.07), th=(0.065, 0.16, 0.1), th_t=0.55)
HC, HS, HO = Vector((0, 1.35, 0.52)), 1.18, Vector((0, -0.08, 0))     # the photo's head is a little bigger and sits lower
def _h(p): return tuple(HC + (Vector(p) - HC) * HS + HO)
for bl in blobs:
    if bl.get('bone') == 'head':
        for k in ('c', 'a', 'b2'):
            if k in bl: bl[k] = _h(bl[k])
        bl['r'] = tuple(x * HS for x in bl['r'])
E = blob_ears(blobs, bones, base=_h((0.04, 1.41, 0.45)), d=(0.75, 0.75, -0.2), H=0.17, w=0.048, t=0.008, tip=0.6, turn=25)

FAWN, FAWN2, RUF, WHITE, DARK, CHOC = srgb('#d29a5e'), srgb('#bf8448'), srgb('#a8602e'), srgb('#f4efe6'), srgb('#2a1a10'), srgb('#5a3418')
def paint(P, N, tag):
    e = ear_paint(P, N, E)
    if P.z > 0.42 and P.y > 1.07: P = HC + (Vector(P) - HO - HC) / HS
    x, y, z = P
    if e:
        along, across, inside = e
        return mix(mix(FAWN2, CHOC, smooth(0.8, 0.97, along) * 0.6), mix(WHITE, srgb('#e8d4c0'), 0.3), inside * 0.85)
    n = noise.noise(Vector((x * 30, y * 30, z * 30)))
    c = mix(FAWN, FAWN2, 0.3 + 0.3 * n)
    if -0.5 < z < 0.34 and y < 0.95:   # the rufous flank band, then the white belly under it
        band = 0.74 + 0.03 * math.cos(z * 5)
        c = mix(c, RUF, smooth(band + 0.08, band + 0.02, y) * smooth(band - 0.03, band, y) * 0.75)
        c = mix(c, WHITE, smooth(band - 0.01, band - 0.04, y))
    if z < -0.44 and y > 0.66 and abs(x) < 0.07: c = mix(c, WHITE, 0.85 * smooth(-0.44, -0.48, z) * smooth(-0.2, -0.6, N.z))   # white rump
    if y < 0.66 and abs(x) > 0.035:   # legs: fawn outside and in front, white inside and behind
        out_ = max(0.0, N.x * (1 if x > 0 else -1)) + max(0.0, N.z) * 0.7
        c = mix(WHITE, mix(FAWN, FAWN2, 0.4), smooth(0.15, 0.55, out_) * smooth(0.68, 0.55, y) + 0.2)
        if y < 0.06: c = mix(c, DARK, 0.7)
    if z > 0.42 and y > 1.2:     # the face: a pale stripe from the eye to the nose, a dark one below it, a white chin
        e2 = abs(abs(x) - 0.033)
        yl = 1.36 - (z - 0.5) * 0.45
        if y > yl: c = mix(c, WHITE, smooth(0.018, 0.007, e2) * 0.8)
        c = mix(c, CHOC, smooth(0.018, 0.007, abs(y - yl + 0.02)) * smooth(0.5, 0.54, z) * 0.7)
        if y < 1.3: c = mix(c, WHITE, 0.75)
    if 0.33 < z < 0.46 and y < 1.25 and abs(x) < 0.05 and N.z > 0.2: c = mix(c, WHITE, 0.55)   # throat
    if z < -0.52: c = mix(c, DARK, 0.85)                                                       # black tail
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.047, 1.39, 0.54), 0.019, 'head', '#1a0e06', (sx, 0.3, 0.5))
    # the horns: ringed, rising, bending back, the tips turning forward (a lyre seen from the front)
    hp = bez([(sx * 0.028, 1.42, 0.48), (sx * 0.04, 1.55, 0.46), (sx * 0.055, 1.66, 0.4), (sx * 0.05, 1.73, 0.39), (sx * 0.045, 1.76, 0.43)], 18)
    hr = [0.017 * (1 - i / 17) ** 0.7 + 0.002 for i in range(18)]
    hv, hf = tube(hp, hr, 7)
    hc = [mix(srgb('#1e1610'), srgb('#4a3a2a'), 0.5 + 0.5 * math.sin(i // 7 * 2.4)) for i in range(len(hv))]
    horn = Part('horn', bone='head', mat=1); horn.add(hv, hf, hc); parts.append(horn)
nose = Part('nose', bone='head', mat=1, color=srgb('#1a1412')); nose.add(*ellipsoid((0, 1.29, 0.67), (0.02, 0.014, 0.01), 8, 5)); parts.append(nose)
for p in parts:
    if p.bone == 'head': p.v = [_h(v) for v in p.v]

names = [b[0] for b in bones]
acts = quad_actions(names, dict(amp=24, knee=60, run_amp=45, bob=0.03, drop=0.6, head_eat=40, neck_eat=60, look=30, earflick=30, tailsw=25,
                                run_bound=True, frames=dict(walk=30, run=16, idle=150, eat=60, sleep=120)))
SPEC = dict(id='dorcas', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.008, tris=3600, smooth=10, actions=acts,
            meta=dict(height=1.85, length=1.5, scale=0.66, speeds={'walk': 1.2, 'run': 8.0}, map={'swim': 'walk', 'sit': 'idle'}))
