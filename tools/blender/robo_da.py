# robo_da.py – רובו־דע, the lab's robot guide, modelled in Blender (exec into its own namespace after session.py).
# A friendly hovering robot, about 1.05 m with its leaf: a big rounded head of glossy white shell with a dark glass
# visor (the eyes are light on the visor; in the game a canvas draws them, so they blink and smile), teal ear discs,
# a little green leaf instead of an antenna (Baba Da), an egg-shaped body (white above, teal below, a fine seam
# between), a round glowing badge with a leaf on the chest, short arms with mitten hands, and a hover ring with a
# soft glow instead of legs. Faces -Y. Every surface is a smooth, dense parametric shape (superellipsoids and lathes),
# not a blocky stand-in. No cross shapes: the badge is a leaf, the ears are plain discs.
#   robo_build()            builds collection RD (objects named rd.<group>.<material>.<n>)
#   robo_preview(view, pct) async Cycles render of the studio (pv/robo_<view>.png), poll the file
#   robo_export()           lab/robo_da.json: per part {g: group, m: material, p, n, uv?, i} in three's axes
import bpy, bmesh, math, json, os, time
import numpy as np
from mathutils import Vector, Matrix

LD = os.path.join(os.path.dirname(D), 'lab'); os.makedirs(LD, exist_ok=True)
PV = os.path.join(D, 'pv')
TAU = math.tau
HEAD_C = Vector((0, 0, 0.745)); HEAD_R = (0.245, 0.205, 0.192)
PIV = {'head': (0, 0, 0.545), 'arm_a': (-0.2, -0.005, 0.455), 'arm_b': (0.2, -0.005, 0.455)}

def sgnpow(x, e): return math.copysign(abs(x) ** e, x)

def superellipsoid(a, b, c, e1, e2, nu=96, nv=64, u0=-math.pi, u1=math.pi, v0=-math.pi / 2, v1=math.pi / 2, closed=True):
    """grid of points (nv+1 rows × nu(+1) cols); u around Z (u = -90° faces -Y), v from the bottom to the top"""
    rows = []
    for j in range(nv + 1):
        v = v0 + (v1 - v0) * j / nv; row = []
        for i in range(nu + (0 if closed else 1)):
            u = u0 + (u1 - u0) * i / nu
            cv = sgnpow(math.cos(v), e1)
            row.append(Vector((a * cv * sgnpow(math.cos(u), e2), b * cv * sgnpow(math.sin(u), e2), c * sgnpow(math.sin(v), e1))))
        rows.append(row)
    return rows

def lathe_rows(prof, seg=64):
    """profile [(r, z)] bottom → top → rows of points around Z"""
    return [[Vector((r * math.cos(TAU * i / seg), r * math.sin(TAU * i / seg), z)) for i in range(seg)] for r, z in prof]

