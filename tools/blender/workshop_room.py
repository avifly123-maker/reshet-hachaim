# הסדנה של ניצוץ as a room to look around in (5.11, Avi: "a 3D room like the lab, Nitzotz moving around in it, the
# machines, a table for the constraint cards, baked in Blender"). Built and rendered headless in the container
# (pip install --break-system-packages bpy==5.2.2):
#   python3 tools/blender/workshop_room.py <outdir> [width=2048] [samples=48] [persp | door]
# A round workshop, 5.2 m across the floor's radius: the seven places stand on a ring round the middle, facing it, each
# the same model as its picture in the game (workshop_art.py station()). Riveted teal walls over a wooden wainscot (the
# wall of the old screen), three tall windows with daylight, a beamed ceiling with five lamps, copper pipes, shelves of
# jars and parts, a round rug in the middle where ניצוץ walks. One equirectangular panorama from the eye in the middle.
# Out: <outdir>/room_pano.png and <outdir>/room.json: the eye and, for each place, the point to ring (its middle) and
# the spot in front of it where ניצוץ stops, in three's axes (x, z, -y). Then: python3 tools/build-workshop-room.py <outdir>
# No cross shapes: five ceiling beams, three-blade fans, no rods meeting at right angles in a plus.
import bpy, math, sys, os, json
from mathutils import Vector
HERE = os.path.dirname(os.path.abspath(__file__))
NS = {'__name__': 'workshop_art_lib', '__file__': os.path.join(HERE, 'workshop_art.py')}
exec(open(os.path.join(HERE, 'workshop_art.py')).read(), NS)
g = NS
box, cyl, sphere, torus, tube, lathe, rivets = g['box'], g['cyl'], g['sphere'], g['torus'], g['tube'], g['lathe'], g['rivets']
pbsdf, hexc, enamel, metal, wood, noisy, clear_glass = g['pbsdf'], g['hexc'], g['enamel'], g['metal'], g['wood'], g['noisy'], g['clear_glass']
BRASS, COPPER, STEEL, DARK = g['BRASS'], g['COPPER'], g['STEEL'], g['DARK']

EYE = (0.0, 0.0, 1.35)
R_ROOM, R_ST, R_STOP = 4.3, 2.55, 1.35
# the order a child meets them, left to right as he looks round from the front (Blender angle from +Y toward +X)
PLACES = [('orders', -132), ('machine', -88), ('mixer', -46), ('cards', 0), ('build', 46), ('test', 90), ('patent', 134)]
SCALE = {'machine': 1.0, 'mixer': 1.25, 'cards': 1.1, 'orders': 1.2, 'build': 1.15, 'test': 1.1, 'patent': 1.2}

def group(name, fn, loc, rot_z, s=1.0):
    before = set(bpy.data.objects)
    fn()
    new = [o for o in bpy.data.objects if o not in before and o.parent is None]
    e = bpy.data.objects.new(name, None); bpy.context.scene.collection.objects.link(e)
    for o in new: o.parent = e
    e.location = loc; e.rotation_euler = (0, 0, rot_z); e.scale = (s, s, s)
    return e

def cards_table():   # the constraint cards on a round felt table of their own
    W = wood('#6a3e1c', 'ctable')
    cyl('ct_top', 0.75, 0.07, (0, 0, 0.74), W, bevel=0.02); cyl('ct_felt', 0.68, 0.012, (0, 0, 0.78), noisy('#2f7a4a', '#256a3e', 60, 'felt'), bevel=0)
    cyl('ct_leg', 0.08, 0.7, (0, 0, 0.37), W, bevel=0.01); cyl('ct_foot', 0.4, 0.05, (0, 0, 0.03), W, bevel=0.015)
    back = noisy('#c0402f', '#a8302a', 25, 'cardback'); face = pbsdf('cardface', hexc('#fffaf0'), rough=0.5)
    for i in range(5):
        a = -0.6 + i * 0.3
        box(f'cfan{i}', (0.2, 0.3, 0.008), (0.3 * math.sin(a), -0.3 * math.cos(a) + 0.1, 0.792 + i * 0.004), face if i == 2 else back, 0.01, (0, 0, a))
    for i in range(6): box(f'cdeck{i}', (0.2, 0.3, 0.008), (-0.25, 0.32, 0.792 + i * 0.008), back, 0.01, (0, 0, 0.2))
    cyl('ctimer', 0.08, 0.03, (0.32, 0.3, 0.8), enamel('#ffd24a', 'clockface'), bevel=0.008)

