# יעל נובי (Capra nubiana) – a stocky wild goat of the desert cliffs: a deep body on short strong legs, a short dark
# beard, and in the male two huge horns that sweep up and back in a scimitar curve, with thick knobs along the front.
# Light sandy brown with a darker stripe down the back, a dark chest and dark fronts of the legs, white belly and
# white at the back of the legs. Built on the gazelle's skeleton and motion (gazelle.py); the body is made deeper, the
# horns, beard and colours are its own.
base('gazelle', globals()); derive('gazelle', 'ibex')
EYE['ibex'] = ('#c8a050', 'bar', 0.86, 0.45)   # a goat's golden eye with a bar pupil
# a deeper, stockier body and thicker legs (the body plan reads the trunk's size from these)
for bl in blobs:
    if bl.get('bone') in ('hips', 'chest') and bl['t'] == 'ell':
        r = bl['r']; bl['r'] = (r[0] * 1.25, r[1] * 1.2, r[2])
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
    if abs(x) < 0.03 and y > 1.0 and -0.4 < z < 0.3: c = mix(c, CHOC, 0.6)                 # the dark stripe down the back
    c = mix(c, WHITE, smooth(0.86, 0.78, y) * smooth(-0.15, -0.55, N.y) * 0.9)             # white belly
    if 0.3 < z < 0.6 and 0.75 < y < 1.15 and N.z > 0.2: c = mix(c, CHOC, 0.55)            # the dark chest
    if y < 0.72 and abs(x) > 0.035:   # legs: dark in front, white behind and inside, a pale band above the hoof
        front = max(0.0, N.z) * (1 if z > -0.05 else 0.7)
        c = mix(WHITE, mix(DARK, CHOC, 0.4), smooth(0.15, 0.5, front) * 0.9 + 0.1)
        if y < 0.1: c = mix(c, WHITE, 0.5)
    if z > 0.46 and y > 1.2: c = mix(c, mix(FAWN2, CHOC, 0.4), 0.5)                         # a darker face
    return c
SPEC = dict(SPEC, id='ibex', parts=parts, blobs=blobs, paint=paint)
SPEC['meta'] = dict(SPEC['meta'], scale=0.92)
