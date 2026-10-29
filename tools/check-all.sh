#!/usr/bin/env bash
# All the checks in one command (1.3.2):   npm run check     (or: bash tools/check-all.sh [--quick])
#   1. content and data validators (Hebrew text rules, nikud for beginners, guide lines, threads, lab, quiz, verses, mysteries, storage keys)
#   2. both editions build (general and torah)
#   3. the integration run at 800x460 (amazon, grove, reef, the hub) in both editions, with no script or page errors
#   4. the parents' play time (tools/check-playtime.py)
#   5. saves of every released version load (tests/fixtures/saves-*.json)
# --quick stops after step 2. A failing step stops the script with its name.
set -u
cd "$(dirname "$0")/.."
fail() { echo; echo "FAILED: $1"; exit 1; }
step() { echo; echo "== $1"; }

step "validators"
for v in validate-content validate-kids validate-guide validate-threads validate-lab validate-quiz validate-verse validate-storage validate-zones validate-robolab; do
  raw=$(node tools/$v.mjs 2>&1); code=$?
  out=$(echo "$raw" | grep -v -i "warning\|Reparsing\|trace-warnings"); echo "$v: $(echo "$out" | tail -1)"
  [ $code -ne 0 ] && { echo "$out" | tail -20; fail "$v (exit code $code)"; }
  echo "$out" | grep -q "ERROR\|error(s)" && { echo "$out" | grep "ERROR" | head -20; fail "$v"; }
done
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
# reload the draft is there, a lesson in 3D, the next lesson of the same zone at once, another zone in the middle of a
# run, the menu and the exit in the middle of a run (tests/play/robolab.json, 19 checks, with the opening film and its skip)
out=$(timeout 1200 python3 tools/play.py dist/index.html tests/play/robolab.json 800 460 2>&1)
n=$(echo "$out" | grep -c "CHECK .* ok")
echo "robot lab: $n/19 checks"
echo "$out" | grep "CHECK .* FAIL" && fail "robot lab: a check failed"
echo "$out" | grep "\[pageerror\]\|JS ERROR\|UNTIL TIMEOUT\|NO ELEMENT" && fail "robot lab: errors in the page or the script"
[ "$n" = 19 ] || fail "robot lab: $n of 19 checks"

step "integration, torah edition"
out=$(timeout 1200 python3 tools/play.py dist/index-torah.html tests/play/integ.json 800 460 2>&1)
echo "$out" | grep "hub ok 10" || fail "torah integration (no 'hub ok 10')"
echo "$out" | grep "\[pageerror\]\|JS ERROR\|UNTIL TIMEOUT\|^\[error\]" && fail "torah integration: errors"

step "parents' play time"
out=$(timeout 1200 python3 tools/check-playtime.py dist/index-torah.html shots/playtime 2>&1)
echo "$out" | grep "^FAIL" ; echo "$out" | tail -1
echo "$out" | tail -1 | grep -q "^OK" || fail "parents' play time"

step "old saves"
out=$(timeout 2400 python3 tools/check-old-saves.py dist/index.html 2>&1 | grep -v "^  ")
echo "$out" | grep "saves-"
echo "$out" | grep -q "^FAIL\|Traceback" && fail "old saves"

echo; echo "OK – all checks passed"
