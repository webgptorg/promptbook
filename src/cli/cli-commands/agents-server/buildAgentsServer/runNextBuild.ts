import { spawn } from 'child_process';
import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../../../errors/NotAllowed';

/**
 * Node.js heap size limit (in MiB) injected into `NODE_OPTIONS` for the Next.js production build.
 *
 * Next.js webpack peaks at ~1.9 GiB on a fresh install; the Node.js default cap is ~1.7 GiB,
 * which causes an OOM crash on first-run VPS installations where swap is the primary resource.
 * Raising the limit lets the build complete on the first attempt.
 */
const AGENTS_SERVER_BUILD_MAX_OLD_SPACE_MIB = 4096;

/**
 * Maximum attempts for a Next.js build that was killed by the operating system.
 */
const AGENTS_SERVER_BUILD_MAX_ATTEMPTS = 2;

/**
 * Signals that indicate the Next.js build may have been terminated by resource pressure.
 */
const RETRYABLE_NEXT_BUILD_SIGNALS = new Set<NodeJS.Signals | null>(['SIGKILL', null]);

/**
 * Exit status reported by one spawned Next.js build child process.
 */
type NextBuildExitStatus = {
    readonly code: number | null;
    readonly signal: NodeJS.Signals | null;
};

/**
 * Runs the finite Next production build used by local Agents Server commands.
 *
 * @private internal utility of `buildAgentsServer`
 */
export async function runNextBuild(options: {
    readonly appPath: string;
    readonly environment: NodeJS.ProcessEnv;
    readonly nextCliPath: string;
    readonly onBuildOutput?: (chunk: string) => void;
}): Promise<void> {
    for (let attempt = 1; attempt <= AGENTS_SERVER_BUILD_MAX_ATTEMPTS; attempt++) {
        const exitStatus = await runNextBuildAttempt(options);

        if (exitStatus.code === 0) {
            return;
        }

        if (attempt < AGENTS_SERVER_BUILD_MAX_ATTEMPTS && isNextBuildTerminationRetryable(exitStatus)) {
            forwardBuildOutput(createNextBuildRetryMessage(exitStatus, attempt + 1), options.onBuildOutput);
            continue;
        }

        throw createNextBuildExitError(exitStatus, attempt);
    }
}

/**
 * Runs one Next.js production build attempt and returns its exit status.
 */
async function runNextBuildAttempt(options: {
    readonly appPath: string;
    readonly environment: NodeJS.ProcessEnv;
    readonly nextCliPath: string;
    readonly onBuildOutput?: (chunk: string) => void;
}): Promise<NextBuildExitStatus> {
    return await new Promise<NextBuildExitStatus>((resolveBuild, rejectBuild) => {
        const buildProcess = spawn(process.execPath, [options.nextCliPath, 'build'], {
            cwd: options.appPath,
            env: createNextBuildProcessEnvironment(options.environment),
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        buildProcess.stdout?.on('data', (chunk) => {
            forwardBuildOutput(chunk.toString(), options.onBuildOutput);
        });
        buildProcess.stderr?.on('data', (chunk) => {
            forwardBuildOutput(chunk.toString(), options.onBuildOutput);
        });

        buildProcess.once('error', (error) => {
            rejectBuild(createNextBuildSpawnError(error));
        });
        buildProcess.once('close', (code, signal) => {
            resolveBuild({ code, signal });
        });
    });
}

/**
 * Creates the environment passed to the spawned Next.js build process.
 */
function createNextBuildProcessEnvironment(environment: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
    return {
        ...environment,
        NODE_OPTIONS: mergeNodeOptionsWithHeapSize(environment.NODE_OPTIONS, AGENTS_SERVER_BUILD_MAX_OLD_SPACE_MIB),
    };
}

/**
 * Returns true when one failed build attempt is worth retrying.
 */
function isNextBuildTerminationRetryable(exitStatus: NextBuildExitStatus): boolean {
    return exitStatus.code === null && RETRYABLE_NEXT_BUILD_SIGNALS.has(exitStatus.signal);
}

/**
 * Creates one visible retry message for a killed Next.js build attempt.
 */
function createNextBuildRetryMessage(exitStatus: NextBuildExitStatus, nextAttempt: number): string {
    return `\nAgents Server Next build was terminated by ${describeNextBuildExitStatus(
        exitStatus,
    )}. Retrying attempt ${nextAttempt}/${AGENTS_SERVER_BUILD_MAX_ATTEMPTS}.\n`;
}

/**
 * Creates a branded error for a failed Next.js build child process.
 */
function createNextBuildExitError(exitStatus: NextBuildExitStatus, attemptCount: number): NotAllowed {
    const lowMemoryHint = isNextBuildTerminationRetryable(exitStatus)
        ? '\n\nThe build process was terminated by the operating system. On standalone VPS self-updates this usually means the host ran out of memory while Next.js was compiling or prerendering the app.'
        : '';

    return new NotAllowed(
        spaceTrim(`
            Agents Server Next production build failed.

            - Exit code: \`${String(exitStatus.code)}\`
            - Signal: \`${String(exitStatus.signal)}\`
            - Attempts: \`${String(attemptCount)}\`
            ${lowMemoryHint}
        `),
    );
}

/**
 * Creates a branded error for failures to start the Next.js build child process.
 */
function createNextBuildSpawnError(error: Error): NotAllowed {
    return new NotAllowed(
        spaceTrim(`
            Cannot start the Agents Server Next production build.

            ${error.message}
        `),
    );
}

/**
 * Formats one Next.js build exit status for foreground logs.
 */
function describeNextBuildExitStatus(exitStatus: NextBuildExitStatus): string {
    if (exitStatus.signal) {
        return `signal \`${exitStatus.signal}\``;
    }

    return `exit code \`${String(exitStatus.code)}\``;
}

/**
 * Prepends `--max-old-space-size=<mib>` to `NODE_OPTIONS` unless the caller already set one.
 */
function mergeNodeOptionsWithHeapSize(existingNodeOptions: string | undefined, maxOldSpaceMib: number): string {
    if (existingNodeOptions !== undefined && /--max-old-space-size[= ]/u.test(existingNodeOptions)) {
        return existingNodeOptions;
    }

    const heapFlag = `--max-old-space-size=${maxOldSpaceMib}`;

    return existingNodeOptions ? `${heapFlag} ${existingNodeOptions}` : heapFlag;
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
