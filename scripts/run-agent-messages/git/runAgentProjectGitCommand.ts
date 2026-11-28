import { execFile } from 'child_process';
import { buildAgentGitEnv } from '../../run-codex-prompts/git/agentGitIdentity';

/**
 * Largest git output kept in memory, so an enormous diff can never exhaust the runner process.
 */
const AGENT_PROJECT_GIT_OUTPUT_MAX_BYTES = 8 * 1024 * 1024;

/**
 * Time after which one git command of a project repository is given up on.
 */
const AGENT_PROJECT_GIT_TIMEOUT_MS = 60 * 1000;

/**
 * Author and committer used for project commits when no coding-agent identity is configured.
 *
 * A project repository is created by the runner on a server which usually has no git identity at
 * all, so committing must never depend on the machine configuration.
 */
const AGENT_PROJECT_GIT_FALLBACK_IDENTITY = {
    GIT_AUTHOR_NAME: 'Promptbook Agent',
    GIT_AUTHOR_EMAIL: 'agent@promptbook.studio',
    GIT_COMMITTER_NAME: 'Promptbook Agent',
    GIT_COMMITTER_EMAIL: 'agent@promptbook.studio',
} as const;

/**
 * Result of one git command executed inside one agent project.
 */
export type AgentProjectGitCommandResult = {
    /**
     * Whether git reported success.
     */
    readonly isSuccessful: boolean;

    /**
     * Standard output of the command, with the trailing newline removed.
     */
    readonly output: string;
};

/**
 * Runs one git command inside one agent project directory.
 *
 * Commands are executed without a shell and with an explicit argument list, so a project name or
 * a file path can never be interpreted as a shell fragment. A failing command is reported through
 * `isSuccessful` instead of throwing, because git uses the exit code to answer questions such as
 * "is there anything staged" and because auto-committing a project must never fail an answer the
 * agent already produced.
 *
 * @param options - Project directory and the git arguments to run there.
 * @returns Outcome of the command.
 */
export async function runAgentProjectGitCommand(options: {
    readonly projectPath: string;
    readonly args: ReadonlyArray<string>;
}): Promise<AgentProjectGitCommandResult> {
    return await new Promise<AgentProjectGitCommandResult>((resolve) => {
        execFile(
            'git',
            [...options.args],
            {
                cwd: options.projectPath,
                env: { ...process.env, ...AGENT_PROJECT_GIT_FALLBACK_IDENTITY, ...(buildAgentGitEnv() || {}) },
                maxBuffer: AGENT_PROJECT_GIT_OUTPUT_MAX_BYTES,
                timeout: AGENT_PROJECT_GIT_TIMEOUT_MS,
                windowsHide: true,
            },
            (error, stdout) => {
                resolve({
                    isSuccessful: !error,
                    output: stripTrailingNewline(stdout || ''),
                });
            },
        );
    });
}

/**
 * Removes the single trailing newline git appends to its output.
 *
 * @param output - Raw command output.
 * @returns Output without its trailing newline.
 *
 * @private helper of `runAgentProjectGitCommand`
 */
function stripTrailingNewline(output: string): string {
    return output.replace(/\r?\n$/u, '');
}
