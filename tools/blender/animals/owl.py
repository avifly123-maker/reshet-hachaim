# תנשמת (Tyto alba) – heart-shaped white face, dark eyes, golden-buff and grey back with fine dots, white underparts,
# long feathered legs. Sits upright; flies on broad soft wings.
LEGH = 0.2
blobs = [
    dict(t='ell', c=(0, 0.0, -0.02), r=(0.085, 0.09, 0.14), rot=(-10, 0, 0), bone='hips'),
    dict(t='ell', c=(0, 0.02, 0.07), r=(0.08, 0.088, 0.075), bone='chest'),
    dict(t='ell', c=(0, 0.07, 0.125), r=(0.07, 0.07, 0.065), bone='head'),      # big round head
    dict(t='ell', c=(0, 0.068, 0.168), r=(0.066, 0.068, 0.022), bone='head'),       # flat facial disc
]
bones = [('hips', None, (0, 0.0, -0.1), (0, 0.0, 0.03)), ('chest', 'hips', (0, 0.0, 0.03), (0, 0.03, 0.09)),
         ('neck', 'chest', (0, 0.03, 0.09), (0, 0.05, 0.11)), ('head', 'neck', (0, 0.05, 0.11), (0, 0.06, 0.2)),
         ('tail', 'hips', (0, 0.01, -0.13), (0, 0.0, -0.22))]
GOLD, GREY, WHITE, DOT, FACE, RIM = srgb('#d8a960'), srgb('#9a9590'), srgb('#f6f2ea'), srgb('#2a2620'), srgb('#f7f3ec'), srgb('#b8864a')
def frame(P):
    # coordinates in the head's frame, tilted so the face disc points forward
    return Vector(P) - Vector((0, 0.068, 0.17))
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 90, y * 90, z * 90)))
    if z > 0.1:
        f = frame(P)
        r = math.hypot(f.x / 0.06, (f.y - 0.005) / (0.065 if f.y > 0 else 0.05))
        heart = 1 if (f.z > -0.012 and r < 1.0) else 0
        if heart: return mix(FACE, mix(FACE, RIM, 0.6), smooth(0.82, 0.98, r))
        return mix(GOLD, GREY, 0.4 + 0.3 * n)
    c = mix(WHITE, mix(WHITE, GOLD, 0.25), 0.3 + 0.3 * n)
    if N.y > -0.1 and (y > 0.02 or abs(x) > 0.06):
        c = mix(mix(GOLD, GREY, 0.35 + 0.35 * n), GREY, 0.2)
    d, rid = worley(P, 160, 7)
    if rid > 0.7: c = mix(c, WHITE if N.y > 0 else DOT, smooth(0.25, 0.12, d) * 0.8)
    return c
def wcol(s, c, top):
    n = noise.noise(Vector((s * 10, c * 10, 1)))
    if not top: return mix(WHITE, GOLD, 0.15)
    col = mix(GOLD, GREY, 0.3 + 0.3 * n)
    if s > 0.55: col = mix(col, mix(GOLD, WHITE, 0.3), 0.3) if math.sin(c * 30) > 0.6 else col
    return col
def tcol(t, u, top): return mix(GOLD, GREY, 0.4) if top else WHITE

parts = []
for sx, L in ((1, 'l'), (-1, 'r')):
    wp, wb = wing_part(L, sx, (sx * 0.06, 0.04, 0.06), 0.36, 0.17, wcol, sweep=0.03, thick=0.02, tip=0.7, cols=6); parts.append(wp); bones += wb
    parts += eye_parts((sx * 0.026, 0.078, 0.184), 0.012, 'head', '#060404', (sx * 0.3, 0.2, 1))
lp, lb = bird_legs((0.035, -0.06, 0.02), (0.04, -LEGH, 0.03), 0.04, srgb('#f0e8dc'), 0.012); parts += lp; bones += lb
parts.append(beak_part((0, 0.062, 0.186), 0.022, 0.007, 0.01, srgb('#e8d8c0'), srgb('#c8b498'), curve=0.6))
parts.append(tail_fan((0, 0.01, -0.13), 0.09, 0.07, 0.09, tcol))

names = [b[0] for b in bones]
acts = bird_actions(names, dict(legH=LEGH, hop=False, perch_pitch=-50, flap=48, flap_frames=24, peck=40, glide_dihedral=4))
for k in ('perch', 'idle', 'eat', 'sleep', 'walk'):
    fr, fn = acts[k]
    def w(ph, fn=fn, k=k):
        p = fn(ph)
        hp = p.get('hips', ((0, 0, 0), None)); rot = hp[0] if isinstance(hp[0], (tuple, list)) else hp
        tilt = rot[0]
        for L in ('l', 'r'): p['l' + L] = (-tilt + (p.get('l' + L, (0, 0, 0))[0] if k == 'walk' else 0), 0, 0)
        h = p.get('head', (0, 0, 0)); p['head'] = (h[0] - tilt, h[1] * 2.2, h[2])          # owls turn their heads far
        return p
    acts[k] = (fr, w)
SPEC = dict(id='owl', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.0045, tris=2000, smooth=12, actions=acts,
            meta=dict(height=0.6, length=0.42, speeds={'walk': 0.4, 'fly': 6}, gripY={'perch': -LEGH}, perchOffset=LEGH,
                      map={'hover': 'glide', 'run': 'walk', 'climb': 'perch'}))
