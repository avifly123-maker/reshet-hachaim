// The technology cards (1.4.3, set 3): after every change in the robot lab's progress, the cards whose `earn` is now
// met are added to the player's progress (progress.js `tc`) and announced one by one ('wol-techcard', shown by
// src/ui/badge-toast.js, which also keeps them from covering a mission banner, a step card or another badge).
import { TECH_CARDS } from '../data/robolab/tech-cards.js';
import { earned, earnState } from './earn.js';
import { ownedTechCards, addTechCards } from './progress.js';

export function grantTechCards({ quiet = false } = {}) {
  const own = ownedTechCards(), S = earnState();
  // the workshop's cards come only once the workshop was visited (its first step is open from the start)
  const now = TECH_CARDS.filter((c) => !own[c.id] && earned(c.earn, S) && (!c.earn.startsWith('wk:') || S.P.seen.workshop)).map((c) => c.id);
  if (!now.length) return [];
  addTechCards(now);
  if (!quiet) now.forEach((id) => { try { window.dispatchEvent(new CustomEvent('wol-techcard', { detail: id })); } catch (e) { } });
  return now;
}
