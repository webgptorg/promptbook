#!/usr/bin/env bash

set -Eeuo pipefail

APP_NAME="${PTBK_PM2_APP_NAME:-promptbook-agents-server}"
INSTALL_DIR="${PTBK_INSTALL_DIR:-/opt/promptbook-agents-server}"
NODE_MAJOR_VERSION="${NODE_MAJOR_VERSION:-22}"
NODE_MINIMUM_VERSION="${NODE_MINIMUM_VERSION:-}"
PORT="${PORT:-${PTBK_PORT:-4440}}"
PTBK_FILE_STORAGE_MODE="${PTBK_FILE_STORAGE_MODE:-self-contained-s3}"
PTBK_DATA_DIR="${PTBK_DATA_DIR:-$INSTALL_DIR/data}"
PTBK_DATABASE_DIR="${PTBK_DATABASE_DIR:-$PTBK_DATA_DIR/database}"
PTBK_SELF_CONTAINED_S3_DIRECTORY="${PTBK_SELF_CONTAINED_S3_DIRECTORY:-$PTBK_DATA_DIR/s3}"
PTBK_SELF_CONTAINED_S3_PORT="${PTBK_SELF_CONTAINED_S3_PORT:-10000}"
PTBK_SELF_CONTAINED_S3_SERVICE_NAME="${PTBK_SELF_CONTAINED_S3_SERVICE_NAME:-promptbook-versitygw}"
PTBK_SELF_CONTAINED_S3_BUCKET="${PTBK_SELF_CONTAINED_S3_BUCKET:-promptbook-files}"
PTBK_SELF_CONTAINED_S3_REGION="${PTBK_SELF_CONTAINED_S3_REGION:-us-east-1}"
PTBK_EXTERNAL_S3_REGION="${PTBK_EXTERNAL_S3_REGION:-auto}"
PTBK_CDN_PATH_PREFIX="${PTBK_CDN_PATH_PREFIX:-ptbk-agents}"
PROMPTBOOK_REPOSITORY_URL="${PROMPTBOOK_REPOSITORY_URL:-https://github.com/webgptorg/promptbook.git}"
PROMPTBOOK_REPOSITORY_REF="${PROMPTBOOK_REPOSITORY_REF:-main}"
PTBK_BIN_DIR="${PTBK_BIN_DIR:-$INSTALL_DIR/bin}"
PTBK_RELEASES_DIR="${PTBK_RELEASES_DIR:-$PTBK_BIN_DIR}"
PROMPTBOOK_REPOSITORY_DIR="${PROMPTBOOK_REPOSITORY_DIR:-}"
PROMPTBOOK_LEGACY_REPOSITORY_DIR="${PROMPTBOOK_LEGACY_REPOSITORY_DIR:-$INSTALL_DIR/repository}"
PROMPTBOOK_REPOSITORY_RELEASE_NAME=""
PTBK_COMMAND_PATH="${PTBK_COMMAND_PATH:-$PTBK_BIN_DIR/ptbk}"
PTBK_GLOBAL_COMMAND_PATH="${PTBK_GLOBAL_COMMAND_PATH:-/usr/local/bin/ptbk}"
PTBK_PM2_BASE_APP_NAME="${PTBK_PM2_BASE_APP_NAME:-$APP_NAME}"
PTBK_AGENT="${PTBK_AGENT:-openai-codex}"
PTBK_MODEL="${PTBK_MODEL:-gpt-5.4}"
PTBK_THINKING_LEVEL="${PTBK_THINKING_LEVEL:-xhigh}"
PTBK_OPENAI_CODEX_USE_API_KEY="${PTBK_OPENAI_CODEX_USE_API_KEY:-0}"
PTBK_INSTALL_DEFAULT_AGENTS="${PTBK_INSTALL_DEFAULT_AGENTS:-yes}"
PTBK_NON_INTERACTIVE="${PTBK_NON_INTERACTIVE:-0}"
PTBK_CONFIRM_FRESH_VPS="${PTBK_CONFIRM_FRESH_VPS:-0}"
PTBK_SKIP_PM2_RESTART="${PTBK_SKIP_PM2_RESTART:-0}"
SERVERS="${SERVERS:-}"
LETS_ENCRYPT_EMAIL="${LETS_ENCRYPT_EMAIL:-${CERTBOT_EMAIL:-}}"
NGINX_SITE_NAME="${PTBK_NGINX_SITE_NAME:-promptbook-agents-server}"
NGINX_BRANDED_SERVER_HEADER="Promptbook Agents Server"
NGINX_BRANDING_CONF_PATH="/etc/nginx/conf.d/promptbook-agents-server-branding.conf"
NGINX_ERROR_SNIPPET_PATH="/etc/nginx/snippets/promptbook-agents-server-errors.conf"
NGINX_PROXY_SNIPPET_PATH="/etc/nginx/snippets/promptbook-agents-server-proxy.conf"
NGINX_FALLBACK_DIR="/var/www/promptbook-agents-server"
NGINX_FALLBACK_HTML_PATH="$NGINX_FALLBACK_DIR/fallback.html"
NGINX_FALLBACK_URI="/__promptbook_agents_server_error.html"
PROMPTBOOK_NGINX_FALLBACK_LOGO_RELATIVE_PATH="design/logo-blue-transparent-128.png"
PROMPTBOOK_SWAP_FILE="${PTBK_SWAP_FILE:-/swapfile-promptbook}"
MINIMUM_REQUIRED_MEMORY_MIB=8192
MINIMUM_REQUIRED_DISK_MIB=15360
PM2_HOURLY_RESTART_CRON='0 0 * * *'
APT_LOCK_TIMEOUT_SECONDS="${PTBK_APT_LOCK_TIMEOUT_SECONDS:-600}"
APT_LOCK_POLL_INTERVAL_SECONDS="${PTBK_APT_LOCK_POLL_INTERVAL_SECONDS:-5}"
APT_LOCK_PATHS=(
    /var/lib/dpkg/lock-frontend
    /var/lib/dpkg/lock
    /var/lib/apt/lists/lock
    /var/cache/apt/archives/lock
)
PTBK_SELF_UPDATE_STATUS_FILE="${PTBK_SELF_UPDATE_STATUS_FILE:-$INSTALL_DIR/.promptbook/self-update/self-update.status}"
PTBK_SELF_UPDATE_LOG_FILE="${PTBK_SELF_UPDATE_LOG_FILE:-$INSTALL_DIR/.promptbook/self-update/self-update.log}"
SELF_UPDATE_STARTED_AT=""
SELF_UPDATE_CURRENT_COMMIT=""
SELF_UPDATE_TARGET_COMMIT=""

SUDO=()
RUN_USER=""
RUN_GROUP=""
RUN_HOME=""
ENV_FILE=""
REQUESTED_OPENAI_API_KEY=""
REQUESTED_SENTRY_DSN=""
REQUESTED_ADMIN_PASSWORD=""
REQUESTED_PUBLIC_SITE_URL=""
REQUESTED_FILE_STORAGE_MODE="$PTBK_FILE_STORAGE_MODE"
REQUESTED_SELF_CONTAINED_S3_DIRECTORY="$PTBK_SELF_CONTAINED_S3_DIRECTORY"
REQUESTED_CDN_BUCKET="$PTBK_SELF_CONTAINED_S3_BUCKET"
REQUESTED_CDN_PATH_PREFIX="$PTBK_CDN_PATH_PREFIX"
REQUESTED_CDN_ENDPOINT="${CDN_ENDPOINT:-}"
REQUESTED_CDN_REGION="${CDN_REGION:-}"
REQUESTED_CDN_ACCESS_KEY_ID="${CDN_ACCESS_KEY_ID:-}"
REQUESTED_CDN_SECRET_ACCESS_KEY="${CDN_SECRET_ACCESS_KEY:-}"
REQUESTED_CDN_PUBLIC_URL="${NEXT_PUBLIC_CDN_PUBLIC_URL:-}"
REQUESTED_CDN_FORCE_PATH_STYLE="${CDN_FORCE_PATH_STYLE:-false}"
REQUESTED_ADDITIONAL_SWAP_MIB=0
REQUESTED_INSTALL_DEFAULT_AGENTS="yes"
IS_RUNNER_AUTHENTICATION_REQUESTED=""
GENERATED_ADMIN_PASSWORD=""
PUBLIC_IP_ADDRESS=""
DOMAINS=()

log() {
    printf '[promptbook-vps] %s\n' "$*"
}

warn() {
    printf '[promptbook-vps] Warning: %s\n' "$*" >&2
}

fail() {
    printf '[promptbook-vps] Error: %s\n' "$*" >&2
    exit 1
}

is_interactive() {
    ! is_non_interactive_mode_enabled && [[ -r /dev/tty && -w /dev/tty ]]
}

is_truthy_value() {
    local raw_value="${1:-}"

    case "${raw_value,,}" in
        1 | true | yes | y)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

is_non_interactive_mode_enabled() {
    is_truthy_value "$PTBK_NON_INTERACTIVE"
}

is_fresh_vps_installation_confirmation_enabled() {
    is_truthy_value "$PTBK_CONFIRM_FRESH_VPS"
}

prompt_with_default() {
    local label="$1"
    local default_value="$2"
    local answer=""

    if ! is_interactive; then
        printf '%s' "$default_value"
        return
    fi

    printf '%s [%s]: ' "$label" "$default_value" > /dev/tty
    read -r answer < /dev/tty || answer=""
    printf '%s' "${answer:-$default_value}"
}

prompt_yes_no() {
    local label="$1"
    local default_value="$2"
    local answer=""

    if ! is_interactive; then
        [[ "$default_value" == "yes" ]]
        return
    fi

    printf '%s [%s]: ' "$label" "$default_value" > /dev/tty
    read -r answer < /dev/tty || answer=""
    answer="${answer:-$default_value}"

    [[ "$answer" =~ ^[Yy] ]]
}

prompt_secret_with_default() {
    local label="$1"
    local default_description="$2"
    local default_value="$3"
    local answer=""

    if ! is_interactive; then
        printf '%s' "$default_value"
        return
    fi

    printf '%s [%s]: ' "$label" "$default_description" > /dev/tty
    read -r -s answer < /dev/tty || answer=""
    printf '\n' > /dev/tty
    printf '%s' "${answer:-$default_value}"
}

confirm_fresh_vps_installation() {
    warn "This installer is meant for a fresh VPS with no existing Promptbook data or server configuration to preserve."
    warn "Running it on a non-fresh VPS can overwrite existing data or configuration and cause data loss or service disruption."

    if is_fresh_vps_installation_confirmation_enabled; then
        log "Fresh VPS installation was explicitly confirmed through PTBK_CONFIRM_FRESH_VPS."
        return
    fi

    if is_non_interactive_mode_enabled; then
        fail "Standalone VPS installation requires explicit confirmation in non-interactive mode. Re-run with PTBK_CONFIRM_FRESH_VPS=yes only on a fresh VPS without data or configuration to preserve."
    fi

    if ! prompt_yes_no "Continue installation only if this is a fresh VPS without existing data or configuration to preserve?" "no"; then
        fail "Installation stopped because fresh VPS confirmation was not granted."
    fi
}

normalize_promptbook_repository_ref() {
    local raw_ref="${1:-}"
    local normalized_ref=""

    normalized_ref="$(printf '%s' "$raw_ref" | tr '[:upper:]' '[:lower:]' | sed -E 's/^[[:space:]]+|[[:space:]]+$//g')"

    case "$normalized_ref" in
        '' | production)
            printf 'production'
            ;;
        main | live)
            printf 'main'
            ;;
        preview)
            printf 'preview'
            ;;
        lts)
            printf 'lts'
            ;;
        *)
            fail "Unsupported Promptbook environment '$raw_ref'. Use one of: production, main, preview, LTS."
            ;;
    esac
}

resolve_promptbook_environment_label() {
    local repository_ref=""
    repository_ref="$(normalize_promptbook_repository_ref "$1")"

    case "$repository_ref" in
        production)
            printf 'Production'
            ;;
        main)
            printf 'Live'
            ;;
        preview)
            printf 'Preview'
            ;;
        lts)
            printf 'LTS'
            ;;
    esac
}

normalize_file_storage_mode() {
    local raw_mode="${1:-}"
    local normalized_mode=""

    normalized_mode="$(printf '%s' "$raw_mode" | tr '[:upper:]' '[:lower:]' | sed -E 's/^[[:space:]]+|[[:space:]]+$//g; s/_/-/g')"

    case "$normalized_mode" in
        '' | self-contained | self-contained-s3 | bundled | bundled-s3 | local | local-s3 | versitygw)
            printf 'self-contained-s3'
            ;;
        external | external-s3 | s3)
            printf 'external-s3'
            ;;
        *)
            fail "Unsupported file storage mode '$raw_mode'. Use self-contained-s3 or external-s3."
            ;;
    esac
}

is_self_contained_s3_storage_enabled() {
    [[ "$(normalize_file_storage_mode "$REQUESTED_FILE_STORAGE_MODE")" == "self-contained-s3" ]]
}

encode_status_field() {
    printf '%s' "$1" | base64 | tr -d '\n'
}

build_promptbook_nginx_fallback_logo_data_uri() {
    local promptbook_logo_path=""

    if [[ -z "$PROMPTBOOK_REPOSITORY_DIR" ]]; then
        fail "Cannot build the nginx fallback logo before the Promptbook repository directory is available."
    fi

    promptbook_logo_path="$PROMPTBOOK_REPOSITORY_DIR/$PROMPTBOOK_NGINX_FALLBACK_LOGO_RELATIVE_PATH"

    if [[ ! -f "$promptbook_logo_path" ]]; then
        fail "Promptbook logo asset was not found at $promptbook_logo_path."
    fi

    printf 'data:image/png;base64,%s' "$(base64 < "$promptbook_logo_path" | tr -d '\n')"
}

write_self_update_status_file() {
    local status="$1"
    local target_ref="$2"
    local current_step="$3"
    local error_message="${4:-}"
    local current_commit="${5:-}"
    local target_commit="${6:-}"
    local finished_at="${7:-}"
    local pid_value="${8:-$$}"
    local current_step_b64=""
    local error_message_b64=""

    current_step_b64="$(encode_status_field "$current_step")"
    error_message_b64="$(encode_status_field "$error_message")"

    "${SUDO[@]}" mkdir -p "$(dirname "$PTBK_SELF_UPDATE_STATUS_FILE")"
    "${SUDO[@]}" tee "$PTBK_SELF_UPDATE_STATUS_FILE" >/dev/null <<EOF
STATUS=$status
PID=$pid_value
TARGET_REF=$target_ref
CURRENT_STEP_B64=$current_step_b64
ERROR_MESSAGE_B64=$error_message_b64
STARTED_AT=$SELF_UPDATE_STARTED_AT
FINISHED_AT=$finished_at
CURRENT_COMMIT=$current_commit
TARGET_COMMIT=$target_commit
LOG_FILE=$PTBK_SELF_UPDATE_LOG_FILE
EOF
}

