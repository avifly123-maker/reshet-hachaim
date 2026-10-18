// "דוח החוקר" – the report screen: one page of a field notebook (RTL), plus the gentle end-of-day prompt and the
// print layout (@media print shows only the report page; used by window.print() and by the desktop PDF export).
// createReportUI(root, { describe(day) → model, onNote(day, text), onClose(), onExport(model) }) →
//   { open(day), close(), isOpen(), prompt(text, onOpen), dispose() }
// The model comes from src/game/report.js (describe). This module owns its own CSS (injected once).
import { zoneWord } from '../core/place.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = (v) => Math.round((+v || 0) * 100);

// two-tone ink icons, same drawing language as ui.js (soft fill .f under a hand-weight outline)
const I = {
  notebook: '<path class="f" d="M6 3.5h12a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H6z"/><path d="M6 3.5h12a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H6z"/><path d="M4 7h4M4 12h4M4 17h4"/><path d="M10.5 8.5h6M10.5 12h6M10.5 15.5h4"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  prev: '<path d="M9 5l7 7-7 7"/>',
  next: '<path d="M15 5l-7 7 7 7"/>',
  print: '<path class="f" d="M5 10h14a2 2 0 0 1 2 2v5h-3v3H6v-3H3v-5a2 2 0 0 1 2-2z"/><path d="M7 10V4h10v6"/><path d="M5 10h14a2 2 0 0 1 2 2v5h-3M6 17H3v-5a2 2 0 0 1 2-2"/><path d="M6 14h12v6H6z"/>',
  who: '<path class="f" d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15z"/><path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15z"/><path d="M5 19c3-5 6-8 10-10"/>',
  what: '<circle class="f" cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
  chal: '<path class="f" d="M12 3.5l9 15.5H3z"/><path d="M12 3.5l9 15.5H3z"/><path d="M12 10v4" stroke-width="2.4"/><circle cx="12" cy="16.6" r=".9" fill="currentColor"/>',
  fact: '<path class="f" d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
  vit: '<path class="f" d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/><path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/><path d="M6.5 12.5h3l1.2-2.4 2 4.4 1.3-2h3.5"/>',
  pencil: '<path class="f" d="M5 16.5L15.8 5.7l2.5 2.5L7.5 19H5z"/><path d="M5 16.5L15.8 5.7l2.5 2.5L7.5 19H5z"/><path d="M13.8 7.7l2.5 2.5"/>',
  ok: '<circle class="f" cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="8.5"/><path d="M8 12.3l2.7 2.7L16.2 9.5"/>',
  // happenings
  event: '<path d="M12 6v8" stroke-width="2.6"/><circle cx="12" cy="18" r="1.3" fill="currentColor" stroke="none"/>',
  mission: '<path d="M5 12.5l4.5 4.5L19 7.5" stroke-width="2.6"/>',
  new: '<path class="f" d="M12 12C12 8 9 6 5 6c0 4 3 6 7 6zM12 10c0-4 3-6 7-6 0 4-3 6-7 6z"/><path d="M12 21v-9"/><path d="M12 12C12 8 9 6 5 6c0 4 3 6 7 6z"/><path d="M12 10c0-4 3-6 7-6 0 4-3 6-7 6z"/>',
  link: '<circle cx="6" cy="7" r="2.2"/><circle cx="18" cy="7" r="2.2"/><circle cx="12" cy="17.5" r="2.2"/><path d="M8 8.2l2.8 7.2M16 8.2l-2.8 7.2M8.2 7h7.6"/>',
  bloom: '<circle cx="12" cy="12" r="2.2" fill="currentColor"/><circle class="f" cx="12" cy="6.5" r="2.6"/><circle class="f" cx="17.2" cy="10.3" r="2.6"/><circle class="f" cx="15.2" cy="16.5" r="2.6"/><circle class="f" cx="8.8" cy="16.5" r="2.6"/><circle class="f" cx="6.8" cy="10.3" r="2.6"/><circle cx="12" cy="6.5" r="2.6"/><circle cx="17.2" cy="10.3" r="2.6"/><circle cx="15.2" cy="16.5" r="2.6"/><circle cx="8.8" cy="16.5" r="2.6"/><circle cx="6.8" cy="10.3" r="2.6"/>',
  seed: '<path class="f" d="M12 4c3.5 3 5 6 5 9a5 5 0 0 1-10 0c0-3 1.5-6 5-9z"/><path d="M12 4c3.5 3 5 6 5 9a5 5 0 0 1-10 0c0-3 1.5-6 5-9z"/><path d="M12 9v9"/>',
  paw: '<circle cx="6.5" cy="10" r="1.9"/><circle cx="10" cy="6" r="1.9"/><circle cx="14.5" cy="6" r="1.9"/><circle cx="18" cy="10" r="1.9"/><path class="f" d="M12.2 11.5c-2.8 0-5.2 3.1-5.2 5.4 0 1.5 1.2 2.3 2.5 2.3 1 0 1.7-.6 2.7-.6s1.7.6 2.7.6c1.3 0 2.5-.8 2.5-2.3 0-2.3-2.4-5.4-5.2-5.4z"/><path d="M12.2 11.5c-2.8 0-5.2 3.1-5.2 5.4 0 1.5 1.2 2.3 2.5 2.3 1 0 1.7-.6 2.7-.6s1.7.6 2.7.6c1.3 0 2.5-.8 2.5-2.3 0-2.3-2.4-5.4-5.2-5.4z"/>',
  tree: '<path class="f" d="M12 3C8 3 5 5.8 5 9.3S8 15 12 15s7-2.2 7-5.7S16 3 12 3z"/><path d="M12 21.5V15"/><path d="M12 3C8 3 5 5.8 5 9.3S8 15 12 15s7-2.2 7-5.7S16 3 12 3z"/>',
  gone: '<path class="f" d="M6 18C6 11 10 7 18 6c0 8-4 12-12 12z"/><path d="M6 18C6 11 10 7 18 6c0 8-4 12-12 12z" stroke-dasharray="2.5 2.5"/>',
  calm: '<path class="f" d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.3 6.3 0 0 0 10 10z"/><path d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.3 6.3 0 0 0 10 10z"/>',
  season: '<path class="f" d="M12 16l-6-2 1.5-2-3-3 3.5-.5L7 5l3.5 1.5L12 3l1.5 3.5L17 5l-1 3.5 3.5.5-3 3 1.5 2z"/><path d="M12 21v-5"/><path d="M12 16l-6-2 1.5-2-3-3 3.5-.5L7 5l3.5 1.5L12 3l1.5 3.5L17 5l-1 3.5 3.5.5-3 3 1.5 2z"/>',
  // weather
  sun: '<circle class="f" cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
  rain: '<path class="f" d="M7 14a4 4 0 0 1 .6-8 5.5 5.5 0 0 1 10.4 1.5A3.3 3.3 0 0 1 17.5 14z"/><path d="M7 14a4 4 0 0 1 .6-8 5.5 5.5 0 0 1 10.4 1.5A3.3 3.3 0 0 1 17.5 14z"/><path d="M8.5 17l-1 2.5M12.5 17l-1 2.5M16.5 17l-1 2.5"/>',
  storm: '<path class="f" d="M7 13a4 4 0 0 1 .6-8 5.5 5.5 0 0 1 10.4 1.5A3.3 3.3 0 0 1 17.5 13z"/><path d="M7 13a4 4 0 0 1 .6-8 5.5 5.5 0 0 1 10.4 1.5A3.3 3.3 0 0 1 17.5 13z"/><path d="M12.5 13l-2.5 4h3l-2 4"/>',
  heat: '<path class="f" d="M10 4.5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z"/><path d="M10 4.5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z"/><path d="M12 9v7"/>',
  dry: '<circle class="f" cx="12" cy="9" r="3.4"/><circle cx="12" cy="9" r="3.4"/><path d="M12 2.5v1.5M5.5 9H4M20 9h-1.5M7.4 4.4l1 1M16.6 4.4l-1 1"/><path d="M3 19h18M7 19l2-3 2 3 2-2.5L15 19"/>',
  flood: '<path d="M3 9c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0M3 14c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0M3 19c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0"/>',
  fire: '<path class="f" d="M12 21a6 6 0 0 1-6-6c0-3.5 3-5.5 3.5-9 2.4 1.6 3.4 3.6 3.2 5.6 1-.6 1.6-1.6 1.8-3 2 1.8 3.5 4 3.5 6.4a6 6 0 0 1-6 6z"/><path d="M12 21a6 6 0 0 1-6-6c0-3.5 3-5.5 3.5-9 2.4 1.6 3.4 3.6 3.2 5.6 1-.6 1.6-1.6 1.8-3 2 1.8 3.5 4 3.5 6.4a6 6 0 0 1-6 6z"/>',
};
const icon = (n, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${I[n] || ''}</svg>`;

const CSS = `
/* ===================================================== דוח החוקר – a page from a field notebook */
#ui.wol .km-row[data-a="report"] .ic { color: #a8475f; }
#ui.wol .km-row[data-a="report"]:hover { background: rgba(231, 154, 171, .22); }
#ui.wol .rep-layer { position: absolute; inset: 0; z-index: 48; display: none; place-items: center; padding: 16px; pointer-events: auto; }
#ui.wol .rep-layer.on { display: grid; }
#ui.wol .rep-backdrop { position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(10, 24, 15, .45), rgba(6, 14, 9, .78)); animation: rep-fade .3s both; }
#ui.wol .rep-page { --acc: #1f5f58; --acc2: #2f7f73; --tint: #dbe5d6; --pin: #2f6f8a;
  position: relative; width: min(960px, 96vw); min-height: min(540px, calc(100vh - 32px)); max-height: min(780px, calc(100vh - 32px)); display: flex; flex-direction: column;
  color: var(--ink); border-radius: 14px 18px 18px 14px; overflow: hidden; user-select: text; -webkit-user-select: text;
  background:
    linear-gradient(270deg, transparent 0 58px, rgba(200, 80, 70, .32) 58px 60px, transparent 60px),
    repeating-linear-gradient(180deg, transparent 0 29px, rgba(70, 110, 150, .11) 29px 30px),
    var(--tint);
  box-shadow: 0 2px 0 #b9b08a, 0 4px 0 #cfc7a2, 0 6px 0 #b0a77f, 0 24px 48px rgba(0, 0, 0, .5);
  animation: rep-in .38s cubic-bezier(.2, .8, .3, 1.15) both; }
