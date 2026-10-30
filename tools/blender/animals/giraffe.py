# ג'ירפה (Giraffa camelopardalis) – savanna pilot of kit v6 (docs/PLAN-1.4.md 11.1). Modelled on its own from real
# measures (metres): about 5 m to the top of the head, 3.2 m at the withers, a back that slopes down to the rump,
# a neck of about 1.8 m with a short dark mane, a long head with two skin-covered horns (ossicones) with dark tufts,
# big ears, long legs with knobby knees and big split hooves, a long tail with a black tuft. The coat is a net of pale
# lines round large brown patches (worley2: the border between two cells), the patches smaller on the legs and the
# face, the lower legs nearly white.
own('giraffe')
blobs = [
    dict(t='ell', c=(0, 2.2, -0.5), r=(0.42, 0.47, 0.6), rot=(-10, 0, 0), bone='hips'),
    dict(t='ell', c=(0, 2.42, 0.18), r=(0.46, 0.57, 0.6), rot=(-8, 0, 0), bone='chest'),
    dict(t='ell', c=(0, 2.78, 0.3), r=(0.24, 0.3, 0.42), bone='chest'),                 # the high withers
    dict(t='ell', c=(0, 2.0, 0.36), r=(0.22, 0.22, 0.24), bone='chest'),                # the deep chest between the forelegs
    # the long neck, thick at the shoulders, thin under the head
    dict(t='cap', a=(0, 2.62, 0.5), b2=(0, 3.4, 0.92), r=(0.27, 0.17), bone='neck'),
    dict(t='cap', a=(0, 3.4, 0.92), b2=(0, 4.08, 1.2), r=(0.17, 0.115), bone='neck'),
    # the head: a long skull, a soft long muzzle, the lips
    dict(t='ell', c=(0, 4.17, 1.3), r=(0.115, 0.13, 0.19), bone='head'),
    dict(t='cap', a=(0, 4.14, 1.42), b2=(0, 3.99, 1.76), r=(0.095, 0.072), bone='head'),
    dict(t='ell', c=(0, 3.95, 1.78), r=(0.07, 0.05, 0.06), bone='head'),
    dict(t='ell', c=(0, 4.25, 1.4), r=(0.06, 0.05, 0.08), bone='head'),                 # the bump on the forehead
    # the tail, thin, with a long black tuft
    dict(t='cap', a=(0, 2.3, -1.0), b2=(0, 1.35, -1.12), r=(0.045, 0.022), bone='hips'),
    dict(t='ell', c=(0, 1.22, -1.13), r=(0.05, 0.16, 0.05), bone='hips'),
]
for sx, L in ((1, 'l'), (-1, 'r')):
    blobs += [
        # foreleg: the shoulder, a long forearm, the knobby knee, the long cannon, the fetlock, the big split hoof
        dict(t='ell', c=(sx * 0.24, 2.18, 0.42), r=(0.15, 0.36, 0.2), bone='f' + L),
        dict(t='cap', a=(sx * 0.22, 1.95, 0.45), b2=(sx * 0.2, 1.16, 0.5), r=(0.11, 0.07), bone='f' + L),
        dict(t='ell', c=(sx * 0.2, 1.14, 0.51), r=(0.075, 0.08, 0.08), bone='f' + L + '2'),
        dict(t='cap', a=(sx * 0.2, 1.1, 0.51), b2=(sx * 0.2, 0.2, 0.53), r=(0.055, 0.045), bone='f' + L + '2'),
        dict(t='ell', c=(sx * 0.2, 0.18, 0.54), r=(0.058, 0.07, 0.062), bone='f' + L + '2'),
        dict(t='ell', c=(sx * 0.2, 0.06, 0.58), r=(0.075, 0.06, 0.1), bone='f' + L + '2', foot=True),
        # hind leg: the big thigh, the hock, the cannon, the fetlock, the hoof
        dict(t='ell', c=(sx * 0.24, 1.98, -0.62), r=(0.16, 0.42, 0.26), bone='h' + L),
        dict(t='cap', a=(sx * 0.22, 1.7, -0.72), b2=(sx * 0.2, 1.12, -0.9), r=(0.1, 0.065), bone='h' + L),
        dict(t='ell', c=(sx * 0.2, 1.1, -0.92), r=(0.06, 0.085, 0.08), bone='h' + L + '2'),
        dict(t='cap', a=(sx * 0.2, 1.06, -0.9), b2=(sx * 0.2, 0.2, -0.78), r=(0.05, 0.043), bone='h' + L + '2'),
        dict(t='ell', c=(sx * 0.2, 0.18, -0.77), r=(0.056, 0.068, 0.06), bone='h' + L + '2'),
        dict(t='ell', c=(sx * 0.2, 0.06, -0.73), r=(0.072, 0.058, 0.096), bone='h' + L + '2', foot=True),
    ]
