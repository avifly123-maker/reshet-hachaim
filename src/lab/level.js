// מעבדת רובו־דע – which level the child plays (the start screen's מתחילים / מתקדמים switch, stored per player in
// web-of-life-mode). Beginners ('kids') read fully vocalised Hebrew (ניקוד מלא) in short bubbles (src/lab/kids-text.js);
// the full level keeps the plain texts. Read every time a panel opens, so a switch on the start screen applies at once.
import { key as profileKey } from '../core/profiles.js';

export function labKids() {
  try { return localStorage.getItem(profileKey('web-of-life-mode')) === 'kids'; } catch (e) { return false; }
}
// {name} placeholders of the beginner texts; a string or a list of bubbles
export function fmt(s, vars = {}) {
  if (Array.isArray(s)) return s.map((x) => fmt(x, vars));
  return String(s).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
}
// how long a child needs for one bubble (letters only: nikud does not count)
export const readMs = (s) => Math.max(2600, String(s).replace(/[֑-ׇ]/g, '').length * 75);
