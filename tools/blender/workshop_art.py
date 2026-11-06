# הסדנה של ניצוץ and the weekly events: the 3D art (1.4.4, Avi 5.11: "the machines must look designed, like the rest of
# the game, not simple lines"). Built and rendered headless in the container (pip install --break-system-packages
# bpy==5.2.2):   python3 tools/blender/workshop_art.py <outdir> [names...]
# Every model is made in code with bevelled solids and real materials (painted enamel with a coat, brass, copper,
# wood, glass, rubber), lit in one warm studio, rendered with Cycles on a transparent film with a shadow catcher.
# Out: <outdir>/<name>.png (RGBA) and <outdir>/meta.json (points the game needs: the machine's window and lever pivot).
# Then: python3 tools/build-workshop-art.py <outdir>  →  src/data/workshop-art.js
# No cross shapes anywhere (no plus-shaped rivet patterns, ladders' rungs end at the rails, fans have three blades).
import bpy, bmesh, math, sys, json, os
from mathutils import Vector, Euler
from bpy_extras.object_utils import world_to_camera_view

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 40
    try: sc.cycles.use_denoising = True
    except Exception: pass
    sc.render.film_transparent = True
    sc.view_settings.view_transform = 'AgX'
    try: sc.view_settings.look = 'AgX - Punchy'
    except Exception: pass
    sc.cycles.max_bounces = 8; sc.cycles.transmission_bounces = 8
    return sc

# ── materials
_M = {}
def pbsdf(name, color, metal=0.0, rough=0.5, coat=0.0, trans=0.0, ior=1.45, emit=None, estr=0.0, alpha=1.0):
    k = name
    if k in _M: return _M[k]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    if coat: b.inputs['Coat Weight'].default_value = coat; b.inputs['Coat Roughness'].default_value = 0.08
    if trans: b.inputs['Transmission Weight'].default_value = trans; b.inputs['IOR'].default_value = ior
    if emit: b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = estr
    if alpha < 1: b.inputs['Alpha'].default_value = alpha
    _M[k] = m; return m
def hexc(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)   # sRGB → linear
def enamel(h, name=None): return pbsdf(name or 'en_' + h, hexc(h), rough=0.35, coat=0.6)
def metal(h, rough=0.28, name=None): return pbsdf(name or 'me_' + h, hexc(h), metal=1.0, rough=rough)
BRASS = lambda: metal('#d9a441', 0.25, 'brass'); COPPER = lambda: metal('#c8703a', 0.3, 'copper'); STEEL = lambda: metal('#b8c2cc', 0.22, 'steel')
DARK = lambda: pbsdf('dark', hexc('#2a2420'), rough=0.55); RUBBER = lambda: pbsdf('rubber', hexc('#262628'), rough=0.75)
def clear_glass(name='glass', tint=(0.93, 0.98, 1.0), base=0.06):
    """glass on a transparent film: a sharp mirror where the surface turns away (Fresnel), see-through elsewhere.
    Refraction would bend the studio's grey into the picture; a Transparent BSDF mixed with a sharp Glossy stays clean."""
    if name in _M: return _M[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); mix = nt.nodes.new('ShaderNodeMixShader')
    tr = nt.nodes.new('ShaderNodeBsdfTransparent'); tr.inputs[0].default_value = (*tint, 1)
    gl = nt.nodes.new('ShaderNodeBsdfGlossy'); gl.inputs['Roughness'].default_value = 0.0
    fr = nt.nodes.new('ShaderNodeFresnel'); fr.inputs['IOR'].default_value = 1.5
    mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 0.3
    add = nt.nodes.new('ShaderNodeMath'); add.operation = 'ADD'; add.use_clamp = True; add.inputs[1].default_value = base
    nt.links.new(fr.outputs[0], mul.inputs[0]); nt.links.new(mul.outputs[0], add.inputs[0]); nt.links.new(add.outputs[0], mix.inputs[0])
    nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(gl.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], out.inputs['Surface'])
    _M[name] = m; return m
GLASS = lambda: clear_glass()
def tinted(name, h, amount):
    """a see-through colour (water, liquid): a fixed mix of Transparent and a soft coloured surface, free of grain"""
    if name in _M: return _M[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); mix = nt.nodes.new('ShaderNodeMixShader'); mix.inputs[0].default_value = amount
    tr = nt.nodes.new('ShaderNodeBsdfTransparent'); tr.inputs[0].default_value = (*hexc(h), 1)
    pb = nt.nodes.new('ShaderNodeBsdfPrincipled'); pb.inputs['Base Color'].default_value = (*hexc(h), 1); pb.inputs['Roughness'].default_value = 0.15
    nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(pb.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], out.inputs['Surface'])
    _M[name] = m; return m
def wood(h='#b0743a', name=None):
    nm = name or 'wood_' + h
    if nm in _M: return _M[nm]
    m = pbsdf(nm, hexc(h), rough=0.6)
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    w = nt.nodes.new('ShaderNodeTexWave'); w.inputs['Scale'].default_value = 3.5; w.inputs['Distortion'].default_value = 6; w.wave_type = 'BANDS'
    r = nt.nodes.new('ShaderNodeValToRGB'); r.color_ramp.elements[0].color = (*[c * 0.62 for c in hexc(h)], 1); r.color_ramp.elements[1].color = (*hexc(h), 1)
    nt.links.new(w.outputs['Fac'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], b.inputs['Base Color'])
    return m
def noisy(base, h2, scale=40, name=None):
    """a material with a fine speckle (cork, sand, soil, fabric)"""
    nm = name or 'nz_' + base + h2
    if nm in _M: return _M[nm]
    m = pbsdf(nm, hexc(base), rough=0.85)
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = 8
    r = nt.nodes.new('ShaderNodeValToRGB'); r.color_ramp.elements[0].color = (*hexc(base), 1); r.color_ramp.elements[1].color = (*hexc(h2), 1)
    nt.links.new(n.outputs['Fac'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], b.inputs['Base Color'])
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.25
    nt.links.new(n.outputs['Fac'], bump.inputs['Height']); nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m
def stripes(cols, name):
    """horizontal colour bands by height (a beach ball)"""
    if name in _M: return _M[name]
    m = pbsdf(name, hexc(cols[0]), rough=0.35, coat=0.4); nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    r = nt.nodes.new('ShaderNodeValToRGB'); r.color_ramp.interpolation = 'CONSTANT'
    els = r.color_ramp.elements; els[0].color = (*hexc(cols[0]), 1); els[0].position = 0; els[1].position = 1 / len(cols); els[1].color = (*hexc(cols[1]), 1)
    for i in range(2, len(cols)): e = els.new(i / len(cols)); e.color = (*hexc(cols[i]), 1)
    nt.links.new(sep.outputs['Z'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], b.inputs['Base Color'])
    return m

# ── shapes (all smooth, bevelled)
COL = None
def _link(o):
    bpy.context.scene.collection.objects.link(o); return o
def _obj(name, me, mat=None):
    o = bpy.data.objects.new(name, me); _link(o)
    if mat: o.data.materials.append(mat)
    return o
def smooth(o, bevel=0.0, seg=3):
    for p in o.data.polygons: p.use_smooth = True
    if bevel:
        m = o.modifiers.new('bev', 'BEVEL'); m.width = bevel; m.segments = seg; m.limit_method = 'ANGLE'; m.harden_normals = False
    return o
def box(name, size, loc, mat, bevel=0.03, rot=(0, 0, 0)):
    me = bpy.data.meshes.new(name); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    bm.to_mesh(me); bm.free(); o = _obj(name, me, mat); o.location = loc; o.rotation_euler = rot
    m = o.modifiers.new('bev', 'BEVEL'); m.width = bevel; m.segments = 4; m.limit_method = 'NONE'
    for p in o.data.polygons: p.use_smooth = False
    o.modifiers.new('wn', 'WEIGHTED_NORMAL').keep_sharp = True
    return o
def cyl(name, r, h, loc, mat, rot=(0, 0, 0), verts=40, bevel=0.01, r2=None):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=verts, radius1=r, radius2=(r if r2 is None else r2), depth=h)
    bm.to_mesh(me); bm.free(); o = _obj(name, me, mat); o.location = loc; o.rotation_euler = rot
    for p in o.data.polygons: p.use_smooth = len(p.vertices) == 4
    if bevel: m = o.modifiers.new('bev', 'BEVEL'); m.width = bevel; m.segments = 3; m.limit_method = 'ANGLE'
    o.modifiers.new('wn', 'WEIGHTED_NORMAL').keep_sharp = True
    return o
def sphere(name, r, loc, mat, scale=(1, 1, 1), seg=32):
    me = bpy.data.meshes.new(name); bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=r)
    bm.to_mesh(me); bm.free(); o = _obj(name, me, mat); o.location = loc; o.scale = scale
    for p in o.data.polygons: p.use_smooth = True
    return o
def torus(name, R, r, loc, mat, rot=(0, 0, 0), seg=48, arc=1.0):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    n1, n2 = seg, 16; vs = []
    for i in range(n1 + (0 if arc >= 1 else 1)):
        a = i / n1 * 2 * math.pi * arc; ring = []
        for j in range(n2):
            b = j / n2 * 2 * math.pi
            ring.append(bm.verts.new(((R + r * math.cos(b)) * math.cos(a), (R + r * math.cos(b)) * math.sin(a), r * math.sin(b))))
        vs.append(ring)
    rng = range(len(vs)) if arc >= 1 else range(len(vs) - 1)
    for i in rng:
        a, b2 = vs[i], vs[(i + 1) % len(vs)]
        for j in range(n2): bm.faces.new((a[j], a[(j + 1) % n2], b2[(j + 1) % n2], b2[j]))
    bm.to_mesh(me); bm.free(); o = _obj(name, me, mat); o.location = loc; o.rotation_euler = rot
    for p in o.data.polygons: p.use_smooth = True
    return o
