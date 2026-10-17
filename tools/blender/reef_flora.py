# reef_flora.py – the reef's fixed life, modelled in Blender: corals, sponges, the sea anemone, the giant clam,
# seagrass, algae and reef-rock boulders. Exec it into the session namespace (bridge/session.py) after the kits.
#
# Each model is real geometry (branches, grooves, polyps, tentacles, fluted shells), unioned with a voxel remesh where
# parts meet, given surface detail (corallites, pores, maze ridges) by displacing the dense mesh, painted per vertex,
# shaded with ambient occlusion computed by ray casts (BVH, no render needed), then decimated to the game budget.
#   flora_job(id, variants=3, preview=True) → reef/flora/<id>.json (+ reef/pv/f_<id>.jpg), one entry per variant:
#       { p: positions (authoring: x, y up, z), n: normals, c: sRGB 0..255, i: triangle indices, h: height,
#         perch: [[x, y, z]…] (where fish rest), crown: {top, bottom, radius, density} }
# The game (src/models/reef-plants.js) draws them with the coral material (bleaching, sway of soft parts, night glow).
# Authoring size = the procedural stand-ins' size; the game multiplies by its diorama SIZE, as before.
import bpy, bmesh, math, random, json, os, time
import numpy as np
from mathutils import Vector, Matrix, noise
from mathutils.bvhtree import BVHTree

FD = os.path.join(os.path.dirname(D), 'reef')
os.makedirs(os.path.join(FD, 'flora'), exist_ok=True); os.makedirs(os.path.join(FD, 'pv'), exist_ok=True)
TAU = math.tau

def hexc(h):
    h = h.lstrip('#'); return Vector(tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)))
def lerpc(a, b, t):
    t = max(0.0, min(1.0, t)); return a * (1 - t) + b * t
def sm(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t)

def fscene():
    sc = bpy.data.scenes.get('reef_flora')
    if not sc:
        sc = bpy.data.scenes.new('reef_flora')
        w = bpy.data.worlds.get('reef_world') or bpy.data.worlds.new('reef_world')
        w.use_nodes = True; bg = w.node_tree.nodes.get('Background')
        if bg: bg.inputs[0].default_value = (0.32, 0.55, 0.62, 1); bg.inputs[1].default_value = 0.9
        sc.world = w
    return sc

def fcoll(sc, name):
    c = bpy.data.collections.get(name)
    if c:
        for o in list(c.objects):
            me = o.data; bpy.data.objects.remove(o, do_unlink=True)
            if me and me.users == 0 and isinstance(me, bpy.types.Mesh): bpy.data.meshes.remove(me)
    else:
        c = bpy.data.collections.new(name); sc.collection.children.link(c)
    return c

# ───────────────────────────────────────── mesh builders (Blender coordinates, z up)
class MB:
    """collects vertices / faces of many primitives"""
    def __init__(self): self.V = []; self.F = []
    def add(self, V, F):
        o = len(self.V); self.V += [tuple(v) for v in V]; self.F += [tuple(i + o for i in f) for f in F]; return self
    def obj(self, name, coll):
        me = bpy.data.meshes.new(name); me.from_pydata(self.V, [], self.F); me.validate()
        o = bpy.data.objects.new(name, me); coll.objects.link(o); return o

def frame(d):
    d = Vector(d).normalized(); up = Vector((0, 0, 1)) if abs(d.z) < 0.95 else Vector((1, 0, 0))
    u = d.cross(up).normalized(); w = u.cross(d).normalized(); return u, w

def tube(pts, radii, sides=8, cap0=True, cap1=True, flat=1.0):
    P = [Vector(p) for p in pts]; n = len(P); V = []; F = []; pu = None
    for i in range(n):
        d = P[min(n - 1, i + 1)] - P[max(0, i - 1)]
        dn = d.normalized(); u, w = frame(dn)
        if pu is not None:
            # parallel transport: keep the ring from twisting
            u = (pu - dn * pu.dot(dn)).normalized(); w = u.cross(dn).normalized()
        pu = u; r = radii[i]
        for j in range(sides):
            a = TAU * j / sides; V.append(P[i] + u * math.cos(a) * r + w * math.sin(a) * r * flat)
    for i in range(n - 1):
        for j in range(sides):
            jn = (j + 1) % sides; F.append((i * sides + j, i * sides + jn, (i + 1) * sides + jn, (i + 1) * sides + j))
    if cap0:
        V.append(P[0] - (P[1] - P[0]).normalized() * radii[0] * 0.6); c = len(V) - 1
        for j in range(sides): F.append((c, (j + 1) % sides, j))
    if cap1:
        V.append(P[-1] + (P[-1] - P[-2]).normalized() * radii[-1] * 0.8); c = len(V) - 1; b = (n - 1) * sides
        for j in range(sides): F.append((c, b + j, b + (j + 1) % sides))
    return V, F

def sphere(c, r, seg=12, ring=8, sz=1.0):
    c = Vector(c); V = [c + Vector((0, 0, r * sz))]; F = []
    for i in range(1, ring):
        th = math.pi * i / ring
        for j in range(seg):
            ph = TAU * j / seg; V.append(c + Vector((math.sin(th) * math.cos(ph) * r, math.sin(th) * math.sin(ph) * r, math.cos(th) * r * sz)))
    V.append(c - Vector((0, 0, r * sz)))
    for j in range(seg): F.append((0, 1 + j, 1 + (j + 1) % seg))
    for i in range(ring - 2):
        a0 = 1 + i * seg; a1 = a0 + seg
        for j in range(seg): jn = (j + 1) % seg; F.append((a0 + j, a1 + j, a1 + jn, a0 + jn))
    last = len(V) - 1; a0 = 1 + (ring - 2) * seg
    for j in range(seg): F.append((last, a0 + (j + 1) % seg, a0 + j))
    return V, F

