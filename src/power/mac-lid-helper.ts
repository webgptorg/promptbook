import { lstat, readFile } from 'node:fs/promises';
import { runProcess } from '../common/process.js';

/**
 * Version of the closed-lid helper. A helper installed by another version must be installed again.
 *
 * @private keep-awake macOS helper
 */
export const LID_HELPER_VERSION = 1;

/**
 * Installed helper script (root-owned).
 *
 * @private keep-awake macOS helper
 */
export const LID_HELPER_PATH = '/Library/PrivilegedHelperTools/io.ptbk.keep-awake';

/**
 * Its sudo rule (no `.` in the name: sudo skips such files in `/etc/sudoers.d`).
 *
 * @private keep-awake macOS helper
 */
export const LID_SUDOERS_PATH = '/etc/sudoers.d/io_ptbk_keep_awake';

/**
 * The boot-time restore job.
 *
 * @private keep-awake macOS helper
 */
export const LID_DAEMON_PATH = '/Library/LaunchDaemons/io.ptbk.keep-awake.plist';

/**
 * Root-owned helper state (holds and the marker that the helper changed the setting).
 *
 * @private keep-awake macOS helper
 */
export const LID_STATE_DIRECTORY = '/Library/Application Support/Promptbook/keep-awake';

/**
 * launchd label of the restore job.
 */
const DAEMON_LABEL = 'io.ptbk.keep-awake';

/**
 * Locations a helper script is generated for (tests run the same script against a fake `pmset` and a temporary state).
 *
 * @private keep-awake macOS helper
 */
export type LidHelperLocations = { readonly pmset: string; readonly state: string };

/**
 * The helper script. It can only hold, report and restore the macOS `SleepDisabled` power setting (which keeps a Mac
 * awake with its lid closed). A hold lasts while the calling engine keeps the helper's input open, so a crash or force
 * stop of the engine ends it; when the last hold ends, also at the next boot, the setting returns to its previous value
 * unless the operator changed it meanwhile. A `SleepDisabled` the operator set before is never turned off.
 *
 * @private keep-awake macOS helper
 */
export function lidHelperScript(locations: LidHelperLocations = { pmset: '/usr/bin/pmset', state: LID_STATE_DIRECTORY }): string {
    const quote = (text: string): string => `'${text.replace(/'/g, `'\\''`)}'`;
    return `#!/bin/sh
# Promptbook keep-awake helper, version ${LID_HELPER_VERSION}.
# Installed by \`ptbk keep-awake --install-helper\` with local administrator approval and removed by
# \`ptbk keep-awake --remove-helper\`. It can only hold, report and restore the macOS "SleepDisabled" power setting,
# which keeps a Mac awake with its lid closed. A hold lasts while the calling engine keeps this helper's input open.
# When the last hold ends (also after a crash, and at the next boot) the setting returns to its previous value.
PATH=/usr/bin:/bin:/usr/sbin:/sbin
export PATH
umask 077
STATE=${quote(locations.state)}
PMSET=${quote(locations.pmset)}

disabled() {
    "$PMSET" -g | awk '$1 == "SleepDisabled" { value = $2 } END { if (value == "") value = 0; print value }'
}

lock() {
    tries=0
    until mkdir "$STATE/lock" 2>/dev/null; do
        tries=$((tries + 1))
        # The critical section is short: a lock older than about five seconds was left by a killed helper.
        if [ "$tries" -ge 50 ]; then rm -rf "$STATE/lock"; tries=0; fi
        sleep 0.1
    done
}

unlock() {
    rmdir "$STATE/lock" 2>/dev/null
}

prune() {
    for entry in "$STATE"/holds/*; do
        [ -e "$entry" ] || continue
        pid=\${entry##*/}
        case "$pid" in
            '' | *[!0-9]*) rm -f "$entry"; continue ;;
        esac
        command=$(ps -p "$pid" -o command= 2>/dev/null)
        case "$command" in
            *io.ptbk.keep-awake\\ hold*) ;;
            *) rm -f "$entry" ;;
        esac
    done
}

