# medals.py (1.4.4 set 9) – the rare badges' metal medallions and twelve new album frames, rendered headless with the
# bpy module in the container (pip install --break-system-packages bpy==5.2.2), on top of frames.py's helpers.
#   python3 tools/blender/medals.py <outdir> [frames|medals|all] [ids...]
# Writes <outdir>/frames/<id>.png (512, the 9-slice frames of FRAMES in src/data/badges.js) and
# <outdir>/medals/<metal>_<emblem>.png (320, transparent). Then: python3 tools/build-frames.py and
# python3 tools/build-medals.py <outdir>/medals.
# No cross shapes: stars have five points, suns twelve rays, gears many teeth, laurels run along a curve.
import bpy, math, os, sys
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
argv = sys.argv[1:]
OUTDIR = os.path.abspath(argv[0] if argv else '/tmp/medals')
WHAT = argv[1] if len(argv) > 1 else 'all'
ONLY = set(argv[2:])
NS = {'ROOT': OUTDIR, '__name__': 'frames'}
exec(open(os.path.join(HERE, 'frames.py')).read(), NS)
g = NS
scene, curve_obj, sphere, leaf, gear, rosette, moulding, lights_cam, ring, mat_metal, mat_plain = (
    g['scene'], g['curve_obj'], g['sphere'], g['leaf'], g['gear'], g['rosette'], g['moulding'], g['lights_cam'], g['ring'], g['mat_metal'], g['mat_plain'])
TAU, H, CX, COL = g['TAU'], g['H'], g['CX'], g['COL']
from mathutils import Matrix
def mirror_corners(sc, obs):
    # the four corners by turning the corner piece a quarter at a time (a mirror flips filled curves inside out, and
    # they vanish in the copies)
    for o in obs:   # a flat (2D) curve keeps its height in the object, not in its points (its copies lost it)
        if o.type == 'CURVE' and o.data.dimensions == '2D':
            zs = [p.co[2] for sp in o.data.splines for p in sp.points]
            if zs and zs[0]:
                for sp in o.data.splines:
                    for p in sp.points: p.co = (p.co[0], p.co[1], 0, p.co[3])
                o.location.z += zs[0]
    g['fit_corner'](obs)
    for k in (1, 2, 3):
        R = Matrix.Rotation(k * math.pi / 2, 4, 'Z')
        for o in obs:
            c = o.copy(); c.data = o.data.copy(); sc.collection.objects.link(c); c.matrix_world = R @ o.matrix_world

def emit_mat(name, col, strength=3.0):
    m = mat_plain(name, col, 0.3); p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Emission Color'].default_value = col; p.inputs['Emission Strength'].default_value = strength; return m
def glass_mat(name, col):
    m = mat_plain(name, col, 0.04); p = m.node_tree.nodes.get('Principled BSDF')
    try: p.inputs['Transmission Weight'].default_value = 0.6
    except Exception: pass
    return m
def star_pts(cx, cy, r, inner=0.45, n=5, rot=math.pi / 2):
    return [(cx + (r if i % 2 == 0 else r * inner) * math.cos(rot + i * math.pi / n), cy + (r if i % 2 == 0 else r * inner) * math.sin(rot + i * math.pi / n)) for i in range(n * 2)]
def filled(sc, name, pts, mat, z=0.06, h=0.02, bev=0.004):
    return curve_obj(sc, name, [pts], depth=bev, res=2, mat=mat, z=z, extrude=h, fill=True)
def cyl(sc, name, loc, r, h, mat, verts=24):
    import bmesh
    me = bpy.data.meshes.new(name); ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob)
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r, radius2=r, depth=h); bm.to_mesh(me); bm.free()
    ob.location = loc; me.materials.append(mat)
    for p in me.polygons: p.use_smooth = verts > 8
    return ob

