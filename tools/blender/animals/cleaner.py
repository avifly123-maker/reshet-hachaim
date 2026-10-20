# שפרנון מנקה (Labroides dimidiatus, the bluestreak cleaner wrasse): a small slender fish, pale at the front, a black
# band from the snout through the eye that widens toward the tail, the back half bright blue. Big fish come to its
# "cleaning station" and let it pick parasites off their skin and gills.
L = 0.3
WHITE, BLUE, BLACK, PALE = srgb('#e8eef8'), srgb('#2b6ff0'), srgb('#10131a'), srgb('#9cc4f0')
def paint(P, N, tag, t, at):
    h, w, yc = at(max(0.0, min(1.0, t))); up = (P.y - yc) / max(1e-6, h)
    blue = smooth(0.85, 0.2, t)
    if tag.startswith('fin'):
        if tag == 'fin_c': return mix(BLUE, BLACK, smooth(0.04 * L, 0.0, abs(P.y - yc)))
        if tag == 'fin_p': return mix(PALE, WHITE, 0.4)
        return mix(mix(WHITE, BLUE, blue), BLACK, 0.25 * smooth(0.025 * L, 0.04 * L, abs(P.y - yc) - h))
    c = mix(WHITE, PALE, 0.4 * smooth(-0.6, 0.6, up)); c = mix(c, BLUE, blue * smooth(-0.9, -0.3, up) * 0.9)
    half = 0.16 + 0.42 * (1 - t)             # the stripe widens toward the tail
    band = smooth(half + 0.08, half - 0.02, abs(up + 0.02))
    c = mix(c, BLACK, band * smooth(0.99, 0.94, t))
    return c
SPEC = fish_spec('cleaner', dict(
    L=L, paint=paint, speed=1.8, tris=1300, wave=1.1,
    prof=[(0.0, .065, .035, 0), (0.15, .08, .045, 0), (0.4, .11, .06, 0), (0.6, .115, .062, 0), (0.8, .1, .058, 0),
          (0.92, .07, .045, -.004), (0.98, .04, .03, -.008), (1.0, .02, .02, -.01)],
    fins=dict(caudal=dict(shape='trunc', len=0.18, h=0.12),
              dorsal=dict(pts=[(0.75, .01), (0.7, .035), (0.4, .04), (0.2, .04), (0.14, .01)]),
              anal=dict(pts=[(0.45, .01), (0.4, .035), (0.22, .035), (0.15, .01)]),
              pect=dict(t=0.74, len=0.13, w=0.06, out=0.4, y=0.0), pelvic=dict(t=0.7, len=0.06, w=0.03)),
    eye=(0.885, 0.2, 0.034, '#d9c070')))
