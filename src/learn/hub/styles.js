// מרכז הלמידה – putting the hub's CSS in the page, once: CSS_MAIN + CSS_MORE, the icon rules and the home page.
// Exports: injectCss(). Needs: css-main.js, css-more.js.
import { CSS_MAIN } from './css-main.js';
import { CSS_MORE } from './css-more.js';

const CSS = CSS_MAIN + CSS_MORE;
/* the hub's icons (src/ui/icons-hub.js): a coloured tile before each title, a line icon before each button's words */
const ICON_CSS = `
.wol-learn .wl-bgroup h3>span{display:inline-flex;align-items:center;gap:.45em}
.wol-learn .wl-bgroup h3 .wl-tic{font-size:1.15em}
.wol-learn .wl-tic{display:inline-grid;place-items:center;flex:none;width:1.3em;height:1.3em;border-radius:.34em;vertical-align:middle;
  background:linear-gradient(160deg,rgba(255,255,255,.24),rgba(0,0,0,.14)),var(--tc,#3a4d5c);box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 .08em .2em rgba(0,0,0,.3)}
.wol-learn .wl-tic .ic{width:.8em;height:.8em;color:#fff1c4}
.wol-learn .wl-tbody h2{gap:.32em}
.wol-learn .wl-bhead b{display:inline-flex;align-items:center;gap:.4em}
.wol-learn .wl-frames h3{display:flex;align-items:center;gap:.35em}.wol-learn .wl-frames h3 .ic{width:1.2em;height:1.2em;color:#9c6512}
.wol-learn .wl-btn .ic{width:1.3em;height:1.3em}
.wol-learn .wl-chip .ic{width:1.25em;height:1.25em}
.wol-learn .wl-tab{display:inline-flex;align-items:center;gap:.3em}
.wol-learn .wl-tab .ic{width:1.15em;height:1.15em;opacity:.8}
.wol-learn .wl-tab.sel .ic{opacity:1}
@media (max-width:1180px){.wol-learn .wl-tab .ic{display:none}}
/* the games: their title gets the tile, place tabs and filters the zone icons */
.wol-learn .wp-phead h1 .wl-tic,.wol-learn .kf-phead h1 .wl-tic{width:1.15em;height:1.15em}
.wol-learn .wp-phead h1 .wl-tic .ic,.wol-learn .kf-phead h1 .wl-tic .ic{width:.72em;height:.72em}
.wol-learn .wp-tab .ic{width:1.2em;height:1.2em}
.wol-learn .kf-bt h2{display:flex;align-items:center;justify-content:center;gap:.3em}
.wol-learn .kf-bt h2 .wl-tic{width:1em;height:1em;border-radius:.28em}.wol-learn .kf-bt h2 .wl-tic .ic{width:.66em;height:.66em}
.wol-learn .kf-phead h1 .wl-tic{width:1em;height:1em}
.wol-learn .kf-bar [data-a=setup]{white-space:nowrap}
@media (max-width:900px){.wol-learn .kf-bar [data-a=setup] .ic{display:none}}   /* the crowded game bar keeps the words on one line */
@media (max-height:520px){.wol-learn .kf-pick .kf-phead p{display:none}.wol-learn .wl-screen.kf-pick{gap:.5em;padding-bottom:.4em}}   /* 800x460: the go button stays on the screen */
.wol-learn .iv-handbar .iv-f,.wol-learn .ex-tab{display:inline-flex;align-items:center;gap:.3em}
.wol-learn .iv-handbar .iv-f .ic,.wol-learn .ex-tab .ic{width:1.1em;height:1.1em}
`;
/* the home (1.3.2): one page that never scrolls, from 800x460 to 1920x1080. Right: the quiz, my badges, my frames;
   middle: the album, big; left: the card games as small tiles. The words a child reads grow with var(--ts) (text size).
   Sizes inside the tiles follow the tile (container units), so the same page fits a small laptop and a big screen. */
