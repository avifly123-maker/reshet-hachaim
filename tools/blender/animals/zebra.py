# זברה (Equus quagga, plains zebra) – savanna, kit v6, modelled on its own from the measures of an adult seen from the
# side (about 1.3 m at the withers): a horse's body, round and full, a thick neck with a short upright striped mane, a
# long head with a dark muzzle, round upright ears, slender legs on single hooves, a tail with a black tuft. The coat:
# black and white stripes, upright on the body, bending back to lie almost level over the rump and the hind legs,
# rings round the legs, thin bands on the face, a black line along the back.
own('zebra')
ANAT['zebra'] = ('ungulate', dict(arm=0.12, fa0=0.09, fa1=0.052, wr=0.058, can=0.04, fet=0.048, gas0=0.12, gas1=0.058, hock=0.06, mt=0.04,
                                th=(0.06, 0.4, 0.1)))   # a small haunch: the thigh comes from cat_muscles
EYE['zebra'] = ('#2a1a10', 'round', 0.82, 0.5)
TRUNK = [(0.62, 1.15, 0.82), (0.5, 1.28, 0.74), (0.3, 1.3, 0.72), (0.05, 1.26, 0.71), (-0.2, 1.26, 0.73), (-0.42, 1.28, 0.8),
         (-0.58, 1.22, 0.9), (-0.7, 1.08, 0.98)]
blobs = trunk_from_profile(TRUNK, lambda z: 0.215 + 0.03 * smooth(0.6, 0.1, abs(z + 0.05)))
blobs += [
    dict(t='ell', c=(0, 0.88, 0.5), r=(0.15, 0.16, 0.13), bone='chest'),                            # the chest between the forelegs
    dict(t='cap', a=(0, 1.12, 0.5), b2=(0, 1.48, 0.78), r=(0.2, 0.12), bone='neck'),               # the thick neck
    dict(t='cap', a=(0, 0.96, 0.56), b2=(0, 1.32, 0.84), r=(0.14, 0.085), bone='neck'),            # its throat
    dict(t='cap', a=(0, 1.36, 0.42), b2=(0, 1.67, 0.8), r=(0.04, 0.032), bone='neck'),              # the short upright mane
    dict(t='ell', c=(0, 1.56, 0.86), r=(0.11, 0.12, 0.14), bone='head'),                           # the skull
    dict(t='cap', a=(0, 1.52, 0.92), b2=(0, 1.2, 1.24), r=(0.1, 0.068), bone='head'),              # the long face
    dict(t='ell', c=(0, 1.38, 0.92), r=(0.08, 0.1, 0.1), bone='head'),                             # the round cheek and jaw
    dict(t='ell', c=(0, 1.17, 1.27), r=(0.072, 0.068, 0.07), bone='head'),                          # the muzzle
    dict(t='cap', a=(0, 1.2, -0.7), b2=(0, 0.78, -0.78), r=(0.036, 0.02), bone='hips'),            # the tail
    dict(t='ell', c=(0, 0.7, -0.79), r=(0.045, 0.12, 0.045), bone='hips'),                         # its tuft
]
bones = [('hips', None, (0, 1.2, -0.62), (0, 1.25, 0.0)), ('chest', 'hips', (0, 1.25, 0.0), (0, 1.25, 0.45)),
         ('neck', 'chest', (0, 1.12, 0.45), (0, 1.5, 0.8)), ('head', 'neck', (0, 1.55, 0.8), (0, 1.14, 1.3))]
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', (sx * 0.14, 1.12, 0.4), (sx * 0.145, 0.62, 0.42)), ('f' + L + '2', 'f' + L, (sx * 0.145, 0.62, 0.42), (sx * 0.145, 0.0, 0.44)),
              ('h' + L, 'hips', (sx * 0.14, 1.15, -0.48), (sx * 0.145, 0.6, -0.4)), ('h' + L + '2', 'h' + L, (sx * 0.145, 0.6, -0.4), (sx * 0.145, 0.0, -0.58))]