def lathe(profile, seg=32, wob=None):
    """surface of revolution: profile [(r, z)…] from bottom to top"""
    V = []; F = []; n = len(profile)
    for i, (r, z) in enumerate(profile):
        for j in range(seg):
            a = TAU * j / seg; k = wob(a, z) if wob else 1.0
            V.append(Vector((math.cos(a) * r * k, math.sin(a) * r * k, z)))
    for i in range(n - 1):
        for j in range(seg):
            jn = (j + 1) % seg; F.append((i * seg + j, i * seg + jn, (i + 1) * seg + jn, (i + 1) * seg + j))
    return V, F

# ───────────────────────────────────────── processing
def apply_mods(o):
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg)); old = o.data; o.modifiers.clear(); o.data = me
    if old.users == 0: bpy.data.meshes.remove(old)

def union(o, voxel, smooth_it=2):
    m = o.modifiers.new('rm', 'REMESH'); m.mode = 'VOXEL'; m.voxel_size = voxel; m.adaptivity = 0.0
    if smooth_it:
        s = o.modifiers.new('sm', 'SMOOTH'); s.factor = 0.5; s.iterations = smooth_it
    apply_mods(o)

def subdivide(o, levels=1):
    m = o.modifiers.new('sub', 'SUBSURF'); m.levels = levels; m.render_levels = levels; apply_mods(o)

def displace(o, fn):
    """fn(P, N) → offset along the normal (metres)"""
    me = o.data; me.update()
    n = len(me.vertices); co = np.empty(n * 3, np.float32); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    nr = np.empty(n * 3, np.float32); me.vertices.foreach_get('normal', nr); nr = nr.reshape(-1, 3)
    d = np.array([fn(Vector(co[i]), Vector(nr[i])) for i in range(n)], np.float32)
    co = co + nr * d[:, None]; me.vertices.foreach_set('co', co.reshape(-1)); me.update()

def decimate(o, tris):
    tr = o.modifiers.new('tr', 'TRIANGULATE'); apply_mods(o)
    n0 = len(o.data.polygons)
    if n0 > tris:
        m = o.modifiers.new('dc', 'DECIMATE'); m.ratio = tris / n0; m.use_collapse_triangulate = True; apply_mods(o)

def ao_colors(o, paint, rays=20, dist=None, strength=0.75):
    """per-vertex colour = paint(P, N) × ambient occlusion from BVH ray casts over the upper hemisphere of the normal"""
    me = o.data; me.update()
    bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.triangulate(bm, faces=bm.faces[:]); bm.verts.ensure_lookup_table()
    tree = BVHTree.FromBMesh(bm)
    n = len(me.vertices); co = np.empty(n * 3, np.float32); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    nr = np.empty(n * 3, np.float32); me.vertices.foreach_get('normal', nr); nr = nr.reshape(-1, 3)
    size = max(o.dimensions); dist = dist or size * 0.2
    rng = random.Random(3); dirs = []
    for k in range(rays):                      # cosine-weighted hemisphere (fixed set, rotated per vertex)
        u, v = (k + 0.5) / rays, rng.random(); r = math.sqrt(u); a = TAU * v
        dirs.append(Vector((r * math.cos(a), r * math.sin(a), math.sqrt(max(0.0, 1 - u)))))
    cols = np.zeros((n, 3), np.float32)
    for i in range(n):
        P = Vector(co[i]); N = Vector(nr[i]).normalized()
        t, b = frame(N)
        occ = 0
        for d in dirs:
            w = t * d.x + b * d.y + N * d.z
            if w.z < -0.2 and P.z < 0.02: occ += 1; continue          # the ground
            hit = tree.ray_cast(P + N * 0.002, w, dist)
            if hit[0] is not None: occ += 1
        ao = 1 - strength * occ / rays
        c = paint(P, N) * ao * 1.08
        cols[i] = (min(1, max(0, c.x)), min(1, max(0, c.y)), min(1, max(0, c.z)))
    bm.free()
    # preview: a byte colour attribute (sRGB) used by the preview material
    ca = me.color_attributes.get('Col') or me.color_attributes.new('Col', 'BYTE_COLOR', 'POINT')
    lin = np.where(cols <= 0.04045, cols / 12.92, ((cols + 0.055) / 1.055) ** 2.4)
    ca.data.foreach_set('color', np.hstack([lin, np.ones((n, 1), np.float32)]).reshape(-1))
    return cols

