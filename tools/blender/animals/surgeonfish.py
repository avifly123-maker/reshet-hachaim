# מנתחן (Acanthurus sohal, the sohal surgeonfish, found only in the Red Sea and around Arabia): a deep, flat oval body,
# pale grey with many fine dark blue lines along it, a dark belly, black fins edged in electric blue, an orange
# patch around the sharp "scalpel" at the base of the tail, a crescent tail with long tips.
L = 0.62
GREY, LINE, DARK, BLUE, ORANGE = srgb('#cfd6dc'), srgb('#1f2a5a'), srgb('#2a3040'), srgb('#3f8cff'), srgb('#ff8a1a')
def paint(P, N, tag, t, at):
    h, w, yc = at(max(0.0, min(1.0, t))); up = (P.y - yc) / max(1e-6, h)
    if tag.startswith('fin'):
        c = DARK
        if tag in ('fin_d', 'fin_a', 'fin_c'):
            edge = abs(P.y - yc) - h
            c = mix(DARK, BLUE, smooth(0.035 * L, 0.05 * L, edge) if tag != 'fin_c' else smooth(0.13 * L, 0.17 * L, abs(P.y - yc)))
        if tag == 'fin_p': c = mix(DARK, ORANGE, 0.0 if P.z < 0.1 else 0.5)
        return mix(c, tuple(x * 0.8 for x in c), 0.3 * (0.5 + 0.5 * math.sin(P.z * 300 + P.y * 80)))
    c = GREY
    lines = 0.5 + 0.5 * math.cos(P.y * 2 * math.pi / (0.022 * L * 1.6) + 0.6 * math.sin(P.z * 9))
    c = mix(c, LINE, 0.85 * smooth(0.82, 0.95, lines) * smooth(-0.55, -0.1, up))
    c = mix(c, DARK, smooth(-0.35, -0.75, up))
    if t < 0.12: c = mix(c, ORANGE, smooth(0.035, 0.0, abs(t - 0.06) - 0.012) * smooth(-0.5, -0.2, abs(up) * -1) )
    if 0.83 < t < 0.88: c = mix(c, DARK, 0.4)                                  # gill cover edge
    return c
SPEC = fish_spec('surgeonfish', dict(
    L=L, paint=paint, speed=2.3, tris=1700, wave=0.85,
    prof=[(0.0, .07, .025, 0), (0.1, .1, .03, 0), (0.25, .2, .045, .0), (0.45, .28, .055, .0), (0.62, .3, .058, .0),
          (0.78, .26, .055, .01), (0.9, .18, .05, .02), (0.97, .09, .035, .03), (1.0, .03, .02, .03)],
    fins=dict(caudal=dict(shape='lunate', len=0.26, h=0.22),
              dorsal=dict(pts=[(0.86, .01), (0.8, .05), (0.6, .06), (0.4, .065), (0.2, .06), (0.1, .02)]),
              anal=dict(pts=[(0.6, .01), (0.55, .05), (0.4, .06), (0.2, .055), (0.1, .02)]),
              pect=dict(t=0.75, len=0.17, w=0.07, out=0.35, y=0.0), pelvic=dict(t=0.72, len=0.08, w=0.035)),
    eye=(0.87, 0.35, 0.03, '#c9a05a')))
