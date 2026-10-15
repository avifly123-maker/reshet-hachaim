# פרפר (Papilio machaon, swallowtail) – yellow wings with black veins and margins, blue lunules and a red eye-spot on the
# hindwing, long black tails. Flutters, glides, basks with the wings opening and closing.
FORE = [(0.0, 0.02), (0.06, 0.05), (0.12, 0.062), (0.165, 0.06), (0.16, 0.03), (0.13, -0.01), (0.09, -0.02), (0.04, -0.01), (0.008, 0.0)]
HIND = [(0.0, 0.0), (0.05, 0.0), (0.1, -0.015), (0.11, -0.045), (0.095, -0.075), (0.082, -0.09), (0.075, -0.135), (0.066, -0.136), (0.062, -0.095), (0.04, -0.09), (0.015, -0.06), (0.004, -0.02)]
YEL, BLK, BLUE, RED, UND = srgb('#f4d23c'), srgb('#151210'), srgb('#4a78d0'), srgb('#e2432a'), srgb('#e8d890')
def veins(x, z, n):
    a = math.atan2(z, x); return smooth(0.82, 0.97, abs(math.sin(a * n)))
def ftop(x, z, r):
    c = YEL
    if r > 0.78: c = mix(BLK, YEL, smooth(0.86, 0.84, r) * 0 + (0.85 if (0.84 < r < 0.94 and math.sin(math.atan2(z, x) * 26) > 0.4) else 0))
    if x < 0.11 and z > 0.035: c = mix(c, BLK, 0.9 * (1 if math.sin(x * 70) > 0.2 else 0))       # costal bars
    if r < 0.25: c = mix(c, BLK, 0.85)
    return mix(c, BLK, 0.8 * veins(x, z - 0.02, 7))
def htop(x, z, r):
    c = YEL
    if r > 0.62: c = BLK
    if 0.68 < r < 0.86 and math.sin(math.atan2(z, x) * 14) > 0.0: c = BLUE
    if r > 0.88 and math.sin(math.atan2(z, x) * 14) > 0.3: c = YEL
    if (x - 0.02) ** 2 + (z + 0.085) ** 2 < 0.012 ** 2: c = RED                                     # eye-spot
    if r < 0.2: c = mix(c, BLK, 0.8)
    if z < -0.1: c = BLK                                                                             # tail
    return mix(c, BLK, 0.7 * veins(x, z, 6))
def under(x, z, r): return mix(UND, BLK, 0.5 * veins(x, z, 7) + (0.4 if r > 0.85 else 0))
SPEC = butterfly_spec('butterfly', FORE, HIND, ftop, under, htop, under, srgb('#1c1814'), scale=1.0,
                      meta=dict(height=0.08, length=0.35, speeds={'fly': 1.5}, gripY={'perch': -0.012}, perchOffset=0.012,
                                map={'hover': 'fly', 'eat': 'perch', 'idle': 'perch', 'walk': 'perch'}))
