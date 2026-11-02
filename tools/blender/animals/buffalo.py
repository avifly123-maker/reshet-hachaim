# תאו אפריקאי (Syncerus caffer, African buffalo, bull) – savanna, kit v6, traced from a side photo (Commons "Cape Buffalo
# (Syncerus caffer) bull and cow", refs/README.md "b3", 1.11.2026): the photo's withers (177 px) are 1.5 m, so 1 px =
# 8.5 mm; z = (px - 130) × 8.5 mm forward, y = (265 - py) × 8.5 mm up. A heavy barrel body with a straight back and a
# low hump over the shoulders, a deep belly, short thick legs, a thick short neck, a big head carried low and forward,
# the boss: the two horns meet over the forehead, sweep down and out, then curve up at the tips; big drooping fringed
# ears under the horns, a broad wet muzzle, a cow's tail with a dark tuft. Dark grey-black coat, thin on the body.
own('buffalo')
ANAT['buffalo'] = ('ungulate', dict(arm=0.13, fa0=0.095, fa1=0.064, wr=0.064, can=0.05, fet=0.056, gas0=0.112, gas1=0.064, hock=0.064, mt=0.05,   # 2.11 round 3: sturdier legs
                                  th=(0.07, 0.45, 0.11)))
EYE['buffalo'] = ('#1a120c', 'round', 0.8, 0.5)
PX = 0.0085
def ph(x, y): return ((x - 130) * PX, (265 - y) * PX)
TRUNK = []
for x, t, b in ((232, 118, 182), (215, 100, 195), (190, 92, 200), (165, 88, 202), (140, 90, 202), (115, 92, 198), (90, 95, 195),
                (65, 98, 185), (45, 102, 170), (32, 112, 150)):
    z, top = ph(x, t); _, bot = ph(x, b); TRUNK.append((z, top, bot))
blobs = trunk_from_profile(TRUNK, lambda z: 0.3 + 0.03 * smooth(-0.4, 0.4, z), n=46)       # a broad barrel, a little broader in front
blobs += [
    dict(t='cap', a=(0, 1.16, 0.78), b2=(0, 1.1, 1.08), r=(0.26, 0.2), bone='neck'),               # the thick short neck
    dict(t='cap', a=(0, 0.92, 0.85), b2=(0, 0.9, 1.08), r=(0.14, 0.1), bone='neck'),               # the throat and dewlap
    dict(t='cap', a=(0, 1.3, 0.55), b2=(0, 1.32, 0.95), r=(0.2, 0.17), bone='neck'),               # the hump over the shoulders, into the neck
    dict(t='ell', c=(0, 1.12, 1.2), r=(0.24, 0.21, 0.2), bone='head'),                            # the big broad skull (round 2: bigger, the photos)
    dict(t='cap', a=(0, 1.0, 1.28), b2=(0, 0.8, 1.4), r=(0.15, 0.13), bone='head'),                # the broad short face
    dict(t='ell', c=(0, 0.8, 1.42), r=(0.18, 0.12, 0.11), bone='head'),                             # the wide muzzle (round 2: wider)
    dict(t='ell', c=(0, 0.94, 1.24), r=(0.13, 0.11, 0.12), bone='head'),                           # the jaw
    dict(t='cap', a=(0, 1.22, -0.82), b2=(0, 0.55, -0.87), r=(0.04, 0.025), bone='hips'),          # the tail
    dict(t='ell', c=(0, 0.48, -0.87), r=(0.05, 0.12, 0.05), bone='hips'),                          # its dark tuft
]
bones = [('hips', None, (0, 1.25, -0.75), (0, 1.45, 0.0)), ('chest', 'hips', (0, 1.45, 0.0), (0, 1.45, 0.75)),
         ('neck', 'chest', (0, 1.18, 0.82), (0, 1.12, 1.12)), ('head', 'neck', (0, 1.18, 1.14), (0, 0.72, 1.46))]
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', (sx * 0.17, 1.12, 0.47), (sx * 0.17, 0.45, 0.5)), ('f' + L + '2', 'f' + L, (sx * 0.17, 0.45, 0.5), (sx * 0.17, 0.0, 0.52)),
              ('h' + L, 'hips', (sx * 0.16, 1.12, -0.55), (sx * 0.16, 0.45, -0.7)), ('h' + L + '2', 'h' + L, (sx * 0.16, 0.45, -0.7), (sx * 0.16, 0.0, -0.6))]
