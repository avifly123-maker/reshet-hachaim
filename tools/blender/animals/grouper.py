# דקר (Cephalopholis miniata, the coral grouper / coral hind): a sturdy red-orange body covered with small bright blue
# spots, a big mouth, rounded tail; waits in a reef cave and darts out after small fish.
L = 1.0
RED, RED2, BLUE, DARK = srgb('#e04a24'), srgb('#b8321a'), srgb('#58b6ff'), srgb('#6a1a10')
def spots(P, scale):
    d, _ = worley(Vector((P.x, P.y, P.z)), 1 / scale, 21)
    return smooth(0.32, 0.22, d)
def paint(P, N, tag, t, at):
    h, w, yc = at(max(0.0, min(1.0, t))); up = (P.y - yc) / max(1e-6, h)
    if tag.startswith('fin'):
        c = mix(RED2, RED, 0.5)
        c = mix(c, BLUE, 0.8 * spots(P, 0.02))
        if tag in ('fin_c', 'fin_a', 'fin_d'): c = mix(c, srgb('#2a3a8a'), 0.0)
        return c
    c = mix(RED, RED2, 0.5 * smooth(-0.2, 1.0, up)); c = mix(c, srgb('#f07a4a'), 0.3 * smooth(-0.3, -1.0, up))
    c = mix(c, BLUE, 0.85 * spots(P, 0.024))
    if t > 0.95 and up < 0.0: c = mix(c, DARK, 0.3)
    return c
SPEC = fish_spec('grouper', dict(
    L=L, paint=paint, speed=2.4, tris=2000, wave=0.75,
    prof=[(0.0, .07, .04, 0), (0.12, .09, .055, 0), (0.3, .14, .085, 0), (0.5, .165, .1, 0), (0.7, .16, .1, 0),
          (0.85, .14, .09, -.004), (0.93, .11, .08, -.01), (0.98, .07, .06, -.02), (1.0, .035, .035, -.025)],
    mouthY=-0.01,
    fins=dict(caudal=dict(shape='round', len=0.2, h=0.13),
              dorsal=dict(pts=[(0.76, .01), (0.72, .05), (0.55, .055), (0.4, .06), (0.3, .08), (0.2, .07), (0.15, .02)]),
              anal=dict(pts=[(0.38, .01), (0.33, .07), (0.25, .08), (0.18, .05), (0.15, .01)]),
              pect=dict(t=0.73, len=0.15, w=0.08, out=0.45, y=-0.05), pelvic=dict(t=0.7, len=0.1, w=0.05)),
    eye=(0.88, 0.4, 0.028, '#c87040')))
