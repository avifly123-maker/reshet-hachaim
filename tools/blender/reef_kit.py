# reef_kit.py – sea animals for the reef zone (שונית האלמוגים של אילת), on top of animal_kit.py + animal_kit_hd.py.
# Exec it into the same namespace after the two kits (bridge/session.py does that when the file is there).
#
#   fish_spec(sid, P)  – a bony fish or a shark from a side profile: a smooth SDF body of overlapping ellipsoids along
#                        the spine, real fins (dorsal, anal, caudal, pectoral, pelvic) as thin plates on their own bones,
#                        an eye with a golden iris ring, gill cover and mouth painted on, scale relief from the HD kit.
#                        Bones: body (root) · head · tail1 · tail2 · tail3 (caudal fin) · pl / pr (pectorals).
#   fish_actions(P)    – fly (cruise: a travelling body wave, bigger toward the tail), hover (pectoral sculling and a
#                        slow tail), glide, perch (resting by a coral), eat (a nod and a quick dart), sleep.
#   The game treats fish as flyers through water (locomotion 'swim' → 'flying', src/sim/species.js), so the clip names
#   are the flying ones; meta.map sends idle / walk to hover.
# Authoring coordinates as in the kit: x side, y up, z forward (the fish faces +z), metres at the game's toy scale.
import math, random
from mathutils import Vector, noise

def _st(prof, t):
    """linear interpolation in a profile table [(t, h, w, yc)…] sorted by t (0 = tail base, 1 = snout)"""
    if t <= prof[0][0]: return prof[0][1:]
    for a, b in zip(prof, prof[1:]):
        if t <= b[0]:
            u = (t - a[0]) / max(1e-9, b[0] - a[0]); return tuple(a[i] + (b[i] - a[i]) * u for i in (1, 2, 3))
    return prof[-1][1:]

def fin_rays(s, t, n=9, k=0.5):
    """0..1 stripes along the rays of a fin (for paint); s across, t along"""
    return 0.5 + 0.5 * math.cos(TAU * n * s + 2.0 * t)

def fish_eye(c, r, side, iris='#d9a43a', ring='#2a1a08', pupil='#05080a', bone='head'):
    """a fish eye: glossy ball, black pupil, a coloured iris ring that faces sideways; catch-light baked as a part"""
    c = Vector(c); d = Vector((side, 0.0, 0.18)).normalized()
    V, F = ellipsoid(tuple(c), (r, r, r), 18, 12)
    I, Rg, P = srgb(iris), srgb(ring), srgb(pupil); cols = []
    for v in V:
        q = (Vector(v) - c).normalized(); a = q.dot(d)
        cols.append(P if a > 0.86 else (I if a > 0.62 else (Rg if a > 0.5 else mix(I, Rg, 0.6))))
    p = Part('eye', bone=bone, mat=1); p.add(V, F, cols)
    h = Part('hl', bone=bone, mat=1, color=(1, 1, 1))
    hc = c + (d * 0.8 + Vector((0, 0.5, 0.3))).normalized() * r * 0.93
    h.add(*ellipsoid(tuple(hc), (r * 0.16,) * 3, 6, 4))
    return [p, h]


def _resample(out, n):
    """n points evenly along the closed outline"""
    P = [Vector((a, b, 0)) for a, b in out]; segs = [(P[i], P[(i + 1) % len(P)]) for i in range(len(P))]
    tot = sum((b - a).length for a, b in segs); res = []; acc = 0.0; k = 0
    for a, b in segs:
        L = (b - a).length
        while k < n and k * tot / n <= acc + L + 1e-12:
            u = (k * tot / n - acc) / max(L, 1e-12); q = a + (b - a) * u; res.append((q.x, q.y)); k += 1
        acc += L
    return res[:n]

