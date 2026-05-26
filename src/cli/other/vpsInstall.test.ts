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
});
