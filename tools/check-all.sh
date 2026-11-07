#!/usr/bin/env bash
# All the checks in one command (1.3.2):   npm run check     (or: bash tools/check-all.sh [--quick])
#   1. content and data validators (Hebrew text rules, nikud for beginners, guide lines, threads, lab, quiz, verses, mysteries, storage keys)
#   2. both editions build (general and torah)
#   3. the integration run at 800x460 (amazon, grove, reef, the hub) in both editions, with no script or page errors
#   4. the training field and the first-visit tutorials of the lab and the hub (1.3.3: tests/play/training.json, tutorials.json)
#      and the parents' play time (tools/check-playtime.py)
#   5. saves of every released version load (tests/fixtures/saves-*.json)
# --quick stops after step 2. A failing step stops the script with its name.
set -u
cd "$(dirname "$0")/.."
fail() { echo; echo "FAILED: $1"; exit 1; }
step() { echo; echo "== $1"; }

step "validators"
for v in validate-content validate-kids validate-guide validate-threads validate-lab validate-quiz validate-verse validate-storage validate-zones validate-robolab validate-robot-missions check-sync; do
  raw=$(node tools/$v.mjs 2>&1); code=$?
  out=$(echo "$raw" | grep -v -i "warning\|Reparsing\|trace-warnings"); echo "$v: $(echo "$out" | tail -1)"
  [ $code -ne 0 ] && { echo "$out" | tail -20; fail "$v (exit code $code)"; }
  echo "$out" | grep -q "ERROR\|error(s)" && { echo "$out" | grep "ERROR" | head -20; fail "$v"; }
done
# 1.4.3: the robot workshop's engine (parts, building rules, numbers, and what they change in a run) without the screen
raw=$(node tests/robolab/build.mjs 2>&1); code=$?; out=$(echo "$raw" | grep -v -i "warning\|Reparsing\|trace-warnings"); echo "workshop engine: $(echo "$out" | tail -1)"
[ $code -ne 0 ] && { echo "$out"; fail "workshop engine"; }
raw=$(node tests/robolab/drone-missions.mjs 2>&1); code=$?; out=$(echo "$raw" | grep -v -i "warning\|Reparsing\|trace-warnings\|module type"); echo "$(echo "$out" | tail -1)"
[ $code -ne 0 ] && { echo "$out"; fail "drone missions"; }
raw=$(node tests/robolab/hints.mjs 2>&1); code=$?; out=$(echo "$raw" | grep -v -i "warning\|Reparsing\|trace-warnings\|module type"); echo "$(echo "$out" | tail -1)"
[ $code -ne 0 ] && { echo "$out"; fail "robot lab hints"; }
# 1.4.4 set 9: the rare badges and their medallions and frames
raw=$(node tests/badges/rare.mjs 2>&1); code=$?; out=$(echo "$raw" | grep -v -i "warning\|Reparsing\|trace-warnings\|module type"); echo "$(echo "$out" | tail -1)"
[ $code -ne 0 ] && { echo "$out"; fail "rare badges"; }
# set 4: missions made from the child's own island, on the saved islands of every version and on made-up islands
raw=$(node tests/robolab/island-missions.mjs 2>&1); code=$?; out=$(echo "$raw" | grep -v -i "warning\|Reparsing\|trace-warnings"); echo "$(echo "$out" | tail -1)"
[ $code -ne 0 ] && { echo "$out"; fail "island missions"; }
# 1.4.2: the savanna's systems (seasons, grass, grazing order, fire, herds, stability) without the game
raw=$(node tests/savanna/systems.mjs 2>&1); code=$?; out=$(echo "$raw" | grep -v -i "warning\|Reparsing\|trace-warnings"); echo "savanna systems: $(echo "$out" | tail -1)"
[ $code -ne 0 ] && { echo "$out"; fail "savanna systems"; }
# 1.4.4 set 1: אירוע השבוע (the clock, the turns, a missed version coming back, badges, guests)
raw=$(node tests/workshop/data.mjs 2>&1); code=$?; out=$(echo "$raw" | grep -v -i "warning\|Reparsing\|trace-warnings"); echo "workshop data: $(echo "$out" | tail -1)"
[ $code -ne 0 ] && { echo "$out"; fail "workshop data"; }
raw=$(node tests/workshop/orders.mjs 2>&1); code=$?; out=$(echo "$raw" | grep -v -i "warning\|Reparsing\|trace-warnings"); echo "workshop orders: $(echo "$out" | tail -1 | cut -c1-90)"
[ $code -ne 0 ] && { echo "$out"; fail "workshop orders"; }
raw=$(node tests/weekly/jar.mjs 2>&1); code=$?; out=$(echo "$raw" | grep -v -i "warning\|Reparsing\|trace-warnings"); echo "weekly jar: $(echo "$out" | tail -1 | cut -c1-90)"
[ $code -ne 0 ] && { echo "$out"; fail "weekly jar"; }
for wt in detective race; do raw=$(node tests/weekly/$wt.mjs 2>&1); code=$?; out=$(echo "$raw" | grep -v -i "warning\|Reparsing\|trace-warnings\|module type"); echo "weekly $wt: $(echo "$out" | tail -1 | cut -c1-90)"
  [ $code -ne 0 ] && { echo "$out"; fail "weekly $wt"; }; done
