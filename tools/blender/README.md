# Blender scripts (run inside Blender 5.x via the MCP bridge or the Text Editor)

Each script is self-contained and idempotent: it (re)builds its own scene and never touches other scenes.
Render outputs go to the OS temp folder; tools/build-panorama.py packs them from art/pano/.

- pano_common.py   – helpers: fbm noise, polar terrain builder, pano camera, compositor haze, async quarter renders
- amazon_pano.py   – Amazon horizon: canopy crowns (particles), wide river, mist patches, hazy uplands
- grove_pano.py    – Grove horizon: rolling limestone hills with terraces, oaks/carobs/olives, rocks, clear air

Panorama camera: equirectangular, latitude -20..+7°, 450 m above the canopy, rendered as four 90° quarters
(2048×614 each, Cycles 40 spp + denoise) plus a 2048-wide mist pass for in-game re-hazing.
Lesson learned: never run heavy Python in Blender while an async render is running (it can deadlock).

## Animals, v2 "museum diorama" (animal_kit_hd.py, October 2026)

`animal_kit.py` builds an animal from blobs, bones, paint and clips (v1: vertex colours). `animal_kit_hd.py` is exec'd
into the same namespace and upgrades the pipeline without changing any bone or clip:

- **Organic union:** the body blobs are fused through Blender 5 SDF grid nodes (Mesh to SDF Grid → SDF Grid Fillet →
  Grid to Mesh), so the hollows between body parts get fillets like muscles and skin, while limbs keep their shape.
- **Anatomy:** `anat_legs(spec, kind)` rebuilds quadruped legs from the leg bones (fl fl2 fr fr2 hl hl2 hr hr2):
  shoulder and haunch masses, point of the elbow, forearm tapering to a wrist knob, the hock angled back, slim cannon
  bones, fetlocks, paws or hooves. Kinds: ungulate, cat, canid, rodent, heavy. `ANAT` maps species to kinds; `TWEAK`
  holds per-species fixes (continuous tails, head scale, extra muscles). Birds get folded-wing volume along the body
  sides (`_bird_fold`), painted with the species' own `wcol`, so the wing plates sink into it when folded.
- **Dense sculpt + bake:** a ~140k-triangle copy of the body gets skin relief along the hair flow (fur streaks and
  clumps, overlapping feather shingles, scales) and is painted vertex by vertex; Cycles bakes it onto the game mesh:
  a 512 px colour texture (with soft ambient occlusion) and a tangent-space normal map. Wings and tails of birds get
  long flight-feather relief.
- **Game mesh and LOD:** the dense body decimated with left/right symmetry (≈1.8× the v1 budget), plus a far version
  (≈34 %) that shares UVs, skin weights and textures. `src/models/rigged.js` switches between them with THREE.LOD.
- **Export v2:** `export_hd(id)` → JSON with positions, UVs, normals, skin, two LODs, two WebP textures, bones and
  clips (same as v1). `tools/build-rigged.py` packs it unchanged.

Running it: Blender calls must answer within 60 s, so builds run in a background queue inside Blender
(`enqueue(ids, views=(...), export=True)` / `take()` in the session namespace); each animal takes 10 to 55 s.
