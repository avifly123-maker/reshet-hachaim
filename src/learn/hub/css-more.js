// מרכז הלמידה – the hub's CSS, second half: badges, frames, settings, duel, modal, effects, keyframes, colours,
// album sets, zoom and legend.
// Exports: CSS_MORE (one string; styles.js joins it after CSS_MAIN). Needs BADGE_CSS (ui/badge-art.js), FRAME_CSS.
import { BADGE_CSS } from '../../ui/badge-art.js';
import { FRAME_CSS } from './card-html.js';

export const CSS_MORE = `
/* badges (תגים) */
${BADGE_CSS}
.wol-learn .wl-badges{gap:1em;padding:0 1.6em 1.6em;overflow-y:auto;overflow-x:hidden;min-height:0;scrollbar-width:thin}
.wol-learn .wl-bhead{display:flex;align-items:center;justify-content:space-between;padding:.7em 1.2em;border-radius:1em;width:min(60em,100%);margin:0 auto}
.wol-learn .wl-bhead b{font-family:var(--serif);font-size:calc(1.5em * var(--tsd,1))}
.wol-learn .wl-bgroup{width:min(60em,100%);margin:0 auto;padding:.8em 1em 1em;border-radius:1em;background:linear-gradient(180deg,color-mix(in srgb,var(--bg1) 35%,transparent),rgba(0,0,0,.18));box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}
.wol-learn .wl-bgroup h3{display:flex;align-items:center;justify-content:space-between;margin:0 0 .6em;color:#f6edcf;font-family:var(--serif)}
.wol-learn .wl-bgroup h3 small{color:var(--bg2);font-family:inherit;font-weight:800}
.wol-learn .wl-bgrid{display:flex;flex-wrap:wrap;gap:1em .6em}
.wol-learn .wl-frames{width:min(60em,100%);margin:0 auto;padding:1em 1.2em;border-radius:1em}
.wol-learn .wl-frames h3{margin:0;font-family:var(--serif)}.wol-learn .wl-frames p{margin:.2em 0 .8em;color:#5a4a30}
.wol-learn .wl-frow{display:flex;flex-wrap:wrap;gap:.7em}
.wol-learn .wl-frame{display:flex;flex-direction:column;align-items:center;gap:.25em;width:8.4em;padding:.6em;border-radius:.8em;background:rgba(0,0,0,.06);color:#3a2a10;text-align:center}
.wol-learn .wl-frame:disabled{opacity:.45;cursor:default}
.wol-learn .wl-frame.sel{background:#fff4cf;box-shadow:0 0 0 .2em #e2b247}
.wol-learn .wl-frame small{color:#6a5a40;font-size:.78em}
.wol-learn .wl-fsw{width:3.4em;height:4.4em;border-radius:.4em;background:#f3ead0}
/* the frames on the album cards (and their swatches) */
.wol-learn .fr-leaf.wl-card,.wol-learn .wl-frame.fr-leaf .wl-fsw{box-shadow:0 0 0 .22em #3f8a4a,0 0 0 .42em #a8d878,0 .5em 1em rgba(0,0,0,.35)}
.wol-learn .fr-oak.wl-card,.wol-learn .wl-frame.fr-oak .wl-fsw{box-shadow:0 0 0 .22em #7a5530,0 0 0 .42em #d6b07a,0 .5em 1em rgba(0,0,0,.35)}
.wol-learn .fr-coral.wl-card,.wol-learn .wl-frame.fr-coral .wl-fsw{box-shadow:0 0 0 .22em #e0705a,0 0 0 .42em #6fd0d8,0 .5em 1em rgba(0,0,0,.35)}
.wol-learn .fr-brass.wl-card,.wol-learn .wl-frame.fr-brass .wl-fsw{box-shadow:0 0 0 .22em #b88a2a,0 0 0 .3em #6b4a12,0 0 0 .48em #e8c870,0 .5em 1em rgba(0,0,0,.35)}
.wol-learn .fr-deep.wl-card,.wol-learn .wl-frame.fr-deep .wl-fsw{box-shadow:0 0 0 .22em #163a5a,0 0 0 .42em #6fd0ff,0 0 1.1em rgba(111,208,255,.55)}
.wol-learn .fr-gold.wl-card,.wol-learn .wl-frame.fr-gold .wl-fsw{box-shadow:0 0 0 .2em #fff2b0,0 0 0 .44em #d8a640,0 0 0 .52em #8a6214,0 0 1.4em rgba(246,207,114,.6)}
.wol-learn .fr-silver.wl-card,.wol-learn .wl-frame.fr-silver .wl-fsw{box-shadow:0 0 0 .18em #f4f6f8,0 0 0 .38em #a9b4bf,0 0 0 .48em #5f6b77,0 0 1.1em rgba(210,225,240,.55)}
.wol-learn .fr-sources.wl-card,.wol-learn .wl-frame.fr-sources .wl-fsw{box-shadow:0 0 0 .2em #f3e2b8,0 0 0 .32em #8a5a22,0 0 0 .46em #c99a52,0 0 0 .52em #5a3a12,0 .5em 1em rgba(0,0,0,.35)}
${FRAME_CSS}
/* the settings gear (torah edition) and its window */
.wol-learn .wl-gear{display:grid;place-items:center;width:2.6em;height:2.6em;border-radius:50%;background:rgba(246,240,220,.12);border:1px solid rgba(246,240,220,.22);color:#f3ecd2;transition:background .2s}
.wol-learn .wl-gear:hover{background:rgba(246,240,220,.24)}
.wol-learn .wl-gear .ic{width:1.35em;height:1.35em}
.wol-learn .wl-settings{width:min(30em,90vw)}
.wol-learn .wl-settings h3{display:flex;align-items:center;gap:.35em}.wol-learn .wl-settings h3 .ic{width:.9em;height:.9em;color:#7a5a12}
.wol-learn .wl-settings .wl-srcsw{margin:0;background:rgba(255,255,255,.4);box-shadow:inset 0 0 0 1px rgba(120,90,40,.25)}
.wol-learn .wl-settings .wl-btn{align-self:center}
/* a badge you can point at: it grows and tells its name and how it is earned (the badges screen and the showcase) */
.wol-learn .wl-bz{position:relative;display:block;border-radius:1em;padding:.25em;z-index:1;-webkit-tap-highlight-color:transparent}
.wol-learn .wl-bz .bdg-med{transition:transform .28s cubic-bezier(.2,.9,.3,1.3),filter .28s}
.wol-learn .wl-bz .bdg-rib{transition:transform .28s}
.wol-learn .wl-bz:hover,.wol-learn .wl-bz:focus-visible{z-index:5}
.wol-learn .wl-bz:hover .bdg-med,.wol-learn .wl-bz:focus-visible .bdg-med{transform:scale(1.42) translateY(-.12em)}
.wol-learn .wl-bz:hover .bdg-rib,.wol-learn .wl-bz:focus-visible .bdg-rib{transform:translateY(1.2em) scale(1.08)}
.wol-learn .wl-btip{position:absolute;left:50%;top:calc(100% + .9em);transform:translate(-50%,-.3em);width:max-content;max-width:15em;padding:.45em .8em;border-radius:.8em;background:#2a2214;color:#fbf3d8;text-align:center;
  font-size:calc(.92em * var(--tsr,1));line-height:1.35;box-shadow:0 .5em 1.2em rgba(0,0,0,.45),inset 0 0 0 1px rgba(246,207,114,.35);opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;z-index:6}
.wol-learn .wl-btip b{display:block;color:#f6cf72;font-family:var(--serif)}
.wol-learn .wl-btip small{display:block;color:#e6dcbc}
.wol-learn .wl-bz:hover .wl-btip,.wol-learn .wl-bz:focus-visible .wl-btip{opacity:1;transform:translate(-50%,0)}
@media (hover:none){.wol-learn .wl-btip{display:none}}   /* on a touch screen a tap opens the badge big instead */
.wol-learn .wl-bgrid{gap:1.2em .9em}
.wol-learn .wl-bgrid .bdg{--bs:7.6em}
.wol-learn .wl-bgroup{overflow:visible}
@media (max-height:520px){.wol-learn .wl-bgrid .bdg{--bs:6.6em}}
.wol-learn .wl-bzbig .bdg{--bs:min(15em,40vh);animation:wl-pop .45s cubic-bezier(.2,.9,.3,1.25) both}
.wol-learn .wl-bzbig .bdg-rib{font-size:calc(var(--bs) * .11)}
.wol-learn .wl-bzt small{color:#6a5a40;font-weight:700}
.wol-learn .wl-bzg{display:flex;align-items:center;gap:.4em;font-weight:800}
/* duel */
.wol-learn .wl-duel{padding:0 1.6em 1em;gap:.7em}
.wol-learn .wl-dhead{display:flex;align-items:center;gap:1.2em;padding:.55em 1.3em;border-radius:20px;width:min(60em,100%)}
.wol-learn .wl-score{display:flex;align-items:center;gap:.6em;font-weight:800;font-size:1.15em;color:#1f2c1a}
.wol-learn .wl-score b{font-size:1.6em;min-width:1em;text-align:center}
.wol-learn .wl-rounds{display:flex;gap:.3em}
.wol-learn .wl-rounds i{width:.9em;height:.9em;border-radius:50%;background:rgba(80,70,40,.2)}
.wol-learn .wl-rounds i.w{background:var(--leaf2)}.wol-learn .wl-rounds i.l{background:#c45a45}.wol-learn .wl-rounds i.t{background:#b9a774}.wol-learn .wl-rounds i.c{box-shadow:0 0 0 .18em var(--amber)}
.wol-learn .wl-dstat{margin-inline-start:auto;display:flex;align-items:center;gap:.5em;padding:.35em 1em;border-radius:99px;background:linear-gradient(180deg,#f8d98a,#e8a43a);color:#3a2608;font-weight:800;font-size:1.15em;animation:wl-bump .6s both}
.wol-learn .wl-dstat .wl-ic{width:1.4em;height:1.4em}
.wol-learn .wl-arena{position:relative;display:flex;align-items:center;justify-content:center;gap:3.4em;flex:1;min-height:0}
.wol-learn .wl-duel{gap:.45em}
.wol-learn .wl-slot{display:flex;flex-direction:column;align-items:center;gap:.4em}
.wol-learn .wl-slot>small{font-weight:800;color:#e2dcbd;font-size:1.05em}
.wol-learn .wl-slot .wl-flip,.wol-learn .wl-slot .wl-empty{--cw:min(14.5em,22.5vh)}
.wol-learn .wl-empty{font-size:calc(var(--cw) / 10);width:10em;height:14.2em;border-radius:.8em;border:3px dashed rgba(246,240,220,.3);display:grid;place-items:center;color:rgba(246,240,220,.5);font-weight:700;text-align:center;padding:1em;line-height:1.3}
.wol-learn .wl-vs{font-family:var(--serif);font-size:2.6em;font-weight:700;color:var(--amber);text-shadow:0 3px 14px rgba(0,0,0,.4)}
.wol-learn .wl-slot.win .wl-flip{filter:drop-shadow(0 0 1.2em rgba(143,208,103,.9))}
.wol-learn .wl-slot.win>small{color:var(--leaf)}
.wol-learn .wl-dbar{min-height:3.2em;display:flex;align-items:center;justify-content:center}
.wol-learn .wl-dmsg{white-space:nowrap;display:flex;align-items:center;gap:.8em;padding:.35em .45em .35em 1.3em;border-radius:99px;font-weight:800;font-size:calc(1.15em * var(--tsr,1));animation:wl-rise .35s both}
.wol-learn .wl-dhint{color:#e2dcbd;font-weight:700;font-size:calc(1.1em * var(--tsr,1));display:flex;align-items:center;gap:.4em}
.wol-learn .wl-hand{display:flex;gap:.9em;justify-content:center;flex-wrap:nowrap;padding:.3em .6em .5em;min-height:calc(min(10.5em,18vh) * 1.42 + .8em)}
.wol-learn .wl-hand .wl-card{--cw:min(10.5em,18vh,15.5vw);cursor:pointer}
@media (max-height:660px){.wol-learn .wl-dhelp{display:none}}
.wol-learn .wl-hand .wl-card:hover:not(.used){transform:translateY(-.6em) scale(1.08);z-index:2}
.wol-learn .wl-hand .wl-card.used{opacity:.3;filter:grayscale(1);cursor:default}
.wol-learn .wl-hand.locked .wl-card{pointer-events:none}
.wol-learn .wl-dhelp{color:#e2dcbd;font-size:calc(.95em * var(--tsr,1));text-align:center}
.wol-learn .wl-dhelp .wl-ic{width:1.1em;height:1.1em}
/* modal */
.wol-learn .wl-modal{position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;gap:2.4em;padding:2em;background:rgba(8,20,12,.72);backdrop-filter:blur(4px);animation:wl-in .25s both}
.wol-learn .wl-modal[hidden]{display:none}
.wol-learn .wl-modal .wl-card{--cw:min(19em,46vh);animation:wl-pop .45s cubic-bezier(.2,.9,.3,1.25) both}
.wol-learn .wl-mtext{width:min(26em,40vw);border-radius:20px;padding:1.3em 1.5em;display:flex;flex-direction:column;gap:.7em}
.wol-learn .wl-mtext h3{font-family:var(--serif);font-size:calc(2em * var(--tsd,1));line-height:1.05;color:#1f2c1a}
.wol-learn .wl-mtext p{font-family:var(--serif);font-size:calc(1.12em * var(--tsr,1));line-height:1.55;color:#2c3524}
.wol-learn .wl-mstats{display:flex;flex-direction:column;gap:.35em;font-size:.98em;color:var(--ink2)}
.wol-learn .wl-mstats span{display:flex;align-items:center;gap:.5em}
.wol-learn .wl-mrar{display:flex;align-items:center;gap:.6em;padding:.45em .8em;border-radius:12px;background:rgba(80,70,40,.08);font-size:1em;line-height:1.35;color:#2c3524}
.wol-learn .wl-mrar .wl-gems{flex:none;font-size:1.3em;cursor:default}
.wol-learn .wl-mrar.r-rare{background:rgba(240,180,76,.2)}.wol-learn .wl-mrar.r-epic{background:rgba(179,48,106,.12)}.wol-learn .wl-mrar.r-tech{background:rgba(44,95,143,.12)}
.wol-learn .wl-legbtn .wl-ic{color:#2f6a26}
.wol-learn .wl-lgcard{position:relative;flex:none}
.wol-learn .wl-lgpin{position:absolute;z-index:3;width:1.9em;height:1.9em;margin:-.95em 0 0 -.95em;border-radius:50%;display:grid;place-items:center;background:linear-gradient(180deg,#fff2c4,#f0b44c);color:#3a2608;font-weight:900;font-size:1em;box-shadow:0 0 0 .18em #1f2c1a,0 .2em .5em rgba(0,0,0,.4);animation:wl-pop .4s .35s both}
.wol-learn .wl-legend{width:min(31em,50vw);max-height:100%;overflow:auto;padding:1em 1.3em;gap:.5em}
.wol-learn .wl-legend h3{font-size:1.7em}
.wol-learn .wl-legend ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.4em}
.wol-learn .wl-legend li{display:flex;gap:.55em;align-items:flex-start}
.wol-learn .wl-lgn{flex:none;width:1.6em;height:1.6em;border-radius:50%;display:grid;place-items:center;background:#f0b44c;color:#3a2608;font-weight:900;font-size:.9em;margin-top:.1em}
.wol-learn .wl-legend li b{color:#1f2c1a}
.wol-learn .wl-legend li p{font-family:var(--sans);font-size:.92em;line-height:1.4;color:#2c3524;margin:0}
.wol-learn .wl-legend li p .wl-ic{width:1.1em;height:1.1em;vertical-align:-.15em}
.wol-learn .wl-legend li p .s-light,.wol-learn .wl-legend li p svg{color:inherit}
.wol-learn .wl-legend .wl-badge{display:inline-block;font-size:.8em;vertical-align:.1em}
.wol-learn .wl-lr{display:inline-flex;align-items:center;gap:.25em;margin-inline-end:.7em;white-space:nowrap;font-weight:700}
.wol-learn .wl-lgems{display:inline-flex}
.wol-learn .wl-lr .wl-gem .wl-ic{width:1em;height:1em}
.wol-learn .wl-lr.c .wl-gem.on{color:#3f8a33}.wol-learn .wl-lr.r .wl-gem.on{color:#d98e26}.wol-learn .wl-lr.e .wl-gem.on{color:#b3306a}.wol-learn .wl-lr.t .wl-gems{color:#2c5f8f;cursor:default}
.wol-learn .wl-legend>.wl-btn{align-self:center;margin-top:.2em}
.wol-learn .wl-pips{display:inline-flex;gap:.18em;margin-inline-start:auto}
.wol-learn .wl-pips i{width:.75em;height:.75em;border-radius:50%;background:rgba(80,70,40,.18)}
.wol-learn .wl-pips i.on{background:var(--amber2)}
/* fx */
.wol-learn .wl-fx{position:absolute;inset:0;pointer-events:none;z-index:30;overflow:hidden}
.wol-learn .wl-conf{position:absolute;width:.95em;height:.6em;border-radius:80% 0 80% 0;background:var(--c);transform:translate(-50%,-50%);animation:wl-conf 1.25s cubic-bezier(.15,.7,.4,1) both}
.wol-learn .wl-toast{position:absolute;top:5em;left:50%;z-index:40;transform:translate(-50%,-1em);opacity:0;display:flex;align-items:center;gap:.5em;padding:.6em 1.3em;border-radius:99px;background:linear-gradient(180deg,#f8d98a,#e8a43a);color:#3a2608;font-weight:800;box-shadow:0 8px 24px rgba(0,0,0,.35);transition:opacity .3s,transform .3s;pointer-events:none}
.wol-learn .wl-toast.on{opacity:1;transform:translate(-50%,0)}
/* keyframes */
@keyframes wl-in{from{opacity:0}to{opacity:1}}
@keyframes wl-rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes wl-pop{0%{opacity:0;transform:scale(.6)}100%{opacity:1;transform:scale(1)}}
@keyframes wl-flipin{0%{opacity:0;transform:rotateY(-80deg) scale(.92)}60%{opacity:1}100%{opacity:1;transform:none}}
@keyframes wl-glow{0%{box-shadow:0 4px 0 #3f8a33,0 0 0 0 rgba(143,208,103,.9)}40%{box-shadow:0 4px 0 #3f8a33,0 0 0 .5em rgba(143,208,103,.55),0 0 2.2em rgba(143,208,103,.9)}100%{box-shadow:0 4px 0 #3f8a33,0 0 0 .3em rgba(143,208,103,.5),0 0 1.2em rgba(143,208,103,.5)}}
@keyframes wl-shake{0%,100%{transform:none}20%{transform:translateX(-7px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(2px)}}
@keyframes wl-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.15);opacity:.8}}
@keyframes wl-bump{0%{transform:scale(1)}35%{transform:scale(1.22)}100%{transform:scale(1)}}
@keyframes wl-bob{0%,100%{transform:translateY(0) rotate(-8deg)}50%{transform:translateY(-.4em) rotate(6deg)}}
@keyframes wl-float{0%,100%{transform:translateY(0) rotate(-1.5deg)}50%{transform:translateY(-.6em) rotate(1.5deg)}}
@keyframes wl-pshake{0%,100%{transform:none}10%{transform:rotate(-5deg) scale(1.02)}20%{transform:rotate(5deg)}30%{transform:rotate(-7deg) scale(1.04)}40%{transform:rotate(7deg)}50%{transform:rotate(-9deg) scale(1.06)}60%{transform:rotate(9deg)}70%{transform:rotate(-10deg) scale(1.08)}80%{transform:rotate(10deg) scale(1.1)}90%{transform:rotate(-4deg) scale(1.12)}}
@keyframes wl-pburst{to{transform:scale(1.5);opacity:0}}
@keyframes wl-phit{0%{transform:none}30%{transform:scale(.94,1.05) rotate(-3deg)}65%{transform:scale(1.04,.97) rotate(2deg)}100%{transform:none}}
@keyframes wl-phit2{0%{transform:none}20%{transform:scale(.92,1.07) rotate(4deg)}45%{transform:scale(1.06,.95) rotate(-4deg)}70%{transform:rotate(2deg)}100%{transform:none}}
@keyframes wl-spin{to{rotate:360deg}}
@keyframes wl-fadein{from{opacity:0}to{opacity:1}}
@keyframes wl-hint{0%,100%{filter:brightness(1)}50%{filter:brightness(1.18)}}
@keyframes wl-tease{0%,100%{transform:rotate(0) scale(1.03)}25%{transform:rotate(-2.5deg) scale(1.06)}75%{transform:rotate(2.5deg) scale(1.06)}}
@keyframes wl-burst{0%{opacity:0;transform:scale(.3)}25%{opacity:1}100%{opacity:0;transform:scale(1.25)}}
@keyframes wl-burst2{0%{opacity:0;transform:scale(.3)}20%{opacity:1}70%{opacity:.85}100%{opacity:.35;transform:scale(1.1)}}
@keyframes wl-stamp{0%{opacity:0;transform:rotate(-10deg) scale(2.2)}100%{opacity:1;transform:rotate(-10deg) scale(1)}}
@keyframes wl-say{0%{opacity:0;transform:translateX(-50%) translateY(.6em) scale(.5)}100%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
@keyframes wl-flash{0%{opacity:0;transform:scale(.3)}30%{opacity:1}100%{opacity:0;transform:scale(1.4)}}
@keyframes wl-star{0%{opacity:0;transform:scale(.2) rotate(-40deg)}100%{opacity:1;transform:none}}
@keyframes wl-sheen{0%{background-position:150% 0}100%{background-position:-100% 0}}
@keyframes wl-conf{0%{opacity:0;transform:translate(-50%,-50%) scale(.4) rotate(0)}15%{opacity:1}100%{opacity:0;transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) rotate(var(--r)) scale(1)}}
@media (prefers-reduced-motion:reduce){.wol-learn,.wol-learn *,.wol-learn *::before,.wol-learn *::after{animation-duration:.01ms!important;animation-delay:0s!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
/* round 2: gentle colour – each corner of the learning centre has its own soft nature hue */
.wol-learn{--sky2:#8cc3dc;--rose:#e79aab;--lav:#b9a8e0;--sun:#f2cf5b;--clay:#e0a070;--teal:#4fa39a}
.wol-learn .wl-tile{border-radius:22px}
.wol-learn .wl-tile.quiz{--paper:#dfe8e8}
.wol-learn .wl-tile.quiz .wl-tart{background:radial-gradient(circle at 50% 60%,rgba(140,195,220,.55),transparent 62%),linear-gradient(180deg,#d9eaf1,#b9d7e6)}
.wol-learn .wl-tile.quiz .wl-tbody h2{color:#1f5670}
.wol-learn .wl-tile.album{--paper:#ece4c6}
.wol-learn .wl-tile.album .wl-tart{background:radial-gradient(circle at 50% 60%,rgba(242,207,91,.55),transparent 62%),linear-gradient(180deg,#f4e6b8,#e9d08f)}
.wol-learn .wl-tile.album .wl-tbody h2{color:#6b4e0c}
.wol-learn .wl-tile[data-g="webpuzzle"]{--paper:#ece0e0}
.wol-learn .wl-tile[data-g="webpuzzle"] .wl-tart{background:radial-gradient(circle at 50% 60%,rgba(231,154,171,.5),transparent 62%),linear-gradient(180deg,#f3e0e3,#e6c6cd)}
.wol-learn .wl-tile[data-g="webpuzzle"] .wl-tbody h2{color:#8a3a50}
.wol-learn .wl-tile[data-g="keepforest"]{--paper:#dfe6d2}
.wol-learn .wl-tile[data-g="keepforest"] .wl-tart{background:radial-gradient(circle at 50% 60%,rgba(79,163,154,.42),transparent 62%),linear-gradient(180deg,#d7e9dc,#b6d6c2)}
.wol-learn .wl-tile[data-g="keepforest"] .wl-tbody h2{color:#1f5f58}
.wol-learn .wl-tile .wl-tbody{border-top:3px solid rgba(0,0,0,.06)}
.wol-learn .wl-tile.quiz .wl-tbody{border-top-color:var(--sky2)}.wol-learn .wl-tile.album .wl-tbody{border-top-color:var(--sun)}
.wol-learn .wl-tile[data-g="webpuzzle"] .wl-tbody{border-top-color:var(--rose)}.wol-learn .wl-tile[data-g="keepforest"] .wl-tbody{border-top-color:var(--teal)}
.wol-learn .wl-meter i{background:linear-gradient(90deg,#c8941a,var(--sun))}
/* quiz: answers take turns through four pale tints (the right / wrong colours still win) */
.wol-learn .wl-opt:not(.ok):not(.no):nth-child(4n+1){background:#e6f0f4;border-color:#9cc2d4;box-shadow:0 4px 0 #9cc2d4}
.wol-learn .wl-opt:not(.ok):not(.no):nth-child(4n+2){background:#f6efd4;border-color:#d8c17a;box-shadow:0 4px 0 #d8c17a}
.wol-learn .wl-opt:not(.ok):not(.no):nth-child(4n+3){background:#f4e5e8;border-color:#d8a9b4;box-shadow:0 4px 0 #d8a9b4}
.wol-learn .wl-opt:not(.ok):not(.no):nth-child(4n+4){background:#ebe6f3;border-color:#b7aad6;box-shadow:0 4px 0 #b7aad6}
.wol-learn .wl-qtag{color:#5b4a8f;background:rgba(185,168,224,.25)}
.wol-learn .wl-qart{box-shadow:inset 0 0 0 2px rgba(140,195,220,.45)}
/* quiz setup: the round icons cycle through the hues */
.wol-learn .wl-choices .wl-choice:nth-child(4n+1) .wl-cic{background:rgba(140,195,220,.3);color:#1f5670}
.wol-learn .wl-choices .wl-choice:nth-child(4n+2) .wl-cic{background:rgba(242,207,91,.32);color:#6b4e0c}
.wol-learn .wl-choices .wl-choice:nth-child(4n+3) .wl-cic{background:rgba(231,154,171,.3);color:#8a3a50}
.wol-learn .wl-choices .wl-choice:nth-child(4n+4) .wl-cic{background:rgba(185,168,224,.32);color:#5b4a8f}
/* album filter tabs: amazon teal, grove ochre, technology sky */
.wol-learn .wl-tabs .wl-tab:nth-child(2).sel{background:#d7ebe4;color:#1f5f58}
.wol-learn .wl-tabs .wl-tab:nth-child(3).sel{background:#f1e2c2;color:#7a4f12}
.wol-learn .wl-tabs .wl-tab:nth-child(4).sel{background:#dbeaf0;color:#1f5670}
.wol-learn .wl-sub{border-right-color:var(--sun);background:rgba(242,207,91,.16)}
/* album sets ("סדרות") */
.wol-learn .wl-setlayer{position:absolute;inset:0;z-index:6;display:flex;flex-direction:column;align-items:stretch}
.wol-learn .wl-setlayer[hidden]{display:none}
.wol-learn .wl-setveil{position:absolute;inset:0;border-radius:18px;background:rgba(8,20,12,.55);backdrop-filter:blur(2px);animation:wl-fadein .2s both}
.wol-learn .wl-sets{position:relative;display:flex;flex-direction:column;gap:.6em;min-width:0;max-height:calc(100% - 1em);overflow-y:auto;padding:.7em .9em .9em;border-radius:18px;animation:wl-rise .25s both;scrollbar-width:thin}
.wol-learn .wl-setsh{display:flex;align-items:center;gap:.7em;padding:0 .2em;line-height:1.15;color:#1f2c1a;flex-wrap:wrap}
.wol-learn .wl-setsh b{font-family:var(--serif);font-size:1.4em}
.wol-learn .wl-setsh small{display:flex;align-items:center;gap:.3em;font-size:.95em;font-weight:700;color:var(--ink2)}
.wol-learn .wl-setsh small .wl-ic{width:1.2em;height:1.2em;color:#b96f12}
.wol-learn .wl-setsn{font-weight:700;color:var(--ink2);white-space:nowrap}
.wol-learn .wl-setsh .wl-btn{min-height:2.3em;padding:.2em 1em;font-size:.95em}
.wol-learn .wl-setrow{min-width:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(12.5em,1fr));gap:.55em;padding:.2em .2em .35em}
.wol-learn .wl-set{--sc:#5f9a3e;flex:1 0 auto;display:flex;align-items:center;gap:.4em;padding:.24em .35em .24em .6em;border-radius:16px;background:#f3ecd6;color:var(--ink);text-align:right;
  box-shadow:0 3px 0 rgba(60,50,25,.35),0 6px 14px rgba(0,0,0,.2);transition:transform .15s,box-shadow .2s}
.wol-learn .wl-set:hover{transform:translateY(-2px)}
.wol-learn .wl-set.sel{box-shadow:0 0 0 .2em var(--sc),0 3px 0 rgba(60,50,25,.35),0 8px 18px rgba(0,0,0,.3);transform:translateY(-2px)}
.wol-learn .wl-seti{flex:none;width:1.85em;height:1.85em;border-radius:50%;display:grid;place-items:center;background:var(--sc);color:#fff;box-shadow:inset 0 -.15em 0 rgba(0,0,0,.18)}
.wol-learn .wl-seti .wl-ic{width:1.2em;height:1.2em}
.wol-learn .wl-setb{display:flex;flex-direction:column;gap:.2em;align-items:flex-start}
.wol-learn .wl-setb b{font-size:.9em;line-height:1.05;white-space:nowrap;color:#1f2c1a}
.wol-learn .wl-setd{display:flex;align-items:center;gap:.15em}
.wol-learn .wl-setd i{width:.5em;height:.5em;border-radius:.16em;background:rgba(80,70,40,.17)}
.wol-learn .wl-setd i.r{transform:rotate(45deg) scale(.88)}
.wol-learn .wl-setd i.on{background:var(--sc)}
.wol-learn .wl-setn{flex:none;margin-inline-start:.3em;font-weight:900;font-size:.74em;line-height:1;color:#4a5640;direction:ltr}
.wol-learn .wl-set.done{background:linear-gradient(180deg,#fff6d6,#f3d88e)}
.wol-learn .wl-set.done .wl-setn{width:1.45em;height:1.45em;border-radius:50%;display:grid;place-items:center;background:var(--sc);color:#fff}
.wol-learn .wl-set.done .wl-setn .wl-ic{width:1em;height:1em}
.wol-learn .wl-set.justdone{animation:wl-bump .7s 3}
.wol-learn .wl-set{padding:.4em .5em .4em .7em;gap:.55em;background:#f6f0dc;box-shadow:0 2px 0 rgba(60,50,25,.3),0 4px 10px rgba(0,0,0,.15)}
.wol-learn .wl-set .wl-seti{width:2.2em;height:2.2em}
.wol-learn .wl-set .wl-setb b{font-size:1em}
.wol-learn .wl-setinfo{--sc:#5f9a3e;flex:none;display:flex;align-items:center;gap:.8em;padding:.45em .8em .45em 1em;border-radius:18px;border-right:.45em solid var(--sc);animation:wl-rise .3s both}
.wol-learn .wl-setinfo .wl-seti{width:2.7em;height:2.7em}
.wol-learn .wl-setinfo .wl-seti .wl-ic{width:1.5em;height:1.5em}
.wol-learn .wl-sett{flex:1;min-width:0}
.wol-learn .wl-sett b{font-family:var(--serif);font-size:1.4em;line-height:1.05;color:#1f2c1a}
.wol-learn .wl-setw{display:inline-block;margin-inline-start:.5em;padding:.05em .6em;border-radius:99px;background:rgba(80,70,40,.1);font-size:.8em;font-weight:800;color:var(--ink2);vertical-align:.2em}
.wol-learn .wl-sett p{font-size:.95em;color:var(--ink2)}
.wol-learn .wl-setp{flex:none;font-weight:700;color:var(--ink2);white-space:nowrap}
.wol-learn .wl-setp b{font-size:1.35em;color:#1f2c1a}
.wol-learn .wl-setr{flex:none;display:flex;align-items:center;gap:.35em;padding:.3em .85em;border-radius:99px;background:rgba(240,180,76,.24);font-weight:800;color:#5a3b10;white-space:nowrap}
.wol-learn .wl-setr .wl-ic{color:#b96f12}
.wol-learn .wl-setinfo.done .wl-setr{background:linear-gradient(180deg,#fff2c4,#f8d98a);box-shadow:0 0 .8em rgba(240,180,76,.5)}
.wol-learn .wl-setinfo .wl-btn{min-height:2.4em;padding:.25em 1em;font-size:.95em}
@media (max-height:660px){.wol-learn .wl-setinfo{padding:.25em .6em .25em .7em;gap:.6em}.wol-learn .wl-setinfo .wl-seti{width:2em;height:2em}.wol-learn .wl-sett b{font-size:1.15em}.wol-learn .wl-sett p{display:none}.wol-learn .wl-album{gap:.45em}.wol-learn .wl-abody{gap:.45em}.wol-learn .wl-gsec b{font-size:1.15em}}
@media (max-height:520px){.wol-learn .wl-packs{gap:.5em;padding-bottom:.5em}.wol-learn .wl-ptitle{font-size:1.7em}.wol-learn .wl-packs .wl-stage{font-size:.78em;margin-top:.9em}}
/* the album bar stays one row: labels give way to icons as the screen narrows */
@media (max-width:1500px){.wol-learn .wl-legbtn .wl-bl{display:none}.wol-learn .wl-abar .wl-legbtn{padding:.2em .6em}}
@media (max-width:1180px){.wol-learn .wl-abar .wl-dlab{display:none}.wol-learn .wl-abar .wl-duelbtn{padding:.2em .7em}.wol-learn .wl-count .wl-cw{display:none}.wol-learn .wl-tab{padding:.3em .65em}.wol-learn .wl-abar{gap:.45em}}
@media (max-width:780px){.wol-learn .wl-packbtn .wl-bl{display:none}.wol-learn .wl-abar .wl-packbtn{padding:.2em .7em}}
@media (max-width:960px){.wol-learn .wl-setsbtn .wl-setsc{display:none}.wol-learn .wl-album{padding:0 1em}.wol-learn .wl-sett p,.wol-learn .wl-setw{display:none}.wol-learn .wl-setr{padding:.25em .6em;font-size:.9em}}
@media (max-width:860px){.wol-learn .wl-tab{padding:.3em .5em}.wol-learn .wl-abar{gap:.35em;padding:.3em .45em}.wol-learn .wl-abar .wl-btn{padding:.2em .6em}.wol-learn .wl-setsh small{display:none}.wol-learn .wl-setp{display:none}}
/* fitBar(): the steps the bar takes when the tabs do not fit (t1 → t2 → t3 → wrap, each keeps the ones before) */
.wol-learn .wl-abar.t1 .wl-tab .ic{display:none}
.wol-learn .wl-abar.t2 .wl-bl,.wol-learn .wl-abar.t2 .wl-dlab,.wol-learn .wl-abar.t2 .wl-setsc,.wol-learn .wl-abar.t2 .wl-cw{display:none}
.wol-learn .wl-abar.t2 .wl-btn{padding:.2em .6em}
.wol-learn .wl-abar.t3{gap:.3em}.wol-learn .wl-abar.t3 .wl-tab{padding:.3em .45em;font-size:.93em}
.wol-learn .wl-abar.wrap{flex-wrap:wrap;row-gap:.3em}
.wol-learn .wl-abar.wrap .wl-tabs{order:9;flex:1 1 100%;justify-content:center}
.wol-learn .wl-abar.wrap .wl-tab{padding:.25em .7em;font-size:1em}
/* the source-card sets in the sets panel, and the small set headings on the "מן המקורות" page */
.wol-learn .wl-setsub{grid-column:1/-1;display:flex;align-items:center;gap:.45em;margin-top:.35em;padding:.15em .2em 0;color:#5a3b10;border-top:1px dashed rgba(120,90,40,.35)}
.wol-learn .wl-setsub .wl-ic{width:1.4em;height:1.4em;color:#b8892e}
.wol-learn .wl-setsub b{font-family:var(--serif);font-size:1.2em}
.wol-learn .wl-setsub small{font-weight:700;color:var(--ink2)}
.wol-learn .wl-gsec.sub{margin-top:.2em}
.wol-learn .wl-gsec.sub b{font-size:1.05em;padding:.05em .7em}
.wol-learn .wl-gsec.sub .wl-gsub{font-weight:600;font-size:.92em}
@media (max-width:900px){.wol-learn .wl-gsec.sub .wl-gsub{display:none}}
.wol-learn .wl-toast.set{gap:.7em;padding:.55em 1.6em .55em 1.1em;font-size:1.12em;line-height:1.25;box-shadow:0 0 0 .2em #fff6dc,0 0 2em rgba(246,207,114,.8),0 8px 24px rgba(0,0,0,.35)}
.wol-learn .wl-toast.set .wl-seti{width:2.4em;height:2.4em}.wol-learn .wl-toast.set .wl-seti .wl-ic{width:1.4em;height:1.4em}
.wol-learn .wl-toast.set b{display:block;font-family:var(--serif);font-size:1.15em}
.wol-learn .wl-toast.set small{display:flex;align-items:center;gap:.3em;font-size:.88em}
/* zoom: game power + sets of the card */
.wol-learn .wl-mtext{max-height:100%;overflow:auto}
.wol-learn .wl-mpow{display:flex;align-items:center;gap:.6em;padding:.45em .8em;border-radius:12px;font-size:.98em;line-height:1.38;color:#2c3524}
.wol-learn .wl-mpow.r-epic{background:linear-gradient(90deg,rgba(246,207,114,.38),rgba(231,154,171,.26))}
.wol-learn .wl-mpow.r-rare{background:rgba(240,180,76,.18)}
.wol-learn .wl-mpow b{color:#1f2c1a}
.wol-learn .wl-powi{flex:none;width:2.1em;height:2.1em;border-radius:50%;display:grid;place-items:center;font-weight:900;color:#5a1838;
  background:radial-gradient(circle at 38% 32%,#fff3c4,#f6cf72 45%,#e79aab 85%);box-shadow:0 0 0 .12em #fff6dc,0 0 .7em rgba(246,207,114,.8)}
.wol-learn .wl-mpow.r-rare .wl-powi{background:linear-gradient(180deg,#ffe9a8,#e8a43a);color:#4a2c06;direction:ltr;box-shadow:0 0 0 .12em #fff6dc}
.wol-learn .wl-powi .wl-ic{width:1.25em;height:1.25em}
.wol-learn .wl-msets{display:flex;flex-wrap:wrap;align-items:center;gap:.35em}
.wol-learn .wl-msets small{font-weight:800;color:var(--ink2);font-size:.92em}
.wol-learn .wl-mset{--sc:#5f9a3e;display:inline-flex;align-items:center;gap:.3em;padding:.15em .6em .15em .35em;border-radius:99px;background:#f8f2de;box-shadow:inset 0 0 0 2px var(--sc);font-weight:800;font-size:.9em;color:#1f2c1a}
.wol-learn .wl-mset .wl-ic{width:1.15em;height:1.15em;color:var(--sc)}
.wol-learn .wl-mset b{color:var(--ink2);font-size:.92em}
.wol-learn .wl-mset.done{background:linear-gradient(180deg,#fff6d6,#f3d88e)}
/* legend: the rarity-in-the-game note */
.wol-learn .wl-legend li.wl-lgx .wl-lgn{color:#5a1838;background:radial-gradient(circle at 38% 32%,#fff3c4,#f6cf72 45%,#e79aab 85%)}
.wol-learn .wl-legend li.wl-lgx .wl-lgn .wl-ic{width:1em;height:1em}
.wol-learn .wl-lp{display:block}
.wol-learn .wl-lp.e b{color:#8a2452}.wol-learn .wl-lp.r b{color:#9c6512}
`;
