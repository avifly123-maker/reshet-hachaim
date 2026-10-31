# זברה (Equus quagga, plains zebra) – savanna, kit v6, traced from a side photo (Commons "Zebra 02.jpg", 31.10.2026;
# refs/README.md): the photo's withers (235 px) are 1.3 m, so 1 px = 5.53 mm; z = (px - 200) × 5.53 mm forward,
# y = (310 - py) × 5.53 mm up. A deep round barrel (the belly at 0.61 m, much deeper than a horse's), a short thick neck
# with an upright mane, a long head, slender legs, a hanging tail with a black tuft.
# The coat follows the body the way the real pattern does: upright bands on the barrel, wide arcs over the haunch, rings
# on the legs, bands round the neck (across its own axis), narrow level bands on the face, a dark muzzle.
own('zebra')
ANAT['zebra'] = ('ungulate', dict(arm=0.1, fa0=0.075, fa1=0.046, wr=0.05, can=0.036, fet=0.044, gas0=0.09, gas1=0.048, hock=0.052, mt=0.036,
                                th=(0.06, 0.4, 0.1)))   # a small haunch: the thigh comes from cat_muscles
EYE['zebra'] = ('#2a1a10', 'round', 0.82, 0.5)
PX = 0.00553
def ph(x, y): return ((x - 200) * PX, (310 - y) * PX)            # photo pixel → (z, y) in metres
# the barrel traced from the photo: (px, top py, bottom py)
TRUNK = []
for x, t, b in ((300, 92, 168), (280, 78, 178), (250, 82, 192), (220, 86, 200), (180, 88, 198), (140, 84, 188), (110, 78, 175),
                (80, 78, 160), (56, 92, 150), (48, 110, 140)):
    z, top = ph(x, t); _, bot = ph(x, b); TRUNK.append((z, top, bot))
blobs = trunk_from_profile(TRUNK, lambda z: 0.235 + 0.035 * smooth(0.7, 0.1, abs(z + 0.1)))
blobs += [
    dict(t='ell', c=(0, 0.85, 0.47), r=(0.15, 0.11, 0.11), bone='chest'),                            # the chest between the forelegs
    dict(t='cap', a=(0, 1.02, 0.5), b2=(0, 1.38, 0.9), r=(0.2, 0.13), bone='neck'),                # the thick neck
    dict(t='cap', a=(0, 0.9, 0.62), b2=(0, 1.2, 0.98), r=(0.11, 0.075), bone='neck'),              # its throat
    dict(t='cap', a=(0, 1.3, 0.46), b2=(0, 1.6, 0.98), r=(0.045, 0.035), bone='neck'),             # the upright mane
    dict(t='ell', c=(0, 1.42, 1.04), r=(0.105, 0.11, 0.13), bone='head'),                            # the skull
    dict(t='ell', c=(0, 1.19, 1.05), r=(0.095, 0.09, 0.1), bone='head'),                           # the round cheek
    dict(t='ell', c=(0.07, 1.47, 1.07), r=(0.035, 0.025, 0.04), bone='head'),                       # the brows over the eyes
    dict(t='ell', c=(-0.07, 1.47, 1.07), r=(0.035, 0.025, 0.04), bone='head'),
    dict(t='cap', a=(0, 1.38, 1.1), b2=(0, 1.12, 1.22), r=(0.07, 0.052), bone='head'),             # the long face
    dict(t='ell', c=(0, 1.06, 1.22), r=(0.066, 0.068, 0.07), bone='head'),                         # the muzzle
    dict(t='cap', a=(0, 1.1, -0.8), b2=(0, 0.66, -0.83), r=(0.04, 0.024), bone='hips'),             # the tail
    dict(t='ell', c=(0, 0.56, -0.84), r=(0.05, 0.16, 0.05), bone='hips'),                           # its tuft
]
bones = [('hips', None, (0, 1.15, -0.65), (0, 1.22, 0.0)), ('chest', 'hips', (0, 1.22, 0.0), (0, 1.22, 0.45)),
         ('neck', 'chest', (0, 1.02, 0.5), (0, 1.38, 0.92)), ('head', 'neck', (0, 1.45, 1.0), (0, 1.06, 1.24))]
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', (sx * 0.15, 0.9, 0.41), (sx * 0.15, 0.33, 0.32)), ('f' + L + '2', 'f' + L, (sx * 0.15, 0.33, 0.32), (sx * 0.15, 0.0, 0.31)),
              ('h' + L, 'hips', (sx * 0.15, 1.08, -0.58), (sx * 0.15, 0.39, -0.71)), ('h' + L + '2', 'h' + L, (sx * 0.15, 0.39, -0.71), (sx * 0.15, 0.0, -0.6))]
cat_muscles(blobs, bones, sh=(0.1, 0.14, 0.1), th=(0.13, 0.22, 0.17), sh_t=0.3, th_t=0.4)
E = blob_ears(blobs, bones, base=(0.06, 1.53, 1.0), d=(0.3, 1.0, -0.12), H=0.2, w=0.055, t=0.012, tip=0.6, turn=15)

