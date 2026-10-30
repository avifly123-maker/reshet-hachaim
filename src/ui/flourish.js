// Short flourishes (1.3.2, 1 to 2 seconds): small moments of joy that point at what just happened.
//   window.__flourish = {
//     part(partId)          a part of the game that just opened: its tile (start screen, learning hub, map) lifts and
//                           shines. Called by itself after a stage moment ('wol-stage-done'): every part of the new
//                           stage shines the first time its tile is seen (a tab or the hub may open later).
//     tile(el)              the same for any element
//     sparks(el|{x,y}, opts) round sparks and a ring from an element's centre (a badge, a stamp…)
//     badge(el)             a new badge (src/ui/badge-toast.js calls it on the medallion)
//     thread(fromEl, toEl)  a new thread: a glowing line drawn between two elements (or {x,y} points), a light runs on it
//     labDoors()            the lab's doors part as the child comes in (src/lab/lab.js calls it on open)
//     mission(speciesId)    the animal of a finished mission celebrates beside the "משימה הושלמה!" banner (a small
//                           canvas of its own; the forest calls it, see the report: src/game/game/ W.missionCompleted)
//   }
// The album of the learning hub plays its own opening (the cards come up one after the other) when it is entered.
// Nothing here touches the game's renderer; the mission's animal is drawn by a small WebGLRenderer made for it and
// thrown away after 2.6 s. No cross shapes: sparks are dots and rings.
import * as THREE from 'three';
import { PARTS } from '../core/journey.js';
import { current as currentPlayer } from '../core/profiles.js';
import { loadPack, loadedPack } from '../core/packs.js';
import { makeRng } from '../core/util.js';
import { ZONE_IDS, ZONE_LOOK } from '../data/zones.js';
import { svcApp } from '../core/services.js';

const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
const host = () => document.getElementById('ui') || document.body;
const visible = (el) => { if (!el || !el.isConnected) return false; const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return false; if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05 && !el.closest('[hidden]'); };

// ───────────────────────────────────────── a tile lifts and shines
function tile(el) {
  if (!el || el.__fl) return false;
  el.__fl = true;
  const pos = getComputedStyle(el).position; const fix = pos === 'static';
  if (fix) el.style.position = 'relative';
  const sh = document.createElement('i'); sh.className = 'fl-shine'; sh.setAttribute('aria-hidden', 'true'); el.appendChild(sh);
  el.classList.remove('fl-lift'); void el.offsetWidth; el.classList.add('fl-lift');
  setTimeout(() => { sh.remove(); el.classList.remove('fl-lift'); if (fix) el.style.position = ''; el.__fl = false; }, 1800);
  setTimeout(() => sparks(el, { n: 10, spread: 0.6 }), 260);
  return true;
}

// round sparks from the centre of an element (or a point)
function sparks(at, { n = 14, color = '#f6cf72', spread = 1, ring = true } = {}) {
  if (reduced()) return;
  let x, y, s = 60;
  if (at && at.getBoundingClientRect) { const r = at.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; s = Math.max(40, Math.min(r.width, r.height)); }
  else if (at) { x = at.x; y = at.y; } else return;
  const box = document.createElement('div'); box.className = 'fl-sparks'; box.style.left = x + 'px'; box.style.top = y + 'px';
  let html = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.5, d = s * (0.55 + Math.random() * 0.6) * spread + 20;
    const sz = 5 + Math.random() * 7;
    html += `<i class="${i % 4 === 3 ? 'r' : ''}" style="--x:${(Math.cos(a) * d).toFixed(1)}px;--y:${(Math.sin(a) * d).toFixed(1)}px;--s:${sz.toFixed(1)}px;--c:${color};--d:${(0.8 + Math.random() * 0.5).toFixed(2)}s"></i>`;
  }
  box.innerHTML = html; host().appendChild(box);
  if (ring) { const p = document.createElement('div'); p.className = 'fl-pulse'; p.style.cssText = `left:${x - s / 2}px;top:${y - s / 2}px;width:${s}px;height:${s}px;--c:${color}`; host().appendChild(p); setTimeout(() => p.remove(), 1100); }
  setTimeout(() => box.remove(), 1500);
}

function badge(el) { if (!el) return; const med = el.querySelector('.bdg-med') || el; setTimeout(() => sparks(med, { n: 18, color: '#f6cf72', spread: 1.1 }), 450); }