def lathe(name, prof, loc, mat, seg=56):
    """a solid of revolution from a profile [(r, z)] around Z"""
    me = bpy.data.meshes.new(name); bm = bmesh.new(); rings = []
    for i in range(seg):
        a = i / seg * 2 * math.pi
        rings.append([bm.verts.new((r * math.cos(a), r * math.sin(a), z)) for r, z in prof])
    for i in range(seg):
        A, B = rings[i], rings[(i + 1) % seg]
        for j in range(len(prof) - 1): bm.faces.new((A[j], A[j + 1], B[j + 1], B[j]))
    bm.to_mesh(me); bm.free(); o = _obj(name, me, mat); o.location = loc
    for p in o.data.polygons: p.use_smooth = True
    return o
def tube(name, pts, r, mat, res=12):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = r; cu.bevel_resolution = 6; cu.use_fill_caps = True
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(pts) - 1)
    for p, c in zip(sp.bezier_points, pts): p.co = c; p.handle_left_type = p.handle_right_type = 'AUTO'
    sp.resolution_u = res
    o = bpy.data.objects.new(name, cu); _link(o); o.data.materials.append(mat); return o
def rivets(prefix, pts, mat, r=0.018):
    for i, p in enumerate(pts): sphere(f'{prefix}{i}', r, p, mat, (1, 1, 0.6), 12)

# ── the studio: warm key, cool fill, rim; a shadow catcher under everything; a camera aimed at the model
def studio(target=(0, 0, 0.6), cam=(2.2, -3.6, 1.9), lens=50, ground=0.0, ortho=None):
    sc = bpy.context.scene
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.92, 0.86, 0.78, 1); bg.inputs[1].default_value = 0.22
    for n, e, loc, col, size in (('key', 460, (-1.0, -2.2, 5.8), (1.0, 0.88, 0.74), 2.2), ('fill', 110, (3.4, -2.2, 2.2), (0.75, 0.85, 1.0), 3.5), ('rim', 380, (0.5, 3.2, 3.4), (1.0, 0.92, 0.8), 1.6)):
        L = bpy.data.objects.new(n, bpy.data.lights.new(n, 'AREA')); _link(L)
        L.data.energy = e; L.data.size = size; L.data.color = col; L.location = loc
        if n != 'key':   # only the key light casts a shadow: a small, soft one under the model
            try: L.data.use_shadow = False
            except Exception: pass
            try: L.visible_shadow = False
            except Exception: pass
        L.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    g = box('ground', (12, 12, 0.02), (0, 0, ground - 0.01), pbsdf('gr', (0.8, 0.8, 0.8)), 0.0); g.is_shadow_catcher = True
    c = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); _link(c); sc.camera = c
    c.location = cam; c.data.lens = lens
    if ortho: c.data.type = 'ORTHO'; c.data.ortho_scale = ortho
    c.rotation_euler = (Vector(target) - Vector(cam)).to_track_quat('-Z', 'Y').to_euler()
    return c
def render(path, w, h, samples=40):
    sc = bpy.context.scene; sc.render.resolution_x = w; sc.render.resolution_y = h; sc.render.resolution_percentage = 100
    sc.cycles.samples = samples; sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.render.filepath = path; bpy.ops.render.render(write_still=True)
def px(co, w, h):
    bpy.context.view_layer.update(); sc = bpy.context.scene; v = world_to_camera_view(sc, sc.camera, Vector(co)); return [round(v.x * w, 1), round((1 - v.y) * h, 1)]

# ── the idea machine (≈1.4 m wide). parts: 'body' everything but the lever; 'lever' the lever alone (same camera)
def idea_machine(with_lever=True, lever_only=False):
    OR = enamel('#d8641c', 'orange'); CR = enamel('#f3ead6', 'cream'); TEAL = enamel('#2f8a8a', 'teal')
    objs = []
    if not lever_only:
        objs += [box('body', (1.36, 0.82, 1.0), (0, 0, 0.82), OR, 0.09)]
        objs += [box('band_t', (1.42, 0.88, 0.07), (0, 0, 1.28), BRASS(), 0.02), box('band_b', (1.42, 0.88, 0.09), (0, 0, 0.36), BRASS(), 0.02)]
        objs += [box('panel', (0.36, 0.05, 0.62), (-0.46, -0.42, 0.82), CR, 0.03), box('panel2', (0.32, 0.05, 0.62), (0.47, -0.42, 0.82), CR, 0.03)]
        # the round window: a brass ring, a dark warm chamber, a glass pane
        torus('win_ring', 0.27, 0.045, (0, -0.43, 0.84), BRASS(), (math.pi / 2, 0, 0))
        cyl('win_back', 0.25, 0.04, (0, -0.4, 0.84), pbsdf('chamber', hexc('#120a05'), rough=0.5, emit=hexc('#ff8a2a'), estr=0.08), (math.pi / 2, 0, 0), bevel=0)
        cyl('win_glass', 0.255, 0.012, (0, -0.445, 0.84), clear_glass('wglass'), (math.pi / 2, 0, 0), bevel=0)
        rivets('rv', [(0.27 * math.cos(a), -0.47, 0.84 + 0.27 * math.sin(a)) for a in [i * math.pi / 6 + 0.26 for i in range(12)]], BRASS(), 0.016)
        # lights on the left panel, gauges on the right
        for i, (col, z) in enumerate((('#ffd24a', 1.04), ('#7cf0a0', 0.84), ('#ff6a5a', 0.64))):
            cyl(f'sock{i}', 0.07, 0.05, (-0.46, -0.46, z), BRASS(), (math.pi / 2, 0, 0), bevel=0.008)
            sphere(f'bulb{i}', 0.058, (-0.46, -0.5, z), pbsdf('lamp' + col, tuple(c * 0.5 for c in hexc(col)), rough=0.15, coat=0.8, emit=hexc(col), estr=14))
        for i, z in enumerate((1.0, 0.7)):
            cyl(f'gauge{i}', 0.11, 0.04, (0.47, -0.46, z), pbsdf('dialface', hexc('#fffaf0'), rough=0.4), (math.pi / 2, 0, 0), bevel=0)
            torus(f'gring{i}', 0.11, 0.016, (0.47, -0.485, z), BRASS(), (math.pi / 2, 0, 0))
            box(f'needle{i}', (0.012, 0.01, 0.09), (0.47 + 0.02, -0.49, z + 0.03), enamel('#d8402f', 'red'), 0.003, (0, -0.6 if i else 0.5, 0))
        # the hopper on top: a copper funnel with a brass rim
        lathe('hopper', [(0.14, 1.3), (0.16, 1.36), (0.46, 1.66), (0.5, 1.7), (0.48, 1.7), (0.44, 1.66), (0.12, 1.36)], (0, 0, 0), COPPER())
        torus('hop_rim', 0.49, 0.025, (0, 0, 1.7), BRASS())
        # pipes and a little chimney with a cap
        tube('pipe1', [(-0.68, 0.2, 1.1), (-0.85, 0.2, 1.3), (-0.75, 0.25, 1.62), (-0.5, 0.25, 1.68)], 0.035, COPPER())
        cyl('chim', 0.07, 0.28, (0.48, 0.18, 1.45), STEEL(), bevel=0.01); cyl('chim_cap', 0.1, 0.04, (0.48, 0.18, 1.6), BRASS(), bevel=0.01)
        # the chute at the bottom right and the feet
        box('chute', (0.36, 0.5, 0.05), (0.42, -0.62, 0.36), BRASS(), 0.015, (math.radians(-18), 0, 0))
        for side in (-1, 1): box(f'chute_w{side}', (0.02, 0.5, 0.1), (0.42 + side * 0.18, -0.62, 0.4), BRASS(), 0.008, (math.radians(-18), 0, 0))
        for x in (-0.55, 0.55):
            for y in (-0.3, 0.3): cyl(f'leg{x}{y}', 0.05, 0.3, (x, y, 0.17), DARK(), bevel=0.01); sphere(f'foot{x}{y}', 0.075, (x, y, 0.04), RUBBER(), (1, 1, 0.55))
        box('plate', (0.5, 0.02, 0.1), (0, -0.425, 0.5), BRASS(), 0.01)
        rivets('rt', [(x, -0.45, 1.28) for x in (-0.6, -0.36, -0.12, 0.12, 0.36, 0.6)], STEEL(), 0.016)
        rivets('rb', [(x, -0.45, 0.36) for x in (-0.6, -0.36, -0.12, 0.12, 0.36, 0.6)], STEEL(), 0.016)
    if with_lever or lever_only:
        cyl('lv_hub', 0.09, 0.08, (0.74, -0.2, 0.84), BRASS(), (0, math.pi / 2, 0), bevel=0.01)
        cyl('lv_rod', 0.025, 0.5, (0.8, -0.2, 1.06), STEEL(), bevel=0.004, rot=(0, 0, 0))
        sphere('lv_ball', 0.075, (0.8, -0.2, 1.33), enamel('#e0402f', 'redknob'))
    return {'window': (0, -0.45, 0.84), 'window_r': (0.25, -0.45, 0.84), 'pivot': (0.8, -0.2, 0.84)}

