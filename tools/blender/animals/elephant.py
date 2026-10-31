# פיל אפריקאי (Loxodonta africana) – savanna, kit v6, traced from a side photo (Commons "Elephant side-view Kruger.jpg",
# 31.10.2026; refs/README.md), mirrored to face forward: the photo's shoulder (241 px) is 2.9 m, so 1 px = 12 mm;
# z = (280 - px) × 12 mm forward, y = (318 - py) × 12 mm up. The real shape: the high shoulder, a dip behind it and the
# hips a little lower (the saddle back), a deep barrel whose belly is only 1–1.2 m off the ground, four short thick
# columns, a big head hanging low in front of the shoulder, the trunk to the ground, the great ear lying over the neck
# and the shoulder like a map of Africa, two ivory tusks. Grey wrinkled skin with red earth from dust baths.
own('elephant')
PX = 0.01203
def ph(x, y): return ((280 - x) * PX, (318 - y) * PX)            # photo pixel → (z, y) in metres
TRUNK = []
for x, t, b in ((215, 79, 238), (235, 82, 232), (260, 92, 228), (290, 90, 222), (315, 92, 218), (340, 105, 215),
                (360, 125, 215), (375, 145, 210), (385, 175, 205)):
    z, top = ph(x, t); _, bot = ph(x, b); TRUNK.append((z, top, bot))
blobs = trunk_from_profile(TRUNK, lambda z: 0.68 + 0.1 * smooth(1.2, 0.2, abs(z + 0.05)), chest_z=0.5)
blobs += [
    dict(t='cap', a=(0, 2.25, 0.72), b2=(0, 2.25, 1.3), r=(0.6, 0.5), bone='neck'),                # the short thick neck
    # the head, hanging low in front of the shoulder
    dict(t='ell', c=(0, 2.3, 1.45), r=(0.55, 0.55, 0.55), bone='head'),                             # the skull
    dict(t='ell', c=(0, 2.5, 1.72), r=(0.4, 0.25, 0.35), bone='head'),                            # the domed forehead
    dict(t='ell', c=(0, 2.06, 1.94), r=(0.3, 0.35, 0.26), bone='head'),                            # the face and the root of the trunk
    dict(t='ell', c=(0, 1.82, 1.68), r=(0.2, 0.14, 0.18), bone='head'),                            # the lower lip
    dict(t='ell', c=(0.2, 1.88, 1.96), r=(0.085, 0.09, 0.1), bone='head'),                          # the lip sheaths the tusks come out of
    dict(t='ell', c=(-0.2, 1.88, 1.96), r=(0.085, 0.09, 0.1), bone='head'),
    # the trunk, hanging to near the ground and turning a little forward at the end
    dict(t='cap', a=(0, 1.95, 1.98), b2=(0, 1.4, 2.1), r=(0.22, 0.17), bone='head'),
    dict(t='cap', a=(0, 1.4, 2.1), b2=(0, 0.9, 2.15), r=(0.17, 0.13), bone='head'),
    dict(t='cap', a=(0, 0.9, 2.15), b2=(0, 0.5, 2.18), r=(0.13, 0.09), bone='head'),
    dict(t='cap', a=(0, 0.5, 2.18), b2=(0, 0.35, 2.3), r=(0.09, 0.075), bone='head'),
    # the tail
    dict(t='cap', a=(0, 1.9, -1.28), b2=(0, 1.1, -1.36), r=(0.06, 0.03), bone='hips'),
    dict(t='ell', c=(0, 1.0, -1.37), r=(0.045, 0.12, 0.045), bone='hips'),
]
# the roots of the ears on the skull (the ears themselves are thin plates, below)
for sx in (1, -1):
    blobs += [
        dict(t='ell', c=(sx * 0.62, 2.45, 1.4), r=(0.14, 0.32, 0.16), bone='head'),                     # the root on the skull
    ]
for sx, L in ((1, 'l'), (-1, 'r')):
    blobs += [
        # the forelegs: columns under the shoulder, a round wide foot
        dict(t='ell', c=(sx * 0.48, 1.85, 0.78), r=(0.3, 0.5, 0.28), bone='f' + L),
        dict(t='cap', a=(sx * 0.45, 1.8, 0.77), b2=(sx * 0.45, 0.97, 0.7), r=(0.36, 0.31), bone='f' + L),
        dict(t='ell', c=(sx * 0.45, 0.95, 0.7), r=(0.3, 0.22, 0.3), bone='f' + L + '2'),
        dict(t='cap', a=(sx * 0.45, 0.93, 0.7), b2=(sx * 0.45, 0.18, 0.67), r=(0.29, 0.3), bone='f' + L + '2'),
        dict(t='ell', c=(sx * 0.45, 0.12, 0.68), r=(0.33, 0.14, 0.35), bone='f' + L + '2', foot=True),
        # the hind legs: a big thigh, a straight column, a slightly smaller oval foot
        dict(t='ell', c=(sx * 0.48, 1.85, -0.8), r=(0.3, 0.55, 0.32), bone='h' + L),
        dict(t='cap', a=(sx * 0.45, 1.75, -0.86), b2=(sx * 0.45, 1.02, -0.95), r=(0.35, 0.29), bone='h' + L),
        dict(t='ell', c=(sx * 0.45, 1.0, -0.95), r=(0.28, 0.2, 0.28), bone='h' + L + '2'),
        dict(t='cap', a=(sx * 0.45, 0.98, -0.95), b2=(sx * 0.45, 0.18, -0.95), r=(0.27, 0.28), bone='h' + L + '2'),
        dict(t='ell', c=(sx * 0.45, 0.12, -0.93), r=(0.31, 0.13, 0.33), bone='h' + L + '2', foot=True),
    ]
