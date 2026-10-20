# frames.py – ornate album-card frames and the patent certificate, rendered in Blender (Cycles, transparent film).
# Exec into its own namespace on the owner's PC (Blender 5.x). Writes <ROOT>/frames/<id>.png (square, transparent centre,
# for CSS border-image 9-slice: ornaments only in the corners, inside 22% of the side; the straight edges are a
# continuous moulding) and <ROOT>/frames/patent-frame.png (a certificate: aged paper, brass corners, wax seal, ribbon).
#   frame_job(id, size=1024, samples=48)   one async render (INVOKE_DEFAULT, half the cores)
#   frames_all(ids=None)                   a gentle queue, one after the other
# No cross shapes anywhere: rosettes have 5 or 6 petals, gears many teeth, scrolls run along the diagonal.
import bpy, math, os, random, time
from mathutils import Vector, Matrix

ROOT = globals().get('ROOT') or r'C:\Users\avifl\Documents\reshet-hachaim-blender'
OUT = os.path.join(ROOT, 'frames'); os.makedirs(OUT, exist_ok=True)
TAU = math.tau
H = 1.0                 # the frame spans -H..H
SL = 0.44               # 22% of the side (2H) is the slice: everything ornamental lives inside |x|,|y| > H - SL

def scene():
    sc = bpy.data.scenes.get('frames') or bpy.data.scenes.new('frames')
    for o in list(sc.collection.objects): bpy.data.objects.remove(o, do_unlink=True)
    for c in list(sc.collection.children): sc.collection.children.unlink(c)
    r = sc.render; r.engine = 'CYCLES'; sc.cycles.device = 'CPU'
    sc.cycles.samples = 48; sc.cycles.use_adaptive_sampling = True; sc.cycles.use_denoising = True
    r.film_transparent = True; r.threads_mode = 'FIXED'; r.threads = max(1, (os.cpu_count() or 4) // 2)
    r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGBA'
    try: sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
    except Exception: pass
    sc.view_settings.exposure = 0.0
    w = bpy.data.worlds.get('frames_w') or bpy.data.worlds.new('frames_w'); sc.world = w; w.use_nodes = True
    nt = w.node_tree; nt.nodes.clear()
    o = nt.nodes.new('ShaderNodeOutputWorld'); bg = nt.nodes.new('ShaderNodeBackground')
    sky = nt.nodes.new('ShaderNodeTexGradient'); tc = nt.nodes.new('ShaderNodeTexCoord'); ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (0.10, 0.09, 0.08, 1); ramp.color_ramp.elements[1].color = (0.95, 0.92, 0.85, 1)
    mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Rotation'].default_value = (0, math.radians(-90), 0)
    nt.links.new(tc.outputs['Generated'], mp.inputs['Vector']); nt.links.new(mp.outputs[0], sky.inputs[0])
    nt.links.new(sky.outputs['Fac'], ramp.inputs[0]); nt.links.new(ramp.outputs[0], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = 0.9; nt.links.new(bg.outputs[0], o.inputs[0])
    return sc

def link(sc, ob): sc.collection.objects.link(ob); return ob

# ── materials
def mat_metal(name, base, rough=0.28, aniso=0.0, tarnish=0.25):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); p = nt.nodes.new('ShaderNodeBsdfPrincipled')
    p.inputs['Metallic'].default_value = 1.0; p.inputs['Roughness'].default_value = rough
    noise = nt.nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 18; noise.inputs['Detail'].default_value = 6
    ao = nt.nodes.new('ShaderNodeAmbientOcclusion'); ao.inputs['Distance'].default_value = 0.04
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'
    dark = tuple(c * (1 - tarnish) * 0.55 for c in base[:3]) + (1,)
    rmp = nt.nodes.new('ShaderNodeValToRGB'); rmp.color_ramp.elements[0].color = dark; rmp.color_ramp.elements[1].color = base
    nt.links.new(ao.outputs['AO'], rmp.inputs[0])
    mix.inputs['Factor'].default_value = 0.35
    nt.links.new(rmp.outputs[0], mix.inputs['A']); nt.links.new(noise.outputs['Color'], mix.inputs['B'])
    nt.links.new(mix.outputs['Result'], p.inputs['Base Color'])
    rr = nt.nodes.new('ShaderNodeMapRange'); rr.inputs['To Min'].default_value = rough * 0.7; rr.inputs['To Max'].default_value = rough * 1.5
    nt.links.new(noise.outputs['Fac'], rr.inputs[0]); nt.links.new(rr.outputs[0], p.inputs['Roughness'])
    nt.links.new(p.outputs[0], out.inputs[0]); return m

def mat_plain(name, col, rough=0.5, metal=0.0, sss=0.0, emit=None):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); p = nt.nodes.new('ShaderNodeBsdfPrincipled'); nt.links.new(p.outputs[0], out.inputs[0])
    p.inputs['Base Color'].default_value = col; p.inputs['Roughness'].default_value = rough; p.inputs['Metallic'].default_value = metal
    if sss:
        try: p.inputs['Subsurface Weight'].default_value = sss; p.inputs['Subsurface Radius'].default_value = (0.2, 0.1, 0.05)
        except Exception: pass
    return m