def export_entry(o, cols, perch, crown, extra=None):
    me = o.data; me.update()
    bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.triangulate(bm, faces=bm.faces[:]); bm.to_mesh(me); bm.free(); me.update()
    n = len(me.vertices); co = np.empty(n * 3, np.float32); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    nr = np.empty(n * 3, np.float32); me.vertices.foreach_get('normal', nr); nr = nr.reshape(-1, 3)
    idx = np.empty(len(me.polygons) * 3, np.int32); me.polygons.foreach_get('vertices', idx)
    P = np.stack([co[:, 0], co[:, 2], -co[:, 1]], 1); Nn = np.stack([nr[:, 0], nr[:, 2], -nr[:, 1]], 1)
    flip = idx                                                   # (x, z, -y) is a rotation, not a mirror: winding stays
    e = dict(p=[round(float(x), 4) for x in P.reshape(-1)], n=[round(float(x), 3) for x in Nn.reshape(-1)],
             c=[int(round(float(x) * 255)) for x in cols.reshape(-1)], i=[int(x) for x in flip],
             h=round(float(co[:, 2].max()), 3), perch=[[round(v, 3) for v in p] for p in perch], crown=crown)
    if extra: e.update(extra)
    return e

def preview_mat():
    m = bpy.data.materials.get('RF_col')
    if m: return m
    m = bpy.data.materials.new('RF_col'); m.use_nodes = True
    bsdf = next(n for n in m.node_tree.nodes if n.bl_idname == 'ShaderNodeBsdfPrincipled')
    ca = m.node_tree.nodes.new('ShaderNodeVertexColor'); ca.layer_name = 'Col'
    m.node_tree.links.new(ca.outputs['Color'], bsdf.inputs['Base Color']); bsdf.inputs['Roughness'].default_value = 0.7
    return m

def preview(sc, objs, path, spread):
    for i, o in enumerate(objs):
        o.location.x = (i - (len(objs) - 1) / 2) * spread
        if not o.data.materials: o.data.materials.append(preview_mat())
    cam = bpy.data.objects.get('RFcam')
    if not cam:
        cam = bpy.data.objects.new('RFcam', bpy.data.cameras.new('RFcam')); sc.collection.objects.link(cam)
        sun = bpy.data.objects.new('RFsun', bpy.data.lights.new('RFsun', 'SUN')); sc.collection.objects.link(sun)
        sun.data.energy = 3.0; sun.rotation_euler = (math.radians(40), 0, math.radians(30))
        gnd = bpy.data.objects.new('RFgnd', bpy.data.meshes.new('RFgnd')); sc.collection.objects.link(gnd)
        bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=30); bm.to_mesh(gnd.data); bm.free()
        gm = bpy.data.materials.new('RFg'); gm.use_nodes = True
        next(n for n in gm.node_tree.nodes if n.bl_idname == 'ShaderNodeBsdfPrincipled').inputs['Base Color'].default_value = (0.75, 0.68, 0.5, 1)
        gnd.data.materials.append(gm)
    sc.camera = cam
    w = spread * len(objs); h = max(o.dimensions.z for o in objs)
    cam.data.lens = 50
    tgt = Vector((0, 0, h * 0.45)); d = max(w * 0.95, h * 2.2) + 0.5
    cam.location = tgt + Vector((0, -d, d * 0.42)); cam.rotation_euler = (tgt - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE'
    sc.render.resolution_x, sc.render.resolution_y = 900, 420; sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'JPEG'; sc.render.filepath = path
    prev = bpy.context.window.scene; bpy.context.window.scene = sc
    bpy.ops.render.render(write_still=True, scene=sc.name)
    bpy.context.window.scene = prev

# ───────────────────────────────────────── the species
def _branch_tree(rng, mb, p, d, length, r, depth, up=0.35, spread=0.55, kids=(2, 3), tips=None, seg=5, sides=7, jitter=0.22):
    pts = [p.copy()]; rad = [r]; cur = p.copy(); dd = d.copy()
    for i in range(1, seg + 1):
        dd = (dd + Vector((rng.uniform(-jitter, jitter), rng.uniform(-jitter, jitter), up * 0.5))).normalized()
        cur = cur + dd * (length / seg); pts.append(cur.copy()); rad.append(r * (1 - 0.42 * i / seg))
    mb.add(*tube(pts, rad, sides, cap0=True, cap1=depth == 0))
    if depth == 0:
        if tips is not None: tips.append((cur.copy(), dd.copy()))
        return
    for k in range(rng.randint(*kids)):
        a = rng.uniform(0, TAU)
        nd = (dd * (1 - spread) + Vector((math.cos(a), math.sin(a), up)).normalized() * spread).normalized()
        _branch_tree(rng, mb, cur, nd, length * rng.uniform(0.62, 0.8), rad[-1] * 1.02, depth - 1, up, spread, kids, tips, seg, sides, jitter)

def m_branching(rng, v):
    """Acropora: a bushy colony of antler branches; each branch dotted with little cup-shaped corallites, the growing
    tips pale"""
    mb = MB(); tips = []
    n = rng.randint(6, 8)
    for i in range(n):
        a = TAU * i / n + rng.uniform(-0.3, 0.3); r0 = rng.uniform(0.05, 0.22)
        d = Vector((math.cos(a) * 0.7, math.sin(a) * 0.7, 1)).normalized()
        _branch_tree(rng, mb, Vector((math.cos(a) * r0, math.sin(a) * r0, -0.05)), d, 0.42, 0.075, 3, up=0.45, spread=0.55, kids=(2, 3), tips=tips, seg=4, sides=8, jitter=0.25)
    mb.add(*sphere((0, 0, -0.02), 0.3, 14, 7, 0.3))
    pal = [('#c49ad6', '#fbeefb'), ('#86b4dc', '#eef8ff'), ('#d4b27a', '#fbf2de')][v % 3]
    def paint(P, N, c=pal):
        base = lerpc(hexc(c[0]), hexc(c[1]), sm(0.9, 1.65, P.z) + 0.12 * noise.noise(P * 9))
        dots = sm(0.35, 0.6, noise.noise(P * 70))                   # corallite cups: little pale rims
        return lerpc(base, hexc(c[1]), 0.45 * dots)
    return mb, dict(voxel=0.014, sub=0, tris=7500, pal=pal, tips=tips, aos=0.45,
                    disp=lambda P, N: 0.004 * max(0.0, noise.noise(P * 70)) + 0.0015 * noise.noise(P * 140),
                    paint=paint, crown=dict(top=1.8, bottom=0.4, radius=1.1, density=0.25))

def m_brain(rng, v):
    """brain coral (Platygyra): a dome with winding valleys and ridges like a maze"""
    mb = MB(); s = rng.uniform(0.95, 1.1)
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=7, radius=1.0)
    V = [Vector((v_.co.x * 1.1 * s, v_.co.y * 1.05 * s, max(-0.15, v_.co.z) * 0.85 * s)) for v_ in bm.verts]
    F = [tuple(x.index for x in f.verts) for f in bm.faces]; bm.free()
    mb.add(V, F)
    seed = Vector((rng.uniform(0, 50), rng.uniform(0, 50), rng.uniform(0, 50)))
    def maze(P):
        q = P * 1.7 + seed
        w = Vector((noise.noise(q * 0.8), noise.noise(q * 0.8 + Vector((5.2, 1.3, 3.7))), noise.noise(q * 0.8 + Vector((2.1, 7.7, 0.4))))) * 0.6
        f = noise.noise(q + w)
        return 0.5 + 0.5 * math.cos(f * 40.0)               # 1 on a ridge, 0 in a valley
    pal = [('#6f8a3a', '#c8b884'), ('#5a7a5a', '#d8c08a'), ('#8a7a3a', '#e0cf98')][v % 3]
    return mb, dict(voxel=0, sub=0, tris=14000, aos=0.4,
                    disp=lambda P, N: 0.03 * (maze(P) - 0.5) * sm(-0.05, 0.2, P.z),
                    paint=lambda P, N, c=pal: lerpc(hexc(c[0]), hexc(c[1]), maze(P) ** 1.3) * (0.92 + 0.08 * noise.noise(P * 20)),
                    crown=dict(top=0.95, bottom=0, radius=1.15, density=0.5), scale=(1.0, 1.0, 1.0))