def fin_plate(origin, U, Vv, outline, thick=0.004, rings=4, n=28, pleat=0.9, bend=0.0):
    """a fin: the outline resampled, concentric rings toward its middle (so paint and light have vertices to work
    with), thinner toward the edge, and pleated like real fin rays (neighbouring points alternately up and down)"""
    o = Vector(origin); U = Vector(U); Vv = Vector(Vv); N = U.cross(Vv).normalized()
    pts = _resample(outline, n)
    cs = sum(p[0] for p in pts) / n; ct = sum(p[1] for p in pts) / n
    V = []; F = []
    for side in (1, -1):
        base = len(V); V.append(tuple(o + U * cs + Vv * ct + N * side * thick * 0.5))
        for k in range(1, rings + 1):
            f = k / rings
            for j, (a, b) in enumerate(pts):
                sa, tb = cs + (a - cs) * f, ct + (b - ct) * f
                th = thick * (1 - 0.75 * f) * 0.5
                pl = pleat * thick * f * (1 if j % 2 else -1) * 0.5
                V.append(tuple(o + U * sa + Vv * tb + N * (side * th + pl + bend * sa * sa)))
        for j in range(n):
            a, b = base + 1 + j, base + 1 + (j + 1) % n
            F.append((base, a, b) if side == 1 else (base, b, a))
        for k in range(rings - 1):
            r0 = base + 1 + k * n; r1 = r0 + n
            for j in range(n):
                jn = (j + 1) % n
                F.append((r0 + j, r1 + j, r1 + jn, r0 + jn) if side == 1 else (r0 + j, r0 + jn, r1 + jn, r1 + j))
    half = len(V) // 2; e0 = 1 + (rings - 1) * n
    for j in range(n):
        jn = (j + 1) % n
        F.append((e0 + j, e0 + jn, half + e0 + jn, half + e0 + j))
    return V, F

