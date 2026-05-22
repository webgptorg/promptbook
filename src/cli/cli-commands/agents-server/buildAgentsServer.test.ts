import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { isAgentsServerBuildCacheCurrent, writeAgentsServerBuildCache } from './buildAgentsServer';

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

    afterEach(async () => {
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
});

// Note: [💞] Ignore a discrepancy between file name and entity name