def mat_paper(name='paper'):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); p = nt.nodes.new('ShaderNodeBsdfPrincipled'); p.inputs['Roughness'].default_value = 0.85
    tc = nt.nodes.new('ShaderNodeTexCoord')
    n1 = nt.nodes.new('ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = 3.5; n1.inputs['Detail'].default_value = 8
    n2 = nt.nodes.new('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = 60; n2.inputs['Detail'].default_value = 4
    grad = nt.nodes.new('ShaderNodeTexGradient'); grad.gradient_type = 'SPHERICAL'
    mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (0.62, 0.5, 1)
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector']); nt.links.new(mp.outputs[0], grad.inputs[0])
    nt.links.new(tc.outputs['Object'], n1.inputs['Vector']); nt.links.new(tc.outputs['Object'], n2.inputs['Vector'])
    r1 = nt.nodes.new('ShaderNodeValToRGB'); r1.color_ramp.elements[0].color = (0.78, 0.62, 0.40, 1); r1.color_ramp.elements[1].color = (0.90, 0.80, 0.60, 1)
    r1.color_ramp.elements[0].position = 0.05; r1.color_ramp.elements[1].position = 0.55
    nt.links.new(grad.outputs['Fac'], r1.inputs[0])
    mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs['Factor'].default_value = 0.22
    nt.links.new(r1.outputs[0], mx.inputs['A']); nt.links.new(n1.outputs['Color'], mx.inputs['B'])
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.08
    nt.links.new(n2.outputs['Fac'], bump.inputs['Height']); nt.links.new(bump.outputs[0], p.inputs['Normal'])
    nt.links.new(mx.outputs['Result'], p.inputs['Base Color']); nt.links.new(p.outputs[0], out.inputs[0]); return m

# ── geometry helpers
def curve_obj(sc, name, splines, depth=0.02, res=6, mat=None, closed=True, z=0.0, taper=None, extrude=0.0, fill=False):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D' if not fill else '2D'
    cu.bevel_depth = depth; cu.bevel_resolution = res; cu.resolution_u = 24; cu.extrude = extrude
    if fill: cu.fill_mode = 'BOTH'
    for pts in splines:
        sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
        for i, p in enumerate(pts): sp.points[i].co = (p[0], p[1], (p[2] if len(p) > 2 else 0.0) + z, 1)
        sp.use_cyclic_u = closed
        if taper is not None:
            for i, p in enumerate(sp.points): p.radius = taper(i / max(1, len(pts) - 1))
    ob = bpy.data.objects.new(name, cu)
    if mat: cu.materials.append(mat)
    return link(sc, ob)

def rect(a):   # a closed square path at half-size a
    return [(-a, -a), (a, -a), (a, a), (-a, a)]

def spiral(cx, cy, r0, turns, ang0, sgn=1, n=90, shrink=0.75):
    pts = []
    for i in range(n + 1):
        t = i / n; a = ang0 + sgn * t * turns * TAU; r = r0 * (1 - shrink * t)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts

def moulding(sc, mat, mat2=None, inset=0.10, width=0.22, beads=True):
    # continuous straight-edge moulding: an outer bead, a flat band, an inner bead (the opening is |x| < H - inset - width)
    a_out = H - inset; a_in = H - inset - width
    curve_obj(sc, 'm_outer', [rect(a_out)], depth=0.030, mat=mat, z=0.03)
    band = []
    n = 6
    for k in range(n):
        a = a_out - (k + 0.5) * (width / n)
        band.append(rect(a))
    curve_obj(sc, 'm_band', band, depth=width / n * 0.62, res=3, mat=mat2 or mat, z=0.0)
    curve_obj(sc, 'm_inner', [rect(a_in)], depth=0.022, mat=mat, z=0.03)
    if beads:
        curve_obj(sc, 'm_fine', [rect(a_in + 0.035), rect(a_out - 0.035)], depth=0.008, mat=mat, z=0.045)
    return a_out, a_in

def gear(sc, name, cx, cy, r, teeth, mat, z=0.06, depth=0.02):
    pts = []
    for i in range(teeth * 4):
        a = i / (teeth * 4) * TAU; k = i % 4
        rr = r if k in (0, 1) else r * 0.82
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    ob = curve_obj(sc, name, [pts], depth=0.004, res=2, mat=mat, z=z, extrude=depth, fill=True)
    hub = curve_obj(sc, name + '_h', [[(cx + r * 0.42 * math.cos(a), cy + r * 0.42 * math.sin(a)) for a in [i / 40 * TAU for i in range(40)]]], depth=r * 0.09, mat=mat, z=z + depth + 0.01)
    return [ob, hub]

def rosette(sc, name, cx, cy, r, petals, mat, z=0.07):
    obs = []
    for i in range(petals):
        a = TAU * i / petals + TAU / (petals * 4)
        pts = []
        for j in range(25):
            t = j / 24 * TAU; px = 0.5 * r * (1 + math.cos(t)); py = 0.22 * r * math.sin(t) * (0.6 + 0.4 * math.cos(t))
            pts.append((cx + px * math.cos(a) - py * math.sin(a), cy + px * math.sin(a) + py * math.cos(a)))
        obs.append(curve_obj(sc, f'{name}_p{i}', [pts], depth=r * 0.06, mat=mat, z=z))
    b = bpy.data.meshes.new(name + '_c'); ob = bpy.data.objects.new(name + '_c', b); link(sc, ob)
    import bmesh; bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=12, radius=r * 0.2); bm.to_mesh(b); bm.free()
    ob.location = (cx, cy, z + 0.02); ob.scale = (1, 1, 0.6); b.materials.append(mat)
    for p in b.polygons: p.use_smooth = True
    obs.append(ob); return obs

def sphere(sc, name, loc, r, mat, sz=1.0):
    import bmesh
    me = bpy.data.meshes.new(name); ob = bpy.data.objects.new(name, me); link(sc, ob)
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=10, radius=r); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    ob.location = loc; ob.scale = (1, 1, sz); me.materials.append(mat); return ob

