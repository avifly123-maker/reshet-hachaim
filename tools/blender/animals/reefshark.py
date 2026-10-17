# כריש שונית (Carcharhinus melanopterus, the blacktip reef shark): a smooth, grey-brown streamlined body with a white
# belly, a rounded snout, black tips on all its fins (and a white band under the black on the first dorsal), five gill
# slits; swims calmly along the reef's edge and keeps the fish populations healthy.
L = 1.9
BACK, SIDE, BELLY, BLACK, WHITE = srgb('#8a8676'), srgb('#a8a392'), srgb('#f2efe6'), srgb('#151515'), srgb('#f6f4ee')
def paint(P, N, tag, t, at):
    h, w, yc = at(max(0.0, min(1.0, t))); up = (P.y - yc) / max(1e-6, h)
    if tag.startswith('fin'):
        c = BACK if tag != 'fin_v' else SIDE
        if tag == 'fin_p': c = mix(BELLY, BACK, smooth(-0.3, 0.3, N.y))
        far = abs(P.y - yc) - h if tag in ('fin_d', 'fin_a') else 0
        if tag == 'fin_d': c = mix(mix(c, WHITE, 0.6 * smooth(0.06 * L, 0.075 * L, far) * smooth(0.11 * L, 0.095 * L, far)), BLACK, smooth(0.1 * L, 0.115 * L, far))
        if tag == 'fin_c':
            c = mix(c, BLACK, smooth(0.16 * L, 0.2 * L, abs(P.y - yc)) + smooth(-0.6 * L, -0.66 * L, P.z) * 0.0)
        if tag == 'fin_p': c = mix(c, BLACK, smooth(0.18 * L, 0.24 * L, abs(P.x)))
        return c
    c = mix(BELLY, SIDE, smooth(-0.45, -0.05, up)); c = mix(c, BACK, smooth(0.0, 0.7, up))
    for k in range(5):                                         # gill slits
        tc = 0.745 + k * 0.013
        c = mix(c, tuple(x * 0.6 for x in c), smooth(0.003, 0.0, abs(t - tc)) * smooth(-0.6, -0.1, up) * smooth(0.5, 0.2, up))
    return c
SPEC = fish_spec('reefshark', dict(
    L=L, paint=paint, speed=2.6, tris=2400, wave=0.7, beat=0.6, skin='sharkskin',
    prof=[(0.0, .03, .025, .01), (0.1, .045, .035, .01), (0.3, .075, .065, .0), (0.5, .095, .085, .0), (0.65, .095, .085, .0),
          (0.8, .075, .075, .0), (0.9, .05, .06, -.004), (0.97, .03, .042, -.006), (1.0, .012, .02, -.008)],
    tbones=(0.0, 0.22, 0.45, 0.72), mouthY=-0.012,
    fins=dict(caudal=dict(shape='shark', len=0.27, h=0.2, tilt=0.6, inset=0.015),
              dorsal=dict(pts=[(0.6, .005), (0.56, .07), (0.53, .12), (0.5, .1), (0.47, .03), (0.45, .005)], thick=0.006),
              dorsal2=dict(pts=[(0.2, .005), (0.18, .035), (0.15, .02), (0.13, .005)], thick=0.005),
              anal=dict(pts=[(0.2, .005), (0.18, .03), (0.15, .02), (0.13, .005)], thick=0.005),
              pect=dict(t=0.67, len=0.22, w=0.09, out=0.9, up=-0.35, y=-0.3, shape='wing'),
              pelvic=dict(t=0.38, len=0.07, w=0.04)),
    eye=(0.9, 0.18, 0.011, '#7a8a5a'), eyeSink=0.2,
    meta=dict(speeds={'fly': 2.6, 'walk': 0.6}, rough=0.5)))
