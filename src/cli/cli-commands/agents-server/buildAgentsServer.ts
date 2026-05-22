import { spawn } from 'child_process';
import { createHash, type Hash } from 'crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'fs/promises';
import { basename, join, relative, resolve } from 'path';
import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../../errors/NotAllowed';

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
    const appPath = options.appPath ?? (await resolveAgentsServerAppPath());
    const environment = options.environment ?? process.env;
    const nextCliPath = resolveNextCliPath();

    if (
        !options.isBuildForced &&
        (await isAgentsServerBuildCacheCurrent({
            appPath,
            environment,
        }))
    ) {
        options.onBuildEvent?.('Using the cached Agents Server Next app build.');
        return { appPath, nextCliPath };
    }

    options.onBuildEvent?.('Building the Agents Server Next app.');
    await runNextBuild({
        appPath,
        environment,
        nextCliPath,
        onBuildOutput: options.onBuildOutput,
    });
    await writeAgentsServerBuildCache({ appPath, environment });

    return { appPath, nextCliPath };
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
