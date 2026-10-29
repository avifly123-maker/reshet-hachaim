// צילום (1.3.2, area H): the photo mode of the forest. A "צילום" button in the dock (left, under the toolbar) opens a
// frame with rounded corner brackets (no cross, no crosshair, no centre mark). The child turns and zooms the view as
// usual; a click on an animal brings it to the middle of the frame. The big round button takes a small JPEG of what is
// inside the frame (160 px wide, at most 10 kB) and keeps it in 'web-of-life-photos' (src/game/rank.js addPhoto: 24 per
// player, the oldest drops out), with the species that were in the frame. Two species that are linked in the web in
// one photo count more (src/game/after.js gives the points). The field camera's own view gets the same shutter.
// "האלבום שלי": every photo of this player, newest first, in one screen without scrolling at 800x460.
import * as THREE from 'three';
import { esc, icon } from '../ui/ui.js';
import { nameK } from '../data/inventions-kids.js';
import { readPhotos, addPhoto, MAX_PHOTOS } from './rank.js';
import { svcGuide } from '../core/services.js';

// photo missions after the regular chain (one at a time, in order). a + one of b in the frame; night: only at night;
// visitor: any rare visitor. The pairs are relations of the zone's own data (diet or relations).
export const PHOTO_MISSIONS = {
  amazon: [
    { id: 'pa1', a: 'toucan', b: ['acai', 'fig', 'cecropia'], eat: true, f: 'צלמו טוקן אוכל פרי', hint: 'טוקן ליד פיקוס, אסאי או צקרופיה עם פירות' },
    { id: 'pa2', a: 'sloth', b: ['cecropia'], f: 'צלמו עצלן על עץ צקרופיה', hint: 'העצלן ועץ הצקרופיה באותה תמונה' },
    { id: 'pa3', a: 'hummingbird', b: ['heliconia', 'bromeliad'], f: 'צלמו יונק דבש שותה צוף', hint: 'יונק הדבש ליד הליקוניה או ברומליה' },
    { id: 'pa4', visitor: true, f: 'צלמו מבקר נדיר', hint: 'כשמגיע מבקר נדיר, הוא מופיע משמאל' },
  ],
  grove: [
    { id: 'pg1', a: 'honeybee', b: ['sage', 'rockrose'], f: 'צלמו דבורה על פרח', hint: 'דבורת הדבש ליד מרווה או לוטם' },
    { id: 'pg2', a: 'jay', b: ['oak'], f: 'צלמו עורבני ליד אלון', hint: 'העורבני והאלון באותה תמונה' },
    { id: 'pg3', a: 'owl', night: true, f: 'צלמו תנשמת בלילה', hint: 'התנשמת יוצאת בלילה' },
    { id: 'pg4', visitor: true, f: 'צלמו מבקר נדיר', hint: 'כשמגיע מבקר נדיר, הוא מופיע משמאל' },
  ],
  reef: [
    { id: 'pr1', a: 'clownfish', b: ['seaanemone'], f: 'צלמו שושנון בתוך שושנת ים', hint: 'השושנון ושושנת הים באותה תמונה' },
    { id: 'pr2', a: 'parrotfish', b: ['algae'], f: 'צלמו תוכינון רועה אצות', hint: 'התוכינון ליד אצות' },
    { id: 'pr3', a: 'cleaner', b: ['grouper'], f: 'צלמו נקאי עם דקר', hint: 'הנקאי והדקר באותה תמונה' },
    { id: 'pr4', visitor: true, f: 'צלמו מבקר נדיר', hint: 'כשמגיע מבקר נדיר, הוא מופיע משמאל' },
  ],
};
// beginners: three each, all with full nikud
export const PHOTO_MISSIONS_K = {
  amazon: [
    { id: 'pka1', a: 'hummingbird', b: ['heliconia'], f: 'צַלְּמוּ יוֹנֵק דְּבַשׁ לְיַד הֶלִיקוֹנְיָה', hint: 'יוֹנֵק הַדְּבַשׁ וְהַהֶלִיקוֹנְיָה בְּאוֹתָהּ תְּמוּנָה' },
    { id: 'pka2', a: 'sloth', b: ['cecropia'], f: 'צַלְּמוּ עַצְלָן עַל עֵץ צֶקְרוֹפְּיָה', hint: 'הָעַצְלָן וְהָעֵץ בְּאוֹתָהּ תְּמוּנָה' },
    { id: 'pka3', a: 'toucan', b: ['acai'], f: 'צַלְּמוּ טוּקָן לְיַד דֶּקֶל אָסָאִי', hint: 'הַטּוּקָן וְהַדֶּקֶל בְּאוֹתָהּ תְּמוּנָה' },
  ],
  grove: [
    { id: 'pkg1', a: 'honeybee', b: ['sage'], f: 'צַלְּמוּ דְּבוֹרָה עַל פֶּרַח מַרְוָה', hint: 'הַדְּבוֹרָה וְהַמַּרְוָה בְּאוֹתָהּ תְּמוּנָה' },
    { id: 'pkg2', a: 'hyrax', b: ['sage', 'anemone'], f: 'צַלְּמוּ שְׁפַן סֶלַע לְיַד פְּרָחִים', hint: 'שְׁפַן הַסֶּלַע לְיַד מַרְוָה אוֹ כַּלָּנִית' },
    { id: 'pkg3', a: 'jay', b: ['oak'], f: 'צַלְּמוּ עוֹרְבָנִי לְיַד אַלּוֹן', hint: 'הָעוֹרְבָנִי וְהָאַלּוֹן בְּאוֹתָהּ תְּמוּנָה' },
  ],
  reef: [
    { id: 'pkr1', a: 'clownfish', b: ['seaanemone'], f: 'צַלְּמוּ שׁוֹשַׁנּוֹן בְּתוֹךְ שׁוֹשַׁנַּת יָם', hint: 'הַשּׁוֹשַׁנּוֹן וְשׁוֹשַׁנַּת הַיָּם בְּאוֹתָהּ תְּמוּנָה' },
    { id: 'pkr2', a: 'parrotfish', b: ['algae'], f: 'צַלְּמוּ תּוּכִינוֹן לְיַד אַצּוֹת', hint: 'הַתּוּכִינוֹן וְהָאַצּוֹת בְּאוֹתָהּ תְּמוּנָה' },
    { id: 'pkr3', a: 'turtle', b: ['seagrass'], f: 'צַלְּמוּ צַב יָם לְיַד עֵשֶׂב יָם', hint: 'הַצָּב וְעֵשֶׂב הַיָּם בְּאוֹתָהּ תְּמוּנָה' },
  ],
};
export const photoMissions = (zone, kids) => ((kids ? PHOTO_MISSIONS_K : PHOTO_MISSIONS)[zone] || []);
// does a photo (its analysis) answer a photo mission?
export function photoMatches(pm, info, W) {
  if (!pm || !info) return false;
  if (pm.visitor) return info.visitors.length > 0;
  const A = info.ents.filter((x) => x.sp === pm.a); if (!A.length) return false;
  if (pm.night && !(W.nightGlow > 0.5)) return false;
  if (!pm.b) return true;
  return info.ents.some((x) => pm.b.includes(x.sp)) || (pm.eat && A.some((x) => x.e.state === 'eat'));
}

