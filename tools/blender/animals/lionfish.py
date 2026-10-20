# זהרון (Pterois miles, the devil firefish / lionfish of the Red Sea): red-brown and white vertical stripes, a crest of
# long venomous dorsal spines joined by thin membranes, huge fan-like pectoral fins with striped rays, small tentacles
# over the eyes; hovers slowly and herds small fish into a corner with its spread fins.
L = 0.6
RED, WHITE, DARK, PALE = srgb('#b8402a'), srgb('#f4ece2'), srgb('#6a1e14'), srgb('#f0d8c8')
def stripes(t, up, k=1.0):
    s = 0.5 + 0.5 * math.cos(2 * math.pi * (t * 11.0 + 0.25 * up * k))
    return smooth(0.45, 0.6, s)
def paint(P, N, tag, t, at):
    h, w, yc = at(max(0.0, min(1.0, t))); up = (P.y - yc) / max(1e-6, h)
    if tag == 'spine':
        return mix(WHITE, RED, smooth(0.45, 0.55, 0.5 + 0.5 * math.sin(P.y * 180)))
    if tag == 'memb': return mix(PALE, RED, 0.25 + 0.25 * math.sin(P.y * 120))
    if tag.startswith('fin'):
        if tag == 'fin_p':
            r = (P - Vector((0, 0, 0))).length
            return mix(PALE, RED, smooth(0.4, 0.6, 0.5 + 0.5 * math.sin(r * 120 + P.y * 30)))
        sp, _ = worley(P, 1 / 0.012, 4)
        return mix(PALE, DARK, 0.75 * smooth(0.25, 0.15, sp))
    c = mix(RED, WHITE, stripes(t, up)); c = mix(c, DARK, 0.25 * smooth(0.3, 1.0, up))
    if up < -0.6: c = mix(c, PALE, 0.4)
    return c
def spines(L, at, z_of):
    out = []; sp = Part('spine', bones=['head', 'body', 'tail1']); mb = Part('memb', bones=['head', 'body', 'tail1'])
    ts = [0.76 - i * 0.03 for i in range(12)]
    tips = []
    for i, t in enumerate(ts):
        h, w, yc = at(t); base = Vector((0, yc + h * 0.7, z_of(t)))
        ln = L * (0.28 + 0.14 * math.sin(math.pi * min(1, (i + 1) / 7)) - 0.006 * i)
        tip = base + Vector((0, ln, -ln * 0.32))
        sp.add(*tube([tuple(base), tuple(base + (tip - base) * 0.5), tuple(tip)], [0.006 * L * 1.6, 0.004 * L * 1.6, 0.0008], 5))
        tips.append((base, tip))
    for (b0, t0), (b1, t1) in zip(tips, tips[1:]):        # membranes reach about two thirds up each spine
        a0 = b0 + (t0 - b0) * 0.62; a1 = b1 + (t1 - b1) * 0.55
        V = [tuple(b0), tuple(a0), tuple(a1), tuple(b1)]
        mb.add(V + [tuple(v + Vector((0.0015, 0, 0))) for v in map(Vector, V)], [(0, 1, 2, 3), (7, 6, 5, 4)])
    # tentacles above the eyes
    tn = Part('spine', bone='head')
    for sx in (1, -1):
        h, w, yc = at(0.88); b = Vector((sx * w * 0.5, yc + h * 0.75, z_of(0.88)))
        tn.add(*tube([tuple(b), tuple(b + Vector((sx * 0.01, 0.05 * L, 0.01 * L))), tuple(b + Vector((sx * 0.015, 0.09 * L, -0.005 * L)))], [0.006 * L, 0.004 * L, 0.001], 5))
    return [sp, mb, tn]
SPEC = fish_spec('lionfish', dict(
    L=L, paint=paint, speed=1.1, tris=1800, wave=0.55, beat=0.6,
    prof=[(0.0, .065, .035, 0), (0.12, .09, .045, 0), (0.3, .15, .07, .005), (0.5, .18, .085, .01), (0.68, .18, .09, .01),
          (0.82, .15, .085, .0), (0.92, .11, .07, -.01), (0.98, .06, .045, -.015), (1.0, .03, .025, -.018)],
    fins=dict(caudal=dict(shape='round', len=0.22, h=0.12),
              dorsal=dict(pts=[(0.4, .01), (0.36, .11), (0.25, .12), (0.16, .08), (0.12, .02)]),
              anal=dict(pts=[(0.4, .01), (0.35, .1), (0.25, .1), (0.17, .06), (0.13, .02)]),
              pect=dict(t=0.7, len=0.5, w=0.26, out=0.8, up=-0.1, y=-0.1, shape='fan'),
              pelvic=dict(t=0.66, len=0.18, w=0.06)),
    parts=[spines],
    eye=(0.86, 0.45, 0.032, '#c8401a')))
