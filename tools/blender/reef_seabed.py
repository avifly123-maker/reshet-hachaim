# The reef's surroundings (Avi, 18.10: under the island the view was grey, and the island's side was plain rock):
#   seabed_build() + seabed_render()   a sea floor seen from straight above, 300 m across: sand ripples, sea grass
#                                      meadows, coral heads on reef rock, a fringing reef in a broken ring, and an old
#                                      wreck covered with corals. → reef/seabed_top.png (the game lays it under the island)
#   wall_build() + wall_render()       a reef wall seen from the front, tiling left to right: rock ledges with corals,
#                                      sea fans and sponges → reef/coralwall.png (wrapped round the island's base)
# The corals are the reef's own Blender models (reef/flora/*.json, the same ones the game draws).
# Run in the session (exec into its own namespace); renders are async (INVOKE_DEFAULT) on half the cores.
import bpy, math, random, json, os
import numpy as np
from mathutils import Vector, Matrix, noise

D = globals().get('D') or r'C:\Users\avifl\Documents\reshet-hachaim-blender\animals'
ROOT = os.path.dirname(D)
OUT = os.path.join(ROOT, 'reef'); os.makedirs(OUT, exist_ok=True)
TAU = math.pi * 2

def lin(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)

def _scene(name):
    sc = bpy.data.scenes.get(name)
    if sc:
        for o in list(sc.objects): bpy.data.objects.remove(o, do_unlink=True)
    else: sc = bpy.data.scenes.new(name)
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'
    sc.render.threads_mode = 'FIXED'; sc.render.threads = max(1, (os.cpu_count() or 4) // 2)
    sc.cycles.use_denoising = True
    try: sc.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception: pass
    try: sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Punchy'
    except Exception: pass
    sc.render.image_settings.file_format = 'PNG'; sc.render.film_transparent = False
    return sc

# ── materials
_M = {}
def mat(name, build):
    if name in _M and _M[name].name in bpy.data.materials: return _M[name]
    m = bpy.data.materials.new('SB_' + name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes.get('Principled BSDF')
    if b is None:   # Blender 5: a new material may come without nodes
        b = nt.nodes.new('ShaderNodeBsdfPrincipled')
        out = next((n for n in nt.nodes if n.bl_idname == 'ShaderNodeOutputMaterial'), None) or nt.nodes.new('ShaderNodeOutputMaterial')
        nt.links.new(b.outputs[0], out.inputs['Surface'])
    build(nt, b); _M[name] = m; return m

def _vcol(nt, b):
    N, L = nt.nodes, nt.links
    vc = N.new('ShaderNodeVertexColor'); vc.layer_name = 'Col'
    L.new(vc.outputs['Color'], b.inputs['Base Color']); b.inputs['Roughness'].default_value = 0.62
    try: b.inputs['Subsurface Weight'].default_value = 0.08
    except Exception: pass

def _sand(nt, b):
    N, L = nt.nodes, nt.links
    tc = N.new('ShaderNodeTexCoord')
    wv = N.new('ShaderNodeTexWave'); wv.inputs['Scale'].default_value = 0.9; wv.inputs['Distortion'].default_value = 6; wv.inputs['Detail'].default_value = 3
    L.new(tc.outputs['Object'], wv.inputs['Vector'])
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 0.05; nz.inputs['Detail'].default_value = 6
    L.new(tc.outputs['Object'], nz.inputs['Vector'])
    ramp = N.new('ShaderNodeValToRGB'); r = ramp.color_ramp
    r.elements[0].position = 0.3; r.elements[0].color = (*lin('#c9b48a'), 1)
    r.elements[1].position = 0.75; r.elements[1].color = (*lin('#efe3c2'), 1)
    L.new(nz.outputs['Fac'], ramp.inputs['Fac'])
    # caustics: a soft voronoi net of light on the sand
    vo = N.new('ShaderNodeTexVoronoi')
    try: vo.feature = 'DISTANCE_TO_EDGE'
    except Exception: pass
    vo.inputs['Scale'].default_value = 0.22
    L.new(tc.outputs['Object'], vo.inputs['Vector'])
    cr = N.new('ShaderNodeValToRGB'); c2 = cr.color_ramp
    c2.elements[0].position = 0.0; c2.elements[0].color = (1.35, 1.35, 1.25, 1); c2.elements[1].position = 0.06; c2.elements[1].color = (1, 1, 1, 1)
    L.new(vo.outputs['Distance'], cr.inputs['Fac'])
    mul = N.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs[0].default_value = 1.0
    L.new(ramp.outputs['Color'], mul.inputs[6]); L.new(cr.outputs['Color'], mul.inputs[7])
    L.new(mul.outputs[2], b.inputs['Base Color'])
    bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.35
    L.new(wv.outputs['Fac'], bump.inputs['Height']); L.new(bump.outputs['Normal'], b.inputs['Normal'])
    b.inputs['Roughness'].default_value = 0.95

def _rock(nt, b):
    N, L = nt.nodes, nt.links
    tc = N.new('ShaderNodeTexCoord')
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 0.6; nz.inputs['Detail'].default_value = 8
    L.new(tc.outputs['Object'], nz.inputs['Vector'])
    ramp = N.new('ShaderNodeValToRGB'); r = ramp.color_ramp
    r.elements[0].position = 0.35; r.elements[0].color = (*lin('#7a6a5c'), 1)
    r.elements[1].position = 0.7; r.elements[1].color = (*lin('#b89a88'), 1)
    e = r.elements.new(0.52); e.color = (*lin('#c48a8a'), 1)   # crusts of pink coralline algae
    L.new(nz.outputs['Fac'], ramp.inputs['Fac']); L.new(ramp.outputs['Color'], b.inputs['Base Color'])
    bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.6
    L.new(nz.outputs['Fac'], bump.inputs['Height']); L.new(bump.outputs['Normal'], b.inputs['Normal'])
    b.inputs['Roughness'].default_value = 0.9

def _wood(nt, b):
    N, L = nt.nodes, nt.links
    tc = N.new('ShaderNodeTexCoord'); wv = N.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.inputs['Scale'].default_value = 1.6; wv.inputs['Distortion'].default_value = 3
    L.new(tc.outputs['Object'], wv.inputs['Vector'])
    ramp = N.new('ShaderNodeValToRGB'); r = ramp.color_ramp
    r.elements[0].color = (*lin('#3a2a1e'), 1); r.elements[1].color = (*lin('#6a5a48'), 1)
    L.new(wv.outputs['Fac'], ramp.inputs['Fac']); L.new(ramp.outputs['Color'], b.inputs['Base Color'])
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 3.0
    L.new(tc.outputs['Object'], nz.inputs['Vector'])
    bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.5
    L.new(nz.outputs['Fac'], bump.inputs['Height']); L.new(bump.outputs['Normal'], b.inputs['Normal'])
    b.inputs['Roughness'].default_value = 0.85

# ── the reef's own models
_F = {}
def flora(cid, var=0):
    key = (cid, var)
    if key in _F and _F[key].name in bpy.data.meshes: return _F[key]
    d = json.load(open(os.path.join(ROOT, 'reef', 'flora', cid + '.json')))
    e = d['v'][min(var, len(d['v']) - 1)]
    p = np.array(e['p'], np.float32).reshape(-1, 3); idx = np.array(e['i'], np.int64).reshape(-1, 3)
    c = np.array(e['c'], np.float32).reshape(-1, 3) / 255.0
    me = bpy.data.meshes.new('sbf_%s_%d' % (cid, var))
    me.from_pydata(np.stack([p[:, 0], -p[:, 2], p[:, 1]], 1).tolist(), [], idx.tolist()); me.update()
    cl = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    ca = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    ca.data.foreach_set('color', np.concatenate([cl, np.ones((len(cl), 1), np.float32)], 1).ravel())
    me.shade_smooth(); me.materials.append(mat('vcol', _vcol))
    _F[key] = me; return me

def put(sc, me, loc, s, rz=0.0, rx=0.0, ry=0.0, name='o'):
    ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob)
    ob.location = loc; ob.scale = (s, s, s); ob.rotation_euler = (rx, ry, rz)
    return ob

def grid_mesh(name, w, h, nx, ny, zfn, material, plane='xy'):
    xs = np.linspace(-w / 2, w / 2, nx); ys = np.linspace(-h / 2, h / 2, ny)
    V = []
    for y in ys:
        for x in xs: V.append((x, y, zfn(x, y)) if plane == 'xy' else (x, zfn(x, y), y))
    F = [(j * nx + i, j * nx + i + 1, (j + 1) * nx + i + 1, (j + 1) * nx + i) for j in range(ny - 1) for i in range(nx - 1)]
    me = bpy.data.meshes.new(name); me.from_pydata(V, [], F); me.update(); me.shade_smooth(); me.materials.append(material)
    return me

def rock_mesh(name, r, seed, squash=0.6):
    """a rounded lump of reef rock (an icosphere pushed by noise)"""
    import bmesh
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=3, radius=r)
    off = Vector((seed * 3.1, seed * 1.7, seed * 2.3))
    for v in bm.verts:
        n = noise.noise(v.co * (1.6 / r) + off)
        v.co *= 1 + 0.32 * n
        v.co.z = v.co.z * squash if v.co.z > 0 else v.co.z * 0.25
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.shade_smooth(); me.materials.append(mat('rock', _rock))
    return me

