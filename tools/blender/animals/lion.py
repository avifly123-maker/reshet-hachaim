# אריה (Panthera leo), a grown male – savanna, kit v6, traced from a side photo (Commons "Panthera leo (male)
# (181091659).jpg", 31.10.2026; refs/README.md): the photo's shoulder (208 px) is 1.2 m, so 1 px = 5.77 mm;
# z = (px - 180) × 5.77 mm forward, y = (318 - py) × 5.77 mm up. A long heavy body with a straight back, the belly at
# about half a metre, thick forelegs on big paws, a broad head with a short wide muzzle, and the mane: a deep ruff that
# rises above the shoulders and hangs down the chest to below the elbows, darker away from the face. A long tail with a
# dark tuft. Plain tawny coat, a pale belly, a pale chin and muzzle.
own('lion')
ANAT['lion'] = ('cat', dict(arm=0.15, sh=(0.12, 0.55, 0.18), fa0=0.09, fa1=0.07, wr=0.07, can=0.06, th=(0.1, 0.5, 0.16),
                            gas0=0.13, gas1=0.075, hock=0.07, mt=0.06, paw=(0.08, 0.045, 0.095)))
EYE['lion'] = ('#b8862e', 'round', 0.84, 0.46)
PX = 0.00577
def ph(x, y): return ((x - 180) * PX, (318 - y) * PX)
TRUNK = []
for x, t, b in ((235, 105, 222), (210, 110, 228), (180, 112, 230), (150, 112, 228), (120, 112, 220), (95, 115, 205), (70, 120, 190),
                (50, 132, 175), (38, 150, 165)):
    z, top = ph(x, t); _, bot = ph(x, b); TRUNK.append((z, top, bot))
TAIL = [(0, 0.97, -0.83), (0, 0.75, -0.9), (0, 0.55, -0.93), (0, 0.42, -0.95), (0, 0.36, -1.0)]
MANE = [((0, 1.1, 0.55), (0.32, 0.36, 0.32)), ((0, 1.3, 0.72), (0.3, 0.22, 0.22)), ((0, 0.82, 0.66), (0.22, 0.24, 0.18))]
blobs = trunk_from_profile(TRUNK, lambda z: 0.2 if z > 0.0 else (0.19 if z > -0.5 else 0.18))
blobs += [
    dict(t='cap', a=(0, 1.05, 0.4), b2=(0, 1.15, 0.9), r=(0.2, 0.15), bone='neck'),                # the thick neck, under the mane
    dict(t='ell', c=(0, 1.24, 0.98), r=(0.16, 0.13, 0.16), bone='head'),                           # the broad skull
    dict(t='ell', c=(0, 1.14, 1.12), r=(0.09, 0.08, 0.09), bone='head'),                           # the short wide muzzle
    dict(t='ell', c=(0.045, 1.1, 1.15), r=(0.065, 0.06, 0.068), bone='head'),                      # the two whisker pads
    dict(t='ell', c=(-0.045, 1.1, 1.15), r=(0.065, 0.06, 0.068), bone='head'),
    dict(t='ell', c=(0, 1.04, 1.06), r=(0.075, 0.045, 0.065), bone='head'),                        # the chin, small and tucked in
    dict(t='ell', c=(0.07, 1.31, 1.05), r=(0.05, 0.03, 0.05), bone='head'),                        # the brows over the eyes
    dict(t='ell', c=(-0.07, 1.31, 1.05), r=(0.05, 0.03, 0.05), bone='head'),
    dict(t='ell', c=(0.11, 1.15, 0.99), r=(0.06, 0.07, 0.08), bone='head'),                        # the cheeks
    dict(t='ell', c=(-0.11, 1.15, 0.99), r=(0.06, 0.07, 0.08), bone='head'),
    dict(t='cap', a=(0, 1.3, 0.98), b2=(0, 1.18, 1.17), r=(0.07, 0.055), bone='head'),             # the bridge of the nose
    dict(t='cap', a=TAIL[0], b2=TAIL[1], r=(0.045, 0.04), bone='tail1'),
    dict(t='cap', a=TAIL[1], b2=TAIL[2], r=(0.04, 0.036), bone='tail2'),
    dict(t='cap', a=TAIL[2], b2=TAIL[3], r=(0.036, 0.032), bone='tail3'),
    dict(t='cap', a=TAIL[3], b2=TAIL[4], r=(0.032, 0.03), bone='tail4'),
    dict(t='ell', c=(0, 0.33, -1.03), r=(0.05, 0.07, 0.06), bone='tail4'),                         # the tuft
]
blobs += [dict(t='ell', c=c, r=r, bone='neck') for c, r in MANE]                                  # the mane
bones = [('hips', None, (0, 1.0, -0.78), (0, 1.05, 0.0)), ('chest', 'hips', (0, 1.05, 0.0), (0, 1.08, 0.38)),
         ('neck', 'chest', (0, 1.05, 0.38), (0, 1.15, 0.9)), ('head', 'neck', (0, 1.2, 0.9), (0, 1.08, 1.2))] + chain('tail', TAIL, 'hips')
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', (sx * 0.14, 1.0, 0.33), (sx * 0.14, 0.55, 0.35)), ('f' + L + '2', 'f' + L, (sx * 0.14, 0.55, 0.35), (sx * 0.14, 0.0, 0.4)),
              ('h' + L, 'hips', (sx * 0.14, 1.02, -0.6), (sx * 0.14, 0.55, -0.5)), ('h' + L + '2', 'h' + L, (sx * 0.14, 0.55, -0.5), (sx * 0.14, 0.0, -0.66))]
    blobs += [dict(t='ell', c=(sx * 0.14, 0.04, 0.44), r=(0.062, 0.04, 0.075), bone='f' + L + '2', foot=True),
              dict(t='ell', c=(sx * 0.14, 0.04, -0.62), r=(0.058, 0.04, 0.07), bone='h' + L + '2', foot=True)]
