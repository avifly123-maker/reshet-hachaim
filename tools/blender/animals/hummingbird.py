# יונק דבש (a glittering green hummingbird with a ruby throat) – tiny body, long straight bill, narrow wings beating in a
# figure-eight while it hovers at flowers.
LEGH = 0.05
blobs = [
    dict(t='ell', c=(0, 0.0, -0.01), r=(0.034, 0.036, 0.06), rot=(-10, 0, 0), bone='hips'),
    dict(t='ell', c=(0, 0.012, 0.03), r=(0.032, 0.034, 0.035), bone='chest'),
    dict(t='ell', c=(0, 0.04, 0.06), r=(0.022, 0.022, 0.026), bone='head'),
]
bones = [('hips', None, (0, 0.0, -0.05), (0, 0.0, 0.015)), ('chest', 'hips', (0, 0.0, 0.015), (0, 0.025, 0.045)),
         ('head', 'chest', (0, 0.03, 0.045), (0, 0.04, 0.09)), ('tail', 'hips', (0, 0.002, -0.06), (0, -0.005, -0.12))]
GREEN, GREEN2, RUBY, WHITE, GOLD = srgb('#2fa860'), srgb('#1a7a44'), srgb('#e0204a'), srgb('#e8eee6'), srgb('#c8d040')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 200, y * 200, z * 200)))
    c = mix(GREEN, GREEN2, 0.3 + 0.4 * n)
    if y < -0.01: c = mix(c, WHITE, smooth(-0.01, -0.025, y) * 0.8)
    if z > 0.035 and y < 0.035 and N.z > 0: c = mix(c, RUBY, smooth(0.035, 0.05, z) * 0.95)       # ruby gorget
    if y > 0.03: c = mix(c, GOLD, 0.2)
    return c
def wcol(s, c, top): return mix(srgb('#3a3a40'), srgb('#5a5a60'), s)
def tcol(t, u, top): return mix(GREEN2, srgb('#202024'), t)

parts = []
for sx, L in ((1, 'l'), (-1, 'r')):
    wp, wb = wing_part(L, sx, (sx * 0.022, 0.022, 0.03), 0.11, 0.035, wcol, sweep=0.03, thick=0.004, tip=1.2)
    parts.append(wp); bones += wb
    parts += eye_parts((sx * 0.016, 0.046, 0.072), 0.006, 'head', '#050505', (sx, 0.2, 0.6))
lp, lb = bird_legs((0.01, -0.025, 0.0), (0.012, -LEGH, 0.004), 0.012, srgb('#1a1a1a'), 0.0018); parts += lp; bones += lb
parts.append(beak_part((0, 0.038, 0.082), 0.075, 0.003, 0.003, srgb('#1a1a1a'), srgb('#0a0a0a'), curve=0.02, seg=5, rows=4))
parts.append(tail_fan((0, 0.004, -0.06), 0.05, 0.016, 0.03, tcol, rows=3, cols=4, thick=0.003))

names = [b[0] for b in bones]
acts = bird_actions(names, dict(legH=LEGH, hop=True, perch_pitch=-15, flap=50, flap_frames=4, peck=20, frames=dict(walk=None)))
acts = {k: v for k, v in acts.items() if v[0]}
def hover(ph):
    # body tilted up, wings sweeping forward and back almost horizontally, twisting at each end of the stroke
    u = TAU * ph; sw = math.cos(u)
    p = {'hips': ((-45, 0, 0), (0, 0.004 * math.sin(u * 2), 0)), 'head': (40, 0, 0), 'tail': (-10 + 6 * math.sin(u), 0, 0)}
    for L, s in (('l', 1), ('r', -1)):
        p['w%s1' % L] = (35 * math.sin(u), s * 55 * sw, s * 10)
        p['w%s2' % L] = (0, 0, 0); p['w%s3' % L] = (15 * math.sin(u), 0, 0)
    for L in ('l', 'r'): p['l' + L] = (100, 0, 0)
    return p
acts['hover'] = (4, hover)
SPEC = dict(id='hummingbird', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.0016, tris=1000, smooth=8, actions=acts,
            meta=dict(height=0.15, length=0.4, speeds={'walk': 0.3, 'fly': 5}, gripY={'perch': -LEGH},
                      map={'eat': 'hover', 'walk': 'perch', 'run': 'fly', 'glide': 'fly', 'idle': 'perch', 'climb': 'perch'}))
