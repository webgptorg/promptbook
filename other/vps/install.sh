#!/usr/bin/env bash

set -Eeuo pipefail

APP_NAME="${PTBK_PM2_APP_NAME:-promptbook-agents-server}"
INSTALL_DIR="${PTBK_INSTALL_DIR:-/opt/promptbook-agents-server}"
NODE_MAJOR_VERSION="${NODE_MAJOR_VERSION:-22}"
PORT="${PORT:-${PTBK_PORT:-4440}}"
PROMPTBOOK_REPOSITORY_URL="${PROMPTBOOK_REPOSITORY_URL:-https://github.com/webgptorg/promptbook.git}"
PROMPTBOOK_REPOSITORY_REF="${PROMPTBOOK_REPOSITORY_REF:-main}"
PROMPTBOOK_REPOSITORY_DIR="${PROMPTBOOK_REPOSITORY_DIR:-$INSTALL_DIR/repository}"
PTBK_BIN_DIR="${PTBK_BIN_DIR:-$INSTALL_DIR/bin}"
PTBK_COMMAND_PATH="${PTBK_COMMAND_PATH:-$PTBK_BIN_DIR/ptbk}"
PTBK_GLOBAL_COMMAND_PATH="${PTBK_GLOBAL_COMMAND_PATH:-/usr/local/bin/ptbk}"
PTBK_AGENT="${PTBK_AGENT:-github-copilot}"
PTBK_MODEL="${PTBK_MODEL:-gpt-5.4}"
PTBK_THINKING_LEVEL="${PTBK_THINKING_LEVEL:-xhigh}"
PTBK_NON_INTERACTIVE="${PTBK_NON_INTERACTIVE:-0}"
SERVERS="${SERVERS:-}"
LETS_ENCRYPT_EMAIL="${LETS_ENCRYPT_EMAIL:-${CERTBOT_EMAIL:-}}"
NGINX_SITE_NAME="${PTBK_NGINX_SITE_NAME:-promptbook-agents-server}"
PROMPTBOOK_SWAP_FILE="${PTBK_SWAP_FILE:-/swapfile-promptbook}"
MINIMUM_REQUIRED_MEMORY_MIB=8192
MINIMUM_REQUIRED_DISK_MIB=15360

SUDO=()
RUN_USER=""
RUN_GROUP=""
RUN_HOME=""
ENV_FILE=""
REQUESTED_OPENAI_API_KEY=""
REQUESTED_ADMIN_PASSWORD=""
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
        certbot \
        python3-certbot-nginx
}

is_node_version_supported() {
    command -v node >/dev/null 2>&1 &&
        node -e "const major = Number(process.versions.node.split('.')[0]); process.exit(major >= Number(process.env.NODE_MAJOR_VERSION || 22) ? 0 : 1)" >/dev/null 2>&1
}