class Part:
    def __init__(self, group, mat): self.g = group; self.m = mat; self.V = []; self.F = []; self.UV = None
    def rows(self, R, closed=True, M=Matrix(), uv=False, flip=False):
        base = len(self.V); w = len(R[0])
        for row in R:
            for p in row: self.V.append(M @ p)
        if uv: self.UV = self.UV or {}
        for j in range(len(R) - 1):
            for i in range(w if closed else w - 1):
                a = base + j * w + i; b = base + j * w + (i + 1) % w
                f = [a, b, b + w, a + w]
                self.F.append(f[::-1] if flip else f)
                if uv: self.UV[len(self.F) - 1] = [((k - base) % w / (w - 1), (k - base) // w / (len(R) - 1)) for k in self.F[-1]]
        return self
    def obj(self, coll, name):
        me = bpy.data.meshes.new(name); me.from_pydata([tuple(v) for v in self.V], [], self.F)
        me.validate(clean_customdata=False); me.update()
        bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
        if self.UV:
            # recompute uv from positions on the visor patch (stored per face before welding: rebuild from params)
            pass
        me.shade_smooth()
        try: me.set_sharp_from_angle(angle=math.radians(48))
        except Exception: pass
        o = bpy.data.objects.new(name, me); coll.objects.link(o); return o

# ───────────────────────────────────── materials
def mat(name, base, rough=0.3, metal=0.0, coat=0.0, emit=None, estr=0.0, trans=0.0, sss=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name); m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.bl_idname == 'ShaderNodeBsdfPrincipled')
    b.inputs['Base Color'].default_value = (*base, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    for k, v in (('Coat Weight', coat), ('Transmission Weight', trans), ('Subsurface Weight', sss)):
        if k in b.inputs: b.inputs[k].default_value = v
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = estr
    return m

def lin(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)

MATS = {}
def materials():
    MATS.update(
        shell=mat('rd_shell', lin('#f3f1ea'), 0.22, coat=0.7),
        teal=mat('rd_teal', lin('#2c9a92'), 0.32, coat=0.4),
        tealdark=mat('rd_tealdark', lin('#1d5e66'), 0.38, coat=0.3),
        visor=mat('rd_visor', lin('#0a1016'), 0.06, coat=1.0),
        seam=mat('rd_seam', lin('#3b434c'), 0.5),
        metal=mat('rd_metal', lin('#c4cad2'), 0.28, metal=1.0),
        leaf=mat('rd_leaf', lin('#3f9e2e'), 0.4, coat=0.35, sss=0.2),
        glow=mat('rd_glow', lin('#9ff6ff'), 0.4, emit=lin('#8ff2ff'), estr=6.0),
        amber=mat('rd_amber', lin('#ffd27a'), 0.4, emit=lin('#ffc85a'), estr=4.0),
        badge=mat('rd_badge', lin('#0c1a1c'), 0.08, coat=1.0),
    )
    # the visor shows the eyes: an emission picture (in the game a canvas draws them live)
    m = MATS['visor']; nt = m.node_tree; b = next(n for n in nt.nodes if n.bl_idname == 'ShaderNodeBsdfPrincipled')
    img = bpy.data.images.get('rd_eyes') or bpy.data.images.new('rd_eyes', 512, 256, alpha=False)
    img.pixels = eyes_pixels(512, 256).ravel().tolist()
    tn = nt.nodes.get('EYES') or nt.nodes.new('ShaderNodeTexImage'); tn.name = 'EYES'; tn.image = img
    uvn = nt.nodes.get('UVM') or nt.nodes.new('ShaderNodeUVMap'); uvn.name = 'UVM'; uvn.uv_map = 'UV'
    nt.links.new(uvn.outputs[0], tn.inputs[0])
    nt.links.new(tn.outputs['Color'], b.inputs['Emission Color']); b.inputs['Emission Strength'].default_value = 5.0
    # the chest badge: a glowing leaf picture
    m = MATS['badge']; nt = m.node_tree; b = next(n for n in nt.nodes if n.bl_idname == 'ShaderNodeBsdfPrincipled')
    img = bpy.data.images.get('rd_leafbadge') or bpy.data.images.new('rd_leafbadge', 128, 128, alpha=False)
    img.pixels = leaf_pixels(128).ravel().tolist()
    tn = nt.nodes.get('LEAF') or nt.nodes.new('ShaderNodeTexImage'); tn.name = 'LEAF'; tn.image = img
    uvn = nt.nodes.get('UVM') or nt.nodes.new('ShaderNodeUVMap'); uvn.name = 'UVM'; uvn.uv_map = 'UV'
    nt.links.new(uvn.outputs[0], tn.inputs[0])
    nt.links.new(tn.outputs['Color'], b.inputs['Emission Color']); b.inputs['Emission Strength'].default_value = 3.0

def eyes_pixels(W, H):
    """two tall rounded eyes with a soft glow and a small smile, on black (the picture is W×H over the visor patch)"""
    y, x = np.mgrid[0:H, 0:W]; x = x / W; y = y / H
    img = np.zeros((H, W, 4), np.float32); img[..., 3] = 1
    def capsule(cx, cy, rx, ry):
        d = np.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2); return d
    col = np.array([0.56, 0.95, 1.0], np.float32)
    v = np.zeros((H, W), np.float32)
    for cx in (0.37, 0.63):
        d = capsule(cx, 0.56, 0.055, 0.15)
        v = np.maximum(v, np.clip((1.0 - d) * 6, 0, 1))
        v = np.maximum(v, np.clip(1.0 - d, 0, 1) ** 2 * 0.25)
    # smile: an arc below the eyes
    r = np.sqrt(((x - 0.5) / 0.09) ** 2 + ((y - 0.43) / 0.11) ** 2)
    arc = np.clip(1 - np.abs(r - 1.0) * 9, 0, 1) * (y < 0.36)
    v = np.maximum(v, arc)
    img[..., :3] = v[..., None] * col
    return img

def leaf_pixels(N):
    y, x = np.mgrid[0:N, 0:N]; x = x / N - 0.5; y = y / N - 0.5
    # a leaf tilted 35°: width ∝ sin along its length, a vein
    a = math.radians(35); xr = x * math.cos(a) + y * math.sin(a); yr = -x * math.sin(a) + y * math.cos(a)
    t = (yr + 0.36) / 0.72; w = 0.17 * np.sin(np.clip(t, 0, 1) * math.pi) ** 0.8
    inside = (np.abs(xr) < w) & (t > 0) & (t < 1)
    vein = (np.abs(xr) < 0.012) & inside
    img = np.zeros((N, N, 4), np.float32); img[..., 3] = 1
    img[inside, :3] = (0.35, 0.95, 0.45); img[vein, :3] = (0.9, 1.0, 0.75)
    return img

# ───────────────────────────────────── the parts
def head_parts():
    a, b, c = HEAD_R; e1, e2 = 0.62, 0.58
    P = []
    shell = Part('head', 'shell').rows(superellipsoid(a, b, c, e1, e2, 112, 72), M=Matrix.Translation(HEAD_C))
    P.append(shell)
    # the visor: a patch of a slightly bigger superellipsoid over the front of the head
    U0, U1 = -math.pi / 2 - 0.98, -math.pi / 2 + 0.98; V0, V1 = -0.66, 0.6
    R = superellipsoid(a * 1.01, b * 1.012, c * 1.01, e1, e2, 64, 40, U0, U1, V0, V1, closed=False)
    vis = Part('head', 'visor'); vis.rows(R, closed=False, M=Matrix.Translation(HEAD_C + Vector((0, -0.002, 0)))); vis.uvgrid = (65, 41)
    P.append(vis)
    # the rim around the visor: a thin dark tube along the patch edge
    edge = [R[0][i] for i in range(65)] + [R[j][64] for j in range(41)] + [R[40][i] for i in range(64, -1, -1)] + [R[j][0] for j in range(40, -1, -1)]
    rim = Part('head', 'seam'); tube_loop(rim, [p * 1.004 + HEAD_C for p in edge[::2]], 0.0065, 10); P.append(rim)
    # ear discs
    for s in (-1, 1):
        prof = [(0.0, 0.0), (0.05, 0.0), (0.066, 0.006), (0.072, 0.02), (0.066, 0.034), (0.05, 0.04), (0.0, 0.04)]
        M = Matrix.Translation(HEAD_C + Vector((s * (a - 0.012), 0.0, 0.0))) @ Matrix.Rotation(s * math.pi / 2, 4, 'Y')
        P.append(Part('head', 'teal').rows(lathe_rows(prof, 48), M=M))
        prof2 = [(0.0, 0.039), (0.036, 0.039), (0.042, 0.046), (0.03, 0.052), (0.0, 0.053)]
        P.append(Part('head', 'shell').rows(lathe_rows(prof2, 40), M=M))
    # the leaf on a curved stem
    stem = Part('head', 'metal'); top = HEAD_C + Vector((0, 0.02, c - 0.006))
    pts = [top + Vector((0.0, 0.0, 0.0)), top + Vector((0.004, 0.006, 0.035)), top + Vector((0.014, 0.01, 0.07)), top + Vector((0.03, 0.012, 0.095))]
    tube_path(stem, pts, 0.0075, 12); P.append(stem)
    P.append(Part('head', 'metal').rows(lathe_rows([(0.0, 0.0), (0.026, 0.0), (0.03, 0.006), (0.022, 0.014), (0.0, 0.016)], 32), M=Matrix.Translation(top - Vector((0, 0, 0.008)))))
    P.append(leaf_part(pts[-1], Vector((0.62, 0.15, 0.77)).normalized(), 0.17, 0.072))
    return P

def leaf_part(base, d, L, W):
    """a leaf blade: width ∝ sin along its length, folded a little along the midrib, tip curling down"""
    lp = Part('head', 'leaf')
    side = d.cross(Vector((0, -1, 0))).normalized(); up = side.cross(d).normalized()
    rows = []
    for j in range(25):
        t = j / 24; w = W * math.sin(math.pi * t) ** 0.75 * (1 - 0.15 * t)
        c = base + d * (L * t) - up * (0.03 * t * t)
        row = []
        for i in range(-6, 7):
            s = i / 6; fold = abs(s) * w * 0.28
            row.append(c + side * (s * w) + up * (fold - 0.003 * (1 - abs(s))))
        rows.append(row)
    lp.rows(rows, closed=False)
    # the back face, so the leaf has some thickness
    back = [[p - up * 0.003 for p in row] for row in rows]
    lp.rows(back, closed=False, flip=True)
    return lp

def tube_path(part, pts, r, seg=12):
    rows = []
    for k, p in enumerate(pts):
        d = (pts[min(k + 1, len(pts) - 1)] - pts[max(k - 1, 0)]).normalized()
        q = d.to_track_quat('Z', 'Y')
        rows.append([p + q @ Vector((r * math.cos(TAU * i / seg), r * math.sin(TAU * i / seg), 0)) for i in range(seg)])
    part.rows(rows)

def tube_loop(part, pts, r, seg=10):
    pts = pts + pts[:1]; tube_path(part, pts, r, seg)

def body_parts():
    P = []
    # an egg: wide shoulders, rounded bottom
    prof = []
    for k in range(41):
        t = k / 40; z = 0.15 + 0.41 * t
        r = 0.205 * math.sin(math.pi * (0.04 + 0.92 * t)) ** 0.62 * (0.88 + 0.12 * t)
        prof.append((max(0.0, r), z))
    prof[0] = (0.0, prof[0][1]); prof[-1] = (0.0, prof[-1][1])
    split = 0.33
    lower = [p for p in prof if p[1] <= split + 1e-6]; upper = [p for p in prof if p[1] >= split - 1e-6]
    def r_at(z):
        for (r0, z0), (r1, z1) in zip(prof, prof[1:]):
            if z0 <= z <= z1: return r0 + (r1 - r0) * (z - z0) / (z1 - z0)
        return 0.0
    rs = r_at(split)
    lower = lower + [(rs - 0.004, split - 0.004)]; upper = [(rs - 0.004, split + 0.004)] + upper
    P.append(Part('body', 'teal').rows(lathe_rows(lower, 72)))
    P.append(Part('body', 'shell').rows(lathe_rows(upper, 72)))
    P.append(Part('body', 'seam').rows(lathe_rows([(rs - 0.004, split - 0.005), (rs - 0.007, split), (rs - 0.004, split + 0.005)], 72)))
    # the neck: a metal collar with a dark ring
    P.append(Part('body', 'metal').rows(lathe_rows([(0.0, 0.545), (0.06, 0.545), (0.064, 0.555), (0.058, 0.585), (0.0, 0.59)], 48)))
    P.append(Part('body', 'seam').rows(lathe_rows([(0.075, 0.548), (0.082, 0.552), (0.075, 0.556)], 48)))
    # the badge on the chest: a teal ring, dark glass with a glowing leaf
    zc = 0.44; ry = r_at(zc)
    M = Matrix.Translation((0, -ry + 0.006, zc)) @ Matrix.Rotation(math.pi / 2, 4, 'X')
    P.append(Part('body', 'teal').rows(lathe_rows([(0.044, 0.0), (0.056, 0.004), (0.058, 0.012), (0.05, 0.016), (0.044, 0.014)], 48), M=M))
    bd = Part('body', 'badge'); rows = [[Vector((0.045 * s * math.cos(TAU * i / 48), 0.045 * s * math.sin(TAU * i / 48), 0.013 + 0.003 * (1 - s * s))) for i in range(48)] for s in (1.0, 0.75, 0.5, 0.25, 0.0)]
    bd.rows(rows, M=M); bd.disk_uv = (M, 0.045); P.append(bd)
    return P

def arm_parts(name, s):
    P = []
    sh = Vector((s * 0.2, -0.005, 0.455))
    P.append(Part(name, 'metal').rows(superellipsoid(0.034, 0.034, 0.034, 1, 1, 32, 20), M=Matrix.Translation(sh)))
    el = sh + Vector((s * 0.06, -0.025, -0.11)); wr = el + Vector((s * 0.012, -0.03, -0.075))
    a = Part(name, 'shell'); tube_path(a, [sh + (el - sh) * k / 6 for k in range(7)], 0.034, 24)
    P.append(a); P.append(Part(name, 'shell').rows(superellipsoid(0.034, 0.034, 0.034, 1, 1, 24, 16), M=Matrix.Translation(el)))
    f = Part(name, 'shell'); tube_path(f, [el + (wr - el) * k / 5 for k in range(6)], 0.032, 24); P.append(f)
    # the mitten hand: a rounded teal mitt with a thumb
    d = (wr - el).normalized()
    M = Matrix.Translation(wr + d * 0.035) @ d.to_track_quat('Z', 'Y').to_matrix().to_4x4()
    P.append(Part(name, 'teal').rows(superellipsoid(0.038, 0.03, 0.05, 0.8, 0.8, 32, 20), M=M))
    P.append(Part(name, 'teal').rows(superellipsoid(0.016, 0.016, 0.026, 0.9, 0.9, 20, 12), M=M @ Matrix.Translation((-s * 0.032, -0.01, 0.008)) @ Matrix.Rotation(-s * 0.5, 4, 'Y')))
    return P

def hover_parts():
    P = []
    # the hover ring under the body: a dark torus with a glowing underside
    R0, r0, zc = 0.1, 0.028, 0.135
    rows = [[Vector(((R0 + r0 * math.cos(TAU * j / 24)) * math.cos(TAU * i / 72), (R0 + r0 * math.cos(TAU * j / 24)) * math.sin(TAU * i / 72), zc + r0 * math.sin(TAU * j / 24))) for i in range(72)] for j in range(25)]
    t = Part('hover', 'tealdark'); t.rows(rows); P.append(t)
    g = Part('hover', 'glow'); g.rows(lathe_rows([(R0 - 0.022, zc - 0.026), (R0, zc - r0 - 0.002), (R0 + 0.022, zc - 0.026)], 72)); P.append(g)
    P.append(Part('hover', 'tealdark').rows(lathe_rows([(0.0, 0.118), (0.07, 0.12), (0.09, 0.14), (0.0, 0.16)], 48)))
    return P

def all_parts():
    return head_parts() + body_parts() + arm_parts('arm_a', -1) + arm_parts('arm_b', 1) + hover_parts()

# ───────────────────────────────────── build, preview, export
def _coll(name, sc):
    c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if c.name not in sc.collection.children: sc.collection.children.link(c)
    for o in list(c.objects):
        me = o.data; bpy.data.objects.remove(o, do_unlink=True)
        if me and me.users == 0: bpy.data.meshes.remove(me)
    return c

def studio():
    sc = bpy.data.scenes.get('robo_studio') or bpy.data.scenes.new('robo_studio')
    w = bpy.data.worlds.get('rd_world') or bpy.data.worlds.new('rd_world'); w.use_nodes = True; nt = w.node_tree; nt.nodes.clear()
    bg = nt.nodes.new('ShaderNodeBackground'); out = nt.nodes.new('ShaderNodeOutputWorld'); nt.links.new(bg.outputs[0], out.inputs[0])
    bg.inputs[0].default_value = (0.42, 0.47, 0.5, 1); bg.inputs[1].default_value = 0.7
    sc.world = w
    for o in [o for o in sc.collection.objects]: bpy.data.objects.remove(o, do_unlink=True)
    def light(name, loc, energy, size, color=(1, 1, 1)):
        ld = bpy.data.lights.new(name, 'AREA'); ld.energy = energy; ld.size = size; ld.color = color
        o = bpy.data.objects.new(name, ld); sc.collection.objects.link(o); o.location = loc
        d = (Vector((0, 0, 0.6)) - Vector(loc)).normalized(); o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler(); return o
    light('rd_key', (-1.6, -2.0, 2.2), 260, 1.6, (1.0, 0.95, 0.88))
    light('rd_fill', (2.0, -1.2, 1.0), 90, 2.0, (0.85, 0.92, 1.0))
    light('rd_rim', (0.6, 2.2, 2.0), 220, 1.2)
    me = bpy.data.meshes.new('rd_floor'); me.from_pydata([(-6, -6, 0), (6, -6, 0), (6, 6, 0), (-6, 6, 0)], [], [(0, 1, 2, 3)])
    fl = bpy.data.objects.new('rd_floor', me); sc.collection.objects.link(fl)
    fl.data.materials.append(mat('rd_floormat', lin('#d9d4c8'), 0.6))
    cd = bpy.data.cameras.new('rd_cam'); cd.lens = 70
    cam = bpy.data.objects.new('rd_cam', cd); sc.collection.objects.link(cam); sc.camera = cam
    r = sc.render; r.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 96; sc.cycles.use_denoising = True
    r.threads_mode = 'FIXED'; r.threads = max(1, (os.cpu_count() or 4) // 2)
    r.film_transparent = False; r.image_settings.file_format = 'PNG'
    try: sc.view_settings.view_transform = 'AgX'
    except Exception: sc.view_settings.view_transform = 'Filmic'
    return sc

def robo_build():
    t0 = time.time(); materials(); sc = studio(); coll = _coll('RD', sc); n = 0
    for k, p in enumerate(all_parts()):
        o = p.obj(coll, 'rd.%s.%s.%d' % (p.g, p.m, k)); o.data.materials.append(MATS[p.m])
        n += len(o.data.polygons)
        if p.m in ('visor', 'badge'): _uv(o, p)
    # hovering: the whole robot floats 0.1 m above the studio floor
    for o in coll.objects: o.location.z = 0.1
    return {'robo_build': n, 't': round(time.time() - t0, 1)}

def _uv(o, p):
    me = o.data; uv = me.uv_layers.new(name='UV')
    if p.m == 'visor':
        # the patch is a regular grid: u along the columns, v along the rows (local coordinates → angles)
        a, b, c = HEAD_R; U0, U1 = -math.pi / 2 - 0.98, -math.pi / 2 + 0.98; V0, V1 = -0.66, 0.6
        for l in me.loops:
            q = me.vertices[l.vertex_index].co - HEAD_C
            v = math.asin(max(-1, min(1, sgnpow(q.z / (c * 1.01), 1 / 0.62))))
            cu = math.cos(v) ** 0.62 or 1e-6
            u = math.atan2(sgnpow(q.y / (b * 1.012) / cu, 1 / 0.58), sgnpow(q.x / (a * 1.01) / cu, 1 / 0.58))
            uv.data[l.index].uv = ((u - U0) / (U1 - U0), (v - V0) / (V1 - V0))
    else:
        M, r = p.disk_uv; Mi = M.inverted()
        for l in me.loops:
            q = Mi @ me.vertices[l.vertex_index].co
            uv.data[l.index].uv = (0.5 + q.x / (2 * r), 0.5 + q.y / (2 * r))

VIEWS = {'front': (-28, 6, 2.3), 'side': (-80, 4, 2.3), 'face': (-12, 4, 1.25), 'back': (150, 10, 2.3)}
def robo_preview(view='front', pct=60):
    sc = bpy.data.scenes['robo_studio']; az, el, dist = VIEWS[view]
    tgt = Vector((0, 0, 0.62 if view != 'face' else 0.84))
    a, e = math.radians(az - 90), math.radians(el)
    cam = sc.camera; cam.location = tgt + Vector((math.cos(a) * math.cos(e), math.sin(a) * math.cos(e), math.sin(e))) * dist
    cam.rotation_euler = (tgt - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.render.resolution_x, sc.render.resolution_y = (900, 900) if view != 'face' else (900, 700)
    sc.render.resolution_percentage = pct
    p = os.path.join(PV, 'robo_%s.png' % view); sc.render.filepath = p
    if os.path.exists(p): os.remove(p)
    bpy.context.window.scene = sc
    with bpy.context.temp_override(window=bpy.context.window_manager.windows[0]):
        return {'started': str(bpy.ops.render.render('INVOKE_DEFAULT', write_still=True)), 'file': p}

def robo_export():
    coll = bpy.data.collections['RD']; out = {'parts': [], 'pivots': {k: [v[0], v[2], -v[1]] for k, v in PIV.items()}}
    for o in coll.objects:
        _, g, m, _k = o.name.split('.')
        me = o.data; me.calc_loop_triangles(); nl = len(me.loops)
        vi = np.empty(nl, np.int64); me.loops.foreach_get('vertex_index', vi)
        co = np.empty(len(me.vertices) * 3, np.float32); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)[vi]
        n = np.empty(nl * 3, np.float32); me.corner_normals.foreach_get('vector', n); n = n.reshape(-1, 3)
        tri = np.empty(len(me.loop_triangles) * 3, np.int64); me.loop_triangles.foreach_get('loops', tri)
        e = {'g': g, 'm': m, 'p': np.round(np.stack([co[:, 0], co[:, 2], -co[:, 1]], 1), 4).ravel().tolist(),
             'n': np.round(np.stack([n[:, 0], n[:, 2], -n[:, 1]], 1), 3).ravel().tolist(), 'i': tri.tolist()}
        if me.uv_layers:
            uv = np.empty(nl * 2, np.float32); me.uv_layers[0].data.foreach_get('uv', uv); e['uv'] = np.round(uv, 4).tolist()
        out['parts'].append(e)
    with open(os.path.join(LD, 'robo_da.json'), 'w') as fh: json.dump(out, fh, separators=(',', ':'))
    return {'robo_export': len(out['parts'])}
