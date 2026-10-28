# גמל חד־דבשתי (Camelus dromedarius) – modelled on its own, the way a 3D designer would build it: a deep barrel body with
# one big hump of fat that rises out of the back (part of the body, not a ball on top), a long thick neck that dips
# forward and rises to a long head with a soft drooping upper lip and heavy-lidded eyes, small round ears grown from
# the skull, long legs with knobby knees and broad soft pads for feet (no hooves), a thin tail with a tuft. Sandy tan,
# darker on the hump, paler on the legs and belly, dark calluses on the knees.
own('camel')   # modelled on its own: no family tweaks from the kit
blobs = [
    dict(t='ell', c=(0, 1.42, -0.32), r=(0.3, 0.34, 0.42), bone='hips'),
    dict(t='ell', c=(0, 1.45, 0.28), r=(0.31, 0.38, 0.42), bone='chest'),
    dict(t='ell', c=(0, 1.78, -0.02), r=(0.22, 0.3, 0.36), bone='chest'),          # the hump, grown out of the back
    dict(t='ell', c=(0, 1.6, -0.02), r=(0.26, 0.22, 0.4), bone='chest'),           # its broad base
    dict(t='ell', c=(0, 1.22, 0.42), r=(0.16, 0.12, 0.14), bone='chest'),          # the chest pad it kneels on
    # the neck: forward and down from the shoulders, then up to the head
    dict(t='cap', a=(0, 1.52, 0.55), b2=(0, 1.42, 0.98), r=(0.17, 0.13), bone='neck'),
    dict(t='cap', a=(0, 1.42, 0.98), b2=(0, 1.78, 1.2), r=(0.13, 0.1), bone='neck'),
    # the head: a long skull, a soft heavy muzzle, the drooping split upper lip
    dict(t='ell', c=(0, 1.85, 1.28), r=(0.11, 0.11, 0.15), bone='head'),
    dict(t='cap', a=(0, 1.83, 1.36), b2=(0, 1.74, 1.58), r=(0.085, 0.07), bone='head'),
    dict(t='ell', c=(0, 1.7, 1.6), r=(0.07, 0.045, 0.055), bone='head'),
    dict(t='ell', c=(0, 1.73, 1.5), r=(0.06, 0.04, 0.09), bone='head'),            # the lower jaw
    # the tail
    dict(t='cap', a=(0, 1.55, -0.72), b2=(0, 1.08, -0.8), r=(0.045, 0.025), bone='hips'),
    dict(t='ell', c=(0, 1.02, -0.81), r=(0.035, 0.07, 0.03), bone='hips'),
]
for sx, L in ((1, 'l'), (-1, 'r')):
    blobs += [
        # front leg: a long forearm, a knobby knee, a long cannon, a broad pad
        dict(t='cap', a=(sx * 0.19, 1.3, 0.45), b2=(sx * 0.18, 0.78, 0.48), r=(0.12, 0.075), bone='f' + L),
        dict(t='ell', c=(sx * 0.18, 0.76, 0.49), r=(0.075, 0.07, 0.075), bone='f' + L + '2'),
        dict(t='cap', a=(sx * 0.18, 0.74, 0.49), b2=(sx * 0.18, 0.1, 0.5), r=(0.058, 0.05), bone='f' + L + '2'),
        dict(t='ell', c=(sx * 0.18, 0.045, 0.55), r=(0.095, 0.045, 0.13), bone='f' + L + '2', foot=True),
        # hind leg: a big thigh, the hock, the cannon, the pad
        dict(t='ell', c=(sx * 0.21, 1.22, -0.48), r=(0.13, 0.3, 0.22), bone='h' + L),
        dict(t='cap', a=(sx * 0.2, 0.98, -0.58), b2=(sx * 0.19, 0.6, -0.68), r=(0.08, 0.06), bone='h' + L),
        dict(t='ell', c=(sx * 0.19, 0.58, -0.68), r=(0.06, 0.06, 0.07), bone='h' + L + '2'),
        dict(t='cap', a=(sx * 0.19, 0.56, -0.67), b2=(sx * 0.19, 0.1, -0.6), r=(0.056, 0.05), bone='h' + L + '2'),
        dict(t='ell', c=(sx * 0.19, 0.045, -0.55), r=(0.09, 0.045, 0.125), bone='h' + L + '2', foot=True),
    ]
