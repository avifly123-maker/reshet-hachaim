# Closing 1.4.2: the full list (31.10 night, Avi: "close everything tonight, all animals, voice and recordings")

Work top to bottom, one item at a time; tick here and commit after each. `node tools/validate-zones.mjs savanna`
prints what the zone still lacks (31 items on 1.11 02:30); remove `wip` from `src/data/zones.js` when it prints nothing.

## A. Animals (Blender, Avi's PC; method in tools/blender/refs/README.md, overlay before every run)
- [x] giraffe, zebra, elephant, lion, wildebeest, impala, crocodile, weaver: Blender models in the game
- [ ] weaver: check the 1.11 run (yellow crown, wider tail, shorter legs: pv\rd_weaver_*.jpg, out\weaver.json)
- [ ] lion face round 2 (pale area smaller, ears out of the mane); wildebeest coat (dark bands, beard, black face)
- [ ] rounds 2–5 for all (legs and hooves/paws, coat, ears/tail, motion in the game: walk/eat/sleep clips)
- [ ] new species (decided with Avi): buffalo (no side photo yet: search again), hyena (refs cand4 h0), baboon (cand4 p3);
      each needs data in src/data/savanna.js (name, facts with sources, layer, diet, links), GENDER, cards, painting
- [ ] herds in instanced crowds use the real models (herd-crowd.js draws simple shapes now); consider @three.ez/instanced-mesh

## B. Registry entries (small code, each listed by validate-zones)
place.js words; hub BIOMES (learn/hub/base.js); quiz BANK_TAG; album SET_WHERE; BGROUP_IC; icons-hub zone icon+tile;
after.js DECOR_N; photos.js captions; rank.js ranks; lab questions zone tab; cabinet colour; clue-cases words;
kids-text words; sort-data words; audio.js sound bed; kids.js beginners set; badges.js group; guide/zone.js 'zone:savanna'
lines (voiced); keep-forest board; island-art (tools/render-island.py on Avi's PC).

## C. Content
- [ ] cards: 19 paintings (Gemini in Avi's Chrome, CLAUDE.md "Card paintings") + 3 new species
- [ ] album sets ≥ 2; quiz 110 (src/data/quiz-bank-savanna.js, 45 per level, validate-quiz)
- [ ] 3 mysteries (one per level; validate-research --all must pass), microscope samples 2, atlas questions 4,
      clue cases 6, observe finds 2, sort pool 6, inventors problems 3 (real, with sources), threads 1
- [ ] torah: 3 source cards, a source set, mission st1 (quotes checked on Sefaria)
- [ ] missions: more animals, fewer trees (planting cost); predation gentle (lion, hyena, crocodile)
- [ ] devices of the savanna (PLAN-1.4.2)

## D. Tutorial and voice
- [ ] first-visit tutorial of the savanna (runGuided, like desert-tutorial.js, + tests/play script in check-all)
- [ ] voice: all new guide lines with tools/voice/make.py (shaul.onnx from Avi's PC); Kubi's 24 remaining re-recorded
      lines (voice\kubi_redo31.json, out_kubi3 has ki_1,2,4, kc_1) with Chatterbox when the PC's memory is free,
      checked with the recognizer, packed by tools/voice/build-kubi-voice.py

## E. Close
- [ ] check-all, old saves, regression shots; CHANGELOG 1.4.2; build with tools/pack-1.4.sh into Avi's private folders