def leaf(sc, name, base, ang, length, width, mat, z=0.06, lobes=0, curl=0.0):
    pts = []; n = 40
    for i in range(n + 1):
        t = i / n
        w = width * math.sin(math.pi * t) ** 0.8
        if lobes: w *= 0.75 + 0.25 * abs(math.sin(lobes * math.pi * t))
        pts.append((t * length, w))
    for i in range(n, -1, -1):
        t = i / n
        w = width * math.sin(math.pi * t) ** 0.8
        if lobes: w *= 0.75 + 0.25 * abs(math.sin(lobes * math.pi * t))
        pts.append((t * length, -w))
    c, s = math.cos(ang), math.sin(ang)
    P = [(base[0] + x * c - y * s, base[1] + x * s + y * c, curl * math.sin(math.pi * x / length) * 0.5) for x, y in pts]
    ob = curve_obj(sc, name, [P], depth=0.0035, res=2, mat=mat, z=z, extrude=0.006, fill=True)
    vein = curve_obj(sc, name + '_v', [[(base[0] + t * length * c, base[1] + t * length * s, curl * math.sin(math.pi * t) * 0.5 + 0.012) for t in (0, 0.3, 0.6, 0.9)]], depth=0.004, mat=mat, z=z, closed=False)
    return [ob, vein]

def fit_corner(obs, reach=0.43):
    # keep every corner ornament inside the 9-slice corner: scale the group about the corner point (-H, -H)
    bpy.context.view_layer.update()
    mx = -H
    for o in obs:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c); mx = max(mx, w.x, w.y)
    ext = mx + H
    if ext > reach:
        k = reach / ext; M = Matrix.Translation((-H, -H, 0)) @ Matrix.Diagonal((k, k, 1, 1)) @ Matrix.Translation((H, H, 0))
        for o in obs: o.matrix_world = M @ o.matrix_world
        bpy.context.view_layer.update()

def mirror_corners(sc, obs):
    fit_corner(obs)
    for sx, sy in ((-1, 1), (1, -1), (-1, -1)):
        for o in obs:
            c = o.copy(); c.data = o.data.copy(); link(sc, c)
            c.matrix_world = Matrix.Diagonal((sx, sy, 1, 1)) @ o.matrix_world

