# ברדלס (Acinonyx jubatus) – savanna pilot of kit v6 (docs/PLAN-1.4.md 11.1). The runner among the cats: a light,
# narrow body with a deep chest and a tucked-in belly, long thin legs, a small round head with small round ears, a
# long tail with dark rings and a white tip. A golden coat with round solid black spots (not rosettes like the
# jaguar), a white belly, and the black "tear lines" from the inner corner of each eye down to the mouth.
# Built on the jaguar's skeleton and motion (jaguar.py): the whole body is raised by DY so the legs (rebuilt by the
# kit's anatomical legs from the bones) are longer, and thinner (ANAT scale), and the trunk is slimmer.
base('jaguar', globals()); derive('jaguar', 'cheetah')
EYE['cheetah'] = ('#b8902c', 'round', 0.84, 0.48)
ANAT['cheetah'] = ('cat', dict(ANAT['jaguar'][1], scale=0.78))
DY = 0.13
LEG = {'fl', 'fr', 'hl', 'hr', 'fl2', 'fr2', 'hl2', 'hr2'}
for bl in blobs:
    if bl.get('bone') in LEG: continue
    for k in ('c', 'a', 'b2'):
        if k in bl: bl[k] = (bl[k][0], bl[k][1] + DY, bl[k][2])
    if bl.get('bone') in ('hips', 'chest') and bl['t'] == 'ell':
        r = bl['r']; bl['r'] = (r[0] * 0.8, r[1] * (1.0 if bl.get('bone') == 'chest' else 0.9), r[2])   # narrow; a deep chest, a tucked belly
    if bl.get('bone') == 'head' and 'c' in bl:   # a small round head: every head blob shrinks toward the head's centre
        HC = Vector((0, 0.7 + DY, 0.64)); c = Vector(bl['c'])
        bl['c'] = tuple(HC + (c - HC) * 0.88); bl['r'] = tuple(x * 0.88 for x in bl['r'])
nb = []
for (n, par, h, t) in bones:
    if n in ('fl', 'fr', 'hl', 'hr'): nb.append((n, par, (h[0], h[1] + DY, h[2]), t))                # the upper leg grows
    elif n in LEG: nb.append((n, par, h, t))
    else: nb.append((n, par, (h[0], h[1] + DY, h[2]), (t[0], t[1] + DY, t[2])))
bones = nb
parts = [p for p in parts if p.tag != 'ear']
for p in parts:
    if p.bone in LEG: continue
    p.v = [(v[0], v[1] + DY, v[2]) for v in p.v]
    if p.bone == 'head':   # eyes, nose and whiskers follow the smaller head
        HC = Vector((0, 0.7 + DY, 0.64)); p.v = [tuple(HC + (Vector(v) - HC) * 0.88) for v in p.v]
E = blob_ears(blobs, bones, base=(0.055, 0.785 + DY, 0.56), d=(0.6, 1, -0.2), H=0.055, w=0.042, t=0.012, tip=0.35)
GOLD, GOLD2, WHITE, BLACK, CREAM = srgb('#d8a85a'), srgb('#c39046'), srgb('#f4ede0'), srgb('#161210'), srgb('#ecd8b4')
def _seg(P, a, b):
    a = Vector(a); b = Vector(b); ab = b - a; t = max(0.0, min(1.0, (P - a).dot(ab) / ab.length_squared)); return (P - (a + ab * t)).length
def paint(P, N, tag):
    x, y, z = P; y0 = y - DY
    n = noise.noise(Vector((x * 22, y * 22, z * 22)))
    c = mix(GOLD, GOLD2, 0.3 + 0.3 * n)
    e = ear_paint(P, N, E)
    if e: return mix(mix(GOLD2, BLACK, 0.35), CREAM, e[2] * 0.55)
    belly = smooth(0.58, 0.47, y0) * smooth(-0.2, -0.65, N.y) if z > -0.5 else 0
    c = mix(c, WHITE, belly * 0.85)
    # solid round spots everywhere but the belly and the face's middle; smaller on the head and the legs
    sc = 22 + 18 * smooth(0.42, 0.62, z) + 10 * smooth(0.38, 0.25, y0)
    d1, d2, rid = worley2(Vector((x, y * 1.1, z)), sc, 31)
    spot = smooth(0.3, 0.2, d1) * (rid > 0.08) * (1 - belly * 0.9)
    if z > 0.6: spot *= smooth(0.012, 0.03, abs(x))
    c = mix(c, BLACK, spot * 0.92)
    if z > 0.45:   # the face: a white muzzle and chin, white above the eyes, then the black tear lines over it
        if z > 0.69 and y0 < 0.674: c = mix(c, WHITE, 0.7)
        if 0.752 < y0 < 0.766 and 0.66 < z < 0.7 and 0.03 < abs(x) < 0.06: c = mix(c, WHITE, 0.5)
        for sx in (1, -1):
            dl = _seg(P, (sx * 0.035, 0.722 + DY, 0.69), (sx * 0.03, 0.664 + DY, 0.722))
            c = mix(c, BLACK, smooth(0.009, 0.005, dl) * 0.95)
    if z < -0.95:   # the tail's end: dark rings and a white tip
        ring = math.sin((z + 0.95) * 70)
        c = mix(c, BLACK, smooth(0.5, 0.8, ring) * 0.85)
        if z < -1.32: c = mix(c, WHITE, 0.85)
    return c
SPEC = dict(SPEC, id='cheetah', blobs=blobs, bones=bones, parts=parts, paint=paint)
SPEC['meta'] = dict(SPEC['meta'], height=SPEC['meta'].get('height', 0.8) + DY, scale=1.0)