def fish_spec(sid, P):
    """P: L (length snout→tail base), prof [(t, h, w, yc)…] half-height / half-width / centre-y as fractions of L,
    fins: dict dorsal / anal / caudal / pect / pelvic (outlines in fractions of L), paint(P, N, tag, t) → rgb,
    eye (t, y-frac, r-frac, iris), skin, tris, res, speed, meta extras"""
    L = P['L']; prof = P['prof']
    ymid = max(h for _, h, _, _ in prof) * L          # the belly sits near y = 0: shots and perching work as for birds
    def z_of(t): return -L / 2 + t * L
    def at(t):
        h, w, yc = _st(prof, t); return h * L, w * L, ymid + yc * L
    tb = P.get('tbones', (0.0, 0.2, 0.42, 0.7))         # tail2 | tail1 | body | head boundaries
    def bone_at(t):
        return 'tail2' if t < tb[1] else 'tail1' if t < tb[2] else 'body' if t < tb[3] else 'head'
    blobs = []
    n = P.get('nblobs', 22)
    for i in range(n + 1):
        t = 0.015 + 0.97 * i / n
        h, w, yc = at(t)
        if h < 1e-4: continue
        step = L / n
        blobs.append(dict(t='ell', c=(0, yc, z_of(t)), r=(max(w, 0.004), max(h, 0.004), step * P.get('zr', 1.5)), bone=bone_at(t)))
    # snout cap: rounds the front, and the lips
    hs, ws, ys = at(0.985)
    blobs.append(dict(t='ell', c=(0, ys + P.get('mouthY', 0.0) * L, z_of(0.975)), r=(ws * 0.9, hs * 0.85, L * 0.03), bone='head'))
    for bl in P.get('extra', []): blobs.append(bl(L, at, z_of) if callable(bl) else bl)
    # bones
    def ctr(t): return (0, at(t)[2], z_of(t))
    cf = P['fins'].get('caudal', {})
    clen = cf.get('len', 0.25) * L
    bones = [('body', None, ctr(tb[2]), ctr(tb[3])),
             ('head', 'body', ctr(tb[3]), ctr(1.0)),
             ('tail1', 'body', ctr(tb[2]), ctr(tb[1])),
             ('tail2', 'tail1', ctr(tb[1]), ctr(tb[0] + 0.005)),
             ('tail3', 'tail2', ctr(tb[0] + 0.005), (0, at(0.0)[2], z_of(0.0) - clen))]
    parts = []
    paint = P['paint']
    # ── caudal fin: plate from the tail base backward; shape 'fork' | 'round' | 'trunc' | 'lunate' | 'shark'
    hc = cf.get('h', 0.22) * L; kind = cf.get('shape', 'fork'); y0 = at(0.0)[2]
    o = (0, y0, z_of(0.0) + cf.get('inset', 0.03) * L); U = (0, 0, -1); Vv = (0, 1, 0)
    if kind == 'round':
        out = [(0.0, -hc * 0.4)] + [(clen * (1 - (2 * i / 14 - 1) ** 2) ** 0.5 * 0.95 + 0.0, hc * (2 * i / 14 - 1)) for i in range(15)] + [(0.0, hc * 0.4)]
    elif kind == 'trunc':
        out = [(0.0, -hc * 0.3), (clen * 0.55, -hc * 0.85), (clen, -hc), (clen * 0.97, -hc * 0.3), (clen * 0.95, 0), (clen * 0.97, hc * 0.3),
               (clen, hc), (clen * 0.55, hc * 0.85), (0.0, hc * 0.3)]
    elif kind == 'lunate':
        out = [(0.0, -hc * 0.22), (clen * 0.6, -hc * 0.7), (clen * 1.05, -hc * 1.05), (clen * 0.72, -hc * 0.35), (clen * 0.6, 0),
               (clen * 0.72, hc * 0.35), (clen * 1.05, hc * 1.05), (clen * 0.6, hc * 0.7), (0.0, hc * 0.22)]
    elif kind == 'shark':     # heterocercal: the upper lobe long, the lower short
        out = [(0.0, -hc * 0.2), (clen * 0.35, -hc * 0.55), (clen * 0.45, -hc * 0.62), (clen * 0.42, -hc * 0.25), (clen * 0.5, 0.0),
               (clen * 0.75, hc * 0.45), (clen * 1.0, hc * 1.0), (clen * 0.86, hc * 0.95), (clen * 0.4, hc * 0.45), (0.0, hc * 0.25)]
    else:   # fork
        nt = cf.get('notch', 0.55)
        out = [(0.0, -hc * 0.28), (clen * 0.55, -hc * 0.75), (clen, -hc), (clen * 0.92, -hc * 0.6), (clen * nt, 0.0),
               (clen * 0.92, hc * 0.6), (clen, hc), (clen * 0.55, hc * 0.75), (0.0, hc * 0.28)]
    if cf.get('tilt'): out = [(s, t + cf['tilt'] * s) for s, t in out]
    p = Part('fin_c', bone='tail3'); p.add(*fin_plate(o, U, Vv, out, thick=cf.get('thick', 0.012) * L, n=36, rings=5, bend=cf.get('bend', 0.0)))
    parts.append(p)
    # ── dorsal and anal fins: plates standing on the back / under the belly; seg-weighted along the spine bones
    for key, sgn in (('dorsal', 1), ('dorsal2', 1), ('anal', -1)):
        fd = P['fins'].get(key)
        if not fd: continue
        pts = fd['pts']            # [(t along body, height as fraction of L)] from front to back; the base is implied
        t0, t1 = pts[0][0], pts[-1][0]
        hb0, _, yb0 = at(t0); hb1, _, yb1 = at(t1)
        def base_y(t):
            h, w, yc = at(t); return yc + sgn * h * fd.get('sink', 0.6)
        def surf_y(t):
            h, w, yc = at(t); return yc + sgn * h
        # build as a plate in the y–z plane: origin at the front base, U = backward along z, V = up (or down);
        # fin heights are measured from the body's surface, the root reaches into the body
        o = (0, base_y(t0), z_of(t0)); out = []
        for (t, hh) in pts:
            out.append((z_of(t0) - z_of(t), (surf_y(t) - base_y(t0)) * sgn + hh * L))
        for (t, hh) in reversed(pts):
            out.append((z_of(t0) - z_of(t), (base_y(t) - base_y(t0)) * sgn - fd.get('root', 0.02) * L))
        V, F = fin_plate(o, (0, 0, -1), (0, sgn, 0), out, thick=fd.get('thick', 0.008) * L, n=40, rings=4)
        p = Part('fin_' + key[0], bones=['head', 'body', 'tail1', 'tail2'] if t0 > tb[3] else ['body', 'tail1', 'tail2'])
        p.add(V, F); parts.append(p)
    # ── pectoral (pl / pr) and pelvic fins
    pf = P['fins'].get('pect')
    if pf:
        t = pf['t']; h, w, yc = at(t); y = yc + pf.get('y', -0.15) * h * 2
        ln, wd = pf['len'] * L, pf['w'] * L
        for side, nm in ((1, 'pl'), (-1, 'pr')):
            base = Vector((side * w * 0.82, y, z_of(t)))
            d = Vector((side * pf.get('out', 0.45), pf.get('up', -0.05), -1.0)).normalized()
            up = Vector((0, 1, 0)); up = (up - d * up.dot(d)).normalized()
            shape = pf.get('shape', 'oval')
            if shape == 'wing':      # long sweep (shark, turtle-like)
                out = [(0, -wd * 0.5), (ln * 0.6, -wd * 0.25), (ln, -wd * 0.05), (ln * 0.85, wd * 0.15), (ln * 0.3, wd * 0.5), (0, wd * 0.5)]
            elif shape == 'fan':     # lionfish: a broad fan
                out = [(0, -wd * 0.25)] + [(ln * (0.75 + 0.25 * math.cos(a * 3)) * math.cos(a), wd * math.sin(a) * 1.2) for a in [(-0.9 + 1.8 * i / 12) for i in range(13)]] + [(0, wd * 0.25)]
            else:
                out = [(0, -wd * 0.35), (ln * 0.55, -wd * 0.5), (ln * 0.95, -wd * 0.22), (ln, 0.0), (ln * 0.92, wd * 0.25), (ln * 0.5, wd * 0.5), (0, wd * 0.35)]
            V, F = fin_plate(tuple(base - d * ln * 0.06), tuple(d), tuple(up), out, thick=0.006 * L, n=24, rings=4, bend=pf.get('bend', 0.0) * side)
            p = Part('fin_p', bone=nm); p.add(V, F); parts.append(p)
            bones.append((nm, 'body' if t < tb[3] else 'head', tuple(base), tuple(base + d * ln * 0.8)))
    vf = P['fins'].get('pelvic')
    if vf:
        t = vf['t']; h, w, yc = at(t); y = yc - h * 0.82
        for side in (1, -1):
            base = Vector((side * w * 0.35, y, z_of(t)))
            d = Vector((side * 0.25, -0.55, -1.0)).normalized(); up = Vector((side, 0, 0)).cross(d).normalized()
            ln, wd = vf['len'] * L, vf['w'] * L
            out = [(0, -wd * 0.3), (ln * 0.7, -wd * 0.3), (ln, 0), (ln * 0.6, wd * 0.35), (0, wd * 0.3)]
            V, F = fin_plate(tuple(base), tuple(d), tuple(up), out, thick=0.005 * L, n=16, rings=3)
            p = Part('fin_v', bone='body'); p.add(V, F); parts.append(p)
    # ── eyes
    et, ey, er = P['eye'][:3]; h, w, yc = at(et); iris = P['eye'][3] if len(P['eye']) > 3 else '#d9a43a'
    r = er * L
    for side in (1, -1):
        # on the head's surface: x from the ellipse at that height, sunk to show a dome
        yy = yc + ey * h
        xs = w * math.sqrt(max(0.05, 1 - (ey) ** 2))
        parts += fish_eye((side * (xs - r * P.get('eyeSink', 0.45)), yy, z_of(et)), r, side, iris=iris, ring=P.get('eyeRing', '#2a1a08'))
    for fn in P.get('parts', []): parts += fn(L, at, z_of)
    # paint wrapper: knows the tag and the body position t
    def paint_w(Pt, N, tag):
        t = (Pt.z + L / 2) / L
        return paint(Pt, N, tag, t, at)
    meta = dict(height=ymid * 2, length=L + clen, speeds={'fly': P.get('speed', 1.6), 'walk': 0.4},
                map={'idle': 'hover', 'walk': 'hover', 'run': 'fly', 'swim': 'fly', 'sit': 'hover'}, perchOffset=0.0, rough=P.get('rough', 0.42))
    meta.update(P.get('meta', {}))
    spec = dict(id=sid, bones=bones, blobs=blobs, parts=parts, paint=paint_w, paintParts=True,
                res=P.get('res', L * 0.011), tris=P.get('tris', 1500), smooth=P.get('smooth', 6),
                actions=fish_actions(P, [b[0] for b in bones]), skin=P.get('skin', 'fishscale'), noLids=True, noTone=P.get('noTone', False),
                meta=meta)
    return spec

