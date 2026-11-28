#!/bin/sh

set -eu

LEGACY_GLOBAL_PTBK_SHIM='/usr/bin/ptbk'

require_command() {
    if command -v "$1" >/dev/null 2>&1; then
        return
    fi

    echo "Missing required command: $1" >&2
    exit 1
}

remove_legacy_ptbk_shim() {
    if [ ! -f "$LEGACY_GLOBAL_PTBK_SHIM" ]; then
        return
    fi

    if ! grep -Eq 'ts-node .*/src/cli/test/ptbk\.ts|npx --yes @promptbook/cli' "$LEGACY_GLOBAL_PTBK_SHIM"; then
        return
    fi

    if rm -f "$LEGACY_GLOBAL_PTBK_SHIM"; then
        echo "Removed legacy shim: $LEGACY_GLOBAL_PTBK_SHIM"
    else
        echo "Warning: Failed to remove legacy shim $LEGACY_GLOBAL_PTBK_SHIM" >&2
    fi
}

find_ptbk_command_path() {
    if command -v ptbk >/dev/null 2>&1; then
        command -v ptbk
        return
    fi

    npm_prefix="$(npm config get prefix)"

    for candidate in "$npm_prefix/ptbk" "$npm_prefix/bin/ptbk"; do
        if [ -x "$candidate" ]; then
            printf '%s\n' "$candidate"
            return
        fi
    done

    exit 1
}

verify_ptbk_installation() {
    ptbk_command_path="$(find_ptbk_command_path)"

    "$ptbk_command_path" --help >/dev/null 2>&1
    echo "Promptbook CLI installed successfully at $ptbk_command_path"
}

require_command npm
remove_legacy_ptbk_shim
npm install --global ptbk
hash -r 2>/dev/null || true
verify_ptbk_installation
