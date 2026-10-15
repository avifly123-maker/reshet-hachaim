# Grove (Israeli Mediterranean woodland) horizon panorama. Needs pano_common.py run first.
# Run in steps (each MCP call must stay under ~60 s):  STEP = 1 (terrain) / 2 (masks) / 3 (materials, scatter, render setup)
import bpy, math
P = bpy.app.driver_namespace["pano"]
fbm, sstep = P["fbm"], P["sstep"]
SC = "grove_pano"


def gheight(x, y):
    r = math.hypot(x, y)
    h = fbm(x * 0.00042, y * 0.00042, 4, z=11.0) * 230 + fbm(x * 0.0016, y * 0.0016, 3, z=3.0) * 45 + fbm(x * 0.007, y * 0.007, 2) * 5
    rid = max(0.0, 1 - abs(fbm(x * 0.00016, y * 0.00016, 4, z=21.0)))
    h += (rid ** 2.0) * 650 * sstep(7000, 15000, r)
    wadi = abs(fbm(x * 0.00028 + 7, y * 0.00028 - 3, 3, z=31.0))
    h -= (1 - sstep(0.0, 0.09, wadi)) * 70
    return h


def step1():
    sc = P["get_scene"](SC); P["clear_scene"](sc)
    ob = P["polar_terrain"](sc, "g_terrain", gheight, NA=1000, NR=180)
    return {"verts": len(ob.data.vertices)}


def radial(r):
    return 0.0 if r < 650 else (1.0 if r < 6500 else max(0.0, 1 - (r - 6500) / 1500))


def tmask(x, y, s):
    return sstep(0.0, 0.3, fbm(x * 0.0009, y * 0.0009, 3, z=41.0)) * sstep(0.015, 0.05, s) * (1 - sstep(0.22, 0.32, s))


def step2():
    ob = bpy.data.objects["g_terrain"]; me = ob.data
    ca = me.color_attributes.get("tmask") or me.color_attributes.new("tmask", 'FLOAT_COLOR', 'POINT')
    for v in me.vertices:
        s = 1 - v.normal.z
        ca.data[v.index].color = (tmask(v.co.x, v.co.y, s), s, 0, 1)
    P["set_group"](ob, "wood", lambda x, y, z, n: sstep(-0.15, 0.4, fbm(x * 0.0011, y * 0.0011, 3, z=51.0)) * (1 - 0.85 * tmask(x, y, 1 - n.z)) * radial(math.hypot(x, y)))
    P["set_group"](ob, "olive", lambda x, y, z, n: tmask(x, y, 1 - n.z) * radial(math.hypot(x, y)))
    P["set_group"](ob, "rock", lambda x, y, z, n: min(1.0, sstep(0.08, 0.3, 1 - n.z) * 0.8 + sstep(120, 260, z) * 0.4) * radial(math.hypot(x, y)))
    return {"ok": 1}


