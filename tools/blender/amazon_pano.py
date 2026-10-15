# Amazon horizon panorama. Needs pano_common.py run first. STEP = 1 (terrain + river) / 2 (crowns, mist, render setup)
import bpy, bmesh, math
from mathutils import Vector
P = bpy.app.driver_namespace["pano"]
fbm, sstep = P["fbm"], P["sstep"]
SC = "amazon_pano"
RC, RA, RW = 4200, 1800, 300          # river: centre line distance, meander amplitude, half width (m)


def river_cy(x): return RC + RA * math.sin(x * 0.00035 + 0.6) + RA * 0.33 * math.sin(x * 0.0011)
def rwidth(x): return RW + RW * 0.3 * math.sin(x * 0.0009 + 2)


def base_h(x, y):
    r = math.hypot(x, y)
    h = fbm(x * 0.0006, y * 0.0006, 4) * 60 + fbm(x * 0.003, y * 0.003, 3) * 8
    rid = max(0.0, 1 - abs(fbm(x * 0.00018, y * 0.00018, 4, z=5.0)))
    h += (rid ** 2.2) * 900 * sstep(9000, 16000, r)
    h += max(0.0, fbm(x * 0.0004 + 3, y * 0.0004 - 2, 3)) * 200 * sstep(3500, 8000, r)
    return h


def height(x, y):
    h = base_h(x, y); rd = abs(y - river_cy(x)); w = rwidth(x)
    k = 1 - sstep(w * 0.6, w * 2.6, rd)          # flat floodplain toward the river
    return h * (1 - k) + (-35) * k


def step1():
    sc = P["get_scene"](SC); P["clear_scene"](sc)
    ter = P["polar_terrain"](sc, "terrain", height)
    m, nt, b = P["principled"]("terrain_mat", rough=0.9)
    tc = nt.nodes.new("ShaderNodeTexCoord"); tx = nt.nodes.new("ShaderNodeTexNoise"); tx.inputs["Scale"].default_value = 0.004; tx.inputs["Detail"].default_value = 6
    rp = nt.nodes.new("ShaderNodeValToRGB"); rp.color_ramp.elements[0].color = (0.016, 0.042, 0.016, 1); rp.color_ramp.elements[1].color = (0.045, 0.08, 0.026, 1)
    nt.links.new(tc.outputs["Object"], tx.inputs["Vector"]); nt.links.new(tx.outputs["Fac"], rp.inputs["Fac"]); nt.links.new(rp.outputs["Color"], b.inputs["Base Color"])
    ter.data.materials.clear(); ter.data.materials.append(m)
    # river ribbon on the floodplain
    bm = bmesh.new(); vs = []
    for i in range(1401):
        x = -45000 + i * 64.3; cy = river_cy(x); dy = river_cy(x + 10) - cy
        n = Vector((-dy, 10, 0)).normalized(); w = rwidth(x); c = Vector((x, cy, -33.5))
        vs.append((bm.verts.new(c + n * w), bm.verts.new(c - n * w)))
    for i in range(len(vs) - 1): bm.faces.new((vs[i][0], vs[i][1], vs[i + 1][1], vs[i + 1][0]))
    me = bpy.data.meshes.new("river"); bm.to_mesh(me); bm.free()
    wm, wnt, wb = P["principled"]("water_mat", (0.32, 0.27, 0.17), 0.08); me.materials.append(wm)
    riv = bpy.data.objects.new("river", me); sc.collection.objects.link(riv)
    return {"verts": len(ter.data.vertices)}


def step2():
    sc = P["get_scene"](SC); ter = bpy.data.objects["terrain"]
    def dens(x, y, z, n):
        rd = abs(y - river_cy(x)); r = math.hypot(x, y); w0 = rwidth(x)
        w = 0.0 if rd < w0 * 1.1 else min(1.0, (rd - w0 * 1.1) / 60)
        return w * (0.0 if r < 700 else (1.0 if r < 7000 else max(0.0, 1 - (r - 7000) / 1500)))
    P["set_group"](ter, "dens", dens)
    pal = [(0.0, (0.014, 0.04, 0.014)), (0.16, (0.024, 0.058, 0.018)), (0.33, (0.04, 0.078, 0.02)), (0.5, (0.02, 0.05, 0.024)),
           (0.64, (0.055, 0.095, 0.024)), (0.78, (0.03, 0.068, 0.018)), (0.9, (0.075, 0.1, 0.04)), (0.96, (0.11, 0.125, 0.085)),
           (0.994, (0.36, 0.26, 0.025)), (0.998, (0.24, 0.07, 0.15))]
    cm = P["random_ramp_material"]("crown_mat", pal, 0.9)
    col = bpy.data.collections.get("crowns") or bpy.data.collections.new("crowns")
    if col.name not in sc.collection.children: sc.collection.children.link(col)
    import random
    random.seed(21)
    specs = [("c%d" % i, random.uniform(8, 12), random.uniform(0.55, 0.7), 3, random.randint(6, 9)) for i in range(7)]
    specs += [("e%d" % i, random.uniform(13, 17), 0.5, 20, random.randint(6, 8)) for i in range(3)]
    P["blob_crowns"](col, cm, specs, seed=21)
    P["scatter"](ter, "trees", col, 560000, "dens", 0.35, 4)
    # low mist patches over the canopy
    mm = bpy.data.materials.get("mist_mat") or bpy.data.materials.new("mist_mat")
    mm.use_nodes = True; nt = mm.node_tree; nt.nodes.clear()
    o = nt.nodes.new("ShaderNodeOutputMaterial"); mix = nt.nodes.new("ShaderNodeMixShader"); tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    wb = nt.nodes.new("ShaderNodeBsdfPrincipled"); wb.inputs["Base Color"].default_value = (0.85, 0.88, 0.9, 1); wb.inputs["Roughness"].default_value = 1.0
    if "Specular IOR Level" in wb.inputs: wb.inputs["Specular IOR Level"].default_value = 0
    tc = nt.nodes.new("ShaderNodeTexCoord"); nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 0.00035; nz.inputs["Detail"].default_value = 8; nz.inputs["Roughness"].default_value = 0.62
    cr = nt.nodes.new("ShaderNodeValToRGB"); cr.color_ramp.elements[0].position = 0.52; cr.color_ramp.elements[0].color = (0, 0, 0, 1)
    cr.color_ramp.elements[1].position = 0.8; cr.color_ramp.elements[1].color = (0.72, 0.72, 0.72, 1)
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"]); nt.links.new(nz.outputs["Fac"], cr.inputs["Fac"]); nt.links.new(cr.outputs["Color"], mix.inputs["Fac"])
    nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(wb.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], o.inputs["Surface"])
    for nm, z, off in (("mist_lo", 25, 0), ("mist_hi", 110, 7777)):
        bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=40000)
        me = bpy.data.meshes.new(nm); bm.to_mesh(me); bm.free(); me.materials.append(mm)
        ob = bpy.data.objects.new(nm, me); sc.collection.objects.link(ob); ob.location = (off, -off * 0.7, z); ob.visible_shadow = False
    P["setup_render"](sc, sun_rot=(math.radians(62), 0, math.radians(135)), sun_energy=2.2, sun_color=(1.0, 0.95, 0.86),
                      sky_strength=0.12, haze_rgb=(0.42, 0.53, 0.62), mist_start=600, mist_depth=26000)
    return {"ok": 1}


STEP = globals().get("STEP", 1)
result = {1: step1, 2: step2}[STEP]()
