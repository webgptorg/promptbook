import { spawn } from 'child_process';
import { lstat, realpath } from 'fs/promises';
import { dirname, join } from 'path';
import { spaceTrim } from 'spacetrim';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import { NotAllowed } from '../../../errors/NotAllowed';
import { loadPromptsModule } from '../../common/loadPromptsModule';
import type { NormalizedQuestionsCliOptions } from './questionsCliOptions';
import { resolveProjectDirectory } from './projectCliOptions';

/**
 * Resolved project directory and its enclosing working tree. Project artifacts belong to `projectPath`;
 * Git paths and synchronization belong to `repositoryRoot`, which may be an enclosing monorepo.
 *
 * @private shared workspace context for Coder and workspace server commands
 */
export type WorkspaceRepositoryContext = {
    readonly projectPath: string;
    readonly repositoryRoot?: string;
    readonly gitDirectory?: string;
    readonly repositoryStatus: 'missing' | 'reused' | 'initialized';
};

/**
 * Command policy is separate from discovery: previews never initialize; explicit init needs no confirmation.
 *
 * @private shared workspace policy for Coder and workspace server commands
 */
export type WorkspaceRepositoryPolicy = 'initialize' | 'mutate' | 'read-only';

/**
 * Resolves the requested project once and discovers Git using Git itself, without requiring `HEAD`.
 * Broken metadata, bare repositories, ownership errors and unavailable Git are failures, not missing repositories.
 *
 * @private shared workspace discovery for CLI commands
 */
export async function $resolveWorkspaceRepository(
    projectDirectory = process.cwd(),
): Promise<WorkspaceRepositoryContext> {
    const projectPath = await resolveProjectDirectory(projectDirectory);
    return $inspectWorkspaceRepository(projectPath);
}

/**
 * Checks the shared prerequisite before any project writes, Git synchronization, installation or startup.
 * Only an affirmative interactive answer or an explicit initializer authorizes `git init`.
 *
 * @private shared workspace preflight for Coder and workspace server commands
 */
export async function $preflightWorkspaceRepository(
    options: {
        readonly projectDirectory?: string;
        readonly policy: WorkspaceRepositoryPolicy;
    } & Partial<NormalizedQuestionsCliOptions>,
): Promise<WorkspaceRepositoryContext> {
    const workspace = await $resolveWorkspaceRepository(options.projectDirectory);
    if (workspace.repositoryStatus !== 'missing') {
        if (options.policy === 'initialize') {
            console.info(
                `Reusing Git repository \`${workspace.repositoryRoot}\` for project \`${workspace.projectPath}\`.`,
            );
        }
        return workspace;
    }

    const recovery = spaceTrim(`
        Run \`ptbk init\`, \`ptbk coder init\`, or \`git init\` in \`${workspace.projectPath}\`, then retry.
    `);
    const diagnostic = spaceTrim(`
        No Git working tree contains project \`${workspace.projectPath}\`.

        ${recovery}
    `);
    if (options.policy === 'read-only') {
        console.warn(`Warning: ${diagnostic}`);
        return workspace;
    }
    if (options.policy === 'mutate') {
        if (
            options.isAskingQuestionsEnabled === false ||
            !process.stdin.isTTY ||
            process.stdin.destroyed ||
            process.stdin.readableEnded
        ) {
            throw new NotAllowed(
                spaceTrim(
                    `${diagnostic}\n\nRepository initialization requires an interactive answer; \`--no-questions\` is not consent.`,
                ),
            );
        }
        console.info(`Target project directory: \`${workspace.projectPath}\`.`);
        const { default: prompts } = await loadPromptsModule();
        let answer: { readonly isInitializingRepository?: boolean };
        try {
            answer = await prompts({
                type: 'confirm',
                name: 'isInitializingRepository',
                message: `Initialize a Git repository in ${workspace.projectPath}?`,
                initial: false,
            });
        } catch (error) {
            throw new NotAllowed(
                spaceTrim(`
                Git initialization confirmation failed. The command stopped before project setup.
                ${recovery}

                ${describeWorkspaceError(error)}
            `),
            );
        }
        if (answer.isInitializingRepository !== true) {
            throw new NotAllowed(
                spaceTrim(
                    `Git initialization was declined or cancelled. The command stopped before project setup.\n\n${recovery}`,
                ),
            );
        }
    }

    // A parent repository may have appeared while the user answered. Recheck before creating metadata.
    const recheckedWorkspace = await $inspectWorkspaceRepository(workspace.projectPath);
    if (recheckedWorkspace.repositoryStatus !== 'missing') return recheckedWorkspace;
    try {
        await $runWorkspaceGit(workspace.projectPath, ['init']);
        const initializedWorkspace = await $inspectWorkspaceRepository(workspace.projectPath);
        if (!initializedWorkspace.repositoryRoot) {
            throw new EnvironmentMismatchError('Git did not create a valid working tree.');
        }
        console.info(`Git repository initialized in \`${initializedWorkspace.repositoryRoot}\`.`);
        return { ...initializedWorkspace, repositoryStatus: 'initialized' };
    } catch (error) {
        throw new EnvironmentMismatchError(
            spaceTrim(`
            Git initialization failed in \`${workspace.projectPath}\`.
            Project scaffolding, harness installation and command execution have not started.
            Git may have left partial metadata; inspect it and fix directory permissions before retrying.

            ${describeWorkspaceError(error)}
        `),
        );
    }
}

