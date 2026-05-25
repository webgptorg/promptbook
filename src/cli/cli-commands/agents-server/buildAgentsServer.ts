import { spawn } from 'child_process';
import { createHash, type Hash } from 'crypto';
import { cp, lstat, mkdir, readFile, readdir, rm, stat, symlink, writeFile } from 'fs/promises';
import { basename, delimiter, dirname, join, relative, resolve } from 'path';
import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../../errors/NotAllowed';
import { resolvePromptbookTemporaryPath } from '../../../utils/filesystem/promptbookTemporaryPath';

/**
 * Version of the CLI-owned Agents Server build cache metadata.
 *
 * @private internal constant of `ptbk agents-server`
 */
const AGENTS_SERVER_BUILD_CACHE_VERSION = 1;

/**
 * Metadata file stored beside the production Next build output.
 *
 * @private internal constant of `ptbk agents-server`
 */
const AGENTS_SERVER_BUILD_CACHE_FILENAME = '.ptbk-agents-server-build-cache.json';

/**
 * Next production build marker required before a cached build is reused.
 *
 * @private internal constant of `ptbk agents-server`
 */
const AGENTS_SERVER_NEXT_BUILD_ID_FILENAME = 'BUILD_ID';

/**
 * Next output directory used by the local Agents Server runtime unless Next overrides it.
 *
 * @private internal constant of `ptbk agents-server`
 */
const DEFAULT_AGENTS_SERVER_NEXT_DIST_DIRECTORY_NAME = '.next';

/**
 * Environment variable passed to the bundled Next app so webpack can resolve dependencies
 * installed beside `ptbk` even when the app sources are materialized into a project cache.
 *
 * @private internal constant of `ptbk agents-server`
 */
export const PTBK_AGENTS_SERVER_NODE_MODULES_PATH_ENV = 'PTBK_AGENTS_SERVER_NODE_MODULES_PATH';

/**
 * Environment variable used only by the CLI-owned production build.
 *
 * @private internal constant of `ptbk agents-server`
 */
export const PTBK_AGENTS_SERVER_IGNORE_NEXT_VALIDATION_ENV = 'PTBK_AGENTS_SERVER_IGNORE_NEXT_VALIDATION';

/**
 * Runtime copy metadata filename stored in the project-local materialized app root.
 *
 * @private internal constant of `ptbk agents-server`
 */
const AGENTS_SERVER_MATERIALIZED_RUNTIME_CACHE_FILENAME = '.ptbk-agents-server-runtime-cache.json';

/**
 * Directory segment used for Node package installs.
 *
 * @private internal constant of `ptbk agents-server`
 */
const NODE_MODULES_DIRECTORY_NAME = 'node_modules';

/**
 * Runtime paths copied into the CLI package and used by the Agents Server production build.
 *
 * @private internal constant of `ptbk agents-server`
 */
const AGENTS_SERVER_BUILD_INPUT_RELATIVE_PATHS = [
    'apps/agents-server',
    'apps/_common',
    'src',
    'books',
    'package.json',
    'package-lock.json',
    'security.config.ts',
    'servers.ts',
    'tsconfig.json',
] as const;

/**
 * Directory names excluded while fingerprinting production build inputs.
 *
 * @private internal constant of `ptbk agents-server`
 */
const AGENTS_SERVER_BUILD_INPUT_EXCLUDED_DIRECTORY_NAMES = new Set([
    '.git',
    '.next',
    '.next-e2e',
    '.promptbook',
    'coverage',
    'node_modules',
    'playwright-report',
    'test-results',
]);

/**
 * Test files copied out of packaged runtime input paths because Next does not build them.
 *
 * @private internal constant of `ptbk agents-server`
 */
const AGENTS_SERVER_BUILD_INPUT_TEST_FILE_PATTERN = /\.(?:spec|test)\.[jt]sx?$/iu;

/**
 * Metadata persisted after one successful Agents Server production build.
 *
 * @private internal type of `ptbk agents-server`
 */
type AgentsServerBuildCache = {
    readonly version: typeof AGENTS_SERVER_BUILD_CACHE_VERSION;
    readonly sourceFingerprint: string;
};