bones = [('hips', None, (0, 2.6, -1.2), (0, 2.85, 0.0)), ('chest', 'hips', (0, 2.85, 0.0), (0, 2.9, 0.95)),
         ('neck', 'chest', (0, 2.55, 0.95), (0, 2.5, 1.35)), ('head', 'neck', (0, 2.5, 1.35), (0, 1.8, 2.0))]
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', (sx * 0.45, 2.0, 0.78), (sx * 0.45, 0.95, 0.7)), ('f' + L + '2', 'f' + L, (sx * 0.45, 0.95, 0.7), (sx * 0.45, 0.0, 0.66)),
              ('h' + L, 'hips', (sx * 0.45, 1.95, -0.82), (sx * 0.45, 1.0, -0.95)), ('h' + L + '2', 'h' + L, (sx * 0.45, 1.0, -0.95), (sx * 0.45, 0.0, -0.95))]
EYE['elephant'] = ('#2a1a10', 'round', 0.8, 0.5)

SKIN, SKIN2, CREASE, EARTH, NAIL, IVORY, DARK = srgb('#877e73'), srgb('#756c62'), srgb('#5a534b'), srgb('#9a6a4a'), srgb('#d8ceb8'), srgb('#efe6cf'), srgb('#2a2622')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 6, y * 6, z * 6))); n2 = noise.noise(Vector((x * 40, y * 40, z * 40)))
    c = mix(SKIN, SKIN2, 0.4 + 0.35 * n)
    # the wrinkles: fine creases everywhere, rings across the trunk
    cr = abs(math.sin(y * 70 + n2 * 2.0)) if (z > 1.85 and y < 2.0) else abs(n2)
    c = mix(c, CREASE, smooth(0.1, 0.0, cr) * 0.5)
    if y < 1.1 and abs(x) > 0.18: c = mix(c, CREASE, smooth(0.25, 0.0, abs(math.sin(y * 48 + n * 3))) * 0.35)   # level folds round the legs
    c = mix(c, EARTH, smooth(0.9, 0.25, y) * 0.16 + smooth(1.3, 1.05, y) * smooth(-0.2, -0.6, N.y) * 0.12)   # red earth from dust baths
    if 0.05 < y < 0.22 and abs(x) > 0.2:                                                          # the toenails, at the front of each foot
        xc = 0.45 if x > 0 else -0.45; dz = z - (0.68 if z > 0 else -0.93)
        if dz > 0.12 and abs(math.sin(math.atan2(x - xc, dz) * 4)) < 0.35: c = mix(c, NAIL, 0.6)
    if z > 1.6 and y > 2.0:                                                                         # the eye: a dark wet patch and folds round it
        for sx in (1, -1):
            de = math.sqrt((x - sx * 0.34) ** 2 + (y - 2.33) ** 2 + (z - 1.88) ** 2)
            c = mix(c, CREASE, smooth(0.12, 0.05, de) * 0.45)
            c = mix(c, DARK, smooth(0.11, 0.06, math.sqrt((x - sx * 0.36) ** 2 + (y - 2.28) ** 2 + (z - 1.72) ** 2)) * 0.35)   # the temple gland
    if z < -1.3 and y < 1.2: c = mix(c, DARK, 0.85)                                                 # the tail tuft
    return c


# the great ear: a thin plate cut to the photo's outline (the shape of Africa: wide at the top, a pointed lobe below),
# lying just off the neck and the shoulder, its back edge a little away from the body, gently cupped, thicker at the
# root; the outer face grey with fine wrinkles, the rim and the veins a little darker
EAR_C = (2.2, 1.05)                                       # (y, z) of the centre
EAR = [(1.5, 2.65), (1.1, 2.72), (0.75, 2.7), (0.55, 2.38), (0.58, 2.0), (0.85, 1.8), (1.15, 1.62), (1.35, 1.78), (1.48, 2.1), (1.52, 2.4)]   # (z, y)
def _ear_r():
    pts = sorted((math.atan2(y - EAR_C[0], z - EAR_C[1]), math.hypot(y - EAR_C[0], z - EAR_C[1])) for z, y in EAR)
    def r(a):
        ext = [(pts[-1][0] - TAU, pts[-1][1])] + pts + [(pts[0][0] + TAU, pts[0][1])]
        for (a0, r0), (a1, r1) in zip(ext, ext[1:]):
            if a0 <= a <= a1: return r0 + (r1 - r0) * (a - a0) / max(1e-9, a1 - a0)
        return pts[0][1]
    return r
