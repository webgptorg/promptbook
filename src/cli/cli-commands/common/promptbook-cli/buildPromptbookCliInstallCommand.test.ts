import type { PromptbookCliInstallation } from './PromptbookCliInstallation';
import { buildPromptbookCliInstallCommand } from './buildPromptbookCliInstallCommand';

/**
 * Creates one Promptbook CLI installation fixture for install-command tests.
 *
 * @private internal utility of `buildPromptbookCliInstallCommand.test`
 */
function createPromptbookCliInstallation(
    installationLocation: PromptbookCliInstallation['installationLocation'],
): PromptbookCliInstallation {
    return {
        npmPackageName: 'ptbk',
        installedVersion: '0.113.0',
        installationLocation,
    };
}

describe('buildPromptbookCliInstallCommand', () => {
    it('updates a production dependency in package.json', () => {
        expect(buildPromptbookCliInstallCommand(createPromptbookCliInstallation('local-dependency'))).toBe(
            'npm install --save ptbk@latest',
        );
    });

    it('updates a development dependency in package.json', () => {
        expect(buildPromptbookCliInstallCommand(createPromptbookCliInstallation('local-development-dependency'))).toBe(
            'npm install --save-dev ptbk@latest',
        );
    });

    it('updates a globally installed CLI package', () => {
        expect(buildPromptbookCliInstallCommand(createPromptbookCliInstallation('global'))).toBe(
            'npm install --global ptbk@latest',
        );
    });
});
