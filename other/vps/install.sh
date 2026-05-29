#!/usr/bin/env bash

set -Eeuo pipefail

APP_NAME="${PTBK_PM2_APP_NAME:-promptbook-agents-server}"
INSTALL_DIR="${PTBK_INSTALL_DIR:-/opt/promptbook-agents-server}"
NODE_MAJOR_VERSION="${NODE_MAJOR_VERSION:-22}"
NODE_MINIMUM_VERSION="${NODE_MINIMUM_VERSION:-}"
PORT="${PORT:-${PTBK_PORT:-4440}}"
PROMPTBOOK_REPOSITORY_URL="${PROMPTBOOK_REPOSITORY_URL:-https://github.com/webgptorg/promptbook.git}"
PROMPTBOOK_REPOSITORY_REF="${PROMPTBOOK_REPOSITORY_REF:-production}"
PROMPTBOOK_REPOSITORY_DIR="${PROMPTBOOK_REPOSITORY_DIR:-$INSTALL_DIR/repository}"
PTBK_BIN_DIR="${PTBK_BIN_DIR:-$INSTALL_DIR/bin}"
PTBK_COMMAND_PATH="${PTBK_COMMAND_PATH:-$PTBK_BIN_DIR/ptbk}"
PTBK_GLOBAL_COMMAND_PATH="${PTBK_GLOBAL_COMMAND_PATH:-/usr/local/bin/ptbk}"
PTBK_AGENT="${PTBK_AGENT:-github-copilot}"
PTBK_MODEL="${PTBK_MODEL:-gpt-5.4}"
PTBK_THINKING_LEVEL="${PTBK_THINKING_LEVEL:-xhigh}"
PTBK_NON_INTERACTIVE="${PTBK_NON_INTERACTIVE:-0}"
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
PROMPTBOOK_SWAP_FILE="${PTBK_SWAP_FILE:-/swapfile-promptbook}"
MINIMUM_REQUIRED_MEMORY_MIB=8192
MINIMUM_REQUIRED_DISK_MIB=15360
PM2_HOURLY_RESTART_CRON='0 * * * *'
PTBK_SELF_UPDATE_STATUS_FILE="${PTBK_SELF_UPDATE_STATUS_FILE:-$INSTALL_DIR/.promptbook/self-update/self-update.status}"
PTBK_SELF_UPDATE_LOG_FILE="${PTBK_SELF_UPDATE_LOG_FILE:-$INSTALL_DIR/.promptbook/self-update/self-update.log}"
SELF_UPDATE_STARTED_AT=""

SUDO=()
RUN_USER=""
RUN_GROUP=""
RUN_HOME=""
ENV_FILE=""
REQUESTED_OPENAI_API_KEY=""
REQUESTED_ADMIN_PASSWORD=""
GENERATED_ADMIN_PASSWORD=""
AGENTS_SERVER_DATABASE_MODE="${PTBK_AGENTS_SERVER_DATABASE:-postgres}"
POSTGRES_HOST="localhost"
POSTGRES_PORT="5432"
POSTGRES_DATABASE="promptbook_agents_server"
POSTGRES_USERNAME="promptbook_agents_server"
POSTGRES_PASSWORD=""
GENERATED_POSTGRES_PASSWORD=""
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
    [[ "$PTBK_NON_INTERACTIVE" != "1" && -r /dev/tty && -w /dev/tty ]]
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

prompt_choice_with_default() {
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

resolve_environment_default() {
    local key="$1"
    local default_value="${2:-}"
    local existing_value=""

    existing_value="$(get_env_value "$key")"
    if [[ -n "$existing_value" ]]; then
        printf '%s' "$existing_value"
        return
    fi

    if [[ -n "${!key:-}" ]]; then
        printf '%s' "${!key}"
        return
    fi

    printf '%s' "$default_value"
}

normalize_database_mode() {
    local raw_mode="${1:-}"
    local normalized_mode=""

    normalized_mode="$(printf '%s' "$raw_mode" | tr '[:upper:]' '[:lower:]' | sed -E 's/^[[:space:]]+|[[:space:]]+$//g')"

    case "$normalized_mode" in
        '' | postgres | postgresql)
            printf 'postgres'
            ;;
        sqlite | local)
            printf 'sqlite'
            ;;
        *)
            fail "Unsupported Agents Server database '$raw_mode'. Use one of: postgres, sqlite."
            ;;
    esac
}