def room():
    W = wood('#6a3e1c', 'wainscot'); TEAL = enamel('#2c5f66', 'wallteal'); TEAL2 = enamel('#33707a', 'wallteal2'); NICKEL = metal('#d6dde2', 0.18, 'nickel')
    # floor: planks on a disc, a round rug in the middle
    cyl('floor', R_ROOM + 0.3, 0.1, (0, 0, -0.05), noisy('#9a6430', '#7a4a20', 18, 'planks'), verts=96, bevel=0)
    for i in range(-10, 11): box(f'seam{i}', (0.012, 2 * R_ROOM, 0.004), (i * 0.48, 0, 0.001), pbsdf('seam', hexc('#4a2a10'), rough=0.9), 0)
    cyl('rug', 1.55, 0.02, (0, 0, 0.01), noisy('#c8743a', '#a8582a', 30, 'rug'), verts=96, bevel=0.005)
    torus('rugring', 1.4, 0.025, (0, 0, 0.02), pbsdf('rugr', hexc('#f2d07a'), rough=0.8))
    torus('rugring2', 0.9, 0.02, (0, 0, 0.02), pbsdf('rugr', hexc('#f2d07a'), rough=0.8))
    # walls: 30 bays round the room; three of them in front are tall windows, one at the back a door
    N = 30
    for k in range(N):
        a = 2 * math.pi * k / N; c, s = math.cos(a), math.sin(a)   # a from +Y toward +X: x = sin, y = cos
        x, y = R_ROOM * s, R_ROOM * c; rz = -a
        win = k in (29, 0, 1) and False
        front = abs(math.atan2(s, c)) < 0.5
        back = abs(abs(math.atan2(s, c)) - math.pi) < 0.12
        wb = 2 * R_ROOM * math.sin(math.pi / N) + 0.02
        if front:   # a low sill under a window, so the canopy shows from the floor of the forest's top up to the sky
            box(f'wain{k}', (wb, 0.08, 0.55), (x, y, 0.275), W, 0.01, (0, 0, rz))
        else: box(f'wain{k}', (wb, 0.08, 1.1), (x, y, 0.55), W, 0.01, (0, 0, rz))
        if back:
            box(f'door{k}', (wb * 0.9, 0.1, 2.3), (x * 0.99, y * 0.99, 1.15), wood('#5a2e12', 'door'), 0.03, (0, 0, rz)); continue
        if front:   # a window: glass with daylight behind, a brass frame
            box(f'wtop{k}', (wb, 0.12, 0.08), (x, y, 3.62), BRASS(), 0.01, (0, 0, rz)); box(f'wbot{k}', (wb, 0.2, 0.08), (x, y, 0.6), BRASS(), 0.01, (0, 0, rz))
            
            box(f'wup{k}', (wb, 0.08, 0.6), (x, y, 3.95), TEAL, 0.02, (0, 0, rz)); continue
        for j in range(3):
            box(f'pl{k}{j}', (wb - 0.03, 0.06, 0.96), (x, y, 1.66 + j * 1.0), TEAL if (k + j) % 2 else TEAL2, 0.02, (0, 0, rz))
        for j in range(3):
            for dz in (-0.4, 0.4):
                p = Vector((x, y, 1.66 + j * 1.0 + dz)) - Vector((s, c, 0)) * 0.04
                sphere(f'rv{k}{j}{dz}', 0.022, tuple(p), NICKEL)
    box('rail', (0.1, 0.1, 0.1), (0, 0, -5), BRASS(), 0)
    torus('railring', R_ROOM - 0.06, 0.03, (0, 0, 1.12), BRASS(), seg=128)
    # ceiling: a wooden disc with five beams to a brass hub, five hanging lamps
    cyl('ceil', R_ROOM + 0.3, 0.12, (0, 0, 4.4), wood('#5a3216', 'ceilw'), verts=96, bevel=0)
    for i in range(5):
        a = i * 2 * math.pi / 5 + 0.3
        box(f'beam{i}', (0.22, R_ROOM, 0.26), (R_ROOM / 2 * math.sin(a), R_ROOM / 2 * math.cos(a), 4.22), wood('#4a2a10', 'beam'), 0.03, (0, 0, -a))
        lx, ly = 2.6 * math.sin(a + 0.63), 2.6 * math.cos(a + 0.63)
        cyl(f'cord{i}', 0.01, 1.1, (lx, ly, 3.8), DARK())
        lathe(f'shade{i}', [(0.0, 0.0), (0.06, 0.0), (0.26, -0.24), (0.27, -0.26), (0.0, -0.26)], (lx, ly, 3.25), enamel('#2f6a5a', 'shade'), 48)
        sphere(f'bulb{i}', 0.08, (lx, ly, 2.95), pbsdf('bulbw', hexc('#fff0c8'), emit=hexc('#ffe2a0'), estr=30))
        L = bpy.data.objects.new(f'lamp{i}', bpy.data.lights.new(f'lamp{i}', 'POINT')); bpy.context.scene.collection.objects.link(L)
        L.data.energy = 160; L.data.color = (1.0, 0.86, 0.66); L.data.shadow_soft_size = 0.25; L.location = (lx, ly, 2.85)
    sphere('hub', 0.25, (0, 0, 4.15), BRASS(), (1, 1, 0.5))
    # copper pipes round the top of the wall, with gauges here and there
    torus('pipe1', R_ROOM - 0.2, 0.06, (0, 0, 3.75), COPPER(), seg=160); torus('pipe2', R_ROOM - 0.2, 0.045, (0, 0, 3.55), COPPER(), seg=160)
    for k, a in enumerate((-1.1, -0.35, 0.5, 1.25, 2.2, -2.2)):
        if abs(a) < 0.3: continue
        x, y = (R_ROOM - 0.3) * math.sin(a), (R_ROOM - 0.3) * math.cos(a)
        cyl(f'gface{k}', 0.16, 0.04, (x, y, 3.3), pbsdf('dialface', hexc('#fffaf0'), rough=0.4), (math.pi / 2, 0, -a), bevel=0)
        torus(f'gring{k}', 0.16, 0.025, (x, y, 3.3), BRASS(), (math.pi / 2, 0, -a))
    # shelves between the places: jars that glow a little, boxes of parts, a coil of wire
    for k, a in enumerate((-1.92, -1.17, -0.62, 0.62, 1.17, 1.92, 2.7, -2.7)):
        x, y = (R_ROOM - 0.35) * math.sin(a), (R_ROOM - 0.35) * math.cos(a)
        for j, z in enumerate((1.45, 2.05)):
            box(f'sh{k}{j}', (0.95, 0.32, 0.04), (x, y, z), wood('#7a4a22', 'shelf'), 0.01, (0, 0, -a))
            for m in range(3):
                off = (m - 1) * 0.3; px, py = x + off * math.cos(a), y - off * math.sin(a)
                kind = (k + j + m) % 3
                if kind == 0: lathe(f'jar{k}{j}{m}', [(0, 0), (0.08, 0), (0.09, 0.18), (0.06, 0.22), (0, 0.22)], (px, py, z + 0.02), pbsdf('jarg' + str(m), hexc(['#7cf0a0', '#ffd24a', '#7cc4ff'][m]), emit=hexc(['#7cf0a0', '#ffd24a', '#7cc4ff'][m]), estr=1.2, alpha=0.85), 32)
                elif kind == 1: box(f'pbox{k}{j}{m}', (0.2, 0.16, 0.14), (px, py, z + 0.09), enamel(['#e0443a', '#3f7fd0', '#f2c443'][m], 'pb' + str(m)), 0.015, (0, 0, -a))
                else: torus(f'coil{k}{j}{m}', 0.07, 0.025, (px, py, z + 0.05), COPPER())

