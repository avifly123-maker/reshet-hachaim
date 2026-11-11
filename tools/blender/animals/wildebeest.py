# גנו (Connochaetes taurinus, blue wildebeest) – savanna, kit v6, traced from a side photo (Commons, a walking wildebeest,
# refs/README.md "w0", 31.10.2026): the photo's withers (173 px) are 1.35 m, so 1 px = 7.8 mm; z = (px - 190) × 7.8 mm
# forward, y = (268 - py) × 7.8 mm up. High heavy shoulders and a back that slopes down to thin hindquarters, a deep
# chest, a thick neck with a black upright mane, a long heavy head carried low, a broad flat muzzle, cow-like horns that
# curve out and up, a black beard under the throat, slender legs, a long black horse-like tail. Slate grey-brown coat
# with darker bands on the shoulders and the neck.
own('wildebeest')
ANAT['wildebeest'] = ('ungulate', dict(arm=0.1, fa0=0.075, fa1=0.045, wr=0.05, can=0.034, fet=0.042, gas0=0.085, gas1=0.045, hock=0.05, mt=0.034,
                                     th=(0.06, 0.4, 0.1)))
EYE['wildebeest'] = ('#1e140e', 'round', 0.82, 0.5)
PX = 0.0078
def ph(x, y): return ((x - 190) * PX, (268 - y) * PX)
TRUNK = []
for x, t, b in ((285, 110, 175), (265, 96, 185), (240, 98, 190), (210, 104, 188), (180, 108, 185), (150, 110, 178), (130, 112, 168),
                (118, 118, 155), (112, 130, 145)):
    z, top = ph(x, t); _, bot = ph(x, b); TRUNK.append((z, top, bot))
blobs = trunk_from_profile(TRUNK, lambda z: 0.2 + 0.04 * smooth(-0.3, 0.5, z))       # broad in front, narrow behind
blobs += [
    dict(t='cap', a=(0, 1.07, 0.74), b2=(0, 1.04, 1.06), r=(0.19, 0.13), bone='neck'),             # the thick neck
    dict(t='cap', a=(0, 0.88, 0.8), b2=(0, 0.92, 1.06), r=(0.12, 0.09), bone='neck'),              # its throat
    dict(t='cap', a=(0, 1.3, 0.62), b2=(0, 1.2, 1.06), r=(0.035, 0.03), bone='neck'),              # the upright mane
    dict(t='ell', c=(0, 1.08, 1.12), r=(0.1, 0.11, 0.11), bone='head'),                            # the skull
    dict(t='cap', a=(0, 1.0, 1.17), b2=(0, 0.75, 1.31), r=(0.092, 0.078), bone='head'),            # the face (2.11, Avi: too long: about 20% shorter, broader)
    dict(t='ell', c=(0, 0.74, 1.33), r=(0.095, 0.078, 0.072), bone='head'),                        # the broad flat muzzle
    dict(t='ell', c=(0, 0.9, 1.15), r=(0.075, 0.09, 0.09), bone='head'),                           # the jaw
    dict(t='cap', a=(0, 1.0, -0.55), b2=(0, 0.55, -0.62), r=(0.035, 0.025), bone='hips'),          # the tail
    dict(t='ell', c=(0, 0.45, -0.63), r=(0.05, 0.14, 0.05), bone='hips'),                          # its long black hair
]
bones = [('hips', None, (0, 1.05, -0.55), (0, 1.2, 0.0)), ('chest', 'hips', (0, 1.2, 0.0), (0, 1.25, 0.6)),
         ('neck', 'chest', (0, 1.07, 0.7), (0, 1.06, 1.05)), ('head', 'neck', (0, 1.12, 1.08), (0, 0.72, 1.33))]
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', (sx * 0.13, 1.0, 0.55), (sx * 0.13, 0.38, 0.6)), ('f' + L + '2', 'f' + L, (sx * 0.13, 0.38, 0.6), (sx * 0.13, 0.0, 0.62)),
              ('h' + L, 'hips', (sx * 0.12, 1.05, -0.45), (sx * 0.12, 0.42, -0.6)), ('h' + L + '2', 'h' + L, (sx * 0.12, 0.42, -0.6), (sx * 0.12, 0.0, -0.48))]
