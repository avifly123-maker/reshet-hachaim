# פיל אפריקאי (Loxodonta africana) – savanna, kit v6, modelled on its own from the measures of an adult cow seen from the
# side (about 3 m at the shoulder): the back high at the shoulder, a shallow dip behind it and a second high point at
# the hips (the African elephant's saddle back), a deep barrel body, four column legs with round soft feet and pale
# toenails, a big head with a high forehead, a long trunk that hangs to near the ground, two curved ivory tusks, and the
# great ears (shaped a little like Africa) lying flat on the shoulders. Grey wrinkled skin, a little red earth on the
# legs and belly (dust baths), a thin tail with a black tuft.
own('elephant')
TRUNK = [(1.15, 2.5, 1.62), (0.95, 2.93, 1.45), (0.7, 3.02, 1.38), (0.42, 2.92, 1.36), (0.12, 2.85, 1.36), (-0.2, 2.89, 1.38),
         (-0.5, 2.92, 1.42), (-0.8, 2.84, 1.5), (-1.05, 2.62, 1.62), (-1.25, 2.32, 1.82)]
blobs = trunk_from_profile(TRUNK, lambda z: 0.66 + 0.1 * smooth(1.1, 0.2, abs(z + 0.1)), chest_z=0.5)
blobs += [
    # the head: a big skull with a high domed forehead and full cheeks
    dict(t='ell', c=(0, 2.72, 1.42), r=(0.56, 0.62, 0.52), bone='head'),
    dict(t='ell', c=(0, 3.05, 1.55), r=(0.36, 0.3, 0.32), bone='head'),                  # the forehead
    dict(t='ell', c=(0, 2.32, 1.62), r=(0.36, 0.34, 0.34), bone='head'),                 # cheeks and the base of the trunk
    dict(t='ell', c=(0, 2.02, 1.55), r=(0.16, 0.12, 0.16), bone='head'),                 # the lower lip
    # the trunk: thick at the face, thin at the tip, hanging down and curling a little forward at the end
    dict(t='cap', a=(0, 2.4, 1.85), b2=(0, 1.75, 2.02), r=(0.22, 0.17), bone='head'),
    dict(t='cap', a=(0, 1.75, 2.02), b2=(0, 1.05, 2.08), r=(0.17, 0.12), bone='head'),
    dict(t='cap', a=(0, 1.05, 2.08), b2=(0, 0.5, 2.12), r=(0.12, 0.085), bone='head'),
    dict(t='cap', a=(0, 0.5, 2.12), b2=(0, 0.32, 2.24), r=(0.085, 0.075), bone='head'),
    # the tail
    dict(t='cap', a=(0, 2.25, -1.3), b2=(0, 1.3, -1.38), r=(0.06, 0.03), bone='hips'),
    dict(t='ell', c=(0, 1.2, -1.39), r=(0.04, 0.12, 0.04), bone='hips'),
]
# the great ears, grown out of the skin behind the head: thin, lying over the neck and shoulder with the back edge a
# little away from the body, shaped a little like the map of Africa (wide at the top, a pointed lobe at the bottom)
for sx in (1, -1):
    blobs += [
        dict(t='ell', c=(sx * 0.62, 2.88, 1.24), r=(0.14, 0.3, 0.16), bone='head'),                    # the root on the skull
        dict(t='ell', c=(sx * 0.92, 2.84, 0.92), r=(0.055, 0.4, 0.44), rot=(0, sx * 10, 0), bone='head'),
        dict(t='ell', c=(sx * 0.93, 2.3, 0.9), r=(0.05, 0.38, 0.33), rot=(0, sx * 10, 0), bone='head'),
        dict(t='ell', c=(sx * 0.88, 1.95, 1.02), r=(0.045, 0.2, 0.14), bone='head'),                   # the lobe
    ]
for sx, L in ((1, 'l'), (-1, 'r')):
    blobs += [
        # the forelegs: straight columns under the shoulder, a soft elbow, a round wide foot
        dict(t='ell', c=(sx * 0.46, 2.15, 0.72), r=(0.3, 0.5, 0.36), bone='f' + L),        # the shoulder, part of the body
        dict(t='cap', a=(sx * 0.44, 1.9, 0.74), b2=(sx * 0.43, 1.02, 0.78), r=(0.27, 0.22), bone='f' + L),
        dict(t='ell', c=(sx * 0.43, 1.0, 0.79), r=(0.22, 0.17, 0.22), bone='f' + L + '2'),
        dict(t='cap', a=(sx * 0.43, 0.98, 0.79), b2=(sx * 0.43, 0.18, 0.8), r=(0.2, 0.215), bone='f' + L + '2'),
        dict(t='ell', c=(sx * 0.43, 0.13, 0.82), r=(0.26, 0.13, 0.28), bone='f' + L + '2', foot=True),
        # the hind legs: a big thigh, a straight column, a slightly smaller oval foot
        dict(t='ell', c=(sx * 0.48, 2.2, -0.82), r=(0.3, 0.56, 0.42), bone='h' + L),         # the thigh, part of the body
        dict(t='cap', a=(sx * 0.45, 1.8, -0.86), b2=(sx * 0.44, 1.0, -0.84), r=(0.26, 0.21), bone='h' + L),
        dict(t='ell', c=(sx * 0.44, 0.98, -0.84), r=(0.21, 0.16, 0.21), bone='h' + L + '2'),
        dict(t='cap', a=(sx * 0.44, 0.96, -0.84), b2=(sx * 0.44, 0.18, -0.82), r=(0.19, 0.2), bone='h' + L + '2'),
        dict(t='ell', c=(sx * 0.44, 0.12, -0.8), r=(0.23, 0.12, 0.27), bone='h' + L + '2', foot=True),
    ]