# ── the ten things (≈0.5 m), each centred on the floor
def thing(id_):
    if id_ == 'umbrella':   # eight flat panels in two colours with dark ribs, a shaft and a hooked wooden handle
        n = 8; R = 0.52; top = 0.95; low = 0.7
        for i in range(n):
            a0, a1 = i / n * 2 * math.pi, (i + 1) / n * 2 * math.pi
            me = bpy.data.meshes.new(f'panel{i}'); bm = bmesh.new(); rows = 5; vs = []
            for r_ in range(rows + 1):
                t = r_ / rows; rad = R * t; z = top - (top - low) * t ** 1.3; row = []
                for k in range(5):
                    a = a0 + (a1 - a0) * k / 4; sag = 0.02 * math.sin(k / 4 * math.pi) * t
                    row.append(bm.verts.new(((rad - sag) * math.cos(a), (rad - sag) * math.sin(a), z - sag * 0.5)))
                vs.append(row)
            for r_ in range(rows):
                for k in range(4): bm.faces.new((vs[r_][k], vs[r_][k + 1], vs[r_ + 1][k + 1], vs[r_ + 1][k]))
            bm.to_mesh(me); bm.free(); o = _obj(f'panel{i}', me, enamel('#e0443a' if i % 2 else '#f2c443', 'umb' + str(i % 2)))
            for pp in o.data.polygons: pp.use_smooth = True
            o.modifiers.new('sol', 'SOLIDIFY').thickness = 0.008
            a = a0; tube(f'rib{i}', [(0, 0, top), (R * 0.5 * math.cos(a), R * 0.5 * math.sin(a), top - (top - low) * 0.5 ** 1.3), (R * math.cos(a), R * math.sin(a), low)], 0.006, DARK())
            sphere(f'tipr{i}', 0.012, (R * math.cos(a), R * math.sin(a), low), DARK())
        cyl('shaft', 0.012, 0.9, (0, 0, 0.5), STEEL()); sphere('tip', 0.02, (0, 0, 0.98), STEEL())
        tube('handle', [(0, 0, 0.1), (0, 0, 0.0), (0.07, 0, -0.04), (0.12, 0, 0.02)], 0.02, wood('#6a3a1a', 'hwood'))
        return 0.55
    if id_ == 'chair':
        W = wood('#b97a3e', 'chairwood')
        box('seat', (0.46, 0.44, 0.05), (0, 0, 0.42), W, 0.02); box('cush', (0.4, 0.38, 0.05), (0, 0, 0.47), noisy('#c8463a', '#a8362c', 60, 'cushion'), 0.025)
        box('back', (0.46, 0.05, 0.42), (0, 0.2, 0.68), W, 0.02)
        for x in (-0.19, 0.19):
            for y in (-0.18, 0.18): cyl(f'leg{x}{y}', 0.022, 0.42, (x, y, 0.21), W, bevel=0.004)
        return 0.45
    if id_ == 'bottle':
        lathe('bottle', [(0, 0), (0.15, 0.0), (0.16, 0.02), (0.16, 0.42), (0.13, 0.52), (0.06, 0.6), (0.055, 0.68), (0, 0.68)], (0, 0, 0), pbsdf('btl', hexc('#7cc4e8'), rough=0.08, trans=0.75, ior=1.4))
        cyl('cap', 0.065, 0.07, (0, 0, 0.71), enamel('#2f7a5a', 'cap'), bevel=0.01)
        lathe('water', [(0, 0.02), (0.145, 0.02), (0.145, 0.32), (0, 0.32)], (0, 0, 0), pbsdf('wtr', hexc('#4fa8d8'), rough=0.05, trans=0.6))
        return 0.42
    if id_ == 'shoe':   # a sneaker: a rounded upper (a low toe, a higher ankle), a white sole with a toe cap, laces and a stripe
        B = noisy('#3f7fd0', '#3570c0', 120, 'shoefab'); Wt = pbsdf('solew', hexc('#f4f1ea'), rough=0.45)
        box('sole', (0.25, 0.62, 0.07), (0, 0, 0.035), Wt, 0.03)
        t = box('toe', (0.23, 0.32, 0.14), (0, -0.14, 0.12), B, 0.06); t.modifiers.new('sub', 'SUBSURF').levels = 2
        a = box('ankle', (0.23, 0.3, 0.26), (0, 0.13, 0.18), B, 0.08); a.modifiers.new('sub', 'SUBSURF').levels = 2
        c = box('toecap', (0.24, 0.12, 0.08), (0, -0.27, 0.08), Wt, 0.04); c.modifiers.new('sub', 'SUBSURF').levels = 2
        box('stripe', (0.235, 0.24, 0.035), (0, 0.04, 0.17), Wt, 0.015, (math.radians(-18), 0, 0))
        cyl('collar', 0.085, 0.04, (0, 0.17, 0.315), pbsdf('collar', hexc('#24427a'), rough=0.6), bevel=0.012, r2=0.08)
        for i in range(4): box(f'lace{i}', (0.15, 0.022, 0.016), (0, -0.12 + i * 0.065, 0.2 + i * 0.022), pbsdf('lace', (0.95, 0.95, 0.95), rough=0.5), 0.007, (math.radians(-12), 0, 0))
        return 0.4
    if id_ == 'bucket':
        lathe('bucket', [(0, 0.0), (0.17, 0.0), (0.24, 0.42), (0.25, 0.43), (0.235, 0.43), (0.162, 0.02), (0, 0.02)], (0, 0, 0), enamel('#f2c443', 'bucket'))
        cyl('bwater', 0.225, 0.02, (0, 0, 0.36), pbsdf('bw', hexc('#4fa8d8'), rough=0.05, trans=0.5), bevel=0)
        torus('handle', 0.25, 0.01, (0, 0, 0.43), STEEL(), (math.pi / 2, 0, 0), arc=0.5)
        return 0.42
    if id_ == 'bag':
        G = noisy('#3a9a6a', '#2f8058', 70, 'bagfab')
        box('bag', (0.38, 0.22, 0.5), (0, 0, 0.27), G, 0.08); box('pocket', (0.28, 0.06, 0.2), (0, -0.13, 0.18), noisy('#4fb880', '#3a9a6a', 70, 'pockfab'), 0.04)
        box('flap', (0.36, 0.2, 0.08), (0, -0.03, 0.5), G, 0.035)
        torus('loop', 0.06, 0.012, (0, 0.02, 0.56), DARK(), (math.pi / 2, 0, 0), arc=0.5)
        box('zip', (0.2, 0.01, 0.015), (0, -0.165, 0.27), BRASS(), 0.004)
        return 0.42
    if id_ == 'ladder':
        W = wood('#c8873e', 'ladwood')
        for x in (-0.16, 0.16): box(f'rail{x}', (0.04, 0.04, 0.95), (x, 0, 0.48), W, 0.01)
        for i in range(5): cyl(f'rung{i}', 0.016, 0.28, (0, 0, 0.14 + i * 0.18), W, (0, math.pi / 2, 0), bevel=0.003)
        return 0.6
    if id_ == 'pillow':
        o = box('pillow', (0.56, 0.4, 0.16), (0, 0, 0.1), noisy('#b89ae0', '#a084d0', 90, 'pillowfab'), 0.07); o.modifiers.new('sub', 'SUBSURF').levels = 2
        sphere('btn', 0.018, (0, 0, 0.19), pbsdf('pbtn', hexc('#8a6ac0'), rough=0.4))
        return 0.42
    if id_ == 'spoon':
        sphere('bowl', 0.12, (0, -0.16, 0.05), STEEL(), (0.75, 1.0, 0.25))
        box('stem', (0.04, 0.42, 0.018), (0, 0.13, 0.06), STEEL(), 0.008, (math.radians(6), 0, 0))
        return 0.4
    if id_ == 'ball':
        sphere('ball', 0.28, (0, 0, 0.28), stripes(['#f5f1e8', '#e0443a', '#f5f1e8', '#3f7fd0', '#f5f1e8', '#f2c443'], 'beach'), seg=48)
        return 0.42
    # 6.11 (Avi: "more things on the shelf"): six more, in the same warm palette
    if id_ == 'hat':   # a straw sun hat with a wide wavy brim and a red band
        S_ = noisy('#e8c27a', '#d2a456', 140, 'straw')
        lathe('brim', [(0, 0.06), (0.16, 0.06), (0.36, 0.035), (0.44, 0.0), (0.445, 0.015), (0.36, 0.055), (0.16, 0.08), (0, 0.08)], (0, 0, 0), S_)
        lathe('crown', [(0, 0.06), (0.17, 0.06), (0.175, 0.2), (0.15, 0.27), (0.08, 0.3), (0, 0.305)], (0, 0, 0), S_)
        lathe('band', [(0.172, 0.07), (0.182, 0.07), (0.18, 0.13), (0.17, 0.13)], (0, 0, 0), enamel('#d8402f', 'hatband'))
        return 0.42
    if id_ == 'cup':   # a round blue mug with cocoa inside and a ring handle
        lathe('mug', [(0, 0), (0.15, 0), (0.17, 0.03), (0.175, 0.34), (0.16, 0.34), (0.155, 0.04), (0, 0.04)], (0, 0, 0), enamel('#3f7fd0', 'mug'))
        cyl('cocoa', 0.156, 0.01, (0, 0, 0.29), pbsdf('cocoa', hexc('#6a3a1e'), rough=0.2), bevel=0)
        torus('mhandle', 0.085, 0.024, (0.19, 0, 0.18), enamel('#3f7fd0', 'mug'), (math.pi / 2, 0.62 * math.pi, 0), arc=0.62)
        sphere('dot1', 0.03, (0.07, -0.16, 0.22), enamel('#f5f1e8', 'mugdot'), (1, 0.3, 1)); sphere('dot2', 0.022, (-0.06, -0.165, 0.12), enamel('#f5f1e8', 'mugdot'), (1, 0.3, 1))
        return 0.42
    if id_ == 'torch':   # a flashlight lying on its side, its lens lit
        R_ = enamel('#e0443a', 'torch'); Z = 0.125
        cyl('tbody', 0.07, 0.42, (0, 0.05, Z), R_, (math.pi / 2, 0, 0), bevel=0.01)
        lathe('thead', [(0, 0), (0.075, 0), (0.12, 0.13), (0.125, 0.15), (0, 0.15)], (0, -0.16, Z), STEEL()).rotation_euler = (math.pi / 2, 0, 0)
        cyl('lens', 0.112, 0.012, (0, -0.315, Z), pbsdf('lens', (1, 0.9, 0.55), emit=(1, 0.85, 0.4), estr=2.2), (math.pi / 2, 0, 0), bevel=0)
        box('tbtn', (0.05, 0.06, 0.03), (0, 0.0, Z + 0.075), enamel('#f2c443', 'tbtn'), 0.012)
        for i in range(4): torus(f'grip{i}', 0.072, 0.006, (0, 0.1 + i * 0.04, Z), DARK(), (math.pi / 2, 0, 0))
        return 0.4
    if id_ == 'box':   # a cardboard box with its four flaps open
        C_ = noisy('#c99a5a', '#b88848', 90, 'card')
        box('cbox', (0.42, 0.34, 0.3), (0, 0, 0.15), C_, 0.012)
        box('tape', (0.06, 0.345, 0.31), (0, 0, 0.15), pbsdf('tape', hexc('#e8d4a8'), rough=0.3), 0.004)
        for s in (-1, 1):
            box(f'fx{s}', (0.42, 0.012, 0.16), (0, s * 0.216, 0.366), C_, 0.004, (math.radians(-s * 35), 0, 0))
            box(f'fy{s}', (0.012, 0.32, 0.14), (s * 0.253, 0, 0.36), C_, 0.004, (0, math.radians(s * 32), 0))
        return 0.42
    if id_ == 'broom':   # a wooden broom standing, a wide tied straw head with a red band
        cyl('stick', 0.03, 0.75, (0, 0, 0.66), wood('#a8682e', 'stickw'), bevel=0.006)
        sphere('knob', 0.04, (0, 0, 1.04), enamel('#d8402f', 'tie'))
        lathe('bristle', [(0, 0), (0.3, 0), (0.27, 0.1), (0.15, 0.26), (0.06, 0.32), (0, 0.33)], (0, 0, 0), noisy('#e2b45a', '#b8862e', 260, 'bristle')).scale = (1, 0.42, 1)
        torus('tie', 0.1, 0.022, (0, 0, 0.22), enamel('#d8402f', 'tie')).scale = (1, 0.5, 1)
        return 0.55
    if id_ == 'tyre':   # an old tyre standing on its edge, a white ring on its side and a round hole
        RB = pbsdf('rubber', hexc('#34302c'), rough=0.8)
        o = torus('tyre', 0.24, 0.1, (0, 0, 0.34), RB, (math.pi / 2, 0, 0.35), seg=64); o.scale = (1, 1, 0.8)
        torus('wall', 0.235, 0.012, (0.027, -0.075, 0.34), pbsdf('wwall', hexc('#f2efe6'), rough=0.5), (math.pi / 2, 0, 0.35))
        return 0.45
    return 0.5

