#!/bin/bash
# 1.4 ("רשת החיים – המסע הגדול"): its own install next to the 1.3 one (desktop/builder-1.4.json: own appId and data
# folder; on its first start it copies the players and saves of the older install, carryFrom). Release files:
#   reshet-hachaim-hagadol-setup-<v>.exe     Windows
#   reshet-hachaim-hagadol-mac-<v>.zip       Mac, built for Intel (x64), runs on Apple-chip Macs through Rosetta
#   reshet-hachaim-hagadol-<v>.html          the whole game in one file (torah edition, the sources are a switch)
# Needs wine + wine32 (NSIS) and rcodesign (cargo install apple-codesign). Run the checks (npm run check) before.
#   bash tools/pack-1.4.sh [out-dir] [--win-only]
set -e
cd "$(dirname "$0")/.."; ROOT=$(pwd)
ver=$(node -p "require('./desktop/package.json').version")
out=$ROOT/release-files/$ver; winonly=0
for a in "$@"; do case $a in --win-only) winonly=1;; *) out=$a;; esac; done
mkdir -p "$out"
node build.mjs --desktop --edition=torah > "$out/log-build.txt" 2>&1
(cd desktop && rm -rf release-1.4 \
  && WINEDEBUG=-all npx electron-builder --win nsis --x64 --config builder-1.4.json > "$out/log-win.txt" 2>&1)
cp "desktop/release-1.4/reshet-hachaim-hagadol-setup-$ver.exe" "$out/"
if [ $winonly = 0 ]; then
  (cd desktop && npx electron-builder --mac zip --x64 --config builder-1.4.json > "$out/log-mac.txt" 2>&1)
  app=$(ls -d desktop/release-1.4/mac/*.app); rcodesign sign "$app" > /dev/null 2>&1
  python3 tools/zip-mac-app.py "$app" "$out/reshet-hachaim-hagadol-mac-$ver.zip" "רשת החיים – המסע הגדול.app"
fi
node build.mjs --edition=torah > "$out/log-build-html.txt" 2>&1 && cp dist/index-torah.html "$out/reshet-hachaim-hagadol-$ver.html"
(cd "$out" && sha256sum *.exe *.html $(ls *.zip 2>/dev/null) > SHA256SUMS.txt && ls -la *.exe *.html $(ls *.zip 2>/dev/null))