def m_table(rng, v):
    """table coral (Acropora): a short stout stalk and a wide flat plate of fine fused branchlets, shading the sand below"""
    mb = MB()
    mb.add(*lathe([(0.32, -0.05), (0.26, 0.15), (0.17, 0.45), (0.15, 0.75), (0.3, 0.95), (0.5, 1.05)], 24))
    R = rng.uniform(1.9, 2.1); rings = 22; seg = 72; V = []; F = []
    for top in (True, False):
        base = len(V)
        for i in range(rings + 1):
            r = R * i / rings
            for j in range(seg):
                a = TAU * j / seg; rr = r * (1 + 0.06 * math.sin(a * 5 + v) * (i / rings) ** 2)
                z = 1.05 + 0.18 * (i / rings) ** 2.2 + (0.06 if top else -0.06) * (1 - 0.5 * i / rings)
                V.append(Vector((math.cos(a) * rr, math.sin(a) * rr, z)))
        for i in range(rings):
            for j in range(seg):
                jn = (j + 1) % seg; a0 = base + i * seg; a1 = a0 + seg
                F.append((a0 + j, a0 + jn, a1 + jn, a1 + j) if top else (a0 + j, a1 + j, a1 + jn, a0 + jn))
    for j in range(seg):                                   # rim
        jn = (j + 1) % seg; a = rings * seg; b = (rings + 1) * seg + rings * seg
        F.append((a + j, b + j, b + jn, a + jn))
    mb.add(V, F)
    # little upright branchlets on the top surface
    for k in range(260):
        r = R * math.sqrt(rng.random()) * 0.97; a = rng.uniform(0, TAU)
        p = Vector((math.cos(a) * r, math.sin(a) * r, 1.05 + 0.18 * (r / R) ** 2.2 + 0.04))
        mb.add(*tube([p, p + Vector((rng.uniform(-0.02, 0.02), rng.uniform(-0.02, 0.02), 0.06 + 0.03 * rng.random()))], [0.022, 0.014], 5, cap0=False))
    pal = [('#a8bc7a', '#eef0c8'), ('#c0a890', '#f6eedc'), ('#88aec0', '#e2f2f8')][v % 3]
    return mb, dict(voxel=0.018, sub=0, tris=6000,
                    disp=lambda P, N: 0.004 * noise.noise(P * 60),
                    paint=lambda P, N, c=pal: lerpc(hexc(c[0]) * (0.75 if N.z < -0.3 else 1.0), hexc(c[1]), sm(0.6, 1.0, math.hypot(P.x, P.y) / R) * (1 if N.z > 0 else 0.3)),
                    crown=dict(top=1.3, bottom=1.0, radius=2.0, density=0.75))