def lights_cam(sc, size, aspect=1.0):
    cd = bpy.data.cameras.new('fcam'); cd.type = 'ORTHO'; cd.ortho_scale = 2.0 * H * max(1, aspect) + 0.0
    cam = link(sc, bpy.data.objects.new('fcam', cd)); cam.location = (0, 0, 5); sc.camera = cam
    sc.render.resolution_x = int(size); sc.render.resolution_y = int(size * aspect)
    def area(name, loc, energy, s, col=(1, 0.96, 0.9)):
        ld = bpy.data.lights.new(name, 'AREA'); ld.energy = energy; ld.size = s; ld.color = col
        ob = link(sc, bpy.data.objects.new(name, ld)); ob.location = loc
        ob.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); return ob
    area('key', (-3.0, 3.2, 4.0), 900, 2.5)
    area('fill', (3.5, -1.5, 3.0), 260, 3.0, (0.85, 0.9, 1.0))
    area('rim', (0.5, -4, 1.2), 200, 2.0)
    # a shadow catcher just under the frame: soft drop shadows land in the alpha
    me = bpy.data.meshes.new('catch'); me.from_pydata([(-4, -4, -0.02), (4, -4, -0.02), (4, 4, -0.02), (-4, 4, -0.02)], [], [(0, 1, 2, 3)])
    ob = link(sc, bpy.data.objects.new('catch', me))
    try: ob.is_shadow_catcher = True
    except Exception: pass

# ── the frames
COL = {
    'brass': (0.80, 0.58, 0.24, 1), 'gold': (0.95, 0.72, 0.30, 1), 'silver': (0.82, 0.84, 0.86, 1), 'bronze': (0.62, 0.38, 0.20, 1),
}

CX = -H + 0.21          # the corner piece's centre, inside the slice

def ring(cx, cy, r, n=64): return [(cx + r * math.cos(a), cy + r * math.sin(a)) for a in [i / n * TAU for i in range(n)]]

def f_brass(sc):
    br = mat_metal('brass', COL['brass'], 0.24); dk = mat_metal('brass_dk', (0.55, 0.38, 0.14, 1), 0.36, tarnish=0.4)
    glass = mat_plain('glass_tint', (0.62, 0.80, 0.84, 1), 0.04)
    moulding(sc, br, dk, inset=0.06, width=0.18)
    c = CX; obs = []
    obs += gear(sc, 'g1', c, c, 0.20, 22, dk, z=0.05, depth=0.03)
    obs.append(curve_obj(sc, 'bezel', [ring(c, c, 0.125)], depth=0.024, mat=br, z=0.1))
    obs.append(sphere(sc, 'lensg', (c, c, 0.1), 0.11, glass, 0.16))
    obs += gear(sc, 'g2', c + 0.27, c - 0.06, 0.085, 13, br, z=0.06)
    obs += gear(sc, 'g3', c - 0.06, c + 0.27, 0.085, 13, br, z=0.06)
    obs.append(curve_obj(sc, 'arm1', [spiral(c + 0.17, c + 0.13, 0.06, 1.2, math.pi, -1)], depth=0.014, mat=br, z=0.08, closed=False))
    obs.append(curve_obj(sc, 'arm2', [spiral(c + 0.13, c + 0.17, 0.06, 1.2, -math.pi / 2, 1)], depth=0.014, mat=br, z=0.08, closed=False))
    for k in range(10):
        a = TAU * k / 10; obs.append(sphere(sc, 'rv', (c + 0.165 * math.cos(a), c + 0.165 * math.sin(a), 0.09), 0.012, br, 0.6))
    mirror_corners(sc, obs)

def f_gold(sc):
    au = mat_metal('gold', COL['gold'], 0.18, tarnish=0.12); dk = mat_metal('gold_dk', (0.70, 0.48, 0.16, 1), 0.3)
    gem = mat_plain('gem', (0.70, 0.08, 0.16, 1), 0.04)
    moulding(sc, au, dk, inset=0.06, width=0.18)
    c = CX; obs = []
    obs += rosette(sc, 'ros', c, c, 0.21, 6, au)
    obs.append(curve_obj(sc, 'rring', [ring(c, c, 0.115)], depth=0.016, mat=dk, z=0.1))
    obs.append(sphere(sc, 'gem', (c, c, 0.12), 0.06, gem, 0.55))
    for k in (0, 1):
        ang = 0.0 if k == 0 else math.pi / 2
        bx, by = (c + 0.10, c - 0.02) if k == 0 else (c - 0.02, c + 0.10)
        obs += leaf(sc, f'acl{k}', (bx, by), ang, 0.32, 0.075, au, lobes=4, curl=0.05, z=0.07)
        sx, sy = (c + 0.30, c + 0.07) if k == 0 else (c + 0.07, c + 0.30)
        obs.append(curve_obj(sc, f'acs{k}', [spiral(sx, sy, 0.065, 1.3, math.pi if k == 0 else -math.pi / 2, -1 if k == 0 else 1)], depth=0.013, mat=au, z=0.08, closed=False))
    mirror_corners(sc, obs)

