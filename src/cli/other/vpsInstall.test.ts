import { readFileSync } from 'fs';
import { join } from 'path';

describe('other/vps/install.sh', () => {
    const installScript = readFileSync(join(__dirname, '../../../other/vps/install.sh'), 'utf-8');

    it('installs Promptbook from the GitHub repository instead of the npm package registry', () => {
        expect(installScript).toContain(
            'PROMPTBOOK_REPOSITORY_URL="${PROMPTBOOK_REPOSITORY_URL:-https://github.com/webgptorg/promptbook.git}"',
        );
        expect(installScript).toContain('PROMPTBOOK_REPOSITORY_REF="${PROMPTBOOK_REPOSITORY_REF:-main}"');
        expect(installScript).toContain('PTBK_RELEASES_DIR="${PTBK_RELEASES_DIR:-$PTBK_BIN_DIR}"');
        expect(installScript).toContain(
            'git clone --depth 1 --branch "$PROMPTBOOK_REPOSITORY_REF" "$PROMPTBOOK_REPOSITORY_URL" "$staging_repository_dir"',
        );
        expect(installScript).toContain('resolve_repository_directory_for_commit "$target_commit_sha"');
        expect(installScript).toContain('npm ci --include=dev');
        expect(installScript).not.toContain('PROMPTBOOK_NPM_PACKAGE');
        expect(installScript).not.toContain('npm install -g "$PROMPTBOOK_NPM_PACKAGE"');
    });

    it('starts pm2 through the repository-backed local ptbk launcher', () => {
        expect(installScript).toContain('PTBK_COMMAND_PATH="${PTBK_COMMAND_PATH:-$PTBK_BIN_DIR/ptbk}"');
        expect(installScript).toContain('node_modules/.bin/ts-node');
        expect(installScript).toContain('verify_promptbook_cli_supports_agents_server');
        expect(installScript).toContain(
            "does not provide 'ptbk agents-server init'. Choose main or another branch that includes standalone Agents Server support.",
        );
        expect(installScript).toContain('PTBK_PATH=$ptbk_command_shell');
        expect(installScript).toContain('pm2 start \\"\\$PTBK_PATH\\"');
        expect(installScript).toContain('--interpreter bash');
        expect(installScript).not.toContain('PTBK_PATH=\\$(command -v ptbk)');
    });

    it('prompts for optional API keys, optional Sentry DSN, and admin password before installing packages', () => {
        const mainFunction = installScript.slice(installScript.indexOf('\nmain() {'));

        expect(installScript).toContain('prompt_secret_with_default "OpenAI API key (optional)"');
        expect(installScript).toContain('prompt_secret_with_default "Sentry DSN (optional)"');
        expect(installScript).toContain('prompt_secret_with_default "Admin password"');
        expect(installScript).toContain('set_env_value OPENAI_API_KEY "$REQUESTED_OPENAI_API_KEY"');
        expect(installScript).toContain(
            'set_env_value PTBK_OPENAI_CODEX_USE_API_KEY "$(resolve_openai_codex_api_key_usage)"',
        );
        expect(installScript).toContain('set_env_value SENTRY_DSN "$REQUESTED_SENTRY_DSN"');
        expect(installScript).toContain('set_env_value ADMIN_PASSWORD "$REQUESTED_ADMIN_PASSWORD"');
        expect(installScript).toContain('ensure_secret_env_value SESSION_SECRET 32');
        expect(installScript).toContain('ensure_secret_env_value PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN 32');
        expect(installScript).toContain('ensure_secret_env_value PROMPTBOOK_TEAM_AGENT_ACCESS_TOKEN 32');
        expect(installScript).toContain(
            'default_sentry_dsn="$(resolve_secret_default SENTRY_DSN NEXT_PUBLIC_SENTRY_DSN)"',
        );
        expect(installScript).toContain(
            'openai_api_key_default_description="$(resolve_secret_default_description "$default_openai_api_key" "empty")"',
        );
        expect(installScript).toContain(
            'sentry_dsn_default_description="$(resolve_secret_default_description "$default_sentry_dsn" "empty")"',
        );
        expect(installScript).toContain(
            'admin_password_default_description="$(resolve_secret_default_description "$default_admin_password" "auto-generate")"',
        );
        expect(mainFunction.indexOf('prompt_api_keys_and_admin_password')).toBeLessThan(
            mainFunction.indexOf('install_agents_server_host_dependencies'),
        );
    });

    it('collects remaining installation choices before package installation starts', () => {
        const mainFunction = installScript.slice(installScript.indexOf('\nmain() {'));
        const configureEnvironmentFunction = installScript.slice(
            installScript.indexOf('\nconfigure_environment() {'),
            installScript.indexOf('\ninitialize_promptbook_project() {'),
        );

        expect(installScript).toContain('REQUESTED_PUBLIC_SITE_URL');
        expect(installScript).toContain('prompt_with_default "Public Agents Server URL"');
        expect(installScript).toContain(
            'prompt_yes_no "Open the $PTBK_HARNESS CLI for authentication when dependencies are ready?"',
        );
        expect(configureEnvironmentFunction).toContain('local public_site_url="$REQUESTED_PUBLIC_SITE_URL"');
        expect(configureEnvironmentFunction).not.toContain('prompt_with_default "Public Agents Server URL"');
        expect(mainFunction.indexOf('prompt_public_site_url')).toBeLessThan(
            mainFunction.indexOf('install_agents_server_host_dependencies'),
        );
        expect(mainFunction.indexOf('prompt_runner_authentication_preference')).toBeLessThan(
            mainFunction.indexOf('install_agents_server_host_dependencies'),
        );
        expect(mainFunction.indexOf('configure_required_resources')).toBeGreaterThan(
            mainFunction.indexOf('prompt_runner_authentication_preference'),
        );
        expect(mainFunction.indexOf('configure_required_resources')).toBeLessThan(
            mainFunction.indexOf('install_agents_server_host_dependencies'),
        );
    });

    it('requires explicit confirmation that the VPS is fresh before the main installation continues', () => {
        const mainFunction = installScript.slice(installScript.indexOf('\nmain() {'));

        expect(installScript).toContain('PTBK_CONFIRM_FRESH_VPS="${PTBK_CONFIRM_FRESH_VPS:-0}"');
        expect(installScript).toContain('is_truthy_value()');
        expect(installScript).toContain('is_fresh_vps_installation_confirmation_enabled()');
        expect(installScript).toContain('Fresh VPS installation was explicitly confirmed.');
        expect(installScript).toContain(
            'Standalone VPS installation requires explicit confirmation in non-interactive mode.',
        );
        expect(installScript).toContain('--yes-i-understand-that-script-should-be-run-on-fresh-server');
        expect(installScript).toContain(
            'prompt_yes_no "Continue installation only if this is a fresh VPS without existing data or configuration to preserve?" "no"',
        );
        expect(mainFunction.indexOf('confirm_fresh_vps_installation')).toBeLessThan(
            mainFunction.indexOf('check_required_resources'),
        );
    });

    it('runs the self-update flow when install.sh is executed on an installed VPS', () => {
        const mainFunction = installScript.slice(installScript.indexOf('\nmain() {'));

        expect(installScript).toContain('is_existing_vps_installation()');
        expect(installScript).toContain('[[ -r "$INSTALL_DIR/.env" ]]');
        expect(mainFunction).toContain('if is_existing_vps_installation; then');
        expect(mainFunction).toContain('self_update_agents_server "$@"');
        expect(mainFunction.indexOf('if is_existing_vps_installation; then')).toBeLessThan(
            mainFunction.indexOf('confirm_fresh_vps_installation'),
        );
    });

    it('accepts command-line values for non-interactive VPS installation', () => {
        expect(installScript).toContain('--domain | --domains)');
        expect(installScript).toContain('SERVERS="$2"');
        expect(installScript).toContain('--domain=* | --domains=*)');
        expect(installScript).toContain('SERVERS="${1#*=}"');
        expect(installScript).toContain('--openai-api-key)');
        expect(installScript).toContain('OPENAI_API_KEY="$2"');
        expect(installScript).toContain('--openai-api-key=*)');
        expect(installScript).toContain('OPENAI_API_KEY="${1#*=}"');
        expect(installScript).toContain('--sentry-dsn)');
        expect(installScript).toContain('SENTRY_DSN="$2"');
        expect(installScript).toContain('--admin-password)');
        expect(installScript).toContain('ADMIN_PASSWORD="$2"');
    });

    it('defaults standalone VPS harness to OpenAI Codex while keeping GitHub Copilot available', () => {
        const runnerDependenciesFunction = installScript.slice(
            installScript.indexOf('\ninstall_runner_dependencies() {'),
            installScript.indexOf('\nresolve_runner_authentication_command() {'),
        );

        expect(installScript).toContain('PTBK_HARNESS="${PTBK_HARNESS:-${PTBK_AGENT:-openai-codex}}"');
        expect(installScript).toContain('PTBK_HARNESS="$(prompt_with_default "Harness" "$PTBK_HARNESS")"');
        expect(runnerDependenciesFunction).toContain('github-copilot)');
        expect(runnerDependenciesFunction).toContain('openai-codex)');
    });

    it('prefers ChatGPT Codex login before falling back to the configured OpenAI API key', () => {
        const runnerAuthenticationPreferenceFunction = installScript.slice(
            installScript.indexOf('\nprompt_runner_authentication_preference() {'),
            installScript.indexOf('\nrun_runner_authentication_command() {'),
        );
        const runnerAuthenticationFunction = installScript.slice(
            installScript.indexOf('\nconfigure_runner_authentication() {'),
            installScript.indexOf('\nconfigure_harness_for_initial_installation() {'),
        );
        const harnessInitialInstallationFunction = installScript.slice(
            installScript.indexOf('\nconfigure_harness_for_initial_installation() {'),
            installScript.indexOf('\nauthenticate_harness() {'),
        );

        expect(installScript).toContain('PTBK_OPENAI_CODEX_USE_API_KEY="${PTBK_OPENAI_CODEX_USE_API_KEY:-0}"');
        expect(installScript).toContain('resolve_openai_codex_api_key_usage()');
        expect(installScript).toContain('run_openai_codex_login_status_without_api_environment()');
        expect(installScript).toContain('unset OPENAI_API_KEY OPENAI_BASE_URL CODEX_API_KEY; codex login status 2>&1');
        expect(installScript).toContain('is_openai_codex_chatgpt_runner_authenticated()');
        expect(installScript).toContain('is_openai_codex_api_key_runner_configured()');
        expect(runnerAuthenticationPreferenceFunction).toContain(
            'if is_openai_codex_chatgpt_runner_authenticated; then',
        );
        expect(runnerAuthenticationPreferenceFunction).toContain('if is_openai_codex_api_key_runner_configured; then');
        expect(runnerAuthenticationPreferenceFunction).toContain('IS_RUNNER_AUTHENTICATION_REQUESTED=0');
        expect(runnerAuthenticationFunction).toContain('if is_openai_codex_chatgpt_runner_authenticated; then');
        expect(runnerAuthenticationFunction).toContain('set_env_value PTBK_OPENAI_CODEX_USE_API_KEY 0');
        expect(runnerAuthenticationFunction).toContain(
            'OpenAI Codex is logged in with ChatGPT; the harness will use the ChatGPT account instead of OPENAI_API_KEY.',
        );
        expect(runnerAuthenticationFunction).toContain('set_env_value PTBK_OPENAI_CODEX_USE_API_KEY 1');
        expect(runnerAuthenticationFunction).toContain(
            'OpenAI API key detected and no ChatGPT Codex login is active; the OpenAI Codex harness will use OPENAI_API_KEY without interactive CLI authentication.',
        );
        expect(
            runnerAuthenticationPreferenceFunction.indexOf('if is_openai_codex_chatgpt_runner_authenticated; then'),
        ).toBeLessThan(
            runnerAuthenticationPreferenceFunction.indexOf('if is_openai_codex_api_key_runner_configured; then'),
        );
        expect(
            runnerAuthenticationFunction.indexOf('if is_openai_codex_chatgpt_runner_authenticated; then'),
        ).toBeLessThan(runnerAuthenticationFunction.indexOf('if is_openai_codex_api_key_runner_configured; then'));
        expect(runnerAuthenticationFunction.indexOf('if is_openai_codex_api_key_runner_configured; then')).toBeLessThan(
            runnerAuthenticationFunction.indexOf('if ! is_interactive; then'),
        );
        expect(harnessInitialInstallationFunction).toContain('if is_openai_codex_chatgpt_runner_authenticated; then');
        expect(harnessInitialInstallationFunction).toContain('if is_openai_codex_api_key_runner_configured; then');
        expect(harnessInitialInstallationFunction).toContain('install_runner_dependencies');
        expect(harnessInitialInstallationFunction).toContain('configure_runner_authentication');
        expect(
            harnessInitialInstallationFunction.indexOf('if is_openai_codex_chatgpt_runner_authenticated; then'),
        ).toBeLessThan(
            harnessInitialInstallationFunction.indexOf('if is_openai_codex_api_key_runner_configured; then'),
        );
        expect(harnessInitialInstallationFunction.indexOf('install_runner_dependencies')).toBeLessThan(
            harnessInitialInstallationFunction.indexOf(
                'Skipping harness CLI installation and authentication in non-interactive mode.',
            ),
        );
    });

    it('asks for bundled default agents and seeds them after project initialization', () => {
        const mainFunction = installScript.slice(installScript.indexOf('\nmain() {'));
        const installDefaultAgentsFunction = installScript.slice(
            installScript.indexOf('\ninstall_default_agents() {'),
            installScript.indexOf('\nconfigure_runner_authentication() {'),
        );

        expect(installScript).toContain('PTBK_INSTALL_DEFAULT_AGENTS="${PTBK_INSTALL_DEFAULT_AGENTS:-yes}"');
        expect(installScript).toContain('prompt_yes_no "Install bundled default agents?"');
        expect(installScript).toContain(
            'set_env_value PTBK_INSTALL_DEFAULT_AGENTS "$REQUESTED_INSTALL_DEFAULT_AGENTS"',
        );
        expect(installDefaultAgentsFunction).toContain('if [[ "$REQUESTED_INSTALL_DEFAULT_AGENTS" != "yes" ]]');
        expect(installDefaultAgentsFunction).toContain(
            'cd $agents_server_dir_shell && PTBK_AGENTS_SERVER_ENV_FILE=$env_file_shell PTBK_DEFAULT_AGENTS_DIR=$default_agents_dir_shell npx --yes tsx ./src/database/seedDefaultAgents.ts',
        );
        expect(installDefaultAgentsFunction).toContain('$PROMPTBOOK_REPOSITORY_DIR/agents/default');
        expect(mainFunction.indexOf('prompt_default_agents_installation')).toBeLessThan(
            mainFunction.indexOf('install_agents_server_host_dependencies'),
        );
        expect(mainFunction.indexOf('install_default_agents')).toBeGreaterThan(
            mainFunction.indexOf('initialize_promptbook_project'),
        );
        expect(mainFunction.indexOf('install_default_agents')).toBeLessThan(
            mainFunction.indexOf('build_agents_server'),
        );
    });

    it('requires a Node.js patch level compatible with Embedded Prisma Studio', () => {
        expect(installScript).toContain('resolve_node_minimum_version()');
        expect(installScript).toContain("printf '22.12.0'");
        expect(installScript).toContain("printf '20.19.0'");
        expect(installScript).toContain('NODE_MINIMUM_VERSION="$minimum_version" node -e');
    });

    it('keeps raw-IP bootstrap access when domain SSL issuance fails during apply-domains', () => {
        // Every domain gets an isolated certificate lineage; one failing domain only warns…
        expect(installScript).toContain('if ! request_ssl_certificate_for_domain "$domain"; then');
        expect(installScript).toContain(
            'All other domains stay untouched and $domain stays reachable over plain HTTP.',
        );
        // …and the public URL only switches to HTTPS once the certificate really exists,
        // so a failed issuance keeps the raw-IP bootstrap URL unchanged.
        expect(installScript).toContain(
            'if [[ -n "$first_domain" ]] && domain_has_ssl_certificate "$first_domain"; then',
        );
        expect(installScript).toContain('set_env_value NEXT_PUBLIC_SITE_URL "https://${first_domain}"');
    });

    it('waits for apt and dpkg locks before package installation commands', () => {
        const browserDependenciesFunction = installScript.slice(
            installScript.indexOf('\ninstall_agents_server_browser_dependencies() {'),
            installScript.indexOf('\ninstall_promptbook_cli_launcher() {'),
        );

        expect(installScript).toContain('APT_LOCK_PATHS=(');
        expect(installScript).toContain('/var/lib/dpkg/lock-frontend');
        expect(installScript).toContain('wait_for_apt_locks()');
        expect(installScript).toContain('Another package manager is using apt/dpkg');
        expect(installScript).toContain('run_apt_get()');
        expect(installScript).toContain('apt-get -o "DPkg::Lock::Timeout=${APT_LOCK_TIMEOUT_SECONDS}" "$@"');
        expect(installScript).toContain('run_apt_get update');
        expect(installScript).toContain('run_apt_get install -y');
        expect(browserDependenciesFunction.indexOf('wait_for_apt_locks')).toBeLessThan(
            browserDependenciesFunction.indexOf('npx playwright install-deps chromium'),
        );
        expect(installScript).not.toContain('env DEBIAN_FRONTEND=noninteractive apt-get update');
        expect(installScript).not.toContain('env DEBIAN_FRONTEND=noninteractive apt-get install');
    });

    it('installs code-server through shared Agents Server dependency functions', () => {
        const mainFunction = installScript.slice(installScript.indexOf('\nmain() {'));
        const selfUpdateFunction = installScript.slice(
            installScript.indexOf('\nself_update_agents_server() {'),
            installScript.indexOf('\nprint_summary() {'),
        );
        const hostDependenciesFunction = installScript.slice(
            installScript.indexOf('\ninstall_agents_server_host_dependencies() {'),
            installScript.indexOf('\nis_path_inside_directory() {'),
        );
        const repositoryDependenciesFunction = installScript.slice(
            installScript.indexOf('\ninstall_agents_server_repository_dependencies() {'),
            installScript.indexOf('\ninstall_promptbook_cli_launcher() {'),
        );

        expect(installScript).toContain(
            'CODE_SERVER_INSTALL_SCRIPT_URL="${CODE_SERVER_INSTALL_SCRIPT_URL:-https://code-server.dev/install.sh}"',
        );
        expect(installScript).toContain('CODE_SERVER_INSTALL_PREFIX="${CODE_SERVER_INSTALL_PREFIX:-/usr/local}"');
        expect(installScript).toContain('install_code_server()');
        expect(installScript).toContain('curl -fsSL "$CODE_SERVER_INSTALL_SCRIPT_URL" |');
        expect(installScript).toContain('--method=standalone --prefix="$CODE_SERVER_INSTALL_PREFIX"');
        expect(installScript).not.toMatch(/^.*\bnpm\s+(?:install|i)\b.*\bcode-server\b.*$/m);
        expect(installScript).toContain('install_agents_server_dependency_requirements()');
        expect(installScript).toContain('apply_dependency_configuration()');
        expect(installScript).toContain('bash "$release_install_script_path" apply-dependencies');
        expect(installScript).toContain('if [[ "${1:-}" == "apply-dependencies" ]]; then');
        expect(hostDependenciesFunction).toContain('install_system_packages');
        expect(hostDependenciesFunction).toContain('install_nodejs');
        expect(hostDependenciesFunction).toContain('install_global_process_manager');
        expect(hostDependenciesFunction).toContain('install_code_server');
        expect(repositoryDependenciesFunction).toContain('install_agents_server_browser_dependencies');
        expect(repositoryDependenciesFunction).toContain('install_agents_server_host_dependencies');
        expect(repositoryDependenciesFunction).toContain('install_agents_server_repository_dependencies');
        expect(mainFunction.indexOf('install_agents_server_host_dependencies')).toBeLessThan(
            mainFunction.indexOf('install_promptbook_repository'),
        );
        expect(mainFunction.indexOf('install_agents_server_repository_dependencies')).toBeGreaterThan(
            mainFunction.indexOf('install_promptbook_repository'),
        );
        expect(selfUpdateFunction.indexOf('install_agents_server_dependency_requirements')).toBeGreaterThan(
            selfUpdateFunction.indexOf('install_promptbook_repository'),
        );
        expect(selfUpdateFunction.indexOf('install_agents_server_dependency_requirements')).toBeLessThan(
            selfUpdateFunction.indexOf('install_promptbook_cli_launcher'),
        );
        // A failing dependency installation (for example the code-server download) must warn
        // and continue instead of aborting the whole self-update; the next update retries it.
        expect(selfUpdateFunction).toContain('if ! (install_agents_server_dependency_requirements); then');
        expect(selfUpdateFunction).toContain(
            'Installing Agents Server runtime dependencies failed; continuing the self-update without them.',
        );
    });

    it('proxies browser VS Code sessions through nginx auth_request', () => {
        const nginxVscodeLocationFunction = installScript.slice(
            installScript.indexOf('\nbuild_nginx_agent_project_vscode_location_block() {'),
            installScript.indexOf('\nconfigure_nginx_branding() {'),
        );
        const nginxConfigurationFunction = installScript.slice(
            installScript.indexOf('\nconfigure_nginx_reverse_proxy() {'),
            installScript.indexOf('\nreload_or_restart_nginx() {'),
        );

        expect(nginxVscodeLocationFunction).toContain('location ~ "^/__agent-project-vscode/([^/]+)(/.*)?$"');
        expect(nginxVscodeLocationFunction).toContain(
            'auth_request /api/agent-project-vscode-auth/\\$promptbook_code_server_session_id;',
        );
        expect(nginxVscodeLocationFunction).toContain(
            'auth_request_set \\$promptbook_code_server_port \\$upstream_http_x_promptbook_code_server_port;',
        );
        expect(nginxVscodeLocationFunction).toContain('proxy_pass http://127.0.0.1:\\$promptbook_code_server_port;');
        expect(nginxVscodeLocationFunction).toContain('proxy_set_header Upgrade \\$http_upgrade;');
        expect(nginxVscodeLocationFunction).toContain('proxy_set_header Cookie "";');
        const agentsServerLocationBlocksFunction = installScript.slice(
            installScript.indexOf('\nbuild_nginx_agents_server_location_blocks() {'),
            installScript.indexOf('\nbuild_nginx_agent_project_location_blocks() {'),
        );

        expect(agentsServerLocationBlocksFunction).toContain('build_nginx_agent_project_vscode_location_block');
        expect(nginxConfigurationFunction).toContain(
            'agents_server_location_blocks="$(build_nginx_agents_server_location_blocks)"',
        );
    });

    it('defaults standalone VPS file storage to self-contained VersityGW S3', () => {
        const mainFunction = installScript.slice(installScript.indexOf('\nmain() {'));

        expect(installScript).toContain('PTBK_FILE_STORAGE_MODE="${PTBK_FILE_STORAGE_MODE:-self-contained-s3}"');
        expect(installScript).toContain(
            'PTBK_SELF_CONTAINED_S3_DIRECTORY="${PTBK_SELF_CONTAINED_S3_DIRECTORY:-$PTBK_DATA_DIR/s3}"',
        );
        expect(installScript).toContain('local sqlite_path="$PTBK_DATABASE_DIR/agents-server.sqlite"');
        expect(installScript).toContain('prompt_yes_no "Use self-contained S3 file storage with VersityGW?"');
        expect(installScript).toContain('configure_self_contained_s3_storage()');
        expect(installScript).toContain('https://api.github.com/repos/versity/versitygw/releases/latest');
        expect(installScript).toContain('ExecStart=/usr/local/bin/versitygw');
        expect(installScript).toContain('set_env_value CDN_ENDPOINT "$REQUESTED_CDN_ENDPOINT"');
        expect(installScript).toContain('set_env_value NEXT_PUBLIC_CDN_PUBLIC_URL "$REQUESTED_CDN_PUBLIC_URL"');
        expect(installScript).toContain('location /s3/');
        expect(mainFunction.indexOf('prompt_file_storage')).toBeLessThan(
            mainFunction.indexOf('install_agents_server_host_dependencies'),
        );
        expect(mainFunction.indexOf('configure_self_contained_s3_storage')).toBeGreaterThan(
            mainFunction.indexOf('initialize_promptbook_project'),
        );
    });

    it('runs standalone self-update from a stable script copy', () => {
        expect(installScript).toContain('rerun_self_update_from_stable_script "$@"');
        expect(installScript).toContain('PTBK_SELF_UPDATE_SCRIPT_COPY=1 exec bash "$runtime_script" self-update "$@"');
        expect(installScript).toContain('PTBK_SELF_UPDATE_JOB_ID="${PTBK_SELF_UPDATE_JOB_ID:-}"');
        expect(installScript).toContain('JOB_ID=$PTBK_SELF_UPDATE_JOB_ID');
        expect(installScript).toContain('trap write_failed_self_update_status_on_exit EXIT');
        expect(installScript).toContain('start_pm2_agents_server_process "$replacement_app_name" "$replacement_port"');
        expect(installScript).toContain('wait_for_agents_server_health "$replacement_app_name" "$replacement_port"');
        expect(installScript).toContain('switch_nginx_to_agents_server_port "$replacement_port"');
        expect(installScript).toContain('stop_pm2_process_if_running "$old_app_name"');
        expect(installScript).not.toContain("trap '\n        local exit_code=$?");
    });

    it('keeps the installer entrypoint safe when the script is executed from stdin', () => {
        expect(installScript).toContain('INSTALL_SCRIPT_SOURCE_PATH="${BASH_SOURCE[0]:-}"');
        expect(installScript).toContain('is_install_script_sourced()');
        expect(installScript).toContain('resolve_running_install_script_path()');
        expect(installScript).toContain('if is_install_script_sourced; then');
        expect(installScript).not.toContain('source_script="${BASH_SOURCE[0]}"');
        expect(installScript).not.toContain('if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then');
    });

    it('garbage-collects old Agents Server versions during self-update', () => {
        const selfUpdateFunction = installScript.slice(
            installScript.indexOf('\nself_update_agents_server() {'),
            installScript.indexOf('\nprint_summary() {'),
        );

        // [🧹] Keep in sync with DEFAULT_AGENTS_SERVER_GC_KEEP_VERSIONS_COUNT in
        //      apps/agents-server/src/utils/vpsSelfUpdate/vpsSelfUpdateInstalledVersions.ts
        expect(installScript).toContain('AGENTS_SERVER_GC_KEEP_VERSIONS="${AGENTS_SERVER_GC_KEEP_VERSIONS:-3}"');
        expect(installScript).toContain('garbage_collect_promptbook_releases()');
        expect(installScript).toContain('get_env_value AGENTS_SERVER_GC_KEEP_VERSIONS');

        // Garbage collection frees disk space before the new checkout is cloned…
        expect(selfUpdateFunction.indexOf('garbage_collect_promptbook_releases')).toBeLessThan(
            selfUpdateFunction.indexOf('install_promptbook_repository'),
        );
        // …and runs again after the nginx switch instead of unconditionally deleting the previous
        // release, so the newest AGENTS_SERVER_GC_KEEP_VERSIONS versions stay available for rollback.
        expect(selfUpdateFunction.lastIndexOf('garbage_collect_promptbook_releases')).toBeGreaterThan(
            selfUpdateFunction.indexOf('switch_nginx_to_agents_server_port "$replacement_port"'),
        );
        expect(selfUpdateFunction).not.toContain(
            'remove_promptbook_repository_directory_if_safe "$old_repository_dir" "$PROMPTBOOK_REPOSITORY_DIR"',
        );

        // The current release is never garbage-collected.
        expect(installScript).toContain('current_repository_dir="$(realpath -m "$PROMPTBOOK_REPOSITORY_DIR")"');
        expect(installScript).toContain(
            'find "$PTBK_RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -name \'.install-*\'',
        );
    });

    it('preserves Next static assets across standalone self-updates', () => {
        const selfUpdateFunction = installScript.slice(
            installScript.indexOf('\nself_update_agents_server() {'),
            installScript.indexOf('\nprint_summary() {'),
        );

        expect(installScript).toContain(
            'PTBK_SHARED_NEXT_STATIC_ROOT="${PTBK_SHARED_NEXT_STATIC_ROOT:-$INSTALL_DIR/.promptbook/next-static}"',
        );
        expect(installScript).toContain('set_env_value PTBK_SHARED_NEXT_STATIC_ROOT "$PTBK_SHARED_NEXT_STATIC_ROOT"');
        expect(installScript).toContain(
            'publish_agents_server_next_static_assets_from_repository "$PROMPTBOOK_REPOSITORY_DIR" 1',
        );
        expect(installScript).toContain(
            'publish_agents_server_next_static_assets_from_repository "$old_repository_dir" 0',
        );
        expect(installScript).toContain('location ^~ /_next/static/');
        expect(installScript).toContain('root ${PTBK_SHARED_NEXT_STATIC_ROOT};');
        expect(installScript).toContain('try_files \\$uri @promptbook_agents_server_next_static;');
        expect(installScript).toContain('cp -a $target_static_dir_shell/. $source_static_dir_shell/');
        expect(
            selfUpdateFunction.indexOf(
                'publish_agents_server_next_static_assets_from_repository "$old_repository_dir" 0',
            ),
        ).toBeLessThan(selfUpdateFunction.indexOf('install_promptbook_repository'));
        expect(selfUpdateFunction.indexOf('build_agents_server')).toBeLessThan(
            selfUpdateFunction.indexOf('start_pm2_agents_server_process "$replacement_app_name" "$replacement_port"'),
        );
    });

    it('loads installed environment for self-update migrations and skips SQLite', () => {
        expect(installScript).toContain('database_mode="$(get_env_value PTBK_AGENTS_SERVER_DATABASE | tr');
        expect(installScript).toContain(
            'Skipping PostgreSQL database migrations because Agents Server is configured for local SQLite.',
        );
        expect(installScript).toContain('summary_file_shell="$(shell_quote "$PTBK_DATABASE_MIGRATION_SUMMARY_FILE")"');
        expect(installScript).toContain(
            'cd $agents_server_dir_shell && PTBK_AGENTS_SERVER_ENV_FILE=$env_file_shell PTBK_DATABASE_MIGRATION_SUMMARY_FILE=$summary_file_shell npx --yes tsx ./src/database/migrate.ts',
        );
    });

    it('installs a light Promptbook-branded Nginx fallback page', () => {
        expect(installScript).toContain('color-scheme: light;');
        expect(installScript).toContain('Promptbook is installed and Nginx is online.');
        expect(installScript).toContain('Promptbook chat preview');
        expect(installScript).toContain('Managed by the Promptbook Agents Server installer.');
        expect(installScript).not.toContain('@media (prefers-color-scheme: dark)');
    });

    it('refreshes previously installed Promptbook Nginx welcome pages', () => {
        expect(installScript).toContain("grep -Eiq 'welcome to nginx|nginx|Promptbook Agents Server'");
        expect(installScript).toContain('"$NGINX_FALLBACK_HTML_PATH" "$default_page_path"');
    });
});