bones = [('hips', None, (0, 1.42, -0.75), (0, 1.45, 0.0)), ('chest', 'hips', (0, 1.45, 0.0), (0, 1.52, 0.55)),
         ('neck', 'chest', (0, 1.52, 0.55), (0, 1.78, 1.2)), ('head', 'neck', (0, 1.82, 1.2), (0, 1.72, 1.62))]
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', (sx * 0.19, 1.3, 0.45), (sx * 0.18, 0.76, 0.49)), ('f' + L + '2', 'f' + L, (sx * 0.18, 0.76, 0.49), (sx * 0.18, 0.0, 0.52)),
              ('h' + L, 'hips', (sx * 0.21, 1.35, -0.45), (sx * 0.19, 0.58, -0.68)), ('h' + L + '2', 'h' + L, (sx * 0.19, 0.58, -0.68), (sx * 0.19, 0.0, -0.57))]
E = blob_ears(blobs, bones, base=(0.075, 1.93, 1.2), d=(0.7, 0.6, -0.4), H=0.075, w=0.032, t=0.012, tip=0.8)
EYE['camel'] = ('#2a1a0c', 'round', 0.8, 0.5)

TAN, TAN2, HUMP, PALE, CALLUS, DARK = srgb('#cda06a'), srgb('#b88c58'), srgb('#a87a46'), srgb('#e2c99c'), srgb('#6a5236'), srgb('#4a3826')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 14, y * 14, z * 14))); n2 = noise.noise(Vector((x * 60, y * 60, z * 60)))
    c = mix(TAN, TAN2, 0.35 + 0.3 * n + 0.1 * n2)
    e = ear_paint(P, N, E)
    if e: return mix(c, PALE, e[2] * 0.7)
    c = mix(c, HUMP, smooth(1.65, 1.95, y) * smooth(0.5, 0.2, abs(z)) * 0.8)            # darker shaggy hump
    c = mix(c, PALE, smooth(1.2, 1.0, y) * smooth(-0.2, -0.6, N.y) * 0.6)               # pale belly
    if y < 0.95 and abs(x) > 0.1: c = mix(c, PALE, 0.35)                                 # paler legs
    if abs(x) > 0.1 and z > 0.4: c = mix(c, CALLUS, smooth(0.06, 0.02, abs(y - 0.76)) * smooth(0.2, 0.7, N.z) * 0.6)   # soft knee calluses, in front only
    if y < 0.06: c = mix(c, DARK, 0.5)                                                   # the pads' edges
    if z > 1.5 and y < 1.78: c = mix(c, PALE, 0.4)                                       # pale soft muzzle
    if z < -0.75 and y < 1.1: c = mix(c, DARK, 0.6)                                      # the tail tuft
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.085, 1.9, 1.33), 0.026, 'head', '#2a1a0c', (sx, 0.25, 0.55))
    lid = Part('lid', bone='head', color=TAN2); lid.add(*ellipsoid((sx * 0.087, 1.918, 1.333), (0.03, 0.012, 0.032), 10, 6)); parts.append(lid)   # the heavy lid
nos = Part('nose', bone='head', mat=1, color=DARK)
for sx in (1, -1): nos.add(*ellipsoid((sx * 0.03, 1.76, 1.63), (0.012, 0.006, 0.016), 8, 5))       # slit nostrils
parts.append(nos)

names = [b[0] for b in bones]
acts = quad_actions(names, dict(amp=22, knee=50, run_amp=38, bob=0.03, drop=1.0, head_eat=35, neck_eat=55, look=25, tailsw=20, earflick=15,
                                frames=dict(walk=36, run=18, idle=160, eat=70, sleep=140)))
SPEC = dict(id='camel', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.012, tris=5200, smooth=12, actions=acts,
            meta=dict(height=2.2, length=2.6, speeds={'walk': 1.1, 'run': 5.0}, map={'swim': 'walk', 'sit': 'sleep'}))