def m_firecoral(rng, v):
    """fire coral (Millepora dichotoma): upright flat blades branching in a plane, mustard yellow with pale tips"""
    mb = MB(); tips = []
    for f in range(rng.randint(2, 3)):
        ang = rng.uniform(0, math.pi); d0 = Vector((math.cos(ang), math.sin(ang), 0))
        off = Vector((-math.sin(ang), math.cos(ang), 0)) * rng.uniform(-0.25, 0.25)
        def grow(p, d, L, w, depth):
            pts = [p, p + d * L * 0.5, p + d * L]; rad = [w, w * 0.92, w * 0.85]
            # flattened tube: wide in the fan's plane, thin across
            mb.add(*tube(pts, rad, 12, cap0=True, cap1=depth == 0, flat=0.32))
            if depth == 0: tips.append(p + d * L); return
            for s in (-1, 1):
                a = s * rng.uniform(0.25, 0.45)
                nd = (d * math.cos(a) + d0 * math.sin(a)).normalized()
                grow(p + d * L, nd, L * rng.uniform(0.7, 0.85), w * 0.82, depth - 1)
        grow(off, Vector((0, 0, 1)), 0.38, 0.15, 3)
    pal = ('#e8c040', '#fff6d0') if v % 3 != 2 else ('#dcae38', '#fbefc8')
    return mb, dict(voxel=0.014, sub=0, tris=5000, aos=0.35, tips=[(t, Vector((0, 0, 1))) for t in tips],
                    disp=lambda P, N: 0.002 * noise.noise(P * 90),
                    paint=lambda P, N, c=pal: lerpc(hexc(c[0]), hexc(c[1]), sm(1.0, 1.45, P.z)) * (0.92 + 0.08 * noise.noise(P * 40)),
                    crown=dict(top=1.5, bottom=0.3, radius=0.9, density=0.3))

def m_softcoral(rng, v):
    """soft coral (Dendronephthya): a soft translucent stalk and branches ending in clusters of bright polyps"""
    mb = MB(); tips = []
    _branch_tree(rng, mb, Vector((0, 0, -0.03)), Vector((0, 0, 1)), 0.36, 0.11, 3, up=0.6, spread=0.65, kids=(2, 4), tips=tips, seg=4, sides=8, jitter=0.3)
    pol = []
    for (p, d) in tips:
        for k in range(rng.randint(5, 8)):
            q = p + Vector((rng.uniform(-0.06, 0.06), rng.uniform(-0.06, 0.06), rng.uniform(-0.03, 0.06)))
            mb.add(*sphere(q, rng.uniform(0.028, 0.042), 8, 5)); pol.append(q)
    pal = [('#f8dce6', '#e8306e'), ('#f0e0f8', '#a448d8'), ('#fbe6d4', '#f6762e')][v % 3]
    def paint(P, N, c=pal):
        near = min(((P - q).length for q in pol), default=1.0)
        return lerpc(hexc(c[0]), hexc(c[1]), sm(0.06, 0.03, near)) * (0.95 + 0.05 * noise.noise(P * 30))
    return mb, dict(voxel=0.013, sub=0, tris=6000, aos=0.3, tips=tips, disp=lambda P, N: 0.003 * noise.noise(P * 70), paint=paint,
                    crown=dict(top=1.1, bottom=0.2, radius=0.6, density=0.15), soft=True)

def m_seafan(rng, v):
    """sea fan (a gorgonian): a flat lacy fan of fine branches in one plane, facing the current"""
    mb = MB(); tips = []
    def grow(p, d, L, r, depth):
        pts = [p, p + d * L * 0.5 + Vector((0, rng.uniform(-0.02, 0.02), 0)), p + d * L]; mb.add(*tube(pts, [r, r * 0.9, r * 0.82], 6, cap1=depth == 0))
        if depth == 0: tips.append(p + d * L); return
        for s in (-1, 1):
            a = s * rng.uniform(0.2, 0.5); c, si = math.cos(a), math.sin(a)
            nd = Vector((d.x * c - d.z * si, 0, d.x * si + d.z * c)).normalized()
            grow(p + d * L, nd, L * rng.uniform(0.72, 0.86), r * 0.78, depth - 1)
    grow(Vector((0, 0, -0.02)), Vector((0, 0, 1)), 0.45, 0.045, 6)
    # cross-links: the fine mesh between neighbouring tips
    for i in range(len(tips) - 1):
        a, b = tips[i], tips[i + 1]
        if (a - b).length < 0.35: mb.add(*tube([a * 0.92 + b * 0.08, (a + b) * 0.5 - Vector((0, 0, 0.06)), a * 0.08 + b * 0.92], [0.01, 0.009, 0.01], 5))
    pal = [('#c8301a', '#f0703a'), ('#a83a8a', '#e8a0d8'), ('#e07a1a', '#f6c060')][v % 3]
    return mb, dict(voxel=0.012, sub=0, tris=5200, disp=None,
                    paint=lambda P, N, c=pal: lerpc(hexc(c[0]), hexc(c[1]), 0.3 + 0.4 * noise.noise(P * 12)),
                    crown=dict(top=2.2, bottom=0.6, radius=1.0, density=0.12), soft=True, tips=[(t, Vector((0, 0, 1))) for t in tips[::3]])