cat_muscles(blobs, bones, sh=(0.1, 0.16, 0.11), th=(0.1, 0.18, 0.13), sh_t=0.3, th_t=0.4)
E = blob_ears(blobs, bones, base=(0.08, 1.15, 1.06), d=(1.0, 0.25, -0.35), H=0.11, w=0.035, t=0.01, tip=0.6, turn=15)

COAT, COAT2, BAND, BLACK, HORN = srgb('#706b66'), srgb('#5f5a55'), srgb('#3e3935'), srgb('#1e1a18'), srgb('#3a3632')   # 2.11 (Avi: too dark): the blue wildebeest's slate grey
def paint(P, N, tag):
    x, y, z = P
    e = ear_paint(P, N, E)
    if e: return mix(COAT2, BLACK, 0.3 + 0.4 * e[2])
    n = noise.noise(Vector((x * 8, y * 8, z * 8))); n2 = noise.noise(Vector((x * 40, y * 40, z * 40)))
    c = mix(COAT, COAT2, 0.4 + 0.3 * n + 0.1 * n2)
    band = smooth(-0.2, 0.3, z) * smooth(0.6, 0.85, y)                                          # darker brindled bands on the front half
    c = mix(c, BAND, band * smooth(0.0, 0.5, math.sin(z * 26 + n * 2)) * 0.6)
    if 0.62 < z < 1.08 and abs(x) < 0.05 and y > 1.15: c = mix(c, BLACK, 0.85)                   # the black mane
    if 0.78 < z < 1.12 and y < 0.95 and abs(x) < 0.09 and N.y < 0.2: c = mix(c, BLACK, 0.7)      # the black beard under the throat
    if z > 1.12: c = mix(c, BLACK, 0.6 * smooth(1.12, 1.24, z))                                   # the dark face
    if y < 0.5 and abs(x) > 0.06: c = mix(c, mix(COAT2, BLACK, 0.4), smooth(0.5, 0.3, y))         # darker lower legs
    if y < 0.05 and abs(x) > 0.06: c = mix(c, BLACK, 0.9)                                         # the hooves
    if z < -0.56 and abs(x) < 0.07 and y < 1.02: c = mix(c, BLACK, 0.85)                          # the tail (round 2: only the tail, not the rump)
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.085, 1.1, 1.18), 0.02, 'head', '#1e140e', (sx, 0.2, 0.5))
    hp = bez([(sx * 0.06, 1.18, 1.1), (sx * 0.17, 1.17, 1.08), (sx * 0.24, 1.23, 1.11), (sx * 0.22, 1.33, 1.13)], 10)
    hv, hf = tube(hp, [0.04 * (1 - i / 9) ** 0.6 + 0.008 for i in range(10)], 8)
    parts.append(Part('horn', bone='head', color=HORN).add(hv, hf))
nose = Part('nose', bone='head', color=srgb('#121010'))
for sx in (1, -1): nose.add(*ellipsoid((sx * 0.047, 0.73, 1.39), (0.016, 0.012, 0.012), 8, 5))
parts.append(nose)

names = [b[0] for b in bones]
acts = quad_actions(names, dict(amp=22, knee=50, run_amp=38, bob=0.03, drop=0.5, head_eat=30, neck_eat=35, look=18, earflick=20, tailsw=34,
                                frames=dict(walk=32, run=16, idle=150, eat=70, sleep=140)))
SPEC = dict(id='wildebeest', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.011, tris=4800, smooth=10, actions=acts, lidCol='#2a2420',
            meta=dict(height=1.5, length=2.2, speeds={'walk': 1.3, 'run': 9.0}, map={'swim': 'walk', 'sit': 'sleep'}))
