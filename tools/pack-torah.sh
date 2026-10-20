#!/bin/bash
# Release files of the torah edition only (as for 1.3.1, Avi 20.10): Windows, one Mac file, the one-file html.
#   reshet-hachaim-torah-setup-<v>.exe      Windows
#   reshet-hachaim-torah-mac-<v>.zip        Mac, built for Intel (x64); on Apple-chip Macs it runs through Rosetta.
#                                           One universal file can only be built on a Mac (--universal fails on Linux).
#   reshet-hachaim-torah-<v>.html           the whole game in one file, opens in Chrome or Edge
# Needs wine + wine32 (NSIS) and rcodesign (cargo install apple-codesign). Run the checks (CLAUDE.md) before.
set -e
cd "$(dirname "$0")/.."; ROOT=$(pwd)
ver=$(node -p "require('./desktop/package.json').version")
out=${1:-$ROOT/release-files/$ver}; mkdir -p "$out"
node build.mjs --desktop --edition=torah > "$out/log-build-torah.txt" 2>&1
(cd desktop && rm -rf release \
  && WINEDEBUG=-all npx electron-builder --win nsis --x64 --config builder-torah.json > "$out/log-win-torah.txt" 2>&1 \
  && npx electron-builder --mac zip --x64 --config builder-torah.json > "$out/log-mac-torah.txt" 2>&1)
cp "desktop/release/reshet-hachaim-torah-setup-$ver.exe" "$out/"
app=$(ls -d desktop/release/mac/*.app); rcodesign sign "$app" > /dev/null 2>&1
python3 tools/zip-mac-app.py "$app" "$out/reshet-hachaim-torah-mac-$ver.zip" "רשת החיים – מהדורה תורנית.app"
node build.mjs --edition=torah > "$out/log-build-html.txt" 2>&1 && cp dist/index-torah.html "$out/reshet-hachaim-torah-$ver.html"
(cd "$out" && sha256sum *.exe *.zip *.html > SHA256SUMS.txt && ls -la *.exe *.zip *.html)
