// Environment: floating diorama island, sky, sun/moon, fog, water, weather, light shafts, fire, ground cover.
// See CONTRACT.md §2. Biomes: 'amazon' | 'grove' | 'desert' (1.4) (the reef's environment is src/env/reef.js, in the reef pack).
// 1.3.2: split from the single src/env/environment.js into this folder; the public API is unchanged (createEnvironment).
// createEnvironment builds one shared context object (ctx) and calls the parts in the original creation order (scene
// order and draw order depend on it); each part reads what it needs from ctx and its results are merged back into ctx.
//   terrain.js       island shape, height field, river / pool, log crossings, rock layout, soil and cover
//   ground.js        ground uniforms G, ground shader and mesh
//   island-edge.js   the cliff (skirt) under the island, strata
//   rocks.js         rock outcrops, roots, hanging vines
//   sky.js           sky dome and the painted distant landscape
//   far-land.js      far land ring and far tree crowns
//   mist.js          sea of mist below; mist banks
//   water.js         river, pools, logs, waterfall
//   scatter.js       instanced ground scatter (scatter-geoms.js: its geometry builders)
//   props.js         Blender ground props, fallen fruit
//   lights.js        sun / moon light, hemisphere light, fog
//   shafts.js        light shafts and dust motes
//   ambient.js       pollen / night motes, distant birds
//   weather.js       rain, lightning bolt
//   fire.js          flames, smoke, embers, scorch
//   update.js        the per-frame update
//   controls.js      overlay, gaps, isPlaceable, quality, dispose
//   tree-shadows.js  soft painted tree shadows
//   common.js, textures.js, palettes.js: constants, procedural textures, colour keyframes
import * as THREE from 'three';
import { makeRng, makeNoise2D } from '../../core/util.js';
import { Q, MAX_SCORCH, C, V3, R } from './common.js';
import { makeTileNoiseTexture, makePuffTexture } from './textures.js';
import { createTerrain } from './terrain.js';
import { createGround } from './ground.js';
import { createIslandEdge } from './island-edge.js';
import { createRocks } from './rocks.js';
import { createSky } from './sky.js';
import { createFarLand } from './far-land.js';
import { createMistSea, createMistBanks } from './mist.js';
import { createWater } from './water.js';
import { createScatter } from './scatter.js';
import { createProps } from './props.js';
import { createLights } from './lights.js';
import { createShafts } from './shafts.js';
import { nearWadi } from './desert-look.js';
import { createPollen, createBirds } from './ambient.js';
import { createRain } from './weather.js';
import { createFire } from './fire.js';
import { createUpdate } from './update.js';
import { createControls } from './controls.js';
import { createTreeShadows } from './tree-shadows.js';

