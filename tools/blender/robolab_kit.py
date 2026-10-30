# מעבדת הרובוטים – the three tools in Blender, built from parts that click onto sockets (docs/PLAN-1.4.md 7.0).
# Avi (29.10): the tools must look great, be built from parts so more can be connected later, and the player will paint
# and decorate them (earning parts and colours). So:
#   * every base (robot, drone, sub) has named sockets (empties "S:<name>"): where a part sits and which way it faces;
#   * every part is its own object with its own origin at its socket point, so the game can put any fitting part on;
#   * every material is one of a few named SLOTS; the game paints body / trim / accent with the player's colours and keeps
#     the others (dark, cream, glass, glow, metal, rubber) as they are.
# No cross or plus shapes anywhere (Avi's rule): the drone has three rotors in a ring, every propeller has three blades,
# wheels have round hubs with dots, never spokes in a cross.
# Run on the owner's PC through the Blender bridge:
#   exec(open(r'C:\Users\avifl\Documents\reshet-hachaim-1.4\robolab\robolab_kit.py', encoding='utf-8').read(), ns)
#   rl_build()                 -> builds everything in the collection "RL" (scene "robolab")
#   rl_preview(path, pct)      -> renders a line-up of the three tools with a few parts on (Eevee)
#   rl_export(path)            -> writes the JSON for tools/build-robolab-parts.py
# Blender is Z-up and the tools face -Y; the export turns it into three.js axes (Y-up, facing +Z).
import bpy, bmesh, math, json, os
from mathutils import Vector, Matrix, Euler

SLOT_COL = {
    'body': (0.96, 0.45, 0.12), 'trim': (0.10, 0.62, 0.60), 'accent': (1.0, 0.78, 0.18),
    'dark': (0.14, 0.16, 0.19), 'cream': (0.96, 0.94, 0.90), 'glass': (0.10, 0.17, 0.21),
    'glow': (0.50, 0.89, 1.00), 'metal': (0.72, 0.76, 0.80), 'rubber': (0.09, 0.09, 0.10),
}
SLOT_ROUGH = {'glass': 0.08, 'metal': 0.3, 'rubber': 0.9, 'glow': 0.3}

def srgb2lin(c): return tuple((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)

def _bsdf(m):
    nt = m.node_tree
    b = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not b:
        b = nt.nodes.new('ShaderNodeBsdfPrincipled')
        out = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'), None) or nt.nodes.new('ShaderNodeOutputMaterial')
        nt.links.new(b.outputs[0], out.inputs[0])
    return b

def mat(slot):
    name = 'RL_' + slot
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    b = _bsdf(m)
    col = srgb2lin(SLOT_COL[slot])
    b.inputs['Base Color'].default_value = (*col, 1)
    b.inputs['Roughness'].default_value = SLOT_ROUGH.get(slot, 0.45)
    if slot == 'metal': b.inputs['Metallic'].default_value = 0.8
    if slot == 'glow':
        b.inputs['Emission Color'].default_value = (*col, 1); b.inputs['Emission Strength'].default_value = 3.0
    if slot == 'glass': b.inputs['Coat Weight'].default_value = 1.0
    return m

# ── tiny modelling helpers (bmesh primitives, modifiers kept live and applied by the export)
def _coll():
    sc = bpy.data.scenes.get('robolab') or bpy.data.scenes.new('robolab')
    c = bpy.data.collections.get('RL')
    if not c: c = bpy.data.collections.new('RL'); sc.collection.children.link(c)
    return sc, c

def _mk(name, bm, slot, parent=None, loc=(0, 0, 0), rot=(0, 0, 0), smooth=True):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    if smooth:
        for p in me.polygons: p.use_smooth = True
    me.materials.append(mat(slot))
    o = bpy.data.objects.new(name, me); _coll()[1].objects.link(o)
    if parent: o.parent = parent
    o.location = loc; o.rotation_euler = rot
    return o

def bevel(o, w, seg=3):
    m = o.modifiers.new('bev', 'BEVEL'); m.width = w; m.segments = seg; m.limit_method = 'ANGLE'; m.harden_normals = False
    return o

def subsurf(o, lv=2):
    m = o.modifiers.new('sub', 'SUBSURF'); m.levels = lv; m.render_levels = lv
    return o

def box(name, sx, sy, sz, slot, r=0.04, **k):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * sx, v.co.y * sy, v.co.z * sz))
    o = _mk(name, bm, slot, **k)
    if r: bevel(o, r, 4)
    return o

