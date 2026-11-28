import { $execCommand } from '../../../../utils/execCommand/$execCommand';
import { $updatePromptbookCliInstallation } from './$updatePromptbookCliInstallation';
import type { PromptbookCliInstallationStatus } from './PromptbookCliInstallationStatus';

jest.mock('../../../../utils/execCommand/$execCommand', () => ({
    $execCommand: jest.fn(),
}));

/**
 * Typed Jest mock for the npm command runner.
 */
function getExecCommandMock(): jest.MockedFunction<typeof $execCommand> {
    return $execCommand as jest.MockedFunction<typeof $execCommand>;
}

describe('$updatePromptbookCliInstallation', () => {
    let consoleInfoSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        getExecCommandMock().mockResolvedValue('');
    });

    afterEach(() => {
        consoleInfoSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        jest.clearAllMocks();
    });

    it('updates a local development dependency from the declaring project', async () => {
        const status: PromptbookCliInstallationStatus = {
            installation: {
                npmPackageName: 'ptbk',
                installedVersion: '0.114.0-8',
                installationLocation: 'local-development-dependency',
                projectPath: 'C:/project',
            },
            installationState: 'outdated',
            latestVersion: '0.114.0-9',
        };

        await expect($updatePromptbookCliInstallation(status)).resolves.toBe(true);

        expect($execCommand).toHaveBeenCalledWith(
            expect.objectContaining({
                command: 'npm install --save-dev ptbk@latest',
                cwd: 'C:/project',
            }),
        );
    });

    it('updates a global installation globally', async () => {
        const status: PromptbookCliInstallationStatus = {
            installation: {
                npmPackageName: '@promptbook/cli',
                installedVersion: '0.114.0-8',
                installationLocation: 'global',
            },
            installationState: 'outdated',
            latestVersion: '0.114.0-9',
        };

        await expect($updatePromptbookCliInstallation(status)).resolves.toBe(true);

        expect($execCommand).toHaveBeenCalledWith(
            expect.objectContaining({
                command: 'npm install -g @promptbook/cli@latest',
            }),
        );
    });

    it('reports a failed update without throwing', async () => {
        const status: PromptbookCliInstallationStatus = {
            installation: {
                npmPackageName: 'ptbk',
                installedVersion: '0.114.0-8',
                installationLocation: 'global',
            },
            installationState: 'outdated',
            latestVersion: '0.114.0-9',
        };
        getExecCommandMock().mockRejectedValue(new Error('permission denied'));

        await expect($updatePromptbookCliInstallation(status)).resolves.toBe(false);
    });
});
