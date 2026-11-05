#!/usr/bin/env bash
set -euo pipefail

apk=${1:?Provide the signed APK}
abi=${2:-arm64-v8a}
cd "$(dirname "$0")/../.."
sdk=${ANDROID_SDK_ROOT:-${ANDROID_HOME:?Set ANDROID_SDK_ROOT to the Android SDK}}
tools="$sdk/build-tools/36.0.0"
version=$(node -p 'require("./package.json").version')
"$tools/apksigner" verify --verbose "$apk"
"$tools/zipalign" -c -P 16 4 "$apk"
metadata=$("$tools/aapt2" dump badging "$apk")
grep -F "name='io.ptbk.android'" <<< "$metadata"
grep -F "versionName='$version'" <<< "$metadata"
grep -Fx "native-code: '$abi'" <<< "$metadata"
for file in libptbk_node.so libptbk_git.so libptbk_git_remote.so libptbk_rg.so libptbk_gemini.so; do
    unzip -Z1 "$apk" "lib/$abi/$file" >/dev/null
done
unzip -Z1 "$apk" assets/runtime.zip >/dev/null
