#!/usr/bin/env bash
# All the checks in one command (1.3.2):   npm run check     (or: bash tools/check-all.sh [--quick])
#   1. content and data validators (Hebrew text rules, nikud for beginners, guide lines, threads, lab, quiz, verses, mysteries)
#   2. both editions build (general and torah)
#   3. the integration run at 800x460 must print "hub ok 10"
#   4. saves of every released version load (tests/fixtures/saves-*.json)
# --quick stops after step 2. A failing step stops the script with its name.
set -u
cd "$(dirname "$0")/.."
fail() { echo; echo "FAILED: $1"; exit 1; }
step() { echo; echo "== $1"; }

step "validators"
for v in validate-content validate-kids validate-guide validate-threads validate-lab validate-quiz validate-verse; do
  out=$(node tools/$v.mjs 2>&1 | grep -v -i "warning\|Reparsing\|trace-warnings"); echo "$v: $(echo "$out" | tail -1)"
  echo "$out" | grep -q "ERROR\|error(s)" && { echo "$out" | grep "ERROR" | head -20; fail "$v"; }
done
out=$(node tools/validate-research.mjs --all 2>&1); echo "validate-research: $(echo "$out" | tail -1)"
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
echo "$out" | grep "\[pageerror\]" && fail "integration page errors"

step "old saves"
out=$(timeout 2400 python3 tools/check-old-saves.py dist/index.html 2>&1 | grep -v "^  ")
echo "$out" | grep "saves-"
echo "$out" | grep -q "^FAIL\|Traceback" && fail "old saves"

echo; echo "OK – all checks passed"
