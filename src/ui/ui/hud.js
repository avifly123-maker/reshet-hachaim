// The forest HUD at the top: life points, vitality, species alive, the day dial, the season, the speed buttons.
// Exports: createHud(ctx) → { ptsNum, vitBar, vitIc, vitPc, bioNum, bioLab, dRot, dSky, dCut, dStars, dGround,
//   dayPart, dayN, seasonBox, seasonIc, seasonName, setSpeed, paintSpeed, animatePts }.
// Needs from ctx (index.js and the parts made before it): root, emit, S, hud.
import { zoneWord } from '../../core/place.js';
import { fmt } from './helpers.js';
import { icon } from './icons.js';

export function createHud(ctx) {
  const { root, emit, S, hud } = ctx;
  /* ================================================================ HUD */
  hud.innerHTML = `
    <div class="h-item h-pts" title="נקודות חיים"><span class="coin">${icon('leaf')}</span><b class="pts-num">0</b><small>נקודות</small></div>
    <div class="h-item h-vit" title="חיוניות"><span class="vit-ic">${icon('sprout')}</span><div class="vit-bar"><i></i></div><small class="vit-pc"></small></div>
    <div class="h-item h-bio" title="מינים חיים ${zoneWord('in')}"><span>${icon('web')}</span><b class="bio-num">0</b><small class="bio-lab"></small></div>
    <div class="h-item h-day" title="שעה ביום"><svg class="dial" viewBox="0 0 48 48" aria-hidden="true">
      <defs><clipPath id="dialclip"><circle cx="24" cy="24" r="21"/></clipPath></defs>
      <circle class="d-sky" cx="24" cy="24" r="21" fill="#86c6ee"/>
      <g clip-path="url(#dialclip)"><g class="d-stars"><circle cx="15" cy="14" r=".8"/><circle cx="31" cy="11" r=".7"/><circle cx="35" cy="19" r=".6"/><circle cx="11" cy="21" r=".6"/><circle cx="23" cy="8" r=".7"/></g>
      <g class="d-rot"><circle class="d-sun" cx="24" cy="9" r="5"/><g class="d-moon" transform="translate(24 39)"><circle r="4.2" fill="#f2efe0"/><circle cx="2" cy="-1.4" r="3.6" class="d-moon-cut" fill="#86c6ee"/></g></g>
      <path class="d-ground" fill="#3f7a3a" d="M0 26 Q12 23.5 24 25.5 T48 25 V48 H0z"/></g>
      <circle cx="24" cy="24" r="21" class="d-rim"/></svg><div class="day-txt"><b class="day-part">בוקר</b><small class="day-n">יום 1</small></div></div>
    <div class="h-item h-season" title="עונה"><span class="season-ic"></span><b class="season-name"></b></div>
    <div class="speed" role="group" aria-label="מהירות">
      <button data-s="0" title="עצירה (רווח)" aria-label="עצירה">${icon('pause')}</button>
      <button data-s="1" title="מהירות רגילה" aria-label="מהירות רגילה">${icon('play')}</button>
      <button data-s="3" title="מהר" aria-label="מהר">${icon('fast')}</button></div>`;
  const ptsNum = hud.querySelector('.pts-num'), ptsBox = hud.querySelector('.h-pts');
  const vitBar = hud.querySelector('.vit-bar i'), vitPc = hud.querySelector('.vit-pc'), vitIc = hud.querySelector('.vit-ic');
  const bioNum = hud.querySelector('.bio-num'), bioLab = hud.querySelector('.bio-lab');
  const dSky = hud.querySelector('.d-sky'), dRot = hud.querySelector('.d-rot'), dStars = hud.querySelector('.d-stars'), dGround = hud.querySelector('.d-ground'), dCut = hud.querySelector('.d-moon-cut');
  const dayPart = hud.querySelector('.day-part'), dayN = hud.querySelector('.day-n');
  const seasonBox = hud.querySelector('.h-season'), seasonIc = hud.querySelector('.season-ic'), seasonName = hud.querySelector('.season-name');
  const speedBtns = [...hud.querySelectorAll('.speed button')];
  speedBtns.forEach((b) => b.addEventListener('click', () => setSpeed(+b.dataset.s)));
  function setSpeed(s) { if (s > 0) S.lastSpeed = s; S.speed = s; paintSpeed(); emit('time:speed', { speed: s }); }
  function paintSpeed() { speedBtns.forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.s === S.speed))); root.classList.toggle('paused', S.speed === 0); }
  paintSpeed();
  function animatePts(target) {
    const from = S.shownPts, t0 = performance.now();
    cancelAnimationFrame(S.ptsRaf);
    ptsBox.classList.remove('up', 'down'); void ptsBox.offsetWidth;
    ptsBox.classList.add(target >= from ? 'up' : 'down');
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 650), e = 1 - Math.pow(1 - k, 3);
      S.shownPts = from + (target - from) * e; ptsNum.textContent = fmt(S.shownPts);
      if (k < 1) S.ptsRaf = requestAnimationFrame(step);
    };
    S.ptsRaf = requestAnimationFrame(step);
  }
  return { ptsNum, vitBar, vitIc, vitPc, bioNum, bioLab, dRot, dSky, dCut, dStars, dGround, dayPart, dayN, seasonBox, seasonIc, seasonName, setSpeed,
    paintSpeed, animatePts };
}
