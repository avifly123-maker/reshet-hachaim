# Seamless ground textures baked in Blender (top-down orthographic renders of real geometry / bump).
# Each texture: albedo (DiffCol × soft AO, sRGB) + tangent-space normal map (from the Normal pass).
# Seamless: scattered objects are copied at ±tile offsets (wrap), procedural bump uses 4D periodic noise.
# Run pano_common.py first (for helpers). Then:  KIND = 'litter' | 'moss' | 'grass' | 'lime' ; STEP = 'build' | 'render'
import bpy, bmesh, math, random, os
from mathutils import Vector
P = bpy.app.driver_namespace["pano"]
SC = "tex_bake"
S = 1.0          # tile size (Blender units); the game maps it to G.uGTile world units


def scene():
    sc = P["get_scene"](SC)
    bpy.context.window.scene = sc
    return sc


def wrap_link(sc, ob):
    """Place 8 linked duplicates around the tile so scattered geometry wraps seamlessly."""
    for dx in (-S, 0, S):
        for dy in (-S, 0, S):
            if dx == 0 and dy == 0: continue
            d = ob.copy(); d.location = ob.location + Vector((dx, dy, 0)); sc.collection.objects.link(d)


def periodic_coords(nt):
    """Texture-coordinate → torus mapping: (cos 2πu, sin 2πu, cos 2πv), W = sin 2πv → noise tiles exactly."""
    tc = nt.nodes.new("ShaderNodeTexCoord"); sx = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Object"], sx.inputs[0])
    out = []
    for comp in ("X", "Y"):
        m = nt.nodes.new("ShaderNodeMath"); m.operation = 'MULTIPLY'; m.inputs[1].default_value = 2 * math.pi / S
        nt.links.new(sx.outputs[comp], m.inputs[0])
        c = nt.nodes.new("ShaderNodeMath"); c.operation = 'COSINE'; nt.links.new(m.outputs[0], c.inputs[0])
        s = nt.nodes.new("ShaderNodeMath"); s.operation = 'SINE'; nt.links.new(m.outputs[0], s.inputs[0])
        out += [c, s]
    cx = nt.nodes.new("ShaderNodeCombineXYZ")
    nt.links.new(out[0].outputs[0], cx.inputs[0]); nt.links.new(out[1].outputs[0], cx.inputs[1]); nt.links.new(out[2].outputs[0], cx.inputs[2])
    return cx.outputs[0], out[3].outputs[0]      # vector, w


def periodic_noise(nt, scale, detail=6, rough=0.55, kind="noise"):
    vec, w = periodic_coords(nt)
    mul = nt.nodes.new("ShaderNodeVectorMath"); mul.operation = 'SCALE'; mul.inputs[3].default_value = scale
    nt.links.new(vec, mul.inputs[0])
    ww = nt.nodes.new("ShaderNodeMath"); ww.operation = 'MULTIPLY'; ww.inputs[1].default_value = scale; nt.links.new(w, ww.inputs[0])
    if kind == "voronoi":
        t = nt.nodes.new("ShaderNodeTexVoronoi"); t.voronoi_dimensions = '4D'
        nt.links.new(mul.outputs[0], t.inputs["Vector"]); nt.links.new(ww.outputs[0], t.inputs["W"])
        return t
    t = nt.nodes.new("ShaderNodeTexNoise"); t.noise_dimensions = '4D'; t.inputs["Detail"].default_value = detail; t.inputs["Roughness"].default_value = rough
    nt.links.new(mul.outputs[0], t.inputs["Vector"]); nt.links.new(ww.outputs[0], t.inputs["W"])
    return t


def ground_plane(sc, mat):
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=S * 1.6)
    me = bpy.data.meshes.new("tx_ground"); bm.to_mesh(me); bm.free(); me.materials.append(mat)
    ob = bpy.data.objects.new("tx_ground", me); sc.collection.objects.link(ob)
    return ob


