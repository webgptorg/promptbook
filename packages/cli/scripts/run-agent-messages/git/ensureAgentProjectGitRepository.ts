import { stat, writeFile } from 'fs/promises';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { runAgentProjectGitCommand } from './runAgentProjectGitCommand';

/**
 * Branch created for a project repository, so every agent project starts with the same history.
 */
const AGENT_PROJECT_GIT_INITIAL_BRANCH = 'main';

/**
 * Paths kept out of a project repository created by the runner.
 *
 * Only a project which brings no ignore rules of its own receives these, and they cover exactly
 * the two things that must never enter an automatic commit: installed dependencies and secrets.
 */
const AGENT_PROJECT_GIT_DEFAULT_IGNORE_PATHS = spaceTrim(`
    node_modules/
    .env
    .env.*
`);

/**
 * How one agent project directory relates to git.
 *
 * -   `own-repository` is a project whose own history the runner can commit into.
 * -   `tracked-elsewhere` is a project belonging to a repository around the agent folder, whose
 *     history is already kept by whoever owns that repository.
 * -   `unavailable` is a project which cannot be committed, for example because git is missing.
 */
export type AgentProjectGitRepositoryState = 'own-repository' | 'tracked-elsewhere' | 'unavailable';

/**
 * Makes sure one agent project is a git repository of its own.
 *
 * A project which is already tracked by a repository around the agent folder is deliberately left
 * alone: initializing a repository inside it would turn it into an embedded repository and break
 * the history that already covers it.
 *
 * @param projectPath - Absolute path of the project directory.
 * @returns How the project relates to git after this call.
 */
export async function ensureAgentProjectGitRepository(projectPath: string): Promise<AgentProjectGitRepositoryState> {
    if (await isExistingDirectory(join(projectPath, '.git'))) {
        return 'own-repository';
    }

    if (await isProjectTrackedByOuterRepository(projectPath)) {
        return 'tracked-elsewhere';
    }

    if (!(await initializeAgentProjectGitRepository(projectPath))) {
        return 'unavailable';
    }

    await writeDefaultAgentProjectGitignoreIfMissing(projectPath);

    return 'own-repository';
}

/**
 * Creates the repository of one project, naming its first branch when git supports it.
 *
 * @param projectPath - Absolute path of the project directory.
 * @returns `true` when the project is a repository afterwards.
 *
 * @private helper of `ensureAgentProjectGitRepository`
 */
async function initializeAgentProjectGitRepository(projectPath: string): Promise<boolean> {
    const initResult = await runAgentProjectGitCommand({
        projectPath,
        args: ['init', `--initial-branch=${AGENT_PROJECT_GIT_INITIAL_BRANCH}`],
    });

    if (initResult.isSuccessful) {
        return true;
    }

    // Note: `--initial-branch` needs git 2.28, so an older git still gets its repository
    return (await runAgentProjectGitCommand({ projectPath, args: ['init'] })).isSuccessful;
}

/**
 * Checks whether a repository around the agent folder already tracks the project files.
 *
 * @param projectPath - Absolute path of the project directory.
 * @returns `true` when an outer repository tracks at least one file of the project.
 *
 * @private helper of `ensureAgentProjectGitRepository`
 */
async function isProjectTrackedByOuterRepository(projectPath: string): Promise<boolean> {
    const trackedFilesResult = await runAgentProjectGitCommand({
        projectPath,
        args: ['ls-files', '--', '.'],
    });

    return trackedFilesResult.isSuccessful && trackedFilesResult.output.trim().length > 0;
}

/**
 * Writes the default ignore rules into a freshly initialized project repository.
 *
 * A project which already brings its own rules keeps them untouched.
 *
 * @param projectPath - Absolute path of the project directory.
 *
 * @private helper of `ensureAgentProjectGitRepository`
 */
async function writeDefaultAgentProjectGitignoreIfMissing(projectPath: string): Promise<void> {
    const gitignorePath = join(projectPath, '.gitignore');

    try {
        await stat(gitignorePath);
        return;
    } catch {
        // Note: A project without ignore rules would commit its installed dependencies
    }

    await writeFile(gitignorePath, `${AGENT_PROJECT_GIT_DEFAULT_IGNORE_PATHS}\n`, 'utf-8');
}

/**
 * Checks whether one path is an existing directory.
 *
 * @param directoryPath - Absolute path to check.
 * @returns `true` when the path exists and is a directory.
 *
 * @private helper of `ensureAgentProjectGitRepository`
 */
async function isExistingDirectory(directoryPath: string): Promise<boolean> {
    try {
        return (await stat(directoryPath)).isDirectory();
    } catch {
        return false;
    }
}
