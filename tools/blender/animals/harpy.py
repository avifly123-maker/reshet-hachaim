# עיט הרפיה (Harpia harpyja) – pale grey head with a split dark crest, black breast band, white belly, dark slate wings
# with barred flight feathers, thick yellow legs with huge talons, heavy black hooked bill.
LEGH = 0.26
blobs = [
    dict(t='ell', c=(0, 0.0, -0.04), r=(0.14, 0.15, 0.25), rot=(-12, 0, 0), bone='hips'),
    dict(t='ell', c=(0, 0.04, 0.12), r=(0.15, 0.16, 0.15), bone='chest'),
    dict(t='ell', c=(0, -0.04, 0.13), r=(0.12, 0.12, 0.11), bone='chest'),          # deep, powerful breast
    dict(t='cap', a=(0, 0.11, 0.17), b2=(0, 0.17, 0.22), r=(0.085, 0.075), bone='neck'),
    dict(t='ell', c=(0, 0.2, 0.25), r=(0.08, 0.085, 0.09), bone='head'),
    # the double crest
    dict(t='ell', c=(0.035, 0.29, 0.2), r=(0.018, 0.05, 0.03), rot=(30, 0, 15), bone='crest'),
    dict(t='ell', c=(-0.035, 0.29, 0.2), r=(0.018, 0.05, 0.03), rot=(30, 0, -15), bone='crest'),
]
bones = [('hips', None, (0, 0.0, -0.2), (0, 0.0, 0.05)), ('chest', 'hips', (0, 0.0, 0.05), (0, 0.08, 0.16)),
         ('neck', 'chest', (0, 0.1, 0.16), (0, 0.17, 0.22)), ('head', 'neck', (0, 0.18, 0.22), (0, 0.19, 0.36)),
         ('crest', 'head', (0, 0.26, 0.22), (0, 0.33, 0.16)), ('tail', 'hips', (0, 0.0, -0.24), (0, -0.02, -0.5))]
GREY, GREY2, SLATE, BLACK, WHITE, YEL = srgb('#b8b8b4'), srgb('#8c8c88'), srgb('#3a3d42'), srgb('#151517'), srgb('#f2f0ec'), srgb('#e8b830')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 30, y * 30, z * 30)))
    c = WHITE
    if y > 0.03 and z < 0.12 and N.y > -0.2: c = mix(SLATE, BLACK, 0.3 + 0.3 * n)          # dark back
    if z > 0.08 and 0.0 < y < 0.12 and N.z > 0.2: c = mix(BLACK, SLATE, 0.3)                  # breast band
    if z > 0.15 and y > 0.12: c = mix(GREY, GREY2, 0.4 + 0.3 * n)                              # grey head
    if tag == 'body' and y > 0.27: c = mix(BLACK, SLATE, 0.3)                                  # crest
    if y < -0.08 and z > -0.1: c = mix(WHITE, mix(WHITE, BLACK, 0.4), 0.5 * (math.sin(z * 90) > 0.6))   # barred thighs
    return c
def wcol(s, c, top):
    if not top: return mix(WHITE, mix(WHITE, BLACK, 0.6), 1 if (math.sin(s * 40) > 0.4 and c > 0.4) else 0)
    col = mix(SLATE, BLACK, 0.3 + 0.2 * s)
    if c > 0.45 and math.sin(c * 26 + s * 4) > 0.5: col = mix(col, GREY2, 0.5)                 # barred flight feathers
    return col
def tcol(t, u, top): return mix(SLATE, GREY2, 0.6) if math.sin(t * 22) > 0.3 else BLACK

parts = []
for sx, L in ((1, 'l'), (-1, 'r')):
    wp, wb = wing_part(L, sx, (sx * 0.11, 0.07, 0.11), 0.68, 0.32, wcol, sweep=0.05, thick=0.035, tip=0.5, fingers=5, fdepth=0.35, cols=7, rows=16); parts.append(wp); bones += wb
    parts += eye_parts((sx * 0.05, 0.22, 0.3), 0.017, 'head', '#2a1a08', (sx * 0.6, 0.1, 0.8))
lp, lb = bird_legs((0.06, -0.09, 0.03), (0.065, -LEGH, 0.05), 0.075, YEL, 0.02); parts += lp; bones += lb
for sx, L in ((1, 'l'), (-1, 'r')):     # talons
    t = Part('talon', bone='l' + L, color=srgb('#141210'), mat=1)
    ank = Vector((sx * 0.065, -LEGH, 0.05))
    for a in (-0.45, 0.0, 0.45, math.pi):
        d = Vector((math.sin(a) * (1 if a != math.pi else 0), 0, math.cos(a))); tip = ank + d * 0.075 * (0.65 if a == math.pi else 1)
        t.add(*tube([tip, tip + d * 0.02 + Vector((0, -0.012, 0)), tip + d * 0.025 + Vector((0, -0.03, 0))], [0.008, 0.005, 0.001], 4))
    parts.append(t)
parts.append(beak_part((0, 0.2, 0.32), 0.07, 0.025, 0.035, srgb('#2a2a2c'), srgb('#0e0e10'), curve=0.6, seg=8, rows=7))
parts.append(tail_fan((0, 0.01, -0.24), 0.36, 0.1, 0.16, tcol, rows=7, cols=6, thick=0.012))

names = [b[0] for b in bones]
acts = bird_actions(names, dict(legH=LEGH, hop=False, perch_pitch=-38, flap=38, flap_frames=30, peck=45, glide_dihedral=5,
                                frames=dict(glide=120)))
fr, fn = acts['perch']
def perch(ph):
    p = fn(ph); p['crest'] = (-20 * smooth(0.4, 0.5, ph) * smooth(0.8, 0.7, ph), 0, 0); return p
acts['perch'] = (fr, perch)
for k in ('perch', 'idle', 'eat', 'sleep'):      # an upright eagle: the legs stay under the body, the head stays level
    fr2, fn2 = acts[k]
    def w(ph, fn2=fn2):
        p = fn2(ph); hp = p.get('hips', ((0, 0, 0), None)); tilt = (hp[0] if isinstance(hp[0], (tuple, list)) else hp)[0]
        for L in ('l', 'r'): p['l' + L] = (-tilt, 0, 0)
        h = p.get('head', (0, 0, 0)); p['head'] = (h[0] - tilt * 0.8, h[1], h[2]); return p
    acts[k] = (fr2, w)
SPEC = dict(id='harpy', foldK=1.35, bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.009, tris=2400, smooth=10, actions=acts,
            meta=dict(height=0.8, length=1.3, speeds={'walk': 0.3, 'fly': 10}, gripY={'perch': -LEGH}, perchOffset=LEGH,
                      map={'hover': 'glide', 'run': 'walk', 'climb': 'perch'}))
