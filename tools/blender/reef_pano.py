# Reef (Gulf of Eilat) horizon panorama. Needs pano_common.py run first (bpy.app.driver_namespace["pano"]).
# The view from the water by the coral reef south of Eilat: the gulf runs north–south; close on the west rise the
# Eilat mountains (dark red granite with darker dikes and light alluvial fans at their feet), across the water on
# the east the higher, redder mountains of Edom, to the north the flat sandy end of the gulf with the Arava beyond,
# and to the south the gulf opens wide between the two ranges. Desert: almost no plants, a few acacias in the wadis.
# No buildings, no boats, no people.
# Run in steps, one per MCP call (each must stay short): STEP = 1 (terrain + water) / 2 (materials, render setup).
# Rendering: P["start_quarter"](sc, q, "reef", res) for q = 0..3 (async, poll the file), then P["render_mist"].
import bpy, bmesh, math
P = bpy.app.driver_namespace["pano"]
fbm, sstep = P["fbm"], P["sstep"]
SC = "reef_pano"
CAM_H = 40.0          # a little above the water, by the reef
LAT = (-12, 16)       # the west mountains are close and steep: the strip reaches higher than the forest ones


def gulf(y):
    """centre line and half-width of the gulf at northing y (metres; the viewer at 0,0, +y north, +x east)"""
    xc = 3300.0 + 0.06 * y
    w = 3500.0 + min(9000.0, max(0.0, -y) * 0.22)          # it widens to the south
    w *= 1.0 - sstep(5200.0, 7600.0, y)                    # and ends in the north at the beach of the Arava
    return xc, w


def ridged(x, y, s, z):
    return 1.0 - abs(fbm(x * s, y * s, 5, z=z))


def height(x, y):
    xc, w = gulf(y)
    d = abs(x - xc) - w                       # distance from the shore, negative in the water
    if d < 0:
        return max(-180.0, d * 0.12) - 2.0    # the sea floor drops steeply (only seen as dark water)
    west = x < xc
    r = ridged(x, y, 0.00042, 7.0 if west else 17.0)
    fine = fbm(x * 0.0022, y * 0.0022, 4, z=3.0) * 38 + fbm(x * 0.009, y * 0.009, 2, z=5.0) * 7
    if west:   # Eilat mountains: steep right behind a narrow coastal strip
        h = 820.0 * sstep(250.0, 3200.0, d) * (0.45 + 0.75 * r * r)
    else:      # Edom: higher, farther back from the eastern shore
        h = 1250.0 * sstep(700.0, 8500.0, d) * (0.4 + 0.8 * r * r)
    # the flat sandy Arava north of the gulf (mountains stay on both sides of it)
    arava = sstep(5600.0, 9000.0, y) * (1.0 - sstep(2500.0, 7000.0, abs(x - xc)))
    h = h * (1.0 - 0.92 * arava) + 25.0 * arava
    # alluvial fans: the mountain foot spreads out in a gentle slope down to the shore
    fan = 30.0 * sstep(0.0, 900.0, d)
    return max(fan, h) + fine * sstep(0.0, 600.0, d) + 2.0


def water_mesh(sc, NA=720, NR=110, R0=60.0, R1=45000.0):
    """a polar sheet of water at sea level; vertex colour 'shallow' = 1 by the shore (turquoise over the reef)"""
    bm = bmesh.new(); rows = []
    for i in range(NR + 1):
        r = R0 * (R1 / R0) ** (i / NR); row = []
        for j in range(NA):
            th = j / NA * math.tau
            row.append(bm.verts.new((math.cos(th) * r, math.sin(th) * r, 0.0)))
        rows.append(row)
    for i in range(NR):
        for j in range(NA):
            j1 = (j + 1) % NA
            bm.faces.new((rows[i][j], rows[i][j1], rows[i + 1][j1], rows[i + 1][j]))
    me = bpy.data.meshes.new("r_water"); bm.to_mesh(me); bm.free()
    ca = me.color_attributes.new("shallow", 'FLOAT_COLOR', 'POINT')
    for v in me.vertices:
        xc, w = gulf(v.co.y)
        d = w - abs(v.co.x - xc)                       # distance from the shore, inside the water
        s = 1.0 - sstep(0.0, 260.0, d)                 # a turquoise band over the fringing reef
        ca.data[v.index].color = (s, 0, 0, 1)
    ob = bpy.data.objects.get("r_water")
    if ob: bpy.data.objects.remove(ob, do_unlink=True)
    ob = bpy.data.objects.new("r_water", me); sc.collection.objects.link(ob)
    return ob


def step1():
    sc = P["get_scene"](SC); P["clear_scene"](sc)
    ob = P["polar_terrain"](sc, "r_terrain", height, NA=1100, NR=190)
    wt = water_mesh(sc)
    return {"verts": len(ob.data.vertices), "water": len(wt.data.vertices)}


