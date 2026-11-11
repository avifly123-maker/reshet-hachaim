// Every storage key of the game, with its scope (1.4.4 stability set: moved out of core/storage.js so that
// core/profiles.js can read the per-device list without importing storage.js, which imports profiles.js; the key
// strings and the stored values never change). core/storage.js re-exports all of it: code keeps importing from there.
// the zones whose forests are saved (data/zones.js)
// every zone, also one still in the works (`wip` in data/zones.js): its saves need their keys from the first test
import { ALL_ZONE_IDS as ZONE_IDS } from '../data/zones.js';
export { ZONE_IDS };

// The names the code uses. A per-zone key is made by zoneKey / saveKey.
export const K = {
  // per device
  profiles: 'web-of-life-profiles',   // { list: [{ id, name, animal }], current }   core/profiles.js
  quality: 'web-of-life-quality',     // 'min' | 'low' | 'medium' | 'high' – the graphics the child chose      main.js
  autoq: 'web-of-life-autoq',         // { q, t } – what the automatic adjustment learned (kept two weeks)    main.js
  campad: 'web-of-life-campad',       // 'folded' | 'open' – the camera pad                                  ui/camera-pad.js
  music: 'web-of-life-music',         // 'on' | 'off'                                                         audio/music.js
  sound: 'web-of-life-sound',         // 'off' when the sounds were turned off (1.3.2)                        main.js
  sources: 'web-of-life-sources',     // 'on' | 'off' – torah edition: show the sources                       core/edition.js
  allopen: 'web-of-life-allopen',     // '1' – the instructors' switch (everything open), per player  core/journey.js
  playtime: 'web-of-life-playtime',   // { lim, day, s, extra } – the parents' daily play time (1.3.3)        core/playtime.js
  // per player
  howto: 'web-of-life-howto',         // { <cardKey>: 1 } – how-to cards already seen (per player since 1.3.2) ui/howto.js
  mode: 'web-of-life-mode',           // 'kids' | 'full' – the level (מתחילים / מתקדמים)                       main.js
  coach: 'web-of-life-coach',         // '1' – the forest's coach was seen                                    game/game/intro.js
  cards: 'web-of-life-cards',         // the learning hub's album and games                                   learn/hub/
  badges: 'web-of-life-badges',       // { own, n, frame }                                                    core/badges-store.js
  srccards: 'web-of-life-srccards',   // { <sourceId>: time } – torah edition source cards                   core/sources-store.js
  lab: 'web-of-life-lab',             // the lab of רובו־דע                                                   lab/progress.js
  research: 'web-of-life-research',   // { cases } – the mysteries                                            research/progress.js
  journey: 'web-of-life-journey',     // מסע החוקר, play mode, text size, voice                               core/journey.js
  threads: 'web-of-life-threads',     // the threads between the parts                                        core/threads.js
  photos: 'web-of-life-photos',       // [{ id, sp, sps, zone, t, img, pair?, visitor? }]                     game/rank.js
  visitors: 'web-of-life-visitors',   // [{ id, zone, t }]                                                    game/rank.js
  after: 'web-of-life-after',         // { v, z: { <zone>: {...} } } – challenges, photo missions, snapshots  game/rank.js
  robolabDraft: 'web-of-life-robolab-draft',   // 1.4.1–1.4.2 only: lesson drafts; since 1.4.3 a lesson opens empty and old drafts are removed (robolab/progress.js dropDrafts)
  robolab: 'web-of-life-robolab',   // { done: { <levelId>: { stars, blocks, t } }, seen, fun } – מעבדת הרובוטים (1.4.1) robolab/progress.js
  workshop: 'web-of-life-workshop', // { v, ideas, tried, rounds, n } – ניצוץ's workshop (1.4.4)                    workshop/progress.js
  weekly: 'web-of-life-weekly',     // { v, weeks, done, best, n, guests } – אירוע השבוע (1.4.4)                     core/weekly.js
};
export const zoneKey = (zone) => 'web-of-life-' + zone;                                    // { unlocked, done, discovered, placed, quiz }
export const saveKey = (zone, kids) => 'web-of-life-save-' + zone + (kids ? '-kids' : '');  // the whole forest (game/game/save.js)

const P = 'player', D = 'device';
// Every key: { key, scope, kind: 'json' | 'text', migrate? }. `migrate: false` – the first run of profiles (data from
// before players existed) leaves it where it is; every other unprefixed key is moved to the first player then.
export const KEYS = [
  { key: K.profiles, scope: D, kind: 'json', migrate: false },
  { key: K.quality, scope: D, kind: 'text', migrate: false },
  { key: K.autoq, scope: D, kind: 'json', migrate: false },
  { key: K.campad, scope: D, kind: 'text', migrate: false },
  { key: K.playtime, scope: D, kind: 'json', migrate: false },   // the parents' limit is for the whole computer (1.3.3)
  // read and written for the whole computer, but (as before 1.3.2) moved to the first player by the first-run migration
  { key: K.music, scope: D, kind: 'text' },
  { key: K.sound, scope: D, kind: 'text' },
  { key: K.sources, scope: D, kind: 'text' },
  { key: K.allopen, scope: P, kind: 'text' },   // 6.11: the instructors' and parents' code opens everything for one player
  { key: K.howto, scope: P, kind: 'json' },   // 1.3.2: each child sees the how-to cards (was one mark for the computer)
  { key: K.mode, scope: P, kind: 'text' },
  { key: K.coach, scope: P, kind: 'text' },
  { key: K.cards, scope: P, kind: 'json' },
  { key: K.badges, scope: P, kind: 'json' },
  { key: K.srccards, scope: P, kind: 'json' },
  { key: K.lab, scope: P, kind: 'json' },
  { key: K.research, scope: P, kind: 'json' },
  { key: K.journey, scope: P, kind: 'json' },
  { key: K.threads, scope: P, kind: 'json' },
  { key: K.photos, scope: P, kind: 'json' },
  { key: K.visitors, scope: P, kind: 'json' },
  { key: K.after, scope: P, kind: 'json' },
  { key: K.robolab, scope: P, kind: 'json' },   // 1.4.1
  { key: K.robolabDraft, scope: P, kind: 'json' },   // 1.4.1
  { key: K.weekly, scope: P, kind: 'json' },   // 1.4.4
  { key: K.workshop, scope: P, kind: 'json' },   // 1.4.4
  ...ZONE_IDS.flatMap((z) => [
    { key: zoneKey(z), scope: P, kind: 'json' },
    { key: saveKey(z, false), scope: P, kind: 'json' },
    { key: saveKey(z, true), scope: P, kind: 'json' },
  ]),
];
// the keys core/profiles.js never moves to a player (its DEVICE_KEYS)
export const unmovedKeys = () => KEYS.filter((k) => k.scope === D && k.migrate === false).map((k) => k.key);