write_failed_self_update_status_on_exit() {
    local exit_code=$?
    local finished_at=""

    if [[ "$exit_code" -ne 0 ]]; then
        finished_at="$(date --utc --iso-8601=seconds)"
        write_self_update_status_file "failed" "$PROMPTBOOK_REPOSITORY_REF" "Self-update failed." "The standalone VPS self-update exited with status $exit_code. Review the installer log for details." "$SELF_UPDATE_CURRENT_COMMIT" "$SELF_UPDATE_TARGET_COMMIT" "$finished_at" "$$"
    fi

    exit "$exit_code"
}

read_repository_commit_sha() {
    local repository_dir="${1:-$PROMPTBOOK_REPOSITORY_DIR}"

    if [[ -z "$repository_dir" || ! -d "$repository_dir/.git" ]]; then
        printf ''
        return
    fi

    run_as_service_user git -C "$repository_dir" rev-parse HEAD 2>/dev/null || true
}

read_remote_repository_commit_sha() {
    local target_ref=""
    target_ref="$(normalize_promptbook_repository_ref "$1")"
    run_as_service_user git ls-remote "$PROMPTBOOK_REPOSITORY_URL" "refs/heads/$target_ref" 2>/dev/null | awk 'NR == 1 { print $1 }'
}

read_remote_repository_tag_for_commit() {
    local commit_sha="$1"

    if [[ -z "$commit_sha" ]]; then
        return
    fi

    run_as_service_user git ls-remote --tags "$PROMPTBOOK_REPOSITORY_URL" 2>/dev/null |
        awk -v commit_sha="$commit_sha" '
            $1 == commit_sha {
                tag = $2
                sub("^refs/tags/", "", tag)
                sub("\\^\\{\\}$", "", tag)
                if (tag != "") {
                    print tag
                }
            }
        ' |
        sort -Vr |
        head -n 1
}

sanitize_repository_release_name() {
    local raw_release_name="$1"
    local fallback_commit_sha="$2"

    if [[ "$raw_release_name" =~ ^[A-Za-z0-9._-]+$ ]]; then
        printf '%s' "$raw_release_name"
        return
    fi

    printf '%s' "${fallback_commit_sha:0:7}"
}

resolve_repository_release_name() {
    local commit_sha="$1"
    local tag_name=""

    tag_name="$(read_remote_repository_tag_for_commit "$commit_sha")"
    sanitize_repository_release_name "${tag_name:-${commit_sha:0:7}}" "$commit_sha"
}

resolve_repository_directory_for_commit() {
    local commit_sha="$1"
    local release_name=""

    release_name="$(resolve_repository_release_name "$commit_sha")"
    PROMPTBOOK_REPOSITORY_RELEASE_NAME="$release_name"
    printf '%s/%s' "$PTBK_RELEASES_DIR" "$release_name"
}

format_mib() {
    local value_mib="$1"

    if [[ "$value_mib" -ge 1024 ]]; then
        awk -v value_mib="$value_mib" 'BEGIN { printf "%.1f GiB", value_mib / 1024 }'
        return
    fi

    printf '%s MiB' "$value_mib"
}

join_by_comma() {
    local joined=""
    local item=""

    for item in "$@"; do
        if [[ -n "$joined" ]]; then
            joined+=","
        fi
        joined+="$item"
    done

    printf '%s' "$joined"
}

join_by_space() {
    local joined=""
    local item=""

    for item in "$@"; do
        if [[ -n "$joined" ]]; then
            joined+=" "
        fi
        joined+="$item"
    done

    printf '%s' "$joined"
}

shell_quote() {
    printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"
}

is_apt_lock_path_locked() {
    local lock_path="$1"
    local lock_inode=""

    if [[ ! -e "$lock_path" || ! -r /proc/locks ]]; then
        return 1
    fi

    lock_inode="$(stat -Lc '%i' "$lock_path" 2>/dev/null || true)"
    if [[ -z "$lock_inode" ]]; then
        return 1
    fi

    awk -v lock_inode="$lock_inode" '
        {
            split($6, device_and_inode, ":")
            if (device_and_inode[length(device_and_inode)] == lock_inode) {
                is_locked = 1
            }
        }
        END {
            exit is_locked ? 0 : 1
        }
    ' /proc/locks >/dev/null 2>&1
}

wait_for_apt_locks() {
    local lock_path=""
    local started_at=""
    local current_time=""
    local elapsed_seconds=0
    local is_wait_message_logged=0

    started_at="$(date +%s)"

    while true; do
        for lock_path in "${APT_LOCK_PATHS[@]}"; do
            if is_apt_lock_path_locked "$lock_path"; then
                current_time="$(date +%s)"
                elapsed_seconds=$((current_time - started_at))

                if [[ "$elapsed_seconds" -ge "$APT_LOCK_TIMEOUT_SECONDS" ]]; then
                    fail "Another package manager is using apt/dpkg locks and did not finish within ${APT_LOCK_TIMEOUT_SECONDS} seconds. Wait for the other process to finish and run the installer again."
                fi

                if [[ "$is_wait_message_logged" != "1" ]]; then
                    log "Another package manager is using apt/dpkg. Waiting up to ${APT_LOCK_TIMEOUT_SECONDS} seconds for the locks to clear."
                    is_wait_message_logged=1
                fi

                sleep "$APT_LOCK_POLL_INTERVAL_SECONDS"
                continue 2
            fi
        done

        return
    done
}

run_apt_get() {
    wait_for_apt_locks
    DEBIAN_FRONTEND=noninteractive "${SUDO[@]}" apt-get -o "DPkg::Lock::Timeout=${APT_LOCK_TIMEOUT_SECONDS}" "$@"
}

normalize_domain() {
    local raw_domain="$1"
    local normalized_domain=""

    normalized_domain="$(printf '%s' "$raw_domain" |
        tr '[:upper:]' '[:lower:]' |
        sed -E 's#^[[:space:]]+|[[:space:]]+$##g; s#^https?://##; s#/.*$##; s/[.]$//')"

    if [[ ! "$normalized_domain" =~ ^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$ ]]; then
        printf ''
        return
    fi

    printf '%s' "$normalized_domain"
}

build_domain_table_prefix() {
    local domain="$1"
    local prefix_suffix=""

    prefix_suffix="$(printf '%s' "$domain" |
        sed -E 's/-/_dash_/g; s/[.]/_/g; s/[^A-Za-z0-9_]/_/g; s/_+/_/g; s/^_+|_+$//g')"

    printf 'server_%s_' "$prefix_suffix"
}

resolve_existing_path() {
    local checked_path="$1"

    while [[ ! -e "$checked_path" ]]; do
        checked_path="$(dirname "$checked_path")"

        if [[ "$checked_path" == "/" ]]; then
            break
        fi
    done

    printf '%s' "$checked_path"
}

get_available_disk_space_mib() {
    local checked_path="$1"

    df -Pm "$checked_path" | awk 'NR == 2 { print $4 }'
}

get_filesystem_source() {
    local checked_path="$1"

    df -P "$checked_path" | awk 'NR == 2 { print $1 }'
}

get_total_memory_mib() {
    awk '
        /^(MemTotal|SwapTotal):/ {
            totalMemoryKiB += $2
        }
        END {
            printf "%d\n", totalMemoryKiB / 1024
        }
    ' /proc/meminfo
}

get_file_size_mib() {
    local file_path="$1"
    local file_size_bytes=0

    file_size_bytes="$(stat -c %s "$file_path")"
    printf '%d\n' $(((file_size_bytes + 1048575) / 1048576))
}

is_swap_file_active() {
    local swap_file="$1"

    swapon --show=NAME --noheadings 2>/dev/null |
        awk -v swap_file="$swap_file" '$1 == swap_file { isActive = 1 } END { exit(isActive == 1 ? 0 : 1) }'
}

write_swap_file() {
    local swap_file="$1"
    local swap_file_size_mib="$2"

    "${SUDO[@]}" install -o root -g root -m 600 /dev/null "$swap_file"

    if command -v fallocate >/dev/null 2>&1 &&
        "${SUDO[@]}" fallocate -l "${swap_file_size_mib}M" "$swap_file"; then
        return
    fi

    "${SUDO[@]}" dd if=/dev/zero of="$swap_file" bs=1M count="$swap_file_size_mib" status=none
}

ensure_swap_file_is_persistent() {
    local swap_file="$1"

    if awk -v swap_file="$swap_file" '$1 == swap_file && $3 == "swap" { isConfigured = 1 } END { exit(isConfigured == 1 ? 0 : 1) }' /etc/fstab; then
        return
    fi

    printf '%s none swap sw 0 0\n' "$swap_file" |
        "${SUDO[@]}" tee -a /etc/fstab >/dev/null
}

configure_swap_performance() {
    "${SUDO[@]}" tee /etc/sysctl.d/99-promptbook-swap.conf >/dev/null <<'EOF'
# Managed by the Promptbook Agents Server installer.
vm.swappiness=10
vm.vfs_cache_pressure=50
EOF
    "${SUDO[@]}" sysctl -p /etc/sysctl.d/99-promptbook-swap.conf >/dev/null
}

add_required_swap_file() {
    local additional_swap_mib="$1"
    local swap_file="$PROMPTBOOK_SWAP_FILE"
    local swap_directory=""
    local swap_disk_check_path=""
    local available_swap_disk_space_mib=0
    local existing_swap_file_size_mib=0
    local target_swap_file_size_mib="$additional_swap_mib"

    swap_directory="$(dirname "$swap_file")"
    swap_disk_check_path="$(resolve_existing_path "$swap_directory")"
    available_swap_disk_space_mib="$(get_available_disk_space_mib "$swap_disk_check_path")"

    if [[ "$available_swap_disk_space_mib" -lt "$additional_swap_mib" ]]; then
        fail "Cannot add $(format_mib "$additional_swap_mib") of swap at $swap_file because only $(format_mib "$available_swap_disk_space_mib") is free on $swap_disk_check_path."
    fi

    if [[ -e "$swap_file" ]]; then
        if ! is_swap_file_active "$swap_file"; then
            fail "$swap_file already exists but is not an active swap file. Remove it manually or set PTBK_SWAP_FILE to another path."
        fi

        existing_swap_file_size_mib="$(get_file_size_mib "$swap_file")"
        target_swap_file_size_mib=$((existing_swap_file_size_mib + additional_swap_mib))
        log "Resizing existing swap file $swap_file to $(format_mib "$target_swap_file_size_mib")."
        "${SUDO[@]}" swapoff "$swap_file"
    else
        log "Creating swap file $swap_file with $(format_mib "$additional_swap_mib")."
    fi

    if [[ ! -d "$swap_directory" ]]; then
        "${SUDO[@]}" install -d -m 755 "$swap_directory"
    fi

    write_swap_file "$swap_file" "$target_swap_file_size_mib"
    "${SUDO[@]}" chmod 600 "$swap_file"
    "${SUDO[@]}" mkswap "$swap_file" >/dev/null
    "${SUDO[@]}" swapon "$swap_file"
    ensure_swap_file_is_persistent "$swap_file"
    configure_swap_performance
}

confirm_minimum_disk_space() {
    local available_disk_space_mib="$1"
    local disk_check_path="$2"
    local availability_description="$3"

    if [[ "$available_disk_space_mib" -ge "$MINIMUM_REQUIRED_DISK_MIB" ]]; then
        return
    fi

    warn "Only $(format_mib "$available_disk_space_mib") $availability_description on $disk_check_path. Agents Server requires at least $(format_mib "$MINIMUM_REQUIRED_DISK_MIB")."

    if ! prompt_yes_no "Continue installation with low free disk space?" "no"; then
        fail "Installation stopped because the VPS does not have enough free disk space."
    fi
}

confirm_disk_space_after_swap() {
    local install_disk_check_path="$1"
    local available_disk_space_mib="$2"
    local additional_swap_mib="$3"
    local swap_disk_check_path=""
    local projected_disk_space_mib="$available_disk_space_mib"

    swap_disk_check_path="$(resolve_existing_path "$(dirname "$PROMPTBOOK_SWAP_FILE")")"

    if [[ "$(get_filesystem_source "$install_disk_check_path")" != "$(get_filesystem_source "$swap_disk_check_path")" ]]; then
        return
    fi

    projected_disk_space_mib=$((available_disk_space_mib - additional_swap_mib))
    if [[ "$projected_disk_space_mib" -lt 0 ]]; then
        projected_disk_space_mib=0
    fi

    confirm_minimum_disk_space "$projected_disk_space_mib" "$install_disk_check_path" "will remain after adding swap"
}

check_required_resources() {
    local install_disk_check_path=""
    local available_disk_space_mib=0
    local total_memory_mib=0
    local additional_swap_mib=0

    REQUESTED_ADDITIONAL_SWAP_MIB=0

    log "Checking VPS resources."

    install_disk_check_path="$(resolve_existing_path "$INSTALL_DIR")"
    available_disk_space_mib="$(get_available_disk_space_mib "$install_disk_check_path")"
    confirm_minimum_disk_space "$available_disk_space_mib" "$install_disk_check_path" "is available"

    total_memory_mib="$(get_total_memory_mib)"

    if [[ "$total_memory_mib" -ge "$MINIMUM_REQUIRED_MEMORY_MIB" ]]; then
        log "Resources OK: $(format_mib "$total_memory_mib") memory and $(format_mib "$available_disk_space_mib") free disk."
        return
    fi

    additional_swap_mib=$((MINIMUM_REQUIRED_MEMORY_MIB - total_memory_mib))
    warn "Only $(format_mib "$total_memory_mib") total memory (RAM + swap) is available. Agents Server requires at least $(format_mib "$MINIMUM_REQUIRED_MEMORY_MIB")."

    if ! prompt_yes_no "Add $(format_mib "$additional_swap_mib") of swap at $PROMPTBOOK_SWAP_FILE?" "yes"; then
        fail "Installation stopped because the VPS does not have enough memory."
    fi

    confirm_disk_space_after_swap "$install_disk_check_path" "$available_disk_space_mib" "$additional_swap_mib"
    REQUESTED_ADDITIONAL_SWAP_MIB="$additional_swap_mib"
    log "Swap will be configured after installation questions are answered."
}

configure_required_resources() {
    local total_memory_mib=0

    if [[ "$REQUESTED_ADDITIONAL_SWAP_MIB" -eq 0 ]]; then
        return
    fi

    add_required_swap_file "$REQUESTED_ADDITIONAL_SWAP_MIB"
    total_memory_mib="$(get_total_memory_mib)"

    if [[ "$total_memory_mib" -lt "$MINIMUM_REQUIRED_MEMORY_MIB" ]]; then
        fail "Swap was configured, but total memory is still only $(format_mib "$total_memory_mib")."
    fi

    log "Swap configured. Total memory is now $(format_mib "$total_memory_mib")."
}

append_domain() {
    local raw_domain="$1"
    local normalized_domain=""
    local existing_domain=""

    normalized_domain="$(normalize_domain "$raw_domain")"
    if [[ -z "$normalized_domain" ]]; then
        fail "Invalid domain '$raw_domain'. Use one or more DNS hostnames, for example example.com,www.example.com."
    fi

    for existing_domain in "${DOMAINS[@]}"; do
        if [[ "$existing_domain" == "$normalized_domain" ]]; then
            return
        fi
    done

    DOMAINS+=("$normalized_domain")
}