cat_muscles(blobs, bones, sh=(0.1, 0.2, 0.13), th=(0.12, 0.22, 0.17))
E = blob_ears(blobs, bones, base=(0.11, 1.33, 0.88), d=(0.4, 1, 0.2), H=0.07, w=0.05, t=0.015, tip=0.3, turn=25)

TAWNY, TAWNY2, CREAM, MANE_C, MANE2, BLACK = srgb('#c8964e'), srgb('#b07e3e'), srgb('#ecdcb8'), srgb('#9a6430'), srgb('#4a2a12'), srgb('#1c1410')
def paint(P, N, tag):
    e = ear_paint(P, N, E)
    x, y, z = P
    n = noise.noise(Vector((x * 18, y * 18, z * 18)))
    if e: return mix(mix(TAWNY2, BLACK, 0.7 * smooth(0.2, 0.6, e[0])), CREAM, e[2] * 0.25)
    c = mix(TAWNY, TAWNY2, 0.3 + 0.35 * n)
    belly = smooth(0.62, 0.54, y) * smooth(-0.15, -0.6, N.y) if -0.8 < z < 0.4 else 0
    c = mix(c, CREAM, belly * 0.7)
    mane = 0.0
    for c0, r0 in MANE:
        d = math.sqrt(((x - c0[0]) / r0[0]) ** 2 + ((y - c0[1]) / r0[1]) ** 2 + ((z - c0[2]) / r0[2]) ** 2)
        mane = max(mane, smooth(1.12, 0.95, d))
    mane *= smooth(1.0, 0.92, z) if y > 1.0 else 1.0                       # the face stays clear
    if mane > 0:
        hair = noise.noise(Vector((x * 60, y * 14, z * 60)))                 # long hair falling down
        m = mix(MANE_C, MANE2, max(0.0, min(1.0, smooth(0.8, 0.45, z) * 0.45 + smooth(1.1, 0.6, y) * 0.45 + 0.45 * hair)))
        c = mix(c, m, mane)
    if z > 0.9:                                                                # the face
        for sx in (1, -1):
            de = math.sqrt((x - sx * 0.08) ** 2 + (y - 1.27) ** 2 + (z - 1.1) ** 2)
            c = mix(c, BLACK, smooth(0.034, 0.024, de) * 0.7)                    # the dark rim round the eye
            c = mix(c, CREAM, smooth(0.06, 0.035, math.sqrt((x - sx * 0.06) ** 2 + (y - 1.23) ** 2 + (z - 1.1) ** 2)) * 0.35)   # pale under the eye
            dp = math.sqrt((x - sx * 0.045) ** 2 + (y - 1.1) ** 2 + (z - 1.15) ** 2)
            c = mix(c, CREAM, smooth(0.08, 0.05, dp) * 0.5)                      # pale whisker pads
            if smooth(0.075, 0.06, dp) > 0.5 and N.z > 0.2 and (int(x * 400) + int(y * 400)) % 9 == 0: c = mix(c, BLACK, 0.5)   # whisker spots
        if y < 1.05 and abs(x) < 0.09: c = mix(c, CREAM, 0.4)                    # the pale chin
        if 1.05 < y < 1.065 and z > 1.1: c = mix(c, BLACK, 0.45)               # the line of the lips
    if z < -0.98 and y < 0.42: c = mix(c, MANE2, 0.85)                        # the dark tuft
    return c


