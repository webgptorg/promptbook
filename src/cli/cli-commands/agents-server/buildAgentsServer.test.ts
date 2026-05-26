import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
    isAgentsServerBuildCacheCurrent,
    resolveAgentsServerBuildAppPath,
    writeAgentsServerBuildCache,
} from './buildAgentsServer';

/**
 * Minimal local runtime layout used by Agents Server build-cache tests.
 */
type AgentsServerBuildFixture = {
    readonly appPath: string;
    readonly buildIdPath: string;
    readonly sharedSourcePath: string;
    readonly temporaryDirectoryPath: string;
};

/**
 * Creates runtime source roots and the Next build marker expected by the cache helper.
 */
async function createAgentsServerBuildFixture(): Promise<AgentsServerBuildFixture> {
    const temporaryDirectoryPath = await mkdtemp(join(tmpdir(), 'promptbook-agents-server-build-'));
    const appPath = join(temporaryDirectoryPath, 'apps', 'agents-server');
    const sharedSourcePath = join(temporaryDirectoryPath, 'src', 'shared.ts');
    const buildIdPath = join(appPath, '.next', 'BUILD_ID');

    await Promise.all([
        mkdir(join(appPath, 'src'), { recursive: true }),
        mkdir(join(appPath, '.next'), { recursive: true }),
        mkdir(join(temporaryDirectoryPath, 'apps', '_common'), { recursive: true }),
        mkdir(join(temporaryDirectoryPath, 'books'), { recursive: true }),
        mkdir(join(temporaryDirectoryPath, 'src'), { recursive: true }),
    ]);

    await Promise.all([
        writeFile(join(appPath, 'src', 'page.tsx'), 'Agents Server page fixture\n', 'utf-8'),
        writeFile(join(temporaryDirectoryPath, 'apps', '_common', 'shared.ts'), 'Common source fixture\n', 'utf-8'),
        writeFile(join(temporaryDirectoryPath, 'books', 'agent.book'), 'PERSONA Cached build fixture\n', 'utf-8'),
        writeFile(join(temporaryDirectoryPath, 'package.json'), '{"name":"fixture"}\n', 'utf-8'),
        writeFile(join(temporaryDirectoryPath, 'package-lock.json'), '{"name":"fixture"}\n', 'utf-8'),
        writeFile(join(temporaryDirectoryPath, 'security.config.ts'), 'Security source fixture\n', 'utf-8'),
        writeFile(join(temporaryDirectoryPath, 'servers.ts'), 'Servers source fixture\n', 'utf-8'),
        writeFile(join(temporaryDirectoryPath, 'tsconfig.json'), '{}\n', 'utf-8'),
        writeFile(sharedSourcePath, 'Shared source fixture\n', 'utf-8'),
        writeFile(buildIdPath, 'fixture-build-id\n', 'utf-8'),
    ]);

    return {
        appPath,
        buildIdPath,
        sharedSourcePath,
        temporaryDirectoryPath,
    };
}

