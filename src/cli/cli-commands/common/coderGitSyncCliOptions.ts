import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { spaceTrim } from 'spacetrim';
import type { CoderGitSyncOptions } from '../../../../scripts/run-codex-prompts/git/coderGitSync';
import { NotAllowed } from '../../../errors/NotAllowed';

export type { CoderGitSyncOptions };

/**
 * Commander option bag for the shared `ptbk coder` git synchronization flags.
 *
 * @private internal utility of `promptbookCli`
 */
export type CoderGitSyncCliOptions = {
    readonly commit: boolean;
    readonly autoPush: boolean;
    readonly autoPull: boolean;
};

/**
 * Description block shared by the `ptbk coder` commands which can synchronize their changes with git.
 *
 * @private internal utility of `promptbookCli`
 */
export const CODER_GIT_SYNC_DESCRIPTION = spaceTrim(`
    Git synchronization:
    - --auto-pull pulls the latest changes before this command changes anything
    - --commit commits only the files this command has changed, unrelated changes stay in the working tree
    - --auto-push pushes the created commit to the remote repository
`);

/**
 * Registers the shared `--commit`, `--auto-push` and `--auto-pull` flags on a `ptbk coder` command.
 *
 * Note: Unlike `ptbk coder run`, which commits by default and opts out through `--no-commit`,
 *       these commands never touch git unless the flags are used explicitly.
 *
 * @private internal utility of `promptbookCli`
 */
export function addCoderGitSyncOptions(command: Program): void {
    command.option(
        '--commit',
        'Commit the files changed by this command with the coding-agent git identity, leaving unrelated changes uncommitted',
        false,
    );
    command.option('--auto-push', 'Automatically git push the created commit, requires --commit', false);
    command.option(
        '--auto-pull',
        'Automatically git pull the latest changes before this command changes anything',
        false,
    );
}

/**
 * Converts the Commander git synchronization flags into normalized git synchronization options.
 *
 * @private internal utility of `promptbookCli`
 */
export function normalizeCoderGitSyncCliOptions(cliOptions: CoderGitSyncCliOptions): CoderGitSyncOptions {
    if (cliOptions.autoPush && !cliOptions.commit) {
        throw new NotAllowed(
            spaceTrim(`
                Flag \`--auto-push\` can be used only together with \`--commit\`.

                **There is nothing to push when the changes are not committed.**

                Actionable hint:
                - Add \`--commit\`, for example \`ptbk coder init --commit --auto-push\`.
            `),
        );
    }

    return {
        isCommitEnabled: cliOptions.commit,
        isAutoPushEnabled: cliOptions.autoPush,
        isAutoPullEnabled: cliOptions.autoPull,
    };
}

// Note: [🟡] Code for CLI git synchronization options [coderGitSyncCliOptions](src/cli/cli-commands/common/coderGitSyncCliOptions.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and exported helper names