// ───────────────────────────────────────── a thread: a glowing line drawn between two places
function centre(a) { if (!a) return null; if (a.getBoundingClientRect) { const r = a.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; } return a; }
function thread(from, to, { color = '#ffe39a', ms = 1600 } = {}) {
  const A = centre(from), B = centre(to); if (!A || !B) return;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'fl-thread'); svg.setAttribute('aria-hidden', 'true');
  const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1;
  const cx = mx - dy / L * L * 0.22, cy = my + dx / L * L * 0.22;   // a soft bow
  const d = `M${A.x},${A.y} Q${cx},${cy} ${B.x},${B.y}`;
  svg.innerHTML = `<path class="g" d="${d}"/><path class="l" d="${d}" style="stroke:${color}"/><circle r="6" fill="#fffbe9"/>`;
  host().appendChild(svg);
  const paths = svg.querySelectorAll('path'), dot = svg.querySelector('circle'), len = paths[1].getTotalLength();
  paths.forEach((p) => { p.style.strokeDasharray = len; p.style.strokeDashoffset = len; });
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / (ms * 0.6)), e = 1 - Math.pow(1 - k, 3);
    paths.forEach((p) => { p.style.strokeDashoffset = len * (1 - e); });
    const pt = paths[1].getPointAtLength(len * e); dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
    if (k < 1) requestAnimationFrame(step);
    else { sparks(B, { n: 10, color, spread: 0.5 }); setTimeout(() => { svg.classList.add('out'); setTimeout(() => svg.remove(), 520); }, ms * 0.4); }
  };
  if (reduced()) { paths.forEach((p) => { p.style.strokeDashoffset = 0; }); setTimeout(() => svg.remove(), ms); } else requestAnimationFrame(step);
}

// ───────────────────────────────────────── the lab's doors
function labDoors() {
  if (reduced() || document.querySelector('.fl-doors')) return;
  const d = document.createElement('div'); d.className = 'fl-doors'; d.setAttribute('aria-hidden', 'true'); d.innerHTML = '<i></i><i></i>';
  host().appendChild(d);
  try { const a = svcApp() && svcApp().audio; if (a) setTimeout(() => a.play('pop'), 250); } catch (e) { }
  setTimeout(() => d.remove(), 1500);
}

// ───────────────────────────────────────── the parts of a new stage shine when their tiles are first seen
// open tiles of the learning hub carry their action (data-wl), the start screen and the map their part (data-part)
const HUB_SEL = { album: '[data-wl="album"]', quiz: '[data-wl="setup"]', badges: '#wol-learn .wl-home [data-wl="badges"]', frames: '#wol-learn .wl-home [data-wl="frames"]' };
for (const p of ['webpuzzle', 'keepforest', 'inventors', 'expedition', 'duel', 'versematch']) HUB_SEL[p] = `[data-wl="game"][data-g="${p}"]`;
const pending = new Map();   // part → { at: time it was announced, who: the player it was announced to }
const PENDING_MS = 20 * 60e3;   // a part not seen in 20 minutes: never mind
const who = () => { try { return currentPlayer().id; } catch (e) { return ''; } };
function tilesOf(part) {
  const sel = [`[data-part="${part}"]:not(.jv):not(.is-veiled):not(.jm-part)`];
  if (HUB_SEL[part]) sel.push(HUB_SEL[part]);
  return [...document.querySelectorAll(sel.join(','))].filter((el) => !el.closest('.ss') && !el.classList.contains('jv') && !el.classList.contains('is-veiled'));
}
let scanT = 0;
function scan() {
  scanT = 0;
  if (document.querySelector('.ss, #rguide.modal')) { later(600); return; }   // a film or רובו־דע's words first
  const me = who();
  for (const [part, p] of pending) {
    if (Date.now() - p.at > PENDING_MS || p.who !== me) { pending.delete(part); continue; }   // too old, or another player's
    const els = tilesOf(part).filter(visible);
    if (!els.length) continue;
    els.slice(0, 2).forEach((el, i) => setTimeout(() => tile(el), i * 160));
    pending.delete(part);
  }
  if (pending.size) later(900);
}
function later(ms) { if (!scanT) scanT = setTimeout(scan, ms); }
function part(id) { if (!id || !PARTS[id]) return; pending.set(id, { at: Date.now(), who: who() }); later(350); }
addEventListener('wol-stage-done', (e) => {
  const n = e.detail && e.detail.stage; if (!n) return;
  for (const [id, P] of Object.entries(PARTS)) if (P.stage === n && !P.after) part(id);
});
// tabs, screens and the hub change what is visible: look again soon after a click or a repaint
addEventListener('click', () => { if (pending.size) { clearTimeout(scanT); scanT = 0; later(450); } }, true);
addEventListener('wol-journey', () => {   // (a player switch fires it too: the other player's parts are dropped)
  const me = who(); for (const [k, p] of pending) if (p.who !== me) pending.delete(k);
  if (pending.size) { clearTimeout(scanT); scanT = 0; later(450); }
});

