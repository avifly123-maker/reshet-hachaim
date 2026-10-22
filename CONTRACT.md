# רשת החיים (Web of Life) — architecture & module contract

A 3D ecosystem-building game for Haredi children (approx. grades 3–6), part of the Baba Da annual theme
"biodiversity". Two biomes: **Amazon rainforest** (`amazon`) and **Israeli Mediterranean woodland / חורש ארץ-ישראלי** (`grove`).
The player drags plants and animals onto a floating 3D diorama island, watches them live, sees glowing
"web of life" links between them, and manages light, seasons, events and missions.
The central dynamic of the Amazon is **the struggle for light** (forest layers, canopy gaps, light shafts);
the central dynamic of the grove is **the seasons** (winter rain → spring bloom → summer drought → autumn).

Everything is plain JavaScript (ES modules) + three.js r186, bundled by esbuild into ONE offline HTML
file (`node build.mjs` → `dist/index.html`). **No network at runtime**: no CDN, no web fonts, no external images.
All 3D models, textures and sounds are generated procedurally in code. Must run on weak school PCs (quality tiers).

## Hard content rules (apply to every module, including on-screen text and visuals)
- **No human figures at all** (no people, no hands, no faces). Human impact is shown only through objects (e.g. a stump, smoke, a net).
- No dinosaurs, no "millions of years", no evolution language. Say "בעבר הרחוק" if ever needed; describe adaptations as what a creature *can do*.
- No pigs / wild boar. Gentle wording about reproduction ("נולדים גורים", "צומחים נבטים חדשים").
- Hebrew UI, fully RTL. Simple language (grades 3–5). Facts must be true (content agent verifies them).

## Directory layout
```
build.mjs                 bundler → single HTML (inlines src/ui/style.css); --desktop → desktop/app/ (core.js + packs/ + assets/, served as app://game/)
tools/shot.py             headless WebGL screenshot: python3 tools/shot.py page.html out.png [wait] [w] [h] [js]
tests/rig.js              shared lighting rig for model galleries (ACES tone mapping, sun, sky, shadows)
src/core/util.js          makeRng, hashString, clamp/lerp/smoothstep/damp, makeNoise2D, makeBus, cachedMaterial, jitterColor, mergeGeometries, paint, SEASONS
src/env/pipeline.js       renderer + post-processing                         (ENV agent)
src/env/environment/      island, sky, sun/moon, fog, water, weather, shafts  (ENV agent; index.js + one file per part)
src/models/amazon-plants/     PLANTS map for amazon                          (AMAZON-PLANTS agent)
src/models/grove-plants/      PLANTS map for grove                           (GROVE-PLANTS agent)
src/models/amazon-animals/    ANIMALS map for amazon (+ extra/: ANIMALS_EXTRA) (AMAZON-ANIMALS agent)
src/models/grove-animals/     ANIMALS map for grove (+ extra/: ANIMALS_EXTRA)  (GROVE-ANIMALS agent)
                              (1.3.2: each folder = index.js + one file per part, listed in its header; the old
                              src/models/<biome>-<kind>[-extra].js files only re-export the folders)
src/data/amazon.js, src/data/grove.js   BIOME content objects                (CONTENT agent)
src/data/common.js        shared Hebrew labels (relation type names, layer names...) (CONTENT agent)
docs/sources.md           sources for every fact                             (CONTENT agent)
src/ui/ui/ + src/ui/style.css     DOM overlay UI (index.js + one file per part; src/ui/ui.js re-exports it) (UI agent)
src/audio/audio.js        procedural Web Audio                               (AUDIO agent)
src/main.js, src/sim/*, src/world/*   core loop, light map, ecology, entities, links, camera (CORE – lead)
```
Each agent touches ONLY its own files (+ its own `tests/<name>*.js` and scratch HTML/PNG under `scratch/`).

## World conventions
- Units ≈ metres, **y up**. Island centre at origin. Placeable disc radius **R = 38**; island visual radius ≈ 44–46.
- Ground height comes from `env.heightAt(x,z)` (gentle relief, roughly −1..+3).
- Time: `dayFrac` ∈ [0,1): 0 = midnight, 0.25 sunrise, 0.5 noon, 0.75 sunset. One game day ≈ 240 s at speed 1.
- Grove seasons: `season` ∈ `'winter'|'spring'|'summer'|'autumn'`, `seasonFrac` ∈ [0,1) progress within it. One season = one game day.
  Amazon has no seasons (season = null) but has afternoon rain showers and storms.
