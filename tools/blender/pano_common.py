# Shared helpers for the horizon panoramas (Blender 5.x). Registered in bpy.app.driver_namespace["pano"]
# so later MCP calls can reuse them without resending the code.
import bpy, bmesh, math, os, tempfile, time, base64
from mathutils import noise, Vector


def fbm(x, y, oct=5, lac=2.0, g=0.5, z=0.0):
    a, f, s = 1.0, 1.0, 0.0
    for i in range(oct):
        s += a * noise.noise(Vector((x * f, y * f, z + 0.37 * i)))
        a *= g; f *= lac
    return s


def sstep(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def get_scene(name):
    sc = bpy.data.scenes.get(name) or bpy.data.scenes.new(name)
    return sc


def clear_scene(sc):
    for o in list(sc.collection.all_objects):
        bpy.data.objects.remove(o, do_unlink=True)


def polar_terrain(sc, name, height, NA=900, NR=170, R0=150.0, R1=45000.0):
    """Polar grid (fine near the centre, coarse far away) displaced by height(x, y)."""
    bm = bmesh.new(); rows = []
    for i in range(NR + 1):
        r = R0 * (R1 / R0) ** (i / NR); row = []
        for j in range(NA):
            th = j / NA * math.tau; x, y = math.cos(th) * r, math.sin(th) * r
            row.append(bm.verts.new((x, y, height(x, y))))
        rows.append(row)
    for i in range(NR):
        for j in range(NA):
            j1 = (j + 1) % NA
            bm.faces.new((rows[i][j], rows[i][j1], rows[i + 1][j1], rows[i + 1][j]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    ob = bpy.data.objects.get(name)
    if ob is None:
        ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob)
    else:
        old = ob.data; ob.data = me; bpy.data.meshes.remove(old)
    return ob


def set_group(ob, gname, weight_fn):
    """Vertex group from weight_fn(x, y, z, normal) → 0..1 (bucketed for speed)."""
    vg = ob.vertex_groups.get(gname) or ob.vertex_groups.new(name=gname)
    buckets = {}
    for v in ob.data.vertices:
        w = weight_fn(v.co.x, v.co.y, v.co.z, v.normal)
        buckets.setdefault(round(max(0.0, min(1.0, w)), 2), []).append(v.index)
    for w, ids in buckets.items(): vg.add(ids, w, 'REPLACE')
    return vg


def principled(name, color=(0.5, 0.5, 0.5), rough=0.9):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    o = nt.nodes.new("ShaderNodeOutputMaterial"); b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    b.inputs["Base Color"].default_value = (*color, 1); b.inputs["Roughness"].default_value = rough
    if "Specular IOR Level" in b.inputs: b.inputs["Specular IOR Level"].default_value = 0.0
    nt.links.new(b.outputs["BSDF"], o.inputs["Surface"])
    return m, nt, b


def random_ramp_material(name, palette, bump_scale=0.9):
    """Per-instance colour from Object Info → Random through a constant colour ramp."""
    m, nt, b = principled(name)
    oi = nt.nodes.new("ShaderNodeObjectInfo"); rp = nt.nodes.new("ShaderNodeValToRGB")
    cr = rp.color_ramp; cr.interpolation = 'CONSTANT'
    cr.elements[0].position = palette[0][0]; cr.elements[0].color = (*palette[0][1], 1)
    cr.elements[1].position = palette[1][0]; cr.elements[1].color = (*palette[1][1], 1)
    for p, c in palette[2:]:
        e = cr.elements.new(p); e.color = (*c, 1)
    nt.links.new(oi.outputs["Random"], rp.inputs["Fac"]); nt.links.new(rp.outputs["Color"], b.inputs["Base Color"])
    vor = nt.nodes.new("ShaderNodeTexVoronoi"); vor.inputs["Scale"].default_value = bump_scale
    bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.8
    nt.links.new(vor.outputs["Distance"], bp.inputs["Height"]); nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    return m


def blob_crowns(col, mat, specs, seed=1):
    """Crown prototypes made of several flattened icospheres. specs: list of (name, radius, flat, lift, lumps)."""
    import random
    random.seed(seed)
    for o in list(col.objects): bpy.data.objects.remove(o, do_unlink=True)
    for name, rad, flat, lift, lumps in specs:
        bm = bmesh.new()
        for k in range(lumps):
            a = random.random() * math.tau; d = rad * random.uniform(0.15, 0.6) if k else 0
            c = Vector((math.cos(a) * d, math.sin(a) * d, lift + random.uniform(-0.1, 0.3) * rad * flat))
            r = rad * (0.75 if k == 0 else random.uniform(0.35, 0.6))
            res = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=r)
            for v in res["verts"]:
                v.co.z *= flat; v.co += c
        me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(mat)
        ob = bpy.data.objects.new(name, me); col.objects.link(ob); ob.hide_viewport = True


def scatter(ob, psname, col, count, group, size_random=0.35, seed=4):
    ps = ob.particle_systems.get(psname)
    if ps is None:
        ob.modifiers.new(psname, 'PARTICLE_SYSTEM'); ps = ob.particle_systems[-1]; ps.name = psname
    s = ps.settings
    s.type = 'HAIR'; s.use_advanced_hair = True; s.count = count; s.hair_length = 1.0
    s.render_type = 'COLLECTION'; s.instance_collection = col; s.use_collection_pick_random = True
    s.particle_size = 1.0; s.size_random = size_random
    s.use_rotations = True; s.rotation_mode = 'NONE'; s.phase_factor_random = 2.0
    s.distribution = 'RAND'; s.use_even_distribution = True
    ps.vertex_group_density = group; ps.seed = seed
    return ps


def setup_render(sc, sun_rot, sun_energy, sun_color, sky_strength, haze_rgb, mist_start, mist_depth, cam_h=450.0, lat=(-20, 7)):
    w = bpy.data.worlds.get(sc.name + "_world") or bpy.data.worlds.new(sc.name + "_world")
    sc.world = w; w.use_nodes = True; nt = w.node_tree; nt.nodes.clear()
    bg = nt.nodes.new("ShaderNodeBackground"); out = nt.nodes.new("ShaderNodeOutputWorld"); sky = nt.nodes.new("ShaderNodeTexSky")
    try:
        sky.sky_type = 'NISHITA'; sky.sun_elevation = math.radians(32); sky.sun_rotation = math.radians(60)
    except Exception:
        pass
    bg.inputs["Strength"].default_value = sky_strength
    nt.links.new(sky.outputs[0], bg.inputs[0]); nt.links.new(bg.outputs[0], out.inputs[0])
    w.mist_settings.start = mist_start; w.mist_settings.depth = mist_depth; w.mist_settings.falloff = 'LINEAR'
    for o in [o for o in sc.collection.objects if o.type in ('LIGHT', 'CAMERA')]: bpy.data.objects.remove(o, do_unlink=True)
    ld = bpy.data.lights.new(sc.name + "_sun", 'SUN'); ld.energy = sun_energy; ld.angle = math.radians(3); ld.color = sun_color
    sun = bpy.data.objects.new(sc.name + "_sun", ld); sc.collection.objects.link(sun); sun.rotation_euler = sun_rot
    cd = bpy.data.cameras.new(sc.name + "_cam"); cd.type = 'PANO'; cd.panorama_type = 'EQUIRECTANGULAR'
    cd.latitude_min, cd.latitude_max = math.radians(lat[0]), math.radians(lat[1])
    cd.longitude_min, cd.longitude_max = -math.pi, math.pi
    cd.clip_start = 1.0; cd.clip_end = 100000.0
    cam = bpy.data.objects.new(sc.name + "_cam", cd); sc.collection.objects.link(cam)
    cam.location = (0, 0, cam_h); cam.rotation_euler = (math.radians(90), 0, 0); sc.camera = cam
    r = sc.render; r.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 40; sc.cycles.use_denoising = True
    r.film_transparent = True; r.resolution_percentage = 100
    r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGBA'; r.image_settings.color_depth = '8'
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'; sc.view_settings.exposure = -0.3
    sc.view_layers[0].use_pass_mist = True
    # compositor: haze = mix(image, haze colour, mist * 0.92), keep alpha
    ng = bpy.data.node_groups.get(sc.name + "_comp") or bpy.data.node_groups.new(sc.name + "_comp", "CompositorNodeTree")
    ng.nodes.clear()
    if not ng.interface.items_tree: ng.interface.new_socket("Image", in_out='OUTPUT', socket_type='NodeSocketColor')
    N, L = ng.nodes, ng.links
    rl = N.new("CompositorNodeRLayers"); rl.scene = sc
    mix = N.new("ShaderNodeMix"); mix.data_type = 'RGBA'; mix.inputs[7].default_value = (*haze_rgb, 1.0)
    mul = N.new("ShaderNodeMath"); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 0.92
    L.new(rl.outputs["Mist"], mul.inputs[0]); L.new(mul.outputs[0], mix.inputs[0]); L.new(rl.outputs["Image"], mix.inputs[6])
    sa = N.new("CompositorNodeSetAlpha"); L.new(mix.outputs[2], sa.inputs[0]); L.new(rl.outputs["Alpha"], sa.inputs[1])
    go = N.new("NodeGroupOutput"); L.new(sa.outputs[0], go.inputs[0])
    sc.compositing_node_group = ng
    # mist-only compositor (for the in-game re-hazing factor)
    mg = bpy.data.node_groups.get(sc.name + "_mist") or bpy.data.node_groups.new(sc.name + "_mist", "CompositorNodeTree")
    mg.nodes.clear()
    if not mg.interface.items_tree: mg.interface.new_socket("Image", in_out='OUTPUT', socket_type='NodeSocketColor')
    rl2 = mg.nodes.new("CompositorNodeRLayers"); rl2.scene = sc; go2 = mg.nodes.new("NodeGroupOutput")
    mg.links.new(rl2.outputs["Mist"], go2.inputs[0])


def tmp(name):
    return os.path.join(tempfile.gettempdir(), name)


def start_quarter(sc, q, prefix, res=(2048, 614)):
    """Async (non-blocking) render of one 90° quarter; poll the file afterwards."""
    bpy.context.window.scene = sc
    cd = sc.camera.data; lo = -math.pi + q * math.pi / 2
    cd.longitude_min, cd.longitude_max = lo, lo + math.pi / 2
    sc.render.resolution_x, sc.render.resolution_y = res
    p = tmp("%s_q%d.png" % (prefix, q)); sc.render.filepath = p
    if os.path.exists(p): os.remove(p)
    with bpy.context.temp_override(window=bpy.context.window_manager.windows[0]):
        return str(bpy.ops.render.render('INVOKE_DEFAULT', write_still=True))


def render_mist(sc, prefix, res=(2048, 461)):
    """Blocking low-sample render of the mist pass for the full 360°."""
    bpy.context.window.scene = sc
    keep = sc.compositing_node_group; sc.compositing_node_group = bpy.data.node_groups[sc.name + "_mist"]
    cd = sc.camera.data; cd.longitude_min, cd.longitude_max = -math.pi, math.pi
    s0, d0, ft = sc.cycles.samples, sc.cycles.use_denoising, sc.render.film_transparent
    sc.cycles.samples = 4; sc.cycles.use_denoising = False; sc.render.film_transparent = False
    sc.render.image_settings.color_mode = 'BW'
    sc.render.resolution_x, sc.render.resolution_y = res
    p = tmp(prefix + "_mist.png"); sc.render.filepath = p
    bpy.ops.render.render(write_still=True)
    sc.compositing_node_group = keep; sc.cycles.samples = s0; sc.cycles.use_denoising = d0; sc.render.film_transparent = ft
    sc.render.image_settings.color_mode = 'RGBA'
    return p


def b64(path):
    return base64.b64encode(open(path, "rb").read()).decode()


bpy.app.driver_namespace["pano"] = dict(fbm=fbm, sstep=sstep, get_scene=get_scene, clear_scene=clear_scene,
    polar_terrain=polar_terrain, set_group=set_group, principled=principled, random_ramp_material=random_ramp_material,
    blob_crowns=blob_crowns, scatter=scatter, setup_render=setup_render, tmp=tmp, start_quarter=start_quarter,
    render_mist=render_mist, b64=b64)


def mesh_arrays(ob):
    """Read coordinates and normals once (writing attributes invalidates the normal cache → never read v.normal in a write loop)."""
    me = ob.data; n = len(me.vertices)
    co = [0.0] * (n * 3); me.vertices.foreach_get("co", co)
    nr = [0.0] * (n * 3); me.vertices.foreach_get("normal", nr)
    return n, co, nr


def set_group_values(ob, gname, vals):
    vg = ob.vertex_groups.get(gname) or ob.vertex_groups.new(name=gname)
    buckets = {}
    for i, w in enumerate(vals): buckets.setdefault(round(max(0.0, min(1.0, w)), 2), []).append(i)
    for w, ids in buckets.items(): vg.add(ids, w, 'REPLACE')


bpy.app.driver_namespace["pano"].update(mesh_arrays=mesh_arrays, set_group_values=set_group_values)
