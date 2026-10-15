// Source cards ("קלפי מקור") a player owns – shared by the game (missions) and the learning hub (quiz, sets, album).
import { key as profileKey } from './profiles.js';
const K = 'web-of-life-srccards';
export function ownedSources() {
  try { const o = JSON.parse(localStorage.getItem(profileKey(K)) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; }
}
export function hasSource(id) { return !!ownedSources()[id]; }
export function grantSource(id) {
  const o = ownedSources(); if (o[id]) return false;
  o[id] = Date.now();
  try { localStorage.setItem(profileKey(K), JSON.stringify(o)); } catch (e) { return false; }
  try { window.dispatchEvent(new CustomEvent('wol-source-granted', { detail: id })); } catch (e) { /* */ }
  return true;
}
