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

    it('prompts for optional API key and admin password before installing packages', () => {
        const mainFunction = installScript.slice(installScript.indexOf('\nmain() {'));

        expect(installScript).toContain('prompt_secret_with_default "OpenAI API key (optional)"');
        expect(installScript).toContain('prompt_secret_with_default "Admin password"');
        expect(installScript).toContain('set_env_value OPENAI_API_KEY "$REQUESTED_OPENAI_API_KEY"');
        expect(installScript).toContain('set_env_value ADMIN_PASSWORD "$REQUESTED_ADMIN_PASSWORD"');
        expect(installScript).toContain('openai_api_key_default_description="empty"');
        expect(installScript).toContain('admin_password_default_description="auto-generate"');
        expect(mainFunction.indexOf('prompt_api_keys_and_admin_password')).toBeLessThan(
            mainFunction.indexOf('install_system_packages'),
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
            'prompt_yes_no "Open the $PTBK_AGENT CLI for authentication when dependencies are ready?"',
        );
        expect(configureEnvironmentFunction).toContain('local public_site_url="$REQUESTED_PUBLIC_SITE_URL"');
        expect(configureEnvironmentFunction).not.toContain('prompt_with_default "Public Agents Server URL"');
        expect(mainFunction.indexOf('prompt_public_site_url')).toBeLessThan(
            mainFunction.indexOf('install_system_packages'),
        );
        expect(mainFunction.indexOf('prompt_runner_authentication_preference')).toBeLessThan(
            mainFunction.indexOf('install_system_packages'),
        );
        expect(mainFunction.indexOf('configure_required_resources')).toBeGreaterThan(
            mainFunction.indexOf('prompt_runner_authentication_preference'),
        );
        expect(mainFunction.indexOf('configure_required_resources')).toBeLessThan(
            mainFunction.indexOf('install_system_packages'),
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
            'PTBK_DEFAULT_AGENTS_DIR=$default_agents_dir_shell npx --yes tsx ./apps/agents-server/src/database/seedDefaultAgents.ts',
        );
        expect(installDefaultAgentsFunction).toContain('$PROMPTBOOK_REPOSITORY_DIR/agents/default');
        expect(mainFunction.indexOf('prompt_default_agents_installation')).toBeLessThan(
            mainFunction.indexOf('install_system_packages'),
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
        expect(installScript).toContain('if ! "${SUDO[@]}" certbot "${certbot_arguments[@]}"; then');
        expect(installScript).toContain(
            'Keeping the current public URL unchanged so raw-IP bootstrap access remains available.',
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
            mainFunction.indexOf('install_system_packages'),
        );
        expect(mainFunction.indexOf('configure_self_contained_s3_storage')).toBeGreaterThan(
            mainFunction.indexOf('initialize_promptbook_project'),
        );
    });

    it('runs standalone self-update from a stable script copy', () => {
        expect(installScript).toContain('rerun_self_update_from_stable_script "$@"');
        expect(installScript).toContain('PTBK_SELF_UPDATE_SCRIPT_COPY=1 exec bash "$runtime_script" self-update "$@"');
        expect(installScript).toContain('trap write_failed_self_update_status_on_exit EXIT');
        expect(installScript).toContain('start_pm2_agents_server_process "$replacement_app_name" "$replacement_port"');
        expect(installScript).toContain('wait_for_agents_server_health "$replacement_app_name" "$replacement_port"');
        expect(installScript).toContain('switch_nginx_to_agents_server_port "$replacement_port"');
        expect(installScript).toContain('stop_pm2_process_if_running "$old_app_name"');
        expect(installScript).toContain(
            'remove_promptbook_repository_directory_if_safe "$old_repository_dir" "$PROMPTBOOK_REPOSITORY_DIR"',
        );
        expect(installScript).not.toContain("trap '\n        local exit_code=$?");
    });

    it('loads installed environment for self-update migrations and skips SQLite', () => {
        expect(installScript).toContain('database_mode="$(get_env_value PTBK_AGENTS_SERVER_DATABASE | tr');
        expect(installScript).toContain(
            'Skipping PostgreSQL database migrations because Agents Server is configured for local SQLite.',
        );
        expect(installScript).toContain(
            'PTBK_AGENTS_SERVER_ENV_FILE=$env_file_shell npx --yes tsx ./apps/agents-server/src/database/migrate.ts',
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