def m_sponge(rng, v):
    """tube sponge: a few upright hollow tubes with thick walls and an open top; pores all over"""
    mb = MB(); tips = []
    n = rng.randint(3, 5)
    for i in range(n):
        a = TAU * i / n + rng.uniform(-0.4, 0.4); off = Vector((math.cos(a), math.sin(a), 0)) * (0.14 if i else 0.0)
        H = rng.uniform(0.6, 1.1); r = rng.uniform(0.12, 0.17); lean = Vector((math.cos(a), math.sin(a), 0)) * 0.12
        prof = [(r * 1.15, 0.0), (r, H * 0.15), (r * 1.05, H * 0.6), (r * 1.18, H), (r * 0.72, H * 0.985), (r * 0.62, H * 0.6), (r * 0.55, H * 0.2)]
        V, F = lathe(prof, 20, wob=lambda a_, z: 1 + 0.05 * math.sin(a_ * 4 + z * 6))
        V = [x + off + lean * (x.z / H) ** 1.5 for x in V]; mb.add(V, F)
        tips.append((off + lean + Vector((0, 0, H)), Vector((0, 0, 1))))
    mb.add(*sphere((0, 0, 0.03), 0.22, 12, 6, 0.4))
    pal = [('#d8481a', '#f0802a'), ('#7a3a9a', '#b070d0'), ('#c8a020', '#f0d050')][v % 3]
    return mb, dict(voxel=0.016, sub=0, tris=5000, tips=tips,
                    disp=lambda P, N: -0.008 * sm(0.55, 0.85, noise.noise(P * 38) * 0.5 + 0.5),        # pores
                    paint=lambda P, N, c=pal: lerpc(hexc(c[0]), hexc(c[1]), 0.3 + 0.4 * noise.noise(P * 8)) * (0.6 if N.z > 0.5 and P.z > 0.5 else 1.0),
                    crown=dict(top=1.3, bottom=0, radius=0.5, density=0.2))

def m_seaanemone(rng, v):
    """magnificent sea anemone: a short purple-red column, a wide oral disc, and over a hundred long tentacles with
    green tips that sway – the clownfish's home"""
    mb = MB(); s = rng.uniform(0.95, 1.05)
    mb.add(*lathe([(0.2 * s, -0.02), (0.21 * s, 0.1), (0.24 * s, 0.2), (0.34 * s, 0.24), (0.2 * s, 0.27), (0.04, 0.24)], 32))
    rr = random.Random(v * 7 + 1)
    for k in range(190):
        a = rr.uniform(0, TAU); r0 = 0.05 + 0.29 * math.sqrt(rr.random())
        base = Vector((math.cos(a) * r0 * s, math.sin(a) * r0 * s, 0.24 + 0.02 * (1 - r0 / 0.34)))
        out = Vector((math.cos(a + rr.uniform(-0.3, 0.3)), math.sin(a + rr.uniform(-0.3, 0.3)), 0))
        L = rr.uniform(0.22, 0.36); up = 0.9 - 0.7 * (r0 / 0.34)          # inner ones stand up, outer ones droop
        pts = [base + out * L * t * (0.35 + 0.65 * t) + Vector((0, 0, L * (up * math.sin(math.pi * 0.5 * t) - 0.35 * t * t * (1 - up))))
               for t in (0.0, 0.25, 0.5, 0.75, 1.0)]
        mb.add(*tube(pts, [0.019, 0.018, 0.016, 0.014, 0.011], 7, cap0=False))
    pal = [('#9a2a4a', '#e6eab0', '#7ac04a'), ('#7a2a8a', '#e8d8b0', '#6ab0c8'), ('#b8402a', '#e6e0b0', '#9ac850')][v % 3]
    def paint(P, N, c=pal):
        if P.z < 0.235: return hexc(c[0]) * (0.85 + 0.15 * noise.noise(P * 30))
        r = math.hypot(P.x, P.y)
        return lerpc(hexc(c[1]), hexc(c[2]), sm(0.42, 0.55, P.z + r * 0.35))
    return mb, dict(voxel=0.0, sub=0, tris=9000, disp=None, paint=paint, aos=0.4, crown=dict(top=0.65, bottom=0.2, radius=0.6, density=0.1),
                    soft=True, tips=[(Vector((0, 0, 0.45)), Vector((0, 0, 1))), (Vector((0.18, 0.05, 0.42)), Vector((0, 0, 1))), (Vector((-0.12, -0.1, 0.42)), Vector((0, 0, 1)))])

