# reef_ground.py – seamless sea-floor textures for the reef, baked in Blender like the other zones' ground textures
# (ground_textures.py: real geometry seen from straight above, albedo × soft AO and a tangent-space normal map).
#   sand   – white coral sand with gentle ripples left by the waves, shell fragments and a few bits of coral rubble
#   rubble – broken coral branches and pebbles crusted with pink coralline algae and green turf, sand between them
# Needs pano_common.py (for the helpers) and ground_textures.py next to it (its functions are reused, its run block
# is not). reef_ground_job(kind) builds the tile, renders both passes into reef/ground/<kind>_a.png / _n.png.
import bpy, bmesh, math, random, os
from mathutils import Vector

ROOTD = os.path.dirname(D)
OUTD = os.path.join(ROOTD, 'reef', 'ground'); os.makedirs(OUTD, exist_ok=True)
_pc = os.path.join(ROOTD, 'pano_common.py')
exec(compile(open(_pc, encoding='utf-8').read(), _pc, 'exec'), globals())
P = bpy.app.driver_namespace["pano"]
_gt = os.path.join(ROOTD, 'ground_textures.py'); _src = open(_gt, encoding='utf-8').read()
exec(compile(_src[:_src.index('KIND = globals()')], _gt, 'exec'), globals())

def _ripples(nt, b, strength=0.45):
    """wave ripples on sand: a periodic wave pattern bent by noise, plus fine grain"""
    vec, w = periodic_coords(nt)
    nz = periodic_noise(nt, 1.1, 5, 0.55)
    wave = nt.nodes.new("ShaderNodeTexWave"); wave.wave_type = 'BANDS'; wave.bands_direction = 'X'
    wave.inputs["Scale"].default_value = 0.0
    # build the phase ourselves so it tiles: sin(2π·k·x / S + distortion)
    tc = nt.nodes.new("ShaderNodeTexCoord"); sx = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Object"], sx.inputs[0])
    m = nt.nodes.new("ShaderNodeMath"); m.operation = 'MULTIPLY'; m.inputs[1].default_value = 2 * math.pi * 9 / S
    nt.links.new(sx.outputs["X"], m.inputs[0])
    d = nt.nodes.new("ShaderNodeMath"); d.operation = 'MULTIPLY_ADD'; d.inputs[1].default_value = 9.0
    nt.links.new(nz.outputs["Fac"], d.inputs[0]); nt.links.new(m.outputs[0], d.inputs[2])
    sn = nt.nodes.new("ShaderNodeMath"); sn.operation = 'SINE'; nt.links.new(d.outputs[0], sn.inputs[0])
    grain = periodic_noise(nt, 40.0, 3, 0.7)
    h = nt.nodes.new("ShaderNodeMath"); h.operation = 'MULTIPLY_ADD'; h.inputs[1].default_value = 0.25
    nt.links.new(grain.outputs["Fac"], h.inputs[0]); nt.links.new(sn.outputs[0], h.inputs[2])
    bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = strength; bp.inputs["Distance"].default_value = 0.02
    nt.links.new(h.outputs[0], bp.inputs["Height"]); nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    # albedo: warm white sand, a little darker in the troughs, flecked
    rp = nt.nodes.new("ShaderNodeValToRGB"); cr = rp.color_ramp
    cr.elements[0].position = 0.0; cr.elements[0].color = (0.7, 0.63, 0.5, 1); cr.elements[1].position = 1.0; cr.elements[1].color = (0.86, 0.81, 0.69, 1)
    mr = nt.nodes.new("ShaderNodeMapRange"); mr.inputs["From Min"].default_value = -1.2; mr.inputs["From Max"].default_value = 1.2
    nt.links.new(h.outputs[0], mr.inputs["Value"]); nt.links.new(mr.outputs["Result"], rp.inputs["Fac"])
    nt.links.new(rp.outputs["Color"], b.inputs["Base Color"])

def _bits(sc, n, protos, zr=(0.0, 0.004), size=(0.01, 0.03)):
    for i in range(n):
        ob = bpy.data.objects.new("bit", random.choice(protos)); sc.collection.objects.link(ob)
        r = random.uniform(*size)
        ob.location = (random.uniform(-S / 2, S / 2), random.uniform(-S / 2, S / 2), random.uniform(*zr))
        ob.scale = (r, r * random.uniform(0.6, 1.2), r * random.uniform(0.4, 0.9))
        ob.rotation_euler = (random.uniform(-0.4, 0.4), random.uniform(-0.4, 0.4), random.uniform(0, math.tau))
        wrap_link(sc, ob)