def f_silver(sc):
    ag = mat_metal('silver', COL['silver'], 0.2, tarnish=0.2); dk = mat_metal('silver_dk', (0.50, 0.54, 0.58, 1), 0.33)
    glass = mat_plain('glass_tint2', (0.70, 0.86, 0.90, 1), 0.04); leafm = mat_plain('sleaf', (0.36, 0.55, 0.30, 1), 0.5, sss=0.1)
    moulding(sc, ag, dk, inset=0.06, width=0.18)
    c = CX + 0.03; obs = []
    # a magnifying glass lying diagonally, its handle pointing out to the corner, over a sprig of leaves
    obs.append(curve_obj(sc, 'mag', [ring(c, c, 0.14)], depth=0.03, mat=ag, z=0.1))
    obs.append(sphere(sc, 'magg', (c, c, 0.1), 0.125, glass, 0.12))
    obs.append(curve_obj(sc, 'handle', [[(c - 0.13, c - 0.13), (c - 0.26, c - 0.26)]], depth=0.032, mat=dk, z=0.09, closed=False))
    obs += leaf(sc, 'sl1', (c + 0.05, c - 0.06), 0.05, 0.3, 0.07, leafm, curl=0.04, z=0.06)
    obs += leaf(sc, 'sl2', (c - 0.06, c + 0.05), math.pi / 2 - 0.05, 0.3, 0.07, leafm, curl=0.04, z=0.06)
    obs += leaf(sc, 'sl3', (c + 0.06, c + 0.06), math.pi / 4, 0.18, 0.055, leafm, curl=0.04, z=0.06)
    mirror_corners(sc, obs)

def f_oak(sc):
    wood = mat_plain('wood', (0.36, 0.20, 0.09, 1), 0.42); wood2 = mat_plain('wood2', (0.52, 0.31, 0.14, 1), 0.5)
    leafm = mat_plain('oakleaf', (0.33, 0.47, 0.15, 1), 0.55, sss=0.1); leaf2 = mat_plain('oakleaf2', (0.52, 0.56, 0.20, 1), 0.55, sss=0.1)
    acorn = mat_plain('acorn', (0.58, 0.35, 0.12, 1), 0.3); cup = mat_plain('cup', (0.40, 0.30, 0.16, 1), 0.85)
    moulding(sc, wood2, wood, inset=0.06, width=0.18)
    c = CX; obs = []
    for k, (a, L, m) in enumerate(((0.12, 0.40, leafm), (1.45, 0.40, leafm), (0.78, 0.34, leaf2))):
        obs += leaf(sc, f'ol{k}', (c - 0.13, c - 0.13), a, L, 0.11, m, lobes=4, curl=0.06, z=0.06)
    for k, (dx, dy) in enumerate(((0.02, 0.13), (0.13, 0.02), (0.09, 0.09))):
        obs.append(sphere(sc, f'ac{k}', (c + dx, c + dy, 0.11), 0.055, acorn, 1.2))
        obs.append(sphere(sc, f'cp{k}', (c + dx - 0.035, c + dy - 0.035, 0.12), 0.045, cup, 0.8))
    mirror_corners(sc, obs)

def f_leaf(sc):
    wood = mat_plain('bamboo', (0.55, 0.45, 0.20, 1), 0.4); dk = mat_plain('bamboo_dk', (0.30, 0.25, 0.10, 1), 0.5)
    g1 = mat_plain('jleaf', (0.08, 0.40, 0.17, 1), 0.45, sss=0.15); g2 = mat_plain('jleaf2', (0.22, 0.56, 0.20, 1), 0.45, sss=0.15)
    flower = mat_plain('flower', (0.94, 0.30, 0.44, 1), 0.4, sss=0.2); fcen = mat_plain('fcen', (0.98, 0.82, 0.25, 1), 0.4)
    moulding(sc, wood, dk, inset=0.06, width=0.18)
    c = CX; obs = []
    obs += leaf(sc, 'jl1', (c - 0.16, c - 0.12), 0.10, 0.46, 0.12, g1, curl=0.08, z=0.06)
    obs += leaf(sc, 'jl2', (c - 0.12, c - 0.16), 1.47, 0.46, 0.12, g1, curl=0.08, z=0.06)
    obs += leaf(sc, 'jl3', (c - 0.12, c - 0.12), 0.78, 0.36, 0.13, g2, curl=0.1, z=0.07)
    for i in range(5):
        a = TAU * i / 5 + 0.3
        obs.append(sphere(sc, f'fp{i}', (c + 0.06 + 0.05 * math.cos(a), c + 0.06 + 0.05 * math.sin(a), 0.13), 0.042, flower, 0.4))
    obs.append(sphere(sc, 'fc', (c + 0.06, c + 0.06, 0.14), 0.024, fcen, 0.6))
    mirror_corners(sc, obs)