# ── the build table's pieces, the six test stations and the world's clients (small icons, fitted to the frame)
def piece(id_):
    O = enamel('#e9862c', 'orange')
    if id_ == 'p_box': box('pb', (0.5, 0.5, 0.5), (0, 0, 0.25), O, 0.04)
    elif id_ == 'p_ball': sphere('pb', 0.28, (0, 0, 0.28), O, seg=48)
    elif id_ == 'p_tube': cyl('pb', 0.18, 0.62, (0, 0, 0.18), O, (0, math.pi / 2, 0.5), bevel=0.02)
    elif id_ == 'p_cone': cyl('pb', 0.22, 0.6, (0, 0, 0.22), O, (0, math.pi / 2, 0.5), bevel=0.01, r2=0.0)
    elif id_ == 'p_plate': box('pb', (0.7, 0.5, 0.08), (0, 0, 0.04), O, 0.02)
    elif id_ == 'p_dome': lathe('pb', [(0, 0)] + [(0.34 * math.cos(t * math.pi / 2 / 12), 0.3 * math.sin(t * math.pi / 2 / 12)) for t in range(13)][::-1][:-1] + [(0.34, 0)], (0, 0, 0), O)
    elif id_ == 'm_spring': tube('sp', [(0.12 * math.cos(t), 0.12 * math.sin(t), 0.04 + t * 0.012) for t in [i * 0.3 for i in range(80)]], 0.016, STEEL())
    elif id_ == 'm_wheel': torus('tyre', 0.2, 0.07, (0, 0, 0.27), RUBBER(), (math.pi / 2, 0, 0.4)); cyl('hub', 0.12, 0.12, (0, 0, 0.27), BRASS(), (math.pi / 2, 0, 0.4), bevel=0.015)
    elif id_ == 'm_pipe': tube('pp', [(-0.25, 0, 0.08), (0.05, 0, 0.08), (0.2, 0, 0.2), (0.2, 0, 0.5)], 0.06, COPPER()); torus('pr', 0.06, 0.02, (0.2, 0, 0.5), BRASS())
    elif id_ == 'm_pump':
        cyl('pc', 0.14, 0.34, (0, 0, 0.17), enamel('#3f7fd0', 'pumpb'), bevel=0.02); cyl('prod', 0.02, 0.24, (0, 0, 0.44), STEEL())
        box('ph', (0.3, 0.05, 0.05), (0, 0, 0.56), wood('#6a3a1a', 'hwood'), 0.02); tube('pn', [(0.12, 0, 0.1), (0.28, 0, 0.1), (0.32, 0, 0.02)], 0.025, RUBBER())
    elif id_ == 'm_fan':
        torus('fr', 0.27, 0.025, (0, 0, 0.3), STEEL(), (math.pi / 2, 0, 0)); sphere('fh', 0.05, (0, -0.02, 0.3), BRASS())
        for i in range(3):
            a = i * 2 * math.pi / 3; box(f'fb{i}', (0.09, 0.02, 0.2), (0.12 * math.sin(a), 0, 0.3 + 0.12 * math.cos(a)), enamel('#ffd24a', 'blade'), 0.02, (0, a, 0))
        box('fst', (0.04, 0.04, 0.2), (0, 0.03, 0.1), STEEL(), 0.01); cyl('fbase', 0.14, 0.03, (0, 0.03, 0.015), DARK())
    elif id_ == 'm_chute':
        o = lathe('canopy', [(0, 0.62)] + [(0.34 * math.sin(t / 10 * math.pi / 2), 0.62 - 0.18 * (1 - math.cos(t / 10 * math.pi / 2))) for t in range(1, 11)] + [(0.33, 0.44)], (0, 0, 0), noisy('#ff8a5a', '#e8704a', 80, 'chutefab'), 12)
        for i in range(6): a = i / 6 * 2 * math.pi; tube(f'str{i}', [(0.33 * math.cos(a), 0.33 * math.sin(a), 0.44), (0, 0, 0.12)], 0.004, DARK())
        box('crate', (0.14, 0.14, 0.12), (0, 0, 0.06), wood('#b0743a', 'crate'), 0.01)
    # the six stations
    elif id_ == 's_wind':
        cyl('tt', 0.22, 0.7, (0, 0, 0.28), clear_glass('tglass'), (0, math.pi / 2, 0), verts=40, bevel=0)
        for x in (-0.35, 0.35): torus(f'tr{x}', 0.22, 0.02, (x, 0, 0.28), STEEL(), (0, math.pi / 2, 0))
        cyl('tm', 0.07, 0.22, (0, 0, 0.28), enamel('#e0443a', 'tmodel'), (0, -math.pi / 2, 0), bevel=0, r2=0.0)
        for i, z in enumerate((0.2, 0.28, 0.36)): box(f'wl{i}', (0.18, 0.006, 0.008), (-0.24, -0.05, z), pbsdf('windline', (1, 1, 1), emit=(0.7, 0.9, 1), estr=3), 0.003)
        for x in (-0.25, 0.25): box(f'tl{x}', (0.05, 0.2, 0.1), (x, 0, 0.05), DARK(), 0.01)
    elif id_ == 's_water':
        box('tank', (0.56, 0.36, 0.42), (0, 0, 0.21), clear_glass('tankg'), 0.01)
        box('tw', (0.53, 0.33, 0.26), (0, 0, 0.14), tinted('tankw', '#3a98d0', 0.5), 0.005)
        sphere('fl', 0.08, (0.05, 0, 0.28), enamel('#e9862c', 'orange'))
    elif id_ == 's_heat':
        box('blk', (0.3, 0.3, 0.18), (0, 0, 0.09), enamel('#e9862c', 'orange'), 0.02)
        lathe('lamp', [(0.02, 0.62), (0.08, 0.6), (0.2, 0.48), (0.21, 0.46), (0.19, 0.46), (0.07, 0.58)], (0, 0, 0), enamel('#2f8a8a', 'teal'))
        sphere('bulbh', 0.07, (0, 0, 0.5), pbsdf('hb', hexc('#ffb070'), emit=hexc('#ff7a2a'), estr=25)); cyl('lst', 0.012, 0.3, (0.0, 0.0, 0.77), STEEL())
    elif id_ == 's_sand':
        o = sphere('mound', 0.4, (0, 0, -0.12), noisy('#ecc98a', '#d4a860', 60, 'jdesert'), (1.2, 1, 0.55)); box('half', (0.18, 0.18, 0.18), (0.05, 0, 0.12), enamel('#3f7fd0', 'blkb'), 0.02, (0.2, 0.3, 0.4))
    elif id_ == 's_drop':
        W = wood('#8a5a2a', 'tower')
        for x in (-0.22, 0.22): box(f'post{x}', (0.04, 0.04, 0.9), (x, 0, 0.45), W, 0.01)
        box('beam', (0.5, 0.05, 0.05), (0, 0, 0.9), W, 0.01); box('pad', (0.5, 0.3, 0.03), (0, 0, 0.015), RUBBER(), 0.01)
        sphere('egg', 0.07, (0, 0, 0.5), pbsdf('egg', hexc('#f8efe0'), rough=0.4), (1, 1, 1.3))
    elif id_ == 's_noise':
        box('spk', (0.32, 0.26, 0.42), (0, 0, 0.21), wood('#5a3418', 'spkw'), 0.03)
        cyl('cone1', 0.1, 0.03, (0, -0.135, 0.27), DARK(), (math.pi / 2, 0, 0), bevel=0.01); cyl('cone2', 0.05, 0.03, (0, -0.135, 0.11), DARK(), (math.pi / 2, 0, 0), bevel=0.01)
        for i, R in enumerate((0.18, 0.26, 0.34)): torus(f'wave{i}', R, 0.012, (0, -0.2, 0.27), pbsdf('wv', hexc('#7cd8a0'), emit=hexc('#7cd8a0'), estr=2), (math.pi / 2, 0, 0), arc=0.25)
    # the world's clients
    elif id_ == 'c_road':
        box('road', (0.36, 0.9, 0.03), (0, 0, 0.015), pbsdf('asph', hexc('#4a4a52'), rough=0.85), 0.01)
        for i in range(4): box(f'dash{i}', (0.03, 0.12, 0.005), (0, -0.33 + i * 0.22, 0.033), pbsdf('paint', hexc('#ffd24a'), rough=0.6), 0.002)
        for i in range(3): sphere(f'eye{i}', 0.025, (0.17, -0.3 + i * 0.3, 0.04), pbsdf('cateye', hexc('#ffffff'), metal=1, rough=0.05, emit=hexc('#ffe9a0'), estr=3), (1, 1, 0.6))
    elif id_ == 'c_phone':
        box('ph', (0.3, 0.04, 0.58), (0, 0, 0.32), DARK(), 0.04, (math.radians(-12), 0, 0))
        box('scr', (0.26, 0.01, 0.5), (0, -0.024, 0.32), pbsdf('scr', hexc('#5ab8e0'), rough=0.1, emit=hexc('#3a88c0'), estr=0.8), 0.01, (math.radians(-12), 0, 0))
        for k, (dx, dz, a) in enumerate(((0.02, 0.06, 0.6), (-0.04, -0.04, -0.5))): box(f'crk{k}', (0.16, 0.012, 0.006), (dx, -0.03, 0.32 + dz), pbsdf('crk', (1, 1, 1)), 0.002, (math.radians(-12), a, 0))
    elif id_ == 'c_slide':
        box('sl', (0.18, 0.9, 0.02), (0, 0.05, 0.3), enamel('#e0443a', 'redknob'), 0.02, (math.radians(35), 0, 0))
        for x in (-0.1, 0.1): box(f'lad{x}', (0.03, 0.03, 0.62), (x, 0.42, 0.31), enamel('#3f7fd0', 'blkb'), 0.01)
        for i in range(4): cyl(f'lr{i}', 0.012, 0.2, (0, 0.42, 0.1 + i * 0.15), STEEL(), (0, math.pi / 2, 0))
        sphere('sun', 0.07, (0.25, 0.3, 0.75), pbsdf('sunb', hexc('#ffd24a'), emit=hexc('#ffb020'), estr=6))
    elif id_ == 'c_eggs':
        box('tray', (0.6, 0.4, 0.08), (0, 0, 0.04), noisy('#c9a878', '#b0905e', 40, 'carton'), 0.02)
        for i in range(3):
            for j in range(2): sphere(f'egg{i}{j}', 0.075, (-0.18 + i * 0.18, -0.09 + j * 0.18, 0.15), pbsdf('egg', hexc('#f8efe0'), rough=0.4), (1, 1, 1.3))
    elif id_ == 'c_roof':
        box('wall', (0.6, 0.45, 0.36), (0, 0, 0.18), noisy('#f2d7a8', '#e2c090', 30, 'wallp'), 0.01)
        for s_ in (-1, 1): box(f'rf{s_}', (0.68, 0.36, 0.035), (0, s_ * 0.13, 0.46), enamel('#c8402f', 'roofr'), 0.01, (s_ * math.radians(42), 0, 0))
        sphere('drop', 0.035, (0.1, -0.24, 0.25), pbsdf('wdrop', hexc('#4fa8d8'), rough=0.05, coat=1), (1, 1, 1.5))
    elif id_ == 'c_ship':
        o = box('hull', (0.8, 0.26, 0.18), (0, 0, 0.1), enamel('#2f5a7a', 'hull'), 0.06); box('deck', (0.4, 0.2, 0.16), (-0.05, 0, 0.27), pbsdf('deckw', hexc('#f2efe6'), rough=0.5), 0.02)
        cyl('funnel', 0.05, 0.16, (0.1, 0, 0.42), enamel('#e0443a', 'redknob'), bevel=0.01)
    elif id_ == 'c_school':
        box('sch', (0.7, 0.4, 0.38), (0, 0, 0.19), enamel('#f2c443', 'bucket'), 0.02)
        for s_ in (-1, 1): box(f'srf{s_}', (0.78, 0.26, 0.03), (0, s_ * 0.1, 0.45), enamel('#c8402f', 'roofr'), 0.01, (s_ * math.radians(35), 0, 0))
        box('door', (0.12, 0.02, 0.2), (0, -0.2, 0.1), wood('#6a3a1a', 'hwood'), 0.01)
        for x in (-0.22, 0.22): box(f'sw{x}', (0.12, 0.02, 0.1), (x, -0.2, 0.24), pbsdf('win', hexc('#9fd8f0'), rough=0.1), 0.005)
    elif id_ == 'c_building':
        box('tower', (0.32, 0.32, 0.9), (0, 0, 0.45), enamel('#9fb6c8', 'tower'), 0.02)
        for r in range(5):
            for x in (-0.07, 0.07): box(f'bw{r}{x}', (0.08, 0.02, 0.08), (x, -0.165, 0.15 + r * 0.16), pbsdf('win', hexc('#e8f4fb'), rough=0.1, emit=hexc('#fff0c0'), estr=0.6), 0.004)
    elif id_ == 'c_umbrella': thing('umbrella')
    elif id_ == 'c_tent':
        for s_ in (-1, 1): box(f'tw{s_}', (0.62, 0.02, 0.5), (0, s_ * 0.16, 0.2), noisy('#3a9a6a', '#2f8058', 80, 'bagfab'), 0.01, (s_ * math.radians(-38), 0, 0))
        box('tsand', (0.9, 0.7, 0.03), (0, 0, 0.0), noisy('#ecc98a', '#d4a860', 60, 'jdesert'), 0.01); cyl('tpole', 0.012, 0.5, (0.31, 0, 0.25), STEEL())
    elif id_ == 'c_window':
        box('wf', (0.5, 0.06, 0.66), (0, 0, 0.33), wood('#f2efe6', 'wfr'), 0.02); box('wg', (0.42, 0.065, 0.58), (0, 0, 0.33), clear_glass('wglass2', (0.8, 0.92, 1.0), 0.15), 0.004)
        box('wbar', (0.42, 0.07, 0.03), (0, 0, 0.33), wood('#f2efe6', 'wfr'), 0.005); box('sill', (0.58, 0.14, 0.03), (0, -0.04, 0.0), wood('#f2efe6', 'wfr'), 0.01)
    elif id_ == 'c_bank':
        for i in range(4): box(f'note{i}', (0.56, 0.3, 0.012), (0.01 * i, 0.01 * i, 0.01 + i * 0.014), noisy('#9ad08a', '#7ab06a', 30, 'money'), 0.004, (0, 0, 0.06 * i))
        sphere('uv', 0.05, (0.15, -0.05, 0.08), pbsdf('uvp', hexc('#a86ad8'), emit=hexc('#9a5ae0'), estr=5), (1, 1, 0.3))
    elif id_ == 'c_train':
        box('car', (0.82, 0.3, 0.28), (0, 0, 0.2), enamel('#e0443a', 'redknob'), 0.07); sphere('nose', 0.15, (0.4, 0, 0.18), enamel('#e0443a', 'redknob'), (1.6, 1, 0.9))
        for x in (-0.25, 0.0): box(f'tw{x}', (0.14, 0.02, 0.08), (x, -0.155, 0.25), pbsdf('win', hexc('#9fd8f0'), rough=0.1), 0.01)
        for x in (-0.28, 0.25): cyl(f'tr{x}', 0.06, 0.32, (x, 0, 0.06), DARK(), (math.pi / 2, 0, 0), bevel=0.01)
    elif id_ == 'c_library':
        box('shelf', (0.7, 0.24, 0.66), (0, 0, 0.33), wood('#8a5a2a', 'stand'), 0.015)
        cols = ['#e0443a', '#3f7fd0', '#3a9a6a', '#f2c443', '#a884d0']
        for r, z in enumerate((0.12, 0.45)):
            for i in range(7): box(f'bk{r}{i}', (0.065, 0.18, 0.2 - (i % 3) * 0.02), (-0.24 + i * 0.08, -0.03, z + 0.06), enamel(cols[(i + r) % 5], 'bk' + cols[(i + r) % 5]), 0.008)
            box(f'sb{r}', (0.66, 0.22, 0.02), (0, 0, z - 0.05), wood('#6a3a1a', 'hwood'), 0.005)
    elif id_ == 'c_helmet':
        o = sphere('hm', 0.32, (0, 0, 0.06), enamel('#3f7fd0', 'blkb'), (1.15, 1.0, 0.85)); m = o.modifiers.new('cut', 'BOOLEAN')
        cut = box('hcut', (1.2, 1.2, 0.5), (0, 0, -0.19), DARK(), 0.0); m.object = cut; cut.hide_render = True
        for i in range(3): box(f'vent{i}', (0.05, 0.22, 0.03), (-0.12 + i * 0.12, 0, 0.33), DARK(), 0.01)
        torus('hrim', 0.355, 0.02, (0, 0, 0.065), DARK(), (0, 0, 0)).scale = (1.05, 0.9, 1)
    # 5.11 evening: the five new world clients (no crosses: three rotor arms, wheels without spokes)
    elif id_ == 'c_busstop':
        for x in (-0.3, 0.3): cyl(f'bp{x}', 0.022, 0.62, (x, 0.12, 0.31), STEEL())
        box('broof', (0.78, 0.36, 0.04), (0, 0.02, 0.64), enamel('#3f7fd0', 'blkb'), 0.02, (math.radians(-6), 0, 0))
        box('bback', (0.66, 0.02, 0.4), (0, 0.13, 0.36), clear_glass('bglass', (0.8, 0.92, 1.0), 0.12), 0.004)
        box('bench', (0.5, 0.14, 0.04), (0, 0.04, 0.2), wood('#c58a4a', 'benchw'), 0.01)
        for x in (-0.2, 0.2): box(f'bl{x}', (0.03, 0.1, 0.18), (x, 0.04, 0.09), DARK(), 0.005)
        cyl('bsign', 0.012, 0.75, (0.48, -0.05, 0.375), STEEL()); cyl('bdisc', 0.09, 0.02, (0.48, -0.05, 0.76), enamel('#2f9a5a', 'bsignc'), (math.pi / 2, 0, 0), bevel=0.005)
        sphere('bsun', 0.07, (-0.42, -0.2, 0.92), pbsdf('sunb', hexc('#ffd24a'), emit=hexc('#ffb020'), estr=6))
    elif id_ == 'c_dronebox':
        box('dbox', (0.34, 0.34, 0.26), (0, 0, 0.13), noisy('#c9a878', '#b0905e', 40, 'carton'), 0.02)
        for i in range(3):
            for j in range(2): cyl(f'hx{i}{j}', 0.045, 0.012, (-0.1 + i * 0.1, -0.172, 0.08 + j * 0.1), noisy('#b0905e', '#9a7a4a', 40, 'carton2'), (math.pi / 2, 0, 0), verts=6, bevel=0.003)
        cyl('dbody', 0.1, 0.06, (0, 0, 0.62), enamel('#e0443a', 'redknob'), bevel=0.02)
        for k in range(3):
            a = k * 2 * math.pi / 3 + 0.3; ex, ey = math.cos(a) * 0.3, math.sin(a) * 0.3
            box(f'darm{k}', (0.3, 0.03, 0.02), (ex / 2, ey / 2, 0.62), DARK(), 0.008, (0, 0, a))
            cyl(f'drot{k}', 0.11, 0.008, (ex, ey, 0.65), pbsdf('rotor', hexc('#9fd8f0'), rough=0.2, alpha=0.6), bevel=0.002)
        for k in range(3):
            a = k * 2 * math.pi / 3; tube(f'dline{k}', [(math.cos(a) * 0.06, math.sin(a) * 0.06, 0.6), (math.cos(a) * 0.15, math.sin(a) * 0.15, 0.27)], 0.006, DARK())
    elif id_ == 'c_turbine':
        cyl('tmast', 0.04, 1.0, (0, 0, 0.5), pbsdf('tmw', hexc('#f2efe6'), rough=0.4), r2=0.025)
        box('tnac', (0.08, 0.2, 0.08), (0, 0.02, 1.0), pbsdf('tmw', hexc('#f2efe6'), rough=0.4), 0.03)
        sphere('thub', 0.05, (0, -0.1, 1.0), pbsdf('tmw', hexc('#f2efe6'), rough=0.4), (1, 1.2, 1))
        for k in range(3):
            a = k * 2 * math.pi / 3 + 0.4
            o = box(f'tbl{k}', (0.06, 0.012, 0.46), (math.sin(a) * 0.24, -0.12, 1.0 + math.cos(a) * 0.24), pbsdf('tmw', hexc('#f2efe6'), rough=0.4), 0.006, (0, a, 0))
        box('tgrass', (0.9, 0.6, 0.03), (0, 0.1, 0.0), noisy('#7ab85a', '#5a9a3a', 50, 'tgr'), 0.01)
    elif id_ == 'c_beachchair':
        box('csand', (0.9, 0.7, 0.03), (0, 0, 0.0), noisy('#ecc98a', '#d4a860', 60, 'jdesert'), 0.01)
        for y in (-0.2, 0.2): torus(f'cw{y}', 0.2, 0.035, (0, y, 0.2), RUBBER(), (math.pi / 2, 0, 0)); cyl(f'chub{y}', 0.04, 0.04, (0, y, 0.2), STEEL(), (math.pi / 2, 0, 0))
        box('cseat', (0.3, 0.36, 0.04), (0.04, 0, 0.32), enamel('#3f7fd0', 'blkb'), 0.02)
        box('cback', (0.04, 0.36, 0.3), (-0.1, 0, 0.48), enamel('#3f7fd0', 'blkb'), 0.02, (0, math.radians(-10), 0))
        for y in (-0.17, 0.17): tube(f'cfr{y}', [(-0.12, y, 0.62), (-0.1, y, 0.32), (0.2, y, 0.3), (0.26, y, 0.1)], 0.012, STEEL())
        sphere('cfw', 0.05, (0.28, 0, 0.06), RUBBER())
    elif id_ == 'c_bike':
        for x in (-0.3, 0.3): torus(f'kw{x}', 0.2, 0.025, (x, 0, 0.22), RUBBER(), (math.pi / 2, 0, 0)); cyl(f'khub{x}', 0.035, 0.05, (x, 0, 0.22), STEEL(), (math.pi / 2, 0, 0))
        tube('kfr', [(-0.3, 0, 0.22), (-0.05, 0, 0.24), (0.15, 0, 0.48), (-0.12, 0, 0.46), (-0.05, 0, 0.24)], 0.018, enamel('#2f9a5a', 'bsignc'))
        tube('kfork', [(0.3, 0, 0.22), (0.18, 0, 0.5), (0.16, 0, 0.58)], 0.016, enamel('#2f9a5a', 'bsignc'))
        box('ksad', (0.12, 0.06, 0.03), (-0.14, 0, 0.52), DARK(), 0.015); tube('kbar', [(0.12, -0.12, 0.6), (0.16, 0, 0.58), (0.12, 0.12, 0.6)], 0.014, DARK())
        sphere('klamp', 0.04, (0.24, 0, 0.5), pbsdf('klmp', hexc('#fff4c0'), emit=hexc('#fff0a0'), estr=8))
        sphere('kref', 0.03, (-0.34, 0, 0.42), pbsdf('cateye', hexc('#e8574a'), metal=1, rough=0.05, emit=hexc('#ff6a50'), estr=3), (1, 0.5, 1))
    return 0.5