validate_postgres_identifier() {
    local label="$1"
    local value="$2"

    if [[ ! "$value" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
        fail "$label must use only letters, numbers, and underscores, and must not start with a number."
    fi
}

url_encode() {
    python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$1"
}

sql_escape_literal() {
    printf '%s' "$1" | sed "s/'/''/g"
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

encode_status_field() {
    printf '%s' "$1" | base64 | tr -d '\n'
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

read_repository_commit_sha() {
    if [[ ! -d "$PROMPTBOOK_REPOSITORY_DIR/.git" ]]; then
        printf ''
        return
    fi

    run_as_service_user git -C "$PROMPTBOOK_REPOSITORY_DIR" rev-parse HEAD 2>/dev/null || true
}

read_remote_repository_commit_sha() {
    local target_ref=""
    target_ref="$(normalize_promptbook_repository_ref "$1")"
    run_as_service_user git -C "$PROMPTBOOK_REPOSITORY_DIR" ls-remote origin "refs/heads/$target_ref" 2>/dev/null | awk 'NR == 1 { print $1 }'
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
    add_required_swap_file "$additional_swap_mib"
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
    sudo -v
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
    "${SUDO[@]}" env DEBIAN_FRONTEND=noninteractive apt-get update
    "${SUDO[@]}" env DEBIAN_FRONTEND=noninteractive apt-get install -y \
        ca-certificates \
        curl \
        git \
        gnupg \
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

install_postgresql_if_needed() {
    if [[ "$AGENTS_SERVER_DATABASE_MODE" != "postgres" ]]; then
        return
    fi

    log "Installing PostgreSQL."
    "${SUDO[@]}" env DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql postgresql-contrib
    "${SUDO[@]}" systemctl enable --now postgresql
}

configure_postgresql_database() {
    local database_exists=""
    local escaped_postgres_password=""

    if [[ "$AGENTS_SERVER_DATABASE_MODE" != "postgres" ]]; then
        return
    fi

    log "Configuring PostgreSQL database and user."
    "${SUDO[@]}" systemctl enable --now postgresql
    escaped_postgres_password="$(sql_escape_literal "$POSTGRES_PASSWORD")"
    "${SUDO[@]}" -u postgres psql postgres -v ON_ERROR_STOP=1 -c "DO \$\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$POSTGRES_USERNAME') THEN
        CREATE ROLE \"$POSTGRES_USERNAME\" LOGIN PASSWORD '$escaped_postgres_password';
    ELSE
        ALTER ROLE \"$POSTGRES_USERNAME\" WITH LOGIN PASSWORD '$escaped_postgres_password';
    END IF;
END
\$\$;"

    database_exists="$("${SUDO[@]}" -u postgres psql postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$POSTGRES_DATABASE'" | tr -d '[:space:]')"
    if [[ "$database_exists" != "1" ]]; then
        "${SUDO[@]}" -u postgres psql postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$POSTGRES_DATABASE\" OWNER \"$POSTGRES_USERNAME\";"
    else
        "${SUDO[@]}" -u postgres psql postgres -v ON_ERROR_STOP=1 -c "ALTER DATABASE \"$POSTGRES_DATABASE\" OWNER TO \"$POSTGRES_USERNAME\";"
    fi
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
    "${SUDO[@]}" env DEBIAN_FRONTEND=noninteractive apt-get update
    "${SUDO[@]}" env DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
}

install_global_process_manager() {
    log "Installing pm2."
    "${SUDO[@]}" npm install -g pm2

    if ! command -v pm2 >/dev/null 2>&1; then
        fail "The pm2 command was not installed. Check npm global installation output above."
    fi
}

install_promptbook_repository() {
    log "Installing Promptbook from $PROMPTBOOK_REPOSITORY_URL ($PROMPTBOOK_REPOSITORY_REF)."
    "${SUDO[@]}" mkdir -p "$PROMPTBOOK_REPOSITORY_DIR"
    "${SUDO[@]}" chown -R "$RUN_USER:$RUN_GROUP" "$PROMPTBOOK_REPOSITORY_DIR"

    if [[ -d "$PROMPTBOOK_REPOSITORY_DIR/.git" ]]; then
        run_as_service_user git -C "$PROMPTBOOK_REPOSITORY_DIR" remote set-url origin "$PROMPTBOOK_REPOSITORY_URL"
        run_as_service_user git -C "$PROMPTBOOK_REPOSITORY_DIR" fetch --depth 1 origin "$PROMPTBOOK_REPOSITORY_REF"
        run_as_service_user git -C "$PROMPTBOOK_REPOSITORY_DIR" checkout --detach FETCH_HEAD
    elif find "$PROMPTBOOK_REPOSITORY_DIR" -mindepth 1 -maxdepth 1 | grep -q .; then
        fail "$PROMPTBOOK_REPOSITORY_DIR exists and is not an empty Promptbook git checkout."
    else
        run_as_service_user git clone --depth 1 --branch "$PROMPTBOOK_REPOSITORY_REF" "$PROMPTBOOK_REPOSITORY_URL" "$PROMPTBOOK_REPOSITORY_DIR"
    fi

    log "Installing Promptbook repository dependencies."
    run_as_service_user bash -lc "cd $(shell_quote "$PROMPTBOOK_REPOSITORY_DIR") && npm ci --include=dev"
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

resolve_default_public_url() {
    local ip_address=""
    ip_address="$(resolve_public_ip_address)"

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

configure_install_directory() {
    log "Configuring $INSTALL_DIR."
    "${SUDO[@]}" mkdir -p "$INSTALL_DIR/.promptbook" "$INSTALL_DIR/.logs"
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

resolve_secret_default() {
    local key="$1"
    local existing_value=""

    existing_value="$(get_env_value "$key")"

    if [[ -n "$existing_value" ]]; then
        printf '%s' "$existing_value"
        return
    fi

    printf '%s' "${!key:-}"
}

prompt_api_keys_and_admin_password() {
    local default_openai_api_key=""
    local default_admin_password=""
    local openai_api_key_default_description="empty"
    local admin_password_default_description="auto-generate"

    default_openai_api_key="$(resolve_secret_default OPENAI_API_KEY)"
    default_admin_password="$(resolve_secret_default ADMIN_PASSWORD)"

    if [[ -n "$default_openai_api_key" ]]; then
        openai_api_key_default_description="keep existing"
    fi

    if [[ -n "$default_admin_password" ]]; then
        admin_password_default_description="keep existing"
    fi

    log "Press Enter to leave the OpenAI API key empty or keep the current value."
    REQUESTED_OPENAI_API_KEY="$(
        prompt_secret_with_default "OpenAI API key (optional)" "$openai_api_key_default_description" "$default_openai_api_key"
    )"

    log "Press Enter to auto-generate the admin password or keep the current value."
    REQUESTED_ADMIN_PASSWORD="$(
        prompt_secret_with_default "Admin password" "$admin_password_default_description" "$default_admin_password"
    )"
}

prompt_database_configuration() {
    local database_mode_default=""
    local postgres_host_default=""
    local postgres_port_default=""
    local postgres_database_default=""
    local postgres_username_default=""
    local postgres_password_default=""
    local postgres_password_default_description="auto-generate"

    database_mode_default="$(normalize_database_mode "$(resolve_environment_default PTBK_AGENTS_SERVER_DATABASE postgres)")"
    AGENTS_SERVER_DATABASE_MODE="$(normalize_database_mode "$(prompt_choice_with_default "Agents Server database (postgres/sqlite)" "$database_mode_default")")"

    if [[ "$AGENTS_SERVER_DATABASE_MODE" != "postgres" ]]; then
        POSTGRES_PASSWORD=""
        GENERATED_POSTGRES_PASSWORD=""
        return
    fi

    postgres_host_default="$(resolve_environment_default PTBK_AGENTS_SERVER_POSTGRES_HOST "$POSTGRES_HOST")"
    postgres_port_default="$(resolve_environment_default PTBK_AGENTS_SERVER_POSTGRES_PORT "$POSTGRES_PORT")"
    postgres_database_default="$(resolve_environment_default PTBK_AGENTS_SERVER_POSTGRES_DATABASE "$POSTGRES_DATABASE")"
    postgres_username_default="$(resolve_environment_default PTBK_AGENTS_SERVER_POSTGRES_USER "$POSTGRES_USERNAME")"
    postgres_password_default="$(resolve_environment_default PTBK_AGENTS_SERVER_POSTGRES_PASSWORD "")"

    if [[ -z "$postgres_password_default" ]]; then
        postgres_password_default="$(openssl rand -hex 24)"
        GENERATED_POSTGRES_PASSWORD="$postgres_password_default"
    else
        postgres_password_default_description="keep existing"
    fi

    log "Press Enter to use the default standalone PostgreSQL configuration."
    POSTGRES_HOST="$(prompt_with_default "PostgreSQL host" "$postgres_host_default")"
    POSTGRES_PORT="$(prompt_with_default "PostgreSQL port" "$postgres_port_default")"
    POSTGRES_DATABASE="$(prompt_with_default "PostgreSQL database name" "$postgres_database_default")"
    POSTGRES_USERNAME="$(prompt_with_default "PostgreSQL username" "$postgres_username_default")"
    POSTGRES_PASSWORD="$(
        prompt_secret_with_default "PostgreSQL password" "$postgres_password_default_description" "$postgres_password_default"
    )"

    [[ -z "$POSTGRES_PASSWORD" ]] && fail "PostgreSQL password must not be empty."
    [[ "$POSTGRES_HOST" != "localhost" && "$POSTGRES_HOST" != "127.0.0.1" ]] &&
        fail "Standalone VPS PostgreSQL host must be localhost or 127.0.0.1."
    [[ ! "$POSTGRES_PORT" =~ ^[0-9]+$ ]] && fail "PostgreSQL port must be numeric."
    validate_postgres_identifier "PostgreSQL database name" "$POSTGRES_DATABASE"
    validate_postgres_identifier "PostgreSQL username" "$POSTGRES_USERNAME"
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

configure_environment() {
    local sqlite_path="$INSTALL_DIR/.promptbook/agents-server.sqlite"
    local default_public_url=""
    local public_site_url=""
    local first_domain="${DOMAINS[0]:-}"
    local table_prefix=""
    local postgres_connection_string=""

    if [[ -n "$first_domain" ]]; then
        default_public_url="${PTBK_PUBLIC_SITE_URL:-${NEXT_PUBLIC_SITE_URL:-https://${first_domain}}}"
        table_prefix="$(build_domain_table_prefix "$first_domain")"
    else
        default_public_url="${PTBK_PUBLIC_SITE_URL:-${NEXT_PUBLIC_SITE_URL:-$(resolve_default_public_url)}}"
    fi

    public_site_url="$(prompt_with_default "Public Agents Server URL" "$default_public_url")"

    set_env_value PTBK_AGENTS_SERVER_DATABASE "$AGENTS_SERVER_DATABASE_MODE"
    if [[ "$AGENTS_SERVER_DATABASE_MODE" == "sqlite" ]]; then
        set_env_value PTBK_AGENTS_SERVER_SQLITE_PATH "$sqlite_path"
        set_env_value PTBK_AGENTS_SERVER_POSTGRES_HOST ""
        set_env_value PTBK_AGENTS_SERVER_POSTGRES_PORT ""
        set_env_value PTBK_AGENTS_SERVER_POSTGRES_DATABASE ""
        set_env_value PTBK_AGENTS_SERVER_POSTGRES_USER ""
        set_env_value PTBK_AGENTS_SERVER_POSTGRES_PASSWORD ""
        set_env_value POSTGRES_URL ""
        set_env_value DATABASE_URL ""
        set_env_value SUPABASE_AUTO_MIGRATE false
    else
        postgres_connection_string="postgresql://$(url_encode "$POSTGRES_USERNAME"):$(url_encode "$POSTGRES_PASSWORD")@$(url_encode "$POSTGRES_HOST"):${POSTGRES_PORT}/$(url_encode "$POSTGRES_DATABASE")"
        set_env_value PTBK_AGENTS_SERVER_SQLITE_PATH ""
        set_env_value PTBK_AGENTS_SERVER_POSTGRES_HOST "$POSTGRES_HOST"
        set_env_value PTBK_AGENTS_SERVER_POSTGRES_PORT "$POSTGRES_PORT"
        set_env_value PTBK_AGENTS_SERVER_POSTGRES_DATABASE "$POSTGRES_DATABASE"
        set_env_value PTBK_AGENTS_SERVER_POSTGRES_USER "$POSTGRES_USERNAME"
        set_env_value PTBK_AGENTS_SERVER_POSTGRES_PASSWORD "$POSTGRES_PASSWORD"
        set_env_value POSTGRES_URL "$postgres_connection_string"
        set_env_value DATABASE_URL "$postgres_connection_string"
        set_env_value SUPABASE_AUTO_MIGRATE true
    fi
    set_env_value NEXT_PUBLIC_SITE_URL "$public_site_url"
    set_env_value SERVERS "$SERVERS"
    set_env_value SUPABASE_TABLE_PREFIX "$table_prefix"
    set_env_value NEXT_PUBLIC_SUPABASE_URL ""
    set_env_value NEXT_PUBLIC_SUPABASE_ANON_KEY ""
    set_env_value SUPABASE_SERVICE_ROLE_KEY ""
    set_env_value PTBK_AGENT "$PTBK_AGENT"
    set_env_value PTBK_MODEL "$PTBK_MODEL"
    set_env_value PTBK_THINKING_LEVEL "$PTBK_THINKING_LEVEL"
    set_env_value PORT "$PORT"
    set_env_value NODE_ENV production
    set_env_value PTBK_HOSTNAME 127.0.0.1
    set_env_value PTBK_PUBLIC_IP_ADDRESS "$PUBLIC_IP_ADDRESS"
    set_env_value PTBK_INSTALL_DIR "$INSTALL_DIR"
    set_env_value PTBK_REPOSITORY_DIR "$PROMPTBOOK_REPOSITORY_DIR"
    set_env_value PROMPTBOOK_REPOSITORY_REF "$PROMPTBOOK_REPOSITORY_REF"
    set_env_value PTBK_VPS_INSTALL_SCRIPT "$PROMPTBOOK_REPOSITORY_DIR/other/vps/install.sh"
    set_env_value PTBK_AGENTS_SERVER_ENV_FILE "$ENV_FILE"
    set_env_value PTBK_PM2_APP_NAME "$APP_NAME"
    set_env_value PTBK_NGINX_SITE_NAME "$NGINX_SITE_NAME"
    set_env_value LETS_ENCRYPT_EMAIL "$LETS_ENCRYPT_EMAIL"
    set_env_value OPENAI_API_KEY "$REQUESTED_OPENAI_API_KEY"

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

configure_runner_authentication() {
    local authentication_command=""
    local authentication_binary=""

    authentication_command="$(resolve_runner_authentication_command)"
    if [[ -z "$authentication_command" ]]; then
        return
    fi

    if [[ "$PTBK_AGENT" == "github-copilot" ]] && [[ -n "${COPILOT_GITHUB_TOKEN:-}" || -n "${GH_TOKEN:-}" ]]; then
        log "GitHub Copilot token environment variable detected and stored in $ENV_FILE."
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

    if ! prompt_yes_no "Open the $PTBK_AGENT CLI now for authentication?" "yes"; then
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
        "${SUDO[@]}" env DEBIAN_FRONTEND=noninteractive apt-get update
        "${SUDO[@]}" env DEBIAN_FRONTEND=noninteractive apt-get install -y "$headers_more_package"
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
    "${SUDO[@]}" install -d -m 755 "$NGINX_FALLBACK_DIR"
    "${SUDO[@]}" tee "$NGINX_FALLBACK_HTML_PATH" >/dev/null <<'EOF'
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Promptbook Agents Server</title>
    <style>
        :root {
            color-scheme: light dark;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: #f7f7f5;
            color: #202124;
        }

        body {
            min-height: 100vh;
            margin: 0;
            display: grid;
            place-items: center;
            background:
                linear-gradient(135deg, rgba(26, 115, 232, 0.08), transparent 42%),
                linear-gradient(315deg, rgba(52, 168, 83, 0.10), transparent 38%),
                #f7f7f5;
        }

        main {
            width: min(92vw, 520px);
            padding: 40px;
            border: 1px solid rgba(32, 33, 36, 0.14);
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.86);
            box-shadow: 0 24px 60px rgba(32, 33, 36, 0.10);
        }

        .brand {
            margin: 0 0 18px;
            color: #1a73e8;
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 0;
            text-transform: uppercase;
        }

        h1 {
            margin: 0 0 12px;
            font-size: 40px;
            line-height: 1;
            letter-spacing: 0;
        }

        p {
            margin: 0;
            color: #4f565f;
            font-size: 16px;
            line-height: 1.6;
        }

        @media (prefers-color-scheme: dark) {
            :root {
                background: #111318;
                color: #f4f7fb;
            }

            body {
                background:
                    linear-gradient(135deg, rgba(138, 180, 248, 0.12), transparent 42%),
                    linear-gradient(315deg, rgba(129, 201, 149, 0.10), transparent 38%),
                    #111318;
            }

            main {
                border-color: rgba(244, 247, 251, 0.14);
                background: rgba(25, 28, 33, 0.88);
                box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
            }

            .brand {
                color: #8ab4f8;
            }

            p {
                color: #c7ccd4;
            }
        }

        @media (max-width: 480px) {
            main {
                padding: 28px;
            }

            h1 {
                font-size: 32px;
            }
        }
    </style>
</head>
<body>
    <main>
        <p class="brand">Promptbook Agents Server</p>
        <h1>Server is getting ready</h1>
        <p>This Promptbook Agents Server is installed, but the application is not available from this route right now.</p>
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
        if [[ -e "$default_page_path" ]] && ! grep -Eiq 'welcome to nginx|nginx' "$default_page_path"; then
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

    configure_nginx_branding

    server_names="$(join_by_space "${DOMAINS[@]}")"

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
    log "Running Agents Server database migrations."
    run_as_service_user bash -lc "set -a && source $(shell_quote "$ENV_FILE") && set +a && cd $(shell_quote "$PROMPTBOOK_REPOSITORY_DIR") && npx --yes tsx ./apps/agents-server/src/database/migrate.ts"
}

start_agents_server() {
    local install_dir_shell=""
    local app_name_shell=""
    local ptbk_command_shell=""
    local agent_shell=""
    local model_shell=""
    local thinking_shell=""
    local port_shell=""

    install_dir_shell="$(shell_quote "$INSTALL_DIR")"
    app_name_shell="$(shell_quote "$APP_NAME")"
    ptbk_command_shell="$(shell_quote "$PTBK_COMMAND_PATH")"
    agent_shell="$(shell_quote "$PTBK_AGENT")"
    model_shell="$(shell_quote "$PTBK_MODEL")"
    thinking_shell="$(shell_quote "$PTBK_THINKING_LEVEL")"
    port_shell="$(shell_quote "$PORT")"

    log "Starting Agents Server with pm2."
    run_as_service_user bash -lc "
        set -e
        cd $install_dir_shell
        PTBK_PATH=$ptbk_command_shell
        if pm2 describe $app_name_shell >/dev/null 2>&1; then
            pm2 delete $app_name_shell >/dev/null
        fi
        pm2 start \"\$PTBK_PATH\" --interpreter bash --name $app_name_shell --time --cron-restart $(shell_quote "$PM2_HOURLY_RESTART_CRON") --cwd $install_dir_shell -- agents-server start --agent $agent_shell --model $model_shell --thinking-level $thinking_shell --port $port_shell --no-ui
        pm2 save
    "
}

load_runtime_configuration_from_env_file() {
    local env_value=""

    ENV_FILE="$INSTALL_DIR/.env"
    if [[ ! -r "$ENV_FILE" ]]; then
        fail "Cannot apply VPS configuration because $ENV_FILE does not exist or is not readable."
    fi

    env_value="$(get_env_value PTBK_PM2_APP_NAME)"
    [[ -n "$env_value" ]] && APP_NAME="$env_value"

    env_value="$(get_env_value PTBK_REPOSITORY_DIR)"
    [[ -n "$env_value" ]] && PROMPTBOOK_REPOSITORY_DIR="$env_value"

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

    env_value="$(get_env_value PTBK_AGENTS_SERVER_DATABASE)"
    [[ -n "$env_value" ]] && AGENTS_SERVER_DATABASE_MODE="$(normalize_database_mode "$env_value")"

    env_value="$(get_env_value PTBK_AGENTS_SERVER_POSTGRES_HOST)"
    [[ -n "$env_value" ]] && POSTGRES_HOST="$env_value"

    env_value="$(get_env_value PTBK_AGENTS_SERVER_POSTGRES_PORT)"
    [[ -n "$env_value" ]] && POSTGRES_PORT="$env_value"

    env_value="$(get_env_value PTBK_AGENTS_SERVER_POSTGRES_DATABASE)"
    [[ -n "$env_value" ]] && POSTGRES_DATABASE="$env_value"

    env_value="$(get_env_value PTBK_AGENTS_SERVER_POSTGRES_USER)"
    [[ -n "$env_value" ]] && POSTGRES_USERNAME="$env_value"

    env_value="$(get_env_value PTBK_AGENTS_SERVER_POSTGRES_PASSWORD)"
    [[ -n "$env_value" ]] && POSTGRES_PASSWORD="$env_value"

    SERVERS="$(get_env_value SERVERS)"
    set_domains_from_csv "$SERVERS"

    PUBLIC_IP_ADDRESS="$(get_env_value PTBK_PUBLIC_IP_ADDRESS)"
    if [[ -z "$PUBLIC_IP_ADDRESS" ]]; then
        PUBLIC_IP_ADDRESS="$(resolve_public_ip_address)"
    fi
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
    local current_commit=""
    local target_commit=""
    local finished_at=""

    initialize_sudo
    resolve_run_user
    load_runtime_configuration_from_env_file

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

    current_commit="$(read_repository_commit_sha)"
    write_self_update_status_file \
        "running" \
        "$PROMPTBOOK_REPOSITORY_REF" \
        "Preparing standalone VPS self-update for $(resolve_promptbook_environment_label "$PROMPTBOOK_REPOSITORY_REF") ($PROMPTBOOK_REPOSITORY_REF)." \
        "" \
        "$current_commit" \
        "" \
        "" \
        "$$"

    trap '
        local exit_code=$?
        if [[ "$exit_code" -ne 0 ]]; then
            finished_at="$(date --utc --iso-8601=seconds)"
            write_self_update_status_file "failed" "$PROMPTBOOK_REPOSITORY_REF" "Self-update failed." "The standalone VPS self-update exited with status $exit_code. Review the installer log for details." "$current_commit" "$target_commit" "$finished_at" "$$"
        fi
        exit "$exit_code"
    ' EXIT

    target_commit="$(read_remote_repository_commit_sha "$PROMPTBOOK_REPOSITORY_REF")"
    write_self_update_status_file "running" "$PROMPTBOOK_REPOSITORY_REF" "Downloading the latest Promptbook repository checkout." "" "$current_commit" "$target_commit" "" "$$"
    install_promptbook_repository

    current_commit="$(read_repository_commit_sha)"
    write_self_update_status_file "running" "$PROMPTBOOK_REPOSITORY_REF" "Refreshing the Promptbook CLI launcher." "" "$current_commit" "$target_commit" "" "$$"
    install_promptbook_cli_launcher

    write_self_update_status_file "running" "$PROMPTBOOK_REPOSITORY_REF" "Running Agents Server database migrations." "" "$current_commit" "$target_commit" "" "$$"
    run_agents_server_database_migrations

    write_self_update_status_file "running" "$PROMPTBOOK_REPOSITORY_REF" "Rebuilding the Agents Server." "" "$current_commit" "$target_commit" "" "$$"
    build_agents_server

    ENV_FILE="$INSTALL_DIR/.env"
    set_env_value PROMPTBOOK_REPOSITORY_REF "$PROMPTBOOK_REPOSITORY_REF"
    set_env_value PTBK_VPS_INSTALL_SCRIPT "$PROMPTBOOK_REPOSITORY_DIR/other/vps/install.sh"

    write_self_update_status_file "running" "$PROMPTBOOK_REPOSITORY_REF" "Restarting the Agents Server with pm2." "" "$current_commit" "$target_commit" "" "$$"
    restart_agents_server_if_running

    finished_at="$(date --utc --iso-8601=seconds)"
    write_self_update_status_file "succeeded" "$PROMPTBOOK_REPOSITORY_REF" "Standalone VPS self-update finished successfully." "" "$current_commit" "$target_commit" "$finished_at" ""
    trap - EXIT
}

print_summary() {
    local database_mode=""
    local public_site_url=""
    local configured_postgres_host=""
    local configured_postgres_port=""
    local configured_postgres_database=""
    local configured_postgres_username=""

    database_mode="$(grep -E '^PTBK_AGENTS_SERVER_DATABASE=' "$ENV_FILE" | tail -n 1 | cut -d= -f2-)"
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
    if [[ "$database_mode" == "postgres" ]]; then
        configured_postgres_host="$(grep -E '^PTBK_AGENTS_SERVER_POSTGRES_HOST=' "$ENV_FILE" | tail -n 1 | cut -d= -f2-)"
        configured_postgres_port="$(grep -E '^PTBK_AGENTS_SERVER_POSTGRES_PORT=' "$ENV_FILE" | tail -n 1 | cut -d= -f2-)"
        configured_postgres_database="$(grep -E '^PTBK_AGENTS_SERVER_POSTGRES_DATABASE=' "$ENV_FILE" | tail -n 1 | cut -d= -f2-)"
        configured_postgres_username="$(grep -E '^PTBK_AGENTS_SERVER_POSTGRES_USER=' "$ENV_FILE" | tail -n 1 | cut -d= -f2-)"
        log "Database: PostgreSQL ($configured_postgres_database on $configured_postgres_host:$configured_postgres_port as $configured_postgres_username)"
    else
        log "Database: SQLite ($INSTALL_DIR/.promptbook/agents-server.sqlite)"
    fi
    log "pm2 process: $APP_NAME"
    log "pm2 hourly restart: $PM2_HOURLY_RESTART_CRON"
    log "nginx site: /etc/nginx/sites-available/$NGINX_SITE_NAME"

    if [[ "$database_mode" == "postgres" ]]; then
        log "PostgreSQL password: $POSTGRES_PASSWORD"
    fi

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
    prompt_database_configuration
    prompt_api_keys_and_admin_password

    install_system_packages
    install_postgresql_if_needed
    install_nodejs
    configure_install_directory
    install_global_process_manager
    install_promptbook_repository
    install_promptbook_cli_launcher
    install_runner_dependencies
    configure_postgresql_database
    initialize_promptbook_project
    configure_runner_authentication
    configure_pm2_startup
    run_agents_server_database_migrations
    build_agents_server
    start_agents_server
    configure_nginx_reverse_proxy
    configure_firewall
    configure_ssl_certificates
    print_summary
}

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

if [[ "${1:-}" == "self-update" ]]; then
    shift
    self_update_agents_server "$@"
    exit 0
fi

main "$@"