def f_coral(sc):
    sand = mat_plain('reefwood', (0.86, 0.74, 0.55, 1), 0.6); dk = mat_plain('reefdk', (0.58, 0.46, 0.32, 1), 0.7)
    coral = mat_plain('coralm', (0.96, 0.42, 0.36, 1), 0.5, sss=0.25); coral2 = mat_plain('coralm2', (0.60, 0.40, 0.80, 1), 0.5, sss=0.25)
    shell = mat_plain('shellm', (0.98, 0.88, 0.78, 1), 0.3, sss=0.1)
    moulding(sc, sand, dk, inset=0.06, width=0.18)
    c = CX; obs = []
    random.seed(4)
    def branch(x, y, a, L, r, d, m):
        if d == 0 or L < 0.03: return
        x2, y2 = x + L * math.cos(a), y + L * math.sin(a)
        obs.append(curve_obj(sc, 'cb', [[(x, y), (x2, y2)]], depth=r, res=4, mat=m, z=0.07, closed=False))
        obs.append(sphere(sc, 'ct', (x2, y2, 0.07), r * 1.05, m))
        for s_ in (-0.5, 0.45):
            branch(x2, y2, a + s_ + random.uniform(-0.15, 0.15), L * 0.74, r * 0.8, d - 1, m)
    branch(c - 0.14, c - 0.14, math.pi / 4, 0.16, 0.03, 4, coral)
    branch(c - 0.16, c - 0.10, 0.25, 0.12, 0.022, 3, coral2)
    obs.append(curve_obj(sc, 'shell', [spiral(c + 0.22, c - 0.06, 0.075, 2.3, 0.0, 1, n=140, shrink=0.9)], depth=0.018, mat=shell, z=0.08, closed=False, taper=lambda t: 1.4 - t))
    obs.append(curve_obj(sc, 'shell2', [spiral(c - 0.06, c + 0.22, 0.06, 2.3, 1.0, -1, n=140, shrink=0.9)], depth=0.015, mat=shell, z=0.08, closed=False, taper=lambda t: 1.4 - t))
    mirror_corners(sc, obs)

def f_deep(sc):
    m = mat_metal('deepm', (0.30, 0.45, 0.58, 1), 0.24, tarnish=0.3); dk = mat_metal('deepdk', (0.12, 0.22, 0.32, 1), 0.34)
    pearl = mat_plain('pearl', (0.96, 0.95, 0.99, 1), 0.12, sss=0.3); shellm = mat_plain('fanshell', (0.92, 0.80, 0.70, 1), 0.35, sss=0.1)
    moulding(sc, m, dk, inset=0.06, width=0.18)
    c = CX; obs = []
    fan = []
    for i in range(11):
        a = math.radians(-8 + i * 10.6) ; fan.append([(c - 0.1, c - 0.1), (c - 0.1 + 0.33 * math.cos(a), c - 0.1 + 0.33 * math.sin(a))])
    obs.append(curve_obj(sc, 'fan', fan, depth=0.018, mat=shellm, z=0.06, closed=False))
    arc = [(c - 0.1 + 0.33 * math.cos(math.radians(a)), c - 0.1 + 0.33 * math.sin(math.radians(a))) for a in range(-8, 99, 4)]
    obs.append(curve_obj(sc, 'fanrim', [arc], depth=0.016, mat=shellm, z=0.07, closed=False))
    obs.append(sphere(sc, 'pearl', (c, c, 0.12), 0.07, pearl))
    obs.append(curve_obj(sc, 'wave1', [spiral(c + 0.26, c + 0.06, 0.07, 1.4, math.pi, -1)], depth=0.014, mat=m, z=0.08, closed=False))
    obs.append(curve_obj(sc, 'wave2', [spiral(c + 0.06, c + 0.26, 0.07, 1.4, -math.pi / 2, 1)], depth=0.014, mat=m, z=0.08, closed=False))
    mirror_corners(sc, obs)

