# שחרור (Turdus merula, male) – glossy black, orange-yellow beak and eye-ring, long tail; hops on the ground.
LEGH = 0.15
blobs = [
    dict(t='ell', c=(0, 0.0, -0.02), r=(0.058, 0.062, 0.105), rot=(-18, 0, 0), bone='hips'),
    dict(t='ell', c=(0, 0.022, 0.045), r=(0.054, 0.058, 0.06), bone='chest'),
    dict(t='cap', a=(0, 0.045, 0.06), b2=(0, 0.078, 0.088), r=(0.036, 0.03), bone='neck'),
    dict(t='ell', c=(0, 0.088, 0.1), r=(0.034, 0.033, 0.04), bone='head'),
]
bones = [('hips', None, (0, 0.0, -0.08), (0, 0.0, 0.02)), ('chest', 'hips', (0, 0.0, 0.02), (0, 0.04, 0.065)),
         ('neck', 'chest', (0, 0.045, 0.065), (0, 0.078, 0.09)), ('head', 'neck', (0, 0.084, 0.09), (0, 0.088, 0.15)),
         ('tail', 'hips', (0, 0.0, -0.1), (0, -0.01, -0.21))]
BLACK, BLACK2, BROWN, ORANGE = srgb('#141210'), srgb('#24201c'), srgb('#2e2620'), srgb('#ff9a00')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 90, y * 90, z * 90)))
    return mix(BLACK, BLACK2, 0.4 + 0.4 * n)
def wcol(s, c, top): return mix(BLACK2, BROWN, 0.5 * s * c) if top else mix(BLACK, BLACK2, 0.5)
def tcol(t, u, top): return mix(BLACK, BLACK2, 0.4 * t)

parts = [];
for sx, L in ((1, 'l'), (-1, 'r')):
    wp, wb = wing_part(L, sx, (sx * 0.035, 0.035, 0.045), 0.18, 0.085, wcol, sweep=0.035, thick=0.012); parts.append(wp); bones += wb
    ring = Part('ring', bone='head', color=ORANGE); ring.add(*ellipsoid((sx * 0.027, 0.096, 0.112), (0.004, 0.0105, 0.0105), 8, 5, rot=(0, sx * 30, 0))); parts.append(ring)
    parts += eye_parts((sx * 0.029, 0.096, 0.113), 0.0075, 'head', '#060504', (sx, 0.2, 0.6))
lp, lb = bird_legs((0.022, -0.04, 0.0), (0.026, -LEGH, 0.008), 0.032, srgb('#3a2c22'), 0.0045); parts += lp; bones += lb
parts.append(beak_part((0, 0.087, 0.128), 0.04, 0.0095, 0.009, ORANGE, srgb('#f7c040'), curve=0.06))
parts.append(tail_fan((0, 0.004, -0.1), 0.13, 0.03, 0.06, tcol, droop=0.01))

names = [b[0] for b in bones]
acts = bird_actions(names, dict(legH=LEGH, hop=True, perch_pitch=-14, flap=55, flap_frames=10))
SPEC = dict(id='blackbird', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.0028, tris=1600, smooth=10, actions=acts,
            meta=dict(height=0.3, length=0.45, speeds={'walk': 0.6, 'fly': 6}, gripY={'perch': -LEGH}, perchOffset=LEGH,
                      map={'hover': 'fly', 'run': 'walk', 'climb': 'perch'}))
