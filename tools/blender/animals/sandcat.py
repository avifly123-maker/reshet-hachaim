# חתול החולות (Felis margarita) – a small, pale sandy cat with a broad flat head, big ears set wide and low (they hear
# prey under the sand), a reddish line from the eye across the cheek, faint dark bars on the legs, dark rings on the
# tail and a black tip, thick fur under the paws. Built on the jaguar's skeleton and motion (jaguar.py): its own broad
# head, ears grown from the skull, markings and colours; scaled down by meta.scale.
base('jaguar', globals()); derive('jaguar', 'sandcat')
EYE['sandcat'] = ('#a8a050', 'round', 0.86, 0.55)
for bl in blobs:
    if bl.get('bone') == 'head':
        r = bl['r']; bl['r'] = (r[0] * 1.18, r[1], r[2]) if isinstance(r, (list, tuple)) and len(r) == 3 else r
parts = [p for p in parts if p.tag != 'ear']
E = blob_ears(blobs, bones, base=(0.08, 0.78, 0.55), d=(0.85, 0.75, -0.18), H=0.135, w=0.062, t=0.013, tip=0.7)
SAND, SAND2, WHITE, BAR, RUST, BLACK = srgb('#e0c896'), srgb('#cdb07c'), srgb('#f4ece0'), srgb('#9a8058'), srgb('#c08050'), srgb('#1a1410')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 22, y * 22, z * 22)))
    c = mix(SAND, SAND2, 0.3 + 0.3 * n)
    e = ear_paint(P, N, E)
    if e:
        along, across, inside = e
        return mix(mix(SAND2, BLACK, smooth(0.75, 0.95, along) * 0.6), mix(WHITE, srgb('#e8c8b0'), 0.4), inside)
    belly = smooth(0.56, 0.47, y) * smooth(-0.25, -0.65, N.y) if z > -0.5 else 0
    c = mix(c, WHITE, belly * 0.85)
    if z > 0.45:
        if z > 0.66 and y < 0.68: c = mix(c, WHITE, 0.75)
        cheek = abs((y - 0.72) + (z - 0.66) * 0.5)                                       # the reddish line across the cheek
        if abs(x) > 0.05: c = mix(c, RUST, smooth(0.012, 0.004, cheek) * 0.6)
        return c
    if z < -0.55:      # tail: dark rings, a black tip
        ring = smooth(0.8, 0.95, math.sin(z * 26))
        c = mix(c, BAR, ring * 0.8)
        if z < -1.1: c = mix(c, BLACK, 0.85)
        return c
    if y < 0.42 and abs(x) > 0.06: c = mix(c, BAR, smooth(0.8, 0.95, math.sin(y * 45)) * 0.6)   # faint bars on the legs
    return c
SPEC = dict(SPEC, id='sandcat', blobs=blobs, parts=parts, paint=paint)
SPEC['meta'] = dict(SPEC['meta'], scale=0.36)
