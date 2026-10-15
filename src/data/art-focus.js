// Where the subject sits in each card painting (art/*.webp, square): the height of its centre, 0 = top … 1 = bottom.
// Card windows are wide (≈1.8:1), so only a band of the square painting shows; artPos() moves that band onto the
// animal or plant. Paintings not listed are centred a little above the middle (0.45). Checked one by one on a
// contact sheet (2026-10-15); add a line here when a new painting comes in.
export const ART_FOCUS = {
  anteater: 0.63, capybara: 0.62, coati: 0.62, fox: 0.58, harpy: 0.32, harvesterant: 0.64, hedgehog: 0.6, hoopoe: 0.6,
  jaguar: 0.64, jay: 0.55, kapok: 0.3, kinkajou: 0.5, leafcutter: 0.42, macaw: 0.3, mushroom: 0.56, orchid: 0.38,
  rescue: 0.62, tapir: 0.56, tortoise: 0.6, toucan: 0.34, watergen: 0.62, waterlily: 0.64, weather: 0.3, agouti: 0.56,
  chukar: 0.55, owl: 0.48, spinymouse: 0.52, fruitbat: 0.42, hyrax: 0.52, howler: 0.47, morpho: 0.52, sloth: 0.45,
  gazelle: 0.38, dartfrog: 0.46, brazilnut: 0.32,
};
// CSS for an <img> with object-fit:cover in a window of the given aspect (width / height)
export function artPos(id, aspect = 1.8) {
  const fy = ART_FOCUS[id] ?? 0.45;
  const r = Math.min(1, 1 / aspect);            // visible share of the height
  if (r >= 1) return '';
  const p = Math.max(0, Math.min(1, (fy - r / 2) / (1 - r)));
  return `object-position:50% ${(p * 100).toFixed(0)}%`;
}