def f_sources(sc):
    # an old parchment and olive-wood frame: at each corner a rolled parchment end (a spiral seen end-on), a round
    # wooden knob and a sprig of olive leaves. Nothing crosses: no rods meeting at right angles.
    wood = mat_plain('scrollwood', (0.40, 0.24, 0.11, 1), 0.38); parch = mat_paper('parch')
    olive = mat_plain('olive', (0.42, 0.50, 0.30, 1), 0.5, sss=0.1); fruit = mat_plain('olivefruit', (0.25, 0.22, 0.12, 1), 0.3)
    gold = mat_metal('gold2', COL['gold'], 0.22)
    moulding(sc, wood, parch, inset=0.06, width=0.18)
    c = CX; obs = []
    obs.append(curve_obj(sc, 'roll', [spiral(c, c, 0.16, 2.6, 0.6, 1, n=200, shrink=0.88)], depth=0.02, mat=parch, z=0.07, closed=False))
    obs.append(sphere(sc, 'knob', (c, c, 0.11), 0.05, wood, 0.8))
    obs.append(curve_obj(sc, 'knring', [ring(c, c, 0.06)], depth=0.008, mat=gold, z=0.13))
    obs += leaf(sc, 'ol1', (c + 0.1, c - 0.05), 0.15, 0.22, 0.045, olive, curl=0.03, z=0.07)
    obs += leaf(sc, 'ol2', (c + 0.17, c - 0.02), -0.35, 0.18, 0.04, olive, curl=0.03, z=0.07)
    obs += leaf(sc, 'ol3', (c - 0.05, c + 0.1), math.pi / 2 - 0.15, 0.22, 0.045, olive, curl=0.03, z=0.07)
    obs += leaf(sc, 'ol4', (c - 0.02, c + 0.17), math.pi / 2 + 0.35, 0.18, 0.04, olive, curl=0.03, z=0.07)
    obs.append(sphere(sc, 'of1', (c + 0.2, c + 0.05, 0.09), 0.026, fruit, 1.3))
    obs.append(sphere(sc, 'of2', (c + 0.05, c + 0.2, 0.09), 0.026, fruit, 1.3))
    mirror_corners(sc, obs)

