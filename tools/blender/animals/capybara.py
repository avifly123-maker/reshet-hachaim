# קפיברה (Hydrochoerus hydrochaeris) – barrel body, big blunt head with eyes/ears/nostrils high up, short legs, no tail.
blobs = [
    dict(t='ell', c=(0, 0.47, -0.08), r=(0.27, 0.27, 0.48), bone='hips'),
    dict(t='ell', c=(0, 0.46, 0.25), r=(0.23, 0.25, 0.25), bone='chest'),
    dict(t='ell', c=(0, 0.55, 0.52), r=(0.125, 0.15, 0.16), bone='head'),
    dict(t='ell', c=(0, 0.52, 0.68), r=(0.115, 0.125, 0.13), bone='head'),
    dict(t='ell', c=(0, 0.47, 0.62), r=(0.1, 0.07, 0.14), bone='head'),            # jaw
    dict(t='ell', c=(0, 0.48, 0.4), r=(0.15, 0.18, 0.12), bone='neck'),
    # legs
    dict(t='cap', a=(0.14, 0.38, 0.3), b2=(0.15, 0.2, 0.32), r=(0.08, 0.062), bone='fl'),
    dict(t='cap', a=(0.15, 0.2, 0.32), b2=(0.155, 0.035, 0.34), r=(0.058, 0.05), bone='fl2'),
    dict(t='ell', c=(0.155, 0.025, 0.36), r=(0.05, 0.025, 0.065), bone='fl2'),
    dict(t='cap', a=(-0.14, 0.38, 0.3), b2=(-0.15, 0.2, 0.32), r=(0.08, 0.062), bone='fr'),
    dict(t='cap', a=(-0.15, 0.2, 0.32), b2=(-0.155, 0.035, 0.34), r=(0.058, 0.05), bone='fr2'),
    dict(t='ell', c=(-0.155, 0.025, 0.36), r=(0.05, 0.025, 0.065), bone='fr2'),
    dict(t='ell', c=(0.16, 0.36, -0.36), r=(0.1, 0.19, 0.17), bone='hl'),
    dict(t='cap', a=(0.165, 0.2, -0.4), b2=(0.165, 0.035, -0.34), r=(0.06, 0.05), bone='hl2'),
    dict(t='ell', c=(0.165, 0.025, -0.3), r=(0.05, 0.025, 0.08), bone='hl2'),
    dict(t='ell', c=(-0.16, 0.36, -0.36), r=(0.1, 0.19, 0.17), bone='hr'),
    dict(t='cap', a=(-0.165, 0.2, -0.4), b2=(-0.165, 0.035, -0.34), r=(0.06, 0.05), bone='hr2'),
    dict(t='ell', c=(-0.165, 0.025, -0.3), r=(0.05, 0.025, 0.08), bone='hr2'),
]
bones = [
    ('hips', None, (0, 0.46, -0.45), (0, 0.47, 0.05)),
    ('chest', 'hips', (0, 0.47, 0.05), (0, 0.48, 0.34)),
    ('neck', 'chest', (0, 0.48, 0.34), (0, 0.52, 0.45)),
    ('head', 'neck', (0, 0.53, 0.45), (0, 0.5, 0.8)),
    ('fl', 'chest', (0.14, 0.4, 0.3), (0.15, 0.2, 0.32)), ('fl2', 'fl', (0.15, 0.2, 0.32), (0.155, 0.01, 0.36)),
    ('fr', 'chest', (-0.14, 0.4, 0.3), (-0.15, 0.2, 0.32)), ('fr2', 'fr', (-0.15, 0.2, 0.32), (-0.155, 0.01, 0.36)),
    ('hl', 'hips', (0.16, 0.42, -0.34), (0.165, 0.2, -0.4)), ('hl2', 'hl', (0.165, 0.2, -0.4), (0.165, 0.01, -0.3)),
    ('hr', 'hips', (-0.16, 0.42, -0.34), (-0.165, 0.2, -0.4)), ('hr2', 'hr', (-0.165, 0.2, -0.4), (-0.165, 0.01, -0.3)),
    ('earL', 'head', (0.085, 0.67, 0.47), (0.1, 0.73, 0.45)), ('earR', 'head', (-0.085, 0.67, 0.47), (-0.1, 0.73, 0.45)),
]
FUR, FUR2, BELLY, DARK, MUZ = srgb('#9a6a3f'), srgb('#6e4a2c'), srgb('#c49a68'), srgb('#3b2818'), srgb('#4a3424')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 18, y * 18, z * 18))); n2 = noise.noise(Vector((x * 90, y * 90, z * 90)))
    c = mix(FUR, FUR2, 0.3 + 0.25 * n + 0.25 * n2)          # coarse, grizzled
    c = mix(c, BELLY, smooth(0.32, 0.22, y) * smooth(-0.1, -0.5, N.y) * 0.7)
    c = mix(c, FUR2, smooth(0.6, 0.72, y) * 0.35)
    if z > 0.6: c = mix(c, MUZ, smooth(0.7, 0.8, z) * 0.6)     # dark blunt muzzle
    if y < 0.06: c = mix(c, DARK, 0.6)
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.1, 0.63, 0.56), 0.02, 'head', '#120c08', (sx, 0.3, 0.5))
    parts.append(ear_part((sx * 0.085, 0.665, 0.47), (sx * 0.5, 1, -0.3), 0.035, 0.05, 'ear' + ('L' if sx > 0 else 'R'), srgb('#5a3c26'), srgb('#8a5e40'), thick=0.008, cup=0.3))
    nost = Part('nose', bone='head', mat=1, color=srgb('#1a120c')); nost.add(*ellipsoid((sx * 0.035, 0.585, 0.795), (0.016, 0.009, 0.01), 8, 5)); parts.append(nost)
    parts.append(whiskers((sx * 0.06, 0.52, 0.79), sx, 'head', 4, 0.08, srgb('#2a1c12')))

names = [b[0] for b in bones]
acts = quad_actions(names, dict(amp=22, knee=34, run_amp=32, bob=0.02, drop=0.28, head_eat=30, neck_eat=28, sit=30, look=30, earflick=30,
                                run_bound=True, frames=dict(walk=36, run=18, idle=150, eat=48, sleep=120, swim=40)))
SPEC = dict(id='capybara', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.011, tris=2400, smooth=12, actions=acts,
            meta=dict(height=0.79, length=1.4, speeds={'walk': 0.8, 'run': 3.5}, map={'sit': 'idle'}))