#ui.wol .rep-page[data-biome="grove"] { --acc: #55601f; --acc2: #9a5e16; --tint: #ece0c4; --pin: #b8414a; }
#ui.wol .rep-page[data-biome="reef"] { --acc: #1d6680; --acc2: #2a8ac0; --tint: #d8eaef; --pin: #e0794a; }
/* spiral binding on the right edge (the spine side of a Hebrew notebook) */
#ui.wol .rep-rings { position: absolute; top: 22px; bottom: 22px; right: 0; width: 40px; pointer-events: none;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='36' viewBox='0 0 40 36'%3E%3Ccircle cx='17' cy='18' r='3.6' fill='%233a3426' fill-opacity='.75'/%3E%3Crect x='15.5' y='14.6' width='30' height='6.8' rx='3.4' fill='%23a49d86' stroke='%23615a49' stroke-width='1'/%3E%3Cpath d='M18 16.6h20' stroke='%23e8e3d0' stroke-width='1.3' stroke-linecap='round' stroke-opacity='.8'/%3E%3C/svg%3E") 0 0 / 40px 36px repeat-y; }
#ui.wol .rep-page:focus, #ui.wol .rep-page:focus-visible { outline: none; }
/* a small pencil dot on the satchel after a day ends, until the report is opened */
#ui.wol .kit-btn.rep-dot::before, #ui.wol .km-row[data-a="report"].rep-dot::before { content: ""; position: absolute; top: 4px; left: 4px; width: 10px; height: 10px; border-radius: 50%; background: var(--rose, #e79aab); box-shadow: 0 0 0 2px var(--canopy, #11241a); }
#ui.wol .km-row[data-a="report"] { position: relative; }
#ui.wol .km-row[data-a="report"].rep-dot::before { top: 50%; left: 10px; margin-top: -5px; box-shadow: none; }
#ui.wol .rep-head { position: relative; padding: 20px 84px 10px 64px; display: grid; grid-template-columns: 1fr auto; gap: 2px 18px; align-items: end; }
#ui.wol .rep-kicker { display: flex; align-items: center; gap: 6px; color: var(--acc2); font-weight: 800; font-size: .95em; letter-spacing: .02em; }
#ui.wol .rep-kicker .ic { width: 20px; height: 20px; }
#ui.wol .rep-head h2 { grid-column: 1; font-family: var(--serif); font-size: 2.15em; line-height: 1.05; color: var(--acc); }
#ui.wol .rep-by { grid-column: 1; font-size: .92em; color: var(--ink2); font-weight: 600; }
#ui.wol .rep-date { grid-column: 2; grid-row: 1 / span 3; display: flex; flex-direction: column; align-items: center; gap: 6px; }
#ui.wol .rep-nav { display: flex; align-items: center; gap: 6px; }
#ui.wol .rep-nav button { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; color: var(--acc); background: rgba(255, 255, 255, .55); box-shadow: inset 0 0 0 1.5px rgba(60, 70, 40, .3); transition: transform .15s, background .2s; }
#ui.wol .rep-nav button:hover:not(:disabled) { background: #fff; transform: scale(1.06); }
#ui.wol .rep-nav button:disabled { opacity: .3; cursor: default; }
#ui.wol .rep-nav .ic { width: 22px; height: 22px; }
#ui.wol .rep-dayno { min-width: 7.2em; text-align: center; font-family: var(--serif); font-size: 1.55em; line-height: 1; color: var(--ink); padding: 6px 12px 7px; border-radius: 12px; background: rgba(255, 255, 255, .6); box-shadow: 0 0 0 1.5px rgba(60, 70, 40, .25), 2px 3px 0 rgba(90, 70, 40, .12); transform: rotate(-1.5deg); }
#ui.wol .rep-meta { display: flex; flex-wrap: wrap; justify-content: center; gap: 5px; max-width: 330px; }
#ui.wol .rep-tag { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px 3px 8px; border-radius: 999px; font-size: .84em; font-weight: 700; background: rgba(255, 255, 255, .5); color: var(--ink2); box-shadow: inset 0 0 0 1px rgba(60, 70, 40, .2); }
#ui.wol .rep-tag .ic { width: 17px; height: 17px; }
#ui.wol .rep-tag.w-sun .ic, #ui.wol .rep-tag.w-dry .ic { color: #c8941a; }
#ui.wol .rep-tag.w-rain .ic, #ui.wol .rep-tag.w-storm .ic, #ui.wol .rep-tag.w-flood .ic { color: #2f7194; }
#ui.wol .rep-tag.w-heat .ic, #ui.wol .rep-tag.w-fire .ic { color: #c8473a; }
#ui.wol .rep-tag.season .ic { color: var(--acc2); }
#ui.wol .rep-tag.live { background: var(--sun-pale, #f4e8bc); color: var(--sun-ink, #6b4e0c); }
#ui.wol .rep-close { position: absolute; top: 14px; left: 16px; width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; color: var(--ink2); background: rgba(255, 255, 255, .6); z-index: 2; transition: transform .2s, background .2s; }
#ui.wol .rep-close:hover { transform: rotate(90deg); background: #fff; }
#ui.wol .rep-body { flex: 1; min-height: 0; overflow-y: auto; scrollbar-width: thin; padding: 8px 84px 14px 34px;
  display: grid; grid-template-columns: 1.12fr 1fr; gap: 14px 18px; align-content: start;
  grid-template-areas: "who chal" "what fact" "what vit" "notes notes"; }