def hull_mesh(name, L=26.0, B=7.0, H=4.0):
    """an old wooden boat lying on the sand, half buried and a little broken at the stern: no masts or crossbars"""
    import bmesh
    bm = bmesh.new(); rings = []; NS = 24; NR = 14
    for i in range(NS + 1):
        t = i / NS; x = -L / 2 + L * t
        bw = B / 2 * (max(0.0, math.sin(math.pi * min(1, t * 1.15))) ** 0.6) * (0.25 + 0.75 * (1 - abs(t - 0.45) * 0.5)); bw = max(0.15, bw)
        ring = []
        for k in range(NR + 1):
            a = math.pi * k / NR   # half a section: from one gunwale down the keel to the other
            y = -math.cos(a) * bw; z = -math.sin(a) * H * (0.6 + 0.4 * math.sin(math.pi * t)) + H * 0.55
            if t > 0.86 and k > NR * 0.55: z += (t - 0.86) * 18   # the broken stern drops away
            ring.append(bm.verts.new((x, y, z)))
        rings.append(ring)
    for i in range(NS):
        for k in range(NR): bm.faces.new((rings[i][k], rings[i + 1][k], rings[i + 1][k + 1], rings[i][k + 1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(mat('wood', _wood))
    mod_me = me
    return mod_me

def lights(sc, sun=4.5, world='#2a7fa0', ws=0.55):
    sd = bpy.data.lights.new('sb_sun', 'SUN'); sd.energy = sun; sd.angle = math.radians(6); sd.color = lin('#fff6e6')
    so = bpy.data.objects.new('sb_sun', sd); sc.collection.objects.link(so); so.rotation_euler = (math.radians(28), math.radians(14), math.radians(30))
    w = bpy.data.worlds.new('sb_world'); w.use_nodes = True
    bg = w.node_tree.nodes.get('Background') or w.node_tree.nodes.new('ShaderNodeBackground')
    out = w.node_tree.nodes.get('World Output') or w.node_tree.nodes.new('ShaderNodeOutputWorld')
    bg.inputs['Color'].default_value = (*lin(world), 1); bg.inputs['Strength'].default_value = ws
    w.node_tree.links.new(bg.outputs[0], out.inputs['Surface'])
    sc.world = w

# ═════════════════════════════════════════════ the sea floor from above
SB = {'size': 300.0}
# scale per model, so that seen from above each is about the size it has on a real reef (the models differ a lot)
SZ = {'table': (0.7, 1.15), 'brain': (0.8, 1.6), 'branching': (1.6, 3.0), 'softcoral': (2.2, 4.0), 'firecoral': (1.3, 2.4),
      'sponge': (2.0, 3.6), 'seaanemone': (0.8, 1.5), 'algae': (2.5, 4.5), 'seafan': (1.0, 1.8)}
def seabed_build(seed=7):
    sc = _scene('SB'); rng = random.Random(seed); S = SB['size']
    def h(x, y):
        v = Vector((x * 0.012, y * 0.012, 0.5))
        return 1.6 * noise.noise(v) + 0.5 * noise.noise(v * 4) + 0.12 * math.sin(x * 0.9 + noise.noise(v * 2) * 3)
    me = grid_mesh('sb_floor', S, S, 260, 260, h, mat('sand', _sand)); put(sc, me, (0, 0, 0), 1, name='sb_floor')
    sea = ['branching', 'branching', 'branching', 'brain', 'brain', 'table', 'softcoral', 'softcoral', 'firecoral', 'sponge', 'sponge', 'seaanemone', 'algae']
    def cluster(cx, cy, big):
        rr = rng.uniform(2.5, 5.5) * big
        put(sc, rock_mesh('sb_r%d' % rng.randrange(1 << 30), rr, rng.random() * 9), (cx, cy, h(cx, cy) - 0.3), 1, rng.random() * TAU, name='sb_rock')
        for k in range(rng.randint(10, 20)):
            a = rng.random() * TAU; d = rng.uniform(0, rr * 1.05)
            x, y = cx + math.cos(a) * d, cy + math.sin(a) * d
            top = max(0.0, 1 - (d / max(rr, 1e-3)) ** 2) ** 0.5 * rr * 0.6
            cid = rng.choice(sea); s = rng.uniform(*SZ[cid]) * big ** 0.5
            put(sc, flora(cid, rng.randrange(3)), (x, y, h(x, y) + top - 0.4), s, rng.random() * TAU, rng.uniform(-0.15, 0.15), rng.uniform(-0.15, 0.15), name='sb_c')
    # the fringing reef: a broken ring of coral heads around the island (the island itself covers the middle)
    for i in range(150):
        a = rng.random() * TAU; R = rng.uniform(80, 112)
        if math.sin(a * 3 + 1.0) > 0.75: continue   # channels through the reef
        cluster(math.cos(a) * R, math.sin(a) * R, rng.uniform(1.0, 1.8))
    # scattered heads on the sand, nearer and farther
    for i in range(34):
        a = rng.random() * TAU; R = rng.uniform(52, 145)
        cluster(math.cos(a) * R, math.sin(a) * R, rng.uniform(0.5, 1.0))
    # sea grass meadows on the sand
    for i in range(16):
        a = rng.random() * TAU; R = rng.uniform(55, 140); cx, cy = math.cos(a) * R, math.sin(a) * R
        for k in range(240):
            x = cx + rng.gauss(0, 7); y = cy + rng.gauss(0, 4.5)
            put(sc, flora('seagrass', rng.randrange(3)), (x, y, h(x, y) - 0.05), rng.uniform(1.6, 2.8), rng.random() * TAU, name='sb_g')
    # the wreck, lying a little tilted on the sand, with corals and sponges growing on it
    wx, wy, wa = 92.0, -58.0, math.radians(32)
    hull = put(sc, hull_mesh('sb_hull', 34.0, 9.0, 5.0), (wx, wy, h(wx, wy) - 1.2), 1, wa, math.radians(9), name='sb_hull')
    for k in range(26):
        t = rng.uniform(-0.45, 0.45); side = rng.choice((-1, 1))
        lx = t * 34; ly = side * rng.uniform(0.5, 3.0)
        x = wx + lx * math.cos(wa) - ly * math.sin(wa); y = wy + lx * math.sin(wa) + ly * math.cos(wa)
        put(sc, flora(rng.choice(['sponge', 'softcoral', 'seafan', 'branching']), rng.randrange(3)), (x, y, h(x, y) + rng.uniform(0.8, 3.0)), rng.uniform(1.0, 2.2), rng.random() * TAU, name='sb_wc')
    for k in range(5):   # a few loose planks in the sand
        x = wx + rng.uniform(-18, 18); y = wy + rng.uniform(-12, 12)
        me = bpy.data.meshes.new('sb_plank'); L_ = rng.uniform(3, 6)
        me.from_pydata([(-L_ / 2, -0.25, 0), (L_ / 2, -0.25, 0), (L_ / 2, 0.25, 0), (-L_ / 2, 0.25, 0), (-L_ / 2, -0.25, 0.15), (L_ / 2, -0.25, 0.15), (L_ / 2, 0.25, 0.15), (-L_ / 2, 0.25, 0.15)], [],
                       [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]); me.update(); me.materials.append(mat('wood', _wood))
        put(sc, me, (x, y, h(x, y) - 0.05), 1, rng.random() * TAU, name='sb_plank')
    lights(sc)
    cam = bpy.data.cameras.new('sb_cam'); cam.type = 'ORTHO'; cam.ortho_scale = S
    co = bpy.data.objects.new('sb_cam', cam); sc.collection.objects.link(co); co.location = (0, 0, 120); co.rotation_euler = (0, 0, 0)
    sc.camera = co
    return {'seabed': len(sc.objects)}

def seabed_render(res=2048, samples=48):
    sc = bpy.data.scenes['SB']; sc.render.resolution_x = sc.render.resolution_y = res; sc.render.resolution_percentage = 100
    sc.cycles.samples = samples; p = os.path.join(OUT, 'seabed_top.png'); sc.render.filepath = p
    if os.path.exists(p): os.remove(p)
    bpy.context.window.scene = sc
    with bpy.context.temp_override(window=bpy.context.window_manager.windows[0]):
        return {'started': str(bpy.ops.render.render('INVOKE_DEFAULT', write_still=True)), 'file': p}

# ═════════════════════════════════════════════ the reef wall from the front (tiles left to right)
WALL = {'w': 48.0, 'h': 22.0}
# scale per model on the wall (seen from the front)
WSZ = {'table': (0.35, 0.6), 'brain': (0.5, 1.0), 'branching': (1.6, 2.8), 'softcoral': (2.4, 4.2), 'seafan': (1.0, 1.7), 'firecoral': (1.4, 2.5),
       'sponge': (1.5, 2.8), 'seaanemone': (0.8, 1.4), 'algae': (2.6, 4.6), 'clam': (0.9, 1.5)}
def wall_build(seed=5):
    sc = _scene('CW'); rng = random.Random(seed); W, Hh = WALL['w'], WALL['h']
    # the wall is in the x/z plane, facing the camera at −y; depth (y) pushed by noise that repeats every W in x
    def dep(x, z):
        u = x / W * TAU
        v = Vector((math.cos(u) * 2.2, math.sin(u) * 2.2, z * 0.11))
        ledge = 0.9 * max(0.0, math.sin(z * 0.75 + noise.noise(v * 0.7) * 2.0))
        return 1.8 * noise.noise(v) + 0.7 * noise.noise(v * 3.1) - ledge
    me = grid_mesh('cw_wall', W, Hh, 220, 110, dep, mat('rock', _rock), plane='xz')
    for dx in (-W, 0, W): put(sc, me, (dx, 0, 0), 1, name='cw_wall')
    sea = ['branching', 'brain', 'table', 'softcoral', 'seafan', 'firecoral', 'sponge', 'seaanemone', 'algae', 'clam']
    items = []
    rows = [-Hh / 2 + 1.2 + k * 2.6 for k in range(int((Hh - 2) / 2.6) + 1)]   # shelves of the wall the corals grow on
    for i in range(420):
        x = rng.uniform(-W / 2, W / 2); z = rng.choice(rows) + rng.uniform(-1.1, 1.1) + 0.6 * math.sin(x * 0.4 + rng.random())
        cid = rng.choice(sea)
        # more corals near the top (more light), more sponges and fans lower down
        if z < -2 and cid in ('table', 'branching') and rng.random() < 0.6: cid = rng.choice(['sponge', 'seafan', 'softcoral'])
        s = rng.uniform(*WSZ[cid]) * 1.25
        items.append((x, z, cid, rng.randrange(3), s, rng.uniform(-0.5, 0.5)))
    for (x, z, cid, var, s, rz) in items:
        for dx in (-W, 0, W):   # copies on both sides so the picture tiles without a seam
            if abs(x + dx) > W / 2 + 4: continue
            y = dep(x, z) - 0.6
            ob = put(sc, flora(cid, var), (x + dx, y, z), s, rz, name='cw_c')
            # sea fans stand up and face the open water (the camera); the rest lean out of the wall towards the light
            ob.rotation_euler = (math.radians(rng.uniform(-8, 8)), 0, rz * 0.4) if cid == 'seafan' else (math.radians(rng.uniform(-14, 4)), math.radians(rng.uniform(-8, 8)), rz * TAU)
    lights(sc, sun=3.2, world='#2a7fa8', ws=1.35)
    cam = bpy.data.cameras.new('cw_cam'); cam.type = 'ORTHO'; cam.ortho_scale = W
    co = bpy.data.objects.new('cw_cam', cam); sc.collection.objects.link(co); co.location = (0, -60, 0); co.rotation_euler = (math.radians(90), 0, 0)
    sc.camera = co
    return {'wall': len(sc.objects)}

def wall_render(res=2048, samples=48):
    sc = bpy.data.scenes['CW']; sc.render.resolution_x = res; sc.render.resolution_y = int(res * WALL['h'] / WALL['w']); sc.render.resolution_percentage = 100
    sc.cycles.samples = samples; p = os.path.join(OUT, 'coralwall.png'); sc.render.filepath = p
    if os.path.exists(p): os.remove(p)
    bpy.context.window.scene = sc
    with bpy.context.temp_override(window=bpy.context.window_manager.windows[0]):
        return {'started': str(bpy.ops.render.render('INVOKE_DEFAULT', write_still=True)), 'file': p}

def preview(which='SB', res=512, samples=12):
    """a quick look before the real render"""
    sc = bpy.data.scenes[which]
    sc.render.resolution_x = res; sc.render.resolution_y = res if which == 'SB' else int(res * WALL['h'] / WALL['w']); sc.render.resolution_percentage = 100
    sc.cycles.samples = samples; p = os.path.join(D, 'pv', 'reef_%s.png' % which); sc.render.filepath = p
    if os.path.exists(p): os.remove(p)
    bpy.context.window.scene = sc
    with bpy.context.temp_override(window=bpy.context.window_manager.windows[0]):
        return {'started': str(bpy.ops.render.render('INVOKE_DEFAULT', write_still=True)), 'file': p}