- Height scale (game units, top of mature plant):
  - Amazon: kapok 34–38, brazilnut 30–34 (emergent layer, 28–40); fig 22–26 (canopy 16–28); cecropia 14–18 (fast pioneer);
    acai palm 10–13; heliconia 2–3; fern 1–1.6; bromeliad ~0.9 (on branches); orchid ~0.6 (on branches); liana climbs host;
    glowfungus 0.3–0.5; waterlily pad Ø 2–2.5 on water.
  - Grove: pine 15–17; oak 9–11; carob 8–10; terebinth 8–10; mastic 2.5–3.5; buckthorn 2.5–3.5; rockrose 1–1.4; sage 0.8–1.2;
    cyclamen 0.35 (draw it ~0.5 for visibility); anemone 0.4 (draw ~0.6); mushroom 0.3–0.5.
- Animals are **exaggerated in size for visibility** (diorama convention). Target body lengths (or wingspans):
  - Amazon: jaguar 2.2, tapir 2.4, capybara 1.4, agouti 0.8, sloth 1.0, howler 1.0, harpy 1.3 (wingspan 2.4), toucan 0.8,
    macaw 1.0 (incl. tail), hummingbird 0.4, morpho wingspan 0.55, orchidbee 0.3, dartfrog 0.35, fruitbat wingspan 0.8,
    leafcutter ant 0.15 each (colony).
  - Grove: gazelle 1.5 (shoulder 1.0), fox 1.1, porcupine 0.9, hedgehog 0.45, hyrax 0.6, owl 0.6 tall (wingspan 1.2),
    jay 0.5, blackbird 0.4, chameleon 0.4, agama 0.45, spinymouse 0.3, honeybee 0.2, butterfly wingspan 0.35,
    harvesterant 0.1 each (colony), firefly swarm (individual 0.08 + glow sprite).
- Models face **+Z** (forward), origin at ground contact under the body (flyers: origin at body centre; core lifts them).

## Species ids (fixed — every module uses exactly these)
**amazon plants:** kapok, brazilnut, fig, cecropia, acai, heliconia, bromeliad, orchid, liana, fern, glowfungus, waterlily
**amazon animals:** leafcutter (colony), orchidbee, morpho, hummingbird, dartfrog, toucan, macaw, sloth, agouti, howler, jaguar, harpy, capybara, tapir, fruitbat
**grove plants:** oak, terebinth, carob, pine, mastic, buckthorn, sage, rockrose, cyclamen, anemone, mushroom
**grove animals:** honeybee, butterfly, harvesterant (colony), firefly (swarm), jay, blackbird, chameleon, agama, spinymouse, porcupine, hedgehog, hyrax, gazelle, fox, owl

Hebrew names (content agent may refine): קפוק, אגוז ברזיל, פיקוס חונק, צקרופיה, דקל אסאי, הליקוניה, ברומליה, סחלב, ליאנה, שרך, פטרייה זוהרת, ויקטוריה (שושנת מים ענקית);
נמלים קוטעות עלים, דבורת סחלבים, פרפר מורפו, יונק דבש, צפרדע חץ, טוקן, תוכי ארה, עצלן, אגוטי, קוף מייללן, יגואר, עיט הרפי, קפיברה, טפיר, עטלף פירות;
אלון מצוי, אלה ארץ-ישראלית, חרוב מצוי, אורן ירושלים, אלת המסטיק, אשחר ארץ-ישראלי, מרווה משולשת, לוטם, רקפת מצויה, כלנית מצויה, פטריות;
דבורת דבש, פרפר, נמלת קציר, גחלילית, עורבני, שחרור, זיקית מצויה, חרדון מצוי, קוצן מצוי, דורבן, קיפוד, שפן סלע, צבי ארץ-ישראלי, שועל מצוי, תנשמת.

