# ניצוץ (1.4.4 set 2): the inventors' workshop's guide (Avi, 4.11): an animated light bulb, no crown and no gears, white
# gloves that float beside him, a trail of sparks under him (the sparks are drawn by the game). The sketch is
# art/concepts/nitzotz-1.webp (without the gears on the head).
# A puppet of joints like קוּבִּי (empties J:<name>): the bulb (glass shell, the glowing heart, the filament and its two
# wires, the brass collar and the threaded base with its dark contact) and the two gloves, each a joint of its own so the
# game moves them freely (no arms). The face is not modelled: the game draws it live on a canvas inside the glass
# (socket S:face). Light is his feeling: the game drives the heart's glow (bright with an idea, flicker when excited, dim
# when bored, a "blown fuse" with a puff of smoke).
# Runs in the robolab_kit.py namespace (its mat(), _coll(), mw(), _to3(), _mesh_slots()):
#   ns = {}; exec(open('tools/blender/robolab_kit.py').read(), ns); exec(open('tools/blender/nitzotz.py').read(), ns)
#   ns['nz_build'](); ns['nz_export']('art/workshop/nitzotz_export.json'); ns['nz_preview']('/tmp/nz.png')
# Headless in the container: pip install bpy==5.2.2 (tools/nitzotz-build.py runs all of it).
import bpy, bmesh, math, json, os
from mathutils import Vector, Euler, Matrix

SLOT_COL.update({
    'shell': (0.86, 0.93, 1.00), 'core': (1.00, 0.86, 0.52), 'filament': (1.00, 0.72, 0.30), 'wire': (0.62, 0.56, 0.48),
    'brass': (0.80, 0.62, 0.32), 'thread': (0.70, 0.70, 0.72), 'contact': (0.16, 0.15, 0.15), 'glove': (0.98, 0.97, 0.94), 'cuff': (0.93, 0.90, 0.84),
})
SLOT_ROUGH.update({'shell': 0.05, 'brass': 0.28, 'thread': 0.32, 'glove': 0.6, 'cuff': 0.55, 'core': 0.4})

def _nz_joint(name, parent=None, loc=(0, 0, 0)):
    e = bpy.data.objects.new('J:' + name, None); _coll()[1].objects.link(e)
    if parent: e.parent = parent
    e.location = loc; e.empty_display_size = 0.05
    return e