def cyl(name, r, h, slot, seg=32, r2=None, axis='Z', bev=0.0, **k):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=(r if r2 is None else r2), depth=h)
    if axis == 'X': bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'Y'))
    if axis == 'Y': bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'X'))
    o = _mk(name, bm, slot, **k)
    if bev: bevel(o, bev, 3)
    return o

def sphere(name, r, slot, sx=1, sy=1, sz=1, seg=32, ring=16, cut=None, **k):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=ring, radius=r)
    if cut is not None:   # keep the part above z = cut*r (a dome)
        dels = [v for v in bm.verts if v.co.z < cut * r - 1e-6]
        bmesh.ops.delete(bm, geom=dels, context='VERTS')
    for v in bm.verts: v.co = Vector((v.co.x * sx, v.co.y * sy, v.co.z * sz))
    return _mk(name, bm, slot, **k)

def torus(name, R, r, slot, seg=40, rseg=12, axis='Z', **k):
    bm = bmesh.new()
    for i in range(seg):
        a = 2 * math.pi * i / seg
        for j in range(rseg):
            b = 2 * math.pi * j / rseg
            x = (R + r * math.cos(b)) * math.cos(a); y = (R + r * math.cos(b)) * math.sin(a); z = r * math.sin(b)
            bm.verts.new((x, y, z))
    bm.verts.ensure_lookup_table()
    for i in range(seg):
        for j in range(rseg):
            a = i * rseg + j; b = ((i + 1) % seg) * rseg + j; c = ((i + 1) % seg) * rseg + (j + 1) % rseg; d = i * rseg + (j + 1) % rseg
            bm.faces.new((bm.verts[a], bm.verts[b], bm.verts[c], bm.verts[d]))
    if axis == 'X': bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'Y'))
    if axis == 'Y': bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'X'))
    return _mk(name, bm, slot, **k)

def blade3(name, r, slot, width=0.32, thick=0.02, **k):
    """a three-blade propeller lying in the XY plane (spins around Z): rounded paddle blades, a round hub"""
    bm = bmesh.new()
    for i in range(3):
        a = i * 2 * math.pi / 3
        rot = Matrix.Rotation(a, 3, 'Z')
        pts = []
        n = 10
        for s in range(n + 1):   # a paddle outline: narrow at the hub, round at the tip
            t = s / n; w = width * r * (0.35 + 0.65 * math.sin(math.pi * min(1, t * 0.9 + 0.1)))
            pts.append((0.12 * r + t * 0.88 * r, w / 2))
        outline = pts + [(x, -y) for (x, y) in reversed(pts)]
        top = [bm.verts.new(rot @ Vector((x, y, thick / 2 + 0.01 * x / r))) for (x, y) in outline]
        bot = [bm.verts.new(rot @ Vector((x, y, -thick / 2 + 0.01 * x / r))) for (x, y) in outline]
        bm.faces.new(top); bm.faces.new(list(reversed(bot)))
        for q in range(len(outline)):
            q2 = (q + 1) % len(outline); bm.faces.new((top[q], top[q2], bot[q2], bot[q]))
    o = _mk(name, bm, slot, smooth=False, **k)
    hub = cyl(name + '_hub', 0.16 * r, thick * 2.4, 'metal', seg=20, parent=o)
    return o

def socket(base, name, loc, rot=(0, 0, 0)):
    e = bpy.data.objects.new('S:' + base.name + ':' + name, None); _coll()[1].objects.link(e)
    e.parent = base; e.location = loc; e.rotation_euler = rot; e.empty_display_size = 0.08
    return e

def group(name, parent=None, loc=(0, 0, 0)):
    e = bpy.data.objects.new(name, None); _coll()[1].objects.link(e)
    if parent: e.parent = parent
    e.location = loc; e.empty_display_size = 0.15
    return e