// ═════════════════════════════════════════════════════════ createEnvironment
// impostorTrees (optional): [{ id, role, build: () => PlantVisual }] – a few mature trees of the zone, baked into the far
// forest's tree impostors (roles: amazon 'emergent' | 'canopy' | 'palm', grove 'tree' | 'bush'). Without them (or if the
// bake fails) the far forest uses simple faceted crowns.
// zoneEnv (optional): a zone pack's own environment factory (the reef's diorama, src/env/reef.js, comes in the reef pack
// with its coral models, so the other zones and the start screen never load it).
export function createEnvironment(pipeline, biomeId = 'amazon', { quality = 'medium', seed = 1, impostorTrees = null, zoneEnv = null } = {}) {
  if (zoneEnv) return zoneEnv(pipeline, { quality, seed });
  if (biomeId === 'reef') throw new Error('the reef environment comes with the reef pack (zone.env)');
  // 1.4: the desert uses the grove's dry-land parts with its own look (isDesert; colours and shapes in desert-look.js)
  const isDesert = biomeId === 'desert';
  const isAmazon = biomeId !== 'grove' && !isDesert;
  const biome = isAmazon ? 'amazon' : isDesert ? 'desert' : 'grove';
  const scene = pipeline.scene;
  const qual = Q[quality] || Q.medium;
  const rng = makeRng(seed * 7919 + (isAmazon ? 11 : 23));
  const noise = makeNoise2D(seed * 31 + (isAmazon ? 5 : 9));
  const noiseB = makeNoise2D(seed * 57 + 77);
  const root = new THREE.Group(); root.name = 'environment';
  scene.add(root);
  const disposables = [];
  const track = (x) => { disposables.push(x); return x; };

  const noiseTex = track(makeTileNoiseTexture(256, seed + 3));
  const puffTex = track(makePuffTexture(128, seed + 5));

  // Shared uniforms (same objects referenced by many materials)
  const U = {
    uTime: { value: 0 }, uWind: { value: 0.2 }, uVital: { value: 1 }, uWet: { value: 0 },
    uScorch: { value: Array.from({ length: MAX_SCORCH }, () => new THREE.Vector4(0, 0, 0, 0)) },
    uNoise: { value: noiseTex },
    uSunDir: { value: V3(0, 1, 0) }, uSunCol: { value: C('#ffffff') },
    uLightCol: { value: C('#ffffff') },  // overall ambient-ish light level colour for unlit shaders
    uSkyCol: { value: C('#88aacc') }, uHorCol: { value: C('#ccddee') },
    uPx: { value: 600 },
  };

  // one shared context for the parts (see the header); each part's results are merged into it, in creation order
  const ctx = { pipeline, scene, biome, isAmazon, isDesert, quality, qual, seed, impostorTrees, noise, noiseB, root, disposables, track,
    noiseTex, puffTex, U };
  Object.assign(ctx, createTerrain(ctx));      // ─ island shape & height field, water layout, log crossings, rocks layout
  Object.assign(ctx, createGround(ctx));       // ─ ground (top surface)
  Object.assign(ctx, createIslandEdge(ctx));   // ─ island cross-section (skirt)
  Object.assign(ctx, createRocks(ctx));        // ─ rocks (merged), roots & hanging vines on the edge
  Object.assign(ctx, createSky(ctx));          // ─ sky dome
  Object.assign(ctx, createFarLand(ctx));      // ─ distant land (silhouettes below / around)
  Object.assign(ctx, createMistSea(ctx));      // ─ sea of mist below
  Object.assign(ctx, createWater(ctx));        // ─ water
  Object.assign(ctx, createScatter(ctx));      // ─ ground scatter (instanced)
  Object.assign(ctx, createProps(ctx));        // ─ ground details modelled in Blender, fallen fruit
  Object.assign(ctx, createLights(ctx));       // ─ lights
  Object.assign(ctx, createShafts(ctx));       // ─ light shafts (god rays), dust motes
  Object.assign(ctx, createPollen(ctx));       // ─ ambient particles (pollen by day, glow motes at night)
  Object.assign(ctx, createMistBanks(ctx));    // ─ mist banks (billboards)
  Object.assign(ctx, createRain(ctx));         // ─ rain, lightning bolt
  Object.assign(ctx, createFire(ctx));         // ─ fire
  Object.assign(ctx, createBirds(ctx));        // ─ distant birds (more with vitality)
  Object.assign(ctx, createUpdate(ctx));       // ─ state & update
  Object.assign(ctx, createControls(ctx));     // ─ overlay, gaps, isPlaceable, quality, dispose

  const { riverPts, riverHW, pools } = ctx;
  const water = isAmazon
    ? { path: riverPts.filter((p, i) => i % 2 === 0 || i === riverPts.length - 1).map(p => ({ x: p.x, z: p.z })), width: riverHW * 2, pools: pools.map(p => ({ x: p.x, z: p.z, r: p.r })) }
    : { pools: pools.map(p => ({ x: p.x, z: p.z, r: p.r })) };

  Object.assign(ctx, createTreeShadows(ctx));  // ─ soft tree shadows

  const {
    WL, heightAt, isWater, isPlaceable, waterDist, bridges, bridgeAt, walkRoute, rocks, groundMesh, waterMeshes,
    rockMesh, sun, update, setLightOverlay, setGap, setQuality, dispose, setTreeShadows, setFallenFruit,
    night
  } = ctx;
  const env = {
    biome, radius: R, root,
    heightAt, isWater, isPlaceable, waterLevel: WL, water,
    waterDist, nearWadi: isDesert ? nearWadi : null,   // 1.4: the desert's water (src/game/game/water.js)
    bridges: bridges.map(b => ({ ax: b.ax, az: b.az, bx: b.bx, bz: b.bz })), bridgeAt, walkRoute,
    rocks: rocks.map(r => ({ x: r.x, z: r.z, r: r.r, top: r.top })),
    groundMeshes: [groundMesh],
    waterMeshes,
    rockMeshes: [rockMesh],
    sun,
    update, setLightOverlay, setGap, setQuality, dispose, setTreeShadows, setFallenFruit,
    get night() { return night.v; },
  };
  update(0, { t: 0, dayFrac: 0.5 });
  return env;
}
