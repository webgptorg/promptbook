import { readFileSync } from 'fs';
import { join } from 'path';

describe('install.sh', () => {
    const installScript = readFileSync(join(__dirname, 'install.sh'), 'utf-8');

    it('installs ptbk globally instead of launching the CLI through an npx wrapper', () => {
        expect(installScript).toContain('npm install --global ptbk');
        expect(installScript).not.toContain('npx --yes @promptbook/cli "$@"');
    });

    it('removes legacy shims that still launch the development ts-node entrypoint', () => {
        expect(installScript).toContain("LEGACY_GLOBAL_PTBK_SHIM='/usr/bin/ptbk'");
        expect(installScript).toContain('src/cli/test/ptbk\\.ts');
    });
});