bones = [('hips', None, (0, 2.25, -0.95), (0, 2.42, 0.0)), ('chest', 'hips', (0, 2.42, 0.0), (0, 2.7, 0.5)),
         ('neck', 'chest', (0, 2.66, 0.52), (0, 4.08, 1.2)), ('head', 'neck', (0, 4.12, 1.2), (0, 3.98, 1.8))]
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', (sx * 0.22, 2.2, 0.45), (sx * 0.2, 1.14, 0.51)), ('f' + L + '2', 'f' + L, (sx * 0.2, 1.14, 0.51), (sx * 0.2, 0.0, 0.56)),
              ('h' + L, 'hips', (sx * 0.22, 2.1, -0.6), (sx * 0.2, 1.1, -0.92)), ('h' + L + '2', 'h' + L, (sx * 0.2, 1.1, -0.92), (sx * 0.2, 0.0, -0.74))]
E = blob_ears(blobs, bones, base=(0.1, 4.24, 1.2), d=(1, 0.3, -0.35), H=0.17, w=0.05, t=0.016, tip=0.75)
EYE['giraffe'] = ('#2a160a', 'round', 0.82, 0.5)

PATCH, PATCH2, LINE, CREAM, DARK, MANE = srgb('#a8642e'), srgb('#8a4c22'), srgb('#e6d2a8'), srgb('#f2e8d4'), srgb('#2a1e16'), srgb('#5a3a22')
def paint(P, N, tag):
    x, y, z = P
    e = ear_paint(P, N, E)
    if e: return mix(mix(CREAM, PATCH, 0.3), CREAM, e[2] * 0.6)
    # the net: big patches on the body and neck, smaller on the legs and face, the lower legs nearly plain
    leg = smooth(1.5, 1.2, y) * smooth(0.12, 0.17, abs(x))
    face = smooth(1.15, 1.3, z) * smooth(3.85, 4.0, y)
    sc = 3.6 + 3.0 * leg + 4.0 * face
    d1, d2, rid = worley2(Vector((x * 1.0, y * 0.85, z * 1.0)), sc, 21)
    w = noise.noise(Vector((x * 9, y * 9, z * 9)))
    edge = smooth(0.05 + 0.02 * w, 0.12 + 0.02 * w, d2 - d1)          # 0 on the pale line between two patches, 1 inside a patch
    pc = mix(PATCH, PATCH2, 0.25 + 0.5 * rid + 0.15 * w)
    c = mix(LINE, pc, edge)
    plain = smooth(0.85, 0.45, y) * smooth(0.12, 0.17, abs(x))       # the lower legs: pale, a few faint spots
    c = mix(c, mix(CREAM, LINE, 0.4), plain * 0.85)
    c = mix(c, CREAM, smooth(2.0, 1.86, y) * smooth(-0.2, -0.6, N.y) * smooth(0.12, 0.08, abs(x)) * 0.6)   # pale belly
    # the short dark mane along the top of the neck
    if 2.75 < y < 4.1 and abs(x) < 0.07:
        t = (y - 2.66) / (4.08 - 2.66); zt = 0.52 + t * (1.2 - 0.52)
        back = smooth(-0.05, 0.08, zt - z)
        c = mix(c, MANE, back * smooth(0.07, 0.03, abs(x)) * 0.8)
    if y < 0.12 and abs(x) > 0.1: c = mix(c, DARK, 0.85)                                  # the hooves
    if z > 1.68: c = mix(c, mix(CREAM, PATCH2, 0.25), 0.6)                                 # a pale soft muzzle
    if z < -1.05 and y < 1.4: c = mix(c, DARK, 0.85)                                       # the black tail tuft
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.098, 4.22, 1.33), 0.032, 'head', '#2a160a', (sx, 0.2, 0.5))
    # the ossicones: two short horns covered with skin, a tuft of dark hair on top
    oc = Part('horn', bone='head', color=mix(PATCH, CREAM, 0.3))
    a = Vector((sx * 0.055, 4.27, 1.22)); b = a + Vector((sx * 0.03, 0.17, -0.04))
    oc.add(*tube([tuple(a), tuple(a + (b - a) * 0.6), tuple(b)], [0.034, 0.028, 0.03], 9))
    parts.append(oc)
    tuft = Part('tuft', bone='head', color=DARK); tuft.add(*ellipsoid(tuple(b + Vector((0, 0.012, 0))), (0.036, 0.028, 0.036), 10, 6)); parts.append(tuft)
nos = Part('nose', bone='head', mat=1, color=DARK)
for sx in (1, -1): nos.add(*ellipsoid((sx * 0.035, 4.0, 1.78), (0.014, 0.008, 0.02), 8, 5))
parts.append(nos)

names = [b[0] for b in bones]
acts = quad_actions(names, dict(amp=20, knee=44, run_amp=34, bob=0.03, drop=1.1, head_eat=30, neck_eat=40, look=22, tailsw=26, earflick=18,
                                frames=dict(walk=44, run=22, idle=170, eat=80, sleep=150)))
SPEC = dict(id='giraffe', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.014, tris=6000, smooth=12, actions=acts, lidCol='#3a2618',
            meta=dict(height=4.6, length=3.4, speeds={'walk': 1.2, 'run': 8.0}, map={'swim': 'walk', 'sit': 'sleep'}))
