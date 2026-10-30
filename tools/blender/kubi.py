# קוּבִּי (from קובייה, "cube"): the robot lab's teacher (Avi, 29.10). A character built of rounded blocks, with a screen
# face (the game draws the eyes and the mouth live on it), round light buttons on the head instead of studs, block
# arms with rounded mitten hands (not the hands of any known toy), a tool belt with a screwdriver and a pencil.
# It is a puppet of joints (empties named J:<name>), so the game animates it without a skeleton: bob, explain, point,
# cheer, and "surprised", when its blocks pop apart and click back.
# Runs in the same namespace as robolab_kit.py (its helpers and materials):
#   exec(open(r'...\robolab\kubi.py', encoding='utf-8').read(), ns); kubi_build(); kubi_preview(path); kubi_export(path)
import bpy, math, json, os
from mathutils import Vector, Euler

SLOT_COL.update({'leather': (0.55, 0.36, 0.22), 'wood': (0.85, 0.66, 0.38)})

def joint(name, parent=None, loc=(0, 0, 0)):
    e = bpy.data.objects.new('J:' + name, None); _coll()[1].objects.link(e)
    if parent: e.parent = parent
    e.location = loc; e.empty_display_size = 0.06
    return e

def kubi_build():
    for o in [o for o in bpy.data.objects if o.name.startswith('J:') or o.name.startswith('k_')]:
        bpy.data.objects.remove(o, do_unlink=True)
    root = joint('kubi')
    hips = joint('hips', root, (0, 0, 0.36))
    # legs: a yellow block and a chunky foot with a dark sole
    for sx, side in ((-1, 'l'), (1, 'r')):
        leg = joint('leg_' + side, hips, (sx * 0.11, 0, 0))
        box('k_leg_' + side, 0.15, 0.17, 0.24, 'accent', r=0.04, parent=leg, loc=(0, 0, -0.14))
        foot = joint('foot_' + side, leg, (0, 0, -0.27))
        box('k_foot_' + side, 0.18, 0.26, 0.09, 'accent', r=0.035, parent=foot, loc=(0, -0.04, -0.03))
        box('k_sole_' + side, 0.18, 0.26, 0.03, 'dark', r=0.012, parent=foot, loc=(0, -0.04, -0.08))
    # torso: an orange block with a cream panel and a round dial, the belt with its tools
    torso = joint('torso', hips, (0, 0, 0.02))
    t = box('k_torso', 0.42, 0.3, 0.36, 'body', r=0.07, parent=torso, loc=(0, 0, 0.19))
    box('k_panel', 0.26, 0.02, 0.18, 'cream', r=0.025, parent=torso, loc=(0, -0.155, 0.24))
    cyl('k_dial', 0.045, 0.02, 'trim', seg=24, axis='Y', parent=torso, loc=(-0.06, -0.168, 0.26))
    for i, c in enumerate(('glow', 'accent', 'trim')):
        sphere('k_led%d' % i, 0.018, c, parent=torso, loc=(0.04 + i * 0.045, -0.168, 0.27))
    box('k_belt', 0.44, 0.32, 0.05, 'leather', r=0.015, parent=torso, loc=(0, 0, 0.04))
    box('k_buckle', 0.07, 0.02, 0.05, 'accent', r=0.01, parent=torso, loc=(0, -0.165, 0.04))
    # the screwdriver and the pencil in the belt (right side)
    cyl('k_sd_handle', 0.022, 0.09, 'trim', seg=14, parent=torso, loc=(0.16, -0.17, 0.06))
    cyl('k_sd_shaft', 0.007, 0.08, 'metal', seg=10, parent=torso, loc=(0.16, -0.17, -0.02))
    cyl('k_pencil', 0.016, 0.16, 'accent', seg=6, parent=torso, loc=(0.205, -0.15, 0.06))
    cyl('k_pencil_tip', 0.016, 0.035, 'wood', seg=6, r2=0.003, parent=torso, loc=(0.205, -0.15, -0.035), rot=(math.pi, 0, 0))
    # arms: a shoulder ball, two teal blocks, a rounded mitten hand
    for sx, side in ((-1, 'l'), (1, 'r')):
        sh = joint('shoulder_' + side, torso, (sx * 0.25, 0, 0.3))
        sphere('k_shoulder_' + side, 0.055, 'trim', parent=sh)
        box('k_upper_' + side, 0.1, 0.1, 0.15, 'trim', r=0.03, parent=sh, loc=(0, 0, -0.1))
        el = joint('elbow_' + side, sh, (0, 0, -0.18))
        box('k_lower_' + side, 0.09, 0.09, 0.13, 'trim', r=0.03, parent=el, loc=(0, 0, -0.07))
        hand = joint('hand_' + side, el, (0, 0, -0.15))
        h = box('k_hand_' + side, 0.11, 0.08, 0.1, 'cream', r=0.04, parent=hand, loc=(0, 0, -0.04))
        box('k_thumb_' + side, 0.035, 0.05, 0.055, 'cream', r=0.016, parent=hand, loc=(-sx * 0.06, -0.01, -0.02))
    # neck and head: a big rounded cube with a screen face, light buttons on top, round ears, an antenna
    neck = joint('neck', torso, (0, 0, 0.38))
    cyl('k_neck', 0.06, 0.06, 'metal', seg=20, parent=neck, loc=(0, 0, 0.02))
    head = joint('head', neck, (0, 0, 0.05))
    hd = box('k_head', 0.56, 0.48, 0.46, 'body', r=0.11, parent=head, loc=(0, 0, 0.24))
    box('k_screen_rim', 0.46, 0.03, 0.34, 'dark', r=0.05, parent=head, loc=(0, -0.235, 0.24))
    box('k_screen', 0.42, 0.02, 0.3, 'glass', r=0.045, parent=head, loc=(0, -0.25, 0.24))
    for sx in (-1, 1):
        cyl('k_ear_%d' % sx, 0.075, 0.05, 'trim', seg=28, axis='X', bev=0.012, parent=head, loc=(sx * 0.29, 0, 0.26))
        sphere('k_earled_%d' % sx, 0.022, 'glow', parent=head, loc=(sx * 0.318, 0, 0.26))
    for i, (x, c) in enumerate(((-0.13, 'glow'), (0, 'accent'), (0.13, 'trim'))):   # three round buttons on top
        cyl('k_btn%d' % i, 0.045, 0.035, c, seg=24, bev=0.01, parent=head, loc=(x, 0.02, 0.48))
    cyl('k_ant', 0.01, 0.16, 'metal', seg=10, parent=head, loc=(0.18, 0.12, 0.55))
    sphere('k_ant_tip', 0.035, 'glow', parent=head, loc=(0.18, 0.12, 0.64))
    face = bpy.data.objects.new('S:face', None); _coll()[1].objects.link(face); face.parent = head; face.location = (0, -0.262, 0.24)
    face.empty_display_size = 0.2
    return {'objects': len([o for o in bpy.data.objects if o.name.startswith('k_') or o.name.startswith('J:')])}