raw=$(node tests/weekly/engine.mjs 2>&1); code=$?; out=$(echo "$raw" | grep -v -i "warning\|Reparsing\|trace-warnings"); echo "weekly engine: $(echo "$out" | tail -1)"
[ $code -ne 0 ] && { echo "$out"; fail "weekly engine"; }
out=$(node tools/validate-research.mjs --all 2>&1); code=$?; echo "validate-research: $(echo "$out" | tail -1)"
[ $code -ne 0 ] && fail "validate-research (exit code $code)"
echo "$out" | tail -1 | grep -q "solvable" || fail "validate-research"

step "builds"
node build.mjs --edition=torah > /dev/null || fail "build torah"
node build.mjs > /dev/null || fail "build general"
echo "general and torah built"
[ "${1:-}" = "--quick" ] && { echo; echo "OK (quick)"; exit 0; }

step "integration 800x460"
out=$(timeout 1200 python3 tools/play.py dist/index.html tests/play/integ.json 800 460 2>&1)
echo "$out" | grep "hub ok" || fail "integration (no 'hub ok 10')"
echo "$out" | grep -q "hub ok 10" || fail "integration"
echo "$out" | grep "\[pageerror\]\|JS ERROR\|UNTIL TIMEOUT\|^\[error\]" && fail "integration: errors in the page or the script"
echo "$out" | grep -q "eval: placed [1-9][0-9]*/[1-9]" || fail "integration: nothing was placed in the Amazon"
echo "$out" | grep -q "eval: grove ok [1-9]" || fail "integration: the grove did not run"
echo "$out" | grep -q "eval: reef ok [1-9]" || fail "integration: the reef did not run"

step "robot lab: editing, drafts, menus, islands, leaving mid-run"
# real clicks: blocks in order, a block into a slot, remove, a condition and a count edited, back to the menu and after a
# reload the lesson opens empty and old drafts are gone, the stars stay, a lesson in 3D, the next lesson of the same zone at once, another zone in the middle of a
# run, the menu and the exit in the middle of a run (tests/play/robolab.json, 22 checks, with the opening film and its skip)
out=$(timeout 1200 python3 tools/play.py dist/index.html tests/play/robolab.json 800 460 2>&1)
n=$(echo "$out" | grep -c "CHECK .* ok")
echo "robot lab: $n/22 checks"
echo "$out" | grep "CHECK .* FAIL" && fail "robot lab: a check failed"
echo "$out" | grep "\[pageerror\]\|JS ERROR\|UNTIL TIMEOUT\|NO ELEMENT" && fail "robot lab: errors in the page or the script"
[ "$n" = 22 ] || fail "robot lab: $n of 22 checks"

