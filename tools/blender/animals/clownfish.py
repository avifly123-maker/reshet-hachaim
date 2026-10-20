# שושנון (Amphiprion bicinctus, the Red Sea anemonefish): deep oval orange body, two white bands edged in black
# (behind the eye and across the middle), rounded fins, a pale tail; lives among the tentacles of a sea anemone.
ORANGE, DEEP, BELLY = srgb('#f2780e'), srgb('#c9520a'), srgb('#f7a648')
WHITE, BLACK, FIN, TAILC = srgb('#f7f4ec'), srgb('#1b1714'), srgb('#f39a1c'), srgb('#f2dc9a')
L = 0.36
def paint(P, N, tag, t, at):
    h, w, yc = at(max(0.0, min(1.0, t)))
    if tag.startswith('fin'):
        c = mix(FIN, srgb('#f6b640'), 0.3 + 0.3 * nz(P, 60))
        if tag == 'fin_c': c = mix(TAILC, FIN, smooth(0.0, 0.04, (P.z + L / 2) * -1 + 0.02) * 0.0 + 0.25)
        if tag in ('fin_d', 'fin_a'):
            # the soft rays of the dorsal and anal fins end in a thin dark rim
            dy = abs(P.y - yc) - h
            c = mix(c, BLACK, 0.55 * smooth(0.06 * L, 0.085 * L, dy))
        c = mix(c, tuple(x * 0.82 for x in c), 0.4 * (0.5 + 0.5 * math.sin(P.z * 420 + P.y * 120)))
        return c
    up = (P.y - yc) / max(1e-6, h)
    c = mix(BELLY, ORANGE, smooth(-0.9, -0.2, up)); c = mix(c, DEEP, 0.45 * smooth(0.3, 1.0, up))
    c = mix(c, tuple(x * 0.9 for x in c), 0.25 * nz(P, 90))
    # two white bands with black edges; the head band bends forward a little above the eye
    hb = 0.755 + 0.025 * up
    for cen, half in ((hb, 0.032), (0.47 - 0.01 * up, 0.04)):
        d = abs(t - cen)
        c = mix(c, BLACK, smooth(half + 0.016, half + 0.006, d))
        c = mix(c, WHITE, smooth(half + 0.003, half - 0.004, d))
    if t > 0.955: c = mix(c, srgb('#e8682a'), 0.6)            # lips
    return c

SPEC = fish_spec('clownfish', dict(
    L=L, paint=paint, speed=1.4, tris=1500, wave=0.9,
    prof=[(0.0, .085, .034, 0), (0.12, .11, .045, 0), (0.3, .2, .072, .005), (0.5, .265, .088, .008), (0.65, .27, .092, .005),
          (0.8, .23, .088, -.004), (0.9, .17, .074, -.014), (0.97, .09, .05, -.024), (1.0, .035, .028, -.028)],
    fins=dict(caudal=dict(shape='round', len=0.22, h=0.16),
              dorsal=dict(pts=[(0.74, .02), (0.69, .07), (0.6, .085), (0.5, .075), (0.43, .06), (0.36, .1), (0.26, .115), (0.17, .08), (0.12, .03)]),
              anal=dict(pts=[(0.42, .02), (0.37, .085), (0.29, .105), (0.2, .07), (0.15, .02)]),
              pect=dict(t=0.68, len=0.15, w=0.1, out=0.5, y=-0.12), pelvic=dict(t=0.63, len=0.1, w=0.05)),
    eye=(0.865, 0.28, 0.042, '#e9a43a')))