cat_muscles(blobs, bones, sh=(0.12, 0.18, 0.13), th=(0.12, 0.2, 0.15), sh_t=0.3, th_t=0.35)
E = blob_ears(blobs, bones, base=(0.2, 1.05, 1.21), d=(1.0, -0.6, 0.18), H=0.23, w=0.1, t=0.014, tip=0.55, turn=10)   # big, drooping, under the horns (round 3: lower, so they show)

COAT, COAT2, BELLY, BLACK, HORN, BOSS = srgb('#423c39'), srgb('#302b28'), srgb('#4e3e34'), srgb('#151312'), srgb('#4e4842'), srgb('#6c665e')
def paint(P, N, tag):
    x, y, z = P
    e = ear_paint(P, N, E)
    if e: return mix(COAT2, mix(BELLY, COAT, 0.5), 0.5 * e[2])       # the ears, a little paler inside
    n = noise.noise(Vector((x * 7, y * 7, z * 7))); n2 = noise.noise(Vector((x * 45, y * 45, z * 45)))
    c = mix(COAT, COAT2, 0.4 + 0.3 * n + 0.12 * n2)
    if N.y < -0.4 and -0.6 < z < 0.6: c = mix(c, BELLY, 0.35)                                     # a brownish belly where the hair is thin
    if y < 0.5 and abs(x) > 0.08: c = mix(c, BLACK, smooth(0.5, 0.2, y) * 0.6)                    # darker lower legs
    if y < 0.05 and abs(x) > 0.08: c = mix(c, BLACK, 0.9)                                         # the hooves
    if z > 1.38 and y < 0.85: c = mix(c, BLACK, 0.7)                                              # the dark wet muzzle
    if z < -0.82 and y < 0.62: c = mix(c, BLACK, 0.85)                                            # the tail tuft
    return c

parts = []
boss = Part('boss', bone='head', color=BOSS); boss.add(*ellipsoid((0, 1.33, 1.16), (0.28, 0.08, 0.14), 14, 8)); parts.append(boss)
for sx in (1, -1):
    parts += eye_parts((sx * 0.13, 1.1, 1.26), 0.022, 'head', '#1a120c', (sx, 0.2, 0.5))
    hp = bez([(sx * 0.08, 1.34, 1.15), (sx * 0.36, 1.32, 1.1), (sx * 0.54, 1.04, 1.1), (sx * 0.6, 1.16, 1.2), (sx * 0.5, 1.3, 1.25)], 16)   # round 3: down below the eye, then up and in, tips lower
    hv, hf = tube(hp, [0.088 * (1 - i / 15) ** 0.8 + 0.01 for i in range(16)], 10)
    parts.append(Part('horn', bone='head', color=HORN).add(hv, hf))
nose = Part('nose', bone='head', color=srgb('#0e0c0c'))
for sx in (1, -1): nose.add(*ellipsoid((sx * 0.055, 0.74, 1.53), (0.02, 0.015, 0.012), 8, 5))
parts.append(nose)

names = [b[0] for b in bones]
acts = quad_actions(names, dict(amp=18, knee=44, run_amp=30, bob=0.025, drop=0.55, head_eat=25, neck_eat=30, look=15, earflick=22, tailsw=30,
                                frames=dict(walk=34, run=18, idle=160, eat=72, sleep=150)))
blobs = organic(blobs, 23)   # 1.11 (Avi): not two mirrored halves of clean parts
SPEC = dict(id='buffalo', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.011, tris=5600, smooth=14, actions=acts, lidCol='#241e1a',
            meta=dict(height=1.7, length=2.9, speeds={'walk': 1.2, 'run': 8.0}, map={'swim': 'walk', 'sit': 'sleep'}))