def _lathe(name, prof, slot, parent, seg=64, cap_top=False, cap_bot=False):
    """a surface of revolution round Z from a profile [(r, z), ...] (bottom to top)"""
    bm = bmesh.new()
    rings = []
    for (r, z) in prof:
        ring = [bm.verts.new((r * math.cos(2 * math.pi * i / seg), r * math.sin(2 * math.pi * i / seg), z)) for i in range(seg)]
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for i in range(seg):
            j = (i + 1) % seg
            bm.faces.new((a[i], a[j], b[j], b[i]))
    if cap_bot and prof[0][0] > 1e-4: bm.faces.new(list(reversed(rings[0])))
    if cap_top and prof[-1][0] > 1e-4: bm.faces.new(rings[-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _mk(name, bm, slot, parent=parent)

def _bulb_profile():
    """8.11 (Avi: "the film's ניצוץ is much nicer"): the film's bulb (art/films/workshop.webm), a tall pear: a big round
    top (radius .31 round z .53) that runs down in a smooth S into a long narrowing neck (radius .135 at z .12)"""
    R, cz, zN, rN = 0.31, 0.53, 0.12, 0.135
    pts = []
    # the round top, from the equator up (a quarter circle), and below the equator a little further round the sphere
    a0 = -0.62   # radians below the equator where the sphere hands over to the neck
    zJ, rJ = cz + R * math.sin(a0), R * math.cos(a0)
    # the neck: a smooth curve from (rN, zN) up to the joint, tangent to the sphere there (a cubic Hermite in r(z))
    slope = -math.tan(a0)   # dr/dz of the sphere at the joint (r grows going up while below the equator)
    n = 16
    for k in range(n):
        u = k / n; z = zN + (zJ - zN) * u
        h00, h10, h01, h11 = 2*u**3 - 3*u**2 + 1, u**3 - 2*u**2 + u, -2*u**3 + 3*u**2, u**3 - u**2
        r = h00 * rN + h10 * (zJ - zN) * 0.0 + h01 * rJ + h11 * (zJ - zN) * slope
        pts.append((r, z))
    m = 34
    for k in range(m + 1):
        a = a0 + (math.pi / 2 - a0) * k / m
        pts.append((max(0.0, R * math.cos(a)), cz + R * math.sin(a)))
    return pts

def _glove(name, side, parent):
    """a soft cartoon glove (palm, thumb and three fingers, a rolled cuff) from metaballs: no seams, no sharp edges"""
    mb = bpy.data.metaballs.new(name + '_mb'); mb.resolution = 0.006; mb.render_resolution = 0.006; mb.threshold = 0.6
    ob = bpy.data.objects.new(name + '_mbo', mb); _coll()[1].objects.link(ob)
    def el(co, r, kind='BALL', size=None, rot=None):
        e = mb.elements.new(); e.type = kind; e.co = co; e.radius = r
        if size: e.size_x, e.size_y, e.size_z = size
        if rot: e.rotation = rot
        return e
    s = 1 if side == 'r' else -1
    e = el((0, 0, 0.012), 0.16, 'ELLIPSOID', (0.66, 0.38, 0.58)); e.stiffness = 2.2       # the palm, a puffy mitten (8.11: bigger, the film's)
    for (x, ln, tilt) in ((-0.066, 0.05, -0.12), (-0.022, 0.062, -0.04), (0.022, 0.064, 0.04), (0.064, 0.052, 0.12)):   # four fingers, spread a little
        for k in range(4):
            e = el((x + tilt * k * 0.03, 0.0, 0.075 + k * ln / 3), 0.034 - k * 0.0012); e.stiffness = 2.6
    for k in range(3):                                                                  # a thumb, low and out to the side
        e = el((s * (0.085 + k * 0.022), -0.016, -0.006 + k * 0.02), 0.035 - k * 0.002); e.stiffness = 2.8
    e = el((0, 0, -0.055), 0.1, 'ELLIPSOID', (0.56, 0.42, 0.5)); e.stiffness = 2.0      # the wrist, down into the cuff
    dg = _dg()   # the robolab scene's own depsgraph (the context's scene is another one when headless)
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bpy.data.objects.remove(ob, do_unlink=True); bpy.data.metaballs.remove(mb)
    me.name = name
    for p in me.polygons: p.use_smooth = True
    me.materials.append(mat('glove'))
    o = bpy.data.objects.new(name, me); _coll()[1].objects.link(o); o.parent = parent
    # the rolled cuff: a fat ring round the wrist
    bm = bmesh.new(); R, r, seg, rseg = 0.062, 0.024, 40, 12   # 8.11: a fatter rolled cuff
    rings = []
    for i in range(seg):
        a = 2 * math.pi * i / seg
        ring = []
        for j in range(rseg):
            b = 2 * math.pi * j / rseg
            x = (R + r * math.cos(b)) * math.cos(a); y = (R + r * math.cos(b)) * math.sin(a) * 0.72; z = r * math.sin(b) * 1.15
            ring.append(bm.verts.new((x, y, z)))
        rings.append(ring)
    for i in range(seg):
        A, B = rings[i], rings[(i + 1) % seg]
        for j in range(rseg):
            k = (j + 1) % rseg
            bm.faces.new((A[j], B[j], B[k], A[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    _mk(name + '_cuff', bm, 'cuff', parent=parent, loc=(0, 0, -0.085))
    return o

def nz_build():
    try: bpy.context.window.scene = _coll()[0]   # metaballs and modifiers are evaluated in the scene of the window
    except Exception: pass
    for o in [o for o in bpy.data.objects if o.name.startswith('J:nz') or o.name.startswith('nz_') or o.name in ('J:bulb', 'J:hand_l', 'J:hand_r', 'J:nitzotz')]:
        bpy.data.objects.remove(o, do_unlink=True)
    root = _nz_joint('nitzotz')
    bulb = _nz_joint('bulb', root, (0, 0, 0.16))
    # the glass, the warm heart inside it, the filament on two wires
    _lathe('nz_shell', _bulb_profile(), 'shell', bulb, seg=72)
    sph = bmesh.new(); bmesh.ops.create_uvsphere(sph, u_segments=32, v_segments=16, radius=0.075)
    bmesh.ops.scale(sph, vec=(1, 0.8, 1.05), verts=sph.verts)
    _mk('nz_core', sph, 'core', parent=bulb, loc=(0, 0.08, 0.36))
    # the filament: a small coil across, between the tips of two wires
    bm = bmesh.new(); pts = []
    turns, L, rr = 7, 0.16, 0.012
    for i in range(turns * 16 + 1):
        t = i / (turns * 16); a = t * turns * 2 * math.pi
        pts.append(Vector((-L / 2 + L * t, 0.05 + rr * math.cos(a), 0.30 + rr * math.sin(a) + 0.02 * math.sin(t * math.pi))))
    _tube(bm, pts, 0.0035, 8)
    _mk('nz_filament', bm, 'filament', parent=bulb)
    for sx in (-1, 1):
        bm = bmesh.new(); _tube(bm, [Vector((sx * 0.03, 0.05, 0.13)), Vector((sx * 0.06, 0.05, 0.22)), Vector((sx * 0.08, 0.05, 0.31))], 0.003, 6)
        _mk('nz_wire_%d' % sx, bm, 'wire', parent=bulb)
    bm = bmesh.new(); _tube(bm, [Vector((0, 0.05, 0.06)), Vector((0, 0.05, 0.16))], 0.012, 12)   # the glass stem
    _mk('nz_stem', bm, 'shell', parent=bulb)
    # the brass collar at the neck, the threaded base, the dark ring and the contact at the bottom
    _lathe('nz_collar', [(0.128, 0.07), (0.145, 0.085), (0.145, 0.12), (0.133, 0.135)], 'thread', bulb, seg=56)
    thr = []
    for k in range(5 * 12 + 1):   # a thread: the radius swells and shrinks five times on the way down
        z = 0.07 - k * (0.15 / 60)
        thr.append((0.118 + 0.012 * (0.5 + 0.5 * math.cos(k / 12 * 2 * math.pi)), z))
    _lathe('nz_base', list(reversed(thr)), 'thread', bulb, seg=56)
    _lathe('nz_ring', [(0.075, -0.115), (0.108, -0.096), (0.112, -0.082)], 'contact', bulb, seg=48)
    _lathe('nz_tip', [(0.0, -0.13), (0.035, -0.128), (0.05, -0.118), (0.076, -0.114)], 'contact', bulb, seg=40, cap_bot=False)
    face = bpy.data.objects.new('S:face', None); _coll()[1].objects.link(face); face.parent = bulb; face.location = (0, -0.245, 0.53)
    face.empty_display_size = 0.15
    halo = bpy.data.objects.new('S:heart', None); _coll()[1].objects.link(halo); halo.parent = bulb; halo.location = (0, 0.0, 0.48)
    # the two gloves float beside him, a little in front, palms turned in
    for sx, side in ((-1, 'l'), (1, 'r')):
        h = _nz_joint('hand_' + side, root, (sx * 0.5, -0.08, 0.42))
        h.rotation_euler = Euler((math.radians(-10), math.radians(sx * -18), math.radians(sx * 12)))
        _glove('nz_glove_' + side, side, h)
    return {'objects': len([o for o in bpy.data.objects if o.name.startswith('nz_') or o.name.startswith('J:')])}

def _tube(bm, pts, r, seg):
    """a round tube along a polyline (the filament, the wires, the stem)"""
    rings = []
    for i, p in enumerate(pts):
        d = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        a = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))
        u = d.cross(a).normalized(); v = d.cross(u).normalized()
        rings.append([bm.verts.new(p + (u * math.cos(2 * math.pi * k / seg) + v * math.sin(2 * math.pi * k / seg)) * r) for k in range(seg)])
    for A, B in zip(rings, rings[1:]):
        for k in range(seg):
            j = (k + 1) % seg
            bm.faces.new((A[k], A[j], B[j], B[k]))
    bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

def _nz_puppet(j, rel_parent):
    m = rel_parent.inverted() @ mw(j) if rel_parent is not None else mw(j)
    loc = m.to_translation(); q = m.to_euler('XYZ')
    own = mw(j).inverted()
    slots = {}
    def add(o):
        for sl, S in _mesh_slots(o, own).items():
            T = slots.setdefault(sl, {'p': [], 'n': []}); T['p'] += S['p']; T['n'] += S['n']
        for ch in o.children:
            if ch.type == 'MESH': add(ch)
    socks = {}
    for ch in j.children:
        if ch.type == 'MESH': add(ch)
        elif ch.type == 'EMPTY' and ch.name.startswith('S:'):
            mm = own @ mw(ch); socks[ch.name[2:]] = [round(x, 4) for x in _to3(mm.to_translation())]
    kids = [_nz_puppet(ch, mw(j)) for ch in j.children if ch.type == 'EMPTY' and ch.name.startswith('J:')]
    return {'name': j.name[2:], 'at': [round(x, 4) for x in _to3(loc)], 'rot': [round(q.x, 4), round(q.z, 4), round(-q.y, 4)], 'slots': slots, 'sockets': socks, 'kids': kids}

def nz_export(path):
    data = {'winding': 'ccw', 'puppet': _nz_puppet(bpy.data.objects['J:nitzotz'], None)}
    os.makedirs(os.path.dirname(path), exist_ok=True)
    json.dump(data, open(path, 'w'), separators=(',', ':'))
    return {'path': path, 'bytes': os.path.getsize(path)}

def nz_preview(path, size=700, samples=48, cam=(0.9, -2.6, 0.62), lens=60, transparent=False, tgt=(0, 0, 0.55)):
    """a quick look (Cycles on the CPU): the bulb with its gloves on a soft grey, lit from the front left"""
    sc = _coll()[0]
    st = bpy.data.collections.get('NZ_stage') or bpy.data.collections.new('NZ_stage')
    if st.name not in [c.name for c in sc.collection.children]: sc.collection.children.link(st)
    c = bpy.data.objects.get('nz_cam') or bpy.data.objects.new('nz_cam', bpy.data.cameras.new('nz_cam'))
    if c.name not in st.objects: st.objects.link(c)
    c.location = cam; c.data.lens = lens
    tgt = Vector(tgt); d = tgt - Vector(cam)
    c.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    for n, e, rot in (('nz_key', 600, (math.radians(55), 0, math.radians(-35))), ('nz_fill', 250, (math.radians(70), 0, math.radians(140)))):
        L = bpy.data.objects.get(n) or bpy.data.objects.new(n, bpy.data.lights.new(n, 'AREA'))
        if L.name not in st.objects: st.objects.link(L)
        L.data.energy = e; L.data.size = 2.5; L.rotation_euler = rot
        L.location = (Euler(rot).to_matrix() @ Vector((0, 0, 3.2))) + Vector((0, 0, 0.5))
    sc.camera = c
    w = bpy.data.worlds.get('nz_world') or bpy.data.worlds.new('nz_world'); sc.world = w
    try: w.use_nodes = True
    except Exception: pass
    bg = next((n for n in w.node_tree.nodes if n.type == 'BACKGROUND'), None)
    bg.inputs[0].default_value = (0.82, 0.86, 0.9, 1); bg.inputs[1].default_value = 0.7
    sc.render.engine = 'CYCLES'; sc.cycles.samples = samples; sc.cycles.device = 'CPU'
    try: sc.cycles.use_denoising = True
    except Exception: pass
    sc.render.film_transparent = transparent
    sc.render.resolution_x = size; sc.render.resolution_y = size; sc.render.resolution_percentage = 100
    sc.view_settings.view_transform = 'AgX'
    sc.render.filepath = path
    bpy.context.window_manager  # keep bpy awake
    bpy.ops.render.render(write_still=True, scene=sc.name)
    return path

def nz_materials():
    """the look in Blender (the game has its own: src/workshop/three/nitzotz.js): clear glass, a glowing heart"""
    m = mat('shell'); b = _bsdf(m)
    try: b.inputs['Transmission Weight'].default_value = 1.0
    except Exception: pass
    b.inputs['Roughness'].default_value = 0.03; b.inputs['IOR'].default_value = 1.35
    for sl, st in (('core', 4.0), ('filament', 12.0)):
        m = mat(sl); b = _bsdf(m); col = srgb2lin(SLOT_COL[sl])
        b.inputs['Emission Color'].default_value = (*col, 1); b.inputs['Emission Strength'].default_value = st
    m = mat('core'); b = _bsdf(m)
    try: b.inputs['Alpha'].default_value = 0.55
    except Exception: pass
    for sl in ('brass', 'thread'):
        b = _bsdf(mat(sl)); b.inputs['Metallic'].default_value = 0.9
