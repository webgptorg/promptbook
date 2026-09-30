import { execFile } from 'child_process';
import { lstat, stat } from 'fs/promises';
import { dirname, join, parse, resolve } from 'path';
import { promisify } from 'util';
import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../../errors/NotAllowed';
import { $askForConfirmation } from './$askForConfirmation';
import type { NormalizedQuestionsCliOptions } from './questionsCliOptions';

/**
 * One resolved project and its enclosing Git working tree. A preview can have no Git root.
 * @private shared CLI workspace context for Coder and the subsequent server entrypoint
 */
export type WorkspaceRepositoryContext = {
    readonly projectPath: string;
    readonly gitRootPath?: string;
    readonly repositoryStatus: 'existing' | 'initialized' | 'missing';
};

/**
 * Repository policy for one CLI action.
 * @private shared CLI workspace policy
 */
export type WorkspaceRepositoryPolicy = 'initialize' | 'mutate' | 'preview';

/**
 * Options for workspace repository detection and command policy.
 */
type WorkspaceRepositoryOptions = {
    readonly projectPath?: string;
    readonly policy: WorkspaceRepositoryPolicy;
    readonly questionsOptions?: NormalizedQuestionsCliOptions;
    /** Test seam for simulating an unavailable Git executable without changing the developer's PATH. */
    readonly gitExecutable?: string;
    /** Test seam for Git process failures that cannot be reproduced portably with filesystem permissions. */
    readonly runGitFile?: GitCommandRunner;
};

/**
 * Small Git process interface used by both detection and initialization.
 */
type GitCommandRunner = (
    executable: string,
    arguments_: ReadonlyArray<string>,
    options: { readonly cwd: string; readonly windowsHide: true },
) => Promise<{ stdout: string; stderr: string }>;

/**
 * Promisified, argument-safe Git execution. Git's exit status and stderr remain available for classification.
 */
const EXECUTE_GIT_FILE = promisify(execFile);

/**
 * Resolves the requested project once, detects its enclosing working tree, and applies the action's policy.
 * Only explicit initialization or an affirmative terminal answer may create Git metadata.
 *
 * @private shared CLI preflight for Coder and the subsequent server entrypoint
 */
export async function $preflightWorkspaceRepository({
    projectPath = process.cwd(),
    policy,
    questionsOptions = { isAskingQuestionsEnabled: true },
    gitExecutable = 'git',
    runGitFile = EXECUTE_GIT_FILE,
}: WorkspaceRepositoryOptions): Promise<WorkspaceRepositoryContext> {
    const resolvedProjectPath = resolve(projectPath);
    await assertProjectDirectory(resolvedProjectPath);
    const existingGitRootPath = await detectGitWorkingTreeRoot(resolvedProjectPath, gitExecutable, runGitFile);

    if (existingGitRootPath !== undefined) {
        return { projectPath: resolvedProjectPath, gitRootPath: existingGitRootPath, repositoryStatus: 'existing' };
    }

    if (policy === 'preview') {
        console.warn(
            `Warning: \`${resolvedProjectPath}\` is outside a Git repository. This preview will not initialize Git. Run \`ptbk init\`, \`ptbk coder init\`, or \`git init\` before changing this project.`,
        );
        return { projectPath: resolvedProjectPath, repositoryStatus: 'missing' };
    }

    if (policy === 'mutate') {
        if (!questionsOptions.isAskingQuestionsEnabled || !process.stdin.isTTY) {
            throw missingRepositoryError(resolvedProjectPath, 'No interactive Git initialization answer is available.');
        }

        const isInitializationApproved = await $askForConfirmation(
            `No Git repository contains \`${resolvedProjectPath}\`. Initialize Git in this directory?`,
            questionsOptions,
        );
        if (!isInitializationApproved) {
            throw missingRepositoryError(resolvedProjectPath, 'Git initialization was declined or cancelled.');
        }
    }

    try {
        await runGitFile(gitExecutable, ['init'], { cwd: resolvedProjectPath, windowsHide: true });
    } catch (error) {
        throw new NotAllowed(
            spaceTrim(`
                Failed to initialize Git in \`${resolvedProjectPath}\`.

                ${gitErrorDetails(error)}

                Git setup may be incomplete. Fix the error and run \`ptbk init\` or \`git init\` there before retrying.
            `),
        );
    }

    const initializedGitRootPath = await detectGitWorkingTreeRoot(resolvedProjectPath, gitExecutable, runGitFile);
    if (initializedGitRootPath === undefined) {
        throw new NotAllowed(
            `Git initialization returned without a usable working tree in \`${resolvedProjectPath}\`. Inspect its Git metadata and retry \`ptbk init\`.`,
        );
    }
    console.info(`Git repository initialized in ${initializedGitRootPath}`);
    return { projectPath: resolvedProjectPath, gitRootPath: initializedGitRootPath, repositoryStatus: 'initialized' };
}