# ───────────────────────────────────────── the robot: a six-wheel field rover
def build_robot():
    R = group('base_robot')
    body = box('robot_body', 0.86, 1.12, 0.36, 'body', r=0.1, parent=R, loc=(0, 0, 0.56)); subsurf(body, 1)
    box('robot_top', 0.74, 0.96, 0.06, 'cream', r=0.03, parent=R, loc=(0, 0, 0.76))
    box('robot_belly', 0.7, 1.0, 0.12, 'dark', r=0.04, parent=R, loc=(0, 0, 0.36))
    for sx in (-1, 1):   # side panels with a stripe, the rocker arm and three wheels
        box('robot_side_%d' % sx, 0.06, 0.9, 0.22, 'trim', r=0.025, parent=R, loc=(sx * 0.45, 0, 0.56))
        box('robot_stripe_%d' % sx, 0.065, 0.5, 0.05, 'accent', r=0.012, parent=R, loc=(sx * 0.455, -0.08, 0.6))
        box('robot_rocker_%d' % sx, 0.06, 0.95, 0.08, 'metal', r=0.02, parent=R, loc=(sx * 0.53, 0, 0.32))
        for wy in (-0.42, 0, 0.42):
            w = group('wheel_%d_%d' % (sx, int(wy * 100)), parent=R, loc=(sx * 0.6, wy, 0.2))
            t = cyl(w.name + '_tyre', 0.2, 0.17, 'rubber', seg=36, axis='X', bev=0.03, parent=w);
            torus(w.name + '_tread', 0.2, 0.025, 'rubber', seg=24, rseg=6, axis='X', parent=w)
            cyl(w.name + '_hub', 0.11, 0.18, 'accent', seg=24, axis='X', bev=0.015, parent=w)
            for k in range(5):   # five round bolts on the hub (a ring, never a cross)
                a = k * 2 * math.pi / 5
                sphere(w.name + '_bolt%d' % k, 0.017, 'metal', seg=10, ring=6, parent=w, loc=(sx * 0.095, math.cos(a) * 0.06, math.sin(a) * 0.06))
    # a bumper and two head lamps in front (-Y)
    box('robot_bumper', 0.8, 0.08, 0.1, 'dark', r=0.035, parent=R, loc=(0, -0.6, 0.44))
    for lx in (-0.26, 0.26):
        cyl('robot_lamp_%d' % int(lx * 100), 0.055, 0.04, 'glow', seg=20, axis='Y', parent=R, loc=(lx, -0.6, 0.6))
    socket(R, 'head', (0, -0.22, 0.79))
    socket(R, 'back', (0, 0.26, 0.79))
    socket(R, 'arm', (0.36, -0.5, 0.62))
    socket(R, 'top', (-0.28, 0.42, 0.79))
    socket(R, 'side_l', (-0.48, 0.2, 0.62), (0, 0, math.pi / 2))
    socket(R, 'side_r', (0.48, 0.2, 0.62), (0, 0, -math.pi / 2))
    return R

# ── robot parts (each part's origin sits on its socket)
def part_head_screen():
    P = group('part_head_screen')
    cyl('hs_neck', 0.07, 0.16, 'metal', seg=20, parent=P, loc=(0, 0, 0.08))
    h = box('hs_head', 0.56, 0.4, 0.36, 'cream', r=0.12, parent=P, loc=(0, 0, 0.33)); subsurf(h, 1)
    box('hs_screen', 0.44, 0.04, 0.24, 'glass', r=0.05, parent=P, loc=(0, -0.2, 0.34))
    for ex in (-0.1, 0.1):
        sphere('hs_eye_%d' % int(ex * 100), 0.045, 'glow', parent=P, loc=(ex, -0.225, 0.36), sy=0.5)
    for sx in (-1, 1):
        cyl('hs_ear_%d' % sx, 0.07, 0.05, 'trim', seg=24, axis='X', bev=0.01, parent=P, loc=(sx * 0.29, 0, 0.34))
    return P

def part_head_dome():
    P = group('part_head_dome')
    cyl('hd_base', 0.2, 0.08, 'trim', seg=36, bev=0.02, parent=P, loc=(0, 0, 0.04))
    sphere('hd_glass', 0.19, 'glass', cut=0.0, parent=P, loc=(0, 0, 0.08))
    sphere('hd_core', 0.07, 'glow', parent=P, loc=(0, -0.04, 0.16))
    return P

