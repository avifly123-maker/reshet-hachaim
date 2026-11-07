// Short films (1.4.4 set 11): 8-second clips made in Gemini (Veo) from our worlds, shown in a framed window on the
// loading screens (each island, the lab, the robot lab, Nitzotz's workshop) and on the weekly events' openings.
// The clips live in src/data/film-art.js (an asset module: files in the desktop build, inlined in the HTML), loaded
// only the first time a film is asked for. A film is decoration: if it is missing or the computer cannot play it,
// nothing is shown and nothing waits for it.
//
//   filmEl(id, cls)            → a <div class="film"> with the clip (or null when there is no film of that id)
//   showLoadingFilm(loadEl, id) puts the film into the loading screen (above the bar); the screen's own fade hides it
//   clearLoadingFilm(loadEl)    removes it (the next loading screen may have another film or none)
//   watchLoadingFilm(loadEl, id) the first visit of a place: the whole film is watched before the place opens (a "דלג"
//                               button ends it); resolves at the end, on the button, or at once when there is no film.
//                               Automated test browsers (navigator.webdriver) do not wait, unless window.__filmWatch is set.

let artP = null;
const art = () => artP || (artP = import('../data/film-art.js').then((m) => m.FILMS || {}, () => ({})));
let FILMS = null;
art().then((f) => { FILMS = f; });   // small module header; the clips themselves are files (desktop) or one string each

export const hasFilm = (id) => !!(FILMS && FILMS[id]);
export const filmsReady = () => art().then((f) => (FILMS = f));

function video(src, cls) {
  const v = document.createElement('video');
  v.className = cls; v.src = src; v.muted = true; v.loop = false; v.autoplay = true; v.playsInline = true;
  v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.preload = 'auto';
  return v;
}

export function filmEl(id, cls = '') {
  const src = FILMS && FILMS[id];
  if (!src) return null;
  const box = document.createElement('div');
  box.className = 'film ' + cls; box.dataset.film = id;
  const back = video(src, 'film-back'), front = video(src, 'film-front');
  const frame = document.createElement('div'); frame.className = 'film-frame';
  frame.appendChild(front); box.append(back, frame);
  // the two copies start together; the window fades in only once a picture is there (no black box on a slow disk)
  front.addEventListener('playing', () => { box.classList.add('on'); try { back.currentTime = front.currentTime; } catch (e) { /* not seekable yet */ } }, { once: true });
  const play = (v) => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
  play(front); play(back);
  // at the end: the window dips and the clip starts again (a cut back to the start would jump)
  front.addEventListener('ended', () => {
    box.classList.add('dip');
    setTimeout(() => { if (!box.isConnected) return; front.currentTime = 0; back.currentTime = 0; play(front); play(back); box.classList.remove('dip'); }, 650);
  });
  return box;
}

export async function showLoadingFilm(loadEl, id) {
  if (!FILMS) FILMS = await art();
  clearLoadingFilm(loadEl);   // (after the wait: two calls close together leave one film)
  if (!loadEl.classList.contains('on')) return;   // the screen already went away
  const f = filmEl(id, 'ld-film');
  if (!f) return;
  loadEl.classList.add('has-film');
  loadEl.prepend(f);
}

export function clearLoadingFilm(loadEl) {
  loadEl.querySelectorAll('.ld-film').forEach((f) => { f.querySelectorAll('video').forEach((v) => { v.pause(); v.removeAttribute('src'); v.load(); }); f.remove(); });
  loadEl.classList.remove('has-film');
}

export async function watchLoadingFilm(loadEl, id) {
  if (typeof navigator !== 'undefined' && navigator.webdriver && !window.__filmWatch) return false;
  await showLoadingFilm(loadEl, id);
  const box = loadEl.querySelector('.ld-film');
  if (!box) return false;
  const front = box.querySelector('.film-front');
  const skip = document.createElement('button');
  skip.type = 'button'; skip.className = 'btn soft film-skip'; skip.textContent = 'דלג';
  box.appendChild(skip);
  await new Promise((done) => {
    let t = setTimeout(done, 2500);   // a computer that cannot play it: no waiting
    front.addEventListener('playing', () => { clearTimeout(t); t = setTimeout(done, 16000); }, { once: true });   // (a clip is about 10 s)
    front.addEventListener('ended', done, { once: true });
    skip.addEventListener('click', done, { once: true });
  });
  skip.remove();
  return true;
}
