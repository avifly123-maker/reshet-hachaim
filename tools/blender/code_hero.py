# The robot lab's "שיעורי תכנות" picture (6.11, Avi: a big tile with a beautiful picture, like the robot workshop's).
# Same hall as rl_wk_hero (robolab_wk.py): קוּבִּי points at a floating screen of program blocks, the lessons' robot
# stands on a tile mat and the three-rotor drone flies a glowing path above it. No text, no crosses.
#   python3 tools/blender/code_hero.py <out.png> [w h samples]     (headless bpy 5.2, about a minute)
#   then: python3 tools/build-code-hero.py <out.png>  → src/data/robolab/code-hero.js
import bpy, math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() and __file__.endswith('code_hero.py') else '/home/claude/reshet-hachaim/tools/blender'
ns = {'__name__': 'rl'}
for f in ('robolab_kit.py', 'robolab_wk.py', 'kubi.py'):
    exec(open(os.path.join(HERE, f)).read(), ns)
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
out = os.path.abspath(args[0]); W = int(args[1]) if len(args) > 1 else 1600; H = int(args[2]) if len(args) > 2 else 720
SAMPLES = int(args[3]) if len(args) > 3 else 64

ns['SLOT_COL'].update({'b_move': (0.33, 0.78, 0.42), 'b_turn': (0.30, 0.58, 0.97), 'b_loop': (0.99, 0.62, 0.18),
                       'b_event': (0.68, 0.44, 0.93), 'b_act': (1.0, 0.84, 0.30), 'tile_a': (0.90, 0.86, 0.74), 'tile_b': (0.70, 0.80, 0.62)})
ns['rl_build']()
ns['kubi_build']()
sc = bpy.data.scenes['robolab']; bpy.context.window.scene = sc if bpy.context.window else None
hs_block, cyl, torus, capsule, sweep, sphere = (ns[k] for k in ('hs_block', 'cyl', 'torus', 'capsule', 'sweep', 'sphere'))

# the hall of rl_wk_hero without its robots: build it, then clear the show collection and put our own things in
ns['rl_preview']('/tmp/_pv.png', pct=5, samples=1)   # sets up the stage: camera, lights, floor
ns['rl_wk_hero'](os.path.join('/tmp', '_hall.png'), px=(64, 32), samples=1, kubi=False)
hc = bpy.data.collections['RL_hero']
for o in list(ns['_show_coll']().all_objects): bpy.data.objects.remove(o, do_unlink=True)
for o in list(hc.all_objects):
    if o.name.startswith('h_plat_') or o.name.startswith('h_ring_'): bpy.data.objects.remove(o, do_unlink=True)
for o in hc.all_objects: o.hide_render = False   # (the hall's objects come back hidden from the tiny render)
fl = bpy.data.objects.get('rl_floor')
if fl: fl.hide_render = True
def put(o):
    for c in list(o.users_collection): c.objects.unlink(o)
    hc.objects.link(o); o.hide_render = False; return o

# the tile mat (5 x 3) the lessons run on
for i in range(5):
    for j in range(3):
        put(hs_block('t_%d_%d' % (i, j), 0.66, 0.66, 0.06, 'tile_a' if (i + j) % 2 else 'tile_b', ch=0.012, loc=(-1.0 + i * 0.7, -0.2 + j * 0.7, 0.03)))
# the path: glowing dots along the planned route, and two chevrons (no crosses)
route = [(-1.0, -0.2), (-0.3, -0.2), (0.4, -0.2), (0.4, 0.5), (1.1, 0.5), (1.8, 0.5), (1.8, 1.2)]
for k, (x, y) in enumerate(route):
    put(cyl('pd_%d' % k, 0.07, 0.02, 'glow', seg=24, loc=(x, y, 0.07)))
for k, (x, y, a) in enumerate([(0.05, -0.2, 0), (1.45, 0.5, 0)]):
    pts = [(x - 0.08, y + 0.1, 0.075), (x + 0.06, y, 0.075), (x - 0.08, y - 0.1, 0.075)]
    put(sweep('chev_%d' % k, pts, 0.018, 'glow', ring=8))