// ───────────────────────────────────────── the album of the learning hub opens
let lastScreen = '', hubObs = null;
function watchHub() {
  const hub = document.getElementById('wol-learn'); if (!hub || hubObs) return !!hub;
  const main = hub.querySelector('.wl-main') || hub;
  hubObs = new MutationObserver(() => {
    const sec = main.querySelector(':scope > .wl-screen'); const cls = sec ? [...sec.classList].find((c) => c.startsWith('wl-') && c !== 'wl-screen') || '' : '';
    if (cls === 'wl-album' && lastScreen !== 'wl-album' && !reduced()) {
      const cards = sec.querySelectorAll('.wl-grid > *'); for (let i = 0; i < Math.min(cards.length, 30); i++) cards[i].style.setProperty('--fi', i);
      sec.classList.add('fl-open'); setTimeout(() => sec.classList.remove('fl-open'), 1900);
    }
    lastScreen = cls;
  });
  hubObs.observe(main, { childList: true });
  return true;
}
if (!watchHub()) { const mo = new MutationObserver(() => { if (watchHub()) mo.disconnect(); }); const h = document.getElementById('ui'); if (h) mo.observe(h, { childList: true }); else addEventListener('DOMContentLoaded', () => { const u = document.getElementById('ui'); if (u && !watchHub()) mo.observe(u, { childList: true }); }); }

