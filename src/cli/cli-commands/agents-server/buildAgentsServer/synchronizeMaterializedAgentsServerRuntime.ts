import { cp, lstat, mkdir, readFile, rm, stat, symlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../../../errors/NotAllowed';
import { AGENTS_SERVER_BUILD_CACHE_VERSION } from './AGENTS_SERVER_BUILD_CACHE_VERSION';
import { createAgentsServerBuildSourceFingerprint } from './createAgentsServerBuildSourceFingerprint';
import { getAgentsServerBuildInputRelativePaths } from './getAgentsServerBuildInputRelativePaths';
import { isAgentsServerAppPath } from './isAgentsServerAppPath';
import { NODE_MODULES_DIRECTORY_NAME } from './NODE_MODULES_DIRECTORY_NAME';
import { shouldCopyAgentsServerRuntimePath } from './shouldCopyAgentsServerRuntimePath';

/**
 * Runtime copy metadata filename stored in the project-local materialized app root.
 */
const AGENTS_SERVER_MATERIALIZED_RUNTIME_CACHE_FILENAME = '.ptbk-agents-server-runtime-cache.json';

/**
 * Metadata persisted after copying the npm-packaged Agents Server runtime into the launch project.
 */
type AgentsServerMaterializedRuntimeCache = {
    readonly version: typeof AGENTS_SERVER_BUILD_CACHE_VERSION;
    readonly sourceFingerprint: string;
};

/**
 * Copies the bundled runtime into the launch project when the original app lives under `node_modules`.
 *
 * @private internal utility of `buildAgentsServer`
 */
export async function synchronizeMaterializedAgentsServerRuntime(options: {
    readonly materializedRuntimeRootPath: string;
    readonly nodeModulesPath: string;
    readonly sourceAppPath: string;
    readonly sourceRuntimeRootPath: string;
}): Promise<void> {
    const sourceFingerprint = await createAgentsServerBuildSourceFingerprint(options.sourceAppPath);
    const runtimeCache = await readAgentsServerMaterializedRuntimeCache(options.materializedRuntimeRootPath);
    const isRuntimeCurrent =
        runtimeCache?.version === AGENTS_SERVER_BUILD_CACHE_VERSION &&
        runtimeCache.sourceFingerprint === sourceFingerprint &&
        (await isAgentsServerAppPath(join(options.materializedRuntimeRootPath, 'apps', 'agents-server')));

    if (!isRuntimeCurrent) {
        await rm(options.materializedRuntimeRootPath, { recursive: true, force: true });
        await mkdir(options.materializedRuntimeRootPath, { recursive: true });

        for (const relativeInputPath of getAgentsServerBuildInputRelativePaths()) {
            await copyAgentsServerRuntimePath({
                destinationPath: join(options.materializedRuntimeRootPath, relativeInputPath),
                sourcePath: join(options.sourceRuntimeRootPath, relativeInputPath),
            });
        }

        await assertMaterializedAgentsServerAppExists(options.materializedRuntimeRootPath);
        await writeAgentsServerMaterializedRuntimeCache(options.materializedRuntimeRootPath, sourceFingerprint);
    }

    await ensureMaterializedRuntimeNodeModulesLink({
        materializedRuntimeRootPath: options.materializedRuntimeRootPath,
        nodeModulesPath: options.nodeModulesPath,
    });
}

/**
 * Verifies that the materialized runtime contains a usable Next app before caching it.
 */
async function assertMaterializedAgentsServerAppExists(materializedRuntimeRootPath: string): Promise<void> {
    const materializedAppPath = join(materializedRuntimeRootPath, 'apps', 'agents-server');

    if (await isAgentsServerAppPath(materializedAppPath)) {
        return;
    }

    throw new NotAllowed(
        spaceTrim(`
            Cannot prepare the bundled Agents Server runtime.

            The materialized app path is missing required files:
            \`${materializedAppPath}\`
        `),
    );
}

/**
 * Copies one source path into the materialized runtime, skipping generated or private files.
 */
async function copyAgentsServerRuntimePath(options: {
    readonly destinationPath: string;
    readonly sourcePath: string;
}): Promise<void> {
    let sourceStats;

    try {
        sourceStats = await stat(options.sourcePath);
    } catch {
        return;
    }

    await mkdir(dirname(options.destinationPath), { recursive: true });

    if (sourceStats.isDirectory()) {
        await cp(options.sourcePath, options.destinationPath, {
            recursive: true,
            filter: (sourcePath) => shouldCopyAgentsServerRuntimePath(sourcePath, options.sourcePath),
        });
        return;
    }

    if (sourceStats.isFile() && shouldCopyAgentsServerRuntimePath(options.sourcePath, dirname(options.sourcePath))) {
        await cp(options.sourcePath, options.destinationPath);
    }
}

/**
 * Links the materialized runtime back to the package dependency tree used by the installed CLI.
 */
async function ensureMaterializedRuntimeNodeModulesLink(options: {
    readonly materializedRuntimeRootPath: string;
    readonly nodeModulesPath: string;
}): Promise<void> {
    const nodeModulesLinkPath = join(options.materializedRuntimeRootPath, NODE_MODULES_DIRECTORY_NAME);

    try {
        const existingLinkStats = await lstat(nodeModulesLinkPath);
        await rm(nodeModulesLinkPath, {
            force: true,
            recursive: existingLinkStats.isDirectory() && !existingLinkStats.isSymbolicLink(),
        });
    } catch {
        // The link does not exist yet.
    }

    await symlink(options.nodeModulesPath, nodeModulesLinkPath, process.platform === 'win32' ? 'junction' : 'dir');
}

/**
 * Reads and validates materialized runtime metadata.
 */
async function readAgentsServerMaterializedRuntimeCache(
    materializedRuntimeRootPath: string,
): Promise<AgentsServerMaterializedRuntimeCache | undefined> {
    try {
        const serializedRuntimeCache = await readFile(
            join(materializedRuntimeRootPath, AGENTS_SERVER_MATERIALIZED_RUNTIME_CACHE_FILENAME),
            'utf-8',
        );
        const runtimeCache = JSON.parse(serializedRuntimeCache) as Partial<AgentsServerMaterializedRuntimeCache>;

        if (
            runtimeCache.version !== AGENTS_SERVER_BUILD_CACHE_VERSION ||
            typeof runtimeCache.sourceFingerprint !== 'string'
        ) {
            return undefined;
        }

        return runtimeCache as AgentsServerMaterializedRuntimeCache;
    } catch {
        return undefined;
    }
}

/**
 * Persists the source fingerprint used for the materialized runtime copy.
 */
async function writeAgentsServerMaterializedRuntimeCache(
    materializedRuntimeRootPath: string,
    sourceFingerprint: string,
): Promise<void> {
    const runtimeCache: AgentsServerMaterializedRuntimeCache = {
        version: AGENTS_SERVER_BUILD_CACHE_VERSION,
        sourceFingerprint,
    };

    await writeFile(
        join(materializedRuntimeRootPath, AGENTS_SERVER_MATERIALIZED_RUNTIME_CACHE_FILENAME),
        `${JSON.stringify(runtimeCache, null, 4)}\n`,
        'utf-8',
    );
}