# the mane's hair: locks grown from the mane volume, so it reads as hair and not as a cap. Each lock is a thin tapered
# three-sided tube of four segments, rooted a little inside the volume, leaning out, then falling down and back, longer
# on the chest and the neck than round the face; dark at the root, golden at the tip, each lock a little different.
def mane_locks(n=330, seed=7):
    rnd = random.Random(seed); out = []
    tries = 0
    while len(out) < n and tries < n * 30:
        tries += 1
        (c0, r0) = rnd.choice(MANE + [MANE[1]] * 2)                     # more round the face
        th = rnd.uniform(0, math.pi); ph = rnd.uniform(0, TAU)
        dirn = Vector((math.sin(th) * math.cos(ph), math.cos(th), math.sin(th) * math.sin(ph)))
        p = Vector(c0) + Vector((dirn.x * r0[0], dirn.y * r0[1], dirn.z * r0[2])) * 0.9
        nrm = Vector((dirn.x / r0[0], dirn.y / r0[1], dirn.z / r0[2])).normalized()
        if p.z > 0.9 and abs(p.x) < 0.15 and p.y > 0.95: continue          # keep the face clear
        if p.z < 0.3 or p.y < 0.5: continue                                 # not on the back or under the belly
        if nrm.z < -0.6 and p.z < 0.5: continue                             # not pointing into the body
        L = rnd.uniform(0.13, 0.2) + 0.08 * smooth(1.1, 0.7, p.y)          # longer low on the neck and the chest
        out.append((p, nrm, L, rnd.uniform(-1, 1)))
    return out
def lock_part():
    part = Part('mane', bone='neck', color=MANE_C)
    for p, nrm, L, v in mane_locks():
        down = Vector((0, -1, -0.35)).normalized()
        pts = []
        for k in range(5):
            t = k / 4
            d = (nrm * (1 - t) * 0.8 + down * (0.3 + t)).normalized()
            q = (pts[-1] if pts else p - nrm * 0.03) + d * (L / 4 if pts else 0.0)
            q += Vector((0.012 * v * t, 0, 0.01 * v * t))
            pts.append(q)
        rr = [0.026, 0.022, 0.016, 0.009, 0.002]
        V, F = tube([tuple(x) for x in pts], rr, 3, cap0=False, cap1=False)
        tone = 0.5 + 0.5 * v
        C = []
        for i in range(len(V)):
            t = (i // 3) / 4
            root = mix(MANE2, MANE_C, 0.25 + 0.2 * tone)
            tip = mix(MANE_C, srgb('#d4a058'), 0.3 + 0.4 * tone)
            C.append(mix(root, tip, t))
        part.add(V, F, C)
    return part

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.08, 1.27, 1.11), 0.018, 'head', '#b8862e', (sx * 0.45, 0.1, 0.9))
    parts.append(whiskers((sx * 0.05, 1.11, 1.19), sx, 'head', 5, 0.12, srgb('#f0ece4')))
parts.append(lock_part())
nose = Part('nose', bone='head', color=srgb('#6a3c30')); nose.add(*ellipsoid((0, 1.178, 1.212), (0.042, 0.022, 0.018), 12, 7)); parts.append(nose)   # the broad nose pad

names = [b[0] for b in bones]
acts = quad_actions(names, dict(amp=24, knee=34, run_amp=40, bob=0.02, drop=0.4, head_eat=30, neck_eat=30, look=22, tailsw=14, earflick=14,
                                run_bound=True, frames=dict(walk=40, run=16, idle=160, eat=70, sleep=150, swim=44)))
_w = acts['walk'][1]
def walk(ph):     # a cat's walk: the head low and level, the shoulders rolling, the tail swinging after
    p = _w(ph); p['chest'] = (0, -3 * math.sin(TAU * ph), -3 * math.sin(TAU * ph)); p['neck'] = (3, 3 * math.sin(TAU * ph), 0)
    for i in range(1, 5): p['tail%d' % i] = (-4 + 4 * i, 8 * math.sin(TAU * (ph - 0.12 * i)), 0)
    return p
acts['walk'] = (40, walk)
SPEC = dict(id='lion', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.012, tris=5600, smooth=12, actions=acts,
            meta=dict(height=1.55, length=2.3, speeds={'walk': 1.2, 'run': 11.0}, map={'sit': 'idle'}))
