// All the words of רובו־דע the guide (1.3.2), gathered from one file per area so that each area keeps its own.
// A key is a part of core/journey.js PARTS (presented the first time it is entered) or any other place name.
// Every line: { id (unique, the voice file), f (words), k (beginners: full nikud), at? (selector to point at), expr? }.
// tools/validate-guide.mjs checks ids, length, nikud and the content rules; tools/voice/make.py voices every line.
import { STAGE_LINES, LEGACY_LINES } from './guide/stages.js';
import { START_GUIDE } from './guide/start.js';
import { HUB_GUIDE } from './guide/hub.js';
import { LAB_GUIDE } from './guide/lab.js';
import { ZONE_GUIDE } from './guide/zone.js';
import { RESEARCH_GUIDE } from './guide/research.js';
import { THREAD_GUIDE } from './guide/threads.js';
import { AFTER_GUIDE } from './guide/after.js';   // area H: visitors, photos, challenges, the island's rank
export { STAGE_LINES, LEGACY_LINES };
// THREAD_GUIDE: 'threads:<id>' → the line רובו־דע says when that thread opens (src/core/threads.js)
export const GUIDE = { ...START_GUIDE, ...HUB_GUIDE, ...LAB_GUIDE, ...ZONE_GUIDE, ...RESEARCH_GUIDE, ...THREAD_GUIDE, ...AFTER_GUIDE };
// every line in the game, for the voice maker and the validator
export function allGuideLines() {
  const out = [];
  for (const k in STAGE_LINES) out.push(...STAGE_LINES[k]);
  out.push(...LEGACY_LINES);
  for (const k in GUIDE) out.push(...GUIDE[k]);
  return out;
}
