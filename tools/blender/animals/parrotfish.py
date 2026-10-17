# תוכינון (Scarus ferrugineus, the rusty parrotfish of the Red Sea, a male): long oval body, a blunt head with a
# beak of fused teeth (it scrapes algae off dead coral and grinds coral rock into fine sand), big scales each edged in
# pink, blue-green fins with pink bands, a crescent tail.
L = 0.85
GREEN, TEAL, PINK, BEAK = srgb('#2bae8a'), srgb('#1d7f78'), srgb('#e58aa8'), srgb('#c9ece0')
FIN, FIN2 = srgb('#2a9fc0'), srgb('#e07aa0')
def paint(P, N, tag, t, at):
    h, w, yc = at(max(0.0, min(1.0, t))); up = (P.y - yc) / max(1e-6, h)
    if tag.startswith('fin'):
        c = mix(FIN, FIN2, smooth(0.35, 0.65, 0.5 + 0.5 * math.sin(P.y * 70 + P.z * 20)) * 0.6)
        if tag == 'fin_c': c = mix(FIN, FIN2, smooth(0.6, 0.8, abs(P.y - yc) / (0.2 * L)))
        return mix(c, tuple(x * 0.8 for x in c), 0.35 * (0.5 + 0.5 * math.sin(P.z * 260 + P.y * 90)))
    c = mix(srgb('#5cc8a8'), GREEN, smooth(-0.8, 0.0, up)); c = mix(c, TEAL, 0.5 * smooth(0.2, 1.0, up))
    d, _ = worley(Vector((P.x, P.y * 1.25, P.z * 0.85)), 1 / (0.017 * 1.07), 5)       # the same cells as the relief
    c = mix(c, PINK, 0.55 * smooth(0.55, 0.85, d))                                    # pink edge on every scale
    if t > 0.93: c = mix(c, BEAK, smooth(0.93, 0.965, t))                             # the beak
    if 0.86 < t < 0.93 and up < 0.1: c = mix(c, PINK, 0.4)
    return c
SPEC = fish_spec('parrotfish', dict(
    L=L, paint=paint, speed=2.0, tris=1900, wave=0.8, beat=0.8,
    prof=[(0.0, .07, .03, 0), (0.12, .09, .04, 0), (0.3, .16, .07, .005), (0.5, .19, .085, .006), (0.7, .185, .085, .004),
          (0.85, .16, .08, .0), (0.93, .12, .07, -.008), (0.98, .07, .05, -.02), (1.0, .03, .03, -.022)],
    fins=dict(caudal=dict(shape='lunate', len=0.2, h=0.17),
              dorsal=dict(pts=[(0.8, .01), (0.75, .045), (0.6, .05), (0.45, .05), (0.3, .055), (0.18, .05), (0.14, .02)]),
              anal=dict(pts=[(0.42, .01), (0.38, .045), (0.28, .05), (0.17, .04), (0.14, .01)]),
              pect=dict(t=0.72, len=0.14, w=0.07, out=0.4, y=-0.05), pelvic=dict(t=0.66, len=0.08, w=0.04)),
    eye=(0.89, 0.32, 0.026, '#e8a050'), meta=dict(speeds={'fly': 2.0, 'walk': 0.4})))