# ── the seven places of the room (each a small scene)
def station(id_):
    if id_ == 'machine':
        idea_machine(True); return dict(target=(0, 0, 0.9), cam=(2.4, -4.2, 2.2), lens=48)
    if id_ == 'mixer':
        mixer_model(); return dict(target=(0, 0, 0.75), cam=(1.8, -3.6, 1.9), lens=50)
    if id_ == 'cards':
        W = wood('#8a5a2a', 'stand')
        box('stand', (0.9, 0.35, 0.08), (0, 0, 0.04), W, 0.02); box('lip', (0.9, 0.04, 0.1), (0, -0.16, 0.1), W, 0.015)
        back = noisy('#c0402f', '#a8302a', 25, 'cardback'); face = pbsdf('cardface', hexc('#fffaf0'), rough=0.5)
        for i, (x, a) in enumerate(((-0.28, 14), (0, 0), (0.28, -14))):
            box(f'card{i}', (0.36, 0.02, 0.52), (x, 0.02 - i * 0.03, 0.36 + (0.03 if i == 1 else 0)), back if i != 1 else face, 0.02, (math.radians(-12), math.radians(a), 0))
        cyl('clockface', 0.08, 0.02, (0.0, -0.035, 0.46), enamel('#ffd24a', 'clockface'), (math.radians(78), 0, 0), bevel=0.005)
        return dict(target=(0, 0, 0.35), cam=(1.0, -2.6, 1.3), lens=50)
    if id_ == 'orders':
        W = wood('#7a4a22', 'frame')
        box('board', (1.1, 0.06, 0.8), (0, 0, 1.0), noisy('#c9965a', '#a87a42', 80, 'cork'), 0.01)
        for z, h in ((1.42, 0.06), (0.58, 0.06)): box(f'fr{z}', (1.2, 0.08, h), (0, 0, z), W, 0.015)
        for x in (-0.58, 0.58): box(f'fs{x}', (0.06, 0.08, 0.9), (x, 0, 1.0), W, 0.015)
        for x in (-0.45, 0.45): box(f'easel{x}', (0.05, 0.05, 1.0), (x, 0.08, 0.48), W, 0.01, (math.radians(-6), 0, 0))
        for i, (x, z, col, rot, pin) in enumerate(((-0.28, 1.12, '#fffaf0', -6, '#e0443a'), (0.26, 1.14, '#ffe6a8', 5, '#3f7fd0'), (0.0, 0.8, '#dff3e4', 3, '#3a9a6a'))):
            box(f'note{i}', (0.38, 0.01, 0.3), (x, -0.04, z), pbsdf('paper' + col, hexc(col), rough=0.7), 0.004, (0, math.radians(rot), 0))
            sphere(f'pin{i}', 0.028, (x, -0.06, z + 0.12), enamel(pin, 'pin' + pin))
            for k in range(3): box(f'line{i}{k}', (0.24 - k * 0.04, 0.005, 0.014), (x, -0.047, z + 0.03 - k * 0.06), pbsdf('ink', hexc('#9a7a5a'), rough=0.8), 0.002, (0, math.radians(rot), 0))
        return dict(target=(0, 0, 0.95), cam=(0.9, -3.4, 1.4), lens=50)
    if id_ == 'build':
        W = wood('#b0743a', 'bench')
        box('top', (1.4, 0.7, 0.08), (0, 0, 0.7), W, 0.02)
        for x in (-0.6, 0.6):
            for y in (-0.28, 0.28): box(f'bl{x}{y}', (0.07, 0.07, 0.66), (x, y, 0.35), W, 0.01)
        box('shelf', (1.3, 0.6, 0.04), (0, 0, 0.18), W, 0.01)
        box('blk1', (0.26, 0.26, 0.26), (-0.4, 0, 0.87), enamel('#3f7fd0', 'blkb'), 0.03)
        sphere('blk2', 0.15, (-0.05, 0.05, 0.89), enamel('#e0443a', 'blkr'))
        cyl('blk3', 0.12, 0.22, (0.32, -0.1, 0.85), enamel('#f2c443', 'blky'), bevel=0.02)
        pts = [(0.55 + 0.08 * math.cos(t), 0.12 + 0.08 * math.sin(t), 0.74 + t * 0.012) for t in [i * 0.35 for i in range(80)]]
        tube('spring', pts, 0.01, STEEL())
        torus('wheel', 0.1, 0.035, (0.05, -0.22, 0.78), RUBBER(), (math.pi / 2, 0, 0.3)); cyl('hub', 0.05, 0.08, (0.05, -0.22, 0.78), BRASS(), (math.pi / 2, 0, 0.3))
        return dict(target=(0, 0, 0.7), cam=(1.6, -3.0, 1.9), lens=50)
    if id_ == 'test':
        cyl('tunnel', 0.42, 1.5, (-0.1, 0, 0.8), clear_glass('tglass'), (0, math.pi / 2, 0), verts=48, bevel=0)
        for x in (-0.85, 0.65): torus(f'tring{x}', 0.42, 0.04, (x, 0, 0.8), STEEL(), (0, math.pi / 2, 0))
        for x in (-0.6, 0.4): box(f'tleg{x}', (0.1, 0.5, 0.36), (x, 0, 0.2), DARK(), 0.02)
        cyl('fanbox', 0.48, 0.3, (0.85, 0, 0.8), enamel('#2f8a8a', 'fanbox'), (0, math.pi / 2, 0), bevel=0.03)
        for i in range(3):
            a = i * 2 * math.pi / 3
            box(f'blade{i}', (0.04, 0.12, 0.34), (0.68, 0.17 * math.sin(a), 0.8 + 0.17 * math.cos(a)), enamel('#ffd24a', 'blade'), 0.02, (a, math.radians(25), 0))
        sphere('fhub', 0.07, (0.66, 0, 0.8), BRASS())
        cyl('model', 0.12, 0.35, (-0.2, 0, 0.8), enamel('#e0443a', 'tmodel'), (0, -math.pi / 2, 0), bevel=0, r2=0.0)
        for i, z in enumerate((0.65, 0.8, 0.95)): box(f'wind{i}', (0.32, 0.01, 0.012), (-0.65, -0.1, z), pbsdf('windline', (1, 1, 1), emit=(0.8, 0.95, 1), estr=2), 0.004)
        return dict(target=(0, 0, 0.75), cam=(1.4, -3.8, 1.8), lens=48)
    if id_ == 'patent':
        W = wood('#7a4a22', 'desk')
        box('desk', (1.2, 0.6, 0.06), (0, 0, 0.62), W, 0.02); box('desk_f', (1.1, 0.5, 0.56), (0, 0.02, 0.32), W, 0.02)
        box('cert', (0.62, 0.02, 0.46), (-0.12, 0.05, 0.98), pbsdf('certp', hexc('#fffaf0'), rough=0.6), 0.005, (math.radians(-10), 0, 0))
        box('certf', (0.68, 0.025, 0.52), (-0.12, 0.062, 0.98), BRASS(), 0.008, (math.radians(-10), 0, 0))
        box('certstand', (0.06, 0.2, 0.3), (-0.12, 0.18, 0.8), W, 0.01, (math.radians(-10), 0, 0))
        sphere('seal', 0.07, (0.06, 0.0, 0.84), enamel('#c8402f', 'wax'), (1, 1, 0.3))
        cyl('stamp', 0.11, 0.07, (0.36, -0.08, 0.69), enamel('#c8402f', 'wax'), bevel=0.015)
        cyl('stamp_neck', 0.035, 0.12, (0.36, -0.08, 0.78), BRASS()); sphere('stamp_knob', 0.07, (0.36, -0.08, 0.88), wood('#5a2a10', 'knob'))
        return dict(target=(0, 0, 0.75), cam=(1.3, -3.0, 1.7), lens=50)
    return {}