cat_muscles(blobs, bones, sh=(0.11, 0.22, 0.15), th=(0.13, 0.24, 0.19), th_t=0.45)
E = blob_ears(blobs, bones, base=(0.06, 1.66, 0.8), d=(0.4, 1.0, -0.25), H=0.17, w=0.045, t=0.012, tip=0.6, turn=15)

WHITE, CREAM, BLACK, BLACK2, MUZ = srgb('#f2eee6'), srgb('#e2dccf'), srgb('#1c1a1a'), srgb('#2e2a28'), srgb('#2a2422')
def paint(P, N, tag):
    x, y, z = P
    e = ear_paint(P, N, E)
    n = noise.noise(Vector((x * 5, y * 5, z * 5))); n2 = noise.noise(Vector((x * 30, y * 30, z * 30)))
    if e:
        along, across, inside = e
        c = mix(WHITE, BLACK, smooth(0.3, 0.2, abs(math.sin(along * 7))) * 0.9)
        return mix(c, CREAM, inside * 0.7) if along < 0.8 else mix(c, BLACK, 0.8)   # dark tips, pale inside
    leg = smooth(0.8, 0.7, y) * smooth(0.06, 0.09, abs(x))
    if z > 0.86 and y > 1.1:                                   # the face: thin level bands
        t = y * 16
    elif z > 0.4 and y > 0.95:                                 # the neck: bands across it
        t = (y * 0.79 + z * 0.61) * 8.5
    elif leg > 0.5:                                            # the legs: rings
        t = y * 11
    elif z < -0.38:                                            # the rump: the bands lie almost level, sloping down to the tail
        t = (y + (z + 0.38) * 0.35) * 7.0
    else:                                                      # the body: upright bands
        t = z * 7.5 - 0.3 * (y - 1.0)
    v = math.sin(2 * math.pi * t + 1.4 * n)
    blk = smooth(-0.05, 0.2, v)
    c = mix(mix(WHITE, CREAM, 0.3 + 0.3 * n2), mix(BLACK, BLACK2, 0.5 + 0.5 * n2), blk)
    c = mix(c, WHITE, smooth(0.8, 0.74, y) * smooth(-0.3, -0.7, N.y) * smooth(0.08, 0.04, abs(x)) * 0.8)   # a pale line under the belly
    c = mix(c, BLACK, smooth(0.035, 0.015, abs(x)) * smooth(1.2, 1.26, y) * smooth(0.42, 0.3, z) * 0.9)     # the line along the back
    if 0.42 < z < 0.86 and abs(x) < 0.05 and y > 1.3:                                                      # the mane: striped, dark at the top
        top = 1.36 + (z - 0.42) / 0.38 * 0.31
        c = mix(c, BLACK, smooth(top - 0.02, top + 0.03, y) * 0.8)
    if z > 1.2: c = mix(c, MUZ, 0.9)                                                                         # the dark soft muzzle
    if y < 0.06 and abs(x) > 0.07: c = mix(c, BLACK, 0.9)                                                     # the hooves
    if z < -0.74 and y < 0.85: c = mix(c, BLACK, 0.9)                                                         # the tail tuft
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.095, 1.6, 0.92), 0.022, 'head', '#2a1a10', (sx, 0.25, 0.5))
nose = Part('nose', bone='head', mat=1, color=srgb('#141212'))
for sx in (1, -1): nose.add(*ellipsoid((sx * 0.04, 1.18, 1.33), (0.014, 0.01, 0.018), 8, 5))
parts.append(nose)

names = [b[0] for b in bones]
acts = quad_actions(names, dict(amp=24, knee=52, run_amp=40, bob=0.03, drop=0.6, head_eat=40, neck_eat=55, look=20, earflick=22, tailsw=30,
                                frames=dict(walk=32, run=16, idle=150, eat=70, sleep=140)))
SPEC = dict(id='zebra', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.011, tris=4800, smooth=10, actions=acts, lidCol='#2a2420',
            meta=dict(height=1.75, length=2.2, speeds={'walk': 1.3, 'run': 9.0}, map={'swim': 'walk', 'sit': 'sleep'}))