def kubi_preview(path, pct=60, pose=None):
    sc, c = _coll()
    shc = _show_coll()
    for o in list(shc.all_objects): bpy.data.objects.remove(o, do_unlink=True)
    c.hide_render = True
    stage = bpy.data.collections.get('RL_stage')
    root = _copy_tree(bpy.data.objects['J:kubi'], None); root.location = (0, 0, 0)
    for o in [root] + list(root.children_recursive): o.hide_render = False
    if pose == 'wave':
        for o in root.children_recursive:
            if o.name.startswith('J:shoulder_r'): o.rotation_euler = (0, -2.4, 0)
            if o.name.startswith('J:elbow_r'): o.rotation_euler = (0, -0.5, 0)
    cam = bpy.data.objects.get('rl_cam')
    cam.location = (1.1, -3.0, 1.15); cam.rotation_euler = Euler((math.radians(84), 0, math.radians(20))); cam.data.lens = 50
    sc.render.resolution_x = 900; sc.render.resolution_y = 900; sc.render.resolution_percentage = pct
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True, scene=sc.name)
    return path

def _puppet(j, rel_parent):
    """one joint: its place in the parent joint, its meshes in its own frame, its child joints"""
    m = rel_parent.inverted() @ mw(j) if rel_parent is not None else mw(j)
    loc = m.to_translation(); q = m.to_euler('XYZ')
    own = mw(j).inverted()
    slots = {}
    def add(o):
        for sl, S in _mesh_slots(o, own).items():
            T = slots.setdefault(sl, {'p': [], 'n': []}); T['p'] += S['p']; T['n'] += S['n']
        for ch in o.children:
            if ch.type == 'MESH': add(ch)
    socks = {}
    for ch in j.children:
        if ch.type == 'MESH': add(ch)
        elif ch.type == 'EMPTY' and ch.name.startswith('S:'):
            mm = own @ mw(ch); socks[ch.name[2:]] = [round(x, 4) for x in _to3(mm.to_translation())]
    kids = [_puppet(ch, mw(j)) for ch in j.children if ch.type == 'EMPTY' and ch.name.startswith('J:')]
    return {'name': j.name[2:], 'at': [round(x, 4) for x in _to3(loc)], 'rot': [round(q.x, 4), round(q.z, 4), round(-q.y, 4)], 'slots': slots, 'sockets': socks, 'kids': kids}

def kubi_export(path):
    data = {'winding': 'ccw', 'puppet': _puppet(bpy.data.objects['J:kubi'], None)}
    os.makedirs(os.path.dirname(path), exist_ok=True)
    json.dump(data, open(path, 'w'), separators=(',', ':'))
    return {'path': path, 'bytes': os.path.getsize(path)}
