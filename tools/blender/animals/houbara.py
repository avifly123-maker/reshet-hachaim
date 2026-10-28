# חוברה (Chlamydotis undulata macqueenii) – modelled on its own: a sandy ground bird the size of a small turkey, on long
# strong legs, with a long slender neck, a small head with a short crest, and on the sides of the neck a ruff of long
# black and white plumes. Sandy back finely marked with dark wavy lines, white belly, grey-blue neck front. It prefers
# to walk, and freezes when it is seen.
derive('chukar', 'houbara')   # the kit treats it as a ground bird (feathers, legs, eyes); its shape is its own
LEGH = 0.24
blobs = [
    dict(t='ell', c=(0, 0.0, -0.03), r=(0.1, 0.1, 0.17), rot=(-8, 0, 0), bone='hips'),
    dict(t='ell', c=(0, 0.04, 0.08), r=(0.085, 0.095, 0.09), bone='chest'),
    dict(t='cap', a=(0, 0.08, 0.12), b2=(0, 0.25, 0.16), r=(0.045, 0.028), bone='neck'),         # the long neck
    dict(t='ell', c=(0, 0.27, 0.18), r=(0.03, 0.03, 0.04), bone='head'),
    dict(t='ell', c=(0, 0.3, 0.165), r=(0.012, 0.018, 0.02), bone='head'),                        # the short crest
]
bones = [('hips', None, (0, 0.0, -0.13), (0, 0.0, 0.03)), ('chest', 'hips', (0, 0.0, 0.03), (0, 0.06, 0.11)),
         ('neck', 'chest', (0, 0.08, 0.12), (0, 0.25, 0.16)), ('head', 'neck', (0, 0.26, 0.16), (0, 0.265, 0.23)),
         ('tail', 'hips', (0, 0.02, -0.18), (0, 0.0, -0.28))]
SAND, SAND2, WAVE, WHITE, BLUE, BLACK = srgb('#d2b480'), srgb('#bb9a62'), srgb('#5a4630'), srgb('#f4efe4'), srgb('#a8aeb0'), srgb('#1a1612')
def paint(P, N, tag):
    x, y, z = P; y = y - LEGH
    n = noise.noise(Vector((x * 60, y * 60, z * 60)))
    c = mix(SAND, SAND2, 0.35 + 0.3 * n)
    c = mix(c, WAVE, smooth(0.86, 0.97, math.sin(z * 180 + noise.noise(Vector((x * 20, y * 20, z * 20))) * 4)) * 0.45 * smooth(-0.02, 0.04, y))
    if y < -0.04: c = mix(c, WHITE, smooth(-0.04, -0.07, y) * 0.95)                             # white belly
    if 0.08 < y < 0.25:
        if z > 0.13 + (y - 0.08) * 0.2 and abs(x) < 0.025: c = mix(c, BLUE, 0.7)                 # grey-blue front of the neck
        if abs(x) > 0.02 and 0.09 < y < 0.2:                                                     # the black and white ruff
            s = math.sin(y * 120)
            c = mix(c, BLACK if s > 0 else WHITE, 0.85 * smooth(0.02, 0.032, abs(x)))
    if y > 0.29: c = mix(c, mix(WHITE, BLACK, 0.3), 0.5)                                         # the crest
    return c
def wcol(s, c, top): return mix(SAND, WAVE, 0.15 + 0.25 * s) if top else WHITE
def tcol(t, u, top): return mix(SAND2, WAVE, 0.4 if math.sin(t * 24) > 0.4 else 0.1) if top else WHITE
parts = []
for sx, L in ((1, 'l'), (-1, 'r')):
    wp, wb = wing_part(L, sx, (sx * 0.065, 0.05, 0.07), 0.32, 0.15, wcol, sweep=0.03, thick=0.018, tip=0.7); parts.append(wp); bones += wb
    parts += eye_parts((sx * 0.022, 0.278, 0.2), 0.0085, 'head', '#d8b040', (sx, 0.2, 0.6))
lp, lb = bird_legs((0.035, -0.07, 0.0), (0.04, -LEGH, 0.01), 0.04, srgb('#c8b890'), 0.011); parts += lp; bones += lb
parts.append(beak_part((0, 0.27, 0.215), 0.026, 0.008, 0.008, srgb('#5a5450'), srgb('#3a3632'), curve=0.1))
parts.append(tail_fan((0, 0.02, -0.18), 0.1, 0.06, 0.1, tcol))
bones = lift(LEGH, blobs, bones, parts)
names = [b[0] for b in bones]
acts = bird_actions(names, dict(legH=0.0, raise_ground=False, hop=False, perch_pitch=-4, flap=50, flap_frames=12, bob=1.2, peck=50,
                                frames=dict(perch=None, glide=None)))
acts = {k: v for k, v in acts.items() if v[0]}
fr, fn = acts['walk']
acts['run'] = (14, fn)
SPEC = dict(id='houbara', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.004, tris=2200, smooth=10, actions=acts,
            meta=dict(height=0.6, length=0.7, speeds={'walk': 0.6, 'run': 3.0, 'fly': 9}, map={'swim': 'walk', 'sit': 'sleep', 'perch': 'idle'}))
