import { spaceTrim } from 'spacetrim';
import { EnvironmentMismatchError } from '../../../src/errors/EnvironmentMismatchError';
import type { CoderIsolationWorktree } from './CoderIsolationWorktree';

/**
 * Git output fragment reported when one path does not fit into the Windows `MAX_PATH` limit.
 */
const GIT_FILENAME_TOO_LONG_PATTERN = 'filename too long';

/**
 * Git output line prefixes which carry the actual reason of a failed worktree checkout.
 *
 * Everything else is the `Updating files: <percentage>` progress noise of checking out thousands of files.
 */
const GIT_FAILURE_LINE_PREFIXES = Object.freeze(['error:', 'fatal:', 'warning:']);

/**
 * Builds the branded error describing why one isolated worktree could not be checked out.
 *
 * A failed checkout leaves nothing behind that could be inspected, so the raw git output is condensed
 * down to the lines which name the actual reason and is paired with hints resolving it.
 */
export function buildCoderIsolationCheckoutFailureError(
    worktree: CoderIsolationWorktree,
    failureDetails: string,
): EnvironmentMismatchError {
    const gitFailureOutput = extractGitFailureOutput(failureDetails);

    return new EnvironmentMismatchError(
        spaceTrim(
            (block) => `
                Flag \`--isolate\` could not check out the isolated worktree of \`${worktree.taskName}\`.

                Worktree:
                \`${worktree.worktreeDisplayPath}\`

                Branch:
                \`${worktree.branchName}\`

                Git output:
                \`\`\`
                ${block(gitFailureOutput || '(No git output)')}
                \`\`\`

                Actionable hints:
                ${block(buildCheckoutFailureHints(worktree, gitFailureOutput))}
            `,
        ),
    );
}

/**
 * Builds the markdown list of hints which resolve one failed worktree checkout.
 */
function buildCheckoutFailureHints(worktree: CoderIsolationWorktree, gitFailureOutput: string): string {
    const hints: Array<string> = [];

    if (gitFailureOutput.toLowerCase().includes(GIT_FILENAME_TOO_LONG_PATTERN)) {
        hints.push(
            'Some repository paths do not fit into the **Windows `MAX_PATH` limit** once they are nested inside the isolated worktree.',
            'Move the project closer to the drive root (for example `C:\\promptbook`) so that the isolated worktree paths stay shorter.',
            'Enable long paths for every Git installation of this machine with `git config --system core.longpaths true`.',
        );
    }

    hints.push(
        `Run \`git worktree add -b "${worktree.branchName}" "${worktree.worktreeDisplayPath}" HEAD\` manually to inspect the full git output.`,
        'Rerun `ptbk coder run` without `--isolate` to keep processing the queue in the project working tree.',
    );

    return hints.map((hint) => `- ${hint}`).join('\n');
}

/**
 * Keeps only the git output lines which explain the failure.
 */
function extractGitFailureOutput(failureDetails: string): string {
    const failureLines = failureDetails
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter((line) => GIT_FAILURE_LINE_PREFIXES.some((prefix) => line.toLowerCase().startsWith(prefix)));

    if (failureLines.length === 0) {
        return failureDetails.trim();
    }

    return [...new Set(failureLines)].join('\n');
}
