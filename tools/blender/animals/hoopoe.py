# דוכיפת (Upupa epops) – cinnamon-orange body, a fan crest with black tips (raised now and then), long thin curved beak,
# boldly black-and-white barred wings and tail. Walks on the ground probing for food.
LEGH = 0.13
blobs = [
    dict(t='ell', c=(0, 0.0, -0.02), r=(0.055, 0.058, 0.1), rot=(-10, 0, 0), bone='hips'),
    dict(t='ell', c=(0, 0.02, 0.045), r=(0.05, 0.054, 0.058), bone='chest'),
    dict(t='cap', a=(0, 0.04, 0.06), b2=(0, 0.075, 0.09), r=(0.034, 0.028), bone='neck'),
    dict(t='ell', c=(0, 0.084, 0.102), r=(0.032, 0.032, 0.038), bone='head'),
]
bones = [('hips', None, (0, 0.0, -0.08), (0, 0.0, 0.02)), ('chest', 'hips', (0, 0.0, 0.02), (0, 0.035, 0.065)),
         ('neck', 'chest', (0, 0.04, 0.065), (0, 0.075, 0.09)), ('head', 'neck', (0, 0.08, 0.09), (0, 0.085, 0.15)),
         ('crest', 'head', (0, 0.105, 0.11), (0, 0.13, 0.06)), ('tail', 'hips', (0, 0.0, -0.1), (0, -0.01, -0.21))]
CIN, CIN2, BLACK, WHITE, PALE = srgb('#d9884a'), srgb('#c47236'), srgb('#151311'), srgb('#f3eee4'), srgb('#e8b98a')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 80, y * 80, z * 80)))
    c = mix(CIN, CIN2, 0.3 + 0.3 * n)
    if y < -0.03: c = mix(c, PALE, smooth(-0.03, -0.05, y) * 0.7)
    if z < -0.06 and y > 0.02:   # barred lower back
        c = mix(c, BLACK if math.sin(z * 180) > 0 else WHITE, 0.85 * smooth(-0.06, -0.08, z))
    return c
def wcol(s, c, top):
    if not top: return mix(BLACK, WHITE, 0.3)
    if s < 0.18 and c < 0.5: return CIN2
    bar = math.sin((s * 1.2 + c * 0.5) * 34)
    return WHITE if bar > 0.35 else BLACK
def tcol(t, u, top): return WHITE if 0.45 < t < 0.62 else BLACK

parts = []
for sx, L in ((1, 'l'), (-1, 'r')):
    wp, wb = wing_part(L, sx, (sx * 0.035, 0.032, 0.045), 0.2, 0.1, wcol, sweep=0.02, thick=0.012, tip=0.6, cols=6, rows=14); parts.append(wp); bones += wb
    parts += eye_parts((sx * 0.027, 0.092, 0.115), 0.0075, 'head', '#0a0806', (sx, 0.2, 0.6))
lp, lb = bird_legs((0.022, -0.04, 0.0), (0.026, -LEGH, 0.008), 0.03, srgb('#3a3230'), 0.0045); parts += lp; bones += lb
parts.append(beak_part((0, 0.082, 0.133), 0.075, 0.006, 0.006, srgb('#2a2422'), srgb('#151210'), curve=0.22, seg=6))
parts.append(tail_fan((0, 0.004, -0.1), 0.12, 0.035, 0.07, tcol, droop=0.0))
# the crest: a fan of rounded feathers, orange with black tips
cr = Part('crest', bone='crest')
for k in range(9):
    a = (k / 8 - 0.5) * 2.4
    base = Vector((0, 0.108, 0.12 - k * 0.009)); tip = base + Vector((0, 0.045 + 0.012 * math.sin(math.pi * k / 8), -0.035 - 0.03 * (k / 8)))
    dd = (tip - base).normalized(); u = Vector((0, -dd.z, dd.y)).normalized(); V = []; C = []
    for i in range(5):
        t = i / 4; P = base.lerp(tip, t); w = 0.009 * math.sin(math.pi * (0.2 + 0.75 * t))
        V += [tuple(P + u * w + Vector((0.0015, 0, 0))), tuple(P - u * w - Vector((0.0015, 0, 0)))]; col = BLACK if t > 0.75 else (WHITE if t > 0.65 else CIN); C += [col, col]
    F = [(2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2) for i in range(4)] + [(2 * i + 2, 2 * i + 3, 2 * i + 1, 2 * i) for i in range(4)]
    cr.add(V, F, C)
parts.append(cr)

names = [b[0] for b in bones]
acts = bird_actions(names, dict(legH=LEGH, hop=False, perch_pitch=-8, flap=60, flap_frames=16, peck=70))
for k in ('perch', 'idle'):
    fr, fn = acts[k]
    def w(ph, fn=fn):
        p = fn(ph); up = smooth(0.25, 0.32, ph) * smooth(0.6, 0.5, ph); p['crest'] = (-60 * up, 0, 0); return p
    acts[k] = (fr, w)
fr, fn = acts['walk']
def walk(ph):
    p = fn(ph); p['head'] = (10 * max(0, math.sin(TAU * ph * 2)), 0, 0); return p
acts['walk'] = (fr, walk)
SPEC = dict(id='hoopoe', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.0028, tris=1600, smooth=10, actions=acts,
            meta=dict(height=0.36, length=0.52, speeds={'walk': 0.5, 'fly': 5}, gripY={'perch': -LEGH}, perchOffset=LEGH,
                      map={'hover': 'fly', 'run': 'walk', 'climb': 'perch'}))