def part_bin():
    P = group('part_bin')
    b = box('bin_box', 0.56, 0.4, 0.22, 'cream', r=0.05, parent=P, loc=(0, 0, 0.11))
    box('bin_rim', 0.6, 0.44, 0.04, 'trim', r=0.02, parent=P, loc=(0, 0, 0.22))
    for i in range(3): sphere('bin_fruit%d' % i, 0.06, 'accent', parent=P, loc=(-0.12 + i * 0.12, 0.02 * i, 0.2))
    return P

def part_drone_pad():
    P = group('part_drone_pad')
    cyl('pad_post', 0.06, 0.1, 'metal', seg=16, parent=P, loc=(0, 0, 0.05))
    cyl('pad_disc', 0.3, 0.04, 'dark', seg=48, bev=0.01, parent=P, loc=(0, 0, 0.12))
    torus('pad_ring', 0.24, 0.018, 'glow', seg=48, rseg=8, parent=P, loc=(0, 0, 0.145))
    torus('pad_ring2', 0.1, 0.014, 'accent', seg=36, rseg=8, parent=P, loc=(0, 0, 0.145))
    return P

def part_water_tank():
    P = group('part_water_tank')
    t = cyl('tank_body', 0.17, 0.42, 'trim', seg=32, axis='Y', bev=0.04, parent=P, loc=(0, 0, 0.17))
    cyl('tank_window', 0.12, 0.3, 'glass', seg=32, axis='Y', parent=P, loc=(0, 0, 0.17), )
    for sx in (-1, 1): box('tank_strap_%d' % sx, 0.38, 0.03, 0.04, 'dark', r=0.01, parent=P, loc=(0, sx * 0.12, 0.02))
    cyl('tank_hose', 0.025, 0.4, 'dark', seg=12, axis='Y', parent=P, loc=(0.16, -0.35, 0.1))
    return P

def part_grabber():
    P = group('part_grabber')
    cyl('gr_joint', 0.06, 0.08, 'metal', seg=20, axis='X', parent=P)
    a = box('gr_arm', 0.07, 0.36, 0.07, 'trim', r=0.025, parent=P, loc=(0, -0.18, 0.04))
    cyl('gr_wrist', 0.05, 0.06, 'metal', seg=20, axis='Y', parent=P, loc=(0, -0.38, 0.05))
    for sx in (-1, 1):   # two curved fingers (a pincer, open)
        f = box('gr_finger_%d' % sx, 0.03, 0.14, 0.04, 'dark', r=0.012, parent=P, loc=(sx * 0.045, -0.46, 0.05), rot=(0, 0, sx * 0.35))
    return P

def part_planter():
    P = group('part_planter')
    cyl('pl_tube', 0.05, 0.42, 'trim', seg=20, axis='Y', parent=P, loc=(0, -0.18, 0.03))
    cyl('pl_hopper', 0.12, 0.16, 'cream', seg=28, r2=0.06, parent=P, loc=(0, 0.02, 0.12))
    sphere('pl_seed', 0.04, 'accent', parent=P, loc=(0, -0.42, 0.03), sz=1.3)
    return P

def part_antenna():
    P = group('part_antenna')
    cyl('an_rod', 0.012, 0.42, 'metal', seg=10, parent=P, loc=(0, 0, 0.21))
    sphere('an_tip', 0.04, 'glow', parent=P, loc=(0, 0, 0.44))
    return P

def part_beacon():
    P = group('part_beacon')
    cyl('bc_base', 0.08, 0.05, 'dark', seg=24, parent=P, loc=(0, 0, 0.025))
    sphere('bc_dome', 0.075, 'glow', cut=0.0, parent=P, loc=(0, 0, 0.05))
    return P

def part_solar():
    P = group('part_solar')
    cyl('so_post', 0.02, 0.18, 'metal', seg=10, parent=P, loc=(0, 0, 0.09))
    box('so_panel', 0.44, 0.3, 0.025, 'glass', r=0.01, parent=P, loc=(0, 0, 0.19), rot=(0.35, 0, 0))
    box('so_frame', 0.47, 0.33, 0.015, 'trim', r=0.006, parent=P, loc=(0, 0.004, 0.18), rot=(0.35, 0, 0))
    return P

