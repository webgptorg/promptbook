#!/usr/bin/env bash

set -Eeuo pipefail

APP_NAME="${PTBK_PM2_APP_NAME:-promptbook-agents-server}"
INSTALL_DIR="${PTBK_INSTALL_DIR:-/opt/promptbook-agents-server}"
NODE_MAJOR_VERSION="${NODE_MAJOR_VERSION:-22}"
PORT="${PORT:-${PTBK_PORT:-4440}}"
PROMPTBOOK_NPM_PACKAGE="${PROMPTBOOK_NPM_PACKAGE:-ptbk@latest}"
PTBK_AGENT="${PTBK_AGENT:-github-copilot}"
PTBK_MODEL="${PTBK_MODEL:-gpt-5.4}"
PTBK_THINKING_LEVEL="${PTBK_THINKING_LEVEL:-xhigh}"
PTBK_NON_INTERACTIVE="${PTBK_NON_INTERACTIVE:-0}"

SUDO=()
RUN_USER=""
RUN_GROUP=""
RUN_HOME=""
ENV_FILE=""
GENERATED_ADMIN_PASSWORD=""

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

shell_quote() {
    printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"
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
        openssl
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

install_global_npm_packages() {
    log "Installing Promptbook CLI and pm2."
    "${SUDO[@]}" npm install -g "$PROMPTBOOK_NPM_PACKAGE" pm2

    if ! command -v ptbk >/dev/null 2>&1; then
        fail "The ptbk command was not installed. Check npm global installation output above."
    fi
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
    ip_address="$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || true)"

    if [[ -z "$ip_address" ]]; then
        ip_address="$(hostname -I 2>/dev/null | awk '{ print $1 }' || true)"
    fi

    if [[ -z "$ip_address" ]]; then
        ip_address="localhost"
    fi

    printf 'http://%s:%s' "$ip_address" "$PORT"
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

has_non_empty_env_value() {
    local key="$1"
    [[ -f "$ENV_FILE" ]] && grep -Eq "^${key}=.+" "$ENV_FILE"
}

configure_environment() {
    local sqlite_path="$INSTALL_DIR/.promptbook/agents-server.sqlite"
    local default_public_url=""
    local public_site_url=""

    default_public_url="${PTBK_PUBLIC_SITE_URL:-${NEXT_PUBLIC_SITE_URL:-$(resolve_default_public_url)}}"
    public_site_url="$(prompt_with_default "Public Agents Server URL" "$default_public_url")"

    set_env_value PTBK_AGENTS_SERVER_DATABASE sqlite
    set_env_value PTBK_AGENTS_SERVER_SQLITE_PATH "$sqlite_path"
    set_env_value NEXT_PUBLIC_SITE_URL "$public_site_url"
    set_env_value SUPABASE_AUTO_MIGRATE false
    set_env_value PTBK_AGENT "$PTBK_AGENT"
    set_env_value PTBK_MODEL "$PTBK_MODEL"
    set_env_value PTBK_THINKING_LEVEL "$PTBK_THINKING_LEVEL"
    set_env_value PORT "$PORT"

    if ! has_non_empty_env_value ADMIN_PASSWORD; then
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
    run_as_service_user bash -lc "cd $(shell_quote "$INSTALL_DIR") && ptbk agents-server init >/dev/null"
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
        log "Opening TCP port $PORT in ufw."
        "${SUDO[@]}" ufw allow "${PORT}/tcp"
    fi
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
    run_as_service_user bash -lc "cd $(shell_quote "$INSTALL_DIR") && ptbk agents-server build"
}

start_agents_server() {
    local install_dir_shell=""
    local app_name_shell=""
    local agent_shell=""
    local model_shell=""
    local thinking_shell=""
    local port_shell=""

    install_dir_shell="$(shell_quote "$INSTALL_DIR")"
    app_name_shell="$(shell_quote "$APP_NAME")"
    agent_shell="$(shell_quote "$PTBK_AGENT")"
    model_shell="$(shell_quote "$PTBK_MODEL")"
    thinking_shell="$(shell_quote "$PTBK_THINKING_LEVEL")"
    port_shell="$(shell_quote "$PORT")"

    log "Starting Agents Server with pm2."
    run_as_service_user bash -lc "
        set -e
        cd $install_dir_shell
        PTBK_PATH=\$(command -v ptbk)
        if pm2 describe $app_name_shell >/dev/null 2>&1; then
            pm2 delete $app_name_shell >/dev/null
        fi
        pm2 start \"\$PTBK_PATH\" --name $app_name_shell --time --cwd $install_dir_shell -- agents-server start --agent $agent_shell --model $model_shell --thinking-level $thinking_shell --port $port_shell --no-ui
        pm2 save
    "
}

print_summary() {
    local public_site_url=""
    public_site_url="$(grep -E '^NEXT_PUBLIC_SITE_URL=' "$ENV_FILE" | tail -n 1 | cut -d= -f2-)"

    log "Agents Server is configured."
    log "URL: $public_site_url"
    log "Project directory: $INSTALL_DIR"
    log "Database: $INSTALL_DIR/.promptbook/agents-server.sqlite"
    log "pm2 process: $APP_NAME"

    if [[ -n "$GENERATED_ADMIN_PASSWORD" ]]; then
        log "Generated ADMIN_PASSWORD: $GENERATED_ADMIN_PASSWORD"
    fi

    log "Useful commands:"
    log "  sudo -u $RUN_USER pm2 status"
    log "  sudo -u $RUN_USER pm2 logs $APP_NAME"
    log "  sudo -u $RUN_USER pm2 restart $APP_NAME --update-env"
}

main() {
    initialize_sudo
    resolve_run_user
    check_platform

    PTBK_AGENT="$(prompt_with_default "Coding runner" "$PTBK_AGENT")"
    PTBK_MODEL="$(prompt_with_default "Runner model" "$PTBK_MODEL")"
    PTBK_THINKING_LEVEL="$(prompt_with_default "Runner thinking level" "$PTBK_THINKING_LEVEL")"
    PORT="$(prompt_with_default "Agents Server port" "$PORT")"

    install_system_packages
    install_nodejs
    install_global_npm_packages
    install_runner_dependencies
    configure_install_directory
    initialize_promptbook_project
    configure_runner_authentication
    configure_firewall
    configure_pm2_startup
    build_agents_server
    start_agents_server
    print_summary
}

main "$@"