# ── the twelve new frames (corner ornaments live inside the 22% slice; mirror_corners copies them to the four corners)
def f_desert(sc):
    sand = mat_plain('sandstone', (0.80, 0.60, 0.36, 1), 0.8); dk = mat_plain('sandstone_dk', (0.58, 0.40, 0.22, 1), 0.85)
    dune = mat_plain('dune_or', (0.86, 0.50, 0.20, 1), 0.7); sun = mat_metal('sun_gold', COL['gold'], 0.22)
    peb = [mat_plain('pebble1', (0.45, 0.36, 0.30, 1), 0.6), mat_plain('pebble2', (0.30, 0.50, 0.50, 1), 0.5)]
    moulding(sc, sand, dk, inset=0.06, width=0.18)
    c = CX; obs = []
    for k in range(3):   # dunes: three ridges across the corner, each one a little higher
        obs.append(curve_obj(sc, f'dune{k}', [[(c - 0.14 + t * 0.30, c - 0.12 + k * 0.06 + 0.07 * math.sin(math.pi * t), 0) for t in [i / 30 for i in range(31)]]], depth=0.026 - k * 0.004, mat=dune if k != 1 else dk, z=0.07 + k * 0.012, closed=False))
    obs.append(sphere(sc, 'sun', (c + 0.10, c + 0.12, 0.1), 0.075, sun, 0.4))
    for k in range(4): obs.append(sphere(sc, f'pb{k}', (c - 0.13 + k * 0.035, c - 0.17 + (k % 2) * 0.02, 0.07), 0.022 + (k % 3) * 0.006, peb[k % 2], 0.6))
    mirror_corners(sc, obs)

def f_savanna(sc):
    wood = mat_plain('sv_wood', (0.62, 0.42, 0.18, 1), 0.5); dk = mat_plain('sv_wood_dk', (0.40, 0.24, 0.10, 1), 0.6)
    canopy = mat_plain('acacia', (0.24, 0.36, 0.12, 1), 0.7); canopy2 = mat_plain('acacia2', (0.36, 0.48, 0.16, 1), 0.7); grass = mat_plain('grass', (0.86, 0.70, 0.30, 1), 0.6)
    moulding(sc, wood, dk, inset=0.06, width=0.18)
    c = CX; obs = []
    obs.append(curve_obj(sc, 'trunk', [[(c - 0.02, c - 0.14, 0), (c + 0.0, c - 0.04, 0), (c - 0.04, c + 0.04, 0)]], depth=0.014, mat=dk, z=0.08, closed=False))
    obs.append(curve_obj(sc, 'br', [[(c + 0.0, c - 0.04, 0), (c + 0.07, c + 0.03, 0)]], depth=0.01, mat=dk, z=0.08, closed=False))
    for k, (dx, dy, r, m) in enumerate(((-0.04, 0.06, 0.10, canopy), (0.07, 0.05, 0.08, canopy2), (0.0, 0.10, 0.07, canopy2))):
        o = sphere(sc, f'crown{k}', (c + dx, c + dy, 0.11 + k * 0.01), r, m, 0.22); o.scale = (1.0, 0.55, 0.22); obs.append(o)
    for k in range(8):
        x = c - 0.15 + k * 0.035; hgt = 0.05 + 0.03 * math.sin(k * 1.7)
        obs.append(curve_obj(sc, f'gb{k}', [[(x, c - 0.17, 0), (x + 0.012, c - 0.17 + hgt, 0)]], depth=0.006, mat=grass, z=0.08, closed=False))
    mirror_corners(sc, obs)

def f_robolab(sc):
    steel = mat_metal('steel', (0.62, 0.66, 0.70, 1), 0.3); dk = mat_metal('steel_dk', (0.30, 0.34, 0.38, 1), 0.4)
    trace = mat_metal('trace', COL['brass'], 0.25); led = emit_mat('led', (0.2, 0.9, 1.0, 1), 4)
    moulding(sc, steel, dk, inset=0.06, width=0.18)
    c = CX; obs = []
    obs += gear(sc, 'rg', c, c, 0.15, 18, dk, z=0.05, depth=0.03)
    for k, (a, L) in enumerate(((0.15, 0.30), (1.42, 0.30), (0.78, 0.22))):
        x2, y2 = c + L * math.cos(a), c + L * math.sin(a)
        obs.append(curve_obj(sc, f'tr{k}', [[(c + 0.16 * math.cos(a), c + 0.16 * math.sin(a), 0), (x2, y2, 0)]], depth=0.008, mat=trace, z=0.07, closed=False))
        obs.append(sphere(sc, f'pad{k}', (x2, y2, 0.08), 0.022, trace, 0.5))
    obs.append(sphere(sc, 'led', (c, c, 0.12), 0.045, led, 0.7))
    mirror_corners(sc, obs)

