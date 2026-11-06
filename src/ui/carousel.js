// A row of big tiles that scrolls sideways with two round arrows (6.11, Avi: "a carousel, like the islands").
// Used by the start screen (science centre, learning centre) and the idea machine's shelf in the workshop.
// The row is a scroll-snap grid; the wrapper gets classes for the arrows to hide themselves:
//   fits (everything is visible), at0 (at the start), atEnd (at the end). Right to left: "next" scrolls left.
//   bindCarousel(wrap, row, { onArrow }) → { paint, dispose }
//   wrap holds buttons [data-carb="-1"] (previous) and [data-carb="1"] (next)
export function bindCarousel(wrap, row, { onArrow = null, gap = 12 } = {}) {
  if (!wrap || !row) return { paint() { }, dispose() { } };
  const paint = () => {
    const max = row.scrollWidth - row.clientWidth, x = Math.abs(row.scrollLeft);   // 8 px of slack: an rtl row rests at -4
    wrap.classList.toggle('fits', max < 8); wrap.classList.toggle('at0', x < 8); wrap.classList.toggle('atEnd', x > max - 8);
  };
  const arrows = [...wrap.querySelectorAll('[data-carb]')];
  const click = (e) => {
    const d = +e.currentTarget.dataset.carb, first = row.firstElementChild;
    const one = first ? first.getBoundingClientRect().width + gap : 200;
    const page = Math.max(one, Math.floor(row.clientWidth / one) * one - one);   // most of a page, keeping one tile in view
    if (onArrow) onArrow(d);
    const x0 = row.scrollLeft;
    row.scrollBy({ left: -d * page, behavior: 'smooth' });
    setTimeout(() => { if (Math.abs(row.scrollLeft - x0) < 2) row.scrollBy({ left: -d * page }); }, 450);   // a busy (or slow) page may drop the smooth scroll
  };
  arrows.forEach((b) => b.addEventListener('click', click));
  row.addEventListener('scroll', paint, { passive: true });
  let ro = null; try { ro = new ResizeObserver(paint); ro.observe(row); } catch (e) { }
  setTimeout(paint, 60);
  return { paint, dispose() { arrows.forEach((b) => b.removeEventListener('click', click)); row.removeEventListener('scroll', paint); if (ro) ro.disconnect(); } };
}
// bring a tile into view without a jump (the chosen thing on the shelf)
export function showTile(row, tile) {
  if (!row || !tile) return;
  const r = row.getBoundingClientRect(), t = tile.getBoundingClientRect();
  if (t.left < r.left) row.scrollBy({ left: t.left - r.left - 8 }); else if (t.right > r.right) row.scrollBy({ left: t.right - r.right + 8 });
}