def part_fins():   # side wings for the robot (decoration): a rounded fin on each side socket
    P = group('part_fin')
    b = box('fin_body', 0.04, 0.3, 0.16, 'accent', r=0.03, parent=P, loc=(0, 0.04, 0.06), rot=(0.4, 0, 0))
    return P

# ───────────────────────────────────────── the drone: a round body, three arms, three ducted three-blade rotors
def build_drone():
    D = group('base_drone')
    s = sphere('drone_shell', 0.42, 'body', sz=0.55, parent=D, loc=(0, 0, 0));
    sphere('drone_cap', 0.3, 'cream', sz=0.45, cut=0.2, parent=D, loc=(0, 0, 0.08))
    torus('drone_band', 0.415, 0.035, 'trim', seg=48, rseg=10, parent=D)
    for i in range(3):
        a = i * 2 * math.pi / 3 + math.pi   # one arm forward (-Y), two behind: a triangle from above
        x, y = math.sin(a) * 0.8, math.cos(a) * 0.8
        arm = box('drone_arm%d' % i, 0.09, 0.46, 0.06, 'trim', r=0.025, parent=D, loc=(math.sin(a) * 0.52, math.cos(a) * 0.52, 0.02), rot=(0, 0, -a))
        cyl('drone_duct%d' % i, 0.34, 0.08, 'cream', seg=40, bev=0.015, parent=D, loc=(x, y, 0.06))
        torus('drone_lip%d' % i, 0.35, 0.03, 'accent', seg=40, rseg=8, parent=D, loc=(x, y, 0.1))
        cyl('drone_motor%d' % i, 0.06, 0.08, 'dark', seg=16, parent=D, loc=(x, y, 0.06))
        b = blade3('rotor%d' % i, 0.3, 'metal', parent=D, loc=(x, y, 0.11))
    socket(D, 'belly', (0, 0, -0.22))
    socket(D, 'top', (0, 0, 0.22))
    socket(D, 'front', (0, -0.42, 0.0))
    return D

def part_cam():
    P = group('part_cam')
    cyl('cam_mount', 0.06, 0.06, 'dark', seg=16, parent=P, loc=(0, 0, -0.03))
    sphere('cam_ball', 0.11, 'dark', parent=P, loc=(0, 0, -0.12))
    cyl('cam_lens', 0.055, 0.05, 'glass', seg=24, axis='Y', parent=P, loc=(0, -0.1, -0.13))
    sphere('cam_glint', 0.025, 'glow', parent=P, loc=(0, -0.13, -0.12))
    return P

def part_spray():
    P = group('part_spray')
    cyl('sp_tank', 0.12, 0.16, 'trim', seg=28, bev=0.03, parent=P, loc=(0, 0, -0.1))
    cyl('sp_nozzle', 0.03, 0.12, 'metal', seg=12, axis='Y', parent=P, loc=(0, -0.14, -0.16))
    sphere('sp_drop', 0.03, 'glow', parent=P, loc=(0, -0.22, -0.16), sz=1.3)
    return P

def part_claw():
    P = group('part_claw')
    cyl('cl_winch', 0.07, 0.08, 'dark', seg=16, parent=P, loc=(0, 0, -0.04))
    cyl('cl_line', 0.01, 0.2, 'metal', seg=8, parent=P, loc=(0, 0, -0.18))
    for i in range(3):   # three hooked fingers in a ring
        a = i * 2 * math.pi / 3
        box('cl_f%d' % i, 0.03, 0.03, 0.14, 'trim', r=0.01, parent=P, loc=(math.cos(a) * 0.05, math.sin(a) * 0.05, -0.33), rot=(math.sin(a) * 0.4, -math.cos(a) * 0.4, 0))
    return P