def f_weekly(sc):
    enamel = mat_plain('enamel_pl', (0.36, 0.14, 0.40, 1), 0.18); au = mat_metal('wk_gold', COL['gold'], 0.2)
    moulding(sc, au, enamel, inset=0.06, width=0.18)
    c = CX; obs = []
    obs.append(filled(sc, 'st', star_pts(c, c, 0.15), au, z=0.06, h=0.03))
    for k, (dx, dy, r) in enumerate(((0.20, 0.05, 0.05), (0.05, 0.20, 0.05), (0.16, 0.16, 0.035))):
        obs.append(filled(sc, f'ss{k}', star_pts(c + dx, c + dy, r), au, z=0.06, h=0.02))
    mirror_corners(sc, obs)

def f_workshop(sc):
    cu = mat_metal('copper', (0.80, 0.45, 0.28, 1), 0.26); br = mat_metal('ws_brass', COL['brass'], 0.24)
    glass = glass_mat('bulbglass', (0.95, 0.92, 0.80, 1)); fil = emit_mat('filament', (1.0, 0.72, 0.30, 1), 6)
    moulding(sc, cu, br, inset=0.06, width=0.18)
    c = CX; obs = []
    obs.append(sphere(sc, 'bulb', (c + 0.03, c + 0.03, 0.12), 0.11, glass, 0.6))
    obs.append(curve_obj(sc, 'fil', [g['spiral'](c + 0.03, c + 0.03, 0.04, 2.2, 0, 1, shrink=0.5)], depth=0.006, mat=fil, z=0.16, closed=False))
    obs.append(cyl(sc, 'base', (c - 0.06, c - 0.06, 0.09), 0.05, 0.05, br))
    obs.append(curve_obj(sc, 'pipe', [[(c - 0.20, c + 0.10, 0), (c - 0.10, c + 0.18, 0), (c + 0.06, c + 0.22, 0), (c + 0.22, c + 0.12, 0)]], depth=0.018, mat=cu, z=0.07, closed=False))
    mirror_corners(sc, obs)

def f_bloom(sc):
    wood = mat_plain('bl_wood', (0.46, 0.32, 0.18, 1), 0.5); dk = mat_plain('bl_wood_dk', (0.30, 0.20, 0.10, 1), 0.6)
    pinks = [mat_plain('pet1', (0.95, 0.45, 0.60, 1), 0.4, sss=0.15), mat_plain('pet2', (0.98, 0.82, 0.30, 1), 0.4, sss=0.15), mat_plain('pet3', (0.50, 0.62, 0.95, 1), 0.4, sss=0.15)]
    lf = mat_plain('bl_leaf', (0.24, 0.50, 0.20, 1), 0.5, sss=0.1)
    moulding(sc, wood, dk, inset=0.06, width=0.18)
    c = CX; obs = []
    obs += leaf(sc, 'bl1', (c - 0.10, c - 0.12), 0.25, 0.30, 0.07, lf, curl=0.05)
    obs += leaf(sc, 'bl2', (c - 0.12, c - 0.10), 1.32, 0.30, 0.07, lf, curl=0.05)
    for k, (dx, dy, r) in enumerate(((0.02, 0.02, 0.10), (0.18, 0.0, 0.065), (0.0, 0.18, 0.065))):
        obs += rosette(sc, f'bro{k}', c + dx, c + dy, r, 5, pinks[k], z=0.08)
    mirror_corners(sc, obs)

