import { spaceTrim } from 'spacetrim';
import { AGENT_QUEUED_MESSAGES_DIRECTORY_PATH } from '../../../src/cli/cli-commands/agent/agentProjectPaths';
import { NotAllowed } from '../../../src/errors/NotAllowed';
import { $execCommand } from '../../../src/utils/execCommand/$execCommand';

/**
 * Git commands used to list dirty tracked files and untracked files.
 */
const GIT_CHANGED_FILE_COMMANDS: ReadonlyArray<string> = [
    'git diff --name-only --',
    'git diff --name-only --cached --',
    'git ls-files --others --exclude-standard',
];

/**
 * Ensures no unrelated working tree changes exist while allowing queued user messages.
 */
export async function ensureWorkingTreeCleanForAgentQueue(projectPath: string): Promise<void> {
    const changedFiles = await listWorkingTreeChangedFiles(projectPath);
    const unrelatedChangedFiles = changedFiles.filter((relativePath) => !isQueuedAgentMessagePath(relativePath));

    if (unrelatedChangedFiles.length === 0) {
        return;
    }

    throw new NotAllowed(
        spaceTrim(`
            Git working tree has changes outside of \`${normalizeGitPath(AGENT_QUEUED_MESSAGES_DIRECTORY_PATH)}/\`.

            Please commit or stash unrelated changes before running \`ptbk agent\`
            OR run with \`--ignore-git-changes\`.

            Unrelated changed files:
            ${unrelatedChangedFiles.map((relativePath) => `- \`${relativePath}\``).join('\n')}
        `),
    );
}

/**
 * Lists changed tracked files and untracked files in the working tree.
 */
async function listWorkingTreeChangedFiles(projectPath: string): Promise<ReadonlyArray<string>> {
    const changedFiles = new Set<string>();

    for (const command of GIT_CHANGED_FILE_COMMANDS) {
        const output = await $execCommand({
            command,
            cwd: projectPath,
            isVerbose: false,
        });

        for (const filePath of output.split('\n').map(normalizeGitPath).filter(Boolean)) {
            changedFiles.add(filePath);
        }
    }

    return [...changedFiles.values()];
}

/**
 * Checks whether one relative Git path points into the queued-message directory.
 */
function isQueuedAgentMessagePath(relativePath: string): boolean {
    const queuedMessagesPath = `${normalizeGitPath(AGENT_QUEUED_MESSAGES_DIRECTORY_PATH)}/`;
    return relativePath.startsWith(queuedMessagesPath);
}

/**
 * Normalizes Git output paths for matching and display.
 */
function normalizeGitPath(filePath: string): string {
    return filePath.trim().replace(/\\/gu, '/');
}
