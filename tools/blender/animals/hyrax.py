# שפן סלע (Procavia capensis) – round stocky body, short legs, no tail, small round ears, blunt face, dorsal gland spot.
blobs = [
    dict(t='ell', c=(0, 0.2, -0.01), r=(0.135, 0.14, 0.26), bone='hips'),
    dict(t='ell', c=(0, 0.205, 0.12), r=(0.115, 0.125, 0.13), bone='chest'),
    dict(t='ell', c=(0, 0.25, 0.25), r=(0.075, 0.075, 0.085), bone='head'),
    dict(t='cap', a=(0, 0.238, 0.29), b2=(0, 0.21, 0.355), r=(0.052, 0.03), bone='head'),
    dict(t='ell', c=(0, 0.212, 0.3), r=(0.06, 0.045, 0.05), bone='head'),                 # cheeks / jaw
    # front legs (2 bones)
    dict(t='cap', a=(0.075, 0.17, 0.16), b2=(0.08, 0.09, 0.17), r=(0.04, 0.032), bone='fl'),
    dict(t='cap', a=(0.08, 0.09, 0.17), b2=(0.082, 0.02, 0.185), r=(0.03, 0.026), bone='fl2'),
    dict(t='ell', c=(0.082, 0.014, 0.197), r=(0.028, 0.014, 0.034), bone='fl2'),
    dict(t='cap', a=(-0.075, 0.17, 0.16), b2=(-0.08, 0.09, 0.17), r=(0.04, 0.032), bone='fr'),
    dict(t='cap', a=(-0.08, 0.09, 0.17), b2=(-0.082, 0.02, 0.185), r=(0.03, 0.026), bone='fr2'),
    dict(t='ell', c=(-0.082, 0.014, 0.197), r=(0.028, 0.014, 0.034), bone='fr2'),
    # hind legs: thick haunch + short shank
    dict(t='ell', c=(0.085, 0.16, -0.17), r=(0.05, 0.09, 0.085), bone='hl'),
    dict(t='cap', a=(0.088, 0.09, -0.19), b2=(0.088, 0.02, -0.16), r=(0.032, 0.026), bone='hl2'),
    dict(t='ell', c=(0.088, 0.014, -0.145), r=(0.028, 0.014, 0.04), bone='hl2'),
    dict(t='ell', c=(-0.085, 0.16, -0.17), r=(0.05, 0.09, 0.085), bone='hr'),
    dict(t='cap', a=(-0.088, 0.09, -0.19), b2=(-0.088, 0.02, -0.16), r=(0.032, 0.026), bone='hr2'),
    dict(t='ell', c=(-0.088, 0.014, -0.145), r=(0.028, 0.014, 0.04), bone='hr2'),
]
bones = [
    ('hips', None, (0, 0.2, -0.2), (0, 0.205, 0.0)),
    ('chest', 'hips', (0, 0.205, 0.0), (0, 0.215, 0.17)),
    ('head', 'chest', (0, 0.23, 0.18), (0, 0.22, 0.36)),
    ('fl', 'chest', (0.075, 0.18, 0.16), (0.08, 0.09, 0.17)), ('fl2', 'fl', (0.08, 0.09, 0.17), (0.082, 0.005, 0.19)),
    ('fr', 'chest', (-0.075, 0.18, 0.16), (-0.08, 0.09, 0.17)), ('fr2', 'fr', (-0.08, 0.09, 0.17), (-0.082, 0.005, 0.19)),
    ('hl', 'hips', (0.085, 0.19, -0.16), (0.088, 0.09, -0.19)), ('hl2', 'hl', (0.088, 0.09, -0.19), (0.088, 0.005, -0.15)),
    ('hr', 'hips', (-0.085, 0.19, -0.16), (-0.088, 0.09, -0.19)), ('hr2', 'hr', (-0.088, 0.09, -0.19), (-0.088, 0.005, -0.15)),
]
FUR, FUR2, BELLY, DARK, GLAND, BROW = srgb('#93765a'), srgb('#655039'), srgb('#cdb592'), srgb('#3a2f25'), srgb('#1f1812'), srgb('#d2bc98')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 70, y * 70, z * 70))); n2 = noise.noise(Vector((x * 200, y * 200, z * 200)))
    c = mix(FUR, FUR2, 0.3 + 0.3 * n + 0.2 * n2)
    c = mix(c, mix(FUR2, DARK, 0.3), smooth(0.25, 0.33, y) * 0.5)                     # darker back
    c = mix(c, BELLY, smooth(0.12, 0.08, y) * smooth(0.075, 0.05, abs(x)) * smooth(-0.1, -0.5, N.y) * smooth(0.2, 0.15, abs(z)))
    # the dorsal gland: a dark spot ringed paler, mid-back
    d = math.sqrt((x / 0.03) ** 2 + ((z + 0.07) / 0.04) ** 2)
    if y > 0.3: c = mix(mix(c, BROW, 0.6 * smooth(1.6, 1.0, d)), GLAND, smooth(1.0, 0.6, d))
    # pale brow patch above the eye, darker muzzle tip
    if z > 0.22:
        e = math.exp(-(((abs(x) - 0.045) / 0.025) ** 2 + ((y - 0.29) / 0.015) ** 2 + ((z - 0.285) / 0.03) ** 2))
        c = mix(c, BROW, 0.75 * e)
        c = mix(c, DARK, smooth(0.33, 0.36, z) * 0.6)
    if y < 0.03: c = mix(c, DARK, 0.6)
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.048, 0.275, 0.295), 0.011, 'head', '#0c0806', (sx, 0.2, 0.7))
    parts.append(ear_part((sx * 0.048, 0.3, 0.22), (sx * 0.6, 1, -0.4), 0.022, 0.03, 'head', srgb('#6f5d4a'), srgb('#9c8670'), thick=0.004, cup=0.4))
    parts.append(whiskers((sx * 0.02, 0.215, 0.35), sx, 'head', 4, 0.06, srgb('#1e1814')))
nose = Part('nose', bone='head', mat=1, color=srgb('#1a1412')); nose.add(*ellipsoid((0, 0.218, 0.357), (0.018, 0.012, 0.01), 8, 5)); parts.append(nose)

names = [b[0] for b in bones]
acts = quad_actions(names, dict(amp=26, knee=40, run_amp=34, bob=0.012, drop=0.11, head_eat=45, sit=25, look=35,
                                run_bound=True, frames=dict(walk=22, run=14, idle=150, eat=48, sleep=120)))
SPEC = dict(id='hyrax', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.0045, tris=2200, smooth=14, actions=acts,
            meta=dict(height=0.38, length=0.65, speeds={'walk': 0.6, 'run': 2.0}, map={'swim': 'walk', 'sit': 'idle'}))
