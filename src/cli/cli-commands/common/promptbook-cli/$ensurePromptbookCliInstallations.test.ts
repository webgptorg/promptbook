import { $askForNpmPackageInstallationApproval } from '../npm/$askForNpmPackageInstallationApproval';
import { $checkPromptbookCliInstallations } from './$checkPromptbookCliInstallations';
import { $ensurePromptbookCliInstallations } from './$ensurePromptbookCliInstallations';
import { $updatePromptbookCliInstallation } from './$updatePromptbookCliInstallation';
import type { PromptbookCliInstallationStatus } from './PromptbookCliInstallationStatus';

jest.mock('../npm/$askForNpmPackageInstallationApproval', () => ({
    $askForNpmPackageInstallationApproval: jest.fn(),
}));

jest.mock('./$checkPromptbookCliInstallations', () => ({
    $checkPromptbookCliInstallations: jest.fn(),
}));

jest.mock('./$updatePromptbookCliInstallation', () => ({
    $updatePromptbookCliInstallation: jest.fn(),
}));

/**
 * Typed Jest mock for the Promptbook CLI installation status check.
 */
function getCheckPromptbookCliInstallationsMock(): jest.MockedFunction<typeof $checkPromptbookCliInstallations> {
    return $checkPromptbookCliInstallations as jest.MockedFunction<typeof $checkPromptbookCliInstallations>;
}

/**
 * Typed Jest mock for the interactive npm-installation approval prompt.
 */
function getAskForNpmPackageInstallationApprovalMock(): jest.MockedFunction<
    typeof $askForNpmPackageInstallationApproval
> {
    return $askForNpmPackageInstallationApproval as jest.MockedFunction<typeof $askForNpmPackageInstallationApproval>;
}

/**
 * Typed Jest mock for the Promptbook CLI updater.
 */
function getUpdatePromptbookCliInstallationMock(): jest.MockedFunction<typeof $updatePromptbookCliInstallation> {
    return $updatePromptbookCliInstallation as jest.MockedFunction<typeof $updatePromptbookCliInstallation>;
}

/**
 * Creates one Promptbook CLI installation status fixture.
 */
function createPromptbookCliInstallationStatus(
    installationLocation: PromptbookCliInstallationStatus['installation']['installationLocation'],
    installationState: PromptbookCliInstallationStatus['installationState'] = 'outdated',
): PromptbookCliInstallationStatus {
    const installation =
        installationLocation === 'global'
            ? {
                  npmPackageName: 'ptbk' as const,
                  installedVersion: '0.114.0-8',
                  installationLocation,
              }
            : {
                  npmPackageName: 'ptbk' as const,
                  installedVersion: '0.114.0-8',
                  installationLocation,
                  projectPath: '/project',
              };

    return {
        installation,
        installationState,
        latestVersion: installationState === 'unknown' ? null : '0.114.0-9',
    };
}

describe('$ensurePromptbookCliInstallations', () => {
    const originalStandardInputIsTtyDescriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
    let consoleInfoSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
        Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: true });
        consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        getCheckPromptbookCliInstallationsMock().mockResolvedValue([]);
        getAskForNpmPackageInstallationApprovalMock().mockResolvedValue(false);
        getUpdatePromptbookCliInstallationMock().mockResolvedValue(true);
    });

    afterEach(() => {
        if (originalStandardInputIsTtyDescriptor === undefined) {
            Reflect.deleteProperty(process.stdin, 'isTTY');
        } else {
            Object.defineProperty(process.stdin, 'isTTY', originalStandardInputIsTtyDescriptor);
        }

        consoleInfoSpy.mockRestore();
        consoleWarnSpy.mockRestore();
        jest.clearAllMocks();
    });

    it('updates all outdated local and global installations after one approval', async () => {
        const localInstallationStatus = createPromptbookCliInstallationStatus('local-development-dependency');
        const globalInstallationStatus = createPromptbookCliInstallationStatus('global');
        getCheckPromptbookCliInstallationsMock().mockResolvedValue([localInstallationStatus, globalInstallationStatus]);
        getAskForNpmPackageInstallationApprovalMock().mockResolvedValue(true);

        await expect($ensurePromptbookCliInstallations()).resolves.toBe(true);

        expect($askForNpmPackageInstallationApproval).toHaveBeenCalledWith('Update Promptbook CLI now?');
        expect($updatePromptbookCliInstallation).toHaveBeenNthCalledWith(1, localInstallationStatus);
        expect($updatePromptbookCliInstallation).toHaveBeenNthCalledWith(2, globalInstallationStatus);
    });

    it('does not check npm when standard input is not interactive', async () => {
        Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: false });

        await expect($ensurePromptbookCliInstallations()).resolves.toBe(false);

        expect($checkPromptbookCliInstallations).not.toHaveBeenCalled();
    });

    it('continues without updating when the user declines', async () => {
        getCheckPromptbookCliInstallationsMock().mockResolvedValue([
            createPromptbookCliInstallationStatus('local-dependency'),
        ]);

        await expect($ensurePromptbookCliInstallations()).resolves.toBe(false);

        expect($updatePromptbookCliInstallation).not.toHaveBeenCalled();
    });

    it('continues when every approved update fails', async () => {
        getCheckPromptbookCliInstallationsMock().mockResolvedValue([createPromptbookCliInstallationStatus('global')]);
        getAskForNpmPackageInstallationApprovalMock().mockResolvedValue(true);
        getUpdatePromptbookCliInstallationMock().mockResolvedValue(false);

        await expect($ensurePromptbookCliInstallations()).resolves.toBe(false);
    });
});
