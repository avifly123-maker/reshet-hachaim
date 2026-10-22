# Fixing the review findings (1.3.2) — rules for every fix agent

Owner (Avi): "careful and calm; nothing may break". Each fix is small and aimed; no rewrites, no new features.
1. One finding per commit (message: "Fix: <short> (review <area> #<n>)"). After each commit `node build.mjs` must pass.
2. Prove each fix: a headless script (tools/play.py) that showed the bug before and shows it gone after; keep them in your
   scratch folder and mention them in the report.
3. Do not change storage keys, events, ids or debug hooks. Old saves must load (check-old-saves).
4. Child-facing text: Hebrew, simple, plural address, correct gender, beginners' text fully vocalised, no em dashes,
   no cross shapes. A new guide line needs f and k and passes validate-guide (its voice is made later by the main session).
5. Before reporting: `bash tools/check-all.sh` ends "OK – all checks passed", and
   `python3 tools/regress.py dist/index.html shots/regress/after` compared with /home/claude/reshet-hachaim/shots/regress/base
   shows only the differences your fixes meant (look at every flagged picture).
6. Report: finding → what you changed (file:line) → how you proved it; anything you decided not to fix and why.
