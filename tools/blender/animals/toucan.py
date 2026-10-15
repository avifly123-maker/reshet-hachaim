# טוקן (Ramphastos toco) – black body, white throat, red under the tail, blue skin around the eye, a huge orange bill
# with a black tip and a black line at its base.
LEGH = 0.13
blobs = [
    dict(t='ell', c=(0, 0.0, -0.02), r=(0.07, 0.078, 0.12), rot=(-20, 0, 0), bone='hips'),
    dict(t='ell', c=(0, 0.03, 0.06), r=(0.065, 0.072, 0.07), bone='chest'),
    dict(t='cap', a=(0, 0.06, 0.08), b2=(0, 0.09, 0.105), r=(0.048, 0.042), bone='neck'),
    dict(t='ell', c=(0, 0.105, 0.12), r=(0.045, 0.046, 0.05), bone='head'),
]
bones = [('hips', None, (0, 0.0, -0.1), (0, 0.0, 0.03)), ('chest', 'hips', (0, 0.0, 0.03), (0, 0.05, 0.08)),
         ('neck', 'chest', (0, 0.06, 0.08), (0, 0.095, 0.105)), ('head', 'neck', (0, 0.1, 0.105), (0, 0.1, 0.17)),
         ('tail', 'hips', (0, 0.01, -0.12), (0, -0.01, -0.28))]
BLACK, BLACK2, WHITE, RED, BLUE, ORANGE, ORANGE2 = srgb('#121212'), srgb('#232326'), srgb('#f5f1e4'), srgb('#d8221e'), srgb('#4aa8e8'), srgb('#ff8a14'), srgb('#ffb030')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 80, y * 80, z * 80)))
    c = mix(BLACK, BLACK2, 0.3 + 0.3 * n)
    # white throat bib, fading to cream at the edge
    if z > 0.06 and 0.03 < y < 0.11 and N.z > 0.0:
        c = mix(c, WHITE, smooth(0.06, 0.09, z) * smooth(0.035, 0.05, y) * smooth(0.115, 0.1, y))
    if z < -0.08 and y < -0.02: c = mix(c, RED, smooth(-0.08, -0.11, z) * 0.95)        # red undertail
    # blue bare skin around the eye
    d = math.hypot(abs(x) - 0.03, y - 0.112, z - 0.135)
    if z > 0.1: c = mix(c, BLUE, smooth(0.024, 0.016, d))
    return c
def wcol(s, c, top): return mix(BLACK, BLACK2, 0.4 * s)
def tcol(t, u, top): return BLACK

parts = []
for sx, L in ((1, 'l'), (-1, 'r')):
    wp, wb = wing_part(L, sx, (sx * 0.05, 0.045, 0.06), 0.22, 0.12, wcol, sweep=0.02, thick=0.016, tip=0.6); parts.append(wp); bones += wb
    parts += eye_parts((sx * 0.032, 0.112, 0.138), 0.009, 'head', '#1a2a10', (sx, 0.2, 0.5))
lp, lb = bird_legs((0.03, -0.05, 0.01), (0.034, -LEGH, 0.02), 0.035, srgb('#4a6aa8'), 0.007); parts += lp; bones += lb
# the bill: deep and long, upper mandible orange with a black tip, a thin black line at the base
bill = beak_part((0, 0.1, 0.16), 0.2, 0.024, 0.04, ORANGE, srgb('#1a1410'), curve=0.12, seg=10, rows=10)
bill.c = [mix(c, ORANGE2, 0.4) if i < 40 else c for i, c in enumerate(bill.c)]
bill.c = [srgb('#141010') if i < 10 else c for i, c in enumerate(bill.c)]
parts.append(bill)
parts.append(tail_fan((0, 0.012, -0.12), 0.18, 0.04, 0.07, tcol))

names = [b[0] for b in bones]
acts = bird_actions(names, dict(legH=LEGH, hop=True, perch_pitch=-22, flap=50, flap_frames=14, peck=35))
SPEC = dict(id='toucan', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.0035, tris=1900, smooth=10, actions=acts,
            meta=dict(height=0.32, length=0.8, speeds={'walk': 0.3, 'fly': 6}, gripY={'perch': -LEGH}, perchOffset=LEGH,
                      map={'hover': 'fly', 'run': 'walk', 'climb': 'perch'}))