def f_patent(sc):
    # a portrait certificate (3:4): aged paper sheet, brass corner pieces, a thin double rule, a wax seal and a ribbon
    paper = mat_paper('paper'); br = mat_metal('pbrass', COL['brass'], 0.25)
    wax = mat_plain('wax', (0.62, 0.06, 0.08, 1), 0.25, sss=0.2); rib = mat_plain('ribbon', (0.14, 0.32, 0.55, 1), 0.45)
    W, Hh = 0.75, 1.0
    me = bpy.data.meshes.new('sheet'); me.from_pydata([(-W, -Hh, 0), (W, -Hh, 0), (W, Hh, 0), (-W, Hh, 0)], [], [(0, 1, 2, 3)])
    sh = link(sc, bpy.data.objects.new('sheet', me)); me.materials.append(paper)
    sub = sh.modifiers.new('sub', 'SUBSURF'); sub.subdivision_type = 'SIMPLE'; sub.levels = 5; sub.render_levels = 5
    tex = bpy.data.textures.new('wav', 'CLOUDS'); tex.noise_scale = 0.6
    dsp = sh.modifiers.new('d', 'DISPLACE'); dsp.texture = tex; dsp.strength = 0.012
    rule = lambda a, b: [(-a, -b), (a, -b), (a, b), (-a, b)]
    ink = mat_plain('ink', (0.36, 0.25, 0.12, 1), 0.7)
    curve_obj(sc, 'rule1', [rule(W - 0.06, Hh - 0.06)], depth=0.005, mat=ink, z=0.012)
    curve_obj(sc, 'rule2', [rule(W - 0.085, Hh - 0.085)], depth=0.0025, mat=ink, z=0.012)
    obs = []
    cx, cy = -W + 0.02, -Hh + 0.02
    pts = [(cx, cy), (cx + 0.22, cy), (cx + 0.22, cy + 0.035), (cx + 0.035, cy + 0.035), (cx + 0.035, cy + 0.22), (cx, cy + 0.22)]
    obs.append(curve_obj(sc, 'pc', [pts], depth=0.004, res=2, mat=br, z=0.015, extrude=0.01, fill=True))
    obs.append(curve_obj(sc, 'pcs', [spiral(cx + 0.11, cy + 0.11, 0.05, 1.2, math.pi * 1.25, -1)], depth=0.008, mat=br, z=0.03, closed=False))
    obs.append(sphere(sc, 'pr', (cx + 0.02, cy + 0.02, 0.03), 0.016, br, 0.6))
    bpy.context.view_layer.update()
    for sx, sy in ((-1, 1), (1, -1), (-1, -1)):
        for o in obs:
            c = o.copy(); c.data = o.data.copy(); link(sc, c); c.matrix_world = Matrix.Diagonal((sx, sy, 1, 1)) @ o.matrix_world
    # ribbon tails and the seal, bottom left-of-centre
    sx0, sy0 = -0.42, -0.70
    for k, a in enumerate((-1.95, -1.25)):
        L = 0.30; w = 0.05
        p0 = (sx0, sy0); p1 = (sx0 + L * math.cos(a), sy0 + L * math.sin(a))
        nx, ny = -math.sin(a) * w, math.cos(a) * w
        pts = [(p0[0] + nx, p0[1] + ny), (p1[0] + nx, p1[1] + ny), (p1[0] + 0.3 * nx + 0.02 * math.cos(a), p1[1] + 0.3 * ny + 0.02 * math.sin(a)), (p1[0] - nx, p1[1] - ny), (p0[0] - nx, p0[1] - ny)]
        curve_obj(sc, f'rib{k}', [pts], depth=0.002, res=1, mat=rib, z=0.02, extrude=0.004, fill=True)
    seal = []
    for i in range(36):
        a = TAU * i / 36; r = 0.15 * (1 + 0.06 * math.sin(7 * a) + 0.03 * math.sin(13 * a))
        seal.append((sx0 + r * math.cos(a), sy0 + r * math.sin(a)))
    curve_obj(sc, 'seal', [seal], depth=0.01, res=3, mat=wax, z=0.03, extrude=0.012, fill=True)
    curve_obj(sc, 'sealring', [[(sx0 + 0.10 * math.cos(a), sy0 + 0.10 * math.sin(a)) for a in [i / 40 * TAU for i in range(40)]]], depth=0.006, mat=wax, z=0.055)
    leaf(sc, 'sealleaf', (sx0 - 0.05, sy0 - 0.04), 0.9, 0.12, 0.034, wax, z=0.07)
    return (W, Hh)

FRAMES = {'brass': f_brass, 'gold': f_gold, 'silver': f_silver, 'oak': f_oak, 'leaf': f_leaf, 'coral': f_coral, 'deep': f_deep, 'sources': f_sources}

def frame_job(fid, size=1024, samples=48):
    sc = scene(); sc.cycles.samples = samples
    bpy.context.window.scene = sc
    if fid == 'patent':
        W, Hh = f_patent(sc); lights_cam(sc, int(size * W / Hh), aspect=Hh / W)
        sc.camera.data.ortho_scale = 2 * Hh
        out = os.path.join(OUT, 'patent-frame.png')
    else:
        FRAMES[fid](sc); lights_cam(sc, size)
        out = os.path.join(OUT, fid + '.png')
    sc.render.filepath = out
    if os.path.exists(out): os.remove(out)
    with bpy.context.temp_override(window=bpy.context.window_manager.windows[0]):
        bpy.ops.render.render('INVOKE_DEFAULT', write_still=True)
    return {'started': fid, 'file': out}

FQ = {'list': [], 'cur': None, 'done': [], 't0': 0, 'times': []}
def _fq_tick():
    if FQ.get('stop'): return None
    if FQ['cur']:
        if bpy.app.is_job_running('RENDER') or not os.path.exists(FQ['cur']): return 3.0
        FQ['done'].append(FQ['cur']); FQ['times'].append(round(time.time() - FQ['t0'])); FQ['cur'] = None
    if not FQ['list']: return None
    fid, size, samples = FQ['list'].pop(0); FQ['t0'] = time.time()
    try: FQ['cur'] = frame_job(fid, size, samples)['file']
    except Exception as e: FQ['done'].append('error %s: %s' % (fid, e)); FQ['cur'] = None
    return 5.0

def frames_all(ids=None, size=1024, samples=48):
    FQ['list'] = [(i, size, samples) for i in (ids or list(FRAMES) + ['patent'])]; FQ['done'] = []; FQ['times'] = []; FQ['stop'] = False
    bpy.app.driver_namespace['FQ'] = FQ
    if not bpy.app.timers.is_registered(_fq_tick): bpy.app.timers.register(_fq_tick, first_interval=1.0)
    return {'queued': len(FQ['list'])}
