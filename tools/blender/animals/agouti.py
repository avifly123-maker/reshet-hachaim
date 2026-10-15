# אגוטי (Dasyprocta) – glossy orange-brown rodent on long slender legs, high rump, small round ears, tiny tail.
blobs = [
    dict(t='ell', c=(0, 0.3, -0.07), r=(0.115, 0.13, 0.2), bone='hips'),
    dict(t='ell', c=(0, 0.27, 0.08), r=(0.095, 0.105, 0.12), bone='chest'),
    dict(t='ell', c=(0, 0.29, 0.2), r=(0.055, 0.06, 0.07), bone='head'),
    dict(t='cap', a=(0, 0.285, 0.23), b2=(0, 0.255, 0.31), r=(0.042, 0.02), bone='head'),
    dict(t='ell', c=(0, 0.25, 0.14), r=(0.06, 0.07, 0.06), bone='chest'),
    dict(t='cap', a=(0.05, 0.22, 0.11), b2=(0.055, 0.12, 0.12), r=(0.024, 0.016), bone='fl'),
    dict(t='cap', a=(0.055, 0.12, 0.12), b2=(0.055, 0.015, 0.13), r=(0.014, 0.011), bone='fl2'),
    dict(t='cap', a=(-0.05, 0.22, 0.11), b2=(-0.055, 0.12, 0.12), r=(0.024, 0.016), bone='fr'),
    dict(t='cap', a=(-0.055, 0.12, 0.12), b2=(-0.055, 0.015, 0.13), r=(0.014, 0.011), bone='fr2'),
    dict(t='ell', c=(0.07, 0.25, -0.15), r=(0.045, 0.09, 0.08), bone='hl'),
    dict(t='cap', a=(0.07, 0.17, -0.2), b2=(0.07, 0.04, -0.25), r=(0.02, 0.014), bone='hl2'),
    dict(t='cap', a=(0.07, 0.04, -0.25), b2=(0.07, 0.012, -0.19), r=(0.013, 0.01), bone='hl2'),
    dict(t='ell', c=(-0.07, 0.25, -0.15), r=(0.045, 0.09, 0.08), bone='hr'),
    dict(t='cap', a=(-0.07, 0.17, -0.2), b2=(-0.07, 0.04, -0.25), r=(0.02, 0.014), bone='hr2'),
    dict(t='cap', a=(-0.07, 0.04, -0.25), b2=(-0.07, 0.012, -0.19), r=(0.013, 0.01), bone='hr2'),
    dict(t='cap', a=(0, 0.33, -0.25), b2=(0, 0.31, -0.29), r=(0.018, 0.008), bone='hips'),     # tail stub
]
bones = [
    ('hips', None, (0, 0.3, -0.24), (0, 0.29, 0.0)),
    ('chest', 'hips', (0, 0.29, 0.0), (0, 0.28, 0.14)),
    ('head', 'chest', (0, 0.29, 0.15), (0, 0.255, 0.32)),
    ('fl', 'chest', (0.05, 0.23, 0.11), (0.055, 0.12, 0.12)), ('fl2', 'fl', (0.055, 0.12, 0.12), (0.055, 0.0, 0.135)),
    ('fr', 'chest', (-0.05, 0.23, 0.11), (-0.055, 0.12, 0.12)), ('fr2', 'fr', (-0.055, 0.12, 0.12), (-0.055, 0.0, 0.135)),
    ('hl', 'hips', (0.07, 0.29, -0.13), (0.07, 0.17, -0.2)), ('hl2', 'hl', (0.07, 0.17, -0.2), (0.07, 0.0, -0.19)),
    ('hr', 'hips', (-0.07, 0.29, -0.13), (-0.07, 0.17, -0.2)), ('hr2', 'hr', (-0.07, 0.17, -0.2), (-0.07, 0.0, -0.19)),
]
FUR, RUMP, BELLY, DARK, FACE = srgb('#c27a36'), srgb('#7a4a24'), srgb('#e3b47a'), srgb('#2e2016'), srgb('#9a5c2c')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 60, y * 60, z * 60)))
    c = mix(FUR, srgb('#a8642c'), 0.35 + 0.3 * n)
    c = mix(c, RUMP, smooth(-0.05, -0.2, z) * smooth(0.25, 0.36, y) * 0.75)     # darker, longer rump hair
    c = mix(c, BELLY, smooth(0.24, 0.18, y) * smooth(-0.1, -0.6, N.y) * 0.8)
    if z > 0.2: c = mix(c, FACE, 0.5)
    if y < 0.13 and abs(x) > 0.035: c = mix(c, DARK, smooth(0.13, 0.05, y) * 0.8)   # slim dark lower legs
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.04, 0.31, 0.24), 0.012, 'head', '#0c0806', (sx, 0.2, 0.6))
    parts.append(ear_part((sx * 0.032, 0.335, 0.185), (sx * 0.4, 1, -0.3), 0.02, 0.028, 'head', srgb('#7a4a2a'), srgb('#c08a6a'), thick=0.003, cup=0.4))
    parts.append(whiskers((sx * 0.015, 0.258, 0.305), sx, 'head', 4, 0.05, srgb('#1e1410')))
nose = Part('nose', bone='head', mat=1, color=srgb('#2a1a14')); nose.add(*ellipsoid((0, 0.262, 0.312), (0.014, 0.01, 0.008), 8, 5)); parts.append(nose)

names = [b[0] for b in bones]
acts = quad_actions(names, dict(amp=28, knee=45, run_amp=40, bob=0.012, drop=0.17, head_eat=40, sit=35, look=35,
                                run_bound=True, frames=dict(walk=22, run=12, idle=150, eat=60, sleep=120)))
SPEC = dict(id='agouti', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.004, tris=2000, smooth=12, actions=acts,
            meta=dict(height=0.45, length=0.65, speeds={'walk': 0.7, 'run': 4.0}, map={'swim': 'walk', 'sit': 'eat'}))