def m_clam(rng, v):
    """giant clam (Tridacna maxima): a heavy shell with big wavy folds set into a reef rock, and between its lips the
    mantle, patterned in blue and turquoise (algae living in it make its food from sunlight)"""
    mb = MB(); W, L, H = 0.26, 0.72, 0.27
    V0, F0 = sphere((0, 0, 0.0), 1.0, 44, 26)                     # the shell (its folds come from disp below)
    mb.add([Vector((x.x * W, x.y * L / 2, max(-0.3, x.z) * H)) for x in V0], F0)
    for k in range(6):                                              # the rock it sits in
        a = TAU * k / 6 + rng.uniform(-0.3, 0.3)
        mb.add(*sphere((math.cos(a) * 0.27, math.sin(a) * 0.36, -0.06), rng.uniform(0.16, 0.22), 14, 8, 0.55))
    V1, F1 = sphere((0, 0, H * 0.97), 1.0, 36, 14)                  # the mantle: a wide, fat lip along the whole gape
    mb.add([Vector((x.x * 0.1 * (1 + 0.25 * math.sin(x.y * 14)), x.y * L * 0.47, H * 0.97 + x.z * 0.07)) for x in V1], F1)
    def shellq(P): return (P.x / W) ** 2 + (P.y / (L / 2)) ** 2 + (P.z / H) ** 2
    def disp(P, N):
        if shellq(P) > 1.25 or P.z < 0.01: return 0.012 * noise.noise(P * 12)                              # rock
        if P.z > H * 0.86 and abs(P.x) < 0.12: return 0.006 * noise.noise(P * 30)                         # mantle
        u = (P.y + L / 2) / L
        folds = 0.04 * abs(math.sin(u * math.pi * 6)) * sm(0.15, 0.85, P.z / H)
        return folds + 0.004 * math.sin(P.z * 90)
    pal = [('#1f5ad8', '#3ae0d8'), ('#2f8a3a', '#b0f060'), ('#4a2ab8', '#40c0ff')][v % 3]
    def paint(P, N, c=pal):
        if P.z > H * 0.86 and abs(P.x) < 0.13:
            d = noise.noise(P * 34); c1 = lerpc(hexc(c[0]), hexc(c[1]), sm(-0.25, 0.35, d))
            spots = sm(0.55, 0.75, abs(math.sin(P.y * 70 + 3 * noise.noise(P * 12))))
            return lerpc(c1, hexc('#f4f8ff'), 0.25 * spots)
        if shellq(P) > 1.2 or P.z < 0.0:
            return lerpc(hexc('#9a8a74'), hexc('#c4737e'), 0.35 + 0.4 * noise.noise(P * 6))
        return lerpc(hexc('#f2ead6'), hexc('#cdbb98'), 0.3 + 0.25 * math.sin(P.z * 90) + 0.2 * noise.noise(P * 25))
    return mb, dict(voxel=0.012, sub=0, tris=5200, disp=disp, paint=paint, aos=0.45, crown=dict(top=0.6, bottom=0, radius=0.6, density=0.1))

def m_seagrass(rng, v):
    """seagrass (Halophila / Halodule): a clump of thin ribbon leaves from runners in the sand"""
    mb = MB()
    for k in range(rng.randint(26, 36)):
        a = rng.uniform(0, TAU); r = 0.3 * math.sqrt(rng.random()); b = Vector((math.cos(a) * r, math.sin(a) * r, -0.02))
        H = rng.uniform(0.35, 0.72); bend = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), 0)).normalized() * rng.uniform(0.05, 0.22)
        w = rng.uniform(0.012, 0.02); n = 8; side = Vector((-bend.y, bend.x, 0)).normalized() if bend.length > 0 else Vector((1, 0, 0))
        V = []; F = []
        for i in range(n + 1):
            t = i / n; c = b + Vector((0, 0, H * t)) + bend * t * t; ww = w * (1 - t ** 3)
            V += [c - side * ww, c + side * ww]
        for i in range(n): F.append((i * 2, i * 2 + 1, i * 2 + 3, i * 2 + 2))
        # back face (the leaf seen from both sides)
        o = len(V); V2 = [x + Vector((0, 0, 0)) for x in V]
        F2 = [(o + f[0], o + f[3], o + f[2], o + f[1]) for f in F]
        mb.add(V + V2, F + F2)
    pal = ('#3a8a3a', '#9ad06a') if v % 2 == 0 else ('#4a7a2a', '#b8d870')
    return mb, dict(voxel=0, sub=0, tris=2000, disp=None, ao=False,
                    paint=lambda P, N, c=pal: lerpc(hexc(c[0]), hexc(c[1]), sm(0.0, 0.6, P.z)),
                    crown=dict(top=0.7, bottom=0, radius=1.2, density=0.05), soft=True, double=True)

def m_algae(rng, v):
    """algae on a piece of reef rock: Padina fans (curled, banded white) and green Halimeda chains of little discs"""
    mb = MB(); s = 1.0
    mb.add(*sphere((0, 0, 0.0), 0.22, 14, 8, 0.5))
    for k in range(rng.randint(3, 5)):                      # Padina: curled fans
        a = rng.uniform(0, TAU); b = Vector((math.cos(a) * 0.12, math.sin(a) * 0.12, 0.06)); d = Vector((math.cos(a), math.sin(a), 0))
        V = []; F = []; nr, na = 6, 12
        for i in range(nr + 1):
            r = 0.02 + 0.14 * i / nr
            for j in range(na + 1):
                t = -1 + 2 * j / na; ang = t * 1.2
                p = b + (d * math.sin(ang) * 0.3 + Vector((0, 0, 1)) * math.cos(ang)) * r
                p += d.cross(Vector((0, 0, 1))) * t * r * 0.9 + d * 0.06 * (i / nr) ** 2
                V.append(p)
        for i in range(nr):
            for j in range(na):
                a0 = i * (na + 1) + j; F.append((a0, a0 + 1, a0 + na + 2, a0 + na + 1))
        o = len(V); mb.add(V + [x.copy() for x in V], F + [(o + f[0], o + f[3], o + f[2], o + f[1]) for f in F])
    for k in range(rng.randint(4, 6)):                      # Halimeda: chains of flat green discs
        a = rng.uniform(0, TAU); p = Vector((math.cos(a) * 0.08, math.sin(a) * 0.08, 0.08)); d = Vector((math.cos(a) * 0.4, math.sin(a) * 0.4, 1)).normalized()
        for i in range(6):
            mb.add(*sphere(p, 0.032, 8, 4, 0.35)); d = (d + Vector((rng.uniform(-0.3, 0.3), rng.uniform(-0.3, 0.3), 0.1))).normalized()
            q = p + d * 0.045; mb.add(*tube([p, q], [0.008, 0.008], 5)); p = q
    pal = ('#8a6a3a', '#f2ead8', '#5aa83a', '#8a8070')
    def paint(P, N, c=pal):
        if P.z < 0.07 and math.hypot(P.x, P.y) < 0.23: return lerpc(hexc(c[3]), hexc('#c88a8a'), 0.3 + 0.3 * noise.noise(P * 20))
        g = noise.noise(P * 6 + Vector((3, 3, 3)))
        if g > 0.1: return lerpc(hexc(c[2]), hexc('#9ad06a'), 0.3 + 0.3 * noise.noise(P * 30))
        return lerpc(hexc(c[0]), hexc(c[1]), sm(0.4, 0.6, 0.5 + 0.5 * math.sin(P.length * 120)))
    return mb, dict(voxel=0, sub=0, tris=3400, disp=None, paint=paint, crown=dict(top=0.4, bottom=0, radius=1.0, density=0.05), soft=True, double=True)

