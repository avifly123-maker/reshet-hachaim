import math
# אורג (Ploceus cucullatus, village weaver, male) – savanna, from the blackbird's bird build (blackbird.py) at the weaver's
# size and stockier: a bright yellow body, a black mask over the face and the throat, a chestnut tinge on the nape, a red
# eye, a thick black cone of a beak for seeds, yellow-green wings with dark feather centres, a short olive tail.
LEGH = 0.075   # 1.11 round 2: shorter legs, a slimmer body (Avi's review of the first run)
blobs = [
    dict(t='ell', c=(0, 0.004, -0.02), r=(0.047, 0.05, 0.085), rot=(-12, 0, 0), bone='hips'),   # round 3: slimmer
    dict(t='ell', c=(0, 0.022, 0.045), r=(0.05, 0.055, 0.058), bone='chest'),
    dict(t='cap', a=(0, 0.045, 0.06), b2=(0, 0.078, 0.088), r=(0.036, 0.03), bone='neck'),
    dict(t='ell', c=(0, 0.088, 0.1), r=(0.034, 0.033, 0.04), bone='head'),
]
bones = [('hips', None, (0, 0.0, -0.08), (0, 0.0, 0.02)), ('chest', 'hips', (0, 0.0, 0.02), (0, 0.04, 0.065)),
         ('neck', 'chest', (0, 0.045, 0.065), (0, 0.078, 0.09)), ('head', 'neck', (0, 0.084, 0.09), (0, 0.088, 0.15)),
         ('tail', 'hips', (0, 0.0, -0.1), (0, -0.01, -0.21))]
YEL, YEL2, MASK, CHEST, WING, WDARK, OLIVE = srgb('#f2c81e'), srgb('#e2b414'), srgb('#1a1612'), srgb('#a8642a'), srgb('#c2b032'), srgb('#2e2a16'), srgb('#7a7230')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 90, y * 90, z * 90)))
    c = mix(YEL, YEL2, 0.3 + 0.4 * n)
    if z > 0.06 and y > 0.04: c = mix(c, CHEST, smooth(0.03, 0.0, abs(z - 0.075)) * smooth(0.06, 0.09, y) * 0.5)   # chestnut nape
    if (z > 0.1 and y < 0.104) or (z > 0.07 and 0.03 < y < 0.08 and N.z > 0.3): c = mix(c, MASK, 0.92)   # the black mask and throat, the crown stays yellow
    # the folded wings are real volume now (the kit's bird fold, coloured by wcol), not painted on the side
    return c
def wcol(s, c, top): return mix(WDARK, WING, min(0.85, 0.08 + 0.8 * max(0.0, math.sin(s * 44)) ** 4 + 0.25 * c))   # 6.11: both faces dark feathers edged in yellow-green (the folded wing shows its underside)   # round 8: dark feathers, each edged in yellow-green (the weight stays under 1)
def tcol(t, u, top): return mix(OLIVE, WDARK, 0.35 + 0.4 * t)

parts = [];
for sx, L in ((1, 'l'), (-1, 'r')):
    # 2.11 (Avi: "the weaver has no wings"): the wing was built but never added, its append had fallen into the comment.
    # Round 5: the wings folded along the body, dark feathers edged in yellow-green, the long flight feathers over the tail
    wp, wb = wing_part(L, sx, (sx * 0.048, 0.034, 0.045), 0.175, 0.08, wcol, sweep=0.03, thick=0.012, rows=14, cols=6)   # round 7: folded closer, the tip not over the back
    parts.append(wp); bones += wb
    parts += eye_parts((sx * 0.029, 0.096, 0.113), 0.0058, 'head', '#8a1a10', (sx, 0.2, 0.6))
lp, lb = bird_legs((0.022, -0.04, 0.0), (0.026, -LEGH, 0.008), 0.032, srgb('#3a2c22'), 0.0045); parts += lp; bones += lb
parts.append(beak_part((0, 0.086, 0.126), 0.034, 0.014, 0.013, srgb('#141210'), srgb('#2a2622'), curve=0.04))   # a thick seed-cracking cone
parts.append(tail_fan((0, 0.004, -0.1), 0.066, 0.05, 0.072, tcol, droop=0.012, notch=0.15))   # 6.11: a short, broad weaver's tail, not a stick

blobs = organic(blobs, 31, 0.5)   # 1.11 (Avi): not mirrored clean parts
names = [b[0] for b in bones]
acts = bird_actions(names, dict(legH=LEGH, hop=True, perch_pitch=-14, flap=55, flap_frames=10))
SPEC = dict(id='weaver', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.0028, tris=1600, smooth=10, actions=acts,
            meta=dict(height=0.3, length=0.45, scale=0.65, speeds={'walk': 0.6, 'fly': 6}, gripY={'perch': -LEGH}, perchOffset=LEGH,
                      map={'hover': 'fly', 'run': 'walk', 'climb': 'perch'}))