def leaf_mesh(name, L, W, curl, lobed=False):
    bm = bmesh.new(); n = 14; rows = []
    for i in range(n + 1):
        t = i / n; y = (t - 0.5) * L
        half = W * 0.5 * math.sin(math.pi * t) ** (0.8 if not lobed else 0.6)
        row = []
        for k in (-1, -0.5, 0, 0.5, 1):
            x = half * k
            z = curl * (abs(k) ** 2) * W + 0.25 * curl * W * math.sin(math.pi * t)
            row.append(bm.verts.new((x, y, z)))
        rows.append(row)
    for i in range(n):
        for k in range(4):
            bm.faces.new((rows[i][k], rows[i][k + 1], rows[i + 1][k + 1], rows[i + 1][k]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    return me


def build_litter(sc, palette, n=520, seed=3, twigs=40, leafsize=(0.06, 0.16)):
    random.seed(seed)
    soil, snt, sb = P["principled"]("tx_soil", (0.05, 0.035, 0.022), 0.95)
    ground_plane(sc, soil)
    lm = P["random_ramp_material"]("tx_leaf", palette, 60.0)
    shapes = [leaf_mesh("lf%d" % i, *(lambda L: (L, L * random.uniform(0.35, 0.6), random.uniform(0.05, 0.35)))(random.uniform(*leafsize))) for i in range(6)]
    for me in shapes: me.materials.append(lm)
    for i in range(n):
        me = random.choice(shapes); ob = bpy.data.objects.new("leaf", me); sc.collection.objects.link(ob)
        ob.location = (random.uniform(-S / 2, S / 2), random.uniform(-S / 2, S / 2), 0.002 + i * 0.00004)
        ob.rotation_euler = (random.uniform(-0.25, 0.25), random.uniform(-0.25, 0.25), random.uniform(0, math.tau))
        s = random.uniform(0.7, 1.25); ob.scale = (s, s, s * random.choice((1, -1)) if False else s)
        wrap_link(sc, ob)
    tw, _, _ = P["principled"]("tx_twig", (0.07, 0.05, 0.035), 0.9)
    for i in range(twigs):
        bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=6, radius1=0.004, radius2=0.003, depth=random.uniform(0.08, 0.25))
        me = bpy.data.meshes.new("twig"); bm.to_mesh(me); bm.free(); me.materials.append(tw)
        ob = bpy.data.objects.new("twig", me); sc.collection.objects.link(ob)
        ob.location = (random.uniform(-S / 2, S / 2), random.uniform(-S / 2, S / 2), 0.02 + random.random() * 0.01)
        ob.rotation_euler = (math.pi / 2, 0, random.uniform(0, math.tau)); wrap_link(sc, ob)


def build_moss(sc, seed=5):
    random.seed(seed)
    base, bnt, bb = P["principled"]("tx_mossbase", (0.03, 0.05, 0.02), 1.0)
    t = periodic_noise(bnt, 6.0, 8, 0.6); bp = bnt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.6; bp.inputs["Distance"].default_value = 0.01
    bnt.links.new(t.outputs["Fac"], bp.inputs["Height"]); bnt.links.new(bp.outputs["Normal"], bb.inputs["Normal"])
    ground_plane(sc, base)
    pal = [(0.0, (0.04, 0.075, 0.02)), (0.3, (0.06, 0.1, 0.025)), (0.6, (0.085, 0.12, 0.03)), (0.85, (0.11, 0.13, 0.04))]
    mm = P["random_ramp_material"]("tx_moss", pal, 140.0)
    protos = []
    for i in range(5):
        bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
        for v in bm.verts: v.co.z *= 0.5; v.co *= 1 + 0.15 * random.random()
        me = bpy.data.meshes.new("mo%d" % i); bm.to_mesh(me); bm.free(); me.materials.append(mm)
        for p in me.polygons: p.use_smooth = True
        protos.append(me)
    for i in range(1400):
        ob = bpy.data.objects.new("moss", random.choice(protos)); sc.collection.objects.link(ob)
        r = random.uniform(0.012, 0.045)
        ob.location = (random.uniform(-S / 2, S / 2), random.uniform(-S / 2, S / 2), -r * 0.25)
        ob.scale = (r, r * random.uniform(0.8, 1.2), r); ob.rotation_euler = (0, 0, random.uniform(0, math.tau))
        wrap_link(sc, ob)


def build_grass(sc, seed=7):
    random.seed(seed)
    soil, snt, sb = P["principled"]("tx_rossa", (0.2, 0.085, 0.045), 0.95)
    t = periodic_noise(snt, 5.0, 6, 0.6); bp = snt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.5; bp.inputs["Distance"].default_value = 0.01
    snt.links.new(t.outputs["Fac"], bp.inputs["Height"]); snt.links.new(bp.outputs["Normal"], sb.inputs["Normal"])
    ground_plane(sc, soil)
    gpal = [(0.0, (0.06, 0.1, 0.025)), (0.25, (0.09, 0.13, 0.03)), (0.5, (0.13, 0.15, 0.04)), (0.7, (0.2, 0.17, 0.06)), (0.88, (0.26, 0.21, 0.09))]
    gm = P["random_ramp_material"]("tx_blade", gpal, 200.0)
    ppal = [(0.0, (0.35, 0.32, 0.27)), (0.5, (0.45, 0.42, 0.35)), (0.8, (0.28, 0.22, 0.18))]
    pm = P["random_ramp_material"]("tx_pebble", ppal, 80.0)
    blades = []
    for i in range(4):
        bm = bmesh.new(); L = random.uniform(0.05, 0.12); w = 0.004
        v0 = bm.verts.new((-w, 0, 0)); v1 = bm.verts.new((w, 0, 0)); v2 = bm.verts.new((0.6 * w, L * 0.6, 0.004)); v3 = bm.verts.new((0, L, 0.0))
        bm.faces.new((v0, v1, v2)); bm.faces.new((v0, v2, v3))
        me = bpy.data.meshes.new("bl%d" % i); bm.to_mesh(me); bm.free(); me.materials.append(gm); blades.append(me)
    for i in range(2600):
        cx, cy = random.uniform(-S / 2, S / 2), random.uniform(-S / 2, S / 2)
        if random.random() < 0.35 and i > 50: continue
        ob = bpy.data.objects.new("blade", random.choice(blades)); sc.collection.objects.link(ob)
        ob.location = (cx, cy, 0.003 + random.random() * 0.01)
        ob.rotation_euler = (random.uniform(-0.3, 0.3), random.uniform(-0.3, 0.3), random.uniform(0, math.tau)); wrap_link(sc, ob)
    pebs = []
    for i in range(4):
        bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
        for v in bm.verts: v.co.z *= 0.55; v.co.x *= 1 + 0.3 * random.random()
        me = bpy.data.meshes.new("pb%d" % i); bm.to_mesh(me); bm.free(); me.materials.append(pm)
        for p in me.polygons: p.use_smooth = True
        pebs.append(me)
    for i in range(160):
        ob = bpy.data.objects.new("pebble", random.choice(pebs)); sc.collection.objects.link(ob)
        r = random.uniform(0.006, 0.025)
        ob.location = (random.uniform(-S / 2, S / 2), random.uniform(-S / 2, S / 2), 0); ob.scale = (r, r, r)
        ob.rotation_euler = (0, 0, random.uniform(0, math.tau)); wrap_link(sc, ob)


def build_lime(sc):
    m, nt, b = P["principled"]("tx_lime", (0.5, 0.46, 0.38), 0.9)
    vor = periodic_noise(nt, 0.9, kind="voronoi"); vor.feature = 'DISTANCE_TO_EDGE'
    crack = nt.nodes.new("ShaderNodeMapRange"); crack.inputs["From Min"].default_value = 0.0; crack.inputs["From Max"].default_value = 0.06
    nt.links.new(vor.outputs["Distance"], crack.inputs["Value"])
    nz = periodic_noise(nt, 2.5, 10, 0.62)
    h = nt.nodes.new("ShaderNodeMath"); h.operation = 'MULTIPLY'; nt.links.new(crack.outputs["Result"], h.inputs[0]); nt.links.new(nz.outputs["Fac"], h.inputs[1])
    bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.9; bp.inputs["Distance"].default_value = 0.02
    nt.links.new(h.outputs[0], bp.inputs["Height"]); nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    # albedo: pale stone, darker in cracks and lichen blotches
    nz2 = periodic_noise(nt, 1.1, 6, 0.55)
    rp = nt.nodes.new("ShaderNodeValToRGB"); cr = rp.color_ramp
    cr.elements[0].position = 0.35; cr.elements[0].color = (0.42, 0.39, 0.33, 1); cr.elements[1].position = 0.65; cr.elements[1].color = (0.58, 0.54, 0.46, 1)
    e = cr.elements.new(0.8); e.color = (0.36, 0.38, 0.3, 1)
    nt.links.new(nz2.outputs["Fac"], rp.inputs["Fac"])
    mx = nt.nodes.new("ShaderNodeMix"); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs[0].default_value = 1.0
    nt.links.new(rp.outputs["Color"], mx.inputs[6]); nt.links.new(crack.outputs["Result"], mx.inputs[7])
    cmb = nt.nodes.new("ShaderNodeMix"); cmb.data_type = 'RGBA'; cmb.inputs[0].default_value = 0.65
    nt.links.new(rp.outputs["Color"], cmb.inputs[6]); nt.links.new(mx.outputs[2], cmb.inputs[7])
    nt.links.new(cmb.outputs[2], b.inputs["Base Color"])
    ground_plane(sc, m)


def setup(sc, res=1024):
    for o in [o for o in sc.collection.objects if o.type in ('LIGHT', 'CAMERA')]: bpy.data.objects.remove(o, do_unlink=True)
    w = bpy.data.worlds.get("tx_world") or bpy.data.worlds.new("tx_world"); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes.get("Background") or w.node_tree.nodes.new("ShaderNodeBackground"); bg.inputs[1].default_value = 1.0
    cd = bpy.data.cameras.new("tx_cam"); cd.type = 'ORTHO'; cd.ortho_scale = S; cd.clip_start = 0.01; cd.clip_end = 10
    cam = bpy.data.objects.new("tx_cam", cd); sc.collection.objects.link(cam); cam.location = (0, 0, 2); cam.rotation_euler = (0, 0, 0); sc.camera = cam
    r = sc.render; r.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 24; sc.cycles.use_denoising = False
    r.resolution_x = r.resolution_y = res; r.resolution_percentage = 100; r.film_transparent = False
    r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGB'; r.image_settings.color_depth = '8'
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'; sc.view_settings.exposure = 0
    vl = sc.view_layers[0]; vl.use_pass_diffuse_color = True; vl.use_pass_normal = True; vl.use_pass_ambient_occlusion = True
    # compositor groups: albedo (DiffCol × AO^0.5) and normal (n * 0.5 + 0.5)
    def group(name):
        g = bpy.data.node_groups.get(name) or bpy.data.node_groups.new(name, "CompositorNodeTree"); g.nodes.clear()
        if not g.interface.items_tree: g.interface.new_socket("Image", in_out='OUTPUT', socket_type='NodeSocketColor')
        rl = g.nodes.new("CompositorNodeRLayers"); rl.scene = sc; go = g.nodes.new("NodeGroupOutput"); return g, rl, go
    g, rl, go = group("tx_albedo")
    pw = g.nodes.new("ShaderNodeMath"); pw.operation = 'POWER'; pw.inputs[1].default_value = 0.5
    sepa = g.nodes.new("CompositorNodeRGBToBW"); g.links.new(rl.outputs["Ambient Occlusion"], sepa.inputs[0]); g.links.new(sepa.outputs[0], pw.inputs[0])
    mx = g.nodes.new("ShaderNodeMix"); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs[0].default_value = 1.0
    g.links.new(rl.outputs["Diffuse Color"], mx.inputs[6]); g.links.new(pw.outputs[0], mx.inputs[7]); g.links.new(mx.outputs[2], go.inputs[0])
    g2, rl2, go2 = group("tx_normal")
    vm = g2.nodes.new("ShaderNodeVectorMath"); vm.operation = 'MULTIPLY_ADD'; vm.inputs[1].default_value = (0.5, 0.5, 0.5); vm.inputs[2].default_value = (0.5, 0.5, 0.5)
    g2.links.new(rl2.outputs["Normal"], vm.inputs[0]); g2.links.new(vm.outputs[0], go2.inputs[0])


def render_pass(sc, which, path):
    sc.compositing_node_group = bpy.data.node_groups["tx_" + which]
    # the normal map must be stored without the sRGB display curve
    sc.view_settings.view_transform = 'Standard' if which == "albedo" else 'Raw'
    sc.render.filepath = path; bpy.ops.render.render(write_still=True)
    sc.view_settings.view_transform = 'Standard'


KIND = globals().get("KIND", "litter"); STEP = globals().get("STEP", "build")
if STEP == "build":
    sc = scene(); P["clear_scene"](sc)
    if KIND == "litter":
        build_litter(sc, [(0.0, (0.16, 0.08, 0.03)), (0.2, (0.24, 0.12, 0.04)), (0.4, (0.3, 0.17, 0.06)), (0.55, (0.12, 0.06, 0.03)),
                          (0.7, (0.36, 0.22, 0.07)), (0.82, (0.08, 0.05, 0.03)), (0.92, (0.22, 0.2, 0.07))])
    elif KIND == "moss": build_moss(sc)
    elif KIND == "grass": build_grass(sc)
    elif KIND == "lime": build_lime(sc)
    setup(sc)
    result = {"objects": len(sc.collection.all_objects)}
else:
    sc = scene()
    out = {}
    for which in ("albedo", "normal"):
        p = P["tmp"]("tx_%s_%s.png" % (KIND, which)); render_pass(sc, which, p); out[which] = p
    result = out