# ───────────────────────────────────────── the diving robot: a rounded hull, a big window, a three-blade propeller
def build_sub():
    S = group('base_sub')
    h = cyl('sub_hull', 0.42, 1.1, 'body', seg=40, axis='Y', parent=S); bevel(h, 0.3, 6)
    sphere('sub_nose', 0.4, 'body', sy=0.7, parent=S, loc=(0, -0.55, 0))
    sphere('sub_window', 0.3, 'glass', sy=0.55, parent=S, loc=(0, -0.72, 0.08))
    torus('sub_window_rim', 0.29, 0.03, 'trim', seg=40, rseg=8, axis='Y', parent=S, loc=(0, -0.76, 0.06))
    cyl('sub_tail', 0.3, 0.3, 'trim', seg=36, r2=0.16, axis='Y', parent=S, loc=(0, 0.68, 0))
    torus('sub_duct', 0.3, 0.04, 'accent', seg=40, rseg=8, axis='Y', parent=S, loc=(0, 0.92, 0))
    p = blade3('prop', 0.26, 'metal', parent=S, loc=(0, 0.9, 0), rot=(math.pi / 2, 0, 0))
    box('sub_keel', 0.08, 0.7, 0.1, 'dark', r=0.03, parent=S, loc=(0, 0.05, -0.43))
    for lx in (-0.18, 0.18): sphere('sub_lamp_%d' % int(lx * 100), 0.05, 'glow', parent=S, loc=(lx, -0.78, -0.16))
    socket(S, 'top', (0, 0.1, 0.42))
    socket(S, 'front', (0, -0.8, -0.2))
    socket(S, 'side_l', (-0.42, 0.15, 0), (0, 0, math.pi / 2))
    socket(S, 'side_r', (0.42, 0.15, 0), (0, 0, -math.pi / 2))
    return S

def part_sub_fin():
    P = group('part_sub_fin')
    box('sf_fin', 0.06, 0.42, 0.28, 'accent', r=0.04, parent=P, loc=(0, 0.06, 0.12), rot=(0.25, 0, 0))
    return P

def part_thruster():
    P = group('part_thruster')
    cyl('th_pod', 0.1, 0.36, 'trim', seg=28, axis='Y', bev=0.04, parent=P, loc=(0, 0, 0))
    torus('th_ring', 0.1, 0.02, 'accent', seg=28, rseg=8, axis='Y', parent=P, loc=(0, 0.18, 0))
    return P

def part_sub_claw():
    P = group('part_sub_claw')
    cyl('sc_base', 0.06, 0.08, 'metal', seg=16, axis='Y', parent=P)
    for sx in (-1, 1): box('sc_jaw_%d' % sx, 0.03, 0.18, 0.05, 'dark', r=0.012, parent=P, loc=(sx * 0.05, -0.12, 0), rot=(0, 0, sx * 0.3))
    return P

def part_sub_lamp():
    P = group('part_sub_lamp')
    cyl('sl_body', 0.08, 0.14, 'dark', seg=24, axis='Y', parent=P, loc=(0, -0.05, 0))
    cyl('sl_light', 0.065, 0.02, 'glow', seg=24, axis='Y', parent=P, loc=(0, -0.13, 0))
    return P

BASES = {'robot': build_robot, 'drone': build_drone, 'sub': build_sub}
PARTS = {
    'head_screen': part_head_screen, 'head_dome': part_head_dome, 'bin': part_bin, 'drone_pad': part_drone_pad,
    'water_tank': part_water_tank, 'grabber': part_grabber, 'planter': part_planter, 'antenna': part_antenna,
    'beacon': part_beacon, 'solar': part_solar, 'fin': part_fins,
    'cam': part_cam, 'spray': part_spray, 'claw': part_claw,
    'sub_fin': part_sub_fin, 'thruster': part_thruster, 'sub_claw': part_sub_claw, 'sub_lamp': part_sub_lamp,
}

def rl_clear():
    c = bpy.data.collections.get('RL')
    if c:
        for o in list(c.all_objects): bpy.data.objects.remove(o, do_unlink=True)

def rl_build():
    rl_clear()
    for m in [m for m in bpy.data.materials if m.name.startswith('RL_')]: bpy.data.materials.remove(m)
    out = {}
    for k, f in BASES.items(): out[k] = f()
    for k, f in PARTS.items(): out[k] = f()
    return {'bases': list(BASES), 'parts': list(PARTS), 'objects': len(bpy.data.collections['RL'].all_objects)}

# ── a line-up for review: each tool with a set of parts on its sockets
LOOKS = {
    'robot': {'head': 'head_screen', 'back': 'drone_pad', 'arm': 'grabber', 'top': 'antenna'},
    'drone': {'belly': 'cam', 'top': None},
    'sub': {'top': 'sub_fin', 'front': 'sub_lamp', 'side_l': 'thruster', 'side_r': 'thruster'},
}