def mixer_model():
    box('mbase', (0.6, 0.5, 0.32), (0, 0, 0.17), enamel('#6b3f1d', 'mbase'), 0.06)
    cyl('knob', 0.06, 0.05, (0.12, -0.27, 0.17), BRASS(), (math.pi / 2, 0, 0), bevel=0.01)
    sphere('mlamp', 0.04, (-0.12, -0.26, 0.2), pbsdf('mlamp', hexc('#ffd24a'), emit=hexc('#ffd24a'), estr=5))
    lathe('jar', [(0.0, 0.34), (0.2, 0.34), (0.22, 0.36), (0.27, 1.05), (0.28, 1.07), (0.265, 1.07), (0.255, 1.05), (0.205, 0.37), (0, 0.37)], (0, 0, 0), GLASS())
    lathe('mliquid', [(0, 0.37), (0.2, 0.37), (0.235, 0.7), (0, 0.7)], (0, 0, 0), tinted('mliq', '#5fc88a', 0.5))
    for i, (x, y, z, c) in enumerate(((0.08, 0.02, 0.6, '#3a9a4a'), (-0.08, -0.03, 0.52, '#4fb05a'), (0.02, 0.06, 0.78, '#e0443a'))):
        sphere(f'leaf{i}', 0.08, (x, y, z), enamel(c, 'leaf' + c), (1.2, 0.35, 0.6)).rotation_euler = (0.4 * i, 0.8, 0.3 * i)
    cyl('mlid', 0.29, 0.06, (0, 0, 1.1), enamel('#e9862c', 'orange'), bevel=0.02); sphere('mlid_k', 0.05, (0, 0, 1.16), BRASS())