/**
 * Metadata persisted after copying the npm-packaged Agents Server runtime into the launch project.
 *
 * @private internal type of `ptbk agents-server`
 */
type AgentsServerMaterializedRuntimeCache = {
    readonly version: typeof AGENTS_SERVER_BUILD_CACHE_VERSION;
    readonly sourceFingerprint: string;
};

/**
 * Inputs controlling one cached Agents Server production build.
 *
 * @private internal type of `ptbk agents-server`
 */
type EnsureAgentsServerBuildOptions = {
    readonly appPath?: string;
    readonly environment?: NodeJS.ProcessEnv;
    readonly isBuildForced?: boolean;
    readonly onBuildEvent?: (event: string) => void;
    readonly onBuildOutput?: (chunk: string) => void;
};

/**
 * Paths needed after the Agents Server production build is ready.
 *
 * @private internal type of `ptbk agents-server`
 */
export type AgentsServerBuildArtifacts = {
    readonly appPath: string;
    readonly nodeModulesPath: string;
    readonly nextCliPath: string;
};

/**
 * Input paths required to validate or update the cached Agents Server build.
 *
 * @private internal type of `ptbk agents-server`
 */
type AgentsServerBuildCacheOptions = {
    readonly appPath: string;
    readonly environment?: NodeJS.ProcessEnv;
};

/**
 * Ensures that the local Agents Server production build exists and matches its source fingerprint.
 *
 * @private internal utility of `ptbk agents-server`
 */
export async function ensureAgentsServerBuild(
    options: EnsureAgentsServerBuildOptions = {},
): Promise<AgentsServerBuildArtifacts> {
    const environment = options.environment ?? process.env;
    const nextCliPath = resolveNextCliPath();
    const nodeModulesPath = resolveNodeModulesPath(nextCliPath);
    const appPath = await resolveAgentsServerBuildAppPath({
        sourceAppPath: options.appPath ?? (await resolveAgentsServerAppPath()),
        nodeModulesPath,
    });
    const buildEnvironment = createAgentsServerRuntimeEnvironment(environment, nodeModulesPath, {
        isNextValidationIgnored: isAgentsServerAppPathMaterialized(appPath),
    });

    if (
        !options.isBuildForced &&
        (await isAgentsServerBuildCacheCurrent({
            appPath,
            environment: buildEnvironment,
        }))
    ) {
        options.onBuildEvent?.('Using the cached Agents Server Next app build.');
        return { appPath, nextCliPath, nodeModulesPath };
    }

    options.onBuildEvent?.('Building the Agents Server Next app.');
    await runNextBuild({
        appPath,
        environment: buildEnvironment,
        nextCliPath,
        onBuildOutput: options.onBuildOutput,
    });
    await writeAgentsServerBuildCache({ appPath, environment: buildEnvironment });

    return { appPath, nextCliPath, nodeModulesPath };
}

/**
 * Returns true when the production build marker and source fingerprint still match.
 *
 * @private internal utility of `ptbk agents-server`
 */
export async function isAgentsServerBuildCacheCurrent(options: AgentsServerBuildCacheOptions): Promise<boolean> {
    const buildCache = await readAgentsServerBuildCache(options);

    if (!buildCache) {
        return false;
    }

    const buildOutputPath = resolveAgentsServerBuildOutputPath(options);
    if (!(await isFile(join(buildOutputPath, AGENTS_SERVER_NEXT_BUILD_ID_FILENAME)))) {
        return false;
    }

    return buildCache.sourceFingerprint === (await createAgentsServerBuildSourceFingerprint(options.appPath));
}

/**
 * Persists the source fingerprint for the just-created production build.
 *
 * @private internal utility of `ptbk agents-server`
 */
export async function writeAgentsServerBuildCache(options: AgentsServerBuildCacheOptions): Promise<void> {
    const buildOutputPath = resolveAgentsServerBuildOutputPath(options);
    const buildCache: AgentsServerBuildCache = {
        version: AGENTS_SERVER_BUILD_CACHE_VERSION,
        sourceFingerprint: await createAgentsServerBuildSourceFingerprint(options.appPath),
    };

    await mkdir(buildOutputPath, { recursive: true });
    await writeFile(
        join(buildOutputPath, AGENTS_SERVER_BUILD_CACHE_FILENAME),
        `${JSON.stringify(buildCache, null, 4)}\n`,
        'utf-8',
    );
}

