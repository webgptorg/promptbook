import { $resolveLatestNpmPackageVersion } from '../npm/$resolveLatestNpmPackageVersion';
import { $checkHarnessInstallation } from './$checkHarnessInstallation';
import { $resolveHarnessInstallationOrigin } from './$resolveHarnessInstallationOrigin';
import { $resolveInstalledHarnessVersion } from './$resolveInstalledHarnessVersion';
import { getHarnessDefinition } from './HarnessDefinition';

jest.mock('../npm/$resolveLatestNpmPackageVersion', () => ({
    $resolveLatestNpmPackageVersion: jest.fn(),
}));

jest.mock('./$resolveInstalledHarnessVersion', () => ({
    $resolveInstalledHarnessVersion: jest.fn(),
}));

jest.mock('./$resolveHarnessInstallationOrigin', () => ({
    $resolveHarnessInstallationOrigin: jest.fn(),
}));

/**
 * Typed mock for resolving the globally installed harness version.
 */
function getResolveInstalledHarnessVersionMock(): jest.MockedFunction<typeof $resolveInstalledHarnessVersion> {
    return $resolveInstalledHarnessVersion as jest.MockedFunction<typeof $resolveInstalledHarnessVersion>;
}

/**
 * Typed mock for resolving the newest npm package version.
 */
function getResolveLatestNpmPackageVersionMock(): jest.MockedFunction<typeof $resolveLatestNpmPackageVersion> {
    return $resolveLatestNpmPackageVersion as jest.MockedFunction<typeof $resolveLatestNpmPackageVersion>;
}

/**
 * Typed mock for resolving where the harness command is installed.
 */
function getResolveHarnessInstallationOriginMock(): jest.MockedFunction<typeof $resolveHarnessInstallationOrigin> {
    return $resolveHarnessInstallationOrigin as jest.MockedFunction<typeof $resolveHarnessInstallationOrigin>;
}

describe('$checkHarnessInstallation', () => {
    beforeEach(() => {
        getResolveInstalledHarnessVersionMock().mockResolvedValue('1.2.3');
        getResolveLatestNpmPackageVersionMock().mockResolvedValue('1.2.3');
        getResolveHarnessInstallationOriginMock().mockResolvedValue({
            commandPath: '/usr/lib/node_modules/@openai/codex/bin/codex.js',
            installationMethod: 'npm-global',
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('checks the newest npm version by default', async () => {
        const definition = getHarnessDefinition('openai-codex');

        await expect($checkHarnessInstallation(definition)).resolves.toMatchObject({
            installationState: 'up-to-date',
            installedVersion: '1.2.3',
            latestVersion: '1.2.3',
        });
        expect($resolveLatestNpmPackageVersion).toHaveBeenCalledWith('@openai/codex');
    });

    it('reports where the harness command is installed', async () => {
        getResolveHarnessInstallationOriginMock().mockResolvedValue({
            commandPath: '/home/promptbook/.codex/packages/standalone/current/bin/codex',
            installationMethod: 'standalone',
        });
        const definition = getHarnessDefinition('openai-codex');

        await expect($checkHarnessInstallation(definition)).resolves.toMatchObject({
            installationOrigin: {
                commandPath: '/home/promptbook/.codex/packages/standalone/current/bin/codex',
                installationMethod: 'standalone',
            },
        });
        expect($resolveHarnessInstallationOrigin).toHaveBeenCalledWith(definition);
    });

    it('does not query npm when the harness update check is disabled', async () => {
        const definition = getHarnessDefinition('openai-codex');

        await expect($checkHarnessInstallation(definition, false)).resolves.toMatchObject({
            installationState: 'installed',
            installedVersion: '1.2.3',
            latestVersion: null,
        });
        expect($resolveLatestNpmPackageVersion).not.toHaveBeenCalled();
        expect($resolveHarnessInstallationOrigin).not.toHaveBeenCalled();
    });

    it('still reports a missing harness when the update check is disabled', async () => {
        getResolveInstalledHarnessVersionMock().mockResolvedValue(null);
        const definition = getHarnessDefinition('openai-codex');

        await expect($checkHarnessInstallation(definition, false)).resolves.toMatchObject({
            installationState: 'not-installed',
            installedVersion: null,
        });
        expect($resolveLatestNpmPackageVersion).not.toHaveBeenCalled();
    });
});

// Note: [🟡] Code for CLI harness installation check tests [$checkHarnessInstallation.test](src/cli/cli-commands/common/harness/$checkHarnessInstallation.test.ts) should never be published outside of `@promptbook/cli`
