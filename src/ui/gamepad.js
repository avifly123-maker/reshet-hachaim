// Game controller (gamepad) support – for whoever wants it; the mouse and the screen buttons keep working as always.
// A cursor appears on the screen when the controller is used and does what the mouse does:
//   left stick  – move the cursor          A – click (hold A and move = drag, e.g. a card from the tray)
//   right stick – turn and tilt the view    B – back / close (like Esc)
//   LT / RT, LB / RB – zoom out / in        X – fly to the spot under the cursor (like a double click)
//   D-pad – turn and tilt the view          Y – the whole forest (like Home)        Start – pause / continue (like Space)
// Over a list or a panel that scrolls, the right stick scrolls it instead of moving the view.
// Standard mapping (Xbox / PlayStation controllers in Chrome and Electron). setGamepadRig(rig) links the 3D view.
const CSS = `
.gp-cursor { position: fixed; left: 0; top: 0; width: 30px; height: 30px; margin: -3px 0 0 -3px; z-index: var(--z-top); pointer-events: none;
  opacity: 0; transition: opacity .25s; filter: drop-shadow(0 2px 3px rgba(0,0,0,.45)); }
.gp-cursor.on { opacity: 1; }
.gp-cursor.down svg { transform: scale(.86); transform-origin: 3px 3px; }
`;
const ARROW = `<svg viewBox="0 0 30 30" width="30" height="30" aria-hidden="true"><path d="M3 3 L3 24 L9 18.5 L13 27 L17 25 L13 16.8 L21 16.5 Z" fill="#ffd84a" stroke="#2a1d05" stroke-width="2" stroke-linejoin="round"/></svg>`;

let rig = null;
export function setGamepadRig(r) { rig = r || null; }

