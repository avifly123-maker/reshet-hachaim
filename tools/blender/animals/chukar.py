# חוגלת סלעים (Alectoris chukar) – plump grey-buff partridge, red beak and legs, black band through the eye and around the
# white throat, flanks barred black / white / chestnut. A ground bird: walks and runs; origin at the feet.
LEGH = 0.11
blobs = [
    dict(t='ell', c=(0, 0.0, -0.015), r=(0.07, 0.072, 0.11), rot=(-6, 0, 0), bone='hips'),
    dict(t='ell', c=(0, 0.025, 0.05), r=(0.064, 0.068, 0.065), bone='chest'),
    dict(t='cap', a=(0, 0.05, 0.07), b2=(0, 0.085, 0.095), r=(0.04, 0.032), bone='neck'),
    dict(t='ell', c=(0, 0.095, 0.105), r=(0.034, 0.034, 0.04), bone='head'),
]
bones = [('hips', None, (0, 0.0, -0.08), (0, 0.0, 0.02)), ('chest', 'hips', (0, 0.0, 0.02), (0, 0.04, 0.07)),
         ('neck', 'chest', (0, 0.05, 0.07), (0, 0.085, 0.095)), ('head', 'neck', (0, 0.09, 0.095), (0, 0.095, 0.155)),
         ('tail', 'hips', (0, 0.01, -0.105), (0, 0.0, -0.17))]
GREY, BUFF, WHITE, BLACK, CHEST, RED, CREAM = srgb('#a8957c'), srgb('#d4b184'), srgb('#f1ece2'), srgb('#141210'), srgb('#9ea3a8'), srgb('#d8322a'), srgb('#efe3c8')
def paint(P, N, tag):
    x, y, z = P; y = y - LEGH
    n = noise.noise(Vector((x * 70, y * 70, z * 70)))
    c = mix(GREY, srgb('#8f7d68'), 0.3 + 0.3 * n)
    if z > 0.02 and y < 0.07: c = mix(c, CHEST, 0.7)
    if y < -0.035: c = mix(c, BUFF, smooth(-0.035, -0.06, y))
    # flank bars: black–white–chestnut stripes on the sides
    if abs(x) > 0.04 and -0.07 < z < 0.04 and -0.035 < y < 0.035:
        k = math.sin(z * 130)
        c = mix(c, BLACK if k > 0.55 else (srgb('#8a4a26') if k > 0.0 else CREAM), 0.9 * smooth(0.04, 0.055, abs(x)))
    if z > 0.07:
        r = math.hypot((y - 0.072) / 0.03, (z - 0.105) / 0.032)
        if r < 0.85 and abs(x) < 0.04: c = mix(c, CREAM, 0.9)                                   # pale throat
        if 0.85 <= r < 1.15 and y < 0.09: c = mix(c, BLACK, 0.95)                                # black necklace
        if abs(y - 0.1) < 0.0055 and 0.085 < z < 0.14: c = mix(c, BLACK, 0.95)                  # band through the eye
        if y > 0.112: c = mix(c, srgb('#8f8478'), 0.5)
    return c
def wcol(s, c, top): return mix(GREY, srgb('#8a7c6c'), 0.3 + 0.4 * s) if top else mix(GREY, BUFF, 0.5)
def tcol(t, u, top): return mix(srgb('#9a6a42'), GREY, 0.4)

parts = []
for sx, L in ((1, 'l'), (-1, 'r')):
    wp, wb = wing_part(L, sx, (sx * 0.045, 0.035, 0.05), 0.17, 0.1, wcol, sweep=0.02, thick=0.014, tip=0.7); parts.append(wp); bones += wb
    ring = Part('ring', bone='head', color=RED); ring.add(*ellipsoid((sx * 0.027, 0.103, 0.118), (0.004, 0.011, 0.011), 8, 5, rot=(0, sx * 30, 0))); parts.append(ring)
    parts += eye_parts((sx * 0.029, 0.103, 0.119), 0.0075, 'head', '#2a1a0a', (sx, 0.2, 0.6))
lp, lb = bird_legs((0.026, -0.045, 0.0), (0.03, -LEGH, 0.01), 0.032, RED, 0.0055); parts += lp; bones += lb
parts.append(beak_part((0, 0.092, 0.14), 0.026, 0.011, 0.011, RED, srgb('#b8221c'), curve=0.18))
parts.append(tail_fan((0, 0.01, -0.105), 0.06, 0.04, 0.06, tcol))
bones = lift(LEGH, blobs, bones, parts)

names = [b[0] for b in bones]
acts = bird_actions(names, dict(legH=0.0, raise_ground=False, hop=False, perch_pitch=-4, flap=60, flap_frames=10, bob=1.0, peck=60,
                                frames=dict(perch=None, glide=None)))
acts = {k: v for k, v in acts.items() if v[0]}
fr, fn = acts['walk']
acts['run'] = (12, fn)
SPEC = dict(id='chukar', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.003, tris=1700, smooth=10, actions=acts,
            meta=dict(height=0.27, length=0.48, speeds={'walk': 0.5, 'run': 1.8, 'fly': 6}, map={'swim': 'walk', 'sit': 'sleep', 'perch': 'idle'}))
