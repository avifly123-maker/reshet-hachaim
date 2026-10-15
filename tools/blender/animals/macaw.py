# תוכי ארה (Ara macao) – scarlet body, wings red then yellow then blue, a long red tail tipped blue, bare white face,
# a big hooked bill (pale above, black below).
LEGH = 0.12
blobs = [
    dict(t='ell', c=(0, 0.0, -0.02), r=(0.07, 0.075, 0.13), rot=(-25, 0, 0), bone='hips'),
    dict(t='ell', c=(0, 0.035, 0.06), r=(0.064, 0.07, 0.07), bone='chest'),
    dict(t='cap', a=(0, 0.065, 0.08), b2=(0, 0.1, 0.1), r=(0.048, 0.044), bone='neck'),
    dict(t='ell', c=(0, 0.115, 0.12), r=(0.05, 0.05, 0.055), bone='head'),
]
bones = [('hips', None, (0, 0.0, -0.1), (0, 0.0, 0.03)), ('chest', 'hips', (0, 0.0, 0.03), (0, 0.05, 0.08)),
         ('neck', 'chest', (0, 0.065, 0.08), (0, 0.1, 0.1)), ('head', 'neck', (0, 0.105, 0.1), (0, 0.11, 0.18)),
         ('tail', 'hips', (0, 0.0, -0.13), (0, -0.03, -0.45))]
RED, RED2, YEL, BLUE, BLUE2, WHITE = srgb('#e01818'), srgb('#b80e14'), srgb('#ffcf1a'), srgb('#1f5fd0'), srgb('#4aa0f0'), srgb('#f6f1ea')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 80, y * 80, z * 80)))
    c = mix(RED, RED2, 0.3 + 0.3 * n)
    if z < -0.1 and y > 0.0: c = mix(c, BLUE2, smooth(-0.1, -0.13, z) * 0.8)          # light blue rump
    if z > 0.12 and abs(x) > 0.02 and 0.09 < y < 0.13: c = mix(c, WHITE, smooth(0.12, 0.135, z) * 0.95)   # bare white face
    return c
def wcol(s, c, top):
    if not top: return mix(RED2, srgb('#5a1010'), 0.3)
    if s < 0.32 and c < 0.55: return RED
    if s < 0.42 and c < 0.7: return YEL if s > 0.18 or c > 0.3 else RED
    return mix(BLUE, BLUE2, 0.3 * c)
def tcol(t, u, top): return mix(RED, BLUE, smooth(0.55, 0.85, t))

parts = []
for sx, L in ((1, 'l'), (-1, 'r')):
    wp, wb = wing_part(L, sx, (sx * 0.05, 0.045, 0.06), 0.3, 0.13, wcol, sweep=0.04, thick=0.016, tip=0.55, cols=7, rows=14); parts.append(wp); bones += wb
    parts += eye_parts((sx * 0.036, 0.125, 0.15), 0.008, 'head', '#d8c050', (sx, 0.2, 0.5))
lp, lb = bird_legs((0.03, -0.05, 0.01), (0.034, -LEGH, 0.02), 0.035, srgb('#5a5a5a'), 0.008); parts += lp; bones += lb
parts.append(beak_part((0, 0.118, 0.165), 0.06, 0.02, 0.03, srgb('#efe6d4'), srgb('#1e1a18'), curve=0.75, seg=8, rows=7))
lowerb = beak_part((0, 0.092, 0.158), 0.035, 0.018, 0.016, srgb('#1e1a18'), srgb('#141210'), curve=-0.2, seg=6, rows=4); parts.append(lowerb)
parts.append(tail_fan((0, 0.004, -0.13), 0.36, 0.05, 0.03, tcol, rows=8, cols=4, droop=0.05))

names = [b[0] for b in bones]
acts = bird_actions(names, dict(legH=LEGH, hop=False, perch_pitch=-28, flap=50, flap_frames=16, peck=40))
SPEC = dict(id='macaw', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.0035, tris=1900, smooth=10, actions=acts,
            meta=dict(height=0.36, length=1.0, speeds={'walk': 0.3, 'fly': 8}, gripY={'perch': -LEGH}, perchOffset=LEGH,
                      map={'hover': 'fly', 'run': 'walk', 'climb': 'walk'}))
