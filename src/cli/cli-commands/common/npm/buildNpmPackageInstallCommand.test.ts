import { buildNpmPackageInstallCommand } from './buildNpmPackageInstallCommand';

describe('buildNpmPackageInstallCommand', () => {
    it('updates an existing production dependency', () => {
        expect(buildNpmPackageInstallCommand('ptbk', 'local-dependency')).toBe('npm install --save ptbk@latest');
    });

    it('updates an existing development dependency', () => {
        expect(buildNpmPackageInstallCommand('ptbk', 'local-development-dependency')).toBe(
            'npm install --save-dev ptbk@latest',
        );
    });

    it('updates a globally installed package', () => {
        expect(buildNpmPackageInstallCommand('ptbk', 'global')).toBe('npm install -g ptbk@latest');
    });
});