set_domains_from_csv() {
    local raw_domains="$1"
    local domain=""

    DOMAINS=()
    IFS=',' read -ra requested_domains <<< "$raw_domains"
    for domain in "${requested_domains[@]}"; do
        if [[ -z "${domain//[[:space:]]/}" ]]; then
            continue
        fi
        append_domain "$domain"
    done
}

initialize_sudo() {
    if [[ "$EUID" -eq 0 ]]; then
        SUDO=()
        return
    fi

    log "sudo is required to install system packages, Node.js, global npm tools, and the pm2 boot service."
    if is_interactive; then
        sudo -v
    else
        sudo -n -v || fail "Non-interactive installation requires root, passwordless sudo, or a cached sudo session."
    fi
    SUDO=(sudo)
}

resolve_run_user() {
    if [[ -n "${SUDO_USER:-}" && "${SUDO_USER:-}" != "root" ]]; then
        RUN_USER="$SUDO_USER"
    else
        RUN_USER="$(id -un)"
    fi

    RUN_GROUP="$(id -gn "$RUN_USER")"
    RUN_HOME="$(getent passwd "$RUN_USER" | cut -d: -f6)"

    if [[ -z "$RUN_HOME" ]]; then
        fail "Could not resolve home directory for user $RUN_USER."
    fi
}

run_as_service_user() {
    if [[ "$RUN_USER" == "root" ]]; then
        HOME="$RUN_HOME" "$@"
        return
    fi

    sudo -H -u "$RUN_USER" env HOME="$RUN_HOME" "$@"
}

check_platform() {
    if [[ ! -r /etc/os-release ]]; then
        fail "This installer is intended for Ubuntu 24.04 LTS x64."
    fi

    # shellcheck source=/dev/null
    source /etc/os-release

    if [[ "${ID:-}" != "ubuntu" ]]; then
        warn "Detected ${PRETTY_NAME:-unknown OS}; this installer is tested on Ubuntu 24.04 LTS x64."
    elif [[ "${VERSION_ID:-}" != "24.04" ]]; then
        warn "Detected Ubuntu ${VERSION_ID:-unknown}; this installer is tested on Ubuntu 24.04 LTS x64."
    fi

    local architecture=""
    architecture="$(dpkg --print-architecture)"
    if [[ "$architecture" != "amd64" ]]; then
        fail "Unsupported architecture $architecture. Use an x64/amd64 VPS."
    fi
}

install_system_packages() {
    log "Installing system packages."
    run_apt_get update
    run_apt_get install -y \
        ca-certificates \
        curl \
        git \
        gnupg \
        util-linux \
        tar \
        build-essential \
        python3 \
        make \
        g++ \
        openssl \
        nginx \
        libnginx-mod-http-headers-more-filter \
        certbot \
        python3-certbot-nginx
}

resolve_versitygw_release_asset_suffix() {
    local architecture=""

    architecture="$(uname -m)"
    case "$architecture" in
        x86_64 | amd64)
            printf '_Linux_x86_64.tar.gz'
            ;;
        aarch64 | arm64)
            printf '_Linux_arm64.tar.gz'
            ;;
        *)
            fail "Unsupported VersityGW architecture $architecture."
            ;;
    esac
}

resolve_latest_versitygw_download_url() {
    local asset_suffix=""
    asset_suffix="$(resolve_versitygw_release_asset_suffix)"

    curl -fsSL https://api.github.com/repos/versity/versitygw/releases/latest |
        awk -v asset_suffix="$asset_suffix" -F'"' '
            $2 == "browser_download_url" && $4 ~ asset_suffix "$" {
                print $4
                exit
            }
        '
}

install_versitygw_binary() {
    local download_url=""
    local temporary_directory=""
    local binary_path=""

    if command -v versitygw >/dev/null 2>&1; then
        log "VersityGW is already installed."
        return
    fi

    download_url="$(resolve_latest_versitygw_download_url)"
    if [[ -z "$download_url" ]]; then
        fail "Could not resolve the latest VersityGW Linux release download URL."
    fi

    log "Installing VersityGW from $download_url."
    temporary_directory="$(mktemp -d)"
    curl -fsSL "$download_url" -o "$temporary_directory/versitygw.tar.gz"
    tar -xzf "$temporary_directory/versitygw.tar.gz" -C "$temporary_directory"
    binary_path="$(find "$temporary_directory" -type f -name versitygw | head -n 1)"

    if [[ -z "$binary_path" ]]; then
        rm -rf "$temporary_directory"
        fail "Downloaded VersityGW archive did not contain a versitygw binary."
    fi

    "${SUDO[@]}" install -o root -g root -m 755 "$binary_path" /usr/local/bin/versitygw
    rm -rf "$temporary_directory"
}

configure_self_contained_s3_storage() {
    local storage_directory="$REQUESTED_SELF_CONTAINED_S3_DIRECTORY"
    local data_directory="$storage_directory/data"
    local iam_directory="$storage_directory/iam"
    local versioning_directory="$storage_directory/versions"
    local service_environment_file="/etc/default/${PTBK_SELF_CONTAINED_S3_SERVICE_NAME}"
    local service_file="/etc/systemd/system/${PTBK_SELF_CONTAINED_S3_SERVICE_NAME}.service"

    if ! is_self_contained_s3_storage_enabled; then
        return
    fi

    install_versitygw_binary

    log "Configuring self-contained S3 storage in $storage_directory."
    "${SUDO[@]}" install -d -o "$RUN_USER" -g "$RUN_GROUP" -m 750 "$storage_directory" "$data_directory" "$iam_directory" "$versioning_directory"
    "${SUDO[@]}" install -d -o "$RUN_USER" -g "$RUN_GROUP" -m 750 "$data_directory/$REQUESTED_CDN_BUCKET"

    "${SUDO[@]}" tee "$service_environment_file" >/dev/null <<EOF
ROOT_ACCESS_KEY=$REQUESTED_CDN_ACCESS_KEY_ID
ROOT_SECRET_KEY=$REQUESTED_CDN_SECRET_ACCESS_KEY
EOF
    "${SUDO[@]}" chown root:root "$service_environment_file"
    "${SUDO[@]}" chmod 600 "$service_environment_file"

    "${SUDO[@]}" tee "$service_file" >/dev/null <<EOF
[Unit]
Description=Promptbook self-contained S3 storage (VersityGW)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$RUN_USER
Group=$RUN_GROUP
EnvironmentFile=$service_environment_file
ExecStart=/usr/local/bin/versitygw --port :$PTBK_SELF_CONTAINED_S3_PORT --iam-dir $iam_directory posix --versioning-dir $versioning_directory $data_directory
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=$storage_directory

[Install]
WantedBy=multi-user.target
EOF

    "${SUDO[@]}" systemctl daemon-reload
    "${SUDO[@]}" systemctl enable "$PTBK_SELF_CONTAINED_S3_SERVICE_NAME" >/dev/null
    "${SUDO[@]}" systemctl restart "$PTBK_SELF_CONTAINED_S3_SERVICE_NAME"
}

is_node_version_supported() {
    local minimum_version=""
    minimum_version="$(resolve_node_minimum_version)"

    command -v node >/dev/null 2>&1 &&
        NODE_MINIMUM_VERSION="$minimum_version" node -e '
            const currentParts = process.versions.node.split(".").map(Number);
            const minimumParts = (process.env.NODE_MINIMUM_VERSION || "22.12.0").split(".").map(Number);
            const maxLength = Math.max(currentParts.length, minimumParts.length);

            for (let index = 0; index < maxLength; index++) {
                const currentPart = currentParts[index] || 0;
                const minimumPart = minimumParts[index] || 0;

                if (currentPart > minimumPart) {
                    process.exit(0);
                }

                if (currentPart < minimumPart) {
                    process.exit(1);
                }
            }

            process.exit(0);
        ' >/dev/null 2>&1
}

resolve_node_minimum_version() {
    if [[ -n "$NODE_MINIMUM_VERSION" ]]; then
        printf '%s' "$NODE_MINIMUM_VERSION"
        return
    fi

    case "$NODE_MAJOR_VERSION" in
        20)
            printf '20.19.0'
            ;;
        22)
            printf '22.12.0'
            ;;
        *)
            printf '%s.0.0' "$NODE_MAJOR_VERSION"
            ;;
    esac
}

install_nodejs() {
    local minimum_version=""
    minimum_version="$(resolve_node_minimum_version)"

    if is_node_version_supported && command -v npm >/dev/null 2>&1; then
        log "Node.js $(node --version) is already installed."
        return
    fi

    log "Installing Node.js ${NODE_MAJOR_VERSION}.x from NodeSource (minimum ${minimum_version})."
    "${SUDO[@]}" install -d -m 0755 /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key |
        "${SUDO[@]}" gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR_VERSION}.x nodistro main" |
        "${SUDO[@]}" tee /etc/apt/sources.list.d/nodesource.list >/dev/null
    run_apt_get update
    run_apt_get install -y nodejs
}

install_global_process_manager() {
    log "Installing pm2."
    "${SUDO[@]}" npm install -g pm2

    if ! command -v pm2 >/dev/null 2>&1; then
        fail "The pm2 command was not installed. Check npm global installation output above."
    fi
}