def terrain_material():
    m, nt, b = P["principled"]("r_terrain_mat", rough=0.95)
    N, L = nt.nodes, nt.links
    tc = N.new("ShaderNodeTexCoord"); geo = N.new("ShaderNodeNewGeometry")
    sxyz = N.new("ShaderNodeSeparateXYZ"); L.new(geo.outputs["Position"], sxyz.inputs[0])
    # granite: dark red to rust, broken by large noise
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 0.0018; nz.inputs["Detail"].default_value = 7
    L.new(tc.outputs["Object"], nz.inputs["Vector"])
    rp = N.new("ShaderNodeValToRGB"); cr = rp.color_ramp
    cr.elements[0].position = 0.3; cr.elements[0].color = (0.16, 0.055, 0.035, 1)
    cr.elements[1].position = 0.72; cr.elements[1].color = (0.36, 0.15, 0.08, 1)
    e = cr.elements.new(0.5); e.color = (0.27, 0.1, 0.06, 1)
    L.new(nz.outputs["Fac"], rp.inputs["Fac"])
    # dark dikes: thin bands running across the mountains
    wv = N.new("ShaderNodeTexWave"); wv.wave_type = 'BANDS'; wv.inputs["Scale"].default_value = 0.0009
    wv.inputs["Distortion"].default_value = 6.0; wv.inputs["Detail"].default_value = 3
    L.new(tc.outputs["Object"], wv.inputs["Vector"])
    dk = N.new("ShaderNodeMapRange"); dk.inputs["From Min"].default_value = 0.93; dk.inputs["From Max"].default_value = 0.99
    L.new(wv.outputs["Fac"], dk.inputs["Value"])
    mixd = N.new("ShaderNodeMix"); mixd.data_type = 'RGBA'; mixd.inputs[7].default_value = (0.06, 0.045, 0.04, 1)
    md = N.new("ShaderNodeMath"); md.operation = 'MULTIPLY'; md.inputs[1].default_value = 0.7
    L.new(dk.outputs["Result"], md.inputs[0]); L.new(md.outputs[0], mixd.inputs[0]); L.new(rp.outputs["Color"], mixd.inputs[6])
    # light sand and gravel low down and on gentle slopes (fans, wadis, the coastal strip, the Arava)
    sl = N.new("ShaderNodeVectorMath"); sl.operation = 'DOT_PRODUCT'; sl.inputs[1].default_value = (0, 0, 1)
    L.new(geo.outputs["Normal"], sl.inputs[0])
    flat = N.new("ShaderNodeMapRange"); flat.inputs["From Min"].default_value = 0.86; flat.inputs["From Max"].default_value = 0.97
    L.new(sl.outputs["Value"], flat.inputs["Value"])
    low = N.new("ShaderNodeMapRange"); low.inputs["From Min"].default_value = 180.0; low.inputs["From Max"].default_value = 40.0
    L.new(sxyz.outputs["Z"], low.inputs["Value"])
    mx = N.new("ShaderNodeMath"); mx.operation = 'MAXIMUM'; L.new(flat.outputs["Result"], mx.inputs[0]); L.new(low.outputs["Result"], mx.inputs[1])
    mixs = N.new("ShaderNodeMix"); mixs.data_type = 'RGBA'; mixs.inputs[7].default_value = (0.56, 0.42, 0.28, 1)
    L.new(mx.outputs[0], mixs.inputs[0]); L.new(mixd.outputs[2], mixs.inputs[6])
    L.new(mixs.outputs[2], b.inputs["Base Color"])
    # rough rock
    bn = N.new("ShaderNodeTexNoise"); bn.inputs["Scale"].default_value = 0.03; bn.inputs["Detail"].default_value = 8
    L.new(tc.outputs["Object"], bn.inputs["Vector"])
    bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.35
    L.new(bn.outputs["Fac"], bp.inputs["Height"]); L.new(bp.outputs["Normal"], b.inputs["Normal"])
    ob = bpy.data.objects["r_terrain"]; ob.data.materials.clear(); ob.data.materials.append(m)


def water_material():
    m, nt, b = P["principled"]("r_water_mat", rough=0.06)
    N, L = nt.nodes, nt.links
    if "Specular IOR Level" in b.inputs: b.inputs["Specular IOR Level"].default_value = 0.5
    at = N.new("ShaderNodeAttribute"); at.attribute_name = "shallow"
    sep = N.new("ShaderNodeSeparateColor"); L.new(at.outputs["Color"], sep.inputs[0])
    mix = N.new("ShaderNodeMix"); mix.data_type = 'RGBA'
    mix.inputs[6].default_value = (0.012, 0.075, 0.16, 1)      # the deep gulf
    mix.inputs[7].default_value = (0.05, 0.38, 0.42, 1)        # turquoise over the reef
    L.new(sep.outputs["Red"], mix.inputs[0]); L.new(mix.outputs[2], b.inputs["Base Color"])
    # small waves
    tc = N.new("ShaderNodeTexCoord"); wn = N.new("ShaderNodeTexNoise"); wn.inputs["Scale"].default_value = 0.08; wn.inputs["Detail"].default_value = 6
    L.new(tc.outputs["Object"], wn.inputs["Vector"])
    bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.12
    L.new(wn.outputs["Fac"], bp.inputs["Height"]); L.new(bp.outputs["Normal"], b.inputs["Normal"])
    ob = bpy.data.objects["r_water"]; ob.data.materials.clear(); ob.data.materials.append(m)


def step2():
    sc = P["get_scene"](SC)
    terrain_material(); water_material()
    # bright desert morning: the sun in the south-east, a warm dusty haze
    P["setup_render"](sc, sun_rot=(math.radians(52), 0, math.radians(35)), sun_energy=3.0, sun_color=(1.0, 0.9, 0.78),
                      sky_strength=0.14, haze_rgb=(0.66, 0.6, 0.55), mist_start=2500, mist_depth=60000, cam_h=CAM_H, lat=LAT)
    sc.render.threads_mode = 'FIXED'
    import os
    sc.render.threads = max(1, (os.cpu_count() or 4) - 2)   # gentle with the PC
    return {"ok": 1}


STEP = globals().get("STEP", 1)
result = {1: step1, 2: step2}[STEP]()
