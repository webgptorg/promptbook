import colors from 'colors';
import { stat, unlink } from 'fs/promises';
import { resolve } from 'path';
import { spaceTrim } from 'spacetrim';
import { forTime } from 'waitasecond';
import { ConflictError } from '../../../src/errors/ConflictError';
import { $execCommand } from '../../../src/utils/execCommand/$execCommand';
import { ProgressiveBackoff } from '../common/ProgressiveBackoff';
import { coderRunWarn } from '../ui/CoderRunSessionContext';

/**
 * Delays used before retrying a Git command blocked by `index.lock`.
 */
const GIT_INDEX_LOCK_RETRY_DELAYS_MS = Object.freeze([250, 500, 1000, 2000, 4000]);

/**
 * Age threshold after which `.git/index.lock` is considered stale.
 */
const GIT_INDEX_LOCK_STALE_AFTER_MS = 2 * 60 * 1000;

/**
 * Git command used to resolve the repository-specific `index.lock` path.
 */
const GIT_INDEX_LOCK_PATH_COMMAND = 'git rev-parse --git-path index.lock';

/**
 * Output fragment that always appears in Git index lock failures.
 */
const GIT_INDEX_LOCK_PATH_PATTERN = 'index.lock';

/**
 * Output fragments that commonly accompany Git index lock failures.
 */
const GIT_INDEX_LOCK_REASON_PATTERNS = Object.freeze(['file exists', 'another git process']);

/**
 * Minimal command options used by `runGitCommand`.
 */
type RunGitCommandOptions = {
    readonly command: string;
    readonly cwd?: string;
    readonly env?: Record<string, string>;
    readonly isVerbose?: boolean;
};

/**
 * Current state of the repository `index.lock` file when present.
 */
type GitIndexLockState = {
    readonly path: string;
    readonly ageMs: number;
    readonly isStale: boolean;
};

/**
 * Runs one Git command and retries when the repository index is still temporarily locked.
 */
export async function runGitCommand(options: RunGitCommandOptions): Promise<string> {
    const cwd = options.cwd ?? process.cwd();
    const retryBackoff = new ProgressiveBackoff({
        delaysMs: GIT_INDEX_LOCK_RETRY_DELAYS_MS,
        jitterRatio: 0,
    });
    let lastIndexLockState: GitIndexLockState | undefined;
    let isStaleIndexLockRemoved = false;

    while (true) {
        try {
            return await $execCommand({
                command: options.command,
                cwd,
                env: options.env,
                isVerbose: options.isVerbose,
            });
        } catch (error) {
            const errorMessage = stringifyUnknownError(error);

            if (!isGitIndexLockError(errorMessage)) {
                throw error;
            }

            lastIndexLockState = await readGitIndexLockState(cwd, options.env);

            if (lastIndexLockState?.isStale && !isStaleIndexLockRemoved) {
                await unlink(lastIndexLockState.path).catch((unlinkError) => {
                    if (isFileNotFoundError(unlinkError)) {
                        return;
                    }

                    throw unlinkError;
                });
                isStaleIndexLockRemoved = true;
                coderRunWarn(colors.yellow(`Removed stale Git index lock: ${lastIndexLockState.path}`));
                continue;
            }

            if (retryBackoff.retryCount >= GIT_INDEX_LOCK_RETRY_DELAYS_MS.length) {
                throw buildGitIndexLockConflictError({
                    command: options.command,
                    errorMessage,
                    indexLockState: lastIndexLockState,
                });
            }

            const delayMs = retryBackoff.nextDelayMs();
            coderRunWarn(
                colors.yellow(
                    `Git index is busy, retrying \`${options.command}\` in ${formatDelay(delayMs)} (attempt #${retryBackoff.retryCount}).`,
                ),
            );
            await forTime(delayMs);
        }
    }
}

/**
 * Resolves the repository-specific path to `index.lock`.
 */
async function resolveGitIndexLockPath(cwd: string, env?: Record<string, string>): Promise<string | undefined> {
    try {
        const output = await $execCommand({
            command: GIT_INDEX_LOCK_PATH_COMMAND,
            cwd,
            env,
            isVerbose: false,
        });

        const relativeOrAbsolutePath = output.trim();
        if (!relativeOrAbsolutePath) {
            return undefined;
        }

        return resolve(cwd, relativeOrAbsolutePath);
    } catch {
        return undefined;
    }
}

/**
 * Reads the current `index.lock` file state when the lock file still exists.
 */
async function readGitIndexLockState(cwd: string, env?: Record<string, string>): Promise<GitIndexLockState | undefined> {
    const indexLockPath = await resolveGitIndexLockPath(cwd, env);
    if (!indexLockPath) {
        return undefined;
    }

    try {
        const indexLockStats = await stat(indexLockPath);
        const ageMs = Math.max(0, Date.now() - indexLockStats.mtimeMs);

        return {
            path: indexLockPath,
            ageMs,
            isStale: ageMs >= GIT_INDEX_LOCK_STALE_AFTER_MS,
        };
    } catch (error) {
        if (isFileNotFoundError(error)) {
            return undefined;
        }

        throw error;
    }
}

/**
 * Detects whether a Git failure was caused by an existing `index.lock` file.
 */
function isGitIndexLockError(message: string): boolean {
    const normalizedMessage = message.toLowerCase();
    return (
        normalizedMessage.includes(GIT_INDEX_LOCK_PATH_PATTERN) &&
        GIT_INDEX_LOCK_REASON_PATTERNS.some((pattern) => normalizedMessage.includes(pattern))
    );
}

/**
 * Builds a detailed branded error for unresolved Git index lock conflicts.
 */
function buildGitIndexLockConflictError(options: {
    readonly command: string;
    readonly errorMessage: string;
    readonly indexLockState?: GitIndexLockState;
}): ConflictError {
    const lockPath = options.indexLockState?.path ?? '.git/index.lock';
    const lockAgeLabel =
        options.indexLockState === undefined
            ? 'unknown'
            : `${Math.round(options.indexLockState.ageMs / 1000)} second(s)`;

    return new ConflictError(
        spaceTrim(`
            Git command could not obtain the repository index lock.

            Command:
            \`${options.command}\`

            Lock file:
            \`${lockPath}\`

            Lock age:
            ${lockAgeLabel}

            Git output:
            \`\`\`
            ${options.errorMessage.trim()}
            \`\`\`

            Actionable hints:
            - Wait for the other Git process to finish, then rerun \`ptbk coder run\`.
            - If no Git process is active, remove \`${lockPath}\` manually and rerun the command.
        `),
    );
}

/**
 * Formats one retry delay for console output.
 */
function formatDelay(delayMs: number): string {
    if (delayMs < 1000) {
        return `${delayMs}ms`;
    }

    return `${(delayMs / 1000).toFixed(delayMs % 1000 === 0 ? 0 : 1)}s`;
}

/**
 * Detects missing-file errors while inspecting the lock file.
 */
function isFileNotFoundError(error: unknown): boolean {
    return Boolean(
        error &&
            typeof error === 'object' &&
            'code' in error &&
            (((error as { code?: string }).code === 'ENOENT') || (error as { code?: string }).code === 'ENOTDIR'),
    );
}

/**
 * Converts unknown thrown values into readable text.
 */
function stringifyUnknownError(error: unknown): string {
    if (error instanceof Error) {
        return error.stack || error.message;
    }

    if (typeof error === 'string') {
        return error;
    }

    return JSON.stringify(error, null, 2);
}