const HOME_CSS = `
.wol-learn .wl-screen.wl-home{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr) minmax(0,1.05fr);gap:1.1em;width:100%;max-width:100em;max-height:52em;margin:auto;padding:.2em 1.4em 1.3em;align-items:stretch;overflow:hidden}
.wol-learn .wl-hside{display:grid;grid-template-rows:minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr);gap:.9em;min-height:0;min-width:0}
.wol-learn .wl-ht{position:relative;display:flex;min-height:0;min-width:0;border-radius:1.2em;overflow:hidden;text-align:right;transition:transform .2s,box-shadow .2s}
.wol-learn .wl-ht:hover:not(.is-veiled),.wol-learn .wl-ht:focus-visible{transform:translateY(-3px);box-shadow:0 16px 36px rgba(0,0,0,.42),inset 0 0 0 4px rgba(255,255,255,.22)}
.wol-learn .wl-hh{display:flex;align-items:center;gap:.35em;font-family:var(--serif);font-weight:700;font-size:calc(1.42em * var(--ts,1));line-height:1.08;color:#1f2c1a}
.wol-learn .wl-hh .wl-tic{font-size:1.05em}
.wol-learn .wl-hh.big{font-size:calc(1.9em * var(--ts,1))}
.wol-learn .wl-htx{display:flex;flex-direction:column;justify-content:center;gap:.3em;min-width:0;flex:1}
.wol-learn .wl-htx small{font-size:calc(.95em * var(--ts,1));color:var(--ink2);line-height:1.3;font-weight:600}
.wol-learn .wl-hn{align-self:flex-start;font-weight:800;color:#5a4214;background:rgba(255,255,255,.6);border-radius:99px;padding:.08em .65em;font-size:calc(.9em * var(--ts,1));white-space:nowrap;box-shadow:inset 0 0 0 1px rgba(120,90,40,.25)}
/* the quiz */
.wol-learn .wl-hq{container-type:size;align-items:center;gap:.9em;padding:.6em 1em;background:radial-gradient(circle at 82% 50%,rgba(143,208,103,.6),transparent 52%),linear-gradient(180deg,#e3f1d3,#c2dea6)}
.wol-learn .wl-hqart{position:relative;flex:none;height:min(80cqh,8.5em);aspect-ratio:1}
.wol-learn .wl-hq .wl-qbubble{width:100%;height:100%;border-radius:50%;background:#fbf6e5;box-shadow:0 0 0 .3em rgba(255,255,255,.65),0 8px 18px rgba(40,60,20,.3);display:grid;place-items:center;overflow:hidden}
.wol-learn .wl-hq .wl-qbubble img{width:100%;height:100%;object-fit:cover;transform:scale(1.5);transform-origin:58% 36%}
.wol-learn .wl-hq .wl-qbadge{position:absolute;top:-.15em;left:-.35em;width:40%;height:40%;color:var(--amber2);filter:drop-shadow(0 3px 5px rgba(0,0,0,.25));animation:wl-bob 2.6s ease-in-out infinite}
.wol-learn .wl-hq .wl-qbadge .wl-ic{width:100%;height:100%}
/* my badges */
.wol-learn .wl-hb{flex-direction:column;gap:.3em;padding:.6em .9em .5em;background:radial-gradient(circle at 12% 100%,rgba(246,207,114,.5),transparent 60%),linear-gradient(180deg,#f7ecd2,#e9d6a6)}
.wol-learn .wl-hrow{display:flex;align-items:center;flex-wrap:wrap;gap:.15em .5em;justify-content:space-between}
.wol-learn .wl-hb .wl-hh{white-space:nowrap}
.wol-learn .wl-hrow .wl-hn{align-self:center}
.wol-learn .wl-hbrow{flex:1;min-height:0;display:flex;align-items:center;justify-content:space-evenly;gap:.2em;container-type:size}
.wol-learn .wl-hbrow .bdg{--bs:min(7.4em,29cqw,92cqh);width:auto;pointer-events:none}
.wol-learn .wl-hbrow .bdg-rib{display:none}
.wol-learn .wl-hempty{font-size:calc(.95em * var(--ts,1));color:#5a4a30;text-align:center;line-height:1.3;font-weight:600}
/* my frames */
.wol-learn .wl-hf{container-type:size;align-items:center;gap:.9em;padding:.5em 1em .5em .9em;background:radial-gradient(circle at 84% 50%,rgba(216,166,64,.45),transparent 55%),linear-gradient(180deg,#f1e4c6,#dcc596)}
.wol-learn .wl-hfcard{flex:none;display:grid;place-items:center;height:100%;width:min(34cqw,calc(80cqh * .78))}
.wol-learn .wl-hfcard .wl-card{--cw:min(5.4em,23cqw,calc(62cqh / 1.42));transform:rotate(-5deg);pointer-events:none}
/* the album, in the middle */
.wol-learn .wl-hmid{position:relative;display:flex;min-height:0;min-width:0}
.wol-learn .wl-ha{flex:1;flex-direction:column;background:radial-gradient(circle at 50% 40%,rgba(240,180,76,.6),transparent 58%),linear-gradient(180deg,#f5e3b8,#e0c286)}
.wol-learn .wl-hfan{position:relative;flex:1;min-height:0;width:100%;container-type:size}
.wol-learn .wl-hfan .wl-card{--cw:min(14em,32cqw,62cqh);position:absolute;left:50%;top:50%;margin:-6.6em 0 0 -5em;pointer-events:none;transition:transform .3s}
.wol-learn .wl-hfan .wl-card:nth-child(1){transform:translateX(-6.4em) rotate(-11deg)}
.wol-learn .wl-hfan .wl-card:nth-child(2){transform:translateY(-.6em);z-index:2}
.wol-learn .wl-hfan .wl-card:nth-child(3){transform:translateX(6.4em) rotate(11deg)}
.wol-learn .wl-ha:hover:not(.is-veiled) .wl-hfan .wl-card:nth-child(1){transform:translateX(-7.4em) rotate(-15deg)}
.wol-learn .wl-ha:hover:not(.is-veiled) .wl-hfan .wl-card:nth-child(3){transform:translateX(7.4em) rotate(15deg)}
.wol-learn .wl-hab{display:flex;flex-direction:column;gap:.3em;padding:.5em 1.5em 1.1em;background:linear-gradient(180deg,rgba(255,250,235,0),rgba(255,250,235,.6) 40%)}
.wol-learn .wl-hcount{font-size:calc(1.1em * var(--ts,1));color:var(--ink2);font-weight:600}
.wol-learn .wl-hcount b{color:#1f2c1a;font-weight:800}
.wol-learn .wl-hab .wl-meter{height:.8em;margin-top:.15em}
.wol-learn .wl-hpack{position:absolute;top:.8em;left:.8em;z-index:5;min-height:2.6em;padding:.3em 1em;font-size:calc(1em * var(--ts,1))}
.wol-learn .wl-hpack .ic{width:1.3em;height:1.3em}
.wol-learn .wl-hnopack{position:absolute;top:.8em;left:.8em;z-index:5;display:flex;align-items:center;gap:.4em;max-width:calc(100% - 1.6em);padding:.35em .9em;border-radius:99px;background:rgba(255,255,255,.7);color:#5a4214;font-weight:700;font-size:calc(.86em * var(--ts,1));pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,.15)}
.wol-learn .wl-hnopack .wl-ic{color:var(--amber2)}
/* the card games: small tiles, an icon and a name */
.wol-learn .wl-hgames{display:flex;flex-direction:column;gap:.5em;min-height:0;min-width:0}
.wol-learn .wl-hgh{display:flex;align-items:center;gap:.4em;margin:0;padding:.15em .2em 0;font-family:var(--serif);font-size:calc(1.22em * var(--ts,1));color:#f3ecd2;text-shadow:0 2px 8px rgba(0,0,0,.4)}
.wol-learn .wl-hgh .wl-ic{width:1.15em;height:1.15em;color:#f6cf72}
.wol-learn .wl-hgrid{flex:1;min-height:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:minmax(0,1fr);gap:.7em}
.wol-learn .wl-hgrid.n5>.wl-gt:last-child{grid-column:span 2}
.wol-learn .wl-gt{position:relative;container-type:size;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.4em;min-height:0;min-width:0;padding:.5em .45em;border-radius:1.1em;overflow:hidden;text-align:center;color:#1f2c1a;
  background:radial-gradient(circle at 50% 28%,color-mix(in srgb,var(--tc) 34%,transparent),transparent 62%),linear-gradient(180deg,#fbf6e5,#e8ddbd);border:1px solid var(--edge);
  box-shadow:0 .28em 0 color-mix(in srgb,var(--tc) 60%,#5a4a26),0 8px 18px rgba(0,0,0,.28);transition:transform .15s,box-shadow .15s}
.wol-learn .wl-gt:hover:not(.is-veiled),.wol-learn .wl-gt:focus-visible{transform:translateY(-3px) rotate(-.6deg);box-shadow:0 .28em 0 color-mix(in srgb,var(--tc) 60%,#5a4a26),0 14px 26px rgba(0,0,0,.38)}
.wol-learn .wl-gt .wl-tic{font-size:min(3.4em,30cqh,28cqw);border-radius:.32em}
.wol-learn .wl-gt b{font-family:var(--serif);font-weight:700;font-size:calc(clamp(1.06em,8cqw,1.5em) * var(--ts,1));line-height:1.12;max-width:100%}
/* a part that is not open yet: dimmed, a soft curtain of stripes, and what opens it (no padlock: it reads as a cross) */
.wol-learn .is-veiled{cursor:help}
.wol-learn .is-veiled>:not(.wl-veil){filter:grayscale(.75) brightness(.86);opacity:.55}
.wol-learn .is-veiled::after{content:"";position:absolute;inset:0;z-index:3;pointer-events:none;background:repeating-linear-gradient(90deg,rgba(60,48,30,.12) 0 .55em,rgba(255,255,255,.05) .55em 1.3em)}
.wol-learn .wl-veil{position:absolute;inset:auto 0 0 0;z-index:4;display:flex;align-items:center;justify-content:center;gap:.4em;padding:.9em .6em .5em;
  background:linear-gradient(180deg,rgba(28,40,26,0),rgba(28,40,26,.85) 40%);color:#f6eed0;font-weight:800;font-size:calc(.84em * var(--ts,1));line-height:1.2;text-align:center;text-shadow:0 1px 3px rgba(0,0,0,.5)}
.wol-learn .wl-veil .wl-ic{width:1.35em;height:1.35em;color:#f6cf72}
/* a small game tile keeps its name readable: the words of what opens it sit under the name as a dark pill */
.wol-learn .wl-gt.is-veiled{gap:.25em}
.wol-learn .wl-gt.is-veiled>b{opacity:.78;filter:none}
.wol-learn .wl-gt.is-veiled .wl-tic{font-size:min(2.6em,22cqh,24cqw)}
.wol-learn .wl-gt .wl-veil{position:relative;inset:auto;max-width:100%;padding:.22em .6em;border-radius:.8em;gap:.3em;background:rgba(28,40,26,.82);font-size:calc(.76em * var(--ts,1));box-shadow:0 2px 6px rgba(0,0,0,.25)}
.wol-learn .wl-gt .wl-veil .wl-ic{width:1.15em;height:1.15em;flex:none}
@media (max-height:540px){.wol-learn .wl-screen.wl-home{gap:.75em;padding:.1em .9em .75em}.wol-learn .wl-hside{gap:.6em}.wol-learn .wl-hgrid{gap:.5em}.wol-learn .wl-hab{padding:.25em 1.1em .7em}
  .wol-learn .wl-hh.big{font-size:calc(1.55em * var(--ts,1))}.wol-learn .wl-hh{font-size:calc(1.25em * var(--ts,1))}.wol-learn .wl-hgh{font-size:calc(1.08em * var(--ts,1))}.wol-learn .wl-gt b{font-size:calc(.98em * var(--ts,1))}}
@container (max-height:6.6em){.wol-learn .wl-hq .wl-htx small{display:none}}
@container (max-height:7.4em){.wol-learn .wl-hf .wl-htx small:not(.wl-hn){display:none}}
@container (max-width:6.4em){.wol-learn .wl-gt .wl-veil span{display:none}}
/* the frames screen (its own screen since 1.3.2; the badges screen links to it) */
.wol-learn .wl-framesx{gap:.9em;padding:0 1.6em 1.2em;overflow-y:auto;overflow-x:hidden;min-height:0;scrollbar-width:thin}
.wol-learn .wl-framesx .wl-frames{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:.4em 1.6em;margin:auto}
.wol-learn .wl-fprev{grid-row:1 / 4;align-self:center;display:grid;place-items:center;padding:.6em 1em}
.wol-learn .wl-fprev .wl-card{--cw:9em;transform:rotate(-3deg)}
.wol-learn .wl-framesx .wl-frames h3{font-size:calc(1.5em * var(--ts,1))}
.wol-learn .wl-framesx .wl-frames p{margin:0;font-size:calc(1em * var(--ts,1))}
.wol-learn .wl-framesx .wl-frow{grid-column:2}
.wol-learn .wl-frame b{font-size:calc(.95em * var(--ts,1))}
@media (max-height:620px){.wol-learn .wl-fprev .wl-card{--cw:7em}.wol-learn .wl-framesx .wl-frame{width:7.4em;padding:.4em}.wol-learn .wl-framesx .wl-fsw{width:2.8em;height:3.6em}.wol-learn .wl-framesx .wl-frow{gap:.5em}}
@media (max-width:860px){.wol-learn .wl-framesx .wl-frames{grid-template-columns:1fr}.wol-learn .wl-fprev{display:none}.wol-learn .wl-framesx .wl-frow{grid-column:1}}
.wol-learn .wl-bhead .wl-btn{min-height:2.4em;padding:.25em 1em;font-size:.95em}
.wol-learn .wl-bhead .wl-btn .ic{width:1.2em;height:1.2em}
.wol-learn .wl-bhead .wl-btn.is-veiled{opacity:.6;filter:grayscale(.6)}
.wol-learn .wl-bhead .wl-btn.is-veiled::after{display:none}
`;
// רובו־דע speaks over the hub (his layer sits under it otherwise: #rguide 70, the hub 80)
const GUIDE_OVER_HUB = '\n#ui.wl-hubopen #rguide{z-index:90}\n';

let cssInjected = false;
export function injectCss() {
  if (cssInjected || typeof document === 'undefined') return;
  cssInjected = true;
  const st = document.createElement('style');
  st.id = 'wol-learn-css';
  // raise specificity above the game's "#ui.wol button" resets
  st.textContent = (CSS + ICON_CSS + HOME_CSS).replace(/\.wol-learn/g, '#wol-learn.wol-learn') + GUIDE_OVER_HUB;
  document.head.appendChild(st);
}