def f_night(sc):
    navy = mat_plain('navy', (0.06, 0.08, 0.22, 1), 0.2); ag = mat_metal('nt_silver', COL['silver'], 0.2)
    moon = mat_plain('moon', (0.98, 0.92, 0.70, 1), 0.4); moon_e = emit_mat('moon_glow', (1.0, 0.92, 0.65, 1), 1.2)
    moulding(sc, ag, navy, inset=0.06, width=0.18)
    c = CX; obs = []
    cres = []   # a crescent: the outer arc and a smaller inner arc
    for i in range(41): a = math.pi * 0.25 + i / 40 * math.pi * 1.5; cres.append((c + 0.13 * math.cos(a), c + 0.13 * math.sin(a)))
    for i in range(41): a = math.pi * 1.75 - i / 40 * math.pi * 1.5; cres.append((c + 0.05 + 0.10 * math.cos(a), c + 0.05 + 0.10 * math.sin(a)))
    obs.append(filled(sc, 'moon', cres, moon_e, z=0.06, h=0.03))
    for k, (dx, dy, r) in enumerate(((0.22, 0.04, 0.04), (0.04, 0.22, 0.04), (0.18, 0.18, 0.028), (0.26, 0.20, 0.018))):
        obs.append(filled(sc, f'ns{k}', star_pts(c + dx, c + dy, r), ag, z=0.06, h=0.02))
    mirror_corners(sc, obs)

def laurel(sc, metal, name):
    m = mat_metal(name, COL[metal], 0.22); dk = mat_metal(name + '_dk', tuple(x * 0.7 for x in COL[metal][:3]) + (1,), 0.32)
    moulding(sc, m, dk, inset=0.06, width=0.18)
    c = CX; obs = []
    stem = [(c - 0.18 + 0.36 * t + 0.0, c - 0.18 + 0.36 * t + 0.10 * math.sin(math.pi * t) * (1 if True else -1)) for t in [i / 20 for i in range(21)]]
    stem = [(x - 0.05 * math.sin(math.pi * i / 20), y + 0.05 * math.sin(math.pi * i / 20)) for i, (x, y) in enumerate(stem)]
    obs.append(curve_obj(sc, name + '_stem', [[(x, y, 0) for x, y in stem]], depth=0.008, mat=dk, z=0.07, closed=False))
    for k in range(6):
        i = 3 + k * 3; x, y = stem[min(20, i)]
        for s in (-1, 1):
            obs += leaf(sc, f'{name}_l{k}{s}', (x, y), math.pi / 4 + s * 0.9, 0.11, 0.03, m, z=0.07)
    for k in range(3): obs.append(sphere(sc, f'{name}_b{k}', (c + 0.02 + k * 0.04, c - 0.06 + k * 0.03, 0.09), 0.016, dk, 0.8))
    mirror_corners(sc, obs)
def f_bronze(sc): laurel(sc, 'bronze', 'lb')
def f_silverlaurel(sc): laurel(sc, 'silver', 'ls')
def f_goldlaurel(sc): laurel(sc, 'gold', 'lg')

def f_crystal(sc):
    ice = glass_mat('ice', (0.70, 0.88, 1.0, 1)); ag = mat_metal('cr_silver', COL['silver'], 0.15)
    moulding(sc, ag, ice, inset=0.06, width=0.18)
    c = CX; obs = []
    for k, (dx, dy, r, h) in enumerate(((0.0, 0.0, 0.06, 0.16), (0.10, -0.02, 0.04, 0.11), (-0.02, 0.10, 0.04, 0.11), (0.08, 0.10, 0.03, 0.08), (0.16, 0.06, 0.025, 0.06))):
        o = cyl(sc, f'cr{k}', (c + dx, c + dy, 0.06 + h / 2), r, h, ice, verts=6); o.rotation_euler = (0.25, -0.25, k * 0.4); obs.append(o)
    mirror_corners(sc, obs)

