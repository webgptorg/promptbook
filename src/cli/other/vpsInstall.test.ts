import { readFileSync } from 'fs';
import { join } from 'path';

describe('other/vps/install.sh', () => {
    const installScript = readFileSync(join(__dirname, '../../../other/vps/install.sh'), 'utf-8');

    it('installs Promptbook from the GitHub repository instead of the npm package registry', () => {
        expect(installScript).toContain(
            'PROMPTBOOK_REPOSITORY_URL="${PROMPTBOOK_REPOSITORY_URL:-https://github.com/webgptorg/promptbook.git}"',
        );
        expect(installScript).toContain(
            'git clone --depth 1 --branch "$PROMPTBOOK_REPOSITORY_REF" "$PROMPTBOOK_REPOSITORY_URL" "$PROMPTBOOK_REPOSITORY_DIR"',
        );
        expect(installScript).toContain('npm ci --include=dev');
        expect(installScript).not.toContain('PROMPTBOOK_NPM_PACKAGE');
        expect(installScript).not.toContain('npm install -g "$PROMPTBOOK_NPM_PACKAGE"');
    });

    it('starts pm2 through the repository-backed local ptbk launcher', () => {
        expect(installScript).toContain('PTBK_COMMAND_PATH="${PTBK_COMMAND_PATH:-$PTBK_BIN_DIR/ptbk}"');
        expect(installScript).toContain('node_modules/.bin/ts-node');
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

    it('requires a Node.js patch level compatible with Embedded Prisma Studio', () => {
        expect(installScript).toContain('resolve_node_minimum_version()');
        expect(installScript).toContain("printf '22.12.0'");
        expect(installScript).toContain("printf '20.19.0'");
        expect(installScript).toContain('NODE_MINIMUM_VERSION="$minimum_version" node -e');
    });

    it('keeps raw-IP bootstrap access when domain SSL issuance fails during apply-domains', () => {
        expect(installScript).toContain('if ! "${SUDO[@]}" certbot "${certbot_arguments[@]}"; then');
        expect(installScript).toContain('Keeping the current public URL unchanged so raw-IP bootstrap access remains available.');
        expect(installScript).toContain('set_env_value NEXT_PUBLIC_SITE_URL "https://${first_domain}"');
    });
});
