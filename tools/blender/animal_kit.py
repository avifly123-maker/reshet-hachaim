# Animal toolkit for Blender (רשת החיים): organic bodies from metaballs, an armature, field-based skin weights,
# painted vertex colours, procedural action clips, and a compact export for the game (src/data/rigged-*.js).
#
# Authoring coordinates = the game's (three.js): x = side, y = up, z = forward (the animal faces +z), metres.
# In Blender everything is placed at (x, -z, y)  →  the animal faces Blender's front view (-Y), Z up.
#
# Usage inside Blender:
#   exec(open(KIT).read(), ns); kit = ns['KIT']; kit.build(spec)  → collection A_<id> with armature + mesh + actions
#   kit.export(id) → JSON text for tools/build-rigged.py
import bpy, bmesh, math, json, random, base64, struct, os
from mathutils import Vector, Quaternion, Matrix, Euler, noise

TAU = math.tau
def B(p): return Vector((p[0], -p[2], p[1]))            # authoring → Blender
def T(v): return (v[0], v[2], -v[1])                    # Blender → authoring
C3 = Matrix(((1, 0, 0), (0, 0, 1), (0, -1, 0)))         # Blender → three (rotation part)
C4 = C3.to_4x4(); C4i = C4.inverted()

def srgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
def mix(a, b, t):
    t = max(0.0, min(1.0, t)); return tuple(a[i] * (1 - t) + b[i] * t for i in range(3))
def smooth(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t)

def scene():
    sc = bpy.data.scenes.get('animals')
    if not sc:
        sc = bpy.data.scenes.new('animals')
        sc.world = bpy.data.worlds.get('World') or bpy.data.worlds.new('World')
    return sc

def collection(sc, name):
    c = bpy.data.collections.get(name)
    if c:
        for o in list(c.objects): bpy.data.objects.remove(o, do_unlink=True)
    else:
        c = bpy.data.collections.new(name); sc.collection.children.link(c)
    return c

# ───────────────────────────────────────────── field (also used for weights)
def _segdist(p, a, b):
    ab = b - a; L2 = ab.length_squared
    t = 0.0 if L2 < 1e-12 else max(0.0, min(1.0, (p - a).dot(ab) / L2))
    return (p - (a + ab * t)).length, t

def blob_q(bl, p):
    """normalised distance of authoring point p from blob bl (1 = on its surface)"""
    if bl['t'] == 'ell':
        d = p - Vector(bl['c'])
        if 'rot' in bl: d = bl['_qi'] @ d
        r = bl['r']; return Vector((d.x / r[0], d.y / r[1], d.z / r[2])).length
    d, t = _segdist(p, Vector(bl['a']), Vector(bl['b2']))
    r = bl['r'] if not isinstance(bl['r'], (list, tuple)) else bl['r'][0] * (1 - t) + bl['r'][1] * t
    return d / r

def prep_blobs(blobs):
    for bl in blobs:
        if bl['t'] == 'ell' and 'rot' in bl:
            e = Euler([math.radians(x) for x in bl['rot']], 'YXZ')
            bl['_q'] = e.to_quaternion(); bl['_qi'] = bl['_q'].inverted()

# ───────────────────────────────────────────── metaball body
_K = {}
def calib(sc):
    """surface radius of a metaball ball of radius 1 (stiffness 2, threshold .6) – Blender's falloff isn't 1:1"""
    if 'k' in _K: return _K['k']
    mb = bpy.data.metaballs.new('MBcal'); mb.threshold = 0.6; mb.resolution = 0.02
    e = mb.elements.new(); e.type = 'BALL'; e.radius = 1.0; e.stiffness = 2.0
    o = bpy.data.objects.new('MBcal', mb); sc.collection.objects.link(o)
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    k = max(v.co.x for v in me.vertices)
    bpy.data.objects.remove(o); bpy.data.metaballs.remove(mb); bpy.data.meshes.remove(me)
    _K['k'] = k; return k

# ───────────────────────────────────────────── extra parts (authoring coords)
class Part:
    def __init__(self, tag, bone=None, mat=0, bones=None, color=None):
        self.v = []; self.f = []; self.c = []; self.tag = tag; self.bone = bone; self.mat = mat; self.bones = bones; self.color = color
    def add(self, verts, faces, cols=None):
        o = len(self.v); self.v += [tuple(x) for x in verts]; self.f += [tuple(i + o for i in f) for f in faces]
        self.c += list(cols) if cols else [None] * len(verts); return self

def _frame(d):
    d = Vector(d).normalized(); up = Vector((0, 1, 0)) if abs(d.y) < 0.95 else Vector((1, 0, 0))
    u = d.cross(up).normalized(); w = u.cross(d).normalized(); return u, w

def ellipsoid(c, r, seg=10, ring=7, rot=None):
    c = Vector(c); q = Euler([math.radians(x) for x in rot], 'YXZ').to_quaternion() if rot else None
    V = [c + ((q @ Vector((0, r[1], 0))) if q else Vector((0, r[1], 0)))]; F = []
    for i in range(1, ring):
        th = math.pi * i / ring
        for j in range(seg):
            ph = TAU * j / seg; d = Vector((math.sin(th) * math.cos(ph) * r[0], math.cos(th) * r[1], math.sin(th) * math.sin(ph) * r[2]))
            V.append(c + (q @ d if q else d))
    V.append(c + ((q @ Vector((0, -r[1], 0))) if q else Vector((0, -r[1], 0))))
    for j in range(seg): F.append((0, 1 + (j + 1) % seg, 1 + j))
    for i in range(ring - 2):
        a0 = 1 + i * seg; a1 = a0 + seg
        for j in range(seg):
            jn = (j + 1) % seg; F.append((a0 + j, a0 + jn, a1 + jn, a1 + j))
    last = len(V) - 1; a0 = 1 + (ring - 2) * seg
    for j in range(seg): F.append((last, a0 + j, a0 + (j + 1) % seg))
    return [tuple(v) for v in V], F

def tube(pts, radii, sides=6, cap0=True, cap1=True, rx=None):
    """tube along authoring points; radii per point (float or (rx, ry) in the tube frame)"""
    P = [Vector(p) for p in pts]; n = len(P); V = []; F = []
    prev_u = None
    for i in range(n):
        d = (P[min(n - 1, i + 1)] - P[max(0, i - 1)])
        u, w = _frame(d)
        if prev_u is not None and u.dot(prev_u) < 0: u, w = -u, -w
        prev_u = u
        r = radii[i]; ra, rb = (r, r) if not isinstance(r, (list, tuple)) else r
        for j in range(sides):
            a = TAU * j / sides; V.append(tuple(P[i] + u * math.cos(a) * ra + w * math.sin(a) * rb))
    for i in range(n - 1):
        for j in range(sides):
            jn = (j + 1) % sides; F.append((i * sides + j, i * sides + jn, (i + 1) * sides + jn, (i + 1) * sides + j))
    if cap0:
        V.append(tuple(P[0] - (P[1] - P[0]).normalized() * 0.0)); c = len(V) - 1
        for j in range(sides): F.append((c, (j + 1) % sides, j))
    if cap1:
        V.append(tuple(P[-1])); c = len(V) - 1; b = (n - 1) * sides
        for j in range(sides): F.append((c, b + j, b + (j + 1) % sides))
    return V, F

def plate(origin, U, Vv, outline, thick=0.004, bend=0.0):
    """flat shape: outline = [(s, t)…] in the plane origin + s·U + t·V (convex-ish); thickness along U×V; bend curls along s"""
    o = Vector(origin); U = Vector(U); Vv = Vector(Vv); N = U.cross(Vv).normalized()
    cs = sum(p[0] for p in outline) / len(outline); ct = sum(p[1] for p in outline) / len(outline)
    def at(s, t, side): return tuple(o + U * s + Vv * t + N * (side * thick / 2 + bend * s * s))
    V = []; F = []; n = len(outline)
    for side in (1, -1):
        V.append(at(cs, ct, side)); c = len(V) - 1
        for (s, t) in outline: V.append(at(s, t, side))
        for j in range(n):
            a, b = c + 1 + j, c + 1 + (j + 1) % n
            F.append((c, a, b) if side == 1 else (c, b, a))
    for j in range(n):   # rim
        a, b = 1 + j, 1 + (j + 1) % n; a2, b2 = n + 2 + j, n + 2 + (j + 1) % n
        F.append((a, a2, b2, b))
    return V, F