install_nodejs() {
    if is_node_version_supported && command -v npm >/dev/null 2>&1; then
        log "Node.js $(node --version) is already installed."
        return
    fi

    log "Installing Node.js ${NODE_MAJOR_VERSION}.x from NodeSource."
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

resolve_default_public_url() {
    local ip_address=""
    ip_address="$(resolve_public_ip_address)"

    printf 'http://%s:%s' "$ip_address" "$PORT"
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

configure_domains() {
    local default_domains="$SERVERS"
    local existing_env_file="${ENV_FILE:-$INSTALL_DIR/.env}"
    local requested_domains=""
    local domain=""

    if [[ -z "$default_domains" && -r "$existing_env_file" ]]; then
        default_domains="$(grep -E '^SERVERS=' "$existing_env_file" | tail -n 1 | cut -d= -f2- || true)"
    fi

    requested_domains="$(prompt_with_default "Custom domain(s), comma-separated" "$default_domains")"
    set_domains_from_csv "$requested_domains"

    if [[ "${#DOMAINS[@]}" -eq 0 ]]; then
        fail "At least one custom domain is required for the production VPS installer."
    fi

    SERVERS="$(join_by_comma "${DOMAINS[@]}")"
    PUBLIC_IP_ADDRESS="$(resolve_public_ip_address)"

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
    local first_domain="${DOMAINS[0]}"

    default_public_url="${PTBK_PUBLIC_SITE_URL:-${NEXT_PUBLIC_SITE_URL:-https://${first_domain}}}"
    public_site_url="$(prompt_with_default "Public Agents Server URL" "$default_public_url")"

    set_env_value PTBK_AGENTS_SERVER_DATABASE sqlite
    set_env_value PTBK_AGENTS_SERVER_SQLITE_PATH "$sqlite_path"
    set_env_value NEXT_PUBLIC_SITE_URL "$public_site_url"
    set_env_value SERVERS "$SERVERS"
    set_env_value SUPABASE_TABLE_PREFIX "$(build_domain_table_prefix "$first_domain")"
    set_env_value SUPABASE_AUTO_MIGRATE false
    set_env_value PTBK_AGENT "$PTBK_AGENT"
    set_env_value PTBK_MODEL "$PTBK_MODEL"
    set_env_value PTBK_THINKING_LEVEL "$PTBK_THINKING_LEVEL"
    set_env_value PORT "$PORT"
    set_env_value NODE_ENV production
    set_env_value PTBK_HOSTNAME 127.0.0.1
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
    if [[ "$PTBK_AGENT" != "github-copilot" ]]; then
        return
    fi

    if [[ -n "${COPILOT_GITHUB_TOKEN:-}" || -n "${GH_TOKEN:-}" ]]; then
        log "GitHub Copilot token environment variable detected and stored in $ENV_FILE."
        return
    fi

    if ! command -v copilot >/dev/null 2>&1; then
        warn "GitHub Copilot CLI is not available, skipping interactive authentication."
        return
    fi

    if ! prompt_yes_no "Open GitHub Copilot CLI now for /login and project trust setup?" "yes"; then
        warn "Skipping Copilot login. The runner must be authenticated before it can answer chats."
        return
    fi

    log "Starting GitHub Copilot CLI. Use /login if prompted, trust this directory, then exit Copilot to continue."
    set +e
    run_as_service_user bash -lc "cd $(shell_quote "$INSTALL_DIR") && copilot" < /dev/tty > /dev/tty
    local copilot_exit_code=$?
    set -e

    if [[ "$copilot_exit_code" -ne 0 ]]; then
        warn "Copilot exited with status $copilot_exit_code. The server will still start, but the runner may need authentication."
    fi
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

configure_nginx_reverse_proxy() {
    local nginx_available_path="/etc/nginx/sites-available/${NGINX_SITE_NAME}"
    local nginx_enabled_path="/etc/nginx/sites-enabled/${NGINX_SITE_NAME}"
    local server_names=""

    server_names="$(join_by_space "${DOMAINS[@]}")"

    log "Configuring nginx reverse proxy for $server_names."
    "${SUDO[@]}" tee "$nginx_available_path" >/dev/null <<EOF
map \$http_upgrade \$promptbook_connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    listen [::]:80;
    server_name ${server_names};

    server_tokens off;
    client_max_body_size 100m;

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_redirect off;

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
    }
}
EOF

    "${SUDO[@]}" ln -sfn "$nginx_available_path" "$nginx_enabled_path"
    "${SUDO[@]}" rm -f /etc/nginx/sites-enabled/default
    "${SUDO[@]}" nginx -t
    "${SUDO[@]}" systemctl enable nginx >/dev/null
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
    "${SUDO[@]}" certbot "${certbot_arguments[@]}"
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
        pm2 start \"\$PTBK_PATH\" --interpreter bash --name $app_name_shell --time --cwd $install_dir_shell -- agents-server start --agent $agent_shell --model $model_shell --thinking-level $thinking_shell --port $port_shell --no-ui
        pm2 save
    "
}

print_summary() {
    local public_site_url=""
    public_site_url="$(grep -E '^NEXT_PUBLIC_SITE_URL=' "$ENV_FILE" | tail -n 1 | cut -d= -f2-)"

    log "Agents Server is configured."
    log "URL: $public_site_url"
    log "Domains: $SERVERS"
    log "Project directory: $INSTALL_DIR"
    log "Repository: $PROMPTBOOK_REPOSITORY_DIR"
    log "Database: $INSTALL_DIR/.promptbook/agents-server.sqlite"
    log "pm2 process: $APP_NAME"
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
    check_required_resources

    PTBK_AGENT="$(prompt_with_default "Coding runner" "$PTBK_AGENT")"
    PTBK_MODEL="$(prompt_with_default "Runner model" "$PTBK_MODEL")"
    PTBK_THINKING_LEVEL="$(prompt_with_default "Runner thinking level" "$PTBK_THINKING_LEVEL")"
    PORT="$(prompt_with_default "Agents Server port" "$PORT")"
    configure_domains
    LETS_ENCRYPT_EMAIL="$(prompt_with_default "Let's Encrypt email (optional)" "$LETS_ENCRYPT_EMAIL")"
    prompt_api_keys_and_admin_password

    install_system_packages
    install_nodejs
    configure_install_directory
    install_global_process_manager
    install_promptbook_repository
    install_promptbook_cli_launcher
    install_runner_dependencies
    initialize_promptbook_project
    configure_runner_authentication
    configure_pm2_startup
    build_agents_server
    start_agents_server
    configure_nginx_reverse_proxy
    configure_firewall
    configure_ssl_certificates
    print_summary
}

main "$@"