## Visual style (all model / env agents)
Stylised, rich, "premium diorama" look — think a handcrafted low-poly world with soft lighting, not flat clip-art and not
photorealism. Organic silhouettes (no plain cylinders-and-spheres look): taper, bend, jitter vertices, cluster leaves,
vary colour per vertex/instance with `jitterColor`. `MeshStandardMaterial` (roughness 0.6–1, metalness 0) with
`vertexColors: true`, `flatShading` allowed for faceted look. Emissive only for genuinely glowing things.
Performance budget: tree ≤ 4k triangles, shrub ≤ 1.5k, small plant ≤ 600, animal ≤ 2k; ≤ 6 meshes per model
(merge static parts with `mergeGeometries`/`paint`; keep animated parts as separate child meshes). Cache geometry
& materials per species (build once, reuse across instances; per-instance variety via scale/rotation/colour-jitter
variants – e.g. cache 3 variants per species keyed by `seed % 3`). `castShadow = receiveShadow = true` on solid meshes.

---
## 1. Render pipeline — `src/env/pipeline.js`
```js
export function createPipeline(canvas, { quality = 'medium' }) → {
  renderer, scene, camera,          // PerspectiveCamera fov 45, near 0.1, far 600
  render(dt),                       // renders scene (with post-processing on medium/high)
  resize(),                         // call on window resize
  setQuality(q),                    // 'low'|'medium'|'high' : pixel ratio, shadows size, bloom on/off, antialias
  setBloom(strength), setExposure(x),
  quality,
}
```
ACESFilmic tone mapping (exposure ≈1), sRGB output, PCFSoft shadows. Post: UnrealBloom (threshold high so only
emissives/sun glow bloom) + OutputPass on medium/high; low = no composer. Optional gentle vignette / colour grade pass.

## 2. Environment — `src/env/environment/` (index.js; the parts are listed in its header)
```js
export function createEnvironment(pipeline, biomeId, { quality, seed = 1 }) → env
env.radius            // 38 – placeable radius
env.heightAt(x, z)    // ground surface y
env.isWater(x, z)     // true on river/pond
env.isPlaceable(x, z) // land, inside radius, not too steep, not water, not on a rock top
env.waterLevel        // y of water surface (or null)
env.water             // { path:[{x,z}], width } or { pools:[{x,z,r}] } description, for core AI (drinking, waterlily)
env.rocks             // [{x,z,r,top}] rock outcrops (grove: limestone; amazon: few mossy boulders)
env.groundMeshes      // meshes to raycast for placement (land only)
env.waterMeshes       // water meshes (raycast for waterlily placement)
env.sun               // { direction: Vector3 (unit, pointing TOWARD the sun), elevation (radians, <0 at night), light: DirectionalLight }
env.update(dt, ctx)
   ctx = { t, dayFrac, season, seasonFrac, rain 0..1, wind 0..1, nightGlow 0..1 (night-ness),
           camera, vitality 0..1 (ecosystem health → lushness/saturation of grass, birds-in-sky, haze),
           drought 0..1, fire: [{x,z,r,intensity}], lightning: bool (one-shot flash),
           shafts: [{x, z, yTop, radius, strength 0..1}] }  // canopy gaps computed by core
env.setLightOverlay(texture | null)  // DataTexture (RGBA, NxN) mapped over square [-R,R]x[-R,R] on the ground; null hides
env.setGap(x, z, r, amount)          // optional: ground cover reacts (e.g. sunny gap gets brighter grass)
env.dispose()
```
Must own: sky (gradient dome + sun disc + moon + stars), day/night lighting (sun DirectionalLight with shadow camera
covering the island, hemisphere/ambient, warm sunrise/sunset, blue moonlit night that is still readable), fog/haze,
the island itself (top surface + a beautiful cross-section edge: soil strata, roots, rocks, hanging moss/vines),
what surrounds it (sea of mist/clouds, distant hills/forest silhouettes), water (amazon: a river crossing the island
and spilling off the edge as a waterfall; grove: a small spring/pool), ground cover (instanced grass, leaf litter,
pebbles, small ferns – non-interactive scatter), weather (rain particles, wind, lightning flash, drifting mist),
ambient particles (dust motes visible in light shafts, pollen, seeds), **light shafts** (volumetric-looking god rays
from canopy gaps, aligned with `sun.direction`, fading with sun elevation), fire visuals, season tinting of ground
(grove: green winter/spring with flower dots, golden-dry summer), drought tint.

