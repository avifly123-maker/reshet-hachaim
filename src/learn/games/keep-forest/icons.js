// מחזיקים את היער – inline SVG icons (I.sun, I.thread, I.key, ...) and the owl companion "שומר היער" (no human figures).
// Exports: I, OWL. Needs nothing.

/* ───────────────────────────── icons (inline SVG) */
const sv = (body) => `<svg class="wl-ic" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
export const I = {
  sun: sv('<circle cx="12" cy="12" r="4.6" fill="currentColor"/><path d="M12 2.2v2.6M12 19.2v2.6M2.2 12h2.6M19.2 12h2.6M5 5l1.8 1.8M17.2 17.2L19 19M5 19l1.8-1.8M17.2 6.8L19 5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" fill="none"/>'),
  heat: sv('<path d="M10 4.5a2 2 0 0 1 4 0v9.2a4.5 4.5 0 1 1-4 0z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="17.5" r="2.6" fill="currentColor"/><path d="M12 9v7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M17 5h3M17 8.5h2.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
  fire: sv('<path d="M12 2.5c1 3.5 5.8 6.2 5.8 11.2a5.8 5.8 0 0 1-11.6 0c0-3.1 1.8-4.8 2.9-6.8.3 1.7 1 2.7 2.1 3.2C11.5 7.6 11.3 5.1 12 2.5z" fill="currentColor"/><path d="M12 13c.8 1.5 2.4 2.4 2.4 4.2a2.4 2.4 0 0 1-4.8 0c0-1.3.9-2.4 2.4-4.2z" fill="#fff3c4" fill-opacity=".85"/>'),
  wind: sv('<path d="M3 8.5h11.5a3 3 0 1 0-3-3M3 12.5h15a3 3 0 1 1-3 3M3 16.5h7" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/>'),
  rain: sv('<path d="M6.5 13.5a4 4 0 0 1 .6-8 5.2 5.2 0 0 1 9.9 1.3 3.4 3.4 0 0 1 .4 6.7z" fill="currentColor"/><path d="M8 16.5l-1 3M12 16.5l-1 3M16 16.5l-1 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  cloud: sv('<path d="M6.5 18a4.5 4.5 0 0 1 .4-9 6 6 0 0 1 11.3 1.6A3.8 3.8 0 0 1 17.7 18z" fill="currentColor"/>'),
  stump: sv('<path d="M6 20.5V11h12v9.5z" fill="currentColor"/><ellipse cx="12" cy="11" rx="6" ry="2.6" fill="currentColor"/><ellipse cx="12" cy="11" rx="4" ry="1.5" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.1"/><path d="M4 20.5h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M15 6.5l2.5-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
  road: sv('<path d="M8.5 21L10.6 3h2.8l2.1 18z" fill="currentColor"/><path d="M12 5v2.2M12 10v2.4M12 15.4V18" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>'),
  fall: sv('<path d="M3.5 20.5h17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5.5 19.2l9.5-5.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="17" cy="11.5" r="4.6" fill="currentColor"/><circle cx="13.6" cy="9.2" r="3.2" fill="currentColor"/>'),
  flower: sv('<g fill="currentColor"><circle cx="12" cy="6.3" r="3.6"/><circle cx="17.4" cy="10.2" r="3.6"/><circle cx="15.4" cy="16.6" r="3.6"/><circle cx="8.6" cy="16.6" r="3.6"/><circle cx="6.6" cy="10.2" r="3.6"/></g><circle cx="12" cy="11.6" r="2.8" fill="#fff6c8"/>'),
  drop: sv('<path d="M12 2.6C8.2 8 5.6 11.4 5.6 14.7a6.4 6.4 0 0 0 12.8 0C18.4 11.4 15.8 8 12 2.6z" fill="currentColor"/>'),
  life: sv('<path d="M12 21v-8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M12 13C12 8.5 9 6 4 6c0 4.5 3 7 8 7zM12 11.5c0-4 2.6-6.6 7.5-6.6 0 4-2.6 6.6-7.5 6.6z" fill="currentColor"/>'),
  thread: sv('<path d="M4 18C8 6 16 18 20 6" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="4" cy="18" r="2.4" fill="currentColor"/><circle cx="20" cy="6" r="2.4" fill="currentColor"/>'),
  star: sv('<path d="M12 2.6l2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.2l-5.8 3.2 1.2-6.5-4.8-4.5 6.5-.8z" fill="currentColor"/>'),
  check: sv('<path d="M4.5 12.5l4.8 4.8L19.5 7" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  wilt: sv('<path d="M12 21v-7c0-3 1.5-5 4.5-6.5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M16.5 7.5c2.5.3 3.8 2.3 3.6 5-2.6-.2-4-2.1-3.6-5zM12 14c-3.4.6-6 0-7.5-2.6 3-1.2 5.6-.6 7.5 2.6z" fill="currentColor"/>'),
  swap: sv('<path d="M5 9h12l-3.5-3.5M19 15H7l3.5 3.5" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  eye: sv('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" fill="currentColor"/><circle cx="12" cy="12" r="3.2" fill="#fff"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>'),
  bulb: sv('<path d="M12 2.8a6.6 6.6 0 0 0-3.8 12c.8.6 1.3 1.4 1.3 2.3h5c0-.9.5-1.7 1.3-2.3A6.6 6.6 0 0 0 12 2.8z" fill="currentColor"/><path d="M9.6 19.4h4.8M10.4 21.6h3.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
  skip: sv('<path d="M5 6l7 6-7 6zM12 6l7 6-7 6z" fill="currentColor"/>'),
  quest: sv('<circle cx="12" cy="12" r="9.6" fill="currentColor"/><path d="M9.3 9.4a2.8 2.8 0 1 1 3.9 2.6c-.8.4-1.2.9-1.2 1.8v.6" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/><circle cx="12" cy="17.3" r="1.4" fill="#fff"/>'),
  gear: sv('<circle cx="12" cy="12" r="3.4" fill="currentColor"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'),
  target: sv('<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/>'),
  key: sv('<circle cx="8.2" cy="8.2" r="5" fill="none" stroke="currentColor" stroke-width="2.7"/><path d="M11.8 11.8l8.6 8.6M16.4 16.4l2.7-2.7M18.9 18.9l2.3-2.3" stroke="currentColor" stroke-width="2.7" stroke-linecap="round"/>'),
  anchor: sv('<circle cx="12" cy="4.6" r="2.4" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 7v13.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M4.2 13.5c.4 4.4 3.8 7 7.8 7s7.4-2.6 7.8-7" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M2.6 15.4l1.6-2.4 2.3 1.7M21.4 15.4l-1.6-2.4-2.3 1.7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  deck: sv('<rect x="4" y="5" width="12" height="16" rx="2" fill="currentColor" opacity=".55"/><rect x="8" y="3" width="12" height="16" rx="2" fill="currentColor"/>'),
};
// the owl companion "שומר היער" (no human figures)
export const OWL = `<svg class="kf-owlsvg" viewBox="0 0 100 110" aria-hidden="true">
  <path d="M8 98h84" stroke="#6b4a24" stroke-width="7" stroke-linecap="round"/><path d="M70 98l10-9" stroke="#6b4a24" stroke-width="4" stroke-linecap="round"/><ellipse cx="82" cy="87" rx="6" ry="3.4" fill="#7cc46a" transform="rotate(-35 82 87)"/>
  <path d="M24 30L20 10l16 10zM76 30l4-20-16 10z" fill="#7a5530"/>
  <ellipse cx="50" cy="58" rx="31" ry="38" fill="#9a6d3d"/>
  <ellipse cx="50" cy="70" rx="19" ry="23" fill="#e9d3a6"/>
  <path d="M38 64q4 3 8 0M46 72q4 3 8 0M54 64q4 3 8 0M42 80q4 3 8 0M50 80q4 3 8 0" stroke="#b8925a" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M19 52q-6 22 8 38q3-20-8-38zM81 52q6 22-8 38q-3-20 8-38z" fill="#7a5530"/>
  <circle cx="37" cy="40" r="13" fill="#fbf3dc"/><circle cx="63" cy="40" r="13" fill="#fbf3dc"/>
  <g class="kf-eyes"><circle cx="38" cy="41" r="6" fill="#2a2016"/><circle cx="62" cy="41" r="6" fill="#2a2016"/><circle cx="40" cy="39" r="2" fill="#fff"/><circle cx="64" cy="39" r="2" fill="#fff"/></g>
  <path d="M46 49l4 8 4-8z" fill="#f0a63a"/>
  <path d="M40 96l-3 4M44 96v5M56 96v5M60 96l3 4" stroke="#f0a63a" stroke-width="3" stroke-linecap="round"/>
</svg>`;