def f_pearl(sc):
    nacre = mat_plain('nacre', (0.92, 0.88, 0.86, 1), 0.15); p = nacre.node_tree.nodes.get('Principled BSDF')
    try: p.inputs['Sheen Weight'].default_value = 0.8; p.inputs['Coat Weight'].default_value = 0.6
    except Exception: pass
    shell = mat_plain('shell', (0.95, 0.70, 0.62, 1), 0.35); pearl = mat_plain('pearl', (0.97, 0.96, 0.94, 1), 0.08)
    moulding(sc, nacre, shell, inset=0.06, width=0.18)
    c = CX; obs = []
    for k in range(9):   # a scallop: ridges fanning out from the hinge
        a = math.pi * 0.08 + k / 8 * math.pi * 0.34 + 0.0
        obs.append(curve_obj(sc, f'sh{k}', [[(c - 0.10, c - 0.10, 0), (c - 0.10 + 0.27 * math.cos(a + 0.0), c - 0.10 + 0.27 * math.sin(a + 0.0) , 0.02)]], depth=0.018, mat=shell, z=0.06, closed=False))
    obs.append(sphere(sc, 'pearl', (c + 0.12, c + 0.12, 0.1), 0.05, pearl, 1.0))
    mirror_corners(sc, obs)

NEW_FRAMES = {'desert': f_desert, 'savanna': f_savanna, 'robolab': f_robolab, 'weekly': f_weekly, 'workshop': f_workshop, 'bloom': f_bloom,
              'night': f_night, 'bronze': f_bronze, 'silverlaurel': f_silverlaurel, 'goldlaurel': f_goldlaurel, 'crystal': f_crystal, 'pearl': f_pearl}

# ── the medallions: a disc with a raised, beaded rim and a sunken field; the emblem stands in relief in the same metal
METALS = {'bronze': COL['bronze'], 'silver': COL['silver'], 'gold': COL['gold']}
def emblem(sc, kind, m, dk):
    z = 0.12; obs = []
    if kind == 'leaf':
        obs += leaf(sc, 'em_leaf', (-0.42, -0.30), 0.62, 0.95, 0.24, m, z=z, curl=0.06)
    elif kind == 'acorn':
        obs.append(sphere(sc, 'nut', (0, -0.08, z + 0.08), 0.26, m, 0.5)); obs[-1].scale = (0.85, 1.15, 0.5)
        obs.append(sphere(sc, 'cap', (0, 0.16, z + 0.12), 0.27, dk, 0.45)); obs[-1].scale = (1.05, 0.6, 0.45)
        obs.append(curve_obj(sc, 'stalk', [[(0, 0.30, 0), (0.05, 0.44, 0)]], depth=0.035, mat=dk, z=z + 0.14, closed=False))
    elif kind == 'wave':
        for k in range(3):
            pts = [(-0.55 + t * 1.1, -0.28 + k * 0.26 + 0.09 * math.sin(t * TAU * 1.5), 0) for t in [i / 40 for i in range(41)]]
            obs.append(curve_obj(sc, f'wv{k}', [pts], depth=0.04, mat=m, z=z, closed=False))
    elif kind == 'dune':
        for k in range(2):
            pts = [(-0.58 + t * 1.16, -0.32 + k * 0.18 + 0.18 * math.sin(math.pi * t) * (1 - k * 0.3), 0) for t in [i / 40 for i in range(41)]]
            obs.append(curve_obj(sc, f'dn{k}', [pts], depth=0.045, mat=m, z=z, closed=False))
        obs.append(sphere(sc, 'dsun', (0.22, 0.28, z + 0.05), 0.15, m, 0.35))
    elif kind == 'sun':
        obs.append(sphere(sc, 'sun', (0, 0, z + 0.06), 0.24, m, 0.35))
        for i in range(12):
            a = i / 12 * TAU; r0, r1, w = 0.32, 0.56, 0.06
            pts = [(r0 * math.cos(a - w), r0 * math.sin(a - w)), (r1 * math.cos(a), r1 * math.sin(a)), (r0 * math.cos(a + w), r0 * math.sin(a + w))]
            obs.append(filled(sc, f'ray{i}', pts, m, z=z, h=0.04))
    elif kind == 'gear':
        obs += gear(sc, 'eg', 0, 0, 0.48, 16, m, z=z, depth=0.06)
    elif kind == 'bulb':
        obs.append(sphere(sc, 'bl', (0, 0.12, z + 0.08), 0.30, m, 0.45))
        obs.append(cyl(sc, 'blb', (0, -0.30, z + 0.05), 0.15, 0.10, dk)); obs.append(cyl(sc, 'blb2', (0, -0.42, z + 0.04), 0.12, 0.08, dk))
    elif kind == 'flask':
        pts = [(-0.10, 0.45), (0.10, 0.45), (0.10, 0.12), (0.36, -0.40), (-0.36, -0.40), (-0.10, 0.12)]
        obs.append(filled(sc, 'fl', pts, m, z=z, h=0.06, bev=0.02))
        obs.append(sphere(sc, 'bub1', (0.06, -0.22, z + 0.10), 0.05, dk, 0.5)); obs.append(sphere(sc, 'bub2', (-0.10, -0.12, z + 0.10), 0.035, dk, 0.5))
    elif kind == 'lens':
        obs.append(curve_obj(sc, 'lr', [ring(0.08, 0.10, 0.28)], depth=0.05, mat=m, z=z + 0.04))
        obs.append(sphere(sc, 'lg', (0.08, 0.10, z + 0.03), 0.25, dk, 0.15))
        obs.append(curve_obj(sc, 'lh', [[(-0.12, -0.10, 0), (-0.40, -0.40, 0)]], depth=0.06, mat=m, z=z + 0.04, closed=False))
    elif kind == 'star':
        obs.append(filled(sc, 'est', star_pts(0, 0, 0.52, 0.45), m, z=z + 0.03, h=0.08, bev=0.03))
    return obs

