# יעל נובי (Capra nubiana) – traced from a side photo of two male Nubian ibex walking (Wikimedia Commons, "Two Nubian
# Ibex Spotted at King Salman Reserve", 29.10; tools/blender/refs/ibex.png), modelled at a withers height of 0.95 and
# scaled by meta.scale. What the photo shows: a heavy, deep body (half the withers height from back to belly) on short
# strong legs; a level back and a round rump; a very thick neck carried forward; the head held forward and down, with
# a dark beard; in the male two huge knobbed horns that rise from the top of the head and sweep back over the body in a
# half circle. Sandy grey-brown, pale belly, dark fronts on the legs with white rings above the hooves, a darker chest.
own('ibex')
ANAT['ibex'] = ('ungulate', dict(arm=0.09, fa0=0.072, fa1=0.046, wr=0.052, can=0.035, fet=0.042, gas0=0.09, gas1=0.052, hock=0.052, mt=0.034,
                               th=(0.08, 0.5, 0.13)))   # thick strong legs (photo); a small haunch, the thigh comes from cat_muscles
EYE['ibex'] = ('#c8a050', 'bar', 0.86, 0.45)   # a goat's golden eye with a bar pupil
TRUNK = [(0.33, 0.92, 0.47), (0.25, 0.937, 0.46), (0.118, 0.95, 0.46), (-0.093, 0.958, 0.475), (-0.2, 0.955, 0.48), (-0.304, 0.95, 0.5),
         (-0.436, 0.9, 0.54), (-0.53, 0.79, 0.6)]
blobs = trunk_from_profile(TRUNK, lambda z: 0.17 if z > -0.2 else 0.16)
blobs += [
    dict(t='ell', c=(0, 0.6, 0.33), r=(0.13, 0.15, 0.12), bone='chest'),                            # the deep chest between the forelegs
    dict(t='cap', a=(0, 0.74, 0.28), b2=(0, 0.8, 0.56), r=(0.17, 0.11), bone='neck'),             # the very thick neck
    dict(t='cap', a=(0, 0.55, 0.36), b2=(0, 0.7, 0.58), r=(0.13, 0.08), bone='neck'),             # its throat
    dict(t='ell', c=(0, 0.82, 0.62), r=(0.09, 0.1, 0.12), bone='head'),                          # the skull
    dict(t='cap', a=(0, 0.79, 0.67), b2=(0, 0.71, 0.84), r=(0.07, 0.046), bone='head'),             # the muzzle
    dict(t='ell', c=(0, 0.71, 0.71), r=(0.045, 0.035, 0.08), bone='head'),                         # the jaw
    dict(t='ell', c=(0, 0.74, -0.58), r=(0.04, 0.06, 0.03), rot=(-20, 0, 0), bone='hips'),            # a short flat tail
]
bones = [('hips', None, (0, 0.85, -0.55), (0, 0.9, 0.0)), ('chest', 'hips', (0, 0.9, 0.0), (0, 0.9, 0.3)),
         ('neck', 'chest', (0, 0.78, 0.3), (0, 0.84, 0.55)), ('head', 'neck', (0, 0.86, 0.55), (0, 0.72, 0.82))]
for sx, L in ((1, 'l'), (-1, 'r')):
    bones += [('f' + L, 'chest', (sx * 0.1, 0.82, 0.3), (sx * 0.105, 0.46, 0.3)), ('f' + L + '2', 'f' + L, (sx * 0.105, 0.46, 0.3), (sx * 0.105, 0.0, 0.32)),
              ('h' + L, 'hips', (sx * 0.1, 0.85, -0.38), (sx * 0.105, 0.44, -0.3)), ('h' + L + '2', 'h' + L, (sx * 0.105, 0.44, -0.3), (sx * 0.105, 0.0, -0.46))]
cat_muscles(blobs, bones, sh=(0.08, 0.17, 0.11), th=(0.1, 0.19, 0.14), th_t=0.5)
HC, HS = Vector((0, 0.8, 0.68)), 1.18     # the photo's head is bigger for the body
def _h(p): return tuple(HC + (Vector(p) - HC) * HS)
for bl in blobs:
    if bl.get('bone') == 'head':
        for k in ('c', 'a', 'b2'):
            if k in bl: bl[k] = _h(bl[k])
        bl['r'] = tuple(x * HS for x in bl['r'])
E = blob_ears(blobs, bones, base=_h((0.05, 0.9, 0.56)), d=(0.7, 0.8, -0.5), H=0.13, w=0.035, t=0.008, tip=0.6, turn=20)