def _protos(name, mat, kind, n=5):
    out = []
    for i in range(n):
        bm = bmesh.new()
        if kind == 'shell':        # a curved shell fragment
            bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=6, radius=1.0)
            for v in bm.verts: v.co.z = max(v.co.z, 0.0) * 0.35; v.co.x *= 1.3
        elif kind == 'twig':       # a broken coral branch: a knobbly capsule lying down
            bmesh.ops.create_cone(bm, cap_ends=True, segments=7, radius1=0.22, radius2=0.18, depth=2.0)
            for v in bm.verts:
                v.co.x += 0.06 * math.sin(v.co.z * 7 + i); v.co.y += 0.06 * math.cos(v.co.z * 5 + i)
            bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=__import__('mathutils').Matrix.Rotation(math.pi / 2, 3, 'Y'))
        else:                      # pebble
            bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
            for v in bm.verts: v.co.z *= 0.6; v.co *= 1 + 0.2 * random.random()
        me = bpy.data.meshes.new("%s%d" % (name, i)); bm.to_mesh(me); bm.free(); me.materials.append(mat)
        for p in me.polygons: p.use_smooth = True
        out.append(me)
    return out

def build_sand(sc, seed=11):
    random.seed(seed)
    m, nt, b = P["principled"]("tx_reefsand", (0.8, 0.74, 0.6), 0.95)
    _ripples(nt, b)
    ground_plane(sc, m)
    shell = P["random_ramp_material"]("tx_shell", [(0.0, (0.9, 0.86, 0.8)), (0.4, (0.95, 0.78, 0.72)), (0.7, (0.82, 0.7, 0.55)), (0.9, (0.7, 0.62, 0.66))], 40.0)
    rub = P["random_ramp_material"]("tx_rubw", [(0.0, (0.92, 0.9, 0.84)), (0.6, (0.85, 0.8, 0.72)), (0.9, (0.9, 0.7, 0.72))], 30.0)
    _bits(sc, 70, _protos("sh", shell, 'shell'), size=(0.004, 0.01))
    _bits(sc, 12, _protos("tw", rub, 'twig'), zr=(0.003, 0.006), size=(0.005, 0.011))
    dark = P["random_ramp_material"]("tx_grain", [(0.0, (0.3, 0.27, 0.24)), (0.5, (0.45, 0.4, 0.33))], 50.0)
    _bits(sc, 900, _protos("gr", dark, 'pebble'), size=(0.0012, 0.003))

def build_rubble(sc, seed=13):
    random.seed(seed)
    m, nt, b = P["principled"]("tx_rubsand", (0.72, 0.66, 0.54), 0.95)
    _ripples(nt, b, 0.25)
    ground_plane(sc, m)
    rub = P["random_ramp_material"]("tx_rub", [(0.0, (0.86, 0.83, 0.76)), (0.45, (0.78, 0.74, 0.66)), (0.7, (0.8, 0.6, 0.6)), (0.88, (0.62, 0.6, 0.5))], 25.0)
    _bits(sc, 420, _protos("rb", rub, 'twig', 7), zr=(0.0, 0.015), size=(0.007, 0.018))
    peb = P["random_ramp_material"]("tx_rpeb", [(0.0, (0.55, 0.52, 0.46)), (0.6, (0.7, 0.62, 0.56)), (0.85, (0.72, 0.52, 0.54))], 30.0)
    _bits(sc, 140, _protos("rp", peb, 'pebble'), size=(0.006, 0.022))

def reef_ground_job(kind):
    sc = scene(); P["clear_scene"](sc)
    prev = bpy.context.window.scene; bpy.context.window.scene = sc
    try:
        build_sand(sc) if kind == 'sand' else build_rubble(sc)
        setup(sc)
        sc.render.threads_mode = 'FIXED'; sc.render.threads = max(1, (os.cpu_count() or 4) - 2)   # gentle with the PC
        out = {}
        for which in ("albedo", "normal"):
            p = os.path.join(OUTD, '%s_%s.png' % (kind, 'a' if which == 'albedo' else 'n')); render_pass(sc, which, p); out[which] = p
        P["clear_scene"](sc)
        return {'ground_' + kind: out}
    finally:
        bpy.context.window.scene = prev
