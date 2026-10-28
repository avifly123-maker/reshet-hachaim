# אוח מדבר (Bubo ascalaphus, the pharaoh eagle-owl) – a big, stocky sandy-tawny owl that sits upright: a wide head
# set straight on the body (no neck to see), a round pale facial disc with a thin dark rim, large orange eyes, two
# feather "ears" (tufts), fine dark drops on the upper breast and faint wavy bars on the belly, a mottled back,
# short legs feathered to the toes, wings folded along the sides, a short tail. Its own model on the barn owl's
# skeleton and motion (same bone names, so the bird actions of the kit drive it); scaled up by meta.scale.
own('eagleowl')
EYE['eagleowl'] = ('#e8801c', 'round', 0.9, 0.5)
BIRDS.add('eagleowl')
LEGH = 0.13
blobs = [
    dict(t='ell', c=(0, -0.02, -0.015), r=(0.1, 0.11, 0.13), rot=(-10, 0, 0), bone='hips'),     # a full belly over the legs
    dict(t='ell', c=(0, 0.03, 0.065), r=(0.092, 0.092, 0.08), bone='chest'),
    dict(t='ell', c=(0, 0.082, 0.118), r=(0.08, 0.07, 0.068), bone='head'),         # a wide head, straight on the chest
    dict(t='ell', c=(0, 0.08, 0.162), r=(0.07, 0.064, 0.022), bone='head'),         # the flat facial disc
]
bones = [('hips', None, (0, 0.0, -0.1), (0, 0.0, 0.03)), ('chest', 'hips', (0, 0.0, 0.03), (0, 0.03, 0.09)),
         ('neck', 'chest', (0, 0.03, 0.09), (0, 0.05, 0.11)), ('head', 'neck', (0, 0.05, 0.11), (0, 0.06, 0.2)),
         ('tail', 'hips', (0, 0.01, -0.13), (0, 0.0, -0.2))]
E = blob_ears(blobs, bones, base=(0.044, 0.132, 0.128), d=(0.38, 1, -0.65), H=0.042, w=0.016, t=0.0045, tip=0.55, n=5)
TAWNY, TAWNY2, PALE, STREAK, DISC, RIM = srgb('#cfa868'), srgb('#a8834e'), srgb('#efe0c0'), srgb('#4a3622'), srgb('#dcc39a'), srgb('#4a3622')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 90, y * 90, z * 90)))
    e = ear_paint(P, N, E)
    if e: return mix(TAWNY2, STREAK, smooth(0.55, 1.0, e[0]) * 0.75)
    if z > 0.1:
        f = Vector(P) - Vector((0, 0.08, 0.165))
        r = math.hypot(f.x / 0.064, f.y / 0.06)
        if f.z > -0.014 and r < 1.06:                                               # the round facial disc with its dark rim
            c = mix(DISC, PALE, smooth(0.7, 0.1, r) * 0.3)
            c = mix(c, TAWNY2, smooth(0.25, 0.0, abs(f.x) / 0.064) * smooth(0.1, 0.5, f.y / 0.06) * 0.35)   # the brow between the eyes
            return mix(c, RIM, smooth(0.86, 1.0, r) * 0.85)
        c = mix(TAWNY, TAWNY2, 0.4 + 0.3 * n)
        d, rid = worley(P, 200, 7); return mix(c, STREAK, smooth(0.2, 0.1, d) * (rid > 0.6) * 0.5)
    back = N.y > -0.1 and (y > 0.02 or abs(x) > 0.07)
    if back:                                                                        # a mottled tawny back
        c = mix(TAWNY, TAWNY2, 0.35 + 0.35 * n)
        d, rid = worley(P, 140, 7); c = mix(c, STREAK, smooth(0.22, 0.1, d) * (rid > 0.55) * 0.55)
        return mix(c, PALE, smooth(0.2, 0.1, d) * (rid < 0.12) * 0.5)
    c = mix(PALE, TAWNY, 0.4 + 0.2 * n)                                             # a buff breast
    w = noise.noise(Vector((x * 40, y * 40, z * 40)))
    up = smooth(-0.12, -0.07, y)
    d, rid = worley(Vector((x * 1.0, y * 0.45, z * 1.0)), 110, 11)                     # short dark drops, longer than wide
    c = mix(c, STREAK, smooth(0.36, 0.16, d) * (rid > 0.3) * up * 0.95)
    bar = math.sin(y * 480 + math.sin(x * 70) * 1.5 + w * 2)
    return mix(c, TAWNY2, smooth(0.8, 0.97, bar) * (1 - up) * 0.4)
