#!/usr/bin/env bash
# Prepare a fresh Ubuntu 24.04 x86-64 VPS. Project initialization stays attended.
set -Eeuo pipefail
umask 022

if [[ "${1:-}" == --help ]]; then
    printf 'Usage: sudo bash install.sh [published-ptbk-version]\nPrepares a dedicated promptbook user, Node.js 24, Git, Chrome and boot persistence.\nRun ptbk init as promptbook afterwards. No AI credentials are accepted by this script.\n'
    exit 0
fi
if (( $# > 1 )); then printf 'Expected at most one published ptbk version.\n' >&2; exit 1; fi
requested_version="${1:-latest}"
if [[ ! "$requested_version" =~ ^(latest|[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?)$ ]]; then
    printf 'Use latest or an exact published semantic version.\n' >&2; exit 1
fi
if (( EUID != 0 )); then printf 'Run this installer with sudo.\n' >&2; exit 1; fi
source /etc/os-release
if [[ "$ID" != ubuntu || "$VERSION_ID" != 24.04 || "$(uname -m)" != x86_64 ]]; then
    printf 'This installer supports Ubuntu 24.04 on x86-64 only.\n' >&2; exit 1
fi
if [[ -e /usr/local/bin/ptbk || -L /usr/local/bin/ptbk ]] && ! grep -q 'Promptbook VPS launcher' /usr/local/bin/ptbk; then
    printf 'An unrelated /usr/local/bin/ptbk already exists; leaving it unchanged.\n' >&2; exit 1
fi
if id promptbook >/dev/null 2>&1; then
    if [[ "$(getent passwd promptbook | cut -d: -f6)" != /var/lib/promptbook ]]; then
        printf 'Existing promptbook account has a different home; leaving it unchanged.\n' >&2; exit 1
    fi
fi

exec > >(tee -a /var/log/promptbook-install.log) 2>&1
trap 'printf "Promptbook installation failed at line %s. See /var/log/promptbook-install.log; project files were not initialized.\n" "$LINENO" >&2' ERR
export DEBIAN_FRONTEND=noninteractive
apt-get -o DPkg::Lock::Timeout=300 -o Acquire::Retries=3 update
apt-get -o DPkg::Lock::Timeout=300 -o Acquire::Retries=3 install -y --no-install-recommends ca-certificates curl xz-utils git dbus-user-session
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

# Resolve the public npm tag once, then install and record that exact version.
resolved_version="$(npm view "ptbk@$requested_version" version --registry=https://registry.npmjs.org/)"
[[ "$resolved_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]]
if [[ -f /opt/promptbook/installed-version ]] && [[ "$(cat /opt/promptbook/installed-version)" != "$resolved_version" ]]; then
    printf 'This host already has another engine version. Stop and back up projects before upgrading; this bootstrap does not replace a running engine.\n' >&2
    exit 1
fi
if [[ ! -f /opt/promptbook/installed-version || ! -x /opt/promptbook/engine/bin/ptbk ]]; then
    npm install --global --prefix /opt/promptbook/engine --registry=https://registry.npmjs.org/ "ptbk@$resolved_version"
fi
if ! command -v google-chrome-stable >/dev/null 2>&1; then
curl --fail --silent --show-error --location --retry 3 https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -o "$work_dir/google-chrome.deb"
apt-get -o DPkg::Lock::Timeout=300 -o Acquire::Retries=3 install -y --no-install-recommends "$work_dir/google-chrome.deb"
fi

if ! id promptbook >/dev/null 2>&1; then
    useradd --create-home --home-dir /var/lib/promptbook --shell /bin/bash promptbook
fi
chmod 700 /var/lib/promptbook
install -d -m 700 -o promptbook -g promptbook \
    /var/lib/promptbook/projects /var/lib/promptbook/projects/my-agenda \
    /var/lib/promptbook/.local /var/lib/promptbook/.local/bin /var/lib/promptbook/.local/share \
    /var/lib/promptbook/.config /var/lib/promptbook/.config/systemd /var/lib/promptbook/.config/systemd/user \
    /var/lib/promptbook/.cache
if [[ ! -e /var/lib/promptbook/.npmrc ]]; then
    printf 'prefix=/var/lib/promptbook/.local\n' > /var/lib/promptbook/.npmrc
    chown promptbook:promptbook /var/lib/promptbook/.npmrc
fi
if ! grep -q 'Promptbook VPS environment v2' /var/lib/promptbook/.profile; then
    cat >> /var/lib/promptbook/.profile <<'PROFILE'

# Promptbook VPS environment v2
export PATH="/opt/promptbook/node/bin:$HOME/.local/bin:$PATH"
export XDG_CONFIG_HOME="$HOME/.config"
export XDG_DATA_HOME="$HOME/.local/share"
export XDG_CACHE_HOME="$HOME/.cache"
if [ -d "/run/user/$(id -u)" ]; then
    export XDG_RUNTIME_DIR="/run/user/$(id -u)"
fi
PROFILE
    chown promptbook:promptbook /var/lib/promptbook/.profile
fi
cat > /usr/local/bin/ptbk <<'LAUNCHER'
#!/bin/sh
# Promptbook VPS launcher
export PATH="/opt/promptbook/node/bin:$HOME/.local/bin:$PATH"
exec /opt/promptbook/engine/bin/ptbk "$@"
LAUNCHER
chmod 755 /usr/local/bin/ptbk
loginctl enable-linger promptbook
systemctl start "user@$(id -u promptbook).service"
# A fresh service account needs a Git author before init can make its first commit.
# Preserve an existing identity; these defaults identify the local service, not a person.
runuser --login promptbook --command 'test -n "$(git config --global --get user.name || true)" || git config --global user.name "Promptbook"'
runuser --login promptbook --command 'test -n "$(git config --global --get user.email || true)" || git config --global user.email "promptbook@localhost"'
runuser --login promptbook --command 'ptbk --version && systemctl --user show-environment >/dev/null'
printf '%s\n' "$resolved_version" > /opt/promptbook/installed-version
printf '\nServer prerequisites are installed. No agenda or AI account has been configured.\nNext: sudo -iu promptbook\nThen: cd ~/projects/my-agenda && ptbk init --path "$PWD"\nChoose a headless browser. Use ptbk dashboard over SSH; no public dashboard port is needed.\n'
