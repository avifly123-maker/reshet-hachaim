// Source cards ("קלפי מקור") a player owns – shared by the game (missions) and the learning hub (quiz, sets, album).
import { K as KEY, readPlayer, writePlayer } from './storage.js';
const K = KEY.srccards;
export function ownedSources() {
  const o = readPlayer(K, {}); return o && typeof o === 'object' ? o : {};
}
export function hasSource(id) { return !!ownedSources()[id]; }
export function grantSource(id) {
  const o = ownedSources(); if (o[id]) return false;
  o[id] = Date.now();
  if (!writePlayer(K, o)) return false;
  try { window.dispatchEvent(new CustomEvent('wol-source-granted', { detail: id })); } catch (e) { /* */ }
  return true;
}