# ── the closed jar (weekly event): glass with a shoulder and a threaded neck; contents by kind; the lid open or shut
def jar_model(kind, shut):
    G = clear_glass('jarglass')
    lathe('jar', [(0.0, 0.0), (0.34, 0.0), (0.38, 0.04), (0.39, 0.12), (0.39, 0.86), (0.36, 0.96), (0.26, 1.02), (0.25, 1.1), (0.24, 1.1), (0.245, 1.02), (0.35, 0.955), (0.38, 0.86), (0.38, 0.12), (0.37, 0.05), (0.33, 0.015), (0.0, 0.015)], (0, 0, 0), G, 72)
    for i in range(3): torus(f'thread{i}', 0.252, 0.006, (0, 0, 1.035 + i * 0.022), G)
    if kind == 'sea':
        lathe('sand', [(0, 0.016), (0.365, 0.016), (0.365, 0.16), (0, 0.19)], (0, 0, 0), noisy('#e8d6a8', '#cdb27a', 60, 'jsand'))
        lathe('water', [(0, 0.19), (0.364, 0.16), (0.364, 0.82), (0, 0.82)], (0, 0, 0), tinted('jwater', '#2a88c0', 0.55))
        for i, (x, y) in enumerate(((0.15, 0.1), (-0.18, -0.05), (0.05, -0.2))): sphere(f'peb{i}', 0.04, (x, y, 0.19), noisy('#8a8a90', '#5a5a62', 20, 'peb'), (1.3, 1, 0.6))
    elif kind == 'forest':
        lathe('soil', [(0, 0.016), (0.365, 0.016), (0.365, 0.2), (0, 0.24)], (0, 0, 0), noisy('#6a4428', '#3a2414', 50, 'jsoil'))
        for i in range(14):
            a = i * 2.39; r = 0.08 + (i % 5) * 0.06
            sphere(f'moss{i}', 0.07, (r * math.cos(a), r * math.sin(a), 0.24), noisy('#4f9a3a', '#2f6a2a', 90, 'jmoss'), (1.2, 1.2, 0.5))
    else:
        lathe('dune', [(0, 0.016), (0.365, 0.016), (0.365, 0.14), (0.2, 0.2), (0, 0.22)], (0, 0, 0), noisy('#ecc98a', '#d4a860', 70, 'jdesert'))
        for i, (x, y, s) in enumerate(((0.16, 0.08, 0.06), (-0.15, -0.1, 0.045), (0.02, 0.18, 0.035))): sphere(f'rock{i}', s, (x, y, 0.18), noisy('#b0704a', '#8a5030', 20, 'jrock'), (1.3, 1, 0.7))
    if shut:
        cyl('lid', 0.27, 0.07, (0, 0, 1.12), metal('#c8a050', 0.3, 'lidm'), bevel=0.015)
        for i in range(20): a = i / 20 * 2 * math.pi; box(f'knurl{i}', (0.012, 0.012, 0.05), (0.272 * math.cos(a), 0.272 * math.sin(a), 1.12), metal('#a88038', 0.35, 'knurl'), 0.003, (0, 0, a))
        cyl('wax', 0.09, 0.025, (0, 0, 1.165), enamel('#c8402f', 'wax'), bevel=0.01, r2=0.085); cyl('waxin', 0.05, 0.03, (0, 0, 1.175), enamel('#e0574a', 'waxin'), bevel=0.008)
    else:
        o = cyl('lid', 0.27, 0.07, (0.62, -0.05, 0.035), metal('#c8a050', 0.3, 'lidm'), bevel=0.015); o.rotation_euler = (0, 0, 0)
    return dict(target=(0, 0, 0.58), cam=(0.0, -3.4, 1.15), lens=55)