def _show_coll():
    sc = _coll()[0]
    c = bpy.data.collections.get('RL_show')
    if not c: c = bpy.data.collections.new('RL_show'); sc.collection.children.link(c)
    return c

def _copy_tree(o, parent):
    c = o.copy()
    if o.data: c.data = o.data
    _show_coll().objects.link(c); c.parent = parent
    for ch in o.children: _copy_tree(ch, c)
    return c

def rl_assemble(base, look, at=(0, 0, 0)):
    B = bpy.data.objects['base_' + base]
    root = _copy_tree(B, None); root.location = at; root.name = 'show_' + base
    for sock, pid in look.items():
        if not pid: continue
        s = next((ch for ch in B.children if ch.name == 'S:base_%s:%s' % (base, sock)), None)
        if not s: continue
        P = bpy.data.objects['part_' + pid]
        p = _copy_tree(P, root); p.location = s.location; p.rotation_euler = s.rotation_euler
    return root

def rl_preview(path, pct=60, samples=32):
    sc, c = _coll()
    for o in list(c.all_objects):
        if o.name.startswith('show_'): pass
    shc = _show_coll()
    for o in list(shc.all_objects): bpy.data.objects.remove(o, do_unlink=True)
    # the library stays out of the picture; the line-up and the stage are rendered
    c.hide_render = True
    stage = bpy.data.collections.get('RL_stage')
    if not stage: stage = bpy.data.collections.new('RL_stage'); sc.collection.children.link(stage)
    shows = [rl_assemble('robot', LOOKS['robot'], (-1.9, 0, 0)), rl_assemble('drone', LOOKS['drone'], (0, 0.3, 0.9)), rl_assemble('sub', LOOKS['sub'], (1.9, 0, 0.5))]
    for s in shows:
        for o in [s] + list(s.children_recursive): o.hide_render = False
    c = stage
    for n in ('rl_floor', 'rl_cam', 'rl_sun'):
        o = bpy.data.objects.get(n)
        if o and stage not in o.users_collection: bpy.data.objects.remove(o, do_unlink=True)
    # floor, light, camera
    fl = bpy.data.objects.get('rl_floor')
    if not fl:
        me = bpy.data.meshes.new('rl_floor'); bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=12); bm.to_mesh(me); bm.free()
        fm = bpy.data.materials.new('RL_floor')
        try: fm.use_nodes = True
        except Exception: pass
        _bsdf(fm).inputs['Base Color'].default_value = (0.55, 0.6, 0.62, 1)
        me.materials.append(fm); fl = bpy.data.objects.new('rl_floor', me); c.objects.link(fl)
    fl.hide_render = False
    cam = bpy.data.objects.get('rl_cam')
    if not cam: cam = bpy.data.objects.new('rl_cam', bpy.data.cameras.new('rl_cam')); c.objects.link(cam)
    cam.location = (0.4, -6.2, 2.6); cam.rotation_euler = Euler((math.radians(72), 0, math.radians(3)))
    cam.data.lens = 40
    sun = bpy.data.objects.get('rl_sun')
    if not sun: sun = bpy.data.objects.new('rl_sun', bpy.data.lights.new('rl_sun', 'SUN')); c.objects.link(sun)
    sun.data.energy = 3.5; sun.rotation_euler = Euler((math.radians(50), math.radians(10), math.radians(-35)))
    sc.camera = cam
    w = bpy.data.worlds.get('rl_world') or bpy.data.worlds.new('rl_world'); sc.world = w
    try: w.use_nodes = True
    except Exception: pass
    bg = next((n for n in w.node_tree.nodes if n.type == 'BACKGROUND'), None) or w.node_tree.nodes.new('ShaderNodeBackground')
    wo = next((n for n in w.node_tree.nodes if n.type == 'OUTPUT_WORLD'), None) or w.node_tree.nodes.new('ShaderNodeOutputWorld')
    if not bg.outputs[0].links: w.node_tree.links.new(bg.outputs[0], wo.inputs[0])
    bg = bg; bg.inputs[0].default_value = (0.62, 0.72, 0.8, 1); bg.inputs[1].default_value = 0.8
    try: sc.render.engine = 'BLENDER_EEVEE_NEXT'
    except Exception: sc.render.engine = 'BLENDER_EEVEE'
    try: sc.eevee.taa_render_samples = samples
    except Exception: pass
    sc.render.resolution_x = 1600; sc.render.resolution_y = 900; sc.render.resolution_percentage = pct
    sc.view_settings.view_transform = 'AgX'
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True, scene=sc.name)
    return path