def eye_parts(c, r, bone, iris='#1a120a', side_dir=None):
    """glossy eyeball + a tiny catch-light"""
    p = Part('eye', bone=bone, mat=1, color=srgb(iris)); p.add(*ellipsoid(c, (r, r, r), 10, 6))
    c = Vector(c); d = Vector(side_dir) if side_dir else Vector((0, 0, 1))
    hl = c + (d.normalized() * 0.75 + Vector((0, 0.45, 0.25))).normalized() * r * 0.92
    h = Part('hl', bone=bone, mat=1, color=(1, 1, 1)); h.add(*ellipsoid(hl, (r * 0.22,) * 3, 6, 4))
    return [p, h]

def capsule_mesh(a, b, r0, r1, seg=14, ring=5, mid=6):
    """closed capsule from a to b (authoring), radii r0 at a and r1 at b, hemispherical ends"""
    a = Vector(a); b = Vector(b); d = b - a; L = d.length; dn = d.normalized() if L > 1e-9 else Vector((0, 1, 0))
    u, w = _frame(dn); V = []; F = []
    rows = []   # (centre, radius) rings from the a-pole to the b-pole
    for i in range(ring, 0, -1):
        th = math.pi / 2 * i / ring; rows.append((a - dn * r0 * math.sin(th), r0 * math.cos(th)))
    for i in range(mid + 1):
        t = i / mid; rows.append((a + d * t, r0 + (r1 - r0) * t))
    for i in range(1, ring + 1):
        th = math.pi / 2 * i / ring; rows.append((b + dn * r1 * math.sin(th), r1 * math.cos(th)))
    V.append(tuple(a - dn * r0))
    for (c, r) in rows[1:-1]:
        for j in range(seg):
            an = TAU * j / seg; V.append(tuple(c + (u * math.cos(an) + w * math.sin(an)) * r))
    V.append(tuple(b + dn * r1)); n = len(rows) - 2
    for j in range(seg): F.append((0, 1 + (j + 1) % seg, 1 + j))
    for i in range(n - 1):
        a0 = 1 + i * seg; a1 = a0 + seg
        for j in range(seg): jn = (j + 1) % seg; F.append((a0 + j, a0 + jn, a1 + jn, a1 + j))
    last = len(V) - 1; a0 = 1 + (n - 1) * seg
    for j in range(seg): F.append((last, a0 + j, a0 + (j + 1) % seg))
    return V, F

def metabody(sc, coll, sid, blobs, res, tris, smooth_it=6):
    """union of the blob shapes (voxel remesh) → smoothed (fillets at the joins) → decimated to the budget"""
    V = []; F = []
    for bl in blobs:
        if bl.get('noBody') or bl.get('neg'): continue
        if bl['t'] == 'ell':
            vv, ff = ellipsoid(bl['c'], bl['r'], 24, 14, bl.get('rot'))
        else:
            r = bl['r']; r0, r1 = (r, r) if not isinstance(r, (list, tuple)) else r
            vv, ff = capsule_mesh(bl['a'], bl['b2'], r0, r1)
        o = len(V); V += vv; F += [tuple(i + o for i in f) for f in ff]
    raw = bpy.data.meshes.new('raw_' + sid); raw.from_pydata([B(v) for v in V], [], F)
    tmp = bpy.data.objects.new('tmp_' + sid, raw); coll.objects.link(tmp)
    rm = tmp.modifiers.new('rm', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = res; rm.adaptivity = 0.0
    sm = tmp.modifiers.new('sm', 'CORRECTIVE_SMOOTH') if False else tmp.modifiers.new('sm', 'SMOOTH')
    sm.factor = 0.5; sm.iterations = smooth_it
    tr = tmp.modifiers.new('tr', 'TRIANGULATE')
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    n0 = len(tmp.evaluated_get(dg).data.polygons)
    dc = tmp.modifiers.new('dc', 'DECIMATE'); dc.ratio = min(1.0, tris / max(1, n0)); dc.use_collapse_triangulate = True
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
    bpy.data.objects.remove(tmp); bpy.data.meshes.remove(raw)
    verts = [T(v.co) for v in me.vertices]; faces = [tuple(p.vertices) for p in me.polygons]
    bpy.data.meshes.remove(me)
    return verts, faces

# ───────────────────────────────────────────── shared helpers for specs
def lerp3(a, b, t): return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))
def bez(pts, n):
    """n points along a Catmull-Rom curve through pts"""
    P = [Vector(p) for p in pts]; out = []
    for i in range(n):
        u = i / (n - 1) * (len(P) - 1); k = min(int(u), len(P) - 2); t = u - k
        p0, p1, p2, p3 = P[max(0, k - 1)], P[k], P[k + 1], P[min(len(P) - 1, k + 2)]
        t2, t3 = t * t, t * t * t
        out.append(tuple(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)))
    return out

def chain(prefix, pts, parent):
    """bones prefix1..n along the points (n = len(pts)-1)"""
    out = []; par = parent
    for i in range(len(pts) - 1):
        n = prefix + str(i + 1); out.append((n, par, tuple(pts[i]), tuple(pts[i + 1]))); par = n
    return out