def fish_actions(P, names):
    has = set(names); A = P.get('wave', 1.0); stiff = P.get('stiff', 0.0)    # stiff: boxy fish swim with the fins
    def wave(ph, amp, lag=0.18, head=0.25):
        s = lambda k: math.sin(TAU * (ph - k * lag))
        a = amp * A
        p = {'body': (0, a * 0.18 * s(0) * (1 - stiff), 0), 'head': (0, -a * head * s(-0.6), 0),
             'tail1': (0, a * 0.55 * s(1) * (1 - stiff * 0.6), 0), 'tail2': (0, a * 0.8 * s(2) * (1 - stiff * 0.4), 0), 'tail3': (0, a * 0.9 * s(3), 0)}
        return p
    def pect(p, ph, amp, rate=1, back=0):
        for nm, sd in (('pl', 1), ('pr', -1)):
            if nm in has: p[nm] = (0, sd * (back + amp * 0.35 * math.sin(TAU * ph * rate + 1.2)), sd * amp * math.sin(TAU * ph * rate))
        return p
    def fly(ph):  return pect(wave(ph, 16 * P.get('beat', 1.0)), ph, 8, 1, 35)
    def hover(ph):
        p = wave(ph * 2, 4); p['body'] = ((1.5 * math.sin(TAU * ph), p['body'][1], 0), (0, 0.004 * math.sin(TAU * ph * 2), 0))
        return pect(p, ph, 32, 4, 5)
    def glide(ph): return pect(wave(ph, 7), ph, 6, 1, 45)
    def perch(ph):
        p = wave(ph * 2, 3); p['body'] = ((2 * math.sin(TAU * ph), p['body'][1], 0), (0, 0.003 * math.sin(TAU * ph * 2), 0))
        return pect(p, ph, 24, 3, 8)
    def eat(ph):
        k = max(0.0, math.sin(TAU * ph * 2)) ** 3
        p = wave(ph * 2, 5); p['body'] = ((18 * k, p['body'][1], 0), (0, -0.01 * k, 0.012 * k)); p['head'] = (8 * k, 0, 0)
        return pect(p, ph, 26, 4, 5)
    def sleep(ph):
        p = wave(ph, 1.2); p['body'] = ((3, 0, 0), (0, -0.01, 0))
        return pect(p, ph, 6, 1, 15)
    F = P.get('frames', {})
    return {'fly': (F.get('fly', 24), fly), 'hover': (F.get('hover', 72), hover), 'glide': (90, glide),
            'perch': (120, perch), 'eat': (48, eat), 'sleep': (120, sleep)}

