#!/bin/bash
# Exercise the app copied from the actual installer with its bundled CLI, Node, npm and Electron PTY.
set -euo pipefail

dmg=${1:?Pass the macOS DMG to verify}
case "$dmg" in
    *-unsigned.dmg) signed=false ;;
    *) signed=true ;;
esac

hdiutil verify "$dmg"
if $signed; then
    codesign --verify --verbose=2 "$dmg"
    xcrun stapler validate "$dmg"
fi

work=$(mktemp -d "${TMPDIR:-/tmp}/ptbk macos test.XXXXXX")
mounted=false
cleanup() {
    if $mounted; then hdiutil detach "$work/dmg"; fi
    rm -rf "$work"
}
trap cleanup EXIT
mkdir -p "$work/dmg" "$work/Applications"
hdiutil attach "$dmg" -readonly -nobrowse -mountpoint "$work/dmg"
mounted=true
test "$(readlink "$work/dmg/Applications")" = /Applications
app="$work/Applications/Promptbook.app"
ditto "$work/dmg/Promptbook.app" "$app"
hdiutil detach "$work/dmg"
mounted=false

codesign --verify --deep --strict --verbose=2 "$app"
if $signed; then
    xcrun stapler validate "$app"
    spctl --assess --type execute --verbose=2 "$app"
fi

runtime="$app/Contents/Resources/runtime"
expected=$(node -p 'require("./package.json").version')
actual=$(PATH="$runtime/bin:/usr/bin:/bin" "$runtime/bin/ptbk" --version)
test "$actual" = "$expected"
test "$("$runtime/bin/node" -p 'process.arch')" = "$(node -p 'process.arch')"
PATH="$runtime/bin:/usr/bin:/bin" "$runtime/bin/npm" --version

executable=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "$app/Contents/Info.plist")
PTBK_DESKTOP_EXECUTABLE="$app/Contents/MacOS/$executable" npm --prefix apps/desktop run test:e2e
