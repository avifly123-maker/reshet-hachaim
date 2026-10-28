# שועל הפנק (Vulpes zerda) – the smallest fox: cream and sandy coat, white belly and face, huge ears (up to a third of
# its body), dark eyes with a dark streak running down from each eye, black-tipped bushy tail, furry pale feet.
# Built on the red fox (fox.py), then scaled to a fennec (about 20 cm at the shoulder).
base('fox', globals()); derive('fox', 'fennec')

# huge ears, set wider and more upright; the ear bones follow
EAR_W, EAR_H = 0.078, 0.2
bones = [b for b in bones if b[0] not in ('earL', 'earR')]
for sx, L in ((1, 'L'), (-1, 'R')):
    bp = Vector((sx * 0.042, 0.6, 0.318)); d = Vector((sx * 0.62, 1, -0.08)).normalized()
    bones.append(('ear' + L, 'head', tuple(bp), tuple(bp + d * EAR_H)))

SAND, SAND2, CREAM, WHITE, DARK, PINK = srgb('#e2c08a'), srgb('#c99a5e'), srgb('#f1e2c4'), srgb('#f7f2ea'), srgb('#2a1c14'), srgb('#f0c8b8')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 40, y * 40, z * 40))); n2 = noise.noise(Vector((x * 150, y * 150, z * 150)))
    c = mix(SAND, SAND2, 0.3 + 0.25 * n + 0.12 * n2)
    if z < -0.3:   # tail: sandy, a darker spot near the base, black tip
        c = mix(c, SAND2, 0.25)
        c = mix(c, DARK, smooth(-0.72, -0.8, z) * 0.95)
        return c
    c = mix(c, CREAM, smooth(0.36, 0.28, y) * 0.8)                                         # pale legs and belly
    if z > 0.1 and 0.33 < y < 0.55 and abs(x) < 0.06 + (0.55 - y) * 0.15: c = mix(c, WHITE, 0.85)  # white throat and chest
    if z > 0.36: c = mix(c, WHITE, smooth(0.36, 0.42, z) * 0.75)                            # pale face
    if z > 0.39 and 0.555 < y < 0.585 and 0.012 < abs(x) < 0.03: c = mix(c, DARK, 0.55)    # the dark tear streak
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.036, 0.587, 0.405), 0.0135, 'head', '#2a1a0a', (sx, 0.25, 0.6))
    d = Vector((sx * 0.62, 1, -0.08))
    parts.append(ear_part((sx * 0.042, 0.6, 0.318), d, EAR_W, EAR_H, 'ear' + ('L' if sx > 0 else 'R'), SAND, PINK, thick=0.006, cup=0.45, point=True, tipcol=SAND2))
    parts.append(whiskers((sx * 0.02, 0.535, 0.46), sx, 'head', 4, 0.075, srgb('#2a2018')))
nose = Part('nose', bone='head', mat=1, color=srgb('#1a1410')); nose.add(*ellipsoid((0, 0.538, 0.476), (0.015, 0.011, 0.01), 8, 5)); parts.append(nose)

names = [b[0] for b in bones]
acts = quad_actions(names, dict(gait='trot', amp=26, knee=50, run_amp=42, bob=0.014, drop=0.26, head_eat=30, neck_eat=45, look=40, tailsw=10, earflick=30,
                                frames=dict(walk=20, run=12, idle=150, eat=48, sleep=120)))
_sl = acts['sleep'][1]
def sleep(ph):      # curled up with the tail around the nose
    p = _sl(ph)
    for i in range(1, 5): p['tail%d' % i] = (10, 22, 0)
    p['neck'] = (30, 40, 0); p['head'] = (25, 25, 10); return p
acts['sleep'] = (120, sleep)
K = 0.52   # fox → fennec
SPEC = dict(id='fennec', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.006, tris=2600, smooth=14, actions=acts,
            meta=dict(height=0.8, length=1.15, scale=K,   # at the fox's size: build-rigged.py scales height and length too
                       speeds={'walk': 0.8, 'run': 4.0}, map={'swim': 'walk', 'sit': 'idle'}))