def m_reefrock(rng, v):
    """a reef-rock boulder: old coral limestone full of holes, crusted with pink coralline algae and little patches of
    life – the hiding places of morays and octopuses"""
    mb = MB()
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=5, radius=1.0)
    sx, sy, sz = rng.uniform(1.1, 1.6), rng.uniform(0.9, 1.3), rng.uniform(0.6, 0.85)
    V = [Vector((x.co.x * sx, x.co.y * sy, max(-0.2, x.co.z) * sz)) for x in bm.verts]; F = [tuple(x.index for x in f.verts) for f in bm.faces]; bm.free()
    mb.add(V, F)
    seed = Vector((rng.uniform(0, 30), rng.uniform(0, 30), rng.uniform(0, 30)))
    def disp(P, N):
        q = P * 1.6 + seed; big = 0.22 * noise.noise(q * 0.7)
        holes = -0.18 * sm(0.45, 0.7, noise.noise(q * 2.2 + Vector((7, 0, 0))))
        return big + holes + 0.03 * noise.noise(q * 9)
    def paint(P, N):
        c = lerpc(hexc('#8e8270'), hexc('#b8aa90'), 0.5 + 0.4 * noise.noise(P * 5 + seed))
        c = lerpc(c, hexc('#c87a86'), 0.65 * sm(0.0, 0.4, noise.noise(P * 3.2 + seed * 1.3)) * sm(-0.2, 0.4, N.z))     # coralline crust
        c = lerpc(c, hexc('#6a8a4a'), 0.5 * sm(0.3, 0.6, noise.noise(P * 7 + seed)) * sm(0.3, 0.8, N.z))                # turf algae
        return c
    return mb, dict(voxel=0.04, sub=0, tris=3200, disp=disp, paint=paint, crown=dict(top=1.0, bottom=0, radius=1.4, density=0.5))

SPECIES = dict(branching=m_branching, brain=m_brain, table=m_table, firecoral=m_firecoral, softcoral=m_softcoral, seafan=m_seafan,
               sponge=m_sponge, seaanemone=m_seaanemone, clam=m_clam, seagrass=m_seagrass, algae=m_algae, reefrock=m_reefrock)

def flora_job(fid, variants=3, preview_img=True):
    # the modifiers are applied through the window's depsgraph, so the flora scene must be the active one meanwhile
    sc = fscene(); prev = bpy.context.window.scene; bpy.context.window.scene = sc
    try: return _flora_job(fid, variants, preview_img, sc)
    finally: bpy.context.window.scene = prev

def _flora_job(fid, variants, preview_img, sc):
    t0 = time.time(); coll = fcoll(sc, 'RF_' + fid); objs = []; out = []
    for v in range(variants):
        rng = random.Random(1000 + v * 37 + len(fid) * 11)
        mb, o_ = SPECIES[fid](rng, v)
        o = mb.obj('rf_%s_%d' % (fid, v), coll)
        if o_.get('voxel'): union(o, o_['voxel'], 2)
        if o_.get('sub'): subdivide(o, o_['sub'])
        if o_.get('disp'): displace(o, o_['disp'])
        if not o_.get('voxel') and not o_.get('double'):
            bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.to_mesh(o.data); bm.free()
        decimate(o, o_['tris'])
        bm = bmesh.new(); bm.from_mesh(o.data); bm.normal_update(); bm.to_mesh(o.data); bm.free()
        cols = ao_colors(o, o_['paint'], rays=18 if o_.get('ao', True) else 1, strength=o_.get('aos', 0.5) if o_.get('ao', True) else 0.0)
        perch = []
        for (p, d) in (o_.get('tips') or [])[:6]:
            perch.append((p.x, p.z + 0.05, -p.y))
        out.append(export_entry(o, cols, perch, o_['crown'], dict(soft=bool(o_.get('soft')), double=bool(o_.get('double')))))
        objs.append(o)
    with open(os.path.join(FD, 'flora', fid + '.json'), 'w') as fh: json.dump(dict(id=fid, v=out), fh, separators=(',', ':'))
    if preview_img: preview(sc, objs, os.path.join(FD, 'pv', 'f_%s.jpg' % fid), max(o.dimensions.x for o in objs) * 1.15)
    tris = [len(e['i']) // 3 for e in out]
    # free memory: keep nothing of this species in the file
    for o in objs:
        me = o.data; bpy.data.objects.remove(o, do_unlink=True); bpy.data.meshes.remove(me)
    return {'tris_' + fid: tris, 'secs_' + fid: round(time.time() - t0, 1)}