bones = [('hips', None, (0, 2.55, -1.25), (0, 2.75, 0.0)), ('chest', 'hips', (0, 2.75, 0.0), (0, 2.8, 0.95)),
         ('neck', 'chest', (0, 2.8, 0.95), (0, 2.8, 1.2)), ('head', 'neck', (0, 2.8, 1.2), (0, 2.0, 1.9))]
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', (sx * 0.44, 2.0, 0.74), (sx * 0.43, 1.0, 0.79)), ('f' + L + '2', 'f' + L, (sx * 0.43, 1.0, 0.79), (sx * 0.43, 0.0, 0.82)),
              ('h' + L, 'hips', (sx * 0.45, 2.1, -0.84), (sx * 0.44, 0.98, -0.84)), ('h' + L + '2', 'h' + L, (sx * 0.44, 0.98, -0.84), (sx * 0.44, 0.0, -0.8))]
EYE['elephant'] = ('#2a1a10', 'round', 0.8, 0.5)

SKIN, SKIN2, CREASE, EARTH, NAIL, IVORY, DARK = srgb('#8c8781'), srgb('#7a756f'), srgb('#5e5a55'), srgb('#9a6a4a'), srgb('#d8ceb8'), srgb('#efe6cf'), srgb('#2a2622')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 6, y * 6, z * 6))); n2 = noise.noise(Vector((x * 40, y * 40, z * 40)))
    c = mix(SKIN, SKIN2, 0.4 + 0.35 * n)
    # the wrinkles: fine creases everywhere, rings across the trunk, deeper folds at the joints
    cr = abs(math.sin(y * 70 + n2 * 2.0)) if z > 1.8 else abs(n2)
    c = mix(c, CREASE, smooth(0.1, 0.0, cr) * 0.5)
    c = mix(c, EARTH, smooth(0.9, 0.25, y) * 0.16 + smooth(1.6, 1.35, y) * smooth(-0.2, -0.6, N.y) * 0.12)   # red earth from dust baths
    if 0.05 < y < 0.22 and abs(x) > 0.2:                                                          # the toenails, at the front of each foot
        xc = 0.43 if x > 0 else -0.43; dz = z - (0.82 if z > 0 else -0.8)
        if dz > 0.12 and abs(math.sin(math.atan2(x - xc, dz) * 4)) < 0.35: c = mix(c, NAIL, 0.6)
    if abs(x) > 0.8 and 1.75 < y < 3.3: c = mix(c, CREASE, 0.2 + 0.25 * smooth(0.0, 0.3, n2))   # the ears
    if z < -1.3 and y < 1.3: c = mix(c, DARK, 0.85)                                                 # the tail tuft
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.4, 2.76, 1.74), 0.03, 'head', '#2a1a10', (sx, 0.1, 0.55))
    lid = Part('lid', bone='head', color=SKIN2); lid.add(*ellipsoid((sx * 0.405, 2.78, 1.745), (0.025, 0.014, 0.038), 10, 6)); parts.append(lid)
    # the tusks: ivory, out of the upper lip, curving forward and a little up
    tk = Part('tusk', bone='head', color=IVORY)
    a = Vector((sx * 0.2, 2.05, 1.78))
    tk.add(*tube([tuple(a), tuple(a + Vector((sx * 0.05, -0.25, 0.22))), tuple(a + Vector((sx * 0.08, -0.3, 0.48))), tuple(a + Vector((sx * 0.08, -0.2, 0.68)))],
                 [0.078, 0.07, 0.052, 0.022], 12))
    parts.append(tk)

names = [b[0] for b in bones]
acts = quad_actions(names, dict(amp=14, knee=26, run_amp=22, bob=0.03, drop=1.4, head_eat=18, neck_eat=10, look=14, tailsw=24, earflick=8,
                                frames=dict(walk=56, run=30, idle=200, eat=100, sleep=180)))
SPEC = dict(id='elephant', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.02, tris=6500, smooth=12, actions=acts, lidCol='#4a4640',
            meta=dict(height=3.4, length=4.2, speeds={'walk': 1.2, 'run': 4.0}, map={'swim': 'walk', 'sit': 'sleep'}))
