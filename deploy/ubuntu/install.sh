#!/usr/bin/env bash
# Shared installer of a clean Ubuntu 24.04 x86-64 VPS: prepares the prerequisites and the published engine for the
# dedicated non-sudo engine user. The website's one-command entry (https://www.ptbk.io/install.sh) and provider
# startup scripts run it for preparation only; `--init` also hands this terminal to the ordinary `ptbk init` as that user.
# A thin bootstrap: destination, tools, sign-in, Git setup and the start belong to init. No AI credentials are accepted.
set -Eeuo pipefail
umask 022

# The attended one-command entry: it reuses a prepared server and opens init as the engine user.
continuation='curl -fsSL https://www.ptbk.io/install.sh | bash'
engine_user=promptbook
engine_home=/var/lib/promptbook
log=/var/log/promptbook-install.log

usage() {
    printf '%s\n' \
        'Usage: sudo bash install.sh [--version <published-version>] [--prepare-only [--link <url> | --link-stdin] | --init [--path <project-folder>] [-- <ptbk init options>]]' \
        '' \
        'Prepares a dedicated non-sudo promptbook user, Node.js 24, npm, Git, Chrome, boot persistence and the published' \
        'ptbk engine. Run ptbk init as promptbook afterwards, or use --init to start it in this terminal.' \
        '' \
        '  --version <v>    exact published version (default: npm latest, resolved once; an installed engine is reused)' \
        '  --prepare-only   prerequisites only (the default; stated explicitly by unattended provider scripts)' \
        '  --link <url>     with --prepare-only: pair and start an engine before project setup' \
        '  --link-stdin     read that one-time pairing URL from stdin (keeps it out of sudo arguments)' \
        '  --init           then start the setup assistant (ptbk init) as promptbook in this terminal' \
        '  --path <folder>  with --init: project folder inside /var/lib/promptbook, confirmed by init (default: init offers' \
        '                   /var/lib/promptbook/ptbk/project/<name>)' \
        '  -- <options>     with --init: further ptbk init options, e.g. --non-interactive with its decisions' \
        '' \
        'No AI credentials are accepted by this script; harness sign-in happens attended in init.'
}

fail() {
    printf '%s\n' "$*" >&2
    exit 1
}

requested_version=''
project_path=''
pairing_url=''
link_stdin=false
link_argument=false
prepare_only=false
hand_off=false
init_args=()
while (( $# )); do
    case "$1" in
        --help | -h) usage; exit 0 ;;
        --prepare-only) prepare_only=true ;;
        --init) hand_off=true ;;
        --link)
            (( $# >= 2 )) || fail '--link needs the App pairing URL.'
            [[ "$link_argument" == false ]] || fail 'Give only one App pairing URL.'
            link_argument=true
            pairing_url="$2"
            shift
            ;;
        --link-stdin) link_stdin=true ;;
        --version | --path)
            (( $# >= 2 )) || fail "$1 needs a value."
            if [[ "$1" == --path ]]; then
                project_path="$2"
            elif [[ -n "$requested_version" ]]; then
                fail 'Expected at most one published ptbk version.'
            else
                requested_version="$2"
            fi
            shift
            ;;
        --) shift; init_args=("$@"); break ;;
        -*) fail "Unknown option $1. Use latest or an exact published semantic version, --prepare-only, --init, --path or -- followed by ptbk init options." ;;
        *)
            [[ -z "$requested_version" ]] || fail 'Expected at most one published ptbk version.'
            requested_version="$1"
            ;;
    esac
    shift