## 3. Plant models — `src/models/<biome>-plants/` (index.js; `src/models/<biome>-plants.js` re-exports it)
```js
export const PLANTS = { <speciesId>: (opts) => PlantVisual, ... }
opts = { seed, rng (makeRng(seed)), hostHeight?, hostRadius? }   // host* only for 'liana'
PlantVisual = {
  object,                         // THREE.Object3D, origin at ground (trunk base) – grows up +Y
  setGrowth(g),                   // 0 seedling … 1 mature (seedling form should look like a seedling, not a tiny tree)
  setHealth(h),                   // 1 lush … 0 dying (desaturate/brown/thin leaves)
  setSeason(season, frac),        // grove: leaf state (terebinth deciduous: bare in winter), bloom/fruit look; amazon: no-op
  setBloom(b), setFruit(f),       // 0..1 show flowers / fruit (core drives these)
  setNightGlow(n),                // glowfungus/mushroom/flowers that glow – else no-op
  update(dt, t, wind),            // gentle sway / animation
  crown(),                        // → { top, bottom, radius, density } local y-range & radius of foliage at current growth/season (density 0..1 = how much light it blocks)
  attachPoints(),                 // trees: → [{ pos: Vector3 (local), normal: Vector3 }] branch spots for epiphytes (bromeliad/orchid). others: []
  perchPoints(),                  // trees/shrubs: → [Vector3 local] spots where birds/monkeys/sloths/bats can sit. others: []
  trunkRadius,                    // at base (for lianas / collision)
  fall(p),                        // trees: 0..1 animate toppling (core rotates the object; implement only if you need extra e.g. leaves scattering) – optional
  dispose(),
}
```
liana: given `hostHeight` & `hostRadius`, spiral up a trunk (placed by core at the trunk's base, same origin as the tree)
with leaves along it and a burst at the top. bromeliad/orchid: rosette meant to sit on a branch (origin at its base).
waterlily: big round pads with upturned rims + a flower, origin on the water surface. glowfungus: cluster of small
mushrooms that glow green at night. fig: the strangler fig (aerial roots wrapping a trunk, broad canopy, figs).

## 4. Animal models — `src/models/<biome>-animals/` (index.js, and extra/; `src/models/<biome>-animals[-extra].js` re-export them)
```js
export const ANIMALS = { <speciesId>: (opts) => AnimalVisual | ColonyVisual | SwarmVisual }
AnimalVisual = {
  type: 'animal',
  object,                         // faces +Z; origin at ground under body (flyers: body centre)
  update(dt, s),                  // s = { action, speed (m/s), t, night 0..1 }
       // action ∈ 'idle'|'walk'|'run'|'fly'|'glide'|'hover'|'perch'|'climb'|'hang'|'swim'|'eat'|'sleep'
       // animate legs/wings/tail/head procedurally; support at least the actions that make sense for the species
  height, length,                 // for labels / selection rings
  dispose(),
}
ColonyVisual (leafcutter, harvesterant) = { type:'colony', object, setTrail(pointsWorld: Vector3[]), update(dt, {t, night, activity 0..1}), dispose() }
    // nest mound + a moving trail of tiny ants walking along the trail points (leafcutters carry green leaf bits home;
    // harvester ants carry seeds). Use InstancedMesh for ants.
SwarmVisual (firefly) = { type:'swarm', object, update(dt, {t, night, activity}), dispose() }
    // ~12 fireflies drifting in a cloud ~3 m wide, blinking glow at night (additive sprites), nearly invisible by day.
```
Blender models (since 1.2.0): `tools/blender/animal_kit.py` + `tools/blender/animals/<id>.py` build each species in Blender
(voxel-union body, armature, field weights, vertex colours, baked action clips) and export it; `tools/build-rigged.py`
writes `src/data/rigged-<zone>.js`; `src/models/rigged.js` (`withRigged`) serves those species as skinned meshes with
the same AnimalVisual contract. Species without a Blender model keep their procedural model.
Animals must read clearly at 30–60 m camera distance: strong silhouettes, characteristic colours (toucan beak, macaw
red/blue/yellow, morpho iridescent blue, dart frog bright blue/yellow, jaguar rosettes via vertex colours, jay blue
wing patch, hoopoe-like crest not needed). Wings of birds/bats/butterflies flap; fliers bank slightly.

## 5. Content — `src/data/amazon.js`, `src/data/grove.js`, `src/data/common.js`
```js
export const BIOME = {
  id, name, subtitle, intro,            // Hebrew
  layers: [{ id, name, desc, yRange:[lo,hi] }],   // amazon: emergent/canopy/understory/floor ; grove: canopy/understory(shrubs)/floor ; plus 'water'/'air' where relevant
  species: [Species],
  missions: [Mission], events: [Event],
  tips: [string],                       // short tips/facts shown while loading / idle
}
Species = {
  id, name, nameEn, kind: 'tree'|'palm'|'shrub'|'herb'|'epiphyte'|'vine'|'fungus'|'water-plant'|'animal'|'colony'|'swarm',
  layer, locomotion?: 'ground'|'arboreal'|'flying'|'water',   // animals
  active?: 'day'|'night'|'both',
  needs?: { water?:true, rocks?:true, host?:'tree' },        // placement constraints
  lightNeed?: 0..1,  shadeTolerant?: bool,  growth?: 'fast'|'medium'|'slow',   // plants
  seasons?: { leaves:'evergreen'|'deciduous', bloom:[season…], fruit:[season…], dormant?:[season…] }, // grove plants (+ animals: active seasons)
  diet?: [{ id, part:'leaves'|'fruit'|'nectar'|'seeds'|'insects'|'animals'|'fungus'|'dead'|'roots' }],
  relations: [{ target, type:'pollinates'|'disperses'|'home'|'shelter'|'decomposes'|'partner'|'climbs'|'eats', text }],
  cost, groupSize:[min,max], maxCount, unlock: 'start' | <missionId>,
  fact, more, question?:{ q, options:[…], answer }, color, sources:[url]
}
Mission = { id, title, text, hint, after: <missionId>|null, goal: Goal, reward: { points, unlock:[speciesId…] } }
Goal types (core implements exactly these):
  {type:'place', species, count} | {type:'speciesAlive', count} | {type:'link', from, to} | {type:'chain', length}
  {type:'health', min, seconds} | {type:'grow', species, count} | {type:'floorLight', min}
  {type:'pollinate', species, count} | {type:'disperse', count} | {type:'discover', count}
  {type:'observeNight'} | {type:'survive', event} | {type:'bloom', species, season} | {type:'experiment'}
Event = { id, title, text, trigger: {type:'day', day} | {type:'mission', id} | {type:'random', chancePerDay, season?},
          start?: [Effect], choices: [{ id, label, outcome, effects:[Effect] }] }
Effect types (core implements exactly these):
  {type:'treeFall', target:'tallest'|speciesId} | {type:'rain', seconds} | {type:'drought', seconds, strength}
  {type:'fire', strength} | {type:'heat', seconds} | {type:'flood', seconds} | {type:'points', amount}
  {type:'add', species, count} | {type:'remove', species, count|'all'} | {type:'unlock', species}
  {type:'boost', species, amount} | {type:'plant', species, count, where:'gap'|'any'}
```

## 6. UI — `src/ui/ui/` (index.js; the parts are listed in its header; `src/ui/ui.js` re-exports it) (+ `src/ui/style.css`)
`export function createUI(root, bus) → ui` — DOM overlay over the canvas, RTL Hebrew. Talks to core only through
the methods below (core → UI) and `bus.emit(name, payload)` (UI → core). See the UI agent brief for the exact list.

## 7. Audio — `src/audio/audio.js`
`export function createAudio() → { start(), setBiome(id), update(ctx), play(name, opts), setMuted(b), muted }` – procedural Web Audio.

## River crossings (1.2.1)
The Amazon environment exports `bridges` (log end points), `bridgeAt(x, z)` → deck height or null, and
`walkRoute(x0, z0, x1, z1)` → `[]` or the two log ends to walk over. Ground animals use them in `canStand`,
`groundY` and `startWalk` (goal.via waypoints); hunts across the river walk over the log first.