def medal(sc, metal, kind):
    m = mat_metal('md_' + metal, METALS[metal], 0.2, tarnish=0.15); dk = mat_metal('md_dk_' + metal, tuple(x * 0.72 for x in METALS[metal][:3]) + (1,), 0.3)
    cyl(sc, 'disc', (0, 0, 0.0), 0.92, 0.10, dk, verts=96)
    curve_obj(sc, 'rim', [ring(0, 0, 0.86, 96)], depth=0.07, mat=m, z=0.08)
    curve_obj(sc, 'rim2', [ring(0, 0, 0.70, 96)], depth=0.02, mat=m, z=0.08)
    for i in range(36): a = i / 36 * TAU; sphere(sc, f'bd{i}', (0.78 * math.cos(a), 0.78 * math.sin(a), 0.09), 0.025, m, 0.8)
    emblem(sc, kind, m, dk)

def render(sc, path, size, samples):
    sc.cycles.samples = samples; sc.render.resolution_x = sc.render.resolution_y = size
    sc.render.threads_mode = 'AUTO'
    try: sc.view_settings.look = 'AgX - Punchy'; sc.view_settings.exposure = -0.15
    except Exception: pass
    bpy.context.window.scene = sc; sc.render.filepath = path; bpy.ops.render.render(write_still=True)

if WHAT in ('frames', 'all'):
    os.makedirs(os.path.join(OUTDIR, 'frames'), exist_ok=True)
    for fid, fn in NEW_FRAMES.items():
        if ONLY and fid not in ONLY: continue
        sc = scene(); bpy.context.window.scene = sc; fn(sc); lights_cam(sc, 512)   # the scene in the window first: fit_corner measures its evaluated shapes
        render(sc, os.path.join(OUTDIR, 'frames', fid + '.png'), 512, 40); print('frame', fid, flush=True)
if WHAT in ('medals', 'all'):
    os.makedirs(os.path.join(OUTDIR, 'medals'), exist_ok=True)
    for metal in METALS:
        for kind in ('leaf', 'acorn', 'wave', 'dune', 'sun', 'gear', 'bulb', 'flask', 'lens', 'star'):
            key = metal + '_' + kind
            if ONLY and key not in ONLY and kind not in ONLY: continue
            sc = scene(); bpy.context.window.scene = sc; medal(sc, metal, kind); lights_cam(sc, 320); sc.camera.data.ortho_scale = 2.0
            render(sc, os.path.join(OUTDIR, 'medals', key + '.png'), 320, 40); print('medal', key, flush=True)
