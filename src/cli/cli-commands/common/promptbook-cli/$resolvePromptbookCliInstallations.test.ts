import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { $execCommand } from '../../../../utils/execCommand/$execCommand';
import { $resolvePromptbookCliInstallations } from './$resolvePromptbookCliInstallations';

jest.mock('../../../../utils/execCommand/$execCommand', () => ({
    $execCommand: jest.fn(),
}));

/**
 * Typed Jest mock for the npm command runner.
 *
 * @private internal utility of `$resolvePromptbookCliInstallations.test`
 */
function getExecCommandMock(): jest.MockedFunction<typeof $execCommand> {
    return $execCommand as jest.MockedFunction<typeof $execCommand>;
}

/**
 * Writes one installed package manifest below a `node_modules` directory.
 *
 * @private internal utility of `$resolvePromptbookCliInstallations.test`
 */
async function writeInstalledPackageManifest(
    nodeModulesPath: string,
    npmPackageName: string,
    version: string,
): Promise<void> {
    const packagePath = join(nodeModulesPath, npmPackageName);
    await mkdir(packagePath, { recursive: true });
    await writeFile(join(packagePath, 'package.json'), JSON.stringify({ name: npmPackageName, version }), 'utf8');
}

describe('$resolvePromptbookCliInstallations', () => {
    const temporaryDirectories: Array<string> = [];
    const originalWorkingDirectory = process.cwd();

    afterEach(async () => {
        process.chdir(originalWorkingDirectory);
        jest.clearAllMocks();
        await Promise.all(
            temporaryDirectories.splice(0).map((temporaryDirectory) => rm(temporaryDirectory, { recursive: true })),
        );
    });

    it('finds direct local dependencies and globally installed CLI packages', async () => {
        const projectPath = await mkdtemp(join(tmpdir(), 'promptbook-cli-installation-project-'));
        const globalNodeModulesPath = await mkdtemp(join(tmpdir(), 'promptbook-cli-installation-global-'));
        temporaryDirectories.push(projectPath, globalNodeModulesPath);
        await writeFile(
            join(projectPath, 'package.json'),
            JSON.stringify({
                dependencies: { ptbk: '^0.113.0' },
                devDependencies: { '@promptbook/cli': '^0.113.0' },
            }),
            'utf8',
        );
        await Promise.all([
            writeInstalledPackageManifest(join(projectPath, 'node_modules'), 'ptbk', '0.113.0'),
            writeInstalledPackageManifest(join(projectPath, 'node_modules'), '@promptbook/cli', '0.113.1'),
            writeInstalledPackageManifest(globalNodeModulesPath, 'ptbk', '0.112.0'),
        ]);
        getExecCommandMock().mockResolvedValue(globalNodeModulesPath);
        process.chdir(projectPath);

        await expect($resolvePromptbookCliInstallations()).resolves.toEqual([
            {
                npmPackageName: 'ptbk',
                installedVersion: '0.113.0',
                installationLocation: 'local-dependency',
            },
            {
                npmPackageName: '@promptbook/cli',
                installedVersion: '0.113.1',
                installationLocation: 'local-development-dependency',
            },
            {
                npmPackageName: 'ptbk',
                installedVersion: '0.112.0',
                installationLocation: 'global',
            },
        ]);
    });

    it('does not treat a transitive local package as an update target', async () => {
        const projectPath = await mkdtemp(join(tmpdir(), 'promptbook-cli-installation-project-'));
        const globalNodeModulesPath = await mkdtemp(join(tmpdir(), 'promptbook-cli-installation-global-'));
        temporaryDirectories.push(projectPath, globalNodeModulesPath);
        await writeFile(join(projectPath, 'package.json'), JSON.stringify({ dependencies: {} }), 'utf8');
        await writeInstalledPackageManifest(join(projectPath, 'node_modules'), 'ptbk', '0.113.0');
        getExecCommandMock().mockResolvedValue(globalNodeModulesPath);
        process.chdir(projectPath);

        await expect($resolvePromptbookCliInstallations()).resolves.toEqual([]);
    });
});
