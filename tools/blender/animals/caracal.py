# קרקל (Caracal caracal) – a slender, long-legged cat with a plain reddish-tan coat (no spots), a white chin and belly,
# black marks above the eyes and on the whisker pads, and tall pointed ears, black on the back, that end in long black
# tufts. Built on the jaguar's skeleton and motion (jaguar.py): a slimmer body, its own ears grown from the skull,
# tufts, face marks and colours; scaled down by meta.scale.
base('jaguar', globals()); derive('jaguar', 'caracal')
EYE['caracal'] = ('#c8a040', 'round', 0.84, 0.5)
for bl in blobs:
    if bl.get('bone') in ('hips', 'chest') and bl['t'] == 'ell': bl['r'] = (bl['r'][0] * 0.8, bl['r'][1] * 0.88, bl['r'][2])
parts = [p for p in parts if p.tag != 'ear']
E = blob_ears(blobs, bones, base=(0.06, 0.8, 0.56), d=(0.35, 1, -0.12), H=0.15, w=0.05, t=0.013, tip=0.95)
for L, (bp, dd, side, fwd) in E['sides'].items():
    tip = bp + dd * (E['H'] * 0.95)
    tuft = Part('tuft', bone='ear' + L, color=srgb('#141010'))
    tuft.add(*tube([tuple(tip), tuple(tip + dd * 0.04 + Vector((0, 0.01, 0))), tuple(tip + dd * 0.075 + Vector((0, 0.012, -0.01)))], [0.009, 0.005, 0.0015], 6))
    parts.append(tuft)
RED, RED2, WHITE, BLACK, CREAM = srgb('#c88c55'), srgb('#b47a46'), srgb('#f3ece0'), srgb('#1a1410'), srgb('#e8d2b2')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 22, y * 22, z * 22)))
    c = mix(RED, RED2, 0.3 + 0.3 * n)
    e = ear_paint(P, N, E)
    if e:
        along, across, inside = e
        return mix(mix(BLACK, RED2, smooth(0.3, 0.0, along) * 0.6), mix(CREAM, WHITE, 0.4), inside)
    belly = smooth(0.56, 0.47, y) * smooth(-0.25, -0.65, N.y) if z > -0.5 else 0
    c = mix(c, WHITE, belly * 0.85)
    if z > 0.45:   # the face: white chin and muzzle, black whisker pads, a dark line above each eye
        if z > 0.66 and y < 0.68: c = mix(c, WHITE, 0.8)
        if z > 0.7 and 0.66 < y < 0.7 and 0.02 < abs(x) < 0.05: c = mix(c, BLACK, 0.7)
        if 0.75 < y < 0.77 and 0.6 < z < 0.7 and 0.02 < abs(x) < 0.05: c = mix(c, BLACK, 0.6)
    if z < -1.1: c = mix(c, RED2, 0.6)
    return c
SPEC = dict(SPEC, id='caracal', blobs=blobs, parts=parts, paint=paint)
SPEC['meta'] = dict(SPEC['meta'], scale=0.6)