done
requested_version="${requested_version:-latest}"
if [[ "$prepare_only" == true && "$hand_off" == true ]]; then fail 'Use either --prepare-only or --init, not both.'; fi
if [[ "$hand_off" == false && ( -n "$project_path" || ${#init_args[@]} -gt 0 ) ]]; then fail '--path and ptbk init options need --init.'; fi
if [[ "$link_argument" == true || "$link_stdin" == true ]]; then
    [[ "$hand_off" == false ]] || fail 'Pair before setup with --prepare-only.'
    [[ "$link_argument" == false || "$link_stdin" == false ]] || fail 'Use either --link or --link-stdin.'
    if [[ "$link_stdin" == true ]]; then
        IFS= read -r pairing_url || [[ -n "$pairing_url" ]] || fail 'No App pairing URL was received.'
    fi
    pairing_pattern='^https://[^[:space:]#@?]+/link#[a-z2-7]{25}[aeimquy4]$'
    [[ "$pairing_url" =~ $pairing_pattern ]] || fail 'Copy the complete HTTPS pairing URL from Promptbook App.'
fi
if [[ ! "$requested_version" =~ ^(latest|[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?)$ ]]; then
    fail 'Use latest or an exact published semantic version.'
fi
# An explicit destination stays inside the engine user's home; init confirms it. Never the home itself, the shared
# projects container, a hidden folder or a system/download directory.
if [[ -n "$project_path" ]]; then
    [[ "$project_path" != *[[:cntrl:]]* ]] || fail 'The project folder must not contain control characters.'
    [[ "$project_path" == /* ]] || project_path="$engine_home/$project_path"
    project_path="$(printf '%s' "$project_path" | tr -s /)"
    project_path="${project_path%/}"
    [[ "$project_path/" != */./* && "$project_path/" != */../* ]] || fail 'Use a project folder without . or .. segments.'
    if [[ "$project_path" != "$engine_home"/* || "$project_path" == "$engine_home/ptbk" || "$project_path" == "$engine_home/ptbk/project" || "${project_path#"$engine_home"/}" == .* ]]; then
        fail "Choose a project folder inside the engine user's home, for example $engine_home/ptbk/project/my-agenda."
    fi
fi
# Explicit unattended init needs no terminal; otherwise the handoff is interactive.
noninteractive_init=false
own_self_update=false
for argument in ${init_args[@]+"${init_args[@]}"}; do
    case "$argument" in
        --non-interactive | --raw) noninteractive_init=true ;;
        --self-update | --self-update=*) own_self_update=true ;;
    esac
done

if (( EUID != 0 )); then fail 'Run this installer with sudo.'; fi
source /etc/os-release
if [[ "$ID" != ubuntu || "$VERSION_ID" != 24.04 || "$(uname -m)" != x86_64 ]]; then
    fail 'This installer supports Ubuntu 24.04 on x86-64 only.'
fi
if [[ -e /usr/local/bin/ptbk || -L /usr/local/bin/ptbk ]] && ! grep -q 'Promptbook VPS launcher' /usr/local/bin/ptbk; then
    fail 'An unrelated /usr/local/bin/ptbk already exists; leaving it unchanged.'
fi
if id "$engine_user" >/dev/null 2>&1; then
    if [[ "$(getent passwd "$engine_user" | cut -d: -f6)" != "$engine_home" ]]; then
        fail "Existing $engine_user account has a different home; leaving it unchanged."
    fi
    if id -nG "$engine_user" | tr ' ' '\n' | grep -qxE 'sudo|admin|wheel|root'; then
        fail "Existing $engine_user account has administrator rights; the engine must run as a non-sudo user. Leaving it unchanged."
    fi
fi
# The live terminal of this session, checked before output is also logged. Script input at EOF is not a terminal.
attended_terminal=false
if { : </dev/tty >/dev/tty; } 2>/dev/null; then attended_terminal=true; fi

exec 3>&1 4>&2
exec > >(tee -a "$log") 2>&1
logger="${!:-}"
trap 'printf "Promptbook installation failed at line %s. See %s; project files were not initialized.\n" "$LINENO" "$log" >&2' ERR
export DEBIAN_FRONTEND=noninteractive
apt_updated=false
apt_install() {
    if [[ "$apt_updated" == false ]]; then
        apt-get -o DPkg::Lock::Timeout=300 -o Acquire::Retries=3 update
        apt_updated=true
    fi
    apt-get -o DPkg::Lock::Timeout=300 -o Acquire::Retries=3 install -y --no-install-recommends "$@"
}
# Reuse satisfied system packages; a retry installs only what is still missing.
missing_packages=()
for package in ca-certificates curl xz-utils git dbus-user-session; do
    dpkg-query --show --showformat='${Status}' "$package" 2>/dev/null | grep -q 'install ok installed' || missing_packages+=("$package")
done
if (( ${#missing_packages[@]} )); then apt_install "${missing_packages[@]}"; fi
install -d -m 755 /opt/promptbook
work_dir="$(mktemp -d)"
trap 'rm -rf -- "$work_dir"' EXIT

# Keep the VPS runtime separate from the administrator's Node/npm installation.
# A retry preserves the runtime already used by initialized projects.
if [[ ! -x /opt/promptbook/node/bin/node ]]; then
curl --fail --silent --show-error --location --retry 3 https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt -o "$work_dir/SHASUMS256.txt"
node_archive="$(awk '$2 ~ /^node-v24\.[0-9]+\.[0-9]+-linux-x64\.tar\.xz$/ {print $2}' "$work_dir/SHASUMS256.txt")"
[[ "$node_archive" =~ ^node-v24\.[0-9]+\.[0-9]+-linux-x64\.tar\.xz$ ]]
node_version="${node_archive#node-}"
node_version="${node_version%-linux-x64.tar.xz}"
curl --fail --silent --show-error --location --retry 3 "https://nodejs.org/dist/$node_version/$node_archive" -o "$work_dir/$node_archive"
(cd "$work_dir" && awk -v name="$node_archive" '$2 == name' SHASUMS256.txt | sha256sum --check -)
node_directory="${node_archive%.tar.xz}"
if [[ ! -d "/opt/promptbook/$node_directory" ]]; then
    tar -xJf "$work_dir/$node_archive" -C /opt/promptbook
fi
ln -sfn "$node_directory" /opt/promptbook/node
fi
export PATH="/opt/promptbook/node/bin:$PATH"
[[ "$(node -p 'process.versions.node.split(".")[0]')" == 24 ]]

# Resolve the public npm tag once, then install and record that exact version. Without an explicit version, an
# installed engine is reused: repeating the bootstrap never upgrades it.
installed_version=''
if [[ -f /opt/promptbook/installed-version ]]; then installed_version="$(cat /opt/promptbook/installed-version)"; fi
if [[ "$requested_version" == latest && -n "$installed_version" ]]; then
    resolved_version="$installed_version"
    printf 'Reusing the installed engine %s. Engine updates use the ordinary update workflow, not this bootstrap.\n' "$resolved_version"
else
    resolved_version="$(npm view "ptbk@$requested_version" version --registry=https://registry.npmjs.org/)"
    [[ "$resolved_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]]
    if [[ -n "$installed_version" && "$installed_version" != "$resolved_version" ]]; then
        printf 'This host already has engine %s. Stop and back up projects before upgrading; this bootstrap does not replace a running engine.\n' "$installed_version" >&2
        exit 1
    fi
fi
if [[ ! -f /opt/promptbook/installed-version || ! -x /opt/promptbook/engine/bin/ptbk ]]; then
    npm install --global --prefix /opt/promptbook/engine --registry=https://registry.npmjs.org/ "ptbk@$resolved_version"
fi
if ! command -v google-chrome-stable >/dev/null 2>&1; then
curl --fail --silent --show-error --location --retry 3 https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -o "$work_dir/google-chrome.deb"
apt_install "$work_dir/google-chrome.deb"
fi

if ! id "$engine_user" >/dev/null 2>&1; then
    useradd --create-home --home-dir "$engine_home" --shell /bin/bash "$engine_user"
fi
chmod 700 "$engine_home"
# The first project folder the website entry opens init in (init's own shared projects folder stays available).
install -d -m 700 -o "$engine_user" -g "$engine_user" \
    "$engine_home/projects" "$engine_home/projects/my-agenda" \
    "$engine_home/.local" "$engine_home/.local/bin" "$engine_home/.local/share" \
    "$engine_home/.config" "$engine_home/.config/systemd" "$engine_home/.config/systemd/user" \
    "$engine_home/.cache"
if [[ ! -e "$engine_home/.npmrc" ]]; then
    printf 'prefix=%s/.local\n' "$engine_home" > "$engine_home/.npmrc"
    chown "$engine_user:$engine_user" "$engine_home/.npmrc"
fi
if ! grep -q 'Promptbook VPS environment v2' "$engine_home/.profile"; then
    cat >> "$engine_home/.profile" <<'PROFILE'

# Promptbook VPS environment v2
export PATH="/opt/promptbook/node/bin:$HOME/.local/bin:$PATH"
export XDG_CONFIG_HOME="$HOME/.config"
export XDG_DATA_HOME="$HOME/.local/share"
export XDG_CACHE_HOME="$HOME/.cache"
if [ -d "/run/user/$(id -u)" ]; then
    export XDG_RUNTIME_DIR="/run/user/$(id -u)"
fi
PROFILE
    chown "$engine_user:$engine_user" "$engine_home/.profile"
fi
cat > /usr/local/bin/ptbk <<'LAUNCHER'
#!/bin/sh
# Promptbook VPS launcher
export PATH="/opt/promptbook/node/bin:$HOME/.local/bin:$PATH"
if [ "$(id -un)" = promptbook ]; then
    export XDG_CONFIG_HOME=/var/lib/promptbook/.config
    export XDG_DATA_HOME=/var/lib/promptbook/.local/share
    export XDG_CACHE_HOME=/var/lib/promptbook/.cache
    export XDG_RUNTIME_DIR="/run/user/$(id -u)"
fi
exec /opt/promptbook/engine/bin/ptbk "$@"
LAUNCHER
chmod 755 /usr/local/bin/ptbk
# The engine's own per-user startup registration needs lingering to work at boot; no second supervisor is added.
loginctl enable-linger "$engine_user"
systemctl start "user@$(id -u "$engine_user").service"
# A fresh service account needs a Git author before init can make its first commit.
# Preserve an existing identity; these defaults identify the local service, not a person.
runuser --login "$engine_user" --command 'test -n "$(git config --global --get user.name || true)" || git config --global user.name "Promptbook"'
runuser --login "$engine_user" --command 'test -n "$(git config --global --get user.email || true)" || git config --global user.email "promptbook@localhost"'
runuser --login "$engine_user" --command 'ptbk --version && systemctl --user show-environment >/dev/null'
printf '%s\n' "$resolved_version" > /opt/promptbook/installed-version
printf '\nPrerequisites ready: ptbk %s, Node.js %s, %s, %s.\n' "$resolved_version" "$(node --version)" "$(git --version)" "$(google-chrome-stable --version 2>/dev/null || printf 'Chrome')"
printf 'The engine runs as the non-sudo user %s (home %s). Lingering is enabled, so its project service can start at boot once init registers it.\n' "$engine_user" "$engine_home"

if [[ -n "$pairing_url" ]]; then
    if ! runuser --login "$engine_user" --command 'ptbk init --help' | grep -- '--prepare-only' >/dev/null; then
        fail 'This installed ptbk version lacks engine-first setup. Update it to a release with --prepare-only and retry.'
    fi
    printf '\nStarting a pending initialization as %s. The owner setup link is printed to this session.\n' "$engine_user"
    status=0
    printf '%s\n' "$pairing_url" | runuser --login "$engine_user" --command \
        'cd ~ && PTBK_LOGIN_LOCATION=remote exec ptbk init --prepare-only --link-stdin --setup-link --non-interactive --json' >&3 2>&4 || status=$?
    unset pairing_url
    exit "$status"
fi

if [[ "$hand_off" == false ]]; then
    printf '\nServer prepared; initialization pending. No agenda or AI account has been configured.\nOpen the setup assistant in an interactive SSH terminal with:\n  %s\nor run: sudo -iu %s, then cd ~/projects/my-agenda && ptbk init --path "$PWD"\n' "$continuation" "$engine_user"
    exit 0
fi
if [[ "$attended_terminal" == false && "$noninteractive_init" == false ]]; then
    printf '\nServer prepared; initialization pending: no interactive terminal is available, so the setup assistant was not started.\nContinue in an SSH terminal with:\n  %s\n' "$continuation" >&2
    exit 3
fi

# Hand off to the ordinary initializer as the engine user (never root or the SSH administrator), from its home. The
# launcher supplies the remote sign-in context; the root-owned engine is updated by an administrator, not by init.
init_command='cd ~ && PTBK_LOGIN_LOCATION=remote exec ptbk init'
if [[ -n "$project_path" ]]; then printf -v init_command '%s --path %q' "$init_command" "$project_path"; fi
if [[ "$own_self_update" == false ]]; then init_command+=' --self-update no'; fi
for argument in ${init_args[@]+"${init_args[@]}"}; do printf -v init_command '%s %q' "$init_command" "$argument"; done
# Outcome lines; the attended handoff writes the terminal directly, so they are also appended to the log.
outcome() {
    printf '%s\n' "$@"
    if [[ "$attended_terminal" == true ]]; then printf '%s\n' "$@" >> "$log"; fi
}
status=0
if [[ "$attended_terminal" == true ]]; then
    # The wizard draws on the live terminal itself; its output (and any sign-in code) never reaches the log.
    exec >/dev/tty 2>&1
    # Let the log writer flush earlier lines before the wizard draws (bounded; it exits once nothing writes to it).
    for _ in {1..50}; do [[ -n "$logger" ]] && kill -0 "$logger" 2>/dev/null || break; sleep 0.1; done
    outcome '' "Starting the setup assistant (ptbk init) as $engine_user in this terminal…" ''
    runuser --pty --login --shell /bin/bash "$engine_user" --command "$init_command" </dev/tty || status=$?
else
    outcome '' "Starting ptbk init as $engine_user with the supplied noninteractive options…"
    runuser --login --shell /bin/bash "$engine_user" --command "$init_command" </dev/null || status=$?
fi
if (( status == 0 )); then
    outcome '' "The setup assistant finished. Later, connect over SSH, run sudo -iu $engine_user and use ptbk dashboard or ptbk status in the project folder."
else
    outcome '' "ptbk $resolved_version and its prerequisites stay installed, but setup did not finish (ptbk init exited with $status; see its summary above)." \
        'Installed components and saved setup are kept. Continue with the same command:' "  $continuation"
fi
exit "$status"
