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
- **Eyes:** `_set_eyes` casts the gaze ray against the blob union and puts each eyeball's centre `eyeSink`·r (0.3)
  under the skin, so every species shows a dome instead of a buried eye or a bead; an almond lid ring (`_lid`, colour
  `lidCol`) hides the seam on furred and scaly animals, the catch-light goes back onto the eyeball, and paired
  nostrils are flattened. `EYE` gives each species an iris colour and a pupil shape (round, slit, bar), painted
  onto the subdivided eyeball; eye UV islands are enlarged ×3 so the iris survives the 512 px texture.
- **Game mesh and LOD:** the dense body decimated with left/right symmetry (≈1.8× the v1 budget), plus a far version
  (≈34 %) that shares UVs, skin weights and textures. `src/models/rigged.js` switches between them with THREE.LOD.
- **Export v2:** `export_hd(id)` → JSON with positions, UVs, normals, skin, two LODs, two WebP textures, bones and
  clips (same as v1). `tools/build-rigged.py` packs it unchanged.

Running it: Blender calls must answer within 60 s, so builds run in a background queue inside Blender
(`enqueue(ids, views=(...), export=True)` / `take()` in the session namespace); each animal takes 10 to 55 s.

### v3 (October 2026): legs, body plans, mouths, bees

- **Three-joint legs:** `anat_legs` splits each lower leg at the wrist / hock into a third bone (`fl3 fr3 hl3 hr3`, from
  the joint to the ground) and moves the cannon, fetlock and foot blobs (and hoof parts) onto it. `_foot_fn` wraps every
  clip: on the ground the foot undoes the leg's swing and stays flat, in the air it folds back; knees bend ×1.25 in walk
  and run. Set `noLeg3` in a spec to keep two bones.
- **Feet:** hooves are wider than the pastern and sit flat on the ground; paws are wider and longer than the leg, with a
  pad behind. No leg ends in a point.
- **Body plans:** `BODY` holds a trunk profile per family (felid, canid, ungulate, rodent, heavy), seven stations from the
  rump to the brisket (depth, width, centre shift). `body_plan` replaces the species' hips / chest ellipsoids with 17
  overlapping ellipsoids that follow the profile, sized by the species' own rear and front blobs. `BODY_OF` maps species.
- **Mouths:** `MOUTH` gives the corner position, the drop below the nose, the thickness and the colour; `_mouth` finds
  the lip line on the blob union with rays and lays a thin tapered tube along it.
- **Bees:** `bee_spec(sid, colours)` builds one bee (hairy thorax, banded abdomen on its own bone, compound eyes, elbowed
  antennae, six jointed legs, two wing pairs) and `bee_actions` (fly / hover with a fast beat, perch with the wings folded
  back over the abdomen). `honeybee.py` and `orchidbee.py` are the same model in two colourings.
- Clip rotations are in authoring axes, applied yaw · pitch · roll: for a wing along +x, roll (z) beats it, yaw (y)
  sweeps it back.

### v4 (October 2026): natural colour, gait, flight, the session

- **Colour (`_tone`, `TONE`):** applied in `hd_paint` on top of every species' paint, multiplying it (patterns stay):
  countershading (darker back, lighter belly), darker toward the feet, broad and medium value noise, a fine grain
  stretched along the hair flow, a slight warm / cool drift. Strength per skin (fur 1, feather 0.75, scale 1.1,
  smooth 0.55). `noTone` in a spec turns it off.
- **Gait:** `quad_actions` is wrapped: walk and run legs are replaced by a stance / swing cycle (stance 62 % of a walk
  step, 40 % of a run step). Stance: the upper leg moves back at an even pace, a little knee give, the foot bone keeps the
  paw flat and lifts the heel at the end. Swing: knee and foot fold, the foot opens and reaches forward before landing.
  The head nods with the front steps. Clips that set `_g` skip `_foot_fn`.
- **Flight:** `bird_actions` is wrapped: downstroke 40 % of the beat, upstroke 60 % with the hand and tip folded,
  the tip lags the arm; the beat range is from high above the back to a little below the body.
- **Body plans:** 29 ellipsoids per trunk, sizes blended from the species' own rump and chest blobs (no rings).
- **Session (`bridge/session.py`):** run once after Blender starts. One job at a time from a timer with an 8 s pause,
  cleanup after each animal, renders to `animals/pv`, exports to `animals/out`, `take()` copies results and `clear()`
  empties them, the bake leaves two CPU cores free. Check progress by listing `pv` / `out` with the device tools; do not
  call Blender while a job runs.
- Transfer: kit and spec files go to `Documents\reshet-hachaim-blender\animals` with the device file tool (a new
  staged file name each time); exports come back by staging `animals\out\<id>.json`.

### v5 (October 2026): the neck

- In some animals (the porcupine most of all, also the coati, hyrax, agouti, kinkajou, spiny mouse, sloth, hedgehog,
  howler, capybara and tapir) the trunk reached past the base of the head: the head looked half buried and its skin was
  weighted mostly to the chest, so it moved like one cast with the body.
- `_neck_clear` (species in `NECK_FIX`): trunk ellipsoids reach at most `NECK['reach']` × head length past the head
  bone's base along the head's direction (longer ones are shortened from the front), the ones near the head are slimmed
  a little (`taper`), and a tapered neck capsule (bone `head`, weight 0.5) bridges the trunk and the head.
