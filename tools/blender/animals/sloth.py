# עצלן (Bradypus, three-toed sloth) – shaggy grey-brown coat, small round head with a dark eye stripe and a pale face,
# long arms with three long curved claws, a stub tail. Spends its life hanging under branches, moving very slowly.
blobs = [
    dict(t='ell', c=(0, 0.3, -0.04), r=(0.12, 0.13, 0.2), bone='hips'),
    dict(t='ell', c=(0, 0.31, 0.12), r=(0.11, 0.12, 0.12), bone='chest'),
    dict(t='ell', c=(0, 0.35, 0.25), r=(0.07, 0.07, 0.065), bone='head'),
    dict(t='ell', c=(0, 0.34, 0.29), r=(0.045, 0.04, 0.03), bone='head'),
    dict(t='cap', a=(0, 0.31, -0.22), b2=(0, 0.29, -0.27), r=(0.03, 0.015), bone='hips'),
]
for sx, L in ((1, 'l'), (-1, 'r')):
    blobs += [
        dict(t='cap', a=(sx * 0.09, 0.33, 0.14), b2=(sx * 0.12, 0.17, 0.17), r=(0.04, 0.032), bone='f' + L),
        dict(t='cap', a=(sx * 0.12, 0.17, 0.17), b2=(sx * 0.12, 0.03, 0.19), r=(0.03, 0.022), bone='f' + L + '2'),
        dict(t='cap', a=(sx * 0.09, 0.28, -0.13), b2=(sx * 0.12, 0.15, -0.12), r=(0.04, 0.03), bone='h' + L),
        dict(t='cap', a=(sx * 0.12, 0.15, -0.12), b2=(sx * 0.12, 0.03, -0.13), r=(0.03, 0.022), bone='h' + L + '2'),
    ]
bones = [('hips', None, (0, 0.3, -0.18), (0, 0.3, 0.03)), ('chest', 'hips', (0, 0.3, 0.03), (0, 0.33, 0.18)),
         ('head', 'chest', (0, 0.34, 0.18), (0, 0.34, 0.3))]
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', (sx * 0.09, 0.34, 0.14), (sx * 0.12, 0.17, 0.17)), ('f' + L + '2', 'f' + L, (sx * 0.12, 0.17, 0.17), (sx * 0.12, 0.0, 0.19)),
              ('h' + L, 'hips', (sx * 0.09, 0.29, -0.13), (sx * 0.12, 0.15, -0.12)), ('h' + L + '2', 'h' + L, (sx * 0.12, 0.15, -0.12), (sx * 0.12, 0.0, -0.13))]

FUR, FUR2, GREEN, FACE, STRIPE = srgb('#8a7c66'), srgb('#5e5446'), srgb('#7a8a5a'), srgb('#e2d8c2'), srgb('#2a2018')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 40, y * 40, z * 40))); n2 = noise.noise(Vector((x * 160, y * 160, z * 160)))
    c = mix(FUR, FUR2, 0.3 + 0.3 * n + 0.25 * n2)                     # shaggy, streaky
    c = mix(c, GREEN, 0.25 * smooth(0.0, 0.6, n))                        # a hint of algae in the fur
    if z > 0.24:   # pale face, dark stripe through the eye
        c = mix(c, FACE, 0.8 * smooth(0.24, 0.27, z))
        c = mix(c, STRIPE, 0.9 * math.exp(-((abs(x) - 0.03) ** 2 / 0.022 ** 2 + (y - 0.36) ** 2 / 0.008 ** 2)))
    return c

parts = []
for sx, L in ((1, 'l'), (-1, 'r')):
    parts += eye_parts((sx * 0.026, 0.362, 0.3), 0.007, 'head', '#0a0806', (sx * 0.5, 0.2, 0.8))
    for leg, z0 in (('f', 0.19), ('h', -0.13)):   # three long curved claws
        cl = Part('claw', bone=leg + L + '2', color=srgb('#cfc4ac'), mat=1)
        for k in (-1, 0, 1):
            b = Vector((sx * 0.12 + k * 0.014, 0.03, z0))
            cl.add(*tube([b, b + Vector((0, -0.04, 0.012)), b + Vector((0, -0.07, -0.005))], [0.006, 0.004, 0.0012], 4))
        parts.append(cl)
nose = Part('nose', bone='head', mat=1, color=srgb('#1a1412')); nose.add(*ellipsoid((0, 0.345, 0.318), (0.012, 0.009, 0.006), 6, 4)); parts.append(nose)

names = [b[0] for b in bones]
acts = quad_actions(names, dict(amp=22, knee=30, run_amp=26, bob=0.01, drop=0.2, head_eat=25, look=40,
                                frames=dict(walk=90, idle=180, eat=90, sleep=150)))
H = (0, 0.3, -0.18)
def hang_arms(p, ph):        # arms and legs reach up to the branch, the body swings a little
    for L in ('fl', 'fr', 'hl', 'hr'):
        a = p.get(L, (0, 0, 0)); p[L] = (a[0] * 0.5, a[1], a[2])
def head_up(p, ph):
    h = p.get('head', (0, 0, 0)); p['head'] = (h[0] - 25, h[1], h[2])
acts['hang'] = (180, reorient(acts['idle'][1], H, 'hang', head_up))
acts['climb'] = (90, reorient(acts['walk'][1], H, 'climb'))
_eat = reorient(acts['eat'][1], H, 'hang', head_up)
acts['eat'] = (90, _eat)
acts['sleep'] = (150, reorient(acts['sleep'][1], H, 'hang'))
SPEC = dict(id='sloth', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.0075, tris=2200, smooth=14, actions=acts,
            meta=dict(height=0.4, length=0.7, speeds={'walk': 0.12, 'run': 0.25}, gripY={'hang': 0.0},
                      map={'perch': 'hang', 'idle': 'hang', 'run': 'walk', 'swim': 'walk', 'sit': 'hang'}))