def ear_plate(sx, N=56, K=7):
    r = _ear_r(); V = []; C = []; F = []
    def pos(a, f, side):
        z = EAR_C[1] + math.cos(a) * r(a) * f; y = EAR_C[0] + math.sin(a) * r(a) * f
        x = 0.8 + 0.1 * smooth(1.2, 0.6, z) - 0.05 * (1 - f * f)            # off the body, the back edge further out, cupped
        th = 0.012 + 0.02 * (1 - f) + 0.02 * smooth(1.2, 1.5, z)            # thicker at the root and the middle
        return Vector((sx * (x + side * th), y, z))
    def col(a, f, side):
        p = pos(a, f, side); n2 = noise.noise(Vector((p.y * 30, p.z * 30, sx * 3.0)))
        c = mix(SKIN, SKIN2, 0.4 + 0.3 * noise.noise(Vector((p.y * 5, p.z * 5, sx * 1.0))))
        c = mix(c, CREASE, 0.35 * smooth(0.8, 1.0, f) + 0.3 * smooth(0.08, 0.0, abs(n2)) * (1 if side > 0 else 0.4))
        return c
    idx = {}
    for side in (1, -1):
        for k in range(K + 1):
            f = k / K
            for i in range(N if k else 1):
                a = -math.pi + TAU * i / N
                idx[(side, k, i)] = len(V); V.append(pos(a, f, side)); C.append(col(a, f, side))
    out = Vector((sx, 0, 0))
    def tri(i0, i1, i2, want):
        n = (V[i1] - V[i0]).cross(V[i2] - V[i0])
        F.append((i0, i1, i2) if n.dot(want) >= 0 else (i0, i2, i1))
    for side in (1, -1):
        want = out * side
        for i in range(N): tri(idx[(side, 0, 0)], idx[(side, 1, i)], idx[(side, 1, (i + 1) % N)], want)
        for k in range(1, K):
            for i in range(N):
                a, b = idx[(side, k, i)], idx[(side, k, (i + 1) % N)]; c2, d = idx[(side, k + 1, i)], idx[(side, k + 1, (i + 1) % N)]
                tri(a, c2, d, want); tri(a, d, b, want)
    for i in range(N):                                    # the rim
        a, b = idx[(1, K, i)], idx[(1, K, (i + 1) % N)]; c2, d = idx[(-1, K, i)], idx[(-1, K, (i + 1) % N)]
        ang = -math.pi + TAU * (i + 0.5) / N; want = Vector((0, math.sin(ang), math.cos(ang)))
        tri(a, c2, d, want); tri(a, d, b, want)
    return [tuple(v) for v in V], F, C

parts = []
for sx in (1, -1):
    ev, ef, ec = ear_plate(sx); parts.append(Part('ear', bone='head', color=SKIN).add(ev, ef, ec))
    parts += eye_parts((sx * 0.34, 2.33, 1.88), 0.03, 'head', '#2a1a10', (sx, 0.1, 0.55))
    lid = Part('lid', bone='head', color=SKIN2); lid.add(*ellipsoid((sx * 0.345, 2.35, 1.885), (0.025, 0.014, 0.038), 10, 6)); parts.append(lid)
    tk = Part('tusk', bone='head', color=IVORY)
    a = Vector((sx * 0.2, 1.86, 1.98))                       # slender tusks out of their lip sheaths, curving forward and up
    pts = bez([tuple(a), tuple(a + Vector((sx * 0.03, -0.14, 0.24))), tuple(a + Vector((sx * 0.07, -0.16, 0.5))), tuple(a + Vector((sx * 0.08, 0.04, 0.74)))], 14)
    tk.add(*tube(pts, [0.058 * (1 - i / 13) ** 0.7 + 0.008 for i in range(14)], 14))
    parts.append(tk)

names = [b[0] for b in bones]
acts = quad_actions(names, dict(amp=14, knee=26, run_amp=22, bob=0.03, drop=1.2, head_eat=18, neck_eat=10, look=14, tailsw=24, earflick=8,
                                frames=dict(walk=56, run=30, idle=200, eat=100, sleep=180)))
SPEC = dict(id='elephant', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.02, tris=6500, smooth=12, actions=acts, lidCol='#4a4640',
            meta=dict(height=3.3, length=4.0, speeds={'walk': 1.2, 'run': 4.0}, map={'swim': 'walk', 'sit': 'sleep'}))
