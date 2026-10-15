# עורבני (Garrulus glandarius) – pinkish-buff body, white rump, black tail, black-and-white wings with a blue barred patch,
# black moustache stripe, pale streaked crown (raised a little when alert).
LEGH = 0.16
blobs = [
    dict(t='ell', c=(0, 0.0, -0.02), r=(0.062, 0.066, 0.11), rot=(-15, 0, 0), bone='hips'),
    dict(t='ell', c=(0, 0.024, 0.048), r=(0.058, 0.062, 0.062), bone='chest'),
    dict(t='cap', a=(0, 0.05, 0.062), b2=(0, 0.082, 0.09), r=(0.04, 0.034), bone='neck'),
    dict(t='ell', c=(0, 0.094, 0.1), r=(0.038, 0.037, 0.044), bone='head'),
    dict(t='ell', c=(0, 0.118, 0.09), r=(0.02, 0.014, 0.03), rot=(20, 0, 0), bone='crest'),
]
bones = [('hips', None, (0, 0.0, -0.08), (0, 0.0, 0.02)), ('chest', 'hips', (0, 0.0, 0.02), (0, 0.04, 0.065)),
         ('neck', 'chest', (0, 0.048, 0.065), (0, 0.082, 0.09)), ('head', 'neck', (0, 0.088, 0.09), (0, 0.092, 0.155)),
         ('crest', 'head', (0, 0.115, 0.1), (0, 0.13, 0.06)), ('tail', 'hips', (0, 0.0, -0.1), (0, -0.01, -0.22))]
BUFF, PINK, WHITE, BLACK, BLUE, BLUE2, GREY = srgb('#c59a86'), srgb('#d6a99a'), srgb('#f4f0ea'), srgb('#121214'), srgb('#3f7fd8'), srgb('#0e1f5a'), srgb('#9a8a86')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 80, y * 80, z * 80)))
    c = mix(BUFF, PINK, 0.4 + 0.3 * n)
    if z < -0.07 and y > -0.02: c = mix(c, WHITE, smooth(-0.07, -0.1, z))          # white rump
    if y < -0.04: c = mix(c, mix(PINK, WHITE, 0.4), 0.5)
    if z > 0.07:
        if y > 0.1: c = mix(mix(WHITE, BLACK, 0.5 + 0.5 * math.sin(x * 400)), GREY, 0.4)   # streaked crown
        c = mix(c, WHITE, 0.8 * math.exp(-((x / 0.016) ** 2 + ((y - 0.07) / 0.014) ** 2 + ((z - 0.115) / 0.02) ** 2)))   # pale throat
        m = math.exp(-(((abs(x) - 0.026) / 0.012) ** 2 + ((y - 0.075) / 0.008) ** 2 + ((z - 0.12) / 0.02) ** 2))
        c = mix(c, BLACK, 0.95 * m)                                                       # moustache
    return c
def wcol(s, c, top):
    if not top: return mix(GREY, BUFF, 0.4)
    if s > 0.55: return mix(BLACK, WHITE, 0.85) if (c > 0.15 and c < 0.45 and s < 0.75) else BLACK      # white primary patch
    if s > 0.22 and c < 0.45:                                                                           # the famous blue bars
        return mix(BLUE, mix(BLUE2, BLACK, 0.4), 0.5 + 0.5 * math.copysign(1, math.sin(c * 70)))
    if c > 0.6: return BLACK
    return mix(BUFF, PINK, 0.4)
def tcol(t, u, top): return mix(BLACK, srgb('#25252c'), 0.3 * (1 - t))

parts = []
for sx, L in ((1, 'l'), (-1, 'r')):
    wp, wb = wing_part(L, sx, (sx * 0.038, 0.038, 0.048), 0.2, 0.095, wcol, sweep=0.035, thick=0.013, cols=7); parts.append(wp); bones += wb
    parts += eye_parts((sx * 0.031, 0.1, 0.115), 0.008, 'head', '#2a3a6a', (sx, 0.2, 0.6))
lp, lb = bird_legs((0.024, -0.04, 0.0), (0.028, -LEGH, 0.008), 0.034, srgb('#a08070'), 0.005); parts += lp; bones += lb
parts.append(beak_part((0, 0.09, 0.135), 0.032, 0.011, 0.011, srgb('#2a2622'), srgb('#151312'), curve=0.08))
parts.append(tail_fan((0, 0.006, -0.1), 0.15, 0.032, 0.065, tcol, droop=0.01))

names = [b[0] for b in bones]
acts = bird_actions(names, dict(legH=LEGH, hop=True, perch_pitch=-14, flap=58, flap_frames=12))
_p = acts['perch'][1]
def perch(ph):
    p = _p(ph); p['crest'] = (-25 * smooth(0.3, 0.4, ph) * smooth(0.75, 0.65, ph), 0, 0); return p
acts['perch'] = (150, perch)
SPEC = dict(id='jay', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.003, tris=1700, smooth=10, actions=acts,
            meta=dict(height=0.32, length=0.49, speeds={'walk': 0.6, 'fly': 7}, gripY={'perch': -LEGH}, perchOffset=LEGH,
                      map={'hover': 'fly', 'run': 'walk', 'climb': 'perch'}))
