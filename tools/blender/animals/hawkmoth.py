# רפרף (Hyles livornica, the striped hawkmoth) – narrow pointed olive-brown forewings with a pale stripe and white
# veins, pink hindwings with a dark edge, a thick striped body; it hovers at flowers at dusk and drinks with a long
# tongue. Built with the kit's butterfly helper: narrow wings, a heavier body colour.
FORE = [(0.0, 0.012), (0.06, 0.035), (0.13, 0.05), (0.2, 0.055), (0.205, 0.04), (0.16, 0.01), (0.1, -0.008), (0.04, -0.008), (0.006, 0.0)]
HIND = [(0.0, 0.0), (0.05, -0.004), (0.095, -0.02), (0.1, -0.045), (0.07, -0.06), (0.035, -0.05), (0.005, -0.02)]
OLIVE, OLIVE2, PALE, PINK, DARK = srgb('#7a6a48'), srgb('#5e5034'), srgb('#e8dcb8'), srgb('#e48a96'), srgb('#2a2218')
def ftop(x, z, r):
    c = mix(OLIVE, OLIVE2, 0.4 + 0.3 * math.sin(x * 60))
    s = z - (0.012 + x * 0.18)                                   # the pale stripe from the body to the tip
    c = mix(c, PALE, smooth(0.009, 0.003, abs(s)) * 0.9)
    if r > 0.9: c = mix(c, DARK, 0.5)
    return c
def htop(x, z, r):
    c = mix(PINK, srgb('#c86070'), smooth(0.4, 0.8, r))
    if r > 0.82: c = DARK
    if r < 0.2: c = mix(c, DARK, 0.7)
    return c
def under(x, z, r): return mix(srgb('#a89070'), srgb('#8a7458'), 0.5 + 0.3 * math.sin(r * 18))
SPEC = butterfly_spec('hawkmoth', FORE, HIND, ftop, under, htop, under, srgb('#6a5a3c'), scale=1.0,
                      meta=dict(height=0.05, length=0.4, speeds={'fly': 3.0}, gripY={'perch': -0.012},
                                map={'hover': 'fly', 'eat': 'fly', 'idle': 'perch', 'walk': 'perch'}))