/**
 * Finds the Agents Server app in a source checkout or generated CLI package.
 *
 * @private internal utility of `ptbk agents-server`
 */
export async function resolveAgentsServerAppPath(): Promise<string> {
    const candidates = [
        join(process.cwd(), 'apps', 'agents-server'),
        join(__dirname, '..', '..', '..', '..', 'apps', 'agents-server'),
        join(__dirname, '..', '..', 'apps', 'agents-server'),
        join(__dirname, '..', 'apps', 'agents-server'),
    ];

    for (const candidate of candidates) {
        if (await isAgentsServerAppPath(candidate)) {
            return candidate;
        }
    }

    throw new NotAllowed(
        spaceTrim(`
            Cannot find the bundled Agents Server app.

            Checked:
            ${candidates.map((candidate) => `- \`${candidate}\``).join('\n')}
        `),
    );
}

/**
 * Adds dependency-resolution environment required by the materialized Agents Server runtime.
 *
 * @private internal utility of `ptbk agents-server`
 */
export function createAgentsServerRuntimeEnvironment(
    environment: NodeJS.ProcessEnv,
    nodeModulesPath: string,
    options: {
        readonly isNextValidationIgnored?: boolean;
    } = {},
): NodeJS.ProcessEnv {
    return {
        ...environment,
        NODE_PATH: mergeNodePath(nodeModulesPath, environment.NODE_PATH),
        [PTBK_AGENTS_SERVER_NODE_MODULES_PATH_ENV]: nodeModulesPath,
        ...(options.isNextValidationIgnored
            ? {
                  [PTBK_AGENTS_SERVER_IGNORE_NEXT_VALIDATION_ENV]: 'true',
              }
            : {}),
    };
}

/**
 * Uses the source checkout app directly, but copies npm-packaged app sources out of `node_modules`.
 *
 * @private internal utility of `ptbk agents-server`
 */
export async function resolveAgentsServerBuildAppPath(options: {
    readonly nodeModulesPath: string;
    readonly sourceAppPath: string;
}): Promise<string> {
    if (!isPathInsideNodeModules(options.sourceAppPath)) {
        return options.sourceAppPath;
    }

    const sourceRuntimeRootPath = resolve(options.sourceAppPath, '..', '..');
    const materializedRuntimeRootPath = resolvePromptbookTemporaryPath(process.cwd(), 'agents-server', 'runtime');

    await synchronizeMaterializedAgentsServerRuntime({
        materializedRuntimeRootPath,
        nodeModulesPath: options.nodeModulesPath,
        sourceAppPath: options.sourceAppPath,
        sourceRuntimeRootPath,
    });

    return join(materializedRuntimeRootPath, 'apps', 'agents-server');
}

/**
 * Copies the bundled runtime into the launch project when the original app lives under `node_modules`.
 */
async function synchronizeMaterializedAgentsServerRuntime(options: {
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

        for (const relativeInputPath of AGENTS_SERVER_BUILD_INPUT_RELATIVE_PATHS) {
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
 * Excludes build artifacts, dependency folders, private env files, and test sources.
 */
function shouldCopyAgentsServerRuntimePath(sourcePath: string, sourceRootPath: string): boolean {
    const sourceRelativePath = relative(sourceRootPath, sourcePath).replace(/\\/gu, '/');
    const sourcePathSegments = sourceRelativePath.split('/').filter(Boolean);
    const sourceBasename = basename(sourcePath);

    if (
        sourcePathSegments.some((sourcePathSegment) =>
            AGENTS_SERVER_BUILD_INPUT_EXCLUDED_DIRECTORY_NAMES.has(sourcePathSegment),
        )
    ) {
        return false;
    }

    if (sourceBasename.startsWith('.env')) {
        return false;
    }

    return !AGENTS_SERVER_BUILD_INPUT_TEST_FILE_PATTERN.test(sourceBasename);
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

/**
 * Runs the finite Next production build used by local Agents Server commands.
 */
async function runNextBuild(options: {
    readonly appPath: string;
    readonly environment: NodeJS.ProcessEnv;
    readonly nextCliPath: string;
    readonly onBuildOutput?: (chunk: string) => void;
}): Promise<void> {
    await new Promise<void>((resolveBuild, rejectBuild) => {
        const buildProcess = spawn(process.execPath, [options.nextCliPath, 'build'], {
            cwd: options.appPath,
            env: options.environment,
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        buildProcess.stdout?.on('data', (chunk) => {
            forwardBuildOutput(chunk.toString(), options.onBuildOutput);
        });
        buildProcess.stderr?.on('data', (chunk) => {
            forwardBuildOutput(chunk.toString(), options.onBuildOutput);
        });

        buildProcess.once('error', rejectBuild);
        buildProcess.once('exit', (code) => {
            if (code === 0) {
                resolveBuild();
                return;
            }

            rejectBuild(new Error(`next-build exited with code ${String(code)}.`));
        });
    });
}

/**
 * Sends one Next build output chunk through the caller handler or to the foreground terminal.
 */
function forwardBuildOutput(chunk: string, onBuildOutput: ((chunk: string) => void) | undefined): void {
    if (onBuildOutput) {
        onBuildOutput(chunk);
        return;
    }

    process.stdout.write(chunk);
}

/**
 * Reads and validates cached build metadata.
 */
async function readAgentsServerBuildCache(
    options: AgentsServerBuildCacheOptions,
): Promise<AgentsServerBuildCache | undefined> {
    try {
        const serializedBuildCache = await readFile(
            join(resolveAgentsServerBuildOutputPath(options), AGENTS_SERVER_BUILD_CACHE_FILENAME),
            'utf-8',
        );
        const buildCache = JSON.parse(serializedBuildCache) as Partial<AgentsServerBuildCache>;

        if (
            buildCache.version !== AGENTS_SERVER_BUILD_CACHE_VERSION ||
            typeof buildCache.sourceFingerprint !== 'string'
        ) {
            return undefined;
        }

        return buildCache as AgentsServerBuildCache;
    } catch {
        return undefined;
    }
}

/**
 * Fingerprints all runtime source paths that can affect the local Agents Server build.
 */
async function createAgentsServerBuildSourceFingerprint(appPath: string): Promise<string> {
    const runtimeRootPath = resolve(appPath, '..', '..');
    const fingerprint = createHash('sha256');

    for (const relativeInputPath of AGENTS_SERVER_BUILD_INPUT_RELATIVE_PATHS) {
        await addAgentsServerBuildInputToFingerprint(fingerprint, {
            inputPath: join(runtimeRootPath, relativeInputPath),
            runtimeRootPath,
        });
    }

    return fingerprint.digest('hex');
}

/**
 * Adds one runtime source file or directory subtree to the production build fingerprint.
 */
async function addAgentsServerBuildInputToFingerprint(
    fingerprint: Hash,
    options: {
        readonly inputPath: string;
        readonly runtimeRootPath: string;
    },
): Promise<void> {
    let inputStats;

    try {
        inputStats = await stat(options.inputPath);
    } catch {
        fingerprint.update(`missing:${normalizeBuildInputPath(options.runtimeRootPath, options.inputPath)}\n`);
        return;
    }

    if (inputStats.isFile()) {
        if (isExcludedAgentsServerBuildInputFile(options.inputPath)) {
            return;
        }

        fingerprint.update(`file:${normalizeBuildInputPath(options.runtimeRootPath, options.inputPath)}\n`);
        fingerprint.update(await readFile(options.inputPath));
        fingerprint.update('\n');
        return;
    }

    if (!inputStats.isDirectory()) {
        return;
    }

    fingerprint.update(`directory:${normalizeBuildInputPath(options.runtimeRootPath, options.inputPath)}\n`);
    const inputDirents = await readdir(options.inputPath, { withFileTypes: true });
    const sortedInputDirents = [...inputDirents].sort((left, right) => left.name.localeCompare(right.name));

    for (const inputDirent of sortedInputDirents) {
        if (inputDirent.isDirectory() && AGENTS_SERVER_BUILD_INPUT_EXCLUDED_DIRECTORY_NAMES.has(inputDirent.name)) {
            continue;
        }

        await addAgentsServerBuildInputToFingerprint(fingerprint, {
            inputPath: join(options.inputPath, inputDirent.name),
            runtimeRootPath: options.runtimeRootPath,
        });
    }
}

/**
 * Returns true for non-build test files inside shared runtime source paths.
 */
function isExcludedAgentsServerBuildInputFile(inputPath: string): boolean {
    return AGENTS_SERVER_BUILD_INPUT_TEST_FILE_PATTERN.test(basename(inputPath));
}

/**
 * Normalizes one absolute runtime path so cache fingerprints are stable across platforms.
 */
function normalizeBuildInputPath(runtimeRootPath: string, inputPath: string): string {
    return relative(runtimeRootPath, inputPath).replace(/\\/gu, '/');
}

/**
 * Resolves the Next output directory used by a particular build environment.
 */
function resolveAgentsServerBuildOutputPath(options: AgentsServerBuildCacheOptions): string {
    return resolve(
        options.appPath,
        options.environment?.NEXT_DIST_DIR || DEFAULT_AGENTS_SERVER_NEXT_DIST_DIRECTORY_NAME,
    );
}

/**
 * Returns true when the app path points at the project-local materialized runtime.
 */
function isAgentsServerAppPathMaterialized(appPath: string): boolean {
    const normalizedAppPath = appPath.replace(/\\/gu, '/');
    const normalizedMaterializedRuntimePath = resolvePromptbookTemporaryPath(
        process.cwd(),
        'agents-server',
        'runtime',
    ).replace(/\\/gu, '/');

    return normalizedAppPath.includes(normalizedMaterializedRuntimePath);
}

/**
 * Returns true when one path is nested below a `node_modules` segment.
 */
function isPathInsideNodeModules(path: string): boolean {
    return path.split(/[\\/]+/u).includes(NODE_MODULES_DIRECTORY_NAME);
}

/**
 * Resolves the dependency root that contains the installed Next CLI.
 */
function resolveNodeModulesPath(nextCliPath: string): string {
    const normalizedNextCliPath = nextCliPath.replace(/\\/gu, '/');
    const marker = `/${NODE_MODULES_DIRECTORY_NAME}/next/`;
    const markerIndex = normalizedNextCliPath.lastIndexOf(marker);

    if (markerIndex === -1) {
        return resolve(nextCliPath, '..', '..', '..');
    }

    return normalizedNextCliPath.slice(0, markerIndex + marker.length - '/next/'.length);
}

/**
 * Prepends one dependency root to `NODE_PATH` while preserving any existing value.
 */
function mergeNodePath(nodeModulesPath: string, nodePath: string | undefined): string {
    if (!nodePath) {
        return nodeModulesPath;
    }

    return `${nodeModulesPath}${delimiter}${nodePath}`;
}

/**
 * Returns true when one path exists as a regular file.
 */
async function isFile(path: string): Promise<boolean> {
    try {
        return (await stat(path)).isFile();
    } catch {
        return false;
    }
}

/**
 * Returns true when one folder contains the Next Agents Server app marker files.
 */
async function isAgentsServerAppPath(candidate: string): Promise<boolean> {
    try {
        const [packageStats, nextConfigStats] = await Promise.all([
            stat(join(candidate, 'package.json')),
            stat(join(candidate, 'next.config.ts')),
        ]);

        return packageStats.isFile() && nextConfigStats.isFile();
    } catch {
        return false;
    }
}

/**
 * Resolves the Next CLI module installed alongside the Promptbook CLI.
 */
function resolveNextCliPath(): string {
    try {
        return require.resolve('next/dist/bin/next');
    } catch {
        throw new NotAllowed(
            spaceTrim(`
                Cannot start Agents Server because the \`next\` package is unavailable.

                Reinstall \`ptbk\` so the CLI package contains the Agents Server runtime dependencies.
            `),
        );
    }
}

// Note: [🟡] Code for CLI runtime [buildAgentsServer](src/cli/cli-commands/agents-server/buildAgentsServer.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
