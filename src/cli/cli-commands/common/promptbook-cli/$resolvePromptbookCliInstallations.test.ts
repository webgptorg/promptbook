import { mkdir, mkdtemp, realpath, rm, writeFile } from 'fs/promises';
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

/**
 * Creates a canonical temporary project directory for tests which compare it with `process.cwd()`.
 *
 * @private internal utility of `$resolvePromptbookCliInstallations.test`
 */
async function createTemporaryProject(): Promise<string> {
    return realpath(await mkdtemp(join(tmpdir(), 'promptbook-cli-installation-project-')));
}

describe('$resolvePromptbookCliInstallations', () => {
    const temporaryDirectories: Array<string> = [];
    const originalWorkingDirectory = process.cwd();

    afterEach(async () => {
        process.chdir(originalWorkingDirectory);
        jest.clearAllMocks();
        await Promise.all(
            temporaryDirectories
                .splice(0)
                .map((temporaryDirectory) => rm(temporaryDirectory, { recursive: true, force: true })),
        );
    });

    it('finds direct local dependencies and direct global CLI installations', async () => {
        const projectPath = await createTemporaryProject();
        temporaryDirectories.push(projectPath);
        await writeFile(
            join(projectPath, 'package.json'),
            JSON.stringify({
                dependencies: { ptbk: '^0.114.0-7' },
                devDependencies: { '@promptbook/cli': '^0.114.0-8' },
            }),
            'utf8',
        );
        await Promise.all([
            writeInstalledPackageManifest(join(projectPath, 'node_modules'), 'ptbk', '0.114.0-7'),
            writeInstalledPackageManifest(join(projectPath, 'node_modules'), '@promptbook/cli', '0.114.0-8'),
        ]);
        getExecCommandMock().mockResolvedValue(
            JSON.stringify({
                dependencies: {
                    ptbk: { version: '0.114.0-6' },
                },
            }),
        );
        process.chdir(projectPath);

        await expect($resolvePromptbookCliInstallations()).resolves.toEqual([
            {
                npmPackageName: 'ptbk',
                installedVersion: '0.114.0-7',
                installationLocation: 'local-dependency',
                projectPath,
            },
            {
                npmPackageName: '@promptbook/cli',
                installedVersion: '0.114.0-8',
                installationLocation: 'local-development-dependency',
                projectPath,
            },
            {
                npmPackageName: 'ptbk',
                installedVersion: '0.114.0-6',
                installationLocation: 'global',
            },
        ]);
    });

    it('finds an ancestor project manifest and its hoisted node_modules installation', async () => {
        const projectPath = await createTemporaryProject();
        const nestedWorkingDirectory = join(projectPath, 'packages', 'application', 'src');
        temporaryDirectories.push(projectPath);
        await mkdir(nestedWorkingDirectory, { recursive: true });
        await writeFile(
            join(projectPath, 'package.json'),
            JSON.stringify({ devDependencies: { ptbk: '^0.114.0-8' } }),
            'utf8',
        );
        await writeInstalledPackageManifest(join(projectPath, 'node_modules'), 'ptbk', '0.114.0-8');
        getExecCommandMock().mockResolvedValue(JSON.stringify({ dependencies: {} }));
        process.chdir(nestedWorkingDirectory);

        await expect($resolvePromptbookCliInstallations()).resolves.toEqual([
            {
                npmPackageName: 'ptbk',
                installedVersion: '0.114.0-8',
                installationLocation: 'local-development-dependency',
                projectPath,
            },
        ]);
    });

    it('does not treat transitive local or global packages as update targets', async () => {
        const projectPath = await createTemporaryProject();
        temporaryDirectories.push(projectPath);
        await writeFile(join(projectPath, 'package.json'), JSON.stringify({ dependencies: {} }), 'utf8');
        await writeInstalledPackageManifest(join(projectPath, 'node_modules'), 'ptbk', '0.114.0-8');
        getExecCommandMock().mockResolvedValue(
            JSON.stringify({
                dependencies: {
                    unrelated: {
                        version: '1.0.0',
                        dependencies: { ptbk: { version: '0.114.0-8' } },
                    },
                },
            }),
        );
        process.chdir(projectPath);

        await expect($resolvePromptbookCliInstallations()).resolves.toEqual([]);
    });

    it('tolerates npm warnings around the global package JSON', async () => {
        const projectPath = await createTemporaryProject();
        temporaryDirectories.push(projectPath);
        await writeFile(join(projectPath, 'package.json'), JSON.stringify({ dependencies: {} }), 'utf8');
        getExecCommandMock().mockResolvedValue(
            `npm warning before\n${JSON.stringify({
                dependencies: { '@promptbook/cli': { version: '0.114.0-8' } },
            })}\nnpm warning after`,
        );
        process.chdir(projectPath);

        await expect($resolvePromptbookCliInstallations()).resolves.toEqual([
            {
                npmPackageName: '@promptbook/cli',
                installedVersion: '0.114.0-8',
                installationLocation: 'global',
            },
        ]);
    });
});
