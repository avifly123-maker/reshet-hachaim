# חתול החולות (Felis margarita) – a small, pale sandy cat with a broad flat head, big ears set wide and low (they hear
# prey under the sand), a reddish line from the eye across the cheek, faint dark bars on the legs, dark rings on the
# tail and a black tip, thick fur under the paws. Kit v6: built on the cheetah (cheetah.py) and the kit's cat rules
# (felid body plan, anatomical cat legs); a stockier trunk and shorter-looking legs, a broad head, its own ears, plain
# sandy colours; scaled down by meta.scale (0.27 m at the shoulder).
base('cheetah', globals()); own('sandcat'); derive('cheetah', 'sandcat')   # own first: an earlier build may have left the jaguar's tweaks for it
EYE['sandcat'] = ('#a8a050', 'round', 0.86, 0.55)
ANAT['sandcat'] = ('cat', dict(ANAT['cheetah'][1], fa1=0.07, can=0.062, mt=0.06, gas1=0.062, paw=(0.1, 0.055, 0.13)))
blobs = [b for b in blobs if b.get('bone') not in ('earL', 'earR')]
HC = Vector((0, 0.88, 0.6)); HK = 1.32
for bl in blobs:
    if bl.get('bone') in ('hips', 'chest') and bl['t'] == 'ell' and not bl.get('keep'):
        r = bl['r']; c = bl['c']; bl['r'] = (r[0] * 1.12, r[1] * 1.06, r[2]); bl['c'] = (c[0], c[1] - r[1] * 0.08, c[2])   # a low, full body
    if bl.get('bone') == 'head' and 'c' in bl:   # a big, broad, flat head: larger all round, wider still
        r = bl['r']; bl['r'] = (r[0] * HK * 1.15, r[1] * HK * 0.95, r[2] * HK)
        c = Vector(bl['c']); bl['c'] = tuple(HC + Vector(((c - HC).x * HK * 1.15, (c - HC).y * HK * 0.95, (c - HC).z * HK)))
for p in parts:
    if p.bone == 'head': p.v = [tuple(HC + Vector(((Vector(v) - HC).x * HK * 1.15, (Vector(v) - HC).y * HK * 0.95, (Vector(v) - HC).z * HK))) for v in p.v]
# a sand cat is compact: short legs and a short body for its big head. Everything is pressed lower (y) and a little
# shorter (z); the radii shrink less, so it is stocky. The paint reads the cheetah's coordinates back (_back).
SX, SY, SZ = 1.05, 0.8, 0.92
def _t(p): return (p[0] * SX, p[1] * SY, p[2] * SZ)
for bl in blobs:
    for k in ('c', 'a', 'b2'):
        if k in bl: bl[k] = _t(bl[k])
    r = bl['r']
    bl['r'] = (r[0] * SX, r[1] * 0.92, r[2] * 0.97) if isinstance(r, (list, tuple)) and len(r) == 3 else tuple(x * 0.95 for x in r)
bones = [(n, par, _t(h), _t(t)) for (n, par, h, t) in bones]
for p in parts: p.v = [_t(v) for v in p.v]
E = blob_ears(blobs, bones, base=_t((0.088, 0.935, 0.55)), d=(0.85, 0.75, -0.15), H=0.11, w=0.064, t=0.012, tip=0.7)
def _back(P): return Vector((P.x / SX, P.y / SY, P.z / SZ))
SAND, SAND2, WHITE, BAR, RUST, BLACK = srgb('#e0c896'), srgb('#cdb07c'), srgb('#f4ece0'), srgb('#9a8058'), srgb('#c08050'), srgb('#1a1410')
def paint(P, N, tag):
    e0 = ear_paint(P, N, E)
    P = _back(P)
    if P.z > 0.47:   # the head was made bigger round HC: read its painting in the cheetah's head
        q = P - HC; P = HC + Vector((q.x / (HK * 1.15), q.y / (HK * 0.95), q.z / HK))
    x, y, z = P
    n = noise.noise(Vector((x * 22, y * 22, z * 22)))
    c = mix(SAND, SAND2, 0.3 + 0.3 * n)
    e = e0
    if e:
        along, across, inside = e
        return mix(mix(SAND2, BLACK, smooth(0.75, 0.95, along) * 0.7), mix(WHITE, srgb('#e8c8b0'), 0.4), inside * 0.8)
    belly = (smooth(0.62, 0.5, y) * smooth(-0.15, -0.6, N.y) if -0.5 < z < 0.4 else 0)
    belly = max(belly, smooth(0.86, 0.8, y) * smooth(0.36, 0.46, z) * smooth(0.56, 0.48, z) * smooth(-0.1, -0.5, N.y))   # the throat, underneath only
    c = mix(c, WHITE, belly * 0.85)
    if z > 0.5:   # the face: a white muzzle and chin, the reddish line from the eye across the cheek
        c = mix(c, WHITE, smooth(0.63, 0.66, z) * smooth(0.87, 0.85, y) * 0.75)
        c = mix(c, WHITE, smooth(0.0, 0.5, -N.y) * smooth(0.6, 0.63, z) * 0.6)
        for sx in (1, -1):
            dl = _seg(P, (sx * 0.055, 0.893, 0.64), (sx * 0.085, 0.87, 0.585))
            c = mix(c, RUST, smooth(0.008, 0.004, dl) * 0.75)
    if z < -0.6:      # tail: dark rings, a black tip
        ring = math.sin((z + 0.6) * 40)
        c = mix(c, BAR, smooth(0.6, 0.85, ring) * 0.8)
        if z < -1.1: c = mix(c, BLACK, 0.85)
    elif y < 0.45 and abs(x) > 0.06: c = mix(c, BAR, smooth(0.8, 0.95, math.sin(y * 45)) * 0.55 * smooth(-0.2, 0.3, N.z * 0 + abs(N.x)))   # faint bars on the legs
    return c
SPEC = dict(SPEC, id='sandcat', blobs=blobs, bones=bones, parts=parts, paint=paint)
SPEC['meta'] = dict(SPEC['meta'], scale=0.4)