// words (f / k: beginners read full nikud)
const T = {
  btn: ['צילום', 'צִלּוּם'], tip: ['מצלמים את מה שרואים', 'מְצַלְּמִים אֶת מָה שֶׁרוֹאִים'],
  hint: ['סובבו את המבט עד שבעל החיים בתוך המסגרת. לחיצה עליו מביאה אותו לאמצע.', 'סוֹבְבוּ אֶת הַמַּבָּט עַד שֶׁבַּעַל הַחַיִּים בְּתוֹךְ הַמִּסְגֶּרֶת.'],
  shut: ['צלמו', 'צַלְּמוּ'], back: ['חזרה', 'חֲזָרָה'], album: ['האלבום שלי', 'הָאַלְבּוֹם שֶׁלִּי'],
  inFrame: ['בתמונה:', 'בַּתְּמוּנָה:'], nobody: ['עוד אין אף אחד בתוך המסגרת', 'עוֹד אֵין אַף אֶחָד בְּתוֹךְ הַמִּסְגֶּרֶת'],
  linked: ['קשר ברשת!', 'קֶשֶׁר בָּרֶשֶׁת!'], saved: ['נשמר באלבום', 'נִשְׁמַר בָּאַלְבּוֹם'], landscape: ['נוף', 'נוֹף'],
  empty: ['עוד אין תמונות באלבום. צלמו משהו!', 'עוֹד אֵין תְּמוּנוֹת בָּאַלְבּוֹם. צַלְּמוּ מַשֶּׁהוּ!'],
  count: ['{n} תמונות מתוך {m}', '{n} תְּמוּנוֹת מִתּוֹךְ {m}'], close: ['סגירה', 'סְגִירָה'], also: ['וגם:', 'וְגַם:'],
  zones: { amazon: ['באמזונס', 'בָּאָמָזוֹנָס'], grove: ['בחורש', 'בַּחֹרֶשׁ'], reef: ['בשונית', 'בַּשּׁוּנִית'], desert: ['במדבר', 'בַּמִּדְבָּר'] },
  oldest: ['כשיש {m} תמונות, הישנה ביותר יוצאת', 'כְּשֶׁיֵּשׁ {m} תְּמוּנוֹת, הַיְּשָׁנָה בְּיוֹתֵר יוֹצֵאת'],   // {m}: MAX_PHOTOS (rank.js)
  visitor: ['מבקר נדיר', 'מְבַקֵּר נָדִיר'],
  savedT: ['התמונה נשמרה באלבום', 'הַתְּמוּנָה נִשְׁמְרָה בָּאַלְבּוֹם'],
  full: ['האלבום מלא, והתמונה לא נשמרה', 'הָאַלְבּוֹם מָלֵא, וְהַתְּמוּנָה לֹא נִשְׁמְרָה'],
};
// a camera: a rounded body, a lens and a small flash window (no tripod, nothing that crosses)
export const CAM_SVG = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path class="f" d="M4.5 8h3l1.6-2.4h5.8L16.5 8h3a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-8A1.5 1.5 0 0 1 4.5 8z"/><path d="M4.5 8h3l1.6-2.4h5.8L16.5 8h3a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-8A1.5 1.5 0 0 1 4.5 8z"/><circle cx="12" cy="13.2" r="3.4"/><circle cx="17.6" cy="10.6" r=".7" fill="currentColor" stroke="none"/></svg>';