is_path_inside_directory() {
    local checked_path="$1"
    local parent_path="$2"
    local resolved_checked_path=""
    local resolved_parent_path=""

    resolved_checked_path="$(realpath -m "$checked_path")"
    resolved_parent_path="$(realpath -m "$parent_path")"

    [[ "$resolved_checked_path" == "$resolved_parent_path"/* ]]
}

remove_promptbook_repository_directory_if_safe() {
    local repository_dir="$1"
    local current_repository_dir="${2:-$PROMPTBOOK_REPOSITORY_DIR}"
    local resolved_repository_dir=""
    local resolved_current_repository_dir=""
    local resolved_legacy_repository_dir=""

    if [[ -z "$repository_dir" || ! -e "$repository_dir" ]]; then
        return
    fi

    resolved_repository_dir="$(realpath -m "$repository_dir")"
    resolved_current_repository_dir="$(realpath -m "$current_repository_dir")"
    resolved_legacy_repository_dir="$(realpath -m "$PROMPTBOOK_LEGACY_REPOSITORY_DIR")"

    if [[ "$resolved_repository_dir" == "$resolved_current_repository_dir" ]]; then
        return
    fi

    if [[ "$resolved_repository_dir" == "/" || "$resolved_repository_dir" == "$(realpath -m "$INSTALL_DIR")" ]]; then
        fail "Refusing to remove unsafe Promptbook repository path '$repository_dir'."
    fi

    if [[ "$resolved_repository_dir" != "$resolved_legacy_repository_dir" ]] && ! is_path_inside_directory "$resolved_repository_dir" "$PTBK_RELEASES_DIR"; then
        fail "Refusing to remove Promptbook repository path outside $PTBK_RELEASES_DIR: $repository_dir."
    fi

    log "Removing old Promptbook repository $resolved_repository_dir."
    "${SUDO[@]}" rm -rf -- "$resolved_repository_dir"
}

install_promptbook_repository() {
    local target_commit_sha=""
    local target_repository_dir=""
    local staging_repository_dir=""
    local existing_commit_sha=""

    target_commit_sha="$(read_remote_repository_commit_sha "$PROMPTBOOK_REPOSITORY_REF")"
    if [[ -z "$target_commit_sha" ]]; then
        fail "Could not resolve the latest commit for Promptbook branch '$PROMPTBOOK_REPOSITORY_REF'."
    fi

    target_repository_dir="$(resolve_repository_directory_for_commit "$target_commit_sha")"
    staging_repository_dir="$PTBK_RELEASES_DIR/.install-${PROMPTBOOK_REPOSITORY_RELEASE_NAME}-$$"

    log "Installing Promptbook from $PROMPTBOOK_REPOSITORY_URL ($PROMPTBOOK_REPOSITORY_REF) into $target_repository_dir."
    "${SUDO[@]}" mkdir -p "$PTBK_RELEASES_DIR"
    "${SUDO[@]}" chown -R "$RUN_USER:$RUN_GROUP" "$PTBK_RELEASES_DIR"

    if [[ -d "$target_repository_dir/.git" ]]; then
        existing_commit_sha="$(read_repository_commit_sha "$target_repository_dir")"
        if [[ "$existing_commit_sha" != "$target_commit_sha" ]]; then
            fail "$target_repository_dir already contains commit $existing_commit_sha, expected $target_commit_sha."
        fi

        PROMPTBOOK_REPOSITORY_DIR="$target_repository_dir"
        log "Promptbook checkout $PROMPTBOOK_REPOSITORY_RELEASE_NAME already exists; refreshing dependencies."
        run_as_service_user bash -lc "cd $(shell_quote "$PROMPTBOOK_REPOSITORY_DIR") && npm ci --include=dev"
        return
    fi

    if [[ -e "$target_repository_dir" ]] && find "$target_repository_dir" -mindepth 1 -maxdepth 1 | grep -q .; then
        fail "$target_repository_dir exists and is not an empty Promptbook git checkout."
    fi

    remove_promptbook_repository_directory_if_safe "$staging_repository_dir" "$target_repository_dir"
    run_as_service_user git clone --depth 1 --branch "$PROMPTBOOK_REPOSITORY_REF" "$PROMPTBOOK_REPOSITORY_URL" "$staging_repository_dir"
    run_as_service_user git -C "$staging_repository_dir" checkout --detach "$target_commit_sha"

    log "Installing Promptbook repository dependencies."
    run_as_service_user bash -lc "cd $(shell_quote "$staging_repository_dir") && npm ci --include=dev"
    if [[ -d "$target_repository_dir" ]]; then
        run_as_service_user rmdir "$target_repository_dir"
    fi
    run_as_service_user mv "$staging_repository_dir" "$target_repository_dir"
    PROMPTBOOK_REPOSITORY_DIR="$target_repository_dir"
}

install_agents_server_browser_dependencies() {
    log "Installing Chromium and Playwright system dependencies for Agents Server browser features."
    wait_for_apt_locks
    "${SUDO[@]}" bash -lc "cd $(shell_quote "$PROMPTBOOK_REPOSITORY_DIR") && npx playwright install-deps chromium"
    run_as_service_user bash -lc "cd $(shell_quote "$PROMPTBOOK_REPOSITORY_DIR") && npx playwright install chromium"
}

install_promptbook_cli_launcher() {
    local global_command_directory=""

    log "Writing Promptbook CLI launcher."
    "${SUDO[@]}" mkdir -p "$PTBK_BIN_DIR"
    "${SUDO[@]}" chown "$RUN_USER:$RUN_GROUP" "$PTBK_BIN_DIR"
    "${SUDO[@]}" tee "$PTBK_COMMAND_PATH" >/dev/null <<EOF
#!/usr/bin/env bash
set -Eeuo pipefail

PROMPTBOOK_REPOSITORY_DIR=$(shell_quote "$PROMPTBOOK_REPOSITORY_DIR")
export NODE_PATH="\$PROMPTBOOK_REPOSITORY_DIR/node_modules\${NODE_PATH:+:\$NODE_PATH}"

exec "\$PROMPTBOOK_REPOSITORY_DIR/node_modules/.bin/ts-node" "\$PROMPTBOOK_REPOSITORY_DIR/src/cli/test/ptbk.ts" "\$@"
EOF
    "${SUDO[@]}" chown "$RUN_USER:$RUN_GROUP" "$PTBK_COMMAND_PATH"
    "${SUDO[@]}" chmod 755 "$PTBK_COMMAND_PATH"

    if [[ -n "$PTBK_GLOBAL_COMMAND_PATH" ]]; then
        global_command_directory="$(dirname "$PTBK_GLOBAL_COMMAND_PATH")"
        "${SUDO[@]}" mkdir -p "$global_command_directory"
        "${SUDO[@]}" ln -sfn "$PTBK_COMMAND_PATH" "$PTBK_GLOBAL_COMMAND_PATH"
    fi

    run_as_service_user "$PTBK_COMMAND_PATH" --help >/dev/null
    verify_promptbook_cli_supports_agents_server
}

verify_promptbook_cli_supports_agents_server() {
    if run_as_service_user "$PTBK_COMMAND_PATH" agents-server init --help >/dev/null 2>&1; then
        return
    fi

    fail "The Promptbook repository branch '$PROMPTBOOK_REPOSITORY_REF' does not provide 'ptbk agents-server init'. Choose main or another branch that includes standalone Agents Server support."
}

install_runner_dependencies() {
    case "$PTBK_AGENT" in
        github-copilot)
            if command -v copilot >/dev/null 2>&1; then
                log "GitHub Copilot CLI is already installed."
                return
            fi

            log "Installing GitHub Copilot CLI."
            "${SUDO[@]}" env npm_config_ignore_scripts=false npm install -g @github/copilot
            ;;
        openai-codex)
            if command -v codex >/dev/null 2>&1; then
                log "OpenAI Codex CLI is already installed."
                return
            fi

            log "Installing OpenAI Codex CLI."
            "${SUDO[@]}" npm install -g @openai/codex
            ;;
        claude-code)
            if command -v claude >/dev/null 2>&1; then
                log "Claude Code CLI is already installed."
                return
            fi

            log "Installing Claude Code CLI."
            "${SUDO[@]}" npm install -g @anthropic-ai/claude-code
            ;;
        gemini)
            if command -v gemini >/dev/null 2>&1; then
                log "Gemini CLI is already installed."
                return
            fi

            log "Installing Gemini CLI."
            "${SUDO[@]}" npm install -g @google/gemini-cli
            ;;
        *)
            warn "No automatic dependency installer is defined for runner '$PTBK_AGENT'. Make sure its CLI is available on PATH."
            ;;
    esac
}

resolve_runner_authentication_command() {
    case "$PTBK_AGENT" in
        github-copilot)
            printf 'copilot'
            ;;
        openai-codex)
            printf 'codex'
            ;;
        claude-code)
            printf 'claude'
            ;;
        opencode)
            printf 'opencode'
            ;;
        gemini)
            printf 'gemini'
            ;;
        *)
            printf ''
            ;;
    esac
}

prompt_runner_authentication_preference() {
    local authentication_command=""

    IS_RUNNER_AUTHENTICATION_REQUESTED=""

    authentication_command="$(resolve_runner_authentication_command)"
    if [[ -z "$authentication_command" ]]; then
        return
    fi

    if [[ "$PTBK_AGENT" == "github-copilot" ]] && [[ -n "${COPILOT_GITHUB_TOKEN:-}" || -n "${GH_TOKEN:-}" ]]; then
        IS_RUNNER_AUTHENTICATION_REQUESTED=0
        return
    fi

    if is_openai_codex_api_key_runner_configured; then
        IS_RUNNER_AUTHENTICATION_REQUESTED=0
        return
    fi

    if ! is_interactive; then
        IS_RUNNER_AUTHENTICATION_REQUESTED=0
        return
    fi

    if prompt_yes_no "Open the $PTBK_AGENT CLI for authentication when dependencies are ready?" "yes"; then
        IS_RUNNER_AUTHENTICATION_REQUESTED=1
    else
        IS_RUNNER_AUTHENTICATION_REQUESTED=0
    fi
}

run_runner_authentication_command() {
    local authentication_command=""

    authentication_command="$(resolve_runner_authentication_command)"
    if [[ -z "$authentication_command" ]]; then
        warn "No interactive authentication command is defined for runner '$PTBK_AGENT'."
        return 0
    fi

    if command -v script >/dev/null 2>&1; then
        run_as_service_user bash -lc "cd $(shell_quote "$INSTALL_DIR") && exec script -qfec $(shell_quote "$authentication_command") /dev/null"
        return
    fi

    warn "The 'script' command is not available, starting the runner CLI without a pseudo-terminal."
    run_as_service_user bash -lc "cd $(shell_quote "$INSTALL_DIR") && exec $authentication_command"
}

run_server_cli_shell_command() {
    if command -v script >/dev/null 2>&1; then
        run_as_service_user bash -lc "cd $(shell_quote "$INSTALL_DIR") && exec script -qfec bash /dev/null"
        return
    fi

    warn "The 'script' command is not available, starting the shell without a pseudo-terminal."
    run_as_service_user bash -lc "cd $(shell_quote "$INSTALL_DIR") && exec bash -i"
}

resolve_default_public_url() {
    local ip_address=""
    ip_address="${PUBLIC_IP_ADDRESS:-}"

    if [[ -z "$ip_address" ]]; then
        ip_address="$(resolve_public_ip_address)"
    fi

    printf 'http://%s' "$ip_address"
}

resolve_public_ip_address() {
    local ip_address=""

    ip_address="$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || true)"

    if [[ -z "$ip_address" ]]; then
        ip_address="$(hostname -I 2>/dev/null | awk '{ print $1 }' || true)"
    fi

    if [[ -z "$ip_address" ]]; then
        ip_address="localhost"
    fi

    printf '%s' "$ip_address"
}

resolve_default_public_site_url() {
    local first_domain="${DOMAINS[0]:-}"
    local default_public_url=""

    if [[ -n "$first_domain" ]]; then
        default_public_url="${PTBK_PUBLIC_SITE_URL:-${NEXT_PUBLIC_SITE_URL:-https://${first_domain}}}"
    else
        default_public_url="${PTBK_PUBLIC_SITE_URL:-${NEXT_PUBLIC_SITE_URL:-$(resolve_default_public_url)}}"
    fi

    printf '%s' "$default_public_url"
}

configure_install_directory() {
    log "Configuring $INSTALL_DIR."
    "${SUDO[@]}" mkdir -p "$INSTALL_DIR/.promptbook" "$INSTALL_DIR/.logs" "$PTBK_RELEASES_DIR" "$PTBK_DATABASE_DIR"
    "${SUDO[@]}" chown -R "$RUN_USER:$RUN_GROUP" "$INSTALL_DIR"

    ENV_FILE="$INSTALL_DIR/.env"
    run_as_service_user touch "$ENV_FILE"
    run_as_service_user chmod 600 "$ENV_FILE"
}

set_env_value() {
    local key="$1"
    local value="$2"
    local temporary_file=""
    temporary_file="$(mktemp)"

    if [[ -f "$ENV_FILE" && -s "$ENV_FILE" ]]; then
        awk -v key="$key" -v value="$value" '
            BEGIN { isUpdated = 0 }
            $0 ~ "^" key "=" {
                print key "=" value
                isUpdated = 1
                next
            }
            { print }
            END {
                if (isUpdated == 0) {
                    print key "=" value
                }
            }
        ' "$ENV_FILE" > "$temporary_file"
    else
        printf '%s=%s\n' "$key" "$value" > "$temporary_file"
    fi

    install -m 600 -o "$RUN_USER" -g "$RUN_GROUP" "$temporary_file" "$ENV_FILE"
    rm -f "$temporary_file"
}

get_env_value() {
    local key="$1"
    local existing_env_file="${ENV_FILE:-$INSTALL_DIR/.env}"

    if [[ ! -r "$existing_env_file" ]]; then
        return
    fi

    awk -v key="$key" '
        $0 ~ "^" key "=" {
            value = substr($0, length(key) + 2)
            isFound = 1
        }
        END {
            if (isFound == 1) {
                print value
            }
        }
    ' "$existing_env_file"
}

has_non_empty_env_value() {
    local key="$1"
    [[ -f "$ENV_FILE" ]] && grep -Eq "^${key}=.+" "$ENV_FILE"
}

resolve_openai_codex_api_key_usage() {
    local openai_api_key="${REQUESTED_OPENAI_API_KEY:-}"

    if [[ -z "$openai_api_key" ]]; then
        openai_api_key="$(get_env_value OPENAI_API_KEY)"
    fi

    if [[ -z "$openai_api_key" ]]; then
        openai_api_key="${OPENAI_API_KEY:-}"
    fi

    if [[ -n "$openai_api_key" ]]; then
        printf '1'
        return
    fi

    printf '0'
}

is_openai_codex_api_key_runner_configured() {
    [[ "$PTBK_AGENT" == "openai-codex" ]] && [[ "$(resolve_openai_codex_api_key_usage)" == "1" ]]
}

resolve_secret_default() {
    local key=""
    local existing_value=""

    for key in "$@"; do
        existing_value="$(get_env_value "$key")"

        if [[ -n "$existing_value" ]]; then
            printf '%s' "$existing_value"
            return
        fi

        existing_value="${!key:-}"
        if [[ -n "$existing_value" ]]; then
            printf '%s' "$existing_value"
            return
        fi
    done
}

resolve_secret_default_description() {
    local default_value="$1"
    local empty_description="$2"

    if [[ -n "$default_value" ]]; then
        printf 'keep existing'
        return
    fi

    printf '%s' "$empty_description"
}

prompt_api_keys_and_admin_password() {
    local default_openai_api_key=""
    local default_sentry_dsn=""
    local default_admin_password=""
    local openai_api_key_default_description="empty"
    local sentry_dsn_default_description="empty"
    local admin_password_default_description="auto-generate"

    default_openai_api_key="$(resolve_secret_default OPENAI_API_KEY)"
    default_sentry_dsn="$(resolve_secret_default SENTRY_DSN NEXT_PUBLIC_SENTRY_DSN)"
    default_admin_password="$(resolve_secret_default ADMIN_PASSWORD)"

    openai_api_key_default_description="$(resolve_secret_default_description "$default_openai_api_key" "empty")"
    sentry_dsn_default_description="$(resolve_secret_default_description "$default_sentry_dsn" "empty")"
    admin_password_default_description="$(resolve_secret_default_description "$default_admin_password" "auto-generate")"

    log "Press Enter to leave the OpenAI API key empty or keep the current value."
    REQUESTED_OPENAI_API_KEY="$(
        prompt_secret_with_default "OpenAI API key (optional)" "$openai_api_key_default_description" "$default_openai_api_key"
    )"

    log "Press Enter to leave the Sentry DSN empty or keep the current value."
    REQUESTED_SENTRY_DSN="$(
        prompt_secret_with_default "Sentry DSN (optional)" "$sentry_dsn_default_description" "$default_sentry_dsn"
    )"

    log "Press Enter to auto-generate the admin password or keep the current value."
    REQUESTED_ADMIN_PASSWORD="$(
        prompt_secret_with_default "Admin password" "$admin_password_default_description" "$default_admin_password"
    )"
}

prompt_public_site_url() {
    local default_public_url=""

    default_public_url="$(resolve_default_public_site_url)"
    REQUESTED_PUBLIC_SITE_URL="$(prompt_with_default "Public Agents Server URL" "$default_public_url")"
}

trim_trailing_slashes() {
    printf '%s' "$1" | sed -E 's#/+$##'
}

resolve_self_contained_s3_public_url() {
    local public_site_url="$1"
    local bucket="$2"
    local normalized_public_site_url=""

    normalized_public_site_url="$(trim_trailing_slashes "$public_site_url")"
    printf '%s/s3/%s/' "$normalized_public_site_url" "$bucket"
}

resolve_file_storage_default() {
    local key="$1"
    local fallback="$2"
    local existing_value=""

    existing_value="$(get_env_value "$key")"
    if [[ -n "$existing_value" ]]; then
        printf '%s' "$existing_value"
        return
    fi

    printf '%s' "$fallback"
}

resolve_boolean_default_label() {
    local raw_value="$1"

    if [[ "$raw_value" =~ ^([Tt][Rr][Uu][Ee]|1|[Yy][Ee][Ss]|[Yy])$ ]]; then
        printf 'yes'
        return
    fi

    printf 'no'
}

resolve_default_agents_installation_default() {
    local existing_value=""

    existing_value="$(get_env_value PTBK_INSTALL_DEFAULT_AGENTS)"
    if [[ -n "$existing_value" ]]; then
        resolve_boolean_default_label "$existing_value"
        return
    fi

    resolve_boolean_default_label "$PTBK_INSTALL_DEFAULT_AGENTS"
}

prompt_default_agents_installation() {
    local default_installation_value=""

    default_installation_value="$(resolve_default_agents_installation_default)"
    if prompt_yes_no "Install bundled default agents?" "$default_installation_value"; then
        REQUESTED_INSTALL_DEFAULT_AGENTS="yes"
    else
        REQUESTED_INSTALL_DEFAULT_AGENTS="no"
    fi
}

prompt_file_storage() {
    local existing_mode=""
    local default_mode=""
    local default_directory=""
    local default_bucket=""
    local default_path_prefix=""
    local default_endpoint=""
    local default_region=""
    local default_access_key_id=""
    local default_secret_access_key=""
    local default_public_url=""
    local default_force_path_style=""

    existing_mode="$(get_env_value PTBK_FILE_STORAGE_MODE)"
    default_mode="$(normalize_file_storage_mode "${existing_mode:-$PTBK_FILE_STORAGE_MODE}")"

    if prompt_yes_no "Use self-contained S3 file storage with VersityGW?" "$([[ "$default_mode" == "self-contained-s3" ]] && printf 'yes' || printf 'no')"; then
        REQUESTED_FILE_STORAGE_MODE="self-contained-s3"
        default_directory="$(resolve_file_storage_default PTBK_SELF_CONTAINED_S3_DIRECTORY "$PTBK_SELF_CONTAINED_S3_DIRECTORY")"
        default_bucket="$(resolve_file_storage_default CDN_BUCKET "$PTBK_SELF_CONTAINED_S3_BUCKET")"
        default_path_prefix="$(resolve_file_storage_default NEXT_PUBLIC_CDN_PATH_PREFIX "$PTBK_CDN_PATH_PREFIX")"

        REQUESTED_SELF_CONTAINED_S3_DIRECTORY="$(prompt_with_default "Self-contained S3 files directory" "$default_directory")"
        REQUESTED_CDN_BUCKET="$(prompt_with_default "Self-contained S3 bucket" "$default_bucket")"
        REQUESTED_CDN_PATH_PREFIX="$(prompt_with_default "S3 path prefix" "$default_path_prefix")"
        REQUESTED_CDN_ENDPOINT="http://127.0.0.1:${PTBK_SELF_CONTAINED_S3_PORT}"
        REQUESTED_CDN_REGION="$PTBK_SELF_CONTAINED_S3_REGION"
        REQUESTED_CDN_PUBLIC_URL="$(resolve_self_contained_s3_public_url "$REQUESTED_PUBLIC_SITE_URL" "$REQUESTED_CDN_BUCKET")"
        REQUESTED_CDN_FORCE_PATH_STYLE="true"
        return
    fi

    REQUESTED_FILE_STORAGE_MODE="external-s3"
    default_bucket="$(resolve_file_storage_default CDN_BUCKET "$PTBK_SELF_CONTAINED_S3_BUCKET")"
    default_path_prefix="$(resolve_file_storage_default NEXT_PUBLIC_CDN_PATH_PREFIX "$PTBK_CDN_PATH_PREFIX")"
    default_endpoint="$(resolve_file_storage_default CDN_ENDPOINT "$REQUESTED_CDN_ENDPOINT")"
    default_region="$(resolve_file_storage_default CDN_REGION "$PTBK_EXTERNAL_S3_REGION")"
    default_access_key_id="$(resolve_file_storage_default CDN_ACCESS_KEY_ID "$REQUESTED_CDN_ACCESS_KEY_ID")"
    default_secret_access_key="$(resolve_file_storage_default CDN_SECRET_ACCESS_KEY "$REQUESTED_CDN_SECRET_ACCESS_KEY")"
    default_public_url="$(resolve_file_storage_default NEXT_PUBLIC_CDN_PUBLIC_URL "$REQUESTED_CDN_PUBLIC_URL")"
    default_force_path_style="$(resolve_boolean_default_label "$(resolve_file_storage_default CDN_FORCE_PATH_STYLE "$REQUESTED_CDN_FORCE_PATH_STYLE")")"

    REQUESTED_CDN_BUCKET="$(prompt_with_default "External S3 bucket" "$default_bucket")"
    REQUESTED_CDN_PATH_PREFIX="$(prompt_with_default "S3 path prefix" "$default_path_prefix")"
    REQUESTED_CDN_ENDPOINT="$(prompt_with_default "External S3 endpoint" "$default_endpoint")"
    REQUESTED_CDN_REGION="$(prompt_with_default "External S3 region (use auto for Cloudflare R2)" "$default_region")"
    REQUESTED_CDN_ACCESS_KEY_ID="$(prompt_with_default "External S3 access key ID" "$default_access_key_id")"
    REQUESTED_CDN_SECRET_ACCESS_KEY="$(
        prompt_secret_with_default "External S3 secret access key" "$([[ -n "$default_secret_access_key" ]] && printf 'keep existing' || printf 'empty')" "$default_secret_access_key"
    )"
    REQUESTED_CDN_PUBLIC_URL="$(prompt_with_default "External S3 public URL" "$default_public_url")"
    if prompt_yes_no "Use S3 path-style requests for external storage?" "$default_force_path_style"; then
        REQUESTED_CDN_FORCE_PATH_STYLE="true"
    else
        REQUESTED_CDN_FORCE_PATH_STYLE="false"
    fi
}

configure_domains() {
    local default_domains="$SERVERS"
    local existing_env_file="${ENV_FILE:-$INSTALL_DIR/.env}"
    local requested_domains=""
    local domain=""

    if [[ -z "$default_domains" && -r "$existing_env_file" ]]; then
        default_domains="$(grep -E '^SERVERS=' "$existing_env_file" | tail -n 1 | cut -d= -f2- || true)"
    fi

    requested_domains="$(prompt_with_default "Primary domain (optional, comma-separated for advanced use)" "$default_domains")"
    set_domains_from_csv "$requested_domains"

    SERVERS="$(join_by_comma "${DOMAINS[@]}")"
    PUBLIC_IP_ADDRESS="$(resolve_public_ip_address)"

    if [[ "${#DOMAINS[@]}" -eq 0 ]]; then
        log "No custom domain configured. The server will be available on http://$PUBLIC_IP_ADDRESS and domains can be added later from the super admin UI."
        return
    fi

    log "Before SSL is issued, point these DNS records to this VPS:"
    for domain in "${DOMAINS[@]}"; do
        log "  $domain  A  $PUBLIC_IP_ADDRESS"
    done
    log "If your VPS provider gave you an IPv6 address, add matching AAAA records as well."

    if ! prompt_yes_no "Have the DNS records propagated and should SSL setup continue now?" "yes"; then
        fail "Update DNS for $SERVERS, then run this installer again."
    fi
}

generate_self_contained_s3_secret_access_key() {
    local existing_secret=""

    existing_secret="$(get_env_value CDN_SECRET_ACCESS_KEY)"
    if [[ -n "$existing_secret" ]]; then
        printf '%s' "$existing_secret"
        return
    fi

    openssl rand -hex 32
}

validate_file_storage_configuration() {
    REQUESTED_FILE_STORAGE_MODE="$(normalize_file_storage_mode "$REQUESTED_FILE_STORAGE_MODE")"

    if [[ -z "$REQUESTED_CDN_BUCKET" ]]; then
        fail "S3 bucket is required for file storage."
    fi

    if [[ -z "$REQUESTED_CDN_PATH_PREFIX" ]]; then
        fail "S3 path prefix is required for file storage."
    fi

    if [[ "$REQUESTED_FILE_STORAGE_MODE" == "self-contained-s3" ]]; then
        if [[ -z "$REQUESTED_SELF_CONTAINED_S3_DIRECTORY" ]]; then
            fail "Self-contained S3 files directory is required."
        fi

        REQUESTED_CDN_ENDPOINT="http://127.0.0.1:${PTBK_SELF_CONTAINED_S3_PORT}"
        REQUESTED_CDN_REGION="$PTBK_SELF_CONTAINED_S3_REGION"
        REQUESTED_CDN_FORCE_PATH_STYLE="true"
        if [[ -z "$REQUESTED_CDN_ACCESS_KEY_ID" ]]; then
            REQUESTED_CDN_ACCESS_KEY_ID="promptbook"
        fi
        if [[ -z "$REQUESTED_CDN_SECRET_ACCESS_KEY" ]]; then
            REQUESTED_CDN_SECRET_ACCESS_KEY="$(generate_self_contained_s3_secret_access_key)"
        fi
        if [[ -z "$REQUESTED_CDN_PUBLIC_URL" ]]; then
            REQUESTED_CDN_PUBLIC_URL="$(resolve_self_contained_s3_public_url "$REQUESTED_PUBLIC_SITE_URL" "$REQUESTED_CDN_BUCKET")"
        fi
        return
    fi

    if [[ -z "$REQUESTED_CDN_REGION" ]]; then
        REQUESTED_CDN_REGION="$PTBK_EXTERNAL_S3_REGION"
    fi

    if [[ -z "$REQUESTED_CDN_ENDPOINT" || -z "$REQUESTED_CDN_ACCESS_KEY_ID" || -z "$REQUESTED_CDN_SECRET_ACCESS_KEY" || -z "$REQUESTED_CDN_PUBLIC_URL" ]]; then
        fail "External S3 storage requires bucket, endpoint, access key ID, secret access key, and public URL."
    fi
}

configure_environment() {
    local sqlite_path="$PTBK_DATABASE_DIR/agents-server.sqlite"
    local public_site_url="$REQUESTED_PUBLIC_SITE_URL"
    local first_domain="${DOMAINS[0]:-}"
    local table_prefix=""

    if [[ -n "$first_domain" ]]; then
        table_prefix="$(build_domain_table_prefix "$first_domain")"
    fi

    if [[ -z "$public_site_url" ]]; then
        public_site_url="$(resolve_default_public_site_url)"
    fi

    validate_file_storage_configuration

    set_env_value PTBK_AGENTS_SERVER_DATABASE sqlite
    set_env_value PTBK_AGENTS_SERVER_SQLITE_PATH "$sqlite_path"
    set_env_value NEXT_PUBLIC_SITE_URL "$public_site_url"
    set_env_value SERVERS "$SERVERS"
    set_env_value SUPABASE_TABLE_PREFIX "$table_prefix"
    set_env_value SUPABASE_AUTO_MIGRATE false
    set_env_value PTBK_AGENT "$PTBK_AGENT"
    set_env_value PTBK_MODEL "$PTBK_MODEL"
    set_env_value PTBK_THINKING_LEVEL "$PTBK_THINKING_LEVEL"
    set_env_value PTBK_INSTALL_DEFAULT_AGENTS "$REQUESTED_INSTALL_DEFAULT_AGENTS"
    set_env_value PORT "$PORT"
    set_env_value NODE_ENV production
    set_env_value PTBK_HOSTNAME 127.0.0.1
    set_env_value PTBK_PUBLIC_IP_ADDRESS "$PUBLIC_IP_ADDRESS"
    set_env_value PTBK_INSTALL_DIR "$INSTALL_DIR"
    set_env_value PTBK_DATA_DIR "$PTBK_DATA_DIR"
    set_env_value PTBK_DATABASE_DIR "$PTBK_DATABASE_DIR"
    set_env_value PTBK_RELEASES_DIR "$PTBK_RELEASES_DIR"
    set_env_value PTBK_REPOSITORY_DIR "$PROMPTBOOK_REPOSITORY_DIR"
    set_env_value PROMPTBOOK_REPOSITORY_REF "$PROMPTBOOK_REPOSITORY_REF"
    set_env_value PTBK_VPS_INSTALL_SCRIPT "$PROMPTBOOK_REPOSITORY_DIR/other/vps/install.sh"
    set_env_value PTBK_AGENTS_SERVER_ENV_FILE "$ENV_FILE"
    set_env_value PTBK_PM2_BASE_APP_NAME "$PTBK_PM2_BASE_APP_NAME"
    set_env_value PTBK_PM2_APP_NAME "$APP_NAME"
    set_env_value PTBK_NGINX_SITE_NAME "$NGINX_SITE_NAME"
    set_env_value LETS_ENCRYPT_EMAIL "$LETS_ENCRYPT_EMAIL"
    set_env_value OPENAI_API_KEY "$REQUESTED_OPENAI_API_KEY"
    set_env_value PTBK_OPENAI_CODEX_USE_API_KEY "$(resolve_openai_codex_api_key_usage)"
    set_env_value SENTRY_DSN "$REQUESTED_SENTRY_DSN"
    set_env_value PTBK_FILE_STORAGE_MODE "$REQUESTED_FILE_STORAGE_MODE"
    set_env_value PTBK_SELF_CONTAINED_S3_DIRECTORY "$REQUESTED_SELF_CONTAINED_S3_DIRECTORY"
    set_env_value PTBK_SELF_CONTAINED_S3_PORT "$PTBK_SELF_CONTAINED_S3_PORT"
    set_env_value PTBK_SELF_CONTAINED_S3_SERVICE_NAME "$PTBK_SELF_CONTAINED_S3_SERVICE_NAME"
    set_env_value PTBK_SELF_CONTAINED_S3_REGION "$PTBK_SELF_CONTAINED_S3_REGION"
    set_env_value CDN_BUCKET "$REQUESTED_CDN_BUCKET"
    set_env_value NEXT_PUBLIC_CDN_PATH_PREFIX "$REQUESTED_CDN_PATH_PREFIX"
    set_env_value CDN_ENDPOINT "$REQUESTED_CDN_ENDPOINT"
    set_env_value CDN_REGION "$REQUESTED_CDN_REGION"
    set_env_value CDN_FORCE_PATH_STYLE "$REQUESTED_CDN_FORCE_PATH_STYLE"
    set_env_value CDN_ACCESS_KEY_ID "$REQUESTED_CDN_ACCESS_KEY_ID"
    set_env_value CDN_SECRET_ACCESS_KEY "$REQUESTED_CDN_SECRET_ACCESS_KEY"
    set_env_value NEXT_PUBLIC_CDN_PUBLIC_URL "$REQUESTED_CDN_PUBLIC_URL"

    if [[ -n "$REQUESTED_ADMIN_PASSWORD" ]]; then
        set_env_value ADMIN_PASSWORD "$REQUESTED_ADMIN_PASSWORD"
    elif ! has_non_empty_env_value ADMIN_PASSWORD; then
        GENERATED_ADMIN_PASSWORD="$(openssl rand -hex 24)"
        set_env_value ADMIN_PASSWORD "$GENERATED_ADMIN_PASSWORD"
    fi

    if [[ -n "${COPILOT_GITHUB_TOKEN:-}" ]]; then
        set_env_value COPILOT_GITHUB_TOKEN "$COPILOT_GITHUB_TOKEN"
    elif [[ -n "${GH_TOKEN:-}" ]]; then
        set_env_value GH_TOKEN "$GH_TOKEN"
    fi
}

initialize_promptbook_project() {
    log "Initializing Promptbook Agents Server project files."
    run_as_service_user bash -lc "cd $(shell_quote "$INSTALL_DIR") && $(shell_quote "$PTBK_COMMAND_PATH") agents-server init >/dev/null"
    configure_environment
}

install_default_agents() {
    local env_file_shell=""
    local agents_server_dir_shell=""
    local default_agents_dir_shell=""

    if [[ "$REQUESTED_INSTALL_DEFAULT_AGENTS" != "yes" ]]; then
        log "Skipping bundled default agents by installer choice."
        return
    fi

    env_file_shell="$(shell_quote "$ENV_FILE")"
    agents_server_dir_shell="$(shell_quote "$PROMPTBOOK_REPOSITORY_DIR/apps/agents-server")"
    default_agents_dir_shell="$(shell_quote "$PROMPTBOOK_REPOSITORY_DIR/agents/default")"

    log "Installing bundled default agents when the server has no agents yet."
    run_as_service_user bash -lc "cd $agents_server_dir_shell && PTBK_AGENTS_SERVER_ENV_FILE=$env_file_shell PTBK_DEFAULT_AGENTS_DIR=$default_agents_dir_shell npx --yes tsx ./src/database/seedDefaultAgents.ts"
}

configure_runner_authentication() {
    local authentication_command=""
    local authentication_binary=""
    local is_runner_authentication_requested="$IS_RUNNER_AUTHENTICATION_REQUESTED"

    authentication_command="$(resolve_runner_authentication_command)"
    if [[ -z "$authentication_command" ]]; then
        return
    fi

    if [[ "$PTBK_AGENT" == "github-copilot" ]] && [[ -n "${COPILOT_GITHUB_TOKEN:-}" || -n "${GH_TOKEN:-}" ]]; then
        log "GitHub Copilot token environment variable detected and stored in $ENV_FILE."
        return
    fi

    if is_openai_codex_api_key_runner_configured; then
        set_env_value PTBK_OPENAI_CODEX_USE_API_KEY 1
        log "OpenAI API key detected; the OpenAI Codex runner will use OPENAI_API_KEY without interactive CLI authentication."
        return
    fi

    authentication_binary="${authentication_command%% *}"
    if ! command -v "$authentication_binary" >/dev/null 2>&1; then
        warn "Runner CLI '$authentication_binary' is not available, skipping interactive authentication."
        return
    fi

    if ! is_interactive; then
        warn "Runner authentication requires an interactive VPS terminal. Run $authentication_command as $RUN_USER inside $INSTALL_DIR and complete any login or project-trust steps before restarting pm2."
        return
    fi

    if [[ -z "$is_runner_authentication_requested" ]]; then
        if prompt_yes_no "Open the $PTBK_AGENT CLI now for authentication?" "yes"; then
            is_runner_authentication_requested=1
        else
            is_runner_authentication_requested=0
        fi
    fi

    if [[ "$is_runner_authentication_requested" != "1" ]]; then
        warn "Skipping runner authentication. The runner must be authenticated before it can answer chats."
        return
    fi

    log "Starting the $PTBK_AGENT CLI. Complete any login or project-trust prompts, then exit the runner CLI to continue."
    set +e
    run_runner_authentication_command < /dev/tty > /dev/tty
    local runner_exit_code=$?
    set -e

    if [[ "$runner_exit_code" -ne 0 ]]; then
        warn "The $PTBK_AGENT CLI exited with status $runner_exit_code. The server will still start, but the runner may need authentication."
    fi
}

configure_code_runner_for_initial_installation() {
    if ! is_interactive; then
        log "Skipping code-runner CLI installation and authentication in non-interactive mode."
        log "Configure the runner later from System -> Super Admin -> Code runners or by running: bash $PROMPTBOOK_REPOSITORY_DIR/other/vps/install.sh apply-runner"
        return
    fi

    install_runner_dependencies
    configure_runner_authentication
}

authenticate_code_runner() {
    local authentication_command=""
    local authentication_binary=""
    local runner_exit_code=0

    initialize_sudo
    resolve_run_user
    load_runtime_configuration_from_env_file

    authentication_command="$(resolve_runner_authentication_command)"
    if [[ -z "$authentication_command" ]]; then
        fail "No interactive authentication command is defined for runner '$PTBK_AGENT'."
    fi

    authentication_binary="${authentication_command%% *}"
    if ! command -v "$authentication_binary" >/dev/null 2>&1; then
        fail "Runner CLI '$authentication_binary' is not available. Apply the runner configuration first so the CLI gets installed."
    fi

    log "Starting interactive authentication for runner '$PTBK_AGENT' in $INSTALL_DIR."
    log "Complete any login or project-trust prompts in the browser terminal and exit the runner CLI when finished."

    set +e
    run_runner_authentication_command
    runner_exit_code=$?
    set -e

    if [[ "$runner_exit_code" -ne 0 ]]; then
        fail "Runner authentication command exited with status $runner_exit_code."
    fi

    log "Runner authentication command finished."
}

open_server_cli_shell() {
    local shell_exit_code=0

    initialize_sudo
    resolve_run_user
    load_runtime_configuration_from_env_file

    log "Starting raw CLI access in $INSTALL_DIR for user $RUN_USER."
    log "Every command runs with the same permissions as the Agents Server service user."

    set +e
    run_server_cli_shell_command
    shell_exit_code=$?
    set -e

    if [[ "$shell_exit_code" -ne 0 ]]; then
        fail "CLI access shell exited with status $shell_exit_code."
    fi

    log "CLI access shell finished."
}

configure_firewall() {
    if ! command -v ufw >/dev/null 2>&1; then
        return
    fi

    if "${SUDO[@]}" ufw status | grep -q 'Status: active'; then
        log "Opening HTTP and HTTPS in ufw for nginx."
        if "${SUDO[@]}" ufw app list | grep -q '^  Nginx Full$'; then
            "${SUDO[@]}" ufw allow 'Nginx Full'
        else
            "${SUDO[@]}" ufw allow 80/tcp
            "${SUDO[@]}" ufw allow 443/tcp
        fi
    fi
}

ensure_nginx_headers_more_module_is_available() {
    local headers_more_package="libnginx-mod-http-headers-more-filter"
    local module_available_path=""
    local module_enabled_path=""

    if ! dpkg-query -W -f='${Status}' "$headers_more_package" 2>/dev/null | grep -q 'install ok installed'; then
        log "Installing nginx headers-more module for branded server headers."
        run_apt_get update
        run_apt_get install -y "$headers_more_package"
    fi

    if [[ ! -d /usr/share/nginx/modules-available ]]; then
        return
    fi

    module_available_path="$(
        find /usr/share/nginx/modules-available -maxdepth 1 \
            \( -name '*headers-more*' -o -name '*headers_more*' \) |
            head -n 1
    )"

    if [[ -z "$module_available_path" ]]; then
        return
    fi

    "${SUDO[@]}" install -d -m 755 /etc/nginx/modules-enabled
    module_enabled_path="/etc/nginx/modules-enabled/50-$(basename "$module_available_path")"
    if [[ ! -e "$module_enabled_path" ]]; then
        "${SUDO[@]}" ln -s "$module_available_path" "$module_enabled_path"
    fi
}

write_nginx_fallback_page() {
    local promptbook_logo_data_uri=""

    promptbook_logo_data_uri="$(build_promptbook_nginx_fallback_logo_data_uri)"

    "${SUDO[@]}" install -d -m 755 "$NGINX_FALLBACK_DIR"
    "${SUDO[@]}" tee "$NGINX_FALLBACK_HTML_PATH" >/dev/null <<EOF
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Promptbook Agents Server</title>
    <!-- Managed by the Promptbook Agents Server installer. -->
    <style>
        :root {
            color-scheme: light;
            --brand-blue: #1d4ed8;
            --brand-cyan: #0891b2;
            --ink: #0f172a;
            --muted: #64748b;
            --soft: #f8fafc;
            --surface: #ffffff;
            --border: #dbe4ee;
            --shadow: 0 28px 80px rgba(15, 23, 42, 0.14);
            font-family: Poppins, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: var(--soft);
            color: var(--ink);
        }

        *,
        *::before,
        *::after {
            box-sizing: border-box;
        }

        body {
            min-height: 100vh;
            margin: 0;
            background:
                linear-gradient(90deg, rgba(8, 145, 178, 0.06) 1px, transparent 1px),
                linear-gradient(180deg, rgba(8, 145, 178, 0.05) 1px, transparent 1px),
                linear-gradient(135deg, #eff6ff 0%, #ffffff 48%, #eef2ff 100%);
            background-size: 96px 96px, 96px 96px, auto;
        }

        .fallback-shell {
            width: min(1120px, calc(100vw - 48px));
            min-height: 100vh;
            margin: 0 auto;
            padding: 72px 0;
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(320px, 460px);
            gap: 64px;
            align-items: center;
        }

        .brand-link {
            width: fit-content;
            display: inline-flex;
            align-items: center;
            gap: 12px;
            color: var(--ink);
            font-size: 22px;
            text-decoration: none;
        }

        .brand-link strong {
            font-weight: 800;
        }

        .brand-mark {
            width: 52px;
            height: 52px;
            flex: 0 0 auto;
            display: block;
            object-fit: contain;
            filter: drop-shadow(0 14px 28px rgba(8, 145, 178, 0.24));
        }

        h1 {
            max-width: 600px;
            margin: 56px 0 0;
            font-size: 48px;
            line-height: 1.04;
            font-weight: 800;
            letter-spacing: 0;
        }

        p {
            margin: 0;
            color: var(--muted);
            font-size: 17px;
            line-height: 1.7;
        }

        .description {
            max-width: 590px;
            margin-top: 20px;
        }

        .status-row {
            margin-top: 32px;
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
        }

        .status-pill {
            border: 1px solid var(--border);
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.74);
            padding: 10px 14px;
            color: #334155;
            font-size: 14px;
            font-weight: 600;
        }

        .preview {
            border: 1px solid rgba(219, 228, 238, 0.96);
            border-radius: 8px;
            overflow: hidden;
            background: var(--surface);
            box-shadow: var(--shadow);
        }

        .window-bar {
            display: flex;
            align-items: center;
            gap: 9px;
            border-bottom: 1px solid #e5edf5;
            background: linear-gradient(180deg, #f8fafc, #f1f5f9);
            padding: 16px 20px;
        }

        .window-dot {
            width: 10px;
            height: 10px;
            border-radius: 999px;
        }

        .window-dot:nth-child(1) {
            background: #fb7185;
        }

        .window-dot:nth-child(2) {
            background: #facc15;
        }

        .window-dot:nth-child(3) {
            background: #22c55e;
        }

        .window-title {
            margin-left: 8px;
            color: #475569;
            font-size: 13px;
            font-weight: 700;
        }

        .conversation {
            min-height: 350px;
            padding: 28px;
            display: flex;
            flex-direction: column;
            gap: 18px;
            background:
                linear-gradient(180deg, rgba(248, 250, 252, 0.82), rgba(255, 255, 255, 0.94)),
                var(--surface);
        }

        .message {
            max-width: 82%;
            border: 1px solid var(--border);
            border-radius: 18px;
            padding: 14px 16px;
            color: #334155;
            font-size: 14px;
            line-height: 1.55;
        }

        .message.user {
            align-self: flex-end;
            border-color: rgba(8, 145, 178, 0.22);
            background: linear-gradient(135deg, var(--brand-cyan), var(--brand-blue));
            color: #ffffff;
        }

        .message.agent {
            align-self: flex-start;
            background: #ffffff;
        }

        .input-preview {
            margin-top: auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
            border: 1px solid var(--border);
            border-radius: 999px;
            background: #ffffff;
            padding: 10px 10px 10px 18px;
            color: #94a3b8;
            font-size: 14px;
        }

        .send-button {
            width: 34px;
            height: 34px;
            flex: 0 0 auto;
            border-radius: 999px;
            display: grid;
            place-items: center;
            background: var(--brand-cyan);
            color: #ffffff;
        }

        @media (max-width: 860px) {
            .fallback-shell {
                grid-template-columns: 1fr;
                gap: 36px;
                padding: 40px 0;
            }

            h1 {
                margin-top: 40px;
                font-size: 40px;
            }
        }

        @media (max-width: 520px) {
            .fallback-shell {
                width: min(100vw - 28px, 1120px);
            }

            .brand-link {
                font-size: 20px;
            }

            h1 {
                font-size: 34px;
            }

            p {
                font-size: 16px;
            }

            .conversation {
                min-height: 300px;
                padding: 20px;
            }

            .message {
                max-width: 100%;
            }
        }
    </style>
</head>
<body>
    <main class="fallback-shell" aria-labelledby="fallback-title">
        <section>
            <a class="brand-link" href="https://www.ptbk.io/" aria-label="Promptbook homepage">
                <img class="brand-mark" src="${promptbook_logo_data_uri}" alt="">
                <span>Prompt<strong>book</strong></span>
            </a>
            <h1 id="fallback-title">Server is getting ready</h1>
            <p class="description">Promptbook is installed and Nginx is online. The Agents Server application is not available from this route right now.</p>
            <div class="status-row" aria-label="Current status">
                <span class="status-pill">Nginx online</span>
                <span class="status-pill">Agents Server unavailable</span>
            </div>
        </section>
        <section class="preview" aria-label="Promptbook chat preview">
            <div class="window-bar">
                <span class="window-dot" aria-hidden="true"></span>
                <span class="window-dot" aria-hidden="true"></span>
                <span class="window-dot" aria-hidden="true"></span>
                <span class="window-title">Promptbook - Assistant</span>
            </div>
            <div class="conversation">
                <div class="message user">Is the Agents Server ready?</div>
                <div class="message agent">Nginx is responding. The application process needs a moment before this route can load.</div>
                <div class="input-preview">
                    <span>Type a question...</span>
                    <span class="send-button" aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M3 8h9M8 4l4 4-4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                    </span>
                </div>
            </div>
        </section>
    </main>
</body>
</html>
EOF
    "${SUDO[@]}" chmod 644 "$NGINX_FALLBACK_HTML_PATH"
}

install_branded_default_nginx_pages() {
    local default_page_path=""

    "${SUDO[@]}" install -d -m 755 /var/www/html

    for default_page_path in /var/www/html/index.html /var/www/html/index.nginx-debian.html; do
        if [[ -e "$default_page_path" ]] && ! grep -Eiq 'welcome to nginx|nginx|Promptbook Agents Server' "$default_page_path"; then
            continue
        fi

        "${SUDO[@]}" install -m 644 "$NGINX_FALLBACK_HTML_PATH" "$default_page_path"
    done
}

write_nginx_branding_configuration() {
    "${SUDO[@]}" tee "$NGINX_BRANDING_CONF_PATH" >/dev/null <<EOF
# Managed by the Promptbook Agents Server installer.
server_tokens off;
more_set_headers "Server: ${NGINX_BRANDED_SERVER_HEADER}";
EOF
}

write_nginx_error_snippet() {
    "${SUDO[@]}" tee "$NGINX_ERROR_SNIPPET_PATH" >/dev/null <<EOF
# Managed by the Promptbook Agents Server installer.
error_page 400 401 403 404 405 408 410 411 413 414 415 416 421 429 494 495 496 497 500 501 502 503 504 ${NGINX_FALLBACK_URI};

location = ${NGINX_FALLBACK_URI} {
    default_type text/html;
    add_header Cache-Control "no-store" always;
    alias ${NGINX_FALLBACK_HTML_PATH};
}
EOF
}

write_nginx_proxy_snippet() {
    "${SUDO[@]}" tee "$NGINX_PROXY_SNIPPET_PATH" >/dev/null <<EOF
# Managed by the Promptbook Agents Server installer.
proxy_pass http://127.0.0.1:${PORT};
proxy_http_version 1.1;
proxy_buffering off;
proxy_redirect off;
proxy_hide_header Server;

proxy_set_header Host \$host;
proxy_set_header X-Real-IP \$remote_addr;
proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Host \$host;
proxy_set_header X-Forwarded-Proto \$scheme;
proxy_set_header X-Promptbook-Server \$host;
proxy_set_header Upgrade \$http_upgrade;
proxy_set_header Connection \$promptbook_connection_upgrade;

proxy_read_timeout 3600s;
proxy_send_timeout 3600s;
EOF
}

build_nginx_self_contained_s3_location_block() {
    if ! is_self_contained_s3_storage_enabled; then
        return
    fi

    cat <<EOF
    location /s3/ {
        proxy_pass http://127.0.0.1:${PTBK_SELF_CONTAINED_S3_PORT}/;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_redirect off;
        proxy_hide_header Server;

        proxy_set_header Host 127.0.0.1:${PTBK_SELF_CONTAINED_S3_PORT};
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
EOF
}

configure_nginx_branding() {
    ensure_nginx_headers_more_module_is_available
    write_nginx_fallback_page
    install_branded_default_nginx_pages
    write_nginx_branding_configuration
    write_nginx_error_snippet
    write_nginx_proxy_snippet
}

configure_nginx_reverse_proxy() {
    local nginx_available_path="/etc/nginx/sites-available/${NGINX_SITE_NAME}"
    local nginx_enabled_path="/etc/nginx/sites-enabled/${NGINX_SITE_NAME}"
    local server_names=""
    local s3_location_block=""

    configure_nginx_branding

    server_names="$(join_by_space "${DOMAINS[@]}")"
    s3_location_block="$(build_nginx_self_contained_s3_location_block)"

    if [[ -n "$server_names" ]]; then
        log "Configuring nginx reverse proxy for raw IP access and $server_names."
    else
        log "Configuring nginx reverse proxy for raw IP access."
    fi

    "${SUDO[@]}" tee "$nginx_available_path" >/dev/null <<EOF
map \$http_upgrade \$promptbook_connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 100m;
    include ${NGINX_ERROR_SNIPPET_PATH};

${s3_location_block}

    location / {
        include ${NGINX_PROXY_SNIPPET_PATH};
    }
}
EOF

    if [[ -n "$server_names" ]]; then
        "${SUDO[@]}" tee -a "$nginx_available_path" >/dev/null <<EOF

server {
    listen 80;
    listen [::]:80;
    server_name ${server_names};

    client_max_body_size 100m;
    include ${NGINX_ERROR_SNIPPET_PATH};

${s3_location_block}

    location / {
        include ${NGINX_PROXY_SNIPPET_PATH};
    }
}
EOF
    fi

    "${SUDO[@]}" ln -sfn "$nginx_available_path" "$nginx_enabled_path"
    "${SUDO[@]}" rm -f /etc/nginx/sites-enabled/default
    "${SUDO[@]}" nginx -t
    "${SUDO[@]}" systemctl enable nginx >/dev/null
    reload_or_restart_nginx
}

reload_or_restart_nginx() {
    if "${SUDO[@]}" systemctl is-active --quiet nginx; then
        "${SUDO[@]}" systemctl reload nginx
        return
    fi

    "${SUDO[@]}" systemctl restart nginx
}

warn_if_domain_dns_is_not_ready() {
    local domain=""
    local resolved_addresses=""

    if [[ "$PUBLIC_IP_ADDRESS" == "localhost" ]]; then
        warn "Could not detect the VPS public IP address; skipping DNS verification."
        return
    fi

    for domain in "${DOMAINS[@]}"; do
        resolved_addresses="$(getent ahosts "$domain" 2>/dev/null | awk '{ print $1 }' | sort -u | tr '\n' ' ' | sed -E 's/[[:space:]]+$//')"
        if [[ -z "$resolved_addresses" ]]; then
            warn "$domain does not resolve yet. Certbot HTTP validation will fail until DNS propagates."
            continue
        fi

        if [[ " $resolved_addresses " != *" $PUBLIC_IP_ADDRESS "* ]]; then
            warn "$domain resolves to [$resolved_addresses], not detected VPS IP $PUBLIC_IP_ADDRESS. Certbot may fail."
        fi
    done
}

configure_ssl_certificates() {
    local certbot_arguments=(--nginx --non-interactive --agree-tos --redirect --keep-until-expiring --expand)
    local domain=""
    local first_domain="${DOMAINS[0]:-}"

    if [[ "${#DOMAINS[@]}" -eq 0 ]]; then
        log "Skipping Let's Encrypt SSL setup because no custom domains are configured."
        return
    fi

    warn_if_domain_dns_is_not_ready

    if [[ -n "$LETS_ENCRYPT_EMAIL" ]]; then
        certbot_arguments+=(--email "$LETS_ENCRYPT_EMAIL")
    else
        certbot_arguments+=(--register-unsafely-without-email)
    fi

    for domain in "${DOMAINS[@]}"; do
        certbot_arguments+=(-d "$domain")
    done

    log "Requesting Let's Encrypt SSL certificate for $SERVERS."
    if ! "${SUDO[@]}" certbot "${certbot_arguments[@]}"; then
        warn "Let's Encrypt certificate request failed for $SERVERS. Keeping the current public URL unchanged so raw-IP bootstrap access remains available."
        warn "Fix DNS and firewall access for these domains, then rerun: bash $PROMPTBOOK_REPOSITORY_DIR/other/vps/install.sh apply-domains"
        return
    fi

    if [[ -n "$first_domain" ]]; then
        set_env_value NEXT_PUBLIC_SITE_URL "https://${first_domain}"
        local configured_storage_mode=""
        configured_storage_mode="$(get_env_value PTBK_FILE_STORAGE_MODE)"
        if [[ -n "$configured_storage_mode" && "$(normalize_file_storage_mode "$configured_storage_mode")" == "self-contained-s3" ]]; then
            set_env_value NEXT_PUBLIC_CDN_PUBLIC_URL "$(resolve_self_contained_s3_public_url "https://${first_domain}" "$(get_env_value CDN_BUCKET)")"
        fi
    fi

    "${SUDO[@]}" systemctl reload nginx
}

configure_pm2_startup() {
    if ! command -v systemctl >/dev/null 2>&1; then
        warn "systemd was not found; pm2 boot startup was not configured."
        return
    fi

    log "Configuring pm2 startup for user $RUN_USER."
    "${SUDO[@]}" env PATH="$PATH" pm2 startup systemd -u "$RUN_USER" --hp "$RUN_HOME" >/dev/null
}

build_agents_server() {
    log "Building Agents Server before starting pm2."
    run_as_service_user bash -lc "cd $(shell_quote "$INSTALL_DIR") && $(shell_quote "$PTBK_COMMAND_PATH") agents-server build"
}

run_agents_server_database_migrations() {
    local database_mode=""
    local env_file_shell=""
    local agents_server_dir_shell=""

    database_mode="$(get_env_value PTBK_AGENTS_SERVER_DATABASE | tr '[:upper:]' '[:lower:]')"
    if [[ "$database_mode" == "sqlite" || "$database_mode" == "local" ]]; then
        log "Skipping PostgreSQL database migrations because Agents Server is configured for local SQLite."
        return
    fi

    env_file_shell="$(shell_quote "$ENV_FILE")"
    agents_server_dir_shell="$(shell_quote "$PROMPTBOOK_REPOSITORY_DIR/apps/agents-server")"

    log "Running Agents Server database migrations."
    run_as_service_user bash -lc "cd $agents_server_dir_shell && PTBK_AGENTS_SERVER_ENV_FILE=$env_file_shell npx --yes tsx ./src/database/migrate.ts"
}

start_pm2_agents_server_process() {
    local process_name="$1"
    local process_port="$2"
    local install_dir_shell=""
    local process_name_shell=""
    local process_port_shell=""
    local ptbk_command_shell=""
    local repository_dir_shell=""
    local install_script_shell=""
    local env_file_shell=""
    local base_app_name_shell=""
    local data_dir_shell=""
    local database_dir_shell=""
    local releases_dir_shell=""
    local agent_shell=""
    local model_shell=""
    local thinking_shell=""

    install_dir_shell="$(shell_quote "$INSTALL_DIR")"
    process_name_shell="$(shell_quote "$process_name")"
    process_port_shell="$(shell_quote "$process_port")"
    ptbk_command_shell="$(shell_quote "$PTBK_COMMAND_PATH")"
    repository_dir_shell="$(shell_quote "$PROMPTBOOK_REPOSITORY_DIR")"
    install_script_shell="$(shell_quote "$PROMPTBOOK_REPOSITORY_DIR/other/vps/install.sh")"
    env_file_shell="$(shell_quote "$ENV_FILE")"
    base_app_name_shell="$(shell_quote "$PTBK_PM2_BASE_APP_NAME")"
    data_dir_shell="$(shell_quote "$PTBK_DATA_DIR")"
    database_dir_shell="$(shell_quote "$PTBK_DATABASE_DIR")"
    releases_dir_shell="$(shell_quote "$PTBK_RELEASES_DIR")"
    agent_shell="$(shell_quote "$PTBK_AGENT")"
    model_shell="$(shell_quote "$PTBK_MODEL")"
    thinking_shell="$(shell_quote "$PTBK_THINKING_LEVEL")"

    log "Starting Agents Server pm2 process $process_name on port $process_port."
    run_as_service_user bash -lc "
        set -e
        cd $install_dir_shell
        PTBK_PATH=$ptbk_command_shell
        if pm2 describe $process_name_shell >/dev/null 2>&1; then
            pm2 delete $process_name_shell >/dev/null
        fi
        PTBK_INSTALL_DIR=$install_dir_shell \
        PTBK_DATA_DIR=$data_dir_shell \
        PTBK_DATABASE_DIR=$database_dir_shell \
        PTBK_RELEASES_DIR=$releases_dir_shell \
        PTBK_REPOSITORY_DIR=$repository_dir_shell \
        PTBK_VPS_INSTALL_SCRIPT=$install_script_shell \
        PTBK_AGENTS_SERVER_ENV_FILE=$env_file_shell \
        PTBK_PM2_APP_NAME=$process_name_shell \
        PTBK_PM2_BASE_APP_NAME=$base_app_name_shell \
        PORT=$process_port_shell \
        pm2 start \"\$PTBK_PATH\" --interpreter bash --name $process_name_shell --time --cron-restart $(shell_quote "$PM2_HOURLY_RESTART_CRON") --cwd $install_dir_shell -- agents-server start --agent $agent_shell --model $model_shell --thinking-level $thinking_shell --port $process_port_shell --no-ui
        pm2 save
    "
}

is_tcp_port_available() {
    local checked_port="$1"

    if ! command -v node >/dev/null 2>&1; then
        fail "Node.js is required to find a free Agents Server port."
    fi

    node -e '
        const net = require("net");
        const port = Number(process.argv[1]);
        const server = net.createServer();
        const timeout = setTimeout(() => process.exit(1), 3000);
        server.once("error", () => {
            clearTimeout(timeout);
            process.exit(1);
        });
        server.listen(port, "127.0.0.1", () => {
            clearTimeout(timeout);
            server.close(() => process.exit(0));
        });
    ' "$checked_port" >/dev/null 2>&1
}

resolve_next_agents_server_port() {
    local base_port="$1"
    local offset=1
    local candidate_port=0

    while [[ "$offset" -le 100 ]]; do
        candidate_port=$((base_port + offset))
        if is_tcp_port_available "$candidate_port"; then
            printf '%s' "$candidate_port"
            return
        fi
        offset=$((offset + 1))
    done

    fail "Could not find a free local port near $base_port for the replacement Agents Server process."
}

wait_for_agents_server_health() {
    local process_name="$1"
    local process_port="$2"
    local health_url="http://127.0.0.1:${process_port}/api/health"
    local deadline=$((SECONDS + 180))

    log "Waiting for $process_name to become healthy at $health_url."
    while [[ "$SECONDS" -lt "$deadline" ]]; do
        if curl -fsS --max-time 5 "$health_url" >/dev/null 2>&1; then
            log "$process_name is healthy."
            return
        fi

        sleep 2
    done

    warn "Recent pm2 logs for $process_name:"
    run_as_service_user pm2 logs "$process_name" --nostream --lines 80 || true
    fail "Agents Server process $process_name did not become healthy within 180 seconds."
}

switch_nginx_to_agents_server_port() {
    local next_port="$1"

    PORT="$next_port"
    log "Switching nginx to Agents Server port $PORT."
    write_nginx_proxy_snippet
    "${SUDO[@]}" nginx -t
    reload_or_restart_nginx
}

stop_pm2_process_if_running() {
    local process_name="$1"

    if [[ -z "$process_name" ]]; then
        return
    fi

    run_as_service_user bash -lc "
        set -e
        if pm2 describe $(shell_quote "$process_name") >/dev/null 2>&1; then
            pm2 delete $(shell_quote "$process_name") >/dev/null
            pm2 save
        fi
    "
}

resolve_pm2_release_app_name() {
    local release_name="${PROMPTBOOK_REPOSITORY_RELEASE_NAME:-}"

    if [[ -z "$release_name" ]]; then
        release_name="$(sanitize_repository_release_name "$(basename "$PROMPTBOOK_REPOSITORY_DIR")" "$(read_repository_commit_sha)")"
    fi

    printf '%s-%s' "$PTBK_PM2_BASE_APP_NAME" "$release_name"
}

start_agents_server() {
    start_pm2_agents_server_process "$APP_NAME" "$PORT"
    wait_for_agents_server_health "$APP_NAME" "$PORT"
}

load_runtime_configuration_from_env_file() {
    local env_value=""

    ENV_FILE="$INSTALL_DIR/.env"
    if [[ ! -r "$ENV_FILE" ]]; then
        fail "Cannot apply VPS configuration because $ENV_FILE does not exist or is not readable."
    fi

    env_value="$(get_env_value PTBK_PM2_APP_NAME)"
    [[ -n "$env_value" ]] && APP_NAME="$env_value"

    env_value="$(get_env_value PTBK_PM2_BASE_APP_NAME)"
    [[ -n "$env_value" ]] && PTBK_PM2_BASE_APP_NAME="$env_value"

    env_value="$(get_env_value PTBK_DATA_DIR)"
    [[ -n "$env_value" ]] && PTBK_DATA_DIR="$env_value"

    env_value="$(get_env_value PTBK_DATABASE_DIR)"
    [[ -n "$env_value" ]] && PTBK_DATABASE_DIR="$env_value"

    env_value="$(get_env_value PTBK_RELEASES_DIR)"
    [[ -n "$env_value" ]] && PTBK_RELEASES_DIR="$env_value"

    env_value="$(get_env_value PTBK_REPOSITORY_DIR)"
    if [[ -n "$env_value" ]]; then
        PROMPTBOOK_REPOSITORY_DIR="$env_value"
    elif [[ -d "$PROMPTBOOK_LEGACY_REPOSITORY_DIR/.git" ]]; then
        PROMPTBOOK_REPOSITORY_DIR="$PROMPTBOOK_LEGACY_REPOSITORY_DIR"
    fi

    env_value="$(get_env_value PROMPTBOOK_REPOSITORY_REF)"
    [[ -n "$env_value" ]] && PROMPTBOOK_REPOSITORY_REF="$(normalize_promptbook_repository_ref "$env_value")"

    env_value="$(get_env_value PTBK_NGINX_SITE_NAME)"
    [[ -n "$env_value" ]] && NGINX_SITE_NAME="$env_value"

    env_value="$(get_env_value PORT)"
    [[ -n "$env_value" ]] && PORT="$env_value"

    env_value="$(get_env_value PTBK_AGENT)"
    [[ -n "$env_value" ]] && PTBK_AGENT="$env_value"

    env_value="$(get_env_value PTBK_MODEL)"
    [[ -n "$env_value" ]] && PTBK_MODEL="$env_value"

    env_value="$(get_env_value PTBK_THINKING_LEVEL)"
    [[ -n "$env_value" ]] && PTBK_THINKING_LEVEL="$env_value"

    env_value="$(get_env_value LETS_ENCRYPT_EMAIL)"
    [[ -n "$env_value" ]] && LETS_ENCRYPT_EMAIL="$env_value"

    env_value="$(get_env_value PTBK_FILE_STORAGE_MODE)"
    [[ -n "$env_value" ]] && REQUESTED_FILE_STORAGE_MODE="$(normalize_file_storage_mode "$env_value")"

    env_value="$(get_env_value PTBK_SELF_CONTAINED_S3_DIRECTORY)"
    [[ -n "$env_value" ]] && REQUESTED_SELF_CONTAINED_S3_DIRECTORY="$env_value"

    env_value="$(get_env_value PTBK_SELF_CONTAINED_S3_PORT)"
    [[ -n "$env_value" ]] && PTBK_SELF_CONTAINED_S3_PORT="$env_value"

    env_value="$(get_env_value PTBK_SELF_CONTAINED_S3_SERVICE_NAME)"
    [[ -n "$env_value" ]] && PTBK_SELF_CONTAINED_S3_SERVICE_NAME="$env_value"

    env_value="$(get_env_value PTBK_SELF_CONTAINED_S3_REGION)"
    [[ -n "$env_value" ]] && PTBK_SELF_CONTAINED_S3_REGION="$env_value"

    env_value="$(get_env_value CDN_BUCKET)"
    [[ -n "$env_value" ]] && REQUESTED_CDN_BUCKET="$env_value"

    env_value="$(get_env_value NEXT_PUBLIC_CDN_PATH_PREFIX)"
    [[ -n "$env_value" ]] && REQUESTED_CDN_PATH_PREFIX="$env_value"

    env_value="$(get_env_value CDN_ENDPOINT)"
    [[ -n "$env_value" ]] && REQUESTED_CDN_ENDPOINT="$env_value"

    env_value="$(get_env_value CDN_REGION)"
    [[ -n "$env_value" ]] && REQUESTED_CDN_REGION="$env_value"

    env_value="$(get_env_value CDN_ACCESS_KEY_ID)"
    [[ -n "$env_value" ]] && REQUESTED_CDN_ACCESS_KEY_ID="$env_value"

    env_value="$(get_env_value CDN_SECRET_ACCESS_KEY)"
    [[ -n "$env_value" ]] && REQUESTED_CDN_SECRET_ACCESS_KEY="$env_value"

    env_value="$(get_env_value NEXT_PUBLIC_CDN_PUBLIC_URL)"
    [[ -n "$env_value" ]] && REQUESTED_CDN_PUBLIC_URL="$env_value"

    env_value="$(get_env_value CDN_FORCE_PATH_STYLE)"
    [[ -n "$env_value" ]] && REQUESTED_CDN_FORCE_PATH_STYLE="$env_value"

    SERVERS="$(get_env_value SERVERS)"
    set_domains_from_csv "$SERVERS"

    PUBLIC_IP_ADDRESS="$(get_env_value PTBK_PUBLIC_IP_ADDRESS)"
    if [[ -z "$PUBLIC_IP_ADDRESS" ]]; then
        PUBLIC_IP_ADDRESS="$(resolve_public_ip_address)"
    fi
}

rerun_self_update_from_stable_script() {
    if [[ "${PTBK_SELF_UPDATE_SCRIPT_COPY:-0}" == "1" ]]; then
        return
    fi

    local source_script="${BASH_SOURCE[0]}"
    local runtime_script="$INSTALL_DIR/.promptbook/self-update/install.sh"

    if [[ "$source_script" == "$runtime_script" ]]; then
        return
    fi

    if [[ ! -r "$source_script" ]]; then
        warn "Cannot copy self-update script from $source_script. Continuing in place."
        return
    fi

    "${SUDO[@]}" mkdir -p "$(dirname "$runtime_script")"
    "${SUDO[@]}" install -m 700 "$source_script" "$runtime_script"
    "${SUDO[@]}" chown "$RUN_USER:$RUN_GROUP" "$runtime_script" 2>/dev/null || true

    log "Continuing self-update from $runtime_script so the repository checkout can be refreshed safely."
    PTBK_SELF_UPDATE_SCRIPT_COPY=1 exec bash "$runtime_script" self-update "$@"
}

restart_agents_server_if_running() {
    local app_name_shell=""

    if [[ "$PTBK_SKIP_PM2_RESTART" == "1" ]]; then
        log "Skipping Agents Server pm2 restart because PTBK_SKIP_PM2_RESTART=1."
        return
    fi

    if ! command -v pm2 >/dev/null 2>&1; then
        warn "pm2 is not available; skipping Agents Server restart."
        return
    fi

    app_name_shell="$(shell_quote "$APP_NAME")"
    run_as_service_user bash -lc "
        set -e
        if pm2 describe $app_name_shell >/dev/null 2>&1; then
            pm2 restart $app_name_shell --update-env
            pm2 save
        else
            echo 'pm2 process $APP_NAME was not found; skipping restart.'
        fi
    "
}

apply_vps_runtime_configuration() {
    initialize_sudo
    resolve_run_user
    load_runtime_configuration_from_env_file
    configure_self_contained_s3_storage
    configure_nginx_reverse_proxy
    configure_firewall
    configure_ssl_certificates
    restart_agents_server_if_running
    print_summary
}

apply_code_runner_configuration() {
    initialize_sudo
    resolve_run_user
    load_runtime_configuration_from_env_file
    install_runner_dependencies
    configure_runner_authentication
    restart_agents_server_if_running
    print_summary
}

self_update_agents_server() {
    local target_ref=""
    local finished_at=""
    local old_repository_dir=""
    local old_app_name=""
    local old_port=""
    local replacement_app_name=""
    local replacement_port=""

    initialize_sudo
    resolve_run_user
    load_runtime_configuration_from_env_file
    rerun_self_update_from_stable_script "$@"

    target_ref="$PROMPTBOOK_REPOSITORY_REF"
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --branch)
                shift
                [[ $# -gt 0 ]] || fail "Missing value for --branch."
                target_ref="$1"
                ;;
            --branch=*)
                target_ref="${1#--branch=}"
                ;;
            *)
                fail "Unknown self-update option '$1'."
                ;;
        esac
        shift
    done

    PROMPTBOOK_REPOSITORY_REF="$(normalize_promptbook_repository_ref "$target_ref")"
    SELF_UPDATE_STARTED_AT="$(date --utc --iso-8601=seconds)"
    old_repository_dir="$PROMPTBOOK_REPOSITORY_DIR"
    old_app_name="$APP_NAME"
    old_port="$PORT"

    SELF_UPDATE_CURRENT_COMMIT="$(read_repository_commit_sha "$old_repository_dir")"
    write_self_update_status_file \
        "running" \
        "$PROMPTBOOK_REPOSITORY_REF" \
        "Preparing standalone VPS self-update for $(resolve_promptbook_environment_label "$PROMPTBOOK_REPOSITORY_REF") ($PROMPTBOOK_REPOSITORY_REF)." \
        "" \
        "$SELF_UPDATE_CURRENT_COMMIT" \
        "" \
        "" \
        "$$"

    trap write_failed_self_update_status_on_exit EXIT

    SELF_UPDATE_TARGET_COMMIT="$(read_remote_repository_commit_sha "$PROMPTBOOK_REPOSITORY_REF")"
    write_self_update_status_file "running" "$PROMPTBOOK_REPOSITORY_REF" "Installing the latest Promptbook checkout into a versioned release directory." "" "$SELF_UPDATE_CURRENT_COMMIT" "$SELF_UPDATE_TARGET_COMMIT" "" "$$"
    install_promptbook_repository

    SELF_UPDATE_CURRENT_COMMIT="$(read_repository_commit_sha)"
    write_self_update_status_file "running" "$PROMPTBOOK_REPOSITORY_REF" "Refreshing the Promptbook CLI launcher." "" "$SELF_UPDATE_CURRENT_COMMIT" "$SELF_UPDATE_TARGET_COMMIT" "" "$$"
    install_promptbook_cli_launcher

    write_self_update_status_file "running" "$PROMPTBOOK_REPOSITORY_REF" "Running Agents Server database migrations." "" "$SELF_UPDATE_CURRENT_COMMIT" "$SELF_UPDATE_TARGET_COMMIT" "" "$$"
    run_agents_server_database_migrations

    write_self_update_status_file "running" "$PROMPTBOOK_REPOSITORY_REF" "Rebuilding the Agents Server." "" "$SELF_UPDATE_CURRENT_COMMIT" "$SELF_UPDATE_TARGET_COMMIT" "" "$$"
    build_agents_server

    if [[ "$(realpath -m "$old_repository_dir")" == "$(realpath -m "$PROMPTBOOK_REPOSITORY_DIR")" ]]; then
        ENV_FILE="$INSTALL_DIR/.env"
        set_env_value PROMPTBOOK_REPOSITORY_REF "$PROMPTBOOK_REPOSITORY_REF"
        set_env_value PTBK_REPOSITORY_DIR "$PROMPTBOOK_REPOSITORY_DIR"
        set_env_value PTBK_VPS_INSTALL_SCRIPT "$PROMPTBOOK_REPOSITORY_DIR/other/vps/install.sh"
        finished_at="$(date --utc --iso-8601=seconds)"
        write_self_update_status_file "succeeded" "$PROMPTBOOK_REPOSITORY_REF" "Standalone VPS self-update finished; the requested release was already installed." "" "$SELF_UPDATE_CURRENT_COMMIT" "$SELF_UPDATE_TARGET_COMMIT" "$finished_at" ""
        trap - EXIT
        return
    fi

    replacement_app_name="$(resolve_pm2_release_app_name)"
    replacement_port="$(resolve_next_agents_server_port "$old_port")"

    write_self_update_status_file "running" "$PROMPTBOOK_REPOSITORY_REF" "Starting the replacement Agents Server pm2 process on port $replacement_port." "" "$SELF_UPDATE_CURRENT_COMMIT" "$SELF_UPDATE_TARGET_COMMIT" "" "$$"
    start_pm2_agents_server_process "$replacement_app_name" "$replacement_port"
    wait_for_agents_server_health "$replacement_app_name" "$replacement_port"

    write_self_update_status_file "running" "$PROMPTBOOK_REPOSITORY_REF" "Switching nginx to the healthy replacement process." "" "$SELF_UPDATE_CURRENT_COMMIT" "$SELF_UPDATE_TARGET_COMMIT" "" "$$"
    switch_nginx_to_agents_server_port "$replacement_port"

    ENV_FILE="$INSTALL_DIR/.env"
    set_env_value PORT "$replacement_port"
    set_env_value PTBK_RELEASES_DIR "$PTBK_RELEASES_DIR"
    set_env_value PTBK_REPOSITORY_DIR "$PROMPTBOOK_REPOSITORY_DIR"
    set_env_value PROMPTBOOK_REPOSITORY_REF "$PROMPTBOOK_REPOSITORY_REF"
    set_env_value PTBK_VPS_INSTALL_SCRIPT "$PROMPTBOOK_REPOSITORY_DIR/other/vps/install.sh"
    set_env_value PTBK_PM2_BASE_APP_NAME "$PTBK_PM2_BASE_APP_NAME"
    set_env_value PTBK_PM2_APP_NAME "$replacement_app_name"

    write_self_update_status_file "running" "$PROMPTBOOK_REPOSITORY_REF" "Removing the previous pm2 process and repository checkout." "" "$SELF_UPDATE_CURRENT_COMMIT" "$SELF_UPDATE_TARGET_COMMIT" "" "$$"
    if [[ "$old_app_name" != "$replacement_app_name" ]]; then
        stop_pm2_process_if_running "$old_app_name"
    fi
    remove_promptbook_repository_directory_if_safe "$old_repository_dir" "$PROMPTBOOK_REPOSITORY_DIR"

    finished_at="$(date --utc --iso-8601=seconds)"
    write_self_update_status_file "succeeded" "$PROMPTBOOK_REPOSITORY_REF" "Standalone VPS self-update finished successfully." "" "$SELF_UPDATE_CURRENT_COMMIT" "$SELF_UPDATE_TARGET_COMMIT" "$finished_at" ""
    trap - EXIT
}

print_summary() {
    local public_site_url=""
    public_site_url="$(grep -E '^NEXT_PUBLIC_SITE_URL=' "$ENV_FILE" | tail -n 1 | cut -d= -f2-)"

    log "Agents Server is configured."
    log "URL: $public_site_url"
    if [[ -n "$SERVERS" ]]; then
        log "Domains: $SERVERS"
    else
        log "Domains: none configured; use http://$PUBLIC_IP_ADDRESS and add domains from System -> Super Admin -> Servers."
    fi
    log "Project directory: $INSTALL_DIR"
    log "Repository: $PROMPTBOOK_REPOSITORY_DIR"
    log "Environment: $(resolve_promptbook_environment_label "$PROMPTBOOK_REPOSITORY_REF") ($PROMPTBOOK_REPOSITORY_REF)"
    log "Database: $(get_env_value PTBK_AGENTS_SERVER_SQLITE_PATH)"
    log "File storage: $(normalize_file_storage_mode "$REQUESTED_FILE_STORAGE_MODE")"
    if is_self_contained_s3_storage_enabled; then
        log "Self-contained S3 directory: $REQUESTED_SELF_CONTAINED_S3_DIRECTORY"
        log "Self-contained S3 service: $PTBK_SELF_CONTAINED_S3_SERVICE_NAME"
    fi
    log "pm2 process: $APP_NAME"
    log "pm2 hourly restart: $PM2_HOURLY_RESTART_CRON"
    log "nginx site: /etc/nginx/sites-available/$NGINX_SITE_NAME"

    if [[ -n "$GENERATED_ADMIN_PASSWORD" ]]; then
        log "Generated ADMIN_PASSWORD: $GENERATED_ADMIN_PASSWORD"
    fi

    log "Useful commands:"
    log "  sudo -u $RUN_USER pm2 status"
    log "  sudo -u $RUN_USER pm2 logs $APP_NAME"
    log "  sudo -u $RUN_USER pm2 restart $APP_NAME --update-env"
    log "  sudo nginx -t && sudo systemctl reload nginx"
    log "  sudo certbot renew --dry-run"
}

main() {
    initialize_sudo
    resolve_run_user
    check_platform
    confirm_fresh_vps_installation
    check_required_resources

    PTBK_AGENT="$(prompt_with_default "Coding runner" "$PTBK_AGENT")"
    PTBK_MODEL="$(prompt_with_default "Runner model" "$PTBK_MODEL")"
    PTBK_THINKING_LEVEL="$(prompt_with_default "Runner thinking level" "$PTBK_THINKING_LEVEL")"
    PROMPTBOOK_REPOSITORY_REF="$(normalize_promptbook_repository_ref "$(prompt_with_default "Deployment environment (production/main/preview/LTS)" "$PROMPTBOOK_REPOSITORY_REF")")"
    PORT="$(prompt_with_default "Agents Server port" "$PORT")"
    configure_domains
    if [[ "${#DOMAINS[@]}" -gt 0 ]]; then
        LETS_ENCRYPT_EMAIL="$(prompt_with_default "Let's Encrypt email (optional)" "$LETS_ENCRYPT_EMAIL")"
    fi
    prompt_public_site_url
    prompt_file_storage
    prompt_api_keys_and_admin_password
    prompt_default_agents_installation
    prompt_runner_authentication_preference

    configure_required_resources
    install_system_packages
    install_nodejs
    configure_install_directory
    install_global_process_manager
    install_promptbook_repository
    install_agents_server_browser_dependencies
    install_promptbook_cli_launcher
    initialize_promptbook_project
    install_default_agents
    configure_self_contained_s3_storage
    configure_code_runner_for_initial_installation
    configure_pm2_startup
    build_agents_server
    start_agents_server
    configure_nginx_reverse_proxy
    configure_firewall
    configure_ssl_certificates
    print_summary
}

while [[ "$#" -gt 0 ]]; do
    case "$1" in
        --non-interactive)
            PTBK_NON_INTERACTIVE=1
            shift
            ;;
        *)
            break
            ;;
    esac
done

if [[ "${1:-}" == "apply-domains" ]]; then
    shift
    apply_vps_runtime_configuration "$@"
    exit 0
fi

if [[ "${1:-}" == "apply-runner" ]]; then
    shift
    apply_code_runner_configuration "$@"
    exit 0
fi

if [[ "${1:-}" == "authenticate-runner" ]]; then
    shift
    authenticate_code_runner "$@"
    exit 0
fi

if [[ "${1:-}" == "cli-shell" ]]; then
    shift
    open_server_cli_shell "$@"
    exit 0
fi

if [[ "${1:-}" == "self-update" ]]; then
    shift
    self_update_agents_server "$@"
    exit 0
fi

main "$@"
