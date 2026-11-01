# בבון (Papio anubis, olive baboon) – savanna, kit v6, traced from a side photo of a walking baboon (Commons, refs/README.md
# "p3", 31.10.2026): modelled at a shoulder height of 0.8 model units (1 px = 3.88 mm; z = (px - 200) × PX forward,
# y = (298 - py) × PX up) and scaled by meta.scale to 0.7 m. The photo: on all fours, the back nearly level and a little
# higher at the rump, a deep chest and a slim waist, long arms (the shoulders as high as the hips), a heavy head with a
# long dog-like muzzle and a brow ridge, small ears hidden in the fur, a tail held up in an arch for its first third
# and then hanging down. Olive grey-brown coat, darker hands and feet, a dark grey bare face.
own('baboon')
ANAT['baboon'] = ('cat', dict(arm=0.085, sh=(0.085, 0.6, 0.18), fa0=0.06, fa1=0.048, wr=0.045, can=0.04, th=(0.1, 0.55, 0.18),
                              gas0=0.07, gas1=0.045, hock=0.045, mt=0.04, paw=(0.06, 0.03, 0.1)))
EYE['baboon'] = ('#4a2a14', 'round', 0.8, 0.5)
PX = 0.00388
def ph(x, y): return ((x - 200) * PX, (298 - y) * PX)
def P3(x, y, X=0.0): z, yy = ph(x, y); return (X, yy, z)
TRUNK = []
for x, t, b in ((300, 118, 160), (285, 96, 165), (265, 95, 172), (240, 99, 184), (215, 102, 190), (190, 104, 186), (165, 106, 172),
                (140, 108, 165), (118, 112, 172), (102, 122, 178)):
    z, top = ph(x, t); _, bot = ph(x, b); TRUNK.append((z, top, bot))
TAIL = [P3(106, 118), P3(102, 98), P3(92, 90), P3(82, 100), P3(78, 140), P3(77, 190), P3(78, 232)]   # round 4: up from the rump, an arch back, then hanging
blobs = trunk_from_profile(TRUNK, lambda z: 0.11 + 0.025 * smooth(-0.2, 0.3, z), n=36)
blobs += [
    dict(t='cap', a=P3(290, 108), b2=P3(305, 100), r=(0.09, 0.08), bone='neck'),              # the short neck and the mane over it
    dict(t='ell', c=P3(282, 104), r=(0.12, 0.09, 0.1), bone='chest'),                         # round 3: the shaggy mane over the shoulders
    dict(t='ell', c=P3(303, 92), r=(0.1, 0.1, 0.1), bone='head'),                          # the big skull, the cheek fur round it
    dict(t='cap', a=P3(298, 86), b2=P3(318, 88), r=(0.03, 0.025), bone='head'),               # the brow ridge
    dict(t='cap', a=P3(312, 98), b2=P3(344, 108), r=(0.058, 0.05), bone='head'),            # the long muzzle, forward and deep, not a flat bill (round 5)
    dict(t='ell', c=P3(322, 118), r=(0.045, 0.032, 0.055), bone='head'),
    dict(t='ell', c=P3(300, 104), r=(0.075, 0.06, 0.05), bone='head'),                        # round 5: the full cheek fur round the face                        # the jaw
]
for i in range(len(TAIL) - 1):
    blobs.append(dict(t='cap', a=TAIL[i], b2=TAIL[i + 1], r=(0.026 - 0.002 * i, 0.024 - 0.002 * i), bone='tail%d' % (i + 1)))
bones = [('hips', None, P3(104, 118), P3(200, 104)), ('chest', 'hips', P3(200, 104), P3(292, 100)),
         ('neck', 'chest', P3(290, 108), P3(306, 98)), ('head', 'neck', P3(306, 96), P3(344, 128))] + chain('tail', TAIL, 'hips')
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', P3(280, 140, sx * 0.07), P3(285, 212, sx * 0.07)), ('f' + L + '2', 'f' + L, P3(285, 212, sx * 0.07), P3(298, 290, sx * 0.07)),
              ('h' + L, 'hips', P3(128, 150, sx * 0.07), P3(140, 228, sx * 0.072)), ('h' + L + '2', 'h' + L, P3(140, 228, sx * 0.072), P3(126, 292, sx * 0.072))]
    blobs += [dict(t='ell', c=P3(306, 292, sx * 0.07), r=(0.028, 0.02, 0.042), bone='f' + L + '2', foot=True),   # the hands
              dict(t='ell', c=P3(140, 292, sx * 0.072), r=(0.028, 0.02, 0.055), bone='h' + L + '2', foot=True)]  # the long feet
cat_muscles(blobs, bones, sh=(0.04, 0.08, 0.055), th=(0.05, 0.09, 0.07))
E = blob_ears(blobs, bones, base=(0.06, ph(0, 88)[1], ph(296, 0)[0]), d=(0.6, 0.8, -0.3), H=0.04, w=0.035, t=0.01, tip=0.95, turn=20)

OLIVE, OLIVE2, FACE, DARK, PALE = srgb('#8a845e'), srgb('#706a4a'), srgb('#5a524a'), srgb('#3a3428'), srgb('#a8a07a')
def paint(P, N, tag):
    x, y, z = P
    e = ear_paint(P, N, E)
    if e: return mix(FACE, OLIVE2, 0.4)
    n = noise.noise(Vector((x * 16, y * 16, z * 16))); n2 = noise.noise(Vector((x * 70, y * 70, z * 70)))
    c = mix(OLIVE, OLIVE2, 0.35 + 0.3 * n + 0.2 * n2)
    if N.y < -0.4 and -0.4 < z < 0.3: c = mix(c, PALE, 0.35)                                    # a paler belly
    if z > ph(310, 0)[0] and y < ph(0, 92)[1]: c = mix(c, FACE, smooth(ph(310, 0)[0], ph(330, 0)[0], z) * (0.55 + 0.35 * smooth(ph(330, 0)[0], ph(344, 0)[0], z)))   # the bare muzzle, darkest at the nose
    if y < 0.04 and abs(x) > 0.04: c = mix(c, DARK, 0.6)                                         # the dark hands and feet
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.035, ph(0, 92)[1], ph(316, 0)[0]), 0.012, 'head', '#4a2a14', (sx, 0.15, 0.8))
nose = Part('nose', bone='head', mat=1, color=srgb('#141212')); nose.add(*ellipsoid((0, ph(0, 110)[1], ph(348, 0)[0]), (0.028, 0.02, 0.014), 8, 5)); parts.append(nose)

names = [b[0] for b in bones]
acts = quad_actions(names, dict(amp=24, knee=40, run_amp=40, bob=0.02, drop=0.3, head_eat=30, neck_eat=30, look=30, tailsw=6, earflick=0,
                                frames=dict(walk=30, run=16, idle=140, eat=60, sleep=120)))
blobs = organic(blobs, 29)   # 1.11 (Avi): not two mirrored halves of clean parts
SPEC = dict(id='baboon', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.007, tris=5200, smooth=16, actions=acts,
            meta=dict(height=1.0, length=1.6, scale=0.875, speeds={'walk': 1.2, 'run': 7.0, 'climb': 1.0}, map={'sit': 'idle', 'swim': 'walk', 'climb': 'walk'}))
