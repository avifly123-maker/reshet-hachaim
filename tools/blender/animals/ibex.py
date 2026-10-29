# יעל נובי (Capra nubiana) – a stocky wild goat of the desert cliffs: a deep body on short strong legs, a short dark
# beard, and in the male two huge horns that sweep up and back in a scimitar curve, with thick knobs along the front.
# Light sandy brown with a darker stripe down the back, a dark chest and dark fronts of the legs, white belly and
# white at the back of the legs. Built on the gazelle's skeleton and motion (gazelle.py); the body is made deeper, the
# horns, beard and colours are its own.
base('gazelle', globals()); derive('gazelle', 'ibex')
EYE['ibex'] = ('#c8a050', 'bar', 0.86, 0.45)   # a goat's golden eye with a bar pupil
ANAT['ibex'] = ('ungulate', dict(scale=1.7))   # the anatomical legs are rebuilt by the kit: make them a goat's, thick and strong
# a deeper, stockier body and thicker legs (the body plan reads the trunk's size from these)
for bl in blobs:
    if bl.get('bone') in ('hips', 'chest') and bl['t'] == 'ell':
        r = bl['r']; c = bl['c']; bl['r'] = (r[0] * 1.3, r[1] * 1.42, r[2]); bl['c'] = (c[0], c[1] - r[1] * 0.18, c[2])   # a deep chest and belly: the legs look short and strong
    elif bl.get('bone', '')[:1] in ('f', 'h') and bl['t'] == 'cap':
        bl['r'] = tuple(x * 1.25 for x in bl['r'])
# the horns: thick at the base, a long scimitar curve up and back, knobbed along the front
parts = [p for p in parts if p.tag != 'horn']
for sx in (1, -1):
    hp = bez([(sx * 0.032, 1.43, 0.5), (sx * 0.05, 1.56, 0.4), (sx * 0.07, 1.63, 0.22), (sx * 0.085, 1.61, 0.02), (sx * 0.09, 1.5, -0.1)], 30)
    hr = [(0.034 * (1 - i / 29) ** 0.8 + 0.004) * (1 + 0.14 * max(0.0, math.sin(i * 1.9))) for i in range(30)]
    hv, hf = tube(hp, hr, 9)
    hc = [mix(srgb('#4a3a2a'), srgb('#7a6650'), 0.5 + 0.5 * math.sin((i // 9) * 1.9)) for i in range(len(hv))]
    horn = Part('horn', bone='head', mat=1); horn.add(hv, hf, hc); parts.append(horn)
beard = Part('beard', bone='head', color=srgb('#3a2a1e')); beard.add(*tube([(0, 1.29, 0.6), (0, 1.22, 0.58), (0, 1.17, 0.6)], [0.022, 0.016, 0.004], 7)); parts.append(beard)
FAWN, FAWN2, WHITE, DARK, CHOC = srgb('#b49068'), srgb('#9c7a54'), srgb('#efe6d6'), srgb('#2e2218'), srgb('#4e3a2a')
_gpaint = paint
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 28, y * 28, z * 28)))
    c = mix(FAWN, FAWN2, 0.35 + 0.3 * n)
    c = mix(c, CHOC, 0.6 * smooth(0.045, 0.02, abs(x)) * smooth(0.95, 1.05, y) * smooth(-0.5, -0.38, z) * smooth(0.36, 0.26, z))   # the dark stripe down the back
    c = mix(c, WHITE, smooth(0.86, 0.78, y) * smooth(-0.15, -0.55, N.y) * 0.9)             # white belly
    c = mix(c, CHOC, 0.55 * smooth(0.26, 0.34, z) * smooth(0.64, 0.56, z) * smooth(0.72, 0.8, y) * smooth(1.18, 1.1, y) * smooth(0.1, 0.35, N.z))   # the dark chest
    # legs: dark in front, white behind and inside, a pale band above the hoof; blended in, no seam where they meet the body
    k = smooth(0.74, 0.58, y) * smooth(0.025, 0.045, abs(x))
    if k > 0:
        front = max(0.0, N.z) * (1 if z > -0.05 else 0.7)
        lc = mix(WHITE, mix(DARK, CHOC, 0.4), smooth(0.1, 0.55, front) * 0.85 + 0.12)
        lc = mix(lc, WHITE, 0.5 * smooth(0.12, 0.06, y))
        c = mix(c, lc, k)
    if z > 0.46 and y > 1.2: c = mix(c, mix(FAWN2, CHOC, 0.4), 0.5)                         # a darker face
    return c
SPEC = dict(SPEC, id='ibex', parts=parts, blobs=blobs, paint=paint)
SPEC['meta'] = dict(SPEC['meta'], scale=0.92)
