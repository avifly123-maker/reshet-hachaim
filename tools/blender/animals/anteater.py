# נמלן ענק (Myrmecophaga tridactyla) – long tube snout, tiny eyes and ears, grey coat with a black band edged in white from
# chest to shoulder, pale forelegs with a black wrist band, walks on its knuckles, huge flag-like bushy tail.
TAIL = [(0, 0.55, -0.5), (0, 0.5, -0.7), (0, 0.45, -0.9), (0, 0.4, -1.1)]
blobs = [
    dict(t='ell', c=(0, 0.52, -0.12), r=(0.14, 0.2, 0.42), bone='hips'),
    dict(t='ell', c=(0, 0.52, 0.22), r=(0.13, 0.2, 0.22), bone='chest'),
    dict(t='ell', c=(0, 0.66, 0.0), r=(0.04, 0.08, 0.38), bone='hips'),                 # dorsal mane
    dict(t='cap', a=(0, 0.52, 0.38), b2=(0, 0.47, 0.6), r=(0.09, 0.06), bone='neck'),
    dict(t='cap', a=(0, 0.47, 0.6), b2=(0, 0.42, 0.85), r=(0.055, 0.035), bone='head'),
    dict(t='cap', a=(0, 0.42, 0.85), b2=(0, 0.38, 1.05), r=(0.035, 0.018), bone='snout'),
    # the flag tail: tall, flat, long hair hanging down
    dict(t='ell', c=(0, 0.5, -0.6), r=(0.05, 0.15, 0.18), rot=(8, 0, 0), bone='tail1'),
    dict(t='ell', c=(0, 0.44, -0.78), r=(0.045, 0.2, 0.2), rot=(10, 0, 0), bone='tail2'),
    dict(t='ell', c=(0, 0.38, -0.96), r=(0.04, 0.21, 0.2), rot=(14, 0, 0), bone='tail3'),
    dict(t='ell', c=(0, 0.34, -1.1), r=(0.03, 0.16, 0.12), rot=(20, 0, 0), bone='tail3'),
]
for sx, L in ((1, 'l'), (-1, 'r')):
    blobs += [
        dict(t='ell', c=(sx * 0.09, 0.42, 0.28), r=(0.06, 0.14, 0.08), bone='f' + L),
        dict(t='cap', a=(sx * 0.1, 0.3, 0.3), b2=(sx * 0.1, 0.06, 0.32), r=(0.055, 0.045), bone='f' + L + '2'),
        dict(t='ell', c=(sx * 0.1, 0.04, 0.33), r=(0.05, 0.04, 0.06), bone='f' + L + '2'),
        dict(t='ell', c=(sx * 0.1, 0.42, -0.36), r=(0.07, 0.16, 0.12), bone='h' + L),
        dict(t='cap', a=(sx * 0.1, 0.28, -0.4), b2=(sx * 0.1, 0.04, -0.38), r=(0.05, 0.04), bone='h' + L + '2'),
        dict(t='ell', c=(sx * 0.1, 0.03, -0.34), r=(0.045, 0.03, 0.07), bone='h' + L + '2'),
    ]
bones = [('hips', None, (0, 0.52, -0.5), (0, 0.52, 0.05)), ('chest', 'hips', (0, 0.52, 0.05), (0, 0.52, 0.38)),
         ('neck', 'chest', (0, 0.52, 0.38), (0, 0.47, 0.6)), ('head', 'neck', (0, 0.47, 0.6), (0, 0.42, 0.85)),
         ('snout', 'head', (0, 0.42, 0.85), (0, 0.38, 1.06))] + chain('tail', TAIL, 'hips')
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', (sx * 0.09, 0.52, 0.27), (sx * 0.1, 0.3, 0.3)), ('f' + L + '2', 'f' + L, (sx * 0.1, 0.3, 0.3), (sx * 0.1, 0.0, 0.33)),
              ('h' + L, 'hips', (sx * 0.1, 0.52, -0.33), (sx * 0.1, 0.28, -0.4)), ('h' + L + '2', 'h' + L, (sx * 0.1, 0.28, -0.4), (sx * 0.1, 0.0, -0.36))]