WHITE, CREAM, BLACK, BLACK2, MUZ = srgb('#f2eee6'), srgb('#e4ddcf'), srgb('#1c1a1a'), srgb('#2e2a28'), srgb('#2a2422')
# The stripe phase is one smooth field over the body: each region has its own direction of bands, and where two regions
# meet the two fields are blended over a short band after an offset that makes them equal along the joint, so a stripe
# turns from upright to level the way it does on the real animal instead of breaking off.
def _barrel(y, z): return z * 7.0 + (y - 1.0) * 0.8
def _haunch(y, z): return math.sqrt((y - 0.25) ** 2 + (z + 0.15) ** 2) * 6.5 - 7.94      # wide arcs sweeping back and down
def _neck(y, z): return ((y - 1.02) * 0.645 + (z - 0.5) * 0.764) * 9.0 + 3.11             # bands across the neck's axis
def _face(y, z): return y * 15.0 - 12.84                                                    # narrow level bands
def _ring(y, y0, z0, f): return f(y0, z0) + (y - y0) * 12.0                                 # leg rings that start from the body's band
def phase(x, y, z):
    ax = abs(x)
    s = z - (-0.22 - 0.3 * (1.25 - y))                       # < 0 behind the slanted line of the haunch
    p = _barrel(y, z) + (_haunch(y, z) - _barrel(y, z)) * smooth(0.07, -0.07, s)
    if z > 0.3:                                              # the neck and the face
        p = p + (_neck(y, z) - p) * smooth(0.4, 0.56, z) * smooth(0.85, 0.97, y)
        p = p + (_face(y, z) - p) * smooth(0.92, 1.04, z) * smooth(0.95, 1.05, y)
    if ax > 0.05:                                            # the legs
        if z > 0.0: p = p + (_ring(y, 0.66, 0.36, _barrel) - p) * smooth(0.74, 0.56, y)
        else: p = p + (_ring(y, 0.6, -0.68, _haunch) - p) * smooth(0.7, 0.5, y)
    return p
def paint(P, N, tag):
    x, y, z = P
    e = ear_paint(P, N, E)
    n = noise.noise(Vector((x * 4, y * 4, z * 4))); n2 = noise.noise(Vector((x * 30, y * 30, z * 30)))
    if e:
        along, across, inside = e
        c = mix(WHITE, BLACK, smooth(0.3, 0.2, abs(math.sin(along * 7))) * 0.9)
        return mix(c, CREAM, inside * 0.7) if along < 0.8 else mix(c, BLACK, 0.8)
    v = math.sin(2 * math.pi * phase(x, y, z) + 0.6 * n)
    blk = smooth(-0.08, 0.12, v)
    c = mix(mix(WHITE, CREAM, 0.3 + 0.3 * n2), mix(BLACK, BLACK2, 0.5 + 0.5 * n2), blk)
    c = mix(c, BLACK, smooth(0.035, 0.015, abs(x)) * smooth(1.15, 1.22, y) * smooth(0.42, 0.3, z) * 0.9)     # the line along the back
    if 0.46 < z < 0.98 and abs(x) < 0.05:                                                                   # the mane, dark at its top
        top = 1.3 + (z - 0.46) / 0.52 * 0.3
        c = mix(c, BLACK, smooth(top + 0.0, top + 0.05, y) * 0.8)
    c = mix(c, MUZ, 0.9 * smooth(1.2, 1.26, z))                                                                         # the dark soft muzzle
    if y < 0.06 and abs(x) > 0.07: c = mix(c, BLACK, 0.9)                                                     # the hooves
    if z < -0.78 and y < 0.72: c = mix(c, BLACK, 0.9)                                                         # the tail tuft
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.086, 1.43, 1.08), 0.02, 'head', '#2a1a10', (sx, 0.25, 0.5))
nose = Part('nose', bone='head', color=srgb('#0e0c0c'))                 # matte slit nostrils (a glossy round one reads as an eye)
for sx in (1, -1): nose.add(*ellipsoid((sx * 0.032, 1.08, 1.283), (0.008, 0.016, 0.01), 8, 5, rot=(0, 0, sx * 25)))
parts.append(nose)

names = [b[0] for b in bones]
acts = quad_actions(names, dict(amp=24, knee=52, run_amp=40, bob=0.03, drop=0.6, head_eat=40, neck_eat=55, look=20, earflick=22, tailsw=30,
                                frames=dict(walk=32, run=16, idle=150, eat=70, sleep=140)))
SPEC = dict(id='zebra', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.011, tris=4800, smooth=10, actions=acts, lidCol='#2a2420',
            meta=dict(height=1.7, length=2.3, speeds={'walk': 1.3, 'run': 9.0}, map={'swim': 'walk', 'sit': 'sleep'}))
