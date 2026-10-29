# קרקל (Caracal caracal) – a slender, long-legged cat with a plain reddish-tan coat (no spots), a white chin and belly,
# black marks above the eyes, a dark line down each side of the nose and dark whisker spots, and tall pointed ears,
# black on the back, that end in long black tufts. Kit v6: built on the cheetah (cheetah.py), the cat rules of the kit
# (felid body plan, anatomical cat legs, a small round head): a sturdier trunk, a short tail, its own ears grown from
# the skull with tufts, plain colours; scaled down by meta.scale (0.45 m at the shoulder).
base('cheetah', globals()); own('caracal'); derive('cheetah', 'caracal')   # own first: an earlier build may have left the jaguar's tweaks for it
EYE['caracal'] = ('#c8a040', 'round', 0.84, 0.5)
ANAT['caracal'] = ('cat', dict(ANAT['cheetah'][1], fa1=0.064, can=0.056, mt=0.054, gas1=0.056))
blobs = [b for b in blobs if b.get('bone') not in ('earL', 'earR', 'tail3', 'tail4')]   # the cheetah's ears out, a short tail
for bl in blobs:
    if bl.get('bone') in ('hips', 'chest') and bl['t'] == 'ell' and not bl.get('keep'): bl['r'] = (bl['r'][0] * 1.12, bl['r'][1] * 1.04, bl['r'][2])
E = blob_ears(blobs, bones, base=(0.047, 0.935, 0.565), d=(0.4, 1, -0.15), H=0.125, w=0.042, t=0.011, tip=0.95)
for L, (bp, dd, side, fwd) in E['sides'].items():
    tip = bp + dd * (E['H'] * 0.95)
    tuft = Part('tuft', bone='ear' + L, color=srgb('#141010'))
    tuft.add(*tube([tuple(tip), tuple(tip + dd * 0.035 + Vector((0, 0.008, 0))), tuple(tip + dd * 0.065 + Vector((0, 0.01, -0.008)))], [0.008, 0.0045, 0.0012], 6))
    parts.append(tuft)
RED, RED2, WHITE, BLACK, CREAM = srgb('#c88c55'), srgb('#b47a46'), srgb('#f3ece0'), srgb('#1a1410'), srgb('#e8d2b2')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 22, y * 22, z * 22)))
    c = mix(RED, RED2, 0.3 + 0.3 * n)
    e = ear_paint(P, N, E)
    if e:
        along, across, inside = e
        return mix(mix(BLACK, RED2, smooth(0.35, 0.0, along) * 0.6), mix(CREAM, WHITE, 0.4), inside * 0.8)
    belly = (smooth(0.66, 0.56, y) * smooth(-0.15, -0.6, N.y) if -0.5 < z < 0.4 else 0)
    belly = max(belly, smooth(0.86, 0.8, y) * smooth(0.36, 0.46, z) * smooth(0.56, 0.48, z) * smooth(-0.1, -0.5, N.y))   # the throat, underneath only
    c = mix(c, WHITE, belly * 0.85)
    if z > 0.5:   # the face: a white muzzle and chin, the dark nose lines, soft dark whisker spots, a dark mark above each eye
        c = mix(c, WHITE, smooth(0.64, 0.665, z) * smooth(0.87, 0.85, y) * 0.75)
        c = mix(c, WHITE, smooth(0.0, 0.5, -N.y) * smooth(0.6, 0.63, z) * 0.6)
        for sx in (1, -1):
            dl = _seg(Vector((P.x, P.y, 0)), (sx * 0.022, 0.9, 0), (sx * 0.02, 0.87, 0))
            c = mix(c, BLACK, smooth(0.006, 0.003, dl) * smooth(0.62, 0.645, z) * smooth(0.1, 0.4, N.z) * 0.85)
            dw = (Vector((P.x - sx * 0.024, (P.y - 0.842) * 1.4, 0))).length
            c = mix(c, BLACK, smooth(0.012, 0.006, dw) * smooth(0.64, 0.67, z) * 0.7)
            db = (Vector((P.x - sx * 0.03, (P.y - 0.918) * 2.0, 0))).length
            c = mix(c, BLACK, smooth(0.011, 0.005, db) * smooth(0.6, 0.63, z) * 0.6)
    if z < -0.8: c = mix(c, RED2, 0.5)
    return c
SPEC = dict(SPEC, id='caracal', blobs=blobs, bones=bones, parts=parts, paint=paint)
SPEC['meta'] = dict(SPEC['meta'], scale=0.58)