/** Discovers and validates a working tree at an already resolved project directory. */
async function $inspectWorkspaceRepository(projectPath: string): Promise<WorkspaceRepositoryContext> {
    let flags: string;
    try {
        flags = await $runWorkspaceGit(projectPath, ['rev-parse', '--is-bare-repository', '--is-inside-work-tree']);
    } catch (error) {
        const details = describeWorkspaceError(error);
        if (/fatal: not a git repository \(or any (?:of the )?parent/iu.test(details)) {
            // Git can ignore a damaged `.git` directory and report no repository. Such metadata must be repaired,
            // never replaced by init. This check supplements Git discovery; it is not the repository detector.
            await $assertNoBrokenRepositoryMetadata(projectPath);
            return { projectPath, repositoryStatus: 'missing' };
        }
        throw workspaceDiscoveryError(projectPath, error);
    }
    const [isBareRepository, isInsideWorkingTree] = flags.trim().split(/\r?\n/u);
    if (isBareRepository === 'true' || isInsideWorkingTree !== 'true') {
        throw new EnvironmentMismatchError(
            spaceTrim(`
            Project \`${projectPath}\` is in a bare repository or outside its Git working tree.
            Use a working-tree checkout of the project. No repository was initialized.
        `),
        );
    }
    try {
        // Normalize Git's path spelling to match the resolved project (including Windows separators
        // and filesystem aliases) before comparing ancestor directories.
        const repositoryRoot = await realpath(
            (await $runWorkspaceGit(projectPath, ['rev-parse', '--show-toplevel'])).trim(),
        );
        // Git may skip damaged inner metadata and find a valid parent. Do not silently use that parent
        // for a project whose own checkout needs repair.
        await $assertNoBrokenRepositoryMetadata(projectPath, repositoryRoot);
        const gitDirectory = await realpath(
            (await $runWorkspaceGit(projectPath, ['rev-parse', '--absolute-git-dir'])).trim(),
        );
        // Also validate the index and metadata, without refreshing the index or depending on an existing commit.
        await $runWorkspaceGit(projectPath, ['status', '--porcelain', '--untracked-files=no']);
        return { projectPath, repositoryRoot, gitDirectory, repositoryStatus: 'reused' };
    } catch (error) {
        throw workspaceDiscoveryError(projectPath, error);
    }
}

/** Checks ancestors only to disambiguate genuinely absent metadata from broken or inaccessible metadata. */
async function $assertNoBrokenRepositoryMetadata(projectPath: string, repositoryRoot?: string): Promise<void> {
    let directory = projectPath;
    while (directory !== repositoryRoot) {
        const metadataPath = join(directory, '.git');
        try {
            await lstat(metadataPath);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw workspaceDiscoveryError(projectPath, error);
            const parentDirectory = dirname(directory);
            if (parentDirectory === directory) return;
            directory = parentDirectory;
            continue;
        }
        throw new EnvironmentMismatchError(
            spaceTrim(`
            Git could not read repository metadata at \`${metadataPath}\` for project \`${projectPath}\`.
            Repair the invalid or inaccessible metadata before retrying. No repository was initialized.
        `),
        );
    }
}

/**
 * Executes Git without a shell, optional index locks, or credential prompts, retaining raw output boundaries.
 * Drains both output streams without execFile's fixed buffer limit so large repository listings remain complete.
 * @private shared Git discovery and commit-scope inspection
 */
export async function $runWorkspaceGit(
    projectPath: string,
    argumentsList: ReadonlyArray<string>,
    options?: {
        readonly env?: Record<string, string>;
        readonly signal?: AbortSignal;
        readonly input?: string | Buffer;
    },
): Promise<string> {
    return new Promise((resolve, reject) => {
        const child = spawn('git', [...argumentsList], {
            cwd: projectPath,
            env: { ...process.env, LC_ALL: 'C', GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0', ...options?.env },
            windowsHide: true,
            signal: options?.signal,
        });
        const stdoutChunks: string[] = [];
        const stderrChunks: string[] = [];
        let processError: Error | undefined;
        let inputError: Error | undefined;
        // Stream decoding preserves multibyte filenames even when a character spans two output chunks.
        child.stdout.setEncoding('utf8');
        child.stderr.setEncoding('utf8');
        child.stdout.on('data', (chunk: string) => stdoutChunks.push(chunk));
        child.stderr.on('data', (chunk: string) => stderrChunks.push(chunk));
        child.on('error', (error) => {
            processError = error;
        });
        child.stdin.on('error', (error) => {
            // A failed Git command may close stdin early. Keep its exit status and stderr as the primary error.
            inputError = error;
        });
        child.on('close', (code, signal) => {
            const stdout = stdoutChunks.join('');
            const stderr = stderrChunks.join('');
            if (processError) {
                reject(Object.assign(processError, { stdout, stderr }));
            } else if (code !== 0 || signal) {
                reject(
                    Object.assign(new Error(`Command failed: git ${argumentsList.join(' ')}\n${stderr}`), {
                        code,
                        signal,
                        killed: child.killed,
                        stdout,
                        stderr,
                    }),
                );
            } else if (inputError) {
                reject(Object.assign(inputError, { stdout, stderr }));
            } else {
                resolve(stdout);
            }
        });
        // Index-info uses NUL-delimited input. Closing stdin also lets commands finish when input is empty.
        child.stdin.end(options?.input);
    });
}

/** Translates discovery failures without ever treating an ownership or executable error as permission to init. */
function workspaceDiscoveryError(projectPath: string, error: unknown): EnvironmentMismatchError {
    const details = describeWorkspaceError(error);
    const isGitUnavailable = (error as NodeJS.ErrnoException)?.code === 'ENOENT';
    const hint = isGitUnavailable
        ? 'Git is not available on `PATH`. Install Git or fix `PATH`, then retry.'
        : /dubious ownership|safe.directory/iu.test(details)
        ? 'Git rejected repository ownership. Review the ownership and trust of this specific checkout before retrying.'
        : 'Check repository metadata, permissions and Git configuration before retrying.';
    return new EnvironmentMismatchError(
        spaceTrim(`
        Cannot inspect Git for project \`${projectPath}\`.
        ${hint}
        No repository was initialized and project setup has not started.

        ${details}
    `),
    );
}

/** Extracts useful Git stderr or filesystem diagnostics from a process failure. */
function describeWorkspaceError(error: unknown): string {
    const failure = error as { stderr?: string; message?: string };
    return failure?.stderr?.trim() || failure?.message || String(error);
}

// Note: [🟡] Code for workspace Git preflight [workspaceRepository](src/cli/cli-commands/common/workspaceRepository.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and exported helper names