const _v = new THREE.Vector3(), _p = new THREE.Vector3();
const PW = 160, PH = 120, MAX_BYTES = 10000;

export function createPhotos({ W, reg, camera, canvas, pipe, ui, audio, imv, bus, rig, markers, onShot, robo }) {
  const root = document.getElementById('ui');
  const kids = !!W.kids;
  const t = (k, o) => { let s = T[k][kids ? 1 : 0]; if (o) for (const x in o) s = s.replace('{' + x + '}', o[x]); return s; };
  const nameOf = (id) => { const sp = reg.byId.get(id); const n = sp ? sp.name : id; return kids ? nameK(n) : n; };

  // ── the dock button (left, under the toolbar; the dock hides itself while a species card or a view is open)
  const btn = document.createElement('button');
  btn.className = 'tb af-pbtn'; btn.dataset.a = 'photo'; btn.dataset.tip = t('tip'); btn.setAttribute('aria-label', t('btn'));
  btn.innerHTML = `${CAM_SVG}<span class="tb-lab">${esc(t('btn'))}</span>`;
  btn.addEventListener('click', (e) => { e.stopPropagation(); open(); });
  if (imv.dock) imv.dock.insertBefore(btn, imv.dock.firstChild);

  // ── the photo view
  const el = document.createElement('div');
  el.className = 'af-photo'; el.lang = 'he'; el.hidden = true;
  el.innerHTML = `<div class="af-frame"><i class="af-c tl"></i><i class="af-c tr"></i><i class="af-c bl"></i><i class="af-c br"></i><span class="af-tag"></span></div>
    <p class="af-hint">${esc(t('hint'))}</p>
    <button type="button" class="af-back">${icon('arrowR')}<span>${esc(t('back'))}</span></button>
    <button type="button" class="af-albtn">${icon('book')}<span>${esc(t('album'))}</span><em></em></button>
    <button type="button" class="af-shut" aria-label="${esc(t('shut'))}"><i>${CAM_SVG}</i><span>${esc(t('shut'))}</span></button>
    <div class="af-flash"></div>
    <div class="af-print" hidden><img alt=""><span><b></b><small></small></span></div>
    <div class="af-album" hidden></div>`;
  root.appendChild(el);
  const $ = (s) => el.querySelector(s);
  const frameEl = $('.af-frame'), tagEl = $('.af-tag'), flashEl = $('.af-flash'), printEl = $('.af-print'), albumEl = $('.af-album');
  let isOpen = false, tagT = 0, lastTag = '', printT = 0;
  const paintAlbumBtn = () => { $('.af-albtn em').textContent = String(readPhotos().length); };

  function open() {
    if (isOpen || W.research) return;
    isOpen = true; el.hidden = false; root.classList.add('af-shoot');
    paintAlbumBtn(); lastTag = ''; tagT = 0;
    try { ui.hideSpecies(); bus.emit('species:close'); } catch (e) { }
    try { markers && markers.locate(null); } catch (e) { }   // the beacons would be in the picture: the view follows the animal instead
    audio && audio.play && audio.play('click');
    const g = svcGuide(); if (g) g.intro('after:photo');
  }
  function close() {
    if (!isOpen) return;
    isOpen = false; el.hidden = true; root.classList.remove('af-shoot'); albumEl.hidden = true; printEl.hidden = true;
  }
  $('.af-back').addEventListener('click', () => { close(); audio && audio.play && audio.play('click'); });
  $('.af-shut').addEventListener('click', () => shoot(frameEl.getBoundingClientRect(), 'main'));
  $('.af-albtn').addEventListener('click', () => { openAlbum(); });
  for (const b of el.querySelectorAll('button')) b.addEventListener('pointerdown', (e) => e.stopPropagation());
  const onKey = (e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); if (!albumEl.hidden) { albumEl.hidden = true; return; } close(); }
  };
  window.addEventListener('keydown', onKey, true);

  // ── the field camera's view gets the same shutter (bottom left; the radar sits bottom right)
  let fcBtn = null;
  const fcView = root.querySelector('.fc-view');
  if (fcView) {
    fcBtn = document.createElement('button'); fcBtn.type = 'button'; fcBtn.className = 'af-shut af-fcshut'; fcBtn.setAttribute('aria-label', t('shut'));
    fcBtn.innerHTML = `<i>${CAM_SVG}</i><span>${esc(t('shut'))}</span>`;
    fcBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    fcBtn.addEventListener('click', (e) => { e.stopPropagation(); const r = canvas.getBoundingClientRect(); const w = r.width * 0.56, h = w * 0.75; shoot({ left: r.left + (r.width - w) / 2, top: r.top + (r.height - h) / 2, width: w, height: h, right: r.left + (r.width + w) / 2, bottom: r.top + (r.height + h) / 2 }, 'fieldcam', fcView); });
    fcView.appendChild(fcBtn);
  }

  // ── what is inside a rectangle of the screen right now
  const alive = (e) => e.alive && !e.removed && !e.dying && !e.leaving;
  function analyse(rect) {
    const cr = canvas.getBoundingClientRect(); const best = new Map();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    for (const e of [...W.animals, ...W.plants]) {
      if (!alive(e) || (e.obj && !e.obj.visible)) continue;
      e.focusPoint(_v);
      const dist = camera.position.distanceTo(_v);
      const size = e.isPlant ? Math.max(0.8, e.topY() - e.y) : Math.max(0.35, (e.vis.length || 1) * e.obj.scale.x);
      if (dist > size * (e.isPlant ? 9 : 26) + 10) continue;   // too small to see in a picture 160 px wide
      _p.copy(_v).project(camera); if (_p.z > 1 || _p.z < -1) continue;
      const sx = cr.left + (_p.x + 1) / 2 * cr.width, sy = cr.top + (1 - _p.y) / 2 * cr.height;
      if (sx < rect.left || sx > rect.left + rect.width || sy < rect.top || sy > rect.top + rect.height) continue;
      const off = Math.min(1, Math.hypot((sx - cx) / (rect.width / 2), (sy - cy) / (rect.height / 2)));
      const score = (e.isPlant ? 1 : 3) * (1.3 - off) * Math.min(3, size * 12 / (dist + 4));
      const id = e.sp.id, cur = best.get(id);
      if (!cur || score > cur.score) best.set(id, { e, sp: id, score, plant: !!e.isPlant });
    }
    const ents = [...best.values()].sort((a, b) => (a.plant - b.plant) || (b.score - a.score));
    const ids = ents.map((x) => x.sp);
    const pairs = [];
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i], b = ids[j];
      if (reg.edges.some((ed) => (ed.from === a && ed.to === b) || (ed.from === b && ed.to === a))) pairs.push(a < b ? [a, b] : [b, a]);
    }
    const visitors = ents.filter((x) => x.e.visitor).map((x) => x.e);
    return { ents, ids, pairs, visitors, main: ents[0] ? ents[0].sp : null };
  }

  // ── the picture: draw a fresh frame, then copy the rectangle into a small JPEG
  function capture(rect) {
    // רובו־דע's island model must not be in the picture (the field camera shoots outside the photo mode too)
    const rr = robo && robo.root, rv = rr ? rr.visible : false;
    if (rr) rr.visible = false;
    try { pipe.render(0.016); } catch (e) { }
    if (rr) rr.visible = rv;
    const cr = canvas.getBoundingClientRect(); const kx = canvas.width / cr.width, ky = canvas.height / cr.height;
    const c = document.createElement('canvas'); c.width = PW; c.height = PH;
    const ctx = c.getContext('2d');
    // the frame keeps 4:3; a wider rectangle (the field camera) is cut in the middle
    let sw = rect.width, sh = rect.height; if (sw / sh > PW / PH) sw = sh * PW / PH; else sh = sw * PH / PW;
    const sx = rect.left + (rect.width - sw) / 2 - cr.left, sy = rect.top + (rect.height - sh) / 2 - cr.top;
    try { ctx.drawImage(canvas, sx * kx, sy * ky, sw * kx, sh * ky, 0, 0, PW, PH); } catch (e) { return null; }
    let q = 0.64, url = c.toDataURL('image/jpeg', q);
    while (url.length * 0.75 > MAX_BYTES && q > 0.3) { q -= 0.08; url = c.toDataURL('image/jpeg', q); }
    return url.length * 0.75 > MAX_BYTES ? null : url;
  }

  let shootT = 0;
  function shoot(rect, from, flashIn) {
    const now = performance.now(); if (now - shootT < 700) return; shootT = now;
    // a selected thing would leave its ring in the picture
    if (W.selected) { try { bus.emit('species:close'); ui.hideSpecies(); } catch (e) { } }
    try { markers && markers.locate(null); } catch (e) { }
    const info = analyse(rect);
    const img = capture(rect);
    const f = flashIn ? flashIn.querySelector('.fc-flash') || flashEl : flashEl;
    f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
    audio && audio.play && audio.play('points');
    if (!img) return;
    const rec = { id: 'ph' + Date.now().toString(36), sp: info.main || '', sps: info.ids.slice(0, 6), zone: W.biomeId, t: Date.now(), img };
    if (info.pairs.length) rec.pair = info.pairs[0];
    if (info.visitors.length) rec.visitor = 1;
    if (!addPhoto(rec)) { showFull(rec); return; }   // the storage is full even without the older photos: nothing is kept, no points
    paintAlbumBtn();
    const res = onShot ? onShot(rec, info, from) || {} : {};
    showPrint(rec, info, res);
  }
  function showFull(rec) {
    if (!isOpen) { try { ui.toast(t('full'), 'warn'); } catch (e) { } return; }
    printEl.querySelector('img').src = rec.img;
    printEl.querySelector('b').textContent = rec.sp ? nameOf(rec.sp) : t('landscape');
    printEl.querySelector('small').textContent = t('full');
    printEl.hidden = false; el.classList.add('printing'); printEl.classList.remove('go'); void printEl.offsetWidth; printEl.classList.add('go');
    printT = 3.6;
  }
  function showPrint(rec, info, res) {
    if (!isOpen) {   // the field camera's view: a small toast says it was kept
      const parts = [t('savedT')];
      if (res.points) parts.push(kids ? `קִבַּלְתֶּם ${res.points} נְקֻדּוֹת` : `קיבלתם ${res.points} נקודות חיים`);
      try { ui.toast(parts.join(' · '), 'good'); } catch (e) { }
      return;
    }
    printEl.querySelector('img').src = rec.img;
    printEl.querySelector('b').textContent = rec.sp ? nameOf(rec.sp) : t('landscape');
    const parts = [t('saved')];
    if (info.pairs.length) parts.push(t('linked') + ' ' + info.pairs[0].map(nameOf).join(' · '));
    if (res.points) parts.push(kids ? `קִבַּלְתֶּם ${res.points} נְקֻדּוֹת` : `קיבלתם ${res.points} נקודות חיים`);
    printEl.querySelector('small').textContent = parts.join(' · ');
    printEl.hidden = false; el.classList.add('printing'); printEl.classList.remove('go'); void printEl.offsetWidth; printEl.classList.add('go');
    printT = 3.6;
  }

  // ── the album
  let zoomId = null;
  function openAlbum() {
    audio && audio.play && audio.play('click');
    zoomId = null; albumEl.hidden = false; paintAlbum();
  }
  function paintAlbum() {
    const list = readPhotos().slice().reverse();
    const z = zoomId && list.find((p) => p.id === zoomId);
    const zname = (p) => (T.zones[p.zone] ? T.zones[p.zone][kids ? 1 : 0] : '');
    const pname = (p) => (p.sp ? nameOf(p.sp) : t('landscape'));
    albumEl.innerHTML = `<div class="af-ahead"><b>${icon('book')}${esc(t('album'))}</b><small>${esc(t('count', { n: list.length, m: MAX_PHOTOS }))} · ${esc(t('oldest', { m: MAX_PHOTOS }))}</small>
        <button type="button" class="af-aclose">${icon('close')}<span>${esc(t('close'))}</span></button></div>
      ${z ? `<div class="af-zoom"><img src="${z.img}" alt=""><div class="af-ztx"><b>${esc(pname(z))}</b><small>${esc(zname(z))}${z.visitor ? ' · ' + esc(t('visitor')) : ''}</small>
          ${(z.sps || []).length > 1 ? `<p>${esc(t('also'))} ${esc(z.sps.filter((s) => s !== z.sp).map(nameOf).join(', '))}</p>` : ''}
          ${z.pair ? `<p class="af-zpair">${esc(t('linked'))} ${esc(z.pair.map(nameOf).join(' · '))}</p>` : ''}
          <button type="button" class="af-zback">${icon('arrowR')}<span>${esc(t('back'))}</span></button></div></div>`
        : list.length ? `<div class="af-grid">${list.map((p) => `<button type="button" class="af-ph${p.pair ? ' pair' : ''}${p.visitor ? ' vis' : ''}" data-id="${esc(p.id)}" title="${esc(pname(p))}"><img src="${p.img}" alt="" loading="lazy"><span>${esc(pname(p))}</span></button>`).join('')}</div>`
        : `<p class="af-aempty">${esc(t('empty'))}</p>`}`;
  }
  albumEl.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.classList.contains('af-aclose')) { albumEl.hidden = true; audio && audio.play && audio.play('click'); return; }
    if (b.classList.contains('af-zback')) { zoomId = null; paintAlbum(); return; }
    if (b.dataset.id) { zoomId = b.dataset.id; paintAlbum(); audio && audio.play && audio.play('click'); }
  });
  albumEl.addEventListener('pointerdown', (e) => e.stopPropagation());
  albumEl.addEventListener('wheel', (e) => e.stopPropagation());

  // ── per frame: the names in the frame (a few times a second); a click on a creature brings it to the middle
  const _f = new THREE.Vector3();
  function update(rdt) {
    if (printT > 0) { printT -= rdt; if (printT <= 0) { printEl.hidden = true; el.classList.remove('printing'); } }
    if (!isOpen) return;
    if (imv.active) { close(); return; }
    if (W.selected) {
      const e = W.selected; try { bus.emit('species:close'); ui.hideSpecies(); } catch (err) { }
      if (e.alive) { if (e.isPlant) rig.focusOn(e.focusPoint(_f), Math.max(14, (e.topY() - e.y) * 2.2)); else rig.followEntity(e, Math.max(7, (e.vis.length || 1) * e.obj.scale.x * 6)); }   // an animal moves: the view keeps it
    }
    tagT -= rdt; if (tagT > 0) return; tagT = 0.3;
    const info = analyse(frameEl.getBoundingClientRect());
    const names = info.ids.slice(0, 4).map(nameOf);
    const sig = names.join('|') + (info.pairs.length ? '*' : '');
    if (sig === lastTag) return; lastTag = sig;
    tagEl.innerHTML = names.length ? `<b>${esc(t('inFrame'))}</b> ${esc(names.join(', '))}${info.pairs.length ? ` <em>${esc(t('linked'))}</em>` : ''}` : `<span class="af-none">${esc(t('nobody'))}</span>`;
    tagEl.classList.toggle('pair', info.pairs.length > 0);
  }

  function dispose() {
    close(); window.removeEventListener('keydown', onKey, true);
    el.remove(); btn.remove(); if (fcBtn) fcBtn.remove();
  }
  return { open, close, get isOpen() { return isOpen; }, update, dispose, analyse, shoot: () => shoot(frameEl.getBoundingClientRect(), 'main'), openAlbum, MAX: MAX_PHOTOS };
}
