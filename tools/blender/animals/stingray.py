# חתול ים (Taeniura lymma, the blue-spotted ribbontail ray): a round flat disc, olive-tan with bright blue spots, eyes
# on top, a tail with two blue stripes along it and a venomous spine. It rests on the sand under ledges and feeds on
# worms, shrimps and small crabs it digs out of the sand; it swims by rippling the edges of its disc.
TAN, OLIVE, BLUE, BELLY = srgb('#b49a5a'), srgb('#8a7a46'), srgb('#2a8aff'), srgb('#f2ece2')
DX, DZ, DY = 0.34, 0.36, 0.055
bones = [('body', None, (0, 0.06, -0.1), (0, 0.06, 0.15))]
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('w%s1' % L, 'body', (sx * 0.1, 0.06, 0.0), (sx * 0.24, 0.06, 0.0)), ('w%s2' % L, 'w%s1' % L, (sx * 0.24, 0.06, 0.0), (sx * DX, 0.06, -0.02))]
tail = [(0, 0.06, -0.3), (0, 0.065, -0.42), (0, 0.07, -0.55), (0, 0.075, -0.68)]
bones += chain('tail', tail, 'body')
blobs = [dict(t='ell', c=(0, 0.065, 0.02), r=(0.14, 0.06, 0.2), bone='body'),
         dict(t='ell', c=(0, 0.075, 0.07), r=(0.07, 0.055, 0.09), bone='body')]
for sx, L in ((1, 'l'), (-1, 'r')):
    blobs += [dict(t='ell', c=(sx * 0.15, 0.055, 0.0), r=(0.12, 0.04, 0.27), bone='w%s1' % L),
              dict(t='ell', c=(sx * 0.25, 0.05, -0.01), r=(0.1, 0.022, 0.21), bone='w%s2' % L)]
blobs += [dict(t='cap', a=tail[0], b2=tail[1], r=(0.045, 0.03), bone='tail1'),
          dict(t='cap', a=tail[1], b2=tail[2], r=(0.03, 0.018), bone='tail2'),
          dict(t='cap', a=tail[2], b2=tail[3], r=(0.018, 0.006), bone='tail3')]
parts = []
for sx in (1, -1):
    parts += fish_eye((sx * 0.055, 0.12, 0.1), 0.017, sx, iris='#d8c080', bone='body')
sp = Part('spine', bone='tail2', color=srgb('#e8e0d0'))
sp.add(*tube([(0, 0.095, -0.45), (0, 0.105, -0.52)], [0.006, 0.001], 4)); parts.append(sp)
def paint(P, N, tag):
    if tag == 'spine': return srgb('#e8e0d0')
    if N.y < -0.3: return mix(BELLY, srgb('#e0d4c4'), 0.3 * noise.noise(P * 30))
    c = mix(TAN, OLIVE, 0.4 + 0.3 * noise.noise(P * 18))
    if P.z < -0.28:   # the tail: two blue stripes
        c = mix(c, BLUE, smooth(0.012, 0.006, abs(abs(P.x) - 0.012)))
        return c
    d, rid = worley(Vector((P.x, 0, P.z)), 1 / 0.05, 13)
    c = mix(c, BLUE, smooth(0.28, 0.18, d * (0.8 + 0.4 * rid)))
    return c
def S(x): return math.sin(TAU * x)
def ripple(ph, amp, lift=0.0):
    p = {'body': ((0, 0, 0), (0, lift, 0))}
    for L, sd in (('l', 1), ('r', -1)):
        p['w%s1' % L] = (0, 0, sd * amp * 0.5 * S(ph)); p['w%s2' % L] = (0, 0, sd * amp * S(ph - 0.15))
    for i in range(3): p['tail%d' % (i + 1)] = (0, 6 * S(ph * 0.5 - i * 0.15), 0)
    return p
def walk(ph): return ripple(ph, 22, 0.03)
def run(ph): return ripple(ph * 1.0, 34, 0.06)
def idle(ph): return ripple(ph, 3)
def eat(ph): p = ripple(ph * 2, 8); p['body'] = ((6 * max(0, S(ph * 2)), 0, 0), None); return p
def sleep(ph): return ripple(ph, 1)
SPEC = dict(id='stingray', bones=bones, blobs=blobs, parts=parts, paint=paint, paintParts=True, res=0.008, tris=1600, skin='smooth',
            noLids=True, actions={'walk': (40, walk), 'run': (24, run), 'idle': (120, idle), 'eat': (60, eat), 'sleep': (120, sleep)},
            meta=dict(rough=0.45, height=0.14, length=1.05, speeds={'walk': 0.6, 'run': 1.4}, map={'sit': 'idle', 'swim': 'walk'}))