# the view through the windows (Avi, 5.11: "the workshop can show the rainforest, as the lab stands by the reef"): the
# Amazon's own horizon from the game (art/pano/amazon_q0..3.png, latitudes in amazon.json) on a far cylinder, a sky behind
def forest_view():
    import numpy as np
    root = os.path.join(HERE, '..', '..', 'art', 'pano'); meta = json.load(open(os.path.join(root, 'amazon.json')))
    from PIL import Image
    qs = [Image.open(os.path.join(root, f'amazon_q{i}.png')).convert('RGBA') for i in range(4)]
    strip = Image.new('RGBA', (sum(q.width for q in qs), qs[0].height)); x0 = 0
    for q in qs: strip.paste(q, (x0, 0)); x0 += q.width
    tmp = os.path.join(bpy.app.tempdir or '/tmp', 'amazon_strip.png'); strip.save(tmp)
    img = bpy.data.images.load(tmp)
    lo, hi = [math.radians(v) for v in meta['lat']]; RC = 40.0; N = 128   # the workshop stands high in the canopy: the forest below, its far hills on the horizon; N = 128
    verts, faces, uvs = [], [], []
    for i in range(N + 1):
        a = 2 * math.pi * i / N
        for lat in (lo, hi): verts.append((RC * math.sin(a), RC * math.cos(a), EYE[2] + RC * math.tan(lat)))
    for i in range(N): faces.append((2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1))
    me = bpy.data.meshes.new('forest'); me.from_pydata(verts, [], faces); me.update()
    uv = me.uv_layers.new(name='UVMap')
    for f in me.polygons:
        for li in f.loop_indices:
            vi = me.loops[li].vertex_index; i, j = vi // 2, vi % 2
            uv.data[li].uv = (i / N, j)
    m = bpy.data.materials.new('forestmat'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = img; t.extension = 'REPEAT'
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs[1].default_value = 1.25
    tr = nt.nodes.new('ShaderNodeBsdfTransparent'); mix = nt.nodes.new('ShaderNodeMixShader'); o = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(t.outputs['Color'], em.inputs[0]); nt.links.new(t.outputs['Alpha'], mix.inputs[0])
    nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(em.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], o.inputs[0])
    ob = bpy.data.objects.new('forest', me); bpy.context.scene.collection.objects.link(ob); me.materials.append(m)
    # the sky and the far haze: a big dome, light blue above, misty at the horizon, a green floor of canopy below
    sk = bpy.data.materials.new('skymat'); sk.use_nodes = True; nt = sk.node_tree; nt.nodes.clear()
    gi = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); ramp = nt.nodes.new('ShaderNodeValToRGB')
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs[1].default_value = 1.4; o = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(gi.outputs['Generated'], sep.inputs[0]); nt.links.new(sep.outputs['Z'], ramp.inputs[0])
    cr = ramp.color_ramp; cr.elements[0].position = 0.47; cr.elements[0].color = (0.16, 0.3, 0.16, 1); cr.elements[1].position = 0.7; cr.elements[1].color = (0.3, 0.55, 0.95, 1)
    e = cr.elements.new(0.51); e.color = (0.62, 0.76, 0.9, 1)
    nt.links.new(ramp.outputs['Color'], em.inputs[0]); nt.links.new(em.outputs[0], o.inputs[0])
    sphere('skydome', 80, (0, 0, EYE[2]), sk)
    # near crowns of the canopy just outside the windows: the workshop stands among the treetops
    import random; rnd = random.Random(7)
    LEAF = [noisy('#2f7a3a', '#143f1c', 70, 'leafA'), noisy('#4a9440', '#225a24', 80, 'leafB'), noisy('#5aa648', '#2a6a2a', 60, 'leafC')]
    for t in range(14):
        a = rnd.uniform(-1.2, 1.2); r = rnd.uniform(6.5, 16); cx, cy = r * math.sin(a), r * math.cos(a); cz = rnd.uniform(-2.6, 0.2) + (r - 6) * 0.05
        for b in range(rnd.randint(12, 18)):
            rr = rnd.uniform(0.45, 0.95)
            sphere(f'crown{t}_{b}', rr, (cx + rnd.uniform(-1.7, 1.7), cy + rnd.uniform(-1.2, 1.2), cz + rnd.uniform(-0.5, 0.9)), LEAF[(t + b) % 3], (1.2, 1.2, 0.85), seg=16)
        if rnd.random() < 0.6: cyl(f'trunk{t}', 0.25, 8, (cx, cy, cz - 4.2), wood('#5a3a22', 'trunkw'))

