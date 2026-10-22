// מרכז הלמידה – reading a player's album from localStorage ('web-of-life-cards::<player>'; works without it).
// Exports: loadState() → { owned, packs, quizzes, best, duelsWon, sets, … } (unknown cards and sets are dropped).
// Needs: core/profiles.js (the player's key), the cards and sets (cards.js). Saving is done by the hub (index.js).
import { key as profileKey } from '../../core/profiles.js';
import { START_PACKS, STORE_KEY } from './base.js';
import { CARD, SET_BY } from './cards.js';

/* ───────────────────────────────────────────── persistence */
export function loadState() {
  const fresh = { owned: {}, packs: START_PACKS, quizzes: 0, best: 0, duelsWon: 0, sets: {}, v: 1 };
  try {
    const raw = window.localStorage.getItem(profileKey(STORE_KEY));
    if (!raw) return fresh;
    const s = JSON.parse(raw);
    if (!s || typeof s !== 'object') return fresh;
    const owned = {};
    for (const k in s.owned || {}) if (CARD.has(k) && s.owned[k] > 0) owned[k] = Math.floor(s.owned[k]);
    const sets = {}; // completed album sets (reward given); older saves have none
    if (s.sets && typeof s.sets === 'object') for (const k in s.sets) if (SET_BY.has(k) && s.sets[k]) sets[k] = true;
    return { ...fresh, ...s, owned, sets, packs: Math.max(0, Math.floor(+s.packs || 0)) };
  } catch (e) { return fresh; }
}
