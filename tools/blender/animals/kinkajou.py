# קינקג'ו (Potos flavus) – soft golden-brown fur, round head, short muzzle, small round ears, big dark eyes (it is active at
# night), short legs and a long prehensile tail. Climbs and hangs among the branches.
TAIL = [(0, 0.17, -0.17), (0, 0.15, -0.3), (0, 0.11, -0.42), (0, 0.07, -0.52), (0, 0.06, -0.6)]
blobs = [
    dict(t='ell', c=(0, 0.17, -0.04), r=(0.075, 0.08, 0.15), bone='hips'),
    dict(t='ell', c=(0, 0.18, 0.08), r=(0.07, 0.078, 0.09), bone='chest'),
    dict(t='ell', c=(0, 0.21, 0.19), r=(0.058, 0.055, 0.058), bone='head'),
    dict(t='ell', c=(0, 0.195, 0.235), r=(0.032, 0.028, 0.03), bone='head'),
]
for a, b, r, bn in zip(TAIL[:-1], TAIL[1:], ((0.035, 0.028), (0.028, 0.022), (0.022, 0.016), (0.016, 0.01)), ['tail1', 'tail2', 'tail3', 'tail4']):
    blobs.append(dict(t='cap', a=a, b2=b, r=r, bone=bn))
for sx, L in ((1, 'l'), (-1, 'r')):
    blobs += [
        dict(t='cap', a=(sx * 0.05, 0.17, 0.1), b2=(sx * 0.055, 0.09, 0.11), r=(0.026, 0.02), bone='f' + L),
        dict(t='cap', a=(sx * 0.055, 0.09, 0.11), b2=(sx * 0.056, 0.015, 0.12), r=(0.019, 0.016), bone='f' + L + '2'),
        dict(t='ell', c=(sx * 0.056, 0.012, 0.135), r=(0.018, 0.011, 0.025), bone='f' + L + '2'),
        dict(t='ell', c=(sx * 0.055, 0.14, -0.1), r=(0.035, 0.065, 0.06), bone='h' + L),
        dict(t='cap', a=(sx * 0.056, 0.09, -0.13), b2=(sx * 0.056, 0.015, -0.11), r=(0.02, 0.016), bone='h' + L + '2'),
        dict(t='ell', c=(sx * 0.056, 0.012, -0.09), r=(0.018, 0.011, 0.03), bone='h' + L + '2'),
    ]
bones = [('hips', None, (0, 0.17, -0.15), (0, 0.175, 0.02)), ('chest', 'hips', (0, 0.175, 0.02), (0, 0.19, 0.14)),
         ('head', 'chest', (0, 0.2, 0.14), (0, 0.195, 0.26))] + chain('tail', TAIL, 'hips')
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', (sx * 0.05, 0.18, 0.1), (sx * 0.055, 0.09, 0.11)), ('f' + L + '2', 'f' + L, (sx * 0.055, 0.09, 0.11), (sx * 0.056, 0.0, 0.125)),
              ('h' + L, 'hips', (sx * 0.055, 0.17, -0.09), (sx * 0.056, 0.09, -0.13)), ('h' + L + '2', 'h' + L, (sx * 0.056, 0.09, -0.13), (sx * 0.056, 0.0, -0.1))]

GOLD, GOLD2, BELLY, DARK = srgb('#b8823e'), srgb('#946226'), srgb('#d8b070'), srgb('#4a3018')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 70, y * 70, z * 70)))
    c = mix(GOLD, GOLD2, 0.3 + 0.35 * n)
    c = mix(c, BELLY, smooth(0.13, 0.1, y) * smooth(-0.2, -0.6, N.y) * 0.7)
    if y > 0.23 and z < 0.1: c = mix(c, DARK, 0.25 * smooth(0.23, 0.25, y))      # darker stripe along the spine
    if z > 0.24: c = mix(c, DARK, 0.5)
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.03, 0.222, 0.235), 0.013, 'head', '#120804', (sx * 0.5, 0.2, 0.8))
    parts.append(ear_part((sx * 0.042, 0.245, 0.17), (sx * 0.9, 1, -0.2), 0.016, 0.02, 'head', GOLD2, BELLY, thick=0.003, cup=0.35))
nose = Part('nose', bone='head', mat=1, color=srgb('#1a1210')); nose.add(*ellipsoid((0, 0.198, 0.264), (0.012, 0.009, 0.006), 6, 4)); parts.append(nose)

names = [b[0] for b in bones]
acts = quad_actions(names, dict(amp=26, knee=40, run_amp=34, bob=0.012, drop=0.12, head_eat=30, look=35, tailsw=14,
                                frames=dict(walk=28, run=16, idle=150, eat=48, sleep=120)))
H = (0, 0.17, -0.15)
def tail_wrap(p, ph):
    for i in range(1, 5): p['tail%d' % i] = (-20, 0, 0)
acts['climb'] = (28, reorient(acts['walk'][1], H, 'climb', tail_wrap))
acts['hang'] = (150, reorient(acts['idle'][1], H, 'hang', tail_wrap))
SPEC = dict(id='kinkajou', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.0045, tris=2000, smooth=12, actions=acts,
            meta=dict(height=0.3, length=0.95, speeds={'walk': 0.6, 'run': 2.0}, gripY={'hang': 0.0, 'perch': 0.0},
                      map={'perch': 'idle', 'swim': 'walk', 'sit': 'idle'}))