/**
 * Ensures Git is run only from a real project directory.
 */
async function assertProjectDirectory(projectPath: string): Promise<void> {
    try {
        if ((await stat(projectPath)).isDirectory()) return;
    } catch (error) {
        throw new NotAllowed(`Cannot access project directory \`${projectPath}\`: ${gitErrorDetails(error)}`);
    }
    throw new NotAllowed(`Project path \`${projectPath}\` is not a directory.`);
}

/**
 * Uses Git itself to discover an enclosing working tree, including unborn branches and .git files.
 */
async function detectGitWorkingTreeRoot(
    projectPath: string,
    gitExecutable: string,
    runGitFile: GitCommandRunner,
): Promise<string | undefined> {
    try {
        const { stdout } = await runGitFile(gitExecutable, ['rev-parse', '--is-inside-work-tree'], {
            cwd: projectPath,
            windowsHide: true,
        });
        if (stdout.trim() !== 'true') {
            throw new NotAllowed(
                `\`${projectPath}\` is inside a bare Git repository, which has no working tree. Use a project checkout.`,
            );
        }
        const root = await runGitFile(gitExecutable, ['rev-parse', '--show-toplevel'], {
            cwd: projectPath,
            windowsHide: true,
        });
        return resolve(projectPath, root.stdout.trim());
    } catch (error) {
        if (error instanceof NotAllowed) throw error;
        if (isMissingExecutable(error)) {
            throw new NotAllowed('Git executable was not found. Install Git and ensure `git` is on PATH, then retry.');
        }

        const details = gitErrorDetails(error);
        const normalizedDetails = details.toLowerCase();
        if (normalizedDetails.includes('dubious ownership') || normalizedDetails.includes('unsafe repository')) {
            throw new NotAllowed(
                `Git refused repository ownership for \`${projectPath}\`. Verify the checkout owner and permissions before retrying. Git output: ${details}`,
            );
        }
        if (normalizedDetails.includes('permission denied') || normalizedDetails.includes('access is denied')) {
            throw new NotAllowed(`Cannot access Git metadata for \`${projectPath}\`: ${details}`);
        }
        if (normalizedDetails.includes('not a git repository') && !(await hasGitMarkerInAncestors(projectPath))) {
            return undefined;
        }
        throw new NotAllowed(`Git metadata for \`${projectPath}\` is invalid or inaccessible: ${details}`);
    }
}

/**
 * A failed Git lookup is a missing repository only when no .git marker exists in the ancestry.
 */
async function hasGitMarkerInAncestors(projectPath: string): Promise<boolean> {
    let directoryPath = projectPath;
    while (directoryPath.length > 0) {
        try {
            await lstat(join(directoryPath, '.git'));
            return true;
        } catch (error) {
            if (!isMissingFile(error)) {
                throw new NotAllowed(`Cannot inspect Git metadata in \`${directoryPath}\`: ${gitErrorDetails(error)}`);
            }
        }
        if (directoryPath === parse(directoryPath).root) return false;
        directoryPath = dirname(directoryPath);
    }
    return false;
}

/**
 * Formats the required-repository failure with a recovery command.
 */
function missingRepositoryError(projectPath: string, reason: string): NotAllowed {
    return new NotAllowed(
        spaceTrim(`
            Git repository required for \`${projectPath}\`.

            ${reason}

            Run \`ptbk init\`, \`ptbk coder init\`, or \`git init\` in that directory, then retry.
        `),
    );
}

/**
 * Recognizes a missing Git binary from Node's process error.
 */
function isMissingExecutable(error: unknown): boolean {
    return error !== null && typeof error === 'object' && 'code' in error && error.code === 'ENOENT';
}

/**
 * Recognizes a missing .git marker while walking parent directories.
 */
function isMissingFile(error: unknown): boolean {
    return error !== null && typeof error === 'object' && 'code' in error && error.code === 'ENOENT';
}

/**
 * Extracts actionable output from Git or filesystem failures.
 */
function gitErrorDetails(error: unknown): string {
    if (error instanceof Error) {
        const stderr = 'stderr' in error && typeof error.stderr === 'string' ? error.stderr.trim() : '';
        return stderr || error.message;
    }
    return String(error);
}

// Note: [🟡] Code for CLI workspace Git preflight should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and exported helper names