def tail_part(prefix, nb, pts, r0, r1, sides=6, n=None, col=None, tag='tail', colfn=None):
    """a tapered tube along a smooth curve through pts, skinned to bones prefix1..nb"""
    n = n or max(6, nb * 4); C = bez(pts, n)
    R = [r0 + (r1 - r0) * (i / (n - 1)) for i in range(n)]
    p = Part(tag, bones=[prefix + str(i + 1) for i in range(nb)], color=col)
    V, F = tube(C, R, sides, cap0=False, cap1=True)
    cols = [colfn(i // sides / (n - 1)) if i < n * sides else colfn(1.0) for i in range(len(V))] if colfn else None
    p.add(V, F, cols); return p

def ear_part(base, tip_dir, w, h, bone, outer, inner, thick=0.004, cup=0.35, seg=12, point=False, tipcol=None):
    """rounded ear: an oval plate from base toward tip_dir, cupped forward; inner face coloured `inner`"""
    base = Vector(base); up = Vector(tip_dir).normalized()
    side = up.cross(Vector((0, 0, 1))); side = side.normalized() if side.length > 1e-6 else Vector((1, 0, 0))
    fwd = side.cross(up).normalized()
    if fwd.z < 0: fwd = -fwd
    V = []; F = []; C = []
    rows = 6
    for r in range(rows + 1):
        t = r / rows; ww = (w * (1 - t) ** 0.85 * min(1, 0.55 + t * 3) if point else w * math.sin(math.pi * (0.15 + 0.85 * t)) ** 0.7) if r < rows else 0.0
        for j in range(seg):
            a = -1 + 2 * j / (seg - 1)
            x = a * ww; y = t * h; z = (a * a) * cup * w      # cupped: edges forward
            P = base + side * x + up * y + fwd * z
            V.append(tuple(P + fwd * thick * 0.5)); C.append(inner if abs(a) < 0.75 and 0.08 < t < 0.92 else (tipcol if (tipcol and t > 0.7) else outer))
    o = len(V)
    for r in range(rows + 1):
        for j in range(seg):
            P = Vector(V[r * seg + j]) - fwd * thick; V.append(tuple(P)); C.append(tipcol if (tipcol and r / rows > 0.45) else outer)
    for r in range(rows):
        for j in range(seg - 1):
            a, b, c2, d = r * seg + j, r * seg + j + 1, (r + 1) * seg + j + 1, (r + 1) * seg + j
            F.append((a, b, c2, d)); F.append((o + d, o + c2, o + b, o + a))
    for r in range(rows):   # rim
        for j in (0, seg - 1):
            a, d = r * seg + j, (r + 1) * seg + j
            F.append((a, d, o + d, o + a) if j == 0 else (d, a, o + a, o + d))
    for j in range(seg - 1):
        a, b = j, j + 1; F.append((b, a, o + a, o + b))
    p = Part('ear', bone=bone); p.add(V, F, C); return p

def whiskers(root, side, bone, n=5, L=0.05, col=(0.9, 0.9, 0.88), spread=0.5):
    p = Part('whisker', bone=bone, color=col)
    root = Vector(root)
    for i in range(n):
        a = (i / (n - 1) - 0.5) * spread
        d = Vector((side * 1.0, math.sin(a) * 0.9, 0.35 + 0.2 * math.cos(a * 2))).normalized()
        p.add(*tube([root + Vector((0, a * 0.01, 0)), root + d * L * 0.6 + Vector((0, -0.002, 0)), root + d * L], [0.0007, 0.0005, 0.0002], 3, cap0=False, cap1=False))
    return p

def gait(ph, legs, amp=25, lift=0.0, knees=None, kamp=30):
    """trot / walk: legs = {name: phase offset}; pitch swing, optional knee flex during the forward swing"""
    p = {}
    for leg, off in legs.items():
        u = (ph + off) % 1; sw = math.cos(TAU * u)            # +1 back … -1 forward
        p[leg] = (amp * sw, 0, 0)
        if knees and leg in knees:
            fl = max(0, math.sin(TAU * u))                    # flex while swinging forward
            p[knees[leg]] = (-kamp * fl if leg[0] == 'h' else kamp * fl, 0, 0)
    return p

def _h3(i, j, k, s):
    n = (i * 73856093) ^ (j * 19349663) ^ (k * 83492791) ^ (s * 2654435761)
    n = (n ^ (n >> 13)) * 1274126177 & 0xffffffff; return ((n ^ (n >> 16)) & 0xffffff) / 0xffffff
def worley(p, scale, seed=1):
    """distance (in cell units) from p to the nearest jittered feature point, and that point's random id 0..1"""
    x, y, z = p[0] * scale, p[1] * scale, p[2] * scale
    ix, iy, iz = math.floor(x), math.floor(y), math.floor(z); best = (9.0, 0.0)
    for a in (-1, 0, 1):
        for b in (-1, 0, 1):
            for c in (-1, 0, 1):
                i, j, k = ix + a, iy + b, iz + c
                fx = i + _h3(i, j, k, seed); fy = j + _h3(i, j, k, seed + 1); fz = k + _h3(i, j, k, seed + 2)
                d = math.sqrt((x - fx) ** 2 + (y - fy) ** 2 + (z - fz) ** 2)
                if d < best[0]: best = (d, _h3(i, j, k, seed + 3))
    return best

# ───────────────────────────────────────────── standard quadruped motion
def _S(x): return math.sin(TAU * x)
def quad_actions(names, c=None):
    """walk / run / idle / eat / sleep / sit / swim for bones named hips (root), chest, neck?, head, fl fl2 fr fr2 hl hl2 hr hr2,
    tail1…, earL/earR?.  c: amp, knee, run_amp, bob, drop (lying), head_eat, neck_eat, sit_hips, gait ('walk'|'pace'), tailsw"""
    c = dict(dict(amp=24, knee=34, run_amp=38, bob=0.01, drop=0.1, head_eat=35, neck_eat=30, sit=40, tailsw=10, look=28,
                  frames=dict(walk=32, run=18, idle=150, eat=48, sleep=120), run_bound=False, earflick=20), **(c or {}))
    has = set(names); tails = sorted([n for n in names if n.startswith('tail')], key=lambda n: int(n[4:] or 0))
    two = 'fl2' in has
    def legs(ph, amp, knee, offs):
        p = {}
        for leg, off in offs.items():
            if leg not in has: continue
            u = (ph + off) % 1; sw = math.cos(TAU * u)               # +1 foot back … -1 foot forward
            lift = max(0, math.sin(TAU * u))                        # swinging forward
            if leg[0] == 'f':
                p[leg] = (amp * sw, 0, 0)
                if two: p[leg + '2'] = (knee * lift, 0, 0)
            else:
                p[leg] = (amp * sw * 0.9, 0, 0)
                if two: p[leg + '2'] = (-knee * 0.8 * lift, 0, 0)
        return p
    def tail(p, ph, sw, base=0.0, lift=0.0):
        for i, n in enumerate(tails):
            p[n] = (-lift + base, sw * _S(ph - i * 0.1), 0)
    def ears(p, ph, amt):
        if 'earL' in has:
            p['earL'] = (0, 0, amt * max(0, _S(ph * 3)) ** 8); p['earR'] = (0, 0, -amt * max(0, _S(ph * 3 + 0.3)) ** 8)
    def walk(ph):
        p = legs(ph, c['amp'], c['knee'], {'hl': 0, 'fl': 0.25, 'hr': 0.5, 'fr': 0.75} if c.get('gait') != 'trot' else {'hl': 0, 'fr': 0, 'hr': 0.5, 'fl': 0.5})
        p['hips'] = ((0, 2.5 * _S(ph), 2.5 * _S(ph)), (0, c['bob'] * 0.5 * _S(ph * 2), 0))
        p['chest'] = (0, -3 * _S(ph), -2 * _S(ph))
        if 'neck' in has: p['neck'] = (2 * _S(ph * 2 + 0.25), 2 * _S(ph), 0)
        p['head'] = (-2 * _S(ph * 2 + 0.25), 0, 0)
        tail(p, ph, c['tailsw'] * 0.6); ears(p, ph, 0); return p
    def run(ph):
        if c['run_bound']:
            p = legs(ph, c['run_amp'], c['knee'] * 1.3, {'hl': 0, 'hr': 0.06, 'fl': 0.5, 'fr': 0.56})
            p['hips'] = ((10 * _S(ph), 0, 0), (0, c['bob'] * 2.5 * max(0, _S(ph + 0.25)), 0))
            p['chest'] = (-14 * _S(ph), 0, 0)
        else:   # rotary gallop
            p = legs(ph, c['run_amp'], c['knee'] * 1.3, {'hl': 0, 'hr': 0.1, 'fl': 0.45, 'fr': 0.55})
            p['hips'] = ((6 * _S(ph), 0, 0), (0, c['bob'] * 2 * max(0, _S(ph + 0.25)), 0))
            p['chest'] = (-9 * _S(ph), 0, 0)
        if 'neck' in has: p['neck'] = (-4 + 5 * _S(ph + 0.2), 0, 0)
        p['head'] = (4 * _S(ph + 0.4), 0, 0)
        tail(p, ph, c['tailsw'] * 0.3, lift=10); return p
    def idle(ph):
        look = _S(ph) * smooth(0.05, 0.2, ph) * smooth(0.95, 0.8, ph)
        look2 = _S(ph * 2) * smooth(0.45, 0.55, ph) * 0.4
        p = {'hips': ((0, 0, 0), (0, c['bob'] * 0.2 * _S(ph * 5), 0)), 'chest': (0.8 * _S(ph * 5), 6 * look, 0)}
        if 'neck' in has: p['neck'] = (-3 * look2, c['look'] * 0.5 * look, 0)
        p['head'] = (4 * look2, c['look'] * (0.5 if 'neck' in has else 1) * look, 5 * look)
        tail(p, ph * 2, c['tailsw']); ears(p, ph, c['earflick']); return p
    def eat(ph):
        ch = _S(ph * 4); step = _S(ph)
        p = {'hips': ((0, 0, 0), (0, -c['bob'] * 0.5, 0)), 'chest': (8, 3 * step, 0), 'fl': (-6, 0, 0), 'fr': (4, 0, 0)}
        if 'neck' in has: p['neck'] = (c['neck_eat'] + 3 * ch, 4 * step, 0); p['head'] = (c['head_eat'] * 0.5 + 4 * ch, 0, 0)
        else: p['head'] = (c['head_eat'] + 6 * ch, 4 * step, 0)
        tail(p, ph * 2, c['tailsw'] * 0.7); ears(p, ph, c['earflick']); return p
    def sleep(ph):
        b = _S(ph)
        p = {'hips': ((0, 0, 4), (0, -c['drop'] + c['bob'] * 0.15 * b, 0)), 'chest': (6, 6, 0),
             'fl': (-70, 0, 6), 'fr': (-70, 0, -6), 'hl': (60, 0, 10), 'hr': (60, 0, -10)}
        if two: p.update({'fl2': (110, 0, 0), 'fr2': (110, 0, 0), 'hl2': (-90, 0, 0), 'hr2': (-90, 0, 0)})
        if 'neck' in has: p['neck'] = (25, 25, 0); p['head'] = (15, 10, 8)
        else: p['head'] = (25, 22, 8)
        tail(p, 0, 0, base=8)
        for i, n in enumerate(tails): p[n] = (6, 14, 0)
        return p
    def sit(ph):
        look = _S(ph) * smooth(0.1, 0.3, ph) * smooth(0.9, 0.7, ph)
        p = {'hips': ((-c['sit'], 0, 0), (0, -c['drop'] * 0.45, -c['drop'] * 0.2)), 'chest': (-8, 6 * look, 0),
             'hl': (c['sit'] + 50, 0, 6), 'hr': (c['sit'] + 50, 0, -6), 'fl': (c['sit'] - 4, 0, 0), 'fr': (c['sit'] - 4, 0, 0)}
        if two: p.update({'hl2': (-100, 0, 0), 'hr2': (-100, 0, 0)})
        if 'neck' in has: p['neck'] = (c['sit'] * 0.4, 15 * look, 0)
        p['head'] = (c['sit'] * 0.4, 18 * look, 0)
        tail(p, ph, 4, base=c['sit'] * 0.6); ears(p, ph, c['earflick']); return p
    def swim(ph):
        p = legs(ph * 1.0, c['amp'] * 1.4, c['knee'], {'hl': 0, 'fl': 0.5, 'hr': 0.5, 'fr': 0})
        p['hips'] = ((4, 0, 0), (0, -c['drop'] * 0.2, 0))
        if 'neck' in has: p['neck'] = (-12, 0, 0)
        p['head'] = (-10, 3 * _S(ph), 0); tail(p, ph, c['tailsw'] * 0.6); return p
    F = c['frames']; A = dict(walk=walk, run=run, idle=idle, eat=eat, sleep=sleep, sit=sit, swim=swim)
    return {k: (F[k], fn) for k, fn in A.items() if k in F}

# ───────────────────────────────────────────── birds
def wing_part(L, sx, sh, span, chord0, colfn, sweep=0.0, dihedral=0.0, thick=0.01, rows=12, cols=5, tip=1.0, fingers=0, fdepth=0.25):
    """feathered wing, rest pose spread flat; bones w<L>1..3 run along the leading edge. colfn(s, c, top) → rgb"""
    sh = Vector(sh); V = []; F = []; C = []
    S = [((i / rows) ** 0.85) for i in range(rows + 1)]
    def LE(s): return sh + Vector((sx * span * s, dihedral * s, -sweep * s * s))
    def chord(s):
        base = chord0 * (1 - 0.25 * s) * max(0.0, (1 - s ** (2.2 * tip))) ** 0.45
        if fingers and s > 0.6:                     # slotted primaries on the outer hand
            k = (s - 0.6) / 0.4; base *= 1 - fdepth * k * (0.5 + 0.5 * math.cos(TAU * fingers * k))
        return max(base, chord0 * 0.04)
    grid_t = []; grid_b = []
    for s in S:
        le = LE(s); ch = chord(s); rt = []; rb = []
        for j in range(cols + 1):
            c = j / cols; P = le + Vector((0, 0, -ch * c))
            th = thick * (1 - c) ** 0.8 * (1 - 0.7 * s) + 0.0015
            rt.append(len(V)); V.append(tuple(P + Vector((0, th * 0.6, 0)))); C.append(colfn(s, c, True))
            rb.append(len(V)); V.append(tuple(P - Vector((0, th * 0.4, 0)))); C.append(colfn(s, c, False))
        grid_t.append(rt); grid_b.append(rb)
    for i in range(rows):
        for j in range(cols):
            a, b, c2, d = grid_t[i][j], grid_t[i + 1][j], grid_t[i + 1][j + 1], grid_t[i][j + 1]
            F.append((a, b, c2, d) if sx > 0 else (a, d, c2, b))
            a, b, c2, d = grid_b[i][j], grid_b[i + 1][j], grid_b[i + 1][j + 1], grid_b[i][j + 1]
            F.append((a, d, c2, b) if sx > 0 else (a, b, c2, d))
    for i in range(rows):      # leading & trailing rims
        for j in (0, cols):
            F.append((grid_t[i][j], grid_b[i][j], grid_b[i + 1][j], grid_t[i + 1][j]))
    for j in range(cols):      # tip
        F.append((grid_t[rows][j], grid_b[rows][j], grid_b[rows][j + 1], grid_t[rows][j + 1]))
    p = Part('wing', bones=['w%s1' % L, 'w%s2' % L, 'w%s3' % L]); p.add(V, F, C)
    bones = [('w%s1' % L, 'chest', tuple(LE(0.0)), tuple(LE(0.28))), ('w%s2' % L, 'w%s1' % L, tuple(LE(0.28)), tuple(LE(0.58))),
             ('w%s3' % L, 'w%s2' % L, tuple(LE(0.58)), tuple(LE(1.0)))]
    return p, bones

def tail_fan(base, length, w0, w1, colfn, bone='tail', rows=6, cols=6, thick=0.006, droop=0.0, notch=0.0):
    base = Vector(base); V = []; F = []; C = []; gt = []; gb = []
    for i in range(rows + 1):
        t = i / rows; w = w0 + (w1 - w0) * t; rt = []; rb = []
        for j in range(cols + 1):
            u = j / cols - 0.5
            z = -length * t * (1 - notch * (1 - (2 * u) ** 2) * t)
            P = base + Vector((u * w, -droop * t * t, z))
            rt.append(len(V)); V.append(tuple(P + Vector((0, thick / 2, 0)))); C.append(colfn(t, u, True))
            rb.append(len(V)); V.append(tuple(P - Vector((0, thick / 2, 0)))); C.append(colfn(t, u, False))
        gt.append(rt); gb.append(rb)
    for i in range(rows):
        for j in range(cols):
            F.append((gt[i][j], gt[i][j + 1], gt[i + 1][j + 1], gt[i + 1][j])); F.append((gb[i][j], gb[i + 1][j], gb[i + 1][j + 1], gb[i][j + 1]))
    for i in range(rows):
        F.append((gt[i][0], gt[i + 1][0], gb[i + 1][0], gb[i][0])); F.append((gt[i][cols], gb[i][cols], gb[i + 1][cols], gt[i + 1][cols]))
    for j in range(cols): F.append((gt[rows][j], gt[rows][j + 1], gb[rows][j + 1], gb[rows][j]))
    p = Part('tail', bone=bone); p.add(V, F, C); return p

def beak_part(base, length, w, h, col, tipcol=None, curve=0.0, bone='head', seg=8, rows=6, gloss=1, lower=None):
    """tapered beak from base forward (+z), optionally curved down; lower = (col) adds a slightly shorter lower mandible"""
    base = Vector(base); p = Part('beak', bone=bone, mat=gloss); V = []; F = []; C = []
    for i in range(rows + 1):
        t = i / rows; r = (1 - t) ** 0.9
        c = base + Vector((0, -curve * length * t * t, length * t))
        for j in range(seg):
            a = TAU * j / seg; V.append(tuple(c + Vector((math.cos(a) * w * r, math.sin(a) * h * r, 0)))); C.append(mix(col, tipcol or col, t ** 1.5))
    for i in range(rows):
        for j in range(seg):
            jn = (j + 1) % seg; F.append((i * seg + j, i * seg + jn, (i + 1) * seg + jn, (i + 1) * seg + j))
    V.append(tuple(base)); C.append(col); cb = len(V) - 1
    for j in range(seg): F.append((cb, (j + 1) % seg, j))
    p.add(V, F, C); return p

def bird_legs(hipL, ankleL, toes, col, thick=0.006, claw=None):
    """two legs (bones ll / lr from hip to ankle) with three forward toes and a hind toe"""
    parts = []; bones = []
    for sx, L in ((1, 'l'), (-1, 'r')):
        hip = Vector((sx * hipL[0], hipL[1], hipL[2])); ank = Vector((sx * ankleL[0], ankleL[1], ankleL[2]))
        p = Part('leg', bone='l' + L, color=col)
        p.add(*tube([hip, ank], [thick * 1.4, thick], 5))
        for a in (-0.45, 0.0, 0.45, math.pi):
            d = Vector((math.sin(a) * (1 if a != math.pi else 0), 0, math.cos(a)))
            tl = toes * (0.65 if a == math.pi else 1.0)
            p.add(*tube([ank, ank + d * tl * 0.6 + Vector((0, -thick * 0.3, 0)), ank + d * tl + Vector((0, -thick * 0.6, 0))], [thick * 0.8, thick * 0.6, thick * 0.35], 4))
        parts.append(p); bones.append(('l' + L, 'hips', tuple(hip), tuple(ank)))
    return parts, bones

def bird_actions(names, c=None):
    c = dict(dict(flap=55, flap_frames=14, fold=(86, -62, -6), fold2=-150, fold3=150, perch_pitch=-12, legH=0.1, raise_ground=True,
                  hop=False, bob=0.0, peck=55, glide_dihedral=8, frames=None), **(c or {}))
    has = set(names)
    fy, fp, fr = c['fold']
    def folded(p, k=1.0):
        for L, s in (('l', 1), ('r', -1)):
            p['w%s1' % L] = (fp * k, s * fy * k, s * fr * k); p['w%s2' % L] = (0, s * c['fold2'] * k, 0); p['w%s3' % L] = (0, s * c['fold3'] * k, 0)
        return p
    def tuck(p):
        for L in ('l', 'r'): p['l' + L] = (105, 0, 0)
        return p
    G = (0, c['legH'], 0) if c['raise_ground'] else (0, 0, 0)
    def perch(ph):
        look = _S(ph) * smooth(0.05, 0.2, ph) * smooth(0.95, 0.8, ph); l2 = _S(ph * 3) * smooth(0.4, 0.5, ph) * smooth(0.7, 0.6, ph)
        p = folded({'hips': ((c['perch_pitch'], 0, 0), None), 'chest': (0, 0, 0)})
        if 'neck' in has: p['neck'] = (-4 * l2, 25 * look, 0)
        p['head'] = (6 * l2, 35 * look, 10 * look)
        if 'tail' in has: p['tail'] = (-10 * max(0, _S(ph * 4)) ** 6, 0, 0)
        return p
    def idle(ph):
        p = perch(ph); p['hips'] = ((c['perch_pitch'], 0, 0), G); return p
    def walk(ph):
        p = folded({})
        if c['hop']:
            u = (ph % 1); up = max(0, math.sin(math.pi * u))
            p['hips'] = ((c['perch_pitch'] - 6 * up, 0, 0), (0, G[1] + 0.35 * c['legH'] * up, 0))
            for L in ('l', 'r'): p['l' + L] = (-25 * up, 0, 0)
        else:
            for L, off in (('l', 0), ('r', 0.5)):
                p['l' + L] = (30 * math.cos(TAU * (ph + off)), 0, 0)
            p['hips'] = ((c['perch_pitch'], 0, 3 * _S(ph)), (0, G[1] + 0.06 * c['legH'] * abs(_S(ph)), 0))
            bob = c['bob']
            if 'neck' in has: p['neck'] = (0, 0, 0)
            p['head'] = (0, 0, 0)
            if bob: p['head'] = ((-12 * bob * _S(ph * 2)), 0, 0); p['chest'] = (0, 0, 0)
        if 'tail' in has: p['tail'] = (4 * _S(ph * 2), 0, 0)
        return p
    def eat(ph):
        k = max(0, _S(ph * 2)) ** 2
        p = folded({'hips': ((c['perch_pitch'] + 10 + 25 * k, 0, 0), None)})
        if 'neck' in has: p['neck'] = (c['peck'] * 0.6 * k, 0, 0)
        p['head'] = (c['peck'] * 0.5 * k, 0, 0)
        if 'tail' in has: p['tail'] = (-15 * k, 0, 0)
        return p
    def sleep(ph):
        b = _S(ph)
        p = folded({'hips': ((c['perch_pitch'] + 6, 0, 0), (0, -0.25 * c['legH'] + 0.003 * b, 0))})
        for L in ('l', 'r'): p['l' + L] = (15, 0, 0)
        if 'neck' in has: p['neck'] = (25, 50, 0)
        p['head'] = (35, 60, 25)
        return p
    def fly(ph):
        a = c['flap']; u = TAU * ph; down = math.cos(u)              # +1 top of the upstroke … -1 bottom
        p = tuck({'hips': ((-4 + 4 * math.sin(u), 0, 0), (0, -0.015 * c['legH'] * math.sin(u), 0))})
        for L, s in (('l', 1), ('r', -1)):
            fold = max(0, math.sin(u + 0.6))                          # tuck the hand a little on the upstroke
            p['w%s1' % L] = (6 * math.sin(u), s * 6 * fold, s * a * down)
            p['w%s2' % L] = (0, s * -14 * fold, s * a * 0.25 * math.cos(u - 0.6))
            p['w%s3' % L] = (-10 * math.sin(u), s * 22 * fold, s * a * 0.3 * math.cos(u - 1.0))
        if 'tail' in has: p['tail'] = (3 * math.sin(u), 0, 0)
        if 'neck' in has: p['neck'] = (-4, 0, 0)
        p['head'] = (-3 * math.sin(u), 0, 0)
        return p
    def glide(ph):
        p = tuck({'hips': ((-3, 0, 2 * _S(ph)), None)})
        for L, s in (('l', 1), ('r', -1)):
            p['w%s1' % L] = (0, 0, s * (c['glide_dihedral'] + 2 * _S(ph))); p['w%s2' % L] = (0, 0, s * -3); p['w%s3' % L] = (-4, 0, s * -4)
        if 'head' in has: p['head'] = (-4, 6 * _S(ph), 0)
        return p
    F = dict(dict(perch=150, idle=150, walk=20, eat=40, sleep=120, fly=c['flap_frames'], glide=90), **(c['frames'] or {}))
    A = dict(perch=perch, idle=idle, walk=walk, eat=eat, sleep=sleep, fly=fly, glide=glide)
    return {k: (F[k], fn) for k, fn in A.items() if k in F}

def lift(dy, blobs, bones, parts):
    """move a whole spec up by dy (e.g. a ground bird modelled around its body centre → origin at the feet)"""
    for bl in blobs:
        for k in ('c', 'a', 'b2'):
            if k in bl: bl[k] = (bl[k][0], bl[k][1] + dy, bl[k][2])
    out = [(n, par, (h[0], h[1] + dy, h[2]), (t[0], t[1] + dy, t[2])) for (n, par, h, t) in bones]
    for p in parts: p.v = [(v[0], v[1] + dy, v[2]) for v in p.v]
    return out

# ───────────────────────────────────────────── butterflies
def bwing(L, sx, outline, top, under, rings=(0.18, 0.4, 0.62, 0.82, 1.0), n=40, gloss=False, root=(0.0, 0.0, 0.0)):
    """flat wing from the root (authoring x–z plane, x outward) to a closed outline [(x, z)…]; colours top(x, z, r) / under(x, z, r)"""
    root = Vector(root)
    # resample the outline evenly
    pts = [Vector((sx * a, 0, b)) for a, b in outline]; seg = []
    for i in range(len(pts)):
        a, b = pts[i], pts[(i + 1) % len(pts)]; seg.append((a, b, (b - a).length))
    tot = sum(x[2] for x in seg); out = []
    for k in range(n):
        d = tot * k / n
        for a, b, l in seg:
            if d <= l: out.append(a + (b - a) * (d / l if l else 0)); break
            d -= l
    V = []; F = []; C = []
    for side, cf, dy in ((1, top, 0.0007), (-1, under, -0.0007)):
        o = len(V); V.append(tuple(root + Vector((0, dy, 0)))); C.append(cf(abs(root.x), root.z, 0.0))
        for r in rings:
            for P in out:
                Q = root + (P - root) * r; V.append(tuple(Q + Vector((0, dy, 0)))); C.append(cf(abs(Q.x), Q.z, r))
        for j in range(n):
            a, b = o + 1 + j, o + 1 + (j + 1) % n; F.append((o, a, b) if side > 0 else (o, b, a))
        for ri in range(len(rings) - 1):
            for j in range(n):
                a0 = o + 1 + ri * n; a1 = a0 + n; jn = (j + 1) % n
                q = (a0 + j, a1 + j, a1 + jn, a0 + jn); F.append(q if side > 0 else tuple(reversed(q)))
    p = Part('wing', bone=None, mat=1 if gloss else 0); p.add(V, F, C); return p

def insect_actions(fore=('wl1', 'wr1'), hind=('wl2', 'wr2'), flap=70, frames=8):
    def wings(p, a1, a2=None):
        a2 = a1 if a2 is None else a2
        p[fore[0]] = (0, 0, a1); p[fore[1]] = (0, 0, -a1); p[hind[0]] = (0, 0, a2); p[hind[1]] = (0, 0, -a2); return p
    def fly(ph):
        u = TAU * ph; a = 25 + flap * 0.5 * (1 + math.cos(u)) - 20
        return wings({'body': ((-12 + 6 * math.sin(u), 0, 0), (0, -0.006 * math.cos(u), 0))}, a, a - 6 * math.sin(u))
    def glide(ph): return wings({'body': ((-6, 0, 3 * _S(ph)), None)}, 12 + 4 * _S(ph * 3))
    def perch(ph):
        # wings folded up over the back, opened now and then to bask
        o = smooth(0.2, 0.35, ph) * smooth(0.75, 0.6, ph)
        return wings({'body': ((0, 0, 0), None), 'antL': (5 * _S(ph * 2), 0, 0), 'antR': (5 * _S(ph * 2 + 0.3), 0, 0)}, 86 - 70 * o)
    def sleep(ph): return wings({'body': ((0, 0, 0), None)}, 88)
    return {'fly': (frames, fly), 'glide': (60, glide), 'perch': (150, perch), 'sleep': (60, sleep)}

def butterfly_spec(sid, fore, hind, ftop, fund, htop, hund, body_col, scale=1.0, gloss=False, meta=None, tails=None):
    k = scale
    blobs = [dict(t='ell', c=(0, 0, 0.012 * k), r=(0.011 * k, 0.012 * k, 0.02 * k), bone='body'),
             dict(t='cap', a=(0, -0.002 * k, -0.006 * k), b2=(0, -0.006 * k, -0.065 * k), r=(0.009 * k, 0.0035 * k), bone='body'),
             dict(t='ell', c=(0, 0.002 * k, 0.037 * k), r=(0.008 * k, 0.008 * k, 0.008 * k), bone='body')]
    bones = [('body', None, (0, 0, -0.04 * k), (0, 0, 0.04 * k))]
    parts = []
    for sx, L in ((1, 'l'), (-1, 'r')):
        fw = bwing(L, sx, [(a * k, b * k) for a, b in fore], ftop, fund, gloss=gloss, root=(sx * 0.008 * k, 0.003 * k, 0.018 * k))
        fw.bone = 'w%s1' % L; parts.append(fw)
        hw = bwing(L, sx, [(a * k, b * k) for a, b in hind], htop, hund, gloss=gloss, root=(sx * 0.008 * k, 0.002 * k, 0.0))
        hw.bone = 'w%s2' % L; parts.append(hw)
        bones += [('w%s1' % L, 'body', (sx * 0.006 * k, 0.004 * k, 0.015 * k), (sx * 0.08 * k, 0.004 * k, 0.03 * k)),
                  ('w%s2' % L, 'body', (sx * 0.006 * k, 0.003 * k, 0.0), (sx * 0.07 * k, 0.003 * k, -0.04 * k))]
        an = Part('ant', bone='ant' + ('L' if sx > 0 else 'R'), color=body_col)
        a0 = Vector((sx * 0.004 * k, 0.008 * k, 0.042 * k)); a1 = a0 + Vector((sx * 0.02 * k, 0.03 * k, 0.05 * k))
        an.add(*tube([a0, a1], [0.0009 * k, 0.0008 * k], 3, cap0=False)); an.add(*ellipsoid(tuple(a1), (0.0025 * k,) * 3, 5, 4)); parts.append(an)
        bones.append(('ant' + ('L' if sx > 0 else 'R'), 'body', tuple(a0), tuple(a1)))
        for j in range(3):   # legs
            lg = Part('leg', bone='body', color=body_col); b0 = Vector((sx * 0.006 * k, -0.006 * k, (0.022 - j * 0.01) * k))
            lg.add(*tube([b0, b0 + Vector((sx * 0.012 * k, -0.006 * k, 0)), b0 + Vector((sx * 0.016 * k, -0.013 * k, (0.004 - j * 0.004) * k))], [0.0008 * k] * 3, 3, cap0=False))
            parts.append(lg)
        parts += eye_parts((sx * 0.006 * k, 0.004 * k, 0.041 * k), 0.0035 * k, 'body', '#101010', (sx, 0.2, 0.6))
    def paint(P, N, tag): return body_col
    return dict(id=sid, bones=bones, blobs=blobs, parts=parts, paint=paint, res=0.0015 * k, tris=500, smooth=6,
                actions=insect_actions(), meta=meta or {})

# ───────────────────────────────────────────── tree dwellers
def _hp(p):
    h = p.get('hips')
    if h is None: return (0, 0, 0), (0, 0, 0)
    if isinstance(h, tuple) and len(h) == 2 and isinstance(h[0], (tuple, list)): return tuple(h[0]), tuple(h[1] or (0, 0, 0))
    return tuple(h), (0, 0, 0)
def reorient(fn, H, kind, extra=None):
    """climb: body upright on a trunk (belly toward +z, the trunk surface at the origin); hang: upside down under a branch
    (hands and feet at the origin). H = rest position of the hips bone's head (the rotation pivot)."""
    hx, hy, hz = H
    t = (0, hz - hy, -hy - hz) if kind == 'climb' else (0, -2 * hy, 0)
    def f(ph):
        p = fn(ph); rot, off = _hp(p)
        rot = (rot[0] - 90, rot[1], rot[2]) if kind == 'climb' else (rot[0], rot[1], rot[2] + 180)
        if kind == 'climb': off = (off[0], off[2], -off[1])      # the gait's own bob follows the body
        else: off = (-off[0], -off[1], off[2])
        p['hips'] = (rot, (off[0] + t[0], off[1] + t[1], off[2] + t[2]))
        if extra: extra(p, ph)
        return p
    return f

# ───────────────────────────────────────────── weights
def bone_weights(p, blobs, bones_by, cand=None, nmax=4):
    acc = {}
    for bl in blobs:
        if bl.get('neg'): continue
        if cand and bl['bone'] not in cand: continue
        q = blob_q(bl, p); w = max(0.0, 1 - (q / 1.7) ** 2) ** 2 * bl.get('w', 1.0)
        if w > 0: acc[bl['bone']] = acc.get(bl['bone'], 0) + w
    if not acc:   # fall back to the nearest bone segment
        best = None
        for n, b in bones_by.items():
            if cand and n not in cand: continue
            d, _ = _segdist(p, Vector(b['h']), Vector(b['t']))
            if best is None or d < best[0]: best = (d, n)
        acc = {best[1]: 1.0}
    items = sorted(acc.items(), key=lambda x: -x[1])[:nmax]
    s = sum(w for _, w in items); items = [(n, w / s) for n, w in items if w / s > 0.04]
    s = sum(w for _, w in items); return [(n, w / s) for n, w in items]

def seg_weights(p, bones_by, cand, nmax=2):
    ds = []
    for n in cand:
        b = bones_by[n]; d, _ = _segdist(p, Vector(b['h']), Vector(b['t'])); ds.append((d, n))
    ds.sort(); ds = ds[:nmax]
    if len(ds) == 1 or ds[0][0] < 1e-6: return [(ds[0][1], 1.0)]
    w = [(n, 1 / (d ** 3)) for d, n in ds]; s = sum(x for _, x in w); return [(n, x / s) for n, x in w if x / s > 0.05]

# ───────────────────────────────────────────── build
REG = {}
def build(spec, place=None):
    sid = spec['id']; sc = scene(); coll = collection(sc, 'A_' + sid)
    prev_scene = bpy.context.window.scene; bpy.context.window.scene = sc
    blobs = spec['blobs']; prep_blobs(blobs)
    bones = spec['bones']; bones_by = {b[0]: {'n': b[0], 'p': b[1], 'h': b[2], 't': b[3]} for b in bones}
    verts, faces = metabody(sc, coll, sid, blobs, spec.get('res', 0.01), spec.get('tris', 2600), spec.get('smooth', 6))
    nb = len(verts)
    tags = ['body'] * nb; mats = [0] * len(faces); vbones = [None] * nb; vcols = [None] * nb
    for part in spec.get('parts', []):
        o = len(verts); verts += [tuple(v) for v in part.v]
        faces += [tuple(i + o for i in f) for f in part.f]; mats += [part.mat] * len(part.f)
        for i in range(len(part.v)):
            tags.append(part.tag); vcols.append(part.c[i] if part.c[i] is not None else part.color)
            vbones.append(part.bone if part.bone else ('@' + ','.join(part.bones) if part.bones else None))
    # mesh
    me = bpy.data.meshes.new('M_' + sid); me.from_pydata([B(v) for v in verts], [], faces)
    bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    faces = [tuple(pl.vertices) for pl in me.polygons]
    for i, pl in enumerate(me.polygons): pl.material_index = mats[i]; pl.use_smooth = True
    mesh_o = bpy.data.objects.new('mesh_' + sid, me); coll.objects.link(mesh_o)
    for m in ('fur', 'gloss'):
        mm = bpy.data.materials.get('AK_' + m)
        if not mm:
            mm = bpy.data.materials.new('AK_' + m); mm.use_nodes = True
            bsdf = next(n for n in mm.node_tree.nodes if n.bl_idname == 'ShaderNodeBsdfPrincipled')
            ca = mm.node_tree.nodes.new('ShaderNodeVertexColor'); ca.layer_name = 'Col'
            mm.node_tree.links.new(ca.outputs['Color'], bsdf.inputs['Base Color'])
            bsdf.inputs['Roughness'].default_value = 0.82 if m == 'fur' else 0.12
            if m == 'gloss' and 'Coat Weight' in bsdf.inputs: bsdf.inputs['Coat Weight'].default_value = 0.6
        me.materials.append(mm)
    # colours
    rnd = random.Random(7)
    ca = me.color_attributes.new('Col', 'BYTE_COLOR', 'POINT')
    me.calc_loop_triangles() if hasattr(me, 'calc_loop_triangles') else None
    nrm = [T(v.normal) for v in me.vertices]
    paint = spec.get('paint')
    final_cols = []
    for i in range(len(verts)):
        if vcols[i] is not None and not (paint and tags[i] not in ('eye', 'hl') and spec.get('paintParts')):
            c = vcols[i]
        else:
            c = paint(Vector(verts[i]), Vector(nrm[i]), tags[i]) if paint else (0.6, 0.5, 0.4)
        final_cols.append(c); ca.data[i].color_srgb = (c[0], c[1], c[2], 1.0)
    # armature
    arm = bpy.data.armatures.new('R_' + sid); arm_o = bpy.data.objects.new('rig_' + sid, arm); coll.objects.link(arm_o)
    arm.display_type = 'STICK'
    vl = sc.view_layers[0]
    vl.objects.active = arm_o
    with bpy.context.temp_override(window=bpy.context.window, scene=sc, view_layer=vl, active_object=arm_o, object=arm_o, selected_objects=[arm_o], selected_editable_objects=[arm_o]):
        bpy.ops.object.mode_set(mode='EDIT')
        eb = {}
        for (n, par, h, t) in bones:
            b = arm.edit_bones.new(n); b.head = B(h); b.tail = B(t); b.roll = 0
            if par: b.parent = eb[par]; b.use_connect = False
            eb[n] = b
        bpy.ops.object.mode_set(mode='OBJECT')
    mesh_o.parent = arm_o
    for (n, *_r) in bones: mesh_o.vertex_groups.new(name=n)
    am = mesh_o.modifiers.new('arm', 'ARMATURE'); am.object = arm_o
    # weights
    VG = {g.name: g for g in mesh_o.vertex_groups}; W = []
    for i, v in enumerate(verts):
        p = Vector(v); vb = vbones[i]
        if vb is None: ws = bone_weights(p, blobs, bones_by)
        elif vb.startswith('@'): ws = seg_weights(p, bones_by, vb[1:].split(','))
        else: ws = [(vb, 1.0)]
        W.append(ws)
        for n, w in ws: VG[n].add([i], w, 'REPLACE')
    # actions
    for p in arm_o.pose.bones: p.rotation_mode = 'QUATERNION'
    arm_o.animation_data_create()
    acts = {}
    for name, (frames, fn) in spec.get('actions', {}).items():
        act = bpy.data.actions.get(sid + ':' + name)
        if act: bpy.data.actions.remove(act)
        act = bpy.data.actions.new(sid + ':' + name); act.use_fake_user = True
        arm_o.animation_data.action = act
        for f in range(frames + 1):
            ph = (f % frames) / frames
            pose = fn(ph) or {}
            for pb in arm_o.pose.bones:
                rr = pose.get(pb.name)
                q = Quaternion(); loc = Vector()
                if rr:
                    rot, off = (rr if isinstance(rr, tuple) and len(rr) == 2 and isinstance(rr[0], (tuple, list)) else (rr, None))
                    if rot:
                        e = [math.radians(x) for x in rot]
                        qa = (Quaternion(Vector((0, -1, 0)), e[2]) if False else Quaternion())
                        # authoring axes: x side, y up, z forward  →  Blender axes x, z, -y ; order: yaw(y) · pitch(x) · roll(z)
                        qw = Quaternion(Vector((0, 0, 1)), e[1]) @ Quaternion(Vector((1, 0, 0)), e[0]) @ Quaternion(Vector((0, -1, 0)), e[2])
                        rq = pb.bone.matrix_local.to_quaternion(); q = rq.inverted() @ qw @ rq
                    if off: loc = pb.bone.matrix_local.to_quaternion().inverted() @ B(off)
                pb.rotation_quaternion = q; pb.location = loc
                pb.keyframe_insert('rotation_quaternion', frame=f + 1); pb.keyframe_insert('location', frame=f + 1)
        acts[name] = frames
    first = spec.get('show', 'walk' if 'walk' in acts else next(iter(acts), None))
    if first: arm_o.animation_data.action = bpy.data.actions[sid + ':' + first]
    if place: arm_o.location = B(place)
    bpy.context.window.scene = prev_scene
    REG[sid] = dict(spec=spec, verts=verts, faces=faces, mats=mats, cols=final_cols, W=W, arm=arm_o, mesh=mesh_o, acts=acts)
    return dict(verts=len(verts), tris=sum(len(f) - 2 for f in faces), body=nb, bones=len(bones), actions=list(acts))

# ───────────────────────────────────────────── export (compact, for the game)
def _b64(fmt, arr): return base64.b64encode(struct.pack('<%d%s' % (len(arr), fmt), *arr)).decode()

def export(sid, fps=30):
    R = REG[sid]; spec = R['spec']; arm_o = R['arm']; arm = arm_o.data
    names = [b[0] for b in spec['bones']]; idx = {n: i for i, n in enumerate(names)}
    out = {'v': 1, 'id': sid}
    bl = []
    for n in names:
        b = arm.bones[n]; M = b.matrix_local if not b.parent else b.parent.matrix_local.inverted() @ b.matrix_local
        M3 = C4 @ M @ C4i; t, q, s = M3.decompose()
        bl.append({'n': n, 'p': idx[b.parent.name] if b.parent else -1, 't': [round(x, 5) for x in t], 'q': [round(x, 6) for x in (q.x, q.y, q.z, q.w)]})
    out['bones'] = bl
    V = R['verts']; mn = [min(v[i] for v in V) for i in range(3)]; mx = [max(v[i] for v in V) for i in range(3)]
    out['box'] = [round(x, 5) for x in mn + mx]
    qp = []
    for v in V:
        for i in range(3): qp.append(int(round((v[i] - mn[i]) / max(1e-6, mx[i] - mn[i]) * 65535)) - 32768)
    out['pos'] = _b64('h', qp)
    out['col'] = _b64('B', [int(round(max(0, min(1, c)) * 255)) for col in R['cols'] for c in col])
    J = []; Wt = []
    for ws in R['W']:
        ws = (ws + [(names[0], 0.0)] * 4)[:4]
        q = [int(round(w * 255)) for _, w in ws]; q[0] += 255 - sum(q)
        J += [idx[n] for n, _ in ws]; Wt += q
    out['sk'] = _b64('B', J); out['sw'] = _b64('B', Wt)
    # triangles, grouped by material
    groups = []; I = []
    for m in (0, 1):
        st = len(I)
        for f, mm in zip(R['faces'], R['mats']):
            if mm != m: continue
            for k in range(1, len(f) - 1): I += [f[0], f[k], f[k + 1]]
        if len(I) > st: groups.append([st, len(I) - st, m])
    out['idx'] = _b64('H', I); out['groups'] = groups
    # clips: local transform of every bone per frame (quaternion; the root also translates)
    clips = {}
    rest = {n: (arm.bones[n].matrix_local if not arm.bones[n].parent else arm.bones[n].parent.matrix_local.inverted() @ arm.bones[n].matrix_local) for n in names}
    sc = arm_o.users_scene[0]
    for name, frames in R['acts'].items():
        arm_o.animation_data.action = bpy.data.actions[sid + ':' + name]
        Q = []; P = []; moving = set(); rows = []
        step = 2 if frames >= 60 and frames % 2 == 0 else 1
        for f in range(0, frames, step):
            sc.frame_set(f + 1)
            row = []
            for n in names:
                pb = arm_o.pose.bones[n]; M = C4 @ rest[n] @ pb.matrix_basis @ C4i
                t, q, s = M.decompose(); row.append((t, q))
            rows.append(row)
        for bi, n in enumerate(names):
            q0 = rows[0][bi][1]
            if any(abs(r[bi][1].dot(q0)) < 0.99999 for r in rows): moving.add(bi)
        mv = sorted(moving)
        for r in rows:
            prev = None
            for bi in mv:
                q = r[bi][1]; Q += [int(round(x * 32767)) for x in (q.x, q.y, q.z, q.w)]
        root = 0; r0 = rows[0][root][0]
        travel = any((r[root][0] - r0).length > 1e-5 for r in rows)
        clip = {'n': frames // step, 'fps': fps // step, 'b': mv, 'q': _b64('h', Q)}
        if travel:
            clip['r'] = [round(x, 4) for r in rows for x in r[root][0]]
        clips[name] = clip
    out['clips'] = clips
    meta = dict(spec.get('meta', {}))
    out['meta'] = meta
    return json.dumps(out, separators=(',', ':'))

def export_file(sid, folder):
    js = export(sid); p = os.path.join(folder, sid + '.json')
    with open(p, 'w', encoding='utf-8') as f: f.write(js)
    return p, len(js)

# ───────────────────────────────────────────── preview render
def stage(sc):
    """camera + soft sun + sky for previews (scene 'animals')"""
    if not sc.camera:
        cam = bpy.data.cameras.new('AKcam'); cam.lens = 60; co = bpy.data.objects.new('AKcam', cam); sc.collection.objects.link(co); sc.camera = co
        sun = bpy.data.lights.new('AKsun', 'SUN'); sun.energy = 3.2; sun.angle = 0.2; so = bpy.data.objects.new('AKsun', sun); sc.collection.objects.link(so)
        so.rotation_euler = (math.radians(50), 0, math.radians(35))
        gp = bpy.data.meshes.new('AKground'); bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=30); bm.to_mesh(gp); bm.free()
        g = bpy.data.objects.new('AKground', gp); sc.collection.objects.link(g)
        gm = bpy.data.materials.new('AKground'); gm.use_nodes = True
        bs = next(n for n in gm.node_tree.nodes if n.bl_idname == 'ShaderNodeBsdfPrincipled'); bs.inputs['Base Color'].default_value = (0.32, 0.26, 0.17, 1); bs.inputs['Roughness'].default_value = 1
        gp.materials.append(gm)
        w = sc.world; w.use_nodes = True
        bg = next((n for n in w.node_tree.nodes if n.bl_idname == 'ShaderNodeBackground'), None)
        if bg: bg.inputs['Color'].default_value = (0.55, 0.68, 0.85, 1); bg.inputs['Strength'].default_value = 0.9
    try: sc.render.engine = 'BLENDER_EEVEE_NEXT'
    except Exception: sc.render.engine = 'BLENDER_EEVEE'
    sc.render.resolution_x = 900; sc.render.resolution_y = 600; sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 85
    try: sc.view_settings.view_transform = 'AgX'
    except Exception: pass
    return sc.camera

def shot(sid, path, action=None, frame=1, yaw=35, pitch=12, dist=None, target=None):
    sc = scene(); cam = stage(sc); R = REG[sid]; arm_o = R['arm']
    for c in sc.collection.children: c.hide_render = (c.name != 'A_' + sid)
    if action: arm_o.animation_data.action = bpy.data.actions[sid + ':' + action]
    sc.frame_set(frame)
    meta = R['spec'].get('meta', {}); L = max(meta.get('length', 1), meta.get('height', 1))
    tgt = Vector(target) if target else Vector((0, meta.get('height', 0.5) * 0.45, 0))
    d = dist or L * 2.3
    y, p = math.radians(yaw), math.radians(pitch)
    eye = tgt + Vector((math.sin(y) * math.cos(p) * d, math.sin(p) * d, math.cos(y) * math.cos(p) * d))
    cam.location = arm_o.location + B(eye)
    cam.rotation_euler = (B(tgt) + arm_o.location - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = path
    prev = bpy.context.window.scene; bpy.context.window.scene = sc
    bpy.ops.render.render(write_still=True, scene=sc.name)
    bpy.context.window.scene = prev
    return path