def terrain_material():
    m, nt, b = P["principled"]("g_terrain_mat", rough=0.95)
    N, L = nt.nodes, nt.links
    tc = N.new("ShaderNodeTexCoord"); attr = N.new("ShaderNodeAttribute"); attr.attribute_name = "tmask"
    sep = N.new("ShaderNodeSeparateColor"); L.new(attr.outputs["Color"], sep.inputs[0])
    geo = N.new("ShaderNodeNewGeometry"); sxyz = N.new("ShaderNodeSeparateXYZ"); L.new(geo.outputs["Position"], sxyz.inputs[0])
    # ground: grass / dry gold / terra rossa by large noise
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 0.0025; nz.inputs["Detail"].default_value = 6
    L.new(tc.outputs["Object"], nz.inputs["Vector"])
    rp = N.new("ShaderNodeValToRGB"); cr = rp.color_ramp
    cr.elements[0].position = 0.35; cr.elements[0].color = (0.075, 0.11, 0.032, 1)
    cr.elements[1].position = 0.62; cr.elements[1].color = (0.24, 0.19, 0.075, 1)
    e = cr.elements.new(0.48); e.color = (0.14, 0.14, 0.05, 1)
    e = cr.elements.new(0.75); e.color = (0.19, 0.095, 0.05, 1)
    L.new(nz.outputs["Fac"], rp.inputs["Fac"])
    # limestone on steeper ground
    stone = (0.40, 0.36, 0.29, 1)
    ms = N.new("ShaderNodeMapRange"); ms.inputs["From Min"].default_value = 0.12; ms.inputs["From Max"].default_value = 0.32
    L.new(sep.outputs["Green"], ms.inputs["Value"])
    mix1 = N.new("ShaderNodeMix"); mix1.data_type = 'RGBA'; mix1.inputs[7].default_value = stone
    L.new(ms.outputs["Result"], mix1.inputs[0]); L.new(rp.outputs["Color"], mix1.inputs[6])
    # terraces: light dry-stone risers every 4.5 m of height where the terrace mask is on
    dv = N.new("ShaderNodeMath"); dv.operation = 'DIVIDE'; dv.inputs[1].default_value = 4.5; L.new(sxyz.outputs["Z"], dv.inputs[0])
    fr = N.new("ShaderNodeMath"); fr.operation = 'FRACT'; L.new(dv.outputs[0], fr.inputs[0])
    st = N.new("ShaderNodeMapRange"); st.interpolation_type = 'SMOOTHSTEP'; st.inputs["From Min"].default_value = 0.8; st.inputs["From Max"].default_value = 0.93
    L.new(fr.outputs[0], st.inputs["Value"])
    mt = N.new("ShaderNodeMath"); mt.operation = 'MULTIPLY'; L.new(st.outputs["Result"], mt.inputs[0]); L.new(sep.outputs["Red"], mt.inputs[1])
    mix2 = N.new("ShaderNodeMix"); mix2.data_type = 'RGBA'; mix2.inputs[7].default_value = (0.5, 0.46, 0.38, 1)
    L.new(mt.outputs[0], mix2.inputs[0]); L.new(mix1.outputs[2], mix2.inputs[6])
    L.new(mix2.outputs[2], b.inputs["Base Color"])
    ob = bpy.data.objects["g_terrain"]; ob.data.materials.clear(); ob.data.materials.append(m)


def step3():
    sc = P["get_scene"](SC)
    terrain_material()
    def coll(name):
        c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
        if c.name not in sc.collection.children: sc.collection.children.link(c)
        return c
    wood_pal = [(0.0, (0.018, 0.038, 0.014)), (0.3, (0.03, 0.055, 0.02)), (0.55, (0.022, 0.045, 0.02)), (0.75, (0.045, 0.07, 0.025)), (0.9, (0.035, 0.05, 0.03))]
    olive_pal = [(0.0, (0.085, 0.1, 0.065)), (0.5, (0.11, 0.12, 0.08)), (0.8, (0.07, 0.085, 0.05))]
    rock_pal = [(0.0, (0.42, 0.39, 0.33)), (0.5, (0.5, 0.47, 0.4)), (0.8, (0.36, 0.33, 0.28))]
    wm = P["random_ramp_material"]("g_wood_mat", wood_pal, 1.6)
    om = P["random_ramp_material"]("g_olive_mat", olive_pal, 2.4)
    rm = P["random_ramp_material"]("g_rock_mat", rock_pal, 1.2)
    cw, co, ck = coll("g_wood"), coll("g_olive"), coll("g_rock")
    import random
    random.seed(5)
    P["blob_crowns"](cw, wm, [("gw%d" % i, random.uniform(3.2, 5.5), random.uniform(0.7, 0.85), 1.5, random.randint(4, 6)) for i in range(6)], seed=5)
    P["blob_crowns"](co, om, [("go%d" % i, random.uniform(2.2, 3.0), 0.8, 1.2, random.randint(3, 5)) for i in range(4)], seed=6)
    P["blob_crowns"](ck, rm, [("gr%d" % i, random.uniform(1.2, 2.6), 0.45, 0.0, random.randint(2, 3)) for i in range(4)], seed=7)
    ob = bpy.data.objects["g_terrain"]
    P["scatter"](ob, "wood", cw, 420000, "wood", 0.4, 11)
    P["scatter"](ob, "olive", co, 160000, "olive", 0.25, 12)
    P["scatter"](ob, "rock", ck, 140000, "rock", 0.5, 13)
    # clear, warm Mediterranean light; little haze
    P["setup_render"](sc, sun_rot=(math.radians(55), 0, math.radians(140)), sun_energy=2.6, sun_color=(1.0, 0.93, 0.82),
                      sky_strength=0.12, haze_rgb=(0.50, 0.58, 0.66), mist_start=1200, mist_depth=42000)
    return {"ok": 1}


STEP = globals().get("STEP", 1)
result = {1: step1, 2: step2, 3: step3}[STEP]()