def main():
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    out = args[0]; w = int(args[1]) if len(args) > 1 else 2048; samples = int(args[2]) if len(args) > 2 else 48
    os.makedirs(out, exist_ok=True)
    sc = g['reset']()
    sc.render.film_transparent = False
    room(); forest_view()
    info = {'eye': [EYE[0], EYE[2], -EYE[1]], 'places': {}}
    for pid, deg in PLACES:
        a = math.radians(deg); x, y = R_ST * math.sin(a), R_ST * math.cos(a)
        fn = cards_table if pid == 'cards' else (lambda p=pid: g['station'](p))
        group('st_' + pid, fn, (x, y, 0), -a, SCALE.get(pid, 1.0))
        hot = (R_ST * math.sin(a), R_ST * math.cos(a), 1.0 if pid != 'cards' else 0.85)
        stop = (R_STOP * math.sin(a), R_STOP * math.cos(a), 0)
        info['places'][pid] = {'hot': [round(hot[0], 3), round(hot[2], 3), round(-hot[1], 3)], 'stop': [round(stop[0], 3), 0, round(-stop[1], 3)], 'deg': deg}
    # light: a dim warm world, daylight through the front windows, a soft fill from above
    wd = bpy.data.worlds.new('w'); sc.world = wd; wd.use_nodes = True; bg = wd.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.95, 0.88, 0.78, 1); bg.inputs[1].default_value = 0.35
    A = bpy.data.objects.new('win_sun', bpy.data.lights.new('win_sun', 'AREA')); sc.collection.objects.link(A)
    A.data.energy = 1400; A.data.size = 3.0; A.data.color = (0.92, 0.96, 1.0); A.location = (0, R_ROOM - 0.6, 2.6); A.rotation_euler = (math.radians(90), 0, 0)
    try: A.visible_camera = False; A.visible_glossy = False
    except Exception: pass
    F = bpy.data.objects.new('fill', bpy.data.lights.new('fill', 'AREA')); sc.collection.objects.link(F)
    F.data.energy = 600; F.data.size = 5; F.data.color = (1.0, 0.92, 0.8); F.location = (0, 0, 4.1)
    cd = bpy.data.cameras.new('pano'); cd.type = 'PANO'
    try: cd.panorama_type = 'EQUIRECTANGULAR'
    except Exception: pass
    cd.clip_start = 0.05; cd.clip_end = 100
    cam = bpy.data.objects.new('pano', cd); sc.collection.objects.link(cam); cam.location = EYE; cam.rotation_euler = (math.radians(90), 0, 0); sc.camera = cam
    sc.view_settings.exposure = 0.2
    if len(args) > 3 and args[3] == 'persp':   # a quick look: four views as the game would show them (96 degrees across)
        cd.type = 'PERSP'; cd.sensor_fit = 'HORIZONTAL'; cd.angle = math.radians(96)
        for yaw in (-90, 0, 90, 180):
            cam.rotation_euler = (math.radians(82), 0, math.radians(-yaw))
            g['render'](os.path.join(out, f'look_{yaw}.png'), 800, 460, samples)
        return
    if len(args) > 3 and args[3] == 'door':   # the picture on the workshop's door in the start screen (8.11, Avi: the old one was not nice)
        # from the back of the room, by the entrance, looking at the windows: the machines on both sides, the cards table in front
        cd.type = 'PERSP'; cd.sensor_fit = 'HORIZONTAL'; cd.angle = math.radians(78)
        cam.location = (0.35, -3.55, 1.75); cam.rotation_euler = (math.radians(80), 0, math.radians(-4))
        g['render'](os.path.join(out, 'door.png'), w, round(w * 0.62), samples)
        return
    g['render'](os.path.join(out, 'room_pano.png'), w, w // 2, samples)
    json.dump(info, open(os.path.join(out, 'room.json'), 'w'), indent=1)
    print('done room', flush=True)

if __name__ == '__main__':
    main()