#ui.wol .rep-sec { position: relative; padding: 12px 16px 14px; border-radius: 14px; background: rgba(255, 255, 255, .5); box-shadow: inset 0 0 0 1px rgba(110, 95, 60, .16); }
#ui.wol .rep-sec > h3 { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-family: var(--serif); font-size: 1.25em; line-height: 1.1; color: var(--ink); }
#ui.wol .rep-sec > h3 .ic { width: 26px; height: 26px; padding: 3px; border-radius: 50%; background: var(--hc, #e4ecc6); color: var(--hi, #2c4f26); }
#ui.wol .rep-who { grid-area: who; --hc: #e4ecc6; --hi: #2c4f26; }
#ui.wol .rep-what { grid-area: what; --hc: var(--sky-pale, #dbeaf0); --hi: var(--sky-ink, #1f5670); }
#ui.wol .rep-chal { grid-area: chal; --hc: var(--clay-pale, #f2e0cc); --hi: var(--clay-ink, #7a3f17); }
#ui.wol .rep-fact { grid-area: fact; --hc: var(--sun-pale, #f4e8bc); --hi: var(--sun-ink, #6b4e0c); }
#ui.wol .rep-vit { grid-area: vit; --hc: var(--rose-pale, #f3dfe3); --hi: var(--rose-ink, #8a3a50); }
#ui.wol .rep-notes { grid-area: notes; --hc: var(--lav-pale, #e8e2f3); --hi: var(--lav-ink, #5b4a8f); }
/* who lives in the forest */
#ui.wol .rep-counts { display: flex; gap: 8px; margin-bottom: 10px; }
#ui.wol .rep-counts > div { flex: 1; padding: 6px 10px 7px; border-radius: 10px; background: rgba(255, 255, 255, .6); text-align: center; }
#ui.wol .rep-counts b { display: block; font-size: 1.55em; line-height: 1.05; font-weight: 800; color: var(--acc); }
#ui.wol .rep-counts b { white-space: nowrap; }
#ui.wol .rep-counts b small { font-size: .5em; font-weight: 700; color: #8a8468; margin-inline-start: 3px; }
#ui.wol .rep-counts span { font-size: .82em; font-weight: 700; color: var(--ink2); }
#ui.wol .rep-chips { display: flex; flex-wrap: wrap; gap: 6px; }
#ui.wol .rep-chip { position: relative; display: inline-flex; align-items: center; gap: 5px; padding: 2px 9px 2px 3px; border-radius: 999px; background: #fbf8ec; box-shadow: inset 0 0 0 1px rgba(110, 95, 60, .2); font-size: .86em; font-weight: 700; line-height: 1.1; }
#ui.wol .rep-chip.an { background: #f6ecdc; }
#ui.wol .rep-chip i { width: 30px; height: 30px; flex: none; border-radius: 50%; overflow: hidden; display: grid; place-items: center; background: color-mix(in srgb, var(--c, #8a6) 30%, #f4f1e0); }
#ui.wol .rep-chip i img { width: 118%; height: 118%; object-fit: cover; }
#ui.wol .rep-chip em { font-style: normal; color: #8a7a52; font-weight: 800; }
#ui.wol .rep-chip.nw { box-shadow: inset 0 0 0 2px var(--leaf2, #5f9a3e); }
#ui.wol .rep-chip.nw::after { content: "חדש"; position: absolute; top: -7px; left: -4px; padding: 0 5px; border-radius: 999px; font-size: .7em; line-height: 1.5; background: var(--leaf2, #5f9a3e); color: #fff; }
#ui.wol .rep-more { align-self: center; font-size: .85em; font-weight: 800; color: #8a7a52; padding: 0 4px; }
#ui.wol .rep-lost { margin-top: 8px; font-size: .86em; color: #7a6e52; }
/* what happened */
#ui.wol .rep-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
#ui.wol .rep-list li { display: flex; gap: 9px; align-items: flex-start; line-height: 1.4; }
#ui.wol .rep-list li > .ic { flex: none; width: 24px; height: 24px; padding: 3px; margin-top: 1px; border-radius: 50%; background: rgba(255, 255, 255, .75); color: var(--ink2); box-shadow: inset 0 0 0 1px rgba(110, 95, 60, .18); }
#ui.wol .rep-list li.h-event > .ic { color: #a86e17; background: #f7ead0; }
#ui.wol .rep-list li.h-mission > .ic { color: #3f7a2e; background: #e4ecc6; }
#ui.wol .rep-list li.h-new > .ic, #ui.wol .rep-list li.h-tree > .ic { color: #3f7a2e; }
#ui.wol .rep-list li.h-link > .ic { color: #6a55a8; background: #ece6f6; }
#ui.wol .rep-list li.h-bloom > .ic { color: #a8475f; }
#ui.wol .rep-list li.h-seed > .ic { color: #9a5e16; }
#ui.wol .rep-list li.h-paw > .ic { color: #7a3f17; }
#ui.wol .rep-list li.h-gone > .ic { color: #8a8468; }
#ui.wol .rep-list b { font-weight: 700; }
#ui.wol .rep-list small { display: block; font-size: .9em; color: #5b5a45; margin-top: 1px; }
/* challenge */
#ui.wol .rep-chal h4 { font-size: 1.08em; font-weight: 800; color: var(--clay-ink, #7a3f17); margin-bottom: 3px; }
#ui.wol .rep-chal.good h4 { color: #3f7a2e; }
#ui.wol .rep-chal.good { --hc: #e4ecc6; --hi: #2c4f26; }
#ui.wol .rep-chal p { line-height: 1.45; }
#ui.wol .rep-tip { display: flex; gap: 6px; align-items: flex-start; margin-top: 8px; padding: 6px 10px; border-radius: 10px; background: rgba(255, 255, 255, .6); font-size: .92em; font-weight: 600; color: #3a4a30; }
#ui.wol .rep-tip .ic { width: 18px; height: 18px; flex: none; color: #c8941a; margin-top: 1px; }
/* the day's fact */
#ui.wol .rep-factbox { display: flex; gap: 12px; align-items: flex-start; }
#ui.wol .rep-srcbox { padding: 10px 14px; border-radius: 10px; background: linear-gradient(180deg, #fbf3dc, #f2e5c0); border: 1px solid rgba(160, 120, 50, .35); text-align: center; }
#ui.wol .rep-srcbox .t { margin: 0; font-family: var(--serif); font-size: 1.2em; line-height: 1.95; color: #3a2e18; }
#ui.wol .rep-srcbox small { display: block; color: #8a6a3a; }
#ui.wol .rep-srcbox .q { margin: 8px 0 0; font-size: .95em; color: #4a3a1e; text-align: right; }
#ui.wol .rep-factbox .art { flex: none; width: 88px; height: 88px; border-radius: 12px; overflow: hidden; background: color-mix(in srgb, var(--c, #8a6) 25%, #f4f1e0); box-shadow: 0 0 0 3px #fbf8ec, 0 0 0 4px rgba(110, 95, 60, .3), 2px 4px 8px rgba(80, 60, 30, .2); transform: rotate(2deg); }
#ui.wol .rep-factbox .art img { width: 100%; height: 100%; object-fit: cover; display: block; }
#ui.wol .rep-factbox b { display: block; font-family: var(--serif); font-size: 1.15em; color: var(--acc); margin-bottom: 2px; }
#ui.wol .rep-factbox p { line-height: 1.45; font-size: .95em; }
/* vitality sparkline */
#ui.wol .rep-vitline { font-weight: 700; color: var(--ink2); margin-bottom: 4px; }
#ui.wol .rep-vitline b { color: var(--acc); font-size: 1.15em; }
#ui.wol .rep-spark { width: 100%; height: auto; max-height: 96px; display: block; direction: ltr; overflow: visible; }
#ui.wol .rep-spark .grid { stroke: rgba(110, 95, 60, .2); stroke-width: 1; stroke-dasharray: 3 4; }
#ui.wol .rep-spark .area { fill: rgba(95, 154, 62, .12); }
#ui.wol .rep-spark .line { fill: none; stroke: #5f9a3e; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
#ui.wol .rep-spark .dot { fill: #5f9a3e; stroke: #fbf8ec; stroke-width: 2; }
#ui.wol .rep-spark .dot.sel { fill: #e6a93c; }
#ui.wol .rep-spark .hit { fill: transparent; }
#ui.wol .rep-spark text { font: 700 10px var(--sans); fill: #7a6e52; text-anchor: middle; }
#ui.wol .rep-spark text.sel { fill: var(--ink); }
#ui.wol .rep-spark text.val { font-size: 11px; fill: #3a4a30; }
/* the child's notes */
#ui.wol .rep-notes textarea { width: 100%; min-height: 96px; resize: vertical; padding: 4px 12px; border: 0; border-radius: 10px; outline: none;
  font: 500 1.08em/30px var(--sans); color: #22301c; user-select: text; -webkit-user-select: text;
  background: repeating-linear-gradient(180deg, transparent 0 29px, rgba(70, 110, 150, .28) 29px 30px), rgba(255, 255, 255, .6); background-attachment: local;
  box-shadow: inset 0 0 0 1.5px rgba(110, 95, 60, .25); }