# the lessons' robot on the start tile, the drone above the route
r = ns['rl_assemble']('robot', ns['LOOKS']['robot'], (-0.6, -0.1, 0.06)); r.rotation_euler = (0, 0, -1.25); r.scale = (0.8, 0.8, 0.8)
d = ns['rl_assemble']('drone', ns['LOOKS']['drone'], (0.9, 0.9, 1.55)); d.rotation_euler = (0.12, -0.08, 0.5); d.scale = (0.75, 0.75, 0.75)
for o in [r, d] + list(r.children_recursive) + list(d.children_recursive): o.hide_render = False
for k in range(9):   # the drone's flight line: small glowing dots in an arc
    t = k / 8.0
    put(sphere('fl_%d' % k, 0.025, 'glow', loc=(-0.4 + t * 1.25, 0.2 + t * 0.65, 1.15 + math.sin(t * math.pi) * 0.35)))

# the floating screen of program blocks, at the right
SX, SY, SZ = 2.45, 0.55, 1.5
scr = put(hs_block('scr', 1.55, 0.08, 1.75, 'dark', ch=0.04, loc=(SX, SY, SZ)))
put(hs_block('scr_rim', 1.63, 0.06, 1.83, 'glow', ch=0.04, loc=(SX, SY + 0.03, SZ)))
for k in range(2): put(cyl('scr_leg_%d' % k, 0.03, 0.75, 'metal', seg=16, loc=(SX + (k - 0.5) * 0.9, SY + 0.05, 0.38)))
def block(name, slot, x, z, w, h=0.2, inset=0.0):
    b = put(hs_block(name, w, 0.07, h, slot, ch=0.03, loc=(SX - 0.62 + x + w / 2, SY - 0.08, z)))
    put(hs_block(name + '_tab', 0.16, 0.07, 0.05, slot, ch=0.015, loc=(SX - 0.62 + x + 0.22, SY - 0.08, z + h / 2 + 0.02)))   # the notch that joins blocks
    return b
z0 = SZ + 0.62
block('blk_ev', 'b_event', 0.0, z0, 0.9, 0.24)
block('blk_mv', 'b_move', 0.0, z0 - 0.27, 0.8)
block('blk_lp', 'b_loop', 0.0, z0 - 0.52, 1.1)
put(hs_block('blk_lp_side', 0.12, 0.07, 0.55, 'b_loop', ch=0.03, loc=(SX - 0.56, SY - 0.08, z0 - 0.78)))   # the loop's mouth
block('blk_tn', 'b_turn', 0.14, z0 - 0.77, 0.7)
block('blk_ac', 'b_act', 0.14, z0 - 1.02, 0.8)
put(hs_block('blk_lp_end', 1.1, 0.07, 0.12, 'b_loop', ch=0.03, loc=(SX - 0.62 + 0.55, SY - 0.08, z0 - 1.24)))
for k, z in enumerate((z0 - 0.27, z0 - 0.77, z0 - 1.02)):   # small round icons on the blocks (light, not letters)
    put(cyl('blk_dot_%d' % k, 0.045, 0.02, 'cream', seg=20, axis='Y', loc=(SX - 0.5 + (0.14 if k else 0), SY - 0.125, z)))

# קוּבִּי at the left, pointing at the screen with a happy face (as in rl_wk_hero)
k = ns['_copy_tree'](bpy.data.objects['J:kubi'], None); k.location = (-1.85, -1.1, 0); k.rotation_euler = (0, 0, -0.25); k.scale = (0.85, 0.85, 0.85)
for o in [k] + list(k.children_recursive):
    o.hide_render = False
    if o.name.startswith('J:shoulder_l'): o.rotation_euler = (0, 2.2, 0)
    if o.name.startswith('S:face'):
        for kx in (-1, 1):
            e = put(capsule('k_eye_%d' % kx, (kx * 0.08, -0.004, 0.02), (kx * 0.08, -0.004, 0.06), 0.028, 'glow', seg=16)); e.parent = o
        m = put(sweep('k_smile', [(math.cos(a) * 0.08, -0.004, -0.05 + math.sin(a) * 0.04) for a in [math.pi + 0.5 + t * (math.pi - 1.0) / 8 for t in range(9)]], 0.012, 'glow', ring=8)); m.parent = o

cam = bpy.data.objects['rl_cam']; cam.location = (0.3, -6.0, 1.75); cam.data.lens = 33; ns['_look_at'](cam, (0.2, 0.6, 0.75))
sc.render.resolution_x, sc.render.resolution_y = W, H
try: sc.eevee.taa_render_samples = SAMPLES
except Exception: pass
sc.render.filepath = out
bpy.ops.render.render(write_still=True, scene=sc.name)
print('wrote', out)