# ───────────────────────────────────────── paint helpers
def bands(t, centres, half, soft=0.006):
    """1 inside any vertical band (t centre ± half), smooth edges"""
    v = 0.0
    for c in centres: v = max(v, smooth(half + soft, half - soft, abs(t - c)))
    return v

def nz(P, f, seed=0.0):
    return noise.noise(Vector((P.x * f + seed, P.y * f, P.z * f)))

def finpaint(Pt, tag, base, edge=None, rays=0.15, L=1.0):
    """fins: base colour, ray stripes, a darker or lighter edge band by distance from the body"""
    s = Pt.y * 40 / L + Pt.z * 30 / L
    c = mix(base, tuple(x * 0.72 for x in base), rays * (0.5 + 0.5 * math.sin(s * 6)))
    return c

# ───────────────────────────────────────── crawlers and others share these helpers
def ring_pts(c, r, n, y=0.0):
    return [(c[0] + r * math.cos(TAU * i / n), c[1] + y, c[2] + r * math.sin(TAU * i / n)) for i in range(n)]

def chain_bones(prefix, pts, parent):
    return chain(prefix, pts, parent)

def wiggle(names, ph, amp, lag=0.12, axis=1):
    out = {}
    for i, n in enumerate(names):
        r = [0, 0, 0]; r[axis] = amp * math.sin(TAU * (ph - i * lag)); out[n] = tuple(r)
    return out

# ───────────────────────────────────────── fish skin: fine overlapping scales, gentle relief, softer natural tone
_detail0 = globals().get('_detail0') or _detail
def _detail(P, N, f, skin, s):
    if skin == 'fishscale':
        d, _ = worley(Vector((P.x * 1.0, P.y * 1.25, P.z * 0.85)), 1 / (0.017 * s), 5)
        e = min(1.0, d / 0.75)
        return s * 0.00045 * (1 - e * e), max(0.0, min(1.0, e ** 5)) * 0.5
    if skin == 'sharkskin':
        n = noise.noise(P * (1 / (0.006 * s)))
        return s * 0.00012 * n, 0.0
    return _detail0(P, N, f, skin, s)
_tone0 = globals().get('_tone0') or _tone
def _tone(c, P, N, f, skin, s, ylo, yhi):
    if skin in ('fishscale', 'sharkskin', 'jelly', 'shell'): skin = 'smooth'
    return _tone0(c, P, N, f, skin, s, ylo, yhi)
