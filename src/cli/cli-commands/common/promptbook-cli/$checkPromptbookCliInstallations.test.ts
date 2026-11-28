import { $resolveLatestNpmPackageVersion } from '../npm/$resolveLatestNpmPackageVersion';
import { $checkPromptbookCliInstallations } from './$checkPromptbookCliInstallations';
import { $resolvePromptbookCliInstallations } from './$resolvePromptbookCliInstallations';
import type { PromptbookCliInstallation } from './PromptbookCliInstallation';

jest.mock('../npm/$resolveLatestNpmPackageVersion', () => ({
    $resolveLatestNpmPackageVersion: jest.fn(),
}));

jest.mock('./$resolvePromptbookCliInstallations', () => ({
    $resolvePromptbookCliInstallations: jest.fn(),
}));

/**
 * Typed Jest mock for installed Promptbook CLI discovery.
 */
function getResolvePromptbookCliInstallationsMock(): jest.MockedFunction<typeof $resolvePromptbookCliInstallations> {
    return $resolvePromptbookCliInstallations as jest.MockedFunction<typeof $resolvePromptbookCliInstallations>;
}

/**
 * Typed Jest mock for npm's latest package version lookup.
 */
function getResolveLatestNpmPackageVersionMock(): jest.MockedFunction<typeof $resolveLatestNpmPackageVersion> {
    return $resolveLatestNpmPackageVersion as jest.MockedFunction<typeof $resolveLatestNpmPackageVersion>;
}

describe('$checkPromptbookCliInstallations', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('detects a newer Promptbook numbered prerelease for local and global installations', async () => {
        const installations: ReadonlyArray<PromptbookCliInstallation> = [
            {
                npmPackageName: 'ptbk',
                installedVersion: '0.114.0-8',
                installationLocation: 'local-development-dependency',
                projectPath: '/project',
            },
            {
                npmPackageName: 'ptbk',
                installedVersion: '0.114.0-8',
                installationLocation: 'global',
            },
        ];
        getResolvePromptbookCliInstallationsMock().mockResolvedValue(installations);
        getResolveLatestNpmPackageVersionMock().mockResolvedValue('0.114.0-9');

        await expect($checkPromptbookCliInstallations()).resolves.toEqual([
            { installation: installations[0], installationState: 'outdated', latestVersion: '0.114.0-9' },
            { installation: installations[1], installationState: 'outdated', latestVersion: '0.114.0-9' },
        ]);
        expect($resolveLatestNpmPackageVersion).toHaveBeenCalledTimes(1);
        expect($resolveLatestNpmPackageVersion).toHaveBeenCalledWith('ptbk');
    });

    it('reports an unknown state when npm cannot be reached', async () => {
        const installation: PromptbookCliInstallation = {
            npmPackageName: '@promptbook/cli',
            installedVersion: '0.114.0-8',
            installationLocation: 'global',
        };
        getResolvePromptbookCliInstallationsMock().mockResolvedValue([installation]);
        getResolveLatestNpmPackageVersionMock().mockResolvedValue(null);

        await expect($checkPromptbookCliInstallations()).resolves.toEqual([
            { installation, installationState: 'unknown', latestVersion: null },
        ]);
    });
});
