# פרפרון (Chaetodon fasciatus, the Red Sea raccoon butterflyfish): a round, very flat body, bright yellow with slanting
# dark stripes, a black mask over the eye with a white band behind it, a little pointed snout for picking tiny animals
# out of the coral; usually seen in pairs.
L = 0.42
YEL, YEL2, STRIPE, BLACK, WHITE, ORANGE = srgb('#ffd21f'), srgb('#f6b51a'), srgb('#9a6a1a'), srgb('#14110d'), srgb('#f6f2e8'), srgb('#f08a1a')
def paint(P, N, tag, t, at):
    h, w, yc = at(max(0.0, min(1.0, t))); up = (P.y - yc) / max(1e-6, h)
    if tag.startswith('fin'):
        c = YEL2 if tag != 'fin_c' else YEL
        if tag in ('fin_d', 'fin_a'): c = mix(c, BLACK, 0.7 * smooth(0.02 * L, 0.03 * L, abs(P.y - yc) - h - 0.05 * L) )
        if tag == 'fin_c': c = mix(c, BLACK, 0.6 * smooth(0.13 * L, 0.16 * L, -(P.z) - L * 0.5))
        return mix(c, tuple(x * 0.85 for x in c), 0.3 * (0.5 + 0.5 * math.sin(P.z * 300 + P.y * 100)))
    c = mix(YEL, YEL2, 0.4 * smooth(-0.2, 0.8, up))
    s = 0.5 + 0.5 * math.cos((P.z * 0.55 + P.y) * 2 * math.pi / (0.07 * L))    # slanting stripes
    c = mix(c, STRIPE, 0.75 * smooth(0.8, 0.95, s) * smooth(0.85, 0.7, t))
    mask = smooth(0.06, 0.03, abs(t - 0.86 + 0.06 * up)) * smooth(-0.5, 0.0, up)   # black mask through the eye
    c = mix(c, BLACK, mask)
    c = mix(c, WHITE, smooth(0.025, 0.012, abs(t - 0.79 + 0.05 * up)) * smooth(-0.2, 0.2, up))
    if t > 0.96: c = mix(c, BLACK, 0.6)
    return c
SPEC = fish_spec('butterflyfish', dict(
    L=L, paint=paint, speed=1.5, tris=1500, wave=0.6, stiff=0.3,
    prof=[(0.0, .07, .02, 0), (0.12, .14, .025, 0), (0.3, .3, .035, .0), (0.5, .38, .04, .0), (0.68, .36, .042, .01),
          (0.82, .25, .038, .0), (0.9, .14, .03, -.02), (0.96, .05, .02, -.03), (1.0, .02, .012, -.032)],
    fins=dict(caudal=dict(shape='trunc', len=0.15, h=0.15),
              dorsal=dict(pts=[(0.78, .01), (0.7, .06), (0.5, .07), (0.3, .08), (0.15, .06), (0.08, .015)], sink=0.7),
              anal=dict(pts=[(0.55, .01), (0.45, .07), (0.3, .08), (0.15, .06), (0.08, .015)], sink=0.7),
              pect=dict(t=0.72, len=0.12, w=0.06, out=0.35, y=-0.05), pelvic=dict(t=0.66, len=0.08, w=0.035)),
    eye=(0.86, 0.12, 0.035, '#20180c'), eyeRing='#c9a040'))
