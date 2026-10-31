# אריה (Panthera leo), a grown male – savanna, kit v6, modelled on its own from the measures of an adult seen from the
# side (about 1.15 m at the shoulder, a heavy body, much heavier than the cheetah's): a deep chest, a straight back, thick
# forelegs with big paws, a broad head with a short wide muzzle and eyes that look forward, round ears half hidden in the
# mane; the mane is a deep ruff round the face that runs down the neck and the chest, darker away from the face; a long
# tail with a dark tuft. Plain tawny coat, a pale belly, a pale chin and muzzle, the backs of the ears dark.
own('lion')
ANAT['lion'] = ('cat', dict(arm=0.17, sh=(0.13, 0.6, 0.2), fa0=0.1, fa1=0.076, wr=0.08, can=0.068, th=(0.13, 0.6, 0.2),
                            gas0=0.15, gas1=0.085, hock=0.085, mt=0.07, paw=(0.1, 0.058, 0.13)))
EYE['lion'] = ('#b8862e', 'round', 0.84, 0.46)
TRUNK = [(0.55, 1.05, 0.66), (0.4, 1.12, 0.58), (0.15, 1.1, 0.57), (-0.15, 1.07, 0.6), (-0.45, 1.06, 0.66), (-0.7, 1.07, 0.72),
         (-0.88, 1.02, 0.78), (-0.98, 0.94, 0.82)]
TAIL = [(0, 0.98, -0.98), (0, 0.78, -1.18), (0, 0.6, -1.4), (0, 0.55, -1.62), (0, 0.62, -1.8)]
blobs = trunk_from_profile(TRUNK, lambda z: 0.24 if z > 0.1 else (0.225 if z > -0.6 else 0.21))
blobs += [
    dict(t='cap', a=(0, 0.98, 0.45), b2=(0, 1.0, 0.72), r=(0.2, 0.15), bone='neck'),               # the thick neck
    dict(t='ell', c=(0, 1.02, 0.82), r=(0.15, 0.15, 0.17), bone='head'),                           # the broad skull
    dict(t='ell', c=(0, 0.9, 0.9), r=(0.12, 0.07, 0.09), bone='head'),                             # the jaw
    dict(t='ell', c=(0, 0.94, 1.0), r=(0.1, 0.085, 0.09), bone='head'),                            # the short wide muzzle
    dict(t='cap', a=(0, 1.08, 0.84), b2=(0, 1.0, 1.02), r=(0.06, 0.045), bone='head'),             # the bridge of the nose
    # the mane: a ruff round the face, the neck and the chest
    dict(t='ell', c=(0, 1.04, 0.76), r=(0.27, 0.24, 0.14), bone='head'),
    dict(t='ell', c=(0, 1.08, 0.6), r=(0.29, 0.3, 0.26), bone='neck'),
    dict(t='ell', c=(0, 0.88, 0.66), r=(0.25, 0.26, 0.22), bone='neck'),
    dict(t='cap', a=TAIL[0], b2=TAIL[1], r=(0.05, 0.045), bone='tail1'),
    dict(t='cap', a=TAIL[1], b2=TAIL[2], r=(0.045, 0.04), bone='tail2'),
    dict(t='cap', a=TAIL[2], b2=TAIL[3], r=(0.04, 0.036), bone='tail3'),
    dict(t='cap', a=TAIL[3], b2=TAIL[4], r=(0.036, 0.032), bone='tail4'),
    dict(t='ell', c=(0, 0.64, -1.84), r=(0.06, 0.07, 0.08), bone='tail4'),                         # the tuft
]
bones = [('hips', None, (0, 0.98, -0.95), (0, 1.02, 0.0)), ('chest', 'hips', (0, 1.02, 0.0), (0, 1.04, 0.42)),
         ('neck', 'chest', (0, 1.0, 0.42), (0, 1.02, 0.72)), ('head', 'neck', (0, 1.02, 0.72), (0, 0.94, 1.04))] + chain('tail', TAIL, 'hips')
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', (sx * 0.16, 0.95, 0.38), (sx * 0.16, 0.52, 0.4)), ('f' + L + '2', 'f' + L, (sx * 0.16, 0.52, 0.4), (sx * 0.16, 0.0, 0.43)),
              ('h' + L, 'hips', (sx * 0.15, 0.98, -0.78), (sx * 0.155, 0.56, -0.64)), ('h' + L + '2', 'h' + L, (sx * 0.155, 0.56, -0.64), (sx * 0.155, 0.0, -0.82))]
    blobs += [dict(t='ell', c=(sx * 0.16, 0.045, 0.47), r=(0.075, 0.048, 0.095), bone='f' + L + '2', foot=True),
              dict(t='ell', c=(sx * 0.155, 0.044, -0.79), r=(0.07, 0.046, 0.09), bone='h' + L + '2', foot=True)]
cat_muscles(blobs, bones, sh=(0.1, 0.22, 0.14), th=(0.12, 0.22, 0.17))
E = blob_ears(blobs, bones, base=(0.1, 1.15, 0.84), d=(0.4, 1, 0.3), H=0.1, w=0.06, t=0.016, tip=0.3, turn=25)

TAWNY, TAWNY2, CREAM, MANE, MANE2, BLACK = srgb('#c8964e'), srgb('#b07e3e'), srgb('#ecdcb8'), srgb('#8a5428'), srgb('#4e2e16'), srgb('#1c1410')
def paint(P, N, tag):
    e = ear_paint(P, N, E)
    x, y, z = P
    n = noise.noise(Vector((x * 18, y * 18, z * 18)))
    if e: return mix(mix(TAWNY2, BLACK, 0.7 * smooth(0.2, 0.6, e[0])), CREAM, e[2] * 0.6)
    c = mix(TAWNY, TAWNY2, 0.3 + 0.35 * n)
    belly = smooth(0.68, 0.6, y) * smooth(-0.15, -0.6, N.y) if -0.95 < z < 0.4 else 0
    c = mix(c, CREAM, belly * 0.7)
    face = smooth(0.84, 0.9, z) * smooth(0.2, 0.15, abs(x)) * smooth(1.22, 1.16, y)
    mane = smooth(0.34, 0.46, z) * (1 - face)
    if mane > 0:
        hair = noise.noise(Vector((x * 60, y * 14, z * 60)))                 # long hair falling down
        m = mix(MANE, MANE2, min(1.0, smooth(0.62, 0.4, z) * 0.55 + smooth(0.85, 0.6, y) * 0.3 + 0.25 * hair + 0.15))
        c = mix(c, m, mane)
    if z > 0.92 and y < 0.97: c = mix(c, CREAM, 0.75)                         # the pale muzzle and chin
    if z > 0.9 and y < 0.88: c = mix(c, CREAM, 0.8)
    if z < -1.76: c = mix(c, MANE2, 0.85)                                      # the dark tuft
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.075, 1.06, 0.955), 0.017, 'head', '#b8862e', (sx * 0.45, 0.1, 0.9))
    parts.append(whiskers((sx * 0.045, 0.93, 1.06), sx, 'head', 5, 0.12, srgb('#f0ece4')))
nose = Part('nose', bone='head', mat=1, color=srgb('#5a3428')); nose.add(*ellipsoid((0, 0.975, 1.08), (0.026, 0.016, 0.012), 8, 5)); parts.append(nose)

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
            meta=dict(height=1.3, length=2.6, speeds={'walk': 1.2, 'run': 11.0}, map={'sit': 'idle'}))