GREY, GREY2, BLACK, WHITE, DARK = srgb('#8c867c'), srgb('#5f5a52'), srgb('#151311'), srgb('#e6e2d8'), srgb('#3a3632')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 30, y * 30, z * 30))); n2 = noise.noise(Vector((x * 120, y * 120, z * 120)))
    c = mix(GREY, GREY2, 0.3 + 0.3 * n + 0.2 * n2)
    if z < -0.5: return mix(mix(GREY, DARK, 0.45 + 0.35 * n2), BLACK, smooth(0.36, 0.2, y) * 0.6)      # coarse, darker below
    # the diagonal shoulder band: from the throat up and back over the shoulder
    t = (y - 0.36) * 1.0 - (0.42 - z) * 0.55
    if z > -0.05 and abs(x) > 0.02:
        c = mix(c, BLACK, smooth(0.07, 0.04, abs(t)) * 0.95)
        c = mix(c, WHITE, smooth(0.035, 0.0, abs(abs(t) - 0.085)) * 0.9 * (t > 0))
    if y < 0.45 and z > 0.15 and abs(x) > 0.05:      # pale forelegs with a black wrist band
        c = mix(c, WHITE, 0.75); c = mix(c, BLACK, smooth(0.025, 0.0, abs(y - 0.12)) * 0.9)
    if y < 0.3 and z < 0.0: c = mix(c, DARK, 0.6)
    if z > 0.75: c = mix(c, DARK, 0.5)
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.04, 0.5, 0.74), 0.008, 'head', '#050403', (sx, 0.2, 0.5))
    parts.append(ear_part((sx * 0.05, 0.53, 0.66), (sx * 0.7, 1, -0.4), 0.018, 0.022, 'head', GREY2, GREY, thick=0.005, cup=0.3))
    # big curled foreclaws (knuckle walking)
    cl = Part('claw', bone='f' + ('l' if sx > 0 else 'r') + '2', color=srgb('#cfc6b2'))
    for k in (-1, 0, 1):
        b = Vector((sx * (0.1 + k * 0.025), 0.03, 0.36)); cl.add(*tube([b, b + Vector((0, -0.015, 0.025)), b + Vector((0, -0.028, 0.01))], [0.009, 0.006, 0.002], 4))
    parts.append(cl)
nose = Part('nose', bone='snout', mat=1, color=srgb('#141210')); nose.add(*ellipsoid((0, 0.38, 1.06), (0.018, 0.016, 0.008), 8, 5)); parts.append(nose)

names = [b[0] for b in bones]
acts = quad_actions(names, dict(amp=22, knee=34, run_amp=32, bob=0.02, drop=0.3, head_eat=45, neck_eat=35, look=25, tailsw=6,
                                frames=dict(walk=40, run=20, idle=150, eat=48, sleep=120)))
for k in list(acts):
    fr, fn = acts[k]
    def w(ph, fn=fn, k=k):
        p = fn(ph); a = 1.5 if k == 'eat' else 0.6
        p['snout'] = (6 * a * math.sin(TAU * ph * 4), 6 * a * math.sin(TAU * ph * 3), 0)
        if k == 'sleep':      # covers itself with the tail
            p['tail1'] = (-40, 30, 0); p['tail2'] = (-20, 40, 0); p['tail3'] = (0, 40, 0)
        return p
    acts[k] = (fr, w)
SPEC = dict(id='anteater', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.01, tris=3000, smooth=14, actions=acts,
            meta=dict(height=0.72, length=2.0, speeds={'walk': 0.6, 'run': 2.8}, map={'swim': 'walk', 'sit': 'idle'}))
