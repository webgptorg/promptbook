#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."
root=$PWD
out=${1:?Usage: bash apps/android/build-apk.sh /absolute/path/to/Promptbook.apk}
out=$(realpath -m "$out")
version=$(node -p 'require("./package.json").version')
version_code=$(node --input-type=module - "$version" <<'JS'
const match = /^(\d+)\.(\d+)\.(\d+)(?:-(\d+))?$/.exec(process.argv[2]);
if (!match) throw new Error('Android releases require the Promptbook numeric version format.');
const [major, minor, patch] = match.slice(1, 4).map(Number);
const prerelease = match[4] === undefined ? 999 : Number(match[4]);
if (major > 20 || minor > 999 || patch > 99 || (match[4] && prerelease > 998)) {
    throw new Error('This release version does not fit in the Android version code.');
}
console.log(major * 100_000_000 + minor * 100_000 + patch * 1_000 + prerelease + 1);
JS
)
sdk=${ANDROID_SDK_ROOT:-${ANDROID_HOME:?Set ANDROID_SDK_ROOT to the Android SDK}}
tools="$sdk/build-tools/36.0.0"
platform="$sdk/platforms/android-36/android.jar"
ndk=${ANDROID_NDK_HOME:-"$sdk/ndk/28.2.13676358"}
abi=${PTBK_ANDROID_ABI:-arm64-v8a}
case "$abi" in
    arm64-v8a) arch=aarch64 ;;
    x86_64) arch=x86_64 ;;
    *) echo "Unsupported Android ABI $abi" >&2; exit 1 ;;
esac
min_sdk=28
build=$(mktemp -d "${TMPDIR:-/tmp}/ptbk-apk.XXXXXXXX")
trap 'rm -rf -- "$build"' EXIT
payload="$build/payload"
assets="$build/assets"
native="$build/lib/$abi"
mkdir -p "$payload" "$assets" "$native" "$build/classes" "$build/generated/io/ptbk/android" "$(dirname "$out")"

python3 apps/android/prepare-native.py "$build/termux" "$native" "$payload" "$arch"
"$ndk/toolchains/llvm/prebuilt/linux-x86_64/bin/$arch-linux-android$min_sdk-clang" \
    -O2 -Wl,-z,max-page-size=16384 -o "$native/libptbk_gemini.so" apps/android/launcher.c

node scripts/build.mjs
cp -R dist "$payload/dist"
cp package.json package-lock.json LICENSE.md "$payload/"
npm ci --prefix "$payload" --omit=dev --ignore-scripts --no-audit --no-fund
rm -f "$payload/package-lock.json" "$payload/node_modules/.package-lock.json"
cp apps/android/engine.mjs "$payload/"

gemini="$build/gemini-cli.tgz"
curl --fail --silent --show-error --location --retry 3 --max-time 120 \
    'https://registry.npmjs.org/@google/gemini-cli/-/gemini-cli-0.67.0.tgz' -o "$gemini"
integrity=$(openssl dgst -sha512 -binary "$gemini" | openssl base64 -A)
test "$integrity" = 'lDJfCcYem6/6QZdwZFiGfOu1ZxJJ+j4wsr4HlmcYBfqUHTDXLKDv1MPUXYL2Ok1ygdfMve0F5KrW/ORNZRSHIg=='
mkdir "$payload/gemini"
tar -xzf "$gemini" --strip-components=1 -C "$payload/gemini"
(cd "$payload" && zip -q -r "$assets/runtime.zip" .)

printf 'package io.ptbk.android;\nfinal class BuildVersion { static final String NAME = "%s"; }\n' "$version" \
    > "$build/generated/io/ptbk/android/BuildVersion.java"
"$tools/aapt2" compile --dir apps/android/res -o "$build/resources.zip"
test_flags=()
if [[ ${PTBK_ANDROID_TEST:-0} == 1 ]]; then test_flags+=(--debug-mode); fi
"$tools/aapt2" link --manifest apps/android/AndroidManifest.xml -I "$platform" \
    --min-sdk-version "$min_sdk" --target-sdk-version 36 --version-name "$version" --version-code "$version_code" \
    --java "$build/generated" -A "$assets" "${test_flags[@]}" -o "$build/unaligned.apk" "$build/resources.zip"
javac --release 11 -classpath "$platform" -d "$build/classes" \
    "$build/generated/io/ptbk/android/"*.java apps/android/src/io/ptbk/android/*.java
jar --create --file "$build/classes.jar" -C "$build/classes" .
"$tools/d8" --release --lib "$platform" --min-api "$min_sdk" --output "$build" "$build/classes.jar"
(cd "$build" && zip -q unaligned.apk classes.dex lib/"$abi"/*.so)
"$tools/zipalign" -P 16 -f 4 "$build/unaligned.apk" "$build/aligned.apk"

if [[ -n ${PTBK_ANDROID_KEYSTORE_BASE64:-} ]]; then
    printf '%s' "$PTBK_ANDROID_KEYSTORE_BASE64" | base64 --decode > "$build/signing.p12"
    : "${PTBK_ANDROID_STORE_PASSWORD:?Set the Android keystore password}"
    : "${PTBK_ANDROID_KEY_ALIAS:?Set the Android signing key alias}"
    export PTBK_ANDROID_KEY_PASSWORD=${PTBK_ANDROID_KEY_PASSWORD:-$PTBK_ANDROID_STORE_PASSWORD}
else
    export PTBK_ANDROID_STORE_PASSWORD=preview
    export PTBK_ANDROID_KEY_PASSWORD=preview
    PTBK_ANDROID_KEY_ALIAS=preview
    keytool -genkeypair -noprompt -storetype PKCS12 -keystore "$build/signing.p12" -alias preview \
        -keyalg RSA -keysize 2048 -validity 3650 -dname 'CN=Promptbook Android preview' \
        -storepass:env PTBK_ANDROID_STORE_PASSWORD
fi
"$tools/apksigner" sign --ks "$build/signing.p12" --ks-key-alias "$PTBK_ANDROID_KEY_ALIAS" \
    --ks-pass env:PTBK_ANDROID_STORE_PASSWORD --key-pass env:PTBK_ANDROID_KEY_PASSWORD --v4-signing-enabled false \
    --out "$out" "$build/aligned.apk"
bash "$root/apps/android/verify-apk.sh" "$out" "$abi"