def wcol(s, c, top):
    n = noise.noise(Vector((s * 10, c * 10, 1)))
    if not top: return mix(PALE, TAWNY, 0.85)
    col = mix(TAWNY, TAWNY2, 0.3 + 0.4 * n)
    k = math.sin(c * 30 + s * 8 + 3 * n)
    if k > 0.8: return mix(col, STREAK, 0.45)
    return mix(col, PALE, 0.35) if k < -0.9 else col
def tcol(t, u, top): return mix(TAWNY, STREAK, 0.35 if math.sin(t * 30) > 0.5 else 0.0) if top else PALE

parts = []
for sx, L in ((1, 'l'), (-1, 'r')):
    wp, wb = wing_part(L, sx, (sx * 0.07, 0.045, 0.055), 0.36, 0.14, wcol, sweep=0.03, thick=0.02, tip=0.7, cols=6); parts.append(wp); bones += wb
    parts += eye_parts((sx * 0.029, 0.09, 0.176), 0.0145, 'head', '#e8801c', (sx * 0.3, 0.15, 1))
lp, lb = bird_legs((0.03, -0.03, 0.0), (0.04, -LEGH, 0.04), 0.035, srgb('#dcc08e'), 0.013); parts += lp; bones += lb
for sx, L in ((1, 'l'), (-1, 'r')):     # feathered "trousers": the thighs are part of the body, so no leg end ever shows
    blobs.append(dict(t='cap', a=(sx * 0.03, -0.035, 0.005), b2=(sx * 0.038, -0.105, 0.034), r=(0.026, 0.014), bone='l' + L))
parts.append(beak_part((0, 0.07, 0.18), 0.02, 0.008, 0.011, srgb('#2a2622'), srgb('#1a1612'), curve=0.65))
parts.append(tail_fan((0, 0.0, -0.13), 0.075, 0.07, 0.085, tcol))

names = [b[0] for b in bones]
acts = bird_actions(names, dict(legH=LEGH, hop=False, perch_pitch=-50, flap=48, flap_frames=24, peck=40, glide_dihedral=4))
for k in ('perch', 'idle', 'eat', 'sleep', 'walk'):
    fr, fn = acts[k]
    def w(ph, fn=fn, k=k):
        p = fn(ph)
        hp = p.get('hips', ((0, 0, 0), None)); rot = hp[0] if isinstance(hp[0], (tuple, list)) else hp
        tilt = rot[0]
        for L in ('l', 'r'): p['l' + L] = (-tilt + (p.get('l' + L, (0, 0, 0))[0] if k == 'walk' else 0), 0, 0)
        h = p.get('head', (0, 0, 0)); p['head'] = (h[0] - tilt, h[1] * 0.7, h[2] * 0.2)   # turns the head far, hardly tilts it
        return p
    acts[k] = (fr, w)
SPEC = dict(id='eagleowl', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.0045, tris=2200, smooth=12, actions=acts,
            meta=dict(height=0.5, length=0.42, scale=1.25, speeds={'walk': 0.4, 'fly': 6}, gripY={'perch': -LEGH}, perchOffset=LEGH,
                      map={'hover': 'glide', 'run': 'walk', 'climb': 'perch'}))
