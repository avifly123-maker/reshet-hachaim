# פרפר מורפו (Morpho peleides) – brilliant metallic blue above with black margins and white dots; brown with eye-spots below,
# so it "flashes" blue as it flaps.
FORE = [(0.0, 0.02), (0.07, 0.06), (0.15, 0.08), (0.22, 0.075), (0.215, 0.03), (0.18, -0.01), (0.12, -0.025), (0.05, -0.012), (0.008, 0.0)]
HIND = [(0.0, 0.0), (0.07, -0.005), (0.14, -0.03), (0.155, -0.07), (0.13, -0.11), (0.08, -0.13), (0.03, -0.1), (0.005, -0.03)]
B1, B2, BLK, WHT, BRN, EYE = srgb('#3ab0ff'), srgb('#1458d8'), srgb('#0e0e14'), srgb('#f0f0f0'), srgb('#7a5a38'), srgb('#e8b040')
def top(x, z, r, n=17):
    c = mix(B1, B2, smooth(0.3, 0.9, r))
    if r > 0.8: c = BLK
    if 0.86 < r < 0.95 and math.sin(math.atan2(z, x) * n) > 0.6: c = WHT
    if r < 0.15: c = mix(c, BLK, 0.6)
    return c
def ftop(x, z, r):
    c = top(x, z, r)
    if x > 0.1 and z > 0.05: c = mix(c, BLK, smooth(0.05, 0.065, z))          # dark costal edge
    return c
def under(x, z, r):
    c = mix(BRN, srgb('#4e3a26'), 0.5 * math.sin(r * 20) ** 2)
    for (ex, ez) in ((0.12, 0.02), (0.07, -0.07), (0.11, -0.06)):
        d = math.hypot(x - ex, z - ez)
        if d < 0.016: c = mix(EYE, BLK, smooth(0.006, 0.01, d)) if d < 0.012 else WHT
    return c
SPEC = butterfly_spec('morpho', FORE, HIND, ftop, under, top, under, srgb('#2a2018'), scale=1.15, gloss=True,
                      meta=dict(height=0.06, length=0.55, speeds={'fly': 1.5}, gripY={'perch': -0.014},
                                map={'hover': 'fly', 'eat': 'perch', 'idle': 'perch', 'walk': 'perch'}))