# ── the workshop's back wall (Avi, 5.11: "a wall of an inventors' lab, not plain wood"): riveted teal plates over a wooden
# wainscot, copper pipes with valves and gauges, a control panel with nickel buttons and toggles, two blueprints, shelves
# with glowing jars, hanging lamps. Rendered opaque, wide, as the background of the whole workshop.
def wall():
    TEAL = enamel('#2c5f66', 'wallteal'); TEAL2 = enamel('#33707a', 'wallteal2'); NICKEL = metal('#d6dde2', 0.18, 'nickel')
    W = wood('#6a3e1c', 'wainscot')
    for i in range(-5, 6):   # the plates, a grid with small gaps, alternating shades
        for j in range(4):
            box(f'pl{i}{j}', (0.96, 0.05, 0.96), (i * 1.0, 0.1, 1.68 + j * 1.0), TEAL if (i + j) % 2 else TEAL2, 0.02)
            rivets(f'rv{i}{j}', [(i * 1.0 + dx, 0.06, 1.68 + j * 1.0 + dz) for dx in (-0.42, 0.42) for dz in (-0.42, 0.42)], NICKEL, 0.022)
    for i in range(-11, 12): box(f'wp{i}', (0.48, 0.06, 1.12), (i * 0.5, 0.08, 0.56), W, 0.01)
    box('rail', (11.0, 0.12, 0.06), (0, 0.02, 1.15), BRASS(), 0.02)
    box('beam', (11.4, 0.4, 0.5), (0, -0.1, 5.25), W, 0.03); box('beamtrim', (11.4, 0.42, 0.06), (0, -0.1, 4.98), BRASS(), 0.01)
    box('floor', (11.0, 3.0, 0.05), (0, -1.5, -0.02), wood('#8a5a2a', 'floorw'), 0.0)
    # pipes along the top, an elbow down, valves and gauges
    tube('pipeA', [(-5.5, -0.05, 4.05), (-1.2, -0.05, 4.05), (-0.6, -0.05, 4.05), (-0.4, -0.05, 3.7), (-0.4, -0.05, 2.9)], 0.07, COPPER())
    tube('pipeB', [(0.8, -0.05, 3.85), (5.5, -0.05, 3.85)], 0.055, COPPER())
    for x in (-3.6, -1.9, 2.2, 4.0): torus(f'clamp{x}', 0.08, 0.02, (x, -0.05, 4.05 if x < 0 else 3.85), BRASS(), (0, math.pi / 2, 0))
    for k, (x, z) in enumerate(((-2.8, 4.05), (3.1, 3.85))):
        cyl(f'vstem{k}', 0.025, 0.25, (x, -0.2, z), BRASS(), (math.pi / 2, 0, 0)); torus(f'vwheel{k}', 0.13, 0.022, (x, -0.33, z), enamel('#c8402f', 'redknob'), (math.pi / 2, 0, 0))
        for a in range(3): box(f'vsp{k}{a}', (0.012, 0.012, 0.13), (x + 0.065 * math.sin(a * 2.094), -0.33, z + 0.065 * math.cos(a * 2.094)), enamel('#c8402f', 'redknob'), 0.003, (0, a * 2.094, 0))
    for k, (x, z) in enumerate(((-0.4, 2.75), (1.6, 3.55))):
        cyl(f'gface{k}', 0.2, 0.05, (x, -0.1, z), pbsdf('dialface', hexc('#fffaf0'), rough=0.4), (math.pi / 2, 0, 0), bevel=0)
        torus(f'gring{k}', 0.2, 0.03, (x, -0.13, z), BRASS(), (math.pi / 2, 0, 0)); box(f'gneedle{k}', (0.02, 0.01, 0.15), (x + 0.04, -0.15, z + 0.04), enamel('#d8402f', 'red'), 0.004, (0, -0.5, 0))
    # the control panel: nickel buttons, toggles and little lamps
    box('cpanel', (1.5, 0.12, 0.9), (2.6, -0.02, 2.35), enamel('#3a4048', 'panelgrey'), 0.04)
    for r in range(2):
        for c in range(4):
            cyl(f'btn{r}{c}', 0.075, 0.08, (2.08 + c * 0.34, -0.12, 2.55 - r * 0.32), NICKEL, (math.pi / 2, 0, 0), bevel=0.02)
            sphere(f'btnc{r}{c}', 0.05, (2.08 + c * 0.34, -0.17, 2.55 - r * 0.32), enamel(['#e0443a', '#f2c443', '#3a9a6a', '#3f7fd0'][(r + c) % 4], 'btncol' + str((r + c) % 4)), (1, 0.5, 1))
    for c in range(4):
        sphere(f'plamp{c}', 0.035, (2.08 + c * 0.34, -0.1, 2.12), pbsdf('pl' + str(c), hexc(['#7cf0a0', '#ffd24a', '#ff6a5a', '#7cc4ff'][c]), emit=hexc(['#7cf0a0', '#ffd24a', '#ff6a5a', '#7cc4ff'][c]), estr=12))
    # two blueprints in thin frames
    for k, (x, z) in enumerate(((-2.4, 2.6), (-4.3, 2.4))):
        box(f'bp{k}', (1.3 if k == 0 else 0.9, 0.03, 0.9), (x, -0.02, z), pbsdf('blueprint', hexc('#1f4f8a'), rough=0.7, emit=hexc('#1f4f8a'), estr=0.15), 0.005)
        box(f'bpf{k}', (1.38 if k == 0 else 0.98, 0.02, 0.98), (x, 0.0, z), W, 0.01)
        for li in range(5): box(f'bpl{k}{li}', ((0.9 if k == 0 else 0.6) - li * 0.1, 0.01, 0.012), (x, -0.04, z + 0.3 - li * 0.14), pbsdf('bpline', (0.9, 0.95, 1), emit=(0.8, 0.9, 1), estr=1.2), 0.003)
        torus(f'bpc{k}', 0.15, 0.01, (x + 0.3, -0.04, z - 0.1), pbsdf('bpline', (0.9, 0.95, 1), emit=(0.8, 0.9, 1), estr=1.2), (math.pi / 2, 0, 0))
    # shelves with glowing jars and a plant
    for k, (x, z) in enumerate(((0.9, 2.3), (4.6, 2.9))):
        box(f'sh{k}', (1.3, 0.35, 0.05), (x, -0.15, z), W, 0.01)
        for j in range(3):
            col = ['#7cf0a0', '#ffb84a', '#c08aff'][(j + k) % 3]
            lathe(f'jar{k}{j}', [(0, 0), (0.1, 0), (0.11, 0.2), (0.07, 0.24), (0.07, 0.27), (0, 0.27)], (x - 0.4 + j * 0.4, -0.15, z + 0.025), pbsdf('jarc' + col, hexc(col), rough=0.1, emit=hexc(col), estr=1.6))
            cyl(f'jcap{k}{j}', 0.075, 0.04, (x - 0.4 + j * 0.4, -0.15, z + 0.31), BRASS(), bevel=0.008)
    sphere('plant', 0.22, (5.2, -0.15, 3.15), noisy('#3f8a3a', '#2a6a2a', 30, 'plantn'), (1, 0.8, 0.8)); cyl('pot', 0.13, 0.2, (5.2, -0.15, 3.0), enamel('#b0562a', 'pot'), bevel=0.02, r2=0.1)
    # hanging lamps
    for k, x in enumerate((-3.3, -0.2, 3.3)):
        cyl(f'cord{k}', 0.012, 0.8, (x, -0.6, 4.6), DARK())   # hangs from the beam
        lathe(f'shade{k}', [(0.03, 0.0), (0.12, -0.04), (0.32, -0.28), (0.34, -0.3), (0.32, -0.3), (0.11, -0.06)], (x, -0.6, 4.2), enamel('#2f8a8a', 'teal'))
        sphere(f'lbulb{k}', 0.1, (x, -0.6, 3.95), pbsdf('lampbulb', hexc('#fff0c0'), emit=hexc('#ffd88a'), estr=40))
    return {}

# ── the jobs
JOBS = {}
def job(name, w, h, samples=40):
    def deco(fn): JOBS[name] = (fn, w, h, samples); return fn
    return deco
@job('wall', 1600, 900, 56)
def _wall():
    wall(); c = studio((0, 0, 2.3), (0, -7.6, 2.0), 24)
    bpy.context.scene.render.film_transparent = False
    w = bpy.context.scene.world; w.node_tree.nodes['Background'].inputs[1].default_value = 0.35
    for o in bpy.context.scene.objects:
        if o.name == 'ground': o.hide_render = True
    return {}
@job('machine', 640, 600, 48)
def _m():
    P = idea_machine(with_lever=False); studio((0.05, 0, 0.92), (1.7, -4.0, 1.8), 46)
    return P
@job('machine_lever', 640, 600, 32)
def _ml():
    P = idea_machine(with_lever=False, lever_only=True); studio((0.05, 0, 0.92), (1.7, -4.0, 1.8), 46)
    return P
for _id in ('umbrella', 'chair', 'bottle', 'shoe', 'bucket', 'bag', 'ladder', 'pillow', 'spoon', 'ball', 'hat', 'cup', 'torch', 'box', 'broom', 'tyre'):
    def _mk(i=_id):
        def f():
            thing(i); bpy.context.view_layer.update()
            pts = [o.matrix_world @ Vector(c) for o in bpy.context.scene.objects if o.type in ('MESH', 'CURVE') for c in o.bound_box]
            lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))); hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
            ctr = (lo + hi) / 2; size = max((hi - lo).length, 0.2)
            d = Vector((1.3, -2.2, 1.25)).normalized() * size * 2.25
            studio(tuple(ctr), tuple(ctr + d), 50); return {}
        return f
    JOBS['t_' + _id] = (_mk(), 256, 256, 36)
def _fit(view=(1.3, -2.2, 1.25), k=2.25):
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in bpy.context.scene.objects if o.type in ('MESH', 'CURVE') and not o.hide_render for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))); hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    ctr = (lo + hi) / 2; size = max((hi - lo).length, 0.2)
    studio(tuple(ctr), tuple(ctr + Vector(view).normalized() * size * k), 50)
for _id in ('p_box', 'p_ball', 'p_tube', 'p_cone', 'p_plate', 'p_dome', 'm_spring', 'm_wheel', 'm_pipe', 'm_pump', 'm_fan', 'm_chute',
            's_wind', 's_water', 's_heat', 's_sand', 's_drop', 's_noise',
            'c_road', 'c_phone', 'c_slide', 'c_eggs', 'c_roof', 'c_ship', 'c_school', 'c_building', 'c_umbrella', 'c_tent', 'c_window', 'c_bank', 'c_train', 'c_library', 'c_helmet', 'c_busstop', 'c_dronebox', 'c_turbine', 'c_beachchair', 'c_bike'):
    def _mp(i=_id):
        def f(): piece(i); _fit(); return {}
        return f
    JOBS[_id] = (_mp(), 192, 192, 32)
for _id in ('machine', 'mixer', 'cards', 'orders', 'build', 'test', 'patent'):
    def _ms(i=_id):
        def f():
            v = station(i); studio(v['target'], v['cam'], v['lens']); return {}
        return f
    JOBS['st_' + _id] = (_ms(), 420, 360, 40)
@job('blender', 300, 420, 48)
def _bl():
    mixer_model(); studio((0, 0, 0.66), (0.9, -3.4, 1.2), 55); return {}
for _k in ('sea', 'forest', 'sand'):
    for _s in (0, 1):
        def _mj(k=_k, s=_s):
            def f():
                v = jar_model(k, s); studio(v['target'], v['cam'], v['lens'])
                return {'inside': [px((-0.34, -0.39, 0.2), *JOBS[f'jar_{k}_{s}'][1:3]), px((0.34, -0.39, 0.82), *JOBS[f'jar_{k}_{s}'][1:3])]}
            return f
        JOBS[f'jar_{_k}_{_s}'] = (_mj(), 420, 520, 96)

def main():
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    out = args[0]; names = args[1:] or list(JOBS)
    os.makedirs(out, exist_ok=True)
    mp = os.path.join(out, 'meta.json'); meta = json.load(open(mp)) if os.path.exists(mp) else {}
    for n in names:
        fn, w, h, s = JOBS[n]
        reset(); _M.clear(); sc = bpy.context.scene; sc.render.resolution_x = w; sc.render.resolution_y = h; sc.render.resolution_percentage = 100
        P = fn() or {}
        info = {k: (px(v, w, h) if isinstance(v, tuple) else v) for k, v in P.items()}
        if 'window' in P: info['window_r'] = round(abs(px(P['window_r'], w, h)[0] - px(P['window'], w, h)[0]), 1)
        info['size'] = [w, h]; meta[n] = info
        render(os.path.join(out, n + '.png'), w, h, s)
        json.dump(meta, open(mp, 'w'), indent=1); print('done', n, flush=True)
if __name__ == '__main__':
    main()
