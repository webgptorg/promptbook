#!/usr/bin/env bash
set -euo pipefail

apk=${1:?Provide the debuggable emulator APK}
app=io.ptbk.android
version=$(node -p 'require("./package.json").version')
host_port=''
trap 'if [[ -n $host_port ]]; then adb forward --remove "tcp:$host_port"; fi' EXIT

# Drive the ordinary launcher and Start control, so the engine runs with the
# installed application's permissions and SDK target.
adb install -g "$apk"
adb shell input keyevent KEYCODE_WAKEUP
adb shell wm dismiss-keyguard
adb shell am start -W -n "$app/.MainActivity"

tap_start() {
    adb shell uiautomator dump /sdcard/ptbk-window.xml >/dev/null
    read -r x y < <(adb shell cat /sdcard/ptbk-window.xml | python3 -c '
import re, sys, xml.etree.ElementTree as ET
for node in ET.parse(sys.stdin).iter("node"):
    if node.get("text", "").casefold() == "start engine":
        left, top, right, bottom = map(int, re.findall(r"\d+", node.attrib["bounds"]))
        print((left + right) // 2, (top + bottom) // 2)
        break
else:
    raise SystemExit("The installed app has no Start engine button.")
')
    adb shell input tap "$x" "$y"
}

wait_for_engine() {
    local record
    for attempt in $(seq 1 45); do
        if record=$(adb shell run-as "$app" cat files/project/.ptbk/service/process.json 2>/dev/null); then
            port=$(node -p 'JSON.parse(process.argv[1]).http.port' "$record")
            token=$(node -p 'JSON.parse(process.argv[1]).token' "$record")
            host_port=$(adb forward tcp:0 "tcp:$port")
            return
        fi
        sleep 2
    done
    adb shell uiautomator dump /sdcard/ptbk-window.xml >/dev/null || true
    adb shell cat /sdcard/ptbk-window.xml || true
    echo "The Android service did not start the local engine." >&2
    return 1
}

request() {
    curl --fail --silent --show-error --max-time 10 --noproxy '*' \
        -H "Host: 127.0.0.1:$port" -H "Authorization: Bearer $token" "http://127.0.0.1:$host_port/$1" "${@:2}"
}

tap_start
wait_for_engine
request api/state | node --input-type=module -e '
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const snapshot = JSON.parse(readFileSync(0, "utf8"));
assert.equal(snapshot.engine.version, process.argv[1]);
assert.equal(snapshot.service.state, "pause");
assert.equal(snapshot.connection.local.state, "ready");
assert.ok(snapshot.tools.items.some(tool => tool.name === "gemini"));
' "$version"
request api/history | grep -F 'ptbk: Initialize project' >/dev/null

dashboard_ready=0
for attempt in $(seq 1 10); do
    adb shell uiautomator dump /sdcard/ptbk-window.xml >/dev/null
    window=$(adb shell cat /sdcard/ptbk-window.xml)
    if [[ $window == *'class="android.webkit.WebView"'* && $window == *'text="Dashboard home"'* && $window == *'text="System"'* ]]; then
        dashboard_ready=1
        break
    fi
    sleep 1
done
if [[ $dashboard_ready == 0 ]]; then
    printf '%s\n' "$window" >&2
    echo 'The installed WebView did not attach to the paused project dashboard.' >&2
    exit 1
fi

# Another local client cannot mint a browser session using the desktop header.
test "$(curl --silent --max-time 10 --noproxy '*' -o /dev/null -w '%{http_code}' \
    -H "Host: 127.0.0.1:$port" -H 'X-PTBK-Client: dashboard' "http://127.0.0.1:$host_port/api/session")" = 401

# Check the installed harness and the native commands its shell and search tools use.
versions=$(adb shell run-as "$app" sh -c "'set -e; runtime=\$PWD/cache/engine/$version; export LD_LIBRARY_PATH=\$runtime/links PTBK_ANDROID_NODE=\$(readlink -f \$runtime/bin/node) PTBK_ANDROID_GEMINI=\$runtime/gemini/bundle/gemini.js HOME=\$PWD/files/home TMPDIR=\$PWD/files/tmp; \$runtime/bin/bash -c \"echo bash-ready\"; \$runtime/gemini/bundle/rg-android-x64 --version; \$runtime/bin/gemini --version'")
grep -Fx 'bash-ready' <<< "$versions"
grep -F 'ripgrep ' <<< "$versions"
grep -F '0.67.0' <<< "$versions"

# The engine must answer with the activity closed, and finish when asked to stop.
adb shell input keyevent KEYCODE_HOME
request api/state >/dev/null
request api/control -H 'Content-Type: application/json' -d '{"action":"stop"}' >/dev/null
for attempt in $(seq 1 30); do
    if ! adb shell run-as "$app" test -f files/project/.ptbk/service/process.json; then
        adb shell run-as "$app" test -f files/project/.git/HEAD
        echo "Installed engine, local Git commit, Gemini executable, private dashboard API and background lifecycle passed."
        exit 0
    fi
    sleep 1
done
echo 'The Android engine did not stop.' >&2
exit 1