holds() {
    prune
    count=0
    for entry in "$STATE"/holds/*; do
        [ -e "$entry" ] && count=$((count + 1))
    done
    echo "$count"
}

restore() {
    if [ -f "$STATE/owned" ]; then
        if [ "$(disabled)" = 1 ]; then "$PMSET" -a disablesleep 0; fi
        rm -f "$STATE/owned"
    fi
}

release() {
    lock
    rm -f "$STATE/holds/$$"
    if [ "$(holds)" = 0 ]; then restore; fi
    unlock
}

hold() {
    mkdir -p "$STATE/holds"
    lock
    prune
    : > "$STATE/holds/$$"
    if [ ! -f "$STATE/owned" ] && [ "$(disabled)" = 0 ]; then
        if "$PMSET" -a disablesleep 1; then date -u '+%Y-%m-%dT%H:%M:%SZ' > "$STATE/owned"; fi
    fi
    value=$(disabled)
    unlock
    if [ "$value" != 1 ]; then
        echo "failed: SleepDisabled stayed $value"
        release
        exit 1
    fi
    exec 3<&0
    cat <&3 >/dev/null &
    reader=$!
    trap 'kill "$reader" 2>/dev/null; release; exit 0' HUP INT TERM
    echo held
    wait "$reader"
    release
}

boot() {
    mkdir -p "$STATE"
    lock
    prune
    if [ "$(holds)" = 0 ]; then restore; fi
    unlock
}

status() {
    echo "version ${LID_HELPER_VERSION}"
    echo "sleepDisabled $(disabled)"
    if [ -f "$STATE/owned" ]; then echo "owned yes"; else echo "owned no"; fi
}

case "\${1:-}" in
    hold) hold ;;
    status) status ;;
    boot) boot ;;
    *) echo "usage: io.ptbk.keep-awake hold|status|boot" >&2; exit 2 ;;
esac
`;
}

/**
 * The sudo rule: the named OS user may run exactly `hold` and `status` of the helper without a password.
 *
 * @private keep-awake macOS helper
 */
export function lidSudoersRule(user: string): string {
    if (!/^[A-Za-z0-9_][A-Za-z0-9._-]*$/.test(user)) throw new Error(`The OS user name "${user}" cannot be used in a sudo rule.`);
    return `# Promptbook keep-awake helper (ptbk keep-awake --install-helper): lets ${user} hold or read the closed-lid setting.\n${user} ALL = (root) NOPASSWD: ${LID_HELPER_PATH} hold, ${LID_HELPER_PATH} status\n`;
}

/**
 * The launchd job restoring the setting at boot, when no hold can exist any more.
 *
 * @private keep-awake macOS helper
 */
export function lidDaemonPlist(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${DAEMON_LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/sh</string>
        <string>${LID_HELPER_PATH}</string>
        <string>boot</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
`;
}

/**
 * A shell here-document whose terminator cannot occur in the embedded text.
 */
function hereDocument(target: string, text: string, terminator: string): string {
    if (text.split('\n').includes(terminator)) throw new Error(`The embedded text contains its terminator ${terminator}.`);
    return `cat > ${target} <<'${terminator}'\n${text.endsWith('\n') ? text : `${text}\n`}${terminator}\n`;
}

/**
 * The root script installing the helper, its sudo rule and the restore job. Everything is embedded in the command
 * itself (no file a same-user process could swap between approval and execution); the sudo rule is validated before
 * it is put in place, and `/etc/sudoers` itself is never edited.
 *
 * @private keep-awake macOS helper
 */
export function lidInstallScript(user: string): string {
    const sudoers = lidSudoersRule(user);
    return [
        'set -eu',
        'PATH=/usr/bin:/bin:/usr/sbin:/sbin',
        'umask 022',
        `if ! grep -Eq '^[#@]includedir[[:space:]]+(/private)?/etc/sudoers.d' /etc/sudoers; then echo 'This Mac’s /etc/sudoers does not include /etc/sudoers.d; nothing was installed.' >&2; exit 3; fi`,
        'work=$(mktemp -d /tmp/io.ptbk.keep-awake.XXXXXX)',
        `trap 'rm -rf "$work"' EXIT`,
        hereDocument('"$work/helper"', lidHelperScript(), 'PTBK_KEEP_AWAKE_HELPER'),
        hereDocument('"$work/sudoers"', sudoers, 'PTBK_KEEP_AWAKE_SUDOERS'),
        hereDocument('"$work/plist"', lidDaemonPlist(), 'PTBK_KEEP_AWAKE_PLIST'),
        'visudo -cf "$work/sudoers" >/dev/null',
        'plutil -lint "$work/plist" >/dev/null',
        'install -d -o root -g wheel -m 755 /Library/PrivilegedHelperTools',
        `install -o root -g wheel -m 755 "$work/helper" '${LID_HELPER_PATH}'`,
        `mkdir -p '${LID_STATE_DIRECTORY}'`,
        `chown root:wheel '${LID_STATE_DIRECTORY}'`,
        `chmod 700 '${LID_STATE_DIRECTORY}'`,
        `install -o root -g wheel -m 644 "$work/plist" '${LID_DAEMON_PATH}'`,
        `install -o root -g wheel -m 440 "$work/sudoers" '${LID_SUDOERS_PATH}'`,
        `launchctl bootout system/${DAEMON_LABEL} >/dev/null 2>&1 || true`,
        `launchctl bootstrap system '${LID_DAEMON_PATH}'`,
        'echo installed',
        '',
    ].join('\n');
}

/**
 * The root script removing the helper: it revokes the sudo rule first, ends running holds, restores the setting the
 * helper changed and deletes every installed file.
 *
 * @private keep-awake macOS helper
 */
export function lidRemoveScript(): string {
    return [
        'set -u',
        'PATH=/usr/bin:/bin:/usr/sbin:/sbin',
        `rm -f '${LID_SUDOERS_PATH}'`,
        `launchctl bootout system/${DAEMON_LABEL} >/dev/null 2>&1 || true`,
        `pkill -f 'io.ptbk.keep-awake hold' >/dev/null 2>&1 || true`,
        'sleep 1',
        `if [ -f '${LID_STATE_DIRECTORY}/owned' ]; then`,
        `    if pmset -g | awk '$1 == "SleepDisabled" { value = $2 } END { exit (value == 1 ? 0 : 1) }'; then pmset -a disablesleep 0; fi`,
        'fi',
        `rm -rf '${LID_STATE_DIRECTORY}'`,
        `rm -f '${LID_DAEMON_PATH}' '${LID_HELPER_PATH}'`,
        'echo removed',
        '',
    ].join('\n');
}

/**
 * Installation state of the helper as an unprivileged engine can verify it.
 *
 * @private keep-awake macOS helper
 */
export type LidHelperState = { readonly state: 'ready' } | { readonly state: 'missing' | 'outdated' | 'unsafe' | 'not-authorized'; readonly reason: string };

/**
 * Verifies the installed helper: exactly this version's script, owned by root and writable by nobody else, and a sudo
 * rule that lets this OS user run its `hold` without a password. An administrator approval alone is never evidence
 * that closed-lid operation works; this only says whether the mechanism can be requested.
 *
 * @private keep-awake macOS helper
 */
export async function verifyLidHelper(env: NodeJS.ProcessEnv = process.env): Promise<LidHelperState> {
    const install = 'Run `ptbk keep-awake --install-helper` in a local terminal (it asks for administrator approval).';
    const info = await lstat(LID_HELPER_PATH).catch(() => undefined);
    if (!info) return { state: 'missing', reason: `Local approval required: the closed-lid helper is not installed. ${install}` };
    if (!info.isFile() || info.uid !== 0 || (info.mode & 0o022) !== 0) return { state: 'unsafe', reason: `The closed-lid helper at ${LID_HELPER_PATH} is not owned by root or is writable by others, so it is not used. ${install}` };
    const content = await readFile(LID_HELPER_PATH, 'utf8').catch(() => '');
    if (content !== lidHelperScript()) return { state: 'outdated', reason: `The installed closed-lid helper is from another Promptbook version. ${install}` };
    const rule = await runProcess('/usr/bin/sudo', ['-n', '-l', LID_HELPER_PATH, 'hold'], { cwd: '/', env, timeoutMs: 10_000 });
    if (rule.exitCode !== 0) return { state: 'not-authorized', reason: `Local approval required: the helper’s sudo rule is missing or was revoked. ${install}` };
    return { state: 'ready' };
}