export function initGamepad({ toast } = {}) {
  if (typeof navigator === 'undefined' || !navigator.getGamepads || initGamepad.done) return;
  initGamepad.done = true;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const cur = document.createElement('div'); cur.className = 'gp-cursor'; cur.innerHTML = ARROW; document.body.appendChild(cur);

  // synthetic pointer events have no real pointer to capture: let a failed capture pass quietly
  for (const fn of ['setPointerCapture', 'releasePointerCapture']) {
    const orig = Element.prototype[fn];
    Element.prototype[fn] = function (id) { try { return orig.call(this, id); } catch (e) { return undefined; } };
  }

  let x = innerWidth / 2, y = innerHeight / 2, active = false, lastUse = 0, raf = 0;
  let prev = [], downEl = null, downX = 0, downY = 0;
  const held = { rot: 0, tilt: 0, zoom: 0 };
  const DEAD = 0.18;

  function show(on) { active = on; cur.classList.toggle('on', on); }
  window.addEventListener('mousemove', (e) => { if (active && e.isTrusted) show(false); }, { passive: true });
  window.addEventListener('gamepadconnected', () => { toast && toast('שלט משחק מחובר: הסטיק השמאלי מזיז את הסמן, A לוחץ, B חוזר, והסטיק הימני מסובב את המבט.', 'info'); loop(); });
  window.addEventListener('gamepaddisconnected', () => { show(false); setHold('rot', 0); setHold('tilt', 0); setHold('zoom', 0); });

  const elAt = () => document.elementFromPoint(x, y);
  function pe(type, target, buttons) {
    if (!target) return;
    const o = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, screenX: x, screenY: y, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons };
    target.dispatchEvent(new PointerEvent(type, o));
    const mt = { pointerdown: 'mousedown', pointerup: 'mouseup', pointermove: 'mousemove' }[type];
    if (mt) target.dispatchEvent(new MouseEvent(mt, o));
  }
  function key(k, code, up) {
    const o = { key: k, code: code || k, bubbles: true, cancelable: true };
    (document.activeElement || document.body).dispatchEvent(new KeyboardEvent(up ? 'keyup' : 'keydown', o));
  }
  function setHold(kind, dir) {
    if (held[kind] === dir) return;
    held[kind] = dir; if (rig && !rig.driven) rig.hold(kind, dir);
  }
  function scrollableAt(el) {
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      if (e.tagName === 'CANVAS') return null;
      const s = getComputedStyle(e);
      if (/(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 2) return e;
    }
    return null;
  }
  function pressed(b) { return !!(b && (b.pressed || b.value > 0.5)); }

  function loop() {
    if (raf) return;
    let last = performance.now();
    const step = (t) => {
      raf = 0;
      const pads = [...navigator.getGamepads()].filter(Boolean);
      const gp = pads.find(p => p.mapping === 'standard') || pads[0];
      if (!gp) { show(false); return; }
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      const ax = (i) => { const v = gp.axes[i] || 0; return Math.abs(v) < DEAD ? 0 : (v - Math.sign(v) * DEAD) / (1 - DEAD); };
      const B = gp.buttons.map(pressed);
      const now = t;
      const was = (i) => !!prev[i];
      const edgeDown = (i) => B[i] && !was(i), edgeUp = (i) => !B[i] && was(i);
      const lx = ax(0), ly = ax(1), rx = ax(2), ry = ax(3);
      const any = lx || ly || rx || ry || B.some(Boolean);
      if (any) { lastUse = now; if (!active) show(true); }
      if (active && now - lastUse > 12000) show(false);
      // left stick → cursor (faster the further the stick is pushed)
      if (lx || ly) {
        const sp = 1100 * dt;
        x = Math.max(0, Math.min(innerWidth - 1, x + Math.sign(lx) * lx * lx * sp));
        y = Math.max(0, Math.min(innerHeight - 1, y + Math.sign(ly) * ly * ly * sp));
        cur.style.transform = `translate(${x}px, ${y}px)`;
        pe('pointermove', elAt(), B[0] ? 1 : 0);
      }
      // A: press / release (a click when it did not travel)
      if (edgeDown(0)) { downEl = elAt(); downX = x; downY = y; cur.classList.add('down'); pe('pointerdown', downEl, 1); if (downEl && downEl.focus && downEl.matches('button, [tabindex]')) try { downEl.focus({ preventScroll: true }); } catch (e) { } }
      if (edgeUp(0)) {
        const up = elAt(); cur.classList.remove('down'); pe('pointerup', up, 0);
        if (up && downEl && Math.hypot(x - downX, y - downY) < 12 && (up === downEl || downEl.contains(up) || up.contains(downEl))) up.click ? up.click() : up.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
        downEl = null;
      }
      if (edgeDown(1)) { key('Escape'); setTimeout(() => key('Escape', 'Escape', true), 30); }
      if (edgeDown(2)) { const el = elAt(); if (el) el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 })); }
      if (edgeDown(3)) { key('Home'); setTimeout(() => key('Home', 'Home', true), 30); }
      if (edgeDown(9)) { key(' ', 'Space'); setTimeout(() => key(' ', 'Space', true), 30); }
      // right stick: scroll the panel under the cursor, otherwise turn / tilt the view
      const sc = (ry || rx) ? scrollableAt(elAt()) : null;
      if (sc) { sc.scrollTop += ry * 900 * dt; setHold('rot', 0); setHold('tilt', 0); }
      else {
        setHold('rot', rx > 0.45 || B[15] ? -1 : rx < -0.45 || B[14] ? 1 : 0);
        setHold('tilt', ry < -0.45 || B[12] ? 1 : ry > 0.45 || B[13] ? -1 : 0);
      }
      setHold('zoom', B[7] || B[5] ? 1 : B[6] || B[4] ? -1 : 0);
      prev = B;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  window.__gpDebug = { at(nx, ny) { x = nx; y = ny; cur.style.transform = `translate(${x}px, ${y}px)`; }, get pos() { return [x, y]; } };
  // a controller that was already connected before the page loaded shows up on its first button press
  if ([...navigator.getGamepads()].some(Boolean)) loop();
}