step "integration, torah edition"
out=$(timeout 1200 python3 tools/play.py dist/index-torah.html tests/play/integ.json 800 460 2>&1)
echo "$out" | grep "hub ok 10" || fail "torah integration (no 'hub ok 10')"
echo "$out" | grep "\[pageerror\]\|JS ERROR\|UNTIL TIMEOUT\|^\[error\]" && fail "torah integration: errors"

step "training field and first-visit tutorials (1.3.3)"
out=$(timeout 1200 python3 tools/play.py dist/index.html tests/play/training.json 800 460 2>&1)
echo "$out" | grep "trained true" || fail "training field: the steps did not reach the end"
echo "$out" | grep -q '"amazon":true' || fail "training field: the islands did not open"
echo "$out" | grep -q '"keys":\[\]' || fail "training field: something was saved"
echo "$out" | grep "\[pageerror\]\|JS ERROR\|^\[error\]" && fail "training field: errors"
out=$(timeout 1200 python3 tools/play.py dist/index.html tests/play/tutorials.json 800 460 2>&1)
echo "$out" | grep -q "guide open false" || fail "lab tutorial: did not end at the first station"
echo "$out" | grep "\[pageerror\]\|JS ERROR\|^\[error\]" && fail "tutorials: errors"
out=$(timeout 900 python3 tools/play.py dist/index.html tests/play/training-skip.json 800 460 2>&1)
echo "$out" | grep -q '"trained":true,"amazon":true' || fail "training field: skipping did not open the islands"
# the robot lab's hands-on tutorials (1.4.1): the editor and the run in the first lesson, the event block later, once each
out=$(timeout 1200 python3 tools/play.py dist/index.html tests/play/robolab-tutorial.json 800 460 2>&1)
n=$(echo "$out" | grep -c "CHECK .* ok")
echo "$out" | grep "CHECK .* FAIL" && fail "robot lab tutorial: a check failed"
echo "$out" | grep "\[pageerror\]\|JS ERROR\|UNTIL TIMEOUT\|NO ELEMENT" && fail "robot lab tutorial: errors"
[ "$n" = 8 ] || fail "robot lab tutorial: $n of 8 checks"
# the robot workshop (1.4.3 set 3): the first step's card, the hands-on tutorial, a ready robot, a part's card, the test
# track (stuck on sand with a hint, a step card only after the tutorial), wide wheels cross the sand, the garage; beginners;
# and the technology cards (a drop-in after the step card, the album's tech tab, the zoom); set 4: the missions (the
# missions tutorial, the robot on the bench goes to a mission in 3D, the count, a missing part's help, back to the workshop)
# 1.4.4 set 0 (6.11: two big doors, lessons and the robot workshop); the inventors' robot workshop fits the screen with no scroll bar (inv-robots)
# 6.11: the workshop's inventor path, how-to, shelf carousel and badge note (ws-path), the beginners' workshop (ws-kids), the
# instructors' code opening everything for one player only (allopen-player)
for t in workshop:14 workshop-kids:5 techcards:7 workshop-missions:14 workshop-island:8 garage:10 stage9:5 sandbox:8 chat:20 inv-robots:7 weekly:11 nz-workshop:34 ws-path:11 allopen-player:6 ws-kids:11 nz-voice:3 ws-room-leave:5 robolab-hints:8 weekly-events:13 weekly-det-race:12 drone-missions:6 hard-challenges:3 rare-badges:5 films:4; do
  f=${t%%:*}; want=${t##*:}
  out=$(timeout 1200 python3 tools/play.py dist/index.html tests/play/$f.json 800 460 2>&1)
  n=$(echo "$out" | grep -c "CHECK .* ok")
  echo "$out" | grep "CHECK .* FAIL" && fail "$f: a check failed"
  echo "$out" | grep "\[pageerror\]\|JS ERROR\|UNTIL TIMEOUT\|NO ELEMENT" && fail "$f: errors"
  [ "$n" = "$want" ] || fail "$f: $n of $want checks"
done
# the robot lab's loop tutorial (1.4.2, Avi 1.11): the loop, a block inside it, the number, and going on under it
out=$(timeout 1200 python3 tools/play.py dist/index.html tests/play/robolab-loop-tutorial.json 800 460 2>&1)
n=$(echo "$out" | grep -c "CHECK .* ok")
echo "$out" | grep "CHECK .* FAIL" && fail "robot lab loop tutorial: a check failed"
echo "$out" | grep "\[pageerror\]\|JS ERROR\|UNTIL TIMEOUT\|NO ELEMENT" && fail "robot lab loop tutorial: errors"
[ "$n" = 5 ] || fail "robot lab loop tutorial: $n of 5 checks"
# the savanna pushes back (1.4.2, Avi 1.11): three hyenas against one lion steal its kills (W.thirstK)
out=$(timeout 1200 python3 tools/play.py dist/index.html tests/play/savanna-rival.json 800 460 2>&1)
echo "$out" | grep -q "CHECK rival ok" || fail "savanna rivalry: $(echo "$out" | grep CHECK)"
# a big lion runs round a termite mound, not through it (1.4.3 closing, Avi: "lions get stuck in the termite mound")
out=$(timeout 900 python3 tools/play.py dist/index.html tests/play/mound-walk.json 800 460 2>&1)
echo "$out" | grep -q "CHECK lion-passes-mound ok" || fail "mound walk: $(echo "$out" | grep CHECK)"
# the savanna's robot lessons (1.4.2, Avi 1.11): listed, and one runs on the savanna island in 3D
out=$(timeout 1200 python3 tools/play.py dist/index.html tests/play/robolab-savanna.json 800 460 2>&1)
n=$(echo "$out" | grep -c "CHECK .* ok")
echo "$out" | grep "CHECK .* FAIL" && fail "robot lab savanna: a check failed"
echo "$out" | grep "\[pageerror\]\|JS ERROR\|UNTIL TIMEOUT\|NO ELEMENT" && fail "robot lab savanna: errors"
[ "$n" = 3 ] || fail "robot lab savanna: $n of 3 checks"
# the desert's first visit (1.4.1): plant a saltbush, bring a sand rat, run time on (tests/play/desert-tutorial.json)
out=$(timeout 1200 python3 tools/play.py dist/index.html tests/play/desert-tutorial.json 800 460 2>&1)
n=$(echo "$out" | grep -c "CHECK .* ok")
echo "$out" | grep "CHECK .* FAIL" && fail "desert tutorial: a check failed"
echo "$out" | grep "\[pageerror\]\|JS ERROR\|UNTIL TIMEOUT\|NO ELEMENT" && fail "desert tutorial: errors"
[ "$n" = 6 ] || fail "desert tutorial: $n of 6 checks"
# the savanna's first visit (1.4.2): plant grass, bring a weaver, the stability bar, run time on (tests/play/savanna-tutorial.json)
out=$(timeout 1200 python3 tools/play.py dist/index.html tests/play/savanna-tutorial.json 800 460 2>&1)
n=$(echo "$out" | grep -c "CHECK .* ok")
echo "$out" | grep "CHECK .* FAIL" && fail "savanna tutorial: a check failed"
echo "$out" | grep "\[pageerror\]\|JS ERROR\|UNTIL TIMEOUT\|NO ELEMENT" && fail "savanna tutorial: errors"
[ "$n" = 8 ] || fail "savanna tutorial: $n of 8 checks"
# the savanna's devices (1.4.2): a solar pump gives water, a beehive fence guards trees from elephants, the fire tower
out=$(timeout 1200 python3 tools/play.py dist/index.html tests/play/tech-savanna.json 800 460 2>&1)
n=$(echo "$out" | grep -c "CHECK .* ok")
echo "$out" | grep "CHECK .* FAIL" && fail "savanna devices: a check failed"
echo "$out" | grep "\[pageerror\]\|JS ERROR\|UNTIL TIMEOUT\|NO ELEMENT" && fail "savanna devices: errors"
[ "$n" = 4 ] || fail "savanna devices: $n of 4 checks"
# the savanna's opening film (1.4.2): it plays once, the cast is on the island, it ends, the clock comes back, its button, skip
out=$(timeout 1500 python3 tools/play.py dist/index.html tests/play/savanna-film.json 800 460 2>&1)
n=$(echo "$out" | grep -c "CHECK .* ok")
echo "$out" | grep "CHECK .* FAIL" && fail "savanna film: a check failed"
echo "$out" | grep "\[pageerror\]\|JS ERROR\|UNTIL TIMEOUT\|NO ELEMENT" && fail "savanna film: errors"
[ "$n" = 7 ] || fail "savanna film: $n of 7 checks"
# the savanna's late rains (1.4.3, Avi: "in the drought mission it rains"): no rain while the drought lasts, a shower after it
out=$(timeout 1200 python3 tools/play.py dist/index.html tests/play/savanna-drought.json 800 460 2>&1)
n=$(echo "$out" | grep -c "CHECK .* ok")
echo "$out" | grep "CHECK .* FAIL" && fail "savanna drought: a check failed"
echo "$out" | grep "\[pageerror\]\|JS ERROR\|UNTIL TIMEOUT\|NO ELEMENT" && fail "savanna drought: errors"
[ "$n" = 2 ] || fail "savanna drought: $n of 2 checks"
# the savanna's resident herds (1.4.3, pop.js and the Blender crowds): made from the child's animals, grow in the rains,
# their animals follow the herd, drawn as crowds, saved, counted alive; the herd list opens with a real click and closes; back to the savanna from another zone, the crowds come back
out=$(timeout 1200 python3 tools/play.py dist/index.html tests/play/savanna-herds.json 800 460 2>&1)
n=$(echo "$out" | grep -c "CHECK .* ok")
echo "$out" | grep "CHECK .* FAIL" && fail "savanna herds: a check failed"
echo "$out" | grep "\[pageerror\]\|JS ERROR\|UNTIL TIMEOUT\|NO ELEMENT" && fail "savanna herds: errors"
[ "$n" = 9 ] || fail "savanna herds: $n of 9 checks"
echo "training field and tutorials OK (robot lab tutorial 8/8, desert tutorial 6/6, savanna tutorial 8/8, savanna devices 4/4, savanna film 7/7, savanna drought 2/2, savanna herds 9/9)"

step "parents' play time"
out=$(timeout 1200 python3 tools/check-playtime.py dist/index-torah.html shots/playtime 2>&1)
echo "$out" | grep "^FAIL" ; echo "$out" | tail -1
echo "$out" | tail -1 | grep -q "^OK" || fail "parents' play time"

step "old saves"
out=$(timeout 2400 python3 tools/check-old-saves.py dist/index.html 2>&1 | grep -v "^  ")
echo "$out" | grep "saves-"
echo "$out" | grep -q "^FAIL\|Traceback" && fail "old saves"

# 5.11 (Avi: every world we build is checked for memory, weight, loading and long runs): open and close every world three
# times, play in it, and fail if anything is left behind after closing (tools/check-worlds.py, about 25 minutes)
step "worlds under load: memory, weight, loading"
out=$(timeout 3600 python3 tools/check-worlds.py dist/index.html 3 2>&1)
echo "$out" | grep -A12 "^world "
echo "$out" | grep -q "WORLDS: OK" || fail "worlds under load"

echo; echo "OK – all checks passed"