FAWN, FAWN2, WHITE, DARK, CHOC, GREY = srgb('#c09a6c'), srgb('#a8845a'), srgb('#efe6d6'), srgb('#2a1e16'), srgb('#4e3a2a'), srgb('#a09080')
def paint(P, N, tag):
    e = ear_paint(P, N, E)
    if P.z > 0.56 and P.y > 0.6: P = HC + (Vector(P) - HC) / HS
    x, y, z = P
    if e:
        along, across, inside = e
        return mix(FAWN2, mix(WHITE, srgb('#e0cfc0'), 0.3), inside * 0.8)
    n = noise.noise(Vector((x * 28, y * 28, z * 28)))
    c = mix(FAWN, FAWN2, 0.35 + 0.3 * n)
    c = mix(c, GREY, 0.15 * smooth(0.75, 0.95, y) * smooth(0.0, 0.5, N.y))                                  # a greyer saddle
    c = mix(c, CHOC, 0.55 * smooth(0.04, 0.015, abs(x)) * smooth(0.9, 0.95, y) * smooth(-0.52, -0.4, z) * smooth(0.3, 0.2, z))   # the dark line down the back
    c = mix(c, WHITE, smooth(0.52, 0.46, y) * smooth(-0.15, -0.55, N.y) * 0.85 * smooth(0.3, 0.2, z))     # pale belly
    c = mix(c, CHOC, 0.5 * smooth(0.3, 0.4, z) * smooth(0.75, 0.55, y) * smooth(0.1, 0.4, N.z))          # the darker chest and throat
    k = smooth(0.5, 0.4, y) * smooth(0.04, 0.06, abs(x))   # legs: dark in front, pale behind, white rings above the hooves
    if k > 0:
        front = max(0.0, N.z) * (1 if z > -0.05 else 0.6)
        lc = mix(mix(FAWN, WHITE, 0.4), mix(DARK, CHOC, 0.3), smooth(0.15, 0.6, front) * 0.9)
        lc = mix(lc, WHITE, 0.85 * smooth(0.04, 0.06, y) * smooth(0.12, 0.09, y))
        if y < 0.04: lc = mix(lc, DARK, 0.85)
        c = mix(c, lc, k)
    if z > 0.55 and y > 0.66: c = mix(c, mix(FAWN2, CHOC, 0.35), 0.45)                                  # a darker face
    if z < -0.55 and y > 0.7: c = mix(c, DARK, 0.7)                                                                 # the dark tail
    return c

parts = []
for sx in (1, -1):
    parts += eye_parts((sx * 0.06, 0.84, 0.68), 0.017, 'head', '#c8a050', (sx, 0.3, 0.5))
    # the horns: thick at the base, rising from the top of the head and sweeping back over the body in a half circle,
    # knobs along the front
    hp = bez([(sx * 0.035, 0.89, 0.6), (sx * 0.06, 1.12, 0.55), (sx * 0.09, 1.27, 0.4), (sx * 0.11, 1.28, 0.2), (sx * 0.12, 1.17, 0.06), (sx * 0.12, 1.03, 0.06)], 36)
    hr = [(0.06 * (1 - i / 35) ** 0.75 + 0.008) * (1 + 0.16 * max(0.0, math.sin(i * 1.7))) for i in range(36)]
    hv, hf = tube(hp, hr, 10)
    hc = [mix(srgb('#5a4a3a'), srgb('#8a7660'), 0.5 + 0.5 * math.sin((i // 10) * 1.7)) for i in range(len(hv))]
    horn = Part('horn', bone='head', mat=1); horn.add(hv, hf, hc); parts.append(horn)
beard = Part('beard', bone='head', color=srgb('#2e2218'))
beard.add(*tube([(0, 0.69, 0.75), (0, 0.62, 0.74), (0, 0.56, 0.75)], [0.024, 0.016, 0.004], 7)); parts.append(beard)
nose = Part('nose', bone='head', mat=1, color=srgb('#2a1e16')); nose.add(*ellipsoid((0, 0.725, 0.82), (0.026, 0.016, 0.012), 8, 5)); parts.append(nose)
for p in parts:
    if p.bone == 'head' and p.tag != 'horn': p.v = [_h(v) for v in p.v]

names = [b[0] for b in bones]
acts = quad_actions(names, dict(amp=22, knee=55, run_amp=40, bob=0.03, drop=0.5, head_eat=35, neck_eat=45, look=25, earflick=20, tailsw=15,
                                run_bound=True, frames=dict(walk=32, run=16, idle=150, eat=60, sleep=120)))
SPEC = dict(id='ibex', bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.009, tris=4200, smooth=10, actions=acts,
            meta=dict(height=1.45, length=1.5, scale=0.9, speeds={'walk': 1.1, 'run': 7.0}, map={'swim': 'walk', 'sit': 'idle'}))
