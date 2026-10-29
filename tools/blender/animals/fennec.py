# שועל הפנק (Vulpes zerda) – the smallest fox: cream and sandy coat, white belly and face, huge ears (up to a third of
# its body), dark eyes with a dark streak running down from each eye, black-tipped bushy tail, furry pale feet.
# Built on the red fox (fox.py), then scaled to a fennec (about 20 cm at the shoulder).
base('fox', globals()); derive('fox', 'fennec')
EYE['fennec'] = ('#6a4422', 'round', 0.84, 0.48)   # big dark eyes, not the red fox's amber slit

# huge ears, built the way a modeller would: each ear is part of the body's surface (a row of flattened ellipsoids on
# the ear bone, merged into the skull by the metaballs, so there is no seam and no paper-thin plate), broad at the base
# and rounding off at the tip, and painted from its own shape: sandy fur on the back and the rim, a pale pink-cream
# inside with white hairs that grow from the inner edges.
EAR_H = 0.21
EARS = {}
bones = [b for b in bones if b[0] not in ('earL', 'earR')]
for sx, L in ((1, 'L'), (-1, 'R')):
    bp = Vector((sx * 0.04, 0.598, 0.318)); d = Vector((sx * 0.6, 1, -0.06)).normalized()
    side = d.cross(Vector((0, 0, 1))).normalized()
    if side.x * sx < 0: side = -side
    fwd = side.cross(d).normalized()
    if fwd.z < 0: fwd = -fwd
    EARS[L] = (bp, d, side, fwd)
    bones.append(('ear' + L, 'head', tuple(bp), tuple(bp + d * EAR_H)))
    tilt = math.degrees(math.atan2(d.x, d.y))
    for i, t in enumerate((0.08, 0.24, 0.4, 0.56, 0.7, 0.82)):
        w = 0.046 * (1 - t) ** 0.55 + 0.01                   # broad base, a round tip
        c = bp + d * (EAR_H * t)
        blobs.append(dict(t='ell', c=tuple(c), r=(w, EAR_H * 0.13, 0.011 + 0.006 * (1 - t)), rot=(3, 0, -tilt), bone='ear' + L, ear=True))

def ear_at(P):
    """(side, along 0..1, across -1..1 of the local half-width, facing forward 0..1) when P is on an ear, else None"""
    for L, (bp, d, side, fwd) in EARS.items():
        r = Vector(P) - bp; along = r.dot(d) / EAR_H
        if along < 0.02 or along > 1.05: continue
        w = 0.046 * (1 - min(along, 0.98)) ** 0.55 + 0.01
        across = r.dot(side) / w
        if abs(across) > 1.4 or abs(r.dot(fwd)) > 0.03: continue
        return L, along, across, fwd
    return None

SAND, SAND2, CREAM, WHITE, DARK, PINK, STREAK = srgb('#ddb57c'), srgb('#c4955a'), srgb('#ecd8b4'), srgb('#f5eee2'), srgb('#2a1c14'), srgb('#e2aa98'), srgb('#9a7450')
def paint(P, N, tag):
    x, y, z = P
    E = ear_at(P)
    if E:
        L, along, across, fwd = E
        n = noise.noise(Vector((x * 90, y * 90, z * 90)))
        out = mix(SAND, SAND2, 0.35 + 0.25 * n)
        front = smooth(0.1, 0.55, Vector(N).dot(fwd))                       # the inside faces forward
        inner = front * smooth(0.95, 0.7, abs(across)) * smooth(0.06, 0.16, along) * smooth(0.98, 0.86, along)
        hair = 0.5 + 0.5 * math.sin(across * 26 + along * 9 + n * 3)        # white hairs along the inner edges
        ins = mix(PINK, CREAM, 0.35 + 0.2 * n)
        ins = mix(ins, WHITE, smooth(0.6, 0.9, abs(across)) * smooth(0.65, 0.95, hair) * 0.75)   # white hairs only along the inner edges
        c = mix(out, ins, inner)
        return mix(c, SAND2, smooth(0.85, 1.0, along) * 0.35 * (1 - inner))  # the tip a touch darker
    n = noise.noise(Vector((x * 40, y * 40, z * 40))); n2 = noise.noise(Vector((x * 150, y * 150, z * 150)))
    c = mix(SAND, SAND2, 0.3 + 0.25 * n + 0.12 * n2)
    if z < -0.3:   # tail: sandy, a darker spot near the base, black tip
        c = mix(c, SAND2, 0.25)
        c = mix(c, DARK, smooth(-0.72, -0.8, z) * 0.95)
        return c
    c = mix(c, CREAM, smooth(0.36, 0.26, y) * 0.45)                                        # paler, warm legs and belly
    if z > 0.1 and 0.33 < y < 0.55 and abs(x) < 0.06 + (0.55 - y) * 0.15: c = mix(c, WHITE, 0.85)  # white throat and chest
    if z > 0.36: c = mix(c, CREAM, smooth(0.36, 0.42, z) * 0.7)                             # cream face
    if z > 0.39 and 0.553 < y < 0.58 and 0.014 < abs(x) < 0.026: c = mix(c, STREAK, 0.55)  # the brown tear streak below the eye
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.036, 0.587, 0.405), 0.0122, 'head', '#6a4422', (sx, 0.25, 0.6))
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