// ───────────────────────────────────────── the animal of a finished mission celebrates
// its own small canvas next to the banner: a hop (walkers), a loop (fliers) or a spin (fish), with round sparks
const ZONES = ZONE_IDS;
const MASCOT = Object.fromEntries(ZONE_IDS.map((z) => [z, ZONE_LOOK[z].mascot]));
let heroBusy = false;
async function mission(speciesId, opts = {}) {
  if (heroBusy || reduced()) return; heroBusy = true;
  let renderer = null, v = null, box = null, raf = 0;
  const owned = [];
  try {
    // the zone of the animal: the running forest's pack first, then any loaded zone pack that has the species
    let zone = opts.zone || null, Z = null;
    try { const g = svcApp() && svcApp().game; if (!zone && g && g.biome) zone = g.biome.id || g.biome; } catch (e) { }
    const zs = zone ? [zone, ...ZONES.filter((z) => z !== zone)] : ZONES;
    for (const z of zs) { const P = loadedPack(z); if (P && P.zone && P.zone.animals && P.zone.animals[speciesId]) { Z = P.zone; zone = z; break; } }
    if (!Z) { zone = zone && ZONES.includes(zone) ? zone : 'amazon'; Z = (await loadPack(zone)).zone; if (!Z.animals[speciesId]) speciesId = MASCOT[zone]; }
    const make = Z.animals[speciesId]; if (!make) return;
    v = make({ seed: 3, rng: makeRng(3) }); if (!v || !v.object) return;
    const q = (() => { try { return (svcApp() && svcApp().pipe && svcApp().pipe.quality) || 'medium'; } catch (e) { return 'medium'; } })();
    const low = q === 'min' || q === 'low';
    box = document.createElement('div'); box.className = 'fl-hero'; box.setAttribute('aria-hidden', 'true');
    const cv = document.createElement('canvas'); box.appendChild(cv);
    // beside the banner (below it), or high in the middle
    const ban = document.querySelector('.mission-banner');
    const r = ban ? ban.getBoundingClientRect() : null;
    const W = innerHeight < 620 ? 150 : 210, H = innerHeight < 620 ? 136 : 190;
    // (without a banner: high on the left, clear of the middle where the coach and the cards open)
    const left = r ? Math.min(innerWidth - W - 8, Math.max(8, r.left - W * 0.8)) : Math.max(8, innerWidth * 0.2 - W / 2);
    const top = r ? Math.max(8, r.top + r.height / 2 - H / 2) : Math.max(70, innerHeight * 0.16);
    box.style.left = left + 'px'; box.style.top = top + 'px';
    renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: !low, powerPreference: 'low-power' });
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.setPixelRatio(low ? 0.75 : Math.min(devicePixelRatio || 1, 1.5)); renderer.setSize(W, H, false); renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(30, W / H, 0.05, 50);
    scene.add(new THREE.HemisphereLight('#fff6e8', '#6a5a48', 1.5)); const d = new THREE.DirectionalLight('#fff1d6', 2.2); d.position.set(2, 4, 3); scene.add(d);
    const holder = new THREE.Group(); holder.add(v.object); scene.add(holder);
    const b0 = new THREE.Box3().setFromObject(v.object), sz = b0.getSize(new THREE.Vector3()); const m = Math.max(sz.x, sz.y, sz.z) || 1;
    v.object.scale.multiplyScalar(1 / m); const c = new THREE.Box3().setFromObject(v.object).getCenter(new THREE.Vector3()); v.object.position.sub(c);
    cam.position.set(0, 0.35, 2.6); cam.lookAt(0, 0.05, 0);
    // a fish spins, a flyer loops, the others hop. A fish is told by its species (locomotion 'swim', s.swims), not by its
    // clips: birds have 'fly' without 'walk' too. Fish swim on their 'fly' clip (reef_kit.py: fly/hover/glide).
    const acts = v.actions || [];
    const def = ((Z.data && Z.data.species) || []).find((s) => s.id === speciesId) || {};
    const kind = def.swims || def.locomotion === 'swim' ? 'swim' : acts.includes('fly') ? 'fly' : 'hop';
    const moveClip = acts.includes('fly') ? 'fly' : acts.includes('hover') ? 'hover' : 'idle';
    try { window.__flourish.info = { species: speciesId, zone, kind, clip: kind === 'hop' ? 'run' : moveClip, actions: acts }; } catch (e) { }   // a headless check
    // the first picture is made before the box shows (a slow computer compiles the shaders first), then the clock starts
    try { renderer.compile(scene, cam); } catch (e) { }
    v.update(0.016, { action: kind === 'hop' ? 'idle' : moveClip }); renderer.render(scene, cam);
    host().appendChild(box);
    try { const a = svcApp() && svcApp().audio; if (a) setTimeout(() => a.play('pop'), 200); } catch (e) { }
    const t0 = performance.now(); let last = t0;
    await new Promise((res) => {
      const frame = (now) => {
        const t = (now - t0) / 1000, dt = Math.min(0.1, (now - last) / 1000); last = now;
        if (kind === 'hop') {   // three happy hops, turning toward us
          const ph = (t * 1.6) % 1, hop = Math.sin(Math.PI * ph);
          holder.position.y = hop * 0.28 - 0.08; holder.rotation.y = 0.7 + Math.sin(t * 2.4) * 0.5;
          holder.scale.set(1 + (1 - hop) * 0.06, 1 - (1 - hop) * 0.08 + hop * 0.05, 1 + (1 - hop) * 0.06);
          v.update(dt, { action: hop > 0.2 ? 'run' : 'idle', speed: 1.4 });
        } else if (kind === 'fly') {   // a loop in the air
          const a = t * 2.6; holder.position.set(Math.sin(a) * 0.35, Math.cos(a) * 0.15, Math.cos(a) * 0.2); holder.rotation.set(0, a + Math.PI / 2, -Math.sin(a) * 0.4);
          v.update(dt, { action: 'fly' });
        } else {   // a fish: a happy spin
          holder.position.set(Math.sin(t * 2.2) * 0.25, Math.sin(t * 4.4) * 0.06, 0); holder.rotation.set(0, t * 3.2, Math.sin(t * 4) * 0.2);
          v.update(dt, { action: moveClip });
        }
        renderer.render(scene, cam);
        if (t < 2.6) raf = requestAnimationFrame(frame); else res();
      };
      raf = requestAnimationFrame(frame);
      setTimeout(() => sparks(box, { n: 12, color: '#ffe39a', spread: 0.5 }), 300);
    });
  } catch (e) { console.warn('flourish: mission', e); }
  finally {
    cancelAnimationFrame(raf);
    try { if (v && v.dispose) v.dispose(); } catch (e) { }
    for (const x of owned) try { x.dispose(); } catch (e) { }
    if (renderer) { try { renderer.dispose(); renderer.forceContextLoss(); } catch (e) { } }
    if (box) box.remove();
    heroBusy = false;
  }
}

window.__flourish = { part, tile, sparks, badge, thread, labDoors, mission };
