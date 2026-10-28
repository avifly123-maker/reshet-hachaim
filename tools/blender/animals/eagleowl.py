# אוח מדבר (Bubo ascalaphus, the pharaoh eagle-owl) – a big sandy-tawny owl: a round facial disc with a thin dark rim,
# large orange eyes, two feather "ears" (tufts) on the head, dark streaks down the pale breast, a mottled back, feathered
# legs and a dark hooked beak. Built on the owl's skeleton, wings and motion (owl.py): its own round face, ear tufts
# grown from the skull, eyes and colours; scaled up by meta.scale.
base('owl', globals()); derive('owl', 'eagleowl')
EYE['eagleowl'] = ('#e8801c', 'round', 0.9, 0.5)
E = blob_ears(blobs, bones, base=(0.035, 0.125, 0.15), d=(0.3, 1, -0.3), H=0.055, w=0.014, t=0.006, tip=0.9, n=5)
TAWNY, TAWNY2, PALE, STREAK, DISC, RIM = srgb('#cfa868'), srgb('#a8834e'), srgb('#efe0c0'), srgb('#4a3622'), srgb('#e2c896'), srgb('#4a3622')
def paint(P, N, tag):
    x, y, z = P
    n = noise.noise(Vector((x * 90, y * 90, z * 90)))
    e = ear_paint(P, N, E)
    if e: return mix(TAWNY2, STREAK, smooth(0.6, 1.0, e[0]) * 0.7)
    if z > 0.1:
        f = Vector(P) - Vector((0, 0.068, 0.17))
        r = math.hypot(f.x / 0.06, f.y / 0.062)
        if f.z > -0.012 and r < 1.05:                                               # the round facial disc with its dark rim
            return mix(mix(DISC, PALE, smooth(0.6, 0.0, r) * 0.4), RIM, smooth(0.88, 1.0, r) * 0.85)
        return mix(TAWNY, TAWNY2, 0.4 + 0.3 * n)
    back = N.y > -0.1 and (y > 0.02 or abs(x) > 0.06)
    if back:                                                                        # a mottled tawny back
        c = mix(TAWNY, TAWNY2, 0.35 + 0.35 * n)
        d, rid = worley(P, 120, 7); c = mix(c, STREAK, smooth(0.22, 0.1, d) * (rid > 0.5) * 0.6)
        return c
    c = mix(PALE, TAWNY, 0.35 + 0.2 * n)                                            # a pale breast with dark streaks
    s = math.sin(x * 260 + noise.noise(Vector((x * 30, y * 30, z * 30))) * 3)
    return mix(c, STREAK, smooth(0.85, 0.98, s) * smooth(0.06, -0.04, y) * 0.75)
def wcol(s, c, top):
    n = noise.noise(Vector((s * 10, c * 10, 1)))
    if not top: return mix(PALE, TAWNY, 0.3)
    col = mix(TAWNY, TAWNY2, 0.3 + 0.4 * n)
    return mix(col, STREAK, 0.5) if math.sin(c * 26 + s * 6) > 0.75 else col
def tcol(t, u, top): return mix(TAWNY, STREAK, 0.3 if math.sin(t * 30) > 0.5 else 0.0) if top else PALE
# the owl's parts are rebuilt with these colours (wings, legs, beak, tail)
parts = [p for p in parts if p.tag in ('eye', 'hl')]
for sx, L in ((1, 'l'), (-1, 'r')):
    wp, wb = wing_part(L, sx, (sx * 0.06, 0.04, 0.06), 0.36, 0.17, wcol, sweep=0.03, thick=0.02, tip=0.7, cols=6); parts.append(wp)
lp, lb = bird_legs((0.035, -0.06, 0.02), (0.04, -LEGH, 0.03), 0.04, srgb('#e6d2a8'), 0.013); parts += lp
parts.append(beak_part((0, 0.062, 0.186), 0.022, 0.007, 0.01, srgb('#2a2622'), srgb('#1a1612'), curve=0.6))
parts.append(tail_fan((0, 0.01, -0.13), 0.09, 0.07, 0.09, tcol))
SPEC = dict(SPEC, id='eagleowl', blobs=blobs, bones=bones, parts=parts, paint=paint)
SPEC['meta'] = dict(SPEC['meta'], scale=1.25)