- `bone_weights` is wrapped: body skin past the head's base and near its axis is handed over to the head and its child
  bones over a smooth band (`b0` to `b1` × head length), so a look or a nod bends at the neck.
- `_seat_spines` takes `base` (vertices in the root ring) and `seatSpines` may be a dict of its arguments: the porcupine's
  quills are seated onto the final skin (floating roots baked as white squares). The porcupine's crest is its own part on
  the head and chest, and its white throat band has soft edges.
- `session.py`: when a species has no `idle` clip (the fruit bat), the preview uses its `meta['map']`.
- How it was measured: for each species, how far the trunk reaches past the head bone's base, and the head-chain weight at the head's base, quarter and middle (the porcupine had 0.10, 0.32, 0.67 before).

### v6, first layer (29.10.2026, 1.4): how a studio modeller looks at an animal

Avi (29.10): the models must look as if a 3D artist in a big studio made them, and the improvements belong in the
kit, so every animal gets them. The checklist a studio uses, and what the kit does for each point:

1. **Silhouette first.** The animal must be recognisable as a black shape from the side and from the front. Every
   new animal is rendered from two angles (`run(ids, views=((35,8),(90,5)))`) and from close (`head_job`), and the
   renders are looked at before export. A shape that reads wrong (a stick neck, a wing standing out like a plate,
   legs on stilts) is fixed in the spec, not hidden in the paint.
2. **Real proportions.** Leg girth, body depth and neck length from the real animal. The anatomical legs are rebuilt
   by the kit (`anat_legs`), so a spec's own leg blobs are dropped: a stockier species sets the girth through
   `ANAT[sid] = (kind, dict(scale=k))` (the ibex: 1.9), never by scaling its leg blobs.
3. **Eyes sit in the head.** An eyeball is sunk into the skull (`_set_eyes`) and framed: an almond lid for fur and
   scales, and since v6 a thin ring of bare skin for birds (`lidCol`, `lidShape` per spec). The catch-light is small
   (0.14 of the eye), so the gloss of the eye's material does the work and the eye never reads as a bead.
4. **Detail that does not shout.** Feathers are smaller (0.019 of the body) and their edges are a soft shade (half
   the old darkening), so a bird is feathered and not drawn over with a net. Patterns are soft-edged shapes on the
   form (a chin patch is a soft oval facing forward, a breast band only on the front), never a hard rectangle or a
   ring round the whole body.
5. **Parts belong to the body.** Anything that pokes through the skin is either inside it or part of the blob union
   (an owl's thighs are blobs on the leg bones, so no leg tube shows where it leaves the belly; a snail's body goes
   into the shell's opening).
6. **Rest poses of the animal itself.** A moth rests with its wings swept back flat, not folded up like a butterfly;
   an owl turns its head and hardly tilts it.

7. **Cats follow the cat rules.** A cat is built on `animals/cheetah.py` (its own felid model: `BODY_OF = 'felid'`
   for one smooth trunk with the waist tucked up, `ANAT 'cat'` legs, a round head with a short muzzle), never on the
   jaguar: the jaguar's tweak (`_jaguar_head`) adds body parts at the jaguar's own coordinates, so a cat moved or
   reshaped from it got a thin middle and stray lumps (Avi, 29.10: "built from geometric shapes"). The caracal and the
   sand cat are built this way (`base('cheetah', g); own(sid); derive('cheetah', sid)`); the sand cat is pressed
   shorter and lower by one transform, and its paint reads the cheetah's coordinates back.
8. **Call `own(sid)` before `derive`.** The kit's tables are shared by every spec of a Blender session, so an earlier
   build can leave another relative's entries (a tweak, a body plan) for the same id; `own` clears them first.

Still to come in v6 (docs/PLAN-1.4.md 11.1): proportions from measured tables per species, toes and claws, an
opening mouth, short hair shells for the cats, high resolution colour maps, and the far model for every animal.

## The reef (October 2026)

- `reef_kit.py` (exec'd by `bridge/session.py` after the two kits): `fish_spec(sid, P)` builds a fish from a side profile
  table `prof=[(t, half-height, half-width, centre-y)…]` (t = 0 tail base … 1 snout, fractions of L): an SDF body of
  overlapping ellipsoids, fins as pleated plates (`fin_plate`: resampled outline, rings toward the middle, thinner to
  the edge) on bones body / head / tail1-3 / pl / pr, a fish eye with an iris ring, skin `fishscale` (fine overlapping
  scales; `_detail` and `_tone` are wrapped). `fish_actions`: a travelling body wave for fly / glide, pectoral sculling
  for hover / perch. Other sea animals are ordinary specs in `animals/` (moray, turtle, jellyfish, octopus, urchin,
  starfish, stingray, shrimp, hermit).
- `reef_flora.py`: corals and other fixed life as static vertex-coloured meshes (voxel union, displacement, BVH ambient
  occlusion, decimate); `flora_job(id)` → `reef/flora/<id>.json` + `reef/pv/f_<id>.jpg`. Exec it into its own copy of the
  namespace (it defines its own `tube` / `sphere`).
- `reef_props.py`: the underwater devices → `reef/props_reef.json`. `reef_ground.py`: sand and rubble textures.
- Copying a file inside the PC folder from the device shell makes a hard link that the transfer tool refuses: always
  stage the file Blender wrote.