# ── export: every base and part, split by material slot, in three.js axes (Y-up, facing +Z)
def _to3(v): return (v.x, v.z, -v.y)

def mw(o):
    """world matrix from the parent chain (the library lives in its own scene, whose matrix_world may be stale)"""
    m = o.matrix_basis.copy(); p = o.parent
    while p: m = p.matrix_basis @ m; p = p.parent
    return m

import re
_SPIN = re.compile(r'^(rotor\d+|prop)$')
def _spinner(o):
    while o:
        if _SPIN.match(o.name): return o
        o = o.parent
    return None

def _dg():
    sc = bpy.data.scenes.get('robolab')
    dg = sc.view_layers[0].depsgraph
    dg.update()
    return dg

def _mesh_slots(o, rel):
    """triangles of one object's evaluated mesh, grouped by slot, positions in the frame `rel` (a Matrix)"""
    dg = _dg(); ev = o.evaluated_get(dg); me = ev.to_mesh()
    me.calc_loop_triangles()
    M = rel @ mw(o); N = M.to_3x3().inverted().transposed()
    try: cn = me.corner_normals
    except Exception: cn = None
    out = {}
    for t in me.loop_triangles:
        sl = me.materials[t.material_index].name[3:] if me.materials else 'body'
        S = out.setdefault(sl, {'p': [], 'n': []})
        for li in t.loops:   # the axis swap is a rotation: the winding stays
            v = me.vertices[me.loops[li].vertex_index].co
            n = cn[li].vector if cn is not None else (t.normal if not t.use_smooth else me.vertices[me.loops[li].vertex_index].normal)
            p = M @ v; nn = (N @ n).normalized()
            S['p'] += [round(c, 4) for c in _to3(p)]; S['n'] += [round(c, 3) for c in _to3(nn)]
    ev.to_mesh_clear()
    return out

def _gather(root, name_filter=None):
    rel = mw(root).inverted()
    meshes = {}
    for o in [root] + list(root.children_recursive):
        if o.type != 'MESH': continue
        if _spinner(o): continue   # spinning parts keep their own pivot (exported apart)
        for sl, S in _mesh_slots(o, rel).items():
            T = meshes.setdefault(sl, {'p': [], 'n': []}); T['p'] += S['p']; T['n'] += S['n']
    return meshes

def rl_export(path):
    data = {'bases': {}, 'parts': {}, 'winding': 'ccw'}
    for k in BASES:
        B = bpy.data.objects['base_' + k]
        rel = mw(B).inverted()
        spin = {}
        for o in B.children_recursive:
            if o.type == 'MESH' and _SPIN.match(o.name):
                piv = rel @ mw(o)
                own = {}
                for sub in [o] + list(o.children_recursive):
                    for sl, S in _mesh_slots(sub, mw(o).inverted()).items():
                        T = own.setdefault(sl, {'p': [], 'n': []}); T['p'] += S['p']; T['n'] += S['n']
                loc = piv.to_translation(); q = piv.to_euler('XYZ')
                spin[o.name] = {'at': [round(c, 4) for c in _to3(loc)], 'rot': [round(q.x, 4), round(q.z, 4), round(-q.y, 4)], 'slots': own}
        socks = {}
        for e in B.children:
            if e.type == 'EMPTY' and e.name.startswith('S:'):
                m = rel @ mw(e); loc = m.to_translation(); q = m.to_euler('XYZ')
                socks[e.name.split(':')[-1]] = {'at': [round(c, 4) for c in _to3(loc)], 'yaw': round(q.z, 4)}
        data['bases'][k] = {'slots': _gather(B), 'spin': spin, 'sockets': socks}
    for k in PARTS:
        P = bpy.data.objects['part_' + k]
        data['parts'][k] = {'slots': _gather(P)}
    os.makedirs(os.path.dirname(path), exist_ok=True)
    json.dump(data, open(path, 'w'), separators=(',', ':'))
    return {'path': path, 'bytes': os.path.getsize(path)}
