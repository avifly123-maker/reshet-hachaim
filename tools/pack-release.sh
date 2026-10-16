#!/bin/bash
# Builds the seven release files of the current version into <outdir> (default release-files/<version>):
#   reshet-hachaim-setup-<v>.exe                    Windows, general edition
#   reshet-hachaim-torah-setup-<v>.exe              Windows, torah edition
#   reshet-hachaim-mac-apple-silicon-<v>.zip        Mac with an Apple chip (M1 and later), general
#   reshet-hachaim-mac-intel-<v>.zip                Mac with an Intel processor, general
#   reshet-hachaim-torah-mac-apple-silicon-<v>.zip  Mac, Apple chip, torah
#   reshet-hachaim-torah-mac-intel-<v>.zip          Mac, Intel, torah
#   reshet-hachaim-<v>.html                         the whole game in one file (general), opens in Chrome or Edge
# These names are the ones README.md and docs/RELEASE.md list; keep the three in step.
# Order matters: desktop/app is shared by both editions, so torah is built and packed first, general last.
# Needs: wine + wine32 (NSIS), rcodesign (cargo install apple-codesign). Run the checks (CLAUDE.md) before.
set -e
cd "$(dirname "$0")/.."; ROOT=$(pwd)
ver=$(node -p "require('./desktop/package.json').version")
out=${1:-$ROOT/release-files/$ver}; mkdir -p "$out"
pack() {   # pack <edition>
  local ed=$1 cfg="" pre=reshet-hachaim name="רשת החיים.app"
  if [ "$ed" = torah ]; then cfg="--config builder-torah.json"; pre=reshet-hachaim-torah; name="רשת החיים – מהדורה תורנית.app"; fi
  node build.mjs --desktop $([ "$ed" = torah ] && echo --edition=torah) > "$out/log-build-$ed.txt" 2>&1
  (cd desktop && rm -rf release \
    && WINEDEBUG=-all npx electron-builder --win nsis --x64 $cfg > "$out/log-win-$ed.txt" 2>&1 \
    && npx electron-builder --mac $cfg > "$out/log-mac-$ed.txt" 2>&1)
  cp "desktop/release/$pre-setup-$ver.exe" "$out/"
  for a in mac:intel mac-arm64:apple-silicon; do
    local app; app=$(ls -d desktop/release/${a%%:*}/*.app)
    rcodesign sign "$app" > /dev/null 2>&1   # ad-hoc signature: required on Apple Silicon
    python3 tools/zip-mac-app.py "$app" "$out/$pre-mac-${a##*:}-$ver.zip" "$name"
  done
}
pack torah
pack general
node build.mjs > "$out/log-build-html.txt" 2>&1 && cp dist/index.html "$out/reshet-hachaim-$ver.html"
(cd "$out" && sha256sum *.exe *.zip *.html > SHA256SUMS.txt && ls -la *.exe *.zip *.html)