#ui.wol .rep-notes textarea:focus { box-shadow: inset 0 0 0 2px var(--lav-ink, #5b4a8f); }
#ui.wol .rep-notes textarea::placeholder { color: #8f8a72; }
#ui.wol .rep-note-print { display: none; }
#ui.wol .rep-foot { display: flex; align-items: center; gap: 10px; padding: 10px 84px 14px 34px; border-top: 1.5px dashed rgba(110, 95, 60, .3); }
#ui.wol .rep-foot .sp { flex: 1; font-size: .85em; color: #7a6e52; font-weight: 600; }
#ui.wol .rep-foot .btn .ic { width: 20px; height: 20px; }
#ui.wol .rep-foot .btn.soft { color: var(--ink); }
/* the end-of-day prompt: a toast with a button */
#ui.wol .toast.rep-prompt { display: flex; align-items: center; gap: 10px; padding: 2px 6px 2px 4px; font-weight: 600; max-width: 100%; }
#ui.wol .rep-prompt .t-ic { background: var(--rose, #e79aab); color: #3a1520; }
#ui.wol .rep-prompt .btn { min-height: 36px; padding: .25em 1em; font-size: .95em; flex: none; }
/* beginners: bigger text, fewer sections */
#ui.wol.kids .rep-page { font-size: 1.12em; }
#ui.wol.kids .rep-body { grid-template-columns: 1.1fr 1fr; grid-template-areas: "who fact" "what notes"; }
#ui.wol.kids .rep-chip i { width: 40px; height: 40px; }
#ui.wol.kids .rep-chip { font-size: .95em; }
#ui.wol.kids .rep-factbox .art { width: 110px; height: 110px; }
#ui.wol.kids .rep-notes textarea { min-height: 150px; font-size: 1.15em; line-height: 34px; background-image: repeating-linear-gradient(180deg, transparent 0 33px, rgba(70, 110, 150, .28) 33px 34px); }
@media (max-width: 860px), (max-height: 560px) {
  #ui.wol .rep-head { padding: 16px 60px 8px 60px; grid-template-columns: 1fr; }
  #ui.wol .rep-date { grid-column: 1; grid-row: auto; flex-direction: row; flex-wrap: wrap; justify-content: flex-start; }
  #ui.wol .rep-body, #ui.wol.kids .rep-body { grid-template-columns: 1fr; grid-template-areas: "who" "what" "chal" "fact" "vit" "notes"; padding: 8px 60px 12px 18px; }
  #ui.wol.kids .rep-body { grid-template-areas: "who" "what" "fact" "notes"; }
  #ui.wol .rep-foot { padding: 8px 60px 12px 18px; }
  #ui.wol .rep-head h2 { font-size: 1.7em; }
}
@keyframes rep-in { from { opacity: 0; transform: translateY(18px) rotate(.6deg) scale(.97); } to { opacity: 1; transform: none; } }
@keyframes rep-fade { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { #ui.wol .rep-page, #ui.wol .rep-backdrop { animation: none; } }

/* ===================================================== print: only the report page, A4 portrait */
@media print {
  @page { size: A4 portrait; margin: 11mm 11mm 12mm; }
  html.rep-open, html.rep-open body { height: auto !important; overflow: visible !important; background: #fff !important; }
  html.rep-open body > *:not(#ui) { display: none !important; }
  html.rep-open #ui.wol { position: static !important; inset: auto !important; font-size: 10.5pt !important; color: #1e2a1c; }
  html.rep-open #ui.wol > *:not(.rep-layer) { display: none !important; }
  html.rep-open #ui.wol .rep-layer { position: static; display: block !important; padding: 0; }
  #ui.wol .rep-backdrop, #ui.wol .rep-close, #ui.wol .rep-nav button, #ui.wol .rep-foot, #ui.wol .rep-tag.live, #ui.wol .rep-notes textarea, #ui.wol .rep-rings { display: none !important; }
  #ui.wol .rep-page, #ui.wol.kids .rep-page { width: auto; height: auto; max-height: none; overflow: visible; animation: none; transform: none; filter: none;
    border-radius: 5mm; box-shadow: inset 0 0 0 .4mm rgba(110, 95, 60, .45); -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 10.5pt; }
  #ui.wol .rep-head, #ui.wol.kids .rep-head { grid-template-columns: 1fr auto; padding: 6mm 19mm 2mm 7mm; }
  #ui.wol .rep-head h2 { font-size: 2em; }
  #ui.wol .rep-date { grid-column: 2; grid-row: 1 / span 3; flex-direction: column; }
  #ui.wol .rep-body, #ui.wol.kids .rep-body { overflow: visible; padding: 2mm 19mm 5mm 7mm; gap: 3.5mm 4mm;
    grid-template-columns: 1.12fr 1fr; grid-template-areas: "who chal" "what fact" "what vit" "notes notes"; }
  #ui.wol.kids .rep-body { grid-template-areas: "who fact" "what notes"; }
  #ui.wol .rep-sec { background: rgba(255, 255, 255, .55); }
  #ui.wol .rep-sec { break-inside: avoid; page-break-inside: avoid; }
  #ui.wol .rep-note-print { display: block; min-height: 28mm; white-space: pre-wrap; padding: 0 3mm; font: 500 1.05em/8mm var(--sans);
    background: repeating-linear-gradient(180deg, transparent 0 calc(8mm - 1px), rgba(70, 110, 150, .4) calc(8mm - 1px) 8mm); border-radius: 2mm; }
  #ui.wol .rep-note-print.empty { min-height: 40mm; }
  #ui.wol .rep-print-foot { display: flex !important; justify-content: space-between; margin: 0 19mm 4mm 7mm; font-size: .8em; color: #7a6e52; }
}
#ui.wol .rep-print-foot { display: none; }
`;

function sparkSVG(pts) {
  if (!pts || !pts.length) return '';
  const W = 260, H = 76, padX = 14, top = 14, bot = 18;
  const n = pts.length;
  const x = (i) => n === 1 ? W / 2 : padX + (i * (W - padX * 2)) / (n - 1);
  const y = (v) => top + (1 - Math.max(0, Math.min(1, v))) * (H - top - bot);
  const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const area = n > 1 ? `<path class="area" d="M${x(0).toFixed(1)},${(H - bot).toFixed(1)} L${line.replace(/ /g, ' L')} L${x(n - 1).toFixed(1)},${(H - bot).toFixed(1)}Z"/>` : '';
  const sel = pts.findIndex((p) => p.sel);
  return `<svg class="rep-spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="חיוניות היער בימים האחרונים">
    <line class="grid" x1="0" x2="${W}" y1="${y(0.5)}" y2="${y(0.5)}"/><line class="grid" x1="0" x2="${W}" y1="${y(1)}" y2="${y(1)}"/>
    ${area}${n > 1 ? `<polyline class="line" points="${line}"/>` : ''}
    ${pts.map((p, i) => `<g><title>יום ${p.d}: ${pct(p.v)}%</title><circle class="hit" cx="${x(i)}" cy="${y(p.v)}" r="11"/><circle class="dot${i === sel ? ' sel' : ''}" cx="${x(i)}" cy="${y(p.v)}" r="${i === sel ? 5.5 : 4}"/>
      <text class="${i === sel ? 'sel' : ''}" x="${x(i)}" y="${H - 3}">${p.d}</text>${i === sel ? `<text class="val" x="${x(i)}" y="${Math.max(10, y(p.v) - 9)}">${pct(p.v)}%</text>` : ''}</g>`).join('')}
  </svg>`;
}

export function createReportUI(root, { describe, onNote, onClose, onExport }) {
  if (!document.getElementById('wol-report-css')) { const st = document.createElement('style'); st.id = 'wol-report-css'; st.textContent = CSS; document.head.appendChild(st); }
  const layer = document.createElement('div');
  layer.className = 'rep-layer'; layer.setAttribute('role', 'dialog'); layer.setAttribute('aria-modal', 'true'); layer.setAttribute('aria-label', 'דוח החוקר');
  root.appendChild(layer);
  let model = null, noteT = 0, lastFocus = null;

  function chipsHTML(m) {
    const max = m.kids ? 10 : 18;
    const list = m.chips.slice(0, max);
    const html = list.map((c) => `<span class="rep-chip ${c.plant ? 'pl' : 'an'}${c.isNew ? ' nw' : ''}" style="--c:${esc(c.color || '#8a6')}"><i>${c.thumb ? `<img src="${esc(c.thumb)}" alt="" draggable="false">` : ''}</i>${esc(c.name)}${c.count > 1 ? ` <em dir="ltr">×${c.count}</em>` : ''}</span>`).join('');
    return html + (m.chips.length > max ? `<span class="rep-more">ועוד ${m.chips.length - max}</span>` : '');
  }

  function render() {
    const m = model; if (!m) return;
    const kids = m.kids;
    const wx = m.weather.map((w) => `<span class="rep-tag w-${w.k}">${icon(w.k)}${esc(w.t)}</span>`).join('');
    const ch = m.challenge;
    const v0 = pct(m.vit.start), v1 = pct(m.vit.end);
    const P = (n) => `<bdi dir="ltr">${n}%</bdi>`;
    const vitWords = v1 > v0 + 2 ? `עלתה מ־${P(v0)} ל־<b>${P(v1)}</b>` : v1 < v0 - 2 ? `ירדה מ־${P(v0)} ל־<b>${P(v1)}</b>` : `נשארה בערך <b>${P(v1)}</b>`;
    const sections = [];
    sections.push(`<section class="rep-sec rep-who"><h3>${icon('who')}מי גר ${zoneWord('in')}</h3>
      <div class="rep-counts"><div><b>${m.counts.plants}</b><span>צמחים</span></div><div><b>${m.counts.animals}</b><span>בעלי חיים</span></div>
      <div><b>${m.counts.species}<small>מתוך ${m.counts.total}</small></b><span>מינים</span></div></div>
      <div class="rep-chips">${chipsHTML(m)}</div></section>`);
    sections.push(`<section class="rep-sec rep-what"><h3>${icon('what')}מה קרה היום</h3><ul class="rep-list">${m.happenings.map((h) => `<li class="h-${esc(h.ic)}">${icon(I[h.ic] ? h.ic : 'event')}<span><b>${esc(h.t)}</b>${h.sub ? `<small>${esc(h.sub)}</small>` : ''}</span></li>`).join('')}</ul></section>`);
    if (!kids) sections.push(`<section class="rep-sec rep-chal${ch.good ? ' good' : ''}"><h3>${icon(ch.good ? 'ok' : 'chal')}האתגר המרכזי</h3><h4>${esc(ch.t)}</h4><p>${esc(ch.p)}</p>${ch.tip ? `<div class="rep-tip">${icon('fact')}<span>${esc(ch.tip)}</span></div>` : ''}</section>`);
    if (m.fact) sections.push(`<section class="rep-sec rep-fact"><h3>${icon('fact')}${kids ? 'הידעתם?' : 'תגלית'}</h3><div class="rep-factbox"><span class="art" style="--c:${esc(m.fact.color || '#8a6')}">${m.fact.art || m.fact.thumb ? `<img src="${esc(m.fact.art || m.fact.thumb)}" alt="">` : ''}</span><div><b>${esc(m.fact.name)}</b><p>${esc(m.fact.text)}</p></div></div></section>`);
    if (m.source) sections.push(`<section class="rep-sec rep-src"><h3>${icon('fact')}מקור היום</h3><div class="rep-srcbox"><p class="t">${esc(m.source.text)}</p><small>${esc(m.source.ref)}</small>${m.source.q ? `<p class="q"><b>שאלה לשיחה בבית:</b> ${esc(m.source.q)}</p>` : ''}</div></section>`);
    if (!kids) sections.push(`<section class="rep-sec rep-vit"><h3>${icon('vit')}חיוניות היער</h3><div class="rep-vitline">${m.live ? 'מתחילת היום החיוניות ' : 'במשך היום החיוניות '}${vitWords}</div>${sparkSVG(m.vit.spark)}</section>`);
    sections.push(`<section class="rep-sec rep-notes"><h3>${icon('pencil')}${kids ? 'מה ראיתי היום' : 'הערות החוקר'}</h3>
      <textarea rows="${kids ? 4 : 3}" maxlength="800" dir="rtl" spellcheck="false" placeholder="${kids ? `מה ראיתם היום ${zoneWord('in')}? כתבו כאן…` : `מה ראיתם היום ${zoneWord('in')}? מה הפתיע אתכם? איזו שאלה הייתם רוצים לבדוק מחר? כתבו כאן…`}">${esc(m.note)}</textarea>
      <div class="rep-note-print${m.note ? '' : ' empty'}">${esc(m.note)}</div></section>`);
    const isDesk = !!(window.wolDesktop && window.wolDesktop.saveReportPDF);
    layer.innerHTML = `<div class="rep-backdrop"></div>
      <article class="rep-page" data-biome="${esc(m.biomeId)}" tabindex="-1">
        <div class="rep-rings"></div>
        <button class="rep-close" data-r="close" title="סגירה (Esc)" aria-label="סגירה">${icon('close')}</button>
        <header class="rep-head">
          <div class="rep-kicker">${icon('notebook')}דוח החוקר</div>
          <h2>${esc(m.forest)}</h2>
          ${m.player ? `<div class="rep-by">החוקרים: ${esc(m.player)}</div>` : '<div class="rep-by"></div>'}
          <div class="rep-date">
            <div class="rep-nav"><button data-r="prev" title="יום קודם" aria-label="יום קודם" ${m.prev == null ? 'disabled' : ''}>${icon('prev')}</button>
              <span class="rep-dayno">יום ${m.day} ${zoneWord('in')}</span>
              <button data-r="next" title="יום הבא" aria-label="יום הבא" ${m.next == null ? 'disabled' : ''}>${icon('next')}</button></div>
            <div class="rep-meta">${m.season ? `<span class="rep-tag season">${icon('season')}עונת ה${esc(m.season)}</span>` : ''}${wx}${m.live ? '<span class="rep-tag live">היום עדיין נמשך</span>' : ''}</div>
          </div>
        </header>
        <div class="rep-body">${sections.join('')}</div>
        <div class="rep-print-foot"><span>רשת החיים · דוח החוקר</span><span>יום ${m.day} · ${esc(m.forest)}</span></div>
        <footer class="rep-foot">
          <button class="btn primary" data-r="print">${icon('print')}${isDesk ? 'שמירה כ-PDF' : 'הדפסה / שמירה כ-PDF'}</button>
          <span class="sp">${m.count > 1 ? `${m.count} ימים ביומן · אפשר לעבור בין הימים בחיצים` : 'כל יום נשמר כאן, ואפשר לחזור אליו'}</span>
          <button class="btn soft" data-r="close">סגירה</button>
        </footer>
      </article>`;
    const ta = layer.querySelector('textarea'), mirror = layer.querySelector('.rep-note-print');
    ta.addEventListener('input', () => {
      mirror.textContent = ta.value; mirror.classList.toggle('empty', !ta.value);
      model.note = ta.value;
      clearTimeout(noteT); const day = model.day, v = ta.value; noteT = setTimeout(() => onNote && onNote(day, v), 250);
    });
  }

  function flushNote() {
    clearTimeout(noteT);
    const ta = layer.querySelector('textarea');
    if (ta && model) onNote && onNote(model.day, ta.value);
  }
  function go(day) {
    if (day == null) return;
    flushNote();
    const m = describe(day); if (!m) return;
    model = m; render();
    const pg = layer.querySelector('.rep-page'); if (pg) pg.style.animation = 'none';
  }
  layer.addEventListener('click', (e) => {
    if (e.target.classList.contains('rep-backdrop')) { api.close(); return; }
    const b = e.target.closest('[data-r]'); if (!b) return;
    const a = b.dataset.r;
    if (a === 'close') api.close();
    else if (a === 'prev') go(model && model.prev);
    else if (a === 'next') go(model && model.next);
    else if (a === 'print') { flushNote(); onExport && onExport(model); }
  });
  // while the report is open it owns the keyboard: Esc closes, arrows change the day (not inside the text box)
  const onKey = (e) => {
    if (!api.isOpen()) return;
    e.stopImmediatePropagation();
    const typing = e.target && /TEXTAREA|INPUT/.test(e.target.tagName);
    if (e.key === 'Escape') { e.preventDefault(); api.close(); }
    else if (!typing && e.key === 'ArrowRight') { e.preventDefault(); go(model && model.prev); }
    else if (!typing && e.key === 'ArrowLeft') { e.preventDefault(); go(model && model.next); }
  };
  window.addEventListener('keydown', onKey, true);

  let promptEl = null;
  const setDot = (on) => { for (const el of root.querySelectorAll('.kit-btn, .km-row[data-a="report"]')) el.classList.toggle('rep-dot', on); };
  const api = {
    open(day) {
      const m = describe(day); if (!m) return;
      setDot(false);
      if (promptEl) { promptEl.remove(); promptEl = null; }
      lastFocus = document.activeElement;
      model = m; render();
      layer.classList.add('on'); document.documentElement.classList.add('rep-open');
      const pg = layer.querySelector('.rep-page'); try { pg && pg.focus({ preventScroll: true }); } catch (e) { }
    },
    close() {
      if (!api.isOpen()) return;
      flushNote();
      layer.classList.remove('on'); layer.innerHTML = ''; document.documentElement.classList.remove('rep-open');
      model = null;
      try { lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true }); } catch (e) { }
      onClose && onClose();
    },
    isOpen: () => layer.classList.contains('on'),
    // a quiet toast with a button; it never stops the game
    prompt(text, onOpen) {
      const box = root.querySelector('.toasts'); if (!box) return;
      if (promptEl) promptEl.remove();
      const t = document.createElement('div');
      t.className = 'toast small glass rep-prompt';
      t.innerHTML = `<span class="t-ic">${icon('pencil')}</span><span>${esc(text)}</span><button class="btn amber sm">לדוח</button>`;
      box.appendChild(t); promptEl = t; setDot(true);
      requestAnimationFrame(() => t.classList.add('on'));
      const kill = () => { if (!t.isConnected) return; t.classList.remove('on'); t.classList.add('off'); setTimeout(() => t.remove(), 320); if (promptEl === t) promptEl = null; };
      t.querySelector('button').addEventListener('click', (e) => { e.stopPropagation(); kill(); onOpen && onOpen(); });
      t.addEventListener('click', kill);
      setTimeout(kill, 12000);
    },
    dispose() {
      if (api.isOpen()) { flushNote(); layer.classList.remove('on'); document.documentElement.classList.remove('rep-open'); }
      if (promptEl) promptEl.remove();
      setDot(false);
      window.removeEventListener('keydown', onKey, true);
      layer.remove();
    },
  };
  return api;
}
