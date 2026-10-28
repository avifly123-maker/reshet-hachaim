# קטה (Pterocles alchata, the pin-tailed sandgrouse) – a round, pigeon-sized ground bird: sandy back finely barred and
# spotted, an orange-yellow face, a chestnut breast band edged with thin black lines, white belly, long pointed wings and
# a long pin in the middle of the tail; short legs feathered to the toes, a small grey bill. The father soaks his belly
# feathers in water and carries it to the chicks. Origin at the feet.
derive('chukar', 'sandgrouse')   # the kit treats it as a ground bird like the partridge (feathers, legs, eyes)
LEGH = 0.06
blobs = [
    dict(t='ell', c=(0, 0.0, -0.02), r=(0.072, 0.066, 0.115), rot=(-4, 0, 0), bone='hips'),
    dict(t='ell', c=(0, 0.02, 0.05), r=(0.066, 0.064, 0.068), bone='chest'),
    dict(t='cap', a=(0, 0.045, 0.075), b2=(0, 0.075, 0.098), r=(0.038, 0.03), bone='neck'),
    dict(t='ell', c=(0, 0.086, 0.106), r=(0.031, 0.031, 0.036), bone='head'),
]
bones = [('hips', None, (0, 0.0, -0.08), (0, 0.0, 0.02)), ('chest', 'hips', (0, 0.0, 0.02), (0, 0.035, 0.075)),
         ('neck', 'chest', (0, 0.045, 0.075), (0, 0.075, 0.098)), ('head', 'neck', (0, 0.08, 0.098), (0, 0.085, 0.15)),
         ('tail', 'hips', (0, 0.012, -0.11), (0, 0.004, -0.2))]
SAND, SAND2, OLIVE, ORANGE, CHEST, BLACK, WHITE, SPOT = (srgb('#cdb07a'), srgb('#b8975e'), srgb('#9a9a6a'), srgb('#d9a456'),
                                                         srgb('#b8844e'), srgb('#1e1a14'), srgb('#f4efe4'), srgb('#5a4a32'))
def paint(P, N, tag):
    x, y, z = P; y = y - LEGH
    n = noise.noise(Vector((x * 80, y * 80, z * 80))); n2 = noise.noise(Vector((x * 260, y * 260, z * 260)))
    c = mix(SAND, SAND2, 0.35 + 0.3 * n)
    if y > 0.02 and z < 0.06: c = mix(c, OLIVE, 0.25)                                             # greenish-olive back
    c = mix(c, SPOT, smooth(0.55, 0.75, n2) * 0.55 * smooth(0.0, 0.03, y))                        # fine dark spots and bars
    if y < -0.03: c = mix(c, WHITE, smooth(-0.03, -0.05, y) * 0.9)                               # white belly
    # the breast band: chestnut, edged above and below with thin black lines
    if z > 0.03 and -0.03 < y < 0.03:
        b = y - (-0.005 + (z - 0.05) * 0.2)
        k = smooth(0.03, 0.06, z)                                                     # only on the front of the breast
        c = mix(c, CHEST, smooth(0.01, 0.006, abs(b)) * 0.75 * k)
        c = mix(c, BLACK, smooth(0.0022, 0.0008, abs(abs(b) - 0.0105)) * 0.8 * k)
    if z > 0.08:   # orange-yellow face and throat, a black throat patch, a dark line behind the eye
        c = mix(c, ORANGE, smooth(0.04, 0.06, y) * smooth(0.11, 0.095, y) * 0.85)
        if abs(x) < 0.02 and 0.04 < y < 0.062: c = mix(c, BLACK, 0.85)
        if y > 0.1: c = mix(c, mix(SAND2, OLIVE, 0.5), 0.6)
    return c
def wcol(s, c, top): return mix(mix(SAND, OLIVE, 0.3), SPOT, 0.15 + 0.3 * s) if top else mix(SAND, WHITE, 0.4)
def tcol(t, u, top): return mix(SAND2, BLACK, smooth(0.7, 1.0, t) * 0.5)

parts = []
for sx, L in ((1, 'l'), (-1, 'r')):
    wp, wb = wing_part(L, sx, (sx * 0.045, 0.03, 0.05), 0.2, 0.08, wcol, sweep=0.05, thick=0.012, tip=0.45); parts.append(wp); bones += wb
    parts += eye_parts((sx * 0.026, 0.094, 0.12), 0.0072, 'head', '#1a1208', (sx, 0.2, 0.6))
lp, lb = bird_legs((0.024, -0.04, 0.0), (0.026, -LEGH, 0.008), 0.018, srgb('#d8c8a8'), 0.0075); parts += lp; bones += lb
parts.append(beak_part((0, 0.083, 0.138), 0.014, 0.008, 0.008, srgb('#8a8a8a'), srgb('#6a6a6a'), curve=0.15))
parts.append(tail_fan((0, 0.012, -0.11), 0.06, 0.03, 0.04, tcol))
pin = Part('pin', bone='tail', color=SAND2); pin.add(*tube([(0, 0.01, -0.15), (0, 0.006, -0.2), (0, 0.004, -0.235)], [0.004, 0.003, 0.0008], 5)); parts.append(pin)
bones = lift(LEGH, blobs, bones, parts)

names = [b[0] for b in bones]
acts = bird_actions(names, dict(legH=0.0, raise_ground=False, hop=False, perch_pitch=-4, flap=55, flap_frames=8, bob=0.8, peck=55,
                                frames=dict(perch=None, glide=None)))
acts = {k: v for k, v in acts.items() if v[0]}
fr, fn = acts['walk']
acts['run'] = (12, fn)
SPEC = dict(id='sandgrouse', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.003, tris=1800, smooth=10, actions=acts,
            meta=dict(height=0.22, length=0.5, speeds={'walk': 0.45, 'run': 1.6, 'fly': 9}, map={'swim': 'walk', 'sit': 'sleep', 'perch': 'idle'}))