describe('Agents Server build cache', () => {
    const temporaryDirectoryPaths: Array<string> = [];
    const originalWorkingDirectory = process.cwd();

    afterEach(async () => {
        process.chdir(originalWorkingDirectory);
        await Promise.all(
            temporaryDirectoryPaths
                .splice(0)
                .map((temporaryDirectoryPath) => rm(temporaryDirectoryPath, { recursive: true, force: true })),
        );
    });

    it('keeps the cached build until shared runtime source changes', async () => {
        const fixture = await createAgentsServerBuildFixture();
        temporaryDirectoryPaths.push(fixture.temporaryDirectoryPath);

        await writeAgentsServerBuildCache({ appPath: fixture.appPath });

        await expect(isAgentsServerBuildCacheCurrent({ appPath: fixture.appPath })).resolves.toBe(true);

        await writeFile(fixture.sharedSourcePath, 'Shared source changed fixture\n', 'utf-8');

        await expect(isAgentsServerBuildCacheCurrent({ appPath: fixture.appPath })).resolves.toBe(false);
    });

    it('requires the Next build marker before reusing cached metadata', async () => {
        const fixture = await createAgentsServerBuildFixture();
        temporaryDirectoryPaths.push(fixture.temporaryDirectoryPath);

        await writeAgentsServerBuildCache({ appPath: fixture.appPath });
        await rm(fixture.buildIdPath);

        await expect(isAgentsServerBuildCacheCurrent({ appPath: fixture.appPath })).resolves.toBe(false);
    });

    it('materializes packaged app sources outside node_modules for Next builds', async () => {
        const temporaryDirectoryPath = await mkdtemp(join(tmpdir(), 'promptbook-agents-server-packaged-'));
        temporaryDirectoryPaths.push(temporaryDirectoryPath);

        const nodeModulesPath = join(temporaryDirectoryPath, 'node_modules');
        const sourceRuntimeRootPath = join(nodeModulesPath, '@promptbook', 'cli');
        const sourceAppPath = join(sourceRuntimeRootPath, 'apps', 'agents-server');
        const materializedRuntimeRootPath = join(temporaryDirectoryPath, '.promptbook', 'agents-server', 'runtime');

        await Promise.all([
            mkdir(join(sourceAppPath, 'src'), { recursive: true }),
            mkdir(join(sourceAppPath, '.next'), { recursive: true }),
            mkdir(join(sourceRuntimeRootPath, 'apps', '_common'), { recursive: true }),
            mkdir(join(sourceRuntimeRootPath, 'books'), { recursive: true }),
            mkdir(join(sourceRuntimeRootPath, 'src'), { recursive: true }),
        ]);

        await Promise.all([
            writeFile(join(sourceAppPath, 'package.json'), '{"name":"promptbook-agents-server"}\n', 'utf-8'),
            writeFile(join(sourceAppPath, 'next.config.ts'), 'export default {};\n', 'utf-8'),
            writeFile(join(sourceAppPath, 'src', 'page.tsx'), 'Packaged page fixture\n', 'utf-8'),
            writeFile(join(sourceAppPath, 'src', 'page.test.tsx'), 'Ignored test fixture\n', 'utf-8'),
            writeFile(join(sourceAppPath, '.env'), 'IGNORED_ENV=1\n', 'utf-8'),
            writeFile(join(sourceAppPath, '.next', 'BUILD_ID'), 'ignored-build-output\n', 'utf-8'),
            writeFile(join(sourceRuntimeRootPath, 'apps', '_common', 'shared.ts'), 'Common fixture\n', 'utf-8'),
            writeFile(join(sourceRuntimeRootPath, 'books', 'agent.book'), 'PERSONA Packaged fixture\n', 'utf-8'),
            writeFile(join(sourceRuntimeRootPath, 'src', 'index.ts'), 'Runtime source fixture\n', 'utf-8'),
            writeFile(join(sourceRuntimeRootPath, 'package.json'), '{"name":"@promptbook/cli"}\n', 'utf-8'),
            writeFile(join(sourceRuntimeRootPath, 'package-lock.json'), '{"name":"@promptbook/cli"}\n', 'utf-8'),
            writeFile(join(sourceRuntimeRootPath, 'security.config.ts'), 'Security fixture\n', 'utf-8'),
            writeFile(join(sourceRuntimeRootPath, 'servers.ts'), 'Servers fixture\n', 'utf-8'),
            writeFile(join(sourceRuntimeRootPath, 'tsconfig.json'), '{}\n', 'utf-8'),
        ]);

        process.chdir(temporaryDirectoryPath);

        const materializedAppPath = await resolveAgentsServerBuildAppPath({
            nodeModulesPath,
            sourceAppPath,
        });

        await expect(readFile(join(materializedAppPath, 'src', 'page.tsx'), 'utf-8')).resolves.toBe(
            'Packaged page fixture\n',
        );
        await expect(doesPathExist(join(materializedAppPath, 'src', 'page.test.tsx'))).resolves.toBe(false);
        await expect(doesPathExist(join(materializedAppPath, '.env'))).resolves.toBe(false);
        await expect(doesPathExist(join(materializedAppPath, '.next', 'BUILD_ID'))).resolves.toBe(false);

        const nodeModulesLinkStats = await lstat(join(materializedRuntimeRootPath, 'node_modules'));

        expect(materializedAppPath).toBe(join(materializedRuntimeRootPath, 'apps', 'agents-server'));
        expect(nodeModulesLinkStats.isSymbolicLink() || nodeModulesLinkStats.isDirectory()).toBe(true);
    });
});

/**
 * Returns true when the path exists.
 *
 * @private internal utility of buildAgentsServer tests
 */
async function doesPathExist(path: string): Promise<boolean> {
    try {
        await lstat(path);
        return true;
    } catch {
        return false;
    }
}

// Note: [💞] Ignore a discrepancy between file name and entity name
